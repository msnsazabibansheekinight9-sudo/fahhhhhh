// ============================================================================
// TERMINAL — the library. The analytical canon the council reasons from: the
// schools of investing, the books that define each one, and the single idea
// each book contributes to a verdict.
//
// Every description here is written from scratch as a summary of the argument,
// not a quotation. The point is not to recite books; it is that each test the
// council runs can name where the rule came from, so you can go and disagree
// with the source rather than with a black box.
// ============================================================================
'use strict';
(function () {
const L = M.Library = { schools: {}, books: [], byId: {} };

function school(id, o) { L.schools[id] = Object.assign({ id, books: [] }, o); return L.schools[id]; }
function book(schoolId, title, author, year, idea, tag) {
  const b = { id: schoolId + ':' + M.hash(title).toString(36), school: schoolId, title, author, year, idea, tag: tag || '' };
  L.books.push(b); L.byId[b.id] = b; L.schools[schoolId].books.push(b);
  return b;
}
L.cite = (schoolId, match) => {
  const s = L.schools[schoolId]; if (!s) return null;
  if (!match) return s.books[0];
  const m = String(match).toLowerCase();
  return s.books.find(b => b.title.toLowerCase().includes(m) || b.author.toLowerCase().includes(m) || b.tag.includes(m)) || s.books[0];
};

// ---------------------------------------------------------------------------
school('value', { name: 'Classical value', seat: 'The Analyst', colour: '#4a9', one: 'Buy a claim on assets and earnings for less than it is demonstrably worth, and let the gap close.' });
book('value', 'Security Analysis', 'Benjamin Graham & David Dodd', 1934, 'Value a business from its documented assets and demonstrated earning power, not from what the market will pay next. The analyst’s job is the balance sheet, not the forecast.', 'core');
book('value', 'The Intelligent Investor', 'Benjamin Graham', 1949, 'Margin of safety is the whole discipline: the gap between price and conservative worth is what absorbs the errors you have not yet discovered.', 'mos');
book('value', 'Margin of Safety', 'Seth Klarman', 1991, 'Absolute return matters more than beating an index, and the discipline to hold cash when nothing is cheap is itself a position.', 'cash');
book('value', 'The Little Book of Value Investing', 'Christopher Browne', 2006, 'Low price-to-book and low price-to-earnings have paid over long horizons largely because they are uncomfortable to own.', 'ratio');
book('value', 'Deep Value', 'Tobias Carlisle', 2014, 'The cheapest decile beats the quality-adjusted cheap decile often enough that pure cheapness, mechanically applied, is a strategy on its own.', 'ev');
book('value', 'Value Investing: From Graham to Buffett and Beyond', 'Bruce Greenwald', 2001, 'Separate asset value, earnings power value and growth value: only pay for growth when a franchise can defend the returns.', 'epv');
book('value', 'The Aggressive Conservative Investor', 'Martin Whitman', 1979, 'Read the balance sheet like a creditor would. Resource conversion — asset sales, recapitalisations — is where value is realised.', 'balance');
book('value', 'Contrarian Investment Strategies', 'David Dreman', 1998, 'Low-expectation stocks beat high-expectation stocks because analysts’ forecast errors are systematically larger at the top.', 'contrarian');

school('quality', { name: 'Quality compounders', seat: 'The Owner', colour: '#da4', one: 'A business that earns high returns on the capital it reinvests will out-compound a cheap one, provided the moat holds.' });
book('quality', 'The Essays of Warren Buffett', 'Warren Buffett & Lawrence Cunningham', 1997, 'Owner earnings — net income plus non-cash charges minus the capex the business genuinely needs — is the number that matters, not reported EPS.', 'owner');
book('quality', 'Poor Charlie’s Almanack', 'Charles Munger & Peter Kaufman', 2005, 'Invert the question. Instead of asking what makes a business succeed, list what reliably destroys one and check whether this one is exposed.', 'invert');
book('quality', 'Common Stocks and Uncommon Profits', 'Philip Fisher', 1958, 'Scuttlebutt: the qualitative facts — sales organisation, R&D productivity, management candour — predict more than the ratios do.', 'scuttlebutt');
book('quality', 'The Outsiders', 'William Thorndike', 2012, 'Capital allocation is the CEO’s real job. Measure management by what they did with each dollar of free cash flow, not by operating skill.', 'capital');
book('quality', '100 Baggers', 'Christopher Mayer', 2015, 'Long compounding needs high returns on incremental capital plus a very long runway plus an owner who does not sell.', 'compound');
book('quality', 'Quality Investing', 'Cunningham, Eide & Hargreaves', 2016, 'Three legs: strong market position, pricing power, and reinvestment at attractive rates. Remove any one and the compounding stops.', 'moat');
book('quality', 'The Little Book That Builds Wealth', 'Pat Dorsey', 2008, 'There are only four durable moats — intangibles, switching costs, network effects, cost advantage. Everything else is a head start.', 'moat4');
book('quality', 'Capital Returns', 'Edward Chancellor (ed.)', 2015, 'Follow the capital cycle: returns collapse where capital floods in and recover where it has been starved. Supply, not demand, drives the cycle.', 'cycle');

school('growth', { name: 'Growth at a sane price', seat: 'The Storyteller', colour: '#5ad', one: 'Growth is a component of value, not an alternative to it — and the price paid for it decides the outcome.' });
book('growth', 'One Up on Wall Street', 'Peter Lynch', 1989, 'Sort every holding into one of six types — slow grower, stalwart, fast grower, cyclical, turnaround, asset play — because each is judged differently.', 'category');
book('growth', 'Beating the Street', 'Peter Lynch', 1993, 'The PEG test: a fair price for a grower is roughly its growth rate expressed as a P/E. Twice that is a wager, not an investment.', 'peg');
book('growth', 'How to Make Money in Stocks', 'William O’Neil', 1988, 'CAN SLIM: current and annual earnings acceleration, something genuinely new, tight supply, leadership in the group, institutional sponsorship, and a market in an uptrend.', 'canslim');
book('growth', 'The Gorilla Game', 'Geoffrey Moore', 1998, 'In a standards war the winner takes the economics of the whole category; before the standard settles, buy the basket, not the favourite.', 'standard');
book('growth', 'Narrative and Numbers', 'Aswath Damodaran', 2017, 'A valuation is a story disciplined by arithmetic. If the numbers imply a story management could not say out loud, the numbers are wrong.', 'narrative');
book('growth', 'Where the Money Is', 'Adam Seessel', 2022, 'Apply Graham-style discipline to technology by valuing recurring revenue and unit economics rather than refusing the sector on multiples.', 'tech');

school('quant', { name: 'Factors and evidence', seat: 'The Quant', colour: '#a7d', one: 'Persistent, documented return premia — value, momentum, quality, low volatility, size — applied mechanically, beat judgement applied inconsistently.' });
book('quant', 'What Works on Wall Street', 'James O’Shaughnessy', 1996, 'Decades of back-tests show composite value ranks beat single ratios, and that discipline matters more than the choice of factor.', 'composite');
book('quant', 'Quantitative Value', 'Wesley Gray & Tobias Carlisle', 2012, 'Screen out frauds and distress first, then buy the cheapest of what survives. The exclusions do as much work as the ranking.', 'screen');
book('quant', 'Quantitative Momentum', 'Wesley Gray & Jack Vogel', 2016, 'Twelve-month momentum excluding the most recent month persists, and smooth paths to the same return outperform jumpy ones.', 'mom');
book('quant', 'Your Complete Guide to Factor-Based Investing', 'Larry Swedroe & Andrew Berkin', 2016, 'A factor must be persistent, pervasive, robust, investable and intuitive. Most published anomalies fail at least two of those.', 'factor');
book('quant', 'Expected Returns', 'Antti Ilmanen', 2011, 'Expected return is a sum of compensations for distinct risks. Yields and valuations predict long-horizon returns; nothing predicts short ones.', 'er');
book('quant', 'Value and Momentum Everywhere', 'Asness, Moskowitz & Pedersen', 2013, 'Value and momentum work in every asset class and are negatively correlated with each other, which is why holding both beats holding either.', 'both');
book('quant', 'Advances in Financial Machine Learning', 'Marcos López de Prado', 2018, 'Most back-tests are overfitted. Correct for the number of trials before believing any reported Sharpe ratio.', 'overfit');

school('accounting', { name: 'Forensic accounting', seat: 'The Auditor', colour: '#d66', one: 'Earnings are an opinion; cash is a fact. Find the gap between the two before the market does.' });
book('accounting', 'Financial Shenanigans', 'Howard Schilit', 1993, 'Seven families of manipulation, nearly all of which show up first as earnings growing faster than operating cash flow.', 'gap');
book('accounting', 'The Financial Numbers Game', 'Charles Mulford & Eugene Comiskey', 2002, 'Watch for revenue recognised before it is earned, costs capitalised instead of expensed, and one-off gains presented as operating.', 'recognition');
book('accounting', 'Quality of Earnings', 'Thornton O’Glove', 1987, 'Read the footnotes and compare them to the press release. Divergence between the two is the highest-yield search in all of analysis.', 'footnote');
book('accounting', 'Creative Cash Flow Reporting', 'Mulford & Comiskey', 2005, 'Operating cash flow can be dressed up by stretching payables and securitising receivables. Normalise before you trust it.', 'cfo');
book('accounting', 'Financial Statement Analysis and Security Valuation', 'Stephen Penman', 2001, 'Separate operating from financing items. Return on net operating assets, not ROE, tells you whether the business works.', 'rnoa');
book('accounting', 'The Detection of Earnings Manipulation', 'Messod Beneish', 1999, 'An eight-variable index — receivables, margins, asset quality, accruals and the rest — flags manipulators at better than chance.', 'mscore');
book('accounting', 'Value Investing: Tools and Techniques', 'James Montier', 2009, 'Combine a cheapness screen with a distress screen and an earnings-manipulation screen; each removes a different way of being wrong.', 'trio');

school('distress', { name: 'Distress and special situations', seat: 'The Workout', colour: '#c84', one: 'Corporate events — bankruptcies, spin-offs, recapitalisations — create forced sellers, and forced sellers set bad prices.' });
book('distress', 'You Can Be a Stock Market Genius', 'Joel Greenblatt', 1997, 'Spin-offs, rights issues and restructurings are under-researched because the institutional holders who receive them are obliged to sell.', 'spin');
book('distress', 'The Little Book That Still Beats the Market', 'Joel Greenblatt', 2005, 'Rank the universe on earnings yield and on return on capital, add the ranks, buy the top. Simplicity is what makes it survivable.', 'magic');
book('distress', 'Distressed Debt Analysis', 'Stephen Moyer', 2004, 'Work the capital structure from the top: find the fulcrum security that converts to equity and own that, not the stub.', 'fulcrum');
book('distress', 'Corporate Financial Distress and Bankruptcy', 'Edward Altman', 1983, 'The Z-score combines five balance-sheet ratios into one number that has separated survivors from failures for decades.', 'zscore');
book('distress', 'Dead Companies Walking', 'Scott Fearon', 2015, 'Failing managements share a vocabulary. When the explanation stops being about customers and starts being about the market, leave.', 'short');

school('macro', { name: 'Macro and the debt cycle', seat: 'The Macro Desk', colour: '#e94', one: 'Credit creates purchasing power that must later be repaid, and that one mechanism drives the long cycle everything else happens inside.' });
book('macro', 'Principles for Navigating Big Debt Crises', 'Ray Dalio', 2018, 'Every big debt cycle runs the same arc: leverage, bubble, top, deleveraging, pushing on a string, normalisation. The policy response is what differs.', 'cycle');
book('macro', 'Principles', 'Ray Dalio', 2017, 'Diversify across environments, not across names: hold assets that respond differently to growth and inflation surprises.', 'parity');
book('macro', 'Manias, Panics and Crashes', 'Charles Kindleberger', 1978, 'Displacement, credit expansion, euphoria, distress, revulsion — the sequence repeats because the participants always change.', 'mania');
book('macro', 'Stabilizing an Unstable Economy', 'Hyman Minsky', 1986, 'Stability breeds instability: a long calm period pushes financing from hedge to speculative to Ponzi, and the last stage cannot survive a rate rise.', 'minsky');
book('macro', 'A Monetary History of the United States', 'Milton Friedman & Anna Schwartz', 1963, 'Monetary contraction turned a recession into a depression. The quantity of money is not neutral over the cycle.', 'money');
book('macro', 'Lombard Street', 'Walter Bagehot', 1873, 'In a panic the central bank should lend freely, at a penalty rate, against good collateral. Every modern bailout is argued against this rule.', 'lender');
book('macro', 'This Time Is Different', 'Carmen Reinhart & Kenneth Rogoff', 2009, 'Eight centuries of data: high public debt coincides with slower growth, and sovereign crises are preceded by the same denial every time.', 'debt');
book('macro', 'The Great Depression: A Diagnosis', 'Irving Fisher', 1933, 'Debt deflation: falling prices raise the real value of debt, forcing more selling, which lowers prices again.', 'deflation');
book('macro', 'Anatomy of the Bear', 'Russell Napier', 2005, 'Four great bottoms shared the same markers — very low CAPE, collapsed volumes, and bad news that stopped moving prices.', 'bottom');
book('macro', 'The Dollar Milkshake', 'Brent Johnson (thesis)', 2018, 'Dollar-denominated debt outside the US creates structural demand for dollars in a crisis, which is why the currency rallies when the world breaks.', 'dollar');

school('monetary', { name: 'Hard money and the currency', seat: 'The Monetarist', colour: '#c93', one: 'The unit of account is itself a variable. Returns measured in a depreciating currency can be losses.' });
book('monetary', 'The Bitcoin Standard', 'Saifedean Ammous', 2018, 'Money competes on stock-to-flow: the harder it is to produce more, the better it holds value across time.', 'hard');
book('monetary', 'What Has Government Done to Our Money?', 'Murray Rothbard', 1963, 'Monetary expansion transfers wealth to whoever receives the new money first — the effect is distributional, not just inflationary.', 'cantillon');
book('monetary', 'The Denationalisation of Money', 'Friedrich Hayek', 1976, 'Competing currencies discipline issuers. A monopoly issuer has no incentive to protect the holder.', 'competition');
book('monetary', 'Gold: The Once and Future Money', 'Nathan Lewis', 2007, 'A stable unit of account improves capital allocation; a floating one adds a currency bet to every investment decision.', 'gold');
book('monetary', 'Lords of Finance', 'Liaquat Ahamed', 2009, 'Four central bankers defending a currency peg at the wrong rate turned a slump into a decade. Policy error is the real tail risk.', 'policy');
book('monetary', 'The Price of Tomorrow', 'Jeff Booth', 2020, 'Technology is inherently deflationary; fighting that with credit creation produces asset inflation instead of consumer inflation.', 'deflation');

school('cycles', { name: 'Cycles and positioning', seat: 'The Cycle Reader', colour: '#7ac', one: 'You cannot forecast, but you can know where you are in the cycle, and that is enough to change how aggressive to be.' });
book('cycles', 'The Most Important Thing', 'Howard Marks', 2011, 'Second-level thinking: the question is never whether a business is good, it is whether it is better than the price already assumes.', 'second');
book('cycles', 'Mastering the Market Cycle', 'Howard Marks', 2018, 'Take the market’s temperature from behaviour — how easily credit is granted, how little scepticism greets a new issue — and adjust exposure, not forecasts.', 'temp');
book('cycles', 'The Alchemy of Finance', 'George Soros', 1987, 'Reflexivity: prices change the fundamentals they are supposed to reflect, which is how self-reinforcing trends run far past fair value.', 'reflex');
book('cycles', 'Devil Take the Hindmost', 'Edward Chancellor', 1999, 'Speculative manias follow a fixed script. Knowing the script does not protect you from the pull of the crowd.', 'mania');
book('cycles', 'Irrational Exuberance', 'Robert Shiller', 2000, 'Cyclically adjusted earnings multiples predict ten-year forward returns. They predict nothing at all about next year.', 'cape');
book('cycles', 'Secrets for Profiting in Bull and Bear Markets', 'Stan Weinstein', 1988, 'Four stages — base, advance, top, decline. Buy in stage two, never in stage four, and let the 30-week average define which is which.', 'stage');

school('tail', { name: 'Tail risk and uncertainty', seat: 'The Risk Officer', colour: '#d55', one: 'Survive first. The distribution has fatter tails than any model you are using, and the model is where the losses come from.' });
book('tail', 'Fooled by Randomness', 'Nassim Taleb', 2001, 'Track records are mostly noise. Judge a strategy by the payoff structure it would produce in the paths that did not happen.', 'noise');
book('tail', 'The Black Swan', 'Nassim Taleb', 2007, 'Rare, unmodelled events dominate long-run outcomes. Exposure to them, not their probability, is the thing you can actually control.', 'swan');
book('tail', 'Antifragile', 'Nassim Taleb', 2012, 'Prefer positions that gain from disorder: capped downside, uncapped upside, and no leverage that can force you out at the worst moment.', 'barbell');
book('tail', 'When Genius Failed', 'Roger Lowenstein', 2000, 'LTCM: correlations go to one precisely when diversification is needed, and leverage turns a drawdown into an ending.', 'ltcm');
book('tail', 'A Demon of Our Own Design', 'Richard Bookstaber', 2007, 'Tight coupling plus complexity produces failures no participant intended and none can stop mid-flight.', 'complex');
book('tail', 'Against the Gods', 'Peter Bernstein', 1996, 'The history of risk is the history of mistaking measurable risk for genuine uncertainty.', 'history');
book('tail', 'The Misbehavior of Markets', 'Benoit Mandelbrot', 2004, 'Price changes are not normally distributed and volatility clusters. Standard risk models understate the tails by orders of magnitude.', 'fractal');

school('behaviour', { name: 'Behavioural finance', seat: 'The Behaviourist', colour: '#9b8', one: 'The largest single source of underperformance is the investor, and the errors are systematic enough to be screened for.' });
book('behaviour', 'Thinking, Fast and Slow', 'Daniel Kahneman', 2011, 'Anchoring, availability and loss aversion are not quirks; they are the default mode of judgement under uncertainty.', 'bias');
book('behaviour', 'The Psychology of Money', 'Morgan Housel', 2020, 'Behaviour beats arithmetic: a mediocre strategy held for thirty years outperforms a brilliant one abandoned in year three.', 'behave');
book('behaviour', 'Misbehaving', 'Richard Thaler', 2015, 'Mental accounting makes people treat identical dollars differently depending on which pot they came from.', 'accounting');
book('behaviour', 'The Little Book of Behavioral Investing', 'James Montier', 2010, 'Write the decision down before the outcome is known. A pre-commitment is the only reliable defence against hindsight.', 'journal');
book('behaviour', 'Extraordinary Popular Delusions', 'Charles Mackay', 1841, 'Crowds go mad in groups and recover their senses one at a time.', 'crowd');
book('behaviour', 'Thinking in Bets', 'Annie Duke', 2018, 'Separate decision quality from outcome quality. A good decision can lose; judge the process.', 'process');
book('behaviour', 'Your Money and Your Brain', 'Jason Zweig', 2007, 'Anticipation of gain activates the same circuits as the gain itself, which is why chasing feels like winning.', 'neuro');

school('technical', { name: 'Price and tape', seat: 'The Chartist', colour: '#6bb', one: 'Price is the only variable that pays. Trend, volume and relative strength say what participants are actually doing with money.' });
book('technical', 'Technical Analysis of Stock Trends', 'Robert Edwards & John Magee', 1948, 'Support and resistance are memory: prices where large holders changed their minds tend to matter again.', 'sr');
book('technical', 'Technical Analysis of the Financial Markets', 'John Murphy', 1999, 'Intermarket analysis — bonds, commodities, the dollar and equities move in a recognisable relay, not in isolation.', 'inter');
book('technical', 'Reminiscences of a Stock Operator', 'Edwin Lefèvre', 1923, 'The money is made in the sitting. Most traders are right about direction and wrong about patience.', 'sit');
book('technical', 'The Wyckoff Methodology', 'Richard Wyckoff', 1931, 'Accumulation and distribution leave footprints in the relationship between volume and the spread of the bar.', 'wyckoff');
book('technical', 'Trade Like a Stock Market Wizard', 'Mark Minervini', 2013, 'Trend template: price above rising long-term averages, within reach of the high, with the low far behind. Context before entry.', 'template');
book('technical', 'Evidence-Based Technical Analysis', 'David Aronson', 2006, 'Most chart patterns do not survive a data-mining correction. Trend and momentum do.', 'evidence');
book('technical', 'Trading and Exchanges', 'Larry Harris', 2002, 'Know who is on the other side. Liquidity, order types and market structure determine what you actually pay.', 'micro');

school('risk', { name: 'Position sizing and bankroll', seat: 'The Bet Sizer', colour: '#b85', one: 'Edge decides direction; size decides whether you are still here to use the edge again.' });
book('risk', 'Fortune’s Formula', 'William Poundstone', 2005, 'The Kelly criterion maximises long-run growth, and full Kelly is far too violent for anyone with a career.', 'kelly');
book('risk', 'A Man for All Markets', 'Edward Thorp', 2017, 'Size from edge and variance, never from conviction. Conviction is not an input.', 'size');
book('risk', 'Trade Your Way to Financial Freedom', 'Van Tharp', 1998, 'Expectancy per unit of risk, multiplied by opportunity, is the whole of a system’s merit.', 'expectancy');
book('risk', 'Market Wizards', 'Jack Schwager', 1989, 'Across wildly different methods, the common thread is predefined risk per trade and no exceptions.', 'stop');
book('risk', 'The New Market Wizards', 'Jack Schwager', 1992, 'Asymmetry is sought deliberately: the best traders look for setups where being wrong is cheap.', 'asym');
book('risk', 'Risk Management and Financial Institutions', 'John Hull', 2007, 'Value at risk tells you the loss you will exceed, not the loss you will take. Stress the tail separately.', 'var');

school('portfolio', { name: 'Portfolio construction', seat: 'The Allocator', colour: '#89c', one: 'Diversification is the only thing in finance that improves the return per unit of risk without requiring you to be right.' });
book('portfolio', 'Portfolio Selection', 'Harry Markowitz', 1952, 'Risk is a property of the portfolio, not of the holding. Correlation does more work than selection.', 'mpt');
book('portfolio', 'A Random Walk Down Wall Street', 'Burton Malkiel', 1973, 'After costs, most active management loses to the index, and the losers are not identifiable in advance.', 'index');
book('portfolio', 'Common Sense on Mutual Funds', 'John Bogle', 1999, 'Cost is the one variable with a guaranteed, known, negative effect on return. Minimise it first.', 'cost');
book('portfolio', 'The Four Pillars of Investing', 'William Bernstein', 2002, 'Theory, history, psychology and the business of investing — be weak in any one and the other three will not save you.', 'pillars');
book('portfolio', 'Winning the Loser’s Game', 'Charles Ellis', 1998, 'Amateur tennis is won by not making errors. So is investing.', 'errors');
book('portfolio', 'Pioneering Portfolio Management', 'David Swensen', 2000, 'Equity orientation plus genuine diversification plus patience with illiquidity, rebalanced with discipline.', 'endow');
book('portfolio', 'Global Asset Allocation', 'Meb Faber', 2015, 'Every famous asset allocation lands within a couple of points of the others. The fee you pay to implement it matters more than the mix.', 'mix');

school('fixed', { name: 'Fixed income', seat: 'The Bond Desk', colour: '#5a9', one: 'A bond is a contract. Duration tells you the rate risk, credit tells you the repayment risk, and the yield pays you for both.' });
book('fixed', 'The Handbook of Fixed Income Securities', 'Frank Fabozzi', 1983, 'Duration and convexity decompose a bond’s sensitivity to rates; everything structured is built from those two.', 'duration');
book('fixed', 'A History of Interest Rates', 'Sidney Homer & Richard Sylla', 1963, 'Four thousand years of rates: the level is never permanent, and every generation believes its own is normal.', 'history');
book('fixed', 'Inside the Yield Book', 'Martin Leibowitz & Sidney Homer', 1972, 'Total return on a bond is dominated by reinvestment, which is why yield-to-maturity flatters long holdings.', 'reinvest');
book('fixed', 'The Bond Book', 'Annette Thau', 1992, 'The retail bond buyer’s real enemies are the spread on the trade and inflation, in that order.', 'retail');
book('fixed', 'Interest Rate Markets', 'Siddhartha Jha', 2011, 'The curve is a forecast plus a term premium. Separating them is the entire trade.', 'curve');

school('options', { name: 'Volatility and derivatives', seat: 'The Vol Trader', colour: '#a69', one: 'An option prices a distribution. You are never trading direction alone — you are trading the market’s estimate of how wide the outcome is.' });
book('options', 'Option Volatility and Pricing', 'Sheldon Natenberg', 1988, 'Trade the spread between implied and realised volatility; direction is the part of the position you hedge away.', 'iv');
book('options', 'Options, Futures and Other Derivatives', 'John Hull', 1988, 'Every derivative is replicable by a dynamic position in the underlying — the price is the cost of that replication.', 'replicate');
book('options', 'Volatility Trading', 'Euan Sinclair', 2008, 'Implied volatility is on average slightly above realised, which is a premium for bearing gap risk, not free money.', 'premium');
book('options', 'Dynamic Hedging', 'Nassim Taleb', 1997, 'Textbook greeks break exactly when you need them. Know the behaviour of your position in the discontinuous case.', 'greeks');

school('valuation', { name: 'Valuation craft', seat: 'The Valuer', colour: '#8ab', one: 'Value is the present value of the cash a business will return to its owners. Everything else is a shortcut to that number.' });
book('valuation', 'Investment Valuation', 'Aswath Damodaran', 1996, 'Discounted cash flow, relative multiples and option-based value each answer a different question. Use the one the asset fits.', 'dcf');
book('valuation', 'The Dark Side of Valuation', 'Aswath Damodaran', 2001, 'For young or cyclical companies, value the story’s end state and discount for the probability of never reaching it.', 'young');
book('valuation', 'Valuation: Measuring and Managing the Value of Companies', 'Koller, Goedhart & Wessels', 1990, 'Value is driven by growth and return on invested capital against the cost of capital. Growth below the cost of capital destroys value.', 'roic');
book('valuation', 'Expectations Investing', 'Michael Mauboussin & Alfred Rappaport', 2001, 'Run the DCF backwards: solve for the growth the current price requires, then judge whether that is plausible.', 'reverse');
book('valuation', 'The Little Book of Valuation', 'Aswath Damodaran', 2011, 'Every valuation is biased; what matters is knowing the direction of your own bias before you start.', 'bias');

school('shortside', { name: 'The short side', seat: 'The Sceptic', colour: '#c66', one: 'Someone has to ask how this ends badly, and the question is most useful when the position is already working.' });
book('shortside', 'The Art of Short Selling', 'Kathryn Staley', 1997, 'Shorts are found in the filings: related-party transactions, serial acquisitions that obscure organic growth, auditor changes.', 'flags');
book('shortside', 'Sold Short', 'Manuel Asensio', 2001, 'Promotion intensity is a signal. Companies that need to sell their story usually cannot sell their product.', 'promote');
book('shortside', 'The Big Short', 'Michael Lewis', 2010, 'Being right early is indistinguishable from being wrong, and the financing of the position decides which one you end up being.', 'early');
book('shortside', 'Fooling Some of the People All of the Time', 'David Einhorn', 2008, 'A short thesis takes years, invites hostility, and needs a catalyst that is not simply valuation.', 'catalyst');

school('history', { name: 'Market history', seat: 'The Historian', colour: '#996', one: 'Nothing in markets is new. The mechanism repeats even when the instruments change names.' });
book('history', 'Triumph of the Optimists', 'Dimson, Marsh & Staunton', 2002, 'A century of global data: equities beat bonds and bills almost everywhere, but the equity premium is smaller and more variable than folklore says.', 'premium');
book('history', 'Stocks for the Long Run', 'Jeremy Siegel', 1994, 'Real equity returns have been remarkably stable across two centuries, which is an argument for horizon, not for timing.', 'long');
book('history', 'The Great Crash 1929', 'John Kenneth Galbraith', 1955, 'The mood that precedes a crash is indistinguishable from the mood that precedes a continuation. Only leverage tells them apart.', 'crash');
book('history', 'Once in Golconda', 'John Brooks', 1969, 'Markets are a social institution. The rules change after each failure, which is why the next failure is somewhere new.', 'social');
book('history', 'Why Stock Markets Crash', 'Didier Sornette', 2003, 'Log-periodic acceleration before a crash: the signature is faster-than-exponential price growth, not a high level.', 'accel');

school('commodity', { name: 'Commodities and real assets', seat: 'The Real Asset Desk', colour: '#a85', one: 'Commodities have no cash flow, so the return is spot change plus roll yield, and the supply response is the whole cycle.' });
book('commodity', 'Hot Commodities', 'Jim Rogers', 2004, 'Bull markets in commodities are supply stories. Nothing cures a high price like a high price, but the cure takes a decade.', 'supply');
book('commodity', 'The Prize', 'Daniel Yergin', 1991, 'Oil prices are political as often as they are economic. The marginal barrel has an address.', 'oil');
book('commodity', 'Facts and Fantasies about Commodity Futures', 'Gorton & Rouwenhorst', 2006, 'A collateralised futures index earned equity-like returns with negative correlation to stocks — mainly through roll, not spot.', 'roll');
book('commodity', 'The New Case for Gold', 'James Rickards', 2016, 'Gold is insurance against monetary regime change rather than a return-seeking asset. Size it accordingly.', 'gold');

school('crypto', { name: 'Digital assets', seat: 'The Crypto Desk', colour: '#96c', one: 'A protocol asset is valued on monetary premium plus network usage, and neither is in any financial statement.' });
book('crypto', 'The Bitcoin Standard', 'Saifedean Ammous', 2018, 'Verifiable scarcity plus a credible issuance schedule is the whole claim to monetary premium.', 'scarce');
book('crypto', 'The Infinite Machine', 'Camila Russo', 2020, 'Programmable settlement creates fee demand; fee demand is the only fundamental a smart-contract chain has.', 'fees');
book('crypto', 'Digital Gold', 'Nathaniel Popper', 2015, 'Every cycle so far has been driven by new access rails — exchanges, custody, ETFs — not by new use cases.', 'rails');
book('crypto', 'Layered Money', 'Nik Bhatia', 2021, 'Money has always been layered, with settlement at the base and credit above it. Crypto rebuilt the same pyramid.', 'layers');

school('index', { name: 'The null hypothesis', seat: 'The Indexer', colour: '#778', one: 'Before any of this: can you beat owning the whole market at four basis points? Usually not, and the honest answer belongs in the verdict.' });
book('index', 'The Little Book of Common Sense Investing', 'John Bogle', 2007, 'The market return minus costs is the average investor’s return, by arithmetic, before skill enters the discussion.', 'arith');
book('index', 'The Index Revolution', 'Charles Ellis', 2016, 'Markets became efficient because the professionals got good, not because investors got smart.', 'eff');
book('index', 'Unconventional Success', 'David Swensen', 2005, 'For an individual, the fund industry’s incentives are the main obstacle, not the market’s difficulty.', 'fees');
book('index', 'The Bogleheads’ Guide to Investing', 'Larimore, Lindauer & LeBoeuf', 2006, 'Save more, hold a low-cost global portfolio, rebalance, and do not look at it. The boring answer wins most of the time.', 'simple');

L.schoolList = () => Object.values(L.schools);
L.count = () => L.books.length;
L.search = q => { q = String(q).toLowerCase(); return L.books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.idea.toLowerCase().includes(q)); };
})();
