'use strict';
// Steel Meridian — static data and the procedural generators for units, skins, maps and weather.
const SM = window.SM = window.SM || {};

SM.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
SM.hash = function (str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
SM.pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
SM.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
SM.fmt = n => Math.round(n).toLocaleString('en-US');
SM.ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// ---------------------------------------------------------------- factions
SM.FACTIONS = [
  { id: 'coalition', name: 'Atlantic Coalition', short: 'ATC', motto: 'Precision. Discipline. Overmatch.',
    hue: '#6fa3e0', palette: { base: 0x6d7860, dark: 0x2c3129, accent: 0x9db2c6, glow: 0x5ec8ff },
    style: 'angular', bonus: { acc: 1.08 }, bonusText: '+8% accuracy' },
  { id: 'federation', name: 'Red Dawn Federation', short: 'RDF', motto: 'Mass is its own argument.',
    hue: '#e0644a', palette: { base: 0x626b47, dark: 0x292c20, accent: 0xb5452b, glow: 0xff6a3d },
    style: 'heavy', bonus: { hp: 1.12, armor: 1.1, speed: 0.93 }, bonusText: '+12% hull, +10% armor, -7% speed' },
  { id: 'concord', name: 'Pacific Concord', short: 'PCC', motto: 'Swift as wind, silent as forest.',
    hue: '#3fd0c4', palette: { base: 0xb7bbb6, dark: 0x3a4045, accent: 0x2aa39b, glow: 0x4dfff0 },
    style: 'sleek', bonus: { speed: 1.1, hp: 0.94, sight: 1.1 }, bonusText: '+10% speed, +10% sight, -6% hull' },
  { id: 'syndicate', name: 'Nova Syndicate', short: 'NVS', motto: 'Every war is a market.',
    hue: '#c58cff', palette: { base: 0x34363e, dark: 0x17181c, accent: 0xd6a630, glow: 0xc06bff },
    style: 'asym', bonus: { dmg: 1.08, rof: 1.05, armor: 0.95 }, bonusText: '+8% damage, +5% fire rate, -5% armor' },
];
SM.FACTION = {}; SM.FACTIONS.forEach(f => SM.FACTION[f.id] = f);

SM.BRANCHES = [
  { id: 'infantry', name: 'Infantry' },
  { id: 'armor', name: 'Armor' },
  { id: 'mech', name: 'Mechs' },
  { id: 'air', name: 'Aviation' },
  { id: 'naval', name: 'Naval' },
];

// ---------------------------------------------------------------- classes
// move: inf | track | wheel | hover | mech | heli | plane | naval | sub | amphib
// wt (weapon): mg auto cannon rocket missile rail laser plasma arty torpedo bomb
// aa: 0 cannot hit air, 1 helicopters only, 2 all aircraft
SM.CLASSES = {
  rifle:     { name: 'Rifle Squad', branch: 'infantry', move: 'inf', squad: 6, hp: 60, armor: 0, speed: 4.4, range: 46, dmg: 9, rof: 1.6, pen: 3, acc: 0.55, sight: 72, wt: 'mg', aa: 1, cp: 110, pop: 1, r: 4, abil: ['grenade', 'sprint', 'smoke', 'entrench'], role: 'Line infantry. Holds points, shreds other infantry.' },
  at:        { name: 'Anti-Armor Team', branch: 'infantry', move: 'inf', squad: 4, hp: 55, armor: 0, speed: 4.0, range: 62, dmg: 120, rof: 0.22, pen: 70, acc: 0.6, sight: 70, wt: 'rocket', aa: 0, cp: 160, pop: 1, r: 4, abil: ['apRound', 'sprint', 'smoke', 'mines'], role: 'Shoulder-fired missiles. Kills armor and mechs.' },
  sniper:    { name: 'Marksman Team', branch: 'infantry', move: 'inf', squad: 2, hp: 50, armor: 0, speed: 4.2, range: 115, dmg: 75, rof: 0.32, pen: 6, acc: 0.85, sight: 125, wt: 'rail', aa: 0, cp: 150, pop: 1, r: 3, abil: ['cloak', 'railCharge', 'decoy', 'sprint'], role: 'Long-range spotter. Picks off infantry from far away.' },
  exo:       { name: 'Exo-Suit Squad', branch: 'infantry', move: 'inf', squad: 3, hp: 170, armor: 12, speed: 3.6, range: 52, dmg: 30, rof: 1.4, pen: 18, acc: 0.62, sight: 70, wt: 'plasma', aa: 1, cp: 240, pop: 2, r: 4.5, abil: ['shield', 'jumpjets', 'overcharge', 'emp'], role: 'Powered armor. Tough, hits light vehicles hard.', scale: 1.35 },
  jump:      { name: 'Jump Trooper Squad', branch: 'infantry', move: 'inf', squad: 5, hp: 70, armor: 2, speed: 5.0, range: 40, dmg: 13, rof: 1.8, pen: 5, acc: 0.58, sight: 72, wt: 'mg', aa: 1, cp: 150, pop: 1, r: 4, abil: ['jumpjets', 'grenade', 'shield', 'sprint'], role: 'Jetpack shock troops. Leap onto objectives.' },
  engineer:  { name: 'Combat Engineers', branch: 'infantry', move: 'inf', squad: 4, hp: 60, armor: 0, speed: 4.2, range: 36, dmg: 8, rof: 1.5, pen: 3, acc: 0.55, sight: 70, wt: 'mg', aa: 1, cp: 130, pop: 1, r: 4, abil: ['nanoRepair', 'mines', 'drones', 'entrench'], role: 'Repairs nearby vehicles and mechs automatically.', repairAura: 9 },

  scout:     { name: 'Recon Buggy', branch: 'armor', move: 'wheel', hp: 230, armor: 6, speed: 15, range: 60, dmg: 13, rof: 4, pen: 9, acc: 0.6, sight: 118, wt: 'mg', aa: 1, cp: 140, pop: 1, r: 3.2, abil: ['overdrive', 'smoke', 'sonar', 'decoy'], role: 'Fast spotter. Sees far, flanks, dies quickly.' },
  apc:       { name: 'Armored Carrier', branch: 'armor', move: 'wheel', hp: 440, armor: 22, speed: 11.5, range: 62, dmg: 28, rof: 2, pen: 26, acc: 0.6, sight: 85, wt: 'auto', aa: 1, cp: 230, pop: 2, r: 4, abil: ['dismount', 'smoke', 'overdrive', 'repair'], role: 'Autocannon carrier. Drops a free squad once.' },
  ltank:     { name: 'Light Tank', branch: 'armor', move: 'track', hp: 540, armor: 38, speed: 11, range: 70, dmg: 90, rof: 0.36, pen: 72, acc: 0.68, sight: 90, wt: 'cannon', aa: 0, cp: 280, pop: 2, r: 4.2, abil: ['smoke', 'overdrive', 'repair', 'apRound'], role: 'Agile tank. Flanks and finishes damaged armor.' },
  mbt:       { name: 'Main Battle Tank', branch: 'armor', move: 'track', hp: 920, armor: 82, speed: 8.6, range: 76, dmg: 160, rof: 0.26, pen: 112, acc: 0.7, sight: 86, wt: 'cannon', aa: 0, cp: 430, pop: 3, r: 4.8, abil: ['smoke', 'repair', 'apRound', 'shield'], role: 'Backbone of the armored line.' },
  htank:     { name: 'Super-Heavy Tank', branch: 'armor', move: 'track', hp: 1750, armor: 140, speed: 5.6, range: 82, dmg: 220, rof: 0.21, pen: 150, acc: 0.68, sight: 82, wt: 'cannon', aa: 1, cp: 720, pop: 4, r: 6, abil: ['entrench', 'repair', 'barrage', 'shield'], role: 'Multi-turret fortress. Slow and almost unkillable.', multiTurret: true },
  td:        { name: 'Tank Destroyer', branch: 'armor', move: 'track', hp: 680, armor: 110, speed: 7.2, range: 96, dmg: 270, rof: 0.17, pen: 190, acc: 0.76, sight: 88, wt: 'rail', aa: 0, cp: 460, pop: 3, r: 4.8, abil: ['railCharge', 'cloak', 'smoke', 'entrench'], role: 'Casemate gun. Deletes heavy armor at range.', casemate: true },
  hover:     { name: 'Hover Tank', branch: 'armor', move: 'hover', hp: 600, armor: 48, speed: 13.5, range: 72, dmg: 110, rof: 0.4, pen: 85, acc: 0.68, sight: 92, wt: 'plasma', aa: 0, cp: 380, pop: 3, r: 4.5, abil: ['overdrive', 'shield', 'emp', 'cloak'], role: 'Glides over water and rough ground.' },
  arty:      { name: 'Self-Propelled Artillery', branch: 'armor', move: 'track', hp: 380, armor: 16, speed: 7, range: 265, minRange: 45, dmg: 170, rof: 0.1, pen: 60, acc: 0.5, sight: 70, wt: 'arty', aoe: 13, aa: 0, cp: 420, pop: 3, r: 4.6, abil: ['barrage', 'entrench', 'smoke', 'repair'], role: 'Long-range shelling. Weak up close.' },
  aa:        { name: 'Air Defense Vehicle', branch: 'armor', move: 'track', hp: 460, armor: 22, speed: 9, range: 115, dmg: 26, rof: 5, pen: 22, acc: 0.68, sight: 120, wt: 'auto', aa: 2, airOnly: true, cp: 300, pop: 2, r: 4.2, abil: ['ecm', 'overdrive', 'repair', 'flares'], role: 'Radar-guided guns. Shreds aircraft.' },

  lmech:     { name: 'Light Walker', branch: 'mech', move: 'mech', hp: 480, armor: 30, speed: 10, range: 60, dmg: 22, rof: 3.5, pen: 22, acc: 0.62, sight: 100, wt: 'auto', aa: 1, cp: 260, pop: 2, r: 3.8, abil: ['overdrive', 'jumpjets', 'smoke', 'flares'], role: 'Reverse-joint raider. Fast and twitchy.' },
  mmech:     { name: 'Battle Mech', branch: 'mech', move: 'mech', hp: 920, armor: 62, speed: 7, range: 72, dmg: 75, rof: 0.9, pen: 70, acc: 0.68, sight: 90, wt: 'laser', aa: 1, cp: 450, pop: 3, r: 4.6, abil: ['shield', 'overcharge', 'jumpjets', 'repair'], role: 'Humanoid frontliner with arm-mounted beams.' },
  hmech:     { name: 'Heavy Assault Mech', branch: 'mech', move: 'mech', hp: 1500, armor: 100, speed: 5.2, range: 88, dmg: 60, rof: 0.75, pen: 80, acc: 0.72, sight: 92, wt: 'missile', aa: 2, cp: 640, pop: 4, r: 5.5, abil: ['barrage', 'shield', 'ecm', 'repair'], role: 'Missile battery on legs. Also hits aircraft.' },
  spider:    { name: 'Siege Strider', branch: 'mech', move: 'mech', hp: 1150, armor: 82, speed: 6, range: 80, dmg: 125, rof: 0.5, pen: 95, acc: 0.68, sight: 88, wt: 'plasma', aa: 0, cp: 560, pop: 4, r: 5.5, abil: ['entrench', 'emp', 'drones', 'barrage'], role: 'Four-legged plasma platform. Climbs anything.', legs: 4 },
  titan:     { name: 'Titan', branch: 'mech', move: 'mech', hp: 3300, armor: 150, speed: 3.9, range: 98, dmg: 300, rof: 0.2, pen: 200, acc: 0.72, sight: 100, wt: 'rail', aa: 1, cp: 1350, pop: 6, r: 8, abil: ['orbital', 'shield', 'barrage', 'emp'], role: 'Walking warship. Calls orbital strikes.', scale: 1.9 },

  hscout:    { name: 'Scout Helicopter', branch: 'air', move: 'heli', hp: 300, armor: 6, speed: 22, range: 62, dmg: 12, rof: 5, pen: 10, acc: 0.6, sight: 135, wt: 'mg', aa: 1, cp: 220, pop: 2, r: 4, abil: ['flares', 'sonar', 'overdrive', 'smoke'], role: 'Fast eyes in the sky.' },
  hattack:   { name: 'Attack Helicopter', branch: 'air', move: 'heli', hp: 620, armor: 22, speed: 18, range: 78, dmg: 95, rof: 0.5, pen: 100, acc: 0.72, sight: 110, wt: 'missile', aa: 0, cp: 480, pop: 3, r: 5, abil: ['flares', 'barrage', 'apRound', 'repair'], role: 'Tank hunter with guided missiles.' },
  hgun:      { name: 'Heavy Gunship', branch: 'air', move: 'heli', hp: 1150, armor: 32, speed: 14, range: 72, dmg: 40, rof: 2, pen: 40, acc: 0.62, sight: 110, wt: 'auto', aa: 1, cp: 620, pop: 4, r: 6.5, abil: ['flares', 'barrage', 'drones', 'napalm'], role: 'Flying fortress. Saturates an area with fire.' },
  fighter:   { name: 'Air Superiority Fighter', branch: 'air', move: 'plane', hp: 460, armor: 10, speed: 58, range: 120, dmg: 140, rof: 0.45, pen: 60, acc: 0.75, sight: 160, wt: 'missile', aa: 2, airFirst: true, cp: 450, pop: 3, r: 6, loiter: 70, abil: ['flares', 'afterburner', 'ecm', 'overcharge'], role: 'Hunts aircraft. Weak against ground.' },
  cas:       { name: 'Attack Jet', branch: 'air', move: 'plane', hp: 620, armor: 25, speed: 46, range: 90, dmg: 55, rof: 3, pen: 55, acc: 0.6, sight: 140, wt: 'auto', aa: 0, cp: 520, pop: 3, r: 6.5, loiter: 55, abil: ['flares', 'napalm', 'barrage', 'afterburner'], role: 'Strafes ground targets with cannon and rockets.' },
  bomber:    { name: 'Strategic Bomber', branch: 'air', move: 'plane', hp: 950, armor: 30, speed: 40, range: 60, dmg: 260, rof: 0.35, pen: 90, acc: 0.55, sight: 130, wt: 'bomb', aoe: 14, aa: 0, cp: 720, pop: 4, r: 9, loiter: 45, abil: ['carpet', 'flares', 'ecm', 'afterburner'], role: 'Flattens whatever sits under it.' },
  drone:     { name: 'Combat Drone', branch: 'air', move: 'plane', hp: 260, armor: 4, speed: 34, range: 95, dmg: 85, rof: 0.4, pen: 85, acc: 0.68, sight: 150, wt: 'missile', aa: 0, cp: 300, pop: 2, r: 4, loiter: 95, abil: ['ecm', 'cloak', 'barrage', 'overdrive'], role: 'Long loiter, cheap, precise.' },

  patrol:    { name: 'Patrol Boat', branch: 'naval', move: 'naval', hp: 360, armor: 8, speed: 17, range: 62, dmg: 15, rof: 4, pen: 12, acc: 0.58, sight: 115, wt: 'mg', aa: 1, cp: 200, pop: 2, r: 4.5, abil: ['smoke', 'overdrive', 'sonar', 'repair'], role: 'Fast coastal gunboat.' },
  hovercraft:{ name: 'Assault Hovercraft', branch: 'naval', move: 'amphib', hp: 520, armor: 18, speed: 14, range: 66, dmg: 26, rof: 2, pen: 26, acc: 0.6, sight: 100, wt: 'auto', aa: 1, cp: 300, pop: 2, r: 5, abil: ['dismount', 'smoke', 'overdrive', 'repair'], role: 'Crosses beaches. Lands a squad.' },
  destroyer: { name: 'Destroyer', branch: 'naval', move: 'naval', hp: 1850, armor: 60, speed: 9.5, range: 125, dmg: 120, rof: 0.45, pen: 95, acc: 0.65, sight: 130, wt: 'cannon', aa: 2, cp: 680, pop: 4, r: 9, abil: ['barrage', 'sonar', 'ecm', 'repair'], role: 'Fast escort with deck guns and air defense.' },
  cruiser:   { name: 'Missile Cruiser', branch: 'naval', move: 'naval', hp: 3000, armor: 90, speed: 7.5, range: 165, dmg: 150, rof: 0.35, pen: 110, acc: 0.72, sight: 140, wt: 'missile', aa: 2, cp: 950, pop: 5, r: 11, abil: ['barrage', 'ecm', 'shield', 'repair'], role: 'Vertical launch cells. Covers half the map.' },
  battleship:{ name: 'Battleship', branch: 'naval', move: 'naval', hp: 5200, armor: 140, speed: 5.5, range: 215, minRange: 30, dmg: 260, rof: 0.16, pen: 160, acc: 0.55, sight: 130, wt: 'arty', aoe: 16, aa: 1, cp: 1400, pop: 6, r: 13, abil: ['barrage', 'overcharge', 'repair', 'smoke'], role: 'Floating artillery. Ruins coastlines.' },
  sub:       { name: 'Attack Submarine', branch: 'naval', move: 'sub', hp: 950, armor: 40, speed: 8.5, range: 90, dmg: 420, rof: 0.12, pen: 160, acc: 0.8, sight: 90, wt: 'torpedo', navalOnly: true, aa: 0, cp: 620, pop: 3, r: 7, abil: ['torpedo', 'cloak', 'sonar', 'repair'], role: 'Hidden below the waves. Sinks ships.' },
};
for (const k in SM.CLASSES) SM.CLASSES[k].key = k;

SM.isAir = cls => cls.move === 'heli' || cls.move === 'plane';
SM.isNaval = cls => cls.move === 'naval' || cls.move === 'sub' || cls.move === 'amphib';

// ---------------------------------------------------------------- abilities
// target: self | point
SM.ABILITIES = {
  smoke:      { name: 'Smoke Screen', target: 'point', range: 60, cd: 35, icon: 'SMK', desc: 'Drops a smoke wall. Units inside are hard to hit.' },
  sprint:     { name: 'Sprint', target: 'self', cd: 30, icon: 'SPR', desc: '+60% speed for 8 s.' },
  overdrive:  { name: 'Overdrive', target: 'self', cd: 32, icon: 'OVR', desc: '+60% speed for 8 s.' },
  afterburner:{ name: 'Afterburner', target: 'self', cd: 30, icon: 'A/B', desc: '+70% speed and evasion for 7 s.' },
  repair:     { name: 'Field Repair', target: 'self', cd: 50, icon: 'REP', desc: 'Restores 35% hull over 6 s.' },
  shield:     { name: 'Energy Shield', target: 'self', cd: 45, icon: 'SHD', desc: 'Absorbs 30% of max hull for 10 s.' },
  barrage:    { name: 'Saturation Barrage', target: 'point', range: 140, cd: 55, icon: 'BRG', desc: 'Eight rounds rain on a 20 m circle.' },
  emp:        { name: 'EMP Burst', target: 'self', cd: 50, icon: 'EMP', desc: 'Stuns enemy machines within 32 m for 4 s.' },
  cloak:      { name: 'Active Camo', target: 'self', cd: 45, icon: 'CLK', desc: 'Invisible for 10 s unless enemies are close. Firing breaks it.' },
  flares:     { name: 'Flares', target: 'self', cd: 25, icon: 'FLR', desc: 'Missiles miss and AA loses lock for 6 s.' },
  orbital:    { name: 'Orbital Lance', target: 'point', range: 220, cd: 120, icon: 'ORB', desc: 'After 3 s, a beam from orbit hits an 18 m circle.' },
  napalm:     { name: 'Napalm Line', target: 'point', range: 120, cd: 50, icon: 'NAP', desc: 'Burns a 16 m area for 8 s.' },
  carpet:     { name: 'Carpet Bombing', target: 'point', range: 220, cd: 60, icon: 'CRP', desc: 'Twelve bombs along the flight line.' },
  jumpjets:   { name: 'Jump Jets', target: 'point', range: 60, cd: 28, icon: 'JMP', desc: 'Leap to a point within 60 m.' },
  grenade:    { name: 'Grenade Volley', target: 'point', range: 36, cd: 22, icon: 'GRN', desc: 'Lobbed grenades. Deadly to infantry.' },
  mines:      { name: 'Lay Mines', target: 'point', range: 30, cd: 45, icon: 'MIN', desc: 'Plants three mines that wreck vehicles.' },
  entrench:   { name: 'Siege Mode', target: 'self', cd: 4, icon: 'SIG', toggle: true, desc: 'Toggle: immobile, +40% range and +30% armor.' },
  apRound:    { name: 'Sabot Round', target: 'self', cd: 24, icon: 'AP', desc: 'Next shot has double penetration and +50% damage.' },
  railCharge: { name: 'Capacitor Shot', target: 'self', cd: 30, icon: 'CAP', desc: 'Next shot deals triple damage.' },
  overcharge: { name: 'Overcharge', target: 'self', cd: 40, icon: 'OVC', desc: 'Double fire rate for 6 s.' },
  sonar:      { name: 'Sensor Sweep', target: 'self', cd: 40, icon: 'SNR', desc: 'Reveals all enemies within 160 m for 8 s, including cloaked ones.' },
  decoy:      { name: 'Holo Decoy', target: 'point', range: 50, cd: 45, icon: 'HOL', desc: 'Projects a fake unit that draws fire for 12 s.' },
  drones:     { name: 'Drone Swarm', target: 'self', cd: 60, icon: 'DRN', desc: 'Launches three attack drones for 25 s.' },
  dismount:   { name: 'Dismount Squad', target: 'self', cd: 150, icon: 'DSM', desc: 'Deploys a free rifle squad.' },
  ecm:        { name: 'ECM Jammer', target: 'self', cd: 45, icon: 'ECM', desc: 'Enemies within 45 m lose 40% accuracy for 8 s.' },
  nanoRepair: { name: 'Nano Cloud', target: 'self', cd: 45, icon: 'NAN', desc: 'Heals allies within 30 m by 25% over 5 s.' },
  torpedo:    { name: 'Torpedo Spread', target: 'point', range: 120, cd: 35, icon: 'TRP', desc: 'Fires three torpedoes at a ship.' },
};

// ---------------------------------------------------------------- tech lines
SM.LINES = {
  infantry: [
    { id: 'assault', name: 'Assault', seq: [['rifle'], ['rifle', 'jump'], ['rifle'], ['jump', 'rifle'], ['exo'], ['exo', 'jump']] },
    { id: 'antiarmor', name: 'Anti-Armor', seq: [['at'], ['at'], ['at', 'at'], ['at'], ['exo'], ['at', 'exo']] },
    { id: 'specialist', name: 'Specialists', seq: [['sniper'], ['engineer', 'sniper'], ['sniper'], ['engineer'], ['sniper'], ['sniper', 'engineer']] },
    { id: 'heavyinf', name: 'Heavy Infantry', seq: [['rifle'], ['exo'], ['exo', 'jump'], ['exo'], ['exo'], ['exo', 'exo']] },
  ],
  armor: [
    { id: 'recon', name: 'Reconnaissance', seq: [['scout'], ['scout', 'apc'], ['scout'], ['apc'], ['scout'], ['apc']] },
    { id: 'medium', name: 'Medium Armor', seq: [['ltank'], ['ltank'], ['mbt'], ['mbt', 'ltank'], ['mbt'], ['mbt', 'mbt']] },
    { id: 'heavy', name: 'Heavy Armor', seq: [['ltank'], ['mbt'], ['htank'], ['htank'], ['htank', 'td'], ['htank']] },
    { id: 'destroyers', name: 'Tank Destroyers', seq: [['td'], ['td'], ['td', 'hover'], ['td'], ['hover'], ['td', 'hover']] },
    { id: 'support', name: 'Fire Support', seq: [['arty'], ['aa'], ['arty', 'aa'], ['arty'], ['aa', 'arty'], ['arty', 'aa']] },
  ],
  mech: [
    { id: 'lightmech', name: 'Light Walkers', seq: [['lmech'], ['lmech'], ['lmech', 'mmech'], ['lmech'], ['mmech'], ['lmech', 'mmech']] },
    { id: 'battlemech', name: 'Battle Mechs', seq: [['mmech'], ['mmech'], ['mmech', 'hmech'], ['hmech'], ['hmech', 'spider'], ['mmech', 'hmech']] },
    { id: 'siegemech', name: 'Siege Frames', seq: [['lmech'], ['spider'], ['spider'], ['hmech'], ['spider'], ['titan', 'titan']] },
  ],
  air: [
    { id: 'rotary', name: 'Rotary Wing', seq: [['hscout'], ['hscout', 'hattack'], ['hattack'], ['hattack', 'hgun'], ['hgun'], ['hgun', 'hattack']] },
    { id: 'fighters', name: 'Fighters', seq: [['fighter'], ['fighter'], ['fighter'], ['fighter', 'drone'], ['fighter'], ['fighter', 'drone']] },
    { id: 'strike', name: 'Strike Aircraft', seq: [['cas'], ['cas'], ['cas', 'bomber'], ['bomber'], ['cas', 'bomber'], ['bomber', 'cas']] },
    { id: 'unmanned', name: 'Unmanned', seq: [['drone'], ['drone'], ['drone', 'hscout'], ['drone'], ['drone'], ['drone']] },
  ],
  naval: [
    { id: 'coastal', name: 'Coastal Forces', seq: [['patrol'], ['patrol', 'hovercraft'], ['hovercraft'], ['patrol'], ['hovercraft'], ['patrol', 'hovercraft']] },
    { id: 'surface', name: 'Surface Fleet', seq: [['patrol'], ['destroyer'], ['destroyer'], ['cruiser'], ['cruiser', 'destroyer'], ['battleship']] },
    { id: 'subsurface', name: 'Subsurface', seq: [['sub'], ['sub'], ['sub'], ['sub', 'cruiser'], ['sub'], ['sub', 'battleship']] },
  ],
};

// ---------------------------------------------------------------- naming
SM.NAMES = {
  coalition: ['Warden', 'Bulwark', 'Lancer', 'Sentinel', 'Paladin', 'Ranger', 'Vanguard', 'Templar', 'Valkyrie', 'Osprey', 'Harrier', 'Raptor', 'Bastion', 'Guardian', 'Patriot', 'Minuteman', 'Liberty', 'Ironside', 'Constitution', 'Trident', 'Archer', 'Falcon', 'Mustang', 'Colossus', 'Atlas', 'Hercules', 'Spartan', 'Centurion', 'Marshal', 'Sheriff', 'Rampart', 'Hawkeye', 'Kestrel', 'Cobra', 'Viper', 'Apache', 'Comanche', 'Sabre', 'Claymore', 'Excalibur', 'Pathfinder', 'Frontier', 'Pioneer', 'Ironclad', 'Defiant', 'Resolute', 'Valiant', 'Intrepid', 'Steadfast', 'Granite'],
  federation: ['Grom', 'Medved', 'Volk', 'Burya', 'Molot', 'Sokol', 'Taiga', 'Vikhr', 'Kord', 'Topol', 'Buran', 'Shtorm', 'Berkut', 'Krechet', 'Sarmat', 'Kurgan', 'Bogatyr', 'Vityaz', 'Rubin', 'Almaz', 'Zubr', 'Tigr', 'Rys', 'Yastreb', 'Kondor', 'Strela', 'Uragan', 'Tornado', 'Smerch', 'Tsiklon', 'Kometa', 'Zarya', 'Vostok', 'Sever', 'Yenisei', 'Volga', 'Ural', 'Altai', 'Baikal', 'Kamchatka', 'Pechora', 'Don', 'Neva', 'Amur', 'Oka', 'Svyatogor', 'Ilya', 'Dobrynya', 'Kremen', 'Granit'],
  concord: ['Kaze', 'Raiden', 'Tsurugi', 'Hayabusa', 'Kirin', 'Susanoo', 'Ryu', 'Shiden', 'Hien', 'Tenrai', 'Kagero', 'Yukikaze', 'Akatsuki', 'Hibiki', 'Fubuki', 'Shiranui', 'Mikazuki', 'Hayate', 'Inazuma', 'Kongo', 'Haruna', 'Kirishima', 'Fuso', 'Ise', 'Mogami', 'Tone', 'Suzuya', 'Kumano', 'Aoba', 'Kinu', 'Natori', 'Sendai', 'Jintsu', 'Naka', 'Yubari', 'Kujaku', 'Tsubame', 'Taka', 'Washi', 'Tora', 'Hyo', 'Kuma', 'Ookami', 'Kitsune', 'Tanuki', 'Shishi', 'Sakura', 'Ume', 'Kiku', 'Momiji'],
  syndicate: ['Helix', 'Vortex', 'Cipher', 'Wraith', 'Neon', 'Pulse', 'Specter', 'Arc', 'Flux', 'Zenith', 'Nadir', 'Quasar', 'Pulsar', 'Nova', 'Vector', 'Matrix', 'Vertex', 'Axiom', 'Glyph', 'Rune', 'Shard', 'Prism', 'Lumen', 'Umbra', 'Penumbra', 'Ion', 'Photon', 'Quark', 'Boson', 'Hadron', 'Tachyon', 'Graviton', 'Parallax', 'Paradox', 'Enigma', 'Omen', 'Hex', 'Sigil', 'Talon', 'Razor', 'Stiletto', 'Kunai', 'Venom', 'Mamba', 'Krait', 'Asp', 'Basilisk', 'Chimera', 'Hydra', 'Manticore'],
};
SM.DESIG = {
  coalition: { inf: 'Team', track: 'M', wheel: 'LAV-', hover: 'XM', mech: 'MX-', heli: 'AH-', plane: 'F-', naval: 'DDG-', sub: 'SSN-', amphib: 'LCAC-' },
  federation: { inf: 'Otryad', track: 'T-', wheel: 'BTR-', hover: 'Obj.', mech: 'ShM-', heli: 'Ka-', plane: 'Su-', naval: 'Pr.', sub: 'K-', amphib: 'Zubr-' },
  concord: { inf: 'Butai', track: 'Type ', wheel: 'Type ', hover: 'Type ', mech: 'RX-', heli: 'OH-', plane: 'F-', naval: 'DD-', sub: 'SS-', amphib: 'LC-' },
  syndicate: { inf: 'Cell', track: 'SX-', wheel: 'SX-', hover: 'HX-', mech: 'NX-', heli: 'VX-', plane: 'ZX-', naval: 'CX-', sub: 'UX-', amphib: 'AX-' },
};
SM.CLASS_PREFIX = { scout: 'R', apc: 'C', ltank: 'L', mbt: '', htank: 'H', td: 'D', hover: 'G', arty: 'A', aa: 'Q', fighter: '', cas: 'A', bomber: 'B', drone: 'Q', hscout: 'O', hattack: '', hgun: 'G' };

// ---------------------------------------------------------------- unit generation
SM.UNITS = {};
SM.UNIT_LIST = [];
SM.TREE = {}; // faction -> branch -> lines [{line, nodes:[unitIds by rank]}]

SM.weaponFor = function (cls, fac, rank) {
  let wt = cls.wt;
  if (wt === 'cannon' && rank >= 4) { if (fac === 'concord') wt = 'rail'; if (fac === 'syndicate') wt = 'plasma'; }
  if (wt === 'mg' && rank >= 3 && fac === 'syndicate') wt = 'laser';
  if (wt === 'auto' && rank >= 5 && fac === 'concord') wt = 'laser';
  if (wt === 'laser' && fac === 'federation') wt = 'cannon';
  if (wt === 'plasma' && fac === 'federation') wt = 'cannon';
  if (wt === 'plasma' && fac === 'coalition' && cls.key !== 'exo') wt = 'rail';
  return wt;
};

SM.statBlock = function (cls, fac, rank, r, power) {
  const b = SM.FACTION[fac].bonus;
  const rm = 1 + 0.2 * (rank - 1);
  const v = () => 0.94 + r() * 0.12;
  const s = {
    hp: Math.round(cls.hp * rm * (b.hp || 1) * v() * power),
    armor: Math.round(cls.armor * (1 + 0.15 * (rank - 1)) * (b.armor || 1) * v() * power),
    speed: +(cls.speed * (1 + 0.025 * (rank - 1)) * (b.speed || 1) * v()).toFixed(1),
    range: Math.round(cls.range * (1 + 0.03 * (rank - 1)) * v()),
    dmg: Math.round(cls.dmg * (1 + 0.16 * (rank - 1)) * (b.dmg || 1) * v() * power),
    rof: +(cls.rof * (1 + 0.03 * (rank - 1)) * (b.rof || 1) * v()).toFixed(2),
    pen: Math.round(cls.pen * (1 + 0.17 * (rank - 1)) * v() * power),
    acc: +Math.min(0.95, cls.acc * (b.acc || 1) * (1 + 0.02 * (rank - 1))).toFixed(2),
    sight: Math.round(cls.sight * (b.sight || 1) * (1 + 0.02 * (rank - 1))),
  };
  s.cp = Math.round(cls.cp * (1 + 0.22 * (rank - 1)) * (0.5 + 0.5 * power) / 5) * 5;
  return s;
};

SM.makeUnit = function (o) {
  // o: {id, fac, cls, rank, name, line, branch, exclusive, finish, power, seed}
  const cls = SM.CLASSES[o.cls];
  const r = SM.rng(o.seed || SM.hash(o.id));
  const stats = SM.statBlock(cls, o.fac, o.rank, r, o.power || 1);
  const u = {
    id: o.id, name: o.name, fac: o.fac, cls: o.cls, branch: cls.branch, line: o.line || null, rank: o.rank,
    wt: SM.weaponFor(cls, o.fac, o.rank), seed: o.seed || SM.hash(o.id),
    exclusive: !!o.exclusive, source: o.source || 'tree', finish: o.finish || null,
    parent: o.parent || null, rp: 0, price: 0, ...stats,
  };
  u.rp = Math.round(700 * Math.pow(1.85, o.rank - 1) / 10) * 10;
  u.price = Math.round(1200 * Math.pow(1.95, o.rank - 1) / 100) * 100;
  u.mods = SM.makeMods(u);
  return u;
};

SM.unitName = function (fac, cls, rank, used, r) {
  const pool = SM.NAMES[fac];
  const des = SM.DESIG[fac][cls.move === 'inf' ? 'inf' : cls.move];
  for (let tries = 0; tries < 60; tries++) {
    const nm = SM.pick(r, pool);
    let d;
    if (cls.move === 'inf') d = nm + ' ' + des;
    else {
      const num = (fac === 'federation' ? 10 * rank + Math.floor(r() * 90) : rank * 10 + Math.floor(r() * 10));
      const pre = SM.CLASS_PREFIX[cls.key] || '';
      d = (fac === 'concord' && des === 'Type ' ? 'Type ' + (rank * 10 + Math.floor(r() * 10)) : des + pre + num) + ' ' + nm;
      if (fac === 'coalition' && cls.move === 'track' && r() < 0.5) d = des + num + 'A' + (1 + Math.floor(r() * 4)) + ' ' + nm;
    }
    if (!used.has(d)) { used.add(d); return d; }
  }
  const d = des + Math.floor(r() * 9999) + ' ' + SM.pick(r, pool) + ' ' + SM.ROMAN[rank];
  used.add(d); return d;
};

SM.registerUnit = function (u) { if (!SM.UNITS[u.id]) { SM.UNITS[u.id] = u; SM.UNIT_LIST.push(u); } return SM.UNITS[u.id]; };

SM.buildTrees = function () {
  const used = new Set();
  for (const f of SM.FACTIONS) {
    SM.TREE[f.id] = {};
    for (const br of SM.BRANCHES) {
      const lines = SM.LINES[br.id];
      SM.TREE[f.id][br.id] = lines.map(line => {
        const nodes = [];
        let prevFirst = null;
        line.seq.forEach((slot, ri) => {
          const rank = ri + 1;
          const firstOfRank = [];
          slot.forEach((ck, si) => {
            const id = f.id + '.' + line.id + '.' + rank + '.' + si;
            const r = SM.rng(SM.hash(id + 'name'));
            const u = SM.makeUnit({ id, fac: f.id, cls: ck, rank, line: line.id, name: SM.unitName(f.id, SM.CLASSES[ck], rank, used, r), parent: prevFirst });
            if (si > 0) { u.rp = Math.round(u.rp * 1.15 / 10) * 10; u.price = Math.round(u.price * 1.1 / 100) * 100; }
            SM.registerUnit(u);
            nodes.push(u.id); firstOfRank.push(u.id);
          });
          prevFirst = firstOfRank[0];
        });
        return { line, nodes };
      });
    }
  }
};

// ---------------------------------------------------------------- per-unit modification trees
SM.MOD_TEMPLATES = {
  t1: [
    { key: 'optics', name: 'Advanced Optics', eff: { sight: 0.15 }, desc: '+15% sight range' },
    { key: 'liner', name: 'Spall Liner', eff: { hp: 0.1 }, desc: '+10% hull' },
  ],
  t2: [
    { key: 'era', name: 'Reactive Armor', eff: { armor: 0.22 }, vis: 'era', desc: '+22% armor. Adds armor blocks.' },
    { key: 'abilA', name: 'Ability Module', ability: 1, desc: 'Unlocks a second ability' },
  ],
  t3: [
    { key: 'gun', name: 'Mk.II Armament', eff: { dmg: 0.15, pen: 0.1 }, vis: 'gun', desc: '+15% damage, +10% penetration. New weapon look.' },
    { key: 'engine', name: 'Drive Overhaul', eff: { speed: 0.12 }, vis: 'engine', desc: '+12% speed. Upgraded drive.' },
    { key: 'loader', name: 'Autoloader', eff: { rof: 0.12 }, desc: '+12% fire rate' },
  ],
  t4: [
    { key: 'abilB', name: 'Tactical Suite', ability: 2, desc: 'Unlocks a third ability' },
    { key: 'elite', name: 'Elite Package', eff: { hp: 0.05, dmg: 0.05, acc: 0.05, armor: 0.05 }, vis: 'elite', desc: '+5% to everything. Veteran markings and gear.' },
  ],
  t5: [
    { key: 'abilC', name: 'Prototype Systems', ability: 3, desc: 'Unlocks a fourth ability' },
  ],
};
SM.makeMods = function (u) {
  const out = [];
  const tiers = ['t1', 't2', 't3', 't4', 't5'];
  tiers.forEach((t, ti) => {
    SM.MOD_TEMPLATES[t].forEach(m => {
      out.push({ id: m.key, tier: ti + 1, name: m.name, desc: m.desc, eff: m.eff || null, vis: m.vis || null, ability: m.ability || 0,
        cost: Math.round(180 * (ti + 1) * (1 + 0.45 * (u.rank - 1)) / 10) * 10 });
    });
  });
  return out;
};
SM.unitAbilities = function (u, mods) {
  const cls = SM.CLASSES[u.cls];
  const list = [cls.abil[0]];
  const has = id => mods && mods.indexOf(id) >= 0;
  if (has('abilA') || u.exclusive) list.push(cls.abil[1]);
  if (has('abilB') || u.exclusive) list.push(cls.abil[2]);
  if (has('abilC') || u.exclusive) list.push(cls.abil[3]);
  return list;
};
SM.visFlags = function (u, mods) {
  const v = {};
  (mods || []).forEach(m => { const md = u.mods.find(x => x.id === m); if (md && md.vis) v[md.vis] = true; });
  if (u.exclusive) { v.elite = true; v.gun = true; v.era = true; }
  return v;
};

// ---------------------------------------------------------------- skins
SM.SKINS = {
  factory:  { name: 'Factory Finish', rarity: 0 },
  woodland: { name: 'Woodland', rarity: 0 },
  desert:   { name: 'Desert Storm', rarity: 0 },
  arctic:   { name: 'Arctic Ghost', rarity: 0 },
  digital:  { name: 'Urban Digital', rarity: 1 },
  tiger:    { name: 'Tiger Stripe', rarity: 1 },
  splinter: { name: 'Splinter', rarity: 1 },
  hex:      { name: 'Hexgrid', rarity: 1 },
  navy:     { name: 'Deep Navy', rarity: 1 },
  jungle:   { name: 'Rainforest', rarity: 1 },
  nightops: { name: 'Night Ops', rarity: 2 },
  crimson:  { name: 'Crimson Fang', rarity: 2 },
  dazzle:   { name: 'Dazzle', rarity: 2 },
  toxic:    { name: 'Biohazard', rarity: 2 },
  sakura:   { name: 'Sakura Storm', rarity: 2 },
  bone:     { name: 'Bone Yard', rarity: 2 },
  circuit:  { name: 'Neon Circuit', rarity: 3 },
  carbon:   { name: 'Carbon Weave', rarity: 3 },
  lava:     { name: 'Magma Core', rarity: 3 },
  glacier:  { name: 'Glacial Shard', rarity: 3 },
  obsidian: { name: 'Obsidian Edge', rarity: 3 },
  chrome:   { name: 'Mirror Chrome', rarity: 4 },
  gold:     { name: 'Sovereign Gold', rarity: 4 },
  galaxy:   { name: 'Event Horizon', rarity: 4 },
  holo:     { name: 'Prismatic Holo', rarity: 4 },
};
SM.RARITY = [
  { name: 'Common', color: '#9aa4ad' },
  { name: 'Rare', color: '#4f9cf0' },
  { name: 'Epic', color: '#b46cf2' },
  { name: 'Legendary', color: '#f2a23a' },
  { name: 'Mythic', color: '#ff4f6d' },
];
SM.SKIN_ATTRS = [
  { k: 'armor', t: 'Armor', unit: '%' }, { k: 'hp', t: 'Hull', unit: '%' }, { k: 'speed', t: 'Speed', unit: '%' },
  { k: 'rof', t: 'Fire rate', unit: '%' }, { k: 'sight', t: 'Sight', unit: '%' }, { k: 'stealth', t: 'Detection', unit: '%', neg: true },
  { k: 'xp', t: 'Unit XP', unit: '%' }, { k: 'credits', t: 'Credits', unit: '%' }, { k: 'acc', t: 'Accuracy', unit: '%' },
];
SM.skinAttrs = function (unitId, pattern) {
  const sk = SM.SKINS[pattern];
  if (!sk || pattern === 'factory') return {};
  const r = SM.rng(SM.hash(unitId + ':' + pattern));
  const n = sk.rarity >= 3 ? 3 : sk.rarity >= 1 ? 2 : 1;
  const out = {};
  const pool = SM.SKIN_ATTRS.slice();
  for (let i = 0; i < n && pool.length; i++) {
    const a = pool.splice(Math.floor(r() * pool.length), 1)[0];
    out[a.k] = Math.round((2 + sk.rarity * 1.5 + r() * 3)) / 100;
  }
  return out;
};
SM.skinAttrText = function (attrs) {
  return Object.keys(attrs).map(k => {
    const a = SM.SKIN_ATTRS.find(x => x.k === k);
    return (a.neg ? '-' : '+') + Math.round(attrs[k] * 100) + '% ' + a.t;
  });
};

// ---------------------------------------------------------------- exclusives (shop giveaways, crates, battle pass)
SM.EXCL_TITLES = ['Sovereign', 'Eclipse', 'Leviathan', 'Phoenix', 'Nemesis', 'Aurora', 'Oblivion', 'Tempest', 'Seraph', 'Ragnarok', 'Basilisk', 'Gorgon', 'Warlord', 'Dreadnought', 'Inferno', 'Zephyr', 'Revenant', 'Monarch', 'Juggernaut', 'Valhalla', 'Cerberus', 'Polaris', 'Maelstrom', 'Harbinger'];
SM.FINISHES = ['gold', 'chrome', 'obsidian', 'galaxy', 'holo', 'lava', 'circuit', 'glacier'];
SM.makeExclusive = function (id, source, seedStr, opts) {
  if (SM.UNITS[id]) return SM.UNITS[id];
  const r = SM.rng(SM.hash(seedStr));
  const classes = (opts && opts.classes) || ['mbt', 'htank', 'mmech', 'hmech', 'titan', 'hattack', 'fighter', 'bomber', 'hover', 'spider', 'exo', 'destroyer', 'td', 'lmech', 'hgun', 'cas', 'cruiser', 'scout'];
  const cls = SM.pick(r, classes);
  const fac = (opts && opts.fac) || SM.pick(r, SM.FACTIONS).id;
  const rank = (opts && opts.rank) || (4 + Math.floor(r() * 3));
  const title = SM.pick(r, SM.EXCL_TITLES);
  const finish = (opts && opts.finish) || SM.pick(r, SM.FINISHES);
  const des = SM.DESIG[fac][SM.CLASSES[cls].move === 'inf' ? 'inf' : SM.CLASSES[cls].move];
  const name = (SM.CLASSES[cls].move === 'inf' ? title + ' ' + des : des + (90 + Math.floor(r() * 9)) + ' ' + title);
  const u = SM.makeUnit({ id, fac, cls, rank, name, exclusive: true, source, finish, power: 1.15, seed: SM.hash(seedStr + 'm') });
  u.price = 0; u.rp = 0;
  return SM.registerUnit(u);
};
SM.getUnit = function (id) {
  if (SM.UNITS[id]) return SM.UNITS[id];
  // exclusives encode their generator in the id
  let m;
  if ((m = /^gw_(\d+)_(\d+)$/.exec(id))) return SM.makeExclusive(id, 'shop', 'giveaway' + m[1] + '_' + m[2]);
  if ((m = /^bp_(\d+)_(\d+)$/.exec(id))) return SM.makeExclusive(id, 'bp', 'season' + m[1] + '_' + m[2]);
  if ((m = /^cr_(\d+)$/.exec(id))) return SM.makeExclusive(id, 'crate', 'crate' + m[1]);
  return null;
};

// ---------------------------------------------------------------- biomes, maps, weather
SM.WEATHER = {
  clear:      { name: 'Clear Skies', p: null, fog: 0.0011, light: 1, sight: 1, acc: 1, speed: 1, air: 1, clouds: 0.25, desc: 'No modifiers.' },
  overcast:   { name: 'Overcast', p: null, fog: 0.0016, light: 0.72, sight: 0.95, acc: 1, speed: 1, air: 1, clouds: 0.85, desc: 'Sight -5%.' },
  heatwave:   { name: 'Heatwave', p: 'haze', n: 400, fog: 0.0019, light: 1.18, sight: 0.85, acc: 0.92, speed: 0.95, air: 1, clouds: 0.05, tint: 0xffd9a0, desc: 'Shimmer. Sight -15%, accuracy -8%.' },
  duststorm:  { name: 'Dust Storm', p: 'sand', n: 1400, fog: 0.0045, light: 0.78, sight: 0.75, acc: 0.88, speed: 0.95, air: 0.85, clouds: 0.5, fogColor: 0xc8a372, wind: 18, desc: 'Sight -25%, accuracy -12%.' },
  sandstorm:  { name: 'Sandstorm', p: 'sand', n: 3200, fog: 0.0095, light: 0.55, sight: 0.55, acc: 0.75, speed: 0.85, air: 0.7, clouds: 0.9, fogColor: 0xb98a52, wind: 34, sound: 'wind', desc: 'Wall of sand. Sight -45%, accuracy -25%, aircraft accuracy -30%.' },
  drizzle:    { name: 'Drizzle', p: 'rain', n: 1200, fog: 0.0022, light: 0.75, sight: 0.92, acc: 0.97, speed: 0.98, air: 0.95, clouds: 0.8, sound: 'rainLight', desc: 'Sight -8%.' },
  downpour:   { name: 'Heavy Downpour', p: 'rain', n: 4200, fog: 0.0048, light: 0.5, sight: 0.7, acc: 0.85, speed: 0.85, air: 0.8, clouds: 1, sound: 'rain', desc: 'Mud slows ground units 15%. Sight -30%.' },
  monsoon:    { name: 'Monsoon Deluge', p: 'rain', n: 5200, fog: 0.006, light: 0.42, sight: 0.62, acc: 0.8, speed: 0.8, air: 0.7, clouds: 1, lightning: 0.6, sound: 'rain', wind: 10, desc: 'Torrential rain and lightning. Ground speed -20%, aircraft accuracy -30%.' },
  thunder:    { name: 'Thunderstorm', p: 'rain', n: 3200, fog: 0.004, light: 0.48, sight: 0.75, acc: 0.88, speed: 0.9, air: 0.8, clouds: 1, lightning: 1, sound: 'rain', desc: 'Lightning strikes. Sight -25%.' },
  fog:        { name: 'Dense Fog', p: 'mist', n: 300, fog: 0.011, light: 0.68, sight: 0.5, acc: 0.92, speed: 1, air: 0.75, clouds: 0.9, fogColor: 0xb8c0c4, desc: 'Sight -50%. Ambush weather.' },
  snowfall:   { name: 'Snowfall', p: 'snow', n: 2200, fog: 0.0028, light: 0.82, sight: 0.85, acc: 0.95, speed: 0.92, air: 0.9, clouds: 0.85, fogColor: 0xd8e2ea, desc: 'Sight -15%, speed -8%.' },
  blizzard:   { name: 'Blizzard', p: 'snow', n: 5200, fog: 0.0105, light: 0.55, sight: 0.5, acc: 0.78, speed: 0.75, air: 0.6, clouds: 1, fogColor: 0xdfe8ef, wind: 30, sound: 'wind', desc: 'Whiteout. Sight -50%, speed -25%, aircraft accuracy -40%.' },
  freezefog:  { name: 'Freezing Fog', p: 'snow', n: 600, fog: 0.009, light: 0.66, sight: 0.6, acc: 0.9, speed: 0.92, air: 0.75, clouds: 0.95, fogColor: 0xc9d6df, desc: 'Ice haze. Sight -40%.' },
  ash:        { name: 'Ashfall', p: 'ash', n: 2400, fog: 0.0055, light: 0.6, sight: 0.7, acc: 0.9, speed: 0.95, air: 0.8, clouds: 1, fogColor: 0x5d5754, desc: 'Volcanic ash. Sight -30%, aircraft accuracy -20%.' },
  embers:     { name: 'Ember Storm', p: 'ember', n: 1600, fog: 0.0045, light: 0.62, sight: 0.75, acc: 0.92, speed: 1, air: 0.75, clouds: 1, fogColor: 0x5a3328, desc: 'Burning cinders. Infantry take light damage.', burnInf: 1.5 },
  acid:       { name: 'Acid Rain', p: 'rain', n: 3000, fog: 0.0042, light: 0.55, sight: 0.8, acc: 0.95, speed: 0.95, air: 0.85, clouds: 1, rainColor: 0xb6ff7a, fogColor: 0x5b6648, sound: 'rain', desc: 'Corrosive. All units lose hull slowly.', corrode: 1.2 },
  smog:       { name: 'Industrial Smog', p: 'mist', n: 300, fog: 0.0075, light: 0.62, sight: 0.62, acc: 0.92, speed: 1, air: 0.85, clouds: 1, fogColor: 0x777061, desc: 'Sight -38%.' },
  ion:        { name: 'Ion Storm', p: 'spark', n: 900, fog: 0.004, light: 0.55, sight: 0.8, acc: 0.9, speed: 1, air: 0.75, clouds: 1, lightning: 0.8, boltColor: 0xc28bff, fogColor: 0x3a2d55, desc: 'Energy weapons +20% damage. Shields recharge abilities faster.', energy: 1.2 },
  radiation:  { name: 'Radiation Front', p: 'spark', n: 700, fog: 0.004, light: 0.7, sight: 0.85, acc: 0.95, speed: 1, air: 0.9, clouds: 0.8, fogColor: 0x6f7a3b, tint: 0xd8ff9a, desc: 'Infantry take light damage. Sight -15%.', burnInf: 1.2 },
  aurora:     { name: 'Aurora Night', p: null, fog: 0.0016, light: 0.9, sight: 0.95, acc: 1, speed: 1, air: 1, clouds: 0.1, aurora: 1, desc: 'Calm, cold and beautiful.' },
  drylight:   { name: 'Dry Lightning', p: 'sand', n: 500, fog: 0.0024, light: 0.7, sight: 0.9, acc: 0.95, speed: 1, air: 0.85, clouds: 0.85, lightning: 1, desc: 'Lightning with no rain. Strikes can hit units.' },
  squall:     { name: 'Sea Squall', p: 'rain', n: 3600, fog: 0.005, light: 0.5, sight: 0.72, acc: 0.85, speed: 0.95, air: 0.75, clouds: 1, wind: 22, lightning: 0.3, sound: 'rain', navalSlow: 0.85, desc: 'Gale over water. Ships slowed 15%.' },
  seafog:     { name: 'Sea Fog', p: 'mist', n: 300, fog: 0.009, light: 0.7, sight: 0.58, acc: 0.92, speed: 1, air: 0.8, clouds: 0.9, fogColor: 0xbfc9cc, desc: 'Sight -42%.' },
  gas:        { name: 'Marsh Gas', p: 'mist', n: 400, fog: 0.0065, light: 0.6, sight: 0.65, acc: 0.95, speed: 1, air: 0.9, clouds: 0.9, fogColor: 0x6d7a55, desc: 'Toxic haze. Infantry take light damage.', burnInf: 1.0 },
};

SM.TIMES = {
  dawn:  { sun: [0.55, 0.25, -0.45], sunColor: 0xffc49a, sunI: 1.25, hemiSky: 0xb7c7e6, hemiGround: 0x5a4a3a, hemiI: 0.42, top: 0x3d6aa8, horizon: 0xf3b07e },
  noon:  { sun: [0.35, 0.85, 0.3], sunColor: 0xfff3dc, sunI: 1.5, hemiSky: 0xcfe2ff, hemiGround: 0x6d5f4c, hemiI: 0.45, top: 0x2f6fc4, horizon: 0xb9d6f0 },
  after: { sun: [-0.5, 0.55, 0.35], sunColor: 0xffe2b8, sunI: 1.4, hemiSky: 0xc8daf2, hemiGround: 0x6a5a48, hemiI: 0.44, top: 0x3a72bd, horizon: 0xd6cbb6 },
  dusk:  { sun: [-0.7, 0.18, 0.1], sunColor: 0xff9d63, sunI: 1.15, hemiSky: 0x9c8cb3, hemiGround: 0x4a3a35, hemiI: 0.38, top: 0x2b3d73, horizon: 0xf08a5a },
  night: { sun: [0.3, 0.6, -0.4], sunColor: 0x9ab4ff, sunI: 0.6, hemiSky: 0x5a6a9a, hemiGround: 0x202028, hemiI: 0.35, top: 0x070b1a, horizon: 0x1c2744 },
};

// colors: low, mid, high, rock, shore, extra
SM.BIOMES = {
  desert:   { low: 0xd8b47a, mid: 0xcfa462, high: 0xb98a4c, rock: 0x9a6b42, shore: 0xe4c896, extra: 0xe9d3a3, water: 0x2f7f86, props: [['rock', 0.25], ['cactus', 0.25], ['dry', 0.15], ['wreck', 0.04]], fog: 0xe0c49a },
  canyon:   { low: 0xc27845, mid: 0xb0603a, high: 0xa04d30, rock: 0x8a3e28, shore: 0xd29a66, extra: 0xe0a070, water: 0x3c7a70, props: [['rock', 0.5], ['dry', 0.2], ['cactus', 0.1]], fog: 0xd8a27a },
  jungle:   { low: 0x2f5a22, mid: 0x3b6b26, high: 0x4f7d34, rock: 0x5b5a46, shore: 0x8e7f55, extra: 0x23461a, water: 0x2e5a48, props: [['jungle', 1.4], ['palm', 0.4], ['fern', 0.9], ['rock', 0.1]], fog: 0x8fa58a },
  arctic:   { low: 0xe4ecf2, mid: 0xd5e1ea, high: 0xf4f8fb, rock: 0x6c7682, shore: 0xbfd0dc, extra: 0xa9c2d6, water: 0x2a5874, props: [['pinesnow', 0.5], ['rock', 0.25], ['ice', 0.2]], fog: 0xdbe6ee },
  urban:    { low: 0x5d5f5c, mid: 0x6b6d68, high: 0x7a7a72, rock: 0x4d4e4b, shore: 0x7a7365, extra: 0x3f413f, water: 0x2f4a4f, props: [['rubble', 0.6], ['wreck', 0.15], ['dead', 0.2]], fog: 0x8d8e88, buildings: true },
  volcanic: { low: 0x2e2a28, mid: 0x3a3330, high: 0x4b403a, rock: 0x211d1c, shore: 0x4a3a30, extra: 0x7a2a12, water: 0xff5a10, lava: true, props: [['rock', 0.6], ['dead', 0.25], ['crystalRed', 0.08]], fog: 0x4c3d38 },
  salt:     { low: 0xeeeae2, mid: 0xe6e0d4, high: 0xd9cfbf, rock: 0xb39f86, shore: 0xf6f3ee, extra: 0xd0c6b6, water: 0x7fb9c0, props: [['rock', 0.08], ['wreck', 0.03]], fog: 0xf0e8dc },
  tropical: { low: 0x4f8a35, mid: 0x5e9a3c, high: 0x6f9e48, rock: 0x6c6858, shore: 0xf0dfae, extra: 0x3b7a2c, water: 0x1f8fa8, props: [['palm', 0.9], ['fern', 0.6], ['rock', 0.15]], fog: 0xa6d0dc },
  steppe:   { low: 0x8d9a52, mid: 0x9aa35b, high: 0xa9a96a, rock: 0x7d7660, shore: 0xb7a77a, extra: 0xc1b16a, water: 0x3b6a78, props: [['grass', 0.7], ['rock', 0.1], ['broad', 0.08], ['wreck', 0.03]], fog: 0xbfc6b0 },
  forest:   { low: 0x3d5a2c, mid: 0x47652f, high: 0x55703a, rock: 0x5e5b4f, shore: 0x6e6a4c, extra: 0x2c4422, water: 0x2f4f55, props: [['pine', 0.9], ['broad', 0.6], ['fern', 0.3], ['rock', 0.15]], fog: 0x9aa89a },
  highland: { low: 0x6a7a45, mid: 0x7a7c4c, high: 0x8a7a5c, rock: 0x6b665c, shore: 0x7d7556, extra: 0x8a6a7a, water: 0x2b4554, props: [['grass', 0.6], ['rock', 0.35], ['heather', 0.5]], fog: 0xaeb5ae },
  wasteland:{ low: 0x6e6b58, mid: 0x7a7560, high: 0x857e66, rock: 0x504c42, shore: 0x8a8670, extra: 0x9cb04a, water: 0x6f8f2a, props: [['rock', 0.4], ['dead', 0.25], ['wreck', 0.12], ['crystalGreen', 0.06]], fog: 0x8f8d70 },
  savanna:  { low: 0xb59a5a, mid: 0xc0a462, high: 0xa98a52, rock: 0x8a6e4e, shore: 0xc8b07a, extra: 0x9a8a48, water: 0x4a6e62, props: [['acacia', 0.35], ['grass', 0.6], ['rock', 0.12]], fog: 0xd9c49a },
  coast:    { low: 0x6d8a4a, mid: 0x7a9250, high: 0x87935c, rock: 0x6a6a62, shore: 0xe2d2a4, extra: 0x5d7a40, water: 0x24708a, props: [['grass', 0.5], ['rock', 0.25], ['bunker', 0.05], ['pine', 0.2]], fog: 0xbcc8cc },
  taiga:    { low: 0xcfd9df, mid: 0xbfcdd3, high: 0xe8eef2, rock: 0x5e6368, shore: 0xa9bcc8, extra: 0x5b6b4e, water: 0x9fc4d8, ice: true, props: [['pinesnow', 1.0], ['rock', 0.15], ['pipe', 0.04]], fog: 0xd0dbe2 },
  swamp:    { low: 0x46512f, mid: 0x515a33, high: 0x5e6438, rock: 0x4a4a3a, shore: 0x5a5a3a, extra: 0x39432a, water: 0x3d4a2c, props: [['dead', 0.6], ['fern', 0.5], ['mangrove', 0.6]], fog: 0x7d8a6c },
  alien:    { low: 0x4d4a5c, mid: 0x5a5468, high: 0x6a6276, rock: 0x3b3848, shore: 0x6a6480, extra: 0x8a6ad0, water: 0x3a2a6a, props: [['crystal', 0.5], ['rock', 0.35], ['debris', 0.3]], fog: 0x5a5470 },
  glass:    { low: 0x9a8a6a, mid: 0x8a7a5c, high: 0x7a6a50, rock: 0x3a4a48, shore: 0xa89a7a, extra: 0x3fae9a, water: 0x2a8a7a, props: [['glassShard', 0.3], ['rock', 0.2], ['wreck', 0.06]], fog: 0xb0a080 },
};

SM.MAPS = [
  { id: 'dunesea', name: 'Dune Sea of Erg Kharif', biome: 'desert', layout: 'dunes', time: 'noon', weather: ['clear', 'heatwave', 'duststorm', 'sandstorm'], points: 5, desc: 'Endless rolling dunes. Sandstorms swallow whole battalions.' },
  { id: 'redcanyon', name: "Khar'zul Canyons", biome: 'canyon', layout: 'canyon', time: 'after', weather: ['clear', 'duststorm', 'drylight', 'sandstorm'], points: 4, desc: 'Red mesas and narrow gorges. Choke points everywhere.' },
  { id: 'verdant', name: 'Verdant Hell', biome: 'jungle', layout: 'jungle', time: 'noon', weather: ['drizzle', 'downpour', 'thunder', 'fog', 'monsoon'], water: 0.12, points: 5, desc: 'Triple-canopy rainforest cut by a brown river.' },
  { id: 'delta', name: 'Mekong Delta Rivers', biome: 'jungle', layout: 'delta', time: 'dusk', weather: ['drizzle', 'monsoon', 'downpour', 'fog'], water: 0.35, naval: true, points: 5, desc: 'Flooded channels and paddy islands. Gunboat country.' },
  { id: 'frostbite', name: 'Frostbite Ridge', biome: 'arctic', layout: 'alpine', time: 'dawn', weather: ['clear', 'snowfall', 'blizzard', 'freezefog'], points: 3, desc: 'A single mountain pass between two glaciers.' },
  { id: 'glacierbay', name: 'Glacier Bay', biome: 'arctic', layout: 'fjord', time: 'noon', weather: ['clear', 'snowfall', 'freezefog', 'blizzard'], water: 0.3, naval: true, points: 4, desc: 'Ice cliffs drop into a deep fjord.' },
  { id: 'neoshanghai', name: 'Neo-Shanghai Ruins', biome: 'urban', layout: 'urban', time: 'night', weather: ['overcast', 'acid', 'smog', 'thunder'], water: 0.08, points: 5, desc: 'A drowned megacity. Every block is a fortress.' },
  { id: 'caldera', name: 'Ashfall Caldera', biome: 'volcanic', layout: 'caldera', time: 'dusk', weather: ['ash', 'embers', 'drylight', 'clear'], water: 0.06, points: 4, desc: 'Fight on the rim of a live volcano.' },
  { id: 'saltflats', name: 'Bonneville-9 Salt Flats', biome: 'salt', layout: 'flats', time: 'noon', weather: ['clear', 'heatwave', 'duststorm'], points: 5, desc: 'Flat white nothing. Long sightlines, nowhere to hide.' },
  { id: 'archipelago', name: 'Coral Archipelago', biome: 'tropical', layout: 'archipelago', time: 'after', weather: ['clear', 'squall', 'monsoon', 'seafog'], water: 0.3, naval: true, points: 5, desc: 'Island-hopping across shallow reefs.' },
  { id: 'steppe', name: 'Iron Steppe', biome: 'steppe', layout: 'steppe', time: 'after', weather: ['clear', 'overcast', 'thunder', 'fog'], points: 5, desc: 'Open grassland made for massed armor.' },
  { id: 'blackwood', name: 'Blackwood Forest', biome: 'forest', layout: 'forest', time: 'dawn', weather: ['overcast', 'drizzle', 'fog', 'downpour'], water: 0.1, points: 4, desc: 'Old-growth pine with logging trails.' },
  { id: 'highlands', name: 'Caledon Highlands', biome: 'highland', layout: 'highland', time: 'dusk', weather: ['drizzle', 'fog', 'overcast', 'clear'], water: 0.16, points: 4, desc: 'Moors, lochs and standing stones.' },
  { id: 'craterfield', name: 'Crater Field Omega', biome: 'wasteland', layout: 'crater', time: 'after', weather: ['radiation', 'duststorm', 'clear'], water: 0.05, points: 5, desc: 'Ground zero of the last war. Still glowing.' },
  { id: 'savanna', name: 'Serengeti Kopjes', biome: 'savanna', layout: 'savanna', time: 'dusk', weather: ['clear', 'heatwave', 'drylight', 'duststorm'], points: 5, desc: 'Golden plains broken by granite outcrops.' },
  { id: 'bastion', name: 'Coastal Bastion', biome: 'coast', layout: 'coast', time: 'dawn', weather: ['seafog', 'squall', 'drizzle', 'clear'], water: 0.3, naval: true, points: 4, desc: 'Bunkered cliffs above a landing beach.' },
  { id: 'pipeline', name: 'Tundra Pipeline', biome: 'taiga', layout: 'taiga', time: 'night', weather: ['aurora', 'snowfall', 'blizzard', 'freezefog'], water: 0.1, points: 4, desc: 'Frozen lakes and a burning oil pipeline under the aurora.' },
  { id: 'swamp', name: 'Bayou Basin', biome: 'swamp', layout: 'swamp', time: 'dusk', weather: ['fog', 'gas', 'drizzle', 'downpour'], water: 0.2, points: 5, desc: 'Knee-deep water and drowned cypress.' },
  { id: 'wreck', name: 'Fallen Star Debris Field', biome: 'alien', layout: 'wreck', time: 'night', weather: ['ion', 'clear', 'radiation', 'aurora'], points: 4, desc: 'A crashed orbital carrier sprawls across alien crystal fields.' },
  { id: 'glassdesert', name: 'The Glass Desert', biome: 'glass', layout: 'glass', time: 'dusk', weather: ['drylight', 'sandstorm', 'ion', 'heatwave'], points: 5, desc: 'Sand fused to glass by orbital fire.' },
];
SM.MAP = {}; SM.MAPS.forEach((m, i) => { m.seed = SM.hash(m.id) ^ (i * 7919); SM.MAP[m.id] = m; });

// ---------------------------------------------------------------- shop, crates, battle pass helpers
SM.HALF_DAY = 12 * 3600 * 1000;
SM.DAY = 24 * 3600 * 1000;
SM.SEASON_LEN = 14 * SM.DAY;
SM.SEASON_EPOCH = Date.UTC(2026, 0, 5); // a Monday
SM.seasonIndex = now => Math.floor((now - SM.SEASON_EPOCH) / SM.SEASON_LEN);
SM.seasonEnds = now => SM.SEASON_EPOCH + (SM.seasonIndex(now) + 1) * SM.SEASON_LEN;
SM.flashIndex = now => { const d = new Date(now); return Math.floor((now - d.getTimezoneOffset() * 60000) / SM.HALF_DAY); };
SM.flashEnds = now => { const off = new Date(now).getTimezoneOffset() * 60000; return (SM.flashIndex(now) + 1) * SM.HALF_DAY + off; };
SM.weekIndex = now => Math.floor((now - SM.SEASON_EPOCH) / (7 * SM.DAY));
SM.SEASON_NAMES = ['Operation Iron Monsoon', 'Operation Red Horizon', 'Operation Glass Tide', 'Operation Cold Lantern', 'Operation Ember Crown', 'Operation Silent Meridian', 'Operation Ashen Veil', 'Operation Storm Choir', 'Operation Black Coral', 'Operation Northern Pyre', 'Operation Last Light', 'Operation Ion Requiem'];

SM.CRATES = [
  { id: 'supply', name: 'Supply Crate', cur: 'credits', price: 6000, color: '#8e9aa6', odds: [62, 28, 8, 1.9, 0.1],
    desc: 'Mostly credits, boosters and common camo.' },
  { id: 'veteran', name: 'Veteran Crate', cur: 'cores', price: 150, color: '#4f9cf0', odds: [30, 42, 20, 7, 1],
    desc: 'Rare camo with real bonuses and a shot at Epic.' },
  { id: 'elite', name: 'Elite Crate', cur: 'cores', price: 450, color: '#b46cf2', odds: [0, 30, 45, 20, 5],
    desc: 'Epic and Legendary skins. Crate-exclusive vehicles possible.' },
  { id: 'mythic', name: 'Mythic Vault', cur: 'cores', price: 1400, color: '#ff4f6d', odds: [0, 0, 30, 45, 25],
    desc: 'Guaranteed Epic or better. Best odds for one-of-a-kind vehicles.' },
];
SM.XP_BOOSTS = [
  { id: 'xp2_3', name: 'Double XP ×3', mult: 2, battles: 3 },
  { id: 'xp3_2', name: 'Triple XP ×2', mult: 3, battles: 2 },
  { id: 'xp15_5', name: '+50% XP ×5', mult: 1.5, battles: 5 },
];

SM.buildTrees();
