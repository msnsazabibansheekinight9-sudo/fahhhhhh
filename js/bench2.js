// ============================================================================
// IRONSIGHT — handling bench, part 2.
//   * handling for the families that don't work like a modern repeater:
//     break-action doubles, flint/match/wheel/percussion muzzle-loaders,
//     falling-block breechloaders, cap-and-ball revolvers, muzzle-loading
//     cannon (sponge, powder, shot, ram, prime, fire), breech-loading
//     artillery, mortars, swap-chamber guns, Gatlings, rocket carts and
//     automatic cannon fed by clips
//   * TAKE APART: every gun field-strips into its real assemblies, in order,
//     onto the bench — including the internal parts of its own operating
//     system, built for that gun from its dimensions
//   * HOW IT WORKS: the operating system explained and animated in slow
//     motion with an X-ray view through the receiver
//   * CLEAN: fouling builds up with every shot fired (on the bench and in the
//     game); brush and patch the bore, scrub the bolt, oil and wipe it down.
//     Dirty guns lose accuracy, jam and — with black powder — misfire.
// ============================================================================
'use strict';
(function () {
const G = window.G, BN = G.Bench, UI = G.UI, esc = UI.esc;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
const { gBox, gCyl, gCylX, gCylY, gSph, gTor, gRBox } = G.geo;
const snd = k => G.Audio.mech(k);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
BN.kinds = {};
BN.tab = 'operate';

// ------------------------------------------------------------------ small helpers
const proxy = (r, part, parent, x, y, z) => { const m = BN.api.invis(r); m.position.set(x, y, z); m.userData.part = part; parent.add(m); return m; };
const fireBig = (B, api) => { api.shoot(); G.Fouling.add(B.wp); if (B.wp.smoke && G.FX) { /* bench smoke: a few puffs */ } };
function partTo(B, obj, key) { obj.userData.part = key; }
function lockSnap(B, api, then) { // lock time: flash in the pan, then the shot
  api.A().mech('dry'); B.flashT = .03; if (B.flash) { B.flash.visible = true; B.flash.scale.setScalar(.25); }
  setTimeout(() => { if (BN._state() === B) then(); }, Math.max(60, (B.wp.lock || .1) * 1000));
}

// ================================================================== BREAK-ACTIONS
BN.kinds.break = {
  setup(B) { B.brl = new Array(B.cap).fill(0); B.bopen = 0; B.btgt = 0; const r = B.rig; if (r.brk) partTo(B, r.brk, 'brk'); if (r.toplever) { partTo(B, r.toplever, 'toplever'); proxy(.02, 'toplever', r.toplever, 0, 0, .01); } if (r.hammer) partTo(B, r.hammer, 'hammer'); B.cocked = !r.hammer; },
  click(part, B, api) {
    if (part === 'brk' || part === 'toplever') {
      if (!B.btgt) { B.btgt = 1; snd('cover'); let n = 0; B.brl.forEach((v, i) => { if (v === 2) { B.brl[i] = 0; n++; setTimeout(() => api.eject(false), i * 60); } }); api.say(n ? `Action open — the ejectors flick out ${n} empt${n > 1 ? 'ies' : 'y'}.` : 'Action open.'); if (B.rig.hammer) B.cocked = true; }
      else { B.btgt = 0; snd('boltfwd'); api.say('Snapped shut.'); }
      return true;
    }
    if (part === 'hammer') { B.cocked = !B.cocked; snd(B.cocked ? 'boltup' : 'dry'); api.say(B.cocked ? 'Hammers cocked.' : 'Hammers let down.'); return true; }
  },
  box(B, api) { if (!B.btgt) { api.say('Open the action first (click the top lever or the barrels).'); return 0; } const k = B.brl.indexOf(0); if (k < 0) { api.say('Both chambers loaded.'); return 0; } B.brl[k] = 1; api.flyRound(); snd('shell'); api.say(`Shell into the ${B.brl.length === 1 ? 'chamber' : k === 0 ? 'right barrel' : k === 1 ? 'left barrel' : 'rifle barrel'}.`); return 1; },
  trigger(B, api) {
    if (B.btgt || B.bopen > .05) { api.say('Close the action first.'); return false; }
    if (B.rig.hammer && !B.cocked) { snd('dry'); api.say('Cock the hammers first (click them).'); return false; }
    const k = B.brl.indexOf(1);
    if (k < 0) { snd('dry'); api.say('Click — both barrels empty.'); return false; }
    B.brl[k] = 2; api.shoot(); G.Fouling.add(B.wp); api.say(`${B.brl.length === 1 ? 'Fired' : k === 0 ? 'Right barrel' : k === 1 ? 'Left barrel' : 'Rifle barrel'} fired.`); return true;
  },
  tick(dt, B) { B.bopen += (B.btgt - B.bopen) * Math.min(1, dt * 12); if (B.rig.brk) B.rig.brk.rotation.x = (B.rig.brkOpen || -.6) * B.bopen; if (B.rig.toplever) B.rig.toplever.rotation.y = B.btgt && B.bopen < .4 ? .6 : 0; if (B.rig.hammer) B.rig.hammer.rotation.x = B.cocked ? -.6 : 0; },
  status: B => [['Barrels', B.brl.map(v => ['empty', 'loaded', 'fired'][v]).join(' · ')], ['Action', B.btgt ? 'Open' : 'Closed'], ['Hammers', B.rig.hammer ? (B.cocked ? 'Cocked' : 'Down') : 'Hammerless (self-cocking)']],
  next: B => B.btgt ? (B.brl.includes(0) ? 'Click the box to slip shells into the chambers.' : 'Click the barrels to snap the action shut.') : B.brl.includes(1) ? (B.rig.hammer && !B.cocked ? 'Cock the hammers, then click the trigger.' : 'Click the trigger — each pull fires the next barrel.') : 'Push the top lever (click it) to break the gun open.',
  howto: B => ['<b>Top lever / barrels:</b> click to break the gun open or snap it shut. Opening throws out the fired shells.', '<b>Shell box:</b> click to load a shell into each empty chamber.', B.rig.hammer ? '<b>Hammers:</b> click to cock or let them down.' : 'Hammerless: opening the gun cocks it.', '<b>Trigger:</b> each click fires the next barrel.'],
};

// ================================================================== MUZZLE-LOADERS
const LOCKN = { flint: 'Flintlock', match: 'Matchlock', wheel: 'Wheellock', cap: 'Percussion lock' };
BN.kinds.musket = {
  setup(B) {
    const r = B.rig, m = B.wp.m;
    B.ms = { hammer: 0, panOpen: false, primed: false, powder: false, ball: false, rammed: 0, rod: 0, spanned: m.lock !== 'wheel' };
    B.lockK = m.lock || 'flint';
    if (r.hammer) { partTo(B, r.hammer, 'hammer'); proxy(.018, 'hammer', r.hammer, 0, .02, -.01); }
    if (r.frizzen) { partTo(B, r.frizzen, 'frizzen'); proxy(.016, 'frizzen', r.frizzen, 0, .01, 0); }
    if (r.wheel) partTo(B, r.wheel, 'wheel');
    if (r.rod) { partTo(B, r.rod, 'rod'); proxy(.02, 'rod', r.rod, 0, 0, -(r.rodLen || .8) * .97); }
    proxy(.03, 'muzzle', B.root, 0, r.muzzleY || 0, r.muzzleZ);
    B.rodT = 0;
  },
  labelFor: { hammer: 'Cock / hammer — click: half-cock → full cock', frizzen: 'Frizzen & pan cover — click to open or close the pan', wheel: 'Wheel — click to wind it with the spanner', rod: 'Ramrod — click to draw it, ram, return it', muzzle: 'Muzzle — the charge goes in here' },
  click(part, B, api) {
    const S = B.ms;
    if (part === 'hammer') { S.hammer = S.hammer >= 2 ? 1 : S.hammer + 1; snd(S.hammer === 2 ? 'boltback' : 'boltup'); api.say(['Hammer down.', 'Half-cock: the trigger is locked — safe to load.', 'Full cock: ready to fire.'][S.hammer]); return true; }
    if (part === 'frizzen') { if (B.lockK === 'cap') return false; if (S.hammer === 2) api.say('Careful — opening the pan at full cock. Half-cock first next time.'); S.panOpen = !S.panOpen; snd('cover'); api.say(S.panOpen ? (S.primed ? 'Pan open — still primed.' : 'Pan open.') : (S.primed ? 'Pan closed on the priming.' : 'Pan closed — no priming in it.')); return true; }
    if (part === 'wheel') { S.spanned = true; snd('mode'); api.say('Wheel wound with the spanner.'); B.wheelSpin = 4; return true; }
    if (part === 'rod' || part === 'muzzle') {
      if (S.rod === 0) { if (!S.powder && part === 'rod') api.say('Ramrod drawn — but there is nothing in the barrel yet.'); else api.say('Ramrod drawn and turned.'); S.rod = 1; snd('slide'); return true; }
      if (S.powder && S.ball && S.rammed < 3) { S.rammed++; B.ramPulse = 1; snd('boltfwd'); api.say(S.rammed >= 2 ? 'Ball rammed firmly onto the powder.' : 'Ramming…'); return true; }
      S.rod = 0; snd('slide'); api.say('Ramrod back in its pipes.'); return true;
    }
  },
  box(B, api) { // the cartridge pouch
    const S = B.ms;
    if (B.lockK === 'cap') {
      if (!S.powder) { S.powder = S.ball = true; api.flyRound(); snd('belt'); api.say('Powder and Minié bullet down the muzzle. Now ram them.'); return 1; }
      if (!S.primed) { if (S.hammer !== 1) { api.say('Half-cock the hammer before capping the nipple.'); return 0; } S.primed = true; snd('magin'); api.say('Copper cap pressed onto the nipple.'); return 1; }
      api.say('It is loaded and capped.'); return 0;
    }
    if (!S.primed) {
      if (!S.panOpen) { api.say('Open the pan (click the frizzen) to prime it.'); return 0; }
      if (S.hammer === 2) { api.say('Half-cock before priming.'); return 0; }
      S.primed = true; snd('belt'); api.say('Cartridge bitten open — a pinch of powder into the pan.'); return 1;
    }
    if (S.panOpen) { api.say('Shut the pan before you charge the barrel.'); return 0; }
    if (!S.powder) { S.powder = S.ball = true; api.flyRound(); snd('belt'); api.say('Rest of the powder down the barrel, ball and paper after it.'); return 1; }
    api.say('Already charged.'); return 0;
  },
  trigger(B, api) {
    const S = B.ms;
    if (S.hammer === 1) { api.say('Half-cock: the trigger will not move. Full cock first.'); return false; }
    if (S.hammer === 0) { snd('dry'); api.say('The hammer is down.'); return false; }
    if (B.lockK === 'wheel' && !S.spanned) { S.hammer = 0; snd('dry'); api.say('The wheel is not wound.'); return false; }
    S.hammer = 0; snd('dry');
    if (B.lockK !== 'cap' && S.panOpen) { api.say('The pan is open — the cock snaps on nothing.'); return false; }
    if (!S.primed) { api.say(B.lockK === 'cap' ? 'No cap on the nipple — the hammer just clicks.' : 'Sparks, but no priming in the pan.'); return false; }
    S.primed = false; S.spanned = B.lockK !== 'wheel';
    const foul = G.Fouling.get(B.wp.id);
    lockSnap(B, api, () => {
      if (!S.powder) { api.say('Flash in the pan — the barrel is empty.'); return; }
      if (Math.random() < (B.wp.misfire || .05) * (1 + foul * 3)) { api.say(`Flash in the pan! The charge didn’t catch${foul > .4 ? ' — the touch-hole is fouled; clean the gun' : ''}. Re-prime and try again.`); panel(B); return; }
      if (S.rod) api.say('You just fired your ramrod downrange.');
      else if (S.rammed < 1) api.say('Bang — but the ball wasn’t rammed home. Dangerous and inaccurate.');
      else api.say('BOOM — and a cloud of white smoke.');
      S.powder = S.ball = false; S.rammed = 0; if (S.rod) S.rod = 0;
      fireBig(B, api); panel(B);
    });
    return true;
  },
  tick(dt, B) {
    const r = B.rig, S = B.ms;
    if (r.hammer) { const tg = S.hammer === 2 ? -.9 : S.hammer === 1 ? -.45 : 0; r.hammer.rotation.x += (tg - r.hammer.rotation.x) * Math.min(1, dt * 18); }
    if (r.frizzen) { const tg = S.panOpen ? -1.1 : 0; r.frizzen.rotation.x += (tg - r.frizzen.rotation.x) * Math.min(1, dt * 14); }
    if (r.wheel && B.wheelSpin) { r.wheel.rotation.x += dt * 12; B.wheelSpin = Math.max(0, B.wheelSpin - dt * 4); }
    if (r.rod) { // in pipes → drawn and turned into the muzzle → rammed
      const L = r.rodLen || .8, mz = r.muzzleZ, by = r.muzzleY || .005;
      B.rodT += ((S.rod ? 1 : 0) - B.rodT) * Math.min(1, dt * 6);
      B.ramPulse = Math.max(0, (B.ramPulse || 0) - dt * 3);
      const t = B.rodT, deep = S.rammed ? Math.abs(mz) * .85 : Math.abs(mz) * .35;
      if (t < .5) { const k = t / .5; r.rod.position.set(0, -.018 + k * .08, -L * k); r.rod.rotation.y = 0; }
      else { const k = (t - .5) / .5; r.rod.rotation.y = PI; r.rod.position.set(0, by + (1 - k) * .06, mz - L * .97 + .02 + k * (deep - Math.sin(B.ramPulse * PI) * .12) * (S.powder ? 1 : .3)); }
    }
  },
  status(B) { const S = B.ms; return [['Lock', `${LOCKN[B.lockK]} · ${['down', 'half-cock', 'full cock'][S.hammer]}`], [B.lockK === 'cap' ? 'Cap' : 'Pan', B.lockK === 'cap' ? (S.primed ? 'Capped' : 'None') : `${S.panOpen ? 'Open' : 'Closed'} · ${S.primed ? 'primed' : 'empty'}`], ['Barrel', S.powder ? (S.rammed ? `Charged, rammed ×${S.rammed}` : 'Charged, not rammed') : 'Empty'], ['Ramrod', S.rod ? 'Drawn' : 'In its pipes'], ['Fouling', Math.round(G.Fouling.get(B.wp.id) * 100) + '%']]; },
  next(B) {
    const S = B.ms;
    if (B.lockK === 'cap') { if (!S.powder) return 'Click the cartridge box: powder and bullet down the muzzle.'; if (S.rammed < 2) return S.rod ? 'Click the ramrod (or muzzle) to ram — twice.' : 'Click the ramrod to draw it.'; if (S.rod) return 'Click the ramrod to return it to its pipes.'; if (!S.primed) return S.hammer !== 1 ? 'Click the hammer to half-cock it.' : 'Click the box again to put a cap on the nipple.'; return S.hammer === 2 ? 'Click the trigger.' : 'Click the hammer to full cock.'; }
    if (!S.primed) { if (S.hammer !== 1) return 'Click the cock to bring it to half-cock (safe).'; if (!S.panOpen) return 'Click the frizzen to open the pan.'; return 'Click the cartridge box: bite the cartridge and prime the pan.'; }
    if (S.panOpen) return 'Click the frizzen to shut the pan over the priming.';
    if (!S.powder) return 'Click the cartridge box again: powder, ball and paper down the muzzle.';
    if (S.rammed < 2) return S.rod ? 'Click the ramrod to ram the ball home — twice.' : 'Click the ramrod to draw it out.';
    if (S.rod) return 'Click the ramrod to return it to its pipes.';
    if (B.lockK === 'wheel' && !S.spanned) return 'Click the wheel to wind it.';
    return S.hammer === 2 ? 'Present… fire! Click the trigger.' : 'Click the cock to bring it to full cock.';
  },
  howto: B => [`<b>${LOCKN[B.lockK]}:</b> the cock has half-cock (safe, for loading) and full cock (fire). Click it to cycle.`, B.lockK === 'cap' ? '<b>Cap:</b> a copper percussion cap on the nipple fires the charge.' : '<b>Frizzen / pan:</b> click to open and close the priming pan.', '<b>Cartridge box:</b> each click does the next loading motion — prime, then charge the barrel.', '<b>Ramrod:</b> click to draw it, click to ram (twice), click to return it. Forget it and you will fire it away.', '<b>Trigger:</b> flash in the pan, a short delay, then the shot. A fouled gun misfires more — clean it.'],
};

// ================================================================== FALLING-BLOCK / SINGLE-SHOT BREECHLOADERS
BN.kinds.falling = {
  setup(B) { const r = B.rig; B.fo = 0; B.ftg = 0; B.ch1 = 0; B.cocked = !r.hammer; B.primed = !B.wp.lock; if (r.breech) partTo(B, r.breech, 'breech'); if (r.flever) { partTo(B, r.flever, 'flever'); proxy(.02, 'flever', r.flever, 0, -.015, .07); } if (r.hammer) partTo(B, r.hammer, 'hammer'); if (r.frizzen) partTo(B, r.frizzen, 'frizzen'); },
  labelFor: { breech: 'Breech block — click to open or close', flever: 'Lever — click to drop or raise the block', hammer: 'Hammer — click to cock' },
  click(part, B, api) {
    if (part === 'breech' || part === 'flever') { B.ftg = B.ftg ? 0 : 1; if (B.ftg) { snd('boltback'); if (B.ch1 === 2) { B.ch1 = 0; api.eject(false); api.say('Breech open — the extractor flips out the empty case.'); } else api.say('Breech open.'); if (B.rig.fkind === 'martini') B.cocked = true; } else { snd('boltfwd'); api.say('Breech closed.'); } return true; }
    if (part === 'hammer') { B.cocked = !B.cocked; snd(B.cocked ? 'boltup' : 'dry'); api.say(B.cocked ? 'Hammer cocked.' : 'Hammer lowered.'); return true; }
    if (part === 'frizzen') { if (!B.primed) { B.primed = true; snd('belt'); api.say('Pan primed.'); } return true; }
  },
  box(B, api) { if (!B.ftg) { api.say('Open the breech first.'); return 0; } if (B.ch1 === 1) { if (B.wp.lock && !B.primed) { B.primed = true; snd('belt'); api.say('Pan primed.'); return 1; } api.say('Already loaded.'); return 0; } B.ch1 = 1; api.flyRound(); snd('magin'); api.say(B.wp.lock ? 'Ball and powder into the breech.' : 'Cartridge into the chamber.'); return 1; },
  trigger(B, api) {
    if (B.ftg) { api.say('Close the breech.'); return false; }
    if (!B.cocked) { snd('dry'); api.say(B.rig.fkind === 'martini' ? 'Work the lever to cock the striker.' : 'Cock the hammer.'); return false; }
    B.cocked = !B.rig.hammer && B.rig.fkind !== 'martini';
    if (B.ch1 !== 1) { snd('dry'); api.say('Click — empty chamber.'); return false; }
    if (B.wp.lock) { if (!B.primed) { api.say('No priming.'); return false; } B.primed = false; lockSnap(B, api, () => { B.ch1 = 0; fireBig(B, api); api.say('Fired.'); panel(B); }); return true; }
    B.ch1 = 2; fireBig(B, api); api.say('Fired. Open the breech to extract.'); return true;
  },
  tick(dt, B) {
    const r = B.rig, k = r.fkind; B.fo += (B.ftg - B.fo) * Math.min(1, dt * 12); const o = B.fo;
    const bb = r.breech; if (bb) { const h = bb.userData.h0 || (bb.userData.h0 = { p: bb.position.clone(), r: bb.rotation.clone() }); bb.position.copy(h.p); bb.rotation.copy(h.r);
      if (k === 'martini') bb.rotation.x = .5 * o; else if (k === 'sharps') bb.position.y = h.p.y - .03 * o; else if (k === 'trapdoor') bb.rotation.x = -1.6 * o; else if (k === 'snider') bb.rotation.y = 1.6 * o; else if (k === 'rolling') bb.rotation.x = .9 * o; else if (k === 'screw') bb.position.y = h.p.y - .04 * o; else bb.rotation.x = -.5 * o; }
    if (r.flever) r.flever.rotation.x = .9 * o;
    if (r.hammer) r.hammer.rotation.x = B.cocked ? -.6 : 0;
  },
  status: B => [['Breech', B.ftg ? 'Open' : 'Closed'], ['Chamber', ['Empty', 'Loaded', 'Spent case'][B.ch1]], ['Hammer / striker', B.cocked ? 'Cocked' : 'Down'], ...(B.wp.lock ? [['Pan', B.primed ? 'Primed' : 'Empty']] : [])],
  next: B => B.ftg ? (B.ch1 === 1 ? (B.wp.lock && !B.primed ? 'Click the box again to prime the pan.' : 'Close the breech (click the lever or block).') : 'Click the cartridge box to load.') : B.ch1 === 1 ? (B.cocked ? 'Click the trigger.' : 'Cock it (click the hammer).') : 'Open the breech (click the lever or block).',
  howto: B => ['<b>Lever / breech block:</b> click to open and close the breech. Opening extracts the fired case.', '<b>Cartridge box:</b> click to load one round.', B.rig.hammer ? '<b>Hammer:</b> click to cock.' : 'The lever cocks the striker as the block drops.', '<b>Trigger:</b> fires the single round.'],
};

// ================================================================== CAP-AND-BALL REVOLVERS (states: 0 empty, 3 charged, 1 capped, 2 fired)
BN.kinds.caprev = {
  setup(B) { B.cocked = false; if (B.rig.hammer) partTo(B, B.rig.hammer, 'hammer'); },
  click(part, B, api) { if (part === 'hammer') { B.halfcock = !B.halfcock; snd('boltup'); api.say(B.halfcock ? 'Half-cock: the cylinder turns freely for loading.' : 'Hammer down.'); return true; } if (part === 'cyl') { api.say('This cylinder doesn’t swing out: half-cock and load it chamber by chamber from the front.'); return true; } },
  box(B, api) {
    if (!B.halfcock) { api.say('Click the hammer to half-cock it so the cylinder can turn.'); return 0; }
    let k = B.cyl.findIndex(v => v === 0 || v === 2);
    if (k >= 0) { B.cyl[k] = 3; B.cylIdx = k; B.rig.cyl.userData.tgt = k * 2 * PI / B.cyl.length; snd('belt'); setTimeout(() => snd('boltfwd'), 180); api.say(`Chamber ${k + 1}: powder from the flask, a ball, and the loading lever rams it.`); return 1; }
    k = B.cyl.indexOf(3); if (k >= 0) { B.cyl[k] = 1; snd('magin'); api.say(`Cap on nipple ${k + 1}.`); return 1; }
    api.say('Every chamber is charged and capped.'); return 0;
  },
  trigger(B, api) { if (B.halfcock) { api.say('At half-cock the trigger is blocked — click the hammer to let it down.'); return false; } B.cylIdx = (B.cylIdx + 1) % B.cyl.length; B.rig.cyl.userData.tgt = B.cylIdx * 2 * PI / B.cyl.length; const v = B.cyl[B.cylIdx]; if (v === 1) { B.cyl[B.cylIdx] = 2; fireBig(B, api); api.say('Fired.'); return true; } snd('dry'); api.say(v === 3 ? 'Click — that chamber has no cap.' : 'Click — empty chamber.'); return false; },
  tick(dt, B) { const cy = B.rig.cyl; if (cy && cy.userData.tgt !== undefined) cy.rotation.z += (cy.userData.tgt - cy.rotation.z) * Math.min(1, dt * 18); if (B.rig.hammer) B.rig.hammer.rotation.x = B.halfcock ? -.3 : 0; },
  status: B => [['Cylinder', B.cyl.map(v => ['○', '●', '×', '◐'][v]).join(' ') + '  (● capped, ◐ charged, × fired)'], ['Hammer', B.halfcock ? 'Half-cock' : 'Down']],
  next: B => B.halfcock ? (B.cyl.some(v => v === 0 || v === 2) ? 'Click the box to charge the next chamber (powder, ball, lever).' : B.cyl.includes(3) ? 'Click the box to cap each nipple.' : 'Click the hammer to let it down, then fire.') : B.cyl.includes(1) ? 'Click the trigger.' : 'Click the hammer to half-cock it for loading.',
  howto: () => ['<b>Hammer:</b> click for half-cock (load) or down (fire).', '<b>Box:</b> charges each chamber (powder, ball, rammed by the loading lever), then caps each nipple.', '<b>Trigger:</b> turns the cylinder and fires the capped chamber.'],
};

// ================================================================== MUZZLE-LOADING CANNON & OLD MORTARS
function toolMesh(kind, B) { const it = new THREE.Group(); const bore = B.wp.m.cal || .1, L = (B.wp.m.L || 1.5) * 1.1; const st = new THREE.Mesh(gCyl(bore * .12, bore * .12, L, 8), BN.api.pmat('#7a5a34', .8)); st.position.z = L / 2; it.add(st); const hd = new THREE.Mesh(kind === 'sponge' ? gCyl(bore * .5, bore * .5, bore * 1.4, 12) : gCyl(bore * .47, bore * .47, bore * .5, 12), BN.api.pmat(kind === 'sponge' ? '#3a3a30' : '#6a5030', 1)); it.add(hd); return it; }
BN.kinds.cannon = {
  setup(B, api) {
    B.cn = { sponged: true, powder: false, shot: false, rammed: false, primed: false, hot: false };
    const r = B.rig, s = B.root, bore = B.wp.m.cal || .1, L = B.wp.m.L || 1.5;
    proxy(Math.max(.03, bore * .8), 'vent', s, 0, (r.ventPos || V3(0, bore, 0)).y, (r.ventPos || V3(0, 0, 0)).z);
    proxy(Math.max(.05, bore), 'cmuzzle', s, 0, r.muzzleY || 0, r.muzzleZ);
    // the crew's tools leaning on a rack beside the muzzle, powder in a box
    const rackP = V3(0, 0, 0); const wp0 = B.root.localToWorld(V3(bore * 4 + .2, B.rig.ground || -.5, -L * .7));
    for (const [i, k] of ['sponge', 'rammer'].entries()) { const t = toolMesh(k, B); t.userData.part = k; t.position.copy(wp0).add(V3(Math.max(.15, bore * 2) * i, Math.max(.02, bore * .5), 0)); t.rotation.set(0, .15 * i, 0); BN.g.add(t); B.props.push(t); B['tool_' + k] = t; t.userData.home = { p: t.position.clone(), q: t.quaternion.clone() }; }
    const pb = new THREE.Mesh(gRBox(Math.max(.15, bore * 3), Math.max(.12, bore * 2), Math.max(.15, bore * 3), .01), api.pmat('#3a2a1a', .8)); pb.position.copy(B.ammo.position).add(V3(-Math.max(.25, bore * 5), Math.max(.06, bore), 0)); pb.userData.part = 'powder'; BN.g.add(pb); B.props.push(pb); void rackP;
  },
  labelFor: { vent: 'Vent — click to prick and prime', cmuzzle: 'Muzzle', sponge: 'Sponge — click to swab the bore', rammer: 'Rammer — click to ram the charge home', powder: 'Powder cartridges — click to load one', box: 'Shot — click to load a ball' },
  stroke(B, tool, n) { const t = B['tool_' + tool]; if (!t) return; const bore = B.wp.m.cal || .1, L = B.wp.m.L || 1.5, r = B.rig; const mz = B.root.localToWorld(V3(0, r.muzzleY || 0, r.muzzleZ)), inn = B.root.localToWorld(V3(0, 0, -bore * 2)); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(mz, inn, V3(0, 1, 0))).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), PI));
    const dir = inn.clone().sub(mz).normalize(); const start = mz.clone().addScaledVector(dir, -.02);
    BN.api.tween(t, start, q, .4, () => { let k = 0; const go = () => { if (k >= n) { BN.api.tween(t, t.userData.home.p, t.userData.home.q, .5); return; } k++; BN.api.tween(t, start.clone().addScaledVector(dir, Math.abs(r.muzzleZ) * .85), q, .35, () => { snd(tool === 'sponge' ? 'cover' : 'boltfwd'); BN.api.tween(t, start, q, .3, go); }); }; go(); }); },
  click(part, B, api) {
    const C = B.cn;
    if (part === 'sponge') { this.stroke(B, 'sponge', 2); C.sponged = true; C.hot = false; api.say('Sponged: the wet sponge kills any embers left from the last shot.'); return true; }
    if (part === 'powder') { if (C.powder) { api.say('There is already a charge in.'); return true; } if (!C.sponged) { api.say('Unsponged! The cartridge flashes on smouldering embers — sponge before you load.'); snd('belt'); B.flashT = .1; B.flash.visible = true; return true; } C.powder = true; api.flyRound(); snd('belt'); api.say('Powder cartridge into the muzzle.'); return true; }
    if (part === 'rammer') { if (!C.powder) { api.say('Nothing to ram yet.'); return true; } this.stroke(B, 'rammer', 1); C.rammed = true; api.say(C.shot ? 'Shot and charge rammed home.' : 'Charge rammed — now the shot.'); C.rammed = !!C.shot || C.rammed; return true; }
    if (part === 'vent') { if (!C.powder || !C.rammed) { api.say('Load and ram before priming.'); return true; } C.primed = true; snd('mode'); setTimeout(() => snd('belt'), 150); api.say('Vent pricked through the cartridge, primed with powder.'); return true; }
    if (part === 'cmuzzle') return false;
  },
  box(B, api) { const C = B.cn; if (!C.powder) { api.say('Powder first, then the shot.'); return 0; } if (C.shot) { api.say('Already shotted.'); return 0; } C.shot = true; C.rammed = false; api.flyRound(); snd('magin'); api.say('Shot into the muzzle — ram it home.'); return 1; },
  trigger(B, api) {
    const C = B.cn;
    if (!C.primed) { api.say('Not primed: prick and prime the vent first.'); return false; }
    C.primed = false; api.say('Give fire! The linstock touches the vent…');
    lockSnap(B, api, () => { if (!C.powder) { api.say('Only the priming burns — the gun was empty.'); return; } fireBig(B, api); api.say(C.shot ? 'BOOM. The gun leaps back on its carriage. Sponge out!' : 'A blank charge — no shot was loaded.'); Object.assign(C, { powder: false, shot: false, rammed: false, sponged: false, hot: true }); B.recoil = 1.5; panel(B); });
    return true;
  },
  status: B => { const C = B.cn; return [['Bore', C.sponged ? 'Sponged' : C.hot ? 'Hot — embers!' : 'Not sponged'], ['Charge', C.powder ? 'In' : '—'], ['Shot', C.shot ? 'In' : '—'], ['Rammed', C.rammed ? 'Yes' : 'No'], ['Vent', C.primed ? 'Primed' : 'Empty']]; },
  next: B => { const C = B.cn; if (!C.sponged) return 'Click the sponge: swab out the bore.'; if (!C.powder) return 'Click the powder box: a cartridge into the muzzle.'; if (!C.shot) return 'Click the shot pile: the ball goes in on top.'; if (!C.rammed) return 'Click the rammer: drive it all home.'; if (!C.primed) return 'Click the vent: prick the cartridge and prime.'; return 'Stand clear — click the trigger to fire.'; },
  howto: () => ['The full gun drill: <b>sponge</b> → <b>powder</b> → <b>shot</b> → <b>ram</b> → <b>prick & prime the vent</b> → <b>fire</b>.', 'Loading powder into an unsponged, hot gun is how gunners lost their arms.'],
};

