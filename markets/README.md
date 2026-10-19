# Ledger Terminal

A browser terminal that puts three things on one screen: a **national debt board** that ticks, a **real-time multi-asset trading platform**, and an **analyst council** that reasons from 132 books on investing and cites the one it used for every point it makes.

Open `index.html`. No build, no server, no dependencies. Everything is a static file.

> **Read this before anything else.** A static page cannot invent real market data and no program has read every book on investing. This one is built so you always know which is which: every number carries a `LIVE` or `SIM` badge driven by a source ledger, not by a hard-coded label, and the Live Feeds page names every instrument, who priced it and how many seconds ago. Keyless feeds connect on their own; the rest go live when you paste a free API key. The analysis engine is real either way — it is arithmetic you can check, and pointing it at real data makes it a real analysis.

---

## Realtime

Websocket-first. Where a provider streams, the terminal streams; where it only polls, it polls on the tightest interval the tier allows.

| | | |
|---|---|---|
| **Binance · Coinbase · Kraken** | crypto, **tick by tick** | no key |
| **US Treasury** *Debt to the Penny* | the real federal debt, daily — and its **observed** growth rate, taken from two consecutive days rather than assumed | no key |
| **ECB reference rates** | FX, daily fix | no key |
| **Yahoo · Stooq** | equities, indices, futures, rates | no key, if your browser is allowed to read them |
| **FRED** | most of the debt board, the **entire Treasury curve**, CPI, payrolls, credit spreads, mortgage rate | free key |
| **Finnhub · Alpaca** | real US equity trades over a socket | free key |

Three things make this honest rather than decorative:

- **A dead feed is visibly dead.** A streamed symbol that stops printing for 25 seconds, or a polled one that goes three minutes without an update, is marked stale and handed back to the simulation. Nothing freezes on a stale price while still claiming to be live. (The simulation writes `simLast`, never `last` — those are different clocks on purpose.)
- **Per-instrument attribution.** The Live Feeds page lists every instrument on a real feed, which provider priced it, whether it was streamed or polled, and how long ago. The status bar carries the same count and is a link to that page.
- **Reconnection you can watch.** Every socket has exponential backoff and a silence watchdog that recycles a connection which opened but stopped talking. The feed panel shows the attempt count and the next retry.

Streams re-aim themselves: change the watchlist or open a symbol and the equity socket re-subscribes around what is actually on screen, because free tiers are small and should be spent on what you are looking at.

---

## The debt board

A faithful homage to the national debt clocks, rebuilt on one rule: every counter has a base value at a fixed epoch and an annual growth rate, so `v(t) = base × e^(g·years)`. That single formula gives both the per-second tick and the **time machine** — drag the slider and scrub the whole board from 1980 to 2045.

- **Around 120 counters** across twelve panels: the national debt, spending and the deficit; federal, state and local receipts line by line including tariffs, estate tax and charitable giving; the four largest budget items with net interest called out; total debt, interest paid and credit card debt; money creation, M2, derivatives notional and the gap between money growth and wage growth since 1913; debt held abroad, the trade deficit and imported oil; thirty demographic and labour counters; cost of living now against 2000; what a dollar buys in gold and silver; and the sovereign wealth reserve.
- **Ratios are never stored.** Debt per citizen, debt to GDP, revenue to GDP, interest as a share of receipts — all divided out of the counters at render time, so the board cannot contradict itself.
- **One cell is genuinely live.** The national debt is re-anchored from the US Treasury's own *Debt to the Penny* API when that call succeeds, and the cell is marked `LIVE` when it is. Everything else is a projection and says so, in a note at the top of the board.
- **Click any cell** and it shows its provenance: whether it is a live anchor, a derived ratio or a projection; which series it came from and on what date; and what it changes by per second, per day and per year.
- **With a FRED key the board stops being a projection.** Around two dozen counters re-anchor to the measured series — GDP, M2, receipts, outlays, interest, population, the employment breakdown, revolving credit, total credit market debt, foreign-held debt, median income and new home price — and each one picks up that series' *own* observed growth rate instead of an assumed one. Anchored cells are outlined and marked `LIVE`; the rest still say they are projections.
- **"What this means for markets"** turns the board into the four readings the analyst council actually takes off it: debt to GDP, interest as a share of receipts, the fiscal dominance score and the deficit impulse. Those readings change how the council weights duration, leverage and hard assets.
- **Secret Window** is the arithmetic the board implies and never prints: the debt, the ratio and the interest burden at +5, +10, +20 and +30 years on the board's own rates, and what closing the primary gap would actually take — raise every federal tax by *x*%, cut every federal dollar by *y*%, or inflate at 5% for *z* years.

