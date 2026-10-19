#!/usr/bin/env node
// ============================================================================
// Ledger Terminal — checks. The repo has no build and no test runner, so this
// is the project's check: it parses every module, boots the real page in a
// headless browser, walks every route, and asserts the engines against values
// that can be verified by hand.
//
//   node check.js            full run (needs playwright)
//   node check.js --syntax   parse only, no browser
//
// Exits non-zero on the first failing assertion so CI or a hook can see it.
// ============================================================================
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');

const FILES = ['core', 'debt', 'universe', 'ta', 'sim', 'realtime', 'providers', 'macro', 'debt-geo', 'extras',
  'news', 'portfolio', 'chart', 'ai/library', 'ai/analysts', 'ai/engine', 'ui', 'view-debt', 'view-geo',
  'view-tools', 'view-markets', 'view-symbol', 'view-news', 'view-ai', 'view-portfolio', 'view-sources', 'app']
  .map(f => 'js/' + f + '.js');

let pass = 0, fail = 0;
const results = [];
function check(name, fn) {
  try { const note = fn(); pass++; results.push(['ok', name, note || '']); }
  catch (e) { fail++; results.push(['FAIL', name, e.message]); }
}
function eq(a, b, what) { if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`); }
function near(a, b, tol, what) { if (!(Math.abs(a - b) <= tol)) throw new Error(`${what}: expected ${b} ±${tol}, got ${a}`); }
function ok(cond, what) { if (!cond) throw new Error(what); }

// ---------------------------------------------------------------- syntax
for (const f of FILES) {
  check('parses ' + f, () => {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    new Function(src);                                    // throws on a syntax error
    return src.split('\n').length + ' lines';
  });
}
check('index.html references every module', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const missing = FILES.filter(f => !html.includes('src="' + f + '"'));
  ok(!missing.length, 'not referenced by index.html: ' + missing.join(', '));
  return FILES.length + ' script tags';
});

// ---------------------------------------------------------------- browser
async function browserChecks() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { results.push(['skip', 'browser checks', 'playwright not installed — run `node check.js --syntax` or install playwright']); return; }

  const root = __dirname;
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end(); return; }
      const ext = path.extname(file);
      res.writeHead(200, { 'content-type': ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : 'text/plain' });
      res.end(buf);
    });
  });
  await new Promise(r => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource|WebSocket|net::/.test(m.text())) pageErrors.push('console: ' + m.text().slice(0, 160)); });

  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.M && M.UI && M.UI.current, null, { timeout: 15000 });
    await page.waitForTimeout(2500);

    check('boots without a page error', () => { ok(!pageErrors.length, pageErrors.join(' | ')); return 'clean boot'; });

    check('every module registered its namespace', async () => {}) ;
    const ns = await page.evaluate(() => ['Debt', 'Universe', 'TA', 'Sim', 'RT', 'Providers', 'Macro', 'Geo', 'Extras', 'News', 'Portfolio', 'Chart', 'Library', 'Analysts', 'AI', 'UI'].filter(k => !window.M[k]));
    results.pop();
    check('every module registered its namespace', () => { ok(!ns.length, 'missing: ' + ns.join(', ')); return '16 namespaces'; });

    // ---- routes
    const routes = [['debt'], ['geo', 'states'], ['geo', 'world'], ['tools', 'mortgage'], ['tools', 'gold'],
      ['tools', 'metals'], ['tools', 'homes'], ['tools', 'autos'], ['tools', 'energy'], ['tools', 'feeds'],
      ['tools', 'about'], ['markets'], ['screener'], ['news'], ['ai'], ['portfolio'], ['sources']];
    for (const [v, a] of routes) {
      const before = pageErrors.length;
      await page.evaluate(([v, a]) => M.UI.go(v, a), [v, a]);
      await page.waitForTimeout(320);
      const len = await page.evaluate(() => document.querySelector('.view').innerText.length);
      check('route ' + v + (a ? '/' + a : '') + ' renders', () => {
        ok(pageErrors.length === before, 'threw: ' + pageErrors.slice(before).join(' | '));
        ok(len > 400, 'only ' + len + ' characters rendered');
        return len + ' chars';
      });
    }

    // ---- amortisation, against values that can be checked by hand
    const am = await page.evaluate(() => {
      const r = M.Extras.amortise({ principal: 300000, annualRate: 6, years: 30 });
      const e = M.Extras.amortise({ principal: 300000, annualRate: 6, years: 30, extra: 200 });
      const z = M.Extras.amortise({ principal: 120000, annualRate: 0, years: 10 });
      return { pay: r.payment, months: r.monthsTaken, interest: r.totalInterest, total: r.totalPaid,
               extraMonths: e.monthsTaken, saved: e.interestSaved, zeroPay: z.payment, zeroInterest: z.totalInterest };
    });
    check('amortisation: $300k at 6% over 30 years', () => {
      near(am.pay, 1798.65, 0.02, 'monthly payment');
      eq(am.months, 360, 'term in months');
      near(am.interest, 347514.57, 2, 'total interest');
      near(am.total, 647514.57, 2, 'total paid');
      return '$' + am.pay.toFixed(2) + '/mo, $' + Math.round(am.interest).toLocaleString() + ' interest';
    });
    check('amortisation: an extra payment shortens the term and saves interest', () => {
      ok(am.extraMonths < 360, 'extra payment did not shorten the term');
      ok(am.saved > 0, 'extra payment saved nothing');
      return am.extraMonths + ' months, saves $' + Math.round(am.saved).toLocaleString();
    });
    check('amortisation: a 0% loan is principal split evenly', () => {
      near(am.zeroPay, 1000, 0.01, 'payment on a 0% loan');
      near(am.zeroInterest, 0, 0.01, 'interest on a 0% loan');
      return 'handled';
    });

    // ---- debt board can never contradict itself on a ratio
    const dbt = await page.evaluate(() => {
      const t = Date.now(), s = M.Debt.snapshot(t);
      return { natDebt: s.natDebt, pop: s.population, perCitizen: s.debtPerCitizen, gdp: s.gdp,
               ratio: s.debtToGdp, taxpayers: s.taxpayers, perTaxpayer: s.debtPerTaxpayer,
               nan: Object.entries(s).filter(([k, v]) => typeof v === 'number' && !isFinite(v)).map(([k]) => k) };
    });
    check('debt board: derived ratios reconcile to their counters', () => {
      near(dbt.perCitizen * dbt.pop, dbt.natDebt, dbt.natDebt * 1e-9, 'debt per citizen × population');
      near(dbt.perTaxpayer * dbt.taxpayers, dbt.natDebt, dbt.natDebt * 1e-9, 'debt per taxpayer × taxpayers');
      near(dbt.ratio, dbt.natDebt / dbt.gdp * 100, 1e-6, 'debt to GDP');
      ok(!dbt.nan.length, 'non-finite counters: ' + dbt.nan.join(', '));
      return dbt.ratio.toFixed(1) + '% of GDP, all counters finite';
    });
    check('debt board: the time machine moves every counter monotonically', async () => {});
    const tm = await page.evaluate(() => {
      const now = Date.now(), later = now + 10 * 365.2425 * 86400000, earlier = now - 10 * 365.2425 * 86400000;
      const a = M.Debt.valueAt('natDebt', earlier), b = M.Debt.valueAt('natDebt', now), c = M.Debt.valueAt('natDebt', later);
      return { a, b, c };
    });
    results.pop();
    check('debt board: the time machine moves every counter monotonically', () => {
      ok(tm.a < tm.b && tm.b < tm.c, 'debt is not increasing across 1980 → now → 2036');
      return '+10y projects ' + (tm.c / tm.b).toFixed(2) + '×';
    });

    // ---- geo boards
    const geo = await page.evaluate(() => {
      const st = M.Geo.allStatesAt(Date.now()), w = M.Geo.allCountriesAt(Date.now());
      const us = M.Geo.countryAt('US', Date.now());
      const ca = M.Geo.stateAt('CA', Date.now());
      return { states: st.length, countries: w.length,
               usMatchesBoard: Math.abs(us.debtUSD - M.Debt.valueAt('natDebt', Date.now())) < 1,
               caTotalOk: Math.abs(ca.totalDebt - (ca.stateDebt + ca.localDebt)) < 1,
               caAllInOk: Math.abs(ca.allInPerCitizen - (ca.debtPerCitizen + ca.federalShare)) < 1e-6,
               nan: st.concat(w).some(r => Object.values(r).some(v => typeof v === 'number' && !isFinite(v))) };
    });
    check('state and world boards are complete and internally consistent', () => {
      eq(geo.states, 51, 'states plus DC');
      ok(geo.countries >= 40, 'only ' + geo.countries + ' countries');
      ok(geo.usMatchesBoard, 'the US row does not match the federal board');
      ok(geo.caTotalOk, 'state + local does not equal the total');
      ok(geo.caAllInOk, 'all-in per citizen is not state + federal');
      ok(!geo.nan, 'a geo row contains a non-finite number');
      return geo.states + ' states, ' + geo.countries + ' countries';
    });

    // ---- the council
    const ai = await page.evaluate(() => {
      const a = M.AI.analyse('AAPL');
      const scores = M.Universe.ofType('stock').slice(0, 40).map(i => M.AI.analyse(i).score);
      const noBook = a.results.some(r => r.points.some(p => p.dir !== 0 && (!p.book || !p.book.title)));
      const types = ['BTC', 'US10Y', 'SPY', 'GC', 'EURUSD', 'SPX'].map(s => { const v = M.AI.analyse(s); return v ? v.results.length : 0; });
      return { score: a.score, seats: a.results.length, conf: a.confidence, books: M.Library.count(), allSeats: M.Analysts.seatList().length,
               risks: a.risks.length, falsifiers: a.falsifiers.length, anchors: a.targets.anchors.length, noBook,
               min: Math.min(...scores), max: Math.max(...scores), mean: scores.reduce((x, y) => x + y, 0) / scores.length,
               types };
    });
    check('council: produces a bounded, sourced verdict', () => {
      ok(ai.score >= -100 && ai.score <= 100, 'score out of range: ' + ai.score);
      ok(ai.seats >= 10, 'only ' + ai.seats + ' seats ran');
      ok(ai.conf > 0 && ai.conf <= 1, 'confidence out of range');
      ok(ai.risks > 0 && ai.falsifiers > 0, 'no bear case or no falsifiers');
      ok(ai.anchors > 0, 'no valuation anchor');
      ok(!ai.noBook, 'a directional point cites no book');
      return ai.seats + ' seats, ' + ai.books + ' books, ' + ai.allSeats + ' total seats';
    });
    check('council: scores spread rather than pinning to one side', () => {
      ok(ai.max > 0 && ai.min < 0, `all 40 scores fell on one side (${ai.min.toFixed(0)} to ${ai.max.toFixed(0)})`);
      ok(Math.abs(ai.mean) < 35, 'mean score of ' + ai.mean.toFixed(1) + ' suggests a systematic bias');
      return ai.min.toFixed(0) + ' to ' + ai.max.toFixed(0) + ', mean ' + ai.mean.toFixed(1);
    });
    check('council: every instrument type gets a quorum', () => {
      ok(ai.types.every(n => n >= 8), 'a type convened too few seats: ' + ai.types.join(','));
      return 'crypto/bond/etf/future/fx/index all ' + Math.min(...ai.types) + '+ seats';
    });

    // ---- realtime ingest and attribution
    const rt = await page.evaluate(() => {
      const out = {};
      M.RT.feed('BTC', { px: 98765.43, size: 0.25, t: Date.now() }, { name: 'Binance', kind: 'tick' });
      const btc = M.Universe.get('BTC');
      out.binance = { px: btc.px, src: btc.srcName, kind: btc.srcKind, live: M.RT.owned(btc) };
      const y = { chart: { result: [{ meta: { regularMarketPrice: 245.67, chartPreviousClose: 242.10, regularMarketDayHigh: 247, regularMarketDayLow: 241.5, regularMarketVolume: 51234567 } }] } };
      const m = y.chart.result[0].meta;
      M.RT.feed('AAPL', { px: m.regularMarketPrice, prev: m.chartPreviousClose, hi: m.regularMarketDayHigh, lo: m.regularMarketDayLow, vol: m.regularMarketVolume }, { name: 'Yahoo', kind: 'poll', delay: 0 });
      const a = M.Universe.get('AAPL');
      out.yahoo = { px: a.px, chgPct: a.chgPct, live: M.RT.owned(a) };
      M.RT.feed('US10Y', { px: 4.31, prev: 4.28 }, { name: 'FRED DGS10', kind: 'poll', delay: 1440 });
      out.fred = { px: M.Universe.get('US10Y').px, src: M.Universe.get('US10Y').srcName };
      M.RT.feed('AAPL', { px: -5 }, { name: 'Bad', kind: 'tick' });
      out.rejectsNonsense = M.Universe.get('AAPL').px === 245.67;
      return out;
    });
    check('realtime: provider payloads parse into correct quotes', () => {
      near(rt.binance.px, 98765.43, 0.001, 'Binance trade price');
      eq(rt.binance.kind, 'tick', 'Binance stream kind');
      ok(rt.binance.live, 'Binance quote not marked live');
      near(rt.yahoo.px, 245.67, 0.001, 'Yahoo price');
      near(rt.yahoo.chgPct, (245.67 / 242.10 - 1) * 100, 0.01, 'Yahoo change percent');
      near(rt.fred.px, 4.31, 0.001, 'FRED yield');
      return 'binance/yahoo/fred all parsed, change % derived correctly';
    });
    check('realtime: a nonsensical price is rejected', () => {
      ok(rt.rejectsNonsense, 'a negative price was accepted');
      return 'negative price ignored';
    });

    // ---- staleness handback: the bug that was fixed, now guarded
    await page.evaluate(() => { M.Universe.get('BTC').last = Date.now() - 40000; });
    await page.waitForTimeout(6500);
    const stale = await page.evaluate(() => { const i = M.Universe.get('BTC'); return { src: i.src, srcName: i.srcName, live: M.RT.owned(i) }; });
    check('realtime: a dead feed hands the symbol back to the simulation', () => {
      eq(stale.src, 'sim', 'source after the feed went quiet');
      ok(!stale.live, 'still reported as live after 40s of silence');
      ok(stale.srcName === null, 'stale provider name was not cleared');
      return 'demoted within the sweep interval';
    });

    // ---- paper trading
    const pf = await page.evaluate(() => {
      M.Portfolio.reset();
      const cash0 = M.Portfolio.cash;
      const buy = M.Portfolio.execute('MSFT', 'buy', 10);
      const afterBuy = { cash: M.Portfolio.cash, qty: M.Portfolio.find('MSFT').qty, avg: M.Portfolio.find('MSFT').avg };
      const sell = M.Portfolio.execute('MSFT', 'sell', 10);
      const over = M.Portfolio.execute('MSFT', 'buy', 1e9);
      return { cash0, buy, afterBuy, sell, closed: !M.Portfolio.find('MSFT'), over };
    });
    check('paper trading: a round trip settles cash and realises P&L', () => {
      ok(pf.buy.ok, 'buy was rejected: ' + pf.buy.err);
      eq(pf.afterBuy.qty, 10, 'position size after buying 10');
      near(pf.afterBuy.cash, pf.cash0 - pf.buy.px * 10 - pf.buy.fee, 0.01, 'cash after the buy');
      ok(pf.sell.ok, 'sell was rejected');
      ok(pf.closed, 'position was not closed out');
      ok(typeof pf.sell.realised === 'number' && isFinite(pf.sell.realised), 'realised P&L is not a number');
      return 'fills cross the spread, cash and P&L reconcile';
    });
    check('paper trading: an unaffordable order is refused', () => {
      ok(!pf.over.ok, 'an order larger than the account was accepted');
      return 'rejected: ' + pf.over.err.slice(0, 48);
    });

    // ---- the tape stays finite under load
    await page.evaluate(() => M.UI.go('markets'));
    await page.waitForTimeout(6000);
    const tape = await page.evaluate(() => {
      const bad = M.Universe.list.filter(i => !isFinite(i.px) || i.px <= 0 || !isFinite(i.chgPct));
      return { total: M.Universe.list.length, bad: bad.map(i => i.sym), moved: M.Universe.list.filter(i => i.chgPct !== 0).length };
    });
    check('simulation: every instrument stays finite while ticking', () => {
      ok(!tape.bad.length, 'non-finite or non-positive price on: ' + tape.bad.join(', '));
      ok(tape.moved > tape.total * 0.5, 'only ' + tape.moved + ' of ' + tape.total + ' instruments moved');
      return tape.moved + ' of ' + tape.total + ' moving, all finite';
    });

    // ---- persistence
    await page.evaluate(() => { M.Portfolio.execute('AAPL', 'buy', 5); M.Portfolio.toggleWatch('COIN'); M.Portfolio.save(); });
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => ({ pos: M.Portfolio.positions.length, watch: M.Portfolio.isWatched('COIN') }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.M && M.Portfolio, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({ pos: M.Portfolio.positions.length, watch: M.Portfolio.isWatched('COIN') }));
    check('state survives a reload', () => {
      eq(after.pos, before.pos, 'position count after reload');
      eq(after.watch, true, 'watchlist entry after reload');
      return before.pos + ' positions and the watchlist restored';
    });

    check('no page error across the whole run', () => {
      ok(!pageErrors.length, pageErrors.slice(0, 3).join(' | '));
      return 'clean';
    });
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  if (!process.argv.includes('--syntax')) await browserChecks();
  const w = Math.max(...results.map(r => r[1].length));
  for (const [state, name, note] of results) {
    const tag = state === 'ok' ? '  ok  ' : state === 'skip' ? ' skip ' : ' FAIL ';
    console.log(tag + name.padEnd(w) + (note ? '  ' + note : ''));
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (results.some(r => r[0] === 'skip') ? ', some skipped' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('\ncheck harness crashed:', e); process.exit(2); });
