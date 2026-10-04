// ============================================================================
// IRONSIGHT — handling bench, part 3: detailed inner workings.
//   * every modern action is rebuilt as a real mechanism, sized from the gun:
//     bolt carriers with gas keys or pistons, multi-lug rotating bolts and cam
//     pins, rollers and locking pieces, tilting barrels and links, toggles,
//     firing pins and their springs, extractors, ejectors, hammers, sears,
//     disconnectors, auto sears, triggers, selectors, buffers, action springs
//     that really compress coil by coil, magazine followers, shell lifters,
//     revolver hands and cylinder stops — 15 to 30 parts per gun
//   * live ammunition: the top round is stripped from the magazine (or lifted
//     from the tube, or pulled from the belt), rides up the feed ramp into the
//     chamber, fires, the bullet runs down the bore, gas flows to the action,
//     the case is extracted, pivots on the ejector and leaves the port
//   * a scrubbable timeline in real milliseconds, slow motion down to 1/1000,
//     phase stepping, live read-outs (bolt travel, rotation, spring load,
//     chamber pressure, bullet position) and a pressure/travel chart
//   * click any internal part for what it does, what it is made of and how
//     worn it is; worn parts can be replaced
//   * malfunctions on the bench (stovepipe, double feed, failure to feed,
//     failure to extract, dud, hangfire, out of battery) and the drills that
//     clear them; part wear counted from every round fired, here or in the field
// ============================================================================
'use strict';
(function () {
const G = window.G, BN = G.Bench, UI = G.UI, esc = UI.esc;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
const { gBox, gCyl, gCylX, gCylY, gSph, gTor, gRBox } = G.geo;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eIn = x => x * x, eOut = x => 1 - (1 - x) * (1 - x), eIO = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const snd = k => G.Audio.mech(k);

// ------------------------------------------------------------------ part catalogue: what each part does, what it is made of, service life (rounds)
const PI_ = {
  carrier: ['Bolt carrier', 'Takes the push from the gas (or the recoil) and carries the bolt back and forth. A cam track machined in it turns the bolt to lock and unlock.', 'Machined 8620 steel, chrome-lined inside', 40000],
  gaskey: ['Gas key', 'A small manifold on top of the carrier: gas from the tube enters here and expands between the carrier and the bolt, driving the carrier back.', '4130 steel, staked screws', 30000],
  bolthead: ['Bolt', 'Locks into the barrel extension with its lugs, holds the case head, and carries the extractor and ejector.', 'Carpenter 158 / 9310 steel, shot-peened', 15000],
  lugs: ['Locking lugs', 'The lugs rotate into recesses behind the chamber; all the pressure of the shot is held here.', 'Part of the bolt', 15000],
  campin: ['Cam pin', 'Rides in the carrier’s cam slot: as the carrier moves, the slot forces the pin — and the bolt — to rotate.', 'Hardened steel', 25000],
  firingpin: ['Firing pin', 'Hit by the hammer (or driven by its spring), it strikes the primer.', 'Tool steel, chromed', 25000],
  fpspring: ['Firing-pin spring', 'Holds the firing pin back so it cannot touch the primer except when struck.', 'Music wire', 15000],
  fpretain: ['Firing-pin retaining pin', 'A cotter pin that keeps the firing pin in the carrier.', 'Spring steel', 50000],
  extractor: ['Extractor', 'A claw that snaps over the case rim as the bolt closes and pulls the empty case out of the chamber.', 'Tool steel', 8000],
  exspring: ['Extractor spring', 'Gives the extractor its grip on the rim. A tired one lets cases slip: failures to extract.', 'Music wire with rubber insert', 5000],
  ejector: ['Ejector', 'A spring plunger in the bolt face (or a fixed blade in the receiver) that kicks the case out of the port once it clears the chamber.', 'Steel plunger', 10000],
  ejspring: ['Ejector spring', 'Powers the ejector plunger.', 'Music wire', 8000],
  gasrings: ['Gas rings', 'Three split rings on the bolt tail seal the gas inside the carrier.', 'Stainless steel', 6000],
  gastube: ['Gas tube', 'Carries gas from the port in the barrel back to the carrier key.', 'Stainless steel tube', 30000],
  gasblock: ['Gas block & port', 'A small hole drilled in the barrel taps off some propellant gas as the bullet passes.', 'Steel', 30000],
  piston: ['Gas piston', 'Gas from the port drives this piston back; it strikes the operating rod or carrier.', 'Chromed steel', 20000],
  pistonspring: ['Piston return spring', 'Returns a short-stroke piston to battery.', 'Spring steel', 15000],
  oprod: ['Operating rod', 'Transfers the piston’s push to the bolt; its cam turns the bolt.', 'Forged steel', 30000],
  gascyl: ['Gas cylinder', 'The chamber in which the piston is driven.', 'Steel', 30000],
  buffer: ['Buffer', 'A weighted plunger behind the carrier: it absorbs the impact at the rear and slows the cycle.', 'Aluminium body, tungsten weights', 30000],
  spring: ['Action / recoil spring', 'Compressed by the carrier as it recoils; it drives the bolt forward again to feed and lock.', 'Chrome-silicon wire', 7000],
  guide: ['Spring guide rod', 'Keeps the recoil spring straight.', 'Steel', 40000],
  hammer: ['Hammer', 'Rotates forward under its spring and strikes the firing pin.', 'Hardened tool steel', 30000],
  hspring: ['Hammer spring', 'A torsion spring that powers the hammer.', 'Music wire', 20000],
  trigger: ['Trigger', 'Pulling it tips the sear out of the hammer notch.', 'Hardened steel', 40000],
  tspring: ['Trigger spring', 'Returns the trigger forward and holds the sear in engagement.', 'Music wire', 20000],
  sear: ['Sear', 'The step that holds the cocked hammer (or striker, or open bolt) until the trigger releases it.', 'Hardened steel, polished face', 30000],
  disconnector: ['Disconnector', 'Catches the hammer as the bolt recocks it while the trigger is still held, so the gun fires once per pull; releases it to the sear when the trigger resets.', 'Hardened steel + small spring', 20000],
  autosear: ['Auto sear', 'In full auto, holds the hammer until the carrier is fully forward and locked, then trips it: the gun keeps firing while the trigger is held.', 'Hardened steel', 20000],
  selector: ['Safety / selector', 'A drum that blocks the trigger (safe), lets the disconnector work (semi) or brings the auto sear in (auto).', 'Steel', 50000],
  boltcatch: ['Bolt catch', 'Pushed up by the magazine follower after the last round: holds the bolt open.', 'Steel', 30000],
  follower: ['Magazine follower', 'Pushes the stack up into the feed lips; its shape staggers the rounds.', 'Polymer', 10000],
  magspring: ['Magazine spring', 'Pushes the follower and the rounds up for every feed. A weak one causes failures to feed.', 'Chrome-silicon wire', 10000],
  feedlips: ['Feed lips', 'Hold the top round until the bolt strips it forward.', 'Steel / polymer', 10000],
  barrelext: ['Barrel extension', 'Screwed to the barrel: the bolt lugs lock into its recesses, so the receiver itself is not stressed.', '4140 steel', 30000],
  chamber: ['Chamber', 'Shaped to the cartridge; it seals behind the bullet and takes the full pressure.', 'Chrome-lined barrel steel', 20000],
  feedramp: ['Feed ramps', 'Guide the nose of each round up into the chamber.', 'Machined into the barrel extension', 30000],
  rollers: ['Locking rollers', 'Two rollers wedged outward into the trunnion. They must be forced inward before the bolt head can move: that delays opening.', 'Hardened steel', 15000],
  lockpiece: ['Locking piece', 'The wedge between the rollers; its angle sets the 4:1 leverage between carrier and bolt head.', 'Hardened steel', 15000],
  cocktube: ['Cocking tube & handle', 'The non-reciprocating cocking handle runs in this tube over the barrel.', 'Steel', 40000],
  slide: ['Slide', 'Holds the firing pin, extractor and breech face; it recoils and returns on the spring.', 'Steel / nitrided', 30000],
  link: ['Barrel link / cam', 'As slide and barrel move back together, the link (or cam block) pulls the rear of the barrel down, out of the slide: unlocked.', 'Steel', 10000],
  slidestop: ['Slide stop pin', 'The axle the barrel link swings on; also holds the slide open on empty.', 'Steel', 30000],
  striker: ['Striker', 'A spring-driven firing pin: partly cocked by the slide, fully cocked and released by the trigger.', 'Steel', 25000],
  strspring: ['Striker spring', 'Drives the striker into the primer.', 'Music wire', 15000],
  trigbar: ['Trigger bar', 'Connects the trigger to the striker/sear; pushed down by the slide to disconnect.', 'Stamped steel', 25000],
  fpblock: ['Firing-pin safety', 'A plunger that blocks the firing pin unless the trigger is fully pulled: drop safety.', 'Steel', 30000],
  toggle: ['Toggle links', 'Two arms hinged like a knee. While straight they lock the breech; recoil drives them over a ramp so the knee breaks upward.', 'Forged steel', 20000],
  breechblock: ['Breech block', 'Holds the cartridge against the chamber.', 'Steel', 30000],
  boltbody: ['Bolt body', 'Turned by the handle: the lugs rotate in and out of their seats in the receiver ring.', 'Forged steel', 40000],
  handle: ['Bolt handle', 'The lever you lift and pull.', 'Forged steel', 50000],
  mainspring: ['Mainspring', 'Powers the firing pin (or hammer, or cock).', 'Music wire / spring steel', 20000],
  cockpiece: ['Cocking piece', 'Rides up the cocking cam when the bolt is lifted: compresses the mainspring.', 'Steel', 40000],
  safetyl: ['Safety lever', 'Locks the firing pin (and bolt) back.', 'Steel', 50000],
  floorplate: ['Floorplate', 'Bottom of the internal magazine; opens to unload it.', 'Steel', 50000],
  lever: ['Lever', 'Swinging it down draws the bolt back through the toggles and lifts the carrier.', 'Steel', 40000],
  lifter: ['Carrier (lifter)', 'Lifts the next round (or shell) from the tube up into line with the chamber.', 'Steel / brass', 20000],
  gate: ['Loading gate', 'The spring door in the side of the receiver through which the tube is loaded.', 'Steel', 30000],
  tubespring: ['Magazine tube spring & follower', 'Pushes the rounds in the tube rearward toward the lifter.', 'Music wire', 15000],
  actionbars: ['Action bars', 'Tie the fore-end to the bolt slide.', 'Steel', 40000],
  boltslide: ['Bolt slide', 'Driven by the action bars; cams the locking block up and down.', 'Steel', 40000],
  lockblock: ['Locking block', 'Tips up into a recess in the barrel extension to lock the bolt.', 'Steel', 30000],
  latches: ['Shell latches', 'Hold the shells in the tube and release one per stroke.', 'Steel', 20000],
  release: ['Action release', 'Unlocks the pump when the hammer is cocked.', 'Steel', 40000],
  hand: ['Hand (pawl)', 'Pushes a ratchet on the back of the cylinder to turn it one chamber per pull.', 'Hardened steel', 15000],
  cylstop: ['Cylinder stop (bolt)', 'Drops out of the cylinder notch while it turns and pops back in to line the chamber up with the barrel.', 'Hardened steel', 15000],
  rebound: ['Rebound slide', 'Returns the trigger and lifts the hammer off the firing pin.', 'Steel + spring', 20000],
  transfer: ['Transfer bar', 'Rises between hammer and firing pin only when the trigger is fully back: the revolver can’t fire if dropped.', 'Steel', 30000],
  crane: ['Crane & ejector rod', 'The cylinder swings out on the crane; the ejector star pushes the empties out.', 'Steel', 40000],
  barrel: ['Barrel', 'Spins the bullet with its rifling; in recoil-operated guns it moves back with the bolt.', 'Chrome-moly / chrome-lined', 15000],
  booster: ['Muzzle booster', 'A cup at the muzzle traps gas to throw the barrel back harder.', 'Steel', 30000],
  feedarm: ['Feed arm & pawls', 'Driven by a cam on the bolt: it swings across, and its pawls drag the belt one round at a time.', 'Steel', 15000],
  feedtray: ['Feed tray', 'Positions the belt round over (or under) the chamber.', 'Stamped steel', 30000],
  trunnion: ['Trunnion', 'The heavy block that the barrel screws into and the bolt locks against.', 'Forged steel', 40000],
  boltcam: ['Bolt cam track', 'A slot in the carrier that turns the bolt.', 'Part of the carrier', 40000],
};
const nameOf = k => (PI_[k] || [k])[0];

// ------------------------------------------------------------------ materials (shared)
let MAT = null;
function mats() {
  if (MAT) return MAT;
  const P = BN.api.pmat;
  MAT = {
    park: P('#3a3d40', .55, .7), steel: P('#9ea4aa', .3, .95), bright: P('#c9cdd2', .22, 1), spring: P('#8fa3b8', .3, .95), blue: P('#2b3a4d', .35, .85),
    brass: P('#c9a14a', .3, 1), copper: P('#b5653a', .32, 1), red: P('#9a3b2c', .55, .35), poly: P('#1f2124', .8, 0), dark: P('#22262a', .5, .6), alu: P('#7c8288', .45, .8),
    tung: P('#55595e', .4, .9), wood: P('#6b4a2c', .7, 0),
  };
  const gm = new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  MAT.gas = gm; MAT.glow = new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false });
  return MAT;
}
const M = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); return o; };
const grp = (x = 0, y = 0, z = 0, ...kids) => { const g = new THREE.Group(); g.position.set(x, y, z); for (const k of kids) g.add(k); return g; };
// a coil spring along z that compresses coil by coil (the wire stays round)
function coil(r, len, n, wire, mat) {
  const g = new THREE.Group(); g.userData.coils = []; g.userData.len = len;
  for (let i = 0; i < n; i++) { const t = M(gTor(r, wire), mat); t.rotation.x = .18; g.add(t); g.userData.coils.push(t); }
  g.userData.set = L => { const cs = g.userData.coils, k = cs.length; for (let i = 0; i < k; i++) cs[i].position.z = -L / 2 + i * L / (k - 1); };
  g.userData.set(len);
  return g;
}
// bullet on its own (so it can leave the case)
function makeBullet(cal) {
  const c = G.CAL[cal] || G.CAL['5.56×45mm'], g = new THREE.Group(), mt = mats();
  if (c.shell) { g.add(M(gCyl(c.cs[1] * .9, c.cs[1] * .9, c.cs[0] * .35, 10), MAT.poly)); return g; }
  const r = c.cs[1] * .78, bl = c.cs[0] * (c.cs[0] > .05 ? .42 : .55);
  g.add(M(gCyl(r, r, bl * .45, 10), mt.copper, 0, 0, -bl * .225));
  g.add(M(gCyl(r, r * .12, bl * .55, 10), mt.copper, 0, 0, -bl * .45 - bl * .275));
  g.userData.len = bl; return g;
}
// a cartridge whose bullet can be fired out of it: origin at the case head
function makeCart(cal) {
  const c = G.CAL[cal] || G.CAL['5.56×45mm'], g = new THREE.Group();
  const cs = G.makeCasing(cal); cs.position.z = -c.cs[0] / 2; g.add(cs);
  const b = makeBullet(cal); b.position.z = -c.cs[0]; g.add(b);
  g.userData.case = cs; g.userData.bullet = b; g.userData.len = c.cs[0] + (b.userData.len || 0);
  g.traverse(o => { o.userData.inner = 'ammo'; });
  return g;
}

// ------------------------------------------------------------------ frame: where everything sits in this particular gun
function frame(B) {
  const wp = B.wp, rig = B.rig, m = wp.m || {};
  const R = m.R || [.2, .05, .04], RL = R[0], RH = R[1], RW = R[2];
  const c = G.CAL[wp.cal] || G.CAL['5.56×45mm'];
  const cl = c.cs[0], cr = c.cs[1];
  const rl = c.shell ? cl : cl * (cl > .05 ? 1.42 : 1.55);
  const by = rig.muzzleY || 0;
  const zr = rig.zr ?? RL * .38, zf = rig.zf ?? -RL * .62;
  const ej = rig.eject ? rig.eject.position : V3(RW * .5, 0, zr - RL * .45);
  const pistol = wp.c === 'PST' || rig.boltType === 'slide';
  // bolt face (case head) when the action is closed: just behind the ejection port's front edge
  let hz = clamp(ej.z + cl * (pistol ? .35 : .5), zf + .004, zr - .01);
  const stroke0 = rig.boltStroke || rig.slideStroke || RL * .3;
  const st = Math.max(stroke0, rl * 1.12);
  return { wp, rig, m, RL, RH, RW, cl, cr, rl, by, zr, zf, hz, st, stroke0, pistol, top: rig.top ?? RH * .5, bot: rig.bot ?? -RH * .5, ej: ej.clone(),
    shell: !!c.shell, muzzleZ: rig.muzzleZ ?? zf - .4, magTopY: by - cr * 2.7, magZ: hz - rl * .5 + rl * .98 };
}

// ------------------------------------------------------------------ action families and their timelines
const FAM = { di: 'gas', short_piston: 'gas', long_piston: 'gas', oprod: 'gas', roller: 'roller', blowback: 'blowback', blowback_delayed: 'blowback', caseless: 'blowback',
  blowback_ob: 'openbolt', roller_recoil: 'mgob', maxim: 'mgcb', browning_mg: 'mgcb', blowback_pistol: 'pistolbb', short_recoil: 'pistolsr', toggle: 'toggle',
  bolt: 'bolt', bolt_straight: 'bolt', lever: 'lever', pump: 'pump', revolver: 'revolver', caprev: 'sarev' };
