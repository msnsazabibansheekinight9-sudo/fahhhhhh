// ============================================================================
// Kit perks: what each piece of personal equipment actually does in the field,
// derived from what the real item is.
//   uniform  camouflage that matches (or clashes with) the map and time of day
//   helmet   ballistic rating, cut (headset fit), NVG shroud / rails
//   face     eye protection vs flashbangs, gas masks vs fire and smoke, face armour
//   nvg      tube quality
//   comms    active hearing: directional cues for nearby footsteps, flashbang deafening cut
//   armour   pouches: spare magazines, faster reloads from chest rigs; weight
//   gloves   grip (recoil, reload) or clumsy mittens; flame resistance
//   boots    footstep noise and pace
//   pack     spare magazines and explosives, radio intercepts, water (breath)
// G.kitMods(kit, env) folds the whole loadout into multipliers the game uses.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const has = (g, ...w) => w.some(x => (g.id + ' ' + g.n).toLowerCase().includes(x));

// camouflage family of a uniform
G.camoEnv = function (g) {
  if (!g) return 'wood';
  if (has(g, 'snow', 'alpine', 'arctic', 'overwhite')) return 'snow';
  if (has(g, 'crew')) return 'bright';
  if (has(g, 'civ', 'suit', 'hoodie', 'jeans', 'track')) return 'civ';
  if (has(g, 'black', 'kryptek', 'blackline', 'psy_black')) return 'dark';
  if (has(g, 'ucp', 'urban', 'acu', 'grey', 'gray')) return 'urban';
  if (has(g, 'desert', 'arid', 'tropen', 'dcu', 'marpat_d', 'ddpm', 'chocolate', '3-colour', 'amcu', 'rust')) return 'desert';
  if (has(g, 'multicam', 'ocp', 'mtp', 'scorpion', 'a-tacs', 'atacs', 'mm14')) return 'multi';
  return 'wood';
};
// what the map looks like to a camouflage pattern
G.mapEnv = function () {
  const M = G.E.map || {}, Ms = G.Game && G.Game.mission && G.Game.mission.M, st = Ms && Ms.out && Ms.out.style;
  if (M.weather === 'snow') return 'snow';
  if (st === 'desert' || M.ground === 'sand') return 'desert';
  if (['urban', 'airport', 'dock', 'rig'].includes(st) || ['asphalt', 'concrete', 'metal'].includes(M.ground)) return 'urban';
  return 'wood';
};
const CAMO = { // [wood, desert, urban, snow]
  wood: [.78, 1.1, .95, 1.2], desert: [1.08, .78, .95, 1.15], urban: [1, 1, .82, 1.05], multi: [.86, .86, .92, 1.1], dark: [1.05, 1.15, .9, 1.25],
  civ: [1.1, 1.1, .9, 1.2], snow: [1.2, 1.2, 1.1, .7], bright: [1.35, 1.35, 1.3, 1.3],
};
const ENVI = { wood: 0, desert: 1, urban: 2, snow: 3 };

