// ============================================================================
// TERMINAL — the markets view. Watchlist, indices, sector performance, a
// market-cap heat map, movers, the economic calendar, and the screener with
// the council's own ranking run across a list.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, U = M.Universe, P = M.Portfolio;

let rows = [], heatCells = [], sectorBars = [];

function watchCard() {
  const body = el('div', { class: 'cbody tight' });
  const paint = () => {
    M.clear(body); rows = rows.filter(r => !r.__wl);
    if (!P.watch.length) { body.appendChild(el('div', { class: 'empty', text: 'Nothing watched. Search a ticker and add it from its page.' })); return; }
    for (const s of P.watch) {
      const i = U.get(s); if (!i) continue;
      const r = UI.quoteRow(i); r.__wl = true; rows.push(r); body.appendChild(r);
    }
  };
  paint();
  M.on('watch', paint);
  return UI.card('Watchlist', body, el('button', { class: 'btn sm', text: 'Edit', onclick: () => UI.go('portfolio') }));
}

function listCard(title, syms, sub) {
  const body = el('div', { class: 'cbody tight' });
  for (const s of syms) { const i = U.get(s); if (!i) continue; const r = UI.quoteRow(i, { sub: sub ? sub(i) : null }); rows.push(r); body.appendChild(r); }
  return UI.card(title, body);
}

function sectorCard() {
  const body = el('div', { class: 'cbody' });
  sectorBars = [];
  for (const s of U.sectorList()) {
    const node = el('div', { class: 'sectorbar' }, [
      el('button', { style: { textAlign: 'left', fontSize: '12px' }, text: s, onclick: () => showSector(s) }),
      el('div', { class: 'track' }, [el('i')]),
      el('div', { class: 'r num', style: { fontSize: '11.5px' } })
    ]);
    node.__sector = s; sectorBars.push(node); body.appendChild(node);
  }
  paintSectors();
  return UI.card('Sectors — cap weighted', body);
}
function paintSectors() {
  const perf = M.Sim.sectorPerf(), by = {};
  for (const p of perf) by[p.sector] = p.chgPct;
  const max = Math.max(1, ...perf.map(p => Math.abs(p.chgPct)));
  for (const node of sectorBars) {
    const v = by[node.__sector] || 0;
    const bar = node.querySelector('i');
    const w = Math.abs(v) / max * 50;
    bar.style.width = w + '%';
    bar.style.left = v >= 0 ? '50%' : (50 - w) + '%';
    bar.style.background = v >= 0 ? 'var(--up)' : 'var(--dn)';
    const out = node.children[2];
    M.setText(out, M.fmt.pct(v));
    out.className = 'r num ' + M.fmt.sign(v);
  }
}

function showSector(sector) {
  const list = (U.sectors[sector] || []).filter(i => i.type === 'stock').sort((a, b) => b.chgPct - a.chgPct);
  UI.modal(sector, [
    el('div', { style: { maxHeight: '60vh', overflowY: 'auto' } }, list.map(i => UI.quoteRow(i))),
    el('div', { style: { marginTop: '10px' } }, [el('button', { class: 'btn', text: 'Run the council across this sector', onclick: () => { UI.closeModal(); UI.go('screener', 'SECTOR:' + sector); } })])
  ]);
}

function heatCard() {
  const body = el('div', { class: 'cbody' });
  const grid = el('div', { class: 'heat' });
  heatCells = [];
  const stocks = U.ofType('stock').slice().sort((a, b) => (b.f.mcap || 0) - (a.f.mcap || 0)).slice(0, 96);
  for (const i of stocks) {
    const c = el('button', { class: 'ht', onclick: () => UI.openSymbol(i.sym) }, [el('b', { text: i.sym }), el('span')]);
    c.__inst = i; heatCells.push(c); grid.appendChild(c);
  }
  body.appendChild(grid);
  body.appendChild(el('p', { class: 'note', style: { marginTop: '8px' }, text: 'The 96 largest names by market value, shaded by today’s move. Click through to the symbol page.' }));
  paintHeat();
  return UI.card('Heat map', body);
}
const paintHeat = M.throttle(() => {
  for (const c of heatCells) {
    const i = c.__inst, v = M.clamp(i.chgPct / 4, -1, 1);
    const a = Math.abs(v);
    c.style.background = v >= 0 ? `rgba(46,189,133,${.1 + a * .6})` : `rgba(240,82,107,${.1 + a * .6})`;
    M.setText(c.querySelector('span'), M.fmt.pct(i.chgPct, 1));
  }
}, 1100);

