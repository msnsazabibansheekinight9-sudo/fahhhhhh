// ============================================================================
// EXTRACTION — a hardcore loot-and-extract mode.
//   Hideout: a persistent stash and money. Traders sell every gun in the
//     armory (with the build you saved there) and every kit item from the
//     kit locker. Sell loot back for money. Insure what you take in.
//   Raid: choose a map, time of day and side. As a PMC you bring your own
//     gear and lose it if you die; as a scav you get a free random loadout
//     (with a cooldown). Each raid has a timer; leave before it runs out or
//     you are missing in action.
//   On the map: scavs guard and wander, rival PMC squads hunt for loot (and
//     for you), and a boss with his guards holds the main structure. Scavs
//     and PMCs fight each other too. Search containers and bodies (F), manage
//     your inventory (Tab), patch bleeding and heal (5). Extract by standing
//     in an exfil zone; some need money, an empty back, or open late.
// Maps are original locations built from the mission structures plus a
// forest map. Everything uses the armory's weapons and the kit locker's gear.
// ============================================================================
'use strict';
(function () {
const G = window.G, Game = G.Game, PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const { gBox, gCylY } = G.geo;
const X = G.Raid = {};
const pick = (l, R = Math.random) => l[Math.floor(R() * l.length)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = n => '₮' + Math.round(n).toLocaleString('en-US');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ------------------------------------------------------------------ loot
// cat: valuable, tech, med, food, ammo, info, hardware; v: trader value; sz: inventory slots; w: rarity weight
G.LOOT = [
  { id: 'l_bolts', n: 'Box of bolts', cat: 'hardware', v: 4000, sz: 1, w: 10 }, { id: 'l_tape', n: 'Duct tape', cat: 'hardware', v: 6000, sz: 1, w: 10 },
  { id: 'l_wires', n: 'Bundle of wires', cat: 'hardware', v: 5000, sz: 1, w: 10 }, { id: 'l_hose', n: 'Corrugated hose', cat: 'hardware', v: 9000, sz: 2, w: 6 },
  { id: 'l_battery', n: 'Car battery', cat: 'hardware', v: 22000, sz: 4, w: 4 }, { id: 'l_fuel', n: 'Jerrycan of fuel', cat: 'hardware', v: 30000, sz: 4, w: 3 },
  { id: 'l_tools', n: 'Socket wrench set', cat: 'hardware', v: 14000, sz: 2, w: 5 }, { id: 'l_drill', n: 'Cordless drill', cat: 'hardware', v: 26000, sz: 2, w: 3 },
  { id: 'l_cpu', n: 'CPU', cat: 'tech', v: 18000, sz: 1, w: 6 }, { id: 'l_ram', n: 'RAM stick', cat: 'tech', v: 9000, sz: 1, w: 8 },
  { id: 'l_gpu', n: 'Graphics card', cat: 'tech', v: 190000, sz: 2, w: .8 }, { id: 'l_ssd', n: 'Solid-state drive', cat: 'tech', v: 24000, sz: 1, w: 5 },
  { id: 'l_phone', n: 'Smartphone', cat: 'tech', v: 15000, sz: 1, w: 8 }, { id: 'l_radio', n: 'Military radio', cat: 'tech', v: 60000, sz: 2, w: 2 },
  { id: 'l_board', n: 'Military circuit board', cat: 'tech', v: 45000, sz: 1, w: 2 }, { id: 'l_drone', n: 'Quadcopter drone', cat: 'tech', v: 80000, sz: 3, w: 1 },
  { id: 'l_tablet', n: 'Rugged tablet', cat: 'tech', v: 70000, sz: 2, w: 1.2 }, { id: 'l_nvtube', n: 'Image-intensifier tube', cat: 'tech', v: 120000, sz: 1, w: .6 },
  { id: 'l_chain', n: 'Gold chain', cat: 'valuable', v: 28000, sz: 1, w: 4 }, { id: 'l_watch', n: 'Luxury wristwatch', cat: 'valuable', v: 65000, sz: 1, w: 1.5 },
  { id: 'l_ring', n: 'Diamond ring', cat: 'valuable', v: 90000, sz: 1, w: .8 }, { id: 'l_coin', n: 'Physical bitcoin', cat: 'valuable', v: 300000, sz: 1, w: .25 },
  { id: 'l_ingot', n: 'Gold ingot', cat: 'valuable', v: 220000, sz: 1, w: .35 }, { id: 'l_cash', n: 'Wad of US dollars', cat: 'valuable', v: 40000, sz: 1, w: 3 },
  { id: 'l_icon', n: 'Antique icon', cat: 'valuable', v: 110000, sz: 2, w: .6 }, { id: 'l_vodka', n: 'Bottle of vodka', cat: 'food', v: 12000, sz: 1, w: 7 },
  { id: 'l_mre', n: 'MRE ration', cat: 'food', v: 8000, sz: 1, w: 8 }, { id: 'l_water', n: 'Bottle of water', cat: 'food', v: 5000, sz: 1, w: 10 },
  { id: 'l_cigs', n: 'Carton of cigarettes', cat: 'food', v: 10000, sz: 1, w: 7 }, { id: 'l_coffee', n: 'Coffee beans', cat: 'food', v: 9000, sz: 1, w: 6 },
  { id: 'l_flash', n: 'Encrypted flash drive', cat: 'info', v: 75000, sz: 1, w: 1 }, { id: 'l_folder', n: 'Folder of intelligence', cat: 'info', v: 150000, sz: 1, w: .5 },
  { id: 'l_diary', n: 'Officer\'s diary', cat: 'info', v: 35000, sz: 1, w: 2 }, { id: 'l_map', n: 'Marked map', cat: 'info', v: 45000, sz: 1, w: 1.5 },
  { id: 'l_ammo', n: 'Pack of rifle ammunition', cat: 'ammo', v: 15000, sz: 1, w: 8, ammo: 60 }, { id: 'l_ammo2', n: 'Ammo can', cat: 'ammo', v: 40000, sz: 2, w: 3, ammo: 200 },
  { id: 'l_grenade', n: 'Hand grenade', cat: 'ammo', v: 14000, sz: 1, w: 4, exp: 'm67' }, { id: 'l_flashbang', n: 'Stun grenade', cat: 'ammo', v: 10000, sz: 1, w: 3, exp: 'm84' },
  { id: 'l_bandage', n: 'Bandage', cat: 'med', v: 4000, sz: 1, w: 12, med: 'bandage' }, { id: 'l_tourniquet', n: 'CAT tourniquet', cat: 'med', v: 9000, sz: 1, w: 6, med: 'tq' },
  { id: 'l_ifak', n: 'IFAK', cat: 'med', v: 18000, sz: 1, w: 5, med: 'ifak' }, { id: 'l_medkit', n: 'Trauma kit', cat: 'med', v: 35000, sz: 2, w: 2.5, med: 'kit' },
  { id: 'l_morphine', n: 'Morphine auto-injector', cat: 'med', v: 22000, sz: 1, w: 3, med: 'morphine' }, { id: 'l_ledx', n: 'Portable vein scanner', cat: 'med', v: 260000, sz: 1, w: .3 },
];
G.LOOTID = Object.fromEntries(G.LOOT.map(l => [l.id, l]));
const MEDS = { bandage: { n: 'bandage', heal: 0, bleed: 1, t: 2 }, tq: { n: 'tourniquet', heal: 0, bleed: 3, t: 2.5 }, ifak: { n: 'IFAK', heal: 35, bleed: 2, t: 3 }, kit: { n: 'trauma kit', heal: 80, bleed: 3, t: 5 }, morphine: { n: 'morphine', heal: 20, bleed: 0, t: 1.2 } };
const CONT = { // container kinds: name, colour, size, loot categories, slots
  crate: ['Wooden crate', '#7a5a34', [.9, .6, .6], ['hardware', 'food', 'ammo'], [1, 3]],
  weapon: ['Weapon box', '#3e4a2e', [1.2, .45, .5], ['ammo', 'ammo', 'tech'], [1, 3], true],
  jacket: ['Jacket', '#4a4a3a', [.5, .7, .1], ['food', 'valuable', 'info', 'med'], [0, 2]],
  med: ['Medical bag', '#c8c8c0', [.5, .35, .3], ['med', 'med', 'med'], [1, 3]],
  tool: ['Toolbox', '#b02a1a', [.6, .3, .3], ['hardware', 'hardware', 'tech'], [1, 3]],
  pc: ['PC tower', '#2a2a2c', [.25, .5, .5], ['tech', 'tech'], [1, 2]],
  safe: ['Safe', '#3a3c40', [.6, .7, .6], ['valuable', 'valuable', 'info'], [1, 3]],
  duffle: ['Duffle bag', '#3a4030', [.8, .35, .35], ['food', 'med', 'ammo', 'valuable', 'tech'], [1, 4]],
};

// ------------------------------------------------------------------ maps
// core: a mission structure in the middle (its guards become the boss and his guards); B: half-size of the map in metres
G.RAID_MAPS = [
  { id: 'pinewood', n: 'Pinewood', d: 'Dense pine forest with a sawmill, hunters\' cabins and an abandoned army camp. Long sightlines between the trunks.', core: null, B: 420, time: 55, ground: 'grass', env: 'forest',
    ex: [['Logging road', [0, 1], 'open'], ['Lake bridge', [-1, 0], 'open'], ['Forest ranger post', [1, -.2], 'chance'], ['Mountain trail', [.6, -1], 'nopack'], ['Truck to town', [-.7, .9], 'pay']] },
  { id: 'hub', n: 'Logistics Hub', d: 'A bonded warehouse in a sprawl of container stacks, sheds and cranes on the waterfront.', core: 'warehouse', B: 400, time: 55, style: 'dock',
    ex: [['Crane gate', [1, .6], 'open'], ['Rail crossing', [-1, -.4], 'open'], ['Boat dock', [.2, -1], 'late'], ['Scav checkpoint', [-.5, 1], 'scav'], ['Smuggler\'s van', [-1, .8], 'pay']] },
  { id: 'oldtown', n: 'Old Town', d: 'A walled consulate in the old quarter: tight streets, courtyards and rooftops.', core: 'embassy', B: 400, time: 55, style: 'urban',
    ex: [['Tram depot', [1, 1], 'open'], ['Sewer outlet', [-1, -.3], 'nopack'], ['Cathedral steps', [0, -1], 'open'], ['Taxi rank', [-.8, .9], 'pay'], ['Military roadblock', [1, -.6], 'chance']] },
  { id: 'plaza', n: 'Meridian Plaza', d: 'A business hotel at the heart of a shopping district — the lobby, the ballroom and the shops around it.', core: 'hotel', B: 400, time: 55, style: 'urban',
    ex: [['Parking garage', [1, .5], 'open'], ['Loading bay', [-1, .2], 'open'], ['Metro entrance', [0, -1], 'late'], ['Hotel shuttle', [-.6, 1], 'pay'], ['Fire escape', [.9, -.9], 'nopack']] },
  { id: 'junction', n: 'Rail Junction', d: 'A stalled express in a rail yard full of wagons, signal huts and sidings.', core: 'train', B: 420, time: 60, style: 'yard',
    ex: [['Armoured train', [0, 1], 'late'], ['Signal box', [1, -.5], 'open'], ['Freight tunnel', [-1, .3], 'open'], ['Handcar', [.7, 1], 'chance'], ['Bridge underpass', [-.4, -1], 'nopack']] },
  { id: 'airfield', n: 'Northern Airfield', d: 'A regional airport: the hijacked airliner on the apron, hangars, fuel trucks and an open runway.', core: 'airliner', B: 440, time: 60, style: 'airport',
    ex: [['Runway end', [0, -1], 'open'], ['Perimeter gap', [1, .3], 'open'], ['Cargo plane', [-1, -.6], 'late'], ['Fuel convoy', [-.8, 1], 'pay'], ['Drainage culvert', [1, -1], 'nopack']] },
  { id: 'fortress', n: 'Desert Fortress', d: 'A walled compound among adobe villages, dry wadis and burnt-out technicals.', core: 'compound', B: 400, time: 55, style: 'desert',
    ex: [['Wadi', [-1, 0], 'open'], ['Goat track', [1, .7], 'nopack'], ['Smuggler\'s pickup', [0, 1], 'pay'], ['Helicopter LZ', [.5, -1], 'late'], ['Village well', [-.8, -.8], 'chance']] },
  { id: 'portside', n: 'Portside Terminal', d: 'A container ship tied up in a sprawling container port. Fight through the stacks, cranes and sheds, then up the superstructure.', core: 'ship', B: 240, time: 45, quay: true,
    ex: [['North quay gate', [45, -224], 'open'], ['South quay gate', [45, 224], 'open'], ['Port main gate', [232, 0], 'open'], ['Pilot boat', [72, -20], 'pay'], ['Rail spur', [215, -210], 'chance'], ['Bow rope', [0, -46], 'nopack']] },
];
G.RAID_MAP = Object.fromEntries(G.RAID_MAPS.map(m => [m.id, m]));
const EXK = { open: 'Always open', chance: 'Open in some raids', nopack: 'No backpack (too narrow)', pay: 'Costs ₮7,000', late: 'Opens after 10 min', scav: 'Scavs only' };

// ------------------------------------------------------------------ prices
const ERA_K = { ww1: .55, ww2: .65, cold: .8, mod: 1, now: 1.25, psycho: 3 };
const CLS_P = { PST: 18000, SMG: 32000, CAR: 42000, AR: 52000, BR: 62000, DMR: 78000, SR: 88000, LMG: 105000, SG: 28000, RIF: 24000 };
G.priceAtt = at => { if (!at || G.DEFAULT_IDS.includes(at.id)) return 0; const s = at.s || {}; let p = 2500; if (s.zoom > 1) p += s.zoom * 2600; if (s.zoom === 1) p += 9000; if (s.sup) p += 18000; if (s.nv) p += 70000; if (s.thermal) p += 110000; if (s.lrf) p += 25000; if (s.bc) p += 30000; if (s.gl) p += 30000; if (s.light || s.laser) p += 9000; if (s.mag) p += 6000; return Math.round(p * (at.psy ? 3 : 1)); };
G.priceWeapon = (wp, L) => Math.round((CLS_P[wp.c] || 40000) * (ERA_K[wp.e] || 1) + Object.values(L || {}).reduce((s, id) => s + G.priceAtt(G.ATT[id]), 0));
G.priceGear = g => { if (!g || /_none$|^g_none$/.test(g.id)) return 0; let p = 3000;
  if (g.slot === 'helmet') p = 6000 + (g.rating || 0) * 9000 + (g.visor || 0) * 6000;
  else if (g.slot === 'armor') p = 9000 + (g.soft || 0) * 8000 + (g.fixed ? g.fixed.rating * 7000 : 0) + (g.plates ? 14000 : 0) + (g.limbs || 0) * 6000 + (g.blast ? (1 - g.blast) * 60000 : 0);
  else if (g.slot === 'plates') p = (g.rating || 0) * 9000;
  else if (g.slot === 'nvg') p = g.nv ? 40000 + g.nv.q * 120000 + (g.nv.thermal ? 150000 : 0) : 0;
  else if (g.slot === 'comms') p = 22000; else if (g.slot === 'face') p = 3000 + (g.face || 0) * 7000; else if (g.slot === 'boots') p = 6000; else if (g.slot === 'gloves') p = 2500; else if (g.slot === 'uniform') p = 4000;
  else if (g.slot === 'pack') p = 5000 + ((G.gearProps(g).mods.mags || 0) * 7000);
  return Math.round(p * (/psy/.test(g.id) ? 3 : 1)); };
const itemPrice = it => it.t === 'w' ? G.priceWeapon(G.WEAPON[it.id], it.L) : it.t === 'g' ? G.priceGear(G.GEARID[it.id]) : (G.LOOTID[it.id] || {}).v || 0;
const itemName = it => it.t === 'w' ? (G.WEAPON[it.id] || {}).n : it.t === 'g' ? (G.GEARID[it.id] || {}).n : (G.LOOTID[it.id] || {}).n;
const itemSize = it => it.t === 'w' ? ({ PST: 2, SMG: 6, CAR: 8, AR: 8, BR: 10, DMR: 10, SR: 12, LMG: 12, SG: 8, RIF: 10 }[(G.WEAPON[it.id] || {}).c] || 8) : it.t === 'g' ? ({ helmet: 4, armor: 9, plates: 2, nvg: 2, comms: 1, face: 1, gloves: 1, boots: 4, pack: 6, uniform: 4 }[(G.GEARID[it.id] || {}).slot] || 2) : (G.LOOTID[it.id] || {}).sz || 1;
X.itemPrice = itemPrice; X.itemName = itemName;

// ------------------------------------------------------------------ stash (persistent)
const KEY = 'ironsight.stash';
X.load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.items) return v; } catch (e) {} return X.fresh(); };
X.fresh = () => ({ money: 600000, items: [
  { t: 'w', id: 'akm', L: G.defaultLoadout(G.WEAPON.akm), u: uid() }, { t: 'w', id: 'makarov', L: G.defaultLoadout(G.WEAPON.makarov), u: uid() },
  { t: 'g', id: 'h_ssh68', u: uid() }, { t: 'g', id: 'a_6b23', u: uid() }, { t: 'g', id: 'k_rd54', u: uid() }, { t: 'g', id: 'u_ru_flora', u: uid() }, { t: 'g', id: 'b_kirza', u: uid() },
  { t: 'l', id: 'l_bandage', u: uid() }, { t: 'l', id: 'l_bandage', u: uid() }, { t: 'l', id: 'l_ifak', u: uid() }],
  xp: 0, raids: 0, survived: 0, kills: 0, scavCD: 0, prep: {}, log: [] });
