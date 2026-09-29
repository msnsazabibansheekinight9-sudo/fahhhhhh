// ============================================================================
// Personal equipment: every item a soldier wears, from WW1 to the 2030s, with
// real-world protection levels. Slots: uniform, helmet, face, nvg, armor,
// plates, gloves, boots, pack. G.armorHit() resolves a hit against the exact
// piece of kit it strikes (plate, soft armour, side plate, collar, groin,
// helmet shell, visor) using the same penetration capability (mm RHA-equivalent)
// that the vehicle ballistics use. Plates crack and lose rating with each hit.
//
// Ratings are capability thresholds (see G.penCapability):
//   frag 1.6 · IIA 2.2 · II 2.8 · IIIA 4 · III 7.8 · III+ 9.5 · IV/Br5 14.5–15 · XSAPI 18
// so a IIIA vest stops 9 mm but not 7.62×39, a Level III plate stops 7.62×51
// ball but not AP, and an ESAPI stops .30-06 AP but not .50 BMG.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const GEAR = G.GEAR = [];
const add = (slot, list) => { for (const o of list) GEAR.push(Object.assign({ slot, wt: 0, y: 2000, co: '—', d: '' }, o)); };
G.GEAR_SLOTS = [['uniform', 'Uniform / camouflage'], ['helmet', 'Helmet / headwear'], ['face', 'Eyes & face'], ['nvg', 'Night vision'], ['armor', 'Body armour / carrier'], ['plates', 'Armour plates'], ['gloves', 'Gloves'], ['boots', 'Boots'], ['pack', 'Pack']];