// ================================================================== BREECH-LOADING ARTILLERY (and automatic cannon)
BN.kinds.breech = {
  setup(B, api) {
    const r = B.rig, bore = B.wp.m.cal || .1;
    B.auto = B.wp.act === 'auto' || B.cap > 1;
    B.bk = { open: false, shell: false, bag: false, case: false }; B.bo = 0;
    B.bagged = !!(G.CAL[B.wp.cal] || {}).bag;
    if (r.breech) { partTo(B, r.breech, 'breech'); proxy(Math.max(.03, bore * 1.5), 'breech', r.breech, 0, 0, -bore * .6); }
    else proxy(Math.max(.03, bore * 1.5), 'breech', B.root, 0, 0, bore);
    // firing lanyard hanging from the breech
    const lan = new THREE.Mesh(gCylY(Math.max(.003, bore * .03), Math.max(.003, bore * .03), Math.max(.3, bore * 6), 6), api.pmat('#c8b88a', 1)); lan.position.set(bore * 2, -Math.max(.15, bore * 3), bore); lan.userData.part = 'trigger'; B.root.add(lan);
    proxy(Math.max(.04, bore * 1.2), 'trigger', B.root, bore * 2, -Math.max(.3, bore * 6), bore);
  },
  labelFor: { breech: 'Breech — click to open or close', trigger: 'Lanyard — click to fire' },
  click(part, B, api) {
    if (part !== 'breech') return;
    if (B.auto) { api.say('Automatic cannon: clips go straight into the feed guides — click the ammunition crate.'); return true; }
    const K = B.bk; K.open = !K.open; snd(K.open ? 'boltback' : 'boltfwd');
    if (K.open && K.case && !B.bagged) { K.case = false; api.eject(false); api.say('Breech open — the extractor throws out the hot case.'); }
    else api.say(K.open ? 'Breech open.' : 'Breech closed and locked.');
    return true;
  },
  box(B, api) {
    if (B.auto) { const per = B.wp.id === 'bofors40' ? 4 : Math.max(1, Math.round(B.cap / 4)); if (B.rounds >= B.cap) { api.say('Feed is full.'); return 0; } B.rounds = Math.min(B.cap, B.rounds + per); api.flyRound(); snd('magin'); api.say(`Clip into the feed guides (${B.rounds}/${B.cap}).`); return 1; }
    const K = B.bk;
    if (!K.open) { api.say('Open the breech first.'); return 0; }
    if (!K.shell) { K.shell = true; api.flyRound(); snd('magin'); api.say(B.bagged ? 'Shell rammed into the chamber — now the propellant bags.' : 'Fixed round rammed into the chamber.'); return 1; }
    if (B.bagged && !K.bag) { K.bag = true; snd('belt'); api.say('Propellant bags in behind the shell.'); return 1; }
    api.say('Loaded — close the breech.'); return 0;
  },
  trigger(B, api) {
    if (B.auto) { if (B.rounds <= 0) { snd('dry'); api.say('Out of clips — load from the crate.'); return false; } B.rounds--; fireBig(B, api); setTimeout(() => api.eject(false), 60); B.recoil = .8; return true; }
    const K = B.bk;
    if (K.open) { api.say('The firing mechanism is blocked while the breech is open.'); return false; }
    if (!K.shell || (B.bagged && !K.bag)) { snd('dry'); api.say('Click — nothing in the chamber.'); return false; }
    K.shell = K.bag = false; K.case = true; fireBig(B, api); B.recoil = 1.5; B.recoilT = performance.now(); api.say('Fire! The barrel runs back on its recoil system and returns.'); return true;
  },
  tick(dt, B) {
    const r = B.rig, bore = B.wp.m.cal || .1;
    B.bo += ((B.bk.open ? 1 : 0) - B.bo) * Math.min(1, dt * 10);
    if (r.breech) { const h = r.breech.userData.h0 || (r.breech.userData.h0 = { p: r.breech.position.clone(), r: r.breech.rotation.clone() }); r.breech.position.copy(h.p); r.breech.rotation.copy(h.r); if (r.breechSlide) r.breech.position.x = h.p.x + B.bo * bore * 2.6; else r.breech.rotation.y = h.r.y + B.bo * 1.3; }
    if (r.recoilG && B.recoilT) { const t = (performance.now() - B.recoilT) / 1000, d = r.recoilDist || .3; r.recoilG.position.z = t < .06 ? d * t / .06 : Math.max(0, d * (1 - (t - .06) / .9)); }
  },
  status: B => B.auto ? [['Feed', `${B.rounds}/${B.cap} rounds in clips`], ['Mode', 'Automatic']] : [['Breech', B.bk.open ? 'Open' : 'Closed'], ['Shell', B.bk.shell ? 'Rammed' : '—'], ...(B.bagged ? [['Propellant', B.bk.bag ? 'Bags in' : '—']] : []), ['Case', B.bk.case ? 'Spent case in chamber' : '—']],
  next: B => B.auto ? (B.rounds ? 'Click the lanyard / trigger (hold to keep firing).' : 'Click the crate to drop clips into the feed.') : B.bk.open ? (!B.bk.shell ? 'Click the ammunition crate: load and ram a shell.' : B.bagged && !B.bk.bag ? 'Click the crate again for the propellant bags.' : 'Click the breech to close it.') : B.bk.shell ? 'Pull the lanyard (click it) to fire.' : 'Click the breech to open it.',
  howto: B => B.auto ? ['<b>Crate:</b> each click drops a clip into the feed guides.', '<b>Trigger:</b> hold for automatic fire.'] : ['<b>Breech:</b> click to open (the fired case is extracted) and close.', '<b>Crate:</b> click to load the shell' + (B.bagged ? ', then the propellant bags.' : '.'), '<b>Lanyard:</b> click to fire; the barrel recoils and runs out again.'],
};

