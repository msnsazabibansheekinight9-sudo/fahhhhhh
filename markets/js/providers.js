// ============================================================================
// TERMINAL — the slow providers. Quotes live in realtime.js and the debt
// anchors in macro.js; what is left here is the request-per-answer material:
// company fundamentals, news feeds, and the optional language-model bridge.
//
// Keys are kept in this browser and sent to nobody but the provider they
// belong to. There is no server behind any of this.
// ============================================================================
'use strict';
(function () {
const P = M.Providers = {};
const U = M.Universe, SRC = M.sources;

SRC.declare('finnhub', { name: 'Finnhub — fundamentals and news', kind: 'fundamentals', url: 'https://finnhub.io/register', detail: 'Free key.' });
SRC.declare('alphavantage', { name: 'Alpha Vantage — fundamentals', kind: 'fundamentals', url: 'https://www.alphavantage.co/support/#api-key', detail: 'Free key, 25 calls a day. Pulled on demand.' });
SRC.declare('marketaux', { name: 'Marketaux — market news', kind: 'news', url: 'https://www.marketaux.com', detail: 'Free key. Headlines tagged by ticker.' });
SRC.declare('llm', { name: 'Language model bridge', kind: 'ai', url: '', detail: 'Optional. Writes narrative over the council verdict.' });

// ------------------------------------------------------------------ fundamentals
const FH = () => M.keys.get('finnhub');

P.fundamentals = async (inst) => {
  if (!FH() || inst.type !== 'stock') return false;
  try {
    const j = await M.net.json('https://finnhub.io/api/v1/stock/metric?symbol=' + encodeURIComponent(inst.sym.replace('.', '-')) + '&metric=all&token=' + FH(), { timeout: 11000 });
    const m = j && j.metric; if (!m) return false;
    const f = inst.f, n = (v, cur) => (isFinite(v) && v !== 0 ? v : cur);
    f.pe = n(m.peTTM, f.pe); f.pb = n(m.pbQuarterly ?? m.pbAnnual, f.pb); f.ps = n(m.psTTM, f.ps);
    f.eps = n(m.epsTTM ?? m.epsBasicExclExtraItemsTTM, f.eps);
    f.roe = n(m.roeTTM, f.roe); f.roa = n(m.roaTTM, f.roa); f.roic = n(m.roiTTM, f.roic);
    f.grossMargin = n(m.grossMarginTTM, f.grossMargin); f.opMargin = n(m.operatingMarginTTM, f.opMargin); f.netMargin = n(m.netProfitMarginTTM, f.netMargin);
    f.currentRatio = n(m.currentRatioQuarterly, f.currentRatio); f.quickRatio = n(m.quickRatioQuarterly, f.quickRatio);
    f.debtEquity = n(m['totalDebt/totalEquityQuarterly'], f.debtEquity);
    f.divYield = n(m.dividendYieldIndicatedAnnual, f.divYield);
    f.revGrowth = n(m.revenueGrowthTTMYoy, f.revGrowth); f.epsGrowth = n(m.epsGrowthTTMYoy, f.epsGrowth);
    f.epsGrowth5y = n(m.epsGrowth5Y, f.epsGrowth5y); f.revGrowth3y = n(m.revenueGrowth3Y, f.revGrowth3y);
    f.beta = n(m.beta, f.beta);
    f.src = 'Finnhub'; inst.fSrc = 'live';
    SRC.set('finnhub', 'live', 'Fundamentals pulled for ' + inst.sym);
    M.emit('fundamentals', inst);
    return true;
  } catch (e) { SRC.set('finnhub', 'error', e.message); return false; }
};

// 25 calls a day, so this only ever runs for the symbol in front of you, and
// only when you ask for it.
P.alphaOverview = async (inst) => {
  const key = M.keys.get('alphavantage');
  if (!key) throw new Error('No Alpha Vantage key');
  const j = await M.net.json('https://www.alphavantage.co/query?function=OVERVIEW&symbol=' + inst.sym + '&apikey=' + key, { timeout: 14000 });
  if (!j || !j.Symbol) throw new Error(j.Note || j.Information || 'no overview returned');
  const f = inst.f, num = (v, cur) => { const x = parseFloat(v); return isFinite(x) && x !== 0 ? x : cur; };
  f.pe = num(j.PERatio, f.pe); f.fpe = num(j.ForwardPE, f.fpe); f.pb = num(j.PriceToBookRatio, f.pb);
  f.ps = num(j.PriceToSalesRatioTTM, f.ps); f.eps = num(j.EPS, f.eps);
  f.evEbitda = num(j.EVToEBITDA, f.evEbitda); f.ebitda = num(j.EBITDA, f.ebitda);
  f.revenue = num(j.RevenueTTM, f.revenue);
  f.grossMargin = num(parseFloat(j.GrossProfitTTM) / parseFloat(j.RevenueTTM) * 100, f.grossMargin);
  f.opMargin = num(parseFloat(j.OperatingMarginTTM) * 100, f.opMargin);
  f.netMargin = num(parseFloat(j.ProfitMargin) * 100, f.netMargin);
  f.roe = num(parseFloat(j.ReturnOnEquityTTM) * 100, f.roe); f.roa = num(parseFloat(j.ReturnOnAssetsTTM) * 100, f.roa);
  f.divYield = num(parseFloat(j.DividendYield) * 100, f.divYield);
  f.beta = num(j.Beta, f.beta); f.mcap = num(j.MarketCapitalization, f.mcap);
  f.bvps = num(j.BookValue, f.bvps); f.revGrowth = num(parseFloat(j.QuarterlyRevenueGrowthYOY) * 100, f.revGrowth);
  f.epsGrowth = num(parseFloat(j.QuarterlyEarningsGrowthYOY) * 100, f.epsGrowth);
  f.src = 'Alpha Vantage'; inst.fSrc = 'live';
  if (j.Description) inst.about = j.Description;
  SRC.set('alphavantage', 'live', 'Overview pulled for ' + inst.sym);
  M.emit('fundamentals', inst);
  return j;
};

// ------------------------------------------------------------------ news
P.newsFinnhub = async () => {
  const key = FH(); if (!key) return null;
  const j = await M.net.json('https://finnhub.io/api/v1/news?category=general&token=' + key, { timeout: 11000 });
  if (!Array.isArray(j)) throw new Error('bad payload');
  return j.slice(0, 60).map(n => ({
    id: 'fh' + n.id, t: (n.datetime || 0) * 1000, head: n.headline, body: n.summary || '',
    src: n.source || 'Finnhub', url: n.url, tickers: (n.related || '').split(',').filter(Boolean).slice(0, 6), live: true
  }));
};
P.newsMarketaux = async () => {
  const key = M.keys.get('marketaux'); if (!key) return null;
  const j = await M.net.json('https://api.marketaux.com/v1/news/all?language=en&filter_entities=true&limit=50&api_token=' + key, { timeout: 11000 });
  if (!j || !j.data) throw new Error(j && j.error ? j.error.message : 'bad payload');
  return j.data.map(n => ({
    id: 'mx' + n.uuid, t: Date.parse(n.published_at), head: n.title, body: n.description || n.snippet || '',
    src: n.source, url: n.url, tickers: (n.entities || []).filter(e => e.type === 'equity').map(e => e.symbol).slice(0, 6),
    sentiment: (n.entities || []).reduce((a, e) => a + (e.sentiment_score || 0), 0) / Math.max(1, (n.entities || []).length), live: true
  }));
};
// Any RSS feed, through a proxy you supply. Nothing goes through a third party
// unless you deliberately put one in.
P.newsRSS = async (url) => {
  const proxy = M.store.get('corsProxy', '');
  if (!proxy) return null;
  const txt = await M.net.text(proxy.replace('{url}', encodeURIComponent(url)), { timeout: 13000 });
  const doc = new DOMParser().parseFromString(txt, 'text/xml');
  const items = [...doc.querySelectorAll('item, entry')].slice(0, 40);
  return items.map((it, k) => {
    const g = t => { const n = it.querySelector(t); return n ? n.textContent.trim() : ''; };
    const linkEl = it.querySelector('link');
    const link = g('link') || (linkEl && linkEl.getAttribute('href')) || '';
    return { id: 'rss' + M.hash(g('title') + k), t: Date.parse(g('pubDate') || g('updated') || g('published')) || Date.now(), head: g('title'), body: g('description').replace(/<[^>]+>/g, '').slice(0, 400), src: (() => { try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return 'RSS'; } })(), url: link, tickers: [], live: true };
  }).filter(n => n.head);
};

// ------------------------------------------------------------------ model bridge
// Optional. The council's verdict is computed locally either way; this only
// asks a model to write it up, and the UI labels that prose as prose.
P.llm = async (prompt, system) => {
  const prov = M.store.get('llmProvider', 'anthropic');
  const key = M.keys.get('llm');
  if (!key) throw new Error('No model key set');
  if (prov === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: M.store.get('llmModel', 'claude-sonnet-4-5'), max_tokens: 1400, system: system || '', messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    return j.content.map(c => c.text || '').join('');
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: M.store.get('llmModel', 'gpt-4o-mini'), max_tokens: 1400, messages: [{ role: 'system', content: system || '' }, { role: 'user', content: prompt }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
  return j.choices[0].message.content;
};

P.start = () => {
  const mark = (id, key, on, off) => SRC.set(id, M.keys.get(key) ? 'idle' : 'off', M.keys.get(key) ? on : off);
  mark('finnhub', 'finnhub', 'Key set. Fundamentals and news pull from here.', 'No key — fundamentals stay modelled.');
  mark('alphavantage', 'alphavantage', 'Key set. Pulled on demand from a symbol page.', 'No key.');
  mark('marketaux', 'marketaux', 'Key set.', 'No key — the wire generates its own stories.');
  mark('llm', 'llm', 'Key set. Used only when you ask for a written brief.', 'No key. The council still runs — it is local.');
  M.on('keys', () => P.start());
};
P.refresh = () => { if (M.RT) M.RT.refresh(); if (M.Macro) M.Macro.refresh(); };
})();