// ------------------------------------------------------------------ uniforms (pattern: solid colour or generated camouflage)
add('uniform', [
  { id: 'u_uk_serge', n: 'British 1902 khaki serge', co: 'United Kingdom', y: 1914, pat: ['solid', ['#7a6a45']], wt: 2.2 },
  { id: 'u_de_feldgrau', n: 'German M1915 feldgrau', co: 'German Empire', y: 1915, pat: ['solid', ['#6d7163']], wt: 2.2 },
  { id: 'u_fr_horizon', n: 'French horizon blue', co: 'France', y: 1915, pat: ['solid', ['#7d8ea0']], wt: 2.2 },
  { id: 'u_us_m1910', n: 'US M1910 wool OD', co: 'United States', y: 1917, pat: ['solid', ['#6a6040']], wt: 2.2 },
  { id: 'u_us_m43', n: 'US M1943 OD field uniform', co: 'United States', y: 1943, pat: ['solid', ['#5f5a3e']], wt: 2 },
  { id: 'u_de_splinter', n: 'Splittertarn smock', co: 'Germany', y: 1931, pat: ['splinter', ['#8a8a6a', '#5a6040', '#6e5a40', '#3a3a2a']], wt: 2 },
  { id: 'u_de_erbsen', n: 'Erbsenmuster (pea dot)', co: 'Germany', y: 1944, pat: ['dots', ['#a8946a', '#5a5a36', '#3e4a2e', '#6a4a30']], wt: 2 },
  { id: 'u_su_amoeba', n: 'Soviet "Amoeba" suit', co: 'Soviet Union', y: 1941, pat: ['blob', ['#8a9a60', '#4a5230', '#6a7648']], wt: 1.8 },
  { id: 'u_us_og107', n: 'US OG-107 utilities', co: 'United States', y: 1952, pat: ['solid', ['#4b5638']], wt: 1.6 },
  { id: 'u_tiger', n: 'Tigerstripe', co: 'South Vietnam / US', y: 1962, pat: ['stripe', ['#6e7a4a', '#26261c', '#4a5a36']], wt: 1.5 },
  { id: 'u_us_erdl', n: 'US ERDL', co: 'United States', y: 1967, pat: ['blob', ['#7a8a56', '#3e5a2e', '#5a4630', '#1e2018']], wt: 1.5 },
  { id: 'u_uk_dpm', n: 'British DPM', co: 'United Kingdom', y: 1968, pat: ['brush', ['#8a8456', '#5a5a3a', '#6e4a2e', '#1e1e18']], wt: 1.6 },
  { id: 'u_il_olive', n: 'IDF olive fatigues', co: 'Israel', y: 1970, pat: ['solid', ['#5a5e40']], wt: 1.5 },
  { id: 'u_us_m81', n: 'US M81 Woodland BDU', co: 'United States', y: 1981, pat: ['blob', ['#7a7a52', '#3f5232', '#5a4630', '#1a1a16']], wt: 1.7 },
  { id: 'u_us_dcu6', n: 'US 6-colour desert ("chocolate chip")', co: 'United States', y: 1981, pat: ['blob', ['#c8b48c', '#a08a5e', '#7a6242', '#e8e0d0', '#1a1a16']], wt: 1.7 },
  { id: 'u_black', n: 'Tactical black', co: 'Police / special units', y: 1980, pat: ['solid', ['#1e1f22']], wt: 1.4 },
  { id: 'u_ru_gorka', n: 'Russian Gorka suit', co: 'Russia', y: 1990, pat: ['solid', ['#5a5a42']], wt: 1.9 },
  { id: 'u_us_dcu3', n: 'US 3-colour desert DCU', co: 'United States', y: 1990, pat: ['brush', ['#d2c29c', '#a8946a', '#8a7658']], wt: 1.6 },
  { id: 'u_de_fleck', n: 'Flecktarn', co: 'Germany', y: 1990, pat: ['dots', ['#6e7050', '#3e4a2e', '#5a4a30', '#1e2018', '#8a8a60']], wt: 1.6 },
  { id: 'u_fr_cce', n: 'French CCE', co: 'France', y: 1991, pat: ['brush', ['#6e7050', '#3a4a2e', '#6a4e36', '#1e1e18']], wt: 1.6 },
  { id: 'u_de_tropen', n: 'Tropentarn', co: 'Germany', y: 1993, pat: ['dots', ['#c8b890', '#a09470', '#6e6a4a']], wt: 1.6 },
  { id: 'u_ca_cadpat', n: 'Canadian CADPAT TW', co: 'Canada', y: 1997, pat: ['digital', ['#6a7040', '#3e4a2a', '#4a3a2a', '#1e1e18']], wt: 1.5 },
  { id: 'u_ru_flora', n: 'Russian VSR-98 Flora', co: 'Russia', y: 1998, pat: ['brush', ['#8a9060', '#4e5a36', '#9a7a52']], wt: 1.6 },
  { id: 'u_us_marpat_w', n: 'USMC MARPAT Woodland', co: 'United States', y: 2002, pat: ['digital', ['#5a6a3e', '#3a4a2a', '#7a6a4a', '#1e1e18']], wt: 1.5 },
  { id: 'u_us_marpat_d', n: 'USMC MARPAT Desert', co: 'United States', y: 2002, pat: ['digital', ['#c8b48a', '#9a845e', '#6e5a40']], wt: 1.5 },
  { id: 'u_multicam', n: 'MultiCam', co: 'United States', y: 2002, pat: ['blob', ['#9a8e6a', '#6e6a4a', '#4e5a3a', '#bdb08a', '#3a3226']], wt: 1.4 },
  { id: 'u_us_ucp', n: 'US Army UCP (ACU)', co: 'United States', y: 2004, pat: ['digital', ['#8a8e80', '#b4b8a8', '#6e7262', '#cfd0c4']], wt: 1.5 },
  { id: 'u_cn_type07', n: 'PLA Type 07 woodland', co: 'China', y: 2007, pat: ['digital', ['#5e6a44', '#3e4a30', '#8a7a52', '#2a2a22']], wt: 1.5 },
  { id: 'u_ru_emr', n: 'Russian EMR "Tsifra"', co: 'Russia', y: 2008, pat: ['digital', ['#6e7a52', '#4a5236', '#3a3226', '#8a8e6a']], wt: 1.5 },
  { id: 'u_uk_mtp', n: 'British MTP', co: 'United Kingdom', y: 2010, pat: ['blob', ['#a09470', '#6e6a4a', '#4e5a3a', '#c0b48c', '#3a3226']], wt: 1.4 },
  { id: 'u_kryptek', n: 'Kryptek Typhon', co: 'Special units', y: 2012, pat: ['blob', ['#262626', '#3a3a3a', '#151515', '#4a4a46']], wt: 1.4 },
  { id: 'u_au_amcu', n: 'Australian AMCU', co: 'Australia', y: 2014, pat: ['blob', ['#8a8a5a', '#5a6a3e', '#a09470', '#3a3a2a']], wt: 1.4 },
  { id: 'u_us_ocp', n: 'US Army OCP (Scorpion W2)', co: 'United States', y: 2015, pat: ['blob', ['#9a8e6a', '#6e6a4a', '#586246', '#bdb08a']], wt: 1.4 },
  { id: 'u_civ_jeans', n: 'Civilian: jacket & jeans', co: 'Civilian', y: 1970, pat: ['solid', ['#3a4250']], wt: 1.2 },
  { id: 'u_civ_hoodie', n: 'Civilian: grey hoodie', co: 'Civilian', y: 1990, pat: ['solid', ['#5a5a5e']], wt: 1.1 },
  { id: 'u_civ_track', n: 'Civilian: tracksuit', co: 'Civilian', y: 1985, pat: ['solid', ['#1e2a44']], wt: 1 },
  { id: 'u_civ_suit', n: 'Civilian: business suit', co: 'Civilian', y: 1950, pat: ['solid', ['#2a2a30']], wt: 1.4 },
  { id: 'u_civ_crew', n: 'Ship crew coveralls', co: 'Civilian', y: 1960, pat: ['solid', ['#c8541e']], wt: 1.3 },
  { id: 'u_psy_black', n: 'Blackline field suit', co: 'Blackline PMC', y: 2031, pat: ['solid', ['#26282c']], wt: 1.3 },
  { id: 'u_psy_rust', n: 'Rust Syndicate scav gear', co: 'Rust Syndicate', y: 2030, pat: ['blob', ['#6b5040', '#4a3e34', '#8a6a4a', '#2a2018']], wt: 2 },
]);

