'use strict';
// Expansion UI: hangar tabs with the customisation tree, the stratagem screen, and new shop offers.
(function () {
  const G = SM.G, UI = SM.UI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = SM.fmt;

  UI.stratIcon = s => s.id.split('_')[1].slice(0, 4).toUpperCase();

  // ---------------------------------------------------------------- hangar: tabbed detail
  UI.hangarTab = 'overview';
  const baseDetail = UI.unitDetail, baseBind = UI.bindDetail;
  UI.unitDetail = function (u) {
    const html = baseDetail(u);
    const parts = html.split('<h4>');
    const head = parts[0].replace('<div class="detail">', '');
    const ab = '<h4>' + parts[1], mods = '<h4>' + parts[2], camo = '<h4>' + parts[3].replace(/<\/div>\s*$/, '');
    const tabs = [['overview', 'Overview'], ['mods', 'Modifications'], ['cust', 'Customise'], ['camo', 'Camouflage']];
    const t = UI.hangarTab;
    const body = t === 'overview' ? head + ab : t === 'mods' ? mods : t === 'cust' ? UI.custTree(u) : camo;
    return `<div class="detail"><div class="htabs">${tabs.map(x => `<button class="${t === x[0] ? 'on' : ''}" data-htab="${x[0]}">${x[1]}</button>`).join('')}</div>${t !== 'overview' ? head.match(/<div class="row-btns">.*?<\/div>/s)[0] : ''}${body}</div>`;
  };
  UI.custTree = function (u) {
    const list = SM.customsFor(u);
    const rec = G.s.cust[u.id] || { owned: [], eq: [] };
    const ownedN = rec.owned.length;
    const rows = [1, 2, 3, 4, 5].map(tier => {
      const items = list.filter(c => c.tier === tier);
      if (!items.length) return '';
      const reqs = [...new Set(items.map(c => c.req).filter(Boolean))].map(r => (u.mods.find(m => m.id === r) || {}).name).filter(Boolean);
      return `<div class="ctier"><div class="ct-h"><b>Tier ${SM.ROMAN[tier]}</b><span>${tier === 1 ? 'Available once you own the unit' : 'Needs a tier ' + SM.ROMAN[tier - 1] + ' part' + (reqs.length ? ' and: ' + esc(reqs.join(', ')) : '')}</span></div>
        <div class="cnodes">${items.map(c => { const st = G.custStatus(u, c); const price = SM.customPrice(u, c); const reqName = c.req ? (u.mods.find(m => m.id === c.req) || {}).name : '';
          return `<button class="cnode ${st}" data-cust="${c.id}" title="${esc(c.desc)}"><span class="cc">${esc(c.cat)}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small><em>${st === 'equipped' ? 'Equipped · click to remove' : st === 'owned' ? 'Owned · click to equip' : st === 'open' ? fmt(price) + ' cr' : st === 'needmod' ? 'Needs ' + esc(reqName) : st === 'needtier' ? 'Needs tier ' + SM.ROMAN[tier - 1] : 'Own the unit'}</em></button>`; }).join('')}</div></div>`;
    }).join('');
    return `<h4>Customisation tree</h4><p class="muted small">${ownedN} of ${list.length} parts owned. Parts are cosmetic and shown on the 3D model in the hangar and in battle. Finish, light and tracer parts replace each other.</p><div class="ctree">${rows}</div>`;
  };
  UI.bindDetail = function (el, u, rerender) {
    baseBind(el, u, rerender);
    if (!u) return;
    $$('[data-htab]', el).forEach(b => b.onclick = () => { UI.hangarTab = b.dataset.htab; rerender(); });
    $$('[data-cust]', el).forEach(b => b.onclick = () => {
      const c = SM.CUSTOM[b.dataset.cust], st = G.custStatus(u, c);
      if (st === 'owned' || st === 'equipped') { G.equipCust(u, c.id); rerender(); return; }
      const e = G.buyCust(u, c.id);
      if (e) UI.toast(e, 'bad'); else { UI.toast(c.name + ' fitted to ' + u.name, 'good'); SM.Audio.reward(0); }
      rerender(); UI.wallet();
    });
  };

  // ---------------------------------------------------------------- stratagems screen
  UI.render.strats = function () {
    const s = G.s, st = s.strat, el = $('#scr-strats');
    const L = st.loadout;
    const owned = SM.STRATAGEMS.filter(x => st.owned[x.id]).length;
    el.innerHTML = `<div class="strats">
      <div class="ph"><div><span class="eyebrow">Off-map support</span><h2>Stratagems</h2><p class="muted">Call them in battle with <b>T Y U I</b> or the stratagem bar. Each call costs Command Points and then recharges. Research with RP, buy with credits, then upgrade each one through its own tree.</p></div>
        <div class="r-info"><span>${owned}/${SM.STRATAGEMS.length} owned</span><span>RP <b>${fmt(s.rp)}</b> · Credits <b>${fmt(s.credits)}</b></span></div></div>
      <div class="loadout panel"><span class="eyebrow">Battle loadout · ${L.length}/4</span><div class="lslots">${[0, 1, 2, 3].map(i => { const d = SM.STRAT[L[i]]; if (!d) return '<div class="lslot empty">Empty slot</div>'; const br = SM.STRAT_BRANCHES.find(b => b.id === d.br); return `<button class="lslot" data-sl="${d.id}" style="--bc:${br.color}"><i>${'TYUI'[i]}</i><b>${UI.stratIcon(d)}</b><span>${esc(d.name)}</span><small>Click to remove</small></button>`; }).join('')}</div></div>
      <div class="sgrid" style="--cols:${SM.STRAT_BRANCHES.length}">
        <div class="corner"></div>${SM.STRAT_BRANCHES.map(b => `<div class="line-name" style="color:${b.color}">${esc(b.name)}</div>`).join('')}
        ${[1, 2, 3, 4, 5, 6].map(rk => `<div class="rank">${SM.ROMAN[rk]}</div>` + SM.STRAT_BRANCHES.map(b => { const d = SM.STRATAGEMS.find(x => x.br === b.id && x.rank === rk); if (!d) return '<div class="cell"></div>'; const stt = G.stratStatus(d.id); const ups = (st.ups[d.id] || []).length, upN = SM.stratUpgrades(d).length;
          return `<div class="cell${rk === 6 ? ' last' : ''}"><button class="snode ${stt}${L.indexOf(d.id) >= 0 ? ' inl' : ''}" data-strat="${d.id}" style="--bc:${b.color}"><b class="sic">${UI.stratIcon(d)}</b><strong>${esc(d.name)}</strong><span>${d.cp ? d.cp + ' CP · ' : ''}${d.cd}s</span><em>${stt === 'owned' ? 'Owned · ' + ups + '/' + upN + ' upgrades' : stt === 'buy' ? fmt(d.price) + ' cr' : fmt(d.rp) + ' RP'}</em></button></div>`; }).join('')).join('')}
      </div></div>`;
    $$('[data-sl]', el).forEach(b => b.onclick = () => { G.toggleStratLoadout(b.dataset.sl); UI.render.strats(); });
    $$('[data-strat]', el).forEach(b => b.onclick = () => UI.stratModal(b.dataset.strat));
  };
  UI.stratModal = function (id) {
    const d = SM.STRAT[id], s = G.s, st = G.stratStatus(id);
    const br = SM.STRAT_BRANCHES.find(b => b.id === d.br);
    const ups = SM.stratUpgrades(d), have = s.strat.ups[id] || [];
    const p = SM.stratParams(d, have);
    const facts = [['Command Points', p.cost], ['Cooldown', Math.round(p.cooldown) + ' s'], p.r ? ['Radius', Math.round(p.r) + ' m'] : null, p.dmg > 1 ? ['Damage', Math.round(p.dmg)] : null, p.n ? ['Count', p.n] : null, p.dur ? ['Duration', Math.round(p.dur) + ' s'] : null, p.cpGain ? ['CP gained', Math.round(p.cpGain)] : null, p.cls ? ['Delivers', SM.CLASSES[p.cls].name] : null, p.echo ? ['Command Override', 'Second strike'] : null].filter(Boolean);
    let act = '';
    if (st === 'research') act = `<button class="btn primary" id="sAct">Research for ${fmt(d.rp)} RP</button>`;
    else if (st === 'buy') act = `<button class="btn primary" id="sAct">Buy for ${fmt(d.price)} credits</button>`;
    else if (st === 'owned') act = `<button class="btn ${s.strat.loadout.indexOf(id) >= 0 ? 'ghost' : 'primary'}" id="sAct">${s.strat.loadout.indexOf(id) >= 0 ? 'Remove from loadout' : 'Add to loadout'}</button>`;
    else act = `<p class="muted">Research ${esc(SM.STRAT[d.parent].name)} first.</p>`;
    UI.modal(`<div class="strat-modal" style="--bc:${br.color}"><div class="sm-head"><b class="sic big">${UI.stratIcon(d)}</b><div><span class="eyebrow" style="color:${br.color}">${esc(br.name)} · Rank ${SM.ROMAN[d.rank]}</span><h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p></div></div>
      <div class="facts">${facts.map(f => `<div><span>${f[0]}</span><b>${f[1]}</b></div>`).join('')}</div>
      <h4>Upgrade tree</h4><div class="uptree">${[1, 2, 3].map(t => `<div class="ctier"><div class="ct-h"><b>Tier ${SM.ROMAN[t]}</b><span>${t === 1 ? 'Needs the stratagem' : 'Needs a tier ' + SM.ROMAN[t - 1] + ' upgrade'}</span></div><div class="cnodes">${ups.filter(u => u.tier === t).map(u => { const us = G.stratUpStatus(id, u); return `<button class="cnode ${us === 'done' ? 'equipped' : us === 'open' ? 'open' : 'needtier'}" data-up="${u.id}"><b>${esc(u.name)}</b><small>${esc(u.desc)}</small><em>${us === 'done' ? 'Installed' : fmt(u.price) + ' cr'}</em></button>`; }).join('')}</div></div>`).join('')}</div>
      <div class="row-btns">${act}<button class="btn ghost" data-close>Close</button></div></div>`, 'wide');
    const b = $('#sAct');
    if (b) b.onclick = () => {
      const e = st === 'research' ? G.researchStrat(id) : st === 'buy' ? G.buyStrat(id) : G.toggleStratLoadout(id);
      if (e) UI.toast(e, 'bad'); else if (st !== 'owned') { UI.toast(d.name + (st === 'research' ? ' researched' : ' purchased'), 'good'); SM.Audio.reward(1); }
      UI.render.strats(); UI.wallet(); UI.stratModal(id);
    };
    $$('[data-up]').forEach(x => x.onclick = () => { const e = G.buyStratUp(id, x.dataset.up); if (e) UI.toast(e, 'bad'); else { UI.toast('Upgrade installed', 'good'); SM.Audio.reward(0); } UI.render.strats(); UI.wallet(); UI.stratModal(id); });
  };

  // ---------------------------------------------------------------- shop: stratagem and customisation flash offers
  const baseFlash = G.flashOffers;
  G.flashOffers = function (now) {
    const out = baseFlash(now), idx = SM.flashIndex(now), r = SM.rng(idx * 4513 + 9);
    const un = SM.STRATAGEMS.filter(x => !G.s.strat.owned[x.id]);
    if (un.length) { const d = un[Math.floor(r() * un.length)]; const base = Math.round(d.rank * 220 + 180); out.push({ key: 'f' + idx + 'g', kind: 'stratUnlock', strat: d.id, base, price: Math.round(base * 0.55), off: 0.45, cur: 'cores' }); }
    const units = Object.keys(G.s.owned).map(SM.getUnit).filter(Boolean);
    for (let tries = 0; tries < 30 && units.length; tries++) {
      const u = units[Math.floor(r() * units.length)];
      const cs = SM.customsFor(u).filter(c => c.tier >= 2 && G.custOwned(u.id).indexOf(c.id) < 0);
      if (cs.length) { const c = cs[Math.floor(r() * cs.length)]; const base = Math.round(SM.customPrice(u, c) / 120 + 90); out.push({ key: 'f' + idx + 'k', kind: 'cust', unit: u, cust: c.id, base, price: Math.round(base * 0.5), off: 0.5, cur: 'cores' }); break; }
    }
    return out;
  };
  const baseOffer = UI.offer;
  UI.offer = function (o) {
    if (o.kind !== 'stratUnlock' && o.kind !== 'cust') return baseOffer(o);
    const s = G.s;
    let title, sub, art, owned;
    if (o.kind === 'stratUnlock') { const d = SM.STRAT[o.strat], br = SM.STRAT_BRANCHES.find(b => b.id === d.br); title = 'Stratagem: ' + d.name; sub = esc(br.name + ' · Rank ' + SM.ROMAN[d.rank]) + '<br><span class="muted">' + esc(d.desc) + '</span>'; art = `<div class="art-boost strat-art" style="--bc:${br.color}">${UI.stratIcon(d)}</div>`; owned = !!s.strat.owned[o.strat]; }
    else { const c = SM.CUSTOM[o.cust]; title = c.name; sub = 'for ' + esc(o.unit.name) + '<br><span class="muted">' + esc(c.desc) + '</span>'; art = `<img data-pid="${o.unit.id}" alt="">`; owned = G.custOwned(o.unit.id).indexOf(o.cust) >= 0; }
    const bought = !!s.flash[o.key];
    return `<div class="offer${bought || owned ? ' done' : ''}"><span class="off">-${Math.round(o.off * 100)}%</span><div class="o-art">${art}</div><div class="o-body"><b>${esc(title)}</b><span class="o-sub">${sub}</span></div>
      <div class="o-buy"><s>${fmt(o.base)}</s><button class="btn small ${bought || owned ? 'ghost' : 'primary'}" data-offer="${o.key}" ${bought || owned ? 'disabled' : ''}>${bought ? 'Bought' : owned ? 'Owned' : fmt(o.price) + ' ◆'}</button></div></div>`;
  };
  const baseBuy = UI.buyOffer;
  UI.buyOffer = function (key, all) {
    const o = all.find(x => x.key === key);
    if (!o || (o.kind !== 'stratUnlock' && o.kind !== 'cust')) return baseBuy(key, all);
    const label = o.kind === 'stratUnlock' ? 'the ' + SM.STRAT[o.strat].name + ' stratagem' : SM.CUSTOM[o.cust].name + ' for ' + o.unit.name;
    UI.confirmBuy(`Buy ${label} for ${fmt(o.price)} cores?`, () => {
      if (G.s.flash[o.key]) return 'Already bought.';
      if (!G.spend('cores', o.price)) return 'Not enough cores.';
      if (o.kind === 'stratUnlock') G.grant({ kind: 'strat', strat: o.strat });
      else { G.grant({ kind: 'cust', unit: o.unit, cust: o.cust }); G.equipCust(o.unit, o.cust, true); }
      G.s.flash[o.key] = true; G.save(); SM.Audio.reward(1); return null;
    });
  };

  // ---------------------------------------------------------------- profile additions
  const baseProfile = UI.render.profile;
  UI.render.profile = function () {
    baseProfile();
    const s = G.s, el = $('#scr-profile .profile');
    let parts = 0; for (const k in s.cust) parts += s.cust[k].owned.length;
    const sOwned = SM.STRATAGEMS.filter(x => s.strat.owned[x.id]).length;
    el.insertAdjacentHTML('beforeend', `<div class="panel"><span class="eyebrow">Arsenal</span><div class="res-stats"><div><b>${sOwned}/${SM.STRATAGEMS.length}</b><span>Stratagems owned</span></div><div><b>${parts}</b><span>Custom parts owned</span></div><div><b>${fmt(s.stats.strats || 0)}</b><span>Stratagems called</span></div><div><b>${fmt(s.stats.mechs || 0)}</b><span>Mechs destroyed</span></div><div><b>${fmt(s.stats.naval || 0)}</b><span>Ships sunk</span></div></div></div>`);
  };
})();