### State Debt Clocks

All 50 states and DC: state debt, local debt, **unfunded pension liability**, gross state product, revenue, spending, the operating balance, median income and home price. Sortable on every column, with a panel per state that ranks it against the rest and adds the federal debt each resident carries on top — because the state board alone understates what an individual is on the hook for.

### World Debt Clocks

42 economies with government debt in **both** local currency and dollars, debt to GDP, debt per citizen, deficit, external debt, interest as a share of revenue, the 10-year yield, inflation and the **real** yield. The last two columns are the ones that matter: whether debt is compounding faster than output, and if so how many years until the ratio doubles. The US row is taken from the federal board, so it carries the live Treasury anchor.

### The tool shelf

The buttons along the bottom of the original board, rebuilt as working pages:

- **Mortgage & Loan Calculator** — exact amortisation, not an estimate. Payment, total interest, interest as a share of everything paid, a year-by-year schedule, what an extra monthly payment buys in years and dollars, and what a lender's 28/36 ratios say you can actually carry. *(Verified: $300,000 at 6% over 30 years → $1,798.65/month, the textbook figure.)*
- **Gold Supply / Demand** — mine production, recycling and hedging against jewellery, central banks, bars and coins, ETFs and technology; stock-to-flow measured the conventional way on mined metal, with the recycled figure shown separately and the caveat stated.
- **Gold & Precious Metals** — live spot where a feed is connected, the gold/silver ratio, and what each metal costs against its 1913 price.
- **Home Sales** — sales, starts, permits, inventory, months of supply, prices, and the affordability arithmetic: the payment on the median home at the current mortgage rate, the income needed to carry it, and the gap against the actual median income.
- **Auto Sales** — the SAAR, transaction prices, loan sizes, terms, rates, delinquency, negative equity, and price measured in weeks of median income.
- **Energy Output** — production and consumption by source, the electricity generation mix, the net energy position, and the data-centre share of electricity.
- **Live Feeds** — what is connected right now, instrument by instrument.
- **About** — what is real, what is projected, what is simulated, and what never is.

## The trading terminal

300 instruments: 190 US stocks across all eleven sectors, 40 ETFs, the Treasury curve from the 1-month bill to the 30-year plus IG, high yield and munis, 18 futures, 12 FX pairs, 14 crypto assets and 12 indices.

- **Charting** — candles, line or area; 1m/5m/15m/1h/1D/1W; moving averages, EMA, Bollinger bands and VWAP as overlays; a volume, RSI or MACD pane below; wheel zoom, drag pan, crosshair with the full OHLCV readout. Intraday bars are folded out of the daily bars, so the two timeframes never disagree about the day's range.
- **Depth and tape** — a live depth ladder with the bid/offer imbalance, a depth curve and a time-and-sales print feed. Simulated, and labelled as such: real level-2 is a licensed product with no free tier.
- **Paper trading** — market, limit and stop orders, long and short, working orders swept against the tape four times a second, a blotter with fees and realised P&L, price alerts, and an equity curve with Sharpe, max drawdown, win rate, profit factor and Van Tharp expectancy. Fills cross the spread and pay an impact cost that scales with order size against displayed depth, because a paper account that always fills at the mid teaches the wrong lesson.
- **Markets view** — watchlist, a 96-name market-cap heat map, cap-weighted sector bars, gainers/losers/most active, an economic calendar on real release cadences, and a breadth panel that shows the cap-weighted move against the equal-weighted one, because the gap between them is the narrowing that precedes most drawdowns worth avoiding.
- **Screener** — filter on sector, P/E, P/B, yield, ROE, growth and market cap, with presets for Graham defensive, quality compounders, dividend income, growth at a price and deep value — then run the full council across the results and sort by its score.