// ------------------------------------------------------------------ helmets (rating = capability threshold; cut = coverage)
add('helmet', [
  { id: 'h_none', n: 'None', co: '—', y: 1900, model: null, rating: 0, cut: 'none' },
  { id: 'h_cap', n: 'Patrol cap', co: 'Various', y: 1950, model: 'cap', col: 'uniform', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_boonie', n: 'Boonie hat', co: 'United States', y: 1967, model: 'boonie', col: 'uniform', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_beret', n: 'Beret', co: 'Various', y: 1940, model: 'beret', col: '#6a1a1a', rating: 0, cut: 'none', wt: .1 },
  { id: 'h_brodie', n: 'Brodie Mk I steel helmet', co: 'United Kingdom', y: 1915, model: 'brodie', col: '#5b5a40', rating: 1.6, cut: 'high', wt: .98, d: 'Manganese steel; stops shrapnel and pistol rounds at range.' },
  { id: 'h_adrian', n: 'Adrian M1915', co: 'France', y: 1915, model: 'adrian', col: '#6b7a86', rating: 1.4, cut: 'mid', wt: .77 },
  { id: 'h_stahl16', n: 'Stahlhelm M1916', co: 'German Empire', y: 1916, model: 'stahl16', col: '#55594c', rating: 1.9, cut: 'full', wt: 1.2 },
  { id: 'h_m35', n: 'Stahlhelm M35', co: 'Germany', y: 1935, model: 'm35', col: '#4c5046', rating: 1.9, cut: 'full', wt: 1.1 },
  { id: 'h_ssh40', n: 'SSh-40', co: 'Soviet Union', y: 1940, model: 'ssh68', col: '#4d563b', rating: 1.9, cut: 'full', wt: 1.25 },
  { id: 'h_m1', n: 'M1 steel pot', co: 'United States', y: 1941, model: 'm1', col: '#4b5234', rating: 1.8, cut: 'mid', wt: 1.36 },
  { id: 'h_m1_cover', n: 'M1 with Mitchell cover', co: 'United States', y: 1960, model: 'm1cover', col: '#4f5a36', rating: 1.8, cut: 'mid', wt: 1.45 },
  { id: 'h_ssh68', n: 'SSh-68', co: 'Soviet Union', y: 1968, model: 'ssh68', col: '#4d563b', rating: 2, cut: 'full', wt: 1.3 },
  { id: 'h_pasgt', n: 'PASGT "Fritz" (Kevlar)', co: 'United States', y: 1983, model: 'pasgt', col: 'uniform', rating: 3.4, cut: 'full', wt: 1.45, d: 'First US Kevlar helmet; roughly NIJ IIIA.' },
  { id: 'h_mk6', n: 'Mk6 combat helmet', co: 'United Kingdom', y: 1985, model: 'pasgt', col: 'uniform', rating: 3.2, cut: 'full', wt: 1.4 },
  { id: 'h_type88', n: 'Type 88 Kevlar helmet', co: 'Japan', y: 1988, model: 'pasgt', col: 'uniform', rating: 3.3, cut: 'full', wt: 1.4 },
  { id: 'h_altyn', n: 'Altyn titanium helmet + visor', co: 'Russia', y: 1990, model: 'altyn', col: '#4a5236', rating: 4.6, cut: 'full', visor: 4.2, wt: 4.3, d: 'Titanium shell with a hinged armoured-glass visor; very heavy.' },
  { id: 'h_ach', n: 'ACH / MICH 2000', co: 'United States', y: 2002, model: 'ach', col: 'uniform', rating: 4, cut: 'mid', wt: 1.36, d: 'Mid-cut Kevlar; NIJ IIIA.' },
  { id: 'h_gallet', n: 'Gallet F1 / SPECTRA', co: 'France', y: 1998, model: 'pasgt', col: '#5a6040', rating: 3.6, cut: 'full', wt: 1.4 },
  { id: 'h_qgf03', n: 'QGF-03', co: 'China', y: 2003, model: 'ach', col: 'uniform', rating: 3.8, cut: 'mid', wt: 1.5 },
  { id: 'h_mk7', n: 'Mk7 combat helmet', co: 'United Kingdom', y: 2009, model: 'ach', col: 'uniform', rating: 3.8, cut: 'mid', wt: 1.3 },
  { id: 'h_fast', n: 'Ops-Core FAST high-cut', co: 'United States', y: 2010, model: 'fast', col: 'uniform', rating: 4, cut: 'high', wt: 1.1, d: 'Bump-and-ballistic high-cut shell with ARC rails and NVG shroud.' },
  { id: 'h_airframe', n: 'Crye AirFrame', co: 'United States', y: 2011, model: 'fast', col: '#8a7a58', rating: 3.8, cut: 'high', wt: 1.05 },
  { id: 'h_ech', n: 'ECH (Enhanced Combat Helmet)', co: 'United States', y: 2013, model: 'ach', col: 'uniform', rating: 5.5, cut: 'mid', wt: 1.55, d: 'UHMWPE shell that stops some rifle fragments and pistol-calibre SMG fire.' },
  { id: 'h_6b47', n: '6B47 Ratnik', co: 'Russia', y: 2015, model: '6b47', col: 'uniform', rating: 4.2, cut: 'full', wt: 1.2 },
  { id: 'h_lshz', n: 'LShZ-1+ (with visor)', co: 'Russia', y: 2014, model: 'altyn', col: '#4a5236', rating: 4.4, cut: 'full', visor: 3.6, wt: 3.1 },
  { id: 'h_ihps', n: 'IHPS (Integrated Head Protection)', co: 'United States', y: 2019, model: 'fast', col: 'uniform', rating: 5.8, cut: 'high', wt: 1.4 },
  { id: 'h_rf1', n: 'Ops-Core RF1 (rifle-rated)', co: 'United States', y: 2017, model: 'fast', col: '#3a3d34', rating: 7.2, cut: 'high', wt: 1.9, d: 'Stops 7.62×39 MSC and 5.56 M193 at the muzzle.' },
  { id: 'h_psy_visor', n: 'Blackline Aegis full-face helmet', co: 'Blackline PMC', y: 2032, model: 'visor', col: '#1b1c1f', rating: 9, cut: 'full', visor: 7, wt: 2.6 },
  { id: 'h_psy_gasmask', n: 'Rust Syndicate hood & respirator', co: 'Rust Syndicate', y: 2030, model: 'gasmask', col: '#5a4636', rating: 0, cut: 'none', wt: 1.1 },
]);

