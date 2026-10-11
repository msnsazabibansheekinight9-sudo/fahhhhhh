// Content database: eras, factions, classes, weapons, abilities, star cards, heroes, vehicles, maps, modes.
// Everything is an original name. The game draws on the large-scale sci-fi battle genre without using any
// trademarked names, characters or designs.
var SF = window.SF || (window.SF = {});

(function () {
  var D = SF.D = {};

  // ---------------------------------------------------------------- eras & factions
  D.eras = [
    { id: 'cw', name: 'The Concord Wars', years: '22–19 BCR', blurb: 'Legion armies grown for war face the endless synth hosts of the Trade Syndicate.', sides: ['concord', 'syndicate'] },
    { id: 'gcw', name: 'The Rebellion', years: '0–4 ACR', blurb: 'A ragged Free Alliance fights the Dominion and its fleets of dreadnoughts.', sides: ['alliance', 'dominion'] },
    { id: 'orr', name: 'Outer Rim Reckoning', years: '9 ACR', blurb: 'Rim Rangers of the new Concord hunt the scattered warlords of the Dominion Remnant.', sides: ['rangers', 'remnant'] }
  ];
  D.eraById = {}; D.eras.forEach(function (e) { D.eraById[e.id] = e; });

  // style = which trooper model; pal = [primary, secondary, accent, visor/eye]
  D.factions = {
    concord:   { id: 'concord', name: 'Concord Legion', short: 'LEGION', era: 'cw', side: 0, ui: '#4fa3ff', style: 'legion', pal: [0xe8e6df, 0x2f63c4, 0x1c1f26, 0x101418], bolt: 0x3d8bff },
    syndicate: { id: 'syndicate', name: 'Syndicate Synth Host', short: 'SYNDICATE', era: 'cw', side: 1, ui: '#d9a441', style: 'synth', pal: [0xc9b07a, 0x8b6d3a, 0x3a3226, 0xff5a1f], bolt: 0xff3b2f },
    alliance:  { id: 'alliance', name: 'Free Alliance', short: 'ALLIANCE', era: 'gcw', side: 0, ui: '#ff8a3d', style: 'rebel', pal: [0x6f6a52, 0xb8a582, 0xd6542a, 0x262420], bolt: 0xff4a2a },
    dominion:  { id: 'dominion', name: 'Dominion Army', short: 'DOMINION', era: 'gcw', side: 1, ui: '#c9d2df', style: 'dominion', pal: [0xf1f2f4, 0x2a2d33, 0x5d6370, 0x0b0c0f], bolt: 0xff2a1a },
    rangers:   { id: 'rangers', name: 'Rim Rangers', short: 'RANGERS', era: 'orr', side: 0, ui: '#5fd38a', style: 'ranger', pal: [0xd27b2a, 0x3c4a3e, 0xe8e2d0, 0x1a1d22], bolt: 0x46b4ff },
    remnant:   { id: 'remnant', name: 'Dominion Remnant', short: 'REMNANT', era: 'orr', side: 1, ui: '#e04848', style: 'remnant', pal: [0x2b2d33, 0x9a1b1b, 0x111216, 0xc8102e], bolt: 0xff1a1a },
    // natives (Hunt / Forest Hunt)
    raiders:   { id: 'raiders', name: 'Dune Raiders', short: 'RAIDERS', era: '*', side: 1, ui: '#c7a679', style: 'raider', pal: [0xb59a6e, 0x6e5a3e, 0x2c2620, 0x15130f], bolt: 0xffaa33 },
    wroshan:   { id: 'wroshan', name: 'Wroshan Clans', short: 'WROSHAN', era: '*', side: 0, ui: '#a0743f', style: 'wroshan', pal: [0x7a5532, 0x4c3420, 0x9b8c6c, 0x111111], bolt: 0x6fc3ff },
    tiklets:   { id: 'tiklets', name: 'Tiklet Tribe', short: 'TIKLETS', era: '*', side: 0, ui: '#9d7a4e', style: 'tiklet', pal: [0x6b4d2e, 0x8b6b45, 0x3e5b2a, 0x111111], bolt: 0xffcc66 },
    spireborn: { id: 'spireborn', name: 'Spireborn Hive', short: 'SPIREBORN', era: '*', side: 1, ui: '#b5653a', style: 'insect', pal: [0xa15a32, 0x5e3b22, 0x88a04a, 0x111111], bolt: 0x9cff5a }
  };

  // ---------------------------------------------------------------- weapons
  // kind: carbine rifle repeater sniper pistol hpistol shotgun launcher flamer ion
  // dmg per bolt, rpm, heat per shot, spread (deg, hip), bolt speed m/s, range (m, full damage), pellets
  var W = D.weapons = {};
  function wp(id, name, kind, dmg, rpm, heat, spread, speed, range, extra) {
    var o = { id: id, name: name, kind: kind, dmg: dmg, rpm: rpm, heat: heat, spread: spread, speed: speed, range: range, pellets: 1, cool: 38, zoom: 1.35, price: 0 };
    if (extra) for (var k in extra) o[k] = extra[k];
    W[id] = o;
  }
  // Concord
  wp('vk15', 'VK-15 Longcarbine', 'rifle', 30, 300, 8.5, 1.0, 230, 70, { desc: 'Standard legion rifle. Long barrel, steady bolts.' });
  wp('vk15s', 'VK-15s Trooper Carbine', 'carbine', 22, 420, 6.5, 1.4, 220, 50, { price: 1500 });
  wp('vk15x', 'VK-15X Marksman', 'sniper', 90, 65, 32, 0.15, 420, 220, { zoom: 4, price: 0 });
  wp('zr6', 'ZR-6 Rotary Repeater', 'repeater', 15, 760, 2.4, 2.4, 210, 45, { spin: 0.45 });
  wp('vk15le', 'VK-15LE Light Repeater', 'repeater', 19, 560, 3.6, 1.8, 220, 55, { price: 2500 });
  wp('mk17', 'MK-17 Modular Rifle', 'rifle', 26, 380, 7.0, 1.1, 240, 70, { price: 3000, burst: 3 });
  wp('vp17', 'VP-17 Sidearm', 'pistol', 32, 280, 9, 1.0, 220, 40, {});
  wp('rp6', 'RP-6 Rocket Tube', 'launcher', 160, 35, 70, 0.4, 70, 200, { radius: 5.5, antiv: 2.5 });
  wp('westline5', 'Westline M5 Assault Rifle', 'rifle', 32, 320, 8, 0.9, 240, 80, { price: 3500 });
  wp('valkor38', 'Valkor-38 Longrifle', 'sniper', 110, 45, 42, 0.1, 460, 260, { zoom: 5, price: 4000 });
  wp('scatter15', 'VK-15 Scatter Carbine', 'shotgun', 15, 85, 30, 6, 180, 14, { pellets: 8 });
  // Syndicate
  wp('e55', 'E-55 Synth Blaster', 'carbine', 24, 400, 6.8, 1.5, 210, 50, {});
  wp('e55s', 'E-55S Long Rifle', 'sniper', 85, 70, 30, 0.15, 420, 220, { zoom: 4 });
  wp('e55c', 'E-55C Heavy Repeater', 'repeater', 16, 700, 2.6, 2.3, 210, 45, {});
  wp('e60r', 'E-60R Rocket Launcher', 'launcher', 160, 35, 70, 0.4, 70, 200, { radius: 5.5, antiv: 2.5 });
  wp('se14', 'SE-14 Sidearm', 'pistol', 22, 480, 7, 1.6, 210, 35, {});
  wp('wristbat', 'Wrist Battery', 'repeater', 18, 520, 3.4, 2.4, 200, 40, {});
  wp('cr22', 'CR-22 Scattergun', 'shotgun', 14, 90, 30, 6.5, 180, 14, { pellets: 8, price: 2500 });
  wp('iq11', 'IQ-11 Precision Rifle', 'sniper', 120, 40, 45, 0.08, 480, 280, { zoom: 5, price: 4000 });
  wp('sonic', 'Sonic Shard Projector', 'ion', 55, 120, 18, 0.8, 120, 30, { radius: 2.5, price: 3000 });
  wp('e55b', 'E-55B Burst Blaster', 'carbine', 22, 520, 7.2, 1.3, 220, 50, { burst: 3, price: 2000 });
  // Alliance
  wp('ar280', 'AR-280 Battle Rifle', 'rifle', 34, 260, 9.5, 0.9, 240, 80, {});
  wp('ar280c', 'AR-280c Carbine', 'carbine', 24, 400, 6.6, 1.3, 230, 55, { price: 1500 });
  wp('ar280cfe', 'AR-280 CFE Burst Rifle', 'rifle', 30, 400, 8, 1.0, 240, 75, { burst: 3, price: 3500 });
  wp('rr9', 'RR-9 Freedom Repeater', 'repeater', 16, 690, 2.5, 2.3, 210, 45, {});
  wp('nt424', 'NT-424 Longshot', 'sniper', 100, 55, 36, 0.1, 440, 240, { zoom: 4.5 });
  wp('dh71', 'DH-71 Blaster Pistol', 'pistol', 26, 380, 8, 1.2, 220, 40, {});
  wp('dr45', 'DR-45 Heavy Pistol', 'hpistol', 58, 130, 20, 0.6, 230, 45, { price: 2500 });
  wp('crossbolt', 'Wrosh Crossbolt', 'shotgun', 40, 75, 28, 3.5, 160, 30, { pellets: 3, price: 3000 });
  wp('seeker', 'Seeker Rocket Pod', 'launcher', 150, 35, 70, 0.4, 75, 220, { radius: 5, antiv: 2.6, homing: true });
  wp('ionrifle', 'Ion Rifle', 'ion', 30, 260, 9, 1, 210, 60, { antiv: 3, price: 2500 });
  wp('a180', 'A-180 Field Blaster', 'carbine', 26, 360, 7, 1.2, 230, 55, {});
  // Dominion
  wp('ek11', 'EK-11 Trooper Rifle', 'carbine', 25, 420, 6.8, 1.4, 220, 50, {});
  wp('ek11d', 'EK-11D Rapid Carbine', 'carbine', 21, 540, 6.2, 1.6, 220, 45, { price: 1500 });
  wp('dlt91', 'DLT-91 Heavy Rifle', 'repeater', 17, 660, 2.6, 2.1, 210, 50, {});
  wp('dlt91x', 'DLT-91X Sniper', 'sniper', 92, 60, 33, 0.12, 430, 230, { zoom: 4.5 });
  wp('tr21', 'TR-21 Light Repeater', 'repeater', 30, 300, 6, 1.4, 230, 70, { price: 3000 });
  wp('rt79', 'RT-79C Heavy Blaster', 'repeater', 22, 520, 3.1, 1.8, 220, 55, { price: 3500 });
  wp('se44', 'SE-44 Pistol', 'pistol', 28, 340, 9, 1.1, 220, 40, {});
  wp('ek22', 'EK-22 Twin-barrel', 'rifle', 22, 620, 5.2, 1.6, 230, 55, { price: 3500 });
  wp('ec17', 'EC-17 Scout Pistol', 'hpistol', 52, 140, 20, 0.6, 240, 45, { price: 2000 });
  wp('dlt91scatter', 'DT-12 Scatter Blaster', 'shotgun', 14, 90, 30, 6, 180, 14, { pellets: 8 });
  wp('hhb3', 'HH-B3 Rocket Launcher', 'launcher', 160, 35, 70, 0.4, 70, 200, { radius: 5.5, antiv: 2.5 });
  // Rangers (Outer Rim era)
  wp('nr8', 'NR-8 Ranger Carbine', 'carbine', 25, 410, 6.6, 1.3, 225, 55, {});
  wp('rr12', 'RR-12 Ranger Repeater', 'repeater', 18, 650, 2.7, 2.1, 215, 50, {});
  wp('cycler', 'Cycler Longrifle', 'sniper', 125, 35, 50, 0.08, 380, 280, { zoom: 5 });
  wp('ib49', 'IB-49 Heavy Pistol', 'hpistol', 55, 140, 19, 0.6, 235, 45, {});
  wp('relbey', 'Relbey Micro Launcher', 'launcher', 90, 90, 32, 1.2, 60, 120, { radius: 3.5, antiv: 1.6, price: 3500 });
  wp('shandmk1', 'Shand Mk1 Longrifle', 'sniper', 105, 60, 38, 0.1, 460, 260, { zoom: 5, price: 4000 });
  wp('westline35', 'Westline 35 Pistol', 'pistol', 30, 320, 9, 1.0, 220, 40, {});
  wp('ranger12g', 'Ranger 12-Gauge Blaster', 'shotgun', 15, 90, 30, 6, 180, 14, { pellets: 8 });
  wp('ionpod', 'Ion Torpedo Pod', 'launcher', 150, 35, 70, 0.4, 70, 200, { radius: 5, antiv: 3 });
  // Remnant
  wp('ek11r', 'EK-11 Remnant Rifle', 'carbine', 26, 410, 6.8, 1.3, 225, 52, {});
  wp('shadowarm', 'Shadow Arm Cannon', 'repeater', 20, 600, 3, 1.9, 220, 55, {});
  wp('pulsephase', 'Pulse-Phase Rifle', 'sniper', 140, 30, 55, 0.05, 520, 300, { zoom: 5, disintegrate: true });
  wp('nk14', 'NK-14 Sidearm', 'pistol', 28, 340, 9, 1.0, 220, 40, {});
  wp('pyre', 'Pyrestream Projector', 'flamer', 7, 900, 1.6, 8, 28, 11, { price: 3000 });
  wp('remscatter', 'R-7 Riot Scatter', 'shotgun', 15, 90, 30, 6, 180, 14, { pellets: 8 });
  wp('remrocket', 'RL-9 Rocket Launcher', 'launcher', 160, 35, 70, 0.4, 70, 200, { radius: 5.5, antiv: 2.5 });
  wp('ek11rx', 'EK-11RX Marksman', 'rifle', 34, 250, 9, 0.8, 250, 85, { price: 3000 });
  // native
  wp('gaffi', 'Raider Cycler', 'sniper', 95, 40, 40, 0.15, 360, 220, { zoom: 3.5 });
  wp('slingbow', 'Tribal Sling-bow', 'shotgun', 45, 70, 20, 2.0, 70, 40, { pellets: 1, arc: true });
  wp('wroshcross', 'Wroshan Crossbolt', 'shotgun', 45, 75, 28, 3.5, 160, 30, { pellets: 3 });
  wp('hivesonic', 'Hive Sonic Blaster', 'ion', 50, 140, 16, 1, 120, 30, { radius: 2.5 });
  // Hero blaster weapons
  wp('h_heavypistol', 'Custom Heavy Pistol', 'hpistol', 70, 170, 14, 0.4, 260, 60, { hero: 1 });
  wp('h_twinpistols', 'Twin Sidearms', 'pistol', 32, 620, 4.5, 1.1, 240, 45, { hero: 1 });
  wp('h_bowcaster', 'Heirloom Crossbolt', 'shotgun', 60, 110, 18, 2.6, 180, 40, { pellets: 3, hero: 1 });
  wp('h_carbine', 'Hunter Carbine', 'rifle', 40, 330, 6.5, 0.7, 250, 80, { hero: 1 });
  wp('h_sniper', 'Hunter Longrifle', 'sniper', 150, 55, 30, 0.05, 520, 300, { zoom: 5, hero: 1 });
  wp('h_repeater', 'Ranger Heavy Repeater', 'repeater', 26, 720, 2.2, 1.6, 230, 60, { hero: 1 });
  wp('h_sporting', 'Diplomat Sporting Blaster', 'rifle', 46, 260, 10, 0.5, 260, 90, { hero: 1 });
  wp('h_amban', 'Ferrosteel Phase Rifle', 'sniper', 160, 45, 40, 0.05, 520, 300, { zoom: 4, hero: 1, disintegrate: true });
  wp('h_sidearms', 'Gunslinger Revolvers', 'hpistol', 55, 260, 10, 0.6, 250, 55, { hero: 1 });
  wp('h_spear', 'Ferrosteel Spear', 'melee', 70, 0, 0, 0, 0, 3, { hero: 1 });

  // ---------------------------------------------------------------- classes
  // Abilities are listed by id (see D.abilities). weapons: per-faction lists (first = default)
  D.classes = [
    { id: 'assault', name: 'Assault', hp: 150, speed: 1.0, abilities: ['thermal', 'scanDart', 'scatterBurst'], desc: 'Front-line rifleman. Grenades and a close-range scatter burst.' },
    { id: 'heavy', name: 'Heavy', hp: 220, speed: 0.9, abilities: ['shieldWall', 'barrage', 'rocketShot'], desc: 'Slow and tough. Repeaters, a deployable shield and an anti-armour rocket.' },
    { id: 'specialist', name: 'Specialist', hp: 120, speed: 1.05, abilities: ['tripmine', 'cloak', 'explosiveShot'], desc: 'Long-range marksman with mines and a personal cloak.' },
    { id: 'officer', name: 'Officer', hp: 150, speed: 1.0, abilities: ['rally', 'turret', 'stunGrenade'], desc: 'Commands the squad. Healing rally aura and a deployable turret.' },
    { id: 'engineer', name: 'Engineer', hp: 150, speed: 1.0, abilities: ['repair', 'detpack', 'medDrone'], desc: 'Repairs vehicles, heals allies, and plants charges on armour.' },
    { id: 'commando', name: 'Commando', hp: 180, speed: 1.08, abilities: ['dash', 'thermal', 'overcharge'], desc: 'Elite shock troops. Different on every side.' }
  ];
  D.classById = {}; D.classes.forEach(function (c) { D.classById[c.id] = c; });

  // Reinforcements (cost battle points)
  D.reinforcements = [
    { id: 'jet', name: 'Jet Trooper', hp: 200, speed: 1.1, cost: 1500, abilities: ['jetBoost', 'rocketShot', 'hover'], jetpack: true, desc: 'Jetpack infantry with wrist rockets.' },
    { id: 'infiltrator', name: 'Infiltrator', hp: 180, speed: 1.15, cost: 1500, abilities: ['cloak', 'dash', 'explosiveShot'], desc: 'Cloaked scout with a lethal carbine.' },
    { id: 'enforcer', name: 'Enforcer', hp: 350, speed: 0.85, cost: 2000, abilities: ['flame', 'shieldWall', 'stunGrenade'], desc: 'Armoured flame trooper.' },
    { id: 'aerial', name: 'Aerial', hp: 200, speed: 1.1, cost: 1500, abilities: ['jumpPack', 'barrage', 'thermal'], jumpPack: true, desc: 'Jump-pack trooper with an orbital barrage.' }
  ];
  D.reinfById = {}; D.reinforcements.forEach(function (c) { D.reinfById[c.id] = c; });

  D.factionClassNames = {
    concord: { commando: 'Vanguard Trooper', jet: 'Legion Jet Trooper', infiltrator: 'Recon Legionnaire', enforcer: 'Flame Legionnaire', aerial: 'Sky Legionnaire' },
    syndicate: { commando: 'Iron Guard Synth', jet: 'Rocket Synth', infiltrator: 'Commando Synth', enforcer: 'Brute Synth', aerial: 'Sky Synth' },
    alliance: { commando: 'Pathfinder', jet: 'Rocketeer', infiltrator: 'Sharpshooter', enforcer: 'Wroshan Warrior', aerial: 'Skyborne Ranger' },
    dominion: { commando: 'Coastal Vanguard', jet: 'Jump Trooper', infiltrator: 'Shade Trooper', enforcer: 'Incinerator Trooper', aerial: 'Orbital Trooper' },
    rangers: { commando: 'Clan Warrior', jet: 'Clan Skyblade', infiltrator: 'Bounty Tracker', enforcer: 'Ranger Juggernaut', aerial: 'Ranger Paratrooper' },
    remnant: { commando: 'Vanta Trooper', jet: 'Shadow Unit', infiltrator: 'Scout Trooper', enforcer: 'Purge Trooper', aerial: 'Remnant Drop Trooper' }
  };

  D.loadouts = {
    concord: { assault: ['vk15', 'vk15s', 'westline5', 'mk17'], heavy: ['zr6', 'vk15le'], specialist: ['vk15x', 'valkor38'], officer: ['vp17', 'mk17'], engineer: ['scatter15', 'vk15s'], commando: ['vk15s', 'westline5'], jet: ['vp17'], infiltrator: ['mk17'], enforcer: ['zr6'], aerial: ['vk15s'], launcher: 'rp6' },
    syndicate: { assault: ['e55', 'e55b', 'sonic'], heavy: ['e55c', 'wristbat'], specialist: ['e55s', 'iq11'], officer: ['se14', 'e55b'], engineer: ['cr22', 'e55'], commando: ['e55b', 'wristbat'], jet: ['wristbat'], infiltrator: ['e55b'], enforcer: ['wristbat'], aerial: ['e55'], launcher: 'e60r' },
    alliance: { assault: ['a180', 'ar280', 'ar280c', 'ar280cfe', 'ionrifle'], heavy: ['rr9', 'crossbolt'], specialist: ['nt424', 'dr45'], officer: ['dh71', 'dr45'], engineer: ['crossbolt', 'ar280c'], commando: ['ar280c', 'ar280cfe'], jet: ['dh71'], infiltrator: ['ar280cfe'], enforcer: ['rr9'], aerial: ['ar280c'], launcher: 'seeker' },
    dominion: { assault: ['ek11', 'ek11d', 'ek22'], heavy: ['dlt91', 'tr21', 'rt79'], specialist: ['dlt91x', 'ec17'], officer: ['se44', 'ec17'], engineer: ['dlt91scatter', 'ek11d'], commando: ['ek22', 'ek11d'], jet: ['se44'], infiltrator: ['ek11d'], enforcer: ['rt79'], aerial: ['ek11'], launcher: 'hhb3' },
    rangers: { assault: ['nr8', 'westline35'], heavy: ['rr12', 'relbey'], specialist: ['cycler', 'shandmk1'], officer: ['westline35', 'ib49'], engineer: ['ranger12g', 'nr8'], commando: ['nr8', 'ib49'], jet: ['ib49'], infiltrator: ['nr8'], enforcer: ['rr12'], aerial: ['nr8'], launcher: 'ionpod' },
    remnant: { assault: ['ek11r', 'ek11rx'], heavy: ['shadowarm', 'pyre'], specialist: ['pulsephase', 'ek11rx'], officer: ['nk14', 'ek11r'], engineer: ['remscatter', 'ek11r'], commando: ['ek11r', 'shadowarm'], jet: ['shadowarm'], infiltrator: ['ek11r'], enforcer: ['pyre'], aerial: ['ek11r'], launcher: 'remrocket' },
    raiders: { assault: ['gaffi'], heavy: ['gaffi'], specialist: ['gaffi'], officer: ['gaffi'], engineer: ['gaffi'], commando: ['gaffi'] },
    wroshan: { assault: ['wroshcross'], heavy: ['wroshcross'], specialist: ['wroshcross'], officer: ['wroshcross'], engineer: ['wroshcross'], commando: ['wroshcross'] },
    tiklets: { assault: ['slingbow'], heavy: ['slingbow'], specialist: ['slingbow'], officer: ['slingbow'], engineer: ['slingbow'], commando: ['slingbow'] },
    spireborn: { assault: ['hivesonic'], heavy: ['hivesonic'], specialist: ['hivesonic'], officer: ['hivesonic'], engineer: ['hivesonic'], commando: ['hivesonic'] }
  };

  // ---------------------------------------------------------------- abilities
  // cd = cooldown seconds. Implementations in units.js (SF.Abilities)
  D.abilities = {
    thermal: { name: 'Thermal Charge', cd: 12, icon: '◉', desc: 'Throw a timed explosive.' },
    scanDart: { name: 'Scan Dart', cd: 18, icon: '◎', desc: 'Reveal nearby enemies on the map.' },
    scatterBurst: { name: 'Scatter Burst', cd: 10, icon: '⁂', desc: 'Two close-range shotgun blasts.' },
    shieldWall: { name: 'Shield Wall', cd: 20, icon: '▣', desc: 'Raise a bolt-blocking energy wall.' },
    barrage: { name: 'Orbital Barrage', cd: 25, icon: '☄', desc: 'Call a strike at your aim point.' },
    rocketShot: { name: 'Rocket', cd: 12, icon: '➶', desc: 'Fire an anti-armour rocket.' },
    tripmine: { name: 'Trip Mine', cd: 14, icon: '✱', desc: 'Lay a proximity mine.' },
    cloak: { name: 'Cloak', cd: 22, icon: '◌', desc: 'Become nearly invisible for 6 s.' },
    explosiveShot: { name: 'Explosive Shot', cd: 14, icon: '✸', desc: 'Your next three shots explode.' },
    rally: { name: 'Rally Aura', cd: 20, icon: '✚', desc: 'Heal and buff nearby allies.' },
    turret: { name: 'Sentry Turret', cd: 30, icon: '⊥', desc: 'Deploy an automated blaster turret.' },
    stunGrenade: { name: 'Stun Grenade', cd: 14, icon: '✺', desc: 'Stun and slow targets.' },
    repair: { name: 'Repair Field', cd: 16, icon: '⚙', desc: 'Repair nearby vehicles and heal allies.' },
    detpack: { name: 'Detpack', cd: 16, icon: '▤', desc: 'Throw a powerful charge, great against vehicles.' },
    medDrone: { name: 'Med Drone', cd: 25, icon: '✙', desc: 'Instantly heal yourself to full.' },
    dash: { name: 'Combat Dash', cd: 7, icon: '»', desc: 'Dash in the move direction.' },
    overcharge: { name: 'Overcharge', cd: 18, icon: '⚡', desc: 'Weapon does not heat for 6 s.' },
    jetBoost: { name: 'Jet Boost', cd: 6, icon: '⇑', desc: 'Rocket into the air.' },
    hover: { name: 'Hover', cd: 10, icon: '≋', desc: 'Hover in place while you fire.' },
    flame: { name: 'Flame Burst', cd: 9, icon: '♨', desc: 'Breathe fire in a cone.' },
    jumpPack: { name: 'Jump Pack', cd: 6, icon: '⇗', desc: 'Leap forward through the air.' },
    // hero abilities
    push: { name: 'Aether Push', cd: 10, icon: '◖', desc: 'Throw enemies back with a wave of force.' },
    pull: { name: 'Aether Pull', cd: 12, icon: '◗', desc: 'Drag an enemy to your blade.' },
    saberThrow: { name: 'Blade Throw', cd: 10, icon: '↻', desc: 'Throw your lumablade; it returns.' },
    leap: { name: 'Aether Leap', cd: 8, icon: '⤴', desc: 'Leap forward and crash down.' },
    choke: { name: 'Grip', cd: 14, icon: '✊', desc: 'Lift and crush your target.' },
    lightning: { name: 'Storm Lightning', cd: 12, icon: '⚡', desc: 'Channel lightning in a cone.' },
    spin: { name: 'Whirlwind', cd: 10, icon: '✲', desc: 'Spinning attack hits all around you.' },
    mindTrick: { name: 'Beguile', cd: 18, icon: '☯', desc: 'Nearby enemies forget you and stop firing.' },
    block: { name: 'Blade Ward', cd: 0, icon: '⛨', desc: 'Hold aim to deflect bolts.' },
    fury: { name: 'Fury', cd: 20, icon: '✦', desc: 'Faster swings and more damage for 8 s.' },
    heroRally: { name: 'Inspire', cd: 22, icon: '✚', desc: 'Heal allies and grant a shield.' },
    sharpshot: { name: 'Sharpshot', cd: 12, icon: '◈', desc: 'Your next 5 shots are deadly accurate and strong.' },
    shoulder: { name: 'Shoulder Charge', cd: 8, icon: '»', desc: 'Charge forward knocking enemies down.' },
    rocketHero: { name: 'Wrist Rocket', cd: 9, icon: '➶', desc: 'Explosive rocket.' },
    homing: { name: 'Seeker Swarm', cd: 18, icon: '⁘', desc: 'Launch homing micro-missiles at all nearby enemies.' },
    flameHero: { name: 'Flame Projector', cd: 10, icon: '♨', desc: 'Short-range flame cone.' },
    jetHero: { name: 'Rocket Pack', cd: 5, icon: '⇑', desc: 'Fly up with your jetpack.' },
    roar: { name: 'Battle Roar', cd: 16, icon: '☊', desc: 'Stun nearby enemies and heal yourself.' },
    grenadeHero: { name: 'Cluster Charge', cd: 10, icon: '◉', desc: 'Throw a cluster grenade.' },
    shieldHero: { name: 'Bubble Shield', cd: 20, icon: '◯', desc: 'Become invulnerable for 4 s.' },
    stunHero: { name: 'Stun Bolt', cd: 10, icon: '✺', desc: 'Stun the target in front of you.' },
    cloakHero: { name: 'Shadowstep', cd: 16, icon: '◌', desc: 'Cloak and gain speed.' },
    droneHero: { name: 'Seeker Drone', cd: 18, icon: '⊛', desc: 'A drone that hunts and zaps enemies.' },
    deflectHero: { name: 'Ferrosteel Deflect', cd: 14, icon: '⛨', desc: 'Armour reflects bolts for 4 s.' },
    darkSaber: { name: 'Shadow Blade', cd: 6, icon: '⚔', desc: 'Swap to your black blade for a heavy swing.' },
    snipeMark: { name: 'Mark Target', cd: 12, icon: '◎', desc: 'Reveal enemies and take bonus damage.' },
    dualFire: { name: 'Fan the Hammer', cd: 9, icon: '✶', desc: 'Empty both pistols at once.' }
  };

  // ---------------------------------------------------------------- star cards (passives)
  D.starCards = [
    { id: 'bodyArmor', name: 'Body Armour', desc: '+15% maximum health.', price: 1200 },
    { id: 'quickCool', name: 'Cooling Coils', desc: 'Weapons cool 30% faster.', price: 1200 },
    { id: 'fastRegen', name: 'Field Medic', desc: 'Health regenerates after 3 s instead of 5 s.', price: 1000 },
    { id: 'quickCd', name: 'Tactician', desc: 'Ability cooldowns 20% shorter.', price: 1500 },
    { id: 'capturer', name: 'Objective Runner', desc: 'Capture zones 35% faster.', price: 900 },
    { id: 'sprinter', name: 'Fleet Foot', desc: '+10% movement speed.', price: 1100 },
    { id: 'antiArmor', name: 'Tank Buster', desc: '+40% damage to vehicles.', price: 1300 },
    { id: 'marksman', name: 'Steady Hands', desc: '35% less weapon spread.', price: 1200 },
    { id: 'heavyHitter', name: 'Overpowered Cells', desc: '+8% blaster damage.', price: 2000 },
    { id: 'lifeSteal', name: 'Adrenaline', desc: 'Kills heal you for 40 health.', price: 1600 },
    { id: 'bpBoost', name: 'Glory Seeker', desc: '+20% battle points.', price: 1400 },
    { id: 'blastRes', name: 'Blast Plating', desc: '-35% explosive damage taken.', price: 1300 },
    { id: 'longGren', name: 'Strong Arm', desc: 'Throw grenades 40% further.', price: 800 },
    { id: 'scout', name: 'Eagle Eye', desc: 'Enemies within 30 m always show on your map.', price: 1500 },
    { id: 'heroBane', name: 'Legend Slayer', desc: '+25% damage to legends.', price: 2500 }
  ];
  D.cardById = {}; D.starCards.forEach(function (c) { D.cardById[c.id] = c; });

  // ---------------------------------------------------------------- heroes ("Legends")
  // blade: { color, style: single|double|dual|quad|small|crossguard|dark } or weapon id
  // body: model style key in models.js
  function hero(id, name, title, era, side, hp, speed, cost, body, weapon, abilities, price, extra) {
    var o = { id: id, name: name, title: title, era: era, side: side, hp: hp, speed: speed, cost: cost, body: body, weapon: weapon, abilities: abilities, price: price };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  D.heroes = [
    // Concord Wars — light
    hero('venn', 'Aldric Venn', 'Knight General', 'cw', 0, 700, 1.15, 5000, { kind: 'robed', robe: 0xb8a07a, under: 0xe6dcc6, skin: 0xe0b48e, hair: 0xa0622d, beard: true }, { blade: 0x3f8cff, style: 'single' }, ['push', 'mindTrick', 'block'], 0, { desc: 'Calm master swordsman who outlasts any duel.' }),
    hero('starfell', 'Kaius Starfell', 'Chosen Knight', 'cw', 0, 650, 1.2, 5000, { kind: 'robed', robe: 0x2b1e16, under: 0x4a382c, skin: 0xe2b896, hair: 0x5b3d24 }, { blade: 0x3f8cff, style: 'single' }, ['saberThrow', 'leap', 'fury'], 15000, { desc: 'Brilliant and reckless. Hits harder the longer he fights.' }),
    hero('yarro', 'Master Yarro', 'Grand Master', 'cw', 0, 600, 1.3, 5500, { kind: 'small', robe: 0x8a7a5a, under: 0xa79874, skin: 0x7fa060 }, { blade: 0x6dff5a, style: 'small' }, ['push', 'spin', 'leap'], 25000, { desc: 'Tiny, ancient and a blur of motion.' }),
    hero('ulvane', 'Dorn Ulvane', 'Master of the Violet Form', 'cw', 0, 700, 1.15, 5500, { kind: 'robed', robe: 0x6a5238, under: 0xcdbb98, skin: 0x5e3b26, bald: true }, { blade: 0xb04dff, style: 'single' }, ['push', 'fury', 'block'], 20000, { desc: 'A ruthless form that turns an enemy\'s rage against them.' }),
    hero('nyl', 'Tessa Nyl', 'Wayward Blademaster', 'cw', 0, 600, 1.3, 5000, { kind: 'agile', robe: 0x6a3a2a, under: 0x3a3048, skin: 0xd8693a, montral: true }, { blade: 0x5eff6a, style: 'dual' }, ['leap', 'spin', 'push'], 15000, { desc: 'Twin reverse-grip blades and acrobatic dashes.' }),
    hero('rook', 'Commander Rook', 'Legion Captain', 'cw', 0, 650, 1.1, 4000, { kind: 'trooper', faction: 'concord', mark: 0x2f63c4 }, 'h_twinpistols', ['grenadeHero', 'heroRally', 'sharpshot'], 10000, { desc: 'Veteran legion captain with two sidearms and a mean throwing arm.' }),
    hero('vaun', 'Senator Ilyra Vaun', 'Senator', 'cw', 0, 550, 1.15, 3500, { kind: 'civilian', robe: 0xeeeeee, under: 0x404a64, skin: 0xe8c1a0, hair: 0x2d1a10 }, 'h_sporting', ['heroRally', 'stunHero', 'shieldHero'], 10000, { desc: 'Diplomat with a sporting blaster and a talent for survival.' }),
    hero('rrakhar', 'Rrakhar', 'Clan Chieftain', 'cw', 0, 900, 1.05, 4500, { kind: 'wroshan', fur: 0x6b4a2a }, 'h_bowcaster', ['roar', 'shoulder', 'grenadeHero'], 12000, { desc: 'Towering forest warrior with a crossbolt and a fearsome roar.' }),
    // Concord Wars — dark
    hero('thul', 'Count Varlan Thul', 'Duelist Lord', 'cw', 1, 650, 1.1, 5500, { kind: 'robed', robe: 0x1d1d22, under: 0x3a2a1a, skin: 0xe8c6a6, hair: 0xd8d8d8, beard: true, cape: 0x3b1a12 }, { blade: 0xff2a2a, style: 'crossguard' }, ['lightning', 'choke', 'block'], 15000, { desc: 'Elegant fencer who throws lightning between parries.' }),
    hero('kurzak', 'General Kurzak', 'Cyborg Warlord', 'cw', 1, 750, 1.2, 5500, { kind: 'cyborg' }, { blade: 0x46ff7a, style: 'quad' }, ['spin', 'dash', 'block'], 20000, { desc: 'Four arms, four blades, and a cough.' }),
    hero('savrin', "Sav'rin the Horned", 'Apprentice of Shadow', 'cw', 1, 600, 1.3, 5000, { kind: 'agile', robe: 0x111114, under: 0x1d1d22, skin: 0xb81a1a, horns: true }, { blade: 0xff2a2a, style: 'double' }, ['spin', 'leap', 'push'], 12000, { desc: 'Acrobatic killer with a double-ended blade.' }),
    hero('dral', 'Ventrix Dral', 'Night Assassin', 'cw', 1, 600, 1.25, 5000, { kind: 'agile', robe: 0x24202a, under: 0x3a3442, skin: 0xe8e6ea, bald: true }, { blade: 0xff2a2a, style: 'dual' }, ['saberThrow', 'cloakHero', 'push'], 12000, { desc: 'Curved twin blades and shadowy stealth.' }),
    hero('jarek', 'Jarek Vaun', 'Prime Bounty Hunter', 'cw', 1, 650, 1.15, 4500, { kind: 'ironclad', armor: 0x7f8aa0, trim: 0x3d5a8a, jetpack: true }, 'h_twinpistols', ['jetHero', 'rocketHero', 'flameHero'], 12000, { desc: 'Original template of a legion. Jetpack, rockets and twin pistols.' }),
    hero('kade', 'Kade Varn', 'Gunslinger', 'cw', 1, 600, 1.15, 4000, { kind: 'gunslinger', coat: 0x4a3c2c, skin: 0x4a6aa0, hat: 0x3a2e22 }, 'h_sidearms', ['dualFire', 'stunHero', 'jetHero'], 10000, { desc: 'Wide-brimmed hat, two revolvers, rocket boots.' }),
    // Rebellion — light
    hero('dawnrider', 'Lucan Dawnrider', 'Farmhand Knight', 'gcw', 0, 650, 1.2, 5000, { kind: 'robed', robe: 0x1a1a1c, under: 0x22222a, skin: 0xe8c6a6, hair: 0xc9a058 }, { blade: 0x5eff6a, style: 'single' }, ['push', 'leap', 'block'], 0, { desc: 'Desert farmhand turned blade knight.' }),
    hero('ordane', 'Leyra Ordane', 'Rebel Commander', 'gcw', 0, 600, 1.15, 3500, { kind: 'civilian', robe: 0xf2f2f2, under: 0xe8e8e8, skin: 0xe8c6a6, hair: 0x5a3a20, buns: true }, 'h_sporting', ['heroRally', 'shieldHero', 'grenadeHero'], 8000, { desc: 'Sharp-shooting commander who keeps her troops alive.' }),
    hero('rennick', 'Hal Rennick', 'Smuggler Captain', 'gcw', 0, 600, 1.15, 3500, { kind: 'smuggler', vest: 0x1c1c22, shirt: 0xe8e2d2, skin: 0xe2b896, hair: 0x6a4a2a }, 'h_heavypistol', ['sharpshot', 'shoulder', 'grenadeHero'], 0, { desc: 'Fast-talking pilot with the fastest draw in the sector.' }),
    hero('chaw', 'Chaw', 'Loyal Co-pilot', 'gcw', 0, 900, 1.05, 4500, { kind: 'wroshan', fur: 0x8a5c34 }, 'h_bowcaster', ['roar', 'shoulder', 'grenadeHero'], 8000, { desc: 'Two metres of loyal fur with a crossbolt.' }),
    hero('vey', 'Calder Vey', 'Gambler Baron', 'gcw', 0, 600, 1.15, 3500, { kind: 'smuggler', vest: 0x2a3a8a, shirt: 0xeedd99, skin: 0x6b4426, hair: 0x1a1a1a, cape: 0x1d4a8a }, 'h_carbine', ['stunHero', 'cloakHero', 'sharpshot'], 10000, { desc: 'Charming baron with a cape and an ambush.' }),
    hero('venno', 'Old Venn', 'The Hermit Master', 'gcw', 0, 650, 1.1, 5000, { kind: 'robed', robe: 0x7a6a50, under: 0xd8ccb0, skin: 0xe0b48e, hair: 0xe8e8e8, beard: true }, { blade: 0x3f8cff, style: 'single' }, ['push', 'mindTrick', 'heroRally'], 12000, { desc: 'Older and wiser. Heals allies with calm resolve.' }),
    // Rebellion — dark
    hero('vexis', 'Lord Vexis', 'Dark Enforcer', 'gcw', 1, 850, 1.0, 6000, { kind: 'darklord', armor: 0x0c0c0e, cape: 0x050505 }, { blade: 0xff1a1a, style: 'single' }, ['saberThrow', 'choke', 'block'], 0, { desc: 'Towering armoured enforcer. Slow, relentless, terrifying.' }),
    hero('malgrave', 'Emperor Malgrave', 'Dread Emperor', 'gcw', 1, 650, 1.05, 6000, { kind: 'robed', robe: 0x0b0b0d, under: 0x111114, skin: 0xcdbfb0, hood: true }, { blade: 0xff2a2a, style: 'single' }, ['lightning', 'push', 'shieldHero'], 20000, { desc: 'Withered ruler who channels storms through his fingers.' }),
    hero('morrow', 'Dak Morrow', 'Legendary Hunter', 'gcw', 1, 650, 1.15, 4500, { kind: 'ironclad', armor: 0x4f6a3a, trim: 0x8a2a1a, jetpack: true }, 'h_carbine', ['jetHero', 'rocketHero', 'flameHero'], 12000, { desc: 'Dented green armour, a jetpack and a long list of contracts.' }),
    hero('vos', 'Agent Sera Vos', 'Elite Squad Commander', 'gcw', 1, 600, 1.2, 4000, { kind: 'trooper', faction: 'dominion', mark: 0x111111, dark: true }, 'h_carbine', ['droneHero', 'cloakHero', 'grenadeHero'], 10000, { desc: 'Special forces commander with a seeker drone.' }),
    hero('grask', 'Grask', 'Reptile Hunter', 'gcw', 1, 800, 1.05, 4500, { kind: 'reptile', skin: 0x7a8a4a, suit: 0xc8a050 }, 'h_repeater', ['grenadeHero', 'roar', 'snipeMark'], 12000, { desc: 'Cold-blooded tracker with a heavy repeater.' }),
    hero('tarsk', 'Grand Moff Tarsk', 'Station Governor', 'gcw', 1, 550, 1.1, 3500, { kind: 'officer', uniform: 0x6a6e66, skin: 0xe8c6a6 }, 'h_heavypistol', ['heroRally', 'droneHero', 'shieldHero'], 10000, { desc: 'Cold commander who rallies troops with orders.' }),
    // Outer Rim Reckoning — light
    hero('ironclad', 'The Ironclad', 'Clan Foundling-Keeper', 'orr', 0, 750, 1.15, 5500, { kind: 'ironclad', armor: 0xc9ccd2, trim: 0x6a4a2a, jetpack: true, cape: 0x4a3a2a }, 'h_amban', ['jetHero', 'homing', 'flameHero'], 15000, { desc: 'Silver ferrosteel armour, a phase rifle and seeker missiles.' }),
    hero('stone', 'Marshal Rhea Stone', 'Rim Ranger Marshal', 'orr', 0, 850, 1.05, 4500, { kind: 'trooperf', armor: 0x5a4a3a, skin: 0xb07a52, hair: 0x1a1a1a }, 'h_repeater', ['grenadeHero', 'shoulder', 'heroRally'], 10000, { desc: 'Ex-shock trooper who brought a heavy repeater to the peace.' }),
    hero('drael', 'Vessa Drael', 'Clan Queen', 'orr', 0, 650, 1.2, 5000, { kind: 'ironclad', armor: 0x4a6a9a, trim: 0x9a9aa0, jetpack: true }, 'h_twinpistols', ['jetHero', 'rocketHero', 'dualFire'], 15000, { desc: 'Proud clan leader. Dual pistols and wrist rockets.' }),
    hero('nylgrey', 'Tessa Nyl, the Grey', 'Wanderer', 'orr', 0, 650, 1.25, 5500, { kind: 'agile', robe: 0x6a6a6a, under: 0x4a4a52, skin: 0xd8693a, montral: true }, { blade: 0xeaeaea, style: 'dual' }, ['saberThrow', 'leap', 'mindTrick'], 20000, { desc: 'Older and wiser, wielding twin white blades.' }),
    hero('dawnold', 'Master Lucan', 'Returned Knight', 'orr', 0, 750, 1.2, 6000, { kind: 'robed', robe: 0x0e0e10, under: 0x16161a, skin: 0xe8c6a6, hair: 0xc9a058, hood: true }, { blade: 0x5eff6a, style: 'single' }, ['push', 'choke', 'spin'], 25000, { desc: 'Cuts through dark troopers like they are paper.' }),
    // Outer Rim Reckoning — dark
    hero('corvane', 'Moff Corvane', 'Remnant Warlord', 'orr', 1, 750, 1.1, 5500, { kind: 'officer', uniform: 0x0d0d10, skin: 0x6b4426, cape: 0x050505 }, { blade: 0xe8f0ff, style: 'dark' }, ['darkSaber', 'droneHero', 'deflectHero'], 20000, { desc: 'Carries a black blade stolen from a clan. Flanked by shadow units.' }),
    hero('shand', 'Nyra Shand', 'Elite Mercenary', 'orr', 1, 600, 1.2, 4500, { kind: 'ironclad', armor: 0x7a7258, trim: 0x2a2a2a, nojet: true }, 'h_sniper', ['snipeMark', 'grenadeHero', 'cloakHero'], 12000, { desc: 'Patient sniper with a near-perfect record.' }),
    hero('morrow2', 'Dak Morrow, Returned', 'Desert Daimyo', 'orr', 1, 800, 1.1, 5000, { kind: 'ironclad', armor: 0x4f6a3a, trim: 0x8a2a1a, jetpack: true, robes: 0x8a7a5a }, 'h_spear', ['jetHero', 'rocketHero', 'shoulder'], 15000, { desc: 'Back from the sands with a ferrosteel spear.' }),
    hero('ironhunter', 'Shadow Unit Prime', 'Remnant Terror', 'orr', 1, 900, 1.05, 5000, { kind: 'shadowunit' }, 'h_repeater', ['jetHero', 'deflectHero', 'shoulder'], 15000, { desc: 'Prototype battle automaton. Bolts bounce off its plating.' })
  ];
  D.heroById = {}; D.heroes.forEach(function (h) { D.heroById[h.id] = h; });

  // ---------------------------------------------------------------- vehicles
  // type: hover | walker | fighter | capital ; model: model builder key
  function veh(id, name, type, model, era, side, hp, speed, cost, weapons, extra) {
    var o = { id: id, name: name, type: type, model: model, era: era, side: side, hp: hp, speed: speed, cost: cost, weapons: weapons };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  // weapons: { name, dmg, rpm, heat, speed, color, explosive radius, homing }
  var VW = D.vweapons = {
    twinlaser: { name: 'Twin Lasers', dmg: 28, rpm: 600, heat: 3.0, speed: 300, radius: 0 },
    quadlaser: { name: 'Quad Lasers', dmg: 22, rpm: 900, heat: 2.2, speed: 320, radius: 0 },
    cannon: { name: 'Heavy Cannon', dmg: 220, rpm: 40, heat: 45, speed: 160, radius: 6 },
    lightcannon: { name: 'Chin Cannons', dmg: 60, rpm: 200, heat: 10, speed: 200, radius: 2.5 },
    missile: { name: 'Concussion Missiles', dmg: 200, rpm: 60, heat: 50, speed: 140, radius: 5, homing: true },
    bomb: { name: 'Proton Bombs', dmg: 400, rpm: 30, heat: 70, speed: 40, radius: 10, drop: true },
    walkercannon: { name: 'Head Cannons', dmg: 180, rpm: 60, heat: 25, speed: 170, radius: 6 },
    repeater: { name: 'Repeating Blaster', dmg: 24, rpm: 700, heat: 2.4, speed: 260, radius: 0 },
    ion: { name: 'Ion Cannon', dmg: 120, rpm: 80, heat: 25, speed: 200, radius: 3, antiv: 2 },
    seismic: { name: 'Seismic Charge', dmg: 600, rpm: 15, heat: 100, speed: 30, radius: 18, drop: true }
  };
  D.vehicles = [
    // Ground — hover
    veh('barc', 'Ripper-74 Skimmer', 'hover', 'skimmer', 'cw', 0, 350, 38, 1500, ['twinlaser'], { desc: 'Fast speeder bike.' }),
    veh('stap', 'Syndicate Sentry Skiff', 'hover', 'skiff', 'cw', 1, 300, 36, 1500, ['twinlaser'], { desc: 'Single-seat synth patrol platform.' }),
    veh('aat', 'Crawler Battle Tank', 'hover', 'crawler', 'cw', 1, 2200, 14, 3500, ['cannon', 'repeater'], { desc: 'Heavy hover tank with a long cannon.' }),
    veh('tx130', 'Sabre Hover Tank', 'hover', 'sabre', 'cw', 0, 1800, 17, 3500, ['twinlaser', 'missile'], { desc: 'Fast fighter-tank of the legion.' }),
    veh('rebelspeeder', 'Dustrunner Landspeeder', 'hover', 'landspeeder', 'gcw', 0, 600, 32, 1500, ['repeater'], { desc: 'Open-top speeder with a mounted repeater.' }),
    veh('t47', 'Frostline Airspeeder', 'fighter', 'airspeeder', 'gcw', 0, 600, 70, 2500, ['twinlaser', 'missile'], { low: true, desc: 'Low-altitude airspeeder with a tow cable.' }),
    veh('74z', 'Patrol Skimmer', 'hover', 'skimmer', 'gcw', 1, 350, 38, 1500, ['twinlaser'], { desc: 'Scout speeder bike.' }),
    veh('occupier', 'Occupier Hover Tank', 'hover', 'occupier', 'gcw', 1, 2000, 13, 3500, ['cannon', 'repeater'], { desc: 'Boxy occupation tank.' }),
    veh('rangerbike', 'Ranger Swoop', 'hover', 'skimmer', 'orr', 0, 350, 40, 1500, ['twinlaser'], { desc: 'Overpowered swoop bike.' }),
    veh('remtank', 'Remnant Assault Tank', 'hover', 'occupier', 'orr', 1, 2100, 14, 3500, ['cannon', 'repeater'], { desc: 'Retooled occupation tank.' }),
    // Ground — walkers
    veh('atrt', 'Recon Strider', 'walker', 'strider_open', 'cw', 0, 900, 11, 2000, ['repeater'], { legs: 2, desc: 'Open-cockpit two-legged scout walker.' }),
    veh('atte', 'Sixlegger Assault Walker', 'walker', 'sixlegger', 'cw', 0, 4000, 6, 4500, ['walkercannon', 'repeater'], { legs: 6, desc: 'Six-legged legion siege walker.' }),
    veh('spider', 'Spider Synth Walker', 'walker', 'spider', 'cw', 1, 1600, 9, 3000, ['lightcannon'], { legs: 4, desc: 'Crawling spider walker with a chin cannon.' }),
    veh('homing_spider', 'Crab Synth Walker', 'walker', 'crab', 'cw', 1, 1400, 10, 2500, ['repeater', 'lightcannon'], { legs: 6, desc: 'Scuttling six-legged synth walker.' }),
    veh('atst', 'Scout Strider', 'walker', 'strider', 'gcw', 1, 1800, 9, 3000, ['lightcannon', 'repeater'], { legs: 2, desc: 'Two-legged chicken walker.' }),
    veh('atat', 'Colossus Walker', 'walker', 'colossus', 'gcw', 1, 12000, 4, 7000, ['walkercannon', 'repeater'], { legs: 4, scale: 1, desc: 'Massive four-legged assault walker.' }),
    veh('remstrider', 'Remnant Strider', 'walker', 'strider', 'orr', 1, 1800, 9, 3000, ['lightcannon', 'repeater'], { legs: 2, desc: 'Refitted chicken walker.' }),
    veh('rangerwalker', 'Ranger Recon Strider', 'walker', 'strider_open', 'orr', 0, 900, 11, 2000, ['repeater'], { legs: 2 }),
    // Starfighters
    veh('arcstriker', 'Arc Striker', 'fighter', 'arcstriker', 'cw', 0, 900, 90, 2500, ['twinlaser', 'missile'], { desc: 'Heavy legion fighter with rear guns.' }),
    veh('delta', 'Delta Knight Interceptor', 'fighter', 'delta', 'cw', 0, 600, 115, 2000, ['twinlaser', 'missile'], { desc: 'Wedge-shaped knight interceptor.' }),
    veh('lancer', 'Lancer Gunship', 'fighter', 'gunship', 'cw', 0, 1500, 60, 3000, ['repeater', 'missile'], { desc: 'Troop gunship bristling with turrets.' }),
    veh('vulture', 'Vulture Synth Fighter', 'fighter', 'vulture', 'cw', 1, 500, 110, 2000, ['twinlaser', 'missile'], { desc: 'Automated walking fighter.' }),
    veh('triclaw', 'Tri-Claw Synth Fighter', 'fighter', 'triclaw', 'cw', 1, 600, 120, 2500, ['quadlaser', 'missile'], { desc: 'Three-armed interceptor.' }),
    veh('talon', 'Talon-wing Starfighter', 'fighter', 'talon', 'gcw', 0, 900, 100, 2500, ['quadlaser', 'missile'], { desc: 'Iconic four-winged Alliance fighter.' }),
    veh('wedge', 'Arrowhead Interceptor', 'fighter', 'arrowhead', 'gcw', 0, 550, 125, 2000, ['twinlaser', 'missile'], { desc: 'The fastest Alliance fighter.' }),
    veh('yoke', 'Yoke Bomber', 'fighter', 'yoke', 'gcw', 0, 1400, 75, 3000, ['twinlaser', 'bomb'], { desc: 'Sturdy bomber with ion turret.' }),
    veh('eyeball', 'Eyeball Fighter', 'fighter', 'eyeball', 'gcw', 1, 500, 115, 2000, ['twinlaser'], { desc: 'Cheap, fast, fragile Dominion fighter.' }),
    veh('interceptor', 'Dagger Interceptor', 'fighter', 'dagger', 'gcw', 1, 550, 130, 2500, ['quadlaser'], { desc: 'Bent-wing Dominion interceptor.' }),
    veh('twinbomber', 'Twin-pod Bomber', 'fighter', 'twinpod', 'gcw', 1, 1300, 75, 3000, ['twinlaser', 'bomb'], { desc: 'Double-hull Dominion bomber.' }),
    veh('dawnhawk', 'Dawnhawk Freighter', 'fighter', 'freighter', 'gcw', 0, 2600, 95, 6000, ['quadlaser', 'missile'], { hero: true, desc: 'Battered disk freighter. Legend ship.' }),
    veh('firespray', 'Firebrand Patrol Ship', 'fighter', 'firebrand', 'gcw', 1, 2400, 90, 6000, ['twinlaser', 'seismic'], { hero: true, desc: 'Upright hunter ship. Legend ship.' }),
    veh('gunwing', 'Gunwing Courier', 'fighter', 'courier', 'orr', 0, 2200, 90, 5000, ['twinlaser', 'missile'], { hero: true, desc: 'Old courier gunship. Legend ship.' }),
    veh('silverline', 'Silverline Fighter', 'fighter', 'silverline', 'orr', 0, 700, 125, 2500, ['twinlaser', 'missile'], { desc: 'Sleek chrome starfighter with a long engine.' }),
    veh('wingrider', 'Wingrider Fighter', 'fighter', 'talon', 'orr', 0, 900, 105, 2500, ['quadlaser', 'missile'], { desc: 'Refitted Talon-wings of the Rangers.' }),
    veh('remeye', 'Remnant Eyeball', 'fighter', 'eyeball', 'orr', 1, 500, 115, 2000, ['twinlaser'], {}),
    veh('remdagger', 'Remnant Dagger', 'fighter', 'dagger', 'orr', 1, 600, 130, 2500, ['quadlaser', 'missile'], {}),
    veh('cwvwing', 'V-Fin Interceptor', 'fighter', 'arrowhead', 'cw', 0, 550, 125, 2000, ['twinlaser'], { desc: 'Nimble legion interceptor.' }),
    veh('vulturehero', 'Warlord Fang Fighter', 'fighter', 'fang', 'cw', 1, 2000, 120, 5000, ['quadlaser', 'missile'], { hero: true, desc: 'Personal fighter of the cyborg warlord. Legend ship.' }),
    veh('deltahero', 'Chosen Knight Interceptor', 'fighter', 'delta', 'cw', 0, 1900, 125, 5000, ['quadlaser', 'missile'], { hero: true, desc: 'A prodigy pilot\'s personal fighter. Legend ship.' }),
    veh('remhero', 'Shadow Interceptor', 'fighter', 'dagger', 'orr', 1, 2000, 135, 5000, ['quadlaser', 'missile'], { hero: true, desc: 'The warlord\'s customised interceptor. Legend ship.' }),
    veh('vexhero', 'Lord Vexis\'s Prototype', 'fighter', 'eyeball', 'gcw', 1, 1900, 130, 5000, ['quadlaser', 'missile'], { hero: true, desc: 'A curved-wing prototype flown by the Dark Enforcer. Legend ship.' })
  ];
  D.vehById = {}; D.vehicles.forEach(function (v) { D.vehById[v.id] = v; });

  D.capitalShips = {
    concord: { name: 'Lancer-class Star Cruiser', model: 'cruiserLancer' },
    syndicate: { name: 'Ringhold Freighter-Carrier', model: 'ringship' },
    alliance: { name: 'Coral-class Star Cruiser', model: 'coralCruiser' },
    dominion: { name: 'Dread-class Wedge Dreadnought', model: 'wedge' },
    rangers: { name: 'Ranger Picket Frigate', model: 'picket' },
    remnant: { name: 'Remnant Light Cruiser', model: 'remcruiser' }
  };

  // ---------------------------------------------------------------- maps
  // biome keys map to world.js generators. origin lists which classic-style game the battlefield is modelled on.
  D.planets = [
    { id: 'kesh', name: 'Kesh', blurb: 'Twin-sun desert world on the edge of nowhere.' },
    { id: 'glaciem', name: 'Glaciem', blurb: 'Frozen ice planet of blizzards and trenches.' },
    { id: 'sylvan', name: 'Sylvan Moon', blurb: 'Forest moon of giant redwoods.' },
    { id: 'lumora', name: 'Lumora', blurb: 'Lush garden world with a classical capital.' },
    { id: 'rustspire', name: 'Rustspire', blurb: 'Red rock world of hive spires and arenas.' },
    { id: 'tidefall', name: 'Tidefall', blurb: 'Endless storm ocean with stilted cities.' },
    { id: 'wroshan', name: 'Wroshan', blurb: 'Jungle world of colossal wroshyr trees.' },
    { id: 'stratos', name: 'Stratos', blurb: 'Gas giant with a floating city.' },
    { id: 'vanta', name: 'Vanta IV', blurb: 'Jungle moon with ancient temple ruins.' },
    { id: 'rhimfrost', name: 'Rhimfrost', blurb: 'Snowbound world of old citadels.' },
    { id: 'cindral', name: 'Cindral', blurb: 'Volcanic mining world.' },
    { id: 'pitfall', name: 'Pitfall', blurb: 'Sinkhole cities on a windswept plateau.' },
    { id: 'capitalis', name: 'Capitalis', blurb: 'City-world capital of the galaxy.' },
    { id: 'fungaro', name: 'Fungaro', blurb: 'Swamp world of giant fungi.' },
    { id: 'crystalis', name: 'Crystalis', blurb: 'Rainy crystal world of bank vaults.' },
    { id: 'shardrock', name: 'Shardrock', blurb: 'Asteroid medical outpost.' },
    { id: 'murkmire', name: 'Murkmire', blurb: 'Fog-choked swamp planet.' },
    { id: 'eclipse', name: 'Eclipse Fortress', blurb: 'Planet-sized battle station.' },
    { id: 'starhope', name: 'Starhope', blurb: 'An Alliance blockade runner.' },
    { id: 'ashrend', name: 'Ashrend', blurb: 'Desert of wrecked dreadnoughts.' },
    { id: 'volcan', name: 'Volcan', blurb: 'Industrial lava world.' },
    { id: 'coralis', name: 'Coralis', blurb: 'Tropical archive planet with a shield gate.' },
    { id: 'keldra', name: 'Keldra', blurb: 'Spice mines and a slave colony.' },
    { id: 'lakehaven', name: 'Lakehaven', blurb: 'Green lake world with an old castle.' },
    { id: 'saltcrust', name: 'Saltcrust', blurb: 'White salt flats over red crystal.' },
    { id: 'sunforge', name: 'Sunforge', blurb: 'Snowy forest planet hollowed into a weapon.' },
    { id: 'ajara', name: 'Ajara', blurb: 'Hidden jungle base world.' },
    { id: 'saleth', name: 'Saleth', blurb: 'Dusty world of pod-like dwellings.' },
    { id: 'kelbara', name: 'Kelbara', blurb: 'Grassy moon of tall rock pillars.' },
    { id: 'nevrath', name: 'Nevrath', blurb: 'Lava-field outpost of guilds and hunters.' },
    { id: 'sorrowmere', name: 'Sorrowmere', blurb: 'Quiet farming village by a forest.' },
    { id: 'morakar', name: 'Morakar', blurb: 'Jungle refinery world.' },
    { id: 'hollowdeep', name: 'Hollowdeep', blurb: 'Ancient world of a lost order.' }
  ];
  D.planetById = {}; D.planets.forEach(function (p) { D.planetById[p.id] = p; });

  function map(id, name, planet, biome, layout, era, origin, size, cps, opts) {
    var o = { id: id, name: name, planet: planet, biome: biome, layout: layout, era: era, origin: origin, size: size, cps: cps, seed: 0 };
    for (var i = 0; i < id.length; i++) o.seed = (o.seed * 31 + id.charCodeAt(i)) >>> 0;
    if (opts) for (var k in opts) o[k] = opts[k];
    return o;
  }
  // layouts: open, town, canyon, platforms, temple, city, corridor, arena, base, trench, wreck, forest, harbor
  D.maps = [
    // Classic I
    map('kesh_dunes', 'Dune Sea Expanse', 'kesh', 'desert', 'open', 'gcw', 'Classic I', 420, 5, { night: false }),
    map('kesh_port', 'Port Varrow', 'kesh', 'desertTown', 'town', 'gcw', 'Classic I', 300, 5),
    map('kesh_palace', 'Warlord\'s Palace', 'kesh', 'desertTown', 'arena', 'gcw', 'Classic II', 200, 4, { indoor: true }),
    map('glaciem_plains', 'Glacier Plains', 'glaciem', 'ice', 'trench', 'gcw', 'Classic I', 440, 5),
    map('glaciem_echo', 'Ice Base Echo', 'glaciem', 'ice', 'base', 'gcw', 'Classic II', 300, 5),
    map('sylvan_forest', 'Redwood Hollow', 'sylvan', 'forest', 'forest', 'gcw', 'Classic I', 360, 5),
    map('sylvan_bunker', 'Shield Bunker', 'sylvan', 'forest', 'base', 'gcw', 'Classic II', 320, 5),
    map('lumora_plains', 'Lumora Meadows', 'lumora', 'plains', 'open', 'cw', 'Classic I', 440, 5),
    map('lumora_capital', 'Palace of Lumora', 'lumora', 'classical', 'city', 'cw', 'Classic I', 300, 5),
    map('rustspire_plains', 'Dust Plains of Rustspire', 'rustspire', 'redrock', 'open', 'cw', 'Classic I', 460, 5),
    map('rustspire_arena', 'Execution Arena', 'rustspire', 'redrock', 'arena', 'cw', 'Remastered', 220, 4),
    map('tidefall_city', 'Stilt City of Tidefall', 'tidefall', 'ocean', 'platforms', 'cw', 'Classic I', 320, 5),
    map('wroshan_islands', 'Wroshan Islands', 'wroshan', 'jungle', 'harbor', 'cw', 'Classic I', 360, 5),
    map('wroshan_docks', 'Wroshan Docks', 'wroshan', 'jungle', 'town', 'cw', 'Classic I', 300, 5),
    map('wroshan_beach', 'Beachhead Assault', 'wroshan', 'jungle', 'harbor', 'cw', 'Classic II', 400, 5),
    map('stratos_platforms', 'Cloud Platforms', 'stratos', 'sky', 'platforms', 'gcw', 'Classic I', 340, 5),
    map('stratos_city', 'Cloud City', 'stratos', 'skycity', 'city', 'gcw', 'Classic I', 280, 5),
    map('vanta_temple', 'Temple Ruins', 'vanta', 'jungleTemple', 'temple', 'gcw', 'Classic I', 340, 5),
    map('vanta_arena', 'Overgrown Arena', 'vanta', 'jungleTemple', 'arena', 'gcw', 'Classic I', 240, 4),
    map('rhimfrost_harbor', 'Frozen Harbour', 'rhimfrost', 'snow', 'harbor', 'cw', 'Classic I', 340, 5),
    map('rhimfrost_citadel', 'Rhimfrost Citadel', 'rhimfrost', 'snow', 'temple', 'cw', 'Classic I', 260, 5),
    // Classic II
    map('cindral_refinery', 'Cindral Refinery', 'cindral', 'lava', 'base', 'cw', 'Classic II', 300, 5),
    map('pitfall_sinkhole', 'Pitfall Sinkhole', 'pitfall', 'sinkhole', 'canyon', 'cw', 'Classic II', 300, 5),
    map('capitalis_temple', 'Order Temple', 'capitalis', 'metro', 'temple', 'cw', 'Classic II', 260, 5),
    map('capitalis_streets', 'Capitalis Undercity', 'capitalis', 'metroNight', 'city', 'cw', 'Squadron Saga', 300, 5),
    map('fungaro_swamp', 'Fungal Marshes', 'fungaro', 'fungal', 'forest', 'cw', 'Classic II', 380, 5),
    map('crystalis_vaults', 'Crystalis Vaults', 'crystalis', 'crystal', 'city', 'cw', 'Classic II', 320, 5),
    map('shardrock_outpost', 'Shardrock Outpost', 'shardrock', 'asteroid', 'base', 'gcw', 'Classic II', 260, 4),
    map('murkmire_swamp', 'Murkmire Bog', 'murkmire', 'swamp', 'forest', 'gcw', 'Classic II', 320, 4),
    map('eclipse_interior', 'Eclipse Fortress Interior', 'eclipse', 'station', 'corridor', 'gcw', 'Classic II', 240, 4, { indoor: true }),
    map('starhope_corridors', 'Starhope Corridors', 'starhope', 'ship', 'corridor', 'gcw', 'Classic II', 200, 4, { indoor: true }),
    map('saleth_pods', 'Saleth Pod Fields', 'saleth', 'desert', 'town', 'cw', 'Squadron Saga', 360, 5),
    // Reboot I (2015-style)
    map('glaciem_beta', 'Outpost Beta', 'glaciem', 'ice', 'base', 'gcw', 'Reboot I', 320, 5),
    map('glaciem_walker', 'Glacier Walker Run', 'glaciem', 'ice', 'trench', 'gcw', 'Reboot I', 520, 5, { walkerPath: true }),
    map('sylvan_station', 'Research Station Nine', 'sylvan', 'forest', 'base', 'gcw', 'Reboot I', 340, 5),
    map('sylvan_survivors', 'Survivors\' Grove', 'sylvan', 'forest', 'forest', 'gcw', 'Reboot I', 300, 4),
    map('kesh_wastes', 'Jagged Wastes', 'kesh', 'desert', 'canyon', 'gcw', 'Reboot I', 420, 5, { walkerPath: true }),
    map('ashrend_graveyard', 'Graveyard of Dreadnoughts', 'ashrend', 'junk', 'wreck', 'gcw', 'Reboot I', 480, 5, { walkerPath: true }),
    map('volcan_complex', 'Volcan Foundry', 'volcan', 'lava', 'base', 'gcw', 'Reboot I', 400, 5, { walkerPath: true }),
    map('coralis_complex', 'Coralis Security Complex', 'coralis', 'tropical', 'harbor', 'gcw', 'Reboot I', 400, 5),
    map('eclipse_shipyard', 'Eclipse Shipyard', 'eclipse', 'station', 'base', 'gcw', 'Reboot I', 260, 4),
    map('stratos_ugnaught', 'Gas Mine Gantries', 'stratos', 'skycity', 'platforms', 'gcw', 'Reboot I', 300, 5),
    // Reboot II (2017-style)
    map('lumora_theed', 'Lumora Royal District', 'lumora', 'classical', 'city', 'cw', 'Reboot II', 340, 5),
    map('tidefall_facility', 'Tidefall Breeding Facility', 'tidefall', 'ocean', 'platforms', 'cw', 'Reboot II', 300, 5),
    map('rustspire_spires', 'Spire Canyons', 'rustspire', 'redrock', 'canyon', 'cw', 'Reboot II', 440, 5),
    map('wroshan_coast', 'Wroshan Coastline', 'wroshan', 'jungle', 'harbor', 'cw', 'Reboot II', 420, 5),
    map('fungaro_valley', 'Fungaro Glowvalley', 'fungaro', 'fungal', 'open', 'cw', 'Reboot II', 360, 5),
    map('keldra_mines', 'Keldra Spice Mines', 'keldra', 'mine', 'canyon', 'gcw', 'Reboot II', 340, 5),
    map('lakehaven_castle', 'Lakehaven Castle', 'lakehaven', 'lake', 'town', 'gcw', 'Reboot II', 360, 5),
    map('saltcrust_mine', 'Saltcrust Flats', 'saltcrust', 'salt', 'base', 'gcw', 'Reboot II', 440, 5),
    map('sunforge_base', 'Sunforge Weapon Base', 'sunforge', 'snowforest', 'base', 'gcw', 'Reboot II', 360, 5),
    map('ajara_jungle', 'Ajara Hidden Base', 'ajara', 'jungle', 'base', 'gcw', 'Reboot II', 320, 5),
    map('kelbara_pillars', 'Kelbara Plains', 'kelbara', 'grass', 'open', 'gcw', 'Reboot II', 440, 5),
    map('eclipse_trench', 'Eclipse Surface Trench', 'eclipse', 'station', 'trench', 'gcw', 'Reboot II', 360, 5),
    map('hollowdeep_ruins', 'Hollowdeep Throne Ruins', 'hollowdeep', 'hollow', 'temple', 'gcw', 'Reboot II', 300, 5),
    // Outer Rim era
    map('nevrath_town', 'Nevrath Guild Town', 'nevrath', 'lavafield', 'town', 'orr', 'Rim Tales', 300, 5),
    map('sorrowmere_village', 'Sorrowmere Village', 'sorrowmere', 'farm', 'forest', 'orr', 'Rim Tales', 320, 5),
    map('morakar_refinery', 'Morakar Refinery', 'morakar', 'jungle', 'base', 'orr', 'Rim Tales', 360, 5),
    map('kesh_outpost', 'Freetown Outpost', 'kesh', 'desertTown', 'town', 'orr', 'Rim Tales', 320, 5),
    // Space
    map('space_glaciem', 'Glaciem Orbit', 'glaciem', 'space', 'space', 'gcw', 'Classic II', 1500, 0, { space: true, planetColor: 0xe8f0ff }),
    map('space_sylvan', 'Sylvan Moon Orbit', 'sylvan', 'space', 'space', 'gcw', 'Classic II', 1500, 0, { space: true, planetColor: 0x3d7a3d }),
    map('space_kesh', 'Kesh Orbit', 'kesh', 'space', 'space', 'gcw', 'Classic II', 1500, 0, { space: true, planetColor: 0xd9b26a }),
    map('space_capitalis', 'Battle over Capitalis', 'capitalis', 'space', 'space', 'cw', 'Classic II', 1500, 0, { space: true, planetColor: 0x6a7a9a, cityLights: true }),
    map('space_cindral', 'Cindral Orbit', 'cindral', 'space', 'space', 'cw', 'Classic II', 1500, 0, { space: true, planetColor: 0x9a2a10 }),
    map('space_fungaro', 'Fungaro Orbit', 'fungaro', 'space', 'space', 'cw', 'Classic II', 1500, 0, { space: true, planetColor: 0x6a9a3a }),
    map('space_wroshan', 'Wroshan Orbit', 'wroshan', 'space', 'space', 'cw', 'Classic II', 1500, 0, { space: true, planetColor: 0x2a6a3a }),
    map('space_vanta', 'Vanta Orbit', 'vanta', 'space', 'space', 'gcw', 'Classic II', 1500, 0, { space: true, planetColor: 0xd48a2a, gasGiant: true }),
    map('space_fondra', 'Fondra Shipyards', 'capitalis', 'space', 'space', 'gcw', 'Reboot II', 1500, 0, { space: true, planetColor: 0x4a5a7a, debris: true }),
    map('space_ryl', 'Ryl Ion Storm', 'kesh', 'space', 'space', 'cw', 'Reboot II', 1500, 0, { space: true, planetColor: 0xb06a3a, nebula: 0x6a2a8a }),
    map('space_eclipse', 'Eclipse Fortress Assault', 'eclipse', 'space', 'space', 'gcw', 'Reboot II', 1500, 0, { space: true, planetColor: 0x3d7a3d, fortress: true }),
    map('space_nevrath', 'Nevrath Asteroid Belt', 'nevrath', 'space', 'space', 'orr', 'Rim Tales', 1500, 0, { space: true, planetColor: 0x5a2a1a, asteroids: true }),
    map('space_kesh_rings', 'Kesh Ringfield', 'kesh', 'space', 'space', 'orr', 'Rim Tales', 1500, 0, { space: true, planetColor: 0xd9b26a, asteroids: true })
  ];
  D.mapById = {}; D.maps.forEach(function (m) { D.mapById[m.id] = m; });

  // Native factions for Hunt / Forest Hunt by planet
  D.natives = { kesh: 'raiders', sylvan: 'tiklets', wroshan: 'wroshan', rustspire: 'spireborn', nevrath: 'raiders', saleth: 'raiders', ashrend: 'raiders', vanta: 'tiklets', lakehaven: 'tiklets', sorrowmere: 'tiklets', fungaro: 'spireborn', murkmire: 'tiklets', ajara: 'wroshan', morakar: 'wroshan', keldra: 'raiders', kelbara: 'raiders', glaciem: 'raiders', rhimfrost: 'raiders' };

  // ---------------------------------------------------------------- game modes
  // type → engine in modes.js.  space: requires space map. heroes: heroes allowed. vehicles allowed.
  D.modes = [
    { id: 'conquest', name: 'Conquest', type: 'conquest', origin: 'Classic I & II', players: 16, desc: 'Capture command posts. Each side has reinforcement tickets; hold more posts to drain the enemy.', heroes: true, vehicles: true },
    { id: 'supremacy', name: 'Supremacy', type: 'supremacy', origin: 'Reboot I & II', players: 16, desc: 'Five command posts. Holding posts scores points; first to 1000 wins.', heroes: true, vehicles: true },
    { id: 'capsup', name: 'Capital Supremacy', type: 'capsup', origin: 'Reboot II', players: 20, desc: 'Fight on the ground for command posts, then board the enemy capital ship.', heroes: true, vehicles: true },
    { id: 'frontline', name: 'Frontline Assault', type: 'sequential', origin: 'Reboot II', players: 20, desc: 'Attackers push through three phases of objectives; defenders must hold the line.', heroes: true, vehicles: true },
    { id: 'turningpoint', name: 'Turning Point', type: 'sequential', origin: 'Reboot I', players: 16, desc: 'Attackers race to capture zones before time runs out. Each capture buys more time.', heroes: true, vehicles: false, timeBonus: true },
    { id: 'colossus', name: 'Colossus Assault', type: 'colossus', origin: 'Reboot I', players: 20, desc: 'Two colossus walkers march on the defenders\' base. Defenders hold uplinks to call in bombers.', heroes: true, vehicles: true, needsWalkerPath: true },
    { id: 'extraction', name: 'Extraction', type: 'escort', origin: 'Reboot I', players: 12, desc: 'Escort a cargo hauler across the map before time runs out.', heroes: false, vehicles: false },
    { id: 'sabotage', name: 'Sabotage', type: 'sabotage', origin: 'Squadron Saga', players: 16, desc: 'Attackers plant charges on three targets; defenders defuse and defend.', heroes: true, vehicles: false },
    { id: 'ctf', name: 'Capture the Flag', type: 'ctf', origin: 'Classic II', players: 12, desc: 'Steal the enemy flag and bring it to your own.', heroes: false, vehicles: true },
    { id: 'ctf1', name: 'One-Flag CTF', type: 'ctf1', origin: 'Classic II', players: 12, desc: 'A neutral flag in the middle. Carry it to the enemy base.', heroes: false, vehicles: true },
    { id: 'cargo', name: 'Cargo', type: 'ctf', origin: 'Reboot I', players: 12, desc: 'Steal enemy cargo and return it to your base.', heroes: false, vehicles: false },
    { id: 'jetcargo', name: 'Jetpack Cargo', type: 'ctf', origin: 'Reboot I', players: 12, desc: 'Cargo, but everyone wears a jetpack.', heroes: false, vehicles: false, allJet: true },
    { id: 'strike', name: 'Strike', type: 'strike', origin: 'Reboot II', players: 12, desc: 'Attackers seize an intel package and carry it to extraction.', heroes: false, vehicles: false },
    { id: 'dropzone', name: 'Drop Zone', type: 'dropzone', origin: 'Reboot I', players: 12, desc: 'Escape pods crash down. Hold them to capture. First to five pods wins.', heroes: false, vehicles: false },
    { id: 'synthrun', name: 'Synth Run', type: 'synthrun', origin: 'Reboot I', players: 12, desc: 'Three wandering synths act as moving capture zones.', heroes: false, vehicles: false },
    { id: 'blast', name: 'Blast', type: 'tdm', origin: 'Reboot I & II', players: 10, desc: 'Team deathmatch. First team to 100 eliminations wins.', heroes: false, vehicles: false, target: 100 },
    { id: 'hunt', name: 'Hunt', type: 'hunt', origin: 'Classic II', players: 14, desc: 'Natives defend their homeworld against an army.', heroes: false, vehicles: false, target: 50 },
    { id: 'foresthunt', name: 'Forest Hunt', type: 'infect', origin: 'Reboot II', players: 14, desc: 'Troopers try to survive. Anyone killed joins the tribe.', heroes: false, vehicles: false },
    { id: 'legendsassault', name: 'Legends Assault', type: 'tdm', origin: 'Classic II', players: 10, desc: 'Every legend in the era, all at once. First to 30 eliminations.', heroesOnly: true, target: 30 },
    { id: 'cvt', name: 'Champions vs Tyrants', type: 'cvt', origin: 'Reboot I & II', players: 4, desc: 'Four legends per side. One is the target; eliminate the enemy target to score.', heroesOnly: true },
    { id: 'showdown', name: 'Legends Showdown', type: 'showdown', origin: 'Reboot II', players: 2, desc: 'Two legends per side, elimination rounds. Best of five.', heroesOnly: true },
    { id: 'legendhunt', name: 'Legend Hunt', type: 'legendhunt', origin: 'Reboot I', players: 8, desc: 'One legend against everyone. Whoever kills the legend becomes it.', heroes: true },
    { id: 'survival', name: 'Survival', type: 'survival', origin: 'Reboot I', players: 4, desc: 'Hold out against fifteen waves of enemies with a small squad.', heroes: false, vehicles: false },
    { id: 'onslaught', name: 'Co-op Onslaught', type: 'conquest', origin: 'Reboot II', players: 16, desc: 'Your whole team against harder bots on Conquest rules.', heroes: true, vehicles: true, hardBots: true },
    { id: 'fighterSq', name: 'Fighter Squadron', type: 'squadron', origin: 'Reboot I', players: 12, space: true, desc: 'Starfighter dogfighting with tickets.', heroes: true },
    { id: 'starfighterAssault', name: 'Starfighter Assault', type: 'spaceassault', origin: 'Reboot II', players: 12, space: true, desc: 'Destroy the enemy capital ship\'s shield, engines and bridge.', heroes: true },
    { id: 'spaceassault', name: 'Space Assault', type: 'spaceassault', origin: 'Classic II', players: 12, space: true, desc: 'Take down the enemy capital ship to win.', heroes: false },
    { id: 'legendStarships', name: 'Legend Starships', type: 'squadron', origin: 'Reboot I', players: 4, space: true, desc: 'Legend ships only. First side to 30 kills.', heroesOnly: true },
    { id: 'galacticConquest', name: 'Sector Conquest', type: 'campaign', origin: 'Classic I & II', players: 16, desc: 'A turn-based campaign across the sector. Win battles to take planets.', heroes: true, vehicles: true }
  ];
  D.modeById = {}; D.modes.forEach(function (m) { D.modeById[m.id] = m; });

  D.modeOk = function (mode, map) {
    if (mode.type === 'campaign') return false;
    if (!!mode.space !== !!map.space) return false;
    if (mode.needsWalkerPath && !map.walkerPath && map.layout !== 'open' && map.layout !== 'trench') return false;
    return true;
  };

  // ---------------------------------------------------------------- seasons (battle passes)
  D.seasons = [
    { id: 's1', name: 'Season 1: Desert Fire', theme: 'kesh', tiers: 40, color: '#e2a24a' },
    { id: 's2', name: 'Season 2: Frozen Front', theme: 'glaciem', tiers: 40, color: '#8ac8ff' },
    { id: 's3', name: 'Season 3: The Legion Rises', theme: 'concord', tiers: 40, color: '#4f8cff' },
    { id: 's4', name: 'Season 4: Synth Uprising', theme: 'syndicate', tiers: 40, color: '#d9a441' },
    { id: 's5', name: 'Season 5: Shadow of the Dominion', theme: 'dominion', tiers: 40, color: '#c9d2df' },
    { id: 's6', name: 'Season 6: Clans of Ferrosteel', theme: 'rangers', tiers: 40, color: '#9fb0c4' },
    { id: 's7', name: 'Season 7: Remnant Reckoning', theme: 'remnant', tiers: 40, color: '#e04848' },
    { id: 's8', name: 'Season 8: Legends of the Sector', theme: 'heroes', tiers: 40, color: '#bf5af2' }
  ];
  D.seasonById = {}; D.seasons.forEach(function (s) { D.seasonById[s.id] = s; });

  D.emotes = [
    { id: 'wave', name: 'Wave', price: 0 }, { id: 'salute', name: 'Salute', price: 0 }, { id: 'cheer', name: 'Cheer', price: 500 },
    { id: 'dance', name: 'Cantina Shuffle', price: 1500 }, { id: 'sit', name: 'Take a Seat', price: 800 }, { id: 'pushup', name: 'Push-ups', price: 1200 },
    { id: 'taunt', name: 'Come at Me', price: 1000 }, { id: 'flex', name: 'Flex', price: 1200 }, { id: 'spinblade', name: 'Blade Twirl', price: 2000 },
    { id: 'kneel', name: 'Kneel', price: 600 }, { id: 'clap', name: 'Slow Clap', price: 900 }, { id: 'shrug', name: 'Shrug', price: 600 }
  ];
  D.emoteById = {}; D.emotes.forEach(function (e) { D.emoteById[e.id] = e; });

  // Trooper / legend skin palette variants (applied to the base model)
  D.skinVariants = [
    { id: 'default', name: 'Standard Issue', tint: null },
    { id: 'desert', name: 'Desert Camo', tint: [0xc8a874, 0x8a6a3a] },
    { id: 'snow', name: 'Arctic', tint: [0xf4f8ff, 0x9ab8d8] },
    { id: 'forest', name: 'Woodland', tint: [0x4f5e36, 0x2c3a20] },
    { id: 'urban', name: 'Urban Grey', tint: [0x7b8088, 0x3a3e44] },
    { id: 'crimson', name: 'Crimson Guard', tint: [0xa01818, 0x2a0808] },
    { id: 'midnight', name: 'Midnight', tint: [0x1c2030, 0x3a4a8a] },
    { id: 'gold', name: 'Gilded', tint: [0xd8b04a, 0x6a4a1a] },
    { id: 'veteran', name: 'Veteran (Weathered)', tint: [0x9a9284, 0x5a4a3a] },
    { id: 'purple', name: 'Violet Company', tint: [0xe8e6df, 0x6a2aa0] },
    { id: 'orange', name: 'Orange Battalion', tint: [0xe8e6df, 0xd86a1a] },
    { id: 'green', name: 'Jungle Company', tint: [0xe8e6df, 0x3a8a3a] },
    { id: 'shadow', name: 'Shadow Ops', tint: [0x16161a, 0x2a2a30] },
    { id: 'chrome', name: 'Chrome Plated', tint: [0xd8dce4, 0x9aa0aa], metal: true }
  ];
  D.skinById = {}; D.skinVariants.forEach(function (s) { D.skinById[s.id] = s; });
})();
