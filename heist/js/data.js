'use strict';
// Data: weapons, mods, melee, throwables, deployables, armour, masks,
// skills, perk decks, enemies, difficulties and the heist contracts.
// Every name here is original.
const H = window.H = {
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  money: n => '$' + Math.round(n).toLocaleString('en-US'),
};
H.seeded = function (seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};

/* ---------------- weapons ----------------
 row: name, cat, arch, dmg, rpm, mag, totalAmmo, reload(s), acc, stab, conceal, priceK, level, fire
 fire: a=auto s=semi b=burst p=pump k=bolt  */
const W = [
  // assault rifles
  ['Bastion M4', 'ar', 'ar', 44, 750, 30, 150, 2.6, 60, 64, 20, 22, 0, 'a'],
  ['Bastion Mk18', 'ar', 'ar', 44, 800, 30, 150, 2.4, 52, 56, 23, 30, 4, 'a'],
  ['Bastion SPR', 'ar', 'dmr', 99, 400, 20, 80, 2.8, 80, 52, 18, 58, 12, 's'],
  ['Volkov 47', 'ar', 'ar', 58, 600, 30, 120, 2.9, 48, 48, 18, 25, 2, 'a'],
  ['Volkov 74', 'ar', 'ar', 44, 650, 30, 150, 2.7, 56, 60, 20, 24, 3, 'a'],
  ['Volkov 12', 'ar', 'ar', 58, 700, 30, 120, 2.8, 60, 52, 17, 64, 21, 'a'],
  ['Volkov Krink', 'smg', 'smg', 44, 650, 30, 90, 2.4, 44, 44, 26, 30, 8, 'a'],
  ['Ferro Heavy', 'ar', 'ar', 99, 600, 20, 80, 2.9, 64, 40, 15, 72, 26, 'a'],
  ['Ferro Light', 'ar', 'ar', 58, 630, 30, 120, 2.6, 60, 56, 18, 46, 14, 'a'],
  ['Gallant K36', 'ar', 'ar', 44, 750, 30, 150, 2.6, 64, 60, 19, 40, 9, 'a'],
  ['Gallant G3', 'ar', 'dmr', 99, 550, 20, 80, 3.0, 68, 44, 14, 66, 23, 'a'],
  ['Gallant 417', 'ar', 'dmr', 99, 500, 20, 80, 2.8, 72, 48, 16, 80, 30, 's'],
  ['Clarion Bullpup', 'ar', 'bullpup', 44, 720, 30, 150, 2.6, 64, 64, 21, 38, 6, 'a'],
  ['Queen\'s Bullpup', 'ar', 'bullpup', 58, 650, 30, 120, 3.1, 72, 56, 18, 52, 17, 'a'],
  ['Tango 21', 'ar', 'bullpup', 58, 900, 30, 120, 2.6, 56, 52, 20, 58, 19, 'a'],
  ['Eagle Heavy', 'ar', 'dmr', 99, 600, 20, 80, 3.0, 72, 40, 15, 70, 27, 'a'],
  ['Lion\'s Roar', 'ar', 'ar', 58, 650, 30, 120, 2.9, 60, 52, 16, 48, 15, 'a'],
  ['Valkyrie AS', 'ar', 'ar', 44, 900, 20, 120, 2.6, 52, 64, 22, 60, 20, 'a'],
  ['Jager Commando', 'ar', 'ar', 58, 750, 30, 120, 2.9, 64, 56, 17, 56, 18, 'a'],
  ['Kestrel 805', 'ar', 'ar', 44, 750, 30, 150, 2.6, 60, 68, 20, 62, 22, 'a'],
  ['Union UAR', 'ar', 'bullpup', 44, 750, 30, 150, 2.8, 68, 60, 19, 34, 7, 'a'],
  ['Big Talker', 'ar', 'ar', 99, 750, 20, 80, 3.2, 52, 40, 12, 99, 40, 'a'],
  ['Gecko 7.62', 'ar', 'ar', 99, 700, 20, 80, 3.0, 56, 44, 14, 76, 29, 'a'],
  ['Bootleg AR', 'ar', 'ar', 58, 720, 30, 120, 2.6, 56, 56, 18, 44, 13, 'a'],
  ['Crusader M1', 'ar', 'dmr', 160, 300, 8, 48, 2.2, 84, 36, 14, 90, 33, 's'],
  ['Arbiter M14', 'ar', 'dmr', 160, 350, 10, 50, 2.8, 80, 32, 14, 84, 31, 's'],
  ['Sable Burst', 'ar', 'ar', 58, 900, 30, 120, 2.8, 64, 56, 18, 64, 24, 'b'],
  // shotguns
  ['Reinfeld 880', 'shotgun', 'pump', 155, 90, 6, 48, 0.5, 40, 48, 18, 25, 0, 'p'],
  ['Mosconi 12G', 'shotgun', 'double', 155, 400, 2, 42, 2.2, 40, 36, 20, 30, 3, 's'],
  ['Izhma 12G', 'shotgun', 'autosg', 42, 300, 8, 72, 3.2, 36, 40, 18, 40, 10, 'a'],
  ['Steakout 12G', 'shotgun', 'autosg', 42, 400, 8, 64, 2.8, 40, 44, 16, 52, 16, 'a'],
  ['M1014 Predator', 'shotgun', 'autosg', 42, 330, 7, 70, 0.4, 44, 40, 17, 48, 15, 's'],
  ['Raven', 'shotgun', 'pump', 155, 85, 7, 49, 0.45, 48, 44, 16, 46, 14, 'p'],
  ['Breaker 12G', 'shotgun', 'lever', 155, 140, 7, 49, 0.5, 52, 40, 16, 56, 18, 'p'],
  ['Joceline O/U', 'shotgun', 'double', 155, 400, 2, 40, 2.0, 44, 40, 20, 60, 20, 's'],
  ['Judge Pump', 'shotgun', 'pump', 155, 85, 6, 42, 0.5, 36, 36, 22, 44, 12, 'p'],
  ['Grimm 12G', 'shotgun', 'autosg', 42, 500, 8, 72, 2.4, 32, 44, 22, 62, 22, 'a'],
  ['Claire 12G', 'shotgun', 'pump', 155, 90, 6, 42, 0.5, 40, 40, 23, 50, 16, 'p'],
  ['Goliath 12G', 'shotgun', 'double', 155, 400, 2, 36, 2.0, 32, 32, 26, 34, 8, 's'],
  ['Locomotive 12G', 'shotgun', 'pump', 155, 90, 6, 48, 0.5, 36, 44, 23, 38, 11, 'p'],
  // LMGs
  ['Brenner 21', 'lmg', 'lmg', 58, 700, 100, 300, 5.5, 44, 40, 4, 80, 18, 'a'],
  ['KSP 58', 'lmg', 'lmg', 99, 600, 100, 200, 6.5, 40, 36, 2, 96, 28, 'a'],
  ['RPK', 'lmg', 'lmg', 58, 650, 75, 300, 5.0, 48, 40, 6, 72, 15, 'a'],
  ['KSP Para', 'lmg', 'lmg', 44, 750, 200, 400, 6.0, 36, 44, 4, 70, 12, 'a'],
  ['Buzzsaw 42', 'lmg', 'lmg', 99, 1200, 100, 200, 6.0, 28, 24, 1, 120, 38, 'a'],
  ['Kacy LMG', 'lmg', 'lmg', 58, 800, 150, 300, 6.2, 44, 44, 3, 88, 24, 'a'],
  // snipers
  ['Rattlesnake', 'sniper', 'sniper', 250, 100, 10, 40, 3.0, 92, 40, 10, 70, 10, 'k'],
  ['Thanatos .50', 'sniper', 'sniper', 2800, 60, 5, 20, 4.2, 96, 8, 1, 180, 45, 'k'],
  ['Repeater 1874', 'sniper', 'lever', 250, 120, 15, 45, 3.0, 84, 36, 16, 66, 14, 'k'],
  ['Lebensauger .308', 'sniper', 'sniper', 250, 300, 10, 40, 3.0, 88, 40, 12, 90, 25, 's'],
  ['Grom', 'sniper', 'sniper', 250, 300, 10, 40, 3.2, 88, 36, 12, 84, 22, 's'],
  ['Platypus 70', 'sniper', 'sniper', 410, 60, 5, 30, 3.6, 96, 28, 10, 110, 34, 'k'],
  ['Desertfox', 'sniper', 'bullpup', 410, 60, 5, 30, 3.4, 92, 32, 14, 124, 36, 'k'],
  ['Nagant', 'sniper', 'sniper', 410, 60, 5, 30, 3.6, 92, 24, 14, 48, 6, 'k'],
  ['Contractor .308', 'sniper', 'sniper', 250, 300, 10, 40, 3.0, 88, 44, 12, 96, 28, 's'],
  ['Bernetti Rangehitter', 'sniper', 'sniper', 410, 60, 5, 30, 3.4, 96, 32, 12, 104, 32, 'k'],
  // SMGs (secondary)
  ['Compact-5', 'smg', 'smg', 44, 800, 30, 150, 2.4, 52, 64, 24, 20, 0, 'a'],
  ['Swedish K', 'smg', 'smg', 44, 600, 36, 144, 2.6, 56, 60, 22, 22, 2, 'a'],
  ['Mark 10', 'smg', 'smg', 44, 1100, 30, 150, 2.2, 40, 44, 26, 24, 3, 'a'],
  ['Para', 'smg', 'smg', 58, 900, 30, 120, 2.6, 48, 48, 23, 30, 6, 'a'],
  ['Blaster 9mm', 'smg', 'smg', 44, 1000, 32, 160, 2.2, 44, 48, 26, 26, 4, 'a'],
  ['Cobra', 'smg', 'smg', 44, 1100, 20, 140, 2.0, 40, 44, 28, 22, 5, 'a'],
  ['Kobus 90', 'smg', 'bullpupsmg', 44, 900, 50, 200, 3.0, 52, 60, 23, 48, 14, 'a'],
  ['SpecOps', 'smg', 'smg', 44, 750, 30, 150, 2.4, 60, 64, 23, 40, 11, 'a'],
  ['Heather', 'smg', 'smg', 58, 900, 30, 120, 2.6, 52, 56, 22, 54, 17, 'a'],
  ['Kross Vertex', 'smg', 'smg', 58, 1200, 25, 100, 2.4, 44, 72, 22, 66, 22, 'a'],
  ['Chicago Typewriter', 'smg', 'smg', 58, 800, 50, 150, 3.4, 44, 52, 16, 58, 19, 'a'],
  ['Jacket\'s Piece', 'smg', 'smg', 44, 1000, 20, 140, 2.0, 40, 44, 28, 30, 9, 'a'],
  ['Patchett L2A1', 'smg', 'smg', 44, 550, 34, 170, 2.5, 60, 60, 22, 26, 4, 'a'],
  ['Micro Uzi', 'smg', 'smg', 44, 1200, 32, 160, 2.2, 36, 40, 28, 28, 7, 'a'],
  ['Signature', 'smg', 'smg', 44, 900, 30, 150, 2.4, 56, 64, 22, 60, 20, 'a'],
  ['Tatonka', 'smg', 'smg', 58, 700, 64, 128, 3.2, 52, 56, 20, 50, 16, 'a'],
  ['Miyaka 10', 'smg', 'smg', 44, 950, 30, 150, 2.4, 48, 52, 24, 44, 13, 'a'],
  ['CMP', 'smg', 'smg', 44, 1000, 30, 150, 2.2, 48, 52, 25, 36, 10, 'a'],
  ['Jackal', 'smg', 'smg', 58, 750, 25, 125, 2.6, 56, 60, 22, 52, 18, 'a'],
  ['Pistol Shotgun', 'shotgun', 'pump', 155, 90, 6, 30, 0.5, 32, 36, 25, 40, 12, 'p', 'secondary'],
  ['Street Sweeper', 'shotgun', 'autosg', 42, 300, 12, 48, 4.0, 30, 36, 22, 62, 20, 'a', 'secondary'],
  ['Brothers Grimm', 'shotgun', 'autosg', 42, 400, 8, 40, 2.6, 30, 40, 24, 58, 18, 'a', 'secondary'],
  // pistols
  ['Chimano 88', 'pistol', 'pistol', 35, 600, 17, 153, 1.6, 52, 72, 30, 5, 0, 's'],
  ['Crosskill .45', 'pistol', 'pistol', 65, 500, 10, 80, 1.7, 60, 56, 29, 9, 1, 's'],
  ['Bernetti 9', 'pistol', 'pistol', 35, 600, 15, 150, 1.6, 56, 68, 30, 8, 2, 's'],
  ['Bernetti Auto', 'pistol', 'pistol', 35, 1100, 15, 150, 1.6, 44, 52, 29, 18, 7, 'a'],
  ['Stryk 18c', 'pistol', 'pistol', 35, 1000, 17, 153, 1.6, 44, 56, 29, 22, 8, 'a'],
  ['Deagle Mk7', 'pistol', 'pistol', 120, 300, 10, 50, 2.0, 68, 32, 26, 34, 11, 's'],
  ['Bronco .44', 'pistol', 'revolver', 175, 300, 6, 42, 3.0, 72, 28, 26, 30, 9, 's'],
  ['Castigo .44', 'pistol', 'revolver', 175, 300, 6, 42, 3.0, 68, 24, 26, 46, 16, 's'],
  ['Matever .357', 'pistol', 'revolver', 175, 300, 6, 42, 3.0, 76, 32, 27, 52, 19, 's'],
  ['Peacemaker .45', 'pistol', 'revolver', 360, 150, 6, 36, 3.6, 84, 20, 26, 88, 30, 's'],
  ['Signature .40', 'pistol', 'pistol', 65, 500, 12, 84, 1.7, 60, 60, 29, 14, 5, 's'],
  ['Gruber Kurz', 'pistol', 'pistol', 35, 600, 8, 96, 1.6, 52, 64, 30, 12, 3, 's'],
  ['Interceptor 45', 'pistol', 'pistol', 65, 500, 12, 84, 1.7, 56, 56, 29, 16, 6, 's'],
  ['Contractor Pistol', 'pistol', 'pistol', 65, 500, 12, 84, 1.7, 60, 60, 29, 26, 10, 's'],
  ['LEO Pistol', 'pistol', 'pistol', 35, 600, 14, 140, 1.6, 56, 68, 30, 22, 9, 's'],
  ['Baby Deagle', 'pistol', 'pistol', 65, 500, 10, 80, 1.7, 64, 48, 28, 24, 10, 's'],
  ['Parabellum', 'pistol', 'pistol', 65, 500, 8, 64, 1.7, 68, 52, 29, 30, 12, 's'],
  ['Broomstick', 'pistol', 'pistol', 65, 500, 10, 80, 2.4, 64, 52, 26, 36, 14, 's'],
  ['White Streak', 'pistol', 'pistol', 65, 500, 12, 84, 1.7, 60, 56, 29, 28, 11, 's'],
  ['Chimano Custom', 'pistol', 'pistol', 35, 600, 13, 130, 1.6, 56, 68, 30, 20, 7, 's'],
  ['Holt 9mm', 'pistol', 'pistol', 35, 600, 15, 150, 1.6, 60, 68, 30, 32, 13, 's'],
  ['Igor Automatik', 'pistol', 'pistol', 35, 750, 20, 140, 1.8, 48, 56, 27, 34, 14, 'a'],
  // specials
  ['GL40', 'special', 'gl', 960, 30, 1, 9, 2.8, 52, 40, 12, 120, 20, 's', 'primary', 'gl'],
  ['Piglet', 'special', 'gl', 960, 90, 6, 18, 4.5, 48, 36, 8, 160, 34, 's', 'primary', 'gl'],
  ['Compact 40mm', 'special', 'gl', 960, 30, 1, 6, 2.6, 52, 40, 20, 100, 18, 's', 'secondary', 'gl'],
  ['HRL-7', 'special', 'rocket', 2000, 30, 1, 4, 4.2, 60, 40, 4, 200, 40, 's', 'secondary', 'rocket'],
  ['Commando 101', 'special', 'rocket', 2000, 30, 1, 3, 3.8, 60, 40, 4, 220, 50, 's', 'primary', 'rocket'],
  ['Flamethrower Mk.1', 'special', 'flame', 20, 1200, 300, 600, 7.0, 20, 60, 2, 140, 24, 'a', 'primary', 'flame'],
  ['Flamethrower Mk.2', 'special', 'flame', 20, 1200, 150, 300, 5.0, 20, 60, 10, 120, 22, 'a', 'secondary', 'flame'],
  ['Vulcan Minigun', 'special', 'minigun', 44, 3000, 750, 750, 9.0, 20, 52, 0, 300, 60, 'a', 'primary', 'minigun'],
  ['Microgun', 'special', 'minigun', 44, 2000, 300, 300, 7.0, 20, 52, 4, 260, 55, 'a', 'secondary', 'minigun'],
  ['Plainsrider Bow', 'special', 'bow', 300, 60, 1, 40, 0.8, 92, 80, 26, 40, 8, 's', 'primary', 'arrow'],
  ['English Longbow', 'special', 'bow', 600, 40, 1, 30, 0.9, 96, 80, 22, 70, 18, 's', 'primary', 'arrow'],
  ['Pistol Crossbow', 'special', 'crossbow', 330, 60, 1, 30, 1.4, 88, 80, 29, 36, 10, 's', 'secondary', 'bolt'],
  ['Heavy Crossbow', 'special', 'crossbow', 800, 40, 1, 24, 2.4, 92, 80, 18, 76, 24, 's', 'primary', 'bolt'],
  ['OVE9000 Saw', 'special', 'saw', 60, 600, 150, 300, 4.0, 100, 100, 4, 80, 10, 'a', 'primary', 'saw'],
  // expansion: 30 more
  ['Hornet 300', 'ar', 'ar', 58, 700, 30, 120, 2.7, 62, 58, 18, 54, 16, 'a'],
  ['Corvo Carbine', 'ar', 'ar', 44, 850, 30, 150, 2.4, 56, 60, 22, 36, 8, 'a'],
  ['Kovac Battle Rifle', 'ar', 'dmr', 99, 550, 25, 75, 3.0, 70, 46, 14, 74, 25, 'a'],
  ['Marlin Bullpup', 'ar', 'bullpup', 58, 800, 30, 120, 2.8, 62, 60, 19, 60, 21, 'a'],
  ['Spectre DMR', 'ar', 'dmr', 160, 320, 10, 50, 2.6, 86, 40, 15, 92, 34, 's'],
  ['Thunderclap', 'ar', 'ar', 99, 650, 20, 80, 3.1, 58, 42, 13, 82, 32, 'a'],
  ['Stinger PDW', 'smg', 'smg', 44, 950, 40, 160, 2.3, 50, 58, 25, 42, 12, 'a'],
  ['Riviera Machine Pistol', 'smg', 'smg', 35, 1300, 25, 150, 2.0, 36, 40, 29, 26, 6, 'a'],
  ['Wraith 45', 'smg', 'smg', 58, 650, 25, 125, 2.5, 60, 64, 23, 48, 15, 'a'],
  ['Saint SMG', 'smg', 'smg', 44, 900, 30, 150, 2.4, 54, 60, 24, 38, 9, 'a'],
  ['Hammerhead 12G', 'shotgun', 'autosg', 42, 450, 10, 80, 3.0, 36, 44, 18, 66, 23, 'a'],
  ['Coachgun', 'shotgun', 'double', 155, 400, 2, 40, 2.1, 42, 34, 22, 26, 4, 's'],
  ['Trench Pump', 'shotgun', 'pump', 155, 100, 6, 48, 0.5, 38, 42, 18, 34, 9, 'p'],
  ['Bulldog Drum', 'shotgun', 'autosg', 42, 350, 20, 80, 4.5, 30, 40, 12, 88, 30, 'a'],
  ['Sawn-Off', 'shotgun', 'double', 155, 400, 2, 30, 1.9, 24, 30, 27, 18, 2, 's', 'secondary'],
  ['Vigil LMG', 'lmg', 'lmg', 58, 720, 120, 360, 5.8, 46, 46, 3, 92, 26, 'a'],
  ['Hailstorm LMG', 'lmg', 'lmg', 44, 1000, 150, 450, 6.4, 34, 38, 2, 110, 36, 'a'],
  ['Longshot .338', 'sniper', 'sniper', 410, 70, 6, 30, 3.4, 94, 30, 9, 118, 38, 'k'],
  ['Ghillie .308', 'sniper', 'sniper', 250, 110, 10, 40, 3.0, 90, 44, 13, 78, 20, 'k'],
  ['Marauder 50', 'sniper', 'sniper', 600, 120, 8, 24, 4.0, 90, 20, 4, 150, 44, 's'],
  ['Viper .38', 'pistol', 'revolver', 120, 320, 6, 48, 2.6, 70, 40, 28, 22, 5, 's'],
  ['Kodiak .500', 'pistol', 'revolver', 360, 140, 5, 30, 3.4, 80, 16, 24, 76, 28, 's'],
  ['Falcon 10mm', 'pistol', 'pistol', 65, 520, 15, 90, 1.7, 60, 58, 28, 30, 11, 's'],
  ['Pocket .380', 'pistol', 'pistol', 35, 600, 7, 84, 1.5, 48, 72, 30, 6, 1, 's'],
  ['Hellcat Auto', 'pistol', 'pistol', 35, 1200, 20, 140, 1.8, 40, 50, 28, 32, 13, 'a'],
  ['Brass Duke .45', 'pistol', 'pistol', 65, 480, 8, 72, 1.8, 66, 54, 29, 38, 15, 's'],
  ['Tidewater Harpoon', 'special', 'crossbow', 900, 40, 1, 16, 2.6, 92, 70, 14, 96, 30, 's', 'primary', 'bolt'],
  ['Firecracker Launcher', 'special', 'gl', 960, 60, 4, 16, 4.0, 48, 38, 10, 140, 38, 's', 'primary', 'gl'],
  ['Compact Bow', 'special', 'bow', 220, 70, 1, 50, 0.7, 86, 80, 28, 30, 6, 's', 'secondary', 'arrow'],
  ['Nail Gun', 'special', 'smg', 26, 1400, 60, 300, 2.8, 30, 60, 26, 28, 7, 'a', 'secondary'],
];
H.CAT_NAMES = { ar: 'Assault Rifles', shotgun: 'Shotguns', lmg: 'Light Machine Guns', sniper: 'Sniper Rifles', smg: 'Submachine Guns', pistol: 'Pistols', special: 'Specials', akimbo: 'Akimbo' };
H.WEAPONS = [];
H.WMAP = {};
for (const r of W) {
  const [name, cat, arch, dmg, rpm, mag, total, reload, acc, stab, conceal, priceK, level, fire, slotOv, proj] = r;
  const slot = slotOv || ((cat === 'smg' || cat === 'pistol') ? 'secondary' : 'primary');
  const w = {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, cat, arch, dmg, rpm, mag, total, reload, acc, stab, conceal,
    price: priceK * 1000, level, fire, slot, proj: proj || null,
    pellets: (cat === 'shotgun') ? 10 : 1,
  };
  H.WEAPONS.push(w); H.WMAP[w.id] = w;
}
// Akimbo pairs from every pistol and SMG: double mag, worse accuracy, primary slot.
for (const base of H.WEAPONS.slice()) {
  if (base.cat !== 'pistol' && base.cat !== 'smg') continue;
  const w = Object.assign({}, base, {
    id: 'akimbo_' + base.id, name: 'Akimbo ' + base.name, cat: 'akimbo', akimbo: true, slot: 'primary',
    mag: base.mag * 2, total: Math.round(base.total * 1.4), reload: base.reload * 1.4, acc: Math.max(10, base.acc - 20),
    stab: Math.max(10, base.stab - 12), conceal: Math.max(0, base.conceal - 6), price: Math.round(base.price * 1.8), level: base.level + 6,
  });
  H.WEAPONS.push(w); H.WMAP[w.id] = w;
}