// phases: [t, label, detail]
const PH = {
  gas: [[0, 'Sear release', 'The trigger tips the sear out of the hammer notch; the hammer swings forward under its spring.'], [.03, 'Ignition', 'The hammer drives the firing pin into the primer; the powder lights and pressure climbs to its peak in a fraction of a millisecond.'], [.07, 'Bullet in the bore', 'The bullet engraves into the rifling and accelerates down the barrel; the case is pressed hard against the chamber walls, sealing it.'], [.1, 'Gas port', 'The bullet passes the port: gas bleeds into the gas system.'], [.18, 'Carrier moves (locked)', 'Gas pushes the carrier back; for the first few millimetres the bolt stays locked while pressure falls.'], [.22, 'Unlock', 'The cam track turns the bolt; its lugs rotate out of the barrel extension.'], [.27, 'Extraction', 'The extractor drags the empty case out of the chamber.'], [.36, 'Ejection', 'The case clears the chamber; the spring-loaded ejector pivots it out of the port.'], [.42, 'Cocking', 'The carrier rides over the hammer and pushes it down; the disconnector catches it while the trigger is held.'], [.5, 'Rear of travel', 'The buffer bottoms out; the action spring is fully compressed.'], [.6, 'Counter-recoil', 'The spring drives carrier and bolt forward.'], [.68, 'Feed', 'The bolt face picks up the top round from the feed lips and pushes it up the ramp.'], [.8, 'Chambering', 'The round slides into the chamber; the extractor snaps over its rim.'], [.84, 'Lock', 'The carrier keeps going; the cam turns the bolt and the lugs lock.'], [.92, 'Trigger reset', 'The trigger is released: the disconnector hands the hammer over to the sear — ready for the next shot.']],
  roller: [[0, 'Sear release', 'The hammer is released and strikes the firing pin.'], [.03, 'Ignition', 'Pressure builds; the case pushes back on the bolt head.'], [.06, 'Delay', 'The rollers must be cammed inward out of their recesses before the bolt head can move: the carrier is forced back four times faster than the head, so the case barely moves while the bullet is still in the bore.'], [.16, 'Rollers free', 'Rollers fully in: bolt head and carrier travel back together.'], [.26, 'Extraction & ejection', 'The case is pulled out (fluted chamber lets it float) and knocked out by the ejector lever.'], [.44, 'Rear', 'Carrier at the rear, recoil spring compressed, hammer cocked.'], [.55, 'Feed', 'The bolt group runs forward and strips the next round.'], [.8, 'Lock-up', 'The locking piece drives the rollers back out into the trunnion recesses.'], [.92, 'Reset', 'Trigger released: the sear takes the hammer.']],
  blowback: [[0, 'Sear release', 'The hammer is released.'], [.03, 'Ignition', 'The primer fires. Nothing locks the bolt: only its mass and the spring hold the case in.'], [.06, 'Bolt moves', 'The bolt starts back while the bullet is still in the bore — slowly, because it is heavy.'], [.25, 'Ejection', 'The case hits the fixed ejector and flips out.'], [.42, 'Rear', 'Bolt at the rear, recoil spring compressed.'], [.55, 'Feed', 'The spring drives the bolt forward to strip the next round.'], [.8, 'Closed', 'Round chambered; the bolt is held only by its spring.'], [.92, 'Reset', 'The sear catches the hammer.']],
  openbolt: [[0, 'Sear release', 'The bolt was held back on the sear. Pulling the trigger drops the sear: the bolt flies forward.'], [.08, 'Feed', 'On the way it strips the top round from the magazine.'], [.22, 'Chambering', 'The round enters the chamber; the extractor grabs the rim.'], [.27, 'Advanced primer ignition', 'The fixed firing pin fires the round a hair before the bolt stops: the bolt’s forward momentum cancels part of the recoil.'], [.32, 'Blowback', 'Gas drives the case and bolt back.'], [.45, 'Ejection', 'The case strikes the fixed ejector and leaves the port.'], [.62, 'Caught on the sear', 'With the trigger released, the sear rises into the bolt’s notch and holds it open — the chamber stays empty and cool.']],
  mgob: [[0, 'Sear release', 'The bolt runs forward from the sear.'], [.1, 'Feed', 'The round is pushed out of the belt link and down into the chamber.'], [.25, 'Lock & fire', 'The locking piece forces the rollers out into the barrel extension; the striker fires the round.'], [.3, 'Recoil', 'Barrel and bolt recoil together, locked.'], [.36, 'Unlock', 'Cam surfaces push the rollers in; the barrel stops, the bolt flies on (helped by the muzzle booster).'], [.44, 'Extraction & belt feed', 'The case is pulled out and thrown down; the bolt’s cam swings the feed arm, and the pawls drag the belt one round across.'], [.62, 'Rear / sear', 'The bolt is caught on the sear — or keeps cycling while the trigger is held.']],
  mgcb: [[0, 'Sear release', 'The firing pin is released.'], [.03, 'Ignition', 'The round fires with the breech locked.'], [.08, 'Barrel recoil', 'Barrel and lock recoil together a short distance.'], [.16, 'Unlock', 'The lock is cammed out; the accelerator throws the bolt back.'], [.26, 'Extraction & feed', 'The case is drawn back and down; the next round is pulled from the belt.'], [.44, 'Rear', 'The bolt hits the buffer.'], [.6, 'Return', 'The driving spring returns the bolt, chambers the round and the lock rises.'], [.92, 'Ready', 'Locked and cocked.']],
  pistolbb: [[0, 'Hammer falls', 'The sear releases the hammer.'], [.03, 'Ignition', 'The round fires.'], [.05, 'Blowback', 'Nothing locks: the slide’s mass and the recoil spring around the fixed barrel hold the case in until pressure drops.'], [.25, 'Ejection', 'The case hits the ejector and flies out.'], [.42, 'Rear', 'Slide fully back, hammer cocked.'], [.55, 'Feed', 'The slide strips the next round.'], [.82, 'In battery', 'Slide forward, round chambered.'], [.92, 'Reset', 'Trigger released, sear re-engaged.']],
  pistolsr: [[0, 'Release', 'The trigger releases the striker (or hammer).'], [.03, 'Ignition', 'The round fires; the barrel and slide are locked together by the barrel hood in the ejection port.'], [.05, 'Locked recoil', 'Barrel and slide recoil together for the first few millimetres.'], [.09, 'Tilt & unlock', 'The link (or cam block) pulls the back of the barrel down, out of the slide; the barrel stops.'], [.2, 'Extraction', 'The slide continues; the extractor pulls the case.'], [.3, 'Ejection', 'The case hits the fixed ejector and flips out of the port.'], [.42, 'Rear', 'Slide fully back; the recoil spring is compressed; the striker is held by the sear.'], [.56, 'Feed', 'The spring returns the slide; the breech face strips the next round.'], [.76, 'Lock', 'The slide pushes the barrel forward and up: the hood locks into the port.'], [.9, 'Reset', 'Trigger released — reset click.']],
  toggle: [[0, 'Release', 'The striker is released.'], [.03, 'Ignition', 'Toggle links straight: locked.'], [.06, 'Recoil', 'Barrel, receiver and toggle recoil together.'], [.12, 'Knee breaks', 'The toggle’s rollers hit the frame ramps: the knee breaks upward and the breech block is drawn back.'], [.3, 'Ejection', 'The case flies up out of the top.'], [.45, 'Open', 'Toggle fully up.'], [.6, 'Close', 'The spring in the grip pulls the links straight; the block strips and chambers the next round.'], [.9, 'Locked', 'Straight again.']],
  bolt: [[0, 'Release', 'The sear drops out of the cocking piece; the mainspring drives the firing pin forward.'], [.03, 'Ignition', 'The round fires; the lugs carry all the pressure.'], [.15, 'Lift', 'You lift the handle: the lugs rotate out of their seats, the cocking cam lifts the cocking piece and compresses the mainspring, and primary extraction cams the case loose.'], [.3, 'Draw back', 'The extractor claw pulls the case out of the chamber.'], [.44, 'Ejection', 'The case hits the ejector blade in the receiver and is thrown out.'], [.55, 'Push forward', 'The bolt face strips the next round from the magazine.'], [.7, 'Chambering', 'The round is pushed home; the extractor slips over the rim.'], [.74, 'Turn down', 'The lugs rotate into their seats; the sear catches the cocking piece.'], [.9, 'Ready', 'Cocked and locked.']],
  lever: [[0, 'Hammer falls', 'The hammer strikes the firing pin.'], [.03, 'Ignition', 'The round fires.'], [.2, 'Lever down', 'The lever pulls the toggle links: the bolt slides back and cocks the hammer.'], [.32, 'Extraction', 'The extractor pulls the case and it is ejected.'], [.4, 'Lift', 'The magazine spring pushes the next round onto the carrier, which lifts it into line with the chamber.'], [.5, 'Lever up', 'The bolt drives the round into the chamber; the toggles straighten and lock.'], [.9, 'Ready', 'Hammer cocked.']],
  pump: [[0, 'Hammer falls', 'The hammer hits the firing pin.'], [.03, 'Ignition', 'The shell fires; the action release unlocks the pump.'], [.2, 'Pump back', 'The action bars pull the bolt slide back; it cams the locking block down and draws the bolt.'], [.3, 'Extraction', 'The shell is pulled out and ejected.'], [.38, 'Lift', 'A shell latch releases one shell from the tube onto the lifter, which raises it.'], [.5, 'Pump forward', 'The bolt chambers the shell; the locking block tips up and locks.'], [.9, 'Ready', 'Hammer cocked by the rearward stroke.']],
  sarev: [[0, 'Thumb the hammer', 'Cocking the hammer lifts the hand against the ratchet on the back of the cylinder.'], [.1, 'Rotation', 'The cylinder turns one chamber; the bolt drops out of its notch.'], [.38, 'Lock-up', 'The bolt springs up into the next notch: chamber, nipple and barrel line up. Full cock.'], [.5, 'Trigger', 'A light pull lifts the sear out of the full-cock notch.'], [.55, 'Hammer falls', 'The V mainspring drives the hammer onto the percussion cap on the nipple.'], [.6, 'Ignition', 'The cap flashes down the nipple into the powder; the ball is driven out. Cap fragments fly — they can jam the action.']],
  revolver: [[0, 'Trigger pull', 'The trigger starts back; it lifts the hammer through the double-action strut.'], [.05, 'Cylinder unlocks', 'The cylinder stop drops out of its notch.'], [.1, 'Rotation', 'The hand pushes the ratchet: the cylinder turns one chamber.'], [.42, 'Lock-up', 'The cylinder stop snaps into the next notch: chamber and barrel line up.'], [.5, 'Transfer bar up', 'The transfer bar rises between hammer and firing pin.'], [.55, 'Release', 'The strut slips off: the hammer falls on the transfer bar.'], [.6, 'Ignition', 'The round fires; gas escapes at the barrel-cylinder gap.'], [.75, 'Reset', 'The rebound slide pushes the trigger forward and pulls the hammer back to rest.']],
};
// t (0..1) → real milliseconds: [t, ms] keyframes, cycle time from the rate of fire
function msMap(fam, H, wp) {
  const cyc = H && H.cycle ? H.cycle : 600, lock = (H && H.lock) || 5;
  const fast = ['gas', 'roller', 'blowback', 'openbolt', 'mgob', 'mgcb', 'pistolbb', 'pistolsr', 'toggle'].includes(fam);
  if (fam === 'openbolt' || fam === 'mgob') return [[0, 0], [.27, cyc * .42], [.36, cyc * .42 + 1.1], [1, cyc]];
  if (fast) return [[0, 0], [.03, lock], [.12, lock + 1.1], [.2, lock + 2.4], [1, Math.max(cyc, lock + 30)]];
  if ((fam === 'revolver' || fam === 'sarev')) return [[0, 0], [.55, 260], [.6, 266], [.68, 267.2], [1, 420]];
  return [[0, 0], [.03, lock], [.1, lock + 1.4], [.2, 450], [1, 1700]]; // a practiced shooter working a manual action
}
const msAt = (map, t) => { for (let i = 1; i < map.length; i++) if (t <= map[i][0]) { const [a, ma] = map[i - 1], [b, mb] = map[i]; return ma + (mb - ma) * (t - a) / Math.max(1e-6, b - a); } return map[map.length - 1][1]; };
// peak chamber pressure (MPa), roughly by cartridge
function peakMPa(wp) {
  const c = G.CAL[wp.cal] || { cs: [.045, .0057] };
  if (c.shell) return 80; if (/ball|Minié|cap & ball|musket/.test(wp.cal)) return 70;
  if (/×19|ACP|Luger|Nambu|×18|×17|S&W|Colt|Webley|×21|×23|×25|Special|Longue|Glisenti|Steyr|Mauser|Short|Schofield|pinfire|Gasser|Japanese|German/.test(wp.cal)) return /Magnum|×25|500|AE/.test(wp.cal) ? 240 : /ACP|Colt|Webley|S&W/.test(wp.cal) ? 145 : 235;
  return c.cs[0] < .04 ? 340 : c.cs[0] > .07 ? 420 : 380;
}
// the cycle state at time t, for a given gun. All travel figures are 0..1 of the full stroke.
function kin(fam, t, F, mode) {
  const K = { t, fam, trig: 0, h: 1, disc: 0, sear: 1, asear: 0, c: 0, bolt: 0, unlock: 0, b: 0, tilt: 0, tog: 0, bp: -1, gas: 0, gasOn: false, press: 0, fired: false, ej: 0, fp: 0, fol: 0, lift: 0, cyl: 0, hand: 0, stop: 1, xfer: 0, pump: 0, lever: 0, rin: 0, auto: mode === 'auto' };
  const P = (t0, t1) => { const x = seg(t, t0, t1); return x <= 0 || x >= 1 ? 0 : x < .12 ? x / .12 : Math.exp(-(x - .12) * 4.2); };
  const auto = mode === 'auto';
  const trigSemi = t < .9 ? 1 : 1 - seg(t, .9, .95);
  const closed = (fireT, bEnd, recS, recE, retS, retE) => {
    K.trig = auto ? 1 : trigSemi; K.fired = t >= fireT; K.bp = t < fireT ? -1 : seg(t, fireT, bEnd); K.press = P(fireT, bEnd);
    K.c = t < recS ? 0 : t < recE ? eOut(seg(t, recS, recE)) : t < retS ? 1 : t < retE ? 1 - eIn(seg(t, retS, retE)) : 0;
    K.h = t < fireT ? 1 - eIn(seg(t, 0, fireT)) : t < recE ? clamp(K.c / .35, 0, 1) : 1;
    K.disc = !auto && t > recE * .9 && t < .93 ? 1 : 0; K.sear = !auto && t >= .94 ? 1 : 0;
    K.asear = auto ? (t > retE + .01 ? 1 : 0) : 0;
  };
  if (fam === 'gas') {
    closed(.03, .12, .18, .5, .55, .86);
    K.gas = seg(t, .08, .2); K.gasOn = t > .08 && t < .3;
    const f1 = .14; K.unlock = clamp((K.c - .02) / .1, 0, 1); K.bolt = Math.max(0, K.c - f1) / (1 - f1);
  } else if (fam === 'roller') {
    closed(.03, .12, .05, .44, .52, .86);
    K.rin = clamp(K.c / .12, 0, 1); K.bolt = K.c < .12 ? K.c * .25 / 1 : .03 + (K.c - .12) * (.97 / .88);
  } else if (fam === 'blowback' || fam === 'pistolbb') {
    closed(.03, .12, .045, .42, .5, .85); K.bolt = K.c;
  } else if (fam === 'pistolsr') {
    closed(.03, .12, .045, .42, .52, .84);
    K.bolt = K.c; K.b = Math.min(K.c, .1) / .1; K.tilt = seg(K.c, .05, .13);
  } else if (fam === 'toggle') {
    closed(.03, .12, .045, .45, .55, .88); K.b = Math.min(K.c, .08) / .08; K.tog = seg(K.c, .06, 1); K.bolt = K.c;
  } else if (fam === 'mgcb') {
    closed(.03, .12, .05, .44, .55, .86); K.b = Math.min(K.c, .14) / .14; K.unlock = seg(K.c, .08, .16); K.bolt = K.c;
  } else if (fam === 'openbolt' || fam === 'mgob') {
    const fireT = .27; K.trig = auto ? 1 : t < .5 ? 1 : 1 - seg(t, .5, .56);
    K.c = t < .02 ? 1 : t < fireT ? 1 - eIn(seg(t, .02, fireT)) : t < .62 ? eOut(seg(t, fireT + .02, .62)) : 1;
    if (t >= fireT && t < fireT + .02) K.c = 0;
    K.fired = t >= fireT; K.bp = t < fireT ? -1 : seg(t, fireT, fireT + .08); K.press = P(fireT, fireT + .08);
    K.sear = t < .02 || (!auto && t > .61) ? 1 : 0; K.h = 0; K.bolt = K.c;
    if (fam === 'mgob') { K.b = t > fireT ? Math.min(K.c, .14) / .14 * (t < .5 ? 1 : 1 - seg(t, .5, .6)) : 0; K.unlock = t > fireT ? seg(K.c, .08, .16) : 1 - seg(t, .2, fireT); }
  } else if (fam === 'bolt') {
    K.trig = t < .1 ? 1 : t > .9 ? seg(t, .9, 1) : 0; K.fired = t >= .03; K.bp = t < .03 ? -1 : seg(t, .03, .1); K.press = P(.03, .1);
    K.unlock = t < .15 ? 0 : t < .28 ? eIO(seg(t, .15, .28)) : t < .72 ? 1 : 1 - eIO(seg(t, .72, .8));
    K.c = t < .3 ? 0 : t < .46 ? eIO(seg(t, .3, .46)) : t < .55 ? 1 : t < .71 ? 1 - eIO(seg(t, .55, .71)) : 0;
    K.h = t < .03 ? 1 - seg(t, 0, .03) : F && F.cockOnClose ? (t < .72 ? 0 : seg(t, .72, .8)) : (t < .3 ? K.unlock * .9 : t < .72 ? .9 : .9 + seg(t, .72, .8) * .1);
    K.sear = t > .78 || t < .0 ? 1 : 0; K.bolt = K.c;
  } else if (fam === 'lever' || fam === 'pump') {
    K.trig = t < .1 ? 1 : 0; K.fired = t >= .03; K.bp = t < .03 ? -1 : seg(t, .03, .1); K.press = P(.03, .1);
    K.c = t < .2 ? 0 : t < .36 ? eIO(seg(t, .2, .36)) : t < .5 ? 1 : t < .68 ? 1 - eIO(seg(t, .5, .68)) : 0;
    K.unlock = fam === 'pump' ? clamp(K.c / .1, 0, 1) : clamp(K.c / .08, 0, 1);
    K.h = t < .03 ? 1 - seg(t, 0, .03) : t < .36 ? clamp(K.c / .6, 0, 1) : 1; K.sear = t > .4 ? 1 : 0; K.bolt = K.c;
    K.lift = t < .38 ? 0 : t < .46 ? seg(t, .38, .46) : t < .56 ? 1 : 1 - seg(t, .56, .62);
    K.pump = K.lever = K.c;
  } else if (fam === 'sarev') {
    K.h = t < .4 ? eIO(seg(t, 0, .4)) : t < .55 ? 1 : t < .6 ? 1 - eIn(seg(t, .55, .6)) : 0; K.trig = t < .5 ? 0 : t < .75 ? seg(t, .5, .55) : 1 - seg(t, .75, .85);
    K.cyl = seg(t, .08, .38); K.hand = K.h; K.stop = t < .06 ? 1 - seg(t, 0, .06) : t < .36 ? 0 : seg(t, .36, .4); K.xfer = 0; K.sear = t > .4 && t < .55 ? 1 : 0;
    K.fired = t >= .6; K.bp = t < .6 ? -1 : seg(t, .6, .68); K.press = P(.6, .68);
  } else if (fam === 'revolver') {
    K.trig = t < .55 ? eIO(seg(t, 0, .55)) : t < .75 ? 1 : 1 - seg(t, .75, .95);
    K.h = t < .55 ? seg(t, 0, .55) : t < .6 ? 1 - eIn(seg(t, .55, .6)) : 0; K.sear = 0;
    K.cyl = seg(t, .1, .42); K.hand = K.trig; K.stop = t < .05 ? 1 - seg(t, 0, .05) : t < .4 ? 0 : seg(t, .4, .45); K.xfer = t < .3 ? 0 : t < .75 ? seg(t, .3, .5) : 1 - seg(t, .75, .9);
    K.fired = t >= .6; K.bp = t < .6 ? -1 : seg(t, .6, .68); K.press = P(.6, .68);
  }
  return K;
}
// the state when the gun is simply being handled (action dragged by hand, no firing)
function kinManual(fam, B) {
  const p = clamp(B.open || 0, 0, 1);
  const K = kin(fam, 0, null, 'semi');
  K.trig = 0; K.bp = -1; K.press = 0; K.fired = false; K.h = B.cocked || p > .3 ? 1 : 0; K.sear = K.h ? 1 : 0; K.disc = 0;
  if (fam === 'bolt') { K.unlock = Math.min(1, p / .25); K.c = K.bolt = Math.max(0, (p - .25) / .75); }
  else if ((fam === 'revolver' || fam === 'sarev')) { K.h = B.cocked ? 1 : 0; }
  else { K.c = p; K.bolt = fam === 'gas' ? Math.max(0, p - .14) / .86 : fam === 'roller' ? (p < .12 ? p * .25 : .03 + (p - .12) * (.97 / .88)) : p;
    K.unlock = fam === 'gas' ? clamp((p - .02) / .1, 0, 1) : fam === 'mgcb' || fam === 'mgob' ? seg(p, .08, .16) : clamp(p / .1, 0, 1);
    K.rin = clamp(p / .12, 0, 1); K.tilt = fam === 'pistolsr' ? seg(p, .05, .13) : 0; K.b = fam === 'pistolsr' ? Math.min(p, .1) / .1 : 0; K.tog = fam === 'toggle' ? seg(p, .06, 1) : 0;
    K.pump = K.lever = p; }
  if (fam === 'openbolt' || fam === 'mgob') { if (p < .02 && !B.chamber) K.c = K.bolt = 0; }
  K.manual = true;
  return K;
}