// ================================================================== MORTARS: hang it, drop it, duck
BN.kinds.mortar = {
  setup(B) { B.inTube = false; },
  box(B, api) { if (B.inTube) { api.say('A bomb is already on its way down the tube — wait.'); return 0; } B.inTube = true; api.flyRound(); api.say('Bomb hung over the muzzle… released!'); snd('belt'); setTimeout(() => { if (BN._state() !== B) return; B.inTube = false; fireBig(B, api); api.say('THUNK — it slid down onto the firing pin and fired itself.'); BN.api.panel(); }, 900); return 1; },
  trigger(B, api) { api.say('A mortar fires when the bomb slides down onto the fixed firing pin: drop one in from the crate.'); return false; },
  status: B => [['Tube', B.inTube ? 'Bomb falling…' : 'Clear'], ['Elevation', Math.round((B.wp.m.elev || .9) * 57) + '°']],
  next: () => 'Click the crate to drop a bomb down the tube — then keep your head down.',
  howto: () => ['<b>Crate:</b> click to hang a bomb over the muzzle and let it go.', 'It fires itself on the firing pin at the bottom of the tube.'],
};

// ================================================================== SWAP-CHAMBER GUNS (breech-loading swivel gun, Puckle gun)
BN.kinds.chamber = {
  setup(B) { const p = B.rig.breech || B.rig.drum; B.cpart = p; B.cOut = false; B.cLoaded = 0; B.cPrimed = false; if (p) partTo(B, p, 'chamber'); if (B.rig.hammer) partTo(B, B.rig.hammer, 'hammer'); if (B.rig.crank) partTo(B, B.rig.crank, 'crank'); },
  labelFor: { chamber: 'Breech chamber — click to knock it out or wedge it in', crank: 'Crank — turns the cylinder to the next chamber' },
  click(part, B, api) {
    if (part === 'chamber' && B.cpart) { B.cOut = !B.cOut; const h = B.cpart.userData.h0 || (B.cpart.userData.h0 = { p: B.cpart.position.clone() }); api.tween(B.cpart, B.cOut ? h.p.clone().add(V3(0, .25, .2)) : h.p.clone(), B.cpart.quaternion.clone(), .35, () => snd(B.cOut ? 'magout' : 'boltfwd')); api.say(B.cOut ? 'Wedge knocked out, chamber lifted free.' : 'Chamber dropped in and the wedge hammered home.'); return true; }
    if (part === 'crank') { snd('mode'); B.cIdx = ((B.cIdx || 0) + 1) % 9; api.say('Cylinder turned to the next chamber.'); return true; }
  },
  box(B, api) { if (!B.cOut) { api.say('Knock the chamber out first.'); return 0; } const n = B.wp.mag || 1; if (B.cLoaded >= n) { api.say('Chamber loaded.'); return 0; } B.cLoaded = n; api.flyRound(); snd('belt'); api.say(n > 1 ? `All ${n} chambers charged.` : 'Powder and shot rammed into the chamber.'); return 1; },
  trigger(B, api) { if (B.cOut) { api.say('The chamber is out.'); return false; } if (!B.cLoaded) { snd('dry'); api.say('Empty.'); return false; } lockSnap(B, api, () => { B.cLoaded--; fireBig(B, api); api.say(B.cLoaded ? `Fired — ${B.cLoaded} chambers left.` : 'Fired. Swap in a fresh chamber.'); BN.api.panel(); }); return true; },
  status: B => [['Chamber', B.cOut ? 'Out' : 'In the breech'], ['Charges', `${B.cLoaded}/${B.wp.mag || 1}`]],
  next: B => B.cOut ? (B.cLoaded ? 'Click the chamber to wedge it back in.' : 'Click the box to charge it.') : B.cLoaded ? 'Click the trigger.' : 'Click the chamber to knock it out for loading.',
  howto: () => ['<b>Chamber:</b> click to knock it out and wedge it back.', '<b>Box:</b> charges the chamber while it is out.', 'Gunners kept several pre-loaded chambers so the gun could fire again at once.'],
};