X.save = () => { try { localStorage.setItem(KEY, JSON.stringify(X.stash)); } catch (e) {} };
X.stash = X.load();
X.level = xp => Math.floor(Math.sqrt((xp || 0) / 900)) + 1;

// ------------------------------------------------------------------ inventory capacity
X.capacity = kit => {
  const A = G.GEARID[kit.armor] || {}, K = G.GEARID[kit.pack] || {};
  let c = 4; // pockets
  if (A.id && A.id !== 'a_none' && !A.cat) c += A.model === 'rig' ? 6 : A.plates ? 4 : 3;
  if (K.model) { const n = (K.n + K.id).toLowerCase(); c += /molle|bergen|eberlestock|alice/.test(n) ? 26 : /assault|mystery|rd-54|rd54|3 day|tornister|sidor/.test(n) ? 16 : /haversack/.test(n) ? 10 : /radio|prc/.test(n) ? 6 : 3; }
  return c;
};
const used = inv => inv.reduce((s, it) => s + itemSize(it), 0);

// ------------------------------------------------------------------ random gear and weapons for bots and scav runs
const NONPSY = () => G.WEAPONS.filter(w => w.e !== 'psycho' && !w.custom && !(G.ERA[w.e] || {}).noWar && !w.heavy);
function randWeapon(q, R) {
  let pool = NONPSY();
  if (q === 0) pool = pool.filter(w => ['ww2', 'cold', 'mod'].includes(w.e) && w.c !== 'SR');
  else if (q >= 2) pool = pool.filter(w => ['mod', 'now'].includes(w.e) && ['AR', 'CAR', 'BR', 'DMR', 'SMG', 'LMG', 'SG'].includes(w.c));
  pool = pool.filter(w => w.c !== 'PST' || R() < .05);
  return pick(pool, R);
}
function randKit(q, night, R) {
  const kit = {}, F = (slot, fn, pNone = 0) => { const l = G.gearFor(slot).filter(g => (!g.cat || R() < .015) && fn(g)); const none = G.gearFor(slot).find(g => /_none$|^g_none$/.test(g.id)); kit[slot] = (R() < pNone && none) || !l.length ? (none || G.gearFor(slot)[0]).id : pick(l, R).id; };
  F('uniform', g => q < 2 ? true : g.y >= 1980 && !/civ|crew|suit/.test(g.id));
  F('helmet', g => q === 0 ? (g.rating || 0) <= 2.2 : q === 1 ? (g.rating || 0) >= 1.8 : (g.rating || 0) >= (q >= 3 ? 4.2 : 3.2), q === 0 ? .45 : 0);
  F('armor', g => q === 0 ? !g.plates && (g.soft || 0) <= 2.8 && !g.fixed : q === 1 ? (g.soft || 0) >= 2 || g.plates : g.plates && g.y >= 1995, q === 0 ? .4 : 0);
  F('plates', g => q < 2 ? (g.rating || 0) <= 7.8 : (g.rating || 0) >= (q >= 3 ? 14 : 7.8));
  F('nvg', g => !!g.nv && (q >= 2 || g.nv.q < .8), night ? (q >= 2 ? .1 : .7) : 1);
  F('face', () => true, .5); F('comms', () => true, q >= 2 ? .2 : .85); F('gloves', () => true, .4); F('boots', () => true); F('pack', () => true, q === 0 ? .5 : .25);
  if (q >= 3) { kit.armor = pick(['a_6b43', 'a_iotv', 'a_6b45', 'a_avs', 'a_eod9'], R); if (!G.GEARID[kit.armor]) kit.armor = 'a_iotv'; kit.helmet = pick(['h_altyn', 'h_lshz', 'h_rf1'], R); kit.plates = pick(['p_granit', 'p_xsapi', 'p_esapi'], R); }
  for (const [s] of G.GEAR_SLOTS) if (!G.GEARID[kit[s]]) kit[s] = G.gearFor(s)[0].id;
  return kit;
}
X.randKit = randKit; X.randWeapon = randWeapon; X.forest = (W, Mp, R) => forest(W, Mp, R);
const SCAV_N = ['Vasya', 'Kolya', 'Lyokha', 'Sanya', 'Zhenya', 'Tolik', 'Grisha', 'Fedya', 'Petya', 'Slava', 'Dima', 'Borya', 'Yura', 'Misha', 'Venya', 'Stas', 'Gosha', 'Roma'];
const PMC_N = ['Reaper', 'Nomad', 'Havoc', 'Specter', 'Atlas', 'Bishop', 'Crowbar', 'Dagger', 'Echo', 'Fury', 'Gunny', 'Hex', 'Ivan', 'Jinx', 'Kilo', 'Lynx'];

