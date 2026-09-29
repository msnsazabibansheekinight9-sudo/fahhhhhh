// ============================================================================
// Player: movement (walk/sprint/crouch/prone/lean/jump/fly), weapon handling
// (fire modes, recoil, sway, zeroing, bipods, reloads), and the first-person
// viewmodel with IK arms and procedural keyframed animations.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const { gBox, gCylY, gRBox, gSph } = G.geo;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = t => t * t * (3 - 2 * t);
// keyframe track: keys [[t, v], ...] -> smooth value at t
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; const u = ss((t - a[0]) / (b[0] - a[0] || 1)); return lerp(a[1], b[1], u); }
  return keys[keys.length - 1][1];
}
// pose track: keys [[t, {px,py,pz,rx,ry,rz}]]
function poseAt(keys, t, out) {
  for (const k of ['px', 'py', 'pz', 'rx', 'ry', 'rz']) out[k] = track(keys.map(q => [q[0], q[1][k] || 0]), t);
  return out;
}
const HIPSPREAD = { PST: 2.0, SMG: 2.6, CAR: 3.2, AR: 3.5, BR: 4.2, RIF: 4.5, DMR: 4.8, LMG: 5.2, SR: 7, SG: 3.2 };
const ZERO = { PST: 25, SMG: 50, SG: 25, CAR: 100, AR: 100, BR: 200, RIF: 200, DMR: 200, LMG: 200, SR: 100 };
const ZONE_MUL = { head: 2.4, chest: 1, stomach: .9, arm: .6, leg: .65 };
G.ZONE_MUL = ZONE_MUL;

