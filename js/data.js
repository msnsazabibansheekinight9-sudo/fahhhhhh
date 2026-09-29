// ============================================================================
// IRONSIGHT — data: eras, calibers, weapons, attachments, enemy tiers, targets
// All distances in metres, velocities in m/s, masses in kg.
// ============================================================================
'use strict';
const G = window.G = window.G || {};

G.ERAS = [
  { id: 'ww1',  name: 'The Great War',  span: '1914 – 1918', ord: 0 },
  { id: 'ww2',  name: 'Second World War', span: '1939 – 1945', ord: 1 },
  { id: 'cold', name: 'Cold War',        span: '1946 – 1989', ord: 2 },
  { id: 'mod',  name: 'Modern',          span: '1990 – 2009', ord: 3 },
  { id: 'now',  name: 'Present Day',     span: '2010 – today', ord: 4 },
];
G.ERA = Object.fromEntries(G.ERAS.map(e => [e.id, e]));

// k = drag factor (dv/dx = -k·v), pen = penetration class (1 pistol … 5 .50 BMG),
// casing = [length, radius], shell = true for shotgun hulls
G.CAL = {
  '.303 British':   { k: .00082, pen: 3, cs: [.056, .0062] },
  '7.92×57mm':      { k: .00078, pen: 3, cs: [.057, .0060] },
  '.30-06':         { k: .00074, pen: 3, cs: [.063, .0060] },
  '7.62×54mmR':     { k: .00080, pen: 3, cs: [.054, .0063] },
  '8mm Lebel':      { k: .00090, pen: 3, cs: [.051, .0068] },
  '6.5×52mm':       { k: .00085, pen: 2, cs: [.052, .0056] },
  '6.5×50mmSR':     { k: .00085, pen: 2, cs: [.050, .0056] },
  '7.7×58mm':       { k: .00080, pen: 3, cs: [.058, .0060] },
  '.30-40 Krag':    { k: .00095, pen: 2, cs: [.058, .0062] },
  '.30 Carbine':    { k: .00160, pen: 2, cs: [.033, .0045] },
  '7.92×33mm Kurz': { k: .00130, pen: 2, cs: [.033, .0059] },
  '7.62×39mm':      { k: .00120, pen: 2, cs: [.039, .0056] },
  '7.62×51mm':      { k: .00070, pen: 3, cs: [.051, .0060] },
  '5.56×45mm':      { k: .00112, pen: 2, cs: [.045, .0048] },
  '5.45×39mm':      { k: .00110, pen: 2, cs: [.039, .0050] },
  '5.8×42mm':       { k: .00108, pen: 2, cs: [.042, .0052] },
  '6.8×51mm':       { k: .00064, pen: 4, cs: [.051, .0060] },
  '.300 BLK':       { k: .00150, pen: 2, cs: [.035, .0048] },
  '.338 Lapua':     { k: .00042, pen: 4, cs: [.069, .0074] },
  '.300 Win Mag':   { k: .00050, pen: 4, cs: [.067, .0066] },
  '.50 BMG':        { k: .00033, pen: 5, cs: [.099, .0100] },
  '9×19mm':         { k: .00180, pen: 1, cs: [.019, .0049] },
  '.45 ACP':        { k: .00200, pen: 1, cs: [.023, .0060] },
  '7.63×25mm':      { k: .00170, pen: 1, cs: [.025, .0048] },
  '7.62×25mm':      { k: .00165, pen: 2, cs: [.025, .0048] },
  '9×18mm':         { k: .00200, pen: 1, cs: [.018, .0049] },
  '.455 Webley':    { k: .00220, pen: 1, cs: [.020, .0061] },
  '.357 Magnum':    { k: .00170, pen: 2, cs: [.033, .0048] },
  '.44 Magnum':     { k: .00170, pen: 2, cs: [.033, .0058] },
  '.50 AE':         { k: .00180, pen: 2, cs: [.033, .0068] },
  '8×22mm Nambu':   { k: .00210, pen: 1, cs: [.022, .0048] },
  '.45 Colt':       { k: .00210, pen: 1, cs: [.033, .0060] },
  '4.6×30mm':       { k: .00140, pen: 2, cs: [.030, .0040] },
  '5.7×28mm':       { k: .00140, pen: 2, cs: [.028, .0040] },
  '.40 S&W':        { k: .00190, pen: 1, cs: [.021, .0053] },
  '12 gauge':       { k: .00600, pen: 1, cs: [.070, .0105], shell: true },
};

// ---------------------------------------------------------------------------
// Weapons. Fields:
// id, n name, e era, c class, y year, co country, cal, act action,
// modes fire modes, rpm, mag, v muzzle velocity, dmg base damage,
// rec [vertical, horizontal] recoil, rl [tactical, empty] reload s,
// acc MOA, wt kg, m = model spec (see gun.js)
// Classes: AR assault, BR battle rifle, RIF service rifle, CAR carbine,
// SMG, LMG, SR sniper, DMR, SG shotgun, PST sidearm
// ---------------------------------------------------------------------------
const W = [];
const w = (o) => W.push(o);

// ============================== WW1 ========================================
w({ id:'smle', n:'Lee–Enfield SMLE Mk III*', e:'ww1', c:'RIF', y:1916, co:'United Kingdom', cal:'.303 British', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:744, dmg:105, rec:[2.3,.5], rl:[2.6,3.4], acc:3, wt:3.96, cyc:.75,
  m:{ t:'bolt', R:[.25,.058,.042], B:[.64,.0085], hg:['wfull',.56], stk:'rifle', grip:'st', mag:['box',.07,0,-.04], sgt:'rifle', bh:'bolt', mz:'smle', wd:'wood', mt:'blued', x:['bands','nose','lug'] }});