// ------------------------------------------------------------------ building the mechanism
function build2(B) {
  const wp = B.wp, rig = B.rig, os = G.opSystem(wp, rig), fam = FAM[os];
  if (!fam || wp.custom && !rig) return null;
  const F = frame(B), mt = mats();
  F.cockOnClose = /smle|no4|no5|lee|enfield|ross/.test(wp.id + ' ' + wp.n.toLowerCase());
  const g = new THREE.Group(); g.name = 'inner'; B.root.add(g);
  const parts = [], fixed = [];
  const T = mt.steel.clone(); T.transparent = true; T.opacity = .5; T.depthWrite = false; // housings you can see through
  const Tp = mt.park.clone(); Tp.transparent = true; Tp.opacity = .42; Tp.depthWrite = false;
  const tag = (o, key) => { o.userData.inner = key; o.traverse(c => { c.userData.inner = key; }); return o; };
  // a removable part. parent: the group it rides on (bolt, carrier…); motion(K, obj) poses it
  const P = (key, obj, motion, parent, strip) => { tag(obj, key); { const cm = new Map(); obj.traverse(o => { if (o.isMesh && o.material) { if (!cm.has(o.material)) cm.set(o.material, o.material.clone()); o.material = cm.get(o.material); } }); } (parent || g).add(obj); const p = { key, name: nameOf(key), obj, home: obj.position.clone(), rot: obj.rotation.clone(), motion: motion ? (K => { if (K && K.fam) motion(K, obj); }) : null, strip, info: PI_[key] }; parts.push(p); return p; };
  // a fixed part of the gun (chamber, ramps…) that stays when stripped, shown for context
  const FX = (key, obj) => { tag(obj, key); obj.userData.fixed = true; g.add(obj); fixed.push({ key, name: nameOf(key), obj, info: PI_[key] }); return obj; };
  const st = F.st, hz = F.hz, by = F.by, cr = F.cr, cl = F.cl, rl = F.rl;
  const BW = Math.max(cr * 1.7, F.RW * .15);
  const dB = K => K.bolt * st, dC = K => K.c * st;
  const auto = (wp.modes || []).some(x => x === 'auto' || /burst/.test(x));
  const tube = fam === 'lever' || fam === 'pump' || (F.m.mag && /tube/.test(String(F.m.mag[0])));
  const belt = fam === 'mgob' || fam === 'mgcb' || /belt/.test(String(F.m.mag && F.m.mag[0])) || wp.act === 'auto_ob' && wp.c === 'LMG';
  F.belt = belt; F.tube = tube && !belt;
  F.tubeY = by - cr * 3.6;
  F.liftY = by - cr * .25;
  // magazine position from the gun's own magazine if it is sensible
  if (rig.magHome && !belt && !F.tube) { const mz = rig.magHome.pos.z; if (mz > hz - rl * .6 && mz < hz + rl * 2.2) F.magZ = mz; }
  F.magHead = F.magZ + rl * .5; // case head of the top round
  if (F.magHead < hz + rl * .9) F.magHead = hz + rl * .98;

  // ---- chamber and feed ramps (fixed, see-through)
  if ((fam !== 'revolver' && fam !== 'sarev')) {
    const ch = M(gCyl(cr * 1.9, cr * 1.9, cl * 1.05, 14, true), T, 0, by, hz - cl * .52); FX('chamber', ch);
    if (!F.tube && !belt) for (const s of [-1, 1]) { const r = M(gBox(cr * .5, cr * .9, cl * .35), mt.bright, s * cr * .7, by - cr * 1.9, hz - cl * .05); r.rotation.x = .55; FX('feedramp', r); }
  }
  // ================================================================ trigger mechanisms
  // pivot points in the lower receiver, from the gun's own trigger where there is one
  const trigZ = rig.trigger ? rig.trigger.position.z : hz + Math.max(st * .9, rl * 1.4);
  const trigY = rig.trigger ? rig.trigger.position.y : F.bot - .004;
  const hp = V3(0, (by - BW * 1.5 + F.bot) / 2, Math.max(trigZ + .012, hz + Math.min(st * .9, rl * 1.6)));
  const HL = Math.max(.012, by - BW * .35 - hp.y);
  function hammerGroup(withDisc, withAuto) {
    const hg = grp(hp.x, hp.y, hp.z);
    const body = M(gRBox(BW * .9, HL, BW * .55, .002), mt.park, 0, HL / 2, 0); hg.add(body);
    hg.add(M(gCylX(BW * .32, BW * .32, BW * 1.0, 12), mt.dark, 0, 0, 0)); // pivot boss
    const notch = M(gBox(BW * .9, HL * .12, BW * .3), mt.bright, 0, HL * .18, BW * .3); hg.add(notch);
    P('hammer', hg, K => { hg.rotation.x = -.15 + K.h * 1.38; });
    const hs = grp(hp.x, hp.y, hp.z); hs.add(M(gTor(BW * .42, BW * .07), mt.spring)); hs.children[0].rotation.y = PI / 2;
    const legA = M(gBox(BW * .08, BW * .08, HL * .7), mt.spring, BW * .46, -BW * .2, -HL * .35); hs.add(legA);
    P('hspring', hs, K => { legA.rotation.x = -.2 + K.h * .25; });
    // trigger: pivot, blade down into the guard, tail back under the hammer
    const tg = grp(0, hp.y - BW * .2, Math.min(trigZ, hp.z - BW * 1.4));
    const bladeL = Math.max(.012, tg.position.y - trigY + .012);
    const blade = M(gRBox(BW * .5, bladeL, BW * .5, .002), mt.park, 0, -bladeL / 2, 0); blade.rotation.x = .2; tg.add(blade);
    tg.add(M(gCylX(BW * .25, BW * .25, BW * .9, 10), mt.dark));
    const tail = M(gBox(BW * .6, BW * .3, hp.z - tg.position.z + BW * .3), mt.park, 0, BW * .05, (hp.z - tg.position.z) / 2); tg.add(tail);
    P('trigger', tg, K => { tg.rotation.x = -K.trig * .28; });
    const ts = coil(BW * .14, BW * .9, 6, BW * .025, mt.spring); ts.rotation.x = PI / 2; ts.position.set(0, tg.position.y - BW * .5, tg.position.z + BW * .9); P('tspring', ts, K => { ts.userData.set(BW * (.9 - K.trig * .35)); });
    if (withDisc) { const d = grp(0, tg.position.y + BW * .2, hp.z - BW * .7); d.add(M(gBox(BW * .35, BW * .25, BW * 1.3), mt.bright, 0, 0, BW * .5)); const hook = M(gBox(BW * .35, BW * .5, BW * .2), mt.bright, 0, BW * .3, BW * 1.1); d.add(hook);
      P('disconnector', d, K => { d.rotation.x = -K.trig * .28 + (K.disc ? .18 : 0); }); }
    if (withAuto) { const a = grp(0, hp.y + HL * .55, hp.z + HL * .45); a.add(M(gBox(BW * .5, HL * .45, BW * .3), mt.bright, 0, -HL * .2, 0)); a.add(M(gCylX(BW * .18, BW * .18, BW * .8, 8), mt.dark));
      P('autosear', a, K => { a.rotation.x = K.asear ? -.35 : 0; }); }
    const sel = grp(0, tg.position.y + BW * .6, hp.z + BW * .4); sel.add(M(gCylX(BW * .32, BW * .32, F.RW * 1.05, 12), mt.dark)); sel.add(M(gBox(BW * .15, BW * .5, BW * .15), mt.bright, F.RW * .52, BW * .3, 0));
    P('selector', sel, K => { sel.rotation.x = (K.auto ? 2 : 1) * PI / 2; });
    return { hg, tg };
  }
  function strikerGroup(z0, len) { // pistols and rifles with a spring-driven striker
    const s = grp(0, by + cr * .1, z0); s.add(M(gCyl(cr * .35, cr * .28, len, 8), mt.bright, 0, 0, len / 2)); s.add(M(gBox(cr * .9, cr * 1.4, cr * .7), mt.bright, 0, -cr * .5, len * .85));
    return s;
  }
  // ================================================================ magazines, tubes and belts
  const stack = [], beltR = [], tubeR = [];
  function boxMag() {
    const fol = grp(0, F.magTopY - cr * 1.75 * 6, F.magHead - rl * .5); fol.add(M(gRBox(cr * 3.2, cr * .8, rl * .92, .001), mt.red)); fol.add(M(gBox(cr * 1.4, cr * .5, rl * .3), mt.red, cr * .6, cr * .5, -rl * .2));
    P('follower', fol, K => { fol.position.y = F.magTopY - cr * 1.75 * (Math.min(6, F.nStack) + 1) + K.fol * cr * 1.75; });
    const ms = coil(cr * 1.3, rl * .55, 8, cr * .09, mt.spring); ms.scale.x = 1.6; ms.rotation.x = PI / 2; ms.position.set(0, fol.position.y - rl * .3, fol.position.z);
    P('magspring', ms, K => { const y0 = F.magTopY - cr * 1.75 * (Math.min(6, F.nStack) + 1) + K.fol * cr * 1.75; ms.position.y = y0 - cr * .4 - rl * .26; });
    for (const s of [-1, 1]) { const lip = M(gBox(cr * .3, cr * .6, rl * .7), mt.dark, s * cr * 1.25, F.magTopY + cr * .55, F.magHead - rl * .45); FX('feedlips', lip); }
    if (fam === 'gas' || fam === 'pistolsr' || fam === 'roller') { const bc = grp(-F.RW * .45, F.magTopY + cr * 1.5, F.magHead - rl * .9); bc.add(M(gBox(F.RW * .08, cr * 2.2, rl * .35), mt.park)); P('boltcatch', bc, null); }
  }
  // ================================================================ the actions
  const ROT = { di: .39, short_piston: .39, long_piston: .61, oprod: .7 }[os] || .4;
  let carRear = hz + st * .5;
  if (fam === 'gas') {
    const carL = Math.max(rl * 2.1, F.RL * .4), carR = BW * 1.42, boltL = cl * .9 + .012;
    const boltG = grp(0, by, hz);
    boltG.add(M(gCyl(BW, BW, boltL, 16), mt.bright, 0, 0, boltL / 2));
    const nl = os === 'long_piston' || os === 'oprod' ? 2 : 7;
    const lugG = grp(); for (let i = 0; i < nl; i++) { const a = (i + .5) / (nl === 7 ? 8 : nl) * 2 * PI; lugG.add(M(gBox(BW * (nl === 2 ? .7 : .38), BW * .34, cl * .14), mt.bright, Math.cos(a) * BW * 1.12, Math.sin(a) * BW * 1.12, cl * .07)); }
    boltG.add(lugG);
    P('bolthead', boltG, K => { boltG.position.z = hz + dB(K); boltG.rotation.z = -K.unlock * ROT; });
    const ex = grp(BW * .95, 0, 0); ex.add(M(gBox(BW * .22, BW * .4, boltL * .7), mt.dark, 0, 0, boltL * .35)); ex.add(M(gBox(BW * .3, BW * .32, BW * .25), mt.dark, -BW * .1, 0, .002));
    P('extractor', ex, null, boltG, 'Push out the extractor pin and lift the extractor off the bolt');
    const exs = coil(BW * .14, BW * .5, 5, BW * .03, mt.spring); exs.rotation.x = PI / 2; exs.position.set(BW * 1.1, BW * .32, boltL * .55); P('exspring', exs, null, boltG);
    const ejc = M(gCyl(BW * .16, BW * .16, boltL * .45, 8), mt.steel, -BW * .45, -BW * .35, boltL * .2); P('ejector', ejc, K => { ejc.position.z = boltL * .2 - (K.ej > 0 && K.ej < .5 ? BW * .2 : 0); }, boltG, 'Drift out the roll pin; the ejector and its spring jump out of the bolt face');
    const ejs = coil(BW * .12, boltL * .35, 6, BW * .025, mt.spring); ejs.position.set(-BW * .45, -BW * .35, boltL * .6); P('ejspring', ejs, null, boltG);
    if (nl === 7) { const gr = grp(0, 0, boltL * .82); for (let i = 0; i < 3; i++) { const r = M(gTor(BW * .93, BW * .06), mt.dark); r.position.z = i * BW * .2; gr.add(r); } P('gasrings', gr, null, boltG, 'Slide the three gas rings off the bolt tail (stagger the gaps when refitting)'); }
    // carrier, see-through so the bolt and firing pin show inside
    const cz0 = hz + boltL * .35 + carL / 2; carRear = cz0 + carL / 2;
    const car = grp(0, by, cz0); car.add(M(gCyl(carR, carR, carL, 18), T)); car.add(M(gBox(carR * .5, carR * .18, carL * .35), mt.dark, 0, -carR * .92, carL * .15));
    const track = M(gBox(carR * .35, carR * .12, carL * .3), mt.red, carR * .25, carR * .97, -carL * .3); track.rotation.y = .35; car.add(track);
    P('carrier', car, K => { car.position.z = cz0 + dC(K); });
    const cp = M(gCylY(BW * .2, BW * .2, carR * .9, 10), mt.bright, 0, 0, 0);
    P('campin', cp, K => { const a = -K.unlock * ROT; cp.position.set(Math.sin(-a) * carR * .5, by + Math.cos(a) * carR * .5, hz + boltL * .7 + dB(K)); cp.rotation.z = a; });
    const fpL = boltL + carL * .55;
    const fp = M(gCyl(BW * .17, BW * .12, fpL, 8), mt.bright, 0, by, hz + fpL / 2 + .001);
    P('firingpin', fp, K => { const strike = !K.manual && K.t > .028 && K.t < .07 ? -.0016 : 0; fp.position.z = hz + fpL / 2 + .001 + dB(K) + strike; });
    const ret = M(gCylX(BW * .07, BW * .07, carR * 2.1, 6), mt.steel, 0, 0, carL * .1); P('fpretain', ret, null, car, 'Pull the firing-pin retaining pin (cotter) out of the carrier');
    // gas system
    const gbZ = Math.max(F.muzzleZ + .04, hz - cl - Math.abs(F.muzzleZ - hz) * (os === 'oprod' ? .8 : .45));
    const tubeY = by + carR * .95 + BW * .25;
    if (os === 'di') {
      const key = grp(0, carR * .95 + BW * .25, -carL * .25); key.add(M(gRBox(BW * .55, BW * .5, carL * .35, .001), mt.park)); for (const s of [-1, 1]) key.add(M(gCylY(BW * .08, BW * .08, BW * .35, 6), mt.bright, 0, BW * .35, s * carL * .1));
      P('gaskey', key, null, car, 'Unscrew the two staked gas-key screws (only if it is loose — it is staked for a reason)');
      const keyZ = cz0 - carL * .42, tl = keyZ - gbZ;
      FX('gastube', M(gCyl(BW * .14, BW * .14, tl, 8), mt.bright, 0, tubeY, gbZ + tl / 2));
      F.gasPath = [V3(0, by + cr, gbZ), V3(0, tubeY, gbZ), V3(0, tubeY, keyZ - .002)];
    } else {
      const long = os === 'long_piston' || os === 'oprod';
      const pL = long ? Math.max(.06, (cz0 - carL / 2) - gbZ - .01) : Math.max(.03, Math.min(.07, (cz0 - carL / 2 - gbZ) * .35));
      const cyl = M(gCyl(BW * .48, BW * .48, long ? pL * .35 : pL * 1.2, 12, true), Tp, 0, tubeY, gbZ + (long ? pL * .17 : pL * .5)); FX('gascyl', cyl);
      const pis = grp(0, tubeY, gbZ + pL / 2 + .002); pis.add(M(gCyl(BW * .32, BW * .3, pL, 10), mt.bright)); pis.add(M(gCyl(BW * .42, BW * .42, BW * .25, 12), mt.bright, 0, 0, -pL / 2));
      if (long) P('piston', pis, K => { pis.position.z = gbZ + pL / 2 + .002 + dC(K); });
      else {
        const sh = K => K.manual ? Math.min(K.c, .12) * st : (K.t < .55 ? Math.min(K.c, .12) * st : 0);
        P('piston', pis, K => { pis.position.z = gbZ + pL / 2 + .002 + sh(K); });
        const orL = Math.max(.02, (cz0 - carL / 2) - (gbZ + pL) - .003);
        const orod = M(gCyl(BW * .16, BW * .16, orL, 8), mt.bright, 0, tubeY, gbZ + pL + orL / 2 + .002); P('oprod', orod, K => { orod.position.z = gbZ + pL + orL / 2 + .002 + sh(K); });
        const psp = coil(BW * .26, orL * .45, 8, BW * .03, mt.spring); psp.position.set(0, tubeY, gbZ + pL + orL * .3); P('pistonspring', psp, K => { const d = sh(K); psp.userData.set(orL * .45 - d * .6); psp.position.z = gbZ + pL + orL * .3 + d * .7; });
      }
      if (os === 'oprod') { const orL = Math.max(.08, cz0 - gbZ); const r = grp(BW * 1.9, by, gbZ + orL / 2); r.add(M(gRBox(BW * .35, BW * .45, orL, .002), mt.park)); r.add(M(gBox(BW * .5, BW * .5, BW * .6), mt.park, BW * .4, 0, orL / 2 - BW * .3));
        P('oprod', r, K => { r.position.z = gbZ + orL / 2 + dC(K); }); }
      F.gasPath = [V3(0, by + cr, gbZ), V3(0, tubeY, gbZ), V3(0, tubeY, gbZ + .006)];
    }
    FX('gasblock', M(gRBox(BW * 1.6, (tubeY - by) + BW * 1.3, BW * 1.4, .002), Tp, 0, (tubeY + by) / 2, gbZ));
    FX('barrelext', M(gCyl(BW * 1.55, BW * 1.55, cl * .28, 16, true), Tp, 0, by, hz - cl * .1));
    // buffer and action spring: into the stock on AR-pattern guns, on a guide rod behind the carrier otherwise
    const arStock = (F.m.t === 'ar' || F.m.t === 'scar') && rig.stockEnd && rig.stockEnd.z > carRear + .05;
    const bufL = arStock ? rl * 1.5 : 0;
    if (arStock) { const buf = grp(0, by, carRear + bufL / 2); buf.add(M(gCyl(BW * 1.05, BW * 1.05, bufL, 12), mt.alu)); buf.add(M(gCyl(BW * .8, BW * .8, BW * .3, 12), mt.poly, 0, 0, bufL / 2)); for (let i = 0; i < 3; i++) buf.add(M(gCyl(BW * .5, BW * .5, bufL * .22, 8), mt.tung, 0, 0, -bufL * .3 + i * bufL * .25));
      P('buffer', buf, K => { buf.position.z = carRear + bufL / 2 + dC(K); }, null, 'Press the buffer retainer and draw the buffer and spring out of the tube'); }
    const end = arStock ? Math.max(rig.stockEnd.z - .02, carRear + bufL + st * 1.6) : Math.max(F.zr, carRear + st * 1.6);
    const s0 = carRear + bufL, L0 = end - s0;
    const sp = coil(arStock ? BW * .95 : BW * .4, L0, Math.max(12, Math.round(L0 / (cr * .55))), BW * .055, mt.spring); sp.position.set(0, by + (arStock ? 0 : carR * .4), s0 + L0 / 2);
    P('spring', sp, K => { const L = Math.max(L0 * .3, L0 - dC(K)); sp.userData.set(L); sp.position.z = end - L / 2; });
    if (!arStock) { const gr = M(gCyl(BW * .14, BW * .14, L0, 6), mt.bright, 0, by + carR * .4, s0 + L0 / 2); P('guide', gr, K => { gr.position.z = s0 + L0 / 2 + dC(K) * .0; }); }
    hammerGroup(true, auto);
    if (!belt) boxMag();
  }
  else if (fam === 'roller') {
    const headL = cl * .75, carL = Math.max(rl * 2, F.RL * .35);
    const head = grp(0, by, hz); head.add(M(gCyl(BW, BW, headL, 14), mt.bright, 0, 0, headL / 2));
    P('bolthead', head, K => { head.position.z = hz + dB(K); });
    const rol = grp(0, 0, headL * .6); for (const s of [-1, 1]) rol.add(M(gCylY(BW * .28, BW * .28, BW * .9, 12), mt.bright, s * BW * 1.08, 0, 0));
    P('rollers', rol, K => { rol.children.forEach((c, i) => { c.position.x = (i ? 1 : -1) * BW * (1.08 - K.rin * .36); }); }, head, 'Rotate the bolt head out of the carrier: the rollers come with it; push them out of their sockets');
    const ex = M(gBox(BW * .25, BW * .35, headL * .8), mt.dark, BW * .9, BW * .3, headL * .4); P('extractor', ex, null, head);
    const lp = grp(0, by, hz + headL + cl * .2); lp.add(M(gCyl(BW * .55, BW * .25, cl * .4, 10), mt.bright)); for (const s of [-1, 1]) { const w = M(gBox(BW * .3, BW * .6, cl * .35), mt.bright, s * BW * .55, 0, -cl * .02); w.rotation.y = s * .45; lp.add(w); }
    const cz0 = hz + headL + cl * .2 + carL / 2; carRear = cz0 + carL / 2;
    P('lockpiece', lp, K => { lp.position.z = hz + headL + cl * .2 + dC(K); });
    const car = grp(0, by, cz0); car.add(M(gCyl(BW * 1.3, BW * 1.3, carL, 16), T)); car.add(M(gBox(BW * 1.2, BW * .5, carL * .9), mt.park, 0, BW * 1.1, 0)); P('carrier', car, K => { car.position.z = cz0 + dC(K); });
    const fpL = cl * .8 + carL * .45; const fp = M(gCyl(BW * .15, BW * .1, fpL, 8), mt.bright, 0, by, hz + fpL / 2 + .002); P('firingpin', fp, K => { fp.position.z = hz + fpL / 2 + .002 + dC(K) - (!K.manual && K.t > .028 && K.t < .06 ? .0015 : 0); });
    const end = rig.stockEnd && rig.stockEnd.z > carRear + .05 ? rig.stockEnd.z - .02 : Math.max(F.zr, carRear + st * 1.6), L0 = end - carRear;
    const sp = coil(BW * .7, L0, Math.max(12, Math.round(L0 / (cr * .55))), BW * .05, mt.spring); sp.position.set(0, by, carRear + L0 / 2);
    P('spring', sp, K => { const L = Math.max(L0 * .3, L0 - dC(K)); sp.userData.set(L); sp.position.z = end - L / 2; });
    const ctL = Math.max(.08, Math.abs(F.muzzleZ - hz) * .5); FX('cocktube', M(gCyl(BW * .5, BW * .5, ctL, 10, true), Tp, 0, by + BW * 2.2, hz - ctL / 2 + .02));
    FX('trunnion', M(gRBox(BW * 2.8, BW * 2.6, cl * .4, .003), Tp, 0, by, hz - cl * .05));
    hammerGroup(true, auto); boxMag();
  }
  else if (fam === 'blowback' || fam === 'openbolt') {
    const bL = Math.max(rl * 2.3, F.RL * .32), bR = BW * 1.35;
    const bolt = grp(0, by, hz); bolt.add(M(gCyl(bR, bR, bL, 16), T)); bolt.add(M(gCyl(BW * .6, BW * .6, cl * .3, 10), mt.bright, 0, 0, cl * .15));
    const notch = M(gBox(bR * .6, bR * .25, bR * .5), mt.red, 0, -bR * .9, bL * .7); bolt.add(notch);
    P(fam === 'openbolt' ? 'bolthead' : 'bolthead', bolt, K => { bolt.position.z = hz + dB(K); });
    bolt.add(tag(M(gCyl(BW * .16, BW * .16, bL * .25, 10), mt.bright, 0, 0, bL * .2), 'firingpin')); // fixed pin on open-bolt guns / striker channel
    const ex = M(gBox(BW * .25, BW * .35, cl * .9), mt.dark, bR * .85, BW * .3, cl * .45); P('extractor', ex, null, bolt);
    FX('ejector', M(gBox(BW * .15, BW * .7, cl * 1.6), mt.dark, -bR * .7, by - BW * .4, hz + cl * 1.2));
    carRear = hz + bL;
    const end = Math.max(F.zr, carRear + st * 1.5), L0 = end - carRear;
    const sp = coil(BW * .7, L0, Math.max(12, Math.round(L0 / (cr * .55))), BW * .05, mt.spring); sp.position.set(0, by, carRear + L0 / 2);
    P('spring', sp, K => { const L = Math.max(L0 * .28, L0 - dB(K)); sp.userData.set(L); sp.position.z = end - L / 2; });
    const gr = M(gCyl(BW * .14, BW * .14, L0, 6), mt.bright, 0, by, carRear + L0 / 2); P('guide', gr, null);
    const bf = M(gCyl(bR * .8, bR * .8, BW * .6, 12), mt.poly, 0, by, end + BW * .2); P('buffer', bf, null);
    if (fam === 'openbolt') {
      const se = grp(0, by - bR - BW * .5, carRear + st - bL * .3); se.add(M(gBox(BW * .5, BW * 1.2, BW * .5), mt.bright, 0, BW * .3, 0)); se.add(M(gCylX(BW * .2, BW * .2, BW, 8), mt.dark, 0, -BW * .3, BW * .4));
      P('sear', se, K => { se.rotation.x = K.sear ? 0 : .5; });
      const tg = grp(0, se.position.y - BW * .6, se.position.z - BW * 2); const tb = Math.max(.012, tg.position.y - trigY + .012); tg.add(M(gRBox(BW * .5, tb, BW * .5, .002), mt.park, 0, -tb / 2, 0)); tg.add(M(gBox(BW * .5, BW * .3, BW * 2.2), mt.park, 0, BW * .1, BW * 1.1));
      P('trigger', tg, K => { tg.rotation.x = -K.trig * .28; });
      const ts = coil(BW * .14, BW * .9, 6, BW * .025, mt.spring); ts.rotation.x = PI / 2; ts.position.set(0, tg.position.y - BW * .4, tg.position.z + BW * 1.6); P('tspring', ts, K => { ts.userData.set(BW * (.9 - K.trig * .35)); });
    } else hammerGroup(true, auto);
    if (!belt) boxMag();
  }
  else if (fam === 'pistolbb' || fam === 'pistolsr') {
    const brlL = Math.max(cl * 2.2, Math.abs(F.muzzleZ - hz) - .004), bR = cr * 1.75;
    const brl = grp(0, by, hz); brl.add(M(gCyl(bR, bR * .92, brlL, 14), T, 0, 0, -brlL / 2)); brl.add(M(gRBox(bR * 2.2, bR * 1.1, cl * 1.1, .002), mt.bright, 0, bR * .55, -cl * .55));
    const lugB = M(gBox(bR * 1.2, bR * 1.2, cl * .6), mt.bright, 0, -bR * 1.2, -cl * .4); brl.add(lugB);
    P('barrel', brl, K => { brl.position.z = hz + (fam === 'pistolsr' ? K.b * st * .1 : 0); brl.position.y = by - (fam === 'pistolsr' ? K.tilt * cr * .9 : 0); brl.rotation.x = fam === 'pistolsr' ? -K.tilt * .045 : 0; });
    if (fam === 'pistolsr') {
      const lk = grp(0, by - bR * 1.8, hz - cl * .4); lk.add(M(gBox(bR * .7, bR * 1.6, bR * .6), mt.park, 0, -bR * .4, 0)); P('link', lk, K => { lk.rotation.x = K.tilt * .5; lk.position.z = hz - cl * .4 + K.b * st * .1; });
      FX('slidestop', M(gCylX(bR * .3, bR * .3, F.RW * 1.15, 8), mt.dark, 0, by - bR * 2.5, hz - cl * .3));
    }
    const rsL0 = Math.max(.03, brlL * .75), rs0 = hz - cl * 1.15, rsY = by - bR * 2.6;
    const rs = coil(bR * .75, rsL0, Math.max(10, Math.round(rsL0 / (cr * .6))), bR * .08, mt.spring); rs.position.set(0, rsY, rs0 - rsL0 / 2);
    P('spring', rs, K => { const d = dB(K), L = Math.max(rsL0 * .35, rsL0 - d); rs.userData.set(L); rs.position.z = rs0 - L / 2 - (rsL0 - L) * 0; });
    const gr = M(gCyl(bR * .3, bR * .3, rsL0, 8), mt.bright, 0, rsY, rs0 - rsL0 / 2); P('guide', gr, null);
    const sL = F.RL * .55;
    const slideIn = grp(0, by, hz); slideIn.add(M(gBox(cr * 2.6, cr * 2.6, cr * .7), mt.bright, 0, 0, cr * .35)); // breech face
    const ex = M(gBox(cr * .5, cr * .7, cl * 1.2), mt.dark, cr * 1.6, cr * .4, cl * .1); slideIn.add(tag(ex, 'extractor'));
    P('extractor', slideIn, K => { slideIn.position.z = hz + dB(K); }, null, 'Drift out the extractor (or push out the slide cover plate and pull the extractor)');
    const hasHammer = !!rig.hammer || /1911|hipower|cz75|92|m9|p226|p228|p220|tt|makarov|p38|ppk|walther_p5|sp01|jericho|cougar|pt92|staccato|edc|series70|commander|detonics|kimber|m45|ballester|star|astra|vis35|bergbayard|webleysl/.test(wp.id);
    if (hasHammer) { hammerGroup(true, false); const fpL = cl * 1.4; const fp = M(gCyl(cr * .25, cr * .2, fpL, 8), mt.bright, 0, by, hz + fpL / 2 + .001); P('firingpin', fp, K => { fp.position.z = hz + fpL / 2 + .001 + dB(K) - (!K.manual && K.t > .028 && K.t < .06 ? .0012 : 0); }); }
    else {
      const sL2 = Math.min(sL * .5, cl * 2); const sk = strikerGroup(hz, sL2);
      P('striker', sk, K => { const cock = K.manual ? 0 : (K.t < .03 ? (1 - seg(K.t, 0, .03)) : K.t > .5 ? seg(K.t, .6, .85) * .6 : 0) + (K.trig > .2 && K.t > .85 ? .4 * K.trig : 0); sk.position.z = hz + dB(K) + cock * cl * .35; });
      const ssp = coil(cr * .5, sL2 * .7, 9, cr * .07, mt.spring); ssp.position.set(0, by + cr * .1, hz + sL2 * .5); P('strspring', ssp, K => { ssp.position.z = hz + dB(K) + sL2 * .5; });
      const tg = grp(0, F.bot + (by - F.bot) * .35, trigZ); const tb = Math.max(.01, tg.position.y - trigY + .01); tg.add(M(gRBox(cr * 1.2, tb, cr * 1.4, .002), mt.poly, 0, -tb / 2, 0));
      P('trigger', tg, K => { tg.rotation.x = -K.trig * .3; });
      const tbar = M(gBox(cr * .5, cr * .7, Math.max(.02, hz + cl * 1.5 - trigZ)), mt.bright, cr * 1.4, tg.position.y + cr * .5, (trigZ + hz + cl * 1.5) / 2);
      P('trigbar', tbar, K => { tbar.position.z = (trigZ + hz + cl * 1.5) / 2 + K.trig * cr * 1.2; tbar.position.y = tg.position.y + cr * .5 - (K.c > .05 ? cr * .6 : 0); });
      const fb = M(gCylY(cr * .3, cr * .3, cr * 1.6, 8), mt.red, 0, by + cr * 1.4, hz + cl * .9); P('fpblock', fb, K => { fb.position.y = by + cr * 1.4 + (K.trig > .8 ? cr * .6 : 0); fb.position.z = hz + cl * .9 + dB(K); });
    }
    FX('ejector', M(gBox(cr * .4, cr * 1.6, cl * .9), mt.dark, -cr * 1.2, by - cr * .6, hz + cl * 1.1));
    boxMag();
  }
  else if (fam === 'toggle') {
    const blockL = cl * 1.3;
    const blk = grp(0, by, hz); blk.add(M(gRBox(cr * 2.6, cr * 2.6, blockL, .002), mt.bright, 0, 0, blockL / 2)); P('breechblock', blk, K => { blk.position.z = hz + dB(K); });
    const pivRear = V3(0, by + cr * .6, Math.max(F.zr - .01, hz + blockL + st * 1.4)); const a = (pivRear.z - (hz + blockL)) / 2;
    const lf = M(gBox(cr * 1.6, cr * 1.0, a), mt.bright), lr = M(gBox(cr * 1.6, cr * 1.0, a), mt.bright);
    const tg = grp(); tg.add(lf, lr); const knob = M(gCylX(cr * .9, cr * .9, F.RW * .9, 12), mt.bright); tg.add(knob);
    if (!rig.toggleR) P('toggle', tg, K => { const zb = hz + blockL + dB(K), D = pivRear.z - zb, h = Math.sqrt(Math.max(0, a * a - D * D / 4)); const kz = zb + D / 2, ky = pivRear.y + h;
      lf.position.set(0, (pivRear.y + ky) / 2, (zb + kz) / 2); lf.rotation.x = Math.atan2(ky - pivRear.y, kz - zb); lr.position.set(0, (pivRear.y + ky) / 2, (kz + pivRear.z) / 2); lr.rotation.x = -Math.atan2(ky - pivRear.y, pivRear.z - kz); knob.position.set(0, ky, kz); });
    const fpL = blockL * .9; const fp = M(gCyl(cr * .25, cr * .2, fpL, 8), mt.bright, 0, by, hz + fpL / 2); P('firingpin', fp, K => { fp.position.z = hz + fpL / 2 + dB(K); });
    const ex = M(gBox(cr * 1.4, cr * .4, blockL * .7), mt.dark, 0, by + cr * 1.4, hz + blockL * .35); P('extractor', ex, K => { ex.position.z = hz + blockL * .35 + dB(K); });
    const rsp = coil(cr * .8, F.RL * .35, 12, cr * .08, mt.spring); rsp.rotation.x = PI / 2 - .25; rsp.position.set(0, F.bot - F.RL * .05, pivRear.z + cr); P('spring', rsp, K => { rsp.userData.set(F.RL * .35 * (1 + K.tog * .3)); });
    const tgr = grp(0, F.bot + (by - F.bot) * .3, trigZ); const tb = Math.max(.01, tgr.position.y - trigY + .01); tgr.add(M(gRBox(cr * 1.2, tb, cr * 1.4, .002), mt.park, 0, -tb / 2, 0)); P('trigger', tgr, K => { tgr.rotation.x = -K.trig * .3; });
    boxMag();
  }
  else if (fam === 'mgob' || fam === 'mgcb') {
    const headL = cl * .8, carL = Math.max(rl * 2.4, F.RL * .35), brlL = Math.max(.15, Math.abs(F.muzzleZ - hz) - .01), bR = cr * 2;
    const brl = grp(0, by, hz); brl.add(M(gCyl(bR, bR * .9, brlL, 12), T, 0, 0, -brlL / 2)); P('barrel', brl, K => { brl.position.z = hz + K.b * st * .14; }, null, 'Swing the barrel latch out and lift the hot barrel out (use the glove)');
    FX('booster', M(gCyl(bR * 1.6, bR * 1.3, .03, 12, true), Tp, 0, by, F.muzzleZ + .012));
    const head = grp(0, by, hz); head.add(M(gCyl(BW, BW, headL, 14), mt.bright, 0, 0, headL / 2)); P('bolthead', head, K => { head.position.z = hz + dB(K); });
    if (os === 'roller_recoil') { const rol = grp(0, 0, headL * .6); for (const s of [-1, 1]) rol.add(M(gCylY(BW * .28, BW * .28, BW * .9, 12), mt.bright, s * BW * 1.08, 0, 0)); P('rollers', rol, K => { rol.children.forEach((c, i) => { c.position.x = (i ? 1 : -1) * BW * (1.08 - K.unlock * .36); }); }, head); }
    else if (os === 'maxim') { const tg = grp(0, BW * 1.2, headL); tg.add(M(gBox(BW * 1.5, BW * .4, carL * .4), mt.bright, 0, 0, carL * .2)); P('toggle', tg, K => { tg.rotation.x = -K.unlock * .6; }, head); }
    else { const lk = M(gBox(BW * 1.6, BW * 1.2, headL * .5), mt.bright, 0, -BW * .8, headL * .4); P('lockblock', lk, K => { lk.position.y = -BW * .8 - K.unlock * BW * .6; }, head); }
    const ex = M(gBox(BW * .3, BW * .4, headL * .9), mt.dark, 0, BW * 1.0, headL * .45); P('extractor', ex, null, head);
    const cz0 = hz + headL + carL / 2; carRear = cz0 + carL / 2;
    const car = grp(0, by, cz0); car.add(M(gCyl(BW * 1.35, BW * 1.35, carL, 14), T)); car.add(M(gBox(BW * .6, BW * .5, carL * .4), mt.red, 0, BW * 1.3, -carL * .2)); P('carrier', car, K => { car.position.z = cz0 + dB(K); });
    const end = Math.max(F.zr, carRear + st * 1.5), L0 = end - carRear;
    const sp = coil(BW * .7, L0, Math.max(12, Math.round(L0 / (cr * .55))), BW * .05, mt.spring); sp.position.set(0, by, carRear + L0 / 2); P('spring', sp, K => { const L = Math.max(L0 * .28, L0 - dB(K)); sp.userData.set(L); sp.position.z = end - L / 2; });
    FX('buffer', M(gCyl(BW * 1.1, BW * 1.1, BW * .8, 12), mt.poly, 0, by, end + BW * .4));
    const fa = grp(0, by + cr * 5.5, F.magHead - rl * .4); fa.add(M(gBox(F.RW * .9, cr * .5, cr * 1.2), mt.bright)); fa.add(M(gBox(cr * .5, cr * 1.6, cr * .5), mt.bright, -F.RW * .3, -cr * .9, 0)); fa.add(M(gBox(cr * .5, cr * 1.6, cr * .5), mt.bright, F.RW * .3, -cr * .9, 0));
    P('feedarm', fa, K => { fa.position.x = (K.manual ? K.c : seg(K.c, .2, .9)) * cr * 2.4 - cr * 1.2; }, null, 'Open the top cover: the feed arm and pawls come away with it');
    FX('feedtray', M(gBox(F.RW * 1.6, cr * .3, rl * 1.1), Tp, 0, by + cr * 1.8, F.magHead - rl * .5));
    const se = grp(0, by - BW * 1.6, carRear + st * .8); se.add(M(gBox(BW * .5, BW * 1.0, BW * .5), mt.bright, 0, BW * .3, 0)); P('sear', se, K => { se.rotation.x = K.sear ? 0 : .5; });
    const tg = grp(0, se.position.y - BW * .6, Math.min(trigZ, se.position.z - BW * 2)); const tb = Math.max(.012, tg.position.y - trigY + .012); tg.add(M(gRBox(BW * .5, tb, BW * .5, .002), mt.park, 0, -tb / 2, 0)); tg.add(M(gBox(BW * .5, BW * .3, se.position.z - tg.position.z), mt.park, 0, BW * .1, (se.position.z - tg.position.z) / 2));
    P('trigger', tg, K => { tg.rotation.x = -K.trig * .25; });
  }
  else if (fam === 'bolt') {
    const bL = Math.max(rl * 2.1, cl * 2.4), bR = BW * 1.05;
    const bolt = grp(0, by, hz); bolt.add(M(gCyl(bR, bR, bL, 16), mt.bright, 0, 0, bL / 2));
    for (const s of [0, 1]) bolt.add(tag(M(gBox(bR * .55, bR * .6, cl * .18), mt.bright, s ? -bR * 1.1 : bR * 1.1, 0, cl * .09), 'lugs'));
    bolt.add(M(gBox(bR * .5, bR * .5, cl * .2), mt.bright, bR * 1.05, 0, bL * .7)); // safety lug
    const hd = grp(bR, 0, bL * .82); const arm = M(gCylX(bR * .28, bR * .25, F.RW * 1.5, 8), mt.bright, F.RW * .75, 0, 0); hd.add(arm); hd.add(M(gSph(bR * .55, 10), mt.bright, F.RW * 1.55, 0, 0)); bolt.add(tag(hd, 'handle'));
    P('boltbody', bolt, K => { bolt.position.z = hz + dB(K); bolt.rotation.z = K.unlock * 1.5; });
    const ex = M(gBox(bR * .3, bR * .45, bL * .75), mt.dark, -bR * .2, bR * .95, bL * .38); P('extractor', ex, null, bolt, 'Turn the extractor on its collar until it slides forward off the bolt');
    const fpL = bL * 1.05; const fp = grp(0, by, hz); fp.add(M(gCyl(bR * .2, bR * .14, fpL, 8), mt.steel, 0, 0, fpL / 2));
    P('firingpin', fp, K => { fp.position.z = hz + dB(K) + (1 - K.h) * -.0005 + K.h * cl * .3; }, null, 'Hold the cocking piece back, unscrew the bolt shroud: firing pin and mainspring come out together');
    const msL = bL * .62; const msp = coil(bR * .45, msL, 16, bR * .06, mt.spring); msp.position.set(0, by, hz + bL * .5);
    P('mainspring', msp, K => { const L = msL * (1 - K.h * .32); msp.userData.set(L); msp.position.z = hz + dB(K) + bL * .2 + L / 2; });
    const ck = grp(0, by, hz + bL); ck.add(M(gRBox(bR * 1.3, bR * 1.5, cl * .5, .002), mt.steel, 0, -bR * .2, cl * .25)); P('cockpiece', ck, K => { ck.position.z = hz + bL + dB(K) + K.h * cl * .32; ck.rotation.z = K.unlock * .2; });
    const sf = grp(0, by + bR * 1.1, hz + bL + cl * .5); sf.add(M(gBox(bR * .25, bR * .7, cl * .4), mt.dark)); P('safetyl', sf, K => { sf.position.z = hz + bL + cl * .5 + dB(K) + K.h * cl * .32; });
    FX('ejector', M(gBox(bR * .15, bR * .5, cl * 1.5), mt.dark, -bR * .9, by - bR * .2, hz + cl * 1.3));
    const se = grp(0, by - bR * 1.6, hz + bL + cl * .4); se.add(M(gBox(bR * .5, bR * 1.0, bR * .5), mt.bright, 0, bR * .3, 0)); P('sear', se, K => { se.position.y = by - bR * 1.6 + (K.sear ? bR * .4 : 0); });
    const tg = grp(0, se.position.y - bR * .7, Math.min(trigZ, se.position.z - bR)); const tb = Math.max(.012, tg.position.y - trigY + .012); tg.add(M(gRBox(bR * .5, tb, bR * .5, .002), mt.park, 0, -tb / 2, 0));
    P('trigger', tg, K => { tg.rotation.x = -K.trig * .22; });
    const ts = coil(bR * .14, bR * .9, 6, bR * .025, mt.spring); ts.rotation.x = PI / 2; ts.position.set(0, tg.position.y - bR * .4, tg.position.z - bR * .6); P('tspring', ts, null);
    boxMag(); FX('floorplate', M(gBox(F.RW * .85, cr * .4, rl * 1.15), Tp, 0, F.magTopY - cr * 1.75 * 7.3, F.magHead - rl * .5));
  }
  else if (fam === 'lever' || fam === 'pump') {
    const bL = Math.max(rl * 1.6, F.RL * .35), bR = BW * 1.15;
    const bolt = grp(0, by, hz); bolt.add(M(gRBox(bR * 2, bR * 2, bL, .002), mt.bright, 0, 0, bL / 2)); P('bolthead', bolt, K => { bolt.position.z = hz + dB(K); });
    const ex = M(gBox(bR * .3, bR * .4, bL * .6), mt.dark, bR, bR * .6, bL * .3); P('extractor', ex, null, bolt);
    const fpL = bL * .95; const fp = M(gCyl(bR * .18, bR * .14, fpL, 8), mt.bright, 0, by + bR * .3, hz + fpL / 2); P('firingpin', fp, K => { fp.position.z = hz + fpL / 2 + dB(K); });
    const lif = grp(0, F.tubeY, F.magHead - rl * .5); lif.add(M(gBox(cr * 3, cr * .5, rl * 1.05), fam === 'lever' ? mt.brass : mt.bright, 0, -cr * 1.1, 0)); for (const s of [-1, 1]) lif.add(M(gBox(cr * .3, cr * 1.6, rl * .9), fam === 'lever' ? mt.brass : mt.bright, s * cr * 1.4, -cr * .4, 0));
    P('lifter', lif, K => { lif.position.y = F.tubeY + (F.liftY - F.tubeY) * eIO(clamp((K.lift - .3) / .7, 0, 1)) * (K.lift > 0 ? 1 : 0); });
    if (fam === 'lever') {
      const lv = grp(0, F.bot, hz + bL * .2); const lvL = Math.max(.08, F.RL * .55); lv.add(M(gRBox(cr * 1.1, cr * 1.2, lvL, .002), mt.park, 0, -cr * .6, lvL / 2)); lv.add(M(gTor(lvL * .25, cr * .4, PI), mt.park, 0, -lvL * .25, lvL * .82));
      P('lever', lv, K => { lv.rotation.x = K.lever * .95; });
      const tl1 = M(gBox(cr * .8, cr * .6, bL * .5), mt.bright), tl2 = M(gBox(cr * .8, cr * .6, bL * .5), mt.bright); const tgl = grp(); tgl.add(tl1, tl2);
      P('toggle', tgl, K => { const zb = hz + bL + dB(K), zp = hz + bL + st + bL * .5; const a = (zp - (hz + bL)) / 2, D = zp - zb, h = Math.sqrt(Math.max(0, a * a - D * D / 4)); const kz = zb + D / 2, ky = by - h;
        tl1.position.set(0, (by + ky) / 2, (zb + kz) / 2); tl1.rotation.x = -Math.atan2(by - ky, kz - zb); tl2.position.set(0, (by + ky) / 2, (kz + zp) / 2); tl2.rotation.x = Math.atan2(by - ky, zp - kz); tl1.scale.z = tl2.scale.z = a / (bL * .5); });
      FX('gate', M(gBox(cr * .3, cr * 2.2, rl * .9), mt.brass, F.RW * .5, F.tubeY + cr * .3, F.magHead - rl * .5));
    } else {
      const fe = Math.abs(F.muzzleZ - hz) * .35; const ab = grp(0, F.tubeY - cr * .5, hz - fe * .5); for (const s of [-1, 1]) ab.add(M(gBox(cr * .3, cr * .4, fe + st), mt.bright, s * cr * 2.4, 0, fe * .5 - (fe + st) * .0)); ab.add(M(gRBox(cr * 6, cr * 3, fe * .6, .003), mt.poly, 0, -cr * 1.2, -fe * .2));
      P('actionbars', ab, K => { ab.position.z = hz - fe * .5 + K.pump * st; }, null, 'Remove the magazine cap and slide the fore-end and action bars off the tube');
      const bs = M(gBox(bR * 2.2, bR * .7, bL * .7), mt.bright, 0, by - bR * 1.3, hz + bL * .4); P('boltslide', bs, K => { bs.position.z = hz + bL * .4 + K.pump * st; });
      const lb = M(gBox(bR * 1.6, bR * .6, bL * .35), mt.steel, 0, by + bR * 1.2, hz + bL * .5); P('lockblock', lb, K => { lb.position.z = hz + bL * .5 + dB(K); lb.position.y = by + bR * 1.2 - K.unlock * bR * .5; lb.rotation.x = K.unlock * .25; });
      for (const s of [-1, 1]) { const la = M(gBox(cr * .3, cr * .8, rl * .5), mt.dark, s * cr * 2.1, F.tubeY, F.magHead - rl * .9); P('latches', la, K => { la.position.x = s * cr * (2.1 + (K.lift > 0 && K.lift < .3 ? .4 : 0)); }); }
      const rl_ = M(gBox(cr * .4, cr * 1.2, cr * .6), mt.red, F.RW * .5, trigY + cr * 2, trigZ - cr * 2); P('release', rl_, null);
    }
    hammerGroup(false, false);
    // tube spring
    const tL = Math.max(.08, Math.abs(F.muzzleZ - hz) * .55), tz0 = hz - rl * .2;
    const tsp = coil(cr * 1.0, tL * .4, 14, cr * .08, mt.spring); tsp.position.set(0, F.tubeY, tz0 - tL + tL * .2); P('tubespring', tsp, null);
    FX('chamber', M(gCyl(cr * 1.25, cr * 1.25, tL, 12, true), Tp, 0, F.tubeY, tz0 - tL / 2));
  }
  else if (fam === 'revolver' || fam === 'sarev') {
    const c0 = rig.cyl ? rig.cyl.position.clone() : V3(0, by - cr * 3, hz - cl * .6);
    const cylL = cl * 1.25; F.hz = c0.z + cylL / 2;
    const hzR = F.hz;
    const hm = rig.hammer ? rig.hammer.position.clone() : V3(0, by + cr * 2, hzR + cl * .6);
    const hand = M(gBox(cr * .4, cr * 2.6, cr * .5), mt.red, F.RW * .2, c0.y - cr * 1.2, hzR + cr * .5); P('hand', hand, K => { hand.position.y = c0.y - cr * 1.2 + K.hand * cr * 1.4; });
    const stop = M(gBox(cr * .8, cr * .7, cr * 1.4), mt.dark, 0, c0.y - cr * 4.2, c0.z); P('cylstop', stop, K => { stop.position.y = c0.y - cr * 4.2 - (1 - K.stop) * cr * .8; });
    const hg = grp(hm.x, hm.y - cr * 2.5, hm.z + cr * 1.5); hg.add(M(gRBox(cr * 1.3, cr * 3.2, cr * 1.4, .002), mt.park, 0, cr * 1.6, 0)); hg.add(M(gBox(cr * .8, cr * .8, cr * 1.5), mt.park, 0, cr * 3.1, cr * .8));
    P('hammer', hg, K => { hg.rotation.x = .1 + K.h * .9; });
    const tg = grp(0, c0.y - cr * 4.5, c0.z + cr * 1.5); const tb = Math.max(.012, tg.position.y - trigY + .012); tg.add(M(gRBox(cr * 1.1, tb, cr * 1.2, .002), mt.park, 0, -tb / 2, 0)); P('trigger', tg, K => { tg.rotation.x = -K.trig * .45; });
    const ms = grp(0, F.bot - cr, hm.z + cr * 3); const leaf = M(gBox(cr * .5, cr * .3, F.RL * .4), mt.spring, 0, 0, F.RL * .2); leaf.rotation.x = -.9; ms.add(leaf); P('mainspring', ms, K => { leaf.rotation.x = -.9 - K.h * .12; });
    const rb = grp(0, tg.position.y - cr * .9, tg.position.z + cr * 3); rb.add(M(gBox(cr * .9, cr * .9, cr * 2.4), mt.bright)); const rbs = coil(cr * .35, cr * 2.2, 8, cr * .06, mt.spring); rbs.position.z = cr * 2.2; rb.add(rbs);
    if (fam === 'revolver') P('rebound', rb, K => { rb.position.z = tg.position.z + cr * 3 + K.trig * cr * 1.2; rbs.userData.set(cr * (2.2 - K.trig * .9)); });
    const xb = M(gBox(cr * .6, cr * 2.4, cr * .3), mt.bright, 0, by - cr * .6, hzR + cr * .6); if (fam === 'revolver') P('transfer', xb, K => { xb.position.y = by - cr * .6 - (1 - K.xfer) * cr * 1.6; });
    const fpin = M(gCyl(cr * .22, cr * .2, cr * 2, 8), mt.bright, 0, by, hzR + cr * 1.1); if (fam === 'sarev') FX('nipple', M(gCylY(cr * .25, cr * .4, cr * .9, 8), mt.steel, 0, by, hzR + cr * .5)); else P('firingpin', fpin, K => { fpin.position.z = hzR + cr * 1.1 - (!K.manual && K.t > .58 && K.t < .64 ? cr * .3 : 0); });
    FX('crane', M(gCyl(cr * .3, cr * .3, cylL * 1.6, 8), mt.bright, 0, c0.y - cr * 1.6, c0.z - cylL * .3));
  }
  F.nStack = 0;
  return { os, def: G.OS[os], group: g, parts, fixed, v2: true, fam, F, stack, beltR, tubeR };
}

