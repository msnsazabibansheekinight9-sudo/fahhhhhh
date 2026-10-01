// ============================================================================
// IRONSIGHT — arsenal part 5: 74 more real weapons from 1888 to today.
// Each is a documented variant or close relative of a weapon already modelled
// (same action family and layout), so it inherits that verified model and
// gets its own name, year, country, calibre, rate of fire, magazine, muzzle
// velocity, handling and — where the real gun differs — barrel length,
// receiver size, stock or magazine.
// ============================================================================
'use strict';
(function () {
const G = window.G;
Object.assign(G.CAL, {
  '.380 ACP':  { k: .00250, pen: 1, cs: [.017, .0045] },
  '8×27mmR':   { k: .00240, pen: 1, cs: [.027, .0045] },
});
Object.assign(G.MASS || (G.MASS = {}), { '.380 ACP': 6.2, '8×27mmR': 7.8 });

const W = G.WEAPONS, B = id => G.WEAPON[id];
const clone = o => JSON.parse(JSON.stringify(o));
// v(baseId, overrides): copy the base weapon, apply the overrides (m is merged, not replaced)
function v(base, o) {
  const b = B(base); if (!b || G.WEAPON[o.id]) return;
  const n = clone(b); const m = o.m; delete o.m; Object.assign(n, o); if (m) n.m = Object.assign(n.m || {}, m);
  delete n.proto; W.push(n);
}

// ---------------------------------------------------------------- WW1
v('g98', { id: 'g88', n: 'Gewehr 88 "Commission Rifle"', y: 1888, co: 'German Empire', v: 640, acc: 3.2, wt: 3.8, d: 'The commission rifle the Gew 98 replaced; still issued to second-line troops in 1914.' });
v('nagant', { id: 'mas1892', n: 'MAS Mle 1892 revolver', y: 1892, co: 'France', cal: '8×27mmR', v: 220, dmg: 22, wt: .84 });
v('sw1917', { id: 'colt1917', n: 'Colt M1917 revolver', y: 1917, co: 'United States', wt: 1.13 });
v('ruby', { id: 'beretta1915', n: 'Beretta M1915', y: 1915, co: 'Italy', cal: '9mm Glisenti', mag: 7, wt: .85 });
v('ruby', { id: 'frommer', n: 'Frommer Stop M1912', y: 1912, co: 'Austria-Hungary', cal: '.380 ACP', mag: 7, wt: .61 });
v('vickers', { id: 'fiat1914', n: 'Fiat–Revelli M1914', y: 1914, co: 'Italy', cal: '6.5×52mm', rpm: 400, mag: 50, wt: 17 });
v('mg0815', { id: 'schwarzlose', n: 'Schwarzlose MG M.07/12', y: 1912, co: 'Austria-Hungary', cal: '8×50mmR', rpm: 400, mag: 250 });

// ---------------------------------------------------------------- WW2
v('k98k', { id: 'g3340', n: 'Gewehr 33/40', y: 1940, co: 'Germany', v: 715, acc: 3.4, wt: 3.6, m: { B: [.49, .0095] }, d: 'Short mountain-troop carbine built in Brno.' });
v('mosin9130', { id: 'm38', n: 'Mosin–Nagant M38 carbine', y: 1939, co: 'Soviet Union', v: 790, acc: 3.6, wt: 3.4, m: { B: [.51, .0095] } });
v('mosin9130', { id: 'm44', n: 'Mosin–Nagant M44', y: 1944, co: 'Soviet Union', v: 790, acc: 3.6, wt: 4.1, m: { B: [.51, .0095] }, d: 'Carbine with a permanently attached folding spike bayonet.' });
v('no4', { id: 'no5', n: 'Lee–Enfield No. 5 "Jungle Carbine"', y: 1944, co: 'United Kingdom', v: 670, rec: [1.0, .6], acc: 3.8, wt: 3.2, m: { B: [.47, .0095] } });
v('no4', { id: 'delisle', n: 'De Lisle Carbine', y: 1943, co: 'United Kingdom', cal: '.45 ACP', v: 260, dmg: 30, mag: 11, acc: 4, wt: 3.7, intSup: true, m: { B: [.48, .019] }, d: 'Integrally suppressed bolt-action .45 for commandos — one of the quietest firearms ever made.' });
v('type99', { id: 'type38c', n: 'Arisaka Type 38 carbine', y: 1906, co: 'Japan', cal: '6.5×50mmSR', v: 708, wt: 3.3, m: { B: [.48, .009] } });
v('mp40', { id: 'mp41', n: 'MP 41', y: 1941, co: 'Germany', wt: 3.9, d: 'MP 40 action in an MP 28-style wooden stock.' });
v('mp40', { id: 'emp', n: 'Erma EMP', y: 1934, co: 'Germany', rpm: 520, wt: 4.2 });
v('sten', { id: 'mp3008', n: 'MP 3008', y: 1945, co: 'Germany', wt: 3.2, d: 'Last-ditch German Sten copy with a vertical magazine.' });
v('sten', { id: 'sten3', n: 'Sten Mk III', y: 1943, co: 'United Kingdom', wt: 3.2 });
v('m1carbine', { id: 'm1a1carbine', n: 'M1A1 Carbine (paratrooper)', y: 1942, co: 'United States', wt: 2.8 });
v('thompson', { id: 'thompsonm1', n: 'Thompson M1', y: 1942, co: 'United States', rpm: 700, wt: 4.8 });
v('svt40', { id: 'svt38', n: 'SVT-38', y: 1938, co: 'Soviet Union', wt: 4.9 });
v('svt40', { id: 'avs36', n: 'AVS-36', y: 1936, co: 'Soviet Union', act: 'auto', modes: ['semi', 'auto'], rpm: 800, wt: 4.4 });
v('dp28', { id: 'dt29', n: 'DT-29', y: 1929, co: 'Soviet Union', rpm: 600, mag: 63, wt: 10.4 });
v('bren', { id: 'brenmk2', n: 'Bren Mk II', y: 1941, co: 'United Kingdom', wt: 10.2 });
v('bar1918a2', { id: 'johnsonlmg', n: 'Johnson M1941 LMG', y: 1941, co: 'United States', rpm: 450, mag: 20, wt: 5.9 });
v('ppk', { id: 'hsc', n: 'Mauser HSc', y: 1940, co: 'Germany', mag: 8, wt: .6 });
v('ruby', { id: 'fn1910', n: 'FN Model 1910', e: 'ww2', y: 1910, co: 'Belgium', cal: '.32 ACP', mag: 7, wt: .59 });
v('mp40', { id: 'zk383', n: 'ZK-383', y: 1938, co: 'Czechoslovakia', rpm: 500, mag: 30, wt: 4.8 });

// ---------------------------------------------------------------- Cold War
v('akm', { id: 'rk62', n: 'Valmet RK 62', y: 1965, co: 'Finland', acc: 3.4, wt: 3.5, d: 'Finnish AK derivative with a tubular stock and better sights.' });
v('akm', { id: 'akms', n: 'AKMS', y: 1959, co: 'Soviet Union', wt: 3.3 });
v('akm', { id: 'amd65', n: 'AMD-65', y: 1965, co: 'Hungary', rec: [.75, .5], acc: 4.5, wt: 3.2, m: { B: [.32, .009] } });
v('akm', { id: 'type81', n: 'Type 81', y: 1981, co: 'China', acc: 3.8, wt: 3.4 });
v('rpk', { id: 'rpk74', n: 'RPK-74', y: 1974, co: 'Soviet Union', cal: '5.45×39mm', v: 960, dmg: 32, mag: 45, rec: [.55, .35], wt: 4.7 });
v('mp5', { id: 'mp5k', n: 'H&K MP5K', y: 1976, co: 'West Germany', rpm: 900, v: 375, acc: 6.5, wt: 2.0, m: { R: [.2, .06, .04], B: [.115, .008] }, d: 'Compact MP5 with a vertical foregrip for close protection.' });
v('mac10', { id: 'm11', n: 'Ingram M11', y: 1972, co: 'United States', cal: '.380 ACP', rpm: 1200, mag: 32, dmg: 20, wt: 1.6 });
v('hk33', { id: 'hk53', n: 'H&K HK53', y: 1975, co: 'West Germany', rpm: 700, v: 750, acc: 4.6, wt: 3.0, m: { B: [.21, .008] } });
v('m14', { id: 'mini14', n: 'Ruger Mini-14', y: 1973, co: 'United States', c: 'CAR', cal: '5.56×45mm', modes: ['semi'], act: 'semi', v: 960, dmg: 33, mag: 20, rec: [.45, .3], wt: 2.9, m: { B: [.47, .008] } });
v('m16a2', { id: 'k2', n: 'Daewoo K2', y: 1984, co: 'South Korea', rpm: 750, wt: 3.3 });
v('galil', { id: 'galilsar', n: 'IMI Galil SAR', y: 1974, co: 'Israel', acc: 4.4, wt: 3.75, m: { B: [.33, .0085] } });
v('m249', { id: 'minimi', n: 'FN Minimi', e: 'cold', y: 1974, co: 'Belgium', wt: 7.1, d: 'The original Belgian design adopted by the US as the M249.' });
v('skorpion', { id: 'pm63', n: 'PM-63 RAK', y: 1963, co: 'Poland', cal: '9×18mm', rpm: 650, mag: 25, wt: 1.8 });
v('makarov', { id: 'vz52', n: 'CZ vz. 52', y: 1952, co: 'Czechoslovakia', cal: '7.62×25mm', mag: 8, v: 490, dmg: 24, wt: .95 });
v('hipower', { id: 'p210', n: 'SIG P210', y: 1949, co: 'Switzerland', mag: 8, acc: 2.4, wt: .9 });
v('python', { id: 'sw686', n: 'S&W Model 686', y: 1981, co: 'United States', wt: 1.16 });
v('r870', { id: 'rem1100', n: 'Remington 1100', y: 1963, co: 'United States', act: 'semi', modes: ['semi'], wt: 3.6 });

// ---------------------------------------------------------------- Modern (1990–2010)
v('ak74m', { id: 'ak101', n: 'AK-101', y: 1994, co: 'Russia', cal: '5.56×45mm', v: 910, dmg: 33 });
v('ak74m', { id: 'ak103', n: 'AK-103', y: 1994, co: 'Russia', cal: '7.62×39mm', v: 715, dmg: 40, rec: [.85, .55], rpm: 600 });
v('ak74m', { id: 'ak105', n: 'AK-105', y: 1994, co: 'Russia', v: 840, rpm: 600, acc: 4.2, wt: 3.2, m: { B: [.314, .0085] } });
v('asval', { id: 'sr3m', n: 'SR-3M Vikhr', y: 1996, co: 'Russia', rpm: 900, mag: 20, wt: 2.0, m: { mz: 'crown', B: [.16, .0085] }, d: 'Compact 9×39 assault rifle for close protection; suppressor optional.' });
v('sig550', { id: 'sig552', n: 'SIG SG 552 Commando', y: 1998, co: 'Switzerland', v: 860, acc: 4, wt: 3.2, m: { B: [.226, .008] } });
v('g36c', { id: 'g36k', n: 'H&K G36K', y: 1997, co: 'Germany', v: 880, wt: 3.3, m: { B: [.318, .008] } });
v('m16a4', { id: 'mk12', n: 'Mk 12 SPR', c: 'DMR', y: 2002, co: 'United States', modes: ['semi'], acc: 1.2, wt: 4.5, d: 'Special Purpose Rifle: a free-floated 18-inch 5.56 for SEALs and Marines.' });
v('sr25', { id: 'g28', n: 'H&K G28', e: 'now', y: 2011, co: 'Germany', acc: 1.1, wt: 5.8 });
v('mk14', { id: 'm39emr', n: 'M39 EMR', y: 2008, co: 'United States', acc: 1.3, wt: 7.5 });
v('m1014', { id: 'benellim3', n: 'Benelli M3 Super 90', y: 1989, co: 'Italy', wt: 3.3, d: 'Switches between pump and semi-auto.' });
v('p226', { id: 'p228', n: 'SIG Sauer P228 (M11)', y: 1989, co: 'Switzerland', mag: 13, wt: .83 });
v('glock17', { id: 'glock22', n: 'Glock 22', e: 'mod', y: 1990, co: 'Austria', cal: '.40 S&W', mag: 15, v: 300, dmg: 30, rec: [.45, .3] });
v('m9', { id: 'px4', n: 'Beretta Px4 Storm', y: 2004, co: 'Italy', mag: 17, wt: .78 });
v('m249', { id: 'minimipara', n: 'FN Minimi Para', y: 1990, co: 'Belgium', v: 870, wt: 7.6, m: { B: [.35, .0085] } });
v('qbz95', { id: 'qbu88', n: 'QBU-88', c: 'DMR', y: 1997, co: 'China', modes: ['semi'], mag: 10, acc: 1.4, wt: 4.1 });
v('galil', { id: 'insas', n: 'INSAS', e: 'mod', y: 1998, co: 'India', modes: ['semi', 'burst3'], rpm: 650, wt: 4.2 });

// ---------------------------------------------------------------- Present (2010–today)
v('ak12', { id: 'ak308', n: 'AK-308', y: 2018, co: 'Russia', c: 'BR', cal: '7.62×51mm', v: 800, dmg: 46, mag: 20, rec: [1.0, .6], rpm: 650, wt: 4.3 });
v('ak12', { id: 'ak12k', n: 'AK-12K', y: 2020, co: 'Russia', v: 820, acc: 4, wt: 3.0, m: { B: [.26, .0085] } });
v('rattler', { id: 'mcxvirtus', n: 'SIG MCX Virtus', y: 2017, co: 'United States', v: 880, acc: 2.6, wt: 3.0, m: { B: [.29, .008] } });
v('hk416', { id: 'lwrc', n: 'LWRC IC-A5', e: 'now', y: 2015, co: 'United States', wt: 3.0 });
v('x95', { id: 'tavor7', n: 'IWI Tavor 7', y: 2018, co: 'Israel', c: 'BR', cal: '7.62×51mm', v: 800, dmg: 46, mag: 20, rec: [.95, .6], wt: 4.1 });
v('galil', { id: 'ace32', n: 'IWI Galil ACE 32', e: 'now', y: 2008, co: 'Israel', acc: 3.4, wt: 3.4 });
v('hk433', { id: 'g95', n: 'H&K G95K', y: 2023, co: 'Germany', wt: 3.4 });
v('axmc', { id: 'trg42', n: 'Sako TRG 42', y: 2000, co: 'Finland', acc: .45, wt: 5.1 });
v('mdr', { id: 'srs', n: 'Desert Tech SRS A2', c: 'SR', y: 2008, co: 'United States', cal: '.338 Lapua', act: 'bolt', modes: ['bolt'], mag: 5, v: 900, dmg: 95, acc: .5, wt: 5.9, m: { bh: 'bolt' } });
v('mdr', { id: 'm95', n: 'Barrett M95', c: 'SR', y: 1995, co: 'United States', cal: '.50 BMG', act: 'bolt', modes: ['bolt'], mag: 5, rpm: 40, v: 853, dmg: 160, rec: [2.4, 1.2], acc: .9, wt: 10.7, m: { bh: 'bolt', B: [.74, .012], R: [.42, .1, .06] }, d: 'Bullpup bolt-action .50 — lighter and handier than the M82.' });
v('ksg', { id: 'ks7', n: 'Kel-Tec KS7', y: 2019, co: 'United States', mag: 7, wt: 2.6 });
v('glock17', { id: 'glock34', n: 'Glock 34', e: 'now', y: 1998, co: 'Austria', acc: 2.2, wt: .73 });
v('m17', { id: 'p320x5', n: 'SIG P320 X5 Legion', y: 2019, co: 'United States', mag: 21, acc: 2.2, wt: 1.2 });
v('m9', { id: 'm9a4', n: 'Beretta M9A4', e: 'now', y: 2020, co: 'Italy', mag: 18, wt: .9 });
v('fiveseven', { id: 'fnmk3', n: 'FN Five-seveN MK3', e: 'now', y: 2017, co: 'Belgium', wt: .61 });
v('cz75', { id: 'shadow2', n: 'CZ 75 Shadow 2', e: 'now', y: 2017, co: 'Czech Republic', mag: 19, acc: 1.9, wt: 1.3 });
v('p99', { id: 'pdp', n: 'Walther PDP', e: 'now', y: 2021, co: 'Germany', mag: 18, wt: .72 });
v('apc9', { id: 'ghm9', n: 'B&T GHM9', y: 2015, co: 'Switzerland', act: 'semi', modes: ['semi'], c: 'CAR', wt: 2.4 });
v('vityaz', { id: 'ppk20', n: 'Kalashnikov PPK-20', e: 'now', y: 2020, co: 'Russia', wt: 3.0 });

G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));
})();
