// ============================================================================
// IRONSIGHT — arsenal part 9: at least ten more weapons in every era and class
// group of the armory (WW1 to today, the prototypes, the Psycho Arsenal, black
// powder and artillery). Like parts 5 and 7, each is a real weapon (or, in the
// Psycho Arsenal, an invented one) that shares its action and layout with a
// modelled gun: it inherits that model and gets its own name, year, country,
// calibre, rate, capacity, velocity, weight and barrel. Every one also gets
// its own handling: weight, recoil, spread and reload times differ gun to gun.
// ============================================================================
'use strict';
(function () {
const G = window.G, W = G.WEAPONS;
const clone = o => JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ calibres: new ones copy the ballistics of a close relative
const CC = (name, like, mass) => { if (!G.CAL[name] && G.CAL[like]) G.CAL[name] = clone(G.CAL[like]); if (mass) G.MASS[name] = mass; else if (!G.MASS[name] && G.MASS[like]) G.MASS[name] = G.MASS[like]; };
[
  ['8×58mmR', '8×50mmR', 15.4], ['6.5×55mm', '6.5×52mm', 9.1], ['6.5×54mm M-S', '6.5×52mm', 10.1], ['7.65×53mm', '7×57mm', 13.6], ['.345 WSL', '.351 WSL', 13],
  ['.401 WSL', '.351 WSL', 13.6], ['.35 Remington', '.30-30 Winchester', 13], ['7×59mm Meunier', '7×57mm', 11], ['7.62×45mm', '7.62×39mm', 8.4], ['.276 Pedersen', '7×57mm', 8.4],
  ['7.92×94mm', '.55 Boys', 14.6], ['7.92×107mm', '.55 Boys', 12.8], ['20×124mm', '20×138mmB', 162], ['8×53mmR', '8×50mmR', 15.5], ['10mm Auto', '.40 S&W', 11.7],
  ['.357 SIG', '.40 S&W', 8.1], ['12.7×108mm', '.50 BMG', 48], ['20×82mm', '20×138mmB', 110], ['6.5 Creedmoor', '7.62×51mm', 9.3], ['.300 PRC', '.300 Win Mag', 14.3],
  ['.375 CheyTac', '.408 CheyTac', 22.4], ['.338 Norma Mag', '.338 Lapua', 19.4], ['.45 Schofield', '.45 Colt', 14.6], ['.22 Short', '.32 ACP', 1.9], ['11mm Mle 1873', '.455 Webley', 11.6],
  ['.442 Webley', '.455 Webley', 13], ['12mm pinfire', '.455 Webley', 12.5], ['.41 cap & ball', '.36 cap & ball', 8], ['10.4mm Vetterli', '11mm Werndl', 20], ['11mm Gras', '11mm Chassepot', 25],
  ['11mm Mauser', '11mm Werndl', 25], ['10.67mm Berdan', '11mm Werndl', 24], ['11mm Murata', '11mm Werndl', 27], ['.54 Burnside', '.52 Sharps', 22], ['.50 Smith', '.52 Sharps', 23],
  ['.45-75 WCF', '.44-40', 23], ['.45-90', '.45-70', 19.4], ['.44 Evans', '.44 Henry', 14.3], ['15mm Krnka', '.577 Snider', 30], ['.58 Albini', '.577 Snider', 31], ['18mm Tabatière', '.577 Snider', 36],
  ['8-pdr ball', '9-pdr ball', 3600], ['4-pdr ball', '3-pdr ball', 1800], ['15-inch shell', '13-inch shell', 200000], ['6.4-inch rifled shell', '9-inch shell', 45000], ['13mm Reffye', '.577 Snider', 50],
  ['85mm', '88mm', 9200], ['90mm', '88mm', 10600], ['35mm', '37mm', 550], ['25mm', '23×152mm', 250], ['57mm', '57mm AP', 2800], ['114mm', '105mm', 25000], ['140mm', '152mm', 36000],
  ['150mm', '152mm', 43500], ['130mm', '122mm', 33400], ['50mm', '37mm', 2100], ['28mm squeeze', '37mm', 130], ['45mm', '37mm', 1430], ['47mm', '37mm', 1500], ['125mm', '122mm', 23000], ['128mm', '122mm', 26000],
  ['210mm', '203mm', 113000], ['240mm', '234mm', 152000], ['356mm', '381mm', 635000], ['380mm', '381mm', 800000], ['520mm', '457mm', 1400000], ['400mm', '420mm', 900000], ['914mm Mallet', '914mm Little David', 1350000],
  ['180mm', '173mm', 97000], ['50mm mortar', '60mm mortar', 910], ['45mm mortar', '60mm mortar', 465], ['82mm mortar', '81mm mortar', 3100], ['160mm mortar', '120mm mortar', 40800], ['51mm mortar', '60mm mortar', 1000],
  ['50mm grenade', '60mm mortar', 800], ['102mm', '105mm', 14000], ['30×165mm', '23×152mm', 390], ['30×173mm', '23×152mm', 360], ['57mm RCL', '106mm RCL', 1250], ['75mm RCL', '106mm RCL', 6600],
  ['90mm RCL', '106mm RCL', 3100], ['73mm', '106mm RCL', 2600], ['107mm RCL', '106mm RCL', 8500], ['120mm RCL', '106mm RCL', 12800], ['105mm RCL', '106mm RCL', 9000], ['8cm PAW', '81mm mortar', 2700],
  ['12.7×55mm STs', '12.7×55mm', 20], ['9×39mm SP-6', '9×39mm', 16],
  ['.30-18 Auto', '.32 ACP', 5.2], ['8×19mm Roth–Steyr', '9×19mm', 7.5], ['7.63×21mm Mannlicher', '7.65mm Longue', 5.5], ['9mm Japanese', '.38 S&W', 9.7], ['10.6mm German', '.455 Webley', 16.2],
  ['8mm Gasser', '.32 ACP', 7.8], ['8×57mm IS', '7.92×57mm', 12.8], ['7.35×51mm', '6.5×52mm', 8.1], ['8×56mmR', '8×50mmR', 13.6], ['9×23mm Largo', '9×23mm Steyr', 8], ['9×25mm Mauser', '7.63×25mm', 8],
  ['.280 British', '7.62×39mm', 9], ['4.85×49mm', '5.56×45mm', 3.6], ['.22 SCAMP', '5.7×28mm', 2.6], ['.38 Tround', '.38 Special', 10], ['4.6×36mm', '4.6×30mm', 2.7], ['.222 Remington', '5.56×45mm', 3.2],
  ['.27 lockless', '5.56×45mm', 4], ['.308 Winchester', '7.62×51mm', 10.9], ['9.3×64mm', '.338 Lapua', 16.5], ['25×40mm', '40×46mm grenade', 110], ['25×59mm', '20×110mm', 180], ['6.5×25mm CBJ', '4.6×30mm', 2.1],
  ['5.8×21mm', '5.7×28mm', 3], ['.300 Norma Mag', '.338 Lapua', 14.3], ['.458 SOCOM', '.45 Colt', 26], ['25×137mm', '20×110mm', 185], ['40mm auto-mortar', '30mm Micro-HE', 200], ['.950 JDJ', '20×110mm', 233], ['94mm', '88mm', 12700],
].forEach(a => CC(...a));

// typical damage and velocity per calibre, from the guns already in the armory
const ST = {};
(() => { const g = {}; for (const w of W) if (w.cal && w.dmg && !w.custom && !w.psy) (g[w.cal] = g[w.cal] || []).push(w); const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  for (const k in g) ST[k] = { dmg: med(g[k].map(w => w.dmg)), v: med(g[k].map(w => w.v)) }; })();

// a stable per-gun wobble so no two guns built on the same model handle alike
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const jig = (id, k, a) => 1 + (hash(id + k) - .5) * 2 * a;
const homeOf = y => y < 1919 ? 'ww1' : y < 1946 ? 'ww2' : y < 1990 ? 'cold' : y < 2010 ? 'mod' : 'now';

let E = 'ww1', C = 'RIF', PROTO = false, PSY = null, n9 = 0;
function w(base, id, n, y, co, cal, x) {
  const b = G.WEAPON[base]; x = Object.assign({}, x || {});
  if (!b) { console.warn('data9: missing base', base, id); return; }
  if (G.WEAPON[id]) { console.warn('data9: duplicate id', id); return; }
  const o = clone(b); delete o.proto; delete o.blurb; delete o.psy; delete o.custom; delete o.donors;
  const m = x.m; delete x.m;
  Object.assign(o, { id, n, y, co, e: PSY ? 'psycho' : E, c: C }, cal ? { cal } : {}, x);
  if (m) { o.m = Object.assign(o.m || {}, m); if (m.B && b.m && b.m.B) o.m.B = [m.B[0], m.B[1] || b.m.B[1]]; }
  if (cal && cal !== b.cal && ST[cal]) { if (x.dmg === undefined) o.dmg = ST[cal].dmg; if (x.v === undefined) o.v = ST[cal].v; }
  // its own handling
  if (x.rec === undefined && o.rec) o.rec = o.rec.map((r, i) => +(r * jig(id, 'rec' + i, .12)).toFixed(3));
  if (x.acc === undefined && o.acc) o.acc = +(o.acc * jig(id, 'acc', .12)).toFixed(2);
  if (x.rl === undefined && o.rl) o.rl = o.rl.map((r, i) => +(r * jig(id, 'rl' + i, .1)).toFixed(2));
  if (x.wt === undefined && o.wt) o.wt = +(o.wt * jig(id, 'wt', .06)).toFixed(2);
  if (o.rl) o.rl = o.rl.map(r => Math.min(35, r));
  if (E === 'artillery' && x.home === undefined) o.home = homeOf(y);
  if (PROTO) o.proto = true;
  if (PSY) o.psy = PSY;
  W.push(o); G.WEAPON[id] = o; n9++;
  return o;
}
// artillery and cannon: bore in mm, barrel length in metres; blast and reload follow the bore
function gun(base, id, n, y, co, cal, mm, L, v, dmg, wt, x) {
  x = Object.assign({}, x || {}); const m = Object.assign({ cal: mm / 1000, L }, x.m || {}); delete x.m;
  const big = C === 'ATG' ? { r: Math.max(2, Math.round(mm * .04)), dmg: Math.round(dmg * .15) } : C === 'RCL' ? { r: Math.round(mm * .09), dmg: Math.round(dmg * .7) } : { r: Math.round(3 + mm * .13), dmg };
  if (x.he === undefined && (E === 'artillery' || (G.WEAPON[base] && G.WEAPON[base].he))) x.he = big;
  if (x.rl === undefined && E === 'artillery' && !x.act) x.rl = C === 'MOR' ? [1.5 + mm / 60, 1.5 + mm / 60] : C === 'ATG' || C === 'RCL' ? [2 + mm / 45, 2 + mm / 45] : [Math.min(35, 2 + mm / 22), Math.min(35, 2 + mm / 22)];
  return w(base, id, n, y, co, cal, Object.assign({ v, dmg, wt, m }, x));
}
const semi = { act: 'semi', modes: ['semi'] }, sel = r => ({ act: 'auto', modes: ['auto', 'semi'], rpm: r }), sel3 = r => ({ act: 'auto', modes: ['auto', 'burst3', 'semi'], rpm: r });

// ============================================================================ WW1 (to 1918)
E = 'ww1';
C = 'AR'; // automatic and self-loading rifles
w('fedorov', 'ceirigotti', 'Cei-Rigotti', 1900, 'Italy', '6.5×52mm', { mag: 10, rpm: 300, wt: 4.3 });
w('fedorov', 'burtonlmr', 'Winchester–Burton Light Machine Rifle', 1917, 'United States', '.345 WSL', { mag: 20, rpm: 500, wt: 4.3, m: { B: [.48] } });
w('win1907', 'win1907mr', 'Winchester 1907/17 Machine Rifle', 1917, 'United States', '.351 WSL', { ...sel(550), mag: 20, wt: 3.9 });
w('mondragon', 'mondragon15', 'Mondragón Fliegerkarabiner 15', 1915, 'Germany', '7×57mm', { mag: 30, wt: 4.2 });
w('mondragon', 'madsenrekyl', 'Madsen M1896 Flådens Rekylgevær', 1896, 'Denmark', '8×58mmR', { mag: 10, wt: 4.6 });
w('mondragon', 'mauser1916', 'Mauser M1916 Flieger-Selbstlader', 1916, 'German Empire', '7.92×57mm', { mag: 25, wt: 4.9 });
w('fedorov', 'fedorov1912', 'Fedorov M1912 automatic rifle', 1912, 'Russian Empire', '7×57mm', { ...semi, mag: 5, wt: 4.6 });
w('mondragon', 'sjogren', 'Sjögren automatic rifle', 1908, 'Sweden', '6.5×55mm', { mag: 5, wt: 4.5 });
w('g41', 'bang1911', 'Bang M1911 rifle', 1911, 'Denmark', '6.5×55mm', { mag: 10, wt: 4.6 });
w('mondragon', 'meunier', 'Fusil A6 Meunier', 1916, 'France', '7×59mm Meunier', { mag: 5, wt: 4.1 });
w('fedorov', 'fedorovtula', 'Fedorov Avtomat (Kovrov, 1918)', 1918, 'Russia', '6.5×50mmSR', { mag: 25, rpm: 450, wt: 4.5 });

C = 'CAR';
w('win1907', 'win1910', 'Winchester Model 1910 SL', 1910, 'United States', '.401 WSL', { mag: 4, wt: 3.8 });
w('win1907', 'rem8', 'Remington Model 8', 1906, 'United States', '.35 Remington', { mag: 5, wt: 3.6 });
w('m1903', 'pedersen', 'M1903 Mk I with Pedersen Device', 1918, 'United States', '.30-18 Auto', { ...semi, mag: 40, wt: 4.3, m: { B: [.6] } });
w('k98k', 'kar98az', 'Karabiner 98AZ', 1908, 'German Empire', '7.92×57mm', { wt: 3.7, m: { B: [.59] } });
w('mosin91', 'mosin1907', 'Mosin–Nagant M1907 carbine', 1907, 'Russian Empire', '7.62×54mmR', { wt: 3.4, m: { B: [.51] } });
w('berthier', 'berthier1892', 'Berthier Mle 1892 carbine', 1892, 'France', '8mm Lebel', { mag: 3, wt: 3.1, m: { B: [.45] } });
w('krag', 'krag1899', 'Krag–Jørgensen M1899 carbine', 1899, 'United States', '.30-40 Krag', { wt: 3.5, m: { B: [.56] } });
w('carcano', 'moschetto91', 'Carcano Moschetto M1891 TS', 1897, 'Italy', '6.5×52mm', { wt: 3.1, m: { B: [.45] } });
w('m1895aus', 'm94carbine', 'Mauser m/94 carbine', 1894, 'Sweden', '6.5×55mm', { mag: 5, wt: 3.4, m: { B: [.44] } });
w('win1895', 'win1894', 'Winchester Model 1894 carbine', 1894, 'United States', '.30-30 Winchester', { mag: 6, wt: 2.9, m: { B: [.51] } });
w('smle', 'leecarbine', 'Lee–Enfield Cavalry Carbine Mk I', 1896, 'United Kingdom', '.303 British', { mag: 6, wt: 3.4, m: { B: [.53] } });

C = 'LMG';
w('chauchat', 'benetmercie', 'Hotchkiss M1909 Benét–Mercié', 1909, 'United States', '.30-06', { mag: 30, rpm: 400, wt: 12.3 });
w('mg0815', 'mg0818', 'MG 08/18', 1918, 'German Empire', '7.92×57mm', { rpm: 500, wt: 14.5 });
w('lewis', 'mg14', 'Parabellum MG 14/17', 1917, 'German Empire', '7.92×57mm', { mag: 250, rpm: 700, wt: 9.8 });
w('vickers', 'colt1895', 'Colt–Browning M1895 “Potato Digger”', 1895, 'United States', '.30-40 Krag', { rpm: 450, wt: 16.8 });
w('vickers', 'browning1917', 'Browning M1917', 1917, 'United States', '.30-06', { rpm: 500, wt: 47 });
w('vickers', 'marlin1917', 'Marlin M1917', 1917, 'United States', '.30-06', { rpm: 600, wt: 10.2 });
w('hotchkiss', 'sainteti', 'St. Étienne Mle 1907', 1907, 'France', '8mm Lebel', { rpm: 500, wt: 25.7 });
w('fiat1914', 'perino', 'Perino M1908', 1908, 'Italy', '6.5×52mm', { rpm: 500, wt: 13.6 });
w('vickers', 'bergmann15', 'Bergmann MG 15nA', 1916, 'German Empire', '7.92×57mm', { rpm: 550, wt: 12.9 });
w('chauchat', 'chauchat1918', 'Chauchat M1918 (.30-06)', 1918, 'United States', '.30-06', { mag: 16, rpm: 300, wt: 9.1 });
w('lewis', 'lewismk2', 'Lewis Gun Mk II (aircraft)', 1916, 'United Kingdom', '.303 British', { mag: 97, rpm: 600, wt: 11.8 });

C = 'PROTO'; PROTO = true; C = 'SMG';
w('thompson', 'annihilator', 'Thompson “Annihilator I”', 1918, 'United States', '.45 ACP', { rpm: 1500, mag: 50, wt: 4.6 });
w('mp18', 'hellriegel', 'Standschütze Hellriegel M1915', 1915, 'Austria-Hungary', '9×23mm Steyr', { rpm: 500, mag: 100, wt: 7 });
C = 'PST';
w('c96', 'marspistol', 'Gabbett-Fairfax “Mars”', 1900, 'United Kingdom', '.45 ACP', { v: 380, mag: 8, wt: 1.4 });
w('ruby', 'schouboe', 'Schouboe M1907', 1907, 'Denmark', '.45 ACP', { v: 490, dmg: 30, mag: 6, wt: .87 });
w('luger', 'borchardt', 'Borchardt C-93', 1893, 'German Empire', '7.63×25mm', { mag: 8, wt: 1.3 });
C = 'CAR';
w('luger', 'lugercarbine', 'Luger Carbine M1902', 1902, 'German Empire', '7.65mm Longue', { mag: 8, wt: 2.0, v: 380, acc: 3.6 });
C = 'RIF';
w('mondragon', 'mannl1885', 'Mannlicher M1885 self-loading rifle', 1885, 'Austria-Hungary', '11mm Werndl', { mag: 6, wt: 4.5 });
w('mondragon', 'tokarev1914', 'Tokarev 1914 automatic rifle', 1914, 'Russian Empire', '7.62×54mmR', { mag: 5, wt: 4.6 });
w('mondragon', 'liurifle', 'Liu automatic rifle', 1914, 'Republic of China', '7.92×57mm', { mag: 6, wt: 4.3 });
w('fedorov', 'mauser1910', 'Mauser M1910 self-loader', 1910, 'German Empire', '7.92×57mm', { ...semi, mag: 10, wt: 4.9 });
PROTO = false;

C = 'PST';
w('ruby', 'mauser1914', 'Mauser M1914', 1914, 'German Empire', '.32 ACP', { mag: 8, wt: .6 });
w('ruby', 'dreyse1907', 'Dreyse M1907', 1907, 'German Empire', '.32 ACP', { mag: 7, wt: .7 });
w('m1911', 'bergbayard', 'Bergmann–Bayard M1910', 1910, 'Denmark', '9×23mm Steyr', { mag: 6, wt: 1.0 });
w('steyr1912', 'rothsteyr', 'Roth–Steyr M1907', 1907, 'Austria-Hungary', '8×19mm Roth–Steyr', { mag: 10, wt: 1.03 });
w('c96', 'mannl1901', 'Mannlicher M1901', 1901, 'Austria-Hungary', '7.63×21mm Mannlicher', { mag: 8, wt: .9 });
w('ruby', 'colt1903', 'Colt M1903 Pocket Hammerless', 1903, 'United States', '.32 ACP', { mag: 8, wt: .68 });
w('m1911', 'webleysl', 'Webley Self-Loading Pistol Mk I', 1912, 'United Kingdom', '.455 Webley', { mag: 7, wt: 1.1 });
w('colt1917', 'sw455', 'S&W .455 Hand Ejector 2nd Model', 1915, 'United Kingdom', '.455 Webley', { wt: 1.08 });
w('luger', 'nambua', 'Nambu Type A “Grandpa”', 1904, 'Empire of Japan', '8×22mm Nambu', { mag: 8, wt: .9 });
w('webley', 'type26', 'Type 26 revolver', 1893, 'Empire of Japan', '9mm Japanese', { wt: .9 });
w('nagant', 'reichsrev', 'Reichsrevolver M1879', 1879, 'German Empire', '10.6mm German', { wt: 1.04 });
w('nagant', 'rastgasser', 'Rast & Gasser M1898', 1898, 'Austria-Hungary', '8mm Gasser', { mag: 8, wt: .95 });
w('c96', 'red9', 'Mauser C96 “Red 9”', 1916, 'German Empire', '9×19mm', { wt: 1.15 });

C = 'RIF';
w('k98k', 'mauser93', 'Spanish Mauser M1893', 1893, 'Spain', '7×57mm', { wt: 3.95, m: { B: [.74] } });
w('k98k', 'm96swede', 'Mauser m/96', 1896, 'Sweden', '6.5×55mm', { wt: 4.0, m: { B: [.74] } });
w('m1895aus', 'mannschoen', 'Mannlicher–Schönauer M1903', 1903, 'Greece', '6.5×54mm M-S', { wt: 3.8 });
w('k98k', 'mauser89', 'Belgian Mauser M1889', 1889, 'Belgium', '7.65×53mm', { wt: 4.0, m: { B: [.78] } });
w('smle', 'leemetford', 'Lee–Metford Mk II', 1892, 'United Kingdom', '.303 British', { mag: 10, wt: 4.2, m: { B: [.77] } });
w('smle', 'lee_mle', 'Long Lee–Enfield Mk I', 1895, 'United Kingdom', '.303 British', { mag: 10, wt: 4.2, m: { B: [.77] } });
w('ross', 'rossmk2', 'Ross Rifle Mk II', 1905, 'Canada', '.303 British', { wt: 4.1 });
w('m1895aus', 'mannl1888', 'Mannlicher M1888/90', 1890, 'Austria-Hungary', '8×50mmR', { wt: 4.4 });
w('arisaka38', 'arisaka35', 'Arisaka Type 35', 1902, 'Empire of Japan', '6.5×50mmSR', { wt: 4.0 });
w('mosin91', 'mosin9110', 'Mosin–Nagant M1891/10', 1910, 'Russian Empire', '7.62×54mmR', { wt: 4.2 });
w('g88', 'hanyang88', 'Hanyang 88', 1896, 'Qing China', '7.92×57mm', { wt: 4.1 });
w('lebel', 'murata22', 'Murata Type 22', 1889, 'Empire of Japan', '8×53mmR', { mag: 8, wt: 4.1 });
w('m1903', 'schmidt11', 'Schmidt–Rubin M1911', 1911, 'Switzerland', '7.5×55mm Swiss', { mag: 6, wt: 4.6 });
w('krag', 'krag1894', 'Krag–Jørgensen M1894 (Norway)', 1894, 'Norway', '6.5×55mm', { wt: 4.2 });

C = 'SG';
w('m1897', 'rem10trench', 'Remington Model 10 Trench', 1917, 'United States', '12 gauge', { mag: 6, wt: 3.4 });
w('m1897', 'stevens520', 'Stevens Model 520-30 Trench', 1918, 'United States', '12 gauge', { mag: 5, wt: 3.6 });
w('auto5', 'rem11', 'Remington Model 11', 1905, 'United States', '12 gauge', { mag: 4, wt: 3.6 });
w('m1897', 'win1893', 'Winchester Model 1893', 1893, 'United States', '12 gauge', { mag: 5, wt: 3.5 });
w('win1895', 'win1887', 'Winchester Model 1887', 1887, 'United States', '12 gauge', { mag: 5, pellets: 9, dmg: 22, v: 400, acc: 9, wt: 3.6, rpm: 70 });
w('win1895', 'win1901', 'Winchester Model 1901', 1901, 'United States', '10 gauge', { mag: 5, pellets: 12, dmg: 22, v: 400, acc: 10, wt: 3.9, rpm: 65 });
w('m1897', 'spencer1882', 'Spencer 1882 slide-action', 1882, 'United States', '12 gauge', { mag: 5, wt: 3.7 });
w('purdey', 'parkerdhe', 'Parker DHE', 1910, 'United States', '12 gauge', { wt: 3.4 });
w('rem1889', 'lcsmith', 'L.C. Smith Specialty Grade', 1913, 'United States', '12 gauge', { wt: 3.3 });
w('purdey', 'greener', 'Greener Facile Princeps', 1880, 'United Kingdom', '12 gauge', { wt: 3.1 });
w('purdey', 'foxsterling', 'A.H. Fox Sterlingworth', 1910, 'United States', '16 gauge', { wt: 3.0 });

C = 'SMG';
w('steyr1912', 'steyrp16', 'Steyr M1912/P16 machine pistol', 1916, 'Austria-Hungary', '9×23mm Steyr', { ...sel(800), mag: 16, wt: 1.2 });
w('villarperosa', 'beretta1918', 'Beretta M1918', 1918, 'Italy', '9mm Glisenti', { act: 'auto_ob', modes: ['auto', 'semi'], rpm: 900, mag: 25, wt: 3.3 });
w('mp18', 'ovp1918', 'OVP M1918', 1918, 'Italy', '9mm Glisenti', { rpm: 900, mag: 25, wt: 3.6 });
w('villarperosa', 'fiat1915', 'Fiat Mod. 1915 (Villar-Perosa twin)', 1915, 'Italy', '9mm Glisenti', { rpm: 1500, mag: 50, wt: 6.8 });
w('mp18', 'mp18drum', 'MP 18,I with TM 08 snail drum', 1918, 'German Empire', '9×19mm', { mag: 32, wt: 5.3 });
w('thompson', 'thompson1919', 'Thompson M1919', 1919, 'United States', '.45 ACP', { rpm: 1200, mag: 20, wt: 4.5 });
w('mp18', 'sig1920', 'SIG Bergmann 1920', 1920, 'Switzerland', '7.65mm Longue', { rpm: 450, mag: 50, wt: 4.2 });
w('frommer', 'frommer17', 'Frommer Stop M1917 machine pistol', 1917, 'Austria-Hungary', '.380 ACP', { ...sel(1100), mag: 15, wt: .9 });
w('lp08', 'lp08drum', 'Luger LP 08 with snail drum', 1917, 'German Empire', '9×19mm', { mag: 32, wt: 1.9 });
w('c96', 'c96trench', 'Mauser C96 M1917 trench carbine', 1917, 'German Empire', '7.63×25mm', { mag: 20, wt: 1.6, acc: 3.2 });

C = 'SR';
w('g98', 'g98sniper', 'Gewehr 98 Scharfschützen', 1915, 'German Empire', '7.92×57mm', { acc: 1.4, wt: 4.6 });
w('smle', 'smleppco', 'SMLE Mk III* with PPCo scope', 1915, 'United Kingdom', '.303 British', { acc: 1.7, wt: 4.5 });
w('m1917', 'p14wt', 'Pattern 1914 Mk I* W(T)', 1918, 'United Kingdom', '.303 British', { acc: 1.3, wt: 4.9 });
w('ross', 'rosssniper', 'Ross Mk III with Warner & Swasey', 1915, 'Canada', '.303 British', { acc: 1.4, wt: 5.2 });
w('m1903', 'm1903ws', 'M1903 with Warner & Swasey', 1908, 'United States', '.30-06', { acc: 1.5, wt: 4.6 });
w('m1903', 'm1903a5', 'M1903 with Winchester A5 scope', 1918, 'United States', '.30-06', { acc: 1.3, wt: 4.6 });
w('lebel', 'lebelapx', 'Lebel Mle 1886/93 with APX 1916', 1916, 'France', '8mm Lebel', { acc: 1.6, wt: 4.8 });
w('m1895aus', 'm95sniper', 'Steyr M95 Scharfschützen', 1915, 'Austria-Hungary', '8×50mmR', { acc: 1.7, wt: 4.2 });
w('hh_royal', 'jeffery600', 'Jeffery .600 big-game rifle (plate buster)', 1914, 'United Kingdom', '.600 Nitro Express', { acc: 2, wt: 7.2 });
w('g98', 'jagd98', 'Mauser sporting rifle with Goerz scope', 1914, 'German Empire', '8×57mm IS', { acc: 1.5, wt: 3.9 });

// ============================================================================ WW2 (1919–1945)
E = 'ww2';
C = 'AR';
w('stg44', 'mp43_1', 'MP 43/1', 1943, 'Germany', '7.92×33mm Kurz', { wt: 5.1 });
w('stg44', 'mp43', 'MP 43', 1943, 'Germany', '7.92×33mm Kurz', { wt: 5.2 });
w('stg44', 'mp44', 'MP 44', 1944, 'Germany', '7.92×33mm Kurz', { wt: 5.2 });
w('stg44', 'vorsatzj', 'StG 44 with Krummlauf Vorsatz J', 1945, 'Germany', '7.92×33mm Kurz', { wt: 7, acc: 7 });
w('stg44', 'stg44vampir', 'StG 44 with ZG 1229 “Vampir”', 1945, 'Germany', '7.92×33mm Kurz', { wt: 7.4, acc: 2.4 });
w('stg44', 'stg44zf4', 'MP 44 with ZF 4 scope', 1944, 'Germany', '7.92×33mm Kurz', { wt: 5.8, acc: 2.6 });
w('mkb42', 'mkb42w', 'MKb 42(W)', 1942, 'Germany', '7.92×33mm Kurz', { act: 'auto', modes: ['auto', 'semi'], wt: 4.4, rpm: 580 });
w('fedorov', 'fedorov1925', 'Fedorov Avtomat (Red Army, 1925)', 1925, 'Soviet Union', '6.5×50mmSR', { mag: 25, rpm: 450, wt: 4.4 });
w('stg44', 'as44', 'Sudayev AS-44', 1944, 'Soviet Union', '7.62×39mm', { mag: 30, rpm: 600, wt: 5.6 });
w('svt40', 'bredapg', 'Breda PG', 1935, 'Italy', '7×57mm', { act: 'auto', modes: ['burst3', 'semi'], rpm: 600, mag: 20, wt: 5.3 });

C = 'BR';
w('fg42', 'fg42t1', 'FG 42 Type 1', 1942, 'Germany', '7.92×57mm', { wt: 4.2 });
w('fg42', 'fg42t2', 'FG 42 Type 2 (late)', 1944, 'Germany', '7.92×57mm', { wt: 4.95, rpm: 750 });
w('g41', 'g41m', 'Gewehr 41(M)', 1941, 'Germany', '7.92×57mm', { wt: 4.7 });
w('svt40', 'ljungman', 'Ljungman Ag m/42', 1942, 'Sweden', '6.5×55mm', { mag: 10, wt: 4.7 });
w('svt40', 'type4', 'Type 4 rifle', 1945, 'Empire of Japan', '7.7×58mm', { mag: 10, wt: 4.1 });
w('svt40', 'mas44', 'MAS 44', 1944, 'France', '7.5×54mm', { mag: 10, wt: 4.1 });
w('svt40', 'zh29', 'ZH-29', 1929, 'Czechoslovakia', '7.92×57mm', { mag: 10, wt: 4.5 });
w('svt40', 'pedersent1', 'Pedersen T1E3', 1932, 'United States', '.276 Pedersen', { mag: 10, wt: 4.1 });
w('svt40', 'armaguerra', 'Armaguerra Mod. 39', 1939, 'Italy', '6.5×52mm', { mag: 6, wt: 3.7 });
w('garand', 't26', 'M1 Garand T26 “Tanker”', 1945, 'United States', '.30-06', { wt: 4.0, m: { B: [.46] } });

C = 'CAR';
w('m1carbine', 'm1inland', 'M1 Carbine (Inland, late)', 1944, 'United States', '.30 Carbine', { mag: 30, wt: 2.5 });
w('m1carbine', 'm3carbine', 'M3 Carbine (infrared)', 1945, 'United States', '.30 Carbine', { ...sel(750), mag: 30, wt: 4.4, acc: 3 });
w('carcano38', 'carcano91ts', 'Carcano M91/38 TS', 1938, 'Italy', '7.35×51mm', { wt: 3.1, m: { B: [.45] } });
w('type99', 'type2para', 'Type 2 paratroop rifle', 1943, 'Empire of Japan', '7.7×58mm', { wt: 4.0 });
w('m1895aus', 'm9530', 'Steyr M95/30 Stutzen', 1930, 'Austria', '8×56mmR', { wt: 3.2, m: { B: [.5] } });
w('vz24', 'vz33', 'vz. 33 gendarmerie carbine', 1933, 'Czechoslovakia', '7.92×57mm', { wt: 3.3, m: { B: [.49] } });
w('mas36', 'mas36cr39', 'MAS 36 CR39 (folding)', 1939, 'France', '7.5×54mm', { wt: 3.6 });
w('k98k', 'kar98b', 'Karabiner 98b', 1923, 'Germany', '7.92×57mm', { wt: 4.1 });
w('k98k', 'm38swede', 'Mauser m/38 short rifle', 1938, 'Sweden', '6.5×55mm', { wt: 4.0, m: { B: [.6] } });
w('k98k', 'kar98kfj', 'Karabiner 98k Fallschirmjäger take-down', 1943, 'Germany', '7.92×57mm', { wt: 3.9 });

C = 'LMG';
w('mg34', 'mg15', 'MG 15', 1932, 'Germany', '7.92×57mm', { mag: 75, rpm: 1000, wt: 8.1 });
w('mg34', 'mg81', 'MG 81', 1939, 'Germany', '7.92×57mm', { rpm: 1500, wt: 6.5 });
w('mg34', 'mg30', 'MG 30 (Solothurn S2-200)', 1930, 'Switzerland', '7.92×57mm', { mag: 25, rpm: 800, wt: 7.7 });
w('bren', 'hotchkiss22', 'Hotchkiss M1922', 1922, 'France', '8mm Lebel', { mag: 30, rpm: 500, wt: 9.5 });
w('bren', 'fm2429', 'FM 24/29', 1929, 'France', '7.5×54mm', { mag: 25, rpm: 500, wt: 8.9 });
w('dp28', 'lahtisal', 'Lahti–Saloranta M/26', 1926, 'Finland', '7.62×54mmR', { mag: 75, rpm: 500, wt: 9.3 });
w('bren', 'vberthier', 'Vickers–Berthier Mk III', 1928, 'British India', '.303 British', { mag: 30, rpm: 600, wt: 11 });
w('type99lmg', 'type11lmg', 'Type 11 LMG', 1922, 'Empire of Japan', '6.5×50mmSR', { mag: 30, rpm: 500, wt: 10.2 });
w('m1919', 'type92hmg', 'Type 92 heavy machine gun', 1932, 'Empire of Japan', '7.7×58mm', { rpm: 450, wt: 55.3 });
w('dp28', 'ds39', 'DS-39', 1939, 'Soviet Union', '7.62×54mmR', { rpm: 600, wt: 14.3 });
w('m1919', 'sg43', 'SG-43 Goryunov', 1943, 'Soviet Union', '7.62×54mmR', { rpm: 650, wt: 13.8 });
w('m1919', 'm1917a1', 'Browning M1917A1', 1936, 'United States', '.30-06', { rpm: 500, wt: 47 });
w('breda30', 'fiat35', 'Fiat–Revelli M1935', 1935, 'Italy', '8×59mm', { rpm: 500, wt: 18 });
w('bren', 'kgm40', 'Kg m/40', 1940, 'Sweden', '6.5×55mm', { mag: 20, rpm: 500, wt: 8.5 });
w('mg34', 'knorrbremse', 'Knorr-Bremse MG 35/36', 1935, 'Germany', '7.92×57mm', { mag: 20, rpm: 500, wt: 10 });
w('bren', 'brenmk3', 'Bren Mk III', 1944, 'United Kingdom', '.303 British', { rpm: 500, wt: 8.7 });

C = 'PROTO'; PROTO = true; C = 'AR';
w('stg44', 'gerat06h', 'Gerät 06H', 1944, 'Germany', '7.92×33mm Kurz', { wt: 4.4 });
w('stg44', 'grossfuss', 'Grossfuss Sturmgewehr', 1945, 'Germany', '7.92×33mm Kurz', { wt: 4.1 });
C = 'CAR'; w('m1carbine', 'g30', 'Winchester G30', 1940, 'United States', '.30-06', { mag: 15, wt: 4.1 });
C = 'RIF'; w('svt40', 't3e2', 'Garand T3E2 (.276)', 1932, 'United States', '.276 Pedersen', { mag: 10, wt: 4.1 });
C = 'SMG'; w('sten', 'welgun', 'Welgun', 1942, 'United Kingdom', '9×19mm', { rpm: 600, wt: 2.7 });
w('sten', 'mcem2', 'MCEM-2', 1944, 'United Kingdom', '9×19mm', { rpm: 1000, mag: 18, wt: 2.6 });
w('m3', 'hydem2', 'Hyde M2', 1942, 'United States', '.45 ACP', { rpm: 500, wt: 4.2 });
C = 'CAR'; w('m1carbine', 'swm1940', 'Smith & Wesson M1940 Light Rifle', 1940, 'United States', '9×19mm', { mag: 20, wt: 3.9 });
C = 'LMG'; w('mg42', 'mg45', 'MG 45 (MG 42V)', 1945, 'Germany', '7.92×57mm', { rpm: 1350, wt: 9 });
w('bar1918a2', 'war44', 'Winchester Automatic Rifle (WAR)', 1944, 'United States', '.30-06', { wt: 6.9 });
PROTO = false;

C = 'PST';
w('ppk', 'waltherpp', 'Walther PP', 1929, 'Germany', '.32 ACP', { mag: 8, wt: .68 });
w('m1911a1', 'astra400', 'Astra 400', 1921, 'Spain', '9×23mm Largo', { mag: 8, wt: 1.1 });
w('m1911a1', 'astra600', 'Astra 600', 1943, 'Spain', '9×19mm', { mag: 8, wt: 1.1 });
w('m1911a1', 'starb', 'Star Model B', 1928, 'Spain', '9×19mm', { mag: 8, wt: 1.05 });
w('luger', 'lahtil35', 'Lahti L-35', 1935, 'Finland', '9×19mm', { mag: 8, wt: 1.2 });
w('luger', 'husqm40', 'Husqvarna m/40', 1940, 'Sweden', '9×19mm', { mag: 8, wt: 1.1 });
w('ppk', 'femaru37', 'Femaru 37M', 1937, 'Hungary', '.380 ACP', { mag: 7, wt: .77 });
w('sw1917', 'victory', 'S&W Victory Model', 1942, 'United States', '.38 Special', { wt: .86 });
w('sw1917', 'officialpolice', 'Colt Official Police', 1927, 'United States', '.38 Special', { wt: .96 });
w('fn1910', 'fn1922', 'FN Model 1922', 1922, 'Belgium', '.32 ACP', { mag: 9, wt: .7 });
w('ppk', 'vz27', 'CZ vz. 27', 1927, 'Czechoslovakia', '.32 ACP', { mag: 8, wt: .7 });
w('p38', 'vz38', 'CZ vz. 38', 1938, 'Czechoslovakia', '.380 ACP', { mag: 8, wt: .94 });
w('m1911a1', 'ballester', 'Ballester–Molina', 1938, 'Argentina', '.45 ACP', { wt: 1.08 });
w('c96', 'c96m30', 'Mauser C96 M1930', 1930, 'Germany', '7.63×25mm', { wt: 1.25 });

C = 'RIF';
w('k98k', 'kar98kkm', 'Karabiner 98k Kriegsmodell', 1944, 'Germany', '7.92×57mm', { wt: 3.9, acc: 3.2 });
w('vz24', 'g24t', 'Gewehr 24(t)', 1940, 'Germany', '7.92×57mm', { wt: 4.1 });
w('k98k', 'standardm', 'Mauser Standardmodell', 1933, 'Germany', '7.92×57mm', { wt: 4.0 });
w('mosin9130', 'm39fin', 'Mosin–Nagant M/39 (Finland)', 1939, 'Finland', '7.62×54mmR', { wt: 4.7, acc: 2.4 });
w('mosin9130', 'm2830', 'Mosin–Nagant M/28-30', 1930, 'Finland', '7.62×54mmR', { wt: 4.4, acc: 2.6 });
w('k98k', 'wz29', 'Karabinek wz. 29', 1929, 'Poland', '7.92×57mm', { wt: 4.0 });
w('k98k', 'zhongzheng', 'Zhongzheng Type 24', 1935, 'Republic of China', '7.92×57mm', { wt: 4.1 });
w('carcano', 'carcano9141', 'Carcano M91/41', 1941, 'Italy', '6.5×52mm', { wt: 3.7 });
w('berthier', 'berthierm34', 'Berthier Mle 1907/15 M34', 1934, 'France', '7.5×54mm', { mag: 5, wt: 3.6 });
w('m1895aus', 'mannl35m', 'Mannlicher 35M', 1935, 'Hungary', '8×56mmR', { wt: 4.0 });
w('k98k', 'g9840', 'Gewehr 98/40', 1940, 'Germany', '7.92×57mm', { wt: 4.1 });
w('type99', 'type99ld', 'Type 99 “last-ditch”', 1945, 'Empire of Japan', '7.7×58mm', { wt: 3.7, acc: 4.4 });

C = 'SG';
w('m1912', 'stevens620', 'Stevens M620A Trench', 1942, 'United States', '12 gauge', { mag: 5, wt: 3.4 });
w('m1912', 'rem31', 'Remington Model 31 Riot', 1931, 'United States', '12 gauge', { mag: 4, wt: 3.2 });
w('m1912', 'savage720', 'Savage Model 720 Riot', 1930, 'United States', '12 gauge', { act: 'semi', modes: ['semi'], mag: 4, wt: 3.7 });
w('m1912', 'ithaca37ww2', 'Ithaca 37 (1937)', 1937, 'United States', '12 gauge', { mag: 4, wt: 3.0 });
w('m1912', 'rem17', 'Remington Model 17', 1921, 'United States', '20 gauge', { mag: 4, wt: 2.4 });
w('ithacanid', 'win21', 'Winchester Model 21', 1931, 'United States', '12 gauge', { wt: 3.4 });
w('ithacanid', 'superposed', 'Browning Superposed', 1931, 'Belgium', '12 gauge', { wt: 3.4, m: { lay: 'ou' } });
w('ithacanid', 'win24', 'Winchester Model 24', 1939, 'United States', '16 gauge', { wt: 3.2 });
w('ithacanid', 'foxb', 'Savage–Fox Model B', 1940, 'United States', '20 gauge', { wt: 3.1 });
w('ithacanid', 'lefever', 'Lefever Nitro Special', 1921, 'United States', '12 gauge', { wt: 3.3 });
w('topper', 'savage220', 'Savage Model 220', 1938, 'United States', '12 gauge', { wt: 2.8 });

C = 'SMG';
w('mp18', 'mp28', 'MP 28/II', 1928, 'Germany', '9×19mm', { rpm: 600, wt: 4.0 });
w('mp40', 'mp38', 'MP 38', 1938, 'Germany', '9×19mm', { rpm: 500, wt: 4.1 });
w('mab38', 'beretta3842', 'Beretta Model 38/42', 1942, 'Italy', '9×19mm', { rpm: 550, wt: 3.3 });
w('mp40', 'tz45', 'TZ-45', 1945, 'Italy', '9×19mm', { rpm: 550, wt: 3.3 });
w('mab38', 'kiraly39', 'Danuvia 39M (Király)', 1939, 'Hungary', '9×25mm Mauser', { rpm: 750, mag: 40, wt: 3.7 });
w('mp40', 'orita', 'Orița M1941', 1941, 'Romania', '9×19mm', { rpm: 600, wt: 3.5 });
w('thompson', 'ud42', 'United Defense M42', 1942, 'United States', '9×19mm', { rpm: 700, mag: 25, wt: 4.1 });
w('sten', 'sten6', 'Sten Mk VI (suppressed)', 1944, 'United Kingdom', '9×19mm', { rpm: 450, wt: 4.5, intSup: true });
w('thompson1928', 'thompson1921', 'Thompson M1921', 1921, 'United States', '.45 ACP', { rpm: 850, wt: 4.9 });
w('suomi', 'suomi44', 'Suomi KP/-44', 1944, 'Finland', '9×19mm', { rpm: 650, mag: 36, wt: 2.8 });
w('m3', 'm3a1', 'M3A1 “Grease Gun”', 1944, 'United States', '.45 ACP', { rpm: 450, wt: 3.6 });
w('mp40', 'starsi35', 'Star SI35', 1935, 'Spain', '9×23mm Largo', { rpm: 700, mag: 30, wt: 3.7 });
w('pps43', 'pps42', 'PPS-42', 1942, 'Soviet Union', '7.62×25mm', { rpm: 700, wt: 3.0 });

C = 'SR';
w('k98k', 'k98zf39', 'Karabiner 98k with ZF39', 1939, 'Germany', '7.92×57mm', { acc: 1.2, wt: 4.6 });
w('k98k', 'k98zf41', 'Karabiner 98k with ZF41', 1941, 'Germany', '7.92×57mm', { acc: 1.7, wt: 4.3 });
w('g43', 'g43zf4', 'Gewehr 43 with ZF4', 1943, 'Germany', '7.92×57mm', { acc: 1.6, wt: 4.9 });
w('mosin9130', 'mosinpu', 'Mosin–Nagant 91/30 PU', 1942, 'Soviet Union', '7.62×54mmR', { acc: 1.3, wt: 4.9 });
w('svt40', 'svtsniper', 'SVT-40 sniper (PU)', 1941, 'Soviet Union', '7.62×54mmR', { acc: 1.6, wt: 4.5 });
w('no4', 'no4t', 'Lee–Enfield No. 4 Mk I (T)', 1942, 'United Kingdom', '.303 British', { acc: 1.2, wt: 5.0 });
w('type38c', 'type97sn', 'Type 97 sniper rifle', 1937, 'Empire of Japan', '6.5×50mmSR', { acc: 1.4, wt: 4.4, m: { B: [.8] } });
w('type99', 'type99sn', 'Type 99 sniper rifle', 1942, 'Empire of Japan', '7.7×58mm', { acc: 1.4, wt: 4.6 });
w('k98k', 'm41swede', 'Mauser m/41 sniper', 1941, 'Sweden', '6.5×55mm', { acc: 1.1, wt: 4.9 });
w('ptrd', 'ptrs41', 'PTRS-41', 1941, 'Soviet Union', '14.5×114mm', { act: 'semi', modes: ['semi'], mag: 5, wt: 20.9 });
w('ptrd', 'pzb39', 'Panzerbüchse 39', 1939, 'Germany', '7.92×94mm', { wt: 12.4 });
w('lahti', 'type97at', 'Type 97 anti-tank rifle', 1937, 'Empire of Japan', '20×124mm', { act: 'auto', modes: ['auto', 'semi'], rpm: 120, mag: 7, wt: 59 });
w('ptrd', 'wz35', 'Karabin przeciwpancerny wz. 35', 1935, 'Poland', '7.92×107mm', { mag: 4, wt: 9.5 });
w('lahti', 's18100', 'Solothurn S-18/100', 1936, 'Switzerland', '20×138mmB', { act: 'semi', modes: ['semi'], mag: 5, wt: 45 });

// ============================================================================ Cold War (1946–1989)
E = 'cold';
C = 'AR';
w('m16a1', 'm16', 'M16 (Colt Model 602)', 1964, 'United States', '5.56×45mm', { rpm: 800, mag: 20, wt: 2.9 });
w('ar18', 'stoner63r', 'Stoner 63 rifle', 1963, 'United States', '5.56×45mm', { rpm: 700, wt: 3.5 });
w('ar18', 'sar80', 'SAR-80', 1980, 'Singapore', '5.56×45mm', { rpm: 700, wt: 3.7 });
w('fnc', 'ar70', 'Beretta AR70', 1972, 'Italy', '5.56×45mm', { rpm: 650, wt: 3.8 });
w('hk33', 'sg530', 'SIG SG 530', 1968, 'Switzerland', '5.56×45mm', { rpm: 600, wt: 3.5 });
w('fnc', 'sg540', 'SIG SG 540', 1977, 'Switzerland', '5.56×45mm', { rpm: 750, wt: 3.3 });
w('fnc', 'fncal', 'FN CAL', 1966, 'Belgium', '5.56×45mm', { ...sel3(750), wt: 3.4 });
w('hk33', 'cetmel', 'CETME Model L', 1984, 'Spain', '5.56×45mm', { rpm: 700, wt: 3.4 });
w('hk33', 'hkg41', 'H&K G41', 1981, 'West Germany', '5.56×45mm', { ...sel3(850), wt: 4.1 });
w('ak74', 'aks74', 'AKS-74', 1974, 'Soviet Union', '5.45×39mm', { wt: 3.0 });
w('akm', 'mpikm', 'MPi-KM', 1966, 'East Germany', '7.62×39mm', { wt: 3.5 });
w('rk62', 'm76valmet', 'Valmet M76', 1976, 'Finland', '7.62×39mm', { wt: 3.5 });
w('akm', 'misr', 'Maadi Misr', 1970, 'Egypt', '7.62×39mm', { wt: 3.6 });
w('akm', 'tabuk', 'Tabuk rifle', 1978, 'Iraq', '7.62×39mm', { wt: 3.7 });

C = 'BR';
w('fal', 'fal5000', 'FN FAL 50.00', 1953, 'Belgium', '7.62×51mm', { ...sel(650), wt: 4.3 });
w('fal', 'c1a1', 'C1A1', 1955, 'Canada', '7.62×51mm', { wt: 4.3 });
w('sig510', 'sigamt', 'SIG AMT', 1960, 'Switzerland', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.6 });
w('g3', 'g3a4', 'H&K G3A4', 1963, 'West Germany', '7.62×51mm', { wt: 4.7 });
w('cetme_c', 'cetmeb', 'CETME Model B', 1958, 'Spain', '7.62×51mm', { wt: 4.5 });
w('m14', 'mas4956', 'MAS 49/56', 1956, 'France', '7.5×54mm', { act: 'semi', modes: ['semi'], mag: 10, wt: 4.1 });
w('m14', 'mas49', 'MAS 49', 1949, 'France', '7.5×54mm', { act: 'semi', modes: ['semi'], mag: 10, wt: 4.7 });
w('fal', 'hakim', 'Hakim rifle', 1954, 'Egypt', '7.92×57mm', { mag: 10, wt: 4.7 });
w('m14', 'm14e2', 'M14E2 (M14A1)', 1963, 'United States', '7.62×51mm', { wt: 6.6, acc: 3 });
w('m14', 'vz52rifle', 'Samopal vz. 52', 1952, 'Czechoslovakia', '7.62×45mm', { act: 'semi', modes: ['semi'], mag: 10, wt: 4.3 });
w('m14', 'safn49', 'FN SAFN M49', 1949, 'Belgium', '7.92×57mm', { act: 'semi', modes: ['semi'], mag: 10, wt: 4.3 });
w('fal', 't48', 'T48 (FAL US trials)', 1954, 'United States', '7.62×51mm', { ...sel(700), wt: 4.4 });

C = 'CAR';
w('xm177', 'colt733', 'Colt Model 733 Commando', 1984, 'United States', '5.56×45mm', { ...sel3(800), wt: 2.4 });
w('xm177', 'colt607', 'Colt Model 607', 1966, 'United States', '5.56×45mm', { rpm: 800, wt: 2.4 });
w('xm177', 'gau5', 'GAU-5/A', 1967, 'United States', '5.56×45mm', { rpm: 750, wt: 2.6 });
w('xm177', 'xm177e1', 'XM177E1', 1966, 'United States', '5.56×45mm', { rpm: 750, wt: 2.4 });
w('k2', 'k1a', 'Daewoo K1A', 1982, 'South Korea', '5.56×45mm', { ...sel3(800), wt: 2.9 });
w('hk33', 'sg543', 'SIG SG 543', 1977, 'Switzerland', '5.56×45mm', { rpm: 800, wt: 3.0, m: { B: [.3] } });
w('hk53', 'hk33k', 'H&K HK33K', 1974, 'West Germany', '5.56×45mm', { rpm: 700, wt: 3.9 });
w('akms', 'rasheed', 'Rasheed carbine', 1960, 'Egypt', '7.62×39mm', { ...semi, mag: 10, wt: 4.2 });
w('mini14', 'mini30', 'Ruger Mini-30', 1987, 'United States', '7.62×39mm', { wt: 3.2 });
w('sks', 'type56c', 'Type 56 carbine', 1956, 'China', '7.62×39mm', { wt: 3.8 });
w('sks', 'm5966', 'Zastava M59/66', 1966, 'Yugoslavia', '7.62×39mm', { wt: 4.1 });

C = 'DMR';
w('svd', 'psl', 'PSL', 1974, 'Romania', '7.62×54mmR', { wt: 4.3 });
w('svd', 'm76zastava', 'Zastava M76', 1976, 'Yugoslavia', '7.92×57mm', { wt: 4.2 });
w('svd', 'tabuksn', 'Tabuk sniper rifle', 1978, 'Iraq', '7.62×39mm', { wt: 4.5 });
w('svd', 'galatz', 'IMI Galatz', 1983, 'Israel', '7.62×51mm', { mag: 25, wt: 6.4 });
w('svd', 'type79', 'Type 79', 1979, 'China', '7.62×54mmR', { wt: 4.3 });
w('svd', 'alkadesih', 'Al-Kadesih', 1980, 'Iraq', '7.62×54mmR', { wt: 4.3 });
w('m21', 'm1d', 'M1D Garand sniper', 1951, 'United States', '.30-06', { mag: 8, wt: 4.9 });
w('g3sg1', 'sg550sn', 'SIG SG 550 Sniper', 1988, 'Switzerland', '5.56×45mm', { ...semi, mag: 20, wt: 7.0 });
w('m21', 'mas4956sn', 'MAS 49/56 with APX L806', 1957, 'France', '7.5×54mm', { mag: 10, wt: 4.9 });
w('g3sg1', 'g3a3zf', 'H&K G3A3ZF', 1970, 'West Germany', '7.62×51mm', { wt: 5.1 });

C = 'LMG';
w('m60', 'm60e3', 'M60E3', 1986, 'United States', '7.62×51mm', { rpm: 600, wt: 8.8 });
w('rpd', 'rp46', 'RP-46', 1946, 'Soviet Union', '7.62×54mmR', { rpm: 600, wt: 13 });
w('pkm', 'sgm', 'SGM', 1961, 'Soviet Union', '7.62×54mmR', { rpm: 650, wt: 13.5 });
w('pkm', 'type67', 'Type 67', 1967, 'China', '7.62×54mmR', { rpm: 650, wt: 15.5 });
w('mg3', 'mg7103', 'SIG MG 710-3', 1958, 'Switzerland', '7.62×51mm', { rpm: 900, wt: 9.3 });
w('rpk', 'l4a4', 'L4A4 Bren', 1958, 'United Kingdom', '7.62×51mm', { act: 'auto_ob', modes: ['auto', 'semi'], rpm: 500, wt: 9.5 });
w('m60', 'fnmag', 'FN MAG 60.20', 1958, 'Belgium', '7.62×51mm', { rpm: 750, wt: 11.8 });
w('pkm', 'vz59', 'vz. 59', 1959, 'Czechoslovakia', '7.62×54mmR', { rpm: 750, wt: 8.7 });
w('minimi', 'k3', 'Daewoo K3', 1987, 'South Korea', '5.56×45mm', { rpm: 850, wt: 6.9 });
w('rpd', 'type81lmg', 'Type 81 LMG', 1981, 'China', '7.62×39mm', { rpm: 650, mag: 75, wt: 5.3 });
w('minimi', 'ameli', 'CETME Ameli', 1982, 'Spain', '5.56×45mm', { rpm: 1100, wt: 6.4 });
w('mg3', 'mg4259', 'MG 42/59', 1959, 'Austria', '7.62×51mm', { rpm: 1100, wt: 12 });
w('rpk', 'madsensaetter', 'Madsen–Saetter', 1952, 'Denmark', '7.62×51mm', { act: 'auto_ob', modes: ['auto'], rpm: 750, wt: 10.6 });

C = 'PROTO'; PROTO = true; C = 'AR';
w('aug', 'em2', 'Enfield EM-2', 1951, 'United Kingdom', '.280 British', { rpm: 600, mag: 20, wt: 3.4 });
w('aug', 'xl64', 'Enfield XL64E5', 1972, 'United Kingdom', '4.85×49mm', { rpm: 700, mag: 20, wt: 3.7 });
w('ak47', 'ak46', 'Kalashnikov AK-46', 1946, 'Soviet Union', '7.62×39mm', { wt: 4.0 });
w('tkb022', 'tkb408', 'Korobov TKB-408', 1946, 'Soviet Union', '7.62×39mm', { rpm: 600, wt: 3.4 });
C = 'PST'; w('beretta93r', 'scamp', 'Colt SCAMP', 1971, 'United States', '.22 SCAMP', { rpm: 1500, mag: 27, wt: 1.3 });
w('glock17', 'dardick', 'Dardick 1500', 1958, 'United States', '.38 Tround', { mag: 15, wt: 1.1 });
C = 'AR'; w('hk33', 'hk36', 'H&K HK36', 1971, 'West Germany', '4.6×36mm', { ...sel3(1100), wt: 2.9 });
C = 'LMG'; w('stoner63', 'cmg2', 'Colt CMG-2', 1967, 'United States', '5.56×45mm', { rpm: 650, wt: 6.6 });
C = 'AR'; w('ar18', 'ar16', 'ArmaLite AR-16', 1959, 'United States', '7.62×51mm', { rpm: 700, wt: 4.0 });
w('m16a1', 'ar15proto', 'ArmaLite AR-15 (1958)', 1958, 'United States', '.222 Remington', { rpm: 750, mag: 25, wt: 2.6 });
C = 'CAR'; w('spiw', 'hugheslockless', 'Hughes Lockless Rifle', 1970, 'United States', '.27 lockless', { rpm: 2400, mag: 30, wt: 3.3 });
PROTO = false;

C = 'PST';
w('python', 'sw10', 'S&W Model 10', 1957, 'United States', '.38 Special', { wt: .86 });
w('python', 'sw19', 'S&W Model 19', 1957, 'United States', '.357 Magnum', { wt: .87 });
w('python', 'detective', 'Colt Detective Special', 1947, 'United States', '.38 Special', { wt: .62 });
w('python', 'sw36', 'S&W Model 36', 1950, 'United States', '.38 Special', { mag: 5, wt: .55 });
w('python', 'secsix', 'Ruger Security-Six', 1972, 'United States', '.357 Magnum', { wt: .95 });
w('m1911cw', 'series70', 'Colt Government Series 70', 1970, 'United States', '.45 ACP', { wt: 1.1 });
w('m1911cw', 'commander', 'Colt Commander', 1949, 'United States', '.45 ACP', { wt: .94 });
w('p226', 'sw39', 'S&W Model 39', 1955, 'United States', '9×19mm', { mag: 8, wt: .75 });
w('p226', 'sw59', 'S&W Model 59', 1971, 'United States', '9×19mm', { mag: 14, wt: .8 });
w('p38', 'waltherp1', 'Walther P1', 1957, 'West Germany', '9×19mm', { wt: .8 });
w('p7m8', 'p9s', 'H&K P9S', 1970, 'West Germany', '9×19mm', { mag: 9, wt: .88 });
w('p226', 'p220', 'SIG Sauer P220', 1975, 'Switzerland', '9×19mm', { mag: 9, wt: .8 });
w('glock17', 'steyrgb', 'Steyr GB', 1981, 'Austria', '9×19mm', { mag: 18, wt: .84 });
w('python', 'mr73', 'Manurhin MR 73', 1973, 'France', '.357 Magnum', { wt: .95 });
w('m1911cw', 'bren10', 'Bren Ten', 1983, 'United States', '10mm Auto', { mag: 11, wt: 1.1 });
w('m1911cw', 'detonics', 'Detonics Combat Master', 1976, 'United States', '.45 ACP', { mag: 6, wt: .82 });
w('beretta92', 'beretta84', 'Beretta 84 Cheetah', 1976, 'Italy', '.380 ACP', { mag: 13, wt: .66 });

C = 'SG';
w('rem1100', 'rem7188', 'Remington 7188', 1968, 'United States', '12 gauge', { act: 'auto', modes: ['auto', 'semi'], rpm: 300, mag: 7, wt: 4.3 });
w('neostead', 'hsmodel10', 'High Standard Model 10', 1967, 'United States', '12 gauge', { act: 'semi', modes: ['semi'], mag: 4, wt: 4.4 });
w('win1200', 'win1300', 'Winchester Model 1300 Defender', 1978, 'United States', '12 gauge', { mag: 7, wt: 3.2 });
w('r870', 'r870mk1', 'Remington 870 Mk1 (Royal Marines)', 1966, 'United Kingdom', '12 gauge', { mag: 7, wt: 3.7 });
w('r870', 'stevens77e', 'Stevens Model 77E', 1963, 'United States', '12 gauge', { mag: 5, wt: 3.4 });
w('rem1100', 'benellim1', 'Benelli M1 Super 90', 1982, 'Italy', '12 gauge', { mag: 7, wt: 3.4 });
w('aa12', 'atchisson', 'Atchisson Assault Shotgun', 1972, 'United States', '12 gauge', { rpm: 360, mag: 7, wt: 5.5 });
w('rem1100', 'mag10', 'Ithaca Mag-10', 1975, 'United States', '10 gauge', { mag: 2, pellets: 12, wt: 5 });
w('rem1100', 'a303', 'Beretta A303', 1983, 'Italy', '12 gauge', { mag: 4, wt: 3.3 });
w('rem1100', 'rem1187', 'Remington 11-87', 1987, 'United States', '12 gauge', { mag: 4, wt: 3.6 });
w('spas12', 'striker', 'Armsel Striker', 1981, 'South Africa', '12 gauge', { mag: 12, wt: 4.2 });
w('citori', 'win101', 'Winchester Model 101', 1963, 'Japan', '12 gauge', { wt: 3.4 });
w('izh43', 'savage30', 'Stevens 311 side-by-side', 1950, 'United States', '12 gauge', { wt: 3.4 });

C = 'SMG';
w('m45', 'madsenm50', 'Madsen M50', 1950, 'Denmark', '9×19mm', { rpm: 550, wt: 3.2 });
w('uzi', 'waltherml', 'Walther MP-L', 1963, 'West Germany', '9×19mm', { rpm: 550, wt: 3.0 });
w('uzi', 'vz23', 'Sa vz. 23', 1948, 'Czechoslovakia', '9×19mm', { rpm: 650, wt: 3.3 });
w('mat49', 'starz62', 'Star Z-62', 1962, 'Spain', '9×23mm Largo', { rpm: 550, wt: 2.9 });
w('mat49', 'starz84', 'Star Z-84', 1985, 'Spain', '9×19mm', { rpm: 600, wt: 3.0 });
w('mp5', 'spectre', 'SITES Spectre M4', 1983, 'Italy', '9×19mm', { rpm: 850, mag: 50, wt: 2.9 });
w('uzi', 'mpi69', 'Steyr MPi 69', 1969, 'Austria', '9×19mm', { rpm: 550, wt: 3.0 });
w('m45', 'swm76', 'S&W Model 76', 1967, 'United States', '9×19mm', { rpm: 720, wt: 3.3 });
w('skorpion', 'type79smg', 'Type 79 SMG', 1979, 'China', '7.62×25mm', { rpm: 1000, mag: 20, wt: 1.9 });
w('sterling', 'type85', 'Type 85 (suppressed)', 1985, 'China', '7.62×25mm', { rpm: 800, wt: 2.5, intSup: true });
w('m45', 'vigneron', 'Vigneron M2', 1953, 'Belgium', '9×19mm', { rpm: 600, wt: 3.3 });
w('m12', 'pm12s', 'Beretta PM12S', 1978, 'Italy', '9×19mm', { rpm: 550, wt: 3.2 });
w('m12', 'lf57', 'Franchi LF-57', 1957, 'Italy', '9×19mm', { rpm: 500, wt: 3.2 });
w('mat49', 'fmk3', 'FMK-3', 1974, 'Argentina', '9×19mm', { rpm: 650, wt: 3.4 });
w('sterling', 'f1smg', 'F1 submachine gun', 1962, 'Australia', '9×19mm', { rpm: 600, wt: 3.3 });
w('m16a1', 'colt635', 'Colt 9mm SMG (RO635)', 1982, 'United States', '9×19mm', { act: 'auto_ob', rpm: 900, mag: 32, wt: 2.6, m: { B: [.26] } });

C = 'SR';
w('m40', 'sp66', 'Mauser SP66', 1976, 'West Germany', '7.62×51mm', { mag: 3, wt: 6.1 });
w('m40', 'mauser86', 'Mauser 86 SR', 1986, 'West Germany', '7.62×51mm', { mag: 9, wt: 4.9 });
w('l96', 'ph82', 'Parker-Hale M82', 1982, 'United Kingdom', '7.62×51mm', { mag: 4, wt: 4.8 });
w('l96', 'ph85', 'Parker-Hale M85', 1985, 'United Kingdom', '7.62×51mm', { mag: 10, wt: 5.7 });
w('aiaw', 'trg21', 'Sako TRG-21', 1989, 'Finland', '7.62×51mm', { mag: 10, wt: 4.7 });
w('m40', 'vz54', 'vz. 54', 1954, 'Czechoslovakia', '7.62×54mmR', { wt: 4.3 });
w('m40', 'frf1', 'FR F1', 1966, 'France', '7.5×54mm', { mag: 10, wt: 5.2 });
w('l96', 'frf2', 'FR F2', 1986, 'France', '7.62×51mm', { mag: 10, wt: 5.3 });
w('ssg69', 'berettasniper', 'Beretta Sniper', 1985, 'Italy', '7.62×51mm', { mag: 5, wt: 7.2 });
w('l96', 'ssg2000', 'SIG Sauer SSG 2000', 1989, 'West Germany', '7.62×51mm', { mag: 4, wt: 6.6 });
w('m82', 'harrism87', 'Harris M-87', 1987, 'United States', '.50 BMG', { act: 'bolt', modes: ['bolt'], mag: 5, rpm: 40, wt: 9.5 });
w('m40', 'rem700p', 'Remington 700 Police', 1976, 'United States', '.308 Winchester', { wt: 4.1 });

// ============================================================================ Modern (1990–2009)
E = 'mod';
C = 'AR';
w('aug', 'sar21', 'ST Kinetics SAR 21', 1999, 'Singapore', '5.56×45mm', { rpm: 650, wt: 3.8 });
w('m16a4', 't91', 'T91', 2003, 'Taiwan', '5.56×45mm', { ...sel3(800), wt: 3.3 });
w('ak74m', 'beryl', 'Kbs wz. 96 Beryl', 1997, 'Poland', '5.56×45mm', { ...sel3(700), wt: 3.4 });
w('scarl', 'cz805', 'CZ 805 BREN A1', 2009, 'Czech Republic', '5.56×45mm', { ...sel3(780), wt: 3.6 });
w('qbz95', 'qbz03', 'QBZ-03', 2003, 'China', '5.8×42mm', { rpm: 650, wt: 3.5 });
w('ak74m', 'zastavam21', 'Zastava M21', 2004, 'Serbia', '5.56×45mm', { rpm: 680, wt: 3.6 });
w('aug', 'auga2', 'Steyr AUG A2', 1997, 'Austria', '5.56×45mm', { rpm: 700, wt: 3.6 });
w('m16a4', 'type89', 'Howa Type 89', 1989, 'Japan', '5.56×45mm', { ...sel3(750), wt: 3.5 });
w('fnc', 'ss1', 'Pindad SS1', 1991, 'Indonesia', '5.56×45mm', { rpm: 700, wt: 4.0 });
w('fnc', 'ss2', 'Pindad SS2', 2006, 'Indonesia', '5.56×45mm', { rpm: 750, wt: 3.4 });
w('ak74m', 'veprukr', 'Vepr (Ukraine)', 2003, 'Ukraine', '5.45×39mm', { rpm: 650, wt: 3.6 });
w('galil', 'r4', 'Vektor R4', 1990, 'South Africa', '5.56×45mm', { rpm: 700, wt: 4.3 });
w('l85', 'l85a1', 'L85A1', 1990, 'United Kingdom', '5.56×45mm', { rpm: 700, wt: 4.9, acc: 3.6 });

C = 'BR';
w('g3', 'g3p4', 'POF G3P4', 1990, 'Pakistan', '7.62×51mm', { wt: 4.5 });
w('ak74m', 'm77b1', 'Zastava M77B1', 1990, 'Yugoslavia', '7.62×51mm', { mag: 20, wt: 4.8 });
w('m14', 'm1asocom', 'Springfield M1A SOCOM 16', 2004, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.1, m: { B: [.41] } });
w('m14', 'm1ascout', 'Springfield M1A Scout Squad', 2001, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.1, m: { B: [.46] } });
w('ar10', 'ar10a4', 'ArmaLite AR-10A4', 1995, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.4 });
w('ar10', 'lr308', 'DPMS LR-308', 1996, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.5 });
w('ar10', 'lar8', 'Rock River LAR-8', 2008, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.2 });
w('m14', 'm305', 'Norinco M305', 1994, 'China', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.6 });
w('ak74m', 'saiga308', 'Saiga .308', 2001, 'Russia', '7.62×51mm', { ...semi, mag: 10, wt: 3.9 });
w('ak74m', 'vepr308', 'Molot Vepr .308', 2003, 'Russia', '7.62×51mm', { ...semi, mag: 10, wt: 4.3 });
w('g3', 'ptr91', 'PTR-91', 2005, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 4.4 });

