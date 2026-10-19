// ============================================================================
// TERMINAL — the tool shelf: the mortgage and loan calculator, gold supply and
// demand, precious metals, home sales, auto sales, energy output, the live
// feed panel, sources and about. These are the buttons along the bottom of the
// original board, rebuilt as working pages rather than links.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, X = M.Extras;

let ticking = [];
const live = (label, get, tone) => { const c = el('div', { class: 'cell ' + (tone || 'k') }, [el('div', { class: 'lab', text: label }), el('div', { class: 'val' })]); c.__get = get; ticking.push(c); return c; };
const panel = (title, cells, cols) => {
  const s = el('div', { class: 'db-sec' }, [el('h4', { text: title })]);
  const g = el('div', { class: 'db-cells', style: { gridTemplateColumns: `repeat(${cols || 4},minmax(0,1fr))` } });
  cells.forEach(c => g.appendChild(c));
  s.appendChild(g); return s;
};
const shell = (title, sub, kids) => {
  const w = el('div', { class: 'db' });
  w.appendChild(el('div', { class: 'db-top' }, [el('div', { class: 'db-title' }, [title]), el('div', { class: 'db-sub', text: sub })]));
  w.appendChild(toolbar());
  kids.forEach(k => k && w.appendChild(k));
  return w;
};

const TOOLS = [
  ['debt', 'Debt Board'], ['geo', 'State Clocks'], ['tools/world', 'World Clocks'],
  ['tools/mortgage', 'Mortgage & Loan'], ['tools/gold', 'Gold Supply/Demand'], ['tools/metals', 'Precious Metals'],
  ['tools/homes', 'Home Sales'], ['tools/autos', 'Auto Sales'], ['tools/energy', 'Energy Output'],
  ['tools/feeds', 'Live Feeds'], ['tools/sources', 'Sources'], ['tools/about', 'About']
];
function toolbar() {
  const box = el('div', { class: 'db-tools' });
  for (const [route, label] of TOOLS) {
    const [v, a] = route.split('/');
    const active = (v === 'geo' && UI.current === 'geo' && (a === 'world' ? UI.arg === 'world' : UI.arg !== 'world')) || (v === 'tools' && UI.current === 'tools' && UI.arg === a) || (v === 'debt' && UI.current === 'debt');
    box.appendChild(el('button', { class: 'btn sm' + (active ? ' on' : ''), text: label, onclick: () => { if (v === 'geo') UI.go('geo', 'states'); else if (a === 'world') UI.go('geo', 'world'); else UI.go(v, a); } }));
  }
  return box;
}