/* ---------------- weapon mods ----------------
 slot, name, visual key, stats delta, applies-to archetype filter (null = all firearms), priceK */
const GUNS = ['ar', 'dmr', 'bullpup', 'smg', 'bullpupsmg', 'lmg', 'sniper', 'pump', 'autosg', 'lever', 'double', 'pistol', 'revolver'];
const LONG = ['ar', 'dmr', 'bullpup', 'smg', 'bullpupsmg', 'lmg', 'sniper', 'pump', 'autosg', 'lever'];
const RIFLE = ['ar', 'dmr', 'bullpup', 'lmg', 'sniper'];
const SG = ['pump', 'autosg', 'lever', 'double'];
const M = [
  // sights
  ['sight', 'Iron Sights', 'irons', {}, GUNS, 0],
  ['sight', 'Compact Red Dot', 'reddot', { acc: 4, conceal: -1 }, GUNS, 4],
  ['sight', 'Holographic', 'holo', { acc: 6, conceal: -1 }, LONG, 6],
  ['sight', 'Military Red Dot', 'reddot2', { acc: 6, conceal: -2 }, LONG, 7],
  ['sight', 'Combat Scope 3x', 'acog', { acc: 10, conceal: -2, zoom: 1.6 }, LONG, 10],
  ['sight', 'Marksman 4x', 'scope', { acc: 12, conceal: -3, zoom: 2.2 }, RIFLE, 12],
  ['sight', 'Long Range 8x', 'scope_l', { acc: 16, conceal: -4, zoom: 3.6 }, ['sniper', 'dmr'], 16],
  ['sight', 'Reflex Plate', 'reflex', { acc: 4 }, GUNS, 5],
  ['sight', 'Thermal Sight', 'thermal', { acc: 8, conceal: -3, zoom: 1.8 }, RIFLE, 22],
  ['sight', 'Pistol Red Dot', 'pistoldot', { acc: 4 }, ['pistol', 'revolver'], 5],
  ['sight', 'Speculator', 'holo', { acc: 8, conceal: -2 }, LONG, 9],
  ['sight', 'Trigonom', 'reddot2', { acc: 7, conceal: -1 }, LONG, 8],
  // muzzles
  ['muzzle', 'Stock Muzzle', 'none', {}, GUNS, 0],
  ['muzzle', 'Low Profile Suppressor', 'sup_s', { acc: 4, dmg: -0.05, conceal: -1, silent: 1 }, GUNS, 8],
  ['muzzle', 'Medium Suppressor', 'sup_m', { acc: 8, stab: 4, dmg: -0.08, conceal: -2, silent: 1 }, GUNS, 10],
  ['muzzle', 'Monolith Suppressor', 'sup_l', { acc: 12, stab: 8, dmg: -0.12, conceal: -3, silent: 1 }, LONG, 14],
  ['muzzle', 'Shark Teeth Brake', 'brake', { stab: 8, acc: -4 }, GUNS, 6],
  ['muzzle', 'Competitor\'s Compensator', 'comp', { stab: 12, conceal: -1 }, GUNS, 9],
  ['muzzle', 'Funnel of Fun', 'flash', { acc: -2, stab: 6, dmg: 0.04 }, GUNS, 7],
  ['muzzle', 'Tactical Compensator', 'comp', { stab: 8, acc: 4, conceal: -1 }, GUNS, 8],
  ['muzzle', 'Ported Compensator', 'brake', { stab: 10, acc: 2 }, GUNS, 9],
  ['muzzle', 'King\'s Breacher', 'brake', { dmg: 0.06, stab: -4 }, SG, 7],
  ['muzzle', 'Silent Killer Suppressor', 'sup_m', { acc: 8, dmg: -0.04, conceal: -2, silent: 1 }, SG, 12],
  // barrels
  ['barrel', 'Standard Barrel', 'std', {}, GUNS, 0],
  ['barrel', 'Short Barrel', 'short', { acc: -6, conceal: 3 }, LONG, 4],
  ['barrel', 'Long Barrel', 'long', { acc: 10, conceal: -3, dmg: 0.05 }, LONG, 6],
  ['barrel', 'Heavy Barrel', 'heavy', { stab: 10, conceal: -3 }, LONG, 7],
  ['barrel', 'Fluted Barrel', 'long', { acc: 8, stab: 4, conceal: -2 }, RIFLE, 9],
  ['barrel', 'Threaded Barrel', 'std', { acc: 4, stab: 2 }, ['pistol', 'revolver'], 5],
  ['barrel', 'Snub Barrel', 'short', { acc: -8, conceal: 4 }, ['revolver', 'pumps', 'double'], 4],
  // stocks
  ['stock', 'Standard Stock', 'std', {}, LONG, 0],
  ['stock', 'Folded Stock', 'folded', { stab: -6, conceal: 3 }, LONG, 3],
  ['stock', 'No Stock', 'none', { stab: -10, conceal: 5 }, LONG, 3],
  ['stock', 'Tactical Stock', 'tactical', { stab: 6, acc: 2, conceal: -1 }, LONG, 5],
  ['stock', 'Heavy Stock', 'heavy', { stab: 12, conceal: -3 }, LONG, 6],
  ['stock', 'Skeletal Stock', 'skeleton', { stab: 4, conceal: 2 }, LONG, 7],
  ['stock', 'Precision Stock', 'precision', { acc: 6, stab: 6, conceal: -2 }, RIFLE, 9],
  ['stock', 'Wrapped Stock', 'std', { stab: 4 }, LONG, 4],
  // grips
  ['grip', 'Standard Grip', 'std', {}, GUNS, 0],
  ['grip', 'Rubber Grip', 'rubber', { stab: 4 }, GUNS, 2],
  ['grip', 'Ergo Grip', 'ergo', { acc: 2, stab: 2 }, GUNS, 3],
  ['grip', 'Pro Grip', 'pro', { acc: 4, conceal: 1 }, GUNS, 4],
  ['grip', 'Wooden Grip', 'wood', { acc: 2 }, GUNS, 3],
  // foregrips / handguards
  ['fore', 'Standard Handguard', 'std', {}, LONG, 0],
  ['fore', 'Vertical Grip', 'vert', { stab: 8, conceal: -1 }, LONG, 4],
  ['fore', 'Angled Grip', 'angled', { stab: 6, acc: 2, conceal: -1 }, LONG, 4],
  ['fore', 'Rail System', 'rail', { acc: 4, stab: 4, conceal: -2 }, LONG, 6],
  ['fore', 'Slim Handguard', 'slim', { conceal: 2 }, LONG, 4],
  ['fore', 'Bipod', 'bipod', { stab: 12, conceal: -3 }, ['lmg', 'sniper', 'dmr'], 8],
  // magazines
  ['mag', 'Standard Magazine', 'std', {}, GUNS, 0],
  ['mag', 'Extended Magazine', 'ext', { mag: 0.5, conceal: -2, reload: 0.06 }, ['ar', 'smg', 'pistol', 'autosg', 'bullpup', 'bullpupsmg', 'dmr'], 6],
  ['mag', 'Quadstacked Magazine', 'quad', { mag: 1.0, conceal: -3, reload: 0.12 }, ['ar', 'smg', 'bullpup'], 9],
  ['mag', 'Drum Magazine', 'drum', { mag: 2.0, conceal: -5, reload: 0.3 }, ['ar', 'smg', 'autosg', 'bullpup'], 12],
  ['mag', 'Speed Pull Magazine', 'quick', { reload: -0.2, conceal: -1 }, ['ar', 'smg', 'pistol', 'bullpup', 'dmr', 'lmg'], 7],
  ['mag', 'Speed Loader', 'quick', { reload: -0.25 }, ['revolver'], 5],
  ['mag', 'Shell Rack', 'shellrack', { reload: -0.1, conceal: -1 }, SG, 5],
  // gadgets
  ['gadget', 'No Gadget', 'none', {}, GUNS, 0],
  ['gadget', 'Laser Module', 'laser', { acc: 2, conceal: -1 }, GUNS, 4],
  ['gadget', 'Tactical Flashlight', 'flash', { conceal: -1 }, GUNS, 4],
  ['gadget', 'Combined Module', 'combo', { acc: 2, conceal: -2 }, GUNS, 7],
  ['gadget', 'Pistol Laser', 'laser', { acc: 2 }, ['pistol', 'revolver'], 4],
  // ammunition
  ['ammo', 'Standard Rounds', 'std', {}, GUNS, 0],
  ['ammo', 'Armor Piercing', 'ap', { pierce: 1, dmg: -0.05 }, ['ar', 'dmr', 'bullpup', 'lmg', 'sniper', 'smg', 'pistol', 'revolver'], 10],
  ['ammo', 'Hollow Points', 'hp', { dmg: 0.1, pierce: -1 }, ['ar', 'smg', 'pistol', 'revolver', 'bullpup'], 8],
  ['ammo', '000 Buckshot', 'buck', { dmg: 0.1, acc: -4 }, SG, 7],
  ['ammo', 'Slug', 'slug', { pellets: 1, pierce: 1, acc: 20 }, SG, 9],
  ['ammo', 'HE Round', 'he', { pellets: 1, explode: 1, dmg: -0.4 }, SG, 14],
  ['ammo', 'Flechette', 'flech', { pellets: 12, acc: 6, pierce: 1 }, SG, 9],
  ['ammo', 'Dragon\'s Breath', 'fire', { burn: 1, dmg: -0.1 }, SG, 12],
  ['ammo', 'Poison Bolts', 'poison', { burn: 1 }, ['crossbow', 'bow'], 8],
  ['ammo', 'Explosive Arrows', 'he', { explode: 1 }, ['crossbow', 'bow'], 14],
  ['ammo', 'Incendiary Grenades', 'fire', { burn: 1, dmg: -0.5 }, ['gl'], 16],
  // boosts
  ['boost', 'No Boost', 'none', {}, null, 0],
  ['boost', 'Concealment Boost', 'none', { conceal: 1 }, null, 6],
  ['boost', 'Stability Boost', 'none', { stab: 4 }, null, 6],
  ['boost', 'Accuracy Boost', 'none', { acc: 4 }, null, 6],
  ['boost', 'Damage Boost', 'none', { dmg: 0.04 }, null, 8],
  ['boost', 'Ammo Boost', 'none', { total: 0.1 }, null, 6],
];
H.MOD_SLOTS = ['sight', 'muzzle', 'barrel', 'stock', 'grip', 'fore', 'mag', 'gadget', 'ammo', 'boost'];
H.MOD_SLOT_NAMES = { sight: 'Sight', muzzle: 'Barrel Ext.', barrel: 'Barrel', stock: 'Stock', grip: 'Grip', fore: 'Foregrip', mag: 'Magazine', gadget: 'Gadget', ammo: 'Ammunition', boost: 'Boost' };
H.MODS = M.map((r, i) => ({ id: 'm' + i, slot: r[0], name: r[1], vis: r[2], st: r[3], arch: r[4], price: r[5] * 1000 }));
H.MODMAP = {}; H.MODS.forEach(m => H.MODMAP[m.id] = m);
H.modsFor = function (w, slot) {
  return H.MODS.filter(m => m.slot === slot && (!m.arch || m.arch.includes(w.arch)) && !(w.proj && m.slot !== 'boost' && m.slot !== 'ammo' && m.slot !== 'sight'));
};

