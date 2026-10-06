'use strict';
// Units: every faction's warriors and the player's allies. Team-aware AI,
// target selection, flow-field navigation, damage, gibs, reanimation, bosses.
(function () {
  const E = G.enemies = { list: [], hazards: [] };
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const m = () => G.models.mats;

  const FAC = E.FAC = {
    swarm: { blood: 0x8aa012, gib: () => [m().chitin, m().sflesh], spawn: 'burrow', name: 'The Swarm' },
    green: { blood: 0x6a0a06, gib: () => [m().oskin, m().rust], spawn: 'run', name: 'Greenskins' },
    machine: { blood: 0x36ff7a, gib: () => [m().necro, m().necroDark], spawn: 'phase', metal: true, name: 'Undying Machines' },
    chaos: { blood: 0x5a0606, gib: () => [m().dskin, m().robe, m().cflesh], spawn: 'warp', name: 'Traitors & Daemons' },
    traitor: { blood: 0x5a0606, gib: () => [m().traitor, m().cflesh], spawn: 'warp', name: 'Traitor Legions' },
    tau: { blood: 0x6a1010, gib: () => [m().tauArm, m().tauDark], spawn: 'jet', metal: true, name: 'The Ascendancy' },
    eldar: { blood: 0x7a0a0a, gib: () => [m().eldarArm, m().wraithbone], spawn: 'webway', name: 'The Starborn' },
    cult: { blood: 0x4a0a4a, gib: () => [m().cultSkin, m().cultChitin, m().cultOveralls], spawn: 'burrow', name: 'The Brood Cult' },
    imperium: { blood: 0x6a0a0a, gib: () => [m().loyal, m().fatigue], spawn: 'pod', name: 'Imperium' },
  };

  // ranged attack kinds
  const K = E.KINDS = {
    slug: { hit: true, col: 0xffc040, snd: 'slug', w: 0.025 },
    las: { hit: true, col: 0xff4020, snd: 'autogun', w: 0.03 },
    autogun: { hit: true, col: 0xffd060, snd: 'autogun', w: 0.02 },
    pulse: { hit: true, col: 0x60c0ff, snd: 'pulse', w: 0.04 },
    shuriken: { hit: true, col: 0x80ffe0, snd: 'shuriken', w: 0.02 },
    heavy: { hit: true, col: 0xffb030, snd: 'bolter', w: 0.04, boom: true },
    lightning: { hit: true, col: 0x9ac0ff, snd: 'lightning', w: 0.05 },
    gauss: { beam: true, col: 0x40ff80, snd: 'gauss', w: 0.06 },
    sniper: { beam: true, col: 0xff3020, snd: 'sniper', w: 0.03 },
    lance: { beam: true, col: 0x60d0ff, snd: 'melta', w: 0.12, splash: 2.5 },
    ion: { beam: true, col: 0x70b0ff, snd: 'plasmaBig', w: 0.2, splash: 3 },
    acid: { proj: 'acid', snd: 'acid' }, fire: { proj: 'fire', snd: 'fireball' }, flame: { proj: 'flame', snd: 'fireball' },
    missile: { proj: 'missile', snd: 'missile' }, warp: { proj: 'warp', snd: 'warpbolt' }, bolt: { proj: 'ebolt', snd: 'bolter' },
    plasma: { proj: 'eplasma', snd: 'plasma' },
  };

  // type table. Fields: hp speed r scale melee ranged keep leap charge fly cloak shield kamikaze aura jet deathCloud armor reanimate boss elite
  const T = E.types = {
    // --- The Swarm
    ripper: { name: 'Ripper', fac: 'swarm', build: 'ripper', hp: 55, speed: 8.5, r: 0.45, melee: { dmg: 9, range: 1.9, rate: 0.7 }, leap: true, score: 10, voice: 'screech' },
    spitter: { name: 'Spitter', fac: 'swarm', build: 'spitter', hp: 80, speed: 5, r: 0.45, ranged: { kind: 'acid', dmg: 12, rate: 2.0, range: 32, speed: 24, burst: 1 }, keep: [12, 24], melee: { dmg: 7, range: 1.9, rate: 0.8 }, score: 15, voice: 'screech' },
    gargoyle: { name: 'Gargoyle', fac: 'swarm', build: 'gargoyle', hp: 40, speed: 9, r: 0.45, fly: 4, ranged: { kind: 'acid', dmg: 7, rate: 1.6, range: 26, speed: 26, burst: 1 }, keep: [6, 16], score: 12, voice: 'screech' },
    warrior: { name: 'Hive Warrior', fac: 'swarm', build: 'warrior', hp: 480, speed: 5.5, r: 0.8, scale: 1.15, melee: { dmg: 24, range: 3, rate: 1.3 }, ranged: { kind: 'acid', dmg: 13, rate: 2.2, range: 30, speed: 26, burst: 3 }, keep: [3, 14], score: 60, elite: true, voice: 'screech' },
    lictor: { name: 'Lictor', fac: 'swarm', build: 'lictor', hp: 300, speed: 7, r: 0.6, scale: 1.1, melee: { dmg: 30, range: 2.6, rate: 1.1 }, leap: true, cloak: true, score: 50, elite: true, voice: 'screech' },
    carnifex: { name: 'Carnifex', fac: 'swarm', build: 'carnifex', hp: 1400, speed: 5.5, r: 1.3, scale: 1.3, melee: { dmg: 40, range: 3.6, rate: 1.5 }, charge: true, armor: 0.2, score: 150, elite: true, voice: 'roar' },
    tyrant: { name: 'THE HIVE TYRANT', fac: 'swarm', build: 'tyrant', hp: 5200, speed: 5.5, r: 1.4, scale: 1.9, melee: { dmg: 40, range: 4.5, rate: 1.6 }, ranged: { kind: 'acid', dmg: 15, rate: 1.4, range: 45, speed: 28, burst: 5, fan: 0.25 }, keep: [6, 18], boss: { slam: true, summon: ['ripper', 'ripper', 'ripper', 'spitter', 'gargoyle'] }, score: 1000, voice: 'roar' },
    // --- Greenskins
    gretchin: { name: 'Gretchin', fac: 'green', build: 'gretchin', hp: 22, speed: 6, r: 0.35, scale: 0.55, ranged: { kind: 'slug', dmg: 3, rate: 0.25, range: 30, burst: 3, pause: 1.8, spread: 0.1 }, keep: [8, 20], score: 4, voice: 'cultist' },
    brute: { name: 'Greenskin Brute', fac: 'green', build: 'brute', hp: 150, speed: 6.2, r: 0.6, scale: 1.05, melee: { dmg: 20, range: 2.3, rate: 1.1 }, charge: true, score: 20, voice: 'grunt' },
    shoota: { name: 'Greenskin Shoota', fac: 'green', build: 'bruteR', hp: 130, speed: 5, r: 0.6, scale: 1.05, ranged: { kind: 'slug', dmg: 5, rate: 0.13, range: 40, burst: 7, pause: 2.2, spread: 0.07 }, keep: [10, 26], melee: { dmg: 14, range: 2.2, rate: 1.1 }, score: 20, voice: 'grunt' },
    burna: { name: 'Burna Boy', fac: 'green', build: 'bruteR', hp: 140, speed: 5.5, r: 0.6, scale: 1.05, ranged: { kind: 'flame', dmg: 4, rate: 0.06, range: 9, burst: 20, pause: 1.5, speed: 14 }, keep: [3, 7], melee: { dmg: 14, range: 2.2, rate: 1.1 }, score: 22, voice: 'grunt' },
    nob: { name: 'Nob', fac: 'green', build: 'nob', hp: 450, speed: 5.8, r: 0.75, scale: 1.3, melee: { dmg: 34, range: 2.8, rate: 1.3 }, charge: true, armor: 0.15, score: 60, elite: true, voice: 'grunt' },
    deffdread: { name: 'Junk Dreadnought', fac: 'green', build: 'walkerOrk', hp: 1300, speed: 3.6, r: 1.3, scale: 1.2, melee: { dmg: 45, range: 3.4, rate: 1.6 }, ranged: { kind: 'slug', dmg: 6, rate: 0.08, range: 40, burst: 14, pause: 2.4, spread: 0.07 }, keep: [3, 18], armor: 0.3, score: 160, elite: true, voice: 'grunt', metal: true },
    warlord: { name: 'WARLORD GRUSKAR', fac: 'green', build: 'warlord', hp: 6000, speed: 5, r: 1.3, scale: 1.55, melee: { dmg: 45, range: 3.8, rate: 1.5 }, ranged: { kind: 'slug', dmg: 7, rate: 0.08, range: 45, burst: 16, pause: 2.5, spread: 0.06 }, keep: [5, 20], charge: true, boss: { slam: true, summon: ['brute', 'brute', 'shoota', 'gretchin', 'gretchin'] }, score: 1000, voice: 'roar' },
    // --- Undying Machines
    scarab: { name: 'Scarab', fac: 'machine', build: 'scarab', hp: 14, speed: 7.5, r: 0.3, fly: 0.35, kamikaze: 14, score: 3, voice: 'hum' },
    husk: { name: 'Undying Husk', fac: 'machine', build: 'husk', hp: 170, armor: 0.3, speed: 3.2, r: 0.5, scale: 1.1, ranged: { kind: 'gauss', dmg: 16, rate: 2.6, range: 45, charge: 0.6 }, keep: [14, 30], melee: { dmg: 14, range: 2, rate: 1.2 }, reanimate: 0.55, score: 25, voice: 'hum' },
    stalker: { name: 'Flayed Stalker', fac: 'machine', build: 'husk', hp: 120, armor: 0.2, speed: 8, r: 0.5, scale: 1.0, melee: { dmg: 16, range: 2, rate: 0.8 }, leap: true, reanimate: 0.4, score: 20, voice: 'hum', tint: 0x5a1a10 },
    cwraith: { name: 'Canoptek Wraith', fac: 'machine', build: 'cwraith', hp: 380, armor: 0.25, speed: 7.5, r: 0.6, scale: 1.25, fly: 0.7, melee: { dmg: 26, range: 2.6, rate: 1.0 }, score: 55, elite: true, voice: 'hum' },
    overlord: { name: 'THE OVERLORD UNBOUND', fac: 'machine', build: 'overlord', hp: 5000, armor: 0.25, speed: 3.5, r: 1.0, scale: 1.7, ranged: { kind: 'gauss', dmg: 22, rate: 1.2, range: 60, charge: 0.5, volley: 3 }, keep: [12, 30], melee: { dmg: 35, range: 3.5, rate: 1.5 }, boss: { teleport: true, summon: ['husk', 'husk', 'stalker', 'scarab', 'scarab', 'scarab'], raise: true, hover: 0.6 }, score: 1000, voice: 'hum' },
    // --- Traitors & Daemons
    cultist: { name: 'Traitor Cultist', fac: 'chaos', build: 'cultist', hp: 45, speed: 5, r: 0.4, ranged: { kind: 'las', dmg: 4, rate: 0.11, range: 40, burst: 5, pause: 1.6, spread: 0.08 }, keep: [10, 26], melee: { dmg: 6, range: 1.8, rate: 0.9 }, score: 8, voice: 'cultist' },
    fiend: { name: 'Bloodfiend', fac: 'chaos', build: 'bloodfiend', hp: 130, speed: 9.5, r: 0.5, scale: 1.1, melee: { dmg: 17, range: 2.4, rate: 0.75 }, leap: true, score: 25, voice: 'screech' },
    daemonette: { name: 'Daemonette', fac: 'chaos', build: 'daemonette', hp: 75, speed: 10.5, r: 0.45, melee: { dmg: 12, range: 2.0, rate: 0.5 }, leap: true, score: 15, voice: 'screech' },
    plaguebearer: { name: 'Plaguebearer', fac: 'chaos', build: 'plaguebearer', hp: 240, speed: 3.4, r: 0.55, melee: { dmg: 18, range: 2.3, rate: 1.4 }, deathCloud: true, score: 25, voice: 'grunt' },
    horror: { name: 'Pink Horror', fac: 'chaos', build: 'horror', hp: 70, speed: 4.5, r: 0.5, ranged: { kind: 'warp', dmg: 9, rate: 1.6, range: 30, speed: 13, burst: 2 }, keep: [8, 20], score: 14, voice: 'cultist' },
    bloodlord: { name: 'KHARZUL THE BLOOD-CROWNED', fac: 'chaos', build: 'bloodlord', hp: 7000, speed: 6.5, r: 1.4, scale: 1.8, melee: { dmg: 50, range: 5, rate: 1.4 }, ranged: { kind: 'fire', dmg: 18, rate: 1.6, range: 45, speed: 22, burst: 4, fan: 0.3 }, keep: [3, 14], boss: { slam: true, slamFire: true, summon: ['fiend', 'fiend', 'cultist', 'daemonette'] }, score: 1500, voice: 'roar' },
    // --- Traitor Legions
    traitor: { name: 'Traitor Legionary', fac: 'traitor', build: 'traitorMarine', hp: 300, armor: 0.25, speed: 4.5, r: 0.6, scale: 1.1, ranged: { kind: 'bolt', dmg: 10, rate: 0.18, range: 40, burst: 3, pause: 1.6, speed: 70 }, keep: [8, 24], melee: { dmg: 22, range: 2.4, rate: 1.2 }, score: 40, voice: 'grunt' },
    possessed: { name: 'Possessed', fac: 'traitor', build: 'possessed', hp: 260, armor: 0.15, speed: 8, r: 0.6, scale: 1.12, melee: { dmg: 26, range: 2.6, rate: 0.9 }, leap: true, score: 40, voice: 'roar', elite: true },
    chaosLord: { name: 'VORAXIS THE UNBOUND', fac: 'traitor', build: 'chaosLord', hp: 6500, armor: 0.2, speed: 5, r: 1.1, scale: 1.45, melee: { dmg: 48, range: 3.6, rate: 1.3 }, ranged: { kind: 'warp', dmg: 14, rate: 1.4, range: 50, speed: 16, burst: 6, fan: 0.4 }, keep: [4, 16], boss: { teleport: true, slam: true, summon: ['traitor', 'possessed', 'cultist', 'cultist'], psychic: true }, score: 1500, voice: 'roar' },
    // --- The Ascendancy
    firewarrior: { name: 'Pulse Warrior', fac: 'tau', build: 'fireWarrior', hp: 75, speed: 4.8, r: 0.4, ranged: { kind: 'pulse', dmg: 7, rate: 0.35, range: 55, burst: 3, pause: 1.5, spread: 0.04 }, keep: [20, 38], score: 12, voice: 'cultist' },
    drone: { name: 'Gun Drone', fac: 'tau', build: 'drone', hp: 45, speed: 6, r: 0.45, fly: 2.4, ranged: { kind: 'pulse', dmg: 4, rate: 0.2, range: 40, burst: 4, pause: 1.4, spread: 0.06 }, keep: [8, 20], shield: 30, score: 10, voice: 'hum' },
    crisis: { name: 'Crisis Battlesuit', fac: 'tau', build: 'battlesuit', hp: 520, armor: 0.25, speed: 4.5, r: 0.8, scale: 1.15, ranged: { kind: 'missile', dmg: 18, rate: 2.2, range: 50, speed: 30, burst: 2 }, keep: [14, 30], jet: true, score: 70, elite: true, voice: 'hum', metal: true },
    colossus: { name: 'THE ETHERIUM COLOSSUS', fac: 'tau', build: 'colossus', hp: 6000, armor: 0.25, speed: 4, r: 1.5, scale: 1.7, ranged: { kind: 'ion', dmg: 40, rate: 3.2, range: 70, charge: 1.1 }, keep: [16, 34], jet: true, shield: 900, boss: { barrage: true, summon: ['drone', 'drone', 'firewarrior', 'firewarrior'] }, score: 1500, voice: 'hum', metal: true },
    // --- The Starborn
    guardian: { name: 'Starborn Guardian', fac: 'eldar', build: 'guardian', hp: 65, speed: 6, r: 0.4, ranged: { kind: 'shuriken', dmg: 3, rate: 0.07, range: 30, burst: 10, pause: 1.4, spread: 0.06 }, keep: [10, 22], score: 10, voice: 'cultist' },
    ranger: { name: 'Pathstalker', fac: 'eldar', build: 'ranger', hp: 60, speed: 5, r: 0.4, ranged: { kind: 'sniper', dmg: 34, rate: 4.0, range: 80, charge: 1.2 }, keep: [28, 50], cloak: true, score: 20, voice: 'cultist' },
    banshee: { name: 'Wailing Dancer', fac: 'eldar', build: 'banshee', hp: 95, speed: 11, r: 0.4, melee: { dmg: 16, range: 2.2, rate: 0.55 }, leap: true, score: 18, voice: 'screech' },
    wraithguard: { name: 'Wraith Construct', fac: 'eldar', build: 'wraithguard', hp: 750, armor: 0.35, speed: 3, r: 0.7, scale: 1.25, ranged: { kind: 'lance', dmg: 45, rate: 3.4, range: 40, charge: 0.9 }, keep: [8, 24], melee: { dmg: 30, range: 2.6, rate: 1.4 }, score: 90, elite: true, voice: 'hum' },
    avatar: { name: 'THE BURNING AVATAR', fac: 'eldar', build: 'avatar', hp: 6500, armor: 0.2, speed: 6, r: 1.3, scale: 1.75, melee: { dmg: 50, range: 4.5, rate: 1.3 }, ranged: { kind: 'fire', dmg: 20, rate: 1.8, range: 40, speed: 26, burst: 3, fan: 0.15 }, keep: [3, 14], aura: 18, boss: { slam: true, slamFire: true, summon: ['banshee', 'banshee', 'guardian', 'guardian'] }, score: 1500, voice: 'roar' },
    // --- The Brood Cult
    hybrid: { name: 'Cult Hybrid', fac: 'cult', build: 'hybrid', hp: 55, speed: 5.2, r: 0.4, ranged: { kind: 'autogun', dmg: 4, rate: 0.12, range: 36, burst: 5, pause: 1.6, spread: 0.08 }, keep: [9, 24], melee: { dmg: 7, range: 1.8, rate: 0.9 }, score: 9, voice: 'cultist' },
    purestrain: { name: 'Purestrain', fac: 'cult', build: 'purestrain', hp: 120, speed: 10, r: 0.5, melee: { dmg: 16, range: 2.2, rate: 0.6 }, leap: true, score: 22, voice: 'screech' },
    aberrant: { name: 'Aberrant', fac: 'cult', build: 'aberrant', hp: 420, armor: 0.1, speed: 5.5, r: 0.7, scale: 1.25, melee: { dmg: 32, range: 2.6, rate: 1.3 }, charge: true, score: 55, elite: true, voice: 'grunt' },
    patriarch: { name: 'THE PATRIARCH', fac: 'cult', build: 'patriarch', hp: 5600, speed: 7, r: 1.2, scale: 2.0, melee: { dmg: 42, range: 3.8, rate: 1.1 }, ranged: { kind: 'warp', dmg: 13, rate: 2.0, range: 40, speed: 14, burst: 5, fan: 0.4 }, keep: [3, 12], leap: true, boss: { summon: ['purestrain', 'purestrain', 'hybrid', 'hybrid', 'aberrant'], teleport: true }, score: 1500, voice: 'roar' },
    // --- Allies of the Imperium
    guardsman: { name: 'Guardsman', fac: 'imperium', build: 'guardsman', hp: 90, speed: 5.5, r: 0.4, ranged: { kind: 'las', dmg: 6, rate: 0.2, range: 45, burst: 4, pause: 1.2, spread: 0.05 }, keep: [10, 30], melee: { dmg: 8, range: 1.8, rate: 1 }, voice: 'cultist' },
    brother: { name: 'Battle-Brother', fac: 'imperium', build: 'brother', hp: 420, armor: 0.25, speed: 5.5, r: 0.6, scale: 1.1, ranged: { kind: 'heavy', dmg: 12, rate: 0.16, range: 45, burst: 4, pause: 1.0, spread: 0.03 }, keep: [6, 24], melee: { dmg: 30, range: 2.4, rate: 1.1 }, voice: 'grunt' },
    sister: { name: 'Battle Sister', fac: 'imperium', build: 'sister', hp: 320, armor: 0.2, speed: 5.5, r: 0.55, scale: 1.0, ranged: { kind: 'heavy', dmg: 10, rate: 0.16, range: 40, burst: 3, pause: 1.0, spread: 0.04 }, keep: [6, 22], melee: { dmg: 22, range: 2.2, rate: 1.1 }, voice: 'cultist' },
    sisterF: { name: 'Battle Sister', fac: 'imperium', build: 'sisterFlamer', hp: 320, armor: 0.2, speed: 6, r: 0.55, ranged: { kind: 'flame', dmg: 5, rate: 0.06, range: 9, burst: 20, pause: 1.2, speed: 15 }, keep: [3, 7], melee: { dmg: 22, range: 2.2, rate: 1.1 }, voice: 'cultist' },
    dread: { name: 'Venerable Dreadnought', fac: 'imperium', build: 'walker', hp: 2600, armor: 0.35, speed: 3.6, r: 1.3, scale: 1.25, ranged: { kind: 'heavy', dmg: 14, rate: 0.07, range: 50, burst: 18, pause: 1.6, spread: 0.04 }, keep: [4, 26], melee: { dmg: 90, range: 3.4, rate: 1.6 }, voice: 'hum' },
  };
  E.BOSSES = Object.keys(T).filter(k => T[k].boss);

  function buildRig(t) {
    const B = G.models.build;
    let rig;
    if (t.build === 'bruteR') rig = B.brute(true);
    else if (t.build === 'walkerOrk') rig = B.walker('ork');
    else if (t.build === 'walker') rig = B.walker('loyal');
    else if (t.build === 'patriarch') rig = B.purestrain(true);
    else rig = B[t.build]();
    if (t.tint) rig.root.traverse(o => { if (o.isMesh && o.material === m().necro) o.material = G.mat('necroTint' + t.tint, { color: t.tint, rough: 0.3, metal: 0.9 }); });
    return rig;
  }

  /* ---------- the unit ---------- */
  class Unit {
    constructor(type, pos, team) {
      const t = this.t = T[type];
      this.type = type;
      this.team = team || (t.fac === 'imperium' ? 'ally' : 'foe');
      const diff = G.settings.difficulty;
      const hpMul = this.team === 'ally' ? 1 : t.boss ? (0.7 + diff * 0.3) : (0.8 + diff * 0.2);
      this.maxHp = this.hp = t.hp * hpMul;
      this.shield = this.maxShield = t.shield ? t.shield * hpMul : 0; this.shieldT = 0;
      this.rig = buildRig(t);
      this.scale = t.scale || 1;
      this.rig.root.scale.setScalar(this.scale);
      if (G.settings.quality === 'low') this.rig.root.traverse(o => { if (o.isMesh) o.castShadow = false; });
      this.pos = this.rig.root.position.copy(pos);
      this.rig.baseY = 0;
      this.vel = new THREE.Vector3();
      this.yaw = Math.atan2(-pos.x, -pos.z);
      this.atkCD = G.rand(0.5, 1.5); this.fireCD = G.rand(1, 2.5); this.burstLeft = 0;
      this.losT = 0; this.los = false; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
      this.avoid = 0; this.avoidT = 0; this.leapCD = G.rand(1, 3); this.air = false; this.vy = 0;
      this.state = 'spawn'; this.spawnT = 0; this.stun = 0; this.burn = 0; this.chargeT = 0; this.chargeCD = G.rand(3, 6);
      this.voiceT = G.rand(2, 8); this.bossT = { summon: 12, slam: 8, tele: 10, barrage: 9, psy: 6 };
      this.hitBody = new THREE.Vector3().copy(pos); this.hitHead = new THREE.Vector3().copy(pos);
      this.rBody = 0.4; this.rHead = 0.15;
      this.dead = false; this.gibbed = false; this.reanimated = false; this.beamCharge = -1; this.targetT = 0; this.target = null;
      this.flyH = t.fly || 0; this.cloaked = false; this.revealT = 0;
      this.rig.root.rotation.y = this.yaw;
      if (t.cloak) { this.meshes = []; this.rig.root.traverse(o => { if (o.isMesh) this.meshes.push([o, o.material]); }); }
      if (this.maxShield) {
        this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x60b0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.bubble.scale.setScalar(this.rig.hit.body * 2.4);
        G.scene.add(this.bubble);
      }
      G.scene.add(this.rig.root);
      this.beginSpawn();
    }
    get isBoss() { return !!this.t.boss; }
    get isPlayer() { return false; }
    beginSpawn() {
      const f = this.spawnKind = this.t.boss && this.t.fac === 'tau' ? 'jet' : FAC[this.t.fac].spawn;
      const p = v1.copy(this.pos).setY(1.2);
      if (f === 'burrow') {
        this.rig.baseY = -2.4 * this.scale;
        G.fx.burst(G.fx.smoke, v1.copy(this.pos).setY(0.3), 18, { c0: 0x3a3020, sp: [2, 6], life: [0.6, 1.4], s0: [0.3, 0.6], s1: 1.4, a0: 0.8, grav: 8, drag: 1, up: 4 });
      } else if (f === 'phase' || f === 'warp' || f === 'webway') {
        this.rig.root.scale.setScalar(0.01);
        const c = f === 'phase' ? [0xbaffd0, 0x30ff70] : f === 'warp' ? [0xffa0d0, 0xff1040] : [0xe0f8ff, 0x40a0ff];
        G.fx.burst(G.fx.add, p, 34, { c0: c[0], c1: c[1], sp: [1, 6], life: [0.3, 0.9], s0: [0.12, 0.35], s1: 0.02, jit: 0.5 });
        G.fx.flash(p, c[1], 8, 10, 0.6);
        G.audio.play(f === 'phase' ? 'gaussCharge' : 'spawnWarp', this.pos, 0.6);
      } else if (f === 'jet') {
        this.rig.baseY = 25;
      } else if (f === 'pod') {
        this.rig.root.scale.setScalar(0.01);
      }
      if (this.isBoss) { G.audio.play('roar', null, 1); G.shake += 0.6; }
    }
    updateHit() {
      const j = this.rig.j, s = this.scale;
      this.rig.root.updateMatrixWorld(true);
      j.torso.getWorldPosition(this.hitBody);
      this.hitBody.y += this.rig.s.torso * 0.45 * s;
      j.head.getWorldPosition(this.hitHead);
      this.hitHead.y += 0.08 * s;
      this.rBody = this.rig.hit.body * s; this.rHead = this.rig.hit.head * s;
      if (this.bubble) {
        this.bubble.position.copy(this.hitBody);
        this.bubble.material.opacity = Math.max(0, this.bubble.material.opacity - 0.03);
      }
    }
    animate(dt) {
      if (this.rig.custom) this.rig.animate(this.rig, dt, this);
      else G.models.animate(this.rig, dt);
    }
    hostile(o) { return o.team !== this.team; }
    // target selection: player, allies, the defended objective, or foes
    pickTarget() {
      let best = null, bd = 1e9;
      const P = G.player;
      if (this.team === 'foe') {
        if (!P.dead) { best = P; bd = P.pos.distanceTo(this.pos) - 3; }
        for (const u of E.list) {
          if (u.team !== 'ally' || u.dead || u.removed || u.state === 'spawn') continue;
          const d = u.pos.distanceTo(this.pos);
          if (d < bd) { bd = d; best = u; }
        }
        const ob = G.game.objective;
        if (ob && !ob.dead) { const d = ob.pos.distanceTo(this.pos) - 8; if (d < bd) { bd = d; best = ob; } }
      } else {
        for (const u of E.list) {
          if (u.team !== 'foe' || u.dead || u.removed || u.state === 'spawn' || u.cloaked) continue;
          const d = u.pos.distanceTo(this.pos);
          if (d < bd && d < 50) { bd = d; best = u; }
        }
      }
      this.target = best;
    }
    aimPoint(t, out) {
      if (t.hitBody) return out.copy(t.hitBody);
      out.copy(t.pos); out.y += t.aimY || 1.3; return out;
    }
    hurt(dmg, from, kind) {
      const dir = from ? v4.subVectors(this.hitBody, from).normalize() : null;
      this.damage(dmg, dir, { enemyFire: true, explosive: kind === 'blast' || kind === 'missile' });
    }
    update(dt) {
      const a = this.rig.anim;
      if (this.dead) {
        a.dead += dt;
        if (this.flyH && this.pos.y > 0.1) { this.vy -= 20 * dt; this.pos.y = Math.max(0, this.pos.y + this.vy * dt); }
        this.animate(dt);
        if (this.reviveAt && a.dead > this.reviveAt) this.revive();
        if (a.dead > 7 && !this.reviveAt) this.remove();
        return;
      }
      if (this.state === 'spawn') return this.updateSpawn(dt);
      const t = this.t, sc = this.team === 'foe' ? G.enemyScale : 1;
      if (this.burn > 0) {
        this.burn -= dt;
        this.damage(22 * dt, null, { fire: true, silent: true });
        if (Math.random() < 0.6) G.fx.burst(G.fx.add, this.hitBody, 1, { c0: 0xffd070, c1: 0xff3000, sp: [0.5, 2], life: [0.3, 0.6], s0: [0.3, 0.6], s1: 0.1, up: 2, jit: 0.3 });
        if (this.dead) return;
      }
      if (this.maxShield) { this.shieldT -= dt; if (this.shieldT <= 0) this.shield = Math.min(this.maxShield, this.shield + this.maxShield * 0.15 * dt); }
      this.targetT -= dt;
      if (this.targetT <= 0 || !this.target || this.target.dead) { this.targetT = 0.6 + Math.random() * 0.4; this.pickTarget(); }
      const P = G.player;
      let tgt = this.target;
      let following = false;
      if (!tgt) { tgt = P; following = this.team === 'ally'; }
      const toP = v1.subVectors(tgt.pos, this.pos); toP.y = 0;
      const dist = toP.length();
      const dir = toP.divideScalar(dist || 1);
      this.losT -= dt;
      if (this.losT <= 0) {
        this.losT = 0.25 + Math.random() * 0.15;
        v2.copy(this.hitHead); this.aimPoint(tgt, v3);
        this.los = G.world.los(v2, v3);
      }
      this.atkCD -= dt * sc; this.fireCD -= dt * sc; this.leapCD -= dt; this.chargeCD -= dt; this.voiceT -= dt; this.revealT -= dt;
      if (this.voiceT <= 0) { this.voiceT = G.rand(4, 10); if (this.team === 'foe') G.audio.play(t.voice, this.pos, 0.5); }
      if (this.stun > 0) this.stun -= dt;
      // cloaking
      if (t.cloak) {
        const want = this.revealT <= 0 && this.rig.anim.atk < 0 && this.beamCharge < 0 && (dist > 6 || !this.los);
        if (want !== this.cloaked) { this.cloaked = want; for (const [o, mt] of this.meshes) o.material = want ? m().cloak : mt; }
      }

      let speed = t.speed * (this.isBoss || this.team === 'ally' ? 1 : (0.9 + G.settings.difficulty * 0.1));
      let want = v2.set(0, 0, 0);
      const face = dir;
      const ranged = t.ranged;
      let aiming = false;
      this.navving = false;
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 5) {
        if (!this.isBoss && this.team === 'foe' && !this.los && this.lastPos && this.lastPos.distanceTo(this.pos) < 1.2) {
          const far = G.worlds.spawns.filter(s => s.distanceTo(P.pos) > 25);
          if (far.length) { this.pos.copy(G.pick(far)); this.vel.set(0, 0, 0); }
        }
        this.stuckT = 0; this.lastPos = (this.lastPos || new THREE.Vector3()).copy(this.pos);
      }
      if (following) {
        // allies with nothing to shoot stay near the player
        if (dist > 7 && E.navDir(this.pos, want)) this.navving = true;
        else if (dist > 5) want.copy(dir);
      } else if (this.air) {
      } else if (this.stun > 0) {
        speed = 0;
      } else if (ranged && t.keep && !this.hunt && (dist > t.keep[0] || !t.melee)) {
        if (!this.los || dist > t.keep[1]) { if (tgt === P && E.navDir(this.pos, want)) this.navving = true; else want.copy(dir); }
        else if (dist < t.keep[0]) want.copy(dir).multiplyScalar(-1);
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = G.rand(1.2, 3); this.strafe *= -1; }
          want.set(-dir.z * this.strafe, 0, dir.x * this.strafe).multiplyScalar(0.6);
          speed *= 0.6;
        }
        aiming = this.los && dist < ranged.range;
      } else {
        if ((!this.los || dist > 6) && tgt === P && E.navDir(this.pos, want)) this.navving = true; else want.copy(dir);
        if (t.charge && dist < 16 && dist > 4 && this.chargeCD <= 0 && this.los) { this.chargeT = 1.4; this.chargeCD = G.rand(5, 8); G.audio.play(t.voice, this.pos, 1); }
        if (this.chargeT > 0) { this.chargeT -= dt; speed *= 1.7; }
        if (dist < (t.melee ? t.melee.range * 0.7 : 1)) want.set(0, 0, 0);
        if (ranged && this.los && dist < ranged.range) aiming = dist > 5;
      }
      // allies keep out of the player's line of fire a little
      if (this.team === 'ally' && !following && dist < 4) want.multiplyScalar(0.3);
      // leap / jet hop
      if (!following && t.leap && !this.air && this.leapCD <= 0 && dist < 9 && dist > 3.5 && this.los && this.stun <= 0) {
        this.air = true; this.leapCD = G.rand(2.5, 4.5);
        this.vel.copy(dir).multiplyScalar(dist * 1.6 + 2); this.vy = 6.5;
        G.audio.play(t.voice, this.pos, 0.8);
        this.rig.anim.atk = 0; this.rig.anim.atkType = 0;
      }
      if (t.jet && !this.air && this.leapCD <= 0 && Math.random() < dt * 0.4) {
        this.air = true; this.jetting = true; this.leapCD = G.rand(4, 7);
        const side = Math.random() < 0.5 ? 1 : -1;
        this.vel.set(-dir.z * side, 0, dir.x * side).multiplyScalar(G.rand(6, 10)); this.vy = 9;
        G.audio.play('missile', this.pos, 0.4);
      }
      if (this.isBoss) this.bossLogic(dt, dist, dir, tgt);

      // obstacle avoidance when steering straight
      if (!this.air && !this.navving && want.lengthSq() > 0.01 && !this.flyH) {
        this.avoidT -= dt;
        if (this.avoidT <= 0) {
          this.avoidT = 0.3;
          v3.copy(this.pos); v3.y = 0.8;
          const look = 2.2 + t.r;
          if (G.world.ray(v3, want, look)) {
            let best = 0;
            for (const ang of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
              const c = Math.cos(ang), s = Math.sin(ang);
              v4.set(want.x * c - want.z * s, 0, want.x * s + want.z * c);
              if (!G.world.ray(v3, v4, look)) { best = ang; break; }
            }
            this.avoid = best || (Math.random() < 0.5 ? 2.4 : -2.4);
            this.avoidT = 0.6;
          } else this.avoid = 0;
        }
        if (this.avoid) { const c = Math.cos(this.avoid), s = Math.sin(this.avoid); want.set(want.x * c - want.z * s, 0, want.x * s + want.z * c); }
      }
      // integrate
      if (this.air) {
        this.vy -= (this.jetting ? 9 : 20) * dt * sc;
        this.pos.addScaledVector(this.vel, dt * sc);
        this.pos.y += this.vy * dt * sc;
        this.rig.hovering = this.jetting;
        if (this.jetting && Math.random() < 0.5) { G.fx.burst(G.fx.add, v3.copy(this.pos).setY(this.pos.y + 0.8), 2, { c0: 0xffffff, c1: 0x60a0ff, sp: [1, 3], dir: v4.set(0, -1, 0), cone: 0.3, life: [0.1, 0.3], s0: [0.15, 0.3], s1: 0.02 }); }
        const gy = G.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5) + this.flyH;
        if (this.pos.y <= gy && this.vy < 0) {
          this.pos.y = gy; this.air = false; this.jetting = false; this.rig.hovering = false; this.vel.multiplyScalar(0.2);
          if (t.melee && dist < (t.melee.range + 1.2) && !following) this.meleeHit(tgt, t.melee.dmg * 1.2);
          if (this.isBoss && t.boss.slam) this.slamFx();
        }
      } else {
        const tv = want.multiplyScalar(speed);
        this.vel.x = G.damp(this.vel.x, tv.x, 8, dt); this.vel.z = G.damp(this.vel.z, tv.z, 8, dt);
        this.pos.x += this.vel.x * dt * sc; this.pos.z += this.vel.z * dt * sc;
        let hover = t.boss && t.boss.hover ? t.boss.hover + Math.sin(a.idle * 1.5) * 0.15 : 0;
        if (this.flyH) hover = this.flyH + Math.sin(a.idle * 2 + this.pos.x) * 0.25;
        const gy = G.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5 - hover);
        this.pos.y = this.flyH ? G.damp(this.pos.y, gy + hover, 4, dt) : gy + hover;
      }
      G.world.collide(this.pos, t.r * this.scale, 2 * this.scale, 0.5);
      for (const o of E.list) {
        if (o === this || o.dead) continue;
        const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
        const rr = (t.r * this.scale + o.t.r * o.scale) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; this.pos.x += dx / d * push; this.pos.z += dz / d * push; }
      }
      {
        const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, rr = t.r * this.scale + 0.5;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); this.pos.x += dx / d * (rr - d); this.pos.z += dz / d * (rr - d); }
      }
      const H = G.worlds.HALF - 1;
      this.pos.x = G.clamp(this.pos.x, -H, H); this.pos.z = G.clamp(this.pos.z, -H, H);
      // facing
      const hs = Math.hypot(this.vel.x, this.vel.z);
      let fyaw = Math.atan2(face.x, face.z);
      if ((!aiming || following) && hs > 1 && (dist > 4 || following) && !this.isBoss) fyaw = Math.atan2(this.vel.x, this.vel.z);
      let dy = fyaw - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * (this.isBoss ? 4 : 8));
      this.rig.root.rotation.y = this.yaw;
      // animation
      a.move = this.air ? 0.2 : hs / (t.speed * 0.8);
      const stride = (this.rig.s.thigh + this.rig.s.shin) * this.scale * 1.3;
      a.phase += dt * sc * hs / stride * Math.PI;
      a.aim = G.damp(a.aim, (aiming && !following) || this.beamCharge >= 0 ? 1 : 0, 8, dt);
      a.lean = this.chargeT > 0 ? 0.35 : 0;
      if (a.atk >= 0) { a.atk += dt * sc / (t.melee ? t.melee.rate * 0.8 : 0.6); if (a.atk >= 1) a.atk = -1; }
      if (!following) {
        if (t.kamikaze && dist < 1.6) { this.explodeSelf(); return; }
        if (t.melee && !this.air && this.stun <= 0 && dist < t.melee.range + (tgt.t ? tgt.t.r * tgt.scale : 0) && this.atkCD <= 0) {
          this.atkCD = t.melee.rate; a.atk = 0; a.atkType = Math.random() < 0.5 ? 0 : 1; this.pendingHit = 0.45 * t.melee.rate * 0.8; this.pendingTgt = tgt;
          G.audio.play('swing', this.pos, 0.6); this.revealT = 1.5;
        }
        if (ranged && this.stun <= 0) this.rangedLogic(dt, dist, aiming, tgt);
      }
      if (this.pendingHit != null) {
        this.pendingHit -= dt * sc;
        if (this.pendingHit <= 0) {
          this.pendingHit = null;
          const pt = this.pendingTgt;
          if (pt && !pt.dead && pt.pos.distanceTo(this.pos) < t.melee.range + 0.6 + (pt.t ? pt.t.r * pt.scale : 0)) this.meleeHit(pt, t.melee.dmg);
        }
      }
      if (t.aura) for (const h of E.hostilesOf(this.team)) { if (h.pos.distanceTo(this.pos) < 4 * this.scale) h.hurt(t.aura * dt * E.dmgMul(), null, 'fire'); }
      this.animate(dt * sc);
      this.updateHit();
    }
    updateSpawn(dt) {
      const a = this.rig.anim;
      this.spawnT += dt;
      const dur = this.spawnKind === 'jet' ? 2.0 : this.isBoss ? 1.6 : 0.9;
      const k = Math.min(1, this.spawnT / dur);
      if (this.spawnKind === 'burrow') this.rig.baseY = -2.4 * this.scale * (1 - G.smooth(k));
      else if (this.spawnKind === 'jet') {
        this.rig.baseY = 25 * (1 - G.smooth(k)); this.rig.hovering = true;
        if (Math.random() < 0.7) G.fx.burst(G.fx.add, v1.copy(this.pos).setY(this.rig.baseY + 0.8), 2, { c0: 0xffffff, c1: 0x60a0ff, sp: [2, 5], dir: v2.set(0, -1, 0), cone: 0.3, life: [0.1, 0.3], s0: [0.2, 0.4], s1: 0.02 });
      }
      else this.rig.root.scale.setScalar(this.scale * Math.max(0.01, G.smooth(k)));
      this.pos.y = this.rig.baseY + this.flyH;
      a.move = 0;
      this.animate(dt);
      this.updateHit();
      if (k >= 1) { this.state = 'fight'; this.rig.baseY = 0; this.rig.hovering = false; this.pos.y = G.world.groundAt(this.pos.x, this.pos.z, 30) + this.flyH; this.rig.root.scale.setScalar(this.scale); }
    }
    meleeHit(tgt, dmg) {
      if (!tgt || tgt.dead) return;
      tgt.hurt(dmg * (this.team === 'foe' ? E.dmgMul() : 1.5), this.pos, 'melee');
    }
    muzzlePos(out) {
      if (this.rig.muzzle) this.rig.muzzle.getWorldPosition(out); else out.copy(this.hitBody);
      return out;
    }
    rangedLogic(dt, dist, aiming, tgt) {
      const r = this.t.ranged, k = K[r.kind];
      if (k.beam) {
        if (this.beamCharge >= 0) {
          this.beamCharge += dt * (this.team === 'foe' ? G.enemyScale : 1);
          this.muzzlePos(v2);
          if (!tgt.dead) this.beamAim.lerp(this.aimPoint(tgt, v3), Math.min(1, dt * 2.5));
          G.fx.tracer(v2, v3.copy(v2).add(v1.subVectors(this.beamAim, v2).normalize().multiplyScalar(60)), k.col, 0.006 + this.beamCharge * 0.01, 0.03);
          if (this.beamCharge >= r.charge) {
            this.beamCharge = -1;
            for (let i = 0; i < (r.volley || 1); i++) {
              const d = v1.subVectors(this.beamAim, v2).normalize();
              if (i) { d.x += G.rand(-0.04, 0.04); d.y += G.rand(-0.02, 0.02); d.z += G.rand(-0.04, 0.04); d.normalize(); }
              E.unitHitscan(v2, d, r.dmg, r.kind, this.team);
            }
            G.audio.play(k.snd, this.pos, 0.9);
            G.fx.flash(v2, k.col, 5, 6, 0.2);
          }
          return;
        }
        if (aiming && this.fireCD <= 0) {
          this.fireCD = r.rate / (0.8 + G.settings.difficulty * 0.2);
          this.beamCharge = 0; this.beamAim = this.aimPoint(tgt, new THREE.Vector3());
          G.audio.play('gaussCharge', this.pos, 0.5); this.revealT = r.charge + 1;
        }
        return;
      }
      if (this.burstLeft > 0) {
        this.burstT -= dt * (this.team === 'foe' ? G.enemyScale : 1);
        if (this.burstT <= 0) {
          this.burstT = k.hit ? r.rate : r.kind === 'flame' ? r.rate : 0.12;
          this.burstLeft--;
          if (!tgt.dead) this.fireOne(dist, tgt);
        }
        return;
      }
      if (aiming && this.fireCD <= 0) {
        this.fireCD = (r.pause || r.rate) / (this.team === 'ally' ? 1 : (0.75 + G.settings.difficulty * 0.25));
        this.burstLeft = r.burst || 1; this.burstT = 0; this.revealT = 2;
      }
    }
    fireOne(dist, tgt) {
      const r = this.t.ranged, k = K[r.kind];
      const mz = this.muzzlePos(v2);
      const aim = this.aimPoint(tgt, v3);
      if (r.speed && tgt.vel) aim.addScaledVector(tgt.vel, dist / r.speed * 0.5);
      const d = v1.subVectors(aim, mz).normalize();
      const miss = (r.spread || 0.02) * (this.team === 'ally' ? 1 : (1.6 - G.settings.difficulty * 0.3));
      if (k.hit) {
        d.x += G.rand(-miss, miss); d.y += G.rand(-miss, miss) * 0.6; d.z += G.rand(-miss, miss); d.normalize();
        E.unitHitscan(mz, d, r.dmg, r.kind, this.team);
        G.audio.play(k.snd, this.pos, 0.5);
        G.fx.muzzle(mz, d, k.col, 0.6);
      } else {
        const fan = r.fan || 0;
        const i = (r.burst || 1) - this.burstLeft - 1;
        if (fan) { const ang = (i / Math.max(1, (r.burst || 1) - 1) - 0.5) * fan * 2; const c = Math.cos(ang), s = Math.sin(ang); d.set(d.x * c - d.z * s, d.y, d.x * s + d.z * c); }
        if (r.kind === 'flame') { d.x += G.rand(-0.08, 0.08); d.y += G.rand(-0.03, 0.05); d.z += G.rand(-0.08, 0.08); d.normalize(); }
        else d.y += 0.03;
        G.shots.spawnUnit(k.proj, mz, d.multiplyScalar(r.speed || 20), r.dmg, this.team, r.kind === 'warp' ? tgt : null);
        if (r.kind !== 'flame' || Math.random() < 0.2) G.audio.play(k.snd, this.pos, 0.6);
      }
    }
    explodeSelf() {
      G.fx.explosion(this.hitBody, 0.8, 0x40ff80);
      G.audio.play('boltexp', this.pos, 0.8);
      for (const h of E.hostilesOf(this.team)) { const d = h.pos.distanceTo(this.pos); if (d < 3) h.hurt(this.t.kamikaze * (1 - d / 4) * E.dmgMul(), this.pos, 'blast'); }
      this.hp = 0; this.die(UP, 0, { explosive: true, self: true });
    }
    bossLogic(dt, dist, dir, tgt) {
      const b = this.t.boss, T2 = this.bossT, sc = G.enemyScale;
      for (const k in T2) T2[k] -= dt * sc;
      const enraged = this.hp < this.maxHp * 0.5;
      if (b.summon && T2.summon <= 0) {
        T2.summon = enraged ? 11 : 16;
        const n = enraged ? b.summon.length + 2 : b.summon.length;
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * 6.28;
          const p = new THREE.Vector3(this.pos.x + Math.cos(ang) * 6, 0, this.pos.z + Math.sin(ang) * 6);
          const H = G.worlds.HALF - 4; p.x = G.clamp(p.x, -H, H); p.z = G.clamp(p.z, -H, H);
          E.spawn(b.summon[i % b.summon.length], p);
        }
        G.game.banner(this.t.name.replace(/^THE /, '') + ' CALLS ITS KIN', 1.6);
      }
      if (b.raise) for (const o of E.list) if (o.dead && o.t.fac === 'machine' && !o.gibbed && !o.reviveAt && !o.isBoss && o.t.reanimate && Math.random() < dt * 0.2) o.reviveAt = o.rig.anim.dead + 0.5;
      if (b.slam && T2.slam <= 0 && !this.air && dist < 22 && dist > 5) {
        T2.slam = enraged ? 6 : 9;
        this.air = true; this.vel.copy(dir).multiplyScalar(dist * 1.2); this.vy = 9;
        this.rig.anim.atk = 0; this.rig.anim.atkType = 0;
        G.audio.play('roar', this.pos, 1);
      }
      if (b.teleport && T2.tele <= 0) {
        T2.tele = enraged ? 7 : 11;
        G.fx.burst(G.fx.add, this.hitBody, 40, { c0: 0xffffff, c1: FAC[this.t.fac].spawn === 'phase' ? 0x30ff70 : 0xff2060, sp: [2, 8], life: [0.3, 0.8], s0: [0.1, 0.3], s1: 0.02, jit: 0.8 });
        const ang = Math.random() * 6.28, P = tgt.pos;
        const H = G.worlds.HALF - 6;
        this.pos.set(G.clamp(P.x + Math.cos(ang) * 16, -H, H), 0, G.clamp(P.z + Math.sin(ang) * 16, -H, H));
        this.state = 'spawn'; this.spawnT = 0; this.spawnKind = FAC[this.t.fac].spawn === 'phase' ? 'phase' : 'warp';
        G.audio.play('spawnWarp', this.pos, 1);
      }
      if (b.barrage && T2.barrage <= 0) {
        T2.barrage = enraged ? 7 : 10;
        G.game.banner('MISSILE BARRAGE', 1.2, '#60c0ff');
        for (let i = 0; i < 12; i++) setTimeout(() => {
          if (this.dead || this.removed) return;
          const p = v1.copy(tgt.pos).add(v2.set(G.rand(-7, 7), 0, G.rand(-7, 7)));
          this.muzzlePos(v3); v3.y += 2;
          const vel = v4.subVectors(p, v3); vel.y += 12; vel.multiplyScalar(0.6);
          G.shots.spawnUnit('missile', v3, vel, 16, this.team, null, 6);
        }, i * 120);
      }
      if (b.psychic && T2.psy <= 0) {
        T2.psy = enraged ? 4 : 6;
        for (let i = 0; i < 10; i++) {
          const ang = i / 10 * 6.28;
          G.shots.spawnUnit('warp', v1.copy(this.hitBody), v2.set(Math.cos(ang), 0.15, Math.sin(ang)).multiplyScalar(12), 10, this.team, tgt);
        }
        G.audio.play('warpbolt', this.pos, 1);
      }
    }
    slamFx() {
      const c = this.t.fac === 'chaos' || this.t.fac === 'eldar' ? 0xff2a10 : this.t.fac === 'machine' ? 0x40ff80 : 0xc0a060;
      G.fx.explosion(v1.copy(this.pos).setY(0.4), 2.2, c, 0x2a2420);
      G.audio.play('explosion', this.pos, 1);
      for (const h of E.hostilesOf(this.team)) { const d = h.pos.distanceTo(this.pos); if (d < 7) h.hurt((25 * (1 - d / 7) + 10) * E.dmgMul(), this.pos, 'blast'); }
      if (this.t.boss.slamFire) for (let i = 0; i < 12; i++) {
        const ang = i / 12 * 6.28;
        G.shots.spawnUnit('fire', v1.copy(this.pos).setY(0.6), v2.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(14), 12, this.team);
      }
    }
    damage(amount, dir, o) {
      if (this.dead || (this.state === 'spawn' && this.spawnT < 0.3)) return false;
      o = o || {};
      let dmg = amount;
      if (o.part === 'head') dmg *= this.isBoss ? 1.5 : 2.2;
      if (o.part === 'legs') dmg *= 0.75;
      if (this.t.armor && !o.melta) dmg *= 1 - this.t.armor;
      if (G.player.furyT > 0 && !o.enemyFire && this.team === 'foe') dmg *= 1.5;
      if (o.mult) dmg *= o.mult;
      if (this.team === 'ally' && o.enemyFire) dmg *= 0.6;
      this.revealT = 2;
      if (this.shield > 0) {
        const absorbed = Math.min(this.shield, dmg);
        this.shield -= absorbed; dmg -= absorbed; this.shieldT = 4;
        if (this.bubble) this.bubble.material.opacity = 0.35;
        if (dir && absorbed > 0) G.fx.sparks(this.hitBody, v1.copy(dir).negate(), 0x60b0ff, 4);
      }
      this.hp -= dmg;
      const a = this.rig.anim;
      if (dir && !o.silent && dmg > 0) {
        const pt = o.point || this.hitBody;
        G.fx.blood(pt, dir, FAC[this.t.fac].blood, o.part === 'head' ? 14 : 8);
        if (FAC[this.t.fac].metal || this.t.metal) G.fx.sparks(pt, v1.copy(dir).negate(), 0xffd080, 6);
        a.flinchV += G.clamp(dmg / this.maxHp * (this.isBoss ? 6 : 20), 0.5, 4) * (o.part === 'head' ? 1.5 : 1);
        if (!this.isBoss && dmg > this.maxHp * 0.35) this.stun = 0.35;
        if (Math.random() < 0.3) G.fx.decal(this.pos, FAC[this.t.fac].blood, G.rand(0.6, 1.2), 0.8);
      }
      if (o.fire && !this.t.boss) this.burn = Math.max(this.burn, o.fire === true ? 0 : o.fire);
      if (o.stun) this.stun = Math.max(this.stun, o.stun);
      if (this.hp <= 0) { this.die(dir, -this.hp, o); return true; }
      return false;
    }
    die(dir, overkill, o) {
      this.dead = true; this.hp = 0;
      const a = this.rig.anim;
      a.dead = 0; a.atk = -1; this.pendingHit = null; this.beamCharge = -1; this.air = false; this.vy = 0;
      if (this.cloaked) { this.cloaked = false; for (const [ob, mt] of this.meshes) ob.material = mt; }
      if (this.bubble) { this.bubble.parent && this.bubble.parent.remove(this.bubble); }
      if (dir) {
        const fwd = v1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        a.deathDir = fwd.dot(dir) < 0 ? 1 : -1;
      }
      const explode = !this.isBoss && !this.rig.custom && ((o.explosive && overkill > 15) || overkill > this.maxHp * 0.9 || (o.melee && Math.random() < 0.35) || o.melta);
      if (explode || o.self) this.gib(dir || UP);
      if (this.isBoss) {
        for (let i = 0; i < 6; i++) setTimeout(() => { G.fx.explosion(v1.copy(this.hitBody).add(v2.set(G.rand(-1.5, 1.5), G.rand(-1, 1), G.rand(-1.5, 1.5))), 1.5, 0xff8030); G.audio.play('explosion', this.pos, 1); }, i * 250);
      }
      if (this.t.deathCloud) E.hazards.push({ pos: this.pos.clone(), r: 3.5, dps: 12, t: 6, team: this.team, col: 0x7a9a20 });
      if (!this.gibbed && this.t.reanimate && !this.reanimated && Math.random() < this.t.reanimate) this.reviveAt = G.rand(3, 5);
      if (this.team === 'foe') G.game.onKill(this, o); else G.game.onAllyDeath(this);
    }
    gib(dir) {
      this.gibbed = true; this.reviveAt = null;
      const mats = FAC[this.t.fac].gib();
      const n = G.settings.quality === 'high' ? 10 : 6;
      for (let i = 0; i < n; i++) {
        G.fx.gib(v1.copy(this.hitBody).add(v2.set(G.rand(-0.4, 0.4), G.rand(-0.5, 0.5), G.rand(-0.4, 0.4))), mats[i % mats.length], G.rand(0.12, 0.28) * this.scale,
          v3.copy(dir).multiplyScalar(G.rand(3, 8)).add(v2.set(G.rand(-4, 4), G.rand(3, 9), G.rand(-4, 4))));
      }
      G.fx.blood(this.hitBody, UP, FAC[this.t.fac].blood, 40);
      G.fx.decal(this.pos, FAC[this.t.fac].blood, 2.5, 0.85);
      G.audio.play('hit', this.pos, 1);
      this.remove();
    }
    revive() {
      this.dead = false; this.reviveAt = null; this.reanimated = true;
      this.hp = this.maxHp * 0.5;
      this.rig.anim.dead = -1;
      this.rig.root.rotation.x = 0; this.rig.root.position.y = 0;
      this.state = 'spawn'; this.spawnT = 0.3; this.spawnKind = 'phase';
      G.fx.burst(G.fx.add, this.hitBody, 24, { c0: 0xbaffd0, c1: 0x30ff70, sp: [1, 4], life: [0.4, 0.9], s0: [0.1, 0.25], s1: 0.02, jit: 0.5, up: 2 });
      G.audio.play('hum', this.pos, 1);
      G.game.onRevive(this);
    }
    remove() {
      this.removed = true;
      this.rig.root.parent && this.rig.root.parent.remove(this.rig.root);
      if (this.bubble && this.bubble.parent) this.bubble.parent.remove(this.bubble);
    }
  }
  E.Unit = E.Enemy = Unit;

  /* ---------- flow-field navigation (BFS from the player over a 1 m grid) ---------- */
  const NAV = E.nav = { n: 0, H: 0, blocked: null, dist: null, queue: null, t: 0 };
  E.buildNav = function () {
    const H = G.worlds.HALF, n = Math.ceil(H * 2);
    NAV.n = n; NAV.H = H;
    NAV.blocked = new Uint8Array(n * n); NAV.dist = new Int32Array(n * n).fill(-1); NAV.queue = new Int32Array(n * n);
    for (const b of G.world.boxes) {
      if (b.y1 <= 0.55 || b.y0 >= 1.8) continue;
      const x0 = Math.max(0, Math.floor(b.x0 - 0.45 + H)), x1 = Math.min(n - 1, Math.floor(b.x1 + 0.45 + H));
      const z0 = Math.max(0, Math.floor(b.z0 - 0.45 + H)), z1 = Math.min(n - 1, Math.floor(b.z1 + 0.45 + H));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) NAV.blocked[z * n + x] = 1;
    }
    NAV.t = 0;
  };
  const cellOf = (x, z) => { const n = NAV.n; const cx = G.clamp(Math.floor(x + NAV.H), 0, n - 1), cz = G.clamp(Math.floor(z + NAV.H), 0, n - 1); return cz * n + cx; };
  E.updateNav = function () {
    if (!NAV.blocked) return;
    const n = NAV.n, D = NAV.dist, B = NAV.blocked, Q = NAV.queue;
    D.fill(-1);
    const start = cellOf(G.player.pos.x, G.player.pos.z);
    let h = 0, t = 0;
    D[start] = 0; Q[t++] = start;
    while (h < t) {
      const c = Q[h++], cx = c % n, d = D[c] + 1;
      if (cx > 0 && D[c - 1] < 0 && !B[c - 1]) { D[c - 1] = d; Q[t++] = c - 1; }
      if (cx < n - 1 && D[c + 1] < 0 && !B[c + 1]) { D[c + 1] = d; Q[t++] = c + 1; }
      if (c >= n && D[c - n] < 0 && !B[c - n]) { D[c - n] = d; Q[t++] = c - n; }
      if (c < n * (n - 1) && D[c + n] < 0 && !B[c + n]) { D[c + n] = d; Q[t++] = c + n; }
    }
  };
  E.navDir = function (pos, out) {
    if (!NAV.blocked) return false;
    const n = NAV.n, D = NAV.dist, B = NAV.blocked;
    const c = cellOf(pos.x, pos.z), cx = c % n, cz = (c / n) | 0;
    let best = -1, bd = D[c] >= 0 ? D[c] : 1e9;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const i = z * n + x;
      if (D[i] < 0 || B[i]) continue;
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) { const mi = (cz + Math.round(dz / 2)) * n + cx + Math.round(dx / 2); if (B[mi] || D[mi] < 0) continue; }
      if (dx && dz && (B[cz * n + x] || B[z * n + cx])) continue;
      const score = D[i] + Math.hypot(dx, dz) * 0.01;
      if (score < bd) { bd = score; best = i; }
    }
    if (best < 0) return false;
    out.set((best % n) - NAV.H + 0.5 - pos.x, 0, ((best / n) | 0) - NAV.H + 0.5 - pos.z);
    const l = out.length(); if (l < 1e-4) return false;
    out.divideScalar(l);
    return true;
  };

  /* ---------- registry ---------- */
  E.spawn = function (type, pos, team) {
    const u = new Unit(type, pos, team);
    E.list.push(u);
    return u;
  };
  E.dmgMul = () => 0.45 + G.settings.difficulty * 0.3;
  E.clear = function () { E.list.forEach(e => e.remove()); E.list = []; E.hazards = []; };
  E.alive = function () { let n = 0; for (const e of E.list) if (!e.dead && !e.removed && e.team === 'foe') n++; return n; };
  E.allies = function () { return E.list.filter(e => !e.dead && !e.removed && e.team === 'ally'); };
  // everything that a unit of `team` may hurt: units of the other team, plus the player and objective for foes
  E.hostilesOf = function (team) {
    const out = [];
    for (const u of E.list) if (!u.dead && !u.removed && u.team !== team && u.state !== 'spawn') out.push(u);
    if (team === 'foe') { if (!G.player.dead) out.push(G.player); const ob = G.game.objective; if (ob && !ob.dead) out.push(ob); }
    return out;
  };
  E.update = function (dt) {
    NAV.t -= dt;
    if (NAV.t <= 0) { NAV.t = 0.3; E.updateNav(); }
    for (const e of E.list) if (!e.removed) e.update(dt);
    E.list = E.list.filter(e => !e.removed);
    for (const h of E.hazards) {
      h.t -= dt;
      if (Math.random() < 0.5) G.fx.smoke.emit(h.pos.x + G.rand(-h.r, h.r), 0.3, h.pos.z + G.rand(-h.r, h.r), 0, 0.4, 0, 1.5, 0.6, 1.8, HC.set(h.col), HC2.set(h.col), 0.45, 0, 0, 0.3);
      for (const t of E.hostilesOf(h.team)) if (t.pos.distanceTo(h.pos) < h.r) t.hurt(h.dps * dt * E.dmgMul(), null, 'poison');
    }
    E.hazards = E.hazards.filter(h => h.t > 0);
  };
  const HC = new THREE.Color(), HC2 = new THREE.Color();

  const oc = new THREE.Vector3();
  function raySphere(o, d, c, r) {
    oc.subVectors(o, c);
    const b = oc.dot(d), cc = oc.lengthSq() - r * r;
    const disc = b * b - cc;
    if (disc < 0) return -1;
    const s = Math.sqrt(disc);
    let t = -b - s; if (t < 0) t = -b + s;
    return t;
  }
  // ray against unit hit spheres of `team` (default: foes)
  E.raycast = function (o, d, maxT, skip, team) {
    team = team || 'foe';
    let best = null;
    for (const e of E.list) {
      if (e.dead || e.removed || e.team !== team || (skip && skip.has(e))) continue;
      if (e.state === 'spawn' && e.spawnT < 0.3) continue;
      const th = raySphere(o, d, e.hitHead, e.rHead);
      if (th >= 0 && th < maxT && (!best || th < best.t)) best = { e, t: th, part: 'head' };
      const tb = raySphere(o, d, e.hitBody, e.rBody);
      if (tb >= 0 && tb < maxT && (!best || tb < best.t - 0.05)) best = { e, t: tb, part: 'body' };
      if (!e.flyH && !e.rig.custom) {
        v3.copy(e.pos); v3.y += e.rig.legH * e.scale * 0.5;
        const tl = raySphere(o, d, v3, e.rBody * 0.8);
        if (tl >= 0 && tl < maxT && (!best || tl < best.t - 0.05)) best = { e, t: tl, part: 'legs' };
      }
    }
    if (best) best.point = new THREE.Vector3().copy(o).addScaledVector(d, best.t);
    return best;
  };
  // the player and objective as ray targets for hostile fire
  E.rayPlayerish = function (o, d, maxT) {
    let best = null;
    const P = G.player;
    if (!P.dead) {
      const c = v4.copy(P.pos); c.y += 1.1;
      const t = oc.subVectors(c, o).dot(d);
      if (t > 0 && t < maxT) {
        const off = v3.copy(o).addScaledVector(d, t).sub(c);
        if (Math.abs(off.y) < 1.0 && Math.hypot(off.x, off.z) < 0.6) best = { tgt: P, t };
      }
    }
    const ob = G.game.objective;
    if (ob && !ob.dead) {
      const t = raySphere(o, d, v4.copy(ob.pos).setY(1.5), 1.6);
      if (t >= 0 && t < maxT && (!best || t < best.t)) best = { tgt: ob, t };
    }
    const u = E.raycast(o, d, best ? best.t : maxT, null, 'ally');
    if (u) best = { tgt: u.e, t: u.t };
    return best;
  };
  // hitscan fired by a unit of `team`
  E.unitHitscan = function (o, d, dmg, kind, team) {
    const k = K[kind];
    const w = G.world.ray(o, d, 120);
    let end = w ? w.t : 120, hit = null;
    if (team === 'foe') { const h = E.rayPlayerish(o, d, end); if (h) { end = h.t; hit = h.tgt; } }
    else { const h = E.raycast(o, d, end, null, 'foe'); if (h) { end = h.t; hit = h; } }
    const e = v3.copy(o).addScaledVector(d, end);
    G.fx.tracer(o, e, k.col, k.w, k.beam ? 0.18 : 0.07);
    if (hit) {
      if (team === 'foe') hit.hurt(dmg * E.dmgMul(), o, kind);
      else hit.e.damage(dmg, d, { part: hit.part, point: hit.point, explosive: k.boom });
    } else if (w) G.fx.sparks(e, w.normal, k.col, k.beam ? 14 : 5);
    if (k.beam) G.fx.burst(G.fx.add, e, 10, { c0: 0xffffff, c1: k.col, sp: [1, 4], life: [0.2, 0.5], s0: [0.1, 0.25], s1: 0.02 });
    if (k.splash) {
      G.fx.explosion(e, 0.7, k.col);
      if (team === 'foe') { for (const h of E.hostilesOf(team)) { const dd = h.pos.distanceTo(e); if (dd < k.splash && h !== hit) h.hurt(dmg * 0.5 * E.dmgMul(), e, 'blast'); } }
      else E.radius(e, k.splash, dmg * 0.5, {});
    }
  };
  // area damage to units of `team` (default foes)
  E.radius = function (center, r, dmg, o, team) {
    team = team || 'foe';
    for (const e of E.list) {
      if (e.dead || e.removed || e.team !== team) continue;
      const d = e.hitBody.distanceTo(center);
      if (d < r + e.rBody) {
        const k = 1 - Math.max(0, d - e.rBody) / r;
        e.damage(dmg * (0.35 + 0.65 * k), v1.subVectors(e.hitBody, center).normalize(), Object.assign({ explosive: true }, o));
      }
    }
  };
})();