function breadthCard() {
  const body = el('div', { class: 'cbody' });
  const dl = el('dl', { class: 'kv' });
  body.appendChild(dl);
  const paint = () => {
    const b = M.Sim.breadth(), reg = M.Sim.regimeInfo();
    M.clear(dl);
    const add = (k, v, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); };
    add('Advancing', String(b.up), 'up');
    add('Declining', String(b.dn), 'dn');
    add('Advance / decline', b.ratio.toFixed(2), b.ratio > 1 ? 'up' : 'dn');
    add('Cap-weighted move', M.fmt.pct(b.capWeighted), M.fmt.sign(b.capWeighted));
    add('Equal-weighted move', M.fmt.pct(b.equalWeighted), M.fmt.sign(b.equalWeighted));
    add('Breadth divergence', (b.capWeighted - b.equalWeighted >= 0 ? '+' : '') + (b.capWeighted - b.equalWeighted).toFixed(2) + ' pts', Math.abs(b.capWeighted - b.equalWeighted) > .4 ? 'dn' : '');
    add('Regime', reg.name, reg.tone === 'g' ? 'up' : reg.tone === 'r' ? 'dn' : '');
    add('Regime age', M.fmt.dur(Date.now() - reg.since));
    add('Session', (M.Sim.sess || M.Sim.session()).name);
  };
  paint();
  body.__paint = paint;
  body.appendChild(el('p', { class: 'note', style: { marginTop: '9px' }, text: 'When the cap-weighted move runs well ahead of the equal-weighted one, the index is being carried by a handful of names — a narrowing that has preceded most of the drawdowns worth avoiding.' }));
  const card = UI.card('Breadth', body);
  card.__paint = paint;
  return card;
}

function calendarCard() {
  const body = el('div', { class: 'cbody tight' });
  for (const e of M.News.upcoming(10)) {
    const when = new Date(e.at);
    const soon = e.at - Date.now() < 36e5 * 26;
    body.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '86px 1fr auto', gap: '9px', padding: '7px 11px', borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'center' } }, [
      el('div', { class: 'num dim', style: { fontSize: '11px' }, text: M.fmt.dayMon(e.at) + ' ' + M.fmt.hm(e.at) }),
      el('div', {}, [el('div', { style: { fontSize: '12.5px', fontWeight: 600, color: soon ? 'var(--acc)' : null }, text: e.name }), el('div', { class: 'dim', style: { fontSize: '11px' }, text: e.agency + (e.note ? ' — ' + e.note : '') })]),
      (() => { const im = el('span', { class: 'imp' + (e.impact >= 4 ? ' hi' : '') }); for (let i = 0; i < 5; i++) im.appendChild(el('i', { class: i < e.impact ? 'on' : '' })); return im; })()
    ]));
  }
  return UI.card('Economic calendar', body, el('span', { class: 'pill sim', text: 'SCHEDULE' }));
}

function moversCard() {
  const body = el('div', { class: 'cbody tight' });
  const tabs = el('div', { class: 'chead', style: { background: 'transparent', borderBottom: '1px solid var(--line)' } });
  const list = el('div');
  let mode = 'gainers';
  const paint = () => {
    M.clear(list);
    const m = M.Sim.movers(12);
    for (const i of m[mode]) { const r = UI.quoteRow(i, { sub: mode === 'active' ? M.fmt.cap(i.vol * i.px) + ' traded' : i.name }); rows.push(r); list.appendChild(r); }
  };
  tabs.appendChild(UI.seg([['gainers', 'Gainers'], ['losers', 'Losers'], ['active', 'Most active']], mode, v => { mode = v; paint(); }));
  body.appendChild(tabs); body.appendChild(list); paint();
  setInterval(() => { if (!document.hidden && UI.current === 'markets') paint(); }, 12000);
  return UI.card('Movers', body);
}

UI.register('markets', {
  label: 'Markets',
  mount(node) {
    rows = [];
    const wrap = el('div', { class: 'wrap' });
    const liveCount = M.sources.all().filter(s => s.status === 'live').length;
    if (!liveCount) wrap.appendChild(el('div', { class: 'warn', style: { marginBottom: '12px' } }, [
      el('b', { text: 'No live market feed connected. ' }),
      'Prices on this screen are coming from the terminal’s own simulation — a three-factor return model under a regime process, not a market. Crypto, FX and the Treasury debt figure connect without a key and may already be live; US equities need a free Finnhub key. ',
      el('button', { class: 'btn sm', text: 'Open Sources', onclick: () => UI.go('sources') })
    ]));

    const top = el('div', { class: 'cols s3' });
    const left = el('div', { class: 'grid' }, [watchCard(), listCard('Indices', ['SPX', 'NDX', 'DJI', 'RUT', 'VIX']), listCard('Rates', ['US2Y', 'US10Y', 'US30Y'], i => i.name)]);
    const mid = el('div', { class: 'grid' }, [heatCard(), moversCard()]);
    const right = el('div', { class: 'grid' }, [breadthCard(), sectorCard(), listCard('Commodities & FX', ['GC', 'SI', 'CL', 'HG', 'DXY', 'EURUSD']), listCard('Digital assets', ['BTC', 'ETH', 'SOL'])]);
    top.appendChild(left); top.appendChild(mid); top.appendChild(right);
    wrap.appendChild(top);

    const lower = el('div', { class: 'cols c2', style: { marginTop: '12px' } }, [calendarCard(), newsCard()]);
    wrap.appendChild(lower);
    node.appendChild(wrap);
    this.__breadth = wrap.querySelector('.card');
  },
  update: M.throttle(function () {
    for (const r of rows) UI.paintQuote(r);
    paintHeat(); paintSectors();
    const b = M.$$('#v-markets .card').find(c => c.__paint);
    if (b) b.__paint();
  }, 850)
});

