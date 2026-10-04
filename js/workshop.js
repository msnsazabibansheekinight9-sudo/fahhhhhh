// ============================================================================
// IRONSIGHT — weapon workshop screen: my guns · merge · build from scratch ·
// custom attachments. Live 3D preview in the showroom, live stat bars, save to
// the Workshop era, and one-click tests in every mode.
// ============================================================================
'use strict';
(function () {
const G = window.G, CW = G.Custom, UI = G.UI, SR = UI.showroom, esc = UI.esc;
const $ = (s, r = document) => r.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const WS = G.Workshop = { tab: 'mine', sel: null, draft: null, mergeIds: [], mergeName: '', q: '', era: 'all', attDraft: null, attGun: null };
const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? undefined : a[k], o);
const setP = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (a[k] == null || typeof a[k] !== 'object') a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; } if (v === undefined) delete a[ks[ks.length - 1]]; else a[ks[ks.length - 1]] = v; };

// workshop guns trade at a premium in extraction: more donors and special mechanics cost more
const pw0 = G.priceWeapon;
if (pw0) G.priceWeapon = (wp, L) => !wp || !wp.custom ? pw0(wp, L) : Math.round(pw0(wp, L) * (1.2 + (wp.donors || []).length * .35 + ['he', 'homing', 'spin', 'charge', 'salvo', 'inc', 'gyro', 'intSup'].filter(k => wp[k]).length * .4 + (wp.m.x || []).filter(x => /^xs_/.test(x)).length * .1));
// custom-era guns never show up in enemy hands
const eraW0 = G.eraWeapons;
G.eraWeapons = (era, cls) => eraW0(era === 'custom' ? 'now' : era, cls);

const css = document.createElement('style');
css.textContent = `
#workshop, #bench { display: grid; grid-template-columns: minmax(250px, 300px) 1fr minmax(320px, 400px); pointer-events: none; }
#workshop > *, #bench > * { pointer-events: auto; }
#workshop .stage, #bench .stage, #armory .stage { pointer-events: none; } #armory .stage .top, #armory .stage .actions, #workshop .stage .top, #workshop .stage .actions, #bench .stage .top, #bench .stage .actions, #bench .stage .benchhud { pointer-events: auto; }
.wsf { display: flex; flex-direction: column; gap: 4px; padding: 6px 16px; }
.wsf > span { font: 600 11px var(--f-mono); letter-spacing: .08em; color: var(--muted); text-transform: uppercase; display: flex; justify-content: space-between; gap: 8px; }
.wsf b { color: var(--brass2); font-weight: 600; text-transform: none; }
.wsf input[type=text], .wsf input[type=number], .wsq, .wsta { background: var(--panel2); color: var(--fg); border: 1px solid var(--line2); padding: 7px 9px; font: 600 14px var(--f-ui); border-radius: 2px; user-select: text; -webkit-user-select: text; width: 100%; box-sizing: border-box; }
.wsta { font: 12px var(--f-mono); min-height: 160px; resize: vertical; }
.wsf select { padding: 6px 8px; font-size: 14px; }
.wsc { display: flex; align-items: center; gap: 7px; padding: 4px 16px; font-size: 14px; cursor: pointer; }
.wsc small { color: var(--muted); font-size: 11.5px; display: block; }
details.wsd { border-bottom: 1px solid var(--line); }
details.wsd > summary { cursor: pointer; padding: 11px 16px; font: 600 12px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--brass); list-style: none; }
details.wsd > summary::before { content: '▸ '; } details.wsd[open] > summary::before { content: '▾ '; }
.wsx { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0 0 8px; }
.wsx .wsc { padding: 3px 10px 3px 16px; font-size: 13px; align-items: flex-start; }
.wserr { margin: 8px 16px; padding: 8px 10px; border: 1px solid #a33; color: #f09a8a; font-size: 13px; }
.wsok { margin: 8px 16px; padding: 8px 10px; border: 1px solid #5a8a3a; color: #a6d98a; font-size: 13px; }
.wsfeat { display: grid; grid-template-columns: 120px 1fr; gap: 3px 10px; padding: 8px 16px; font-size: 13px; }
.wsfeat dt { font: 600 10.5px var(--f-mono); letter-spacing: .08em; color: var(--dim); text-transform: uppercase; padding-top: 2px; }
.wsfeat dd { margin: 0; }
.wssel { display: flex; flex-direction: column; gap: 3px; padding: 8px 14px; border-bottom: 1px solid var(--line); }
.wssel > div { display: flex; gap: 6px; align-items: center; font-size: 13px; }
.wssel > div b { flex: 1; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wssel button { background: transparent; border: 1px solid var(--line2); color: var(--muted); font-size: 11px; padding: 2px 6px; border-radius: 2px; }
.wsbox { display: inline-block; width: 15px; height: 15px; margin-right: 7px; vertical-align: -2px; border: 1px solid var(--brass); border-radius: 2px; color: #16140c; font: 700 11px/15px var(--f-mono); text-align: center; }
.wsbox.on { background: var(--brass); }
.wsempty { padding: 20px 16px; color: var(--muted); font-size: 14px; line-height: 1.5; }
.wsbtns { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
@media (max-width: 900px) { #workshop, #bench { grid-template-columns: 1fr; grid-template-rows: 38vh 1fr auto; overflow-y: auto; } #workshop .col.left, #bench .col.left { max-height: 38vh; } #workshop .stage, #bench .stage { min-height: 42vh; } #workshop .col.right, #bench .col.right { border-left: 0; } }
`;
document.head.appendChild(css);

