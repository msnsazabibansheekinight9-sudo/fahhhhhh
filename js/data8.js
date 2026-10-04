// ============================================================================
// IRONSIGHT — arsenal part 8.
//   * doubles: side-by-side and over-under shotguns, double rifles, a drilling,
//     single-shot break-actions and the M79
//   * a new era, BLACK POWDER (1400s – 1870s): matchlocks, wheellocks,
//     flintlock muskets, rifles, blunderbusses and pistols, percussion rifles,
//     cap-and-ball revolvers, early breechloaders and lever guns, volley and
//     air guns, cannon from falconets to the Tsar Cannon, mortars, the Gatling,
//     the Puckle gun and the Hwacha
//   * a new era, ARTILLERY (1870s – today): mortars from 60 mm to the 914 mm
//     Little David, anti-tank guns, field guns and howitzers, anti-aircraft
//     guns, recoilless rifles, siege guns, railway guns and battleship guns
// Mechanics used here: lock (s of lock time: flash in the pan before the shot),
// misfire (chance), smoke (muzzle smoke scale), emplaced (fired from a fixed
// carriage: you can't walk with it), loft (rad of extra elevation, mortars),
// reloadKind (which reload sequence the weapon uses).
// ============================================================================
'use strict';
(function () {
const G = window.G;
G.ERAS.push({ id: 'powder', name: 'Black Powder', span: '1400s – 1870s', ord: 0, noWar: true });
G.ERA.powder = G.ERAS[G.ERAS.length - 1];
G.ERAS.push({ id: 'artillery', name: 'Artillery', span: '1870s – today', ord: 3, noWar: true });
G.ERA.artillery = G.ERAS[G.ERAS.length - 1];
if (G.UNIFORMS) { G.UNIFORMS.powder = G.UNIFORMS.ww1; G.UNIFORMS.artillery = G.UNIFORMS.now; }
Object.assign(G.CLASS_NAMES, { MUS: 'Musket & rifle', CAN: 'Cannon & early guns', ART: 'Field gun & howitzer', MOR: 'Mortar', ATG: 'Anti-tank gun', AAG: 'Anti-aircraft gun', HVY: 'Siege & railway gun', NAV: 'Naval gun', RCL: 'Recoilless rifle' });
G.CLASS_ORDER_EXTRA = ['MUS', 'CAN', 'MOR', 'ATG', 'ART', 'AAG', 'RCL', 'HVY', 'NAV'];

// ------------------------------------------------------------------ calibres
// ball: a round ball (muzzle-loaders, cannon), paper: paper-cartridge rifles, fin: mortar bomb,
// bag: bag-charge shell (no case), arrow: Hwacha / rocket arrows, stone: stone shot
const C = (o) => Object.assign(G.CAL, o);
C({
  '.75 musket ball':  { k: .0042, pen: 1, cs: [.019, .0095], ball: true },
  '.69 musket ball':  { k: .0040, pen: 1, cs: [.0175, .0087], ball: true },
  '.62 rifle ball':   { k: .0034, pen: 1, cs: [.0157, .0079], ball: true },
  '.54 rifle ball':   { k: .0031, pen: 1, cs: [.0137, .0069], ball: true },
  '.45 rifle ball':   { k: .0030, pen: 1, cs: [.0114, .0057], ball: true },
  '.52 ball':         { k: .0036, pen: 1, cs: [.0132, .0066], ball: true },
  '.56 pistol ball':  { k: .0046, pen: 1, cs: [.0142, .0071], ball: true },
  '.50 pistol ball':  { k: .0044, pen: 1, cs: [.0127, .0064], ball: true },
  '.46 air ball':     { k: .0045, pen: 1, cs: [.0117, .0058], ball: true },
  '.577 Minié':       { k: .0022, pen: 2, cs: [.025, .0073], paper: true },
  '.58 Minié':        { k: .0022, pen: 2, cs: [.025, .0074], paper: true },
  '.54 Minié':        { k: .0022, pen: 2, cs: [.024, .0069], paper: true },
  '.451 Whitworth':   { k: .0012, pen: 2, cs: [.028, .0057], paper: true },
  '15.4mm Dreyse':    { k: .0030, pen: 2, cs: [.03, .0077], paper: true },
  '11mm Chassepot':   { k: .0020, pen: 2, cs: [.03, .0057], paper: true },
  '.36 cap & ball':   { k: .0040, pen: 1, cs: [.009, .0047], ball: true },
  '.44 cap & ball':   { k: .0040, pen: 1, cs: [.011, .0057], ball: true },
  '.577 Snider':      { k: .0028, pen: 2, cs: [.051, .0085] },
  '.577/450 Martini': { k: .0021, pen: 2, cs: [.06, .0085] },
  '.45-70':           { k: .0019, pen: 2, cs: [.053, .0064] },
  '.50-70':           { k: .0022, pen: 2, cs: [.045, .0071] },
  '.52 Sharps':       { k: .0028, pen: 2, cs: [.03, .0071], paper: true },
  '.44 Henry':        { k: .0032, pen: 1, cs: [.023, .0058] },
  '.44-40':           { k: .0030, pen: 1, cs: [.033, .0059] },
  '.56-56 Spencer':   { k: .0034, pen: 1, cs: [.022, .0075] },
  '11mm Werndl':      { k: .0024, pen: 2, cs: [.042, .0074] },
  '16 gauge':         { k: .0047, pen: 1, cs: [.067, .0095], shell: true },
  '20 gauge':         { k: .0048, pen: 1, cs: [.067, .0088], shell: true },
  '10 gauge':         { k: .0044, pen: 1, cs: [.089, .0113], shell: true },
  '.410 bore':        { k: .0052, pen: 1, cs: [.064, .0065], shell: true },
  '.470 Nitro Express': { k: .0011, pen: 4, cs: [.083, .0072] },
  '.600 Nitro Express': { k: .0012, pen: 4, cs: [.076, .0089] },
  '40×46mm grenade':  { k: .0030, pen: 1, cs: [.1, .02] },
  '1.25-inch ball':   { k: .0030, pen: 2, cs: [.032, .016], ball: true },
  'Singijeon arrow':  { k: .0050, pen: 1, cs: [1.1, .006], arrow: true },
  'Congreve rocket':  { k: .0030, pen: 1, cs: [1.2, .05], arrow: true },
  '1-pdr ball':       { k: .0016, pen: 3, cs: [.05, .025], ball: true },
  '3-pdr ball':       { k: .0013, pen: 4, cs: [.07, .036], ball: true },
  '6-pdr ball':       { k: .0011, pen: 4, cs: [.09, .047], ball: true },
  '9-pdr ball':       { k: .0010, pen: 5, cs: [.106, .053], ball: true },
  '12-pdr ball':      { k: .0009, pen: 5, cs: [.115, .058], ball: true },
  '18-pdr ball':      { k: .0008, pen: 5, cs: [.132, .066], ball: true },
  '24-pdr ball':      { k: .0008, pen: 5, cs: [.145, .073], ball: true },
  '32-pdr ball':      { k: .0008, pen: 5, cs: [.16, .08], ball: true },
  '9-inch shell':     { k: .0007, pen: 5, cs: [.226, .113], ball: true },
  '13-inch shell':    { k: .0010, pen: 5, cs: [.32, .16], ball: true },
  '3-inch rifled shell': { k: .0006, pen: 5, cs: [.2, .038], bag: true },
  'Stone shot':       { k: .0012, pen: 5, cs: [.5, .25], ball: true, stone: true },
  'Bombard stone':    { k: .0013, pen: 5, cs: [.62, .31], ball: true, stone: true },
  'Tsar case shot':   { k: .0030, pen: 3, cs: [.12, .04], ball: true },
  // ---- artillery
  '60mm mortar':  { k: .0016, pen: 2, cs: [.25, .03], fin: true },
  '81mm mortar':  { k: .0014, pen: 2, cs: [.33, .04], fin: true },
  '107mm mortar': { k: .0012, pen: 3, cs: [.4, .053], fin: true },
  '120mm mortar': { k: .0011, pen: 3, cs: [.55, .06], fin: true },
  '240mm mortar': { k: .0008, pen: 4, cs: [1.1, .12], fin: true },
  '600mm Karl':   { k: .0007, pen: 5, cs: [2.5, .3], bag: true },
  '914mm Little David': { k: .0006, pen: 5, cs: [1.9, .457], bag: true },
  '20mm Flak':    { k: .0009, pen: 3, cs: [.14, .01] },
  '20×102mm':     { k: .0007, pen: 4, cs: [.102, .01] },
  '23×152mm':     { k: .0007, pen: 4, cs: [.152, .0115] },
  '37mm':         { k: .0006, pen: 5, cs: [.25, .0185] },
  '40mm Bofors':  { k: .0006, pen: 4, cs: [.31, .02] },
  '2-pdr AP':     { k: .0006, pen: 5, cs: [.3, .02] },
  '57mm AP':      { k: .0005, pen: 5, cs: [.44, .0285] },
  '75mm':         { k: .0005, pen: 5, cs: [.52, .0375] },
  '76.2mm':       { k: .0005, pen: 5, cs: [.55, .038] },
  '77mm':         { k: .0005, pen: 5, cs: [.5, .0385] },
  '84mm':         { k: .0012, pen: 5, cs: [.48, .042] },
  '88mm':         { k: .0004, pen: 5, cs: [.86, .044] },
  '100mm':        { k: .0004, pen: 5, cs: [.95, .05] },
  '105mm':        { k: .0004, pen: 5, cs: [.62, .0525] },
  '106mm RCL':    { k: .0009, pen: 5, cs: [1.0, .053] },
  '122mm':        { k: .0004, pen: 5, cs: [.9, .061], bag: true },
  '127mm':        { k: .0004, pen: 5, cs: [.84, .0635] },
  '152mm':        { k: .0003, pen: 5, cs: [.88, .076], bag: true },
  '155mm':        { k: .0003, pen: 5, cs: [.9, .0775], bag: true },
  '173mm':        { k: .0003, pen: 5, cs: [1.0, .086], bag: true },
  '203mm':        { k: .0003, pen: 5, cs: [.9, .1015], bag: true },
  '211mm Paris':  { k: .0001, pen: 5, cs: [1.0, .105], bag: true },
  '234mm':        { k: .0003, pen: 5, cs: [1.1, .117], bag: true },
  '280mm':        { k: .0002, pen: 5, cs: [1.2, .14], bag: true },
  '283mm':        { k: .0002, pen: 5, cs: [1.3, .1415], bag: true },
  '305mm':        { k: .0003, pen: 5, cs: [1.2, .1525], bag: true },
  '381mm':        { k: .0002, pen: 5, cs: [1.4, .19], bag: true },
  '406mm':        { k: .0002, pen: 5, cs: [1.83, .203], bag: true },
  '420mm':        { k: .0003, pen: 5, cs: [1.5, .21], bag: true },
  '457mm':        { k: .0002, pen: 5, cs: [1.7, .228], bag: true },
  '460mm':        { k: .0002, pen: 5, cs: [1.95, .23], bag: true },
  '800mm':        { k: .0002, pen: 5, cs: [3.7, .4], bag: true },
});
Object.assign(G.MASS || (G.MASS = {}), { '.75 musket ball': 31, '.69 musket ball': 30, '.62 rifle ball': 22, '.577 Minié': 34, '.58 Minié': 32, '12-pdr ball': 5440, '24-pdr ball': 10900, '105mm': 15000, '155mm': 43000, '406mm': 862000, '800mm': 4800000, '914mm Little David': 1678000 });

// ------------------------------------------------------------------ weapon helpers
const W = G.WEAPONS;
const add = o => { if (G.WEAPON[o.id]) return; W.push(o); G.WEAPON[o.id] = o; };
const fam = base => o => add(Object.assign({}, base, o, { m: Object.assign({}, base.m, o.m || {}) }));

// ---- doubles and break-action single shots
const DB = fam({ c: 'SG', cal: '12 gauge', act: 'break', modes: ['semi'], rpm: 400, mag: 2, v: 400, dmg: 22, pellets: 9, rec: [2.6, .9], rl: [2.2, 2.6], acc: 9, wt: 3.3, reloadKind: 'break',
  m: { t: 'break', B: [.71, .0092], nb: 2, lay: 'sxs', wd: 'walnut', mt: 'blued', pl: 'black', stk: 'wood', hammers: false } });
DB({ id: 'coachgun', n: 'Stoeger Coach Gun', e: 'mod', y: 1994, co: 'Brazil', m: { B: [.51, .0092] }, blurb: 'Short-barrelled hammerless double: the stagecoach guard’s gun reborn for cowboy action shooting.' });
DB({ id: 'sawnoff', n: 'Sawn-off double', e: 'cold', y: 1960, co: 'United Kingdom', acc: 15, wt: 2.1, rec: [3.2, 1.2], m: { B: [.3, .0092], stk: 'grip', hammers: true, noFore: false }, blurb: 'Barrels and stock hacked short. Brutal up close, useless past 20 m.' });
DB({ id: 'lupara', n: 'Lupara', e: 'ww2', y: 1930, co: 'Italy', acc: 13, wt: 2.4, m: { B: [.38, .0092], hammers: true, wd: 'wood_dark' }, blurb: 'The Sicilian shepherd’s sawn-down hammer double.' });
DB({ id: 'purdey', n: 'Purdey Best Side-by-Side', e: 'ww1', y: 1912, co: 'United Kingdom', acc: 7, wt: 3.0, m: { B: [.76, .009], mt: 'engraved' }, blurb: 'Hand-built London best gun with Beesley self-opening action.' });
DB({ id: 'rem1889', n: 'Remington Model 1889', e: 'ww1', y: 1889, co: 'United States', m: { hammers: true, B: [.76, .0094] } });
DB({ id: 'ithacanid', n: 'Ithaca NID Double', e: 'ww2', y: 1926, co: 'United States' });
DB({ id: 'webley700', n: 'Webley & Scott 700', e: 'cold', y: 1949, co: 'United Kingdom', acc: 8 });
DB({ id: 'aya2', n: 'AyA No. 2', e: 'cold', y: 1956, co: 'Spain', cal: '20 gauge', dmg: 19, m: { B: [.71, .0085], mt: 'engraved' } });
DB({ id: 'izh43', n: 'Baikal IZh-43', e: 'cold', y: 1986, co: 'Soviet Union' });
DB({ id: 'uplander', n: 'Stoeger Uplander', e: 'mod', y: 1998, co: 'Brazil', cal: '16 gauge', dmg: 20 });
DB({ id: 'merkel147', n: 'Merkel 147E', e: 'now', y: 2012, co: 'Germany', m: { mt: 'engraved' } });
DB({ id: 'bobwhite', n: 'CZ Bobwhite G2', e: 'now', y: 2017, co: 'Czech Republic', cal: '20 gauge', dmg: 19, m: { mt: 'black' } });
DB({ id: 'b686', n: 'Beretta 686 Silver Pigeon', e: 'mod', y: 1990, co: 'Italy', acc: 7, m: { lay: 'ou', mt: 'nickel', B: [.76, .009] } });
DB({ id: 'citori', n: 'Browning Citori', e: 'cold', y: 1973, co: 'Japan', acc: 7, m: { lay: 'ou' } });
DB({ id: 'mx8', n: 'Perazzi MX8', e: 'cold', y: 1968, co: 'Italy', acc: 6, m: { lay: 'ou', B: [.76, .009] } });
DB({ id: 'redlabel', n: 'Ruger Red Label', e: 'cold', y: 1977, co: 'United States', m: { lay: 'ou', mt: 'stainless' } });
DB({ id: 'k80', n: 'Krieghoff K-80', e: 'cold', y: 1980, co: 'Germany', acc: 6, m: { lay: 'ou', mt: 'nickel' } });
DB({ id: 'dt11', n: 'Beretta DT11', e: 'now', y: 2011, co: 'Italy', acc: 6, m: { lay: 'ou', mt: 'black' } });
DB({ id: 'f16', n: 'Blaser F16', e: 'now', y: 2016, co: 'Germany', acc: 6, m: { lay: 'ou', mt: 'grey' } });
DB({ id: 'drilling', n: 'Sauer & Sohn Drilling', e: 'ww2', y: 1934, co: 'Germany', mag: 3, wt: 3.4, m: { lay: 'drill', nb: 3 }, blurb: 'Two shotgun barrels over a rifle barrel — the German hunter’s do-everything gun.' });
DB({ id: 'hh_royal', n: 'Holland & Holland Royal .470', e: 'ww1', y: 1912, co: 'United Kingdom', c: 'RIF', cal: '.470 Nitro Express', pellets: 1, dmg: 260, v: 650, rec: [4.6, 1.3], acc: 2.5, wt: 4.9, m: { B: [.61, .0075], mt: 'engraved' }, blurb: 'Dangerous-game double rifle. Two quick shots for an elephant.' });
DB({ id: 'wr600', n: 'Westley Richards .600 NE', e: 'ww1', y: 1903, co: 'United Kingdom', c: 'RIF', cal: '.600 Nitro Express', pellets: 1, dmg: 380, v: 590, rec: [7, 1.8], acc: 3, wt: 7.2, m: { B: [.6, .0092] } });
DB({ id: 'topper', n: 'H&R Topper', e: 'cold', y: 1960, co: 'United States', mag: 1, m: { lay: 'single', nb: 1, single1: true } });
DB({ id: 'contender', n: 'Thompson/Center Contender', e: 'cold', y: 1967, co: 'United States', c: 'PST', cal: '.30-30 Winchester', pellets: 1, dmg: 80, v: 640, mag: 1, rec: [3, 1.2], acc: 3, wt: 1.6, m: { lay: 'single', nb: 1, single1: true, B: [.36, .006], stk: 'none' } });
DB({ id: 'm79', n: 'M79 grenade launcher', e: 'cold', y: 1961, co: 'United States', cal: '40×46mm grenade', pellets: 1, dmg: 40, v: 76, mag: 1, rec: [2.2, .5], acc: 4, wt: 2.9, he: { r: 5, dmg: 120 }, m: { lay: 'single', nb: 1, single1: true, B: [.36, .02], bigbore: true, wd: 'wood', ladder: true }, blurb: 'The “Thumper”: a break-open 40 mm grenade launcher.' });
if (!G.CAL['.30-30 Winchester']) G.CAL['.30-30 Winchester'] = { k: .0016, pen: 2, cs: [.051, .0053] };

// ---- black powder: single-shot breechloaders, early repeaters
const FB = fam({ e: 'powder', c: 'RIF', act: 'single', modes: ['semi'], mag: 1, rpm: 12, v: 410, dmg: 120, rec: [2.6, .8], rl: [2.6, 2.6], acc: 4, wt: 4.2, smoke: 1.4, reloadKind: 'falling', home: 'ww1',
  m: { t: 'falling', B: [.82, .0072], kind: 'martini', wd: 'walnut', mt: 'blued', pl: 'black' } });
FB({ id: 'martini', n: 'Martini–Henry Mk II', y: 1871, co: 'United Kingdom', cal: '.577/450 Martini', blurb: 'Lever drops the pivoting block: load, close, fire. Zulu War service rifle.' });
FB({ id: 'peabody', n: 'Peabody–Martini M1874', y: 1874, co: 'Ottoman Empire', cal: '.577/450 Martini' });
FB({ id: 'snider', n: 'Snider–Enfield Mk III', y: 1866, co: 'United Kingdom', cal: '.577 Snider', m: { kind: 'snider' }, blurb: 'A muzzle-loading Enfield converted with a side-hinged breech block.' });
FB({ id: 'werndl', n: 'Werndl–Holub M1867', y: 1867, co: 'Austria-Hungary', cal: '11mm Werndl', m: { kind: 'snider' } });
FB({ id: 'trapdoor', n: 'Springfield Model 1873 “Trapdoor”', y: 1873, co: 'United States', cal: '.45-70', m: { kind: 'trapdoor' }, blurb: 'The breech block flips up and forward like a trapdoor.' });
FB({ id: 'rollingblock', n: 'Remington Rolling Block', y: 1867, co: 'United States', cal: '.50-70', m: { kind: 'rolling' } });
FB({ id: 'sharps1874', n: 'Sharps Model 1874', y: 1874, co: 'United States', cal: '.45-70', acc: 2.4, m: { kind: 'sharps', B: [.86, .0068] }, blurb: 'The buffalo rifle. Long, heavy and accurate.' });
FB({ id: 'sharps1859', n: 'Sharps New Model 1859 Carbine', y: 1859, co: 'United States', cal: '.52 Sharps', acc: 6, m: { kind: 'sharps', B: [.55, .0071] } });
FB({ id: 'ferguson', n: 'Ferguson rifle', y: 1776, co: 'Great Britain', cal: '.62 rifle ball', v: 380, dmg: 120, acc: 6, rl: [5, 5], lock: .12, misfire: .1, smoke: 2, m: { kind: 'screw', lock: 'flint', B: [.85, .0079] }, blurb: 'A flintlock you load from the breech: one turn of the trigger guard drops the screw plug.' });
FB({ id: 'hall1819', n: 'Hall M1819 breech-loader', y: 1819, co: 'United States', cal: '.52 ball', v: 360, dmg: 110, acc: 9, rl: [5, 5], lock: .12, misfire: .1, smoke: 2, m: { kind: 'tipup', lock: 'flint' } });
const BOLT0 = G.WEAPON.k98k ? G.WEAPON.k98k.m : null;
if (BOLT0) {
  add({ id: 'dreyse', n: 'Dreyse needle gun M1841', e: 'powder', c: 'RIF', y: 1841, co: 'Prussia', cal: '15.4mm Dreyse', act: 'bolt', modes: ['bolt'], rpm: 12, mag: 1, v: 305, dmg: 120, rec: [2.4, .7], rl: [3, 3], acc: 7, wt: 4.7, smoke: 1.6, reloadKind: 'single', home: 'ww1', m: Object.assign({}, BOLT0, { mag: ['int'], wd: 'walnut', B: [.91, .0077], x: [] }), blurb: 'The first military bolt-action: a long needle pierces the paper cartridge to strike its primer.' });
  add({ id: 'chassepot', n: 'Chassepot M1866', e: 'powder', c: 'RIF', y: 1866, co: 'France', cal: '11mm Chassepot', act: 'bolt', modes: ['bolt'], rpm: 12, mag: 1, v: 410, dmg: 110, rec: [2.3, .7], rl: [2.8, 2.8], acc: 5, wt: 4.6, smoke: 1.4, reloadKind: 'single', home: 'ww1', m: Object.assign({}, BOLT0, { mag: ['int'], wd: 'walnut', B: [.8, .0057], x: [] }) });
}
const LEV0 = G.WEAPON.win1895 ? G.WEAPON.win1895.m : null;
if (LEV0) {
  const LV = o => add(Object.assign({ e: 'powder', c: 'RIF', act: 'lever', modes: ['lever'], rpm: 40, v: 340, dmg: 70, rec: [1.8, .6], rl: [.7, .7], acc: 6, wt: 4.2, smoke: 1.2, reloadKind: 'single', home: 'ww1', tubeLoad: true }, o, { m: Object.assign({}, LEV0, { mag: ['tube', .5], wd: 'walnut' }, o.m || {}) }));
  LV({ id: 'henry1860', n: 'Henry rifle', y: 1860, co: 'United States', cal: '.44 Henry', mag: 16, m: { mt: 'brass' }, blurb: '“That damned Yankee rifle that can be loaded on Sunday and fired all week.”' });
  LV({ id: 'win1866', n: 'Winchester Model 1866 “Yellow Boy”', y: 1866, co: 'United States', cal: '.44 Henry', mag: 13, m: { mt: 'brass' } });
  LV({ id: 'win1873', n: 'Winchester Model 1873', y: 1873, co: 'United States', cal: '.44-40', mag: 15, v: 370, dmg: 75, blurb: 'The gun that won the West.' });
  LV({ id: 'spencer', n: 'Spencer repeating rifle', y: 1860, co: 'United States', cal: '.56-56 Spencer', mag: 7, reloadKind: 'butt', tubeLoad: false, rl: [2.6, 2.6], blurb: 'Seven rounds in a tube through the butt; Blakeslee boxes carried ready-loaded tubes.' });
}

// ---- black powder: muzzle-loading long arms
const MU = fam({ e: 'powder', c: 'MUS', act: 'muzzle', modes: ['semi'], mag: 1, rpm: 10, v: 420, dmg: 140, rec: [3.4, 1.1], rl: [9, 9], acc: 40, wt: 4.6, lock: .12, misfire: .12, smoke: 2.2, reloadKind: 'muzzle', home: 'ww1',
  cal: '.75 musket ball', m: { t: 'musket', B: [1.1, .0105], lock: 'flint', stock: 'full', bands: 3, wd: 'walnut', mt: 'bright', pl: 'black', brass: true } });
MU({ id: 'brownbess', n: 'Land Pattern Musket “Brown Bess”', y: 1722, co: 'Great Britain', m: { B: [1.17, .0105] }, blurb: 'Bite the cartridge, prime the pan, pour, ram, present, fire. Three rounds a minute if you are good.' });
MU({ id: 'indiapattern', n: 'India Pattern Brown Bess', y: 1797, co: 'Great Britain', m: { B: [.99, .0105] } });
MU({ id: 'charleville', n: 'Charleville Model 1777', y: 1777, co: 'France', cal: '.69 musket ball', m: { B: [1.14, .0095], brass: false } });
MU({ id: 'spring1795', n: 'Springfield Model 1795', y: 1795, co: 'United States', cal: '.69 musket ball', m: { brass: false } });
MU({ id: 'potsdam', n: 'Potsdam Musket M1780', y: 1780, co: 'Prussia', m: { B: [1.04, .0105] } });
MU({ id: 'musketoon', n: 'Cavalry musketoon', y: 1770, co: 'France', cal: '.69 musket ball', wt: 3.2, acc: 50, m: { B: [.7, .0095], bands: 2 } });
MU({ id: 'baker', n: 'Baker rifle', y: 1800, co: 'Great Britain', cal: '.62 rifle ball', v: 400, dmg: 125, acc: 8, rl: [14, 14], m: { B: [.76, .0085], bands: 1, rifled: true, patchbox: true }, blurb: 'Rifled: deadly at 200 yards, but the tight patched ball takes a mallet to start.' });
MU({ id: 'kentucky', n: 'Pennsylvania “Kentucky” long rifle', y: 1750, co: 'British America', cal: '.45 rifle ball', v: 450, dmg: 95, acc: 6, rl: [13, 13], wt: 4.1, m: { B: [1.07, .0065], bands: 0, wd: 'maple', rifled: true, patchbox: true } });
MU({ id: 'jaeger', n: 'German Jäger rifle', y: 1750, co: 'Holy Roman Empire', cal: '.62 rifle ball', acc: 8, rl: [14, 14], m: { B: [.7, .0085], bands: 0, rifled: true, patchbox: true, stock: 'half' } });
MU({ id: 'jezail', n: 'Afghan jezail', y: 1800, co: 'Afghanistan', cal: '.54 rifle ball', acc: 9, rl: [13, 13], m: { B: [1.3, .0075], rifled: true, wd: 'wood_red' } });
MU({ id: 'blunderbuss', n: 'Brass blunderbuss', y: 1750, co: 'Great Britain', pellets: 12, dmg: 32, acc: 90, wt: 3.4, rec: [3.6, 1.4], m: { B: [.45, .012], bell: true, mt: 'brass', bands: 1 }, blurb: 'Bell-mouthed coach and ship gun loaded with a handful of shot.' });
MU({ id: 'arquebus', n: 'Matchlock arquebus', y: 1520, co: 'Spain', lock: .35, misfire: .18, rl: [14, 14], acc: 60, wt: 5, m: { lock: 'match', stock: 'club', bands: 0, brass: false } });
MU({ id: 'tanegashima', n: 'Tanegashima', y: 1543, co: 'Japan', cal: '.69 musket ball', lock: .3, misfire: .15, rl: [13, 13], acc: 45, m: { lock: 'match', stock: 'club', bands: 0, B: [1.0, .0095], wd: 'wood_red' } });
MU({ id: 'wheellock', n: 'Wheellock carbine', y: 1580, co: 'Holy Roman Empire', cal: '.62 rifle ball', lock: .22, misfire: .08, rl: [12, 12], acc: 35, m: { lock: 'wheel', B: [.75, .0085], bands: 0, stock: 'half' }, blurb: 'Wind the wheel with a spanner; a spinning steel wheel strikes sparks from pyrite.' });
MU({ id: 'nock', n: 'Nock volley gun', y: 1779, co: 'Great Britain', cal: '.52 ball', mag: 7, salvo: 7, rec: [7, 2.2], rl: [24, 24], acc: 45, wt: 5.5, smoke: 4, m: { nb: 7, B: [.5, .0066], bands: 1 }, blurb: 'Seven barrels fired at once from one flint. It broke shoulders.' });
MU({ id: 'girandoni', n: 'Girandoni air rifle', y: 1780, co: 'Austria', cal: '.46 air ball', act: 'semi', mag: 22, rpm: 40, v: 250, dmg: 70, lock: 0, misfire: 0, smoke: 0, rl: [4, 4], acc: 12, reloadKind: 'air', m: { air: true, lock: 'cap', bands: 1, B: [.85, .0058] }, blurb: 'A 22-shot repeating air rifle carried by Lewis and Clark. No smoke, no flash.' });
const PC = o => MU(Object.assign({ lock: .03, misfire: .02, rl: [11, 11], acc: 7, v: 290, dmg: 130 }, o, { m: Object.assign({ lock: 'cap', rifled: true, brass: false }, o.m || {}) }));
PC({ id: 'p1853', n: 'Pattern 1853 Enfield', y: 1853, co: 'United Kingdom', cal: '.577 Minié', m: { B: [.99, .0073] }, blurb: 'Percussion rifle-musket firing the hollow-based Minié bullet.' });
PC({ id: 'spring1861', n: 'Springfield Model 1861', y: 1861, co: 'United States', cal: '.58 Minié', m: { B: [1.02, .0074] } });
PC({ id: 'lorenz', n: 'Lorenz rifle M1854', y: 1854, co: 'Austria', cal: '.54 Minié', m: { B: [.95, .0069] } });
PC({ id: 'zouave', n: 'Remington “Zouave” 1863', y: 1863, co: 'United States', cal: '.58 Minié', m: { B: [.84, .0074], brass: true, bands: 2 } });
PC({ id: 'whitworth', n: 'Whitworth rifle', y: 1857, co: 'United Kingdom', cal: '.451 Whitworth', acc: 1.8, v: 440, dmg: 120, m: { B: [.84, .0057] }, blurb: 'Hexagonal-bored marksman rifle; Confederate sharpshooters hit targets at 1,000 yards.' });
PC({ id: 'hawken', n: 'Hawken plains rifle', y: 1823, co: 'United States', cal: '.54 rifle ball', acc: 6, v: 420, m: { B: [.86, .0069], stock: 'half', bands: 0 } });

// ---- black powder: pistols and cap-and-ball revolvers
const FP = fam({ e: 'powder', c: 'PST', act: 'muzzle', modes: ['semi'], mag: 1, rpm: 10, v: 260, dmg: 90, rec: [2.6, 1], rl: [7, 7], acc: 30, wt: 1.3, lock: .12, misfire: .12, smoke: 1.5, reloadKind: 'muzzle', home: 'ww1', cal: '.56 pistol ball',
  m: { t: 'fpistol', B: [.23, .0082], lock: 'flint', wd: 'walnut', mt: 'bright', pl: 'black', brass: true } });
FP({ id: 'seaservice', n: 'Sea Service pistol', y: 1756, co: 'Great Britain', m: { B: [.3, .0082] }, blurb: 'A heavy naval boarding pistol with a belt hook — and a brass butt for clubbing.' });
FP({ id: 'wogdon', n: 'Wogdon duelling pistol', y: 1780, co: 'Great Britain', cal: '.50 pistol ball', acc: 10, m: { B: [.25, .0074], brass: false } });
FP({ id: 'queenanne', n: 'Queen Anne turn-off pistol', y: 1720, co: 'Great Britain', cal: '.50 pistol ball', m: { B: [.13, .0085], rod: false } });
FP({ id: 'anix', n: 'Pistolet modèle An IX', y: 1801, co: 'France', m: { B: [.2, .0085] } });
FP({ id: 'harpers1805', n: 'Harpers Ferry Model 1805', y: 1805, co: 'United States', cal: '.54 rifle ball', m: { B: [.25, .0075] } });
FP({ id: 'blunderpistol', n: 'Dragon blunderbuss pistol', y: 1760, co: 'Great Britain', pellets: 8, dmg: 28, acc: 80, m: { B: [.22, .01], bell: true, mt: 'brass' } });
FP({ id: 'wheelpistol', n: 'Wheellock “puffer” pistol', y: 1580, co: 'Holy Roman Empire', lock: .22, misfire: .08, m: { lock: 'wheel', B: [.3, .0078] } });
FP({ id: 'bootpistol', n: 'Percussion boot pistol', y: 1840, co: 'United States', cal: '.36 cap & ball', lock: .03, misfire: .02, dmg: 60, m: { lock: 'cap', B: [.1, .0055], brass: false } });
const REV0 = G.WEAPON.nagant ? G.WEAPON.nagant.m : null;
if (REV0) {
  const RV = o => add(Object.assign({ e: 'powder', c: 'PST', act: 'rev', modes: ['semi'], rpm: 100, mag: 6, v: 280, dmg: 70, rec: [1.8, .6], rl: [16, 16], acc: 9, wt: 1.3, smoke: 1.3, reloadKind: 'caprev', home: 'ww1', misfire: .02, cal: '.44 cap & ball' }, o, { m: Object.assign({}, REV0, { pl: 'black', mt: 'blued' }, o.m || {}) }));
  RV({ id: 'colt_walker', n: 'Colt Walker', y: 1847, co: 'United States', dmg: 85, wt: 2.0, m: { B: [.23, .0066] }, blurb: 'Four and a half pounds of revolver for the Texas Rangers.' });
  RV({ id: 'navy1851', n: 'Colt 1851 Navy', y: 1851, co: 'United States', cal: '.36 cap & ball', dmg: 58, m: { B: [.19, .0055], mt: 'brass' } });
  RV({ id: 'army1860', n: 'Colt 1860 Army', y: 1860, co: 'United States', m: { B: [.2, .0066] } });
  RV({ id: 'rem1858', n: 'Remington 1858 New Army', y: 1858, co: 'United States', m: { B: [.2, .0066] } });
  RV({ id: 'paterson', n: 'Colt Paterson', y: 1836, co: 'United States', cal: '.36 cap & ball', mag: 5, dmg: 50, m: { B: [.19, .0055] } });
  RV({ id: 'adams', n: 'Beaumont–Adams', y: 1855, co: 'United Kingdom', m: { B: [.15, .0066] } });
  RV({ id: 'lemat', n: 'LeMat revolver', y: 1856, co: 'Confederate States', mag: 9, dmg: 62, m: { B: [.17, .0062] }, blurb: 'Nine .42 chambers around a central 20-gauge shot barrel.' });
  RV({ id: 'pepperbox', n: 'Allen pepperbox', y: 1837, co: 'United States', cal: '.36 cap & ball', dmg: 45, acc: 30, m: { B: [.09, .006] } });
}

// ---- black powder: cannon, mortars, multi-shot engines
const CN = fam({ e: 'powder', c: 'CAN', act: 'cannon', modes: ['semi'], mag: 1, rpm: 3, v: 440, dmg: 900, rec: [1.6, .4], rl: [14, 14], acc: 30, wt: 800, emplaced: true, heavy: true, lock: .45, misfire: .04, smoke: 7, reloadKind: 'cannon', home: 'ww1', cal: '12-pdr ball',
  m: { t: 'cannon', cal: .117, L: 1.66, car: 'field', wheel: .72, mt: 'bronze', wd: 'oak', pl: 'black' } });
CN({ id: 'falconet', n: 'Falconet', y: 1550, co: 'Venice', cal: '1-pdr ball', dmg: 300, v: 380, rl: [9, 9], wt: 150, m: { cal: .05, L: 1.4, wheel: .45, rings: 4 } });
CN({ id: 'swivelgun', n: 'Breech-loading swivel gun', y: 1600, co: 'Portugal', cal: '1-pdr ball', dmg: 280, v: 320, rl: [5, 5], wt: 90, reloadKind: 'chamber', m: { cal: .045, L: 1.0, car: 'swivel', breech: 'chamber', mt: 'iron', rings: 5 }, blurb: 'Pre-loaded breech chambers are wedged in behind the barrel: swap one, fire again.' });
CN({ id: 'minion', n: 'Minion', y: 1570, co: 'England', cal: '3-pdr ball', dmg: 520, v: 400, rl: [12, 12], wt: 400, m: { cal: .08, L: 2.4, wheel: .6 } });
CN({ id: 'culverin', n: 'Culverin', y: 1560, co: 'England', cal: '18-pdr ball', dmg: 1300, v: 460, rl: [28, 28], wt: 2000, acc: 22, m: { cal: .14, L: 3.3, wheel: .7, rings: 5 } });
CN({ id: 'sixpdr', n: '6-pounder field gun M1841', y: 1841, co: 'United States', cal: '6-pdr ball', dmg: 700, v: 450, rl: [12, 12], wt: 400, m: { cal: .094, L: 1.5, wheel: .7 } });
CN({ id: 'napoleon', n: '12-pounder “Napoleon” M1857', y: 1857, co: 'United States', blurb: 'The smoothbore workhorse of the Civil War: round shot, shell, case and canister.' });
CN({ id: 'parrott', n: '10-pounder Parrott rifle', y: 1861, co: 'United States', cal: '3-inch rifled shell', dmg: 450, v: 375, acc: 7, he: { r: 6, dmg: 160 }, m: { cal: .076, L: 1.88, mt: 'iron', band: true, rings: 0 } });
CN({ id: 'ordnance3', n: '3-inch Ordnance Rifle', y: 1861, co: 'United States', cal: '3-inch rifled shell', dmg: 450, v: 370, acc: 6, he: { r: 6, dmg: 160 }, m: { cal: .076, L: 1.83, mt: 'iron', rings: 0 } });
CN({ id: 'armstrong', n: 'Armstrong RBL 12-pounder', y: 1859, co: 'United Kingdom', cal: '3-inch rifled shell', dmg: 480, v: 380, acc: 5, rl: [9, 9], lock: .2, he: { r: 6, dmg: 170 }, reloadKind: 'screwbreech', m: { cal: .076, L: 1.9, mt: 'iron', breech: 'screw', rings: 2 }, blurb: 'Rifled breech-loader: unscrew the breech, drop in the vent piece, load from behind.' });
CN({ id: 'whitworth12', n: 'Whitworth 12-pounder', y: 1860, co: 'United Kingdom', cal: '3-inch rifled shell', dmg: 480, v: 450, acc: 4, he: { r: 6, dmg: 170 }, m: { cal: .07, L: 2.1, mt: 'iron', rings: 1 } });
CN({ id: 'long24', n: '24-pounder naval long gun', y: 1780, co: 'Great Britain', cal: '24-pdr ball', dmg: 1500, v: 470, rl: [20, 20], wt: 2500, m: { cal: .147, L: 2.9, car: 'naval', mt: 'iron' } });
CN({ id: 'carronade', n: '32-pounder carronade', y: 1779, co: 'Great Britain', cal: '32-pdr ball', dmg: 1700, v: 300, acc: 40, rl: [14, 14], wt: 860, m: { cal: .16, L: 1.2, car: 'slide', mt: 'iron', rings: 1 }, blurb: 'The “smasher”: short, light and devastating at close range.' });
CN({ id: 'dahlgren', n: 'Dahlgren 9-inch shell gun', y: 1850, co: 'United States', cal: '9-inch shell', dmg: 1400, v: 400, rl: [22, 22], wt: 4200, he: { r: 9, dmg: 300 }, m: { cal: .229, L: 2.7, car: 'naval', mt: 'iron', bottle: true, rings: 0 }, blurb: 'Bottle-shaped cast-iron shell gun.' });
CN({ id: 'mortar13', n: '13-inch sea-service mortar', y: 1800, co: 'Great Britain', cal: '13-inch shell', dmg: 900, v: 180, acc: 40, rl: [24, 24], wt: 4500, loft: .75, he: { r: 14, dmg: 500 }, m: { t: 'mortar_old', cal: .33, L: .9, car: 'mortarbed', mt: 'iron', rings: 1 } });
CN({ id: 'coehorn', n: 'Coehorn mortar', y: 1673, co: 'Dutch Republic', cal: '12-pdr ball', dmg: 500, v: 140, acc: 45, rl: [12, 12], wt: 80, loft: .75, he: { r: 6, dmg: 200 }, m: { t: 'mortar_old', cal: .14, L: .4, car: 'mortarbed', rings: 1 } });
CN({ id: 'monsmeg', n: 'Mons Meg', y: 1449, co: 'Burgundy', cal: 'Stone shot', dmg: 3000, v: 260, acc: 55, rl: [60, 60], wt: 6040, m: { cal: .5, L: 4.0, car: 'bed', mt: 'iron', rings: 8 }, blurb: 'A 6-tonne wrought-iron bombard that threw 150 kg stones.' });
CN({ id: 'dardanelles', n: 'Great Turkish Bombard', y: 1464, co: 'Ottoman Empire', cal: 'Bombard stone', dmg: 3500, v: 240, acc: 55, rl: [70, 70], wt: 16800, m: { cal: .63, L: 5.2, car: 'bed', rings: 4 } });
CN({ id: 'tsarcannon', n: 'Tsar Cannon', y: 1586, co: 'Tsardom of Russia', cal: 'Tsar case shot', pellets: 40, dmg: 140, v: 220, acc: 120, rl: [90, 90], wt: 39000, m: { cal: .89, L: 5.3, car: 'big', rings: 3 }, blurb: 'The biggest bombard ever cast by caliber; built to fire case shot. It probably never did.' });
CN({ id: 'gatling1862', n: 'Gatling gun Model 1862', y: 1862, co: 'United States', cal: '.58 Minié', act: 'crank', modes: ['auto'], rpm: 200, mag: 40, v: 300, dmg: 120, acc: 14, spin: .35, lock: 0, misfire: 0, smoke: 1.3, rl: [4, 4], wt: 100, reloadKind: 'gatling', m: { t: 'gatling', nb: 6, L: .8, wheel: .55, mt: 'brass' }, blurb: 'Turn the crank: six barrels revolve, each loading, firing and ejecting in turn.' });
CN({ id: 'gatling1874', n: 'Gatling gun Model 1874', y: 1874, co: 'United States', cal: '.45-70', act: 'crank', modes: ['auto'], rpm: 700, mag: 40, v: 400, dmg: 110, acc: 10, spin: .3, lock: 0, misfire: 0, smoke: 1.2, rl: [3.5, 3.5], wt: 90, reloadKind: 'gatling', m: { t: 'gatling', nb: 10, L: .82, wheel: .6, mt: 'brass' } });
CN({ id: 'puckle', n: 'Puckle gun', y: 1718, co: 'Great Britain', cal: '1.25-inch ball', act: 'cannon', mag: 9, rpm: 30, v: 300, dmg: 260, acc: 20, lock: .12, misfire: .1, smoke: 2.5, rl: [6, 6], wt: 60, reloadKind: 'chamber', m: { t: 'puckle', L: 1.0, mt: 'bronze' }, blurb: 'A flintlock revolver cannon on a tripod; swap in a pre-loaded nine-shot cylinder.' });
CN({ id: 'hwacha', n: 'Hwacha', y: 1409, co: 'Joseon Korea', cal: 'Singijeon arrow', act: 'cannon', mag: 100, salvo: 25, rpm: 120, v: 110, dmg: 60, acc: 90, lock: .5, misfire: .03, smoke: 3, rl: [25, 25], wt: 200, gyro: { v: 150, burn: .7 }, inc: true, reloadKind: 'hwacha', m: { t: 'hwacha' }, blurb: 'A handcart rack of 100 gunpowder rocket-arrows, launched 25 at a time.' });
CN({ id: 'congreve', n: 'Congreve rocket frame', y: 1805, co: 'United Kingdom', cal: 'Congreve rocket', act: 'cannon', mag: 1, v: 60, dmg: 120, acc: 120, lock: .4, misfire: .1, smoke: 4, rl: [8, 8], wt: 40, gyro: { v: 220, burn: 1.2 }, he: { r: 5, dmg: 140 }, inc: true, reloadKind: 'hwacha', m: { t: 'hwacha' } });

// ---- artillery
const AR = fam({ e: 'artillery', c: 'ART', act: 'breech', modes: ['semi'], mag: 1, rpm: 8, v: 500, dmg: 300, rec: [1.4, .3], rl: [6, 6], acc: 5, wt: 1500, emplaced: true, heavy: true, smoke: 3, reloadKind: 'breech', cal: '105mm', he: { r: 18, dmg: 300 }, home: 'now',
  m: { t: 'art', cal: .105, L: 2.4, kind: 'howitzer', trail: 'split', shield: true, brake: true, mt: 'og', breech: 'slide' } });
const MO = o => AR(Object.assign({ c: 'MOR', act: 'mortar', reloadKind: 'mortar', loft: .82, smoke: 1.6, rec: [1.1, .3], acc: 9, home: 'ww2' }, o, { m: Object.assign({ kind: 'mortar', mount: 'baseplate', brake: false, shield: false }, o.m || {}) }));
MO({ id: 'stokes', n: 'Stokes 3-inch mortar', y: 1915, co: 'United Kingdom', cal: '81mm mortar', v: 110, dmg: 120, rl: [2.4, 2.4], wt: 49, he: { r: 12, dmg: 170 }, home: 'ww1', m: { cal: .081, L: 1.0 }, blurb: 'Drop the bomb down the tube; it fires itself on the firing pin at the bottom.' });
MO({ id: 'brandt27', n: 'Brandt Mle 27/31', y: 1927, co: 'France', cal: '81mm mortar', v: 174, dmg: 130, rl: [2.4, 2.4], wt: 59, he: { r: 14, dmg: 190 }, m: { cal: .081, L: 1.27 } });
MO({ id: 'm2_60', n: 'M2 60 mm mortar', y: 1940, co: 'United States', cal: '60mm mortar', v: 158, dmg: 100, rl: [2, 2], wt: 19, he: { r: 10, dmg: 160 }, m: { cal: .06, L: .73 } });
MO({ id: 'm1_81', n: 'M1 81 mm mortar', y: 1935, co: 'United States', cal: '81mm mortar', v: 210, dmg: 130, rl: [2.6, 2.6], wt: 62, he: { r: 15, dmg: 220 }, m: { cal: .081, L: 1.26 } });
MO({ id: 'gr34', n: '8 cm Granatwerfer 34', y: 1934, co: 'Germany', cal: '81mm mortar', v: 211, dmg: 130, rl: [2.6, 2.6], wt: 62, he: { r: 15, dmg: 220 }, m: { cal: .081, L: 1.14, mt: 'grey' } });
MO({ id: 'm2_42', n: 'M2 4.2-inch mortar', y: 1928, co: 'United States', cal: '107mm mortar', v: 256, dmg: 160, rl: [3.4, 3.4], wt: 150, he: { r: 18, dmg: 280 }, m: { cal: .107, L: 1.22 } });
MO({ id: 'pm38', n: '120-PM-38', y: 1938, co: 'Soviet Union', cal: '120mm mortar', v: 272, dmg: 200, rl: [4.5, 4.5], wt: 282, he: { r: 21, dmg: 330 }, m: { cal: .12, L: 1.86, wheeled: true } });
MO({ id: 'm224', n: 'M224 60 mm mortar', y: 1978, co: 'United States', cal: '60mm mortar', v: 200, dmg: 100, rl: [1.8, 1.8], wt: 21, he: { r: 11, dmg: 170 }, home: 'now', m: { cal: .06, L: 1.0, mt: 'black' } });
MO({ id: 'm252', n: 'M252 81 mm mortar', y: 1987, co: 'United Kingdom', cal: '81mm mortar', v: 250, dmg: 140, rl: [2.4, 2.4], wt: 41, he: { r: 16, dmg: 240 }, home: 'now', m: { cal: .081, L: 1.27, mt: 'black' } });
MO({ id: 'm120', n: 'M120 120 mm mortar', y: 1991, co: 'United States', cal: '120mm mortar', v: 318, dmg: 210, rl: [4, 4], wt: 145, he: { r: 22, dmg: 350 }, home: 'now', m: { cal: .12, L: 1.76, mt: 'black' } });
MO({ id: 'tyulpan', n: '2B8 240 mm “Tyulpan” mortar', y: 1971, co: 'Soviet Union', cal: '240mm mortar', v: 362, dmg: 400, rl: [20, 20], wt: 3600, he: { r: 36, dmg: 750 }, reloadKind: 'breech', home: 'cold', m: { cal: .24, L: 5.3, breechLoad: true, wheeled: true }, blurb: 'The largest mortar in service: the tube is broken open and loaded from the breech.' });
MO({ id: 'karl', n: 'Karl-Gerät 600 mm', c: 'HVY', y: 1940, co: 'Germany', cal: '600mm Karl', v: 220, dmg: 2400, acc: 14, rl: [60, 60], wt: 124000, loft: .9, he: { r: 60, dmg: 2600 }, reloadKind: 'breech', m: { cal: .6, L: 4.2, mount: 'tracks', breechLoad: true, elev: .9, mt: 'grey' }, blurb: 'Self-propelled 600 mm siege mortar; each 2-tonne shell is craned into the breech.' });
MO({ id: 'littledavid', n: 'Little David 914 mm mortar', c: 'HVY', y: 1944, co: 'United States', cal: '914mm Little David', v: 380, dmg: 4000, acc: 18, rl: [90, 90], wt: 82800, loft: .85, he: { r: 80, dmg: 4200 }, m: { cal: .914, L: 6.7, mount: 'pit', elev: .85 }, blurb: 'The largest-calibre gun ever built: a 1.7-tonne bomb lowered into the muzzle by crane.' });
const AT = o => AR(Object.assign({ c: 'ATG', rl: [3, 3], acc: 3, home: 'ww2', he: { r: 3, dmg: 60 } }, o, { m: Object.assign({ kind: 'atgun', brake: false }, o.m || {}) }));
AT({ id: 'pak36', n: '3.7 cm Pak 36', y: 1936, co: 'Germany', cal: '37mm', v: 762, dmg: 260, wt: 328, he: { r: 2, dmg: 40 }, rl: [2.4, 2.4], m: { cal: .037, L: 1.66, wheel: .36, mt: 'grey', trail: 'split' }, blurb: 'The “door knocker”: fine in 1936, hopeless against a T-34.' });
AT({ id: 'm3_37', n: '37 mm gun M3', y: 1940, co: 'United States', cal: '37mm', v: 884, dmg: 270, wt: 414, rl: [2.4, 2.4], m: { cal: .037, L: 1.98, wheel: .38 } });
AT({ id: 'qf2', n: 'Ordnance QF 2-pounder', y: 1936, co: 'United Kingdom', cal: '2-pdr AP', v: 792, dmg: 280, wt: 814, rl: [2.4, 2.4], m: { cal: .04, L: 2.0, mount: 'cruciform', shield: true } });
AT({ id: 'qf6', n: 'Ordnance QF 6-pounder', y: 1941, co: 'United Kingdom', cal: '57mm AP', v: 853, dmg: 420, wt: 1140, m: { cal: .057, L: 2.56, wheel: .42 } });
AT({ id: 'qf17', n: 'Ordnance QF 17-pounder', y: 1943, co: 'United Kingdom', cal: '76.2mm', v: 884, dmg: 620, wt: 3040, m: { cal: .0762, L: 4.19, brake: true, wheel: .48 } });
AT({ id: 'pak40', n: '7.5 cm Pak 40', y: 1942, co: 'Germany', cal: '75mm', v: 790, dmg: 560, wt: 1425, m: { cal: .075, L: 3.45, brake: true, wheel: .45, mt: 'sand' } });
AT({ id: 'pak43', n: '8.8 cm Pak 43', y: 1943, co: 'Germany', cal: '88mm', v: 1000, dmg: 820, wt: 4400, rl: [4, 4], m: { cal: .088, L: 6.3, brake: true, mount: 'cruciform', mt: 'sand' } });
AT({ id: 'zis3', n: '76 mm divisional gun ZiS-3', y: 1941, co: 'Soviet Union', cal: '76.2mm', v: 680, dmg: 420, wt: 1116, he: { r: 10, dmg: 200 }, m: { cal: .0762, L: 3.4, brake: true, wheel: .45 } });
AT({ id: 'm5_3in', n: '3-inch gun M5', y: 1943, co: 'United States', cal: '76.2mm', v: 853, dmg: 600, wt: 2210, m: { cal: .0762, L: 3.8, wheel: .5 } });
AT({ id: 'mt12', n: '100 mm MT-12 “Rapira”', y: 1970, co: 'Soviet Union', cal: '100mm', v: 1575, dmg: 950, wt: 3100, rl: [4, 4], home: 'cold', m: { cal: .1, L: 6.3, brake: true, wheel: .5 } });
const RC = o => AR(Object.assign({ c: 'RCL', reloadKind: 'breech', rl: [4, 4], acc: 4, smoke: 4, home: 'cold', backblast: true }, o, { m: Object.assign({ kind: 'recoilless', mount: 'tripod', brake: false, shield: false }, o.m || {}) }));
RC({ id: 'm40rcl', n: 'M40 106 mm recoilless rifle', y: 1955, co: 'United States', cal: '106mm RCL', v: 503, dmg: 600, wt: 209, he: { r: 10, dmg: 420 }, m: { cal: .106, L: 3.4, mt: 'og' }, blurb: 'No recoil: the breech vents propellant gas rearward. Stay out of the backblast.' });
RC({ id: 'b10', n: 'B-10 82 mm recoilless rifle', y: 1954, co: 'Soviet Union', cal: '81mm mortar', v: 320, dmg: 380, wt: 72, he: { r: 8, dmg: 260 }, m: { cal: .082, L: 1.66 } });
RC({ id: 'carlgustaf', n: 'Carl Gustaf M4', y: 2014, co: 'Sweden', cal: '84mm', v: 255, dmg: 500, wt: 6.6, rec: [2.4, .6], acc: 3, emplaced: false, he: { r: 7, dmg: 320 }, home: 'now', m: { cal: .084, L: 1.0, mount: 'shoulder', mt: 'black' }, blurb: 'Shoulder-fired 84 mm recoilless rifle: open the venturi, load the round, close, fire.' });
const FG = o => AR(Object.assign({ c: 'ART', home: 'ww2' }, o, { m: Object.assign({ kind: 'howitzer' }, o.m || {}) }));
FG({ id: 'm1897_75', n: 'Canon de 75 modèle 1897', y: 1897, co: 'France', cal: '75mm', v: 575, dmg: 260, rl: [3, 3], wt: 1544, he: { r: 12, dmg: 260 }, home: 'ww1', m: { cal: .075, L: 2.72, spoked: true, wheel: .65, trail: 'box', brake: false, mt: 'grey' }, blurb: 'The first modern quick-firing field gun: its recoil mechanism keeps it from jumping, so it fires 15 rounds a minute.' });
FG({ id: 'qf18', n: 'Ordnance QF 18-pounder', y: 1904, co: 'United Kingdom', cal: '77mm', v: 492, dmg: 260, rl: [3.4, 3.4], wt: 1280, he: { r: 12, dmg: 260 }, home: 'ww1', m: { cal: .084, L: 2.46, spoked: true, wheel: .7, trail: 'box', brake: false } });
FG({ id: 'fk16', n: '7.7 cm FK 16', y: 1916, co: 'Germany', cal: '77mm', v: 602, dmg: 260, rl: [3.4, 3.4], wt: 1422, he: { r: 12, dmg: 260 }, home: 'ww1', m: { cal: .077, L: 2.7, spoked: true, wheel: .7, trail: 'box', brake: false, mt: 'grey' } });
FG({ id: 'qf25', n: 'Ordnance QF 25-pounder', y: 1940, co: 'United Kingdom', cal: '88mm', v: 532, dmg: 300, rl: [4, 4], wt: 1633, he: { r: 14, dmg: 300 }, m: { cal: .088, L: 2.47, trail: 'box', wheel: .5 } });
FG({ id: 'lefh18', n: '10.5 cm leFH 18', y: 1935, co: 'Germany', cal: '105mm', v: 470, dmg: 330, wt: 1985, m: { cal: .105, L: 2.94, wheel: .6, mt: 'grey', brake: false } });
FG({ id: 'm101', n: 'M101 105 mm howitzer', y: 1941, co: 'United States', cal: '105mm', v: 472, dmg: 330, wt: 2260, m: { cal: .105, L: 2.36, wheel: .5, brake: false } });
FG({ id: 'm102', n: 'M102 105 mm howitzer', y: 1964, co: 'United States', cal: '105mm', v: 494, dmg: 330, wt: 1496, home: 'cold', m: { cal: .105, L: 3.38, wheel: .45, trail: 'box', shield: false } });
FG({ id: 'l118', n: 'L118 Light Gun', y: 1976, co: 'United Kingdom', cal: '105mm', v: 709, dmg: 340, wt: 1858, home: 'cold', m: { cal: .105, L: 3.17, wheel: .45, trail: 'box', shield: false } });
FG({ id: 'd30', n: '122 mm howitzer D-30', y: 1960, co: 'Soviet Union', cal: '122mm', v: 690, dmg: 380, rl: [5, 5], wt: 3210, he: { r: 20, dmg: 380 }, home: 'cold', m: { cal: .122, L: 4.88, trail: 'tri', wheel: .5 }, blurb: 'Three trail legs swing out so it can traverse a full 360°.' });
FG({ id: 'ml20', n: '152 mm gun-howitzer ML-20', y: 1937, co: 'Soviet Union', cal: '152mm', v: 655, dmg: 450, rl: [7, 7], wt: 7270, he: { r: 25, dmg: 450 }, m: { cal: .152, L: 4.4, wheel: .65 } });
FG({ id: 'm114', n: 'M114 155 mm howitzer', y: 1942, co: 'United States', cal: '155mm', v: 563, dmg: 460, rl: [7, 7], wt: 5800, he: { r: 26, dmg: 460 }, m: { cal: .155, L: 3.79, wheel: .6, brake: false, shield: false } });
FG({ id: 'longtom', n: '155 mm Gun M1 “Long Tom”', y: 1938, co: 'United States', cal: '155mm', v: 853, dmg: 470, rl: [9, 9], wt: 13880, he: { r: 26, dmg: 460 }, m: { cal: .155, L: 7.0, wheel: .65, brake: false, shield: false } });
FG({ id: 'm198', n: 'M198 155 mm howitzer', y: 1979, co: 'United States', cal: '155mm', v: 684, dmg: 470, rl: [8, 8], wt: 7154, he: { r: 26, dmg: 470 }, home: 'cold', m: { cal: .155, L: 6.09, wheel: .6, shield: false } });
FG({ id: 'fh70', n: 'FH70', y: 1978, co: 'United Kingdom', cal: '155mm', v: 827, dmg: 470, rl: [7, 7], wt: 9300, he: { r: 26, dmg: 470 }, home: 'cold', m: { cal: .155, L: 6.02, wheel: .6, shield: false } });
FG({ id: 'mstab', n: '2A65 Msta-B', y: 1986, co: 'Soviet Union', cal: '152mm', v: 828, dmg: 460, rl: [7, 7], wt: 7000, he: { r: 25, dmg: 460 }, home: 'cold', m: { cal: .152, L: 7.2, wheel: .6, shield: true } });
FG({ id: 'm777', n: 'M777 155 mm howitzer', y: 2005, co: 'United States', cal: '155mm', v: 827, dmg: 480, rl: [7, 7], wt: 4200, he: { r: 26, dmg: 480 }, home: 'now', m: { cal: .155, L: 5.08, wheel: .5, shield: false, mt: 'grey' }, blurb: 'Titanium and aluminium: a 155 mm howitzer light enough to sling under a helicopter.' });
FG({ id: 'k18', n: '17 cm Kanone 18', c: 'HVY', y: 1941, co: 'Germany', cal: '173mm', v: 925, dmg: 520, rl: [12, 12], wt: 17520, he: { r: 28, dmg: 520 }, m: { cal: .173, L: 8.5, wheel: .65, shield: false, mt: 'grey', brake: false } });
FG({ id: 'm115', n: 'M115 203 mm howitzer', c: 'HVY', y: 1940, co: 'United States', cal: '203mm', v: 594, dmg: 600, rl: [12, 12], wt: 14515, he: { r: 32, dmg: 600 }, m: { cal: .203, L: 5.08, wheel: .65, shield: false, brake: false } });
FG({ id: 'b4', n: '203 mm howitzer B-4', c: 'HVY', y: 1931, co: 'Soviet Union', cal: '203mm', v: 607, dmg: 600, rl: [14, 14], wt: 17700, he: { r: 32, dmg: 600 }, m: { cal: .203, L: 5.1, mount: 'tracks', shield: false, brake: false } });
const AA = o => AR(Object.assign({ c: 'AAG', home: 'ww2', acc: 4 }, o, { m: Object.assign({ kind: 'aa', mount: 'cruciform', brake: false, shield: false }, o.m || {}) }));
AA({ id: 'bofors40', n: 'Bofors 40 mm L/60', y: 1934, co: 'Sweden', cal: '40mm Bofors', act: 'auto', modes: ['auto', 'semi'], rpm: 120, mag: 4, v: 881, dmg: 150, rl: [2.4, 2.4], wt: 2400, he: { r: 4, dmg: 120 }, reloadKind: 'clip', m: { cal: .04, L: 2.25, brake: false }, blurb: 'Four-round clips dropped into the auto-loader: the loader keeps feeding them as fast as he can.' });
AA({ id: 'flak38', n: '2 cm Flak 38', y: 1939, co: 'Germany', cal: '20mm Flak', act: 'auto', modes: ['auto', 'semi'], rpm: 450, mag: 20, v: 900, dmg: 70, rl: [3, 3], wt: 420, he: { r: 1.5, dmg: 60 }, reloadKind: 'clip', m: { cal: .02, L: 1.3, mt: 'grey', shield: true } });
AA({ id: 'flakvierling', n: '2 cm Flakvierling 38', y: 1940, co: 'Germany', cal: '20mm Flak', act: 'auto', modes: ['auto'], rpm: 1800, mag: 80, v: 900, dmg: 70, rl: [5, 5], wt: 1520, he: { r: 1.5, dmg: 60 }, reloadKind: 'clip', m: { cal: .02, L: 1.3, nb: 4, mt: 'grey' }, blurb: 'Four 20 mm cannon on one mount.' });
AA({ id: 'flak88', n: '8.8 cm Flak 36', y: 1936, co: 'Germany', cal: '88mm', rpm: 15, v: 840, dmg: 480, rl: [4, 4], wt: 7400, he: { r: 14, dmg: 450 }, m: { cal: .088, L: 4.94, shield: true, mt: 'grey' }, blurb: 'The famous “eighty-eight”: anti-aircraft gun turned tank killer.' });
AA({ id: 'zu23', n: 'ZU-23-2', y: 1960, co: 'Soviet Union', cal: '23×152mm', act: 'auto', modes: ['auto'], rpm: 2000, mag: 50, v: 970, dmg: 80, rl: [5, 5], wt: 950, he: { r: 2, dmg: 70 }, reloadKind: 'clip', home: 'cold', m: { cal: .023, L: 2.0, nb: 2, mount: 'wheels', wheel: .35, trail: 'box', shield: false } });
AA({ id: 'ks19', n: '100 mm KS-19', y: 1947, co: 'Soviet Union', cal: '100mm', rpm: 15, v: 900, dmg: 480, rl: [4, 4], wt: 9550, he: { r: 16, dmg: 460 }, home: 'cold', m: { cal: .1, L: 5.6, brake: true } });
AA({ id: 'm51', n: 'M51 Skysweeper', y: 1953, co: 'United States', cal: '75mm', act: 'auto', modes: ['auto', 'semi'], rpm: 45, mag: 10, v: 853, dmg: 300, rl: [6, 6], wt: 8800, he: { r: 10, dmg: 260 }, reloadKind: 'clip', home: 'cold', m: { cal: .075, L: 3.75 } });
const HV = o => AR(Object.assign({ c: 'HVY', home: 'ww1', rl: [30, 30], acc: 7, smoke: 6, rec: [2, .5] }, o, { m: Object.assign({ kind: 'siege', brake: false, shield: false }, o.m || {}) }));
HV({ id: 'bigbertha', n: '42 cm “Big Bertha” (M-Gerät)', y: 1914, co: 'Germany', cal: '420mm', v: 333, dmg: 2600, wt: 42600, he: { r: 58, dmg: 2600 }, rl: [40, 40], m: { cal: .42, L: 5.0, wheel: 1.0, trail: 'box', elev: .5, mt: 'grey' }, blurb: 'Krupp’s 420 mm siege howitzer smashed the Belgian forts in 1914.' });
HV({ id: 'skoda305', n: 'Škoda 30.5 cm Mörser M.11', y: 1911, co: 'Austria-Hungary', cal: '305mm', v: 381, dmg: 1800, wt: 20830, he: { r: 45, dmg: 1800 }, rl: [35, 35], m: { cal: .305, L: 3.06, mount: 'pit', elev: .6 } });
HV({ id: 'bl92', n: 'BL 9.2-inch howitzer', y: 1914, co: 'United Kingdom', cal: '234mm', v: 360, dmg: 900, wt: 13460, he: { r: 34, dmg: 900 }, rl: [20, 20], m: { cal: .234, L: 4.0, mount: 'pit', elev: .4 } });
HV({ id: 'parisgun', n: 'Paris Gun', y: 1918, co: 'Germany', cal: '211mm Paris', v: 1640, dmg: 500, wt: 256000, he: { r: 22, dmg: 500 }, rl: [50, 50], acc: 12, m: { cal: .211, L: 34, mount: 'rail', mt: 'grey', elev: .1 }, blurb: '34-metre barrel; shells reached the stratosphere on the way to Paris, 120 km away.' });
HV({ id: 'k5', n: '28 cm K5 “Leopold”', y: 1936, co: 'Germany', cal: '283mm', v: 1120, dmg: 1200, wt: 218000, he: { r: 40, dmg: 1200 }, rl: [40, 40], home: 'ww2', m: { cal: .283, L: 21.5, mount: 'rail', mt: 'sand' }, blurb: 'Railway gun nicknamed “Anzio Annie” by the Allies it shelled.' });
HV({ id: 'bl18rail', n: 'BL 18-inch railway howitzer', y: 1920, co: 'United Kingdom', cal: '457mm', v: 580, dmg: 2800, wt: 250000, he: { r: 60, dmg: 2800 }, rl: [45, 45], m: { cal: .457, L: 9.6, mount: 'rail', elev: .5 } });
HV({ id: 'gustav', n: '80 cm Schwerer Gustav', y: 1941, co: 'Germany', cal: '800mm', v: 820, dmg: 6000, wt: 1350000, he: { r: 90, dmg: 6000 }, rl: [120, 120], acc: 10, home: 'ww2', smoke: 10, rec: [3, .6], m: { cal: .8, L: 32.5, mount: 'rail', mt: 'grey', elev: .3 }, blurb: 'The largest gun ever used in combat: 1,350 tonnes on four parallel railway tracks.' });
HV({ id: 'atomicannie', n: 'M65 “Atomic Annie” 280 mm', y: 1953, co: 'United States', cal: '280mm', v: 625, dmg: 1300, wt: 75000, he: { r: 40, dmg: 1300 }, rl: [30, 30], home: 'cold', m: { cal: .28, L: 11.5, mount: 'tractors' }, blurb: 'Built to fire a nuclear shell (which it did, once, in 1953). Here: conventional HE.' });
const NV = o => AR(Object.assign({ c: 'NAV', home: 'ww2', acc: 4, smoke: 5 }, o, { m: Object.assign({ kind: 'naval', mount: 'turret', brake: false, shield: false, mt: 'haze' }, o.m || {}) }));
NV({ id: 'mk45', n: '5-inch/62 Mark 45', y: 1971, co: 'United States', cal: '127mm', act: 'auto', modes: ['auto', 'semi'], rpm: 20, mag: 20, v: 808, dmg: 360, rl: [8, 8], wt: 22000, he: { r: 16, dmg: 350 }, reloadKind: 'clip', home: 'cold', m: { cal: .127, L: 7.9 } });
NV({ id: 'oto76', n: 'OTO Melara 76 mm', y: 1964, co: 'Italy', cal: '76.2mm', act: 'auto', modes: ['auto', 'semi'], rpm: 120, mag: 80, v: 925, dmg: 230, rl: [8, 8], wt: 7500, he: { r: 10, dmg: 220 }, reloadKind: 'clip', home: 'cold', m: { cal: .0762, L: 4.7 } });
NV({ id: 'bl15', n: 'BL 15-inch Mk I', y: 1915, co: 'United Kingdom', cal: '381mm', v: 732, dmg: 2200, rl: [30, 30], wt: 100000, he: { r: 52, dmg: 2200 }, home: 'ww1', m: { cal: .381, L: 16.5, nb: 2 } });
NV({ id: 'iowa16', n: '16-inch/50 Mark 7', y: 1943, co: 'United States', cal: '406mm', v: 762, dmg: 2600, rl: [30, 30], wt: 121500, he: { r: 55, dmg: 2600 }, smoke: 9, m: { cal: .406, L: 20.3, nb: 2 }, blurb: 'Main battery of the Iowa class; a 1.2-tonne shell 38 km away.' });
NV({ id: 'yamato18', n: '46 cm Type 94 (Yamato)', y: 1940, co: 'Japan', cal: '460mm', v: 780, dmg: 3200, rl: [40, 40], wt: 165000, he: { r: 62, dmg: 3200 }, smoke: 10, m: { cal: .46, L: 20.7, nb: 2, mt: 'grey' } });
NV({ id: 'phalanx', n: 'Phalanx CIWS', y: 1980, co: 'United States', cal: '20×102mm', act: 'auto', modes: ['auto'], rpm: 4500, mag: 1550, v: 1100, dmg: 75, rl: [12, 12], wt: 6200, spin: .5, he: { r: 1, dmg: 40 }, reloadKind: 'clip', home: 'mod', m: { cal: .02, L: 1.5, rotary: true, dome: true, mt: 'white' }, blurb: 'The “R2-D2” close-in weapon system: a radar-directed rotary cannon.' });

// every special-model weapon gets the fields the attachment rules read
const SPT = ['break', 'falling', 'musket', 'fpistol', 'cannon', 'mortar_old', 'gatling', 'puckle', 'hwacha', 'art'];
for (const w of W) if (w.m && SPT.includes(w.m.t)) { w.m.mag = w.m.mag || ['int']; w.m.x = w.m.x || []; w.rl = w.rl.map(x => Math.min(35, x)); } // nobody waits two minutes for a reload, even on Gustav

// ------------------------------------------------------------------ period ammunition
const A = G.ATTACH, aa = o => { if (G.ATT[o.id]) return; A.push(o); G.ATT[o.id] = o; };
const AMMO = (id, n, eras, s, d, test) => aa({ id, slot: 'ammo', n, eras, s, d, test });
AMMO('am_ball', 'Round ball & paper cartridge', ['powder'], {}, 'A lead ball in a paper cartridge with its powder charge.', w => w.act === 'muzzle' && !w.pellets);
AMMO('am_buckball', 'Buck and ball', ['powder'], { pel: 4, dmgMul: .45, acc: 1.6 }, 'One musket ball and three buckshot: the American speciality.', w => w.act === 'muzzle' && w.c === 'MUS' && !w.m.rifled);
AMMO('am_minie', 'Minié ball', ['powder'], { acc: .55, v: .95 }, 'Hollow-based conical bullet that expands into the rifling.', w => w.act === 'muzzle' && w.m && w.m.rifled);
AMMO('am_shot', 'Round shot', ['powder'], {}, 'Solid iron ball. Bounces through ranks.', w => w.act === 'cannon' && !w.pellets && w.m.t !== 'hwacha' && w.m.t !== 'puckle');
AMMO('am_canister', 'Canister', ['powder'], { pel: 36, dmgMul: .09, acc: 3, v: .85 }, 'A tin can of musket balls: a giant shotgun.', w => w.act === 'cannon' && ['cannon'].includes(w.m.t));
AMMO('am_grape', 'Grapeshot', ['powder'], { pel: 9, dmgMul: .22, acc: 2.2 }, 'Nine iron balls in a canvas stand.', w => w.act === 'cannon' && w.m.t === 'cannon');
AMMO('am_chain', 'Chain shot', ['powder'], { pel: 2, dmgMul: .6, acc: 1.6 }, 'Two half-balls joined by chain, for cutting rigging.', w => w.act === 'cannon' && w.m.t === 'cannon' && w.m.car === 'naval');
AMMO('am_oldshell', 'Common shell (fused)', ['powder'], { he: { r: 7, dmg: 180 }, dmgMul: .4 }, 'A hollow ball full of powder with a burning fuse.', w => w.act === 'cannon' && ['cannon', 'mortar_old'].includes(w.m.t));
AMMO('am_hotshot', 'Heated shot', ['powder'], { inc: 1 }, 'Round shot heated red in a furnace to set ships alight.', w => w.act === 'cannon' && w.m.t === 'cannon');
AMMO('am_he', 'High explosive', ['artillery'], {}, 'Standard HE-FRAG shell.', w => w.e === 'artillery');
AMMO('am_ap', 'Armour-piercing (APCBC)', ['artillery'], { pen: 2, dmgMul: 1.5, he: { r: 2, dmg: 60 }, heK: .15 }, 'Capped, ballistic-capped AP shot.', w => w.e === 'artillery' && ['ATG', 'AAG', 'NAV', 'ART'].includes(w.c));
AMMO('am_apfsds', 'APFSDS dart', ['artillery'], { pen: 3, dmgMul: 1.8, v: 1.45, heK: .05 }, 'Fin-stabilised discarding-sabot penetrator.', w => w.e === 'artillery' && w.c === 'ATG');
AMMO('am_flak', 'Time-fused flak', ['artillery'], { heK: 1.35, dmgMul: .7 }, 'Bursts in the air: wider blast, weaker.', w => w.e === 'artillery' && ['AAG', 'NAV', 'ART'].includes(w.c));
AMMO('am_artcan', 'Canister / beehive', ['artillery'], { pel: 40, dmgMul: .12, heK: 0, acc: 4 }, 'Flechettes or balls for point-blank defence.', w => w.e === 'artillery' && ['ART', 'ATG', 'RCL'].includes(w.c));
AMMO('am_heat', 'HEAT', ['artillery'], { pen: 3, heK: .45, dmgMul: 1.3 }, 'Shaped-charge warhead.', w => w.e === 'artillery' && ['RCL', 'ATG'].includes(w.c));
AMMO('am_incmortar', 'White phosphorus', ['artillery'], { inc: 1, heK: .8 }, 'Smoke and fire.', w => w.e === 'artillery' && w.c === 'MOR');
// attachment rules for the two new eras: period ammunition, finishes and the defaults only;
// a bayonet fits military muskets and rifle-muskets
const okP = G.attachOK;
G.attachOK = function (wp, at) {
  const e = G.ERA[wp.e];
  if (at.eras) return (at.eras.includes(wp.e) || (wp.custom && wp.donors && wp.donors.some(d => G.WEAPON[d] && at.eras.includes(G.WEAPON[d].e)))) && (!at.test || at.test(wp));
  if (!e || !e.noWar) return okP(wp, at);
  if ((G.DEFAULT_IDS || []).includes(at.id)) return at.slot !== 'ammo' || !G.ATTACH.some(x => x.eras && x.eras.includes(wp.e) && (!x.test || x.test(wp)));
  if (at.slot === 'finish') return true;
  if (at.slot === 'side' && (at.id === 'bayonet' || at.as === 'bayonet')) return wp.c === 'MUS' || wp.c === 'RIF';
  return false;
};
G.attachFor = (wp, slot) => G.ATTACH.filter(at => at.slot === slot && G.attachOK(wp, at));
const defL = G.defaultLoadout;
G.defaultLoadout = function (wp) {
  const L = defL(wp);
  if (wp.e === 'powder' || wp.e === 'artillery') {
    const am = G.ATTACH.find(a => a.slot === 'ammo' && a.eras && a.eras.includes(wp.e) && (!a.test || a.test(wp)) && !a.s.pel && !a.s.inc && !a.s.he && !a.s.heK && !a.s.pen && !a.s.acc);
    L.ammo = am ? am.id : (wp.c === 'SG' ? 'am_buck' : 'am_fmj');
  }
  return L;
};
// new ammo stat keys: pel (set pellet count), heK (scale the weapon's explosive)
const rsP = G.resolveStats;
G.resolveStats = function (wp, L, st) {
  const S = rsP(wp, L, st);
  const at = G.ATT[(L || {}).ammo]; const s = at && at.s;
  if (s) {
    if (s.pel) { S.pellets = s.pel; }
    if (s.heK !== undefined && S.he) { S.he = s.heK > 0 ? { r: S.he.r * Math.sqrt(s.heK), dmg: S.he.dmg * s.heK } : null; }
  }
  return S;
};
})();