// ------------------------------------------------------------------ world building
function freeAt(W, x, z, y, r = .5) {
  const gy = W.groundAt(x, z, y + 1.5, .2); if (Math.abs(gy - y) > .3) return null;
  for (const c of W.near(x - r - 1, z - r - 1, x + r + 1, z + r + 1)) { if (c.soft || c.noMove) continue; if (c.max.x > x - r && c.min.x < x + r && c.max.z > z - r && c.min.z < z + r && c.max.y > gy + .2 && c.min.y < gy + 1.7) return null; }
  return gy;
}
function forest(W, Mp, R) {
  const H = G.MissionHelpers, B = Mp.B, posts = [], surf = (k, r) => G.surf(k, r);
  // stands of pine with clearings between them, birch at the edges, undergrowth
  const stands = Array.from({ length: 150 }, () => [(R() - .5) * 2 * (B - 10), (R() - .5) * 2 * (B - 10), 14 + R() * 30]);
  const clear = (x, z) => Math.hypot(x - 30, z + 40) < 22 || Math.hypot(x + 50, z + 20) < 30 || Math.hypot(x, z) < 12;
  for (let i = 0; i < 3600; i++) { const st = stands[i % stands.length], a = R() * PI * 2, r = Math.sqrt(R()) * st[2], x = i < 2900 ? st[0] + Math.cos(a) * r : (R() - .5) * 2 * (B - 6), z = i < 2900 ? st[1] + Math.sin(a) * r : (R() - .5) * 2 * (B - 6);
    if (Math.abs(x) > B - 4 || Math.abs(z) > B - 4 || clear(x, z)) continue;
    W.tree(x, z, 9 + R() * 9, R() < .88 ? 'pine' : 'birch'); W.addCol(V3(x - .35, 0, z - .35), V3(x + .35, 6, z + .35), 'wood'); }
  for (let i = 0; i < 1200; i++) { const x = (R() - .5) * 2 * (B - 6), z = (R() - .5) * 2 * (B - 6); if (clear(x, z)) continue; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.6 + R() * .8, 0), surf('hedge')); m.position.set(x, .35, z); m.scale.y = .7; W.static.add(m); }
  for (let i = 0; i < 300; i++) { const x = (R() - .5) * 2 * (B - 10), z = (R() - .5) * 2 * (B - 10); W.box(x, 0, z, 2 + R() * 3, .8 + R() * 1.6, 2 + R() * 3, surf('stone', 1), 'stone'); if (R() < .3) posts.push([x + 2.6, 0, z, R() * 6, 1]); }
  for (let i = 0; i < 110; i++) { const x = (R() - .5) * 2 * (B - 20), z = (R() - .5) * 2 * (B - 20); for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(gCylY(.3, .3, 6, 8), surf('bark')); l.rotation.z = PI / 2; l.position.set(x, .3 + k * .55, z + k * .3 - .3); W.static.add(l); } W.addCol(V3(x - 3, 0, z - .9), V3(x + 3, 1.4, z + .9), 'wood'); }
  // sawmill, cabins, army camp
  H.room(W, 30, -40, 20, 12, 6, 0, { mat: 'planks', doors: { s: [.3, .7], n: [.5] }, win: { e: [.5], w: [.5] } }); posts.push([30, 0, -40, 0], [24, 0, -33, 0], [38, 0, -48, PI]);
  const cabins = [[-90, 60], [100, 90], [-120, -100], [80, -120], [-30, 120]]; for (let i = 0; i < 26; i++) cabins.push([(R() - .5) * 2 * (B - 30), (R() - .5) * 2 * (B - 30)]);
  // a second camp and a hunting lodge far out
  for (const [cx, cz] of [[B * .55, -B * .5], [-B * .6, B * .55]]) { for (let i = 0; i < 5; i++) { const x = cx + (i % 3) * 9, z = cz + Math.floor(i / 3) * 10; H.room(W, x, z, 6, 4, 2.6, 0, { mat: 'olive', doors: { s: [.5] } }); posts.push([x, 0, z + 3.4, R() * 6]); } W.box(cx - 8, 0, cz - 6, 2, 6, 2, surf('planks', 1), 'wood'); H.slab(W, cx - 8, 6, cz - 6, 3, 3, 'planks'); posts.push([cx - 8, 6, cz - 6, R() * 6, 1]); }
  for (const [x, z] of cabins) { H.room(W, x, z, 6, 5, 3, 0, { mat: 'planks', doors: { s: [.5] }, win: { e: [.5], n: [.5] } }); posts.push([x, 0, z, R() * 6], [x + 4.5, 0, z + 3, R() * 6]); }
  for (let i = 0; i < 6; i++) { const x = -60 + (i % 3) * 9, z = -20 + Math.floor(i / 3) * 10; H.room(W, x, z, 6, 4, 2.6, 0, { mat: 'olive', doors: { s: [.5] }, roof: true }); posts.push([x, 0, z + 3.4, R() * 6]); }
  for (const [x, z] of [[-70, -32], [-40, -32]]) { W.box(x, 0, z, 2, 6, 2, surf('planks', 1), 'wood'); H.slab(W, x, 6, z, 3, 3, 'planks'); posts.push([x, 6, z, R() * 6, 1]); }
  W.vehicle(-52, -40, .4, 'truck'); W.vehicle(-30, -10, 1.2, 'burnt');
  return posts;
}
function buildRaid(W, Mp, M, R) {
  const H = G.MissionHelpers;
  let posts = [];
  if (Mp.env === 'forest') posts = forest(W, Mp, R);
  else {
    M.build(W);
    if (Mp.quay) posts = H.outskirts(W, M, Object.assign({}, M.out, { max: 40, guardP: .5, falloff: 0 }));
    else { const av = M.out.avoid || [], B = Mp.B; posts = H.outskirts(W, M, { style: Mp.style, bounds: B, regions: [[-B + 8, -B + 8, B - 8, B - 8]], avoid: av, start: [0, B - 6], max: 60, cell: 25, density: .56, guardP: .4, seed: 1 + Math.floor(R() * 999) }); }
  }
  W.bounds = Mp.B; W.border(4);
  return posts;
}

// ------------------------------------------------------------------ start a raid
// cfg: { map, tod, side: 'pmc'|'scav', primary, secondary, kit, inv: [items], insured: [uids] }
X.start = function (cfg) {
  Game.mode = 'mission'; Game.state = 'play';
  Game.cleanup(true);
  const Mp = G.RAID_MAP[cfg.map], M = Mp.core ? G.MISSION[Mp.core] : null, tod = G.TOD[cfg.tod] || G.TOD.day, R = G.rng(Date.now() % 100000);
  let posts = [];
  const map = { id: 'raid_' + Mp.id, era: 'mod', name: Mp.n, size: Mp.B, env: tod.env, ground: Mp.ground || (M && M.ground) || 'dirt', weather: M && (M.weather || {})[cfg.tod] || null, amb: M ? M.amb : 'wind', reverb: M ? M.reverb : 'outdoor',
    build: W => { posts = buildRaid(W, Mp, M, R); } };
  G.E.loadMap(map);
  const W = G.E.world, B = Mp.B, base = Mp.quay ? 2.3 : 0;
  // spawn on the map edge
  const spot = (x, z, y = base) => { for (let k = 0; k < 40; k++) { const xx = x + (R() - .5) * k * 1.5, zz = z + (R() - .5) * k * 1.5; const gy = freeAt(W, xx, zz, y); if (gy !== null) return V3(xx, gy, zz); } return V3(x, y, z); };
  const edge = () => { const a = R() * PI * 2; return Mp.quay ? spot(30 + R() * 190, (R() < .5 ? -1 : 1) * (80 + R() * 140)) : spot(Math.cos(a) * B * .88, Math.sin(a) * B * .88); };
  const P = Game.player = new G.Player();
  P.kit = Object.assign({}, cfg.kit); P.km = G.kitMods(P.kit, G.kitEnv()); P.kmT = 0; P.kitKg = G.kitWeight(P.kit); P.kitK = Math.max(.72, Math.min(1.04, 1.04 - Math.max(0, P.kitKg - 5) * .012));
  P.setupWeapons([cfg.primary, cfg.secondary].filter(Boolean));
  const sp = edge(); P.pos.copy(sp); P.yaw = Math.atan2(sp.x, sp.z); P.pitch = 0; P.hp = 100; P.alive = true; P.armorState = G.newArmorState();
  P.team = cfg.side === 'scav' ? 1 : 0;
  // extracts
  const exList = Mp.ex.filter(e => e[2] !== 'scav' || cfg.side === 'scav').map(([n, at, kind]) => {
    const x = Mp.quay ? at[0] : at[0] * B * .93, z = Mp.quay ? at[1] : at[1] * B * .93, p = spot(x, z, Mp.quay && Math.abs(at[0]) < 10 ? 6 : base);
    const open = kind === 'chance' ? R() < .6 : true;
    // marker: a post with a green light on top and a sign board
    const pole = new THREE.Mesh(gBox(.12, 3, .12), G.mat({ color: '#2a2a28' })); pole.position.set(p.x, p.y + 1.5, p.z); W.static.add(pole);
    const lamp = new THREE.Mesh(gBox(.3, .3, .3), G.mat({ color: open ? '#3aff6a' : '#ff4a3a', emissive: open ? '#3aff6a' : '#ff4a3a', emissiveIntensity: 2 })); lamp.position.set(p.x, p.y + 3.1, p.z); W.static.add(lamp);
    const board = new THREE.Mesh(gBox(1.2, .5, .05), G.mat({ color: '#d8d2b8' })); board.position.set(p.x, p.y + 2.3, p.z); W.static.add(board);
    return { n, kind, pos: p, r: 6, open, lamp };
  });
  // containers: in and around buildings, plus in the core
  const conts = [];
  const addCont = (kind, p, ry = 0) => { const c = CONT[kind], m = new THREE.Mesh(gBox(...c[2]), G.mat({ color: c[1], roughness: .7 })); m.position.set(p.x, p.y + c[2][1] / 2, p.z); m.rotation.y = ry; m.castShadow = true; W.static.add(m);
    const n = c[4][0] + Math.floor(R() * (c[4][1] - c[4][0] + 1)), items = [];
    for (let i = 0; i < n; i++) items.push(rollLoot(c[3], R, kind === 'safe' ? 2 : 1));
    if (c[5] && R() < .35) { const wp = randWeapon(1, R); items.push({ t: 'w', id: wp.id, L: G.botLoadout(wp, 'rifleman', 1, false, R), u: uid() }); }
    if (kind === 'weapon' && R() < .4) items.push({ t: 'g', id: pick(G.gearFor(pick(['helmet', 'armor', 'plates', 'nvg', 'comms'], R)).filter(g => !g.cat && !/_none$/.test(g.id)), R).id, u: uid() });
    conts.push({ kind, n: c[0], pos: p.clone().setY(p.y + .4), items, searched: 0, mesh: m }); };
  const kinds = Object.keys(CONT);
  for (let i = 0, tries = 0; i < (Mp.quay ? 110 : 200) && tries < 3000; tries++) {
    const x = Mp.quay ? 15 + R() * 220 : (R() - .5) * 2 * (B - 10), z = Mp.quay ? (R() - .5) * 450 : (R() - .5) * 2 * (B - 10), y = freeAt(W, x, z, base);
    if (y === null) continue;
    // prefer spots next to something (a wall within 2.5 m)
    let near = false; for (const c of W.near(x - 3, z - 3, x + 3, z + 3)) if (!c.soft && c.max.y > y + 1 && c.min.y < y + 1 && c.max.x > x - 2.5 && c.min.x < x + 2.5 && c.max.z > z - 2.5 && c.min.z < z + 2.5) { near = true; break; }
    if (!near && R() < .8) continue;
    addCont(pick(kinds.filter(k => k !== 'safe'), R), V3(x, y, z), R() * PI); i++;
  }
  if (M) for (const g of M.guards) { const p = V3(g[0] + (R() - .5) * 2, g[1], g[2] + (R() - .5) * 2); const y = freeAt(W, p.x, p.z, g[1], .35); if (y !== null && R() < .7) addCont(pick(['safe', 'weapon', 'pc', 'duffle', 'jacket', 'med'], R), p.setY(y), R() * PI); }
  // hostiles
  Game.bots = [];
  const night = cfg.tod === 'night', role = id => G.HOSTILE_ROLES.find(r => r.id === id) || G.HOSTILE_ROLES[0];
  const mk = (team, q, pos, yaw, guard, rl, name) => {
    const tier = ['recruit', 'regular', 'veteran', 'elite'][Math.min(3, q + (R() < .3 ? 1 : 0))], wp = q >= 3 ? pick(NONPSY().filter(w => ['LMG', 'BR'].includes(w.c) && ['mod', 'now'].includes(w.e)), R) : randWeapon(q, R);
    const L = G.botLoadout(wp, rl.id, q, night, R), kit = randKit(q, night, R);
    const b = new G.Bot(Game, team, tier, 'mod', Game.bots.length, { wp, L, kit, look: 'mod', name });
    b.role = rl; b.kit = kit; b.armorState = G.newArmorState(); b.raidQ = q;
    if (guard) b.guard = { pos: pos.clone(), yaw, crouch: !!guard.crouch, leash: rl.rush || 0 };
    b.spawn(pos.clone().setY(pos.y + .05)); b.yaw = yaw; b.spawnProt = 0;
    Game.bots.push(b); return b;
  };
  const scavPosts = posts.slice().sort(() => R() - .5).slice(0, Mp.quay ? 30 : 42);
  scavPosts.forEach((g, i) => mk(1, R() < .15 ? 1 : 0, V3(g[0], g[1], g[2]), g[3], R() < .75 ? { crouch: g[4] } : null, role(pick(['rifleman', 'rifleman', 'breacher', 'gunner'], R)), (cfg.side === 'scav' ? 'Scav ' : '') + pick(SCAV_N, R)));
  if (M) { // boss and guards hold the core
    const gs = M.guards.slice().sort(() => R() - .5);
    gs.slice(0, 1).forEach(g => { const b = mk(1, 3, V3(g[0], g[1], g[2]), g[3], { crouch: false }, role('heavy'), pick(['Boss Kabanov', 'Boss Rezo', 'Boss Shturm', 'Boss Gluhar'], R)); b.boss = true; });
    gs.slice(1, 4).forEach(g => mk(1, 2, V3(g[0], g[1], g[2]), g[3], { crouch: g[4] }, role('leader'), 'Guard ' + pick(SCAV_N, R)));
  }
  const nP = Mp.quay ? 6 : 8 + Math.floor(R() * 4);
  for (let i = 0; i < nP; i++) { const p = edge(); mk(2, 2, p, Math.atan2(p.x, p.z), null, role(pick(['rifleman', 'marksman', 'breacher'], R)), 'PMC ' + PMC_N[i % PMC_N.length]); }
  Game.agents = [P, ...Game.bots];
  // extra roaming hotspots: containers and extracts draw PMCs across the map
  W.hot = W.hot.concat(conts.map(c => c.pos.clone()), exList.map(e => e.pos.clone()));
  Game.mission = { cfg, M: { name: Mp.n }, total: Game.bots.length, killed: 0, heads: 0, t: 0, dmgTaken: 0, hostages: 0, hostagesLost: 0, done: false, roles: {} };
  Game.raid = { cfg, Mp, t: 0, limit: Mp.time * 60, ex: exList, conts, inv: (cfg.inv || []).slice(), kills: { scav: 0, pmc: 0, boss: 0 }, bleed: 0, healT: 0, exT: 0, done: false, startItems: cfg.startItems || [], dmg: 0 };
  Game.stats = { shots: 0, hits: 0 }; Game.cfg = Object.assign({ explosives: [] }, cfg); Game.map = map; Game.killfeed = [];
  P.expl = null;
  if (cfg.explosives) Game.cfg.explosives = cfg.explosives;
  try { const Rr = G.E.renderer; Rr.compile(G.E.scene, G.E.camera); } catch (e) {}
  G.UI.showHUD('mission');
  X.hud();
  Game.toast(`${Mp.n} · ${tod.n} · ${cfg.side === 'scav' ? 'Scav run' : 'PMC raid'} — ${mmss(Game.raid.limit)} to extract. Tab: inventory & exfils.`, 6);
};
function rollLoot(cats, R, rich = 1) {
  const cat = pick(cats, R), l = G.LOOT.filter(x => x.cat === cat), tot = l.reduce((s, x) => s + Math.pow(x.w, 1 / rich), 0);
  let r = R() * tot; for (const x of l) { r -= Math.pow(x.w, 1 / rich); if (r <= 0) return { t: 'l', id: x.id, u: uid() }; } return { t: 'l', id: l[0].id, u: uid() };
}