C = 'CAR';
w('m4a1', 'm4', 'Colt M4 (Model 920)', 1994, 'United States', '5.56×45mm', { ...sel3(800), wt: 2.9 });
w('m4a1', 'colt933', 'Colt Model 933 Commando', 1996, 'United States', '5.56×45mm', { rpm: 850, wt: 2.6, m: { B: [.29] } });
w('m4a1', 'c8a1', 'Diemaco C8A1', 1994, 'Canada', '5.56×45mm', { rpm: 800, wt: 2.7 });
w('g36c', 'sg551', 'SIG SG 551', 1990, 'Switzerland', '5.56×45mm', { ...sel3(700), wt: 3.4 });
w('ak74m', 'miniberyl', 'Kbk wz. 96 Mini-Beryl', 1998, 'Poland', '5.56×45mm', { ...sel3(700), wt: 2.9, m: { B: [.24] } });
w('mk18', 'mk18mod0', 'Mk 18 Mod 0', 2000, 'United States', '5.56×45mm', { rpm: 850, wt: 2.7 });
w('m4a1', 'sr16cqb', 'KAC SR-16 CQB', 2004, 'United States', '5.56×45mm', { rpm: 800, wt: 2.9 });
w('hk416', 'm6a2', 'LWRC M6A2', 2006, 'United States', '5.56×45mm', { rpm: 750, wt: 3.0 });
w('scarl', 'scarlcqc', 'FN SCAR-L CQC', 2007, 'Belgium', '5.56×45mm', { rpm: 600, wt: 3.0, m: { B: [.25] } });
w('tavor', 'ctar21', 'IWI CTAR-21', 2001, 'Israel', '5.56×45mm', { rpm: 800, wt: 3.2 });
w('tavor', 'mtar21', 'IWI Micro Tavor MTAR-21', 2009, 'Israel', '5.56×45mm', { rpm: 850, wt: 3.0, m: { B: [.33] } });

