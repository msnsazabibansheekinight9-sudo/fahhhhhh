// Dropfall — game content. Every name and design here is original.
'use strict';
const DF = window.DF = window.DF || {};

DF.WORLD = 3600;

DF.FACTIONS = {
  brood:   { name: 'The Brood',   color: '#e3a33c', blood: '#a6d83a', desc: 'A hive species that breeds faster than it can be burned. Swarms of chitin, acid and horn. Close their burrows with explosives.' },
  foundry: { name: 'The Foundry', color: '#e2483d', blood: '#2a2a2a', desc: 'Self-replicating war machines. Disciplined fire lines, heavy plating and glowing heat vents on their backs. Blow up their fabricators.' },
  veil:    { name: 'The Veil',    color: '#8f7dff', blood: '#c49cff', desc: 'Psionic invaders behind energy shields. Energy weapons strip shields twice as fast. Collapse their rifts before they flood the field.' }
};

// armor: what penetration a hit needs to do full damage. back: armor when hit from behind.
// tier: 0 light, 1 medium, 2 heavy, 3 boss.
DF.ENEMIES = {
  // ---- Brood ----
  scuttler:  { f: 'brood', name: 'Scuttler', tier: 0, r: 9,  hp: 90,   armor: 1, speed: 120, atk: 'melee', dmg: 14, range: 8, cd: 0.8, draw: 'bug', col: '#c98b3a', legs: 6, len: 1.3 },
  hunter:    { f: 'brood', name: 'Hunter', tier: 0, r: 10, hp: 130,  armor: 1, speed: 150, atk: 'leap', dmg: 22, range: 10, cd: 1.6, draw: 'bug', col: '#8f9a3e', legs: 6, len: 1.6, desc: 'Leaps across the gap and slows you with its bite.' },
  spitter:   { f: 'brood', name: 'Acid Spitter', tier: 0, r: 11, hp: 160, armor: 1, speed: 85, atk: 'spit', dmg: 18, range: 330, cd: 2.2, draw: 'bug', col: '#9ccf3c', legs: 6, len: 1.4, sac: true },
  scout:     { f: 'brood', name: 'Pheromone Scout', tier: 0, r: 10, hp: 110, armor: 1, speed: 110, atk: 'melee', dmg: 12, range: 8, cd: 1, draw: 'bug', col: '#d7b45b', legs: 6, len: 1.3, caller: true, desc: 'If it survives being spotted, it calls a breach of fresh bugs out of the ground.' },
  warrior:   { f: 'brood', name: 'Warrior', tier: 1, r: 14, hp: 420,  armor: 2, speed: 95, atk: 'melee', dmg: 30, range: 10, cd: 1.1, draw: 'bug', col: '#b06a2c', legs: 6, len: 1.5 },
  guard:     { f: 'brood', name: 'Shellguard', tier: 1, r: 17, hp: 700, armor: 3, back: 1, speed: 70, atk: 'melee', dmg: 40, range: 10, cd: 1.3, draw: 'bug', col: '#7e5a33', legs: 8, len: 1.4, shell: true, desc: 'Plated front. Flank it or bring medium penetration.' },
  lobber:    { f: 'brood', name: 'Bile Lobber', tier: 2, r: 24, hp: 1300, armor: 2, speed: 55, atk: 'artillery', dmg: 55, range: 620, cd: 4.5, draw: 'bug', col: '#7aa02a', legs: 8, len: 1.7, sac: true, desc: 'Artillery bug. Its swollen sac bursts when it dies.' },
  ramhorn:   { f: 'brood', name: 'Ramhorn', tier: 2, r: 26, hp: 2200, armor: 5, back: 2, speed: 80, atk: 'charge', dmg: 80, range: 300, cd: 5, draw: 'bug', col: '#5e3b22', legs: 8, len: 1.8, shell: true, horn: true, desc: 'Charges in a straight line. Dodge sideways, then shoot the soft rear.' },
  behemoth:  { f: 'brood', name: 'Behemoth', tier: 3, r: 46, hp: 7000, armor: 5, back: 3, speed: 42, atk: 'artillery', dmg: 75, range: 700, cd: 3.8, draw: 'bug', col: '#4c4a24', legs: 10, len: 1.7, sac: true, shell: true, stomp: true, desc: 'A walking hive. Anti-tank fire to the head, or a lot of it.' },
  shrieker:  { f: 'brood', name: 'Shrieker', tier: 0, r: 10, hp: 80, armor: 1, speed: 190, atk: 'melee', dmg: 16, range: 8, cd: 1.0, draw: 'flyer', col: '#a96d3b', flying: true },
  burrower:  { f: 'brood', name: 'Burrower', tier: 2, r: 22, hp: 1800, armor: 4, speed: 30, atk: 'tentacle', dmg: 45, range: 260, cd: 2.4, draw: 'bug', col: '#6d3d4a', legs: 0, len: 1.2, shell: true, desc: 'Stays put and whips tentacles up from under the ground near you.' },
  // ---- Foundry ----
  husk:      { f: 'foundry', name: 'Husk Trooper', tier: 0, r: 10, hp: 110, armor: 1, speed: 80, atk: 'shoot', dmg: 9, range: 420, cd: 0.9, burst: 3, draw: 'bot', col: '#55504a', eye: '#ff3b2f' },
  radio:     { f: 'foundry', name: 'Signal Husk', tier: 0, r: 10, hp: 120, armor: 1, speed: 78, atk: 'shoot', dmg: 9, range: 420, cd: 1.2, burst: 2, draw: 'bot', col: '#4f5b4a', eye: '#ff3b2f', caller: true, antenna: true, desc: 'Fires a beacon flare when it spots you. A dropship follows.' },
  rocketeer: { f: 'foundry', name: 'Rocket Husk', tier: 0, r: 11, hp: 140, armor: 1, speed: 70, atk: 'rocket', dmg: 45, range: 520, cd: 3.6, draw: 'bot', col: '#5f4a3a', eye: '#ff3b2f', pack: true },
  shredder:  { f: 'foundry', name: 'Shredder', tier: 1, r: 13, hp: 520, armor: 2, speed: 100, atk: 'melee', dmg: 35, range: 12, cd: 0.6, draw: 'bot', col: '#6a3a32', eye: '#ffb02e', saw: true, desc: 'Chainsaw arms. Shoot the waist joint or keep moving.' },
  bulwark:   { f: 'foundry', name: 'Bulwark', tier: 1, r: 16, hp: 900, armor: 3, back: 2, speed: 60, atk: 'shoot', dmg: 12, range: 470, cd: 0.25, burst: 1, draw: 'bot', col: '#4a4d55', eye: '#ff3b2f', big: true, desc: 'Armored heavy gunner with a hosepipe of bullets. Aim for the head plate gap.' },
  strider:   { f: 'foundry', name: 'Scout Walker', tier: 1, r: 18, hp: 800, armor: 4, back: 1, speed: 85, atk: 'shoot', dmg: 14, range: 450, cd: 0.4, burst: 1, draw: 'walker', col: '#5a5246', eye: '#ff3b2f', desc: 'Two-legged walker. The pilot is exposed from behind.' },
  juggernaut:{ f: 'foundry', name: 'Juggernaut', tier: 2, r: 26, hp: 2600, armor: 5, back: 2, speed: 50, atk: 'flame', dmg: 70, range: 170, cd: 0.15, draw: 'bot', col: '#3c3e44', eye: '#ff2a1f', big: true, vent: true, desc: 'Flamethrower and a wall of plate. Its heat vent on the back is the weak point.' },
  tank:      { f: 'foundry', name: 'Siege Tank', tier: 2, r: 34, hp: 3400, armor: 5, back: 3, speed: 38, atk: 'cannon', dmg: 90, range: 650, cd: 4, draw: 'tank', col: '#45433b', eye: '#ff2a1f', vent: true, desc: 'Main gun hits like a truck. Hit the rear radiator.' },
  gunship:   { f: 'foundry', name: 'Gunship', tier: 2, r: 26, hp: 1400, armor: 3, speed: 110, atk: 'shoot', dmg: 16, range: 480, cd: 0.2, burst: 1, draw: 'gunship', col: '#3e4048', eye: '#ff2a1f', flying: true, desc: 'Hovers out of reach of most cover. Its engines are its weak point.' },
  colossus:  { f: 'foundry', name: 'Colossus Walker', tier: 3, r: 58, hp: 9000, armor: 6, back: 4, speed: 30, atk: 'cannon', dmg: 110, range: 720, cd: 2.6, draw: 'walker', col: '#3a3833', eye: '#ff2a1f', boss: true, spawns: 'husk', desc: 'A mobile factory on four legs. Drops troopers from its belly as it walks.' },
  // ---- Veil ----
  hollow:    { f: 'veil', name: 'Hollow', tier: 0, r: 9, hp: 70, armor: 0, speed: 105, atk: 'melee', dmg: 12, range: 8, cd: 0.9, draw: 'thrall', col: '#7d7a86' },
  drifter:   { f: 'veil', name: 'Drifter', tier: 0, r: 10, hp: 120, armor: 1, shield: 60, speed: 120, atk: 'shoot', dmg: 10, range: 360, cd: 1.3, burst: 2, draw: 'veil', col: '#6f62d9', glow: '#bfb4ff' },
  watcher:   { f: 'veil', name: 'Watcher', tier: 0, r: 11, hp: 120, armor: 1, speed: 90, atk: 'none', dmg: 0, range: 0, cd: 9, draw: 'eye', col: '#5f58a8', glow: '#e3deff', flying: true, caller: true, desc: 'Floating sentinel. Opens a rift for reinforcements if it watches you for too long.' },
  overseer:  { f: 'veil', name: 'Overseer', tier: 1, r: 14, hp: 450, armor: 2, shield: 200, speed: 85, atk: 'bolt', dmg: 26, range: 430, cd: 1.6, draw: 'veil', col: '#5847c4', glow: '#a99bff', staff: true },
  ascendant: { f: 'veil', name: 'Ascendant', tier: 1, r: 14, hp: 420, armor: 2, shield: 150, speed: 140, atk: 'bolt', dmg: 22, range: 420, cd: 1.3, draw: 'veil', col: '#7a4fd0', glow: '#e2b6ff', flying: true, desc: 'Jet-borne Overseer. Hard to pin down behind rocks.' },
  thrallmass:{ f: 'veil', name: 'Thrall Mass', tier: 2, r: 30, hp: 2400, armor: 2, speed: 70, atk: 'melee', dmg: 60, range: 16, cd: 1.4, draw: 'mass', col: '#7d6a7f', desc: 'A heaving mass of converted flesh. No armor to speak of, just a lot of it.' },
  glider:    { f: 'veil', name: 'Glider', tier: 2, r: 26, hp: 1200, armor: 3, speed: 230, atk: 'strafe', dmg: 30, range: 360, cd: 6, draw: 'glider', col: '#4a3d8f', glow: '#a99bff', flying: true },
  reaper:    { f: 'veil', name: 'Reaper Tripod', tier: 3, r: 40, hp: 3000, armor: 4, shield: 2600, speed: 45, atk: 'beam', dmg: 160, range: 620, cd: 5, draw: 'tripod', col: '#3b2f7a', glow: '#d3c8ff', boss: true, desc: 'Three legs and a shield that regenerates. Strip the shield with sustained fire, then hit the core.' }
};

