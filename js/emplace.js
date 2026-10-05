// ============================================================================
// IRONSIGHT — emplacements: cannons, artillery, mortars and the other crew-served
// pieces stand on the ground instead of being carried. While you man one you stay
// at its breech (you can traverse, elevate and fire, but not walk off with it).
// Switch weapons (1 / 2 / wheel) or press K and you step away: the gun stays where
// it is, loaded as you left it. Walk back to it and press T to man it again.
// ============================================================================
'use strict';
(function () {
const G = window.G, Game = G.Game, PP = G.Player.prototype;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// crew-served pieces, and real guns too heavy to carry and fire (tripod machine guns, 20 mm anti-tank rifles)
G.isEmplaced = wp => !!(wp && (wp.emplaced || ((wp.wt || 0) > 40 && !wp.psy && !wp.custom)));
const isFixed = w => !!(w && G.isEmplaced(w.wp));

// build the gun at full size and stand it on the ground with its breech just ahead of `spot`
function placeGun(w, spot, yaw) {
  const rig = G.buildGun(w.wp, w.L, { lod: 1 }), mesh = G.mergeByMaterial(rig.root);
  mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(mesh);
  mesh.position.set(0, -box.min.y, -(.35 + Math.max(0, box.max.z)));
  // the anchor sits where the crew stands, so "near the gun" means near its breech
  const anchor = new THREE.Group(); anchor.add(mesh);
  anchor.position.copy(spot); anchor.rotation.set(0, yaw, 0);
  G.E.world.group.add(anchor);
  return Game.addPickup({ wp: w.wp, L: w.L, mag: w.mag, reserve: w.reserve, obj: anchor, own: true, fixed: true, spot: spot.clone(), yaw, st: w.st, mode: w.mode });
}

// step away from the gun in hand; `next` is the weapon to bring up instead
Game.leaveGun = function (P, next) {
  const w = P.W; if (!isFixed(w)) return false;
  if (P.weapons.length < 2) { Game.toast('You need another weapon to step away from the gun', 1.6); return false; }
  P.finishAction(true);
  const spot = (P.manSpot || P.pos).clone(); spot.y = G.E.world.groundAt(spot.x, spot.z, spot.y + .45, .2);
  P.vm.holder.remove(w.rig.root); P.weapons.splice(P.cur, 1);
  placeGun(w, spot, P.manYaw !== undefined ? P.manYaw : P.yaw);
  P.manSpot = null;
  for (const o of P.weapons) o.rig.root.visible = false;
  const i = Math.max(0, P.weapons.indexOf(next)); P.cur = i; P.equip(i, true); P.startAction('equip'); G.Audio.mech('equip');
  Game.toast(`Left the ${w.wp.n} in place · walk back and press T to man it`, 2.2); P.hudDirty = true;
  return true;
};
// take your place at an emplaced gun
Game.manGun = function (p, P) {
  if (p.obj.parent) p.obj.parent.remove(p.obj);
  Game.pickups = Game.pickups.filter(q => q !== p);
  P.finishAction(true);
  const nw = P.makeWeapon(p.wp, p.L); nw.mag = Math.min(nw.S.mag, Math.max(0, p.mag)); nw.reserve = Math.max(0, p.reserve);
  if (p.mode !== undefined) nw.mode = Math.min(p.mode, nw.S.modes.length - 1);
  P.weapons.push(nw);
  P.pos.x = p.spot.x; P.pos.z = p.spot.z; P.vel.set(0, 0, 0); P.yaw = p.yaw;
  P.manSpot = p.spot.clone(); P.manYaw = p.yaw;
  for (const o of P.weapons) o.rig.root.visible = false;
  P.cur = P.weapons.length - 1; P.equip(P.cur, true); P.startAction('equip'); G.Audio.mech('equip');
  Game.toast(`Manning the ${p.wp.n} · ${p.mag} + ${p.reserve} · 1 / 2 or K to step away`, 2); P.hudDirty = true;
};

// the player: anchored at the gun while manning it; switching weapons steps away from it
const up0 = PP.update;
PP.update = function (dt, input, now) {
  const w = this.W;
  if (isFixed(w)) {
    if (!this.manSpot) { this.manSpot = this.pos.clone(); this.manYaw = this.yaw; }
    if (input.swap !== undefined && input.swap !== this.cur && this.weapons[input.swap] && (!this.action || this.action.cancel)) { Game.leaveGun(this, this.weapons[input.swap]); input.swap = undefined; }
  } else this.manSpot = null;
  const r = up0.call(this, dt, input, now);
  if (isFixed(this.W) && this.manSpot) { this.pos.x = this.manSpot.x; this.pos.z = this.manSpot.z; this.vel.x = this.vel.z = 0; this.sprinting = false; }
  return r;
};
const sw0 = PP.setupWeapons;
PP.setupWeapons = function (list) { this.manSpot = null; return sw0.call(this, list); };

// K leaves the gun standing; T at a standing gun mans it
const upk0 = Game.updatePickups;
Game.updatePickups = function (dt, P, input) {
  if (P && P.alive && input.drop && isFixed(P.W)) { input.drop = false; const other = P.weapons.find(o => o !== P.W); Game.leaveGun(P, other); }
  return upk0.call(this, dt, P, input);
};
const pu0 = Game.pickUp;
Game.pickUp = function (p, P) { return p.fixed ? Game.manGun(p, P) : pu0.call(this, p, P); };
})();
