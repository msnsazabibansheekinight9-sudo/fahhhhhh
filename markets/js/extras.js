// ============================================================================
// TERMINAL — the tool shelf along the bottom of the board: the mortgage and
// loan calculator, gold supply and demand, home sales, auto sales, energy
// output, the precious metals table, sources and about.
//
// The calculators are exact arithmetic on whatever you type. The datasets are
// published aggregates at the board's epoch, grown forward on the same engine
// as everything else, and labelled as projections.
// ============================================================================
'use strict';
(function () {
const X = M.Extras = {};
const YEAR = 365.2425 * 86400000;
const EPOCH = M.Debt.EPOCH;
const at = (base, rate, t) => base * Math.exp(rate * ((t || Date.now()) - EPOCH) / YEAR);
X.at = at;

// ---------------------------------------------------------------- amortisation
// A standard fully-amortising loan. Returns the payment, the schedule, and
// what an extra monthly payment actually saves — which is the only number
// most people are really asking for.
X.amortise = ({ principal, annualRate, years, extra = 0, downPayment = 0, taxRate = 0, insurance = 0, pmi = 0 }) => {
  const P = Math.max(0, principal - downPayment);
  const n = Math.round(years * 12);
  const i = annualRate / 100 / 12;
  if (!P || !n) return null;
  const pay = i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n));
  const rows = [];
  let bal = P, totalInterest = 0, month = 0;
  while (bal > 0.005 && month < n * 2 + 12) {
    const int = bal * i;
    let principalPart = pay + extra - int;
    if (principalPart > bal) principalPart = bal;
    bal -= principalPart; totalInterest += int; month++;
    rows.push({ m: month, pay: int + principalPart, int, prin: principalPart, bal: Math.max(0, bal) });
  }
  const baseline = i === 0 ? 0 : pay * n - P;
  const escrow = (P + downPayment) * (taxRate / 100) / 12 + insurance / 12 + (downPayment / (P + downPayment) < 0.2 ? pmi / 12 : 0);
  return {
    payment: pay, monthsTaken: month, yearsTaken: month / 12,
    totalInterest, totalPaid: P + totalInterest,
    baselineInterest: baseline, interestSaved: Math.max(0, baseline - totalInterest),
    monthsSaved: Math.max(0, n - month),
    escrow, allIn: pay + extra + escrow,
    // The part people underestimate: interest as a share of everything paid.
    interestShare: (P + totalInterest) ? totalInterest / (P + totalInterest) * 100 : 0,
    rows
  };
};

// What income a lender's usual front-end and back-end ratios imply.
X.affordability = ({ income, debts = 0, rate, years = 30, downPayment = 0, taxRate = 1.1, insurance = 1800 }) => {
  const monthly = income / 12;
  const frontCap = monthly * 0.28, backCap = monthly * 0.36 - debts;
  const cap = Math.max(0, Math.min(frontCap, backCap));
  const i = rate / 100 / 12, n = years * 12;
  // Solve for the loan whose payment plus escrow equals the cap.
  let lo = 0, hi = 5e6;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const pay = i === 0 ? mid / n : mid * i / (1 - Math.pow(1 + i, -n));
    const esc = (mid + downPayment) * (taxRate / 100) / 12 + insurance / 12;
    if (pay + esc > cap) hi = mid; else lo = mid;
  }
  return { maxLoan: lo, maxPrice: lo + downPayment, monthlyCap: cap, frontCap, backCap };
};

