// ============================================================================
// TERMINAL — the state and world debt boards, reached from the two buttons at
// the top of the federal board. Both tick on the same engine and both follow
// the time machine.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI, G = M.Geo;

let mode = 'states', cells = [], detailCode = null;

function tools() {
  const box = el('div', { class: 'db-tools' });
  box.appendChild(UI.seg([['states', 'State Debt Clocks'], ['world', 'World Debt Clocks']], mode, v => { mode = v; detailCode = null; UI.go('geo', v); }));
  box.appendChild(el('button', { class: 'btn sm', text: '← Federal board', onclick: () => UI.go('debt') }));
  box.appendChild(el('span', { class: 'lab', text: mode === 'states' ? '51 jurisdictions' : G.countries.length + ' countries' }));
  return box;
}

// ------------------------------------------------------------------ states
function statesView(node) {
  const t = Date.now();
  const rows = G.allStatesAt(t);
  const wrap = el('div', { class: 'db' });
  wrap.appendChild(el('div', { class: 'db-top' }, [
    el('div', { class: 'db-title' }, ['State ', el('span', { text: 'Debt Clocks' })]),
    el('div', { class: 'db-sub', id: 'geoStamp' })
  ]));
  wrap.appendChild(tools());
  wrap.appendChild(el('div', { class: 'db-note' }, [
    el('b', { text: 'State and local debt only. ' }),
    'The federal debt each citizen carries is shown separately, and the combined figure is what an individual is actually on the hook for. Bases are published state aggregates for the 2024–25 fiscal year, grown forward at each state\'s own trend — projections, not a live feed. Pension figures are unfunded liabilities, which is where the real variance between states is.'
  ]));

  // Totals across every state, which is a number the federal board never shows.
  const tot = rows.reduce((a, r) => ({
    population: a.population + r.population, stateDebt: a.stateDebt + r.stateDebt,
    localDebt: a.localDebt + r.localDebt, pension: a.pension + r.pension,
    gsp: a.gsp + r.gsp, spending: a.spending + r.spending, revenue: a.revenue + r.revenue
  }), { population: 0, stateDebt: 0, localDebt: 0, pension: 0, gsp: 0, spending: 0, revenue: 0 });

  const sec = el('div', { class: 'db-sec' }, [el('h4', { text: 'All 50 states and DC combined' })]);
  const grid = el('div', { class: 'db-cells', style: { gridTemplateColumns: 'repeat(4,minmax(0,1fr))' } });
  const put = (label, v, tone, fmt) => {
    const c = el('div', { class: 'cell ' + (tone || 'k') }, [el('div', { class: 'lab', text: label }), el('div', { class: 'val' })]);
    c.__get = fmt || (() => M.fmt.bigUsd(v));
    cells.push(c); grid.appendChild(c); return c;
  };
  put('Total State Debt', 0, 'r', () => M.fmt.bigUsd(sum('stateDebt')));
  put('Total Local Debt', 0, 'r', () => M.fmt.bigUsd(sum('localDebt')));
  put('Unfunded Pension Liability', 0, 'r', () => M.fmt.bigUsd(sum('pension')));
  put('Combined State + Local + Pension', 0, 'r', () => M.fmt.bigUsd(sum('stateDebt') + sum('localDebt') + sum('pension')));
  put('Total State Revenue', 0, 'g', () => M.fmt.bigUsd(sum('revenue')));
  put('Total State Spending', 0, 'k', () => M.fmt.bigUsd(sum('spending')));
  put('Combined Gross State Product', 0, 'g', () => M.fmt.bigUsd(sum('gsp')));
  put('State + Local Debt per Citizen', 0, 'r', () => M.fmt.bigUsd((sum('stateDebt') + sum('localDebt')) / sum('population')));
  sec.appendChild(grid); wrap.appendChild(sec);

  const tableSec = el('div', { class: 'db-sec' }, [el('h4', { text: 'By state — click a row for the full panel' })]);
  const holder = el('div', { style: { maxHeight: '62vh', overflowY: 'auto', background: '#fff', borderRadius: '4px' } });
  tableSec.appendChild(holder);
  wrap.appendChild(tableSec);
  node.appendChild(wrap);

  holder.appendChild(lightTable([
    { key: 'code', label: 'State', cell: r => el('b', { text: r.code }) },
    { key: 'name', label: '', mono: false, val: r => r.name },
    { key: 'population', label: 'Population', r: true, val: r => r.population, cell: r => txt(M.fmt.big(r.population)) },
    { key: 'stateDebt', label: 'State debt', r: true, val: r => r.stateDebt, cell: r => txt(M.fmt.cap(r.stateDebt), 'r') },
    { key: 'localDebt', label: 'Local debt', r: true, val: r => r.localDebt, cell: r => txt(M.fmt.cap(r.localDebt), 'r') },
    { key: 'pension', label: 'Unfunded pension', r: true, val: r => r.pension, cell: r => txt(M.fmt.cap(r.pension), 'r') },
    { key: 'debtPerCitizen', label: 'Debt / citizen', r: true, val: r => r.debtPerCitizen, cell: r => txt(M.fmt.usd(r.debtPerCitizen), 'r') },
    { key: 'allInPerCitizen', label: 'All-in / citizen', r: true, val: r => r.allInPerCitizen, cell: r => txt(M.fmt.usd(r.allInPerCitizen), 'r') },
    { key: 'debtToGsp', label: 'Debt / GSP', r: true, val: r => r.debtToGsp, cell: r => txt(r.debtToGsp.toFixed(1) + '%') },
    { key: 'balance', label: 'Surplus', r: true, val: r => r.balance, cell: r => txt(M.fmt.cap(r.balance), r.balance >= 0 ? 'g' : 'r') },
    { key: 'income', label: 'Median income', r: true, val: r => r.income, cell: r => txt(M.fmt.usd(r.income)) },
    { key: 'home', label: 'Median home', r: true, val: r => r.home, cell: r => txt(M.fmt.usd(r.home)) },
    { key: 'homeToIncome', label: 'Home / income', r: true, val: r => r.homeToIncome, cell: r => txt(r.homeToIncome.toFixed(1) + '×', r.homeToIncome > 6 ? 'r' : '') },
    { key: 'unemployment', label: 'Unemployment', r: true, val: r => r.unemployment, cell: r => txt(r.unemployment.toFixed(1) + '%') }
  ], rows, { sort: 'stateDebt', onRow: r => stateDetail(r.code) }));

  function sum(k) { return G.allStatesAt(Date.now()).reduce((a, r) => a + r[k], 0); }
}