// ------------------------------------------------------------------ live ammunition: chambered round, next round, the stack, the case, the bullet, the gas
const REAR = { gas: .5, roller: .44, blowback: .42, pistolbb: .42, pistolsr: .42, toggle: .45, mgcb: .44, bolt: .5, lever: .43, pump: .43, revolver: 2 };
function ammoSetup(B, I) {
  const F = I.F, wp = B.wp, g = I.group, mt = mats();
  const am = { A: makeCart(wp.cal), N: makeCart(wp.cal), list: [], gas: [], ejDone: false, fireDone: false, prevT: 0 };
  g.add(am.A, am.N);
  const box = !F.belt && !F.tube && !/revolver|sarev/.test(I.fam);
  const n = /revolver|sarev/.test(I.fam) ? 0 : F.belt ? 6 : F.tube ? 4 : Math.max(0, Math.min(5, (B.cap || wp.mag || 5) - 1));
  for (let i = 0; i < n; i++) { const r = makeCart(wp.cal); g.add(r); am.list.push(r); }
  F.nStack = box ? n : 0; am.box = box;
  for (let i = 0; i < 12; i++) { const s = M(gSph(F.cr * (1.3 - i * .06), 8), mt.gas); s.visible = false; s.userData.inner = 'gas'; g.add(s); am.gas.push(s); }
  F.tubeHead = F.hz - F.rl * .05; F.beltY = F.by + F.cr * 2.9; F.pitch = F.cr * 2.6;
  F.boreLen = Math.max(.05, (F.hz - F.cl) - F.muzzleZ);
  F.ejDir = (B.rig.ejectDir || V3(1, .7, .35)).clone().normalize();
  F.ejThr = Math.min(F.cl * 1.02, F.st * .8);
  I.ammo = am;
}
function placeRest(F, r, i, fol, am, fam) { // where round i of the reserve sits (0 = next to feed)
  if (F.belt) { r.position.set((i - fol) * F.pitch, F.beltY, F.magHead); r.rotation.set(0, 0, 0); return; }
  if (F.tube) { r.position.set(0, F.tubeY, F.tubeHead - (i - fol) * F.rl * 1.02); r.rotation.set(0, 0, 0); return; }
  const k = i - fol, x = (Math.round(i) % 2 ? -1 : 1) * F.cr * .95;
  r.position.set(F.wp.mag > 10 ? x : 0, F.magTopY - k * F.cr * 1.75, F.magHead); r.rotation.set(0, 0, 0);
}
function ammoUpdate(B, I, K) {
  const F = I.F, am = I.ammo, fam = I.fam; if (!am) return;
  const open = fam === 'openbolt' || fam === 'mgob';
  const d = K.bolt * F.st, hz = F.hz, by = F.by;
  const rearT = REAR[fam] ?? .5;
  const ret = !K.manual && (open ? K.t < .27 : K.t >= rearT);
  const A = am.A, N = am.N;
  const fc = open ? N : A; // the round that fires this cycle
  if ((fam === 'revolver' || fam === 'sarev')) {
    A.visible = K.manual ? (B.cyl ? B.cyl.includes(1) || B.cyl.includes(2) : true) : true; N.visible = false;
    A.position.set(0, by, hz); const bl = A.userData.bullet; bl.visible = !K.fired || K.bp < 1;
    bl.position.z = -F.cl - (K.fired ? Math.max(0, K.bp) * (F.boreLen + F.cl) : 0);
    for (const s of am.gas) s.visible = false;
    return;
  }
  if (K.manual) {
    A.visible = B.chamber > 0 && B.open < .05; A.position.set(0, by, hz); A.rotation.set(0, 0, 0); A.userData.bullet.visible = B.chamber === 1; A.userData.bullet.position.z = -F.cl;
    const have = B.feed === 'box' ? (B.magIn ? B.rounds : 0) : B.rounds;
    N.visible = have > 0; placeRest(F, N, 0, 0, am, fam);
    am.list.forEach((r, i) => { r.visible = have > i + 1; placeRest(F, r, i + 1, 0, am, fam); });
    for (const s of am.gas) s.visible = false;
    K.fol = 0; return;
  }
  // reset per-cycle flags when the timeline wraps or is scrubbed back
  if (K.t < am.prevT - .02) { am.ejDone = false; am.fireDone = false; }
  am.prevT = K.t;
  // ---- feeding
  const contact = Math.max(.001, F.magHead - hz);
  let fp = 0;
  if (ret) fp = clamp(1 - d / contact, 0, 1);
  if (!open && !ret) fp = 0;
  if (open && K.t >= .27) fp = 1;
  if ((fam === 'lever' || fam === 'pump') && !ret) fp = 0;
  const fol = F.belt ? (open ? (K.t < .27 ? 0 : seg(K.c, .2, .9)) : (K.t > .2 && K.t < rearT ? seg(K.c, .2, .9) : K.t >= rearT ? 1 : 0)) : F.tube ? (K.lift > 0 || ret ? seg(K.lift, 0, .3) : 0) || (ret ? 1 : 0) : (ret || (open && K.t >= .27) ? seg(fp, .4, .75) : 0);
  K.fol = F.tube || F.belt ? 0 : fol; K.fp = fp;
  // the feeding round (N): resting, lifting, or riding the bolt face into the chamber
  const feedIt = r => {
    if (fp > 0) {
      let y0 = F.magTopY, x0 = am.box && F.wp.mag > 10 ? F.cr * .95 : 0;
      if (F.tube) { y0 = F.liftY; x0 = 0; } if (F.belt) { y0 = F.beltY; x0 = 0; }
      const k = eIO(clamp(fp * 1.25, 0, 1));
      r.position.set(x0 * (1 - k), y0 + (by - y0) * k, hz + d); r.rotation.set(Math.sin(fp * PI) * (F.belt ? -.25 : .22), 0, 0);
    } else if (F.tube && (K.lift > 0 || K.t >= rearT)) {
      const back = seg(K.lift, 0, .3), up = eIO(clamp((K.lift - .3) / .7, 0, 1));
      r.position.set(0, F.tubeY + (F.liftY - F.tubeY) * up, F.tubeHead + (F.magHead - F.tubeHead) * back); r.rotation.set(0, 0, 0);
    } else placeRest(F, r, 0, 0, am, fam);
  };
  // ---- the firing round: bullet down the bore, case extracted and ejected
  const fireIt = r => {
    const bl = r.userData.bullet, cs = r.userData.case;
    let ej = 0;
    if (K.fired) {
      const backPhase = open ? K.t < .62 : K.t < rearT + .01;
      if (d > F.ejThr && backPhase) ej = clamp((d - F.ejThr) / (F.st * .25), 0, 1);
      if (!backPhase || (open && K.t >= .62)) ej = 1;
      if (fam === 'bolt' || fam === 'lever' || fam === 'pump') { if (K.t >= rearT) ej = 1; }
    }
    if (ej <= 0) { r.position.set(0, by, hz + (K.fired ? d : 0)); r.rotation.set(0, 0, 0); r.visible = true; }
    else if (ej < 1) { const s0 = V3(0, by, hz + F.ejThr); const p = s0.addScaledVector(F.ejDir, ej * .14); p.y += ej * .02 - ej * ej * .05; r.position.copy(p); r.rotation.set(ej * 2.2, ej * 4, 0); r.visible = ej < .6; }
    else r.visible = false;
    if (ej > 0 && !am.ejDone && !F.wp.caseless) { am.ejDone = true; BN.api.eject(false); }
    K.ej = ej;
    // bullet
    if (!K.fired) { bl.visible = true; bl.position.z = -F.cl; }
    else if (K.bp < 1) { bl.visible = true; const wz = (hz - F.cl) - Math.max(0, K.bp) * F.boreLen; bl.position.z = wz - r.position.z; bl.position.y = by - r.position.y; bl.position.x = -r.position.x; }
    else bl.visible = false;
    cs.visible = !F.wp.caseless;
  };
  if (open) {
    A.visible = false;
    if (K.t < .27) { feedIt(N); N.visible = true; N.userData.bullet.visible = true; N.userData.bullet.position.set(0, 0, -F.cl); }
    else fireIt(N);
  } else {
    fireIt(A);
    N.visible = true; feedIt(N); N.userData.bullet.visible = true; N.userData.bullet.position.set(0, 0, -F.cl);
    N.userData.case.visible = true;
  }
  am.list.forEach((r, i) => { r.visible = true; placeRest(F, r, i + 1, F.belt ? fol : F.tube ? fol : fol, am, fam); });
  // ---- gas
  const path = F.gasPath;
  if (path && K.gasOn) {
    let L = 0; const segs = []; for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); segs.push(l); L += l; }
    am.gas.forEach((s, i) => { const u = K.gas * 1.15 - i * .05; if (u < 0 || u > 1) { s.visible = false; return; } let w = u * L, k = 0; while (k < segs.length - 1 && w > segs[k]) { w -= segs[k]; k++; } s.position.lerpVectors(path[k], path[k + 1], clamp(w / segs[k], 0, 1)); s.visible = true; s.material.opacity = .8 * (1 - K.gas * .6); });
  } else for (const s of am.gas) s.visible = false;
  // shot: sound, flash, recoil on the bench (once per cycle)
  if (K.fired && !am.fireDone) { am.fireDone = true; const sh = B.shots; BN.api.shoot(); B.shots = sh; }
}

// ------------------------------------------------------------------ the cycle player
// BN.cyc2 = { ms, play, speed, mode, loop }
function cycleInfo(B) {
  const I = B.inner, H = B.S && B.S.hand, map = I.old ? msMapOld(I.fam, B) : msMap(I.fam, H, B.wp);
  return { map, total: map[map.length - 1][1] };
}
const tOfMs = (map, ms) => { for (let i = 1; i < map.length; i++) if (ms <= map[i][1]) { const [a, ma] = map[i - 1], [b, mb] = map[i]; return a + (b - a) * (ms - ma) / Math.max(1e-6, mb - ma); } return 1; };
function kinAny(I, t, mode) { return I.old ? kinOld(I.fam, t, I) : kin(I.fam, t, I.F, mode); }
function defaultSpeed(fam) { if (fam === 'break' || fam === 'cannon') return .5; if (fam === 'lock') return .1; if (fam === 'artillery') return .25; if (fam === 'mortar') return .3; if (fam === 'gatling') return .05; return ['bolt', 'lever', 'pump'].includes(fam) ? .25 : /revolver|sarev/.test(fam) ? .05 : .01; }
function startCycle(B, opts) {
  const I = B.inner; if (!I || !I.v2) return;
  const C = BN.cyc2 = Object.assign({ ms: 0, play: true, speed: (BN.cyc2 && BN.cyc2.speed) || defaultSpeed(I.fam), mode: (BN.cyc2 && BN.cyc2.mode) || 'semi', loop: !!(BN.cyc2 && BN.cyc2.loop) }, opts || {});
  C.open0 = C.open0 ?? B.open; C.cocked0 = C.cocked0 ?? B.cocked;
  if (I.old && I.saveOuter && !C.saved) { I.saveOuter(); C.saved = true; }
  if (I.ammo) { I.ammo.ejDone = false; I.ammo.fireDone = false; I.ammo.prevT = 0; }
}
function stopCycle(B) { const C = BN.cyc2; if (!C) return; BN.cyc2 = null; if (B && B.inner && B.inner.old && B.inner.restoreOuter) B.inner.restoreOuter(); if (B && B.kind === 'std') { BN.api.setAction(C.open0 || 0); B.cocked = C.cocked0; } }
function outerP(fam, K) { return fam === 'bolt' ? K.unlock * .25 + K.bolt * .75 : K.c; }
let lastK = null;
function animate(B, dt) {
  const I = B.inner, C = BN.cyc2; let K;
  if (C) {
    const { map, total } = cycleInfo(B);
    if (C.play) { C.ms += dt * 1000 * C.speed; if (C.ms >= total) { if (C.loop || C.mode === 'auto') { C.ms = C.ms % total; if (I.ammo) { I.ammo.ejDone = false; I.ammo.fireDone = false; I.ammo.prevT = 0; } } else { C.ms = total; C.play = false; } } }
    const t = tOfMs(map, Math.min(C.ms, total));
    K = kinAny(I, t, C.mode); K.ms = Math.min(C.ms, total); K.total = total;
    if (B.kind === 'std' && (B.rig.slide || B.rig.bolt) && !/revolver|sarev/.test(I.fam)) { const c0 = B.cocked; BN.api.setAction(outerP(I.fam, K)); B.cocked = c0; }
    if (B.rig.cyl && /revolver|sarev/.test(I.fam)) { const n = B.cyl ? B.cyl.length : 6; B.rig.cyl.rotation.z = (B.cylIdx || 0) * 2 * PI / n + K.cyl * 2 * PI / n; }
    if (B.rig.hammer) B.rig.hammer.rotation.x = K.h > .5 ? -.6 : 0;
  } else if (I.old) { K = kinOld(I.fam, 0, I); K.manual = true; }
  else K = kinManual(I.fam, B);
  if (I.old) { if (K.manual) { for (const o of I.ammoObjs || []) if (o.userData.inner === 'gas') o.visible = false; } else if (I.upd) I.upd(K); }
  else ammoUpdate(B, I, K);
  for (const p of I.parts) if (p.motion) p.motion(K);
  lastK = K;
  return K;
}