// ------------------------------------------------------------------ mortgage
function mortgage(node) {
  const S = M.store.get('mortgage', { price: 420000, down: 84000, rate: 6.6, years: 30, extra: 0, tax: 1.1, ins: 1800, pmi: 1400, income: 85000, debts: 650 });
  const out = el('div', { class: 'db-sec' });
  const form = el('div', { class: 'db-cells', style: { gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' } });
  const fld = (key, label, step) => {
    const i = el('input', { type: 'number', step: step || 'any', value: S[key], style: { width: '100%', background: '#fff', border: '1px solid #b9b09a', color: '#20242a', borderRadius: '4px', padding: '5px 7px', fontFamily: 'var(--f-mono)' }, oninput: e => { S[key] = parseFloat(e.target.value) || 0; M.store.set('mortgage', S); render(); } });
    form.appendChild(el('div', { class: 'cell k' }, [el('div', { class: 'lab', text: label }), i]));
  };
  fld('price', 'Home price / loan amount'); fld('down', 'Down payment'); fld('rate', 'Interest rate %', '0.01');
  fld('years', 'Term, years', '1'); fld('extra', 'Extra monthly payment'); fld('tax', 'Property tax %', '0.01');
  fld('ins', 'Insurance a year'); fld('pmi', 'PMI a year'); fld('income', 'Your annual income'); fld('debts', 'Other monthly debts');

  function render() {
    M.clear(out);
    const r = X.amortise({ principal: S.price, annualRate: S.rate, years: S.years, extra: S.extra, downPayment: S.down, taxRate: S.tax, insurance: S.ins, pmi: S.pmi });
    if (!r) { out.appendChild(el('div', { class: 'db-note', text: 'Enter a price and a term.' })); return; }
    const aff = X.affordability({ income: S.income, debts: S.debts, rate: S.rate, years: S.years, downPayment: S.down, taxRate: S.tax, insurance: S.ins });
    const c = (l, v, t) => el('div', { class: 'cell ' + (t || 'k') }, [el('div', { class: 'lab', text: l }), el('div', { class: 'val', text: v })]);
    out.appendChild(panel('What it costs', [
      c('Principal and Interest', M.fmt.usd2(r.payment), 'b'),
      c('Taxes, Insurance, PMI', M.fmt.usd2(r.escrow), 'k'),
      c('All-In Monthly', M.fmt.usd2(r.allIn), 'r'),
      c('Loan Amount', M.fmt.usd(S.price - S.down), 'k'),
      c('Total Interest Paid', M.fmt.usd(r.totalInterest), 'r'),
      c('Total Paid Over the Term', M.fmt.usd(r.totalPaid), 'r'),
      c('Interest as a Share of Everything Paid', r.interestShare.toFixed(1) + '%', 'y'),
      c('Paid Off In', r.yearsTaken.toFixed(1) + ' years', 'g')
    ]));
    if (S.extra > 0) out.appendChild(panel('What the extra payment buys', [
      c('Interest Saved', M.fmt.usd(r.interestSaved), 'g'),
      c('Time Saved', (r.monthsSaved / 12).toFixed(1) + ' years', 'g'),
      c('Extra Paid In Total', M.fmt.usd(S.extra * r.monthsTaken), 'k'),
      c('Return on the Extra', r.interestSaved && S.extra ? (r.interestSaved / (S.extra * r.monthsTaken) * 100).toFixed(0) + '%' : '—', 'g')
    ]));
    out.appendChild(panel('What a lender would say', [
      c('Most They Would Lend', M.fmt.usd(aff.maxLoan), 'b'),
      c('Price You Could Carry', M.fmt.usd(aff.maxPrice), 'b'),
      c('Monthly Payment Ceiling', M.fmt.usd2(aff.monthlyCap), 'k'),
      c('This Loan Against That Ceiling', aff.monthlyCap ? (r.allIn / aff.monthlyCap * 100).toFixed(0) + '%' : '—', r.allIn > aff.monthlyCap ? 'r' : 'g')
    ]));
    out.appendChild(el('div', { class: 'db-note' }, [
      el('b', { text: r.allIn > aff.monthlyCap ? 'Above what the standard ratios allow. ' : 'Inside the standard ratios. ' }),
      `Lenders size a loan on two tests: housing costs under 28% of gross income and all debt payments under 36%. At ${M.fmt.usd(S.income)} of income with ${M.fmt.usd2(S.debts)} of other monthly debt, that caps the payment at ${M.fmt.usd2(aff.monthlyCap)} a month. This loan runs ${M.fmt.usd2(r.allIn)}. ` +
      `Over the full term the interest alone comes to ${M.fmt.usd(r.totalInterest)}, which is ${r.interestShare.toFixed(0)}% of every dollar that leaves your account — the number the monthly payment hides.`
    ]));
    // The schedule, yearly rather than monthly or it is unreadable.
    const sec = el('div', { class: 'db-sec' }, [el('h4', { text: 'Amortisation, year by year' })]);
    const holder = el('div', { style: { maxHeight: '340px', overflowY: 'auto', background: '#fff', borderRadius: '4px' } });
    const yearly = [];
    for (let y = 0; y * 12 < r.rows.length; y++) {
      const slice = r.rows.slice(y * 12, y * 12 + 12);
      if (!slice.length) break;
      yearly.push({ year: y + 1, paid: slice.reduce((a, x) => a + x.pay, 0), int: slice.reduce((a, x) => a + x.int, 0), prin: slice.reduce((a, x) => a + x.prin, 0), bal: slice[slice.length - 1].bal });
    }
    holder.appendChild(UI.table([
      { key: 'year', label: 'Year', val: r2 => r2.year },
      { key: 'paid', label: 'Paid', r: true, val: r2 => r2.paid, cell: r2 => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: M.fmt.usd(r2.paid) }) },
      { key: 'int', label: 'To interest', r: true, val: r2 => r2.int, cell: r2 => el('span', { style: { fontFamily: 'var(--f-mono)', color: '#b01f10' }, text: M.fmt.usd(r2.int) }) },
      { key: 'prin', label: 'To principal', r: true, val: r2 => r2.prin, cell: r2 => el('span', { style: { fontFamily: 'var(--f-mono)', color: '#166b2c' }, text: M.fmt.usd(r2.prin) }) },
      { key: 'bal', label: 'Balance left', r: true, val: r2 => r2.bal, cell: r2 => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: M.fmt.usd(r2.bal) }) }
    ], yearly, { sort: null }));
    sec.appendChild(holder); out.appendChild(sec);
  }
  node.appendChild(shell('Mortgage & Loan Calculator', 'Exact arithmetic on what you type — nothing here is projected', [
    el('div', { class: 'db-sec' }, [el('h4', { text: 'Your numbers' }), form]),
    out
  ]));
  render();
}

