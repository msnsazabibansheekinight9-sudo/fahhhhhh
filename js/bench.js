// ============================================================================
// IRONSIGHT — handling bench. Any gun on a workbench, operated by hand with the
// mouse: drag the magazine out, click the ammo box to load rounds into it (or
// into an internal magazine, tube, belt or revolver cylinder), push the mag
// back in, drag the bolt / charging handle / slide / pump / lever to chamber a
// round, set the safety and selector, and click the trigger to fire — with
// muzzle flash, recoil, ejected cases, lock-back on the last round and dry
// clicks on an empty chamber.
// ============================================================================
'use strict';
(function () {
const G = window.G, UI = G.UI, SR = UI.showroom, esc = UI.esc, A = () => G.Audio;
const $ = (s, r = document) => r.querySelector(s);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const BN = G.Bench = { q: '', era: null, wp: null };
let B = null; // state of the gun on the bench

const MODE_N = { semi: 'Semi', auto: 'Auto', burst3: '3-round burst', burst2: '2-round burst', bolt: 'Bolt', pump: 'Pump', lever: 'Lever' };
const CYCLE = { bolt: 'bolt', pump: 'pump', lever: 'lever' };
BN.open = function (id) { if (G.WEAPON[id]) { BN.wp = id; BN.era = G.WEAPON[id].e; } UI.show('bench'); };

// ------------------------------------------------------------------ screen
BN.render = function (root) {
  G.Game.mode = 'menu';
  let wp = G.WEAPON[BN.wp] || G.WEAPON[UI.sel.wp] || G.WEAPON.m4a1; BN.wp = wp.id;
  BN.era = BN.era || wp.e;
  const eras = G.ERAS.filter(e => G.WEAPONS.some(w => w.e === e.id));
  root.innerHTML = `<section class="screen" id="bench">
    <div class="col left"><div class="colhead"><div class="eyebrow">Handling bench</div><div class="eras">${eras.map(e => `<button class="chip ${e.id === BN.era ? 'on' : ''}" data-bera="${e.id}">${esc(e.name)}</button>`).join('')}</div><input class="wsq" id="bq" placeholder="Search every gun…" value="${esc(BN.q)}" style="margin-top:8px"></div><div class="scroll" id="bl"></div></div>
    <div class="stage"><div class="top"><div><div class="eyebrow" id="be"></div><h2 id="bnm"></h2><div class="sub" id="bsub"></div></div><button class="btn small" id="back">Main menu</button></div>
      <div><div class="actions"><button class="btn small" id="b-arm">Armory</button><button class="btn small" id="b-range">Take to the range</button><button class="btn small" id="b-reset">Reset gun</button><button class="btn small" id="b-view">Reset view</button></div><p class="hint">Drag parts to work them · drag empty space to rotate · wheel to zoom</p></div></div>
    <div class="col right"><div class="scroll" id="bp"></div></div></section>
    <div id="btip" style="position:fixed;z-index:30;pointer-events:none;padding:4px 8px;background:rgba(10,12,8,.92);border:1px solid var(--brass);color:var(--brass2);font:600 12px var(--f-mono);border-radius:2px;display:none"></div>`;
  const list = () => {
    const q = BN.q.trim().toLowerCase();
    const ws = G.WEAPONS.filter(w => q ? (w.n + ' ' + w.co + ' ' + w.cal).toLowerCase().includes(q) : w.e === BN.era).slice(0, 250);
    $('#bl').innerHTML = ws.map(w => `<button class="witem ${w.id === BN.wp ? 'on' : ''}" data-bw="${w.id}"><b>${esc(w.n)}</b><em>${w.y}</em><span>${esc(G.CLASS_NAMES[w.c])} · ${esc(w.cal)}</span></button>`).join('') || '<div class="wsempty">Nothing matches.</div>';
    $('#bl').querySelectorAll('[data-bw]').forEach(b => b.onclick = () => { BN.wp = b.dataset.bw; G.Audio.ui(); $('#bl').querySelectorAll('.witem').forEach(x => x.classList.toggle('on', x === b)); setup(G.WEAPON[BN.wp]); });
  };
  list();
  $('#bq').oninput = e => { BN.q = e.target.value; list(); };
  root.querySelectorAll('[data-bera]').forEach(b => b.onclick = () => { BN.era = b.dataset.bera; BN.q = ''; G.Audio.ui(); BN.render(root); });
  $('#back').onclick = () => UI.show('menu');
  $('#b-arm').onclick = () => { UI.sel.era = G.WEAPON[BN.wp].e; UI.sel.wp = BN.wp; UI.store.set('sel', UI.sel); UI.show('armory'); };
  $('#b-range').onclick = () => { UI.sel.era = G.WEAPON[BN.wp].e; UI.sel.wp = BN.wp; UI.store.set('sel', UI.sel); UI.startRange(); };
  $('#b-reset').onclick = () => setup(G.WEAPON[BN.wp]);
  $('#b-view').onclick = () => frame();
  const on = $('#bl .on'); if (on) on.scrollIntoView({ block: 'center' });
  setup(wp);
};

// ------------------------------------------------------------------ props: bench top, ammo box
function dropLooseMag() { if (B && B.rig && B.rig.mag && B.rig.mag.parent === SR.turn) SR.turn.remove(B.rig.mag); }
function props() {
  if (BN.g) SR.scene.remove(BN.g);
  const g = BN.g = new THREE.Group(); SR.scene.add(g);
  return g;
}
function clearProps() { dropLooseMag(); if (BN.g) { SR.scene.remove(BN.g); BN.g = null; } if (BN.flashL) BN.flashL.intensity = 0; B = null; const t = $('#btip'); if (t) t.style.display = 'none'; }
const show0 = UI.show;
UI.show = function (name) { if (name !== 'bench') clearProps(); return show0.call(UI, name); };
const pmat = (c, r = .8, m = 0) => G.mat ? G.mat({ color: c, roughness: r, metalness: m }) : new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
function invis(r) { const m = new THREE.Mesh(G.geo.gSph(r, 8), new THREE.MeshBasicMaterial({ visible: false })); m.userData.proxy = true; return m; }

// ------------------------------------------------------------------ set up a gun
function setup(wp) {
  dropLooseMag();
  SR.show(wp, UI.loadoutFor(wp));
  const rig = SR.rig, S = rig.S, root = rig.root;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(V3());
  const g = props();
  const ty = box.min.y - .012;
  // workbench top
  const big = !!wp.emplaced || size.x > 2.2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.4, size.x * 2.2), .04, Math.max(.8, size.x * .9)), pmat(big ? '#59613f' : '#5a4630', big ? .95 : .7));
  top.position.set(0, ty - .02, .12); top.receiveShadow = true; g.add(top);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.9, size.x * 1.3), .004, Math.max(.36, size.x * .45)), pmat(big ? '#4d553a' : '#1d2a22', .95));
  mat.position.set(0, ty + .002, .06); mat.receiveShadow = true; g.add(mat);
  // ammo box with the gun's cartridges
  const cal = G.CAL[wp.cal] || {}, shell = !!cal.shell;
  const ab = new THREE.Group(); ab.position.set(Math.max(.1, size.x * .32), ty + .004, Math.max(.1, size.x * .22)); g.add(ab);
  const bw = big ? Math.max(.4, Math.min(2.5, size.x * .08)) : Math.max(.055, size.x * .14);
  const can = new THREE.Mesh(new THREE.BoxGeometry(bw, bw * .55, bw * .6), pmat(shell ? '#7a2a20' : '#3e4a2c', .6, .3)); can.position.y = bw * .275; can.castShadow = true; ab.add(can);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.02, .006, bw * .62), pmat('#2c3420', .5, .4)); lid.position.set(0, bw * .55 + .03, -bw * .32); lid.rotation.x = -1.2; ab.add(lid);
  { const c0 = G.CAL[wp.cal] || { cs: [.03, .005] }, rl = c0.cs[0], fits = rl < bw * .5 && !c0.ball;
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { if (big && k) continue; const r = G.makeRound(wp.cal); if (fits) { r.rotation.x = -PI / 2; r.position.set((i - 2) * bw * .17, bw * .55 - .004, (k - 1) * bw * .17); } else { r.position.set((i - 2) * bw * .2, bw * .55 + c0.cs[1], (k - 1) * bw * .17); r.scale.setScalar(Math.min(1, bw * .9 / Math.max(rl, c0.cs[1] * 2))); } ab.add(r); } }
  const label = document.createElement('canvas'); label.width = 256; label.height = 64; const lx = label.getContext('2d'); lx.fillStyle = '#e8dcb0'; lx.fillRect(0, 0, 256, 64); lx.fillStyle = '#222'; lx.font = 'bold 26px monospace'; lx.textAlign = 'center'; lx.fillText(wp.cal.slice(0, 16), 128, 42);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(bw * .8, bw * .2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(label) })); lab.position.set(0, bw * .3, bw * .301); ab.add(lab);
  ab.userData.part = 'box';
  // muzzle flash + light
  const fl = BN.flash = new THREE.Group();
  const fm = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.12, .05), fm); p.rotation.z = i * PI / 3; p.rotation.y = PI / 2; fl.add(p); }
  const core = new THREE.Mesh(G.geo.gSph(.018, 10), fm); fl.add(core);
  fl.position.set(0, rig.muzzleY || 0, rig.muzzleZ - .04); fl.visible = false; root.add(fl);
  if (!BN.flashL) { BN.flashL = new THREE.PointLight(0xffa040, 0, 3, 2); SR.scene.add(BN.flashL); }
  // state
  const mt = rig.magType || (wp.m.mag || [])[0] || 'int';
  const rev = wp.m.t === 'rev' || !!rig.cyl;
  const feed = rev ? 'cyl' : /^belt/.test(mt) ? 'belt' : (rig.magFixed || ['int', 'enbloc', 'tube', 'tube2'].includes(mt) || !rig.mag) ? 'int' : 'box';
  const type = rig.boltType || 'none';
  const handle = type === 'bolt' ? rig.bolt : type === 'reciprocate' ? (rig.charge || rig.bolt) : type === 'slide' ? rig.slide : type === 'pump' ? (rig.pump || rig.bolt) : type === 'lever' ? (rig.lever || rig.bolt) : null;
  B = { wp, rig, S, root, feed, mt, type, handle, rev, ty, size, box,
    cap: Math.max(1, Math.round(S.mag)), rounds: 0, magIn: feed !== 'box', chamber: 0, open: 0, locked: false, coverOpen: false, safety: true, mode: 0,
    cyl: rev ? new Array(Math.max(1, Math.round(S.mag))).fill(0) : null, cylIdx: 0, cylOpen: false, cocked: false,
    drag: null, anim: null, tweens: [], cases: [], fireHeld: false, fireT: 0, burstLeft: 0, recoil: 0, flashT: 0, log: [], hover: null,
    rootPos: root.position.clone(), rootRot: root.rotation.clone(), ammo: ab, flash: fl, matTop: ty, hold: CYCLE[type] ? true : false, roundsBox: 0 };
  B.big = big;
  B.kind = rig.special === 'break' ? 'break' : rig.boltType === 'musket' ? 'musket' : rig.special === 'falling' ? 'falling' : rig.boltType === 'cannon' ? 'cannon' : rig.boltType === 'chamber' || rig.boltType === 'puckle' ? 'chamber' : rig.special === 'art' ? (rig.boltType === 'mortar' ? 'mortar' : 'breech') : rig.boltType === 'breech' ? 'breech' : rig.boltType === 'hwacha' ? 'hwacha' : rig.boltType === 'gatling' ? 'gatling' : wp.reloadKind === 'caprev' ? 'caprev' : 'std';
  B.props = [];
  if (wp.id === 'garand' || UI.loadoutFor(wp).mag === 'garand_ping') B.mt = 'enbloc';
  B.tube = B.mt === 'tube' || B.mt === 'tube2' || !!wp.tubeLoad;
  B.selfLoad = !['bolt', 'pump', 'lever'].includes(wp.act) && !(S.modes.length && S.modes.every(m => CYCLE[m]));
  B.lockback = B.selfLoad && feed === 'box' && (type === 'slide' || type === 'reciprocate') && G.ERA[wp.home || wp.e].ord >= 2;
  if (wp.act === 'auto_ob') B.lockback = false;
  B.stroke = type === 'bolt' ? (rig.boltStroke || .08) : type === 'reciprocate' ? (rig.charge ? .06 : Math.max(.03, rig.boltStroke || .05)) : type === 'slide' ? (rig.slideStroke || .02) : type === 'pump' ? .085 : type === 'lever' ? .9 : 0;
  // grab proxies on small parts so they are easy to hit
  if (type === 'bolt' && rig.bolt) { const p = invis(.022); p.position.set(rig.S ? (wp.m.R[2] * .5 + .05) : .05, 0, .018); rig.bolt.add(p); }
  if (rig.charge) { const p = invis(.02); p.position.set(0, 0, .012); rig.charge.add(p); }
  if (type === 'lever' && rig.lever) { const p = invis(.03); p.position.set(0, -.03, .05); rig.lever.add(p); }
  if (rig.trigger) { const p = invis(.018); p.position.set(0, -.012, 0); rig.trigger.add(p); }
  else { const p = invis(.025); p.position.set(0, rig.bot - .02, rig.zr - .06); root.add(p); B.trigProxy = p; }
  if (rig.mag && feed === 'box') { rig.mag.userData.part = 'mag'; // magazine starts out on the bench, empty
    const r = G.makeRound(wp.cal); r.rotation.y = 0; r.position.set(0, -.006, .0); r.visible = false; rig.mag.add(r); B.magRound = r; }
  // tag parts
  if (handle) handle.userData.part = 'handle';
  if (rig.bolt && rig.bolt !== handle && type === 'reciprocate') rig.bolt.userData.part = 'handle';
  if (rig.trigger) rig.trigger.userData.part = 'trigger'; if (B.trigProxy) B.trigProxy.userData.part = 'trigger';
  if (rig.cyl) rig.cyl.userData.part = 'cyl';
  if (rig.cover) rig.cover.userData.part = 'cover';
  if (rig.hammer) rig.hammer.userData.part = 'hammer';
  if (feed === 'box' && rig.mag) magToBench(true);
  frame();
  say(`${wp.n} on the bench — unloaded${B.kind === 'std' ? ', safety on' : ''}.`);
  if (B.kind !== 'std') B.safety = false;
  if (BN.onSetup) BN.onSetup(B, api);
  panel(); head();
}
function frame() { if (!B) return; SR.yaw = .32; SR.pitch = .42; SR.dist = SR.fit * UI.stageFit() * 1.08; SR.auto = false; }
function head() {
  const wp = B.wp; $('#be').textContent = `${G.ERA[wp.e].name} · ${G.CLASS_NAMES[wp.c]}`; $('#bnm').textContent = wp.n;
  $('#bsub').textContent = `${wp.cal} · ${({ bolt: 'bolt action', semi: 'semi-automatic', auto: 'selective fire', auto_ob: 'open bolt', pump: 'pump action', lever: 'lever action', rev: 'revolver' })[wp.act] || wp.act} · ${B.feed === 'box' ? 'detachable magazine' : B.feed === 'belt' ? 'belt fed' : B.feed === 'cyl' ? 'cylinder' : B.mt === 'tube' || B.mt === 'tube2' ? 'tube magazine' : B.mt === 'enbloc' ? 'en-bloc clip' : 'internal magazine'}`;
}
function say(t) { if (!B) return; B.log.unshift(t); B.log.length = Math.min(B.log.length, 7); }

