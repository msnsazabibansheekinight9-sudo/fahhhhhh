// ============================================================================
// TERMINAL — the news wire. Real headlines when a provider key exists; a
// generated wire otherwise, which is not decoration: a generated story carries
// an impact estimate and actually moves the simulated tape through Sim.shock,
// so cause and effect line up on the chart.
//
// Every item is tagged live:true or live:false and the UI shows which.
// ============================================================================
'use strict';
(function () {
const N = M.News = { items: [], byTicker: {}, filters: { q: '', cat: 'all', impact: 0, onlyWatch: false } };
const U = M.Universe;

// ------------------------------------------------------------------ taxonomy
const CATS = N.CATS = {
  macro:     { name: 'Macro & data', tone: 'b', weight: 1.0 },
  cenbank:   { name: 'Central banks', tone: 'y', weight: 1.2 },
  fiscal:    { name: 'Fiscal & debt', tone: 'r', weight: 0.9 },
  earnings:  { name: 'Earnings', tone: 'g', weight: 1.0 },
  guidance:  { name: 'Guidance', tone: 'g', weight: 0.9 },
  ma:        { name: 'M&A', tone: 'p', weight: 0.8 },
  regulatory:{ name: 'Regulatory & legal', tone: 'r', weight: 0.7 },
  geo:       { name: 'Geopolitics', tone: 'r', weight: 0.9 },
  credit:    { name: 'Credit & rates', tone: 'y', weight: 1.0 },
  commodity: { name: 'Commodities', tone: 'n', weight: 0.7 },
  crypto:    { name: 'Digital assets', tone: 'p', weight: 0.6 },
  analyst:   { name: 'Analyst actions', tone: 'n', weight: 0.4 },
  corporate: { name: 'Corporate', tone: 'n', weight: 0.5 },
  flows:     { name: 'Flows & positioning', tone: 'b', weight: 0.6 }
};

// ------------------------------------------------------------------ economic calendar
// Released on their real cadence. The AI reads this: a position sized before a
// CPI print is a different position after it.
const CAL = N.CAL = [
  { id: 'cpi', name: 'CPI — Consumer Price Index', agency: 'BLS', cat: 'macro', impact: 5, cadence: 'monthly', day: 12, hour: 8.5, moves: ['TLT', 'SPY', 'GLD', 'DXY'], note: 'The single biggest scheduled mover of the front end.' },
  { id: 'ppi', name: 'PPI — Producer Price Index', agency: 'BLS', cat: 'macro', impact: 3, cadence: 'monthly', day: 14, hour: 8.5, moves: ['TLT', 'SPY'] },
  { id: 'nfp', name: 'Nonfarm Payrolls', agency: 'BLS', cat: 'macro', impact: 5, cadence: 'monthly', day: 5, hour: 8.5, moves: ['SPY', 'TLT', 'DXY'], note: 'First Friday. Wage growth matters more than the headline count.' },
  { id: 'claims', name: 'Initial Jobless Claims', agency: 'DOL', cat: 'macro', impact: 2, cadence: 'weekly', dow: 4, hour: 8.5, moves: ['SPY'] },
  { id: 'fomc', name: 'FOMC Rate Decision', agency: 'Federal Reserve', cat: 'cenbank', impact: 5, cadence: 'fomc', hour: 14, moves: ['SPY', 'TLT', 'DXY', 'GLD'], note: 'The statement moves less than the dot plot and the press conference.' },
  { id: 'minutes', name: 'FOMC Minutes', agency: 'Federal Reserve', cat: 'cenbank', impact: 3, cadence: 'monthly', day: 20, hour: 14, moves: ['TLT'] },
  { id: 'pce', name: 'Core PCE Price Index', agency: 'BEA', cat: 'macro', impact: 4, cadence: 'monthly', day: 28, hour: 8.5, moves: ['TLT', 'SPY'], note: "The Fed's own preferred inflation gauge." },
  { id: 'gdp', name: 'GDP — Advance Estimate', agency: 'BEA', cat: 'macro', impact: 4, cadence: 'quarterly', day: 26, hour: 8.5, moves: ['SPY', 'TLT'] },
  { id: 'retail', name: 'Retail Sales', agency: 'Census', cat: 'macro', impact: 3, cadence: 'monthly', day: 16, hour: 8.5, moves: ['XLY', 'SPY'] },
  { id: 'ism', name: 'ISM Manufacturing PMI', agency: 'ISM', cat: 'macro', impact: 3, cadence: 'monthly', day: 1, hour: 10, moves: ['XLI', 'SPY'] },
  { id: 'ismserv', name: 'ISM Services PMI', agency: 'ISM', cat: 'macro', impact: 3, cadence: 'monthly', day: 3, hour: 10, moves: ['SPY'] },
  { id: 'confidence', name: 'Consumer Confidence', agency: 'Conference Board', cat: 'macro', impact: 2, cadence: 'monthly', day: 25, hour: 10, moves: ['XLY'] },
  { id: 'housing', name: 'Housing Starts & Permits', agency: 'Census', cat: 'macro', impact: 2, cadence: 'monthly', day: 17, hour: 8.5, moves: ['VNQ'] },
  { id: 'auction10', name: '10-Year Treasury Auction', agency: 'Treasury', cat: 'fiscal', impact: 3, cadence: 'monthly', day: 11, hour: 13, moves: ['TLT', 'IEF'], note: 'A tailing auction is the market telling you who is not buying.' },
  { id: 'auction30', name: '30-Year Bond Auction', agency: 'Treasury', cat: 'fiscal', impact: 3, cadence: 'monthly', day: 13, hour: 13, moves: ['TLT'] },
  { id: 'refund', name: 'Quarterly Refunding Announcement', agency: 'Treasury', cat: 'fiscal', impact: 4, cadence: 'quarterly', day: 30, hour: 8.5, moves: ['TLT'], note: 'How much duration Treasury intends to push into the market.' },
  { id: 'eia', name: 'EIA Crude Oil Inventories', agency: 'EIA', cat: 'commodity', impact: 2, cadence: 'weekly', dow: 3, hour: 10.5, moves: ['USO', 'XLE'] },
  { id: 'oped', name: 'OPEC+ Meeting', agency: 'OPEC', cat: 'commodity', impact: 4, cadence: 'monthly', day: 2, hour: 7, moves: ['USO', 'XLE'] }
];

// Next occurrence of each calendar entry, from now.
N.upcoming = (limit = 14) => {
  const now = Date.now(), out = [];
  for (const e of CAL) {
    for (let k = 0; k < 4; k++) {
      const d = new Date();
      if (e.cadence === 'weekly') { const add = (e.dow - d.getDay() + 7) % 7 + k * 7; d.setDate(d.getDate() + add); }
      else if (e.cadence === 'fomc') { d.setMonth(d.getMonth() + k * 1.5 | 0, 18); }
      else if (e.cadence === 'quarterly') { d.setMonth(Math.ceil((d.getMonth() + 1 + k * 3) / 3) * 3 - 1, e.day); }
      else { d.setMonth(d.getMonth() + k, Math.min(28, e.day)); }
      d.setHours(Math.floor(e.hour), (e.hour % 1) * 60, 0, 0);
      if (d.getTime() > now) { out.push(Object.assign({ at: d.getTime() }, e)); break; }
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, limit);
};

// ------------------------------------------------------------------ generated wire
// Templates are written the way a wire actually writes: a number, a comparison
// and a consequence. Each carries the market read, because a headline with no
// read is just noise.
const T = {
  earnings: [
    { h: '{C} beats on both lines; revenue +{g}% year on year', b: '{C} reported adjusted EPS of ${eps} against the ${epsx} consensus, with revenue up {g}% to {rev}. Operating margin came in at {om}%. Management pointed to {driver}.', dir: 1, mag: [1.5, 7] },
    { h: '{C} misses revenue estimate, shares slide after hours', b: '{C} fell short on the top line, posting {rev} against expectations nearer {revx}. EPS of ${eps} was carried by cost control rather than demand — the kind of beat that does not repeat.', dir: -1, mag: [-9, -2] },
    { h: '{C} tops estimates but flags softening demand into next quarter', b: 'A clean quarter from {C} — EPS ${eps}, revenue {rev} — overshadowed by commentary on {driver}. The market is pricing the guide, not the print.', dir: -1, mag: [-6, -0.5] },
    { h: '{C} margins expand {bp}bp as pricing holds', b: 'Gross margin at {C} widened to {gm}% as price increases stuck and input costs eased. That is the combination that re-rates a multiple.', dir: 1, mag: [1, 5.5] }
  ],
  guidance: [
    { h: '{C} raises full-year guidance on {driver}', b: '{C} lifted its outlook, now guiding to revenue growth of {g}%. Raises of this shape tend to be followed by another within two quarters.', dir: 1, mag: [2, 9] },
    { h: '{C} cuts guidance, blames {driver}', b: '{C} pulled its full-year outlook lower. The first cut is rarely the last — the historical base rate for a second cut inside two quarters is close to one in two.', dir: -1, mag: [-13, -4] },
    { h: '{C} withdraws guidance citing visibility', b: 'Withdrawn guidance is its own signal. {C} said it could not forecast with confidence given {driver}.', dir: -1, mag: [-15, -5] }
  ],
  ma: [
    { h: '{C} to acquire {C2} in ${amt}B cash-and-stock deal', b: 'The combination gives {C} {driver}. Deals at this premium usually leave the acquirer lower on the day and the target pinned near the offer.', dir: -1, mag: [-5, -1], dir2: 1, mag2: [12, 30] },
    { h: '{C} explores sale of {driver} unit', b: 'Bankers have been hired. A clean separation would surface value the conglomerate discount has been hiding.', dir: 1, mag: [1, 6] },
    { h: 'Activist builds stake in {C}, pushes for breakup', b: 'A 13D filing shows an activist position in {C} with a letter calling for divestitures and a buyback.', dir: 1, mag: [2, 11] }
  ],
  analyst: [
    { h: '{bank} upgrades {C} to Buy, target ${tgt}', b: 'The upgrade cites {driver}. Sell-side targets are a sentiment read, not a valuation — they follow price far more often than they lead it.', dir: 1, mag: [0.4, 3] },
    { h: '{bank} cuts {C} to Underweight on valuation', b: 'Target goes to ${tgt}. A valuation downgrade after a run is the weakest form of sell-side signal.', dir: -1, mag: [-3.5, -0.4] },
    { h: '{bank} names {C} a top pick for the year ahead', b: 'The note argues {driver} is underappreciated at the current multiple.', dir: 1, mag: [0.5, 2.5] }
  ],
  regulatory: [
    { h: 'Antitrust regulators open inquiry into {C}', b: 'A formal inquiry rarely ends in a breakup, but it caps the multiple while it runs and keeps acquisitions off the table.', dir: -1, mag: [-7, -1.5] },
    { h: '{C} settles investigation for ${amt}B', b: 'The number is absorbable; the removal of the overhang is usually worth more than the cash is worth paying.', dir: 1, mag: [0.5, 4] },
    { h: 'Court rules against {C} in patent dispute', b: 'Damages plus an injunction risk on the affected line. Watch the share of revenue exposed, not the headline award.', dir: -1, mag: [-9, -2] }
  ],
  macro: [
    { h: 'CPI comes in at {pc}% year on year, {vs} expectations', b: 'Core held at {pc2}%. Shelter is still doing most of the work in the index. Front-end yields moved {bp}bp on the print.', dir: 0, mag: [-2.5, 2.5], breadth: 1 },
    { h: 'Payrolls {vs} at {amt}k; unemployment rate {pc}%', b: 'Average hourly earnings up {pc2}% year on year. The participation rate is the number worth reading twice.', dir: 0, mag: [-2, 2], breadth: 1 },
    { h: 'Retail sales {vs}, consumer holding up', b: 'Control-group sales rose {pc}%. Goods spending is flat; the strength is in services, financed increasingly by revolving credit.', dir: 1, mag: [-1, 1.8], breadth: .8 },
    { h: 'ISM manufacturing at {amt}, {vs} contraction line', b: 'New orders and employment both moved. Twelve consecutive months below 50 is a contraction, whatever the output number says.', dir: 0, mag: [-1.6, 1.6], breadth: .8 },
    { h: 'Jobless claims rise to {amt}k, highest in {amt2} weeks', b: 'Continuing claims matter more here — it is taking longer to find a new job, which is the slower-moving tell.', dir: -1, mag: [-2, .6], breadth: .9 }
  ],
  cenbank: [
    { h: 'Fed holds rates, signals {amt} cuts next year', b: 'The dot plot moved. Powell declined to rule anything in or out, which is the whole point of the exercise.', dir: 0, mag: [-3, 3], breadth: 1.2 },
    { h: 'Fed cuts {bp}bp; Powell says policy is still restrictive', b: 'A cut into a market at highs is a different animal from a cut into a recession. The curve steepened on the announcement.', dir: 1, mag: [0, 3.4], breadth: 1.2 },
    { h: 'Hawkish repricing: market pushes first cut to {month}', b: 'Rate futures now imply a later and shallower path. Long duration takes the hit; so does anything valued on terminal-year cash flows.', dir: -1, mag: [-3.2, -0.3], breadth: 1.1 },
    { h: 'ECB diverges from the Fed, cuts to {pc}%', b: 'Policy divergence shows up in the currency before it shows up in the equity index.', dir: 0, mag: [-1.4, 1.4], breadth: .6 }
  ],
  fiscal: [
    { h: 'Treasury lifts quarterly refunding; long end absorbs ${amt}B more', b: 'Supply has to clear at some price. Term premium, not the policy rate, is what is moving the back end now.', dir: -1, mag: [-2.4, -0.2], breadth: .9 },
    { h: 'Deficit runs at ${amt}B for the month, {pc}% above last year', b: 'Interest expense is now one of the largest single line items in the budget and the fastest growing.', dir: -1, mag: [-1.8, 0], breadth: .7 },
    { h: 'Debt ceiling standoff resumes; bill yields distort around the X-date', b: 'The front end prices the date, not the outcome. It has always been resolved; it has not always been resolved cheaply.', dir: -1, mag: [-2.6, -0.2], breadth: .8 },
    { h: 'Net interest outlay passes ${amt}B annualised', b: 'Each percentage point of average coupon on this debt stock is roughly ${amt2}B a year once it rolls.', dir: -1, mag: [-1.4, 0], breadth: .6 }
  ],
  geo: [
    { h: 'Escalation in {region} lifts crude and gold', b: 'Risk premium, not supply loss — so far. The distinction matters for how long the move holds.', dir: -1, mag: [-2.8, -0.3], breadth: 1 },
    { h: 'New export controls hit {sector} supply chains', b: 'The cost is not the lost revenue, it is the capex to rebuild the supply chain somewhere else.', dir: -1, mag: [-5, -0.8], breadth: .8 },
    { h: 'Tariff package expands; importers warn on pass-through', b: 'Tariffs are a tax paid at the border and argued over afterwards. Margins compress before prices rise.', dir: -1, mag: [-3.4, -0.4], breadth: .9 },
    { h: 'Shipping rates spike as {region} route is diverted', b: 'Freight is the first place a logistics shock shows up in the data, weeks ahead of CPI.', dir: -1, mag: [-2, 0], breadth: .6 }
  ],
  credit: [
    { h: 'High-yield spreads widen {bp}bp, biggest move since {month}', b: 'Credit leads equity at turns far more reliably than the other way round. Watch CCC-rated issuance, which stops first.', dir: -1, mag: [-3.4, -0.4], breadth: 1.1 },
    { h: 'Investment-grade issuance window reopens with ${amt}B priced', b: 'Issuers coming in size at tight spreads is the market telling you funding is not the problem right now.', dir: 1, mag: [0, 1.6], breadth: .7 },
    { h: 'Regional bank deposit costs climb again', b: 'Net interest margin compression with a commercial real estate book behind it is the combination that has caused trouble before.', dir: -1, mag: [-4.5, -0.5], breadth: .5 },
    { h: 'Curve disinverts after {amt} months', b: 'Historically the recession has started after the disinversion, not at the inversion. The signal is the un-inverting.', dir: -1, mag: [-2.2, 1], breadth: .9 }
  ],
  commodity: [
    { h: 'Crude {vs} as inventories {vs2} by {amt}M barrels', b: 'Front-month spreads moved more than the flat price, which is where the physical tightness actually shows.', dir: 0, mag: [-2.5, 2.5], breadth: .4 },
    { h: 'Gold takes out ${amt} as real yields fall', b: 'Gold has no cash flow, so it is a pure play on real rates and on confidence in the issuer of the currency it is priced in.', dir: 1, mag: [0, 2.4], breadth: .3 },
    { h: 'Copper rallies on grid and data-centre demand', b: 'The supply response takes a decade. That is the whole bull case and the whole risk.', dir: 1, mag: [0, 3], breadth: .4 }
  ],
  crypto: [
    { h: 'Bitcoin {vs} ${amt}k as ETF flows {vs2}', b: 'Spot ETF creations are now the cleanest read on marginal demand available.', dir: 0, mag: [-7, 7], breadth: .3 },
    { h: 'Regulatory clarity lifts digital asset names', b: 'The listed proxies move more than the asset itself in both directions — leverage dressed as equity.', dir: 1, mag: [0, 9], breadth: .3 },
    { h: 'Exchange outflows hit multi-month high', b: 'Coins leaving exchanges is usually read as accumulation. It is also what happens before a custody problem surfaces.', dir: 1, mag: [-2, 6], breadth: .2 }
  ],
  corporate: [
    { h: '{C} announces ${amt}B buyback and raises dividend {pc}%', b: 'Buybacks at a high multiple destroy value as reliably as they create it at a low one. Check the price they are paying.', dir: 1, mag: [0.4, 4] },
    { h: '{C} cuts {amt}k jobs in restructuring', b: 'The market usually likes this for a quarter. Whether it was fat or muscle shows up four quarters later.', dir: 1, mag: [-1, 4] },
    { h: 'CFO departs {C}; no successor named', b: 'An unexplained CFO exit with no named successor is the single highest-signal governance event there is.', dir: -1, mag: [-9, -2] },
    { h: '{C} reports production ramp at {driver}', b: 'Unit economics at scale are the only thing that matters here, and they are not in the release.', dir: 1, mag: [0, 5] }
  ],
  flows: [
    { h: 'Systematic funds flip to net short equity exposure', b: 'Vol-target and CTA positioning amplifies whatever the market was already doing. It is fuel, not a signal.', dir: -1, mag: [-2, 0], breadth: 1 },
    { h: 'Record inflows into money market funds; ${amt}T parked at the front end', b: 'That cash is a wall of dry powder or a vote of no confidence, depending on which side you already took.', dir: 0, mag: [-1, 1], breadth: .6 },
    { h: 'Put/call ratio hits an extreme not seen since {month}', b: 'Sentiment extremes are contrarian at the tails and meaningless in the middle.', dir: 1, mag: [-1, 2], breadth: .8 }
  ]
};

const BANKS = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Citi', 'UBS', 'Barclays', 'Wells Fargo', 'Jefferies', 'Evercore ISI', 'Bernstein', 'RBC Capital', 'Deutsche Bank', 'HSBC'];
const DRIVERS = ['data-centre demand', 'pricing power in the core franchise', 'an easing input-cost curve', 'share gains in the mid market', 'cost discipline and headcount reduction', 'subscription mix shift', 'a weaker dollar on overseas revenue', 'inventory normalisation at channel partners', 'enterprise renewal rates', 'softer consumer discretionary spend', 'order backlog conversion', 'the ramp of the new platform', 'regulatory approval in a second market', 'freight and logistics costs'];
const REGIONS = ['the Red Sea', 'the Taiwan Strait', 'Eastern Europe', 'the Gulf', 'the South China Sea', 'the Baltic'];
const MONTHS = ['January', 'March', 'April', 'June', 'July', 'September', 'October', 'December'];
const WIRES = ['Reuters', 'Bloomberg', 'Dow Jones Newswires', 'Associated Press', 'Financial Times', 'MarketWatch', 'Barron\'s', 'CNBC'];

function fill(str, ctx, rnd) {
  return str.replace(/\{(\w+)\}/g, (_, k) => {
    switch (k) {
      case 'C': return ctx.inst ? ctx.inst.name.replace(/ (Inc\.|Corp\.|Co\.|plc|Ltd\.|Group|Holdings).*$/, '') : 'the company';
      case 'C2': return ctx.inst2 ? ctx.inst2.name.replace(/ (Inc\.|Corp\.|Co\.|plc).*$/, '') : 'a rival';
      case 'bank': return M.pick(BANKS, rnd);
      case 'driver': return M.pick(DRIVERS, rnd);
      case 'region': return M.pick(REGIONS, rnd);
      case 'month': return M.pick(MONTHS, rnd);
      case 'sector': return ctx.inst ? ctx.inst.sector.toLowerCase() : 'semiconductor';
      case 'eps': return (ctx.inst && ctx.inst.f.eps ? Math.abs(ctx.inst.f.eps / 4) * (0.9 + rnd() * .3) : 1.2 + rnd() * 3).toFixed(2);
      case 'epsx': return (ctx.inst && ctx.inst.f.eps ? Math.abs(ctx.inst.f.eps / 4) * (0.86 + rnd() * .2) : 1.1 + rnd() * 3).toFixed(2);
      case 'rev': return M.fmt.cap((ctx.inst && ctx.inst.f.revenue ? ctx.inst.f.revenue / 4 : 2.4e9) * (0.92 + rnd() * .2));
      case 'revx': return M.fmt.cap((ctx.inst && ctx.inst.f.revenue ? ctx.inst.f.revenue / 4 : 2.4e9) * (0.98 + rnd() * .08));
      case 'g': return (2 + rnd() * 34).toFixed(1);
      case 'om': return (ctx.inst ? Math.max(2, ctx.inst.f.opMargin || 14) : 14).toFixed(1);
      case 'gm': return (ctx.inst ? Math.max(8, ctx.inst.f.grossMargin || 40) : 40).toFixed(1);
      case 'bp': return String(Math.round(5 + rnd() * 70));
      case 'tgt': return (ctx.inst ? ctx.inst.px * (0.82 + rnd() * .45) : 100).toFixed(0);
      case 'amt': return String(Math.round(1 + rnd() * 240));
      case 'amt2': return String(Math.round(10 + rnd() * 400));
      case 'pc': return (0.5 + rnd() * 5.5).toFixed(1);
      case 'pc2': return (0.4 + rnd() * 4.4).toFixed(1);
      case 'vs': return M.pick(['above', 'below', 'in line with', 'hotter than', 'cooler than'], rnd);
      case 'vs2': return M.pick(['build', 'draw', 'rise', 'fall'], rnd);
      default: return k;
    }
  });
}

let seq = 0;
function generate(when, forced) {
  const rnd = Math.random;
  const cat = forced || weightedCat(rnd);
  const pool = T[cat] || T.corporate;
  const tpl = M.pick(pool, rnd);
  const isCorp = /\{C\}/.test(tpl.h + tpl.b);
  let inst = null, inst2 = null, tickers = [];
  if (isCorp) {
    const stocks = U.ofType('stock');
    inst = M.pick(stocks, rnd);
    inst2 = M.pick(U.compSet(inst).length ? U.compSet(inst) : stocks, rnd);
    tickers = [inst.sym].concat(tpl.dir2 ? [inst2.sym] : []);
  }
  const ctx = { inst, inst2 };
  const mag = tpl.mag[0] + rnd() * (tpl.mag[1] - tpl.mag[0]);
  const item = {
    id: 'g' + (++seq) + '-' + when,
    t: when, head: fill(tpl.h, ctx, rnd), body: fill(tpl.b, ctx, rnd),
    src: M.pick(WIRES, rnd), cat, tickers, live: false,
    impact: M.clamp(Math.round(Math.abs(mag) / 2.2 + (CATS[cat].weight - .6) * 2), 1, 5),
    sentiment: M.clamp(mag / 8, -1, 1),
    expected: mag, breadth: tpl.breadth || 0,
    sector: inst ? inst.sector : null
  };
  // Make it real on the tape.
  if (inst) M.Sim.shock(inst.sym, mag, 12 * 60000, item.head);
  if (inst2 && tpl.dir2) { const m2 = tpl.mag2[0] + rnd() * (tpl.mag2[1] - tpl.mag2[0]); M.Sim.shock(inst2.sym, m2, 9 * 60000, item.head); item.tickers.push(inst2.sym); }
  if (tpl.breadth) {
    const b = mag * tpl.breadth * .5;
    for (const i of U.ofType('stock')) if (Math.random() < .45) M.Sim.shock(i.sym, b * (0.4 + Math.random() * 1.2) * (i.f.beta || 1), 18 * 60000, item.head);
    item.tickers = ['SPY'];
  }
  return item;
}

function weightedCat(rnd) {
  const pool = [];
  for (const k in CATS) { const n = Math.round(CATS[k].weight * 10); for (let i = 0; i < n; i++) pool.push(k); }
  return M.pick(pool, rnd);
}

// ------------------------------------------------------------------ ingest
function index(item) {
  for (const t of item.tickers) (N.byTicker[t] = N.byTicker[t] || []).unshift(item);
}
N.add = (item) => {
  if (N.items.some(x => x.id === item.id)) return false;
  item.cat = item.cat || classify(item);
  item.impact = item.impact || estimateImpact(item);
  if (item.sentiment == null) item.sentiment = score(item.head + ' ' + item.body);
  if (!item.tickers || !item.tickers.length) item.tickers = extract(item.head + ' ' + item.body);
  N.items.unshift(item); index(item);
  if (N.items.length > 500) N.items.length = 500;
  M.emit('news', item);
  return true;
};

// Keyword classification for headlines that arrive without one.
const KEYS = {
  earnings: ['earnings', 'eps', 'quarterly results', 'beats', 'misses', 'q1', 'q2', 'q3', 'q4', 'revenue'],
  guidance: ['guidance', 'outlook', 'forecast', 'raises', 'cuts forecast', 'warns'],
  ma: ['acquire', 'merger', 'takeover', 'buyout', 'stake', 'activist', 'spin-off', 'divest'],
  cenbank: ['fed', 'fomc', 'powell', 'ecb', 'boj', 'rate cut', 'rate hike', 'central bank', 'bank of england'],
  macro: ['cpi', 'inflation', 'payroll', 'jobless', 'gdp', 'pmi', 'retail sales', 'unemployment', 'pce'],
  fiscal: ['deficit', 'debt ceiling', 'treasury', 'auction', 'budget', 'national debt', 'refunding'],
  credit: ['spread', 'yield', 'bond', 'credit', 'default', 'downgrade', 'moody', 'rating'],
  geo: ['tariff', 'sanction', 'war', 'strike', 'export control', 'conflict', 'election'],
  regulatory: ['sec ', 'antitrust', 'lawsuit', 'probe', 'investigation', 'fine', 'settlement', 'ftc', 'doj'],
  commodity: ['oil', 'crude', 'gold', 'copper', 'opec', 'natural gas', 'wheat'],
  crypto: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'stablecoin', 'etf flows'],
  analyst: ['upgrade', 'downgrade', 'price target', 'initiates', 'top pick', 'overweight', 'underweight'],
  flows: ['inflow', 'outflow', 'positioning', 'short interest', 'fund flows']
};
function classify(item) {
  const s = (item.head + ' ' + (item.body || '')).toLowerCase();
  let best = 'corporate', bestN = 0;
  for (const c in KEYS) { let n = 0; for (const k of KEYS[c]) if (s.includes(k)) n++; if (n > bestN) { bestN = n; best = c; } }
  return best;
}
N.classify = classify;

// A small, deliberately transparent lexicon — a black-box sentiment score on a
// headline is worth less than one you can audit.
const POS = { beat: 2, beats: 2, surge: 2.5, soar: 3, jump: 2, rally: 2, gain: 1.5, rise: 1, up: .8, record: 2, strong: 1.8, upgrade: 2, raises: 2, raised: 1.8, approval: 2, wins: 2, profit: 1.5, growth: 1.5, expands: 1.2, outperform: 2, buyback: 1.5, dividend: 1, recovery: 1.5, breakthrough: 2.5, beat_expectations: 2.5, tops: 2, optimistic: 1.5, resilient: 1.2, inflows: 1.2, eases: 1.2, cooler: 1.4 };
const NEG = { miss: -2, misses: -2.2, plunge: -3, slump: -2.5, fall: -1.2, falls: -1.2, drop: -1.5, slide: -1.8, cut: -1.5, cuts: -1.8, downgrade: -2, warns: -2.2, warning: -2, probe: -1.8, lawsuit: -1.8, investigation: -1.8, fine: -1.5, loss: -2, losses: -2, layoffs: -1, bankruptcy: -3.5, default: -3, fraud: -3.5, recall: -2, halt: -2, delay: -1.5, weak: -1.8, soft: -1.2, recession: -2.5, selloff: -2.2, crash: -3.5, resign: -1.5, hotter: -1.4, widen: -1.2, outflows: -1.2, restructuring: -.8 };
function score(text) {
  const words = String(text).toLowerCase().split(/[^a-z]+/);
  let s = 0, n = 0;
  for (const w of words) { if (POS[w]) { s += POS[w]; n++; } else if (NEG[w]) { s += NEG[w]; n++; } }
  return n ? M.clamp(s / (n * 2.6), -1, 1) : 0;
}
N.score = score;

function extract(text) {
  const out = new Set();
  // $TICKER and bare all-caps tokens that match a real symbol.
  for (const m of String(text).matchAll(/\$([A-Z][A-Z.]{0,5})\b/g)) if (U.has(m[1])) out.add(m[1]);
  for (const m of String(text).matchAll(/\b([A-Z]{2,5})\b/g)) if (U.has(m[1]) && !['CEO', 'CFO', 'USA', 'GDP', 'CPI', 'FED', 'SEC', 'IPO', 'ETF', 'EPS'].includes(m[1])) out.add(m[1]);
  // Company names, longest first so "Bank of America" wins over "America".
  const t = String(text).toLowerCase();
  for (const i of U.ofType('stock')) {
    const base = i.name.replace(/ (Inc\.|Corp\.|Co\.|plc|Ltd\.|Group|Holdings|Class A|Class B|ADR).*$/, '').toLowerCase();
    if (base.length >= 4 && t.includes(base)) out.add(i.sym);
  }
  return [...out].slice(0, 8);
}
N.extract = extract;

function estimateImpact(item) {
  const w = CATS[item.cat] ? CATS[item.cat].weight : .6;
  const s = Math.abs(item.sentiment == null ? score(item.head) : item.sentiment);
  const bigName = item.tickers.some(t => { const i = U.get(t); return i && i.f && i.f.mcap > 3e11; });
  return M.clamp(Math.round(1 + w * 2 + s * 2 + (bigName ? 1 : 0)), 1, 5);
}

// ------------------------------------------------------------------ live pull
async function pullLive() {
  let got = 0;
  for (const fn of [M.Providers.newsFinnhub, M.Providers.newsMarketaux]) {
    try {
      const rows = await fn();
      if (!rows) continue;
      for (const r of rows) if (N.add(r)) got++;
    } catch (e) { /* adapter reports its own status */ }
  }
  for (const url of M.store.get('rssFeeds', [])) {
    try { const rows = await M.Providers.newsRSS(url); if (rows) for (const r of rows) if (N.add(r)) got++; } catch (e) {}
  }
  if (got) { M.sources.set(M.keys.has('marketaux') ? 'marketaux' : 'finnhub', 'live', got + ' live headlines in the last pull'); M.emit('news:batch', got); }
  return got;
}
N.pullLive = pullLive;

// ------------------------------------------------------------------ start
N.start = () => {
  // Backfill so the wire is not empty on first paint.
  const now = Date.now();
  for (let i = 38; i >= 0; i--) N.add(generate(now - i * (4 + Math.random() * 22) * 60000));
  // Generated items keep arriving at a believable rate; live pulls, if a key is
  // present, arrive alongside them and are marked LIVE.
  setInterval(() => { if (!document.hidden) N.add(generate(Date.now())); }, 42000);
  setInterval(() => { if (!document.hidden && Math.random() < .35) N.add(generate(Date.now())); }, 17000);
  pullLive();
  setInterval(pullLive, 5 * 60000);
  // Calendar events fire their own story when their moment arrives.
  setInterval(() => {
    const soon = N.upcoming(3).filter(e => e.at <= Date.now() + 1000 && e.at > Date.now() - 60000);
    for (const e of soon) N.add(generate(Date.now(), e.cat));
  }, 30000);
};

// ------------------------------------------------------------------ queries
N.for = (sym, limit = 20) => (N.byTicker[sym] || []).slice(0, limit);
N.filtered = (f) => {
  f = Object.assign({}, N.filters, f);
  const watch = M.store.get('watch', []);
  const q = f.q.trim().toLowerCase();
  return N.items.filter(n =>
    (f.cat === 'all' || n.cat === f.cat) &&
    n.impact >= f.impact &&
    (!f.onlyWatch || n.tickers.some(t => watch.includes(t))) &&
    (!q || n.head.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q) || n.tickers.some(t => t.toLowerCase().includes(q)))
  );
};
// Net sentiment over a window — one of the AI's inputs.
N.pulse = (mins = 120) => {
  const cut = Date.now() - mins * 60000;
  const recent = N.items.filter(n => n.t >= cut);
  if (!recent.length) return { n: 0, net: 0, heat: 0, top: null };
  const net = recent.reduce((a, n) => a + n.sentiment * n.impact, 0) / recent.reduce((a, n) => a + n.impact, 0);
  return { n: recent.length, net, heat: recent.reduce((a, n) => a + n.impact, 0) / recent.length, top: [...recent].sort((a, b) => b.impact - a.impact)[0] };
};
N.pulseFor = (sym, hours = 72) => {
  const cut = Date.now() - hours * 3600e3;
  const rows = (N.byTicker[sym] || []).filter(n => n.t >= cut);
  if (!rows.length) return { n: 0, net: 0 };
  return { n: rows.length, net: rows.reduce((a, n) => a + n.sentiment * n.impact, 0) / rows.reduce((a, n) => a + n.impact, 0), rows };
};
})();