// Roster per faction: which enemies a patrol can contain at each tier.
DF.ROSTER = {
  brood:   { t0: ['scuttler', 'scuttler', 'hunter', 'spitter', 'scuttler'], t1: ['warrior', 'guard', 'warrior'], t2: ['lobber', 'ramhorn', 'burrower', 'ramhorn'], t3: ['behemoth'], air: 'shrieker', caller: 'scout' },
  foundry: { t0: ['husk', 'husk', 'rocketeer', 'husk'], t1: ['shredder', 'bulwark', 'strider'], t2: ['juggernaut', 'tank', 'gunship', 'juggernaut'], t3: ['colossus'], air: 'gunship', caller: 'radio' },
  veil:    { t0: ['hollow', 'hollow', 'drifter', 'hollow', 'drifter'], t1: ['overseer', 'ascendant', 'overseer'], t2: ['thrallmass', 'glider', 'thrallmass'], t3: ['reaper'], air: 'glider', caller: 'watcher' }
};

// ---------- Weapons ----------
// pen: 1 light .. 6 anti-tank .. 7 orbital. rpm, mag, mags = spare magazines.
// kind: bullet | pellet | beam | flame | arc | rocket | explode | charge | rail
DF.WEAPONS = {
  // Primaries
  ar7:   { slot: 'primary', name: 'AR-7 Vanguard', cls: 'Assault Rifle', kind: 'bullet', dmg: 60, pen: 2, rpm: 640, mag: 45, mags: 7, reload: 2.2, spread: 3, speed: 1500, range: 760, cost: 0, lvl: 1, desc: 'Standard issue. Reliable, accurate, forgiving.' },
  ar7p:  { slot: 'primary', name: 'AR-7P Piercer', cls: 'Assault Rifle', kind: 'bullet', dmg: 48, pen: 3, rpm: 640, mag: 30, mags: 8, reload: 2.2, spread: 3, speed: 1600, range: 760, cost: 900, lvl: 3, desc: 'Armor-piercing variant. Less stopping power, gets through medium plate.' },
  smg12: { slot: 'primary', name: 'SMG-12 Hornet', cls: 'Submachine Gun', kind: 'bullet', dmg: 52, pen: 2, rpm: 820, mag: 40, mags: 6, reload: 1.8, spread: 4.5, speed: 1300, range: 560, cost: 700, lvl: 2, onehand: true, desc: 'Fast and light. Usable while carrying cargo.' },
  sg4:   { slot: 'primary', name: 'SG-4 Breacher', cls: 'Shotgun', kind: 'pellet', pellets: 9, dmg: 32, pen: 2, rpm: 80, mag: 8, mags: 6, reload: 3.0, spread: 13, speed: 1200, range: 360, cost: 800, lvl: 2, desc: 'Pump shotgun. Erases light targets at close range.' },
  sg8:   { slot: 'primary', name: 'SG-8 Slugger', cls: 'Shotgun', kind: 'bullet', dmg: 270, pen: 3, rpm: 80, mag: 12, mags: 5, reload: 3.0, spread: 1.4, speed: 1500, range: 700, stagger: 1, cost: 1400, lvl: 6, desc: 'Single heavy slug. Staggers medium targets.' },
  sg12:  { slot: 'primary', name: 'SG-12 Drumfire', cls: 'Shotgun', kind: 'pellet', pellets: 8, dmg: 26, pen: 2, rpm: 300, mag: 10, mags: 6, reload: 2.8, spread: 15, speed: 1200, range: 330, cost: 0, lvl: 1, pass: true, desc: 'Drum-fed automatic shotgun.' },
  mr2:   { slot: 'primary', name: 'MR-2 Longshot', cls: 'Marksman Rifle', kind: 'bullet', dmg: 150, pen: 3, rpm: 160, mag: 15, mags: 6, reload: 2.6, spread: 0.8, speed: 2200, range: 1000, cost: 1200, lvl: 5, desc: 'Semi-auto marksman rifle. Rewards careful aim.' },
  br23:  { slot: 'primary', name: 'BR-23 Ironclad', cls: 'Battle Rifle', kind: 'bullet', dmg: 118, pen: 3, rpm: 380, mag: 20, mags: 6, reload: 2.6, spread: 2.4, speed: 1800, range: 860, cost: 0, lvl: 1, pass: true, desc: 'Heavy full-length cartridge. Kicks hard.' },
  ar61:  { slot: 'primary', name: 'AR-61 Gristle', cls: 'Assault Rifle', kind: 'bullet', dmg: 72, pen: 2, rpm: 560, mag: 35, mags: 7, reload: 2.3, spread: 2.6, speed: 1500, range: 760, cost: 1600, lvl: 8, desc: 'Heavier bullet, slower cyclic rate. Kills light targets in fewer hits.' },
  ls1:   { slot: 'primary', name: 'LS-1 Prism', cls: 'Energy', kind: 'beam', dps: 330, pen: 2, heatRate: 0.22, mag: 1, mags: 4, reload: 2.0, range: 700, cost: 1800, lvl: 10, energy: true, desc: 'Continuous laser. Never needs ammo, only heat sinks. Strips Veil shields fast.' },
  pl3:   { slot: 'primary', name: 'PL-3 Scorch', cls: 'Energy', kind: 'rocket', dmg: 60, pen: 3, rpm: 130, mag: 12, mags: 6, reload: 2.4, spread: 1.5, speed: 800, range: 650, blast: { r: 38, dmg: 120, pen: 3 }, energy: true, cost: 2200, lvl: 12, desc: 'Plasma bolts that burst on impact. Mind the splash.' },
  xb5:   { slot: 'primary', name: 'XB-5 Tremor', cls: 'Explosive', kind: 'rocket', dmg: 40, pen: 2, rpm: 70, mag: 5, mags: 6, reload: 3.0, spread: 1, speed: 650, range: 600, blast: { r: 52, dmg: 260, pen: 3 }, closes: true, cost: 0, lvl: 1, pass: true, desc: 'Explosive crossbow. Can close burrows and fabricators.' },
  fl2:   { slot: 'primary', name: 'FL-2 Kindler', cls: 'Flame', kind: 'flame', dps: 260, pen: 4, mag: 120, mags: 4, reload: 2.6, range: 170, cost: 0, lvl: 1, pass: true, desc: 'Short-range flame projector. Sets the ground on fire.' },
  rg3:   { slot: 'primary', name: 'RG-3 Needle', cls: 'Special', kind: 'bullet', dmg: 230, pen: 4, rpm: 70, mag: 6, mags: 7, reload: 2.8, spread: 0.5, speed: 3000, range: 1000, pierce: 4, cost: 2800, lvl: 15, energy: true, desc: 'Coil-driven dart that passes through several targets.' },
  arc1:  { slot: 'primary', name: 'ARC-1 Stormlash', cls: 'Energy', kind: 'arc', dmg: 220, pen: 3, rpm: 60, mag: 1, mags: 0, reload: 0, range: 230, chains: 3, infinite: true, energy: true, cost: 0, lvl: 1, pass: true, desc: 'Arc projector. Lightning jumps between enemies. And sometimes friends.' },
  // Secondaries
  p2:    { slot: 'secondary', name: 'P-2 Warden', cls: 'Pistol', kind: 'bullet', dmg: 80, pen: 2, rpm: 420, mag: 15, mags: 4, reload: 1.5, spread: 2.5, speed: 1300, range: 560, cost: 0, lvl: 1, desc: 'Sidearm. Fast reload.' },
  p6:    { slot: 'secondary', name: 'P-6 Hammer', cls: 'Revolver', kind: 'bullet', dmg: 230, pen: 3, rpm: 130, mag: 6, mags: 6, reload: 2.4, spread: 1.2, speed: 1500, range: 650, cost: 700, lvl: 4, desc: 'Six heavy rounds. Medium penetration.' },
  smg37: { slot: 'secondary', name: 'SMG-37 Viper', cls: 'Machine Pistol', kind: 'bullet', dmg: 46, pen: 2, rpm: 900, mag: 30, mags: 4, reload: 1.6, spread: 5, speed: 1200, range: 480, cost: 0, lvl: 1, pass: true, desc: 'Machine pistol. Empties itself in two seconds.' },
  gp1:   { slot: 'secondary', name: 'GP-1 Flarelauncher', cls: 'Special', kind: 'rocket', dmg: 50, pen: 2, rpm: 60, mag: 1, mags: 5, reload: 1.6, spread: 1, speed: 700, range: 600, blast: { r: 58, dmg: 420, pen: 4 }, closes: true, cost: 1100, lvl: 7, desc: 'Single-shot grenade pistol. Closes burrows and fabricators.' },
  lp1:   { slot: 'secondary', name: 'LP-1 Spark', cls: 'Energy', kind: 'beam', dps: 220, pen: 2, heatRate: 0.3, mag: 1, mags: 3, reload: 1.6, range: 560, energy: true, cost: 900, lvl: 6, desc: 'Laser pistol. No ammo, just heat.' },
  // Support weapons (delivered by call-in)
  mg50:  { slot: 'support', name: 'MG-50 Sawtooth', cls: 'Machine Gun', kind: 'bullet', dmg: 88, pen: 3, rpm: 760, mag: 100, mags: 3, reload: 5.0, spread: 3.5, speed: 1600, range: 820, desc: 'Belt-fed machine gun. Medium penetration.' },
  hmg:   { slot: 'support', name: 'HMG-9 Thunder', cls: 'Heavy MG', kind: 'bullet', dmg: 155, pen: 4, rpm: 520, mag: 75, mags: 3, reload: 6.0, spread: 4.5, speed: 1600, range: 860, desc: 'Heavy machine gun. Chews through heavy plate.' },
  amr:   { slot: 'support', name: 'AMR-10 Lance', cls: 'Anti-Materiel', kind: 'bullet', dmg: 470, pen: 4, rpm: 110, mag: 7, mags: 6, reload: 3.4, spread: 0.3, speed: 3000, range: 1200, desc: 'Anti-materiel rifle. Heavy penetration at range.' },
  ac8:   { slot: 'support', name: 'AC-8 Bulwark', cls: 'Autocannon', kind: 'rocket', dmg: 260, pen: 4, rpm: 170, mag: 10, mags: 6, reload: 4.0, spread: 1, speed: 1400, range: 1000, blast: { r: 26, dmg: 140, pen: 3 }, closes: true, desc: 'Autocannon. Closes burrows and fabricators from range.' },
  rr1:   { slot: 'support', name: 'RR-1 Spike', cls: 'Recoilless Rifle', kind: 'rocket', dmg: 3300, pen: 6, rpm: 40, mag: 1, mags: 6, reload: 3.4, spread: 0.6, speed: 1300, range: 1100, blast: { r: 45, dmg: 300, pen: 4 }, closes: true, desc: 'Anti-tank recoilless rifle.' },
  sk3:   { slot: 'support', name: 'SK-3 Seeker', cls: 'Guided Launcher', kind: 'rocket', dmg: 2600, pen: 6, rpm: 40, mag: 1, mags: 4, reload: 3.0, spread: 0, speed: 900, range: 1200, homing: true, blast: { r: 40, dmg: 260, pen: 4 }, closes: true, desc: 'Locks the heaviest target near your crosshair and chases it.' },
  os1:   { slot: 'support', name: 'OS-1 One-Shot', cls: 'Disposable', kind: 'rocket', dmg: 2900, pen: 6, rpm: 60, mag: 1, mags: 1, reload: 0.8, spread: 0.4, speed: 1300, range: 1100, blast: { r: 45, dmg: 300, pen: 4 }, closes: true, desc: 'Two disposable anti-tank tubes per call-in.' },
  qs1:   { slot: 'support', name: 'QS-1 Starlance', cls: 'Energy', kind: 'charge', dmg: 3000, pen: 6, charge: 2.4, cool: 9, speed: 1600, range: 1100, blast: { r: 42, dmg: 260, pen: 4 }, infinite: true, energy: true, closes: true, desc: 'Charges for two seconds, then fires an anti-tank bolt. No ammo needed.' },
  fl7:   { slot: 'support', name: 'FL-7 Inferno', cls: 'Flamethrower', kind: 'flame', dps: 420, pen: 4, mag: 160, mags: 4, reload: 3.4, range: 230, desc: 'Full flamethrower. Melts swarms.' },
  arc3:  { slot: 'support', name: 'ARC-3 Tesla', cls: 'Arc Thrower', kind: 'arc', dmg: 320, pen: 4, rpm: 70, mag: 1, mags: 0, reload: 0, range: 280, chains: 4, infinite: true, energy: true, desc: 'Infinite arc thrower. Chains through crowds.' },
  las9:  { slot: 'support', name: 'LAS-9 Sunbeam', cls: 'Laser Cannon', kind: 'beam', dps: 650, pen: 4, heatRate: 0.14, mag: 1, mags: 3, reload: 3.0, range: 900, energy: true, desc: 'Laser cannon. Sustained heavy-penetrating beam.' },
  gl2:   { slot: 'support', name: 'GL-2 Popper', cls: 'Grenade Launcher', kind: 'rocket', dmg: 40, pen: 2, rpm: 200, mag: 10, mags: 3, reload: 4.0, spread: 2, speed: 750, range: 650, blast: { r: 55, dmg: 330, pen: 3 }, closes: true, desc: 'Grenade launcher. Closes burrows and fabricators.' },
  rs4:   { slot: 'support', name: 'RS-4 Tempest', cls: 'Railgun', kind: 'rail', dmg: 1100, pen: 5, charge: 1.6, mag: 1, mags: 18, reload: 1.2, speed: 4000, range: 1300, pierce: 2, energy: true, desc: 'Hold to charge. A fully charged shot penetrates anti-tank plate. Release in time.' }
};