// ------------------------------------------------------------------ editor fields
const MODES = [['semi', 'Semi'], ['auto', 'Full auto'], ['burst2', '2-round burst'], ['burst3', '3-round burst'], ['bolt', 'Bolt'], ['pump', 'Pump'], ['lever', 'Lever']];
const ACTS = [['semi', 'Semi-automatic'], ['auto', 'Selective fire (closed bolt)'], ['auto_ob', 'Open bolt'], ['bolt', 'Bolt action'], ['lever', 'Lever action'], ['pump', 'Pump action'], ['rev', 'Double-action revolver']];
let FIELDS = null, FMAP = {};
function fields() {
  if (FIELDS) return FIELDS;
  const V = CW.vocab(), o = k => Array.from(V[k].keys()).sort().map(v => [v, CW.partName(k, v)]);
  const R = (k, l, min, max, st, u) => ({ k, l, t: 'rng', min, max, st, u });
  FIELDS = [
    ['Identity', [{ k: 'n', l: 'Name', t: 'text' }, { k: 'c', l: 'Class', t: 'sel', o: Object.entries(G.CLASS_NAMES) }, { k: 'co', l: 'Maker', t: 'text' }, { k: 'y', l: 'Year', t: 'num', min: 1800, max: 2200 }, { k: 'blurb', l: 'Notes', t: 'text' }]],
    ['Receiver & action', [{ k: 'm.t', l: 'Receiver', t: 'sel', o: o('t') }, R('m.R.0', 'Receiver length', .06, .7, .005, 'm'), R('m.R.1', 'Receiver height', .02, .14, .002, 'm'), R('m.R.2', 'Receiver width', .015, .09, .001, 'm'), { k: 'm.bh', l: 'Bolt / slide / charging handle', t: 'sel', o: o('bh') }, { k: 'm.grip', l: 'Grip', t: 'sel', o: o('grip') }, { k: 'm.stk', l: 'Stock', t: 'sel', o: o('stk') }]],
    ['Barrel & front end', [R('m.B.0', 'Barrel length', .04, 1.4, .005, 'm'), R('m.B.1', 'Barrel radius', .003, .025, .0005, 'm'), { k: 'm.mz', l: 'Muzzle', t: 'sel', o: o('mz') }, { k: 'm.hg.0', l: 'Handguard', t: 'sel', o: o('hg'), on: v => { const s = CW.vocab().hg.get(v); const len = getP(WS.draft, 'm.hg.1'); WS.draft.m.hg = s && s.smp ? clone(s.smp) : [v, .2]; if (len) WS.draft.m.hg[1] = len; }, re: 1 }, R('m.hg.1', 'Handguard length', 0, .8, .005, 'm'), { k: 'm.bip', l: 'Folding bipod', t: 'chk', num: 1 }]],
    ['Feed', [{ k: 'm.mag.0', l: 'Magazine body', t: 'sel', o: o('mag'), on: v => { const s = CW.vocab().mag.get(v); WS.draft.m.mag = s && s.smp ? clone(s.smp) : [v, .15]; }, re: 1 }, R('m.mag.1', 'Magazine length', .02, .45, .005, 'm'), R('m.mag.2', 'Magazine curve', 0, .8, .01), { k: 'cal', l: 'Cartridge', t: 'sel', o: Object.keys(G.CAL).map(c => [c, c]) }, R('mag', 'Capacity', 1, 1000, 1, 'rds'), { k: 'tubeLoad', l: 'Loaded one round at a time', t: 'chk' }]],
    ['Sights & finish', [{ k: 'm.sgt', l: 'Sights', t: 'sel', o: o('sgt') }, { k: 'm.pl', l: 'Polymer colour', t: 'sel', o: o('pl') }, { k: 'm.mt', l: 'Metal finish', t: 'sel', o: o('mt') }, { k: 'm.wd', l: 'Wood', t: 'sel', o: o('wd'), none: 1 }, { k: 'defOptic', l: 'Factory optic', t: 'sel', o: G.ATTACH.filter(a => a.slot === 'optic' && a.id !== 'irons' && !a.cust).map(a => [a.id, a.n]), none: 1 }]],
    ['Mechanics', [{ k: 'act', l: 'Action', t: 'sel', o: ACTS }, { k: 'modes', l: 'Fire modes', t: 'modes' }, R('rpm', 'Rate of fire', 20, 6000, 10, 'rpm'), R('burstRpm', 'Burst rate (0 = same)', 0, 6000, 50, 'rpm'), R('v', 'Muzzle velocity', 30, 3500, 5, 'm/s'), R('dmg', 'Damage per projectile', 5, 500, 1), R('pellets', 'Projectiles per shot', 1, 40, 1), R('acc', 'Dispersion', .1, 25, .1, 'MOA'), R('rec.0', 'Vertical recoil', .05, 9, .05), R('rec.1', 'Horizontal recoil', .02, 3, .02), R('rl.0', 'Reload (rounds left)', .4, 10, .1, 's'), R('rl.1', 'Reload (empty)', .4, 10, .1, 's'), R('wt', 'Weight', .3, 40, .05, 'kg')]],
    ['Special mechanics', [R('spin', 'Rotary spin-up (0 = off)', 0, 3, .05, 's'), R('charge', 'Coil charge time (0 = off)', 0, 4, .05, 's'), R('salvo', 'Barrels fired at once', 1, 8, 1), R('he.r', 'Explosive radius (0 = off)', 0, 8, .1, 'm'), R('he.dmg', 'Explosive damage', 0, 300, 5), R('homing', 'Seeker turn rate (0 = off)', 0, 6, .1, 'rad/s'), R('gyro.v', 'Rocket rounds top speed (0 = off)', 0, 1000, 10, 'm/s'), R('gyro.burn', 'Rocket burn time', 0, .6, .01, 's'),
      { k: 'inc', l: 'Incendiary rounds', t: 'chk' }, { k: 'intSup', l: 'Integral suppressor', t: 'chk' }, { k: 'duplex', l: 'Duplex rounds (two bullets per case)', t: 'chk' }, { k: 'caseless', l: 'Caseless (no ejected cases)', t: 'chk' }, { k: 'hyper', l: 'Hyperburst (recoil felt after the burst)', t: 'chk' }, { k: 'heavy', l: 'Heavy weapon (slow handling)', t: 'chk' }, { k: 'anyAtt', l: 'Accepts every attachment in the game', t: 'chk' }]],
    ['Extra parts', [{ t: 'x' }]],
  ];
  for (const [, fs] of FIELDS) for (const f of fs) if (f.k) FMAP[f.k] = f;
  return FIELDS;
}
const fmt = (v, f) => v === undefined || v === null || v === '' ? '—' : (f.st >= 1 ? Math.round(v) : (+v).toFixed(f.st < .001 ? 4 : f.st < .01 ? 3 : 2)) + (f.u ? ' ' + f.u : '');
function fieldHTML(f, d) {
  if (f.t === 'x') {
    const V = CW.vocab(), X = d.m.x || [];
    return `<div class="lbl" style="padding:4px 16px 0">Workshop-only parts</div><div class="wsx">${CW.XS.map(([id, n, ds]) => `<label class="wsc" title="${esc(ds)}"><input type="checkbox" data-x="${id}" ${X.includes(id) ? 'checked' : ''}><span>${esc(n)}<small>${esc(ds)}</small></span></label>`).join('')}</div>
      <div class="lbl" style="padding:4px 16px 0">Parts from real guns</div><div class="wsx">${Array.from(V.x.keys()).sort().map(id => `<label class="wsc" title="As on the ${esc(V.x.get(id).ex || '')}"><input type="checkbox" data-x="${id}" ${X.includes(id) ? 'checked' : ''}><span>${esc(CW.partName('x', id))}<small>${esc(V.x.get(id).ex || '')}</small></span></label>`).join('')}</div>`;
  }
  const v = getP(d, f.k);
  if (f.t === 'text') return `<label class="wsf"><span>${f.l}</span><input type="text" data-f="${f.k}" value="${esc(v ?? '')}" maxlength="80"></label>`;
  if (f.t === 'num') return `<label class="wsf"><span>${f.l}</span><input type="number" data-f="${f.k}" value="${esc(v ?? '')}" min="${f.min}" max="${f.max}"></label>`;
  if (f.t === 'sel') return `<label class="wsf"><span>${f.l}</span><select data-f="${f.k}">${f.none ? `<option value="">— none —</option>` : ''}${f.o.map(([val, n]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  if (f.t === 'rng') return `<label class="wsf"><span>${f.l} <b data-o="${f.k}">${fmt(v ?? (f.min > 0 ? f.min : 0), f)}</b></span><input type="range" data-f="${f.k}" min="${f.min}" max="${f.max}" step="${f.st}" value="${v ?? (f.min > 0 ? f.min : 0)}"></label>`;
  if (f.t === 'chk') return `<label class="wsc"><input type="checkbox" data-f="${f.k}" ${v ? 'checked' : ''}> ${f.l}</label>`;
  if (f.t === 'modes') return `<div class="wsf"><span>${f.l}</span><div style="display:flex;flex-wrap:wrap;gap:4px 10px">${MODES.map(([m, n]) => `<label class="wsc" style="padding:2px 0"><input type="checkbox" data-mode="${m}" ${(d.modes || []).includes(m) ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>`;
  return '';
}

// ------------------------------------------------------------------ shared panels
function statsHTML(wp, L, base) {
  const S = G.resolveStats(wp, L), b = UI.statBars(wp, S), b0 = base ? UI.statBars(base.wp, G.resolveStats(base.wp, base.L)) : b;
  const blen = Math.round((wp.m.B ? wp.m.B[0] : (wp.m.L || 0)) * S.blen * 1000);
  const spec = [['Rate of fire', S.modes.includes('bolt') ? `~${wp.rpm} rpm (aimed)` : `${Math.round(S.rpm)} rpm`], ['Capacity', `${S.mag} rds`], ['Cartridge', wp.cal], ['Muzzle velocity', `${Math.round(S.v)} m/s`], ['Weight', `${S.wt ? S.wt.toFixed(2) : wp.wt} kg`], ['Barrel', `${blen} mm`], ['Fire modes', S.modes.join(' / ')], ['Dispersion', `${S.acc.toFixed(1)} MOA`]];
  return `<dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><div class="bars">${UI.barsHTML(b, b0, !!base)}</div>`;
}
// pull the camera back so the whole gun fits in the stage between the two side columns
UI.stageFit = () => { const w = G.E.W || innerWidth; return w <= 900 ? 1.2 : Math.min(2.2, Math.max(1.05, w / Math.max(300, w - 700) * .78)); };
function showGun(wp, L) {
  try { SR.show(wp, L || UI.loadoutFor(wp)); SR.auto = false; SR.dist = SR.fit * UI.stageFit(); return null; } catch (e) { console.warn(e); return e.message || String(e); }
}
function note(html, ok) { const n = $('#wsnote'); if (n) { n.innerHTML = html ? `<div class="${ok ? 'wsok' : 'wserr'}">${html}</div>` : ''; } }
WS.test = function (wp, where) {
  UI.sel.era = 'custom'; UI.sel.wp = wp.id; UI.store.set('sel', UI.sel);
  if (where === 'range') UI.startRange();
  else if (where === 'mission') UI.missionPicker(wp);
  else if (where === 'battle') { const M = UI.mis; if (wp.c === 'PST') M.secondary = wp.id; else M.primary = wp.id; UI.store.set('mis', M); UI.show('battle'); }
  else if (where === 'extraction') { const X = G.Raid; X.stash.items.push({ t: 'w', id: wp.id, L: UI.loadoutFor(wp), u: CW.uid('u') }); X.save(); UI.show('extraction'); }
  else if (where === 'bench') G.Bench.open(wp.id);
  else if (where === 'armory') UI.show('armory');
};
WS.openMerge = function (ids) { WS.tab = 'merge'; WS.mergeIds = ids.slice(); WS.mergeName = ''; UI.show('workshop'); };
WS.openBuild = function (wp) {
  WS.tab = 'build';
  if (wp.custom) WS.draft = clone(wp);
  else { WS.draft = clone(wp); delete WS.draft.id; delete WS.draft.psy; delete WS.draft.proto; WS.draft.n = wp.n + ' Custom'; WS.draft.co = 'Workshop'; WS.draft.donors = [wp.id]; }
  UI.show('workshop');
};

// ------------------------------------------------------------------ screen
WS.render = function (root) {
  G.Game.mode = 'menu';
  fields();
  const tabs = [['mine', `My guns (${CW.data.guns.length})`], ['merge', 'Merge guns'], ['build', 'Build from scratch'], ['atts', `Attachments (${CW.data.atts.length})`]];
  root.innerHTML = `<section class="screen" id="workshop">
    <div class="col left"><div class="colhead"><div class="eyebrow">Weapon workshop</div><div class="eras">${tabs.map(([id, n]) => `<button class="chip ${WS.tab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div></div><div class="scroll" id="wsl"></div></div>
    <div class="stage"><div class="top"><div><div class="eyebrow" id="wse"></div><h2 id="wsn"></h2><div class="sub" id="wss"></div></div><button class="btn small" id="back">Main menu</button></div>
      <div><div class="actions" id="wsa"></div><p class="hint">Drag to rotate · scroll to zoom</p></div></div>
    <div class="col right"><div id="wsnote"></div><div class="scroll" id="wsr"></div></div></section>`;
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { WS.tab = b.dataset.tab; G.Audio.ui(); WS.render(root); });
  $('#back').onclick = () => UI.show('menu');
  ({ mine: tabMine, merge: tabMerge, build: tabBuild, atts: tabAtts })[WS.tab](root);
};
const head = (e, n, s) => { $('#wse').textContent = e; $('#wsn').textContent = n; $('#wss').textContent = s; };
const actions = (list) => { const a = $('#wsa'); a.innerHTML = list.map(([id, n, p]) => `<button class="btn ${p ? 'primary' : ''}" data-act="${id}">${n}</button>`).join(''); return a; };

// ---------------- my guns
function tabMine(root) {
  const guns = CW.data.guns.map(g => G.WEAPON[g.id]).filter(Boolean);
  const L = $('#wsl');
  L.innerHTML = `<div class="wsbtns"><button class="btn small primary" id="ws-new">New design</button><button class="btn small" id="ws-mrg">Merge guns</button><button class="btn small" id="ws-imp">Import</button></div>` +
    (guns.length ? guns.map(w => `<button class="witem ${w.id === WS.sel ? 'on' : ''}" data-g="${w.id}"><b>${esc(w.n)}</b><em>${w.y}</em><span>${esc(G.CLASS_NAMES[w.c])} · ${esc(w.cal)}${w.donors && w.donors.length > 1 ? ' · merge of ' + w.donors.length : ''}</span></button>`).join('')
      : `<div class="wsempty">No designs yet. Merge two or more real guns, start from any gun and change every part, or hit <b>Chaos build</b> on the Build tab for something random.<br><br>Tip: in the Armory, press <b>Merge mode</b> and tick guns from any era.</div>`);
  $('#ws-new').onclick = () => { WS.tab = 'build'; WS.draft = null; WS.render(root); };
  $('#ws-mrg').onclick = () => { WS.tab = 'merge'; WS.render(root); };
  $('#ws-imp').onclick = () => importDialog(root);
  L.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { WS.sel = b.dataset.g; G.Audio.ui(); WS.render(root); });
  let wp = G.WEAPON[WS.sel]; if (!wp || !wp.custom) { wp = guns[guns.length - 1]; WS.sel = wp && wp.id; }
  if (!wp) { head('Workshop', 'Your designs', 'Saved designs appear here'); const g0 = G.WEAPON[UI.sel.wp] || G.WEAPON.m4a1; showGun(g0); $('#wsr').innerHTML = `<div class="wsempty">Every saved design becomes a real weapon in the <b>Workshop</b> era: customise it in the Armory, take it to the range, missions, the battlefield or extraction, and handle it on the bench.</div>`; actions([]); return; }
  const Lw = UI.loadoutFor(wp);
  head(`Workshop · ${G.CLASS_NAMES[wp.c]}`, wp.n, `${wp.co} · ${wp.cal} · ${wp.act}`);
  const err = showGun(wp, Lw); if (err) note('Model error: ' + esc(err));
  $('#wsr').innerHTML = `${wp.blurb ? `<p class="blurb">${esc(wp.blurb)}</p>` : ''}${statsHTML(wp, Lw)}
    <div class="lbl" style="padding:12px 16px 0">Test it</div><div class="wsbtns"><button class="btn small" data-t="range">Range</button><button class="btn small" data-t="mission">Mission</button><button class="btn small" data-t="battle">Battlefield</button><button class="btn small" data-t="extraction" title="Puts a copy in your extraction stash">Extraction</button><button class="btn small" data-t="bench">Handling bench</button></div>
    <div class="lbl" style="padding:6px 16px 0">Manage</div><div class="wsbtns"><button class="btn small" data-t="armory">Attachments (Armory)</button><button class="btn small" id="ws-edit">Edit design</button><button class="btn small" id="ws-dup">Duplicate</button><button class="btn small" id="ws-exp">Export</button><button class="btn small" id="ws-del">Delete</button></div>`;
  actions([['range', 'Take to the range', 1], ['mission', 'Test in a mission'], ['edit', 'Edit design']]).querySelectorAll('[data-act]').forEach(b => b.onclick = () => b.dataset.act === 'edit' ? WS.openBuild(wp) : WS.test(wp, b.dataset.act));
  root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => WS.test(wp, b.dataset.t));
  $('#ws-edit').onclick = () => WS.openBuild(wp);
  $('#ws-dup').onclick = () => { const d = clone(wp); delete d.id; d.n += ' II'; const r = CW.saveGun(d, Lw); if (r.wp) { WS.sel = r.wp.id; WS.render(root); } };
  $('#ws-del').onclick = () => { if (!confirm(`Delete "${wp.n}"? Copies in your extraction stash go too.`)) return; CW.deleteGun(wp.id); WS.sel = null; WS.render(root); };
  $('#ws-exp').onclick = () => exportDialog(wp);
}
function exportDialog(wp) {
  const atts = Object.values(UI.loadoutFor(wp)).map(id => G.ATT[id]).filter(a => a && a.cust);
  const code = JSON.stringify({ ironsight: 1, guns: [Object.assign(clone(CW.data.guns.find(g => g.id === wp.id) || wp), { L: UI.loadoutFor(wp) })], atts: atts.map(a => clone(a)) });
  const o = UI.overlay(`<div class="dialog" style="width:min(620px,100%)"><div class="eyebrow">Export</div><h2>${esc(wp.n)}</h2><p class="muted">Copy this code. Paste it into Import on any copy of the game to get the gun (and its custom attachments).</p><textarea class="wsta" readonly>${esc(code)}</textarea><div class="btns"><button class="btn primary" id="ex-copy">Copy</button><button class="btn" id="ex-ok">Close</button></div></div>`);
  const ta = o.querySelector('textarea'); ta.focus(); ta.select();
  o.querySelector('#ex-copy').onclick = () => { ta.select(); try { (navigator.clipboard && navigator.clipboard.writeText(code)) || document.execCommand('copy'); } catch (e) { document.execCommand('copy'); } o.querySelector('#ex-copy').textContent = 'Copied'; };
  o.querySelector('#ex-ok').onclick = () => UI.closeOverlay();
}
function importDialog(root) {
  const o = UI.overlay(`<div class="dialog" style="width:min(620px,100%)"><div class="eyebrow">Import</div><h2>Paste a workshop code</h2><textarea class="wsta" placeholder='{"ironsight":1,"guns":[…]}'></textarea><div id="im-err" class="muted"></div><div class="btns"><button class="btn primary" id="im-go">Import</button><button class="btn" id="im-x">Cancel</button></div></div>`);
  o.querySelector('#im-x').onclick = () => UI.closeOverlay();
  o.querySelector('#im-go').onclick = () => {
    try {
      const d = JSON.parse(o.querySelector('textarea').value); const map = {};
      for (const a of d.atts || []) { const old = a.id; delete a.id; map[old] = CW.saveAtt(a).id; }
      let last = null;
      for (const g of d.guns || []) { const L = g.L; delete g.L; delete g.id; if (L) for (const s in L) if (map[L[s]]) L[s] = map[L[s]]; const r = CW.saveGun(g, L); if (r.err) throw new Error(r.err); last = r.wp; }
      if (!last) throw new Error('No guns in that code');
      UI.closeOverlay(); WS.sel = last.id; WS.tab = 'mine'; WS.render(root);
    } catch (e) { o.querySelector('#im-err').textContent = 'Could not import: ' + e.message; }
  };
}

// ---------------- merge
function tabMerge(root) {
  const L = $('#wsl');
  const ids = WS.mergeIds = WS.mergeIds.filter(id => G.WEAPON[id]);
  const eras = [['all', 'All']].concat(G.ERAS.map(e => [e.id, e.name]));
  if (WS.mergeOverride && WS.mergeOverride.ids.join() !== ids.join()) WS.mergeOverride = null;
  L.innerHTML = `<div class="wsbtns"><button class="btn small primary" id="ws-rmerge" title="2 to 10 random guns, a random base, then random edits">Random merge</button><label class="wsc" style="padding:4px 6px"><input type="checkbox" id="ws-rheavy" ${WS.rheavy ? 'checked' : ''}> include cannon & artillery</label>${ids.length ? '<button class="btn small" id="ws-mclear">Clear</button>' : ''}</div><div class="wssel"><div class="lbl" style="margin:0">Selected — the first gives the receiver</div>${ids.length ? ids.map((id, i) => `<div><span class="wsbox on">${i + 1}</span><b>${esc(G.WEAPON[id].n)}</b>${i ? `<button data-up="${id}" title="Use this gun's receiver">Make base</button>` : ''}<button data-rm="${id}">✕</button></div>`).join('') : '<div class="muted">Tick two or more guns below.</div>'}</div>
    <div style="padding:8px 14px;border-bottom:1px solid var(--line)"><input class="wsq" id="wsq" placeholder="Search all ${G.WEAPONS.length} guns…" value="${esc(WS.q)}"><div class="eras" style="margin-top:6px">${eras.map(([id, n]) => `<button class="chip ${WS.era === id ? 'on' : ''}" data-mera="${id}">${esc(n)}</button>`).join('')}</div></div><div id="wsml"></div>`;
  const list = () => {
    const q = WS.q.trim().toLowerCase();
    const ws = G.WEAPONS.filter(w => (WS.era === 'all' || w.e === WS.era) && (!q || (w.n + ' ' + w.co + ' ' + w.cal).toLowerCase().includes(q))).slice(0, 250);
    $('#wsml').innerHTML = ws.map(w => `<button class="witem" data-mw="${w.id}"><b><span class="wsbox ${ids.includes(w.id) ? 'on' : ''}">${ids.includes(w.id) ? ids.indexOf(w.id) + 1 : ''}</span>${esc(w.n)}</b><em>${w.y}</em><span>${esc(G.CLASS_NAMES[w.c])} · ${esc(w.cal)}</span></button>`).join('') || '<div class="wsempty">Nothing matches.</div>';
    $('#wsml').querySelectorAll('[data-mw]').forEach(b => b.onclick = () => { const id = b.dataset.mw, i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); else ids.push(id); G.Audio.ui(); const sc = L.scrollTop; tabMerge(root); $('#wsl').scrollTop = sc; });
  };
  list();
  const q = $('#wsq'); q.oninput = () => { WS.q = q.value; list(); };
  L.querySelectorAll('[data-mera]').forEach(b => b.onclick = () => { WS.era = b.dataset.mera; tabMerge(root); });
  $('#ws-rmerge').onclick = () => { const r = CW.randomMerge(Math.random, { heavy: WS.rheavy }); if (!r) return; WS.mergeIds = r.ids.slice(); WS.mergeOverride = r; WS.mergeName = ''; G.Audio.ui('attach'); tabMerge(root); };
  $('#ws-rheavy').onchange = e => { WS.rheavy = e.target.checked; };
  if ($('#ws-mclear')) $('#ws-mclear').onclick = () => { WS.mergeIds = []; WS.mergeOverride = null; tabMerge(root); };
  L.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { ids.splice(ids.indexOf(b.dataset.rm), 1); tabMerge(root); });
  L.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { ids.splice(ids.indexOf(b.dataset.up), 1); ids.unshift(b.dataset.up); tabMerge(root); });
  if (ids.length < 2) {
    head('Merge', 'Fuse real guns', 'Pick two or more — any era, any class');
    if (ids[0]) showGun(G.WEAPON[ids[0]]); else showGun(G.WEAPON[UI.sel.wp] || G.WEAPON.m4a1);
    $('#wsr').innerHTML = `<div class="wsempty">The merged gun keeps the <b>best</b> of each donor: the hardest-hitting cartridge, the fastest rate of fire, the biggest magazine, the tightest group, the quickest reload and the softest recoil — plus every special mechanic (bipods, explosive or seeker rounds, rotary barrels, integral suppressors…). Its body is built from the donors' parts: receiver from the first gun, barrel from the longest-reaching, stock from the softest-shooting, magazine from the biggest.</div>`;
    actions([]); return;
  }
  const res = WS.mergeOverride || CW.merge(ids); if (!res) return;
  if (WS.mergeName) res.wp.n = WS.mergeName;
  head(`Merge of ${ids.length}`, res.wp.n, `${res.wp.cal} · ${res.wp.modes.join('/')} · ${res.wp.rpm} rpm · ${res.wp.mag} rds`);
  const err = showGun(res.wp, res.L); if (err) note('Model error: ' + esc(err));
  const P = G.WEAPON[ids[0]];
  $('#wsr').innerHTML = `<label class="wsf"><span>Name</span><input type="text" id="mname" value="${esc(res.wp.n)}" maxlength="80"></label>
    <div class="lbl" style="padding:10px 16px 0">Key features</div><dl class="wsfeat">${res.feats.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="lbl" style="padding:6px 16px 0">Against the ${esc(P.n)}</div>${statsHTML(res.wp, res.L, { wp: P, L: UI.loadoutFor(P) })}`;
  $('#mname').oninput = e => { WS.mergeName = e.target.value; $('#wsn').textContent = e.target.value; };
  const save = () => { if (WS.mergeName) res.wp.n = WS.mergeName; const r = CW.saveGun(res.wp, res.L); if (r.err) { note('Could not save: ' + esc(r.err)); return null; } return r.wp; };
  actions([['save', 'Save merged gun', 1], ['tune', 'Fine-tune in the builder'], ['range', 'Save & test on the range']]).querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'tune') { const d = clone(res.wp); delete d.id; if (WS.mergeName) d.n = WS.mergeName; WS.draft = d; WS.tab = 'build'; WS.render(root); return; }
    const wp = save(); if (!wp) return; WS.mergeIds = []; WS.mergeName = ''; WS.sel = wp.id; G.Audio.ui('attach');
    if (a === 'range') WS.test(wp, 'range'); else { WS.tab = 'mine'; WS.render(root); note(`Saved <b>${esc(wp.n)}</b> to the Workshop era.`, true); }
  });
}