// ------------------------------------------------------------------ gold supply/demand
function gold(node) {
  const g = X.goldAt(Date.now());
  const rows = (list, tone) => list.map(r => live(r.name, () => M.fmt.n(r.t, 0) + ' t', tone));
  const body = [
    panel('Supply, tonnes a year', rows(g.supply, 'g').concat([live('Total Supply', () => M.fmt.n(X.goldAt(Date.now()).supTotal, 0) + ' t', 'g')]), 4),
    panel('Demand, tonnes a year', rows(g.demand, 'b').concat([live('Total Demand', () => M.fmt.n(X.goldAt(Date.now()).demTotal, 0) + ' t', 'b')]), 6),
    panel('The monetary arithmetic', [
      live('Gold Price', () => { const x = X.goldAt(Date.now()); return '$' + M.fmt.n(x.price, 2); }, 'y'),
      live('All Gold Ever Mined', () => M.fmt.n(X.goldAt(Date.now()).stock, 0) + ' t', 'k'),
      live('Stock to Flow · mined only', () => X.goldAt(Date.now()).stockToFlow.toFixed(1) + ' TO 1', 'y'),
      live('New Mined Supply Each Year', () => X.goldAt(Date.now()).newSupplyPct.toFixed(2) + '%', 'g'),
      live('Including Recycled Metal', () => X.goldAt(Date.now()).allSupplyPct.toFixed(2) + '%', 'k'),
      live('Supply Minus Demand', () => { const x = X.goldAt(Date.now()); return (x.balance >= 0 ? '+' : '') + M.fmt.n(x.balance, 0) + ' t'; }, 'k'),
      live('Value of All Gold Ever Mined', () => M.fmt.bigUsd(X.goldAt(Date.now()).allGoldValue), 'g'),
      live('US Official Reserve', () => M.fmt.n(X.gold.reservesUS, 1) + ' t', 'k'),
      live('Value of the US Reserve', () => M.fmt.bigUsd(X.goldAt(Date.now()).usReserveValue), 'g'),
      live('All Gold Against the Federal Debt', () => X.goldAt(Date.now()).debtCover.toFixed(1) + '%', 'r')
    ], 4)
  ];
  node.appendChild(shell('Gold Supply & Demand', 'Tonnes a year, grown from the 2024–25 published balance', body.concat([
    el('div', { class: 'db-note' }, [el('b', { text: 'Why stock-to-flow is the whole argument. ' }), X.gold.note + ' That is the comparison the board on the previous page is really making when it prints a dollar-to-gold ratio: one of the two quantities can be increased by decision, and the other cannot.']),
    el('div', { class: 'db-note' }, [el('b', { text: 'Where the change has come from. ' }), 'Central bank buying has run above a thousand tonnes a year since 2022, roughly a quarter of all demand, concentrated outside the dollar bloc. That is not jewellery demand and it is not price-sensitive in the usual way — it is reserve managers reducing exposure to somebody else’s liability.'])
  ])));
}