H.WEAPON_PAINTS = [
  ['Factory', 0x1b1d20, 0x2c2f33, 'plain'], ['Desert Tan', 0xb9a27a, 0x2c2a26, 'plain'], ['Olive Drab', 0x55603e, 0x22251c, 'plain'],
  ['Arctic', 0xdfe6ea, 0x3a3f44, 'plain'], ['Gold Plated', 0xd8b04a, 0x6b4b10, 'metal'], ['Chrome', 0xd9dde2, 0x8a9096, 'metal'],
  ['Woodland Camo', 0x4a5a35, 0x2a2416, 'camo'], ['Urban Camo', 0x8a8e92, 0x3c3f43, 'camo'], ['Tiger Stripe', 0xc77a2a, 0x1d1a14, 'stripe'],
  ['Hot Pink', 0xe34ba0, 0x2a1020, 'plain'], ['Cobalt', 0x2b5bc7, 0x10182e, 'metal'], ['Crimson', 0xa0181c, 0x1a0b0b, 'metal'],
  ['Hex Carbon', 0x2a2d31, 0x14161a, 'hex'], ['Digital', 0x6c7a62, 0x343a2e, 'digital'], ['Damascus', 0x7a7d82, 0x34363a, 'damascus'],
  ['Neon Circuit', 0x0f141a, 0x22ffcc, 'circuit'], ['Bone', 0xe6dcc4, 0x6d6150, 'plain'], ['Rust', 0x8a4a22, 0x3a2414, 'damascus'],
];