// ================================================================== GATLING / ROCKET CART
BN.kinds.gatling = {
  setup(B) { if (B.rig.crank) partTo(B, B.rig.crank, 'trigger'); },
  trigger(B, api) { if (!B.magIn) { api.say('Seat a hopper magazine first.'); return false; } if (B.rounds <= 0) { snd('dry'); api.say('Hopper empty.'); return false; } B.rounds--; fireBig(B, api); setTimeout(() => api.eject(false), 40); if (B.rig.rotor) B.rig.rotor.rotation.z += 2 * PI / (B.wp.m.nb || 6); if (B.rig.crank) B.rig.crank.rotation.x += .9; return true; },
  next: B => !B.magIn ? (B.rounds ? 'Click the hopper on the bench to seat it on top.' : 'Click the box to fill the hopper.') : B.rounds ? 'Hold the crank (trigger) to fire — every turn fires a barrel.' : 'Drag the hopper off and refill it.',
  howto: () => ['<b>Hopper:</b> drag it off, fill it from the box, click to seat it on the feed.', '<b>Crank / trigger:</b> hold to turn: the barrels revolve, each one loading, firing and extracting in turn.'],
};
BN.kinds.hwacha = {
  box(B, api) { if (B.rounds >= B.cap) { api.say('The rack is full.'); return 0; } B.rounds = Math.min(B.cap, B.rounds + Math.max(1, B.wp.salvo || 1)); api.flyRound(); snd('belt'); api.say(`${B.rounds}/${B.cap} arrows in the rack.`); return 1; },
  trigger(B, api) { if (B.rounds <= 0) { api.say('The rack is empty.'); return false; } api.say('Fuses lit…'); lockSnap(B, api, () => { const n = Math.min(B.rounds, B.wp.salvo || 1); B.rounds -= n; fireBig(B, api); api.say(`WHOOSH — ${n} rockets away.`); BN.api.panel(); }); return true; },
  status: B => [['Rack', `${B.rounds}/${B.cap}`]],
  next: B => B.rounds ? 'Click the trigger to light the fuses.' : 'Click the box to fill the rack.',
  howto: () => ['<b>Box:</b> adds a volley of rocket-arrows to the rack.', '<b>Trigger:</b> lights the fuses — a volley leaves after a moment.'],
};
BN.labelFor = (part, B) => { const K = BN.kinds[B.kind]; return K && K.labelFor && K.labelFor[part]; };
BN.onSetup = (B, api) => { BN.strip = null; BN.cyc = null; BN.xray = false; BN.clean = null; const K = BN.kinds[B.kind]; if (K && K.setup) K.setup(B, api); };
function panel() { BN.api.panel(); }

// ================================================================== OPERATING SYSTEMS (inner workings)
const STRAIGHT = ['m1895aus', 'ross', 'k31', 'm95'];
const PISTON_AR = ['hk416', 'hk416a5', 'm27', 'hk433', 'mk18x', 'mcxvirtus', 'rattler'];
G.opSystem = function (wp, rig) {
  const m = wp.m || {}, t = m.t, id = wp.id, bt = rig ? rig.boltType : '';
  if (t === 'break') return 'break';
  if (t === 'falling') return wp.lock ? 'lock_flint' : 'falling';
  if (t === 'musket' || t === 'fpistol') return 'lock_' + (m.lock || 'flint');
  if (t === 'cannon' || t === 'mortar_old') return m.breech === 'chamber' ? 'chamber' : m.breech === 'screw' ? 'screwbreech' : 'cannon';
  if (t === 'puckle') return 'chamber'; if (t === 'gatling') return 'gatling'; if (t === 'hwacha') return 'rocket';
  if (t === 'art') return m.rotary ? 'rotary' : m.kind === 'mortar' && !m.breechLoad ? 'mortar' : m.kind === 'recoilless' ? 'recoilless' : wp.act === 'auto' ? 'autocannon' : 'artillery';
  if (wp.spin) return 'rotary'; if (wp.charge) return 'coil';
  if (t === 'rev' || bt === 'rev') return wp.reloadKind === 'caprev' ? 'caprev' : 'revolver';
  if (bt === 'bolt') return STRAIGHT.includes(id) ? 'bolt_straight' : 'bolt';
  if (bt === 'lever') return 'lever'; if (bt === 'pump') return 'pump';
  if (bt === 'slide') return m.bh === 'toggle' ? 'toggle' : /9×18|\.32|\.380|\.25|\.22|7\.65/.test(wp.cal) ? 'blowback_pistol' : 'short_recoil';
  if (m.bh === 'hk' || ['g3', 'g3sg1', 'cetme_c', 'psg1', 'msg90', 'hk33', 'hk53', 'mp5', 'mp5sd', 'mp5k', 'mp5a2', 'mp5n', 'hk21', 'hk23e', 'stg45'].includes(id)) return 'roller';
  if (['mg42', 'mg3', 'mg34', 'mg0815', 'm1919', 'm1919a4', 'deuce', 'vickers', 'maxim1910', 'mg08', 'schwarzlose'].includes(id)) return ['vickers', 'maxim1910', 'mg08', 'mg0815'].includes(id) ? 'maxim' : ['m1919', 'm1919a4', 'deuce'].includes(id) ? 'browning_mg' : id === 'schwarzlose' ? 'blowback_delayed' : 'roller_recoil';
  if (wp.act === 'auto_ob') return 'blowback_ob';
  if (wp.caseless) return 'caseless';
  if (t === 'ar' && m.bh === 'ar') return PISTON_AR.includes(id) ? 'short_piston' : 'di';
  if (t === 'ak') return 'long_piston';
  if (['garand', 'm1c', 'm14', 'm21', 'mk14', 'bm59', 't44', 'm1carbine', 'm2carbine'].includes(id)) return 'oprod';
  if (t === 'smg') return 'blowback';
  return 'short_piston';
};
const OS = {
  di: { n: 'Direct gas impingement (Stoner)', d: 'Gas tapped from the barrel runs back through a thin tube straight into the bolt carrier key. It pushes the carrier back; a cam pin rotates the bolt to unlock its seven lugs, the carrier rides back over the buffer and action spring, then returns stripping a new round.', inner: ['carrier', 'bolthead', 'firingpin', 'campin', 'gastube', 'spring', 'hammer', 'sear', 'extractor'] },
  short_piston: { n: 'Short-stroke gas piston', d: 'A short piston in the gas block is kicked back a few centimetres and taps an operating rod against the bolt carrier, which continues back on its own momentum. Cleaner than direct impingement: the carbon stays up front.', inner: ['carrier', 'bolthead', 'firingpin', 'piston', 'spring', 'hammer', 'sear', 'extractor'] },
  long_piston: { n: 'Long-stroke gas piston (Kalashnikov)', d: 'The gas piston is part of the bolt carrier: gas drives the whole assembly back the full stroke. A cam track rotates the two-lug bolt open. Loose tolerances, enormous reliability.', inner: ['carrier', 'bolthead', 'firingpin', 'piston', 'spring', 'hammer', 'sear', 'extractor'] },
  oprod: { n: 'Gas-operated rotating bolt with operating rod', d: 'Gas drives a piston and a long operating rod (op-rod) that cams the bolt open; the op-rod spring returns it.', inner: ['carrier', 'bolthead', 'firingpin', 'piston', 'spring', 'hammer', 'sear'] },
  roller: { n: 'Roller-delayed blowback', d: 'Two rollers in the bolt head sit in recesses in the trunnion. The cartridge pushes back; the rollers must be cammed inward, which drives the heavy carrier back four times faster than the bolt head — delaying opening until pressure drops.', inner: ['carrier', 'bolthead', 'rollers', 'firingpin', 'spring', 'hammer', 'sear'] },
  roller_recoil: { n: 'Roller-locked short recoil', d: 'Barrel and bolt recoil together, locked by rollers; a cam forces the rollers in and frees the bolt, which flies back while the barrel stops. The cyclic rate is ferocious.', inner: ['carrier', 'bolthead', 'rollers', 'spring', 'sear', 'feedpawl'] },
  maxim: { n: 'Toggle-locked recoil (Maxim)', d: 'Barrel and lock recoil together; the toggle joint “breaks” over a cam, the lock pulls the empty case out of the chamber and a fresh round out of the belt, and a fusee spring folds it all back.', inner: ['toggle', 'bolthead', 'spring', 'feedpawl', 'sear'] },
  browning_mg: { n: 'Short recoil with accelerator (Browning)', d: 'Barrel and bolt recoil locked; an accelerator lever throws the bolt back hard as the barrel stops.', inner: ['carrier', 'bolthead', 'spring', 'feedpawl', 'sear'] },
  blowback_delayed: { n: 'Delayed blowback (toggle)', d: 'A toggle at mechanical disadvantage delays the bolt without any lock.', inner: ['toggle', 'bolthead', 'spring'] },
  blowback: { n: 'Straight blowback (closed bolt)', d: 'Nothing locks: the mass of the bolt and the strength of the spring hold the case in until pressure drops.', inner: ['carrier', 'firingpin', 'spring', 'hammer', 'sear'] },
  blowback_ob: { n: 'Open-bolt blowback', d: 'The bolt rests to the rear. The trigger releases it; it slams forward, strips a round and fires it as it lands — then the gas blows it back onto the sear.', inner: ['carrier', 'firingpin', 'spring', 'sear'] },
  blowback_pistol: { n: 'Straight blowback pistol', d: 'The barrel is fixed; the slide is held shut only by its weight and the recoil spring around the barrel.', inner: ['barrel', 'spring', 'firingpin', 'hammer', 'sear'] },
  short_recoil: { n: 'Short recoil, tilting barrel (Browning)', d: 'Slide and barrel recoil locked together a few millimetres; a cam (or link) drops the barrel’s breech out of the slide, unlocking it. The slide continues back, ejects, and the recoil spring returns it.', inner: ['barrel', 'spring', 'firingpin', 'hammer', 'sear', 'extractor'] },
  toggle: { n: 'Toggle-locked short recoil (Luger)', d: 'The toggle links lie straight while locked; recoil drives them over a ramp so the knee breaks upward.', inner: ['toggle', 'firingpin', 'spring'] },
  bolt: { n: 'Turn-bolt action', d: 'Lift the handle: the locking lugs rotate out of their recesses and the cocking cam compresses the mainspring. Pull back: the extractor draws the case out. Push forward: a fresh round is stripped into the chamber. Turn down: locked.', inner: ['firingpin', 'spring', 'extractor', 'follower'] },
  bolt_straight: { n: 'Straight-pull bolt', d: 'Pulling straight back rotates the bolt head through helical grooves in the bolt sleeve — no lift needed.', inner: ['firingpin', 'spring', 'extractor', 'follower'] },
  lever: { n: 'Lever action', d: 'Swinging the lever moves toggle links that draw the bolt back and lift a carrier holding the next round from the tube into line with the chamber.', inner: ['carrier', 'firingpin', 'hammer', 'spring', 'follower'] },
  pump: { n: 'Pump action', d: 'Action bars tie the fore-end to the bolt: pump back to unlock, extract and eject; the shell lifter raises the next shell from the tube; pump forward to chamber.', inner: ['carrier', 'firingpin', 'hammer', 'spring', 'follower'] },
  revolver: { n: 'Double-action revolver', d: 'Pulling the trigger raises the hammer, a hand (pawl) turns the cylinder, the cylinder stop locks it, then the hammer falls.', inner: ['hand', 'cylstop', 'spring', 'firingpin'] },
  caprev: { n: 'Single-action cap-and-ball revolver', d: 'Each chamber holds loose powder and a ball rammed with the loading lever; a copper cap on the nipple at the back fires it. Cocking the hammer turns the cylinder.', inner: ['hand', 'cylstop', 'spring'] },
  break: { n: 'Break-action (Anson & Deeley boxlock)', d: 'The top lever withdraws a locking bolt from bites under the barrels. As the barrels drop, cocking rods cock the internal tumblers; ejectors flick out only the fired shells.', inner: ['lockbolt', 'tumblers', 'ejectors', 'spring'] },
  falling: { n: 'Falling / pivoting block', d: 'A solid block slides or pivots out of the way to open the breech; closing it locks the cartridge in. The simplest strong breechloader.', inner: ['firingpin', 'spring', 'extractor'] },
  lock_flint: { n: 'Flintlock', d: 'The cock holds a flint. At full cock the sear holds the tumbler against the V-shaped mainspring. Pull the trigger: the flint scrapes the steel frizzen, throwing it open and showering sparks into the priming pan; the flash goes through the touch-hole and fires the main charge.', inner: ['tumbler', 'mainspring', 'sear', 'bridle', 'bore', 'charge'] },
  lock_match: { n: 'Matchlock', d: 'A smouldering slow match held in the serpentine is lowered into the priming pan by the trigger.', inner: ['tumbler', 'sear', 'bore', 'charge'] },
  lock_wheel: { n: 'Wheellock', d: 'A spring-powered serrated wheel, wound with a spanner, spins against a piece of pyrite to throw sparks into the pan — the first self-igniting lock.', inner: ['tumbler', 'mainspring', 'sear', 'bore', 'charge'] },
  lock_cap: { n: 'Percussion lock', d: 'The hammer strikes a copper cap filled with fulminate on a hollow nipple; the flash goes straight down into the charge. Weatherproof and nearly instant.', inner: ['tumbler', 'mainspring', 'sear', 'bore', 'charge'] },
  cannon: { n: 'Muzzle-loading smoothbore cannon', d: 'Powder cartridge and shot are rammed down the bore from the muzzle. A priming of fine powder in the vent is touched off by a linstock or a friction tube.', inner: ['bore', 'charge', 'vent'] },
  chamber: { n: 'Breech chamber (removable)', d: 'Pre-loaded chambers are dropped into the open breech and wedged against the barrel.', inner: ['bore', 'charge'] },
  screwbreech: { n: 'Armstrong screw breech', d: 'A hollow breech screw and a removable vent piece close the bore: unscrew, lift the vent piece, load from behind.', inner: ['bore', 'charge', 'vent'] },
  artillery: { n: 'Breech-loading gun with hydro-pneumatic recoil', d: 'A sliding-wedge or interrupted-screw breech block seals the chamber. On firing the barrel slides back in its cradle against a hydraulic buffer; compressed gas in the recuperator pushes it back out.', inner: ['firingpin', 'buffer', 'recuperator', 'bore', 'charge'] },
  autocannon: { n: 'Recoil-operated automatic cannon', d: 'Barrel and breech recoil together; the recoil drives the breech block down, rams the next round from the clip guides and fires it again.', inner: ['buffer', 'recuperator', 'bore', 'charge', 'feedpawl'] },
  recoilless: { n: 'Recoilless rifle', d: 'Part of the propellant gas vents rearward through a venturi, balancing the forward momentum of the shell: no recoil, a lethal backblast.', inner: ['bore', 'charge', 'firingpin'] },
  mortar: { n: 'Muzzle-loaded mortar (drop fire)', d: 'The bomb is dropped down a smooth tube onto a fixed firing pin; the cartridge in its tail fires, and the fins keep it straight.', inner: ['bore', 'charge', 'firingpin'] },
  gatling: { n: 'Gatling (crank-driven rotary)', d: 'Each barrel has its own bolt riding a fixed spiral cam. Turning the crank revolves the cluster: each bolt is driven forward to load and fire at the top, and drawn back to extract as it comes round.', inner: ['cam', 'bolts', 'gears', 'bore'] },
  rotary: { n: 'Electric rotary cannon', d: 'Like a Gatling, but spun by a motor at thousands of rounds a minute.', inner: ['cam', 'bolts', 'bore'] },
  rocket: { n: 'Rocket launcher', d: 'Gunpowder rocket motors are fused and fired in a volley.', inner: ['bore'] },
  caseless: { n: 'Rotary chamber, caseless ammunition (G11)', d: 'The chamber rotates 90° to take a caseless round from the magazine, swings into line and fires; there is no case to extract.', inner: ['carrier', 'firingpin', 'spring'] },
  coil: { n: 'Coilgun', d: 'Capacitors dump into accelerator coils in sequence, pulling a ferromagnetic slug down the barrel.', inner: ['bore', 'buffer'] },
};
G.OS = OS;
const PN = { carrier: 'Bolt carrier', bolthead: 'Bolt (locking lugs)', firingpin: 'Firing pin', campin: 'Cam pin', gastube: 'Gas tube', piston: 'Gas piston / operating rod', spring: 'Recoil / main spring', hammer: 'Hammer', sear: 'Sear & disconnector', extractor: 'Extractor & ejector', rollers: 'Locking rollers', toggle: 'Toggle links', feedpawl: 'Feed pawl & arm', barrel: 'Barrel & link', follower: 'Magazine follower & spring', hand: 'Hand (cylinder pawl)', cylstop: 'Cylinder stop', lockbolt: 'Locking bolt', tumblers: 'Tumblers & cocking rods', ejectors: 'Ejectors', tumbler: 'Tumbler', mainspring: 'V mainspring', bridle: 'Bridle', bore: 'Bore', charge: 'Powder charge & projectile', vent: 'Vent', buffer: 'Recoil buffer', recuperator: 'Recuperator', cam: 'Spiral cam', bolts: 'Barrel bolts', gears: 'Crank gears' };