// ---------------------------------------------------------------- gold supply & demand
// Tonnes a year unless stated. Base year 2024-25, grown on the rates below.
X.gold = {
  supply: [
    ['Mine production', 3660, .006, 'New metal out of the ground. It has grown about half a percent a year for a decade — the supply response is slow and getting slower.'],
    ['Recycled gold', 1340, .022, 'Scrap and old jewellery. This is the elastic part of supply: it rises with the price.'],
    ['Producer hedging', -20, 0, 'Net forward selling by miners. Negative when they buy hedges back.']
  ],
  demand: [
    ['Jewellery', 2010, -.012, 'Still the largest single use, and the most price-sensitive.'],
    ['Central banks', 1045, .038, 'The change that matters. Official buying has run above 1,000 tonnes a year since 2022, mostly outside the dollar bloc.'],
    ['Bars and coins', 1190, .016, 'Retail investment. It rises when confidence in the currency falls.'],
    ['ETFs and funds', 180, .095, 'The marginal, fast-moving buyer. It is the swing factor in a price move.'],
    ['Technology', 330, .008, 'Electronics, mostly. Small and stable.']
  ],
  stock: 216000,           // tonnes ever mined
  stockRate: .0165,        // new supply as a share of the above stock each year
  reservesUS: 8133.5,      // tonnes, official US holding
  note: 'Stock-to-flow is the whole monetary argument. Measured the conventional way — newly mined metal against the stock already above ground — the supply of gold grows under 2% a year, and no committee can decide to grow it faster. Counting recycled metal as well roughly doubles that, which is the honest caveat: recycling is elastic and rises with the price, so it is supply that responds to demand rather than supply that is fixed.'
};
X.goldAt = t => {
  const sup = X.gold.supply.map(([n, v, r, note]) => ({ name: n, t: at(v, r, t), note }));
  const dem = X.gold.demand.map(([n, v, r, note]) => ({ name: n, t: at(v, r, t), note }));
  const supTotal = sup.reduce((a, x) => a + x.t, 0), demTotal = dem.reduce((a, x) => a + x.t, 0);
  const gc = M.Universe.get('GC');
  const px = gc ? gc.px : 2650;
  const stock = at(X.gold.stock, X.gold.stockRate, t);
  const mine = sup[0].t;                       // mine production only
  return {
    supply: sup, demand: dem, supTotal, demTotal, balance: supTotal - demTotal,
    price: px, priceLive: gc && gc.src === 'live',
    stock, mine, stockToFlow: stock / mine,
    newSupplyPct: mine / stock * 100,
    allSupplyPct: supTotal / stock * 100,
    allGoldValue: stock * 32150.7 * px,            // tonnes → troy ounces → dollars
    usReserveValue: X.gold.reservesUS * 32150.7 * px,
    perCapita: stock * 32150.7 / M.Debt.valueAt('population', t),
    // How much of the federal debt all the gold ever mined would cover.
    debtCover: stock * 32150.7 * px / M.Debt.valueAt('natDebt', t) * 100
  };
};

// ---------------------------------------------------------------- precious metals
X.metals = [
  ['Gold', 'GC', 'troy oz', 2650, 'The monetary metal. Priced on real rates and on confidence in the issuer, not on industrial demand.'],
  ['Silver', 'SI', 'troy oz', 31.4, 'Half monetary, half industrial. The industrial half is why it is more volatile than gold.'],
  ['Platinum', 'PL', 'troy oz', 968, 'Autocatalysts and industry. Supply is concentrated in two countries.'],
  ['Copper', 'HG', 'pound', 4.29, 'Not precious, but the one the grid and the data centres need. A decade-long supply response.']
];
X.metalsAt = t => {
  const gold = M.Universe.get('GC'), silver = M.Universe.get('SI');
  const rows = X.metals.map(([name, sym, unit, fallback, note]) => {
    const inst = M.Universe.get(sym);
    const px = inst ? inst.px : fallback;
    return { name, sym, unit, px, note, live: inst && inst.src === 'live', chg: inst ? inst.chgPct : 0, srcName: inst && inst.srcName };
  });
  const g = gold ? gold.px : 2650, s = silver ? silver.px : 31.4;
  return {
    rows, goldSilver: s ? g / s : 0,
    dollarInGold: 1 / g, dollarInSilver: 1 / s,
    // What an ounce bought in 1913 against what it buys now — the board's own framing.
    goldPurchasing: g / 20.67, silverPurchasing: s / 1.29,
    m2PerOunce: M.Debt.valueAt('m2', t) / (X.gold.reservesUS * 32150.7),
    debtPerOunce: M.Debt.valueAt('natDebt', t) / (X.gold.reservesUS * 32150.7)
  };
};