// ================================================================== the older families: doubles, locks, cannon, artillery, mortars, Gatlings
const OLDF = { falling: 'falling', break: 'break', lock_flint: 'lock', lock_match: 'lock', lock_wheel: 'lock', lock_cap: 'lock', cannon: 'cannon', screwbreech: 'cannon', chamber: 'cannon', artillery: 'artillery', autocannon: 'artillery', recoilless: 'artillery', mortar: 'mortar', gatling: 'gatling', rotary: 'gatling' };
Object.assign(PI_, {
  blockaxis: ['Block axis pin', 'The pin the breech block pivots (or slides) on.', 'Hardened steel', 60000],
  flextractor: ['Extractor', 'A lever at the bottom of the chamber, kicked by the falling block to flip the empty case out.', 'Steel', 15000],
  hinge: ['Hinge pin', 'The cross pin at the front of the action the barrels pivot on.', 'Hardened steel', 60000],
  lumps: ['Barrel lumps', 'Steel lugs under the barrels: they hook the hinge pin, take the locking bolt in their bites and push the cocking levers.', 'Part of the barrels', 60000],
  underbolt: ['Locking bolt (Purdey underbolt)', 'Slides into the bites in the lumps to hold the barrels shut; the top lever draws it back.', 'Hardened steel', 40000],
  spindle: ['Top-lever spindle & spring', 'Turns with the top lever and draws the bolt; a V spring snaps it back.', 'Steel', 40000],
  cockrods: ['Cocking levers', 'As the barrels drop, the lumps push these levers, which swing the tumblers back to cock them.', 'Steel', 40000],
  tumblers: ['Tumblers (internal hammers)', 'One per barrel; held cocked by its sear, it swings forward and drives the firing pin.', 'Hardened steel', 30000],
  sears: ['Sears', 'Hold each tumbler cocked until its trigger lifts it.', 'Hardened steel', 30000],
  mainsprings: ['Mainsprings', 'Coil (or V) springs that power the tumblers.', 'Music wire', 20000],
  firingpins: ['Firing pins', 'Through the standing breech, one per barrel.', 'Steel', 25000],
  triggers: ['Triggers', 'Front trigger fires the right barrel, rear trigger the left.', 'Steel', 40000],
  safety: ['Safety slide', 'On the top tang: blocks the triggers. Automatic safeties come on whenever the gun is opened.', 'Steel', 50000],
  ejectors: ['Ejectors', 'In the fore-end: tripped only for a fired barrel, they kick the empty shell clear as the gun opens.', 'Steel + coil springs', 15000],
  tumbler: ['Tumbler', 'Fixed to the cock’s axle inside the lock: its notches (half-cock and full-cock) are held by the sear.', 'Case-hardened steel', 20000],
  vspring: ['Mainspring (V spring)', 'A folded leaf spring bearing on the tumbler: it snaps the cock forward.', 'Spring steel', 15000],
  searspring: ['Sear spring', 'Pushes the sear nose into the tumbler’s notches.', 'Spring steel', 15000],
  bridle: ['Bridle', 'A small plate that supports the tumbler and sear pivots.', 'Steel', 40000],
  frizzspring: ['Frizzen spring', 'Holds the frizzen shut over the pan — and open once it has been knocked back.', 'Spring steel', 10000],
  touchhole: ['Touch-hole (vent)', 'A small hole from the pan into the breech: the flash from the priming must pass through it.', 'Drilled in the barrel (often a gold or platinum liner)', 8000],
  breechplug: ['Breech plug & tang', 'Screwed into the rear of the barrel: closes it and carries the tang screw.', 'Iron', 60000],
  serpentine: ['Serpentine (match holder)', 'The S-shaped arm that lowers the burning match into the pan.', 'Iron', 30000],
  wheelpart: ['Wheel & chain', 'A serrated steel wheel on a spindle; a chain links it to the mainspring, wound up with a spanner.', 'Steel', 10000],
  nipple: ['Nipple', 'The hollow cone the percussion cap sits on: the flash goes straight down it.', 'Steel', 8000],
  vent: ['Vent', 'The narrow hole from the top of the breech down to the charge. Priming powder (or a quill / friction tube) goes in here.', 'Drilled in the breech (often bushed with copper)', 3000],
  linstock: ['Linstock / portfire', 'A staff holding a burning slow match, touched to the vent to fire.', 'Wood and iron', 5000],
  trunnions: ['Trunnions', 'The two pins the tube rests on in the carriage: it pivots on them to elevate.', 'Cast with the tube', 100000],
  cascabel: ['Cascabel & breeching', 'The knob at the rear: the breeching rope that checks the recoil is passed round it.', 'Cast with the tube', 100000],
  blockfp: ['Firing mechanism', 'The firing pin and its spring inside the breech block, released by the lanyard.', 'Steel', 20000],
  extractors: ['Extractors', 'Levers that throw the empty cartridge case out of the chamber as the breech opens.', 'Steel', 15000],
  buffercyl: ['Recoil buffer', 'A hydraulic cylinder: as the barrel runs back, its piston forces oil through small ports and soaks up the recoil.', 'Steel cylinder, oil', 30000],
  recup: ['Recuperator', 'Springs or compressed nitrogen squeezed by the recoil; they push the barrel back into battery.', 'Steel / nitrogen', 30000],
  cradle: ['Cradle', 'The trough the barrel slides in when it recoils; it elevates on the trunnions.', 'Steel', 100000],
  breechcam: ['Breech operating cam', 'On semi-automatic breeches, a cam catches the block on run-out and opens it, throwing the case out.', 'Steel', 30000],
  basecap: ['Base cap & firing pin', 'Screwed into the bottom of the tube: the bomb’s primer lands on its fixed firing pin.', 'Steel', 20000],
  cam: ['Spiral cam', 'A fixed helical track inside the housing: each bolt rides it, pushed forward to load and fire and pulled back to extract.', 'Hardened steel', 40000],
  bolts: ['Bolts (one per barrel)', 'Each barrel has its own bolt and firing pin, driven by the cam as the cluster turns.', 'Steel', 20000],
  carrierg: ['Carrier', 'A grooved drum turning with the barrels; rounds drop from the hopper into its grooves.', 'Brass / steel', 30000],
  gears: ['Crank gears', 'A bevel gear set: one turn of the crank turns the barrel cluster several times.', 'Brass', 30000],
  drive: ['Drive motor & clutch', 'An electric or hydraulic motor spins the cluster to firing speed.', 'Steel', 40000],
  hopper: ['Feed hopper', 'Gravity drops the rounds into the carrier grooves.', 'Brass / steel', 40000],
  venturi: ['Venturi', 'A nozzle at the back: most of the gas leaves through it, cancelling the recoil.', 'Steel', 20000],
});
Object.assign(PH, {
  falling: [[0, 'Trigger', 'The trigger releases the tumbler (or the hammer falls).'], [.04, 'Ignition', 'The striker hits the primer; the solid block takes the whole thrust.'], [.12, 'Bullet away', 'Black powder: a cloud of smoke and a heavy push.'], [.25, 'Lever down', 'The lever drops the block below the chamber; the tumbler recocks the striker.'], [.4, 'Extraction', 'At the bottom of its travel the block kicks the extractor, which throws the case out.'], [.5, 'Load', 'A fresh cartridge is thumbed into the chamber over the top of the block.'], [.68, 'Lever up', 'The block rises behind the cartridge, sealing the breech. Cocked and ready.']],
  break: [[0, 'Front trigger', 'The front trigger lifts the right sear out of the tumbler’s bent.'], [.03, 'Right barrel fires', 'The tumbler drives the firing pin; the charge drives the shot column down the barrel.'], [.12, 'Rear trigger', 'The rear trigger releases the left tumbler.'], [.15, 'Left barrel fires', 'Second barrel.'], [.28, 'Top lever', 'Push the top lever across: its spindle draws the underbolt out of the bites in the lumps.'], [.33, 'Barrels drop', 'The barrels pivot on the hinge pin; the lumps push the cocking levers, which recock both tumblers.'], [.45, 'Ejection', 'Fully open, the tripped ejectors kick both fired shells out.'], [.58, 'Reload', 'Two fresh shells drop into the chambers.'], [.72, 'Close', 'Lift the barrels: the bolt snaps into the bites; the top lever springs back. Safety on.']],
  lock: [[0, 'Trigger', 'The trigger bar pushes the sear nose out of the full-cock notch in the tumbler.'], [.05, 'The cock falls', 'The V mainspring drives the tumbler — and the cock with it — forward.'], [.1, 'Strike', 'Flint scrapes the steel face of the frizzen, throwing a shower of white-hot steel particles and knocking the frizzen open.'], [.14, 'Flash in the pan', 'The sparks light the priming powder in the pan.'], [.24, 'Through the touch-hole', 'The flash must pass through the narrow touch-hole into the breech — this is the delay you feel.'], [.3, 'Main charge', 'The charge behind the ball lights.'], [.38, 'Ball away', 'The ball leaves the muzzle in a cloud of white smoke.'], [.6, 'Reload', 'Half-cock, prime the pan, close the frizzen, charge, ram, full cock.']],
  cannon: [[0, 'Give fire', 'The gunner brings the linstock’s burning match down to the vent.'], [.12, 'Primer', 'The priming (or a quill tube) in the vent flashes.'], [.16, 'Down the vent', 'The flame runs down the vent into the cartridge bag.'], [.2, 'Charge', 'The powder burns; the wad and shot are driven down the bore.'], [.32, 'Shot away', 'The ball leaves the muzzle.'], [.34, 'Recoil', 'The whole gun and carriage leap back until the breeching rope stops them.'], [.6, 'Serve the piece', 'Run up, stop the vent, sponge, load cartridge, wad and shot, ram, prick the cartridge, prime.']],
  artillery: [[0, 'Lanyard', 'The lanyard releases the firing pin in the breech block.'], [.04, 'Ignition', 'The primer fires the propellant charge.'], [.06, 'Shell in the bore', 'The driving band engraves into the rifling; the shell spins up.'], [.12, 'Shell away', 'It leaves the muzzle; the gases follow.'], [.14, 'Recoil', 'The barrel slides back in its cradle; the buffer piston forces oil through narrow ports and the recuperator is compressed.'], [.3, 'Run-out', 'The recuperator pushes the barrel back into battery, slowed by the buffer at the end.'], [.66, 'Breech opens', 'On run-out a cam opens the breech; the extractors throw the empty case out of the back.'], [.78, 'Ram', 'The loader rams the next round into the chamber.'], [.88, 'Breech closes', 'The block slides shut, cocking the firing mechanism. Ready.']],
  mortar: [[0, 'Hang the bomb', 'The bomb is held tail-first in the muzzle.'], [.1, 'Drop', 'Let go: it slides down the smooth tube, its obturating ring guiding it.'], [.45, 'Strike', 'The primary cartridge in the tail lands on the fixed firing pin.'], [.47, 'Increments', 'The primary flashes through the tail and lights the charge increments around it.'], [.5, 'Away', 'Gas pressure drives the bomb back up the tube; the fins keep it straight.'], [.62, 'Clear', 'The bomb leaves the muzzle on its high arc. Next.']],
  gatling: [[0, 'Feed', 'At the top, a round drops from the hopper into the carrier groove in front of a bolt.'], [.15, 'Load', 'As the cluster turns, the spiral cam drives that bolt forward, pushing the round into its barrel.'], [.45, 'Cock', 'The cocking cam draws the firing pin back against its spring.'], [.5, 'Fire', 'At the bottom the pin is released: that barrel fires while the others load and extract.'], [.62, 'Extract', 'The cam pulls the bolt back; the extractor draws the case out.'], [.85, 'Eject', 'The case falls clear; the groove is ready for the next round.']],
});
function kinOld(fam, t, I) {
  const K = { t, fam, trig: 0, h: 1, bp: -1, press: 0, fired: false, c: 0, bolt: 0, unlock: 0, gasOn: false, fp: 0, fol: 0, lift: 0 };
  const P = (t0, t1) => { const x = seg(t, t0, t1); return x <= 0 || x >= 1 ? 0 : x < .12 ? x / .12 : Math.exp(-(x - .12) * 4.2); };
  if (fam === 'falling') {
    K.trig = t < .04 ? seg(t, 0, .04) : t < .2 ? 1 : 1 - seg(t, .2, .24); K.h = t < .04 ? 1 - eIn(seg(t, 0, .04)) : t < .25 ? 0 : t < .4 ? seg(t, .25, .4) : 1;
    K.fired = t >= .05; K.bp = t < .05 ? -1 : seg(t, .05, .12); K.press = P(.05, .12);
    K.fo = t < .25 ? 0 : t < .4 ? eIO(seg(t, .25, .4)) : t < .68 ? 1 : 1 - eIO(seg(t, .68, .8)); K.ej = t < .4 ? 0 : seg(t, .4, .5); K.ld = t < .5 ? 0 : seg(t, .5, .62);
  } else if (fam === 'break') {
    K.trR = t < .1 ? seg(t, 0, .03) : 1 - seg(t, .1, .13); K.trL = t > .12 && t < .25 ? seg(t, .12, .15) : 0;
    K.tl = t < .28 ? 0 : t < .33 ? seg(t, .28, .33) : t < .84 ? 1 : 1 - seg(t, .84, .87);
    K.brk = t < .33 ? 0 : t < .45 ? eIO(seg(t, .33, .45)) : t < .72 ? 1 : 1 - eIO(seg(t, .72, .84));
    const fall = (t0) => t < t0 ? 1 - eIn(seg(t, t0 - .03, t0)) : 0;
    K.hR = Math.max(t < .33 ? fall(.03) : 0, K.brk > 0 && t >= .33 ? Math.min(1, K.brk * 1.2) : 0, t >= .45 ? 1 : 0); if (t < .03) K.hR = 1 - eIn(seg(t, 0, .03));
    K.hL = t < .12 ? 1 : t < .15 ? 1 - eIn(seg(t, .12, .15)) : t < .33 ? 0 : Math.min(1, K.brk * 1.2);
    K.f1 = t >= .03; K.f2 = t >= .15; K.bp1 = t < .03 ? -1 : seg(t, .03, .08); K.bp2 = t < .15 ? -1 : seg(t, .15, .2);
    K.press = Math.max(P(.03, .08), P(.15, .2)); K.fired = K.f1;
    K.ej = t < .45 ? 0 : seg(t, .45, .56); K.ld = t < .58 ? 0 : seg(t, .58, .7); K.trig = Math.max(K.trR, K.trL); K.h = K.hR;
  } else if (fam === 'lock') {
    const sub = I.sub, cap = sub === 'cap';
    K.trig = t < .05 ? seg(t, 0, .05) : t < .5 ? 1 : 1 - seg(t, .5, .55);
    K.h = t < .05 ? 1 : t < .1 ? 1 - eIn(seg(t, .05, .1)) : 0;
    K.fz = sub === 'flint' ? (t < .1 ? 0 : t < .14 ? eOut(seg(t, .1, .14)) : t < .9 ? 1 : 1) : 0;
    K.spark = sub === 'flint' ? (t > .1 && t < .2 ? seg(t, .1, .2) : 0) : sub === 'wheel' ? (t > .05 && t < .22 ? seg(t, .05, .22) : 0) : 0;
    K.spin = sub === 'wheel' ? seg(t, .05, .22) : 0;
    const flashT = cap ? .1 : sub === 'match' ? .12 : .14, igT = cap ? .13 : .3;
    K.flash = t > flashT && t < flashT + (cap ? .05 : .12) ? 1 - seg(t, flashT, flashT + (cap ? .05 : .12)) : 0;
    K.th = cap ? 0 : t > .24 && t < .31 ? seg(t, .24, .3) : 0;
    K.fired = t >= igT; K.bp = t < igT ? -1 : seg(t, igT, igT + .08); K.press = P(igT, igT + .08); K.igT = igT;
    if (sub === 'match') { K.h = t < .05 ? 1 : t < .12 ? 1 - eIO(seg(t, .05, .12)) : t < .5 ? 0 : seg(t, .5, .6); }
  } else if (fam === 'cannon') {
    K.ls = t < .12 ? eIO(seg(t, 0, .12)) : t < .3 ? 1 : 1 - seg(t, .3, .4);
    K.flash = t > .12 && t < .2 ? 1 - seg(t, .12, .2) : 0; K.vent = t > .14 && t < .21 ? seg(t, .14, .2) : 0;
    K.fired = t >= .2; K.bp = t < .2 ? -1 : seg(t, .2, .32); K.press = P(.2, .32);
    K.rc = t < .2 ? 0 : t < .34 ? eOut(seg(t, .2, .34)) : t < .6 ? 1 : 1 - eIO(seg(t, .6, .85)); K.trig = K.ls;
  } else if (fam === 'artillery') {
    const rcl = I.os === 'recoilless';
    K.trig = t < .04 ? seg(t, 0, .04) : t < .2 ? 1 : 1 - seg(t, .2, .25);
    K.fired = t >= .04; K.bp = t < .04 ? -1 : seg(t, .04, .12); K.press = P(.04, .12); K.h = t < .04 ? 1 - seg(t, 0, .04) : t > .9 ? 1 : 0;
    K.rc = rcl ? 0 : t < .06 ? 0 : t < .3 ? eOut(seg(t, .06, .3)) : t < .7 ? 1 - eIO(seg(t, .3, .7)) : 0;
    K.bo = t < .66 ? 0 : t < .72 ? eOut(seg(t, .66, .72)) : t < .88 ? 1 : 1 - eIO(seg(t, .88, .93));
    K.cej = t < .68 ? 0 : seg(t, .68, .8); K.rm = t < .78 ? 0 : eIO(seg(t, .78, .88)); K.blast = rcl && t > .04 && t < .2 ? seg(t, .04, .2) : 0;
  } else if (fam === 'mortar') {
    K.drop = t < .1 ? 0 : t < .45 ? eIn(seg(t, .1, .45)) : 1; K.fired = t >= .45; K.inc = t > .46 && t < .55 ? 1 - seg(t, .46, .55) : 0;
    K.bp = t < .47 ? -1 : seg(t, .47, .62); K.press = P(.46, .55); K.trig = 0; K.h = 0;
  } else if (fam === 'gatling') { K.rot = t; K.trig = 1; K.fired = true; K.press = 0; }
  return K;
}
function msMapOld(fam, B) {
  const wp = B.wp, size = clamp((wp.m.cal || .1) / .105, .4, 3), lockMs = (wp.lock || .1) * 1000;
  if (fam === 'falling') return [[0, 0], [.04, 4], [.12, 6], [.25, 500], [.4, 800], [.5, 1100], [.62, 1800], [.8, 2300], [1, 2600]];
  if (fam === 'break') return [[0, 0], [.03, 4], [.08, 6], [.12, 250], [.15, 254], [.2, 256], [.33, 900], [.45, 1200], [.58, 1700], [.72, 3000], [1, 3800]];
  if (fam === 'lock') return I_lockMap(B, lockMs);
  if (fam === 'cannon') return [[0, 0], [.12, 700], [.2, 760], [.32, 775], [.6, 1600], [1, 20000]];
  if (fam === 'artillery') { const s = size; return [[0, 0], [.04, 30], [.12, 30 + 9 * s], [.3, 250 * s], [.7, 1200 * s], [.93, 4000 * s], [1, 4600 * s]]; }
  if (fam === 'mortar') return [[0, 0], [.1, 400], [.45, 1000], [.5, 1004], [.62, 1012], [1, 2500]];
  if (fam === 'gatling') { const n = wp.m.nb || 6; const rev = n * 60000 / Math.max(60, wp.rpm || 600); return [[0, 0], [1, rev]]; }
  return [[0, 0], [1, 1000]];
}
function I_lockMap(B, lockMs) { const cap = /cap/.test(B.inner ? B.inner.os : ''); return cap ? [[0, 0], [.05, 6], [.1, 14], [.13, 15], [.21, 17], [1, 900]] : [[0, 0], [.05, 6], [.1, 22], [.24, 22 + lockMs * .55], [.3, 22 + lockMs], [.38, 25 + lockMs], [1, 900 + lockMs]]; }