function txt(s, tone) { return el('span', { style: { fontFamily: 'var(--f-mono)', color: tone === 'r' ? '#b01f10' : tone === 'g' ? '#166b2c' : '#2a2e34' }, text: s }); }

// A light-skinned table for the board's beige panels.
function lightTable(cols, rows, opts) {
  const t = UI.table(cols, rows, opts);
  t.classList.add('lt');
  return t;
}

function stateDetail(code) {
  const v = G.stateAt(code, Date.now());
  const st = G.byCode[code];
  const dl = el('dl', { class: 'kv' });
  const add = (k, val, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: val })); };
  add('Population', M.fmt.big(v.population));
  add('State debt', M.fmt.bigUsd(v.stateDebt), 'dn');
  add('Local debt', M.fmt.bigUsd(v.localDebt), 'dn');
  add('Unfunded pension liability', M.fmt.bigUsd(v.pension), 'dn');
  add('Total state + local', M.fmt.bigUsd(v.totalDebt), 'dn');
  add('Debt per citizen', M.fmt.usd(v.debtPerCitizen), 'dn');
  add('Federal debt per citizen', M.fmt.usd(v.federalShare), 'dn');
  add('Every level combined, per citizen', M.fmt.usd(v.allInPerCitizen), 'dn');
  add('Gross state product', M.fmt.bigUsd(v.gsp), 'up');
  add('GSP per capita', M.fmt.usd(v.gspPerCapita));
  add('Debt to GSP', v.debtToGsp.toFixed(1) + '%');
  add('State revenue', M.fmt.bigUsd(v.revenue), 'up');
  add('State spending', M.fmt.bigUsd(v.spending));
  add('Balance', M.fmt.cap(v.balance), v.balance >= 0 ? 'up' : 'dn');
  add('Revenue per citizen', M.fmt.usd(v.revPerCitizen));
  add('Spending per citizen', M.fmt.usd(v.spendPerCitizen));
  add('Median household income', M.fmt.usd(v.income));
  add('Median home price', M.fmt.usd(v.home));
  add('Home to income', v.homeToIncome.toFixed(2) + '×', v.homeToIncome > 6 ? 'dn' : '');
  add('Unemployment', v.unemployment.toFixed(1) + '%');
  const all = G.allStatesAt(Date.now());
  const rank = (k, desc) => all.slice().sort((a, b) => desc ? b[k] - a[k] : a[k] - b[k]).findIndex(x => x.code === code) + 1;
  UI.modal(st.name, [
    el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } }, [
      el('span', { class: 'pill sim', text: 'PROJECTION' }),
      el('span', { class: 'pill', text: '#' + rank('totalDebt', true) + ' by total debt' }),
      el('span', { class: 'pill', text: '#' + rank('debtPerCitizen', true) + ' by debt per citizen' }),
      el('span', { class: 'pill', text: '#' + rank('gspPerCapita', true) + ' by output per head' })
    ]),
    dl,
    el('p', { class: 'note', style: { marginTop: '10px' }, text: v.balance < 0
      ? `${st.name} is running an operating gap of ${M.fmt.cap(-v.balance)} a year on this projection. Unlike the federal government it cannot print, so the gap closes through taxes, service cuts or borrowing against the next generation of residents.`
      : `${st.name} is running an operating surplus of ${M.fmt.cap(v.balance)} on this projection, which is the position most states are constitutionally required to reach.` }),
    el('p', { class: 'note', style: { marginTop: '6px' }, text: `Unfunded pension liability works out at ${M.fmt.usd(v.pensionPerCitizen)} per resident — a promise already made, not yet funded, and senior in practice to almost everything else in the budget.` })
  ]);
}