// ------------------------------------------------------------------ face / eyes
add('face', [
  { id: 'f_none', n: 'None', model: null, y: 1900 },
  { id: 'f_glasses', n: 'Oakley SI M-frame ballistic glasses', co: 'United States', y: 2003, model: 'glasses', eyes: 1, wt: .05 },
  { id: 'f_goggles', n: 'Revision / ESS ballistic goggles', co: 'United States', y: 2004, model: 'goggles', eyes: 1, wt: .12 },
  { id: 'f_balaclava', n: 'Balaclava', co: 'Various', y: 1970, model: 'balaclava', wt: .1 },
  { id: 'f_shemagh', n: 'Shemagh face wrap', co: 'Various', y: 1950, model: 'shemagh', wt: .15 },
  { id: 'f_skull', n: 'Skull half-mask', co: 'Various', y: 2005, model: 'skull', wt: .05 },
  { id: 'f_mandible', n: 'Ops-Core mandible guard', co: 'United States', y: 2012, model: 'mandible', face: 3.6, faceLow: true, wt: .5, d: 'IIIA jaw protection clipped to a FAST helmet.' },
  { id: 'f_visor', n: 'Ops-Core ballistic visor', co: 'United States', y: 2014, model: 'bvisor', face: 3.8, wt: 1.3, d: 'Full-face IIIA polycarbonate visor.' },
  { id: 'f_gp5', n: 'GP-5 gas mask', co: 'Soviet Union', y: 1962, model: 'gp5', wt: .6 },
  { id: 'f_m50', n: 'M50 JSGPM gas mask', co: 'United States', y: 2009, model: 'm50', wt: .8 },
  { id: 'f_s10', n: 'S10 respirator', co: 'United Kingdom', y: 1986, model: 'm50', wt: .8 },
]);

// ------------------------------------------------------------------ night vision
add('nvg', [
  { id: 'n_none', n: 'None', model: null, y: 1900 },
  { id: 'n_pvs7', n: 'AN/PVS-7 (single tube, bi-ocular)', co: 'United States', y: 1990, model: 'pvs7', nv: { q: .6, view: 'bino' }, wt: .68 },
  { id: 'n_1pn138', n: '1PN138 monocular', co: 'Russia', y: 2012, model: 'mono', nv: { q: .6, view: 'mono' }, wt: .45 },
  { id: 'n_pvs14', n: 'AN/PVS-14 monocular', co: 'United States', y: 1996, model: 'mono', nv: { q: .75, view: 'mono' }, wt: .4 },
  { id: 'n_pvs31', n: 'AN/PVS-31A binocular', co: 'United States', y: 2016, model: 'bino', nv: { q: .9, view: 'bino', white: true }, wt: .5 },
  { id: 'n_gpnvg18', n: 'L3 GPNVG-18 panoramic (quad)', co: 'United States', y: 2012, model: 'quad', nv: { q: .95, view: 'quad', white: true }, wt: .88 },
  { id: 'n_envgb', n: 'ENVG-B fused thermal', co: 'United States', y: 2019, model: 'bino', nv: { q: .9, view: 'bino', white: true, thermal: true }, wt: .9 },
]);

