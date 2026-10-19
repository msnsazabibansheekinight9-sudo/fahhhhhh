// ============================================================================
// TERMINAL — the symbol page. Quote header, chart with overlays and an
// indicator pane, the depth ladder and trade tape, the fundamental sheet, the
// order ticket, the wire for that name, and the council's verdict inline.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, U = M.Universe, P = M.Portfolio;

let inst = null, chart = null, cfg = M.store.get('chartcfg', { tf: '1D', type: 'candle', overlays: ['sma50', 'sma200'], lower: 'volume' });
let ladder, tapeBox, quoteNodes = {}, depthCanvas;

function head() {
  const watched = P.isWatched(inst.sym);
  const px = el('div', { class: 'sym-px' }), ch = el('div', { class: 'sym-ch' });
  quoteNodes = { px, ch };
  const stats = el('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'flex-end' } });
  for (const [k, id] of [['Open', 'open'], ['High', 'hi'], ['Low', 'lo'], ['Prev close', 'prev'], ['Volume', 'vol'], ['Bid', 'bid'], ['Ask', 'ask']]) {
    const v = el('div', { class: 'v num', style: { fontSize: '12.5px', fontWeight: 600 } });
    quoteNodes[id] = v;
    stats.appendChild(el('div', { style: { textAlign: 'right' } }, [el('div', { class: 'k', style: { font: '500 9px var(--f-mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }, text: k }), v]));
  }
  return el('div', { class: 'sym-head' }, [
    el('div', {}, [
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, [
        el('h2', { text: inst.sym }),
        UI.srcBadge(inst),
        el('span', { class: 'tag', text: inst.type }),
        el('span', { class: 'tag', text: inst.exch })
      ]),
      el('div', { class: 'nm', text: inst.name + (inst.industry ? ' · ' + inst.industry : '') })
    ]),
    el('div', {}, [px, ch]),
    stats,
    el('div', { style: { display: 'flex', gap: '6px' } }, [
      el('button', { class: 'btn sm' + (watched ? ' on' : ''), text: watched ? '★ Watching' : '☆ Watch', onclick: e => { const on = P.toggleWatch(inst.sym); e.target.textContent = on ? '★ Watching' : '☆ Watch'; e.target.classList.toggle('on', on); } }),
      el('button', { class: 'btn sm', text: 'Alert', onclick: alertDialog }),
      el('button', { class: 'btn sm primary', text: 'Council verdict', onclick: () => UI.go('ai', inst.sym) })
    ])
  ]);
}

function paintQuote() {
  if (!inst) return;
  M.setText(quoteNodes.px, inst.type === 'bond' ? inst.px.toFixed(3) + '%' : M.fmt.px(inst.px), inst.px >= (paintQuote.__last || 0) ? 1 : -1);
  paintQuote.__last = inst.px;
  M.setText(quoteNodes.ch, `${inst.chg >= 0 ? '+' : ''}${M.fmt.px(Math.abs(inst.chg) * Math.sign(inst.chg))}  ${M.fmt.pct(inst.chgPct)}`);
  quoteNodes.ch.className = 'sym-ch ' + M.fmt.sign(inst.chgPct);
  quoteNodes.px.className = 'sym-px ' + M.fmt.sign(inst.chgPct);
  for (const k of ['open', 'hi', 'lo', 'prev', 'bid', 'ask']) if (quoteNodes[k]) M.setText(quoteNodes[k], M.fmt.px(inst[k]));
  if (quoteNodes.vol) M.setText(quoteNodes.vol, M.fmt.qty(inst.vol));
}

function chartCard() {
  const wrap = el('div', { class: 'card' });
  const tools = el('div', { class: 'ctools' });
  tools.appendChild(UI.seg([['1m', '1m'], ['5m', '5m'], ['15m', '15m'], ['1h', '1H'], ['1D', '1D'], ['1W', '1W']], cfg.tf, v => { cfg.tf = v; save(); chart.setData(M.Sim.history(inst, v)); }));
  tools.appendChild(UI.seg([['candle', 'Candles'], ['line', 'Line'], ['area', 'Area']], cfg.type, v => { cfg.type = v; save(); chart.opts.type = v; chart.draw(); }));
  tools.appendChild(UI.seg([['volume', 'Vol'], ['rsi', 'RSI'], ['macd', 'MACD'], ['none', 'None']], cfg.lower, v => { cfg.lower = v; save(); chart.opts.lower = v; chart.draw(); }));
  const ovBox = el('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } });
  for (const [id, lab] of [['sma20', 'MA20'], ['sma50', 'MA50'], ['sma200', 'MA200'], ['ema21', 'EMA21'], ['bb', 'Bollinger'], ['vwap', 'VWAP']]) {
    const b = el('button', { class: 'btn sm' + (cfg.overlays.includes(id) ? ' on' : ''), text: lab, onclick: () => {
      const k = cfg.overlays.indexOf(id);
      if (k >= 0) cfg.overlays.splice(k, 1); else cfg.overlays.push(id);
      b.classList.toggle('on', k < 0); save(); chart.opts.overlays = cfg.overlays; chart.draw();
    } });
    ovBox.appendChild(b);
  }
  tools.appendChild(ovBox);
  wrap.appendChild(tools);
  const cw = el('div', { class: 'chartwrap' });
  const cv = el('canvas');
  cw.appendChild(cv); wrap.appendChild(cw);
  wrap.appendChild(el('div', { class: 'note', style: { padding: '7px 12px', borderTop: '1px solid var(--line)' }, text: 'Scroll to zoom, drag to pan, double-click to reset. Intraday timeframes are folded out of the daily bars so the two never disagree about the day’s range.' }));
  setTimeout(() => { chart = new M.Chart.PriceChart(cv, { type: cfg.type, overlays: cfg.overlays, lower: cfg.lower }); chart.resize(); chart.setData(M.Sim.history(inst, cfg.tf)); }, 0);
  return wrap;
}
const save = () => M.store.set('chartcfg', cfg);

function depthCard() {
  const body = el('div', { class: 'cbody tight' });
  depthCanvas = el('canvas', { style: { width: '100%', height: '78px', display: 'block' } });
  body.appendChild(depthCanvas);
  ladder = el('div', { class: 'ladder' });
  body.appendChild(ladder);
  return UI.card('Depth', body, el('span', { class: 'pill sim', text: 'SIMULATED BOOK' }));
}
const paintDepth = M.throttle(() => {
  if (!inst || !inst.book || !ladder) return;
  const b = inst.book;
  M.clear(ladder);
  const maxS = Math.max(...b.bids.map(x => x.s), ...b.asks.map(x => x.s)) || 1;
  for (let i = Math.min(7, b.asks.length) - 1; i >= 0; i--) {
    const a = b.asks[i];
    ladder.appendChild(el('div', { class: 'lv a' }, [el('i', { style: { width: a.s / maxS * 100 + '%' } }), el('span', { class: 'dn', text: M.fmt.px(a.p) }), el('span', { class: 'r', style: { textAlign: 'right' }, text: M.fmt.qty(a.s) })]));
  }
  ladder.appendChild(el('div', { class: 'mid' }, [
    el('span', { text: M.fmt.px(inst.px) }),
    el('span', { class: b.imbalance > 0 ? 'up' : 'dn', text: (b.imbalance > 0 ? '+' : '') + (b.imbalance * 100).toFixed(0) + '% ' + (b.imbalance > 0 ? 'bid' : 'offer') })
  ]));
  for (let i = 0; i < Math.min(7, b.bids.length); i++) {
    const d = b.bids[i];
    ladder.appendChild(el('div', { class: 'lv b' }, [el('i', { style: { width: d.s / maxS * 100 + '%' } }), el('span', { class: 'up', text: M.fmt.px(d.p) }), el('span', { style: { textAlign: 'right' }, text: M.fmt.qty(d.s) })]));
  }
  if (depthCanvas) M.Chart.depth(depthCanvas, b);
}, 420);

function tapeCard() {
  tapeBox = el('div', { class: 'cbody tight', style: { maxHeight: '220px', overflowY: 'auto' } });
  return UI.card('Time and sales', tapeBox);
}
const paintTape = M.throttle(() => {
  if (!inst || !tapeBox) return;
  M.clear(tapeBox);
  for (const t of inst.tape.slice(0, 40)) {
    tapeBox.appendChild(el('div', { class: 'tape-row' }, [
      el('span', { class: 'dim', text: M.fmt.time(t.t) }),
      el('span', { class: t.side === 'B' ? 'up' : 'dn', text: M.fmt.px(t.p) }),
      el('span', { style: { textAlign: 'right' }, text: M.fmt.qty(t.s) })
    ]));
  }
  if (!inst.tape.length) tapeBox.appendChild(el('div', { class: 'empty', text: 'No prints yet.' }));
}, 700);

// ------------------------------------------------------------------ ticket
function ticket() {
  const state = { side: 'buy', type: 'market', qty: 10, limit: inst.px, stop: inst.px };
  const body = el('div', { class: 'cbody' });
  const est = el('div', { class: 'note', style: { marginTop: '8px' } });

  const sideSeg = UI.seg([['buy', 'Buy'], ['sell', 'Sell']], state.side, v => { state.side = v; update(); });
  const typeSeg = UI.seg([['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop']], state.type, v => { state.type = v; update(); });
  const qty = el('input', { type: 'number', min: '0', step: 'any', value: state.qty, oninput: e => { state.qty = +e.target.value; update(); } });
  const lim = el('input', { type: 'number', step: 'any', value: inst.px.toFixed(2), oninput: e => { state.limit = +e.target.value; state.stop = +e.target.value; update(); } });
  const limWrap = el('label', { class: 'fld' }, [el('span', { text: 'Limit / stop price' }), lim]);
  const go = el('button', { class: 'btn buy', style: { width: '100%', marginTop: '4px' }, text: 'Buy' });

  function update() {
    limWrap.hidden = state.type === 'market';
    const px = state.type === 'market' ? P.quoteFill(inst.sym, state.side, state.qty) : (state.type === 'limit' ? state.limit : state.stop);
    const notional = px * state.qty;
    go.className = 'btn ' + (state.side === 'buy' ? 'buy' : 'sell');
    go.textContent = `${state.side === 'buy' ? 'Buy' : 'Sell'} ${state.qty || 0} ${inst.sym} ${state.type === 'market' ? 'at market' : 'at ' + M.fmt.px(px)}`;
    const held = P.find(inst.sym);
    est.innerHTML = '';
    est.appendChild(el('div', {}, [`Estimated ${state.type === 'market' ? 'fill ' + M.fmt.px(px) + ' (crosses the spread plus size impact)' : 'trigger ' + M.fmt.px(px)} · notional ${M.fmt.cap(notional)} · fee ${M.fmt.usd2(notional * 0.00008)}`]));
    est.appendChild(el('div', { style: { marginTop: '4px' } }, [`Cash ${M.fmt.cap(P.cash)} · ${held ? `holding ${held.qty} at ${M.fmt.px(held.avg)}` : 'no position'}`]));
  }
  go.onclick = () => {
    const r = state.type === 'market'
      ? P.execute(inst.sym, state.side, state.qty)
      : P.place({ sym: inst.sym, side: state.side, qty: state.qty, type: state.type, limit: state.limit, stop: state.stop });
    if (!r.ok) M.toast(r.err, 'err');
    else if (r.px) M.toast(`${state.side === 'buy' ? 'Bought' : 'Sold'} ${state.qty} ${inst.sym} at ${M.fmt.px(r.px)}`, 'ok');
    else M.toast(`${state.type} order working on ${inst.sym}`, 'ok');
    update();
  };

  body.appendChild(el('div', { style: { display: 'flex', gap: '6px', marginBottom: '9px' } }, [sideSeg, typeSeg]));
  body.appendChild(el('label', { class: 'fld' }, [el('span', { text: 'Quantity' }), qty]));
  body.appendChild(limWrap);
  body.appendChild(go);
  body.appendChild(est);
  // Sizing straight from the council, so the ticket and the analysis agree.
  body.appendChild(el('button', { class: 'btn sm', style: { marginTop: '8px', width: '100%' }, text: 'Size it the way the council would', onclick: () => {
    const a = M.AI.analyse(inst);
    const eq = P.equity();
    const n = Math.max(0, Math.floor(Math.abs(a.sizing.pct) / 100 * eq / inst.px));
    state.qty = n; qty.value = n; state.side = a.sizing.pct >= 0 ? 'buy' : 'sell';
    update();
    M.toast(a.sizing.note, 'alert');
  } }));
  update();
  return UI.card('Order ticket', body, el('span', { class: 'pill sim', text: 'PAPER' }));
}

function alertDialog() {
  const px = el('input', { type: 'number', step: 'any', value: inst.px.toFixed(2) });
  const dir = el('select', {}, [el('option', { value: 'above', text: 'rises above' }), el('option', { value: 'below', text: 'falls below' })]);
  UI.modal('Price alert on ' + inst.sym, [
    el('p', { class: 'note', text: 'Alerts are checked against the tape four times a second while this tab is open.' }),
    el('label', { class: 'fld' }, [el('span', { text: 'Condition' }), dir]),
    el('label', { class: 'fld' }, [el('span', { text: 'Price' }), px]),
    el('button', { class: 'btn primary', text: 'Set alert', onclick: () => { P.addAlert(inst.sym, +px.value, dir.value); UI.closeModal(); M.toast('Alert set on ' + inst.sym); } })
  ]);
}

// ------------------------------------------------------------------ fundamentals
function fundCard() {
  const body = el('div', { class: 'cbody' });
  const f = inst.f || {};
  const rows = [];
  const add = (k, v, cls) => rows.push([k, v, cls]);
  if (inst.type === 'stock') {
    add('Market cap', M.fmt.cap(f.mcap));
    add('Enterprise value', M.fmt.cap(f.ev));
    add('Revenue (TTM)', M.fmt.cap(f.revenue));
    add('Net income', M.fmt.cap(f.netIncome), f.netIncome < 0 ? 'dn' : '');
    add('EPS', f.eps > 0 ? M.fmt.usd2(f.eps) : '—');
    add('P/E', f.pe > 0 ? f.pe.toFixed(1) : '—');
    add('Forward P/E', f.fpe > 0 ? f.fpe.toFixed(1) : '—');
    add('P/B', f.pb > 0 ? f.pb.toFixed(2) : '—');
    add('P/S', f.ps > 0 ? f.ps.toFixed(2) : '—');
    add('EV / EBITDA', f.evEbitda > 0 ? f.evEbitda.toFixed(1) : '—');
    add('Gross margin', f.grossMargin ? f.grossMargin.toFixed(1) + '%' : '—');
    add('Operating margin', f.opMargin.toFixed(1) + '%', f.opMargin < 0 ? 'dn' : '');
    add('Net margin', f.netMargin.toFixed(1) + '%', f.netMargin < 0 ? 'dn' : '');
    add('ROE', f.roe.toFixed(1) + '%');
    add('ROIC', f.roic.toFixed(1) + '%', f.roic > 15 ? 'up' : f.roic < 7 ? 'dn' : '');
    add('Free cash flow', M.fmt.cap(f.fcf), f.fcf < 0 ? 'dn' : '');
    add('FCF yield', f.fcfYield.toFixed(2) + '%');
    add('Revenue growth', M.fmt.pct(f.revGrowth, 1), M.fmt.sign(f.revGrowth));
    add('EPS growth', M.fmt.pct(f.epsGrowth, 1), M.fmt.sign(f.epsGrowth));
    add('Debt / equity', f.debtEquity.toFixed(2), f.debtEquity > 2 ? 'dn' : '');
    add('Net debt / EBITDA', f.netDebtEbitda > 0 ? f.netDebtEbitda.toFixed(2) : 'net cash', f.netDebtEbitda > 4 ? 'dn' : '');
    add('Current ratio', f.currentRatio ? f.currentRatio.toFixed(2) : '—');
    add('Interest coverage', f.interestCoverage.toFixed(1) + '×', f.interestCoverage < 2 ? 'dn' : '');
    add('Dividend yield', f.divYield ? f.divYield.toFixed(2) + '%' : '—');
    add('Payout ratio', f.payout ? f.payout.toFixed(0) + '%' : '—');
    add('Share count change', M.fmt.pct(f.shareChange, 1), f.shareChange < 0 ? 'up' : 'dn');
    add('Insider ownership', f.insiderOwn.toFixed(1) + '%');
    add('Short interest', f.shortFloat.toFixed(1) + '% of float', f.shortFloat > 15 ? 'dn' : '');
    add('Beta', f.beta.toFixed(2));
  } else if (inst.type === 'bond') {
    add('Yield', f.yield.toFixed(3) + '%'); add('Coupon', f.coupon.toFixed(3) + '%');
    add('Maturity', f.maturity < 1 ? (f.maturity * 12).toFixed(0) + ' months' : f.maturity + ' years');
    add('Approx. duration', f.duration.toFixed(2));
    add('1% rate rise costs', '-' + (f.duration).toFixed(1) + '% of principal', 'dn');
  } else if (inst.type === 'etf') {
    add('Asset class', inst.sector); add('Expense ratio', f.expense + '%', f.expense > .5 ? 'dn' : 'up');
    add('Distribution yield', f.divYield + '%');
    add('Cost on $10,000 a year', M.fmt.usd2(f.expense / 100 * 10000), '');
    add('What it holds', f.holds, '');
  } else if (inst.type === 'crypto') {
    add('Market value', M.fmt.cap(f.mcap));
    add('Circulating supply', M.fmt.qty(f.supply));
    add('Maximum supply', f.maxSupply ? M.fmt.qty(f.maxSupply) : 'uncapped', f.maxSupply ? 'up' : 'dn');
    if (f.maxSupply) add('Issued so far', (f.supply / f.maxSupply * 100).toFixed(1) + '%');
  } else if (inst.type === 'future') {
    add('Contract size', M.fmt.qty(f.size)); add('Tick', String(f.tick));
    add('Notional per contract', M.fmt.cap(inst.px * f.size));
  } else if (inst.type === 'index') {
    add('What it is', f.what, '');
  }
  const dl = el('dl', { class: 'kv' });
  for (const [k, v, cls] of rows) { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); }
  body.appendChild(dl);
  if (inst.about) body.appendChild(el('p', { class: 'note', style: { marginTop: '10px' }, text: inst.about }));

  const live = inst.fSrc === 'live';
  body.appendChild(el('div', { class: live ? 'note' : 'warn', style: { marginTop: '11px' } }, live
    ? ['Fundamentals from ' + (f.src || 'a provider') + '.']
    : [el('b', { text: 'Modelled fundamentals. ' }), 'These are drawn deterministically from this ticker’s sector medians, not from filings. Every valuation on this page is therefore a demonstration of method. Paste an Alpha Vantage or Finnhub key in Sources and the real figures replace them field by field.']));
  const tools = [];
  if (M.keys.has('alphavantage')) tools.push(el('button', { class: 'btn sm', text: 'Pull real fundamentals', onclick: async e => { e.target.disabled = true; try { await M.Providers.alphaOverview(inst); M.toast('Fundamentals updated from Alpha Vantage', 'ok'); UI.go('symbol', inst.sym); } catch (err) { M.toast(err.message, 'err'); e.target.disabled = false; } } }));
  else tools.push(el('span', { class: 'pill sim', text: 'MODELLED' }));
  return UI.card('Fundamentals', body, tools);
}

function statsCard() {
  const body = el('div', { class: 'cbody' });
  const t = M.TA.snapshot(M.Sim.history(inst, '1D'));
  const dl = el('dl', { class: 'kv' });
  const add = (k, v, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); };
  if (t) {
    add('52-week high', M.fmt.px(t.hi52)); add('52-week low', M.fmt.px(t.lo52));
    add('Off the high', (100 - t.pctOfHigh).toFixed(1) + '%', t.pctOfHigh > 90 ? 'up' : '');
    add('Above the low', t.pctOffLow.toFixed(1) + '%');
    add('50-day average', t.sma50 ? M.fmt.px(t.sma50) : '—', t.above50 ? 'up' : 'dn');
    add('200-day average', t.sma200 ? M.fmt.px(t.sma200) : '—', t.above200 ? 'up' : 'dn');
    add('RSI (14)', t.rsi ? t.rsi.toFixed(1) : '—', t.rsi > 70 ? 'dn' : t.rsi < 30 ? 'up' : '');
    add('ADX (14)', t.adx ? t.adx.toFixed(0) : '—');
    add('ATR', t.atr ? M.fmt.px(t.atr) + ' (' + t.atrPct.toFixed(1) + '%)' : '—');
    add('Stage', t.stage.name);
  }
  add('Realised vol (20d)', M.Sim.realisedVol(inst).toFixed(1) + '%');
  add('Max drawdown (1y)', M.Sim.maxDrawdown(inst).toFixed(1) + '%', 'dn');
  for (const [lab, d] of [['1 month', 21], ['3 months', 63], ['6 months', 126], ['1 year', 252]]) {
    const r = M.Sim.ret(inst, d); add('Return, ' + lab, M.fmt.pct(r, 1), M.fmt.sign(r));
  }
  const spy = U.get('SPY');
  if (spy && inst !== spy) { const rel = M.Sim.ret(inst, 252) - M.Sim.ret(spy, 252); add('vs S&P 500, 1y', M.fmt.pct(rel, 1), M.fmt.sign(rel)); add('Correlation to SPY', M.Sim.corr(inst, spy).toFixed(2)); }
  body.appendChild(dl);
  return UI.card('Price statistics', body);
}

function verdictCard() {
  const body = el('div', { class: 'cbody' });
  const a = M.AI.analyse(inst);
  if (!a) return UI.card('Council', el('div', { class: 'empty', text: 'No verdict for this instrument.' }));
  const tone = a.verdict.tone === 'g' ? 'up' : a.verdict.tone === 'r' ? 'dn' : 'mid';
  body.appendChild(el('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' } }, [
    el('div', { class: 'big ' + tone, style: { font: '700 20px var(--f-ui)' }, text: a.verdict.text }),
    el('div', { class: 'num dim', style: { fontSize: '12px' }, text: `score ${a.score.toFixed(0)} · confidence ${(a.confidence * 100).toFixed(0)}% · ${a.results.length} seats` })
  ]));
  const bar = el('div', { class: 'score-bar', style: { marginTop: '9px' } }, [el('i', { style: { left: `calc(${(a.score + 100) / 2}% - 1.5px)` } })]);
  body.appendChild(bar);
  const top = el('div', { style: { marginTop: '10px' } });
  for (const b of a.bulls.slice(0, 2)) { const p = b.points.filter(x => x.dir > 0)[0]; if (p) top.appendChild(el('div', { class: 'point' }, [el('div', { class: 'd up', text: '▲' }), el('div', {}, [p.text, el('cite', {}, [el('b', { text: p.book.title }), ' — ' + p.book.author])])])); }
  for (const b of a.bears.slice(0, 2)) { const p = b.points.filter(x => x.dir < 0)[0]; if (p) top.appendChild(el('div', { class: 'point' }, [el('div', { class: 'd dn', text: '▼' }), el('div', {}, [p.text, el('cite', {}, [el('b', { text: p.book.title }), ' — ' + p.book.author])])])); }
  body.appendChild(top);
  body.appendChild(el('p', { class: 'note', style: { marginTop: '8px' }, text: a.sizing.note }));
  body.appendChild(el('button', { class: 'btn primary', style: { marginTop: '9px', width: '100%' }, text: 'Open the full verdict', onclick: () => UI.go('ai', inst.sym) }));
  return UI.card('Analyst council', body);
}

function newsCard() {
  const body = el('div', { class: 'cbody tight', style: { maxHeight: '320px', overflowY: 'auto' } });
  const paint = () => {
    M.clear(body);
    const rows = M.News.for(inst.sym, 12);
    if (!rows.length) body.appendChild(el('div', { class: 'empty', text: 'Nothing on the wire for ' + inst.sym + ' yet.' }));
    else for (const n of rows) body.appendChild(UI.newsItem(n, { compact: true }));
  };
  paint();
  M.on('news', M.throttle(() => { if (UI.current === 'symbol') paint(); }, 5000));
  const pulse = M.News.pulseFor(inst.sym, 96);
  return UI.card('Wire — ' + inst.sym, body, pulse.n ? el('span', { class: 'pill ' + (pulse.net > .1 ? 'g' : pulse.net < -.1 ? 'r' : ''), text: `tone ${pulse.net > 0 ? '+' : ''}${(pulse.net * 100).toFixed(0)} · ${pulse.n}` }) : null);
}

UI.register('symbol', {
  label: 'Symbol',
  hidden: true,
  mount(node, sym) {
    inst = U.get(sym) || U.get('AAPL');
    M.Sim.setFocus(inst.sym);
    node.appendChild(head());
    const wrap = el('div', { class: 'wrap' });
    const grid = el('div', { class: 'cols m2' });
    const left = el('div', { class: 'grid' }, [chartCard(), newsCard(), fundCard()]);
    const right = el('div', { class: 'grid' }, [ticket(), verdictCard(), depthCard(), tapeCard(), statsCard()]);
    grid.appendChild(left); grid.appendChild(right);
    wrap.appendChild(grid);
    node.appendChild(wrap);
    paintQuote();
  },
  leave() { M.Sim.setFocus(null); chart = null; },
  resize() { if (chart) chart.resize(); },
  update: M.throttle(function () {
    paintQuote(); paintDepth(); paintTape();
    if (chart && (cfg.tf === '1m' || cfg.tf === '5m')) chart.setData(M.Sim.history(inst, cfg.tf), true);
  }, 480)
});
})();
