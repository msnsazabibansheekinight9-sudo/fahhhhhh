// ============================================================================
// TERMINAL — the debt board. The national ledger laid out the way the original
// does it: dense panels of outlined cells, every figure ticking on its own
// growth rate. The time machine evaluates the same formulas at any date, so
// you can scrub back to 1980 or forward to 2040 and the whole board moves.
// ============================================================================
'use strict';
(function () {
const D = M.Debt, el = M.el, UI = M.UI;

// Layout. Each entry is a counter id, or [id, class] for size, or a pair.
const SECTIONS = [
  { t: 'US National Debt', cols: 4, cells: [
    ['natDebt', 'big r', 2], ['debtPerCitizen', 'r'], ['debtPerTaxpayer', 'r'],
    ['fedSpending', 'r'], ['fedDeficit', 'r'], ['savingsClock', 'y'], ['savingsPerTax', 'y']
  ]},
  { t: 'Federal Debt to GDP', cols: 4, special: 'gdphist' },
  { t: 'Receipts', cols: 5, cells: [
    ['fedRevenue', 'g'], ['revPerCitizen', 'g'], ['incomeTax', 'k'], ['payrollTax', 'g'], ['exciseTax', 'g'],
    ['tariffRev', 'b'], ['corpTax', 'k'], ['estateTax', 'g'], ['charity', 'p'], ['charityPerAdult', 'p'],
    ['stateRevenue', 'g'], ['localRevenue', 'g'], ['stateDebt', 'r'], ['stateDebtPer', 'r'], ['localDebt', 'r'],
    ['localDebtPer', 'r'], ['muniEmployees', 'k'], ['muniSalary', 'k'], ['gdp', 'g'], ['workerComp', 'b'],
    ['allSpending', 'k'], ['totalDebtToGdp', 'r'], ['revToGdp', 'g'], ['spendToGdp', 'k'], ['allDebtToGdp', 'r']
  ]},
  { t: 'Largest Budget Items', cols: 4, cells: [
    ['medicare', 'b'], ['socialSec', 'k'], ['defense', 'k'], ['netInterest', 'y']
  ]},
  { t: 'Unfunded Debt and Interest', cols: 4, cells: [
    ['totalDebt', 'r'], ['totalInterest', 'r'], ['creditCard', 'r'], ['ccPerHolder', 'r']
  ]},
  { t: '50 State Credit Union Banks · 0–3% Interest on Loans', cols: 4, cells: [
    ['cuFedSavings', 'g'], ['cuFedPerAdult', 'g'], ['cuTotalSavings', 'g'], ['cuTotPerAdult', 'g']
  ]},
  { t: 'Money Creation', cols: 4, cells: [
    ['dollarsAdded', 'g'], ['m2', 'k'], ['derivatives', 'k'], ['moneyWageGap', 'y'],
    ['moneyGrowth13', 'y'], ['wageGrowth13', 'r'], ['fracTax', 'r'], ['fracTaxPerAdult', 'r']
  ]},
  { t: 'National Security', cols: 4, cells: [
    ['foreignHeld', 'r'], ['tradeDeficit', 'r'], ['tradeChina', 'r'], ['importedOil', 'r']
  ]},
  { t: 'People and Work', cols: 6, cells: [
    ['population', 'k'], ['workforce', 'k'], ['unemployed', 'k'], ['unemployedAct', 'k'], ['privateJobs', 'k'], ['govEmployees', 'k'],
    ['taxpayers', 'k'], ['workforce2000', 'k'], ['notInForce', 'r'], ['notInForce2000', 'k'], ['fullTime', 'k'], ['partTime', 'k'],
    ['selfEmployed', 'k'], ['unionWorkers', 'k'], ['mfgJobs', 'k'], ['mfgJobs2000', 'k'], ['retirees', 'k'], ['disabled', 'k'],
    ['medicareEnrol', 'r'], ['medicaidRecip', 'r'], ['foodStamps', 'r'], ['poverty', 'r'], ['uninsured', 'r'], ['millionaires', 'g'],
    ['homeless', 'y'], ['drugDeaths', 'k'], ['bankruptcies', 'r'], ['foreclosures', 'r'], ['top1Wealth', 'g'], ['bottom50Wealth', 'r']
  ]},
  { t: 'Cost of Living — now against 2000', cols: 5, cells: [
    ['healthcareNow', 'b'], ['tuitionNow', 'k'], ['homeNow', 'g'], ['incomeNow', 'g'], ['carNow', 'g'],
    ['healthcare2000', 'k'], ['tuition2000', 'k'], ['home2000', 'k'], ['income2000', 'k'], ['car2000', 'k']
  ]},
  { t: 'What a Dollar Buys', cols: 4, cells: [
    ['silverRatio', 'k'], ['goldRatio', 'k'], ['paperSilver', 'k'], ['paperGold', 'k'],
    ['silver1913', 'k'], ['gold1913', 'k'], ['cryptoRatio', 'k'], ['crypto2013', 'k']
  ]},
  { t: 'USA Treasury · Sovereign Wealth Reserve', cols: 4, cells: [
    ['metals', 'g'], ['minerals', 'g'], ['realEstate', 'g'], ['land', 'g'],
    ['stockMarket', 'g'], ['wealthReserves', 'g'], ['wealthPerCitizen', 'g'], ['treasuryRes', 'g'],
    ['netWorth', 'n', 2], ['deficitPerSec', 'r'], ['debtPerSec', 'r']
  ]},
  { t: 'What the Council Reads Off This Board', cols: 4, cells: [
    ['interestShare', 'y'], ['entitlementShare', 'r'], ['foreignShare', 'r'], ['debtToGdp', 'r']
  ]}
];

let host, cells = [], tm = { on: false, year: new Date().getFullYear(), speed: 1 };

function cellNode(id, cls, span) {
  const meta = D.meta(id);
  const lab = el('div', { class: 'lab' }, [meta ? meta.label : id, el('span', { class: 'live' })]);
  const node = el('div', { class: 'cell ' + (cls || 'k'), style: span ? { gridColumn: 'span ' + span } : null, onclick: () => cellInfo(id) }, [
    lab, el('div', { class: 'val', text: '—' })
  ]);
  node.style.cursor = 'pointer';
  node.__id = id;
  cells.push(node);
  return node;
}

// Clicking a cell says where that specific number came from. The board makes
// claims about the republic's finances; it should be able to show its working.
function cellInfo(id) {
  const meta = D.meta(id);
  if (!meta) return;
  const src = M.Macro.sourceOf(id);
  const c = D.C[id];
  const t = stampTime();
  UI.modal(meta.label, [
    el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } }, [
      el('span', { class: 'pill ' + (src ? 'live' : 'sim'), text: src ? 'LIVE ANCHOR' : meta.derived ? 'DERIVED' : 'PROJECTION' }),
      c ? el('span', { class: 'pill', text: 'growing ' + (c[1] * 100).toFixed(2) + '% a year' }) : null
    ]),
    el('div', { style: { font: '700 26px var(--f-mono)', marginBottom: '8px' }, text: D.format(D.snapshot(t)[id], meta.fmt) }),
    el('p', { class: 'note' }, [
      meta.derived
        ? 'This is not stored. It is divided out of the counters above every time the board repaints, which is why the board can never contradict itself on a ratio.'
        : src
          ? `Anchored to ${src.src} — ${src.note}. The value shown is that measurement carried forward at ${(c[1] * 100).toFixed(2)}% a year to this instant, because the underlying statistic is published monthly or quarterly and nothing ticks in real time at the source.`
          : `A published aggregate for ${new Date(D.EPOCH).toISOString().slice(0, 10)}, carried forward at an assumed ${(c ? c[1] * 100 : 0).toFixed(2)}% a year. It is a projection, not a measurement. Connect a FRED key on the Sources page and this counter re-anchors to the measured series.`
    ]),
    c ? el('p', { class: 'note', style: { marginTop: '8px' }, text: `At that rate it changes by ${D.format(D.rateAt(id, t), meta.fmt)} every second, ${D.format(D.rateAt(id, t) * 86400, meta.fmt)} a day and ${D.format(D.rateAt(id, t) * 31556952, meta.fmt)} a year.` }) : null,
    el('div', { style: { marginTop: '11px', display: 'flex', gap: '7px', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn sm', text: 'Where the data comes from', onclick: () => { UI.closeModal(); UI.go('tools', 'feeds'); } }),
      !src ? el('button', { class: 'btn sm', text: 'Connect a FRED key', onclick: () => { UI.closeModal(); UI.go('sources'); } }) : null
    ])
  ]);
}

