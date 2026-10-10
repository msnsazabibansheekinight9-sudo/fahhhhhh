// Dropfall — the strike cruiser hub: save data, war table, loadout, requisition, ship modules, passes, store, codex, results.
'use strict';
(function () {
  const U = DF.U, A = DF.Audio;
  const H = DF.Hub = {};
  const KEY = 'dropfall.save.v1';
  let save = null, tab = 'war', sel = { planet: null, type: null, diff: 1 };
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------------------------------------------------------------- save
  function fresh() {
    const planets = {}; for (const p of DF.PLANETS) planets[p.id] = p.lib;
    return {
      v: 1, name: 'Diver', level: 1, xp: 0, credits: 250, medals: 0, shards: 0, samples: { c: 0, r: 0, s: 0 },
      owned: { weapons: ['ar7', 'p2'], grenades: ['g_frag'], callins: ['mg50', 'os1', 'o_precision', 'a_strafe'], armors: ['a_recruit'], capes: ['c_none', 'c_issue'], cards: ['k_default'], titles: [], boosters: [] },
      passes: { p_field: { owned: true, claimed: [], spent: 0 } }, modules: [],
      loadout: { primary: 'ar7', secondary: 'p2', grenade: 'g_frag', callins: ['mg50', 'o_precision', 'a_strafe', 'os1'], armor: 'a_recruit', cape: 'c_issue', booster: null, card: 'k_default', title: null },
      planets, stats: { missions: 0, wins: 0, kills: 0, deaths: 0, extracts: 0 }, settings: { vol: 0.6, bots: 3, sens: 1, fov: 75 }, major: { planet: 'morrow', reward: 40, done: false }
    };
  }
  H.load = function () {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) { save = Object.assign(fresh(), s); return save; } } } catch (e) { }
    if (window.claude && window.claude.hot && window.claude.hot.data && window.claude.hot.data.save) save = window.claude.hot.data.save;
    if (!save) save = fresh();
    return save;
  };
  H.save = function () { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { } };
  H.get = () => save;
  H.reset = () => { save = fresh(); H.save(); };

  const own = (kind, id) => save.owned[kind].includes(id);
  const give = (kind, id) => { if (!own(kind, id)) save.owned[kind].push(id); };
  H.rankTitle = l => DF.TITLES[Math.min(DF.TITLES.length - 1, Math.floor((l - 1) / 1))] || 'Diver';
  function titleFor(l) { return DF.TITLES[Math.min(DF.TITLES.length - 1, Math.floor((l - 1) / 2))]; }

  function addXp(n) {
    save.xp += n; const ups = [];
    while (save.xp >= DF.xpForLevel(save.level)) { save.xp -= DF.xpForLevel(save.level); save.level++; ups.push(save.level); save.credits += 100; }
    return ups;
  }

  // ---------------------------------------------------------------- shell
  H.show = function (t) {
    if (t) tab = t;
    $('#hub').hidden = false; $('#game').hidden = true; $('#title').hidden = true; $('#drop').hidden = true; $('#results').hidden = true;
    renderTop(); renderTabs(); renderBody();
  };

  function renderTop() {
    const xpN = DF.xpForLevel(save.level);
    $('#top').innerHTML = `
      <div class="who"><div class="lvl">${save.level}</div><div><b>${esc(save.name)}</b><span>${titleFor(save.level)}${save.loadout.title ? ' · ' + esc(DF.EXTRA_TITLES[save.loadout.title]) : ''}</span>
      <div class="xp"><i style="width:${Math.round(save.xp / xpN * 100)}%"></i></div></div></div>
      <div class="cur">
        <span title="Requisition credits">◈ <b>${save.credits}</b> credits</span>
        <span title="Medals, spent in campaign passes">✪ <b>${save.medals}</b> medals</span>
        <span title="Shards, spent at the quartermaster and on premium passes">⬡ <b>${save.shards}</b> shards</span>
        <span title="Samples, spent on ship modules">samples <b class="sc">${save.samples.c}</b> · <b class="sr">${save.samples.r}</b> · <b class="ss">${save.samples.s}</b></span>
      </div>`;
  }
  const TABS = [['war', 'War Table'], ['loadout', 'Loadout'], ['armory', 'Requisition'], ['ship', 'Ship Modules'], ['pass', 'Campaign Passes'], ['store', 'Quartermaster'], ['codex', 'Codex'], ['settings', 'Settings']];
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([k, n]) => `<button class="tab${k === tab ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('');
    $('#tabs').querySelectorAll('button').forEach(b => b.onclick = () => { A.play('ui'); H.show(b.dataset.tab); });
  }
  function renderBody() {
    const b = $('#body');
    ({ war: warTable, loadout, armory, ship, pass: passes, store, codex, settings })[tab](b);
  }

  // ---------------------------------------------------------------- war table
  function missionTypes(p) {
    // each planet offers a fixed rotation of three operations
    const all = Object.keys(DF.MISSIONS), seed = p.id.length + p.name.charCodeAt(0) + Math.floor(save.stats.missions / 2);
    const out = []; for (let i = 0; out.length < 3; i++) { const t = all[(seed + i * 2) % all.length]; if (!out.includes(t)) out.push(t); }
    return out;
  }
  function warTable(b) {
    if (!sel.planet) sel.planet = DF.PLANETS.find(p => p.id === save.major.planet) || DF.PLANETS[0];
    const p = sel.planet, lib = save.planets[p.id], types = missionTypes(p);
    if (!sel.type || !types.includes(sel.type)) sel.type = types[0];
    const maxDiff = DF.DIFF_UNLOCK.filter(l => save.level >= l).length;
    sel.diff = Math.min(sel.diff, maxDiff);
    const mo = DF.PLANETS.find(x => x.id === save.major.planet);
    b.innerHTML = `
      <div class="war">
        <div class="galaxy"><canvas id="gal" width="900" height="620" aria-label="Galaxy map"></canvas>
          <div class="major ${save.major.done ? 'done' : ''}"><small>MAJOR ORDER</small><b>${save.major.done ? 'Complete. New orders soon.' : 'Liberate ' + esc(mo.name)}</b><span>${save.major.done ? '' : 'Reward ' + save.major.reward + ' medals · ' + Math.floor(save.planets[mo.id]) + '% liberated'}</span></div></div>
        <div class="brief">
          <div class="pl-head"><i style="background:${DF.FACTIONS[p.f].color}"></i><div><h2>${esc(p.name)}</h2><span>${DF.FACTIONS[p.f].name} · ${DF.BIOMES[p.biome].name}</span></div></div>
          <div class="libbar"><i style="width:${Math.min(100, lib)}%;background:${DF.FACTIONS[p.f].color}"></i><span>${lib >= 100 ? 'Liberated' : Math.floor(lib) + '% liberated'}</span></div>
          <p class="hz"><b>Hazard:</b> ${DF.HAZARDS[p.hazard].name}. ${DF.HAZARDS[p.hazard].desc}</p>
          <p class="fdesc">${DF.FACTIONS[p.f].desc}</p>
          <h3>Operation</h3>
          <div class="ops">${types.map(t => `<button class="op${t === sel.type ? ' on' : ''}" data-t="${t}"><b>${esc(DF.World.missionName(t, p.f))}</b><span>${DF.MISSIONS[t].desc}</span></button>`).join('')}</div>
          <h3>Difficulty</h3>
          <div class="diffs">${DF.DIFFS.map((d, i) => `<button class="df${d.n === sel.diff ? ' on' : ''}" data-d="${d.n}" ${i + 1 > maxDiff ? 'disabled title="Unlocks at level ' + DF.DIFF_UNLOCK[i] + '"' : ''}><b>${d.n}</b><span>${d.name}</span></button>`).join('')}</div>
          <p class="note">${sel.diff >= 5 ? 'Two main objectives. ' : ''}${sel.diff >= 6 ? 'Super samples can appear. ' : ''}${sel.diff >= 7 ? 'Boss-class enemies join patrols.' : ''}</p>
          <div class="row"><label for="bots">AI squadmates</label><select id="bots">${[0, 1, 2, 3].map(n => `<option value="${n}" ${n === save.settings.bots ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <button class="btn primary big" id="deploy">Choose drop zone</button>
        </div>
      </div>`;
    drawGalaxy();
    b.querySelectorAll('.op').forEach(x => x.onclick = () => { sel.type = x.dataset.t; A.play('ui'); renderBody(); });
    b.querySelectorAll('.df').forEach(x => x.onclick = () => { sel.diff = +x.dataset.d; A.play('ui'); renderBody(); });
    $('#bots').onchange = e => { save.settings.bots = +e.target.value; H.save(); };
    $('#deploy').onclick = () => { A.init(); A.play('ui'); H.dropScreen(); };
    const cv = $('#gal');
    cv.onclick = e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      let best = null, bd = 0.06; for (const q of DF.PLANETS) { const d = Math.hypot(q.x - x, (q.y - y) * 0.7); if (d < bd) { bd = d; best = q; } }
      if (best) { sel.planet = best; A.play('ui'); renderBody(); }
    };
  }

  function drawGalaxy() {
    const cv = $('#gal'), c = cv.getContext('2d'), w = cv.width, h = cv.height;
    c.fillStyle = '#0a0d12'; c.fillRect(0, 0, w, h);
    const rng = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(7);
    for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(232,226,200,' + (rng() * 0.5 + 0.1) + ')'; c.fillRect(rng() * w, rng() * h, rng() < 0.9 ? 1 : 2, 1); }
    // sector glows
    for (const [f, cx, cy] of [['brood', 0.2, 0.5], ['foundry', 0.8, 0.45], ['veil', 0.5, 0.2]]) { const g = c.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, 260); g.addColorStop(0, DF.Render.hexA(DF.FACTIONS[f].color, 0.16)); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    // home star
    c.fillStyle = '#e8e2c8'; c.beginPath(); c.arc(w * 0.5, h * 0.48, 7, 0, 7); c.fill();
    c.font = '600 12px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#a8a290'; c.fillText('HOME SYSTEM', w * 0.5, h * 0.48 + 22);
    c.strokeStyle = 'rgba(232,226,200,0.08)'; c.lineWidth = 1;
    for (const p of DF.PLANETS) { c.beginPath(); c.moveTo(w * 0.5, h * 0.48); c.lineTo(p.x * w, p.y * h); c.stroke(); }
    for (const p of DF.PLANETS) {
      const x = p.x * w, y = p.y * h, lib = save.planets[p.id], col = lib >= 100 ? '#9fe07a' : DF.FACTIONS[p.f].color, on = sel.planet === p;
      const b = DF.BIOMES[p.biome];
      const g = c.createRadialGradient(x - 4, y - 4, 2, x, y, 16); g.addColorStop(0, b.g3); g.addColorStop(1, b.g2);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 21, 0, 7); c.stroke();
      c.strokeStyle = col; c.beginPath(); c.arc(x, y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, lib / 100)); c.stroke();
      if (on) { c.strokeStyle = '#ffd27a'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.arc(x, y, 29, 0, 7); c.stroke(); c.setLineDash([]); }
      if (p.id === save.major.planet && !save.major.done) { c.fillStyle = '#ffd27a'; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + 6, y - 32); c.lineTo(x, y - 24); c.lineTo(x - 6, y - 32); c.fill(); }
      c.fillStyle = on ? '#ffd27a' : '#e8e2c8'; c.font = '600 13px "Chakra Petch", sans-serif'; c.fillText(p.name, x, y + 40);
      c.fillStyle = col; c.font = '500 11px "Chakra Petch", sans-serif'; c.fillText(lib >= 100 ? 'LIBERATED' : Math.floor(lib) + '%', x, y + 54);
    }
  }

  // ---------------------------------------------------------------- drop zone
  H.dropScreen = function () {
    const p = sel.planet;
    const M = DF.World.generate({ planet: p, type: sel.type, diff: sel.diff });
    let drop = { x: DF.WORLD * 0.5, y: DF.WORLD * 0.5 };
    // default drop: far from the objectives
    let best = 0; for (let i = 0; i < 40; i++) { const x = U.rand(500, DF.WORLD - 500), y = U.rand(500, DF.WORLD - 500); const d = Math.min(...M.objectives.map(o => Math.hypot(o.x - x, o.y - y)), ...M.outposts.map(o => Math.hypot(o.x - x, o.y - y) + 300)); if (d > best && d < 1500) { best = d; drop = { x, y }; } }
    $('#hub').hidden = true; $('#drop').hidden = false;
    const el = $('#drop');
    const size = Math.min(560, window.innerWidth - 40, window.innerHeight - 220);
    el.innerHTML = `<div class="drop-wrap"><h2>${esc(p.name)} · ${esc(DF.World.missionName(sel.type, p.f))} · ${DF.DIFFS[sel.diff - 1].name}</h2>
      <p>Click the map to pick where your pods land. Land away from enemy outposts unless you like a warm welcome.</p>
      <canvas id="dropmap" width="${size}" height="${size}" aria-label="Drop zone map"></canvas>
      <div class="row"><button class="btn" id="dropBack">Back</button><button class="btn primary big" id="dropGo">Launch drop pods</button></div></div>`;
    const cv = $('#dropmap'), c = cv.getContext('2d');
    const draw = () => DF.Render.drawDropMap(c, M, drop, size);
    draw();
    cv.onclick = e => { const r = cv.getBoundingClientRect(); drop = { x: (e.clientX - r.left) / r.width * DF.WORLD, y: (e.clientY - r.top) / r.height * DF.WORLD }; A.play('key'); draw(); };
    $('#dropBack').onclick = () => H.show('war');
    $('#dropGo').onclick = () => { A.init(); H.launch(M, drop); };
  };

  H.launch = function (M, drop) {
    const lo = Object.assign({}, save.loadout, { callins: save.loadout.callins.slice() });
    DF.Main.startMission({ M, planet: sel.planet, type: sel.type, diff: sel.diff, drop, bots: save.settings.bots, loadout: lo, save });
  };

  // ---------------------------------------------------------------- loadout
  function loadout(b) {
    const L = save.loadout;
    const opt = (list, cur, label) => list.map(([id, name]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(name)}</option>`).join('');
    const prim = save.owned.weapons.filter(w => DF.WEAPONS[w].slot === 'primary').map(w => [w, DF.WEAPONS[w].name]);
    const sec = save.owned.weapons.filter(w => DF.WEAPONS[w].slot === 'secondary').map(w => [w, DF.WEAPONS[w].name]);
    const gr = save.owned.grenades.map(g => [g, DF.GRENADES[g].name]);
    const ci = save.owned.callins.map(c => [c, DF.CALLINS[c].name]);
    const ar = save.owned.armors.map(a => [a, DF.ARMORS[a].name + ' (' + DF.ARMOR_CLASS[DF.ARMORS[a].cls].name + ')']);
    const ca = save.owned.capes.map(c => [c, DF.CAPES[c].name]);
    const bo = [['', 'None'], ...save.owned.boosters.map(x => [x, DF.BOOSTERS[x].name])];
    const ti = [['', 'Rank title only'], ...save.owned.titles.map(x => [x, DF.EXTRA_TITLES[x]])];
    const ka = save.owned.cards.map(x => [x, DF.CARDS[x].name]);
    const arm = DF.ARMORS[L.armor], cls = DF.ARMOR_CLASS[arm.cls];
    const wInfo = id => { const d = DF.WEAPONS[id]; return `${d.cls} · dmg ${d.dmg || d.dps + '/s'} · pen ${d.pen}${d.rpm ? ' · ' + d.rpm + ' rpm' : ''}<br>${esc(d.desc || '')}`; };
    b.innerHTML = `
      <div class="lo">
        <div class="lo-prev"><canvas id="prev" width="300" height="360" aria-label="Diver preview"></canvas>
          <div class="card" style="background:linear-gradient(135deg,${DF.CARDS[L.card].c1},${DF.CARDS[L.card].c2})"><b>${esc(save.name)}</b><span>${titleFor(save.level)}${L.title ? ' · ' + esc(DF.EXTRA_TITLES[L.title]) : ''}</span><i>Level ${save.level}</i></div>
          <div class="stats"><div><span>Armor rating</span><b>${cls.rating}</b></div><div><span>Speed</span><b>${Math.round(cls.speed * 100)}%</b></div><div><span>Stamina</span><b>${Math.round(cls.stamina * 100)}%</b></div></div>
          <p class="passive"><b>${DF.PASSIVES[arm.passive].name}:</b> ${DF.PASSIVES[arm.passive].desc}</p></div>
        <div class="lo-form">
          <div class="field"><label for="l_primary">Primary</label><select id="l_primary">${opt(prim, L.primary)}</select><small>${wInfo(L.primary)}</small></div>
          <div class="field"><label for="l_secondary">Secondary</label><select id="l_secondary">${opt(sec, L.secondary)}</select><small>${wInfo(L.secondary)}</small></div>
          <div class="field"><label for="l_grenade">Grenade</label><select id="l_grenade">${opt(gr, L.grenade)}</select><small>${esc(DF.GRENADES[L.grenade].desc)}</small></div>
          <div class="field"><label>Call-ins (four)</label><div class="ci4">${[0, 1, 2, 3].map(i => `<select id="l_ci${i}" aria-label="Call-in slot ${i + 1}">${opt([['', 'Empty'], ...ci], L.callins[i] || '')}</select>`).join('')}</div>
            <small>${L.callins.filter(Boolean).map(c => `${esc(DF.CALLINS[c].name)} <span class="code">${DF.CALLINS[c].code.split('').map(x => DF.Render.ARROW[x]).join('')}</span>`).join(' · ')}</small></div>
          <div class="field"><label for="l_armor">Armor</label><select id="l_armor">${opt(ar, L.armor)}</select></div>
          <div class="field"><label for="l_cape">Cape</label><select id="l_cape">${opt(ca, L.cape)}</select></div>
          <div class="field two"><div><label for="l_booster">Booster</label><select id="l_booster">${opt(bo, L.booster || '')}</select><small>${L.booster ? esc(DF.BOOSTERS[L.booster].desc) : 'Earn boosters from campaign passes.'}</small></div>
            <div><label for="l_card">Player card</label><select id="l_card">${opt(ka, L.card)}</select></div></div>
          <div class="field two"><div><label for="l_title">Title</label><select id="l_title">${opt(ti, L.title || '')}</select></div>
            <div><label for="l_name">Call sign</label><input id="l_name" maxlength="16" value="${esc(save.name)}"></div></div>
        </div>
      </div>`;
    if (H._stopTT) H._stopTT();
    try { H._stopTT = DF.Gfx.turntable($('#prev'), () => DF.Models.diver(arm, L.cape, { gunCls: DF.WEAPONS[L.primary].cls })); }
    catch (e) { const prev = $('#prev').getContext('2d'); const d = { arm, capeId: L.cape, weapons: [{ d: DF.WEAPONS[L.primary] }], cur: 0, vx: 0, vy: 0, walk: 0, id: 1, pack: null }; DF.Render.drawDiverAt(prev, d, 150, 150, -Math.PI / 2 + 0.3, 0, 7); }
    const bind = (id, fn) => { const el = $('#' + id); if (el) el.onchange = e => { fn(e.target.value); H.save(); A.play('ui'); renderBody(); }; };
    bind('l_primary', v => L.primary = v); bind('l_secondary', v => L.secondary = v); bind('l_grenade', v => L.grenade = v);
    for (let i = 0; i < 4; i++) bind('l_ci' + i, v => { if (v && L.callins.includes(v)) L.callins[L.callins.indexOf(v)] = ''; L.callins[i] = v; });
    bind('l_armor', v => L.armor = v); bind('l_cape', v => L.cape = v); bind('l_booster', v => L.booster = v || null);
    bind('l_card', v => L.card = v); bind('l_title', v => L.title = v || null);
    $('#l_name').onchange = e => { save.name = e.target.value.trim().slice(0, 16) || 'Diver'; H.save(); renderTop(); };
  }

  // ---------------------------------------------------------------- requisition (credits)
  function armory(b) {
    const rows = [];
    const add = (kind, id, name, cost, lvl, desc, ownedKind) => rows.push({ kind, id, name, cost, lvl: lvl || 1, desc, owned: own(ownedKind, id) });
    for (const [id, w] of Object.entries(DF.WEAPONS)) if (w.slot !== 'support' && !w.pass) add('Weapon', id, w.name, w.cost, w.lvl, w.cls + ' · pen ' + w.pen + ' · ' + (w.desc || ''), 'weapons');
    for (const [id, g] of Object.entries(DF.GRENADES)) if (!g.pass) add('Grenade', id, g.name, g.cost, g.lvl, g.desc, 'grenades');
    for (const [id, c] of Object.entries(DF.CALLINS)) if (c.cat !== 'mission') add(catName(c.cat), id, c.name, c.cost || 0, c.lvl, (c.desc || (c.give ? DF.WEAPONS[c.give].desc : '')) + ' Cooldown ' + c.cd + 's' + (c.uses ? ' · ' + c.uses + ' uses' : ''), 'callins');
    for (const [id, a] of Object.entries(DF.ARMORS)) if (!a.pass && !a.store) add('Armor', id, a.name, a.cost, a.lvl, DF.ARMOR_CLASS[a.cls].name + ' · ' + DF.PASSIVES[a.passive].name + ': ' + DF.PASSIVES[a.passive].desc, 'armors');
    const kinds = ['All', 'Weapon', 'Grenade', 'Orbital', 'Raptor', 'Support weapon', 'Backpack', 'Sentry', 'Mines', 'Vehicle', 'Armor'];
    H._rf = H._rf || 'All';
    const list = rows.filter(r => H._rf === 'All' || r.kind === H._rf).sort((a, c) => a.owned - c.owned || a.lvl - c.lvl);
    b.innerHTML = `<div class="shop"><div class="filters">${kinds.map(k => `<button class="chip${k === H._rf ? ' on' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="grid">${list.map(r => {
        const locked = save.level < r.lvl, afford = save.credits >= r.cost;
        return `<div class="item${r.owned ? ' owned' : ''}"><div class="it-h"><span class="kind">${r.kind}</span>${r.owned ? '<span class="own">Owned</span>' : locked ? '<span class="lock">Level ' + r.lvl + '</span>' : ''}</div>
          <b>${esc(r.name)}</b><p>${esc(r.desc)}</p>
          ${r.owned ? '' : `<button class="btn buy" data-id="${r.id}" data-kind="${r.kind}" ${locked || !afford ? 'disabled' : ''}>${r.cost ? '◈ ' + r.cost : 'Free'}</button>`}</div>`;
      }).join('')}</div></div>`;
    b.querySelectorAll('.chip').forEach(x => x.onclick = () => { H._rf = x.dataset.k; renderBody(); });
    b.querySelectorAll('.buy').forEach(x => x.onclick = () => {
      const r = rows.find(q => q.id === x.dataset.id); if (!r || save.credits < r.cost) return;
      save.credits -= r.cost;
      give(r.kind === 'Weapon' ? 'weapons' : r.kind === 'Grenade' ? 'grenades' : r.kind === 'Armor' ? 'armors' : 'callins', r.id);
      A.play('buy'); H.save(); renderTop(); renderBody(); toast(r.name + ' requisitioned');
    });
  }
  function catName(c) { return { orbital: 'Orbital', air: 'Raptor', support: 'Support weapon', backpack: 'Backpack', sentry: 'Sentry', mine: 'Mines', vehicle: 'Vehicle' }[c] || c; }

  // ---------------------------------------------------------------- ship modules (samples)
  function ship(b) {
    const costStr = c => [c.cr && '◈ ' + c.cr, c.c && '<b class="sc">' + c.c + ' common</b>', c.r && '<b class="sr">' + c.r + ' rare</b>', c.s && '<b class="ss">' + c.s + ' super</b>'].filter(Boolean).join(' · ');
    const can = c => save.credits >= (c.cr || 0) && save.samples.c >= (c.c || 0) && save.samples.r >= (c.r || 0) && save.samples.s >= (c.s || 0);
    b.innerHTML = `<div class="ship"><p class="lede">Samples come back from the surface only if you extract with them. Common samples are everywhere, rare ones show up from Challenging, super samples only from Extreme.</p>
      <div class="bays">${DF.MODULES.map(bay => `<section class="bay"><h3>${bay.bay}</h3>${bay.items.map((m, i) => {
        const have = save.modules.includes(m.id), prevOk = i === 0 || save.modules.includes(bay.items[i - 1].id);
        return `<div class="mod${have ? ' owned' : ''}"><div><b>${esc(m.name)}</b><p>${esc(m.desc)}</p><small>${costStr(m.cost)}</small></div>
          ${have ? '<span class="own">Installed</span>' : `<button class="btn buy" data-id="${m.id}" ${!prevOk || !can(m.cost) ? 'disabled' : ''}>${prevOk ? 'Install' : 'Needs previous'}</button>`}</div>`;
      }).join('')}</section>`).join('')}</div></div>`;
    b.querySelectorAll('.buy').forEach(x => x.onclick = () => {
      const m = DF.MODULES.flatMap(q => q.items).find(q => q.id === x.dataset.id); const c = m.cost;
      if (!can(c)) return;
      save.credits -= c.cr || 0; save.samples.c -= c.c || 0; save.samples.r -= c.r || 0; save.samples.s -= c.s || 0;
      save.modules.push(m.id); A.play('buy'); H.save(); renderTop(); renderBody(); toast(m.name + ' installed');
    });
  }

  // ---------------------------------------------------------------- campaign passes (medals)
  function itemName(it) {
    switch (it.k) {
      case 'weapon': return DF.WEAPONS[it.ref].name;
      case 'grenade': return DF.GRENADES[it.ref].name;
      case 'armor': return DF.ARMORS[it.ref].name;
      case 'cape': return DF.CAPES[it.ref].name + ' cape';
      case 'card': return DF.CARDS[it.ref].name + ' card';
      case 'title': return 'Title: ' + DF.EXTRA_TITLES[it.ref];
      case 'booster': return DF.BOOSTERS[it.ref].name + ' booster';
      case 'shards': return it.ref + ' Shards';
      case 'credits': return it.ref + ' Credits';
    }
  }
  function itemSwatch(it) {
    if (it.k === 'armor') { const a = DF.ARMORS[it.ref]; return `background:linear-gradient(135deg,${a.main} 55%,${a.trim} 55%)`; }
    if (it.k === 'cape') { const c = DF.CAPES[it.ref]; return `background:linear-gradient(90deg,${c.c1} 60%,${c.c2} 60%)`; }
    if (it.k === 'card') { const c = DF.CARDS[it.ref]; return `background:linear-gradient(135deg,${c.c1},${c.c2})`; }
    return '';
  }
  function grant(it) {
    switch (it.k) {
      case 'weapon': give('weapons', it.ref); break;
      case 'grenade': give('grenades', it.ref); break;
      case 'armor': give('armors', it.ref); break;
      case 'cape': give('capes', it.ref); break;
      case 'card': give('cards', it.ref); break;
      case 'title': give('titles', it.ref); break;
      case 'booster': give('boosters', it.ref); break;
      case 'shards': save.shards += it.ref; break;
      case 'credits': save.credits += it.ref; break;
    }
  }
  function passes(b) {
    H._pass = H._pass || DF.PASSES[0].id;
    const P = DF.PASSES.find(p => p.id === H._pass), st = save.passes[P.id] || { owned: !P.premium, claimed: [], spent: 0 };
    b.innerHTML = `<div class="passes"><div class="plist">${DF.PASSES.map(p => { const s = save.passes[p.id]; return `<button class="pass-b${p.id === P.id ? ' on' : ''}" data-p="${p.id}"><b>${esc(p.name)}</b><span>${p.premium ? (s && s.owned ? 'Owned' : '⬡ ' + p.cost) : 'Free'}</span></button>`; }).join('')}</div>
      <div class="pbody"><h2>${esc(P.name)}</h2><p class="lede">${esc(P.blurb)} Spend medals to unlock items in order of your choosing. Later pages open after you have spent enough in this pass.</p>
      ${!st.owned ? `<button class="btn primary" id="buyPass" ${save.shards < P.cost ? 'disabled' : ''}>Unlock for ⬡ ${P.cost} shards</button>${save.shards < P.cost ? '<p class="note">Find shards on missions, at shard caches, and in the free pass.</p>' : ''}` : ''}
      ${P.pages.map((page, pi) => {
        const open = st.owned && st.spent >= DF.PAGE_GATE[pi];
        return `<section class="page${open ? '' : ' closed'}"><h3>Page ${pi + 1}${open ? '' : ' · opens after ' + DF.PAGE_GATE[pi] + ' medals spent here (' + st.spent + ')'}</h3><div class="pitems">${page.map((it, ii) => {
          const key = pi + ':' + ii, got = st.claimed.includes(key);
          return `<div class="pi${got ? ' owned' : ''}"><div class="sw" style="${itemSwatch(it)}">${it.k === 'weapon' || it.k === 'grenade' ? '⌁' : it.k === 'shards' ? '⬡' : it.k === 'booster' ? '✚' : it.k === 'title' ? '❝' : it.k === 'credits' ? '◈' : ''}</div><b>${esc(itemName(it))}</b>
            ${got ? '<span class="own">Unlocked</span>' : `<button class="btn buy" data-key="${key}" ${!open || save.medals < it.m ? 'disabled' : ''}>✪ ${it.m}</button>`}</div>`;
        }).join('')}</div></section>`;
      }).join('')}</div></div>`;
    b.querySelectorAll('.pass-b').forEach(x => x.onclick = () => { H._pass = x.dataset.p; A.play('ui'); renderBody(); });
    const bp = $('#buyPass'); if (bp) bp.onclick = () => { if (save.shards < P.cost) return; save.shards -= P.cost; save.passes[P.id] = { owned: true, claimed: [], spent: 0 }; A.play('buy'); H.save(); renderTop(); renderBody(); toast(P.name + ' unlocked'); };
    b.querySelectorAll('.buy[data-key]').forEach(x => x.onclick = () => {
      const [pi, ii] = x.dataset.key.split(':').map(Number), it = P.pages[pi][ii];
      const s = save.passes[P.id]; if (!s || save.medals < it.m) return;
      save.medals -= it.m; s.spent += it.m; s.claimed.push(x.dataset.key); grant(it);
      A.play('buy'); H.save(); renderTop(); renderBody(); toast(itemName(it) + ' unlocked');
    });
  }

  // ---------------------------------------------------------------- quartermaster (shards)
  function store(b) {
    const day = Math.floor(Date.now() / 86400000);
    const pool = [...Object.entries(DF.ARMORS).filter(([, a]) => a.store).map(([id, a]) => ({ kind: 'armor', id, name: a.name, cost: a.store, sw: `background:linear-gradient(135deg,${a.main} 55%,${a.trim} 55%)`, desc: DF.ARMOR_CLASS[a.cls].name + ' · ' + DF.PASSIVES[a.passive].name })),
      ...Object.entries(DF.CAPES).filter(([, c]) => c.store).map(([id, c]) => ({ kind: 'cape', id, name: c.name + ' cape', cost: c.store, sw: `background:linear-gradient(90deg,${c.c1} 60%,${c.c2} 60%)`, desc: 'Cosmetic' }))];
    // a daily rotation of four featured items; everything else stays listed
    const featured = new Set(); for (let i = 0; i < Math.min(4, pool.length); i++) featured.add(pool[(day * 3 + i * 2 + Math.floor(i / 2)) % pool.length].id);
    b.innerHTML = `<div class="shop"><p class="lede">Cosmetics and armor sets for shards. Featured items rotate daily and cost 20% less.</p>
      <div class="grid">${pool.map(it => {
        const f = featured.has(it.id), cost = f ? Math.round(it.cost * 0.8) : it.cost, have = own(it.kind === 'armor' ? 'armors' : 'capes', it.id);
        return `<div class="item${have ? ' owned' : ''}"><div class="it-h"><span class="kind">${it.kind}</span>${f ? '<span class="feat">Featured</span>' : ''}${have ? '<span class="own">Owned</span>' : ''}</div><div class="sw big" style="${it.sw}"></div><b>${esc(it.name)}</b><p>${esc(it.desc)}</p>
          ${have ? '' : `<button class="btn buy" data-id="${it.id}" data-kind="${it.kind}" data-cost="${cost}" ${save.shards < cost ? 'disabled' : ''}>⬡ ${cost}</button>`}</div>`;
      }).join('')}</div></div>`;
    b.querySelectorAll('.buy').forEach(x => x.onclick = () => { const cost = +x.dataset.cost; if (save.shards < cost) return; save.shards -= cost; give(x.dataset.kind === 'armor' ? 'armors' : 'capes', x.dataset.id); A.play('buy'); H.save(); renderTop(); renderBody(); toast('Purchased'); });
  }

  // ---------------------------------------------------------------- codex
  function codex(b) {
    const fac = f => Object.entries(DF.ENEMIES).filter(([, e]) => e.f === f);
    const tierN = ['Light', 'Medium', 'Heavy', 'Command'];
    b.innerHTML = `<div class="codex">
      <section class="controls"><h3>Controls</h3><dl>
        <dt>WASD</dt><dd>Move</dd><dt>Mouse</dt><dd>Look · Left click fire · Right click aim down sights. Click the game once to capture the mouse.</dd><dt>Shift</dt><dd>Sprint</dd><dt>Space</dt><dd>Dive</dd>
        <dt>R</dt><dd>Reload</dd><dt>1 2 3 / scroll</dt><dd>Primary, secondary, support weapon</dd><dt>G</dt><dd>Throw grenade (drops cargo while carrying)</dd><dt>F</dt><dd>Stim</dd>
        <dt>Hold Q</dt><dd>Open call-ins, then type the code with WASD or arrow keys. Release and left-click to throw the beacon. Arrow keys also work while holding Ctrl.</dd>
        <dt>E</dt><dd>Interact, pick up, enter and leave vehicles</dd><dt>B</dt><dd>Use backpack (leap pack, supply pack)</dd><dt>M / Tab</dt><dd>Tactical map</dd><dt>Esc</dt><dd>Pause</dd></dl>
        <h3>Armor penetration</h3><p>Every enemy has an armor value. A hit with equal or higher penetration does full damage. One step lower glances for about a third. Anything lower bounces off with a grey <b>NO PEN</b> marker. Many heavies are softer from behind.</p>
        <h3>Friendly fire</h3><p>Explosions, fire, arcs, drop pods and orbital strikes hurt divers. Watch where you throw.</p></section>
      ${['brood', 'foundry', 'veil'].map(f => `<section><h3 style="color:${DF.FACTIONS[f].color}">${DF.FACTIONS[f].name}</h3><p>${DF.FACTIONS[f].desc}</p><div class="enemies">${fac(f).map(([id, e]) => `
        <div class="en"><canvas data-e="${id}" width="90" height="90" aria-label="${esc(e.name)}"></canvas><div><b>${esc(e.name)}</b><span>${tierN[e.tier]} · HP ${e.hp} · armor ${e.armor}${e.back != null ? ' (rear ' + e.back + ')' : ''}${e.shield ? ' · shield ' + e.shield : ''}${e.flying ? ' · flying' : ''}</span><p>${esc(e.desc || '')}</p></div></div>`).join('')}</div></section>`).join('')}</div>`;
    b.querySelectorAll('canvas[data-e]').forEach(cv => {
      try { const m = DF.Models.enemy(cv.dataset.e); if (m.update) m.update({ vx: 0, vy: 0, state: 'idle', id: 1, ang: 0 }, 0.016, 1); const url = DF.Gfx.thumb(m.root, 180, 180); const img = new Image(); img.src = url; img.width = 90; img.height = 90; img.alt = DF.ENEMIES[cv.dataset.e].name; img.className = 'thumb'; cv.replaceWith(img); }
      catch (e) { DF.Render.drawEnemyIcon(cv, cv.dataset.e); }
    });
  }

  function settings(b) {
    b.innerHTML = `<div class="settings"><div class="field"><label for="vol">Volume</label><input type="range" id="vol" min="0" max="1" step="0.05" value="${save.settings.vol}"></div>
      <div class="field"><label for="sens">Mouse sensitivity</label><input type="range" id="sens" min="0.2" max="3" step="0.05" value="${save.settings.sens || 1}"></div>
      <div class="field"><label for="fov">Field of view</label><input type="range" id="fov" min="60" max="100" step="1" value="${save.settings.fov || 75}"></div>
      <p class="lede">Progress is saved in this browser only. Clearing site data resets it.</p>
      <div class="row"><button class="btn" id="resetAsk">Reset all progress</button><span id="resetC" hidden>Are you sure? <button class="btn danger" id="resetYes">Yes, reset</button> <button class="btn" id="resetNo">Cancel</button></span></div>
      <h3>Training funds</h3><p class="lede">Testing the game and want to skip the grind? This grants resources and levels instantly.</p><button class="btn" id="grant">Grant test resources</button></div>`;
    $('#vol').oninput = e => { save.settings.vol = +e.target.value; A.setVol(save.settings.vol); H.save(); };
    $('#sens').oninput = e => { save.settings.sens = +e.target.value; H.save(); };
    $('#fov').oninput = e => { save.settings.fov = +e.target.value; H.save(); };
    $('#resetAsk').onclick = () => { $('#resetC').hidden = false; };
    $('#resetNo').onclick = () => { $('#resetC').hidden = true; };
    $('#resetYes').onclick = () => { H.reset(); toast('Progress reset'); H.show('war'); };
    $('#grant').onclick = () => { save.credits += 20000; save.medals += 300; save.shards += 3000; save.samples.c += 500; save.samples.r += 250; save.samples.s += 60; if (save.level < 20) { save.level = 20; save.xp = 0; } H.save(); renderTop(); toast('Resources granted'); A.play('buy'); };
  }

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(H._tt); H._tt = setTimeout(() => el.hidden = true, 2200); }
  H.toast = toast;

  // ---------------------------------------------------------------- results
  H.results = function (res) {
    const st = res.stats;
    save.stats.missions++; save.stats.kills += st.kills; save.stats.deaths += st.deaths;
    if (res.success) save.stats.wins++; if (res.extracted) save.stats.extracts++;
    const ups = addXp(res.xp);
    save.credits += res.credits; save.medals += res.medals; save.shards += res.shards;
    save.samples.c += res.samples.c; save.samples.r += res.samples.r; save.samples.s += res.samples.s;
    let libGain = 0, majorMsg = '';
    if (res.success) {
      const p = DF.PLANETS.find(q => q.id === res.planet);
      libGain = Math.round((4 + res.diff * 1.1) * (res.extracted ? 1 : 0.6));
      save.planets[p.id] = Math.min(100, save.planets[p.id] + libGain);
      if (save.planets[p.id] >= 100 && save.major.planet === p.id && !save.major.done) {
        save.major.done = true; save.medals += save.major.reward; majorMsg = 'Major order complete: +' + save.major.reward + ' medals';
        const next = DF.PLANETS.filter(q => save.planets[q.id] < 100);
        if (next.length) save.major = { planet: U.pick(next).id, reward: 40, done: false };
      }
    }
    H.save();
    const el = $('#results');
    $('#game').hidden = true; el.hidden = false;
    const fmt = s => U.fmtTime(s);
    const big = res.stats.biggest ? DF.ENEMIES[res.stats.biggest].name : '—';
    el.innerHTML = `<div class="res"><h1 class="${res.success ? 'ok' : 'bad'}">${res.success ? (res.extracted ? 'Mission complete' : 'Objectives complete · no extraction') : 'Mission failed'}</h1>
      <p class="lede">${esc(DF.PLANETS.find(q => q.id === res.planet).name)} · ${esc(DF.World.missionName(res.type, DF.PLANETS.find(q => q.id === res.planet).f))} · ${DF.DIFFS[res.diff - 1].name} · ${fmt(res.time)}</p>
      <div class="rgrid">
        <div><span>Kills</span><b>${st.kills}</b></div><div><span>Deaths</span><b>${st.deaths}</b></div><div><span>Accuracy</span><b>${st.shots ? Math.round(st.hits / st.shots * 100) : 0}%</b></div><div><span>Call-ins used</span><b>${st.callins}</b></div>
        <div><span>Outposts cleared</span><b>${st.outposts}</b></div><div><span>Side targets</span><b>${st.side}</b></div><div><span>Biggest kill</span><b>${esc(big)}</b></div><div><span>Friendly kills</span><b>${st.tk}</b></div>
      </div>
      <h3>Rewards</h3>
      <div class="rgrid rew"><div><span>Experience</span><b>+${res.xp}</b></div><div><span>Credits</span><b>◈ +${res.credits}</b></div><div><span>Medals</span><b>✪ +${res.medals}</b></div><div><span>Shards</span><b>⬡ +${res.shards}</b></div>
        <div><span>Samples ${res.extracted ? '' : '(lost, not extracted)'}</span><b><b class="sc">${res.samples.c}</b> · <b class="sr">${res.samples.r}</b> · <b class="ss">${res.samples.s}</b></b></div>
        <div><span>Liberation</span><b>${libGain ? '+' + libGain + '%' : '—'}</b></div></div>
      ${ups.length ? `<p class="up">Promoted to level ${save.level}: ${titleFor(save.level)}. New gear is available in Requisition.</p>` : ''}
      ${majorMsg ? `<p class="up">${majorMsg}</p>` : ''}
      <button class="btn primary big" id="toShip">Return to ship</button></div>`;
    $('#toShip').onclick = () => H.show('war');
  };
})();