### What drives prices when nothing is connected

A three-factor return model — one market factor, one factor per sector, one idiosyncratic — under a four-state regime process (risk-on expansion, range/rotation, risk-off contraction, liquidity event) that is itself tilted by the stress reading from the debt board. Volume follows a session profile; the opening and closing auctions are busier than midday. Price history is generated deterministically from the symbol, so a chart looks the same every time you open it.

## The analyst council

Not a chatbot. **Twenty-two seats**, one per school of investing, each a function that reads the same context and returns a score from −100 to +100 with its numbered reasoning. Every point names the book its rule came from.

The actual tests, implemented as arithmetic:

| Seat | What it runs |
|---|---|
| The Analyst | Graham's defensive criteria, the 22.5 product rule, the Graham number, NCAV |
| The Owner | Owner earnings after maintenance capex, ROIC against cost of capital, Munger's inversion |
| The Storyteller | Lynch's six categories, PEG, CAN SLIM scored component by component |
| The Quant | 12-1 momentum, path smoothness, composite value rank against industry peers, low-vol |
| The Auditor | Piotroski F-score (all nine), the accrual gap, Beneish-style manipulation flags |
| The Workout | Altman Z-score with the original thresholds, Greenblatt's magic formula, interest coverage |
| The Macro Desk | Reads the debt board directly — fiscal dominance, the Minsky configuration, duration positioning |
| The Cycle Reader | Marks' market temperature, Soros reflexivity, Weinstein's four stages |
| The Risk Officer | Realised drawdown, kurtosis and three-sigma counts from the actual return series |
| The Behaviourist | Audits the decision, not the asset — availability, anchoring, crowding |
| The Chartist | 200-day filter, ADX, RSI, MACD, OBV divergence, pivot-clustered support and resistance |
| The Bet Sizer | Kelly from edge and variance, quarter-Kelly, ATR-based stop sizing |
| The Allocator | Sector weight and the real correlation to what you already hold |
| The Indexer | The null hypothesis: can this beat owning the whole market at four basis points? |
| The Valuer | Ten-year DCF with a built discount rate, **reverse DCF** for the growth the price requires, peer multiples |
| The Sceptic | The short-side profile, short interest as a signal that someone did this work and disagreed |
| The Bond Desk | Duration, convexity, the 2s10s slope, term premium against issuance |
| The Crypto Desk | Issuance schedule, the absence of a balance sheet, cycle drawdown history |
| The Real Asset Desk | Spot versus roll yield, the decade-long supply response |
| The Historian | A century of cross-country return data as a prior |
| The Vol Trader | Implied against realised, compression as a setup for expansion rather than direction |
| The Monetarist | The unit of account as a variable — nominal gains against money growth |

**How the disagreement resolves.** Seats are weighted by instrument type (the Bond Desk is silent on a stock) and by the regime — in a contraction the balance-sheet seats are turned up and the momentum seats down, and each seat's weight is shown on its row. A seat with little evidence is shrunk toward zero, so one test firing in one direction cannot drown out eight that agree. Confidence falls as the seats disperse: a council that agrees is worth more than one that averages to the same number from opposite corners.

**What comes out.** A verdict and a score; the two sides of the argument written out as a debate; valuation anchors kept deliberately separate rather than averaged into a false-precision price target; a position size that is the smallest of quarter-Kelly, volatility parity and a per-name cap, scaled by confidence; the bear case; and a list of specific, observable things that would overturn the answer — written before the outcome is known, which is the only defence against hindsight rewriting why you bought.

