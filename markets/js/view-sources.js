// ============================================================================
// TERMINAL — sources. What is live, what is simulated, and how to change that.
// This page is the honesty layer made visible: every badge elsewhere in the
// terminal is driven by the ledger shown here, not by a hard-coded label.
// ============================================================================
'use strict';
(function () {
const el = M.el, UI = M.UI;

const PROVIDERS = [
  { key: 'finnhub', name: 'Finnhub', what: 'US equity quotes, real trades over a websocket, company fundamentals and a general news feed.', free: 'Free tier, 60 calls a minute. No card.', url: 'https://finnhub.io/register', gives: ['Live stock prices', 'Live fundamentals', 'Live news'] },
  { key: 'twelvedata', name: 'Twelve Data', what: 'Quotes and historical bars across equities, FX and crypto.', free: 'Free tier, 800 calls a day.', url: 'https://twelvedata.com/pricing', gives: ['Live stock prices'] },
  { key: 'alphavantage', name: 'Alpha Vantage', what: 'The company Overview endpoint — real P/E, margins, returns on capital, book value.', free: 'Free key, 25 calls a day, so it is pulled only when you ask on a symbol page.', url: 'https://www.alphavantage.co/support/#api-key', gives: ['Live fundamentals'] },
  { key: 'marketaux', name: 'Marketaux', what: 'Market news already tagged by ticker and sentiment.', free: 'Free tier, 100 requests a day.', url: 'https://www.marketaux.com', gives: ['Live news'] },
  { key: 'llm', name: 'Language model (optional)', what: 'Writes the council’s computed verdict up as prose. It never changes a number — the analysis is finished before it is called.', free: 'Anthropic or OpenAI key. Billed by them, not here.', url: '', gives: ['Written briefs'] }
];

function statusRow(s) {
  const cls = s.status === 'live' ? 'live' : s.status === 'error' ? 'err' : 'sim';
  return el('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px', padding: '9px 12px', borderBottom: '1px solid var(--line)', alignItems: 'center' } }, [
    el('div', {}, [
      el('div', { style: { fontWeight: 600, fontSize: '13px' }, text: s.name }),
      el('div', { class: 'dim', style: { fontSize: '11.5px', marginTop: '2px' }, text: s.detail || '—' })
    ]),
    el('span', { class: 'pill ' + cls, text: s.status === 'live' ? 'LIVE' : s.status === 'error' ? 'FAILED' : s.status === 'idle' ? 'READY' : 'OFF' })
  ]);
}

function statusCard() {
  const body = el('div', { class: 'cbody tight' });
  const paint = () => { M.clear(body); for (const s of M.sources.all()) body.appendChild(statusRow(s)); };
  paint();
  M.on('sources', M.throttle(() => { if (UI.current === 'sources') paint(); }, 1200));
  return UI.card('Feed status', body, el('button', { class: 'btn sm', text: 'Retry all', onclick: () => { M.Providers.refresh(); M.toast('Re-trying every feed…'); } }));
}

function keysCard() {
  const body = el('div', { class: 'cbody' });
  for (const p of PROVIDERS) {
    const input = el('input', { type: 'text', value: M.keys.get(p.key), placeholder: 'Paste key…', spellcheck: false });
    const row = el('div', { style: { borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '12px' } }, [
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' } }, [
        el('b', { text: p.name }),
        ...p.gives.map(g => el('span', { class: 'tag', text: g })),
        p.url ? el('a', { href: p.url, target: '_blank', rel: 'noopener', style: { marginLeft: 'auto', fontSize: '12px' }, text: 'Get a free key →' }) : null
      ]),
      el('p', { class: 'note', style: { margin: '0 0 7px' }, text: p.what + ' ' + p.free }),
      el('div', { style: { display: 'flex', gap: '6px' } }, [
        input,
        el('button', { class: 'btn', text: 'Save', onclick: () => { M.keys.set(p.key, input.value); M.toast(input.value ? p.name + ' key saved — reconnecting' : p.name + ' key cleared'); } }),
        M.keys.has(p.key) ? el('button', { class: 'btn', text: 'Clear', onclick: () => { input.value = ''; M.keys.set(p.key, ''); M.toast(p.name + ' key cleared'); } }) : null
      ])
    ]);
    if (p.key === 'llm') {
      const prov = el('select', { onchange: e => M.store.set('llmProvider', e.target.value) }, [
        el('option', { value: 'anthropic', selected: M.store.get('llmProvider', 'anthropic') === 'anthropic' ? true : null, text: 'Anthropic' }),
        el('option', { value: 'openai', selected: M.store.get('llmProvider', '') === 'openai' ? true : null, text: 'OpenAI' })
      ]);
      const model = el('input', { type: 'text', value: M.store.get('llmModel', 'claude-sonnet-4-5'), oninput: e => M.store.set('llmModel', e.target.value) });
      row.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', marginTop: '7px' } }, [prov, model]));
    }
    body.appendChild(row);
  }
  body.appendChild(el('div', { class: 'warn' }, [
    el('b', { text: 'Where these keys go. ' }),
    'They are written to this browser’s localStorage and sent to nobody except the provider the key belongs to, directly from this page. There is no server behind this terminal — it is a static page. If you share this browser profile, clear the keys when you are done.'
  ]));
  return UI.card('Provider keys', body);
}

