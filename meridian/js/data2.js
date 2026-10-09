'use strict';
// Expansion data: two more factions, more unit classes and tech lines (rank VII), abilities, skins,
// weather, maps, stratagems and per-unit customisation parts. Builds the tech trees at the end.
(function () {
  // ---------------------------------------------------------------- factions
  SM.FACTIONS.push(
    { id: 'legion', name: 'Ashen Legion', short: 'ALG', motto: 'We build our war machines from your ruins.',
      hue: '#e0a050', palette: { base: 0x6f5a45, dark: 0x2b2420, accent: 0xc9752a, glow: 0xffb347 },
      style: 'scrap', bonus: { hp: 1.06, dmg: 1.07, acc: 0.95 }, bonusText: '+6% hull, +7% damage, -5% accuracy' },
    { id: 'helios', name: 'Helios Directive', short: 'HLD', motto: 'Order, delivered from orbit.',
      hue: '#f2e6b8', palette: { base: 0xd9d4c6, dark: 0x45464e, accent: 0xd4af37, glow: 0x8ae8ff },
      style: 'orbital', bonus: { armor: 1.06, sight: 1.06, speed: 1.03, hp: 0.97 }, bonusText: '+6% armor, +6% sight, +3% speed, -3% hull' },
  );
  SM.FACTION = {}; SM.FACTIONS.forEach(f => SM.FACTION[f.id] = f);
  SM.NAMES.legion = ['Scrapjaw', 'Rustfang', 'Cinder', 'Gravemaker', 'Junkyard', 'Hacksaw', 'Slagheap', 'Ironmonger', 'Rivet', 'Pyre', 'Carrion', 'Ratchet', 'Bonesaw', 'Wrecker', 'Mangler', 'Scavenger', 'Buzzard', 'Hyena', 'Jackal', 'Vulture', 'Grinder', 'Smelter', 'Furnace', 'Kiln', 'Anvil', 'Crowbar', 'Sledge', 'Gauntlet', 'Brimstone', 'Ashfang', 'Dustdevil', 'Badlander', 'Marauder', 'Reaver', 'Raider', 'Warboy', 'Bulldozer', 'Breaker', 'Tusk', 'Gnasher', 'Hellhound', 'Warthog', 'Crusher', 'Ironclaw', 'Sawtooth', 'Blackpowder', 'Fuse', 'Shrapnel', 'Torch', 'Clinker'];
  SM.NAMES.helios = ['Sol', 'Apollo', 'Icarus', 'Helion', 'Corona', 'Aureole', 'Radiant', 'Lumina', 'Zenith', 'Solstice', 'Equinox', 'Perihelion', 'Aphelion', 'Halo', 'Seraph', 'Cherub', 'Throne', 'Dominion', 'Archon', 'Paragon', 'Exemplar', 'Arbiter', 'Sentinel', 'Lodestar', 'Polestar', 'Vega', 'Altair', 'Rigel', 'Sirius', 'Deneb', 'Antares', 'Canopus', 'Spica', 'Capella', 'Procyon', 'Mira', 'Electra', 'Maia', 'Alcyone', 'Celaeno', 'Taygeta', 'Merope', 'Astraea', 'Aurelius', 'Valerian', 'Orison', 'Benedict', 'Gloria', 'Lux', 'Daybreak'];
  SM.DESIG.legion = { inf: 'Pack', track: 'Rig-', wheel: 'Rig-', hover: 'Skim-', mech: 'Walker-', heli: 'Buzz-', plane: 'Kite-', naval: 'Hulk-', sub: 'Eel-', amphib: 'Ferry-', static: 'Nest-' };
  SM.DESIG.helios = { inf: 'Choir', track: 'HD-', wheel: 'HD-', hover: 'HDG-', mech: 'HM-', heli: 'HR-', plane: 'HF-', naval: 'HN-', sub: 'HS-', amphib: 'HA-', static: 'HT-' };
  for (const f in SM.DESIG) SM.DESIG[f].static = SM.DESIG[f].static || 'T-';

  // ---------------------------------------------------------------- classes
  const C = {
    flamer:     { name: 'Flame Trooper Squad', branch: 'infantry', move: 'inf', squad: 4, hp: 70, armor: 2, speed: 4.2, range: 24, dmg: 16, rof: 3, pen: 14, acc: 0.9, sight: 66, wt: 'flame', aa: 0, cp: 150, pop: 1, r: 4, abil: ['flameburst', 'sprint', 'smoke', 'stim'], role: 'Burns out entrenched infantry at close range.' },
    medic:      { name: 'Combat Medic Team', branch: 'infantry', move: 'inf', squad: 4, hp: 62, armor: 0, speed: 4.4, range: 40, dmg: 8, rof: 1.5, pen: 3, acc: 0.55, sight: 72, wt: 'mg', aa: 1, cp: 130, pop: 1, r: 4, abil: ['heal', 'smoke', 'sprint', 'stim'], role: 'Heals nearby infantry and replaces fallen soldiers.', healAura: 5 },
    cyborg:     { name: 'Synthetic Squad', branch: 'infantry', move: 'inf', squad: 4, hp: 125, armor: 9, speed: 4.6, range: 50, dmg: 20, rof: 1.6, pen: 16, acc: 0.7, sight: 80, wt: 'laser', aa: 1, cp: 220, pop: 2, r: 4, abil: ['overcharge', 'shield', 'sprint', 'hack'], role: 'Android infantry. Immune to weather damage.', synthetic: true },
    mortar:     { name: 'Mortar Team', branch: 'infantry', move: 'inf', squad: 3, hp: 55, armor: 0, speed: 3.6, range: 150, minRange: 30, dmg: 70, rof: 0.2, pen: 22, acc: 0.45, sight: 70, wt: 'arty', aoe: 8, aa: 0, cp: 160, pop: 1, r: 4, abil: ['barrage', 'smoke', 'entrench', 'paint'], role: 'Indirect fire. Lobs shells over hills.' },
    manpads:    { name: 'Air Defense Team', branch: 'infantry', move: 'inf', squad: 3, hp: 55, armor: 0, speed: 4.2, range: 105, dmg: 110, rof: 0.3, pen: 40, acc: 0.7, sight: 100, wt: 'missile', aa: 2, airOnly: true, cp: 170, pop: 1, r: 4, abil: ['overwatch', 'sprint', 'smoke', 'paint'], role: 'Shoulder-launched missiles. Hunts aircraft.' },
    armcar:     { name: 'Armored Car', branch: 'armor', move: 'wheel', hp: 420, armor: 24, speed: 14, range: 66, dmg: 70, rof: 0.45, pen: 55, acc: 0.66, sight: 100, wt: 'cannon', aa: 0, cp: 220, pop: 2, r: 3.9, abil: ['overdrive', 'smoke', 'repair', 'apRound'], role: 'Six-wheeled raider with a light cannon.' },
    atgm:       { name: 'Missile Carrier', branch: 'armor', move: 'wheel', hp: 360, armor: 16, speed: 13, range: 96, dmg: 170, rof: 0.2, pen: 140, acc: 0.78, sight: 95, wt: 'missile', aa: 0, cp: 300, pop: 2, r: 4, abil: ['paint', 'smoke', 'overdrive', 'overwatch'], role: 'Long-range guided missiles against armor.' },
    laser:      { name: 'Laser Tank', branch: 'armor', move: 'track', hp: 780, armor: 70, speed: 9.5, range: 80, dmg: 45, rof: 1.6, pen: 85, acc: 0.85, sight: 92, wt: 'laser', aa: 0, cp: 420, pop: 3, r: 4.8, abil: ['overcharge', 'shield', 'smoke', 'repair'], role: 'Continuous beam weapon. Never misses much.' },
    assault:    { name: 'Assault Gun', branch: 'armor', move: 'track', hp: 950, armor: 120, speed: 6.5, range: 62, dmg: 200, rof: 0.22, pen: 90, acc: 0.65, sight: 80, wt: 'cannon', aoe: 6, aa: 0, cp: 440, pop: 3, r: 5, casemate: true, abil: ['entrench', 'smoke', 'repair', 'rally'], role: 'Casemate howitzer that blasts infantry out of cover.' },
    mlrs:       { name: 'Rocket Launcher Truck', branch: 'armor', move: 'wheel', hp: 360, armor: 12, speed: 10, range: 240, minRange: 50, dmg: 90, rof: 0.35, pen: 40, acc: 0.45, sight: 70, wt: 'arty', aoe: 9, aa: 0, cp: 400, pop: 3, r: 4.6, abil: ['barrage', 'entrench', 'smoke', 'repair'], role: 'Saturates a wide area with rockets.' },
    ew:         { name: 'Electronic Warfare Vehicle', branch: 'armor', move: 'wheel', hp: 400, armor: 18, speed: 12, range: 60, dmg: 15, rof: 2, pen: 10, acc: 0.6, sight: 150, wt: 'mg', aa: 1, cp: 300, pop: 2, r: 4.2, jamAura: true, abil: ['ecm', 'sonar', 'hack', 'lockdown'], role: 'Jams nearby enemies and spots from far away.' },
    scoutmech:  { name: 'Scout Walker', branch: 'mech', move: 'mech', hp: 300, armor: 18, speed: 14, range: 58, dmg: 14, rof: 4, pen: 14, acc: 0.62, sight: 125, wt: 'mg', aa: 1, cp: 200, pop: 1, r: 3, abil: ['overdrive', 'smoke', 'sonar', 'decoy'], role: 'Tiny, fast walker for spotting.', scale: 0.72 },
    jumpmech:   { name: 'Jump Mech', branch: 'mech', move: 'mech', hp: 820, armor: 55, speed: 8, range: 62, dmg: 60, rof: 1, pen: 60, acc: 0.66, sight: 90, wt: 'auto', aa: 1, cp: 420, pop: 3, r: 4.6, abil: ['jumpjets', 'shield', 'overcharge', 'rally'], role: 'Leaps over walls and onto objectives.' },
    flamemech:  { name: 'Inferno Mech', branch: 'mech', move: 'mech', hp: 1300, armor: 95, speed: 5.5, range: 32, dmg: 45, rof: 3, pen: 50, acc: 0.9, sight: 80, wt: 'flame', aa: 0, cp: 560, pop: 4, r: 5.5, abil: ['flameburst', 'shield', 'napalm', 'repair'], role: 'Heavy walker with twin flame projectors.' },
    artmech:    { name: 'Artillery Walker', branch: 'mech', move: 'mech', hp: 900, armor: 50, speed: 5, range: 230, minRange: 40, dmg: 160, rof: 0.14, pen: 70, acc: 0.5, sight: 85, wt: 'arty', aoe: 12, aa: 0, cp: 560, pop: 4, r: 5.5, abil: ['entrench', 'barrage', 'paint', 'repair'], role: 'Back-mounted howitzer on legs.' },
    interceptor:{ name: 'Interceptor', branch: 'air', move: 'plane', hp: 380, armor: 8, speed: 70, range: 130, dmg: 120, rof: 0.55, pen: 55, acc: 0.78, sight: 170, wt: 'missile', aa: 2, airFirst: true, cp: 400, pop: 3, r: 6, loiter: 55, abil: ['afterburner', 'flares', 'chaff', 'overcharge'], role: 'The fastest thing in the sky.' },
    stealth:    { name: 'Stealth Bomber', branch: 'air', move: 'plane', hp: 700, armor: 20, speed: 44, range: 70, dmg: 320, rof: 0.3, pen: 120, acc: 0.7, sight: 120, wt: 'bomb', aoe: 12, aa: 0, cp: 800, pop: 4, r: 9, loiter: 50, stealthy: 0.35, abil: ['cloak', 'carpet', 'flares', 'chaff'], role: 'Hard to see, harder to stop.' },
    vtol:       { name: 'VTOL Gunship', branch: 'air', move: 'heli', hp: 800, armor: 28, speed: 20, range: 75, dmg: 45, rof: 2.2, pen: 45, acc: 0.65, sight: 120, wt: 'auto', aa: 1, cp: 540, pop: 3, r: 6, abil: ['flares', 'barrage', 'afterburner', 'overcharge'], role: 'Four ducted fans and a lot of guns.' },
    tiltrotor:  { name: 'Tiltrotor Transport', branch: 'air', move: 'heli', hp: 650, armor: 18, speed: 24, range: 60, dmg: 14, rof: 4, pen: 12, acc: 0.6, sight: 120, wt: 'mg', aa: 1, cp: 380, pop: 3, r: 7, abil: ['airdrop', 'flares', 'smoke', 'overdrive'], role: 'Drops infantry anywhere on the map.' },
    corvette:   { name: 'Corvette', branch: 'naval', move: 'naval', hp: 1100, armor: 40, speed: 13, range: 100, dmg: 60, rof: 1, pen: 60, acc: 0.65, sight: 125, wt: 'auto', aa: 2, cp: 420, pop: 3, r: 7, abil: ['depth', 'smoke', 'chaff', 'repair'], role: 'Light escort. Hunts submarines.' },
    missileboat:{ name: 'Missile Boat', branch: 'naval', move: 'naval', hp: 500, armor: 12, speed: 18, range: 130, dmg: 160, rof: 0.3, pen: 110, acc: 0.7, sight: 120, wt: 'missile', aa: 0, cp: 360, pop: 2, r: 5, abil: ['overdrive', 'smoke', 'paint', 'chaff'], role: 'Small, fast and armed with anti-ship missiles.' },
    frigate:    { name: 'Frigate', branch: 'naval', move: 'naval', hp: 2300, armor: 70, speed: 9, range: 140, dmg: 100, rof: 0.6, pen: 90, acc: 0.68, sight: 140, wt: 'missile', aa: 2, cp: 800, pop: 5, r: 10, abil: ['depth', 'barrage', 'ecm', 'repair'], role: 'Multi-role warship with deep magazines.' },
    carrier:    { name: 'Drone Carrier', branch: 'naval', move: 'naval', hp: 4800, armor: 90, speed: 5.5, range: 100, dmg: 40, rof: 1.5, pen: 40, acc: 0.6, sight: 180, wt: 'auto', aa: 2, cp: 1300, pop: 6, r: 15, abil: ['drones', 'sonar', 'repair', 'airdrop'], role: 'Launches drone wings and spots the whole coast.' },
    amphtank:   { name: 'Amphibious Tank', branch: 'naval', move: 'amphib', hp: 620, armor: 40, speed: 11, range: 70, dmg: 100, rof: 0.35, pen: 80, acc: 0.68, sight: 90, wt: 'cannon', aa: 0, cp: 340, pop: 2, r: 4.5, abil: ['smoke', 'overdrive', 'repair', 'apRound'], role: 'Swims ashore and fights like a tank.' },
    // emplacements (stratagems only)
    sentry_mg:  { name: 'MG Sentry', branch: 'fort', move: 'static', hp: 520, armor: 30, speed: 0, range: 72, dmg: 12, rof: 6, pen: 12, acc: 0.62, sight: 95, wt: 'mg', aa: 1, cp: 0, pop: 0, r: 3, abil: [], role: 'Automated machine-gun nest.' },
    sentry_at:  { name: 'Missile Sentry', branch: 'fort', move: 'static', hp: 620, armor: 50, speed: 0, range: 95, dmg: 180, rof: 0.25, pen: 160, acc: 0.75, sight: 100, wt: 'missile', aa: 0, cp: 0, pop: 0, r: 3, abil: [], role: 'Automated anti-armor launcher.' },
    sentry_aa:  { name: 'Flak Battery', branch: 'fort', move: 'static', hp: 520, armor: 30, speed: 0, range: 135, dmg: 30, rof: 5, pen: 25, acc: 0.7, sight: 140, wt: 'auto', aa: 2, airOnly: true, cp: 0, pop: 0, r: 3.2, abil: [], role: 'Radar-laid flak guns.' },
    mortarpit:  { name: 'Mortar Pit', branch: 'fort', move: 'static', hp: 460, armor: 20, speed: 0, range: 200, minRange: 30, dmg: 80, rof: 0.25, pen: 30, acc: 0.5, sight: 90, wt: 'arty', aoe: 8, aa: 0, cp: 0, pop: 0, r: 3.2, abil: [], role: 'Dug-in mortars.' },
  };
  for (const k in C) { C[k].key = k; SM.CLASSES[k] = C[k]; }
  Object.assign(SM.CLASS_PREFIX, { armcar: 'K', atgm: 'M', laser: 'X', assault: 'S', mlrs: 'R', ew: 'E', interceptor: 'I', stealth: 'B', vtol: 'V', tiltrotor: 'T', corvette: 'C', missileboat: 'P', frigate: 'F', carrier: 'V', amphtank: 'A' });
  SM.EXCL_CLASSES_V2 = ['laser', 'assault', 'jumpmech', 'flamemech', 'artmech', 'interceptor', 'stealth', 'vtol', 'frigate', 'carrier', 'cyborg', 'armcar', 'atgm', 'amphtank'];

  // ---------------------------------------------------------------- abilities
  Object.assign(SM.ABILITIES, {
    flameburst: { name: 'Fuel Surge', target: 'self', cd: 25, icon: 'FUE', desc: 'Double flame damage and +30% flame range for 5 s.' },
    heal:       { name: 'Triage', target: 'self', cd: 30, icon: 'MED', desc: 'Heals infantry within 30 m by 40% and replaces fallen soldiers.' },
    overwatch:  { name: 'Overwatch', target: 'self', cd: 30, icon: 'OVW', desc: '+35% range and +15% accuracy for 10 s.' },
    rally:      { name: 'Rally Cry', target: 'self', cd: 50, icon: 'RLY', desc: 'Allies within 35 m gain +25% damage and +20% speed for 10 s.' },
    airdrop:    { name: 'Air Drop', target: 'self', cd: 120, icon: 'AIR', desc: 'Drops a squad beneath the unit.' },
    hack:       { name: 'Hack', target: 'point', range: 70, cd: 40, icon: 'HCK', desc: 'Stuns enemy machines in a 14 m circle for 5 s.' },
    lockdown:   { name: 'Lockdown Field', target: 'point', range: 80, cd: 45, icon: 'LCK', desc: 'Roots enemies in a 16 m circle for 4 s.' },
    stim:       { name: 'Combat Stims', target: 'self', cd: 30, icon: 'STM', desc: '+50% speed and fire rate for 6 s. Costs 10% hull.' },
    paint:      { name: 'Target Designator', target: 'point', range: 90, cd: 35, icon: 'TGT', desc: 'Marked enemies in a 12 m circle take +30% damage for 12 s.' },
    depth:      { name: 'Depth Charges', target: 'point', range: 60, cd: 25, icon: 'DPC', desc: 'Pattern of charges that wreck submarines in a 14 m circle.' },
    chaff:      { name: 'Chaff Cloud', target: 'self', cd: 25, icon: 'CHF', desc: 'Breaks missile locks on allies within 25 m for 5 s.' },
    barrier:    { name: 'Barrier Dome', target: 'self', cd: 45, icon: 'DOM', desc: 'Allies inside a 14 m dome take half damage for 8 s.' },
  });
  SM.CLASSES.engineer.abil = ['nanoRepair', 'mines', 'drones', 'barrier'];

  // ---------------------------------------------------------------- tech lines (rank VII + new lines)
  const add7 = {
    assault: ['cyborg', 'exo'], antiarmor: ['at', 'cyborg'], specialist: ['sniper', 'engineer'], heavyinf: ['exo', 'cyborg'],
    recon: ['scout', 'apc'], medium: ['mbt', 'laser'], heavy: ['htank', 'htank'], destroyers: ['td', 'hover'], support: ['arty', 'aa'],
    lightmech: ['lmech', 'mmech'], battlemech: ['mmech', 'hmech'], siegemech: ['titan'],
    rotary: ['hgun', 'hattack'], fighters: ['interceptor', 'fighter'], strike: ['bomber', 'stealth'], unmanned: ['drone', 'drone'],
    coastal: ['patrol', 'missileboat'], surface: ['battleship', 'cruiser'], subsurface: ['sub', 'sub'],
  };
  for (const b in SM.LINES) SM.LINES[b].forEach(l => { if (add7[l.id] && l.seq.length === 6) l.seq.push(add7[l.id]); });
  SM.LINES.infantry.push(
    { id: 'flame', name: 'Flame Troopers', seq: [['flamer'], ['flamer'], ['flamer', 'exo'], ['flamer'], ['flamer', 'cyborg'], ['flamer'], ['flamer', 'exo']] },
    { id: 'supportinf', name: 'Support Teams', seq: [['medic'], ['mortar'], ['medic', 'mortar'], ['mortar'], ['medic'], ['mortar', 'medic'], ['mortar']] },
    { id: 'airdefinf', name: 'Air Defense Teams', seq: [['manpads'], ['manpads'], ['manpads', 'at'], ['manpads'], ['manpads'], ['manpads', 'exo'], ['manpads']] },
    { id: 'cyber', name: 'Synthetics', seq: [['rifle'], ['cyborg'], ['cyborg'], ['cyborg', 'flamer'], ['cyborg'], ['cyborg', 'cyborg'], ['cyborg', 'exo']] },
  );
  SM.LINES.armor.push(
    { id: 'wheeled', name: 'Wheeled Cavalry', seq: [['armcar'], ['armcar', 'atgm'], ['atgm'], ['armcar', 'apc'], ['atgm'], ['armcar', 'atgm'], ['armcar']] },
    { id: 'energy', name: 'Directed Energy', seq: [['ltank'], ['laser'], ['laser', 'hover'], ['laser'], ['laser', 'td'], ['laser'], ['laser', 'hover']] },
    { id: 'rocketry', name: 'Rocket Forces', seq: [['mlrs'], ['ew'], ['mlrs', 'aa'], ['ew'], ['mlrs'], ['mlrs', 'ew'], ['mlrs']] },
    { id: 'assaultguns', name: 'Assault Guns', seq: [['assault'], ['assault'], ['assault', 'ltank'], ['assault'], ['assault', 'mbt'], ['assault'], ['assault', 'htank']] },
  );
  SM.LINES.mech.push(
    { id: 'skirmish', name: 'Skirmishers', seq: [['scoutmech'], ['scoutmech', 'jumpmech'], ['jumpmech'], ['scoutmech'], ['jumpmech', 'scoutmech'], ['jumpmech'], ['jumpmech', 'mmech']] },
    { id: 'inferno', name: 'Inferno Frames', seq: [['flamemech'], ['artmech'], ['flamemech', 'artmech'], ['flamemech'], ['artmech'], ['flamemech', 'artmech'], ['titan']] },
  );
  SM.LINES.air.push(
    { id: 'interceptors', name: 'Interceptors', seq: [['interceptor'], ['interceptor'], ['interceptor', 'fighter'], ['interceptor'], ['interceptor', 'drone'], ['interceptor'], ['interceptor', 'fighter']] },
    { id: 'stealthwing', name: 'Stealth Wing', seq: [['cas'], ['stealth'], ['stealth'], ['stealth', 'bomber'], ['stealth'], ['stealth', 'cas'], ['stealth']] },
    { id: 'vtolwing', name: 'VTOL Wing', seq: [['tiltrotor'], ['vtol'], ['vtol', 'tiltrotor'], ['vtol'], ['vtol', 'hgun'], ['tiltrotor', 'vtol'], ['vtol']] },
  );
  SM.LINES.naval.push(
    { id: 'escort', name: 'Escort Group', seq: [['corvette'], ['missileboat', 'corvette'], ['frigate'], ['frigate', 'missileboat'], ['corvette'], ['frigate', 'corvette'], ['frigate']] },
    { id: 'carriergrp', name: 'Carrier Group', seq: [['amphtank'], ['amphtank'], ['amphtank', 'corvette'], ['carrier'], ['amphtank'], ['carrier', 'frigate'], ['carrier']] },
  );
  SM.RANKS = 7;

  // ---------------------------------------------------------------- skins
  Object.assign(SM.SKINS, {
    marpat:   { name: 'Pixel Woodland', rarity: 0 },
    flecktarn:{ name: 'Fleck', rarity: 0 },
    redsand:  { name: 'Red Sand', rarity: 0 },
    snowpix:  { name: 'Snow Pixel', rarity: 1 },
    savtiger: { name: 'Savanna Tiger', rarity: 1 },
    asplinter:{ name: 'Arctic Splinter', rarity: 1 },
    tropic:   { name: 'Tropic Leaf', rarity: 1 },
    ironrust: { name: 'Iron Rust', rarity: 2 },
    ivory:    { name: 'Ivory Command', rarity: 2 },
    warlord:  { name: 'Warlord', rarity: 2 },
    cyberpink:{ name: 'Cyber Pink', rarity: 3 },
    bloodmoon:{ name: 'Blood Moon', rarity: 3 },
    plasma:   { name: 'Plasma Arc', rarity: 3 },
    nebula:   { name: 'Nebula', rarity: 4 },
    aurora:   { name: 'Aurora Veil', rarity: 4 },
    sunforged:{ name: 'Sunforged', rarity: 4 },
  });

  // ---------------------------------------------------------------- weather
  Object.assign(SM.WEATHER, {
    hail:      { name: 'Hailstorm', p: 'hail', n: 2600, fog: 0.003, light: 0.62, sight: 0.8, acc: 0.9, speed: 0.9, air: 0.7, clouds: 1, sound: 'rain', burnInf: 0.6, desc: 'Ice pellets. Aircraft accuracy -30%, infantry take light damage.' },
    meteors:   { name: 'Meteor Shower', p: 'spark', n: 500, fog: 0.0016, light: 0.9, sight: 0.95, acc: 1, speed: 1, air: 0.9, clouds: 0.2, meteors: 1, desc: 'Fragments rain down at random. Impacts hit anything nearby.' },
    solarflare:{ name: 'Solar Flare', p: 'haze', n: 300, fog: 0.0015, light: 1.35, sight: 0.9, acc: 0.95, speed: 1, air: 0.9, clouds: 0.1, tint: 0xfff0c0, cdMul: 0.7, desc: 'Electronics fry. Abilities recharge 30% slower.' },
    firestorm: { name: 'Wildfire', p: 'ember', n: 2600, fog: 0.0058, light: 0.6, sight: 0.65, acc: 0.92, speed: 0.95, air: 0.8, clouds: 1, fogColor: 0x5a3a28, burnInf: 1.6, wind: 14, desc: 'Burning grassland. Sight -35%, infantry take damage.' },
    sleet:     { name: 'Sleet', p: 'rain', n: 3200, fog: 0.0035, light: 0.6, sight: 0.8, acc: 0.92, speed: 0.85, air: 0.85, clouds: 1, rainColor: 0xe8f0f6, sound: 'rain', desc: 'Freezing slush. Ground speed -15%.' },
    mist:      { name: 'Morning Mist', p: 'mist', n: 220, fog: 0.005, light: 0.85, sight: 0.75, acc: 0.97, speed: 1, air: 0.9, clouds: 0.6, fogColor: 0xc8d0d4, desc: 'Sight -25%.' },
    bloodmoon: { name: 'Blood Moon', p: null, fogColor: 0x3a1414, fog: 0.0022, light: 0.8, sight: 0.9, acc: 1, speed: 1, air: 1, clouds: 0.15, aurora: 0.6, auroraRed: 1, dmgMul: 1.1, desc: 'An omen. All units deal +10% damage.' },
    cyclone:   { name: 'Cyclone', p: 'rain', n: 5600, fog: 0.0065, light: 0.4, sight: 0.55, acc: 0.78, speed: 0.8, air: 0.55, clouds: 1, lightning: 0.5, wind: 42, sound: 'rain', navalSlow: 0.7, desc: 'Hurricane winds. Ships -30%, aircraft accuracy -45%.' },
  });
  SM.TIMES.space = { sun: [0.5, 0.6, 0.3], sunColor: 0xffffff, sunI: 1.6, hemiSky: 0x606878, hemiGround: 0x18181c, hemiI: 0.25, top: 0x000004, horizon: 0x15161c };
  Object.assign(SM.BIOMES, {
    mars:   { low: 0xb5582e, mid: 0xa64e2a, high: 0x8f4224, rock: 0x6a3018, shore: 0xc8703a, extra: 0xd99a5a, water: 0x5a3020, props: [['rock', 0.7], ['debris', 0.12], ['crystalRed', 0.05]], fog: 0xc98a62 },
    lunar:  { low: 0x8a8a8c, mid: 0x7a7a7e, high: 0x9a9a9e, rock: 0x4a4a4e, shore: 0x9a9a9a, extra: 0xb0b0b4, water: 0x333340, props: [['rock', 0.6], ['debris', 0.15]], fog: 0x1a1a20, buildings: 'sparse' },
    nordic: { low: 0x4d6044, mid: 0x5a6a4c, high: 0x7a7e70, rock: 0x5a5e62, shore: 0x6a6a5a, extra: 0xe8eef2, water: 0x22404e, props: [['pine', 1.0], ['pinesnow', 0.4], ['rock', 0.3]], fog: 0xa8b4bc },
    ruins:  { low: 0xb89a6e, mid: 0xa88a5e, high: 0x9a7a52, rock: 0x7a6040, shore: 0xc8aa7a, extra: 0x8a7a5a, water: 0x3a5a5a, props: [['rubble', 0.6], ['rock', 0.3], ['dead', 0.15], ['wreck', 0.06]], fog: 0x8a6a5a, buildings: true },
  });
  SM.MAPS.push(
    { id: 'rift', name: 'Great Rift Escarpment', biome: 'savanna', layout: 'rift', time: 'after', weather: ['clear', 'heatwave', 'drylight', 'firestorm'], points: 5, desc: 'A valley floor walled by cliffs. Ramps decide everything.' },
    { id: 'atoll', name: 'Atoll Zero', biome: 'tropical', layout: 'atoll', time: 'noon', weather: ['clear', 'cyclone', 'squall', 'mist'], water: 0.3, naval: true, points: 4, desc: 'A ring of coral around a deep lagoon.' },
    { id: 'gulag', name: 'Kolyma Penal Colony', biome: 'taiga', layout: 'taiga', time: 'dawn', weather: ['snowfall', 'sleet', 'blizzard', 'freezefog'], water: 0.1, points: 4, buildings: 'sparse', desc: 'Watchtowers, barracks and frozen lakes.' },
    { id: 'mars', name: 'Ares Basin', biome: 'mars', layout: 'crater', time: 'after', weather: ['duststorm', 'meteors', 'solarflare', 'clear'], points: 5, desc: 'Red dust and old impact craters on Mars.' },
    { id: 'lunar', name: 'Tycho Mining Colony', biome: 'lunar', layout: 'crater', time: 'space', weather: ['clear', 'meteors', 'solarflare'], points: 4, desc: 'Black sky, grey regolith, no air to slow a shell.' },
    { id: 'amazon', name: 'Amazon Floodplain', biome: 'jungle', layout: 'delta', time: 'noon', weather: ['downpour', 'cyclone', 'mist', 'thunder'], water: 0.35, naval: true, points: 5, desc: 'Flooded forest where gunboats outnumber tanks.' },
    { id: 'alpinefort', name: 'Eiger Fortress Line', biome: 'arctic', layout: 'alpine', time: 'noon', weather: ['clear', 'snowfall', 'hail', 'blizzard'], points: 4, desc: 'Bunkered peaks above a single winding pass.' },
    { id: 'gobi', name: 'Gobi Ironworks', biome: 'desert', layout: 'urban', time: 'dusk', weather: ['clear', 'duststorm', 'sandstorm', 'heatwave'], water: 0.06, points: 5, buildings: true, desc: 'A desert factory town of smokestacks and slag.' },
    { id: 'nordheim', name: 'Fjords of Nordheim', biome: 'nordic', layout: 'fjord', time: 'dusk', weather: ['overcast', 'sleet', 'mist', 'aurora'], water: 0.3, naval: true, points: 4, desc: 'Steep pine slopes over cold black water.' },
    { id: 'terraces', name: 'Monsoon Terraces', biome: 'jungle', layout: 'terraces', time: 'dawn', weather: ['drizzle', 'downpour', 'mist', 'monsoon'], water: 0.1, points: 5, desc: 'Stepped rice paddies climbing every hill.' },
    { id: 'strait', name: 'Bosporus Strait', biome: 'coast', layout: 'strait', time: 'after', weather: ['clear', 'squall', 'seafog', 'drizzle'], water: 0.3, naval: true, points: 4, desc: 'Two shores, three bridges, one shipping lane.' },
    { id: 'necropolis', name: 'Necropolis of Ur', biome: 'ruins', layout: 'urban', time: 'night', weather: ['bloodmoon', 'duststorm', 'mist'], water: 0.06, points: 5, desc: 'Sandstone tombs lit by a red moon.' },
  );
  SM.MAP = {}; SM.MAPS.forEach((m, i) => { m.seed = SM.hash(m.id) ^ (i * 7919); SM.MAP[m.id] = m; });

  // ---------------------------------------------------------------- crates & boosts
  SM.CRATES.push(
    { id: 'armory', name: 'Armory Locker', cur: 'credits', price: 18000, color: '#5fd39a', odds: [45, 35, 15, 4.5, 0.5], desc: 'Customisation parts for units you own, plus credits.', pool: 'cust' },
    { id: 'stratcache', name: 'Stratagem Cache', cur: 'cores', price: 380, color: '#ffb347', odds: [10, 40, 32, 15, 3], desc: 'Stratagem unlocks and upgrades. Rarer drops are higher-rank stratagems.', pool: 'strat' },
  );
  SM.XP_BOOSTS.push({ id: 'xp4_1', name: 'Quad XP ×1', mult: 4, battles: 1 }, { id: 'xp2_6', name: 'Double XP ×6', mult: 2, battles: 6 });

  // ---------------------------------------------------------------- stratagems
  SM.STRAT_BRANCHES = [
    { id: 'orbital', name: 'Orbital Strikes', color: '#8ae8ff' },
    { id: 'airsup', name: 'Air Support', color: '#ffb347' },
    { id: 'logistics', name: 'Logistics', color: '#5fd39a' },
    { id: 'fort', name: 'Fortifications', color: '#c9a36a' },
    { id: 'ewar', name: 'Electronic Warfare', color: '#c58cff' },
    { id: 'reinf', name: 'Reinforcements', color: '#ff7a6a' },
  ];
  // fx: effect handler; p: parameters scaled by upgrades
  const S = [
    ['orb_rail', 'orbital', 1, 'Precision Rail Strike', 180, 50, 'point', 'strike', { dmg: 650, r: 7, n: 1, delay: 2.5 }, 'One tungsten slug from orbit. Kills most single targets.'],
    ['orb_barrage', 'orbital', 2, 'Orbital Barrage', 320, 90, 'point', 'barrage', { dmg: 160, r: 30, n: 14, delay: 3, dur: 5 }, 'Fourteen shells walk across a 30 m circle.'],
    ['orb_laser', 'orbital', 3, 'Orbital Laser', 450, 120, 'point', 'laser', { dmg: 260, r: 9, dur: 7, delay: 2.5 }, 'A beam that hunts the nearest enemies for 7 s.'],
    ['orb_emp', 'orbital', 4, 'EMP Lance', 380, 100, 'point', 'empstrike', { r: 34, dur: 7, delay: 2 }, 'Stuns every enemy machine in a 34 m circle.'],
    ['orb_rods', 'orbital', 5, 'Kinetic Rod Storm', 650, 150, 'point', 'barrage', { dmg: 520, r: 26, n: 7, delay: 3, dur: 3, big: 1 }, 'Seven telephone-pole rods. Nothing survives a direct hit.'],
    ['orb_annihilator', 'orbital', 6, 'Annihilator Lance', 1100, 240, 'point', 'strike', { dmg: 2600, r: 30, n: 1, delay: 4, big: 1 }, 'The largest weapon in orbit. Leaves a crater.'],
    ['air_strafe', 'airsup', 1, 'Strafing Run', 160, 45, 'point', 'strafe', { dmg: 26, r: 8, n: 40, len: 70 }, 'A jet rakes a 70 m line with cannon fire.'],
    ['air_missile', 'airsup', 2, 'Missile Strike', 260, 70, 'point', 'missiles', { dmg: 220, r: 40, n: 6, pen: 180 }, 'Six guided missiles seek armor in a 40 m circle.'],
    ['air_cluster', 'airsup', 3, 'Cluster Bombs', 340, 80, 'point', 'cluster', { dmg: 120, r: 24, n: 28 }, 'Twenty-eight bomblets carpet a 24 m circle.'],
    ['air_napalm', 'airsup', 4, 'Napalm Run', 360, 90, 'point', 'napalmrun', { dmg: 1, r: 14, n: 4, len: 60, dur: 9 }, 'Four fire zones along a 60 m line.'],
    ['air_gunship', 'airsup', 5, 'Gunship on Station', 600, 160, 'point', 'gunship', { n: 1, dur: 45 }, 'A heavy gunship circles the target for 45 s.'],
    ['air_bomber', 'airsup', 6, 'Heavy Bomber Run', 800, 180, 'point', 'carpetrun', { dmg: 300, r: 13, n: 16, len: 130 }, 'Sixteen heavy bombs along a 130 m line.'],
    ['log_supply', 'logistics', 1, 'Supply Drop', 0, 120, 'none', 'supply', { cp: 260 }, 'Instantly grants 260 Command Points.'],
    ['log_repair', 'logistics', 2, 'Repair Beacon', 220, 75, 'point', 'healzone', { r: 26, dur: 12, heal: 0.4 }, 'Restores 40% hull to allies in a 26 m circle over 12 s.'],
    ['log_ammo', 'logistics', 3, 'Ammunition Cache', 240, 80, 'point', 'ammozone', { r: 26, dur: 15 }, 'Allies in a 26 m circle fire 40% faster for 15 s.'],
    ['log_fuel', 'logistics', 4, 'Fuel Surge', 300, 110, 'none', 'fuel', { dur: 15 }, 'All your units move 40% faster for 15 s.'],
    ['log_hospital', 'logistics', 5, 'Field Hospital', 340, 100, 'point', 'hospital', { r: 30, dur: 14, heal: 0.6 }, 'Heals infantry and replaces lost soldiers in a 30 m circle.'],
    ['log_reset', 'logistics', 6, 'Logistic Overdrive', 500, 180, 'point', 'resetcd', { r: 45 }, 'Recharges every ability of allies in a 45 m circle.'],
    ['fort_mg', 'fort', 1, 'MG Sentry', 170, 55, 'point', 'sentry', { cls: 'sentry_mg', n: 1, dur: 90 }, 'Drops an automated machine-gun nest for 90 s.'],
    ['fort_at', 'fort', 2, 'Missile Sentry', 260, 75, 'point', 'sentry', { cls: 'sentry_at', n: 1, dur: 90 }, 'Drops an anti-armor missile sentry for 90 s.'],
    ['fort_aa', 'fort', 3, 'Flak Battery', 260, 75, 'point', 'sentry', { cls: 'sentry_aa', n: 1, dur: 100 }, 'Drops radar-laid flak guns for 100 s.'],
    ['fort_mortar', 'fort', 4, 'Mortar Pit', 300, 90, 'point', 'sentry', { cls: 'mortarpit', n: 2, dur: 90 }, 'Drops two mortar pits for 90 s.'],
    ['fort_dome', 'fort', 5, 'Shield Dome', 420, 110, 'point', 'dome', { r: 22, dur: 15 }, 'A 22 m dome that halves damage to allies inside for 15 s.'],
    ['fort_mines', 'fort', 6, 'Smart Minefield', 380, 100, 'point', 'minefield', { r: 28, n: 14 }, 'Fourteen mines across a 28 m circle.'],
    ['ew_recon', 'ewar', 1, 'Recon Sweep', 120, 40, 'point', 'reveal', { r: 120, dur: 12 }, 'Reveals all enemies within 120 m for 12 s.'],
    ['ew_jam', 'ewar', 2, 'Jammer Field', 240, 70, 'point', 'jamzone', { r: 30, dur: 14 }, 'Enemies inside a 30 m circle lose 40% accuracy for 14 s.'],
    ['ew_hack', 'ewar', 3, 'Hack Uplink', 300, 90, 'point', 'hackzone', { r: 22, dur: 6 }, 'Stuns enemy machines in a 22 m circle for 6 s.'],
    ['ew_spoof', 'ewar', 4, 'Spoofed Signals', 260, 80, 'point', 'spoof', { n: 3, dur: 15 }, 'Projects three holo decoys of your strongest unit.'],
    ['ew_blackout', 'ewar', 5, 'Blackout', 480, 150, 'none', 'blackout', { dur: 15 }, 'Halves enemy sight range across the map for 15 s.'],
    ['ew_scan', 'ewar', 6, 'Orbital Scan', 520, 160, 'none', 'scan', { dur: 12 }, 'Reveals the whole map for 12 s.'],
    ['re_para', 'reinf', 1, 'Paratroopers', 200, 70, 'point', 'drop', { cls: 'rifle', n: 2 }, 'Two rifle squads drop in by pod.'],
    ['re_exo', 'reinf', 2, 'Exo Drop', 360, 90, 'point', 'drop', { cls: 'exo', n: 1 }, 'An exo-suit squad lands on target.'],
    ['re_armor', 'reinf', 3, 'Armor Drop', 480, 110, 'point', 'drop', { cls: 'mbt', n: 1 }, 'A main battle tank drops from orbit.'],
    ['re_mech', 'reinf', 4, 'Mech Drop', 620, 130, 'point', 'drop', { cls: 'mmech', n: 1 }, 'A battle mech lands in a drop pod.'],
    ['re_heavy', 'reinf', 5, 'Heavy Drop', 820, 170, 'point', 'drop', { cls: 'htank', n: 1 }, 'A super-heavy tank arrives by orbital lifter.'],
    ['re_titan', 'reinf', 6, 'Titanfall', 1300, 260, 'point', 'drop', { cls: 'titan', n: 1 }, 'A Titan falls from orbit, crushing what it lands on.'],
  ];
  SM.STRATAGEMS = S.map(a => ({ id: a[0], br: a[1], rank: a[2], name: a[3], cp: a[4], cd: a[5], target: a[6], fx: a[7], p: a[8], desc: a[9],
    rp: Math.round(900 * Math.pow(1.75, a[2] - 1) / 10) * 10, price: Math.round(4000 * Math.pow(1.9, a[2] - 1) / 100) * 100 }));
  SM.STRAT = {}; SM.STRATAGEMS.forEach(s => SM.STRAT[s.id] = s);
  SM.STRATAGEMS.forEach(s => { const prev = SM.STRATAGEMS.find(x => x.br === s.br && x.rank === s.rank - 1); s.parent = prev ? prev.id : null; });
  SM.stratUpgrades = function (s) {
    const has = k => s.p[k] !== undefined;
    const L = [
      { id: 'cd', tier: 1, name: 'Rapid Rearm', desc: '-20% cooldown', eff: { cd: -0.2 } },
      { id: 'cost', tier: 1, name: 'Requisition Priority', desc: '-20% CP cost', eff: { cost: -0.2 } },
    ];
    if (has('dmg') && s.p.dmg > 1) L.push({ id: 'power', tier: 2, name: 'Heavier Payload', desc: '+30% damage', eff: { dmg: 0.3 } });
    else if (has('heal')) L.push({ id: 'power', tier: 2, name: 'Advanced Nanites', desc: '+40% healing', eff: { heal: 0.4 } });
    else if (has('cp')) L.push({ id: 'power', tier: 2, name: 'Bigger Crates', desc: '+50% Command Points', eff: { cp: 0.5 } });
    else L.push({ id: 'power', tier: 2, name: 'Extended Run', desc: '+40% duration', eff: { dur: 0.4 } });
    if (has('r')) L.push({ id: 'radius', tier: 2, name: 'Wide Pattern', desc: '+25% radius', eff: { r: 0.25 } });
    if (has('n')) L.push({ id: 'count', tier: 2, name: 'Extra Ordnance', desc: s.fx === 'drop' || s.fx === 'sentry' || s.fx === 'gunship' ? '+1 unit' : '+30% count', eff: { n: s.fx === 'drop' || s.fx === 'sentry' || s.fx === 'gunship' || s.p.n < 4 ? 'plus1' : 0.3 } });
    L.push({ id: 'elite', tier: 3, name: 'Command Override', desc: 'Calls in a second, half-strength strike', eff: { echo: 1 } });
    if (s.fx !== 'supply') L.push({ id: 'delay', tier: 3, name: 'Hot Line', desc: 'Arrives 50% sooner and costs 10% less', eff: { delay: -0.5, cost: -0.1 } });
    return L.map(u => Object.assign(u, { price: Math.round(s.price * (0.35 + 0.35 * u.tier) / 100) * 100 }));
  };
  SM.stratParams = function (s, ups) {
    const p = Object.assign({}, s.p, { cp: s.cp, cd: s.cd, delay: s.p.delay || 1.6 });
    let cost = 0, cd = 0;
    (ups || []).forEach(id => {
      const u = SM.stratUpgrades(s).find(x => x.id === id); if (!u) return;
      const e = u.eff;
      if (e.cd) cd += e.cd; if (e.cost) cost += e.cost;
      if (e.dmg && p.dmg) p.dmg *= 1 + e.dmg; if (e.heal) p.heal *= 1 + e.heal; if (e.r) p.r *= 1 + e.r;
      if (e.dur && p.dur) p.dur *= 1 + e.dur;
      if (e.n === 'plus1') p.n = (p.n || 1) + 1; else if (e.n) p.n = Math.round(p.n * (1 + e.n));
      if (e.echo) p.echo = 1; if (e.delay) p.delay *= 1 + e.delay;
      if (s.fx === 'supply' && e.cp) p.cpGain = s.p.cp * (1 + e.cp);
    });
    if (s.fx === 'supply') p.cpGain = p.cpGain || s.p.cp;
    p.cost = Math.round(s.cp * (1 + cost)); p.cooldown = s.cd * (1 + cd);
    return p;
  };

  // ---------------------------------------------------------------- customisation parts
  // kinds: g = ground vehicles (track/wheel/hover/mech/static), t = tracked only, i = infantry, a = aircraft, n = naval
  // req: mod id of the same unit that must be installed. group: only one part of the group can be equipped.
  const K = [
    ['insignia', 'Faction Insignia', 'Decals', 1, 'gna', null, null, 0.5, 'Painted faction emblem on both sides.'],
    ['number', 'Tactical Number', 'Decals', 1, 'gna', null, null, 0.5, 'Large stencilled hull number.'],
    ['patch', 'Unit Patches', 'Gear', 1, 'i', null, null, 0.4, 'Shoulder patches in faction colours.'],
    ['helmetnet', 'Helmet Netting', 'Gear', 1, 'i', null, null, 0.5, 'Scrim netting over every helmet.'],
    ['matte', 'Matte Finish', 'Finish', 1, 'gian', null, 'finish', 0.6, 'Flat, non-reflective paint.'],
    ['gloss', 'Gloss Finish', 'Finish', 1, 'gian', null, 'finish', 0.6, 'Polished parade-ground shine.'],
    ['tracerRed', 'Red Tracers', 'Tracers', 1, 'gian', null, 'tracer', 0.4, 'Red tracer rounds and beams.'],
    ['tracerGreen', 'Green Tracers', 'Tracers', 1, 'gian', null, 'tracer', 0.4, 'Green tracer rounds and beams.'],
    ['tracerBlue', 'Blue Tracers', 'Tracers', 1, 'gian', null, 'tracer', 0.4, 'Blue tracer rounds and beams.'],
    ['stowage', 'Stowage Kit', 'Kits', 1, 'g', null, null, 0.6, 'Crates, bags and jerry cans strapped to the hull.'],
    ['pennant', 'Antenna Pennant', 'Kits', 1, 'gn', null, null, 0.4, 'A pennant flying from the antenna.'],
    ['wingstripes', 'Recognition Stripes', 'Decals', 1, 'a', null, null, 0.5, 'Black and white wing stripes.'],
    ['sandbags', 'Sandbag Wall', 'Kits', 2, 'g', 'liner', null, 0.8, 'Extra protection piled on the front deck.'],
    ['sparetracks', 'Spare Track Links', 'Kits', 2, 't', 'liner', null, 0.8, 'Track sections bolted to the glacis.'],
    ['searchlight', 'Searchlight', 'Kits', 2, 'g', 'optics', null, 0.8, 'A working searchlight on the roof.'],
    ['camonet', 'Camouflage Net', 'Kits', 2, 'gi', 'optics', null, 0.9, 'Draped netting that breaks up the outline.'],
    ['goggles', 'Night Goggles', 'Gear', 2, 'i', 'optics', null, 0.7, 'Glowing four-lens night vision.'],
    ['backpack', 'Extended Packs', 'Gear', 2, 'i', 'liner', null, 0.7, 'Bigger packs with radios and bedrolls.'],
    ['sharkmouth', 'Shark Mouth', 'Decals', 2, 'a', 'liner', null, 0.9, 'Classic teeth on the nose.'],
    ['hullband', 'Hull Band', 'Decals', 2, 'n', 'liner', null, 0.8, 'A bold band painted along the hull.'],
    ['glowRed', 'Red Lights', 'Lights', 2, 'gian', 'optics', 'glow', 0.7, 'Red sensors, visors and running lights.'],
    ['glowGold', 'Gold Lights', 'Lights', 2, 'gian', 'optics', 'glow', 0.7, 'Gold sensors, visors and running lights.'],
    ['glowViolet', 'Violet Lights', 'Lights', 2, 'gian', 'optics', 'glow', 0.7, 'Violet sensors, visors and running lights.'],
    ['glowWhite', 'White Lights', 'Lights', 2, 'gian', 'optics', 'glow', 0.7, 'Cold white sensors, visors and running lights.'],
    ['slat', 'Slat Cage', 'Kits', 3, 'g', 'era', null, 1.1, 'Bar armor cage around the hull.'],
    ['dozer', 'Dozer Blade', 'Kits', 3, 't', 'era', null, 1.1, 'Front-mounted earthmoving blade.'],
    ['spikes', 'Ram Spikes', 'Kits', 3, 'g', 'engine', null, 1.0, 'Welded spikes for close encounters.'],
    ['metallic', 'Metallic Finish', 'Finish', 3, 'gian', 'gun', 'finish', 1.0, 'Metal-flake paint.'],
    ['weathered', 'Battle Weathered', 'Finish', 3, 'gian', 'gun', 'finish', 1.0, 'Mud, rust and scorch marks.'],
    ['shoulderpads', 'Heavy Pauldrons', 'Gear', 3, 'i', 'era', null, 1.0, 'Armored shoulder plates.'],
    ['contrail', 'Smoke Contrails', 'Kits', 3, 'a', 'engine', null, 1.0, 'Coloured smoke from the wingtips.'],
    ['flagline', 'Signal Flags', 'Kits', 3, 'n', 'era', null, 1.0, 'A line of signal flags from bow to mast.'],
    ['killmarks', 'Kill Marks', 'Decals', 4, 'gna', 'elite', null, 1.3, 'A row of victory markings.'],
    ['skull', 'Skull Emblem', 'Decals', 4, 'gian', 'elite', null, 1.3, 'A skull painted on hull or armor.'],
    ['pearl', 'Pearl Finish', 'Finish', 4, 'gian', 'elite', 'finish', 1.5, 'Iridescent pearlescent paint.'],
    ['goldtrim', 'Gold Trim', 'Kits', 4, 'gian', 'elite', null, 1.5, 'Gold-plated trim and fittings.'],
    ['cape', 'Officer Capes', 'Gear', 4, 'i', 'elite', null, 1.2, 'Long capes for the veterans.'],
    ['tracerGold', 'Gold Tracers', 'Tracers', 4, 'gian', 'elite', 'tracer', 1.2, 'Gold tracers for show-offs.'],
    ['holo', 'Holo Halo', 'Lights', 5, 'gian', 'abilC', null, 2.0, 'A floating holographic command ring.'],
    ['chromeTrim', 'Chrome Fittings', 'Kits', 5, 'gian', 'abilC', null, 2.0, 'Mirror-chrome barrels, tracks and trim.'],
  ];
  SM.CUSTOMS = K.map(a => ({ id: a[0], name: a[1], cat: a[2], tier: a[3], kinds: a[4], req: a[5], group: a[6], mul: a[7], desc: a[8] }));
  SM.CUSTOM = {}; SM.CUSTOMS.forEach(c => SM.CUSTOM[c.id] = c);
  SM.unitKind = function (u) {
    const mv = SM.CLASSES[u.cls].move;
    if (mv === 'inf') return 'i';
    if (mv === 'heli' || mv === 'plane') return 'a';
    if (mv === 'naval' || mv === 'sub') return 'n';
    return mv === 'track' ? 't' : 'g';
  };
  SM.customsFor = function (u) {
    const k = SM.unitKind(u);
    return SM.CUSTOMS.filter(c => c.kinds.indexOf(k) >= 0 || (k === 't' && c.kinds.indexOf('g') >= 0) || (k === 'n' && SM.CLASSES[u.cls].move === 'amphib' && c.kinds.indexOf('g') >= 0));
  };
  SM.customPrice = (u, c) => Math.round(1500 * c.mul * (1 + 0.6 * (u.rank - 1)) * (0.7 + 0.3 * c.tier) / 100) * 100;
  SM.TRACER = { tracerRed: 0xff4a3a, tracerGreen: 0x5aff6a, tracerBlue: 0x5ab8ff, tracerGold: 0xffd24a };
  SM.GLOW = { glowRed: 0xff3a2a, glowGold: 0xffc23a, glowViolet: 0xb06aff, glowWhite: 0xf0f6ff };

  SM.buildTrees();
})();
