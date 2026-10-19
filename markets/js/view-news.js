// ============================================================================
// TERMINAL — the wire. Everything crossing, filterable by category, impact,
// ticker and whether it touches the watchlist, with a sentiment pulse strip
// and the "what this moved" read alongside.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, N = M.News;

let listBox, pulseBox, unread = 0;

function filters() {
  const body = el('div', { class: 'cbody', style: { display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' } });
  body.appendChild(el('input', { type: 'search', placeholder: 'Filter headlines or tickers…', style: { maxWidth: '240px' }, oninput: M.debounce(e => { N.filters.q = e.target.value; paint(); }, 200) }));
  const cats = [['all', 'Everything']].concat(Object.keys(N.CATS).map(k => [k, N.CATS[k].name]));
  body.appendChild(el('select', { style: { maxWidth: '180px' }, onchange: e => { N.filters.cat = e.target.value; paint(); } }, cats.map(c => el('option', { value: c[0], text: c[1] }))));
  body.appendChild(UI.seg([[0, 'Any impact'], [3, '3+'], [4, '4+'], [5, 'Only 5']], N.filters.impact, v => { N.filters.impact = +v; paint(); }));
  body.appendChild(el('button', { class: 'btn sm' + (N.filters.onlyWatch ? ' on' : ''), text: 'Watchlist only', onclick: e => { N.filters.onlyWatch = !N.filters.onlyWatch; e.target.classList.toggle('on', N.filters.onlyWatch); paint(); } }));
  body.appendChild(el('button', { class: 'btn sm', text: 'Pull live feeds now', onclick: async e => { e.target.disabled = true; const n = await N.pullLive(); M.toast(n ? n + ' live headlines pulled' : 'No live news provider is connected — add a key in Sources', n ? 'ok' : 'err'); e.target.disabled = false; paint(); } }));
  return UI.card('Filter', body);
}

function pulseCard() {
  pulseBox = el('div', { class: 'cbody' });
  paintPulse();
  return UI.card('Tape pulse', pulseBox);
}
function paintPulse() {
  if (!pulseBox) return;
  M.clear(pulseBox);
  const windows = [[30, '30 min'], [120, '2 hours'], [480, '8 hours'], [1440, '24 hours']];
  const dl = el('dl', { class: 'kv' });
  for (const [mins, lab] of windows) {
    const p = N.pulse(mins);
    dl.appendChild(el('dt', { text: lab }));
    dl.appendChild(el('dd', { class: p.net > .1 ? 'up' : p.net < -.1 ? 'dn' : 'dim', text: p.n ? `${p.net > 0 ? '+' : ''}${(p.net * 100).toFixed(0)} · ${p.n} stories` : 'quiet' }));
  }
  pulseBox.appendChild(dl);
  // Which categories are actually driving the tone right now.
  const cut = Date.now() - 6 * 3600e3;
  const by = {};
  for (const n of N.items) if (n.t >= cut) { const c = by[n.cat] = by[n.cat] || { n: 0, s: 0, w: 0 }; c.n++; c.s += n.sentiment * n.impact; c.w += n.impact; }
  const rank = Object.entries(by).sort((a, b) => b[1].n - a[1].n).slice(0, 7);
  pulseBox.appendChild(el('h4', { style: { margin: '12px 0 6px', font: '600 10px var(--f-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }, text: 'Driving the tone, last 6 hours' }));
  for (const [cat, v] of rank) {
    const net = v.w ? v.s / v.w : 0;
    pulseBox.appendChild(el('div', { class: 'sectorbar' }, [
      el('span', { style: { fontSize: '12px' }, text: (N.CATS[cat] || {}).name || cat }),
      el('div', { class: 'track' }, [el('i', { style: { width: Math.abs(net) * 50 + '%', left: net >= 0 ? '50%' : (50 - Math.abs(net) * 50) + '%', background: net >= 0 ? 'var(--up)' : 'var(--dn)' } })]),
      el('span', { class: 'r num dim', style: { fontSize: '11px' }, text: v.n + '' })
    ]));
  }
  pulseBox.appendChild(el('p', { class: 'note', style: { marginTop: '10px' }, text: 'Tone is a transparent lexicon score weighted by each story’s estimated impact, not a black box. It runs from −100 to +100 and the council reads it as one input among twenty.' }));
}

function paint() {
  if (!listBox) return;
  M.clear(listBox);
  const rows = N.filtered();
  if (!rows.length) { listBox.appendChild(el('div', { class: 'empty', text: 'Nothing matches that filter.' })); return; }
  for (const n of rows.slice(0, 160)) listBox.appendChild(UI.newsItem(n));
}

UI.register('news', {
  label: 'News',
  badge: () => unread > 0 ? unread : null,
  mount(node) {
    unread = 0; UI.redrawNav();
    const wrap = el('div', { class: 'wrap' });
    const liveNews = M.keys.has('finnhub') || M.keys.has('marketaux') || (M.store.get('rssFeeds', []) || []).length;
    if (!liveNews) wrap.appendChild(el('div', { class: 'warn', style: { marginBottom: '12px' } }, [
      el('b', { text: 'This wire is generating its own stories. ' }),
      'Each one is written from a template, carries an impact estimate, and actually moves the simulated tape for the tickers it names — which is why cause and effect line up on the chart. None of it is a report of a real event; every item is badged SIM. Add a Finnhub or Marketaux key, or an RSS feed with a proxy, in Sources and real headlines appear here badged LIVE. ',
      el('button', { class: 'btn sm', text: 'Open Sources', onclick: () => UI.go('sources') })
    ]));
    const grid = el('div', { class: 'cols s2' });
    const left = el('div', { class: 'grid' }, [pulseCard()]);
    listBox = el('div', { class: 'cbody tight' });
    const right = el('div', { class: 'grid' }, [filters(), UI.card('The wire', listBox, el('span', { class: 'pill', id: 'wireCount' }))]);
    grid.appendChild(left); grid.appendChild(right);
    wrap.appendChild(grid);
    node.appendChild(wrap);
    paint();
  },
  update: M.throttle(() => { if (UI.current === 'news') { paint(); paintPulse(); } }, 9000)
});

// Count unread high-impact stories while the user is elsewhere.
M.on('news', n => { if (UI.current !== 'news' && n.impact >= 4) { unread++; UI.redrawNav(); } });
})();