DF.GRENADES = {
  g_frag:     { name: 'G-6 Frag', fuse: 2.4, blast: { r: 72, dmg: 420, pen: 3 }, count: 4, cost: 0, lvl: 1, desc: 'Standard frag grenade.' },
  g_he:       { name: 'G-12 High Explosive', fuse: 2.2, blast: { r: 92, dmg: 560, pen: 4 }, count: 4, cost: 600, lvl: 3, desc: 'Bigger blast, heavier penetration.' },
  g_impact:   { name: 'G-16 Impact', impact: true, blast: { r: 78, dmg: 460, pen: 4 }, count: 4, cost: 900, lvl: 5, desc: 'Detonates the moment it lands.' },
  g_inc:      { name: 'G-10 Incendiary', impact: true, fire: { r: 85, t: 9 }, blast: { r: 50, dmg: 120, pen: 2 }, count: 4, cost: 700, lvl: 4, desc: 'Floods the ground with fire.' },
  g_stun:     { name: 'G-23 Stun', fuse: 1.6, stun: { r: 115, t: 5 }, count: 4, cost: 800, lvl: 6, desc: 'Freezes everything in the blast for five seconds.' },
  g_thermite: { name: 'G-30 Thermite', impact: true, thermite: true, blast: { r: 30, dmg: 2400, pen: 6 }, count: 3, cost: 0, lvl: 1, pass: true, desc: 'Sticks to whatever it hits, then burns through anti-tank plate.' },
  g_smoke:    { name: 'G-3 Smoke', fuse: 1.5, smoke: { r: 130, t: 18 }, count: 4, cost: 300, lvl: 2, desc: 'Breaks enemy line of sight.' },
  g_gas:      { name: 'G-4 Gas', fuse: 1.8, gas: { r: 105, t: 10 }, count: 4, cost: 0, lvl: 1, pass: true, desc: 'Corrosive cloud that ignores armor and confuses enemies.' }
};