// ---------------------------------------------------------------- home sales
X.housing = {
  existing: [4080000, .018, 'Existing home sales, annual rate'],
  newSales: [683000, .022, 'New single-family homes sold, annual rate'],
  starts: [1355000, .012, 'Housing starts, annual rate'],
  permits: [1420000, .011, 'Building permits, annual rate'],
  completions: [1620000, .008, 'Completions, annual rate'],
  inventoryExisting: [1330000, .042, 'Existing homes for sale'],
  inventoryNew: [481000, .026, 'New homes for sale'],
  medianExisting: [412000, .031, 'Median existing home price'],
  medianNew: [420000, .029, 'Median new home price'],
  avgNew: [510000, .030, 'Average new home price'],
  homeownership: [65.6, .001, 'Homeownership rate, %'],
  vacancy: [6.9, .004, 'Rental vacancy rate, %'],
  mortgageDebt: [13.3e12, .036, 'Total mortgage debt outstanding'],
  foreclosureRate: [0.42, .048, 'Foreclosure rate, % of mortgages'],
  rentMedian: [1980, .034, 'Median asking rent']
};
X.housingAt = t => {
  const o = {};
  for (const k in X.housing) { const [v, r, label] = X.housing[k]; o[k] = at(v, r, t); o[k + 'Label'] = label; }
  const income = M.Debt.valueAt('incomeNow', t);
  const rate = (M.Macro && M.Macro.series.mortgage30) ? M.Macro.series.mortgage30.v : 6.6;
  const loan = o.medianExisting * 0.8;
  const i = rate / 100 / 12, n = 360;
  const payment = loan * i / (1 - Math.pow(1 + i, -n));
  const escrow = o.medianExisting * 0.011 / 12 + 150;
  return Object.assign(o, {
    mortgageRate: rate,
    mortgageRateLive: !!(M.Macro && M.Macro.series.mortgage30),
    priceToIncome: o.medianExisting / income,
    monthsSupplyExisting: o.inventoryExisting / (o.existing / 12),
    monthsSupplyNew: o.inventoryNew / (o.newSales / 12),
    medianPayment: payment + escrow,
    paymentShareOfIncome: (payment + escrow) * 12 / income * 100,
    // Income needed at the usual 28% front-end ratio.
    incomeNeeded: (payment + escrow) * 12 / 0.28,
    affordabilityGap: (payment + escrow) * 12 / 0.28 - income,
    rentVsBuy: (payment + escrow) / o.rentMedian
  });
};

// ---------------------------------------------------------------- auto sales
X.auto = {
  saar: [15900000, .014, 'Total light vehicle sales, annual rate'],
  newAvgPrice: [48400, .029, 'Average new vehicle transaction price'],
  usedAvgPrice: [25600, .022, 'Average used vehicle price'],
  avgLoanNew: [41200, .031, 'Average new car loan'],
  avgLoanUsed: [26300, .026, 'Average used car loan'],
  avgPaymentNew: [742, .034, 'Average new car monthly payment'],
  avgPaymentUsed: [525, .029, 'Average used car monthly payment'],
  avgTermNew: [68.8, .002, 'Average new loan term, months'],
  avgRateNew: [7.1, .012, 'Average new car loan rate, %'],
  avgRateUsed: [11.6, .010, 'Average used car loan rate, %'],
  autoDebt: [1.64e12, .038, 'Total auto loan debt'],
  delinquency: [4.8, .052, '90-day auto delinquency rate, %'],
  negativeEquity: [24.2, .038, 'Share of trade-ins underwater, %'],
  evShare: [8.9, .17, 'Battery electric share of new sales, %'],
  fleetAge: [12.6, .009, 'Average age of vehicles on the road, years']
};
X.autoAt = t => {
  const o = {};
  for (const k in X.auto) { const [v, r, label] = X.auto[k]; o[k] = at(v, r, t); o[k + 'Label'] = label; }
  const income = M.Debt.valueAt('incomeNow', t);
  return Object.assign(o, {
    priceToIncome: o.newAvgPrice / income,
    paymentShareOfIncome: o.avgPaymentNew * 12 / income * 100,
    autoDebtPerCitizen: o.autoDebt / M.Debt.valueAt('population', t),
    // The affordability rule of thumb most lenders used to apply.
    weeksOfIncome: o.newAvgPrice / (income / 52)
  });
};