// ------------------------------------------------------------------ in-raid update
X.update = function (dt, P, input) {
  const Rd = Game.raid; if (!Rd || Rd.done) return;
  Rd.t += dt;
  if (Rd.t >= Rd.limit) return X.end('mia');
  // bleeding and healing
  if (Rd.bleed > 0 && P.alive) { P.hp -= Rd.bleed * .7 * dt; if (P.hp <= 0) { P.hp = 1; P.damage({ dmg: 50, pen: 0, owner: null, weapon: { n: 'Blood loss' }, bleedTick: true }, 'chest', 1, V3(0, 1, 0), null); } }
  if (Rd.healT > 0) { const k = Math.min(dt, Rd.healT); Rd.healT -= k; P.hp = Math.min(100, P.hp + Rd.healRate * k); }
  if (input.med) X.useMed(P);
  if (input.tab) X.openPanel(null);
  // extraction
  let inZone = null;
  for (const e of Rd.ex) if (P.pos.distanceTo(e.pos) < e.r) { inZone = e; break; }
  if (inZone) {
    const why = X.exBlocked(inZone, P);
    if (why) { Rd.exT = 0; X.center(why); }
    else { Rd.exT += dt; X.center(`EXTRACTING · ${inZone.n} · ${Math.max(0, 8 - Rd.exT).toFixed(1)}`); if (Rd.exT >= 8) { if (inZone.kind === 'pay') { X.stash.money -= 7000; } return X.end('survived', inZone.n); } }
  } else { if (Rd.exT) X.center(''); Rd.exT = 0; }
  // hostiles roam more as the raid goes on: scavs leave their posts, PMCs push into the map
  if (Math.floor(Rd.t) % 30 === 0 && Math.floor(Rd.t - dt) % 30 !== 0) for (const b of Game.bots) if (b.alive && b.guard && b.alert === 'calm' && !b.boss && Math.random() < .12) b.guard = null;
  X.hudTick();
};
X.exBlocked = (e, P) => {
  const Rd = Game.raid;
  if (!e.open) return `${e.n} is closed this raid`;
  if (e.kind === 'late' && Rd.t < 600) return `${e.n} opens in ${mmss(600 - Rd.t)}`;
  if (e.kind === 'nopack' && P.kit.pack && P.kit.pack !== 'k_none') return `${e.n}: drop your backpack to fit through`;
  if (e.kind === 'pay' && X.stash.money < 7000) return `${e.n}: you can't pay ₮7,000`;
  return null;
};
X.useMed = function (P) {
  const Rd = Game.raid, inv = Rd.inv;
  // best med for the situation: bleeding → bandage/tourniquet first, otherwise the biggest heal
  const meds = inv.filter(it => it.t === 'l' && G.LOOTID[it.id] && G.LOOTID[it.id].med);
  if (!meds.length) { Game.toast('No medical supplies', 1.2); return; }
  const sc = it => { const m = MEDS[G.LOOTID[it.id].med]; return Rd.bleed > 0 ? m.bleed * 10 - m.heal * .01 : m.heal; };
  meds.sort((a, b) => sc(b) - sc(a));
  const it = meds[0], m = MEDS[G.LOOTID[it.id].med];
  if (P.action) return;
  P.startAction('fiddle', { dur: m.t, pose: { rx: -.6, ry: .2, rz: .3, py: -.2 }, at: .85, cb: () => {
    const i = inv.indexOf(it); if (i < 0) return; inv.splice(i, 1);
    Rd.bleed = Math.max(0, Rd.bleed - m.bleed); if (m.heal) { Rd.healT = 3; Rd.healRate = m.heal / 3; }
    Game.toast(`Used ${m.n}${Rd.bleed ? ` · still bleeding (${Rd.bleed})` : ''}`, 1.4);
  } });
};
// interaction: search containers and bodies (F), in front of the player
X.interact = function (P, input) {
  const Rd = Game.raid; if (!Rd || !P.alive || X.panel) return;
  const look = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  let best = null, bs = -1e9;
  for (const c of Rd.conts) { const d = Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z), dy = c.pos.y - P.pos.y; if (d > 2.2 || dy < -1 || dy > 1.6) continue; const to = c.pos.clone().sub(P.pos).setY(0).normalize(), s = to.dot(look) * 2 - d; if (to.dot(look) > .3 && s > bs) { bs = s; best = c; } }
  X.near = best;
  if (best && input.inspect) { input.inspect = false; X.openPanel(best); }
};

