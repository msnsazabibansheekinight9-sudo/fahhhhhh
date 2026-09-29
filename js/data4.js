// ============================================================================
// IRONSIGHT — arsenal part 4: the PSYCHO ARSENAL. An invented era of weapons
// that never existed, split into two tiers:
//   feasible – could genuinely be engineered with known technology
//   overkill – engineering crimes: handheld miniguns, coilguns, 20 mm revolvers
// Extra mechanics used here (on top of salvo / hyper / caseless / gyro / duplex):
//   he: { r, dmg }  – explosive projectiles (blast radius in metres, peak damage)
//   homing: rad/s   – seeker rounds steer toward the nearest enemy in their cone
//   spin: seconds   – rotary barrels must spin up before they fire
//   charge: seconds – coilgun: hold the trigger to charge, fires at full charge
//   intSup          – integrally suppressed          inc – incendiary by default
// ============================================================================
'use strict';
(function () {
const G = window.G;

G.ERAS.push({ id: 'psycho', name: 'Psycho Arsenal', span: 'Fictional · 2030s', ord: 5 });
G.ERA.psycho = G.ERAS[G.ERAS.length - 1];
G.UNIFORMS.psycho = [
  { name: 'Blackline PMC', tunic: '#26282c', pants: '#2c2e33', helm: '#1b1c1f', gear: '#3a3d42', helmet: 'visor', boot: '#141414', glove: '#161616' },
  { name: 'Rust Syndicate', tunic: '#6b5040', pants: '#4a3e34', helm: '#5a4636', gear: '#5c4632', helmet: 'gasmask', boot: '#2a2018', glove: '#3a2a1c' },
];
G.PSY_TIERS = { feasible: 'Feasible — could actually be built', overkill: 'Overkill — engineering crimes' };

Object.assign(G.CAL, {
  '.338 Vanta':          { k: .00052, pen: 4, cs: [.052, .0072] },
  '8 gauge':             { k: .00650, pen: 1, cs: [.089, .0125], shell: true },
  '.500 Duplex':         { k: .00170, pen: 2, cs: [.041, .0072] },
  '6mm Needle':          { k: .00038, pen: 4, cs: [.042, .0042] },
  '4.6mm caseless':      { k: .00110, pen: 2, cs: [.028, .0035] },
  '5.7mm Seeker':        { k: .00120, pen: 2, cs: [.028, .0040] },
  '12 gauge FRAG':       { k: .00450, pen: 1, cs: [.070, .0105], shell: true },
  'Tungsten rail slug':  { k: .00018, pen: 5, cs: [.050, .0060] },
  '20×110mm':            { k: .00045, pen: 5, cs: [.110, .0145] },
  '30mm Micro-HE':       { k: .00350, pen: 2, cs: [.060, .0155] },
  '4 bore':              { k: .00240, pen: 4, cs: [.100, .0135] },
  'Seeker micro-rocket': { k: .00200, pen: 1, cs: [.080, .0080] },
});
Object.assign(G.MASS || (G.MASS = {}), { '.338 Vanta': 16.2, '8 gauge': 70, '.500 Duplex': 22, '6mm Needle': 2.2, '4.6mm caseless': 2, '5.7mm Seeker': 2.3, '12 gauge FRAG': 30, 'Tungsten rail slug': 40, '20×110mm': 130, '30mm Micro-HE': 90, '4 bore': 120, 'Seeker micro-rocket': 60 });

const W = G.WEAPONS;
const F = o => W.push(Object.assign(o, { e: 'psycho', psy: 'feasible' }));
const O = o => W.push(Object.assign(o, { e: 'psycho', psy: 'overkill' }));

// ============================================================ FEASIBLE
F({ id:'tempest', n:'Tempest TX-9 Twinstack', c:'SMG', y:2031, co:'Blackline Armory', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:1100, mag:60, v:390, dmg:24, rec:[.55,.45], rl:[2.2,2.7], acc:5, wt:3.1, salvo:2,
  blurb:'Two over-under barrels fed from one quad-stack casket magazine. Every trigger pull puts a matched pair of 9 mm rounds on target.',
  m:{ t:'smg', R:[.3,.075,.042], B:[.2,.0075], hg:['quad',.15], stk:'ar_coll', grip:'ar', mag:['box',.26,0,.0], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT','twin_over','vents'] }});
F({ id:'harrow', n:'Harrow HX-12 Belt Shotgun', c:'SG', y:2033, co:'Kessler Dynamics', cal:'12 gauge', act:'auto', modes:['auto','semi'], rpm:420, mag:32, v:410, dmg:15, pellets:9, rec:[2.1,.8], rl:[4.4,5.2], acc:34, wt:7.8, heavy:true,
  blurb:'An open-bolt 12-gauge that eats linked shells from a 32-round drum. Heavy, loud, and it just keeps going.',
  m:{ t:'mg', R:[.42,.11,.06], B:[.46,.013], hg:['poly',.22], stk:'saw', grip:'pg', mag:['beltdrum',.08], sgt:'flat', bh:'side_r', mz:'brake', bip:1, pl:'hazard', mt:'black', x:['railT','carry_saw','heatsink','hazard'] }});
F({ id:'vanta', n:'Vanta V-338 Integral', c:'DMR', y:2032, co:'Orbital Arms', cal:'.338 Vanta', act:'auto', modes:['semi','auto'], rpm:500, mag:15, v:790, dmg:92, rec:[1.5,.55], rl:[2.8,3.4], acc:1.1, wt:5.2, intSup:true, defOptic:'psy_oracle',
  blurb:'A bullpup marksman rifle wrapped around a full-length integral suppressor. Subsonic-quiet report from a magnum-class cartridge.',
  m:{ t:'bullpup', R:[.54,.1,.055], B:[.5,.0095], hg:['mlok_short',.18], stk:'mdr', grip:'x95', mag:['box',.13,0,.12], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT','integral_sup'] }});
F({ id:'kodiak', n:'Kodiak K-8 Breacher', c:'SG', y:2030, co:'Rustworks Collective', cal:'8 gauge', act:'pump', modes:['pump'], rpm:60, mag:4, v:380, dmg:18, pellets:16, rec:[5.5,1.2], rl:[.7,.7], acc:44, wt:5.4, cyc:.75, tubeLoad:true,
  blurb:'An 8-bore pump gun built for opening doors, and the walls around them. Sixteen pellets per shell and recoil you feel in your teeth.',
  m:{ t:'pump', R:[.32,.1,.06], B:[.5,.017], hg:['pump_ribbed',.22], stk:'poly_sg', grip:'pg', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', pl:'crimson', mt:'park', x:['railT','shellsaddle'] }});
F({ id:'magpie', n:'Magpie .500 Duplex Revolver', c:'PST', y:2031, co:'Kessler Dynamics', cal:'.500 Duplex', act:'rev', modes:['semi'], rpm:180, mag:5, v:440, dmg:46, pellets:2, duplex:true, rec:[2.6,.8], rl:[2.6,2.6], acc:4, wt:1.9,
  blurb:'A five-shot .500 revolver whose cartridges stack two bullets nose-to-tail. Two hits for every trigger pull.',
  m:{ t:'rev', R:[.16,.07,.045], B:[.2,.0075], stk:'none', grip:'rev', mag:['cyl'], sgt:'pst', bh:'none', mz:'comp', pl:'black', mt:'stainless', x:['vent_rib'] }});
F({ id:'lancer', n:'Lancer NR-6 Needle Rifle', c:'AR', y:2034, co:'Orbital Arms', cal:'6mm Needle', act:'auto', modes:['auto','burst3','semi'], rpm:1200, mag:80, v:1650, dmg:25, rec:[.28,.2], rl:[2.8,3.3], acc:2.2, wt:3.6, caseless:true, defOptic:'holo',
  blurb:'A caseless flechette bullpup: 80 tungsten needles at 1,650 m/s. Flat trajectory, deep penetration, almost no recoil.',
  m:{ t:'bullpup', R:[.58,.1,.05], B:[.3,.006], hg:['none',0], stk:'aug', grip:'aug', mag:['box_clear',.22,0,.12], sgt:'flat', bh:'side_l', mz:'cone', pl:'bone', mt:'black', x:['railT','heatsink'] }});
F({ id:'mjolnir', n:'Mjolnir MS-3 Salvo Rifle', c:'AR', y:2032, co:'Blackline Armory', cal:'7.62×39mm', act:'auto', modes:['semi','auto'], rpm:450, mag:45, v:700, dmg:40, rec:[1.6,.7], rl:[2.9,3.5], acc:4, wt:4.4, salvo:3,
  blurb:'Three parallel barrels fire as one. A single pull sends a three-round salvo downrange before the recoil arrives.',
  m:{ t:'ar', R:[.3,.08,.04], B:[.42,.0085], hg:['mlok',.26], stk:'ar_coll', grip:'ar', mag:['curve',.24,.35,-.06], sgt:'flat', bh:'ar', mz:'brake', pl:'crimson', mt:'black', x:['railT','triple','fa'] }});
F({ id:'hornet', n:'Hornet H-46 Micro-PDW', c:'SMG', y:2030, co:'Blackline Armory', cal:'4.6mm caseless', act:'auto', modes:['auto','semi'], rpm:1400, mag:90, v:720, dmg:19, rec:[.25,.25], rl:[2.4,2.9], acc:5, wt:1.9, caseless:true,
  blurb:'A palm-sized caseless PDW with a 90-round helical magazine running under the barrel.',
  m:{ t:'smg', R:[.26,.07,.04], B:[.14,.006], hg:['none',0], stk:'wire', grip:'pg', mag:['helical',.26,0,0], sgt:'flat', bh:'side_both', mz:'crown', pl:'hazard', mt:'black', x:['railT'] }});
F({ id:'warden', n:'Warden SX Smart SMG', c:'SMG', y:2035, co:'Orbital Arms', cal:'5.7mm Seeker', act:'auto', modes:['auto','semi'], rpm:900, mag:50, v:700, dmg:21, rec:[.35,.28], rl:[2.3,2.8], acc:4, wt:2.7, homing:3,
  blurb:'Fin-stabilised seeker rounds steer onto the nearest hostile in front of the muzzle. The side pod paints targets for them.',
  m:{ t:'scar', R:[.3,.085,.045], B:[.2,.007], hg:['mlok_short',.14], stk:'bren2', grip:'ar', mag:['box_clear',.2,0,-.04], sgt:'flat', bh:'side_both', mz:'crown', pl:'bone', mt:'black', x:['railT','smartpod'] }});
F({ id:'ghostline', n:'Ghostline GC-13 Gyrojet Carbine', c:'CAR', y:2031, co:'Kessler Dynamics', cal:'13mm Gyrojet', act:'auto', modes:['semi','auto'], rpm:500, mag:20, v:60, dmg:44, rec:[.3,.15], rl:[2.4,2.9], acc:5, wt:3.0, gyro:{ v:520, burn:.18 }, caseless:true,
  blurb:'Micro-rockets instead of bullets: almost silent at the muzzle, accelerating to 520 m/s downrange. Nearly recoilless.',
  m:{ t:'scar', R:[.34,.09,.045], B:[.3,.0075], hg:['mlok',.2], stk:'scar', grip:'ar', mag:['box',.16,0,-.06], sgt:'flat', bh:'side_l', mz:'crown', pl:'crimson', mt:'black', x:['railT','gyro','vents'] }});
F({ id:'thunderclap', n:'Thunderclap TC-12 FRAG', c:'SG', y:2030, co:'Rustworks Collective', cal:'12 gauge FRAG', act:'auto', modes:['semi','auto'], rpm:300, mag:20, v:300, dmg:40, rec:[1.4,.6], rl:[3.2,3.8], acc:9, wt:5.6, he:{ r:2.4, dmg:60 },
  blurb:'A low-recoil auto shotgun feeding fin-stabilised FRAG-12 grenades from a 20-round drum. Every shell detonates on impact.',
  m:{ t:'ar', R:[.36,.09,.05], B:[.46,.012], hg:['poly',.22], stk:'ar_a2', grip:'ar', mag:['drum',.1,0,-.07], sgt:'flat', bh:'ar', mz:'brake', pl:'od', mt:'black', x:['railT','carry_m60'] }});

// ============================================================ OVERKILL
O({ id:'hellbore', n:'Hellbore M-6 Handheld Minigun', c:'LMG', y:2036, co:'Kessler Dynamics', cal:'5.56×45mm', act:'auto', modes:['auto'], rpm:3600, mag:500, v:900, dmg:30, rec:[.35,.45], rl:[6.2,7.0], acc:7, wt:16.5, heavy:true, spin:.6,
  blurb:'Six rotating barrels, a backpack ammo can and a 3,600 rpm motor. Spin it up, then hold on.',
  m:{ t:'mg', R:[.36,.13,.085], B:[.56,.005], hg:['none',0], stk:'none', grip:'pg', mag:['beltpouch',.1], sgt:'flat', bh:'none', mz:'crown', pl:'black', mt:'black', x:['rotor6','backfeed','carry_m60','railT'] }});
O({ id:'arclight', n:'Arclight RG-1 Coilgun', c:'SR', y:2038, co:'Orbital Arms', cal:'Tungsten rail slug', act:'semi', modes:['semi'], rpm:40, mag:8, v:3000, dmg:280, rec:[3.5,.6], rl:[3.4,3.9], acc:.2, wt:14, heavy:true, charge:.9, caseless:true, defOptic:'psy_oracle',
  blurb:'Twelve electromagnetic coil stages throw a tungsten slug at Mach 9. Hold the trigger to charge the capacitor banks. It goes through almost anything.',
  m:{ t:'precision', R:[.48,.11,.07], B:[.9,.012], hg:['none',0], stk:'ai', grip:'thumbhole', mag:['box',.1,0,-.05], sgt:'none', bh:'none', mz:'crown', bip:1, pl:'bone', mt:'black', x:['railT','coil'] }});
O({ id:'hydra', n:'Hydra 7-Barrel Pepperbox', c:'SG', y:2033, co:'Rustworks Collective', cal:'12 gauge', act:'semi', modes:['semi'], rpm:60, mag:7, v:400, dmg:12, pellets:8, salvo:7, rec:[9,2.2], rl:[3.6,3.6], acc:40, wt:7.2, heavy:true,
  blurb:'Seven 12-gauge barrels fire in one volley: 56 pellets in a single trigger pull. Then you reload all seven.',
  m:{ t:'autosg', R:[.3,.1,.06], B:[.38,.009], hg:['none',0], stk:'ar_coll', grip:'pg', mag:['int'], sgt:'bead', bh:'none', mz:'crown', pl:'crimson', mt:'black', x:['pepper7','railT'] }});
O({ id:'tsar', n:'Tsar-20 Revolver Rifle', c:'SR', y:2034, co:'Rustworks Collective', cal:'20×110mm', act:'semi', modes:['semi'], rpm:100, mag:6, v:820, dmg:320, rec:[7,1.6], rl:[4.8,5.4], acc:.9, wt:21, heavy:true, he:{ r:2.2, dmg:90 }, defOptic:'nxs',
  blurb:'An anti-materiel rifle with a six-shot revolving cylinder of 20 mm high-explosive incendiary shells. Bipod mandatory.',
  m:{ t:'amr', R:[.56,.14,.08], B:[.9,.016], hg:['barrett',.4], stk:'barrett', grip:'pg', mag:['int'], sgt:'none', bh:'none', mz:'barrett', bip:1, pl:'black', mt:'park', x:['railT','bigcyl'] }});
O({ id:'pandemonium', n:'Pandemonium AGL-30', c:'LMG', y:2035, co:'Kessler Dynamics', cal:'30mm Micro-HE', act:'auto', modes:['auto','semi'], rpm:380, mag:24, v:240, dmg:60, rec:[2.2,.8], rl:[5.0,5.8], acc:6, wt:15, heavy:true, he:{ r:4.5, dmg:130 },
  blurb:'A shoulder-fired automatic grenade launcher: 24 rounds of 30 mm HE on a lobbing trajectory.',
  m:{ t:'mg', R:[.46,.14,.08], B:[.35,.02], hg:['none',0], stk:'saw', grip:'pg', mag:['drum',.1,0,-.06], sgt:'flat', bh:'side_r', mz:'cone', bip:1, pl:'od', mt:'park', x:['railT','carry_m60','heatsink'] }});
O({ id:'deuce', n:'Double Deuce Twin .50', c:'LMG', y:2036, co:'Blackline Armory', cal:'.50 BMG', act:'auto', modes:['auto'], rpm:600, mag:100, v:880, dmg:240, salvo:2, rec:[3,1.1], rl:[6.4,7.2], acc:3, wt:24, heavy:true,
  blurb:'Two .50 BMG machine guns bolted side by side and fired as one. Each pull sends a matched pair.',
  m:{ t:'mg', R:[.5,.12,.065], B:[.7,.013], hg:['perf',.5,.03], stk:'saw', grip:'pg', mag:['beltbox',.15], sgt:'flat', bh:'side_r', mz:'brake', bip:1, pl:'black', mt:'park', x:['twin_side','carry_m60'] }});
O({ id:'widowmaker', n:'Widowmaker .50 BMG Hand-Cannon', c:'PST', y:2033, co:'Rustworks Collective', cal:'.50 BMG', act:'semi', modes:['semi'], rpm:60, mag:3, v:620, dmg:210, rec:[9,2.5], rl:[3.0,3.4], acc:3, wt:4.6,
  blurb:'A "pistol" chambered in .50 BMG, with a three-round magazine and a muzzle brake the size of a fist. Two-handed only.',
  m:{ t:'pistol', R:[.34,.065,.05], B:[.26,.012], stk:'none', grip:'pst', mag:['pst',.14], sgt:'pst', bh:'slide_deagle', mz:'brake', pl:'black', mt:'stainless', x:['railP','hazard'] }});
O({ id:'seraph', n:'Seraph SR-12 Seeker Swarm', c:'LMG', y:2038, co:'Orbital Arms', cal:'Seeker micro-rocket', act:'semi', modes:['semi'], rpm:90, mag:12, v:40, dmg:70, salvo:4, rec:[1.2,.5], rl:[4.6,5.2], acc:6, wt:12, heavy:true, caseless:true, gyro:{ v:160, burn:.4 }, homing:4, he:{ r:3, dmg:90 },
  blurb:'A twelve-tube shoulder pod. Each pull looses four seeker micro-rockets that curve onto whatever they can see.',
  m:{ t:'bullpup', R:[.6,.14,.09], B:[.05,.03], hg:['none',0], stk:'famas', grip:'famas', mag:['int'], sgt:'flat', bh:'none', mz:'crown', pl:'bone', mt:'black', x:['rocketpod','railT','smartpod'] }});
O({ id:'brimstone', n:'Brimstone 14.5 Thermite Rifle', c:'SR', y:2034, co:'Kessler Dynamics', cal:'14.5×114mm', act:'semi', modes:['semi'], rpm:120, mag:5, v:1000, dmg:300, rec:[6,1.4], rl:[4.2,4.8], acc:.7, wt:19, heavy:true, inc:true, defOptic:'nxs',
  blurb:'A semi-automatic 14.5 mm anti-materiel rifle loaded with thermite incendiary. The barrel shroud glows as it heats.',
  m:{ t:'amr', R:[.6,.13,.075], B:[.95,.017], hg:['barrett',.45], stk:'barrett', grip:'pg', mag:['box',.14,0,-.05], sgt:'none', bh:'side_r', mz:'barrett', bip:1, pl:'crimson', mt:'black', x:['railT','heatsink'] }});
O({ id:'lastword', n:'Last Word 4-Bore Double Rifle', c:'RIF', y:2030, co:'Holloway & Sons', cal:'4 bore', act:'semi', modes:['semi'], rpm:120, mag:2, v:460, dmg:420, rec:[11,2.6], rl:[3.0,3.0], acc:2.2, wt:10.5, heavy:true,
  blurb:'A side-by-side double rifle in 4-bore: a quarter-pound lead ball per barrel. Built for dinosaurs, fired at people.',
  m:{ t:'semiw', R:[.2,.075,.05], B:[.62,.013], hg:['wood',.3], stk:'rifle_pg', grip:'st', mag:['int'], sgt:'rifle', bh:'none', mz:'crown', wd:'wood_dark', mt:'engraved', x:['dbl'] }});

// ============================================================ PSYCHO-ONLY ATTACHMENTS
const A = G.ATTACH, a = o => A.push(Object.assign(o, { psy: true }));
a({ id:'psy_oracle', slot:'optic', n:'Oracle BC-6 ballistic computer', e0:5, s:{ zoom:6, ret:'mil_xt', ads:1.22 }, d:'A 6× digital scope with a laser rangefinder and a live ballistic display.' });
a({ id:'psy_hellsight', slot:'optic', n:'Hellsight 3× thermal', e0:5, s:{ zoom:3, ret:'ring', ads:1.12 }, d:'A compact 3× optic with a bright ring reticle.' });
a({ id:'psy_maw', slot:'muzzle', n:'Maw quad-port brake', e0:5, not_cls:['PST'], s:{ rv:.7, rh:.8, loud:1.5, flash:1.4 }, d:'Four-chamber brake. It kills recoil and deafens everyone nearby.' });
a({ id:'psy_overclock', slot:'barrel', n:'Overclocked heavy barrel', e0:5, not_cls:['PST'], s:{ v:1.12, acc:.85, ads:1.08, rpmMul:1.15, bthick:1.3 }, d:'Stellite-lined heavy barrel with a hotter gas port: faster, flatter, and it cycles harder.' });
a({ id:'psy_saw', slot:'side', n:'Rip-Saw chain bayonet', e0:5, not_cls:['PST','SR'], s:{ melee:3, ads:1.06 }, d:'A motorised chainsaw bar under the muzzle. Melee with V.' });
a({ id:'psy_quad', slot:'mag', n:'Quad-stack casket magazine', e0:5, cls:['AR','SMG','CAR','DMR'], s:{ mag:2, rl:1.25, ads:1.05 }, d:'A four-column casket magazine: double capacity, slower to seat.' });
a({ id:'am_psy_he', slot:'ammo', n:'HE-frag micro-shells', e0:5, not_cls:['PST'], s:{ he:{ r:2, dmg:45 }, dmgMul:.8 }, d:'Every round carries a tiny explosive charge that bursts on impact.' });
a({ id:'am_psy_du', slot:'ammo', n:'Depleted-uranium penetrator', e0:5, s:{ pen:2, dmgMul:1.1, v:1.05 }, d:'A dense, self-sharpening core. Punches through cover and armour.' });
a({ id:'am_psy_therm', slot:'ammo', n:'Thermite incendiary', e0:5, s:{ inc:1, dmgMul:1.12 }, d:'Burning thermite filler. Flashes white-hot on impact.' });
a({ id:'am_psy_seek', slot:'ammo', n:'Seeker smart rounds', e0:5, not_cls:['SG','SR'], s:{ homing:2.5, dmgMul:.9 }, d:'Guided rounds that steer toward the nearest enemy in their cone.' });
a({ id:'fin_psy_chrome', slot:'finish', n:'Mirror chrome', e0:5, s:{ fin:'chrome' }, d:'Polished to a mirror.' });
a({ id:'fin_psy_crimson', slot:'finish', n:'Arterial crimson', e0:5, s:{ fin:'crimson' }, d:'Deep red anodising.' });
a({ id:'fin_psy_hazard', slot:'finish', n:'Hazard stripes', e0:5, s:{ fin:'hazard' }, d:'Yellow-and-black warning stripes.' });
a({ id:'fin_psy_rust', slot:'finish', n:'Scrapyard rust', e0:5, s:{ fin:'rust' }, d:'Weathered, pitted and proud of it.' });

G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));
G.ATT = Object.fromEntries(A.map(x => [x.id, x]));
})();