// ---------------------------------------------------------------- energy
// Production and consumption in quadrillion BTU a year unless noted.
X.energy = {
  production: [
    ['Crude oil and NGL', 'oil', 42.6, .021, '13.4 million barrels a day — the largest producer in the world, and the swing one.'],
    ['Natural gas', 'gas', 40.1, .024, 'Shale gas made the US the largest producer and a net exporter via LNG.'],
    ['Coal', 'coal', 10.2, -.048, 'In structural decline. Retiring faster than replacement capacity is being built in some regions.'],
    ['Nuclear', 'nuclear', 8.1, .002, 'Flat for two decades. The fleet is ageing and licence extensions are doing the work.'],
    ['Renewables', 'renew', 8.9, .061, 'Wind, solar, hydro and biomass. The fastest-growing line by a wide margin.']
  ],
  consumption: [
    ['Transportation', 'transport', 27.4, .009, 'Still almost entirely liquid fuels.'],
    ['Industrial', 'industrial', 23.8, .013, 'Rising with reshoring and with data-centre construction.'],
    ['Residential', 'residential', 11.6, .006, ''],
    ['Commercial', 'commercial', 9.6, .011, ''],
    ['Electric power losses', 'losses', 24.2, .004, 'Conversion and transmission losses — about a quarter of all primary energy.']
  ],
  electricity: [
    ['Natural gas', 43.1, .012], ['Nuclear', 18.2, -.002], ['Coal', 15.1, -.062],
    ['Wind', 10.4, .048], ['Solar', 6.9, .185], ['Hydro', 5.7, -.004], ['Other', 0.6, .02]
  ],
  genTWh: 4320, genRate: .021,
  dataCentreShare: [4.4, .22, 'Share of US electricity used by data centres']
};
X.energyAt = t => {
  const prod = X.energy.production.map(([name, id, v, r, note]) => ({ name, id, q: at(v, r, t), note }));
  const cons = X.energy.consumption.map(([name, id, v, r, note]) => ({ name, id, q: at(v, r, t), note }));
  const mix = X.energy.electricity.map(([name, pct, r]) => ({ name, pct: at(pct, r, t) }));
  const mixTotal = mix.reduce((a, x) => a + x.pct, 0);
  for (const m of mix) m.pct = m.pct / mixTotal * 100;
  const pTotal = prod.reduce((a, x) => a + x.q, 0), cTotal = cons.reduce((a, x) => a + x.q, 0);
  const gen = at(X.energy.genTWh, X.energy.genRate, t);
  const pop = M.Debt.valueAt('population', t);
  const oil = M.Universe.get('CL'), gas = M.Universe.get('NG');
  return {
    production: prod, consumption: cons, mix,
    productionTotal: pTotal, consumptionTotal: cTotal,
    netPosition: pTotal - cTotal,
    independent: pTotal >= cTotal,
    generationTWh: gen, perCapitaMWh: gen * 1e6 / pop / 1000,
    fossilShare: mix.filter(m => /gas|Coal/i.test(m.name)).reduce((a, m) => a + m.pct, 0),
    carbonFreeShare: mix.filter(m => /Nuclear|Wind|Solar|Hydro/i.test(m.name)).reduce((a, m) => a + m.pct, 0),
    dataCentre: at(X.energy.dataCentreShare[0], X.energy.dataCentreShare[1], t),
    oilPrice: oil ? oil.px : 72, oilLive: oil && oil.src === 'live',
    gasPrice: gas ? gas.px : 3.2, gasLive: gas && gas.src === 'live',
    importedOilValue: M.Debt.valueAt('importedOil', t)
  };
};
})();