function buildOld(B) {
  const wp = B.wp, rig = B.rig, os = G.opSystem(wp, rig), fam = OLDF[os];
  if (!fam) return null;
  const mt = mats(), g = new THREE.Group(); g.name = 'inner'; B.root.add(g);
  const parts = [], fixed = [], T = mt.steel.clone(); T.transparent = true; T.opacity = .45; T.depthWrite = false;
  const tag = (o, key) => { o.userData.inner = key; o.traverse(c => { c.userData.inner = key; }); return o; };
  const P = (key, obj, motion, parent, strip) => { tag(obj, key); { const cm = new Map(); obj.traverse(o => { if (o.isMesh && o.material) { if (!cm.has(o.material)) cm.set(o.material, o.material.clone()); o.material = cm.get(o.material); } }); } (parent || g).add(obj); const p = { key, name: nameOf(key), obj, home: obj.position.clone(), rot: obj.rotation.clone(), motion: motion ? (K => { if (K && K.fam) motion(K, obj); }) : null, strip, info: PI_[key] }; parts.push(p); return p; };
  const FX = (key, obj, parent) => { tag(obj, key); obj.userData.fixed = true; (parent || g).add(obj); fixed.push({ key, name: nameOf(key), obj, info: PI_[key] }); return obj; };
  const ammo = [];
  const AM = (o, parent) => { o.traverse(c => { c.userData.inner = 'ammo'; }); (parent || g).add(o); ammo.push(o); return o; };
  const glow = (r, parent) => { const s = M(gSph(r, 10), mt.glow.clone()); s.visible = false; s.userData.inner = 'gas'; (parent || g).add(s); ammo.push(s); return s; };
  const I = { os, def: G.OS[os], group: g, parts, fixed, v2: true, old: true, fam, F: { st: .05, rl: .05, by: 0, hz: 0 }, ammo: null };
  const save = [];
  const keep = o => { if (o) save.push([o, o.position.clone(), o.rotation.clone()]); };
  I.saveOuter = () => { save.length = 0; for (const k of ['brk', 'toplever', 'hammer', 'frizzen', 'wheel', 'recoilG', 'breech', 'rotor', 'crank', 'trigger']) keep(rig[k]); };
  I.restoreOuter = () => { for (const [o, p, r] of save) { o.position.copy(p); o.rotation.copy(r); } };

  if (fam === 'falling') {
    const bb = rig.breech, k = rig.fkind || 'martini', cal = G.CAL[wp.cal] || { cs: [.05, .006] }, by = rig.muzzleY || .005, face = -.01;
    FX('blockaxis', M(gCylX(.003, .003, .036, 8), mt.bright, 0, .02, .045));
    if (bb) { const st = grp(0, by - .012, -.03); st.add(M(gCyl(.0018, .0014, .045, 8), mt.bright)); const ms = coil(.004, .028, 9, .0007, mt.spring); ms.position.z = .006; st.add(ms);
      P('striker', st, K => { st.children[0].position.z = K.h * .006 - (K.fired && K.t < .1 ? .002 : 0); ms.userData.set(.028 - K.h * .008); }, bb, 'Unscrew the striker keeper and draw the striker and its spring out of the block'); }
    const ex = grp(0, by - .01, face - .004); ex.add(M(gBox(.012, .003, .014), mt.steel, 0, 0, .006)); ex.add(M(gBox(.003, .012, .003), mt.steel, 0, -.006, .012)); P('flextractor', ex, K => { ex.rotation.x = K.ej > 0 && K.ej < .5 ? -.5 : K.fo * -.15; });
    const tm = grp(0, -.018, .03); tm.add(M(gRBox(.006, .016, .01, .001), mt.park, 0, .006, 0)); P('tumbler', tm, K => { tm.rotation.x = -K.h * .6; });
    const se = M(gBox(.004, .004, .014), mt.bright, 0, -.03, .038); P('sear', se, K => { se.rotation.x = -K.trig * .25; });
    I.cart = AM(makeCart(wp.cal)); I.cart.position.set(0, by, face);
    I.F = { st: .03, rl: cal.cs[0] * 1.4, by, hz: face, muzzleZ: rig.muzzleZ };
    I.upd = K => { const c = I.cart, b = c.userData.bullet, L = Math.abs(rig.muzzleZ - face) - cal.cs[0];
      if (K.ej > 0 && K.ej < 1) { c.visible = K.ej < .7; c.position.set(0, by + K.ej * .1, face + K.ej * .2); c.rotation.x = K.ej * 3; b.visible = false; }
      else if (K.ld > 0 && K.t > .45) { c.visible = true; c.rotation.x = -.3 * (1 - K.ld); c.position.set(0, by + (1 - K.ld) * .03, face + (1 - K.ld) * .06); b.visible = true; b.position.z = -cal.cs[0]; }
      else if (K.ej >= 1) c.visible = false;
      else { c.visible = true; c.rotation.x = 0; c.position.set(0, by, face); b.visible = !K.fired || K.bp < 1; b.position.z = -cal.cs[0] - (K.fired ? Math.max(0, K.bp) * L : 0); }
      if (K.fired && !I._shot) { I._shot = true; const s0 = B.shots; BN.api.shoot(); B.shots = s0; } if (K.t < .02) I._shot = false;
      if (K.ej > 0 && !I._ej) { I._ej = true; BN.api.eject(false); } if (K.t < .3) I._ej = false; };
    I.outer = K => { const o = K.fo; if (bb) { const h = bb.userData.h0 || (bb.userData.h0 = { p: bb.position.clone(), r: bb.rotation.clone() }); bb.position.copy(h.p); bb.rotation.copy(h.r);
        if (k === 'martini') bb.rotation.x = .5 * o; else if (k === 'sharps') bb.position.y = h.p.y - .03 * o; else if (k === 'trapdoor') bb.rotation.x = -1.6 * o; else if (k === 'snider') bb.rotation.y = 1.6 * o; else bb.rotation.x = .9 * o; }
      if (rig.flever) rig.flever.rotation.x = .9 * o; if (rig.hammer) rig.hammer.rotation.x = K.h > .5 ? -.6 : 0; if (rig.trigger) rig.trigger.rotation.x = K.trig * .3; };
    I.rows = K => [['Breech block', K.fo < .02 ? 'up — breech sealed' : K.fo > .98 ? 'down — chamber open' : 'moving'], [rig.hammer ? 'Hammer' : 'Striker', K.h > .97 ? 'cocked' : K.h < .03 ? 'down' : 'cocking'], ['Extractor', K.ej > 0 && K.ej < 1 ? 'kicking the case out' : '—']];
  }
  else if (fam === 'break') {
    const m = wp.m, br = (m.B && m.B[1]) || .009, nb = Math.max(1, Math.min(2, m.nb || 2)), lay = m.lay || 'sxs';
    const bxs = lay === 'ou' ? [[0, .025], [0, .025 - br * 2.3]] : nb === 1 ? [[0, .02]] : [[-br * 1.15, .025], [br * 1.15, .025]];
    const brk = rig.brk;
    FX('hinge', M(gCylX(.004, .004, .046, 10), mt.bright, 0, -.025, -.05));
    const lump = grp(0, -.006 + (lay === 'ou' ? -br * 2 : 0), -.014); lump.add(M(gBox(.012, .012, .028), mt.steel)); lump.add(M(gBox(.012, .004, .006), mt.dark, 0, -.004, .006)); if (brk) P('lumps', lump, null, brk, 'Part of the barrels: comes off with them');
    const ub = M(gBox(.016, .005, .02), mt.bright, 0, -.033, -.035); P('underbolt', ub, K => { ub.position.z = -.035 + K.tl * .008; });
    const spd = grp(0, -.006, .035); spd.add(M(gCylY(.003, .003, .03, 8), mt.bright)); spd.add(M(gBox(.003, .003, .012), mt.bright, 0, -.012, -.006)); P('spindle', spd, K => { spd.rotation.y = K.tl * .6; });
    const ck = grp(0, -.03, -.044); ck.add(M(gBox(.004, .004, .045), mt.steel, 0, .004, .022)); P('cockrods', ck, K => { ck.rotation.x = -K.brk * .28; });
    const xs = nb === 1 ? [0] : [-.008, .008];
    xs.forEach((x, i) => {
      const tm = grp(x, -.014, .012); tm.add(M(gRBox(.004, .022, .012, .001), mt.park, 0, .009, -.002)); tm.add(M(gCylX(.003, .003, .006, 8), mt.dark));
      P('tumblers', tm, K => { tm.rotation.x = (i ? K.hL : K.hR) * .7 - .1; });
      const se = M(gBox(.004, .004, .014), mt.bright, x, -.02, .03); P('sears', se, K => { se.rotation.x = (i ? K.trL : K.trR) * -.25; });
      const ms = coil(.003, .022, 7, .0006, mt.spring); ms.position.set(x, -.024, .036); P('mainsprings', ms, K => { ms.userData.set(.022 - (i ? K.hL : K.hR) * .007); });
      const bx = bxs[i] || bxs[0], fp = M(gCyl(.0018, .0014, .012, 8), mt.bright, bx[0], bx[1] - .025, -.044); P('firingpins', fp, K => { const f = i ? K.f2 && K.t < .2 : K.f1 && K.t < .08; fp.position.z = -.044 - (f ? .002 : 0); });
      const tr = grp(0, -.04, .03 + i * .014); tr.add(M(gBox(.004, .016, .004), mt.steel, 0, -.008, 0)); P('triggers', tr, K => { tr.rotation.x = -(i ? K.trL : K.trR) * .35; });
      if (brk) { const ej = M(gCyl(.0025, .0025, .05, 8), mt.steel, bx[0], bx[1] - br * 1.05, -.03); P('ejectors', ej, K => { ej.position.z = -.03 + (K.ej > 0 && K.ej < .4 ? .008 : 0); }, brk); }
    });
    const sf = M(gBox(.006, .003, .01), mt.bright, 0, .023, .045); P('safety', sf, K => { sf.position.z = .045 + (K.t > .85 || K.t < .01 ? 0 : .004); });
    // shells in the chambers (riding on the barrels), and their shot charges
    I.shells = bxs.slice(0, nb).map(b => { const s = makeCart(wp.cal); s.position.set(b[0], b[1], 0); if (brk) AM(s, brk); else AM(s); return s; });
    I.F = { st: .05, rl: .07, by: 0, hz: -.05, muzzleZ: rig.muzzleZ, L: (rig.muzzleZ || -.8) + .05 };
    I.upd = K => {
      const L = Math.abs(rig.muzzleZ + .05);
      I.shells.forEach((s, i) => { const f = i ? K.f2 : K.f1, bp = i ? K.bp2 : K.bp1; const b = s.userData.bullet; b.visible = !f || bp < 1; b.position.z = -(G.CAL[wp.cal] || { cs: [.06] }).cs[0] - (f ? Math.max(0, bp) * L : 0);
        const bx = bxs[i] || bxs[0];
        if (K.ej > 0 && K.ej < 1 && f) { s.visible = K.ej < .7; s.position.set(bx[0] + (i ? .02 : -.02) * K.ej, bx[1] + K.ej * .12, K.ej * .25); s.rotation.x = K.ej * 3; }
        else if (K.ld > 0 && K.t > .5) { s.visible = true; s.rotation.x = 0; s.position.set(bx[0], bx[1] + (1 - K.ld) * .03, (1 - K.ld) * .09); b.visible = true; b.position.z = -(G.CAL[wp.cal] || { cs: [.06] }).cs[0]; }
        else if (K.ej >= 1 && K.ld <= 0) s.visible = false;
        else { s.visible = true; s.rotation.x = 0; s.position.set(bx[0], bx[1], 0); } });
      if ((K.f1 && !I._s1) || (K.f2 && !I._s2)) { const sh = B.shots; BN.api.shoot(); B.shots = sh; if (K.f1) I._s1 = true; if (K.f2) I._s2 = true; }
      if (K.t < .02) I._s1 = I._s2 = false;
      if (K.ej > 0 && !I._ej) { I._ej = true; BN.api.eject(false); if (nb > 1) BN.api.eject(false); } if (K.t < .4) I._ej = false;
    };
    I.outer = K => { if (rig.brk) rig.brk.rotation.x = (rig.brkOpen || -.6) * K.brk; if (rig.toplever) rig.toplever.rotation.y = K.tl * .6; if (rig.trigger) rig.trigger.rotation.x = K.trig * .3; if (rig.hammer) rig.hammer.rotation.x = K.hR > .5 ? -.6 : 0; };
    I.rows = K => [['Top lever / underbolt', K.tl > .5 ? 'across — bolt withdrawn' : 'home — barrels bolted'], ['Barrels', K.brk < .02 ? 'closed' : K.brk > .98 ? 'fully open' : `opening ${Math.round(K.brk * 100)}%`], ['Right tumbler', K.hR > .97 ? 'cocked' : K.hR < .03 ? 'down' : 'moving'], ['Left tumbler', K.hL > .97 ? 'cocked' : K.hL < .03 ? 'down' : 'moving'], ['Ejectors', K.ej > 0 && K.ej < 1 ? 'kicking' : '—']];
  }
  else if (fam === 'lock') {
    const sub = os.replace('lock_', ''); I.sub = sub;
    const hp = rig.hammer ? rig.hammer.position.clone() : V3(.02, .01, .02), pan = rig.panPos ? rig.panPos.clone() : hp.clone().add(V3(0, .01, -.04));
    const sz = Math.max(.6, Math.abs(hp.z - pan.z) / .042), xi = hp.x - .007 * sz;
    const cal = G.CAL[wp.cal] || { cs: [.02, .009] }, br = cal.cs[1] * 1.05, by = rig.muzzleY || 0, bz0 = Math.min(pan.z + .01 * sz, (rig.zr ?? .02));
    const tum = grp(xi, hp.y, hp.z); tum.add(M(gCylX(.007 * sz, .007 * sz, .004 * sz, 14), mt.park)); tum.add(M(gBox(.003 * sz, .004 * sz, .006 * sz), mt.bright, 0, -.006 * sz, .002 * sz));
    P('tumbler', tum, K => { tum.rotation.x = -K.h * .9; });
    const vs = grp(xi - .001, hp.y - .006 * sz, hp.z - .004 * sz); const la = M(gBox(.002 * sz, .0025 * sz, .045 * sz), mt.spring, 0, .0, -.022 * sz), lb = M(gBox(.002 * sz, .0025 * sz, .045 * sz), mt.spring, 0, -.004 * sz, -.022 * sz); vs.add(la, lb);
    P('vspring', vs, K => { la.rotation.x = -.04 + K.h * .1; lb.rotation.x = .08; });
    const se = grp(xi - .001, hp.y + .002 * sz, hp.z + .014 * sz); se.add(M(gBox(.002 * sz, .003 * sz, .016 * sz), mt.bright, 0, 0, .002 * sz)); P('sear', se, K => { se.rotation.x = K.trig * .3; });
    const ss = M(gBox(.0015 * sz, .002 * sz, .02 * sz), mt.spring, xi - .002, hp.y + .007 * sz, hp.z + .02 * sz); P('searspring', ss, K => { ss.rotation.x = K.trig * .12; });
    const bd = M(gBox(.0015 * sz, .014 * sz, .03 * sz), T, xi - .0035, hp.y, hp.z - .004 * sz); P('bridle', bd, null);
    if (sub === 'flint') { const fs = grp(xi + .002, pan.y - .008 * sz, pan.z - .006 * sz); const lf = M(gBox(.002 * sz, .0022 * sz, .03 * sz), mt.spring, 0, 0, -.012 * sz); fs.add(lf); P('frizzspring', fs, K => { lf.rotation.x = K.fz * .15; }); }
    if (sub === 'cap') FX('nipple', M(gCylY(.002 * sz, .0035 * sz, .008 * sz, 8), mt.steel, pan.x, pan.y, pan.z));
    if (sub === 'wheel') FX('wheelpart', M(gTor(.009 * sz, .001 * sz), mt.bright, pan.x, pan.y - .006 * sz, pan.z));
    if (sub === 'match') FX('serpentine', M(gTor(.012 * sz, .0012 * sz, PI), T, hp.x + .002, hp.y + .008 * sz, hp.z - .01 * sz));
    const tg = grp(0, (rig.bot ?? -.03) + .004, hp.z + .028 * sz); tg.add(M(gBox(.003, .016 * sz, .004), mt.steel, 0, -.008 * sz, 0)); tg.add(M(gBox(.002, .002, Math.abs(hp.z + .014 * sz - tg.position.z) + .004), mt.steel, 0, .002, -.006 * sz)); P('trigger', tg, K => { tg.rotation.x = -K.trig * .3; });
    FX('touchhole', M(gCylX(.0012 * sz, .0012 * sz, Math.abs(pan.x) + .002, 6), mt.dark, pan.x / 2, by, pan.z));
    FX('breechplug', M(gCyl(br * 1.6, br * 1.6, .012 * sz, 12), T, 0, by, bz0 + .006 * sz));
    // charge, wad, ball, priming, sparks, flash
    const chL = br * 3.2; const ch = AM(M(gCyl(br, br, chL, 12), mt.poly, 0, by, bz0 - chL / 2));
    const wad = AM(M(gCyl(br, br, br * .4, 12), mt.wood, 0, by, bz0 - chL - br * .2));
    const ball = AM(M(gSph(br * .95, 12), mt.dark, 0, by, bz0 - chL - br * 1.4));
    const prime = AM(M(gCyl(.004 * sz, .004 * sz, .0015, 10), mt.poly, pan.x, pan.y + .0005, pan.z)); prime.rotation.x = PI / 2;
    const sparks = []; for (let i = 0; i < 10; i++) { const s = M(gSph(.0028 * sz, 6), mt.gas); s.visible = false; s.userData.inner = 'gas'; g.add(s); ammo.push(s); sparks.push(s); }
    const fl = glow(.008 * sz), thg = glow(.004 * sz), chg = glow(br * 1.4);
    I.F = { st: .03, rl: br * 4, by, hz: bz0, muzzleZ: rig.muzzleZ };
    I.upd = K => {
      const L = Math.abs((rig.muzzleZ ?? -1) - (bz0 - chL));
      ball.visible = !K.fired || K.bp < 1; ball.position.z = bz0 - chL - br * 1.4 - (K.fired ? Math.max(0, K.bp) * L : 0); wad.visible = !K.fired || K.bp < .6; wad.position.z = bz0 - chL - br * .2 - (K.fired ? Math.max(0, K.bp) * L * .9 : 0);
      ch.visible = !K.fired; prime.visible = sub !== 'cap' && K.flash <= 0 && !(K.t > .2); chg.position.set(0, by, bz0 - chL / 2); chg.visible = K.fired && K.t < K.igT + .1; chg.scale.setScalar(1 + (K.press || 0) * 1.5);
      fl.position.copy(pan).add(V3(0, .004 * sz, 0)); fl.visible = K.flash > 0; fl.scale.setScalar(.6 + K.flash * .9);
      thg.visible = K.th > 0; thg.position.set(pan.x * (1 - K.th), by + (pan.y - by) * (1 - K.th) * .3, pan.z);
      sparks.forEach((s, i) => { const u = K.spark * 1.4 - i * .04; if (K.spark <= 0 || u < 0 || u > 1) { s.visible = false; return; } s.visible = true; const a = i * 2.4; s.position.set(pan.x + Math.cos(a) * .014 * sz * u, pan.y + .03 * sz * (1 - u) * u * 4 - .006 * sz * u, pan.z + Math.sin(a) * .014 * sz * u - .008 * sz * (1 - u)); });
      if (K.fired && !I._shot) { I._shot = true; const sh = B.shots; BN.api.shoot(); B.shots = sh; } if (K.t < .02) I._shot = false;
    };
    I.outer = K => { if (rig.hammer) rig.hammer.rotation.x = -.9 * K.h; if (rig.frizzen) rig.frizzen.rotation.x = -1.1 * K.fz; if (rig.wheel && K.spin > 0 && K.spin < 1) rig.wheel.rotation.x += .4; };
    I.rows = K => [[sub === 'match' ? 'Serpentine' : sub === 'cap' ? 'Hammer' : sub === 'wheel' ? 'Dog (pyrite)' : 'Cock', K.h > .97 ? 'full cock' : K.h < .03 ? 'down' : 'falling'], ...(sub === 'flint' ? [['Frizzen', K.fz > .9 ? 'thrown open' : 'closed over the pan']] : []), ...(sub === 'wheel' ? [['Wheel', K.spin > 0 && K.spin < 1 ? 'spinning — sparks' : '—']] : []), ['Pan', K.flash > 0 ? 'FLASH' : sub === 'cap' ? (K.t > .1 ? 'cap fired' : 'cap on the nipple') : K.t > .2 ? 'burnt out' : 'primed'], ['Touch-hole', K.th > 0 ? 'flame passing' : '—']];
  }
  else if (fam === 'cannon' || fam === 'artillery' || fam === 'mortar') {
    const m = wp.m, bore = m.cal || .1, b = bore / 2, L = m.L || 1.5;
    const rec = rig.recoilG || B.root, piv = rec.parent || B.root;
    const tubeG = fam === 'cannon' ? (rec.children.find(c => c.isGroup && Math.abs(c.rotation.x - .78) < .02) || rec) : rec;
    const breechL = fam === 'cannon' ? 0 : bore * 3.2;
    if (fam === 'cannon') {
      const rb = bore * 1.45, v = rig.ventPos || V3(0, rb, -bore * .4);
      FX('vent', M(gCylY(bore * .05, bore * .05, v.y, 6), mt.dark, 0, v.y / 2, v.z), tubeG);
      FX('trunnions', M(gCylX(bore * .3, bore * .3, rb * 2.9, 12), T, 0, 0, -L * (m.t === 'mortar_old' ? .3 : .42)), tubeG);
      FX('cascabel', M(gSph(rb * .34, 10), T, 0, 0, rb * 1.15), tubeG);
      const ls = grp(rb * 1.6, v.y + bore * 2, v.z + bore * .6); ls.add(M(gCyl(.008, .006, .9, 8), mt.wood, 0, 0, .45)); ls.add(M(gSph(.012, 8), mt.glow, 0, 0, -.01)); ls.rotation.x = -.6;
      P('linstock', ls, K => { ls.position.set(rb * 1.6 * (1 - K.ls * .85), v.y + bore * 2 * (1 - K.ls * .8) + .01, v.z + bore * .6); }, tubeG);
      const bagL = bore * 2.2, z0 = -bore * .35;
      const bag = AM(M(gCyl(b * .95, b * .95, bagL, 14), mt.wood, 0, 0, z0 - bagL / 2), tubeG); bag.material = bag.material.clone(); bag.material.color.set('#c9b98e');
      const wad = AM(M(gCyl(b * .95, b * .95, b * .3, 12), mt.wood, 0, 0, z0 - bagL - b * .15), tubeG);
      const shot = AM(M(gSph(b * .93, 14), mt.dark, 0, 0, z0 - bagL - b * 1.3), tubeG);
      const quill = AM(M(gCylY(bore * .03, bore * .03, bore * .25, 6), mt.brass, 0, v.y + bore * .1, v.z), tubeG);
      const fl = glow(bore * .3, tubeG), vg = glow(bore * .08, tubeG), cg = glow(b * 1.3, tubeG);
      I.F = { st: .1, rl: bore * 2, by: 0, hz: -bore * 1.5, muzzleZ: -L, space: tubeG };
      const rdist = clamp(bore * 4, .08, .6);
      I.upd = K => { shot.visible = !K.fired || K.bp < 1; shot.position.z = z0 - bagL - b * 1.3 - (K.fired ? Math.max(0, K.bp) * (L - bagL) : 0); wad.visible = !K.fired || K.bp < .5; wad.position.z = z0 - bagL - b * .15 - (K.fired ? Math.max(0, K.bp) * L * .5 : 0); bag.visible = !K.fired; quill.visible = K.flash <= 0 && K.t < .14;
        fl.visible = K.flash > 0; fl.position.set(0, v.y + bore * .2, v.z); fl.scale.setScalar(.6 + K.flash * 1.6); vg.visible = K.vent > 0; vg.position.set(0, v.y * (1 - K.vent), v.z); cg.visible = K.fired && K.t < .3; cg.position.set(0, 0, z0 - bagL / 2); cg.scale.setScalar(1 + (K.press || 0));
        if (K.fired && !I._shot) { I._shot = true; const sh = B.shots; BN.api.shoot(); B.shots = sh; } if (K.t < .05) I._shot = false; };
      I.outer = K => { if (rig.recoilG) rig.recoilG.position.z = K.rc * rdist; };
      I.rows = K => [['Linstock', K.ls > .95 ? 'at the vent' : K.ls > 0 ? 'coming down' : 'raised'], ['Vent', K.vent > 0 ? 'flame running down' : K.flash > 0 ? 'primer flashing' : '—'], ['Recoil', `${Math.round(K.rc * rdist * 100)} cm`]];
    } else if (fam === 'artillery') {
      const rcl = os === 'recoilless', bag = !!(G.CAL[wp.cal] || {}).bag;
      const faceZ = rcl ? -bore * .2 : -bore * 1.2, caseL = bag ? 0 : bore * (rcl ? 2.5 : 4.5), shellL = bore * 3.4;
      if (rig.breech) { const fp = grp(0, 0, -bore * .6); fp.add(M(gCyl(bore * .08, bore * .06, bore * 1.0, 8), mt.bright)); const sp = coil(bore * .14, bore * .6, 8, bore * .02, mt.spring); sp.position.z = bore * .25; fp.add(sp);
        P('blockfp', fp, K => { fp.children[0].position.z = K.h * bore * .15 - (K.fired && K.t < .1 ? bore * .08 : 0); }, rig.breech, 'Withdraw the firing mechanism from the breech block'); }
      if (!rcl) {
        for (const s of [-1, 1]) { const ex = grp(s * bore * .75, -bore * .3, faceZ - bore * .1); ex.add(M(gBox(bore * .15, bore * .8, bore * .4), mt.steel, 0, bore * .3, 0)); P('extractors', ex, K => { ex.rotation.x = K.bo * -.5 + (K.cej > 0 && K.cej < .3 ? -.3 : 0); }, rec); }
        const cam = M(gBox(bore * .3, bore * .4, bore * .9), mt.red, bore * 1.4, bore * .9, -bore * .8); P('breechcam', cam, K => { cam.rotation.z = K.bo * .5; }, rec);
        const bl = Math.max(.2, L * .3), cy = M(gCyl(bore * .45, bore * .45, bl, 12, true), T, 0, -bore * 2.1, -breechL - bl * .3); FX('buffercyl', cy, piv);
        const rod = M(gCyl(bore * .18, bore * .18, bl * 1.1, 8), mt.bright, 0, -bore * 2.1, -breechL - bl * .3 + bl * .05); P('buffercyl', rod, null, rec, 'Drain the buffer oil and draw out the piston rod');
        const rcp = coil(bore * .42, bl, 14, bore * .05, mt.spring); rcp.position.set(0, bore * 2.2, -breechL - bl * .3); const rd = rig.recoilDist || clamp(bore * 4, .1, 1.2);
        P('recup', rcp, K => { const Ln = bl - K.rc * rd * .7; rcp.userData.set(Math.max(bl * .3, Ln)); rcp.position.z = -breechL - bl * .3 + (bl - Math.max(bl * .3, Ln)) / 2; }, piv);
        FX('cradle', M(gRBox(bore * 2.6, bore * .4, L * .35, bore * .1), T, 0, -bore * 1.3, -breechL - L * .15), piv);
        I.F = { rd };
      } else { FX('venturi', M(gCyl(bore * .6, bore * 1.1, bore * 2.4, 14, true), T, 0, 0, bore * 1.3), rec);
        const fm = grp(bore * .9, bore * .6, bore * .4); fm.add(M(gBox(bore * .25, bore * .3, bore * .6), mt.park)); fm.add(M(gCyl(bore * .05, bore * .05, bore * .5, 6), mt.bright, -bore * .2, -bore * .2, -bore * .1));
        P('blockfp', fm, K => { fm.children[1].position.z = -bore * .1 - (K.fired && K.t < .1 ? bore * .06 : 0); }, rec, 'Unclip the firing mechanism from the venturi block'); }
      // ammunition: chambered round and the next one
      const mkRound = () => { const r = new THREE.Group(); if (!bag) { const cs = M(gCyl(b * 1.02, b * 1.02, caseL, 16), mt.brass, 0, 0, -caseL / 2); r.add(cs); r.userData.case = cs; }
        else { for (let i = 0; i < 2; i++) { const bg = M(gCyl(b * .95, b * .95, bore * 1.2, 12), mt.wood, 0, 0, -bore * .65 - i * bore * 1.25); bg.material = bg.material.clone(); bg.material.color.set('#9a8a62'); r.add(bg); } }
        const sh = new THREE.Group(); sh.add(M(gCyl(b * .98, b * .98, shellL * .6, 16), mt.park, 0, 0, -shellL * .3)); sh.add(M(gCyl(b * .98, b * .15, shellL * .4, 16), mt.park, 0, 0, -shellL * .8)); sh.add(M(gTor(b * .98, b * .06), mt.copper, 0, 0, -shellL * .12));
        sh.position.z = -(bag ? bore * 2.6 : caseL); r.add(sh); r.userData.shell = sh; r.traverse(c => { c.userData.inner = 'ammo'; }); return r; };
      const A = AM(mkRound(), rec), N = AM(mkRound(), rec); A.position.set(0, 0, faceZ); N.visible = false;
      const bb = []; if (rcl) for (let i = 0; i < 10; i++) { const s = M(gSph(bore * (.5 + i * .04), 8), mt.gas); s.visible = false; s.userData.inner = 'gas'; rec.add(s); ammo.push(s); bb.push(s); }
      const boreL = L + (breechL - Math.abs(faceZ)) + (bag ? 0 : -caseL);
      I.F = Object.assign(I.F || {}, { st: bore * 3, rl: bore * 6, by: 0, hz: faceZ, muzzleZ: -breechL - L, space: rec });
      I.upd = K => {
        const sh = A.userData.shell; sh.visible = !K.fired || K.bp < 1; sh.position.z = -(bag ? bore * 2.6 : caseL) - (K.fired ? Math.max(0, K.bp) * boreL : 0);
        if (A.userData.case) { if (K.cej > 0 && K.cej < 1) { A.userData.case.visible = true; A.position.set(0, -K.cej * bore * 3, faceZ + K.cej * caseL * 2.4); A.rotation.x = K.cej * .8; } else if (K.cej >= 1) A.visible = false; else { A.visible = true; A.position.set(0, 0, faceZ); A.rotation.x = 0; } }
        else { A.visible = K.t < .66; A.children.forEach(c => { if (c !== sh) c.visible = !K.fired; }); }
        if (K.rm > 0) { N.visible = true; N.position.set(0, 0, faceZ + (1 - K.rm) * (caseL + shellL + bore)); } else N.visible = false;
        bb.forEach((s, i) => { const u = K.blast * 1.2 - i * .05; if (!K.blast || u < 0 || u > 1) { s.visible = false; return; } s.visible = true; s.position.set((i % 3 - 1) * bore * .5 * u, (i % 2 - .5) * bore * .5 * u, bore * 1.5 + u * bore * 14); });
        if (K.fired && !I._shot) { I._shot = true; const s0 = B.shots; BN.api.shoot(); B.shots = s0; } if (K.t < .02) I._shot = false;
      };
      I.outer = K => { if (rig.recoilG && !rcl) rig.recoilG.position.z = K.rc * (I.F.rd || .3); if (rig.breech) { const h = rig.breech.userData.h0 || (rig.breech.userData.h0 = { p: rig.breech.position.clone(), r: rig.breech.rotation.clone() }); rig.breech.position.copy(h.p); rig.breech.rotation.copy(h.r); if (rig.breechSlide) rig.breech.position.x = h.p.x + K.bo * bore * 2.6; else rig.breech.rotation.y = h.r.y + K.bo * 1.3; } };
      I.rows = K => [['Breech', K.bo < .02 ? 'closed' : K.bo > .98 ? 'open' : 'moving'], ...(rcl ? [['Backblast', K.blast > 0 ? 'venting through the venturi' : '—']] : [['Recoil', `${Math.round(K.rc * (I.F.rd || .3) * 100)} cm of ${Math.round((I.F.rd || .3) * 100)} cm`], ['Buffer', K.rc > 0 ? 'oil forced through the ports' : '—'], ['Recuperator', `${Math.round(K.rc * 100)}% compressed`]]), ['Case', bag ? 'bagged charge — no case' : K.cej > 0 && K.cej < 1 ? 'thrown out' : K.cej >= 1 ? 'clear' : 'in the chamber'], ['Rammer', K.rm > 0 && K.rm < 1 ? 'ramming the next round' : K.rm >= 1 ? 'round home' : '—']];
    } else { // mortar
      const baseZ = -breechL, muzZ = -breechL - L;
      const fp = M(gCyl(b * .12, b * .02, b * .5, 8), mt.bright, 0, 0, baseZ - b * .25); FX('basecap', fp, rec);
      P('basecap', M(gCyl(b * 1.25, b * 1.25, b * .6, 14), T, 0, 0, baseZ + b * .3), null, rec, 'Unscrew the base cap (and its firing pin) from the bottom of the tube');
      const bomb = new THREE.Group(); bomb.add(M(gSph(b * .92, 14), mt.park)); bomb.children[0].scale.set(1, 1, 1.7); bomb.add(M(gCyl(b * .9, b * .1, b * 1.2, 12), mt.park, 0, 0, -b * 2.0));
      bomb.add(M(gCyl(b * .22, b * .22, b * 2.4, 8), mt.park, 0, 0, b * 2.4)); for (let i = 0; i < 6; i++) { const f = M(gBox(b * .05, b * .75, b * .9), mt.park, 0, 0, b * 3.4); f.rotation.z = i / 6 * PI; f.position.set(0, 0, b * 3.4); bomb.add(f); }
      const prim = M(gCyl(b * .18, b * .18, b * .5, 8), mt.brass, 0, 0, b * 3.85); bomb.add(prim); for (let i = 0; i < 3; i++) { const ic = M(gTor(b * .32, b * .1), mt.wood, 0, 0, b * (1.8 + i * .4)); ic.material = ic.material.clone(); ic.material.color.set('#4d6b3a'); bomb.add(ic); }
      AM(bomb, rec); const ig = glow(b * .8, rec);
      I.F = { st: L * .25, rl: L * .3, by: 0, hz: baseZ - L * .4, muzzleZ: muzZ, space: rec };
      const tailOff = b * 4.1;
      I.upd = K => { const zDown = (muzZ - tailOff * .2) + (baseZ - tailOff - (muzZ - tailOff * .2)) * K.drop; const z = K.fired ? (baseZ - tailOff) + (muzZ - b * 3 - (baseZ - tailOff)) * Math.max(0, K.bp) * 1.15 : zDown;
        bomb.position.set(0, 0, z); bomb.visible = !(K.fired && K.bp >= .9); ig.visible = K.inc > 0; ig.position.set(0, 0, baseZ - b * 1.2); ig.scale.setScalar(.6 + K.inc * 1.6);
        if (K.fired && !I._shot) { I._shot = true; const s0 = B.shots; BN.api.shoot(); B.shots = s0; } if (K.t < .05) I._shot = false; };
      I.outer = () => {};
      I.rows = K => [['Bomb', K.fired ? (K.bp < 1 ? 'going up the tube' : 'away') : K.drop > 0 ? `sliding down (${Math.round(K.drop * 100)}%)` : 'held at the muzzle'], ['Primary cartridge', K.fired ? 'fired' : 'intact'], ['Increments', K.inc > 0 ? 'burning' : K.fired ? 'burnt' : 'on the tail boom']];
    }
  }
  else if (fam === 'gatling') {
    const rot = rig.rotor; if (!rot) { B.root.remove(g); return null; }
    const art = os === 'rotary', par = rot.parent || B.root;
    const nb = wp.m.nb || 6, R = art ? (wp.m.cal || .02) * 2.2 : (nb > 6 ? .045 : .036), z0 = rot.position.z, cal = G.CAL[wp.cal] || { cs: [.05, .006] }, rl = cal.cs[0] * 1.5, by = rot.position.y;
    const camG = M(gTor(R * 1.05, R * .08), mt.red, 0, by, z0 + rl * 1.2); camG.rotation.y = .5; FX('cam', camG, par);
    const camG2 = M(gTor(R * 1.05, R * .06), mt.red, 0, by, z0 + rl * .3); camG2.rotation.y = -.5; FX('cam', camG2, par);
    const carr = grp(0, 0, 0); for (let i = 0; i < nb; i++) { const a = i / nb * 2 * PI; carr.add(M(gBox(cal.cs[1] * 2.6, cal.cs[1] * .5, rl * 1.3), mt.brass, Math.cos(a) * R, Math.sin(a) * R, rl * .9)); }
    P('carrierg', carr, null, rot, 'Remove the rear plate and draw the carrier block off the shaft');
    const bolts = grp(0, 0, 0); for (let i = 0; i < nb; i++) { const a = i / nb * 2 * PI; const bo = M(gCyl(cal.cs[1] * 1.1, cal.cs[1] * 1.1, rl * 1.2, 8), mt.bright, Math.cos(a) * R, Math.sin(a) * R, rl * 1.6); bolts.add(bo); }
    const phase = (i, t) => { const a = i / nb + t; return ((a - .25) % 1 + 1) % 1; }; // 0 at the top, .5 at the bottom
    const boltZ = p => p < .08 ? rl * 1.6 : p < .5 ? rl * 1.6 - (p - .08) / .42 * rl * 1.25 : p < .85 ? rl * .35 + (p - .5) / .35 * rl * 1.25 : rl * 1.6;
    P('bolts', bolts, K => { bolts.children.forEach((bo, i) => { bo.position.z = boltZ(phase(i, K.rot)); }); }, rot, 'Each bolt slides out of its track once the carrier is off');
    if (art) FX('drive', M(gCyl(R * .9, R * .9, rl * 1.4, 14), T, 0, by, z0 + rl * 3), par);
    else { const gr = grp(.07, by, z0 + .14); gr.add(M(gCylX(.026, .026, .008, 16), mt.brass)); gr.add(M(gCyl(.022, .022, .008, 16), mt.brass, -.05, 0, 0)); P('gears', gr, K => { gr.children[0].rotation.x = K.rot * 2 * PI * 4; gr.children[1].rotation.z = K.rot * 2 * PI; }, par); }
    FX('hopper', M(gRBox(cal.cs[1] * 4, R * 1.2, rl * 1.4, .003), T, 0, by + R * 1.9, z0 + rl * 1.0), par);
    const rounds = []; for (let i = 0; i < nb; i++) { const r = makeCart(wp.cal); AM(r, rot); rounds.push(r); }
    I.F = { st: rl, rl: rl * 1.6, by, hz: z0 + rl, muzzleZ: rig.muzzleZ, space: par };
    const rot0 = rot.rotation.z, crank0 = rig.crank ? rig.crank.rotation.x : 0;
    I.upd = K => { rounds.forEach((r, i) => { const p = phase(i, K.rot), a = i / nb * 2 * PI, x = Math.cos(a) * R, y = Math.sin(a) * R; const b = r.userData.bullet;
        if (p < .08) { r.visible = true; r.position.set(x * (p / .08) + 0 * (1 - p / .08), y * (p / .08) + (R * 1.6) * (1 - p / .08), rl * .95); b.visible = true; b.position.set(0, 0, -cal.cs[0]); }
        else if (p < .5) { r.visible = true; r.position.set(x, y, boltZ(p) - rl * .62); b.visible = true; b.position.set(0, 0, -cal.cs[0]); }
        else if (p < .85) { r.visible = true; r.position.set(x, y, boltZ(p) - rl * .62); b.visible = false; }
        else { r.visible = p < .93; r.position.set(x * 1.4, y - (p - .85) * .4, rl * 1.2); b.visible = false; } });
      const fires = Math.floor(K.rot * nb + .25 * nb + .5); if (I._lastF === undefined || K.t < .01) I._lastF = fires; if (fires > I._lastF) { I._lastF = fires; const s0 = B.shots; BN.api.shoot(); B.shots = s0; } };
    I.outer = K => { rot.rotation.z = rot0 + K.rot * 2 * PI; if (rig.crank && !art) rig.crank.rotation.x = crank0 + K.rot * 2 * PI / 4 * 4; };
    I.rows = K => [['Barrel cluster', `${Math.round(K.rot * 360)}° of one turn`], ['Firing', `${nb} shots per turn · ${Math.round(wp.rpm || 600)} rpm`], ['Drive', art ? 'electric motor' : 'hand crank, geared ×4']];
  }
  I.ammoObjs = ammo;
  return I;
}