// ------------------------------------------------------------------ body armour / carriers
// soft: soft-armour rating; cov: extra coverage; plates: accepts plate inserts; fixed: built-in hard armour
add('armor', [
  { id: 'a_none', n: 'None (belt & suspenders)', model: 'belt', y: 1900, soft: 0, cov: {}, plates: false },
  { id: 'a_sappenpanzer', n: 'Sappenpanzer M1916 trench armour', co: 'German Empire', y: 1916, model: 'steel', col: '#55594c', soft: 0, cov: {}, plates: false, fixed: { rating: 3.6, front: true, back: false, deg: .03 }, wt: 9, d: 'Overlapping steel plates worn by sentries and machine-gunners.' },
  { id: 'a_brewster', n: 'Brewster body shield', co: 'United States', y: 1917, model: 'steel', col: '#3a3d40', soft: 0, cov: {}, plates: false, fixed: { rating: 7.2, front: true, back: false, deg: .02 }, wt: 18, d: 'Chrome-nickel steel breastplate tested against MG fire. Crushingly heavy.' },
  { id: 'a_sn42', n: 'SN-42 steel breastplate', co: 'Soviet Union', y: 1942, model: 'steel', col: '#4d563b', soft: 0, cov: {}, plates: false, fixed: { rating: 3.4, front: true, back: false, deg: .03 }, wt: 3.5 },
  { id: 'a_m1flak', n: 'M1 flak vest (USAAF)', co: 'United States', y: 1943, model: 'flak', col: '#5f5a3e', soft: 1.6, cov: { groin: true }, plates: false, wt: 7.9 },
  { id: 'a_m1928', n: 'M1923 cartridge belt & M1928 suspenders', co: 'United States', y: 1928, model: 'belt', col: '#8b8058', soft: 0, cov: {}, plates: false, wt: 1.2 },
  { id: 'a_y_straps', n: 'German Y-straps & ammo pouches', co: 'Germany', y: 1939, model: 'belt', col: '#2e2a22', soft: 0, cov: {}, plates: false, wt: 1.2 },
  { id: 'a_m69', n: 'M69 fragmentation vest', co: 'United States', y: 1969, model: 'flak', col: '#4b5638', soft: 1.8, cov: { neck: true }, plates: false, wt: 4 },
  { id: 'a_type56', n: 'Type 56 AK chest rig', co: 'China', y: 1960, model: 'rig', col: '#6a6a4c', soft: 0, cov: {}, plates: false, wt: .9 },
  { id: 'a_pasgt', n: 'PASGT vest', co: 'United States', y: 1980, model: 'vest', col: 'uniform', soft: 2.3, cov: { neck: true }, plates: false, wt: 4.1 },
  { id: 'a_6b3', n: '6B3 "Afghanka" titanium vest', co: 'Soviet Union', y: 1983, model: 'vest', col: '#6a6a4c', soft: 2, cov: {}, plates: false, fixed: { rating: 4.6, front: true, back: true, deg: .04 }, wt: 11 },
  { id: 'a_ephod', n: 'IDF Ephod chest rig', co: 'Israel', y: 1990, model: 'rig', col: '#5a5e40', soft: 0, cov: {}, plates: false, wt: 1.4 },
  { id: 'a_6b23', n: '6B23 armour vest', co: 'Russia', y: 2000, model: 'vest', col: 'uniform', soft: 3, cov: { neck: true }, plates: true, wt: 6.5 },
  { id: 'a_otv', n: 'Interceptor OTV', co: 'United States', y: 2002, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, groin: true }, plates: true, wt: 3.8, d: 'IIIA soft armour with SAPI pockets front and back.' },
  { id: 'a_6094', n: 'LBT-6094 plate carrier', co: 'United States', y: 2007, model: 'pc', col: '#7a6a4a', soft: 4, cov: {}, plates: true, wt: 3 },
  { id: 'a_iotv', n: 'IOTV Gen III', co: 'United States', y: 2009, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: true, wt: 6.2 },
  { id: 'a_spc', n: 'USMC Scalable Plate Carrier', co: 'United States', y: 2009, model: 'pc', col: 'uniform', soft: 4, cov: { sides: true }, plates: true, wt: 3.5 },
  { id: 'a_osprey', n: 'Osprey Mk4', co: 'United Kingdom', y: 2010, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, sides: true }, plates: true, wt: 6 },
  { id: 'a_felin', n: 'FELIN combat vest', co: 'France', y: 2010, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true }, plates: true, wt: 5 },
  { id: 'a_cpc', n: 'Crye CPC', co: 'United States', y: 2011, model: 'pc', col: '#8a7a58', soft: 0, cov: { sides: true }, plates: true, wt: 2.3 },
  { id: 'a_6b43', n: '6B43 heavy armour', co: 'Russia', y: 2012, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: true, wt: 8 },
  { id: 'a_idz', n: 'IdZ-ES protective vest', co: 'Germany', y: 2012, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, sides: true }, plates: true, wt: 5 },
  { id: 'a_jpc', n: 'Crye JPC 2.0 (slick)', co: 'United States', y: 2013, model: 'pcslick', col: '#4a5236', soft: 0, cov: {}, plates: true, wt: 1.1 },
  { id: 'a_avs', n: 'Crye AVS', co: 'United States', y: 2014, model: 'pc', col: 'uniform', soft: 4, cov: { sides: true }, plates: true, wt: 3.2 },
  { id: 'a_6b45', n: '6B45 Ratnik', co: 'Russia', y: 2015, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 5.8 },
  { id: 'a_virtus', n: 'Virtus STV', co: 'United Kingdom', y: 2015, model: 'pc', col: 'uniform', soft: 4, cov: { sides: true }, plates: true, wt: 4.5 },
  { id: 'a_msv', n: 'Modular Scalable Vest', co: 'United States', y: 2019, model: 'iotv', col: 'uniform', soft: 4, cov: { neck: true, groin: true, sides: true }, plates: true, wt: 4.6 },
  { id: 'a_type19', n: 'Type 19 armour vest', co: 'China', y: 2019, model: 'pc', col: 'uniform', soft: 4, cov: { neck: true }, plates: true, wt: 5 },
  { id: 'a_psy_black', n: 'Blackline Aegis carrier', co: 'Blackline PMC', y: 2032, model: 'pc', col: '#1c1e22', soft: 5, cov: { neck: true, sides: true, groin: true, shoulders: true }, plates: true, wt: 5 },
  { id: 'a_psy_scrap', n: 'Rust Syndicate scrap plate', co: 'Rust Syndicate', y: 2030, model: 'steel', col: '#6a3a22', soft: 0, cov: {}, plates: false, fixed: { rating: 7, front: true, back: true, deg: .05 }, wt: 10 },
]);

