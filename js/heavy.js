// ============================================================================
// IRONSIGHT — firing mechanics for black-powder arms and artillery:
//   lock time      flint, match and wheel locks flash in the pan before the
//                  main charge goes off (wp.lock seconds); a percussion cap is
//                  almost instant
//   misfires       "a flash in the pan": the priming burns but the charge
//                  doesn't (wp.misfire chance, higher when the gun is fouled)
//   smoke          black powder fills the air with a white cloud (wp.smoke)
//   loft           mortars throw their bombs high (wp.loft rad above the aim)
//   recoil         barrels run back on their recoil mechanism and return
//   backblast      recoilless rifles blow a cone of gas out behind them
//   fouling        every shot dirties the bore; the handling bench cleans it
// ============================================================================
'use strict';
(function () {
const G = window.G, P = G.Player.prototype;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ fouling, shared with the handling bench
const DKEY = 'ironsight.fouling';
G.Fouling = { data: (() => { try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch (e) { return {}; } })() };
G.Fouling.get = id => G.Fouling.data[id] || 0;
G.Fouling.add = (wp, n = 1) => { const k = wp.act === 'muzzle' || wp.act === 'cannon' || wp.e === 'powder' ? .07 : wp.c === 'LMG' ? .004 : .006; G.Fouling.data[wp.id] = Math.min(1, G.Fouling.get(wp.id) + k * n); G.Fouling.dirty = true; };
G.Fouling.set = (id, v) => { G.Fouling.data[id] = Math.max(0, Math.min(1, v)); G.Fouling.dirty = true; };
setInterval(() => { if (G.Fouling.dirty) { G.Fouling.dirty = false; try { localStorage.setItem(DKEY, JSON.stringify(G.Fouling.data)); } catch (e) {} } }, 3000);

function smoke(pos, dir, k) {
  if (!G.FX || !G.FX.smoke) return;
  const n = Math.round(8 + k * 6);
  for (let i = 0; i < n; i++) {
    const sp = .5 + Math.random() * 3 * Math.min(2, k * .5);
    G.FX.smoke.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * sp + (Math.random() - .5) * .8, vy: dir.y * sp + .2 + Math.random() * .3, vz: dir.z * sp + (Math.random() - .5) * .8,
      life: 4 + Math.random() * 5 * Math.min(2, k * .4), s0: .2 * Math.min(4, k), s1: (1.5 + Math.random() * 2) * Math.min(6, k * .7), r: .92, g: .91, b: .88, a: .5, drag: .55, fadeIn: .05 });
  }
}
function panFlash(P0) {
  const w = P0.W, rig = w.rig;
  const p = P0.vmToWorld((rig.panPos ? rig.root.localToWorld(rig.panPos.clone()) : rig.root.getWorldPosition(V3())));
  if (G.FX) { for (let i = 0; i < 6; i++) G.FX.spark.spawn({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - .5) * 2, vy: 1 + Math.random() * 2, vz: (Math.random() - .5) * 2, life: .15 + Math.random() * .15, s0: .03, s1: .01, r: 1, g: .7, b: .3, grav: 3, drag: .5 }); smoke(p, V3(0, 1, 0), .6); }
  G.Audio.mech('dry'); G.Audio.mech('belt');
}

const fire0 = P.fire;
P.fire = function (now) {
  const w = this.W, wp = w.wp;
  // a lock with lock time: flash in the pan first, the shot follows (or doesn't)
  if (wp.lock > 0 && !this._lockFiring) {
    if (this._lockPending) return;
    this.lastShot = now;
    if (this.W.rig.hammer) this.W.rig.hammer.rotation.x = .5;
    panFlash(this);
    const foul = G.Fouling.get(wp.id);
    if (Math.random() < (wp.misfire || 0) * (1 + foul * 2.5)) { // flash in the pan
      G.UI.toast && G.UI.toast('Flash in the pan! Re-prime and try again.', 1.6);
      w.misfired = true; return;
    }
    this._lockPending = true;
    const T0 = performance.now();
    const go = () => {
      if (performance.now() - T0 < wp.lock * 1000) return requestAnimationFrame(go);
      this._lockPending = false;
      if (this.W !== w || w.mag <= 0 || !this.alive) return;
      this._lockFiring = true; try { P.fire.call(this, now + wp.lock); } finally { this._lockFiring = false; }
    };
    requestAnimationFrame(go);
    return;
  }
  // a fouled gun shoots wider and sometimes stops: clean it on the handling bench
  const foul = G.Fouling.get(wp.id), S = w.S, acc0 = S.acc;
  if (foul > .5 && !wp.lock && wp.act !== 'muzzle' && wp.act !== 'cannon' && Math.random() < (foul - .5) * .08) { w.mag -= 1; this.hudDirty = true; w.cycleNeeded = true; G.Audio.mech('dry'); G.UI.toast && G.UI.toast('Stoppage — the gun is filthy. Fire again to clear it; clean it on the bench.', 2); this.lastShot = now; return; }
  S.acc = acc0 * (1 + foul * .6);
  // mortars: the bomb leaves the tube high above the line of sight
  const cam = G.E.camera; let lofted = false;
  if (wp.loft) { cam.rotation.x += wp.loft; cam.updateMatrixWorld(true); lofted = true; }
  try { fire0.call(this, now); }
  finally { S.acc = acc0; if (lofted) { cam.rotation.x -= wp.loft; cam.updateMatrixWorld(true); } }
  w.misfired = false;
  G.Fouling.add(wp, Math.min(3, wp.salvo || 1));
  w.lastShotT = performance.now();
  const rig = w.rig;
  const mp = this.vmToWorld(rig.muzzle.getWorldPosition(V3()));
  const dir = V3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
  if (wp.smoke) smoke(mp, dir, wp.smoke);
  if (wp.emplaced && G.FX) G.FX.muzzle(mp, dir, { scale: Math.min(6, 1.5 + (wp.m.cal || .05) * 20), world: true });
  if (wp.backblast) { const bp = this.vmToWorld(rig.root.localToWorld(V3(0, 0, rig.zr + .3))); smoke(bp, dir.clone().negate(), 3); }
  if (wp.emplaced) this.shake = Math.min(1.5, (this.shake || 0) + .25 + (wp.m.cal || .05) * 1.5);
};

// ------------------------------------------------------------------ per frame: recoiling barrels, gatling crank
const upd0 = P.update;
P.update = function (dt, input, now) {
  upd0.call(this, dt, input, now);
  const w = this.W; if (!w) return;
  const rig = w.rig;
  if (rig.recoilG && rig.recoilDist && w.lastShotT) { // run back fast, return slowly on the recuperator
    const t = (performance.now() - w.lastShotT) / 1000, dd = rig.recoilDist;
    rig.recoilG.position.z = t < .06 ? dd * t / .06 : Math.max(0, dd * (1 - (t - .06) / .9));
  }
  if (rig.crank) rig.crank.rotation.x += (w.spin || 0) * dt * 20;
  if (rig.drum && w.lastShotT && performance.now() - w.lastShotT < 200) rig.drum.rotation.z += dt * 6;
};
})();