// ------------------------------------------------------------------ hook into the bench
BN.buildInner2 = B => {
  let I = null;
  try { I = build2(B); if (I) ammoSetup(B, I); else I = buildOld(B); if (I) I.group.visible = false; }
  catch (e) { console.warn('inner workings v2 failed for', B.wp.id, e); if (I && I.group) B.root.remove(I.group); I = null; }
  return I;
};
const th0 = BN.tickHook;
BN.tickHook = (dt, B) => {
  const I = B.inner;
  if (I && I.v2) {
    if (BN.cyc) { startCycle(B, { speed: BN.cyc.dur && BN.cyc.dur < 1 ? 1 : undefined }); BN.cyc = null; }
    const stripped = BN.strip && BN.strip.steps.some(s => s.done);
    if (I.group.visible && !stripped) { const K = animate(B, dt); if (BN.tab === 'works') worksTick(B, K); }
    else if (stripped && I.ammo) { for (const o of [I.ammo.A, I.ammo.N, ...I.ammo.list, ...I.ammo.gas]) o.visible = false; }
    else if (stripped && I.ammoObjs) { for (const o of I.ammoObjs) o.visible = false; }
    if (!I.group.visible && BN.cyc2) stopCycle(B);
  }
  th0(dt, B);
  if (I && I.old && BN.cyc2 && I.outer && lastK && !lastK.manual && I.group.visible) I.outer(lastK);
  if (B.malT !== undefined && BN.mal) BN.mal.tick(B, dt);
};

// ------------------------------------------------------------------ wear: every round fired, here or in the field, counts against each part's service life
const WKEY = 'ironsight.wear';
G.Wear = { data: (() => { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } })(), dirty: false };
G.Wear.rec = id => G.Wear.data[id] || (G.Wear.data[id] = { n: 0, rep: {} });
G.Wear.add = (id, k = 1) => { G.Wear.rec(id).n += k; G.Wear.dirty = true; };
G.Wear.life = (wp, key) => { const b = (PI_[key] || [0, 0, 0, 20000])[3]; return wp.c === 'PST' && key === 'spring' ? 3000 : wp.act === 'auto_ob' && key === 'spring' ? 12000 : b; };
G.Wear.frac = (wp, key) => { const r = G.Wear.rec(wp.id); return (r.n - (r.rep[key] || 0)) / G.Wear.life(wp, key); };
G.Wear.replace = (id, key) => { const r = G.Wear.rec(id); r.rep[key] = r.n; G.Wear.dirty = true; };
// how much worn springs and claws add to the stoppage rate
G.Wear.risk = wp => { if (!G.WEAPON[wp.id]) return 0; let r = 0; for (const k of ['spring', 'exspring', 'magspring', 'gasrings', 'extractor']) r += Math.max(0, G.Wear.frac(wp, k) - .8) * .01; return Math.min(.05, r); };
setInterval(() => { if (G.Wear.dirty) { G.Wear.dirty = false; try { localStorage.setItem(WKEY, JSON.stringify(G.Wear.data)); } catch (e) {} } }, 3000);
BN.onFire = B => { G.Wear.add(B.wp.id); G.Fouling.add(B.wp); };
{ const PP = G.Player.prototype, f0 = PP.fire; PP.fire = function (now) { const w = this.W, m0 = w ? w.mag : 0; const r = f0.call(this, now); if (w && w.mag < m0) G.Wear.add(w.wp.id, m0 - w.mag); return r; }; }

// ------------------------------------------------------------------ malfunctions on the bench and the drills that clear them
const OSR = { long_piston: .0015, roller: .002, oprod: .002, di: .003, short_piston: .0022, blowback: .003, blowback_ob: .004, roller_recoil: .003, maxim: .003, browning_mg: .003, short_recoil: .003, blowback_pistol: .004, toggle: .006, bolt: .0008, bolt_straight: .001, lever: .002, pump: .0025, revolver: .0008, caseless: .004 };
const MALN = { stovepipe: 'Stovepipe', ftf: 'Failure to feed', doublefeed: 'Double feed', fte: 'Failure to extract', oob: 'Out of battery', dud: 'Dud (light strike)', hangfire: 'Hangfire' };
const MALD = {
  stovepipe: 'The empty case was caught by the closing slide and stands up in the ejection port like a chimney. Weak recoil spring, limp wrist, dirty chamber or weak ammo. Clear: rack the action (or swipe the case out) and keep firing.',
  ftf: 'The bolt closed without picking up a round: the round nose-dived against the feed ramp, or the magazine wasn’t seated. Clear: TAP the magazine, RACK the action, assess, fire.',
  doublefeed: 'The empty case stayed in the chamber and the next round has been pushed in behind it. The bolt won’t move. Clear: LOCK the action open, STRIP the magazine out, RACK it two or three times to clear everything, then reload and rack.',
  fte: 'The extractor slipped off the rim: the empty case is stuck in the chamber. Clear: open the action and knock the case out from the muzzle with a cleaning rod.',
  oob: 'The bolt (or slide) stopped a few millimetres short of locking: the gun won’t fire. Clear: push it home — forward assist, or palm the back of the slide.',
  dud: 'The firing pin hit the primer, but it didn’t fire. Keep the muzzle downrange for 30 seconds in case it is a hangfire, then rack the dud out.',
  hangfire: 'A slow primer: the round fires a second or so after the pin strikes. This is why you wait before clearing a dud.',
};
function malP(B) {
  const wp = B.wp, os = (B.inner && B.inner.os) || G.opSystem(wp, B.rig), f = G.Fouling.get(wp.id), lube = B.lube ?? Math.max(.1, .8 - f);
  const sp = Math.max(0, G.Wear.frac(wp, 'spring') - .7), ex = Math.max(0, G.Wear.frac(wp, 'exspring') - .7), mg = Math.max(0, G.Wear.frac(wp, 'magspring') - .7);
  const base = (OSR[os] ?? .003) * (1 + f * 6) * (1 + (1 - lube) * 1.5) * (1 + (sp + ex + mg) * 3);
  return { base, dud: .0012 * (1 + Math.max(0, G.Wear.frac(wp, 'firingpin') - .7) * 4 + Math.max(0, G.Wear.frac(wp, 'fpspring') - .7) * 4 + Math.max(0, G.Wear.frac(wp, 'strspring') - .7) * 4) };
}
function malObj(B, kind) {
  const r = B.rig, F = B.inner && B.inner.F; const ej = r.eject ? r.eject.position.clone() : V3(0, .02, 0);
  let o;
  if (kind === 'stovepipe') { o = G.makeCasing(B.wp.cal); o.position.copy(ej).add(V3(0, (G.CAL[B.wp.cal] || { cs: [.04] }).cs[0] * .35, 0)); o.rotation.set(-PI / 2 + .35, 0, .2); }
  else if (kind === 'ftf') { o = G.makeRound(B.wp.cal); o.position.copy(ej).add(V3(-ej.x, -.004, -.01)); o.rotation.set(-.45, 0, 0); }
  else if (kind === 'doublefeed') { o = new THREE.Group(); const c = G.makeCasing(B.wp.cal); const rr = G.makeRound(B.wp.cal); c.position.set(-ej.x, 0, -.01); rr.position.set(-ej.x, -.006, .012); rr.rotation.x = .25; o.add(c, rr); o.position.copy(ej); }
  if (o) { B.root.add(o); (B.malObjs = B.malObjs || []).push(o); }
}
function malClearObjs(B) { for (const o of B.malObjs || []) B.root.remove(o); B.malObjs = []; }
function setMal(B, type, quiet) {
  const A = BN._api;
  B.mal = { type, tapped: false, racks: 0 };
  if (type === 'stovepipe') { A.drive(.2, .04); malObj(B, 'stovepipe'); }
  if (type === 'doublefeed') { A.drive(.35, .05); malObj(B, 'doublefeed'); B.chamber = 2; if (B.rounds > 0) B.rounds--; }
  if (type === 'ftf') { A.drive(0, .05); malObj(B, 'ftf'); B.chamber = 0; }
  if (type === 'oob') { A.drive(.07, .04); }
  if (type === 'fte') { B.chamber = 2; }
  if (!quiet) { A.say(`Malfunction: ${MALN[type]}!`); G.Audio.mech('dry'); }
  B.malCount = (B.malCount || 0) + 1;
}
function clearMal(B, msg) { malClearObjs(B); B.mal = null; if (msg) BN._api.say(msg); }
BN.mal = {
  blockTrigger(B) {
    if (!B.mal) return false;
    const t = B.mal.type;
    if (t === 'stovepipe' || t === 'doublefeed' || t === 'oob') { G.Audio.mech('dry'); BN._api.say(t === 'oob' ? 'Dead trigger — the action is out of battery. Push it home.' : t === 'stovepipe' ? 'Dead trigger — a case is stuck in the port. Rack it.' : 'Dead trigger — the action is jammed open on two cartridges.'); return true; }
    return false;
  },
  preFire(B, rev) {
    if (B.malT !== undefined) return true; // waiting on a hangfire
    const P = malP(B);
    if (B.forceMal === 'dud' || B.forceMal === 'hangfire' || Math.random() < P.dud) {
      const hang = B.forceMal === 'hangfire' || (!B.forceMal && Math.random() < .15); B.forceMal = null;
      G.Audio.mech('dry');
      if (rev) { B.cyl[B.cylIdx] = 2; BN._api.say('Click — dud. The next pull turns a fresh chamber under the hammer.'); return true; }
      if (hang) { B.malT = .7 + Math.random() * .9; B.mal = { type: 'hangfire' }; BN._api.say('Click… (keep it pointed downrange)'); return true; }
      B.mal = { type: 'dud' }; B.dud = true; BN._api.say('Click — dud. Wait 30 s in case of a hangfire, then rack it out.'); return true;
    }
    return false;
  },
  postFire(B) {
    const P = malP(B), os = (B.inner && B.inner.os) || '', fam = FAM[os] || 'gas';
    let type = B.forceMal; B.forceMal = null;
    if (!type) { if (Math.random() >= P.base) return false; const r = Math.random();
      type = fam === 'openbolt' || fam === 'mgob' ? (r < .45 ? 'ftf' : r < .75 ? 'stovepipe' : 'doublefeed') : (r < .32 ? 'stovepipe' : r < .58 ? 'ftf' : r < .78 ? 'doublefeed' : r < .9 ? 'oob' : 'doublefeed'); }
    if (!['stovepipe', 'ftf', 'doublefeed', 'oob'].includes(type)) return false;
    const A = BN._api;
    if (type === 'stovepipe') { B.chamber = 0; B.cocked = true; setMal(B, 'stovepipe'); }
    else if (type === 'ftf') { A.eject(false); B.chamber = 0; B.cocked = true; setMal(B, 'ftf'); }
    else if (type === 'doublefeed') { B.cocked = true; setMal(B, 'doublefeed'); }
    else if (type === 'oob') { A.eject(false); B.chamber = 0; if (A.feedOne()) {} B.cocked = true; setMal(B, 'oob'); }
    return true;
  },
  onOpened(B) { // a manual action opened: failure to extract leaves the case behind
    if (B.mal && B.mal.type === 'fte') { BN._api.say('The extractor slips off the rim — the case is still stuck in the chamber.'); return true; }
    if (B.chamber === 2 && !B.selfLoad && B.type !== 'none' && (B.forceMal === 'fte' || Math.random() < malP(B).base * (1 + Math.max(0, G.Wear.frac(B.wp, 'extractor') - .7) * 6) * .6)) { B.forceMal = null; setMal(B, 'fte'); return true; }
    if (B.mal && B.mal.type === 'stovepipe') { clearMal(B, 'The stuck case drops free.'); }
    return false;
  },
  lockHandle(B) { if (B.mal && B.mal.type === 'doublefeed' && B.magIn) { BN._api.say('The bolt won’t budge: the magazine is still pushing the second round up. Strip the magazine out first.'); G.Audio.mech('dry'); return true; } return false; },
  onRack(B) {
    const m = B.mal; if (!m) { if (B.dud) { B.dud = false; } return false; }
    const A = BN._api;
    if (m.type === 'stovepipe') { clearMal(B, 'Racked — the stovepipe case flies clear.'); return false; }
    if (m.type === 'ftf') { if (!m.tapped && Math.random() < .6) { m.racks++; A.say('Racked — it still won’t feed. Tap the magazine to seat it first.'); A.drive(1, .12, () => A.drive(0, .08)); G.Audio.mech('boltback'); return true; } clearMal(B, m.tapped ? 'Tap, rack — a fresh round chambered.' : 'Racked — it fed this time.'); return false; }
    if (m.type === 'doublefeed') { if (B.magIn) { A.say('The bolt won’t move with the magazine in. Lock it back and strip the magazine out.'); G.Audio.mech('dry'); return true; }
      m.racks++; malClearObjs(B); A.eject(false); A.eject(true); B.chamber = 0; A.drive(1, .12, () => A.drive(0, .08, () => A.panel())); G.Audio.mech('boltback');
      if (m.racks >= 1) { B.mal = null; A.say('Rack, rack — the case and the stuck round fall out. Reload and rack to chamber.'); } return true; }
    if (m.type === 'oob') { clearMal(B, 'Racked — a live round is ejected and a fresh one chambered.'); return false; }
    if (m.type === 'dud') { clearMal(B, 'The dud is racked out.'); B.dud = false; return false; }
    if (m.type === 'fte') { A.say('Racking won’t shift it — use the cleaning rod.'); return true; }
    return false;
  },
  tick(B, dt) {
    if (B.malT === undefined) return;
    B.malT -= dt; if (B.malT > 0) return;
    delete B.malT; B.mal = null;
    if (B.chamber === 1 && B.open < .05) { const A = BN._api; B.chamber = 2; A.shoot(); BN.onFire(B); A.say('BANG — a hangfire! That is why you wait.');
      if (B.selfLoad) { A.eject(false); B.chamber = 0; A.feedOne(); B.kick = 1; } A.panel(); }
  },
};
BN.opTop = B => {
  if (!B.mal || B.mal.type === 'hangfire') return '';
  const t = B.mal.type;
  return `<div class="wsok" style="border-color:#c0503a;color:#f0a090"><b>${esc(MALN[t])}.</b> ${esc(MALD[t])}</div>`;
};
BN.opExtra = B => {
  if (B.kind !== 'std') return '';
  const btn = (id, n, on) => `<button class="btn small ${on ? 'primary' : ''}" id="${id}">${n}</button>`;
  const m = B.mal;
  let h = '<div class="wsbtns">';
  if (m && m.type === 'ftf' && B.magIn) h += btn('ml-tap', 'Tap the magazine', true);
  if (m && (m.type === 'oob')) h += btn('ml-push', 'Push it home (forward assist)', true);
  if (m && m.type === 'fte') h += btn('ml-rod', 'Knock the case out with a rod', true);
  if (m && m.type === 'doublefeed' && B.magIn) h += btn('ml-strip', 'Lock back & strip the magazine', true);
  const can = B.feed === 'box' || B.feed === 'int' || B.feed === 'belt';
  h += `<select id="ml-pick" class="btn small" style="max-width:190px"><option value="">Practise a malfunction…</option>${(B.selfLoad && can ? ['stovepipe', 'ftf', 'doublefeed', 'oob'] : []).concat(['dud', 'hangfire']).concat(!B.selfLoad && B.type !== 'none' && !B.rev ? ['fte'] : []).map(k => `<option value="${k}">${MALN[k]}</option>`).join('')}</select></div>`;
  const P = malP(B);
  h += `<div class="muted" style="padding:0 16px 6px;font-size:12px">Stoppage risk now: about ${Math.max(.1, P.base * 1000).toFixed(1)} per 1,000 rounds (${B.malCount || 0} on this bench session) · duds ${(P.dud * 1000).toFixed(1)} per 1,000.</div>`;
  return h;
};
BN.opBind = (el, B) => {
  const q = s => el.querySelector(s), A = BN._api;
  if (q('#ml-tap')) q('#ml-tap').onclick = () => { B.mal.tapped = true; G.Audio.mech('magin'); A.say('Tap — magazine seated.'); A.panel(); };
  if (q('#ml-push')) q('#ml-push').onclick = () => { A.drive(0, .05); G.Audio.mech('boltfwd'); clearMal(B, 'Pushed home — the bolt locks into battery.'); A.panel(); };
  if (q('#ml-rod')) q('#ml-rod').onclick = () => { if (B.open < .5 && !B.locked) { A.say('Open the action first.'); A.panel(); return; } A.eject(false); B.chamber = 0; G.Audio.mech('belt'); clearMal(B, 'Tap, tap — the stuck case drops out of the action.'); A.panel(); };
  if (q('#ml-strip')) q('#ml-strip').onclick = () => { A.magToBench(false); G.Audio.mech('magout'); A.say('Magazine stripped out — now rack it to clear the action.'); A.panel(); };
  if (q('#ml-pick')) q('#ml-pick').onchange = e => { const k = e.target.value; if (!k) return; if (B.mal) { A.say('Clear the current malfunction first.'); A.panel(); return; }
    if (k === 'dud' || k === 'hangfire') { if (B.chamber !== 1 && !B.rev) { A.say('Chamber a round first.'); A.panel(); return; } B.forceMal = k; A.say(`Next trigger pull: ${MALN[k].toLowerCase()}.`); }
    else if (k === 'fte') { B.forceMal = 'fte'; A.say('Fire, then work the action: the extractor will slip.'); }
    else { if (!(B.rounds > 0) || B.chamber !== 1) { A.say('Load a magazine and chamber a round first.'); A.panel(); return; } B.forceMal = k; A.say(`Next shot: ${MALN[k].toLowerCase()}.`); }
    A.panel(); };
};

