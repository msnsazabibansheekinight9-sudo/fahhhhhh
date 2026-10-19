// ============================================================================
// TERMINAL — the council. One seat per school in the library. Each seat is a
// function that reads the same context object and returns a score from -100 to
// +100, a confidence, and the numbered points that produced it, each citing the
// book the rule comes from.
//
// Nothing here is a language model. These are the actual tests — Graham's seven
// criteria, Piotroski's nine, the Altman Z, the Beneish index, CAN SLIM, the
// magic formula, Kelly sizing — implemented as arithmetic you can check.
// ============================================================================
'use strict';
(function () {
const A = M.Analysts = { seats: {} };
const L = M.Library;

function seat(id, fn) { A.seats[id] = { id, school: L.schools[id], run: fn }; }
// A point: direction, weight (how much it should move the score), the sentence,
// and which book's rule produced it.
const pt = (dir, w, text, bookMatch, school) => ({ dir, w, text, book: L.cite(school, bookMatch) });
const finite = v => typeof v === 'number' && isFinite(v);
// Scale a raw weighted sum into -100..100 without letting one test dominate.
function settle(points, cap = 100) {
  let s = 0, tw = 0;
  for (const p of points) { s += p.dir * p.w; tw += p.w; }
  if (!tw) return { score: 0, confidence: 0.1 };
  // Shrink toward zero when the seat had little to go on. One test firing in
  // one direction is not the same evidence as eight agreeing, and without this
  // a seat with a single point reports ±100 and drowns out the rest.
  const shrink = tw / (tw + 3.5);
  const score = M.clamp(s / tw * 100 * shrink, -cap, cap);
  return { score, confidence: M.clamp(0.28 + tw / 26, 0.12, 0.95) };
}

// ---------------------------------------------------------------------------
// 1. Classical value — Graham's defensive criteria, adapted where a 1949 rule
//    does not survive contact with a modern balance sheet (noted in the text).
seat('value', ctx => {
  const { f, px, inst } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [pt(0, 0, 'Graham screens price against assets and earnings; this instrument has neither.', 'Intelligent', 'value')] };
  const pe = f.pe, pb = f.pb;
  if (finite(pe) && pe > 0) {
    if (pe < 15) p.push(pt(1, 3, `P/E of ${pe.toFixed(1)} clears Graham's 15× ceiling for the defensive investor.`, 'Intelligent', 'value'));
    else if (pe < 25) p.push(pt(0, 1.5, `P/E of ${pe.toFixed(1)} is above the defensive limit but not in speculative territory.`, 'Intelligent', 'value'));
    else p.push(pt(-1, 3, `P/E of ${pe.toFixed(1)} fails the defensive test outright — you are paying for growth that has to arrive.`, 'Intelligent', 'value'));
  } else p.push(pt(-1, 3.5, 'No positive trailing earnings. Graham will not value a business on a promise.', 'Security Analysis', 'value'));
  if (finite(pb) && pb > 0) {
    if (pe > 0 && pe * pb < 22.5) p.push(pt(1, 3, `P/E × P/B = ${(pe * pb).toFixed(1)}, inside the 22.5 product rule.`, 'Intelligent', 'value'));
    else if (pb > 6) p.push(pt(-1, 2, `Price-to-book of ${pb.toFixed(1)} means there is almost no asset backing under the price.`, 'Little Book of Value', 'value'));
  }
  const ncav = f.assets ? (f.assets * .72 - f.liabilities) / f.shares : null;
  if (finite(ncav) && ncav > 0 && px < ncav * 1.5) p.push(pt(1, 4, `Trades near estimated net current asset value (${M.fmt.usd2(ncav)}/share) — the deepest form of Graham cheapness, and rare.`, 'Security Analysis', 'value'));
  if (finite(f.currentRatio) && f.currentRatio > 0) {
    if (f.currentRatio >= 2) p.push(pt(1, 2, `Current ratio ${f.currentRatio.toFixed(2)} meets the 2:1 financial-condition test.`, 'Intelligent', 'value'));
    else if (f.currentRatio < 1) p.push(pt(-1, 2.5, `Current ratio ${f.currentRatio.toFixed(2)} is below 1 — short-term obligations exceed short-term assets.`, 'Intelligent', 'value'));
  }
  if (finite(f.debtEquity)) {
    if (f.debtEquity < .5) p.push(pt(1, 2, `Debt-to-equity of ${f.debtEquity.toFixed(2)} leaves the balance sheet able to absorb a bad year.`, 'Aggressive Conservative', 'value'));
    else if (f.debtEquity > 2) p.push(pt(-1, 2.5, `Debt-to-equity of ${f.debtEquity.toFixed(2)} makes the equity a leveraged claim on a volatile stream.`, 'Aggressive Conservative', 'value'));
  }
  if (f.divStreak > 15) p.push(pt(1, 1.5, `${f.divStreak} years of uninterrupted dividends — Graham's test of a record, not a forecast.`, 'Intelligent', 'value'));
  // Graham number, kept as a sanity anchor rather than a target.
  if (finite(f.eps) && f.eps > 0 && finite(f.bvps) && f.bvps > 0) {
    const gn = Math.sqrt(22.5 * f.eps * f.bvps);
    p.push(pt(px < gn ? 1 : -1, 2.5, `Graham number is ${M.fmt.usd2(gn)} against a price of ${M.fmt.usd2(px)} — ${px < gn ? 'a margin of safety of ' + ((1 - px / gn) * 100).toFixed(0) + '%' : 'a premium of ' + ((px / gn - 1) * 100).toFixed(0) + '% to the formula'}.`, 'Intelligent', 'value'));
  }
  const r = settle(p); return Object.assign(r, { points: p });
});

// 2. Quality compounders — owner earnings, returns on capital, moat evidence.
seat('quality', ctx => {
  const { f, inst, px } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [] };
  const owner = f.cfo - f.capex * .8;                               // maintenance capex approximated at 80% of total
  const oy = f.mcap ? owner / f.mcap * 100 : 0;
  if (finite(f.roic)) {
    if (f.roic > 20) p.push(pt(1, 4, `Return on invested capital of ${f.roic.toFixed(1)}% is far above any plausible cost of capital — every retained dollar is creating value.`, 'Valuation', 'valuation'));
    else if (f.roic > 12) p.push(pt(1, 2, `ROIC of ${f.roic.toFixed(1)}% clears the cost of capital with room to spare.`, 'Quality Investing', 'quality'));
    else if (f.roic < 7) p.push(pt(-1, 3.5, `ROIC of ${f.roic.toFixed(1)}% is at or below the cost of capital. Growth here destroys value rather than creating it.`, 'Valuation', 'valuation'));
  }
  if (finite(f.roe) && f.roe > 18 && f.debtEquity < 1.5) p.push(pt(1, 2.5, `ROE of ${f.roe.toFixed(1)}% without balance-sheet leverage doing the work.`, 'Essays of Warren Buffett', 'quality'));
  if (finite(f.grossMargin) && f.grossMargin > 50) p.push(pt(1, 2, `Gross margin of ${f.grossMargin.toFixed(0)}% is the signature of pricing power rather than volume.`, 'Little Book That Builds Wealth', 'quality'));
  if (finite(f.grossMargin) && f.grossMargin > 0 && f.grossMargin < 20) p.push(pt(-1, 1.5, `Gross margin of ${f.grossMargin.toFixed(0)}% leaves no cushion when input costs move.`, 'Quality Investing', 'quality'));
  if (oy > 6) p.push(pt(1, 3, `Owner earnings yield of ${oy.toFixed(1)}% — the cash an owner could actually take out, against the price.`, 'Essays of Warren Buffett', 'quality'));
  else if (oy > 0 && oy < 2) p.push(pt(-1, 2.5, `Owner earnings yield of only ${oy.toFixed(1)}%. At this price the business has to grow substantially just to be ordinary.`, 'Essays of Warren Buffett', 'quality'));
  else if (oy <= 0) p.push(pt(-1, 3, 'Owner earnings are negative after maintenance capex — this business consumes cash to stand still.', 'Essays of Warren Buffett', 'quality'));
  if (finite(f.shareChange)) {
    if (f.shareChange < -1.5) p.push(pt(1, 2, `Share count down ${Math.abs(f.shareChange).toFixed(1)}% over the year — buybacks are returning capital, and at this multiple that is accretive.`, 'Outsiders', 'quality'));
    else if (f.shareChange > 3) p.push(pt(-1, 2.5, `Share count up ${f.shareChange.toFixed(1)}% — existing holders are being diluted, which is a cost that never appears in EPS commentary.`, 'Outsiders', 'quality'));
  }
  // Munger's inversion: name the thing that would kill it.
  const risks = [];
  if (f.debtEquity > 2) risks.push('leverage into a downturn');
  if (f.netDebtEbitda > 4) risks.push('a refinancing wall');
  if (f.customerConc) risks.push('customer concentration');
  if (f.opMargin < 5) risks.push('no margin buffer');
  if (inst.sector === 'Technology' && f.revGrowth < 3) risks.push('a technology business that has stopped growing');
  if (risks.length) p.push(pt(-1, 1.5 * Math.min(2, risks.length), `Inverted: the ways this ends badly are ${risks.join(', ')}.`, 'Poor Charlie', 'quality'));
  else p.push(pt(1, 1.5, 'Inverted: no single obvious mechanism of ruin on the balance sheet or in the margin structure.', 'Poor Charlie', 'quality'));
  const r = settle(p); return Object.assign(r, { points: p, ownerYield: oy });
});