**The library** is browsable in full: 132 works across 22 schools, each reduced to the one checkable idea it contributes. The summaries are written from scratch; none is a quotation.

**Ask the council** routes a question to a computation rather than to a language model. It will run the council, read the debt board, measure your portfolio, compare two tickers, or find the books that answer a question — and it says it does not understand rather than inventing an answer.

## The news wire

Real headlines when a provider key is present, generated ones otherwise — and the generated ones are not decoration. Each carries an impact estimate and **actually moves the simulated tape** for the tickers it names, so cause and effect line up on the chart. Fourteen categories, a transparent sentiment lexicon you can audit rather than a black box, automatic ticker extraction from company names and `$TICKER` mentions, a tape pulse over four windows, and an economic calendar on real release cadences. Every item is badged `LIVE` or `SIM`.

## Connecting real data

Everything below is optional. The terminal runs fully without any of it.

| Source | Key | What it turns on |
|---|---|---|
| US Treasury *Debt to the Penny* | none | The national debt counter and its real observed growth rate |
| Binance / Coinbase / Kraken | none | Crypto, streamed tick by tick |
| ECB reference rates | none | FX, at the daily fix |
| Yahoo / Stooq | none | Equities and indices, if your browser may read them |
| **[FRED](https://fredaccount.stlouisfed.org/apikeys)** | free | **Most of the debt board and the entire Treasury curve, as measured data** |
| [Alpaca](https://alpaca.markets/) | free | Real IEX equity trades over a websocket |
| [Finnhub](https://finnhub.io/register) | free | US equity trades over a websocket, fundamentals, news |
| [Twelve Data](https://twelvedata.com/pricing) | free | Quotes and history |
| [Alpha Vantage](https://www.alphavantage.co/support/#api-key) | free | Real fundamentals, pulled on demand from a symbol page |
| [Marketaux](https://www.marketaux.com) | free | News already tagged by ticker |
| Any RSS feed | needs a CORS proxy you supply | Headlines from wherever you read them |
| Anthropic or OpenAI | optional | Writes the council's computed verdict up as prose. It runs *after* the analysis and cannot change a number. |

Keys live in this browser's localStorage and are sent to nobody but the provider they belong to. There is no server behind this terminal.

## Keyboard

`/` search · `D` debt board · `G` state & world clocks · `F` live feeds · `M` markets · `N` news · `A` analyst · `P` portfolio · `S` screener · `C` sources · `Backspace` back · `Esc` close

## Files

```
index.html          shell, layout and all styling
js/core.js          namespace, storage, event bus, formatting, the source ledger
js/debt.js          every debt counter, its growth rate, and the macro read
js/universe.js      300 instruments and their fundamental fields
js/ta.js            indicators — one definition of an RSI, shared by chart and council
js/sim.js           the market engine: factors, regimes, sessions, book and tape
js/realtime.js      websockets, pollers, staleness, per-instrument attribution
js/macro.js         Treasury and FRED — what turns the debt board real
js/debt-geo.js      50 states + DC, and 42 countries
js/extras.js        amortisation, gold, housing, autos, energy
js/providers.js     fundamentals, news and the optional model bridge
js/news.js          the wire: real adapters, generated stories, sentiment, calendar
js/portfolio.js     paper trading, fills, orders, alerts, performance statistics
js/chart.js         canvas charting, sparklines, depth curve
js/ai/library.js    132 books across 22 schools
js/ai/analysts.js   the 22 seats — the tests themselves
js/ai/engine.js     weighting, synthesis, debate, sizing, the question router
js/ui.js            routing, header, ticker tape, shared components
js/view-*.js        one file per view
js/app.js           boot
```

---

Paper trading only. Nothing here is investment advice, no order reaches a market, and the modelled numbers are modelled.