// ------------------------------------------------------------------ metals
function metals(node) {
  const cells = X.metals.map(([name, sym, unit]) => live(name + ' · per ' + unit, () => {
    const inst = M.Universe.get(sym);
    return inst ? '$' + M.fmt.n(inst.px, inst.px > 100 ? 2 : 3) : '—';
  }, 'y'));
  const ratios = [
    live('Gold / Silver Ratio', () => X.metalsAt(Date.now()).goldSilver.toFixed(1) + ' TO 1', 'k'),
    live('A Dollar in Gold', () => X.metalsAt(Date.now()).dollarInGold.toFixed(6) + ' oz', 'k'),
    live('A Dollar in Silver', () => X.metalsAt(Date.now()).dollarInSilver.toFixed(5) + ' oz', 'k'),
    live('Gold vs Its 1913 Price', () => X.metalsAt(Date.now()).goldPurchasing.toFixed(1) + ' X', 'r'),
    live('Silver vs Its 1913 Price', () => X.metalsAt(Date.now()).silverPurchasing.toFixed(1) + ' X', 'r'),
    live('M2 per Ounce of US Reserve', () => M.fmt.bigUsd(X.metalsAt(Date.now()).m2PerOunce), 'r'),
    live('Federal Debt per Ounce of Reserve', () => M.fmt.bigUsd(X.metalsAt(Date.now()).debtPerOunce), 'r'),
    live('Price Change Today', () => { const i = M.Universe.get('GC'); return i ? M.fmt.pct(i.chgPct) : '—'; }, 'k')
  ];
  node.appendChild(shell('Gold & Precious Metals', 'Prices from the live feed where one is connected', [
    panel('Spot', cells, 4),
    panel('What that implies', ratios, 4),
    el('div', { class: 'db-note', id: 'metalSrc' }),
    el('div', { class: 'db-note' }, [el('b', { text: 'The 1913 comparison. ' }), 'Gold was $20.67 an ounce and silver $1.29 when the Federal Reserve Act passed. The multiples above are not the metals becoming more valuable — they are the unit they are priced in becoming less so. That is the same statement the debt board makes with its dollar-to-gold ratio, from the other direction.'])
  ]));
}

// ------------------------------------------------------------------ homes
function homes(node) {
  const g = () => X.housingAt(Date.now());
  node.appendChild(shell('Home Sales', 'Annual rates, grown from the 2024–25 published levels', [
    panel('Sales and construction', [
      live('Existing Home Sales', () => M.fmt.big(g().existing), 'b'),
      live('New Home Sales', () => M.fmt.big(g().newSales), 'b'),
      live('Housing Starts', () => M.fmt.big(g().starts), 'g'),
      live('Building Permits', () => M.fmt.big(g().permits), 'g'),
      live('Completions', () => M.fmt.big(g().completions), 'g'),
      live('Existing Homes for Sale', () => M.fmt.big(g().inventoryExisting), 'k'),
      live('New Homes for Sale', () => M.fmt.big(g().inventoryNew), 'k'),
      live('Months of Supply, Existing', () => g().monthsSupplyExisting.toFixed(1), 'k')
    ], 4),
    panel('Prices and affordability', [
      live('Median Existing Home', () => M.fmt.usd(g().medianExisting), 'r'),
      live('Median New Home', () => M.fmt.usd(g().medianNew), 'r'),
      live('Average New Home', () => M.fmt.usd(g().avgNew), 'r'),
      live('Median Asking Rent', () => M.fmt.usd(g().rentMedian), 'k'),
      live('30-Year Mortgage Rate', () => g().mortgageRate.toFixed(2) + '%', 'y'),
      live('Payment on the Median Home', () => M.fmt.usd(g().medianPayment), 'r'),
      live('Income Needed to Carry It', () => M.fmt.usd(g().incomeNeeded), 'r'),
      live('Median Household Income', () => M.fmt.usd(M.Debt.valueAt('incomeNow', Date.now())), 'g'),
      live('The Gap', () => M.fmt.usd(g().affordabilityGap), 'r'),
      live('Price to Income', () => g().priceToIncome.toFixed(2) + ' X', 'r'),
      live('Payment as a Share of Income', () => g().paymentShareOfIncome.toFixed(1) + '%', 'r'),
      live('Buy vs Rent', () => g().rentVsBuy.toFixed(2) + ' X', 'k')
    ], 4),
    panel('The stock behind it', [
      live('Total Mortgage Debt', () => M.fmt.bigUsd(g().mortgageDebt), 'r'),
      live('Homeownership Rate', () => g().homeownership.toFixed(1) + '%', 'k'),
      live('Rental Vacancy Rate', () => g().vacancy.toFixed(1) + '%', 'k'),
      live('Foreclosure Rate', () => g().foreclosureRate.toFixed(2) + '%', 'r')
    ], 4),
    el('div', { class: 'db-note', id: 'homeNote' })
  ]));
}

