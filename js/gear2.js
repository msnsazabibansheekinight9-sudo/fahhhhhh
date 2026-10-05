// ============================================================================
// Two new kit categories:
//   BOMB SUITS — EOD suits and helmets (Med-Eng EOD-8 / EOD 9 / EOD 10E,
//     SRS-5 search suit) and Spider blast overboots. Whole-body Kevlar
//     with a chest plate and a groin plate, a tall neck collar, a sealed visor.
//     They are made for blast and fragments: explosions do a fraction of the
//     damage. Rifle rounds still go through the soft parts. They weigh 30 kg+.
//   MEDIEVAL — knight armour from the Norman nasal helm to the 17th-century
//     cuirassier harness: helms, mail, brigandine, gambeson, full plate,
//     gauntlets and sabatons. Hardened plate (2–3 mm) stops fragments, spent
//     and low-velocity pistol rounds and every melee strike, but not rifles.
// Items carry `cat` ('bomb' | 'medieval') so the kit locker can group them.
// Limb coverage (`limbs`, a rating for arms and legs) and `blast` (damage
// multiplier against explosions and melee) extend G.armorHit.
// ============================================================================
'use strict';
(function () {
const G = window.G, PI = Math.PI, TAU = PI * 2;
const GEAR = G.GEAR;
const add = (slot, cat, list) => { for (const o of list) GEAR.push(Object.assign({ slot, cat, wt: 0, y: 2000, co: '—', d: '' }, o)); };

// ------------------------------------------------------------------ bomb suits
add('helmet', 'bomb', [
  { id: 'h_eod8', n: 'Med-Eng EOD-8 helmet', co: 'Canada', y: 1999, model: 'eod', col: '#3e4636', rating: 3.6, cut: 'full', visor: 3.4, wt: 3.4, blast: .3, d: 'Full-face EOD helmet with a thick acrylic/polycarbonate visor and a demist fan.' },
  { id: 'h_eod9', n: 'Med-Eng EOD 9 helmet', co: 'Canada', y: 2006, model: 'eod', col: '#4a5040', rating: 4, cut: 'full', visor: 3.8, wt: 3.6, blast: .25, d: 'Integrated comms, light and forced-air ventilation.' },
  { id: 'h_eod10', n: 'Med-Eng EOD 10E helmet', co: 'Canada', y: 2023, model: 'eod', col: '#5a5f52', rating: 4.3, cut: 'full', visor: 4, wt: 3.3, blast: .2, d: 'Current-generation EOD helmet with an electronic control unit.' },
  { id: 'h_srs5', n: 'Med-Eng SRS-5 search helmet', co: 'Canada', y: 2014, model: 'eodsearch', col: '#4a5040', rating: 3.4, cut: 'full', visor: 2.8, wt: 2.2, blast: .4, d: 'Lighter helmet for searching a route before the bomb is found.' },
]);
add('armor', 'bomb', [
  { id: 'a_eod8', n: 'Med-Eng EOD-8 bomb suit', co: 'Canada', y: 1999, model: 'eod', col: '#3e4636', soft: 3.6, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: false, fixed: { rating: 7.2, front: true, back: false, deg: .05 }, limbs: 2.8, blast: .25, wt: 30, d: 'Kevlar suit with a hard chest plate and groin plate. Built to survive a blast at arm\'s length.' },
  { id: 'a_eod9', n: 'Med-Eng EOD 9 bomb suit', co: 'Canada', y: 2006, model: 'eod', col: '#4a5040', soft: 4, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: false, fixed: { rating: 7.8, front: true, back: false, deg: .05 }, limbs: 3.2, blast: .2, wt: 33, d: 'The suit from "The Hurt Locker". Cooling vest, spine protector, quick-release.' },
  { id: 'a_eod10', n: 'Med-Eng EOD 10E bomb suit', co: 'Canada', y: 2023, model: 'eod', col: '#5a5f52', soft: 4.2, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: false, fixed: { rating: 9.5, front: true, back: false, deg: .04 }, limbs: 3.4, blast: .16, wt: 31, d: 'Lighter, more flexible and better protected than the EOD 9.' },
  { id: 'a_srs5', n: 'Med-Eng SRS-5 search suit', co: 'Canada', y: 2014, model: 'eodsearch', col: '#4a5040', soft: 3.4, cov: { neck: true, groin: true, sides: true, shoulders: true }, plates: true, limbs: 2.2, blast: .45, wt: 12, d: 'Search suit: lighter blast protection, takes standard plates.' },
]);
add('boots', 'bomb', [
  { id: 'b_spider', n: 'Med-Eng Spider blast overboots', co: 'Canada', y: 2003, model: 'spider', col: '#2a2a28', wt: 3.2, blastLeg: .35, d: 'Tall frame under the boot that keeps your foot off an anti-personnel mine.' },
]);
add('gloves', 'bomb', [
  { id: 'g_eodthin', n: 'Thin EOD gloves', co: 'Various', y: 1995, col: '#2a2a2a', wt: .05, d: 'Thin gloves for feeling wires.' },
]);

// ------------------------------------------------------------------ medieval
add('uniform', 'medieval', [
  { id: 'u_tabard_red', n: 'Heraldic surcoat (gules)', co: 'England', y: 1300, pat: ['solid', ['#7a1c1c']], wt: 1.2 },
  { id: 'u_tabard_blue', n: 'Heraldic surcoat (azure)', co: 'France', y: 1350, pat: ['solid', ['#22346a']], wt: 1.2 },
  { id: 'u_templar', n: 'Templar white mantle', co: 'Kingdom of Jerusalem', y: 1150, pat: ['solid', ['#d8d2c2']], wt: 1.4 },
  { id: 'u_arming', n: 'Arming doublet & hose', co: 'Italy', y: 1450, pat: ['solid', ['#4a3a2c']], wt: 1.6 },
]);
add('helmet', 'medieval', [
  { id: 'h_nasal', n: 'Norman nasal helm (c. 1066)', co: 'Normandy', y: 1066, model: 'nasal', col: '#8a8e92', rating: 1.2, cut: 'mid', wt: 1.6, d: 'Conical spangenhelm with a nose guard.' },
  { id: 'h_greathelm', n: 'Great helm (c. 1250)', co: 'England', y: 1250, model: 'greathelm', col: '#8a8e92', rating: 1.6, cut: 'full', visor: 1.6, wt: 2.3, d: 'Flat-topped barrel helm with eye slits and breaths.' },
  { id: 'h_kettle', n: 'Kettle hat (c. 1300)', co: 'Germany', y: 1300, model: 'kettle', col: '#8a8e92', rating: 1.4, cut: 'mid', wt: 1.8, d: 'Wide-brimmed infantry helmet — the ancestor of the Brodie.' },
  { id: 'h_bascinet', n: 'Hounskull bascinet & aventail (c. 1390)', co: 'Italy', y: 1390, model: 'bascinet', col: '#8f9397', rating: 1.8, cut: 'full', visor: 1.8, wt: 2.9, d: 'Pointed bascinet with a "pig-face" visor and a mail aventail.' },
  { id: 'h_armet', n: 'Armet (c. 1450)', co: 'Milan', y: 1450, model: 'armet', col: '#9aa0a6', rating: 2, cut: 'full', visor: 2, wt: 3.2, d: 'Fully enclosed Italian helmet with a hinged visor.' },
  { id: 'h_sallet', n: 'Gothic sallet & bevor (c. 1480)', co: 'Germany', y: 1480, model: 'sallet', col: '#a2a8ae', rating: 2, cut: 'full', visor: 2, wt: 3, d: 'Sweeping tail, vision slit, and a bevor guarding the chin.' },
  { id: 'h_close', n: 'Close helmet (c. 1550)', co: 'Germany', y: 1550, model: 'armet', col: '#8e9298', rating: 2.2, cut: 'full', visor: 2.2, wt: 3.4, d: 'Late plate helmet with a pivoting visor and bevor.' },
  { id: 'h_morion', n: 'Comb morion (c. 1580)', co: 'Spain', y: 1580, model: 'morion', col: '#9aa0a6', rating: 1.6, cut: 'mid', wt: 1.9, d: 'Tall comb and an upturned brim. Worn by pikemen and conquistadors.' },
  { id: 'h_lobster', n: 'Lobster-tail pot (c. 1640)', co: 'England', y: 1640, model: 'kettle', col: '#5a5e62', rating: 2.4, cut: 'mid', wt: 2.4, d: 'English Civil War helmet, proofed against pistol shot.' },
]);
add('armor', 'medieval', [
  { id: 'a_gambeson', n: 'Gambeson (padded jack)', co: 'Europe', y: 1200, model: 'gambeson', col: '#b8a888', soft: 1.1, cov: { neck: true, groin: true, shoulders: true }, plates: false, limbs: 1, blast: .75, wt: 3.5, d: 'Layers of quilted linen. Stops cuts and splinters, little else.' },
  { id: 'a_hauberk', n: 'Riveted mail hauberk', co: 'Europe', y: 1100, model: 'mail', col: '#8a8d90', soft: 1.4, cov: { neck: true, groin: true, shoulders: true }, plates: false, limbs: 1.3, blast: .5, wt: 11, d: 'Knee-length riveted rings over a gambeson. Defeats slashes; arrows and bullets go through.' },
  { id: 'a_brigandine', n: 'Brigandine (c. 1400)', co: 'Italy', y: 1400, model: 'brigandine', col: '#6a1a22', soft: 1.2, cov: { shoulders: true }, plates: false, fixed: { rating: 2.4, front: true, back: true, deg: .1 }, limbs: 1.2, blast: .45, wt: 9, d: 'Small steel plates riveted inside a velvet jacket.' },
  { id: 'a_milanese', n: 'Milanese harness (c. 1450)', co: 'Milan', y: 1450, model: 'plate', col: '#9aa0a6', soft: 1, cov: { neck: true, groin: true, shoulders: true }, plates: false, fixed: { rating: 2.6, front: true, back: true, deg: .08 }, limbs: 2, blast: .35, wt: 24, d: 'Smooth rounded Italian plate with large asymmetric pauldrons.' },
  { id: 'a_gothic', n: 'Gothic plate harness (c. 1480)', co: 'Germany', y: 1480, model: 'plate', col: '#a8aeb4', soft: 1, cov: { neck: true, groin: true, shoulders: true }, plates: false, fixed: { rating: 2.8, front: true, back: true, deg: .08 }, limbs: 2.2, blast: .32, wt: 25, gothic: true, d: 'Fluted, pointed German armour — complete head-to-toe plate.' },
  { id: 'a_cuirassier', n: 'Cuirassier armour (c. 1620)', co: 'Holy Roman Empire', y: 1620, model: 'plate', col: '#3a3e44', soft: 1, cov: { neck: true, groin: true, shoulders: true }, plates: false, fixed: { rating: 3.6, front: true, back: true, deg: .06 }, limbs: 2, blast: .3, wt: 32, d: 'Three-quarter armour with a breastplate "proofed" by firing a pistol at it — the dent is the proof mark.' },
]);
add('gloves', 'medieval', [
  { id: 'g_gauntlet', n: 'Hourglass gauntlets', co: 'Europe', y: 1350, col: '#8f9397', wt: .9, gauntlet: true, d: 'Flared steel cuffs and plated fingers.' },
  { id: 'g_mitten', n: 'Gothic mitten gauntlets', co: 'Germany', y: 1480, col: '#a8aeb4', wt: 1.1, gauntlet: true, mitten: true, d: 'Articulated finger plates in one mitten.' },
]);
add('boots', 'medieval', [
  { id: 'b_sabaton', n: 'Sabatons & greaves', co: 'Europe', y: 1450, model: 'sabaton', col: '#9aa0a6', wt: 2.8, d: 'Articulated steel shoes.' },
  { id: 'b_turnshoe', n: 'Leather turnshoes', co: 'Europe', y: 1200, model: 'turnshoe', col: '#4a3222', wt: .6, d: 'Soft, quiet, flat-soled shoes.' },
]);
G.GEARID = Object.fromEntries(GEAR.map(g => [g.id, g]));
G.gearFor = slot => GEAR.filter(g => g.slot === slot);
G.KIT_CATS = [['all', 'All'], ['mil', 'Military'], ['bomb', 'Bomb suits'], ['medieval', 'Medieval']];
G.KIT_PRESETS.push(
  { id: 'eod', n: 'EOD technician (Med-Eng EOD 9)', kit: { uniform: 'u_multicam', helmet: 'h_eod9', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_eod9', plates: 'p_none', gloves: 'g_eodthin', boots: 'b_spider', pack: 'k_none' } },
  { id: 'eodsearch', n: 'EOD search team (SRS-5)', kit: { uniform: 'u_us_ocp', helmet: 'h_srs5', face: 'f_none', nvg: 'n_none', comms: 'c_comtac', armor: 'a_srs5', plates: 'p_esapi', gloves: 'g_mechanix', boots: 'b_lowa', pack: 'k_assault' } },
  { id: 'knight', n: 'Knight, Gothic harness (1480)', kit: { uniform: 'u_tabard_red', helmet: 'h_sallet', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_gothic', plates: 'p_none', gloves: 'g_mitten', boots: 'b_sabaton', pack: 'k_none' } },
  { id: 'crusader', n: 'Crusader knight (1250)', kit: { uniform: 'u_templar', helmet: 'h_greathelm', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_hauberk', plates: 'p_none', gloves: 'g_gauntlet', boots: 'b_turnshoe', pack: 'k_none' } },
  { id: 'menatarms', n: 'Man-at-arms (1400)', kit: { uniform: 'u_tabard_blue', helmet: 'h_bascinet', face: 'f_none', nvg: 'n_none', comms: 'c_none', armor: 'a_brigandine', plates: 'p_none', gloves: 'g_gauntlet', boots: 'b_turnshoe', pack: 'k_none' } },
);

// ------------------------------------------------------------------ ballistics: limbs and blast
const ah0 = G.armorHit;
G.armorHit = function (kit, zone, loc, b, speed, st) {
  const A = G.GEARID[kit.armor] || {}, H = G.GEARID[kit.helmet] || {}, B = G.GEARID[kit.boots] || {}, Gl = G.GEARID[kit.gloves] || {};
  st = st || G.newArmorState();
  if (!b.cal) { // explosion or melee
    const r = ah0(kit, zone, loc, b, speed, st);
    let k = zone === 'head' ? (H.blast || (A.blast && A.cov && A.cov.neck ? Math.min(1, A.blast * 1.5) : 1)) : (A.blast || 1);
    if (zone === 'leg' && B.blastLeg) k = Math.min(k, B.blastLeg);
    if (zone === 'arm' && Gl.gauntlet) k = Math.min(k, .5);
    if (k < 1) return { mult: Math.min(r.mult, k), stopped: false, info: `Blast absorbed by ${zone === 'head' && H.blast ? H.n : A.n}` };
    return r;
  }
  if ((zone === 'arm' || zone === 'leg') && A.limbs) { // sleeves, greaves, cuisses, vambraces
    const cap = G.penCapability ? G.penCapability(b, speed || b.v0 || 1) : 5, hits = st.limb || 0, eff = A.limbs * Math.max(.4, 1 - .06 * hits);
    st.limb = hits + 1;
    if (cap <= eff) return { mult: .12, stopped: true, by: A.n, info: `STOPPED by ${A.n} (${zone === 'arm' ? 'arm' : 'leg'} defence)` };
    return { mult: Math.max(.5, Math.min(1, .6 + (cap - eff) / (cap + 4))), stopped: false, info: `PENETRATED ${A.n} (${zone})` };
  }
  return ah0(kit, zone, loc, b, speed, st);
};

// ------------------------------------------------------------------ perks
const gp0 = G.gearProps;
G.gearProps = function (g) {
  const R = gp0(g); if (!g || !['bomb', 'medieval'].includes(g.cat)) return R;
  if (g.slot === 'armor' || g.slot === 'uniform') { R.perks.length = 0; for (const k in R.mods) delete R.mods[k]; }
  const P = R.perks, M = R.mods, p = (n, d, good = true) => P.push([n, d, good]);
  if (g.cat === 'bomb') {
    if (g.slot === 'armor') { p('Blast protection', `Explosions do ${Math.round((g.blast || 1) * 100)}% damage.`); p('Full-body Kevlar', 'Arms and legs are covered too.'); if (g.wt > 20) p('Extremely heavy', 'Slow, and you tire quickly. Sprinting is a jog.', false); M.sway = 1.15; M.reload = 1.15; M.noise = 1.1; if (g.plates) { p('Plate pockets', 'Takes standard plates and has pouches for 2 magazines.'); M.mags = 2; } }
    if (g.slot === 'helmet') { p('Sealed visor', 'Face protection against blast and fragments.'); p('Demist fan & comms', 'Hear muffled; integrated radio.'); M.flash = .55; M.radio = 1; }
    if (g.slot === 'boots') { p('Mine overboots', 'Blast from below does far less to your legs.'); M.noise = 1.3; M.speed = .93; }
    if (g.slot === 'gloves') { p('Thin gloves', 'Full dexterity.'); M.reload = .98; }
  }
  if (g.cat === 'medieval') {
    if (g.slot === 'armor') {
      if (g.model === 'plate') { p('Full plate harness', 'Stops every blade and most fragments; only low-velocity pistol rounds bounce off.'); p('Limb plate', 'Vambraces, cuisses and greaves cover arms and legs.'); M.noise = 1.35; M.sway = 1.1; M.melee = 1.25; }
      else if (g.model === 'mail') { p('Riveted mail', 'Stops slashes and splinters; bullets go straight through.'); M.noise = 1.2; }
      else if (g.model === 'brigandine') { p('Brigandine plates', 'Steel lames inside the cloth: a light breastplate.'); M.noise = 1.1; }
      else { p('Quilted linen', 'Soft armour against cuts and fragments.'); }
      p(`Melee & blast ×${g.blast}`, 'Damage from strikes and explosions is reduced.');
    }
    if (g.slot === 'helmet') { if (g.visor) { p('Closed helm', 'Plate face protection, but a narrow view through the slits.', true); M.sway = 1.04; } }
    if (g.slot === 'gloves') { p('Gauntlets', 'Strikes land harder; fiddly reloads.'); M.melee = 1.3; M.reload = 1.25; M.recoil = .97; }
    if (g.slot === 'boots' && g.model === 'sabaton') { p('Sabatons', 'Clanking steel feet: loud.', false); M.noise = 1.35; M.speed = .97; }
    if (g.slot === 'boots' && g.model === 'turnshoe') { p('Soft soles', 'Very quiet.'); M.noise = .7; }
    if (g.slot === 'uniform') { p('Heraldic colours', 'Bright cloth: easy to see.', false); M.camo = 1.15; M.env = 'bright'; }
  }
  return R;
};

// ------------------------------------------------------------------ 3D models
let HM, MM, ADD;
const PG = () => G.geo;
const A = (geo, m, x, y, z, p, rx = 0, ry = 0, rz = 0) => { const o = ADD(geo, m, x, y, z, p); o.rotation.set(rx, ry, rz); return o; };
const steel = (c) => HM.mat(c || '#9aa0a6', .3, .85);
let _mail = null;
function mailMat() { if (_mail) return _mail; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#3a3c3e'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#b8bcc0'; x.lineWidth = 1.6;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 8 + (j % 2) * 4, j * 8, 3.4, 0, TAU); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.encoding = THREE.sRGBEncoding;
  return (_mail = G.mat({ color: '#c8ccd0', map: t, metalness: .8, roughness: .45 })); }
const L = (key, pts, seg = 22) => HM.gLathe('g2' + key, pts, seg);
const SPC = {}; const sphP = (r, seg, ps, pl, ts, tl) => SPC[[r, seg, ps, pl, ts, tl].join()] || (SPC[[r, seg, ps, pl, ts, tl].join()] = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1), ps, pl, ts, tl));

// helmets (head bone frame: skull centre ≈ (0,.04,0), -z is the face)
function helm(HD, H) {
  const { gBox, gSph, gCyl, gRBox } = PG(), m = steel(H.col), dk = HM.mat('#0a0a0a', .9), brass = HM.mat('#b08a3a', .35, .9);
  switch (H.model) {
    case 'eod': case 'eodsearch': {
      const big = H.model === 'eod', sh = HM.mat(H.col, .7, .05);
      const s = ADD(gSph(big ? .168 : .15, 22), sh, 0, .05, .012, HD); s.scale.set(1, big ? 1.06 : 1, 1.1);
      const v = ADD(gRBox(big ? .2 : .17, big ? .15 : .1, .02, .02), G.mat({ color: '#9fb8c0', roughness: .05, metalness: .1, transparent: true, opacity: .45, depthWrite: false }), 0, big ? .03 : .045, big ? -.18 : -.162, HD); v.rotation.x = -.12;
      A(gRBox(big ? .23 : .19, .018, .03, .008), sh, 0, big ? .11 : .1, big ? -.172 : -.155, HD, -.1);
      if (big) { A(gRBox(.2, .05, .06, .02), sh, 0, -.07, -.15, HD, .25); ADD(gRBox(.07, .045, .1, .015), HM.mat('#2a2a28', .6), 0, .2, .07, HD); ADD(gCyl(.008, .008, .02, 10), HM.mat('#f0f0d0', .2), .1, .1, -.13, HD); }
      break; }
    case 'nasal': {
      ADD(L('nasal', [[0, .2], [.03, .175], [.08, .1], [.112, .03], [.118, -.01], [.12, -.03], [0, -.03]]), m, 0, .04, 0, HD);
      ADD(gBox(.024, .09, .012), m, 0, -.01, -.118, HD);
      for (let i = 0; i < 4; i++) A(gBox(.012, .2, .006), brass, Math.sin(i * PI / 2) * .1, .1, -Math.cos(i * PI / 2) * .1, HD, 0, -i * PI / 2, 0);
      break; }
    case 'greathelm': {
      const g = ADD(L('great', [[0, .19], [.1, .19], [.122, .17], [.13, .1], [.132, -.06], [.128, -.15], [.12, -.16], [0, -.16]], 26), m, 0, .02, .006, HD); g.scale.set(1, 1, 1.08);
      for (const sx of [-1, 1]) ADD(gBox(.075, .01, .02), dk, sx * .05, .06, -.138, HD); // eye slits
      ADD(gBox(.022, .3, .012), brass, 0, .0, -.145, HD); ADD(gBox(.18, .02, .01), brass, 0, .085, -.14, HD); // cross reinforcement
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) ADD(gCyl(.004, .004, .02, 6), dk, sx * (.03 + (i % 3) * .018), -.04 - Math.floor(i / 3) * .03, -.14, HD).rotation.x = PI / 2; // breaths
      break; }
    case 'kettle': {
      ADD(L('ket', [[0, .17], [.05, .16], [.1, .11], [.122, .04], [.124, 0], [0, 0]]), m, 0, .04, 0, HD);
      const brim = ADD(L('ketb', [[.12, .01], [.2, -.025], [.205, -.03], [.2, -.034], [.12, .0]], 30), m, 0, .04, 0, HD); brim.scale.set(1, 1, 1.05);
      if (H.id === 'h_lobster') { for (let i = 0; i < 4; i++) A(gRBox(.2, .03, .04, .01), m, 0, .0 - i * .028, .13 + i * .02, HD, -.3 - i * .12); ADD(gBox(.012, .1, .01), m, 0, -.03, -.17, HD); }
      break; }
    case 'bascinet': {
      ADD(L('basc', [[0, .22], [.03, .2], [.09, .12], [.122, .04], [.126, -.06], [.12, -.1], [0, -.1]]), m, 0, .04, 0, HD);
      const vz = ADD(L('bascv', [[0, .13], [.02, .11], [.07, .04], [.1, 0], [0, 0]], 18), m, 0, .04, -.1, HD); vz.rotation.x = -PI / 2; vz.scale.set(1.15, 1, .9);
      for (const sx of [-1, 1]) A(gBox(.06, .008, .01), dk, sx * .045, .085, -.15, HD, 0, sx * .5, 0);
      for (let i = 0; i < 8; i++) ADD(gSph(.004, 5), dk, (i % 4 - 1.5) * .025, -.0 - Math.floor(i / 4) * .025, -.2 + Math.floor(i / 4) * .02, HD);
      ADD(L('avent', [[.125, 0], [.15, -.08], [.2, -.17], [.21, -.19], [.12, -.19], [.11, 0]], 24), mailMat(), 0, .0, .01, HD);
      break; }
    case 'armet': {
      ADD(L('armet', [[0, .2], [.06, .19], [.11, .14], [.13, .06], [.132, -.06], [.12, -.14], [.08, -.17], [0, -.17]], 24), m, 0, .03, .01, HD);
      const v = ADD(sphP(.13, 18, 0, PI, 0, PI / 2), m, 0, .04, .0, HD); v.scale.set(1, 1, 1.15); v.rotation.x = -.15;
      ADD(gBox(.17, .012, .02), dk, 0, .065, -.142, HD); for (const sx of [-1, 1]) ADD(gSph(.012, 8), brass, sx * .125, .05, -.02, HD);
      ADD(gBox(.012, .12, .01), m, 0, .0, -.15, HD);
      if (H.id === 'h_close') ADD(gRBox(.02, .02, .2, .008), m, 0, .2, .02, HD);
      break; }
    case 'sallet': {
      ADD(L('sal', [[0, .19], [.07, .17], [.115, .1], [.128, .02], [.13, -.02], [0, -.02]]), m, 0, .04, .01, HD);
      A(gRBox(.24, .05, .14, .02), m, 0, .02, .12, HD, -.45); // swept tail
      ADD(gBox(.19, .01, .02), dk, 0, .08, -.128, HD); // vision slit
      const bev = ADD(sphP(.125, 18, PI * .15, PI * .7, PI * .45, PI * .45), m, 0, -.02, -.01, HD); bev.rotation.y = PI; bev.scale.set(1, 1, 1.15); // bevor over the chin
      for (const sx of [-1, 1]) ADD(gSph(.008, 6), brass, sx * .12, .03, -.02, HD);
      break; }
    case 'morion': {
      ADD(L('mor', [[0, .17], [.06, .16], [.105, .1], [.12, .03], [.122, 0], [0, 0]]), m, 0, .04, 0, HD);
      ADD(gBox(.008, .08, .2), m, 0, .2, 0, HD);
      const br = ADD(L('morb', [[.12, .005], [.17, .01], [.2, .05], [.205, .06], [.118, .0]], 30), m, 0, .04, 0, HD); br.scale.set(.8, 1, 1.2);
      for (let i = 0; i < 6; i++) ADD(gSph(.006, 6), brass, Math.sin(i * PI / 3) * .12, .05, Math.cos(i * PI / 3) * .12, HD);
      break; }
  }
}

// body armour (S.chest / S.spine / S.hips bone frames)
function body(S, A0) {
  const { gBox, gSph, gRBox, gCyl } = PG(), C = S.chest, SP = S.spine, HP = S.hips;
  if (A0.model === 'eod' || A0.model === 'eodsearch') {
    const big = A0.model === 'eod', f = HM.mat(A0.col, .85, 0), dk = HM.mat('#2a2c26', .7), k = big ? 1 : .8;
    ADD(L('eodC' + k, [[0, -.1], [.21 + .05 * k, -.1], [.22 + .05 * k, .05], [.21 + .05 * k, .17], [.16 + .03 * k, .22], [0, .23]]), f, 0, 0, 0, C).scale.set(1.1, 1, .78);
    ADD(L('eodS' + k, [[0, -.05], [.2 + .03 * k, -.05], [.2 + .03 * k, .26], [0, .26]]), f, 0, 0, 0, SP).scale.set(1.08, 1, .8);
    ADD(L('eodN' + k, [[.1, -.02], [.15 + .02 * k, .02], [.16 + .02 * k, .12 * k + .04], [.13, .12 * k + .04], [.08, .0]], 22), f, 0, .2, 0, C); // tall neck collar
    if (big) { ADD(gRBox(.3, .34, .05, .03), f, 0, .02, -.2, C).rotation.x = .05; ADD(gRBox(.26, .3, .02, .02), dk, 0, .03, -.23, C); // chest plate pocket
      A(gRBox(.26, .3, .06, .03), f, 0, -.22, -.14, HP, .15); // groin flap
      ADD(gRBox(.2, .16, .08, .02), dk, 0, .02, .2, C); // cooling unit
      for (const sx of [-1, 1]) { const ep = ADD(gSph(.1, 14), f, sx * .22, .14, 0, C); ep.scale.set(1.15, .85, 1.1); } }
    else { ADD(gRBox(.28, .3, .03, .02), f, 0, .02, -.19, C); }
    return true;
  }
  const m = steel(A0.col), brass = HM.mat('#b08a3a', .35, .9);
  if (A0.model === 'plate') {
    ADD(L('cuir' + (A0.gothic ? 'g' : 'm'), [[0, -.09], [.2, -.09], [.215, .0], [.222, .1], [.2, .17], [.15, .205], [0, .215]], 28), m, 0, 0, 0, C).scale.set(1.1, 1, .72);
    if (A0.gothic) for (let i = 0; i < 5; i++) A(gBox(.006, .22, .012), m, (i - 2) * .04, .03, -.155 - Math.abs(i - 2) * -.004, C, 0, 0, (i - 2) * .12); // fluting
    else ADD(gBox(.012, .26, .012), m, 0, .05, -.158, C); // medial ridge
    ADD(L('plack', [[0, -.04], [.19, -.04], [.19, .16], [0, .16]], 26), m, 0, 0, 0, SP).scale.set(1.08, 1, .72);
    for (let i = 0; i < 3; i++) ADD(L('fauld' + i, [[.17 + i * .012, .02], [.18 + i * .012, -.04], [0, -.04], [0, .02]], 26), m, 0, .02 - i * .045, 0, HP).scale.set(1.08, 1, .78); // fauld lames
    for (const sx of [-1, 1]) { A(gRBox(.14, .16, .02, .01), m, sx * .09, -.2, -.13, HP, .2, 0, -sx * .1); // tassets
      const pa = ADD(sphP(.1, 14, 0, TAU, 0, PI * .55), m, sx * .21, .14, 0, C); pa.scale.set(A0.id === 'a_milanese' && sx < 0 ? 1.4 : 1.15, .9, 1.2); // pauldrons
      ADD(gSph(.008, 6), brass, sx * .14, .16, -.13, C); }
    ADD(L('gorg', [[.06, -.02], [.12, -.04], [.13, .0], [.075, .06], [.06, .06]], 24), m, 0, .2, 0, C); // gorget
    if (A0.id === 'a_cuirassier') { ADD(gSph(.012, 8), HM.mat('#202020', .6), .05, .08, -.16, C); } // the proof mark
    return true;
  }
  if (A0.model === 'mail') {
    const mm = mailMat();
    ADD(L('hauC', [[0, -.1], [.205, -.1], [.215, .1], [.19, .17], [.12, .21], [0, .215]]), mm, 0, 0, 0, C).scale.set(1.1, 1, .7);
    ADD(L('hauS', [[0, -.04], [.19, -.04], [.19, .26], [0, .26]]), mm, 0, 0, 0, SP).scale.set(1.08, 1, .74);
    ADD(L('hauH', [[.17, .1], [.2, -.1], [.22, -.4], [.12, -.4], [.12, .1]], 26), mm, 0, 0, 0, HP).scale.set(1.08, 1, .85); // skirt to the knees
    ADD(L('hauN', [[.07, -.02], [.13, -.04], [.12, .08], [.07, .08]], 20), mm, 0, .2, 0, C);
    const belt = ADD(HM.gTorus(.2, .012), HM.mat('#3a2616', .7), 0, .03, 0, HP); belt.rotation.x = PI / 2; belt.scale.set(1.05, .8, 1);
    return true;
  }
  if (A0.model === 'brigandine') {
    const v = HM.fabric(A0.col, .9);
    ADD(L('brigC', [[0, -.1], [.208, -.1], [.218, .1], [.19, .17], [.12, .205], [0, .21]]), v, 0, 0, 0, C).scale.set(1.1, 1, .7);
    ADD(L('brigS', [[0, -.04], [.192, -.04], [.192, .26], [0, .26]]), v, 0, 0, 0, SP).scale.set(1.08, 1, .74);
    for (let j = 0; j < 6; j++) for (let i = -3; i <= 3; i++) ADD(gSph(.005, 5), brass, i * .04, .15 - j * .045, -.152 + Math.abs(i) * .006, C);
    return true;
  }
  if (A0.model === 'gambeson') {
    const q = HM.fabric(A0.col, .95);
    ADD(L('gamC', [[0, -.1], [.21, -.1], [.222, .1], [.195, .17], [.12, .205], [0, .21]]), q, 0, 0, 0, C).scale.set(1.1, 1, .72);
    ADD(L('gamS', [[0, -.04], [.196, -.04], [.196, .26], [0, .26]]), q, 0, 0, 0, SP).scale.set(1.08, 1, .76);
    ADD(L('gamH', [[.18, .1], [.2, -.05], [.21, -.2], [.12, -.2], [.12, .1]], 24), q, 0, 0, 0, HP).scale.set(1.08, 1, .85);
    for (let i = 0; i < 7; i++) { const t = ADD(HM.gTorus(.21, .004), HM.fabric('#8a7a5a', .9), 0, .16 - i * .045, 0, i < 3 ? C : SP); t.rotation.x = PI / 2; t.scale.set(1.08, .74, 1); }
    return true;
  }
  return false;
}

// arm and leg defences on the IK arm meshes (unit length along y) and the leg bones
G.kitLimbs = function (S, kit, MMx, addFn) {
  HM = G.HM; MM = MMx; ADD = addFn;
  const A0 = G.GEARID[kit.armor] || {}; if (!A0.limbs) return;
  const { gSph } = PG();
  let mt;
  if (A0.model === 'plate') mt = steel(A0.col);
  else if (A0.model === 'mail') mt = mailMat();
  else mt = HM.fabric(A0.col, .9);
  const eod = A0.model === 'eod' || A0.model === 'eodsearch', bulk = eod ? (A0.model === 'eod' ? .028 : .016) : A0.model === 'plate' ? .01 : .006;
  for (const a of S.arms) {
    ADD(L('rere' + bulk, [[0, -.46], [.064 + bulk, -.44], [.068 + bulk, -.1], [.062 + bulk, .3], [.058 + bulk, .44], [0, .46]], 16), mt, 0, 0, 0, a.upper);
    ADD(L('vamb' + bulk, [[0, -.46], [.052 + bulk, -.44], [.056 + bulk, -.2], [.05 + bulk, .3], [.044 + bulk, .44], [0, .46]], 16), mt, 0, 0, 0, a.fore);
    if (A0.model === 'plate') { const c = ADD(gSph(.06, 12), mt, 0, 0, 0, a.elbow); c.scale.set(1.1, 1.1, 1.1); }
    else if (eod) ADD(gSph(.058 + bulk, 12), mt, 0, 0, 0, a.elbow);
  }
  for (const l of S.legs) {
    ADD(L('cuis' + bulk, [[0, -.43], [.066 + bulk, -.42], [.082 + bulk, -.3], [.094 + bulk, -.1], [.09 + bulk, .0], [0, .02]], 16), mt, 0, 0, 0, l.hip).scale.set(1, 1, .98);
    ADD(L('grea' + bulk, [[0, -.4], [.048 + bulk, -.38], [.058 + bulk, -.24], [.066 + bulk, -.12], [.062 + bulk, -.03], [0, -.02]], 16), mt, 0, 0, 0, l.knee).scale.set(1, 1, .97);
    if (A0.model === 'plate' || eod) { const pk = ADD(sphP(.064, 12, 0, TAU, 0, PI * .6), mt, 0, 0, -.02, l.knee); pk.rotation.x = -PI / 2; pk.scale.set(1, 1, .8); }
  }
};

// wrap the kit entry points so the new categories use their own models
const kh0 = G.kitHead, kb0 = G.kitBody, kbt0 = G.kitBoot, khd0 = G.kitHand;
G.kitHead = function (S, kit, MMx, addFn) {
  const H = G.GEARID[kit.helmet] || {};
  if (!H.cat) return kh0(S, kit, MMx, addFn);
  HM = G.HM; MM = MMx; ADD = addFn; helm(S.head, H);
  kh0(S, Object.assign({}, kit, { helmet: 'h_none', nvg: 'n_none', comms: H.model === 'eod' ? 'c_none' : kit.comms }), MMx, addFn);
};
G.kitBody = function (S, kit, MMx, addFn) {
  const A0 = G.GEARID[kit.armor] || {};
  if (!A0.cat) return kb0(S, kit, MMx, addFn);
  HM = G.HM; MM = MMx; ADD = addFn;
  kb0(S, Object.assign({}, kit, { armor: 'a_none' }), MMx, addFn);
  body(S, A0);
};
G.kitBoot = function (knee, ankle, kit, MMx, addFn) {
  const B = G.GEARID[kit.boots] || {};
  if (!B.cat || B.model === 'turnshoe') return kbt0(knee, ankle, B.model === 'turnshoe' ? Object.assign({}, kit, { boots: 'b_jungle' }) : kit, MMx, addFn);
  HM = G.HM; ADD = addFn;
  const { gBox, gRBox } = PG();
  kbt0(knee, ankle, Object.assign({}, kit, { boots: 'b_combat' }), MMx, addFn);
  if (B.model === 'spider') { const f = HM.mat('#2a2a28', .6); ADD(gRBox(.13, .05, .3, .015), f, 0, -.115, -.05, ankle); for (const sx of [-1, 1]) for (const z of [-.15, .05]) ADD(gBox(.012, .06, .012), HM.mat('#6a6a64', .4, .6), sx * .055, -.09, z, ankle); ADD(gRBox(.12, .1, .03, .01), f, 0, .02, .06, ankle); }
  if (B.model === 'sabaton') { const m = steel(B.col); for (let i = 0; i < 5; i++) A(gRBox(.11, .03, .06, .012), m, 0, -.03 + i * .002, -.2 + i * .045, ankle, .15); ADD(L('sabg', [[0, -.06], [.06, -.06], [.058, .08], [0, .08]], 14), m, 0, 0, 0, ankle); }
};
G.kitHand = function (hand, kit, MMx, addFn, side) {
  const Gl = G.GEARID[kit.gloves] || {};
  if (!Gl.gauntlet) return khd0(hand, kit, MMx, addFn, side);
  HM = G.HM; ADD = addFn;
  const { gRBox } = PG(), m = steel(Gl.col);
  ADD(L('gcuff', [[0, -.09], [.062, -.09], [.05, -.04], [.042, .0], [0, .0]], 14), m, 0, 0, 0, hand);
  ADD(gRBox(.078, .05, .05, .014), m, 0, .045, -.002, hand);
  if (Gl.mitten) for (let i = 0; i < 3; i++) ADD(gRBox(.078, .018, .056, .006), m, 0, .078 + i * .012, -.012, hand);
  else for (let i = 0; i < 4; i++) ADD(gRBox(.016, .04, .05, .005), m, -.027 + i * .018, .085, -.012, hand);
};
})();
