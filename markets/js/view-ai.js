// ============================================================================
// TERMINAL — the analyst council. The full verdict for one instrument: every
// seat's score and its numbered reasoning with the book each rule came from,
// the debate between the two sides, valuation anchors, position size, the bear
// case and the list of things that would overturn it. Plus the question box
// and the library itself.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, U = M.Universe, L = M.Library, AI = M.AI;

let chatLog = [];

function verdictHead(a) {
  const tone = a.verdict.tone === 'g' ? 'up' : a.verdict.tone === 'r' ? 'dn' : 'mid';
  return el('div', { class: 'verdict' }, [
    el('div', { style: { minWidth: '200px' } }, [
      el('div', { class: 'dim mono', style: { fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase' }, text: a.sym + ' · ' + M.fmt.usd2(a.px) }),
      el('div', { class: 'big ' + tone, text: a.verdict.text }),
      el('div', { class: 'dim', style: { fontSize: '12px', marginTop: '3px' }, text: `${a.results.length} seats · ${a.dispersion.toFixed(0)} points of disagreement` })
    ]),
    el('div', { style: { flex: '1', minWidth: '240px' } }, [
      el('div', { class: 'score-bar' }, [el('i', { style: { left: `calc(${(a.score + 100) / 2}% - 1.5px)` } })]),
      el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '5px', font: '500 10px var(--f-mono)', color: 'var(--dim)' } }, [
        el('span', { text: 'AVOID −100' }), el('span', { class: 'num', style: { color: 'var(--fg)', fontSize: '13px', fontWeight: 700 }, text: a.score.toFixed(1) }), el('span', { text: '+100 STRONG BUY' })
      ]),
      el('div', { style: { marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
        el('span', { class: 'pill', text: 'Confidence ' + (a.confidence * 100).toFixed(0) + '%' }),
        el('span', { class: 'pill ' + (a.regime.tone === 'g' ? 'g' : a.regime.tone === 'r' ? 'r' : ''), text: a.regime.name }),
        a.fscore != null ? el('span', { class: 'pill ' + (a.fscore >= 7 ? 'g' : a.fscore <= 3 ? 'r' : ''), text: 'F-score ' + a.fscore + '/9' }) : null,
        a.zscore != null ? el('span', { class: 'pill ' + (a.zscore > 2.99 ? 'g' : a.zscore < 1.81 ? 'r' : 'y'), text: 'Altman Z ' + a.zscore.toFixed(2) }) : null,
        el('span', { class: 'pill ' + (a.dataQuality.price === 'live' ? 'live' : 'sim'), text: 'Price ' + a.dataQuality.price.toUpperCase() }),
        el('span', { class: 'pill ' + (a.dataQuality.fundamentals === 'live' ? 'live' : 'sim'), text: 'Fundamentals ' + a.dataQuality.fundamentals.toUpperCase() })
      ])
    ])
  ]);
}

function seatNode(r) {
  const body = el('div', { class: 'body', hidden: true });
  for (const p of r.points) {
    body.appendChild(el('div', { class: 'point' }, [
      el('div', { class: 'd ' + (p.dir > 0 ? 'up' : p.dir < 0 ? 'dn' : 'dim'), text: p.dir > 0 ? '▲' : p.dir < 0 ? '▼' : '•' }),
      el('div', {}, [p.text, p.book ? el('cite', {}, [el('b', { text: p.book.title }), ` — ${p.book.author}, ${p.book.year}. ${p.book.idea}`]) : null])
    ]));
  }
  const node = el('div', { class: 'seat' }, [
    el('button', { onclick: () => { body.hidden = !body.hidden; } }, [
      el('div', { class: 'sw', style: { background: r.colour } }),
      el('div', {}, [el('div', { class: 'nm', text: r.name }), el('div', { class: 'sch', text: r.school + ' · ' + r.points.length + ' point' + (r.points.length > 1 ? 's' : '') })]),
      el('div', { class: 'sc ' + (r.score > 12 ? 'up' : r.score < -12 ? 'dn' : 'dim'), text: (r.score > 0 ? '+' : '') + r.score.toFixed(0) }),
      el('div', { class: 'cf', text: 'w ' + r.weight.toFixed(2) })
    ]),
    body
  ]);
  return node;
}

function verdictView(node, sym) {
  const inst = U.get(sym);
  const a = AI.analyse(inst);
  const wrap = el('div', { class: 'wrap' });

  wrap.appendChild(el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '11px', flexWrap: 'wrap' } }, [
    el('button', { class: 'btn sm', text: '← ' + inst.sym + ' page', onclick: () => UI.openSymbol(inst.sym) }),
    el('div', { style: { fontSize: '13px' } }, [el('b', { text: inst.name }), el('span', { class: 'dim', text: ' · ' + inst.sector + ' · ' + inst.industry })]),
    el('button', { class: 'btn sm', style: { marginLeft: 'auto' }, text: 'Re-run', onclick: () => UI.go('ai', sym) }),
    el('button', { class: 'btn sm', text: 'Ask about this', onclick: () => UI.go('ai', 'ASK:should I buy ' + inst.sym) }),
    M.keys.has('llm') ? el('button', { class: 'btn sm', text: 'Write it up with the model', onclick: async e => {
      e.target.disabled = true; e.target.textContent = 'Writing…';
      try { const txt = await AI.brief(a); UI.modal('Committee note — model prose over the computed verdict', [el('p', { class: 'note', style: { whiteSpace: 'pre-wrap', fontSize: '13px' }, text: txt }), el('div', { class: 'warn', style: { marginTop: '10px' } }, ['This paragraph was written by a language model from the verdict above. The numbers were computed before it ran and it cannot change them.'])]); }
      catch (err) { M.toast(err.message, 'err'); }
      e.target.disabled = false; e.target.textContent = 'Write it up with the model';
    } }) : null
  ]));

  wrap.appendChild(verdictHead(a));

  if (a.dataQuality.price === 'sim' || a.dataQuality.fundamentals === 'sim') {
    wrap.appendChild(el('div', { class: 'warn', style: { marginTop: '11px' } }, [el('b', { text: 'Read this first. ' }), a.dataQuality.note + ' The reasoning below is the real thing — these are the actual tests from the books named. What they are being run on is not.']));
  }

  const grid = el('div', { class: 'cols m2', style: { marginTop: '12px' } });

  // ---- left: the debate, then every seat
  const left = el('div', { class: 'grid' });
  const deb = el('div', { class: 'cbody' });
  for (const r of a.debate.rounds) {
    deb.appendChild(el('div', { class: 'deb' }, [
      el('div', { class: 'who ' + (r.side === 'bull' ? 'up' : 'dn'), style: { color: r.colour } }, [r.seat]),
      el('div', {}, [r.text, r.book ? el('cite', { style: { display: 'block', marginTop: '4px', font: '500 10.5px var(--f-mono)', color: 'var(--dim)', fontStyle: 'normal' } }, [el('b', { style: { color: 'var(--mid)' }, text: r.book.title }), ' — ' + r.book.author]) : null])
    ]));
  }
  deb.appendChild(el('p', { class: 'note', style: { marginTop: '10px', fontStyle: 'italic' }, text: a.debate.close }));
  left.appendChild(UI.card('The disagreement', deb));

  const seats = el('div', { class: 'cbody' });
  for (const r of a.results) seats.appendChild(seatNode(r));
  seats.appendChild(el('p', { class: 'note', style: { marginTop: '9px' }, text: 'Each seat is weighted by instrument type and by the current regime — in a contraction the balance-sheet seats are turned up and the momentum seats down, and that weighting is shown as "w" on each row. Click a seat to read its working.' }));
  left.appendChild(UI.card('Every seat', seats, el('span', { class: 'pill', text: a.results.length + ' seats · ' + L.count() + ' books' })));

  // ---- right: targets, sizing, risks, falsifiers
  const right = el('div', { class: 'grid' });

  const tgt = el('div', { class: 'cbody' });
  if (a.targets.anchors.length) {
    const dl = el('dl', { class: 'kv' });
    for (const t of a.targets.anchors) {
      dl.appendChild(el('dt', {}, [t.method, el('div', { class: 'dim', style: { fontSize: '10.5px' }, text: t.note })]));
      dl.appendChild(el('dd', { class: t.v > a.px ? 'up' : 'dn', text: M.fmt.usd2(t.v) }));
    }
    tgt.appendChild(dl);
    tgt.appendChild(el('p', { class: 'note', style: { marginTop: '9px' }, text: `Kept separate on purpose. Averaging three methods into one "price target" manufactures a precision none of them has. The fundamental anchors span ${M.fmt.usd2(a.targets.range.lo)} to ${M.fmt.usd2(a.targets.range.hi)} against a price of ${M.fmt.usd2(a.px)}.` }));
  } else tgt.appendChild(el('div', { class: 'empty', text: 'No valuation anchor applies to this instrument type.' }));
  right.appendChild(UI.card('Valuation anchors', tgt));

  const sz = el('div', { class: 'cbody' });
  sz.appendChild(el('div', { style: { font: '700 22px var(--f-mono)', color: a.sizing.pct > 0 ? 'var(--up)' : a.sizing.pct < 0 ? 'var(--dn)' : 'var(--mid)' }, text: (a.sizing.pct >= 0 ? '' : '') + a.sizing.pct.toFixed(1) + '% of capital' }));
  sz.appendChild(el('p', { class: 'note', style: { marginTop: '6px' }, text: a.sizing.note }));
  const dl2 = el('dl', { class: 'kv', style: { marginTop: '9px' } });
  const addr = (k, v) => { dl2.appendChild(el('dt', { text: k })); dl2.appendChild(el('dd', { text: v })); };
  addr('Quarter Kelly', a.sizing.kellyPct.toFixed(1) + '%');
  addr('Volatility parity cap', a.sizing.volParity.toFixed(1) + '%');
  addr('Per-name hard cap', a.sizing.hardCap + '%');
  addr('Suggested stop distance', a.sizing.stop.toFixed(1) + '%');
  const eq = M.Portfolio.equity();
  addr('On your ' + M.fmt.cap(eq) + ' account', Math.floor(Math.abs(a.sizing.pct) / 100 * eq / a.px) + ' ' + (a.type === 'crypto' ? 'units' : 'shares'));
  sz.appendChild(dl2);
  right.appendChild(UI.card('Position size', sz, el('span', { class: 'pill', text: 'KELLY ÷ 4' })));

  const rk = el('div', { class: 'cbody' });
  for (const r of a.risks) rk.appendChild(el('div', { class: 'point' }, [el('div', { class: 'd dn', text: '▼' }), el('div', {}, [r.text, el('cite', {}, [el('b', { text: r.book.title }), ' — ' + r.book.author])])]));
  if (!a.risks.length) rk.appendChild(el('div', { class: 'empty', text: 'No seat raised a weighted objection. That is itself worth being suspicious of.' }));
  right.appendChild(UI.card('The bear case', rk));

  const fx = el('div', { class: 'cbody' });
  for (const f of a.falsifiers) fx.appendChild(el('div', { class: 'point' }, [el('div', { class: 'd', text: '→' }), el('div', { text: f })]));
  fx.appendChild(el('p', { class: 'note', style: { marginTop: '8px' }, text: 'Written before the outcome is known, which is the only defence against hindsight rewriting why you bought. Montier’s rule, and the reason this list exists at all.' }));
  right.appendChild(UI.card('What would change this answer', fx));

  grid.appendChild(left); grid.appendChild(right);
  wrap.appendChild(grid);
  node.appendChild(wrap);
}