// build the internal parts for a gun, from its own dimensions
function buildInner(B) {
  const wp = B.wp, rig = B.rig, os = G.opSystem(wp, rig), def = OS[os] || OS.short_piston;
  const m = wp.m, R = m.R || [.2, .05, .04], RL = R[0], RH = R[1], RW = R[2];
  const zr = rig.zr ?? .05, zf = rig.zf ?? -.1, top = rig.top ?? .02, bot = rig.bot ?? -.04;
  const bore = m.cal || ((G.CAL[wp.cal] || { cs: [0, .005] }).cs[1] * 2), L = m.L || (m.B ? m.B[0] : .4);
  const g = new THREE.Group(); g.name = 'inner'; B.root.add(g);
  const steel = BN.api.pmat('#9aa0a6', .3, .9), dark = BN.api.pmat('#3d4248', .45, .8), spr = BN.api.pmat('#b9b2a2', .35, .9), brass = BN.api.pmat('#c9a14a', .3, 1), red = BN.api.pmat('#8a3a2a', .6, .2), powder = BN.api.pmat('#2a2622', 1, 0);
  const parts = [];
  const mk = (key, obj, motion) => { obj.userData.inner = key; obj.traverse(o => { o.userData.inner = key; }); g.add(obj); parts.push({ key, name: PN[key] || key, obj, home: obj.position.clone(), rot: obj.rotation.clone(), motion }); };
  const M = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); return o; };
  const helix = (r, len, n, mat) => { const s = new THREE.Group(); for (let i = 0; i < n; i++) { const t = new THREE.Mesh(gTor(r, r * .12), mat); t.position.z = -len / 2 + i * len / (n - 1); s.add(t); } return s; };
  const stroke = rig.boltStroke || rig.slideStroke || RL * .3;
  const cz = zr - RL * .38, cy = RH * .05;
  for (const key of def.inner) {
    if (key === 'carrier') { const o = M(gRBox(RW * .5, RH * .32, RL * .42, .003), steel, 0, cy, cz); mk(key, o, (s, o2) => { o2.position.z = cz + s.o * stroke; }); }
    else if (key === 'bolthead') { const o = new THREE.Group(); o.add(M(gCyl(RW * .17, RW * .17, RL * .14, 12), steel, 0, 0, 0)); for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * PI; o.add(M(gBox(RW * .06, RW * .06, RL * .03), steel, Math.cos(a) * RW * .19, Math.sin(a) * RW * .19, -RL * .06)); } o.position.set(0, 0, cz - RL * .25); mk(key, o, (s, o2) => { o2.position.z = cz - RL * .25 + Math.max(0, s.o - .08) * stroke; o2.rotation.z = clamp(s.o / .08, 0, 1) * .4; }); }
    else if (key === 'firingpin') { const z0 = (B.kind === 'std' && rig.boltType === 'bolt') ? zr - .04 : cz - RL * .1; const o = M(gCyl(Math.max(.0015, RW * .04), Math.max(.0015, RW * .03), Math.max(.03, RL * .4), 6), steel, 0, rig.boltType === 'slide' ? RH * .1 : 0, z0); mk(key, o, (s, o2) => { o2.position.z = z0 + s.o * stroke - s.f * .006; }); }
    else if (key === 'campin') { const o = M(gCylY(RW * .05, RW * .05, RH * .3, 8), dark, 0, cy + RH * .1, cz - RL * .15); mk(key, o, (s, o2) => { o2.position.z = cz - RL * .15 + s.o * stroke; }); }
    else if (key === 'gastube') { const len = Math.abs(zf - (zf - Math.max(.1, (m.B ? m.B[0] : .4) * .5))) + RL * .5; const o = M(gCyl(.003, .003, len, 6), dark, 0, RH * .22, zf - len / 2 + RL * .5); mk(key, o, null); }
    else if (key === 'piston') { const len = Math.max(.12, (m.B ? m.B[0] : .4) * .45); const z0 = zf - len / 2 + .02; const long = os === 'long_piston' || os === 'oprod'; const o = M(gCyl(RW * .12, RW * .12, len, 10), dark, 0, RH * .35, z0); mk(key, o, (s, o2) => { o2.position.z = z0 + (long ? s.o * stroke : Math.min(s.o, .15) * stroke * .6); }); }
    else if (key === 'spring') {
      if (rig.boltType === 'slide') { const len = RL * .7; const o = helix(RW * .2, len, 14, spr); o.position.set(0, -RH * .2, zf + len / 2 + .005); mk(key, o, (s, o2) => { o2.scale.z = 1 - s.o * .4; o2.position.z = zf + len / 2 + .005 + s.o * len * .2; }); }
      else if (B.kind === 'std' && (m.t === 'ar') && rig.stockEnd) { const len = Math.min(.25, rig.stockEnd.z - zr); const o = helix(RW * .25, len, 18, spr); o.position.set(0, RH * .05, zr + len / 2); mk(key, o, (s, o2) => { o2.scale.z = 1 - s.o * .45; o2.position.z = zr + len / 2 + s.o * len * .22; }); }
      else { const len = Math.max(.04, RL * .5); const o = helix(Math.max(.003, RW * .14), len, 14, spr); o.position.set(0, RH * .25, zr - len / 2 - .005); mk(key, o, (s, o2) => { o2.scale.z = 1 - s.o * .5; o2.position.z = zr - len / 2 - .005 + s.o * len * .25; }); }
    }
    else if (key === 'hammer') { const o = new THREE.Group(); o.add(M(gBox(RW * .3, RH * .5, RW * .3), dark, 0, RH * .25, 0)); o.position.set(0, bot * .6, zr - RL * .15); mk(key, o, (s, o2) => { o2.rotation.x = s.o > .2 || s.cock ? -1 : -1 + Math.min(1, s.f * 4); }); }
    else if (key === 'sear') { const o = M(gBox(RW * .3, RH * .12, RW * .6), dark, 0, bot * .8, zr - RL * .05); mk(key, o, (s, o2) => { o2.rotation.x = s.f > 0 ? .2 : 0; }); }
    else if (key === 'extractor') { const o = M(gBox(RW * .08, RW * .14, RL * .12), red, RW * .2, RW * .1, cz - RL * .3); mk(key, o, (s, o2) => { o2.position.z = cz - RL * .3 + s.o * stroke; }); }
    else if (key === 'rollers') { const o = new THREE.Group(); for (const sd of [-1, 1]) o.add(M(gSph(RW * .09, 8), steel, sd * RW * .3, 0, 0)); o.position.set(0, 0, cz - RL * .3); mk(key, o, (s, o2) => { o2.children.forEach((c, i) => { c.position.x = (i ? 1 : -1) * RW * (.3 - clamp(s.o / .1, 0, 1) * .12); }); o2.position.z = cz - RL * .3 + Math.max(0, s.o - .1) * stroke; }); }
    else if (key === 'toggle') { const o = new THREE.Group(); const a = M(gBox(RW * .5, RH * .12, RL * .2), steel, 0, 0, -RL * .1); const b = M(gBox(RW * .5, RH * .12, RL * .2), steel, 0, 0, -RL * .3); o.add(a, b); o.position.set(0, RH * .2, zr - RL * .05); mk(key, o, (s, o2) => { o2.children[0].rotation.x = s.o * .7; o2.children[1].rotation.x = -s.o * .7; o2.children[1].position.y = s.o * RH * .25; }); }
    else if (key === 'feedpawl') { const o = M(gBox(RW * .8, RW * .1, RL * .1), red, 0, top, zr - RL * .4); mk(key, o, (s, o2) => { o2.position.x = Math.sin(s.o * PI) * RW * .4; }); }
    else if (key === 'barrel') { const o = M(gCyl(RW * .22, RW * .2, RL * .75, 12), dark, 0, 0, zf + RL * .4); mk(key, o, (s, o2) => { o2.position.z = zf + RL * .4 + Math.min(s.o, .15) * stroke; o2.rotation.x = os === 'short_recoil' ? -clamp((s.o - .05) / .1, 0, 1) * .05 : 0; }); }
    else if (key === 'follower') { const ib = (rig.magHome ? rig.magHome.pos.clone() : V3(0, bot, cz)); const o = new THREE.Group(); o.add(M(gBox(RW * .45, .004, Math.max(.02, RL * .15)), red, 0, 0, 0)); const sp = helix(RW * .15, .05, 8, spr); sp.rotation.x = PI / 2; sp.position.y = -.03; o.add(sp); o.position.copy(ib).add(V3(0, -.006, 0)); mk(key, o, (s, o2) => { o2.position.y = ib.y - .006 - (1 - s.load) * .03; }); }
    else if (key === 'hand') { const c0 = rig.cyl ? rig.cyl.position : V3(0, 0, -.02); const o = M(gBox(.003, RH * .4, .004), red, RW * .2, c0.y - RH * .2, c0.z + .026); mk(key, o, (s, o2) => { o2.position.y = c0.y - RH * .2 + s.o * RH * .15; }); }
    else if (key === 'cylstop') { const c0 = rig.cyl ? rig.cyl.position : V3(0, 0, -.02); const o = M(gBox(.004, .005, .012), dark, 0, c0.y - RH * .5, c0.z); mk(key, o, (s, o2) => { o2.position.y = c0.y - RH * .5 - (s.o > .1 && s.o < .6 ? .004 : 0); }); }
    else if (key === 'lockbolt') { const o = M(gBox(.02, .006, .03), steel, 0, -.03, -.03); mk(key, o, (s, o2) => { o2.position.z = -.03 + s.o * .012; }); }
    else if (key === 'tumblers') { const o = new THREE.Group(); for (const sd of [-1, 1]) { const tm = M(gBox(.004, .026, .012), dark, sd * .01, 0, 0); o.add(tm); } o.position.set(0, -.012, .01); mk(key, o, (s, o2) => { o2.rotation.x = s.cock ? -.6 : 0; }); }
    else if (key === 'ejectors') { const o = new THREE.Group(); for (const sd of [-1, 1]) o.add(M(gCyl(.002, .002, .2, 6), steel, sd * .01, .025, -.15)); mk(key, o, null); if (rig.brk) { rig.brk.add(o); } }
    else if (key === 'tumbler') { const p = rig.hammer ? rig.hammer.position : V3(.02, 0, 0); const o = M(gCylX(.008, .008, .006, 12), dark, p.x - .01, p.y, p.z); mk(key, o, (s, o2) => { o2.rotation.x = s.cock ? -.9 : 0; }); }
    else if (key === 'mainspring') { const p = rig.hammer ? rig.hammer.position : V3(.02, 0, 0); const o = new THREE.Group(); const a = M(gBox(.002, .003, .07), spr, 0, 0, -.035); const b = M(gBox(.002, .003, .07), spr, 0, -.008, -.035); b.rotation.x = .12; o.add(a, b); o.position.set(p.x - .012, p.y - .006, p.z - .01); mk(key, o, (s, o2) => { o2.children[1].rotation.x = s.cock ? .04 : .12; }); }
    else if (key === 'bridle') { const p = rig.hammer ? rig.hammer.position : V3(.02, 0, 0); const o = M(gBox(.002, .014, .03), steel, p.x - .016, p.y, p.z - .006); mk(key, o, null); }
    else if (key === 'bore') { const len = Math.abs(rig.muzzleZ || L) * .98; const r0 = Math.max(.003, bore * .5); const o = M(gCyl(r0, r0, len, 14), BN.api.pmat('#151515', 1, 0), 0, rig.muzzleY ? 0 : 0, -len / 2); if (rig.recoilG) rig.recoilG.add(o); mk(key, o, null); if (rig.recoilG) { rig.recoilG.add(o); } }
    else if (key === 'charge') { const r0 = Math.max(.003, bore * .48), z0 = -Math.max(.01, bore * 1.2); const o = new THREE.Group(); o.add(M(gCyl(r0, r0, Math.max(.01, bore * 2), 12), powder, 0, 0, 0)); o.add(M(gSph(r0, 10), BN.api.pmat('#5c5c60', .45, .8), 0, 0, -Math.max(.01, bore * 1.6))); o.position.set(0, 0, z0 - Math.max(0, (B.wp.m.t === 'musket' || B.wp.m.t === 'fpistol') ? .03 : bore)); if (rig.recoilG) rig.recoilG.add(o); mk(key, o, (s, o2) => { o2.visible = !!s.load; }); if (rig.recoilG) rig.recoilG.add(o); }
    else if (key === 'vent') { const v = rig.ventPos || V3(0, bore, 0); const o = M(gCylY(Math.max(.002, bore * .05), Math.max(.002, bore * .05), v.y, 6), BN.api.pmat('#151515', 1, 0), 0, v.y / 2, v.z); mk(key, o, null); }
    else if (key === 'buffer') { const o = M(gCyl(bore * .5, bore * .5, Math.max(.2, L * .25), 12), steel, 0, bore * 2.1, -Math.max(.2, L * .25) * .6); mk(key, o, (s, o2) => { o2.position.z = -Math.max(.2, L * .25) * .6 + s.rec * (rig.recoilDist || .2); }); }
    else if (key === 'recuperator') { const len = Math.max(.2, L * .25); const o = helix(bore * .45, len, 16, spr); o.position.set(0, -bore * 2.2, -len * .6); mk(key, o, (s, o2) => { o2.scale.z = 1 - s.rec * .4; }); }
    else if (key === 'cam') { const o = M(gTor(.045, .006), red, 0, 0, .02); o.rotation.y = .3; mk(key, o, null); }
    else if (key === 'bolts') { const o = new THREE.Group(); const nb = m.nb || 6; for (let i = 0; i < nb; i++) { const a = i / nb * 2 * PI; o.add(M(gCyl(.006, .006, .08, 8), steel, Math.cos(a) * .035, Math.sin(a) * .035, .02)); } mk(key, o, (s, o2) => { o2.rotation.z = (rig.rotor ? rig.rotor.rotation.z : 0); o2.children.forEach((c, i) => { const a = i / o2.children.length * 2 * PI + o2.rotation.z; c.position.z = .02 + Math.cos(a) * .03; }); }); }
    else if (key === 'gears') { const o = new THREE.Group(); o.add(M(gCylX(.03, .03, .01, 16), brass, .07, 0, .02)); o.add(M(gCyl(.03, .03, .01, 16), brass, 0, 0, .08)); mk(key, o, (s, o2) => { o2.children[0].rotation.x = rig.crank ? rig.crank.rotation.x : 0; o2.children[1].rotation.z = rig.crank ? rig.crank.rotation.x : 0; }); }
  }
  g.visible = false;
  return { os, def, group: g, parts };
}