// properties of one item: { perks: [[name, desc, good?]], mods: {...} }
G.gearProps = function (g) {
  const P = [], M = {};
  if (!g) return { perks: P, mods: M };
  const p = (n, d, good = true) => P.push([n, d, good]);
  switch (g.slot) {
    case 'uniform': {
      const e = G.camoEnv(g);
      p({ wood: 'Woodland camouflage', desert: 'Desert camouflage', urban: 'Urban camouflage', multi: 'Multi-environment camouflage', dark: 'Dark pattern', civ: 'Civilian clothes', snow: 'Snow camouflage', bright: 'High-visibility' }[e],
        { wood: 'Harder to spot on green and muddy maps.', desert: 'Blends in on sand and dust.', urban: 'Grey tones that work among buildings.', multi: 'Decent everywhere, best nowhere.', dark: 'Excellent at night, poor in daylight.', civ: 'Blends in among buildings.', snow: 'Nearly invisible in snow, glaring elsewhere.', bright: 'Easy to see from far away.' }[e], e !== 'bright');
      if (has(g, 'gorka', 'flight', 'klmk', 'amoeba')) { p('Loose oversuit', 'Breaks up your outline: slightly harder to spot.'); M.camo = .95; }
      if (has(g, 'nomex', 'flight')) { p('Flame resistant', 'Burns hurt less.'); M.burn = .75; }
      if (g.y < 1930) { p('Wool', 'Heavy wool: warm but slows you down a little.', false); }
      M.env = e;
      break; }
    case 'helmet': {
      if (g.rating > 0) p(`Ballistic shell (${g.rating >= 7 ? 'rifle' : g.rating >= 3.5 ? 'IIIA' : g.rating >= 2.5 ? 'II' : 'fragment'})`, g.rating >= 7 ? 'Stops some rifle rounds.' : g.rating >= 3.5 ? 'Stops pistol rounds and fragments.' : 'Stops fragments and spent rounds.');
      else p('No protection', 'Cloth only.', false);
      if (g.cut === 'high') { p('High cut', 'Leaves room for headsets: no hearing penalty.'); }
      if (g.cut === 'full' && g.rating > 0) { p('Full cut', 'More coverage, but muffles your hearing without a headset.', false); M.hearPen = 1; }
      if (has(g, 'fast', 'airframe', 'caiman', 'exfil', 'ech', 'rf1', 'bump', 'ihps', '6b47', 'viper', 'ach', 'mich')) p('NVG shroud & rails', 'Mounts for night vision and lights.');
      if (has(g, 'altyn', 'lshz', 'visor', 'aegis')) p('Visor', 'Armoured face shield.');
      if (g.wt >= 1.6) p('Heavy', 'Neck fatigue: more sway when aiming.', false), M.sway = 1.06;
      break; }
    case 'face': {
      if (has(g, 'goggles')) { p('Ballistic goggles', 'Flashbangs blind you for half as long.'); M.flash = .5; }
      else if (g.eyes) { p('Eye protection', 'Flashbangs blind you for less time.'); M.flash = .65; }
      if (has(g, 'gp5', 'm50', 'pmk', 's10', 'respirator', 'resp', 'gasmask')) { p('Respirator', 'Fire and smoke barely affect you; lenses cut flashes slightly.'); M.burn = Math.min(M.burn || 1, .5); M.flash = .8; M.sway = 1.04; }
      if (has(g, 'balaclava', 'shemagh', 'gaiter', 'skull')) { p('Face cover', 'Hides your face: a little harder to spot at night.'); M.nightCamo = .9; }
      if (has(g, 'kmask', 'mandible', 'visor')) p('Face armour', 'Ballistic protection for the face.');
      break; }
    case 'nvg': if (g.nv) { p(`Night vision (${g.nv.thermal ? 'fused thermal' : g.nv.white ? 'white phosphor' : 'green phosphor'})`, `Image quality ${Math.round(g.nv.q * 100)}%. Press J.`); if (g.nv.view === 'mono') p('Monocular', 'One eye stays adapted to the dark.'); } break;
    case 'comms': if (g.model) { p('Active hearing', 'Amplifies quiet sounds: nearby enemy movement shows as cues around your sights.'); p('Hearing protection', 'Flashbangs and blasts stun you less.'); M.hear = 1; M.flash = .85; if (g.boom || has(g, 'prr', 'invisio')) p('Radio', 'Intercepts enemy contact calls: callers are marked.'); if (g.boom || has(g, 'prr', 'invisio')) M.radio = 1; } break;
    case 'armor': {
      if (has(g, 'type56', 'ephod', 'd3crm', 'chest rig')) { p('Chest rig', 'Magazines right at your sternum: faster reloads.'); M.reload = .9; M.mags = 2; }
      else if (has(g, 'alice', 'battle belt', 'battlebelt', 'm1928', 'y-strap', 'y_straps', 'm1923')) { p('Belt kit', 'A few more magazines on the belt.'); M.mags = 1; }
      else if (g.plates || g.soft) { p('Load-bearing carrier', 'Pouches for two more magazines.'); M.mags = 2; }
      if (g.wt >= 10) p('Very heavy', 'Slows you down noticeably.', false);
      break; }
    case 'gloves': {
      if (!g.col) { p('Bare hands', 'Best feel for the trigger, but no grip on a hot barrel.'); break; }
      if (has(g, 'wool', 'mitten')) { p('Mittens', 'Warm but clumsy: slower reloads.', false); M.reload = 1.12; break; }
      if (has(g, 'nomex')) { p('Flame resistant', 'Burns hurt your hands less.'); M.burn = .85; M.recoil = .98; break; }
      p('Shooting gloves', 'Better grip: a little less recoil and faster reloads.'); M.recoil = .96; M.reload = .96;
      if (has(g, 'oakley', 'hatch', 'pig', 'wiley')) p('Knuckle protection', 'Hard knuckles: harder melee strikes.'), M.melee = 1.15;
      break; }
    case 'boots': {
      if (has(g, 'jack', 'kirza', 'puttee', 'legging', 'jump', 'combat')) { p('Hobnailed / hard soles', 'Loud footsteps on hard floors.', false); M.noise = 1.18; M.speed = .985; }
      else { p('Light trail soles', 'Quieter footsteps and a quicker pace.'); M.noise = .82; M.speed = 1.02; }
      break; }
    case 'pack': {
      if (!g.model) break;
      const big = has(g, 'molle', 'bergen', 'eberlestock', 'alice'), mid = has(g, 'assault', 'mystery', 'rd-54', 'rd54', '3 day', 'tornister', 'haversack', 'sidor');
      if (big) { p('Large rucksack', '3 more magazines and 2 more of each explosive. Heavy.'); M.mags = 3; M.exp = 2; }
      else if (mid) { p('Assault pack', '2 more magazines and 1 more of each explosive.'); M.mags = 2; M.exp = 1; }
      if (has(g, 'radio', 'prc')) { p('Long-range radio', 'Intercepts enemy contact calls: callers are marked.'); M.radio = 1; M.mags = 1; }
      if (has(g, 'hydration')) { p('Water', 'Breath for steady aim recovers faster.'); M.breath = 1.4; }
      break; }
  }
  return { perks: P, mods: M };
};

