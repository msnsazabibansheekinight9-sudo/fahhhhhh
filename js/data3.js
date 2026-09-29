// ============================================================================
// IRONSIGHT — arsenal part 3: more production weapons, plus prototype and
// experimental designs (proto: true). Special mechanics:
//   caseless  – no ejected cases (G11)          hyper   – hyperburst, recoil felt after the burst
//   salvo: n  – n barrels fire at once          gyro    – rocket projectile that accelerates
//   duplex    – two bullets per cartridge       flechette calibres – very fast, flat, light darts
// ============================================================================
'use strict';
(function () {
const G = window.G;
Object.assign(G.CAL, {
  '7×57mm':            { k: .00082, pen: 3, cs: [.057, .0060] },
  '.351 WSL':          { k: .00170, pen: 2, cs: [.035, .0048] },
  '9mm Glisenti':      { k: .00200, pen: 1, cs: [.019, .0049] },
  '14.5×114mm':        { k: .00030, pen: 5, cs: [.114, .0130] },
  '20×138mmB':         { k: .00035, pen: 5, cs: [.138, .0160] },
  '7.5×55mm Swiss':    { k: .00072, pen: 3, cs: [.055, .0063] },
  '4.73×33mm caseless':{ k: .00115, pen: 2, cs: [.033, .0040] },
  '5.56mm flechette':  { k: .00055, pen: 3, cs: [.045, .0048] },
  '13mm Gyrojet':      { k: .00250, pen: 1, cs: [.035, .0065] },
  '5.66mm MPS dart':   { k: .00500, pen: 2, cs: [.039, .0056] },
  '23×75mmR':          { k: .00550, pen: 1, cs: [.075, .0130], shell: true },
  '6.5mm CT':          { k: .00060, pen: 3, cs: [.051, .0062] },
  '5.45×18mm':         { k: .00200, pen: 2, cs: [.018, .0040] },
  '.38 Special':       { k: .00210, pen: 1, cs: [.029, .0048] },
  '6.8 SPC':           { k: .00100, pen: 2, cs: [.043, .0053] },
});
Object.assign(G.MASS, { '7×57mm': 11.2, '.351 WSL': 11.7, '9mm Glisenti': 8, '14.5×114mm': 64, '20×138mmB': 145, '7.5×55mm Swiss': 11.3, '4.73×33mm caseless': 3.2, '5.56mm flechette': .66, '13mm Gyrojet': 12, '5.66mm MPS dart': 20, '23×75mmR': 45, '6.5mm CT': 8.2, '5.45×18mm': 2.5, '.38 Special': 10.2, '6.8 SPC': 7.5 });

const W = G.WEAPONS, w = o => W.push(o);
const P = o => w(Object.assign(o, { proto: true }));

// ============================================================ WW1
w({ id:'mondragon', n:'Mondragón M1908', e:'ww1', c:'RIF', y:1908, co:'Mexico', cal:'7×57mm', act:'semi', modes:['semi'], rpm:120, mag:8, v:750, dmg:96, rec:[2.4,.7], rl:[2.6,3.2], acc:3.5, wt:4.18,
  m:{ t:'semiw', R:[.3,.066,.044], B:[.58,.0088], hg:['wfull',.48], stk:'rifle', grip:'st', mag:['box',.08,0,-.06], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:['bands','gas','lug'] }});
w({ id:'win1907', n:'Winchester Model 1907', e:'ww1', c:'CAR', y:1907, co:'United States', cal:'.351 WSL', act:'semi', modes:['semi','auto'], rpm:600, mag:15, v:570, dmg:48, rec:[1.1,.5], rl:[2.0,2.5], acc:4, wt:3.6,
  m:{ t:'semiw', R:[.24,.07,.042], B:[.51,.0085], hg:['wood',.26], stk:'rifle_pg', grip:'st', mag:['box',.12,0,-.06], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'villarperosa', n:'Villar-Perosa M1915', e:'ww1', c:'SMG', y:1915, co:'Kingdom of Italy', cal:'9mm Glisenti', act:'auto_ob', modes:['auto'], rpm:1500, mag:50, v:320, dmg:22, rec:[.7,.6], rl:[4.0,4.6], acc:9, wt:6.5, salvo:2,
  m:{ t:'smg', R:[.26,.06,.04], B:[.32,.008], hg:['none',0], stk:'none', grip:'pg_metal', mag:['top_curve',.13,.2,-.04], sgt:'rifle', bh:'side_r', mz:'crown', bip:1, mt:'blued', x:['twin_side'] }});
w({ id:'lp08', n:'Luger Artillery LP 08', e:'ww1', c:'PST', y:1913, co:'German Empire', cal:'9×19mm', act:'semi', modes:['semi'], rpm:320, mag:32, v:380, dmg:32, rec:[1.1,.5], rl:[2.8,3.2], acc:4, wt:1.06,
  m:{ t:'pistol', R:[.2,.03,.026], B:[.2,.0065], stk:'none', grip:'pst_raked', mag:['snail',.1,0,.04], sgt:'tall', bh:'toggle', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'glisenti', n:'Glisenti M1910', e:'ww1', c:'PST', y:1910, co:'Kingdom of Italy', cal:'9mm Glisenti', act:'semi', modes:['semi'], rpm:320, mag:7, v:320, dmg:26, rec:[1,.4], rl:[1.7,2.1], acc:6, wt:.82,
  m:{ t:'pistol', R:[.2,.034,.028], B:[.1,.006], stk:'none', grip:'pst_raked', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', wd:'wood_dark', mt:'blued', x:[] }});
w({ id:'sw1917', n:'S&W M1917 Revolver', e:'ww1', c:'PST', y:1917, co:'United States', cal:'.45 ACP', act:'rev', modes:['semi'], rpm:150, mag:6, v:250, dmg:40, rec:[1.7,.6], rl:[2.2,2.2], acc:6, wt:1.02,
  m:{ t:'rev', R:[.12,.052,.037], B:[.14,.007], stk:'none', grip:'rev_wood', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', wd:'wood', mt:'blued', x:['hammer'] }});
w({ id:'auto5', n:'Browning Auto-5', e:'ww1', c:'SG', y:1905, co:'Belgium', cal:'12 gauge', act:'semi', modes:['semi'], rpm:200, mag:5, v:400, dmg:15, pellets:9, rec:[2.8,.8], rl:[.55,.55], acc:38, wt:4.1, tubeLoad:true,
  m:{ t:'autosg', R:[.26,.09,.046], B:[.6,.011], hg:['wood',.22], stk:'rifle_pg', grip:'st', mag:['tube'], sgt:'bead', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:[] }});
P({ id:'farquhar', n:'Farquhar-Hill Rifle', e:'ww1', c:'RIF', y:1918, co:'United Kingdom', cal:'.303 British', act:'semi', modes:['semi'], rpm:150, mag:65, v:740, dmg:98, rec:[2.4,.7], rl:[4.6,5.2], acc:4, wt:6.7, blurb:'Gas-operated trials rifle fed from a 65-round spring drum.',
  m:{ t:'semiw', R:[.3,.07,.046], B:[.63,.009], hg:['wood',.4], stk:'rifle', grip:'st', mag:['drum',.08,0,-.07], sgt:'rifle', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:['gas','bands'] }});
P({ id:'huot', n:'Huot Automatic Rifle', e:'ww1', c:'LMG', y:1916, co:'Canada', cal:'.303 British', act:'auto', modes:['auto'], rpm:475, mag:25, v:740, dmg:52, rec:[1,.5], rl:[3.4,4.0], acc:4.5, wt:6.1, blurb:'Canadian conversion of the Ross rifle into a drum-fed LMG.',
  m:{ t:'lmg', R:[.34,.07,.05], B:[.64,.011], hg:['fin',.24,.02], stk:'rifle', grip:'st', mag:['drum',.075,0,-.02], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'blued', x:['gas'] }});
P({ id:'ribeyrolles', n:'Ribeyrolles 1918', e:'ww1', c:'AR', y:1918, co:'France', cal:'8mm Lebel', act:'auto_ob', modes:['auto','semi'], rpm:450, mag:25, v:600, dmg:48, rec:[1.3,.7], rl:[3.0,3.6], acc:5, wt:5.2, blurb:'Early "automatic carbine" chambered for a shortened Lebel.',
  m:{ t:'battle', R:[.32,.07,.046], B:[.45,.0095], hg:['wood',.28], stk:'rifle', grip:'pg_wood', mag:['curve',.18,.4,-.07], sgt:'rifle', bh:'side_r', mz:'crown', bip:1, wd:'wood', mt:'blued', x:[] }});

// ============================================================ WW2
w({ id:'g41', n:'Gewehr 41 (W)', e:'ww2', c:'RIF', y:1941, co:'Germany', cal:'7.92×57mm', act:'semi', modes:['semi'], rpm:130, mag:10, v:776, dmg:95, rec:[2.4,.7], rl:[3.0,3.6], acc:3.2, wt:5.0,
  m:{ t:'semiw', R:[.3,.066,.044], B:[.56,.009], hg:['wfull',.46], stk:'rifle', grip:'st', mag:['int'], sgt:'hood', bh:'side_r', mz:'comp', wd:'wood', mt:'blued', x:['gas','bands'] }});
w({ id:'m1c', n:'M1C Garand Sniper', e:'ww2', c:'SR', y:1944, co:'United States', cal:'.30-06', act:'semi', modes:['semi'], rpm:60, mag:8, v:853, dmg:98, rec:[2.1,.6], rl:[2.1,2.1], acc:1.6, wt:4.9, enbloc:true, defOptic:'m84',
  m:{ t:'semiw', R:[.28,.062,.042], B:[.61,.009], hg:['wood',.42], stk:'garand', grip:'st', mag:['int'], sgt:'peep', bh:'side_r', mz:'cone', wd:'wood', mt:'park', x:['gas'] }});
w({ id:'ppd40', n:'PPD-40', e:'ww2', c:'SMG', y:1940, co:'Soviet Union', cal:'7.62×25mm', act:'auto_ob', modes:['auto','semi'], rpm:800, mag:71, v:490, dmg:24, rec:[.5,.4], rl:[3.6,4.4], acc:8, wt:5.45,
  m:{ t:'smg', R:[.3,.05,.045], B:[.27,.0075], hg:['perf',.25,.022], stk:'rifle_short', grip:'st', mag:['drum',.08,0,-.07], sgt:'hood', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'lanchester', n:'Lanchester Mk 1*', e:'ww2', c:'SMG', y:1941, co:'United Kingdom', cal:'9×19mm', act:'auto_ob', modes:['auto'], rpm:600, mag:50, v:380, dmg:25, rec:[.5,.32], rl:[3.0,3.6], acc:7, wt:4.34,
  m:{ t:'smg', R:[.3,.045,.045], B:[.2,.0075], hg:['perf',.18,.02], stk:'rifle', grip:'st', mag:['sidebox_l',.3,0,-.05], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood', mt:'blued', x:['lug'] }});
w({ id:'reising', n:'Reising M50', e:'ww2', c:'SMG', y:1941, co:'United States', cal:'.45 ACP', act:'auto', modes:['auto','semi'], rpm:550, mag:20, v:280, dmg:30, rec:[.6,.35], rl:[2.3,2.9], acc:6, wt:3.1,
  m:{ t:'semiw', R:[.24,.05,.038], B:[.28,.0095], hg:['wood',.18], stk:'rifle', grip:'st', mag:['box',.16,0,-.06], sgt:'peep', bh:'side_r', mz:'cone', wd:'wood', mt:'park', x:['fins_thompson'] }});
w({ id:'zb26', n:'ZB vz. 26', e:'ww2', c:'LMG', y:1926, co:'Czechoslovakia', cal:'7.92×57mm', act:'auto_ob', modes:['auto','semi'], rpm:500, mag:30, v:762, dmg:52, rec:[.9,.4], rl:[2.8,3.4], acc:3.5, wt:9.65,
  m:{ t:'lmg', R:[.4,.075,.05], B:[.6,.011], hg:['fin',.22,.018], stk:'bren', grip:'pg', mag:['top_curve',.2,.1,-.05], sgt:'offset_l', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'blued', x:['carryhandle_bren','gas'] }});
w({ id:'breda30', n:'Breda M30', e:'ww2', c:'LMG', y:1930, co:'Italy', cal:'6.5×52mm', act:'auto', modes:['auto'], rpm:475, mag:20, v:620, dmg:48, rec:[.9,.45], rl:[3.6,4.2], acc:5, wt:10.2,
  m:{ t:'lmg', R:[.36,.08,.06], B:[.52,.011], hg:['fin',.14,.02], stk:'rifle_pg', grip:'pg_wood', mag:['int'], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'ptrd', n:'PTRD-41', e:'ww2', c:'SR', y:1941, co:'Soviet Union', cal:'14.5×114mm', act:'bolt', modes:['bolt'], rpm:10, mag:1, v:1012, dmg:260, rec:[4.4,1], rl:[2.4,2.4], acc:2.5, wt:17.3, cyc:1.0, heavy:true,
  m:{ t:'bolt', R:[.3,.08,.06], B:[1.35,.016], hg:['none',0], stk:'rifle_pg', grip:'pg_wood', mag:['int'], sgt:'offset_l', bh:'bolt', mz:'barrett', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'lahti', n:'Lahti L-39', e:'ww2', c:'SR', y:1939, co:'Finland', cal:'20×138mmB', act:'semi', modes:['semi'], rpm:30, mag:10, v:800, dmg:300, rec:[5,1.2], rl:[4.2,5.0], acc:3, wt:49.5, heavy:true,
  m:{ t:'lmg', R:[.5,.12,.08], B:[1.3,.02], hg:['perf',.6,.04], stk:'rifle_pg', grip:'pg', mag:['top_curve',.3,.05,-.05], sgt:'offset_l', bh:'side_r', mz:'barrett', bip:1, wd:'wood', mt:'blued', x:[] }});
w({ id:'liberator', n:'FP-45 Liberator', e:'ww2', c:'PST', y:1942, co:'United States', cal:'.45 ACP', act:'bolt', modes:['bolt'], rpm:10, mag:1, v:250, dmg:40, rec:[2.2,1], rl:[6.0,6.0], acc:30, wt:.45, cyc:2.2,
  m:{ t:'pistol', R:[.14,.04,.03], B:[.1,.007], stk:'none', grip:'pst', mag:['int'], sgt:'pst', bh:'cock_knob', mz:'crown', mt:'grey', x:[] }});
w({ id:'type94', n:'Nambu Type 94', e:'ww2', c:'PST', y:1934, co:'Empire of Japan', cal:'8×22mm Nambu', act:'semi', modes:['semi'], rpm:300, mag:6, v:305, dmg:24, rec:[1,.4], rl:[1.7,2.1], acc:7, wt:.72,
  m:{ t:'pistol', R:[.18,.034,.028], B:[.096,.006], stk:'none', grip:'pst', mag:['pst',.1], sgt:'pst', bh:'slide', mz:'crown', pl:'bakelite', mt:'blued', x:[] }});
P({ id:'mkb42', n:'MKb 42(H)', e:'ww2', c:'AR', y:1942, co:'Germany', cal:'7.92×33mm Kurz', act:'auto_ob', modes:['auto','semi'], rpm:500, mag:30, v:685, dmg:40, rec:[1,.5], rl:[2.7,3.3], acc:5, wt:4.9, blurb:'Haenel field-trials predecessor of the StG 44, fired from an open bolt.',
  m:{ t:'ak', R:[.34,.075,.048], B:[.36,.0085], hg:['stg',.18], stk:'stg', grip:'stg', mag:['curve',.25,.25,-.07], sgt:'hood', bh:'side_l', mz:'crown', wd:'wood', mt:'park', x:['gas','bayo_spike'] }});
P({ id:'stg45', n:'StG 45(M)', e:'ww2', c:'AR', y:1945, co:'Germany', cal:'7.92×33mm Kurz', act:'auto', modes:['auto','semi'], rpm:450, mag:30, v:680, dmg:40, rec:[.95,.45], rl:[2.6,3.2], acc:4.5, wt:3.6, blurb:'Roller-delayed Mauser design; ancestor of the CETME and G3.',
  m:{ t:'battle', R:[.3,.072,.046], B:[.4,.0085], hg:['g3',.2], stk:'rifle', grip:'pg_wood', mag:['curve',.25,.25,-.07], sgt:'hood', bh:'hk', mz:'crown', wd:'wood', mt:'park', x:['cocking_tube'] }});
P({ id:'vg15', n:'Volkssturmgewehr VG 1-5', e:'ww2', c:'RIF', y:1945, co:'Germany', cal:'7.92×33mm Kurz', act:'semi', modes:['semi'], rpm:120, mag:30, v:650, dmg:42, rec:[1.1,.5], rl:[2.6,3.2], acc:5, wt:4.5, blurb:'Last-ditch gas-delayed stamped rifle made at the end of the war.',
  m:{ t:'semiw', R:[.26,.066,.044], B:[.38,.0085], hg:['wood',.18], stk:'carbine', grip:'st', mag:['curve',.25,.25,-.07], sgt:'hood', bh:'side_r', mz:'crown', wd:'wood_dark', mt:'park', x:[] }});
P({ id:'t20e2', n:'T20E2 (select-fire Garand)', e:'ww2', c:'BR', y:1944, co:'United States', cal:'.30-06', act:'auto', modes:['semi','auto'], rpm:700, mag:20, v:853, dmg:58, rec:[1.7,.8], rl:[2.4,3.0], acc:2.8, wt:4.6, blurb:'Garand converted to box-magazine select fire; led to the M14.',
  m:{ t:'semiw', R:[.3,.07,.042], B:[.56,.009], hg:['wood_top',.36], stk:'garand', grip:'st', mag:['box',.13,0,-.08], sgt:'peep', bh:'side_r', mz:'m14', bip:1, wd:'wood', mt:'park', x:['gas','lug'] }});

// ============================================================ COLD WAR
w({ id:'fnc', n:'FN FNC', e:'cold', c:'AR', y:1979, co:'Belgium', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:700, mag:30, v:965, dmg:30, rec:[.5,.32], rl:[2.3,2.9], acc:3, wt:3.8,
  m:{ t:'ak', R:[.3,.072,.045], B:[.45,.0085], hg:['ak_poly',.22], stk:'side_fold', grip:'ak_poly', mag:['curve',.19,.15,-.07], sgt:'peep', bh:'ak', mz:'bird', pl:'black', mt:'black', x:['gas'] }});
w({ id:'hk33', n:'H&K HK33', e:'cold', c:'AR', y:1968, co:'West Germany', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:750, mag:30, v:920, dmg:30, rec:[.55,.35], rl:[2.5,3.1], acc:3, wt:3.65,
  m:{ t:'battle', R:[.32,.075,.045], B:[.39,.0085], hg:['g3',.23], stk:'g3', grip:'hk', mag:['curve',.19,.15,-.06], sgt:'drum_hk', bh:'hk', mz:'bird', pl:'black', mt:'black', x:['claw'] }});
w({ id:'ar18', n:'ArmaLite AR-18', e:'cold', c:'AR', y:1963, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:990, dmg:30, rec:[.6,.4], rl:[2.3,2.9], acc:3.2, wt:3.0,
  m:{ t:'battle', R:[.32,.075,.04], B:[.46,.0085], hg:['poly',.24], stk:'side_fold', grip:'pg', mag:['box',.13,0,-.06], sgt:'peep', bh:'side_r', mz:'bird', pl:'black', mt:'park', x:['gas'] }});
w({ id:'sig510', n:'SIG SG 510-4', e:'cold', c:'BR', y:1957, co:'Switzerland', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:500, mag:20, v:790, dmg:57, rec:[1.3,.6], rl:[2.6,3.2], acc:2, wt:4.25,
  m:{ t:'battle', R:[.36,.075,.046], B:[.5,.0095], hg:['wood',.25], stk:'fal', grip:'pg_wood', mag:['box',.15,0,-.07], sgt:'peep', bh:'side_r', mz:'brake', bip:1, wd:'wood', mt:'black', x:['cocking_tube'] }});
w({ id:'ssg69', n:'Steyr SSG 69', e:'cold', c:'SR', y:1969, co:'Austria', cal:'7.62×51mm', act:'bolt', modes:['bolt'], rpm:40, mag:5, v:860, dmg:115, rec:[1.9,.4], rl:[2.4,3.0], acc:.7, wt:3.9, cyc:.65, defOptic:'redfield',
  m:{ t:'bolt', R:[.24,.06,.042], B:[.65,.0105], hg:['poly_sporter',.38], stk:'sporter', grip:'pg_poly', mag:['box',.05,0,-.04], sgt:'none', bh:'bolt', mz:'crown', pl:'green', mt:'black', x:['rail_bolt'] }});
w({ id:'wa2000', n:'Walther WA 2000', e:'cold', c:'DMR', y:1982, co:'West Germany', cal:'.300 Win Mag', act:'semi', modes:['semi'], rpm:40, mag:6, v:880, dmg:120, rec:[2,.5], rl:[2.8,3.4], acc:.5, wt:6.95, defOptic:'redfield',
  m:{ t:'bullpup', R:[.58,.12,.06], B:[.65,.012], hg:['none',0], stk:'mdr', grip:'thumbhole', mag:['box',.09,0,.1], sgt:'none', bh:'side_r', mz:'brake', bip:1, wd:'wood', mt:'black', x:['railT'] }});
w({ id:'m12', n:'Beretta M12', e:'cold', c:'SMG', y:1959, co:'Italy', cal:'9×19mm', act:'auto_ob', modes:['auto','semi'], rpm:550, mag:32, v:380, dmg:25, rec:[.42,.3], rl:[2.1,2.6], acc:7, wt:3.0,
  m:{ t:'smg', R:[.26,.07,.045], B:[.2,.0075], hg:['none',0], stk:'side_fold', grip:'pg', mag:['box',.2,0,-.05], sgt:'peep', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['frontgrip'] }});
w({ id:'mat49', n:'MAT-49', e:'cold', c:'SMG', y:1949, co:'France', cal:'9×19mm', act:'auto_ob', modes:['auto'], rpm:600, mag:32, v:390, dmg:25, rec:[.45,.3], rl:[2.2,2.8], acc:8, wt:3.5,
  m:{ t:'smg', R:[.28,.05,.045], B:[.23,.0075], hg:['perf',.18,.02], stk:'wire', grip:'pg_metal', mag:['box',.2,0,-.06], sgt:'peep', bh:'side_l', mz:'crown', mt:'park', x:[] }});
w({ id:'m45', n:'Carl Gustaf m/45', e:'cold', c:'SMG', y:1945, co:'Sweden', cal:'9×19mm', act:'auto_ob', modes:['auto'], rpm:600, mag:36, v:410, dmg:25, rec:[.45,.3], rl:[2.3,2.9], acc:7, wt:3.35,
  m:{ t:'smg', R:[.3,.045,.045], B:[.21,.0075], hg:['perf',.2,.022], stk:'side_fold', grip:'pg_metal', mag:['box',.24,0,-.06], sgt:'hood', bh:'side_r', mz:'crown', mt:'park', x:[] }});
w({ id:'ks23', n:'KS-23', e:'cold', c:'SG', y:1971, co:'Soviet Union', cal:'23×75mmR', act:'pump', modes:['pump'], rpm:60, mag:3, v:300, dmg:26, pellets:10, rec:[4,1.1], rl:[.8,.8], acc:50, wt:3.85, cyc:.6, tubeLoad:true,
  m:{ t:'pump', R:[.26,.09,.055], B:[.51,.017], hg:['pump',.2], stk:'rifle', grip:'pg_wood', mag:['tube'], sgt:'ghost', bh:'pump', mz:'crown', wd:'wood', mt:'blued', x:[] }});
w({ id:'m500', n:'Mossberg 500', e:'cold', c:'SG', y:1961, co:'United States', cal:'12 gauge', act:'pump', modes:['pump'], rpm:80, mag:6, v:400, dmg:15, pellets:9, rec:[2.9,.8], rl:[.5,.5], acc:40, wt:3.2, cyc:.45, tubeLoad:true,
  m:{ t:'pump', R:[.23,.07,.044], B:[.47,.011], hg:['pump_ribbed',.2], stk:'poly_sg', grip:'st', mag:['tube'], sgt:'bead', bh:'pump', mz:'crown', pl:'black', mt:'park', x:[] }});
w({ id:'aa52', n:'AA-52', e:'cold', c:'LMG', y:1952, co:'France', cal:'7.62×51mm', act:'auto', modes:['auto'], rpm:900, mag:50, v:840, dmg:56, rec:[1.1,.6], rl:[4.6,5.4], acc:5, wt:9.97, heavy:true,
  m:{ t:'mg', R:[.36,.08,.05], B:[.5,.012], hg:['none',0], stk:'wire', grip:'pg', mag:['beltdrum',.08], sgt:'rifle', bh:'side_r', mz:'cone', bip:1, mt:'park', x:['carry_m60'] }});
w({ id:'beretta93r', n:'Beretta 93R', e:'cold', c:'PST', y:1979, co:'Italy', cal:'9×19mm', act:'auto', modes:['burst3','semi'], rpm:1100, mag:20, v:375, dmg:26, rec:[.9,.45], rl:[1.6,2.0], acc:4.5, wt:1.12,
  m:{ t:'pistol', R:[.24,.036,.031], B:[.156,.006], stk:'none', grip:'pst', mag:['pst',.15], sgt:'pst', bh:'slide_open', mz:'crown', pl:'black', mt:'black', x:['hammer','frontgrip'] }});
w({ id:'psm', n:'PSM', e:'cold', c:'PST', y:1973, co:'Soviet Union', cal:'5.45×18mm', act:'semi', modes:['semi'], rpm:340, mag:8, v:315, dmg:20, rec:[.6,.3], rl:[1.4,1.8], acc:5, wt:.46,
  m:{ t:'pistol', R:[.155,.028,.022], B:[.085,.005], stk:'none', grip:'pst', mag:['pst',.1], sgt:'pst', bh:'slide', mz:'crown', mt:'stainless', x:[] }});
w({ id:'walther_p5', n:'Walther P5', e:'cold', c:'PST', y:1979, co:'West Germany', cal:'9×19mm', act:'semi', modes:['semi'], rpm:340, mag:8, v:350, dmg:26, rec:[1,.4], rl:[1.5,1.9], acc:4.5, wt:.8,
  m:{ t:'pistol', R:[.18,.035,.03], B:[.09,.006], stk:'none', grip:'pst', mag:['pst',.11], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['hammer'] }});
P({ id:'spiw', n:'AAI XM19 SPIW', e:'cold', c:'AR', y:1966, co:'United States', cal:'5.56mm flechette', act:'auto', modes:['burst3','semi'], rpm:2400, mag:60, v:1400, dmg:26, rec:[.35,.2], rl:[3.0,3.6], acc:4, wt:4.8, blurb:'Special Purpose Individual Weapon: fired single steel flechettes at 1,400 m/s.',
  m:{ t:'bullpup', R:[.5,.1,.055], B:[.45,.008], hg:['none',0], stk:'famas', grip:'famas', mag:['box',.14,0,.1], sgt:'famas', bh:'side_r', mz:'cone', pl:'od', mt:'park', x:['famas_handle','oicw_gl'] }});
P({ id:'gyrojet', n:'MBA Gyrojet Mk I', e:'cold', c:'PST', y:1965, co:'United States', cal:'13mm Gyrojet', act:'semi', modes:['semi'], rpm:120, mag:6, v:30, dmg:40, rec:[.25,.1], rl:[3.2,3.2], acc:10, wt:.62, gyro:{ v:380, burn:.12 }, caseless:true, blurb:'Fires tiny rockets: weak at the muzzle, fastest about 20 m out.',
  m:{ t:'pistol', R:[.22,.04,.03], B:[.12,.0072], stk:'none', grip:'pst', mag:['int'], sgt:'pst', bh:'hammer_only', mz:'crown', pl:'bakelite', mt:'stainless', x:['gyro'] }});
P({ id:'tkb059', n:'TKB-059 (salvo rifle)', e:'cold', c:'AR', y:1962, co:'Soviet Union', cal:'7.62×39mm', act:'auto', modes:['semi','auto'], rpm:450, mag:45, v:715, dmg:40, rec:[1.5,.6], rl:[3.6,4.2], acc:5, wt:3.4, salvo:3, blurb:'Three barrels fire together, putting a 3-round salvo out before recoil moves the gun.',
  m:{ t:'bullpup', R:[.46,.1,.07], B:[.4,.0085], hg:['none',0], stk:'famas', grip:'famas', mag:['box_clear',.16,0,.1], sgt:'ak', bh:'side_r', mz:'crown', pl:'bakelite', mt:'blued', x:['triple'] }});
P({ id:'tkb022', n:'TKB-022PM', e:'cold', c:'AR', y:1965, co:'Soviet Union', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:600, mag:30, v:720, dmg:40, rec:[.95,.55], rl:[2.4,3.0], acc:4.5, wt:2.4, blurb:'Plastic-bodied Korobov bullpup that ejected forward.',
  m:{ t:'bullpup', R:[.5,.1,.05], B:[.38,.0085], hg:['none',0], stk:'qbz', grip:'qbz', mag:['curve',.21,.45,.1], sgt:'qbz_handle', bh:'side_r', mz:'crown', pl:'plum', mt:'blued', x:[] }});
P({ id:'t44', n:'T44E4 (M14 prototype)', e:'cold', c:'BR', y:1954, co:'United States', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:750, mag:20, v:853, dmg:58, rec:[1.55,.75], rl:[2.5,3.1], acc:2.4, wt:4.3, blurb:'Springfield Armory trials rifle, adopted as the M14.',
  m:{ t:'semiw', R:[.3,.07,.042], B:[.56,.009], hg:['wood_top',.36], stk:'garand', grip:'st', mag:['box',.13,0,-.08], sgt:'peep', bh:'side_r', mz:'crown', wd:'wood_dark', mt:'park', x:['gas','lug'] }});
P({ id:'ao63', n:'AO-63 (twin barrel)', e:'cold', c:'AR', y:1986, co:'Soviet Union', cal:'5.45×39mm', act:'auto', modes:['burst2','auto','semi'], rpm:850, burstRpm:6000, mag:30, v:900, dmg:31, rec:[.6,.35], rl:[2.5,3.1], acc:3, wt:3.9, salvo:2, blurb:'Over-under double-barrel rifle that fires a 2-round salvo at 6,000 rpm.',
  m:{ t:'ak', R:[.32,.075,.045], B:[.42,.0085], hg:['ak_poly',.22], stk:'ak_side', grip:'ak_poly', mag:['curve',.2,.35,-.07], sgt:'ak', bh:'ak', mz:'crown', pl:'black', mt:'black', x:['twin_over','dust'] }});

// ============================================================ MODERN
w({ id:'groza', n:'OTs-14 Groza', e:'mod', c:'CAR', y:1994, co:'Russia', cal:'9×39mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:300, dmg:52, rec:[.7,.45], rl:[2.4,3.0], acc:3.5, wt:2.7,
  m:{ t:'bullpup', R:[.4,.1,.05], B:[.24,.0085], hg:['none',0], stk:'qbz', grip:'qbz', mag:['box',.14,.05,.1], sgt:'qbz_handle', bh:'side_r', mz:'sup_slx', pl:'black', mt:'black', x:[] }});
w({ id:'ak107', n:'AK-107', e:'mod', c:'AR', y:1999, co:'Russia', cal:'5.45×39mm', act:'auto', modes:['auto','burst3','semi'], rpm:850, mag:30, v:900, dmg:31, rec:[.38,.25], rl:[2.3,2.9], acc:3, wt:3.8,
  m:{ t:'ak', R:[.3,.075,.045], B:[.415,.0085], hg:['ak_poly',.22], stk:'ak_side', grip:'ak_poly', mag:['curve',.20,.35,-.07], sgt:'ak', bh:'ak', mz:'ak74', pl:'black', mt:'black', x:['gas','dust','siderail'] }});
w({ id:'a91', n:'9A-91', e:'mod', c:'CAR', y:1994, co:'Russia', cal:'9×39mm', act:'auto', modes:['auto','semi'], rpm:750, mag:20, v:270, dmg:52, rec:[.75,.5], rl:[2.2,2.8], acc:4.5, wt:2.1,
  m:{ t:'ak', R:[.26,.07,.042], B:[.2,.0085], hg:['ak_poly',.12], stk:'top_fold', grip:'ak_poly', mag:['box',.14,.05,-.06], sgt:'ak', bh:'ak', mz:'crown', pl:'black', mt:'black', x:['dust'] }});
w({ id:'famasg2', n:'FAMAS G2', e:'mod', c:'AR', y:1994, co:'France', cal:'5.56×45mm', act:'auto', modes:['auto','burst3','semi'], rpm:1000, mag:30, v:925, dmg:30, rec:[.6,.4], rl:[2.4,2.9], acc:3, wt:3.8,
  m:{ t:'bullpup', R:[.46,.09,.045], B:[.49,.0085], hg:['none',0], stk:'famas', grip:'famas', mag:['curve',.19,.15,.10], sgt:'famas', bh:'famas', mz:'bird', bip:1, pl:'black', mt:'black', x:['famas_handle','tavor_guard'] }});
w({ id:'augA3', n:'Steyr AUG A3', e:'mod', c:'AR', y:2005, co:'Austria', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:940, dmg:30, rec:[.52,.34], rl:[2.8,3.3], acc:2.8, wt:3.6,
  m:{ t:'bullpup', R:[.46,.09,.05], B:[.42,.0085], hg:['none',0], stk:'aug', grip:'aug', mag:['box_clear',.18,.15,.10], sgt:'flat', bh:'side_l', mz:'bird', pl:'black', mt:'black', x:['aug_fold','railT'] }});
w({ id:'kedr', n:'PP-91 Kedr', e:'mod', c:'SMG', y:1994, co:'Russia', cal:'9×18mm', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:310, dmg:23, rec:[.4,.35], rl:[1.8,2.3], acc:7, wt:1.57,
  m:{ t:'smg', R:[.22,.07,.036], B:[.12,.0075], hg:['none',0], stk:'top_fold', grip:'magwell', mag:['box',.2,0,.02], sgt:'pst', bh:'side_both', mz:'crown', pl:'black', mt:'black', x:[] }});
w({ id:'mateba', n:'Mateba Autorevolver 6 Unica', e:'mod', c:'PST', y:1997, co:'Italy', cal:'.357 Magnum', act:'rev', modes:['semi'], rpm:200, mag:6, v:430, dmg:50, rec:[1.3,.5], rl:[2.4,2.4], acc:3, wt:1.3,
  m:{ t:'rev', R:[.14,.06,.038], B:[.15,.0065], stk:'none', grip:'rev', mag:['cyl'], sgt:'pst', bh:'none', mz:'crown', pl:'black', mt:'stainless', x:['low_bore','vent_rib'] }});
w({ id:'neostead', n:'Neostead 2000', e:'mod', c:'SG', y:2001, co:'South Africa', cal:'12 gauge', act:'pump', modes:['pump'], rpm:90, mag:12, v:400, dmg:15, pellets:9, rec:[2.8,.8], rl:[.5,.5], acc:38, wt:3.9, cyc:.4, tubeLoad:true,
  m:{ t:'bullpup', R:[.46,.1,.06], B:[.57,.012], hg:['pump_bp',.18], stk:'ksg', grip:'ksg', mag:['tube2'], sgt:'flat', bh:'pump', mz:'crown', pl:'black', mt:'black', x:['carry_saw'] }});
w({ id:'usas12', n:'Daewoo USAS-12', e:'mod', c:'SG', y:1990, co:'South Korea', cal:'12 gauge', act:'auto', modes:['auto','semi'], rpm:360, mag:10, v:400, dmg:15, pellets:9, rec:[2.4,.9], rl:[2.8,3.4], acc:38, wt:5.5,
  m:{ t:'ar', R:[.36,.09,.05], B:[.46,.012], hg:['poly',.2], stk:'ar_a2', grip:'ar', mag:['box',.18,0,-.07], sgt:'handle', bh:'ar', mz:'crown', pl:'black', mt:'black', x:[] }});
P({ id:'g11', n:'H&K G11 K2', e:'mod', c:'AR', y:1990, co:'Germany', cal:'4.73×33mm caseless', act:'auto', modes:['burst3','auto','semi'], rpm:460, burstRpm:2100, mag:45, v:930, dmg:26, rec:[.45,.3], rl:[2.4,2.9], acc:2.2, wt:3.8, caseless:true, hyper:true, defOptic:'g11_optic', blurb:'Caseless ammunition and a 2,100 rpm hyperburst: all three rounds leave before the recoil reaches you.',
  m:{ t:'bullpup', R:[.75,.1,.05], B:[.05,.008], hg:['none',0], stk:'g11', grip:'g11', mag:['top_long',.34], sgt:'none', bh:'crank', mz:'crown', pl:'black', mt:'black', x:['g11body'] }});
P({ id:'steyracr', n:'Steyr ACR', e:'mod', c:'AR', y:1989, co:'Austria', cal:'5.56mm flechette', act:'auto', modes:['auto','burst3','semi'], rpm:1200, mag:24, v:1500, dmg:26, rec:[.3,.2], rl:[2.8,3.3], acc:2.5, wt:3.23, blurb:'US Advanced Combat Rifle entrant firing plastic-cased flechettes at 1,500 m/s.',
  m:{ t:'bullpup', R:[.52,.1,.05], B:[.5,.0075], hg:['none',0], stk:'aug', grip:'aug', mag:['box_clear',.16,0,.10], sgt:'aug_scope', bh:'side_l', mz:'cone', pl:'green', mt:'black', x:[] }});
P({ id:'coltacr', n:'Colt ACR (duplex)', e:'mod', c:'AR', y:1989, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:900, dmg:22, pellets:2, rec:[.55,.35], rl:[2.1,2.7], acc:3, wt:3.4, duplex:true, blurb:'Fired duplex cartridges: two stacked bullets per round.',
  m:{ t:'ar', R:[.3,.08,.036], B:[.53,.0085], hg:['ar_round',.3], stk:'ar_coll', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'handle', bh:'ar', mz:'brake', pl:'black', mt:'park', x:['fa'] }});
P({ id:'aaiacr', n:'AAI ACR', e:'mod', c:'AR', y:1989, co:'United States', cal:'5.56mm flechette', act:'auto', modes:['auto','burst3','semi'], rpm:650, mag:30, v:1400, dmg:26, rec:[.3,.2], rl:[2.4,3.0], acc:2.8, wt:3.5, blurb:'Flechette ACR entrant with a distinctive ribbed handguard.',
  m:{ t:'ar', R:[.34,.085,.04], B:[.5,.008], hg:['mp5',.3], stk:'ar_coll', grip:'ar', mag:['box',.17,0,-.06], sgt:'handle', bh:'ar', mz:'cone', pl:'black', mt:'black', x:[] }});
P({ id:'xm8', n:'H&K XM8', e:'mod', c:'CAR', y:2004, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:880, dmg:29, rec:[.5,.32], rl:[2.3,2.8], acc:2.8, wt:2.8, defOptic:'reddot', blurb:'Cancelled US carbine program built on G36 internals.',
  m:{ t:'scar', R:[.4,.1,.05], B:[.32,.0085], hg:['vector',.2], stk:'g36', grip:'g36', mag:['box_clear',.19,.15,-.06], sgt:'flat', bh:'g36', mz:'bird', pl:'tan', mt:'black', x:['railT'] }});
P({ id:'xm29', n:'XM29 OICW', e:'mod', c:'AR', y:2000, co:'United States', cal:'5.56×45mm', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:840, dmg:28, rec:[.5,.35], rl:[2.6,3.2], acc:3, wt:8.2, heavy:true, defOptic:'acog', blurb:'Objective Individual Combat Weapon: a 5.56 carbine under a 20 mm airburst launcher.',
  m:{ t:'bullpup', R:[.5,.1,.06], B:[.25,.0085], hg:['none',0], stk:'p90', grip:'p90', mag:['curve',.19,.15,.0], sgt:'flat', bh:'side_l', mz:'bird', pl:'od', mt:'black', x:['oicw_gl','railT'] }});
P({ id:'caws', n:'H&K CAWS', e:'mod', c:'SG', y:1983, co:'West Germany', cal:'12 gauge', act:'auto', modes:['semi','burst3'], rpm:240, mag:10, v:580, dmg:14, pellets:8, rec:[1.8,.6], rl:[2.8,3.4], acc:30, wt:4.3, blurb:'Close Assault Weapon System: belted brass shells fired as flechette or tungsten shot.',
  m:{ t:'bullpup', R:[.5,.1,.055], B:[.46,.013], hg:['none',0], stk:'aug', grip:'aug', mag:['box',.14,0,.1], sgt:'g36_handle', bh:'side_l', mz:'cone', pl:'black', mt:'black', x:['famas_handle'] }});
P({ id:'jackhammer', n:'Pancor Jackhammer', e:'mod', c:'SG', y:1987, co:'United States', cal:'12 gauge', act:'auto', modes:['auto','semi'], rpm:240, mag:10, v:400, dmg:15, pellets:9, rec:[2,.7], rl:[3.0,3.6], acc:38, wt:4.57, blurb:'Gas-driven revolving cylinder "ammo cassette" in a bullpup shell.',
  m:{ t:'bullpup', R:[.5,.1,.06], B:[.4,.012], hg:['none',0], stk:'ksg', grip:'ksg', mag:['cassette',.08,0,.12], sgt:'famas', bh:'pump', mz:'crown', pl:'green', mt:'black', x:['famas_handle'] }});

// ============================================================ PRESENT
w({ id:'ak19', n:'AK-19', e:'now', c:'AR', y:2020, co:'Russia', cal:'5.56×45mm', act:'auto', modes:['auto','burst2','semi'], rpm:700, mag:30, v:880, dmg:30, rec:[.55,.35], rl:[2.3,2.9], acc:2.8, wt:3.5,
  m:{ t:'ak', R:[.30,.075,.045], B:[.415,.0085], hg:['ak12',.23], stk:'ak12', grip:'ak_poly', mag:['curve',.19,.15,-.07], sgt:'flat', bh:'ak', mz:'ak12', pl:'black', mt:'black', x:['gas','railT','dust_rail'] }});
w({ id:'ak203', n:'AK-203', e:'now', c:'AR', y:2019, co:'Russia', cal:'7.62×39mm', act:'auto', modes:['auto','semi'], rpm:700, mag:30, v:715, dmg:40, rec:[.95,.5], rl:[2.3,2.9], acc:3.2, wt:3.8,
  m:{ t:'ak', R:[.30,.075,.045], B:[.415,.0085], hg:['ak_poly',.22], stk:'ak_side', grip:'ak_poly', mag:['curve',.21,.5,-.07], sgt:'ak', bh:'ak', mz:'slant', pl:'black', mt:'black', x:['gas','dust','railT'] }});
w({ id:'arad', n:'IWI Arad 7', e:'now', c:'BR', y:2019, co:'Israel', cal:'7.62×51mm', act:'auto', modes:['semi','auto'], rpm:650, mag:20, v:800, dmg:57, rec:[1.25,.55], rl:[2.3,2.9], acc:1.8, wt:3.9,
  m:{ t:'scar', R:[.38,.095,.047], B:[.4,.0095], hg:['mlok',.24], stk:'scar', grip:'ar', mag:['box',.15,0,-.07], sgt:'flat', bh:'side_both', mz:'a2', pl:'fde', mt:'black', x:['railT'] }});
w({ id:'scarsc', n:'FN SCAR-SC', e:'now', c:'CAR', y:2019, co:'Belgium', cal:'.300 BLK', act:'auto', modes:['auto','semi'], rpm:650, mag:30, v:620, dmg:36, rec:[.6,.4], rl:[2.1,2.7], acc:3, wt:2.95,
  m:{ t:'scar', R:[.34,.09,.045], B:[.19,.0085], hg:['scar',.14], stk:'bren2', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'side_l', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
w({ id:'rec7', n:'Barrett REC7', e:'now', c:'CAR', y:2010, co:'United States', cal:'6.8 SPC', act:'auto', modes:['auto','semi'], rpm:750, mag:30, v:810, dmg:34, rec:[.62,.4], rl:[2.0,2.6], acc:2.5, wt:3.1,
  m:{ t:'ar', R:[.30,.08,.036], B:[.41,.0088], hg:['quad',.26], stk:'ar_coll', grip:'ar', mag:['curve',.19,.15,-.06], sgt:'flat', bh:'ar', mz:'a2', pl:'black', mt:'black', x:['fa','railT'] }});
w({ id:'svl', n:'Lobaev SVL', e:'now', c:'SR', y:2013, co:'Russia', cal:'.408 CheyTac', act:'bolt', modes:['bolt'], rpm:25, mag:5, v:900, dmg:200, rec:[2.8,.6], rl:[3.0,3.6], acc:.3, wt:9.5, cyc:.95, heavy:true, defOptic:'nxs',
  m:{ t:'precision', R:[.32,.085,.06], B:[.8,.015], hg:['mlok_long',.46], stk:'ai', grip:'thumbhole', mag:['box',.1,0,-.05], sgt:'none', bh:'bolt', mz:'brake', bip:1, pl:'black', mt:'black', x:['railT'] }});
w({ id:'vp9', n:'H&K VP9', e:'now', c:'PST', y:2014, co:'Germany', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:15, v:360, dmg:26, rec:[.9,.4], rl:[1.4,1.8], acc:3.8, wt:.72,
  m:{ t:'pistol', R:[.187,.034,.031], B:[.104,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['railP'] }});
w({ id:'glock45', n:'Glock 45', e:'now', c:'PST', y:2018, co:'Austria', cal:'9×19mm', act:'semi', modes:['semi'], rpm:360, mag:17, v:360, dmg:26, rec:[.9,.4], rl:[1.4,1.8], acc:4, wt:.7,
  m:{ t:'pistol', R:[.187,.032,.03], B:[.102,.006], stk:'none', grip:'pst_poly', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'black', mt:'black', x:['railP'] }});
w({ id:'m1911c', n:'Colt M45A1 CQBP', e:'now', c:'PST', y:2012, co:'United States', cal:'.45 ACP', act:'semi', modes:['semi'], rpm:300, mag:7, v:253, dmg:40, rec:[1.5,.55], rl:[1.6,2.0], acc:3.5, wt:1.1,
  m:{ t:'pistol', R:[.21,.035,.029], B:[.127,.0065], stk:'none', grip:'pst', mag:['pst',.12], sgt:'pst', bh:'slide', mz:'crown', pl:'tan', mt:'fde', x:['hammer','railP'] }});
w({ id:'mp155', n:'Kalashnikov MP-155 Ultima', e:'now', c:'SG', y:2019, co:'Russia', cal:'12 gauge', act:'semi', modes:['semi'], rpm:250, mag:6, v:400, dmg:15, pellets:9, rec:[2.6,.8], rl:[.5,.5], acc:36, wt:3.4, tubeLoad:true,
  m:{ t:'autosg', R:[.26,.08,.046], B:[.66,.011], hg:['poly',.24], stk:'mcx', grip:'pg', mag:['tube'], sgt:'flat', bh:'side_r', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
P({ id:'lsat', n:'Textron LSAT LMG', e:'now', c:'LMG', y:2012, co:'United States', cal:'6.5mm CT', act:'auto_ob', modes:['auto'], rpm:650, mag:100, v:850, dmg:50, rec:[.8,.4], rl:[4.6,5.4], acc:3.2, wt:4.2, heavy:true, caseless:false, blurb:'Lightweight belt-fed LMG firing cased-telescoped rounds, ejected forward and down.',
  m:{ t:'mg', R:[.42,.1,.055], B:[.43,.011], hg:['mlok',.28], stk:'mcx', grip:'ar', mag:['beltpouch',.15], sgt:'flat', bh:'side_l', mz:'bird', bip:1, pl:'od', mt:'black', x:['railT','carry_saw'] }});
P({ id:'rm277', n:'GD-OTS RM277', e:'now', c:'AR', y:2019, co:'United States', cal:'6.8×51mm', act:'auto', modes:['auto','semi'], rpm:700, mag:20, v:900, dmg:58, rec:[1.1,.5], rl:[2.6,3.1], acc:1.6, wt:4.1, defOptic:'xm157', blurb:'Bullpup NGSW entrant built around polymer-cased 6.8 mm ammunition.',
  m:{ t:'bullpup', R:[.5,.11,.06], B:[.35,.0095], hg:['mlok_short',.16], stk:'mdr', grip:'x95', mag:['box',.14,0,.11], sgt:'flat', bh:'side_l', mz:'sup_slx', pl:'coyote', mt:'black', x:['railT'] }});
P({ id:'rpl20', n:'Kalashnikov RPL-20', e:'now', c:'LMG', y:2020, co:'Russia', cal:'5.45×39mm', act:'auto_ob', modes:['auto'], rpm:750, mag:100, v:900, dmg:31, rec:[.55,.35], rl:[4.6,5.4], acc:3.2, wt:5.5, blurb:'Belt-fed light machine gun trialled for the Russian army.',
  m:{ t:'mg', R:[.4,.09,.052], B:[.48,.011], hg:['ak12',.26], stk:'ak12', grip:'ak_poly', mag:['beltbox',.14], sgt:'flat', bh:'side_r', mz:'ak12', bip:1, pl:'black', mt:'black', x:['railT'] }});
P({ id:'kacpdw', n:'KAC PDW', e:'now', c:'SMG', y:2006, co:'United States', cal:'6.8 SPC', act:'auto', modes:['auto','semi'], rpm:900, mag:30, v:600, dmg:30, rec:[.5,.35], rl:[1.9,2.4], acc:4, wt:2.0, blurb:'Knight\'s Armament personal defence weapon firing a 6×35 mm round.',
  m:{ t:'ar', R:[.27,.08,.036], B:[.2,.0075], hg:['quad',.14], stk:'side_fold', grip:'ar', mag:['curve',.17,.2,-.05], sgt:'flat', bh:'ar', mz:'crown', pl:'black', mt:'black', x:['railT'] }});
P({ id:'aps_uw', n:'APS Underwater Rifle', e:'cold', c:'AR', y:1975, co:'Soviet Union', cal:'5.66mm MPS dart', act:'auto', modes:['auto','semi'], rpm:600, mag:26, v:365, dmg:36, rec:[.6,.4], rl:[2.6,3.2], acc:6, wt:2.46, blurb:'Fires 120 mm steel darts meant for use underwater; weak and inaccurate in air.',
  m:{ t:'smg', R:[.35,.06,.04], B:[.3,.0085], hg:['none',0], stk:'wire', grip:'pg_metal', mag:['box',.22,.05,-.07], sgt:'peep', bh:'side_r', mz:'crown', mt:'park', x:[] }});

// ============================================================ optics for new weapons
const A = G.ATTACH, a = o => A.push(o);
a({ id:'g11_optic', slot:'optic', n:'G11 integral 1× optic', e0:3, only:['g11'], s:{ zoom:1.4, ret:'ring', ads:1.05 }, d:'Unmagnified integral optic built into the carry handle.' });
const extend = (id, ids) => { const at = A.find(x => x.id === id); if (at && at.only) at.only.push(...ids); };
extend('zf39', ['g41', 'mkb42', 'stg45']); extend('pu', ['ppd40']); extend('m84', ['m1c', 't20e2']);
extend('thompson_vfg', []); extend('colt3x', ['coltacr', 'aaiacr']); extend('art', ['t44']);
extend('redfield', ['ssg69', 'wa2000']); extend('aug_scope', ['augA3', 'steyracr']);

G.WEAPON = Object.fromEntries(W.map(x => [x.id, x]));
G.ATT = Object.fromEntries(A.map(x => [x.id, x]));
})();
