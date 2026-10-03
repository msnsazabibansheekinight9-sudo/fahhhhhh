// ============================================================================
// IRONSIGHT — arsenal part 7: about 100 more real weapons from 1897 to 2024.
// Like part 5, each is a documented variant or close relative of a modelled
// weapon (same action and layout): it inherits that model and gets its own
// name, year, country, calibre, rate, capacity, velocity, weight, handling
// and, where the real gun differs, barrel length or fire modes.
// ============================================================================
'use strict';
(function () {
const G = window.G;
Object.assign(G.CAL, {
  '.32 ACP':       { k: .00280, pen: 1, cs: [.017, .0039] },
  '7.65mm Longue': { k: .00260, pen: 1, cs: [.020, .0039] },
  '.38 S&W':       { k: .00240, pen: 1, cs: [.020, .0045] },
  '.500 S&W':      { k: .00160, pen: 2, cs: [.041, .0063] },
  '8×59mm':        { k: .00080, pen: 3, cs: [.059, .0062] },
});
Object.assign(G.MASS || (G.MASS = {}), { '.32 ACP': 4.7, '7.65mm Longue': 5.5, '.38 S&W': 9.3, '.500 S&W': 22.7, '8×59mm': 13.6 });
const W = G.WEAPONS, B = id => G.WEAPON[id];
const clone = o => JSON.parse(JSON.stringify(o));
function v(base, o) {
  const b = B(base); if (!b || G.WEAPON[o.id] || W.some(w => w.id === o.id)) return;
  const n = clone(b); const m = o.m; delete o.m; Object.assign(n, o); if (m) n.m = Object.assign(n.m || {}, m);
  if (m && m.B && b.m.B) n.m.B = [m.B[0], m.B[1] || b.m.B[1]];
  delete n.proto; delete n.blurb; W.push(n);
}
const semi = { act: 'semi', modes: ['semi'] };

// ---------------------------------------------------------------- WW1 era (1897–1918)
v('arisaka38', { id: 'arisaka30', n: 'Arisaka Type 30', y: 1897, co: 'Empire of Japan', v: 700, acc: 3.4, wt: 3.9 });
v('mosin91', { id: 'mosin_drag', n: 'Mosin–Nagant M1891 Dragoon', y: 1891, co: 'Russian Empire', v: 810, wt: 3.9, m: { B: [.73] } });
v('berthier', { id: 'berthier1907', n: 'Berthier Mle 1907/15', y: 1915, co: 'France', mag: 3, wt: 3.8 });
v('vickers', { id: 'maxim1910', n: 'Maxim PM M1910', y: 1910, co: 'Russian Empire', cal: '7.62×54mmR', rpm: 600, v: 865, wt: 23.8 });
v('vickers', { id: 'mg08', n: 'MG 08 (sled mount)', y: 1908, co: 'German Empire', cal: '7.92×57mm', rpm: 450, v: 890, wt: 26.5 });
v('webley', { id: 'webfosbery', n: 'Webley–Fosbery Automatic Revolver', y: 1901, co: 'United Kingdom', rpm: 240, wt: 1.24, acc: 4.5 });
v('ruby', { id: 'savage1907', n: 'Savage Model 1907', y: 1907, co: 'United States', cal: '.32 ACP', mag: 10, v: 290, dmg: 18, wt: .6 });
v('ruby', { id: 'fn1900', n: 'FN Model 1900', y: 1900, co: 'Belgium', cal: '.32 ACP', mag: 7, v: 290, dmg: 18, wt: .62 });

// ---------------------------------------------------------------- WW2 era
v('c96', { id: 'm712', n: 'Mauser M712 Schnellfeuer', y: 1932, e: 'ww2', co: 'Germany', act: 'auto', modes: ['semi', 'auto'], rpm: 900, mag: 20, wt: 1.36 });
v('k98k', { id: 'vz24', n: 'Puška vz. 24', y: 1924, co: 'Czechoslovakia', wt: 4.2 });
v('carcano', { id: 'carcano38', n: 'Carcano M38 short rifle', y: 1938, e: 'ww2', co: 'Italy', wt: 3.4, m: { B: [.53] } });
v('arisaka38', { id: 'arisaka44', n: 'Arisaka Type 44 cavalry carbine', y: 1911, e: 'ww2', co: 'Empire of Japan', wt: 3.9, m: { B: [.48] } });
v('mp40', { id: 'mas38', n: 'MAS-38', y: 1938, co: 'France', cal: '7.65mm Longue', rpm: 600, mag: 32, v: 350, dmg: 20, wt: 2.87 });
v('ppd40', { id: 'ppd34', n: 'PPD-34/38', y: 1934, co: 'Soviet Union', rpm: 800, mag: 25, wt: 3.7 });
v('mp18', { id: 'mp34', n: 'Steyr-Solothurn MP 34', y: 1934, co: 'Austria', cal: '9×19mm', rpm: 800, mag: 32, wt: 4.25 });
v('mp18', { id: 'mp35', n: 'Bergmann MP 35', y: 1935, co: 'Germany', cal: '9×19mm', rpm: 650, mag: 32, wt: 4.1 });
v('sten', { id: 'austen', n: 'Austen Mk I', y: 1942, co: 'Australia', rpm: 500, wt: 3.98 });
v('type99lmg', { id: 'type96lmg', n: 'Type 96 LMG', y: 1936, co: 'Empire of Japan', cal: '6.5×50mmSR', rpm: 550, v: 730, wt: 9 });
v('lewis', { id: 'vickersk', n: 'Vickers K (VGO)', y: 1935, e: 'ww2', co: 'United Kingdom', rpm: 1000, mag: 100, wt: 9.5 });
v('zb26', { id: 'zb30', n: 'ZB vz. 30', y: 1930, co: 'Czechoslovakia', rpm: 550, wt: 10 });
v('m1919', { id: 'm1919a4', n: 'Browning M1919A4', y: 1934, co: 'United States', rpm: 500, wt: 14 });
v('m1919', { id: 'breda37', n: 'Breda M37', y: 1937, co: 'Italy', cal: '8×59mm', rpm: 450, v: 790, wt: 19.4 });
v('g43', { id: 'k43', n: 'Karabiner 43', y: 1944, co: 'Germany', wt: 4.33 });
v('svt40', { id: 'avt40', n: 'AVT-40', y: 1942, co: 'Soviet Union', act: 'auto', modes: ['semi', 'auto'], rpm: 650, wt: 3.9 });
v('hipower', { id: 'inglis', n: 'Inglis Hi-Power No. 2 Mk I', y: 1944, e: 'ww2', co: 'Canada', wt: 1.0 });
v('tt33', { id: 'tt30', n: 'Tokarev TT-30', y: 1930, co: 'Soviet Union', wt: .85 });
v('ppk', { id: 'beretta34', n: 'Beretta M1934', y: 1934, co: 'Italy', cal: '.380 ACP', mag: 7, v: 270, wt: .66 });
v('ppk', { id: 'sauer38h', n: 'Sauer 38H', y: 1938, co: 'Germany', cal: '.32 ACP', mag: 8, v: 285, wt: .72 });
v('webley', { id: 'webley4', n: 'Webley Mk IV (.38/200)', y: 1932, e: 'ww2', co: 'United Kingdom', cal: '.38 S&W', v: 190, dmg: 26, wt: .76 });

// ---------------------------------------------------------------- Cold War
v('m14', { id: 'm1a', n: 'Springfield M1A', y: 1974, co: 'United States', ...semi, wt: 4.1 });
v('m14', { id: 'bm59', n: 'Beretta BM 59', y: 1959, co: 'Italy', rpm: 750, wt: 4.6 });
v('g3', { id: 'cetme_c', n: 'CETME Model C', y: 1964, co: 'Spain', rpm: 600, wt: 4.2 });
v('g3', { id: 'g3ka4', n: 'H&K G3KA4', y: 1970, co: 'West Germany', wt: 4.7, m: { B: [.315] } });
v('fal', { id: 'falpara', n: 'FN FAL 50.63 Para', y: 1960, co: 'Belgium', wt: 3.8, m: { B: [.436], stk: 'side_fold' } });
v('sig550', { id: 'ar7090', n: 'Beretta AR70/90', y: 1990, co: 'Italy', rpm: 670, wt: 3.99 });
v('galil', { id: 'galilmar', n: 'IMI Galil MAR (Micro)', y: 1995, co: 'Israel', wt: 2.98, m: { B: [.195] } });
v('akm', { id: 'm70', n: 'Zastava M70', y: 1970, co: 'Yugoslavia', wt: 3.7 });
v('akm', { id: 'pmmd63', n: 'PM md. 63', y: 1963, co: 'Romania', wt: 3.5 });
v('akm', { id: 'ak63', n: 'FEG AK-63', y: 1977, co: 'Hungary', wt: 3.1 });
v('type56', { id: 'type561', n: 'Type 56-1 (underfolder)', y: 1964, co: 'China', wt: 3.85 });
v('rk62', { id: 'rk95', n: 'Sako RK 95 TP', y: 1995, co: 'Finland', wt: 3.7 });
v('hk21', { id: 'hk23e', n: 'H&K HK23E', y: 1981, co: 'West Germany', cal: '5.56×45mm', rpm: 750, v: 950, wt: 8.75 });
v('minimi', { id: 'ultimax', n: 'Ultimax 100 Mk 3', y: 1982, co: 'Singapore', rpm: 600, mag: 100, wt: 4.9 });
v('mp5', { id: 'mp5a2', n: 'H&K MP5A2', y: 1977, co: 'West Germany', wt: 2.55 });
v('mp5', { id: 'mp5n', n: 'H&K MP5N (Navy)', y: 1986, co: 'West Germany', wt: 2.6 });
v('uzi', { id: 'miniuzi', n: 'IMI Mini Uzi', y: 1980, co: 'Israel', rpm: 1200, mag: 25, wt: 2.7, m: { B: [.197] } });
v('makarov', { id: 'p64', n: 'P-64 CZAK', y: 1965, co: 'Poland', mag: 6, wt: .64 });
v('makarov', { id: 'pb', n: 'PB silenced pistol', y: 1967, co: 'Soviet Union', intSup: true, v: 290, wt: .97 });
v('hipower', { id: 'mabpa15', n: 'MAB PA-15', y: 1975, co: 'France', mag: 15, wt: 1.09 });
v('beretta92', { id: 'm1951', n: 'Beretta M1951', y: 1951, co: 'Italy', mag: 8, wt: .87 });
v('tt33', { id: 'm57', n: 'Zastava M57', y: 1957, co: 'Yugoslavia', mag: 9, wt: .9 });
v('tt33', { id: 'type54', n: 'Norinco Type 54', y: 1954, co: 'China', wt: .85 });
v('p99', { id: 'p7m8', n: 'H&K P7M8', y: 1979, co: 'West Germany', mag: 8, wt: .78, acc: 3 });
v('glock17', { id: 'vp70', n: 'H&K VP70M', y: 1970, co: 'West Germany', mag: 18, act: 'auto', modes: ['semi', 'burst3'], rpm: 2200, wt: .82 });
v('saiga12', { id: 'spas15', n: 'Franchi SPAS-15', y: 1986, co: 'Italy', mag: 6, wt: 3.9 });
v('r870', { id: 'win1200', n: 'Winchester 1200 Defender', y: 1964, co: 'United States', wt: 3.2 });
v('svd', { id: 'svds', n: 'SVDS (folding stock)', y: 1991, co: 'Soviet Union', wt: 4.68, m: { B: [.565] } });
v('m40', { id: 'm40a1', n: 'M40A1', y: 1977, co: 'United States', wt: 6.6 });

// ---------------------------------------------------------------- Modern (1990–2009)
v('m16a4', { id: 'm16a3', n: 'M16A3', y: 1993, co: 'United States', act: 'auto', modes: ['semi', 'auto'] });
v('m16a4', { id: 'c7a2', n: 'Colt Canada C7A2', y: 2001, co: 'Canada' });
v('m4a1', { id: 'c8sfw', n: 'Colt Canada C8 SFW', y: 2005, co: 'Canada', wt: 3.3 });
v('ak103', { id: 'ak104', n: 'AK-104', y: 1995, co: 'Russia', wt: 3.0, m: { B: [.314] } });
v('ak101', { id: 'ak102', n: 'AK-102', y: 1995, co: 'Russia', wt: 3.0, m: { B: [.314] } });
v('aug', { id: 'auga3', n: 'Steyr AUG A3', y: 2005, co: 'Austria', wt: 3.8 });
v('aug', { id: 'augpara', n: 'Steyr AUG Para (9 mm)', y: 1988, co: 'Austria', cal: '9×19mm', rpm: 700, mag: 32, v: 400, dmg: 26, wt: 3.3 });
v('g36', { id: 'g36v', n: 'H&K G36V (export)', y: 1999, co: 'Germany' });
v('hk416', { id: 'hk417', n: 'H&K HK417', y: 2005, co: 'Germany', cal: '7.62×51mm', rpm: 600, mag: 20, v: 790, dmg: 50, rec: [1.7, .7], wt: 4.4 });
v('scarh', { id: 'mk20ssr', n: 'FN Mk 20 SSR', y: 2010, e: 'now', co: 'Belgium', ...semi, acc: 1.1, wt: 4.8, defOptic: 'leupold10' });
v('scarh', { id: 'mk17cqc', n: 'FN SCAR-H CQC', y: 2005, co: 'Belgium', wt: 3.5, m: { B: [.33] } });
v('sr25', { id: 'm110sass', n: 'KAC M110 SASS', y: 2008, co: 'United States', wt: 6.9 });
v('sr25', { id: 'mk11', n: 'Mk 11 Mod 0', y: 2000, co: 'United States', wt: 7.0 });
v('psg1', { id: 'msg90', n: 'H&K MSG90', y: 1987, co: 'West Germany', wt: 6.4 });
v('l96', { id: 'aiaw', n: 'Accuracy Intl. Arctic Warfare', y: 1988, co: 'United Kingdom', wt: 6.5 });
v('m240', { id: 'm240l', n: 'M240L (titanium)', y: 2010, e: 'now', co: 'United States', wt: 10.1 });
v('mg4', { id: 'mg5', n: 'H&K MG5', y: 2015, e: 'now', co: 'Germany', cal: '7.62×51mm', rpm: 720, v: 820, dmg: 52, wt: 11.6 });
v('negev', { id: 'negevng5', n: 'IWI Negev NG5', y: 2012, co: 'Israel', cal: '5.56×45mm', rpm: 850, v: 915, dmg: 34, wt: 7.6 });
v('ump45', { id: 'ump9', n: 'H&K UMP9', y: 2000, co: 'Germany', cal: '9×19mm', rpm: 650, mag: 30, v: 400, dmg: 26, wt: 2.2 });
v('vector', { id: 'vector9', n: 'KRISS Vector (9 mm)', y: 2011, co: 'United States', cal: '9×19mm', mag: 33, v: 400, dmg: 26, wt: 2.6 });
v('apc9', { id: 'apc45', n: 'B&T APC45', y: 2011, co: 'Switzerland', cal: '.45 ACP', mag: 25, v: 280, dmg: 34, wt: 2.6 });
v('saiga12', { id: 'saiga12k', n: 'Saiga-12K', y: 2000, co: 'Russia', wt: 3.5 });
v('m1014', { id: 'benellim2', n: 'Benelli M2 Tactical', y: 2005, co: 'Italy', wt: 3.2 });
v('m1014', { id: 'moss930', n: 'Mossberg 930 SPX', y: 2005, co: 'United States', wt: 3.4 });
v('ksg', { id: 'uts15', n: 'UTAS UTS-15', y: 2012, e: 'now', co: 'Turkey', mag: 14, wt: 3.4 });

// ---------------------------------------------------------------- Present day (2010–2024)
v('xm7', { id: 'spearlt', n: 'SIG MCX Spear LT', y: 2022, co: 'United States', cal: '5.56×45mm', rpm: 800, mag: 30, v: 880, dmg: 34, rec: [1, .45], wt: 3.4 });
v('hk433', { id: 'hk437', n: 'H&K HK437', y: 2020, co: 'Germany', cal: '.300 BLK', v: 670, dmg: 38, wt: 3.3 });
v('m4a1', { id: 'ks1', n: 'Knight\'s KS-1 (L403A1)', y: 2024, e: 'now', co: 'United Kingdom', wt: 3.4, acc: 1.4 });
v('hk416', { id: 'grot', n: 'FB MSBS Grot C', y: 2017, e: 'now', co: 'Poland', rpm: 700, wt: 3.7 });
v('tavor', { id: 'vhs2', n: 'HS Produkt VHS-2', y: 2013, e: 'now', co: 'Croatia', rpm: 850, wt: 3.4 });
v('l85', { id: 'l85a3', n: 'L85A3', y: 2018, e: 'now', co: 'United Kingdom', wt: 4.0 });
v('ace32', { id: 'ace21', n: 'IWI Galil ACE 21', y: 2008, co: 'Israel', cal: '5.56×45mm', v: 850, dmg: 34, wt: 3.3 });
v('ace32', { id: 'ace52', n: 'IWI Galil ACE 52', y: 2010, co: 'Israel', cal: '7.62×51mm', mag: 25, v: 830, dmg: 50, rec: [1.7, .7], wt: 3.9 });
v('fal', { id: 'sa58', n: 'DS Arms SA58 OSW', y: 2010, e: 'now', co: 'United States', wt: 3.9, m: { B: [.33] } });
v('awm', { id: 'mk13', n: 'Mk 13 Mod 7', y: 2018, e: 'now', co: 'United States', cal: '.300 Win Mag', v: 870, wt: 7.8 });
v('trg42', { id: 'trg22', n: 'Sako TRG 22', y: 2000, co: 'Finland', cal: '7.62×51mm', v: 830, dmg: 60, wt: 4.7 });
v('trg42', { id: 'blaserr93', n: 'Blaser R93 Tactical 2', y: 2007, co: 'Germany', cal: '.338 Lapua', wt: 6.0 });
v('tac50', { id: 'tac338', n: 'McMillan TAC-338', y: 2009, co: 'United States', cal: '.338 Lapua', mag: 5, v: 900, dmg: 110, wt: 7.5 });
v('m107a1', { id: 'm99', n: 'Barrett M99', y: 1999, co: 'United States', act: 'bolt', modes: ['bolt'], rpm: 30, mag: 1, wt: 11.3 });
v('glock19', { id: 'glock26', n: 'Glock 26', y: 1995, e: 'mod', co: 'Austria', mag: 10, wt: .62, acc: 4.5 });
v('glock19', { id: 'glock43x', n: 'Glock 43X MOS', y: 2019, co: 'Austria', mag: 10, wt: .53 });
v('glock19', { id: 'glock17g5', n: 'Glock 17 Gen5 MOS', y: 2017, co: 'Austria', mag: 17, wt: .72 });
v('m17', { id: 'p320', n: 'SIG P320 Full-size', y: 2014, co: 'United States', wt: .83 });
v('m17', { id: 'apx', n: 'Beretta APX A1', y: 2021, co: 'Italy', mag: 17, wt: .79 });
v('p226', { id: 'p226mk25', n: 'SIG P226 Mk 25', y: 2015, e: 'now', co: 'United States', wt: .96 });
v('usp', { id: 'hk45', n: 'H&K HK45', y: 2007, co: 'Germany', cal: '.45 ACP', mag: 10, v: 260, dmg: 34, wt: .88 });
v('usp', { id: 'p30', n: 'H&K P30', y: 2006, co: 'Germany', cal: '9×19mm', mag: 15, v: 360, dmg: 26, wt: .74 });
v('p10', { id: 'p09', n: 'CZ P-09', y: 2013, co: 'Czech Republic', mag: 19, wt: .8 });
v('p99', { id: 'ppq', n: 'Walther PPQ M2', y: 2013, e: 'now', co: 'Germany', wt: .7 });
v('glock19', { id: 'mp9m2', n: 'S&W M&P9 M2.0', y: 2017, co: 'United States', mag: 17, wt: .7 });
v('m1911a1', { id: 'kimber', n: 'Kimber Custom TLE II', y: 2003, e: 'mod', co: 'United States', wt: 1.06, acc: 2.5 });
v('sw686', { id: 'gp100', n: 'Ruger GP100', y: 1985, co: 'United States', wt: 1.13 });
v('sw29', { id: 'sw500', n: 'S&W Model 500', y: 2003, e: 'mod', co: 'United States', cal: '.500 S&W', mag: 5, v: 520, dmg: 95, rec: [3.4, .9], wt: 2.05 });
v('makarov', { id: 'mp443', n: 'MP-443 Grach', y: 2003, e: 'mod', co: 'Russia', cal: '9×19mm', mag: 17, v: 350, dmg: 26, wt: .95 });
v('beretta92', { id: 'qsz92', n: 'Norinco QSZ-92', y: 1998, co: 'China', mag: 15, wt: .76 });
v('beretta92', { id: 'm9a3', n: 'Beretta M9A3', y: 2015, e: 'now', co: 'United States', mag: 17, wt: .97 });
G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));
})();