function gdpHist(sec) {
  const row = el('div', { class: 'db-cells', style: { gridTemplateColumns: 'repeat(4,1fr)' } });
  for (const [y, v] of D.HISTORY) row.appendChild(el('div', { class: 'cell k' }, [el('div', { class: 'lab', text: y }), el('div', { class: 'val', text: v.toFixed(2) + '%' })]));
  row.appendChild(cellNode('debtToGdp', 'r big'));
  sec.appendChild(row);
}

function build(node) {
  cells = [];
  const wrap = el('div', { class: 'db' });

  wrap.appendChild(el('div', { class: 'db-top' }, [
    el('div', { class: 'db-title' }, ['The ', el('span', { text: 'National Ledger' })]),
    el('div', { class: 'db-sub', id: 'dbStamp' })
  ]));

  // Time machine + controls
  const yearOut = el('span', { class: 'lab', id: 'tmYear' });
  const slider = el('input', { type: 'range', min: 1980, max: 2045, step: 1, value: new Date().getFullYear(), oninput: e => { tm.on = true; tm.year = +e.target.value; M.setText(yearOut, 'Viewing ' + tm.year); paint(); } });
  wrap.appendChild(el('div', { class: 'db-tools' }, [
    el('button', { class: 'btn sm', text: 'State Debt Clocks', onclick: () => UI.go('geo', 'states') }),
    el('button', { class: 'btn sm', text: 'World Debt Clocks', onclick: () => UI.go('geo', 'world') }),
    el('span', { class: 'lab', text: 'Time machine' }), slider, yearOut,
    el('button', { class: 'btn sm', text: 'Now', onclick: () => { tm.on = false; slider.value = new Date().getFullYear(); M.setText(yearOut, ''); paint(); } }),
    el('button', { class: 'btn sm', text: 'Refresh live data', onclick: () => { M.Macro.refresh(); M.RT.refresh(); M.toast('Re-pulling the Treasury figure and every feed…'); } }),
    el('button', { class: 'btn sm', text: 'What this means for markets', onclick: explain }),
    el('button', { class: 'btn sm', text: 'Secret Window', onclick: secretWindow })
  ]));

  // The bottom shelf from the original board, as working pages.
  wrap.appendChild(el('div', { class: 'db-tools', id: 'dbShelf' }, [
    el('button', { class: 'btn sm', text: 'Mortgage & Loan Calculator', onclick: () => UI.go('tools', 'mortgage') }),
    el('button', { class: 'btn sm', text: 'Gold Supply / Demand', onclick: () => UI.go('tools', 'gold') }),
    el('button', { class: 'btn sm', text: 'Gold & Precious Metals', onclick: () => UI.go('tools', 'metals') }),
    el('button', { class: 'btn sm', text: 'Home Sales', onclick: () => UI.go('tools', 'homes') }),
    el('button', { class: 'btn sm', text: 'Auto Sales', onclick: () => UI.go('tools', 'autos') }),
    el('button', { class: 'btn sm', text: 'Energy Output', onclick: () => UI.go('tools', 'energy') }),
    el('button', { class: 'btn sm', text: 'Live Feeds', onclick: () => UI.go('tools', 'feeds') }),
    el('button', { class: 'btn sm', text: 'Sources', onclick: () => UI.go('sources') }),
    el('button', { class: 'btn sm', text: 'About', onclick: () => UI.go('tools', 'about') })
  ]));

  wrap.appendChild(el('div', { class: 'db-note' }, [
    el('b', { text: 'Read this before you quote a number off it. ' }),
    'Every figure here is a projection: a published aggregate at a fixed epoch, grown forward at an assumed annual rate. That is how the original debt clocks work too — nothing ticks in real time at the source. The one exception is the national debt itself, which is re-anchored from the US Treasury’s own “Debt to the Penny” API when that call succeeds; that cell is marked LIVE when it is. Ratios and per-head figures are always divided out of the counters, never stored, so the board cannot contradict itself.'
  ]));

  for (const sec of SECTIONS) {
    const s = el('div', { class: 'db-sec' }, [el('h4', { text: sec.t })]);
    if (sec.special === 'gdphist') { gdpHist(s); wrap.appendChild(s); continue; }
    const g = el('div', { class: 'db-cells', style: { gridTemplateColumns: `repeat(${sec.cols},minmax(0,1fr))` } });
    for (const c of sec.cells) g.appendChild(cellNode(c[0], c[1], c[2]));
    s.appendChild(g);
    wrap.appendChild(s);
  }
  node.appendChild(wrap);
  host = wrap;
  paint();
}