// 3. Growth at a sane price — Lynch categories, PEG, CAN SLIM.
seat('growth', ctx => {
  const { f, inst, tech } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [] };
  const g = finite(f.epsGrowth5y) && f.epsGrowth5y > 0 ? f.epsGrowth5y : f.revGrowth;
  const peg = f.pe > 0 && g > 0 ? f.pe / g : null;
  // Lynch's six categories, assigned from the numbers rather than by hand.
  let cat = 'Stalwart';
  if (g > 25) cat = 'Fast grower'; else if (g > 10) cat = 'Stalwart'; else if (g > 2) cat = 'Slow grower';
  if (inst.sector === 'Energy' || inst.sector === 'Materials' || inst.industry.includes('Auto') || inst.industry.includes('Airlines')) cat = 'Cyclical';
  if (f.pe < 0 && f.revGrowth < 0) cat = 'Turnaround';
  if (f.pb > 0 && f.pb < 1 && f.roe < 6) cat = 'Asset play';
  p.push(pt(0, 0.8, `Lynch category: ${cat}. That decides which test applies — a cyclical is judged at peak P/E, a fast grower on PEG.`, 'One Up', 'growth'));
  if (peg != null) {
    if (peg < 1) p.push(pt(1, 3.5, `PEG of ${peg.toFixed(2)} — growth is being sold for less than it is worth on Lynch's rule of thumb.`, 'Beating the Street', 'growth'));
    else if (peg < 2) p.push(pt(0, 1.5, `PEG of ${peg.toFixed(2)}: fairly priced for the growth, no bargain.`, 'Beating the Street', 'growth'));
    else p.push(pt(-1, 3, `PEG of ${peg.toFixed(2)} — the price already contains more growth than the record supports.`, 'Beating the Street', 'growth'));
  }
  // CAN SLIM, scored component by component.
  let can = 0; const canNotes = [];
  if (f.epsGrowth > 25) { can++; canNotes.push('C: current earnings growth above 25%'); }
  if (f.epsGrowth5y > 15) { can++; canNotes.push('A: annual growth above 15%'); }
  if (f.revGrowth > 15) { can++; canNotes.push('N: top line still accelerating'); }
  if (f.shareChange < 0) { can++; canNotes.push('S: supply of shares shrinking'); }
  if (tech && tech.pctOfHigh > 85) { can++; canNotes.push('L: trading within 15% of the 52-week high — a leader, not a laggard'); }
  if (f.instOwn > 55 && f.instOwn < 92) { can++; canNotes.push('I: institutional sponsorship present but not saturated'); }
  if (ctx.regime === 'bull' || (tech && tech.above200)) { can++; canNotes.push('M: market direction is not fighting the position'); }
  p.push(pt(can >= 5 ? 1 : can >= 3 ? 0 : -1, 3, `CAN SLIM score ${can}/7. ${canNotes.length ? canNotes.join('; ') + '.' : 'Few components present.'}`, 'How to Make Money', 'growth'));
  if (f.revGrowth > 20 && f.opMargin > 15) p.push(pt(1, 2.5, `Growing ${f.revGrowth.toFixed(0)}% while holding a ${f.opMargin.toFixed(0)}% operating margin — growth that is not being bought with price cuts.`, 'Narrative and Numbers', 'growth'));
  if (f.revGrowth > 20 && f.opMargin < 0) p.push(pt(-1, 2, `Growth of ${f.revGrowth.toFixed(0)}% is being funded by losses. The story needs a path to profit that the current numbers do not show.`, 'Narrative and Numbers', 'growth'));
  const r = settle(p); return Object.assign(r, { points: p, category: cat, peg, canslim: can });
});

// 4. Factors — the mechanical evidence: value, momentum, quality, size, low vol.
seat('quant', ctx => {
  const { f, inst, hist, tech } = ctx, p = [];
  if (!hist || hist.length < 60) return { score: 0, confidence: .1, points: [pt(0, 0, 'Not enough price history for a factor read.', 'Expected Returns', 'quant')] };
  const r12 = M.Sim.ret(inst, Math.min(hist.length - 1, 252)), r1 = M.Sim.ret(inst, Math.min(hist.length - 1, 21)), r6 = M.Sim.ret(inst, Math.min(hist.length - 1, 126));
  const mom = r12 - r1;                                            // 12-1 momentum, the standard construction
  if (mom > 25) p.push(pt(1, 3.5, `12-month momentum excluding the last month is +${mom.toFixed(0)}% — the top of this distribution has out-earned the bottom for a century of data.`, 'Quantitative Momentum', 'quant'));
  else if (mom < -15) p.push(pt(-1, 3, `12-1 momentum is ${mom.toFixed(0)}%. Losers keep losing over three to twelve months far more often than they mean-revert.`, 'Quantitative Momentum', 'quant'));
  // Path smoothness: the same return earned smoothly beats the same return earned in jumps.
  const rets = []; for (let i = hist.length - Math.min(252, hist.length) + 1; i < hist.length; i++) rets.push(hist[i].c > hist[i - 1].c ? 1 : -1);
  const posDays = rets.filter(x => x > 0).length / Math.max(1, rets.length);
  if (mom > 0 && posDays > .54) p.push(pt(1, 2, `${(posDays * 100).toFixed(0)}% of days positive — a smooth path, which the frog-in-the-pan evidence says persists better than a jumpy one.`, 'Quantitative Momentum', 'quant'));
  if (f && inst.type === 'stock') {
    // Composite value rank against the comparison set.
    const comp = M.Universe.compSet(inst).filter(x => x.f && x.f.pe > 0);
    if (comp.length > 2) {
      const rank = arr => { const v = arr.filter(x => isFinite(x) && x > 0).sort((a, b) => a - b); return x => v.length ? v.findIndex(y => y >= x) / v.length : .5; };
      const rPe = rank(comp.map(c => c.f.pe))(f.pe);
      const rPb = rank(comp.map(c => c.f.pb))(f.pb);
      const rPs = rank(comp.map(c => c.f.ps))(f.ps);
      const composite = (rPe + rPb + rPs) / 3;
      p.push(pt(composite < .4 ? 1 : composite > .7 ? -1 : 0, 3, `Composite value rank ${(composite * 100).toFixed(0)}th percentile against ${comp.length} industry peers — cheaper than ${(100 - composite * 100).toFixed(0)}% of them on earnings, book and sales together.`, 'What Works', 'quant'));
    }
    if (finite(f.roa) && f.roa > 10 && finite(f.accruals) && f.accruals < 0) p.push(pt(1, 2, `Profitable (${f.roa.toFixed(1)}% ROA) with negative accruals — the quality factor's two cleanest components both present.`, 'Your Complete Guide', 'quant'));
    if (f.mcap && f.mcap < 2e9) p.push(pt(1, 1, 'Small-cap: the size premium is weak on its own but real when combined with value and quality.', 'Your Complete Guide', 'quant'));
  }
  const rv = M.Sim.realisedVol(inst);
  if (rv > 0 && rv < 18) p.push(pt(1, 1.5, `Realised volatility of ${rv.toFixed(0)}% — the low-volatility anomaly has earned a higher risk-adjusted return than the high-vol bucket in almost every market studied.`, 'Your Complete Guide', 'quant'));
  else if (rv > 55) p.push(pt(-1, 2, `Realised volatility of ${rv.toFixed(0)}% puts this in the bucket that has historically paid the least per unit of risk.`, 'Your Complete Guide', 'quant'));
  p.push(pt(0, .6, 'Treat all of this as a prior, not a prediction: corrected for the number of strategies tested, most published edges shrink by half out of sample.', 'Advances in Financial', 'quant'));
  const r = settle(p); return Object.assign(r, { points: p, momentum: mom, r6, r1 });
});