// ------------------------------------------------------------------ split the model into its assemblies
const SECNAME = { mag: 'Magazine', receiver: 'Receiver', barrel: 'Barrel', handguard: 'Handguard / fore-end', stock: 'Stock', grip: 'Grip', trigger: 'Trigger group', action: 'Action parts', sights: 'Sights', muzzle: 'Muzzle device', extras: 'Fittings', attach: 'Accessories' };
const MOVN = { mag: 'Magazine', bolt: 'Bolt / bolt carrier group', slide: 'Slide', charge: 'Charging handle', cover: 'Feed cover', pump: 'Fore-end & action bars', lever: 'Lever & links', cyl: 'Cylinder', trigger: 'Trigger', hammer: 'Hammer / cock', brk: 'Barrels & fore-end', rod: 'Ramrod', breech: 'Breech block', drum: 'Chamber block', rotor: 'Barrel cluster', toplever: 'Top lever', flever: 'Lever', frizzen: 'Frizzen & pan', wheel: 'Wheel', crank: 'Crank', recoilG: 'Barrel & recoil slide', rack: 'Rocket rack', bipod: 'Bipod', belt: 'Belt' };
const ORDER = ['mag', 'attach', 'rod', 'cover', 'charge', 'slide', 'bolt', 'pump', 'lever', 'flever', 'cyl', 'brk', 'toplever', 'drum', 'breech', 'INNER', 'handguard', 'muzzle', 'frizzen', 'hammer', 'wheel', 'trigger', 'grip', 'stock', 'sights', 'extras', 'rack', 'crank', 'rotor', 'bipod', 'recoilG', 'barrel'];
const STEPTXT = {
  di: { stock: 'Push out the rear takedown pin and hinge the lower receiver away', charge: 'Pull the charging handle back and out', bolt: 'Slide the bolt carrier group out of the upper', 'i:firingpin': 'Pull the retaining pin; the firing pin drops out', 'i:campin': 'Turn and lift out the cam pin', 'i:bolthead': 'Slide the bolt out of the carrier', 'i:spring': 'Press the buffer and draw out buffer and action spring', handguard: 'Pull the delta ring and lift off the handguard halves' },
  long_piston: { cover: 'Press the recoil-spring guide and lift off the dust cover', 'i:spring': 'Push the guide forward and lift out the recoil spring', bolt: 'Pull the bolt carrier back and lift it out', 'i:bolthead': 'Rotate the bolt and slide it out of the carrier', handguard: 'Turn the lever and lift off the gas tube and upper handguard', 'i:piston': 'The gas piston comes out with the carrier' },
  short_recoil: { mag: 'Drop the magazine and lock the slide back', slide: 'Pull the takedown lever / slide stop and run the slide off the front', 'i:spring': 'Lift out the recoil spring and guide rod', 'i:barrel': 'Tip the barrel up and out of the slide' },
  bolt: { bolt: 'Open the bolt, press the bolt release and draw the bolt out', 'i:firingpin': 'Unscrew the cocking piece: firing pin and mainspring come out', 'i:extractor': 'Rotate the extractor off its collar', 'i:follower': 'Press the floorplate catch: floorplate, spring and follower drop out', stock: 'Undo the guard screws and lift the action out of the stock' },
  roller: { stock: 'Push out the stock pins and slide the stock off', bolt: 'Pull the cocking handle back and draw the bolt group out', 'i:bolthead': 'Rotate and remove the bolt head with its rollers', trigger: 'Swing the trigger group down and out' },
  lock_flint: { rod: 'Draw the ramrod', frizzen: 'Ease the frizzen spring', hammer: 'Unscrew the side nails and lift the lock off the stock', barrel: 'Push out the pins / bands and lift the barrel from the stock' },
  break: { brk: 'Push the top lever, open and lift the barrels off the hinge pin (fore-end first)', handguard: 'Unlatch and remove the fore-end' },
  cannon: { recoilG: 'Lift the barrel off its trunnions (by crane!)' },
  artillery: { breech: 'Open the breech and withdraw the block', recoilG: 'Disconnect the recoil system and slide the barrel out of the cradle' },
};
function ensureParts(B) {
  if (B.parts) return B.parts;
  const root = B.root, rig = B.rig;
  if (rig.mag && rig.mag.parent !== root) { /* magazine is out on the bench: leave it */ }
  const named = {}; for (const k in MOVN) if (rig[k] && rig[k].isObject3D && rig[k].parent === root) named[k] = rig[k];
  const parts = [];
  // moving assemblies
  for (const k in named) parts.push({ key: k, name: MOVN[k], obj: named[k], move: true });
  // static meshes grouped by section
  const bySec = {};
  for (const ch of root.children.slice()) {
    if (Object.values(named).includes(ch) || ch.name === 'inner' || ch === B.flash || ch.userData.proxy) continue;
    if (ch.isMesh) { const sk = ch.userData.sec || 'receiver'; (bySec[sk] = bySec[sk] || []).push(ch); }
    else if (ch.isGroup && ch.children.length) { const sk = (() => { let s0 = null; ch.traverse(o => { if (!s0 && o.isMesh && o.userData.sec) s0 = o.userData.sec; }); return s0 || 'extras'; })(); parts.push({ key: sk + '_' + parts.length, sec: sk, name: SECNAME[sk] || sk, obj: ch, move: true }); }
  }
  for (const sk in bySec) { const gr = new THREE.Group(); gr.name = 'sec_' + sk; root.add(gr); for (const mm of bySec[sk]) gr.add(mm); parts.push({ key: sk, sec: sk, name: SECNAME[sk] || sk, obj: gr }); }
  // give every part its own materials (for highlighting, X-ray and dirt)
  for (const p of parts) { p.obj.traverse(o => { if (o.isMesh && o.material && !o.userData.proxy && !o.material.userData.own) { o.material = o.material.clone(); o.material.userData.own = true; o.material.userData.base = { c: o.material.color ? o.material.color.clone() : null, r: o.material.roughness }; } }); p.home = p.obj.position.clone(); p.homeQ = p.obj.quaternion.clone(); }
  B.inner = (BN.buildInner2 && BN.buildInner2(B)) || buildInner(B);
  B.parts = parts;
  return parts;
}
function stepList(B) {
  const parts = ensureParts(B), os = B.inner.os, txt = STEPTXT[os] || STEPTXT[os.replace(/_.*/, '')] || {};
  const rank = k => { const base = k.replace(/_\d+$/, ''); const i = ORDER.indexOf(base); return i < 0 ? 50 : i; };
  const list = parts.filter(p => p.key !== 'receiver' && !(p.key === 'mag' && B.rig.mag && B.rig.mag.parent !== B.root)).sort((a, b) => rank(a.key) - rank(b.key));
  const steps = [];
  for (const p of list) {
    if (rank(p.key) > ORDER.indexOf('INNER') && !steps.innerDone) { steps.innerDone = true; for (const ip of B.inner.parts) steps.push({ inner: true, key: 'i:' + ip.key, name: ip.name, part: ip, txt: ip.strip || txt['i:' + ip.key] || `Remove the ${ip.name.toLowerCase()}` }); }
    steps.push({ key: p.key, name: p.name, part: p, txt: txt[p.key.replace(/_\d+$/, '')] || `Remove the ${p.name.toLowerCase()}` });
  }
  if (!steps.innerDone) for (const ip of B.inner.parts) steps.push({ inner: true, key: 'i:' + ip.key, name: ip.name, part: ip, txt: ip.strip || txt['i:' + ip.key] || `Remove the ${ip.name.toLowerCase()}` });
  return steps;
}
// lay a removed part out on the bench / ground in front of the gun
function layoutTarget(B, i, n, part) {
  const box = new THREE.Box3().setFromObject(part.obj), c = box.getCenter(V3()), sz = box.getSize(V3());
  const W = Math.max(.6, B.size.x * 1.3), x = -W / 2 + (n > 1 ? i * W / (n - 1) : W / 2), row = i % 2;
  const tgt = V3(x, B.ty + sz.y / 2 + .004, Math.max(.16, B.size.x * .28) + row * Math.max(.07, B.size.x * .1));
  return tgt.sub(c); // world-space offset
}
function moveTo(obj, worldOffset, dur, done) { // animate a part by a world-space offset (converted to its parent's space)
  const par = obj.parent; par.updateMatrixWorld(true);
  const wp0 = obj.getWorldPosition(V3()), tgtW = wp0.clone().add(worldOffset), tgtL = par.worldToLocal(tgtW.clone());
  BN.api.tween(obj, tgtL, obj.quaternion.clone(), dur, done);
}
function doStep(B, idx, back) {
  const S = BN.strip, st = S.steps[idx]; if (!st) return;
  const p = st.part, obj = p.obj;
  if (st.inner) { B.inner.group.visible = true; }
  if (!back) { const off = layoutTarget(B, idx, S.steps.length, p); moveTo(obj, off, .5, () => snd('magout')); st.done = true; st.off = off; }
  else { BN.api.tween(obj, p.home.clone(), p.homeQ ? p.homeQ.clone() : obj.quaternion.clone(), .45, () => snd('magin')); st.done = false; }
}
function highlight(B) {
  const S = BN.strip; if (!S) return;
  const nxt = S.steps.find(s => !s.done);
  for (const s of S.steps) s.part.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material.emissive.setRGB(0, 0, 0); } });
  if (nxt) nxt.part.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(.25, .17, .04); });
}
function setXray(B, on) {
  ensureParts(B); BN.xray = on;
  const shellSecs = ['receiver', 'stock', 'handguard', 'grip', 'barrel', 'extras', 'sights', 'action', 'attach', 'muzzle', 'trigger'];
  for (const p of B.parts) {
    const shell = shellSecs.includes(p.sec) || ['slide', 'cover', 'brk', 'recoilG', 'bolt', 'cyl', 'drum'].includes(p.key);
    p.obj.traverse(o => { if (o.isMesh && o.material && !o.userData.proxy && !o.userData.inner) { o.material.transparent = on && shell; o.material.opacity = on && shell ? .16 : 1; o.material.depthWrite = !(on && shell); o.material.needsUpdate = true; } });
  }
  B.inner.group.visible = on || !!(BN.strip && BN.strip.steps.some(s => s.inner && s.done)) || BN.tab === 'works';
}
function applyDirt(B) {
  ensureParts(B);
  const f = G.Fouling.get(B.wp.id);
  for (const p of B.parts) p.obj.traverse(o => { const mt = o.material; if (o.isMesh && mt && mt.userData.base && mt.userData.base.c) { mt.color.copy(mt.userData.base.c).lerp(new THREE.Color('#1a1712'), f * (['bolt', 'slide', 'barrel', 'receiver', 'brk', 'recoilG', 'charge'].includes(p.key.replace(/_\d+$/, '')) ? .55 : .25)); mt.roughness = Math.min(1, (mt.userData.base.r || .5) + f * .3); } });
}