class Player {
  constructor() {
    this.pos = V3(0, 0, 0); this.vel = V3(); this.yaw = 0; this.pitch = 0; this.team = 0; this.name = 'You';
    this.hp = 100; this.alive = true; this.stance = 0; this.stanceH = 1.62; this.lean = 0; this.onGround = true; this.fly = false;
    this.weapons = []; this.cur = 0; this.ads = 0; this.adsHeld = false; this.action = null; this.fireHeld = false; this.lastShot = 0; this.burst = 0;
    this.kick = { z: 0, rx: 0, ry: 0, rz: 0, vz: 0, vrx: 0 }; this.swayL = { x: 0, y: 0 }; this.aimOff = { x: 0, y: 0 }; this.breath = 1; this.holding = false;
    this.bob = 0; this.heat = 0; this.stepT = 0; this.lastHurt = 0; this.kills = 0; this.deaths = 0; this.score = 0; this.recoilBank = 0; this.shake = 0;
    this.lightOn = false; this.bipod = false; this.inspecting = false; this.suppress = 0;
    this.vm = this.buildVM();
  }
  get eye() { return V3(this.pos.x, this.pos.y + this.stanceH, this.pos.z); }
  get W() { return this.weapons[this.cur]; }
  // ---------------------------------------------------------------- viewmodel
  buildVM() {
    const vm = { pivot: new THREE.Group(), offset: new THREE.Group(), holder: new THREE.Group() };
    vm.pivot.add(vm.offset); vm.offset.add(vm.holder); G.E.vmScene.add(vm.pivot);
    vm.flash = G.FX.makeVMFlash(); vm.holder.add(vm.flash);
    vm.arms = this.buildArms('ww2');
    return vm;
  }
  buildArms(era) {
    if (this.vm && this.vm.arms) for (const a of this.vm.arms) { G.E.vmScene.remove(a.upper); G.E.vmScene.remove(a.fore); G.E.vmScene.remove(a.hand); G.E.vmScene.remove(a.cuff); }
    const sleeveCol = { ww1: '#6e6040', ww2: '#5f5a3e', cold: '#4b5638', mod: '#b09f7c', now: '#7d7658' }[era];
    const gloves = era === 'mod' || era === 'now';
    const sleeve = G.mat({ color: sleeveCol, roughness: 1 });
    if (era === 'now') { sleeve.map = G.texCamo('multicam'); sleeve.color.set('#ffffff'); }
    if (era === 'mod') { sleeve.map = G.texCamo('desert'); sleeve.color.set('#ffffff'); }
    const skin = G.mat({ color: gloves ? '#2c2a27' : '#c4937a', roughness: gloves ? .9 : .55 });
    const knuckle = G.mat({ color: gloves ? '#1d1c1a' : '#b98670', roughness: .7 });
    const cuffM = G.mat({ color: gloves ? '#2c2a27' : '#3a3528', roughness: 1 });
    const arms = [];
    for (const side of [1, -1]) {
      const upper = new THREE.Mesh(gCylY(.055, .047, 1, 14), sleeve), fore = new THREE.Mesh(gCylY(.047, .036, 1, 14), sleeve);
      const cuff = new THREE.Mesh(gCylY(.037, .034, 1, 12), cuffM);
      const hand = this.buildHand(side, skin, knuckle);
      for (const m of [upper, fore, cuff]) m.frustumCulled = false;
      G.E.vmScene.add(upper); G.E.vmScene.add(fore); G.E.vmScene.add(hand); G.E.vmScene.add(cuff);
      arms.push({ side, upper, fore, hand, cuff, sh: side > 0 ? V3(.17, -.3, .06) : V3(-.19, -.31, .0) });
    }
    return arms;
  }
  // Articulated hand in gun space: the right hand wraps the pistol grip with the index finger on the
  // trigger; the left hand cups the handguard from below with fingers curled up the far side.
  buildHand(side, skin, knuckle) {
    const h = new THREE.Group();
    const seg = (L, w = .0165) => { const m = new THREE.Mesh(gRBox(w, w * .92, L, w * .45), skin); m.frustumCulled = false; return m; };
    const bone = (from, to, w, parent = h) => { const m = seg(from.distanceTo(to), w); m.position.copy(from).add(to).multiplyScalar(.5); m.lookAt(to.x, to.y, to.z); parent.add(m); return m; };
    const joint = (p, r = .009, parent = h) => { const m = new THREE.Mesh(gSph(r, 8), knuckle); m.position.copy(p); m.frustumCulled = false; parent.add(m); };
    h.userData.fingers = [];
    if (side > 0) {
      const palm = new THREE.Mesh(gRBox(.022, .08, .085, .011), skin); palm.position.set(.026, -.008, .018); palm.rotation.x = -.3; h.add(palm);
      const heel = new THREE.Mesh(gRBox(.03, .04, .05, .012), skin); heel.position.set(.02, -.03, .045); h.add(heel);
      // middle, ring, little fingers wrap around the front of the grip
      for (let i = 0; i < 3; i++) {
        const y = .004 - i * .022, rz = -.024 + i * .007;
        const a = V3(.024, y, rz), b2 = V3(-.008, y - .002, rz - .012), c = V3(-.024, y - .004, rz + .012);
        bone(a, b2, .017 - i * .001); joint(b2); bone(b2, c, .016 - i * .001);
      }
      // index finger to the trigger (moves when firing)
      const ix = new THREE.Group(); h.add(ix); h.userData.index = ix;
      const i0 = V3(.02, .03, -.02), i1 = V3(.006, .036, -.052), i2 = V3(-.002, .03, -.07);
      bone(i0, i1, .016, ix); joint(i1, .0085, ix); bone(i1, i2, .015, ix);
      ix.userData.pivot = i0;
      // thumb over the top, on the far side of the grip
      const t0 = V3(.024, .026, .03), t1 = V3(.004, .045, .004), t2 = V3(-.018, .042, -.018);
      bone(t0, t1, .019); joint(t1); bone(t1, t2, .017);
    } else {
      const palm = new THREE.Mesh(gRBox(.02, .085, .08, .011), skin); palm.position.set(-.024, -.03, 0); palm.rotation.z = -.9; h.add(palm);
      for (let i = 0; i < 4; i++) {
        const z = -.03 + i * .02, L = i === 3 ? .8 : 1;
        const a = V3(-.012, -.045, z), b2 = V3(.018 * L, -.036, z - .002), c = V3(.03 * L, -.012, z - .004), d = V3(.028 * L, .008, z - .004);
        bone(a, b2, .017); joint(b2); bone(b2, c, .016); joint(c, .008); bone(c, d, .015);
      }
      const t0 = V3(-.034, -.022, .03), t1 = V3(-.032, -.004, -.004), t2 = V3(-.026, .006, -.036);
      bone(t0, t1, .019); joint(t1); bone(t1, t2, .017);
    }
    return h;
  }
  setupWeapons(list) { // list: [{wp, L}]
    for (const w of this.weapons) if (w.rig) this.vm.holder.remove(w.rig.root);
    this.weapons = list.map(({ wp, L }) => this.makeWeapon(wp, L));
    const era = list[0] ? list[0].wp.e : 'ww2';
    this.vm.arms = this.buildArms(era);
    this.cur = 0; this.equip(0, true);
  }
  makeWeapon(wp, L) {
    const S = G.resolveStats(wp, L);
    const rig = G.buildGun(wp, L);
    rig.root.visible = false; this.vm.holder.add(rig.root);
    rig.root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    const zero = ZERO[wp.c] || 100;
    const w = { wp, L, S, rig, mag: S.mag, reserve: S.mag * (wp.c === 'PST' ? 4 : wp.c === 'LMG' ? 3 : 6), mode: 0, zero, zeroAng: 0, chambered: true, heat: 0, glAmmo: S.gl ? 6 : 0, boltOpen: false, cycleNeeded: false };
    if (wp.c === 'SG') w.reserve = S.mag * 5;
    this.computeZero(w);
    return w;
  }
  computeZero(w) { w.zeroAng = G.Ballistics.zeroAngle(w.wp.gyro ? w.wp.gyro.v * .85 : w.S.v, w.S.k, Math.max(.02, w.rig.sightH), w.zero); }
  equip(i, instant) {
    if (!this.weapons[i]) return;
    // lower the current weapon first, then bring the new one up
    if (!instant && this.W && this.W.rig.root.visible && i !== this.cur) { this.finishAction(true); this.startAction('holster', { next: i }); return; }
    const prev = this.W;
    this.cur = i;
    for (const w of this.weapons) w.rig.root.visible = false;
    this.W.rig.root.visible = true;
    // move the flash to the new muzzle
    this.vm.flash.position.set(this.W.rig.sightX ? 0 : 0, this.W.rig.muzzleY || 0, this.W.rig.muzzleZ - .02);
    this.ads = 0; this.bipod = false;
    if (!instant) { this.startAction('equip'); G.Audio.mech('equip'); } else this.action = null;
    this.hudDirty = true;
  }
  // ---------------------------------------------------------------- actions
  startAction(name, o = {}) {
    const w = this.W, S = w.S, wp = w.wp;
    let dur = .5, fn = null, ev = [], end = null, cancel = false, keepAds = false;
    const rig = w.rig;
    const empty = w.mag === 0;
    switch (name) {
      case 'holster': dur = wp.c === 'PST' ? .22 : .3; fn = t => { const e = ss(t); this.anim = { px: .04 * e, py: -.28 * e, pz: .05 * e, rx: -.7 * e, ry: .2 * e, rz: .5 * e }; };
        end = () => { this.anim = null; this.equip(o.next, 'draw'); this.startAction('equip'); G.Audio.mech('equip'); }; break;
      case 'equip': {
        const heavy = wp.heavy || wp.c === 'LMG';
        dur = wp.c === 'PST' ? .4 : heavy ? .85 : .6;
        if (wp.c === 'PST') fn = t => { const e = 1 - ss(t), flip = track([[0, 1], [.55, -.15], [.8, .04], [1, 0]], t); this.anim = { px: .02 * e, py: -.2 * e, pz: .04 * e, rx: -1.3 * flip, ry: .3 * e, rz: -.4 * e }; };
        else fn = t => { const e = 1 - ss(Math.min(1, t * 1.25)), settle = track([[.7, 0], [.82, 1], [1, 0]], t); this.anim = { px: .08 * e, py: -.3 * e - settle * .01 * (heavy ? 2 : 1), pz: .06 * e, rx: -.6 * e + settle * .03, ry: .5 * e, rz: .7 * e }; };
        ev = [[.75, () => G.Audio.mech('mode')]];
        break; }
      case 'cycle': { // bolt, pump or lever cycle after a shot
        const type = rig.boltType; dur = wp.cyc || .7; keepAds = true;
        if (type === 'bolt') {
          const b = rig.bolt, st = rig.boltStroke || .08;
          fn = t => {
            const up = track([[0, 0], [.18, 1], [.8, 1], [.95, 0]], t), back = track([[0, 0], [.2, 0], [.42, 1], [.62, 1], [.82, 0]], t);
            if (b) { b.rotation.z = up * 1.35; b.position.z = rig.zr - .04 + back * st; }
            this.anim = { px: -.01 * up, py: .005 * up, pz: .01 * back, rx: .03 * up, ry: 0, rz: .14 * up };
            this.lhOverride = { w: track([[0, 0], [.12, 1], [.88, 1], [1, 0]], t), p: V3(RWx(rig) + .05, .0, rig.zr - .03 + back * st), rot: -1 };
          };
          ev = [[.15, () => G.Audio.mech('boltup')], [.4, () => { G.Audio.mech('boltback'); this.ejectCasing(); }], [.8, () => G.Audio.mech('boltfwd')]];
        } else if (type === 'pump') {
          fn = t => { const back = track([[0, 0], [.35, 1], [.55, 1], [.85, 0]], t); if (rig.pump) rig.pump.position.z = back * .085; if (rig.bolt) rig.bolt.position.z = back * .07; this.anim = { px: 0, py: 0, pz: .012 * back, rx: .025 * back, ry: 0, rz: .02 * back }; };
          ev = [[.05, () => G.Audio.mech('pump')], [.35, () => this.ejectCasing()]];
        } else if (type === 'lever') {
          fn = t => { const d = track([[0, 0], [.35, 1], [.5, 1], [.85, 0]], t); if (rig.lever) rig.lever.rotation.x = d * .9; if (rig.bolt) rig.bolt.position.z = d * rig.boltStroke; this.anim = { px: 0, py: -.01 * d, pz: .01 * d, rx: -.05 * d, ry: 0, rz: 0 }; };
          ev = [[.05, () => G.Audio.mech('lever')], [.35, () => this.ejectCasing()]];
        }
        end = () => { w.cycleNeeded = false; };
        break; }
      case 'reload': { const R = this.reloadAnim(w, empty); dur = R.dur; fn = R.fn; ev = R.ev; end = R.end; cancel = R.cancel; break; }
      case 'inspect': {
        cancel = true;
        const type = rig.boltType;
        if (type === 'bolt') { // open the bolt partway and check the chamber
          dur = 2.8; const b = rig.bolt, st = rig.boltStroke || .08;
          fn = t => { const lift = track([[.15, 0], [.3, 1], [.7, 1], [.85, 0]], t), back = track([[.3, 0], [.42, .45], [.6, .45], [.72, 0]], t), look = track([[0, 0], [.2, 1], [.8, 1], [1, 0]], t);
            if (b) { b.rotation.z = lift * 1.35; b.position.z = rig.zr - .04 + back * st; }
            this.anim = { px: -.06 * look, py: .04 * look, pz: .05 * look, rx: .1 * look, ry: .45 * look, rz: .55 * look };
            this.lhOverride = { w: track([[.2, 0], [.3, 1], [.75, 1], [.85, 0]], t), p: V3(RWx(rig) + .05, 0, rig.zr - .03 + back * st), rot: -1 }; };
          ev = [[.3, () => G.Audio.mech('boltup')], [.42, () => G.Audio.mech('boltback')], [.72, () => G.Audio.mech('boltfwd')]];
        } else if (type === 'slide') { // press check: ease the slide back and look into the ejection port
          dur = 2.4;
          fn = t => { const look = track([[0, 0], [.2, 1], [.8, 1], [1, 0]], t), press = track([[.3, 0], [.4, 1], [.65, 1], [.72, 0]], t);
            if (rig.slide) rig.slide.position.z = press * (rig.slideStroke || .02) * .45;
            this.anim = { px: -.05 * look, py: .05 * look, pz: .06 * look, rx: .15 * look, ry: -.6 * look, rz: .7 * look }; };
          ev = [[.4, () => G.Audio.mech('slide')]];
        } else if (type === 'rev') { // swing the cylinder out, spin it, close it
          dur = 2.6;
          fn = t => { const o2 = track([[.2, 0], [.3, 1], [.75, 1], [.85, 0]], t), look = track([[0, 0], [.15, 1], [.85, 1], [1, 0]], t);
            if (rig.cyl) { rig.cyl.position.x = -.04 * o2; rig.cyl.rotation.z += o2 > .9 && t > .35 && t < .65 ? .5 : 0; }
            this.anim = { px: -.05 * look, py: .05 * look, pz: .05 * look, rx: .4 * look, ry: .3 * look, rz: .8 * o2 }; };
          ev = [[.3, () => G.Audio.mech('cyl')], [.8, () => G.Audio.mech('cyl')]];
        } else if (type === 'pump') { // short-stroke the pump to check a shell is chambered
          dur = 2.4;
          fn = t => { const look = track([[0, 0], [.2, 1], [.8, 1], [1, 0]], t), pb = track([[.35, 0], [.45, .35], [.6, .35], [.68, 0]], t);
            if (rig.pump) rig.pump.position.z = pb * .085; if (rig.bolt) rig.bolt.position.z = pb * .07;
            this.anim = { px: -.06 * look, py: .04 * look, pz: .05 * look, rx: .1 * look, ry: .5 * look, rz: .5 * look }; };
          ev = [[.45, () => G.Audio.mech('shell')], [.66, () => G.Audio.mech('boltfwd')]];
        } else { // look over both sides, check the magazine, then the chamber
          dur = 3.6;
          fn = t => {
            const a = track([[0, 0], [.14, 1], [.3, 1], [.38, 0]], t), b2 = track([[.3, 0], [.4, 1], [.62, 1], [.7, 0]], t), c = track([[.66, 0], [.74, 1], [.92, 1], [1, 0]], t);
            this.anim = { px: -.08 * a - .03 * b2 - .03 * c, py: .03 * a + .05 * b2 + .03 * c, pz: .06 * a + .04 * b2, rx: .15 * a + .35 * b2 + .2 * c, ry: .9 * a - .2 * b2 + .5 * c, rz: -.5 * a + .5 * b2 + .6 * c };
            const drop = track([[.42, 0], [.47, 1], [.57, 1], [.62, 0]], t);
            if (rig.mag && !rig.magFixed) { rig.mag.position.copy(rig.magHome.pos).y -= drop * .04; }
            this.lhOverride = { w: track([[.38, 0], [.44, 1], [.62, 1], [.68, 0]], t), p: rig.magHome ? rig.magHome.pos.clone().add(V3(0, -.06 - drop * .04, 0)) : rig.hgPos, rot: 0 };
            const ch = track([[.76, 0], [.8, .5], [.88, .5], [.92, 0]], t);
            if (rig.bolt && type === 'reciprocate') rig.bolt.position.z = ch * (rig.boltStroke || .05);
            if (rig.charge) rig.charge.position.z = rig.zr + .005 + ch * .03;
          };
          ev = [[.47, () => G.Audio.mech('magout')], [.6, () => G.Audio.mech('magin')], [.8, () => G.Audio.mech('boltback')], [.92, () => G.Audio.mech('boltfwd')]];
        }
        break; }
      case 'melee': dur = .55; cancel = false; fn = t => { const s = track([[0, 0], [.25, 1], [.45, 1], [1, 0]], t); this.anim = { px: -.05 * s, py: .02 * s, pz: -.25 * s, rx: -.15 * s, ry: .5 * s, rz: -.3 * s }; }; ev = [[.25, () => this.meleeHit()]]; G.Audio.mech('melee'); break;
      case 'mode': dur = .3; keepAds = true; fn = t => { const s = track([[0, 0], [.4, 1], [1, 0]], t); this.anim = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: .12 * s }; }; ev = [[.3, () => G.Audio.mech('mode')]]; break;
      case 'gl': dur = 1.6; keepAds = true; fn = t => { const s = track([[0, 0], [.05, 1], [.3, 0], [.4, 0], [.6, 1], [.8, 1], [1, 0]], t); this.anim = { px: 0, py: -.03 * s, pz: .03 * s, rx: .2 * s, ry: 0, rz: .1 * s }; }; ev = [[.02, () => this.fireGL()], [.6, () => G.Audio.mech('magout')], [.85, () => G.Audio.mech('magin')]]; break;
    }
    this.action = { name, t: 0, dur, fn, ev: ev.slice(), end, cancel, keepAds };
  }
  // reload animation families
  reloadAnim(w, empty) {
    const rig = w.rig, wp = w.wp, S = w.S, mt = rig.magType;
    const need = S.mag - w.mag;
    const mag = rig.mag, home = rig.magHome;
    const fillAll = () => { const n = Math.min(need + (empty || wp.c === 'SG' ? 0 : 0), w.reserve); w.mag += n; w.reserve -= n; this.hudDirty = true; };
    const drop = () => this.dropMag();
    let dur = empty ? S.rl[1] : S.rl[0];
    const tilt = { px: -.02, py: .01, pz: .02, rx: .12, ry: .15, rz: .45 };
    const R = { dur, ev: [], cancel: false, end: null };
    // --- per-round loading: shotguns, Lebel, M1897
    if (wp.tubeLoad && (mt === 'tube' || mt === 'tube2' || mt === 'int' || mt === 'enbloc')) {
      const per = S.rl[0] * (wp.c === 'SG' ? 1 : .9);
      const n = Math.min(need, w.reserve);
      if (n <= 0) return { dur: .1, fn: () => {}, ev: [], end: null };
      const extra = empty ? .7 : 0;
      R.dur = .35 + n * per + extra + .3; R.cancel = true;
      R.fn = t => {
        const T = t * R.dur; const phase = T < .35 ? T / .35 : T > R.dur - .3 ? (R.dur - T) / .3 : 1;
        const inCycle = T > .35 + extra && T < R.dur - .3 ? ((T - .35 - extra) % per) / per : 0;
        this.anim = { px: -.02 * phase, py: .01 * phase, pz: .02 * phase, rx: .1 * phase, ry: -.2 * phase, rz: -.35 * phase };
        const push = track([[0, 0], [.35, 1], [.6, .2], [1, 0]], inCycle);
        this.lhOverride = { w: phase, p: V3(.01, rig.bot - .05 + push * .03, -.02 - push * .03), rot: 0, shell: push > .05 && push < .95 };
      };
      if (empty) R.ev.push([.35 / R.dur, () => G.Audio.mech('shell')], [(.35 + .5) / R.dur, () => { if (w.reserve > 0) { w.mag++; w.reserve--; this.hudDirty = true; } G.Audio.mech(rig.boltType === 'pump' ? 'pump' : 'boltfwd'); }]);
      const left = Math.min(need - (empty ? 1 : 0), w.reserve - (empty ? 1 : 0));
      for (let i = 0; i < left; i++) R.ev.push([(.35 + extra + (i + .55) * per) / R.dur, () => { if (w.reserve > 0 && w.mag < S.mag) { w.mag++; w.reserve--; this.hudDirty = true; G.Audio.mech('shell'); } }]);
      R.dur = .35 + extra + left * per + .3;
      if (rig.boltType === 'bolt') { // open & close bolt around loading
        const b = rig.bolt, st = rig.boltStroke;
        const f0 = R.fn; R.fn = t => { f0(t); const T = t * R.dur; const o = T < .3 ? T / .3 : T > R.dur - .25 ? (R.dur - T) / .25 : 1; if (b) { b.rotation.z = Math.min(1, o * 2) * 1.35; b.position.z = rig.zr - .04 + Math.max(0, o * 2 - 1) * st; } };
        R.ev.push([.05, () => G.Audio.mech('boltback')], [.95, () => G.Audio.mech('boltfwd')]);
      }
      return R;
    }
    // --- stripper clips for bolt actions (internal / fixed box)
    if (rig.boltType === 'bolt' && (mt === 'int' || mt === 'box' || rig.magFixed)) {
      const clips = Math.max(1, Math.ceil(need / 5)); const b = rig.bolt, st = rig.boltStroke;
      R.dur = .5 + clips * (dur * .45) + .5;
      R.fn = t => {
        const T = t * R.dur; const open = T < .45 ? T / .45 : T > R.dur - .45 ? (R.dur - T) / .45 : 1;
        if (b) { b.rotation.z = clamp(open * 2, 0, 1) * 1.35; b.position.z = rig.zr - .04 + clamp(open * 2 - 1, 0, 1) * st; }
        const c = T > .5 && T < R.dur - .5 ? ((T - .5) % (dur * .45)) / (dur * .45) : 0;
        const push = track([[0, 0], [.3, 0], [.7, 1], [1, 1]], c);
        this.anim = { px: -.03 * open, py: .02 * open, pz: .02 * open, rx: .15 * open, ry: .1 * open, rz: .25 * open };
        this.lhOverride = { w: open, p: V3(0, .06 - push * .05 + (c > 0 ? 0 : .05), rig.zr - .06), rot: 1, clip: c > 0 && c < .95 };
      };
      R.ev.push([.1, () => G.Audio.mech('boltup')], [.3 / R.dur * 1.4, () => G.Audio.mech('boltback')]);
      for (let i = 0; i < clips; i++) R.ev.push([(.5 + (i + .7) * dur * .45) / R.dur, () => { const n = Math.min(5, S.mag - w.mag, w.reserve); w.mag += n; w.reserve -= n; this.hudDirty = true; G.Audio.mech('magin'); }]);
      R.ev.push([(R.dur - .3) / R.dur, () => G.Audio.mech('boltfwd')]);
      R.end = () => { w.cycleNeeded = false; };
      return R;
    }
    // --- Garand en-bloc
    if (wp.enbloc) {
      const b = rig.bolt;
      R.dur = empty ? 2.1 : 2.8;
      R.fn = t => {
        const p = track([[0, 0], [.15, 1], [.85, 1], [1, 0]], t);
        this.anim = { px: -.02 * p, py: .01 * p, pz: .03 * p, rx: .1 * p, ry: .15 * p, rz: .3 * p };
        const clipIn = track([[.3, 0], [.55, 1]], t);
        if (b) b.position.z = (empty || t < .6 ? 1 : 0) * rig.boltStroke * track([[0, empty ? 1 : 0], [.12, 1], [.62, 1], [.66, 0]], t);
        this.lhOverride = { w: p, p: V3(0, .09 - clipIn * .07, rig.zr - .09), rot: 1, clip: t > .25 && t < .6 };
      };
      R.ev = [[.1, () => { if (!empty) { G.Audio.mech('boltback'); G.Audio.mech('ping'); w.reserve += 0; w.mag = 0; } }], [.55, () => { G.Audio.mech('magin'); const n = Math.min(8, w.reserve); w.mag = n; w.reserve -= n; this.hudDirty = true; }], [.64, () => G.Audio.mech('boltfwd')]];
      return R;
    }
    // --- revolvers
    if (rig.boltType === 'rev' || mt === 'cyl') {
      const cyl = rig.cyl;
      R.fn = t => {
        const o = track([[0, 0], [.15, 1], [.85, 1], [1, 0]], t);
        this.anim = { px: -.05 * o, py: .03 * o, pz: .04 * o, rx: .35 * o, ry: .3 * o, rz: .6 * o };
        if (cyl) { cyl.position.x = -.04 * o; cyl.rotation.z = 0; }
        this.lhOverride = { w: o, p: V3(-.05, .0 - track([[.4, .12], [.6, 0]], t), .0), rot: 0 };
      };
      R.ev = [[.12, () => G.Audio.mech('cyl')], [.3, () => { for (let i = 0; i < Math.min(6, S.mag - w.mag + 1); i++) setTimeout(() => this.ejectCasing(true), i * 25); }], [.65, () => { G.Audio.mech('magin'); fillAll(); }], [.85, () => G.Audio.mech('cyl')]];
      return R;
    }
    // --- detachable magazines (box, curve, drum, pan, top, side, belt, pistol)
    let axis = V3(0, -1, 0);
    if (mt === 'pan' || mt === 'top_curve' || mt === 'p90' || mt === 'pedersen' || mt === 'top_long') axis = V3(0, 1, 0);
    if (mt === 'sidebox_l' || mt === 'snail') axis = V3(-1, 0, 0);
    if (mt.startsWith('belt')) axis = V3(-.4, -1, 0).normalize();
    const belt = mt.startsWith('belt');
    const out = .12;
    const pistol = wp.c === 'PST';
    const tEnd = empty ? .88 : .78;
    R.fn = t => {
      const p = track([[0, 0], [.12, 1], [tEnd, 1], [1, 0]], t);
      this.anim = belt ? { px: -.03 * p, py: .05 * p, pz: .05 * p, rx: -.25 * p, ry: .25 * p, rz: .15 * p }
        : pistol ? { px: -.07 * p, py: .085 * p, pz: .03 * p, rx: .55 * p, ry: .22 * p, rz: .5 * p } // raise, tip & roll so the magwell faces the support hand
        : { px: tilt.px * p, py: tilt.py * p, pz: tilt.pz * p, rx: tilt.rx * p, ry: tilt.ry * p, rz: tilt.rz * p };
      // magazine motion: out (.18-.3), gone (.3-.5), in (.5-.66)
      const mOut = track([[.16, 0], [.3, 1]], t), mIn = track([[.45, 1], [.64, 0]], t);
      const d = t < .45 ? mOut : mIn;
      const far = t > .3 && t < .45 ? 3 : 1;
      if (mag && !rig.magFixed) {
        mag.position.copy(home.pos).addScaledVector(axis, d * out * far);
        mag.rotation.set(home.rot.x + (t < .45 ? 0 : d * .3), home.rot.y, home.rot.z + (t > .45 ? d * .3 : 0));
        mag.visible = !(t > .3 && t < .45);
      }
      if (belt && rig.cover) rig.cover.rotation.x = -track([[.08, 0], [.16, 1.3], [.7, 1.3], [.78, 0]], t);
      // support hand goes to magazine / charging handle
      const hmag = mag ? mag.position.clone().add(rig.magGrab ? rig.magGrab.clone().applyEuler(mag.rotation) : V3(0, axis.y < 0 ? -.07 : .05, 0)) : rig.hgPos;
      const lhw = track([[0, 0], [.12, 1], [tEnd, 1], [1, 0]], t);
      let lp = hmag;
      if (t > .3 && t < .45) lp = V3(-.15, -.35, .15); // to the pouch
      if (empty && t > .7 && t < .86 && rig.boltType === 'reciprocate') lp = V3(RWx(rig) + .04, .01, (rig.zr - (rig.boltStroke || .05) * 2) + track([[.72, 0], [.78, rig.boltStroke || .05]], t));
      this.lhOverride = { w: lhw, p: lp, rot: 0 };
      // bolt/slide lock handling
      if (empty && rig.bolt && rig.boltType === 'reciprocate') rig.bolt.position.z = (rig.boltStroke || .05) * track([[.7, 0], [.78, 1], [.82, 0]], t);
      if (rig.charge && empty) rig.charge.position.z = rig.zr + .005 + .06 * track([[.7, 0], [.78, 1], [.82, 0]], t);
      if (rig.slide) rig.slide.position.z = w.slideLock ? (rig.slideStroke || .02) * (t < .75 ? 1 : 1 - track([[.75, 0], [.8, 1]], t)) : 0;
    };
    R.ev = [[.17, () => G.Audio.mech(belt ? 'cover' : 'magout')], [.3, () => { if (!belt && G.ERA[wp.e].ord >= 2 || empty) drop(); }], [.62, () => { G.Audio.mech('magin'); fillAll(); }]];
    if (belt) R.ev.push([.68, () => G.Audio.mech('belt')], [.76, () => G.Audio.mech('cover')]);
    if (empty) R.ev.push([.76, () => G.Audio.mech(pistol ? 'slide' : 'boltback')], [.82, () => { if (!pistol) G.Audio.mech('boltfwd'); w.slideLock = false; }]);
    R.end = () => { if (mag) { mag.position.copy(home.pos); mag.rotation.copy(home.rot); mag.visible = true; } if (rig.cover) rig.cover.rotation.x = 0; w.slideLock = false; if (rig.slide) rig.slide.position.z = 0; };
    return R;
  }
  dropMag() {
    const rig = this.W.rig; if (!rig.mag || rig.magFixed) return;
    const m = G.mergeByMaterial(rig.mag);
    const wpos = rig.mag.getWorldPosition(V3());
    // convert viewmodel space to world space
    const p = this.vmToWorld(wpos);
    m.position.copy(p);
    G.FX.scene.add(m);
    const cam = G.E.camera;
    const v = V3(0, -1, 0).add(V3(.3, 0, 0).applyQuaternion(cam.quaternion));
    G.FX.casings.push({ m, v, w: V3(Math.random() * 4, Math.random() * 4, 0), life: 20, bounces: 3, ground: (x, z, y) => G.E.world.groundAt(x, z, y) + .02, shell: false });
  }
  vmToWorld(p) { return G.E.camera.localToWorld(p.clone()); }
  ejectCasing(rev) {
    const w = this.W, rig = w.rig;
    if (w.wp.caseless) return;
    if (!rig.eject) return;
    const p = this.vmToWorld(rig.eject.getWorldPosition(V3()));
    const cam = G.E.camera;
    const d = (rev ? V3(0, -1, .2) : rig.ejectDir.clone()).applyQuaternion(rig.root.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(cam.quaternion);
    const v = d.multiplyScalar(rev ? 1 : 3 + Math.random() * 1.5).add(this.vel);
    G.FX.casing(w.wp.cal, p, v, (x, z, y) => G.E.world.groundAt(x, z, y));
  }
  // ---------------------------------------------------------------- fire
  canFire() {
    const w = this.W; if (!w || !this.alive) return false;
    if (this.action && !this.action.cancel) return false;
    if (this.sprinting) return false;
    return true;
  }
  tryFire(now, pressed) {
    const w = this.W, S = w.S, mode = S.modes[w.mode] || 'semi';
    if (!this.canFire()) return;
    if (w.cycleNeeded) { if (pressed && !this.action) this.startAction('cycle'); return; }
    const interval = 60 / (mode === 'burst2' && w.wp.burstRpm ? w.wp.burstRpm : S.rpm);
    if (now - this.lastShot < interval) return;
    const semiLike = mode === 'semi' || mode === 'bolt' || mode === 'pump' || mode === 'lever';
    if (semiLike && !pressed) return;
    if (mode.startsWith('burst')) { if (pressed) this.burst = mode === 'burst2' ? 2 : 3; if (this.burst <= 0) return; }
    if (w.mag <= 0) { if (pressed) { G.Audio.mech('dry'); if (w.reserve > 0) this.reload(); } return; }
    if (this.action && this.action.cancel) { this.finishAction(true); }
    this.fire(now);
    if (mode.startsWith('burst')) this.burst--;
  }
  fire(now) {
    const w = this.W, S = w.S, wp = w.wp, rig = w.rig;
    const salvo = Math.min(wp.salvo || 1, w.mag); // multi-barrel salvo weapons fire several rounds per pull
    this.lastShot = now; w.mag -= salvo; this.hudDirty = true;
    const cam = G.E.camera;
    // aim direction: camera forward with gun-offset (sway) and zero elevation
    const q = cam.getWorldQuaternion(new THREE.Quaternion());
    const scoped = this.scoped;
    const offX = scoped ? 0 : this.aimOff.x, offY = scoped ? 0 : this.aimOff.y;
    const eye = cam.getWorldPosition(V3());
    const moving = Math.hypot(this.vel.x, this.vel.z);
    const ads = this.ads;
    let spreadDeg = lerp((HIPSPREAD[wp.c] || 3) * S.hip, 0, ss(ads)) * (1 + moving / 5) * (this.stance === 1 ? .8 : this.stance === 2 ? .6 : 1) * (this.onGround ? 1 : 3);
    spreadDeg += ads * moving * .15;
    const pellets = S.pellets * salvo;
    const cal = G.CAL[wp.cal];
    const tracerOn = S.tracer || (wp.c === 'LMG' && w.shotCount % 5 === 0);
    w.shotCount = (w.shotCount || 0) + 1;
    const vis = this.vmToWorld(rig.muzzle.getWorldPosition(V3()));
    for (let i = 0; i < pellets; i++) {
      const d = V3(0, 0, -1);
      const moa = S.acc * .000291 * (pellets > 1 ? 1 : 1) * (1 + w.heat * .6);
      const pelletCone = pellets > 1 ? (wp.salvo ? .35 : wp.duplex ? .45 : S.flech ? 1.6 : 2.6) * PI / 180 : 0;
      const r1 = Math.sqrt(Math.random()), a1 = Math.random() * 2 * PI;
      const sprd = spreadDeg * PI / 180 * r1 + moa * Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * .5;
      const pr = pellets > 1 ? pelletCone * Math.sqrt(Math.random()) : 0, pa = Math.random() * 2 * PI;
      d.applyAxisAngle(V3(1, 0, 0), w.zeroAng + offY + Math.sin(a1) * sprd + Math.sin(pa) * pr);
      d.applyAxisAngle(V3(0, 1, 0), -offX + Math.cos(a1) * sprd + Math.cos(pa) * pr);
      d.applyQuaternion(q).normalize();
      const start = eye.clone().addScaledVector(V3(0, 1, 0).applyQuaternion(q), -Math.max(.02, rig.sightH) * ads);
      G.Ballistics.fire({ pos: start, dir: d, v: S.v * (pellets > 1 ? .95 + Math.random() * .1 : 1), k: S.k, dmg: S.dmg, pen: S.pen, team: 0, owner: this, tracer: tracerOn ? 'red' : null, streak: !tracerOn && i === 0 && Math.random() < .4, cal: wp.cal, weapon: wp, vis, aim: { eye: eye.clone(), dir: V3(0, 0, -1).applyQuaternion(q) }, inc: S.inc, player: true, pellet: pellets > 1 && !wp.salvo && !wp.duplex, gyro: wp.gyro, hp: L_HP(w), ap: w.L.ammo === 'am_ap' || w.L.ammo === 'am_inc' });
    }
    // recoil
    let stanceK = (this.stance === 1 ? .82 : this.stance === 2 ? .6 : 1) * (this.bipod ? .38 : 1) * lerp(1.15, 1, ads) * Math.sqrt(salvo);
    // G11 hyperburst: the barrel/action recoils inside the housing, so the shooter feels the burst only when it ends
    if (wp.hyper && (S.modes[w.mode] || '').startsWith('burst')) stanceK *= this.burst > 1 ? .08 : 2.4;
    const rv = S.rv * stanceK, rh = S.rh * stanceK;
    const vk = rv * .0125 * (.85 + Math.random() * .3);
    this.pitch += vk; this.recoilBank += vk * (S.modes[w.mode] === 'auto' ? .35 : .6);
    this.yaw += (Math.random() * 2 - 1) * rh * .009 + rh * .002;
    this.kick.vz += .9 * Math.min(2.5, rv) * (wp.c === 'PST' ? .6 : 1); this.kick.vrx += 2.4 * rv * (wp.c === 'PST' ? 1.6 : 1);
    this.kick.ry += (Math.random() - .5) * .02 * rh; this.kick.rz += (Math.random() - .5) * .04 * rh;
    this.shake = Math.min(1, this.shake + rv * .08);
    w.heat = Math.min(1.5, w.heat + (wp.c === 'LMG' ? .012 : .025) * (cal.pen));
    // effects
    const flashScale = (S.sup ? 0 : 1) * S.flash * (.6 + cal.cs[0] * 10) * (S.blen < 1 ? 1.4 : 1);
    this.flashT = S.sup ? 0 : .045; this.flashScale = flashScale;
    const dirW = V3(0, 0, -1).applyQuaternion(q);
    G.FX.muzzle(vis, dirW, { scale: .5 + cal.cs[0] * 8, sup: S.sup, flash: S.flash });
    G.E.vmFlash.intensity = S.sup ? 0 : 2.5 * Math.min(1.5, S.flash);
    G.Audio.shot({ cal: wp.cal, cls: wp.c, sup: S.sup, loud: S.loud, player: true, subsonic: S.subsonic || S.semiConv });
    // action
    const mode = S.modes[w.mode];
    if (mode === 'bolt' || mode === 'pump' || mode === 'lever') { w.cycleNeeded = true; if (w.mag > 0 || true) setTimeout(() => { if (this.W === w && w.cycleNeeded && !this.action) this.startAction('cycle'); }, 90); }
    else {
      this.boltT = 1; // reciprocate
      if (rig.boltType !== 'rev' && !wp.caseless) this.ejectCasing();
      if (w.mag === 0 && (wp.c === 'PST' || rig.boltType === 'reciprocate') && wp.act !== 'auto_ob') w.slideLock = true;
      if (wp.enbloc && w.mag === 0) { G.Audio.mech('ping'); w.slideLock = true; }
      if (rig.cyl) rig.cyl.userData.turn = (rig.cyl.userData.turn || 0) + 1;
      if (rig.panSpin) rig.mag.rotation.y += 2 * PI / S.mag;
    }
    if (w.mag === 0 && G.Game && G.Game.autoReload && w.reserve > 0 && !w.cycleNeeded) setTimeout(() => { if (this.W === w && w.mag === 0 && !this.action) this.reload(); }, 350);
    G.Game && G.Game.onPlayerShot && G.Game.onPlayerShot(w);
  }
  fireGL() {
    const w = this.W; if (!w.S.gl || w.glAmmo <= 0) return;
    w.glAmmo--; this.hudDirty = true;
    const cam = G.E.camera, q = cam.getWorldQuaternion(new THREE.Quaternion());
    const d = V3(0, 0, -1).applyAxisAngle(V3(1, 0, 0), .06).applyQuaternion(q);
    G.Audio.mech('gl');
    G.Game.launchGrenade(cam.getWorldPosition(V3()).addScaledVector(d, .5), d.multiplyScalar(76), this);
  }
  reload() {
    const w = this.W; if (!w || this.action || w.mag >= w.S.mag + (w.wp.c === 'SG' ? 0 : 0) || w.reserve <= 0) return;
    if (w.S.modes[w.mode] === 'bolt' && w.cycleNeeded && w.mag > 0) return;
    this.startAction('reload');
  }
  meleeHit() {
    const cam = G.E.camera, eye = cam.getWorldPosition(V3()), d = V3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const reach = 1.6 * (this.W.S.melee > 1.5 ? 1.35 : 1);
    G.Game && G.Game.melee && G.Game.melee(this, eye, d, reach, this.W.S.melee > 1.5 ? 110 : 55);
  }
  finishAction(cancelled) {
    const a = this.action; if (!a) return;
    if (!cancelled) { for (const [, fn] of a.ev) fn(); a.ev.length = 0; }
    this.action = null; this.anim = null; this.lhOverride = null;
    if (a.end) a.end(); // may start a follow-up action (holster -> draw)
    const rig = this.W.rig;
    if (rig.bolt && rig.boltType === 'bolt') { rig.bolt.rotation.z = 0; rig.bolt.position.z = rig.zr - .04; }
    if (rig.pump) rig.pump.position.z = 0; if (rig.lever) rig.lever.rotation.x = 0;
    if (rig.mag && rig.magHome) { rig.mag.position.copy(rig.magHome.pos); if (!rig.panSpin) rig.mag.rotation.copy(rig.magHome.rot); rig.mag.visible = true; }
    if (rig.cyl) rig.cyl.position.x = 0;
  }
  // ---------------------------------------------------------------- damage
  hitboxes() {
    const e = this.eye;
    if (!this._hb) this._hb = [{ a: V3(), b: V3(), r: .13, zone: 'head' }, { a: V3(), b: V3(), r: .22, zone: 'chest' }, { a: V3(), b: V3(), r: .13, zone: 'leg' }];
    const H = this._hb;
    H[0].a.set(e.x, e.y - .05, e.z); H[0].b.set(e.x, e.y + .08, e.z);
    if (this.stance === 2) { const f = V3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); H[1].a.copy(this.pos).setY(this.pos.y + .25); H[1].b.copy(H[1].a).addScaledVector(f, .6); H[2].a.copy(H[1].a); H[2].b.copy(H[1].a).addScaledVector(f, -1); }
    else { H[1].a.set(this.pos.x, this.pos.y + this.stanceH * .5, this.pos.z); H[1].b.set(this.pos.x, e.y - .25, e.z); H[2].a.set(this.pos.x, this.pos.y + .1, this.pos.z); H[2].b.set(this.pos.x, this.pos.y + this.stanceH * .5, this.pos.z); }
    return H;
  }
  damage(b, zone, energy, dir, p) {
    if (!this.alive || this.god) return { dmg: 0 };
    let d = b.dmg * energy * (ZONE_MUL[zone] || 1) * .8;
    this.hp -= d; this.lastHurt = performance.now() / 1000;
    G.Audio.hurt();
    G.Game && G.Game.onPlayerHurt && G.Game.onPlayerHurt(d, dir, b);
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.deaths++; G.Game && G.Game.onKill && G.Game.onKill(b.owner, this, b.weapon, zone === 'head'); return { dmg: d, killed: true }; }
    return { dmg: d };
  }
  // ---------------------------------------------------------------- update
  update(dt, input, now) {
    const w = this.W, S = w ? w.S : null;
    const W = G.E.world;
    // look
    const sens = .0022 * G.settings.sens * (this.scoped ? 1 / Math.max(1, (S.zoom || 1) * .7) : lerp(1, .75, this.ads));
    this.yaw -= input.dx * sens; this.pitch -= input.dy * sens * (G.settings.invertY ? -1 : 1);
    // recoil recovery
    const rec = Math.min(this.recoilBank, dt * 1.6 * (this.fireHeld ? .4 : 1.2));
    this.pitch -= rec; this.recoilBank -= rec;
    this.pitch = clamp(this.pitch, -1.5, 1.5);
    // stance
    if (input.crouch) { this.stance = this.stance === 1 ? 0 : 1; }
    if (input.prone) { this.stance = this.stance === 2 ? 0 : 2; }
    const targetH = [1.62, 1.1, .38][this.stance];
    // don't stand up into a ceiling
    this.stanceH += (targetH - this.stanceH) * Math.min(1, dt * 9);
    // movement
    const f = (input.f || 0), r = (input.r || 0);
    this.sprinting = input.sprint && f > 0 && this.stance === 0 && !this.adsHeld && !this.fireHeld;
    let speed = [4.3, 2.3, .9][this.stance] * (this.sprinting ? 1.6 : 1) * lerp(1, .55, this.ads) * (S ? .82 + S.mob * .025 : 1);
    speed *= W.slowAt(this.pos);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wishX = (-sy * f + cy * r), wishZ = (-cy * f - sy * r);
    const len = Math.hypot(wishX, wishZ) || 1;
    if (this.fly) {
      const fs = input.sprint ? 60 : 18;
      const fwd = V3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      const rt = V3(cy, 0, -sy);
      this.pos.addScaledVector(fwd, f * fs * dt).addScaledVector(rt, r * fs * dt);
      if (input.jumpHeld) this.pos.y += fs * dt; if (input.downHeld) this.pos.y -= fs * dt;
      this.pos.y = Math.max(0, this.pos.y); this.vel.set(0, 0, 0);
    } else {
      const acc = this.onGround ? 14 : 3;
      this.vel.x += ((wishX / len) * speed * Math.min(1, Math.hypot(f, r)) - this.vel.x) * Math.min(1, acc * dt);
      this.vel.z += ((wishZ / len) * speed * Math.min(1, Math.hypot(f, r)) - this.vel.z) * Math.min(1, acc * dt);
      if (input.jump && this.onGround && this.stance !== 2) { this.vel.y = 4.8; this.onGround = false; if (this.stance === 1) this.stance = 0; }
      this.vel.y -= 16 * dt;
      W.move(this.pos, this.vel.x * dt, this.vel.z * dt, .33, this.stanceH + .15);
      this.pos.y += this.vel.y * dt;
      const g = W.groundAt(this.pos.x, this.pos.z, this.pos.y + .45, .2);
      if (this.pos.y <= g) { if (!this.onGround && this.vel.y < -4) G.Audio.step(G.E.groundKind, null, true); if (!this.onGround) this.landDip = Math.min(1, Math.max(this.landDip || 0, -this.vel.y / 8)); this.pos.y = g; this.vel.y = 0; this.onGround = true; }
      else if (this.pos.y > g + .05) this.onGround = false;
      // footsteps
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (this.onGround && hs > .5) { this.stepT += dt * hs * (this.sprinting ? .55 : .62); if (this.stepT > 1) { this.stepT = 0; G.Audio.step(G.E.groundKind, null, this.sprinting); } }
      this.bob += dt * hs * 1.9;
    }
    // lean
    const leanT = (input.leanL ? -1 : 0) + (input.leanR ? 1 : 0);
    this.lean += (leanT - this.lean) * Math.min(1, dt * 8);
    // weapon switching & actions
    if (input.swap !== undefined && input.swap !== this.cur && this.weapons[input.swap] && (!this.action || this.action.cancel)) { this.finishAction(true); this.equip(input.swap); }
    if (input.reload) this.reload();
    if (input.inspect && !this.action) this.startAction('inspect');
    if (input.melee && (!this.action || this.action.cancel)) { this.finishAction(true); this.startAction('melee'); }
    if (input.gl && w && w.S.gl && !this.action && w.glAmmo > 0) this.startAction('gl');
    if (input.mode && w && S.modes.length > 1 && (!this.action || this.action.keepAds)) { w.mode = (w.mode + 1) % S.modes.length; this.startAction('mode'); this.hudDirty = true; G.Game && G.Game.toast(S.modes[w.mode].replace('burst', 'Burst ').replace('semi', 'Semi-auto').replace('auto', 'Full auto').replace('bolt', 'Bolt action').replace('pump', 'Pump')); }
    if (input.light && w && S.light) { this.lightOn = !this.lightOn; G.Audio.mech('mode'); }
    if (input.zeroUp && w) { w.zero = Math.min(1000, w.zero + (w.zero >= 300 ? 100 : w.zero >= 100 ? 50 : 25)); this.computeZero(w); this.hudDirty = true; G.Game.toast('Zero ' + w.zero + ' m'); }
    if (input.zeroDown && w) { w.zero = Math.max(25, w.zero - (w.zero > 300 ? 100 : w.zero > 100 ? 50 : 25)); this.computeZero(w); this.hudDirty = true; G.Game.toast('Zero ' + w.zero + ' m'); }
    if (input.bipod && w && S.bip) { this.bipod = !this.bipod; G.Audio.mech('bipod'); G.Game.toast(this.bipod ? 'Bipod deployed' : 'Bipod stowed'); }
    if (this.stance === 2 && S && S.bip && !this.bipod && Math.hypot(this.vel.x, this.vel.z) < .2) { this.bipod = true; }
    if (this.bipod && (Math.hypot(this.vel.x, this.vel.z) > .6 || (this.stance === 0 && !this.bipodRest()))) this.bipod = false;
    // ADS
    this.adsHeld = input.ads && !this.sprinting && (!this.action || this.action.keepAds || this.action.name === 'cycle');
    const adsSpeed = 1 / Math.max(.08, S ? S.ads : .3);
    this.ads = clamp(this.ads + (this.adsHeld ? 1 : -1.4) * adsSpeed * dt, 0, 1);
    this.scoped = S && S.zoom >= 1.2 && this.ads > .9;
    // breath hold for scopes
    this.holding = this.scoped && input.sprint && this.breath > 0;
    if (this.holding) this.breath = Math.max(0, this.breath - dt / 5); else this.breath = Math.min(1, this.breath + dt / (this.breath <= 0 ? 7 : 4));
    // fire
    this.fireHeld = input.fire;
    const hyper = w && w.wp.hyper && this.burst > 0; // a hyperburst always completes once started
    if (input.fire || hyper) this.tryFire(now, input.firePressed);
    if (!input.fire && !hyper) this.burst = 0;
    // action timeline
    if (this.action) {
      const a = this.action; a.t += dt / a.dur;
      for (let i = a.ev.length - 1; i >= 0; i--) if (a.t >= a.ev[i][0]) { const fn = a.ev[i][1]; a.ev.splice(i, 1); fn(); }
      if (a.fn) a.fn(Math.min(1, a.t));
      if (a.t >= 1) this.finishAction(false);
    }
    if (w) w.heat = Math.max(0, w.heat - dt * .12);
    // health regen
    if (this.alive && this.hp < 100 && now - this.lastHurt > 4.5) this.hp = Math.min(100, this.hp + dt * 22);
    this.suppress = Math.max(0, this.suppress - dt * .8);
    this.updateCamera(dt, now);
    this.updateVM(dt, now);
  }
  bipodRest() { // standing bipod needs something to rest on in front
    const e = this.eye, d = V3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const p = e.clone().addScaledVector(d, .8); const g = G.E.world.groundAt(p.x, p.z, e.y - .2);
    return e.y - g < .55 && e.y - g > .1;
  }
  updateCamera(dt, now) {
    const cam = G.E.camera, w = this.W, S = w ? w.S : null;
    // scoped sway (breathing + heartbeat), less when prone or on bipod
    const t = now;
    const stable = (this.bipod ? .12 : 1) * (this.stance === 2 ? .45 : this.stance === 1 ? .75 : 1) * (this.holding ? .08 : 1) * (this.breath <= 0 ? 1.8 : 1);
    const cls = S ? (w.wp.c === 'PST' ? 1.2 : w.wp.heavy ? 1.4 : 1) : 1;
    const amp = .0028 * stable * cls * (1 + this.suppress * 2) * (S ? Math.max(.6, Math.min(1.6, w.wp.wt / 4)) : 1);
    const sx = (Math.sin(t * .9) * 1.0 + Math.sin(t * 2.1) * .35) * amp * this.ads;
    const syy = (Math.sin(t * 1.3 + 1) * .8 + Math.sin(t * 3.3) * .25) * amp * this.ads;
    this.aimOff.x += (sx + this.swayL.x * .3 - this.aimOff.x) * Math.min(1, dt * 10);
    this.aimOff.y += (syy + this.swayL.y * .3 - this.aimOff.y) * Math.min(1, dt * 10);
    const e = this.eye;
    const leanOff = this.lean * .42;
    const rt = V3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    cam.position.copy(e).addScaledVector(rt, leanOff);
    if (this.lean !== 0) { const hit = G.E.world.raycast(e, rt.clone().multiplyScalar(Math.sign(this.lean)), Math.abs(leanOff) + .3); if (hit) cam.position.copy(e).addScaledVector(rt, Math.sign(this.lean) * Math.max(0, hit.t - .3)); }
    const hs = Math.hypot(this.vel.x, this.vel.z), bobA = Math.min(1, hs / 4) * (this.onGround ? 1 : 0) * (1 - this.ads * .85);
    cam.position.y += Math.abs(Math.sin(this.bob)) * .035 * bobA - .015 * bobA;
    this.shake = Math.max(0, this.shake - dt * 4);
    const sh = this.shake * .004;
    const pitch = this.pitch + (this.scoped ? this.aimOff.y : 0) + (Math.random() - .5) * sh;
    const yaw = this.yaw - (this.scoped ? this.aimOff.x : 0) + (Math.random() - .5) * sh;
    cam.rotation.set(pitch, yaw, -this.lean * .12 + Math.sin(this.bob) * .004 * bobA, 'YXZ');
    // FOV
    const base = G.settings.fov;
    let fov = base;
    if (S) {
      const z = this.scoped ? S.zoom : lerp(1, S.zoom >= 1.2 ? 1.35 : w.wp.c === 'PST' ? 1.12 : 1.22, ss(this.ads));
      fov = 2 * Math.atan(Math.tan(base * PI / 360) / z) * 180 / PI;
    }
    if (this.sprinting) fov += 4;
    if (Math.abs(cam.fov - fov) > .01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * (this.scoped ? 30 : 14)); cam.updateProjectionMatrix(); G.FX.setScale(G.E.H * G.E.renderer.getPixelRatio(), cam.fov); }
    cam.updateMatrixWorld();
    // weapon light
    const L = G.E.vmLight;
    if (this.lightOn && S && S.light) { L.intensity = 3; L.position.copy(cam.position); L.target.position.copy(cam.position).add(V3(0, 0, -10).applyQuaternion(cam.quaternion)); } else L.intensity = 0;
  }
  updateVM(dt, now) {
    const vm = this.vm, w = this.W; if (!w) return;
    const S = w.S, rig = w.rig, wp = w.wp;
    vm.pivot.visible = !this.scoped && this.alive && !this.hideVM;
    for (const a of vm.arms) { a.upper.visible = a.fore.visible = a.hand.visible = a.cuff.visible = vm.pivot.visible; }
    // mouse-lag sway
    const inp = G.Input;
    this.swayL.x += (clamp(-inp.lastDx * .0009, -.06, .06) - this.swayL.x) * Math.min(1, dt * 7);
    this.swayL.y += (clamp(-inp.lastDy * .0009, -.06, .06) - this.swayL.y) * Math.min(1, dt * 7);
    // hip and ADS placements
    const pst = wp.c === 'PST';
    const hip = pst ? V3(.12, -.11 - rig.gripPos.y * .3, -.4) : V3(.14, -.13 - Math.max(0, rig.sightH - .03) * .5, -.4 - (wp.heavy ? .03 : 0));
    const adsP = V3(-(rig.sightX || 0), -rig.sightH, -(rig.eyeDist) - rig.sightZ);
    const a = ss(this.ads);
    const P = hip.clone().lerp(adsP, a);
    // sprint pose, bipod pose
    const spr = this.sprintBlend = lerp(this.sprintBlend || 0, this.sprinting ? 1 : 0, Math.min(1, dt * 8));
    const tac = G.ERA[wp.e].ord >= 3 && !pst && !wp.heavy; // modern tactical sprint: muzzle up, gun tucked high
    const rollIn = Math.sin(a * PI) * (this.adsHeld ? .07 : -.04);
    const idle = Math.sin(now * 1.6) * .0025 * (1 - a * .8);
    const hs = Math.hypot(this.vel.x, this.vel.z), bA = Math.min(1, hs / 4) * (1 - a * .85) * (this.onGround ? 1 : .3);
    const bx = Math.sin(this.bob) * .012 * bA * (this.sprinting ? 2.2 : 1), by = -Math.abs(Math.cos(this.bob)) * .012 * bA * (this.sprinting ? 2 : 1);
    // recoil spring
    const K = this.kick; K.vz -= K.z * 260 * dt; K.vz *= Math.pow(.0005, dt); K.z += K.vz * dt;
    K.vrx -= K.rx * 300 * dt; K.vrx *= Math.pow(.0008, dt); K.rx += K.vrx * dt; K.ry *= Math.pow(.02, dt); K.rz *= Math.pow(.02, dt);
    const kz = K.z * .06 * (1 - a * .35), krx = K.rx * .03;
    // landing dip, airborne lag, stance tilt and wall pull-back
    this.landDip = Math.max(0, (this.landDip || 0) - dt * 3.5);
    const air = this.onGround ? 0 : clamp(this.vel.y * -.006, -.03, .03);
    const cam = G.E.camera, fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.wallT = (this.wallT || 0) - dt;
    if (this.wallT <= 0) { this.wallT = .08; const hit = G.E.world.raycast(cam.position, fwd, 1.0); this.wallTarget = hit ? clamp((1 - hit.t) / .65, 0, 1) : 0; }
    this.wall = lerp(this.wall || 0, this.wallTarget || 0, Math.min(1, dt * 10));
    const dip = Math.sin(Math.min(1, this.landDip) * PI) * .03 * (1 - a * .6) + this.landDip * .02;
    const tilt = this.stance === 1 ? .06 : this.stance === 2 ? .12 : 0;
    this.tiltS = lerp(this.tiltS || 0, tilt * (1 - a), Math.min(1, dt * 6));
    const wl = this.wall * (1 - a * .5);
    vm.offset.position.set(P.x + bx - spr * .06 + wl * .03, P.y + by + idle - spr * .05 - dip + air - wl * .06, P.z + kz + spr * .02 + wl * .14);
    const sx = tac ? .75 : -.35, sy = tac ? .35 : .8, sz = tac ? .9 : .35;
    vm.offset.rotation.set(krx + spr * sx - dip * 1.2 + wl * .55, spr * sy + (1 - a) * .05 + wl * .35, spr * sz + K.rz + (1 - a) * -.03 - this.tiltS + rollIn, 'YXZ');
    // sway in pivot (so ADS sights move with the aim offset)
    vm.pivot.rotation.set(this.scoped ? 0 : this.aimOff.y, this.scoped ? 0 : -this.aimOff.x + K.ry, -this.lean * .05, 'YXZ');
    // animation additive
    const an = this.anim;
    if (an) { vm.holder.position.set(an.px, an.py, an.pz); vm.holder.rotation.set(an.rx, an.ry, an.rz); } else { vm.holder.position.set(0, 0, 0); vm.holder.rotation.set(0, 0, 0); }
    // reciprocating parts
    if (this.boltT > 0) this.boltT = Math.max(0, this.boltT - dt * (S.rpm / 60) * 2.2);
    const bt = this.boltT > .5 ? (1 - this.boltT) * 2 : this.boltT * 2;
    if (!this.action || this.action.name !== 'reload') {
      if (rig.bolt && rig.boltType === 'reciprocate') rig.bolt.position.z = (w.slideLock ? 1 : bt) * (rig.boltStroke || .05);
      if (rig.slide) rig.slide.position.z = (w.slideLock ? 1 : bt) * (rig.slideStroke || .02);
      if (rig.charge && !w.slideLock) rig.charge.position.z = rig.zr + .005;
    }
    if (rig.toggleR && rig.slide) { const th = Math.acos(Math.max(0, 1 - rig.slide.position.z / .064)); rig.toggleR.rotation.x = th; rig.toggleF.rotation.x = -2 * th; } // Luger knee breaks upward
    if (rig.trigger) rig.trigger.rotation.x = this.fireHeld ? .35 : 0;
    if (rig.hammer) rig.hammer.rotation.x = (this.fireHeld && bt > 0) ? .2 : -.6 * (1 - bt);
    if (rig.cyl && rig.cyl.userData.turn) { const tgt = rig.cyl.userData.turn * PI / 3; rig.cyl.rotation.z += (tgt - rig.cyl.rotation.z) * Math.min(1, dt * 20); }
    if (rig.bipodLegs) for (const L of rig.bipodLegs) L.rotation.x = lerp(L.rotation.x, this.bipod ? -1.45 : 0, Math.min(1, dt * 10));
    // muzzle flash
    const fl = vm.flash;
    if (this.flashT > 0) {
      this.flashT -= dt; fl.visible = true; const s = this.flashScale * (.8 + Math.random() * .5);
      fl.scale.setScalar(Math.max(.2, s)); fl.rotation.z = Math.random() * PI;
      fl.position.set(rig.sightX && false ? 0 : 0, rig.muzzleY || 0, rig.muzzleZ - .02);
    } else fl.visible = false;
    G.E.vmFlash.intensity *= Math.pow(.0001, dt);
    G.E.vmFlash.position.copy(vm.offset.position).add(V3(0, 0, rig.muzzleZ));
    // barrel smoke when hot
    if (w.heat > .35 && Math.random() < dt * 20 * w.heat && !this.scoped) G.FX.wisp(this.vmToWorld(rig.muzzle.getWorldPosition(V3())), w.heat);
    // reticle for 1x optics fades in with ADS
    if (rig.dot) rig.dot.material.opacity = .3 + a * .7;
    // arms IK: hands sit on their anchors in gun space, forearms end at the wrists
    vm.pivot.updateMatrixWorld(true);
    const qg = rig.root.getWorldQuaternion(new THREE.Quaternion());
    const rAnchor = rig.gripPos.clone();
    let lAnchor = rig.hgPos.clone();
    if (pst) lAnchor = rig.gripPos.clone().add(V3(-.018, -.012, -.012));
    if (this.lhOverride && this.lhOverride.w > 0) lAnchor.lerp(this.lhOverride.p, this.lhOverride.w);
    const R = vm.arms[0], Lh = vm.arms[1];
    R.hand.position.copy(rig.root.localToWorld(rAnchor.clone())); R.hand.quaternion.copy(qg);
    Lh.hand.position.copy(rig.root.localToWorld(lAnchor.clone())); Lh.hand.quaternion.copy(qg);
    if (pst && !(this.lhOverride && this.lhOverride.w > .5)) Lh.hand.rotateZ(.5);
    // trigger finger
    const ix = R.hand.userData.index; if (ix) { const pull = this.fireHeld && this.canFire() ? .22 : 0; ix.rotation.x += ((pull) - ix.rotation.x) * Math.min(1, dt * 30); }
    // held items: a shell for tube loading, a stripper clip for bolt actions
    this.updateHeldItem(Lh.hand, w);
    const rw = rig.root.localToWorld(rAnchor.clone().add(V3(.035, -.035, .085)));
    const lw = rig.root.localToWorld(lAnchor.clone().add(pst ? V3(-.03, -.04, .07) : V3(-.035, -.06, .06)));
    this.solveArm(R, rw, V3(.6, -1, .3));
    this.solveArm(Lh, lw, V3(-.8, -1, 0));
    orient(R.cuff, rw, R.hand.position.clone().lerp(rw, .45)); orient(Lh.cuff, lw, Lh.hand.position.clone().lerp(lw, .45));
  }
  updateHeldItem(hand, w) {
    const o = this.lhOverride, want = o && o.w > .5 ? (o.shell ? 'shell' : o.clip ? 'clip' : null) : null;
    if (hand.userData.itemKind !== want) {
      if (hand.userData.item) hand.remove(hand.userData.item);
      hand.userData.item = null; hand.userData.itemKind = want;
      if (want === 'shell' || want === 'clip') {
        const c = G.CAL[w.wp.cal] || G.CAL['.303 British'];
        const g = new THREE.Group();
        if (want === 'shell') { const cs = G.makeCasing(w.wp.cal); cs.rotation.y = Math.PI / 2; g.add(cs); g.position.set(0, -.03, -.01); }
        else { const n = 5; const clip = new THREE.Mesh(gBox(.012, .004, .05), G.mat({ color: '#b98e3c', metalness: 1, roughness: .3 })); g.add(clip); for (let i = 0; i < n; i++) { const r = G.makeCasing(w.wp.cal); r.rotation.x = -Math.PI / 2; r.position.set(0, c.cs[0] / 2, -.02 + i * .01); g.add(r); } g.position.set(0, .01, 0); }
        g.traverse(m => { m.frustumCulled = false; }); hand.add(g); hand.userData.item = g;
      }
    }
  }
  solveArm(arm, target, pole) {
    const up = .34, lo = .32;
    const s = arm.sh.clone();
    const tB = target.clone().sub(s); let d = tB.length(); d = Math.min(d, up + lo - .002); tB.setLength(d);
    const t = s.clone().add(tB);
    const a = Math.acos(clamp((up * up + d * d - lo * lo) / (2 * up * d), -1, 1));
    const dir = tB.clone().normalize();
    const sideV = V3().crossVectors(dir, pole.normalize()).normalize();
    const bend = V3().crossVectors(sideV, dir).normalize();
    const elbow = s.clone().addScaledVector(dir, Math.cos(a) * up).addScaledVector(bend, Math.sin(a) * up);
    orient(arm.upper, s, elbow); orient(arm.fore, elbow, t);
  }
}
function L_HP(w) { return w.L.ammo === 'am_hp'; }
function RWx(rig) { return rig.wp.m.R[2] * .5; }
const tC = V3(), Yup = V3(0, 1, 0);
function orient(mesh, a, b) { tC.subVectors(b, a); const len = tC.length(); mesh.position.copy(a).addScaledVector(tC, .5); mesh.scale.set(1, len, 1); mesh.quaternion.setFromUnitVectors(Yup, tC.divideScalar(len || 1)); }
G.Player = Player;
G.track = track;
})();
