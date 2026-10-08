// Ironwalkers — game data: tiers, classes, weapons, equipment, cosmetics, maps, modes, boxes, battle pass.
(function () {
'use strict';
const MW = window.MW = window.MW || {};

// ---------- small utilities ----------
MW.hash = function (str) {
  let h = 2166136261 >>> 0;
  str = String(str);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
MW.rng = function (seed) {
  let a = (typeof seed === 'number' ? seed : MW.hash(seed)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
MW.pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
MW.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
MW.lerp = (a, b, t) => a + (b - a) * t;
MW.fmt = n => Math.round(n).toLocaleString('en-US');
MW.fmtShort = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1000) + 'K' : MW.fmt(n);

// ---------- tiers ----------
MW.TIERS = [
  { id: 0, name: 'Scrap',     roman: 'I',   color: '#9aa4ae' },
  { id: 1, name: 'Standard',  roman: 'II',  color: '#45d483' },
  { id: 2, name: 'Advanced',  roman: 'III', color: '#3ea6ff' },
  { id: 3, name: 'Elite',     roman: 'IV',  color: '#b866ff' },
  { id: 4, name: 'Legendary', roman: 'V',   color: '#ffb52e' },
  { id: 5, name: 'Mythic',    roman: 'VI',  color: '#ff3d63' },
];
MW.tierPrice = (base, t) => Math.round(base * Math.pow(2.75, t) / 50) * 50;

// ---------- mech classes ----------
// legs: biped | digi (reverse joint) | quad ; height in metres ; speed m/s
MW.CLASSES = [
  { id: 'wisp', name: 'Wisp', role: 'Scout', weight: 'Light', tons: 25, legs: 'digi', height: 7.6, speed: 25, accel: 22, turn: 2.3, twist: 115, hp: { core: 190, arm: 80, leg: 120 }, heat: { cap: 60, diss: 10 }, jump: 1.6,
    hardpoints: [{ size: 'S', mount: 'armL' }, { size: 'S', mount: 'armR' }, { size: 'M', mount: 'shR' }],
    ability: { id: 'overdrive', name: 'Overdrive', desc: '+60% speed and turn rate for 5 s', cd: 16, dur: 5 },
    price: 0, starter: true, desc: 'A twitchy reverse-joint scout. Gets to objectives first and flanks anything slow.' },
  { id: 'vanguard', name: 'Vanguard', role: 'Assault', weight: 'Medium', tons: 50, legs: 'biped', height: 10, speed: 18, accel: 14, turn: 1.6, twist: 100, hp: { core: 300, arm: 130, leg: 170 }, heat: { cap: 75, diss: 11 }, jump: 1.1,
    hardpoints: [{ size: 'M', mount: 'armL' }, { size: 'M', mount: 'armR' }, { size: 'S', mount: 'shL' }, { size: 'M', mount: 'shR' }],
    ability: { id: 'barrage', name: 'Barrage', desc: 'Weapon cooldowns halved for 5 s', cd: 22, dur: 5 },
    price: 0, starter: true, desc: 'The all-rounder. Two arm hardpoints, a missile shoulder and a forgiving heat curve.' },
  { id: 'bastion', name: 'Bastion', role: 'Defender', weight: 'Heavy', tons: 70, legs: 'biped', height: 11, speed: 13.5, accel: 9, turn: 1.15, twist: 85, hp: { core: 430, arm: 190, leg: 240 }, heat: { cap: 85, diss: 12 }, jump: 0.7,
    hardpoints: [{ size: 'L', mount: 'armR' }, { size: 'M', mount: 'armL' }, { size: 'M', mount: 'shL' }, { size: 'S', mount: 'torsoC' }],
    ability: { id: 'fortify', name: 'Fortify', desc: 'Take 50% less damage but move 40% slower for 6 s', cd: 24, dur: 6 },
    price: 0, starter: true, desc: 'A walking pillbox. Shoulders like bunker roofs and a big right-arm gun.' },
  { id: 'longbow', name: 'Longbow', role: 'Sniper', weight: 'Medium', tons: 45, legs: 'digi', height: 11.2, speed: 17, accel: 13, turn: 1.5, twist: 120, hp: { core: 260, arm: 110, leg: 150 }, heat: { cap: 80, diss: 11.5 }, jump: 1.2,
    hardpoints: [{ size: 'L', mount: 'armR' }, { size: 'M', mount: 'armL' }, { size: 'S', mount: 'torsoC' }],
    ability: { id: 'focus', name: 'Deadeye', desc: 'Zoom, zero spread and +40% damage for 6 s', cd: 20, dur: 6 },
    price: 240000, desc: 'Stilt-legged marksman built around a single long gun and a stabilised sensor head.' },
  { id: 'mortar', name: 'Mortar', role: 'Artillery', weight: 'Heavy', tons: 65, legs: 'quad', height: 8.4, speed: 12.5, accel: 9, turn: 1.25, twist: 140, hp: { core: 400, arm: 160, leg: 260 }, heat: { cap: 90, diss: 12 }, jump: 0,
    hardpoints: [{ size: 'L', mount: 'shL' }, { size: 'L', mount: 'shR' }, { size: 'M', mount: 'torsoC' }, { size: 'S', mount: 'armR' }],
    ability: { id: 'artillery', name: 'Fire Mission', desc: 'Calls an 8-shell barrage on the crosshair after 2.5 s', cd: 30, dur: 0 },
    price: 420000, desc: 'A four-legged gun platform. Two big roof racks and an orbital fire-mission uplink.' },
  { id: 'phantom', name: 'Phantom', role: 'Stalker', weight: 'Medium', tons: 40, legs: 'digi', height: 9, speed: 21, accel: 18, turn: 2.0, twist: 110, hp: { core: 250, arm: 100, leg: 140 }, heat: { cap: 70, diss: 12 }, jump: 1.5,
    hardpoints: [{ size: 'M', mount: 'armL' }, { size: 'M', mount: 'armR' }, { size: 'S', mount: 'shL' }, { size: 'S', mount: 'shR' }],
    ability: { id: 'cloak', name: 'Cloak', desc: 'Near-invisible and off radar for 7 s. Firing breaks it', cd: 24, dur: 7 },
    price: 680000, desc: 'Faceted stealth frame wrapped in radar-absorbent tiles. Ambush specialist.' },
  { id: 'aegis', name: 'Aegis', role: 'Bulwark', weight: 'Heavy', tons: 80, legs: 'biped', height: 12, speed: 11.5, accel: 8, turn: 1.05, twist: 80, hp: { core: 500, arm: 240, leg: 270 }, heat: { cap: 90, diss: 12.5 }, jump: 0.6,
    hardpoints: [{ size: 'L', mount: 'armR' }, { size: 'M', mount: 'shL' }, { size: 'M', mount: 'shR' }, { size: 'M', mount: 'torsoC' }],
    ability: { id: 'barrier', name: 'Bastille Dome', desc: 'Projects a shield dome that blocks enemy fire for 9 s', cd: 30, dur: 9 },
    price: 1050000, desc: 'Carries a tower shield on the left arm and projects a hard-light dome for its team.' },
  { id: 'tempest', name: 'Tempest', role: 'Skirmisher', weight: 'Medium', tons: 45, legs: 'biped', height: 10, speed: 19, accel: 16, turn: 1.8, twist: 110, hp: { core: 270, arm: 110, leg: 150 }, heat: { cap: 75, diss: 12 }, jump: 3.2,
    hardpoints: [{ size: 'M', mount: 'armL' }, { size: 'M', mount: 'armR' }, { size: 'M', mount: 'shR' }, { size: 'S', mount: 'shL' }],
    ability: { id: 'flight', name: 'Skyburst', desc: 'Full thrust flight for 5 s', cd: 20, dur: 5 },
    price: 1600000, desc: 'Winged jump-jet frame with four vectored thrusters. Fights from rooftops and cliff edges.' },
  { id: 'juggernaut', name: 'Juggernaut', role: 'Siege Assault', weight: 'Assault', tons: 95, legs: 'biped', height: 13, speed: 10.5, accel: 7, turn: 0.95, twist: 75, hp: { core: 620, arm: 290, leg: 330 }, heat: { cap: 100, diss: 13.5 }, jump: 0.4,
    hardpoints: [{ size: 'L', mount: 'armL' }, { size: 'L', mount: 'armR' }, { size: 'M', mount: 'shL' }, { size: 'M', mount: 'shR' }, { size: 'S', mount: 'torsoC' }],
    ability: { id: 'ram', name: 'Battering Ram', desc: 'Charges forward 3 s, smashing mechs in its path', cd: 22, dur: 3 },
    price: 2400000, desc: 'Ninety-five tons of armour with two heavy arm guns and a bulldozer chest.' },
  { id: 'colossus', name: 'Colossus', role: 'Titan', weight: 'Super-heavy', tons: 120, legs: 'quad', height: 15, speed: 9, accel: 6, turn: 0.8, twist: 180, hp: { core: 820, arm: 330, leg: 420 }, heat: { cap: 120, diss: 15 }, jump: 0,
    hardpoints: [{ size: 'L', mount: 'shL' }, { size: 'L', mount: 'shR' }, { size: 'L', mount: 'torsoC' }, { size: 'M', mount: 'armL' }, { size: 'M', mount: 'armR' }, { size: 'S', mount: 'back' }],
    ability: { id: 'overload', name: 'Core Overload', desc: 'No heat and +30% fire rate for 6 s', cd: 32, dur: 6 },
    price: 4000000, desc: 'A walking fortress on four legs with a fully rotating turret deck. The apex of the line.' },
];
MW.CLASS = {}; MW.CLASSES.forEach(c => (MW.CLASS[c.id] = c));

// ---------- weapons ----------
// rate = shots (or activations) per second. Damage is per projectile.
MW.WEAPON_TYPES = [
  { id: 'mg',     name: 'Machine Gun',      short: 'MG',   size: 'S', kind: 'ballistic', fire: 'auto',   dmg: 2.4, rate: 10,  heat: 0.12, range: 170, speed: 430, spread: 1.4, color: '#ffd27a', desc: 'Cheap, cool-running bullet hose.' },
  { id: 'slas',   name: 'Small Laser',      short: 'SL',   size: 'S', kind: 'energy',    fire: 'beam',   dmg: 10,  rate: 0.65, dur: 0.55, heat: 1.8, range: 230, color: '#ff4040', desc: 'Short beam. Hold the crosshair on target for full damage.' },
  { id: 'flamer', name: 'Flamer',           short: 'FLM',  size: 'S', kind: 'energy',    fire: 'stream', dmg: 7,   rate: 1,   heat: 2.2, range: 75, color: '#ff8a2a', targetHeat: 7, desc: 'Damage per second plus heat dumped into the target.' },
  { id: 'ac5',    name: 'Autocannon',       short: 'AC/5', size: 'M', kind: 'ballistic', fire: 'semi',   dmg: 10,  rate: 2.2, heat: 1.2, range: 360, speed: 340, spread: 0.35, color: '#ffc864', desc: 'Reliable medium cannon.' },
  { id: 'rac',    name: 'Rotary Cannon',    short: 'RAC',  size: 'M', kind: 'ballistic', fire: 'spin',   dmg: 2.9, rate: 15,  heat: 0.2, range: 250, speed: 390, spread: 1.7, spinup: 0.6, color: '#ffd27a', desc: 'Spins up, then shreds.' },
  { id: 'plas',   name: 'Pulse Laser',      short: 'PL',   size: 'M', kind: 'energy',    fire: 'burst',  dmg: 5.5, rate: 0.75, burst: 3, gap: 0.08, heat: 2.4, range: 320, speed: 750, spread: 0.2, color: '#40ff9a', desc: 'Three quick bolts per trigger pull.' },
  { id: 'srm',    name: 'SRM Pack',         short: 'SRM',  size: 'M', kind: 'missile',   fire: 'salvo',  dmg: 6,   rate: 0.42, count: 4, heat: 3, range: 270, speed: 170, spread: 2.5, splash: 3, color: '#ffffff', desc: 'Dumb-fire rocket shotgun.' },
  { id: 'plasma', name: 'Plasma Cannon',    short: 'PLC',  size: 'M', kind: 'energy',    fire: 'semi',   dmg: 19,  rate: 0.5, heat: 5, range: 300, speed: 210, spread: 0.2, splash: 7, color: '#c050ff', desc: 'Slow star-hot ball with splash.' },
  { id: 'mortar', name: 'Mortar',           short: 'MRT',  size: 'M', kind: 'missile',   fire: 'lob',    dmg: 24,  rate: 0.35, heat: 3, range: 460, speed: 120, splash: 10, color: '#ffaa55', desc: 'Lobbed shells that clear cover.' },
  { id: 'arc',    name: 'Arc Projector',    short: 'ARC',  size: 'M', kind: 'energy',    fire: 'chain',  dmg: 15,  rate: 0.5, heat: 4.5, range: 190, chains: 2, color: '#7fd8ff', desc: 'Lightning that leaps to a second target.' },
  { id: 'ac20',   name: 'Heavy Autocannon', short: 'AC/20',size: 'L', kind: 'ballistic', fire: 'semi',   dmg: 42,  rate: 0.55, heat: 5, range: 230, speed: 260, spread: 0.5, splash: 2.5, color: '#ffb040', desc: 'One shell, one crater.' },
  { id: 'gauss',  name: 'Gauss Rifle',      short: 'GAUSS',size: 'L', kind: 'ballistic', fire: 'charge', dmg: 58,  rate: 0.32, charge: 0.55, heat: 1.6, range: 660, speed: 1200, spread: 0, color: '#9fd7ff', desc: 'Hold to charge, release a hypersonic slug.' },
  { id: 'llas',   name: 'Large Laser',      short: 'LL',   size: 'L', kind: 'energy',    fire: 'beam',   dmg: 34,  rate: 0.28, dur: 1.0, heat: 7, range: 480, color: '#ff3355', desc: 'Long-duration high-damage beam.' },
  { id: 'ppc',    name: 'Particle Cannon',  short: 'PPC',  size: 'L', kind: 'energy',    fire: 'semi',   dmg: 32,  rate: 0.3, heat: 8.5, range: 540, speed: 620, spread: 0, emp: 1, color: '#80c8ff', desc: 'Lightning bolt that scrambles enemy HUDs and slows them.' },
  { id: 'lrm',    name: 'LRM Rack',         short: 'LRM',  size: 'L', kind: 'missile',   fire: 'salvo',  dmg: 2.8, rate: 0.22, count: 10, heat: 4.5, range: 760, minRange: 90, speed: 135, spread: 4, splash: 2, homing: true, lock: 1.3, arc: true, color: '#ffffff', desc: 'Hold the crosshair to lock, then indirect-fire ten homing missiles.' },
  { id: 'rail',   name: 'Railgun',          short: 'RAIL', size: 'L', kind: 'energy',    fire: 'hitscan',dmg: 48,  rate: 0.24, charge: 0.25, heat: 7.5, range: 900, color: '#62f6ff', desc: 'Instant-hit hypervelocity lance.' },
];
MW.WTYPE = {}; MW.WEAPON_TYPES.forEach(w => (MW.WTYPE[w.id] = w));

MW.MFRS = [
  { id: 'kessler',  name: 'Kessler',     tag: 'Balanced',     mod: {} , pm: 1.0 },
  { id: 'orion',    name: 'Orion Arms',  tag: 'Long range',   mod: { range: 1.18, speed: 1.15, dmg: 0.94 }, pm: 1.08 },
  { id: 'draconis', name: 'Draconis',    tag: 'Heavy hitter', mod: { dmg: 1.14, heat: 1.15, rate: 0.95 }, pm: 1.12 },
  { id: 'yamagata', name: 'Yamagata',    tag: 'Rapid',        mod: { rate: 1.15, dmg: 0.92 }, pm: 1.06 },
  { id: 'vektor',   name: 'Vektor',      tag: 'Cool running', mod: { heat: 0.78, dmg: 0.97 }, pm: 1.1 },
  { id: 'hadley',   name: 'Hadley-Vance',tag: 'Precision',    mod: { spread: 0.6, speed: 1.1, range: 1.06 }, pm: 1.14 },
];
const SIZE_BASE = { S: 1700, M: 3200, L: 5600 };

MW.weaponStats = function (wt, tier, mod) {
  mod = mod || {};
  const g = k => (mod[k] || 1);
  return {
    dmg: wt.dmg * (1 + 0.24 * tier) * g('dmg'),
    rate: wt.rate * (1 + 0.04 * tier) * g('rate'),
    heat: wt.heat * (1 - 0.055 * tier) * g('heat'),
    range: wt.range * (1 + 0.07 * tier) * g('range'),
    speed: (wt.speed || 0) * (1 + 0.05 * tier) * g('speed'),
    spread: (wt.spread || 0) * (1 - 0.08 * tier) * g('spread'),
  };
};

// ---------- equipment ----------
MW.EQUIP_SLOTS = [
  { id: 'armor',     name: 'Armor',      icon: '⬢', variants: [
    { id: 'composite', name: 'Composite Plating', desc: 'Pure armour.', st: { hp: 1 } },
    { id: 'reactive',  name: 'Reactive Plating',  desc: 'Less splash and ballistic damage.', st: { hp: 0.85, ballisticRes: 0.15, splashRes: 0.25 } },
    { id: 'ablative',  name: 'Ablative Coat',     desc: 'Resists energy weapons.', st: { hp: 0.85, energyRes: 0.2 } },
    { id: 'ferro',     name: 'Ferro-Fibrous',     desc: 'Lighter armour, faster mech.', st: { hp: 0.75, speed: 0.06 } } ] },
  { id: 'reactor',   name: 'Reactor',    icon: '◉', variants: [
    { id: 'fusion', name: 'Fusion Core',   desc: 'Balanced heat capacity and cooling.', st: { cap: 1, diss: 1 } },
    { id: 'xl',     name: 'XL Engine',     desc: 'Faster and cooler, less armour.', st: { cap: 0.9, diss: 1.15, speed: 0.05, hp: -0.06 } },
    { id: 'cryo',   name: 'Cryo Core',     desc: 'Huge heat buffer.', st: { cap: 1.3, diss: 0.85 } },
    { id: 'pulse',  name: 'Pulse Reactor', desc: 'Very fast cooling.', st: { cap: 0.85, diss: 1.3 } } ] },
  { id: 'actuator',  name: 'Actuators',  icon: '⟳', variants: [
    { id: 'myomer',  name: 'Myomer Bundles', desc: 'Speed.', st: { speed: 1 } },
    { id: 'servo',   name: 'Servo Gyros',    desc: 'Turn and torso twist rate.', st: { speed: 0.5, turn: 1 } },
    { id: 'hydra',   name: 'Hydraulic Rams', desc: 'Acceleration and leg armour.', st: { speed: 0.6, accel: 1, legHp: 0.15 } },
    { id: 'tsm',     name: 'Triple-Strength', desc: 'Much faster while running hot.', st: { speed: 0.4, hotSpeed: 0.3 } } ] },
  { id: 'jets',      name: 'Jump Jets',  icon: '▲', variants: [
    { id: 'standard', name: 'Standard Jets', desc: 'Fuel and thrust.', st: { fuel: 1, thrust: 1 } },
    { id: 'vectored', name: 'Vectored Jets', desc: 'Air control.', st: { fuel: 0.9, thrust: 1, air: 1 } },
    { id: 'heavy',    name: 'Heavy Boosters',desc: 'Big thrust, short burn.', st: { fuel: 0.75, thrust: 1.4 } },
    { id: 'pulsejet', name: 'Pulse Jets',    desc: 'Recharges fast.', st: { fuel: 0.85, thrust: 0.95, regen: 1.6 } } ] },
  { id: 'targeting', name: 'Targeting',  icon: '⌖', variants: [
    { id: 'optic',   name: 'Optic Array',    desc: 'Tighter spread.', st: { spread: 1 } },
    { id: 'lidar',   name: 'Lidar Suite',    desc: 'Faster missile locks.', st: { lock: 1 } },
    { id: 'quantum', name: 'Quantum Sight',  desc: 'Weapon range.', st: { range: 1 } },
    { id: 'tacnet',  name: 'Tac-Net Uplink', desc: 'Radar range and target info.', st: { radar: 1, spread: 0.4 } } ] },
  { id: 'module',    name: 'Module',     icon: '✚', variants: [
    { id: 'ams',    name: 'Anti-Missile System', desc: 'Shoots down incoming missiles.', st: { ams: 1 } },
    { id: 'ecm',    name: 'ECM Suite',           desc: 'Slows enemy locks, hides you from radar.', st: { ecm: 1 } },
    { id: 'repair', name: 'Repair Drone',        desc: 'Regenerates armour out of combat.', st: { repair: 1 } },
    { id: 'shield', name: 'Shield Emitter',      desc: 'Regenerating energy shield.', st: { shield: 1 } } ] },
];
MW.EQSLOT = {}; MW.EQUIP_SLOTS.forEach(s => (MW.EQSLOT[s.id] = s));

// Resolve the numeric effect of an equipment item
MW.equipEffect = function (item) {
  const t = item.tier, st = item.st, k = t + 1;
  const e = {};
  switch (item.slot) {
    case 'armor':
      e.hp = 1 + 0.2 * k * st.hp;
      e.ballisticRes = (st.ballisticRes || 0) * (1 + 0.1 * t); e.splashRes = (st.splashRes || 0) * (1 + 0.1 * t);
      e.energyRes = (st.energyRes || 0) * (1 + 0.1 * t); e.speed = 1 + (st.speed || 0) * (1 + 0.15 * t);
      break;
    case 'reactor':
      e.cap = 1 + 0.12 * k * st.cap - 0.05; e.diss = 1 + 0.12 * k * st.diss - 0.05;
      e.speed = 1 + (st.speed || 0); e.hp = 1 + (st.hp || 0);
      break;
    case 'actuator':
      e.speed = 1 + 0.035 * k * st.speed; e.turn = 1 + 0.06 * k * (st.turn || 0.3); e.accel = 1 + 0.08 * k * (st.accel || 0.3);
      e.legHp = 1 + (st.legHp || 0) * k * 0.5; e.hotSpeed = (st.hotSpeed || 0) * (1 + 0.15 * t);
      break;
    case 'jets':
      e.fuel = (0.7 + 0.15 * k) * st.fuel; e.thrust = (0.9 + 0.05 * k) * st.thrust; e.air = st.air ? 1 : 0; e.regen = (st.regen || 1) * (1 + 0.08 * t);
      break;
    case 'targeting':
      e.spread = 1 - 0.07 * k * (st.spread || 0); e.lock = 1 - 0.08 * k * (st.lock || 0.2); e.range = 1 + 0.035 * k * (st.range || 0.2); e.radar = 1 + 0.12 * k * (st.radar || 0.3);
      break;
    case 'module':
      if (st.ams) e.ams = 0.25 + 0.08 * t;
      if (st.ecm) e.ecm = 0.4 + 0.1 * t;
      if (st.repair) e.repair = 1.2 + 0.9 * t;
      if (st.shield) e.shield = 60 + 45 * t;
      break;
  }
  return e;
};

// ---------- cosmetics ----------
MW.PATTERNS = ['solid', 'split', 'splinter', 'digital', 'tiger', 'woodland', 'hex', 'stripes', 'hazard', 'carbon', 'circuit', 'flames', 'lightning', 'dazzle', 'checker', 'scales', 'tribal', 'starfield', 'damascus', 'urban', 'arctic', 'blotch', 'chevron', 'waves', 'honeycomb', 'glitch', 'marble', 'rust', 'topo', 'bolts'];
const PATTERN_TIER = { solid: 0, split: 0, stripes: 0, blotch: 0, woodland: 1, urban: 1, arctic: 1, checker: 1, chevron: 1, digital: 2, splinter: 2, tiger: 2, hex: 2, hazard: 2, waves: 2, rust: 2, carbon: 3, circuit: 3, honeycomb: 3, topo: 3, bolts: 3, dazzle: 3, scales: 4, tribal: 4, marble: 4, glitch: 4, lightning: 4, flames: 5, starfield: 5, damascus: 5 };
MW.PALETTES = [
  ['Gunmetal', '#4a5058', '#2b2f35', '#ff8a1c'], ['Desert Fox', '#c8a46a', '#7d5d34', '#2e2a24'], ['Arctic Wolf', '#e6edf2', '#9aaab8', '#2b6cff'],
  ['Jungle Viper', '#3e5a2a', '#1f2b17', '#d7e04a'], ['Crimson Fang', '#9d1b22', '#2a1416', '#f2e6d0'], ['Cobalt Strike', '#1d4fa8', '#0f1d3a', '#7fe1ff'],
  ['Hornet', '#f4c20d', '#1b1b1b', '#ffffff'], ['Night Ops', '#1d2228', '#0c0e11', '#32ff7a'], ['Bone', '#d8d0bc', '#8a8070', '#5a1a14'],
  ['Toxic', '#68d016', '#1b2a0c', '#d43cff'], ['Royal', '#4b2a8a', '#1a0f33', '#ffd34d'], ['Rust Bucket', '#8a4a24', '#4d2c18', '#c9c2b0'],
  ['Ocean Deep', '#0f5f6e', '#082a33', '#ff7a4a'], ['Sakura', '#f2b6c8', '#7a3046', '#ffffff'], ['Ember', '#2a1410', '#ff5a1a', '#ffd27a'],
  ['Glacier', '#9fe0ff', '#2e6f99', '#ffffff'], ['Olive Drab', '#5b6237', '#2d3220', '#e0d9a8'], ['Steel Rain', '#7d8a96', '#3b434c', '#ff3b3b'],
  ['Vapor', '#ff6ad5', '#2b2d8f', '#5ffbf1'], ['Sandstorm', '#d9b77c', '#a67c43', '#6b3e1a'], ['Phantom', '#2a2e3d', '#101219', '#9b6bff'],
  ['Inferno', '#ff4a12', '#3a0a02', '#ffd200'], ['Mint', '#8cf0c4', '#2a6e58', '#1b2b26'], ['Copperhead', '#b8682d', '#3a2012', '#69e0c0'],
  ['Ivory Knight', '#efe9dc', '#b49b5e', '#2e3c66'], ['Blood Moon', '#4a0b12', '#120306', '#ff304f'], ['Urban Grey', '#8e9296', '#55595e', '#f6c84c'],
  ['Lagoon', '#2ac2b0', '#0d4a52', '#fff1a8'], ['Ultraviolet', '#6a1cff', '#14063a', '#ff3df2'], ['Thunderhead', '#3b4a63', '#c4d2e8', '#ffe14a'],
  ['Midnight Gold', '#121418', '#d4a63a', '#f5e3a0'], ['Coral Reef', '#ff7f6a', '#2a5e78', '#ffe1b8'], ['Moss', '#6e7d3a', '#3d3b26', '#b54b2e'],
  ['Ash', '#5c5a57', '#2e2c2a', '#ff6b2a'], ['Frostbite', '#cfe8ff', '#4a6fa8', '#ff4a7a'], ['Tangerine', '#ff8c1a', '#2a2e35', '#f4f4f4'],
];
const PALETTE_TIER = i => (i < 12 ? 0 : i < 22 ? 1 : i < 30 ? 2 : 3);
MW.FINISHES = [
  { id: 'satin', name: 'Satin', m: 0.35, r: 0.5, tier: 0 }, { id: 'matte', name: 'Matte', m: 0.1, r: 0.85, tier: 0 },
  { id: 'gloss', name: 'Gloss', m: 0.2, r: 0.18, tier: 1 }, { id: 'weathered', name: 'Weathered', m: 0.3, r: 0.75, tier: 1, wear: 1 },
  { id: 'metallic', name: 'Metallic', m: 0.75, r: 0.3, tier: 2 }, { id: 'scarred', name: 'Battle-Scarred', m: 0.4, r: 0.65, tier: 2, wear: 2 },
  { id: 'brushed', name: 'Brushed Steel', m: 0.85, r: 0.38, tier: 2 }, { id: 'carbonf', name: 'Carbon Weave', m: 0.4, r: 0.35, tier: 3 },
  { id: 'pearl', name: 'Pearlescent', m: 0.55, r: 0.15, tier: 3, sheen: 1 }, { id: 'obsidian', name: 'Obsidian', m: 0.6, r: 0.08, tier: 4 },
  { id: 'chrome', name: 'Chrome', m: 1.0, r: 0.06, tier: 4 }, { id: 'gold', name: 'Gold Plated', m: 1.0, r: 0.16, tier: 5, tint: '#ffcf5a' },
  { id: 'emissive', name: 'Neon Lines', m: 0.4, r: 0.3, tier: 5, glow: 1 },
];
MW.SWATCHES = ['#e8ebee', '#b9c0c7', '#7d868f', '#4a5058', '#2b2f35', '#121417', '#8a1c1c', '#c62828', '#ff3b30', '#ff6b35', '#ff9500', '#ffb52e', '#ffd60a', '#f4e04d', '#c3d82b', '#6abf3b', '#2e8b57', '#1f5e3a', '#3e5a2a', '#5b6237', '#8a7d4a', '#c8a46a', '#d9b77c', '#8a4a24', '#5a3a22', '#2ec4b6', '#0f7c8a', '#5ac8fa', '#2b6cff', '#1d3f8a', '#0f1d3a', '#5e5ce6', '#7a3cff', '#bf5af2', '#ff2d92', '#f2b6c8', '#ffffff', '#ffe1b8', '#9fe0ff', '#62f6ff'];
MW.EMBLEM_SHAPES = ['skull', 'wolf', 'star', 'bolt', 'crown', 'eagle', 'crosshair', 'shield', 'sword', 'flame', 'atom', 'gear', 'fang', 'eye', 'wing', 'planet', 'diamond', 'anchor', 'spade', 'heart', 'phoenix', 'serpent', 'hammer', 'moon'];
MW.TRINKETS = ['bobble', 'dice', 'hula', 'duck', 'freshener', 'luckycat', 'tags', 'crystal', 'minimech', 'cube', 'medal', 'skull', 'photo', 'dreamcatcher', 'bobcat', 'rocket'];
MW.TRINKET_NAMES = { bobble: 'Bobble Pilot', dice: 'Fuzzy Dice', hula: 'Hula Mech', duck: 'Rubber Duck', freshener: 'Air Freshener', luckycat: 'Lucky Cat', tags: 'Dog Tags', crystal: 'Crystal Charm', minimech: 'Mini Mech', cube: 'Plush Cube', medal: 'Valor Medal', skull: 'Skull Charm', photo: 'Photo Card', dreamcatcher: 'Dreamcatcher', bobcat: 'Bobble Cat', rocket: 'Mini Rocket' };
MW.COCKPIT_THEMES = [
  ['Standard Amber', '#ffb52e', '#ff8a1c', 0], ['Tactical Green', '#4cff7a', '#1fae4a', 0], ['Ice Blue', '#7fdcff', '#2b8cff', 0],
  ['Crimson Ops', '#ff4a4a', '#b0141c', 1], ['Violet Night', '#b98aff', '#6a2cff', 1], ['Mono White', '#f2f4f8', '#9aa4ae', 1],
  ['Toxic Haze', '#c6ff2e', '#5fae0a', 2], ['Sakura Glow', '#ff9ad0', '#ff4f9a', 2], ['Gold Command', '#ffd86a', '#c48a12', 3],
  ['Inferno Core', '#ff6a2a', '#ff2a00', 3], ['Aurora', '#6affd8', '#9a5bff', 4], ['Deep Space', '#9fb8ff', '#ff6ad5', 4],
  ['Blood Oath', '#ff2a4a', '#ffd0d8', 5], ['Prismatic', '#ffffff', '#62f6ff', 5],
];
MW.JETS = [
  ['Standard Burn', '#ff9a3a', 0], ['Blue Flame', '#4aa8ff', 0], ['White Hot', '#f4f6ff', 1], ['Green Thrust', '#5cff7a', 1],
  ['Plasma Pink', '#ff4fc8', 2], ['Violet Ion', '#a05aff', 2], ['Solar Gold', '#ffd23a', 3], ['Crimson Burn', '#ff2a3a', 3],
  ['Cyan Ion', '#38f8ff', 4], ['Void Black', '#3a2a5a', 4], ['Rainbow Drive', '#ff6a6a', 5],
];
MW.TITLES = ['Rookie', 'Scrapper', 'Iron Fist', 'Cold Steel', 'Hot Shot', 'Gunslinger', 'Trailblazer', 'Bulwark', 'Stormbringer', 'Night Stalker', 'Desert Rat', 'Ice Breaker', 'Warlord', 'Heavy Metal', 'Overclocked', 'Red Line', 'Ace', 'Juggernaut', 'Headhunter', 'Breacher', 'Deadeye', 'Firestarter', 'Titan Slayer', 'Ghost', 'Vanguard Prime', 'Steel Saint', 'Thunder God', 'Apex', 'Doomwalker', 'Legend', 'Mythmaker', 'The Unbroken'];

// ---------- item catalog ----------
const ITEMS = MW.ITEMS = {};
const LIST = MW.ITEM_LIST = [];
function addItem(it) { ITEMS[it.id] = it; LIST.push(it); return it; }

MW.WEAPON_TYPES.forEach(wt => {
  MW.TIERS.forEach(t => {
    MW.MFRS.forEach((m, mi) => {
      // every weapon type gets 4 of the 6 manufacturers (Kessler always present)
      const keep = mi === 0 || ((MW.hash(wt.id + m.id) % 5) < 3);
      if (!keep) return;
      const tr = t.id;
      addItem({
        id: `w_${wt.id}_${m.id}_${tr}`, cat: 'weapon', wtype: wt.id, mfr: m.id, tier: tr, size: wt.size,
        name: `${m.name} ${wt.name}`, short: wt.short, mod: m.mod,
        price: MW.tierPrice(SIZE_BASE[wt.size] * m.pm, tr),
      });
    });
  });
});
MW.EQUIP_SLOTS.forEach(s => {
  s.variants.forEach((v, vi) => {
    MW.TIERS.forEach(t => {
      addItem({ id: `e_${s.id}_${v.id}_${t.id}`, cat: 'equip', slot: s.id, variant: v.id, tier: t.id, name: v.name, desc: v.desc, st: v.st, price: MW.tierPrice(2400 * (1 + vi * 0.06), t.id) });
    });
  });
});
// skins: each pattern with 8 palettes
MW.PATTERNS.forEach(p => {
  const r = MW.rng('skin' + p);
  const used = new Set();
  const n = p === 'solid' ? 12 : 8;
  for (let i = 0; i < n; i++) {
    let pi; do { pi = Math.floor(r() * MW.PALETTES.length); } while (used.has(pi)); used.add(pi);
    const pal = MW.PALETTES[pi];
    const tier = Math.min(5, Math.max(PATTERN_TIER[p], PALETTE_TIER(pi) + (PATTERN_TIER[p] >= 3 ? 1 : 0)));
    const pname = p[0].toUpperCase() + p.slice(1);
    addItem({ id: `s_${p}_${pi}`, cat: 'skin', pattern: p, colors: pal.slice(1), tier, name: `${pal[0]} ${pname}`, price: MW.tierPrice(1400, tier) });
  }
});
MW.FINISHES.forEach(f => addItem({ id: 'f_' + f.id, cat: 'finish', finish: f.id, tier: f.tier, name: f.name, price: f.tier === 0 ? 0 : MW.tierPrice(1800, f.tier) }));
MW.EMBLEM_SHAPES.forEach((e, i) => {
  [['#ffffff', 0], ['#ffb52e', 1], ['#ff3d63', 2]].forEach(([c, k]) => {
    const tier = Math.min(5, Math.floor(i / 6) + k);
    addItem({ id: `m_${e}_${k}`, cat: 'emblem', shape: e, color: c, tier, name: e[0].toUpperCase() + e.slice(1) + ['', ' (Gold)', ' (Crimson)'][k], price: MW.tierPrice(900, tier) });
  });
});
MW.TRINKETS.forEach((t, i) => {
  ['#ffb52e', '#3ea6ff', '#ff3d63'].forEach((c, k) => {
    const tier = Math.min(5, Math.floor(i / 4) + k);
    addItem({ id: `t_${t}_${k}`, cat: 'trinket', trinket: t, color: c, tier, name: MW.TRINKET_NAMES[t] + ['', ' (Blue)', ' (Red)'][k], price: MW.tierPrice(1100, tier) });
  });
});
MW.COCKPIT_THEMES.forEach((c, i) => addItem({ id: 'c_' + i, cat: 'cockpit', hud: c[1], light: c[2], tier: c[3], name: c[0], price: c[3] === 0 && i === 0 ? 0 : MW.tierPrice(1500, c[3]) }));
MW.JETS.forEach((j, i) => addItem({ id: 'j_' + i, cat: 'jet', color: j[1], tier: j[2], name: j[0], rainbow: j[0] === 'Rainbow Drive', price: i === 0 ? 0 : MW.tierPrice(1200, j[2]) }));
// weapon skins
['solid', 'carbon', 'hazard', 'digital', 'tiger', 'damascus', 'circuit', 'flames', 'marble', 'glitch'].forEach((p, i) => {
  [0, 5, 14, 20].forEach((pi, k) => {
    const pal = MW.PALETTES[pi];
    const tier = Math.min(5, Math.max(PATTERN_TIER[p], k));
    addItem({ id: `ws_${p}_${pi}`, cat: 'wskin', pattern: p, colors: pal.slice(1), tier, name: `${pal[0]} ${p[0].toUpperCase() + p.slice(1)} Guns`, price: MW.tierPrice(1000, tier) });
  });
});
MW.TITLES.forEach((t, i) => addItem({ id: 'ti_' + i, cat: 'title', title: t, tier: Math.min(5, Math.floor(i / 6)), name: '“' + t + '”', price: i === 0 ? 0 : MW.tierPrice(800, Math.min(5, Math.floor(i / 6))) }));
// classes as shop items
MW.CLASSES.forEach(c => addItem({ id: 'cls_' + c.id, cat: 'class', cls: c.id, tier: Math.min(5, Math.floor(c.price / 700000)), name: c.name + ' — ' + c.role, price: c.price }));

MW.CAT_NAMES = { class: 'Mech Classes', weapon: 'Weapons', equip: 'Equipment', skin: 'Skins', finish: 'Finishes', emblem: 'Emblems', trinket: 'Cockpit Trinkets', cockpit: 'Cockpit Themes', jet: 'Thruster Colors', wskin: 'Weapon Skins', title: 'Pilot Titles' };
MW.GAMEPLAY_CATS = { weapon: 1, equip: 1 };

MW.item = id => ITEMS[id] || (MW.profile && MW.profile.passItem(id)) || null;

MW.fits = (hpSize, wSize) => ({ S: ['S'], M: ['S', 'M'], L: ['S', 'M', 'L'] }[hpSize].includes(wSize));

// Number of distinct builds that the catalogue allows (shown on the title screen)
MW.countBuilds = function () {
  const by = c => LIST.filter(i => i.cat === c).length;
  const wBySize = { S: 0, M: 0, L: 0 };
  LIST.forEach(i => { if (i.cat === 'weapon') wBySize[i.size]++; });
  const fit = { S: wBySize.S, M: wBySize.S + wBySize.M, L: wBySize.S + wBySize.M + wBySize.L };
  const eq = MW.EQUIP_SLOTS.reduce((a, s) => a * LIST.filter(i => i.slot === s.id).length, 1);
  const cos = by('skin') * by('finish') * by('emblem') * by('trinket') * by('cockpit') * by('jet') * by('wskin') * by('title') * Math.pow(MW.SWATCHES.length, 3);
  let total = 0;
  MW.CLASSES.forEach(c => { let w = 1; c.hardpoints.forEach(h => (w *= fit[h.size])); total += w * eq * cos; });
  return { total, items: LIST.length };
};

// ---------- boxes ----------
MW.BOXES = MW.TIERS.map(t => ({
  id: 'box_' + t.id, tier: t.id, name: t.name + ' Crate', price: [2500, 7500, 21000, 60000, 170000, 480000][t.id],
  desc: ['Rusty salvage. Mostly scrap, sometimes a surprise.', 'Standard-issue supply drop.', 'Military surplus with a shot at Elite gear.', 'Elite consignment. Legendary pulls are possible.', 'Legendary vault. Could hold a Mythic — or a mech class.', 'Mythic reliquary. The best loot in the game, and the most expensive.'][t.id],
}));
// Roll the contents of a box: 3 items + credits
MW.rollBox = function (tier, r) {
  r = r || Math.random;
  const results = [];
  const offs = [[-2, 0.13], [-1, 0.3], [0, 0.36], [1, 0.16], [2, 0.05]];
  for (let n = 0; n < 3; n++) {
    let x = r(), o = 0;
    for (const [d, p] of offs) { if (x < p) { o = d; break; } x -= p; }
    const t = MW.clamp(tier + o, 0, 5);
    // jackpot: a mech class
    if (tier >= 3 && r() < 0.012 * (tier - 2)) {
      const locked = MW.CLASSES.filter(c => !c.starter);
      results.push({ item: ITEMS['cls_' + MW.pick(r, locked).id] }); continue;
    }
    const cr = r();
    const cat = cr < 0.32 ? 'weapon' : cr < 0.52 ? 'equip' : cr < 0.7 ? 'skin' : cr < 0.78 ? 'emblem' : cr < 0.84 ? 'trinket' : cr < 0.88 ? 'wskin' : cr < 0.91 ? 'finish' : cr < 0.94 ? 'jet' : cr < 0.96 ? 'cockpit' : 'credits';
    if (cat === 'credits') { results.push({ credits: Math.round(MW.BOXES[tier].price * (0.15 + r() * 0.5) / 50) * 50, tier: t }); continue; }
    let pool = LIST.filter(i => i.cat === cat && i.tier === t);
    if (!pool.length) pool = LIST.filter(i => i.cat === cat && Math.abs(i.tier - t) <= 1);
    if (!pool.length) pool = LIST.filter(i => i.cat === 'skin');
    results.push({ item: MW.pick(r, pool) });
  }
  return results;
};

// ---------- modes ----------
MW.MODES = [
  { id: 'tdm', name: 'Team Deathmatch', short: 'TDM', icon: '✕', desc: 'Destroy enemy mechs. First team to the kill target wins. Respawns on.' },
  { id: 'dom', name: 'Domination', short: 'DOM', icon: '◆', desc: 'Hold three control points. Each point you own scores every second.' },
  { id: 'att', name: 'Attrition', short: 'ATT', icon: '☠', desc: 'One life each. Last team standing wins.' },
  { id: 'heist', name: 'Data Heist', short: 'HST', icon: '⬡', desc: 'Grab the data core from the centre and carry it to your base. Three captures win.' },
  { id: 'siege', name: 'Siege', short: 'SGE', icon: '⛨', desc: 'Attackers must destroy three shield generators. Defenders hold until time runs out.' },
];
MW.MODE = {}; MW.MODES.forEach(m => (MW.MODE[m.id] = m));

// ---------- maps ----------
// size = half-extent in metres. theme drives terrain, sky, props and weather.
MW.MAPS = [
  { id: 'foundry', name: 'Foundry Pit', team: 6, size: 115, theme: 'foundry', desc: 'Inside a steelworks. Molten channels split the floor; gantry cranes overhead.' },
  { id: 'colosseum', name: 'Colosseum Prime', team: 6, size: 110, theme: 'colosseum', desc: 'A floodlit gladiator ring with tiered stands and crumbling pillars. Night.' },
  { id: 'crystal', name: 'Crystal Hollow', team: 6, size: 120, theme: 'crystal', desc: 'An alien sinkhole full of glowing crystal spires.' },
  { id: 'rustyard', name: 'Rust Yard', team: 6, size: 120, theme: 'rustyard', desc: 'A mech scrapyard: container mazes, junk mountains and gutted war machines.' },
  { id: 'neon', name: 'Neon Alley', team: 6, size: 115, theme: 'neon', desc: 'Rain-soaked cyberpunk streets between towers of signage.' },
  { id: 'frostbite', name: 'Frostbite Ridge', team: 8, size: 165, theme: 'snow', desc: 'A snowy mountain pass with pine forests and a frozen lake.' },
  { id: 'canyon', name: 'Dust Devil Canyon', team: 8, size: 170, theme: 'canyon', desc: 'Red-rock mesas and a winding dry riverbed.' },
  { id: 'verdant', name: 'Verdant Ruins', team: 10, size: 180, theme: 'jungle', desc: 'Jungle-choked temple ruins around a stepped pyramid.' },
  { id: 'harbor', name: 'Harbor Siege', team: 10, size: 185, theme: 'harbor', desc: 'Container docks, gantry cranes and a beached cargo ship.' },
  { id: 'caldera', name: 'Ashfall Caldera', team: 10, size: 180, theme: 'volcano', desc: 'A live volcano crater. Lava rivers and falling ash. Lava burns and overheats.' },
  { id: 'tycho', name: 'Tycho Lunar Base', team: 10, size: 190, theme: 'moon', desc: 'Low gravity in a moon crater, with domes, a radar dish and Earth overhead.' },
  { id: 'swamp', name: 'Blackwater Swamp', team: 12, size: 200, theme: 'swamp', desc: 'Fog, dead trees and waist-deep water that slows and cools.' },
  { id: 'refinery', name: 'Refinery Nine', team: 12, size: 200, theme: 'refinery', desc: 'Tank farms, pipe racks and burning flare stacks.' },
  { id: 'saltflats', name: 'Tempest Flats', team: 12, size: 215, theme: 'salt', desc: 'Blinding salt pans under a lightning storm. Little cover.' },
  { id: 'mars', name: 'Ares Outpost', team: 16, size: 260, theme: 'mars', desc: 'Red dunes, habitat modules and a dust storm on Mars.' },
  { id: 'glacier', name: 'Glacier Rift', team: 16, size: 260, theme: 'glacier', desc: 'Blue ice shelves cut by crevasses under an aurora.' },
  { id: 'metropolis', name: 'Fallen Metropolis', team: 20, size: 320, theme: 'city', desc: 'A ruined megacity grid of broken skyscrapers.' },
  { id: 'ironwood', name: 'Ironwood Forest', team: 20, size: 320, theme: 'forest', desc: 'Giant redwoods taller than any mech, with logging camps.' },
  { id: 'spaceport', name: 'Orbital Spaceport', team: 20, size: 330, theme: 'spaceport', desc: 'Launch pads, hangars and a rocket on its tower.' },
  { id: 'wastes', name: 'Titanfall Wastes', team: 20, size: 340, theme: 'toxic', desc: 'A toxic wasteland around the bones of a fallen colossal mech.' },
];
MW.MAP = {}; MW.MAPS.forEach(m => (MW.MAP[m.id] = m));

// ---------- names for AI pilots ----------
MW.CALLSIGNS = ['Viper', 'Hammer', 'Ghost', 'Rook', 'Talon', 'Havoc', 'Blitz', 'Onyx', 'Raven', 'Saber', 'Jackal', 'Reaper', 'Nova', 'Atlas', 'Bishop', 'Cinder', 'Diesel', 'Echo', 'Fury', 'Grim', 'Halo', 'Ion', 'Jinx', 'Kodiak', 'Lynx', 'Maverick', 'Nomad', 'Outlaw', 'Pyro', 'Quake', 'Rampart', 'Specter', 'Titan', 'Ursa', 'Vandal', 'Warden', 'Xeno', 'Yeti', 'Zephyr', 'Anvil', 'Banshee', 'Cobra', 'Dagger', 'Ember', 'Falcon', 'Gunner', 'Hex', 'Iron', 'Jolt', 'Kraken', 'Lancer', 'Mako', 'Nightjar', 'Orca', 'Phoenix', 'Quill', 'Riot', 'Scythe', 'Tusk', 'Volt', 'Wraith', 'Brick', 'Crash', 'Dozer', 'Frost', 'Gravel', 'Husk', 'Kestrel', 'Mantis', 'Pike', 'Sledge', 'Torque', 'Vortex', 'Wolfram'];

// ---------- weekly battle pass ----------
MW.WEEK_MS = 7 * 24 * 3600 * 1000;
const EPOCH = Date.UTC(2024, 0, 1); // a Monday
MW.weekIndex = (now) => Math.floor(((now || Date.now()) - EPOCH) / MW.WEEK_MS);
MW.weekEnds = (w) => EPOCH + (w + 1) * MW.WEEK_MS;
MW.dayIndex = (now) => Math.floor(((now || Date.now()) - EPOCH) / 86400000);
const PASS_THEMES = [['Ember Protocol', 'Inferno'], ['Cold Front', 'Frostbite'], ['Neon Requiem', 'Vapor'], ['Iron Saints', 'Ivory Knight'], ['Venom Season', 'Toxic'], ['Black Sun', 'Midnight Gold'], ['Riptide', 'Lagoon'], ['Red Horizon', 'Blood Moon'], ['Static Storm', 'Thunderhead'], ['Wildfire', 'Ember'], ['Deep Signal', 'Ultraviolet'], ['Grave Shift', 'Bone'], ['Sakura Drift', 'Sakura'], ['Copper Crown', 'Copperhead'], ['Arctic Veil', 'Arctic Wolf'], ['Hive Mind', 'Hornet']];
const PASS_SPECIAL_PATTERNS = ['holo', 'circuit', 'flames', 'lightning', 'damascus', 'starfield', 'glitch', 'scales', 'tribal', 'marble'];
MW.PASS_LEVELS = 30;
MW.PASS_XP = 1000;
MW.battlePass = function (week) {
  const r = MW.rng('pass' + week);
  const th = PASS_THEMES[((week % PASS_THEMES.length) + PASS_THEMES.length) % PASS_THEMES.length];
  const name = th[0];
  const pal = (MW.PALETTES.find(p => p[0] === th[1]) || MW.PALETTES[0]).slice(1);
  const P = `pw${week}_`;
  const items = [];
  const shift = (hex, k) => { const c = parseInt(hex.slice(1), 16); let rr = c >> 16, g = (c >> 8) & 255, b = c & 255; rr = MW.clamp(Math.round(rr * k), 0, 255); g = MW.clamp(Math.round(g * k), 0, 255); b = MW.clamp(Math.round(b * k), 0, 255); return '#' + ((rr << 16) | (g << 8) | b).toString(16).padStart(6, '0'); };
  const pat = () => MW.pick(r, PASS_SPECIAL_PATTERNS);
  items.push({ id: P + 'skin1', cat: 'skin', pattern: pat(), colors: pal, tier: 3, name: `${name} Livery`, exclusive: true });
  items.push({ id: P + 'skin2', cat: 'skin', pattern: pat(), colors: [pal[1], pal[0], pal[2]], tier: 4, name: `${name} Reverse`, exclusive: true });
  items.push({ id: P + 'skin3', cat: 'skin', pattern: 'holo', colors: [shift(pal[0], 1.3), pal[2], '#ffffff'], tier: 5, name: `${name} Prismatic`, exclusive: true, anim: true });
  items.push({ id: P + 'emblem', cat: 'emblem', shape: MW.pick(r, MW.EMBLEM_SHAPES), color: pal[2], tier: 3, name: `${name} Insignia`, exclusive: true });
  items.push({ id: P + 'trinket', cat: 'trinket', trinket: MW.pick(r, MW.TRINKETS), color: pal[2], tier: 3, name: `${name} ${MW.TRINKET_NAMES[MW.pick(r, MW.TRINKETS)].split(' ').pop()}`, exclusive: true });
  items[items.length - 1].name = `${name} Charm`;
  items.push({ id: P + 'cockpit', cat: 'cockpit', hud: pal[2], light: pal[0], tier: 4, name: `${name} Cockpit`, exclusive: true });
  items.push({ id: P + 'jet', cat: 'jet', color: pal[2], tier: 4, name: `${name} Thrusters`, exclusive: true });
  items.push({ id: P + 'wskin', cat: 'wskin', pattern: pat(), colors: pal, tier: 4, name: `${name} Arsenal`, exclusive: true });
  items.push({ id: P + 'title', cat: 'title', title: name, tier: 4, name: '“' + name + '”', exclusive: true });
  items.push({ id: P + 'finish', cat: 'finish', finish: MW.pick(r, ['pearl', 'chrome', 'obsidian', 'emissive']), tier: 4, name: `${name} Finish`, exclusive: true, finishBase: true });
  // signature weapons — a prototype manufacturer variant only obtainable from this week's pass
  const sigTypes = MW.WEAPON_TYPES.slice();
  const w1 = MW.pick(r, sigTypes), w2 = MW.pick(r, sigTypes.filter(w => w !== w1)), w3 = MW.pick(r, sigTypes.filter(w => w !== w1 && w !== w2));
  const sigMod = { dmg: 1.1, rate: 1.06, heat: 0.9, range: 1.08 };
  items.push({ id: P + 'wpn1', cat: 'weapon', wtype: w1.id, mfr: 'proto', tier: 1, size: w1.size, name: `${name} ${w1.name}`, short: w1.short, mod: sigMod, exclusive: true });
  items.push({ id: P + 'wpn2', cat: 'weapon', wtype: w2.id, mfr: 'proto', tier: 3, size: w2.size, name: `${name} ${w2.name}`, short: w2.short, mod: sigMod, exclusive: true });
  items.push({ id: P + 'wpn3', cat: 'weapon', wtype: w3.id, mfr: 'proto', tier: 5, size: w3.size, name: `${name} ${w3.name}`, short: w3.short, mod: sigMod, exclusive: true });
  const ss = MW.pick(r, MW.EQUIP_SLOTS), sv = MW.pick(r, ss.variants);
  items.push({ id: P + 'equip', cat: 'equip', slot: ss.id, variant: sv.id, tier: 4, name: `${name} ${sv.name}`, desc: sv.desc + ' Prototype tuning.', st: Object.fromEntries(Object.entries(sv.st).map(([k, v]) => [k, v * 1.15])), exclusive: true });
  items.forEach(i => (i.week = week, i.price = 0));
  const byId = Object.fromEntries(items.map(i => [i.id.slice(P.length), i]));
  // level track
  const track = [];
  const plan = { 2: 'title', 4: 'emblem', 6: 'skin1', 8: 'jet', 10: 'wpn1', 12: 'trinket', 14: 'wskin', 16: 'cockpit', 18: 'skin2', 20: 'wpn2', 22: 'finish', 24: 'equip', 26: 'skin3', 28: 'wpn3' };
  for (let l = 1; l <= MW.PASS_LEVELS; l++) {
    if (plan[l]) track.push({ level: l, item: byId[plan[l]].id });
    else if (l === 30) track.push({ level: l, box: 5 });
    else if (l % 5 === 3) track.push({ level: l, box: Math.min(4, Math.floor(l / 6)) });
    else track.push({ level: l, credits: 4000 + l * 1500 });
  }
  // weekly challenges
  const CH = [
    ['win', 'Win {n} matches', [3, 4, 5], 3000], ['kills', 'Destroy {n} enemy mechs', [25, 35, 50], 3000], ['dmg', 'Deal {n} damage', [15000, 25000, 40000], 3000],
    ['caps', 'Capture {n} control points', [8, 12, 16], 2500], ['matches', 'Play {n} matches', [5, 8, 10], 2000], ['mode_heist', 'Play {n} Data Heist matches', [2, 3], 2000],
    ['mode_siege', 'Play {n} Siege matches', [2, 3], 2000], ['big', 'Play {n} matches on 16v16 or bigger maps', [3, 4], 2500], ['gens', 'Destroy {n} shield generators', [2, 3], 2500],
    ['heistcaps', 'Capture the data core {n} times', [1, 2], 2500], ['ability', 'Use your mech ability {n} times', [15, 25], 2000], ['top3', 'Finish in your team’s top 3 {n} times', [3, 5], 3000],
  ];
  const chosen = []; const pool = CH.slice();
  for (let i = 0; i < 6; i++) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = MW.pick(r, c[2]); chosen.push({ id: c[0], text: c[1].replace('{n}', MW.fmt(n)), n, xp: c[3] }); }
  return { week, name, pal, items, track, challenges: chosen, ends: MW.weekEnds(week) };
};
})();
