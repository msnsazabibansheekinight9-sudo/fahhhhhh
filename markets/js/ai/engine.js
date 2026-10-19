// ============================================================================
// TERMINAL — the engine that convenes the council. Builds one context object,
// runs every seat against it, weights them by instrument type and by where the
// cycle is, and resolves the disagreement into a verdict with a position size,
// a bear case and a list of things that would change the answer.
//
// It is deterministic and local. There is no model call in here. If a language
// model key is set, the engine hands it the finished verdict to write up, and
// that prose is labelled as prose — it never changes the numbers.
// ============================================================================
'use strict';
(function () {
const E = M.AI = {};
const A = M.Analysts, L = M.Library, U = M.Universe;

// Base weight per seat, then multiplied by the instrument type and the regime.
const BASE = {
  value: 1.0, quality: 1.15, growth: 1.0, quant: 1.0, accounting: 1.1, distress: .95,
  macro: .9, cycles: 1.0, tail: 1.05, behaviour: .7, technical: .9, risk: .8,
  portfolio: .7, index: .6, valuation: 1.3, shortside: .9, fixed: .4, crypto: .4,
  commodity: .4, history: .5, options: .4, monetary: .5
};
const BY_TYPE = {
  stock: {},
  etf: { value: .2, quality: .2, growth: .2, accounting: .1, distress: .1, valuation: .3, shortside: .1, portfolio: 1.8, index: 2.0, fixed: 1.4, quant: 1.2, macro: 1.3 },
  bond: { value: 0, quality: 0, growth: 0, accounting: 0, distress: .2, valuation: 0, shortside: 0, technical: .5, fixed: 3.0, macro: 2.0, monetary: 1.6, portfolio: 1.3, index: .4 },
  crypto: { value: 0, quality: 0, growth: 0, accounting: 0, distress: 0, valuation: 0, shortside: .3, crypto: 3.2, monetary: 2.0, tail: 2.0, technical: 1.4, quant: 1.2, macro: 1.2, index: .8 },
  future: { value: 0, quality: 0, growth: 0, accounting: 0, distress: 0, valuation: 0, shortside: 0, commodity: 3.0, technical: 1.6, macro: 1.6, tail: 1.5, options: 1.4 },
  fx: { value: 0, quality: 0, growth: 0, accounting: 0, distress: 0, valuation: 0, shortside: 0, macro: 2.6, monetary: 2.2, technical: 1.6, tail: 1.2 },
  index: { value: .2, quality: .2, growth: .3, accounting: 0, distress: 0, valuation: .4, macro: 1.8, cycles: 1.8, technical: 1.4, history: 1.4, index: 1.6 }
};
// Late in a credit cycle the balance-sheet seats should be louder than the
// momentum seats. This is the one place a "view" is encoded, and it is explicit.
const BY_REGIME = {
  bull: { technical: 1.3, growth: 1.2, quant: 1.15, value: .85, tail: .9, distress: .85 },
  chop: {},
  bear: { value: 1.25, quality: 1.2, distress: 1.3, tail: 1.3, accounting: 1.2, growth: .75, technical: 1.1 },
  crisis: { tail: 1.8, distress: 1.6, value: 1.3, quality: 1.25, macro: 1.4, growth: .5, technical: .8, behaviour: 1.2 }
};

function weightFor(seatId, type, regime) {
  const t = BY_TYPE[type] || {};
  const base = BASE[seatId] == null ? .5 : BASE[seatId];
  const tm = t[seatId] == null ? 1 : t[seatId];
  const rm = (BY_REGIME[regime] || {})[seatId] == null ? 1 : BY_REGIME[regime][seatId];
  return base * tm * rm;
}

// ------------------------------------------------------------------ context
E.context = (inst) => {
  const hist = M.Sim.history(inst, '1D');
  return {
    inst, f: inst.f, px: inst.px, type: inst.type, hist,
    tech: M.TA.snapshot(hist),
    macro: M.Debt.macro(),
    regime: M.Sim.regime,
    newsPulse: M.News ? M.News.pulseFor(inst.sym, 96) : null,
    peers: U.compSet(inst)
  };
};

// ------------------------------------------------------------------ the run
E.analyse = (symOrInst) => {
  const inst = typeof symOrInst === 'string' ? U.get(symOrInst) : symOrInst;
  if (!inst) return null;
  const ctx = E.context(inst);
  const results = [];
  // First pass: everyone except the sizing seat, which needs the consensus.
  for (const seat of A.seatList()) {
    if (seat.id === 'risk') continue;
    const w = weightFor(seat.id, inst.type, ctx.regime);
    if (w <= 0.01) continue;
    let out;
    try { out = seat.run(ctx); } catch (e) { console.warn('[seat]', seat.id, e); continue; }
    if (!out || !out.points || !out.points.length) continue;
    results.push(Object.assign({ seat: seat.id, name: seat.school.seat, school: seat.school.name, colour: seat.school.colour, weight: w }, out));
  }
  // Consensus so far, then the sizing seat, which is a function of it.
  const pre = weighted(results);
  ctx.priorScore = pre.score;
  const riskSeat = A.seats.risk;
  try {
    const out = riskSeat.run(ctx);
    results.push(Object.assign({ seat: 'risk', name: riskSeat.school.seat, school: riskSeat.school.name, colour: riskSeat.school.colour, weight: weightFor('risk', inst.type, ctx.regime) }, out));
  } catch (e) {}

  const cons = weighted(results);
  const sorted = [...results].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const bulls = sorted.filter(r => r.score > 12);
  const bears = [...sorted].reverse().filter(r => r.score < -12);

  // Dispersion is the honest confidence signal: a council that agrees is worth
  // more than one that averages out to the same number from opposite corners.
  const ws = results.reduce((a, r) => a + r.weight, 0) || 1;
  const mean = cons.score;
  const variance = results.reduce((a, r) => a + r.weight * (r.score - mean) ** 2, 0) / ws;
  const dispersion = Math.sqrt(variance);
  const confidence = M.clamp((results.reduce((a, r) => a + r.confidence * r.weight, 0) / ws) * (1 - M.clamp(dispersion / 110, 0, .45)), .05, .95);

  const verdict = label(cons.score, confidence);
  const val = results.find(r => r.seat === 'valuation');
  const rk = results.find(r => r.seat === 'risk');
  const dist = results.find(r => r.seat === 'distress');
  const acct = results.find(r => r.seat === 'accounting');

  const out = {
    sym: inst.sym, name: inst.name, px: inst.px, at: Date.now(), type: inst.type,
    score: cons.score, confidence, dispersion, verdict,
    results: sorted, bulls, bears,
    targets: targets(inst, ctx, val),
    sizing: sizing(inst, ctx, cons.score, confidence, rk),
    risks: risks(inst, ctx, results),
    falsifiers: falsifiers(inst, ctx, results),
    debate: debate(bulls, bears, cons.score),
    fscore: acct ? acct.fscore : null,
    zscore: dist ? dist.z : null,
    regime: M.Sim.regimeInfo(),
    dataQuality: quality(inst)
  };
  M.emit('ai:verdict', out);
  return out;
};

function weighted(results) {
  let s = 0, w = 0;
  for (const r of results) { s += r.score * r.weight * (0.45 + r.confidence * 0.55); w += r.weight * (0.45 + r.confidence * 0.55); }
  return { score: w ? s / w : 0 };
}

function label(score, conf) {
  const strong = conf > .5;
  if (score > 45) return { id: 'strongbuy', text: strong ? 'Strong buy' : 'Buy — thesis intact but the council is split', tone: 'g' };
  if (score > 18) return { id: 'buy', text: 'Buy', tone: 'g' };
  if (score > 6) return { id: 'accumulate', text: 'Accumulate on weakness', tone: 'g' };
  if (score > -6) return { id: 'hold', text: 'Hold — no edge either way', tone: 'n' };
  if (score > -18) return { id: 'reduce', text: 'Reduce into strength', tone: 'y' };
  if (score > -45) return { id: 'sell', text: 'Sell', tone: 'r' };
  return { id: 'avoid', text: 'Avoid', tone: 'r' };
}

// Three independent anchors, kept separate rather than averaged into one
// false-precision "price target".
function targets(inst, ctx, val) {
  const f = ctx.f, px = inst.px, out = [];
  if (val && val.dcf > 0) out.push({ method: 'Discounted cash flow', v: val.dcf, note: `10-year fade at a ${(val.wacc * 100).toFixed(1)}% discount rate` });
  if (f && f.eps > 0 && f.bvps > 0) out.push({ method: 'Graham number', v: Math.sqrt(22.5 * f.eps * f.bvps), note: 'Defensive formula: √(22.5 × EPS × book value)' });
  if (f && f.eps > 0 && inst.type === 'stock') {
    const comp = U.compSet(inst).filter(x => x.f && x.f.pe > 0);
    if (comp.length > 2) {
      const med = comp.map(c => c.f.pe).sort((a, b) => a - b)[Math.floor(comp.length / 2)];
      out.push({ method: 'Peer multiple', v: med * f.eps, note: `Industry median P/E of ${med.toFixed(1)} on trailing EPS` });
    }
  }
  if (ctx.tech) {
    if (ctx.tech.levels.length) {
      const res = ctx.tech.levels.filter(l => l.p > px).sort((a, b) => a.p - b.p)[0];
      const sup = ctx.tech.levels.filter(l => l.p < px).sort((a, b) => b.p - a.p)[0];
      if (res) out.push({ method: 'Next resistance', v: res.p, note: `Tested ${res.touches} times`, tech: true });
      if (sup) out.push({ method: 'Nearest support', v: sup.p, note: `Tested ${sup.touches} times`, tech: true });
    }
  }
  const fundamental = out.filter(o => !o.tech && o.v > 0);
  const lo = fundamental.length ? Math.min(...fundamental.map(o => o.v)) : px;
  const hi = fundamental.length ? Math.max(...fundamental.map(o => o.v)) : px;
  return { anchors: out, range: { lo, hi }, upside: fundamental.length ? ((lo + hi) / 2 / px - 1) * 100 : 0 };
}

function sizing(inst, ctx, score, conf, rk) {
  const rv = M.Sim.realisedVol(inst) / 100 || .3;
  const qk = rk && isFinite(rk.quarterKelly) ? rk.quarterKelly : 0;
  // Three constraints; the position is the smallest of them. Kelly on a
  // conviction-derived edge, a volatility-parity cap, and a hard cap per name.
  const kellyPct = M.clamp(qk * 100, -12, 12);
  const volParity = M.clamp(12 / (rv * 100) * 10, 1, 15);
  const hardCap = inst.type === 'crypto' ? 3 : inst.type === 'future' ? 4 : 8;
  const pct = M.clamp(Math.min(Math.abs(kellyPct), volParity, hardCap) * Math.sign(score) * conf, -hardCap, hardCap);
  return {
    pct, kellyPct, volParity, hardCap,
    stop: rk && rk.atrStop ? rk.atrStop : rv * 100 / 8,
    note: Math.abs(pct) < .5
      ? 'No size. The edge does not survive the sizing rules, which is the same as not having one.'
      : `${pct > 0 ? 'Long' : 'Short'} ${Math.abs(pct).toFixed(1)}% of capital — the smallest of quarter-Kelly (${Math.abs(kellyPct).toFixed(1)}%), volatility parity (${volParity.toFixed(1)}%) and the per-name cap (${hardCap}%), scaled by a confidence of ${(conf * 100).toFixed(0)}%.`
  };
}

function risks(inst, ctx, results) {
  const out = [];
  for (const r of results) for (const p of r.points) if (p.dir < 0 && p.w >= 2.5) out.push({ seat: r.name, text: p.text, book: p.book, w: p.w * r.weight });
  return out.sort((a, b) => b.w - a.w).slice(0, 7);
}

// What specific, observable thing would overturn this? A verdict with no
// falsifier is an opinion.
function falsifiers(inst, ctx, results) {
  const f = ctx.f, out = [];
  const bull = results.reduce((a, r) => a + r.score * r.weight, 0) > 0;
  if (f && inst.type === 'stock') {
    if (bull) {
      out.push(`Operating cash flow falls below net income for two consecutive quarters — the thesis assumes the earnings are being collected.`);
      if (f.revGrowth > 8) out.push(`Revenue growth drops below ${(f.revGrowth / 2).toFixed(0)}% — half the current rate is where the valuation stops working.`);
      if (f.grossMargin > 30) out.push(`Gross margin falls more than 300bp from ${f.grossMargin.toFixed(0)}% — that would say the pricing power is not real.`);
      out.push(`Share count rises instead of falling, which would mean the capital return story has reversed.`);
    } else {
      out.push(`Free cash flow turns positive and stays there for three quarters — that removes the core objection.`);
      if (f.debtEquity > 1.5) out.push(`Net debt to EBITDA falls below 2.5× from ${f.netDebtEbitda.toFixed(1)}× — the leverage case goes away at that point.`);
      out.push(`The multiple compresses to the industry median without the business deteriorating, which would make the valuation objection moot.`);
    }
  }
  if (ctx.tech) out.push(`Price ${bull ? 'closes below' : 'reclaims'} the 200-day average at ${M.fmt.px(ctx.tech.sma200 || ctx.px)} on above-average volume.`);
  out.push(`The regime changes out of ${M.Sim.regimeInfo().name.toLowerCase()} — several of these weights are conditional on it.`);
  if (ctx.macro.interestShare > 15) out.push(`Net interest falls back below 15% of federal receipts, which would loosen the macro constraint the council is pricing.`);
  return out.slice(0, 6);
}

// The disagreement, written out. Two seats arguing is more informative than
// one average.
function debate(bulls, bears, score) {
  const rounds = [];
  const n = Math.max(bulls.length, bears.length);
  for (let i = 0; i < Math.min(4, n); i++) {
    const b = bulls[i], r = bears[i];
    if (b) { const pt = b.points.filter(p => p.dir > 0).sort((x, y) => y.w - x.w)[0]; if (pt) rounds.push({ side: 'bull', seat: b.name, school: b.school, colour: b.colour, text: pt.text, book: pt.book }); }
    if (r) { const pt = r.points.filter(p => p.dir < 0).sort((x, y) => y.w - x.w)[0]; if (pt) rounds.push({ side: 'bear', seat: r.name, school: r.school, colour: r.colour, text: pt.text, book: pt.book }); }
  }
  let close;
  if (!bulls.length) close = 'No seat is arguing the long side. That is a cleaner signal than any single score.';
  else if (!bears.length) close = 'No seat is objecting, which is itself a warning: it usually means the risks are not visible in the numbers yet.';
  else if (Math.abs(score) < 10) close = 'The council is genuinely split. A split council is a reason to pass, not to take a half position in both directions.';
  else close = `The ${score > 0 ? 'long' : 'short'} side carries it, but ${score > 0 ? bears.length : bulls.length} seats are on the other side and their objections are listed below.`;
  return { rounds, close };
}

// Says plainly how much of this rests on modelled numbers.
function quality(inst) {
  const live = inst.src === 'live', fLive = inst.fSrc === 'live';
  return {
    price: live ? 'live' : 'sim', priceSrc: inst.srcName || 'simulated tape',
    fundamentals: fLive ? 'live' : 'sim', fundSrc: (inst.f && inst.f.src) || 'modelled from sector medians',
    note: live && fLive ? 'Price and fundamentals are both from a live provider.'
      : live ? 'Price is live; fundamentals are modelled, so every valuation figure below is illustrative.'
      : fLive ? 'Fundamentals are live; the price is from the simulated tape.'
      : 'Both price and fundamentals are modelled. Treat this as a demonstration of the method, not as advice about a real position.'
  };
}

// ------------------------------------------------------------------ portfolio view
E.analysePortfolio = () => {
  const pos = M.Portfolio ? M.Portfolio.positions : [];
  if (!pos.length) return null;
  const mv = M.Portfolio.marketValue();
  const rows = pos.map(p => { const i = U.get(p.sym); return i ? { pos: p, inst: i, v: p.qty * i.px, w: mv ? p.qty * i.px / mv * 100 : 0 } : null; }).filter(Boolean);
  const bySector = {};
  for (const r of rows) bySector[r.inst.sector] = (bySector[r.inst.sector] || 0) + r.w;
  const top = rows.sort((a, b) => Math.abs(b.w) - Math.abs(a.w))[0];
  // Portfolio volatility with the real correlation matrix, not the naive sum.
  let varSum = 0;
  for (const a of rows) for (const b of rows) {
    const va = M.Sim.realisedVol(a.inst) / 100, vb = M.Sim.realisedVol(b.inst) / 100;
    varSum += (a.w / 100) * (b.w / 100) * va * vb * (a === b ? 1 : M.Sim.corr(a.inst, b.inst));
  }
  const portVol = Math.sqrt(Math.max(0, varSum)) * 100;
  const naive = rows.reduce((s, r) => s + Math.abs(r.w / 100) * M.Sim.realisedVol(r.inst), 0);
  const beta = rows.reduce((s, r) => s + (r.w / 100) * ((r.inst.f && r.inst.f.beta) || 1), 0);
  const findings = [];
  for (const s in bySector) if (bySector[s] > 35) findings.push({ sev: 'high', text: `${s} is ${bySector[s].toFixed(0)}% of the book. Markowitz's point is that risk is a property of the portfolio — this is one bet wearing several tickers.`, book: L.cite('portfolio', 'Portfolio Selection') });
  if (top && Math.abs(top.w) > 25) findings.push({ sev: 'high', text: `${top.pos.sym} is ${top.w.toFixed(0)}% of the portfolio. A single-name weight at that level means one earnings miss sets the year.`, book: L.cite('risk', 'Market Wizards') });
  if (portVol > naive * .92) findings.push({ sev: 'high', text: `Portfolio volatility (${portVol.toFixed(1)}%) is almost the same as the weighted average of the holdings (${naive.toFixed(1)}%) — the positions are moving together, so there is no diversification being earned.`, book: L.cite('tail', 'When Genius Failed') });
  else findings.push({ sev: 'ok', text: `Diversification is doing real work: portfolio volatility ${portVol.toFixed(1)}% against ${naive.toFixed(1)}% for the weighted average of the parts.`, book: L.cite('portfolio', 'Portfolio Selection') });
  if (Math.abs(beta) > 1.3) findings.push({ sev: 'med', text: `Portfolio beta of ${beta.toFixed(2)} — in a 20% market decline this book is positioned to lose about ${(beta * 20).toFixed(0)}% before stock selection is considered.`, book: L.cite('portfolio', 'Four Pillars') });
  const cash = M.Portfolio.cash, total = mv + cash;
  if (total && cash / total < .03 && M.Sim.regime !== 'bull') findings.push({ sev: 'med', text: `Cash is ${(cash / total * 100).toFixed(1)}% of the account outside a bull regime. Klarman's argument is that holding cash when nothing is cheap is a position, not a failure to act.`, book: L.cite('value', 'Margin of Safety') });
  return { rows, bySector, portVol, naive, beta, findings, mv, cash };
};

// ------------------------------------------------------------------ screening
// Runs the council over a list and ranks it. Deliberately capped: a full-council
// pass over 280 instruments is a lot of arithmetic to do on a click.
E.screen = (list, limit = 40) => list.slice(0, limit).map(i => { const a = E.analyse(i); return a ? { inst: i, score: a.score, verdict: a.verdict, confidence: a.confidence, upside: a.targets.upside } : null; }).filter(Boolean).sort((a, b) => b.score - a.score);

// ------------------------------------------------------------------ ask
// A router, not a chatbot: it matches the question to a computation and answers
// from live state. It says so when it does not understand, rather than inventing.
E.ask = (q) => {
  const text = String(q || '').trim();
  const t = text.toLowerCase();
  const syms = [...new Set(text.toUpperCase().match(/\b[A-Z][A-Z.]{0,5}\b/g) || [])].filter(s => U.has(s));
  let inst = syms.length ? U.get(syms[0]) : null;
  if (!inst) { const found = U.list.find(i => t.includes(i.name.toLowerCase().split(' ')[0].toLowerCase()) && i.name.split(' ')[0].length > 4); if (found) inst = found; }
  const out = { q: text, inst, blocks: [] };
  const say = (h, b, cite) => out.blocks.push({ h, b, cite });

  const want = {
    buy: /\b(buy|should i|worth it|good investment|invest in|bullish|long)\b/.test(t),
    sell: /\b(sell|short|bearish|dump|exit|get out)\b/.test(t),
    val: /\b(valuation|fair value|overvalued|undervalued|expensive|cheap|dcf|target|worth)\b/.test(t),
    risk: /\b(risk|downside|lose|drawdown|safe|danger|crash)\b/.test(t),
    size: /\b(how much|size|position|allocate|allocation|kelly)\b/.test(t),
    macro: /\b(debt|deficit|inflation|fed|rates|macro|economy|dollar|recession|gdp)\b/.test(t),
    tech: /\b(chart|technical|trend|support|resistance|rsi|moving average|breakout)\b/.test(t),
    news: /\b(news|happening|wire|tape|headline|story|stories|going on|why.*(down|up|moving))\b/.test(t),
    port: /\b(my portfolio|my positions|my book|diversif|holdings)\b/.test(t),
    book: /\b(books?|library|graham|buffett|munger|lynch|dalio|taleb|marks|greenblatt|damodaran|bogle|klarman|soros|minsky|piotroski|altman|kelly|wyckoff|schilit|beneish|markowitz|fisher|oneil|shiller|reads?)\b/.test(t),
    compare: /\b(vs|versus|compare|better than|or)\b/.test(t) && syms.length > 1
  };

  if (want.port) {
    const pa = E.analysePortfolio();
    if (!pa) say('No positions yet', 'The portfolio is empty, so there is nothing to diagnose. Open a paper position from any symbol page and the risk read appears here.');
    else {
      say('Portfolio risk', `Volatility ${pa.portVol.toFixed(1)}% annualised against ${pa.naive.toFixed(1)}% for the weighted average of the parts. Beta ${pa.beta.toFixed(2)}. Market value ${M.fmt.cap(pa.mv)} plus ${M.fmt.cap(pa.cash)} cash.`);
      for (const f of pa.findings) say(f.sev === 'high' ? 'Concentration' : f.sev === 'med' ? 'Exposure' : 'Working as intended', f.b || f.text, f.book);
    }
    return out;
  }

  if (want.compare && syms.length > 1) {
    const as = syms.slice(0, 3).map(s => E.analyse(s)).filter(Boolean);
    say('Side by side', as.map(a => `${a.sym}: council score ${a.score.toFixed(0)}, ${a.verdict.text.toLowerCase()}, confidence ${(a.confidence * 100).toFixed(0)}%.`).join(' '));
    const best = as.sort((a, b) => b.score - a.score)[0];
    say('Which one', `${best.sym} carries the higher score, driven by ${best.bulls.slice(0, 2).map(b => b.name).join(' and ') || 'no strong bull seat'}. The difference is only meaningful if it exceeds the dispersion, which here is ${best.dispersion.toFixed(0)} points.`, L.cite('behaviour', 'Thinking in Bets'));
    return out;
  }

  if (want.macro && !inst) {
    const m = M.Debt.macro(), s = M.Debt.snapshot();
    say('Where the sovereign balance sheet is', `Federal debt ${M.fmt.bigUsd(s.natDebt)}, which is ${m.debtToGdp.toFixed(1)}% of GDP. Net interest is ${M.fmt.bigUsd(s.netInterest)} a year, or ${m.interestShare.toFixed(1)}% of all federal receipts. The deficit is running ${m.deficitPct.toFixed(1)}% of GDP.`, L.cite('macro', 'This Time Is Different'));
    say('What that implies', m.fiscalDominance > .4
      ? `Fiscal dominance reads ${(m.fiscalDominance * 100).toFixed(0)}%. When interest absorbs this much of revenue, the issuance schedule starts setting the long end rather than the policy rate, which argues against long duration and for assets that are nobody's liability.`
      : `Interest is absorbing ${m.interestShare.toFixed(0)}% of receipts, which is high by post-war standards but not yet at the level where the fiscal position dictates monetary policy.`, L.cite('macro', 'Principles for Navigating'));
    say('And the unit of account', `Money supply has grown ${m.realWageGap.toFixed(1)} times faster than wages since 1913. Every return in this terminal is nominal; subtract that before calling it a gain.`, L.cite('monetary', 'What Has Government'));
    return out;
  }

  if (want.news && !inst) {
    const p = M.News.pulse(180);
    say('The wire right now', `${p.n} stories in the last three hours, net tone ${p.net > 0 ? '+' : ''}${(p.net * 100).toFixed(0)} on a −100 to +100 scale, average impact ${p.heat.toFixed(1)} out of 5.`);
    if (p.top) say('Biggest item', p.top.head + ' — ' + (p.top.body || '').slice(0, 220));
    return out;
  }

  if (want.book && !inst) {
    // Score every book by how many of the question's words it matches, so
    // "what did Graham mean by margin of safety" finds the margin-of-safety
    // books and not just the one whose author happens to be named last.
    const words = t.replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['what', 'does', 'mean', 'about', 'said', 'says', 'book', 'books', 'read', 'tell', 'explain', 'which', 'that', 'this', 'from', 'with', 'should'].includes(w));
    const scored = L.books.map(b => {
      const hay = (b.title + ' ' + b.author + ' ' + b.idea + ' ' + b.tag).toLowerCase();
      let n = 0;
      for (const w of words) if (hay.includes(w)) n += hay.includes(' ' + w) ? 2 : 1;
      // An author's surname in the question is a strong signal on its own.
      for (const part of b.author.toLowerCase().split(/[^a-z]+/)) if (part.length > 3 && words.includes(part)) n += 4;
      return { b, n };
    }).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    if (scored.length) {
      for (const { b } of scored.slice(0, 4)) say(`${b.title} — ${b.author}, ${b.year}`, b.idea, b);
      const school = L.schools[scored[0].b.school];
      say('The seat that applies it', `${school.seat} — ${school.name}. ${school.one}`);
      return out;
    }
  }

  if (!inst) {
    say('Which instrument?', `Name a ticker and the council will convene on it. There are ${U.count()} instruments loaded — stocks, ETFs, treasuries, futures, FX and crypto. You can also ask about the debt board, the news wire, your portfolio, or any of the ${L.count()} books in the library.`);
    return out;
  }

  // Symbol-specific.
  const a = E.analyse(inst);
  if (want.val) {
    say(`${inst.sym} valuation`, a.targets.anchors.filter(x => !x.tech).map(x => `${x.method}: ${M.fmt.usd2(x.v)} (${x.note}).`).join(' ') || 'No valuation anchor applies to this instrument type.', L.cite('valuation', 'Investment Valuation'));
    say('Against the price', `${M.fmt.usd2(inst.px)} now. The fundamental anchors span ${M.fmt.usd2(a.targets.range.lo)} to ${M.fmt.usd2(a.targets.range.hi)}, a midpoint ${a.targets.upside >= 0 ? 'above' : 'below'} the price by ${Math.abs(a.targets.upside).toFixed(0)}%.`);
  }
  if (want.tech && a.results.find(r => r.seat === 'technical')) {
    const tr = a.results.find(r => r.seat === 'technical');
    for (const p of tr.points.slice(0, 4)) say('Tape', p.text, p.book);
  }
  if (want.risk) for (const r of a.risks.slice(0, 4)) say(r.seat, r.text, r.book);
  if (want.size) say('Size', a.sizing.note, L.cite('risk', "Fortune's Formula"));
  if (want.news) { const rows = M.News.for(inst.sym, 4); if (rows.length) for (const n of rows) say(M.fmt.ago(n.t) + ' · ' + n.src, n.head); else say('No wire items', `Nothing on the wire for ${inst.sym} in the recent window.`); }
  if (!out.blocks.length || want.buy || want.sell) {
    say(`${inst.sym} — ${a.verdict.text}`, `Council score ${a.score.toFixed(0)} out of ±100 at ${(a.confidence * 100).toFixed(0)}% confidence, with ${a.dispersion.toFixed(0)} points of disagreement between seats. ${a.debate.close}`);
    for (const b of a.bulls.slice(0, 2)) { const p = b.points.filter(x => x.dir > 0).sort((x, y) => y.w - x.w)[0]; if (p) say('For — ' + b.name, p.text, p.book); }
    for (const b of a.bears.slice(0, 2)) { const p = b.points.filter(x => x.dir < 0).sort((x, y) => y.w - x.w)[0]; if (p) say('Against — ' + b.name, p.text, p.book); }
    say('Size', a.sizing.note, L.cite('risk', "Fortune's Formula"));
  }
  say('Data quality', a.dataQuality.note);
  out.verdict = a;
  return out;
};

// Optional: hand the finished verdict to a language model to write up. The
// numbers are already fixed before this runs.
E.brief = async (verdict) => {
  const sys = 'You are writing an investment committee note. You will be given a finished, computed verdict from a deterministic multi-framework analysis engine. Write it up in plain prose for a reader who knows markets. Do not invent numbers, do not change the verdict, do not add disclaimers beyond noting the data source caveat given. Six short paragraphs at most.';
  const body = [
    `Instrument: ${verdict.sym} (${verdict.name}) at ${M.fmt.usd2(verdict.px)}.`,
    `Verdict: ${verdict.verdict.text}. Council score ${verdict.score.toFixed(1)} of ±100, confidence ${(verdict.confidence * 100).toFixed(0)}%, dispersion ${verdict.dispersion.toFixed(0)}.`,
    `Regime: ${verdict.regime.name}.`,
    'Bull points: ' + verdict.bulls.slice(0, 4).map(b => `[${b.name}] ` + (b.points.filter(p => p.dir > 0)[0] || {}).text).join(' | '),
    'Bear points: ' + verdict.bears.slice(0, 4).map(b => `[${b.name}] ` + (b.points.filter(p => p.dir < 0)[0] || {}).text).join(' | '),
    'Valuation anchors: ' + verdict.targets.anchors.map(a => `${a.method} ${M.fmt.usd2(a.v)}`).join(', '),
    'Position sizing: ' + verdict.sizing.note,
    'What would change the answer: ' + verdict.falsifiers.join(' '),
    'Data caveat that must be stated: ' + verdict.dataQuality.note
  ].join('\n');
  return M.Providers.llm(body, sys);
};
})();