// fold a whole kit into multipliers
G.kitMods = function (kit, env) {
  const R = { camo: 1, noise: 1, reload: 1, recoil: 1, flash: 1, burn: 1, sway: 1, speed: 1, melee: 1, breath: 1, mags: 0, exp: 0, hear: 0, radio: 0, hearPen: 0, nightCamo: 1, envMatch: 1, uniEnv: 'wood' };
  for (const [slot] of G.GEAR_SLOTS) {
    const g = G.GEARID[kit[slot]]; if (!g) continue;
    const m = G.gearProps(g).mods;
    for (const k of ['camo', 'noise', 'reload', 'recoil', 'flash', 'burn', 'sway', 'speed', 'melee', 'breath', 'nightCamo']) if (m[k]) R[k] *= m[k];
    R.mags += m.mags || 0; R.exp += m.exp || 0; if (m.hear) R.hear = 1; if (m.radio) R.radio = 1; if (m.hearPen) R.hearPen = 1; if (m.env) R.uniEnv = m.env;
  }
  if (R.hear) R.hearPen = 0;
  if (env) { const row = CAMO[R.uniEnv] || CAMO.wood; R.envMatch = row[ENVI[env.ground] ?? 0]; if (env.night) R.envMatch = R.uniEnv === 'dark' ? .8 : Math.min(1, (R.envMatch + 1) / 2); R.camo *= R.envMatch * (env.night ? R.nightCamo : 1); }
  return R;
};
G.kitEnv = () => ({ ground: G.mapEnv(), night: !!(G.E.map && G.E.map.env === 'night') });
})();