/* ---------------- melee ---------------- */
// name, damage, speed (s), range, shape, price K, level
H.MELEE = [
  ['Fists', 30, 0.45, 1.6, 'fist', 0, 0], ['Combat Knife', 60, 0.45, 1.8, 'knife', 2, 0], ['Brass Knuckles', 45, 0.4, 1.6, 'knuckles', 3, 1],
  ['Machete', 120, 0.7, 2.0, 'machete', 6, 4], ['Fire Axe', 200, 0.9, 2.2, 'axe', 9, 8], ['Baseball Bat', 160, 0.8, 2.2, 'bat', 5, 3],
  ['Crowbar', 140, 0.7, 2.0, 'crowbar', 4, 2], ['Katana', 180, 0.6, 2.3, 'sword', 14, 14], ['Tomahawk', 150, 0.6, 1.9, 'axe', 8, 9],
  ['Sledgehammer', 300, 1.2, 2.3, 'hammer', 12, 16], ['Shovel', 160, 0.9, 2.2, 'shovel', 5, 6], ['Meat Cleaver', 110, 0.55, 1.8, 'cleaver', 4, 5],
  ['Pickaxe', 220, 1.0, 2.2, 'pick', 10, 12], ['Hockey Stick', 120, 0.7, 2.4, 'stick', 6, 7], ['Golf Club', 130, 0.75, 2.3, 'club', 6, 7],
  ['Frying Pan', 110, 0.7, 1.9, 'pan', 3, 4], ['Switchblade', 70, 0.4, 1.7, 'knife', 4, 6], ['Bayonet', 90, 0.5, 2.0, 'knife', 5, 8],
  ['Spatula', 40, 0.45, 1.8, 'pan', 1, 2], ['Kunai', 80, 0.4, 1.7, 'knife', 6, 11], ['Fire Poker', 120, 0.7, 2.2, 'crowbar', 4, 5],
  ['Cleaver of Justice', 140, 0.6, 1.9, 'cleaver', 8, 13], ['Scalper Tomahawk', 160, 0.6, 1.9, 'axe', 10, 15], ['Ice Pick', 100, 0.5, 1.8, 'pick', 4, 6],
  ['Rivertown Glen Bottle', 90, 0.5, 1.7, 'bottle', 2, 3], ['Telescopic Baton', 100, 0.55, 2.0, 'stick', 4, 4], ['Stun Baton', 80, 0.55, 2.0, 'stick', 9, 14],
  ['Electrical Brass Knuckles', 70, 0.45, 1.6, 'knuckles', 10, 18], ['Great Sword', 260, 1.1, 2.6, 'sword', 18, 24], ['Chainsaw', 340, 0.3, 2.0, 'saw', 30, 32],
].map(r => ({ id: r[0].toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: r[0], dmg: r[1], speed: r[2], range: r[3], shape: r[4], price: r[5] * 1000, level: r[6] }));

/* ---------------- throwables & deployables ---------------- */
H.THROWABLES = [
  { id: 'frag', name: 'Frag Grenade', count: 3, dmg: 1200, radius: 5, fuse: 2.2, kind: 'frag' },
  { id: 'molotov', name: 'Molotov Cocktail', count: 3, dmg: 30, radius: 4, fuse: 0, kind: 'fire' },
  { id: 'concussion', name: 'Concussion Grenade', count: 4, dmg: 0, radius: 7, fuse: 1.5, kind: 'stun' },
  { id: 'knives', name: 'Throwing Knives', count: 6, dmg: 400, radius: 0, fuse: 0, kind: 'knife' },
  { id: 'dynamite', name: 'Dynamite', count: 3, dmg: 1600, radius: 6, fuse: 3, kind: 'frag' },
  { id: 'nesting', name: 'Nesting Doll Grenade', count: 2, dmg: 900, radius: 4, fuse: 2, kind: 'cluster' },
  { id: 'axes', name: 'Throwing Axes', count: 4, dmg: 700, radius: 0, fuse: 0, kind: 'knife' },
  { id: 'shuriken', name: 'Shuriken', count: 10, dmg: 240, radius: 0, fuse: 0, kind: 'knife' },
];
H.DEPLOYABLES = [
  { id: 'ammo', name: 'Ammo Bag', uses: 4, desc: 'Refills ammo for the crew.' },
  { id: 'doctor', name: 'Doctor Bag', uses: 2, desc: 'Restores health and clears downs.' },
  { id: 'fak', name: 'First Aid Kits', uses: 4, desc: 'Small instant heal, placed as several kits.' },
  { id: 'ecm', name: 'ECM Jammer', uses: 1, desc: 'Jams cameras, pagers and phones for 20 seconds.' },
  { id: 'trip', name: 'Trip Mines', uses: 6, desc: 'Laser-triggered explosives, or sensors in stealth.' },
  { id: 'sentry', name: 'Sentry Gun', uses: 1, desc: 'Automated turret that fires at police.' },
  { id: 'bodybags', name: 'Body Bag Case', uses: 2, desc: 'Refills body bags.' },
  { id: 'armorbag', name: 'Armor Bag', uses: 1, desc: 'Swap into heavy armour mid-heist.' },
];

/* ---------------- armour ---------------- */
H.ARMORS = [
  { id: 'suit', name: 'Two-Piece Suit', armor: 30, speed: 1.0, dodge: 5, conceal: 30, level: 0 },
  { id: 'lbv', name: 'Light Ballistic Vest', armor: 50, speed: 0.98, dodge: 0, conceal: 26, level: 0 },
  { id: 'bv', name: 'Ballistic Vest', armor: 70, speed: 0.95, dodge: -5, conceal: 23, level: 5 },
  { id: 'hbv', name: 'Heavy Ballistic Vest', armor: 90, speed: 0.92, dodge: -10, conceal: 20, level: 10 },
  { id: 'flak', name: 'Flak Jacket', armor: 120, speed: 0.88, dodge: -15, conceal: 16, level: 15 },
  { id: 'ctv', name: 'Combined Tactical Vest', armor: 150, speed: 0.84, dodge: -20, conceal: 10, level: 20 },
  { id: 'ictv', name: 'Reinforced Tactical Vest', armor: 200, speed: 0.78, dodge: -25, conceal: 4, level: 30 },
];

