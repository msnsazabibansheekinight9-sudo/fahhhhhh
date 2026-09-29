// ============================================================================
// IRONSIGHT — expanded arsenal: additional weapons, calibres and attachments.
// Loaded after data.js; appends to G.WEAPONS and rebuilds the lookup tables.
// ============================================================================
'use strict';
(function () {
const G = window.G;
Object.assign(G.CAL, {
  '8×50mmR':       { k: .00085, pen: 3, cs: [.050, .0062] },
  '9×23mm Steyr':  { k: .00190, pen: 1, cs: [.023, .0049] },
  '7.62×38mmR':    { k: .00200, pen: 1, cs: [.038, .0038] },
  '.32 ACP':       { k: .00220, pen: 1, cs: [.017, .0043] },
  '13.2mm TuF':    { k: .00040, pen: 5, cs: [.092, .0105] },
  '7.5×54mm':      { k: .00080, pen: 3, cs: [.054, .0060] },
  '.55 Boys':      { k: .00045, pen: 5, cs: [.099, .0105] },
  '.38/200':       { k: .00210, pen: 1, cs: [.019, .0048] },
  '9×39mm':        { k: .00280, pen: 3, cs: [.039, .0056] },
  '.408 CheyTac':  { k: .00030, pen: 4, cs: [.077, .0077] },
  '12.7×55mm':     { k: .00220, pen: 3, cs: [.055, .0085] },
  '9×21mm':        { k: .00170, pen: 2, cs: [.021, .0049] },
});
Object.assign(G.MASS || (G.MASS = {}), { '8×50mmR': 15.8, '9×23mm Steyr': 7.5, '7.62×38mmR': 7, '.32 ACP': 4.7, '13.2mm TuF': 52, '7.5×54mm': 9, '.55 Boys': 60, '.38/200': 11.3, '9×39mm': 16, '.408 CheyTac': 27, '12.7×55mm': 59, '9×21mm': 7.5 });

const W = G.WEAPONS;
const w = o => W.push(o);

// ================================ WW1 =======================================
w({ id:'ross', n:'Ross Rifle Mk III', e:'ww1', c:'RIF', y:1910, co:'Canada', cal:'.303 British', act:'bolt', modes:['bolt'], rpm:45, mag:5, v:792, dmg:106, rec:[2.3,.5], rl:[2.4,3.2], acc:1.8, wt:4.48, cyc:.55,
  m:{ t:'bolt', R:[.27,.058,.042], B:[.77,.0085], hg:['wfull',.64], stk:'rifle_pg', grip:'st', mag:['box',.06,0,-.05], sgt:'peep', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'m1895aus', n:'Steyr-Mannlicher M1895', e:'ww1', c:'RIF', y:1895, co:'Austria-Hungary', cal:'8×50mmR', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:620, dmg:104, rec:[2.4,.5], rl:[2.0,2.6], acc:3, wt:3.78, cyc:.5,
  m:{ t:'bolt', R:[.24,.056,.04], B:[.76,.0085], hg:['wfull',.64], stk:'rifle', grip:'st', mag:['box',.07,0,-.04], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'berthier', n:'Berthier Mle 1916', e:'ww1', c:'RIF', y:1916, co:'France', cal:'8mm Lebel', act:'bolt', modes:['bolt'], rpm:32, mag:5, v:700, dmg:104, rec:[2.4,.5], rl:[2.1,2.8], acc:3, wt:4.2, cyc:.8,
  m:{ t:'bolt', R:[.24,.056,.04], B:[.80,.0085], hg:['wfull',.66], stk:'rifle', grip:'st', mag:['box',.08,0,-.04], sgt:'rifle', bh:'bolt_bent', mz:'crown', wd:'wood_dark', mt:'blued', x:['bands','lug'] }});
w({ id:'m1917', n:'M1917 Enfield', e:'ww1', c:'RIF', y:1917, co:'United States', cal:'.30-06', act:'bolt', modes:['bolt'], rpm:38, mag:6, v:853, dmg:110, rec:[2.4,.5], rl:[2.5,3.3], acc:2.2, wt:4.17, cyc:.75,
  m:{ t:'bolt', R:[.26,.06,.042], B:[.66,.0085], hg:['wfull',.56], stk:'rifle_pg', grip:'st', mag:['box',.06,0,-.05], sgt:'peep', bh:'bolt_bent', mz:'crown', wd:'wood', mt:'park', x:['bands','lug'] }});
w({ id:'krag', n:'Krag–Jørgensen M1898', e:'ww1', c:'RIF', y:1898, co:'United States', cal:'.30-40 Krag', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:610, dmg:98, rec:[2,.4], rl:[3.0,3.6], acc:2.8, wt:4.2, cyc:.7, tubeLoad:true,
  m:{ t:'bolt', R:[.26,.058,.05], B:[.76,.0085], hg:['wfull',.62], stk:'rifle', grip:'st', mag:['int'], sgt:'rifle', bh:'bolt', mz:'crown', wd:'wood', mt:'blued', x:['bands','lug'] }});
w({ id:'fedorov', n:'Fedorov Avtomat', e:'ww1', c:'AR', y:1916, co:'Russian Empire', cal:'6.5×50mmSR', act:'auto', modes:['auto','semi'], rpm:400, mag:25, v:654, dmg:44, rec:[1.1,.6], rl:[2.8,3.4], acc:4.5, wt:4.4,
  m:{ t:'battle', R:[.30,.07,.045], B:[.52,.009], hg:['wood',.3], stk:'rifle', grip:'pg_wood', mag:['curve',.18,.35,-.07], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:['frontgrip'] }});
w({ id:'vickers', n:'Vickers Mk I', e:'ww1', c:'LMG', y:1912, co:'United Kingdom', cal:'.303 British', act:'auto', modes:['auto'], rpm:450, mag:250, v:744, dmg:52, rec:[.7,.4], rl:[6.5,7.2], acc:3, wt:15, heavy:true,
  m:{ t:'mg', R:[.40,.12,.1], B:[.40,.055], hg:['water',.42,.06], stk:'none', grip:'pg', mag:['beltbox',.16], sgt:'tall', bh:'side_r', mz:'cone', bip:1, mt:'blued', x:[] }});
w({ id:'hotchkiss', n:'Hotchkiss M1914', e:'ww1', c:'LMG', y:1914, co:'France', cal:'8mm Lebel', act:'auto', modes:['auto'], rpm:450, mag:24, v:725, dmg:52, rec:[.8,.4], rl:[3.2,3.8], acc:3, wt:23.6, heavy:true,
  m:{ t:'mg', R:[.40,.1,.06], B:[.55,.013], hg:['fin',.22,.03], stk:'none', grip:'pg', mag:['sidebox_l',.22,0,-.02], sgt:'rifle', bh:'side_r', mz:'crown', bip:1, mt:'blued', x:['gas'] }});
w({ id:'madsen', n:'Madsen LMG', e:'ww1', c:'LMG', y:1902, co:'Denmark', cal:'7.62×54mmR', act:'auto', modes:['auto'], rpm:450, mag:25, v:820, dmg:52, rec:[.95,.45], rl:[3.0,3.6], acc:4, wt:9.07,
  m:{ t:'lmg', R:[.38,.07,.05], B:[.58,.01], hg:['perf',.40,.026], stk:'rifle_pg', grip:'pg_wood', mag:['top_curve',.2,.3,-.05], sgt:'offset_l', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'tgewehr', n:'Mauser 1918 T-Gewehr', e:'ww1', c:'SR', y:1918, co:'German Empire', cal:'13.2mm TuF', act:'bolt', modes:['bolt'], rpm:10, mag:1, v:785, dmg:230, rec:[4.2,1], rl:[3.2,3.2], acc:3, wt:15.9, cyc:1.1, heavy:true,
  m:{ t:'bolt', R:[.36,.075,.055], B:[.98,.014], hg:['wood',.45], stk:'rifle_pg', grip:'st', mag:['int'], sgt:'tall', bh:'bolt', mz:'crown', bip:1, wd:'wood_dark', mt:'blued', x:[] }});
w({ id:'steyr1912', n:'Steyr M1912', e:'ww1', c:'PST', y:1912, co:'Austria-Hungary', cal:'9×23mm Steyr', act:'semi', modes:['semi'], rpm:300, mag:8, v:340, dmg:34, rec:[1.3,.5], rl:[2.3,2.8], acc:5, wt:1.02,
  m:{ t:'pistol', R:[.22,.034,.028], B:[.128,.006], stk:'none', grip:'pst', mag:['int'], sgt:'pst', bh:'slide', mz:'crown', wd:'wood', mt:'blued', x:['hammer'] }});
w({ id:'nagant', n:'Nagant M1895', e:'ww1', c:'PST', y:1895, co:'Russian Empire', cal:'7.62×38mmR', act:'rev', modes:['semi'], rpm:120, mag:7, v:272, dmg:32, rec:[1.1,.4], rl:[4.2,4.2], acc:6, wt:.8,
  m:{ t:'rev', R:[.11,.046,.034], B:[.114,.006], stk:'none', grip:'rev_wood', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', wd:'wood_dark', mt:'blued', x:['hammer'] }});
w({ id:'ruby', n:'Ruby pistol', e:'ww1', c:'PST', y:1915, co:'France', cal:'.32 ACP', act:'semi', modes:['semi'], rpm:360, mag:9, v:280, dmg:22, rec:[.8,.4], rl:[1.6,2.0], acc:7, wt:.85,
  m:{ t:'pistol', R:[.16,.032,.026], B:[.09,.005], stk:'none', grip:'pst', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', wd:'wood', mt:'blued', x:['hammer'] }});

// ================================ WW2 =======================================
w({ id:'m1903a3', n:'M1903A3 Springfield', e:'ww2', c:'RIF', y:1942, co:'United States', cal:'.30-06', act:'bolt', modes:['bolt'], rpm:38, mag:5, v:853, dmg:110, rec:[2.5,.5], rl:[2.4,3.2], acc:2, wt:4.08, cyc:.7,
  m:{ t:'bolt', R:[.25,.056,.04], B:[.61,.0085], hg:['wfull',.52], stk:'rifle', grip:'st', mag:['int'], sgt:'peep', bh:'bolt', mz:'crown', wd:'wood', mt:'park', x:['bands','lug'] }});
w({ id:'m1903a4', n:'M1903A4 Sniper', e:'ww2', c:'SR', y:1943, co:'United States', cal:'.30-06', act:'bolt', modes:['bolt'], rpm:30, mag:5, v:853, dmg:112, rec:[2.4,.5], rl:[2.4,3.2], acc:1.4, wt:4.3, cyc:.8, defOptic:'m73',
  m:{ t:'bolt', R:[.25,.056,.04], B:[.61,.0085], hg:['wfull',.52], stk:'rifle_pg', grip:'st', mag:['int'], sgt:'none', bh:'bolt_bent', mz:'crown', wd:'wood', mt:'park', x:['bands'] }});
w({ id:'mas36', n:'MAS-36', e:'ww2', c:'RIF', y:1936, co:'France', cal:'7.5×54mm', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:823, dmg:104, rec:[2.3,.5], rl:[2.3,3.0], acc:2.5, wt:3.72, cyc:.65,
  m:{ t:'bolt', R:[.25,.06,.044], B:[.575,.0085], hg:['wood',.4], stk:'rifle', grip:'st', mag:['int'], sgt:'peep', bh:'bolt_bent', mz:'crown', wd:'wood', mt:'park', x:['bands','bayo_spike'] }});
w({ id:'johnson', n:'Johnson M1941', e:'ww2', c:'RIF', y:1941, co:'United States', cal:'.30-06', act:'semi', modes:['semi'], rpm:120, mag:10, v:853, dmg:95, rec:[2.1,.6], rl:[2.8,2.8], acc:2.5, wt:4.3, tubeLoad:true,
  m:{ t:'semiw', R:[.3,.066,.044], B:[.56,.009], hg:['perf',.3,.02], stk:'rifle', grip:'st', mag:['int'], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'park', x:[] }});
w({ id:'thompson1928', n:'Thompson M1928A1', e:'ww2', c:'SMG', y:1938, co:'United States', cal:'.45 ACP', act:'auto_ob', modes:['auto','semi'], rpm:700, mag:30, v:285, dmg:30, rec:[.65,.35], rl:[2.4,3.0], acc:8, wt:4.9,
  m:{ t:'smg', R:[.28,.065,.045], B:[.27,.0095], hg:['thompson',.14], stk:'thompson', grip:'pg_wood', mag:['box',.24,0,-.07], sgt:'uzi', bh:'top', mz:'comp', wd:'wood', mt:'blued', x:['fins_thompson'] }});
w({ id:'sten5', n:'Sten Mk V', e:'ww2', c:'SMG', y:1944, co:'United Kingdom', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:550, mag:32, v:365, dmg:25, rec:[.5,.32], rl:[2.4,3.0], acc:8, wt:3.9,
  m:{ t:'smg', R:[.32,.034,.034], B:[.20,.0075], hg:['perf',.08,.017], stk:'rifle_short', grip:'pg_wood', mag:['sidebox_l',.24,0,-.05], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'park', x:['frontgrip','lug'] }});
w({ id:'type100', n:'Type 100 SMG', e:'ww2', c:'SMG', y:1942, co:'Empire of Japan', cal:'8×22mm Nambu', act:'auto_ob', modes:['auto'], rpm:800, mag:30, v:335, dmg:22, rec:[.5,.35], rl:[2.4,3.0], acc:9, wt:3.8,
  m:{ t:'smg', R:[.3,.045,.045], B:[.23,.0075], hg:['perf',.18,.02], stk:'rifle_short', grip:'st', mag:['sidebox_l',.2,.2,-.04], sgt:'hood', bh:'side_r', mz:'comp', wd:'wood_red', mt:'blued', x:['lug'] }});
w({ id:'mab38', n:'Beretta MAB 38A', e:'ww2', c:'SMG', y:1938, co:'Italy', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:600, mag:40, v:420, dmg:26, rec:[.45,.3], rl:[2.5,3.1], acc:6, wt:4.2,
  m:{ t:'smg', R:[.3,.045,.045], B:[.32,.0075], hg:['perf',.28,.021], stk:'rifle', grip:'st', mag:['box',.26,0,-.06], sgt:'hood', bh:'side_r', mz:'comp', wd:'wood', mt:'blued', x:[] }});
w({ id:'owen', n:'Owen Mk 1', e:'ww2', c:'SMG', y:1941, co:'Australia', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:700, mag:33, v:420, dmg:25, rec:[.45,.3], rl:[2.4,3.0], acc:7, wt:4.2,
  m:{ t:'smg', R:[.3,.045,.045], B:[.25,.0085], hg:['fin',.08,.02], stk:'wire', grip:'pg_metal', mag:['top_curve',.2,0,-.04], sgt:'offset_l', bh:'side_r', mz:'comp', mt:'park', x:['frontgrip'] }});
w({ id:'suomi', n:'Suomi KP/-31', e:'ww2', c:'SMG', y:1931, co:'Finland', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:900, mag:71, v:400, dmg:25, rec:[.45,.35], rl:[3.6,4.4], acc:6, wt:4.6,
  m:{ t:'smg', R:[.32,.05,.045], B:[.31,.0075], hg:['perf',.30,.022], stk:'rifle', grip:'st', mag:['drum',.08,0,-.07], sgt:'hood', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'mg34', n:'MG 34', e:'ww2', c:'LMG', y:1936, co:'Germany', cal:'7.92×57mm', act:'auto_ob', modes:['auto','semi'], rpm:900, mag:50, v:765, dmg:52, rec:[1.2,.65], rl:[4.8,5.6], acc:5, wt:12.1, heavy:true,
  m:{ t:'mg', R:[.36,.075,.05], B:[.55,.012], hg:['mg42',.40,.026], stk:'mg42', grip:'pg', mag:['beltdrum',.08], sgt:'mg42', bh:'side_r', mz:'cone', bip:1, pl:'bakelite', mt:'blued', x:[] }});
w({ id:'m1919', n:'Browning M1919A6', e:'ww2', c:'LMG', y:1943, co:'United States', cal:'.30-06', act:'auto', modes:['auto'], rpm:500, mag:250, v:853, dmg:55, rec:[.8,.45], rl:[6.0,6.8], acc:4, wt:14.7, heavy:true,
  m:{ t:'mg', R:[.46,.11,.07], B:[.61,.012], hg:['perf',.5,.03], stk:'rifle_short', grip:'pg', mag:['beltbox',.16], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'park', x:['carry_m60'] }});
w({ id:'type99lmg', n:'Type 99 LMG', e:'ww2', c:'LMG', y:1939, co:'Empire of Japan', cal:'7.7×58mm', act:'auto_ob', modes:['auto'], rpm:800, mag:30, v:715, dmg:52, rec:[.9,.45], rl:[3.0,3.6], acc:3.5, wt:10.4,
  m:{ t:'lmg', R:[.4,.075,.05], B:[.55,.011], hg:['fin',.2,.018], stk:'bren', grip:'pg_wood', mag:['top_curve',.2,.3,-.05], sgt:'offset_l', bh:'side_r', mz:'cone', bip:1, wd:'wood_red', mt:'blued', x:['carryhandle_bren','gas','monopod'] }});
w({ id:'boys', n:'Boys Anti-Tank Rifle', e:'ww2', c:'SR', y:1937, co:'United Kingdom', cal:'.55 Boys', act:'bolt', modes:['bolt'], rpm:10, mag:5, v:747, dmg:240, rec:[4,1], rl:[3.2,3.8], acc:3, wt:16.3, cyc:1.1, heavy:true,
  m:{ t:'lmg', R:[.42,.08,.06], B:[.91,.016], hg:['none',0], stk:'rifle_pg', grip:'pg', mag:['top_curve',.13,0,-.05], sgt:'offset_l', bh:'bolt', mz:'barrett', bip:1, mt:'park', x:['monopod'] }});
w({ id:'ppk', n:'Walther PPK', e:'ww2', c:'PST', y:1931, co:'Germany', cal:'.32 ACP', act:'semi', modes:['semi'], rpm:360, mag:7, v:290, dmg:22, rec:[.9,.4], rl:[1.5,1.9], acc:6, wt:.59,
  m:{ t:'pistol', R:[.155,.03,.026], B:[.083,.005], stk:'none', grip:'pst', mag:['pst',.1], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'vis35', n:'Radom VIS 35', e:'ww2', c:'PST', y:1935, co:'Poland', cal:'9×19mm', act:'semi', modes:['semi'], rpm:320, mag:8, v:350, dmg:28, rec:[1.1,.45], rl:[1.6,2.0], acc:5, wt:1.05,
  m:{ t:'pistol', R:[.205,.036,.03], B:[.115,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'welrod', n:'Welrod Mk IIA', e:'ww2', c:'PST', y:1943, co:'United Kingdom', cal:'.32 ACP', act:'bolt', modes:['bolt'], rpm:30, mag:8, v:210, dmg:24, rec:[.4,.2], rl:[2.2,2.6], acc:4, wt:1.1, cyc:.8,
  m:{ t:'smg', R:[.2,.032,.032], B:[.1,.007], hg:['none',0], stk:'none', grip:'magwell', mag:['box',.1,0,.03], sgt:'pst', bh:'bolt', mz:'sup_slx', mt:'black', x:['round_body'] }});
w({ id:'enfield2', n:'Enfield No. 2 Mk I*', e:'ww2', c:'PST', y:1932, co:'United Kingdom', cal:'.38/200', act:'rev', modes:['semi'], rpm:150, mag:6, v:190, dmg:34, rec:[1.2,.5], rl:[2.6,2.6], acc:7, wt:.77,
  m:{ t:'rev', R:[.11,.048,.035], B:[.127,.006], stk:'none', grip:'rev', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer','topbreak'] }});

// ================================ COLD WAR ==================================
w({ id:'m16a2', n:'M16A2', e:'cold', c:'AR', y:1983, co:'United States', cal:'5.56×45mm', act:'auto', modes:['burst3','semi'], rpm:800, mag:30, v:948, dmg:30, rec:[.55,.32], rl:[2.1,2.7], acc:2.5, wt:3.4,
  m:{ t:'ar', R:[.30,.08,.036], B:[.51,.0085], hg:['ar_round',.30], stk:'ar_a2', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'handle', bh:'ar', mz:'a2', pl:'black', mt:'park', x:['fa','lug'] }});
w({ id:'ar10', n:'ArmaLite AR-10', e:'cold', c:'BR', y:1956, co:'United States', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:700, mag:20, v:820, dmg:57, rec:[1.4,.65], rl:[2.4,3.0], acc:2.2, wt:3.29,
  m:{ t:'ar', R:[.33,.085,.04], B:[.51,.009], hg:['ar_round',.26], stk:'ar_a1', grip:'ar', mag:['box',.15,0,-.07], sgt:'handle', bh:'ar', mz:'brake', pl:'tan', mt:'park', x:['fa'] }});
w({ id:'stoner63', n:'Stoner 63A LMG', e:'cold', c:'LMG', y:1963, co:'United States', cal:'5.56×45mm', act:'auto_ob', modes:['auto'], rpm:700, mag:150, v:990, dmg:29, rec:[.55,.35], rl:[4.8,5.6], acc:4, wt:5.3,
  m:{ t:'mg', R:[.40,.08,.05], B:[.51,.0095], hg:['perf',.3,.024], stk:'poly_sg', grip:'pg', mag:['beltbox',.14], sgt:'rifle', bh:'side_l', mz:'bird', bip:1, pl:'black', mt:'park', x:[] }});
w({ id:'m2carbine', n:'M2 Carbine', e:'cold', c:'CAR', y:1945, co:'United States', cal:'.30 Carbine', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:607, dmg:46, rec:[.8,.45], rl:[1.9,2.4], acc:4.5, wt:2.6,
  m:{ t:'semiw', R:[.22,.05,.036], B:[.46,.0075], hg:['wood',.24], stk:'carbine', grip:'st', mag:['curve',.17,.25,-.06], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'park', x:['bands','lug'] }});
w({ id:'vz58', n:'Sa vz. 58', e:'cold', c:'AR', y:1958, co:'Czechoslovakia', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:800, mag:30, v:705, dmg:40, rec:[.95,.55], rl:[2.3,2.8], acc:3.8, wt:2.9,
  m:{ t:'ak', R:[.3,.066,.042], B:[.39,.0085], hg:['ak',.21], stk:'ak', grip:'ak', mag:['curve',.2,.45,-.07], sgt:'ak', bh:'side_r', mz:'crown', wd:'wood', pl:'plum', mt:'black', x:['gas'] }});
w({ id:'type56', n:'Type 56', e:'cold', c:'AR', y:1956, co:'China', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:650, mag:30, v:735, dmg:40, rec:[1.05,.6], rl:[2.5,3.1], acc:4.2, wt:3.8,
  m:{ t:'ak', R:[.30,.07,.045], B:[.415,.0085], hg:['ak',.21], stk:'ak', grip:'ak', mag:['curve',.21,.5,-.07], sgt:'ak', bh:'ak', mz:'crown', wd:'wood_red', mt:'blued', x:['gas','dust','bayo_spike'] }});
w({ id:'aks74u', n:'AKS-74U', e:'cold', c:'CAR', y:1979, co:'Soviet Union', cal:'5.45×39mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:735, dmg:29, rec:[.8,.55], rl:[2.3,2.9], acc:5, wt:2.7,
  m:{ t:'ak', R:[.30,.07,.045], B:[.21,.0085], hg:['ak_rib',.14], stk:'ak_side', grip:'ak', mag:['curve',.20,.35,-.07], sgt:'ak', bh:'ak', mz:'an94', pl:'plum', wd:'wood_red', mt:'blued', x:['dust'] }});
w({ id:'g3sg1', n:'H&K G3SG/1', e:'cold', c:'DMR', y:1972, co:'West Germany', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:550, mag:20, v:800, dmg:60, rec:[1.4,.7], rl:[2.7,3.4], acc:1.2, wt:5.54, defOptic:'zf_diavari',
  m:{ t:'battle', R:[.33,.075,.045], B:[.45,.009], hg:['g3',.25], stk:'g3', grip:'hk', mag:['box',.14,.1,-.06], sgt:'drum_hk', bh:'hk', mz:'bird', bip:1, pl:'black', mt:'black', x:['claw'] }});
w({ id:'psg1', n:'H&K PSG1', e:'cold', c:'DMR', y:1972, co:'West Germany', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:40, mag:20, v:868, dmg:66, rec:[1.2,.5], rl:[2.8,3.5], acc:.4, wt:7.2, defOptic:'zf_diavari',
  m:{ t:'battle', R:[.33,.075,.045], B:[.65,.011], hg:['g3',.3], stk:'precision_st', grip:'thumbhole', mag:['box',.12,.05,-.06], sgt:'none', bh:'hk', mz:'crown', pl:'black', mt:'black', x:['claw'] }});
w({ id:'hk21', n:'H&K HK21', e:'cold', c:'LMG', y:1961, co:'West Germany', cal:'7.62×51mm', act:'auto', modes:['auto','semi'], rpm:900, mag:100, v:800, dmg:56, rec:[1.1,.6], rl:[4.8,5.6], acc:4, wt:7.9,
  m:{ t:'mg', R:[.36,.08,.05], B:[.45,.011], hg:['g3',.28], stk:'g3', grip:'hk', mag:['beltbox',.14], sgt:'drum_hk', bh:'hk', mz:'bird', bip:1, pl:'black', mt:'black', x:[] }});
w({ id:'mg3', n:'MG 3', e:'cold', c:'LMG', y:1958, co:'West Germany', cal:'7.62×51mm', act:'auto_ob', modes:['auto'], rpm:1100, mag:100, v:820, dmg:56, rec:[1.25,.7], rl:[4.8,5.6], acc:5.5, wt:11.5, heavy:true,
  m:{ t:'mg', R:[.36,.08,.05], B:[.53,.012], hg:['mg42',.40,.03], stk:'mg42', grip:'pg', mag:['beltdrum',.08], sgt:'mg42', bh:'side_r', mz:'mg42', bip:1, pl:'black', mt:'black', x:[] }});
w({ id:'skorpion', n:'Škorpion vz. 61', e:'cold', c:'SMG', y:1961, co:'Czechoslovakia', cal:'.32 ACP', act:'auto', modes:['auto','semi'], rpm:850, mag:20, v:320, dmg:21, rec:[.45,.4], rl:[1.9,2.4], acc:8, wt:1.3,
  m:{ t:'smg', R:[.18,.05,.03], B:[.115,.006], hg:['none',0], stk:'wire', grip:'pst_raked', mag:['curve',.14,.3,-.02], sgt:'pst', bh:'side_both', mz:'crown', wd:'wood', mt:'black', x:[] }});
w({ id:'mp5sd', n:'H&K MP5SD3', e:'cold', c:'SMG', y:1974, co:'West Germany', cal:'9×19mm', act:'auto', modes:['auto','burst3','semi'], rpm:700, mag:30, v:285, dmg:23, rec:[.3,.22], rl:[2.2,2.9], acc:5, wt:3.4,
  m:{ t:'smg', R:[.27,.06,.04], B:[.146,.008], hg:['mp5',.14], stk:'mp5_coll', grip:'hk', mag:['curve',.18,.4,-.06], sgt:'drum_hk', bh:'hk', mz:'sup_slx', pl:'black', mt:'black', x:['claw'] }});
w({ id:'aps', n:'Stechkin APS', e:'cold', c:'PST', y:1951, co:'Soviet Union', cal:'9×18mm', act:'auto', modes:['semi','auto'], rpm:750, mag:20, v:340, dmg:25, rec:[1,.6], rl:[1.8,2.2], acc:6, wt:1.22,
  m:{ t:'pistol', R:[.225,.036,.032], B:[.14,.006], stk:'none', grip:'pst', mag:['pst',.14], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:['hammer'] }});
w({ id:'cz75', n:'CZ 75', e:'cold', c:'PST', y:1975, co:'Czechoslovakia', cal:'9×19mm', act:'semi', modes:['semi'], rpm:340, mag:16, v:370, dmg:27, rec:[.95,.4], rl:[1.5,1.9], acc:4, wt:1.0,
  m:{ t:'pistol', R:[.206,.034,.03], B:[.12,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'blued', x:['hammer'] }});
w({ id:'sw29', n:'S&W Model 29', e:'cold', c:'PST', y:1955, co:'United States', cal:'.44 Magnum', act:'rev', modes:['semi'], rpm:130, mag:6, v:450, dmg:66, rec:[2.6,.9], rl:[2.7,2.7], acc:3.5, wt:1.4,
  m:{ t:'rev', R:[.13,.055,.04], B:[.21,.0075], stk:'none', grip:'rev_wood', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', wd:'wood', mt:'blued', x:['hammer'] }});
w({ id:'p226', n:'SIG Sauer P226', e:'cold', c:'PST', y:1984, co:'Switzerland', cal:'9×19mm', act:'semi', modes:['semi'], rpm:350, mag:15, v:375, dmg:27, rec:[.95,.4], rl:[1.5,1.9], acc:3.8, wt:.96,
  m:{ t:'pistol', R:[.196,.036,.032], B:[.112,.006], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['hammer'] }});
w({ id:'ithaca37', n:'Ithaca 37 (Vietnam)', e:'cold', c:'SG', y:1962, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:90, mag:5, v:400, dmg:15, pellets:9, rec:[2.9,.8], rl:[.55,.55], acc:40, wt:3.0, cyc:.45, tubeLoad:true,
  m:{ t:'pump', R:[.22,.068,.042], B:[.47,.011], hg:['pump_ribbed',.18], stk:'rifle', grip:'st', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', wd:'wood', mt:'park', x:[] }});
w({ id:'vss', n:'VSS Vintorez', e:'cold', c:'DMR', y:1987, co:'Soviet Union', cal:'9×39mm', act:'auto', modes:['semi','auto'], rpm:900, mag:20, v:290, dmg:52, rec:[.6,.35], rl:[2.4,3.0], acc:2.5, wt:2.6, defOptic:'pso1',
  m:{ t:'ak', R:[.28,.07,.045], B:[.2,.0085], hg:['ak',.08], stk:'svd', grip:'none', mag:['box',.12,.05,-.06], sgt:'ak', bh:'ak', mz:'sup_slx', wd:'wood', mt:'black', x:['dust','siderail'] }});
w({ id:'l42', n:'L42A1', e:'cold', c:'SR', y:1970, co:'United Kingdom', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:838, dmg:115, rec:[1.9,.4], rl:[2.6,3.2], acc:1, wt:4.43, cyc:.65, defOptic:'no32',
  m:{ t:'bolt', R:[.25,.058,.042], B:[.70,.0095], hg:['wood',.3], stk:'rifle', grip:'st', mag:['box',.08,0,-.04], sgt:'peep', bh:'bolt', mz:'crown', wd:'wood', mt:'black', x:['bands'] }});
w({ id:'l96', n:'Accuracy Intl. L96A1', e:'cold', c:'SR', y:1982, co:'United Kingdom', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:840, dmg:115, rec:[1.8,.4], rl:[2.6,3.2], acc:.6, wt:6.5, cyc:.8, defOptic:'redfield',
  m:{ t:'precision', R:[.26,.075,.05], B:[.66,.011], hg:['ai',.36], stk:'ai', grip:'thumbhole', mag:['box',.09,0,-.04], sgt:'none', bh:'bolt', mz:'crown', bip:1, pl:'od', mt:'black', x:['rail_bolt'] }});

// ================================ MODERN ====================================
w({ id:'sig550', n:'SIG SG 550', e:'mod', c:'AR', y:1990, co:'Switzerland', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:700, mag:30, v:995, dmg:30, rec:[.45,.3], rl:[2.3,2.9], acc:2, wt:4.05,
  m:{ t:'ak', R:[.32,.075,.045], B:[.528,.0085], hg:['g36',.26], stk:'side_fold', grip:'ak_poly', mag:['box_clear',.19,.15,-.07], sgt:'drum_hk', bh:'ak', mz:'bird', bip:1, pl:'black', mt:'black', x:['gas'] }});
w({ id:'g36c', n:'H&K G36C', e:'mod', c:'CAR', y:2001, co:'Germany', cal:'5.56×45mm', act:'auto', modes:['auto','burst2','semi'], rpm:750, mag:30, v:850, dmg:28, rec:[.55,.35], rl:[2.3,2.8], acc:3.2, wt:2.82,
  m:{ t:'ar', R:[.36,.08,.042], B:[.228,.0085], hg:['g36',.16], stk:'g36', grip:'g36', mag:['box_clear',.19,.15,-.06], sgt:'flat', bh:'g36', mz:'bird', pl:'g36', mt:'black', x:['railT'] }});
w({ id:'mk18', n:'Mk 18 Mod 1 CQBR', e:'mod', c:'CAR', y:2005, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:780, dmg:27, rec:[.6,.38], rl:[2.0,2.6], acc:3.2, wt:2.7,
  m:{ t:'ar', R:[.30,.08,.036], B:[.262,.0085], hg:['quad',.18], stk:'crane', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'bird', pl:'fde', mt:'black', x:['fa','railT'] }});
w({ id:'f2000', n:'FN F2000', e:'mod', c:'AR', y:2001, co:'Belgium', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:910, dmg:30, rec:[.45,.3], rl:[2.6,3.1], acc:2.5, wt:3.6,
  m:{ t:'bullpup', R:[.5,.1,.055], B:[.4,.0085], hg:['none',0], stk:'p90', grip:'p90', mag:['curve',.19,.15,.1], sgt:'flat', bh:'side_l', mz:'bird', pl:'black', mt:'black', x:['railT'] }});
w({ id:'arx160', n:'Beretta ARX160', e:'mod', c:'AR', y:2008, co:'Italy', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:880, dmg:29, rec:[.5,.32], rl:[2.2,2.8], acc:2.8, wt:3.1,
  m:{ t:'scar', R:[.36,.09,.046], B:[.4,.0085], hg:['scar',.22], stk:'scar', grip:'ar_poly', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_both', mz:'bird', pl:'black', mt:'black', x:['railT'] }});
w({ id:'asval', n:'AS Val', e:'mod', c:'AR', y:1994, co:'Russia', cal:'9×39mm', act:'auto', modes:['auto','semi'], rpm:900, mag:20, v:295, dmg:52, rec:[.55,.35], rl:[2.3,2.9], acc:3.5, wt:2.5,
  m:{ t:'ak', R:[.28,.07,.045], B:[.2,.0085], hg:['ak_poly',.08], stk:'ak_side', grip:'ak_poly', mag:['box',.14,.05,-.06], sgt:'ak', bh:'ak', mz:'sup_slx', pl:'black', mt:'black', x:['dust','siderail'] }});
w({ id:'bizon', n:'PP-19 Bizon', e:'mod', c:'SMG', y:1996, co:'Russia', cal:'9×18mm', act:'auto', modes:['auto','semi'], rpm:680, mag:64, v:330, dmg:23, rec:[.35,.25], rl:[3.0,3.6], acc:6, wt:2.1,
  m:{ t:'ak', R:[.30,.07,.045], B:[.225,.0075], hg:['none',0], stk:'ak_side', grip:'ak_poly', mag:['helical',.3], sgt:'ak', bh:'ak', mz:'crown', pl:'black', mt:'black', x:['dust','siderail'] }});
w({ id:'vityaz', n:'PP-19-01 Vityaz', e:'mod', c:'SMG', y:2004, co:'Russia', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:390, dmg:25, rec:[.35,.25], rl:[2.3,2.9], acc:5, wt:2.9,
  m:{ t:'ak', R:[.30,.07,.045], B:[.237,.0075], hg:['ak_poly',.16], stk:'ak_side', grip:'ak_poly', mag:['box',.19,.1,-.06], sgt:'ak', bh:'ak', mz:'crown', pl:'black', mt:'black', x:['dust','siderail','railT'] }});
w({ id:'pp2000', n:'PP-2000', e:'mod', c:'SMG', y:2004, co:'Russia', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:700, mag:20, v:400, dmg:24, rec:[.45,.35], rl:[1.8,2.3], acc:7, wt:1.4,
  m:{ t:'smg', R:[.22,.075,.035], B:[.182,.0075], hg:['none',0], stk:'none', grip:'magwell', mag:['box',.14,0,.02], sgt:'flat', bh:'top', mz:'crown', pl:'black', mt:'black', x:['railT','foldgrip'] }});
w({ id:'tmp', n:'Steyr TMP', e:'mod', c:'SMG', y:1992, co:'Austria', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:380, dmg:24, rec:[.45,.38], rl:[1.8,2.3], acc:7, wt:1.3,
  m:{ t:'smg', R:[.24,.08,.04], B:[.13,.0075], hg:['none',0], stk:'none', grip:'magwell', mag:['box',.2,0,.02], sgt:'pst', bh:'top', mz:'crown', pl:'black', mt:'black', x:['foldgrip'] }});
w({ id:'mp9', n:'B&T MP9', e:'mod', c:'SMG', y:2004, co:'Switzerland', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:1100, mag:30, v:390, dmg:24, rec:[.42,.35], rl:[1.8,2.3], acc:6, wt:1.4,
  m:{ t:'smg', R:[.24,.08,.04], B:[.13,.0075], hg:['none',0], stk:'wire', grip:'magwell', mag:['box',.2,0,.02], sgt:'flat', bh:'top', mz:'crown', pl:'black', mt:'black', x:['railT','foldgrip'] }});
w({ id:'aa12', n:'AA-12', e:'mod', c:'SG', y:2005, co:'United States', cal:'12 gauge', act:'auto', modes:['auto','semi'], rpm:300, mag:20, v:400, dmg:15, pellets:9, rec:[1.2,.5], rl:[3.2,3.8], acc:36, wt:5.2,
  m:{ t:'battle', R:[.42,.1,.06], B:[.33,.012], hg:['poly',.2], stk:'fixedS', grip:'pg', mag:['drum',.08,0,-.07], sgt:'flat', bh:'side_l', mz:'cone', pl:'black', mt:'black', x:['railT','carry_saw'] }});
w({ id:'vepr12', n:'Vepr-12 Molot', e:'mod', c:'SG', y:2003, co:'Russia', cal:'12 gauge', act:'semi', modes:['semi'], rpm:250, mag:8, v:400, dmg:15, pellets:9, rec:[2.6,.9], rl:[2.4,3.0], acc:36, wt:4.1,
  m:{ t:'ak', R:[.30,.075,.045], B:[.43,.011], hg:['ak_poly',.21], stk:'ak_side', grip:'ak_poly', mag:['box',.18,.1,-.07], sgt:'flat', bh:'ak', mz:'brake', pl:'black', mt:'black', x:['gas','railT'] }});
w({ id:'m590', n:'Mossberg 590A1', e:'mod', c:'SG', y:1990, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:80, mag:8, v:400, dmg:15, pellets:9, rec:[2.9,.8], rl:[.5,.5], acc:40, wt:3.3, cyc:.45, tubeLoad:true,
  m:{ t:'pump', R:[.23,.07,.044], B:[.51,.011], hg:['pump_ribbed',.2], stk:'poly_sg', grip:'st', mag:['tube'], sgt:'ghost', bh:'pump', mz:'crown', pl:'black', mt:'park', x:['heat'] }});
w({ id:'mg4', n:'H&K MG4', e:'mod', c:'LMG', y:2005, co:'Germany', cal:'5.56×45mm', act:'auto_ob', modes:['auto'], rpm:850, mag:200, v:920, dmg:29, rec:[.55,.35], rl:[5.0,5.8], acc:3.5, wt:8.15, heavy:true,
  m:{ t:'mg', R:[.40,.09,.055], B:[.48,.011], hg:['saw',.2], stk:'side_fold', grip:'pg', mag:['beltbox',.16], sgt:'flat', bh:'side_r', mz:'bird', bip:1, pl:'black', mt:'black', x:['railT','carry_saw'] }});
w({ id:'mk48', n:'Mk 48 Mod 0', e:'mod', c:'LMG', y:2003, co:'United States', cal:'7.62×51mm', act:'auto_ob', modes:['auto'], rpm:730, mag:100, v:840, dmg:56, rec:[1.0,.5], rl:[5.2,6.0], acc:4, wt:8.2, heavy:true,
  m:{ t:'mg', R:[.40,.095,.055], B:[.50,.012], hg:['quad',.22], stk:'saw', grip:'pg', mag:['beltpouch',.15], sgt:'flat', bh:'side_r', mz:'cone', bip:1, pl:'fde', mt:'black', x:['railT','carry_saw'] }});
w({ id:'pkp', n:'PKP Pecheneg', e:'mod', c:'LMG', y:2001, co:'Russia', cal:'7.62×54mmR', act:'auto_ob', modes:['auto'], rpm:650, mag:100, v:825, dmg:55, rec:[.95,.5], rl:[5.0,5.8], acc:3.5, wt:8.2, heavy:true,
  m:{ t:'mg', R:[.38,.085,.05], B:[.60,.013], hg:['perf',.42,.028], stk:'pkm', grip:'pg', mag:['beltbox',.14], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, pl:'black', mt:'black', x:['gas','carry_pk'] }});
w({ id:'sr25', n:'KAC SR-25', e:'mod', c:'DMR', y:2000, co:'United States', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:40, mag:20, v:820, dmg:64, rec:[1.3,.5], rl:[2.4,3.0], acc:.8, wt:4.9, defOptic:'leupold10',
  m:{ t:'ar', R:[.33,.09,.04], B:[.51,.0105], hg:['quad_long',.34], stk:'ar_a2', grip:'ar', mag:['box',.13,0,-.07], sgt:'flat', bh:'ar', mz:'crown', bip:1, pl:'black', mt:'black', x:['railT','fa'] }});
w({ id:'sv98', n:'SV-98', e:'mod', c:'SR', y:2000, co:'Russia', cal:'7.62×54mmR', act:'bolt', modes:['bolt'], rpm:40, mag:10, v:820, dmg:118, rec:[1.9,.4], rl:[2.6,3.2], acc:.6, wt:6.2, cyc:.8, defOptic:'m3a',
  m:{ t:'precision', R:[.26,.075,.05], B:[.65,.012], hg:['ai',.36], stk:'ai', grip:'thumbhole', mag:['box',.09,0,-.04], sgt:'none', bh:'bolt', mz:'sup_slx', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'dsr1', n:'DSR-Precision DSR-1', e:'mod', c:'SR', y:2000, co:'Germany', cal:'.338 Lapua', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:900, dmg:158, rec:[2,.4], rl:[2.8,3.5], acc:.4, wt:5.9, cyc:.85, defOptic:'pm2',
  m:{ t:'bullpup', R:[.56,.11,.06], B:[.65,.012], hg:['none',0], stk:'mdr', grip:'x95', mag:['box',.1,0,.12], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'l115a3', n:'L115A3', e:'mod', c:'SR', y:2008, co:'United Kingdom', cal:'.338 Lapua', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:936, dmg:160, rec:[2.3,.45], rl:[2.8,3.6], acc:.45, wt:6.8, cyc:.9, defOptic:'pm2',
  m:{ t:'precision', R:[.26,.075,.05], B:[.69,.012], hg:['ai',.38], stk:'ai', grip:'thumbhole', mag:['box',.09,0,-.04], sgt:'none', bh:'bolt', mz:'sup_slx', bip:1, pl:'green', mt:'black', x:['rail_bolt'] }});
w({ id:'tac50', n:'McMillan TAC-50', e:'mod', c:'SR', y:2000, co:'United States', cal:'.50 BMG', act:'bolt', modes:['bolt'], rpm:20, mag:5, v:840, dmg:255, rec:[3.4,.7], rl:[3.0,3.6], acc:.5, wt:11.8, cyc:1.0, heavy:true, defOptic:'leupold10',
  m:{ t:'precision', R:[.32,.085,.06], B:[.74,.016], hg:['ai',.4], stk:'ai', grip:'thumbhole', mag:['box',.1,0,-.05], sgt:'none', bh:'bolt', mz:'barrett', bip:1, pl:'tan', mt:'black', x:['railT'] }});
w({ id:'m200', n:'CheyTac M200', e:'mod', c:'SR', y:2001, co:'United States', cal:'.408 CheyTac', act:'bolt', modes:['bolt'], rpm:25, mag:7, v:900, dmg:200, rec:[2.8,.6], rl:[3.0,3.6], acc:.4, wt:14, cyc:.95, heavy:true, defOptic:'leupold10',
  m:{ t:'precision', R:[.32,.085,.06], B:[.74,.015], hg:['mlok_long',.44], stk:'mrad', grip:'ar', mag:['box',.1,0,-.05], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'steyrscout', n:'Steyr Scout', e:'mod', c:'SR', y:1998, co:'Austria', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:800, dmg:112, rec:[2,.45], rl:[2.4,3.0], acc:.9, wt:3.0, cyc:.65, defOptic:'m3a',
  m:{ t:'bolt', R:[.24,.06,.042], B:[.48,.0095], hg:['poly_sporter',.36], stk:'sporter', grip:'pg_poly', mag:['box',.07,0,-.04], sgt:'none', bh:'bolt', mz:'crown', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'mk23', n:'H&K Mk 23 SOCOM', e:'mod', c:'PST', y:1996, co:'Germany', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:300, mag:12, v:270, dmg:38, rec:[1.3,.5], rl:[1.6,2.0], acc:2.5, wt:1.1,
  m:{ t:'pistol', R:[.245,.038,.034], B:[.149,.0068], stk:'none', grip:'pst_poly', mag:['pst',.13], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['hammer','railP'] }});
w({ id:'p99', n:'Walther P99', e:'mod', c:'PST', y:1997, co:'Germany', cal:'9×19mm', act:'semi', modes:['semi'], rpm:350, mag:15, v:360, dmg:26, rec:[.9,.4], rl:[1.4,1.8], acc:4, wt:.7,
  m:{ t:'pistol', R:[.18,.034,.03], B:[.102,.006], stk:'none', grip:'pst_poly', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['railP'] }});

// ================================ PRESENT ===================================
w({ id:'rattler', n:'SIG MCX Rattler', e:'now', c:'CAR', y:2019, co:'United States', cal:'.300 BLK', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:600, dmg:38, rec:[.6,.4], rl:[2.0,2.6], acc:3, wt:2.6,
  m:{ t:'ar', R:[.30,.085,.04], B:[.14,.009], hg:['mlok_short',.14], stk:'mcx', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'sup_slx', pl:'coyote', mt:'black', x:['railT','charge_both'] }});
w({ id:'hk433', n:'H&K HK433', e:'now', c:'AR', y:2017, co:'Germany', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:900, dmg:29, rec:[.48,.3], rl:[2.1,2.7], acc:2.2, wt:3.5,
  m:{ t:'scar', R:[.36,.09,.046], B:[.36,.0085], hg:['mlok',.24], stk:'g36', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'a2', pl:'ral8000', mt:'black', x:['railT'] }});
w({ id:'m27', n:'M27 IAR', e:'now', c:'AR', y:2011, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:900, dmg:30, rec:[.42,.28], rl:[2.1,2.7], acc:1.8, wt:3.6, defOptic:'acog',
  m:{ t:'ar', R:[.30,.08,.036], B:[.419,.009], hg:['quad_long',.3], stk:'crane', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'a2', bip:1, pl:'fde', mt:'black', x:['fa','railT'] }});
w({ id:'sig716', n:'SIG716 G2', e:'now', c:'BR', y:2016, co:'United States', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:650, mag:20, v:820, dmg:57, rec:[1.3,.6], rl:[2.3,2.9], acc:1.5, wt:4.1,
  m:{ t:'ar', R:[.33,.09,.04], B:[.406,.0095], hg:['mlok',.32], stk:'crane', grip:'ar', mag:['box',.14,0,-.07], sgt:'flat', bh:'ar', mz:'brake', pl:'black', mt:'black', x:['railT','fa'] }});
w({ id:'l129', n:'L129A1 Sharpshooter', e:'now', c:'DMR', y:2010, co:'United Kingdom', cal:'7.62×51mm', act:'semi', modes:['semi'], rpm:40, mag:20, v:840, dmg:64, rec:[1.3,.5], rl:[2.4,3.0], acc:.8, wt:4.5, defOptic:'acog',
  m:{ t:'ar', R:[.33,.09,.04], B:[.406,.0100], hg:['quad_long',.34], stk:'crane', grip:'ar', mag:['box',.14,0,-.07], sgt:'flat', bh:'ar', mz:'bird', bip:1, pl:'black', mt:'black', x:['railT','fa'] }});
w({ id:'aek971', n:'AEK-971', e:'now', c:'AR', y:2015, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['auto','burst3','semi'], rpm:900, mag:30, v:880, dmg:31, rec:[.4,.28], rl:[2.4,3.0], acc:2.8, wt:3.3,
  m:{ t:'ak', R:[.30,.075,.045], B:[.42,.0085], hg:['ak_poly',.22], stk:'ak_side', grip:'ak_poly', mag:['curve',.20,.35,-.07], sgt:'ak', bh:'ak', mz:'ak12', pl:'black', mt:'black', x:['gas','dust','siderail'] }});
w({ id:'ash12', n:'ASh-12.7', e:'now', c:'BR', y:2012, co:'Russia', cal:'12.7×55mm', act:'auto', modes:['semi','auto'], rpm:650, mag:20, v:290, dmg:90, rec:[1.6,.8], rl:[2.8,3.4], acc:3, wt:6.2,
  m:{ t:'bullpup', R:[.5,.12,.06], B:[.35,.012], hg:['none',0], stk:'mdr', grip:'x95', mag:['box',.14,0,.11], sgt:'flat', bh:'side_l', mz:'brake', pl:'black', mt:'black', x:['railT'] }});
w({ id:'type20', n:'Howa Type 20', e:'now', c:'AR', y:2020, co:'Japan', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:750, mag:30, v:880, dmg:29, rec:[.48,.3], rl:[2.1,2.7], acc:2.4, wt:3.5,
  m:{ t:'scar', R:[.36,.09,.046], B:[.33,.0085], hg:['mlok',.24], stk:'scar', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'a2', pl:'black', mt:'black', x:['railT'] }});
w({ id:'qbz191', n:'QBZ-191', e:'now', c:'AR', y:2019, co:'China', cal:'5.8×42mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:930, dmg:31, rec:[.5,.32], rl:[2.1,2.7], acc:2.4, wt:3.25,
  m:{ t:'ar', R:[.32,.085,.04], B:[.368,.0085], hg:['mlok',.28], stk:'crane', grip:'ar', mag:['curve',.19,.2,-.06], sgt:'flat', bh:'side_l', mz:'a2', pl:'black', mt:'black', x:['railT'] }});
w({ id:'evolys', n:'FN EVOLYS', e:'now', c:'LMG', y:2021, co:'Belgium', cal:'7.62×51mm', act:'auto_ob', modes:['auto'], rpm:750, mag:100, v:830, dmg:56, rec:[.9,.45], rl:[4.4,5.2], acc:3, wt:6.2, heavy:true,
  m:{ t:'mg', R:[.40,.085,.052], B:[.46,.011], hg:['mlok',.3], stk:'mcx', grip:'ar', mag:['beltpouch',.14], sgt:'flat', bh:'side_l', mz:'bird', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'uzipro', n:'IWI Uzi Pro', e:'now', c:'SMG', y:2010, co:'Israel', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:1200, mag:32, v:350, dmg:24, rec:[.45,.38], rl:[1.8,2.3], acc:7, wt:1.5,
  m:{ t:'smg', R:[.24,.075,.04], B:[.12,.0075], hg:['none',0], stk:'wire', grip:'magwell', mag:['box',.22,0,.02], sgt:'flat', bh:'top', mz:'crown', pl:'black', mt:'black', x:['railT','foldgrip'] }});
w({ id:'mpx_k', n:'SIG MPX-K', e:'now', c:'SMG', y:2016, co:'United States', cal:'9×19mm', act:'auto', modes:['auto','semi'], rpm:850, mag:30, v:350, dmg:24, rec:[.38,.28], rl:[2.0,2.5], acc:4.5, wt:2.3,
  m:{ t:'ar', R:[.27,.08,.036], B:[.114,.0075], hg:['mlok_short',.12], stk:'mcx', grip:'ar', mag:['box',.17,.1,-.05], sgt:'flat', bh:'ar', mz:'crown', pl:'coyote', mt:'black', x:['railT'] }});
w({ id:'dp12', n:'SM DP-12', e:'now', c:'SG', y:2015, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:150, mag:16, v:400, dmg:15, pellets:9, rec:[2.7,.8], rl:[.5,.5], acc:40, wt:4.3, cyc:.4, tubeLoad:true,
  m:{ t:'bullpup', R:[.46,.11,.06], B:[.47,.012], hg:['pump_bp',.16], stk:'ksg', grip:'ksg', mag:['tube2'], sgt:'flat', bh:'pump', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'m590m', n:'Mossberg 590M', e:'now', c:'SG', y:2018, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:80, mag:10, v:400, dmg:15, pellets:9, rec:[2.8,.8], rl:[2.4,3.0], acc:40, wt:3.7, cyc:.45,
  m:{ t:'pump', R:[.23,.07,.044], B:[.47,.011], hg:['pump_ribbed',.2], stk:'poly_sg', grip:'pg', mag:['box',.16,.05,-.06], sgt:'ghost', bh:'pump', mz:'crown', pl:'black', mt:'park', x:['railT'] }});
w({ id:'m2010', n:'M2010 ESR', e:'now', c:'SR', y:2011, co:'United States', cal:'.300 Win Mag', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:869, dmg:140, rec:[2.1,.45], rl:[2.6,3.3], acc:.5, wt:5.5, cyc:.8, defOptic:'nxs',
  m:{ t:'precision', R:[.28,.08,.05], B:[.61,.011], hg:['mlok_long',.42], stk:'mrad', grip:'ar', mag:['box',.09,0,-.04], sgt:'none', bh:'bolt', mz:'sup_slx', bip:1, pl:'coyote', mt:'black', x:['railT'] }});
w({ id:'t5000', n:'ORSIS T-5000', e:'now', c:'SR', y:2011, co:'Russia', cal:'.338 Lapua', act:'bolt', modes:['bolt'], rpm:35, mag:5, v:900, dmg:158, rec:[2.2,.45], rl:[2.8,3.5], acc:.4, wt:6.5, cyc:.85, defOptic:'nxs',
  m:{ t:'precision', R:[.3,.08,.05], B:[.69,.012], hg:['mlok_long',.42], stk:'ai', grip:'ar', mag:['box',.1,0,-.04], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'fn509', n:'FN 509 Tactical', e:'now', c:'PST', y:2017, co:'Belgium', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:17, v:370, dmg:26, rec:[.9,.4], rl:[1.4,1.8], acc:3.8, wt:.76,
  m:{ t:'pistol', R:[.2,.034,.031], B:[.114,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'fde', mt:'black', x:['railP','optic_cut'] }});
w({ id:'p365', n:'SIG P365', e:'now', c:'PST', y:2018, co:'United States', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:10, v:340, dmg:25, rec:[1.1,.45], rl:[1.3,1.7], acc:5, wt:.5,
  m:{ t:'pistol', R:[.15,.03,.026], B:[.079,.006], stk:'none', grip:'pst_poly', mag:['pst',.09], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:[] }});
w({ id:'staccato', n:'Staccato P', e:'now', c:'PST', y:2020, co:'United States', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:17, v:370, dmg:27, rec:[.75,.3], rl:[1.4,1.8], acc:2.5, wt:.9,
  m:{ t:'pistol', R:[.21,.035,.03], B:[.114,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'stainless', x:['hammer','railP'] }});
w({ id:'pl15', n:'Lebedev PL-15', e:'now', c:'PST', y:2020, co:'Russia', cal:'9×19mm', act:'semi', modes:['semi'], rpm:350, mag:14, v:360, dmg:26, rec:[.9,.4], rl:[1.4,1.8], acc:4, wt:.8,
  m:{ t:'pistol', R:[.2,.032,.028], B:[.112,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['hammer','railP'] }});

// ============================================================ attachments
const A = G.ATTACH, a = o => A.push(o);
a({ id:'zf_diavari', slot:'optic', n:'Hensoldt ZF 6×42', e0:2, only:['g3sg1','psg1','hk21','g3'], s:{ zoom:6, ret:'duplex', ads:1.35 }, d:'Claw-mounted German marksman scope.' });
a({ id:'pu_mosin', slot:'optic', n:'PE 4× (1930s)', e0:1, e1:2, only:['mosin9130','svt40'], s:{ zoom:4, ret:'post', ads:1.3 }, d:'Early Soviet Emelyanov scope.' });
// extend weapon-specific lists to the new arsenal
const extend = (id, ids) => { const at = G.ATTACH.find(x => x.id === id); if (at && at.only) at.only.push(...ids); };
extend('m73', ['m1903a4', 'm1903a3']); extend('unertl', ['m1903a3', 'm1903a4']); extend('m84', ['m1903a4']);
extend('no32', ['l42']); extend('redfield', ['l96']); extend('aldis', ['ross', 'm1917', 'berthier', 'm1895aus']);
extend('win_a5', ['m1917', 'ross']); extend('colt3x', ['m16a2', 'ar10']); extend('susat', ['sig550']);
extend('thompson50', ['thompson1928']); extend('thompson_vfg', ['thompson1928']); extend('sten_sup', ['sten5', 'owen']);
extend('cmag', ['mk18', 'g36c', 'm27', 'hk433', 'type20', 'qbz191', 'arx160', 'sig550', 'f2000', 'm16a2']);
extend('mag_pmag', ['mk18', 'm27', 'hk433', 'type20', 'arx160', 'rattler', 'm16a2']);
extend('belt200', ['m1919', 'mg34', 'mg3', 'hk21', 'mg4', 'mk48', 'pkp', 'evolys', 'stoner63', 'vickers']);
extend('glock33', ['fn509', 'p99']); extend('speedloader', ['nagant', 'sw29', 'enfield2']);
extend('stk_c96', ['steyr1912', 'aps', 'vis35']);
// capacity-changing magazines only fit weapons with detachable box magazines
const FIXED = ['int', 'tube', 'tube2', 'belt', 'beltdrum', 'beltbox', 'beltpouch', 'cyl', 'enbloc', 'pan', 'helical', 'p90', 'snail'];
for (const id of ['mag_ext', 'mag_drum', 'mag_fast']) { const at = G.ATTACH.find(x => x.id === id); if (at) at.fixedOk = false; }
G.fixedMag = wp => FIXED.includes(wp.m.mag[0]) || ['bolt', 'lever', 'rev', 'pump'].includes(wp.act);

G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));
G.ATT = Object.fromEntries(A.map(x => [x.id, x]));
})();