// ---------- Call-ins ----------
// code: U D L R. cat: orbital | air | sentry | support | backpack | vehicle | mission | mine
DF.CALLINS = {
  reinforce: { name: 'Reinforce', cat: 'mission', code: 'ULDRU', cd: 0, eta: 3, desc: 'Drops dead squadmates back in. Costs one life each.' },
  resupply:  { name: 'Resupply', cat: 'mission', code: 'DLRU', cd: 110, eta: 3, desc: 'Four supply boxes. Each refills one diver.' },
  nova:      { name: 'Nova Bomb', cat: 'mission', code: 'DULDUR', cd: 0, eta: 4, desc: 'Objective use only. Arm it at the target, then run.' },
  // Support weapons
  mg50:  { name: 'MG-50 Sawtooth', cat: 'support', code: 'DLDUR', cd: 150, eta: 3, give: 'mg50', lvl: 1, cost: 0 },
  amr:   { name: 'AMR-10 Lance', cat: 'support', code: 'DLRDU', cd: 150, eta: 3, give: 'amr', lvl: 2, cost: 600 },
  os1:   { name: 'OS-1 One-Shot', cat: 'support', code: 'DDLUR', cd: 70, eta: 3, give: 'os1', lvl: 1, cost: 0 },
  rr1:   { name: 'RR-1 Spike', cat: 'support', code: 'DLRRL', cd: 180, eta: 3, give: 'rr1', lvl: 4, cost: 1200, pack: 'rrpack' },
  ac8:   { name: 'AC-8 Bulwark', cat: 'support', code: 'DLDUUR', cd: 180, eta: 3, give: 'ac8', lvl: 5, cost: 1300, pack: 'acpack' },
  fl7:   { name: 'FL-7 Inferno', cat: 'support', code: 'DLUDU', cd: 150, eta: 3, give: 'fl7', lvl: 3, cost: 900 },
  arc3:  { name: 'ARC-3 Tesla', cat: 'support', code: 'DRDULL', cd: 150, eta: 3, give: 'arc3', lvl: 8, cost: 1500 },
  las9:  { name: 'LAS-9 Sunbeam', cat: 'support', code: 'DLDUL', cd: 150, eta: 3, give: 'las9', lvl: 9, cost: 1600 },
  gl2:   { name: 'GL-2 Popper', cat: 'support', code: 'DLULD', cd: 150, eta: 3, give: 'gl2', lvl: 6, cost: 1300 },
  hmg:   { name: 'HMG-9 Thunder', cat: 'support', code: 'DLUDD', cd: 160, eta: 3, give: 'hmg', lvl: 7, cost: 1400 },
  sk3:   { name: 'SK-3 Seeker', cat: 'support', code: 'DLULLR', cd: 200, eta: 3, give: 'sk3', lvl: 11, cost: 2000, pack: 'skpack' },
  qs1:   { name: 'QS-1 Starlance', cat: 'support', code: 'DDULR', cd: 200, eta: 3, give: 'qs1', lvl: 13, cost: 2400 },
  rs4:   { name: 'RS-4 Tempest', cat: 'support', code: 'DRDULR', cd: 180, eta: 3, give: 'rs4', lvl: 10, cost: 1900 },
  // Backpacks
  shieldpack: { name: 'Bubble Shield Pack', cat: 'backpack', code: 'DULRLR', cd: 160, eta: 3, pack: 'shield', lvl: 6, cost: 1500, desc: 'Personal shield that soaks hits and recharges.' },
  jumppack:   { name: 'Leap Pack', cat: 'backpack', code: 'DUUDU', cd: 160, eta: 3, pack: 'jump', lvl: 4, cost: 1000, desc: 'Press B to leap over enemies and cliffs.' },
  supplypack: { name: 'Supply Pack', cat: 'backpack', code: 'DLDUUD', cd: 160, eta: 3, pack: 'supply', lvl: 3, cost: 900, desc: 'Carry four resupplies. Press B to use one.' },
  dogpack:    { name: 'Hound Rover', cat: 'backpack', code: 'DURDLU', cd: 180, eta: 3, pack: 'dog', lvl: 9, cost: 1800, desc: 'Backpack drone that shoots what you are not looking at.' },
  // Orbitals
  o_precision: { name: 'Orbital Precision Strike', cat: 'orbital', code: 'RRU', cd: 70, eta: 3, lvl: 1, cost: 0, desc: 'One heavy shell. Kills almost anything it lands on.' },
  o_gatling:   { name: 'Orbital Gatling Barrage', cat: 'orbital', code: 'RDLUU', cd: 60, eta: 3, lvl: 2, cost: 600, desc: 'Fast spray of small shells. Shreds light targets.' },
  o_120:       { name: 'Orbital 120mm Barrage', cat: 'orbital', code: 'RRDLRD', cd: 160, eta: 4, lvl: 4, cost: 1200, desc: 'Sustained artillery over a wide area.' },
  o_380:       { name: 'Orbital 380mm Barrage', cat: 'orbital', code: 'RDUULDD', cd: 210, eta: 5, lvl: 10, cost: 2400, desc: 'Massive, long, indiscriminate. Leave the area.' },
  o_walking:   { name: 'Orbital Creeping Barrage', cat: 'orbital', code: 'RDRDRD', cd: 170, eta: 4, lvl: 7, cost: 1800, desc: 'A wall of shells that walks away from you.' },
  o_laser:     { name: 'Orbital Lance Laser', cat: 'orbital', code: 'RDURD', cd: 240, eta: 3, lvl: 12, cost: 2600, uses: 3, desc: 'A laser that hunts targets for 12 seconds. Three uses per mission.' },
  o_rail:      { name: 'Orbital Railspike', cat: 'orbital', code: 'RURDR', cd: 160, eta: 2, lvl: 14, cost: 2800, desc: 'Locks onto the biggest target nearby and deletes it.' },
  o_gas:       { name: 'Orbital Gas Strike', cat: 'orbital', code: 'RRDR', cd: 60, eta: 3, lvl: 3, cost: 800, desc: 'Lingering corrosive cloud. Ignores armor.' },
  o_ems:       { name: 'Orbital Pulse Strike', cat: 'orbital', code: 'RRLD', cd: 60, eta: 3, lvl: 5, cost: 900, desc: 'Stuns everything in the area for eight seconds.' },
  o_smoke:     { name: 'Orbital Smoke Screen', cat: 'orbital', code: 'RRDU', cd: 60, eta: 3, lvl: 2, cost: 400, desc: 'Wall of smoke. Enemies lose sight of you.' },
  o_napalm:    { name: 'Orbital Firestorm Barrage', cat: 'orbital', code: 'RRDLRU', cd: 200, eta: 4, lvl: 15, cost: 2600, desc: 'Incendiary shells that leave the area burning.' },
  // Air
  a_strafe:  { name: 'Raptor Strafing Run', cat: 'air', code: 'URR', cd: 8, eta: 1.5, uses: 4, rearm: 90, lvl: 1, cost: 0, desc: 'Gun run along the line you throw.' },
  a_bombs:   { name: 'Raptor Airstrike', cat: 'air', code: 'URDR', cd: 8, eta: 2, uses: 2, rearm: 110, lvl: 2, cost: 600, desc: 'Line of heavy bombs across the throw direction.' },
  a_cluster: { name: 'Raptor Cluster Bombs', cat: 'air', code: 'URDDR', cd: 8, eta: 2, uses: 4, rearm: 100, lvl: 3, cost: 700, desc: 'Carpet of small bomblets. Great against swarms.' },
  a_napalm:  { name: 'Raptor Napalm Run', cat: 'air', code: 'URDU', cd: 8, eta: 2, uses: 2, rearm: 110, lvl: 6, cost: 1100, desc: 'Fire along the line.' },
  a_rockets: { name: 'Raptor Rocket Pods', cat: 'air', code: 'URUL', cd: 8, eta: 1.8, uses: 3, rearm: 100, lvl: 8, cost: 1400, desc: 'Rockets that seek the largest targets near the beacon.' },
  a_heavy:   { name: 'Raptor 900kg Bomb', cat: 'air', code: 'URDDD', cd: 8, eta: 2.2, uses: 1, rearm: 120, lvl: 11, cost: 2200, desc: 'One enormous bomb.' },
  a_smoke:   { name: 'Raptor Smoke Run', cat: 'air', code: 'URUD', cd: 8, eta: 1.5, uses: 2, rearm: 80, lvl: 4, cost: 500, desc: 'Line of smoke.' },
  // Sentries & emplacements
  s_mg:      { name: 'MG Sentry', cat: 'sentry', code: 'DURRU', cd: 90, eta: 3, sentry: 'mg', lvl: 2, cost: 600, desc: 'Fast-firing sentry. Light targets.' },
  s_gatling: { name: 'Gatling Sentry', cat: 'sentry', code: 'DURL', cd: 150, eta: 3, sentry: 'gatling', lvl: 5, cost: 1100, desc: 'Spins up and empties itself into crowds.' },
  s_ac:      { name: 'Autocannon Sentry', cat: 'sentry', code: 'DURULU', cd: 150, eta: 3, sentry: 'ac', lvl: 8, cost: 1600, desc: 'Slow, heavy-penetrating cannon sentry.' },
  s_rocket:  { name: 'Rocket Sentry', cat: 'sentry', code: 'DURRL', cd: 150, eta: 3, sentry: 'rocket', lvl: 10, cost: 1900, desc: 'Prioritizes armored targets.' },
  s_mortar:  { name: 'Mortar Sentry', cat: 'sentry', code: 'DURRD', cd: 160, eta: 3, sentry: 'mortar', lvl: 6, cost: 1300, desc: 'Lobs shells at targets out of sight. Will hit you too.' },
  s_ems:     { name: 'Pulse Mortar Sentry', cat: 'sentry', code: 'DUDRR', cd: 160, eta: 3, sentry: 'emsmortar', lvl: 9, cost: 1500, desc: 'Mortar that stuns instead of kills.' },
  s_flame:   { name: 'Flame Sentry', cat: 'sentry', code: 'DURDUU', cd: 150, eta: 3, sentry: 'flame', lvl: 12, cost: 2000, desc: 'Short-range fire turret.' },
  s_tesla:   { name: 'Tesla Spire', cat: 'sentry', code: 'DURULR', cd: 150, eta: 3, sentry: 'tesla', lvl: 11, cost: 1900, desc: 'Arcs anything that gets close. Anything.' },
  s_shield:  { name: 'Shield Dome Relay', cat: 'sentry', code: 'DDLRLR', cd: 160, eta: 3, sentry: 'dome', lvl: 7, cost: 1400, desc: 'Projectile-proof dome for 25 seconds.' },
  m_ap:      { name: 'Anti-Personnel Minefield', cat: 'mine', code: 'DLUR', cd: 120, eta: 3, mines: 'ap', lvl: 3, cost: 700, desc: 'Scatters mines. They do not check uniforms.' },
  m_inc:     { name: 'Incendiary Minefield', cat: 'mine', code: 'DLLD', cd: 120, eta: 3, mines: 'inc', lvl: 6, cost: 1000 },
  m_at:      { name: 'Anti-Tank Minefield', cat: 'mine', code: 'DLUU', cd: 120, eta: 3, mines: 'at', lvl: 9, cost: 1500, desc: 'Heavy mines that ignore light targets.' },
  // Vehicles
  v_exo:     { name: 'EXO-45 Warden Exosuit', cat: 'vehicle', code: 'LDRULDD', cd: 420, eta: 4, uses: 2, vehicle: 'exo', lvl: 12, cost: 3000, desc: 'Walking battle suit with an MG and anti-tank rockets.' },
  v_exo2:    { name: 'EXO-52 Twinfang Exosuit', cat: 'vehicle', code: 'LDRUDDU', cd: 420, eta: 4, uses: 2, vehicle: 'exo2', lvl: 16, cost: 3600, desc: 'Exosuit with twin autocannon arms.' },
  v_buggy:   { name: 'R-8 Rattler Buggy', cat: 'vehicle', code: 'LDRDRDU', cd: 300, eta: 4, vehicle: 'buggy', lvl: 8, cost: 2000, desc: 'Fast four-seat buggy with an auto-turret. W/S throttle, A/D steer.' }
};
DF.MISSION_CALLINS = ['reinforce', 'resupply', 'nova'];