/* ---------------- masks ---------------- */
// Mask shapes are built in models.js from these keys.
H.MASK_SHAPES = ['clown', 'skull', 'hockey', 'demon', 'robot', 'kabuki', 'bear', 'wolf', 'gas', 'tiki', 'pumpkin', 'alien', 'samurai', 'plague',
  'luchador', 'cyborg', 'jester', 'knight', 'oni', 'owl', 'pig', 'cat', 'bull', 'monkey', 'ghost', 'diamond', 'crown', 'visor', 'balaclava',
  'welding', 'carnival', 'stitch', 'dragon', 'spartan', 'fox', 'medusa', 'zombie', 'buffalo', 'panda', 'mime'];
H.MASK_NAMES = {
  clown: 'Grinner', skull: 'Bonehead', hockey: 'Goalie', demon: 'Hellspawn', robot: 'Unit 7', kabuki: 'Stagehand', bear: 'Grizzly', wolf: 'Lone Wolf',
  gas: 'Smog', tiki: 'Tiki Torch', pumpkin: 'Hollow Jack', alien: 'Visitor', samurai: 'Ronin', plague: 'Beak', luchador: 'El Campeon', cyborg: 'Chrome Eye',
  jester: 'Court Fool', knight: 'Iron Helm', oni: 'Red Oni', owl: 'Night Owl', pig: 'Porkchop', cat: 'Alley Cat', bull: 'Stampede', monkey: 'Ape Escape',
  ghost: 'Sheet', diamond: 'Facet', crown: 'Royal', visor: 'Faceplate', balaclava: 'Plain Balaclava', welding: 'Spark', carnival: 'Masquerade',
  stitch: 'Patchwork', dragon: 'Wyrm', spartan: 'Hoplite', fox: 'Sly', medusa: 'Gorgon', zombie: 'Walker', buffalo: 'Bison', panda: 'Bamboo', mime: 'Silence',
};
H.MASK_MATERIALS = [
  ['Plastic', 0.6, 0.0], ['Matte', 0.95, 0.0], ['Gloss', 0.15, 0.0], ['Chrome', 0.08, 1.0], ['Gold', 0.2, 1.0], ['Brushed Steel', 0.4, 1.0],
  ['Rubber', 0.85, 0.0], ['Wood', 0.8, 0.0], ['Marble', 0.3, 0.0], ['Carbon', 0.35, 0.3], ['Leather', 0.7, 0.0], ['Rusted', 0.9, 0.6],
  ['Bone', 0.75, 0.0], ['Obsidian', 0.1, 0.2], ['Copper', 0.3, 1.0], ['Velvet', 1.0, 0.0],
];
H.MASK_PATTERNS = ['solid', 'stripes', 'checker', 'dots', 'camo', 'flames', 'zebra', 'hex', 'splatter', 'tribal', 'stars', 'skulls', 'circuit', 'tiger', 'gradient', 'grid', 'waves', 'cracks', 'diamonds', 'leopard'];
H.MASK_COLORS = [
  ['Classic', 0xeeeeee, 0x111111], ['Blood', 0xa01010, 0x1a0505], ['Royal', 0x2a3ab0, 0xd8b04a], ['Toxic', 0x50d020, 0x101010], ['Ice', 0xbfe8ff, 0x3080c0],
  ['Sunset', 0xff8a2a, 0x8a1a5a], ['Midnight', 0x14182a, 0x6070a0], ['Bubblegum', 0xff7ac0, 0x7a2a8a], ['Forest', 0x3a5a2a, 0xa08a4a], ['Ash', 0x707070, 0x202020],
  ['Gilded', 0xd8b04a, 0x222222], ['Ocean', 0x1a6a8a, 0xe0f0ff], ['Lava', 0xff4a10, 0x200800], ['Ivory', 0xf0e6d0, 0x8a6a4a], ['Cyber', 0x10ffd0, 0x200a40],
  ['Patriot', 0xb01a1a, 0x1a2a8a], ['Desert', 0xc8a870, 0x5a4020], ['Violet', 0x7a3ac0, 0x100820], ['Mint', 0x9af0c0, 0x2a5a4a], ['Coal', 0x222222, 0xd02020],
];

/* ---------------- skills ----------------
 effects use keys read by player.js: <key>Mul multiplies, <key>Add adds, flags are booleans.
 tree > subtree > 6 skills (tier 1..6), each [name, basic desc, basic effects, aced desc, aced effects] */
