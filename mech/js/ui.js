// Ironwalkers — menus: Broker Games splash, cinematic title, hangar, garage, shop, crates, battle pass, settings, results.
(function () {
'use strict';
const MW = window.MW;
const $ = id => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = () => MW.profile;
const tierCol = t => MW.TIERS[t].color;
const tierBadge = t => `<span class="tb" style="--c:${tierCol(t)}">${MW.TIERS[t].roman} · ${MW.TIERS[t].name}</span>`;
const cr = n => `<span class="cr">◈ ${MW.fmt(n)}</span>`;

// ------------------------------------------------------------ weapon / build stats helpers
function wDPS(item) { const wt = MW.WTYPE[item.wtype]; const s = MW.weaponStats(wt, item.tier, item.mod); let d = s.dmg * s.rate * (wt.count || 1) * (wt.burst || 1); if (wt.fire === 'stream') d = s.dmg; return { dps: d, heat: wt.fire === 'stream' ? s.heat : s.heat * s.rate * (wt.fire === 'auto' || wt.fire === 'spin' ? 1 : 1), range: s.range, s, wt }; }
function buildStats(build) {
  const st = MW.battle.derive(build); let dps = 0, hps = 0, rng = 0, n = 0;
  build.weapons.forEach(w => { if (!w.item) return; const d = wDPS(w.item); dps += d.dps; hps += d.heat; rng += d.range * st.range; n++; });
  return { armor: Math.round(st.hp.core + st.hp.armL + st.hp.armR + st.hp.legs), speed: Math.round(st.speed * 3.6), dps: Math.round(dps), heatEff: Math.round(st.diss / Math.max(0.1, hps) * 100), cap: Math.round(st.heatCap), range: Math.round(n ? rng / n : 0), jump: st.jumpFuel.toFixed(1), shield: st.shield, radar: st.radar };
}
function itemSub(it) {
  switch (it.cat) {
    case 'weapon': { const d = wDPS(it); return `${it.size} · ${MW.WTYPE[it.wtype].name} · ${Math.round(d.dps)} DPS · ${Math.round(d.range)}m`; }
    case 'equip': return `${MW.EQSLOT[it.slot].name} · ${it.desc || ''}`;
    case 'class': { const c = MW.CLASS[it.cls]; return `${c.weight} ${c.role} · ${c.tons}t · ${c.hardpoints.length} hardpoints`; }
    case 'skin': return `${it.pattern[0].toUpperCase() + it.pattern.slice(1)} pattern`;
    default: return MW.CAT_NAMES[it.cat] || '';
  }
}
function itemStats(it) {
  const rows = [];
  if (it.cat === 'weapon') { const d = wDPS(it); const s = d.s; const wt = d.wt; rows.push(['Damage', (s.dmg).toFixed(1) + (wt.count ? ' × ' + wt.count : wt.burst ? ' × ' + wt.burst : '') + (wt.fire === 'stream' ? ' /s' : '')], ['Fire rate', wt.fire === 'stream' ? 'continuous' : s.rate.toFixed(2) + ' /s'], ['DPS', Math.round(d.dps)], ['Heat', s.heat.toFixed(2) + (wt.fire === 'stream' ? ' /s' : ' / shot')], ['Range', Math.round(s.range) + ' m'], ['Size', it.size + (it.size === 'S' ? ' (fits any)' : it.size === 'M' ? ' (M or L hardpoints)' : ' (L hardpoints)')], ['Manufacturer', (MW.MFRS.find(m => m.id === it.mfr) || { name: 'Prototype', tag: 'Battle-pass exclusive' }).name + ' — ' + (MW.MFRS.find(m => m.id === it.mfr) || { tag: 'Battle-pass exclusive' }).tag]); rows.push(['Type', wt.desc]); }
  if (it.cat === 'equip') { const e = MW.equipEffect(it); Object.entries(e).forEach(([k, v]) => { if (!v || v === 1) return; const name = { hp: 'Armour', speed: 'Speed', cap: 'Heat capacity', diss: 'Cooling', turn: 'Turn rate', accel: 'Acceleration', legHp: 'Leg armour', hotSpeed: 'Speed when hot', fuel: 'Jump fuel (s)', thrust: 'Thrust', air: 'Air control', regen: 'Fuel recharge', spread: 'Spread', lock: 'Lock time', range: 'Weapon range', radar: 'Radar range', ams: 'Missile intercept', ecm: 'Lock delay', repair: 'Repair /s', shield: 'Shield points', ballisticRes: 'Ballistic resist', splashRes: 'Splash resist', energyRes: 'Energy resist' }[k] || k; let val = v; if (['hp', 'speed', 'cap', 'diss', 'turn', 'accel', 'legHp', 'thrust', 'regen', 'range', 'radar'].includes(k)) val = (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%'; else if (['spread', 'lock'].includes(k)) val = Math.round((v - 1) * 100) + '%'; else if (['ballisticRes', 'splashRes', 'energyRes', 'hotSpeed', 'ams', 'ecm'].includes(k)) val = Math.round(v * 100) + '%'; else val = typeof v === 'number' ? (Math.round(v * 10) / 10) : v; rows.push([name, val]); }); }
  if (it.cat === 'class') { const c = MW.CLASS[it.cls]; rows.push(['Weight', c.tons + ' t ' + c.weight], ['Role', c.role], ['Top speed', Math.round(c.speed * 3.6) + ' km/h'], ['Core armour', c.hp.core], ['Hardpoints', c.hardpoints.map(x => x.size).join(' · ')], ['Torso twist', c.twist + '°'], ['Jump jets', c.jump ? c.jump + ' s' : 'none'], ['Ability', c.ability.name + ' — ' + c.ability.desc]); }
  if (it.exclusive) rows.push(['Source', `Battle pass week ${it.week} exclusive — never sold in the shop`]);
  return rows;
}

// ------------------------------------------------------------ hangar 3D scene
const HG = MW.hangar = {
  init() {
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color(0x0b0d10); s.fog = new THREE.Fog(0x0b0d10, 40, 110);
    const fcv = MW.tex.canvas(1024, 1024), c = fcv.getContext('2d');
    c.fillStyle = '#2a2c30'; c.fillRect(0, 0, 1024, 1024); const r = MW.rng('hangarfloor');
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},0.025)`; c.fillRect(r() * 1024, r() * 1024, 2 + r() * 6, 2 + r() * 6); }
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 3; for (let i = 0; i <= 1024; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 1024); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(1024, i); c.stroke(); }
    c.strokeStyle = '#f2c200'; c.lineWidth = 10; c.beginPath(); c.arc(512, 512, 300, 0, 7); c.stroke(); c.setLineDash([40, 30]); c.beginPath(); c.arc(512, 512, 340, 0, 7); c.stroke(); c.setLineDash([]);
    for (const x of [140, 884]) { c.fillStyle = '#f2c200'; c.fillRect(x - 8, 0, 16, 1024); }
    c.fillStyle = 'rgba(30,20,10,0.35)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.ellipse(r() * 1024, r() * 1024, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); c.fill(); }
    const ft = MW.tex.toTex(fcv); ft.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.4, bumpMap: MW.tex.panelBump(), bumpScale: 0.03 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.6, roughness: 0.5 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xc89a12, metalness: 0.4, roughness: 0.55, envMapIntensity: 0.4 });
    const strip = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xbfd8ff, emissiveIntensity: 2 });
    const G = MW.mechs.geo;
    // back wall with panels and light strips
    for (let i = -5; i <= 5; i++) { const p = new THREE.Mesh(G.bbox(5.6, 22, 1, 0.2), metal); p.position.set(i * 6, 11, -22); s.add(p); const l = new THREE.Mesh(G.box(0.3, 18, 0.2), strip); l.position.set(i * 6 + 2.9, 11, -21.4); s.add(l); }
    const door = new THREE.Mesh(G.box(20, 1, 0.5), new THREE.MeshStandardMaterial({ map: (() => { const cv = MW.tex.canvas(256, 16), cc = cv.getContext('2d'); cc.fillStyle = '#f2c200'; cc.fillRect(0, 0, 256, 16); cc.fillStyle = '#111'; for (let i = -16; i < 280; i += 20) { cc.beginPath(); cc.moveTo(i, 0); cc.lineTo(i + 10, 0); cc.lineTo(i - 6, 16); cc.lineTo(i - 16, 16); cc.fill(); } return MW.tex.toTex(cv); })() })); door.position.set(0, 21, -21.3); s.add(door);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: MW.tex.label('BROKER GAMES · BAY 07', '#ffb52e', null, 1024, 256, 'bold 96px Orbitron, Rajdhani, Arial, sans-serif'), transparent: true, toneMapped: false })); logo.position.set(0, 18, -21.3); s.add(logo);
    // side gantries
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) { const col = new THREE.Mesh(G.box(0.6, 20, 0.6), yellow); col.position.set(sx * 17, 10, -18 + k * 6); col.castShadow = true; s.add(col); }
      for (const y of [6, 13]) { const deck = new THREE.Mesh(G.box(3.5, 0.4, 24), dark); deck.position.set(sx * 18.2, y, -12); deck.scale.z = 0.6; deck.castShadow = true; deck.receiveShadow = true; s.add(deck); const rail = new THREE.Mesh(G.box(0.1, 1, 24), yellow); rail.position.set(sx * 16.5, y + 0.7, -12); rail.scale.z = 0.6; s.add(rail); }
      const arm = new THREE.Mesh(G.box(6, 0.6, 0.6), yellow); arm.position.set(sx * 13.5, 9, -10); s.add(arm); const tool = new THREE.Mesh(G.cyl(0.25, 0.4, 1.4, 8), dark); tool.position.set(sx * 10.7, 8.4, -10); s.add(tool);
      // crates and barrels
      for (let k = 0; k < 3; k++) { const cb = new THREE.Mesh(G.bbox(2, 2, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.8 })); cb.position.set(sx * (15 + (k % 2) * 2.2), 1 + Math.floor(k / 2) * 2, 6 + k); cb.castShadow = true; cb.receiveShadow = true; s.add(cb); const br = new THREE.Mesh(G.cyl(0.6, 0.6, 1.8, 12), new THREE.MeshStandardMaterial({ color: k ? 0x8a2a1a : 0x2a4a8a, metalness: 0.4, roughness: 0.5 })); br.position.set(sx * 8.5, 0.9, 9 + k * 1.4); br.castShadow = true; s.add(br); }
    }
    // turntable
    const tt = this.turntable = new THREE.Group(); s.add(tt);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.6, 48), dark); plat.position.y = 0.3; plat.receiveShadow = true; plat.castShadow = true; tt.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.05, 0.07, 6, 64), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb52e, emissiveIntensity: 2.5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.62; tt.add(ring); this.ringMat = ring.material;
    // lights
    s.add(new THREE.HemisphereLight(0xbfd0ff, 0x1a1410, 0.25));
    const key = new THREE.SpotLight(0xfff0dc, 2.2, 90, 0.45, 0.6, 1.2); key.position.set(12, 30, 18); key.target.position.set(0, 5, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; s.add(key); s.add(key.target);
    const rim = new THREE.SpotLight(0x8ab8ff, 2.6, 80, 0.6, 0.6, 1.2); rim.position.set(-14, 18, -16); rim.target.position.set(0, 6, 0); s.add(rim); s.add(rim.target);
    const fill = new THREE.PointLight(0xffa860, 0.8, 40, 2); fill.position.set(-8, 4, 10); s.add(fill);
    this.beacons = [];
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(G.cyl(0.3, 0.3, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff6a00, emissiveIntensity: 2 })); b.position.set(sx * 17, 20.4, -18); s.add(b); const l = new THREE.SpotLight(0xff6a00, 0, 30, 0.35, 0.5); l.position.copy(b.position); s.add(l); s.add(l.target); this.beacons.push({ b, l }); }
    // dust motes
    const n = 400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (r() - 0.5) * 40; p[i * 3 + 1] = r() * 22; p[i * 3 + 2] = (r() - 0.5) * 30; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe8c8, size: 0.06, transparent: true, opacity: 0.5, map: MW.tex.sprite('soft'), depthWrite: false })); s.add(this.dust);
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: MW.tex.sprite('flare'), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); this.flare.position.set(0, 3, 0); s.add(this.flare);
    this.burst = new THREE.PointLight(0xffffff, 0, 40, 2); this.burst.position.set(0, 4, 0); s.add(this.burst);
    this.t = 0; this.yaw = -0.5; this.drag = false;
    const cv = $('gl');
    cv.addEventListener('pointerdown', e => { if (MW.ui.inBattle || MW.ui.screen === 'title') return; this.drag = true; this.lx = e.clientX; });
    addEventListener('pointerup', () => { this.drag = false; });
    addEventListener('pointermove', e => { if (this.drag) { this.yaw += (e.clientX - this.lx) * 0.008; this.lx = e.clientX; this.idleT = 0; } });
  },
  enter() {
    MW.fx.init(this.scene); MW.core.camera.near = 0.1; MW.core.camera.far = 400; MW.core.camera.fov = 38; MW.core.camera.updateProjectionMatrix();
    MW.core.setView({ scene: this.scene, camera: MW.core.camera, update: dt => this.update(dt) });
    this.frame(); MW.audio.music('menu');
  },
  frame() {
    const cam = MW.core.camera; const w = innerWidth, hh = innerHeight; const tab = MW.ui.tab;
    if (w <= 900 || this.crate) { cam.clearViewOffset(); return; }
    // centre the mech in the space the menus leave free
    let target = w / 2;
    if (tab === 'garage') target = (240 + (w - Math.min(440, w * 0.4))) / 2;
    else if (tab === 'play' || tab === 'boxes' || tab === 'settings') target = (Math.min(780, w) + w) / 2;
    cam.setViewOffset(w, hh, w / 2 - target, 0, w, hh);
  },
  setBuild(build, locked) {
    if (this.mech) { this.turntable.remove(this.mech.root); }
    this.mech = MW.mechs.build(build); this.mech.root.position.y = 0.6; this.turntable.add(this.mech.root); this.locked = locked;
    this.mech.root.traverse(o => { if (o.isMesh && locked) { o.material = o.material.clone(); o.material.color && o.material.color.multiplyScalar(0.25); } });
    const ht = build.cdef.height; this.camDist = 8 + ht * 2.1; this.camY = ht * 0.62; this.lookY = ht * 0.55;
    this.ringMat.emissive.set(tierCol(Math.max(0, P().buildTier(build.cls) || 0)));
  },
  update(dt) {
    this.t += dt; const cam = MW.core.camera;
    if (!this.drag) { this.idleT = (this.idleT || 0) + dt; if (this.idleT > 4) this.yaw += dt * 0.12; }
    this.turntable.rotation.y += (this.yaw - this.turntable.rotation.y) * Math.min(1, dt * 6);
    const d = this.camDist || 30; cam.position.set(Math.sin(0.12) * d, (this.camY || 6) + Math.sin(this.t * 0.2) * 0.3, Math.cos(0.12) * d); cam.lookAt(0, this.lookY || 5, 0);
    if (this.mech && !this.crate) { MW.mechs.animate(this.mech, dt, { speed: 0, maxSpeed: 1, twist: Math.sin(this.t * 0.35) * 0.35, pitch: Math.sin(this.t * 0.27) * 0.08, t: this.t, heat: 0.15 + Math.sin(this.t) * 0.1 }); this.mech.hips.position.y += Math.sin(this.t * 1.6) * 0.04; }
    this.beacons.forEach((b, i) => { const on = MW.ui.boxAnim; b.l.intensity = on ? 3 : 0; b.b.material.emissiveIntensity = on ? 3 : 0.4; b.l.target.position.set(Math.sin(this.t * 4 + i * 3) * 10, 0, Math.cos(this.t * 4 + i * 3) * 10); });
    const dp = this.dust.geometry.attributes.position; for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.15; if (y > 22) y = 0; dp.setY(i, y); dp.setX(i, dp.getX(i) + Math.sin(this.t + i) * dt * 0.05); } dp.needsUpdate = true;
    if (this.crate) this.updateCrate(dt);
    this.flare.material.opacity = Math.max(0, this.flare.material.opacity - dt * 0.8); this.burst.intensity = Math.max(0, this.burst.intensity - dt * 20);
    MW.fx.update(dt, cam);
  },
  // ---- crate opening ----
  openCrate(tier, done) {
    if (this.crate) this.scene.remove(this.crate.g);
    const g = MW.thumbs.crate(tier); g.scale.setScalar(1.6); g.position.set(0, 30, 3); this.scene.add(g);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (this.mech) this.mech.root.visible = false;
    this.crate = { g, tier, t: 0, phase: 0, done, vy: 0 };
    MW.audio.play('drop', null, 0.4);
  },
  updateCrate(dt) {
    const C = this.crate; C.t += dt; const g = C.g; const col = tierCol(C.tier);
    if (C.phase === 0) { C.vy -= 60 * dt; g.position.y += C.vy * dt; if (g.position.y <= 0.6 + 1.36) { g.position.y = 0.6 + 1.36; C.phase = 1; C.t = 0; MW.audio.play('land', null, 0.8); MW.fx.dust(new THREE.Vector3(0, 0.7, 3), 3, '#8a8070'); } }
    else if (C.phase === 1) { const k = Math.floor(C.t / 0.55); g.rotation.z = Math.sin(C.t * 40) * 0.05 * (C.t % 0.55 < 0.25 ? 1 : 0); g.position.y = 1.96 + Math.abs(Math.sin(C.t * 40)) * 0.08 * (C.t % 0.55 < 0.25 ? 1 : 0); if (k !== C.lastK && k < 3) { C.lastK = k; MW.audio.play('boxshake', null, 0.8); g.userData.glow.emissiveIntensity = 2 + k * 2; } if (C.t > 1.8) { C.phase = 2; C.t = 0; MW.audio.play('boxopen'); if (C.tier >= 4) MW.audio.play('legendary'); this.flare.material.color.set(col); this.flare.material.opacity = 1; this.flare.scale.setScalar(30); this.flare.position.set(0, 4, 3); this.burst.color.set(col); this.burst.intensity = 30; for (let i = 0; i < 80; i++) MW.fx.p(true, 0, 3, 3, (Math.random() - 0.5) * 20, Math.random() * 18, (Math.random() - 0.5) * 20, 1.2, 0.4, 0.05, new THREE.Color(col), new THREE.Color('#ffffff'), 1, 12, 0.5); MW.fx.ring(new THREE.Vector3(0, 0.7, 3), 20, col, 0.8); } }
    else if (C.phase === 2) { const lid = g.userData.lid; lid.position.y += dt * 9; lid.rotation.x -= dt * 4; lid.position.z -= dt * 5; if (Math.random() < 0.5) MW.fx.p(true, (Math.random() - 0.5) * 3, 2.5, 3 + (Math.random() - 0.5) * 2, 0, 6 + Math.random() * 6, 0, 1, 0.8, 0.1, new THREE.Color(col), new THREE.Color('#ffffff'), 1, -2, 0.5); if (C.t > 0.9 && !C.fired) { C.fired = true; C.done && C.done(); } if (C.t > 5) this.clearCrate(); }
  },
  clearCrate() { if (!this.crate) return; this.scene.remove(this.crate.g); this.crate = null; if (this.mech) this.mech.root.visible = true; },
};

// ------------------------------------------------------------ UI controller
const UI = MW.ui = {
  screen: null, tab: 'play', inBattle: false, garageCls: null, shopCat: 'featured', shopTier: -1, hideOwned: false, sel: { mode: 'tdm', map: 'foundry' },
  boot() {
    P().load();
    MW.input.init(); MW.core.init(); MW.thumbs.init(); HG.init();
    this.garageCls = P().data.cur;
    MW.input.on((code, down) => this.key(code, down));
    addEventListener('pointerdown', () => { MW.audio.init(); MW.audio.setVolume(); if (this.screen === 'title' && !this.titleMusic) { this.titleMusic = true; MW.audio.music('menu'); } }, { capture: true });
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.openTab(b.dataset.tab); });
    $('toTitle').onclick = () => { MW.audio.play('uiback'); this.showTitle(); };
    document.querySelectorAll('#title [data-go]').forEach(b => b.onclick = () => { MW.audio.play('ui'); const g = b.dataset.go; if (g === 'quick') return this.quickMatch(); this.enterMenu(g); });
    $('pResume').onclick = () => { MW.input.lock(); };
    $('pQuit').onclick = () => this.quitBattle();
    $('pView').onclick = () => { MW.battle.setView(MW.battle.B.view === 3 ? 1 : 3); };
    $('resContinue').onclick = () => { MW.audio.play('ui'); $('results').classList.remove('on'); this.enterMenu('play'); };
    $('modalClose').onclick = () => this.closeModal();
    $('modal').onclick = e => { if (e.target.id === 'modal') this.closeModal(); };
    $('revealDone').onclick = () => { $('reveal').classList.remove('on'); HG.clearCrate(); this.boxAnim = false; this.refreshTop(); if (this.tab === 'boxes') this.renderBoxes(); if (this.tab === 'pass') this.renderPass(); };
    this.splash();
  },
  // ---- Broker Games splash, then the cinematic title ----
  splash() {
    this.show('splash');
    // start the cinematic battle behind the splash so the title opens mid-fight
    setTimeout(() => this.startCinematic(), 60);
    const end = () => { if (this.screen !== 'splash') return; this.showTitle(true); };
    setTimeout(end, 5200);
    $('splash').onclick = end;
  },
  startCinematic() {
    const maps = MW.MAPS.filter(m => m.team <= 10 && ['canyon', 'neon', 'colosseum', 'foundry', 'caldera', 'frostbite', 'harbor', 'rustyard', 'tycho', 'verdant'].includes(m.id));
    MW.battle.start({ cinematic: true, map: MW.pick(Math.random, maps), mode: MW.pick(Math.random, ['tdm', 'dom', 'siege']), tier: 2 + Math.floor(Math.random() * 4), teamSize: 7 });
  },
  showTitle(fromSplash) {
    MW.input.unlock(); this.inBattle = false;
    MW.core.camera.clearViewOffset();
    if (!MW.battle.B || !MW.battle.B.cinematic) { MW.battle.stop(); this.startCinematic(); }
    this.show('title');
    const c = MW.countBuilds();
    const exp = Math.floor(Math.log10(c.total)); const man = (c.total / Math.pow(10, exp)).toFixed(1);
    $('titleTotals').innerHTML = `${MW.CLASSES.length} mech classes · ${MW.MAPS.length} arenas · ${MW.MODES.length} game modes · ${MW.fmt(c.items)} items · ${man} × 10<sup>${exp}</sup> possible builds`;
    this.refreshTop();
    if (MW.audio.ready) MW.audio.music('menu');
  },
  show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); this.screen = id; },
  enterMenu(tab) {
    MW.battle.stop(); this.inBattle = false; MW.hud.stop();
    this.show('menu'); HG.enter(); this.openTab(tab || 'play'); this.refreshTop();
  },
  refreshTop() {
    const d = P().data; $('topCredits').textContent = MW.fmt(d.credits); $('titleCredits').textContent = MW.fmt(d.credits);
    $('topPass').textContent = 'PASS LV ' + P().passLevel(); $('titlePass').textContent = 'Battle pass level ' + P().passLevel() + ' · ' + P().pass.name;
    $('topPilot').textContent = d.settings.name + ' · ' + (MW.item(P().loadout().title) || { title: '' }).title;
  },
  openTab(tab) {
    this.tab = tab; document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p_' + tab));
    MW.thumbs.hidePreview();
    if (tab === 'play') this.renderPlay(); if (tab === 'garage') this.renderGarage(); if (tab === 'shop') this.renderShop(); if (tab === 'boxes') this.renderBoxes(); if (tab === 'pass') this.renderPass(); if (tab === 'settings') this.renderSettings();
    const cls = tab === 'garage' ? this.garageCls : P().data.cur;
    HG.setBuild(P().data.classes[cls] ? P().buildFor(cls) : MW.makeBuild(cls, P().defaultLoadout(cls), ''), !P().data.classes[cls]);
    $('gl').classList.toggle('dim', tab === 'shop' || tab === 'pass');
    HG.frame();
  },
  toast(t, kind) { const d = h('div', 'toast ' + (kind || ''), t); $('toasts').appendChild(d); setTimeout(() => d.classList.add('out'), 2200); setTimeout(() => d.remove(), 2700); },

  // ---------------- PLAY ----------------
  renderPlay() {
    const el = $('p_play'); const d = P().data; const cls = d.cur; const bt = P().buildTier(cls);
    const modes = MW.MODES.map(m => `<button class="mode ${this.sel.mode === m.id ? 'sel' : ''}" data-mode="${m.id}"><i>${m.icon}</i><b>${m.name}</b><span>${m.desc}</span></button>`).join('');
    el.innerHTML = `<div class="col">
      <h2>Deploy</h2>
      <div class="deployCard"><div><div class="lbl">Active mech</div><select id="playCls">${MW.CLASSES.filter(c => d.classes[c.id]).map(c => `<option value="${c.id}" ${c.id === cls ? 'selected' : ''}>${c.name} — ${c.role}</option>`).join('')}</select></div>
      <div class="bt"><div class="lbl">Build tier</div><div class="big" style="color:${tierCol(bt)}">${MW.TIERS[bt].roman}</div><div class="sub">${MW.TIERS[bt].name}</div></div></div>
      <p class="note">Matchmaking uses your build tier — the highest tier among your equipped weapons and systems. Every enemy and ally AI fields a random build made only of Tier ${MW.TIERS[bt].roman} parts.</p>
      <div class="lbl">Game mode</div><div class="modes">${modes}</div>
      <div class="lbl">Arena <span class="dim">— sorted by size</span></div><div class="maps" id="mapGrid"></div>
      <div class="deployBar"><div id="selInfo"></div><button class="btn" id="btnQuick">Quick match</button><button class="btn primary big" id="btnDeploy">DEPLOY ▸</button></div></div>`;
    const grid = $('mapGrid');
    MW.MAPS.forEach(m => {
      const b = h('button', 'mapc' + (this.sel.map === m.id ? ' sel' : ''), `<canvas width="96" height="96"></canvas><div><b>${m.name}</b><span>${m.team}v${m.team} · ${Math.round(m.size * 2)}m · ${m.theme}</span><em>${m.desc}</em></div>`);
      b.dataset.map = m.id; grid.appendChild(b);
      const cv = b.querySelector('canvas'); this.mapThumb(m, cv);
      b.onclick = () => { MW.audio.play('ui'); this.sel.map = m.id; grid.querySelectorAll('.mapc').forEach(x => x.classList.toggle('sel', x === b)); this.selInfo(); };
    });
    el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.sel.mode = b.dataset.mode; el.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('sel', x === b)); this.selInfo(); });
    $('playCls').onchange = e => { d.cur = e.target.value; P().save(); this.renderPlay(); HG.setBuild(P().buildFor(d.cur)); this.refreshTop(); };
    $('btnDeploy').onclick = () => this.deploy(this.sel.map, this.sel.mode);
    $('btnQuick').onclick = () => this.quickMatch();
    this.selInfo();
  },
  selInfo() { const m = MW.MAP[this.sel.map], md = MW.MODE[this.sel.mode]; $('selInfo').innerHTML = `<b>${md.name}</b> on <b>${m.name}</b> · ${m.team} vs ${m.team}`; },
  mapThumb(def, cv) {
    const key = 'mt' + def.id; if (this[key]) { cv.getContext('2d').drawImage(this[key], 0, 0, cv.width, cv.height); return; }
    const img = MW.maps.preview(def, 96); this[key] = img; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  },
  quickMatch() { const m = MW.pick(Math.random, MW.MAPS), md = MW.pick(Math.random, MW.MODES); this.deploy(m.id, md.id); },

  // ---------------- battle flow ----------------
  deploy(mapId, modeId) {
    MW.audio.init(); MW.audio.play('ui');
    const cls = P().data.cur; const tier = P().buildTier(cls);
    this.show('loading'); $('loadMap').textContent = MW.MAP[mapId].name; $('loadMode').textContent = MW.MODE[modeId].name + ' · ' + MW.MAP[mapId].team + 'v' + MW.MAP[mapId].team + ' · Tier ' + MW.TIERS[tier].roman;
    $('loadTip').textContent = MW.pick(Math.random, TIPS);
    MW.input.lock();
    setTimeout(() => {
      MW.battle.stop(); MW.core.camera.clearViewOffset();
      MW.battle.start({ map: MW.MAP[mapId], mode: modeId, tier, playerBuild: P().buildFor(cls), onEnd: r => this.onBattleEnd(r) });
      this.inBattle = true; this.show('battle'); $('gl').classList.remove('dim');
      if (!MW.input.locked) $('clickToLock').classList.add('on');
    }, 80);
  },
  onLockChange(locked) {
    if (!this.inBattle) return; const B = MW.battle.B; if (!B) return;
    $('clickToLock').classList.toggle('on', !locked && !B.over);
    if (!locked && !B.over && !B.endSent) { $('pause').classList.add('on'); MW.battle.togglePause(true); }
    if (locked) { $('pause').classList.remove('on'); $('clickToLock').classList.remove('on'); MW.battle.togglePause(false); }
  },
  quitBattle() { $('pause').classList.remove('on'); this.inBattle = false; MW.battle.stop(); MW.input.unlock(); this.enterMenu('play'); this.toast('Match abandoned — no rewards', 'bad'); },
  onBattleEnd(res) {
    this.inBattle = false; MW.input.unlock(); $('pause').classList.remove('on'); $('clickToLock').classList.remove('on');
    const rw = P().applyMatch(res);
    MW.battle.stop(); MW.hud.stop(); HG.enter(); this.show('results');
    $('resTitle').textContent = res.draw ? 'DRAW' : res.win ? 'VICTORY' : 'DEFEAT'; $('resTitle').className = res.win ? 'win' : res.draw ? '' : 'lose';
    $('resSub').textContent = `${MW.MODE[res.mode].name} · ${res.map.name} · Tier ${MW.TIERS[res.tier].roman} · ${res.score[0] | 0} – ${res.score[1] | 0}`;
    $('resStats').innerHTML = [['Kills', res.kills], ['Deaths', res.deaths], ['Assists', res.assists], ['Damage', MW.fmt(res.dmg)], ['Objectives', res.obj]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('') + (res.mvp ? '<div class="mvp"><b>TEAM MVP</b></div>' : '');
    $('resCredits').innerHTML = rw.lines.map(([a, b]) => `<div><span>${a}</span><b>+${MW.fmt(b)}</b></div>`).join('') + `<div class="tot"><span>Total</span><b>${cr(rw.total)}</b></div>`;
    $('resPass').innerHTML = `<div><span>Battle pass XP</span><b>+${MW.fmt(rw.xp)}</b></div>` + rw.done.map(c => `<div class="chal"><span>✔ ${c.text}</span><b>+${MW.fmt(c.xp)} XP</b></div>`).join('') + (rw.lvl > rw.prevLvl ? `<div class="lvup">PASS LEVEL ${rw.lvl}! Claim rewards in the Battle Pass tab.</div>` : '');
    if (rw.lvl > rw.prevLvl) MW.audio.play('levelup');
    $('resBoard').innerHTML = `<table><tr><th>#</th><th>Pilot</th><th>Class</th><th>K</th><th>D</th><th>A</th><th>DMG</th><th>Score</th></tr>${res.board.map((r, i) => `<tr class="t${r.team} ${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.cls}</td><td>${r.k}</td><td>${r.d}</td><td>${r.a}</td><td>${MW.fmt(r.dmg)}</td><td>${MW.fmt(r.score)}</td></tr>`).join('')}</table>`;
    this.refreshTop();
  },
  key(code, down) {
    if (!down) return;
    if (this.inBattle && MW.battle.B && !MW.battle.B.paused) {
      if (code === 'KeyV') MW.battle.setView(MW.battle.B.view === 3 ? 1 : 3);
      if (code === 'KeyQ') MW.battle.ability();
      if (code === 'KeyB') MW.battle.cockpitPage('L');
      if (code === 'KeyN') MW.battle.cockpitPage('R');
      if (code === 'KeyC' && MW.battle.B.player) MW.battle.B.player.aimYaw = MW.battle.B.player.yaw;
      if (code === 'KeyH') $('helpOverlay').classList.toggle('on');
    }
    if (code === 'Escape' && $('modal').classList.contains('on')) this.closeModal();
  },

  // ---------------- GARAGE ----------------
  renderGarage() {
    const el = $('p_garage'); const d = P().data; const cls = this.garageCls; const owned = !!d.classes[cls];
    const list = MW.CLASSES.map(c => `<button class="clsb ${c.id === cls ? 'sel' : ''} ${d.classes[c.id] ? '' : 'locked'}" data-cls="${c.id}"><b>${c.name}</b><span>${c.weight} ${c.role}</span>${d.classes[c.id] ? (d.cur === c.id ? '<em>ACTIVE</em>' : '') : `<em>${MW.fmtShort(c.price)}</em>`}</button>`).join('');
    const c = MW.CLASS[cls];
    let right = '';
    if (!owned) {
      right = `<div class="lockedBox"><h3>${c.name} is locked</h3><p>${c.desc}</p><p>Unlock price ${cr(c.price)}</p><button class="btn primary" id="unlockCls">View in shop</button></div>`;
    } else {
      const L = P().loadout(cls); const build = P().buildFor(cls); const s = buildStats(build); const bt = P().buildTier(cls);
      const sub = this.gTab || 'weapons';
      const tabs = ['weapons', 'systems', 'paint', 'style'].map(t => `<button class="gt ${sub === t ? 'on' : ''}" data-gt="${t}">${t.toUpperCase()}</button>`).join('');
      let body = '';
      if (sub === 'weapons') body = c.hardpoints.map((hp, i) => { const it = MW.item(L.hp[i]); return `<div class="slot" data-slot="hp" data-i="${i}"><div class="sz">${hp.size}</div><div class="si"><b style="color:${it ? tierCol(it.tier) : '#888'}">${it ? esc(it.name) : 'Empty'}</b><span>${hp.mount.replace('arm', 'Arm ').replace('sh', 'Shoulder ').replace('torsoC', 'Chest').replace('back', 'Back')} · ${it ? itemSub(it) : ''}</span></div><button class="grp" data-grp="${i}">G${L.groups[i] || 1}</button></div>`; }).join('') + '<p class="note">G1 fires with left mouse, G2 with right mouse, F fires everything.</p>';
      if (sub === 'systems') body = MW.EQUIP_SLOTS.map(sl => { const it = MW.item(L.eq[sl.id]); return `<div class="slot" data-slot="eq" data-k="${sl.id}"><div class="sz">${sl.icon}</div><div class="si"><b style="color:${tierCol(it.tier)}">${MW.TIERS[it.tier].roman} · ${esc(it.name)}</b><span>${sl.name} · ${esc(it.desc || '')}</span></div></div>`; }).join('');
      if (sub === 'paint') {
        const sk = MW.item(L.skin) || MW.item('s_solid_0'); const fi = MW.item(L.finish) || MW.item('f_satin');
        body = `<div class="slot" data-slot="skin"><div class="sz sw" style="background:${sk.colors[0]}"></div><div class="si"><b style="color:${tierCol(sk.tier)}">${esc(sk.name)}</b><span>Skin pattern — tap to change</span></div></div>
          <div class="slot" data-slot="finish"><div class="sz">◐</div><div class="si"><b style="color:${tierCol(fi.tier)}">${esc(fi.name)}</b><span>Finish</span></div></div>
          ${['Primary', 'Secondary', 'Accent'].map((n, k) => `<div class="lbl">${n} colour</div><div class="swatches" data-ch="${k}">${MW.SWATCHES.map(sw => `<button style="background:${sw}" class="${L.colors[k].toLowerCase() === sw ? 'on' : ''}" data-sw="${sw}"></button>`).join('')}<input type="color" value="${L.colors[k]}" data-cc="${k}"></div>`).join('')}`;
      }
      if (sub === 'style') body = [['emblem', 'Emblem'], ['wskin', 'Weapon skin'], ['trinket', 'Cockpit trinket'], ['cockpit', 'Cockpit theme'], ['jet', 'Thruster colour'], ['title', 'Pilot title']].map(([k, n]) => { const it = L[k] ? MW.item(L[k]) : null; return `<div class="slot" data-slot="${k}"><div class="sz">${k === 'cockpit' && it ? `<i class="dot" style="background:${it.hud}"></i>` : k === 'jet' && it ? `<i class="dot" style="background:${it.color}"></i>` : '✦'}</div><div class="si"><b style="color:${it ? tierCol(it.tier) : '#888'}">${it ? esc(it.name) : 'None'}</b><span>${n}</span></div></div>`; }).join('');
      const stat = (n, v, max, u) => `<div class="stat"><span>${n}</span><i><u style="width:${Math.min(100, v / max * 100)}%"></u></i><b>${v}${u || ''}</b></div>`;
      right = `<div class="gtabs">${tabs}</div><div class="gbody">${body}</div>
        <div class="gstats"><div class="btier" style="--c:${tierCol(bt)}"><span>BUILD TIER</span><b>${MW.TIERS[bt].roman}</b><em>${MW.TIERS[bt].name}</em></div>
        ${stat('Armour', s.armor, 6000)}${stat('Speed', s.speed, 100, ' km/h')}${stat('Firepower', s.dps, 600, ' dps')}${stat('Heat efficiency', s.heatEff, 200, '%')}${stat('Avg range', s.range, 900, ' m')}${stat('Radar', s.radar, 700, ' m')}
        <div class="abil"><b>${c.ability.name}</b> <span>(Q) ${c.ability.desc}</span></div>
        ${d.cur !== cls ? '<button class="btn primary" id="setActive">Set as active mech</button>' : '<div class="activeTag">ACTIVE MECH</div>'}</div>`;
    }
    el.innerHTML = `<div class="garage"><div class="clsList"><h2>Garage</h2>${list}</div><div class="spacer"></div><div class="gright"><h3>${c.name} <span class="dim">${c.tons}t ${c.weight} ${c.role}</span></h3><p class="desc">${c.desc}</p>${right}</div></div>`;
    el.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.garageCls = b.dataset.cls; this.renderGarage(); const ow = !!P().data.classes[this.garageCls]; HG.setBuild(ow ? P().buildFor(this.garageCls) : MW.makeBuild(this.garageCls, P().defaultLoadout(this.garageCls), ''), !ow); });
    el.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.gTab = b.dataset.gt; this.renderGarage(); });
    if (!owned) { $('unlockCls').onclick = () => this.openItem(MW.item('cls_' + cls)); return; }
    const L = P().loadout(cls);
    const apply = () => { P().save(); this.renderGarage(); HG.setBuild(P().buildFor(cls)); this.refreshTop(); };
    el.querySelectorAll('[data-grp]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.grp; L.groups[i] = (L.groups[i] || 1) === 1 ? 2 : 1; MW.audio.play('ui'); apply(); });
    el.querySelectorAll('.slot').forEach(s => s.onclick = () => { MW.audio.play('ui'); this.picker(cls, s.dataset.slot, s.dataset.i != null ? +s.dataset.i : s.dataset.k); });
    el.querySelectorAll('.swatches').forEach(sw => { const k = +sw.dataset.ch; sw.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { L.colors[k] = b.dataset.sw; MW.audio.play('ui'); apply(); }); const ci = sw.querySelector('input'); ci.onchange = () => { L.colors[k] = ci.value; apply(); }; });
    const sa = $('setActive'); if (sa) sa.onclick = () => { P().data.cur = cls; MW.audio.play('buy'); apply(); };
  },
  picker(cls, slot, key) {
    const L = P().loadout(cls); const c = MW.CLASS[cls]; const own = id => P().owns(id);
    let items = [], cur = null, set;
    if (slot === 'hp') { const hp = c.hardpoints[key]; items = MW.ITEM_LIST.concat(Object.values(P().data.passItems)).filter(i => i.cat === 'weapon' && MW.fits(hp.size, i.size) && own(i.id)); cur = L.hp[key]; set = id => { L.hp[key] = id; const w = MW.WTYPE[MW.item(id).wtype]; L.groups[key] = w.kind === 'missile' || w.fire === 'charge' ? 2 : 1; }; }
    else if (slot === 'eq') { items = MW.ITEM_LIST.concat(Object.values(P().data.passItems)).filter(i => i.cat === 'equip' && i.slot === key && own(i.id)); cur = L.eq[key]; set = id => (L.eq[key] = id); }
    else { items = MW.ITEM_LIST.concat(Object.values(P().data.passItems)).filter(i => i.cat === slot && own(i.id)); cur = L[slot]; set = id => { L[slot] = id; if (slot === 'skin') L.colors = MW.item(id).colors.slice(); }; if (['emblem', 'wskin', 'trinket'].includes(slot)) items.unshift({ id: null, name: 'None', tier: 0, cat: slot }); }
    items.sort((a, b) => b.tier - a.tier || (a.name > b.name ? 1 : -1));
    const body = h('div', 'picker');
    body.innerHTML = `<h3>Choose ${slot === 'hp' ? c.hardpoints[key].size + ' hardpoint weapon' : slot === 'eq' ? MW.EQSLOT[key].name : MW.CAT_NAMES[slot] || slot}</h3><p class="note">${items.length} owned. Buy more in the shop, win them from crates or earn them in the battle pass.</p><div class="plist"></div><button class="btn" id="pkShop">Open shop</button>`;
    const pl = body.querySelector('.plist');
    items.forEach(it => {
      const row = h('button', 'prow' + (it.id === cur ? ' sel' : ''), `<div class="pthumb"></div><div><b style="color:${tierCol(it.tier)}">${it.id ? MW.TIERS[it.tier].roman + ' · ' : ''}${esc(it.name)}</b><span>${it.id ? itemSub(it) : ''}</span></div>`);
      if (it.id) this.thumbInto(row.querySelector('.pthumb'), it);
      row.onclick = () => { set(it.id); P().save(); MW.audio.play('buy'); this.closeModal(); this.renderGarage(); HG.setBuild(P().buildFor(cls)); this.refreshTop(); };
      pl.appendChild(row);
    });
    this.modal(body);
    $('pkShop').onclick = () => { this.closeModal(); this.shopCat = slot === 'hp' ? 'weapon' : slot === 'eq' ? 'equip' : slot; this.openTab('shop'); };
  },

  // ---------------- SHOP ----------------
  featured() {
    const day = MW.dayIndex(); const r = MW.rng('feat' + day);
    const pool = MW.ITEM_LIST.filter(i => i.cat !== 'class' && i.price > 0);
    const out = []; while (out.length < 8) { const it = MW.pick(r, pool); if (!out.includes(it)) out.push(it); }
    return out;
  },
  priceOf(it) { return this.featured().includes(it) ? Math.round(it.price * 0.75 / 50) * 50 : it.price; },
  renderShop() {
    const el = $('p_shop');
    const cats = [['featured', 'Daily Deals'], ['class', 'Mech Classes'], ['weapon', 'Weapons'], ['equip', 'Equipment'], ['skin', 'Skins'], ['finish', 'Finishes'], ['emblem', 'Emblems'], ['trinket', 'Trinkets'], ['cockpit', 'Cockpit Themes'], ['jet', 'Thrusters'], ['wskin', 'Weapon Skins'], ['title', 'Titles']];
    const now = Date.now(); const nextDay = (MW.dayIndex() + 1) * 86400000 + Date.UTC(2024, 0, 1) - now;
    el.innerHTML = `<div class="shop"><div class="shopHead"><h2>Armory Shop</h2><span class="dim">Daily deals refresh in ${Math.floor(nextDay / 3600000)}h ${Math.floor(nextDay / 60000) % 60}m · battle-pass items are never sold here</span></div>
      <div class="cats">${cats.map(([k, n]) => `<button class="cat ${this.shopCat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>
      <div class="filters"><input id="shopSearch" placeholder="Search…" value="${esc(this.shopSearch || '')}"><div class="tiers"><button data-tier="-1" class="${this.shopTier === -1 ? 'on' : ''}">All tiers</button>${MW.TIERS.map(t => `<button data-tier="${t.id}" class="${this.shopTier === t.id ? 'on' : ''}" style="--c:${t.color}">${t.roman}</button>`).join('')}</div><label><input type="checkbox" id="hideOwned" ${this.hideOwned ? 'checked' : ''}> Hide owned</label></div>
      <div class="grid" id="shopGrid"></div></div>`;
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.shopCat = b.dataset.cat; this.renderShop(); });
    el.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { MW.audio.play('ui'); this.shopTier = +b.dataset.tier; this.renderShop(); });
    $('hideOwned').onchange = e => { this.hideOwned = e.target.checked; this.fillShop(); };
    $('shopSearch').oninput = e => { this.shopSearch = e.target.value; this.fillShop(); };
    this.fillShop();
  },
  fillShop() {
    const grid = $('shopGrid'); grid.innerHTML = '';
    let items = this.shopCat === 'featured' ? this.featured() : MW.ITEM_LIST.filter(i => i.cat === this.shopCat && (i.price > 0 || i.cat === 'class'));
    if (this.shopTier >= 0) items = items.filter(i => i.tier === this.shopTier);
    if (this.hideOwned) items = items.filter(i => !P().owns(i.id));
    const q = (this.shopSearch || '').toLowerCase(); if (q) items = items.filter(i => (i.name + ' ' + itemSub(i)).toLowerCase().includes(q));
    if (this.shopCat === 'class') items = items.slice().sort((a, b) => a.price - b.price);
    if (!items.length) { grid.innerHTML = '<p class="dim">Nothing matches.</p>'; return; }
    if (!this.io) this.io = new IntersectionObserver(ents => ents.forEach(e => { if (e.isIntersecting) { this.io.unobserve(e.target); this.thumbInto(e.target, e.target._item); } }), { root: null, rootMargin: '200px' });
    items.forEach(it => grid.appendChild(this.card(it)));
  },
  card(it, opts) {
    opts = opts || {};
    const owned = P().owns(it.id); const price = this.priceOf(it); const deal = price !== it.price;
    const swatches = it.colors ? `<div class="sws">${it.colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : it.cat === 'cockpit' ? `<div class="sws"><i style="background:${it.hud}"></i><i style="background:${it.light}"></i></div>` : it.cat === 'jet' ? `<div class="sws"><i style="background:${it.color}"></i></div>` : it.cat === 'finish' ? `<div class="sws"><i class="fin fin-${(MW.FINISHES.find(f => f.id === it.finish) || {}).id}"></i></div>` : '';
    const c = h('button', 'card' + (owned ? ' owned' : ''), `<div class="tstrip" style="background:${tierCol(it.tier)}"></div><div class="thumb">${it.cat === 'title' ? `<div class="titleTxt" style="color:${tierCol(it.tier)}">${esc(it.title)}</div>` : '<div class="spin"></div>'}</div>${swatches}<div class="cinfo"><b>${esc(it.name)}</b><span>${MW.TIERS[it.tier].roman} · ${itemSub(it)}</span></div><div class="price">${owned ? '<em>OWNED</em>' : (deal ? `<s>${MW.fmt(it.price)}</s> ` : '') + cr(price)}</div>${deal ? '<div class="deal">−25%</div>' : ''}`);
    c.style.setProperty('--c', tierCol(it.tier));
    const th = c.querySelector('.thumb'); th._item = it;
    if (it.cat !== 'title') { if (this.io && !opts.now) this.io.observe(th); else this.thumbInto(th, it); }
    c.onclick = () => { MW.audio.play('ui'); this.openItem(it); };
    return c;
  },
  thumbInto(el, it) {
    const put = url => { if (!el.isConnected && !el._force) return; el.innerHTML = url && url !== 'none' ? `<img src="${url}" alt="">` : (it.colors ? `<div class="bigsw">${it.colors.map(c => `<i style="background:${c}"></i>`).join('')}</div>` : ''); };
    const u = MW.thumbs.get(it, put); if (u) put(u);
  },
  openItem(it) {
    const owned = P().owns(it.id); const price = this.priceOf(it);
    const body = h('div', 'itemDetail');
    const stats = itemStats(it).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
    const sw = it.colors ? `<div class="bigSwatch">${it.colors.map((c, i) => `<div><i style="background:${c}"></i><span>${['Primary', 'Secondary', 'Accent'][i]} ${c}</span></div>`).join('')}</div><canvas class="patPrev" width="200" height="80"></canvas>` : it.cat === 'cockpit' ? `<div class="bigSwatch"><div><i style="background:${it.hud}"></i><span>HUD ${it.hud}</span></div><div><i style="background:${it.light}"></i><span>Lighting ${it.light}</span></div></div>` : it.cat === 'jet' ? `<div class="bigSwatch"><div><i style="background:${it.color}"></i><span>Flame ${it.color}</span></div></div>` : '';
    body.innerHTML = `<div class="prev" id="prevBox">${it.cat === 'title' ? `<div class="titleTxt big" style="color:${tierCol(it.tier)}">${esc(it.title)}</div>` : ''}<div class="hint">drag to rotate</div></div><div class="info">${tierBadge(it.tier)}<h2>${esc(it.name)}</h2><div class="dim">${MW.CAT_NAMES[it.cat]}${it.exclusive ? ' · <b class="excl">BATTLE PASS EXCLUSIVE</b>' : ''}</div>${it.cat === 'class' ? `<p>${MW.CLASS[it.cls].desc}</p>` : ''}${sw}<table class="stats">${stats}</table>
      <div class="buyRow">${owned ? '<b class="ownedTag">OWNED</b>' : it.exclusive ? '<b class="ownedTag">Earn it in the battle pass</b>' : `<span>${cr(price)}</span><button class="btn primary" id="buyBtn">BUY</button>`}${owned && it.cat !== 'class' ? '<button class="btn" id="equipBtn">Equip in garage</button>' : ''}</div><div class="balance">Balance ${cr(P().data.credits)}</div></div>`;
    this.modal(body, 'wide');
    if (it.colors) { const cv = body.querySelector('.patPrev'); const c = cv.getContext('2d'); const t = MW.tex.canvas(256); MW.tex.drawPattern(t.getContext('2d'), 256, it.pattern, it.colors); c.fillStyle = c.createPattern(t, 'repeat'); c.fillRect(0, 0, 200, 80); }
    if (it.cat !== 'title') MW.thumbs.showPreview(it, $('prevBox'));
    const bb = $('buyBtn'); if (bb) bb.onclick = () => {
      if (it.cat === 'class' && !confirm(`Unlock ${MW.CLASS[it.cls].name} for ${MW.fmt(price)} credits?`)) return;
      if (!P().canAfford(price)) { MW.audio.play('deny'); this.toast('Not enough credits', 'bad'); return; }
      P().spend(price); P().grant(it); MW.audio.play('buy'); this.toast('Purchased ' + it.name, 'good'); this.closeModal(); this.refreshTop();
      if (this.tab === 'shop') this.fillShop(); if (it.cat === 'class') { this.garageCls = it.cls; this.openTab('garage'); }
    };
    const eb = $('equipBtn'); if (eb) eb.onclick = () => { this.closeModal(); this.openTab('garage'); };
  },
  modal(content, cls) { const m = $('modal'); const b = $('modalBody'); b.innerHTML = ''; b.appendChild(content); m.className = 'on ' + (cls || ''); },
  closeModal() { $('modal').className = ''; MW.thumbs.hidePreview(); },

  // ---------------- CRATES ----------------
  renderBoxes() {
    const el = $('p_boxes');
    el.innerHTML = `<div class="col"><h2>Supply Crates</h2><p class="note">Each crate holds three rolls. Results range from two tiers below to two tiers above the crate — junk to jackpots. Duplicates are refunded as credits. Elite crates and up can contain an entire mech class.</p><div class="boxes"></div></div>`;
    const wrap = el.querySelector('.boxes');
    MW.BOXES.forEach(b => {
      const c = h('div', 'boxc', `<div class="thumb"><div class="spin"></div></div><div class="cinfo"><b style="color:${tierCol(b.tier)}">${b.name}</b><span>${b.desc}</span><div class="odds">${[-2, -1, 0, 1, 2].map((o, i) => { const t = b.tier + o; if (t < 0 || t > 5) return ''; return `<i style="color:${tierCol(t)}">${MW.TIERS[t].roman} ${[13, 30, 36, 16, 5][i]}%</i>`; }).join('')}</div></div><button class="btn primary">${cr(b.price)} OPEN</button>`);
      c.style.setProperty('--c', tierCol(b.tier));
      this.thumbInto(c.querySelector('.thumb'), { id: b.id, cat: 'box', tier: b.tier });
      c.querySelector('button').onclick = () => this.buyBox(b);
      wrap.appendChild(c);
    });
  },
  buyBox(b) {
    if (this.boxAnim) return;
    if (!P().canAfford(b.price)) { MW.audio.play('deny'); this.toast('Not enough credits', 'bad'); return; }
    P().spend(b.price); P().data.stats.boxes++; this.refreshTop();
    this.openBox(b.tier, MW.rollBox(b.tier));
  },
  openBox(tier, rolls) {
    this.boxAnim = true; $('gl').classList.remove('dim'); HG.cam = null;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    const results = rolls.map(r => { if (r.credits) { P().earn(r.credits); return { credits: r.credits, tier: r.tier }; } const g = P().grant(r.item); return { item: r.item, dupe: g.dupe, refund: g.refund }; });
    HG.openCrate(tier, () => this.reveal(results));
  },
  reveal(results) {
    const rv = $('reveal'); const wrap = $('revealCards'); wrap.innerHTML = ''; rv.classList.add('on');
    results.forEach((r, i) => {
      const t = r.item ? r.item.tier : r.tier; const card = h('div', 'rcard', `<div class="back"></div><div class="front" style="--c:${tierCol(t)}"><div class="thumb"></div><b>${r.item ? esc(r.item.name) : '◈ ' + MW.fmt(r.credits) + ' credits'}</b><span>${MW.TIERS[t].roman} · ${MW.TIERS[t].name}${r.item ? ' · ' + (MW.CAT_NAMES[r.item.cat] || '') : ''}</span>${r.dupe ? `<em>Duplicate — refunded ${MW.fmt(r.refund)}</em>` : r.item ? '<em class="new">NEW</em>' : ''}</div>`);
      wrap.appendChild(card);
      const th = card.querySelector('.thumb'); th._force = true;
      if (r.item) { if (r.item.cat === 'title') th.innerHTML = `<div class="titleTxt">${esc(r.item.title)}</div>`; else this.thumbInto(th, r.item); } else th.innerHTML = '<div class="credIcon">◈</div>';
      setTimeout(() => { card.classList.add('flip'); MW.audio.play(t >= 4 ? 'legendary' : 'reveal', null, 0.6); }, 400 + i * 650);
    });
    this.refreshTop();
  },

  // ---------------- BATTLE PASS ----------------
  renderPass() {
    const el = $('p_pass'); const pr = P(); const pass = pr.pass; const lvl = pr.passLevel(); const xp = pr.data.passXP;
    const left = pass.ends - Date.now(); const dd = Math.floor(left / 86400000), hh = Math.floor(left / 3600000) % 24, mm = Math.floor(left / 60000) % 60;
    el.innerHTML = `<div class="pass"><div class="passHead" style="--a:${pass.pal[0]};--b:${pass.pal[2]}"><div><div class="lbl">Weekly battle pass · week ${pass.week}</div><h2>${esc(pass.name)}</h2><div class="dim">Resets in ${dd}d ${hh}h ${mm}m — every reward below is exclusive to this week and never appears in the shop.</div></div>
      <div class="lvl"><b>${lvl}</b><span>/ ${MW.PASS_LEVELS}</span><div class="xpbar"><i style="width:${lvl >= MW.PASS_LEVELS ? 100 : (xp % MW.PASS_XP) / MW.PASS_XP * 100}%"></i></div><em>${MW.fmt(xp % MW.PASS_XP)} / ${MW.fmt(MW.PASS_XP)} XP</em></div></div>
      <div class="track" id="passTrack"></div>
      <h3>Weekly challenges</h3><div class="chals">${pass.challenges.map(c => { const p = Math.min(c.n, pr.data.chal[c.id] || 0); const done = pr.data.chalDone[c.id]; return `<div class="chal ${done ? 'done' : ''}"><b>${c.text}</b><div class="xpbar"><i style="width:${p / c.n * 100}%"></i></div><span>${MW.fmt(p)} / ${MW.fmt(c.n)} · +${MW.fmt(c.xp)} XP</span></div>`; }).join('')}</div></div>`;
    const tr = $('passTrack');
    pass.track.forEach(step => {
      const got = pr.data.passClaimed[step.level]; const can = lvl >= step.level && !got;
      let inner, t = 0;
      if (step.item) { const it = pass.items.find(i => i.id === step.item); t = it.tier; inner = `<div class="thumb"></div><b>${esc(it.name)}</b><span>${MW.CAT_NAMES[it.cat]}</span>`; }
      else if (step.box != null) { t = step.box; inner = `<div class="thumb"></div><b>${MW.BOXES[step.box].name}</b><span>Supply crate</span>`; }
      else inner = `<div class="thumb credIcon">◈</div><b>${MW.fmt(step.credits)}</b><span>Credits</span>`;
      const c = h('div', 'pstep' + (got ? ' got' : '') + (can ? ' can' : '') + (lvl < step.level ? ' locked' : ''), `<div class="plv">${step.level}</div>${inner}<button class="btn ${can ? 'primary' : ''}" ${can ? '' : 'disabled'}>${got ? 'CLAIMED' : can ? 'CLAIM' : 'LV ' + step.level}</button>`);
      c.style.setProperty('--c', tierCol(t));
      const th = c.querySelector('.thumb');
      if (step.item) { const it = pass.items.find(i => i.id === step.item); if (it.cat === 'title') th.innerHTML = `<div class="titleTxt">${esc(it.title)}</div>`; else this.thumbInto(th, it); c.querySelector('b').onclick = () => this.openItem(it); }
      if (step.box != null) this.thumbInto(th, { id: 'box_' + step.box, cat: 'box', tier: step.box });
      c.querySelector('button').onclick = () => {
        const res = pr.claimLevel(step.level); if (!res) return;
        MW.audio.play('buy');
        if (res.box != null) { this.openBox(res.box, res.rolls); return; }
        this.toast(res.credits ? '+' + MW.fmt(res.credits) + ' credits' : 'Unlocked ' + res.item.name, 'good');
        this.refreshTop(); this.renderPass();
      };
      tr.appendChild(c);
    });
  },

  // ---------------- SETTINGS ----------------
  renderSettings() {
    const s = P().s; const el = $('p_settings');
    el.innerHTML = `<div class="col settings"><h2>Settings</h2>
      <label>Pilot name <input id="sName" value="${esc(s.name)}" maxlength="16"></label>
      <label>Control scheme <select id="sScheme"><option value="classic" ${s.scheme === 'classic' ? 'selected' : ''}>Classic — W/S throttle, A/D turn legs, mouse twists torso</option><option value="arcade" ${s.scheme === 'arcade' ? 'selected' : ''}>Arcade — WASD moves relative to where you look</option></select></label>
      <label>Mouse sensitivity <input type="range" id="sSens" min="0.2" max="3" step="0.05" value="${s.sens}"><b id="sSensV">${s.sens}</b></label>
      <label>Invert mouse Y <input type="checkbox" id="sInv" ${s.invertY ? 'checked' : ''}></label>
      <label>Field of view <input type="range" id="sFov" min="55" max="95" step="1" value="${s.fov}"><b id="sFovV">${s.fov}</b></label>
      <label>Graphics quality <select id="sQ"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High</option><option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low (no shadows)</option></select></label>
      <label>Master volume <input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.volume}"></label>
      <label>Music <input type="range" id="sMus" min="0" max="1" step="0.05" value="${s.music}"></label>
      <div class="ctrls"><h3>Controls</h3>${CONTROLS}</div>
      <div class="row"><button class="btn" id="sReset">Reset all progress</button></div>
      <p class="note">Quality changes apply after reloading the page. Progress is saved in this browser.</p></div>`;
    const sv = () => { P().save(); MW.audio.setVolume(); };
    $('sName').onchange = e => { s.name = e.target.value.trim() || 'Pilot'; sv(); this.refreshTop(); };
    $('sScheme').onchange = e => { s.scheme = e.target.value; sv(); };
    $('sSens').oninput = e => { s.sens = +e.target.value; $('sSensV').textContent = s.sens; sv(); };
    $('sInv').onchange = e => { s.invertY = e.target.checked; sv(); };
    $('sFov').oninput = e => { s.fov = +e.target.value; $('sFovV').textContent = s.fov; sv(); };
    $('sQ').onchange = e => { s.quality = e.target.value; sv(); this.toast('Reload the page to apply', ''); };
    $('sVol').oninput = e => { s.volume = +e.target.value; sv(); };
    $('sMus').oninput = e => { s.music = +e.target.value; sv(); };
    $('sReset').onclick = () => { if (confirm('Erase all credits, items, mechs and pass progress?')) { P().reset(); this.garageCls = P().data.cur; this.refreshTop(); this.openTab('play'); this.toast('Progress reset', ''); } };
  },
};

const CONTROLS = `<table>
<tr><td>Mouse</td><td>Aim torso and weapons</td></tr><tr><td>W / S</td><td>Throttle forward / reverse</td></tr><tr><td>A / D</td><td>Turn legs (Classic) · strafe-walk (Arcade)</td></tr>
<tr><td>Left mouse</td><td>Fire weapon group 1</td></tr><tr><td>Right mouse</td><td>Fire weapon group 2</td></tr><tr><td>F</td><td>Alpha strike — fire everything</td></tr>
<tr><td>Space</td><td>Jump jets (hold)</td></tr><tr><td>Q</td><td>Class ability</td></tr><tr><td>Z</td><td>Zoom</td></tr><tr><td>C</td><td>Centre torso to legs</td></tr>
<tr><td>V</td><td>Cockpit / third-person view</td></tr><tr><td>B / N</td><td>Cycle left / right cockpit MFD page</td></tr><tr><td>Tab</td><td>Scoreboard</td></tr><tr><td>H</td><td>Controls overlay</td></tr><tr><td>Esc</td><td>Pause</td></tr></table>`;
MW.CONTROLS = CONTROLS;
const TIPS = ['Firing too much at once overheats your reactor. Standing in water cools you faster.', 'LRMs need a lock: keep an enemy inside the crosshair until the box turns solid.', 'Destroying an arm removes every weapon mounted on it.', 'Leg damage slows you down. Destroyed legs leave you crawling.', 'Your build tier is the highest tier among your equipped weapons and systems. Mixing in lower-tier parts makes you weaker than your opponents.', 'Large Lasers deal damage over the whole beam — hold the crosshair on target.', 'Gauss Rifles fire when you release the trigger after charging.', 'Torso twist lets you shoot sideways while walking forward.', 'Lava burns your legs and spikes your heat.', 'On Tycho Lunar Base and Ares Outpost gravity is low — jump jets go much higher.', 'Daily deals in the shop are 25% off and refresh every day.', 'Battle-pass rewards rotate every week and are never sold in the shop.', 'Press B and N to flip the cockpit screens between pages, just like a real MFD.'];
})();