function stampTime() {
  if (tm.on) return new Date(tm.year, 6, 1).getTime();
  return Date.now();
}

let lastVals = {};
function paint() {
  const t = stampTime();
  const snap = D.snapshot(t);
  for (const node of cells) {
    const id = node.__id, meta = D.meta(id);
    if (!meta) continue;
    const v = snap[id];
    const txt = D.format(v, meta.fmt);
    // No flash here: every counter changes on every pass, so flashing them
    // would leave the whole board strobing instead of drawing the eye.
    M.setText(node.querySelector('.val'), txt);
    const anchored = M.Macro.isLive(id);
    if (node.__anchored !== anchored) {
      node.__anchored = anchored;
      node.classList.toggle('live-anchor', anchored);
      M.setText(node.querySelector('.lab .live'), anchored ? ' · LIVE' : '');
    }
    lastVals[id] = v;
  }
  const stamp = M.$('#dbStamp');
  if (stamp) {
    const a = D.anchor.natDebt;
    const n = M.Macro.liveCount();
    M.setText(stamp, (tm.on ? 'Projected to mid-' + tm.year : 'Live · ' + M.fmt.date(t) + ' ' + M.fmt.time(t))
      + ' · ' + (a ? 'federal debt anchored to Treasury ' + new Date(a.t).toISOString().slice(0, 10) : 'federal debt on the published snapshot of ' + new Date(D.EPOCH).toISOString().slice(0, 10))
      + ' · ' + (n ? n + ' counters on measured data' : 'all other counters projected')
      + ' · debt rising ' + M.fmt.usd(D.rateAt('natDebt', t)) + ' a second');
  }
}