// ------------------------------------------------------------------ part inspector (3D)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickInner(e, B) {
  const I = B.inner; if (!I || !I.v2 || !I.group.visible) return null;
  const c = G.E.renderer.domElement, rc = c.getBoundingClientRect();
  ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
  ray.setFromCamera(ndc, BN.api.SR.cam);
  const hs = ray.intersectObject(I.group, true).filter(h => h.object.visible && h.object.userData.inner && h.object.userData.inner !== 'ammo' && h.object.userData.inner !== 'gas');
  if (!hs.length) return null;
  const key = hs[0].object.userData.inner;
  return I.parts.find(p => p.key === key) || I.fixed.find(p => p.key === key) || { key, name: nameOf(key), info: PI_[key] };
}
let selKey = null;
function highlightSel(B) {
  const I = B.inner; if (!I || !I.v2) return;
  for (const p of I.parts) p.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !o.userData.fixedMat) o.material.emissive.setRGB(...(p.key === selKey ? [.35, .22, .05] : [0, 0, 0])); });
}
const dh0 = BN.downHook;
BN.downHook = (e, h, B) => {
  if (BN.tab === 'works' && B.inner && B.inner.v2) { const p = pickInner(e, B); if (p) { selKey = p.key; highlightSel(B); BN.api.panel(); return true; } }
  return dh0 ? dh0(e, h, B) : false;
};
const mh0 = BN.moveHook;
BN.moveHook = (e, B) => {
  if (BN.tab === 'works' && B.inner && B.inner.v2 && e.target === G.E.renderer.domElement && !(e.buttons & 1)) {
    const p = pickInner(e, B), tip = document.querySelector('#btip');
    if (p && tip) { tip.textContent = `${p.name} — ${(p.info || ['', ''])[1] || ''}`.slice(0, 160); tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 12) + 'px'; G.E.renderer.domElement.style.cursor = 'pointer'; return true; }
  }
  return mh0 ? mh0(e, B) : false;
};

// close-up: aim the camera at the bolt face and pull in
function closeUp(B, on) {
  const SR = BN.api.SR;
  if (on && B.inner && B.inner.F) { const F = B.inner.F; B.root.updateMatrixWorld(true); (F.space || B.root).updateMatrixWorld(true); SR.benchTgt = (F.space || B.root).localToWorld(V3(0, F.by || 0, (F.hz || 0) + (F.st || .05) * .4)); SR.dist0 = SR.dist0 || SR.dist; SR.dist = Math.max(.12, (F.st + F.rl * 2.5) * 2.2); SR.yaw = .25; SR.pitch = .18; }
  else { SR.benchTgt = null; if (SR.dist0) SR.dist = SR.dist0; SR.dist0 = null; }
  BN.api.panel();
}
// ------------------------------------------------------------------ "How it works" panel
const SPEEDS = [[.001, '1/1000'], [.005, '1/200'], [.01, '1/100'], [.05, '1/20'], [.25, '1/4'], [1, 'Real speed']];
function chartSVG(B) {
  const I = B.inner, mode = (BN.cyc2 && BN.cyc2.mode) || 'semi', W = 300, H = 112, n = 140;
  const pts = { c: [], p: [], h: [], f: [] };
  for (let i = 0; i <= n; i++) { const t = i / n, K = kinAny(I, t, mode), x = (t * (W - 20) + 10).toFixed(1);
    pts.c.push(`${x},${(H - 14 - K.bolt * (H - 30)).toFixed(1)}`); pts.p.push(`${x},${(H - 14 - K.press * (H - 30)).toFixed(1)}`); pts.h.push(`${x},${(H - 14 - (K.h || 0) * (H - 30) * .5).toFixed(1)}`); const trv = I.old ? (K.brk ?? K.rc ?? K.drop ?? K.bo ?? 0) : K.bolt; pts.c[pts.c.length - 1] = `${x},${(H - 14 - trv * (H - 30)).toFixed(1)}`; if (/revolver|sarev/.test(I.fam)) pts.f.push(`${x},${(H - 14 - K.cyl * (H - 30)).toFixed(1)}`); }
  const { map, total } = cycleInfo(B), ph = PH[I.fam] || [];
  const ticks = ph.map(([t, nm]) => `<line x1="${t * (W - 20) + 10}" x2="${t * (W - 20) + 10}" y1="${H - 13}" y2="${H - 9}" stroke="currentColor" opacity=".5"><title>${esc(nm)} — ${msAt(map, t).toFixed(1)} ms</title></line>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;color:var(--muted)" aria-label="Bolt travel, chamber pressure and hammer over one cycle">
    <rect x="10" y="10" width="${W - 20}" height="${H - 24}" fill="none" stroke="currentColor" opacity=".25"/>${ticks}
    <polyline points="${pts.p.join(' ')}" fill="none" stroke="#e0603a" stroke-width="1.6"/>
    <polyline points="${pts.c.join(' ')}" fill="none" stroke="var(--brass2)" stroke-width="2"/>
    <polyline points="${pts.h.join(' ')}" fill="none" stroke="#7fa7d9" stroke-width="1.2" stroke-dasharray="3 2"/>
    ${pts.f.length ? `<polyline points="${pts.f.join(' ')}" fill="none" stroke="#9bd18b" stroke-width="1.4"/>` : ''}
    <line id="c-mark" x1="10" x2="10" y1="8" y2="${H - 12}" stroke="var(--fg)" stroke-width="1.2"/>
    <text x="12" y="${H - 1}" font-size="8" fill="currentColor">0 ms</text><text x="${W - 12}" y="${H - 1}" font-size="8" text-anchor="end" fill="currentColor">${total.toFixed(total < 100 ? 1 : 0)} ms</text>
  </svg><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);padding:2px 0 0"><span><b style="color:var(--brass2)">━</b> bolt travel</span><span><b style="color:#e0603a">━</b> chamber pressure</span><span><b style="color:#7fa7d9">┅</b> hammer / striker</span>${pts.f.length ? '<span><b style="color:#9bd18b">━</b> cylinder turn</span>' : ''}<span>time axis stretched around the shot — hover the ticks for real times</span></div>`;
}
function readRows(B, K) {
  const I = B.inner, F = I.F, wp = B.wp, peak = peakMPa(wp);
  if (I.old) { const v = B.S ? B.S.v : wp.v; return [...(I.rows ? I.rows(K) : []), ['Chamber pressure', `${Math.round((K.press || 0) * peak)} MPa (peak ≈ ${peak})`], ['Projectile', K.bp < 0 ? 'loaded' : K.bp < 1 ? `in the bore · ${Math.round(v * Math.sqrt(Math.max(0, K.bp)))} m/s` : `away at ${Math.round(v)} m/s`]]; }
  const rot = ({ di: 22.5, short_piston: 22.5, long_piston: 35, oprod: 40 })[I.os] || (I.fam === 'bolt' ? 90 : 0);
  const bulletTxt = K.bp < 0 ? 'in the case' : K.bp < 1 ? `${(K.bp * F.boreLen * 100).toFixed(1)} cm down the bore · ${Math.round((B.S ? B.S.v : wp.v) * Math.sqrt(K.bp))} m/s` : `gone — left the muzzle at ${Math.round(B.S ? B.S.v : wp.v)} m/s`;
  const rows = [['Bolt face travel', `${(K.bolt * F.st * 1000).toFixed(1)} mm`]];
  if (['gas', 'roller', 'mgcb', 'mgob'].includes(I.fam)) rows.push(['Carrier travel', `${(K.c * F.st * 1000).toFixed(1)} mm`]);
  if (rot) rows.push(['Bolt rotation', `${(K.unlock * rot).toFixed(1)}° of ${rot}°`]);
  if (I.fam === 'roller') rows.push(['Rollers', K.rin < .02 ? 'locked out in the trunnion' : K.rin < .98 ? `camming in (${Math.round(K.rin * 100)}%)` : 'fully in — bolt head free']);
  if (I.fam === 'pistolsr') rows.push(['Barrel', K.tilt < .02 ? (K.b > 0 ? 'recoiling locked to the slide' : 'locked up in the slide') : K.tilt < .98 ? 'tilting down — unlocking' : 'unlocked, stopped']);
  if (I.fam === 'toggle') rows.push(['Toggle', K.tog < .02 ? 'straight — locked' : `knee up ${Math.round(K.tog * 100)}%`]);
  if (/revolver|sarev/.test(I.fam)) rows.push(['Cylinder', `${Math.round(K.cyl * 100)}% of one chamber · stop ${K.stop > .9 ? 'engaged' : 'down'}`], ['Transfer bar', K.xfer > .9 ? 'up — can fire' : 'down — blocked']);
  rows.push([I.fam === 'pistolsr' || I.fam === 'bolt' ? 'Striker / firing pin' : 'Hammer', K.h > .97 ? 'cocked' : K.h < .03 ? 'down (fired)' : `moving (${Math.round(K.h * 100)}%)`]);
  rows.push(['Trigger', K.trig > .9 ? 'pulled' : K.trig < .05 ? 'forward (reset)' : `${Math.round(K.trig * 100)}%`]);
  if (!['bolt', 'lever', 'pump', 'revolver', 'sarev'].includes(I.fam)) rows.push(['Action spring', `${Math.round(K.c * 100)}% compressed`]);
  rows.push(['Chamber pressure', `${Math.round(K.press * peak)} MPa (peak ≈ ${peak})`], ['Bullet', bulletTxt]);
  if (F.gasPath) rows.push(['Gas', K.gasOn ? 'flowing into the action' : '—']);
  rows.push(['Next round', K.fp > .98 ? 'chambered' : K.fp > 0 ? `riding up the ramp (${Math.round(K.fp * 100)}%)` : F.tube ? (K.lift > 0 ? 'on the lifter' : 'in the tube') : F.belt ? 'in the belt' : 'in the magazine']);
  return rows;
}
function worksTick(B, K) {
  const el = document.querySelector('#bp'); if (!el || !el.querySelector('#c-read')) return;
  const C = BN.cyc2, { map, total } = cycleInfo(B), ms = C ? Math.min(C.ms, total) : 0, t = C ? K.t : 0;
  const tm = el.querySelector('#c-time'); if (tm) tm.textContent = C ? `t = ${ms < 10 ? ms.toFixed(2) : ms.toFixed(1)} ms of ${total.toFixed(total < 100 ? 1 : 0)} ms${C.play ? '' : ' · paused'} · ${SPEEDS.find(s => s[0] === C.speed)?.[1] || ''}` : 'Press Play — or drag the action by hand with X-ray on.';
  const sc = el.querySelector('#c-scrub'); if (sc && document.activeElement !== sc) sc.value = Math.round(t * 1000);
  const mk = el.querySelector('#c-mark'); if (mk) { const x = t * 280 + 10; mk.setAttribute('x1', x); mk.setAttribute('x2', x); }
  const ph = PH[B.inner.fam] || []; let cur = ph[0]; for (const p of ph) if (t >= p[0]) cur = p;
  const cap = el.querySelector('#c-cap'); if (cap && cur && cap.dataset.k !== cur[1]) { cap.dataset.k = cur[1]; cap.innerHTML = `<b>${esc(cur[1])}</b> · ${msAt(map, cur[0]).toFixed(1)} ms<br><span style="color:var(--muted)">${esc(cur[2])}</span>`; }
  const rd = el.querySelector('#c-read'); if (rd && (!rd.dataset.t || performance.now() - rd.dataset.t > 60)) { rd.dataset.t = performance.now(); rd.innerHTML = readRows(B, K).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join(''); }
  const pl = el.querySelector('#c-play'); if (pl) { const want = C && C.play ? '❚❚ Pause' : '▶ Play'; if (pl.textContent !== want) pl.textContent = want; }
}
function partCard(B, p) {
  if (!p) return '<div class="muted" style="padding:6px 16px 14px;font-size:13px">Click a part in the list or in the 3D view to inspect it.</div>';
  const info = p.info || PI_[p.key] || [p.name, '', '', 0], wp = B.wp, fixed = !!(B.inner.fixed || []).find(f => f.key === p.key && f === p);
  const life = G.Wear.life(wp, p.key), wf = G.Wear.frac(wp, p.key), n = G.Wear.rec(wp.id).n;
  const state = wf < .5 ? 'good' : wf < .8 ? 'serviceable' : wf < 1 ? 'worn — replace soon' : 'past its service life';
  return `<div style="margin:6px 16px 14px;padding:10px 12px;border:1px solid var(--line2);border-radius:6px">
    <div class="eyebrow">${fixed ? 'Part of the gun' : 'Removable part'}</div><h4 style="margin:2px 0 6px;font-size:16px">${esc(info[0])}</h4>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5">${esc(info[1])}</p>
    <dl class="spec"><div><dt>Material</dt><dd>${esc(info[2] || '—')}</dd></div><div><dt>Service life</dt><dd>~${life.toLocaleString()} rounds</dd></div><div><dt>Rounds on this part</dt><dd>${Math.round(wf * life).toLocaleString()} (${Math.round(wf * 100)}%) · ${state}</dd></div><div><dt>Rounds through the gun</dt><dd>${n.toLocaleString()}</dd></div></dl>
    <div class="bars" style="padding:6px 0"><div class="bar">Wear<i class="${wf > .8 ? 'down' : 'up'}" style="--v:${Math.max(2, Math.min(100, wf * 100)).toFixed(0)}%"></i><s>${Math.round(wf * 100)}%</s></div></div>
    ${fixed ? '' : `<div class="wsbtns" style="padding:4px 0 0"><button class="btn small" id="c-repl">Replace with a new one</button></div>`}</div>`;
}
function worksPanel(el, B) {
  const I = B.inner, d = I.def || G.OS[I.os] || { n: I.os, d: '' }, wp = B.wp, C = BN.cyc2;
  const auto = !I.old && (wp.modes || []).some(x => x === 'auto');
  const sel = [...I.parts, ...(I.fixed || [])].find(p => p.key === selKey);
  const uniq = []; for (const p of [...I.parts, ...(I.fixed || [])]) if (!uniq.find(u => u.key === p.key)) uniq.push(p);
  el.innerHTML = BN.tabsHTML() + `<div style="padding:12px 16px 4px"><div class="eyebrow">Operating system · ${I.parts.length} moving parts</div><h3 style="margin:4px 0 6px;font-size:19px">${esc(d.n)}</h3><p style="font-size:13px;line-height:1.5;color:var(--muted);margin:0">${esc(d.d)}</p></div>
    <div class="wsbtns"><button class="btn small primary" id="c-play">▶ Play</button><button class="btn small" id="c-rs">⟲ Restart</button><button class="btn small" id="c-pv">◀ Phase</button><button class="btn small" id="c-nx">Phase ▶</button>
      <select id="c-sp" class="btn small">${SPEEDS.map(([v, n]) => `<option value="${v}" ${(C ? C.speed : defaultSpeed(I.fam)) === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${auto ? `<button class="btn small ${(C && C.mode === 'auto') ? 'primary' : ''}" id="c-md">${(C && C.mode === 'auto') ? 'Full auto' : 'Semi'}</button>` : ''}
      <button class="btn small ${C && C.loop ? 'primary' : ''}" id="c-lp">Loop</button><button class="btn small ${BN.api.SR.benchTgt ? 'primary' : ''}" id="c-cu">Close-up</button><button class="btn small ${BN.xray ? 'primary' : ''}" id="c-x">X-ray</button></div>
    <div style="padding:2px 16px 6px"><input type="range" id="c-scrub" min="0" max="1000" value="0" style="width:100%" aria-label="Scrub through the cycle"><div id="c-time" style="font:12px var(--f-mono);color:var(--muted)"></div></div>
    <div class="wsok" id="c-cap" style="border-color:var(--line2);color:var(--fg);font-size:13px;line-height:1.45">Press Play.</div>
    <div style="padding:4px 16px 0">${chartSVG(B)}</div>
    <div class="lbl" style="padding:8px 16px 0">Live read-out</div><dl class="spec" id="c-read"></dl>
    <div class="lbl" style="padding:8px 16px 0">Parts — click one here or in the 3D view</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px 16px 4px">${uniq.map(p => { const wf = G.Wear.frac(wp, p.key); return `<button class="chip ${p.key === selKey ? 'on' : ''}" data-pk="${p.key}" title="${esc((p.info || [])[1] || '')}" style="${wf > .8 ? 'border-color:#c0503a' : ''}">${esc(p.name)}</button>`; }).join('')}</div>
    ${partCard(B, sel)}`;
  BN.tabsBind(el, B);
  const q = s => el.querySelector(s);
  q('#c-play').onclick = () => { if (!BN.xray) BN.G.setXray(B, true); if (!BN.cyc2) startCycle(B); else { const { total } = cycleInfo(B); if (BN.cyc2.ms >= total) BN.cyc2.ms = 0, BN.cyc2.play = true; else BN.cyc2.play = !BN.cyc2.play; } };
  q('#c-rs').onclick = () => { if (!BN.xray) BN.G.setXray(B, true); startCycle(B, { ms: 0, play: true }); };
  const jump = dir => { if (!BN.cyc2) startCycle(B, { play: false }); const Cc = BN.cyc2, { map } = cycleInfo(B), t = tOfMs(map, Cc.ms), ph = PH[I.fam] || [[0]];
    let i = ph.findIndex(p => p[0] > t + 1e-4); if (i < 0) i = ph.length; i = dir > 0 ? i : Math.max(0, i - 2); if (i >= ph.length) i = ph.length - 1; Cc.ms = msAt(map, ph[i][0] + 1e-4); Cc.play = false; if (I.ammo && dir < 0) { I.ammo.ejDone = false; I.ammo.fireDone = false; I.ammo.prevT = 0; } };
  q('#c-pv').onclick = () => jump(-1); q('#c-nx').onclick = () => jump(1);
  q('#c-sp').onchange = e => { const v = +e.target.value; if (!BN.cyc2) startCycle(B, { play: false }); BN.cyc2.speed = v; };
  if (q('#c-md')) q('#c-md').onclick = () => { if (!BN.cyc2) startCycle(B, { play: false }); BN.cyc2.mode = BN.cyc2.mode === 'auto' ? 'semi' : 'auto'; BN.api.panel(); };
  q('#c-lp').onclick = () => { if (!BN.cyc2) startCycle(B, { play: false }); BN.cyc2.loop = !BN.cyc2.loop; BN.api.panel(); };
  q('#c-x').onclick = () => { BN.G.setXray(B, !BN.xray); BN.api.panel(); };
  q('#c-cu').onclick = () => closeUp(B, !BN.api.SR.benchTgt);
  q('#c-scrub').oninput = e => { if (!BN.xray) BN.G.setXray(B, true); if (!BN.cyc2) startCycle(B, { play: false }); const { map } = cycleInfo(B), t = +e.target.value / 1000; const prev = tOfMs(map, BN.cyc2.ms); BN.cyc2.ms = msAt(map, t); BN.cyc2.play = false; if (t < prev && I.ammo) { I.ammo.ejDone = true; I.ammo.fireDone = true; } };
  el.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { selKey = b.dataset.pk === selKey ? null : b.dataset.pk; highlightSel(B); BN.api.panel(); });
  if (q('#c-repl')) q('#c-repl').onclick = () => { G.Wear.replace(wp.id, selKey); G.Audio.mech('magin'); BN.api.panel(); };
}
// ------------------------------------------------------------------ "Handling" tab: the physical sheet, mass breakdown and part wear
function handlingPanel(el, B) {
  const wp = B.wp, S = B.S || G.resolveStats(wp, G.UI.loadoutFor ? G.UI.loadoutFor(wp) : G.defaultLoadout(wp)), H = S.hand || {};
  const rows = G.handlingRows ? G.handlingRows(S) : [];
  const keys = B.inner && B.inner.v2 ? [...new Set(B.inner.parts.map(p => p.key))] : ['spring', 'firingpin', 'extractor', 'exspring', 'magspring', 'barrel'];
  const n = G.Wear.rec(wp.id).n, P = malP(B), f = G.Fouling.get(wp.id);
  el.innerHTML = BN.tabsHTML() + (H.emplaced ? `<div class="wsok">A crew-served piece: it is laid and fired from its mount, not handled.</div>` : `
    <div style="padding:12px 16px 2px"><div class="eyebrow">How it handles</div><p class="muted" style="margin:4px 0 0;font-size:13px;line-height:1.5">Worked out from the gun as a rigid body — every part and accessory with its mass and position along the bore. These numbers drive aim-down-sights time, sway, how far the gun lags when you turn and how fast it settles after a shot in the game.</p></div>
    <dl class="spec">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="lbl" style="padding:8px 16px 0">Where the weight is</div>
    <div style="padding:4px 16px 8px">${(H.parts || []).map(([nm, kg, x]) => `<div style="display:grid;grid-template-columns:1fr 70px 70px;gap:6px;font-size:12px;padding:2px 0;border-bottom:1px solid var(--line)"><span>${esc(nm)}</span><span style="text-align:right">${kg.toFixed(2)} kg</span><span style="text-align:right;color:var(--muted)">${(x * 100).toFixed(0)} cm</span></div>`).join('')}<div class="muted" style="font-size:11px;padding-top:4px">Positions measured from the ${H.shouldered ? 'butt' : 'back of the grip'}.</div></div>`) + `
    <div class="lbl" style="padding:8px 16px 0">Condition · ${n.toLocaleString()} rounds fired</div>
    <div class="bars" style="padding:6px 16px">${keys.map(k => { const wf = G.Wear.frac(wp, k); return `<div class="bar" title="${esc(nameOf(k))}: ~${G.Wear.life(wp, k).toLocaleString()} round life">${esc(nameOf(k))}<i class="${wf > .8 ? 'down' : 'up'}" style="--v:${Math.max(2, Math.min(100, wf * 100)).toFixed(0)}%"></i><s>${Math.round(wf * 100)}%</s></div>`; }).join('')}
      <div class="bar">Fouling<i class="${f > .5 ? 'down' : 'up'}" style="--v:${Math.max(2, f * 100).toFixed(0)}%"></i><s>${Math.round(f * 100)}%</s></div></div>
    <div class="wsbtns"><button class="btn small" id="hd-springs">Replace all springs</button><button class="btn small" id="hd-worn">Replace worn parts</button></div>
    <p class="muted" style="padding:0 16px 14px;font-size:12px;line-height:1.5">Stoppage risk now: about ${Math.max(.1, P.base * 1000).toFixed(1)} per 1,000 rounds. Fouling, a dry action and tired springs (recoil, extractor, magazine) all raise it — on the bench and in the field.</p>`;
  BN.tabsBind(el, B);
  const q = s => el.querySelector(s);
  q('#hd-springs').onclick = () => { for (const k of keys) if (/spring/.test(k)) G.Wear.replace(wp.id, k); G.Audio.mech('magin'); BN.api.panel(); };
  q('#hd-worn').onclick = () => { for (const k of keys) if (G.Wear.frac(wp, k) > .8) G.Wear.replace(wp.id, k); G.Audio.mech('magin'); BN.api.panel(); };
}
// tabs: add Handling
BN.tabsHTML = () => `<div class="eras" style="padding:10px 14px;border-bottom:1px solid var(--line)">${[['operate', 'Operate'], ['strip', 'Take apart'], ['clean', 'Clean'], ['works', 'How it works'], ['handling', 'Handling']].map(([k, n]) => `<button class="chip ${BN.tab === k ? 'on' : ''}" data-btab="${k}">${n}</button>`).join('')}</div>`;
const ph0 = BN.panelHook;
BN.panelHook = (el, B, api) => {
  if (BN.tab === 'handling') return handlingPanel(el, B);
  if (BN.tab === 'works') { BN.G.ensureParts(B); if (B.inner && B.inner.v2) { B.inner.group.visible = true; return worksPanel(el, B); } }
  return ph0(el, B, api);
};
// leaving the bench or the tab stops the cycle
const tb0 = BN.tabsBind;
BN.tabsBind = (el, B) => { tb0(el, B); el.querySelectorAll('[data-btab]').forEach(b => { const f = b.onclick; b.onclick = e => { if (b.dataset.btab !== 'works') { stopCycle(B); if (BN.api.SR.benchTgt) { BN.api.SR.benchTgt = null; if (BN.api.SR.dist0) BN.api.SR.dist = BN.api.SR.dist0; BN.api.SR.dist0 = null; } } selKey = null; highlightSel(B); f && f(e); }; }); };
const show0 = UI.show;
UI.show = function (name) { if (name !== 'bench') { BN.cyc2 = null; selKey = null; BN.api.SR.benchTgt = null; BN.api.SR.dist0 = null; } return show0.call(UI, name); };
const os0 = BN.onSetup;
BN.onSetup = (B, api) => { BN.cyc2 = null; selKey = null; if (BN.api.SR.benchTgt) { BN.api.SR.benchTgt = null; BN.api.SR.dist0 = null; } return os0(B, api); };
BN.v2 = { msOfT: (B, t) => msAt(cycleInfo(B).map, t), closeUp, build2, kin, kinManual, FAM, PH, msMap, startCycle, stopCycle, animate, malP, setMal, PI_ };
})();