// ------------------------------------------------------------------ magazine moves
function magDown() { const m = B.mt; const up = ['p90', 'top_long', 'top_curve', 'pan'].includes(m); const side = m === 'sidebox_l'; return side ? V3(-1, 0, 0) : up ? V3(0, 1, 0) : V3(0, -1, 0).applyEuler(B.rig.magHome.rot); }
function magToBench(instant) {
  const mag = B.rig.mag; SR.turn.attach ? SR.turn.attach(mag) : null;
  const p = V3(-Math.max(.08, B.size.x * .3), B.ty + .025, Math.max(.09, B.size.x * .2)), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .4, PI / 2));
  if (B.mt === 'pst') q.setFromEuler(new THREE.Euler(0, .4, PI / 2));
  if (/drum|pan|snail|beltdrum|cmag/.test(B.mt)) q.setFromEuler(new THREE.Euler(0, .4, 0));
  B.magIn = false;
  if (instant) { mag.position.copy(p); mag.quaternion.copy(q); } else tween(mag, p, q, .35);
}
function magToGun() {
  const mag = B.rig.mag; B.root.attach(mag);
  const home = B.rig.magHome, q = new THREE.Quaternion().setFromEuler(home.rot);
  const below = home.pos.clone().add(magDown().multiplyScalar(.07));
  tween(mag, below, q, .25, () => tween(mag, home.pos.clone(), q, .12, () => { B.magIn = true; A().mech('magin'); say(`Magazine seated (${B.rounds}/${B.cap}).`); if (B.locked && B.type === 'slide' && B.rounds > 0) say('Slide still locked back — drag it or press "Release".'); panel(); }));
}
function tween(o, p1, q1, dur, done) { B.tweens = B.tweens.filter(t => t.o !== o); B.tweens.push({ o, p0: o.position.clone(), p1, q0: o.quaternion.clone(), q1, t: 0, dur, done }); }