DF.SENTRIES = {
  mg:       { name: 'MG Sentry', hp: 450, ammo: 400, rpm: 700, dmg: 70, pen: 3, range: 520, kind: 'bullet', col: '#9fb2a0' },
  gatling:  { name: 'Gatling Sentry', hp: 450, ammo: 900, rpm: 1300, dmg: 55, pen: 2, range: 460, kind: 'bullet', col: '#a4a08c' },
  ac:       { name: 'Autocannon Sentry', hp: 650, ammo: 50, rpm: 120, dmg: 280, pen: 4, range: 720, kind: 'rocket', blast: { r: 26, dmg: 150, pen: 3 }, col: '#8a9a7c', prefHeavy: true },
  rocket:   { name: 'Rocket Sentry', hp: 600, ammo: 24, rpm: 60, dmg: 1600, pen: 6, range: 700, kind: 'rocket', blast: { r: 38, dmg: 220, pen: 4 }, col: '#9a8c7c', prefHeavy: true },
  mortar:   { name: 'Mortar Sentry', hp: 600, ammo: 30, rpm: 30, dmg: 0, range: 900, kind: 'mortar', blast: { r: 70, dmg: 500, pen: 4 }, col: '#8c8c7c', indirect: true },
  emsmortar:{ name: 'Pulse Mortar', hp: 600, ammo: 30, rpm: 30, dmg: 0, range: 900, kind: 'mortar', stun: { r: 100, t: 5 }, col: '#7c8ca0', indirect: true },
  flame:    { name: 'Flame Sentry', hp: 600, ammo: 600, rpm: 600, dps: 380, pen: 4, range: 210, kind: 'flame', col: '#a07c6c' },
  tesla:    { name: 'Tesla Spire', hp: 700, ammo: 9999, rpm: 70, dmg: 340, pen: 4, range: 200, kind: 'arc', col: '#7c9cb0', hitsAll: true },
  dome:     { name: 'Shield Dome', hp: 3000, ammo: 0, life: 25, kind: 'dome', r: 120, col: '#76c6ff' }
};