w({ id:'g98', n:'Mauser Gewehr 98', e:'ww1', c:'RIF', y:1898, co:'German Empire', cal:'7.92×57mm', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:878, dmg:110, rec:[2.5,.5], rl:[2.4,3.2], acc:2.5, wt:4.09, cyc:.8,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.74,.0085], hg:['wfull',.62], stk:'rifle_pg', grip:'st', mag:['int'], sgt:'tall', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'m1903', n:'M1903 Springfield', e:'ww1', c:'RIF', y:1903, co:'United States', cal:'.30-06', act:'bolt', modes:['bolt'], rpm:38, mag:5, v:853, dmg:110, rec:[2.5,.5], rl:[2.4,3.2], acc:2.2, wt:3.95, cyc:.75,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.61,.0085], hg:['wfull',.52], stk:'rifle', grip:'st', mag:['int'], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood', mt:'park', x:['bands','lug'] }});
w({ id:'mosin91', n:'Mosin–Nagant M1891', e:'ww1', c:'RIF', y:1891, co:'Russian Empire', cal:'7.62×54mmR', act:'bolt', modes:['bolt'], rpm:32, mag:5, v:810, dmg:108, rec:[2.6,.6], rl:[2.6,3.4], acc:3, wt:4.22, cyc:.9,
  m:{ t:'bolt', R:[.24,.056,.04], B:[.80,.0085], hg:['wfull',.70], stk:'rifle', grip:'st', mag:['box',.06,0,-.05], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'lebel', n:'Lebel Model 1886/93', e:'ww1', c:'RIF', y:1893, co:'France', cal:'8mm Lebel', act:'bolt', modes:['bolt'], rpm:28, mag:8, v:700, dmg:104, rec:[2.4,.5], rl:[4.8,5.6], acc:3.2, wt:4.41, cyc:.95, tubeLoad:true,
  m:{ t:'bolt', R:[.24,.056,.04], B:[.80,.0085], hg:['wood',.36], stk:'rifle', grip:'st', mag:['int'], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood_dark', mt:'blued', x:['bands','tubemag','lug'] }});
w({ id:'carcano', n:'Carcano M1891', e:'ww1', c:'RIF', y:1891, co:'Kingdom of Italy', cal:'6.5×52mm', act:'bolt', modes:['bolt'], rpm:36, mag:6, v:710, dmg:98, rec:[2,.4], rl:[2.2,2.9], acc:3, wt:3.8, cyc:.75,
  m:{ t:'bolt', R:[.24,.054,.04], B:[.78,.008], hg:['wfull',.66], stk:'rifle', grip:'st', mag:['box',.05,0,-.04], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'arisaka38', n:'Arisaka Type 38', e:'ww1', c:'RIF', y:1905, co:'Empire of Japan', cal:'6.5×50mmSR', act:'bolt', modes:['bolt'], rpm:36, mag:5, v:765, dmg:96, rec:[1.9,.4], rl:[2.3,3.0], acc:2.6, wt:3.95, cyc:.75,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.80,.008], hg:['wfull',.68], stk:'rifle', grip:'st', mag:['int'], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood_red', mt:'blued', x:['bands','dustcover','lug'] }});
w({ id:'win1895', n:'Winchester Model 1895', e:'ww1', c:'RIF', y:1895, co:'United States', cal:'7.62×54mmR', act:'lever', modes:['lever'], rpm:50, mag:5, v:790, dmg:104, rec:[2.4,.6], rl:[2.8,3.6], acc:3.5, wt:4.1, cyc:.55,
  m:{ t:'lever', R:[.25,.075,.042], B:[.66,.0085], hg:['wood',.36], stk:'rifle', grip:'st', mag:['box',.075,0,-.02], sgt:'rifle', bh:'lever', mz:'crown', wd:'wood', mt:'blued', x:['bands'] }});
w({ id:'rsc17', n:'RSC Mle 1917', e:'ww1', c:'RIF', y:1917, co:'France', cal:'8mm Lebel', act:'semi', modes:['semi'], rpm:120, mag:5, v:700, dmg:100, rec:[2.6,.7], rl:[2.9,3.4], acc:4, wt:5.25,
  m:{ t:'bolt', R:[.30,.07,.046], B:[.80,.009], hg:['wfull',.66], stk:'rifle', grip:'st', mag:['box',.05,0,-.05], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood_dark', mt:'blued', x:['bands','gas','lug'] }});
w({ id:'mp18', n:'MP 18,I', e:'ww1', c:'SMG', y:1918, co:'German Empire', cal:'9×19mm', act:'auto_ob', modes:['auto'], rpm:450, mag:32, v:380, dmg:26, rec:[.55,.35], rl:[3.2,3.8], acc:8, wt:4.18,
  m:{ t:'smg', R:[.30,.045,.045], B:[.20,.0075], hg:['perf',.20,.02], stk:'rifle_short', grip:'st', mag:['snail',.10,0,-.03,-1.57], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:['jacket_holes'] }});
w({ id:'lewis', n:'Lewis Gun Mk I', e:'ww1', c:'LMG', y:1914, co:'United Kingdom', cal:'.303 British', act:'auto_ob', modes:['auto'], rpm:550, mag:47, v:745, dmg:52, rec:[.9,.45], rl:[4.6,5.4], acc:5, wt:13, heavy:true,
  m:{ t:'lmg', R:[.34,.08,.06], B:[.66,.03], hg:['jacket',.60,.055], stk:'rifle', grip:'pg', mag:['pan',.14,0,-.02], sgt:'lewis', bh:'side_r', mz:'lewis', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'chauchat', n:'Chauchat CSRG M1915', e:'ww1', c:'LMG', y:1915, co:'France', cal:'8mm Lebel', act:'auto_ob', modes:['auto','semi'], rpm:240, mag:20, v:700, dmg:52, rec:[1.1,.6], rl:[3.6,4.2], acc:9, wt:9.07, heavy:true,
  m:{ t:'lmg', R:[.36,.07,.05], B:[.45,.009], hg:['perf',.36,.028], stk:'rifle_pg', grip:'pg', mag:['half_moon',.16,.7,-.1], sgt:'rifle', bh:'side_r', mz:'crown', bip:1, wd:'wood_dark', mt:'blued', x:['frontgrip'] }});
w({ id:'bar1918', n:'M1918 BAR', e:'ww1', c:'LMG', y:1918, co:'United States', cal:'.30-06', act:'auto_ob', modes:['auto','semi'], rpm:550, mag:20, v:860, dmg:55, rec:[1.05,.5], rl:[2.8,3.4], acc:4, wt:7.25,
  m:{ t:'battle', R:[.38,.075,.05], B:[.50,.0095], hg:['wood',.26], stk:'rifle', grip:'st', mag:['box',.14,0,-.08], sgt:'rifle', bh:'side_l', mz:'crown', wd:'wood', mt:'park', x:['gas'] }});
w({ id:'mg0815', n:'MG 08/15', e:'ww1', c:'LMG', y:1917, co:'German Empire', cal:'7.92×57mm', act:'auto', modes:['auto'], rpm:500, mag:100, v:880, dmg:55, rec:[1.0,.5], rl:[5.6,6.4], acc:4, wt:18, heavy:true,
  m:{ t:'mg', R:[.42,.12,.09], B:[.40,.052], hg:['water',.44,.055], stk:'rifle_pg', grip:'pg', mag:['belt',.12], sgt:'rifle', bh:'side_r', mz:'crown', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'m1897', n:'Winchester M1897 Trench', e:'ww1', c:'SG', y:1917, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:70, mag:5, v:400, dmg:15, pellets:9, rec:[3,.8], rl:[.55,.55], acc:40, wt:3.6, cyc:.55, tubeLoad:true,
  m:{ t:'pump', R:[.22,.07,.045], B:[.51,.011], hg:['pump',.18], stk:'rifle', grip:'st', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', wd:'wood', mt:'blued', x:['heat','hammer','lug'] }});
w({ id:'m1911', n:'Colt M1911', e:'ww1', c:'PST', y:1911, co:'United States', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:300, mag:7, v:253, dmg:40, rec:[1.6,.6], rl:[1.6,2.0], acc:6, wt:1.1,
  m:{ t:'pistol', R:[.21,.035,.029], B:[.127,.0065], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', wd:'wood', mt:'park', x:['hammer'] }});
w({ id:'luger', n:'Luger P08', e:'ww1', c:'PST', y:1908, co:'German Empire', cal:'9×19mm', act:'semi', modes:['semi'], rpm:320, mag:8, v:350, dmg:32, rec:[1.2,.5], rl:[1.7,2.2], acc:5, wt:.87,
  m:{ t:'pistol', R:[.22,.03,.026], B:[.10,.006], stk:'none', grip:'pst_raked', mag:['pst',.12], sgt:'pst', bh:'toggle', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'c96', n:'Mauser C96', e:'ww1', c:'PST', y:1896, co:'German Empire', cal:'7.63×25mm', act:'semi', modes:['semi'], rpm:300, mag:10, v:425, dmg:34, rec:[1.3,.5], rl:[2.3,2.8], acc:5, wt:1.13,
  m:{ t:'pistol', R:[.20,.05,.028], B:[.14,.006], stk:'none', grip:'broom', mag:['int'], sgt:'tall', bh:'hammer_only', mz:'crown', wd:'wood_dark', mt:'blued', x:['hammer','magwell_front'] }});
w({ id:'webley', n:'Webley Mk VI', e:'ww1', c:'PST', y:1915, co:'United Kingdom', cal:'.455 Webley', act:'rev', modes:['semi'], rpm:150, mag:6, v:190, dmg:45, rec:[1.8,.6], rl:[2.8,2.8], acc:7, wt:1.1,
  m:{ t:'rev', R:[.12,.05,.036], B:[.15,.0065], stk:'none', grip:'rev', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', wd:'wood_dark', mt:'blued', x:['hammer','topbreak'] }});

// ============================== WW2 ========================================
w({ id:'garand', n:'M1 Garand', e:'ww2', c:'RIF', y:1936, co:'United States', cal:'.30-06', act:'semi', modes:['semi'], rpm:120, mag:8, v:853, dmg:95, rec:[2.2,.6], rl:[2.1,2.1], acc:2.5, wt:4.31, enbloc:true,
  m:{ t:'semiw', R:[.28,.062,.042], B:[.61,.009], hg:['wood',.42], stk:'garand', grip:'st', mag:['int'], sgt:'peep', bh:'side_r', mz:'garand', wd:'wood', mt:'park', x:['gas','lug'] }});
w({ id:'k98k', n:'Karabiner 98k', e:'ww2', c:'RIF', y:1935, co:'Germany', cal:'7.92×57mm', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:760, dmg:110, rec:[2.6,.6], rl:[2.3,3.1], acc:2.5, wt:3.9, cyc:.75,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.60,.0085], hg:['wfull',.50], stk:'rifle', grip:'st', mag:['int'], sgt:'hood', bh:'bolt_bent', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'mosin9130', n:'Mosin–Nagant 91/30', e:'ww2', c:'RIF', y:1930, co:'Soviet Union', cal:'7.62×54mmR', act:'bolt', modes:['bolt'], rpm:32, mag:5, v:865, dmg:108, rec:[2.6,.6], rl:[2.5,3.3], acc:2.8, wt:4.0, cyc:.9,
  m:{ t:'bolt', R:[.24,.056,.04], B:[.73,.0085], hg:['wfull',.62], stk:'rifle', grip:'st', mag:['box',.06,0,-.05], sgt:'hood', bh:'bolt', mz:'crown', wd:'wood_red', mt:'blued', x:['bands'] }});
w({ id:'no4', n:'Lee–Enfield No. 4 Mk I', e:'ww2', c:'RIF', y:1941, co:'United Kingdom', cal:'.303 British', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:744, dmg:105, rec:[2.3,.5], rl:[2.5,3.3], acc:2.5, wt:4.11, cyc:.7,
  m:{ t:'bolt', R:[.25,.058,.042], B:[.64,.0085], hg:['wfull',.56], stk:'rifle', grip:'st', mag:['box',.07,0,-.04], sgt:'peep', bh:'bolt', mz:'crown', wd:'wood', mt:'park', x:['bands','lug'] }});
w({ id:'type99', n:'Arisaka Type 99', e:'ww2', c:'RIF', y:1939, co:'Empire of Japan', cal:'7.7×58mm', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:730, dmg:106, rec:[2.4,.5], rl:[2.3,3.0], acc:2.8, wt:3.8, cyc:.75,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.66,.0085], hg:['wfull',.56], stk:'rifle', grip:'st', mag:['int'], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood_red', mt:'blued', x:['bands','monopod','lug'] }});
w({ id:'svt40', n:'SVT-40', e:'ww2', c:'RIF', y:1940, co:'Soviet Union', cal:'7.62×54mmR', act:'semi', modes:['semi'], rpm:140, mag:10, v:840, dmg:92, rec:[2.4,.7], rl:[2.4,2.9], acc:3.2, wt:3.85,
  m:{ t:'semiw', R:[.28,.064,.042], B:[.62,.009], hg:['perf',.34,.024], stk:'rifle', grip:'st', mag:['box',.09,.1,-.08], sgt:'hood', bh:'side_r', mz:'brake6', wd:'wood_red', mt:'blued', x:['gas','lug'] }});
w({ id:'g43', n:'Gewehr 43', e:'ww2', c:'RIF', y:1943, co:'Germany', cal:'7.92×57mm', act:'semi', modes:['semi'], rpm:130, mag:10, v:776, dmg:95, rec:[2.4,.7], rl:[2.4,2.9], acc:3, wt:4.4,
  m:{ t:'semiw', R:[.28,.064,.042], B:[.55,.009], hg:['wood',.32], stk:'rifle', grip:'st', mag:['box',.10,.05,-.08], sgt:'hood', bh:'side_l', mz:'crown', wd:'wood', mt:'blued', x:['gas','siderail_g43'] }});
w({ id:'m1carbine', n:'M1 Carbine', e:'ww2', c:'CAR', y:1942, co:'United States', cal:'.30 Carbine', act:'semi', modes:['semi'], rpm:150, mag:15, v:607, dmg:48, rec:[1.1,.4], rl:[1.9,2.4], acc:4, wt:2.36,
  m:{ t:'semiw', R:[.22,.05,.036], B:[.46,.0075], hg:['wood',.24], stk:'carbine', grip:'st', mag:['box',.09,0,-.06], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'park', x:['bands','sling_oiler'] }});
w({ id:'stg44', n:'StG 44', e:'ww2', c:'AR', y:1944, co:'Germany', cal:'7.92×33mm Kurz', act:'auto', modes:['auto','semi'], rpm:550, mag:30, v:685, dmg:40, rec:[.95,.45], rl:[2.6,3.2], acc:4.5, wt:4.62,
  m:{ t:'ak', R:[.34,.075,.048], B:[.42,.0085], hg:['stg',.18], stk:'stg', grip:'stg', mag:['curve',.25,.25,-.07], sgt:'hood', bh:'side_l', mz:'crown', wd:'wood', mt:'park', x:['gas','stg_rear'] }});
w({ id:'fg42', n:'FG 42', e:'ww2', c:'BR', y:1942, co:'Germany', cal:'7.92×57mm', act:'auto_ob', modes:['auto','semi'], rpm:900, mag:20, v:761, dmg:55, rec:[1.4,.8], rl:[2.5,3.1], acc:4, wt:4.95,
  m:{ t:'battle', R:[.30,.06,.042], B:[.50,.009], hg:['wood',.16], stk:'fg42', grip:'rake', mag:['sidebox_l',.13,0,-.10], sgt:'tall', bh:'side_r', mz:'comp', bip:1, wd:'wood', mt:'park', x:['gas','bayo_spike'] }});
w({ id:'thompson', n:'Thompson M1A1', e:'ww2', c:'SMG', y:1942, co:'United States', cal:'.45 ACP', act:'auto_ob', modes:['auto','semi'], rpm:700, mag:30, v:285, dmg:30, rec:[.7,.35], rl:[2.4,3.0], acc:8, wt:4.74,
  m:{ t:'smg', R:[.28,.065,.045], B:[.27,.0095], hg:['thompson',.14], stk:'thompson', grip:'pg_wood', mag:['box',.24,0,-.07], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'park', x:['fins_thompson'] }});
w({ id:'mp40', n:'MP 40', e:'ww2', c:'SMG', y:1940, co:'Germany', cal:'9×19mm', act:'auto_ob', modes:['auto'], rpm:500, mag:32, v:400, dmg:26, rec:[.5,.3], rl:[2.4,3.0], acc:8, wt:4.0,
  m:{ t:'smg', R:[.30,.042,.042], B:[.25,.0075], hg:['none',.0], stk:'under_fold', grip:'pg_bake', mag:['box',.25,0,-.07], sgt:'hood', bh:'side_l', mz:'crown', pl:'bakelite', mt:'blued', x:['resthook','magwell_long'] }});
w({ id:'ppsh', n:'PPSh-41', e:'ww2', c:'SMG', y:1941, co:'Soviet Union', cal:'7.62×25mm', act:'auto_ob', modes:['auto','semi'], rpm:1000, mag:71, v:488, dmg:24, rec:[.55,.45], rl:[3.6,4.4], acc:9, wt:5.45,
  m:{ t:'smg', R:[.32,.05,.045], B:[.27,.0075], hg:['perf',.26,.022], stk:'rifle_short', grip:'st', mag:['drum',.075,0,-.07], sgt:'hood', bh:'side_r', mz:'ppsh', wd:'wood_red', mt:'blued', x:[] }});
w({ id:'sten', n:'Sten Mk II', e:'ww2', c:'SMG', y:1941, co:'United Kingdom', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:540, mag:32, v:365, dmg:25, rec:[.55,.35], rl:[2.4,3.0], acc:9, wt:3.2,
  m:{ t:'smg', R:[.32,.034,.034], B:[.20,.0075], hg:['perf',.08,.017], stk:'sten', grip:'none', mag:['sidebox_l',.24,0,-.05], sgt:'peep', bh:'side_r', mz:'crown', mt:'park', x:[] }});
w({ id:'m3', n:'M3 “Grease Gun”', e:'ww2', c:'SMG', y:1942, co:'United States', cal:'.45 ACP', act:'auto_ob', modes:['auto'], rpm:450, mag:30, v:280, dmg:30, rec:[.55,.35], rl:[2.6,3.2], acc:9, wt:3.7,
  m:{ t:'smg', R:[.22,.06,.06], B:[.20,.009], hg:['none',0], stk:'wire', grip:'pg_metal', mag:['box',.22,0,-.08], sgt:'peep', bh:'crank', mz:'crown', mt:'park', x:['round_body'] }});
w({ id:'pps43', n:'PPS-43', e:'ww2', c:'SMG', y:1943, co:'Soviet Union', cal:'7.62×25mm', act:'auto_ob', modes:['auto'], rpm:650, mag:35, v:500, dmg:24, rec:[.55,.4], rl:[2.4,3.0], acc:9, wt:3.04,
  m:{ t:'smg', R:[.28,.05,.035], B:[.25,.0075], hg:['perf',.20,.022], stk:'top_fold', grip:'pg_wood', mag:['curve',.20,.3,-.06], sgt:'hood', bh:'side_r', mz:'ppsh', wd:'wood', mt:'blued', x:[] }});
w({ id:'mg42', n:'MG 42', e:'ww2', c:'LMG', y:1942, co:'Germany', cal:'7.92×57mm', act:'auto_ob', modes:['auto'], rpm:1200, mag:50, v:740, dmg:52, rec:[1.25,.7], rl:[4.8,5.6], acc:6, wt:11.6, heavy:true,
  m:{ t:'mg', R:[.36,.08,.05], B:[.53,.012], hg:['mg42',.40,.03], stk:'mg42', grip:'pg', mag:['beltdrum',.08], sgt:'mg42', bh:'side_r', mz:'mg42', bip:1, pl:'bakelite', mt:'blued', x:[] }});
w({ id:'bren', n:'Bren Mk I', e:'ww2', c:'LMG', y:1938, co:'United Kingdom', cal:'.303 British', act:'auto_ob', modes:['auto','semi'], rpm:500, mag:30, v:743, dmg:52, rec:[.9,.4], rl:[2.8,3.4], acc:3.5, wt:10.35,
  m:{ t:'lmg', R:[.40,.075,.05], B:[.63,.011], hg:['fin',.22,.018], stk:'bren', grip:'pg', mag:['top_curve',.20,.35,-.05], sgt:'offset_l', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'park', x:['carryhandle_bren','gas'] }});
w({ id:'dp28', n:'DP-28', e:'ww2', c:'LMG', y:1928, co:'Soviet Union', cal:'7.62×54mmR', act:'auto_ob', modes:['auto'], rpm:550, mag:47, v:840, dmg:52, rec:[1.0,.5], rl:[4.2,4.8], acc:5, wt:9.12, heavy:true,
  m:{ t:'lmg', R:[.34,.07,.05], B:[.60,.011], hg:['perf',.46,.034], stk:'rifle', grip:'st', mag:['pan',.14,0,-.04], sgt:'hood', bh:'side_r', mz:'cone', bip:1, wd:'wood_red', mt:'blued', x:[] }});
w({ id:'bar1918a2', n:'M1918A2 BAR', e:'ww2', c:'LMG', y:1938, co:'United States', cal:'.30-06', act:'auto_ob', modes:['auto'], rpm:550, mag:20, v:860, dmg:55, rec:[1.0,.45], rl:[2.8,3.4], acc:4, wt:8.8,
  m:{ t:'battle', R:[.38,.075,.05], B:[.50,.0095], hg:['wood',.26], stk:'rifle', grip:'st', mag:['box',.14,0,-.08], sgt:'rifle', bh:'side_l', mz:'cone', bip:1, wd:'wood', mt:'park', x:['gas'] }});
w({ id:'m1912', n:'Winchester M1912 Trench', e:'ww2', c:'SG', y:1942, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:70, mag:6, v:400, dmg:15, pellets:9, rec:[3,.8], rl:[.55,.55], acc:40, wt:3.6, cyc:.5, tubeLoad:true,
  m:{ t:'pump', R:[.22,.066,.044], B:[.51,.011], hg:['pump',.18], stk:'rifle', grip:'st', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', wd:'wood', mt:'park', x:['heat','lug'] }});
w({ id:'p38', n:'Walther P38', e:'ww2', c:'PST', y:1939, co:'Germany', cal:'9×19mm', act:'semi', modes:['semi'], rpm:320, mag:8, v:365, dmg:30, rec:[1.2,.5], rl:[1.6,2.0], acc:5, wt:.8,
  m:{ t:'pistol', R:[.2,.035,.028], B:[.125,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide_open', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'m1911a1', n:'Colt M1911A1', e:'ww2', c:'PST', y:1926, co:'United States', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:300, mag:7, v:253, dmg:40, rec:[1.6,.6], rl:[1.6,2.0], acc:6, wt:1.1,
  m:{ t:'pistol', R:[.21,.035,.029], B:[.127,.0065], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'park', x:['hammer'] }});
w({ id:'tt33', n:'Tokarev TT-33', e:'ww2', c:'PST', y:1933, co:'Soviet Union', cal:'7.62×25mm', act:'semi', modes:['semi'], rpm:320, mag:8, v:420, dmg:32, rec:[1.3,.5], rl:[1.6,2.0], acc:5, wt:.85,
  m:{ t:'pistol', R:[.196,.034,.027], B:[.116,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'nambu14', n:'Nambu Type 14', e:'ww2', c:'PST', y:1927, co:'Empire of Japan', cal:'8×22mm Nambu', act:'semi', modes:['semi'], rpm:300, mag:8, v:290, dmg:26, rec:[1,.4], rl:[1.8,2.2], acc:6, wt:.9,
  m:{ t:'pistol', R:[.23,.03,.026], B:[.12,.006], stk:'none', grip:'pst_raked', mag:['pst',.12], sgt:'pst', bh:'cock_knob', mz:'crown', wd:'wood', mt:'blued', x:[] }});

// ============================ COLD WAR =====================================
w({ id:'ak47', n:'AK-47 (Type 3)', e:'cold', c:'AR', y:1951, co:'Soviet Union', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:600, mag:30, v:715, dmg:40, rec:[1.05,.6], rl:[2.5,3.1], acc:4, wt:3.47,
  m:{ t:'ak', R:[.30,.07,.045], B:[.415,.0085], hg:['ak',.21], stk:'ak', grip:'ak', mag:['curve',.21,.5,-.07], sgt:'ak', bh:'ak', mz:'crown', wd:'wood', mt:'blued', x:['gas','dust','lug'] }});
w({ id:'akm', n:'AKM', e:'cold', c:'AR', y:1959, co:'Soviet Union', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:600, mag:30, v:715, dmg:40, rec:[1.0,.55], rl:[2.4,3.0], acc:4, wt:3.1,
  m:{ t:'ak', R:[.30,.07,.045], B:[.415,.0085], hg:['ak_rib',.21], stk:'ak', grip:'ak', mag:['curve',.21,.5,-.07], sgt:'ak', bh:'ak', mz:'slant', wd:'wood_red', mt:'blued', x:['gas','dust','lug'] }});
w({ id:'ak74', n:'AK-74', e:'cold', c:'AR', y:1974, co:'Soviet Union', cal:'5.45×39mm', act:'auto', modes:['auto','semi'], rpm:650, mag:30, v:900, dmg:32, rec:[.7,.45], rl:[2.4,3.0], acc:3.5, wt:3.3,
  m:{ t:'ak', R:[.30,.07,.045], B:[.415,.0085], hg:['ak_rib',.21], stk:'ak', grip:'ak', mag:['curve',.20,.35,-.07], sgt:'ak', bh:'ak', mz:'ak74', wd:'wood_red', pl:'plum', mt:'blued', x:['gas','dust','lug'] }});
w({ id:'m16a1', n:'M16A1', e:'cold', c:'AR', y:1967, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:990, dmg:30, rec:[.6,.35], rl:[2.2,2.8], acc:3, wt:2.89,
  m:{ t:'ar', R:[.30,.08,.036], B:[.50,.0085], hg:['ar_tri',.30], stk:'ar_a1', grip:'ar', mag:['box',.13,0,-.06], sgt:'handle', bh:'ar', mz:'bird', pl:'black', mt:'park', x:['fa','lug'] }});
w({ id:'xm177', n:'XM177E2 “CAR-15”', e:'cold', c:'CAR', y:1967, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:840, dmg:28, rec:[.7,.45], rl:[2.1,2.7], acc:4, wt:2.49,
  m:{ t:'ar', R:[.30,.08,.036], B:[.29,.0085], hg:['ar_round',.18], stk:'ar_coll', grip:'ar', mag:['box',.13,0,-.06], sgt:'handle', bh:'ar', mz:'moderator', pl:'black', mt:'park', x:['fa'] }});
w({ id:'m14', n:'M14', e:'cold', c:'BR', y:1959, co:'United States', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:725, mag:20, v:850, dmg:58, rec:[1.5,.7], rl:[2.5,3.1], acc:2.2, wt:4.1,
  m:{ t:'semiw', R:[.30,.07,.042], B:[.56,.009], hg:['wood_top',.36], stk:'garand', grip:'st', mag:['box',.13,0,-.08], sgt:'peep', bh:'side_r', mz:'m14', wd:'wood', mt:'park', x:['gas','lug'] }});
w({ id:'fal', n:'FN FAL (L1A1 SLR)', e:'cold', c:'BR', y:1954, co:'Belgium / UK', cal:'7.62×51mm', act:'semi', modes:['semi','auto'], rpm:650, mag:20, v:840, dmg:58, rec:[1.5,.75], rl:[2.5,3.1], acc:2.5, wt:4.3,
  m:{ t:'battle', R:[.34,.08,.045], B:[.53,.009], hg:['fal',.26], stk:'fal', grip:'fal', mag:['box',.15,.05,-.07], sgt:'peep', bh:'side_l', mz:'fal', pl:'black', mt:'park', x:['carry_fold','gas'] }});
w({ id:'g3', n:'H&K G3A3', e:'cold', c:'BR', y:1959, co:'West Germany', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:550, mag:20, v:800, dmg:58, rec:[1.5,.8], rl:[2.7,3.4], acc:2.5, wt:4.38,
  m:{ t:'battle', R:[.33,.075,.045], B:[.45,.009], hg:['g3',.25], stk:'g3', grip:'hk', mag:['box',.14,.1,-.06], sgt:'drum_hk', bh:'hk', mz:'bird', pl:'black', mt:'black', x:['cocking_tube','claw'] }});
w({ id:'galil', n:'IMI Galil ARM', e:'cold', c:'AR', y:1972, co:'Israel', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:650, mag:35, v:950, dmg:30, rec:[.7,.45], rl:[2.5,3.1], acc:3.5, wt:4.35,
  m:{ t:'ak', R:[.30,.07,.045], B:[.46,.0085], hg:['galil',.21], stk:'side_fold', grip:'ak', mag:['curve',.21,.25,-.07], sgt:'ak', bh:'ak_up', mz:'bird', bip:1, wd:'wood', pl:'black', mt:'park', x:['gas','dust','carry_galil'] }});
w({ id:'aug', n:'Steyr AUG A1', e:'cold', c:'AR', y:1978, co:'Austria', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:680, mag:30, v:970, dmg:30, rec:[.55,.35], rl:[2.9,3.4], acc:3, wt:3.6, defOptic:'aug_scope',
  m:{ bi:.09, t:'bullpup', R:[.46,.09,.05], B:[.42,.0085], hg:['none',0], stk:'aug', grip:'aug', mag:['box_clear',.18,.15,.10], sgt:'aug_scope', bh:'side_l', mz:'bird', pl:'od', mt:'black', x:['aug_fold'] }});
w({ id:'mp5', n:'H&K MP5A3', e:'cold', c:'SMG', y:1966, co:'West Germany', cal:'9×19mm', act:'auto', modes:['auto','burst3','semi'], rpm:800, mag:30, v:400, dmg:25, rec:[.35,.25], rl:[2.2,2.9], acc:5, wt:2.54,
  m:{ t:'smg', R:[.27,.06,.04], B:[.225,.008], hg:['mp5',.14], stk:'mp5_coll', grip:'hk', mag:['curve',.18,.4,-.06], sgt:'drum_hk', bh:'hk', mz:'crown', pl:'black', mt:'black', x:['cocking_tube','claw'] }});
w({ id:'uzi', n:'IMI Uzi', e:'cold', c:'SMG', y:1954, co:'Israel', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:600, mag:32, v:400, dmg:25, rec:[.45,.3], rl:[2.0,2.6], acc:8, wt:3.5,
  m:{ t:'smg', R:[.27,.07,.045], B:[.26,.008], hg:['none',0], stk:'uzi', grip:'magwell', mag:['box',.20,0,.02], sgt:'uzi', bh:'top', mz:'crown', pl:'black', mt:'park', x:['uzi_body'] }});
w({ id:'sterling', n:'Sterling L2A3', e:'cold', c:'SMG', y:1953, co:'United Kingdom', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:550, mag:34, v:390, dmg:25, rec:[.4,.3], rl:[2.4,3.0], acc:7, wt:2.7,
  m:{ t:'smg', R:[.33,.045,.045], B:[.19,.0075], hg:['perf',.14,.024], stk:'under_fold', grip:'pg_metal', mag:['sidebox_l',.20,.35,-.05], sgt:'peep', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['round_body'] }});
w({ id:'mac10', n:'MAC-10', e:'cold', c:'SMG', y:1970, co:'United States', cal:'.45 ACP', act:'auto_ob', modes:['auto','semi'], rpm:1090, mag:30, v:280, dmg:28, rec:[.85,.65], rl:[1.9,2.4], acc:12, wt:2.84,
  m:{ t:'smg', R:[.27,.08,.05], B:[.146,.0085], hg:['none',0], stk:'wire_mac', grip:'magwell', mag:['box',.24,0,.02], sgt:'pst', bh:'top', mz:'crown', pl:'black', mt:'black', x:['mac_strap'] }});
w({ id:'m60', n:'M60', e:'cold', c:'LMG', y:1957, co:'United States', cal:'7.62×51mm', act:'auto_ob', modes:['auto'], rpm:550, mag:100, v:853, dmg:56, rec:[1.05,.55], rl:[5.2,6.0], acc:5, wt:10.5, heavy:true,
  m:{ t:'mg', R:[.40,.085,.055], B:[.56,.012], hg:['m60',.22], stk:'m60', grip:'pg', mag:['beltbox',.14], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, pl:'black', mt:'park', x:['carry_m60','gas'] }});
w({ id:'rpd', n:'RPD', e:'cold', c:'LMG', y:1944, co:'Soviet Union', cal:'7.62×39mm', act:'auto_ob', modes:['auto'], rpm:700, mag:100, v:735, dmg:40, rec:[.8,.45], rl:[4.8,5.6], acc:5, wt:7.4,
  m:{ t:'mg', R:[.36,.07,.05], B:[.52,.0095], hg:['wood',.24], stk:'rifle_pg', grip:'pg', mag:['beltdrum',.10], sgt:'hood', bh:'side_r', mz:'crown', bip:1, wd:'wood_red', mt:'blued', x:['gas'] }});
w({ id:'rpk', n:'RPK', e:'cold', c:'LMG', y:1961, co:'Soviet Union', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:600, mag:40, v:745, dmg:40, rec:[.8,.45], rl:[2.7,3.3], acc:3.5, wt:4.8,
  m:{ t:'ak', R:[.30,.07,.045], B:[.59,.0095], hg:['ak_rib',.21], stk:'rpk', grip:'ak', mag:['curve',.26,.6,-.07], sgt:'ak', bh:'ak', mz:'crown', bip:1, wd:'wood_red', mt:'blued', x:['gas','dust'] }});
w({ id:'pkm', n:'PKM', e:'cold', c:'LMG', y:1969, co:'Soviet Union', cal:'7.62×54mmR', act:'auto_ob', modes:['auto'], rpm:650, mag:100, v:825, dmg:55, rec:[1.0,.55], rl:[5.0,5.8], acc:4.5, wt:7.5, heavy:true,
  m:{ t:'mg', R:[.38,.085,.05], B:[.60,.011], hg:['none',0], stk:'pkm', grip:'pg', mag:['beltbox',.14], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, pl:'plum', mt:'blued', x:['gas','carry_pk'] }});
w({ id:'sks', n:'SKS', e:'cold', c:'CAR', y:1949, co:'Soviet Union', cal:'7.62×39mm', act:'semi', modes:['semi'], rpm:120, mag:10, v:735, dmg:42, rec:[1.0,.45], rl:[2.4,2.4], acc:3, wt:3.85,
  m:{ t:'semiw', R:[.28,.062,.04], B:[.52,.0085], hg:['wood_top',.26], stk:'rifle', grip:'st', mag:['box',.05,0,-.05], sgt:'hood', bh:'side_r', mz:'crown', wd:'wood_red', mt:'blued', x:['gas','bayo_fold'] }});
w({ id:'svd', n:'Dragunov SVD', e:'cold', c:'DMR', y:1963, co:'Soviet Union', cal:'7.62×54mmR', act:'semi', modes:['semi'], rpm:30, mag:10, v:830, dmg:90, rec:[1.8,.6], rl:[2.6,3.2], acc:1.3, wt:4.3, defOptic:'pso1',
  m:{ t:'ak', R:[.30,.07,.045], B:[.62,.0085], hg:['svd',.23], stk:'svd', grip:'none', mag:['box',.10,.1,-.08], sgt:'ak', bh:'ak', mz:'svd', wd:'wood', mt:'blued', x:['gas','dust','siderail'] }});
w({ id:'m21', n:'M21 SWS', e:'cold', c:'DMR', y:1969, co:'United States', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:30, mag:20, v:853, dmg:88, rec:[1.7,.6], rl:[2.5,3.1], acc:1, wt:5.27, defOptic:'art',
  m:{ t:'semiw', R:[.30,.07,.042], B:[.56,.0095], hg:['wood_top',.36], stk:'garand', grip:'st', mag:['box',.13,0,-.08], sgt:'peep', bh:'side_r', mz:'m14', wd:'wood_dark', mt:'park', x:['gas','siderail'] }});
w({ id:'m40', n:'M40', e:'cold', c:'SR', y:1966, co:'United States', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:777, dmg:115, rec:[1.9,.4], rl:[2.6,3.2], acc:.8, wt:6.57, cyc:.8, defOptic:'redfield',
  m:{ t:'bolt', R:[.22,.06,.04], B:[.61,.011], hg:['wood',.40], stk:'sporter', grip:'pg_wood', mag:['int'], sgt:'none', bh:'bolt', mz:'crown', wd:'wood', mt:'black', x:['rail_bolt'] }});
w({ id:'r870', n:'Remington 870', e:'cold', c:'SG', y:1951, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:70, mag:7, v:400, dmg:15, pellets:9, rec:[2.8,.8], rl:[.5,.5], acc:40, wt:3.6, cyc:.5, tubeLoad:true,
  m:{ t:'pump', R:[.23,.07,.044], B:[.47,.011], hg:['pump_ribbed',.2], stk:'poly_sg', grip:'st', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', pl:'black', mt:'park', x:[] }});
w({ id:'spas12', n:'Franchi SPAS-12', e:'cold', c:'SG', y:1979, co:'Italy', cal:'12 gauge', act:'semi', modes:['semi','pump'], rpm:240, mag:8, v:400, dmg:15, pellets:9, rec:[2.8,.9], rl:[.5,.5], acc:40, wt:4.4, cyc:.5, tubeLoad:true,
  m:{ t:'pump', R:[.25,.08,.046], B:[.46,.012], hg:['spas',.22], stk:'spas', grip:'pg', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', pl:'black', mt:'black', x:['heat_spas'] }});
w({ id:'makarov', n:'Makarov PM', e:'cold', c:'PST', y:1951, co:'Soviet Union', cal:'9×18mm', act:'semi', modes:['semi'], rpm:320, mag:8, v:315, dmg:26, rec:[1,.4], rl:[1.5,1.9], acc:6, wt:.73,
  m:{ t:'pistol', R:[.161,.034,.03], B:[.093,.006], stk:'none', grip:'pst', mag:['pst',.1], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'hipower', n:'Browning Hi-Power', e:'cold', c:'PST', y:1935, co:'Belgium', cal:'9×19mm', act:'semi', modes:['semi'], rpm:320, mag:13, v:350, dmg:28, rec:[1.1,.45], rl:[1.6,2.0], acc:5, wt:1.0,
  m:{ t:'pistol', R:[.197,.035,.03], B:[.118,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'blued', x:['hammer'] }});
w({ id:'python', n:'Colt Python', e:'cold', c:'PST', y:1955, co:'United States', cal:'.357 Magnum', act:'rev', modes:['semi'], rpm:150, mag:6, v:440, dmg:52, rec:[2.0,.7], rl:[2.6,2.6], acc:4, wt:1.2,
  m:{ t:'rev', R:[.12,.05,.036], B:[.15,.0065], stk:'none', grip:'rev_wood', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', wd:'wood', mt:'blued', x:['hammer','vent_rib'] }});
w({ id:'m1911cw', n:'M1911A1 (Vietnam)', e:'cold', c:'PST', y:1960, co:'United States', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:300, mag:7, v:253, dmg:40, rec:[1.6,.6], rl:[1.6,2.0], acc:6, wt:1.1,
  m:{ t:'pistol', R:[.21,.035,.029], B:[.127,.0065], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'park', x:['hammer'] }});
w({ id:'glock17', n:'Glock 17 (Gen 1)', e:'cold', c:'PST', y:1982, co:'Austria', cal:'9×19mm', act:'semi', modes:['semi'], rpm:340, mag:17, v:375, dmg:26, rec:[1.0,.4], rl:[1.4,1.8], acc:5, wt:.63,
  m:{ t:'pistol', R:[.186,.032,.03], B:[.114,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:[] }});
w({ id:'beretta92', n:'Beretta 92F', e:'cold', c:'PST', y:1985, co:'Italy', cal:'9×19mm', act:'semi', modes:['semi'], rpm:330, mag:15, v:381, dmg:27, rec:[1.0,.4], rl:[1.5,1.9], acc:4.5, wt:.95,
  m:{ t:'pistol', R:[.217,.035,.03], B:[.125,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide_open', mz:'crown', pl:'black', mt:'black', x:['hammer'] }});

// ============================== MODERN =====================================
w({ id:'m4a1', n:'Colt M4A1', e:'mod', c:'CAR', y:1994, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:800, mag:30, v:880, dmg:29, rec:[.55,.35], rl:[2.0,2.6], acc:3, wt:2.9,
  m:{ t:'ar', R:[.30,.08,.036], B:[.37,.0085], hg:['quad',.18], stk:'ar_coll', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'bird', pl:'black', mt:'black', x:['fa','railT','lug'] }});
w({ id:'m16a4', n:'M16A4', e:'mod', c:'AR', y:1998, co:'United States', cal:'5.56×45mm', act:'auto', modes:['burst3','semi'], rpm:800, mag:30, v:948, dmg:30, rec:[.5,.3], rl:[2.1,2.7], acc:2.5, wt:3.26,
  m:{ t:'ar', R:[.30,.08,.036], B:[.51,.0085], hg:['quad',.30], stk:'ar_a2', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'bird', pl:'black', mt:'black', x:['fa','railT','lug'] }});
w({ id:'ak74m', n:'AK-74M', e:'mod', c:'AR', y:1991, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['auto','semi'], rpm:650, mag:30, v:900, dmg:32, rec:[.65,.4], rl:[2.3,2.9], acc:3.5, wt:3.4,
  m:{ t:'ak', R:[.30,.07,.045], B:[.415,.0085], hg:['ak_poly',.21], stk:'ak_side', grip:'ak', mag:['curve',.20,.35,-.07], sgt:'ak', bh:'ak', mz:'ak74', pl:'black', mt:'black', x:['gas','dust','siderail','lug'] }});
w({ id:'an94', n:'AN-94 “Abakan”', e:'mod', c:'AR', y:1994, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['burst2','auto','semi'], rpm:600, burstRpm:1800, mag:30, v:900, dmg:32, rec:[.6,.35], rl:[2.5,3.1], acc:2.8, wt:3.85,
  m:{ t:'ak', R:[.34,.075,.045], B:[.405,.0085], hg:['ak_poly',.22], stk:'ak_side', grip:'ak', mag:['curve',.20,.3,-.09,.25], sgt:'ak', bh:'ak', mz:'an94', pl:'black', mt:'black', x:['gas','siderail'] }});
w({ id:'g36', n:'H&K G36', e:'mod', c:'AR', y:1997, co:'Germany', cal:'5.56×45mm', act:'auto', modes:['auto','burst2','semi'], rpm:750, mag:30, v:920, dmg:30, rec:[.5,.3], rl:[2.4,2.9], acc:3, wt:3.63, defOptic:'g36_dual',
  m:{ t:'ar', R:[.36,.08,.042], B:[.48,.0085], hg:['g36',.26], stk:'g36', grip:'g36', mag:['box_clear',.19,.15,-.06], sgt:'g36_handle', bh:'g36', mz:'bird', pl:'g36', mt:'black', x:[] }});
w({ id:'famas', n:'FAMAS F1', e:'mod', c:'AR', y:1978, co:'France', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:1000, mag:25, v:960, dmg:30, rec:[.6,.4], rl:[2.6,3.1], acc:3, wt:3.61,
  m:{ bi:.19, t:'bullpup', R:[.46,.09,.045], B:[.49,.0085], hg:['none',0], stk:'famas', grip:'famas', mag:['box',.15,0,.10], sgt:'famas', bh:'famas', mz:'bird', bip:1, pl:'black', mt:'black', x:['famas_handle'] }});
w({ id:'l85', n:'L85A2', e:'mod', c:'AR', y:2002, co:'United Kingdom', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:940, dmg:30, rec:[.45,.3], rl:[2.6,3.2], acc:2.5, wt:3.82, defOptic:'susat',
  m:{ bi:.21, t:'bullpup', R:[.48,.085,.045], B:[.518,.0085], hg:['l85',.18], stk:'l85', grip:'l85', mag:['curve',.19,.15,.10], sgt:'flat', bh:'side_r', mz:'bird', pl:'black', mt:'black', x:['railT'] }});
w({ id:'qbz95', n:'QBZ-95', e:'mod', c:'AR', y:1997, co:'China', cal:'5.8×42mm', act:'auto', modes:['auto','semi'], rpm:650, mag:30, v:930, dmg:31, rec:[.55,.35], rl:[2.6,3.2], acc:3, wt:3.25,
  m:{ bi:.18, t:'bullpup', R:[.46,.09,.045], B:[.463,.0085], hg:['none',0], stk:'qbz', grip:'qbz', mag:['curve',.19,.2,.10], sgt:'qbz_handle', bh:'qbz', mz:'bird', pl:'black', mt:'black', x:[] }});
w({ id:'tavor', n:'IWI Tavor TAR-21', e:'mod', c:'AR', y:2001, co:'Israel', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:910, dmg:30, rec:[.5,.3], rl:[2.5,3.0], acc:3, wt:3.27,
  m:{ bi:.2, t:'bullpup', R:[.46,.10,.05], B:[.46,.0085], hg:['none',0], stk:'tavor', grip:'tavor', mag:['curve',.19,.15,.10], sgt:'flat', bh:'side_l', mz:'bird', pl:'black', mt:'black', x:['railT','tavor_guard'] }});
w({ id:'hk416', n:'H&K HK416', e:'mod', c:'CAR', y:2005, co:'Germany', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:880, dmg:29, rec:[.5,.32], rl:[2.0,2.6], acc:2.2, wt:3.49,
  m:{ t:'ar', R:[.30,.08,.036], B:[.368,.0085], hg:['quad_long',.26], stk:'crane', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'a2', pl:'black', mt:'black', x:['fa','railT'] }});
w({ id:'scarl', n:'FN SCAR-L (Mk 16)', e:'mod', c:'AR', y:2009, co:'Belgium', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:625, mag:30, v:870, dmg:30, rec:[.5,.3], rl:[2.2,2.8], acc:2, wt:3.29,
  m:{ t:'scar', R:[.38,.09,.045], B:[.36,.0085], hg:['scar',.22], stk:'scar', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'scarh', n:'FN SCAR-H (Mk 17)', e:'mod', c:'BR', y:2009, co:'Belgium', cal:'7.62×51mm', act:'auto', modes:['auto','semi'], rpm:600, mag:20, v:800, dmg:56, rec:[1.3,.6], rl:[2.4,3.0], acc:1.8, wt:3.58,
  m:{ t:'scar', R:[.38,.095,.047], B:[.40,.0095], hg:['scar',.22], stk:'scar', grip:'ar', mag:['box',.15,0,-.07], sgt:'flat', bh:'side_l', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'m249', n:'M249 SAW', e:'mod', c:'LMG', y:1984, co:'United States', cal:'5.56×45mm', act:'auto_ob', modes:['auto'], rpm:800, mag:200, v:915, dmg:29, rec:[.6,.4], rl:[5.2,6.0], acc:4, wt:7.5, heavy:true,
  m:{ t:'mg', R:[.40,.09,.055], B:[.465,.011], hg:['saw',.20], stk:'saw', grip:'pg', mag:['beltbox',.16], sgt:'rifle', bh:'side_r', mz:'bird', bip:1, pl:'black', mt:'black', x:['carry_saw','railT'] }});
w({ id:'m240', n:'M240B', e:'mod', c:'LMG', y:1997, co:'United States', cal:'7.62×51mm', act:'auto_ob', modes:['auto'], rpm:650, mag:100, v:853, dmg:56, rec:[1.0,.5], rl:[5.6,6.4], acc:4, wt:12.5, heavy:true,
  m:{ t:'mg', R:[.46,.10,.058], B:[.63,.012], hg:['m240',.25], stk:'m240', grip:'pg', mag:['beltbox',.16], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, pl:'black', mt:'black', x:['carry_saw','railT'] }});
w({ id:'p90', n:'FN P90', e:'mod', c:'SMG', y:1990, co:'Belgium', cal:'5.7×28mm', act:'auto', modes:['auto','semi'], rpm:900, mag:50, v:715, dmg:24, rec:[.3,.22], rl:[2.9,3.4], acc:4, wt:2.54,
  m:{ bi:.24, t:'bullpup', R:[.48,.11,.055], B:[.263,.0075], hg:['none',0], stk:'p90', grip:'p90', mag:['p90',.26], sgt:'p90', bh:'side_both', mz:'crown', pl:'black', mt:'black', x:[] }});
w({ id:'ump45', n:'H&K UMP45', e:'mod', c:'SMG', y:1999, co:'Germany', cal:'.45 ACP', act:'auto', modes:['auto','burst2','semi'], rpm:600, mag:25, v:285, dmg:30, rec:[.45,.3], rl:[2.2,2.8], acc:5, wt:2.3,
  m:{ t:'smg', R:[.30,.075,.04], B:[.20,.009], hg:['ump',.14], stk:'ump', grip:'hk_poly', mag:['box',.17,0,-.06], sgt:'flat', bh:'hk', mz:'crown', pl:'black', mt:'black', x:['cocking_tube','railT'] }});
w({ id:'mp7', n:'H&K MP7A1', e:'mod', c:'SMG', y:2001, co:'Germany', cal:'4.6×30mm', act:'auto', modes:['auto','semi'], rpm:950, mag:40, v:735, dmg:22, rec:[.3,.22], rl:[2.0,2.5], acc:4, wt:1.9,
  m:{ bi:.1, t:'smg', R:[.30,.058,.036], B:[.18,.007], hg:['none',0], stk:'mp7', grip:'magwell', mag:['box',.20,0,.02], sgt:'flat', bh:'ar', mz:'crown', pl:'black', mt:'black', x:['railT','foldgrip'] }});
w({ id:'vector', n:'KRISS Vector', e:'mod', c:'SMG', y:2009, co:'United States', cal:'.45 ACP', act:'auto', modes:['auto','burst2','semi'], rpm:1200, mag:25, v:290, dmg:28, rec:[.3,.22], rl:[2.2,2.8], acc:5, wt:2.7,
  m:{ bi:.06, t:'smg', R:[.33,.085,.045], B:[.14,.009], hg:['vector',.12], stk:'vector', grip:'vector', mag:['box',.17,0,.00], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'m24', n:'M24 SWS', e:'mod', c:'SR', y:1988, co:'United States', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:790, dmg:115, rec:[1.8,.4], rl:[2.5,3.1], acc:.6, wt:5.4, cyc:.8, defOptic:'m3a',
  m:{ t:'bolt', R:[.22,.06,.04], B:[.61,.011], hg:['poly_sporter',.40], stk:'sporter', grip:'pg_poly', mag:['int'], sgt:'none', bh:'bolt', mz:'crown', pl:'od', mt:'black', x:['rail_bolt'] }});
w({ id:'awm', n:'Accuracy Intl. AWM', e:'mod', c:'SR', y:1996, co:'United Kingdom', cal:'.338 Lapua', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:936, dmg:160, rec:[2.4,.5], rl:[2.8,3.6], acc:.5, wt:6.9, cyc:.9, defOptic:'pm2',
  m:{ t:'precision', R:[.26,.075,.05], B:[.69,.012], hg:['ai',.38], stk:'ai', grip:'thumbhole', mag:['box',.09,0,-.04], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'od', mt:'black', x:['rail_bolt'] }});
w({ id:'m82', n:'Barrett M82A1', e:'mod', c:'SR', y:1990, co:'United States', cal:'.50 BMG', act:'semi', modes:['semi'], rpm:40, mag:10, v:853, dmg:250, rec:[3.2,.8], rl:[3.4,4.2], acc:1.5, wt:14, heavy:true, defOptic:'leupold10',
  m:{ t:'amr', R:[.60,.16,.07], B:[.74,.016], hg:['barrett',.40], stk:'barrett', grip:'pg', mag:['box',.12,0,-.05], sgt:'none', bh:'side_r', mz:'barrett', bip:1, pl:'black', mt:'park', x:['railT','carry_barrett'] }});
w({ id:'mk14', n:'Mk 14 EBR', e:'mod', c:'DMR', y:2004, co:'United States', cal:'7.62×51mm', act:'semi', modes:['semi','auto'], rpm:725, mag:20, v:853, dmg:62, rec:[1.4,.55], rl:[2.5,3.1], acc:1.2, wt:5.1,
  m:{ t:'semiw', R:[.30,.07,.042], B:[.46,.0095], hg:['ebr',.36], stk:'crane', grip:'ar', mag:['box',.13,0,-.08], sgt:'flat', bh:'side_r', mz:'a2', pl:'black', mt:'black', x:['railT','chassis'] }});
w({ id:'m1014', n:'Benelli M1014', e:'mod', c:'SG', y:1999, co:'Italy', cal:'12 gauge', act:'semi', modes:['semi'], rpm:250, mag:7, v:400, dmg:15, pellets:9, rec:[2.6,.8], rl:[.45,.45], acc:36, wt:3.82, tubeLoad:true,
  m:{ t:'autosg', R:[.24,.075,.044], B:[.47,.011], hg:['poly',.22], stk:'m4sg', grip:'pg', mag:['tube'], sgt:'ghost', bh:'side_r', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'saiga12', n:'Saiga-12', e:'mod', c:'SG', y:1997, co:'Russia', cal:'12 gauge', act:'semi', modes:['semi'], rpm:250, mag:8, v:400, dmg:15, pellets:9, rec:[2.7,.9], rl:[2.6,3.2], acc:36, wt:3.6,
  m:{ t:'ak', R:[.30,.07,.045], B:[.43,.011], hg:['ak_poly',.21], stk:'ak_side', grip:'ak', mag:['box',.18,.1,-.07,0,.05], sgt:'ak', bh:'ak', mz:'crown', pl:'black', mt:'black', x:['gas','dust'] }});
w({ id:'usp', n:'H&K USP', e:'mod', c:'PST', y:1993, co:'Germany', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:320, mag:12, v:270, dmg:36, rec:[1.4,.5], rl:[1.5,1.9], acc:4.5, wt:.87,
  m:{ t:'pistol', R:[.20,.036,.032], B:[.112,.0065], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['hammer','railP'] }});
w({ id:'deagle', n:'Desert Eagle Mk XIX', e:'mod', c:'PST', y:1995, co:'Israel / US', cal:'.50 AE', act:'semi', modes:['semi'], rpm:200, mag:7, v:470, dmg:70, rec:[3.0,1.0], rl:[1.9,2.3], acc:4, wt:2.0,
  m:{ t:'pistol', R:[.27,.05,.035], B:[.152,.009], stk:'none', grip:'pst', mag:['pst',.13], sgt:'pst', bh:'slide_deagle', mz:'crown', pl:'black', mt:'stainless', x:['hammer','railTop'] }});
w({ id:'fiveseven', n:'FN Five-seveN', e:'mod', c:'PST', y:1998, co:'Belgium', cal:'5.7×28mm', act:'semi', modes:['semi'], rpm:360, mag:20, v:650, dmg:28, rec:[.7,.3], rl:[1.5,1.9], acc:4, wt:.61,
  m:{ t:'pistol', R:[.208,.034,.03], B:[.122,.005], stk:'none', grip:'pst_poly', mag:['pst',.13], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['railP'] }});
w({ id:'m9', n:'Beretta M9', e:'mod', c:'PST', y:1990, co:'United States', cal:'9×19mm', act:'semi', modes:['semi'], rpm:330, mag:15, v:381, dmg:27, rec:[1.0,.4], rl:[1.5,1.9], acc:4.5, wt:.95,
  m:{ t:'pistol', R:[.217,.035,.03], B:[.125,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide_open', mz:'crown', pl:'black', mt:'black', x:['hammer'] }});

// =============================== PRESENT ===================================
w({ id:'xm7', n:'SIG XM7 (MCX Spear)', e:'now', c:'BR', y:2022, co:'United States', cal:'6.8×51mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:914, dmg:60, rec:[1.3,.55], rl:[2.3,2.9], acc:1.5, wt:3.9, defOptic:'xm157',
  m:{ t:'ar', R:[.34,.09,.042], B:[.33,.0095], hg:['mlok',.30], stk:'mcx', grip:'ar', mag:['box',.14,0,-.07], sgt:'flat', bh:'side_l', mz:'sup_slx', pl:'coyote', mt:'black', x:['railT','charge_both'] }});
w({ id:'m250', n:'SIG XM250', e:'now', c:'LMG', y:2022, co:'United States', cal:'6.8×51mm', act:'auto_ob', modes:['auto'], rpm:700, mag:100, v:914, dmg:60, rec:[1.05,.5], rl:[4.8,5.6], acc:3, wt:5.9, heavy:true,
  m:{ t:'mg', R:[.40,.10,.052], B:[.45,.011], hg:['mlok',.30], stk:'mcx', grip:'ar', mag:['beltpouch',.14], sgt:'flat', bh:'side_l', mz:'bird', bip:1, pl:'coyote', mt:'black', x:['railT'] }});
w({ id:'hk416a5', n:'H&K HK416 A5', e:'now', c:'CAR', y:2013, co:'Germany', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:880, dmg:29, rec:[.48,.3], rl:[1.9,2.5], acc:2, wt:3.4,
  m:{ t:'ar', R:[.30,.08,.036], B:[.368,.0085], hg:['mlok',.28], stk:'hk_slim', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'a2', pl:'ral8000', mt:'black', x:['fa','railT'] }});
w({ id:'ak12', n:'AK-12 (2023)', e:'now', c:'AR', y:2018, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:880, dmg:31, rec:[.6,.38], rl:[2.3,2.9], acc:2.8, wt:3.5,
  m:{ t:'ak', R:[.30,.075,.045], B:[.415,.0085], hg:['ak12',.23], stk:'ak12', grip:'ak_poly', mag:['curve',.20,.35,-.07], sgt:'flat', bh:'ak', mz:'ak12', pl:'black', mt:'black', x:['gas','railT','dust_rail'] }});
w({ id:'ak15', n:'AK-15', e:'now', c:'AR', y:2018, co:'Russia', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:715, dmg:40, rec:[.95,.5], rl:[2.3,2.9], acc:3.2, wt:3.6,
  m:{ t:'ak', R:[.30,.075,.045], B:[.415,.0085], hg:['ak12',.23], stk:'ak12', grip:'ak_poly', mag:['curve',.21,.5,-.07], sgt:'flat', bh:'ak', mz:'ak12', pl:'black', mt:'black', x:['gas','railT','dust_rail'] }});
w({ id:'bren2', n:'CZ Bren 2', e:'now', c:'CAR', y:2016, co:'Czech Republic', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:850, dmg:29, rec:[.48,.3], rl:[2.0,2.6], acc:2.2, wt:2.93,
  m:{ t:'scar', R:[.34,.09,.045], B:[.28,.0085], hg:['mlok',.22], stk:'bren2', grip:'ar', mag:['box_clear',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'x95', n:'IWI X95', e:'now', c:'AR', y:2016, co:'Israel', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:850, dmg:29, rec:[.48,.3], rl:[2.4,2.9], acc:2.8, wt:3.0,
  m:{ t:'bullpup', R:[.44,.10,.05], B:[.33,.0085], hg:['mlok_short',.15], stk:'tavor', grip:'x95', mag:['curve',.19,.15,.10], sgt:'flat', bh:'side_l', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'mdr', n:'Desert Tech MDRx', e:'now', c:'BR', y:2019, co:'United States', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:600, mag:20, v:820, dmg:56, rec:[1.3,.55], rl:[2.5,3.0], acc:1.5, wt:3.9,
  m:{ t:'bullpup', R:[.50,.105,.05], B:[.41,.0095], hg:['mlok_short',.16], stk:'mdr', grip:'x95', mag:['box',.14,0,.12], sgt:'flat', bh:'side_l', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'mpx', n:'SIG MPX', e:'now', c:'SMG', y:2013, co:'United States', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:380, dmg:25, rec:[.35,.25], rl:[2.0,2.5], acc:4, wt:2.72,
  m:{ t:'ar', R:[.27,.08,.036], B:[.2,.0075], hg:['mlok',.18], stk:'mcx', grip:'ar', mag:['box',.17,.1,-.05], sgt:'flat', bh:'ar', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'scorpion', n:'CZ Scorpion Evo 3', e:'now', c:'SMG', y:2012, co:'Czech Republic', cal:'9×19mm', act:'auto', modes:['auto','burst3','semi'], rpm:1150, mag:30, v:370, dmg:24, rec:[.38,.28], rl:[2.0,2.5], acc:5, wt:2.77,
  m:{ t:'smg', R:[.28,.085,.042], B:[.196,.0075], hg:['evo',.14], stk:'evo', grip:'ar_poly', mag:['box_clear',.17,.1,-.06], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'apc9', n:'B&T APC9 Pro', e:'now', c:'SMG', y:2019, co:'Switzerland', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:1080, mag:30, v:380, dmg:25, rec:[.35,.26], rl:[1.9,2.4], acc:4, wt:2.5,
  m:{ t:'smg', R:[.30,.085,.04], B:[.175,.0075], hg:['mlok',.12], stk:'apc', grip:'ar', mag:['box',.17,.1,-.05], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'vector2', n:'KRISS Vector Gen II', e:'now', c:'SMG', y:2011, co:'United States', cal:'9×19mm', act:'auto', modes:['auto','burst2','semi'], rpm:1200, mag:33, v:380, dmg:24, rec:[.25,.2], rl:[2.0,2.6], acc:4.5, wt:2.7,
  m:{ t:'smg', R:[.33,.085,.045], B:[.14,.0085], hg:['vector',.12], stk:'vector', grip:'vector', mag:['box',.22,0,.00], sgt:'flat', bh:'side_l', mz:'crown', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'negev', n:'IWI Negev NG7', e:'now', c:'LMG', y:2012, co:'Israel', cal:'7.62×51mm', act:'auto_ob', modes:['auto','semi'], rpm:700, mag:125, v:830, dmg:56, rec:[1.0,.5], rl:[5.0,5.8], acc:4, wt:7.95, heavy:true,
  m:{ t:'mg', R:[.40,.095,.052], B:[.508,.012], hg:['saw',.22], stk:'side_fold', grip:'pg', mag:['beltpouch',.15], sgt:'flat', bh:'side_r', mz:'cone', bip:1, pl:'black', mt:'black', x:['railT','carry_saw'] }});
w({ id:'rpk16', n:'RPK-16', e:'now', c:'LMG', y:2018, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['auto','semi'], rpm:700, mag:96, v:900, dmg:31, rec:[.55,.35], rl:[3.6,4.3], acc:3, wt:4.5,
  m:{ t:'ak', R:[.30,.075,.045], B:[.55,.0095], hg:['ak12',.23], stk:'ak12', grip:'ak_poly', mag:['drum',.085,0,-.07], sgt:'flat', bh:'ak', mz:'ak12', bip:1, pl:'black', mt:'black', x:['gas','railT','dust_rail'] }});
w({ id:'mk22', n:'Barrett MRAD Mk 22', e:'now', c:'SR', y:2021, co:'United States', cal:'.300 Win Mag', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:870, dmg:140, rec:[2.1,.45], rl:[2.6,3.3], acc:.5, wt:6.9, cyc:.75, defOptic:'nxs',
  m:{ t:'precision', R:[.30,.08,.05], B:[.66,.011], hg:['mlok_long',.42], stk:'mrad', grip:'ar', mag:['box',.10,0,-.04], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'coyote', mt:'black', x:['railT'] }});
w({ id:'axmc', n:'Accuracy Intl. AXMC', e:'now', c:'SR', y:2014, co:'United Kingdom', cal:'.338 Lapua', act:'bolt', modes:['bolt'], rpm:35, mag:10, v:936, dmg:160, rec:[2.3,.45], rl:[2.8,3.5], acc:.4, wt:6.8, cyc:.85, defOptic:'nxs',
  m:{ t:'precision', R:[.30,.08,.05], B:[.69,.012], hg:['mlok_long',.42], stk:'ai', grip:'ar', mag:['box',.10,0,-.04], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'od', mt:'black', x:['railT'] }});
w({ id:'m107a1', n:'Barrett M107A1', e:'now', c:'SR', y:2011, co:'United States', cal:'.50 BMG', act:'semi', modes:['semi'], rpm:40, mag:10, v:853, dmg:250, rec:[3.0,.8], rl:[3.3,4.1], acc:1.2, wt:13, heavy:true, defOptic:'nxs',
  m:{ t:'amr', R:[.60,.16,.07], B:[.74,.016], hg:['barrett',.40], stk:'barrett', grip:'pg', mag:['box',.12,0,-.05], sgt:'none', bh:'side_r', mz:'barrett', bip:1, pl:'fde', mt:'fde', x:['railT','carry_barrett'] }});
w({ id:'m110a1', n:'H&K M110A1 CSASS', e:'now', c:'DMR', y:2016, co:'United States', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:40, mag:20, v:785, dmg:64, rec:[1.3,.5], rl:[2.4,3.0], acc:.9, wt:4.1, defOptic:'lpvo',
  m:{ t:'ar', R:[.33,.09,.04], B:[.41,.0095], hg:['mlok',.34], stk:'g28', grip:'ar', mag:['box',.13,0,-.07], sgt:'flat', bh:'ar', mz:'sup_slx', pl:'ral8000', mt:'black', x:['railT','fa'] }});
w({ id:'svch', n:'Chukavin SVCh', e:'now', c:'DMR', y:2021, co:'Russia', cal:'7.62×54mmR', act:'semi', modes:['semi'], rpm:40, mag:10, v:830, dmg:90, rec:[1.5,.5], rl:[2.4,3.0], acc:1, wt:4.6, defOptic:'nxs',
  m:{ t:'ar', R:[.36,.09,.045], B:[.565,.0095], hg:['mlok',.34], stk:'ak12', grip:'ak_poly', mag:['box',.11,.1,-.07], sgt:'flat', bh:'side_l', mz:'brake', pl:'black', mt:'black', x:['railT'] }});
w({ id:'ksg', n:'Kel-Tec KSG', e:'now', c:'SG', y:2011, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:70, mag:14, v:400, dmg:15, pellets:9, rec:[3,.8], rl:[.5,.5], acc:40, wt:3.1, cyc:.5, tubeLoad:true,
  m:{ t:'bullpup', R:[.46,.10,.055], B:[.47,.012], hg:['pump_bp',.16], stk:'ksg', grip:'ksg', mag:['tube2'], sgt:'flat', bh:'pump', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'m4sg', n:'Benelli M4 (M1014 A1)', e:'now', c:'SG', y:2014, co:'Italy', cal:'12 gauge', act:'semi', modes:['semi'], rpm:250, mag:7, v:400, dmg:15, pellets:9, rec:[2.6,.8], rl:[.45,.45], acc:36, wt:3.8, tubeLoad:true,
  m:{ t:'autosg', R:[.24,.075,.044], B:[.47,.011], hg:['poly',.22], stk:'ar_coll', grip:'pg', mag:['tube'], sgt:'ghost', bh:'side_r', mz:'crown', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'m17', n:'SIG M17', e:'now', c:'PST', y:2017, co:'United States', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:17, v:370, dmg:27, rec:[.9,.4], rl:[1.4,1.8], acc:3.5, wt:.83,
  m:{ t:'pistol', R:[.203,.034,.03], B:[.12,.006], stk:'none', grip:'pst_poly', mag:['pst',.13], sgt:'pst', bh:'slide', mz:'crown', pl:'coyote', mt:'coyote', x:['railP','optic_cut'] }});
w({ id:'glock19', n:'Glock 19 Gen5', e:'now', c:'PST', y:2017, co:'Austria', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:15, v:360, dmg:26, rec:[.95,.4], rl:[1.4,1.8], acc:4, wt:.67,
  m:{ t:'pistol', R:[.187,.032,.03], B:[.102,.006], stk:'none', grip:'pst_poly', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['railP'] }});
w({ id:'glock18', n:'Glock 18C', e:'now', c:'PST', y:2012, co:'Austria', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:1200, mag:17, v:360, dmg:24, rec:[.95,.6], rl:[1.4,1.8], acc:5, wt:.62,
  m:{ t:'pistol', R:[.186,.032,.03], B:[.114,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide_comp', mz:'crown', pl:'black', mt:'black', x:['railP'] }});
w({ id:'p10', n:'CZ P-10 C', e:'now', c:'PST', y:2017, co:'Czech Republic', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:15, v:360, dmg:26, rec:[.95,.4], rl:[1.4,1.8], acc:4, wt:.73,
  m:{ t:'pistol', R:[.187,.033,.03], B:[.102,.006], stk:'none', grip:'pst_poly', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', pl:'fde', mt:'black', x:['railP'] }});
w({ id:'rhino', n:'Chiappa Rhino 60DS', e:'now', c:'PST', y:2010, co:'Italy', cal:'.357 Magnum', act:'rev', modes:['semi'], rpm:150, mag:6, v:430, dmg:50, rec:[1.4,.5], rl:[2.5,2.5], acc:4, wt:.9,
  m:{ t:'rev', R:[.12,.055,.036], B:[.15,.0065], stk:'none', grip:'rev', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', pl:'black', mt:'black', x:['hammer','low_bore'] }});

G.WEAPONS = W;
G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));

G.CLASS_NAMES = { AR:'Assault rifle', BR:'Battle rifle', RIF:'Service rifle', CAR:'Carbine', SMG:'Submachine gun', LMG:'Machine gun', SR:'Sniper rifle', DMR:'Marksman rifle', SG:'Shotgun', PST:'Sidearm' };

// ---------------------------------------------------------------------------
// Attachments. slot, min era ord (e0) / max era ord (e1), cls filter, only (weapon ids),
// not (weapon ids), needs ('rail'|'hg'), s: stat modifiers.
//   s.acc  multiplier on MOA (lower = better)   s.rv/rh recoil multipliers
//   s.ads  ADS time mult     s.mob mobility add  s.v velocity mult
//   s.rl   reload mult       s.mag capacity (absolute or mult)   s.sup suppressed
//   s.flash flash mult       s.zoom magnification  s.ret reticle id
// ---------------------------------------------------------------------------
const A = [];
const a = (o) => A.push(o);
const LONG = ['RIF','SR','DMR','BR','AR','CAR','LMG'];
const RIFLES = ['RIF','SR','DMR','BR','AR','CAR'];

// ---- Optics
a({ id:'irons', slot:'optic', n:'Iron sights', e0:0, s:{}, d:'Factory sights.' });
a({ id:'aldis', slot:'optic', n:'Aldis Pattern 1918 3×', e0:0, e1:1, only:['smle','no4','m1903','g98','mosin91','lebel','k98k','mosin9130','type99','arisaka38','carcano'], s:{ zoom:3, ret:'post', ads:1.3 }, d:'Brass-bodied WW1 sniper scope on offset mounts.' });
a({ id:'win_a5', slot:'optic', n:'Winchester A5 5×', e0:0, e1:1, only:['m1903','smle','win1895','g98'], s:{ zoom:5, ret:'cross', ads:1.4 }, d:'Long, slim USMC-issue telescope.' });
a({ id:'gew_zf', slot:'optic', n:'Goerz 4× Scharfschützen', e0:0, e1:1, only:['g98','k98k'], s:{ zoom:4, ret:'german', ads:1.35 }, d:'German WW1 claw-mount sniper optic.' });
a({ id:'zf39', slot:'optic', n:'Zeiss ZF39 4×', e0:1, e1:2, only:['k98k','g43','fg42'], s:{ zoom:4, ret:'german', ads:1.35 }, d:'Turret-mounted 4× with post-and-bar reticle.' });
a({ id:'zf4', slot:'optic', n:'Zf 4 (ZF 43) 4×', e0:1, e1:2, only:['g43','k98k'], s:{ zoom:4, ret:'german', ads:1.3 }, d:'Rail-mounted G43 optic.' });
a({ id:'pu', slot:'optic', n:'PU 3.5×', e0:1, e1:2, only:['mosin9130','svt40','mosin91'], s:{ zoom:3.5, ret:'post', ads:1.3 }, d:'Soviet side-mounted sniper scope.' });
a({ id:'m84', slot:'optic', n:'M84 2.2× (M1C/M1D)', e0:1, e1:2, only:['garand','m1903'], s:{ zoom:2.2, ret:'post', ads:1.25 }, d:'Offset scope for the M1C/M1D.' });
a({ id:'unertl', slot:'optic', n:'Unertl 8× Target', e0:1, e1:2, only:['m1903','m1903a4','garand'], s:{ zoom:8, ret:'crossdot', ads:1.6 }, d:'USMC long-tube 8× target scope.' });
a({ id:'no32', slot:'optic', n:'No. 32 Mk I 3.5×', e0:1, e1:2, only:['no4','smle','bren'], s:{ zoom:3.5, ret:'post', ads:1.3 }, d:'Lee–Enfield No.4(T) scope.' });
a({ id:'type97', slot:'optic', n:'Type 97 2.5×', e0:1, e1:1, only:['type99','arisaka38'], s:{ zoom:2.5, ret:'cross', ads:1.25 }, d:'Japanese offset sniper scope.' });
a({ id:'m73', slot:'optic', n:'Lyman Alaskan (M73B1) 2.5×', e0:1, e1:2, only:['m1903','garand','m1carbine'], s:{ zoom:2.5, ret:'cross', ads:1.25 }, d:'Weaver-pattern hunting scope used on the M1903A4.' });
a({ id:'m3snip', slot:'optic', n:'M3 Infrared Sniperscope', e0:1, e1:2, only:['m1carbine'], s:{ zoom:1.5, ret:'cross', ads:1.4, mob:-1 }, d:'Early active-IR night sight for the M3 Carbine.' });
a({ id:'pso1', slot:'optic', n:'PSO-1 4×', e0:2, cls:['AR','DMR','LMG','BR','SR'], only_family:'ak', s:{ zoom:4, ret:'pso', ads:1.25 }, d:'Side-rail Soviet optic with chevron BDC.' });
a({ id:'art', slot:'optic', n:'ART I 3–9×', e0:2, e1:3, only:['m14','m21','mk14','m1a'], s:{ zoom:6, ret:'duplex', ads:1.35 }, d:'Auto-ranging telescope for the M21.' });
a({ id:'redfield', slot:'optic', n:'Redfield 3–9× Accu-Range', e0:2, only:['m40','m24','r700','m21'], s:{ zoom:9, ret:'duplex', ads:1.35 }, d:'USMC M40 scope.' });
a({ id:'colt3x', slot:'optic', n:'Colt 3×20 (carry handle)', e0:2, e1:3, only:['m16a1','xm177','m16a2'], s:{ zoom:3, ret:'post', ads:1.2 }, d:'Vietnam-era carry handle scope.' });
a({ id:'aimpoint_e', slot:'optic', n:'Aimpoint Electronic (1975)', e0:2, e1:2, cls:['AR','CAR','BR','SMG','SG','LMG'], s:{ zoom:1, ret:'dot', ads:1.05 }, d:'The first commercial red-dot sight.' });
a({ id:'aug_scope', slot:'optic', n:'Swarovski 1.5× (AUG)', e0:2, only:['aug'], s:{ zoom:1.5, ret:'ring', ads:1 }, d:'Integral AUG circle reticle optic.' });
a({ id:'kobra', slot:'optic', n:'EKP-1S-03 Kobra', e0:3, cls:['AR','CAR','LMG','SMG','SG','BR'], only_family:'ak', s:{ zoom:1, ret:'kobra', ads:1.05 }, d:'Russian side-mount collimator.' });
a({ id:'reddot', slot:'optic', n:'Aimpoint CompM4 (M68)', e0:3, cls:['AR','CAR','BR','SMG','SG','LMG','DMR'], needs:'rail', s:{ zoom:1, ret:'dot', ads:1.05 }, d:'2 MOA red dot, the US Army standard.' });
a({ id:'holo', slot:'optic', n:'EOTech 553 Holographic', e0:3, cls:['AR','CAR','BR','SMG','SG','LMG','DMR'], needs:'rail', s:{ zoom:1, ret:'holo', ads:1.06 }, d:'68 MOA ring with 1 MOA center dot.' });
a({ id:'acog', slot:'optic', n:'Trijicon ACOG TA31 4×', e0:3, cls:['AR','CAR','BR','LMG','DMR'], needs:'rail', s:{ zoom:4, ret:'acog', ads:1.2 }, d:'Fiber-illuminated chevron with bullet-drop compensator.' });
a({ id:'susat', slot:'optic', n:'SUSAT L9A1 4×', e0:2, e1:3, only:['l85','l1a1','fal'], s:{ zoom:4, ret:'susat', ads:1.2 }, d:'British tritium-post sight.' });
a({ id:'g36_dual', slot:'optic', n:'G36 3.5× + red dot (integral)', e0:3, only:['g36'], s:{ zoom:3.5, ret:'g36', ads:1.15 }, d:'Dual optic built into the carry handle.' });
a({ id:'m3a', slot:'optic', n:'Leupold Mk 4 M3A 10×', e0:3, cls:['SR','DMR'], needs:'rail', s:{ zoom:10, ret:'mildot', ads:1.45 }, d:'Fixed 10× mil-dot scope of the M24.' });
a({ id:'leupold10', slot:'optic', n:'Leupold Mk 4 LR/T 4.5–14×', e0:3, cls:['SR','DMR','BR'], needs:'rail', s:{ zoom:12, ret:'mildot', ads:1.5 }, d:'Long-range tactical scope.' });
a({ id:'pm2', slot:'optic', n:'Schmidt & Bender PM II 5–25×', e0:3, cls:['SR','DMR'], needs:'rail', s:{ zoom:16, ret:'p4f', ads:1.55 }, d:'Precision optic of the L115A3.' });
a({ id:'lpvo', slot:'optic', n:'Vortex Razor HD 1–6× LPVO', e0:4, cls:['AR','CAR','BR','LMG','DMR'], needs:'rail', s:{ zoom:6, ret:'lpvo', ads:1.25 }, d:'Low-power variable optic.' });
a({ id:'holo_mag', slot:'optic', n:'EOTech EXPS3 + G33 3×', e0:4, cls:['AR','CAR','BR','LMG','SMG'], needs:'rail', s:{ zoom:3, ret:'holo', ads:1.2 }, d:'Holographic sight with flip-up magnifier.' });
a({ id:'xm157', slot:'optic', n:'Vortex XM157 NGSW-FC 1–8×', e0:4, cls:['AR','BR','LMG','CAR'], needs:'rail', s:{ zoom:8, ret:'xm157', ads:1.3, mob:-1 }, d:'Fire-control optic with laser rangefinder and ballistic computer.' });
a({ id:'nxs', slot:'optic', n:'Nightforce ATACR 7–35×', e0:4, cls:['SR','DMR'], needs:'rail', s:{ zoom:20, ret:'mil_xt', ads:1.6 }, d:'Extreme-range first-focal-plane scope.' });
a({ id:'rmr', slot:'optic', n:'Trijicon RMR Type 2', e0:4, cls:['PST','SMG','AR','CAR','SG'], needs:'rail', s:{ zoom:1, ret:'dot', ads:1.03 }, d:'Pistol-mounted miniature red dot.' });

// ---- Muzzles
a({ id:'mz_std', slot:'muzzle', n:'Factory muzzle', e0:0, s:{}, d:'The muzzle as issued.' });
a({ id:'maxim', slot:'muzzle', n:'Maxim Model 1910 silencer', e0:0, e1:2, cls:['RIF'], s:{ sup:1, rv:.92, ads:1.12, flash:.1 }, d:'Hiram Percy Maxim’s silencer, issued with some M1903s.' });
a({ id:'cutts', slot:'muzzle', n:'Cutts compensator', e0:0, e1:2, cls:['SMG','SG'], s:{ rv:.8, rh:.9, flash:1.3 }, d:'Slotted compensator from Thompson and M1897 lines.' });
a({ id:'flash', slot:'muzzle', n:'Flash hider', e0:1, cls:LONG.concat(['SMG']), s:{ flash:.2, rh:.95 }, d:'Conical or prong-type flash suppressor.' });
a({ id:'comp', slot:'muzzle', n:'Compensator', e0:1, cls:LONG.concat(['SMG','PST']), s:{ rv:.82, rh:.9, flash:1.2, loud:1.2 }, d:'Vents gas upward to reduce muzzle climb.' });
a({ id:'brake', slot:'muzzle', n:'Muzzle brake', e0:1, cls:LONG, s:{ rv:.72, rh:.8, flash:1.5, loud:1.4, ads:1.03 }, d:'Large-port brake for heavy calibers.' });
a({ id:'pbs1', slot:'muzzle', n:'PBS-1 suppressor', e0:2, only_family:'ak', s:{ sup:1, rv:.9, ads:1.1, flash:.05, v:.97 }, d:'Soviet suppressor, used with subsonic 7.62×39.' });
a({ id:'sup', slot:'muzzle', n:'Suppressor', e0:2, cls:LONG.concat(['SMG','PST','SG']), s:{ sup:1, rv:.9, ads:1.1, flash:.05, v:1.01 }, d:'Baffle-stack suppressor.' });
a({ id:'sup_mod', slot:'muzzle', n:'SureFire SOCOM / Rotex-V can', e0:3, cls:LONG.concat(['SMG']), needs:'rail', s:{ sup:1, rv:.88, ads:1.12, flash:.03, v:1.01 }, d:'Quick-detach modern suppressor.' });
a({ id:'sten_sup', slot:'muzzle', n:'Integral suppressor (Mk IIS)', e0:1, e1:2, only:['sten','sterling'], s:{ sup:1, rv:.85, flash:0, v:.85, ads:1.15 }, d:'Built-in suppressor with subsonic ported barrel.' });

// ---- Barrels
a({ id:'brl_std', slot:'barrel', n:'Standard barrel', e0:0, s:{}, d:'Issued barrel length.' });
a({ id:'brl_short', slot:'barrel', n:'Short barrel', e0:0, cls:['RIF','AR','CAR','BR','SMG','SG','LMG'], s:{ blen:.72, v:.92, acc:1.2, ads:.9, mob:1, flash:1.4 }, d:'Carbine or “jungle” length. Handles fast, loses velocity.' });
a({ id:'brl_long', slot:'barrel', n:'Long barrel', e0:0, cls:['RIF','AR','BR','SR','DMR','SMG','LMG'], s:{ blen:1.2, v:1.05, acc:.85, ads:1.08, mob:-1 }, d:'Extended barrel for velocity and range.' });
a({ id:'brl_heavy', slot:'barrel', n:'Heavy match barrel', e0:1, cls:['RIF','AR','BR','SR','DMR','LMG'], s:{ bthick:1.35, v:1.02, acc:.65, ads:1.08, mob:-1, rv:.95 }, d:'Thick profile, free-floated, match chamber.' });
a({ id:'brl_fluted', slot:'barrel', n:'Fluted barrel', e0:3, cls:['SR','DMR','BR','AR','CAR'], s:{ acc:.8, ads:.96 }, d:'Lighter barrel that stays stiff.' });

// ---- Underbarrel
a({ id:'ub_none', slot:'under', n:'None', e0:0, s:{}, d:'' });
a({ id:'bipod', slot:'under', n:'Bipod', e0:0, cls:['RIF','BR','SR','DMR','AR','LMG'], s:{ rv:.85, ads:1.08, mob:-1, bip:1 }, d:'Folding bipod. Deploys prone for a big recoil reduction.' });
a({ id:'vgrip', slot:'under', n:'Vertical foregrip', e0:2, cls:['AR','CAR','BR','SMG','LMG','SG'], needs:'hg', s:{ rv:.88, rh:.8, ads:1.03 }, d:'Stabilises horizontal recoil.' });
a({ id:'agrip', slot:'under', n:'Angled foregrip', e0:3, cls:['AR','CAR','BR','SMG','LMG','DMR'], needs:'rail', s:{ rv:.92, ads:.92 }, d:'Faster target acquisition.' });
a({ id:'handstop', slot:'under', n:'Hand stop', e0:4, cls:['AR','CAR','BR','SMG','DMR'], needs:'rail', s:{ rv:.95, rh:.92, ads:.95 }, d:'Minimal index point for a C-clamp grip.' });
a({ id:'m203', slot:'under', n:'M203 40 mm launcher', e0:2, cls:['AR','CAR'], not:['aug','famas','p90','tavor','x95','qbz95','l85','galil'], s:{ gl:1, ads:1.12, mob:-1 }, d:'Press G to fire a 40×46 mm grenade.' });
a({ id:'gp25', slot:'under', n:'GP-25 Kostyor', e0:2, only_family:'ak', s:{ gl:1, ads:1.12, mob:-1 }, d:'Caseless 40 mm launcher. Press G to fire.' });
a({ id:'thompson_vfg', slot:'under', n:'M1928 vertical foregrip', e0:0, e1:2, only:['thompson'], s:{ rv:.9, rh:.8 }, d:'The classic “Chicago” foregrip.' });

// ---- Side / lug
a({ id:'sd_none', slot:'side', n:'None', e0:0, s:{}, d:'' });
a({ id:'bayonet', slot:'side', n:'Bayonet', e0:0, e1:3, cls:['RIF','AR','BR','CAR','SG','DMR'], s:{ melee:2, ads:1.05 }, d:'Fixed blade. Press V to strike with extra reach.' });
a({ id:'wirecut', slot:'side', n:'Wire-cutter attachment', e0:0, e1:0, cls:['RIF'], s:{ melee:1.2 }, d:'WW1 muzzle wire cutter for barbed-wire obstacles.' });
a({ id:'laser', slot:'side', n:'PEQ-15 visible laser', e0:3, cls:['AR','CAR','BR','SMG','SG','LMG','DMR','PST'], needs:'rail', s:{ hip:.65 }, d:'Visible laser improves hip-fire accuracy.' });
a({ id:'light', slot:'side', n:'SureFire M600 weapon light', e0:3, cls:['AR','CAR','BR','SMG','SG','LMG','PST'], needs:'rail', s:{ light:1 }, d:'Press L to toggle the light.' });
a({ id:'dbal', slot:'side', n:'DBAL-A3 laser/light', e0:4, cls:['AR','CAR','BR','SMG','LMG','DMR'], needs:'rail', s:{ hip:.7, light:1 }, d:'Combined laser and light. Press L for the light.' });

// ---- Magazines
a({ id:'mag_std', slot:'mag', n:'Standard', e0:0, s:{}, d:'Issued capacity.' });
a({ id:'mag_ext', slot:'mag', n:'Extended magazine', e0:0, not:['garand','k98k','g98','m1903','mosin91','mosin9130','type99','arisaka38','carcano','lebel','m40','m24','win1895','webley','python','rhino','m1897','m1912','r870','ksg','lewis','dp28','mg42','mg0815','m60','m240','m249','m250','negev','pkm','rpd'], s:{ mag:1.5, rl:1.1, ads:1.04 }, d:'Longer magazine. More rounds, slower handling.' });
a({ id:'mag_drum', slot:'mag', n:'Drum magazine', e0:1, cls:['AR','CAR','SMG','LMG','SG'], not:['p90','ppsh','m249','m60','m240','mg42','pkm','negev','m250','rpd','lewis','dp28','sten','sterling','ksg','m1014','m4sg','spas12','r870','m1912','m1897','rpk16'], s:{ mag:2.5, rl:1.35, ads:1.12, mob:-1 }, d:'High-capacity drum.' });
a({ id:'mag_fast', slot:'mag', n:'Jungle-taped pair', e0:2, cls:['AR','CAR','SMG','BR'], not:['p90','aug','famas'], s:{ rl:.7 }, d:'Two magazines taped together for faster reloads.' });
a({ id:'thompson50', slot:'mag', n:'Type L 50-round drum', e0:0, e1:2, only:['thompson'], s:{ mag:50, rl:1.5, mob:-1 }, d:'The iconic 50-round drum (M1928 receivers).' });
a({ id:'ppsh35', slot:'mag', n:'35-round box magazine', e0:1, only:['ppsh'], s:{ mag:35, rl:.8, mob:1 }, d:'Lighter and more reliable than the drum.' });
a({ id:'mp18box', slot:'mag', n:'20-round box (MP 18/28)', e0:0, only:['mp18'], s:{ mag:20, rl:.75, mob:1 }, d:'Straight box magazine from the post-war MP 28.' });
a({ id:'lewis97', slot:'mag', n:'97-round aircraft pan', e0:0, only:['lewis'], s:{ mag:97, rl:1.2, mob:-1 }, d:'Two-tier pan from the aerial Lewis.' });
a({ id:'pedersen', slot:'mag', n:'Pedersen Device Mk I', e0:0, e1:1, only:['m1903'], s:{ mag:40, semiConv:1, cal:'.30 Pedersen', v:.44, dmgMul:.38, rl:1.1 }, d:'Secret bolt replacement: turns the M1903 into a 40-round semi-auto.' });
a({ id:'smle_20', slot:'mag', n:'20-round trench magazine', e0:0, e1:1, only:['smle','no4'], s:{ mag:20, rl:1.15, ads:1.04 }, d:'Rare extended trench magazine.' });
a({ id:'garand_ping', slot:'mag', n:'En-bloc clip (8)', e0:1, only:['garand'], s:{}, d:'Standard en-bloc — the famous ping on empty.' });
a({ id:'cmag', slot:'mag', n:'Beta C-Mag 100', e0:3, only:['m4a1','m16a4','hk416','hk416a5','scarl','g36','l85','tavor','x95','m16a1','bren2','mpx'], s:{ mag:100, rl:1.6, ads:1.18, mob:-2 }, d:'Twin-drum 100-round magazine.' });
a({ id:'rpk75', slot:'mag', n:'75-round RPK drum', e0:2, only_family:'ak', s:{ mag:75, rl:1.45, ads:1.14, mob:-1 }, d:'Soviet 75-round drum.' });
a({ id:'belt200', slot:'mag', n:'200-round belt box', e0:2, only:['m60','m240','pkm','negev','m250','m249','mg42','rpd'], s:{ mag:200, rl:1.15, mob:-1 }, d:'Heavier ammo box with a longer belt.' });
a({ id:'mg42_belt', slot:'mag', n:'250-round belt (Gurtkasten)', e0:1, only:['mg42'], s:{ mag:250, rl:1.2, mob:-2 }, d:'Loose belt from an ammo can.' });
a({ id:'glock33', slot:'mag', n:'33-round extended', e0:2, only:['glock17','glock19','glock18','m17','p10'], s:{ mag:33, rl:1.1, ads:1.03 }, d:'Long pistol magazine.' });
a({ id:'speedloader', slot:'mag', n:'Speed loader', e0:2, cls:['PST'], only:['webley','python','rhino'], s:{ rl:.6 }, d:'Loads all six chambers at once.' });
a({ id:'mag_pmag', slot:'mag', n:'Magpul PMAG Gen M3', e0:4, only:['m4a1','m16a4','hk416','hk416a5','scarl','bren2','mpx','x95','tavor','l85'], s:{ rl:.92, mob:1 }, d:'Polymer magazine. Lighter, faster to seat.' });

// ---- Stocks
a({ id:'stk_std', slot:'stock', n:'Factory stock', e0:0, s:{}, d:'Issued stock.' });
a({ id:'stk_none', slot:'stock', n:'No stock / folded', e0:0, cls:['SMG','PST','SG','CAR','AR'], s:{ rv:1.35, rh:1.4, ads:.82, mob:2, acc:1.3, stock:'none' }, d:'Stockless. Fast, but hard to control.' });
a({ id:'stk_carbine', slot:'stock', n:'Collapsible stock', e0:2, cls:['AR','CAR','SMG','BR','SG','DMR'], s:{ ads:.93, mob:1, stock:'coll' }, d:'Adjustable length of pull.' });
a({ id:'stk_heavy', slot:'stock', n:'Precision stock', e0:2, cls:['AR','BR','DMR','SR','LMG','RIF'], s:{ rv:.85, ads:1.08, mob:-1, stock:'prec' }, d:'Adjustable cheek riser and buttpad.' });
a({ id:'stk_monte', slot:'stock', n:'Sporterised stock', e0:0, e1:2, cls:['RIF'], s:{ rv:.94, ads:.95, stock:'sporter' }, d:'Cut-down, sporterised furniture.' });
a({ id:'stk_c96', slot:'stock', n:'Holster-stock', e0:0, only:['c96','hipower','luger'], s:{ rv:.55, rh:.6, ads:1.15, acc:.7, stock:'holster' }, d:'Wooden holster that doubles as a shoulder stock.' });
a({ id:'stk_brace', slot:'stock', n:'Arm brace', e0:4, cls:['SMG','PST'], s:{ rv:.75, rh:.8, ads:1.06, stock:'brace' }, d:'Pistol stabilising brace.' });

// ---- Ammo
a({ id:'am_fmj', slot:'ammo', n:'FMJ ball', e0:0, s:{}, d:'Full metal jacket.' });
a({ id:'am_ap', slot:'ammo', n:'Armour-piercing', e0:0, not_cls:['SG'], s:{ pen:1, dmgMul:.95, v:1.03 }, d:'Hardened core, defeats body armour.' });
a({ id:'am_hp', slot:'ammo', n:'Hollow point', e0:0, not_cls:['SG'], s:{ dmgMul:1.18, pen:-1 }, d:'Expanding bullet. Hits harder, stopped by armour.' });
a({ id:'am_tracer', slot:'ammo', n:'Tracer', e0:0, not_cls:['SG'], s:{ tracer:1 }, d:'Every round glows.' });
a({ id:'am_match', slot:'ammo', n:'Match grade', e0:1, cls:['RIF','SR','DMR','BR','AR','PST'], s:{ acc:.7, dmgMul:1.02 }, d:'Tight tolerances, better grouping.' });
a({ id:'am_sub', slot:'ammo', n:'Subsonic', e0:1, not_cls:['SG'], s:{ subsonic:1, dmgMul:.85 }, d:'Stays under 330 m/s. Quiet with a suppressor, drops fast.' });
a({ id:'am_inc', slot:'ammo', n:'B-32 API incendiary', e0:1, cls:['RIF','LMG','SR','BR','DMR'], s:{ pen:1, inc:1, dmgMul:1.05 }, d:'Armour-piercing incendiary, flashes on impact.' });
a({ id:'am_buck', slot:'ammo', n:'00 buckshot', e0:0, cls:['SG'], s:{}, d:'Nine .33" pellets.' });
a({ id:'am_slug', slot:'ammo', n:'Rifled slug', e0:0, cls:['SG'], s:{ slug:1 }, d:'Single heavy projectile, accurate to 100 m.' });
a({ id:'am_flech', slot:'ammo', n:'Flechette', e0:2, cls:['SG'], s:{ flech:1 }, d:'Twenty steel darts. Flat, penetrating.' });
a({ id:'am_dragon', slot:'ammo', n:'Dragon’s breath', e0:3, cls:['SG'], s:{ dragon:1, dmgMul:.7 }, d:'Magnesium pyrotechnic shell.' });

// ---- Finishes (texture/colour for metal + furniture)
a({ id:'fin_factory', slot:'finish', n:'Factory', e0:0, s:{}, d:'As issued.' });
a({ id:'fin_blued', slot:'finish', n:'Hot blue', e0:0, s:{ fin:'blued' }, d:'Deep blue-black oxide.' });
a({ id:'fin_park', slot:'finish', n:'Parkerised', e0:0, s:{ fin:'park' }, d:'Grey-green phosphate.' });
a({ id:'fin_nickel', slot:'finish', n:'Nickel plate', e0:0, s:{ fin:'nickel' }, d:'Bright nickel.' });
a({ id:'fin_engraved', slot:'finish', n:'Engraved presentation', e0:0, s:{ fin:'engraved' }, d:'Scroll-engraved steel with gold inlay.' });
a({ id:'fin_winter', slot:'finish', n:'Winter whitewash', e0:1, s:{ fin:'whitewash' }, d:'Field-applied white distemper.' });
a({ id:'fin_splinter', slot:'finish', n:'Splittertarn paint', e0:1, e1:2, s:{ fin:'splinter' }, d:'German splinter camouflage.' });
a({ id:'fin_tiger', slot:'finish', n:'Tiger stripe', e0:2, s:{ fin:'tiger' }, d:'Vietnam tiger stripe.' });
a({ id:'fin_woodland', slot:'finish', n:'M81 Woodland', e0:2, s:{ fin:'woodland' }, d:'US woodland pattern.' });
a({ id:'fin_desert', slot:'finish', n:'Chocolate-chip desert', e0:2, s:{ fin:'desert' }, d:'Six-colour desert.' });
a({ id:'fin_fde', slot:'finish', n:'Flat Dark Earth Cerakote', e0:3, s:{ fin:'fde' }, d:'Tan ceramic coating.' });
a({ id:'fin_od', slot:'finish', n:'OD Green Cerakote', e0:3, s:{ fin:'odc' }, d:'Olive drab ceramic coating.' });
a({ id:'fin_multicam', slot:'finish', n:'MultiCam', e0:3, s:{ fin:'multicam' }, d:'Crye multi-environment pattern.' });
a({ id:'fin_urban', slot:'finish', n:'Urban digital', e0:3, s:{ fin:'digital' }, d:'Grey pixelated pattern.' });
a({ id:'fin_tungsten', slot:'finish', n:'Tungsten Cerakote', e0:4, s:{ fin:'tungsten' }, d:'Blue-grey ceramic coating.' });
a({ id:'fin_gold', slot:'finish', n:'24k gold plate', e0:0, s:{ fin:'gold' }, d:'Parade piece.' });

G.ATTACH = A;
G.ATT = Object.fromEntries(A.map(x => [x.id, x]));
G.SLOTS = [
  ['optic', 'Optic'], ['muzzle', 'Muzzle'], ['barrel', 'Barrel'], ['under', 'Underbarrel'], ['side', 'Lug / side rail'],
  ['mag', 'Magazine'], ['stock', 'Stock'], ['ammo', 'Ammunition'], ['finish', 'Finish'],
];

G.hasRail = (wp) => wp.m.x && wp.m.x.some(x => x === 'railT' || x === 'railP' || x === 'rail_bolt');
G.isAK = (wp) => wp.m.t === 'ak';

G.attachOK = function (wp, at) {
  const eo = G.ERA[wp.e].ord;
  if (at.e0 !== undefined && eo < at.e0) return false;
  if (at.e1 !== undefined && eo > at.e1) return false;
  if (at.only && !at.only.includes(wp.id)) {
    if (!(at.only_family === 'ak' && G.isAK(wp))) return false;
  } else if (at.only_family === 'ak' && !G.isAK(wp)) {
    if (!at.cls || !at.cls.includes(wp.c) || !G.hasRail(wp)) return false;
  }
  if (at.cls && !at.only && !at.only_family && !at.cls.includes(wp.c)) return false;
  if (at.not && at.not.includes(wp.id)) return false;
  if (at.fixedOk === false && G.fixedMag && G.fixedMag(wp)) return false;
  if (at.not_cls && at.not_cls.includes(wp.c)) return false;
  if (at.needs === 'rail' && !G.hasRail(wp) && !(G.isAK(wp) && eo >= 3)) return false;
  if (at.needs === 'hg' && ['PST','SR'].includes(wp.c)) return false;
  return true;
};
G.attachFor = (wp, slot) => A.filter(at => at.slot === slot && G.attachOK(wp, at));

G.defaultLoadout = function (wp) {
  const L = { optic:'irons', muzzle:'mz_std', barrel:'brl_std', under:'ub_none', side:'sd_none', mag:'mag_std', stock:'stk_std', ammo: wp.c === 'SG' ? 'am_buck' : 'am_fmj', finish:'fin_factory' };
  if (wp.defOptic && G.ATT[wp.defOptic]) L.optic = wp.defOptic;
  if (wp.id === 'thompson') L.under = 'thompson_vfg';
  if (wp.id === 'garand') L.mag = 'garand_ping';
  return L;
};

// Resolve the final stats of weapon + loadout
G.resolveStats = function (wp, L) {
  const S = { acc: wp.acc, rv: wp.rec[0], rh: wp.rec[1], ads: .22 + wp.wt * .045, mob: 0, v: wp.v, mag: wp.mag, rl: wp.rl.slice(),
    dmg: wp.dmg, pen: G.CAL[wp.cal].pen, k: G.CAL[wp.cal].k, flash: 1, loud: 1, sup: 0, zoom: 1, ret: 'irons', tracer: 0, hip: 1,
    blen: 1, bthick: 1, bip: !!wp.m.bip, gl: 0, light: 0, melee: 1, semiConv: 0, subsonic: 0, slug: 0, flech: 0, dragon: 0, inc: 0,
    stock: null, fin: null, rpm: wp.rpm, modes: wp.modes.slice(), pellets: wp.pellets || 1 };
  if (wp.c === 'PST') S.ads = .14 + wp.wt * .05;
  if (wp.c === 'SR') S.ads += .08;
  const mob0 = { PST: 10, SMG: 8, SG: 6, CAR: 7, AR: 6, BR: 4, RIF: 5, DMR: 4, SR: 3, LMG: 2 }[wp.c] || 5;
  S.mob = mob0 - Math.max(0, wp.wt - 4) * .5;
  for (const slot of Object.keys(L)) {
    const at = G.ATT[L[slot]]; if (!at) continue; const s = at.s;
    if (s.acc) S.acc *= s.acc;
    if (s.rv) S.rv *= s.rv; if (s.rh) S.rh *= s.rh;
    if (s.ads) S.ads *= s.ads; if (s.mob) S.mob += s.mob;
    if (s.v) S.v *= s.v; if (s.rl) S.rl = S.rl.map(x => x * s.rl);
    if (s.mag) S.mag = s.mag > 5 ? s.mag : Math.round(wp.mag * s.mag);
    if (s.sup) S.sup = 1; if (s.flash !== undefined) S.flash *= s.flash; if (s.loud) S.loud *= s.loud;
    if (s.zoom) { S.zoom = s.zoom; S.ret = s.ret; }
    if (s.tracer) S.tracer = 1; if (s.hip) S.hip *= s.hip;
    if (s.blen) S.blen = s.blen; if (s.bthick) S.bthick = s.bthick;
    if (s.bip) S.bip = true; if (s.gl) S.gl = 1; if (s.light) S.light = 1; if (s.melee) S.melee = s.melee;
    if (s.pen) S.pen = Math.max(0, S.pen + s.pen);
    if (s.dmgMul) S.dmg *= s.dmgMul;
    if (s.semiConv) { S.semiConv = 1; S.modes = ['semi']; S.rpm = 300; S.k = .0018; S.pen = 1; }
    if (s.subsonic) { S.subsonic = 1; S.v = Math.min(S.v, 315); }
    if (s.slug) { S.slug = 1; S.pellets = 1; S.dmg = 95; S.acc = 6; S.k = .0035; }
    if (s.flech) { S.flech = 1; S.pellets = 20; S.dmg = 8; S.acc *= .7; S.k = .0015; S.pen += 1; }
    if (s.dragon) { S.dragon = 1; }
    if (s.inc) S.inc = 1;
    if (s.stock) S.stock = s.stock; if (s.fin) S.fin = s.fin;
  }
  if (S.sup && S.subsonic) S.loud *= .5;
  S.mob = Math.max(1, Math.min(12, S.mob));
  return S;
};

// ---------------------------------------------------------------------------
// Enemy tiers (the difficulty ladder for battles)
// react: reaction ms, aimErr: radians of aim error, track: aim tracking speed,
// hp, armor (torso damage multiplier), burst: shots per burst, strafe
// ---------------------------------------------------------------------------
G.TIERS = [
  { id:'recruit',  n:'Recruit',  d:'Slow to react, poor aim, no armour.',                react: 900, aimErr: .085, track: 2.5, hp: 100, armor: 1,   burst: [2,4], strafe: 0,   head: .05, color: '#8a8f7a' },
  { id:'regular',  n:'Regular',  d:'Trained infantry. Uses cover.',                        react: 620, aimErr: .055, track: 3.5, hp: 100, armor: 1,   burst: [3,5], strafe: .3,  head: .10, color: '#a7a37a' },
  { id:'veteran',  n:'Veteran',  d:'Combat-hardened. Strafes, flanks, wears armour.',      react: 420, aimErr: .035, track: 5,   hp: 115, armor: .75, burst: [3,6], strafe: .6,  head: .18, color: '#c9a14a' },
  { id:'elite',    n:'Elite',    d:'Special forces. Fast, precise, heavily armoured.',     react: 260, aimErr: .02,  track: 7,   hp: 130, armor: .6,  burst: [4,7], strafe: .9,  head: .30, color: '#d8643a' },
];
G.TIER = Object.fromEntries(G.TIERS.map(t => [t.id, t]));

// ---------------------------------------------------------------------------
// Range targets
// ---------------------------------------------------------------------------
G.TARGETS = [
  { id:'paper',   n:'NRA bullseye (paper)',       d:'Scores rings and measures group size in MOA.' },
  { id:'ipsc',    n:'IPSC silhouette',            d:'A / C / D scoring zones on cardboard.' },
  { id:'steel',   n:'Steel gong',                 d:'AR500 plate. Swings and rings on hit.' },
  { id:'popper',  n:'Pepper popper',              d:'Falls when hit hard enough, then resets.' },
  { id:'mover',   n:'Moving target (rail)',       d:'Silhouette on a lateral rail, 3 m/s.' },
  { id:'gel',     n:'Ballistic gel block',        d:'10% gelatin. Shows the wound track and penetration depth.' },
  { id:'geldummy',n:'Ballistic gel torso',        d:'Clear gel torso with a skeleton inside. Shows each bullet path.' },
  { id:'armor',   n:'Armour plate test',          d:'NIJ IIIA / III / IV plates on a stand. Shows stop or pass.' },
  { id:'bottles', n:'Bottles & melons',           d:'Things that shatter.' },
  { id:'dummy',   n:'Enemy mannequin',            d:'An era soldier on a stand. Shows hit zones.' },
  { id:'clay',    n:'Clay pigeon trap',           d:'Throws a clay every 3 s. Made for shotguns.' },
];
G.RANGE_DISTS = [7, 15, 25, 50, 100, 200, 300, 500, 800, 1000];

// Uniform palette per era: [team A, team B] each {tunic, trousers, helmet, gear, skin}
G.UNIFORMS = {
  ww1: [ { name:'British Expeditionary Force', tunic:'#7a6a45', pants:'#6f6040', helm:'#5b5a40', gear:'#8e8360', helmet:'brodie', cap:0 },
         { name:'Deutsches Heer', tunic:'#6d7163', pants:'#5f6357', helm:'#55594c', gear:'#3a3226', helmet:'stahl16' } ],
  ww2: [ { name:'US Army', tunic:'#6b6446', pants:'#6a5f45', helm:'#4b5234', gear:'#8b8058', helmet:'m1' },
         { name:'Wehrmacht', tunic:'#5c6152', pants:'#56594d', helm:'#4c5046', gear:'#2e2a22', helmet:'m35' } ],
  cold: [ { name:'US MACV', tunic:'#4d5a3a', pants:'#4a5638', helm:'#4f5a37', gear:'#5c5d3e', helmet:'m1cover' },
          { name:'Soviet Army', tunic:'#6a6a4c', pants:'#5e5e43', helm:'#4d563b', gear:'#4c3b28', helmet:'ssh68' } ],
  mod:  [ { name:'Coalition', tunic:'#b7a582', pants:'#ad9b77', helm:'#a8966f', gear:'#8d7c5a', helmet:'pasgt' },
          { name:'Insurgent Militia', tunic:'#5b544a', pants:'#3e3a36', helm:'#2d2b28', gear:'#4c4436', helmet:'shemagh' } ],
  now:  [ { name:'NATO Task Force', tunic:'#8c8466', pants:'#8a8263', helm:'#7c7458', gear:'#6f6a4f', helmet:'fast' },
          { name:'OPFOR Spetsnaz', tunic:'#4f5448', pants:'#484c41', helm:'#3a3e36', gear:'#2f322b', helmet:'6b47' } ],
};