// ------------------------------------------------------------------ action positions
function setAction(p) { // p: 0 closed … 1 fully back
  const r = B.rig, t = B.type; B.open = p;
  if (t === 'bolt' && r.bolt) { const lift = Math.min(1, p / .25), back = Math.max(0, (p - .25) / .75); r.bolt.rotation.z = lift * 1.35; r.bolt.position.z = r.zr - .04 + back * B.stroke; }
  if (t === 'reciprocate') { if (r.bolt) r.bolt.position.z = p * (r.boltStroke || .05); if (r.charge) r.charge.position.z = r.zr + .005 + p * .06; }
  if (t === 'slide' && r.slide) { r.slide.position.z = p * (r.slideStroke || .02); if (r.toggleR) { const th = Math.acos(Math.max(0, 1 - r.slide.position.z / .064)); r.toggleR.rotation.x = th; r.toggleF.rotation.x = -2 * th; } }
  if (t === 'pump') { if (r.pump) r.pump.position.z = p * .085; if (r.bolt) r.bolt.position.z = p * .07; }
  if (t === 'lever') { if (r.lever) r.lever.rotation.x = p * .9; if (r.bolt) r.bolt.position.z = p * (r.boltStroke || .05); }
  if (r.hammer && p > .5) B.cocked = true;
  if (r.hammer) r.hammer.rotation.x = B.cocked ? -.6 : 0;
}
// mechanical events as the action moves
function actionOpened() { // reached the rear: extract whatever is in the chamber
  if (BN.mal && BN.mal.onOpened && BN.mal.onOpened(B)) { A().mech('boltback'); return; }
  if (B.chamber) { eject(B.chamber === 1); B.chamber = 0; }
  A().mech(B.type === 'bolt' ? 'boltback' : B.type === 'pump' ? 'pump' : B.type === 'lever' ? 'lever' : B.type === 'slide' ? 'slide' : 'boltback');
}
function feedOne() {
  if (B.chamber) return false;
  if (B.feed === 'box' && (!B.magIn || B.rounds <= 0)) return false;
  if (B.feed === 'belt' && (B.coverOpen || B.rounds <= 0)) return false;
  if (B.feed === 'int' && B.rounds <= 0) return false;
  B.rounds--; B.chamber = 1; return true;
}
function actionClosed() {
  const fed = feedOne();
  A().mech(B.type === 'bolt' ? 'boltfwd' : B.type === 'slide' ? 'slide' : 'boltfwd');
  say(fed ? 'Round chambered.' : 'Action closed on an empty chamber.');
  if (B.mt === 'enbloc' && B.rounds <= 0 && !B.chamber) {}
}
function canLockOpen() { return (B.lockback && B.feed === 'box' && B.magIn && B.rounds <= 0) || (B.feed === 'int' && B.selfLoad && B.rounds <= 0 && !B.tube && B.type !== 'none'); }
function drive(to, dur, done) { B.anim = { from: B.open, to, t: 0, dur, done }; }
function rack() { // full quick cycle by click
  if (BN.mal && BN.mal.onRack(B)) { panel(); return; }
  if (B.hold) { if (B.open > .5) { drive(0, .18, () => { actionClosed(); panel(); }); } else drive(1, .22, () => { actionOpened(); say('Action open.'); panel(); }); return; }
  if (B.locked) { release(); return; }
  drive(1, .14, () => { actionOpened(); if (canLockOpen()) { B.locked = true; say('Empty magazine — locked open.'); panel(); return; } drive(0, .1, () => { actionClosed(); panel(); }); });
}
function release() { if (!B.locked) return; B.locked = false; drive(0, .09, () => { actionClosed(); panel(); }); }