C = 'DMR';
w('mk11', 'm25', 'M25 Light Sniper Rifle', 1991, 'United States', '7.62×51mm', { wt: 5.0 });
w('svd', 'svu', 'OTs-03 SVU', 1991, 'Russia', '7.62×54mmR', { wt: 4.4 });
w('svd', 'svdk', 'SVDK', 2006, 'Russia', '9.3×64mm', { wt: 6.5 });
w('msg90', 'msg90a1', 'H&K MSG90A1', 2000, 'Germany', '7.62×51mm', { wt: 6.4 });
w('svd', 'm91zastava', 'Zastava M91', 1991, 'Serbia', '7.62×54mmR', { wt: 4.2 });
w('mk12', 'mk12mod1', 'Mk 12 Mod 1 SPR', 2002, 'United States', '5.56×45mm', { act: 'semi', modes: ['semi'], wt: 4.5 });
w('mk12', 'samr', 'USMC SAM-R', 2001, 'United States', '5.56×45mm', { act: 'semi', modes: ['semi'], wt: 4.8 });
w('mk12', 'sdmr', 'US Army SDM-R', 2004, 'United States', '5.56×45mm', { act: 'semi', modes: ['semi'], wt: 4.7 });
w('mk14', 'crazyhorse', 'Smith Enterprise M14 SE “Crazy Horse”', 2005, 'United States', '7.62×51mm', { wt: 5.4 });
w('psg1', 'psg1a1', 'H&K PSG1A1', 2006, 'Germany', '7.62×51mm', { wt: 7.2 });
w('vss', 'vsk94', 'VSK-94', 1995, 'Russia', '9×39mm', { ...semi, wt: 2.8 });