DF.VEHICLES = {
  exo:   { name: 'Warden Exosuit', hp: 1600, armor: 4, r: 22, speed: 110, weapons: [{ name: 'Rotary MG', kind: 'bullet', dmg: 90, pen: 3, rpm: 900, ammo: 800, spread: 3, speed: 1600, range: 820 }, { name: 'Rockets', kind: 'rocket', dmg: 1600, pen: 6, rpm: 120, ammo: 14, spread: 1, speed: 1100, range: 1000, blast: { r: 50, dmg: 400, pen: 4 } }], col: '#6f7a5a' },
  exo2:  { name: 'Twinfang Exosuit', hp: 1600, armor: 4, r: 22, speed: 105, weapons: [{ name: 'Left Autocannon', kind: 'rocket', dmg: 300, pen: 4, rpm: 180, ammo: 120, spread: 1.5, speed: 1400, range: 1000, blast: { r: 28, dmg: 150, pen: 3 } }, { name: 'Right Autocannon', kind: 'rocket', dmg: 300, pen: 4, rpm: 180, ammo: 120, spread: 1.5, speed: 1400, range: 1000, blast: { r: 28, dmg: 150, pen: 3 } }], col: '#5c6a7a' },
  buggy: { name: 'Rattler Buggy', hp: 1000, armor: 3, r: 24, speed: 330, turret: { kind: 'bullet', dmg: 85, pen: 3, rpm: 650, range: 640, spread: 3, speed: 1600 }, col: '#7a6a4a' }
};

DF.BACKPACKS = {
  shield: { name: 'Bubble Shield', hp: 260, regen: 3.5 },
  jump:   { name: 'Leap Pack', cd: 6 },
  supply: { name: 'Supply Pack', charges: 4 },
  dog:    { name: 'Hound Rover', dmg: 45, pen: 2, rpm: 500, range: 380, ammo: 600 },
  rrpack: { name: 'Spike Ammo Pack', ammoFor: 'rr1', refill: 4 },
  acpack: { name: 'Bulwark Ammo Pack', ammoFor: 'ac8', refill: 6 },
  skpack: { name: 'Seeker Ammo Pack', ammoFor: 'sk3', refill: 3 }
};

// ---------- Armor & cosmetics ----------
DF.PASSIVES = {
  padded:    { name: 'Padded Pouches', desc: '+2 grenades and +2 stims.' },
  fortified: { name: 'Blast Lining', desc: '50% less explosive damage. Better aim while crouched.' },
  medic:     { name: 'Field Medic', desc: '+2 stims. Stims heal twice as fast and last longer.' },
  scout:     { name: 'Low Profile', desc: 'Enemies spot you 30% later. Nearby points of interest appear on the map.' },
  servo:     { name: 'Servo Arm', desc: 'Throw grenades and beacons 50% farther.' },
  engineer:  { name: 'Sapper Kit', desc: '+2 grenades. 30% less recoil when crouched or prone.' },
  resolve:   { name: 'Last Stand', desc: '50% chance to survive a killing blow.' },
  ember:     { name: 'Heat Shroud', desc: '75% less fire damage.' },
  ground:    { name: 'Grounded', desc: '90% less arc damage.' },
  athlete:   { name: 'Conditioned', desc: '+50% stamina and 25% faster stamina recovery.' },
  siege:     { name: 'Ammo Harness', desc: '+1 spare magazine for every weapon. Support weapons reload 30% faster.' }
};

DF.ARMOR_CLASS = {
  light:  { name: 'Light',  dr: 0.0,  speed: 1.10, stamina: 1.15, rating: 50 },
  medium: { name: 'Medium', dr: 0.22, speed: 1.00, stamina: 1.00, rating: 100 },
  heavy:  { name: 'Heavy',  dr: 0.38, speed: 0.88, stamina: 0.85, rating: 150 }
};

// pattern: plain | stripe | chevron | camo | split | hex | check
DF.ARMORS = {
  a_recruit:  { name: 'B-01 Field Recruit', cls: 'medium', passive: 'padded', main: '#6c7458', trim: '#c9b98a', visor: '#2b3b42', pattern: 'plain', cost: 0 },
  a_scout:    { name: 'SC-30 Pathfinder', cls: 'light', passive: 'scout', main: '#5d6e5a', trim: '#2d3328', visor: '#203c38', pattern: 'camo', cost: 1500, lvl: 3 },
  a_lifeline: { name: 'CE-09 Lifeline', cls: 'medium', passive: 'medic', main: '#d8dad3', trim: '#2f8f87', visor: '#1f2f33', pattern: 'split', cost: 1800, lvl: 5 },
  a_bulwark:  { name: 'FS-55 Bulwark', cls: 'heavy', passive: 'fortified', main: '#575a55', trim: '#d39a2e', visor: '#2d2d28', pattern: 'stripe', cost: 2200, lvl: 6 },
  a_sapper:   { name: 'EX-04 Sapper', cls: 'medium', passive: 'engineer', main: '#7a6745', trim: '#3b3123', visor: '#4b2c1c', pattern: 'chevron', cost: 1600, lvl: 4 },
  a_longarm:  { name: 'SA-12 Longarm', cls: 'medium', passive: 'servo', main: '#3e5268', trim: '#b9c4cf', visor: '#152230', pattern: 'hex', cost: 2400, lvl: 8 },
  a_steadfast:{ name: 'DP-11 Steadfast', cls: 'heavy', passive: 'resolve', main: '#3c4049', trim: '#b3322b', visor: '#1a1c22', pattern: 'split', cost: 3000, lvl: 10 },
  a_ember:    { name: 'I-44 Emberguard', cls: 'medium', passive: 'ember', main: '#7a3a24', trim: '#e2a33a', visor: '#2a1210', pattern: 'chevron', cost: 0, pass: true },
  a_ground:   { name: 'AF-02 Groundline', cls: 'medium', passive: 'ground', main: '#2f4b5e', trim: '#62d0ff', visor: '#0c1a24', pattern: 'hex', cost: 0, pass: true },
  a_sprinter: { name: 'PH-7 Sprinter', cls: 'light', passive: 'athlete', main: '#8e8e86', trim: '#23252a', visor: '#30383c', pattern: 'stripe', cost: 0, pass: true },
  a_siege:    { name: 'SR-18 Siegebreaker', cls: 'heavy', passive: 'siege', main: '#4f5442', trim: '#9aa07a', visor: '#20231b', pattern: 'check', cost: 0, pass: true },
  a_wraith:   { name: 'GH-3 Wraith', cls: 'light', passive: 'scout', main: '#26272b', trim: '#55585f', visor: '#7b1d1d', pattern: 'plain', cost: 0, pass: true },
  a_vanguard: { name: 'SV-1 Steel Vanguard', cls: 'heavy', passive: 'fortified', main: '#7c8288', trim: '#e8e2d0', visor: '#1b2b39', pattern: 'stripe', cost: 0, pass: true },
  a_marshal:  { name: 'MX-9 Parade Marshal', cls: 'medium', passive: 'resolve', main: '#20304a', trim: '#d6b25a', visor: '#0f1724', pattern: 'chevron', cost: 0, store: 650 },
  a_frost:    { name: 'CW-6 Frostline', cls: 'light', passive: 'athlete', main: '#cfd8de', trim: '#6f8796', visor: '#28414f', pattern: 'camo', cost: 0, store: 500 },
  a_rust:     { name: 'RU-2 Dustwalker', cls: 'medium', passive: 'padded', main: '#94704a', trim: '#4a3624', visor: '#2c241b', pattern: 'camo', cost: 0, store: 400 },
  a_obsidian: { name: 'OB-0 Obsidian', cls: 'heavy', passive: 'resolve', main: '#141418', trim: '#8a5cff', visor: '#3a1f7a', pattern: 'hex', cost: 0, store: 900 },
  a_hazard:   { name: 'HZ-5 Hazmat', cls: 'medium', passive: 'medic', main: '#c9b23a', trim: '#2a2a2a', visor: '#1a2a1a', pattern: 'stripe', cost: 0, store: 550 }
};

DF.CAPES = {
  c_none:     { name: 'No Cape', c1: null },
  c_issue:    { name: 'Issue Drab', c1: '#4c5240', c2: '#4c5240', pattern: 'plain', cost: 0 },
  c_signal:   { name: 'Signal Orange', c1: '#d0662b', c2: '#2a2a2a', pattern: 'stripe', cost: 0, pass: true },
  c_steel:    { name: 'Steel Mantle', c1: '#6b7480', c2: '#d9dde2', pattern: 'chevron', cost: 0, pass: true },
  c_storm:    { name: 'Stormfront', c1: '#244a6a', c2: '#62d0ff', pattern: 'bolt', cost: 0, pass: true },
  c_ember:    { name: 'Ember Banner', c1: '#6a1f14', c2: '#f0a23a', pattern: 'flame', cost: 0, pass: true },
  c_night:    { name: 'Nightwatch', c1: '#16181f', c2: '#7b1d1d', pattern: 'split', cost: 0, pass: true },
  c_veteran:  { name: 'Veteran Red', c1: '#8a1f1f', c2: '#e2d6b2', pattern: 'border', cost: 0, pass: true },
  c_gold:     { name: 'Gilded Honor', c1: '#20304a', c2: '#d6b25a', pattern: 'star', cost: 0, store: 300 },
  c_aurora:   { name: 'Aurora', c1: '#1f3a3a', c2: '#7cf0c8', pattern: 'stripe', cost: 0, store: 250 },
  c_hive:     { name: 'Hivebreaker', c1: '#3a2c14', c2: '#a6d83a', pattern: 'hex', cost: 0, store: 300 },
  c_void:     { name: 'Voidcloak', c1: '#0b0b14', c2: '#8f7dff', pattern: 'star', cost: 0, store: 400 }
};

