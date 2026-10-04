// ============================================================================
// IRONSIGHT — the QUARTERMASTER: an in-house assistant you can talk to about
// anything to do with weapons.
//   * TRACKING: every shot, hit, kill, headshot and death with each gun, time
//     carried, every mission, battle, raid and range session, bench work,
//     malfunctions, cleaning and lessons — kept in the browser
//   * ADVICE: reads that record (and each gun's condition and handling) and
//     tells you what to work on, what to clean, what to replace, what to try
//   * LESSONS: animated tutorials on the handling bench using the gun's own
//     model and mechanism — how it works (phase by phase), field strip, load
//     and fire, clearing malfunctions, cleaning, handling
//   * CHAT: inside claude.ai it talks through Claude (the `sample` capability)
//     with tools to look up and compare any weapon, read your record, start
//     lessons and open guns in the armory. Opened anywhere else it still
//     answers from a built-in engine: weapon facts, comparisons, advice and
//     lessons work offline.
// ============================================================================
'use strict';
(function () {
const G = window.G, UI = G.UI, esc = UI.esc;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

// ================================================================== TRACKING
const TKEY = 'ironsight.track';
const blank = () => ({ v: 1, guns: {}, sessions: [], totals: { shots: 0, hits: 0, kills: 0, heads: 0, deaths: 0, time: 0, benchShots: 0 }, lessons: {}, notes: [], chat: [], mal: {}, cleaned: {}, since: Date.now() });
const T = G.Track = { d: (() => { try { const d = JSON.parse(localStorage.getItem(TKEY)); return d && d.v === 1 ? d : blank(); } catch (e) { return blank(); } })(), dirty: false };
T.gun = id => T.d.guns[id] || (T.d.guns[id] = { shots: 0, hits: 0, kills: 0, heads: 0, deaths: 0, time: 0, bench: 0, reloads: 0, last: 0 });
T.mark = () => { T.dirty = true; };
T.reset = () => { T.d = blank(); T.mark(); };
setInterval(() => { if (T.dirty) { T.dirty = false; try { localStorage.setItem(TKEY, JSON.stringify(T.d)); } catch (e) {} } }, 3000);
// sample the game's own counters twice a second and attribute them to the gun in hand
let snap = null, sess = null, wasAlive = true;
function kindNow(Gm) { if (Gm.mode === 'range') return 'range'; if (Gm.mode === 'battle') return 'battle'; if (Gm.mode === 'mission') return Gm.mission && Gm.mission.cfg && Gm.mission.cfg.side ? 'raid' : 'mission'; return null; }
function killsNow(Gm) { if (Gm.mode === 'battle' && G.Battle && G.Battle.st) return { k: G.Battle.st.stats.kills, d: G.Battle.st.stats.deaths, h: 0 }; const M = Gm.mission; if (M) return { k: (M.killed || 0) + (M.outKilled || 0), h: M.heads || 0, d: 0 }; return { k: 0, h: 0, d: 0 }; }
function closeSession(Gm) {
  if (!sess) return;
  const s = sess; sess = null;
  const dur = (Date.now() - s.start) / 1000; if (dur < 8 && !s.shots) return;
  let result = '';
  if (s.kind === 'mission' && Gm.mission) result = Gm.mission.ok ? 'cleared' : (Gm.mission.reason || 'failed');
  else if (s.kind === 'raid') { const l = G.Raid && G.Raid.stash && G.Raid.stash.log && G.Raid.stash.log[0]; result = l && Date.now() - l.at < 60000 ? l.status : 'ended'; }
  else if (s.kind === 'battle' && G.Battle && G.Battle.st) { const tk = G.Battle.st.tickets; result = tk[0] > tk[1] ? 'won' : tk[0] < tk[1] ? 'lost' : 'draw'; }
  const guns = Object.entries(s.guns).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  T.d.sessions.unshift({ kind: s.kind, map: s.map, at: s.start, dur: Math.round(dur), shots: s.shots, hits: s.hits, kills: s.kills, heads: s.heads, deaths: s.deaths, result, guns });
  T.d.sessions = T.d.sessions.slice(0, 60); T.mark();
}
setInterval(() => {
  const Gm = G.Game; if (!Gm) return;
  const P = Gm.player, playing = Gm.state === 'play' && P && P.W && kindNow(Gm);
  if (!playing) { if (sess && (Gm.state === 'end' || Gm.mode === 'menu')) closeSession(Gm); snap = null; return; }
  const st = Gm.stats || { shots: 0, hits: 0 }, kd = killsNow(Gm), id = P.W.wp.id, g = T.gun(id);
  if (!sess) sess = { kind: kindNow(Gm), map: (Gm.mission && Gm.mission.M && Gm.mission.M.name) || (Gm.map && (Gm.map.n || Gm.map.name)) || (G.Battle && G.Battle.st && G.Battle.st.Mp && G.Battle.st.Mp.n) || Gm.mode, start: Date.now(), shots: 0, hits: 0, kills: 0, heads: 0, deaths: 0, guns: {} };
  if (!snap || snap.st !== st) snap = { st, shots: st.shots, hits: st.hits, k: kd.k, h: kd.h, d: kd.d };
  const ds = Math.max(0, st.shots - snap.shots), dh = Math.max(0, st.hits - snap.hits), dk = Math.max(0, kd.k - snap.k), dhd = Math.max(0, kd.h - snap.h);
  Object.assign(snap, { shots: st.shots, hits: st.hits, k: kd.k, h: kd.h });
  if (ds || dh || dk || dhd) { g.shots += ds; g.hits += dh; g.kills += dk; g.heads += dhd; const t = T.d.totals; t.shots += ds; t.hits += dh; t.kills += dk; t.heads += dhd; sess.shots += ds; sess.hits += dh; sess.kills += dk; sess.heads += dhd; sess.guns[id] = (sess.guns[id] || 0) + ds + 1; T.mark(); }
  g.time += .5; g.last = Date.now(); T.d.totals.time += .5; sess.guns[id] = (sess.guns[id] || 0) + .01;
  const alive = P.alive !== false && (P.hp === undefined || P.hp > 0);
  if (wasAlive && !alive) { g.deaths++; T.d.totals.deaths++; sess.deaths++; T.mark(); }
  wasAlive = alive;
}, 500);
// bench: shots, malfunctions, cleaning
function hookBench() {
  const BN = G.Bench; if (!BN || BN._qmHooked) return; BN._qmHooked = true;
  const of = BN.onFire; BN.onFire = B => { if (of) of(B); T.gun(B.wp.id).bench++; T.d.totals.benchShots++; T.mark(); };
  if (BN.mal) { for (const k of ['postFire', 'preFire', 'onOpened']) { const f = BN.mal[k]; BN.mal[k] = function (B, ...a) { const had = B.mal && B.mal.type; const r = f.call(this, B, ...a); if (B.mal && B.mal.type && B.mal.type !== had) { T.d.mal[B.mal.type] = (T.d.mal[B.mal.type] || 0) + 1; T.mark(); } return r; }; } }
  if (BN.G && BN.G.strokeDone) { const sd = BN.G.strokeDone; BN.G.strokeDone = (B, C) => { const r = sd(B, C); T.d.cleaned[B.wp.id] = Date.now(); T.mark(); return r; }; }
}
setTimeout(hookBench, 0);

// ================================================================== WEAPON KNOWLEDGE
const norm = s => String(s).toLowerCase().replace(/[“”"'’()]/g, ' ').replace(/[^a-z0-9.×x\- ]/g, ' ').replace(/\s+/g, ' ').trim();
let IDX = null;
const ALIAS = { 'kar98k': 'k98k', 'kar 98k': 'k98k', '98k': 'k98k', 'mauser k98': 'k98k', 'k98': 'k98k', 'm16': 'm16a1', 'ak': 'ak47', 'kalashnikov': 'ak47', 'tommy gun': 'thompson', 'tommygun': 'thompson', 'grease gun': 'm3', 'browning automatic rifle': 'bar1918', 'desert eagle': 'deagle', 'glock': 'glock17', 'lee enfield': 'smle', 'lee-enfield': 'smle', 'enfield': 'smle', 'mosin': 'mosin9130', 'mosin nagant': 'mosin9130', 'mosin-nagant': 'mosin9130', 'springfield': 'm1903', 'garand': 'garand', 'm1 garand': 'garand', 'brown bess': 'brownbess', 'colt 45': 'm1911', '1911': 'm1911', 'p08': 'luger', 'mg 42': 'mg42', 'mg42': 'mg42', 'stg44': 'stg44', 'stg 44': 'stg44', 'sturmgewehr': 'stg44', 'ppsh': 'ppsh', 'm4': 'm4a1', 'scar': 'scarl', 'famas': 'famas', 'aug': 'aug', 'uzi': 'uzi', 'm60': 'm60', 'm249': 'm249', 'barrett': 'm82', 'm82': 'm82', 'awp': 'awm', 'gustav': 'gustav', 'big bertha': 'bigbertha', 'gatling': 'gatling1874', 'flintlock': 'brownbess', 'musket': 'brownbess', 'blunderbuss': 'blunderbuss', 'tanegashima': 'tanegashima' };
function index() {
  if (IDX && IDX.n === G.WEAPONS.length) return IDX;
  const keys = [], first = {};
  for (const w of G.WEAPONS) { const f = norm(w.n).split(' ')[0]; if (/\d/.test(f) && f.length >= 3) (first[f] = first[f] || []).push(w); }
  for (const w of G.WEAPONS) {
    const n = norm(w.n), ks = new Set([n, norm(w.n.replace(/\(.*?\)/g, '')), norm(w.n.replace(/[“”"].*?[“”"]/g, '')), w.id.toLowerCase()]);
    const q = w.n.match(/[“”"](.+?)[“”"]/); if (q) ks.add(norm(q[1]));
    const f = n.split(' ')[0]; if (first[f] && first[f].length === 1) ks.add(f);
    for (const k of [...ks]) if (k.includes('-')) { ks.add(k.replace(/-/g, '')); ks.add(k.replace(/-/g, ' ')); }
    for (const k of ks) if (k.length >= 3) keys.push([k, w]);
  }
  for (const [a, id] of Object.entries(ALIAS)) if (G.WEAPON[id]) keys.push([a, G.WEAPON[id]]);
  keys.sort((a, b) => b[0].length - a[0].length);
  return IDX = { n: G.WEAPONS.length, keys };
}
// every weapon named in a sentence, longest names first, no overlaps
G.findWeapons = function (text, max = 4) {
  const t = ' ' + norm(text) + ' ', used = [], out = [];
  for (const [k, w] of index().keys) {
    let i = t.indexOf(' ' + k + ' '); if (i < 0) i = t.indexOf(' ' + k + '-'); if (i < 0) continue;
    if (used.some(([a, b]) => i < b && i + k.length > a) || out.includes(w)) continue;
    used.push([i, i + k.length + 1]); out.push(w); if (out.length >= max) break;
  }
  return out;
};
G.searchWeapons = function (q, opts = {}) {
  const words = norm(q || '').split(' ').filter(Boolean);
  let list = G.WEAPONS.filter(w => (!opts.era || w.e === opts.era) && (!opts.cls || w.c === opts.cls));
  if (words.length) list = list.map(w => { const hay = norm(`${w.n} ${w.co} ${w.cal} ${G.CLASS_NAMES[w.c] || ''} ${(G.ERA[w.e] || {}).name || ''} ${w.y} ${w.act}`); return [w, words.filter(x => hay.includes(x)).length]; }).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  return list.slice(0, opts.limit || 12);
};
function statsOf(wp) { try { return G.resolveStats(wp, G.UI.loadoutFor ? G.UI.loadoutFor(wp) : G.defaultLoadout(wp)); } catch (e) { return G.resolveStats(wp, G.defaultLoadout(wp)); } }
const ACT = { bolt: 'bolt action', semi: 'semi-automatic', auto: 'selective fire', auto_ob: 'open-bolt automatic', pump: 'pump action', lever: 'lever action', rev: 'revolver', break: 'break action', single: 'single shot', muzzle: 'muzzle-loader', cannon: 'muzzle-loading cannon', breech: 'breech-loader', mortar: 'mortar', crank: 'hand-cranked' };
G.weaponFacts = function (wp) {
  const S = statsOf(wp), H = S.hand || {}, os = G.opSystem ? G.opSystem(wp, null) : '', osd = (G.OS || {})[os];
  const mine = T.d.guns[wp.id];
  return {
    id: wp.id, name: wp.n, year: wp.y, country: wp.co, era: (G.ERA[wp.e] || {}).name, class: G.CLASS_NAMES[wp.c], prototype: !!wp.proto, fictional: !!wp.psy,
    cartridge: wp.cal, action: ACT[wp.act] || wp.act, fireModes: wp.modes, rpm: wp.rpm, capacity: wp.mag, muzzleVelocity: Math.round(S.v), damage: Math.round(S.dmg), pellets: S.pellets > 1 ? S.pellets : undefined, dispersionMOA: +S.acc.toFixed(1), weightKg: +(S.wt || wp.wt).toFixed(2), reloadSec: wp.rl,
    operatingSystem: osd ? osd.n : os, howItWorks: osd ? osd.d : undefined, notes: wp.blurb,
    handling: H.emplaced ? 'crew-served' : H.oal ? { lengthCm: Math.round(H.oal * 100), balanceCmAheadOfGrip: Math.round(H.balance * 100), swingInertia: +H.I.toFixed(3), adsMs: Math.round(S.ads * 1000), freeRecoilJ: +H.E.toFixed(1), muzzleRise: +H.rise.toFixed(1), triggerKg: H.trigger, lockMs: +H.lock.toFixed(1), cycleMs: H.cycle ? Math.round(H.cycle) : undefined } : undefined,
    special: [wp.he && 'explosive rounds', wp.homing && 'seeker rounds', wp.spin && 'spin-up', wp.charge && 'charge to fire', wp.salvo && wp.salvo + '-barrel salvo', wp.intSup && 'integral suppressor', wp.lock && 'lock time ' + Math.round(wp.lock * 1000) + ' ms', wp.smoke && 'black-powder smoke', wp.emplaced && 'emplaced'].filter(Boolean),
    condition: { fouling: Math.round(G.Fouling.get(wp.id) * 100) + '%', roundsFired: G.Wear ? G.Wear.rec(wp.id).n : 0, recoilSpringWear: G.Wear ? Math.round(G.Wear.frac(wp, 'spring') * 100) + '%' : undefined },
    yourRecord: mine ? { shots: mine.shots, hits: mine.hits, accuracy: pct(mine.hits, mine.shots) + '%', kills: mine.kills, headshots: mine.heads, deaths: mine.deaths, minutesCarried: Math.round(mine.time / 60), benchShots: mine.bench } : 'never used',
    lessons: G.Lessons ? G.Lessons.topics(wp).map(t => t.id) : [],
  };
};

// ================================================================== ADVICE
const BASE_ACC = { SR: .45, DMR: .38, RIF: .35, BR: .3, AR: .27, CAR: .27, SMG: .22, PST: .25, LMG: .14, SG: .5, MUS: .3 };
G.advice = function () {
  const tips = [], d = T.d, guns = Object.entries(d.guns).map(([id, g]) => [G.WEAPON[id], g]).filter(([w]) => w);
  const used = guns.filter(([, g]) => g.shots >= 40).sort((a, b) => b[1].shots - a[1].shots);
  for (const [w, g] of used.slice(0, 6)) {
    const acc = g.hits / g.shots, base = BASE_ACC[w.c] || .25, S = statsOf(w), H = S.hand || {};
    if (acc < base * .6) {
      const why = [];
      if (H.rise > 1.2 || S.rv > 1.4) why.push(`it kicks hard (muzzle rise ${H.rise ? H.rise.toFixed(1) : '?'}): fire shorter bursts, or fit a compensator or brake`);
      if (H.inertia > 1.8) why.push(`it is heavy to swing (${H.I.toFixed(2)} kg·m²): pre-aim corners instead of flicking`);
      if (S.ads > .45) why.push(`it is slow to aim (${Math.round(S.ads * 1000)} ms ADS): aim before you peek`);
      if (w.modes.includes('auto')) why.push('try semi or burst past 30 m');
      tips.push({ t: `Accuracy with the ${w.n}: ${Math.round(acc * 100)}%`, d: `About ${Math.round(base * 100)}% is typical for a ${(G.CLASS_NAMES[w.c] || 'gun').toLowerCase()}. ${why.length ? 'Because ' + why.join('; ') + '.' : 'Practise on the range against movers and pop-ups.'}`, gun: w.id, k: 'acc' });
    } else if (acc > base * 1.3 && g.shots > 150) tips.push({ t: `You shoot the ${w.n} well — ${Math.round(acc * 100)}%`, d: `Well above the ${Math.round(base * 100)}% typical for its class. It suits you; similar guns are worth trying.`, gun: w.id, k: 'good' });
    if (g.kills >= 10 && g.heads / Math.max(1, g.kills) < .12 && ['SR', 'DMR', 'RIF', 'BR', 'AR', 'CAR', 'PST'].includes(w.c)) tips.push({ t: `Few headshots with the ${w.n}`, d: `${g.heads} of ${g.kills} kills. Keep the crosshair at head height while you move, so you only adjust sideways.`, gun: w.id, k: 'head' });
  }
  for (const [w] of guns) {
    const f = G.Fouling.get(w.id); if (f > .45) tips.push({ t: `Clean the ${w.n} (${Math.round(f * 100)}% fouled)`, d: 'Dirty guns shoot wider and jam more. Bench → Clean, or ask me for the cleaning lesson.', gun: w.id, k: 'clean' });
    if (G.Wear) for (const k of ['spring', 'exspring', 'magspring', 'extractor', 'firingpin']) { const wf = G.Wear.frac(w, k); if (wf > .85) tips.push({ t: `Worn part on the ${w.n}`, d: `${(G.Bench.v2 && G.Bench.v2.PI_[k] || [k])[0]} at ${Math.round(wf * 100)}% of its service life — replace it on the bench (Handling tab) before it causes stoppages.`, gun: w.id, k: 'wear' }); }
  }
  const t = d.totals;
  if (t.deaths >= 5 && t.kills / Math.max(1, t.deaths) < 1) tips.push({ t: `K/D ${(t.kills / Math.max(1, t.deaths)).toFixed(2)}`, d: 'Slow down: move cover to cover, crouch when you peek, and reload behind cover rather than in the open. Body armour and a helmet from the kit locker help more than people think.', k: 'kd' });
  const top = used[0];
  if (top) { const w = top[0], done = d.lessons[w.id] || {}; const miss = (G.Lessons ? G.Lessons.topics(w) : []).filter(x => !done[x.id]); if (miss.length) tips.push({ t: `Learn your ${w.n}`, d: `Your most-used gun. Lessons you haven’t done: ${miss.map(x => x.n.toLowerCase()).join(', ')}.`, gun: w.id, k: 'lesson', lesson: miss[0].id }); }
  if (top) { const w = top[0], S = statsOf(w); const alt = G.WEAPONS.filter(x => x.c === w.c && x.id !== w.id && !x.psy && !(d.guns[x.id] && d.guns[x.id].shots)).map(x => [x, statsOf(x)]).filter(([, s]) => s.ads < S.ads * .92 && s.acc <= S.acc * 1.1).sort((a, b) => a[1].ads - b[1].ads).slice(0, 3);
    if (alt.length) tips.push({ t: 'Worth trying', d: `Like the ${w.n} but quicker to aim: ${alt.map(([x, s]) => `${x.n} (${Math.round(s.ads * 1000)} ms)`).join(', ')}.`, k: 'try', guns: alt.map(a => a[0].id) }); }
  const mal = Object.values(d.mal).reduce((a, b) => a + b, 0); if (mal >= 3) tips.push({ t: `${mal} stoppages on the bench`, d: 'Most come from fouling, a dry action and tired springs. Clean, oil, and replace springs past their service life.', k: 'mal' });
  if (!used.length) tips.push({ t: 'No record yet', d: 'Play a mission, a battle, a raid or a range session and I’ll start tracking every gun you use — accuracy, kills, headshots, time carried — and tell you what to work on.', k: 'start' });
  return tips.slice(0, 12);
};
G.recordSummary = function () {
  const d = T.d, t = d.totals;
  const guns = Object.entries(d.guns).filter(([id]) => G.WEAPON[id]).sort((a, b) => (b[1].shots + b[1].time) - (a[1].shots + a[1].time)).slice(0, 8)
    .map(([id, g]) => ({ id, name: G.WEAPON[id].n, shots: g.shots, accuracy: pct(g.hits, g.shots) + '%', kills: g.kills, headshots: g.heads, deaths: g.deaths, minutes: Math.round(g.time / 60), benchShots: g.bench }));
  return { totals: { shots: t.shots, hits: t.hits, accuracy: pct(t.hits, t.shots) + '%', kills: t.kills, headshots: t.heads, deaths: t.deaths, hoursPlayed: +(t.time / 3600).toFixed(1), benchShots: t.benchShots }, topGuns: guns,
    recentSessions: d.sessions.slice(0, 8).map(s => ({ kind: s.kind, map: s.map, result: s.result, minutes: Math.round(s.dur / 60), accuracy: pct(s.hits, s.shots) + '%', kills: s.kills, deaths: s.deaths, guns: s.guns.map(id => (G.WEAPON[id] || { n: id }).n), when: new Date(s.at).toISOString().slice(0, 16).replace('T', ' ') })),
    malfunctionsCleared: d.mal, lessonsDone: Object.fromEntries(Object.entries(d.lessons).map(([id, l]) => [(G.WEAPON[id] || { n: id }).n, Object.keys(l)])), notes: d.notes };
};

// ================================================================== ANIMATED LESSONS (on the handling bench)
const TOPICS = [
  { id: 'works', n: 'How it works', d: 'The mechanism in slow motion, phase by phase, with each part highlighted.' },
  { id: 'strip', n: 'Field strip', d: 'Taking it apart in the right order, what each part does, and putting it back together.' },
  { id: 'operate', n: 'Load and fire', d: 'Safe handling, loading, chambering, firing, reloading and unloading.' },
  { id: 'malf', n: 'Clearing malfunctions', d: 'What goes wrong and the drills that fix it.' },
  { id: 'clean', n: 'Cleaning', d: 'Brush, patches, scrub, oil and wipe-down — and why it matters.' },
  { id: 'handling', n: 'Handling and recoil', d: 'Weight, balance, inertia, recoil and what they mean when you shoot.' },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LS = G.Lessons = { cur: null };
LS.topics = wp => {
  const os = G.opSystem ? G.opSystem(wp, null) : '';
  return TOPICS.filter(t => t.id === 'works' ? !['coil', 'rocket'].includes(os) : t.id === 'handling' ? !wp.emplaced : t.id === 'malf' ? !['crank'].includes(wp.act) : true);
};
let GEN = 0;
// a lesson's bench commands only reach the bench while that lesson is the current one: a step still
// running when the player skips ahead or starts another lesson must not keep working the new gun
const BN = () => G.Bench, BS = () => G.Bench._state();
const BA = () => { const gen = GEN, A = G.Bench._api; return new Proxy(A, { get(t, k) { const f = t[k]; return typeof f !== 'function' ? f : (...a) => (LS.cur && LS.cur.gen === gen ? f.apply(t, a) : undefined); } }); };
const alive = tok => LS.cur && LS.cur.tok === tok;
function words(s) { return String(s).split(/\s+/).length; }
// pick the internal part a phase is about
const KW = [[/top lever|barrels drop/i, ['spindle', 'underbolt', 'cockrods', 'lumps']], [/gas/i, ['gaskey', 'piston', 'oprod', 'gastube', 'gasblock']], [/unlock|tilt|knee|delay|rollers|lift/i, ['rollers', 'campin', 'bolthead', 'link', 'toggle', 'lockpiece', 'boltbody', 'lifter']], [/extract/i, ['extractor', 'extractors', 'flextractor']], [/eject/i, ['ejector', 'ejectors']], [/cock/i, ['hammer', 'disconnector', 'cockpiece', 'mainspring', 'tumblers', 'cockrods', 'striker']], [/rear|recoil|buffer|run-out/i, ['buffer', 'spring', 'buffercyl', 'recup']], [/feed|load|ram|drop/i, ['follower', 'magspring', 'lifter', 'feedarm', 'latches', 'basecap']], [/lock|chamber/i, ['lugs', 'bolthead', 'lockblock', 'underbolt', 'boltbody']], [/reset/i, ['disconnector', 'tspring', 'trigger', 'rebound']], [/rotation|cylinder/i, ['hand', 'cylstop']], [/pan|frizzen|falls|touch/i, ['tumbler', 'vspring', 'frizzspring', 'sear']], [/vent|linstock|primer|give fire/i, ['linstock', 'vent']], [/breech/i, ['breechcam', 'blockfp', 'extractors']], [/ignit|fire|strike|release|trigger|lanyard/i, ['sear', 'hammer', 'trigger', 'firingpin', 'striker', 'tumbler', 'blockfp', 'sears', 'firingpins']]];
function partFor(I, label) { const keys = new Set(I.parts.map(p => p.key)); for (const [re, ks] of KW) if (re.test(label)) { const k = ks.find(x => keys.has(x)); if (k) return k; } return null; }
const strip = s => String(s).replace(/<[^>]+>/g, '');
const B_ = {
  works(B) {
    const bn = BN(), v2 = bn.v2; bn.G.ensureParts(B); const I = B.inner;
    if (!I || !I.v2) { const d = (G.OS || {})[I ? I.os : ''] || { n: 'Mechanism', d: '' }; return [{ title: d.n, body: d.d || 'This one has no detailed model yet.', act() { bn.tab = 'works'; bn.api.panel(); } }]; }
    const ph = v2.PH[I.fam] || [], H = (B.S && B.S.hand) || {};
    const steps = [{ title: I.def ? I.def.n : 'How it works', body: `${I.def ? I.def.d : ''} We’ll slow one firing cycle right down — the whole thing takes ${Math.round(v2.msOfT(B, 1))} ms at full speed.`, act() { bn.tab = 'works'; bn.G.setXray(B, true); v2.startCycle(B, { play: false, ms: 0 }); bn.api.panel(); v2.closeUp(B, true); } }];
    ph.forEach(([t, label, detail], k) => steps.push({ title: label, body: `${detail} (${v2.msOfT(B, t).toFixed(v2.msOfT(B, t) < 10 ? 2 : 0)} ms)`, async act(tok) {
      if (!bn.cyc2) v2.startCycle(B, { play: false });
      const C = bn.cyc2, m0 = v2.msOfT(B, t + 1e-4), m1 = k + 1 < ph.length ? v2.msOfT(B, ph[k + 1][0]) : v2.msOfT(B, 1) - .01;
      const key = partFor(I, label + ' ' + detail); v2.select(B, key);
      C.ms = m0; C.speed = Math.max(1e-5, (m1 - m0) / 2600); C.play = true; C.loop = false;
      const t0 = performance.now(); while (alive(tok) && bn.cyc2 && bn.cyc2.ms < m1 - 1e-6 && performance.now() - t0 < 4000) await sleep(50);
      if (bn.cyc2) { bn.cyc2.play = false; bn.cyc2.ms = Math.min(bn.cyc2.ms, m1); }
    } }));
    steps.push({ title: 'At full speed', body: `Now the whole cycle at its real speed: ${Math.round(v2.msOfT(B, 1))} ms${B.wp.rpm && !['bolt', 'pump', 'lever'].includes(B.wp.act) ? ` — ${B.wp.rpm} rounds a minute` : ''}. ${H.lock ? `Lock time (trigger to primer) is about ${H.lock < 50 ? H.lock.toFixed(1) : Math.round(H.lock)} ms.` : ''} Scrub the slider in the How it works tab to look at any moment yourself.`, async act(tok) { v2.select(B, null); v2.startCycle(B, { ms: 0, play: true, speed: 1, loop: true }); await sleep(2500); if (bn.cyc2) bn.cyc2.loop = false; } });
    return steps;
  },
  strip(B) {
    const bn = BN(); bn.G.ensureParts(B); bn.tab = 'strip'; if (!bn.strip) bn.strip = { steps: bn.G.stepList(B) }; const S = bn.strip.steps;
    const to = n => S.forEach((s, k) => { const want = k < n; if (!!s.done !== want) bn.G.doStep(B, k, !want); });
    const steps = [{ title: `Field strip: ${B.wp.n}`, body: `First make it safe: magazine out, action open, chamber checked — every time. Then ${S.length} steps, in the order the armourer uses. ${B.inner && B.inner.v2 ? 'The internal parts are shown in place as they come out.' : ''}`, act() { const A = BA(); if (B.kind === 'std') { if (B.feed === 'box' && B.magIn) A.magToBench(true); if (B.chamber) { A.eject(B.chamber === 1); B.chamber = 0; } } to(0); bn.api.panel(); } }];
    S.forEach((s, i) => { const info = s.part && (s.part.info || (bn.v2.PI_ || {})[s.key.replace(/^i:/, '')]); steps.push({ title: `${i + 1}. ${s.name}`, body: `${s.txt}.${info && info[1] ? ' ' + info[1] : ''}`, act() { to(i + 1); if (s.inner) bn.v2.select(B, s.key.replace(/^i:/, '')); bn.api.panel(); }, dur: 2600 }); });
    steps.push({ title: 'Reassemble', body: 'Everything goes back in the reverse order. Then a function check: work the action, check the safety, dry-fire into a safe direction.', async act(tok) { for (let k = S.length - 1; k >= 0 && alive(tok); k--) { if (S[k].done) bn.G.doStep(B, k, true); await sleep(140); } bn.api.panel(); } });
    return steps;
  },
  operate(B) {
    const bn = BN(), A = BA(), wp = B.wp; bn.tab = 'operate';
    const rules = 'The four rules: treat every gun as loaded; never point it at anything you are not willing to destroy; finger off the trigger until you are on target; know your target and what is beyond it.';
    if (B.kind !== 'std') { const K = bn.kinds[B.kind]; const how = K && K.howto ? K.howto(B).map(strip) : []; return [{ title: 'Safety first', body: rules, act() { bn.api.panel(); } }, ...how.map((h, i) => ({ title: `Step ${i + 1}`, body: h, act() { bn.api.panel(); } })), { title: 'Your turn', body: 'Work it yourself on the bench: the Operate panel always shows the next step.', act() { bn.api.panel(); } }]; }
    const fire = async (n, tok) => { for (let i = 0; i < n && alive(tok); i++) { A.pullTrigger(); await sleep(140); if (B.rig.trigger) B.rig.trigger.rotation.x = 0; await sleep(380); } };
    const s = [{ title: 'Safety first', body: rules, act() { if (!B.safety && B.kind === 'std' && !B.rev) A.toggleSafety(); bn.api.panel(); } }];
    if (B.rev) return s.concat([
      { title: 'Open the cylinder', body: 'Swing the cylinder out (or open the loading gate) and check every chamber.', act() { if (!B.cylOpen) A.toggleCyl(); } },
      { title: 'Load', body: `One round per chamber — ${B.cyl.length} of them.`, async act(tok) { for (let i = 0; i < B.cyl.length && alive(tok); i++) { A.loadFromBox(1); await sleep(250); } } },
      { title: 'Close it', body: 'Close the cylinder until it clicks home. The cylinder stop locks it.', act() { if (B.cylOpen) A.toggleCyl(); if (B.safety) A.toggleSafety(); } },
      { title: 'Fire', body: 'Double action: a long, heavy pull turns the cylinder and drops the hammer. Each pull fires the next chamber.', act: tok => fire(3, tok) },
      { title: 'Unload', body: 'Open the cylinder and punch the ejector rod: the empties (and any live rounds) come out together.', act() { if (!B.cylOpen) A.toggleCyl(); } }]);
    if (B.feed === 'box') return s.concat([
      { title: 'Check it is clear', body: 'Lock the action open and look into the chamber and the magazine well.', async act() { if (B.magIn) A.magToBench(false); A.drive(1, .2, () => { A.actionOpened(); B.locked = !!B.lockback || B.type !== 'none'; A.panel(); }); await sleep(400); } },
      { title: 'Load the magazine', body: `Press rounds in under the feed lips, one at a time: ${B.cap} fit. Pushing down on the stack helps the last few go in.`, async act(tok) { const n = Math.max(0, B.cap - B.rounds); for (let i = 0; i < Math.min(n, 12) && alive(tok); i++) { A.loadFromBox(1); await sleep(160); } if (B.rounds < B.cap) A.loadFromBox(B.cap - B.rounds); } },
      { title: 'Insert the magazine', body: 'Seat it firmly, then tug it to be sure it caught. A magazine that isn’t seated is the commonest cause of a failure to feed.', async act() { A.magToGun(); await sleep(500); } },
      { title: 'Chamber a round', body: B.type === 'slide' ? 'Pull the slide fully back and let it go — don’t ride it forward.' : B.type === 'bolt' ? 'Lift, pull, push, turn down.' : 'Pull the charging handle fully back and let it fly.', async act() { if (B.locked) A.release(); else A.rack(); await sleep(500); } },
      { title: 'Safety off, on target', body: 'Only now does the safety come off — when the sights are on the target.', act() { if (B.safety) A.toggleSafety(); } },
      { title: 'Fire', body: 'Press the trigger straight back; let it reset (you feel a click), then press again. The action cycles itself and feeds the next round.', act: tok => fire(3, tok) },
      ...(B.S.modes.length > 1 ? [{ title: 'Fire modes', body: `This gun has ${B.S.modes.map(m => ({ semi: 'semi', auto: 'full auto', burst3: '3-round burst', burst2: '2-round burst' })[m] || m).join(', ')}. Bursts and short strings keep it on target.`, async act(tok) { A.nextMode(); await sleep(300); B.fireHeld = true; B.fireT = 0; const md = B.S.modes[B.mode]; B.burstLeft = md === 'burst3' ? 3 : md === 'burst2' ? 2 : 0; if (A.pullTrigger() && B.burstLeft) B.burstLeft--; await sleep(450); B.fireHeld = false; for (let k = 0; k < 6 && B.mode !== 0 && alive(tok); k++) A.nextMode(); } }] : []),
      { title: 'Reload', body: 'Drop the empty magazine, seat a full one, then release the slide or bolt (or rack it).', async act(tok) { A.magToBench(false); await sleep(500); A.loadFromBox(B.cap - B.rounds); A.magToGun(); await sleep(500); if (B.locked) A.release(); else A.rack(); await sleep(300); } },
      { title: 'Unload and show clear', body: 'Magazine out first, then work the action to eject the round in the chamber, lock it open and look. Safety on.', async act() { A.magToBench(false); await sleep(400); A.rack(); await sleep(400); A.drive(1, .15, () => { A.actionOpened(); B.locked = true; A.panel(); }); if (!B.safety) A.toggleSafety(); } }]);
    // internal magazines, tubes, en-bloc clips and belts
    return s.concat([
      { title: 'Open the action', body: B.feed === 'belt' ? 'Open the feed cover and check the feed tray and chamber.' : 'Open the action and check the chamber.', async act() { if (B.feed === 'belt') { B.coverOpen = true; G.Audio.mech('cover'); } else if (B.open < .5) { A.rack(); await sleep(400); } A.panel(); } },
      { title: 'Load', body: B.feed === 'belt' ? 'Lay the belt on the tray, first round against the stop, then close the cover.' : B.mt === 'enbloc' ? 'Press a full en-bloc clip down into the magazine — keep your thumb clear of the bolt.' : /tube/.test(B.mt) || wp.tubeLoad ? 'Push rounds into the tube through the loading port.' : 'Press rounds down from a stripper clip, or one at a time.', async act(tok) { if (B.feed === 'belt') { A.loadFromBox(1); await sleep(300); B.coverOpen = false; G.Audio.mech('cover'); } else { for (let i = 0; i < Math.min(B.cap, 8) && alive(tok); i++) { if (!A.loadFromBox(1)) break; await sleep(200); } } A.panel(); } },
      { title: 'Chamber', body: 'Close the action — it strips the top round into the chamber.', async act() { if (B.open > .5 || B.feed === 'belt') A.rack(); await sleep(500); if (B.safety) A.toggleSafety(); } },
      { title: 'Fire and work the action', body: B.selfLoad ? 'It cycles itself.' : 'After each shot work the action briskly and fully — short-stroking is the commonest manual-action mistake.', async act(tok) { for (let i = 0; i < 3 && alive(tok); i++) { A.pullTrigger(); await sleep(160); if (B.rig.trigger) B.rig.trigger.rotation.x = 0; await sleep(300); if (!B.selfLoad) { A.rack(); await sleep(500); } } } },
      { title: 'Unload', body: 'Work the action until the magazine is empty and the chamber is clear, then leave it open.', async act(tok) { for (let i = 0; i < 12 && alive(tok) && (B.rounds > 0 || B.chamber); i++) { A.rack(); await sleep(380); } if (B.open < .5) { A.rack(); await sleep(300); } } }]);
  },
  malf(B) {
    const bn = BN(), A = BA(), wp = B.wp; bn.tab = 'operate';
    const intro = { title: 'Why guns stop', body: 'Most stoppages come from four things: the magazine, the ammunition, a dirty or dry action, and how the gun is held. The drills below fix almost all of them in seconds.', act() { bn.api.panel(); } };
    if (B.kind !== 'std') return [intro, { title: wp.e === 'powder' ? 'Flash in the pan & hangfire' : 'Misfire drill', body: wp.e === 'powder' ? 'With black powder a “flash in the pan” is when the priming burns but the charge doesn’t. Keep it pointed downrange — it may still go off (a hangfire). Re-prime, check the touch-hole is clear (a vent pick), and try again. A fouled touch-hole is the usual cause: clean it.' : 'A gun that doesn’t fire stays pointed at the target: wait (two minutes for artillery), re-cock and fire again; if it still fails, wait again before opening the breech and removing the round.', act() { bn.api.panel(); } }];
    const load = async () => { if (B.feed === 'box') { if (B.magIn) A.magToBench(true); A.loadFromBox(B.cap - B.rounds); A.magToGun(); await sleep(450); if (B.locked) A.release(); else A.rack(); } else { if (B.open < .5) { A.rack(); await sleep(350); } A.loadFromBox(Math.min(5, B.cap)); A.rack(); } await sleep(450); if (B.safety) A.toggleSafety(); A.panel(); };
    const force = async (k) => { if (B.mal) B.mal = null; if (B.chamber !== 1) await load(); B.forceMal = k; A.pullTrigger(); await sleep(200); if (B.rig.trigger) B.rig.trigger.rotation.x = 0; A.panel(); };
    const s = [intro, { title: 'Load up', body: 'A loaded magazine and a round in the chamber.', act: load }];
    if (B.selfLoad && (B.feed === 'box' || B.feed === 'int')) s.push(
      { title: 'Stovepipe', body: 'The empty case is caught by the closing slide and stands up in the port. Usually a weak grip, a weak spring, a dirty chamber or weak ammunition.', act: () => force('stovepipe') },
      { title: 'Clear it: rack', body: 'Sweep or rack the action — the case flies out and a fresh round is chambered. Back on target.', async act() { A.rack(); await sleep(400); } },
      { title: 'Failure to feed', body: 'Click instead of bang: the bolt closed on an empty chamber. The round nose-dived, or the magazine wasn’t seated.', act: () => force('ftf') },
      ...(B.feed === 'box' ? [{ title: 'Tap…', body: 'TAP the bottom of the magazine hard to seat it…', act() { if (B.mal) B.mal.tapped = true; G.Audio.mech('magin'); A.say('Tap.'); A.panel(); } }] : []),
      { title: '…rack, ready', body: '…RACK the action to chamber a round, and assess. Tap-rack-bang.', async act() { A.rack(); await sleep(400); } },
      ...(B.feed === 'box' ? [
        { title: 'Double feed', body: 'The empty case stayed in the chamber and the next round has been pushed in behind it. Nothing works — and racking with the magazine in won’t clear it.', act: () => force('doublefeed') },
        { title: 'Racking fails', body: 'See? The magazine is still pushing the second round up into the jam.', async act() { A.rack(); await sleep(400); } },
        { title: 'Lock back, strip the magazine', body: 'Lock the action open if you can, and rip the magazine out.', async act() { A.magToBench(false); await sleep(500); } },
        { title: 'Rack it clear', body: 'Rack two or three times: the case and the loose round fall out.', async act() { A.rack(); await sleep(500); A.rack(); await sleep(400); } },
        { title: 'Reload and rack', body: 'Fresh magazine in, rack, back on target.', async act() { A.loadFromBox(B.cap - B.rounds); A.magToGun(); await sleep(450); A.rack(); await sleep(400); } }] : []));
    if (!B.selfLoad && !B.rev && B.type !== 'none') s.push(
      { title: 'Failure to extract', body: 'You fire, work the action — and the extractor slips off the rim. The empty is still in the chamber.', async act() { if (B.chamber !== 1) await load(); A.pullTrigger(); await sleep(250); B.forceMal = 'fte'; A.rack(); await sleep(500); A.panel(); } },
      { title: 'Knock it out', body: 'Open the action and push the case out from the muzzle end with a cleaning rod. A worn extractor or a dirty chamber is usually to blame.', async act() { if (B.open < .5) { B.mal = null; A.rack(); await sleep(300); } A.eject(false); B.chamber = 0; B.mal = null; A.say('The stuck case drops out.'); A.panel(); } });
    s.push({ title: 'Dud', body: 'The firing pin struck, nothing happened. Keep the muzzle pointed downrange.', act: () => force('dud') },
      { title: 'Wait — hangfire?', body: 'A slow primer can fire a second or more late. On the range you wait 30 seconds before opening the action.', async act(tok) { await sleep(2500); } },
      { title: 'Rack it out', body: 'Then rack the dud out and carry on. Set duds aside for safe disposal.', async act() { B.mal = null; B.dud = false; A.rack(); await sleep(400); } },
      { title: 'Prevention', body: 'Keep it clean and lightly oiled, replace springs at their service life, use good magazines and ammunition, and hold the gun firmly. Practise any of these yourself with “Practise a malfunction” in the Operate panel.', act() { A.panel(); } });
    return s;
  },
  clean(B) {
    const bn = BN(), A = BA(), f0 = G.Fouling.get(B.wp.id), pen = () => bn.clean;
    const strokes = async (kind, n, tok) => { bn.G.cleanStop(); bn.G.cleanStart(B, kind); const C = pen(); if (!C) return false; for (let i = 0; i < n && alive(tok) && bn.clean === C; i++) { for (let k = 0; k <= 10; k++) { C.prog = C.dir > 0 ? k / 10 : 1 - k / 10; await sleep(40); } C.dir *= -1; C.strokes++; bn.G.strokeDone(B, C); if (kind === 'patch' && G.Fouling.get(B.wp.id) < .04) break; } return true; };
    const rub = async (kind, n, tok) => { bn.G.cleanStop(); bn.G.cleanStart(B, kind); const C = pen(); if (!C) return; B.root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(C.target ? C.target.obj : B.root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
      for (let i = 0; i < n * 12 && alive(tok) && bn.clean === C; i++) { C.mouse = c.clone().add(new THREE.Vector3(Math.sin(i * .9) * sz.x * .35, sz.y * .5 + .01, Math.cos(i * .5) * sz.z * .4)); if (i % 12 === 11) { G.Fouling.set(B.wp.id, G.Fouling.get(B.wp.id) - (kind === 'scrub' ? .06 : .02)); G.Audio.mech('belt'); bn.G.applyDirt(B); bn.api.panel(); } await sleep(60); } };
    return [
      { title: 'Why clean', body: `Every shot leaves carbon, copper and (with black powder) corrosive salts in the bore and action. Dirt widens your groups, causes stoppages and wears parts. This one is ${Math.round(f0 * 100)}% fouled.`, act() { bn.tab = 'clean'; bn.G.applyDirt(B); bn.api.panel(); } },
      { title: 'Unload and open up', body: 'Unload, check it’s clear, and open the action (or remove the bolt) so you can reach the bore from the breech end.', async act() { if (B.kind === 'std') { if (B.feed === 'box' && B.magIn) A.magToBench(false); if (B.chamber) { A.eject(B.chamber === 1); B.chamber = 0; } if (B.type !== 'none' && !B.rev) A.drive(1, .2, () => { B.locked = true; A.panel(); }); } await sleep(500); } },
      { title: 'Bore brush', body: 'A bronze brush with solvent, pushed all the way through and back. It loosens carbon and copper.', act: async tok => { if (!(await strokes('brush', 5, tok))) A.say('The bore can’t be reached on this one without taking it apart.'); } },
      { title: 'Patches', body: 'Clean patches on a jag until one comes out white. The first ones come out black.', act: tok => strokes('patch', 8, tok) },
      { title: 'Scrub the action', body: 'A nylon brush and solvent on the bolt face, the locking lugs, the extractor and wherever carbon cakes.', act: tok => rub('scrub', 3, tok) },
      { title: 'Oil', body: 'A drop of oil on every sliding surface — rails, bolt, cam surfaces. A light film, not a puddle.', async act() { bn.G.cleanStop(); bn.G.cleanStart(B, 'oil'); B.lube = 1; G.Audio.mech('belt'); A.say('Oiled.'); bn.api.panel(); await sleep(600); } },
      { title: 'Wipe down', body: 'Wipe the outside with an oily rag against rust and fingerprints.', act: tok => rub('wipe', 2, tok) },
      { title: 'Done', body: `Fouling is now ${Math.round(G.Fouling.get(B.wp.id) * 100)}%. A clean, oiled gun is more accurate and far more reliable — in the field too.`, act() { bn.G.cleanStop(); bn.api.panel(); } },
    ];
  },
  handling(B) {
    const bn = BN(), S = B.S || G.resolveStats(B.wp, G.defaultLoadout(B.wp)), H = S.hand || {};
    if (!H.oal) return [{ title: 'Handling', body: 'This piece is laid and fired from its mount by a crew.', act() { bn.tab = 'handling'; bn.api.panel(); } }];
    return [
      { title: 'A gun is a lever', body: `${Math.round(H.oal * 100)} cm long and ${H.mass.toFixed(2)} kg loaded. How it handles depends less on weight than on WHERE the weight is.`, act() { bn.tab = 'handling'; bn.api.panel(); } },
      { title: 'Balance and swing', body: `Its balance point is ${Math.abs(Math.round(H.balance * 100))} cm ${H.balance >= 0 ? 'ahead of' : 'behind'} the grip, giving a swing inertia of ${H.I.toFixed(3)} kg·m². ${H.I > .7 ? 'That is a lot: it is slow to start moving and slow to stop — it lags behind your view when you turn, so pre-aim corners.' : H.I < .1 ? 'Very little: it points instantly.' : 'Middle of the road.'}`, act() { bn.api.panel(); } },
      { title: 'Aim down sights', body: `About ${Math.round(S.ads * 1000)} ms to come up on the sights. Long, front-heavy guns and heavy optics or launchers slow this down; a shorter barrel or lighter accessories speed it up.`, act() { bn.api.panel(); } },
      { title: 'Recoil', body: `Free recoil: ${H.E.toFixed(1)} J at ${H.vr.toFixed(2)} m/s — the bullet’s and the gas’s momentum pushing the gun back. ${H.E > 20 ? 'Heavy: hold it tight into the shoulder.' : H.E < 6 ? 'Light: easy to shoot fast and accurately.' : 'Moderate.'} A heavier gun or a muzzle brake cuts it.`, act() { bn.api.panel(); } },
      { title: 'Muzzle rise', body: `The bore sits ${Math.round(H.boreH * 1000)} mm above where the recoil meets your ${H.shouldered ? 'shoulder' : 'hand'}: that lever flips the muzzle up (rise index ${H.rise.toFixed(1)}). Straight-line stocks and low bore axes keep follow-up shots on target.`, act() { bn.api.panel(); } },
      { title: 'Trigger and lock time', body: `About ${H.trigger.toFixed(1)} kg of pull, and ${H.lock < 50 ? H.lock.toFixed(1) : Math.round(H.lock)} ms from sear release to primer. The less the gun can move in that time, the better — that is why target rifles have light triggers and short lock times.${B.wp.lock ? ' With a flintlock most of that delay is the priming flashing through the touch-hole: hold steady through it.' : ''}`, act() { bn.api.panel(); } },
      { title: 'In the game', body: 'All of these numbers drive how the gun behaves when you play: ADS time, sway, how far it lags when you turn, and how fast it settles after a shot. Attachments change them — check the armory’s handling sheet as you build.', act() { bn.api.panel(); } },
    ];
  },
};
LS.run = function (id, topic) {
  const wp = G.WEAPON[id]; if (!wp) throw new Error('No weapon with id ' + id);
  if (!TOPICS.find(t => t.id === topic)) topic = 'works';
  LS.stop(true);
  if (G.Game && G.Game.state === 'play') throw new Error('Finish or leave the current game first.');
  G.Bench.open(id);
  const B = BS(); if (!B) throw new Error('Bench not available');
  const gen = ++GEN, steps = B_[topic](B);
  LS.cur = { wp, topic, steps, i: -1, play: true, tok: Math.random(), B, gen };
  card(); go(0);
  return { ok: true, weapon: wp.n, topic: TOPICS.find(t => t.id === topic).n, steps: steps.map(s => s.title) };
};
async function go(i) {
  const L = LS.cur; if (!L) return;
  if (i >= L.steps.length) return finish();
  L.i = i; const tok = L.tok = Math.random(), st = L.steps[i];
  clearTimeout(L.timer); card();
  try { await st.act(tok); } catch (e) { console.warn('lesson step', e); }
  if (!alive(tok)) return;
  const wait = st.dur || clamp(1800 + words(st.body + st.title) * 70, 3500, 11000);
  L.timer = setTimeout(() => { if (alive(tok) && LS.cur.play && LS.cur.i === i) go(i + 1); }, wait);
}
function finish() {
  const L = LS.cur; if (!L) return;
  const rec = T.d.lessons[L.wp.id] || (T.d.lessons[L.wp.id] = {}); rec[L.topic] = Date.now(); T.mark();
  L.i = L.steps.length; L.done = true; card();
}
LS.stop = function (quiet) { const L = LS.cur; if (L) { clearTimeout(L.timer); L.tok = null; } LS.cur = null; const el = document.querySelector('#qm-lesson'); if (el) el.remove(); };
const MANUAL = ['works', 'strip', 'handling'];
function card() {
  const L = LS.cur; let el = document.querySelector('#qm-lesson');
  if (!L || UI.screen !== 'bench') { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'qm-lesson'; document.body.appendChild(el); }
  const st = L.steps[L.i], n = L.steps.length, t = TOPICS.find(x => x.id === L.topic);
  el.innerHTML = L.done ? `<div class="qm-eb">Lesson complete · ${esc(L.wp.n)}</div><h4>${esc(t.n)} — done</h4><p>Recorded in your file. What next?</p><div class="qm-row">${LS.topics(L.wp).filter(x => x.id !== L.topic).map(x => `<button class="btn small" data-lt="${x.id}">${esc(x.n)}</button>`).join('')}<button class="btn small" data-la="replay">Replay</button><button class="btn small" data-la="ask">Ask the Quartermaster</button><button class="btn small" data-la="x">Close</button></div>`
    : `<div class="qm-eb">Lesson · ${esc(L.wp.n)} · ${esc(t.n)} · ${L.i + 1}/${n}</div><h4>${esc(st ? st.title : '')}</h4><p>${esc(st ? st.body : '')}</p><div class="qm-bar"><i style="width:${((L.i + 1) / n * 100).toFixed(1)}%"></i></div>
      <div class="qm-row"><button class="btn small" data-la="prev" ${L.i > 0 ? '' : 'disabled'}>${MANUAL.includes(L.topic) ? '◀ Back' : '⟲ Restart'}</button><button class="btn small primary" data-la="pp">${L.play ? '❚❚ Pause' : '▶ Play'}</button><button class="btn small" data-la="next">Next ▶</button><button class="btn small" data-la="ask">Ask about this</button><button class="btn small" data-la="x">✕</button></div>`;
  el.querySelectorAll('[data-la]').forEach(b => b.onclick = () => {
    const a = b.dataset.la, L2 = LS.cur; if (!L2) return;
    if (a === 'x') return LS.stop();
    if (a === 'pp') { L2.play = !L2.play; if (L2.play) go(L2.i + 1 >= L2.steps.length ? L2.i : L2.i + 1); else { clearTimeout(L2.timer); card(); } return; }
    if (a === 'next') { L2.play = true; return go(L2.i + 1); }
    if (a === 'prev') { if (MANUAL.includes(L2.topic)) return go(Math.max(0, L2.i - 1)); return LS.run(L2.wp.id, L2.topic); }
    if (a === 'replay') return LS.run(L2.wp.id, L2.topic);
    if (a === 'ask') { const s2 = L2.steps[Math.min(L2.i, L2.steps.length - 1)]; QM.open(); QM.prefill(L2.done ? `I just finished the ${t.n.toLowerCase()} lesson on the ${L2.wp.n}. ` : `In the ${L2.wp.n} lesson, about “${s2.title}”: `); }
  });
  el.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => LS.run(L.wp.id, b.dataset.lt));
}
{ const s0 = UI.show; UI.show = function (name) { if (name !== 'bench' && LS.cur) LS.stop(); const r = s0.call(UI, name); return r; }; }

// ================================================================== THE QUARTERMASTER (chat)
const QM = G.QM = { tab: 'chat', open_: false, min: false, busy: false, ai: null, tools: false, mode: 'checking' };
// Claude, when the page runs inside claude.ai; otherwise the built-in engine
(async () => {
  try {
    const s = window.claude && window.claude.use ? await window.claude.use('sample') : null;
    if (s) { QM.ai = s; QM.mode = 'ai'; try { const lim = await s.limits(); QM.tools = !!(lim && lim.tools); } catch (e) { QM.tools = false; } }
    else QM.mode = 'offline';
  } catch (e) { QM.mode = 'offline'; }
  setTimeout(render, 0);
})();
const resolveW = x => { if (!x) return null; const s = String(x); return G.WEAPON[s] || G.WEAPON[s.toLowerCase()] || G.findWeapons(s, 1)[0] || G.searchWeapons(s, { limit: 1 })[0] || null; };
const ERAS = () => Object.fromEntries(G.ERAS.map(e => [e.id, e.name]));
function rulesTurn() {
  const sel = G.WEAPON[UI.sel && UI.sel.wp], rec = G.recordSummary(), tips = G.advice().slice(0, 5).map(t => t.t + ' — ' + t.d);
  return `You are the Quartermaster: the armourer and weapons instructor inside IRONSIGHT ARMORY, a browser gun simulator with ${G.WEAPONS.length} weapons — medieval hand cannons and flintlocks through both world wars to today, artillery from mortars to railway guns, prototypes, and a fictional "Psycho Arsenal". Modes: firing range, solo missions, mass battles, extraction raids, an armory with real attachments, a workshop for custom guns, and a handling bench where every gun can be operated, field-stripped, cleaned and watched working in slow motion.

You can talk about anything to do with weapons: history and development, how mechanisms work, ballistics and ammunition, the game's guns, stats, attachments and builds, tactics in the game, safe handling, cleaning and maintenance, marksmanship, collecting, and legal sporting use.

Tools: use search_weapons, weapon_details and compare_weapons for facts about the game's guns — never invent in-game stats. Use player_record for the player's history and your advice. When the player asks to be shown, taught or walked through something about a gun, call start_lesson (topics: works = how it works in slow motion, strip = field strip, operate = load and fire, malf = clearing malfunctions, clean = cleaning, handling = handling and recoil); it plays an animated lesson on the bench with the gun's own model. show_weapon opens a gun in the armory. remember saves lasting facts about the player (preferences, goals) for future chats.

Safety: never give instructions for manufacturing guns, gun parts, ammunition, explosives or suppressors, for converting guns to automatic fire or other illegal modifications, for getting around laws, permits or background checks, or for hurting anyone. Explaining how mechanisms work at the level of a textbook or a museum is fine. For real-world legal or buying questions, say the law varies and point to local law and licensed dealers.

Style: a friendly, seasoned armourer. Be concise: short paragraphs, bullet lists, a small table (using | ) when comparing. **Bold** sparingly. Quote the game's numbers when they help. When you start a lesson, say in a sentence what they'll see.

Right now the player is on the "${UI.screen}" screen${sel ? ` with the ${sel.n} (id ${sel.id}) selected` : ''}.
Notes you saved about the player: ${T.d.notes.length ? T.d.notes.map(n => '- ' + n).join('\n') : 'none yet'}
Their record: ${JSON.stringify({ totals: rec.totals, topGuns: rec.topGuns.slice(0, 5), lastSessions: rec.recentSessions.slice(0, 3) })}
Current advice: ${tips.join(' | ') || 'none'}`;
}
const TOOLS = () => [
  { name: 'search_weapons', description: 'Search the game’s weapons by words in the name, maker country, cartridge, class or era. Returns up to `limit` weapons with id, name, year, country, class, era and cartridge.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, era: { type: 'string', enum: G.ERAS.map(e => e.id) }, class: { type: 'string', enum: Object.keys(G.CLASS_NAMES) }, limit: { type: 'number' } } },
    execute(i) { status('Searching the armory…'); const opts = { era: i.era ? String(i.era) : undefined, cls: i.class ? String(i.class) : undefined, limit: clamp(+i.limit || 10, 1, 25) }; return G.searchWeapons(String(i.query || ''), opts).map(w => ({ id: w.id, name: w.n, year: w.y, country: w.co, class: G.CLASS_NAMES[w.c], era: ERAS()[w.e], cartridge: w.cal })); } },
  { name: 'weapon_details', description: 'Everything about one weapon in the game: stats, handling sheet, operating system and how it works, condition, the player’s own record with it and the lessons available. Pass an id or a name.', inputSchema: { type: 'object', properties: { weapon: { type: 'string' } }, required: ['weapon'] },
    execute(i) { const w = resolveW(i.weapon); if (!w) throw new Error('No weapon matches ' + i.weapon); status(`Looking up the ${w.n}…`); return G.weaponFacts(w); } },
  { name: 'compare_weapons', description: 'Side-by-side stats and handling for 2-5 weapons (ids or names).', inputSchema: { type: 'object', properties: { weapons: { type: 'array', items: { type: 'string' } } }, required: ['weapons'] },
    execute(i) { const ws = (Array.isArray(i.weapons) ? i.weapons : []).map(resolveW).filter(Boolean).slice(0, 5); if (ws.length < 2) throw new Error('Need at least two recognisable weapons'); status('Comparing ' + ws.map(w => w.n).join(', ') + '…'); return ws.map(w => { const f = G.weaponFacts(w); delete f.howItWorks; delete f.lessons; delete f.notes; return f; }); } },
  { name: 'player_record', description: 'The player’s tracked history: totals, top guns with accuracy and kills, recent sessions, malfunctions cleared, lessons done, saved notes, and a list of computed advice items.', execute() { status('Reading your file…'); return Object.assign(G.recordSummary(), { advice: G.advice() }); } },
  { name: 'start_lesson', description: 'Start an animated lesson on the handling bench with the gun’s own model. topic: works (how it works, slow motion), strip (field strip), operate (load and fire), malf (clearing malfunctions), clean (cleaning), handling (handling and recoil). Returns the lesson’s step titles.', inputSchema: { type: 'object', properties: { weapon: { type: 'string' }, topic: { type: 'string', enum: TOPICS.map(t => t.id) } }, required: ['weapon', 'topic'] },
    execute(i) { const w = resolveW(i.weapon); if (!w) throw new Error('No weapon matches ' + i.weapon); status(`Setting up the ${w.n} on the bench…`); const r = LS.run(w.id, String(i.topic)); QM.minimize(); return r; } },
  { name: 'show_weapon', description: 'Open a weapon in the armory (3D model, attachments, stats).', inputSchema: { type: 'object', properties: { weapon: { type: 'string' } }, required: ['weapon'] },
    execute(i) { const w = resolveW(i.weapon); if (!w) throw new Error('No weapon matches ' + i.weapon); if (G.Game && G.Game.state === 'play') throw new Error('The player is in a game right now'); UI.sel.era = w.e; UI.sel.wp = w.id; UI.show('armory'); QM.minimize(); return { ok: true, opened: w.n }; } },
  { name: 'remember', description: 'Save one short lasting fact about the player (a preference, goal, or something to follow up) for future conversations.', inputSchema: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] },
    execute(i) { const n = String(i.note || '').slice(0, 200); if (!n) throw new Error('empty'); T.d.notes.push(n); T.d.notes = T.d.notes.slice(-30); T.mark(); return { saved: n }; } },
];
let curStatus = null;
function status(t) { if (curStatus) { curStatus.textContent = t; curStatus.style.display = 'block'; } }
QM.send = async function (text) {
  text = String(text || '').trim(); if (!text || QM.busy) return;
  const chat = T.d.chat; chat.push({ role: 'user', content: text }); T.mark();
  QM.busy = true; render(); const out = addBubble('assistant', ''), body = out.querySelector('.qm-txt'); curStatus = out.querySelector('.qm-st');
  if (QM.mode === 'ai' && QM.ai) {
    body.textContent = 'Thinking…'; QM.ctl = new AbortController();
    const turns = [{ role: 'user', content: rulesTurn() }, ...chat.slice(-16).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))];
    try {
      const r = await QM.ai(turns, { cache: false, signal: QM.ctl.signal, onText: ({ text: t }) => { body.innerHTML = md(t); scroll(); }, ...(QM.tools ? { tools: TOOLS() } : {}) });
      body.innerHTML = md(r.text) + (r.truncated ? '<p class="qm-note">(cut short — ask for less at a time)</p>' : '');
      chat.push({ role: 'assistant', content: r.text });
    } catch (e) {
      const keep = e && e.text ? md(e.text) : '';
      if (e && ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) { QM.mode = 'offline'; const a = offline(text); body.innerHTML = a + '<p class="qm-note">Claude isn’t available here, so I answered from my own files.</p>'; chat.push({ role: 'assistant', content: strip(a) }); }
      else if (e && e.code === 'cancelled') { body.innerHTML = keep || '<p class="qm-note">Stopped.</p>'; if (e.text) chat.push({ role: 'assistant', content: e.text }); }
      else if (e && e.code === 'rate_limited') body.innerHTML = keep + '<p class="qm-note">I’m being asked too much at once — give it a minute and try again.</p>';
      else if (e && e.code === 'refused') body.innerHTML = '<p class="qm-note">That’s not something I can help with. Ask me about the guns, how they work, history, maintenance or your shooting.</p>';
      else body.innerHTML = keep + '<p class="qm-note">The line dropped — try again.</p>';
    }
  } else { await sleep(250); const a = offline(text); body.innerHTML = a; chat.push({ role: 'assistant', content: strip(a).slice(0, 3000) }); }
  T.d.chat = chat.slice(-40); T.mark();
  if (curStatus) curStatus.style.display = 'none'; curStatus = null; QM.busy = false; QM.ctl = null; if (!QM.open_) { QM.unread = (QM.unread || 0) + 1; fabLabel(); } renderControls(); scroll();
};

// ---------------------------------------------------------------- the built-in engine (works anywhere, no network)
function table(rows) { return `<table class="qm-tab">${rows.map((r, i) => `<tr>${r.map(c => i ? `<td>${esc(String(c))}</td>` : `<th>${esc(String(c))}</th>`).join('')}</tr>`).join('')}</table>`; }
function factsCard(w) {
  const f = G.weaponFacts(w), h = f.handling && typeof f.handling === 'object' ? f.handling : null;
  return `<p><b>${esc(w.n)}</b> — ${esc(f.class || '')}, ${esc(f.country || '')} ${w.y}${w.psy ? ' (fictional)' : w.proto ? ' (prototype)' : ''}. ${esc(f.cartridge)}, ${esc(f.action)}${f.rpm && !['bolt', 'pump', 'lever'].includes(w.act) ? `, ${f.rpm} rpm` : ''}, ${f.capacity} rounds, ${f.muzzleVelocity} m/s, ${f.weightKg} kg.</p>${f.notes ? `<p>${esc(f.notes)}</p>` : ''}${f.operatingSystem ? `<p><b>${esc(f.operatingSystem)}.</b> ${esc(f.howItWorks || '')}</p>` : ''}${h ? `<p>Handling: ${h.lengthCm} cm, ADS ${h.adsMs} ms, free recoil ${h.freeRecoilJ} J, swing inertia ${h.swingInertia} kg·m².</p>` : ''}${typeof f.yourRecord === 'object' ? `<p>Your record: ${f.yourRecord.shots} shots, ${f.yourRecord.accuracy} accuracy, ${f.yourRecord.kills} kills.</p>` : ''}<div class="qm-row">${act('lesson', w.id, 'works', 'Show me how it works')}${act('lesson', w.id, 'strip', 'Field strip')}${act('armory', w.id, '', 'Open in armory')}</div>`;
}
function act(kind, id, topic, label) { return `<button class="btn small" data-qa="${kind}" data-id="${esc(id)}" data-tp="${esc(topic)}">${esc(label)}</button>`; }
function offline(q) {
  const s = q.toLowerCase(), ws = G.findWeapons(q, 4), sel = G.WEAPON[UI.sel && UI.sel.wp];
  const w = ws[0] || (/\b(it|this|my gun|this gun|the gun)\b/.test(s) ? sel : null);
  const topic = /strip|take (it )?apart|disassembl/.test(s) ? 'strip' : /clean|foul|oil/.test(s) ? 'clean' : /jam|malfunction|stoppage|stovepipe|double feed|misfire|dud/.test(s) ? 'malf' : /load|fire it|shoot it|operate|reload/.test(s) ? 'operate' : /handl|recoil|balance|weight|ads|sway/.test(s) ? 'handling' : /how (does|do) .*work|mechanism|inner|inside|cycle|works/.test(s) ? 'works' : null;
  if (/^(hi|hello|hey|yo|good (morning|evening))\b/.test(s)) return `<p>Quartermaster here. Ask me about any gun in the armory, how it works, how to clean it or clear a jam — or ask how your shooting is going.</p>${QM.mode !== 'ai' ? '<p class="qm-note">I’m running on my own files. Open the game inside claude.ai to talk to me properly.</p>' : ''}`;
  if (/compare|vs\.?|versus|better than|or the/.test(s) && ws.length >= 2) {
    const fs = ws.map(G.weaponFacts), row = (n, f) => [n, ...fs.map(f)];
    return `<p>Side by side:</p>${table([['', ...fs.map(f => f.name)], row('Year', f => f.year), row('Cartridge', f => f.cartridge), row('Action', f => f.action), row('Rate', f => f.rpm ? f.rpm + ' rpm' : '—'), row('Capacity', f => f.capacity), row('Velocity', f => f.muzzleVelocity + ' m/s'), row('Damage', f => f.damage), row('Spread', f => f.dispersionMOA + ' MOA'), row('Weight', f => f.weightKg + ' kg'), row('ADS', f => f.handling && f.handling.adsMs ? f.handling.adsMs + ' ms' : '—'), row('Recoil', f => f.handling && f.handling.freeRecoilJ ? f.handling.freeRecoilJ + ' J' : '—')])}<p>${(() => { const a = fs[0], b = fs[1]; const pts = []; if (a.damage !== b.damage) pts.push(`${a.damage > b.damage ? a.name : b.name} hits harder`); if (a.rpm && b.rpm && a.rpm !== b.rpm) pts.push(`${a.rpm > b.rpm ? a.name : b.name} fires faster`); if (a.dispersionMOA !== b.dispersionMOA) pts.push(`${a.dispersionMOA < b.dispersionMOA ? a.name : b.name} is more accurate`); if (a.handling && b.handling && a.handling.adsMs && b.handling.adsMs) pts.push(`${a.handling.adsMs < b.handling.adsMs ? a.name : b.name} handles quicker`); return pts.join('; ') + '.'; })()}</p>`;
  }
  if (topic && (w || sel)) { const g = w || sel; try { LS.run(g.id, topic); QM.minimize(); return `<p>Setting the <b>${esc(g.n)}</b> up on the bench: <b>${esc(TOPICS.find(t => t.id === topic).n.toLowerCase())}</b>. Watch the lesson card over the gun — pause, step back or ask me about any step.</p>`; } catch (e) { return `<p>${esc(e.message)}</p>`; } }
  if (/advice|improve|tips?|how am i doing|my stats|my record|progress|what should i/.test(s)) { const tips = G.advice(), r = G.recordSummary(); return `<p>Your file: ${r.totals.shots} shots, ${r.totals.accuracy} accuracy, ${r.totals.kills} kills, ${r.totals.deaths} deaths over ${r.totals.hoursPlayed} h.</p><ul>${tips.map(t => `<li><b>${esc(t.t)}.</b> ${esc(t.d)}${t.gun && t.k === 'clean' ? ' ' + act('lesson', t.gun, 'clean', 'Clean it') : t.lesson ? ' ' + act('lesson', t.gun, t.lesson, 'Start lesson') : ''}</li>`).join('')}</ul>`; }
  const best = s.match(/best|recommend|suggest|top/);
  if (best) { const cls = Object.entries({ SR: /sniper/, DMR: /marksman|dmr/, AR: /assault/, BR: /battle rifle/, CAR: /carbine/, SMG: /smg|submachine/, LMG: /machine ?gun|lmg/, SG: /shotgun/, PST: /pistol|handgun|sidearm|revolver/, MUS: /musket/, ART: /howitzer|field gun/, MOR: /mortar/ }).find(([, re]) => re.test(s)); const era = G.ERAS.find(e => s.includes(e.name.toLowerCase()) || s.includes(e.id));
    if (cls || era) { const list = G.WEAPONS.filter(x => (!cls || x.c === cls[0]) && (!era || x.e === era.id) && !x.psy).map(x => [x, statsOf(x)]).map(([x, S]) => [x, S, S.dmg * Math.sqrt(S.rpm || 30) / Math.max(.5, S.acc) / (.6 + S.ads)]).sort((a, b) => b[2] - a[2]).slice(0, 5);
      return `<p>By an all-round score (damage × rate ÷ spread ÷ handling), the strongest ${cls ? (G.CLASS_NAMES[cls[0]] || '').toLowerCase() + 's' : 'guns'}${era ? ' of the ' + esc(era.name) + ' era' : ''}:</p>${table([['Weapon', 'Damage', 'Rate', 'Spread', 'ADS'], ...list.map(([x, S]) => [x.n, Math.round(S.dmg), S.rpm || '—', S.acc.toFixed(1) + ' MOA', Math.round(S.ads * 1000) + ' ms'])])}<p>“Best” depends on the job — tell me the mode and range and I’ll narrow it down.</p>`; } }
  if (w) return factsCard(w);
  if (/safe|safety|rules/.test(s)) return '<p><b>The four rules:</b></p><ul><li>Treat every gun as loaded.</li><li>Never point it at anything you aren’t willing to destroy.</li><li>Finger off the trigger until your sights are on the target.</li><li>Know your target and what is beyond it.</li></ul>';
  return `<p>I can:</p><ul><li>tell you about any of the ${G.WEAPONS.length} guns — try “tell me about the Lee–Enfield”</li><li>compare guns — “M4A1 vs AK-47”</li><li>teach on the bench — “show me how the MG 42 works”, “field strip the Glock 17”, “how do I clear a double feed on the M16A1?”, “clean my Brown Bess”</li><li>go through your record — “how am I doing?”</li><li>recommend — “best WW2 SMG”</li></ul>${QM.mode !== 'ai' ? '<p class="qm-note">Free conversation needs the game opened inside claude.ai; here I answer from my own files.</p>' : ''}`;
}

// ---------------------------------------------------------------- markdown-lite for Claude’s replies
function md(t) {
  const lines = esc(String(t)).split('\n'); let out = '', list = null, tbl = [];
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const flushT = () => { if (!tbl.length) return; const rows = tbl.filter(r => !/^\|?\s*:?-{2,}/.test(r)); out += '<table class="qm-tab">' + rows.map((r, i) => '<tr>' + r.replace(/^\||\|$/g, '').split('|').map(c => i ? `<td>${inl(c.trim())}</td>` : `<th>${inl(c.trim())}</th>`).join('') + '</tr>').join('') + '</table>'; tbl = []; };
  const flushL = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const l of lines) {
    if (/^\s*\|.*\|\s*$/.test(l)) { flushL(); tbl.push(l.trim()); continue; } flushT();
    let m;
    if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += `<li>${inl(m[1])}</li>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += `<li>${inl(m[1])}</li>`; }
    else if ((m = l.match(/^#{1,4}\s+(.*)/))) { flushL(); out += `<p><b>${inl(m[1])}</b></p>`; }
    else if (l.trim()) { flushL(); out += `<p>${inl(l)}</p>`; } else flushL();
  }
  flushT(); flushL(); return out;
}

// ---------------------------------------------------------------- the panel
const css = document.createElement('style');
css.textContent = `
#qm-fab{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:8px;padding:10px 14px 10px 10px;border:1px solid var(--brass);background:var(--panel2);color:var(--brass2);font:600 14px var(--f-ui);letter-spacing:.06em;text-transform:uppercase;border-radius:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.45)}
#qm-fab i{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--brass);color:#16140c;font:700 13px var(--f-mono);font-style:normal}
#qm-fab:hover{background:#262b20}
#qm{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);z-index:71;background:var(--bg);border-left:1px solid var(--line2);display:flex;flex-direction:column;color:var(--fg);font:15px/1.45 var(--f-ui);box-shadow:-10px 0 30px rgba(0,0,0,.5)}
#qm header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
#qm header b{font:700 20px var(--f-display);letter-spacing:.04em;color:var(--brass2)}
#qm header .qm-mode{font:11px var(--f-mono);color:var(--muted);margin-left:auto}
#qm header button{background:none;border:1px solid var(--line2);color:var(--fg);width:30px;height:30px;border-radius:2px;cursor:pointer}
#qm nav{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--line)}
#qm .qm-body{flex:1;overflow:auto;padding:12px 14px}
#qm .qm-msg{margin:0 0 12px;max-width:94%}
#qm .qm-msg.user{margin-left:auto;background:#22281c;border:1px solid var(--line2);padding:8px 11px;border-radius:10px 10px 2px 10px}
#qm .qm-msg.assistant{border-left:2px solid var(--brass);padding:2px 0 2px 10px}
#qm .qm-msg p{margin:0 0 8px}#qm .qm-msg ul,#qm .qm-msg ol{margin:0 0 8px;padding-left:20px}
#qm .qm-st{display:none;font:12px var(--f-mono);color:var(--brass);margin:2px 0 6px}
#qm .qm-note{font-size:12px;color:var(--muted)}
#qm .qm-tab{border-collapse:collapse;margin:6px 0 10px;font-size:13px;width:100%}#qm .qm-tab th,#qm .qm-tab td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}#qm .qm-tab th{color:var(--brass2);font-weight:600}
#qm .qm-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}
#qm .qm-chips button{font-size:12px}
#qm .qm-in{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line)}
#qm .qm-in textarea{flex:1;resize:none;height:44px;background:var(--panel2);border:1px solid var(--line2);color:var(--fg);font:15px var(--f-ui);padding:8px 10px;border-radius:2px}
#qm .qm-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px}
#qm .qm-tiles div{border:1px solid var(--line);padding:8px}#qm .qm-tiles b{display:block;font:700 20px var(--f-mono);color:var(--brass2)}#qm .qm-tiles span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
#qm .qm-tip{border:1px solid var(--line);border-left:3px solid var(--brass);padding:8px 10px;margin-bottom:8px}
#qm .qm-tip b{display:block}
#qm .qm-h{font:600 12px var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
.qm-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#qm-lesson{position:fixed;left:max(16px,calc(50vw - 300px));top:96px;width:min(560px,calc(100vw - 32px));z-index:69;background:var(--panel);border:1px solid var(--brass);padding:12px 14px;color:var(--fg);font:15px/1.45 var(--f-ui);box-shadow:0 8px 24px rgba(0,0,0,.5)}
@media (min-width:1100px){#qm-lesson{left:320px;width:min(520px,calc(100vw - 760px))}}
#qm-lesson h4{margin:2px 0 6px;font-size:19px;color:var(--brass2)}#qm-lesson p{margin:0 0 8px;font-size:14px}
#qm-lesson .qm-eb{font:600 11px var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
#qm-lesson .qm-bar{height:3px;background:var(--line);margin:6px 0}#qm-lesson .qm-bar i{display:block;height:100%;background:var(--brass)}
`;
document.head.appendChild(css);
const fab = document.createElement('button'); fab.id = 'qm-fab'; fab.innerHTML = '<i>QM</i><span>Quartermaster</span>'; fab.setAttribute('aria-label', 'Open the Quartermaster'); document.body.appendChild(fab);
fab.onclick = () => QM.open();
function fabLabel() { fab.querySelector('span').textContent = QM.unread ? `Quartermaster · ${QM.unread} new` : 'Quartermaster'; }
let panel = null;
QM.open = () => { QM.open_ = true; QM.min = false; QM.unread = 0; fabLabel(); render(); setTimeout(() => { const ta = panel && panel.querySelector('textarea'); if (ta && QM.tab === 'chat') ta.focus(); }, 30); };
QM.close = () => { QM.open_ = false; render(); };
QM.minimize = () => { QM.open_ = false; QM.min = true; render(); };
QM.prefill = t => { QM.tab = 'chat'; render(); const ta = panel.querySelector('textarea'); if (ta) { ta.value = t; ta.focus(); } };
const scroll = () => { const b = panel && panel.querySelector('.qm-body'); if (b) b.scrollTop = b.scrollHeight; };
function addBubble(role, html) { const b = panel.querySelector('.qm-body'); const d = document.createElement('div'); d.className = 'qm-msg ' + role; d.innerHTML = role === 'assistant' ? `<div class="qm-st"></div><div class="qm-txt">${html}</div>` : esc(html); b.appendChild(d); scroll(); return d; }
const CHIPS = () => { const sel = G.WEAPON[UI.sel && UI.sel.wp]; const n = sel ? sel.n : 'AK-47'; return [`Show me how the ${n} works`, `Field strip the ${n}`, 'How am I doing? Any advice?', `Teach me to clear a double feed`, 'Compare the M1 Garand and the Kar98k', 'What was the first assault rifle?']; };
function render() {
  const play = G.Game && G.Game.state === 'play' && UI.screen === 'none';
  fab.style.display = QM.open_ || play ? 'none' : 'flex';
  if (!QM.open_ || play) { if (panel) { panel.remove(); panel = null; } return; }
  if (!panel) { panel = document.createElement('section'); panel.id = 'qm'; panel.setAttribute('aria-label', 'Quartermaster'); document.body.appendChild(panel); }
  const modeTxt = QM.mode === 'ai' ? 'Claude · online' : QM.mode === 'checking' ? 'connecting…' : 'built-in · offline';
  panel.innerHTML = `<header><i style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--brass);color:#16140c;font:700 13px var(--f-mono);font-style:normal">QM</i><b>Quartermaster</b><span class="qm-mode">${modeTxt}</span><button data-q="min" title="Minimise">–</button><button data-q="x" title="Close">✕</button></header>
    <nav>${[['chat', 'Chat'], ['record', 'Your record'], ['lessons', 'Lessons']].map(([k, n]) => `<button class="chip ${QM.tab === k ? 'on' : ''}" data-qt="${k}">${n}</button>`).join('')}</nav>
    <div class="qm-body"></div>${QM.tab === 'chat' ? `<div class="qm-chips"></div><div class="qm-in"><textarea placeholder="Ask about any weapon, a lesson, or your shooting…" aria-label="Message"></textarea><button class="btn small primary" data-q="send">Send</button></div>` : ''}`;
  panel.querySelector('[data-q=x]').onclick = QM.close; panel.querySelector('[data-q=min]').onclick = QM.minimize;
  panel.querySelectorAll('[data-qt]').forEach(b => b.onclick = () => { QM.tab = b.dataset.qt; render(); });
  const body = panel.querySelector('.qm-body');
  if (QM.tab === 'chat') {
    if (!T.d.chat.length) addBubble('assistant', `<p>Quartermaster here. I keep the books on every gun you’ve fired, and I can teach you any of the ${G.WEAPONS.length} in the armory on the bench — how it works, field stripping, loading, clearing jams, cleaning.</p><p>Ask me anything about weapons, or pick a suggestion below.</p>${QM.mode === 'offline' ? '<p class="qm-note">Running on my own files here — open the game inside claude.ai for full conversation.</p>' : ''}`);
    for (const m of T.d.chat.slice(-30)) { const d = addBubble(m.role, m.role === 'assistant' ? md(m.content) : m.content); }
    const ta = panel.querySelector('textarea'), sendB = panel.querySelector('[data-q=send]');
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = ta.value; ta.value = ''; QM.send(v); } e.stopPropagation(); };
    ta.onkeyup = ta.onkeypress = e => e.stopPropagation();
    sendB.onclick = () => { if (QM.busy && QM.ctl) { QM.ctl.abort(); return; } const v = ta.value; ta.value = ''; QM.send(v); };
    renderControls(); scroll();
  } else if (QM.tab === 'record') body.innerHTML = recordHTML();
  else body.innerHTML = lessonsHTML();
  bindActions(body);
}
function renderControls() {
  if (!panel) return; const ch = panel.querySelector('.qm-chips'), sendB = panel.querySelector('[data-q=send]');
  if (sendB) sendB.textContent = QM.busy ? 'Stop' : 'Send';
  if (ch) { ch.innerHTML = QM.busy ? '' : CHIPS().map(c => `<button class="chip">${esc(c)}</button>`).join(''); ch.querySelectorAll('button').forEach(b => b.onclick = () => QM.send(b.textContent)); }
  bindActions(panel.querySelector('.qm-body'));
}
function bindActions(root) {
  if (!root) return;
  root.querySelectorAll('[data-qa]').forEach(b => { if (b._qm) return; b._qm = 1; b.onclick = () => {
    const k = b.dataset.qa, id = b.dataset.id, tp = b.dataset.tp;
    try { if (k === 'lesson') { LS.run(id, tp); QM.minimize(); } else if (k === 'armory') { const w = G.WEAPON[id]; UI.sel.era = w.e; UI.sel.wp = id; UI.show('armory'); QM.minimize(); } else if (k === 'reset') { if (confirm('Wipe your whole record and chat history?')) { T.reset(); render(); } } else if (k === 'pick') { QM.lw = id; render(); } }
    catch (e) { alert(e.message); }
  }; });
  const si = root.querySelector('#qm-ls'); if (si) { si.oninput = () => { const r = root.querySelector('#qm-lr'); r.innerHTML = G.searchWeapons(si.value, { limit: 8 }).map(w => `<button class="chip" data-qa="pick" data-id="${w.id}">${esc(w.n)}</button>`).join(''); bindActions(r); }; si.onkeydown = e => e.stopPropagation(); }
}
function recordHTML() {
  const r = G.recordSummary(), t = r.totals, tips = G.advice();
  return `<div class="qm-tiles"><div><b>${t.shots}</b><span>shots</span></div><div><b>${t.accuracy}</b><span>accuracy</span></div><div><b>${t.kills}</b><span>kills</span></div><div><b>${t.headshots}</b><span>headshots</span></div><div><b>${t.deaths}</b><span>deaths</span></div><div><b>${t.hoursPlayed}</b><span>hours</span></div></div>
    <div class="qm-h">Advice</div>${tips.map(x => `<div class="qm-tip"><b>${esc(x.t)}</b>${esc(x.d)}${x.gun ? `<div class="qm-row">${x.k === 'clean' ? act('lesson', x.gun, 'clean', 'Cleaning lesson') : x.lesson ? act('lesson', x.gun, x.lesson, 'Start lesson') : act('lesson', x.gun, 'handling', 'Handling lesson')}${act('armory', x.gun, '', 'Open in armory')}</div>` : ''}</div>`).join('')}
    <div class="qm-h">Your guns</div>${r.topGuns.length ? table([['Gun', 'Shots', 'Acc', 'Kills', 'HS', 'Min'], ...r.topGuns.map(g => [g.name, g.shots, g.accuracy, g.kills, g.headshots, g.minutes])]) : '<p class="qm-note">Nothing yet.</p>'}
    <div class="qm-h">Recent sessions</div>${r.recentSessions.length ? table([['When', 'Mode', 'Map', 'Result', 'Acc', 'K/D'], ...r.recentSessions.map(s => [s.when.slice(5), s.kind, s.map, s.result || '—', s.accuracy, `${s.kills}/${s.deaths}`])]) : '<p class="qm-note">No sessions yet.</p>'}
    ${Object.keys(r.malfunctionsCleared).length ? `<div class="qm-h">Stoppages</div><p>${Object.entries(r.malfunctionsCleared).map(([k, n]) => `${esc(k)} × ${n}`).join(' · ')}</p>` : ''}
    ${r.notes.length ? `<div class="qm-h">What I remember about you</div><ul>${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <p class="qm-note">Tracking since ${new Date(T.d.since).toLocaleDateString()} · kept in this browser only.</p><div class="qm-row">${act('reset', '', '', 'Reset my record')}</div>`;
}
function lessonsHTML() {
  const w = G.WEAPON[QM.lw] || G.WEAPON[UI.sel && UI.sel.wp] || G.WEAPON.ak47; QM.lw = w.id;
  const done = T.d.lessons[w.id] || {};
  return `<p>Animated lessons play on the handling bench with the gun’s own model and mechanism.</p><div class="qm-h">Gun</div><p><b>${esc(w.n)}</b> <span class="qm-note">${esc(G.CLASS_NAMES[w.c] || '')} · ${w.y}</span></p>
    <input id="qm-ls" placeholder="Pick another gun…" style="width:100%;background:var(--panel2);border:1px solid var(--line2);color:var(--fg);padding:8px;font:15px var(--f-ui)"><div id="qm-lr" class="qm-row"></div>
    <div class="qm-h">Lessons</div>${LS.topics(w).map(t => `<div class="qm-tip"><b>${done[t.id] ? '✓ ' : ''}${esc(t.n)}</b>${esc(t.d)}<div class="qm-row">${act('lesson', w.id, t.id, done[t.id] ? 'Replay' : 'Start')}</div></div>`).join('')}`;
}
setInterval(() => { const play = G.Game && G.Game.state === 'play' && UI.screen === 'none'; fab.style.display = QM.open_ || play ? 'none' : 'flex'; if (play && panel) { panel.remove(); panel = null; QM.open_ = false; } if (UI.screen !== 'bench' && LS.cur) LS.stop(); }, 500);
})();