function explain() {
  const m = D.macro(stampTime());
  UI.modal('What the board implies for markets', [
    el('p', { class: 'note' }, ['These are the four readings the analyst council actually takes off this board. They change the weight it puts on duration, on leveraged balance sheets and on assets that are nobody’s liability.']),
    el('dl', { class: 'kv', style: { marginTop: '10px' } }, [
      el('dt', { text: 'Federal debt to GDP' }), el('dd', { text: m.debtToGdp.toFixed(1) + '%' }),
      el('dt', { text: 'Net interest as a share of federal receipts' }), el('dd', { text: m.interestShare.toFixed(1) + '%' }),
      el('dt', { text: 'Entitlements plus interest against receipts' }), el('dd', { text: m.entitlementShare.toFixed(1) + '%' }),
      el('dt', { text: 'Deficit as a share of GDP' }), el('dd', { text: m.deficitPct.toFixed(1) + '%' }),
      el('dt', { text: 'Fiscal dominance reading' }), el('dd', { text: (m.fiscalDominance * 100).toFixed(0) + '%' }),
      el('dt', { text: 'Money growth against wage growth since 1913' }), el('dd', { text: m.realWageGap.toFixed(1) + '×' }),
      el('dt', { text: 'Median new home against median income' }), el('dd', { text: m.housingToIncome.toFixed(1) + '×' })
    ]),
    el('div', { class: 'warn', style: { marginTop: '12px' } }, [
      m.fiscalDominance > .45
        ? 'At this reading the issuance schedule, not the policy rate, is setting the long end. The council marks down long duration, marks down leveraged balance sheets, and marks up assets outside the credit system. Dalio’s late-cycle arc and Reinhart and Rogoff’s debt threshold are the two sources behind that weighting.'
        : 'Interest is absorbing a historically high but not yet dominant share of receipts. The council leaves its duration weighting neutral and leans on the cycle and valuation seats instead.'
    ]),
    el('div', { style: { marginTop: '12px', display: 'flex', gap: '7px', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn', text: 'Ask the council about the macro', onclick: () => { UI.closeModal(); UI.go('ai', 'ASK:what does the debt and deficit picture mean for how I should be positioned'); } }),
      el('button', { class: 'btn', text: 'Open the bond board', onclick: () => { UI.closeModal(); UI.openSymbol('US10Y'); } })
    ])
  ]);
}

UI.register('debt', {
  label: 'Debt Board',
  mount: build,
  update: M.throttle(paint, 320)
});

// The original board has a "secret window". This is ours: the arithmetic the
// board implies but never prints — where the trajectory goes, and what each
// of the three ways out would actually cost.
function secretWindow() {
  const t = stampTime();
  const s0 = D.snapshot(t), m = D.macro(t);
  const yrs = [5, 10, 20, 30];
  const rows = yrs.map(y => {
    const at = t + y * 365.2425 * 86400000;
    const f = D.snapshot(at);
    return { y, debt: f.natDebt, gdp: f.gdp, ratio: f.debtToGdp, interest: f.netInterest, share: f.interestShare, perCitizen: f.debtPerCitizen };
  });
  // What closing the primary gap would take, three ways.
  const gap = s0.fedSpending - s0.fedRevenue;
  const taxRise = gap / s0.fedRevenue * 100;
  const spendCut = gap / s0.fedSpending * 100;
  const inflateYears = Math.log(s0.debtToGdp / 60) / 0.05;
  const dl = el('dl', { class: 'kv' });
  const add = (k, v, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: v })); };
  add('Primary gap to close', M.fmt.bigUsd(gap), 'dn');
  add('Raise every federal tax by', taxRise.toFixed(1) + '%', 'dn');
  add('Or cut every federal dollar by', spendCut.toFixed(1) + '%', 'dn');
  add('Or inflate at 5% a year for', inflateYears > 0 ? inflateYears.toFixed(0) + ' years' : 'already below the target', 'dn');
  add('Interest already taking', m.interestShare.toFixed(1) + '% of receipts', m.interestShare > 18 ? 'dn' : '');
  add('Entitlements plus interest', m.entitlementShare.toFixed(1) + '% of receipts', m.entitlementShare > 80 ? 'dn' : '');
  add('Every citizen owes', M.fmt.usd(s0.debtPerCitizen), 'dn');
  add('Every taxpayer owes', M.fmt.usd(s0.debtPerTaxpayer), 'dn');
  add('Debt added per second', M.fmt.usd(D.rateAt('natDebt', t)), 'dn');
  add('Debt added per day', M.fmt.usd(D.rateAt('natDebt', t) * 86400), 'dn');

  const table = UI.table([
    { key: 'y', label: 'Years out', val: r => '+' + r.y },
    { key: 'debt', label: 'Federal debt', r: true, val: r => r.debt, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)', color: '#b01f10' }, text: M.fmt.cap(r.debt) }) },
    { key: 'gdp', label: 'GDP', r: true, val: r => r.gdp, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)', color: '#166b2c' }, text: M.fmt.cap(r.gdp) }) },
    { key: 'ratio', label: 'Debt / GDP', r: true, val: r => r.ratio, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)', color: '#b01f10' }, text: r.ratio.toFixed(0) + '%' }) },
    { key: 'interest', label: 'Net interest', r: true, val: r => r.interest, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: M.fmt.cap(r.interest) }) },
    { key: 'share', label: 'of receipts', r: true, val: r => r.share, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)', color: r.share > 30 ? '#b01f10' : '#2a2e34' }, text: r.share.toFixed(0) + '%' }) },
    { key: 'perCitizen', label: 'Per citizen', r: true, val: r => r.perCitizen, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: M.fmt.usd(r.perCitizen) }) }
  ], rows, { sort: null });

  UI.modal('Secret Window', [
    el('p', { class: 'note' }, ['Nothing hidden — just the arithmetic the board implies and never prints. These are the board\'s own growth rates extended forward, not a forecast: they say where the current trend goes if nothing changes, which is precisely the assumption that never holds. The value of the exercise is seeing which line breaks first.']),
    el('h4', { style: { margin: '14px 0 6px', fontSize: '13px' }, text: 'If the current rates simply continue' }),
    el('div', { style: { background: '#fff', borderRadius: '4px', overflow: 'hidden' } }, [table]),
    el('h4', { style: { margin: '14px 0 6px', fontSize: '13px' }, text: 'What closing the gap would take' }),
    dl,
    el('div', { class: 'warn', style: { marginTop: '12px' } }, [
      rows[1].share > 30
        ? `The line that breaks first is interest. On this trend it reaches ${rows[1].share.toFixed(0)}% of federal receipts within ten years, which is past the point where the budget has discretionary room at all. Historically a state in that position does not choose between the three options above — it takes the third one, because it is the only one that does not require a vote.`
        : `Interest reaches ${rows[1].share.toFixed(0)}% of receipts within ten years on this trend. That is high but not yet the level at which the fiscal position dictates monetary policy.`
    ]),
    el('div', { style: { marginTop: '11px', display: 'flex', gap: '7px', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn sm', text: 'Ask the council what to own', onclick: () => { UI.closeModal(); UI.go('ai', 'ASK:given the debt trajectory and interest burden how should I be positioned'); } }),
      el('button', { class: 'btn sm', text: 'World comparison', onclick: () => { UI.closeModal(); UI.go('geo', 'world'); } })
    ])
  ]);
}
})();