// ------------------------------------------------------------------ world
function worldView(node) {
  const t = Date.now();
  const rows = G.allCountriesAt(t);
  const wrap = el('div', { class: 'db' });
  wrap.appendChild(el('div', { class: 'db-top' }, [
    el('div', { class: 'db-title' }, ['World ', el('span', { text: 'Debt Clocks' })]),
    el('div', { class: 'db-sub', id: 'geoStamp' })
  ]));
  wrap.appendChild(tools());
  wrap.appendChild(el('div', { class: 'db-note' }, [
    el('b', { text: 'Gross general government debt, in local currency and converted at the rate shown. ' }),
    'The US row is taken from the federal board, so it carries the live Treasury anchor when that connects. Everything else is a published aggregate for 2024–25 grown forward. Watch the last two columns: debt that compounds faster than output has a doubling time, and that is the number that decides whether a debt load is a problem or merely a large number.'
  ]));

  const world = rows.reduce((a, r) => ({ debt: a.debt + r.debtUSD, gdp: a.gdp + r.gdpUSD, pop: a.pop + r.population }), { debt: 0, gdp: 0, pop: 0 });
  const sec = el('div', { class: 'db-sec' }, [el('h4', { text: 'These ' + rows.length + ' economies combined' })]);
  const grid = el('div', { class: 'db-cells', style: { gridTemplateColumns: 'repeat(4,minmax(0,1fr))' } });
  const put = (label, tone, get) => { const c = el('div', { class: 'cell ' + tone }, [el('div', { class: 'lab', text: label }), el('div', { class: 'val' })]); c.__get = get; cells.push(c); grid.appendChild(c); };
  put('Combined Government Debt', 'r', () => M.fmt.bigUsd(tot().debt));
  put('Combined GDP', 'g', () => M.fmt.bigUsd(tot().gdp));
  put('Combined Debt to GDP', 'r', () => (tot().debt / tot().gdp * 100).toFixed(2) + '%');
  put('Population Covered', 'k', () => M.fmt.big(tot().pop));
  put('Debt per Person', 'r', () => M.fmt.bigUsd(tot().debt / tot().pop));
  put('US Share of the Total', 'b', () => { const us = G.countryAt('US', Date.now()); return (us.debtUSD / tot().debt * 100).toFixed(2) + '%'; });
  put('Economies Above 100% Debt/GDP', 'y', () => String(G.allCountriesAt(Date.now()).filter(r => r.debtToGdp > 100).length));
  put('Economies With Debt Outgrowing Output', 'r', () => String(G.allCountriesAt(Date.now()).filter(r => r.ratioTrend > 0).length));
  sec.appendChild(grid); wrap.appendChild(sec);
  function tot() { const r = G.allCountriesAt(Date.now()); return r.reduce((a, x) => ({ debt: a.debt + x.debtUSD, gdp: a.gdp + x.gdpUSD, pop: a.pop + x.population }), { debt: 0, gdp: 0, pop: 0 }); }

  const tableSec = el('div', { class: 'db-sec' }, [el('h4', { text: 'By country — click a row for the full panel' })]);
  const holder = el('div', { style: { maxHeight: '62vh', overflowY: 'auto', background: '#fff', borderRadius: '4px' } });
  tableSec.appendChild(holder); wrap.appendChild(tableSec);
  node.appendChild(wrap);

  holder.appendChild(lightTable([
    { key: 'code', label: '', cell: r => el('b', { text: r.code }) },
    { key: 'name', label: 'Country', mono: false, val: r => r.name },
    { key: 'debtUSD', label: 'Govt debt (USD)', r: true, val: r => r.debtUSD, cell: r => txt(M.fmt.cap(r.debtUSD), 'r') },
    { key: 'debt', label: 'In local currency', r: true, val: r => r.debt, cell: r => txt(M.fmt.qty(r.debt) + ' ' + r.ccy) },
    { key: 'debtToGdp', label: 'Debt / GDP', r: true, val: r => r.debtToGdp, cell: r => txt(r.debtToGdp.toFixed(1) + '%', r.debtToGdp > 100 ? 'r' : '') },
    { key: 'debtPerCitizenUSD', label: 'Per citizen', r: true, val: r => r.debtPerCitizenUSD, cell: r => txt(M.fmt.usd(r.debtPerCitizenUSD), 'r') },
    { key: 'gdpPerCapita', label: 'GDP / capita', r: true, val: r => r.gdpPerCapita, cell: r => txt(M.fmt.usd(r.gdpPerCapita), 'g') },
    { key: 'deficitPct', label: 'Deficit % GDP', r: true, val: r => r.deficitPct, cell: r => txt(r.deficitPct.toFixed(1) + '%', r.deficitPct < -5 ? 'r' : r.deficitPct > 0 ? 'g' : '') },
    { key: 'interestShare', label: 'Interest / revenue', r: true, val: r => r.interestShare, cell: r => txt(r.interestShare.toFixed(1) + '%', r.interestShare > 20 ? 'r' : '') },
    { key: 'y10', label: '10-year', r: true, val: r => r.y10, cell: r => txt(r.y10 ? r.y10.toFixed(2) + '%' : '—') },
    { key: 'inflation', label: 'Inflation', r: true, val: r => r.inflation, cell: r => txt(r.inflation.toFixed(1) + '%', r.inflation > 10 ? 'r' : '') },
    { key: 'realYield', label: 'Real yield', r: true, val: r => r.realYield == null ? -99 : r.realYield, cell: r => txt(r.realYield == null ? '—' : r.realYield.toFixed(1) + '%', r.realYield < 0 ? 'r' : 'g') },
    { key: 'ratioTrend', label: 'Ratio trend', r: true, val: r => r.ratioTrend, cell: r => txt((r.ratioTrend >= 0 ? '+' : '') + r.ratioTrend.toFixed(1) + ' pts/yr', r.ratioTrend > 0 ? 'r' : 'g') },
    { key: 'doublesIn', label: 'Ratio doubles in', r: true, val: r => r.doublesIn == null ? 9999 : r.doublesIn, cell: r => txt(r.doublesIn == null ? 'never' : r.doublesIn.toFixed(0) + ' yrs', r.doublesIn && r.doublesIn < 25 ? 'r' : '') }
  ], rows, { sort: 'debtUSD', onRow: r => countryDetail(r.code) }));
}