// ------------------------------------------------------------------ firing
function pullTrigger() {
  { const K = BN.kinds && BN.kinds[B.kind]; if (K && K.trigger) { if (B.rig.trigger) B.rig.trigger.rotation.x = .35; const r = K.trigger(B, api); panel(); return r; } }
  const S = B.S, mode = S.modes[B.mode] || 'semi';
  if (B.rig.trigger) { B.rig.trigger.rotation.x = .35; }
  if (B.safety) { A().mech('dry'); say('Safety is on.'); panel(); return false; }
  if (B.rev) {
    if (B.cylOpen) { say('Close the cylinder first.'); return false; }
    B.cylIdx = (B.cylIdx + 1) % B.cyl.length; B.rig.cyl.userData.tgt = B.cylIdx * 2 * PI / B.cyl.length;
    if (B.cyl[B.cylIdx] === 1) { if (BN.mal && BN.mal.preFire(B, true)) { panel(); return false; } B.cyl[B.cylIdx] = 2; shoot(); if (BN.onFire) BN.onFire(B); return true; }
    A().mech('dry'); say('Click — empty chamber.'); panel(); return false;
  }
  if (B.coverOpen) { say('Close the feed cover first.'); return false; }
  if (BN.mal && BN.mal.blockTrigger(B)) { panel(); return false; }
  if ((B.open > .05 && !(B.kick > 0)) || B.locked) { say('The action is open.'); return false; }
  if (B.chamber !== 1) { A().mech('dry'); B.cocked = false; say(B.chamber === 2 ? 'Click — spent case in the chamber. Work the action.' : 'Click — nothing in the chamber.'); panel(); return false; }
  if (BN.mal && BN.mal.preFire(B)) { panel(); return false; }
  B.chamber = 2; shoot(); if (BN.onFire) BN.onFire(B);
  if (B.selfLoad && !CYCLE[mode] && BN.mal && BN.mal.postFire(B)) { panel(); return true; }
  if (B.selfLoad && !CYCLE[mode]) { // the gun cycles itself
    eject(false); B.chamber = 0; B.cocked = true;
    if (!feedOne() && canLockOpen()) { B.locked = true; setAction(1); say('Last round — locked open.'); }
    else if (B.mt === 'enbloc' && !B.chamber && B.rounds <= 0) { B.locked = true; setAction(1); A().mech('ping'); say('Ping! The empty clip flies out — bolt locked open.'); }
    else B.kick = 1;
  } else { B.cocked = false; say('Fired — work the action for the next round.'); }
  panel();
  return true;
}
function shoot() {
  const S = B.S;
  A().shot({ cal: B.wp.cal, cls: B.wp.c, sup: S.sup, loud: S.loud * .7, player: true });
  if (!S.sup) { B.flash.visible = true; B.flash.rotation.x = Math.random() * PI; B.flash.scale.setScalar(.6 + Math.random() * .6 + (G.CAL[B.wp.cal] || { pen: 2 }).pen * .12); B.flashT = .05; const wp = B.flash.getWorldPosition(V3()); BN.flashL.position.copy(wp); BN.flashL.intensity = 6; }
  B.recoil = Math.min(1.5, B.recoil + .4 + S.rv * .25);
  B.shots = (B.shots || 0) + 1;
}
function eject(live) {
  if (B.wp.caseless && !live) return;
  const r = B.rig; if (!r.eject) return;
  const o = live ? G.makeRound(B.wp.cal) : G.makeCasing(B.wp.cal);
  const p = r.eject.getWorldPosition(V3());
  const d = (r.ejectDir || V3(1, .7, .35)).clone().transformDirection(B.root.matrixWorld);
  o.position.copy(p); BN.g.add(o);
  const v = d.multiplyScalar(1.3 + Math.random() * .6); v.y += .6;
  B.cases.push({ o, v, w: V3(Math.random() * 20, Math.random() * 20, Math.random() * 10), rest: false, shell: !!(G.CAL[B.wp.cal] || {}).shell, live });
  while (B.cases.length > 40) { const c = B.cases.shift(); BN.g.remove(c.o); }
  if (live) say('A live round flies out.');
}

