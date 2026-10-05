// ============================================================================
// IRONSIGHT — how the armory is classified. The player picks the scheme (weapon
// type, era, country, calibre, action, decade, or their own groups) and the order
// within each category (oldest first, newest first, A–Z, most used). Their own
// groups are named collections they fill themselves; a gun can sit in several.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const store = { get(k, d) { try { const v = localStorage.getItem('ironsight.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ironsight.' + k, JSON.stringify(v)); } catch (e) {} } };
const C = G.Classify = {};

const ACTS = { bolt: 'Bolt action', semi: 'Semi-automatic', auto: 'Selective / automatic', auto_ob: 'Open bolt automatic', pump: 'Pump action', lever: 'Lever action', rev: 'Revolver', muzzle: 'Muzzle-loader', break: 'Break-action', single: 'Single-shot breechloader', cannon: 'Muzzle-loading cannon', breech: 'Breech-loading gun', mortar: 'Mortar', crank: 'Hand-cranked' };
const actOf = w => ACTS[w.act] ? w.act : 'other';
const decadeOf = y => y < 1700 ? 'pre1700' : y < 1800 ? '1700s' : y < 1900 ? String(Math.floor(y / 10) * 10) : String(Math.floor(y / 10) * 10);
const decadeName = k => k === 'pre1700' ? 'Before 1700' : k === '1700s' ? '1700s' : k + 's';
const eraOf = w => w.custom ? 'custom' : w.e;
const byYear = (a, b) => (a.y || 0) - (b.y || 0) || a.n.localeCompare(b.n);
const typeName = id => (G.TYPE_NAMES && G.TYPE_NAMES[id]) || (G.CLASS_NAMES && G.CLASS_NAMES[id]) || id;

// ------------------------------------------------------------------ your own groups
C.groups = store.get('groups', { Favourites: [] });
C.saveGroups = () => store.set('groups', C.groups);
C.groupsOf = id => Object.keys(C.groups).filter(g => C.groups[g].includes(id));
C.addTo = (g, id) => { g = String(g).trim().slice(0, 40); if (!g) return null; const a = C.groups[g] = C.groups[g] || []; if (!a.includes(id)) a.push(id); C.saveGroups(); return g; };
C.removeFrom = (g, id) => { const a = C.groups[g]; if (!a) return; const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); C.saveGroups(); };
C.renameGroup = (g, n) => { n = String(n).trim().slice(0, 40); if (!n || !C.groups[g] || C.groups[n]) return false; C.groups[n] = C.groups[g]; delete C.groups[g]; C.saveGroups(); return true; };
C.deleteGroup = g => { delete C.groups[g]; C.saveGroups(); };

// ------------------------------------------------------------------ schemes: what a category is, how categories are ordered, and the dividers inside one
// cats(w) → the category keys a gun belongs to; names(k) → label; sortCats(keys) → order; sub(w) → divider inside a category
C.SCHEMES = [
  { id: 'type', n: 'Weapon type', cats: w => [G.typeOf(w)], name: typeName, sortCats: ks => (G.TYPE_ORDER || []).filter(k => ks.includes(k)).concat(ks.filter(k => !(G.TYPE_ORDER || []).includes(k))), sub: (w, cat) => cat === 'PSY' ? (G.PSY_TIERS[w.psy] || 'Psycho Arsenal') : cat === 'CUSTOM' ? 'Your designs' : G.periodOf(w.y) },
  { id: 'era', n: 'Era', cats: w => [eraOf(w)], name: k => (G.ERA[k] || {}).name || k, sortCats: ks => { const o = ['powder', 'ww1', 'ww2', 'cold', 'mod', 'now', 'artillery', 'psycho', 'custom']; return o.filter(k => ks.includes(k)).concat(ks.filter(k => !o.includes(k))); }, sub: w => decadeName(decadeOf(w.y || 0)) },
  { id: 'country', n: 'Country', cats: w => [w.co || 'Unknown'], name: k => k, sortCats: ks => ks.sort((a, b) => a.localeCompare(b)), sub: w => G.periodOf(w.y) },
  { id: 'cal', n: 'Calibre', cats: w => [w.cal || 'Unknown'], name: k => k, sortCats: ks => ks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), sub: w => G.periodOf(w.y) },
  { id: 'action', n: 'Action', cats: w => [actOf(w)], name: k => ACTS[k] || 'Other', sortCats: ks => Object.keys(ACTS).concat('other').filter(k => ks.includes(k)), sub: w => G.periodOf(w.y) },
  { id: 'decade', n: 'Decade', cats: w => [decadeOf(w.y || 0)], name: decadeName, sortCats: ks => ks.sort((a, b) => (a === 'pre1700' ? 0 : parseInt(a)) - (b === 'pre1700' ? 0 : parseInt(b))), sub: w => String(w.y) },
  { id: 'mine', n: 'My groups', cats: w => C.groupsOf(w.id), name: k => k, sortCats: ks => ks, sub: w => G.periodOf(w.y) },
  { id: 'all', n: 'Everything', cats: () => ['all'], name: () => 'Every weapon', sortCats: ks => ks, sub: w => G.periodOf(w.y) },
];
C.SCHEME = Object.fromEntries(C.SCHEMES.map(s => [s.id, s]));
C.ORDERS = [['old', 'Oldest first'], ['new', 'Newest first'], ['az', 'A – Z'], ['used', 'Most used']];

// every category of a scheme with its guns: [{ key, name, ws }]
C.categories = scheme => {
  const S = C.SCHEME[scheme] || C.SCHEME.type, m = new Map();
  if (scheme === 'mine') for (const g of Object.keys(C.groups)) m.set(g, []);
  for (const w of G.WEAPONS) for (const k of S.cats(w)) { if (!m.has(k)) m.set(k, []); m.get(k).push(w); }
  if (scheme === 'mine') for (const [g, ws] of m) { const ord = C.groups[g] || []; ws.sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); }
  return S.sortCats([...m.keys()]).map(k => ({ key: k, name: S.name(k), ws: m.get(k) }));
};
const used = id => { const T = G.Track && G.Track.d && G.Track.d.guns[id]; return T ? T.shots + T.bench * .5 + T.time : 0; };
// a category's guns in the chosen order, with the divider each one falls under
C.list = (scheme, cat, order) => {
  const S = C.SCHEME[scheme] || C.SCHEME.type; const c = C.categories(scheme).find(x => x.key === cat); if (!c) return [];
  let ws = c.ws.slice();
  if (order === 'new') ws.sort((a, b) => byYear(b, a));
  else if (order === 'az') ws.sort((a, b) => a.n.localeCompare(b.n));
  else if (order === 'used') ws.sort((a, b) => used(b.id) - used(a.id) || byYear(a, b));
  else ws.sort(byYear);
  if (scheme === 'type' && cat === 'PSY' && (order === 'old' || order === 'new')) ws.sort((a, b) => (a.psy === 'overkill') - (b.psy === 'overkill') || (order === 'new' ? byYear(b, a) : byYear(a, b)));
  return ws.map(w => ({ w, div: order === 'az' ? (w.n[0] || '#').toUpperCase() : order === 'used' ? (used(w.id) ? 'Used' : 'Not used yet') : S.sub(w, cat) }));
};
// the category a gun falls under in a scheme (the first one, for guns in several groups)
C.catOf = (scheme, w, prefer) => { const ks = (C.SCHEME[scheme] || C.SCHEME.type).cats(w); return ks.includes(prefer) ? prefer : ks[0]; };
})();