H.SKILL_TREES = [
  { id: 'planner', name: 'Planner', subs: [
    { name: 'Field Medic', skills: [
      ['Combat Medic', 'Revives restore 30% more health.', { reviveHpAdd: 0.3 }, 'Take 30% less damage while reviving.', { reviveDrMul: 0.7 }],
      ['Quick Fix', 'First aid kits and doctor bags take 50% less time to use.', { medUseMul: 0.5 }, 'Using a medical item makes you take 10% less damage for 120s.', { medDr: 0.1 }],
      ['Painkillers', 'Crew you revive take 30% less damage for 5s.', { painkillers: 1 }, 'Increases to 50%.', { painkillers: 2 }],
      ['Uppers', 'Adds 4 First Aid Kits to your deployable.', { fakAdd: 4 }, 'First aid kits auto-revive you once if you go down within 5m.', { uppersAce: 1 }],
      ['Combat Doctor', 'Doctor bag gets one extra use.', { doctorAdd: 1 }, 'You can carry two doctor bags.', { doctorAdd2: 1 }],
      ['Inspire', 'Revive crew 50% faster; shouting at crew boosts their speed.', { reviveSpeedMul: 0.5 }, 'Shout at a downed teammate to revive them from 9m once every 20s.', { inspireAce: 1 }],
    ] },
    { name: 'Controller', skills: [
      ['Forced Friendship', 'Each hostage gives you 1 absorption.', { hostageAbsorb: 1 }, 'Up to 8 absorption total.', { hostageAbsorbCap: 8 }],
      ['Cable Guy', 'Cable tie 75% faster.', { tieSpeedMul: 0.25 }, 'Carry 4 extra cable ties.', { tiesAdd: 4 }],
      ['Joker', 'Convert a surrendered cop to fight for you.', { joker: 1 }, 'Converted cops deal 45% more damage.', { jokerDmgMul: 1.45 }],
      ['Stockholm Syndrome', 'Civilians are intimidated by gunfire.', { stockholm: 1 }, 'Hostages may revive you when you go down.', { stockholmAce: 1 }],
      ['Partners in Crime', 'Having a converted cop gives +10% speed.', { pic: 1 }, '+30% health while you have a converted cop.', { picAce: 1 }],
      ['Hostage Taker', 'Regenerate 1.5% health per second while you have a hostage.', { hostRegen: 0.015 }, 'Regen raised to 4.5%.', { hostRegen2: 0.03 }],
    ] },
    { name: 'Sharpshooter', skills: [
      ['Stable Shot', '+8 stability.', { stabAdd: 8 }, '+16 accuracy while standing still.', { stillAccAdd: 16 }],
      ['Rifleman', 'ADS 100% faster; +25% zoom.', { adsMul: 0.5 }, '+16 accuracy while aiming.', { adsAccAdd: 16 }],
      ['Marksman', 'Single-fire mode +8 accuracy.', { semiAccAdd: 8 }, '+20% damage while aiming.', { adsDmgMul: 1.2 }],
      ['Aggressive Reload', 'Headshot kills with semi weapons speed reload 100% for 4s.', { aggroReload: 1 }, 'Rifles fire 50% faster after a headshot kill.', { aggroAce: 1 }],
      ['Ammo Efficiency', '3 headshots in 6s refunds a bullet.', { ammoEff: 1 }, 'Window widened to 10s.', { ammoEff2: 1 }],
      ['Graze', 'Sniper rifle headshots deal 20% damage to nearby enemies.', { graze: 0.2 }, 'Increases to 100% for headshot kills.', { grazeAce: 1 }],
    ] },
  ] },
  { id: 'bruiser', name: 'Bruiser', subs: [
    { name: 'Shotgunner', skills: [
      ['Underdog', '+15% damage when 3+ enemies are near.', { underdog: 0.15 }, 'Also take 10% less damage.', { underdogDr: 0.1 }],
      ['Shotgun Impact', '+8 stability and +5% damage with shotguns.', { sgDmgMul: 1.05, sgStabAdd: 8 }, 'Additional +10% damage.', { sgDmgMul2: 1.1 }],
      ['Far Away', '+40% accuracy with shotguns when aiming.', { sgAdsAccAdd: 20 }, '+50% range.', { sgRangeMul: 1.5 }],
      ['Close By', 'Hip-fire shotguns while sprinting.', { sprintFire: 1 }, '+15 shells per shotgun mag.', { sgMagAdd: 3 }],
      ['Overkill', 'Kills with shotguns give +75% damage for 2s.', { overkill: 0.75 }, 'Bonus applies to all weapons.', { overkillAll: 1 }],
      ['Shotgun CQB', 'Reload shotguns 15% faster.', { sgReloadMul: 0.85 }, 'Further 35% faster.', { sgReloadMul2: 0.65 }],
    ] },
    { name: 'Tank', skills: [
      ['Resilience', '+20% armor recovery speed.', { armorRegenMul: 1.2 }, 'Never take more than 50% of your health from one hit.', { resilience: 1 }],
      ['Die Hard', 'Take 50% less damage while interacting.', { interactDr: 0.5 }, 'Downed: interactions don\'t end.', { dieHardAce: 1 }],
      ['Transporter', 'Throw bags 50% further.', { throwMul: 1.5 }, 'Move 25% faster carrying bags.', { bagSpeedMul: 1.25 }],
      ['Shock and Awe', 'Ammo bags +1 use.', { ammoBagAdd: 1 }, 'Faster reload when your magazine is empty.', { emptyReloadMul: 0.75 }],
      ['Iron Man', '+30% armor.', { armorMul: 1.3 }, 'Melee can shove shield officers.', { ironManAce: 1 }],
      ['Juggernaut', 'Unlocks the Reinforced Tactical Vest.', { ictv: 1 }, 'Melee shield knockback; +20% more armor.', { armorMul2: 1.2 }],
    ] },
    { name: 'Ammo Specialist', skills: [
      ['Scavenger', 'Ammo pickups +50% radius.', { pickupRangeMul: 1.5 }, 'Every 6th kill drops an extra ammo box.', { scavAce: 1 }],
      ['Bulletstorm', 'After using your ammo bag, don\'t use ammo for 5s.', { bulletstorm: 5 }, 'Lasts 15s.', { bulletstorm2: 10 }],
      ['Fully Loaded', '+25% total ammo.', { totalMul: 1.25 }, 'Pick up 75% more ammo; throwables can drop.', { pickupAmmoMul: 1.75 }],
      ['Extra Lead', 'Ammo bag uses +1.', { ammoBagAdd2: 1 }, 'Carry two ammo bags.', { ammoBag2: 1 }],
      ['Portable Saw', 'Unlocks the saw for opening deposit boxes.', { saw: 1 }, '+1 saw blade.', { sawAce: 1 }],
      ['Rip and Tear', 'Saw damage +50%.', { sawDmgMul: 1.5 }, 'Saw opens things 50% faster.', { sawSpeedMul: 1.5 }],
    ] },
  ] },
  { id: 'tech', name: 'Technician', subs: [
    { name: 'Engineer', skills: [
      ['Third Law', 'Sentry guns cost 40% less ammo to place.', { sentryCost: 0.6 }, 'Sentries 75% tougher.', { sentryHpMul: 1.75 }],
      ['Sentry Targeting', '+100% sentry accuracy.', { sentryAccMul: 2 }, 'Sentries rotate 150% faster.', { sentryTurnMul: 2.5 }],
      ['Eco Sentry', 'Sentries +150% ammo.', { sentryAmmoMul: 2.5 }, 'Sentries +30% health.', { sentryHpMul2: 1.3 }],
      ['Engineering', 'Silent sentries.', { silentSentry: 1 }, 'AP rounds on sentries.', { sentryAP: 1 }],
      ['Jack of All Trades', 'Deploy items 50% faster.', { deploySpeedMul: 0.5 }, 'Carry a second deployable.', { secondDeploy: 1 }],
      ['Tower Defense', '+1 sentry.', { sentryAdd: 1 }, '+2 sentries.', { sentryAdd2: 1 }],
    ] },
    { name: 'Breacher', skills: [
      ['Hardware Expert', 'Drill and saw 25% faster; fix 20% faster.', { drillMul: 0.75 }, '30% chance drills auto-repair.', { autoRepair: 0.3 }],
      ['Combat Engineering', 'Trip mine radius +30%.', { tripRadiusMul: 1.3 }, 'Trip mine damage +50%.', { tripDmgMul: 1.5 }],
      ['Drill Sergeant', 'Drills 15% faster.', { drillMul2: 0.85 }, 'Drills another 20% faster.', { drillMul3: 0.8 }],
      ['More Firepower', '+1 trip mine.', { tripAdd: 1 }, '+3 trip mines.', { tripAdd2: 2 }],
      ['Kickstarter', 'Drills can be fixed with a melee hit (50%).', { kickstarter: 0.5 }, 'Melee always fixes drills.', { kickstarter2: 0.5 }],
      ['Fire Trap', 'Trip mines leave fire.', { fireTrap: 1 }, 'Fire radius +50%.', { fireTrapAce: 1 }],
    ] },
    { name: 'Oppressor', skills: [
      ['Steady Grip', '+8 accuracy.', { accAdd: 8 }, '+16 stability.', { stabAdd2: 16 }],
      ['Heavy Impact', '5% chance to stagger.', { stagger: 0.05 }, '20% chance.', { stagger2: 0.15 }],
      ['Fire Control', '+12 hip-fire accuracy.', { hipAccAdd: 12 }, 'Recoil penalty while moving reduced.', { moveAccMul: 0.6 }],
      ['Shockproof', 'Tasers fail 30% of the time.', { shockproof: 0.3 }, 'Melee a taser while tased to stun him.', { shockAce: 1 }],
      ['Lock N\' Load', 'Automatic weapons fire 15% faster.', { autoRofMul: 1.15 }, 'Reload after a kill streak is 100% faster.', { lnlAce: 1 }],
      ['Body Expertise', '30% of headshot damage on body shots with autos.', { bodyExp: 0.3 }, 'Raised to 90%.', { bodyExp2: 0.6 }],
    ] },
  ] },
  { id: 'ghost', name: 'Ghost', subs: [
    { name: 'Shinobi', skills: [
      ['Chameleon', 'Unmasked: 25% longer before detection.', { casingDetectMul: 0.75 }, 'Pick up small loot while casing.', { casingLoot: 1 }],
      ['Cleaner', '+1 body bag; bag corpses 50% faster.', { bodyBagAdd: 1, bagCorpseMul: 0.5 }, 'Corpses don\'t alert civilians from afar.', { cleanerAce: 1 }],
      ['Sixth Sense', 'Standing still for 3s marks nearby guards.', { sixthSense: 1 }, 'Marks cameras too.', { sixthAce: 1 }],
      ['Nimble', 'Pick locks 100% faster.', { lockpickMul: 0.5 }, 'Silently open safes by hand.', { nimbleAce: 1 }],
      ['ECM Specialist', '+1 ECM.', { ecmAdd: 1 }, 'ECMs last 25% longer.', { ecmDurMul: 1.25 }],
      ['Spotter', 'Marked enemies take 15% more damage.', { markedDmgMul: 1.15 }, 'Marked enemies take 35% more.', { markedDmgMul2: 1.17 }],
    ] },
    { name: 'Artful Dodger', skills: [
      ['Duck and Cover', '+5% dodge; sprint 25% longer.', { dodgeAdd: 5, staminaMul: 1.25 }, '+10% sprint speed.', { sprintMul: 1.1 }],
      ['Parkour', 'Faster ladder climbs and +10% move speed.', { speedMul: 1.1 }, 'Reload while sprinting.', { sprintReload: 1 }],
      ['Inner Pockets', '+2 concealment on melee weapons.', { concealAdd: 2 }, '+2 concealment with all weapons.', { concealAdd2: 2 }],
      ['Shockproof Feet', '+10% dodge while crouched.', { crouchDodge: 10 }, '+10% dodge always.', { dodgeAdd2: 10 }],
      ['Sneaky Bastard', '+1 dodge per 3 concealment.', { sneaky: 1 }, 'Doubles that bonus.', { sneaky2: 1 }],
      ['Smooth Talker', 'Answer one more pager.', { pagerAdd: 1 }, 'Pagers can be answered 50% faster.', { pagerSpeedMul: 0.5 }],
    ] },
    { name: 'Silent Killer', skills: [
      ['Second Wind', 'Gain 30% speed for 5s when your armor breaks.', { secondWind: 1 }, 'Also stagger nearby enemies.', { secondWindAce: 1 }],
      ['Optical Illusions', 'Suppressed weapons +4 concealment.', { supConceal: 4 }, 'Enemies 35% less likely to target you.', { aggroMul: 0.65 }],
      ['Hitman', '+15% damage with suppressed weapons.', { supDmgMul: 1.15 }, '+15% more.', { supDmgMul2: 1.13 }],
      ['Unseen Strike', 'After 4s without damage, +35% crit chance.', { unseen: 0.35 }, 'Lasts 6s after taking damage.', { unseenAce: 1 }],
      ['Low Blow', '+3% crit per 3 concealment.', { lowBlow: 1 }, 'Up to 30% total.', { lowBlowAce: 1 }],
      ['The Professional', 'Suppressed weapons +50% headshot damage.', { proHs: 1.5 }, 'Snap to targets 40% faster.', { proAce: 1 }],
    ] },
  ] },
  { id: 'fugitive', name: 'Fugitive', subs: [
    { name: 'Gunslinger', skills: [
      ['Equilibrium', 'Pistol draw/holster 33% faster.', { pistolSwapMul: 0.67 }, '+8 accuracy with pistols.', { pistolAccAdd: 8 }],
      ['Gun Nut', 'Pistols +5 mag.', { pistolMagAdd: 5 }, 'Pistols fire 50% faster.', { pistolRofMul: 1.5 }],
      ['Akimbo', '+8 akimbo stability.', { akimboStabAdd: 8 }, '+50% akimbo ammo.', { akimboAmmoMul: 1.5 }],
      ['One Handed Talent', '+5 pistol damage.', { pistolDmgAdd: 5 }, '+15 pistol damage.', { pistolDmgAdd2: 10 }],
      ['Desperado', 'Pistol hits stack +10% accuracy.', { desperado: 1 }, 'Stacks last longer.', { desperadoAce: 1 }],
      ['Trigger Happy', 'Pistol hits stack +120% damage for 2s.', { triggerHappy: 1 }, 'Lasts 4s.', { triggerHappyAce: 1 }],
    ] },
    { name: 'Revenant', skills: [
      ['Nine Lives', 'Go down one extra time before custody.', { downsAdd: 1 }, 'Bleed out 50% slower.', { bleedMul: 1.5 }],
      ['Running From Death', 'Reload and swap 100% faster after revive.', { rfd: 1 }, '+30% speed after revive.', { rfdAce: 1 }],
      ['Up You Go', 'Take 30% less damage after revive.', { uyg: 0.3 }, '+40% health after revive.', { uygAce: 1 }],
      ['Swan Song', 'Keep fighting for 3s at 0 health.', { swanSong: 3 }, 'No ammo use during Swan Song.', { swanAce: 1 }],
      ['Feign Death', '15% chance to instantly revive when downed.', { feign: 0.15 }, '45% chance.', { feign2: 0.3 }],
      ['Messiah', 'Kill an enemy while downed to get up (once per down).', { messiah: 1 }, 'Messiah charges recharge.', { messiahAce: 1 }],
    ] },
    { name: 'Brawler', skills: [
      ['Martial Arts', 'Take 50% less melee damage.', { meleeDr: 0.5 }, 'Melee knocks down 50% more.', { martialAce: 1 }],
      ['Bloodthirst', 'Kills increase melee damage by 100% (up to 1600%).', { bloodthirst: 1 }, 'Melee kills speed reload 50%.', { bloodAce: 1 }],
      ['Pumping Iron', 'Melee charges 100% faster.', { meleeSpeedMul: 0.6 }, 'Melee damage +100%.', { meleeDmgMul: 2 }],
      ['Counterstrike', 'Counter ninja kicks with melee.', { counter: 1 }, 'Counter tasers too.', { counterAce: 1 }],
      ['Berserker', 'Melee damage +250% at low health.', { berserk: 2.5 }, 'Gun damage +100% at low health.', { berserkAce: 1 }],
      ['Frenzy', 'Take 10% less damage; health capped at 30%.', { frenzy: 1 }, 'Healing reduced less.', { frenzyAce: 1 }],
    ] },
  ] },
];
H.TIER_REQ = [0, 1, 3, 8, 14, 20];
H.TIER_COST = [[1, 3], [2, 4], [3, 6], [4, 8], [6, 10], [8, 12]];