// ------------------------------------------------------------------ plates (inserts; side plates go in automatically where the carrier has them)
add('plates', [
  { id: 'p_none', n: 'No plates', y: 1900, rating: 0 },
  { id: 'p_steel', n: 'AR500 Level III steel', co: 'United States', y: 2005, rating: 7.8, deg: .03, wt: 7.6, d: 'Takes many hits but spalls and weighs a lot.' },
  { id: 'p_pe', n: 'UHMWPE Level III', co: 'United States', y: 2010, rating: 7.8, deg: .1, wt: 2.4, d: 'Very light; soft steel-core and AP rounds go through.' },
  { id: 'p_rf2', n: 'Level III+ (RF2) multi-hit', co: 'United States', y: 2016, rating: 9.5, deg: .06, wt: 4 },
  { id: 'p_sapi', n: 'SAPI', co: 'United States', y: 1999, rating: 9.2, deg: .14, wt: 4.6 },
  { id: 'p_esapi', n: 'ESAPI (Level IV)', co: 'United States', y: 2005, rating: 16, deg: .16, wt: 5.8, d: 'Boron-carbide ceramic; stops .30-06 M2AP.' },
  { id: 'p_xsapi', n: 'XSAPI', co: 'United States', y: 2008, rating: 18.5, deg: .18, wt: 6.4 },
  { id: 'p_mk4', n: 'Mk4a ECBA plates', co: 'United Kingdom', y: 2006, rating: 14.5, deg: .16, wt: 6 },
  { id: 'p_granit', n: 'Granit-4 (Br5)', co: 'Russia', y: 2012, rating: 15, deg: .15, wt: 7 },
  { id: 'p_psy_aegis', n: 'Aegis nano-ceramic', co: 'Blackline PMC', y: 2032, rating: 22, deg: .08, wt: 5, d: 'Fictional. Stops .50 BMG ball — twice.' },
]);

// ------------------------------------------------------------------ gloves, boots, packs
add('gloves', [
  { id: 'g_none', n: 'Bare hands', y: 1900, col: null },
  { id: 'g_leather', n: 'Leather work gloves', co: 'Various', y: 1914, col: '#6a4a30', wt: .15 },
  { id: 'g_wool', n: 'Wool trigger-finger mittens', co: 'Various', y: 1940, col: '#5a5646', wt: .2 },
  { id: 'g_nomex', n: 'Nomex flight gloves', co: 'United States', y: 1970, col: '#8a7a58', wt: .1 },
  { id: 'g_mechanix', n: 'Mechanix M-Pact', co: 'United States', y: 2003, col: '#2a2a28', wt: .15 },
  { id: 'g_oakley', n: 'Oakley SI assault gloves', co: 'United States', y: 2008, col: '#8a7a5a', wt: .2 },
  { id: 'g_black', n: 'Black tactical gloves', co: 'Various', y: 1990, col: '#161616', wt: .15 },
]);
add('boots', [
  { id: 'b_puttee', n: 'Ammunition boots & puttees', co: 'United Kingdom', y: 1914, model: 'puttee', col: '#2a1e16', wt: 2 },
  { id: 'b_jack', n: 'Marschstiefel jackboots', co: 'Germany', y: 1914, model: 'jack', col: '#1a1614', wt: 2.4 },
  { id: 'b_legging', n: 'Service shoes & canvas leggings', co: 'United States', y: 1941, model: 'legging', col: '#3a2a1c', wt: 1.9 },
  { id: 'b_kirza', n: 'Kirzachi boots', co: 'Soviet Union', y: 1940, model: 'jack', col: '#241c16', wt: 2.2 },
  { id: 'b_jungle', n: 'Jungle boots', co: 'United States', y: 1966, model: 'modern', col: '#1e1c18', wt: 1.6 },
  { id: 'b_combat', n: 'Black combat boots', co: 'Various', y: 1970, model: 'modern', col: '#141414', wt: 1.8 },
  { id: 'b_desert', n: 'Desert combat boots', co: 'United States', y: 1990, model: 'modern', col: '#a08a64', wt: 1.7 },
  { id: 'b_salomon', n: 'Salomon Quest 4D (coyote)', co: 'Various', y: 2010, model: 'modern', col: '#7a6a4c', wt: 1.3 },
]);
add('pack', [
  { id: 'k_none', n: 'None', y: 1900, model: null },
  { id: 'k_haversack', n: 'M1928 haversack', co: 'United States', y: 1928, model: 'haversack', col: '#8b8058', wt: 3 },
  { id: 'k_tornister', n: 'Tornister (calfskin pack)', co: 'Germany', y: 1914, model: 'haversack', col: '#5a4030', wt: 3.5 },
  { id: 'k_rd54', n: 'RD-54 assault pack', co: 'Soviet Union', y: 1954, model: 'assault', col: '#6a6a4c', wt: 2 },
  { id: 'k_alice', n: 'ALICE medium pack', co: 'United States', y: 1974, model: 'alice', col: '#4b5638', wt: 6 },
  { id: 'k_assault', n: '3-day assault pack', co: 'United States', y: 2005, model: 'assault', col: 'uniform', wt: 4 },
  { id: 'k_molle', n: 'MOLLE II large rucksack', co: 'United States', y: 2001, model: 'ruck', col: 'uniform', wt: 12 },
  { id: 'k_radio', n: 'AN/PRC-117G radio pack', co: 'United States', y: 2008, model: 'radio', col: '#3a3d34', wt: 5 },
  { id: 'k_hydro', n: 'Hydration carrier', co: 'Various', y: 2000, model: 'hydro', col: 'uniform', wt: 2 },
]);
G.GEARID = Object.fromEntries(GEAR.map(g => [g.id, g]));
G.gearFor = slot => GEAR.filter(g => g.slot === slot);