DF.CARDS = {
  k_default: { name: 'Drop Zone', c1: '#2b3a44', c2: '#6c7458' },
  k_dune:    { name: 'Dune Sea', c1: '#8a6a3a', c2: '#d9b56a' },
  k_ice:     { name: 'Frostfall', c1: '#3a5a6a', c2: '#cfe6ee' },
  k_burn:    { name: 'Burn Line', c1: '#3a120c', c2: '#f07a2a' },
  k_arc:     { name: 'Arc Field', c1: '#0c1a2a', c2: '#62d0ff' },
  k_veil:    { name: 'Rift Glow', c1: '#140c2a', c2: '#a99bff' }
};

DF.TITLES = ['Cadet', 'Private', 'Lance Corporal', 'Corporal', 'Sergeant', 'Staff Sergeant', 'Master Sergeant', 'First Sergeant', 'Sergeant Major', 'Second Lieutenant', 'Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'General', 'Fleet Marshal', 'Star Marshal', 'Drop Commander'];
DF.EXTRA_TITLES = { t_burn: 'Hive Burner', t_arc: 'Storm Caller', t_steel: 'Iron Wall', t_ember: 'Ash Walker', t_vet: 'Old Hand' };

DF.BOOSTERS = {
  b_vital:   { name: 'Hardened Vitals', desc: 'Every diver takes 15% less damage.' },
  b_stamina: { name: 'Stamina Tonic', desc: '+30% stamina and faster recovery.' },
  b_reinf:   { name: 'Spare Pods', desc: '+3 reinforcements.' },
  b_stims:   { name: 'Stim Surplus', desc: 'Start with 2 extra stims.' },
  b_muscle:  { name: 'Mud Treads', desc: 'Snow, sand and swamp no longer slow you.' },
  b_radar:   { name: 'Sector Scan', desc: 'All points of interest appear on the map at drop.' },
  b_flex:    { name: 'Quick Requisition', desc: 'Call-in cooldowns 10% shorter.' }
};

// ---------- Ship modules ----------
DF.MODULES = [
  { bay: 'Orbital Cannons', items: [
    { id: 'oc1', name: 'Recharged Couplers', desc: 'Orbital cooldowns 10% shorter.', cost: { cr: 300, c: 40 } },
    { id: 'oc2', name: 'Heavier Shells', desc: 'Orbital blast radius +15%.', cost: { cr: 600, c: 60, r: 20 } },
    { id: 'oc3', name: 'Fire-Control Uplink', desc: 'Orbital strikes arrive 1 second sooner.', cost: { cr: 1000, c: 80, r: 40, s: 10 } } ] },
  { bay: 'Hangar', items: [
    { id: 'h1', name: 'Flight Crew Drills', desc: 'Raptor rearm 20% faster.', cost: { cr: 300, c: 40 } },
    { id: 'h2', name: 'Extra Ordnance Rack', desc: 'Raptor call-ins get one extra use.', cost: { cr: 600, c: 60, r: 20 } },
    { id: 'h3', name: 'Precision Payloads', desc: 'Raptor blast radius +15%.', cost: { cr: 1000, c: 80, r: 40, s: 10 } } ] },
  { bay: 'Bridge', items: [
    { id: 'b1', name: 'Signal Booster', desc: 'All call-in cooldowns 5% shorter.', cost: { cr: 250, c: 30 } },
    { id: 'b2', name: 'Tactical Feed', desc: 'Call-ins arrive 0.5 seconds sooner.', cost: { cr: 550, c: 50, r: 15 } },
    { id: 'b3', name: 'Supply Logistics', desc: 'Resupply cooldown 25% shorter.', cost: { cr: 900, c: 70, r: 35, s: 8 } } ] },
  { bay: 'Engineering', items: [
    { id: 'e1', name: 'Sharpened Pods', desc: 'Drop pods crush a 50% wider area.', cost: { cr: 250, c: 30 } },
    { id: 'e2', name: 'Spare Magazines', desc: '+1 spare magazine for primary weapons.', cost: { cr: 550, c: 50, r: 15 } },
    { id: 'e3', name: 'Field Medicine', desc: '+1 stim, and stims heal 25% more.', cost: { cr: 900, c: 70, r: 35, s: 8 } } ] },
  { bay: 'Robotics', items: [
    { id: 'r1', name: 'Reinforced Chassis', desc: 'Sentries have 50% more health.', cost: { cr: 300, c: 40 } },
    { id: 'r2', name: 'Ammo Hoppers', desc: 'Sentries carry 50% more ammo.', cost: { cr: 600, c: 60, r: 20 } },
    { id: 'r3', name: 'Vehicle Plating', desc: 'Exosuits and buggies have 30% more health.', cost: { cr: 1000, c: 80, r: 40, s: 10 } } ] },
  { bay: 'Command', items: [
    { id: 'c1', name: 'Rapid Reinforcement', desc: '+1 reinforcement and faster respawn.', cost: { cr: 300, c: 40 } },
    { id: 'c2', name: 'Combat Drills', desc: '+20% stamina.', cost: { cr: 600, c: 60, r: 20 } },
    { id: 'c3', name: 'Sample Scanners', desc: 'Samples show on the map.', cost: { cr: 1000, c: 80, r: 40, s: 10 } } ] }
];

// ---------- Campaign passes ----------
// kinds: weapon, grenade, armor, cape, card, title, booster, shards, credits
DF.PASSES = [
  { id: 'p_field', name: 'Field Issue', premium: false, cost: 0, blurb: 'Free for every recruit. The basics, done well.', pages: [
    [ { k: 'weapon', ref: 'sg12', m: 10 }, { k: 'credits', ref: 300, m: 5 }, { k: 'card', ref: 'k_dune', m: 4 }, { k: 'booster', ref: 'b_stims', m: 10 }, { k: 'shards', ref: 100, m: 10 }, { k: 'cape', ref: 'c_signal', m: 8 } ],
    [ { k: 'armor', ref: 'a_sprinter', m: 20 }, { k: 'grenade', ref: 'g_gas', m: 15 }, { k: 'booster', ref: 'b_vital', m: 20 }, { k: 'shards', ref: 150, m: 15 }, { k: 'title', ref: 't_vet', m: 10 }, { k: 'weapon', ref: 'smg37', m: 18 } ],
    [ { k: 'booster', ref: 'b_reinf', m: 30 }, { k: 'armor', ref: 'a_siege', m: 35 }, { k: 'card', ref: 'k_ice', m: 12 }, { k: 'shards', ref: 200, m: 25 }, { k: 'booster', ref: 'b_stamina', m: 25 }, { k: 'cape', ref: 'c_veteran', m: 30 } ] ] },
  { id: 'p_steel', name: 'Steel Vanguard', premium: true, cost: 1000, blurb: 'Heavy plate and heavy calibers for the front line.', pages: [
    [ { k: 'weapon', ref: 'br23', m: 15 }, { k: 'armor', ref: 'a_vanguard', m: 25 }, { k: 'cape', ref: 'c_steel', m: 12 }, { k: 'shards', ref: 300, m: 20 }, { k: 'card', ref: 'k_default', m: 4 }, { k: 'title', ref: 't_steel', m: 10 } ],
    [ { k: 'grenade', ref: 'g_thermite', m: 30 }, { k: 'booster', ref: 'b_muscle', m: 25 }, { k: 'shards', ref: 300, m: 25 }, { k: 'credits', ref: 600, m: 10 } ] ] },
  { id: 'p_arc', name: 'Arc Legion', premium: true, cost: 1000, blurb: 'Lightning in a backpack, armor that drinks it.', pages: [
    [ { k: 'weapon', ref: 'arc1', m: 20 }, { k: 'armor', ref: 'a_ground', m: 25 }, { k: 'cape', ref: 'c_storm', m: 12 }, { k: 'card', ref: 'k_arc', m: 6 }, { k: 'shards', ref: 300, m: 20 } ],
    [ { k: 'title', ref: 't_arc', m: 10 }, { k: 'booster', ref: 'b_radar', m: 20 }, { k: 'shards', ref: 300, m: 25 }, { k: 'armor', ref: 'a_wraith', m: 30 }, { k: 'cape', ref: 'c_night', m: 18 } ] ] },
  { id: 'p_ember', name: 'Ember Corps', premium: true, cost: 1000, blurb: 'Fire, explosives, and the armor to stand in both.', pages: [
    [ { k: 'weapon', ref: 'fl2', m: 20 }, { k: 'armor', ref: 'a_ember', m: 25 }, { k: 'cape', ref: 'c_ember', m: 12 }, { k: 'card', ref: 'k_burn', m: 6 }, { k: 'shards', ref: 300, m: 20 } ],
    [ { k: 'weapon', ref: 'xb5', m: 25 }, { k: 'title', ref: 't_burn', m: 10 }, { k: 'booster', ref: 'b_flex', m: 25 }, { k: 'shards', ref: 300, m: 25 }, { k: 'card', ref: 'k_veil', m: 8 } ] ] }
];
DF.PAGE_GATE = [0, 40, 100]; // medals spent in a pass needed to open each page

// ---------- Galaxy ----------
DF.BIOMES = {
  dunes:    { name: 'Desert dunes', g1: '#b9935a', g2: '#a68048', g3: '#c9a46a', obs: ['rock', 'rock', 'mesa', 'bones'], dens: 0.8, slow: 'sand', tint: 'rgba(255,200,120,0.05)' },
  tundra:   { name: 'Frozen tundra', g1: '#c9d5dc', g2: '#b4c2ca', g3: '#dfe8ec', obs: ['icerock', 'icerock', 'pine', 'rock'], dens: 0.9, slow: 'snow', tint: 'rgba(180,220,255,0.06)' },
  jungle:   { name: 'Overgrown jungle', g1: '#3d5a2e', g2: '#33502a', g3: '#4b6b36', obs: ['tree', 'tree', 'bush', 'rock', 'tree'], dens: 1.5, tint: 'rgba(80,140,60,0.06)' },
  volcanic: { name: 'Volcanic badlands', g1: '#3a302c', g2: '#2e2624', g3: '#4a3c34', obs: ['basalt', 'basalt', 'rock', 'lava'], dens: 0.9, tint: 'rgba(255,90,40,0.06)' },
  marsh:    { name: 'Toxic marsh', g1: '#4b5638', g2: '#3f4a30', g3: '#5a6640', obs: ['deadtree', 'bush', 'pool', 'rock'], dens: 1.1, slow: 'mud', tint: 'rgba(120,160,60,0.07)' },
  moon:     { name: 'Barren moon', g1: '#7d7c78', g2: '#6d6c68', g3: '#8e8d88', obs: ['crater', 'rock', 'rock', 'crater'], dens: 0.7, tint: 'rgba(200,200,220,0.04)' },
  ashland:  { name: 'Ash wastes', g1: '#5e5a54', g2: '#524e49', g3: '#6b6760', obs: ['deadtree', 'rock', 'ruin', 'rock'], dens: 0.9, tint: 'rgba(160,150,140,0.06)' },
  crystal:  { name: 'Crystal flats', g1: '#4a4460', g2: '#3e3954', g3: '#585074', obs: ['crystal', 'crystal', 'rock', 'crystal'], dens: 1.0, tint: 'rgba(170,140,255,0.07)' },
  colony:   { name: 'Ruined colony', g1: '#55575a', g2: '#4b4d50', g3: '#626468', obs: ['building', 'building', 'ruin', 'wreck', 'rock'], dens: 1.0, tint: 'rgba(140,160,200,0.05)' }
};

DF.HAZARDS = {
  none:      { name: 'Clear skies', desc: 'No planetary hazard.' },
  sandstorm: { name: 'Sandstorms', desc: 'Visibility drops sharply during storms.' },
  blizzard:  { name: 'Blizzards', desc: 'Whiteouts that cut visibility and slow movement.' },
  rain:      { name: 'Monsoon', desc: 'Heavy rain shortens how far you can see.' },
  fog:       { name: 'Dense fog', desc: 'Short sight lines for everyone.' },
  firestorm: { name: 'Fire tornadoes', desc: 'Burning cyclones roam the map. Stay out of their way.' },
  ion:       { name: 'Ion storms', desc: 'Call-ins go offline while a storm passes.' },
  meteor:    { name: 'Meteor showers', desc: 'Falling rocks hit random spots near you.' },
  night:     { name: 'Long night', desc: 'Darkness. Your helmet lamp shows a cone ahead.' }
};

DF.PLANETS = [
  { id: 'kessara', name: 'Kessara Prime', f: 'brood',   biome: 'dunes',    hazard: 'sandstorm', x: 0.18, y: 0.30, lib: 22 },
  { id: 'velk',    name: 'Velk IX',       f: 'brood',   biome: 'jungle',   hazard: 'rain',      x: 0.10, y: 0.52, lib: 41 },
  { id: 'morrow',  name: "Morrow's Reach",f: 'brood',   biome: 'marsh',    hazard: 'fog',       x: 0.26, y: 0.68, lib: 8 },
  { id: 'anthis',  name: 'Anthis',        f: 'brood',   biome: 'volcanic', hazard: 'firestorm', x: 0.32, y: 0.44, lib: 63 },
  { id: 'ironvale',name: 'Ironvale',      f: 'foundry', biome: 'ashland',  hazard: 'ion',       x: 0.82, y: 0.30, lib: 15 },
  { id: 'cassiel', name: 'Cassiel',       f: 'foundry', biome: 'tundra',   hazard: 'blizzard',  x: 0.90, y: 0.52, lib: 37 },
  { id: 'dravos',  name: 'Dravos',        f: 'foundry', biome: 'moon',     hazard: 'meteor',    x: 0.72, y: 0.62, lib: 5 },
  { id: 'halcyon', name: 'Halcyon Forge', f: 'foundry', biome: 'volcanic', hazard: 'night',     x: 0.68, y: 0.42, lib: 52 },
  { id: 'aurelia', name: 'Aurelia',       f: 'veil',    biome: 'colony',   hazard: 'night',     x: 0.50, y: 0.14, lib: 30 },
  { id: 'thessaly',name: 'Thessaly Gate', f: 'veil',    biome: 'crystal',  hazard: 'none',      x: 0.40, y: 0.24, lib: 12 },
  { id: 'nimbus',  name: 'Nimbus Drift',  f: 'veil',    biome: 'tundra',   hazard: 'night',     x: 0.60, y: 0.22, lib: 48 },
  { id: 'sereth',  name: 'Sereth',        f: 'veil',    biome: 'colony',   hazard: 'fog',       x: 0.50, y: 0.86, lib: 0, f2: 'brood' }
];

DF.MISSIONS = {
  eliminate: { name: 'Eliminate Target', desc: 'A command-grade enemy is on the surface. Kill it.' },
  purge:     { name: { brood: 'Purge Hive Cluster', foundry: 'Raze Fabricator Yard', veil: 'Collapse Rift Field' }, desc: 'Destroy every spawner at the marked site with explosives.' },
  beacon:    { name: 'Launch Relay Beacon', desc: 'Power the relay, enter the launch codes, defend it until it fires.' },
  rescue:    { name: 'Evacuate Colonists', desc: 'Open the shelter and get the colonists to the evac shuttle.' },
  blackbox:  { name: 'Recover Flight Recorder', desc: 'Find the crashed frigate, take its recorder, and carry it to extraction.' },
  nova:      { name: 'Nova Bomb Strike', desc: 'Call down a Nova Bomb on the enemy command node, arm it, and get clear.' }
};

DF.DIFFS = [
  { n: 1, name: 'Recruit' }, { n: 2, name: 'Easy' }, { n: 3, name: 'Standard' }, { n: 4, name: 'Challenging' }, { n: 5, name: 'Hard' },
  { n: 6, name: 'Extreme' }, { n: 7, name: 'Severe' }, { n: 8, name: 'Brutal' }, { n: 9, name: 'Lethal' }, { n: 10, name: 'Absolute' }
];
DF.DIFF_UNLOCK = [1, 1, 2, 3, 5, 7, 9, 11, 13, 15]; // player level needed for each difficulty

DF.xpForLevel = l => 600 + l * 450;