// ---------------- build from scratch
function tabBuild(root) {
  if (!WS.draft) { const b = G.WEAPON[UI.sel.wp] && !G.WEAPON[UI.sel.wp].custom ? G.WEAPON[UI.sel.wp] : G.WEAPON.m4a1; WS.draft = clone(b); delete WS.draft.id; delete WS.draft.psy; delete WS.draft.proto; WS.draft.n = 'My ' + b.n.split(' ')[0]; WS.draft.co = 'Workshop'; WS.draft.donors = [b.id]; }
  const d = WS.draft; d.m.x = d.m.x || [];
  const L = $('#wsl');
  L.innerHTML = `<div class="wsbtns"><button class="btn small primary" id="ws-rand" title="Every section randomised: parts, mechanics, calibre, specials, extras">Randomize everything</button><button class="btn small" id="ws-chaos" title="A random real gun with random parts, calibre and special mechanics">Chaos build</button>${d.id ? '<button class="btn small" id="ws-asnew">Start a new copy</button>' : ''}</div>
    <div style="padding:8px 14px;border-bottom:1px solid var(--line)"><div class="lbl">Start from any gun (keeps nothing of your current draft)</div><input class="wsq" id="wsq" placeholder="Search ${G.WEAPONS.length} guns…" value="${esc(WS.q)}"></div><div id="wstl"></div>`;
  const list = () => {
    const q = WS.q.trim().toLowerCase();
    const ws = G.WEAPONS.filter(w => !q || (w.n + ' ' + w.co + ' ' + w.cal + ' ' + G.CLASS_NAMES[w.c]).toLowerCase().includes(q)).slice(0, 200);
    $('#wstl').innerHTML = ws.map(w => `<button class="witem" data-tp="${w.id}"><b>${esc(w.n)}</b><em>${w.y}</em><span>${esc(G.ERA[w.e].name)} · ${esc(G.CLASS_NAMES[w.c])}</span></button>`).join('');
    $('#wstl').querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { const w = G.WEAPON[b.dataset.tp], keep = d.id; WS.draft = clone(w); if (!w.custom) { delete WS.draft.id; WS.draft.n = 'My ' + w.n.split(' ')[0]; WS.draft.co = 'Workshop'; WS.draft.donors = [w.id]; } else if (keep) WS.draft.id = keep; delete WS.draft.psy; delete WS.draft.proto; G.Audio.ui(); tabBuild(root); });
  };
  list();
  const q = $('#wsq'); q.oninput = () => { WS.q = q.value; list(); };
  $('#ws-rand').onclick = () => { const keep = d.id; WS.draft = CW.randomize(d, 'all'); if (keep) WS.draft.id = keep; G.Audio.ui('attach'); tabBuild(root); };
  $('#ws-chaos').onclick = () => { const keep = d.id; WS.draft = CW.random(); if (keep) WS.draft.id = keep; G.Audio.ui('attach'); tabBuild(root); };
  if ($('#ws-asnew')) $('#ws-asnew').onclick = () => { delete d.id; d.n += ' (copy)'; tabBuild(root); };
  // editor form
  const R = $('#wsr'), sc = R.scrollTop;
  const open = WS.openSec = WS.openSec || { 'Identity': 1, 'Receiver & action': 1, 'Mechanics': 1 };
  R.innerHTML = FIELDS.map(([sec, fs]) => `<details class="wsd" data-sec="${esc(sec)}" ${open[sec] ? 'open' : ''}><summary>${sec} <button class="btn small" data-dice="${esc(sec)}" title="Randomise this section" style="float:right;padding:1px 7px;margin-top:-3px;font-size:12px">🎲</button></summary>${fs.map(f => fieldHTML(f, d)).join('')}</details>`).join('') + `<div id="wsst" style="padding-bottom:20px"></div>`;
  R.scrollTop = sc;
  R.querySelectorAll('details').forEach(el => el.addEventListener('toggle', () => { open[el.dataset.sec] = el.open; }));
  R.querySelectorAll('[data-dice]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const keep = d.id; WS.draft = CW.randomize(d, b.dataset.dice); if (keep) WS.draft.id = keep; G.Audio.ui('attach'); tabBuild(root); });
  const onIn = e => {
    const t = e.target;
    if (t.dataset.x) { const X = d.m.x, i = X.indexOf(t.dataset.x); if (t.checked && i < 0) X.push(t.dataset.x); if (!t.checked && i >= 0) X.splice(i, 1); return schedule(); }
    if (t.dataset.mode) { d.modes = MODES.map(m => m[0]).filter(m => (m === t.dataset.mode ? t.checked : d.modes.includes(m))); return schedule(); }
    const k = t.dataset.f; if (!k) return; const f = FMAP[k]; if (!f) return;
    let v = t.type === 'checkbox' ? (t.checked ? (f.num ? 1 : true) : undefined) : t.value;
    if (f.t === 'rng' || f.t === 'num') v = +v;
    if (f.t === 'sel' && v === '') v = undefined;
    setP(d, k, v);
    if (f.on) f.on(v);
    const o = R.querySelector(`[data-o="${k}"]`); if (o) o.textContent = fmt(v, f);
    if (f.re && e.type === 'change') { tabBuild(root); return; }
    if (k === 'n') $('#wsn').textContent = v || 'Untitled';
    schedule();
  };
  R.oninput = onIn; R.onchange = e => { const f = FMAP[e.target.dataset.f]; if (f && f.re) onIn(e); };
  actions([['save', d.id ? 'Save changes' : 'Save design', 1], ['range', 'Save & test on the range'], ['bench', 'Save & handle on the bench']]).querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const r = CW.saveGun(d, d.id && G.WEAPON[d.id] ? UI.loadoutFor(G.WEAPON[d.id]) : null);
    if (r.err) { note('This combination does not assemble: ' + esc(r.err) + '. Change the receiver or the part you just picked.'); return; }
    WS.draft = clone(r.wp); WS.sel = r.wp.id; G.Audio.ui('attach');
    if (b.dataset.act === 'save') { tabBuild(root); note(`Saved <b>${esc(r.wp.n)}</b> — it is in the Workshop era of the Armory and every mode's weapon picker.`, true); }
    else WS.test(r.wp, b.dataset.act);
  });
  preview();
}
let pend = 0;
function schedule() { clearTimeout(pend); pend = setTimeout(preview, 90); }
function preview() {
  if (WS.tab !== 'build' || UI.screen !== 'workshop' || !WS.draft) return;
  const d = CW.normalize(clone(WS.draft)); d.id = d.id || 'cw_preview';
  head(`${d.id === 'cw_preview' ? 'New design' : 'Editing'} · ${G.CLASS_NAMES[d.c] || ''}`, d.n || 'Untitled', `${d.cal} · ${(d.modes || []).join('/')} · ${d.rpm} rpm · ${d.mag} rds`);
  const err = CW.validate(d);
  if (err) { note('This combination does not assemble (' + esc(err) + '). Try another receiver or part.'); return; }
  note('');
  const L = G.WEAPON[d.id] ? UI.loadoutFor(d) : G.defaultLoadout(d);
  const e2 = showGun(d, L); if (e2) note('Model error: ' + esc(e2));
  const st = $('#wsst'); if (st) { const base = d.donors && G.WEAPON[d.donors[0]]; st.innerHTML = `<div class="lbl" style="padding:12px 16px 0">${base ? 'Against the ' + esc(base.n) : 'Stats'}</div>` + statsHTML(d, L, base ? { wp: base, L: G.defaultLoadout(base) } : null); }
}