// ------------------------------------------------------------------ inventory / loot panel
X.openPanel = function (cont) {
  if (X.panel) return X.closePanel();
  const P = Game.player; if (!P || !P.alive) return;
  Game.lootOpen = true; G.Input.unlock(); G.Input.clear && G.Input.clear();
  const el = X.panel = document.createElement('div'); el.id = 'lootp';
  el.style.cssText = 'position:fixed;inset:5vh 4vw;z-index:30;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:rgba(10,12,9,.94);border:1px solid rgba(230,197,114,.4);border-radius:6px;padding:16px;color:#e8e2cc;font:13px var(--f-ui,sans-serif);overflow:auto';
  document.body.appendChild(el);
  X.panelCont = cont;
  if (cont && cont.searched < cont.items.length) { X.searchT = 0; }
  X.renderPanel();
};
X.closePanel = function () { if (X.panel) X.panel.remove(); X.panel = null; X.panelCont = null; Game.lootOpen = false; if (Game.state === 'play') G.Input.lock(); };
X.renderPanel = function () {
  const el = X.panel; if (!el) return;
  const Rd = Game.raid, P = Game.player, c = X.panelCont, inv = Rd.inv, cap = X.capacity(P.kit), us = used(inv), esc = G.UI.esc;
  const row = (it, act, extra = '') => `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06)"><span><b>${esc(itemName(it) || '?')}</b> <span style="opacity:.6">· ${itemSize(it)} slot${itemSize(it) > 1 ? 's' : ''} · ${fmt(itemPrice(it))}</span>${extra}</span><span style="display:flex;gap:4px">${act}</span></div>`;
  const btn = (a, u, t) => `<button class="btn small" data-a="${a}" data-u="${u}">${t}</button>`;
  const left = c ? `<div><div class="eyebrow">${esc(c.n)}</div>${c.items.slice(0, c.searched).map(it => row(it, (it.t === 'g' ? btn('wear', it.u, 'Wear') : '') + btn('take', it.u, 'Take'))).join('') || '<p class="muted">Empty.</p>'}${c.searched < c.items.length ? `<p class="muted">Searching… ${c.items.length - c.searched} more</p>` : ''}</div>`
    : `<div><div class="eyebrow">Raid</div><p style="font:700 28px var(--f-mono,monospace)">${mmss(Rd.limit - Rd.t)}</p><div class="eyebrow" style="margin-top:8px">Exfils</div>${Rd.ex.map(e => { const d = e.pos.distanceTo(P.pos), a = Math.atan2(-(e.pos.x - P.pos.x), -(e.pos.z - P.pos.z)) - P.yaw, dir = ['ahead', 'ahead-left', 'left', 'behind-left', 'behind', 'behind-right', 'right', 'ahead-right'][((Math.round(a / (PI / 4)) % 8) + 8) % 8]; return `<div style="padding:4px 0"><b style="color:${e.open ? '#a6d98a' : '#ec8a7a'}">${esc(e.n)}</b> <span style="opacity:.7">· ${Math.round(d)} m ${dir} · ${EXK[e.kind]}${e.open ? '' : ' — closed'}</span></div>`; }).join('')}<div class="eyebrow" style="margin-top:10px">Status</div><p>HP ${Math.round(P.hp)} · ${Rd.bleed ? `<span style="color:#ec8a7a">bleeding ×${Rd.bleed}</span>` : 'not bleeding'} · kills ${Rd.kills.scav + Rd.kills.pmc + Rd.kills.boss}</p><p class="muted">5 uses medical supplies. F loots containers and bodies, T takes a weapon off the ground.</p></div>`;
  const kitRows = G.GEAR_SLOTS.map(([s, n]) => { const g = G.GEARID[P.kit[s]]; return g && !/_none$|^g_none$/.test(g.id) ? `<div style="display:flex;justify-content:space-between;padding:3px 8px"><span><span style="opacity:.6">${n}:</span> ${esc(g.n)}</span>${c && s !== 'uniform' ? btn('unwear', s, 'Take off') : ''}</div>` : ''; }).join('');
  el.innerHTML = `${left}<div><div class="eyebrow">Your inventory · ${us}/${cap} slots</div>${inv.map(it => row(it, (it.t === 'l' && G.LOOTID[it.id].med ? btn('use', it.u, 'Use') : '') + (it.t === 'g' ? btn('wear', it.u, 'Wear') : '') + (c ? btn('put', it.u, 'Put') : btn('drop', it.u, 'Drop')))).join('') || '<p class="muted">Empty.</p>'}
    <div class="eyebrow" style="margin-top:12px">Wearing</div>${kitRows}
    <div class="eyebrow" style="margin-top:12px">Weapons</div>${P.weapons.map(w => `<div style="padding:3px 8px">${esc(w.wp.n)} <span style="opacity:.6">· ${w.mag}+${w.reserve}</span></div>`).join('')}
    <div style="margin-top:14px;display:flex;gap:8px"><button class="btn primary" id="lp-close">Close (Tab)</button></div></div>`;
  el.querySelector('#lp-close').onclick = X.closePanel;
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => X.act(b.dataset.a, b.dataset.u));
};
X.act = function (a, u) {
  const Rd = Game.raid, P = Game.player, c = X.panelCont, inv = Rd.inv, cap = X.capacity(P.kit);
  const find = (l) => l.findIndex(it => it.u === u);
  if (a === 'take') { const i = find(c.items), it = c.items[i]; if (used(inv) + itemSize(it) > cap) { Game.toast('Not enough space', 1.2); return; } c.items.splice(i, 1); c.searched--; inv.push(it); if (G.LOOTID[it.id] && G.LOOTID[it.id].ammo) { for (const w of P.weapons) w.reserve += G.LOOTID[it.id].ammo; } if (G.LOOTID[it.id] && G.LOOTID[it.id].exp && P.expl) { const e = G.LOOTID[it.id].exp; if (!P.expl.list.includes(e)) P.expl.list.push(e); P.expl.counts[e] = (P.expl.counts[e] || 0) + 1; } G.Audio.ui && G.Audio.ui('attach'); }
  else if (a === 'put' || a === 'drop') { const i = find(inv), it = inv[i]; inv.splice(i, 1); if (c) { c.items.push(it); c.searched++; } else { X.dropBag(P, [it]); } }
  else if (a === 'use') { X.closePanel(); const it = inv[find(inv)]; inv.splice(find(inv), 1); inv.unshift(it); X.useMed(P); return; }
  else if (a === 'wear') { // from container or inventory onto your body; the old piece goes where the new one came from
    const src = c && find(c.items) >= 0 ? c.items : inv, i = find(src), it = src[i], g = G.GEARID[it.id], old = P.kit[g.slot];
    P.kit[g.slot] = g.id; src.splice(i, 1);
    if (old && !/_none$|^g_none$/.test(old)) src.push({ t: 'g', id: old, u: uid() }); else if (src === (c && c.items)) c.searched--;
    if (src === (c && c.items)) c.searched = Math.max(0, Math.min(c.items.length, c.searched + (old && !/_none$/.test(old) ? 0 : 0)));
    P.km = null; P.kmT = 0; if (g.slot === 'armor' || g.slot === 'plates' || g.slot === 'helmet') P.armorState = G.newArmorState();
    P.kitKg = G.kitWeight(P.kit); P.kitK = Math.max(.72, Math.min(1.04, 1.04 - Math.max(0, P.kitKg - 5) * .012));
    Game.toast(`Wearing ${g.n}`, 1.2);
  }
  else if (a === 'unwear') { const s = u, g = G.GEARID[P.kit[s]], none = G.gearFor(s).find(x => /_none$|^g_none$/.test(x.id)); if (!none) { Game.toast('You need something there', 1); return; } (c ? c.items : inv).push({ t: 'g', id: g.id, u: uid() }); if (c) c.searched++; P.kit[s] = none.id; P.kmT = 0; P.armorState = G.newArmorState(); P.kitKg = G.kitWeight(P.kit); P.kitK = Math.max(.72, Math.min(1.04, 1.04 - Math.max(0, P.kitKg - 5) * .012)); }
  X.renderPanel();
};
X.dropBag = function (P, items) { const Rd = Game.raid, p = P.pos.clone(); const m = new THREE.Mesh(gBox(.5, .3, .4), G.mat({ color: '#4a4434' })); m.position.set(p.x, p.y + .15, p.z); G.E.world.static.add(m); Rd.conts.push({ kind: 'duffle', n: 'Dropped bag', pos: p.setY(p.y + .3), items: items.slice(), searched: items.length, mesh: m }); };
// progressive search while a container panel is open
X.panelTick = function (dt) {
  const c = X.panelCont; if (!X.panel || !c || c.searched >= c.items.length) return;
  X.searchT += dt * (1 / (.6 + Math.random() * .6)); if (X.searchT >= 1) { X.searchT = 0; c.searched++; G.Audio.ui && G.Audio.ui(); X.renderPanel(); }
};

// ------------------------------------------------------------------ kills, bodies, bleeding
const onKill0 = Game.onKill;
Game.onKill = function (killer, victim, weapon, head) {
  const Rd = Game.raid;
  if (!Rd) return onKill0.apply(this, arguments);
  Game.killfeed.unshift({ k: killer ? killer.name : '—', kt: killer ? killer.team : -1, v: victim.name, vt: victim.team, w: weapon ? weapon.n : '', head, t: 5 }); if (Game.killfeed.length > 6) Game.killfeed.pop();
  if (victim === Game.player) { X.end('killed', killer ? `${killer.name}${weapon ? ' · ' + weapon.n : ''}` : (weapon && weapon.n) || 'unknown'); return; }
  Game.mission.killed++;
  if (killer === Game.player) { const k = victim.boss ? 'boss' : victim.team === 2 ? 'pmc' : 'scav'; Rd.kills[k]++; if (head) Game.mission.heads++; G.UI.hitmarker(true, head); G.Audio.hit(head, true); Game.toast(`${victim.name} killed${head ? ' · headshot' : ''}`, 1.4); }
  // the body becomes a container with everything they wore and carried
  const items = [];
  for (const [s] of G.GEAR_SLOTS) { const id = victim.kit && victim.kit[s]; if (id && !/_none$|^g_none$/.test(id) && s !== 'uniform') items.push({ t: 'g', id, u: uid() }); }
  const R = Math.random, n = victim.boss ? 4 : victim.team === 2 ? 3 : 1 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) items.push(rollLoot(victim.boss ? ['valuable', 'info', 'tech'] : ['food', 'med', 'ammo', 'valuable', 'tech'], R, victim.boss ? 2 : 1));
  Rd.conts.push({ kind: 'body', n: victim.name, pos: victim.pos.clone().setY(victim.pos.y + .3), items, searched: 0, body: victim });
  G.UI.dirty = true;
};
const hurt0 = Game.onPlayerHurt;
Game.onPlayerHurt = function (d, dir, b) {
  hurt0.apply(this, arguments);
  const Rd = Game.raid; if (!Rd || (b && b.bleedTick)) return;
  Rd.dmg += d;
  if (d > 6 && Math.random() < (b && b.cal ? .5 : .3)) { Rd.bleed = Math.min(3, Rd.bleed + 1); Game.toast('🩸 Bleeding — press 5 to bandage', 1.6); }
};
const up0 = Game.updatePickups;
Game.updatePickups = function (dt, P, input) { if (Game.raid) X.interact(P, input); return up0.call(this, dt, P, input); };

