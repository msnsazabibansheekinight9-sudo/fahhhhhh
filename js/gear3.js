// ============================================================================
// IRONSIGHT — kit locker, part 3: another wide batch of real equipment (and a
// Police & SWAT category), plus more complete real-world kit presets. Every item
// uses the models, patterns and protection scales the rest of the kit uses.
// ============================================================================
'use strict';
(function () {
const G = window.G, GEAR = G.GEAR;
const have = new Set(GEAR.map(g => g.id));
const add = (slot, cat, list) => { for (const o of list) { if (have.has(o.id)) continue; have.add(o.id); const g = Object.assign({ slot, wt: 0, y: 2000, co: '—', d: '' }, cat ? { cat } : {}, o); GEAR.push(g); if (G.GEARID) G.GEARID[g.id] = g; } };
if (!G.KIT_CATS.some(c => c[0] === 'police')) G.KIT_CATS.splice(G.KIT_CATS.length - 2, 0, ['police', 'Police & SWAT']);

// ------------------------------------------------------------------ uniforms
add('uniform', null, [
  { id: 'u_ru_m1907', n: 'Russian M1907 gymnastyorka', co: 'Russian Empire', y: 1914, pat: ['solid', ['#7a7050']], wt: 2.1 },
  { id: 'u_ah_hechtgrau', n: 'Austro-Hungarian hechtgrau', co: 'Austria-Hungary', y: 1914, pat: ['solid', ['#7e8686']], wt: 2.2 },
  { id: 'u_it_grigioverde', n: 'Italian grigio-verde', co: 'Italy', y: 1915, pat: ['solid', ['#6e6e5a']], wt: 2.2 },
  { id: 'u_ot_khaki', n: 'Ottoman M1909 khaki', co: 'Ottoman Empire', y: 1914, pat: ['solid', ['#8a7650']], wt: 2.1 },
  { id: 'u_uk_bd', n: 'British 1937 battledress', co: 'United Kingdom', y: 1939, pat: ['solid', ['#6a5e3e']], wt: 2.1 },
  { id: 'u_uk_denison', n: 'Denison smock', co: 'United Kingdom', y: 1942, pat: ['brush', ['#a08a5e', '#5a5a3a', '#6e4a2e', '#3a3226']], wt: 1.9 },
  { id: 'u_jp_type98', n: 'Japanese Type 98 field uniform', co: 'Empire of Japan', y: 1938, pat: ['solid', ['#7a6a42']], wt: 1.8 },
  { id: 'u_de_sumpf', n: 'Sumpftarn (marsh pattern)', co: 'Germany', y: 1943, pat: ['splinter', ['#9a8a62', '#5e6a42', '#4a3e2e', '#2e2e22']], wt: 1.9 },
  { id: 'u_de_eichen', n: 'Eichenlaub (oak leaf) smock', co: 'Germany', y: 1942, pat: ['blob', ['#8a8a5a', '#4e5a32', '#6a5236', '#2e3020']], wt: 1.8 },
  { id: 'u_su_m43', n: 'Soviet M1943 gymnastyorka', co: 'Soviet Union', y: 1943, pat: ['solid', ['#6e6a48']], wt: 1.9 },
  { id: 'u_us_hbt', n: 'US M1942 HBT fatigues', co: 'United States', y: 1942, pat: ['solid', ['#5e6244']], wt: 1.6 },
  { id: 'u_fr_lizard', n: 'French TAP lizard', co: 'France', y: 1951, pat: ['stripe', ['#7a7a52', '#3e4a2e', '#5a4a32']], wt: 1.6 },
  { id: 'u_pt_lizard', n: 'Portuguese vertical lizard', co: 'Portugal', y: 1963, pat: ['stripe', ['#8a8a5e', '#4a5a36', '#5e4a30']], wt: 1.6 },
  { id: 'u_be_jigsaw', n: 'Belgian jigsaw', co: 'Belgium', y: 1956, pat: ['brush', ['#8a845a', '#4e5a36', '#6a4e34', '#2a2a20']], wt: 1.6 },
  { id: 'u_dd_strich', n: 'East German Strichtarn (rain pattern)', co: 'East Germany', y: 1965, pat: ['stripe', ['#7a7a6a', '#5a5e48', '#3a3e2e']], wt: 1.6 },
  { id: 'u_pl_moro', n: 'Polish wz. 68 Moro', co: 'Poland', y: 1968, pat: ['blob', ['#7a7a5a', '#4a5236', '#6a5a3e', '#2a2a22']], wt: 1.6 },
  { id: 'u_us_m65', n: 'US M-65 field jacket', co: 'United States', y: 1965, pat: ['solid', ['#5a5e3e']], wt: 1.8 },
  { id: 'u_za_nutria', n: 'South African nutria browns', co: 'South Africa', y: 1973, pat: ['solid', ['#7a6a4a']], wt: 1.5 },
  { id: 'u_no_m75', n: 'Norwegian M75 woodland', co: 'Norway', y: 1975, pat: ['brush', ['#6e7050', '#3e4a2e', '#5a4a30', '#1e2018']], wt: 1.6 },
  { id: 'u_gr_lizard', n: 'Greek Hellenic lizard', co: 'Greece', y: 1980, pat: ['stripe', ['#8a8a5a', '#4a5a36', '#6a5236', '#2a2a22']], wt: 1.5 },
  { id: 'u_ro_m93', n: 'Romanian M93 leaf', co: 'Romania', y: 1993, pat: ['brush', ['#7a7e52', '#4a5636', '#6a5636', '#2a2a22']], wt: 1.5 },
  { id: 'u_jp_type2', n: 'JGSDF Type II camouflage', co: 'Japan', y: 1991, pat: ['blob', ['#6e7a4e', '#3e4a2e', '#6a5236', '#2a2a22']], wt: 1.5 },
  { id: 'u_za_s2000', n: 'South African Soldier 2000', co: 'South Africa', y: 1995, pat: ['digital', ['#8a7e5a', '#5e5a3e', '#6e5a3e', '#3a3226']], wt: 1.5 },
  { id: 'u_cn_type99', n: 'PLA Type 99 woodland', co: 'China', y: 1999, pat: ['blob', ['#6e7a4e', '#3a4a2a', '#8a7a52', '#2a2a22']], wt: 1.5 },
  { id: 'u_lt_m05', n: 'Lithuanian M05 woodland', co: 'Lithuania', y: 2005, pat: ['digital', ['#6a7444', '#3e4a2a', '#5a4a32', '#1e1e18']], wt: 1.5 },
  { id: 'u_tr_digital', n: 'Turkish 2008 digital woodland', co: 'Turkey', y: 2008, pat: ['digital', ['#6e744c', '#4a5236', '#7a6a4a', '#2a2a22']], wt: 1.5 },
  { id: 'u_us_aor1', n: 'AOR1 desert digital', co: 'United States', y: 2010, pat: ['digital', ['#c8b48a', '#a08a62', '#7a6a4a', '#5a5040']], wt: 1.4 },
  { id: 'u_us_aor2', n: 'AOR2 woodland digital', co: 'United States', y: 2010, pat: ['digital', ['#5e6a44', '#3e4a2e', '#6e6044', '#2a2a22']], wt: 1.4 },
  { id: 'u_pencott', n: 'PenCott GreenZone', co: 'United Kingdom', y: 2011, pat: ['blob', ['#7a7a52', '#4e5a36', '#8a7a56', '#3a3226']], wt: 1.4 },
  { id: 'u_atacs_au', n: 'A-TACS AU (arid / urban)', co: 'United States', y: 2011, pat: ['blob', ['#a89a7a', '#7a6e58', '#5a5248', '#c8bca0']], wt: 1.4 },
  { id: 'u_ee_estdcu', n: 'Estonian ESTDCU', co: 'Estonia', y: 2012, pat: ['digital', ['#6e7a4e', '#3e4a2e', '#8a8a6a', '#2a2a22']], wt: 1.5 },
  { id: 'u_hu_15m', n: 'Hungarian 15M digital', co: 'Hungary', y: 2015, pat: ['digital', ['#7a7a52', '#4e5a36', '#6a5a3e', '#2a2a22']], wt: 1.5 },
  { id: 'u_nz_mcu', n: 'New Zealand MCU (multi-terrain)', co: 'New Zealand', y: 2020, pat: ['blob', ['#8a8460', '#5a6040', '#3e4a30', '#a89e7a']], wt: 1.4 },
  { id: 'u_ghillie_w', n: 'Ghillie suit (woodland)', co: 'Various', y: 1990, pat: ['brush', ['#5a6a3a', '#3e4a2a', '#6e5e3e', '#2a2e1e']], wt: 3.5, d: 'Burlap strips over a smock: almost invisible in grass and brush, hot and heavy.' },
  { id: 'u_ghillie_d', n: 'Ghillie suit (desert)', co: 'Various', y: 1995, pat: ['brush', ['#c0ac82', '#9a8660', '#7a6a4a', '#d8c8a0']], wt: 3.5, d: 'Sand-toned burlap strips.' },
  { id: 'u_overwhite_uk', n: 'Arctic snow overwhites', co: 'United Kingdom', y: 1980, pat: ['solid', ['#e4e6e2']], wt: 1.2, d: 'White cotton over-smock and trousers for snow.' },
  { id: 'u_ru_winter', n: 'Russian winter snow suit', co: 'Russia', y: 1995, pat: ['blob', ['#e8eae6', '#b8bcb6', '#d0d2cc']], wt: 1.4 },
]);
add('uniform', 'police', [
  { id: 'u_pol_patrol', n: 'Police patrol uniform (blue)', co: 'Police', y: 1970, pat: ['solid', ['#2a3a5a']], wt: 1.3 },
  { id: 'u_pol_navy', n: 'Police tactical navy', co: 'Police', y: 1990, pat: ['solid', ['#1e2a40']], wt: 1.4 },
  { id: 'u_pol_swat_od', n: 'SWAT olive drab BDU', co: 'Police', y: 1985, pat: ['solid', ['#4a4e36']], wt: 1.5 },
  { id: 'u_pol_urban', n: 'SWAT urban grey digital', co: 'Police', y: 2006, pat: ['digital', ['#6a6e70', '#4a4e52', '#8a8e90', '#2e3236']], wt: 1.4 },
  { id: 'u_pol_gign', n: 'GIGN dark blue coveralls', co: 'France', y: 1990, pat: ['solid', ['#1a2234']], wt: 1.4 },
  { id: 'u_pol_gsg9', n: 'GSG 9 green-grey coveralls', co: 'Germany', y: 1985, pat: ['solid', ['#3e443a']], wt: 1.4 },
]);

// ------------------------------------------------------------------ helmets and headwear
add('helmet', null, [
  { id: 'h_m1917', n: 'US M1917 helmet', co: 'United States', y: 1917, model: 'brodie', col: '#5a5a40', rating: 1.6, cut: 'high', wt: .9 },
  { id: 'h_it_adrian', n: 'Italian Adrian M15', co: 'Italy', y: 1915, model: 'adrian', col: '#5e604c', rating: 1.4, cut: 'high', wt: .77 },
  { id: 'h_ru_adrian', n: 'Russian M1916 Adrian', co: 'Russian Empire', y: 1916, model: 'adrian', col: '#5a5e48', rating: 1.4, cut: 'high', wt: .77 },
  { id: 'h_m18', n: 'Stahlhelm M18 (ear cut-outs)', co: 'German Empire', y: 1918, model: 'stahl16', col: '#55594c', rating: 1.9, cut: 'full', wt: 1.2 },
  { id: 'h_fr_m26', n: 'French Adrian M26', co: 'France', y: 1926, model: 'adrian', col: '#4c5446', rating: 1.5, cut: 'high', wt: .7 },
  { id: 'h_m40', n: 'Stahlhelm M40', co: 'Germany', y: 1940, model: 'm35', col: '#4c5046', rating: 2, cut: 'full', wt: 1.15 },
  { id: 'h_mk2', n: 'Brodie Mk II', co: 'United Kingdom', y: 1938, model: 'brodie', col: '#4d563b', rating: 1.8, cut: 'high', wt: .98 },
  { id: 'h_m1c', n: 'M1C paratrooper helmet', co: 'United States', y: 1944, model: 'm1', col: '#4b5234', rating: 2, cut: 'mid', wt: 1.36 },
  { id: 'h_ssh60', n: 'SSh-60', co: 'Soviet Union', y: 1960, model: 'ssh40', col: '#4f5a36', rating: 2, cut: 'mid', wt: 1.3 },
  { id: 'h_m56dd', n: 'East German M56 Stahlhelm', co: 'East Germany', y: 1956, model: 'm35', col: '#5a5e48', rating: 2, cut: 'full', wt: 1.2 },
  { id: 'h_sts81', n: 'STSh-81 "Sfera" titanium helmet', co: 'Soviet Union', y: 1981, model: 'altyn', col: '#4a5236', rating: 4, cut: 'full', wt: 3.1, visor: 3.4 },
  { id: 'h_m92', n: 'Bundeswehr Gefechtshelm M92', co: 'Germany', y: 1992, model: 'pasgt', col: '#4e5440', rating: 3.4, cut: 'full', wt: 1.4 },
  { id: 'h_spectra', n: 'French SPECTRA helmet', co: 'France', y: 1999, model: 'pasgt', col: '#4a5236', rating: 3.6, cut: 'full', wt: 1.4 },
  { id: 'h_mich2000', n: 'MICH TC-2000', co: 'United States', y: 2001, model: 'ach', col: '#5a5a4a', rating: 3.8, cut: 'mid', wt: 1.45 },
  { id: 'h_lwh', n: 'USMC Lightweight Helmet', co: 'United States', y: 2004, model: 'ach', col: '#8a7a58', rating: 3.8, cut: 'full', wt: 1.5 },
  { id: 'h_mich_hc', n: 'MICH high-cut (ACH HC)', co: 'United States', y: 2012, model: 'ach', col: '#5a5e48', rating: 4, cut: 'high', wt: 1.3 },
  { id: 'h_6b27', n: '6B27 combat helmet', co: 'Russia', y: 2004, model: '6b47', col: '#4a5236', rating: 3.6, cut: 'full', wt: 1.25 },
  { id: 'h_qgf11', n: 'QGF-11 aramid helmet', co: 'China', y: 2011, model: 'qgf03', col: '#4e5a36', rating: 3.8, cut: 'mid', wt: 1.4 },
  { id: 'h_fast_maritime', n: 'Ops-Core FAST Maritime', co: 'United States', y: 2015, model: 'fast', col: '#2a2a2a', rating: 1.8, cut: 'high', wt: .9, d: 'Non-ballistic carbon shell with flood-port vents for boarding and swimming.' },
  { id: 'h_fast_sf', n: 'Ops-Core FAST SF high-cut', co: 'United States', y: 2019, model: 'fast', col: '#8a7a58', rating: 4.2, cut: 'high', wt: 1.2 },
  { id: 'h_k_bump', n: 'Team Wendy EXFIL carbon bump', co: 'United States', y: 2016, model: 'fast', col: '#3a3d34', rating: 0, cut: 'high', wt: .6 },
  { id: 'h_slouch', n: 'Australian slouch hat', co: 'Australia', y: 1915, model: 'boonie', col: '#7a6a4a', rating: 0, cut: 'none', wt: .2 },
  { id: 'h_feldmutze', n: 'Feldmütze field cap', co: 'Germany', y: 1934, model: 'cap', col: 'uniform', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_garrison', n: 'Garrison cap', co: 'United States', y: 1940, model: 'cap', col: 'uniform', rating: 0, cut: 'none', wt: .08 },
  { id: 'h_ushanka', n: 'Ushanka fur hat', co: 'Soviet Union', y: 1940, model: 'beanie', col: '#4a4034', rating: 0, cut: 'none', wt: .35 },
  { id: 'h_beret_red', n: 'Paratrooper maroon beret', co: 'United Kingdom', y: 1942, model: 'beret', col: '#6a1a1a', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_beret_green', n: 'Commando green beret', co: 'United Kingdom', y: 1942, model: 'beret', col: '#2e4a2a', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_beret_black', n: 'Armoured corps black beret', co: 'Various', y: 1924, model: 'beret', col: '#1a1a1a', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_beret_sand', n: 'SAS sand beret', co: 'United Kingdom', y: 1957, model: 'beret', col: '#a89a7a', rating: 0, cut: 'none', wt: .1 },
]);
add('helmet', 'police', [
  { id: 'h_pol_riot', n: 'Police riot helmet with visor', co: 'Police', y: 1985, model: 'visor', col: '#1e2a40', rating: 1.6, cut: 'full', wt: 1.4, visor: 1.6, d: 'Impact shell and polycarbonate face shield against thrown objects; stops little else.' },
  { id: 'h_pol_pasgt', n: 'Police PASGT (navy)', co: 'Police', y: 1990, model: 'pasgt', col: '#1e2a40', rating: 3.4, cut: 'full', wt: 1.45 },
  { id: 'h_pol_hc', n: 'SWAT high-cut ballistic helmet', co: 'Police', y: 2012, model: 'fast', col: '#1a1a1a', rating: 4, cut: 'high', wt: 1.3 },
  { id: 'h_pol_ballcap', n: 'Police ball cap', co: 'Police', y: 1980, model: 'cap', col: '#1e2a40', rating: 0, cut: 'none', wt: .08 },
]);

// ------------------------------------------------------------------ eyes & face
add('face', null, [
  { id: 'f_dust', n: 'M1944 dust goggles', co: 'United States', y: 1942, model: 'goggles', eyes: 1, wt: .1 },
  { id: 'f_m17', n: 'M17 gas mask', co: 'United States', y: 1959, model: 'gp5', wt: .8 },
  { id: 'f_m40', n: 'M40 gas mask', co: 'United States', y: 1990, model: 'm50', wt: .75 },
  { id: 'f_gp7', n: 'GP-7 gas mask', co: 'Russia', y: 1985, model: 'gp5', wt: .7 },
  { id: 'f_gsr', n: 'GSR general service respirator', co: 'United Kingdom', y: 2011, model: 's10', wt: .6 },
  { id: 'f_sawfly', n: 'Revision Sawfly glasses', co: 'United States', y: 2006, model: 'glasses', eyes: 1, wt: .04 },
  { id: 'f_bal_nomex', n: 'Nomex balaclava', co: 'United States', y: 1975, model: 'balaclava', wt: .08 },
  { id: 'f_keffiyeh', n: 'Red-check keffiyeh (shemagh)', co: 'Middle East', y: 1950, model: 'shemagh', wt: .15 },
  { id: 'f_n95', n: 'N95 dust respirator', co: 'Various', y: 1995, model: 'resp', wt: .05 },
  { id: 'f_mesh', n: 'Steel mesh lower face mask', co: 'Various', y: 2008, model: 'skull', wt: .12 },
]);
add('face', 'police', [
  { id: 'f_pol_visor', n: 'Police ballistic face shield', co: 'Police', y: 2010, model: 'bvisor', eyes: 1, face: 3.6, wt: 1.1 },
  { id: 'f_pol_bal', n: 'SWAT black balaclava', co: 'Police', y: 1980, model: 'balaclava', wt: .08 },
]);

// ------------------------------------------------------------------ night vision
add('nvg', null, [
  { id: 'n_pnv57', n: 'PNV-57E driver goggles', co: 'Soviet Union', y: 1970, model: 'bino', nv: { q: .4, view: 'bino' }, wt: .9 },
  { id: 'n_pvs21', n: 'AN/PVS-21 low-profile goggles', co: 'United States', y: 2008, model: 'bino', nv: { q: .82, view: 'bino' }, wt: .68 },
  { id: 'n_pvs14w', n: 'AN/PVS-14 white phosphor', co: 'United States', y: 2014, model: 'mono', nv: { q: .8, view: 'mono', white: true }, wt: .4 },
  { id: 'n_jerryc', n: 'Jerry-C micro monocular', co: 'United States', y: 2016, model: 'mono', nv: { q: .72, view: 'mono' }, wt: .3 },
  { id: 'n_pn14k', n: 'PN-14K binocular', co: 'Russia', y: 2014, model: 'bino', nv: { q: .62, view: 'bino' }, wt: .55 },
  { id: 'n_coti', n: 'Fused thermal monocular (PVS-14 + COTI)', co: 'United States', y: 2017, model: 'mono', nv: { q: .86, view: 'mono', thermal: true }, wt: .55 },
]);

// ------------------------------------------------------------------ headsets
add('comms', null, [
  { id: 'c_comtac2', n: 'Peltor ComTac II', co: 'Sweden', y: 2005, model: 'comtac', col: '#3a4032', boom: true, wt: .43 },
  { id: 'c_sordin_blk', n: 'MSA Sordin (black, headband)', co: 'Sweden', y: 2008, model: 'sordin', col: '#1e1e1e', boom: false, wt: .35 },
  { id: 'c_tci3', n: 'TCI Liberator III', co: 'United States', y: 2014, model: 'liberator', col: '#7a6a4c', boom: true, wt: .45 },
  { id: 'c_silynx', n: 'Silynx Clarus in-ear', co: 'United States', y: 2016, model: 'inear', col: '#1a1a1a', boom: false, wt: .05 },
  { id: 'c_6m2', n: 'Russian 6M2-1 headset', co: 'Russia', y: 2014, model: 'sordin', col: '#3a3a34', boom: true, wt: .4 },
  { id: 'c_earplugs', n: 'Foam earplugs & PRR earpiece', co: 'Various', y: 2002, model: 'prr', col: '#2a2a26', boom: false, wt: .05 },
]);

// ------------------------------------------------------------------ body armour and load carriage
add('armor', null, [
  { id: 'a_adrian_plate', n: 'Adrian abdominal plate', co: 'France', y: 1915, model: 'steel', col: '#5a5e4a', soft: 0, cov: {}, plates: false, fixed: { rating: 2.4, front: true, back: false, deg: .1 }, wt: 1, d: 'A thin steel plate worn under the coat against shrapnel.' },
  { id: 'a_farina', n: 'Farina armour', co: 'Italy', y: 1915, model: 'steel', col: '#4e5444', soft: 0, cov: { neck: true }, plates: false, fixed: { rating: 3.6, front: true, back: false, deg: .04 }, wt: 9.5, d: 'Overlapping steel plates for wire-cutting teams.' },
  { id: 'a_dayfield', n: 'Dayfield body shield', co: 'United Kingdom', y: 1916, model: 'steel', col: '#5a5646', soft: 0, cov: {}, plates: false, fixed: { rating: 2.8, front: true, back: true, deg: .08 }, wt: 4, d: 'Steel plates sewn into a cloth waistcoat.' },
  { id: 'a_m1951', n: 'M1951 USMC armored vest', co: 'United States', y: 1951, model: 'flak', col: '#4b5638', soft: 1.8, cov: { neck: true }, plates: false, wt: 3.6 },
  { id: 'a_6b2', n: '6B2 body armour', co: 'Soviet Union', y: 1979, model: 'vest', col: '#4a5236', soft: 2.2, cov: { neck: true }, plates: false, fixed: { rating: 2.6, front: true, back: true, deg: .08 }, wt: 4.8 },
  { id: 'a_6b4', n: '6B4 titanium/ceramic vest', co: 'Soviet Union', y: 1984, model: 'vest', col: '#5a5e40', soft: 2.2, cov: { neck: true }, plates: false, fixed: { rating: 7.8, front: true, back: true, deg: .05 }, wt: 11, d: 'Ceramic plates front and back. Stops 7.62×39 but weighs 11 kg.' },
  { id: 'a_rba', n: 'Ranger Body Armor (RBA)', co: 'United States', y: 1991, model: 'vest', col: '#4b5638', soft: 3, cov: { neck: true }, plates: true, wt: 3.5 },
  { id: 'a_mtv', n: 'USMC Modular Tactical Vest', co: 'United States', y: 2006, model: 'iotv', col: '#8a7a58', soft: 4, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 6.5 },
  { id: 'a_ipc', n: 'USMC Improved Plate Carrier', co: 'United States', y: 2008, model: 'pc', col: '#8a7a58', soft: 4, cov: { sides: true }, plates: true, wt: 3.8 , spec: { base: 'carrier', panel: [.27, .33], cum: 'full', shoulders: 'pad', sides: true, molle: 6, load: ['magflap', 'magflap', 'magflap'], admin: true, side: ['ifak', 'frag'], back: 'molle', handle: true, belt: 'war' }},
  { id: 'a_fcpc', n: 'Ferro Concepts FCPC', co: 'United States', y: 2016, model: 'pcslick', col: '#4a5236', soft: 0, cov: {}, plates: true, wt: 1.2 , spec: { base: 'carrier', panel: [.25, .31], cum: 'elastic', shoulders: 'thin', placard: true, load: ['mag', 'mag', 'mag', 'radio'], back: 'zip', handle: true, belt: 'war' }},
  { id: 'a_spiritus', n: 'Spiritus Systems LV-119 slick', co: 'United States', y: 2018, model: 'pcslick', col: '#7a6a4a', soft: 0, cov: {}, plates: true, wt: 1.1 , spec: { base: 'carrier', panel: [.25, .31], cum: 'elastic', shoulders: 'thin', placard: true, load: ['mag', 'mag', 'mag'], back: 'zip', belt: 'war' }},
  { id: 'a_jpc2', n: 'Crye JPC 2.0', co: 'United States', y: 2016, model: 'pc', col: '#6a6a4c', soft: 0, cov: { sides: true }, plates: true, wt: 1.4 , spec: { base: 'carrier', panel: [.25, .31], cum: 'cage', shoulders: 'thin', kanga: true, load: ['mag', 'mag', 'mag'], admin: true, back: 'zip', handle: true, belt: 'war' }},
  { id: 'a_pico', n: 'Tyr Tactical PICO', co: 'United States', y: 2019, model: 'pc', col: '#5a5e46', soft: 1.4, cov: { sides: true }, plates: true, wt: 2.3 , spec: { base: 'carrier', panel: [.26, .32], cum: 'full', shoulders: 'pad', sides: true, kanga: true, load: ['mag', 'mag', 'mag'], side: ['radio', 'tq'], back: 'molle', handle: true, belt: 'war' }},
  { id: 'a_defender2', n: 'Russian Defender-2 armour', co: 'Russia', y: 2014, model: 'iotv', col: '#4a5236', soft: 2.3, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 6.2 },
  { id: 'a_corsar', n: 'Ukrainian Corsar M3c', co: 'Ukraine', y: 2015, model: 'iotv', col: '#5a5e40', soft: 2.2, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 6 },
  { id: 'a_type04cn', n: 'PLA Type 04 body armour', co: 'China', y: 2004, model: 'vest', col: '#4e5a36', soft: 2, cov: { neck: true }, plates: true, wt: 4 },
  { id: 'a_chicom', n: 'Chicom chest rig', co: 'China', y: 1960, model: 'rig', col: '#6a6a4c', soft: 0, cov: {}, plates: false, wt: .9 },
  { id: 'a_rhodesian', n: 'Rhodesian chest rig', co: 'Rhodesia', y: 1975, model: 'rig', col: '#5a5e40', soft: 0, cov: {}, plates: false, wt: 1 },
  { id: 'a_smersh', n: 'Smersh webbing chest rig', co: 'Russia', y: 1990, model: 'rig', col: '#4a5236', soft: 0, cov: {}, plates: false, wt: 1.1 },
  { id: 'a_m1910belt', n: 'M1910 cartridge belt', co: 'United States', y: 1910, model: 'belt', col: '#8b8058', soft: 0, cov: {}, plates: false, wt: 1 },
  { id: 'a_p37', n: 'British 37 pattern webbing belt', co: 'United Kingdom', y: 1937, model: 'belt', col: '#8a7a58', soft: 0, cov: {}, plates: false, wt: 1.2 },
  { id: 'a_p58', n: 'British 58 pattern webbing belt', co: 'United Kingdom', y: 1958, model: 'belt', col: '#4b5638', soft: 0, cov: {}, plates: false, wt: 1.3 },
]);
add('armor', 'police', [
  { id: 'a_pol_conceal', n: 'Police IIIA concealable vest', co: 'Police', y: 2000, model: 'vest', col: '#1e2a40', soft: 4, cov: {}, plates: false, wt: 2.2 },
  { id: 'a_pol_tac', n: 'SWAT tactical vest (IIIA + plates)', co: 'Police', y: 2005, model: 'iotv', col: '#1a1a1a', soft: 4, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 6 },
  { id: 'a_pol_carrier', n: 'Police patrol plate carrier', co: 'Police', y: 2015, model: 'pc', col: '#1e2a40', soft: 4, cov: { sides: true }, plates: true, wt: 2.6 , spec: { base: 'carrier', panel: [.27, .33], cum: 'full', shoulders: 'pad', sides: true, placard: true, load: ['mag', 'mag', 'radio'], side: ['ifak'], back: 'zip', handle: true, belt: 'war' }},
  { id: 'a_pol_riot', n: 'Riot control body armour', co: 'Police', y: 1990, model: 'flak', col: '#1a1a1a', soft: 1.6, cov: { neck: true, groin: true, shoulders: true }, plates: false, wt: 5, d: 'Hard shells over chest, shoulders and limbs against blunt impacts.' },
]);

// ------------------------------------------------------------------ plates
add('plates', null, [
  { id: 'p_6b23ins', n: '6B23 ceramic insert (Class 5)', co: 'Russia', y: 2000, rating: 14.5, deg: .15, wt: 3.3 },
  { id: 'p_granit4', n: 'Granit-4 (Br5)', co: 'Russia', y: 2015, rating: 15.5, deg: .14, wt: 3.6 },
  { id: 'p_ua_class6', n: 'Ukrainian Class 6 ceramic', co: 'Ukraine', y: 2017, rating: 15, deg: .16, wt: 3.4 },
  { id: 'p_type19ins', n: 'Type 19 ceramic insert', co: 'China', y: 2019, rating: 14.5, deg: .15, wt: 3.2 },
  { id: 'p_hybrid4', n: 'Level IV hybrid (UHMWPE / SiC)', co: 'United States', y: 2018, rating: 15, deg: .12, wt: 3, d: 'Silicon-carbide strike face on a polyethylene back: stops .30-06 AP at little more than a Level III weight.' },
  { id: 'p_shooters3p', n: 'Shooters-cut Level III+ PE', co: 'United States', y: 2016, rating: 9, deg: .1, wt: 1.6 },
  { id: 'p_ecbi', n: 'British ECBA ceramic (Osprey Mk 1)', co: 'United Kingdom', y: 2006, rating: 14.5, deg: .16, wt: 3.5 },
  { id: 'p_steel3p', n: 'AR500 Level III+ steel (coated)', co: 'United States', y: 2014, rating: 9.2, deg: .03, wt: 7.8 },
]);

// ------------------------------------------------------------------ gloves, boots, packs
add('gloves', null, [
  { id: 'g_leather_ww2', n: 'Brown leather service gloves', co: 'Various', y: 1940, col: '#4a3222', wt: .15 },
  { id: 'g_arctic', n: 'Arctic overmitts', co: 'Various', y: 1950, col: '#e0e2de', wt: .3 },
  { id: 'g_shooting', n: 'Fingerless shooting gloves', co: 'Various', y: 1990, col: '#2a2a28', wt: .08 },
  { id: 'g_nomex_tan', n: 'Nomex flight gloves (tan)', co: 'United States', y: 1975, col: '#a08a64', wt: .1 },
  { id: 'g_oriron', n: 'Outdoor Research Ironsight gloves', co: 'United States', y: 2013, col: '#7a6a4c', wt: .12 },
  { id: 'g_ratnik', n: 'Ratnik combat gloves', co: 'Russia', y: 2015, col: '#3a3d2e', wt: .14 },
  { id: 'g_kevlar', n: 'Kevlar cut-resistant gloves', co: 'Various', y: 2005, col: '#c8a840', wt: .12 },
]);
add('gloves', 'police', [
  { id: 'g_pol_search', n: 'Police search gloves', co: 'Police', y: 2000, col: '#161616', wt: .1 },
  { id: 'g_pol_hard', n: 'SWAT hard-knuckle gloves', co: 'Police', y: 2010, col: '#1a1a1a', wt: .14 },
]);
add('boots', null, [
  { id: 'b_brodequin', n: 'French brodequins & puttees', co: 'France', y: 1914, model: 'puttee', col: '#3a2a1c', wt: 2 },
  { id: 'b_m43', n: 'M1943 double-buckle combat boots', co: 'United States', y: 1943, model: 'jack', col: '#3a2a1c', wt: 2.2 },
  { id: 'b_jungle_panama', n: 'Panama-sole jungle boots', co: 'United States', y: 1968, model: 'modern', col: '#2a2a28', wt: 1.6 },
  { id: 'b_desertrough', n: 'Rough-out desert boots', co: 'United Kingdom', y: 1985, model: 'modern', col: '#a08a64', wt: 1.7 },
  { id: 'b_belleville', n: 'Belleville 790', co: 'United States', y: 2006, model: 'modern', col: '#a08a64', wt: 1.8 },
  { id: 'b_garmont', n: 'Garmont T8 Bifida', co: 'Italy', y: 2014, model: 'modern', col: '#8a7a5a', wt: 1.3 },
  { id: 'b_meindl', n: 'Meindl Desert Fox', co: 'Germany', y: 2008, model: 'modern', col: '#9a8460', wt: 1.6 },
  { id: 'b_mountain', n: 'Mountain boots', co: 'Various', y: 1990, model: 'modern', col: '#4a3222', wt: 2.2 },
  { id: 'b_mukluk', n: 'Arctic mukluks', co: 'Canada', y: 1950, model: 'modern', col: '#e0ddd5', wt: 1.8 },
  { id: 'b_ratnik', n: 'Ratnik combat boots', co: 'Russia', y: 2013, model: 'modern', col: '#1a1614', wt: 1.7 },
]);
add('boots', 'police', [
  { id: 'b_pol_duty', n: 'Police duty boots', co: 'Police', y: 1990, model: 'modern', col: '#141414', wt: 1.5 },
]);
add('pack', null, [
  { id: 'k_m1910', n: 'US M1910 haversack', co: 'United States', y: 1910, model: 'haversack', col: '#8b8058', wt: 3 },
  { id: 'k_p37pack', n: 'British 37 pattern haversack', co: 'United Kingdom', y: 1937, model: 'haversack', col: '#8a7a58', wt: 2.8 },
  { id: 'k_ilbe', n: 'USMC ILBE rucksack', co: 'United States', y: 2004, model: 'ruck', col: '#8a7a58', wt: 9 },
  { id: 'k_3day', n: '3 day assault pack', co: 'United States', y: 2008, model: 'assault', col: '#6a6a4c', wt: 2.4 },
  { id: 'k_prc77', n: 'AN/PRC-77 radio pack', co: 'United States', y: 1968, model: 'radio', col: '#4b5638', wt: 6 },
  { id: 'k_scr300', n: 'SCR-300 radio backpack', co: 'United States', y: 1943, model: 'radio', col: '#5a5e40', wt: 14.5 },
  { id: 'k_camelbak', n: 'CamelBak hydration carrier', co: 'United States', y: 1995, model: 'hydro', col: '#7a6a4c', wt: 1.5 },
  { id: 'k_sabre', n: 'Karrimor SF Sabre 45 bergen', co: 'United Kingdom', y: 1995, model: 'ruck', col: '#4b5638', wt: 7 },
]);
add('pack', 'police', [
  { id: 'k_pol_breach', n: 'Breacher pack (molle)', co: 'Police', y: 2008, model: 'assault', col: '#1a1a1a', wt: 4 },
]);

// ------------------------------------------------------------------ perks for the new names
{ const camo0 = G.camoEnv; G.camoEnv = g => { const s = g ? (g.id + ' ' + g.n).toLowerCase() : ''; if (/winter|overwhite|arctic/.test(s)) return 'snow'; if (/\bpol_|police|swat|gign|gsg 9/.test(s) && !/olive/.test(s)) return 'urban'; if (/ghillie/.test(s)) return /desert/.test(s) ? 'desert' : 'wood'; return camo0(g); }; }
{ const gp0 = G.gearProps; G.gearProps = g => { const R = gp0(g); if (!g) return R; const s = (g.id + ' ' + g.n).toLowerCase(), M = R.mods, p = (n, d, good = true) => R.perks.push([n, d, good]);
  if (g.slot === 'uniform' && /ghillie/.test(s)) { p('Ghillie', 'Very hard to spot at range, but hot and heavy.'); M.camo = (M.camo || 1) * .8; M.speed = (M.speed || 1) * .96; }
  if (g.slot === 'face' && /gas mask|respirator|gsr/.test(s) && !R.perks.some(x => x[0] === 'Respirator')) { p('Respirator', 'Fire and smoke barely affect you; lenses cut flashes slightly.'); M.burn = Math.min(M.burn || 1, .5); M.flash = .8; M.sway = 1.04; }
  if (g.slot === 'armor' && /chest rig/.test(s) && !R.perks.some(x => x[0] === 'Chest rig')) { R.perks = R.perks.filter(x => x[0] !== 'Load-bearing carrier'); p('Chest rig', 'Magazines right at your sternum: faster reloads.'); M.reload = .9; M.mags = 2; }
  if (g.slot === 'armor' && /webbing belt|cartridge belt/.test(s) && !M.mags) { p('Belt kit', 'A few more magazines on the belt.'); M.mags = 1; }
  if (g.slot === 'gloves' && /overmitt/.test(s)) { R.perks = []; p('Mittens', 'Warm but clumsy: slower reloads.', false); M.reload = 1.12; delete M.recoil; }
  if (g.slot === 'boots' && /double-buckle|brodequin/.test(s) && !M.noise) { p('Hobnailed / hard soles', 'Loud footsteps on hard floors.', false); M.noise = 1.18; M.speed = .985; }
  if (g.slot === 'pack' && /ilbe|bergen|rucksack/.test(s) && !M.exp) { p('Large rucksack', '3 more magazines and 2 more of each explosive. Heavy.'); M.mags = 3; M.exp = 2; }
  if (g.slot === 'pack' && /3 day|breacher/.test(s) && !M.exp) { p('Assault pack', '2 more magazines and 1 more of each explosive.'); M.mags = 2; M.exp = 1; }
  if (g.slot === 'pack' && /camelbak/.test(s) && !M.breath) { p('Water', 'Breath for steady aim recovers faster.'); M.breath = 1.4; }
  if (g.slot === 'pack' && /scr-300/.test(s) && !M.radio) { p('Long-range radio', 'Intercepts enemy contact calls: callers are marked.'); M.radio = 1; M.mags = 1; }
  return R; }; }

// ------------------------------------------------------------------ more real-world kits
G.KIT_PRESETS.push(
  { id: 'ww1uk', n: 'British Tommy, Somme 1916', kit: { uniform: 'u_uk_serge', helmet: 'h_brodie', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_dayfield', plates: 'p_none', gloves: 'g_none', boots: 'b_puttee', pack: 'k_haversack' } },
  { id: 'ww1fr', n: 'French poilu, Verdun 1916', kit: { uniform: 'u_fr_horizon', helmet: 'h_adrian', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_adrian_plate', plates: 'p_none', gloves: 'g_none', boots: 'b_brodequin', pack: 'k_haversack' } },
  { id: 'ww1us', n: 'American doughboy, 1918', kit: { uniform: 'u_us_m1910', helmet: 'h_m1917', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_m1910belt', plates: 'p_none', gloves: 'g_none', boots: 'b_puttee', pack: 'k_m1910' } },
  { id: 'ww1it', n: 'Italian Arditi, Isonzo 1917', kit: { uniform: 'u_it_grigioverde', helmet: 'h_it_adrian', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_farina', plates: 'p_none', gloves: 'g_leather', boots: 'b_puttee', pack: 'k_none' } },
  { id: 'ww1ru', n: 'Russian infantryman, 1916', kit: { uniform: 'u_ru_m1907', helmet: 'h_ru_adrian', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_jack', pack: 'k_sidor' } },
  { id: 'ww2uk', n: 'British paratrooper, Arnhem 1944', kit: { uniform: 'u_uk_denison', helmet: 'h_mk2', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_p37', plates: 'p_none', gloves: 'g_none', boots: 'b_puttee', pack: 'k_p37pack' } },
  { id: 'ww2de', n: 'Waffen grenadier, 1944', kit: { uniform: 'u_de_erbsen', helmet: 'h_m40', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_y_straps', plates: 'p_none', gloves: 'g_none', boots: 'b_jack', pack: 'k_tornister' } },
  { id: 'ww2su', n: 'Soviet scout, 1943', kit: { uniform: 'u_su_amoeba', helmet: 'h_ssh40', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_sn42', plates: 'p_none', gloves: 'g_none', boots: 'b_kirza', pack: 'k_sidor' } },
  { id: 'ww2jp', n: 'Japanese infantryman, 1942', kit: { uniform: 'u_jp_type98', helmet: 'h_type90j', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_puttee', pack: 'k_none' } },
  { id: 'ww2usmc', n: 'US Marine, Pacific 1944', kit: { uniform: 'u_us_frogskin', helmet: 'h_m1', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_m1928', plates: 'p_none', gloves: 'g_none', boots: 'b_legging', pack: 'k_haversack' } },
  { id: 'ww2winter', n: 'Finnish ski trooper, Winter War 1940', kit: { uniform: 'u_snow', helmet: 'h_ushanka', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_wool', boots: 'b_mukluk', pack: 'k_sidor' } },
  { id: 'ww2radio', n: 'US radioman, Normandy 1944', kit: { uniform: 'u_us_m43', helmet: 'h_m1', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_m1928', plates: 'p_none', gloves: 'g_none', boots: 'b_m43', pack: 'k_scr300' } },
  { id: 'algeria', n: 'French paratrooper, Algeria 1957', kit: { uniform: 'u_fr_lizard', helmet: 'h_beret_red', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' } },
  { id: 'rhodesia', n: 'Rhodesian Light Infantry, 1977', kit: { uniform: 'u_rh_brush', helmet: 'h_cap', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_rhodesian', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_none' } },
  { id: 'nva', n: 'NVA soldier, 1968', kit: { uniform: 'u_us_og107', helmet: 'h_boonie', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_chicom', plates: 'p_none', gloves: 'g_none', boots: 'b_jungle', pack: 'k_none' } },
  { id: 'macv', n: 'MACV-SOG recon, 1969', kit: { uniform: 'u_tiger', helmet: 'h_headwrap', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_type56', plates: 'p_none', gloves: 'g_none', boots: 'b_jungle_panama', pack: 'k_prc77' } },
  { id: 'falklands', n: 'Royal Marine, Falklands 1982', kit: { uniform: 'u_uk_dpm', helmet: 'h_beret_green', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_p58', plates: 'p_none', gloves: 'g_wool', boots: 'b_combat', pack: 'k_bergen' } },
  { id: 'dd1985', n: 'East German NVA motor rifleman, 1985', kit: { uniform: 'u_dd_strich', helmet: 'h_m56dd', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_none', plates: 'p_none', gloves: 'g_none', boots: 'b_jack', pack: 'k_assault' } },
  { id: 'sadf', n: 'SADF paratrooper, Angola 1985', kit: { uniform: 'u_za_nutria', helmet: 'h_cap', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_rhodesian', plates: 'p_none', gloves: 'g_none', boots: 'b_combat', pack: 'k_assault' } },
  { id: 'gulf', n: 'US Army, Desert Storm 1991', kit: { uniform: 'u_us_dcu6', helmet: 'h_pasgt', face: 'f_goggles', nvg: 'n_pvs7', comms: 'c_none', armor: 'a_pasgt', plates: 'p_none', gloves: 'g_leather', boots: 'b_desert', pack: 'k_alice' } },
  { id: 'mogadishu', n: 'US Ranger, Mogadishu 1993', kit: { uniform: 'u_us_dcu3', helmet: 'h_pasgt', face: 'f_goggles', nvg: 'n_pvs7', comms: 'c_none', armor: 'a_rba', plates: 'p_sapi', gloves: 'g_nomex', boots: 'b_desert', pack: 'k_camelbak' } },
  { id: 'chechnya', n: 'Russian Spetsnaz, Chechnya 1995', kit: { uniform: 'u_ru_gorka', helmet: 'h_sts81', face: 'f_balaclava', nvg: 'n_none', comms: 'c_none', armor: 'a_6b4', plates: 'p_none', gloves: 'g_shooting', boots: 'b_kirza', pack: 'k_rd54' } },
  { id: 'kosovo', n: 'KFOR peacekeeper, 1999', kit: { uniform: 'u_de_fleck', helmet: 'h_m92', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_pasgt', plates: 'p_none', gloves: 'g_black', boots: 'b_combat', pack: 'k_assault' } },
  { id: 'iraq2004', n: 'USMC, Fallujah 2004', kit: { uniform: 'u_us_marpat_d', helmet: 'h_lwh', face: 'f_goggles', nvg: 'n_pvs14', comms: 'c_none', armor: 'a_otv', plates: 'p_sapi', gloves: 'g_nomex_tan', boots: 'b_belleville', pack: 'k_ilbe' } },
  { id: 'sniper', n: 'Scout sniper (woodland ghillie)', kit: { uniform: 'u_ghillie_w', helmet: 'h_boonie', face: 'f_balaclava', nvg: 'n_pvs14', comms: 'c_prr', armor: 'a_battlebelt', plates: 'p_none', gloves: 'g_shooting', boots: 'b_lowa', pack: 'k_eberlestock' } },
  { id: 'sniperd', n: 'Desert sniper (ghillie)', kit: { uniform: 'u_ghillie_d', helmet: 'h_boonie', face: 'f_shemagh', nvg: 'n_pvs14', comms: 'c_prr', armor: 'a_battlebelt', plates: 'p_none', gloves: 'g_nomex_tan', boots: 'b_meindl', pack: 'k_eberlestock' } },
  { id: 'arctic', n: 'Arctic ranger', kit: { uniform: 'u_overwhite_uk', helmet: 'h_ushanka', face: 'f_goggles', nvg: 'n_pvs14', comms: 'c_sordin', armor: 'a_spc', plates: 'p_esapi', gloves: 'g_arctic', boots: 'b_mukluk', pack: 'k_sabre' } },
  { id: 'maritime', n: 'Maritime boarding team', kit: { uniform: 'u_mc_black', helmet: 'h_fast_maritime', face: 'f_glasses', nvg: 'n_pvs31', comms: 'c_silynx', armor: 'a_fcpc', plates: 'p_hybrid4', gloves: 'g_hatch', boots: 'b_garmont', pack: 'k_none' } },
  { id: 'nzdf', n: 'New Zealand infantry, 2021', kit: { uniform: 'u_nz_mcu', helmet: 'h_viper', face: 'f_glasses', nvg: 'n_pvs14', comms: 'c_comtac', armor: 'a_jpc2', plates: 'p_hybrid4', gloves: 'g_mechanix', boots: 'b_garmont', pack: 'k_assault' } },
  { id: 'estonia', n: 'Estonian Defence League, 2022', kit: { uniform: 'u_ee_estdcu', helmet: 'h_mich_hc', face: 'f_glasses', nvg: 'n_pvs14w', comms: 'c_sordin', armor: 'a_pico', plates: 'p_shooters3p', gloves: 'g_oriron', boots: 'b_lowa', pack: 'k_3day' } },
  { id: 'ua2024', n: 'Ukrainian drone-team assaulter, 2024', kit: { uniform: 'u_ua_mm14', helmet: 'h_fast_sf', face: 'f_wileyx', nvg: 'n_coti', comms: 'c_comtac6', armor: 'a_corsar', plates: 'p_ua_class6', gloves: 'g_pig', boots: 'b_garmont', pack: 'k_mystery' } },
  { id: 'ru2023', n: 'Russian assault infantry, 2023', kit: { uniform: 'u_ru_partizan', helmet: 'h_6b47', face: 'f_balaclava', nvg: 'n_pn14k', comms: 'c_6m2', armor: 'a_defender2', plates: 'p_granit4', gloves: 'g_ratnik', boots: 'b_ratnik', pack: 'k_rd54' } },
  { id: 'pla2022', n: 'PLA special forces, 2022', kit: { uniform: 'u_cn_type07', helmet: 'h_qgf11', face: 'f_glasses', nvg: 'n_pvs14', comms: 'c_comtac', armor: 'a_type19', plates: 'p_type19ins', gloves: 'g_black', boots: 'b_combat', pack: 'k_3day' } },
  { id: 'cbrn', n: 'CBRN recon team', kit: { uniform: 'u_us_ocp', helmet: 'h_ihps', face: 'f_m50', nvg: 'n_pvs14', comms: 'c_comtac', armor: 'a_msv', plates: 'p_esapi', gloves: 'g_nomex', boots: 'b_salomon', pack: 'k_radio' } },
  { id: 'polpatrol', n: 'Police patrol officer', kit: { uniform: 'u_pol_patrol', helmet: 'h_pol_ballcap', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_pol_conceal', plates: 'p_none', gloves: 'g_pol_search', boots: 'b_pol_duty', pack: 'k_none' } },
  { id: 'polswat', n: 'SWAT team, 1990s', kit: { uniform: 'u_pol_navy', helmet: 'h_pol_pasgt', face: 'f_goggles', nvg: 'n_none', comms: 'c_none', armor: 'a_pol_tac', plates: 'p_ceramic3', gloves: 'g_pol_hard', boots: 'b_pol_duty', pack: 'k_none' } },
  { id: 'polswat2', n: 'Modern SWAT entry team', kit: { uniform: 'u_pol_urban', helmet: 'h_pol_hc', face: 'f_pol_bal', nvg: 'n_pvs14', comms: 'c_liberator', armor: 'a_pol_carrier', plates: 'p_hybrid4', gloves: 'g_pol_hard', boots: 'b_pol_duty', pack: 'k_pol_breach' } },
  { id: 'riot', n: 'Riot police', kit: { uniform: 'u_pol_navy', helmet: 'h_pol_riot', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_pol_riot', plates: 'p_none', gloves: 'g_pol_hard', boots: 'b_pol_duty', pack: 'k_none' } },
  { id: 'gign', n: 'GIGN intervention, 1994', kit: { uniform: 'u_pol_gign', helmet: 'h_altyn', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_pol_tac', plates: 'p_titanium', gloves: 'g_black', boots: 'b_combat', pack: 'k_none' } },
  { id: 'gsg9', n: 'GSG 9, 1977', kit: { uniform: 'u_pol_gsg9', helmet: 'h_beret_black', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_pol_conceal', plates: 'p_none', gloves: 'g_black', boots: 'b_combat', pack: 'k_none' } },
);
// the kit locker only offers presets whose items all exist
G.KIT_PRESETS = G.KIT_PRESETS.filter(p => G.GEAR_SLOTS.every(([s]) => !p.kit[s] || GEAR.some(g => g.id === p.kit[s])));
// the saved kit was first read before parts 2 and 3 added their items: read it again now that every item exists
G.GEARID = Object.fromEntries(GEAR.map(g => [g.id, g]));
G.Kit.current = G.Kit.load();
G.N_GEAR3 = GEAR.length;
})();