C = 'LMG';
w('negevng5', 'negev97', 'IWI Negev (1997)', 1997, 'Israel', '5.56×45mm', { rpm: 850, wt: 7.6, e: 'mod' });
w('m240', 'm60e4', 'M60E4', 1994, 'United States', '7.62×51mm', { rpm: 600, wt: 10.2 });
w('m240', 'mk43', 'Mk 43 Mod 0', 2003, 'United States', '7.62×51mm', { rpm: 600, wt: 9.5 });
w('m249', 'mk46', 'Mk 46 Mod 0', 2001, 'United States', '5.56×45mm', { rpm: 800, wt: 7.1 });
w('rpk74', 'mg36', 'H&K MG36', 1997, 'Germany', '5.56×45mm', { mag: 100, rpm: 750, wt: 4.6 });
w('pkp', 'ukm2000', 'UKM-2000', 2007, 'Poland', '7.62×51mm', { rpm: 750, wt: 8.4 });
w('rpk74', 'type95lsw', 'QBB-95 LSW', 1997, 'China', '5.8×42mm', { mag: 75, rpm: 650, wt: 3.9 });
w('pkp', 'qjy88', 'QJY-88', 1999, 'China', '5.8×42mm', { rpm: 700, wt: 11.8 });
w('rpk74', 'insaslmg', 'INSAS LMG', 1998, 'India', '5.56×45mm', { rpm: 650, wt: 6.2 });
w('rpk74', 'l86', 'L86A2 LSW', 2002, 'United Kingdom', '5.56×45mm', { mag: 30, rpm: 700, wt: 5.4 });
w('minimipara', 'minisss', 'Denel Mini-SS', 1994, 'South Africa', '5.56×45mm', { rpm: 800, wt: 8.3 });
w('rpk74', 'rpk203', 'RPK-203', 2000, 'Russia', '7.62×39mm', { rpm: 600, wt: 5.0 });

