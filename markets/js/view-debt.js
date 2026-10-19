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
  const node = el('div', { class: 'cell ' + (cls || 'k') + (span ? '' : ''), style: span ? { gridColumn: 'span ' + span } : null }, [
    el('div', { class: 'lab' }, [meta ? meta.label : id, meta && meta.live ? el('span', { class: 'live', text: ' · LIVE' }) : null]),
    el('div', { class: 'val', text: '—' })
  ]);
  node.__id = id;
  cells.push(node);
  return node;
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
    el('span', { class: 'lab', text: 'Time machine' }), slider, yearOut,
    el('button', { class: 'btn sm', text: 'Now', onclick: () => { tm.on = false; slider.value = new Date().getFullYear(); M.setText(yearOut, ''); paint(); } }),
    el('button', { class: 'btn sm', text: 'Refresh live Treasury figure', onclick: () => { M.Providers.refresh(); M.toast('Asking the Treasury API for Debt to the Penny…'); } }),
    el('button', { class: 'btn sm', text: 'What this means for markets', onclick: explain })
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
    lastVals[id] = v;
  }
  const stamp = M.$('#dbStamp');
  if (stamp) {
    const a = D.anchor.natDebt;
    M.setText(stamp, (tm.on ? 'Projected to mid-' + tm.year : 'Live projection · ' + M.fmt.date(t) + ' ' + M.fmt.time(t))
      + ' · ' + (a ? 'federal debt anchored to Treasury ' + new Date(a.t).toISOString().slice(0, 10) : 'federal debt on the published snapshot of ' + new Date(D.EPOCH).toISOString().slice(0, 10))
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
})();
