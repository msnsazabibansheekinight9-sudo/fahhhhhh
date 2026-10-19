// ============================================================================
// TERMINAL — boot. Starts the clock, the simulation, the feeds, the wire and
// the account, then hands over to the shell and opens whatever the URL asked
// for. Everything above this file is independent of everything below it.
// ============================================================================
'use strict';
(function () {
function boot() {
  M.Sim.start();
  M.Portfolio.start();
  M.News.start();
  M.Providers.start();
  M.RT.start();
  M.Macro.start();
  M.UI.start();

  const [id, arg] = (location.hash || '').replace('#', '').split('/');
  M.UI.go(M.UI.views[id] ? id : 'debt', arg);

  // One keyboard layer for the whole terminal.
  document.addEventListener('keydown', e => {
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    const go = { d: 'debt', m: 'markets', n: 'news', a: 'ai', p: 'portfolio', s: 'screener', c: 'sources', g: 'geo', f: 'tools' }[e.key.toLowerCase()];
    if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); M.UI.go('tools', 'feeds'); return; }
    if (go && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); M.UI.go(go); }
    if (e.key === 'Backspace') { e.preventDefault(); M.UI.back(); }
  });

  console.log('%cLedger Terminal', 'color:#f0b429;font:600 15px monospace',
    `\n${M.Universe.count()} instruments · ${M.Library.count()} books · ${M.Analysts.seatList().length} analyst seats` +
    '\nEverything is local. Nothing is sent anywhere except directly to a provider whose key you pasted.' +
    '\nPaper trading only. Not investment advice.');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