function countryDetail(code) {
  const v = G.countryAt(code, Date.now());
  const dl = el('dl', { class: 'kv' });
  const add = (k, val, cls) => { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || '', text: val })); };
  add('Population', M.fmt.big(v.population));
  add('Government debt, local', M.fmt.big(v.debt) + ' ' + v.ccy, 'dn');
  add('Government debt, USD', M.fmt.bigUsd(v.debtUSD), 'dn');
  add('GDP, USD', M.fmt.bigUsd(v.gdpUSD), 'up');
  add('Debt to GDP', v.debtToGdp.toFixed(1) + '%', v.debtToGdp > 100 ? 'dn' : '');
  add('Debt per citizen', M.fmt.usd(v.debtPerCitizenUSD), 'dn');
  add('GDP per capita', M.fmt.usd(v.gdpPerCapita));
  add('Deficit', v.deficitPct.toFixed(1) + '% of GDP (' + M.fmt.cap(v.deficitUSD) + ')', v.deficitPct < 0 ? 'dn' : 'up');
  add('External debt', M.fmt.cap(v.external));
  add('Interest as share of revenue', v.interestShare.toFixed(1) + '%', v.interestShare > 20 ? 'dn' : '');
  add('10-year yield', v.y10 ? v.y10.toFixed(2) + '%' : 'no liquid market');
  add('Inflation', v.inflation.toFixed(1) + '%', v.inflation > 10 ? 'dn' : '');
  add('Real yield', v.realYield == null ? '—' : v.realYield.toFixed(2) + '%', v.realYield < 0 ? 'dn' : 'up');
  add('Unemployment', v.unemployment.toFixed(1) + '%');
  add('Debt / GDP trend', (v.ratioTrend >= 0 ? '+' : '') + v.ratioTrend.toFixed(2) + ' points a year', v.ratioTrend > 0 ? 'dn' : 'up');
  UI.modal(v.name, [
    el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } }, [
      el('span', { class: 'pill ' + (v.live ? 'live' : 'sim'), text: v.live ? 'LIVE TREASURY ANCHOR' : 'PROJECTION' }),
      el('span', { class: 'pill', text: v.ccy })
    ]),
    dl,
    el('p', { class: 'note', style: { marginTop: '10px' }, text: v.realYield != null && v.realYield < 0
      ? `Real yields are negative here: a holder of the ten-year loses ${Math.abs(v.realYield).toFixed(1)}% of purchasing power a year by holding it to the coupon. That is financial repression, and historically it is how a debt load of this size gets reduced without a default.`
      : v.doublesIn && v.doublesIn < 25
        ? `Debt is compounding faster than output. On the current trend the debt-to-GDP ratio doubles in about ${v.doublesIn.toFixed(0)} years, which is the arithmetic that eventually forces a policy change rather than a market one.`
        : `Debt and output are growing at a similar pace, so the ratio is roughly stable. A stable ratio at a high level is a very different problem from a rising one at a low level.` })
  ]);
}

UI.register('geo', {
  label: 'State & World',
  hidden: true,
  mount(node, arg) {
    cells = [];
    mode = arg === 'world' ? 'world' : 'states';
    if (mode === 'world') worldView(node); else statesView(node);
    paint();
  },
  update: M.throttle(() => paint(), 400)
});

function paint() {
  for (const c of cells) { if (!c.__get) continue; try { M.setText(c.querySelector('.val'), c.__get()); } catch (e) {} }
  const stamp = M.$('#geoStamp');
  if (stamp) M.setText(stamp, 'Live projection · ' + M.fmt.date(Date.now()) + ' ' + M.fmt.time(Date.now()) + ' · bases are 2024–25 published aggregates');
}
})();