// ------------------------------------------------------------------ autos
function autos(node) {
  const g = () => X.autoAt(Date.now());
  node.appendChild(shell('Auto Sales', 'Annual rates and loan averages, grown from the 2024–25 published levels', [
    panel('The market', [
      live('Light Vehicle Sales, Annual Rate', () => M.fmt.big(g().saar), 'b'),
      live('Average New Vehicle Price', () => M.fmt.usd(g().newAvgPrice), 'r'),
      live('Average Used Vehicle Price', () => M.fmt.usd(g().usedAvgPrice), 'k'),
      live('Battery Electric Share', () => g().evShare.toFixed(1) + '%', 'g'),
      live('Average Age of the Fleet', () => g().fleetAge.toFixed(1) + ' years', 'k'),
      live('Average New Loan', () => M.fmt.usd(g().avgLoanNew), 'r'),
      live('Average Used Loan', () => M.fmt.usd(g().avgLoanUsed), 'k'),
      live('Average New Loan Term', () => g().avgTermNew.toFixed(1) + ' months', 'y')
    ], 4),
    panel('What it costs to carry', [
      live('Average New Payment', () => M.fmt.usd(g().avgPaymentNew), 'r'),
      live('Average Used Payment', () => M.fmt.usd(g().avgPaymentUsed), 'k'),
      live('Average New Loan Rate', () => g().avgRateNew.toFixed(2) + '%', 'y'),
      live('Average Used Loan Rate', () => g().avgRateUsed.toFixed(2) + '%', 'r'),
      live('Payment as a Share of Income', () => g().paymentShareOfIncome.toFixed(1) + '%', 'r'),
      live('Price in Weeks of Median Income', () => g().weeksOfIncome.toFixed(1) + ' weeks', 'r'),
      live('Price to Annual Income', () => g().priceToIncome.toFixed(2) + ' X', 'r'),
      live('Share of Trade-Ins Underwater', () => g().negativeEquity.toFixed(1) + '%', 'r')
    ], 4),
    panel('The credit behind it', [
      live('Total Auto Loan Debt', () => M.fmt.bigUsd(g().autoDebt), 'r'),
      live('Auto Debt per Citizen', () => M.fmt.usd(g().autoDebtPerCitizen), 'r'),
      live('90-Day Delinquency Rate', () => g().delinquency.toFixed(2) + '%', 'r'),
      live('Average Transaction vs 2000', () => (g().newAvgPrice / 22524).toFixed(2) + ' X', 'r')
    ], 4),
    el('div', { class: 'db-note' }, [el('b', { text: 'The term is the tell. ' }), 'When the average new loan stretches past five and a half years and a quarter of trade-ins are underwater, the market is clearing on monthly payment rather than on price. That is the same mechanism that showed up in housing before 2007 — affordability maintained by lengthening the loan rather than by lowering the price.'])
  ]));
}