C = 'PROTO'; PROTO = true; C = 'AR';
w('ak74m', 'asmdt', 'ASM-DT amphibious rifle', 2005, 'Russia', '5.45×39mm', { rpm: 600, wt: 4.6 });
w('xm29', 'xm25', 'XM25 CDTE', 2009, 'United States', '25×40mm', { act: 'semi', modes: ['semi'], mag: 5, rpm: 160, v: 210, dmg: 40, he: { r: 3.5, dmg: 110 }, wt: 6.4 });
C = 'SMG'; w('mp7', 'hkpdw', 'H&K PDW (1999)', 1999, 'Germany', '4.6×30mm', { rpm: 950, wt: 1.5 });
C = 'SG'; w('caws', 'aaicaws', 'AAI CAWS', 1983, 'United States', '12 gauge', { rpm: 300, mag: 12, wt: 4.6 });
C = 'AR'; w('ak74m', 'ads', 'ADS amphibious rifle', 2007, 'Russia', '5.45×39mm', { rpm: 750, wt: 4.6 });
C = 'SR'; w('m82', 'xm109', 'Barrett XM109', 2004, 'United States', '25×59mm', { mag: 5, v: 425, dmg: 210, he: { r: 2, dmg: 90 }, wt: 20.9 });
C = 'SG'; w('m1014', 'xm26', 'XM26 LSS', 2004, 'United States', '12 gauge', { act: 'semi', mag: 5, wt: 1.2 });
C = 'AR'; w('tkb022', 'tkb0146', 'TKB-0146', 1995, 'Russia', '5.45×39mm', { rpm: 600, wt: 3.5 });
C = 'LMG'; w('m249', 'maul', 'Metal Storm MAUL', 2007, 'Australia', '12 gauge', { act: 'semi', modes: ['semi'], mag: 5, pellets: 9, dmg: 22, v: 400, acc: 8, wt: 1.8 });
C = 'AR'; w('k2', 'k11', 'Daewoo K11 (2008)', 2008, 'South Korea', '5.56×45mm', { rpm: 700, wt: 6.1, he: { r: 2.8, dmg: 80 } });
PROTO = false;

C = 'PST';
w('glock22', 'glock20', 'Glock 20', 1991, 'Austria', '10mm Auto', { mag: 15, wt: .79 });
w('glock22', 'glock21', 'Glock 21', 1991, 'Austria', '.45 ACP', { mag: 13, wt: .74 });
w('p226', 'p229', 'SIG Sauer P229', 1991, 'Germany', '.357 SIG', { mag: 12, wt: .9 });
w('p226', 'p239', 'SIG Sauer P239', 1996, 'Germany', '9×19mm', { mag: 8, wt: .79 });
w('m9', 'cougar', 'Beretta 8000 Cougar', 1994, 'Italy', '9×19mm', { mag: 15, wt: .92 });
w('m9', 'pt92', 'Taurus PT92', 1990, 'Brazil', '9×19mm', { wt: .97 });
w('glock22', 'p95', 'Ruger P95', 1996, 'United States', '9×19mm', { mag: 15, wt: .78 });
w('glock22', 'mp_sw', 'S&W M&P (2005)', 2005, 'United States', '9×19mm', { mag: 17, wt: .68 });
w('glock22', 'xd', 'Springfield XD', 2002, 'Croatia', '9×19mm', { mag: 16, wt: .76 });
w('usp', 'p2000', 'H&K P2000', 2001, 'Germany', '9×19mm', { mag: 13, wt: .7 });
w('usp', 'fnp45', 'FN FNP-45', 2007, 'Belgium', '.45 ACP', { mag: 15, wt: .95 });
w('mp443', 'sp01', 'CZ 75 SP-01', 2005, 'Czech Republic', '9×19mm', { mag: 18, wt: 1.1 });
w('mp443', 'jericho', 'IWI Jericho 941', 1990, 'Israel', '9×19mm', { mag: 16, wt: 1.0 });
w('mp443', 'gyurza', 'SR-1 Vektor “Gyurza”', 1996, 'Russia', '9×21mm', { mag: 18, wt: .9 });
w('glock22', 'gsh18', 'GSh-18', 2000, 'Russia', '9×19mm', { mag: 18, wt: .59 });
w('glock22', 'steyrm9', 'Steyr M9-A1', 1999, 'Austria', '9×19mm', { mag: 14, wt: .76 });
w('mateba', 'ragingbull', 'Taurus Raging Bull', 1997, 'Brazil', '.44 Magnum', { wt: 1.5 });

C = 'SG';
w('m590', 'r870mcs', 'Remington 870 MCS', 2002, 'United States', '12 gauge', { mag: 4, wt: 3.1 });
w('m590', 'nova', 'Benelli Nova', 1999, 'Italy', '12 gauge', { mag: 4, wt: 3.6 });
w('m590', 'supernova', 'Benelli SuperNova Tactical', 2006, 'Italy', '12 gauge', { mag: 4, wt: 3.6 });
w('benellim3', 'sdass', 'Fabarm SDASS Tactical', 1998, 'Italy', '12 gauge', { act: 'pump', modes: ['pump'], mag: 6, wt: 3.3 });
w('saiga12', 'pm5', 'Valtro PM-5', 2005, 'Italy', '12 gauge', { act: 'pump', modes: ['pump'], mag: 7, wt: 3.6 });
w('m1014', 'b1201fp', 'Beretta 1201FP', 1990, 'Italy', '12 gauge', { mag: 6, wt: 3.0 });
w('m590', 'moss835', 'Mossberg 835 Ulti-Mag', 1990, 'United States', '12 gauge', { mag: 5, wt: 3.4 });
w('m1014', 'escort', 'Hatsan Escort MP-A', 2005, 'Turkey', '12 gauge', { mag: 6, wt: 3.2 });
w('usas12', 'mka1919', 'Akdal MKA 1919', 2008, 'Turkey', '12 gauge', { act: 'semi', modes: ['semi'], mag: 5, wt: 3.4 });
w('m1014', 'superx2', 'Winchester Super X2', 1999, 'Belgium', '12 gauge', { mag: 4, wt: 3.4 });
w('m1014', 'xtrema2', 'Beretta AL391 Xtrema2', 2005, 'Italy', '12 gauge', { mag: 4, wt: 3.5 });
w('m1014', 'bgold', 'Browning Gold', 1994, 'Belgium', '12 gauge', { mag: 4, wt: 3.4 });

C = 'SMG';
w('mp5k', 'mp5kpdw', 'H&K MP5K-PDW', 1991, 'Germany', '9×19mm', { rpm: 900, wt: 2.8 });
w('mp5a2', 'mp510', 'H&K MP5/10', 1992, 'Germany', '10mm Auto', { rpm: 800, wt: 2.7 });
w('mp5a2', 'mp540', 'H&K MP5/40', 1992, 'Germany', '.40 S&W', { rpm: 800, wt: 2.7 });
w('ump45', 'ump40', 'H&K UMP40', 1999, 'Germany', '.40 S&W', { rpm: 650, wt: 2.3 });
w('kedr', 'veresk', 'SR-2 Veresk', 1999, 'Russia', '9×21mm', { rpm: 900, wt: 1.7 });
w('kedr', 'pp90m1', 'PP-90M1', 2005, 'Russia', '9×19mm', { rpm: 800, mag: 64, wt: 1.6 });
w('kedr', 'kiparis', 'OTs-02 Kiparis', 1991, 'Russia', '.380 ACP', { rpm: 900, wt: 1.6 });
w('p90', 'calico', 'Calico M960', 1990, 'United States', '9×19mm', { rpm: 750, mag: 50, wt: 2.2 });
w('mp7', 'cbjms', 'CBJ-MS', 2001, 'Sweden', '6.5×25mm CBJ', { rpm: 900, wt: 2.6 });
w('mp7', 'k7', 'Daewoo K7', 2003, 'South Korea', '9×19mm', { rpm: 900, wt: 3.4, intSup: true });
w('miniuzi', 'microuzi', 'IMI Micro Uzi', 1990, 'Israel', '9×19mm', { rpm: 1250, wt: 1.5 });
w('p90', 'qcw05', 'QCW-05', 2005, 'China', '5.8×21mm', { rpm: 900, mag: 50, wt: 2.2, intSup: true });
w('mp5', 'rugermp9', 'Ruger MP9', 1995, 'United States', '9×19mm', { rpm: 600, wt: 3.0 });
w('mp5', 'famaesaf', 'FAMAE SAF', 1993, 'Chile', '9×19mm', { ...sel3(1200), wt: 2.7 });

C = 'SR';
w('aiaw', 'aw50', 'Accuracy Intl. AW50', 1998, 'United Kingdom', '.50 BMG', { mag: 5, wt: 15 });
w('aiaw', 'awp', 'Accuracy Intl. AWP', 1995, 'United Kingdom', '7.62×51mm', { mag: 10, wt: 6.5 });
w('m82', 'hecate2', 'PGM Hécate II', 1993, 'France', '.50 BMG', { act: 'bolt', modes: ['bolt'], mag: 7, rpm: 40, wt: 13.8 });
w('awm', 'ultimaratio', 'PGM Ultima Ratio', 1990, 'France', '7.62×51mm', { mag: 5, wt: 6.1 });
w('m82', 'osv96', 'OSV-96', 1994, 'Russia', '12.7×108mm', { mag: 5, wt: 12.9 });
w('m82', 'ksvk', 'KSVK', 1997, 'Russia', '12.7×108mm', { act: 'bolt', modes: ['bolt'], mag: 5, rpm: 40, wt: 12 });
w('m24', 'm40a3', 'M40A3', 2001, 'United States', '7.62×51mm', { wt: 7.5 });
w('m24', 'm40a5', 'M40A5', 2009, 'United States', '7.62×51mm', { mag: 5, wt: 7.6 });
w('m82', 'hs50', 'Steyr HS .50', 2004, 'Austria', '.50 BMG', { act: 'bolt', modes: ['bolt'], mag: 1, rpm: 15, wt: 12.4 });
w('m82', 'rc50', 'Robar RC-50', 1990, 'United States', '.50 BMG', { act: 'bolt', modes: ['bolt'], mag: 5, rpm: 40, wt: 11.8 });
w('m82', 'ar50', 'ArmaLite AR-50', 1999, 'United States', '.50 BMG', { act: 'bolt', modes: ['bolt'], mag: 1, rpm: 15, wt: 15.9 });
w('m24', 't3tac', 'Tikka T3 Tactical', 2004, 'Finland', '7.62×51mm', { mag: 5, wt: 4.9 });
w('awm', 'blackarrow', 'Zastava M93 Black Arrow', 1993, 'Serbia', '.50 BMG', { mag: 5, wt: 16 });
w('m82', 'ntw20', 'Denel NTW-20', 1998, 'South Africa', '20×82mm', { act: 'bolt', modes: ['bolt'], mag: 3, rpm: 20, wt: 31 });

// ============================================================================ Today (2010 on)
E = 'now';
C = 'AR';
w('aug', 'ef88', 'EF88 Austeyr', 2015, 'Australia', '5.56×45mm', { rpm: 700, wt: 3.4 });
w('f2000', 'f90', 'Lithgow F90', 2015, 'Australia', '5.56×45mm', { rpm: 750, wt: 3.3 });
w('tavor', 'malyuk', 'Malyuk', 2017, 'Ukraine', '5.45×39mm', { rpm: 650, wt: 3.8 });
w('ak12', 'm19zastava', 'Zastava M19', 2019, 'Serbia', '5.56×45mm', { rpm: 700, wt: 3.6 });
w('ak12', 'ak200', 'AK-200', 2018, 'Russia', '5.45×39mm', { rpm: 700, wt: 3.8 });
w('hk416a5', 'k2c1', 'Daewoo K2C1', 2012, 'South Korea', '5.56×45mm', { ...sel3(800), wt: 3.3 });
w('hk416a5', 'hk416f', 'H&K HK416F', 2017, 'France', '5.56×45mm', { rpm: 850, wt: 3.6 });
w('l85a3', 'auga3m1', 'Steyr AUG A3 M1', 2014, 'Austria', '5.56×45mm', { rpm: 700, wt: 3.6 });
w('hk433', 'arx160a3', 'Beretta ARX160 A3', 2016, 'Italy', '5.56×45mm', { rpm: 700, wt: 3.1 });
w('hk433', 'remacr', 'Remington ACR', 2010, 'United States', '5.56×45mm', { rpm: 700, wt: 3.6 });
w('qbz191', 'grotb', 'FB MSBS Grot B', 2019, 'Poland', '5.56×45mm', { rpm: 750, wt: 3.7 });
w('qbz191', 'sakom23', 'Sako M23', 2023, 'Finland', '7.62×51mm', { rpm: 600, wt: 4.0 });
w('ak12', 'ak12_2012', 'AK-12 (2012)', 2012, 'Russia', '5.45×39mm', { ...sel3(700), wt: 3.3 });

C = 'BR';
w('arad', 'arx200', 'Beretta ARX200', 2015, 'Italy', '7.62×51mm', { rpm: 650, wt: 4.0 });
w('sig716', 'cm901', 'Colt CM901', 2010, 'United States', '7.62×51mm', { rpm: 700, wt: 4.1 });
w('arad', 'bren2br', 'CZ Bren 2 BR', 2019, 'Czech Republic', '7.62×51mm', { rpm: 700, wt: 4.0 });
w('sig716', 'sig716i', 'SIG 716i Tread', 2019, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 3.9 });
w('sig716', 'sfar', 'Ruger SFAR', 2023, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 3.1 });
w('sig716', 'marsh', 'LMT MARS-H', 2012, 'United States', '7.62×51mm', { rpm: 650, wt: 4.3 });
w('sig716', 'repr', 'LWRC REPR', 2013, 'United States', '7.62×51mm', { rpm: 650, wt: 4.1 });
w('sig716', 'dd5v3', 'Daniel Defense DD5 V3', 2018, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 3.8 });
w('sig716', 'hk417a2', 'H&K HK417 A2', 2013, 'Germany', '7.62×51mm', { rpm: 600, wt: 4.4 });
w('sig716', 'saintvictor308', 'Springfield Saint Victor .308', 2020, 'United States', '7.62×51mm', { act: 'semi', modes: ['semi'], wt: 3.6 });
w('ak308', 'm17zastava', 'Zastava M17', 2017, 'Serbia', '7.62×51mm', { rpm: 650, wt: 4.0 });

C = 'CAR';
w('ak12k', 'am17', 'Kalashnikov AM-17', 2017, 'Russia', '5.45×39mm', { rpm: 800, wt: 2.6 });
w('rattler', 'apc223', 'B&T APC223', 2012, 'Switzerland', '5.56×45mm', { rpm: 800, wt: 2.8 });
w('rattler', 'honeybadger', 'Q Honey Badger', 2017, 'United States', '.300 BLK', { rpm: 750, wt: 2.3, intSup: true });
w('hk416a5', 'ddmk18', 'Daniel Defense MK18', 2012, 'United States', '5.56×45mm', { rpm: 850, wt: 2.8, m: { B: [.26] } });
w('hk416a5', 'urgi', 'Geissele URG-I', 2019, 'United States', '5.56×45mm', { rpm: 800, wt: 3.0 });
w('ks1', 'sr15mod2', 'KAC SR-15 Mod 2', 2017, 'United States', '5.56×45mm', { rpm: 750, wt: 2.9 });
w('rattler', 'mcxlt', 'SIG MCX LT', 2023, 'United States', '5.56×45mm', { rpm: 850, wt: 2.6 });
w('bren2', 'carmel', 'IWI Carmel', 2020, 'Israel', '5.56×45mm', { rpm: 750, wt: 3.0 });
w('hk416a5', 'hk416a8', 'H&K HK416 A8', 2022, 'Germany', '5.56×45mm', { rpm: 850, wt: 3.4 });
w('bren2', 'bren2ms', 'CZ Bren 2 Ms (8-inch)', 2016, 'Czech Republic', '5.56×45mm', { rpm: 1000, wt: 2.3, m: { B: [.21] } });
w('lwrc', 'six8', 'LWRC Six8 A5', 2014, 'United States', '6.8 SPC', { rpm: 750, wt: 3.1 });
w('hk416a5', 'mrr', 'Colt Canada MRR', 2014, 'Canada', '5.56×45mm', { rpm: 800, wt: 3.0 });