/* ---------------- perk decks ---------------- */
H.PERK_DECKS = [
  { id: 'crew', name: 'Crew Chief', cards: [['+10% health for the crew', { hpMul: 1.1 }], ['+10% armor', { armorMul3: 1.1 }], ['+8% damage resistance', { drAdd: 0.08 }], ['Hostages give +5% health each', { hostHp: 0.05 }], ['+10% stamina and armor', { armorMul4: 1.1 }]] },
  { id: 'muscle', name: 'Heavyweight', cards: [['+10% health', { hpMul: 1.1 }], ['+20% health', { hpMul2: 1.1 }], ['Regenerate 1% health/s', { regen: 0.01 }], ['+20% health', { hpMul3: 1.2 }], ['Enemies target you 40% more', { aggroMul2: 1.4 }]] },
  { id: 'armorer', name: 'Plate Carrier', cards: [['+10% armor', { armorMul3: 1.1 }], ['+15% armor regen', { armorRegenMul2: 1.15 }], ['2s invulnerability on armor break', { armorInvuln: 2 }], ['+20% armor', { armorMul4: 1.2 }], ['+10% armor regen', { armorRegenMul3: 1.1 }]] },
  { id: 'rogue', name: 'Slipper', cards: [['+10% dodge', { dodgeAdd3: 10 }], ['+20% swap speed', { swapMul: 0.8 }], ['+15% dodge', { dodgeAdd4: 15 }], ['Detection risk -2', { concealAdd3: 2 }], ['+20% dodge', { dodgeAdd5: 20 }]] },
  { id: 'hitman', name: 'Contract Killer', cards: [['+10% health', { hpMul: 1.1 }], ['Armor regenerates as one block', { armorBlock: 1 }], ['+15% armor', { armorMul3: 1.15 }], ['Kill to regen armor faster', { killArmor: 1 }], ['+20% armor regen', { armorRegenMul2: 1.2 }]] },
  { id: 'burglar', name: 'Cat Burglar', cards: [['+5% dodge', { dodgeAdd3: 5 }], ['Bag corpses and pick locks faster', { lockpickMul2: 0.8 }], ['+2 concealment', { concealAdd3: 2 }], ['Answer pagers 20% faster', { pagerSpeedMul2: 0.8 }], ['+20% crouch speed', { crouchMul: 1.2 }]] },
  { id: 'gambler', name: 'High Roller', cards: [['Ammo pickups heal 6 health', { ammoHeal: 6 }], ['+10% health', { hpMul: 1.1 }], ['Ammo pickups heal crew', { ammoHealCrew: 1 }], ['+20% ammo pickup', { pickupAmmoMul2: 1.2 }], ['Heals up to 10', { ammoHeal2: 4 }]] },
  { id: 'grinder', name: 'Meat Grinder', cards: [['Damage heals 1/s for 3s (stacks)', { grinder: 1 }], ['+10% health', { hpMul: 1.1 }], ['Stacks up to 4', { grinder2: 1 }], ['+5% dodge', { dodgeAdd3: 5 }], ['Stacks up to 6', { grinder3: 1 }]] },
  { id: 'yakuza', name: 'Irezumi', cards: [['Lower health, faster armor regen', { yakuza: 1 }], ['+10% speed at low health', { yakuzaSpeed: 1 }], ['+20% armor regen at low health', { yakuzaArmor: 1 }], ['Kills restore armor', { killArmor: 1 }], ['Up to 20% less damage at low health', { yakuzaDr: 0.2 }]] },
  { id: 'anarchist', name: 'Firebrand', cards: [['Armor regenerates over time instead of all at once', { armorTrickle: 1 }], ['+20% armor', { armorMul3: 1.2 }], ['Damage dealt restores armor', { dmgArmor: 1 }], ['+20% armor', { armorMul4: 1.2 }], ['+10% health', { hpMul: 1.1 }]] },
  { id: 'stoic', name: 'Iron Will', cards: [['Damage taken is spread over 8s', { stoic: 1 }], ['+20% health', { hpMul: 1.2 }], ['Flask clears pending damage', { stoicFlask: 1 }], ['+10% health', { hpMul2: 1.1 }], ['Not taking damage for 4s clears it', { stoicClear: 1 }]] },
  { id: 'sicario', name: 'Smokejumper', cards: [['Smoke bomb: +dodge inside', { smoke: 1 }], ['+10% dodge', { dodgeAdd3: 10 }], ['Dodging restores armor', { dodgeArmor: 1 }], ['+10% health', { hpMul: 1.1 }], ['+10% dodge', { dodgeAdd4: 10 }]] },
];

/* ---------------- enemies ---------------- */
// hp, armor plate (front dmg mul), speed, weapon dmg, range, rof (shots/s), accuracy (0..1), colours
H.ENEMIES = {
  guard: { name: 'Security Guard', hp: 120, speed: 3.6, dmg: 6, range: 30, rof: 1.6, acc: 0.45, uniform: 0x2a3550, pants: 0x1c2233, head: 'cap', gun: 'pistol' },
  cop: { name: 'Beat Cop', hp: 160, speed: 4.0, dmg: 7, range: 30, rof: 1.8, acc: 0.5, uniform: 0x1d2a52, pants: 0x161c30, head: 'police', gun: 'pistol' },
  fbi: { name: 'Federal Agent', hp: 240, speed: 4.4, dmg: 9, range: 35, rof: 2.4, acc: 0.55, uniform: 0x2a2a2a, pants: 0x3a3a3a, head: 'none', gun: 'smg', vest: 'FED' },
  swat: { name: 'Tactical Officer', hp: 320, speed: 4.4, dmg: 10, range: 40, rof: 3.0, acc: 0.55, uniform: 0x1a1d22, pants: 0x1a1d22, head: 'helmet', gun: 'ar', vest: 'SWAT' },
  heavy: { name: 'Heavy Tactical', hp: 640, speed: 3.8, dmg: 12, range: 40, rof: 3.0, acc: 0.6, uniform: 0x14161a, pants: 0x14161a, head: 'helmet_v', gun: 'ar', vest: 'SWAT', bulk: 1.15 },
  shield: { name: 'Riot Shield', hp: 480, speed: 3.6, dmg: 9, range: 25, rof: 1.6, acc: 0.6, uniform: 0x1a1d22, pants: 0x1a1d22, head: 'helmet_v', gun: 'pistol', special: 'shield' },
  taser: { name: 'Zapper', hp: 900, speed: 4.0, dmg: 6, range: 15, rof: 1.2, acc: 0.7, uniform: 0x2a3a20, pants: 0x1a2214, head: 'gasmask', gun: 'taser', special: 'taser', bulk: 1.1 },
  cloaker: { name: 'Ninja', hp: 900, speed: 7.2, dmg: 50, range: 2.5, rof: 0.6, acc: 1, uniform: 0x101418, pants: 0x101418, head: 'nvg', gun: 'smg', special: 'cloaker' },
  medic: { name: 'Field Medic', hp: 600, speed: 4.2, dmg: 8, range: 30, rof: 2.0, acc: 0.5, uniform: 0x30353a, pants: 0x1a1d22, head: 'helmet', gun: 'smg', special: 'medic', vest: '+' },
  sniper: { name: 'Marksman', hp: 300, speed: 0, dmg: 40, range: 120, rof: 0.35, acc: 0.65, uniform: 0x262a22, pants: 0x262a22, head: 'helmet', gun: 'sniper', special: 'sniper' },
  dozer: { name: 'Juggernaut', hp: 6000, speed: 3.0, dmg: 28, range: 18, rof: 1.2, acc: 0.6, uniform: 0x0d0f12, pants: 0x0d0f12, head: 'dozer', gun: 'shotgun', special: 'dozer', bulk: 1.45, visor: 400, plate: 1600 },
  thug: { name: 'Gang Member', hp: 140, speed: 4.2, dmg: 7, range: 25, rof: 2.0, acc: 0.4, uniform: 0x5a2a1a, pants: 0x2a2a35, head: 'none', gun: 'smg' },
};

/* ---------------- difficulty ---------------- */
H.DIFFS = [
  { name: 'Normal', hpMul: 1, dmgMul: 1, accMul: 1, payMul: 1, xpMul: 1, spawnMul: 1, specials: 0.06 },
  { name: 'Hard', hpMul: 1.4, dmgMul: 1.3, accMul: 1.05, payMul: 2, xpMul: 2, spawnMul: 1.15, specials: 0.1 },
  { name: 'Brutal', hpMul: 2, dmgMul: 1.8, accMul: 1.1, payMul: 4, xpMul: 3, spawnMul: 1.3, specials: 0.14 },
  { name: 'Overdrive', hpMul: 3, dmgMul: 2.4, accMul: 1.2, payMul: 6.5, xpMul: 4.5, spawnMul: 1.5, specials: 0.18 },
  { name: 'Mayhem', hpMul: 4.5, dmgMul: 3.2, accMul: 1.3, payMul: 9, xpMul: 6, spawnMul: 1.7, specials: 0.22 },
  { name: 'Death Wish', hpMul: 6, dmgMul: 4.4, accMul: 1.4, payMul: 12, xpMul: 8, spawnMul: 1.9, specials: 0.26 },
  { name: 'One Down', hpMul: 7.5, dmgMul: 5.5, accMul: 1.5, payMul: 15, xpMul: 10, spawnMul: 2.1, specials: 0.3, oneDown: true },
];

/* ---------------- loot ---------------- */
H.LOOT = {
  money: { name: 'Money', value: 32000, weight: 1.0, color: 0x3a6a2a },
  gold: { name: 'Gold', value: 95000, weight: 0.55, color: 0xd8b04a },
  jewelry: { name: 'Jewelry', value: 22000, weight: 1.0, color: 0x6a3a8a },
  coke: { name: 'Cocaine', value: 38000, weight: 0.9, color: 0xeaeaea },
  art: { name: 'Painting', value: 48000, weight: 1.0, color: 0x8a5a2a, tube: true },
  weapons: { name: 'Weapons', value: 34000, weight: 0.65, color: 0x3a3a3a },
  server: { name: 'Server', value: 60000, weight: 0.6, color: 0x2a3a5a },
  meth: { name: 'Meth', value: 42000, weight: 1.0, color: 0x8ad0ff },
  diamonds: { name: 'Diamonds', value: 120000, weight: 1.0, color: 0xc0f0ff },
  bonds: { name: 'Bearer Bonds', value: 70000, weight: 1.0, color: 0xd0c090 },
  chips: { name: 'Casino Chips', value: 45000, weight: 0.9, color: 0xc02a2a },
  body: { name: 'Body Bag', value: 0, weight: 0.5, color: 0x1a1a1a },
  evidence: { name: 'Evidence', value: 40000, weight: 0.9, color: 0x5a5a6a },
  turret: { name: 'Prototype', value: 150000, weight: 0.45, color: 0x4a5a6a },
};