function rssCard() {
  const body = el('div', { class: 'cbody' });
  const proxy = el('input', { type: 'text', value: M.store.get('corsProxy', ''), placeholder: 'https://your-proxy.example/?url={url}' });
  const feeds = el('textarea', { rows: 5, value: (M.store.get('rssFeeds', []) || []).join('\n'), placeholder: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml\nhttps://www.ft.com/markets?format=rss' });
  body.appendChild(el('p', { class: 'note' }, ['Most news RSS feeds refuse a browser request from another origin, so reading them needs a proxy that adds the CORS header. Nothing is fetched through a third party unless you deliberately put one here. ', el('b', { text: '{url}' }), ' is replaced with the encoded feed address.']));
  body.appendChild(el('label', { class: 'fld', style: { marginTop: '9px' } }, [el('span', { text: 'CORS proxy template' }), proxy]));
  body.appendChild(el('label', { class: 'fld' }, [el('span', { text: 'Feed addresses, one per line' }), feeds]));
  body.appendChild(el('button', { class: 'btn primary', text: 'Save and pull now', onclick: async () => {
    M.store.set('corsProxy', proxy.value.trim());
    M.store.set('rssFeeds', feeds.value.split('\n').map(s => s.trim()).filter(Boolean));
    const n = await M.News.pullLive();
    M.toast(n ? n + ' headlines pulled' : 'No headlines came back — check the proxy template', n ? 'ok' : 'err');
  } }));
  return UI.card('RSS feeds (optional)', body);
}

function explainCard() {
  const body = el('div', { class: 'cbody' });
  const p = (h, t) => { body.appendChild(el('h4', { style: { margin: '12px 0 4px', fontSize: '13px' }, text: h })); body.appendChild(el('p', { class: 'note', style: { margin: 0 }, text: t })); };
  body.appendChild(el('p', { class: 'note', style: { margin: 0 } }, ['This page exists because the easiest way to build something like this is to make up the numbers and never say so. Here is exactly what is real.']));
  p('Connects with no key at all', 'The US Treasury’s Debt to the Penny API re-anchors the national debt counter on the debt board. Coinbase, Binance and CoinGecko supply crypto spot — Binance’s websocket is genuinely tick-by-tick. The ECB reference fix supplies FX, once a day. If any of those fail in your browser, the status list above says so rather than quietly falling back.');
  p('Needs a free key', 'US equity prices and fundamentals, and real news headlines. Without a key, stock prices come from the terminal’s own simulation and fundamentals are modelled from sector medians. Both are badged SIM everywhere they appear, including inside the analyst council’s verdict.');
  p('Is always simulated', 'The depth ladder and the time-and-sales tape: real level-2 data is a paid, licensed product and no free tier provides it. Treasury yields, futures and index levels move on the simulation unless you connect a provider that covers them. The economic calendar shows real release cadences with generated outcomes.');
  p('Is never simulated', 'The analyst council itself. Every test it runs — Graham’s criteria, Piotroski’s nine, the Altman Z, the Beneish flags, CAN SLIM, the magic formula, the DCF and reverse DCF, Kelly sizing — is real arithmetic on whatever numbers it is given. Connect real fundamentals and the same engine produces a real analysis.');
  p('What this is not', 'It is not a brokerage, it is not advice, and no order placed here reaches a market. It is a terminal for learning how the pieces fit together, and an engine you can point at real data.');
  return UI.card('What is real and what is not', body);
}

UI.register('sources', {
  label: 'Sources',
  mount(node) {
    const wrap = el('div', { class: 'wrap' });
    const grid = el('div', { class: 'cols c2' });
    grid.appendChild(el('div', { class: 'grid' }, [statusCard(), explainCard()]));
    grid.appendChild(el('div', { class: 'grid' }, [keysCard(), rssCard()]));
    wrap.appendChild(grid);
    node.appendChild(wrap);
  }
});
})();