// ------------------------------------------------------------------ presets: real-world kits
G.KIT_PRESETS = [
  { id: 'us2020', n: 'US Army rifleman, 2020', kit: { uniform: 'u_us_ocp', helmet: 'h_ihps', face: 'f_glasses', nvg: 'n_envgb', armor: 'a_msv', plates: 'p_esapi', gloves: 'g_oakley', boots: 'b_salomon', pack: 'k_assault' } },
  { id: 'usmc2008', n: 'USMC, Helmand 2008', kit: { uniform: 'u_us_marpat_d', helmet: 'h_ach', face: 'f_goggles', nvg: 'n_pvs14', armor: 'a_spc', plates: 'p_esapi', gloves: 'g_mechanix', boots: 'b_desert', pack: 'k_hydro' } },
  { id: 'sof2015', n: 'Special operations assaulter, 2015', kit: { uniform: 'u_multicam', helmet: 'h_airframe', face: 'f_glasses', nvg: 'n_gpnvg18', armor: 'a_cpc', plates: 'p_rf2', gloves: 'g_mechanix', boots: 'b_salomon', pack: 'k_none' } },
  { id: 'ratnik', n: 'Russian "Ratnik" motor rifleman', kit: { uniform: 'u_ru_emr', helmet: 'h_6b47', face: 'f_none', nvg: 'n_1pn138', armor: 'a_6b45', plates: 'p_granit', gloves: 'g_black', boots: 'b_combat', pack: 'k_rd54' } },
  { id: 'uk2010', n: 'British Army, Afghanistan 2010', kit: { uniform: 'u_uk_mtp', helmet: 'h_mk7', face: 'f_glasses', nvg: 'n_pvs14', armor: 'a_osprey', plates: 'p_mk4', gloves: 'g_oakley', boots: 'b_desert', pack: 'k_assault' } },
  { id: 'bw', n: 'Bundeswehr infantry', kit: { uniform: 'u_de_fleck', helmet: 'h_ach', face: 'f_none', nvg: 'n_none', armor: 'a_idz', plates: 'p_esapi', gloves: 'g_black', boots: 'b_combat', pack: 'k_assault' } },
  { id: 'pla', n: 'PLA infantry, 2019', kit: { uniform: 'u_cn_type07', helmet: 'h_qgf03', face: 'f_none', nvg: 'n_none', armor: 'a_type19', plates: 'p_sapi', gloves: 'g_none', boots: 'b_combat', pack: 'k_assault' } },
  { id: 'swat', n: 'Counter-terror entry team', kit: { uniform: 'u_black', helmet: 'h_rf1', face: 'f_visor', nvg: 'n_pvs31', armor: 'a_avs', plates: 'p_esapi', gloves: 'g_black', boots: 'b_combat', pack: 'k_none' } },
  { id: 'vietnam', n: 'US grunt, Vietnam 1968', kit: { uniform: 'u_us_og107', helmet: 'h_m1_cover', face: 'f_none', nvg: 'n_none', armor: 'a_m69', plates: 'p_none', gloves: 'g_none', boots: 'b_jungle', pack: 'k_alice' } },
  { id: 'afghan', n: 'Soviet paratrooper, Afghanistan 1985', kit: { uniform: 'u_su_amoeba', helmet: 'h_ssh68', face: 'f_none', nvg: 'n_none', armor: 'a_6b3', plates: 'p_none', gloves: 'g_none', boots: 'b_kirza', pack: 'k_rd54' } },
  { id: 'ww2us', n: 'US paratrooper, 1944', kit: { uniform: 'u_us_m43', helmet: 'h_m1', face: 'f_none', nvg: 'n_none', armor: 'a_m1928', plates: 'p_none', gloves: 'g_none', boots: 'b_legging', pack: 'k_haversack' } },
  { id: 'ww1de', n: 'German Stoßtruppe, 1917', kit: { uniform: 'u_de_feldgrau', helmet: 'h_stahl16', face: 'f_none', nvg: 'n_none', armor: 'a_sappenpanzer', plates: 'p_none', gloves: 'g_leather', boots: 'b_jack', pack: 'k_tornister' } },
  { id: 'blackline', n: 'Blackline PMC operator (fictional)', kit: { uniform: 'u_psy_black', helmet: 'h_psy_visor', face: 'f_none', nvg: 'n_gpnvg18', armor: 'a_psy_black', plates: 'p_psy_aegis', gloves: 'g_black', boots: 'b_combat', pack: 'k_none' } },
];
G.KIT_DEFAULT = Object.assign({}, G.KIT_PRESETS[0].kit);
G.kitWeight = kit => G.GEAR_SLOTS.reduce((s, [slot]) => { const g = G.GEARID[kit[slot]]; if (!g) return s; if (slot === 'plates') { const A = G.GEARID[kit.armor]; if (!A || !A.plates) return s; return s + g.wt * ((A.cov && A.cov.sides) ? 1.25 : 1); } return s + (g.wt || 0); }, 0);