C = 'DMR';
w('mk20ssr', 'scar20s', 'FN SCAR 20S', 2019, 'Belgium', '7.62×51mm', { wt: 5.0 });
w('svch', 'svdm', 'SVDM', 2018, 'Russia', '7.62×54mmR', { wt: 5.3 });
w('svch', 'svk', 'Kalashnikov SVK', 2017, 'Russia', '7.62×54mmR', { wt: 4.5 });
w('m110a1', 'sr25e2', 'KAC SR-25 E2 APC', 2018, 'United States', '7.62×51mm', { wt: 4.8 });
w('g28', 'sig716dmr', 'SIG 716 G2 DMR', 2017, 'United States', '7.62×51mm', { wt: 5.0 });
w('g28', 'g28e', 'H&K G28E', 2014, 'Germany', '7.62×51mm', { wt: 5.8 });
w('m110a1', 'm38sdmr', 'M38 SDMR', 2018, 'United States', '5.56×45mm', { mag: 30, wt: 4.5 });
w('l129', 'galilsniper', 'IWI Galil Sniper (2013)', 2013, 'Israel', '7.62×51mm', { wt: 5.4 });
w('l129', 'r11rsass', 'Remington R11 RSASS', 2011, 'United States', '7.62×51mm', { wt: 5.7 });
w('l129', 'rec10', 'Barrett REC10', 2017, 'United States', '7.62×51mm', { wt: 4.3 });

C = 'LMG';
w('m250', 'mg338', 'SIG MG 338', 2019, 'United States', '.338 Norma Mag', { rpm: 600, wt: 9.1 });
w('m249', 'minimimk3', 'FN Minimi Mk3', 2013, 'Belgium', '5.56×45mm', { rpm: 800, wt: 7.6, e: 'now' });
w('m249', 'mk46m1', 'Mk 46 Mod 1', 2012, 'United States', '5.56×45mm', { rpm: 800, wt: 7.0, e: 'now' });
w('mk48', 'mk48m1', 'Mk 48 Mod 1', 2012, 'United States', '7.62×51mm', { rpm: 730, wt: 8.2, e: 'now' });
w('mg5', 'pechsp', 'Pecheneg-SP', 2014, 'Russia', '7.62×54mmR', { rpm: 700, wt: 8.7 });
w('negevng5', 'k15', 'Daewoo K15', 2018, 'South Korea', '5.56×45mm', { rpm: 800, wt: 6.9 });
w('negevng5', 'ultimax8', 'Ultimax 100 Mk 8', 2016, 'Singapore', '5.56×45mm', { rpm: 600, wt: 4.9 });
w('negevng5', 'lamg', 'KAC LAMG', 2013, 'United States', '5.56×45mm', { rpm: 600, wt: 5.5 });
w('negevng5', 'qjb201', 'QJB-201', 2021, 'China', '5.8×42mm', { rpm: 750, wt: 5.9 });
w('mg5', 'qjy201', 'QJY-201', 2021, 'China', '7.62×51mm', { rpm: 700, wt: 9.6 });
w('negevng5', 'mg4ke', 'H&K MG4KE', 2015, 'Germany', '5.56×45mm', { rpm: 850, wt: 7.8 });
w('evolys', 'evolys556', 'FN EVOLYS (5.56)', 2021, 'Belgium', '5.56×45mm', { rpm: 750, wt: 5.5 });

C = 'PROTO'; PROTO = true; C = 'AR';
w('xm7', 'ngswr', 'Textron NGSW-R', 2019, 'United States', '6.8×51mm', { rpm: 650, wt: 4.4 });
C = 'LMG'; w('lsat', 'ngswar', 'Textron NGSW-AR', 2019, 'United States', '6.8×51mm', { rpm: 650, wt: 6.8 });
C = 'AR'; w('x95', 'ak12bp', 'AK-12 bullpup prototype', 2016, 'Russia', '5.45×39mm', { rpm: 700, wt: 3.5 });
w('m27', 'hamr', 'FN HAMR', 2009, 'Belgium', '5.56×45mm', { rpm: 600, wt: 4.1 });
w('m27', 'coltiar', 'Colt IAR', 2009, 'United States', '5.56×45mm', { rpm: 650, wt: 4.0 });
w('ak12', 'ak400', 'Kalashnikov AK-400', 2010, 'Russia', '5.45×39mm', { rpm: 700, wt: 3.4 });
C = 'CAR'; w('x95', 'magpulpdr', 'Magpul PDR', 2011, 'United States', '5.56×45mm', { rpm: 800, wt: 2.1, m: { B: [.21] } });
C = 'AR'; w('x95', 'msbsbp', 'MSBS-5.56B (bullpup)', 2014, 'Poland', '5.56×45mm', { rpm: 750, wt: 3.6 });
w('aek971', 'a545', 'Degtyarev A-545', 2015, 'Russia', '5.45×39mm', { ...sel3(900), wt: 3.9 });
C = 'SMG'; w('vector2', 'superv', 'KRISS Super V prototype', 2009, 'United States', '.45 ACP', { rpm: 1200, wt: 2.6 });
PROTO = false;

C = 'PST';
w('glock19', 'glock48', 'Glock 48', 2019, 'Austria', '9×19mm', { mag: 10, wt: .58 });
w('glock19', 'glock19x', 'Glock 19X', 2018, 'Austria', '9×19mm', { mag: 17, wt: .62 });
w('p365', 'p365xl', 'SIG P365XL', 2019, 'United States', '9×19mm', { mag: 12, wt: .58 });
w('p365', 'hellcat', 'Springfield Hellcat', 2019, 'Croatia', '9×19mm', { mag: 11, wt: .52 });
w('glock19', 'echelon', 'Springfield Echelon', 2023, 'Croatia', '9×19mm', { mag: 17, wt: .68 });
w('p365', 'shieldplus', 'S&W M&P Shield Plus', 2021, 'United States', '9×19mm', { mag: 13, wt: .57 });
w('p365', 'max9', 'Ruger Max-9', 2021, 'United States', '9×19mm', { mag: 12, wt: .52 });
w('p365', 'ppsm2', 'Walther PPS M2', 2016, 'Germany', '9×19mm', { mag: 7, wt: .6 });
w('p10', 'tp9sf', 'Canik TP9SF', 2014, 'Turkey', '9×19mm', { mag: 18, wt: .79 });
w('rhino', 'python2020', 'Colt Python (2020)', 2020, 'United States', '.357 Magnum', { wt: 1.2 });
w('rhino', 'kingcobra', 'Colt King Cobra (2019)', 2019, 'United States', '.357 Magnum', { wt: .79 });
w('m9a4', 'b92x', 'Beretta 92X Performance', 2019, 'Italy', '9×19mm', { mag: 15, wt: 1.3 });
w('fn509', 'fn545', 'FN 545', 2021, 'United States', '.45 ACP', { mag: 15, wt: .9 });
w('glock34', 'glock40', 'Glock 40 Gen4 MOS', 2015, 'Austria', '10mm Auto', { mag: 15, wt: .9 });
w('staccato', 'edcx9', 'Wilson Combat EDC X9', 2017, 'United States', '9×19mm', { mag: 15, wt: .9 });
w('pl15', 'udav', 'Udav', 2019, 'Russia', '9×21mm', { mag: 18, wt: .8 });
w('p10', 'arexdelta', 'Arex Delta', 2020, 'Slovenia', '9×19mm', { mag: 17, wt: .62 });

C = 'SG';
w('m4sg', 'b1301', 'Beretta 1301 Tactical', 2014, 'Italy', '12 gauge', { mag: 5, wt: 2.9 });
w('m590m', 'shockwave', 'Mossberg 590 Shockwave', 2017, 'United States', '12 gauge', { mag: 5, wt: 2.4, acc: 13 });
w('m4sg', 'moss940', 'Mossberg 940 Pro Tactical', 2022, 'United States', '12 gauge', { mag: 7, wt: 3.4 });
w('m590m', 'sxp', 'Winchester SXP Defender', 2010, 'Turkey', '12 gauge', { mag: 5, wt: 3.0 });
w('ksg', 'ksg25', 'Kel-Tec KSG-25', 2019, 'United States', '12 gauge', { mag: 24, wt: 4.5 });
w('mp155', 'origin12', 'Fostech Origin-12', 2013, 'United States', '12 gauge', { mag: 20, wt: 4.8 });
w('m590m', 'tac14', 'Remington 870 TAC-14', 2017, 'United States', '12 gauge', { mag: 4, wt: 2.6, acc: 13 });
w('m4sg', 'a400', 'Beretta A400 Xtreme Plus', 2017, 'Italy', '12 gauge', { mag: 4, wt: 3.3 });
w('m4sg', 'browa5', 'Browning A5 (2012)', 2012, 'Belgium', '12 gauge', { mag: 4, wt: 3.2 });
w('m4sg', 'vinci', 'Benelli Vinci Tactical', 2011, 'Italy', '12 gauge', { mag: 4, wt: 3.1 });
w('ksg', 'ts12', 'IWI Tavor TS12', 2018, 'Israel', '12 gauge', { act: 'semi', modes: ['semi'], mag: 15, wt: 3.6 });
w('m4sg', 'm3000', 'Stoeger M3000 Defense', 2015, 'Turkey', '12 gauge', { mag: 4, wt: 3.2 });
w('dt11', 'b694', 'Beretta 694', 2019, 'Italy', '12 gauge', { wt: 3.6 });

C = 'SMG';
w('scorpion', 'scorpion3plus', 'CZ Scorpion 3+', 2023, 'Czech Republic', '9×19mm', { rpm: 1150, wt: 2.6 });
w('apc9', 'pmx', 'Beretta PMX', 2017, 'Italy', '9×19mm', { rpm: 900, wt: 2.4 });
w('apc45', 'smg45', 'LWRC SMG-45', 2018, 'United States', '.45 ACP', { rpm: 750, wt: 3.0 });
w('mpx', 'banshee', 'CMMG Banshee', 2017, 'United States', '.45 ACP', { rpm: 800, wt: 2.4 });
w('apc9', 'apc10', 'B&T APC10', 2017, 'Switzerland', '10mm Auto', { rpm: 1000, wt: 2.6 });
w('apc9', 'mp9n', 'B&T MP9-N', 2015, 'Switzerland', '9×19mm', { rpm: 1100, wt: 1.4 });
w('scorpion', 'mp5a5', 'H&K MP5A5', 2014, 'Germany', '9×19mm', { rpm: 800, wt: 3.0 });
w('apc9', 'mp7a2', 'H&K MP7A2', 2020, 'Germany', '4.6×30mm', { rpm: 950, mag: 40, wt: 1.9 });
w('apc9', 'sr2mp', 'SR-2MP Veresk', 2011, 'Russia', '9×21mm', { rpm: 900, wt: 1.8 });
w('mpx', 'copperhead', 'SIG MPX Copperhead', 2018, 'United States', '9×19mm', { rpm: 850, wt: 2.0 });
w('apc9', 'smt9', 'Taurus SMT9', 2019, 'Brazil', '9×19mm', { rpm: 850, wt: 2.6 });

C = 'SR';
w('axmc', 'ax50', 'Accuracy Intl. AX50', 2014, 'United Kingdom', '.50 BMG', { mag: 5, wt: 12.5 });
w('axmc', 'axsr', 'Accuracy Intl. AXSR', 2019, 'United Kingdom', '.300 Norma Mag', { mag: 5, wt: 6.9 });
w('trg42', 'trgm10', 'Sako TRG M10', 2011, 'Finland', '.338 Lapua', { mag: 8, wt: 5.9 });
w('srs', 'hti', 'Desert Tech HTI', 2013, 'United States', '.375 CheyTac', { mag: 5, wt: 9.5 });
w('svl', 'dvl10', 'Lobaev DVL-10', 2013, 'Russia', '7.62×51mm', { mag: 10, wt: 5.5, intSup: true });
w('m107a1', 'asvk', 'ASVK', 2013, 'Russia', '12.7×108mm', { act: 'bolt', modes: ['bolt'], mag: 5, rpm: 40, wt: 12.5 });
w('mk22', 'msr', 'Remington MSR', 2011, 'United States', '.338 Lapua', { mag: 10, wt: 7.6 });
w('mk13', 'ssg08', 'Steyr SSG 08', 2011, 'Austria', '.338 Lapua', { mag: 10, wt: 6.9 });
w('mk13', 'k14', 'Daewoo K14', 2013, 'South Korea', '7.62×51mm', { mag: 5, wt: 7.0 });
w('t5000', 'dan338', 'IWI DAN .338', 2014, 'Israel', '.338 Lapua', { mag: 10, wt: 6.9 });
w('mk13', 'tpg3', 'Unique Alpine TPG-3', 2010, 'Germany', '.338 Lapua', { mag: 5, wt: 6.6 });
w('mk22', 'cdx33', 'Cadex CDX-33', 2014, 'Canada', '.338 Lapua', { mag: 10, wt: 6.6 });
w('m99', 'trex', 'Snipex T-Rex', 2016, 'Ukraine', '14.5×114mm', { mag: 1, wt: 22 });

// ============================================================================ Psycho Arsenal (fictional)
PSY = 'feasible';
C = 'AR'; w('lancer', 'kestrel', 'Kestrel KR-7 Damped Carbine', 2032, 'Blackline Armory', '6.8×51mm', { caseless: false, rpm: 750, mag: 30, rec: [.32, .25], wt: 3.4, blurb: 'A recoil-buffered full-power carbine: a sliding inertial mass soaks up most of the kick.' });
C = 'SG'; w('kodiak', 'bastion', 'Bastion B-12 Drum Breacher', 2031, 'Kessler Dynamics', '12 gauge', { act: 'semi', modes: ['semi'], mag: 20, pellets: 9, wt: 5.2, blurb: 'Self-loading 12-gauge fed from a 20-round drum, built for clearing doors and the rooms behind them.' });
C = 'SMG'; w('tempest', 'ferrite', 'Ferrite FX-10 Tandem SMG', 2033, 'Rust Syndicate', '10mm Auto', { salvo: 2, rpm: 900, mag: 50, wt: 3.4, blurb: 'Two 10 mm barrels fed from one stacked magazine; every pull sends a pair.' });
C = 'DMR'; w('vanta', 'gallows', 'Gallows .458 Integral Brush Gun', 2030, 'Orbital Arms', '.458 SOCOM', { act: 'semi', modes: ['semi'], mag: 10, v: 330, wt: 4.0, blurb: 'Subsonic .458 slugs through a full-length integral suppressor: a whisper that knocks down doors.' });
C = 'SMG'; w('hornet', 'whisper', 'Whisper W-45 Integral PDW', 2031, 'Blackline Armory', '.45 ACP', { caseless: false, intSup: true, rpm: 700, mag: 30, wt: 2.6, blurb: 'An integrally suppressed .45 PDW: quieter than the action cycling.' });
C = 'DMR'; w('ghostline', 'longreach', 'Longreach LR-50 Gyrojet Marksman', 2034, 'Orbital Arms', '13mm Gyrojet', { act: 'semi', modes: ['semi'], mag: 10, wt: 5.1, acc: 1.2, blurb: 'A long-tube gyrojet rifle: the rockets keep accelerating out to 50 m.' });
C = 'PST'; w('warden', 'sentinel', 'Sentinel S-9 Seeker Pistol', 2035, 'Orbital Arms', '5.7mm Seeker', { act: 'semi', modes: ['semi'], mag: 20, wt: 1.0, homing: 2.5, blurb: 'Smart pistol: rounds steer themselves toward the nearest target in the cone.' });
C = 'LMG'; w('mjolnir', 'cyclone', 'Cyclone C-3 Triple-Stack LMG', 2033, 'Kessler Dynamics', '5.56×45mm', { salvo: 3, rpm: 700, mag: 150, wt: 9.5, heavy: true, blurb: 'Three barrels fired together from a triple-stack belt box.' });
C = 'SG'; w('thunderclap', 'flare', 'Flare F-12 Incendiary Riot Gun', 2030, 'Rust Syndicate', '12 gauge FRAG', { inc: true, he: { r: 1.6, dmg: 35 }, mag: 8, wt: 3.8, blurb: 'Dragon’s-breath and thermite slugs from a magazine-fed riot gun.' });
C = 'DMR'; w('mjolnir', 'twinpoint', 'Twinpoint TP-2 Duplex Marksman', 2032, 'Blackline Armory', '7.62×51mm', { act: 'semi', modes: ['semi'], salvo: 2, mag: 20, wt: 4.9, blurb: 'Over/under barrels fire a two-shot group with every trigger pull.' });
C = 'SMG'; w('lancer', 'stormcrow', 'Stormcrow SC-6 Needle SMG', 2034, 'Orbital Arms', '6mm Needle', { rpm: 1200, mag: 60, wt: 2.4, blurb: 'Needle flechettes at SMG rates: armour-piercing and almost no recoil.' });