// ---------------- custom attachments
const ASTATS = [['acc', 'Dispersion ×', .2, 2.5, .05, 1], ['rv', 'Vertical recoil ×', .2, 2.5, .05, 1], ['rh', 'Horizontal recoil ×', .2, 2.5, .05, 1], ['ads', 'Aim speed (time) ×', .4, 2.5, .05, 1], ['mob', 'Mobility +', -4, 4, .25, 0], ['v', 'Velocity ×', .6, 1.6, .01, 1], ['dmgMul', 'Damage ×', .3, 4, .05, 1], ['rpmMul', 'Rate of fire ×', .3, 4, .05, 1], ['rl', 'Reload time ×', .3, 2.5, .05, 1], ['mag', 'Capacity (0 = unchanged)', 0, 500, 1, 0], ['zoom', 'Optic zoom (0 = none)', 0, 30, .5, 0], ['pen', 'Penetration +', -2, 4, 1, 0], ['homing', 'Seeker turn rate', 0, 6, .1, 0], ['he.r', 'Explosive radius', 0, 6, .1, 0], ['he.dmg', 'Explosive damage', 0, 200, 5, 0]];
const AFLAGS = [['sup', 'Suppressor'], ['inc', 'Incendiary'], ['tracer', 'Tracers'], ['light', 'Weapon light'], ['bip', 'Bipod'], ['gl', 'Grenade launcher']];
function tabAtts(root) {
  const L = $('#wsl');
  const atts = CW.data.atts;
  L.innerHTML = `<div class="wsbtns"><button class="btn small primary" id="wa-new">New attachment</button></div>` + (atts.length ? atts.map(a => `<button class="witem ${WS.attDraft && WS.attDraft.id === a.id ? 'on' : ''}" data-a="${a.id}"><b>${esc(a.n)}</b><em>${esc((G.SLOTS.find(s => s[0] === a.slot) || [, a.slot])[1])}</em><span>based on ${esc((G.ATT[a.base] || {}).n || a.base)}</span></button>`).join('') : `<div class="wsempty">Design your own optics, suppressors, magazines, ammunition, stocks — anything. Each one starts from a real part's look and you set its numbers. They fit every gun.</div>`);
  $('#wa-new').onclick = () => { const b = G.ATT.holo || G.ATTACH.find(a => a.slot === 'optic'); WS.attDraft = CW.attFrom(b, { n: 'My ' + b.n }); tabAtts(root); };
  L.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { WS.attDraft = clone(G.ATT[b.dataset.a]); G.Audio.ui(); tabAtts(root); });
  const pool = G.WEAPONS.filter(w => w.c !== 'PST');
  let gun = G.WEAPON[WS.attGun] || G.WEAPON[WS.sel] || G.WEAPON[UI.sel.wp] || G.WEAPON.m4a1; WS.attGun = gun.id;
  const a = WS.attDraft;
  if (!a) { head('Attachments', 'Your own parts', 'Make one, then fit it in the Armory'); showGun(gun); $('#wsr').innerHTML = ''; actions([]); return; }
  const slotOpts = G.SLOTS.map(([s, n]) => `<option value="${s}" ${s === a.slot ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const baseOpts = G.ATTACH.filter(x => x.slot === a.slot && !x.cust).sort((p, q) => p.n.localeCompare(q.n)).map(x => `<option value="${x.id}" ${x.id === a.base ? 'selected' : ''}>${esc(x.n)}</option>`).join('');
  const gunOpts = G.WEAPONS.filter(w => w.custom).concat(G.WEAPONS.filter(w => !w.custom && (w.id === gun.id || w.id === UI.sel.wp || ['m4a1', 'akm', 'glock19', 'm870', 'm24'].includes(w.id)))).map(w => `<option value="${w.id}" ${w.id === gun.id ? 'selected' : ''}>${esc(w.n)}</option>`).join('');
  const s = a.s || (a.s = {});
  $('#wsr').innerHTML = `<label class="wsf"><span>Name</span><input type="text" id="an" value="${esc(a.n)}" maxlength="60"></label>
    <label class="wsf"><span>Description</span><input type="text" id="ad" value="${esc(a.d || '')}" maxlength="140"></label>
    <label class="wsf"><span>Slot</span><select id="aslot">${slotOpts}</select></label>
    <label class="wsf"><span>Looks like</span><select id="abase">${baseOpts}</select></label>
    <label class="wsf"><span>Preview on</span><select id="agun">${gunOpts}</select></label>
    <div class="lbl" style="padding:10px 16px 0">Numbers</div>
    ${ASTATS.map(([k, l, mn, mx, st, def]) => { const v = getP(s, k) ?? def; return `<label class="wsf"><span>${l} <b data-ao="${k}">${(+v).toFixed(st >= 1 ? 0 : 2)}</b></span><input type="range" data-as="${k}" min="${mn}" max="${mx}" step="${st}" value="${v}"></label>`; }).join('')}
    <div style="display:flex;flex-wrap:wrap">${AFLAGS.map(([k, l]) => `<label class="wsc"><input type="checkbox" data-af="${k}" ${s[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div id="wast" style="padding-bottom:20px"></div>`;
  const R = $('#wsr');
  const draw = () => {
    const pa = Object.assign(clone(a), { id: 'ca_preview' }); G.ATT.ca_preview = pa;
    const L0 = UI.loadoutFor(gun), L1 = Object.assign({}, L0, { [a.slot]: 'ca_preview' });
    head(`Attachment · ${(G.SLOTS.find(x => x[0] === a.slot) || [, ''])[1]}`, a.n, `on the ${gun.n}`);
    const err = showGun(gun, L1); note(err ? 'Model error: ' + esc(err) : '');
    $('#wast').innerHTML = `<div class="lbl" style="padding:12px 16px 0">${esc(gun.n)} with it fitted</div>` + statsHTML(gun, L1, { wp: gun, L: L0 });
  };
  $('#an').oninput = e => { a.n = e.target.value; $('#wsn').textContent = a.n; };
  $('#ad').oninput = e => { a.d = e.target.value; };
  $('#aslot').onchange = e => { const b = G.ATTACH.find(x => x.slot === e.target.value && !x.cust && !G.DEFAULT_IDS.includes(x.id)) || G.ATTACH.find(x => x.slot === e.target.value); WS.attDraft = Object.assign(CW.attFrom(b), { id: a.id, n: a.n, d: a.d }); tabAtts(root); };
  $('#abase').onchange = e => { const b = G.ATT[e.target.value]; WS.attDraft = Object.assign(CW.attFrom(b), { id: a.id, n: a.n, d: a.d }); tabAtts(root); };
  $('#agun').onchange = e => { WS.attGun = e.target.value; gun = G.WEAPON[WS.attGun]; draw(); };
  R.querySelectorAll('[data-as]').forEach(el => el.oninput = () => {
    const k = el.dataset.as, v = +el.value, def = ASTATS.find(x => x[0] === k)[5];
    if (k.startsWith('he.')) { if (!s.he) s.he = { r: 0, dmg: 40 }; s.he[k.slice(3)] = v; if (!(s.he.r > 0)) delete s.he; }
    else if (v === def) delete s[k]; else s[k] = v;
    if (k === 'zoom' && v > 0 && (!s.ret || (v >= 2.5 && ['holo', 'dot', 'irons', 'ring', 'xm157'].includes(s.ret)))) s.ret = v >= 2.5 ? 'mildot' : 'dot';
    if (k === 'zoom' && !(v > 0)) delete s.ret;
    R.querySelector(`[data-ao="${k}"]`).textContent = v.toFixed(+el.step >= 1 ? 0 : 2);
    clearTimeout(pend); pend = setTimeout(draw, 80);
  });
  R.querySelectorAll('[data-af]').forEach(el => el.onchange = () => { const k = el.dataset.af; if (el.checked) s[k] = 1; else delete s[k]; if (k === 'sup' && el.checked) { s.flash = .1; s.loud = .35; } draw(); });
  actions([['save', a.id ? 'Save changes' : 'Save attachment', 1], ['fit', 'Save & fit to this gun'], ...(a.id ? [['del', 'Delete']] : [])]).querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const act = b.dataset.act;
    if (act === 'del') { if (!confirm(`Delete "${a.n}"?`)) return; CW.deleteAtt(a.id); WS.attDraft = null; tabAtts(root); return; }
    const sv = CW.saveAtt(a); WS.attDraft = clone(sv); G.Audio.ui('attach');
    if (act === 'fit') { const L0 = UI.loadoutFor(gun); L0[sv.slot] = sv.id; UI.saveLoadout(gun, L0); }
    WS.render(root); note(act === 'fit' ? `Fitted <b>${esc(sv.n)}</b> to the ${esc(gun.n)}.` : `Saved <b>${esc(sv.n)}</b>. It fits every gun — pick it in the Armory's ${esc((G.SLOTS.find(x => x[0] === sv.slot) || [, ''])[1])} slot.`, true);
  });
  draw();
}
})();