function newsCard() {
  const body = el('div', { class: 'cbody tight', style: { maxHeight: '420px', overflowY: 'auto' } });
  const paint = () => { M.clear(body); for (const n of M.News.items.slice(0, 14)) body.appendChild(UI.newsItem(n, { compact: true })); };
  paint();
  M.on('news', M.throttle(() => { if (UI.current === 'markets') paint(); }, 4000));
  return UI.card('Wire', body, el('button', { class: 'btn sm', text: 'All news', onclick: () => UI.go('news') }));
}

// ---------------------------------------------------------------------------
// Screener: filters over the universe, plus an optional full council pass.
UI.register('screener', {
  label: 'Screener',
  mount(node, arg) {
    const wrap = el('div', { class: 'wrap' });
    const f = M.store.get('screen', { type: 'stock', sector: 'all', pe: '', pb: '', divMin: '', mcapMin: '', roeMin: '', growthMin: '', q: '' });
    if (arg && arg.startsWith('SECTOR:')) f.sector = arg.slice(7);

    const out = el('div', { class: 'card', style: { marginTop: '12px' } });
    const controls = el('div', { class: 'cbody', style: { display: 'grid', gap: '9px', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' } });

    const mk = (key, label, type, opts) => {
      const input = type === 'select'
        ? el('select', { onchange: e => { f[key] = e.target.value; run(); } }, opts.map(o => el('option', { value: o[0], selected: f[key] === o[0] ? true : null, text: o[1] })))
        : el('input', { type: type || 'number', value: f[key], placeholder: opts || '', oninput: M.debounce(e => { f[key] = e.target.value; run(); }, 260) });
      controls.appendChild(el('label', { class: 'fld' }, [el('span', { text: label }), input]));
    };
    mk('type', 'Instrument', 'select', [['stock', 'Stocks'], ['etf', 'ETFs'], ['bond', 'Treasuries'], ['crypto', 'Crypto'], ['future', 'Futures'], ['fx', 'FX'], ['all', 'Everything']]);
    mk('sector', 'Sector', 'select', [['all', 'All sectors']].concat(U.sectorList().map(s => [s, s])));
    mk('pe', 'Max P/E', 'number', 'any');
    mk('pb', 'Max P/B', 'number', 'any');
    mk('divMin', 'Min dividend %', 'number', 'any');
    mk('roeMin', 'Min ROE %', 'number', 'any');
    mk('growthMin', 'Min revenue growth %', 'number', 'any');
    mk('mcapMin', 'Min market cap ($B)', 'number', 'any');

    const presets = el('div', { class: 'cbody', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: 0 } });
    const preset = (name, patch, why) => presets.appendChild(el('button', { class: 'btn sm', title: why, text: name, onclick: () => { Object.assign(f, { type: 'stock', sector: 'all', pe: '', pb: '', divMin: '', roeMin: '', growthMin: '', mcapMin: '' }, patch); rebuild(); } }));
    preset('Graham defensive', { pe: 15, pb: 1.5, mcapMin: 2 }, "Graham's ceilings: P/E under 15, P/B under 1.5, adequate size.");
    preset('Quality compounder', { roeMin: 18, growthMin: 8 }, 'High returns on equity with the top line still growing.');
    preset('Dividend income', { divMin: 3, pe: 22 }, 'Yield above 3% without paying a growth multiple for it.');
    preset('Growth at a price', { growthMin: 15, pe: 30 }, 'Growing 15%+ but not yet priced as a certainty.');
    preset('Deep value', { pb: 1, pe: 12 }, 'The uncomfortable decile — cheap on both assets and earnings.');

    const table = el('div', { class: 'cbody tight' });
    const count = el('span', { class: 'pill' });

    function rebuild() { M.clear(controls); M.store.set('screen', f); node.replaceChildren(); this_mount(); }
    const this_mount = () => UI.go('screener', f.sector !== 'all' ? 'SECTOR:' + f.sector : undefined);

    function matches(i) {
      if (f.type !== 'all' && i.type !== f.type) return false;
      if (f.sector !== 'all' && i.sector !== f.sector) return false;
      const x = i.f || {};
      if (f.pe && !(x.pe > 0 && x.pe <= +f.pe)) return false;
      if (f.pb && !(x.pb > 0 && x.pb <= +f.pb)) return false;
      if (f.divMin && !(x.divYield >= +f.divMin)) return false;
      if (f.roeMin && !(x.roe >= +f.roeMin)) return false;
      if (f.growthMin && !(x.revGrowth >= +f.growthMin)) return false;
      if (f.mcapMin && !(x.mcap >= +f.mcapMin * 1e9)) return false;
      return true;
    }

    let scored = {};
    function run() {
      M.store.set('screen', f);
      const list = U.list.filter(matches);
      M.setText(count, list.length + ' matches');
      M.clear(table);
      table.appendChild(UI.table([
        { key: 'sym', label: 'Symbol', cell: r => el('b', { class: 'num', text: r.sym }) },
        { key: 'name', label: 'Name', sort: true, mono: false, val: r => r.name },
        { key: 'px', label: 'Price', r: true, val: r => M.fmt.px(r.px) },
        { key: 'chgPct', label: 'Change', r: true, val: r => r.chgPct, cell: r => el('span', { class: 'num ' + M.fmt.sign(r.chgPct), text: M.fmt.pct(r.chgPct) }) },
        { key: 'mcap', label: 'Mkt cap', r: true, val: r => (r.f && r.f.mcap) || 0, cell: r => el('span', { class: 'num', text: r.f && r.f.mcap ? M.fmt.cap(r.f.mcap) : '—' }) },
        { key: 'pe', label: 'P/E', r: true, val: r => (r.f && r.f.pe > 0 ? r.f.pe : 9999), cell: r => el('span', { class: 'num', text: r.f && r.f.pe > 0 ? r.f.pe.toFixed(1) : '—' }) },
        { key: 'pb', label: 'P/B', r: true, val: r => (r.f && r.f.pb > 0 ? r.f.pb : 9999), cell: r => el('span', { class: 'num', text: r.f && r.f.pb > 0 ? r.f.pb.toFixed(2) : '—' }) },
        { key: 'roe', label: 'ROE', r: true, val: r => (r.f && r.f.roe) || -999, cell: r => el('span', { class: 'num', text: r.f && isFinite(r.f.roe) ? r.f.roe.toFixed(1) + '%' : '—' }) },
        { key: 'div', label: 'Yield', r: true, val: r => (r.f && r.f.divYield) || 0, cell: r => el('span', { class: 'num', text: r.f && r.f.divYield ? r.f.divYield.toFixed(2) + '%' : '—' }) },
        { key: 'score', label: 'Council', r: true, val: r => scored[r.sym] ? scored[r.sym].score : -1000, cell: r => { const s = scored[r.sym]; return el('span', { class: 'num ' + (s ? (s.score > 15 ? 'up' : s.score < -15 ? 'dn' : '') : 'dim'), text: s ? s.score.toFixed(0) : '—' }); } },
        { key: 'verdict', label: 'Verdict', sort: false, mono: false, cell: r => { const s = scored[r.sym]; return el('span', { class: 'tag', style: s ? { color: `var(--${s.verdict.tone === 'g' ? 'up' : s.verdict.tone === 'r' ? 'dn' : 'mid'})` } : null, text: s ? s.verdict.text : 'not run' }); } }
      ], list, { sort: 'mcap', onRow: r => UI.openSymbol(r.sym), empty: 'No instrument matches those filters.' }));
      return list;
    }

    const runCouncil = el('button', { class: 'btn primary', text: 'Run the council on these', onclick: async () => {
      const list = U.list.filter(matches).slice(0, 60);
      runCouncil.disabled = true; runCouncil.textContent = 'Convening…';
      await new Promise(r => setTimeout(r, 16));
      for (const i of list) { const a = M.AI.analyse(i); if (a) scored[i.sym] = a; }
      run();
      runCouncil.disabled = false; runCouncil.textContent = 'Run the council on these';
      M.toast(`Council ran on ${list.length} instruments. Sort by the Council column.`, 'ok');
    } });

    wrap.appendChild(UI.card('Filters', [controls, presets], [count, runCouncil]));
    out.appendChild(el('div', { class: 'chead' }, ['Results', el('div', { class: 'sp' }, [el('span', { class: 'pill sim', text: 'FUNDAMENTALS MODELLED' })])]));
    out.appendChild(table);
    wrap.appendChild(out);
    wrap.appendChild(el('p', { class: 'note', style: { marginTop: '10px' } }, ['The Council column runs every analyst seat over each row — around twenty separate framework tests per instrument — and reports the weighted result. It is capped at sixty rows because a full pass is a lot of arithmetic for one click.']));
    node.appendChild(wrap);
    run();
  }
});
})();