// ------------------------------------------------------------------ end of raid
X.end = function (status, info) {
  const Rd = Game.raid; if (!Rd || Rd.done) return; Rd.done = true; Rd.status = status; Rd.info = info;
  if (X.panel) X.closePanel();
  const S = X.stash, P = Game.player, cfg = Rd.cfg;
  S.raids++; const xp = Math.round(Rd.t / 6 + Rd.kills.scav * 120 + Rd.kills.pmc * 450 + Rd.kills.boss * 1500 + (status === 'survived' ? 800 : 0));
  S.xp += xp; S.kills += Rd.kills.scav + Rd.kills.pmc + Rd.kills.boss;
  const kept = [], lost = [], back = [];
  const carried = [...P.weapons.map(w => ({ t: 'w', id: w.wp.id, L: w.L, u: uid() })), ...G.GEAR_SLOTS.map(([s]) => P.kit[s]).filter(id => id && !/_none$|^g_none$/.test(id)).map(id => ({ t: 'g', id, u: uid() })), ...Rd.inv];
  if (status === 'survived') { S.survived++; for (const it of carried) { S.items.push(it); kept.push(it); } }
  else {
    for (const it of carried) lost.push(it);
    if (cfg.side === 'pmc') for (const it of Rd.startItems) if ((cfg.insured || []).includes(it.u) && Math.random() < .65) { S.items.push(Object.assign({}, it, { u: uid() })); back.push(it); }
  }
  if (cfg.side === 'scav') S.scavCD = Date.now() + 8 * 60 * 1000;
  S.log.unshift({ map: Rd.Mp.n, status, t: Math.round(Rd.t), kills: Rd.kills, value: kept.reduce((s, it) => s + itemPrice(it), 0), at: Date.now() }); S.log = S.log.slice(0, 12);
  X.save();
  Game.mission.done = true; Game.state = 'end';
  setTimeout(() => X.results(status, info, xp, kept, lost, back), status === 'survived' ? 900 : 1300);
};
X.results = function (status, info, xp, kept, lost, back) {
  const Rd = Game.raid, esc = G.UI.esc; G.Input.unlock();
  const title = { survived: 'Survived', killed: 'Killed in action', mia: 'Missing in action' }[status];
  const sum = l => fmt(l.reduce((s, it) => s + itemPrice(it), 0));
  G.UI.overlay(`<div class="dialog" style="width:min(640px,100%)"><div class="eyebrow">${esc(Rd.Mp.n)} · ${esc(G.TOD[Rd.cfg.tod].n)} · ${Rd.cfg.side === 'scav' ? 'Scav' : 'PMC'}</div><h2 style="color:${status === 'survived' ? '#a6d98a' : '#ec8a7a'}">${title}</h2>
    <p class="muted">${status === 'survived' ? 'Extracted at ' + esc(info) : status === 'killed' ? 'Killed by ' + esc(info) : 'The raid timer ran out before you reached an exfil.'}</p>
    <dl class="spec">${[['Time in raid', mmss(Rd.t)], ['Scavs / PMCs / bosses', `${Rd.kills.scav} / ${Rd.kills.pmc} / ${Rd.kills.boss}`], ['Experience', '+' + xp], ['Level', X.level(X.stash.xp)], [status === 'survived' ? 'Brought out' : 'Lost', status === 'survived' ? sum(kept) : sum(lost)], ['Insurance returned', back.length ? back.map(itemName).join(', ') : '—']].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>
    ${status === 'survived' ? `<p class="muted" style="max-height:120px;overflow:auto">${kept.map(it => esc(itemName(it))).join(' · ')}</p>` : ''}
    <div class="btns"><button class="btn primary" id="r-hide">Hideout</button><button class="btn" id="r-menu">Main menu</button></div></div>`);
  const out = to => { G.UI.closeOverlay(); Game.cleanup(); Game.raid = null; Game.player = null; G.UI.show(to); };
  document.getElementById('r-hide').onclick = () => out('extraction');
  document.getElementById('r-menu').onclick = () => out('menu');
};

// ------------------------------------------------------------------ HUD
X.hud = function () {
  const sc = document.getElementById('score'); if (sc) sc.style.display = 'none';
  let el = document.getElementById('raidhud');
  if (!el) { el = document.createElement('div'); el.id = 'raidhud'; el.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);font:600 15px var(--f-mono,monospace);color:#e8e2cc;text-shadow:0 1px 3px #000;pointer-events:none;text-align:center'; document.getElementById('hud').appendChild(el); }
  let c = document.getElementById('raidc');
  if (!c) { c = document.createElement('div'); c.id = 'raidc'; c.style.cssText = 'position:absolute;left:50%;top:38%;transform:translateX(-50%);font:700 18px var(--f-ui,sans-serif);color:#a6ff9a;text-shadow:0 1px 4px #000;pointer-events:none'; document.getElementById('hud').appendChild(c); }
};
X.center = t => { const c = document.getElementById('raidc'); if (c && c.textContent !== t) c.textContent = t; };
X.hudTick = function () {
  const Rd = Game.raid, el = document.getElementById('raidhud'); if (!el || Game.frame % 6) return;
  const P = Game.player, near = X.near;
  el.innerHTML = `${mmss(Math.max(0, Rd.limit - Rd.t))}${Rd.bleed ? ` · <span style="color:#ff6a5a">BLEEDING ×${Rd.bleed}</span>` : ''}${Rd.healT > 0 ? ' · healing' : ''}<br><span style="font-size:12px;opacity:.75">${used(Rd.inv)}/${X.capacity(P.kit)} slots · Tab inventory · 5 meds</span>${near && !X.panel ? `<br><span style="font-size:14px;color:#e6c572">F — ${near.searched >= near.items.length && near.searched ? 'loot' : 'search'} ${G.UI.esc(near.n)}</span>` : ''}`;
};