// 5. Forensic accounting — Piotroski F, Beneish M, accrual quality.
seat('accounting', ctx => {
  const { f, inst } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [] };
  // Piotroski F-score, all nine.
  let F = 0; const got = [], missed = [];
  const test = (ok, label) => { if (ok) { F++; got.push(label); } else missed.push(label); };
  test(f.netIncome > 0, 'positive net income');
  test(f.cfo > 0, 'positive operating cash flow');
  test(f.roa > (f.py.roa || 0), 'ROA improving');
  test(f.cfo > f.netIncome, 'cash flow exceeds net income');
  test(f.debtEquity <= (f.py.leverage || f.debtEquity), 'leverage not rising');
  test(f.currentRatio >= (f.py.cr || 0), 'current ratio not deteriorating');
  test(f.shares <= (f.py.shares || f.shares) * 1.001, 'no new share issuance');
  test(f.grossMargin >= (f.py.gm || 0), 'gross margin improving');
  test(f.revenue / Math.max(1, f.assets) >= (f.py.turnover || 0), 'asset turnover improving');
  p.push(pt(F >= 7 ? 1 : F <= 3 ? -1 : 0, 4, `Piotroski F-score ${F}/9 — passes ${got.slice(0, 4).join(', ')}${got.length > 4 ? ' and ' + (got.length - 4) + ' more' : ''}${missed.length ? '; fails ' + missed.slice(0, 3).join(', ') : ''}.`, 'Value Investing: Tools', 'accounting'));
  // Accrual gap: the first place manipulation shows.
  const gap = f.netIncome - f.cfo;
  if (f.netIncome > 0 && gap > f.netIncome * .35) p.push(pt(-1, 3.5, `Net income exceeds operating cash flow by ${M.fmt.cap(gap)}. That gap is the single highest-yield red flag in the literature — earnings the business has not collected.`, 'Financial Shenanigans', 'accounting'));
  else if (f.cfo > f.netIncome * 1.2 && f.netIncome > 0) p.push(pt(1, 2.5, `Operating cash flow runs ${(f.cfo / f.netIncome).toFixed(2)}× reported earnings — conservative recognition rather than aggressive.`, 'Quality of Earnings', 'accounting'));
  // Beneish-style flags, computed where the inputs exist.
  const flags = [];
  if (f.revGrowth > 35 && f.accruals > 4) flags.push('rapid revenue growth alongside high accruals');
  if (f.grossMargin < (f.py.gm || 0) - 4) flags.push('gross margin deteriorating year on year');
  if (f.capex / Math.max(1, f.revenue) > .28 && f.fcf < 0) flags.push('capex outrunning cash generation');
  if (f.debtEquity > (f.py.leverage || 0) * 1.3) flags.push('leverage up sharply');
  if (flags.length >= 2) p.push(pt(-1, 3, `Beneish-style flags: ${flags.join('; ')}. Any one is explainable; together they are the profile the index was built to catch.`, 'Detection of Earnings', 'accounting'));
  else if (!flags.length) p.push(pt(1, 1.5, 'No Beneish-style manipulation flags on the available inputs.', 'Detection of Earnings', 'accounting'));
  if (finite(f.accruals)) {
    if (f.accruals < -2) p.push(pt(1, 2, `Accruals of ${f.accruals.toFixed(1)}% of assets — cash is arriving ahead of the accounting, the good direction.`, 'Creative Cash Flow', 'accounting'));
    else if (f.accruals > 6) p.push(pt(-1, 2.5, `Accruals of ${f.accruals.toFixed(1)}% of assets. High-accrual firms have underperformed low-accrual firms consistently since the anomaly was published.`, 'Financial Statement Analysis', 'accounting'));
  }
  const r = settle(p); return Object.assign(r, { points: p, fscore: F });
});

// 6. Distress and special situations — Altman Z, magic formula, fulcrum.
seat('distress', ctx => {
  const { f, inst } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [] };
  // Altman Z for public manufacturers; the thresholds are the original ones.
  const A = f.assets || 1;
  const z = 1.2 * (f.workingCapital / A) + 1.4 * (f.retainedEarnings / A) + 3.3 * (f.ebit / A) + 0.6 * (f.mcap / Math.max(1, f.liabilities)) + 1.0 * (f.revenue / A);
  const zone = z > 2.99 ? 'safe' : z > 1.81 ? 'grey' : 'distress';
  p.push(pt(zone === 'safe' ? 1 : zone === 'grey' ? 0 : -1, zone === 'distress' ? 5 : 3,
    `Altman Z-score ${z.toFixed(2)} — ${zone === 'safe' ? 'the safe zone; bankruptcy risk inside two years is negligible on this measure' : zone === 'grey' ? 'the grey zone, where the model does not discriminate well' : 'the distress zone. The model has predicted most public bankruptcies two years ahead from here'}.`,
    'Corporate Financial Distress', 'distress'));
  // Greenblatt's magic formula, both halves.
  const ey = f.ev > 0 ? f.ebit / f.ev * 100 : 0;
  const roc = (f.workingCapital + (f.assets - f.liabilities)) > 0 ? f.ebit / Math.max(1, f.workingCapital + (f.assets - f.liabilities)) * 100 : 0;
  if (ey > 10 && roc > 25) p.push(pt(1, 4, `Magic formula: earnings yield ${ey.toFixed(1)}% on enterprise value and return on capital ${roc.toFixed(0)}%. Both halves of Greenblatt's rank in the top bucket at once is uncommon.`, 'Little Book That Still', 'distress'));
  else if (ey > 10) p.push(pt(1, 2, `Earnings yield of ${ey.toFixed(1)}% on EV — cheap on the half of the formula that matters most when rates are high.`, 'Little Book That Still', 'distress'));
  else if (ey < 3 && ey > 0) p.push(pt(-1, 2, `Earnings yield of only ${ey.toFixed(1)}% on enterprise value, below what a Treasury bill pays with no business risk attached.`, 'Little Book That Still', 'distress'));
  if (finite(f.interestCoverage)) {
    if (f.interestCoverage < 2 && f.debt > 0) p.push(pt(-1, 4, `Interest coverage of ${f.interestCoverage.toFixed(1)}× — operating profit barely covers the interest bill. The creditors, not the shareholders, control the outcome from here.`, 'Distressed Debt', 'distress'));
    else if (f.interestCoverage > 12) p.push(pt(1, 1.5, `Interest coverage of ${f.interestCoverage.toFixed(0)}× — debt service is not a constraint on anything.`, 'Distressed Debt', 'distress'));
  }
  if (f.netDebtEbitda > 5) p.push(pt(-1, 3, `Net debt at ${f.netDebtEbitda.toFixed(1)}× EBITDA. At that level a refinancing at today's rates is itself the event risk.`, 'Distressed Debt', 'distress'));
  const r = settle(p); return Object.assign(r, { points: p, z, zone, earningsYield: ey });
});