// ------------------------------------------------------------------ ask
function askView(node, seed) {
  const wrap = el('div', { class: 'wrap' });
  const log = el('div', { class: 'chat' });
  const input = el('input', { type: 'text', placeholder: 'Ask about any ticker, the macro, your portfolio, or any book in the library…' });

  function render(entry) {
    if (entry.me) { log.appendChild(el('div', { class: 'msg me', text: entry.me })); return; }
    const box = el('div', { class: 'msg ai' });
    for (const b of entry.blocks) {
      const blk = el('div', { class: 'blk' });
      if (b.h) blk.appendChild(el('h5', { text: b.h }));
      blk.appendChild(el('div', { text: b.b }));
      if (b.cite) blk.appendChild(el('cite', { style: { display: 'block', marginTop: '4px', font: '500 10.5px var(--f-mono)', color: 'var(--dim)', fontStyle: 'normal' } }, [el('b', { style: { color: 'var(--mid)' }, text: b.cite.title }), ` — ${b.cite.author}, ${b.cite.year}`]));
      box.appendChild(blk);
    }
    if (entry.inst) box.appendChild(el('button', { class: 'btn sm', style: { marginTop: '8px' }, text: 'Full verdict on ' + entry.inst.sym, onclick: () => UI.go('ai', entry.inst.sym) }));
    log.appendChild(box);
  }

  function ask(q) {
    if (!q.trim()) return;
    const me = { me: q }; chatLog.push(me); render(me);
    const out = AI.ask(q);
    chatLog.push(out); render(out);
    log.scrollTop = log.scrollHeight;
    input.value = '';
  }

  const form = el('div', { style: { display: 'flex', gap: '7px', padding: '11px', borderTop: '1px solid var(--line)' } }, [
    input, el('button', { class: 'btn primary', text: 'Ask', onclick: () => ask(input.value) })
  ]);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(input.value); });

  for (const e of chatLog) render(e);

  const suggestions = el('div', { class: 'cbody', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
  for (const s of [
    'Should I buy NVDA?', 'Is TSLA overvalued?', 'What does the debt picture mean for my positioning?',
    'AAPL vs MSFT', 'How much SPY should I hold?', 'What is the risk in COIN?',
    'Diagnose my portfolio', 'What is on the wire?', 'What did Graham mean by margin of safety?',
    'Is TLT a buy here?', 'What does Minsky say about this market?'
  ]) suggestions.appendChild(el('button', { class: 'btn sm', text: s, onclick: () => ask(s) }));

  wrap.appendChild(el('div', { class: 'warn', style: { marginBottom: '11px' } }, [
    el('b', { text: 'This is not a chatbot. ' }),
    'It matches your question to a computation and answers from live state — it runs the council, reads the debt board, measures your portfolio. It will say it does not understand rather than invent an answer, and it cannot hold a conversation about something it has no number for.'
  ]));
  wrap.appendChild(UI.card('Ask the council', [el('div', { class: 'cbody tight' }, [log]), form], el('button', { class: 'btn sm', text: 'Clear', onclick: () => { chatLog = []; M.clear(log); } })));
  wrap.appendChild(UI.card('Try', suggestions));
  node.appendChild(wrap);
  if (seed) ask(seed);
  else if (!chatLog.length) ask('What is on the wire?');
}

// ------------------------------------------------------------------ library
function libraryView(node) {
  const wrap = el('div', { class: 'wrap' });
  wrap.appendChild(el('div', { class: 'warn', style: { marginBottom: '11px' } }, [
    el('b', { text: 'What “has read every book” honestly means here. ' }),
    'No program has read every book on investing, and any product that says so is selling you something. What this one has is the ',
    el('b', { text: L.count() + ' works below' }),
    ' reduced to the specific, checkable rule each contributes — Graham’s seven criteria, Piotroski’s nine tests, the Altman Z, the Beneish index, CAN SLIM, the magic formula, Kelly sizing, Weinstein’s stages — implemented as arithmetic. Every point the council makes names the book it came from, so you can go and disagree with the source instead of with a black box. The one-line summaries are written from scratch; none of them is a quotation.'
  ]));
  const search = el('input', { type: 'search', placeholder: 'Search the library…', style: { maxWidth: '320px', marginBottom: '11px' }, oninput: M.debounce(e => paint(e.target.value), 200) });
  wrap.appendChild(search);
  const host = el('div', { class: 'grid' });
  wrap.appendChild(host);

  function paint(q) {
    M.clear(host);
    for (const s of L.schoolList()) {
      const books = q ? s.books.filter(b => (b.title + b.author + b.idea).toLowerCase().includes(q.toLowerCase())) : s.books;
      if (!books.length) continue;
      const body = el('div', { class: 'cbody tight' });
      body.appendChild(el('p', { class: 'note', style: { padding: '9px 11px', borderBottom: '1px solid var(--line)', margin: 0, fontStyle: 'italic' }, text: s.one }));
      for (const b of books) body.appendChild(el('div', { class: 'book' }, [
        el('b', { text: b.title }), el('span', { class: 'au', text: b.author + ' · ' + b.year }), el('p', { text: b.idea })
      ]));
      host.appendChild(UI.card(s.name + ' — ' + s.seat, body, el('span', { class: 'pill', text: books.length + ' books' })));
    }
  }
  paint('');
  node.appendChild(wrap);
}

UI.register('ai', {
  label: 'Analyst AI',
  mount(node, arg) {
    const tabs = el('div', { style: { display: 'flex', gap: '6px', padding: '11px 14px 0', flexWrap: 'wrap' } });
    const host = el('div');
    let mode = arg && arg.startsWith('ASK:') ? 'ask' : arg && U.has(arg) ? 'verdict' : 'ask';
    const seed = arg && arg.startsWith('ASK:') ? arg.slice(4) : null;
    const sym = arg && U.has(arg) ? arg : null;
    const render = () => {
      M.clear(host);
      if (mode === 'verdict' && sym) verdictView(host, sym);
      else if (mode === 'library') libraryView(host);
      else askView(host, seed);
      [...tabs.children].forEach(c => c.classList.toggle('on', c.dataset.m === mode));
    };
    for (const [m, lab] of [['ask', 'Ask the council'], sym ? ['verdict', 'Verdict on ' + sym] : null, ['library', 'The library (' + L.count() + ' books)']].filter(Boolean)) {
      tabs.appendChild(el('button', { class: 'btn' + (m === mode ? ' on' : ''), data: { m }, text: lab, onclick: () => { mode = m; render(); } }));
    }
    node.appendChild(tabs); node.appendChild(host);
    render();
  }
});
})();