// ------------------------------------------------------------------ loading from the ammo box
function loadFromBox(n) {
  { const K = BN.kinds && BN.kinds[B.kind]; if (K && K.box) { const r = K.box(B, api, n); panel(); return r; } }
  const S = B.S;
  let done = 0;
  for (let i = 0; i < n; i++) {
    if (B.feed === 'box') {
      if (B.magIn) { say('Take the magazine out first (drag it out of the gun).'); break; }
      if (B.rounds >= B.cap) { say('Magazine full.'); break; }
      B.rounds++; done++;
    } else if (B.feed === 'cyl') {
      if (!B.cylOpen) { say('Open the cylinder first (click it).'); break; }
      const k = B.cyl.indexOf(0); if (k < 0) { say(B.cyl.includes(2) ? 'Close and reopen the cylinder to dump the empties.' : 'Cylinder full.'); break; }
      B.cyl[k] = 1; done++;
    } else if (B.feed === 'belt') {
      if (!B.coverOpen && B.rig.cover) { say('Open the feed cover first (click it).'); break; }
      if (B.rounds >= B.cap) { say('Belt already laid in.'); break; }
      B.rounds = B.cap; done = B.cap; A().mech('belt'); say(`Belt of ${B.cap} laid on the feed tray — close the cover.`); break;
    } else { // internal magazine / tube / en-bloc
      const tube = B.mt === 'tube' || B.mt === 'tube2' || B.wp.tubeLoad;
      if (B.mt === 'enbloc') {
        if (B.open < .9 && !B.locked) { say('Lock the bolt open to load a clip.'); break; }
        if (B.rounds > 0 || B.chamber) { say('Fire the clip empty first.'); break; }
        B.rounds = B.cap - 1; B.chamber = 1; B.locked = false; drive(0, .08, () => { A().mech('boltfwd'); panel(); }); say(`En-bloc clip of ${B.cap} pressed in — the bolt slams home.`); done = B.cap; break;
      }
      if (!tube && B.open < .9 && !B.locked) { say('Open the action to load the internal magazine.'); break; }
      if (tube && (B.open > .9 || B.locked) && !B.chamber && B.type !== 'none') { B.chamber = 1; done++; say('Round dropped straight into the chamber.'); continue; }
      if (B.rounds >= B.cap) { say('Magazine full.'); break; }
      B.rounds++; done++;
    }
  }
  if (done) { flyRound(); A().mech(B.feed === 'int' && (B.mt === 'tube' || B.wp.tubeLoad) ? 'shell' : 'magin'); if (B.feed === 'box') say(`${B.rounds}/${B.cap} in the magazine.`); else if (B.feed === 'cyl') say(`${B.cyl.filter(x => x === 1).length}/${B.cyl.length} chambers loaded.`); else if (B.feed === 'int' && B.mt !== 'enbloc') say(`${B.rounds}/${B.cap} in the magazine.`); }
  panel();
  return done;
}
function flyRound() {
  const r = G.makeRound(B.wp.cal), from = B.ammo.getWorldPosition(V3()).add(V3(0, .06, 0));
  let to;
  if (B.feed === 'box' && !B.magIn) to = B.rig.mag.getWorldPosition(V3());
  else if (B.feed === 'cyl') to = B.rig.cyl.getWorldPosition(V3());
  else to = B.rig.eject ? B.rig.eject.getWorldPosition(V3()) : B.root.getWorldPosition(V3());
  r.position.copy(from); BN.g.add(r);
  B.flying = B.flying || []; B.flying.push({ o: r, from, to, t: 0 });
}

// ------------------------------------------------------------------ pointer handling
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hit(e) {
  const c = G.E.renderer.domElement, rc = c.getBoundingClientRect();
  ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
  ray.setFromCamera(ndc, SR.cam);
  const objs = [B.root, B.ammo, ...(B.props || [])]; if (!B.magIn && B.rig.mag && B.feed === 'box') objs.push(B.rig.mag);
  if (BN.extraPick) objs.push(...BN.extraPick());
  const hs = ray.intersectObjects(objs, true).filter(h => h.object.visible !== false && (!h.object.material || h.object.material.visible !== false || h.object.userData.proxy));
  for (const h of hs) { let o = h.object; while (o) { if (o.userData.part) return { part: o.userData.part, obj: o, point: h.point, mesh: h.object }; if (o === B.root) break; o = o.parent; } }
  return hs.length && hs[0].object ? { part: null, mesh: hs[0].object, point: hs[0].point } : null;
}
function screenOf(v) { const p = v.clone().project(SR.cam); const c = G.E.renderer.domElement.getBoundingClientRect(); return new THREE.Vector2((p.x + 1) / 2 * c.width, (1 - p.y) / 2 * c.height); }
function dragAxis(part) { // pixels per unit of travel
  const r = B.rig;
  let a, b;
  if (part === 'mag') { const h = r.magHome.pos; a = B.root.localToWorld(h.clone()); b = B.root.localToWorld(h.clone().add(magDown().multiplyScalar(.08))); }
  else if (B.type === 'lever') { a = B.root.localToWorld(V3(0, r.bot, 0)); b = B.root.localToWorld(V3(0, r.bot - .08, .02)); }
  else { const o = (B.handle || B.root).getWorldPosition(V3()); a = o; b = o.clone().add(V3(0, 0, Math.max(.04, B.type === 'bolt' ? (r.boltStroke || .08) * 1.6 : B.stroke)).transformDirection(B.root.matrixWorld).multiplyScalar(Math.max(.04, B.type === 'bolt' ? (r.boltStroke || .08) * 1.6 : B.type === 'slide' ? Math.max(.03, B.stroke) : B.type === 'pump' ? .085 : B.stroke))); }
  const v = screenOf(b).sub(screenOf(a));
  if (v.length() < 25) { if (part === 'mag') v.set(0, 60); else v.set(-60, 0); }
  return v;
}
const LABEL = { handle: () => ({ bolt: 'Bolt handle — drag to lift and pull back', reciprocate: B.locked ? 'Charging handle — click to release the bolt' : 'Charging handle — drag back and let go', slide: B.locked ? 'Slide — click to release' : 'Slide — drag back and let go', pump: 'Fore-end — drag back, then forward', lever: 'Lever — drag down, then back up' })[B.type] || 'Action',
  mag: () => B.magIn ? 'Magazine — drag it out' : 'Magazine — click to insert', trigger: () => B.safety ? 'Trigger (safety on)' : 'Trigger — click to fire, hold for auto', box: () => `Ammo box (${B.wp.cal}) — click to load a round, hold to keep loading`,
  cyl: () => B.cylOpen ? 'Cylinder — click to close' : 'Cylinder — click to swing out', cover: () => B.coverOpen ? 'Feed cover — click to close' : 'Feed cover — click to open', hammer: () => B.cocked ? 'Hammer (cocked) — click to lower' : 'Hammer — click to cock' };