// ------------------------------------------------------------------ energy
function energy(node) {
  const g = () => X.energyAt(Date.now());
  const e0 = g();
  const prodCells = e0.production.map((p, i) => live(p.name, () => g().production[i].q.toFixed(1) + ' quad', 'g'));
  const consCells = e0.consumption.map((p, i) => live(p.name, () => g().consumption[i].q.toFixed(1) + ' quad', 'b'));
  const mixCells = e0.mix.map((m, i) => live(m.name, () => g().mix[i].pct.toFixed(1) + '%', /Coal|gas/i.test(m.name) ? 'k' : 'g'));
  node.appendChild(shell('Energy Output', 'Quadrillion BTU a year, grown from the 2024–25 published balance', [
    panel('Production', prodCells.concat([live('Total Production', () => g().productionTotal.toFixed(1) + ' quad', 'g')]), 6),
    panel('Consumption', consCells.concat([live('Total Consumption', () => g().consumptionTotal.toFixed(1) + ' quad', 'b')]), 6),
    panel('Electricity generation mix', mixCells, 7),
    panel('The position', [
      live('Net Energy Position', () => { const x = g(); return (x.netPosition >= 0 ? '+' : '') + x.netPosition.toFixed(1) + ' quad'; }, 'g'),
      live('Energy Independent', () => g().independent ? 'YES' : 'NO', 'g'),
      live('Electricity Generated', () => M.fmt.n(g().generationTWh, 0) + ' TWh', 'k'),
      live('Per Person', () => g().perCapitaMWh.toFixed(1) + ' MWh', 'k'),
      live('Fossil Share of Generation', () => g().fossilShare.toFixed(1) + '%', 'k'),
      live('Carbon-Free Share', () => g().carbonFreeShare.toFixed(1) + '%', 'g'),
      live('Data Centre Share of Electricity', () => g().dataCentre.toFixed(1) + '%', 'y'),
      live('Imported Oil, Annual Value', () => M.fmt.bigUsd(g().importedOilValue), 'r'),
      live('WTI Crude', () => '$' + g().oilPrice.toFixed(2), 'y'),
      live('Natural Gas', () => '$' + g().gasPrice.toFixed(3), 'y')
    ], 5),
    el('div', { class: 'db-note' }, [el('b', { text: 'The line to watch is the data centre share. ' }), 'It is small, it is compounding at roughly a fifth a year, and it is the reason utilities and copper keep appearing in the same sentence as semiconductors. Generation capacity takes a decade to build and the demand is arriving in three years.'])
  ]));
}