PSY = 'overkill';
C = 'LMG'; w('hellbore', 'gravemind', 'Gravemind GM-8 Octo-Barrel Minigun', 2037, 'Kessler Dynamics', '7.62×51mm', { rpm: 6000, mag: 800, spin: .9, wt: 24, blurb: 'Eight 7.62 barrels, 6,000 rounds a minute, carried by someone who should not be able to.' });
C = 'SG'; w('arclight', 'railhammer', 'Railhammer RH-2 Coil Shotgun', 2038, 'Orbital Arms', 'Tungsten rail slug', { pellets: 12, dmg: 40, charge: .5, mag: 6, acc: 6, blurb: 'Charge the coils, release twelve tungsten pellets at 2 km/s.' });
C = 'SR'; w('tsar', 'behemoth', 'Behemoth 25 mm Revolver Cannon', 2035, 'Rust Syndicate', '25×137mm', { mag: 5, dmg: 160, he: { r: 2.8, dmg: 110 }, wt: 26, blurb: 'A five-shot 25 mm revolver on a shoulder stock. Nobody fires it twice standing up.' });
C = 'LMG'; w('brimstone', 'inferno', 'Inferno IN-40 Thermite Belt Gun', 2036, 'Rust Syndicate', '14.5×114mm', { act: 'auto', modes: ['auto'], rpm: 450, mag: 60, wt: 32, blurb: 'Belt-fed 14.5 mm thermite rounds that set whatever they hit burning.' });
C = 'LMG'; w('deuce', 'quadstrike', 'Quadstrike Q-4 Quad .50', 2037, 'Kessler Dynamics', '.50 BMG', { salvo: 4, rpm: 500, mag: 400, wt: 38, blurb: 'Four .50 BMG barrels fired together. A building-removal tool.' });
C = 'LMG'; w('seraph', 'hornetsnest', 'Hornet’s Nest HN-60 Swarm Pod', 2038, 'Orbital Arms', 'Seeker micro-rocket', { salvo: 8, mag: 64, wt: 16, blurb: 'Eight seeking micro-rockets per pull from a 64-cell pod.' });
C = 'SG'; w('hydra', 'tsunami', 'Tsunami 12-Barrel Volley Gun', 2034, 'Rust Syndicate', '12 gauge', { salvo: 12, mag: 12, wt: 11, blurb: 'Twelve shotgun barrels fired at once. Reloading takes longer than the fight.' });
C = 'LMG'; w('pandemonium', 'kraken', 'Kraken 40 mm Auto-Mortar', 2037, 'Kessler Dynamics', '40mm auto-mortar', { rpm: 240, mag: 40, he: { r: 6, dmg: 170 }, wt: 30, blurb: 'A man-portable automatic 40 mm mortar fed from a belt drum.' });
C = 'PST'; w('widowmaker', 'executioner', 'Executioner .950 JDJ Hand-Cannon', 2033, 'Blackline Armory', '.950 JDJ', { mag: 3, dmg: 420, rec: [7, 2.4], wt: 5.5, blurb: 'A three-shot pistol firing the 3,600-grain .950 JDJ. Pure malpractice.' });
C = 'AR'; w('arclight', 'sunlance', 'Sunlance SL-9 Coil Carbine', 2039, 'Orbital Arms', 'Tungsten rail slug', { act: 'auto', modes: ['auto', 'semi'], rpm: 300, mag: 30, dmg: 140, charge: .25, wt: 7, blurb: 'A short coil carbine that charges between shots fast enough for automatic fire.' });

PSY = null;
// ============================================================================ Black Powder
E = 'powder';
C = 'MUS';
w('arquebus', 'handgonne', 'Handgonne (hand cannon)', 1400, 'Holy Roman Empire', '.75 musket ball', { acc: 70, lock: .5, misfire: .2, wt: 6.5, blurb: 'A bronze tube on a pole, touched off with a slow match by hand.' });
w('brownbess', 'snaphance', 'Snaphance musket', 1600, 'Dutch Republic', '.69 musket ball', { misfire: .16, wt: 4.8 });
w('brownbess', 'miquelet', 'Miquelet musket', 1650, 'Spain', '.69 musket ball', { misfire: .1, wt: 4.6 });
w('brownbess', 'doglock', 'English doglock musket', 1650, 'England', '.75 musket ball', { misfire: .14, wt: 5.0 });
w('brownbess', 'shortland', 'Short Land Pattern musket', 1768, 'Great Britain', '.75 musket ball', { wt: 4.7, m: { B: [1.07] } });
w('charleville', 'austria1798', 'Austrian M1798 musket', 1798, 'Austria', '.69 musket ball', { wt: 4.4 });
w('charleville', 'russia1808', 'Russian M1808 musket', 1808, 'Russian Empire', '.69 musket ball', { wt: 4.5 });
w('spring1795', 'spring1816', 'Springfield Model 1816', 1816, 'United States', '.69 musket ball', { wt: 4.4 });
w('baker', 'hf1803', 'Harpers Ferry Model 1803', 1803, 'United States', '.54 rifle ball', { wt: 4.1 });
w('baker', 'brunswick', 'Brunswick rifle', 1837, 'United Kingdom', '.62 rifle ball', { lock: .03, misfire: .03, wt: 4.5 });
w('spring1861', 'spring1842', 'Springfield Model 1842', 1842, 'United States', '.69 musket ball', { acc: 30, wt: 4.3, m: { rifled: false } });
w('p1853', 'mississippi', 'M1841 “Mississippi” rifle', 1841, 'United States', '.54 rifle ball', { wt: 4.4 });
w('lorenz', 'minie1849', 'Fusil Minié Mle 1849', 1849, 'France', '.69 musket ball', { wt: 4.5 });
w('tanegashima', 'torador', 'Indian torador matchlock', 1700, 'Maratha Empire', '.62 rifle ball', { wt: 4.5 });
w('tanegashima', 'jochong', 'Korean jochong', 1600, 'Joseon Korea', '.62 rifle ball', { wt: 4.2 });
w('jezail', 'amusette', 'Amusette wall gun', 1750, 'France', '1-pdr ball', { dmg: 260, rec: [5, 1.6], wt: 22, acc: 18, blurb: 'Maurice de Saxe’s outsized musket, fired from a wall or a rest.' });
w('kentucky', 'fowler', 'Long fowling piece', 1740, 'British America', '.62 rifle ball', { pellets: 8, dmg: 30, acc: 60, wt: 3.4, m: { rifled: false } });

C = 'PST';
w('seaservice', 'johnson1836', 'Johnson Model 1836 pistol', 1836, 'United States', '.54 rifle ball', { wt: 1.2 });
w('bootpistol', 'aston1842', 'Aston Model 1842 pistol', 1842, 'United States', '.54 rifle ball', { wt: 1.2 });
w('queenanne', 'doune', 'Scottish Doune pistol', 1740, 'Scotland', '.50 pistol ball', { wt: 1.0 });
w('wogdon', 'kentuckypst', 'Kentucky pistol', 1780, 'United States', '.50 pistol ball', { wt: 1.1 });
w('bootpistol', 'deringer', 'Philadelphia Deringer', 1852, 'United States', '.41 cap & ball', { wt: .3 });
w('colt_walker', 'dragoon', 'Colt Dragoon', 1848, 'United States', '.44 cap & ball', { wt: 1.9 });
w('navy1851', 'pocket1849', 'Colt 1849 Pocket', 1849, 'United States', '.36 cap & ball', { mag: 5, wt: .7 });
w('rem1858', 'starr1858', 'Starr 1858 double-action', 1858, 'United States', '.44 cap & ball', { wt: 1.3 });
w('adams', 'kerr', 'Kerr revolver', 1859, 'United Kingdom', '.44 cap & ball', { mag: 5, wt: 1.3 });
w('nagant', 'lefaucheux', 'Lefaucheux M1858 pinfire', 1858, 'France', '12mm pinfire', { wt: 1.1 });
w('nagant', 'sw1', 'Smith & Wesson Model 1', 1857, 'United States', '.22 Short', { mag: 7, wt: .3 });
w('nagant', 'saa', 'Colt Single Action Army', 1873, 'United States', '.45 Colt', { wt: 1.05 });
w('nagant', 'webleyric', 'Webley RIC', 1868, 'United Kingdom', '.442 Webley', { wt: .9 });
w('nagant', 'chamelot', 'Chamelot-Delvigne Mle 1873', 1873, 'France', '11mm Mle 1873', { wt: 1.2 });
w('webley', 'schofield', 'Smith & Wesson Schofield', 1875, 'United States', '.45 Schofield', { wt: 1.1 });
w('blunderpistol', 'duckfoot', 'Duck’s-foot volley pistol', 1790, 'United Kingdom', '.50 pistol ball', { salvo: 4, wt: 1.3, acc: 45, blurb: 'Four splayed barrels fire at once: one pull, four balls in a fan.' });

C = 'RIF';
w('chassepot', 'vetterli70', 'Vetterli M1870', 1870, 'Italy', '10.4mm Vetterli', { wt: 4.6 });
w('chassepot', 'vetterli69', 'Vetterli M1869 (Swiss)', 1869, 'Switzerland', '10.4mm Vetterli', { act: 'bolt', mag: 12, rpm: 30, wt: 4.6 });
w('chassepot', 'beaumont', 'Beaumont M1871', 1871, 'Netherlands', '11mm Werndl', { wt: 4.4 });
w('chassepot', 'gras', 'Gras Mle 1874', 1874, 'France', '11mm Gras', { wt: 4.2 });
w('dreyse', 'mauser71', 'Mauser Model 1871', 1871, 'German Empire', '11mm Mauser', { wt: 4.5 });
w('dreyse', 'mauser7184', 'Mauser Model 71/84', 1884, 'German Empire', '11mm Mauser', { mag: 8, rpm: 30, wt: 4.6 });
w('chassepot', 'berdan2', 'Berdan II', 1870, 'Russian Empire', '10.67mm Berdan', { wt: 4.4 });
w('dreyse', 'murata13', 'Murata Type 13', 1880, 'Empire of Japan', '11mm Murata', { wt: 4.1 });
w('werndl', 'krnka', 'Krnka M1867', 1867, 'Russian Empire', '15mm Krnka', { wt: 4.5 });
w('snider', 'albini', 'Albini–Braendlin M1867', 1867, 'Belgium', '.58 Albini', { wt: 4.4 });
w('snider', 'tabatiere', 'Fusil Mle 1867 “Tabatière”', 1867, 'France', '18mm Tabatière', { wt: 4.3 });
w('sharps1859', 'burnside', 'Burnside carbine', 1856, 'United States', '.54 Burnside', { wt: 3.3 });
w('sharps1859', 'smithcarbine', 'Smith carbine', 1857, 'United States', '.50 Smith', { wt: 3.4 });
w('win1873', 'win1876', 'Winchester Model 1876 “Centennial”', 1876, 'United States', '.45-75 WCF', { mag: 12, wt: 4.3 });
w('win1873', 'win1886', 'Winchester Model 1886', 1886, 'United States', '.45-90', { mag: 8, wt: 4.1 });
w('win1873', 'marlin1881', 'Marlin Model 1881', 1881, 'United States', '.45-70', { mag: 9, wt: 4.5 });
w('win1873', 'evans', 'Evans repeating rifle', 1873, 'United States', '.44 Evans', { mag: 34, wt: 4.3 });

C = 'CAN';
gun('culverin', 'saker', 'Saker', 1550, 'England', '6-pdr ball', 95, 2.9, 450, 700, 1100);
gun('culverin', 'demiculverin', 'Demi-culverin', 1560, 'England', '9-pdr ball', 110, 3.2, 450, 900, 1500);
gun('falconet', 'robinet', 'Robinet', 1520, 'England', '1-pdr ball', 40, 1.1, 360, 240, 100);
gun('minion', 'perrier', 'Perrier (stone thrower)', 1500, 'France', 'Stone shot', 200, 1.4, 260, 1400, 900, { acc: 45 });
gun('culverin', 'basilisk', 'Basilisk', 1540, 'Ottoman Empire', '32-pdr ball', 160, 4.3, 460, 1700, 4000, { acc: 30 });
gun('sixpdr', 'gribeauval8', 'Gribeauval 8-pounder', 1765, 'France', '8-pdr ball', 106, 2.0, 450, 800, 580);
gun('napoleon', 'gribeauval12', 'Gribeauval 12-pounder', 1765, 'France', '12-pdr ball', 121, 2.3, 450, 900, 880);
gun('napoleon', 'licorne', 'Licorne (Unicorn) howitzer', 1757, 'Russian Empire', '12-pdr ball', 120, 1.6, 360, 800, 600, { he: { r: 7, dmg: 220 } });
gun('napoleon', 'mtnhowitzer', '12-pounder Mountain Howitzer M1841', 1841, 'United States', '12-pdr ball', 117, .83, 300, 700, 100, { he: { r: 6, dmg: 200 }, m: { wheel: .45 } });
gun('dahlgren', 'rodman15', 'Rodman 15-inch gun', 1861, 'United States', '15-inch shell', 381, 4.6, 450, 2600, 22000, { he: { r: 14, dmg: 600 } });
gun('parrott', 'blakely', 'Blakely rifle', 1861, 'United Kingdom', '3-inch rifled shell', 89, 1.7, 370, 480, 360);
gun('dahlgren', 'brooke', 'Brooke rifle', 1861, 'Confederate States', '6.4-inch rifled shell', 163, 3.6, 400, 1300, 4900, { he: { r: 9, dmg: 280 } });
gun('mortar13', 'dictator', '“Dictator” 13-inch railway mortar', 1862, 'United States', '13-inch shell', 330, 1.0, 180, 900, 7800, { he: { r: 14, dmg: 520 } });
gun('coehorn', 'handmortar', 'Grenade hand mortar', 1700, 'Great Britain', '1-pdr ball', 55, .25, 70, 200, 6, { he: { r: 4, dmg: 140 }, emplaced: false });
w('gatling1862', 'agar', 'Agar “Coffee Mill” gun', 1861, 'United States', '.58 Minié', { rpm: 120, mag: 20, m: { nb: 1 } });
w('gatling1862', 'requa', 'Requa battery', 1862, 'United States', '.58 Minié', { rpm: 175, mag: 25, salvo: 25, m: { nb: 25 }, rl: [8, 8] });
w('gatling1874', 'nordenfelt', 'Nordenfelt gun (5-barrel)', 1873, 'Sweden', '.577/450 Martini', { rpm: 600, mag: 50, m: { nb: 5 } });
w('gatling1874', 'gardner', 'Gardner gun', 1874, 'United States', '.577/450 Martini', { rpm: 220, mag: 30, m: { nb: 2 } });
w('gatling1874', 'hotchkissrev', 'Hotchkiss revolving cannon', 1879, 'France', '37mm', { rpm: 60, mag: 10, dmg: 220, he: { r: 2, dmg: 60 }, wt: 470, m: { nb: 5, L: 1.3 } });
w('gatling1862', 'reffye', 'Reffye mitrailleuse', 1866, 'France', '13mm Reffye', { rpm: 150, mag: 25, salvo: 5, m: { nb: 25 } });

// ============================================================================ Artillery
E = 'artillery';
C = 'AAG';
gun('flak38', 'flak30', '2 cm Flak 30', 1935, 'Germany', '20mm Flak', 20, 1.3, 900, 70, 450, { act: 'auto', modes: ['auto', 'semi'], rpm: 280, mag: 20, he: { r: 1.5, dmg: 60 } });
gun('bofors40', 'flak37', '3.7 cm Flak 37', 1937, 'Germany', '37mm', 37, 2.1, 820, 130, 1550, { act: 'auto', modes: ['auto', 'semi'], rpm: 160, mag: 6, he: { r: 3, dmg: 100 }, m: { mt: 'grey' } });
gun('bofors40', 'flak43', '3.7 cm Flak 43', 1943, 'Germany', '37mm', 37, 2.1, 840, 130, 1250, { act: 'auto', modes: ['auto', 'semi'], rpm: 250, mag: 8, he: { r: 3, dmg: 100 }, m: { mt: 'grey' } });
gun('flak88', 'flak41', '8.8 cm Flak 41', 1941, 'Germany', '88mm', 88, 6.5, 1000, 520, 11200, { rpm: 22, he: { r: 15, dmg: 480 } });
gun('flak88', 'flak40', '12.8 cm Flak 40', 1942, 'Germany', '128mm', 128, 7.8, 880, 700, 26000, { rpm: 12, he: { r: 20, dmg: 640 } });
gun('bofors40', 'k61', '37 mm 61-K', 1939, 'Soviet Union', '37mm', 37, 2.5, 880, 130, 2100, { act: 'auto', modes: ['auto', 'semi'], rpm: 170, mag: 5, he: { r: 3, dmg: 100 } });
gun('flak88', 'k52', '85 mm 52-K', 1939, 'Soviet Union', '85mm', 85, 4.7, 800, 460, 4300, { rpm: 15, he: { r: 14, dmg: 440 } });
gun('flak88', 'qf37in', 'QF 3.7-inch AA gun', 1937, 'United Kingdom', '94mm', 94, 4.7, 790, 480, 9300, { rpm: 20, he: { r: 15, dmg: 460 } });
gun('flak88', 'm1_90', '90 mm Gun M1', 1940, 'United States', '90mm', 90, 4.5, 823, 470, 8600, { rpm: 22, he: { r: 15, dmg: 450 } });
gun('flak88', 'type88aa', 'Type 88 75 mm AA gun', 1928, 'Empire of Japan', '75mm', 75, 3.2, 720, 300, 2440, { rpm: 15, he: { r: 12, dmg: 280 } });
gun('zu23', 'gdf', 'Oerlikon GDF twin 35 mm', 1959, 'Switzerland', '35mm', 35, 3.15, 1175, 140, 6700, { act: 'auto', modes: ['auto'], rpm: 1100, mag: 112, he: { r: 3, dmg: 110 } });
gun('flakvierling', 'zpu4', 'ZPU-4', 1949, 'Soviet Union', '14.5×114mm', 14.5, 1.35, 1000, 60, 1810, { act: 'auto', modes: ['auto'], rpm: 2400, mag: 600, he: null });
gun('bofors40', 's60', '57 mm S-60', 1950, 'Soviet Union', '57mm', 57, 4.4, 1000, 210, 4660, { act: 'auto', modes: ['auto', 'semi'], rpm: 105, mag: 4, he: { r: 5, dmg: 170 } });
gun('flakvierling', 'm45quad', 'M45 Quadmount', 1943, 'United States', '.50 BMG', 12.7, 1.14, 890, 55, 1090, { act: 'auto', modes: ['auto'], rpm: 2300, mag: 800, he: null });
gun('bofors40', 'bofors70', 'Bofors 40 mm L/70', 1951, 'Sweden', '40mm Bofors', 40, 2.8, 1005, 160, 5150, { act: 'auto', modes: ['auto', 'semi'], rpm: 240, mag: 8, he: { r: 4, dmg: 130 } });
gun('zu23', 'type96aa', 'Type 96 twin 25 mm', 1936, 'Empire of Japan', '25mm', 25, 1.5, 900, 80, 1100, { act: 'auto', modes: ['auto'], rpm: 440, mag: 30, he: { r: 2, dmg: 70 } });
gun('flak38', 'm167', 'M167 VADS', 1967, 'United States', '20×102mm', 20, 1.5, 1030, 75, 1570, { act: 'auto', modes: ['auto'], rpm: 3000, mag: 500, spin: .4, he: { r: 1, dmg: 40 } });