/* ---------------- heist contracts ----------------
 tpl: interior template in heists.js; stealth/loud allowed; loot: [type, count]; days = phases */
H.CONTRACTORS = ['The Broker', 'Vasquez', 'The Dentist', 'Mama Chen', 'The Butcher', 'Old Hank', 'Elena Voss', 'The Fixer'];
H.HEISTS = [
  { id: 'first_national', name: 'First National Branch', tpl: 'bank', by: 'The Broker', pay: 60000, stealth: true, loud: true, loot: { money: 6 }, small: 'deposit', desc: 'A suburban branch bank. Get into the vault and walk out with the cash.' },
  { id: 'gold_bank', name: 'Harbor Savings Gold', tpl: 'bank', by: 'The Broker', pay: 70000, stealth: true, loud: true, loot: { gold: 5 }, small: 'deposit', desc: 'This branch is holding a gold shipment for one night only.' },
  { id: 'diamond_bank', name: 'Pinnacle Trust Deposit', tpl: 'bank', by: 'Elena Voss', pay: 80000, stealth: true, loud: true, loot: { diamonds: 2, money: 3 }, small: 'deposit', desc: 'A private-client bank with a diamond reserve behind the main vault.' },
  { id: 'jewel_rush', name: 'Sparkle & Co.', tpl: 'jewelry', by: 'Vasquez', pay: 25000, stealth: true, loud: true, loot: { jewelry: 4 }, small: 'cases', desc: 'Smash the cases, bag the jewelry, get to the van. Fast and simple.' },
  { id: 'diamond_district', name: 'Diamond District', tpl: 'jewelry', by: 'Vasquez', pay: 40000, stealth: true, loud: true, loot: { jewelry: 3, diamonds: 1 }, small: 'cases', desc: 'An upmarket jewelers holding one loose-diamond case.' },
  { id: 'gallery', name: 'Westbrook Gallery', tpl: 'gallery', by: 'Elena Voss', pay: 50000, stealth: true, loud: true, loot: { art: 6 }, desc: 'Nine paintings are on the walls and six of them are worth stealing. Turn off the laser grid first.' },
  { id: 'museum', name: 'Midnight at the Museum', tpl: 'gallery', by: 'Elena Voss', pay: 90000, stealth: true, loud: false, loot: { art: 4, diamonds: 1 }, desc: 'Stealth only. The museum is running a gem exhibit tonight.' },
  { id: 'club', name: 'Velvet Nightclub', tpl: 'club', by: 'Mama Chen', pay: 45000, stealth: true, loud: true, loot: { coke: 4, money: 2 }, desc: 'The owner keeps cocaine in the back room and cash in the office safe.' },
  { id: 'club_raid', name: 'Last Call', tpl: 'club', by: 'The Butcher', pay: 55000, stealth: false, loud: true, loot: { coke: 6 }, desc: 'Loud only. The cartel is holed up in the club and we want their product.' },
  { id: 'docks', name: 'Pier 14 Arms', tpl: 'warehouse', by: 'The Butcher', pay: 40000, stealth: true, loud: true, loot: { weapons: 6 }, desc: 'Containers full of military hardware. Find the right crates.' },
  { id: 'docks_coke', name: 'Harbor Freight', tpl: 'warehouse', by: 'Mama Chen', pay: 50000, stealth: true, loud: true, loot: { coke: 5 }, desc: 'A rival shipment is sitting in a dockside warehouse.' },
  { id: 'evidence', name: 'Evidence Locker', tpl: 'warehouse', by: 'The Fixer', pay: 65000, stealth: true, loud: true, loot: { evidence: 4, money: 2 }, desc: 'Seized cartel money and evidence boxes in a police-held storage depot.' },
  { id: 'penthouse', name: 'Skyline Penthouse', tpl: 'mansion', by: 'Elena Voss', pay: 70000, stealth: true, loud: true, loot: { art: 2, money: 3, bonds: 1 }, desc: 'A hedge-fund manager\'s home: a wall safe, two paintings and bearer bonds.' },
  { id: 'mansion', name: 'Hillcrest Mansion', tpl: 'mansion', by: 'The Fixer', pay: 65000, stealth: true, loud: true, loot: { money: 4, jewelry: 2 }, desc: 'A senator\'s home. Cash in the safe and jewelry in the master bedroom.' },
  { id: 'casino', name: 'Golden Ace Casino', tpl: 'casino', by: 'The Broker', pay: 110000, stealth: true, loud: true, loot: { chips: 4, money: 4 }, desc: 'The counting room vault. You need two keycards to open it.' },
  { id: 'lab', name: 'Helix Laboratories', tpl: 'lab', by: 'The Fixer', pay: 80000, stealth: true, loud: true, loot: { server: 3, turret: 1 }, desc: 'Hack the servers and steal the prototype from R&D.' },
  { id: 'reserve', name: 'The Federal Reserve', tpl: 'reserve', by: 'The Broker', pay: 200000, stealth: true, loud: true, loot: { gold: 10 }, desc: 'The big one. A gold vault under the federal reserve.' },
  { id: 'mall', name: 'Shopping Spree', tpl: 'mall', by: 'Old Hank', pay: 30000, stealth: false, loud: true, loot: {}, destroy: 50000, desc: 'Loud only. Cause $50,000 in property damage to the mall.' },
  { id: 'cook', name: 'Cook Off', tpl: 'methlab', by: 'Mama Chen', pay: 35000, stealth: false, loud: true, loot: { meth: 0 }, cook: 6, desc: 'Cook meth in an abandoned lab while the police close in. Secure as many bags as you can.' },
  { id: 'armored', name: 'Armored Transport', tpl: 'truck', by: 'Old Hank', pay: 45000, stealth: false, loud: true, loot: { money: 4, gold: 1 }, desc: 'An armored truck has stopped on its route. Blow the doors and take the cash.' },
  { id: 'trainyard', name: 'Rail Yard', tpl: 'yard', by: 'The Butcher', pay: 60000, stealth: true, loud: true, loot: { weapons: 3, gold: 2 }, desc: 'Find the right cargo car at the rail yard.' },
  { id: 'servers', name: 'Election Night', tpl: 'office', by: 'The Fixer', pay: 75000, stealth: true, loud: true, loot: { server: 2, bonds: 2 }, desc: 'Rig the vote counting servers and grab the slush fund.' },
  { id: 'office_bonds', name: 'Corporate Raid', tpl: 'office', by: 'Elena Voss', pay: 60000, stealth: true, loud: true, loot: { bonds: 3, money: 2 }, desc: 'A finance firm with a vault full of bonds.' },
  { id: 'store', name: 'Corner Store Holdup', tpl: 'shop', by: 'Old Hank', pay: 6000, stealth: false, loud: true, loot: { money: 1 }, small: 'register', desc: 'Empty the register and the safe in the back.' },
  { id: 'pawn', name: 'Pawn Shop Run', tpl: 'shop', by: 'Vasquez', pay: 12000, stealth: true, loud: true, loot: { jewelry: 2 }, small: 'register', desc: 'A pawn shop that\'s been fencing stolen jewelry.' },
  { id: 'gang_hideout', name: 'Gang Hideout', tpl: 'warehouse', by: 'The Butcher', pay: 50000, stealth: false, loud: true, loot: { money: 3, coke: 2 }, gang: true, desc: 'A street gang is holding money and drugs here. They shoot back.' },
  { id: 'casino_chips', name: 'High Roller Suite', tpl: 'casino', by: 'Vasquez', pay: 90000, stealth: true, loud: true, loot: { chips: 6 }, desc: 'Fill bags with chips in the VIP room.' },
  { id: 'reserve_bonds', name: 'Reserve Records', tpl: 'reserve', by: 'The Fixer', pay: 150000, stealth: true, loud: true, loot: { bonds: 4, gold: 4 }, desc: 'Bonds and gold from the records annex.' },
];
// Every building template can also be targeted by a Custom Heist built in the planner.
H.TEMPLATES = {
  bank: { name: 'Bank', w: 44, d: 34 }, jewelry: { name: 'Jewelry Store', w: 26, d: 18 }, gallery: { name: 'Art Gallery', w: 46, d: 34 },
  club: { name: 'Nightclub', w: 40, d: 30 }, warehouse: { name: 'Warehouse', w: 50, d: 36 }, mansion: { name: 'Mansion', w: 44, d: 34 },
  casino: { name: 'Casino', w: 56, d: 42 }, lab: { name: 'Laboratory', w: 46, d: 34 }, reserve: { name: 'Federal Reserve', w: 60, d: 46 },
  mall: { name: 'Shopping Mall', w: 60, d: 44 }, methlab: { name: 'Drug Lab', w: 30, d: 22 }, truck: { name: 'Armored Truck', w: 40, d: 30 },
  yard: { name: 'Rail Yard', w: 64, d: 46 }, office: { name: 'Office Block', w: 44, d: 32 }, shop: { name: 'Corner Store', w: 18, d: 14 },
};
H.ASSETS = [
  { id: 'inside', name: 'Inside Man', cost: 20000, desc: 'A keycard is waiting for you at the entrance.' },
  { id: 'bags', name: 'Extra Body Bags', cost: 4000, desc: '+2 body bags.' },
  { id: 'ammo', name: 'Ammo Drop', cost: 6000, desc: 'An ammo bag is placed near the entrance.' },
  { id: 'medic', name: 'Medic Drop', cost: 8000, desc: 'A doctor bag is placed near the entrance.' },
  { id: 'sniper', name: 'Rooftop Sniper', cost: 15000, desc: 'A hired sniper covers you from a nearby rooftop during loud.' },
  { id: 'blueprint', name: 'Blueprints', cost: 5000, desc: 'Shows guards, cameras and loot on your map.' },
  { id: 'van2', name: 'Getaway Van Closer', cost: 6000, desc: 'The van parks right at the door.' },
  { id: 'pagerfix', name: 'Bribed Dispatcher', cost: 12000, desc: '+1 pager you can answer.' },
  { id: 'nocams', name: 'Camera Loop', cost: 10000, desc: 'Cameras are disabled at the start.' },
  { id: 'delay', name: 'Slow Response', cost: 9000, desc: 'Police arrive 30s later after the alarm.' },
];
H.CREW_NAMES = ['Ace', 'Fox', 'Mole', 'Tank', 'Ruby', 'Ghost', 'Bear', 'Clover'];
H.LEVEL_XP = l => Math.round(900 + l * l * 55);
