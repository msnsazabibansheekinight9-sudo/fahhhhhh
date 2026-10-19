// ============================================================================
// TERMINAL — the account. Positions with live P&L, working orders, the trade
// blotter, an equity curve with the performance statistics that matter, price
// alerts, watchlist management, and the council's read on the whole book.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, U = M.Universe, P = M.Portfolio;

let summaryBox, posTable, curveCanvas;

function summary() {
  summaryBox = el('div', { class: 'cbody', style: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' } });
  paintSummary();
  return UI.card('Account', summaryBox, el('span', { class: 'pill sim', text: 'PAPER — NO REAL MONEY' }));
}
function paintSummary() {
  if (!summaryBox) return;
  const eq = P.equity(), mv = P.marketValue(), un = P.unrealised(), re = P.realised(), day = P.dayPnl(), ex = P.exposure();
  const cells = [
    ['Equity', M.fmt.cap(eq), ''],
    ['Cash', M.fmt.cap(P.cash), ''],
    ['Positions', M.fmt.cap(mv), ''],
    ['Day P&L', (day >= 0 ? '+' : '') + M.fmt.cap(day), M.fmt.sign(day)],
    ['Unrealised', (un >= 0 ? '+' : '') + M.fmt.cap(un), M.fmt.sign(un)],
    ['Realised', (re >= 0 ? '+' : '') + M.fmt.cap(re), M.fmt.sign(re)],
    ['Total return', M.fmt.pct(eq / 100000 * 100 - 100), M.fmt.sign(eq - 100000)],
    ['Invested', ex.pctInvested.toFixed(1) + '%', '']
  ];
  M.clear(summaryBox);
  for (const [k, v, cls] of cells) summaryBox.appendChild(el('div', {}, [
    el('div', { style: { font: '500 9.5px var(--f-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }, text: k }),
    el('div', { class: 'num ' + cls, style: { font: '600 18px var(--f-mono)', marginTop: '2px' }, text: v })
  ]));
}

function positions() {
  const body = el('div', { class: 'cbody tight' });
  const build = () => {
    M.clear(body);
    const rows = P.posView();
    body.appendChild(UI.table([
      { key: 'sym', label: 'Symbol', cell: r => el('b', { class: 'num', text: r.sym }) },
      { key: 'qty', label: 'Qty', r: true, val: r => r.qty },
      { key: 'avg', label: 'Avg cost', r: true, val: r => M.fmt.px(r.avg) },
      { key: 'px', label: 'Last', r: true, val: r => M.fmt.px(r.px) },
      { key: 'value', label: 'Value', r: true, val: r => r.value, cell: r => el('span', { class: 'num', text: M.fmt.cap(r.value) }) },
      { key: 'weight', label: 'Weight', r: true, val: r => r.weight, cell: r => el('span', { class: 'num' + (Math.abs(r.weight) > 25 ? ' dn' : ''), text: r.weight.toFixed(1) + '%' }) },
      { key: 'day', label: 'Day', r: true, val: r => r.day, cell: r => el('span', { class: 'num ' + M.fmt.sign(r.day), text: (r.day >= 0 ? '+' : '') + M.fmt.cap(r.day) }) },
      { key: 'pl', label: 'P&L', r: true, val: r => r.pl, cell: r => el('span', { class: 'num ' + M.fmt.sign(r.pl), text: (r.pl >= 0 ? '+' : '') + M.fmt.cap(r.pl) }) },
      { key: 'plPct', label: '%', r: true, val: r => r.plPct, cell: r => el('span', { class: 'num ' + M.fmt.sign(r.plPct), text: M.fmt.pct(r.plPct, 1) }) },
      { key: 'close', label: '', sort: false, r: true, cell: r => el('button', { class: 'btn sm', text: 'Close', onclick: e => { e.stopPropagation(); const res = P.execute(r.sym, r.qty > 0 ? 'sell' : 'buy', Math.abs(r.qty)); M.toast(res.ok ? `Closed ${r.sym} — realised ${M.fmt.cap(res.realised)}` : res.err, res.ok ? 'ok' : 'err'); } }) }
    ], rows, { sort: 'value', onRow: r => UI.openSymbol(r.sym), empty: 'No open positions. Buy something from a symbol page.' }));
  };
  build();
  M.on('portfolio', M.throttle(() => { if (UI.current === 'portfolio') build(); }, 1500));
  posTable = { build };
  return UI.card('Positions', body);
}

function orders() {
  const body = el('div', { class: 'cbody tight' });
  const build = () => {
    M.clear(body);
    body.appendChild(UI.table([
      { key: 't', label: 'Placed', val: r => M.fmt.hm(r.t) },
      { key: 'sym', label: 'Symbol', cell: r => el('b', { class: 'num', text: r.sym }) },
      { key: 'side', label: 'Side', mono: false, cell: r => el('span', { class: r.side === 'buy' ? 'up' : 'dn', text: r.side.toUpperCase() }) },
      { key: 'type', label: 'Type', mono: false, val: r => r.type },
      { key: 'qty', label: 'Qty', r: true, val: r => r.qty },
      { key: 'trigger', label: 'Trigger', r: true, val: r => M.fmt.px(r.limit || r.stop || 0) },
      { key: 'status', label: 'Status', mono: false, cell: r => el('span', { class: r.status === 'filled' ? 'up' : r.status === 'working' ? 'mid' : 'dim', text: r.status + (r.fillPx ? ' @ ' + M.fmt.px(r.fillPx) : '') }) },
      { key: 'x', label: '', sort: false, r: true, cell: r => r.status === 'working' ? el('button', { class: 'btn sm', text: 'Cancel', onclick: () => P.cancel(r.id) }) : el('span', { class: 'dim', text: '—' }) }
    ], P.orders.slice(0, 40), { sort: 't', empty: 'No orders. Limit and stop orders placed from a symbol page appear here and are checked against the tape four times a second.' }));
  };
  build();
  M.on('portfolio', M.throttle(() => { if (UI.current === 'portfolio') build(); }, 1500));
  return UI.card('Orders', body, el('button', { class: 'btn sm', text: 'Clear finished', onclick: () => P.clearDone() }));
}

function blotter() {
  const body = el('div', { class: 'cbody tight', style: { maxHeight: '420px', overflowY: 'auto' } });
  body.appendChild(UI.table([
    { key: 't', label: 'Time', val: r => M.fmt.dayMon(r.t) + ' ' + M.fmt.hm(r.t) },
    { key: 'sym', label: 'Symbol', cell: r => el('b', { class: 'num', text: r.sym }) },
    { key: 'side', label: 'Side', mono: false, cell: r => el('span', { class: r.side === 'buy' ? 'up' : 'dn', text: r.side.toUpperCase() }) },
    { key: 'qty', label: 'Qty', r: true, val: r => r.qty },
    { key: 'px', label: 'Price', r: true, val: r => M.fmt.px(r.px) },
    { key: 'notional', label: 'Notional', r: true, val: r => r.notional, cell: r => el('span', { class: 'num', text: M.fmt.cap(r.notional) }) },
    { key: 'fee', label: 'Fee', r: true, val: r => r.fee, cell: r => el('span', { class: 'num dim', text: M.fmt.usd2(r.fee) }) },
    { key: 'realised', label: 'Realised', r: true, val: r => r.realised || 0, cell: r => r.realised ? el('span', { class: 'num ' + M.fmt.sign(r.realised), text: (r.realised >= 0 ? '+' : '') + M.fmt.cap(r.realised) }) : el('span', { class: 'dim', text: '—' }) }
  ], P.blotter, { sort: 't', empty: 'No trades yet.' }));
  return UI.card('Blotter', body);
}

function performance() {
  const body = el('div', { class: 'cbody' });
  curveCanvas = el('canvas', { style: { width: '100%', height: '140px', display: 'block', marginBottom: '11px' } });
  body.appendChild(curveCanvas);
  const dl = el('dl', { class: 'kv' });
  body.appendChild(dl);
  const paint = () => {
    M.Chart.spark(curveCanvas, P.curve.map(c => c.v));
    const s = P.stats();
    M.clear(dl);
    const add = (k, v, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); };
    if (!s) { dl.appendChild(el('dt', { text: 'Not enough history yet' })); dl.appendChild(el('dd', { text: '—' })); return; }
    add('Total return', M.fmt.pct(s.total), M.fmt.sign(s.total));
    add('Annualised volatility', s.vol.toFixed(1) + '%');
    add('Sharpe (annualised)', s.sharpe.toFixed(2), s.sharpe > 1 ? 'up' : s.sharpe < 0 ? 'dn' : '');
    add('Max drawdown', s.mdd.toFixed(1) + '%', 'dn');
    add('Trades', String(s.trades));
    add('Win rate', s.winRate.toFixed(0) + '%');
    add('Average win', M.fmt.cap(s.avgWin), 'up');
    add('Average loss', M.fmt.cap(s.avgLoss), 'dn');
    add('Expectancy per trade', M.fmt.cap(s.expectancy), M.fmt.sign(s.expectancy));
    add('Profit factor', s.profitFactor ? s.profitFactor.toFixed(2) : '—');
  };
  paint();
  body.__paint = paint;
  body.appendChild(el('p', { class: 'note', style: { marginTop: '9px' }, text: 'Expectancy — what one trade returns on average — is Van Tharp’s measure and the only one that combines win rate with the size of the wins. A 40% win rate with a profit factor above 2 beats a 70% win rate that gives it all back on the losers.' }));
  return UI.card('Performance', body);
}

function riskCard() {
  const body = el('div', { class: 'cbody' });
  const pa = M.AI.analysePortfolio();
  if (!pa) { body.appendChild(el('div', { class: 'empty', text: 'Open a position and the council will diagnose the book here.' })); return UI.card('Council risk read', body); }
  const dl = el('dl', { class: 'kv' });
  const add = (k, v, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); };
  add('Portfolio volatility', pa.portVol.toFixed(1) + '%');
  add('Weighted average of parts', pa.naive.toFixed(1) + '%');
  add('Diversification benefit', (pa.naive - pa.portVol).toFixed(1) + ' pts', pa.naive - pa.portVol > 2 ? 'up' : 'dn');
  add('Portfolio beta', pa.beta.toFixed(2), Math.abs(pa.beta) > 1.3 ? 'dn' : '');
  add('In a 20% market fall', (pa.beta * -20).toFixed(0) + '%', 'dn');
  body.appendChild(dl);
  body.appendChild(el('h4', { style: { margin: '12px 0 6px', font: '600 10px var(--f-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }, text: 'Sector weights' }));
  for (const s in pa.bySector) {
    body.appendChild(el('div', { class: 'sectorbar' }, [
      el('span', { style: { fontSize: '12px' }, text: s }),
      el('div', { class: 'track' }, [el('i', { style: { width: Math.min(100, Math.abs(pa.bySector[s])) + '%', left: 0, background: pa.bySector[s] > 35 ? 'var(--dn)' : 'var(--blue)' } })]),
      el('span', { class: 'r num', style: { fontSize: '11px' }, text: pa.bySector[s].toFixed(0) + '%' })
    ]));
  }
  for (const f of pa.findings) body.appendChild(el('div', { class: 'point' }, [
    el('div', { class: 'd ' + (f.sev === 'high' ? 'dn' : f.sev === 'med' ? '' : 'up'), text: f.sev === 'ok' ? '▲' : '▼' }),
    el('div', {}, [f.text, f.book ? el('cite', {}, [el('b', { text: f.book.title }), ' — ' + f.book.author]) : null])
  ]));
  return UI.card('Council risk read', body);
}

function watchCard() {
  const body = el('div', { class: 'cbody' });
  const list = el('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '9px' } });
  const paint = () => {
    M.clear(list);
    for (const s of P.watch) list.appendChild(el('span', { class: 'tag', style: { display: 'inline-flex', gap: '5px', alignItems: 'center' } }, [
      el('button', { style: { font: 'inherit', color: 'inherit' }, text: s, onclick: () => UI.openSymbol(s) }),
      el('button', { style: { color: 'var(--dn)' }, text: '✕', onclick: () => { P.toggleWatch(s); paint(); } })
    ]));
    if (!P.watch.length) list.appendChild(el('span', { class: 'dim', text: 'Empty.' }));
  };
  paint();
  const input = el('input', { type: 'text', placeholder: 'Add a ticker…' });
  input.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const s = input.value.trim().toUpperCase(); if (U.has(s)) { if (!P.isWatched(s)) P.toggleWatch(s); input.value = ''; paint(); } else M.toast('No instrument called ' + s, 'err'); });
  body.appendChild(list); body.appendChild(input);
  return UI.card('Watchlist', body);
}

function alertsCard() {
  const body = el('div', { class: 'cbody tight' });
  const build = () => {
    M.clear(body);
    if (!P.alerts.length) { body.appendChild(el('div', { class: 'empty', text: 'No alerts. Set one from any symbol page.' })); return; }
    for (const a of P.alerts) {
      const i = U.get(a.sym);
      body.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '9px', padding: '7px 11px', borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'center' } }, [
        el('div', {}, [el('b', { class: 'num', text: a.sym }), el('span', { class: 'dim', style: { fontSize: '11.5px' }, text: ` ${a.dir} ${M.fmt.px(a.px)}` + (i ? ` · now ${M.fmt.px(i.px)}` : '') })]),
        el('span', { class: 'pill ' + (a.fired ? 'g' : ''), text: a.fired ? 'fired ' + M.fmt.ago(a.fired) : 'armed' }),
        el('button', { class: 'btn sm', text: '✕', onclick: () => { P.removeAlert(a.id); build(); } })
      ]));
    }
  };
  build();
  M.on('portfolio', M.throttle(() => { if (UI.current === 'portfolio') build(); }, 2000));
  return UI.card('Alerts', body);
}

UI.register('portfolio', {
  label: 'Portfolio',
  mount(node) {
    const wrap = el('div', { class: 'wrap' });
    wrap.appendChild(summary());
    const grid = el('div', { class: 'cols m2', style: { marginTop: '12px' } });
    grid.appendChild(el('div', { class: 'grid' }, [positions(), orders(), blotter()]));
    grid.appendChild(el('div', { class: 'grid' }, [performance(), riskCard(), watchCard(), alertsCard()]));
    wrap.appendChild(grid);
    wrap.appendChild(el('div', { style: { marginTop: '12px', display: 'flex', gap: '7px', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn', text: 'Export the account as JSON', onclick: () => {
        const data = JSON.stringify({ cash: P.cash, positions: P.positions, blotter: P.blotter, curve: P.curve, watch: P.watch }, null, 2);
        const a = el('a', { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: 'ledger-terminal-account.json' });
        document.body.appendChild(a); a.click(); a.remove();
      } }),
      el('button', { class: 'btn', text: 'Reset to $100,000', onclick: () => { if (confirm('Wipe all positions, orders and trade history, and reset cash to $100,000?')) { P.reset(); UI.go('portfolio'); } } })
    ]));
    node.appendChild(wrap);
  },
  update: M.throttle(function () {
    paintSummary();
    const perf = M.$$('#v-portfolio .cbody').find(b => b.__paint);
    if (perf) perf.__paint();
  }, 1600)
});
})();