// ------------------------------------------------------------------ slow-motion cycle
function cycleState(B, t) { // t 0..1 through one firing cycle
  const f = t < .08 ? 1 - t / .08 : 0;
  const o = t < .1 ? 0 : t < .5 ? (t - .1) / .4 : t < .9 ? 1 - (t - .5) / .4 : 0;
  return { t, f: t < .08 ? 1 : 0, o: Math.sin(Math.min(1, o) * PI / 2), rec: t < .1 ? t / .1 : t < .7 ? 1 - (t - .1) / .6 : 0, cock: t > .2, load: t < .1 || t > .7 ? 1 : 0, fire: f };
}
const PHASES = [[0, 'Fire: the firing pin strikes the primer'], [.08, 'Bullet leaves the barrel; pressure peaks'], [.14, 'Unlock: the action begins to open'], [.3, 'Extraction: the case is pulled from the chamber'], [.45, 'Ejection; the hammer is cocked; the spring is compressed'], [.62, 'Return: the spring drives the action forward'], [.75, 'Feed: a fresh round is stripped from the magazine'], [.88, 'Chamber and lock; ready to fire again']];
const PHASES_ML = [[0, 'Trigger releases the sear'], [.1, 'The cock falls; sparks fly into the pan'], [.25, 'The priming flashes through the touch-hole'], [.4, 'The main charge burns'], [.55, 'The ball leaves the muzzle in a cloud of smoke'], [.8, 'Swab, reload, prime — about 20 seconds']];
function animCycle(B, dt) {
  const C = BN.cyc; if (!C) return;
  C.t += dt / C.dur; const t = Math.min(1, C.t);
  const s = cycleState(B, t);
  if (B.inner) for (const p of B.inner.parts) if (p.motion) p.motion(s, p.obj);
  const ml = /^lock_|cannon|mortar|chamber/.test(B.inner ? B.inner.os : '');
  if (!ml && B.kind === 'std') { if (B.rig.slide || B.rig.bolt) BN.api.setAction(s.o); }
  if (B.rig.recoilG && /artillery|autocannon/.test(B.inner.os)) B.rig.recoilG.position.z = s.rec * (B.rig.recoilDist || .3);
  if (!C.fired && t > .02) { C.fired = true; BN.api.shoot(); }
  if (!C.ej && t > .4 && !ml && !B.wp.caseless) { C.ej = true; BN.api.eject(false); }
  const ph = ml ? PHASES_ML : PHASES; let cap = ph[0][1]; for (const [k, txt] of ph) if (t >= k) cap = txt;
  if (cap !== C.cap) { C.cap = cap; const el = document.querySelector('#bc-cap'); if (el) el.textContent = cap; }
  if (t >= 1) { BN.cyc = null; if (B.kind === 'std') BN.api.setAction(0); if (B.inner) for (const p of B.inner.parts) if (p.motion) p.motion(cycleState(B, 0), p.obj); }
}
BN.tickHook = (dt, B) => {
  if (BN.cyc) animCycle(B, dt);
  else if (B.inner && B.inner.group.visible && !BN.strip) { const s = cycleState(B, 0); s.o = B.open || 0; s.load = B.chamber === 1 || B.rounds > 0 ? 1 : 0; s.cock = B.cocked || B.open > .3; for (const p of B.inner.parts) if (p.motion) p.motion(s, p.obj); }
  const K = BN.kinds[B.kind]; if (K && K.tick && !(BN.strip && BN.strip.steps.some(st => st.done))) K.tick(dt, B);
  if (BN.clean) cleanTick(B, dt);
};

// ------------------------------------------------------------------ cleaning
function bore(B) { // bore line in world space: breech → muzzle
  const r = B.rig, by = r.muzzleY || 0;
  const breech = B.root.localToWorld(V3(0, B.kind === 'cannon' || B.kind === 'mortar' ? 0 : by * .2, B.kind === 'std' || B.kind === 'falling' ? (r.zr || 0) - .02 : B.kind === 'break' ? -.05 : 0));
  const muzzle = B.root.localToWorld(V3(0, by, r.muzzleZ));
  return { breech, muzzle };
}
function borePath(B) { // can the bore be reached? (from the breech, or from the muzzle on muzzle-loaders)
  if (['musket', 'cannon', 'mortar'].includes(B.kind)) return 'muzzle';
  if (B.kind === 'break') return B.btgt ? 'breech' : null;
  if (B.kind === 'falling') return B.ftg ? 'breech' : null;
  if (B.kind === 'breech') return B.bk && B.bk.open ? 'breech' : null;
  if (B.kind === 'std' && (B.rev || B.kind === 'caprev')) return B.cylOpen ? 'breech' : 'muzzle';
  if (BN.strip && BN.strip.steps.some(s => s.done && /bolt|slide|charge|brk|cyl/.test(s.key))) return 'breech';
  return B.open > .9 || B.locked ? 'breech' : 'muzzle'; // you can always rod from the muzzle — carefully
}
function makeRodTool(B, kind) {
  const L = Math.max(.25, Math.abs(B.rig.muzzleZ) * 1.15), r = Math.max(.002, ((G.CAL[B.wp.cal] || { cs: [0, .004] }).cs[1]) * .3);
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(gCyl(Math.min(.004, r), Math.min(.004, r), L, 8), BN.api.pmat('#b8b2a4', .3, .9)); shaft.position.z = L / 2; g.add(shaft);
  const handle = new THREE.Mesh(gCyl(.008, .008, .06, 10), BN.api.pmat('#5a3a20', .7)); handle.position.z = L + .03; g.add(handle);
  const head = kind === 'brush' ? new THREE.Mesh(gCyl(r * 3.4, r * 3.4, .03, 10), BN.api.pmat('#b07a3a', .8, .3)) : new THREE.Mesh(gBox(r * 5, r * 5, .004), BN.api.pmat('#f2efe6', 1));
  g.add(head); g.userData.head = head; g.userData.L = L;
  BN.g.add(g); return g;
}
function cleanStart(B, kind) {
  const C = BN.clean = { kind, strokes: 0, prog: 0, dir: 1, B };
  if (kind === 'brush' || kind === 'patch') {
    const path = borePath(B); if (!path) { BN.clean = null; BN.api.say('You can’t reach the bore: open the action, remove the bolt or break the gun open first.'); return; }
    C.path = path; C.tool = makeRodTool(B, kind); C.head = C.tool.userData.head;
    if (kind === 'patch') C.head.material.color.set('#f2efe6');
    BN.api.say(path === 'muzzle' && B.kind === 'std' ? 'Cleaning from the muzzle (use a guide and don’t scrape the crown). Drag the rod in and out along the barrel.' : 'Drag the rod in and out through the bore.');
  } else if (kind === 'scrub') { const tgt = (B.parts || []).find(p => /bolt|slide|brk|breech|recoilG/.test(p.key)); C.target = tgt; C.tool = new THREE.Mesh(gRBox(.02, .02, .07, .005), BN.api.pmat('#2a6aa8', .7)); BN.g.add(C.tool); BN.api.say('Drag the brush back and forth over the action.'); }
  else if (kind === 'oil') { C.tool = new THREE.Mesh(gCyl(.015, .008, .08, 10), BN.api.pmat('#c99a28', .4, .3)); BN.g.add(C.tool); BN.api.say('Click the moving parts to oil them.'); }
  else if (kind === 'wipe') { C.tool = new THREE.Mesh(gBox(.06, .004, .05), BN.api.pmat('#e8d8b0', 1)); BN.g.add(C.tool); BN.api.say('Drag the rag over the gun.'); }
}
function cleanStop() { const C = BN.clean; if (C && C.tool) BN.g.remove(C.tool); BN.clean = null; }
function cleanTick(B, dt) {
  const C = BN.clean; if (!C || !C.tool) return;
  if (C.kind === 'brush' || C.kind === 'patch') {
    const { breech, muzzle } = bore(B), from = C.path === 'muzzle' ? muzzle : breech, to = C.path === 'muzzle' ? breech : muzzle, dir = to.clone().sub(from).normalize();
    const len = from.distanceTo(to), tip = from.clone().addScaledVector(dir, (C.prog * 1.05 - .05) * len);
    C.tool.position.copy(tip); C.tool.lookAt(tip.clone().sub(dir)); // rod trails back out of the bore
  } else if (C.mouse) C.tool.position.copy(C.mouse);
}
BN.downHook = (e, h, B) => {
  // strip mode: clicking the highlighted part removes it
  if (BN.tab === 'strip' && BN.strip && h && h.mesh) {
    const S = BN.strip, idx = S.steps.findIndex(s => !s.done);
    if (idx >= 0) { let o = h.mesh, hit = false; while (o) { if (o === S.steps[idx].part.obj) { hit = true; break; } o = o.parent; } if (hit) { doStep(B, idx); highlight(B); BN.api.panel(); return true; } }
    return !!h.part;
  }
  if (BN.clean) { BN.clean.drag = { x: e.clientX, y: e.clientY, p0: BN.clean.prog }; if (BN.clean.kind === 'oil' && h && h.mesh) { oilAt(B, h); } return true; }
  return false;
};
function screenAxis(B) { const { breech, muzzle } = bore(B), C = BN.clean; const a = C.path === 'muzzle' ? muzzle : breech, b = C.path === 'muzzle' ? breech : muzzle; const pa = a.clone().project(BN.api.SR.cam), pb = b.clone().project(BN.api.SR.cam); const r = G.E.renderer.domElement.getBoundingClientRect(); return new THREE.Vector2((pb.x - pa.x) * r.width / 2, -(pb.y - pa.y) * r.height / 2); }
BN.moveHook = (e, B) => {
  const C = BN.clean; if (!C) return false;
  const r = G.E.renderer.domElement.getBoundingClientRect();
  // tools follow the mouse on the bench plane
  const ndc = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(ndc, BN.api.SR.cam);
  const hits = ray.intersectObject(B.root, true); C.mouse = hits.length ? hits[0].point.clone().add(V3(0, .01, 0)) : C.mouse;
  if (!C.drag) return C.kind !== 'brush' && C.kind !== 'patch' ? false : true;
  if (C.kind === 'brush' || C.kind === 'patch') {
    const ax = screenAxis(B), f = ((e.clientX - C.drag.x) * ax.x + (e.clientY - C.drag.y) * ax.y) / Math.max(1, ax.lengthSq());
    const np = clamp(C.drag.p0 + f, 0, 1);
    if ((C.dir > 0 && np > .97) || (C.dir < 0 && np < .03)) { C.dir *= -1; C.strokes++; strokeDone(B, C); }
    C.prog = np;
  } else if (C.kind === 'scrub' || C.kind === 'wipe') {
    C.dist = (C.dist || 0) + Math.hypot(e.movementX || 0, e.movementY || 0);
    if (C.dist > 220) { C.dist = 0; const f0 = G.Fouling.get(B.wp.id); G.Fouling.set(B.wp.id, f0 - (C.kind === 'scrub' ? .06 : .03)); B.lube = Math.max(0, (B.lube ?? .5) - (C.kind === 'wipe' ? .02 : 0)); snd('belt'); applyDirt(B); BN.api.panel(); }
  }
  return true;
};
BN.upHook = (e, B) => { if (BN.clean) { BN.clean.drag = null; return true; } return false; };
function strokeDone(B, C) {
  const f0 = G.Fouling.get(B.wp.id);
  if (C.kind === 'brush') { G.Fouling.set(B.wp.id, f0 - .1); snd('slide'); BN.api.say(`Brush stroke ${C.strokes}: fouling loosened.`); }
  else { G.Fouling.set(B.wp.id, f0 - .06); C.head.material.color.set('#f2efe6').lerp(new THREE.Color('#1a1712'), Math.min(1, f0 * 1.4)); snd('cover'); BN.api.say(f0 > .3 ? `Patch ${C.strokes} came out black — keep going.` : f0 > .08 ? `Patch ${C.strokes} came out grey.` : `Patch ${C.strokes} came out clean.`); }
  applyDirt(B); BN.api.panel();
}
function oilAt(B, h) { B.lube = Math.min(1, (B.lube ?? .3) + .2); snd('belt'); if (BN.clean.tool) BN.clean.tool.position.copy(h.point.clone().add(V3(0, .04, 0))); h.mesh.traverse && h.mesh.material && h.mesh.material.userData.base && (h.mesh.material.roughness = .15); BN.api.say('A drop of oil.'); BN.api.panel(); }
BN.extraPick = () => [];

