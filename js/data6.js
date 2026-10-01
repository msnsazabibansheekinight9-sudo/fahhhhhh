// ============================================================================
// Armory expansion: four more slots (backup sight / magnifier, pistol grip,
// trigger & action, sling), about 200 more real-world parts, a real weight for
// every part, and perks that change how the gun works in the field:
//   variable-power scopes (mouse wheel), flip-to-side magnifiers, canted and
//   piggyback sights (H), folding / collapsing stocks (O), removable
//   suppressors (U), rangefinders, ballistic computers, night and thermal
//   optics, strobe lights, extra fire modes, quick-change barrels.
// Stat keys added here (see G.resolveStats): zmin lrf bc nv thermal illum alt
//   rle stf sway heat swap addModes magAdd lum strobe fold coll stun qc
//   tracerCol wt (kg) cal (calibre filter) req (needs a 1x / magnified optic)
// ============================================================================
'use strict';
(function () {
const G = window.G;
const A = G.ATTACH, a = o => A.push(o);
const LONG = ['RIF', 'SR', 'DMR', 'BR', 'AR', 'CAR', 'LMG'];
const TAC = ['AR', 'CAR', 'BR', 'LMG', 'DMR', 'SMG', 'SG'];
const RIFLE = ['AR', 'CAR', 'BR', 'DMR', 'LMG'];
const PREC = ['SR', 'DMR', 'BR'];

G.SLOTS = [
  ['optic', 'Optic'], ['aux', 'Backup sight / magnifier'], ['muzzle', 'Muzzle'], ['barrel', 'Barrel'], ['under', 'Underbarrel'], ['side', 'Lug / side rail'],
  ['mag', 'Magazine'], ['grip', 'Pistol grip'], ['trigger', 'Trigger & action'], ['stock', 'Stock'], ['sling', 'Sling'], ['ammo', 'Ammunition'], ['finish', 'Finish'],
];

// ------------------------------------------------------------------ weights (kg) and perks for the original parts
const WT = { aldis: .6, win_a5: .45, gew_zf: .55, zf39: .6, zf4: .62, pu: .27, m84: .5, unertl: .9, no32: .9, type97: .5, m73: .4, m3snip: 6.6, pso1: .58, art: .8, redfield: .45, colt3x: .3, aimpoint_e: .3, aug_scope: 0, kobra: .25, reddot: .34, holo: .32, acog: .42, susat: .9, g36_dual: 0, m3a: .7, leupold10: .74, pm2: .96, lpvo: .6, holo_mag: .68, xm157: 1.05, nxs: 1.17, rmr: .03,
  maxim: .3, cutts: .17, flash: .08, comp: .09, brake: .2, pbs1: .3, sup: .5, sup_mod: .55, sten_sup: .4,
  brl_short: -.3, brl_long: .35, brl_heavy: .8, brl_fluted: -.15, bipod: .38, vgrip: .1, agrip: .06, handstop: .03, m203: 1.36, gp25: 1.5, thompson_vfg: .12,
  bayonet: .45, wirecut: .3, laser: .22, peq2: .2, lasergrip: .04, light: .13, dbal: .3,
  mag_ext: .2, mag_drum: .9, mag_fast: .25, thompson50: 2.2, ppsh35: -.2, mp18box: -.3, lewis97: .6, pedersen: .9, smle_20: .3, cmag: 1.1, rpk75: 1.2, belt200: 2, mg42_belt: 3, glock33: .1, mag_pmag: -.05,
  stk_none: -.5, stk_carbine: -.1, stk_heavy: .4, stk_monte: -.1, stk_c96: .7, stk_brace: .2 };
for (const at of A) if (at.wt === undefined) at.wt = WT[at.id] || 0;
const P = (id, o) => { const at = A.find(x => x.id === id); if (at) Object.assign(at.s, o); };
P('lpvo', { zmin: 1.5 }); P('leupold10', { zmin: 4.5 }); P('pm2', { zmin: 5 }); P('nxs', { zmin: 7 }); P('art', { zmin: 3 }); P('redfield', { zmin: 3 });
P('xm157', { zmin: 1.5, lrf: 1, bc: 1, illum: 1 }); P('holo_mag', { alt: { k: 'flip', zoom: 1, ret: 'holo' } });
P('acog', { illum: 1 }); P('reddot', { illum: 1 }); P('holo', { illum: 1 }); P('rmr', { illum: 1 }); P('kobra', { illum: 1 }); P('aimpoint_e', { illum: 1 }); P('susat', { illum: 1 }); P('lpvo', { illum: 1 }); P('nxs', { illum: 1 }); P('pm2', { illum: 1 }); P('g36_dual', { illum: 1 });
P('m3snip', { nv: 1 }); P('psy_hellsight', { thermal: 1 }); P('psy_oracle', { lrf: 1, bc: 1, illum: 1, zmin: 2 });
P('stk_carbine', { coll: 1 }); P('stk_none', {}); P('light', { lum: 600 }); P('dbal', { lum: 800, strobe: 1 });
P('sup', { qd: 1 }); P('sup_mod', { qd: 1 }); P('pbs1', { qd: 1 }); P('maxim', { qd: 1 });
P('mag_fast', { rle: .75 }); P('mag_pmag', { rle: .92 }); P('bipod', { swap: 1.05 });
P('am_tracer', {}); P('brl_heavy', { heat: .7 }); P('brl_fluted', { heat: .85 }); P('brl_short', { heat: 1.2 });

// ------------------------------------------------------------------ optics
// red dots and holographic sights (1x)
a({ id: 'comp_m2', slot: 'optic', n: 'Aimpoint CompM2 (M68 CCO)', e0: 3, cls: TAC, needs: 'rail', wt: .21, s: { zoom: 1, ret: 'dot', ads: 1.04, illum: 1 }, d: 'The red dot the US Army adopted in 2000 as the M68 Close Combat Optic.' });
a({ id: 't2', slot: 'optic', n: 'Aimpoint T-2 Micro', e0: 4, cls: TAC, needs: 'rail', wt: .1, s: { zoom: 1, ret: 'dot', ads: 1.01, illum: 1 }, d: 'Tiny 2 MOA dot. Barely adds any weight.' });
a({ id: 'aim_pro', slot: 'optic', n: 'Aimpoint PRO', e0: 4, cls: TAC, needs: 'rail', wt: .22, s: { zoom: 1, ret: 'dot', ads: 1.03, illum: 1 }, d: 'Police / patrol red dot with a 3-year battery.' });
a({ id: 'acro', slot: 'optic', n: 'Aimpoint ACRO P-2', e0: 4, cls: ['PST', 'SMG', 'CAR', 'SG'], needs: 'rail', wt: .06, as: 'rmr', s: { zoom: 1, ret: 'dot', ads: 1.02, illum: 1 }, d: 'Enclosed-emitter mini dot: rain and mud cannot block it.' });
a({ id: 'romeo5', slot: 'optic', n: 'SIG Romeo5', e0: 4, cls: TAC, needs: 'rail', wt: .14, s: { zoom: 1, ret: 'dot', ads: 1.03, illum: 1 }, d: 'Budget 2 MOA dot with motion-activated illumination.' });
a({ id: 'mro', slot: 'optic', n: 'Trijicon MRO', e0: 4, cls: TAC, needs: 'rail', wt: .13, s: { zoom: 1, ret: 'dot', ads: 1.02, illum: 1 }, d: 'Wide 25 mm objective for a big field of view.' });
a({ id: 'eotech512', slot: 'optic', n: 'EOTech 512', e0: 3, cls: TAC, needs: 'rail', wt: .31, as: 'holo', s: { zoom: 1, ret: 'holo', ads: 1.06, illum: 1 }, d: 'AA-battery holographic sight, 65 MOA ring.' });
a({ id: 'xps2', slot: 'optic', n: 'EOTech XPS2-0', e0: 4, cls: TAC, needs: 'rail', wt: .25, as: 'holo', s: { zoom: 1, ret: 'holo', ads: 1.04, illum: 1 }, d: 'Short holographic sight that leaves rail space behind it.' });
a({ id: 'hs510c', slot: 'optic', n: 'Holosun HS510C', e0: 4, cls: TAC, needs: 'rail', wt: .24, as: 'holo', s: { zoom: 1, ret: 'holo', ads: 1.04, illum: 1 }, d: 'Open reflex sight with a solar panel and titanium hood.' });
a({ id: 'hs507c', slot: 'optic', n: 'Holosun HS507C X2', e0: 4, cls: ['PST', 'SMG', 'SG'], needs: 'rail', wt: .04, as: 'rmr', s: { zoom: 1, ret: 'dot', ads: 1.02, illum: 1 }, d: 'Pistol dot with a selectable circle-dot reticle.' });
a({ id: 'dpp', slot: 'optic', n: 'Leupold DeltaPoint Pro', e0: 4, cls: ['PST', 'SMG', 'SG', 'CAR'], needs: 'rail', wt: .06, as: 'rmr', s: { zoom: 1, ret: 'dot', ads: 1.02, illum: 1 }, d: 'Large-window pistol dot.' });
a({ id: 'docter', slot: 'optic', n: 'Docter Sight II', e0: 3, cls: ['PST', 'SMG', 'SG'], needs: 'rail', wt: .025, as: 'rmr', s: { zoom: 1, ret: 'dot', ads: 1.02, illum: 1 }, d: 'The original German mini reflex sight.' });
a({ id: 'okp7', slot: 'optic', n: 'OKP-7 collimator', e0: 3, cls: ['AR', 'CAR', 'LMG', 'SMG', 'SG'], only_family: 'ak', wt: .25, as: 'kobra', s: { zoom: 1, ret: 'dot', ads: 1.04, illum: 1 }, d: 'Low Russian dovetail red dot. Co-witnesses with the iron sights.' });
a({ id: 'pk120', slot: 'optic', n: 'Kalashnikov PK-120', e0: 4, cls: ['AR', 'CAR', 'LMG', 'SMG'], only_family: 'ak', wt: .26, as: 'kobra', s: { zoom: 1, ret: 'dot', ads: 1.04, illum: 1 }, d: 'Picatinny collimator issued with the AK-12.' });
a({ id: 'ultradot', slot: 'optic', n: 'Ultra Dot (1985)', e0: 2, e1: 3, cls: TAC, wt: .2, s: { zoom: 1, ret: 'dot', ads: 1.05, illum: 1 }, d: 'Early tube red dot used by IPSC shooters and Delta.' });
a({ id: 'armson', slot: 'optic', n: 'Armson OEG', e0: 2, e1: 3, cls: TAC, wt: .2, s: { zoom: 1, ret: 'dot', ads: 1.04 }, d: 'Occluded eye gunsight: a tritium dot in an opaque tube, used with both eyes open. No batteries.' });
// prisms and fixed magnified optics
a({ id: 'ta01', slot: 'optic', n: 'Trijicon ACOG TA01NSN 4×32', e0: 3, cls: RIFLE, needs: 'rail', wt: .28, as: 'acog', s: { zoom: 4, ret: 'acog', ads: 1.18 }, d: 'Tritium-only ACOG: no fibre, works the same day and night.' });
a({ id: 'ta11', slot: 'optic', n: 'Trijicon ACOG TA11 3.5×35', e0: 4, cls: RIFLE, needs: 'rail', wt: .4, as: 'acog', s: { zoom: 3.5, ret: 'acog', ads: 1.2, illum: 1, alt: { k: 'piggy', zoom: 1, ret: 'dot' } }, d: 'USMC RCO with an RMR on top. Press H to use the piggyback dot up close.' });
a({ id: 'elcan_c79', slot: 'optic', n: 'ELCAN C79 3.4×', e0: 3, cls: RIFLE, needs: 'rail', wt: .46, s: { zoom: 3.4, ret: 'post', ads: 1.2, illum: 1 }, d: 'Canadian and Dutch service optic. Very tough.' });
a({ id: 'specterdr', slot: 'optic', n: 'ELCAN SpecterDR 1×/4×', e0: 4, cls: RIFLE, needs: 'rail', wt: .65, s: { zoom: 4, ret: 'acog', ads: 1.22, illum: 1, alt: { k: 'switch', zoom: 1.25, ret: 'dot' } }, d: 'Dual-role optic. Press H to throw the lever between 1× and 4×.' });
a({ id: 'pso1m2', slot: 'optic', n: 'PSO-1M2 4×', e0: 3, cls: ['AR', 'DMR', 'LMG', 'BR', 'SR'], only_family: 'ak', wt: .6, as: 'pso1', s: { zoom: 4, ret: 'pso', ads: 1.25, illum: 1 }, d: 'Modernised PSO-1 with a battery-lit reticle.' });
a({ id: '1p29', slot: 'optic', n: '1P29 "Tulip" 4×', e0: 3, cls: ['AR', 'LMG', 'CAR'], only_family: 'ak', wt: .8, s: { zoom: 4, ret: 'pso', ads: 1.25 }, d: 'Russian universal sight with a range scale for the RPK-74.' });
a({ id: 'zf3x4', slot: 'optic', n: 'HK Zf 3×4', e0: 2, only: ['g3', 'g3sg1', 'hk21', 'hk33', 'mg3', 'psg1'], wt: .48, s: { zoom: 3, ret: 'post', ads: 1.22 }, d: 'Claw-mounted HK scope with a 100–600 m elevation drum.' });
a({ id: 'suit', slot: 'optic', n: 'L2A2 SUIT 4×', e0: 2, e1: 3, only: ['fal', 'l1a1'], wt: .9, s: { zoom: 4, ret: 'post', ads: 1.25, illum: 1 }, d: 'British "Sight Unit Infantry Trilux" with a tritium pointer.' });
a({ id: 'specter_os', slot: 'optic', n: 'ELCAN SpecterOS 4×', e0: 4, cls: ['LMG', 'AR', 'BR'], needs: 'rail', wt: .58, s: { zoom: 4, ret: 'acog', ads: 1.2, illum: 1 }, d: 'Fixed 4× with a BDC to 1000 m for machine guns.' });
// variable-power scopes: mouse wheel changes magnification when scoped
a({ id: 'shortdot', slot: 'optic', n: 'Schmidt & Bender ShortDot 1.1–4×', e0: 3, cls: RIFLE, needs: 'rail', wt: .6, s: { zoom: 4, zmin: 1.5, ret: 'lpvo', ads: 1.22, illum: 1 }, d: 'The first true LPVO. Scroll to change power.' });
a({ id: 'razor110', slot: 'optic', n: 'Vortex Razor HD Gen III 1–10×', e0: 4, cls: RIFLE, needs: 'rail', wt: .6, s: { zoom: 10, zmin: 1.5, ret: 'lpvo', ads: 1.28, illum: 1 }, d: 'Wide-range LPVO for designated marksmen.' });
a({ id: 'atacr18', slot: 'optic', n: 'Nightforce ATACR 1–8×', e0: 4, cls: RIFLE, needs: 'rail', wt: .52, s: { zoom: 8, zmin: 1.5, ret: 'lpvo', ads: 1.26, illum: 1 }, d: 'SOCOM-issued first-focal-plane LPVO.' });
a({ id: 'vudu', slot: 'optic', n: 'EOTech Vudu 1–6×', e0: 4, cls: RIFLE, needs: 'rail', wt: .5, s: { zoom: 6, zmin: 1.5, ret: 'lpvo', ads: 1.24, illum: 1 }, d: 'Second-focal-plane LPVO with a bright daylight dot.' });
a({ id: 'mk5hd', slot: 'optic', n: 'Leupold Mark 5HD 5–25×56', e0: 4, cls: PREC, needs: 'rail', wt: .85, s: { zoom: 25, zmin: 5, ret: 'mil_xt', ads: 1.55, illum: 1 }, d: 'US SOCOM precision scope. Scroll to change power.' });
a({ id: 'mk6', slot: 'optic', n: 'Leupold Mark 6 3–18×44', e0: 4, cls: PREC, needs: 'rail', wt: .67, s: { zoom: 18, zmin: 3, ret: 'mil_xt', ads: 1.45, illum: 1 }, d: 'Compact long-range scope.' });
a({ id: 'premier', slot: 'optic', n: 'Premier Heritage 3–15×50', e0: 4, cls: PREC, needs: 'rail', wt: .9, s: { zoom: 15, zmin: 3, ret: 'mildot', ads: 1.5 }, d: 'The scope on the M2010 Enhanced Sniper Rifle.' });
a({ id: 'k525i', slot: 'optic', n: 'Kahles K525i 5–25×56', e0: 4, cls: PREC, needs: 'rail', wt: .99, s: { zoom: 25, zmin: 5, ret: 'mil_xt', ads: 1.56, illum: 1 }, d: 'Austrian competition scope with a left-side parallax knob.' });
a({ id: 'm40a3_unertl', slot: 'optic', n: 'Unertl 10× (M40A3)', e0: 3, cls: ['SR'], needs: 'rail', wt: .73, s: { zoom: 10, ret: 'mildot', ads: 1.45 }, d: 'Fixed 10× USMC sniper scope with a bullet-drop cam.' });
a({ id: 'swfa10', slot: 'optic', n: 'SWFA SS 10×42', e0: 4, cls: PREC, needs: 'rail', wt: .65, s: { zoom: 10, ret: 'mildot', ads: 1.42 }, d: 'Rugged fixed-power budget scope.' });
a({ id: 'pso_svd', slot: 'optic', n: 'POSP 8×42 (SVD)', e0: 3, cls: ['SR', 'DMR'], only_family: 'ak', wt: .7, as: 'pso1', s: { zoom: 8, ret: 'pso', ads: 1.38, illum: 1 }, d: 'Russian side-mount 8× sniper sight.' });
// night, thermal and computer optics
a({ id: 'pvs2', slot: 'optic', n: 'AN/PVS-2 Starlight scope', e0: 2, e1: 2, cls: ['RIF', 'BR', 'AR', 'DMR', 'SR', 'LMG'], wt: 2.7, s: { zoom: 4, ret: 'cross', ads: 1.5, mob: -1, nv: 1 }, d: 'Vietnam-era first-generation night scope. Green image through the glass.' });
a({ id: 'pvs4', slot: 'optic', n: 'AN/PVS-4 night sight', e0: 2, cls: ['BR', 'AR', 'DMR', 'LMG', 'CAR'], wt: 1.7, s: { zoom: 3.6, ret: 'cross', ads: 1.4, mob: -1, nv: 1 }, d: 'Second-generation night weapon sight.' });
a({ id: 'pvs10', slot: 'optic', n: 'AN/PVS-10 day/night sniper sight', e0: 3, cls: ['SR', 'DMR'], needs: 'rail', wt: 1.7, s: { zoom: 8.5, ret: 'mildot', ads: 1.5, nv: 1 }, d: 'Integrated day/night scope of the M24. Night image when scoped.' });
a({ id: 'pvs22', slot: 'optic', n: 'Leupold Mk 4 + AN/PVS-22 clip-on', e0: 4, cls: PREC, needs: 'rail', wt: 1.6, s: { zoom: 10, zmin: 3.5, ret: 'mildot', ads: 1.5, nv: 1 }, d: 'Day scope with an image-intensifier clipped in front. Night image when scoped.' });
a({ id: '1pn93', slot: 'optic', n: '1PN93-2 night sight', e0: 3, only_family: 'ak', cls: ['AR', 'LMG', 'DMR'], wt: 2, s: { zoom: 3.5, ret: 'pso', ads: 1.4, mob: -1, nv: 1 }, d: 'Russian dovetail image-intensifier sight.' });
a({ id: 'pas13', slot: 'optic', n: 'AN/PAS-13 thermal weapon sight', e0: 3, cls: RIFLE, needs: 'rail', wt: 1.4, s: { zoom: 3, ret: 'cross', ads: 1.35, mob: -1, thermal: 1 }, d: 'White-hot thermal. People glow, smoke and darkness do not hide them.' });
a({ id: 'reap', slot: 'optic', n: 'Trijicon REAP-IR', e0: 4, cls: RIFLE, needs: 'rail', wt: .73, s: { zoom: 2.5, ret: 'cross', ads: 1.25, thermal: 1 }, d: 'Compact thermal scope.' });
a({ id: 'thermion', slot: 'optic', n: 'Pulsar Thermion 2 LRF XP50', e0: 4, cls: PREC.concat(['AR', 'LMG']), needs: 'rail', wt: .95, s: { zoom: 16, zmin: 2.5, ret: 'mil_xt', ads: 1.4, thermal: 1, lrf: 1 }, d: 'Thermal riflescope with a built-in laser rangefinder.' });
a({ id: 'smash', slot: 'optic', n: 'Smart Shooter SMASH 2000', e0: 4, cls: RIFLE, needs: 'rail', wt: 1.2, s: { zoom: 2, ret: 'xm157', ads: 1.28, mob: -1, lrf: 1, bc: 1, illum: 1 }, d: 'Fire-control sight: measures range, shows the corrected aim point.' });
a({ id: 'wraith', slot: 'optic', n: 'Sightmark Wraith 4–32× digital', e0: 4, cls: RIFLE.concat(['SR']), needs: 'rail', wt: .95, s: { zoom: 16, zmin: 4, ret: 'duplex', ads: 1.4, nv: 1 }, d: 'Digital day/night scope with an IR illuminator.' });
// historic
a({ id: 'm81_scope', slot: 'optic', n: 'M81 / M82 2.2× (M1C)', e0: 1, e1: 2, only: ['garand', 'm1c', 'm1903a4'], wt: .5, as: 'm84', s: { zoom: 2.2, ret: 'cross', ads: 1.25 }, d: 'Lyman-made post-war M1C scope.' });
a({ id: 'pu_svt', slot: 'optic', n: 'PU 3.5× (SVT-40 mount)', e0: 1, e1: 2, only: ['svt40'], wt: .6, s: { zoom: 3.5, ret: 'post', ads: 1.3 }, d: 'Claw-mounted PU on the SVT-40 sniper.' });
a({ id: 'type99_snip', slot: 'optic', n: 'Type 99 sniper 4×', e0: 1, e1: 1, only: ['type99', 'arisaka38'], wt: .55, s: { zoom: 4, ret: 'cross', ads: 1.3 }, d: 'Japanese offset sniper scope.' });

// ------------------------------------------------------------------ backup sights and magnifiers (new slot)
a({ id: 'aux_none', slot: 'aux', n: 'None', e0: 0, s: {}, d: '' });
a({ id: 'g33', slot: 'aux', n: 'EOTech G33 3× magnifier', e0: 3, cls: TAC, needs: 'rail', wt: .38, req: '1x', s: { alt: { k: 'mag', zoom: 3 }, ads: 1.03 }, d: 'Flip-to-side magnifier behind a red dot. Press H to flip it in or out.' });
a({ id: '3xmag', slot: 'aux', n: 'Aimpoint 3XMag-1', e0: 3, cls: TAC, needs: 'rail', wt: .33, req: '1x', s: { alt: { k: 'mag', zoom: 3 }, ads: 1.03 }, d: 'Aimpoint 3× magnifier on a twist mount. Press H to flip.' });
a({ id: '6xmag', slot: 'aux', n: 'Aimpoint 6XMag-1', e0: 4, cls: RIFLE, needs: 'rail', wt: .5, req: '1x', s: { alt: { k: 'mag', zoom: 6 }, ads: 1.05 }, d: '6× magnifier for long shots through a dot. Press H to flip.' });
a({ id: 'vmx3t', slot: 'aux', n: 'Vortex VMX-3T 3×', e0: 4, cls: TAC, needs: 'rail', wt: .31, req: '1x', s: { alt: { k: 'mag', zoom: 3 }, ads: 1.02 }, d: 'Magnifier with a flip-to-side mount. Press H.' });
a({ id: 'buis45', slot: 'aux', n: 'Dueck Defense 45° offset iron sights', e0: 4, cls: RIFLE, needs: 'rail', wt: .1, s: { alt: { k: 'offset', zoom: 1, ret: 'irons' } }, d: 'Canted iron sights. Press H to roll the rifle and use them up close.' });
a({ id: 'rmr45', slot: 'aux', n: 'Offset RMR (45° mount)', e0: 4, cls: RIFLE, needs: 'rail', wt: .1, s: { alt: { k: 'offset', zoom: 1, ret: 'dot' } }, d: 'Trijicon RMR on a canted mount beside your scope. Press H to roll onto it.' });
a({ id: 'piggy_rmr', slot: 'aux', n: 'Piggyback RMR (top of optic)', e0: 4, cls: RIFLE.concat(['SR']), needs: 'rail', wt: .08, req: 'mag', s: { alt: { k: 'piggy', zoom: 1, ret: 'dot' } }, d: 'A mini dot on top of a magnified scope. Press H to look over the scope.' });
a({ id: 'kac45', slot: 'aux', n: 'KAC 45° offset micro sights', e0: 3, cls: RIFLE, needs: 'rail', wt: .08, s: { alt: { k: 'offset', zoom: 1, ret: 'irons' } }, d: 'Knight\'s Armament canted backup irons. Press H to roll onto them.' });

// ------------------------------------------------------------------ muzzles
const SUP = (o) => a(Object.assign({ slot: 'muzzle', as: 'sup' }, o, { s: Object.assign({ sup: 1, qd: 1, flash: .05, ads: 1.1, rv: .9 }, o.s) }));
SUP({ id: 'aac_m42000', n: 'AAC M4-2000', e0: 3, cls: ['AR', 'CAR', 'DMR'], needs: 'rail', wt: .51, s: { rv: .88 }, d: 'SOCOM-tested 5.56 suppressor on a 51T mount.' });
SUP({ id: 'kac_nt4', n: 'KAC NT4 QDSS', e0: 3, cls: ['AR', 'CAR', 'DMR', 'LMG'], wt: .5, s: { rv: .88 }, d: 'Knight\'s Armament quick-detach suppressor used by Navy SEALs.' });
SUP({ id: 'omega36', n: 'SilencerCo Omega 36M', e0: 4, cls: LONG.concat(['SMG']), needs: 'rail', wt: .43, s: { loud: .9 }, d: 'Multi-calibre modular can; adds little length in short form.' });
SUP({ id: 'flow556', n: 'Huxwrx Flow 556K', e0: 4, cls: ['AR', 'CAR', 'DMR'], needs: 'rail', wt: .45, s: { rv: .9, heat: .85 }, d: 'Flow-through design: almost no gas in your face and less fouling, so it runs cooler.' });
SUP({ id: 'socom762', n: 'SureFire SOCOM762-RC2', e0: 4, cls: ['BR', 'DMR', 'SR', 'LMG'], needs: 'rail', wt: .6, s: { rv: .86 }, d: '7.62 mm full-auto-rated suppressor.' });
SUP({ id: 'ultra9', n: 'Thunder Beast Ultra 9', e0: 4, cls: ['SR', 'DMR'], needs: 'rail', wt: .4, s: { rv: .88, ads: 1.12 }, d: 'Light titanium precision-rifle can.' });
SUP({ id: 'sl5', n: 'A-TEC / ASE Utra SL5', e0: 4, cls: ['BR', 'SR', 'DMR', 'AR'], wt: .55, s: { rv: .86 }, d: 'Over-barrel Scandinavian suppressor: reaches back over the barrel to stay short.' });
SUP({ id: 'osprey45', n: 'SilencerCo Osprey 45', e0: 4, cls: ['PST', 'SMG'], wt: .26, s: { ads: 1.08 }, d: 'Eccentric pistol can: sits below the bore so you can still see the sights.' });
SUP({ id: 'gm9', n: 'Gemtech GM-9', e0: 4, cls: ['PST', 'SMG'], wt: .14, s: { ads: 1.05 }, d: 'Tiny wet-capable 9 mm suppressor.' });
SUP({ id: 'rotex', n: 'B&T Rotex-V', e0: 4, cls: ['AR', 'CAR', 'SMG'], wt: .38, s: { rv: .9 }, d: 'Swiss suppressor of the APC rifles.' });
SUP({ id: 'pbs4', n: 'PBS-4 suppressor', e0: 3, only_family: 'ak', cls: ['AR', 'CAR'], wt: .3, s: { v: .97 }, d: 'Soviet 5.45 mm suppressor; use with subsonic US rounds for real quiet.' });
SUP({ id: 'tgpa', n: 'TGP-A suppressor', e0: 3, only_family: 'ak', cls: ['AR', 'CAR', 'LMG'], wt: .42, s: {}, d: 'Russian special-forces AK-74 suppressor.' });
SUP({ id: 'solvent', n: 'Solvent-trap can (improvised)', e0: 4, cls: TAC.concat(['PST', 'RIF']), wt: .3, s: { flash: .4, loud: 1.6, rv: .95, acc: 1.25 }, d: 'Not a real suppressor: louder than a proper can and it throws shots off.' });
const MZ = (o) => a(Object.assign({ slot: 'muzzle' }, o));
MZ({ id: 'a2bird', n: 'A2 birdcage flash hider', e0: 2, cls: ['AR', 'CAR', 'DMR'], as: 'flash', wt: .03, s: { flash: .3, rv: .97 }, d: 'Closed bottom so it does not kick up dust prone.' });
MZ({ id: 'warcomp', n: 'SureFire WarComp', e0: 4, cls: RIFLE, needs: 'rail', as: 'flash', wt: .1, s: { flash: .25, rv: .94, rh: .95 }, d: 'Flash hider/compensator that doubles as a suppressor mount.' });
MZ({ id: 'aac51t', n: 'AAC 51T Blackout', e0: 3, cls: RIFLE, as: 'flash', wt: .1, s: { flash: .15 }, d: 'Prong flash hider and quick-detach mount.' });
MZ({ id: 'vortexfh', n: 'Smith Enterprise Vortex', e0: 3, cls: LONG, as: 'flash', wt: .08, s: { flash: .1 }, d: 'Four-prong flash eliminator. Rings when it hits something.' });
MZ({ id: 'hammer', n: 'Griffin Hammer comp', e0: 4, cls: RIFLE, as: 'comp', wt: .09, s: { rv: .84, rh: .86, flash: 1.2, loud: 1.2 }, d: 'Compact comp/QD mount.' });
MZ({ id: 'm4_72', n: 'Precision Armament M4-72', e0: 4, cls: RIFLE, as: 'brake', wt: .1, s: { rv: .68, rh: .78, flash: 1.5, loud: 1.5, ads: 1.02 }, d: 'One of the flattest-shooting brakes. Very loud for anyone beside you.' });
MZ({ id: 'vg6', n: 'VG6 Gamma 556', e0: 4, cls: RIFLE, as: 'brake', wt: .1, s: { rv: .72, rh: .8, flash: 1.3, loud: 1.45 }, d: 'Brake with a blast cone.' });
MZ({ id: 'battlecomp', n: 'BattleComp 2.0', e0: 4, cls: RIFLE, as: 'comp', wt: .1, s: { rv: .84, rh: .88, flash: .5 }, d: 'Hybrid comp that also hides flash.' });
MZ({ id: 'linear', n: 'Linear compensator', e0: 4, cls: TAC.concat(['PST']), as: 'comp', wt: .12, s: { loud: .8, flash: .6, rv: .98 }, d: 'Throws the blast forward, away from you. Kinder indoors.' });
MZ({ id: 'ak74brake', n: 'AK-74 6P20 brake', e0: 2, only_family: 'ak', cls: ['AR', 'CAR', 'LMG'], as: 'brake', wt: .05, s: { rv: .76, rh: .82, flash: 1.2, loud: 1.3 }, d: 'The two-chamber AK-74 brake.' });
MZ({ id: 'srvv', n: 'SRVV AK-74 brake', e0: 4, only_family: 'ak', cls: ['AR', 'CAR'], as: 'brake', wt: .08, s: { rv: .68, rh: .76, flash: 1.3, loud: 1.5 }, d: 'Russian competition brake with a huge port.' });
MZ({ id: 'dtk4', n: 'Zenitco DTK-4M', e0: 4, only_family: 'ak', cls: ['AR', 'CAR', 'LMG'], as: 'flash', wt: .2, s: { flash: .15, loud: .85, rv: .94 }, d: 'Flash and blast suppressor: cuts the bang without a full can.' });
MZ({ id: 'pst_comp', n: 'Pistol compensator', e0: 3, cls: ['PST'], as: 'comp', wt: .05, s: { rv: .75, rh: .85, flash: 1.3 }, d: 'Slide-mounted comp (Zev / Agency). Faster follow-ups.' });
MZ({ id: 'ch_cyl', n: 'Cylinder choke', e0: 0, cls: ['SG'], wt: 0, as: 'none', s: { acc: 1.25 }, d: 'Open choke: wide pattern for close rooms.' });
MZ({ id: 'ch_mod', n: 'Modified choke', e0: 0, cls: ['SG'], wt: 0, as: 'none', s: { acc: .8 }, d: 'Tighter pattern for 25–35 m.' });
MZ({ id: 'ch_full', n: 'Full choke', e0: 0, cls: ['SG'], wt: 0, as: 'none', s: { acc: .6 }, d: 'Tightest pattern: buckshot reaches out to 50 m.' });
MZ({ id: 'ch_breach', n: 'Breaching (stand-off) choke', e0: 3, cls: ['SG'], wt: .1, as: 'brake', s: { acc: 1.3, melee: 1.4 }, d: 'Toothed stand-off muzzle for door breaching. Hits hard in melee.' });
MZ({ id: 'ch_duck', n: 'Duckbill spreader', e0: 2, cls: ['SG'], wt: .1, as: 'flash', s: { acc: 1.5, hip: .8 }, d: 'Vietnam-era choke that spreads the pattern sideways.' });
MZ({ id: 'schiess', n: 'Schießbecher grenade cup', e0: 1, e1: 1, only: ['k98k', 'g43', 'g41'], as: 'cup', wt: .8, s: { gl: 1, ads: 1.1, mob: -1 }, d: 'Wehrmacht rifle grenade launcher. Press G to fire a rifle grenade.' });
MZ({ id: 'm7gl', n: 'M7 grenade launcher', e0: 1, e1: 2, only: ['garand', 'm1903', 'm1903a3', 'm1903a4'], as: 'cup', wt: .4, s: { gl: 1, ads: 1.08, mob: -1 }, d: 'US spigot launcher for M9A1 rifle grenades. Press G.' });
MZ({ id: 'vb', n: 'Vivien-Bessières cup', e0: 0, e1: 1, only: ['lebel', 'berthier', 'smle', 'm1903', 'm1917'], as: 'cup', wt: .5, s: { gl: 1, ads: 1.08, mob: -1 }, d: 'WW1 cup discharger that fires grenades with a normal ball round. Press G.' });

// ------------------------------------------------------------------ barrels
const BR = (o) => a(Object.assign({ slot: 'barrel' }, o));
BR({ id: 'brl_sbr', n: 'SBR barrel (10.3")', e0: 3, cls: ['AR', 'CAR', 'SMG'], wt: -.5, s: { blen: .55, v: .86, acc: 1.3, ads: .86, mob: 1.5, flash: 1.8, loud: 1.2, heat: 1.3 }, d: 'Very short: quick in rooms, big fireball, loses a lot of velocity.' });
BR({ id: 'brl_mid', n: 'Mid-length gas system', e0: 3, cls: ['AR', 'CAR'], wt: .05, s: { rv: .94, heat: .95 }, d: 'Longer gas tube: softer, smoother recoil.' });
BR({ id: 'brl_chf', n: 'Cold-hammer-forged, chrome-lined', e0: 2, cls: LONG.concat(['SMG']), wt: .05, s: { heat: .7, acc: 1.03 }, d: 'Built for sustained fire: heats slower and lasts longer.' });
BR({ id: 'brl_ss', n: '416R stainless match', e0: 3, cls: ['AR', 'DMR', 'SR', 'BR', 'RIF'], wt: .05, s: { acc: .75, heat: 1.15 }, d: 'Very accurate, but it walks shots as it gets hot.' });
BR({ id: 'brl_poly', n: 'Polygonal rifling', e0: 3, cls: LONG.concat(['SMG', 'PST']), wt: 0, s: { v: 1.03, acc: .92 }, d: 'Smooth rifling: a better gas seal and a little more speed.' });
BR({ id: 'brl_carbon', n: 'Proof Research carbon-fibre', e0: 4, cls: ['AR', 'DMR', 'SR', 'BR'], wt: -.4, s: { acc: .8, heat: .8, ads: .95 }, d: 'Carbon-wrapped steel liner: light, stiff, sheds heat.' });
BR({ id: 'brl_bull', n: 'Bull barrel', e0: 2, cls: ['RIF', 'SR', 'DMR', 'BR', 'AR'], wt: 1.1, s: { bthick: 1.55, acc: .6, heat: .55, ads: 1.12, mob: -1, rv: .92 }, d: 'Fat straight profile. Heavy, but very stable and slow to heat.' });
BR({ id: 'brl_ported', n: 'Ported barrel', e0: 2, cls: ['PST', 'SG', 'SMG'], wt: 0, s: { rv: .82, flash: 1.5, loud: 1.2, v: .97 }, d: 'Ports cut into the barrel push the muzzle down.' });
BR({ id: 'brl_isup', n: 'Integrally suppressed barrel', e0: 2, cls: ['SMG', 'CAR'], wt: .6, s: { sup: 1, v: .88, flash: .02, loud: .8, ads: 1.1, blen: 1.1 }, d: 'Ported barrel inside a suppressor, like the MP5SD. Quiet, slower rounds.' });
BR({ id: 'brl_qc', n: 'Quick-change spare barrel', e0: 1, cls: ['LMG'], wt: 1.5, s: { qc: 1, mob: -1 }, d: 'You carry a spare. Every reload swaps in a cool barrel.' });
BR({ id: 'brl_longslide', n: 'Long slide (6")', e0: 2, cls: ['PST'], wt: .1, s: { v: 1.06, acc: .8, ads: 1.08, rv: .92 }, d: 'Longer sight radius and more velocity.' });
BR({ id: 'brl_bird', n: '28" bird barrel', e0: 0, cls: ['SG'], wt: .5, s: { blen: 1.4, v: 1.05, acc: .8, ads: 1.12, mob: -1 }, d: 'Long vent-rib barrel. Tighter patterns, awkward indoors.' });
BR({ id: 'brl_breacher', n: '12" breacher barrel', e0: 3, cls: ['SG'], wt: -.4, s: { blen: .55, v: .92, acc: 1.3, ads: .85, mob: 1.5 }, d: 'Stubby barrel for entry teams.' });
BR({ id: 'brl_jungle', n: 'Jungle carbine (No. 5)', e0: 1, e1: 2, only: ['no4', 'smle'], wt: -.9, s: { blen: .75, v: .93, acc: 1.1, ads: .9, mob: 1, flash: 1.6, rv: 1.15 }, d: 'Cut-down Lee–Enfield with a flash hider. Kicks noticeably harder.' });

// ------------------------------------------------------------------ underbarrel
const UB = (o) => a(Object.assign({ slot: 'under' }, o));
UB({ id: 'bcm_vfg', n: 'BCM Gunfighter vertical grip', e0: 4, cls: TAC, needs: 'rail', as: 'vgrip', wt: .07, s: { rv: .9, rh: .82, ads: 1.02 }, d: 'Short vertical grip for a C-clamp hold.' });
UB({ id: 'kac_vfg', n: 'KAC vertical grip (SOPMOD)', e0: 3, cls: TAC, needs: 'rail', as: 'vgrip', wt: .12, s: { rv: .87, rh: .78, ads: 1.04 }, d: 'Full-length SOPMOD grip with a storage compartment.' });
UB({ id: 'stubby', n: 'Tango Down BGV-MK46K stubby', e0: 3, cls: TAC, needs: 'rail', as: 'vgrip', wt: .07, s: { rv: .92, rh: .85, ads: .98 }, d: 'Stubby grip: some control, little weight.' });
UB({ id: 'afg2', n: 'Magpul AFG-2', e0: 4, cls: TAC, needs: 'rail', as: 'agrip', wt: .04, s: { rv: .93, ads: .9 }, d: 'Angled foregrip: points naturally, fast to aim.' });
UB({ id: 'gpod', n: 'Grip Pod (GPS-02)', e0: 3, cls: ['AR', 'CAR', 'BR', 'LMG', 'DMR'], needs: 'rail', as: 'vgrip', wt: .23, s: { rv: .9, rh: .84, bip: 1, ads: 1.05 }, d: 'Vertical grip with legs that spring out: also a bipod (X).' });
UB({ id: 'harris', n: 'Harris S-BRM bipod', e0: 2, cls: ['RIF', 'BR', 'SR', 'DMR', 'AR'], as: 'bipod', wt: .4, s: { rv: .84, ads: 1.08, mob: -1, bip: 1, sway: .9 }, d: 'The classic sniper bipod. Deploy with X or by going prone.' });
UB({ id: 'atlas', n: 'Atlas BT10 bipod', e0: 4, cls: ['RIF', 'BR', 'SR', 'DMR', 'AR', 'LMG'], needs: 'rail', as: 'bipod', wt: .33, s: { rv: .82, ads: 1.07, mob: -1, bip: 1, sway: .85 }, d: 'Pan and tilt bipod: steadier when deployed.' });
UB({ id: 'm320', n: 'M320 GLM 40 mm', e0: 4, cls: ['AR', 'CAR'], needs: 'rail', as: 'gl', not: ['aug', 'famas', 'p90', 'tavor', 'x95', 'qbz95', 'l85'], wt: 1.5, s: { gl: 1, ads: 1.13, mob: -1 }, d: 'Side-opening 40 mm launcher. Press G to fire.' });
UB({ id: 'ag36', n: 'HK AG36 40 mm', e0: 3, cls: ['AR', 'CAR'], only: ['g36', 'g36c', 'l85', 'hk416', 'hk416a5', 'hk433'], as: 'gl', wt: 1, s: { gl: 1, ads: 1.12, mob: -1 }, d: 'HK\'s side-opening launcher (the British L17A1). Press G.' });
UB({ id: 'eglm', n: 'FN EGLM 40 mm', e0: 4, cls: ['AR', 'BR'], only: ['scarl', 'scarh', 'f2000', 'scarsc'], as: 'gl', wt: 1.1, s: { gl: 1, ads: 1.12, mob: -1 }, d: 'Enhanced launcher for the SCAR and F2000. Press G.' });
UB({ id: 'gp30', n: 'GP-30 Obuvka', e0: 3, only_family: 'ak', as: 'gl', wt: 1.3, s: { gl: 1, ads: 1.12, mob: -1 }, d: 'Lighter successor to the GP-25. Press G.' });
UB({ id: 'm26mass', n: 'M26 MASS shotgun', e0: 4, cls: ['AR', 'CAR'], needs: 'rail', as: 'gl', wt: 1.6, s: { gl: 1, ubsg: 1, ads: 1.12, mob: -1 }, d: 'Under-barrel straight-pull 12-gauge. Press G for buckshot.' });
UB({ id: 'masterkey', n: 'Masterkey (870 underbarrel)', e0: 3, cls: ['AR', 'CAR'], needs: 'rail', as: 'gl', wt: 1.3, s: { gl: 1, ubsg: 1, ads: 1.12, mob: -1 }, d: 'Cut-down Remington 870 under a rifle. Press G.' });
UB({ id: 'xtm', n: 'Magpul XTM hand stop', e0: 4, cls: TAC, needs: 'rail', as: 'handstop', wt: .02, s: { rv: .96, rh: .9, ads: .95 }, d: 'A small index point at the front of the rail.' });
UB({ id: 'barricade', n: 'Barricade stop', e0: 4, cls: RIFLE, needs: 'rail', as: 'handstop', wt: .05, s: { rv: .95, sway: .9 }, d: 'A ledge that braces the rifle against cover.' });

// ------------------------------------------------------------------ side rail and lug
const SD = (o) => a(Object.assign({ slot: 'side' }, o));
SD({ id: 'peq16', n: 'AN/PEQ-16 (laser + light)', e0: 4, cls: TAC.concat(['PST']), needs: 'rail', as: 'dbal', wt: .3, s: { laser: 'vis+ir', laserHip: .62, light: 1, lum: 125 }, d: 'Visible + IR laser and a weak white light. L cycles modes.' });
SD({ id: 'peq14', n: 'AN/PEQ-14 (pistol / SMG)', e0: 4, cls: ['PST', 'SMG'], needs: 'rail', as: 'light', wt: .14, s: { laser: 'vis+ir', laserHip: .62, light: 1, lum: 125 }, d: 'Integrated Laser White Light Pointer.' });
SD({ id: 'ngal', n: 'L3Harris NGAL', e0: 4, cls: TAC, needs: 'rail', as: 'dbal', wt: .26, s: { laser: 'vis+ir', laserHip: .58, light: 1, lum: 300 }, d: 'Next Generation Aiming Laser with an IR illuminator. L cycles modes.' });
SD({ id: 'mawl', n: 'B.E. Meyers MAWL-DA', e0: 4, cls: TAC, needs: 'rail', as: 'peq2', wt: .24, s: { laser: 'vis+ir', laserHip: .55 }, d: 'Very bright IR laser with a big activation button.' });
SD({ id: 'otal', n: 'Steiner OTAL-A', e0: 4, cls: TAC, needs: 'rail', as: 'peq2', wt: .1, s: { laser: 'ir', laserHip: .65 }, d: 'Compact IR laser. Only visible through night vision.' });
SD({ id: 'perst4', n: 'Zenitco Perst-4', e0: 4, cls: TAC, needs: 'rail', as: 'peq2', wt: .2, s: { laser: 'vis+ir', laserHip: .6 }, d: 'Russian visible + IR laser block.' });
SD({ id: 'raptar', n: 'Wilcox RAPTAR-S', e0: 4, cls: RIFLE.concat(['SR']), needs: 'rail', as: 'dbal', wt: .4, s: { laser: 'vis+ir', laserHip: .62, lrf: 1 }, d: 'Laser and laser rangefinder. Shows range through any magnified optic.' });
SD({ id: 'm300', n: 'SureFire M300 Mini Scout', e0: 4, cls: TAC, needs: 'rail', as: 'light', wt: .09, s: { light: 1, lum: 500 }, d: 'Small 500-lumen scout light.' });
SD({ id: 'm640', n: 'SureFire M640 Pro Scout', e0: 4, cls: TAC, needs: 'rail', as: 'light', wt: .14, s: { light: 1, lum: 1000, strobe: 1 }, d: '1000 lumens with a strobe mode that dazzles anyone you point it at. L cycles.' });
SD({ id: 'klesch', n: 'Zenitco Klesch-2P', e0: 4, cls: TAC, needs: 'rail', as: 'light', wt: .17, s: { light: 1, lum: 650, strobe: 1 }, d: 'Russian weapon light with a strobe. L cycles.' });
SD({ id: 'wmlx', n: 'Inforce WMLx Gen 3', e0: 4, cls: TAC, needs: 'rail', as: 'light', wt: .15, s: { light: 1, lum: 800, strobe: 1 }, d: 'Polymer light with IR and strobe modes.' });
SD({ id: 'x300', n: 'SureFire X300 Ultra', e0: 4, cls: ['PST', 'SMG', 'SG'], needs: 'rail', as: 'light', wt: .11, s: { light: 1, lum: 1000, strobe: 1 }, d: 'Pistol light, 1000 lumens and strobe. L cycles.' });
SD({ id: 'tlr1', n: 'Streamlight TLR-1 HL', e0: 4, cls: ['PST', 'SMG', 'SG'], needs: 'rail', as: 'light', wt: .12, s: { light: 1, lum: 800, strobe: 1 }, d: 'Duty pistol light with strobe.' });
SD({ id: 'b_m9', n: 'M9 bayonet', e0: 3, cls: ['AR', 'CAR', 'SG', 'DMR'], as: 'bayonet', wt: .6, s: { melee: 2.1, ads: 1.05 }, d: 'US bayonet that doubles as a wire cutter with its scabbard.' });
SD({ id: 'b_6kh5', n: '6Kh5 bayonet', e0: 2, only_family: 'ak', as: 'bayonet', wt: .45, s: { melee: 2, ads: 1.04 }, d: 'AK-74 bayonet-knife.' });
SD({ id: 'b_okc3s', n: 'OKC-3S bayonet', e0: 4, cls: ['AR', 'CAR', 'DMR'], as: 'bayonet', wt: .6, s: { melee: 2.2, ads: 1.05 }, d: 'USMC bayonet, built to be a better fighting knife than the M9.' });
SD({ id: 'b_m1905', n: 'M1905 16" bayonet', e0: 0, e1: 2, cls: ['RIF'], as: 'bayonet', wt: .7, s: { melee: 2.4, ads: 1.08, mob: -1 }, d: 'Long WW1/WW2 US bayonet: very long reach.' });
SD({ id: 'b_spike', n: 'No. 4 spike bayonet', e0: 1, e1: 2, only: ['no4', 'smle', 'l42'], as: 'bayonet', wt: .2, s: { melee: 2.2, ads: 1.03 }, d: 'The British "pig sticker".' });
SD({ id: 'b_l3', n: 'L3A1 bayonet (SA80)', e0: 3, only: ['l85', 'l129'], as: 'bayonet', wt: .6, s: { melee: 2, ads: 1.04 }, d: 'Socket bayonet that slides over the SA80 muzzle.' });

// ------------------------------------------------------------------ magazines
const MG = (o) => a(Object.assign({ slot: 'mag', fixedOk: false }, o));
const AR15 = ['m4a1', 'm16a4', 'm16a2', 'm16a1', 'hk416', 'hk416a5', 'mk18', 'm27', 'bren2', 'x95', 'tavor', 'mdr', 'scarl', 'hk433', 'arx160', 'type20', 'l85', 'xm177', 'rattler', 'mpx'];
MG({ id: 'pmag40', n: 'Magpul PMAG 40', e0: 4, only: AR15, wt: .15, s: { mag: 40, rl: 1.06, ads: 1.03 }, d: '40-round box. Awkward prone.' });
MG({ id: 'sf60', n: 'SureFire MAG5-60', e0: 4, only: AR15, wt: .3, s: { mag: 60, rl: 1.18, ads: 1.07, mob: -1 }, d: 'Quad-stack 60-rounder.' });
MG({ id: 'lancer', n: 'Lancer L5AWM (translucent)', e0: 4, only: AR15, wt: -.02, s: { rl: .95, rle: .9 }, d: 'See-through magazine: you can see when you are low, so reloads are faster.' });
MG({ id: 'maglink', n: 'Magpul MagLink coupler', e0: 4, only: AR15.concat(['g36', 'g36c', 'scarh', 'sig550', 'hk433']), wt: .3, s: { rl: .72, ads: 1.05 }, d: 'Two magazines side by side: the second one is right there.' });
MG({ id: 'ak45', n: '45-round RPK-74 box', e0: 2, only_family: 'ak', cls: ['AR', 'CAR', 'LMG'], wt: .3, s: { mag: 45, rl: 1.08, ads: 1.04 }, d: 'Long RPK-74 magazine that fits any AK-74.' });
MG({ id: 'akplum', n: 'AK-74 "plum" polymer mag', e0: 2, only_family: 'ak', wt: -.05, s: { rl: .97 }, d: 'Plum-coloured Bakelite-style polymer magazine.' });
MG({ id: 'akpmag', n: 'Magpul PMAG 30 AK/AKM', e0: 4, only_family: 'ak', wt: -.05, s: { rl: .93, rle: .95 }, d: 'Polymer AK magazine with a flared floorplate.' });
MG({ id: 'glock50', n: 'KCI 50-round drum (Glock)', e0: 4, only: ['glock17', 'glock19', 'glock18', 'glock45'], wt: .45, s: { mag: 50, rl: 1.45, ads: 1.12, mob: -1 }, d: 'Big drum on a pistol. Ridiculous but real.' });
MG({ id: 'pstplus2', n: '+2 magazine base plate', e0: 3, cls: ['PST'], not: ['webley', 'python', 'rhino', 'nagant', 'sw29', 'enfield2', 'sw1917', 'mateba'], wt: .02, s: { magAdd: 2 }, d: 'Extended base pad: two more rounds.' });
a({ id: 'tubeext', slot: 'mag', n: '+2 magazine-tube extension', e0: 2, cls: ['SG'], wt: .15, s: { magAdd: 2, ads: 1.03 }, d: 'Longer tube: two more shells.' });
a({ id: 'sidesaddle', slot: 'mag', n: 'Side-saddle shell carrier', e0: 3, cls: ['SG'], wt: .3, s: { rl: .85 }, d: 'Six spare shells on the receiver: faster to feed.' });
a({ id: 'dbm', slot: 'mag', n: 'Detachable box conversion (AICS)', e0: 3, only: ['m40', 'm24', 'r700', 'l96', 'm2010', 'steyrscout'], wt: .2, s: { rl: .7, magAdd: 5 }, d: 'Swaps the internal magazine for a 10-round AICS box.' });
a({ id: 'clipload', slot: 'mag', n: 'Stripper-clip bandolier', e0: 0, e1: 2, cls: ['RIF'], wt: .3, s: { rl: .85 }, d: 'Clips ready in a cotton bandolier: faster to reload by the clip.' });

// ------------------------------------------------------------------ pistol grips (new slot)
const GP = (o) => a(Object.assign({ slot: 'grip' }, o));
GP({ id: 'pg_std', n: 'Factory grip', e0: 0, s: {}, d: 'As issued.' });
GP({ id: 'pg_moe', n: 'Magpul MOE+', e0: 4, cls: TAC, not_family: 'ak', wt: 0, s: { rh: .96, ads: .99 }, d: 'Rubber-overmolded grip.' });
GP({ id: 'pg_bcm', n: 'BCM Gunfighter Mod 3', e0: 4, cls: TAC, not_family: 'ak', wt: 0, s: { ads: .96, stf: .85 }, d: 'More vertical angle: elbows in, faster out of a sprint.' });
GP({ id: 'pg_ergo', n: 'ERGO SureGrip', e0: 3, cls: TAC, wt: .02, s: { rh: .92, sway: .96 }, d: 'Soft grippy rubber: steadier hold.' });
GP({ id: 'pg_hogue', n: 'Hogue OverMolded', e0: 3, cls: TAC.concat(['PST']), wt: .03, s: { rh: .9, ads: 1.01 }, d: 'Finger-groove rubber grip.' });
GP({ id: 'pg_k2', n: 'Magpul MOE-K2', e0: 4, cls: TAC, wt: 0, s: { stf: .88, ads: .98 }, d: 'Reduced-angle grip for short stocks and armour.' });
GP({ id: 'pg_rk3', n: 'Zenitco RK-3', e0: 4, only_family: 'ak', cls: ['AR', 'CAR', 'LMG', 'SMG'], wt: .02, s: { rh: .92, stf: .9 }, d: 'Ergonomic Russian AK grip.' });
GP({ id: 'pg_akwood', n: 'Bakelite AK grip', e0: 2, only_family: 'ak', wt: 0, s: {}, d: 'Soviet orange-brown Bakelite.' });
GP({ id: 'pg_stipple', n: 'Hand-stippled frame', e0: 3, cls: ['PST'], wt: 0, s: { rh: .88, rv: .96 }, d: 'Aggressive stippling: the gun does not move in your hand.' });
GP({ id: 'pg_talon', n: 'Talon grip tape', e0: 4, cls: ['PST', 'SMG'], wt: 0, s: { rh: .93 }, d: 'Sandpaper-style wrap.' });
GP({ id: 'pg_magwell', n: 'Flared magwell', e0: 3, cls: ['PST', 'SMG', 'CAR', 'AR'], wt: .04, s: { rl: .9, rle: .9 }, d: 'Funnel for the magazine: faster reloads.' });
GP({ id: 'pg_wood', n: 'Walnut grip panels', e0: 0, cls: ['PST'], wt: .02, s: { rh: .97 }, d: 'Checkered walnut.' });
GP({ id: 'pg_pearl', n: 'Mother-of-pearl grips', e0: 0, cls: ['PST'], wt: .02, s: { rh: 1.05 }, d: 'Pretty. Slippery.' });

// ------------------------------------------------------------------ trigger & action (new slot)
const TR = (o) => a(Object.assign({ slot: 'trigger' }, o));
TR({ id: 'trg_std', n: 'Factory trigger', e0: 0, s: {}, d: 'Mil-spec pull.' });
TR({ id: 'ssae', n: 'Geissele SSA-E (two-stage)', e0: 4, cls: ['AR', 'CAR', 'DMR', 'BR'], wt: 0, s: { acc: .9, hip: .95 }, d: 'Crisp two-stage break: tighter aimed groups.' });
TR({ id: 'sd3g', n: 'Geissele SD-3G (flat)', e0: 4, cls: ['AR', 'CAR'], wt: 0, s: { acc: .94, srpm: 1.15 }, d: 'Short reset: faster semi-auto follow-ups.' });
TR({ id: 'alg', n: 'ALG ACT', e0: 4, cls: ['AR', 'CAR', 'DMR'], wt: 0, s: { acc: .96 }, d: 'Polished mil-spec trigger.' });
TR({ id: 'timney', n: 'Timney Calvin Elite', e0: 3, cls: ['SR', 'RIF'], wt: 0, s: { acc: .82 }, d: 'Adjustable bolt-rifle trigger down to 8 oz.' });
TR({ id: 'tromix', n: 'Tromix AK trigger', e0: 4, only_family: 'ak', wt: 0, s: { acc: .93, srpm: 1.1 }, d: 'Smoother AK trigger with a short reset.' });
TR({ id: 'apex', n: 'Apex flat-faced trigger', e0: 4, cls: ['PST'], wt: 0, s: { acc: .9, srpm: 1.15 }, d: 'Less pull weight and travel.' });
TR({ id: 'trg_auto', n: 'M16 auto sear group', e0: 2, only: ['m16a2', 'm16a4', 'ar10', 'sig716', 'mk12', 'sr25', 'm110a1'], wt: 0, s: { addModes: ['auto'] }, d: 'Full-auto parts: adds automatic fire.' });
TR({ id: 'trg_burst', n: 'Three-round burst group', e0: 2, only: ['m4a1', 'hk416', 'hk416a5', 'mk18', 'm16a1', 'scarl', 'g36', 'g36c', 'mp5', 'ump45', 'mp7', 'mpx'], wt: 0, s: { addModes: ['burst3'] }, d: 'Adds a three-round burst position.' });
TR({ id: 'buf_h2', n: 'H2 heavy buffer', e0: 3, cls: ['AR', 'CAR'], wt: .05, s: { rv: .93, rpmMul: .93 }, d: 'Heavier buffer: slower, smoother cycling.' });
TR({ id: 'buf_slow', n: 'Rate-reducer', e0: 2, cls: ['LMG', 'SMG', 'AR'], wt: .1, s: { rpmMul: .8, rv: .88, rh: .9 }, d: 'Slows the cyclic rate: easier to control bursts.' });
TR({ id: 'buf_fast', n: 'High-rate bolt & spring', e0: 2, cls: ['LMG', 'SMG'], wt: -.05, s: { rpmMul: 1.18, rv: 1.08, heat: 1.15 }, d: 'More rounds per minute, more muzzle climb.' });
TR({ id: 'ambi', n: 'Ambi bolt catch & mag release', e0: 4, cls: ['AR', 'CAR', 'DMR', 'BR', 'SMG'], wt: .02, s: { rle: .85 }, d: 'Drop the bolt with your trigger finger: much faster empty reloads.' });
TR({ id: 'raptor', n: 'Radian Raptor charging handle', e0: 4, cls: ['AR', 'CAR', 'DMR'], wt: .02, s: { rle: .93 }, d: 'Ambidextrous latch, easier to clear malfunctions.' });

// ------------------------------------------------------------------ stocks
const ST = (o) => a(Object.assign({ slot: 'stock' }, o));
ST({ id: 'ctr', n: 'Magpul CTR', e0: 4, cls: ['AR', 'CAR', 'SMG', 'DMR'], wt: -.05, s: { stock: 'coll', ads: .93, mob: 1, rv: .97, coll: 1 }, d: 'Collapsible stock with a friction lock. O changes length.' });
ST({ id: 'sopmod', n: 'LMT SOPMOD', e0: 3, cls: ['AR', 'CAR', 'DMR'], wt: .1, s: { stock: 'coll', ads: .95, rv: .94, sway: .92, coll: 1 }, d: 'Wide cheek weld with battery tubes. O changes length.' });
ST({ id: 'prs', n: 'Magpul PRS Gen3', e0: 4, cls: ['AR', 'DMR', 'BR', 'SR'], wt: .4, s: { stock: 'prec', rv: .82, sway: .82, ads: 1.1, mob: -1 }, d: 'Adjustable comb and length for precision work.' });
ST({ id: 'ubr', n: 'Magpul UBR Gen2', e0: 4, cls: ['AR', 'CAR', 'DMR', 'BR'], wt: .3, s: { stock: 'coll', rv: .88, sway: .9, ads: 1.02, coll: 1 }, d: 'Heavy collapsible stock that feels fixed. O changes length.' });
ST({ id: 'pdw', n: 'PDW telescoping stock', e0: 4, cls: ['CAR', 'SMG', 'AR'], wt: -.1, s: { stock: 'coll', ads: .86, mob: 1.5, rv: 1.06, coll: 1 }, d: 'Very short stock on two rods. O changes length.' });
ST({ id: 'aks_side', n: 'AKS-74 side-folder', e0: 2, only_family: 'ak', wt: -.1, s: { stock: 'coll', ads: .95, mob: .5, fold: 1 }, d: 'Triangular folding stock. O folds it.' });
ST({ id: 'akms_under', n: 'AKMS underfolder', e0: 2, only_family: 'ak', wt: -.15, s: { stock: 'coll', ads: .94, mob: .5, rv: 1.04, fold: 1 }, d: 'Underfolding stock for paratroopers. O folds it.' });
ST({ id: 'zhukov', n: 'Magpul Zhukov-S', e0: 4, only_family: 'ak', wt: -.05, s: { stock: 'coll', ads: .93, mob: 1, rv: .96, fold: 1 }, d: 'Folding polymer AK stock. O folds it.' });
ST({ id: 'sbt', n: 'Folding stock adapter', e0: 4, cls: ['AR', 'CAR', 'SMG'], wt: .1, s: { stock: 'coll', ads: .94, fold: 1 }, d: 'Law Tactical-style adapter: any stock can fold. O folds it.' });
ST({ id: 'chassis', n: 'MDT / AI chassis', e0: 3, cls: ['SR', 'RIF'], wt: .8, s: { stock: 'prec', acc: .85, rv: .85, sway: .85, ads: 1.08, mob: -1, fold: 1 }, d: 'Aluminium chassis with a folding stock. O folds it.' });
ST({ id: 'thumbhole', n: 'Thumbhole stock', e0: 2, cls: ['SR', 'RIF', 'DMR'], wt: .2, s: { sway: .88, ads: 1.04 }, d: 'Upright wrist for a steadier hold.' });
ST({ id: 'wire', n: 'Wire stock', e0: 1, cls: ['SMG'], wt: -.2, s: { stock: 'coll', ads: .88, mob: 1.5, rv: 1.1, fold: 1 }, d: 'Simple folding wire stock. O folds it.' });
ST({ id: 'pad', n: 'Recoil pad (Limbsaver)', e0: 2, cls: ['RIF', 'SR', 'SG', 'BR', 'DMR'], wt: .1, s: { rv: .9 }, d: 'Thick rubber butt pad.' });

// ------------------------------------------------------------------ slings (new slot)
const SL = (o) => a(Object.assign({ slot: 'sling' }, o));
SL({ id: 'sl_none', n: 'No sling', e0: 0, s: {}, d: '' });
SL({ id: 'sl_m1907', n: 'M1907 leather sling', e0: 0, e1: 2, cls: ['RIF', 'SR', 'BR'], wt: .2, s: { sway: .85, swap: 1.05 }, d: 'Wrap your arm into a hasty sling: much steadier aim.' });
SL({ id: 'sl_2pt', n: 'Vickers Combat 2-point', e0: 3, cls: TAC.concat(['RIF', 'SR']), wt: .15, s: { swap: .85, sway: .95 }, d: 'Adjustable quick-pull sling. Faster to switch weapons.' });
SL({ id: 'sl_1pt', n: 'Single-point bungee', e0: 3, cls: ['SMG', 'CAR', 'SG', 'AR'], wt: .12, s: { swap: .75, ads: .97 }, d: 'Gun hangs at your chest: drop it and draw the pistol fast.' });
SL({ id: 'sl_3pt', n: 'HK 3-point sling', e0: 2, cls: ['SMG', 'CAR', 'AR'], wt: .2, s: { swap: .9, sway: .92 }, d: 'Wrap-around sling of the 1980s.' });
SL({ id: 'sl_padded', n: 'Padded sling (Blue Force)', e0: 4, cls: ['LMG', 'BR', 'SR', 'DMR'], wt: .25, s: { swap: .9, mob: .5 }, d: 'Takes the weight of a heavy gun off your arms.' });

// ------------------------------------------------------------------ ammunition (calibre-specific)
const AM = (o) => a(Object.assign({ slot: 'ammo' }, o));
AM({ id: 'm855a1', n: 'M855A1 EPR', e0: 4, cal: ['5.56×45mm'], s: { pen: 1, dmgMul: 1.06, v: 1.02 }, d: 'Steel penetrator tip, copper slug: beats Level IIIA and mild steel.' });
AM({ id: 'mk262', n: 'Mk 262 Mod 1 (77 gr)', e0: 3, cal: ['5.56×45mm'], s: { acc: .8, dmgMul: 1.12, v: .97 }, d: 'Heavy open-tip match round: accurate, fragments.' });
AM({ id: 'm995', n: 'M995 tungsten AP', e0: 3, cal: ['5.56×45mm'], s: { pen: 2, dmgMul: .92 }, d: 'Tungsten-carbide core. Defeats Level III plates at close range.' });
AM({ id: 'm856', n: 'M856A1 tracer', e0: 3, cal: ['5.56×45mm'], s: { tracer: 1 }, d: 'Red tracer, every round.' });
AM({ id: '7n6', n: '7N6 steel core', e0: 2, cal: ['5.45×39mm'], s: { pen: 0, dmgMul: 1.05 }, d: 'Air-pocket tip that yaws in tissue.' });
AM({ id: '7n10', n: '7N10 improved penetration', e0: 3, cal: ['5.45×39mm'], s: { pen: 1 }, d: 'Better hardened core.' });
AM({ id: '7n39', n: '7N39 "Igolnik"', e0: 4, cal: ['5.45×39mm'], s: { pen: 2, dmgMul: .93 }, d: 'Tungsten-carbide AP. The best Russian 5.45.' });
AM({ id: 'us_545', n: '7U1 subsonic', e0: 3, cal: ['5.45×39mm'], s: { subsonic: 1, dmgMul: .8 }, d: 'Heavy subsonic bullet for the PBS-4.' });
AM({ id: 't45', n: '7T3 / T-45 green tracer', e0: 1, cal: ['5.45×39mm', '7.62×39mm', '7.62×54mmR'], s: { tracer: 1, tracerCol: 'green' }, d: 'Soviet tracers burn green.' });
AM({ id: '57n231', n: '57-N-231 steel core', e0: 2, cal: ['7.62×39mm'], s: {}, d: 'Standard Soviet ball.' });
AM({ id: 'bp', n: '7N23 BP', e0: 3, cal: ['7.62×39mm'], s: { pen: 2, dmgMul: .95 }, d: 'Hardened steel AP core.' });
AM({ id: 'us39', n: '7.62×39 US subsonic', e0: 2, cal: ['7.62×39mm'], s: { subsonic: 1, dmgMul: .85 }, d: 'Heavy bullet for the PBS-1 and AS-type rifles.' });
AM({ id: 'm80a1', n: 'M80A1 EPR', e0: 4, cal: ['7.62×51mm'], s: { pen: 1, dmgMul: 1.05 }, d: '7.62 version of the steel-tipped EPR.' });
AM({ id: 'm118lr', n: 'M118LR (175 gr)', e0: 3, cal: ['7.62×51mm', '.300 Win Mag'], s: { acc: .7, v: .97, dmgMul: 1.04 }, d: 'Long-range sniper load.' });
AM({ id: 'm993', n: 'M993 tungsten AP', e0: 3, cal: ['7.62×51mm'], s: { pen: 2, dmgMul: .94 }, d: 'Defeats Level IV-rated threats at close range.' });
AM({ id: '7n1', n: '7N1 sniper', e0: 2, cal: ['7.62×54mmR'], s: { acc: .75 }, d: 'Soviet SVD match round.' });
AM({ id: '7n13', n: '7N13 improved penetration', e0: 3, cal: ['7.62×54mmR'], s: { pen: 1 }, d: 'Hardened core PKM/SVD round.' });
AM({ id: 'm33', n: 'M33 ball / M8 API', e0: 1, cal: ['.50 BMG'], s: {}, d: 'Standard .50 ball.' });
AM({ id: 'mk211', n: 'Mk 211 Raufoss', e0: 3, cal: ['.50 BMG'], s: { pen: 2, inc: 1, he: { r: 1, dmg: 40 } }, d: 'High-explosive incendiary armour-piercing. Bursts on impact.' });
AM({ id: 'scenar', n: 'Lapua Scenar-L', e0: 4, cal: ['.338 Lapua', '.300 Win Mag', '7.62×51mm', '6.8×51mm'], s: { acc: .65 }, d: 'Competition match bullet.' });
AM({ id: 'p_plus', n: '9 mm +P+', e0: 3, cal: ['9×19mm'], s: { dmgMul: 1.1, v: 1.07, rv: 1.1 }, d: 'Hot loading: more energy, more kick.' });
AM({ id: '7n21', n: '7N21 AP', e0: 3, cal: ['9×19mm'], s: { pen: 1, v: 1.05 }, d: 'Russian armour-piercing 9 mm.' });
AM({ id: 'frangible', n: 'Frangible', e0: 3, cal: ['9×19mm', '.45 ACP', '5.56×45mm', '.40 S&W', '5.7×28mm'], s: { dmgMul: 1.05, pen: -2 }, d: 'Breaks up on anything hard: no over-penetration.' });
AM({ id: 'ss190', n: 'SS190 AP', e0: 3, cal: ['5.7×28mm'], s: { pen: 1 }, d: 'Steel-core FN round for the P90 and Five-seveN.' });
AM({ id: 'dm11', n: 'DM11 AP (4.6 mm)', e0: 3, cal: ['4.6×30mm'], s: { pen: 1 }, d: 'Copper-plated steel penetrator.' });
AM({ id: 'soft', n: 'Soft point', e0: 0, cls: ['RIF', 'SR', 'DMR'], s: { dmgMul: 1.12, pen: -1 }, d: 'Hunting bullet: expands, stopped by armour.' });
AM({ id: 'heavy', n: 'Heavy-for-calibre', e0: 1, not_cls: ['SG'], s: { acc: .92, v: .94, dmgMul: 1.05, k: .9 }, d: 'Heavier bullet: holds speed better at long range.' });
AM({ id: 'steelcase', n: 'Steel-cased surplus', e0: 2, not_cls: ['SG'], s: { acc: 1.15, dmgMul: .97 }, d: 'Cheap lacquered steel cases. Less consistent.' });
AM({ id: 'tracer_ir', n: 'IR tracer (dim)', e0: 3, not_cls: ['SG', 'PST'], s: { tracer: 1, tracerCol: 'ir' }, d: 'Infrared tracer: invisible to the naked eye, bright through night vision.' });
AM({ id: 'buck000', n: '000 buckshot', e0: 0, cls: ['SG'], s: { pellets: 8, dmgMul: 1.15 }, d: 'Eight big pellets.' });
AM({ id: 'bird', n: '#4 birdshot', e0: 0, cls: ['SG'], s: { pellets: 30, dmgMul: .22, acc: 1.4, pen: -1 }, d: 'Lots of tiny pellets: stings, rarely stops.' });
AM({ id: 'lowrec', n: 'Reduced-recoil buckshot', e0: 3, cls: ['SG'], s: { rv: .72, rh: .8, dmgMul: .9 }, d: 'Lighter load. Easier follow-ups.' });
AM({ id: 'flitecontrol', n: 'Federal FliteControl 00', e0: 4, cls: ['SG'], s: { acc: .55 }, d: 'Wad holds the pellets together: very tight patterns.' });
AM({ id: 'beanbag', n: 'Bean bag (less-lethal)', e0: 3, cls: ['SG'], s: { slug: 1, dmgMul: .2, stun: 2.5 }, d: 'Fabric bag of lead shot: knocks people down and stuns them.' });
AM({ id: 'frag12', n: 'FRAG-12 HE', e0: 4, cls: ['SG'], s: { slug: 1, he: { r: 2.5, dmg: 70 }, dmgMul: .6 }, d: 'Fin-stabilised high-explosive shotgun round.' });
AM({ id: 'sabot', n: 'Sabot slug', e0: 3, cls: ['SG'], s: { slug: 1, acc: .6, v: 1.1 }, d: 'Sub-calibre slug: accurate out to 150 m.' });
AM({ id: 'breach', n: 'Breaching round (TESAR)', e0: 3, cls: ['SG'], s: { slug: 1, dmgMul: .8, pen: -1 }, d: 'Powdered-metal round: blows hinges and turns to dust.' });

// ------------------------------------------------------------------ finishes
const FN = (id, n, e0, fin, col, poly, d) => { a({ id, slot: 'finish', n, e0, s: { fin }, d }); G.FIN_EXTRA = G.FIN_EXTRA || {}; G.FIN_EXTRA[fin] = { col, poly }; };
FN('fin_bronze', 'Burnt Bronze Cerakote', 3, 'bronze', '#6e4e30', '#5a4632', 'Brown-bronze ceramic coating.');
FN('fin_sniper', 'Sniper Grey Cerakote', 3, 'sgrey', '#5d6266', '#55595d', 'Matte mid-grey.');
FN('fin_ranger', 'Ranger Green', 3, 'ranger', '#3c4430', '#3a4230', 'Dark green.');
FN('fin_coyote', 'Coyote Tan', 3, 'coyote', '#7d6a4c', '#7d6a4c', 'Light brown.');
FN('fin_stainless', 'Bead-blasted stainless', 0, 'stainless', '#9ba0a4', null, 'Bare matte stainless steel.');
FN('fin_case', 'Colour case-hardened', 0, 'case', '#4c4a50', null, 'Mottled blue, brown and straw colours from bone-charcoal hardening.');
FN('fin_battleworn', 'Battle-worn', 0, 'worn', '#5c5a56', null, 'Finish rubbed to bare metal at the edges.');
FN('fin_navy', 'Navy blue anodised', 3, 'navy', '#1e2a40', '#1e2a40', 'Deep blue anodising.');
FN('fin_white', 'Arctic white', 2, 'white', '#d8d8d4', '#d8d8d4', 'White winter paint.');
FN('fin_pink', 'Pink Cerakote', 4, 'pink', '#c47a8a', '#c47a8a', 'Bubblegum pink.');
FN('fin_damascus', 'Damascus steel', 0, 'damascus', '#5a5a5e', null, 'Pattern-welded steel.');
FN('fin_titanium', 'Titanium nitride (gold)', 3, 'tin', '#b8963e', null, 'Hard gold-coloured coating used on bolts and barrels.');

// ------------------------------------------------------------------ rules for the new filters
const ok0 = G.attachOK;
G.attachOK = function (wp, at) {
  if (at.cal && !at.cal.includes(wp.cal)) return false;
  if (at.not_family === 'ak' && G.isAK(wp)) return false;
  if (at.slot === 'ammo' && at.cal && !at.cls) { if (at.psy && wp.e !== 'psycho') return false; const eo = G.ERA[wp.e].ord; return !(at.e0 !== undefined && eo < at.e0) && !(at.e1 !== undefined && eo > at.e1); }
  return ok0(wp, at);
};
G.attachFor = (wp, slot) => A.filter(at => at.slot === slot && G.attachOK(wp, at));
const def0 = G.defaultLoadout;
G.defaultLoadout = function (wp) { return Object.assign({ aux: 'aux_none', grip: 'pg_std', trigger: 'trg_std', sling: 'sl_none' }, def0(wp)); };
G.DEFAULT_IDS = ['irons', 'mz_std', 'brl_std', 'ub_none', 'sd_none', 'mag_std', 'stk_std', 'am_fmj', 'am_buck', 'fin_factory', 'aux_none', 'pg_std', 'trg_std', 'sl_none'];
// 1x / magnified optic requirements of aux parts
G.auxWorks = (L) => { const aux = G.ATT[L.aux], op = G.ATT[L.optic]; if (!aux || !aux.req) return true; const z = op && op.s.zoom || 1; return aux.req === '1x' ? !!op && op.id !== 'irons' && z < 1.2 : z >= 1.2; };

// ------------------------------------------------------------------ stat resolution with the new keys
const res0 = G.resolveStats;
G.resolveStats = function (wp, L, st) {
  st = st || {};
  const L2 = Object.assign({}, L);
  if (st.supOff) L2.muzzle = 'mz_std';
  const S = res0(wp, L2);
  Object.assign(S, { zmin: 0, zmax: S.zoom, lrf: 0, bc: 0, nv: 0, thermal: 0, illum: 0, alt: null, rle: 1, stf: 1, sway: 1, heat: 1, swap: 1, lum: 0, strobe: 0, fold: 0, coll: 0, stun: 0, qc: 0, qd: 0, tracerCol: null, ubsg: 0, srpm: 1, wt: wp.wt });
  if (wp.c === 'SG' && L2.ammo === 'am_buck') S.pellets = S.pellets || 9;
  for (const slot of Object.keys(L2)) {
    const at = G.ATT[L2[slot]]; if (!at) continue; const s = at.s;
    S.wt += at.wt || 0;
    if (s.zmin) S.zmin = s.zmin; if (s.lrf) S.lrf = 1; if (s.bc) S.bc = 1; if (s.nv) S.nv = 1; if (s.thermal) S.thermal = 1;
    if (s.illum && slot === 'optic') S.illum = 1;
    if (s.alt && (slot !== 'aux' || G.auxWorks(L2))) S.alt = Object.assign({ src: slot }, s.alt);
    if (s.rle) S.rle *= s.rle; if (s.stf) S.stf *= s.stf; if (s.sway) S.sway *= s.sway; if (s.heat) S.heat *= s.heat; if (s.swap) S.swap *= s.swap;
    if (s.addModes) for (const m of s.addModes) if (!S.modes.includes(m)) S.modes.push(m);
    if (s.magAdd) S.mag += s.magAdd;
    if (s.lum) S.lum = Math.max(S.lum, s.lum); if (s.strobe) S.strobe = 1;
    if (s.fold) S.fold = 1; if (s.coll) S.coll = 1; if (s.stun) S.stun = s.stun; if (s.qc) S.qc = 1; if (s.qd) S.qd = 1;
    if (s.tracerCol) S.tracerCol = s.tracerCol; if (s.ubsg) S.ubsg = 1; if (s.srpm) S.srpm *= s.srpm;
    if (s.pellets && wp.c === 'SG') S.pellets = s.pellets;
      if (s.k) S.k *= s.k;
    if (s.slug && slot === 'ammo') { S.dmg = 95 * (s.dmgMul || 1); S.acc = 6 * (s.acc || 1); }
  }
  if (S.light && !S.lum) S.lum = 500;
  // folded / collapsed stock, removed suppressor, alternate sight in use
  if (st.fold && S.fold) { S.rv *= 1.35; S.rh *= 1.4; S.ads *= .82; S.acc *= 1.25; S.mob = Math.min(12, S.mob + 1.5); S.sway *= 1.4; S.stock = 'none'; }
  if (st.coll && S.coll) { S.rv *= 1.08; S.ads *= .9; S.mob = Math.min(12, S.mob + .5); }
  if (st.alt && S.alt) { if (S.alt.k === 'mag') { S.zoom = S.alt.zoom; S.ret = S.ret === 'holo' ? 'holo' : 'dot'; } else { S.zoom = S.alt.zoom; if (S.alt.ret) S.ret = S.alt.ret; } S.zmin = 0; }
  if (st.zoom && S.zmin && !st.alt) S.zoom = Math.max(S.zmin, Math.min(S.zmax, st.zoom));
  return S;
};

// ------------------------------------------------------------------ perk descriptions (shown in the armory and the field inspect panel)
G.PERK_INFO = {
  zmin: ['Variable power', 'Mouse wheel while scoped changes magnification.'],
  lrf: ['Laser rangefinder', 'Range readout in the scope.'],
  bc: ['Ballistic computer', 'Shows the corrected aim point for the measured range.'],
  nv: ['Night optic', 'Image-intensified view through the scope.'],
  thermal: ['Thermal', 'White-hot view through the scope; sees through smoke.'],
  illum: ['Illuminated reticle', 'Reticle glows: readable at night.'],
  alt: ['Second sight (H)', 'Press H to switch sights.'],
  sup: ['Suppressed', 'Quiet, no flash: enemies struggle to locate you.'],
  qd: ['Quick-detach (U)', 'Press U to take the suppressor off or put it on.'],
  fold: ['Folding stock (O)', 'Press O to fold: handier but much harder to control.'],
  coll: ['Collapsible (O)', 'Press O to collapse: faster to aim, a bit more recoil.'],
  bip: ['Bipod (X)', 'Deploy on cover or prone for a steady rest.'],
  gl: ['Launcher (G)', 'Press G to fire the launcher.'],
  ubsg: ['Under-barrel shotgun (G)', 'Press G to fire buckshot.'],
  laser: ['Laser (L)', 'Tightens hip-fire; IR modes need night vision.'],
  light: ['Weapon light (L)', 'Lights the target; makes you visible.'],
  strobe: ['Strobe (L)', 'Dazzles enemies in front of you: they aim worse.'],
  melee: ['Bayonet (V)', 'Longer, deadlier melee strike.'],
  qc: ['Quick-change barrel', 'Each reload swaps in a cool barrel.'],
  addModes: ['Extra fire mode (B)', 'Adds a fire-selector position.'],
  stun: ['Less-lethal', 'Hits stun instead of killing outright.'],
  rle: ['Faster empty reloads', ''], stf: ['Faster out of a sprint', ''], sway: ['Steadier aim', ''], swap: ['Quicker weapon switch', ''],
  heat: ['Heat', ''], subsonic: ['Subsonic', 'Very quiet with a suppressor; drops faster.'], tracer: ['Tracer', ''],
};
// short human-readable list of what a part does: [text, good?]
G.attStatList = function (at) {
  const s = at.s || {}, out = [];
  const pct = (k, inv, label) => { if (s[k] === undefined || s[k] === 1 || typeof s[k] !== 'number') return; const d = Math.round((s[k] - 1) * 100); if (!d) return; out.push([`${label} ${d > 0 ? '+' : ''}${d}%`, inv ? d < 0 : d > 0]); };
  if (s.zoom && s.zoom > 1) out.push([s.zmin ? `${s.zmin}–${s.zoom}×` : `${s.zoom}×`, true]);
  pct('rv', true, 'Recoil'); pct('rh', true, 'Side kick'); pct('acc', true, 'Spread'); pct('ads', true, 'Aim time'); pct('rl', true, 'Reload'); pct('rle', true, 'Empty reload');
  pct('v', false, 'Velocity'); pct('dmgMul', false, 'Damage'); pct('sway', true, 'Sway'); pct('stf', true, 'Sprint-to-fire'); pct('heat', true, 'Heat'); pct('swap', true, 'Switch time'); pct('rpmMul', false, 'Fire rate'); pct('srpm', false, 'Semi rate'); pct('hip', true, 'Hip spread');
  if (s.flash !== undefined && s.flash !== 1) out.push([`Flash ${s.flash < 1 ? '−' + Math.round((1 - s.flash) * 100) : '+' + Math.round((s.flash - 1) * 100)}%`, s.flash < 1]);
  if (s.loud && s.loud !== 1) out.push([`Noise ${s.loud < 1 ? '−' : '+'}${Math.round(Math.abs(s.loud - 1) * 100)}%`, s.loud < 1]);
  if (s.mob) out.push([`Mobility ${s.mob > 0 ? '+' : ''}${s.mob}`, s.mob > 0]);
  if (s.mag) out.push([s.mag > 5 ? `${s.mag} rds` : `Capacity ×${s.mag}`, true]);
  if (s.magAdd) out.push([`+${s.magAdd} rds`, true]);
  if (s.pen) out.push([`Penetration ${s.pen > 0 ? '+' : ''}${s.pen}`, s.pen > 0]);
  if (s.lum) out.push([`${s.lum} lm`, true]);
  if (at.wt) out.push([`${at.wt > 0 ? '+' : '−'}${Math.round(Math.abs(at.wt) * 1000)} g`, at.wt < 0]);
  for (const k of Object.keys(G.PERK_INFO)) if (s[k] && !['rle', 'stf', 'sway', 'swap', 'heat'].includes(k) && !(k === 'zmin')) out.push(['★ ' + G.PERK_INFO[k][0], true]);
  if (s.zmin) out.push(['★ ' + G.PERK_INFO.zmin[0], true]);
  if (at.req) out.push([at.req === '1x' ? 'Needs a 1× optic' : 'Needs a magnified optic', null]);
  return out;
};
// active perks of a resolved weapon
G.weaponPerks = function (S, L) {
  const P = [];
  const add = (k, extra) => P.push({ k, n: G.PERK_INFO[k][0] + (extra ? ' · ' + extra : ''), d: G.PERK_INFO[k][1] });
  if (S.zmin) add('zmin', `${S.zmin}–${S.zmax}×`); if (S.lrf) add('lrf'); if (S.bc) add('bc'); if (S.nv) add('nv'); if (S.thermal) add('thermal'); if (S.illum) add('illum');
  if (S.alt) add('alt', { mag: 'magnifier', flip: 'flip magnifier', offset: 'canted sight', piggy: 'piggyback dot', switch: 'power lever', irons: 'backup irons' }[S.alt.k]);
  if (L && G.ATT[L.aux] && G.ATT[L.aux].req && !G.auxWorks(L)) P.push({ k: 'warn', n: '⚠ ' + G.ATT[L.aux].n + ' needs a ' + (G.ATT[L.aux].req === '1x' ? '1× optic' : 'magnified optic'), d: '' });
  if (S.sup) add('sup'); if (S.qd && S.sup) add('qd'); if (S.fold) add('fold'); else if (S.coll) add('coll');
  if (S.bip) add('bip'); if (S.gl) add(S.ubsg ? 'ubsg' : 'gl'); if (S.laser) add('laser'); if (S.light) add('light', S.lum + ' lm'); if (S.strobe) add('strobe');
  if (S.melee > 1.5) add('melee'); if (S.qc) add('qc'); if (S.stun) add('stun'); if (S.subsonic) add('subsonic'); if (S.tracer) add('tracer', S.tracerCol === 'ir' ? 'infrared' : S.tracerCol || 'red');
  return P;
};
// ------------------------------------------------------------------ enemy weapon builds
// hostiles customise their guns too: better-equipped (higher tier) fighters run more parts,
// and each role leans toward what it needs (marksmen: magnified optics and bipods; breachers:
// short barrels, lights and buckshot; gunners: bipods, big magazines; night: IR lasers and NV)
G.botLoadout = function (wp, role, tier = 1, night = false, rnd = Math.random) {
  const L = G.defaultLoadout(wp), pick = l => l[Math.floor(rnd() * l.length)];
  const chance = [.2, .4, .6, .8][Math.max(0, Math.min(3, tier))];
  const fits = sl => G.attachFor(wp, sl).filter(a => !G.DEFAULT_IDS.includes(a.id) && !/gold|pink|engraved|pearl|damascus|psy_saw|solvent|beanbag|bird/.test(a.id));
  const prefer = (sl, fn, p = chance) => { if (rnd() > p) return; const all = fits(sl); if (!all.length) return; const good = all.filter(fn); L[sl] = pick(good.length ? good : all).id; };
  const z = a => a.s.zoom || 1;
  if (role === 'marksman') prefer('optic', a => z(a) >= 3, .9); else if (role === 'breacher') prefer('optic', a => z(a) < 1.2); else prefer('optic', a => z(a) < 1.2 || (z(a) <= 4 && rnd() < .4));
  if (night) prefer('optic', a => a.s.nv || a.s.thermal, chance * .5);
  prefer('muzzle', a => role === 'breacher' ? a.id.startsWith('ch_') || a.s.rv < 1 : !!a.s.sup || a.s.flash < 1, chance * .7);
  prefer('barrel', a => role === 'breacher' ? (a.s.blen || 1) < 1 : role === 'marksman' ? (a.s.acc || 1) < 1 : true, chance * .5);
  prefer('under', a => role === 'marksman' || role === 'gunner' ? !!a.s.bip : role === 'breacher' ? !a.s.gl : !a.s.ubsg, chance * .7);
  prefer('side', a => night ? (a.s.laser || '').includes('ir') : !!a.s.light || !!a.s.laser, night ? .9 : chance * .6);
  prefer('mag', a => role === 'gunner' ? (a.s.mag || 0) > 1 : (a.s.rl || 1) < 1 || a.s.magAdd, chance * .5);
  for (const sl of ['grip', 'trigger', 'stock', 'sling', 'aux']) prefer(sl, () => true, chance * .4);
  prefer('ammo', a => role === 'marksman' ? (a.s.acc || 1) < 1 : (a.s.pen || 0) > 0 || (a.s.dmgMul || 1) > 1, chance * .6);
  prefer('finish', () => true, .25);
  return L;
};
G.WEAPON = G.WEAPON; G.ATT = Object.fromEntries(A.map(x => [x.id, x]));
})();