// ------------------------------------------------------------------ hit resolution
// kit: {slot: id}; zone: head|chest|stomach|arm|leg; loc: hit point in the chest frame (torso zones) or
// head frame (head), metres, -z = front; b: bullet; speed: m/s; st: persistent damage state (plate hits)
G.newArmorState = () => ({ f: 0, b: 0, sl: 0, sr: 0, fx: 0, bx: 0, helm: 0 });
G.armorHit = function (kit, zone, loc, b, speed, st) {
  st = st || G.newArmorState();
  const A = G.GEARID[kit.armor] || {}, P = G.GEARID[kit.plates] || {}, H = G.GEARID[kit.helmet] || {}, F = G.GEARID[kit.face] || {};
  const blast = !b.cal; // explosions / melee: armour just soaks some of it
  let cap = blast ? 0 : G.penCapability ? G.penCapability(b, speed || b.v0 || 1) : 5;
  const layers = []; // [name, rating, stateKey, degrade]
  const x = loc ? loc.x : 0, y = loc ? loc.y : 0, front = loc ? loc.z < 0 : true, ax = Math.abs(x);
  if (zone === 'head') {
    const faceHit = front && y < .045 && ax < .075;
    if (faceHit) {
      if (F.face && (!F.faceLow || y < -.012)) layers.push([F.n, F.face, 'fx', .1]);
      else if (H.visor) layers.push([H.n + ' visor', H.visor, 'fx', .1]);
    } else if (H.rating) {
      const low = H.cut === 'full' ? -.08 : H.cut === 'mid' ? -.04 : .02;
      const covered = y > .045 || (!front && y > low) || (ax > .06 && y > low + .02);
      if (covered) layers.push([H.n, H.rating, 'helm', .08]);
    }
  } else if (zone === 'chest' || zone === 'stomach' || zone === 'neck') {
    const neck = y > .19;
    const hasPlates = A.plates && P.rating > 0;
    if (A.fixed && (front ? A.fixed.front : A.fixed.back) && ax < .16 && y > -.3 && y < .2) layers.push([A.n, A.fixed.rating, front ? 'fx' : 'bx', A.fixed.deg]);
    if (hasPlates && ax < .125 && y > -.21 && y < .18) layers.push([P.n + (front ? ' (front)' : ' (back)'), P.rating, front ? 'f' : 'b', P.deg]);
    if (hasPlates && A.cov.sides && ax >= .12 && y > -.17 && y < .1) layers.push([P.n + ' side plate', P.rating, x < 0 ? 'sl' : 'sr', P.deg]);
    const softCov = A.soft > 0 && ax < .23 && ((y > -.36 && y < .2) || (neck && A.cov.neck) || (y <= -.36 && A.cov.groin));
    if (softCov) layers.push([A.n + (neck ? ' collar' : y <= -.36 ? ' groin protector' : ' soft armour'), A.soft, null, .01]);
  } else if (zone === 'arm' && A.cov && A.cov.shoulders && y > .05 && A.soft) layers.push([A.n + ' shoulder protector', A.soft, null, .01]);
  if (!layers.length) return { mult: 1, stopped: false, info: '' };
  if (blast) return { mult: .55, stopped: false, info: 'Blast partly absorbed by ' + layers[0][0] };
  // run the bullet through each layer
  let used = [];
  for (const [name, rating, key, deg] of layers) {
    const hits = key ? st[key] || 0 : 0;
    const eff = rating * Math.max(.3, 1 - deg * hits);
    if (key) st[key] = hits + 1;
    if (cap <= eff) {
      const blunt = zone === 'head' ? .14 : .08 + Math.min(.12, cap / Math.max(1, eff) * .1);
      return { mult: blunt, stopped: true, by: name, info: `STOPPED by ${name}${key ? ` · hit ${hits + 1}` + (eff < rating * .75 ? ' · cracked' : '') : ''}` };
    }
    cap -= eff * .7; used.push(name);
  }
  const mult = Math.max(.35, Math.min(1, .5 + cap / (cap + 6)));
  return { mult, stopped: false, info: `PENETRATED ${used.join(' + ')}` };
};

// ------------------------------------------------------------------ player's saved kit
G.Kit = {
  load() { try { const v = JSON.parse(localStorage.getItem('ironsight.kit') || 'null'); if (v) return this.sanitize(v); } catch (e) {} return Object.assign({}, G.KIT_DEFAULT); },
  save(k) { try { localStorage.setItem('ironsight.kit', JSON.stringify(k)); } catch (e) {} },
  sanitize(k) { const out = Object.assign({}, G.KIT_DEFAULT); for (const [slot] of G.GEAR_SLOTS) if (G.GEARID[k[slot]] && G.GEARID[k[slot]].slot === slot) out[slot] = k[slot]; return out; },
};
G.Kit.current = G.Kit.load();
})();