function onDown(e) {
  if (UI.screen !== 'bench' || !B || e.target !== G.E.renderer.domElement || e.button !== 0) return;
  const h = hit(e);
  if (BN.downHook && BN.downHook(e, h, B)) { e.stopPropagation(); e.preventDefault(); return; }
  if (!h || !h.part) return;
  e.stopPropagation(); e.preventDefault(); G.Audio.init();
  const part = h.part;
  B.press = { part, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
  if (part === 'handle' && BN.mal && BN.mal.lockHandle && BN.mal.lockHandle(B)) { panel(); return; }
  if (part === 'handle' && !B.anim) { B.drag = { part, axis: dragAxis(part), p0: B.open, x: e.clientX, y: e.clientY, opened: B.open > .95, wasLocked: B.locked }; B.locked = false; }
  else if (part === 'mag' && B.magIn) B.drag = { part, axis: dragAxis('mag'), d: 0, x: e.clientX, y: e.clientY };
  else if (part === 'trigger') { B.fireHeld = true; B.fireT = 0; const md = B.S.modes[B.mode]; B.burstLeft = md === 'burst3' ? 3 : md === 'burst2' ? 2 : 0; if (pullTrigger() && B.burstLeft) B.burstLeft--; }
  else if (part === 'box') { B.boxHeld = true; B.boxT = .32; loadFromBox(e.shiftKey ? 5 : 1); }
}
function onMove(e) {
  if (UI.screen !== 'bench' || !B) return;
  if (BN.moveHook && BN.moveHook(e, B)) return;
  const tip = $('#btip');
  if (B.press) B.press.moved = Math.max(B.press.moved, Math.hypot(e.clientX - B.press.x, e.clientY - B.press.y));
  if (B.drag) {
    const D = B.drag, v = D.axis, len2 = v.lengthSq(), dx = e.clientX - D.x, dy = e.clientY - D.y, f = (dx * v.x + dy * v.y) / len2;
    if (D.part === 'handle') {
      const p = Math.max(0, Math.min(1, D.p0 + f));
      if (p > .95 && !D.opened) { D.opened = true; actionOpened(); }
      if (p < .05 && D.opened && B.hold) { D.opened = false; actionClosed(); panel(); }
      setAction(p);
    } else if (D.part === 'mag') {
      D.d = Math.max(0, Math.min(1.4, f)); const r = B.rig; r.mag.position.copy(r.magHome.pos).add(magDown().multiplyScalar(D.d * .08));
      if (D.d > 0 && B.magIn) { B.magIn = false; A().mech('magout'); }
    }
    if (tip) tip.style.display = 'none';
    return;
  }
  if (e.target !== G.E.renderer.domElement) { if (tip) tip.style.display = 'none'; return; }
  const h = hit(e); const c = G.E.renderer.domElement;
  if (h && h.part) { c.style.cursor = h.part === 'handle' || (h.part === 'mag' && B.magIn) ? 'grab' : 'pointer'; if (tip) { tip.textContent = LABEL[h.part] ? LABEL[h.part]() : ((BN.labelFor && BN.labelFor(h.part, B)) || h.part); tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 12) + 'px'; } }
  else { c.style.cursor = ''; if (tip) tip.style.display = 'none'; }
}
function onUp(e) {
  if (UI.screen !== 'bench' || !B) return;
  if (BN.upHook && BN.upHook(e, B)) return;
  const P = B.press; B.press = null; B.fireHeld = false; B.boxHeld = false;
  if (B.rig.trigger) B.rig.trigger.rotation.x = 0;
  const D = B.drag; B.drag = null;
  const click = P && P.moved < 5;
  if (D && D.part === 'handle') {
    if (click) { setAction(D.p0); if (D.wasLocked) { B.locked = true; release(); } else rack(); return; }
    if (B.hold) { // stays where it was left: snap open or closed
      if (B.open > .5) drive(1, .08, () => { if (!D.opened) actionOpened(); say('Action open.'); panel(); });
      else drive(0, .08, () => { if (D.opened) actionClosed(); panel(); });
    } else { // spring-loaded: flies home unless it locks
      if (D.opened && canLockOpen()) { B.locked = true; drive(1, .05); say('Empty magazine — locked open.'); }
      else if (D.opened) drive(0, .07, () => { actionClosed(); panel(); });
      else if (D.wasLocked && B.open > .9) { B.locked = true; drive(1, .05); }
      else drive(0, .07, () => { if (D.wasLocked) actionClosed(); panel(); });
    }
    panel(); return;
  }
  if (D && D.part === 'mag') {
    if (click || D.d > .45) { magToBench(false); A().mech('magout'); say(`Magazine out (${B.rounds}/${B.cap}).`); }
    else { const r = B.rig; tween(r.mag, r.magHome.pos.clone(), new THREE.Quaternion().setFromEuler(r.magHome.rot), .1, () => { B.magIn = true; A().mech('magin'); }); }
    panel(); return;
  }
  if (!P || !click) return;
  { const K = BN.kinds && BN.kinds[B.kind]; if (K && K.click && K.click(P.part, B, api)) { panel(); return; } }
  if (P.part === 'mag' && !B.magIn) { magToGun(); return; }
  if (P.part === 'cyl') { toggleCyl(); return; }
  if (P.part === 'cover') { B.coverOpen = !B.coverOpen; A().mech('cover'); say(B.coverOpen ? 'Feed cover open.' : 'Feed cover closed.'); panel(); return; }
  if (P.part === 'hammer') { if (B.rev || B.rig.hammer) { B.cocked = !B.cocked; A().mech(B.cocked ? 'boltup' : 'dry'); say(B.cocked ? 'Hammer cocked.' : 'Hammer lowered.'); setAction(B.open); panel(); } }
}
function toggleCyl() {
  B.cylOpen = !B.cylOpen; A().mech('cyl');
  if (B.cylOpen) { const n = B.cyl.filter(x => x === 2).length; for (let i = 0; i < B.cyl.length; i++) if (B.cyl[i] === 2) { B.cyl[i] = 0; ejectCyl(); } say(n ? `Cylinder out — ${n} empt${n > 1 ? 'ies' : 'y'} punched out.` : 'Cylinder swung out.'); }
  else say('Cylinder closed.');
  panel();
}
function ejectCyl() { const o = G.makeCasing(B.wp.cal); const p = B.rig.cyl.getWorldPosition(V3()); o.position.copy(p); BN.g.add(o); B.cases.push({ o, v: V3((Math.random() - .5) * .4, .3, (Math.random() - .5) * .4), w: V3(Math.random() * 8, 0, Math.random() * 8), rest: false }); }
window.addEventListener('pointerdown', onDown, true);
window.addEventListener('pointermove', onMove, true);
window.addEventListener('pointerup', onUp, true);
window.addEventListener('keydown', e => {
  if (UI.screen !== 'bench' || !B || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
  if (e.code === 'KeyF') toggleSafety(); if (e.code === 'KeyB') nextMode();
});
function toggleSafety() { B.safety = !B.safety; A().mech('mode'); say(B.safety ? 'Safety on.' : 'Safety off.'); panel(); }
function nextMode() { B.mode = (B.mode + 1) % B.S.modes.length; A().mech('mode'); say('Selector: ' + (MODE_N[B.S.modes[B.mode]] || B.S.modes[B.mode]) + '.'); panel(); }

// ------------------------------------------------------------------ per-frame
const r0 = SR.render;
SR.render = function (dt) { if (UI.screen === 'bench' && B) tick(dt); return r0.call(SR, dt); };
const track = (a, b, t) => a + (b - a) * t;
function tick(dt) {
  if (BN.tickHook) BN.tickHook(dt, B);
  // tweens (magazine moves)
  for (const t of B.tweens.slice()) { t.t += dt / t.dur; const k = Math.min(1, t.t), e = k * k * (3 - 2 * k); t.o.position.lerpVectors(t.p0, t.p1, e); t.o.quaternion.copy(t.q0).slerp(t.q1, e); if (k >= 1) { B.tweens.splice(B.tweens.indexOf(t), 1); if (t.done) t.done(); } }
  // driven action
  if (B.anim) { const a = B.anim; a.t += dt / a.dur; const k = Math.min(1, a.t); setAction(track(a.from, a.to, k)); if (k >= 1) { B.anim = null; if (a.done) a.done(); } }
  // self-loading kick: action cycles back and forth after each shot
  if (B.kick > 0 && !B.drag && !B.anim) { B.kick = Math.max(0, B.kick - dt * 14); setAction(B.locked ? 1 : Math.sin((1 - B.kick) * PI)); if (B.kick === 0 && !B.locked) setAction(0); }
  // auto / burst fire while the trigger is held
  const md = B.S.modes[B.mode];
  if (B.fireHeld && (md === 'auto' || B.burstLeft > 0)) {
    B.fireT += dt; const iv = 60 / Math.min(1200, (md !== 'auto' && B.wp.burstRpm) || B.S.rpm || 600);
    while (B.fireT >= iv) { B.fireT -= iv; if (!pullTrigger()) { B.fireHeld = false; break; } if (B.burstLeft > 0 && --B.burstLeft === 0) B.fireHeld = md === 'auto'; }
  }
  if (B.boxHeld) { B.boxT -= dt; if (B.boxT <= 0) { B.boxT = .14; if (!loadFromBox(1)) B.boxHeld = false; } }
  // recoil
  B.recoil = Math.max(0, B.recoil - dt * 6);
  const rk = B.recoil;
  B.root.position.copy(B.rootPos); B.root.position.x -= rk * .025; B.root.rotation.copy(B.rootRot); B.root.rotation.z += rk * .06;
  // flash
  if (B.flashT > 0) { B.flashT -= dt; if (B.flashT <= 0) { B.flash.visible = false; BN.flashL.intensity = 0; } }
  // revolver cylinder
  const cy = B.rig.cyl; if (cy) { const tx = B.cylOpen ? -.045 : 0; cy.position.x += (tx - cy.position.x) * Math.min(1, dt * 14); if (cy.userData.tgt !== undefined) cy.rotation.z += (cy.userData.tgt - cy.rotation.z) * Math.min(1, dt * 18); }
  if (B.rig.cover) { const tc = B.coverOpen ? -1.3 : 0; B.rig.cover.rotation.x += (tc - B.rig.cover.rotation.x) * Math.min(1, dt * 12); }
  if (B.magRound) B.magRound.visible = !B.magIn && B.rounds > 0;
  // flying rounds (box → magazine)
  if (B.flying) for (const f of B.flying.slice()) { f.t += dt / .22; const k = Math.min(1, f.t); f.o.position.lerpVectors(f.from, f.to, k); f.o.position.y += Math.sin(k * PI) * .06; if (k >= 1) { BN.g.remove(f.o); B.flying.splice(B.flying.indexOf(f), 1); } }
  // ejected cases
  const fy = B.ty + .006;
  for (const c of B.cases) {
    if (c.rest) continue;
    c.v.y -= 9.8 * dt; c.o.position.addScaledVector(c.v, dt);
    c.o.rotation.x += c.w.x * dt; c.o.rotation.y += c.w.y * dt; c.o.rotation.z += c.w.z * dt;
    if (c.o.position.y < fy) { c.o.position.y = fy; if (Math.abs(c.v.y) > .4) { G.Audio.casing(null, c.shell); c.v.y *= -.32; c.v.x *= .6; c.v.z *= .6; c.w.multiplyScalar(.5); } else { c.rest = true; c.o.rotation.x = PI / 2; c.o.rotation.z = 0; } }
  }
}

// ------------------------------------------------------------------ side panel
function nextStep() {
  { const K = BN.kinds && BN.kinds[B.kind]; if (K && K.next) return K.next(B); }
  const f = B.feed;
  if (B.chamber === 1 && B.open < .05 && !B.locked && (!B.rev)) return B.safety ? 'Loaded and ready. Take the safety off (F or the button), then click the trigger.' : 'Loaded. Click the trigger to fire — hold it in Auto.';
  if (B.rev) {
    const live = B.cyl.filter(x => x === 1).length;
    if (B.cylOpen) return live ? 'Load more from the ammo box, or click the cylinder to close it.' : 'Click the ammo box to drop rounds into the chambers.';
    if (!live) return B.cyl.includes(2) ? 'Out of rounds — click the cylinder to swing it out and dump the empties.' : 'Click the cylinder to swing it out.';
    return B.safety ? 'Take the safety off (F), then click the trigger — each pull turns the cylinder.' : 'Click the trigger — each pull turns the cylinder and fires.';
  }
  if (f === 'box') {
    if (!B.magIn && B.rounds === 0) return 'Click the ammo box to load rounds into the magazine on the bench (hold, or Shift-click for 5).';
    if (!B.magIn) return 'Click the magazine on the bench to insert it into the gun.';
    if (B.locked) return B.rounds > 0 ? 'Release the bolt: click the ' + (B.type === 'slide' ? 'slide' : 'charging handle') + ' (or the Release button).' : 'Empty and locked open. Drag the magazine out and reload it.';
    if (B.chamber === 2) return 'Spent case in the chamber — work the action.';
    if (B.rounds > 0) return `Chamber a round: drag the ${B.type === 'bolt' ? 'bolt handle up and back, then forward' : B.type === 'slide' ? 'slide back and let go' : B.type === 'pump' ? 'fore-end back and forward' : B.type === 'lever' ? 'lever down and back' : 'charging handle back and let go'}.`;
    return 'Magazine empty — drag it out and reload it from the ammo box.';
  }
  if (f === 'belt') {
    if (B.rounds <= 0) return B.rig.cover && !B.coverOpen ? 'Click the feed cover to open it.' : 'Click the ammo box to lay a belt in the feed tray.';
    if (B.coverOpen) return 'Click the feed cover to close it on the belt.';
    return 'Drag the charging handle back and let go to chamber the first round.';
  }
  if (B.mt === 'enbloc') return B.open > .9 || B.locked ? 'Click the ammo box to press in a full en-bloc clip.' : (B.chamber === 2 ? 'Work the bolt.' : 'Drag the bolt back to lock it open.');
  if (B.rounds <= 0 && !B.chamber) return (B.mt === 'tube' || B.mt === 'tube2' || B.wp.tubeLoad) ? 'Click the ammo box to feed rounds into the tube.' : B.open > .9 || B.locked ? 'Click the ammo box to load rounds (Shift-click: a 5-round stripper clip).' : 'Open the action, then click the ammo box to load.';
  if (B.chamber === 2) return 'Work the action to eject the spent case.';
  if (B.open > .5) return 'Close the action to chamber a round.';
  return 'Work the action to chamber a round.';
}
function panel() {
  if (!B || UI.screen !== 'bench') return;
  const el = $('#bp'); if (!el) return;
  if (BN.tab && BN.tab !== 'operate' && BN.panelHook) { BN.panelHook(el, B, api); return; }
  const md = B.S.modes[B.mode] || 'semi';
  const ch = B.rev ? `${B.cyl.filter(x => x === 1).length} live / ${B.cyl.filter(x => x === 2).length} spent of ${B.cyl.length}` : ['Empty', 'Live round', 'Spent case'][B.chamber];
  const feed = B.feed === 'box' ? (B.magIn ? `In the gun — ${B.rounds}/${B.cap}` : `On the bench — ${B.rounds}/${B.cap}`) : B.feed === 'belt' ? `${B.rounds}/${B.cap} on the belt${B.rig.cover ? (B.coverOpen ? ' · cover open' : ' · cover closed') : ''}` : B.feed === 'cyl' ? (B.cylOpen ? 'Cylinder open' : 'Cylinder closed') : `${B.rounds}/${B.cap} in the ${B.mt === 'tube' || B.mt === 'tube2' ? 'tube' : B.mt === 'enbloc' ? 'clip' : 'magazine'}`;
  const act = B.locked ? 'Locked open' : B.open > .9 ? 'Open' : B.open > .05 ? 'Part open' : 'Closed';
  const K = BN.kinds && BN.kinds[B.kind], rows = K && K.status ? K.status(B) : [['Chamber', ch], ['Feed', feed], ['Action', act]];
  el.innerHTML = (BN.tabsHTML ? BN.tabsHTML(B) : '') + (BN.opTop ? BN.opTop(B) : '') + `<div class="wsok" style="border-color:var(--brass);color:var(--brass2)"><b>Next:</b> ${esc(nextStep())}</div>
    <dl class="spec">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}${B.kind === 'std' ? `<div><dt>Safety</dt><dd>${B.safety ? 'ON' : 'off'}</dd></div><div><dt>Selector</dt><dd>${esc(MODE_N[md] || md)}</dd></div>` : ''}<div><dt>Shots fired</dt><dd>${B.shots || 0}</dd></div></dl>
    <div class="wsbtns"><button class="btn small ${B.safety ? 'primary' : ''}" id="bs-saf" ${B.kind !== 'std' ? 'hidden' : ''}>Safety ${B.safety ? 'ON' : 'off'} (F)</button>${B.S.modes.length > 1 ? `<button class="btn small" id="bs-mode">Selector: ${esc(MODE_N[md] || md)} (B)</button>` : ''}${B.locked ? '<button class="btn small primary" id="bs-rel">Release bolt</button>' : ''}${B.lockback && !B.locked && B.open < .05 ? '<button class="btn small" id="bs-lock" title="Pull back and lock the action open">Lock open</button>' : ''}${!B.handle && !B.rev && B.kind === 'std' ? '<button class="btn small" id="bs-cyc">Cycle action</button>' : ''}<button class="btn small" id="bs-fire">Fire</button><button class="btn small" id="bs-clear">Unload all</button></div>
    ${BN.opExtra ? BN.opExtra(B) : ''}<div class="lbl" style="padding:8px 16px 0">What happened</div><div style="padding:4px 16px 10px;font-size:13px;line-height:1.5">${B.log.map((l, i) => `<div style="opacity:${1 - i * .12}">${esc(l)}</div>`).join('')}</div>
    <div class="lbl" style="padding:8px 16px 0">How to handle it</div><ul style="margin:4px 0 16px;padding:0 16px 0 32px;font-size:13px;line-height:1.55;color:var(--muted)">
      ${B.feed === 'box' ? '<li><b>Magazine:</b> drag it out of the gun; click it on the bench to put it back.</li>' : ''}
      <li><b>Ammo box:</b> click to load one round, hold to keep going, Shift-click for five.</li>
      ${B.handle ? `<li><b>${({ bolt: 'Bolt', reciprocate: 'Charging handle', slide: 'Slide', pump: 'Fore-end', lever: 'Lever' })[B.type]}:</b> drag it ${B.type === 'lever' ? 'down' : 'back'}; a quick click works it in one go.</li>` : ''}
      ${B.rev ? '<li><b>Cylinder:</b> click to swing it out (empties fall out) or close it.</li>' : ''}${B.rig.cover ? '<li><b>Feed cover:</b> click to open or close.</li>' : ''}${B.rig.hammer ? '<li><b>Hammer:</b> click to cock or lower it.</li>' : ''}
      <li><b>Trigger:</b> click to fire, hold for full auto.</li><li>Drag empty space to turn the gun · wheel to zoom.</li></ul>`;
  const q = s => el.querySelector(s);
  if (BN.tabsBind) BN.tabsBind(el, B);
  if (K && K.howto) { const ul = el.querySelector('ul'); if (ul) ul.innerHTML = K.howto(B).map(t => `<li>${t}</li>`).join(''); }
  q('#bs-saf').onclick = toggleSafety;
  if (BN.opBind) BN.opBind(el, B);
  if (q('#bs-mode')) q('#bs-mode').onclick = nextMode;
  if (q('#bs-rel')) q('#bs-rel').onclick = release;
  if (q('#bs-cyc')) q('#bs-cyc').onclick = rack;
  if (q('#bs-lock')) q('#bs-lock').onclick = () => drive(1, .14, () => { actionOpened(); B.locked = true; say('Action locked open.'); panel(); });
  q('#bs-fire').onclick = () => { pullTrigger(); setTimeout(() => { if (B && B.rig.trigger) B.rig.trigger.rotation.x = 0; }, 120); };
  q('#bs-clear').onclick = () => { if (B.chamber) { eject(B.chamber === 1); B.chamber = 0; } if (B.feed === 'box' && B.magIn) magToBench(false); B.rounds = 0; if (B.cyl) B.cyl.fill(0); B.locked = false; drive(0, .1); say('Gun cleared and unloaded.'); panel(); };
}
const api = { say, panel: () => panel(), shoot: () => shoot(), eject: l => eject(l), flyRound: () => flyRound(), tween, setAction: p => setAction(p), drive: (to, d, f) => drive(to, d, f), A, V3, PI, invis, pmat, SR, head: () => head() };
BN.api = api;
BN._state = () => B; // for tests
BN._tick = dt => { if (B) tick(dt); };
BN._api = { setup, loadFromBox, pullTrigger, rack, release, magToGun, magToBench, toggleCyl, toggleSafety, nextMode, setAction, actionOpened, actionClosed, eject, feedOne, shoot, canLockOpen, drive, say, panel: () => panel() };
})();