// 7. Macro and the debt cycle — reads the debt board directly.
seat('macro', ctx => {
  const { macro, inst, f } = ctx, p = [];
  p.push(pt(0, .6, `Where we are: federal debt at ${macro.debtToGdp.toFixed(0)}% of GDP, net interest absorbing ${macro.interestShare.toFixed(0)}% of federal receipts, deficit running ${macro.deficitPct.toFixed(1)}% of GDP.`, 'Principles for Navigating', 'macro'));
  if (macro.interestShare > 18) p.push(pt(-1, 3, `Interest alone takes ${macro.interestShare.toFixed(0)}% of receipts. Past that line the policy choice narrows to inflating, taxing or defaulting, and the first is the one governments pick.`, 'This Time Is Different', 'macro'));
  if (macro.fiscalDominance > .5) p.push(pt(-1, 2.5, `Fiscal dominance reading ${(macro.fiscalDominance * 100).toFixed(0)}%: the deficit, not the central bank, is setting the terms. Long duration is the asset that suffers.`, 'Principles for Navigating', 'macro'));
  if (macro.entitlementShare > 80) p.push(pt(-1, 2, `Entitlements plus interest equal ${macro.entitlementShare.toFixed(0)}% of federal receipts before a single discretionary dollar is spent.`, 'This Time Is Different', 'macro'));
  if (macro.realWageGap > 10) p.push(pt(-1, 2, `Money supply has grown ${macro.realWageGap.toFixed(1)}× faster than wages since 1913. That gap is the asset-price inflation everyone argues about, and it favours owners of assets over earners of wages.`, 'What Has Government Done', 'monetary'));
  // Minsky: calm plus leverage is the dangerous combination, not volatility.
  const calm = M.Sim.regime === 'bull' || M.Sim.regime === 'chop';
  if (calm && macro.stress > .55) p.push(pt(-1, 2.5, 'A calm market on top of a stressed balance sheet is the Minsky configuration: stability is encouraging exactly the financing that cannot survive a shock.', 'Stabilizing an Unstable', 'macro'));
  // Positioning by asset type under this macro.
  if (inst.type === 'bond' || (inst.type === 'etf' && /Treas|Bond|Credit/i.test(inst.sector))) {
    if (macro.fiscalDominance > .4) p.push(pt(-1, 3, 'Duration into a supply-heavy fiscal regime: term premium has to rise to clear the issuance, and that is a price loss before any inflation surprise.', 'Inside the Yield Book', 'fixed'));
    else p.push(pt(1, 2, 'With growth slowing and inflation off its peak, duration pays in the scenario where the cycle rolls over.', 'Handbook of Fixed Income', 'fixed'));
  }
  if (inst.sym === 'GLD' || inst.sym === 'IAU' || inst.sym === 'GC' || inst.industry === 'Gold') p.push(pt(1, 3, 'Gold is the direct expression of this macro: it pays nothing, which costs little when real rates are falling and the issuer is running a structural deficit.', 'New Case for Gold', 'commodity'));
  if (inst.type === 'stock' && f && f.debtEquity > 2 && macro.interestShare > 15) p.push(pt(-1, 2.5, `A leveraged balance sheet (D/E ${f.debtEquity.toFixed(1)}) in a regime where the risk-free rate is being held up by fiscal supply is the wrong side of this cycle.`, 'Principles for Navigating', 'macro'));
  // The other side of the same ledger. A deficit is someone's income, and a
  // claim on nominal cash flows is not the asset that suffers from debasement.
  if (macro.deficitPct > 4 && (inst.type === 'stock' || inst.type === 'index' || inst.type === 'etf')) p.push(pt(1, 2, `A deficit of ${macro.deficitPct.toFixed(1)}% of GDP is a demand impulse before it is a liability: it lands in corporate revenue first and in the debt stock afterwards. Nominal earnings are the direct beneficiary.`, 'Principles', 'macro'));
  if (macro.unemployment < 5 && macro.participation > 58) p.push(pt(1, 2, `Unemployment at ${macro.unemployment.toFixed(1)}% with participation at ${macro.participation.toFixed(0)}% — the labour market is not where the cycle is breaking yet, and consumption is two-thirds of the economy.`, 'Principles for Navigating', 'macro'));
  else if (macro.unemployment > 6) p.push(pt(-1, 2.5, `Unemployment at ${macro.unemployment.toFixed(1)}% and rising is the variable that turns a slowdown into a contraction, because it feeds back into the credit that is funding the rest.`, 'Stabilizing an Unstable', 'macro'));
  if (macro.interestShare < 14) p.push(pt(1, 1.5, `Interest is absorbing ${macro.interestShare.toFixed(0)}% of receipts, which is high but still short of the level at which fiscal policy dictates monetary policy. There is room before the constraint binds.`, 'This Time Is Different', 'macro'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 8. Cycles and positioning — Marks' temperature, Soros' reflexivity, Weinstein stage.
seat('cycles', ctx => {
  const { tech, inst, f, newsPulse } = ctx, p = [];
  const reg = M.Sim.regimeInfo();
  p.push(pt(0, .8, `Market temperature: ${reg.name.toLowerCase()}, running ${M.fmt.dur(Date.now() - reg.since)}. Marks' question is not what will happen but what the price already assumes.`, 'Mastering the Market', 'cycles'));
  if (tech) {
    const st = tech.stage;
    if (st.n === 2) p.push(pt(1, 3, `${st.name}. ${st.note}`, 'Secrets for Profiting', 'cycles'));
    else if (st.n === 4) p.push(pt(-1, 4, `${st.name}. ${st.note}`, 'Secrets for Profiting', 'cycles'));
    else if (st.n === 3) p.push(pt(-1, 2, `${st.name}. ${st.note}`, 'Secrets for Profiting', 'cycles'));
    else if (st.n === 1) p.push(pt(0, 1.5, `${st.name}. ${st.note}`, 'Secrets for Profiting', 'cycles'));
    if (tech.pctOfHigh > 97 && tech.rsi > 72) p.push(pt(-1, 2, `Within ${(100 - tech.pctOfHigh).toFixed(1)}% of the 52-week high with RSI at ${tech.rsi.toFixed(0)}. Second-level thinking: everyone can see what you can see.`, 'Most Important Thing', 'cycles'));
    if (tech.pctOffLow < 12 && tech.rsi < 34) p.push(pt(1, 2.5, `Within ${tech.pctOffLow.toFixed(0)}% of the 52-week low with RSI at ${tech.rsi.toFixed(0)} — the zone where the uncomfortable purchases are made.`, 'Most Important Thing', 'cycles'));
  }
  // Soros: a trend that is feeding itself is both the opportunity and the risk.
  if (newsPulse && newsPulse.n > 2 && tech) {
    const aligned = (newsPulse.net > .2 && tech.trendUp) || (newsPulse.net < -.2 && !tech.trendUp);
    if (aligned) p.push(pt(tech.trendUp ? 1 : -1, 2, `Narrative and price are reinforcing each other (news tone ${newsPulse.net > 0 ? '+' : ''}${(newsPulse.net * 100).toFixed(0)} across ${newsPulse.n} stories). Reflexive trends run further than fundamentals justify — and end faster.`, 'Alchemy of Finance', 'cycles'));
    else p.push(pt(0, 1.2, 'Price and narrative are diverging. One of them is wrong, and the tape usually finds out first.', 'Alchemy of Finance', 'cycles'));
  }
  if (f && f.pe > 0 && inst.type === 'stock') {
    const comp = M.Universe.compSet(inst).filter(x => x.f && x.f.pe > 0);
    if (comp.length > 2) {
      const med = comp.map(c => c.f.pe).sort((a, b) => a - b)[Math.floor(comp.length / 2)];
      const rel = f.pe / med;
      p.push(pt(rel < .8 ? 1 : rel > 1.4 ? -1 : 0, 2, `Trading at ${rel.toFixed(2)}× the industry median multiple (${f.pe.toFixed(1)} vs ${med.toFixed(1)}). ${rel > 1.4 ? 'The premium needs a reason that survives the next downturn.' : rel < .8 ? 'The discount needs a reason too — find out which it is.' : 'In line with the group.'}`, 'Most Important Thing', 'cycles'));
    }
  }
  const r = settle(p); return Object.assign(r, { points: p });
});

// 9. Tail risk — the seat whose job is to object.
seat('tail', ctx => {
  const { inst, f, hist } = ctx, p = [];
  const mdd = M.Sim.maxDrawdown(inst), rv = M.Sim.realisedVol(inst);
  p.push(pt(mdd < -45 ? -1 : 0, 2, `Worst drawdown in the last year: ${mdd.toFixed(0)}%. That is the number to size against, not the average.`, 'Black Swan', 'tail'));
  if (rv > 45) p.push(pt(-1, 2.5, `Realised volatility of ${rv.toFixed(0)}% annualised. A position sized on a normal distribution at this vol will be wrong by a multiple when it matters.`, 'Misbehavior of Markets', 'tail'));
  if (f && f.debtEquity > 2.5) p.push(pt(-1, 3, `Leverage of ${f.debtEquity.toFixed(1)}× equity. Leverage is what converts a drawdown into a permanent loss, because it decides whether you can hold.`, 'When Genius Failed', 'tail'));
  if (inst.type === 'crypto') p.push(pt(-1, 2.5, 'A 24/7 asset with no circuit breakers, no earnings floor and a history of 70% drawdowns. Barbell it: a size you could lose entirely without changing your plans.', 'Antifragile', 'tail'));
  // Fat tails from the actual return series rather than an assumption.
  if (hist && hist.length > 120) {
    const rets = []; for (let i = 1; i < hist.length; i++) rets.push(Math.log(hist[i].c / hist[i - 1].c));
    const m = rets.reduce((a, b) => a + b, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length);
    const k = rets.reduce((a, b) => a + ((b - m) / sd) ** 4, 0) / rets.length;
    const big = rets.filter(r => Math.abs(r - m) > 3 * sd).length;
    p.push(pt(k > 6 ? -1 : 0, 2, `Kurtosis of ${k.toFixed(1)} with ${big} moves beyond three standard deviations in ${rets.length} days — a normal distribution predicts roughly ${(rets.length * 0.0027).toFixed(1)}. The tails are fatter than any variance-based risk number admits.`, 'Misbehavior of Markets', 'tail'));
  }
  if (f && f.shortFloat > 15) p.push(pt(-1, 1.5, `${f.shortFloat.toFixed(0)}% of the float is short. That cuts both ways: a squeeze is a tail event in your favour, a confirmed short thesis is one against you.`, 'Fooled by Randomness', 'tail'));
  if (mdd > -18 && rv < 28) p.push(pt(1, 2, `Worst drawdown ${mdd.toFixed(0)}% on ${rv.toFixed(0)}% volatility — this is the shallow end of the distribution. A position here can be sized properly rather than nervously.`, 'Against the Gods', 'tail'));
  if (f && f.debtEquity >= 0 && f.debtEquity < .6 && f.interestCoverage > 8) p.push(pt(1, 2, `Almost no leverage (D/E ${f.debtEquity.toFixed(2)}, interest covered ${f.interestCoverage.toFixed(0)}×). The mechanism that converts a drawdown into a permanent loss is simply absent here.`, 'When Genius Failed', 'tail'));
  p.push(pt(0, 1, 'Survival constraint: no position should be able to end the portfolio, however good the argument for it is.', 'Antifragile', 'tail'));
  const r = settle(p); return Object.assign(r, { points: p, mdd, rv });
});

// 10. Behavioural — audits the decision rather than the asset.
seat('behaviour', ctx => {
  const { inst, tech, newsPulse, f } = ctx, p = [];
  if (tech) {
    if (tech.pctOfHigh > 95 && newsPulse && newsPulse.net > .3) p.push(pt(-1, 2.5, 'Near the high with uniformly positive coverage. This is the exact configuration where availability bias does the most damage — recent good news feels like evidence of future good news.', 'Thinking, Fast and Slow', 'behaviour'));
    if (tech.pctOffLow < 10 && newsPulse && newsPulse.net < -.3) p.push(pt(1, 2, 'Near the low with uniformly negative coverage. If the thesis survives the bad news, this is where the discount comes from.', 'Little Book of Behavioral', 'behaviour'));
    if (tech.rsi > 78) p.push(pt(-1, 1.5, `RSI at ${tech.rsi.toFixed(0)}. Chasing a vertical move is the single most common way retail capital is destroyed, and it feels like conviction at the time.`, 'Your Money and Your Brain', 'behaviour'));
  }
  if (f && f.instOwn > 93) p.push(pt(-1, 1.5, `${f.instOwn.toFixed(0)}% institutional ownership — the marginal buyer has to come from somewhere, and everyone who was going to be convinced already is.`, 'Misbehaving', 'behaviour'));
  if (f && f.insiderOwn > 12) p.push(pt(1, 1.5, `Insiders hold ${f.insiderOwn.toFixed(0)}%. Alignment is not a guarantee, but it changes whose money is at risk alongside yours.`, 'Little Book of Behavioral', 'behaviour'));
  p.push(pt(0, 1.2, 'Write the thesis down before you buy, with the specific evidence that would falsify it. Hindsight will otherwise rewrite why you bought.', 'Little Book of Behavioral', 'behaviour'));
  p.push(pt(0, .8, 'Judge this decision by the process, not by next month\'s price. A good decision can lose and a bad one can win.', 'Thinking in Bets', 'behaviour'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 11. The tape.
seat('technical', ctx => {
  const { tech, inst } = ctx, p = [];
  if (!tech) return { score: 0, confidence: .1, points: [pt(0, 0, 'Not enough price history to read.', 'Technical Analysis of Stock', 'technical')] };
  p.push(pt(tech.above200 ? 1 : -1, 3, `Price is ${tech.above200 ? 'above' : 'below'} the 200-day average (${M.fmt.px(tech.sma200 || 0)}). It is the crudest filter in the book and it still separates the two halves of the return distribution.`, 'Technical Analysis of the Financial', 'technical'));
  if (tech.goldenCross && tech.trendUp) p.push(pt(1, 2, '50-day above a rising 200-day. The trend structure is intact.', 'Trade Like a Stock Market Wizard', 'technical'));
  if (tech.adx > 25) p.push(pt(tech.above50 ? 1 : -1, 2, `ADX at ${tech.adx.toFixed(0)} — this is a trending market, not a range. ${tech.above50 ? 'Trend-following rules apply.' : 'The trend is down; mean-reversion buys here are fighting it.'}`, 'Evidence-Based Technical', 'technical'));
  else p.push(pt(0, 1.2, `ADX at ${(tech.adx || 0).toFixed(0)} — no trend worth following. Levels matter more than direction here.`, 'Evidence-Based Technical', 'technical'));
  if (tech.rsi < 30) p.push(pt(1, 2, `RSI ${tech.rsi.toFixed(0)}: oversold. In a downtrend that is a warning, in a range it is an entry.`, 'Technical Analysis of the Financial', 'technical'));
  if (tech.rsi > 70) p.push(pt(-1, 1.8, `RSI ${tech.rsi.toFixed(0)}: overbought. In a strong trend overbought stays overbought for longer than shorts can stay solvent.`, 'Technical Analysis of the Financial', 'technical'));
  if (tech.macdHist > 0 && tech.macd > 0) p.push(pt(1, 1.5, 'MACD positive and above its signal — momentum confirming the trend.', 'Technical Analysis of the Financial', 'technical'));
  if (tech.macdHist < 0 && tech.macd < 0) p.push(pt(-1, 1.5, 'MACD negative and below signal — momentum confirming the decline.', 'Technical Analysis of the Financial', 'technical'));
  if (tech.volRatio > 1.8) p.push(pt(tech.px > (tech.sma20 || tech.px) ? 1 : -1, 2, `Volume at ${tech.volRatio.toFixed(1)}× the 50-day average. Wyckoff's point: effort and result should agree, and here they ${tech.px > (tech.sma20 || tech.px) ? 'do' : 'do not'}.`, 'Wyckoff', 'technical'));
  if (tech.obvSlope > .06) p.push(pt(1, 1.5, 'On-balance volume rising faster than price — accumulation under the surface.', 'Wyckoff', 'technical'));
  else if (tech.obvSlope < -.06) p.push(pt(-1, 1.5, 'On-balance volume falling while price holds — distribution into strength.', 'Wyckoff', 'technical'));
  const near = tech.levels.filter(l => Math.abs(l.p - tech.px) / tech.px < .04);
  if (near.length) p.push(pt(0, 1, `Price is sitting on a level tested ${near[0].touches} times at ${M.fmt.px(near[0].p)} — support and resistance are memory of where large holders changed their minds.`, 'Technical Analysis of Stock', 'technical'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 12. Position sizing — produces a number, not an opinion.
seat('risk', ctx => {
  const { inst, f } = ctx, p = [];
  const rv = M.Sim.realisedVol(inst) / 100 || .25;
  const edge = ctx.priorScore == null ? 0 : ctx.priorScore / 100;    // council consensus so far, as an edge proxy
  // Kelly on a continuous bet: f* = mu / sigma^2. Expected excess return is
  // taken from the consensus score, deliberately conservatively.
  const mu = edge * 0.10;
  const kelly = rv > 0 ? mu / (rv * rv) : 0;
  const quarter = M.clamp(kelly * .25, -.25, .25);
  p.push(pt(0, 1.5, `Kelly on these inputs is ${(kelly * 100).toFixed(0)}% of capital; quarter-Kelly, which is what a career-length horizon actually tolerates, is ${(quarter * 100).toFixed(1)}%.`, "Fortune's Formula", 'risk'));
  if (Math.abs(kelly) > 1) p.push(pt(-1, 2, 'Full Kelly here would be leveraged. The formula maximises growth and ignores that you have to live through the path.', 'Man for All Markets', 'risk'));
  const atrStop = ctx.tech && ctx.tech.atrPct ? ctx.tech.atrPct * 2 : rv * 100 / 8;
  p.push(pt(0, 1.2, `A 2×ATR stop sits ${atrStop.toFixed(1)}% away. Risking 1% of the portfolio on that stop implies a position of ${(100 / Math.max(1, atrStop)).toFixed(1)}% of capital.`, 'Trade Your Way', 'risk'));
  if (f && f.beta > 1.6) p.push(pt(-1, 1.5, `Beta of ${f.beta.toFixed(2)} means this position is really a leveraged bet on the index. Size it as one.`, 'Market Wizards', 'risk'));
  p.push(pt(0, 1, 'Define the exit before the entry. Every wizard in Schwager\'s books differs on method and agrees on this.', 'Market Wizards', 'risk'));
  const r = settle(p); return Object.assign(r, { points: p, kelly, quarterKelly: quarter, atrStop });
});

// 13. Portfolio fit — judges the position inside what you already own.
seat('portfolio', ctx => {
  const { inst } = ctx, p = [];
  const pos = M.Portfolio ? M.Portfolio.positions : [];
  if (!pos.length) {
    p.push(pt(0, 1, 'No existing positions, so nothing to diversify against yet. The first holding is the one that sets the portfolio\'s character.', 'Portfolio Selection', 'portfolio'));
  } else {
    const total = M.Portfolio.marketValue();
    const same = pos.filter(x => { const i = M.Universe.get(x.sym); return i && i.sector === inst.sector; });
    const sectorWeight = total ? same.reduce((a, x) => a + Math.abs(x.qty * (M.Universe.get(x.sym) || {}).px), 0) / total * 100 : 0;
    if (sectorWeight > 35) p.push(pt(-1, 3, `${inst.sector} is already ${sectorWeight.toFixed(0)}% of the portfolio. Adding here concentrates a bet you have already made.`, 'Portfolio Selection', 'portfolio'));
    else if (sectorWeight < 5) p.push(pt(1, 1.5, `${inst.sector} is only ${sectorWeight.toFixed(0)}% of the book — this adds a genuinely different exposure.`, 'Four Pillars', 'portfolio'));
    let maxCorr = 0, corrWith = '';
    for (const x of pos.slice(0, 20)) { const i = M.Universe.get(x.sym); if (!i || i === inst) continue; const c = M.Sim.corr(inst, i); if (Math.abs(c) > Math.abs(maxCorr)) { maxCorr = c; corrWith = x.sym; } }
    if (Math.abs(maxCorr) > .75) p.push(pt(-1, 2.5, `Daily returns correlate ${maxCorr.toFixed(2)} with ${corrWith}, which you already hold. At that correlation it is the same position twice, and correlations rise further in a sell-off.`, 'When Genius Failed', 'tail'));
    else if (Math.abs(maxCorr) < .3) p.push(pt(1, 2, `Highest correlation to anything in the book is ${maxCorr.toFixed(2)} (${corrWith}) — this genuinely diversifies.`, 'Portfolio Selection', 'portfolio'));
  }
  if (inst.type === 'etf' && inst.f && inst.f.expense != null) {
    if (inst.f.expense <= .1) p.push(pt(1, 2, `Expense ratio ${inst.f.expense}% — cost is the one input with a guaranteed negative return, and this one is near zero.`, 'Common Sense on Mutual Funds', 'portfolio'));
    else if (inst.f.expense > .5) p.push(pt(-1, 2.5, `Expense ratio ${inst.f.expense}% compounds to roughly ${(inst.f.expense * 20).toFixed(0)}% of capital over twenty years before any underperformance.`, 'Common Sense on Mutual Funds', 'portfolio'));
  }
  const r = settle(p); return Object.assign(r, { points: p });
});

// 14. The indexer — the null hypothesis, which deserves a seat.
seat('index', ctx => {
  const { inst, hist } = ctx, p = [];
  const spy = M.Universe.get('SPY');
  const isBench = /SPX|SPY|VOO|VTI|VT/.test(inst.sym);
  if (spy && !isBench && hist && hist.length > 60) {
    const n = Math.min(252, hist.length - 1);
    const rel = M.Sim.ret(inst, n) - M.Sim.ret(spy, n);
    // A couple of points either way is noise, not evidence of skill.
    p.push(pt(Math.abs(rel) < 4 ? 0 : rel > 0 ? 1 : -1, 2,
      Math.abs(rel) < 4
        ? `Within ${Math.abs(rel).toFixed(1)} points of the S&P 500 over the last year — indistinguishable from the index, which means the single-name risk is being taken for nothing.`
        : `Over the last year this has ${rel > 0 ? 'beaten' : 'lagged'} the S&P 500 by ${Math.abs(rel).toFixed(1)} points. The index is the thing any single position has to beat to have been worth the work.`,
      'Little Book of Common Sense', 'index'));
  }
  if (isBench) p.push(pt(1, 3, 'This is the baseline itself. Owning the whole market at a few basis points is the decision not to need an edge, and over most measured periods it has beaten the people who thought they had one.', 'Index Revolution', 'index'));
  if (inst.type === 'stock') p.push(pt(0, 1.6, 'The honest baseline: a total-market fund at three to nine basis points captures the market return with no research, no timing and no single-company risk. Any position here has to clear that bar after tax and after the time it takes to hold it.', 'Little Book of Common Sense', 'index'));
  if (inst.type === 'etf' && /Total|S&P|500/i.test(inst.name)) p.push(pt(1, 2.5, 'This is the baseline. Owning it is the decision not to need an edge.', 'Index Revolution', 'index'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 15. Valuation craft — DCF, reverse DCF and relative multiples.
seat('valuation', ctx => {
  const { f, inst, px, macro } = ctx, p = [];
  if (!f || inst.type !== 'stock' || !finite(f.fcf)) return { score: 0, confidence: .1, points: [] };
  // Discount rate built from the real long yield plus an equity premium
  // adjusted for beta — not a number pulled out of the air.
  const rf = (M.Universe.get('US10Y') || { px: 4.3 }).px;
  const erp = 4.6;
  const wacc = M.clamp(rf + erp * (f.beta || 1), 5, 18) / 100;
  const g1 = M.clamp((f.revGrowth3y || f.revGrowth || 4) / 100, -.1, .35);
  const gT = Math.min(0.025, rf / 100 * .55);                      // terminal growth below the risk-free rate, always
  let pv = 0, cf = Math.max(0, f.fcf);
  for (let y = 1; y <= 10; y++) { const g = g1 + (gT - g1) * (y / 10); cf *= (1 + g); pv += cf / Math.pow(1 + wacc, y); }
  const terminal = cf * (1 + gT) / (wacc - gT) / Math.pow(1 + wacc, 10);
  const equity = pv + terminal - (f.netDebt || 0);
  const fair = equity / f.shares;
  if (fair > 0) {
    const gap = (fair / px - 1) * 100;
    p.push(pt(gap > 20 ? 1 : gap < -20 ? -1 : 0, 4, `Ten-year DCF at a ${(wacc * 100).toFixed(1)}% discount rate (${rf.toFixed(2)}% risk-free plus ${erp}% equity premium × beta ${(f.beta || 1).toFixed(2)}), fading growth from ${(g1 * 100).toFixed(1)}% to ${(gT * 100).toFixed(1)}%, gives ${M.fmt.usd2(fair)} a share — ${gap > 0 ? 'a ' + gap.toFixed(0) + '% discount to' : (-gap).toFixed(0) + '% above'} the current price.`, 'Investment Valuation', 'valuation'));
  }
  // Reverse DCF: what does the price already require?
  if (f.fcf > 0) {
    let lo = -.2, hi = .6;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      let v = 0, c = f.fcf;
      for (let y = 1; y <= 10; y++) { const g = mid + (gT - mid) * (y / 10); c *= (1 + g); v += c / Math.pow(1 + wacc, y); }
      v += c * (1 + gT) / (wacc - gT) / Math.pow(1 + wacc, 10);
      const implied = (v - (f.netDebt || 0)) / f.shares;
      if (implied > px) hi = mid; else lo = mid;
    }
    const req = (lo + hi) / 2 * 100;
    const plausible = req < Math.max(6, (f.revGrowth3y || f.revGrowth || 5) * 1.3);
    p.push(pt(plausible ? 1 : -1, 3.5, `Run backwards, the price requires ${req.toFixed(1)}% annual free cash flow growth for a decade. The business has been doing ${(f.revGrowth3y || f.revGrowth || 0).toFixed(1)}%. ${plausible ? 'That is a bar the record clears.' : 'That is a bar the record does not clear — you would be paying for an improvement that has not happened yet.'}`, 'Expectations Investing', 'valuation'));
  }
  if (finite(f.evEbitda) && f.evEbitda > 0) {
    const comp = M.Universe.compSet(inst).filter(x => x.f && x.f.evEbitda > 0);
    if (comp.length > 2) {
      const med = comp.map(c => c.f.evEbitda).sort((a, b) => a - b)[Math.floor(comp.length / 2)];
      p.push(pt(f.evEbitda < med ? 1 : -1, 2, `EV/EBITDA of ${f.evEbitda.toFixed(1)} against an industry median of ${med.toFixed(1)}. Relative multiples answer "cheap compared to what", which is a different question from "cheap".`, 'Little Book of Valuation', 'valuation'));
    }
  }
  if (finite(f.fcfYield) && f.fcfYield > 0) {
    const bill = (M.Universe.get('US3M') || { px: 4.7 }).px;
    p.push(pt(f.fcfYield > bill + 2 ? 1 : f.fcfYield < bill ? -1 : 0, 2.5, `Free cash flow yield of ${f.fcfYield.toFixed(1)}% against ${bill.toFixed(2)}% on a three-month bill. ${f.fcfYield < bill ? 'You are taking equity risk for less than cash pays.' : 'The equity is paying a real premium over cash.'}`, 'Investment Valuation', 'valuation'));
  }
  const r = settle(p); return Object.assign(r, { points: p, dcf: fair, wacc });
});

// 16. The short side — argues the other way on purpose.
seat('shortside', ctx => {
  const { f, inst, tech } = ctx, p = [];
  if (!f || inst.type !== 'stock') return { score: 0, confidence: 0, points: [] };
  const flags = [];
  if (f.accruals > 5) flags.push('accruals running well ahead of cash');
  if (f.shareChange > 4) flags.push('serial share issuance');
  if (f.netDebtEbitda > 4.5) flags.push('a leverage level that needs the cycle to cooperate');
  if (f.pe > 60) flags.push('a multiple that needs a decade of execution');
  if (f.revGrowth < 0 && f.pe > 25) flags.push('a premium multiple on a shrinking business');
  if (f.opMargin < 0) flags.push('no operating profit');
  if (flags.length >= 2) p.push(pt(-1, 3.5, `Short-side case: ${flags.join(', ')}. Any single one is survivable; the combination is the profile that shows up in post-mortems.`, 'Art of Short Selling', 'shortside'));
  else if (!flags.length) p.push(pt(1, 2, 'Nothing here fits the standard short profile — no accrual blow-out, no serial dilution, no leverage cliff.', 'Art of Short Selling', 'shortside'));
  if (f.shortFloat > 18) p.push(pt(0, 1.5, `${f.shortFloat.toFixed(0)}% short interest. Someone with a research budget has done this work and concluded the opposite. That is worth knowing before you take the other side.`, 'Fooling Some', 'shortside'));
  if (tech && tech.stage.n === 4 && f.pe > 20) p.push(pt(-1, 2, 'A declining stage-4 chart on a still-full multiple is the shape of a de-rating in progress, not a bargain forming.', 'Dead Companies Walking', 'distress'));
  p.push(pt(0, .8, 'A short thesis needs a catalyst and a horizon. Being right early is operationally the same as being wrong.', 'Big Short', 'shortside'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 17. Fixed income — only speaks when the instrument is a bond or a rate fund.
seat('fixed', ctx => {
  const { inst, macro } = ctx, p = [];
  const isRate = inst.type === 'bond' || (inst.type === 'etf' && /Treas|Bond|Credit|Yield|Muni|Inflation|Bills/i.test(inst.sector));
  if (!isRate) return { score: 0, confidence: 0, points: [] };
  const f = inst.f || {};
  const y = f.yield != null ? f.yield : f.divYield || 0;
  const dur = f.duration != null ? f.duration : f.maturity ? f.maturity * .85 : 6;
  p.push(pt(0, 1, `Yield ${y.toFixed(2)}%, approximate duration ${dur.toFixed(1)}. A one-point rise in yields costs roughly ${dur.toFixed(1)}% of principal; a one-point fall pays about the same plus convexity.`, 'Handbook of Fixed Income', 'fixed'));
  const ten = (M.Universe.get('US10Y') || { px: 4.3 }).px, two = (M.Universe.get('US2Y') || { px: 4.0 }).px;
  const slope = ten - two;
  p.push(pt(slope > 0 ? 1 : 0, 1.5, `2s10s at ${(slope * 100).toFixed(0)}bp — ${slope < 0 ? 'still inverted. Historically the recession arrives after the disinversion, not at the inversion.' : 'positively sloped, which pays you to take duration again.'}`, 'Interest Rate Markets', 'fixed'));
  if (macro.fiscalDominance > .45 && dur > 8) p.push(pt(-1, 3, `Long duration against a deficit running ${macro.deficitPct.toFixed(1)}% of GDP: the supply has to clear, and term premium is the price that clears it.`, 'History of Interest Rates', 'fixed'));
  if (y > 5.5 && /High Yield/i.test(inst.sector)) p.push(pt(-1, 2, `A ${y.toFixed(1)}% yield on high yield looks generous until you subtract the default rate. Spread, not yield, is the number to judge it on.`, 'Handbook of Fixed Income', 'fixed'));
  if (/Bills|T-Bill/i.test(inst.sector) && y > 4) p.push(pt(1, 2.5, `${y.toFixed(2)}% at the front end with effectively no duration risk. That is the hurdle every other idea in this terminal has to beat.`, 'Bond Book', 'fixed'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 18. Digital assets.
seat('crypto', ctx => {
  const { inst } = ctx, p = [];
  if (inst.type !== 'crypto' && !/MSTR|COIN|MARA|RIOT/.test(inst.sym)) return { score: 0, confidence: 0, points: [] };
  const f = inst.f || {};
  if (inst.type === 'crypto') {
    if (f.maxSupply) {
      const issued = f.supply / f.maxSupply * 100;
      p.push(pt(1, 2.5, `${issued.toFixed(1)}% of the maximum supply is already issued. Verifiable scarcity with a fixed schedule is the entire monetary claim — there is no cash flow underneath it.`, 'Bitcoin Standard', 'crypto'));
    } else {
      p.push(pt(-1, 1.5, 'No hard supply cap. The value has to come from fee demand on the network, which means it should be valued like infrastructure, not like money.', 'Infinite Machine', 'crypto'));
    }
    p.push(pt(0, 2, `Market value ${M.fmt.cap(f.mcap || inst.px * (f.supply || 0))}. There is no balance sheet, no earnings and no regulator of last resort. Everything above is a statement about adoption, not about a business.`, 'Digital Gold', 'crypto'));
    p.push(pt(-1, 2, 'Drawdowns of 70%+ have occurred in every cycle to date, and leverage in this market unwinds in hours rather than quarters.', 'Antifragile', 'tail'));
  } else {
    p.push(pt(0, 2, `${inst.sym} is a listed proxy for digital asset prices, which means it carries the asset's volatility plus equity, financing and management risk on top.`, 'Layered Money', 'crypto'));
  }
  const r = settle(p); return Object.assign(r, { points: p });
});

// 19. Commodities and real assets.
seat('commodity', ctx => {
  const { inst, macro } = ctx, p = [];
  const isCom = inst.type === 'future' && /Energy|Metals|Agriculture/.test(inst.sector) || /GLD|SLV|IAU|USO|DBC/.test(inst.sym) || /Gold|Copper|Steel/.test(inst.industry);
  if (!isCom) return { score: 0, confidence: 0, points: [] };
  p.push(pt(0, 1.2, 'A commodity has no cash flow. The return is spot change plus roll yield minus storage, and over long periods roll has supplied most of it.', 'Facts and Fantasies', 'commodity'));
  if (/Gold|GLD|IAU|GC/.test(inst.sym + inst.industry)) {
    p.push(pt(macro.fiscalDominance > .4 ? 1 : 0, 3, `Gold's case is monetary, not industrial: with net interest at ${macro.interestShare.toFixed(0)}% of federal receipts and the deficit at ${macro.deficitPct.toFixed(1)}% of GDP, the asset that is nobody's liability has a role. Size it as insurance.`, 'New Case for Gold', 'commodity'));
  }
  if (/Copper|HG|FCX/.test(inst.sym + inst.industry)) p.push(pt(1, 2, 'Copper is the cleanest expression of electrification demand against a supply response that takes a decade to arrive. The cycle is the thesis and the risk.', 'Hot Commodities', 'commodity'));
  if (/CL|BZ|USO|XLE/.test(inst.sym)) p.push(pt(0, 2, 'Oil is priced by the marginal barrel, and the marginal barrel has a government attached to it. Political risk is not a tail here, it is the base case.', 'Prize', 'commodity'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 20. Market history — the long view, always a small weight, never silent.
seat('history', ctx => {
  const { inst, f } = ctx, p = [];
  p.push(pt(0, 1, 'Over a century and across sixteen countries, equities beat bonds and bills nearly everywhere — but the premium was smaller and far more variable than the folklore, and two markets went to zero.', 'Triumph of the Optimists', 'history'));
  if (f && f.pe > 40 && inst.type === 'stock') p.push(pt(-1, 2, `A multiple of ${f.pe.toFixed(0)}× has, historically, required either extraordinary growth or a long wait. Both have happened; the second is more common.`, 'Stocks for the Long Run', 'history'));
  const reg = M.Sim.regime;
  if (reg === 'crisis') p.push(pt(1, 2, 'Every great bottom shared the same markers: collapsed volumes, very low cyclically adjusted multiples, and bad news that had stopped moving prices. Check which of those are present before calling this one.', 'Anatomy of the Bear', 'macro'));
  if (reg === 'bull' && ctx.tech && ctx.tech.pctOfHigh > 98) p.push(pt(-1, 1.5, 'Accelerating price into a high is the measurable signature that precedes a break — faster-than-exponential growth, not merely an elevated level.', 'Why Stock Markets Crash', 'history'));
  const r = settle(p); return Object.assign(r, { points: p });
});

// 21. Volatility — speaks when there is an options-shaped decision to make.
seat('options', ctx => {
  const { inst, tech } = ctx, p = [];
  const rv = M.Sim.realisedVol(inst);
  const iv = rv * (1.05 + (M.Sim.regime === 'crisis' ? .5 : M.Sim.regime === 'bear' ? .22 : .08));
  p.push(pt(0, 1.4, `Realised volatility ${rv.toFixed(0)}%, implied around ${iv.toFixed(0)}% on the usual premium. The gap between them is what an option seller is paid and an option buyer pays.`, 'Volatility Trading', 'options'));
  if (iv - rv > 8) p.push(pt(0, 1.6, `Implied is running ${(iv - rv).toFixed(0)} points over realised. Selling covered calls or cash-secured puts is the structurally favoured side here — and the one that loses badly in the gap.`, 'Option Volatility', 'options'));
  if (tech && tech.bbWidth != null && tech.bbWidth < 6) p.push(pt(0, 1.4, `Bollinger width at ${tech.bbWidth.toFixed(1)}% is a volatility compression. Compression resolves into expansion; it does not tell you the direction, which is the argument for a straddle rather than a direction.`, 'Option Volatility', 'options'));
  if (M.Sim.regime === 'crisis') p.push(pt(0, 1.2, 'In a gap the textbook greeks stop describing the position. Know what the payoff is at the discontinuity, not at the derivative.', 'Dynamic Hedging', 'options'));
  const r = settle(p); return Object.assign(r, { points: p, rv, iv });
});

// 22. Hard money — the seat the debt board exists to inform.
seat('monetary', ctx => {
  const { macro, inst } = ctx, p = [];
  p.push(pt(0, 1.2, `Measured in dollars, everything here is priced in a unit whose supply grew ${macro.m2Growth.toFixed(1)}% last year and ${macro.realWageGap.toFixed(0)}× faster than wages since 1913. A nominal gain is not automatically a real one.`, 'What Has Government', 'monetary'));
  if (macro.debtToGdp > 110) p.push(pt(-1, 2, `Federal debt at ${macro.debtToGdp.toFixed(0)}% of GDP. No large economy has reduced a burden that size through growth alone; the historical routes are inflation, financial repression or restructuring.`, 'This Time Is Different', 'macro'));
  if (inst.type === 'crypto' || /GLD|IAU|SLV|GC|SI/.test(inst.sym)) p.push(pt(1, 2, 'Assets outside the credit system are the direct hedge against the above. They pay nothing, which is the premium you pay for that property.', 'Denationalisation of Money', 'monetary'));
  if (inst.type === 'bond') p.push(pt(-1, 1.8, 'A nominal bond is a promise denominated in the thing being devalued. The coupon has to clear inflation before it clears anything else.', 'Gold: The Once and Future', 'monetary'));
  if (inst.type === 'stock' || inst.type === 'index' || (inst.type === 'etf' && !/Bond|Treas|Credit|Bills/i.test(inst.sector))) p.push(pt(1, 2, 'An equity is a claim on a stream of cash flows that reprice with the currency, and on real assets behind them. It is an imperfect hedge against debasement, but it is on the right side of it — unlike the bond.', 'Price of Tomorrow', 'monetary'));
  const r = settle(p); return Object.assign(r, { points: p });
});

A.seatList = () => Object.values(A.seats);
})();