// ------------------------------------------------------------------ tabs
BN.tabsHTML = () => `<div class="eras" style="padding:10px 14px;border-bottom:1px solid var(--line)">${[['operate', 'Operate'], ['strip', 'Take apart'], ['clean', 'Clean'], ['works', 'How it works']].map(([k, n]) => `<button class="chip ${BN.tab === k ? 'on' : ''}" data-btab="${k}">${n}</button>`).join('')}</div>`;
BN.tabsBind = (el, B) => el.querySelectorAll('[data-btab]').forEach(b => b.onclick = () => {
  const k = b.dataset.btab; if (k === BN.tab) return;
  G.Audio.ui(); cleanStop(); BN.cyc = null;
  if (BN.tab === 'works' || k !== 'works') { if (BN.xray && k !== 'works' && k !== 'strip') setXray(B, false); }
  BN.tab = k;
  if (k === 'strip') { ensureParts(B); if (!BN.strip) BN.strip = { steps: stepList(B) }; highlight(B); }
  else if (BN.strip) { for (const s of BN.strip.steps) s.part.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(0, 0, 0); }); }
  if (k === 'works') { ensureParts(B); B.inner.group.visible = true; }
  else if (B.inner && !(BN.strip && BN.strip.steps.some(s => s.inner && s.done)) && !BN.xray) B.inner.group.visible = false;
  if (k === 'clean') applyDirt(B);
  BN.api.panel();
});
BN.panelHook = (el, B) => {
  const wp = B.wp;
  if (BN.tab === 'strip') {
    const S = BN.strip || (BN.strip = { steps: stepList(B) }), nxt = S.steps.findIndex(s => !s.done), done = S.steps.filter(s => s.done).length;
    el.innerHTML = BN.tabsHTML() + `<div class="wsok" style="border-color:var(--brass);color:var(--brass2)"><b>${nxt < 0 ? 'Fully stripped.' : 'Next:'}</b> ${nxt < 0 ? 'Every assembly is on the bench. Reassemble in reverse order.' : esc(S.steps[nxt].txt) + ' — click the glowing part, or the button.'}</div>
      <div class="wsbtns"><button class="btn small primary" id="st-next" ${nxt < 0 ? 'disabled' : ''}>Next step</button><button class="btn small" id="st-back" ${done ? '' : 'disabled'}>Put one back</button><button class="btn small" id="st-all">${done === S.steps.length ? 'Reassemble all' : 'Exploded view'}</button><button class="btn small ${BN.xray ? 'primary' : ''}" id="st-x">X-ray</button></div>
      <div class="lbl" style="padding:8px 16px 0">${esc(OS[B.inner.os].n)} · ${S.steps.length} steps</div>
      <ol style="margin:4px 0 16px;padding:0 16px 0 36px;font-size:13px;line-height:1.6">${S.steps.map((s, i) => `<li style="opacity:${s.done ? .45 : 1};${i === nxt ? 'color:var(--brass2);font-weight:600' : ''}">${s.done ? '✓ ' : ''}<b>${esc(s.name)}</b> — ${esc(s.txt)}${s.inner ? ' <em style="font-style:normal;color:var(--dim)">(internal)</em>' : ''}</li>`).join('')}</ol>`;
    const q = s => el.querySelector(s); BN.tabsBind(el, B);
    q('#st-next').onclick = () => { if (nxt >= 0) { doStep(B, nxt); highlight(B); BN.api.panel(); } };
    q('#st-back').onclick = () => { let i = -1; S.steps.forEach((s, k) => { if (s.done) i = k; }); if (i >= 0) { doStep(B, i, true); highlight(B); BN.api.panel(); } };
    q('#st-all').onclick = () => { const all = done === S.steps.length; S.steps.forEach((s, i) => { if (all && s.done) doStep(B, i, true); else if (!all && !s.done) doStep(B, i); }); highlight(B); BN.api.panel(); };
    q('#st-x').onclick = () => { setXray(B, !BN.xray); BN.api.panel(); };
    return;
  }
  if (BN.tab === 'works') {
    ensureParts(B); const os = B.inner.os, d = OS[os];
    el.innerHTML = BN.tabsHTML() + `<div style="padding:12px 16px"><div class="eyebrow">Operating system</div><h3 style="margin:4px 0 8px;font-size:20px">${esc(d.n)}</h3><p style="font-size:14px;line-height:1.55;color:var(--muted);margin:0">${esc(d.d)}</p></div>
      <div class="wsbtns"><button class="btn small primary" id="wk-play">Slow-motion cycle</button><button class="btn small" id="wk-fast">Real speed</button><button class="btn small ${BN.xray ? 'primary' : ''}" id="wk-x">X-ray</button></div>
      <div class="wsok" id="bc-cap" style="border-color:var(--line2);color:var(--fg)">Press “Slow-motion cycle”.</div>
      <div class="lbl" style="padding:8px 16px 0">Parts inside this ${esc(G.CLASS_NAMES[wp.c] || 'gun').toLowerCase()}</div>
      <ul style="margin:4px 0 16px;padding:0 16px 0 32px;font-size:13px;line-height:1.6;color:var(--muted)">${B.inner.parts.map(p => `<li>${esc(p.name)}</li>`).join('')}</ul>`;
    const q = s => el.querySelector(s); BN.tabsBind(el, B);
    q('#wk-play').onclick = () => { if (!BN.xray) setXray(B, true); BN.cyc = { t: 0, dur: /^lock_|cannon|mortar/.test(os) ? 6 : 5 }; BN.api.panel(); };
    q('#wk-fast').onclick = () => { BN.cyc = { t: 0, dur: Math.max(.25, 60 / Math.max(10, wp.rpm || 60)) }; };
    q('#wk-x').onclick = () => { setXray(B, !BN.xray); BN.api.panel(); };
    return;
  }
  if (BN.tab === 'clean') {
    const f = G.Fouling.get(wp.id), lube = B.lube ?? Math.max(.1, .8 - f), path = borePath(B);
    const bar = (n, v, bad) => `<div class="bar">${n}<i class="${bad ? 'down' : 'up'}" style="--v:${Math.max(2, v * 100).toFixed(0)}%"></i><s>${Math.round(v * 100)}%</s></div>`;
    el.innerHTML = BN.tabsHTML() + `<div class="wsok" style="border-color:var(--brass);color:var(--brass2)">${f > .5 ? '<b>Filthy.</b> Expect misfires, stoppages and wider groups in the field.' : f > .2 ? '<b>Dirty.</b> Give it a clean before the next mission.' : '<b>Clean.</b>'} ${BN.clean ? '— ' + ({ brush: 'drag the bore brush in and out', patch: 'drag the patch through until it comes out clean', scrub: 'scrub the action', oil: 'click parts to oil them', wipe: 'wipe the gun down' })[BN.clean.kind] : ''}</div>
      <div class="bars" style="padding:8px 16px">${bar('Fouling', f, true)}${bar('Lubrication', lube, false)}</div>
      <div class="wsbtns"><button class="btn small ${BN.clean && BN.clean.kind === 'brush' ? 'primary' : ''}" data-cl="brush" ${path ? '' : 'disabled'}>Bore brush</button><button class="btn small ${BN.clean && BN.clean.kind === 'patch' ? 'primary' : ''}" data-cl="patch" ${path ? '' : 'disabled'}>Patches</button><button class="btn small ${BN.clean && BN.clean.kind === 'scrub' ? 'primary' : ''}" data-cl="scrub">Scrub the action</button><button class="btn small ${BN.clean && BN.clean.kind === 'oil' ? 'primary' : ''}" data-cl="oil">Oil</button><button class="btn small ${BN.clean && BN.clean.kind === 'wipe' ? 'primary' : ''}" data-cl="wipe">Wipe down</button>${BN.clean ? '<button class="btn small" data-cl="stop">Put the tool down</button>' : ''}</div>
      <p class="muted" style="padding:0 16px;font-size:13px;line-height:1.5">${path ? `The bore can be reached from the ${path}.` : 'Open the action, remove the bolt or slide (Take apart), or break the gun open to reach the bore.'} Every shot you fire — here or in the field — fouls the gun${/^lock_|cannon/.test((B.inner || { os: '' }).os || G.opSystem(wp, B.rig)) ? '; black powder fouls it fast, and a fouled touch-hole misfires' : ''}.</p>`;
    BN.tabsBind(el, B);
    el.querySelectorAll('[data-cl]').forEach(b => b.onclick = () => { const k = b.dataset.cl; cleanStop(); if (k !== 'stop') cleanStart(B, k); BN.api.panel(); });
    return;
  }
};
// tidy when another gun is picked or the bench closes
const show0 = UI.show;
UI.show = function (name) { if (name !== 'bench') { cleanStop(); BN.strip = null; BN.cyc = null; BN.tab = 'operate'; } return show0.call(UI, name); };
BN.G = { ensureParts, stepList, doStep, setXray, cleanStart, cleanStop, applyDirt, buildInner, strokeDone };
})();