C = 'ART';
gun('qf25', 'qf45how', 'QF 4.5-inch howitzer', 1908, 'United Kingdom', '114mm', 114, 1.78, 308, 340, 1365, { m: { spoked: true, wheel: .7, brake: false } });
gun('qf25', 'bl60pdr', 'BL 60-pounder', 1905, 'United Kingdom', '127mm', 127, 4.4, 634, 380, 4470, { m: { spoked: true, wheel: .75, brake: false } });
gun('m1897_75', 'fk96', '7.7 cm FK 96 n.A.', 1896, 'German Empire', '77mm', 77, 2.1, 465, 260, 1020);
gun('m114', 'schneider155', 'Schneider 155 C Mle 1917', 1917, 'France', '155mm', 155, 2.3, 450, 460, 3300, { m: { spoked: true, wheel: .7 } });
gun('m1897_75', 'putilov', '76 mm divisional gun M1902', 1902, 'Russian Empire', '76.2mm', 76.2, 2.3, 588, 260, 1092);
gun('m114', 'bl55', 'BL 5.5-inch medium gun', 1941, 'United Kingdom', '140mm', 140, 4.2, 510, 420, 5850);
gun('lefh18', 'sfh18', '15 cm sFH 18', 1934, 'Germany', '150mm', 150, 4.4, 520, 450, 5512);
gun('ml20', 'm30', '122 mm howitzer M-30', 1938, 'Soviet Union', '122mm', 122, 2.8, 515, 380, 2450);
gun('ml20', 'd1', '152 mm howitzer D-1', 1943, 'Soviet Union', '152mm', 152, 4.2, 508, 450, 3600);
gun('ml20', 'a19', '122 mm gun A-19', 1936, 'Soviet Union', '122mm', 122, 5.6, 800, 400, 7100);
gun('lefh18', 'type91how', 'Type 91 105 mm howitzer', 1931, 'Empire of Japan', '105mm', 105, 2.5, 545, 330, 1500);
gun('m101', 'packhow', '75 mm Pack Howitzer M1', 1927, 'United States', '75mm', 75, 1.4, 381, 260, 653, { m: { wheel: .4, shield: false } });
gun('l118', 'mod56', 'OTO Melara Mod 56', 1957, 'Italy', '105mm', 105, 1.5, 416, 320, 1290, { m: { shield: true } });
gun('l118', 'm119', 'M119 105 mm howitzer', 1989, 'United States', '105mm', 105, 3.17, 709, 340, 2090);
gun('m198', 'giatsint', '152 mm 2A36 Giatsint-B', 1976, 'Soviet Union', '152mm', 152, 8.2, 945, 470, 9800);
gun('m198', 'g5', 'Denel G5', 1982, 'South Africa', '155mm', 155, 6.98, 897, 480, 13750);
gun('m198', 'm46', '130 mm towed field gun M-46', 1951, 'Soviet Union', '130mm', 130, 7.6, 930, 420, 7700);
gun('m198', 'fh77', 'Bofors FH77', 1975, 'Sweden', '155mm', 155, 5.9, 774, 470, 11500);

C = 'ATG';
gun('pak40', 'pak38', '5 cm Pak 38', 1940, 'Germany', '50mm', 50, 3.0, 835, 360, 1000, { m: { mt: 'grey' } });
gun('pak40', 'pak9738', '7.5 cm Pak 97/38', 1942, 'Germany', '75mm', 75, 2.7, 570, 440, 1190);
gun('pak36', 'spzb41', '2.8 cm sPzB 41 (squeeze bore)', 1941, 'Germany', '28mm squeeze', 28, 1.7, 1400, 220, 229, { m: { wheel: .3 } });
gun('pak36', 'k53', '45 mm anti-tank gun M1937 (53-K)', 1937, 'Soviet Union', '45mm', 45, 2.1, 760, 280, 560);
gun('pak40', 'zis2', '57 mm ZiS-2', 1941, 'Soviet Union', '57mm', 57, 4.16, 990, 450, 1250);
gun('mt12', 'bs3', '100 mm BS-3', 1944, 'Soviet Union', '100mm', 100, 6.0, 900, 850, 3650);
gun('pak36', 'type1_47', 'Type 1 47 mm anti-tank gun', 1942, 'Empire of Japan', '47mm', 47, 2.5, 830, 300, 800);
gun('pak36', 'sa37', 'Canon de 47 SA Mle 1937', 1937, 'France', '47mm', 47, 2.5, 855, 310, 1050);
gun('pak36', 'c4732', 'Cannone da 47/32', 1935, 'Italy', '47mm', 47, 1.7, 630, 260, 277);
gun('pak36', 'hotchkiss25', 'Hotchkiss 25 mm anti-tank gun', 1934, 'France', '25mm', 25, 1.8, 918, 200, 475);
gun('mt12', 'd44', '85 mm D-44', 1946, 'Soviet Union', '85mm', 85, 4.7, 793, 640, 1725);
gun('mt12', 'sprutb', '125 mm 2A45M Sprut-B', 1989, 'Soviet Union', '125mm', 125, 6.0, 1700, 1200, 6575);
gun('pak43', 'pak44', '12.8 cm Pak 44', 1944, 'Germany', '128mm', 128, 7.0, 920, 1100, 10160);
gun('pak40', 'pak41', '7.5 cm Pak 41 (squeeze bore)', 1941, 'Germany', '75mm', 75, 4.3, 1230, 640, 1356);

C = 'HVY';
gun('m115', 'mrs18', '21 cm Mörser 18', 1939, 'Germany', '210mm', 210, 6.5, 565, 900, 16700, { m: { mt: 'grey' } });
gun('m115', 'kanone3', '24 cm Kanone 3', 1938, 'Germany', '240mm', 240, 13.1, 970, 1000, 54000, { m: { mt: 'grey' } });
gun('skoda305', 'gamma', '42 cm Gamma-Mörser', 1911, 'German Empire', '420mm', 420, 6.7, 452, 2500, 140000);
gun('k5', 'langemax', '38 cm SK L/45 “Lange Max”', 1917, 'German Empire', '380mm', 380, 17.1, 800, 2000, 267000);
gun('bl18rail', 'bl12rail', 'BL 12-inch railway howitzer', 1916, 'United Kingdom', '305mm', 305, 5.7, 450, 1600, 77000);
gun('k5', 'us14rail', '14-inch/50 railway gun', 1918, 'United States', '356mm', 356, 17.8, 860, 1900, 243000);
gun('bl18rail', 'obusier520', 'Obusier de 520 modèle 1916', 1916, 'France', '520mm', 520, 15.5, 500, 3200, 263000);
gun('bl18rail', 'obusier400', 'Obusier de 400 Mle 1915/16', 1915, 'France', '400mm', 400, 10.6, 530, 2400, 137000);
gun('gustav', 'dora', '80 cm “Dora”', 1943, 'Germany', '800mm', 800, 32.5, 820, 6000, 1350000);
gun('karl', 'oka', '2B1 Oka 420 mm', 1957, 'Soviet Union', '420mm', 420, 20, 640, 2600, 55300, { m: { breechLoad: true } });
gun('b4', 'kondensator', '2A3 Kondensator 406 mm', 1957, 'Soviet Union', '406mm', 406, 20, 720, 2600, 64000);
gun('m115', 'm1_240', '240 mm howitzer M1 “Black Dragon”', 1943, 'United States', '240mm', 240, 8.4, 700, 1100, 29300);
gun('skoda305', 'br5', '280 mm mortar Br-5', 1939, 'Soviet Union', '280mm', 280, 3.4, 356, 1300, 18400);
gun('littledavid', 'mallet', 'Mallet’s Mortar', 1857, 'United Kingdom', '914mm Mallet', 914, 3.2, 230, 3800, 42000);
gun('k5', 'tm1180', 'TM-1-180 railway gun', 1932, 'Soviet Union', '180mm', 180, 10.5, 920, 800, 160000);

C = 'MOR';
gun('m2_60', 'legrw36', '5 cm leichter Granatwerfer 36', 1936, 'Germany', '50mm mortar', 50, .47, 75, 80, 14, { m: { mt: 'grey' } });
gun('m2_60', 'type89knee', 'Type 89 grenade discharger', 1929, 'Empire of Japan', '50mm grenade', 50, .25, 60, 70, 4.7, { emplaced: false });
gun('m2_60', 'twoinch', 'Ordnance SBML 2-inch mortar', 1938, 'United Kingdom', '51mm mortar', 51, .5, 80, 70, 4.8, { emplaced: false });
gun('m1_81', 'ml3in', 'Ordnance ML 3-inch mortar', 1936, 'United Kingdom', '81mm mortar', 81, 1.3, 198, 130, 57);
gun('m1_81', 'bm37', '82-BM-37', 1937, 'Soviet Union', '82mm mortar', 82, 1.22, 211, 130, 56);
gun('m2_60', 'brixia', 'Brixia Model 35', 1935, 'Italy', '45mm mortar', 45, .26, 83, 60, 15.5);
gun('pm38', 'grw42', '12 cm Granatwerfer 42', 1943, 'Germany', '120mm mortar', 120, 1.86, 283, 200, 280);
gun('pm38', 'm1943_160', '160 mm mortar M1943', 1943, 'Soviet Union', '160mm mortar', 160, 3.0, 245, 300, 1170, { reloadKind: 'breech', m: { breechLoad: true } });
gun('m1_81', 'm29', 'M29 81 mm mortar', 1951, 'United States', '81mm mortar', 81, 1.3, 230, 135, 52);
gun('m252', 'l16', 'L16 81 mm mortar', 1965, 'United Kingdom', '81mm mortar', 81, 1.28, 250, 140, 35.3);
gun('m252', 'podnos', '2B14 Podnos', 1983, 'Soviet Union', '82mm mortar', 82, 1.22, 211, 130, 42);
gun('m252', 'vasilek', '2B9 Vasilek (automatic)', 1970, 'Soviet Union', '82mm mortar', 82, 1.75, 270, 130, 632, { act: 'auto', modes: ['auto', 'semi'], rpm: 170, mag: 4, rl: [4, 4], reloadKind: 'clip', loft: .45, m: { wheeled: true } });
gun('m224', 'hirtm6', 'Hirtenberger M6 commando mortar', 2000, 'Austria', '60mm mortar', 60, .65, 150, 100, 5.1, { emplaced: false });
gun('m2_42', 'm30_42', 'M30 4.2-inch mortar', 1951, 'United States', '107mm mortar', 107, 1.52, 293, 170, 305);
gun('m2_60', 'type63mor', 'Type 63 60 mm mortar', 1963, 'China', '60mm mortar', 60, .61, 160, 100, 12.3);

C = 'NAV';
gun('mk45', 'qf4mk5', 'QF 4-inch Mk V', 1914, 'United Kingdom', '102mm', 102, 4.6, 728, 320, 2200, { act: 'breech', modes: ['semi'], rpm: 14, mag: 1, reloadKind: 'breech' });
gun('mk45', 'mk8_45', '4.5-inch Mark 8', 1971, 'United Kingdom', '114mm', 114, 6.3, 870, 330, 26000, { rpm: 25, mag: 16 });
gun('mk45', 'mk12_538', '5-inch/38 Mark 12', 1934, 'United States', '127mm', 127, 4.8, 792, 350, 18000, { rpm: 15, mag: 10 });
gun('bl15', 'mk16_647', '6-inch/47 Mark 16', 1938, 'United States', '152mm', 152, 7.2, 812, 480, 45000, { nb: 3, m: { nb: 3 } });
gun('bl15', 'mk12_855', '8-inch/55 Mark 12', 1929, 'United States', '203mm', 203, 11.2, 853, 640, 30000, { m: { nb: 3 } });
gun('bl15', 'bl14mk7', 'BL 14-inch Mk VII', 1939, 'United Kingdom', '356mm', 356, 16.5, 757, 1900, 80000, { m: { nb: 4 } });
gun('bl15', 'skc34_38', '38 cm SK C/34 (Bismarck)', 1939, 'Germany', '380mm', 380, 19.6, 820, 2100, 111000, { m: { nb: 2, mt: 'grey' } });
gun('bl15', 'skc34_28', '28 cm SK C/34 (Scharnhorst)', 1938, 'Germany', '283mm', 283, 15.6, 890, 1300, 53000, { m: { nb: 3, mt: 'grey' } });
gun('phalanx', 'ak630', 'AK-630', 1976, 'Soviet Union', '30×165mm', 30, 1.6, 900, 110, 9100, { act: 'auto', modes: ['auto'], rpm: 5000, mag: 2000, spin: .5, rl: [14, 14], he: { r: 2, dmg: 70 } });
gun('mk45', 'ak130', 'AK-130', 1985, 'Soviet Union', '130mm', 130, 9.1, 850, 380, 98000, { rpm: 40, mag: 40, m: { nb: 2 } });
gun('phalanx', 'goalkeeper', 'Goalkeeper CIWS', 1979, 'Netherlands', '30×173mm', 30, 3.0, 1109, 110, 9900, { act: 'auto', modes: ['auto'], rpm: 4200, mag: 1190, spin: .5, rl: [14, 14], he: { r: 2, dmg: 70 } });
gun('oto76', 'bofors57', 'Bofors 57 mm Mk 3', 1995, 'Sweden', '57mm', 57, 3.9, 1035, 200, 7500, { act: 'auto', modes: ['auto', 'semi'], rpm: 220, mag: 120, he: { r: 6, dmg: 170 } });
gun('mk45', 'oto127', 'OTO Melara 127/64', 2012, 'Italy', '127mm', 127, 8.1, 905, 360, 29000, { rpm: 35, mag: 56 });
gun('oto76', 'pompom', 'QF 2-pounder “pom-pom” (octuple)', 1930, 'United Kingdom', '2-pdr AP', 40, 1.6, 610, 150, 16000, { act: 'auto', modes: ['auto'], rpm: 800, mag: 112, he: { r: 3, dmg: 90 }, m: { nb: 8 } });
gun('oto76', 'm3_50', '3-inch/50 Mark 22', 1945, 'United States', '76.2mm', 76.2, 3.8, 823, 230, 3700, { act: 'auto', modes: ['auto', 'semi'], rpm: 50, mag: 20 });
gun('phalanx', 'type1130', 'Type 1130 CIWS', 2013, 'China', '30×165mm', 30, 2.5, 1100, 110, 10000, { act: 'auto', modes: ['auto'], rpm: 10000, mag: 1280, spin: .6, rl: [14, 14], he: { r: 2, dmg: 70 } });
gun('bl15', 'mle1935', 'Canon de 380 mm Modèle 1935 (Richelieu)', 1940, 'France', '380mm', 380, 17.2, 830, 2100, 94000, { m: { nb: 4 } });
gun('bl15', 'p1907', '305 mm/52 Pattern 1907 (Gangut)', 1914, 'Russian Empire', '305mm', 305, 15.8, 762, 1600, 50700, { m: { nb: 3 } });

C = 'RCL';
gun('m40rcl', 'm18rcl', 'M18 57 mm recoilless rifle', 1945, 'United States', '57mm RCL', 57, 1.56, 365, 300, 20, { emplaced: false, m: { mount: 'shoulder' } });
gun('m40rcl', 'm20rcl', 'M20 75 mm recoilless rifle', 1945, 'United States', '75mm RCL', 75, 2.08, 300, 400, 52);
gun('carlgustaf', 'm67rcl', 'M67 90 mm recoilless rifle', 1959, 'United States', '90mm RCL', 90, 1.35, 213, 480, 17);
gun('m40rcl', 'spg9', 'SPG-9 Kopye', 1962, 'Soviet Union', '73mm', 73, 2.1, 435, 450, 47.5);
gun('m40rcl', 'b11', 'B-11 107 mm recoilless rifle', 1954, 'Soviet Union', '107mm RCL', 107, 3.4, 400, 580, 305, { m: { mount: 'wheels' } });
gun('carlgustaf', 'cgm2', 'Carl Gustaf M2', 1964, 'Sweden', '84mm', 84, 1.13, 240, 480, 14.2);
gun('carlgustaf', 'cgm3', 'Carl Gustaf M3', 1991, 'Sweden', '84mm', 84, 1.07, 255, 490, 10);
gun('m40rcl', 'type52rcl', 'Type 52 75 mm recoilless rifle', 1952, 'China', '75mm RCL', 75, 2.1, 300, 400, 85);
gun('m40rcl', 'wombat', 'L6 WOMBAT 120 mm', 1964, 'United Kingdom', '120mm RCL', 120, 3.9, 463, 700, 295, { m: { mount: 'wheels' } });
gun('m40rcl', 'mobat', 'L4 MOBAT 120 mm', 1959, 'United Kingdom', '120mm RCL', 120, 3.6, 465, 700, 740, { m: { mount: 'wheels' } });
gun('m40rcl', 'm27rcl', 'M27 105 mm recoilless rifle', 1951, 'United States', '105mm RCL', 105, 3.3, 381, 560, 165);
gun('m40rcl', 'lg40', '7.5 cm Leichtgeschütz 40', 1940, 'Germany', '75mm RCL', 75, 1.15, 350, 400, 145, { m: { mount: 'wheels', mt: 'grey' } });
gun('m40rcl', 'davisgun', 'Davis gun (aircraft)', 1914, 'United States', '2-pdr AP', 40, 1.8, 330, 280, 40, { m: { mount: 'tripod' } });
gun('m40rcl', 'paw600', '8 cm PAW 600', 1945, 'Germany', '8cm PAW', 81, 2.95, 520, 450, 640, { backblast: false, m: { mount: 'wheels', mt: 'grey' } });

// ------------------------------------------------------------------ housekeeping
// two inter-war SMGs inherited the MP 18's WW1 era in part 7
for (const id of ['mp34', 'mp35']) if (G.WEAPON[id]) G.WEAPON[id].e = 'ww2';
// every special-model newcomer gets the fields the attachment rules read
for (const w9 of W) if (w9.m && ['break', 'falling', 'musket', 'fpistol', 'cannon', 'mortar_old', 'gatling', 'puckle', 'hwacha', 'art'].includes(w9.m.t)) { w9.m.mag = w9.m.mag || ['int']; w9.m.x = w9.m.x || []; }
G.N_DATA9 = n9;
})();
