// ============================================================================
// TERMINAL — live macro. The debt board is a projection by default. This file
// replaces as much of that projection as the public data allows:
//
//   · US Treasury "Debt to the Penny"  — keyless, daily, the real debt figure
//   · FRED (a free key)                — GDP, M2, receipts, outlays, interest,
//                                        population, employment, credit, and
//                                        the whole Treasury yield curve
//
// Anything re-anchored here stops being a projection and is marked LIVE on the
// board. Anything that is not stays a projection and says so. A counter is
// never quietly half-real.
// ============================================================================
'use strict';
(function () {
const MA = M.Macro = { anchored: {}, series: {}, lastPull: 0 };
const SRC = M.sources, D = M.Debt, U = M.Universe;

SRC.declare('treasury', { name: 'US Treasury — Debt to the Penny', kind: 'macro', url: 'https://fiscaldata.treasury.gov', detail: 'Keyless. The real federal debt, updated each business day.' });
SRC.declare('fred', { name: 'FRED — Federal Reserve Bank of St. Louis', kind: 'macro', url: 'https://fredaccount.stlouisfed.org/apikeys', detail: 'Free key. Re-anchors most of the debt board and the whole yield curve.' });

const proxied = url => { const p = M.store.get('corsProxy', ''); return p ? p.replace('{url}', encodeURIComponent(url)) : null; };
async function getJSON(url, opt) {
  try { return await M.net.json(url, opt); }
  catch (e) { const p = proxied(url); if (!p) throw e; return JSON.parse(await M.net.text(p, opt)); }
}

// ------------------------------------------------------------------ Treasury
// The one number on the board that can be real with no key at all.
MA.treasury = async () => {
  try {
    const j = await getJSON('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=2&format=json', { timeout: 13000 });
    const rows = j && j.data;
    const row = rows && rows[0];
    const v = row && parseFloat(row.tot_pub_debt_out_amt);
    if (!isFinite(v) || v < 1e12) throw new Error('unexpected payload shape');
    const at = Date.parse(row.record_date + 'T17:00:00-04:00');
    // Two consecutive days give the actual observed daily growth, which beats
    // any assumed rate for the per-second tick.
    if (rows[1]) {
      const prev = parseFloat(rows[1].tot_pub_debt_out_amt);
      const days = Math.max(1, (at - Date.parse(rows[1].record_date + 'T17:00:00-04:00')) / 864e5);
      const annual = Math.log(v / prev) / (days / 365.2425);
      if (isFinite(annual) && annual > -0.2 && annual < 0.4) { D.C.natDebt[1] = annual; MA.observedDebtGrowth = annual; }
    }
    D.setAnchor('natDebt', v, at, 'Treasury ' + row.record_date);
    MA.anchored.natDebt = { src: 'US Treasury', at, note: row.record_date };
    SRC.set('treasury', 'live', 'Debt to the Penny · ' + row.record_date + ' · ' + M.fmt.bigUsd(v) + (MA.observedDebtGrowth ? ' · observed growth ' + (MA.observedDebtGrowth * 100).toFixed(1) + '%/yr' : ''));
    M.emit('macro:live', 'treasury');
    return true;
  } catch (e) {
    SRC.set('treasury', 'error', 'Unreachable from this browser (' + e.message + '). The debt counter stays on its projection.');
    return false;
  }
};

// ------------------------------------------------------------------ FRED
// Each entry: the FRED series, the board counter it anchors, and the scale
// that converts the series' units into the board's.
const FRED_MAP = [
  // id,            series,        counter,        scale,      label
  ['gdp',           'GDP',          'gdp',          1e9,  'Nominal GDP, SAAR'],
  ['m2',            'M2SL',         'm2',           1e9,  'M2 money stock'],
  ['receipts',      'FGRECPT',      'fedRevenue',   1e9,  'Federal current receipts, SAAR'],
  ['outlays',       'FGEXPND',      'fedSpending',  1e9,  'Federal current expenditures, SAAR'],
  ['interest',      'A091RC1Q027SBEA', 'netInterest', 1e9, 'Federal interest payments, SAAR'],
  ['population',    'POPTHM',       'population',   1e3,  'US resident population'],
  ['workforce',     'CLF16OV',      'workforce',    1e3,  'Civilian labour force'],
  ['unemployed',    'UNEMPLOY',     'unemployed',   1e3,  'Unemployed persons'],
  ['notinforce',    'LNS15000000',  'notInForce',   1e3,  'Not in the labour force'],
  ['private',       'USPRIV',       'privateJobs',  1e3,  'Private payrolls'],
  ['govjobs',       'USGOVT',       'govEmployees', 1e3,  'Government payrolls'],
  ['mfg',           'MANEMP',       'mfgJobs',      1e3,  'Manufacturing payrolls'],
  ['fulltime',      'LNS12500000',  'fullTime',     1e3,  'Full-time employed'],
  ['parttime',      'LNS12600000',  'partTime',     1e3,  'Part-time employed'],
  ['revolving',     'REVOLSL',      'creditCard',   1e9,  'Revolving consumer credit'],
  ['alldebt',       'TCMDO',        'totalDebt',    1e9,  'All sectors: debt securities and loans'],
  ['foreign',       'FDHBFIN',      'foreignHeld',  1e9,  'Federal debt held by foreign investors'],
  ['newhome',       'MSPNHSUS',     'homeNow',      1,    'Median sales price, new houses'],
  ['medinc',        'MEHOINUSA646N','incomeNow',    1,    'Median household income'],
  ['snap',          'BSTSNAPPART',  'foodStamps',   1,    'SNAP participants'],
  ['defense',       'FDEFX',        'defense',      1e9,  'Federal defence expenditures'],
  ['corptax',       'FCTAX',        'corpTax',      1e9,  'Federal corporate tax receipts'],
  ['statelocal',    'SLEXPND',      'allSpending',  1e9,  'State and local expenditures']
];
// The Treasury curve and the credit spreads: these price instruments, not the board.
const FRED_RATES = [
  ['DGS1MO', 'US1M'], ['DGS3MO', 'US3M'], ['DGS6MO', 'US6M'], ['DGS1', 'US1Y'],
  ['DGS2', 'US2Y'], ['DGS3', 'US3Y'], ['DGS5', 'US5Y'], ['DGS7', 'US7Y'],
  ['DGS10', 'US10Y'], ['DGS20', 'US20Y'], ['DGS30', 'US30Y'],
  ['BAMLC0A0CMEY', 'USIG'], ['BAMLH0A0HYM2EY', 'USHY']
];
// Context series that have no cell of their own but the council reads.
const FRED_CONTEXT = [
  ['CPIAUCSL', 'cpi', 'CPI, all items'],
  ['CPILFESL', 'cpiCore', 'Core CPI'],
  ['UNRATE', 'unrate', 'Unemployment rate'],
  ['U6RATE', 'u6', 'U-6 underemployment'],
  ['CIVPART', 'participation', 'Labour force participation'],
  ['FEDFUNDS', 'fedFunds', 'Effective fed funds rate'],
  ['T10Y2Y', 'curve2s10s', '10-year minus 2-year'],
  ['BAMLH0A0HYM2', 'hySpread', 'High-yield option-adjusted spread'],
  ['T10YIE', 'breakeven10', '10-year inflation breakeven'],
  ['DFII10', 'real10', '10-year real yield'],
  ['MORTGAGE30US', 'mortgage30', '30-year fixed mortgage'],
  ['HOUST', 'housingStarts', 'Housing starts'],
  ['RSAFS', 'retailSales', 'Retail sales'],
  ['INDPRO', 'indPro', 'Industrial production'],
  ['PAYEMS', 'payrolls', 'Total nonfarm payrolls'],
  ['PCEPILFE', 'corePce', 'Core PCE price index'],
  ['WALCL', 'fedBalance', 'Fed balance sheet'],
  ['RRPONTSYD', 'reverseRepo', 'Overnight reverse repo'],
  ['TOTALSA', 'autoSales', 'Total vehicle sales, SAAR'],
  ['EXHOSLUSM495S', 'existingHome', 'Existing home sales'],
  ['CSUSHPINSA', 'caseShiller', 'Case-Shiller national home price index'],
  ['GFDEGDQ188S', 'debtToGdpFred', 'Federal debt as a percent of GDP']
];

async function fredSeries(key, id, limit = 2) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
  const j = await getJSON(url, { timeout: 12000 });
  const obs = j && j.observations;
  if (!obs || !obs.length) throw new Error('no observations for ' + id);
  const good = obs.filter(o => o.value !== '.' && isFinite(parseFloat(o.value)));
  if (!good.length) throw new Error('no numeric observation for ' + id);
  return { value: parseFloat(good[0].value), date: good[0].date, prev: good[1] ? parseFloat(good[1].value) : null };
}

MA.fred = async () => {
  const key = M.keys.get('fred');
  if (!key) { SRC.set('fred', 'off', 'No key. The debt board stays on its projections and the yield curve stays simulated.'); return false; }
  let anchored = 0, rated = 0, ctx = 0, failed = 0, firstErr = '';
  SRC.set('fred', 'idle', 'pulling…');

  // Board counters. Re-anchoring sets the base and the date; the board's own
  // growth rate carries it forward between releases, which is the honest way
  // to tick a quarterly series.
  for (const [id, series, counter, scale, label] of FRED_MAP) {
    if (!D.C[counter]) continue;
    try {
      const r = await fredSeries(key, series, 6);
      const v = r.value * scale;
      if (!isFinite(v) || v === 0) throw new Error('zero');
      // Where two observations exist, use the series' own observed growth
      // instead of the assumed one.
      if (r.prev && r.prev > 0) {
        const perYear = Math.log(r.value / r.prev) / (1 / 4);   // most of these are quarterly
        if (isFinite(perYear) && Math.abs(perYear) < 0.5) D.C[counter][1] = perYear;
      }
      D.setAnchor(counter, v, Date.parse(r.date + 'T12:00:00Z'), series);
      MA.anchored[counter] = { src: 'FRED ' + series, at: Date.parse(r.date + 'T12:00:00Z'), note: label + ' · ' + r.date };
      anchored++;
    } catch (e) { failed++; if (!firstErr) firstErr = e.message; }
  }

  // The yield curve. These are real daily closes and they replace the
  // simulated bond prices outright.
  for (const [series, sym] of FRED_RATES) {
    const inst = U.get(sym); if (!inst) continue;
    try {
      const r = await fredSeries(key, series, 2);
      if (!isFinite(r.value)) throw new Error('bad value');
      M.RT.feed(sym, { px: r.value, prev: r.prev || r.value }, { name: 'FRED ' + series, kind: 'poll', delay: 1440 });
      if (inst.f) { inst.f.yield = r.value; inst.f.asOf = r.date; }
      rated++;
    } catch (e) { failed++; }
  }

  // Context the council reads but the board does not print.
  for (const [series, name, label] of FRED_CONTEXT) {
    try {
      const r = await fredSeries(key, series, 2);
      MA.series[name] = { v: r.value, prev: r.prev, date: r.date, label, series };
      ctx++;
    } catch (e) { failed++; }
  }

  MA.lastPull = Date.now();
  if (!anchored && !rated && !ctx) { SRC.set('fred', 'error', 'No series returned. ' + (firstErr || 'Check the key.')); return false; }
  SRC.set('fred', 'live', `${anchored} board counters re-anchored · ${rated} points on the yield curve · ${ctx} context series`);
  M.emit('macro:live', 'fred');
  M.emit('debt:anchor', 'fred');
  return true;
};

// ------------------------------------------------------------------ reads
// Which board counters are real right now, for the badge on each cell.
MA.isLive = id => !!MA.anchored[id];
MA.sourceOf = id => MA.anchored[id] || null;
MA.liveCount = () => Object.keys(MA.anchored).length;

// The council's macro seat prefers a measured number to an assumed one.
MA.read = (name, fallback) => (MA.series[name] ? MA.series[name].v : fallback);

MA.refresh = () => { MA.treasury(); MA.fred(); };
MA.start = () => {
  MA.treasury();
  MA.fred();
  setInterval(() => { if (!document.hidden) MA.treasury(); }, 3 * 3600e3);
  setInterval(() => { if (!document.hidden) MA.fred(); }, 6 * 3600e3);
  M.on('keys', M.debounce(() => MA.fred(), 1200));
};
})();