// ------------------------------------------------------------------ feeds
function feeds(node) {
  const host = el('div');
  node.appendChild(shell('Live Feeds', 'What is actually connected, right now', [host]));
  const render = () => {
    M.clear(host);
    const s = M.RT.summary();
    const pct = s.total ? s.live / s.total * 100 : 0;
    host.appendChild(panel('Coverage', [
      el('div', { class: 'cell ' + (s.live ? 'g' : 'r') }, [el('div', { class: 'lab', text: 'Instruments on a live feed' }), el('div', { class: 'val', text: s.live + ' of ' + s.total })]),
      el('div', { class: 'cell k' }, [el('div', { class: 'lab', text: 'Percent live' }), el('div', { class: 'val', text: pct.toFixed(1) + '%' })]),
      el('div', { class: 'cell ' + (s.streams ? 'g' : 'k') }, [el('div', { class: 'lab', text: 'Open streams' }), el('div', { class: 'val', text: String(s.streams) })]),
      el('div', { class: 'cell k' }, [el('div', { class: 'lab', text: 'Ticks a second' }), el('div', { class: 'val', text: s.tickRate.toFixed(1) })])
    ], 4));

    const sockSec = el('div', { class: 'db-sec' }, [el('h4', { text: 'Streams' })]);
    for (const so of s.sockets) {
      sockSec.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '9px', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #e0d9c6' } }, [
        el('div', {}, [el('b', { style: { fontSize: '13px' }, text: so.name }), el('div', { style: { fontSize: '11.5px', color: '#6d6758' }, text: so.detail || '—' })]),
        el('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#6d6758' }, text: so.symbols && so.symbols.size ? so.symbols.size + ' symbols' : '' }),
        el('span', { class: 'pill ' + (so.status === 'open' ? 'live' : so.status === 'error' ? 'err' : 'sim'), text: so.status.toUpperCase() })
      ]));
    }
    host.appendChild(sockSec);

    const pollSec = el('div', { class: 'db-sec' }, [el('h4', { text: 'Polled feeds' })]);
    for (const po of s.pollers) {
      pollSec.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '9px', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #e0d9c6' } }, [
        el('div', {}, [el('b', { style: { fontSize: '13px' }, text: po.name }), el('div', { style: { fontSize: '11.5px', color: '#6d6758' }, text: po.detail || '—' })]),
        el('span', { style: { fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#6d6758' }, text: po.last ? 'last ' + M.fmt.ago(po.last) : 'never' }),
        el('span', { class: 'pill ' + (po.status === 'live' ? 'live' : po.status === 'error' ? 'err' : 'sim'), text: po.status.toUpperCase() })
      ]));
    }
    host.appendChild(pollSec);

    // Per-instrument attribution: who priced what, and how long ago.
    const liveList = M.Universe.list.filter(i => M.RT.owned(i));
    const liveSec = el('div', { class: 'db-sec' }, [el('h4', { text: 'Every instrument on a real feed' })]);
    const holder = el('div', { style: { maxHeight: '340px', overflowY: 'auto', background: '#fff', borderRadius: '4px' } });
    holder.appendChild(UI.table([
      { key: 'sym', label: 'Symbol', cell: r => el('b', { style: { fontFamily: 'var(--f-mono)' }, text: r.sym }) },
      { key: 'name', label: 'Name', mono: false, val: r => r.name },
      { key: 'srcName', label: 'Priced by', mono: false, val: r => r.srcName },
      { key: 'srcKind', label: 'How', mono: false, cell: r => el('span', { class: 'tag', text: r.srcKind === 'tick' ? 'streamed' : 'polled' }) },
      { key: 'age', label: 'Last print', r: true, val: r => M.RT.ageOf(r), cell: r => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: (M.RT.ageOf(r) / 1000).toFixed(1) + 's ago' }) },
      { key: 'px', label: 'Price', r: true, val: r => r.px, cell: r => el('span', { style: { fontFamily: 'var(--f-mono)' }, text: M.fmt.px(r.px) }) }
    ], liveList, { sort: 'age', empty: 'Nothing is on a live feed right now. Everything you see is the simulation.', onRow: r => UI.openSymbol(r.sym) }));
    liveSec.appendChild(holder);
    host.appendChild(liveSec);

    host.appendChild(el('div', { class: 'db-note' }, [
      el('b', { text: s.live ? 'What this page is telling you. ' : 'Nothing is live. ' }),
      s.live
        ? `${s.live} of ${s.total} instruments are being priced by a real provider right now; the rest are on the simulation and badged SIM wherever they appear. A streamed symbol updates on every print. A polled one updates on its interval. If a feed stops arriving, the symbol goes stale within ${(M.RT.STALE_TICK / 1000).toFixed(0)} seconds and visibly hands back to the simulation rather than freezing on a dead price.`
        : 'Every price on the screen is coming from the simulation. The crypto exchanges connect without a key, so if they are failing it is usually the network or a regional block rather than a missing key. US equities need a free key — add one on the Sources page and this list fills in.'
    ]));
    host.appendChild(el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } }, [
      el('button', { class: 'btn', text: 'Reconnect everything', onclick: () => { M.RT.refresh(); M.toast('Reconnecting every feed…'); } }),
      el('button', { class: 'btn', text: 'Add provider keys', onclick: () => UI.go('sources') })
    ]));
  };
  render();
  const un = M.on('rt:status', M.throttle(render, 1500));
  node.__cleanup = un;
  setInterval(() => { if (UI.current === 'tools' && UI.arg === 'feeds') render(); }, 5000);
}