// ------------------------------------------------------------------ hideout screen (stash, traders, raid prep)
X.tab = 'prep';
X.render = function (root) {
  Game.mode = 'menu';
  const S = X.stash, esc = G.UI.esc, prep = S.prep = S.prep || {};
  const lv = X.level(S.xp);
  X.auctionSim();
  const live = (S.auctions || []).filter(a => !a.done).length;
  const tabs = [['prep', 'Raid'], ['stash', 'Stash'], ['traders', 'Traders'], ['auction', `🔨 Auction${live ? ` (${live})` : ''}`], ['log', 'Raid log']];
  const scavReady = Date.now() >= (S.scavCD || 0);
  const owned = (t, f) => S.items.filter(it => it.t === t && f(it));
  const sel = (name, list, cur, fmtFn) => `<select data-prep="${name}"><option value="">— none —</option>${list.map(it => `<option value="${it.u}" ${cur === it.u ? 'selected' : ''}>${esc(fmtFn(it))}</option>`).join('')}</select>`;
  let body = '';
  if (X.tab === 'prep') {
    const Mp = G.RAID_MAP[prep.map] || G.RAID_MAPS[0]; prep.map = Mp.id; prep.tod = prep.tod || 'day'; prep.side = prep.side || 'pmc';
    const kit = {}; for (const [s] of G.GEAR_SLOTS) { const it = S.items.find(x => x.u === (prep.kit || {})[s]); kit[s] = it ? it.id : (G.gearFor(s).find(g => /_none$|^g_none$/.test(g.id)) || G.gearFor(s)[0]).id; }
    const val = [prep.primary, prep.secondary, ...Object.values(prep.kit || {})].map(u => S.items.find(x => x.u === u)).filter(Boolean);
    body = `<div><span class="lbl">Location</span><div class="row">${G.RAID_MAPS.map(m => `<button class="card ${m.id === Mp.id ? 'on' : ''}" data-map="${m.id}"><small>${m.time} min · ${m.ex.length} exfils · ${m.core ? 'boss' : 'no boss'}</small><b>${esc(m.n)}</b><span>${esc(m.d)}</span></button>`).join('')}</div></div>
      <div><span class="lbl">Time of day</span><div class="row">${Object.entries(G.TOD).map(([k, t]) => `<button class="card ${k === prep.tod ? 'on' : ''}" data-tod="${k}"><b>${t.n}</b></button>`).join('')}</div></div>
      <div><span class="lbl">Character</span><div class="row"><button class="card ${prep.side === 'pmc' ? 'on' : ''}" data-side="pmc"><b>PMC</b><span>Your own gear from the stash. Lose it if you die (insurance may return some).</span></button><button class="card ${prep.side === 'scav' ? 'on' : ''}" data-side="scav" ${scavReady ? '' : 'disabled'}><b>Scav</b><span>${scavReady ? 'A free random loadout. Scavs are friendly; PMCs are not.' : 'Cooldown: ' + mmss((S.scavCD - Date.now()) / 1000)}</span></button></div></div>
      ${prep.side === 'pmc' ? `<div class="loadrow" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        <div><span class="lbl">Primary</span><div class="pick">${sel('primary', owned('w', it => G.WEAPON[it.id] && G.WEAPON[it.id].c !== 'PST'), prep.primary, it => G.WEAPON[it.id].n + ' · ' + fmt(itemPrice(it)))}</div></div>
        <div><span class="lbl">Sidearm</span><div class="pick">${sel('secondary', owned('w', it => G.WEAPON[it.id] && G.WEAPON[it.id].c === 'PST'), prep.secondary, it => G.WEAPON[it.id].n)}</div></div>
        ${G.GEAR_SLOTS.map(([s, n]) => `<div><span class="lbl">${n}</span><div class="pick">${sel('kit.' + s, owned('g', it => G.GEARID[it.id] && G.GEARID[it.id].slot === s), (prep.kit || {})[s], it => G.GEARID[it.id].n)}</div></div>`).join('')}
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="xp-locker">Equip my kit-locker kit (buy what's missing)</button><button class="btn" id="xp-armory">Bring my armory build (buy if needed)</button><label class="muted" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="xp-ins" ${prep.insure !== false ? 'checked' : ''}>Insure gear (${fmt(val.reduce((s, it) => s + itemPrice(it), 0) * .08)})</label></div>
      <p class="muted">Carrying space: ${X.capacity(kit)} slots. Exfils: ${Mp.ex.map(e => `${esc(e[0])} (${EXK[e[2]]})`).join(' · ')}.</p>` : '<p class="muted">Scav loadout is rolled when you deploy: a random gun from WW2 to today and random cheap kit. Bring it home to keep it.</p>'}
      <div class="deploy"><span class="muted">Raid: ${Mp.time} min. Loot containers and bodies with F, take weapons off the ground with T, Tab for inventory and exfils, 5 to heal. Stand in an exfil for 8 s to leave. Health does not regenerate.</span><button class="btn primary" id="xp-go" style="font-size:20px;padding:14px 36px">To the raid</button></div>`;
  } else if (X.tab === 'stash') {
    const tot = S.items.reduce((s, it) => s + itemPrice(it), 0);
    body = `<p class="muted">${S.items.length} items · worth ${fmt(tot)} at traders. Selling pays 60%.</p><div class="row" style="gap:8px"><button class="btn" id="xs-junk">Sell all loot</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px;margin-top:8px">${S.items.map(it => `<div class="card" style="cursor:default"><small>${it.t === 'w' ? 'Weapon' : it.t === 'g' ? G.GEAR_SLOTS.find(s => s[0] === (G.GEARID[it.id] || {}).slot)?.[1] || 'Gear' : (G.LOOTID[it.id] || {}).cat}</small><b style="font-size:15px">${esc(itemName(it) || '?')}</b><span>${fmt(itemPrice(it))}${it.t === 'w' ? ' · ' + Object.values(it.L || {}).filter(id => !G.DEFAULT_IDS.includes(id)).length + ' parts' : ''}</span><button class="btn small" data-sell="${it.u}">Sell ${fmt(itemPrice(it) * .6)}</button></div>`).join('')}</div>`;
  } else if (X.tab === 'traders') {
    const cat = X.tcat || 'w', q = (X.tq || '').toLowerCase();
    const types = G.armoryTypes().filter(t => t.n), era = types.some(t => t.id === X.tera) ? X.tera : 'AR';
    const list = cat === 'w' ? G.WEAPONS.filter(w => (q ? true : G.typeOf(w) === era) && w.n.toLowerCase().includes(q)).sort(G.byAge).slice(0, q ? 120 : 400).map(w => { const L = G.UI.loadoutFor(w); return { k: 'w', id: w.id, n: w.n, sub: `${G.CLASS_NAMES[w.c]} · ${w.y} · your armory build (${Object.values(L).filter(id => !G.DEFAULT_IDS.includes(id)).length} parts)`, p: G.priceWeapon(w, L) }; })
      : G.GEAR.filter(g => g.slot === cat && !/_none$|^g_none$/.test(g.id) && g.n.toLowerCase().includes(q)).map(g => ({ k: 'g', id: g.id, n: g.n, sub: `${g.co || ''} · ${g.y}${g.cat ? ' · ' + (g.cat === 'bomb' ? 'Bomb suit' : 'Medieval') : ''}`, p: G.priceGear(g) }));
    body = `<div class="row" style="gap:6px;flex-wrap:wrap">${[['w', 'Weapons'], ...G.GEAR_SLOTS].map(([k, n]) => `<button class="chip ${cat === k ? 'on' : ''}" data-tcat="${k}">${n}</button>`).join('')}<input id="xt-q" placeholder="Search…" value="${esc(X.tq || '')}" style="padding:6px 10px;background:#111;color:#eee;border:1px solid #444;border-radius:3px"></div>
      ${cat === 'w' ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${types.map(t => `<button class="chip ${era === t.id ? 'on' : ''}" data-tera="${t.id}">${esc(t.name)}</button>`).join('')}</div>` : ''}
      <p class="muted">Weapons come with the build you saved in the Armory — customise there first.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px">${list.map(o => `<div class="card" style="cursor:default"><small>${esc(o.sub)}</small><b style="font-size:15px">${esc(o.n)}</b><button class="btn small" data-buy="${o.k}:${o.id}" ${S.money < o.p ? 'disabled' : ''}>Buy ${fmt(o.p)}</button></div>`).join('')}</div>`;
  } else if (X.tab === 'auction') {
    body = X.auctionHTML();
  } else {
    body = `<dl class="spec">${[['Raids', S.raids], ['Survived', S.survived + (S.raids ? ` (${Math.round(S.survived / S.raids * 100)}%)` : '')], ['Kills', S.kills], ['Level', lv]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${(S.log || []).map(l => `<div style="padding:4px 0"><b style="color:${l.status === 'survived' ? '#a6d98a' : '#ec8a7a'}">${l.status.toUpperCase()}</b> · ${esc(l.map)} · ${mmss(l.t)} · kills ${l.kills.scav + l.kills.pmc + l.kills.boss} · brought out ${fmt(l.value)}</div>`).join('')}<div style="margin-top:16px"><button class="btn" id="xl-wipe">Wipe (start over)</button></div>`;
  }
  root.innerHTML = `<section class="screen" id="battle"><div class="setup">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><div class="eyebrow">Extraction · hideout</div><h1>${fmt(S.money)}</h1><div class="muted">Level ${lv} · ${S.items.length} items in stash</div></div><button class="btn small" id="back">Main menu</button></div>
    <div class="row" style="gap:6px">${tabs.map(([k, n]) => `<button class="chip ${X.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
    ${body}</div></section>`;
  const re = () => { X.save(); X.render(root); };
  X.auctionBind(root, re);
  root.querySelector('#back').onclick = () => G.UI.show('menu');
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { X.tab = b.dataset.tab; G.Audio.ui(); re(); });
  root.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { prep.map = b.dataset.map; re(); });
  root.querySelectorAll('[data-tod]').forEach(b => b.onclick = () => { prep.tod = b.dataset.tod; re(); });
  root.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { prep.side = b.dataset.side; re(); });
  root.querySelectorAll('[data-prep]').forEach(s => s.onchange = () => { const k = s.dataset.prep; if (k.startsWith('kit.')) { prep.kit = prep.kit || {}; prep.kit[k.slice(4)] = s.value || null; } else prep[k] = s.value || null; re(); });
  root.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const i = S.items.findIndex(it => it.u === b.dataset.sell); if (i >= 0) { S.money += itemPrice(S.items[i]) * .6; for (const k of ['primary', 'secondary']) if (prep[k] === S.items[i].u) prep[k] = null; S.items.splice(i, 1); G.Audio.ui('attach'); } re(); });
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.buy.split(':'); X.buy(k, id); re(); });
  root.querySelectorAll('[data-tera]').forEach(b => b.onclick = () => { X.tera = b.dataset.tera; re(); });
  root.querySelectorAll('[data-tcat]').forEach(b => b.onclick = () => { X.tcat = b.dataset.tcat; re(); });
  const tq = root.querySelector('#xt-q'); if (tq) tq.onchange = () => { X.tq = tq.value; re(); };
  const j = root.querySelector('#xs-junk'); if (j) j.onclick = () => { S.items = S.items.filter(it => { if (it.t === 'l') { S.money += itemPrice(it) * .6; return false; } return true; }); re(); };
  const w = root.querySelector('#xl-wipe'); if (w) w.onclick = () => { if (confirm('Wipe your stash and start over?')) { X.stash = X.fresh(); re(); } };
  const ins = root.querySelector('#xp-ins'); if (ins) ins.onchange = () => { prep.insure = ins.checked; re(); };
  const lk = root.querySelector('#xp-locker'); if (lk) lk.onclick = () => { prep.kit = prep.kit || {}; let spent = 0; for (const [s] of G.GEAR_SLOTS) { const id = G.Kit.current[s]; if (!id || /_none$|^g_none$/.test(id)) { prep.kit[s] = null; continue; } let it = S.items.find(x => x.t === 'g' && x.id === id); if (!it) { it = X.buy('g', id); if (it) spent += G.priceGear(G.GEARID[id]); } prep.kit[s] = it ? it.u : null; } G.UI.toast(spent ? `Bought missing kit for ${fmt(spent)}` : 'Kit equipped from your stash', 2); re(); };
  const ar = root.querySelector('#xp-armory'); if (ar) ar.onclick = () => { for (const [k, id] of [['primary', G.UI.mis.primary], ['secondary', G.UI.mis.secondary]]) { const wp = G.WEAPON[id]; if (!wp) continue; const L = G.UI.loadoutFor(wp); let it = S.items.find(x => x.t === 'w' && x.id === id && JSON.stringify(x.L) === JSON.stringify(L)); if (!it) it = X.buy('w', id); if (it) prep[k] = it.u; } re(); };
  const go = root.querySelector('#xp-go'); if (go) go.onclick = () => X.deploy();
};
X.buy = function (k, id) {
  const S = X.stash;
  const it = k === 'w' ? { t: 'w', id, L: G.UI.loadoutFor(G.WEAPON[id]), u: uid() } : { t: 'g', id, u: uid() };
  const p = itemPrice(it); if (S.money < p) { G.UI.toast(`Not enough money (${fmt(p)})`, 2); return null; }
  S.money -= p; S.items.push(it); X.save(); G.Audio.ui && G.Audio.ui('attach'); return it;
};
X.deploy = function () {
  const S = X.stash, prep = S.prep, Mp = G.RAID_MAP[prep.map];
  let cfg;
  if (prep.side === 'scav') {
    const R = Math.random, wp = randWeapon(0, R), kit = randKit(0, prep.tod === 'night', R), pist = pick(G.WEAPONS.filter(w => w.c === 'PST' && w.e !== 'psycho' && !w.custom && !(G.ERA[w.e] || {}).noWar));
    cfg = { map: Mp.id, tod: prep.tod, side: 'scav', primary: { wp, L: G.botLoadout(wp, 'rifleman', 0, false, R) }, secondary: R() < .4 ? { wp: pist, L: G.defaultLoadout(pist) } : null, kit, inv: [rollLoot(['med'], R), rollLoot(['food'], R)], explosives: ['rgd5'] };
  } else {
    const take = u => { const i = S.items.findIndex(x => x.u === u); return i >= 0 ? S.items.splice(i, 1)[0] : null; };
    const pr = take(prep.primary), sc = take(prep.secondary);
    if (!pr && !sc) { G.UI.toast('Pick at least one weapon from your stash (or buy one at the traders)', 3); return; }
    const kit = {}, startItems = [pr, sc].filter(Boolean);
    for (const [s] of G.GEAR_SLOTS) { const it = take((prep.kit || {})[s]); if (it) startItems.push(it); kit[s] = it ? it.id : (G.gearFor(s).find(g => /_none$|^g_none$/.test(g.id)) || G.gearFor(s)[0]).id; }
    // a few meds from the stash go into your pockets
    const inv = []; for (const it of S.items.filter(x => x.t === 'l' && G.LOOTID[x.id].med).slice(0, 3)) { inv.push(take(it.u)); }
    let insured = []; if (prep.insure !== false) { const cost = startItems.reduce((s, it) => s + itemPrice(it), 0) * .08; if (S.money >= cost) { S.money -= cost; insured = startItems.map(it => it.u); } }
    prep.primary = prep.secondary = null; prep.kit = {};
    cfg = { map: Mp.id, tod: prep.tod, side: 'pmc', primary: pr ? { wp: G.WEAPON[pr.id], L: pr.L } : null, secondary: sc ? { wp: G.WEAPON[sc.id], L: sc.L } : null, kit, inv, startItems, insured, explosives: (G.UI.mis.ex || ['m67', 'm84']).slice(0, 2) };
    if (!cfg.primary) { cfg.primary = cfg.secondary; cfg.secondary = null; }
  }
  X.save(); G.Audio.init();
  G.UI.loading('Loading the raid…', () => X.start(cfg));
};

// ------------------------------------------------------------------ auction house
// Every few minutes a rare lot comes up: top-rated armour and helmets, premium night vision and thermals,
// bomb suits and plate harnesses, fully kitted weapons (the most expensive parts on the market) and rare
// valuables. Each lot runs for a few minutes; rival bidders raise the price at random up to a hidden
// ceiling of their own. Your bid is held in escrow and refunded if you are outbid. A bid in the last
// 30 s extends the lot by 30 s. Lots keep running (and resolve) while you are in a raid.
const BIDDERS = ['Fence', 'Sh0tgunBob', 'GearQueen', 'Ratnik_77', 'TacticalTom', 'Baron', 'Kolya_Sniper', 'LootGoblin', 'Mr. Kim', 'Valkyrie', 'Hoarder', 'Chad_Ops'];
const RARITY = [[400000, 'Legendary', '#ff9a3a'], [200000, 'Epic', '#c07aff'], [90000, 'Rare', '#5ab4ff'], [0, 'Uncommon', '#a6d98a']];
const rarity = v => RARITY.find(r => v >= r[0]);
const BAD = /solvent|beanbag|bird|pink|pearl|stk_none|tracer|steelcase|wirecut|lowrec|frangible|soft$/;
const bestBuild = (wp, R) => { const L = G.defaultLoadout(wp); for (const [sl] of G.SLOTS) { const o = G.attachFor(wp, sl).filter(a => !G.DEFAULT_IDS.includes(a.id) && !BAD.test(a.id) && !a.s.tracer); if (!o.length || (sl === 'finish' && R() < .5)) continue; o.sort((a, b) => G.priceAtt(b) - G.priceAtt(a)); L[sl] = o[Math.floor(R() * Math.min(3, o.length))].id; } if (!G.auxWorks(L)) L.aux = 'aux_none'; return L; };
X.rollLot = function (R = Math.random) {
  for (let k = 0; k < 20; k++) { const l = X.rollLot1(R); if (l.value >= 90000 || k === 19) return l; } // only genuinely good stuff goes to auction
};
X.rollLot1 = function (R = Math.random) {
  const kind = R();
  let item;
  if (kind < .4) { // premium weapon with a top-shelf build
    const pool = G.WEAPONS.filter(w => (['now', 'mod'].includes(w.e) && ['AR', 'BR', 'DMR', 'SR', 'LMG', 'CAR'].includes(w.c)) || (w.e === 'psycho' && R() < .5) || (w.proto && w.c !== 'PST'));
    const wp = pick(pool, R); item = { t: 'w', id: wp.id, L: bestBuild(wp, R), u: uid() };
  } else if (kind < .85) { // top-tier kit
    const good = G.GEAR.filter(g => !/_none$|^g_none$/.test(g.id) && ((g.slot === 'helmet' && (g.rating || 0) >= 4.2) || (g.slot === 'armor' && (g.cat || (g.plates && g.cov && g.cov.sides))) || (g.slot === 'plates' && (g.rating || 0) >= 14) || (g.slot === 'nvg' && g.nv && g.nv.q >= .85) || /psy/.test(g.id)));
    item = { t: 'g', id: pick(good, R).id, u: uid() };
  } else item = { t: 'l', id: pick(['l_gpu', 'l_coin', 'l_ingot', 'l_ledx', 'l_folder', 'l_nvtube', 'l_icon', 'l_ring'], R), u: uid() };
  const v = Math.max(20000, itemPrice(item)), now = Date.now(), dur = (3 + R() * 4) * 60 * 1000;
  return { id: uid(), item, value: v, bid: Math.round(v * (.45 + R() * .2) / 500) * 500, bidder: null, mine: 0, npcMax: Math.round(v * (.85 + R() * .75)), npcAt: now + 15000 + R() * 40000, start: now, ends: now + dur, done: false };
};
X.auctionSim = function () {
  const S = X.stash, now = Date.now(); S.auctions = S.auctions || []; let changed = false;
  if (!S.nextLot || S.nextLot < now - 30 * 60 * 1000) { // first visit or a long time away: a few lots are already running
    for (let i = S.auctions.filter(a => !a.done && a.ends > now).length; i < 3; i++) { const a = X.rollLot(); a.ends = now + (1.5 + i * 1.6 + Math.random()) * 60 * 1000; a.npcAt = now + 8000 + Math.random() * 20000; S.auctions.push(a); }
    S.nextLot = now + (2.5 + Math.random() * 3.5) * 60 * 1000; changed = true;
  }
  while (S.nextLot <= now) { if (S.auctions.filter(a => !a.done).length < 4) { const a = X.rollLot(); a.start = S.nextLot; a.ends = S.nextLot + (a.ends - now); a.npcAt = S.nextLot + 20000; S.auctions.push(a); X.notify = `🔨 New lot: ${itemName(a.item)}`; } S.nextLot += (2.5 + Math.random() * 3.5) * 60 * 1000; changed = true; }
  for (const a of S.auctions) {
    if (a.done) continue;
    // rival bids up to their ceiling, more often near the end
    while (a.npcAt <= Math.min(now, a.ends) && a.bidder !== 'npc-max') {
      const next = Math.round(Math.max(a.bid * 1.06, a.bid + 1000) / 500) * 500;
      if ((a.bidder && a.bidder !== 'you') || next > a.npcMax) { a.npcAt = a.ends + 1; break; } // nobody outbids a rival; stop when over their ceiling
      if (a.bidder === 'you') { S.money += a.mine; a.mine = 0; X.notify = `Outbid on ${itemName(a.item)}`; }
      a.bid = next; a.bidder = pick(BIDDERS); a.lastBidT = a.npcAt;
      if (a.ends - a.npcAt < 30000) a.ends = a.npcAt + 30000; // sniping protection works for them too
      const left = a.ends - a.npcAt; a.npcAt += Math.min(left * .8, 4000 + Math.random() * (left > 60000 ? 50000 : 12000));
      changed = true;
    }
    if (a.bidder && a.bidder !== 'you' && a.npcAt > a.ends) a.npcAt = a.ends + 1;
    if (now >= a.ends) { a.done = true; changed = true;
      if (a.bidder === 'you') { S.items.push(a.item); a.won = true; X.notify = `🏆 You won ${itemName(a.item)} for ${fmt(a.bid)}`; }
    }
  }
  S.auctions = S.auctions.filter(a => !a.done || now - a.ends < 10 * 60 * 1000).slice(-12);
  if (changed) X.save();
  return changed;
};
X.bid = function (id, mult) {
  X.auctionSim();
  const S = X.stash, a = S.auctions.find(x => x.id === id); if (!a || a.done) return;
  if (a.bidder === 'you') { G.UI.toast('You are already the highest bidder', 1.5); return; }
  const amt = Math.round(Math.max(a.bid * mult, a.bid + 1000) / 500) * 500;
  if (S.money < amt) { G.UI.toast(`You need ${fmt(amt)}`, 1.5); return; }
  S.money -= amt; a.mine = amt; a.bid = amt; a.bidder = 'you';
  const now = Date.now(); if (a.ends - now < 30000) a.ends = now + 30000;
  // a rival who still wants it answers after a few seconds
  if (amt * 1.06 <= a.npcMax) a.npcAt = now + 3000 + Math.random() * Math.min(20000, (a.ends - now) * .6); else a.npcAt = a.ends + 1;
  X.save(); G.Audio.ui && G.Audio.ui('attach'); G.UI.toast(`Bid ${fmt(amt)} on ${itemName(a.item)}`, 1.6);
};
X.auctionHTML = function () {
  const S = X.stash, esc = G.UI.esc, now = Date.now();
  const lots = (S.auctions || []).slice().sort((a, b) => (a.done - b.done) || a.ends - b.ends);
  const detail = it => {
    if (it.t === 'w') { const wp = G.WEAPON[it.id], parts = Object.values(it.L).filter(id => !G.DEFAULT_IDS.includes(id)).map(id => G.ATT[id] && G.ATT[id].n).filter(Boolean); return `${esc(G.ERA[wp.e].name)} · ${esc(G.CLASS_NAMES[wp.c])} · ${esc(wp.cal)}<br><span style="opacity:.75">${parts.map(esc).join(' · ')}</span>`; }
    if (it.t === 'g') { const g = G.GEARID[it.id]; return `${esc(g.co || '')} · ${g.y}${g.wt ? ' · ' + g.wt + ' kg' : ''}${g.rating ? ' · rating ' + g.rating : ''}${g.soft ? ' · soft ' + g.soft : ''}<br><span style="opacity:.75">${G.gearProps(g).perks.map(p => esc(p[0])).join(' · ')}</span>`; }
    return esc(G.LOOTID[it.id].cat);
  };
  return `<p class="muted">Rare lots come up every few minutes and run for 3–7 minutes. Your bid is held until you are outbid (then refunded); a bid in the last 30 s adds 30 s. Next lot in <b data-next>${mmss(Math.max(0, (S.nextLot - now) / 1000))}</b>.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:8px">${lots.map(a => { const r = rarity(a.value), mine = a.bidder === 'you', left = Math.max(0, (a.ends - now) / 1000);
      return `<div class="card" style="cursor:default;border-color:${a.done ? 'var(--line2)' : r[2]};opacity:${a.done ? .6 : 1}"><small style="color:${r[2]}">${r[1]} · ${a.item.t === 'w' ? 'Weapon' : a.item.t === 'g' ? 'Equipment' : 'Valuable'} · est. ${fmt(a.value)}</small><b style="font-size:17px">${esc(itemName(a.item))}</b><span style="font-size:12.5px">${detail(a.item)}</span>
        <span style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px"><span style="font:700 20px var(--f-mono,monospace);color:${mine ? '#a6d98a' : '#e8e2cc'}">${fmt(a.bid)}</span><span data-ends="${a.ends}" style="font:600 14px var(--f-mono,monospace);color:${left < 30 && !a.done ? '#ff6a5a' : '#e6c572'}">${a.done ? (a.won ? 'WON' : 'SOLD') : mmss(left)}</span></span>
        <span>${a.done ? (a.won ? '🏆 In your stash' : `Sold to ${esc(a.bidder || 'nobody')}`) : a.bidder ? (mine ? '✔ You are winning' : `Highest: ${esc(a.bidder)}`) : 'No bids yet'}</span>
        ${a.done ? '' : `<span style="display:flex;gap:6px;margin-top:4px">${[[1.05, '+5%'], [1.1, '+10%'], [1.25, '+25%']].map(([m, t]) => `<button class="btn small" data-bid="${a.id}" data-m="${m}" ${mine ? 'disabled' : ''}>${t} · ${fmt(Math.round(Math.max(a.bid * m, a.bid + 1000) / 500) * 500)}</button>`).join('')}</span>`}</div>`; }).join('') || '<p class="muted">No lots yet — the first one is coming up.</p>'}</div>`;
};
X.auctionBind = function (root, re) {
  root.querySelectorAll('[data-bid]').forEach(b => b.onclick = () => { X.bid(b.dataset.bid, +b.dataset.m); re(); });
  clearInterval(X._aT);
  X._aT = setInterval(() => {
    if (G.UI.screen !== 'extraction' || !root.isConnected) { clearInterval(X._aT); return; }
    const ch = X.auctionSim();
    if (X.notify) { G.UI.toast(X.notify, 3); X.notify = null; }
    if (ch && X.tab === 'auction') return re();
    if (ch) { const t = root.querySelector('[data-tab="auction"]'); const n = X.stash.auctions.filter(a => !a.done).length; if (t) t.textContent = `🔨 Auction${n ? ` (${n})` : ''}`; return; }
    const now = Date.now();
    root.querySelectorAll('[data-ends]').forEach(e => { const a = (X.stash.auctions || []).find(x => x.ends === +e.dataset.ends); if (a && !a.done) { const l = Math.max(0, (a.ends - now) / 1000); e.textContent = mmss(l); e.style.color = l < 30 ? '#ff6a5a' : '#e6c572'; } });
    const nx = root.querySelector('[data-next]'); if (nx) nx.textContent = mmss(Math.max(0, (X.stash.nextLot - now) / 1000));
  }, 1000);
};

// ------------------------------------------------------------------ hooks into the main loop
const upd0 = Game.update;
Game.update = function (dt, now) {
  if (Game.raid && Game.lootOpen) { // inventory open: the world keeps moving, you don't
    const keep = G.Input.frame; G.Input.frame = () => { const f = keep(); const tab = f.tab; for (const k in f) if (typeof f[k] === 'boolean') f[k] = false; f.f = f.r = f.dx = f.dy = 0; f.swap = undefined; if (tab) X.closePanel(); return f; };
    try { upd0.call(this, dt, now); } finally { G.Input.frame = keep; }
    X.panelTick(dt); if (Game.raid && !Game.raid.done && Game.player) { X.update(dt, Game.player, {}); if (X.panel && Game.frame % 20 === 0 && !X.panelCont) X.renderPanel(); }
    return;
  }
  upd0.call(this, dt, now);
  if (Game.raid && Game.state === 'play' && Game.player) X.update(dt, Game.player, X.lastInput || {});
};
// capture the per-frame input for raid keys (Tab, 5)
const frame0 = G.Input.frame;
G.Input.frame = function () { const tab = !!G.Input.edge.Tab, med = !!G.Input.edge.Digit5; const f = frame0.call(G.Input); f.tab = tab; f.med = med; G.Input.edge.Tab = G.Input.edge.Digit5 = false; X.lastInput = f; return f; };
const clean0 = Game.cleanup;
Game.cleanup = function () { if (X.panel) X.closePanel(); const h = document.getElementById('raidhud'); if (h) h.remove(); const c = document.getElementById('raidc'); if (c) c.remove(); Game.raid = null; Game.lootOpen = false; return clean0.apply(this, arguments); };
})();
