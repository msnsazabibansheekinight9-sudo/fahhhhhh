// ============================================================================
// TERMINAL — the state and world boards. Same engine as the federal board:
// a base value at a fixed epoch and an annual rate, evaluated at any instant,
// so these tick and move with the time machine too.
//
// Figures are published aggregates for the epoch below, grown forward. They
// are projections, badged as such, and the per-state and per-country panels
// say which year each base came from.
// ============================================================================
'use strict';
(function () {
const G = M.Geo = {};
const YEAR = 365.2425 * 86400000;
G.EPOCH = Date.parse('2025-10-19T21:20:00-04:00');

// ---------------------------------------------------------------- states
// code, name, population (M), state debt ($B), local debt ($B), GSP ($B),
// state spending ($B), state revenue ($B), pension unfunded ($B),
// median household income ($), median home ($K), unemployment (%)
const S = [
['AL','Alabama',5.12,9.8,27.4,300,36.2,38.1,16.8,60100,232,2.9],
['AK','Alaska',0.73,6.4,4.1,67,13.1,12.4,7.2,89700,357,4.6],
['AZ','Arizona',7.58,14.6,56.2,528,52.8,54.9,22.1,74600,432,3.7],
['AR','Arkansas',3.08,5.1,14.2,176,29.4,30.8,4.9,56300,206,3.4],
['CA','California',38.9,156.8,562.4,3987,512.4,498.6,348.2,95500,786,5.3],
['CO','Colorado',5.96,18.2,62.8,528,48.6,50.2,38.4,92400,548,3.9],
['CT','Connecticut',3.63,38.4,24.6,345,34.8,36.1,42.6,91700,392,3.6],
['DE','Delaware',1.05,6.2,4.8,96,11.4,12.2,2.8,82900,384,4.1],
['DC','District of Columbia',0.68,13.4,0.0,168,20.4,21.6,0.4,106300,648,5.2],
['FL','Florida',23.4,36.2,186.4,1695,118.6,124.8,38.2,71500,412,3.4],
['GA','Georgia',11.3,13.8,72.6,824,62.4,64.8,28.6,74600,348,3.6],
['HI','Hawaii',1.44,9.6,6.8,109,18.2,17.4,14.8,95300,842,2.9],
['ID','Idaho',2.03,3.2,10.4,122,13.6,14.2,2.1,70200,452,3.2],
['IL','Illinois',12.5,64.8,142.6,1124,108.4,106.2,210.4,80300,268,4.8],
['IN','Indiana',6.89,22.4,48.2,502,44.6,46.8,14.2,70000,248,3.6],
['IA','Iowa',3.21,6.4,22.8,254,26.8,27.9,6.4,73100,218,3.1],
['KS','Kansas',2.94,8.2,24.6,229,22.4,23.1,10.8,70300,226,3.3],
['KY','Kentucky',4.56,14.6,26.4,279,42.6,43.8,39.2,61900,208,4.3],
['LA','Louisiana',4.57,17.2,34.8,298,42.8,44.2,21.4,58200,212,4.0],
['ME','Maine',1.40,5.1,7.2,89,11.2,11.8,3.1,71800,398,3.1],
['MD','Maryland',6.21,33.6,48.2,538,59.4,58.2,24.6,98500,432,3.1],
['MA','Massachusetts',7.07,84.2,42.6,770,78.6,76.4,52.8,101300,628,3.9],
['MI','Michigan',10.1,32.4,78.4,698,80.2,82.6,41.2,68500,246,4.3],
['MN','Minnesota',5.79,16.8,58.2,500,56.4,58.1,18.4,85100,352,3.2],
['MS','Mississippi',2.94,7.4,14.8,142,26.4,27.2,19.6,52700,178,3.6],
['MO','Missouri',6.21,19.6,42.8,434,38.6,40.2,22.4,67900,248,3.5],
['MT','Montana',1.14,3.1,6.4,71,8.4,8.9,2.4,69100,452,3.1],
['NE','Nebraska',2.01,2.4,16.2,173,14.6,15.2,1.8,74600,276,2.8],
['NV','Nevada',3.27,4.2,24.6,245,19.8,20.4,16.2,72300,462,5.4],
['NH','New Hampshire',1.41,7.2,8.4,113,9.2,9.8,6.1,96500,478,2.6],
['NJ','New Jersey',9.50,66.4,78.2,848,97.4,94.2,102.4,101000,512,4.4],
['NM','New Mexico',2.11,8.4,14.2,132,28.4,29.6,6.8,59700,312,4.1],
['NY','New York',19.6,153.6,384.2,2297,232.6,226.4,124.8,84600,468,4.4],
['NC','North Carolina',11.0,19.4,62.8,824,68.4,71.2,16.4,70800,348,3.7],
['ND','North Dakota',0.79,2.1,6.8,78,8.2,8.8,1.4,76500,282,2.2],
['OH','Ohio',11.8,31.2,98.4,920,90.4,93.6,36.2,69700,228,4.1],
['OK','Oklahoma',4.09,9.8,22.4,264,30.2,31.4,8.2,62100,208,3.3],
['OR','Oregon',4.27,16.4,38.6,325,44.6,45.2,24.8,80200,498,4.3],
['PA','Pennsylvania',13.0,50.4,112.6,1024,108.2,106.8,66.4,76100,268,3.4],
['RI','Rhode Island',1.10,10.2,5.4,78,12.4,12.8,6.2,84300,442,4.5],
['SC','South Carolina',5.47,10.4,32.6,338,37.8,39.4,28.4,66800,308,4.2],
['SD','South Dakota',0.93,1.8,5.2,74,6.4,6.8,0.4,71800,328,1.9],
['TN','Tennessee',7.23,8.2,42.6,543,48.6,51.2,4.2,68900,328,3.4],
['TX','Texas',31.3,58.4,342.6,2694,186.4,192.8,82.4,76200,312,4.1],
['UT','Utah',3.50,7.6,28.4,290,27.4,28.8,6.8,89200,528,3.1],
['VT','Vermont',0.65,3.4,3.2,42,8.2,8.6,4.8,78000,392,2.3],
['VA','Virginia',8.78,30.2,68.4,735,74.2,76.8,28.6,89400,412,2.9],
['WA','Washington',8.00,38.6,84.2,832,74.6,76.2,16.4,97000,628,4.6],
['WV','West Virginia',1.77,8.4,8.2,101,18.6,19.2,10.4,57100,172,4.1],
['WI','Wisconsin',5.94,22.8,42.6,459,50.2,52.4,2.4,75700,312,3.0],
['WY','Wyoming',0.59,1.2,4.8,51,6.8,7.2,1.8,74100,352,3.2]
];

// Growth rates differ by state but not wildly; these are the national rates
// nudged by each state's own trend so the board does not move in lockstep.
G.states = S.map(r => {
  const [code, name, popM, sDebt, lDebt, gsp, spend, rev, pension, income, homeK, unemp] = r;
  const seed = M.rng('state:' + code);
  const g = (base, spread) => base + (seed() - 0.5) * spread;
  return {
    code, name,
    base: {
      population: popM * 1e6, stateDebt: sDebt * 1e9, localDebt: lDebt * 1e9,
      gsp: gsp * 1e9, spending: spend * 1e9, revenue: rev * 1e9, pension: pension * 1e9,
      income, home: homeK * 1000, unemployment: unemp
    },
    rate: {
      population: g(0.0048, 0.012), stateDebt: g(0.031, 0.028), localDebt: g(0.035, 0.026),
      gsp: g(0.043, 0.018), spending: g(0.047, 0.016), revenue: g(0.041, 0.016),
      pension: g(0.036, 0.03), income: g(0.026, 0.01), home: g(0.034, 0.022), unemployment: g(0.004, 0.06)
    }
  };
});
G.byCode = Object.fromEntries(G.states.map(s => [s.code, s]));

// Evaluate one state at an instant, with every derived figure divided out.
G.stateAt = (code, t) => {
  const st = G.byCode[code]; if (!st) return null;
  t = t || Date.now();
  const yrs = (t - G.EPOCH) / YEAR;
  const v = {};
  for (const k in st.base) v[k] = st.base[k] * Math.exp(st.rate[k] * yrs);
  v.totalDebt = v.stateDebt + v.localDebt;
  v.debtPerCitizen = v.totalDebt / v.population;
  v.stateDebtPerCitizen = v.stateDebt / v.population;
  v.localDebtPerCitizen = v.localDebt / v.population;
  v.pensionPerCitizen = v.pension / v.population;
  v.debtToGsp = v.totalDebt / v.gsp * 100;
  v.gspPerCapita = v.gsp / v.population;
  v.spendPerCitizen = v.spending / v.population;
  v.revPerCitizen = v.revenue / v.population;
  v.balance = v.revenue - v.spending;
  v.homeToIncome = v.home / v.income;
  // The federal debt every citizen carries on top of their state's.
  const fed = M.Debt.snapshot(t);
  v.federalShare = fed.natDebt / fed.population;
  v.allInPerCitizen = v.debtPerCitizen + v.federalShare;
  v.code = code; v.name = st.name; v.t = t;
  return v;
};
G.allStatesAt = t => G.states.map(s => G.stateAt(s.code, t));

// ---------------------------------------------------------------- world
// code, name, population (M), gross govt debt (bn, local), currency,
// USD per unit of local currency, GDP (bn local), deficit (% GDP),
// debt/GDP (%), external debt ($bn), inflation (%), unemployment (%),
// interest as % of revenue, 10-year yield (%)
const W = [
['US','United States',343.1,40341,'USD',1,32827,-5.9,122.9,26200,2.9,4.2,18.4,4.28],
['JP','Japan',122.6,1320000,'JPY',0.00656,620000,-4.2,251.0,4400,2.7,2.5,9.8,1.08],
['CN','China',1409,112000,'CNY',0.138,138000,-6.8,88.3,2500,0.4,5.1,6.2,2.12],
['DE','Germany',83.5,2720,'EUR',1.084,4280,-2.1,63.6,6800,2.2,3.4,4.1,2.42],
['IN','India',1441,210000,'INR',0.01185,330000,-7.8,83.1,660,4.9,7.8,24.6,6.82],
['UK','United Kingdom',69.1,2790,'GBP',1.297,2890,-4.8,101.3,9600,2.6,4.3,11.2,4.46],
['FR','France',66.5,3230,'EUR',1.084,2920,-5.5,112.3,7400,1.8,7.4,5.8,3.18],
['IT','Italy',58.8,2950,'EUR',1.084,2180,-4.3,136.9,2700,1.1,6.2,8.4,3.62],
['CA','Canada',41.6,2180,'CAD',0.717,3010,-2.0,106.4,3400,2.0,6.8,9.6,3.24],
['BR','Brazil',217,9480,'BRL',0.171,11800,-8.2,86.7,740,4.6,6.4,22.8,13.4],
['RU','Russia',143.8,32400,'RUB',0.0103,186000,-1.8,19.5,320,8.4,2.4,5.2,15.2],
['KR','South Korea',51.6,1180000,'KRW',0.000724,2400000,-2.6,54.3,670,2.1,2.8,3.2,3.08],
['AU','Australia',27.2,1020,'AUD',0.652,2680,-1.2,43.8,1700,3.2,4.1,4.4,4.22],
['ES','Spain',48.6,1620,'EUR',1.084,1460,-3.2,105.3,2400,2.3,11.2,6.4,3.04],
['MX','Mexico',130.2,16800,'MXN',0.0493,34600,-5.4,52.8,620,4.4,2.8,14.2,9.62],
['ID','Indonesia',283,8900,'IDR',0.0000616,22100,-2.3,39.3,410,2.5,5.1,13.8,6.84],
['NL','Netherlands',18.1,510,'EUR',1.084,1140,-1.8,43.9,4400,2.8,3.7,2.4,2.68],
['SA','Saudi Arabia',34.1,1280,'SAR',0.267,4200,-2.8,29.9,270,1.9,3.5,4.8,5.12],
['CH','Switzerland',8.9,148,'CHF',1.131,830,0.6,17.8,1900,1.1,2.3,1.2,0.48],
['TR','Turkey',85.8,9200,'TRY',0.0291,32600,-5.1,27.4,500,42.4,8.6,16.2,28.4],
['AR','Argentina',46.3,255000,'ARS',0.00098,340000,-3.2,86.2,276,118,6.9,18.4,0],
['GR','Greece',10.3,370,'EUR',1.084,238,-1.1,153.6,480,2.6,9.8,7.2,3.28],
['PT','Portugal',10.6,280,'EUR',1.084,287,0.4,95.4,420,2.3,6.4,4.8,2.94],
['IE','Ireland',5.3,220,'EUR',1.084,560,1.6,39.3,2900,1.8,4.2,2.1,2.72],
['SE','Sweden',10.6,1420,'SEK',0.0918,6400,-0.8,31.4,1100,1.4,8.4,1.8,2.18],
['NO','Norway',5.6,1180,'NOK',0.0906,5600,9.8,41.2,780,2.8,4.1,1.4,3.86],
['PL','Poland',38.5,1760,'PLN',0.247,3900,-5.8,55.6,370,4.2,5.1,7.2,5.64],
['ZA','South Africa',63.8,5600,'ZAR',0.0556,7200,-4.8,75.1,160,4.4,32.1,21.4,9.82],
['NG','Nigeria',232,97000,'NGN',0.00063,230000,-4.2,46.6,42,32.7,5.0,34.2,18.6],
['EG','Egypt',116,12400,'EGP',0.0206,14800,-6.4,89.4,165,25.1,6.8,42.6,24.8],
['TH','Thailand',71.7,11800,'THB',0.0292,18600,-3.1,63.4,200,0.8,1.1,7.4,2.54],
['VN','Vietnam',101,4200,'VND',0.0000393,11600,-3.4,36.2,142,3.1,2.3,5.2,2.88],
['PH','Philippines',116,16200,'PHP',0.0172,26400,-5.6,61.4,125,3.2,4.1,12.8,6.12],
['MY','Malaysia',35.6,1280,'MYR',0.232,1950,-4.1,65.6,268,1.9,3.2,15.4,3.82],
['SG','Singapore',6.0,1180,'SGD',0.748,760,0.2,155.3,1900,1.5,2.0,0.0,2.72],
['IL','Israel',9.9,1420,'ILS',0.267,2060,-6.8,69.0,142,3.2,3.4,8.2,4.42],
['AE','United Arab Emirates',11.0,440,'AED',0.272,1920,4.2,22.9,250,2.0,2.7,1.8,4.08],
['NZ','New Zealand',5.3,180,'NZD',0.588,430,-2.6,41.9,210,2.2,4.8,4.1,4.34],
['CL','Chile',19.8,98000,'CLP',0.00104,290000,-2.4,41.2,230,4.2,8.7,6.8,5.86],
['CO','Colombia',52.9,900000,'COP',0.000236,1580000,-5.2,56.9,190,5.8,9.8,19.4,11.2],
['UA','Ukraine',37.9,7800,'UAH',0.0241,7400,-17.2,105.4,145,6.2,18.2,12.4,0],
['PK','Pakistan',251,76000,'PKR',0.00359,106000,-7.4,71.7,131,12.6,8.2,58.4,13.8]
];

G.countries = W.map(r => {
  const [code, name, popM, debt, ccy, fx, gdp, deficit, debtGdp, ext, infl, unemp, intRev, y10] = r;
  const seed = M.rng('cty:' + code);
  const g = (b, s) => b + (seed() - .5) * s;
  return {
    code, name, ccy, fx,
    base: { population: popM * 1e6, debt: debt * 1e9, gdp: gdp * 1e9, external: ext * 1e9, inflation: infl, unemployment: unemp },
    deficit, debtGdp, intRev, y10,
    rate: {
      population: g(0.008, 0.02), debt: g(0.055, 0.05), gdp: g(0.045, 0.03),
      external: g(0.03, 0.03), inflation: g(-0.04, 0.08), unemployment: g(0, 0.05)
    }
  };
});
G.byCountry = Object.fromEntries(G.countries.map(c => [c.code, c]));

G.countryAt = (code, t) => {
  const c = G.byCountry[code]; if (!c) return null;
  t = t || Date.now();
  const yrs = (t - G.EPOCH) / YEAR;
  const v = { code, name: c.name, ccy: c.ccy, fx: c.fx, t };
  for (const k in c.base) v[k] = c.base[k] * Math.exp(c.rate[k] * yrs);
  v.debtUSD = v.debt * c.fx;
  v.gdpUSD = v.gdp * c.fx;
  v.debtToGdp = v.debt / v.gdp * 100;
  v.debtPerCitizen = v.debt / v.population;
  v.debtPerCitizenUSD = v.debtUSD / v.population;
  v.gdpPerCapita = v.gdpUSD / v.population;
  v.deficitPct = c.deficit;
  v.deficitUSD = -c.deficit / 100 * v.gdpUSD;
  v.externalPerCitizen = v.external / v.population;
  v.interestShare = c.intRev;
  v.y10 = c.y10;
  // Real yield is the number that decides whether the debt is survivable.
  v.realYield = c.y10 ? c.y10 - v.inflation : null;
  // Debt grows faster than GDP here, so the ratio is on a path. Say where.
  const rDebt = c.rate.debt, rGdp = c.rate.gdp;
  v.ratioTrend = (rDebt - rGdp) * 100;
  v.doublesIn = rDebt > rGdp ? Math.log(2) / (rDebt - rGdp) : null;
  return v;
};
G.allCountriesAt = t => G.countries.map(c => G.countryAt(c.code, t));

// The US row on the world board should use the federal board's own number,
// including the live Treasury anchor, rather than a second copy of it.
const origCountryAt = G.countryAt;
G.countryAt = (code, t) => {
  const v = origCountryAt(code, t);
  if (v && code === 'US') {
    const fed = M.Debt.snapshot(t);
    v.debt = fed.natDebt; v.debtUSD = fed.natDebt;
    v.gdp = fed.gdp; v.gdpUSD = fed.gdp;
    v.population = fed.population;
    v.debtToGdp = fed.debtToGdp;
    v.debtPerCitizen = v.debtPerCitizenUSD = fed.debtPerCitizen;
    v.gdpPerCapita = fed.gdp / fed.population;
    v.interestShare = fed.interestShare;
    v.live = !!(M.Macro && M.Macro.isLive('natDebt'));
  }
  return v;
};
})();