// ------------------------------------------------------------------ about
function about(node) {
  const p = (h, t) => el('div', { class: 'db-note' }, [el('b', { text: h + ' ' }), t]);
  node.appendChild(shell('About', 'What this is, and what it is not', [
    p('What it is.', 'Three things on one page: a national debt board, a multi-asset trading terminal, and an analyst council that reasons from 132 books on investing and cites the one it used for every point it makes. It is a single static page with no server behind it. Everything you type stays in this browser.'),
    p('What is real.', 'The federal debt counter re-anchors from the US Treasury’s own API with no key. Crypto streams tick-by-tick from Binance, Coinbase and Kraken, also with no key. With a free FRED key most of the debt board and the entire Treasury yield curve become real measured series rather than projections. With a free Finnhub or Alpaca key, US equities stream real trades. The Live Feeds page shows exactly which of those is working right now.'),
    p('What is projected.', 'Every debt-board counter without a live anchor is a published aggregate grown forward at an assumed rate. That is how debt clocks work — nothing ticks in real time at the source, because the underlying statistics are published monthly or quarterly. The board says which cells are live and which are not, and the time machine lets you see the projection at any date.'),
    p('What is simulated.', 'With no provider connected, prices come from a three-factor return model under a four-state regime process. The depth ladder and the trade tape are always simulated unless a stream is supplying prints: real level-2 data is a licensed product with no free tier. Every simulated number is badged SIM.'),
    p('What is never simulated.', 'The analyst council. Graham’s criteria, the Piotroski F-score, the Altman Z, the Beneish flags, CAN SLIM, the magic formula, the DCF and reverse DCF, Kelly sizing — all real arithmetic on whatever numbers it is given. Point it at real data and it produces a real analysis.'),
    p('What it is not.', 'It is not a brokerage, it is not advice, and no order placed here reaches a market. Nothing on this page should be the reason you buy or sell anything.')
  ]));
}

UI.register('tools', {
  label: 'Tools',
  hidden: true,
  mount(node, arg) {
    ticking = [];
    const page = { mortgage, gold, metals, homes, autos, energy, feeds, about }[arg] || mortgage;
    page(node);
    paint();
  },
  update: M.throttle(() => paint(), 500)
});

function paint() {
  for (const c of ticking) { if (!c.__get) continue; try { M.setText(c.querySelector('.val'), c.__get()); } catch (e) {} }
  const ms = M.$('#metalSrc');
  if (ms) {
    const rows = X.metalsAt(Date.now()).rows;
    const liveOnes = rows.filter(r => r.live);
    M.setText(ms, liveOnes.length
      ? 'Live from ' + [...new Set(liveOnes.map(r => r.srcName))].join(', ') + ' for ' + liveOnes.map(r => r.name).join(', ') + '. The rest are on the simulation.'
      : 'No metals feed is connected, so these prices are from the simulation. Connect a provider on the Sources page and this line changes.');
  }
  const hn = M.$('#homeNote');
  if (hn) {
    const g = X.housingAt(Date.now());
    M.setText(hn, `At ${g.mortgageRate.toFixed(2)}% on the median existing home, the monthly payment including taxes and insurance is ${M.fmt.usd(g.medianPayment)}. Carrying that inside the usual 28% rule needs ${M.fmt.usd(g.incomeNeeded)} of household income against a median of ${M.fmt.usd(M.Debt.valueAt('incomeNow', Date.now()))} — a gap of ${M.fmt.usd(g.affordabilityGap)}. ${g.mortgageRateLive ? 'The mortgage rate here is the live FRED series.' : 'The mortgage rate here is an assumption; add a FRED key on the Sources page to use the measured one.'}`);
  }
}
})();
