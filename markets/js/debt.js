// ============================================================================
// TERMINAL — the debt board. Every counter from the national-debt ledger, each
// with a base value at a fixed epoch and an annual growth rate, so any counter
// can be evaluated at any instant: v(t) = base * e^(g * years). That one rule
// gives both the live per-second tick and the time machine (scrub 1980 → 2040).
//
// Honesty: these are PROJECTIONS from published aggregates at the epoch below,
// not a live government feed. The one exception is the federal debt itself,
// which providers.js re-anchors from the US Treasury "Debt to the Penny" API
// when that call succeeds — the board badges it LIVE when it does.
// ============================================================================
'use strict';
(function () {
const D = M.Debt = {};

// Epoch of the published snapshot every base value below is taken at.
D.EPOCH = Date.parse('2025-10-19T21:20:00-04:00');
const YEAR = 365.2425 * 86400000;

// id: [base value, annual growth rate, label, format, group, tone]
// tone drives the pill colour the way the original board does it:
//   r = red (liabilities), g = green (receipts/output), b = blue, n = neutral,
//   p = purple, k = grey (historical reference, frozen), y = yellow (warning)
const C = D.C = {
  // ---------------------------------------------------------------- federal
  natDebt:       [40340991409885, .0520, 'US National Debt', 'usd', 'federal', 'r'],
  fedSpending:   [ 7468243643641, .0500, 'US Federal Spending', 'usd', 'federal', 'r'],
  fedDeficit:    [ 1922820505676, .0450, 'US Federal Budget Deficit', 'usd', 'federal', 'r'],
  savingsClock:  [  267218751416, .0600, 'US Savings Clock · Waste · Fraud · Abuse', 'usd', 'federal', 'y'],
  // ---------------------------------------------------------------- receipts
  fedRevenue:    [ 5545423137974, .0420, 'US Federal Tax Revenue', 'usd', 'revenue', 'g'],
  incomeTax:     [ 2985428729336, .0430, 'Income Tax Revenue', 'usd', 'revenue', 'k'],
  payrollTax:    [ 1845139207553, .0400, 'Payroll Tax Revenue', 'usd', 'revenue', 'g'],
  exciseTax:     [  121061357422, .0260, 'Excise Tax', 'usd', 'revenue', 'g'],
  tariffRev:     [  185365267940, .1900, 'Tariff Revenue', 'usd', 'revenue', 'b'],
  corpTax:       [  497401992542, .0380, 'Corporate Tax Revenue', 'usd', 'revenue', 'k'],
  estateTax:     [   30944105566, .0310, 'Estate & Gift Tax', 'usd', 'revenue', 'g'],
  charity:       [  606275596536, .0390, 'Charitable Donations', 'usd', 'revenue', 'p'],
  stateRevenue:  [ 2984993619555, .0410, 'Total State Revenue', 'usd', 'revenue', 'g'],
  localRevenue:  [ 2395859011489, .0405, 'Total Local Revenue', 'usd', 'revenue', 'g'],
  stateDebt:     [ 1112742682164, .0300, 'State Debt', 'usd', 'revenue', 'r'],
  localDebt:     [ 2320948738371, .0340, 'Local Debt', 'usd', 'revenue', 'r'],
  muniEmployees: [      20462664, .0070, 'Municipal Employees', 'int', 'revenue', 'k'],
  muniSalary:    [         75844, .0330, 'Average Salary', 'usd', 'revenue', 'k'],
  gdp:           [32826924017938, .0430, 'US Gross Domestic Product', 'usd', 'revenue', 'g'],
  workerComp:    [16884633740476, .0440, 'Total Worker Compensation', 'usd', 'revenue', 'b'],
  allSpending:   [13137169577310, .0470, 'Total Federal/State/Local Spending', 'usd', 'revenue', 'k'],
  // ---------------------------------------------------------------- budget
  medicare:      [ 2005586111695, .0640, 'Medicare / Medicaid', 'usd', 'budget', 'b'],
  socialSec:     [ 1668636386521, .0580, 'Social Security', 'usd', 'budget', 'k'],
  defense:       [  983519240229, .0410, 'Defense / War', 'usd', 'budget', 'k'],
  netInterest:   [ 1144217050847, .0820, 'Interest on Debt (net)', 'usd', 'budget', 'y'],
  // ---------------------------------------------------------------- unfunded
  totalDebt:     [116360698454705, .0480, 'US Total Debt', 'usd', 'unfunded', 'r'],
  totalInterest: [ 7118927978143, .0710, 'US Total Interest Paid', 'usd', 'unfunded', 'r'],
  creditCard:    [ 1343443826549, .0560, 'Credit Card Debt', 'usd', 'unfunded', 'r'],
  // ---------------------------------------------------------------- credit union counterfactual
  cuFedSavings:  [ 1144217051365, .0820, 'USA Federal Interest Savings per Year', 'usd', 'cu', 'g'],
  cuTotalSavings:[ 5731635180253, .0640, 'USA Total Interest Savings per Year', 'usd', 'cu', 'g'],
  // ---------------------------------------------------------------- money creation
  dollarsAdded:  [ 1261313704033, .0700, 'Dollar Supply Added', 'usd', 'money', 'g'],
  m2:            [23457272828975, .0530, 'US M2 Money Supply', 'usd', 'money', 'k'],
  derivatives:   [965018111178218, .0390, 'Currency and Credit Derivatives', 'usd', 'money', 'k'],
  moneyGrowth13: [       1429.10, .0530, 'Money Growth since 1913', 'x', 'money', 'y'],
  wageGrowth13:  [        124.94, .0320, 'Wage Growth since 1913', 'x', 'money', 'r'],
  fracTax:       [ 5731635180253, .0640, 'Fractional Reserve Banking "Tax"', 'usd', 'money', 'r'],
  // ---------------------------------------------------------------- national security
  foreignHeld:   [ 9359729048404, .0290, 'US Debt Held by Foreign Countries', 'usd', 'security', 'r'],
  tradeDeficit:  [  719715435331, .0360, 'US Trade Deficit', 'usd', 'security', 'r'],
  tradeChina:    [  144799557661, -.038, 'US Trade Deficit · China', 'usd', 'security', 'r'],
  importedOil:   [  258011168322, .0210, 'US Imported Oil', 'usd', 'security', 'r'],
  // ---------------------------------------------------------------- people
  population:    [     343144753, .00485, 'US Population', 'int', 'people', 'k'],
  taxpayers:     [     109368869, .00620, 'US Income Taxpayers', 'int', 'people', 'k'],
  workforce:     [     163125271, .00460, 'US Workforce', 'int', 'people', 'k'],
  workforce2000: [     164807116, 0,      'US Work Force 2000', 'int', 'people', 'k'],
  unemployed:    [       7082654, .02800, 'Official Unemployed', 'int', 'people', 'k'],
  unemployedAct: [      12425239, .02600, 'Actual Unemployed', 'int', 'people', 'k'],
  privateJobs:   [     129572488, .00730, 'Private Sector Jobs', 'int', 'people', 'k'],
  notInForce:    [     105408878, .01150, 'Not in Labor Force', 'int', 'people', 'r'],
  notInForce2000:[      84103912, 0,      'Not in Labor Force 2000', 'int', 'people', 'k'],
  fullTime:      [     134270455, .00690, 'Full-Time Workers', 'int', 'people', 'k'],
  partTime:      [      28576040, .01340, 'Part-Time Workers', 'int', 'people', 'k'],
  selfEmployed:  [       8795764, .01620, 'US Self-Employed', 'int', 'people', 'k'],
  unionWorkers:  [      15796597, -.0048, 'US Union Workers', 'int', 'people', 'k'],
  govEmployees:  [      23591633, .00810, 'Government Employees', 'int', 'people', 'k'],
  mfgJobs:       [      12657522, .00080, 'Manufacturing Jobs', 'int', 'people', 'k'],
  mfgJobs2000:   [      17139315, 0,      'Manufacturing Jobs 2000', 'int', 'people', 'k'],
  retirees:      [      64054779, .02100, 'US Retirees', 'int', 'people', 'k'],
  disabled:      [       8018943, .00640, 'US Disabled', 'int', 'people', 'k'],
  medicareEnrol: [      65452293, .02200, 'Medicare Enrollees', 'int', 'people', 'r'],
  medicaidRecip: [      89191790, .01400, 'Medicaid Recipients', 'int', 'people', 'r'],
  foodStamps:    [      34726642, .00900, 'Food Stamp Recipients', 'int', 'people', 'r'],
  poverty:       [      37133520, .00620, 'Living in Poverty', 'int', 'people', 'r'],
  uninsured:     [      27039238, .01100, 'Without Insurance', 'int', 'people', 'r'],
  homeless:      [        840537, .03100, 'US Homeless', 'int', 'people', 'y'],
  drugDeaths:    [         60957, -.0420, 'US Drug Deaths', 'int', 'people', 'k'],
  bankruptcies:  [        612961, .04800, 'US Bankruptcies', 'int', 'people', 'r'],
  foreclosures:  [         77057, .05600, 'US Foreclosures', 'int', 'people', 'r'],
  millionaires:  [      24528548, .03600, 'US Millionaires', 'int', 'people', 'g'],
  // ---------------------------------------------------------------- cost of living
  healthcareNow: [         16045, .04300, 'Healthcare Cost', 'usd', 'cost', 'b'],
  healthcare2000:[          5507, 0,      'Healthcare Cost 2000', 'usd', 'cost', 'k'],
  tuitionNow:    [         27638, .03900, 'College Tuition', 'usd', 'cost', 'k'],
  tuition2000:   [         10849, 0,      'College Tuition 2000', 'usd', 'cost', 'k'],
  homeNow:       [        408832, .03400, 'Median New Home', 'usd', 'cost', 'g'],
  home2000:      [        167430, 0,      'Median New Home 2000', 'usd', 'cost', 'k'],
  incomeNow:     [         68517, .02600, 'Median Income', 'usd', 'cost', 'g'],
  income2000:    [         32052, 0,      'Median Income 2000', 'usd', 'cost', 'k'],
  carNow:        [         51647, .03100, 'Average New Car', 'usd', 'cost', 'g'],
  car2000:       [         22524, 0,      'Average New Car 2000', 'usd', 'cost', 'k'],
  top1Wealth:    [      25365340, .04400, 'Top 1% Wealth', 'usd', 'cost', 'g'],
  bottom50Wealth:[         44389, .02100, 'Bottom 50% Wealth', 'usd', 'cost', 'r'],
  // ---------------------------------------------------------------- hard money ratios
  silverRatio:   [          1518, .0490, 'Dollar to Silver Ratio', 'usd', 'ratio', 'k'],
  silver1913:    [          2.71, 0,     'Dollar to Silver Ratio 1913', 'usd2', 'ratio', 'k'],
  goldRatio:     [         11986, .0510, 'Dollar to Gold Ratio', 'usd', 'ratio', 'k'],
  gold1913:      [         26.23, 0,     'Dollar to Gold Ratio 1913', 'usd2', 'ratio', 'k'],
  paperSilver:   [        406.50, .0180, 'Paper to Silver Ratio', 'x1', 'ratio', 'k'],
  paperGold:     [        153.04, .0160, 'Paper to Gold Ratio', 'x1', 'ratio', 'k'],
  cryptoRatio:   [          7.91, -.112, 'Dollar to Crypto Ratio', 'usd2', 'ratio', 'k'],
  crypto2013:    [          9954, 0,     'Dollar to Crypto Ratio 2013', 'x1', 'ratio', 'k'],
  // ---------------------------------------------------------------- sovereign wealth
  metals:        [ 1744304490595, .0620, 'Precious Metal Reserves', 'usd', 'treasury', 'g'],
  minerals:      [13191302703473, .0330, 'Mineral Reserves', 'usd', 'treasury', 'g'],
  realEstate:    [88305414782522, .0380, 'Real Estate', 'usd', 'treasury', 'g'],
  land:          [31032267058336, .0290, 'Land', 'usd', 'treasury', 'g'],
  stockMarket:   [68681989274732, .0720, 'Stock Market', 'usd', 'treasury', 'g'],
  treasuryRes:   [33101587623324, .0410, 'USA Treasury Reserve', 'usd', 'treasury', 'g']
};

// Ratios and per-head figures are never stored — they are always divided out of
// the counters above, so the board can never contradict itself.
const DERIVED = D.DERIVED = {
  debtPerCitizen:  { label: 'Debt per Citizen', fmt: 'usd', tone: 'r', f: s => s.natDebt / s.population },
  debtPerTaxpayer: { label: 'Debt per Taxpayer', fmt: 'usd', tone: 'r', f: s => s.natDebt / s.taxpayers },
  savingsPerTax:   { label: 'Savings per Taxpayer', fmt: 'usd', tone: 'y', f: s => s.savingsClock / s.taxpayers },
  revPerCitizen:   { label: 'Revenue per Citizen', fmt: 'usd', tone: 'g', f: s => s.fedRevenue / s.population },
  charityPerAdult: { label: 'Charity per Adult', fmt: 'usd', tone: 'p', f: s => s.charity / (s.population * .772) },
  stateDebtPer:    { label: 'State Debt per Citizen', fmt: 'usd', tone: 'r', f: s => s.stateDebt / s.population },
  localDebtPer:    { label: 'Local Debt per Citizen', fmt: 'usd', tone: 'r', f: s => s.localDebt / s.population },
  ccPerHolder:     { label: 'Credit Card Debt per Holder', fmt: 'usd', tone: 'r', f: s => s.creditCard / (s.population * .4648) },
  cuFedPerAdult:   { label: 'Savings per Adult', fmt: 'usd', tone: 'g', f: s => s.cuFedSavings / (s.population * .772) },
  cuTotPerAdult:   { label: 'Savings per Adult', fmt: 'usd', tone: 'g', f: s => s.cuTotalSavings / (s.population * .772) },
  fracTaxPerAdult: { label: '"Tax" per Adult', fmt: 'usd', tone: 'r', f: s => s.fracTax / (s.population * .772) },
  wealthReserves:  { label: 'Wealth Asset Reserves', fmt: 'usd', tone: 'g', f: s => s.metals + s.minerals + s.realEstate + s.land + s.stockMarket },
  wealthPerCitizen:{ label: 'Wealth per Citizen', fmt: 'usd', tone: 'g', f: s => (s.metals + s.minerals + s.realEstate + s.land + s.stockMarket) / s.population },
  debtToGdp:       { label: 'US Federal Debt to GDP Ratio', fmt: 'pct', tone: 'r', f: s => s.natDebt / s.gdp * 100 },
  totalDebtToGdp:  { label: 'Total Debt to GDP Ratio', fmt: 'pct', tone: 'r', f: s => (s.natDebt + s.stateDebt + s.localDebt) / s.gdp * 100 },
  allDebtToGdp:    { label: 'All US Debt to GDP', fmt: 'pct', tone: 'r', f: s => s.totalDebt / s.gdp * 100 },
  revToGdp:        { label: 'Revenue to GDP Ratio', fmt: 'pct', tone: 'g', f: s => (s.fedRevenue + s.stateRevenue + s.localRevenue) / s.gdp * 100 },
  spendToGdp:      { label: 'Spending to GDP Ratio', fmt: 'pct', tone: 'k', f: s => s.allSpending / s.gdp * 100 },
  moneyWageGap:    { label: 'Money vs Wage Growth', fmt: 'x1', tone: 'y', f: s => s.moneyGrowth13 / s.wageGrowth13 },
  interestShare:   { label: 'Interest as Share of Revenue', fmt: 'pct', tone: 'y', f: s => s.netInterest / s.fedRevenue * 100 },
  entitlementShare:{ label: 'Entitlements + Interest vs Revenue', fmt: 'pct', tone: 'r', f: s => (s.medicare + s.socialSec + s.netInterest) / s.fedRevenue * 100 },
  deficitPerSec:   { label: 'Deficit per Second', fmt: 'usd', tone: 'r', f: s => s.fedDeficit / 31556952 },
  debtPerSec:      { label: 'Debt Growth per Second', fmt: 'usd', tone: 'r', f: s => s.natDebt * .052 / 31556952 },
  foreignShare:    { label: 'Foreign-Held Share of Federal Debt', fmt: 'pct', tone: 'r', f: s => s.foreignHeld / s.natDebt * 100 },
  netWorth:        { label: 'National Net Position', fmt: 'usd', tone: 'g', f: s => (s.metals + s.minerals + s.realEstate + s.land + s.stockMarket) - s.totalDebt }
};

// Historical federal debt-to-GDP, the four cells the original board prints.
D.HISTORY = [[1960, 52.28], [1980, 34.69], [2000, 55.74]];

// Live overrides: providers.js drops a real Treasury figure in here and the
// board starts projecting from that instead of the published snapshot.
D.anchor = {};
D.setAnchor = (id, value, at, note) => { D.anchor[id] = { v: value, t: at || Date.now(), note: note || '' }; M.emit('debt:anchor', id); };

// ------------------------------------------------------------------ evaluation
D.valueAt = (id, t) => {
  const c = C[id]; if (!c) return 0;
  const a = D.anchor[id];
  const base = a ? a.v : c[0], from = a ? a.t : D.EPOCH;
  return base * Math.exp(c[1] * (t - from) / YEAR);
};
// Per-second slope at t — what drives the visible tick.
D.rateAt = (id, t) => { const c = C[id]; return c ? D.valueAt(id, t) * c[1] / 31556952 : 0; };

// One object with every counter and every derived figure, evaluated at t.
D.snapshot = (t) => {
  t = t || Date.now();
  const s = {};
  for (const id in C) s[id] = D.valueAt(id, t);
  for (const id in DERIVED) s[id] = DERIVED[id].f(s);
  s.__t = t;
  return s;
};
D.meta = id => { const c = C[id]; return c ? { id, label: c[2], fmt: c[3], group: c[4], tone: c[5], g: c[1], live: !!D.anchor[id] } : (DERIVED[id] ? { id, label: DERIVED[id].label, fmt: DERIVED[id].fmt, tone: DERIVED[id].tone, derived: true } : null); };

D.format = (v, fmt) => {
  switch (fmt) {
    case 'usd': return M.fmt.bigUsd(v);
    case 'usd2': return '$' + M.fmt.n(v, 2);
    case 'int': return M.fmt.big(v);
    case 'pct': return M.fmt.n(v, 2) + '%';
    case 'x': return M.fmt.n(v, 2) + ' X';
    case 'x1': return M.fmt.n(v, 2) + ' TO 1';
    default: return M.fmt.big(v);
  }
};

// ------------------------------------------------------------------ macro read
// The debt board is not decoration: the AI reads it. These are the numbers that
// actually move an allocation decision, condensed into one object.
D.macro = (t) => {
  const s = D.snapshot(t);
  return {
    debtToGdp: s.debtToGdp,
    totalDebtToGdp: s.totalDebtToGdp,
    allDebtToGdp: s.allDebtToGdp,
    interestShare: s.interestShare,                 // net interest / federal receipts
    entitlementShare: s.entitlementShare,
    deficitPct: s.fedDeficit / s.gdp * 100,
    m2Growth: 5.3,
    realWageGap: s.moneyWageGap,                    // money printed vs wages earned since 1913
    foreignShare: s.foreignShare,
    unemployment: s.unemployed / s.workforce * 100,
    u6: s.unemployedAct / s.workforce * 100,
    participation: s.workforce / (s.workforce + s.notInForce) * 100,
    housingToIncome: s.homeNow / s.incomeNow,
    // Fiscal dominance: when interest alone eats a quarter of receipts, the
    // central bank's room to hold rates high is gone. Dalio's late-cycle tell.
    fiscalDominance: M.clamp((s.interestShare - 8) / 22, 0, 1),
    // A crude but honest stress index the regime model leans on.
    stress: M.clamp(((s.debtToGdp - 90) / 60) * .4 + ((s.interestShare - 8) / 22) * .4 + ((s.housingToIncome - 4) / 4) * .2, 0, 1)
  };
};
})();
