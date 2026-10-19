// ============================================================================
// TERMINAL — the shell. Routing between views, the header stats, the scrolling
// ticker tape, global search, the status bar, and the shared bits of markup
// every view reuses (quote rows, news items, source badges).
// ============================================================================
'use strict';
(function () {
const UI = M.UI = { views: {}, current: null, prev: null };
const U = M.Universe, el = M.el, $ = M.$;

// ------------------------------------------------------------------ routing
UI.register = (id, def) => { UI.views[id] = Object.assign({ id, label: id, mount: () => {}, update: () => {} }, def); };
UI.go = (id, arg) => {
  const v = UI.views[id]; if (!v) return;
  if (UI.current && UI.current !== id && UI.views[UI.current].leave) UI.views[UI.current].leave();
  UI.prev = UI.current === id ? UI.prev : UI.current;
  UI.current = id; UI.arg = arg;
  const main = $('#main');
  M.clear(main);
  const node = el('div', { class: 'view', id: 'v-' + id });
  main.appendChild(node);
  v.node = node;
  try { v.mount(node, arg); } catch (e) { console.error('[view]', id, e); node.appendChild(el('div', { class: 'empty', text: 'This view failed to render: ' + e.message })); }
  drawNav();
  location.hash = id + (arg ? '/' + arg : '');
  node.scrollTop = 0;
};
UI.back = () => UI.go(UI.prev || 'markets');
UI.openSymbol = sym => UI.go('symbol', String(sym).toUpperCase());

function drawNav() {
  const nav = $('#nav'); M.clear(nav);
  for (const id in UI.views) {
    const v = UI.views[id];
    if (v.hidden) continue;
    const b = el('button', { class: id === UI.current ? 'on' : '', onclick: () => UI.go(id) }, [v.label]);
    if (v.badge) { const n = v.badge(); if (n) b.appendChild(el('span', { class: 'badge', text: n })); }
    nav.appendChild(b);
  }
}
UI.redrawNav = drawNav;

// ------------------------------------------------------------------ shared markup
// One definition of a quote row, used by the watchlist, movers and screeners.
UI.quoteRow = (inst, opts = {}) => {
  const row = el('div', { class: 'wl-row', onclick: () => UI.openSymbol(inst.sym) }, [
    el('b', { text: inst.sym }),
    el('div', { class: 'px num' }),
    el('div', { class: 'nm', text: opts.sub || inst.name }),
    el('div', { class: 'ch num' })
  ]);
  row.__inst = inst;
  UI.paintQuote(row);
  return row;
};
UI.paintQuote = (row) => {
  const i = row.__inst; if (!i) return;
  const px = row.querySelector('.px'), ch = row.querySelector('.ch');
  const dir = i.px > (row.__last || 0) ? 1 : -1;
  M.setText(px, M.fmt.px(i.px), row.__last !== undefined ? dir : 0);
  row.__last = i.px;
  M.setText(ch, M.fmt.pct(i.chgPct));
  ch.className = 'ch num ' + M.fmt.sign(i.chgPct);
};

UI.newsItem = (n, opts = {}) => {
  const imp = el('span', { class: 'imp' + (n.impact >= 4 ? ' hi' : '') });
  for (let i = 0; i < 5; i++) imp.appendChild(el('i', { class: i < n.impact ? 'on' : '' }));
  const cat = M.News.CATS[n.cat] || { name: n.cat, tone: 'n' };
  const meta = el('div', { class: 'meta' }, [
    el('span', { class: 'pill ' + (n.live ? 'live' : 'sim'), text: n.live ? 'LIVE' : 'SIM' }),
    el('span', { class: 'pill ' + cat.tone, text: cat.name }),
    imp,
    el('span', { text: n.src }),
    el('span', { class: 'dim', text: M.fmt.ago(n.t) }),
    n.sentiment ? el('span', { class: n.sentiment > .1 ? 'up' : n.sentiment < -.1 ? 'dn' : 'dim', text: (n.sentiment > 0 ? '+' : '') + (n.sentiment * 100).toFixed(0) }) : null
  ]);
  const kids = [meta, el('h4', { text: n.head })];
  if (!opts.compact && n.body) kids.push(el('p', { text: n.body }));
  if (n.tickers && n.tickers.length) {
    const tk = el('div', { class: 'meta', style: { marginTop: '5px' } });
    for (const t of n.tickers.slice(0, 6)) {
      const inst = U.get(t);
      tk.appendChild(el('button', { class: 'tag', text: t + (inst ? ' ' + M.fmt.pct(inst.chgPct, 1) : ''), onclick: e => { e.stopPropagation(); UI.openSymbol(t); } }));
    }
    kids.push(tk);
  }
  return el('button', { class: 'news-item', onclick: () => UI.newsModal(n) }, kids);
};

UI.newsModal = (n) => {
  UI.modal('Wire story', [
    el('div', { class: 'meta', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } }, [
      el('span', { class: 'pill ' + (n.live ? 'live' : 'sim'), text: n.live ? 'LIVE FEED' : 'GENERATED' }),
      el('span', { class: 'tag', text: (M.News.CATS[n.cat] || {}).name || n.cat }),
      el('span', { class: 'dim mono', style: { fontSize: '11px' }, text: n.src + ' · ' + M.fmt.date(n.t) + ' ' + M.fmt.time(n.t) })
    ]),
    el('h3', { style: { margin: '0 0 8px', fontSize: '17px', lineHeight: '1.35' }, text: n.head }),
    el('p', { class: 'note', style: { fontSize: '13px' }, text: n.body || '' }),
    !n.live ? el('div', { class: 'warn', style: { marginTop: '10px' } }, [
      el('b', { text: 'Generated story. ' }), 'This headline was produced by the terminal’s own wire and it moved the simulated tape for the tickers below. It is not a report of a real event. Connect a news key in Sources and real headlines appear here marked LIVE.'
    ]) : null,
    n.url ? el('p', { style: { marginTop: '10px' } }, [el('a', { href: n.url, target: '_blank', rel: 'noopener', text: 'Open the original →' })]) : null,
    n.tickers && n.tickers.length ? el('div', { style: { marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      n.tickers.map(t => el('button', { class: 'btn sm', text: t, onclick: () => { UI.closeModal(); UI.openSymbol(t); } }))) : null
  ]);
};

UI.srcBadge = (inst) => el('span', { class: 'pill ' + (inst.src === 'live' ? 'live' : 'sim'), text: inst.src === 'live' ? 'LIVE · ' + (inst.srcName || '') : 'SIM', title: inst.src === 'live' ? 'Real quote from ' + inst.srcName : 'Simulated price — no provider connected for this instrument' });

UI.modal = (title, kids) => {
  UI.closeModal();
  const box = el('div', { class: 'box' }, [
    el('div', { class: 'chead' }, [title, el('div', { class: 'sp' }, [el('button', { class: 'btn sm', text: 'Close', onclick: () => UI.closeModal() })])]),
    el('div', { class: 'cbody' }, kids)
  ]);
  const m = el('div', { id: 'modal', onclick: e => { if (e.target.id === 'modal') UI.closeModal(); } }, [box]);
  document.body.appendChild(m);
};
UI.closeModal = () => { const m = $('#modal'); if (m) m.remove(); };

// A sortable table built from column definitions. Used by the screener, the
// blotter, positions and the instrument lists.
UI.table = (cols, rows, opts = {}) => {
  const state = { key: opts.sort || null, dir: opts.dir || -1 };
  const table = el('table');
  const thead = el('thead'), tr = el('tr');
  for (const c of cols) {
    const th = el('th', { class: (c.r ? 'r ' : '') + (c.sort === false ? 'nosort' : ''), text: c.label });
    if (c.sort !== false) th.onclick = () => { if (state.key === c.key) state.dir = -state.dir; else { state.key = c.key; state.dir = -1; } paint(); };
    tr.appendChild(th);
  }
  thead.appendChild(tr); table.appendChild(thead);
  const tbody = el('tbody'); table.appendChild(tbody);
  function paint() {
    const data = [...rows];
    if (state.key) {
      const col = cols.find(c => c.key === state.key);
      data.sort((a, b) => { const x = col.val ? col.val(a) : a[state.key], y = col.val ? col.val(b) : b[state.key]; return (typeof x === 'string' ? String(x).localeCompare(String(y)) : (x || 0) - (y || 0)) * state.dir; });
    }
    M.clear(tbody);
    for (const r of data) {
      const row = el('tr', { class: opts.onRow ? 'click' : '', onclick: opts.onRow ? () => opts.onRow(r) : null });
      for (const c of cols) {
        const out = c.cell ? c.cell(r) : (c.val ? c.val(r) : r[c.key]);
        row.appendChild(out instanceof Node ? el('td', { class: c.r ? 'r' : '' }, [out]) : el('td', { class: (c.r ? 'r ' : '') + (c.mono !== false ? 'num' : '') + (c.tone ? ' ' + c.tone(r) : ''), text: out == null ? '—' : String(out) }));
      }
      tbody.appendChild(row);
    }
    if (!data.length) { const td = el('td', { colspan: cols.length }, [el('div', { class: 'empty', text: opts.empty || 'Nothing here.' })]); tbody.appendChild(el('tr', {}, [td])); }
  }
  paint();
  table.repaint = (next) => { if (next) rows = next; paint(); };
  return table;
};

UI.card = (title, body, tools) => el('div', { class: 'card' }, [
  el('div', { class: 'chead' }, [title, tools ? el('div', { class: 'sp' }, [].concat(tools)) : null]),
  body instanceof Node && body.classList && body.classList.contains('cbody') ? body : el('div', { class: 'cbody' }, [].concat(body))
]);

UI.seg = (options, value, onChange) => {
  const wrap = el('div', { class: 'seg' });
  for (const o of options) {
    const [v, lab] = Array.isArray(o) ? o : [o, o];
    wrap.appendChild(el('button', { class: v === value ? 'on' : '', text: lab, onclick: () => { value = v; [...wrap.children].forEach(c => c.classList.toggle('on', c.textContent === lab)); onChange(v); } }));
  }
  return wrap;
};

// ------------------------------------------------------------------ header
function headerStats() {
  const host = $('#hstat'); M.clear(host);
  const cells = [
    { k: 'S&P 500', get: () => { const i = U.get('SPX'); return [M.fmt.n(i.px, 2), i.chgPct]; } },
    { k: 'Nasdaq', get: () => { const i = U.get('NDX'); return [M.fmt.n(i.px, 2), i.chgPct]; } },
    { k: 'US 10Y', get: () => { const i = U.get('US10Y'); return [i.px.toFixed(3) + '%', i.chgPct]; } },
    { k: 'Bitcoin', get: () => { const i = U.get('BTC'); return [M.fmt.cap(i.px).replace('$', '$'), i.chgPct]; } },
    { k: 'Gold', get: () => { const i = U.get('GC'); return ['$' + M.fmt.n(i.px, 0), i.chgPct]; } },
    { k: 'VIX', get: () => { const i = U.get('VIX'); return [i.px.toFixed(2), i.chgPct]; } },
    { k: 'Equity', get: () => { const e = M.Portfolio.equity(); const d = M.Portfolio.dayPnl(); return [M.fmt.cap(e), e ? d / e * 100 : 0]; } }
  ];
  for (const c of cells) {
    const node = el('div', { class: 'hs' }, [el('div', { class: 'k', text: c.k }), el('div', { class: 'v' })]);
    node.__get = c.get; host.appendChild(node);
  }
  paintHeader();
}
function paintHeader() {
  for (const node of M.$$('#hstat .hs')) {
    try {
      const [v, pct] = node.__get();
      const vv = node.querySelector('.v');
      M.setText(vv, v);
      vv.className = 'v ' + M.fmt.sign(pct);
    } catch (e) {}
  }
  const now = new Date();
  M.setText($('#clock'), M.fmt.time(now.getTime()));
}

// ------------------------------------------------------------------ ticker tape
const TAPE = ['SPX', 'NDX', 'DJI', 'RUT', 'VIX', 'US02Y', 'US10Y', 'US30Y', 'DXY', 'GC', 'SI', 'CL', 'NG', 'HG', 'BTC', 'ETH', 'SOL', 'EURUSD', 'USDJPY', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM', 'XOM', 'SPY', 'QQQ', 'TLT', 'HYG'];
function buildTape() {
  const host = $('#tapeInner'); M.clear(host);
  const make = () => {
    const frag = document.createDocumentFragment();
    for (const s of TAPE) {
      const i = U.get(s === 'US02Y' ? 'US2Y' : s); if (!i) continue;
      const node = el('span', { class: 'tp', onclick: () => UI.openSymbol(i.sym) }, [
        el('b', { text: i.sym }), el('span', { class: 'px' }), el('span', { class: 'ch' })
      ]);
      node.__inst = i; frag.appendChild(node);
    }
    return frag;
  };
  host.appendChild(make()); host.appendChild(make());
  paintTape();
  let x = 0;
  M.frame((now, dt) => {
    if (document.hidden) return;
    x -= dt * 42;
    const half = host.scrollWidth / 2;
    if (half && -x >= half) x += half;
    host.style.transform = `translateX(${x}px)`;
  });
}
const paintTape = M.throttle(() => {
  for (const n of M.$$('#tapeInner .tp')) {
    const i = n.__inst; if (!i) continue;
    M.setText(n.querySelector('.px'), i.type === 'bond' ? i.px.toFixed(3) + '%' : M.fmt.px(i.px));
    const ch = n.querySelector('.ch');
    M.setText(ch, M.fmt.pct(i.chgPct, 2));
    ch.className = 'ch ' + M.fmt.sign(i.chgPct);
  }
}, 900);

// ------------------------------------------------------------------ search
function wireSearch() {
  const input = $('#q'), box = $('#results');
  let sel = 0, hits = [];
  const close = () => { box.hidden = true; M.clear(box); };
  const run = () => {
    hits = U.search(input.value, 20);
    M.clear(box); sel = 0;
    if (!hits.length) { close(); return; }
    hits.forEach((i, k) => box.appendChild(el('button', { class: k === 0 ? 'sel' : '', onclick: () => { close(); input.value = ''; UI.openSymbol(i.sym); } }, [
      el('b', { text: i.sym }), el('span', { text: i.name }), el('span', { class: 'tag', text: i.type })
    ])));
    box.hidden = false;
  };
  input.addEventListener('input', M.debounce(run, 90));
  input.addEventListener('focus', () => { if (input.value) run(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); input.blur(); return; }
    if (!hits.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = M.clamp(sel + (e.key === 'ArrowDown' ? 1 : -1), 0, hits.length - 1);
      [...box.children].forEach((c, k) => c.classList.toggle('sel', k === sel));
      box.children[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { close(); const s = hits[sel].sym; input.value = ''; input.blur(); UI.openSymbol(s); }
  });
  document.addEventListener('click', e => { if (!$('#search').contains(e.target)) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== input && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    if (e.key === 'Escape') UI.closeModal();
  });
}

// ------------------------------------------------------------------ status bar
function paintFoot() {
  const f = $('#foot'); M.clear(f);
  const sess = M.Sim.sess || M.Sim.session();
  const reg = M.Sim.regimeInfo();
  const live = M.sources.all().filter(s => s.status === 'live');
  const add = (t, cls) => f.appendChild(el('span', { class: cls || '', text: t }));
  add(sess.open ? '● ' + sess.name : '○ ' + sess.name, sess.open ? 'up' : 'dim');
  add('│', 'sep');
  add('Regime: ' + reg.name, reg.tone === 'g' ? 'up' : reg.tone === 'r' ? 'dn' : '');
  add('│', 'sep');
  add(live.length ? live.length + ' live feed' + (live.length > 1 ? 's' : '') + ': ' + live.map(s => s.id).join(', ') : 'No live feed connected — every number on this screen is simulated or projected', live.length ? 'up' : 'dn');
  add('│', 'sep');
  add(U.count() + ' instruments');
  add('│', 'sep');
  add(M.Library.count() + ' books · ' + M.Analysts.seatList().length + ' analyst seats');
  add('│', 'sep');
  add('Paper trading only — not investment advice');
}

// ------------------------------------------------------------------ boot
UI.start = () => {
  headerStats(); buildTape(); wireSearch(); paintFoot();
  M.on('tick', () => { if (document.hidden) return; paintHeader(); paintTape(); const v = UI.views[UI.current]; if (v && v.update) { try { v.update(); } catch (e) {} } });
  M.on('sources', M.throttle(paintFoot, 1500));
  M.on('regime', paintFoot);
  M.on('news', M.throttle(drawNav, 3000));
  setInterval(paintFoot, 20000);
  window.addEventListener('hashchange', () => {
    const [id, arg] = location.hash.replace('#', '').split('/');
    if (id && UI.views[id] && (id !== UI.current || arg !== UI.arg)) UI.go(id, arg);
  });
  window.addEventListener('resize', M.debounce(() => { const v = UI.views[UI.current]; if (v && v.resize) v.resize(); }, 150));
};
})();
