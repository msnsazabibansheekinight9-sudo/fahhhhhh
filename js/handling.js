// ============================================================================
// IRONSIGHT — physical handling model. Every gun (with its attachments) is
// treated as a rigid body laid out along the bore: stock, receiver, barrel,
// magazine and each accessory have a mass and a position. From that come
//   overall length, balance point, mass moment of inertia about the grip,
//   free-recoil momentum, velocity and energy (bullet + powder gas),
//   muzzle rise (bore height over the shoulder/grip), ADS time, aim sway,
//   swing inertia (how much the gun lags when you turn), recoil recovery,
//   typical trigger pull, lock time, cycle time and bolt speed.
// The game uses ADS time, sway, swing inertia and recovery; the armory and
// the handling bench show the full sheet.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SHOULDERED = ['AR', 'BR', 'RIF', 'CAR', 'DMR', 'SR', 'LMG', 'SG', 'SMG', 'MUS'];
// typical trigger pull (kg) by action family
function triggerKg(wp, os) {
  if (wp.m && wp.m.t === 'rev' || os === 'revolver') return wp.modes.includes('semi') && wp.act === 'rev' ? 5.4 : 5.4;
  if (/^lock_/.test(os)) return 3.6;
  if (os === 'caprev') return 1.6;
  if (os === 'break') return 1.9;
  if (wp.c === 'SR') return wp.act === 'bolt' ? 1.4 : 1.8;
  if (wp.c === 'DMR') return 2.0;
  if (wp.act === 'auto_ob') return 4.0;
  if (wp.c === 'PST') return /glock|p320|m17|p10|vp9|fn509|p365|xd|mp_sw|hellcat|shield|max9/.test(wp.id) ? 2.5 : 2.3;
  if (wp.act === 'bolt') return 2.7;
  if (wp.act === 'pump' || wp.c === 'SG') return 2.6;
  return 2.9;
}
// lock time: trigger break to primer strike (ms)
function lockMs(wp, os) {
  if (wp.lock) return wp.lock * 1000;
  if (wp.act === 'auto_ob') return 16;
  if (os === 'revolver' || os === 'caprev') return 6.5;
  if (os === 'bolt' || os === 'bolt_straight') return wp.c === 'SR' ? 2.6 : 4.5;
  if (os === 'break' || os === 'falling') return 3.5;
  if (wp.c === 'PST') return 4;
  return 5.2;
}
G.handling = function (wp, L, S) {
  const m = wp.m || {}, H = {};
  if (wp.emplaced || wp.heavy && (wp.wt || 0) > 40) { H.emplaced = true; return H; }
  const M = Math.max(.2, S.wt || wp.wt || 3);
  const pistol = wp.c === 'PST', bullpup = m.t === 'bullpup';
  const RL = (m.R && m.R[0]) || (pistol ? .18 : .25);
  const Lb = (m.B ? m.B[0] : pistol ? .11 : .4) * (S.blen || 1);
  const stockGone = L && (L.stock === 'stk_none');
  const stockLen = pistol || bullpup || stockGone ? 0 : wp.c === 'SMG' ? .26 : wp.c === 'MUS' ? .36 : .32;
  const sup = S.sup && !wp.intSup ? .16 : 0, brake = L && /brake|comp|maxim|cutts/.test(L.muzzle || '') ? .05 : 0;
  const oal = stockLen + (bullpup ? RL * .85 : RL) + Lb + sup + brake;
  // masses and positions measured from the butt (or the back of the grip on handguns)
  const A = G.ATT, at = s => A[(L || {})[s]] || null, aw = s => { const a = at(s); return a && a.wt ? Math.max(0, a.wt) : 0; };
  const accW = ['optic', 'muzzle', 'under', 'side', 'mag', 'stock', 'aux', 'sling'].reduce((t, s) => t + aw(s), 0);
  const M0 = Math.max(.15, M - accW);
  const parts = [];
  const add = (n, kg, x) => { if (kg > 0) parts.push([n, kg, x]); };
  const recX = stockLen + (bullpup ? RL * .45 : RL / 2), brlX = stockLen + (bullpup ? RL * .85 : RL) + Lb / 2;
  if (pistol) { add('frame & slide', M0 * .78, RL * .45); add('barrel', M0 * .22, RL * .55); }
  else if (bullpup) { add('receiver & action', M0 * .62, recX); add('barrel & handguard', M0 * .32, brlX); add('butt pad', M0 * .06, .03); }
  else { add('stock', M0 * (stockLen ? .16 : 0), stockLen / 2); add('receiver & action', M0 * .46, recX); add('barrel & handguard', M0 * (stockLen ? .38 : .54), brlX); }
  add('optic', aw('optic'), recX + RL * .1); add('muzzle device', aw('muzzle'), oal - (sup || brake) / 2); add('under-barrel', aw('under'), brlX + Lb * .15);
  add('side rail kit', aw('side'), brlX + Lb * .25); add('magazine', aw('mag'), bullpup ? stockLen + RL * .25 : recX); add('stock kit', aw('stock'), stockLen / 2);
  // loaded magazine
  const rnd = ((G.MASS || {})[wp.cal] || 10) / 1000 * 1.9, ammo = clamp(S.mag || wp.mag || 0, 0, 200) * rnd;
  add('ammunition', ammo, bullpup ? stockLen + RL * .25 : pistol ? RL * .3 : recX);
  const Mt = parts.reduce((t, p) => t + p[1], 0);
  const xb = parts.reduce((t, p) => t + p[1] * p[2], 0) / Mt;
  const gripX = pistol ? RL * .25 : bullpup ? stockLen + RL * .55 : stockLen + .05;
  // moment of inertia about the grip, each part as a rod segment of length ~ its span
  let I = 0; for (const [, kg, x] of parts) I += kg * (x - gripX) * (x - gripX);
  I += Mt * oal * oal / 60;
  // free recoil: bullet + powder gas at ~1.6× muzzle velocity
  const c = G.CAL[wp.cal] || { cs: [.045, .0057] }, v = S.v || wp.v || 800;
  // shotshells: the whole shot charge (and wad) counts, by gauge
  const SHOT = { '4 bore': .1, '8 gauge': .057, '10 gauge': .043, '12 gauge': .032, '12 gauge FRAG': .032, '16 gauge': .028, '20 gauge': .025, '.410 bore': .014 };
  const mb = c.shell ? (SHOT[wp.cal] || .032) : ((G.MASS || {})[wp.cal] || 9) / 1000;
  const mc = c.shell ? .0022 * (SHOT[wp.cal] || .032) / .032 : Math.PI * c.cs[1] * c.cs[1] * c.cs[0] * 400;
  let p = mb * v + mc * (c.shell ? 1.5 : 1.6) * v; // N·s
  if (brake) p *= .7; if (sup) p *= .88;
  if (wp.backblast) p *= .02; // recoilless: the venturi throws gas backwards to cancel almost all of it
  if (wp.gyro) p *= .1;       // rockets: most of the push comes after the round leaves
  const vr = p / Mt, E = .5 * Mt * vr * vr;
  // bore height above the shoulder/web of the hand → muzzle rise torque
  const boreH = pistol ? .032 : bullpup ? .035 : m.t === 'ar' || m.t === 'scar' ? .025 : (m.stk === 'wood' || ['RIF', 'MUS', 'SG'].includes(wp.c)) ? .05 : .035;
  const rise = p * boreH / Math.max(.004, I + .02);
  // aim and handling figures
  const front = (xb - gripX) / Math.max(.2, oal);
  H.oal = oal; H.mass = Mt; H.balance = xb - gripX; H.I = I; H.p = p; H.vr = vr; H.E = E; H.rise = rise; H.boreH = boreH; H.front = front; H.parts = parts;
  H.ads = clamp(.1 + .028 * Mt + .45 * I + (pistol ? 0 : .08 * Math.max(0, oal - .7)), .1, 1.4);
  H.sway = clamp(.7 + front * 1.2 + I * .35, .55, 2.2);
  H.inertia = clamp(.65 + I * 2.2 + Mt * .03, .6, 2.6);
  H.recover = clamp(.12 + E * .006 + rise * .04 - Mt * .01, .08, .9);
  const os = G.opSystem ? G.opSystem(wp, null) : '';
  H.trigger = triggerKg(wp, os); H.lock = lockMs(wp, os);
  H.cycle = wp.rpm ? 60000 / wp.rpm : 0;
  const stroke = (m.R ? m.R[0] : .2) * (pistol ? .22 : .35);
  H.boltV = H.cycle && !['bolt', 'pump', 'lever', 'rev'].includes(wp.act) ? stroke * 2 / (H.cycle / 1000) : 0;
  H.shouldered = SHOULDERED.includes(wp.c) && !stockGone;
  return H;
};
// fold the model into the resolved stats
const rs0 = G.resolveStats;
G.resolveStats = function (wp, L, st) {
  const S = rs0(wp, L, st);
  try {
    const H = G.handling(wp, L || {}, S); S.hand = H;
    if (!H.emplaced) {
      S.ads = S.ads * .45 + H.ads * .55;
      S.sway = (S.sway || 1) * H.sway;
      S.inertia = H.inertia; S.recover = H.recover;
    }
  } catch (e) { /* keep the base stats */ }
  return S;
};
// the handling sheet, as rows for the armory and the bench
G.handlingRows = function (S) {
  const H = S && S.hand; if (!H || H.emplaced) return [];
  const cm = x => `${(x * 100).toFixed(1)} cm`;
  return [
    ['Overall length', cm(H.oal)],
    ['Loaded weight', `${H.mass.toFixed(2)} kg`],
    ['Balance point', H.balance >= 0 ? `${cm(H.balance)} ahead of the grip` : `${cm(-H.balance)} behind the grip`],
    ['Swing inertia', `${H.I.toFixed(3)} kg·m² (${H.I < .06 ? 'very quick' : H.I < .3 ? 'quick' : H.I < .7 ? 'steady' : H.I < 1.6 ? 'slow' : 'very slow'})`],
    ['ADS time', `${Math.round(S.ads * 1000)} ms`],
    ['Free recoil', `${H.E.toFixed(1)} J · ${H.vr.toFixed(2)} m/s · ${H.p.toFixed(2)} N·s`],
    ['Muzzle rise', `${H.rise.toFixed(1)} (bore ${Math.round(H.boreH * 1000)} mm over the ${H.shouldered ? 'shoulder' : 'hand'})`],
    ['Recoil recovery', `${Math.round(H.recover * 1000)} ms`],
    ['Trigger pull', `${H.trigger.toFixed(1)} kg (typical)`],
    ['Lock time', `${H.lock < 50 ? H.lock.toFixed(1) : Math.round(H.lock)} ms`],
    ...(H.cycle ? [['Cycle time', `${H.cycle.toFixed(H.cycle < 100 ? 1 : 0)} ms per shot`]] : []),
    ...(H.boltV ? [['Bolt speed (avg)', `${H.boltV.toFixed(1)} m/s`]] : []),
  ];
};
})();
