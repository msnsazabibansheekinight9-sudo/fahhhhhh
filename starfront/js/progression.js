// Player profile: credits and shards (both earned in play only), XP/level, 8 battle passes, shop with daily
// featured rotation, collection/loadouts, daily challenges, career stats and the Sector Conquest campaign state.
var SF = window.SF || (window.SF = {});

(function () {
  var P = SF.Prog = {};
  var KEY = 'starfront_profile_v1';
  var D = function () { return SF.D; };

  function defaults() {
    return {
      credits: 5000, shards: 200, xp: 0, level: 1,
      unlocked: { heroes: {}, weapons: {}, cards: { bodyArmor: 1, quickCool: 1 }, skins: {}, emotes: { wave: 1, salute: 1 } },
      equipped: { classes: {}, heroes: {}, emotes: ['wave', 'salute', null, null], title: 'Recruit' },
      titles: ['Recruit'],
      seasons: {}, activeSeason: 's1',
      stats: { matches: 0, wins: 0, kills: 0, deaths: 0, heroKills: 0, vehicleKills: 0, captures: 0, playtime: 0, bestStreak: 0, heroMatches: 0, spaceMatches: 0 },
      challenges: null,
      campaign: null,
      settings: { quality: 1, shadows: true, fov: 75, sens: 1, invertY: false, volume: 0.7, difficulty: 'normal', teamSize: 1, showFps: false, thirdPerson: true, autoSprint: false }
    };
  }
  P.load = function () {
    var p = defaults();
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) deepMerge(p, s); } catch (e) { }
    P.p = p;
    // free legends
    D().heroes.forEach(function (h) { if (!h.price) p.unlocked.heroes[h.id] = 1; });
    D().seasons.forEach(function (s) { if (!p.seasons[s.id]) p.seasons[s.id] = { xp: 0, premium: false, claimed: {} }; });
    P.ensureChallenges();
    return p;
  };
  function deepMerge(a, b) { for (var k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } }
  P.save = function () { try { localStorage.setItem(KEY, JSON.stringify(P.p)); } catch (e) { } };
  P.reset = function () { try { localStorage.removeItem(KEY); } catch (e) { } P.load(); };

  // ------------------------------------------------------------------ ownership
  P.weaponOwned = function (id) { var w = D().weapons[id]; return !w || !w.price || !!P.p.unlocked.weapons[id]; };
  P.heroOwned = function (id) { return !!P.p.unlocked.heroes[id]; };
  P.cardOwned = function (id) { return !!P.p.unlocked.cards[id]; };
  P.skinOwned = function (key) { return key.split(':')[1] === 'default' || !!P.p.unlocked.skins[key]; };
  P.emoteOwned = function (id) { return !!P.p.unlocked.emotes[id]; };
  P.classLoadout = function (faction, classId) {
    var key = faction + ':' + classId;
    var l = P.p.equipped.classes[key] || {};
    var list = (D().loadouts[faction] || {})[classId] || [];
    if (!l.weapon || list.indexOf(l.weapon) < 0 || !P.weaponOwned(l.weapon)) l.weapon = list[0];
    if (!l.cards) l.cards = [];
    l.cards = l.cards.filter(P.cardOwned).slice(0, 3);
    if (!l.skin || !P.skinOwned('f:' + faction + ':' + l.skin)) l.skin = 'default';
    return l;
  };
  P.setClassLoadout = function (faction, classId, l) { P.p.equipped.classes[faction + ':' + classId] = l; P.save(); };
  P.heroSkin = function (heroId) { var s = (P.p.equipped.heroes[heroId] || {}).skin || 'default'; return P.skinOwned('h:' + heroId + ':' + s) || s === 'default' ? s : 'default'; };
  P.setHeroSkin = function (heroId, s) { P.p.equipped.heroes[heroId] = { skin: s }; P.save(); };

  // ------------------------------------------------------------------ shop catalogue
  P.catalogue = function () {
    var items = [];
    D().heroes.forEach(function (h) { if (h.price) items.push({ key: 'hero:' + h.id, cat: 'Legends', name: h.name, sub: h.title + ' · ' + D().eraById[h.era].name, price: h.price, cur: 'credits', owned: P.heroOwned(h.id) }); });
    Object.keys(D().weapons).forEach(function (id) { var w = D().weapons[id]; if (w.price) items.push({ key: 'weapon:' + id, cat: 'Weapons', name: w.name, sub: w.kind + ' · ' + w.dmg + ' dmg · ' + w.rpm + ' rpm', price: w.price, cur: 'credits', owned: P.weaponOwned(id) }); });
    D().starCards.forEach(function (c) { items.push({ key: 'card:' + c.id, cat: 'Star Cards', name: c.name, sub: c.desc, price: c.price, cur: 'credits', owned: P.cardOwned(c.id) }); });
    ['concord', 'syndicate', 'alliance', 'dominion', 'rangers', 'remnant'].forEach(function (f) {
      D().skinVariants.forEach(function (s, i) { if (s.id === 'default') return; items.push({ key: 'skin:f:' + f + ':' + s.id, cat: 'Trooper Looks', name: s.name, sub: D().factions[f].name + ' troopers', price: i > 9 ? 300 : 0, cur: i > 9 ? 'shards' : 'credits', priceC: 1500 + i * 150, owned: P.skinOwned('f:' + f + ':' + s.id) }); });
    });
    D().heroes.forEach(function (h) {
      ['crimson', 'midnight', 'gold', 'veteran', 'shadow', 'chrome'].forEach(function (sid, i) { var s = D().skinById[sid]; items.push({ key: 'skin:h:' + h.id + ':' + sid, cat: 'Legend Looks', name: h.name + ' — ' + s.name, sub: 'Legend appearance', price: i < 3 ? 2500 + i * 500 : 400 + i * 100, cur: i < 3 ? 'credits' : 'shards', owned: P.skinOwned('h:' + h.id + ':' + sid) }); });
    });
    D().emotes.forEach(function (e) { if (e.price) items.push({ key: 'emote:' + e.id, cat: 'Emotes', name: e.name, sub: 'Emote', price: e.price, cur: 'credits', owned: P.emoteOwned(e.id) }); });
    items.forEach(function (it) { if (it.priceC) { it.price = it.cur === 'shards' ? it.price : it.priceC; } });
    return items;
  };
  P.featured = function () {
    var cat = P.catalogue().filter(function (i) { return !i.owned; });
    var day = Math.floor(Date.now() / 86400000);
    var out = [], seed = day * 9301 + 49297;
    for (var i = 0; i < 8 && cat.length; i++) { seed = (seed * 9301 + 49297) % 233280; out.push(cat.splice(seed % cat.length, 1)[0]); }
    out.forEach(function (it) { it.sale = true; it.price = Math.round(it.price * 0.7); });
    return out;
  };
  P.buy = function (item) {
    var p = P.p;
    if (item.owned) return 'Already owned';
    if (item.cur === 'shards') { if (p.shards < item.price) return 'Not enough Lumen Shards'; p.shards -= item.price; }
    else { if (p.credits < item.price) return 'Not enough credits'; p.credits -= item.price; }
    P.grant(item.key);
    P.save();
    return null;
  };
  P.grant = function (key) {
    var p = P.p, parts = key.split(':');
    if (parts[0] === 'hero') p.unlocked.heroes[parts[1]] = 1;
    else if (parts[0] === 'weapon') p.unlocked.weapons[parts[1]] = 1;
    else if (parts[0] === 'card') p.unlocked.cards[parts[1]] = 1;
    else if (parts[0] === 'skin') p.unlocked.skins[parts.slice(1).join(':')] = 1;
    else if (parts[0] === 'emote') p.unlocked.emotes[parts[1]] = 1;
    else if (parts[0] === 'title') { if (p.titles.indexOf(parts.slice(1).join(':')) < 0) p.titles.push(parts.slice(1).join(':')); }
    else if (parts[0] === 'credits') p.credits += +parts[1];
    else if (parts[0] === 'shards') p.shards += +parts[1];
  };

  // ------------------------------------------------------------------ battle passes
  P.TIER_XP = 1000;
  P.PREMIUM_COST = 950;
  var themeFaction = { kesh: 'alliance', glaciem: 'dominion', concord: 'concord', syndicate: 'syndicate', dominion: 'dominion', rangers: 'rangers', remnant: 'remnant', heroes: null };
  var titleWords = { s1: ['Dune Runner', 'Sandstorm', 'Twin Suns'], s2: ['Frostbite', 'Ice Breaker', 'Echo Veteran'], s3: ['Legionnaire', 'Clone Ace', 'Commander'], s4: ['Synth Slayer', 'Scrap Collector', 'Roger Roger'], s5: ['Dreadnought', 'Iron Fist', 'Grand Moff'], s6: ['Ferrosteel', 'Foundling', 'This Is The Way'], s7: ['Remnant Hunter', 'Shadow Breaker', 'Marshal'], s8: ['Legend', 'Chosen', 'Living Myth'] };
  // deterministic reward list per season
  P.seasonRewards = function (sid) {
    var s = D().seasonById[sid];
    var idx = D().seasons.indexOf(s);
    var fac = themeFaction[s.theme];
    var heroes = D().heroes.filter(function (h) { return fac ? D().factions[fac].era === h.era && D().factions[fac].side === h.side : true; });
    if (!heroes.length) heroes = D().heroes;
    var skins = ['desert', 'snow', 'forest', 'urban', 'crimson', 'midnight', 'gold', 'veteran', 'purple', 'orange', 'green', 'shadow', 'chrome'];
    var facs = fac ? [fac] : ['concord', 'alliance', 'rangers', 'syndicate', 'dominion', 'remnant'];
    var emotes = D().emotes.filter(function (e) { return e.price; });
    var cards = D().starCards;
    var out = [];
    for (var t = 1; t <= s.tiers; t++) {
      var free, prem;
      var r = (t * 7 + idx * 13) % 10;
      if (t % 10 === 0) free = { key: 'shards:100', label: '100 Lumen Shards' };
      else if (t % 5 === 0) free = { key: 'skin:f:' + facs[t % facs.length] + ':' + skins[(t + idx) % skins.length], label: D().skinById[skins[(t + idx) % skins.length]].name + ' (' + D().factions[facs[t % facs.length]].short + ')' };
      else if (r < 2) free = { key: 'card:' + cards[(t + idx) % cards.length].id, label: 'Star Card: ' + cards[(t + idx) % cards.length].name };
      else free = { key: 'credits:' + (250 + (t % 4) * 125), label: (250 + (t % 4) * 125) + ' Credits' };
      if (t === s.tiers) { var h = heroes[idx % heroes.length]; prem = { key: 'skin:h:' + h.id + ':gold', label: h.name + ' — Gilded (Tier 40)' }; }
      else if (t % 8 === 0) { var hh = heroes[(t + idx) % heroes.length]; prem = { key: 'skin:h:' + hh.id + ':' + ['crimson', 'midnight', 'shadow', 'chrome', 'veteran'][(t / 8) % 5], label: hh.name + ' look' }; }
      else if (t % 6 === 0) prem = { key: 'emote:' + emotes[(t + idx) % emotes.length].id, label: 'Emote: ' + emotes[(t + idx) % emotes.length].name };
      else if (t % 7 === 0) prem = { key: 'title:' + titleWords[sid][(t / 7) % 3 | 0], label: 'Title: ' + titleWords[sid][(t / 7) % 3 | 0] };
      else if (t % 3 === 0) prem = { key: 'shards:75', label: '75 Lumen Shards' };
      else prem = { key: 'credits:' + (500 + (t % 3) * 250), label: (500 + (t % 3) * 250) + ' Credits' };
      out.push({ tier: t, free: free, prem: prem });
    }
    return out;
  };
  P.seasonTier = function (sid) { var s = P.p.seasons[sid]; return Math.min(D().seasonById[sid].tiers, Math.floor(s.xp / P.TIER_XP)); };
  P.claim = function (sid, tier, track) {
    var s = P.p.seasons[sid];
    if (P.seasonTier(sid) < tier) return 'Tier not reached';
    if (track === 'prem' && !s.premium) return 'Premium pass required';
    var k = track + tier;
    if (s.claimed[k]) return 'Already claimed';
    var r = P.seasonRewards(sid)[tier - 1][track];
    P.grant(r.key); s.claimed[k] = 1; P.save();
    return null;
  };
  P.claimAll = function (sid) {
    var n = 0, s = P.p.seasons[sid], tier = P.seasonTier(sid);
    for (var t = 1; t <= tier; t++) { if (!s.claimed['free' + t]) { P.claim(sid, t, 'free'); n++; } if (s.premium && !s.claimed['prem' + t]) { P.claim(sid, t, 'prem'); n++; } }
    return n;
  };
  P.buyPremium = function (sid) {
    var s = P.p.seasons[sid];
    if (s.premium) return 'Already unlocked';
    if (P.p.shards < P.PREMIUM_COST) return 'Need ' + P.PREMIUM_COST + ' Lumen Shards (earn them from challenges and free tiers)';
    P.p.shards -= P.PREMIUM_COST; s.premium = true; P.save(); return null;
  };

  // ------------------------------------------------------------------ challenges
  var CH = [
    { id: 'kills', desc: 'Get {n} eliminations', n: [20, 30, 40], stat: 'kills' },
    { id: 'caps', desc: 'Capture {n} objectives', n: [3, 5, 8], stat: 'captures' },
    { id: 'win', desc: 'Win {n} matches', n: [1, 2, 3], stat: 'wins' },
    { id: 'hero', desc: 'Get {n} eliminations as a legend', n: [10, 15, 25], stat: 'heroKills' },
    { id: 'veh', desc: 'Destroy {n} vehicles', n: [2, 3, 5], stat: 'vehicleKills' },
    { id: 'space', desc: 'Play {n} space battles', n: [1, 2, 3], stat: 'spaceMatches' },
    { id: 'play', desc: 'Play {n} matches', n: [2, 3, 5], stat: 'matches' }
  ];
  P.ensureChallenges = function () {
    var day = Math.floor(Date.now() / 86400000);
    var c = P.p.challenges;
    if (c && c.day === day) return;
    var list = [], seed = day;
    var pool = CH.slice();
    for (var i = 0; i < 3; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var ch = pool.splice(seed % pool.length, 1)[0];
      var n = ch.n[i];
      list.push({ id: ch.id, desc: ch.desc.replace('{n}', n), goal: n, stat: ch.stat, base: P.p.stats[ch.stat] || 0, reward: 100 + i * 50, credits: 1000 + i * 500, done: false });
    }
    P.p.challenges = { day: day, list: list };
    P.save();
  };
  P.challengeProgress = function (c) { return Math.min(c.goal, (P.p.stats[c.stat] || 0) - c.base); };

  // ------------------------------------------------------------------ match rewards
  P.award = function (r) {
    var p = P.p, st = p.stats;
    st.matches++; if (r.won) st.wins++;
    st.kills += r.kills; st.deaths += r.deaths; st.heroKills += r.heroKills || 0; st.vehicleKills += r.vehicleKills || 0; st.captures += r.captures || 0;
    st.playtime += r.time || 0; st.bestStreak = Math.max(st.bestStreak, r.bestStreak || 0);
    if (r.space) st.spaceMatches++;
    if (r.heroUsed) st.heroMatches++;
    var credits = Math.round(150 + r.score / 8 + (r.won ? 350 : 100) + r.kills * 10);
    var xp = Math.round(r.score + (r.won ? 600 : 250) + r.kills * 20);
    p.credits += credits; p.xp += xp;
    var lvlBefore = p.level;
    while (p.xp >= P.xpFor(p.level + 1)) p.level++;
    var levelUps = p.level - lvlBefore;
    if (levelUps) { p.credits += levelUps * 500; p.shards += levelUps * 25; }
    var s = p.seasons[p.activeSeason];
    var tierBefore = P.seasonTier(p.activeSeason);
    s.xp += xp;
    var tierAfter = P.seasonTier(p.activeSeason);
    // challenges
    var done = [];
    p.challenges.list.forEach(function (c) { if (!c.done && P.challengeProgress(c) >= c.goal) { c.done = true; p.shards += c.reward; p.credits += c.credits; done.push(c); } });
    P.save();
    return { credits: credits, xp: xp, levelUps: levelUps, tierBefore: tierBefore, tierAfter: tierAfter, challenges: done };
  };
  P.xpFor = function (lvl) { return Math.round(800 * (lvl - 1) * (1 + (lvl - 1) * 0.08)); };

  // ------------------------------------------------------------------ Sector Conquest campaign
  P.newCampaign = function (era, side) {
    var planetIds = {};
    D().maps.forEach(function (m) { if (!m.space && (m.era === era || Math.random() < 0.4)) planetIds[m.planet] = 1; });
    var list = Object.keys(planetIds).slice(0, 12);
    while (list.length < 8) { var any = D().maps[(Math.random() * D().maps.length) | 0]; if (!any.space && list.indexOf(any.planet) < 0) list.push(any.planet); }
    var planets = list.map(function (id, i) {
      var a = i / list.length * Math.PI * 2;
      return { id: id, owner: i < list.length / 2 ? side : 1 - side, x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38, bonus: ['+1 legend slot', '+20% credits', 'Extra vehicle', 'Bacta supply', 'Sensor array', 'Fleet support'][i % 6] };
    });
    // neighbours: ring links
    planets.forEach(function (p, i) { p.links = [(i + 1) % planets.length, (i + planets.length - 1) % planets.length, (i + Math.floor(planets.length / 2)) % planets.length]; });
    P.p.campaign = { era: era, side: side, planets: planets, turn: 1, log: ['The sector war begins.'], fleet: 0 };
    P.save();
    return P.p.campaign;
  };
  P.campaignResolve = function (planetIdx, won, attacking) {
    var c = P.p.campaign;
    var pl = c.planets[planetIdx];
    var me = c.side;
    if (won) { pl.owner = me; c.log.unshift('Turn ' + c.turn + ': ' + (attacking ? 'Captured ' : 'Defended ') + D().planetById[pl.id].name + '.'); P.p.credits += 400; }
    else c.log.unshift('Turn ' + c.turn + ': ' + (attacking ? 'Assault on ' : 'Lost ') + D().planetById[pl.id].name + (attacking ? ' failed.' : '.'));
    if (!won && !attacking) pl.owner = 1 - me;
    c.turn++;
    var mine = c.planets.filter(function (p) { return p.owner === me; }).length;
    if (mine === c.planets.length) c.over = 'won';
    else if (mine === 0) c.over = 'lost';
    else {
      // enemy turn: chance to attack a bordering player planet; that becomes a defence battle next turn
      var targets = c.planets.map(function (p, i) { return i; }).filter(function (i) { return c.planets[i].owner === me && c.planets[i].links.some(function (j) { return c.planets[j].owner !== me; }); });
      c.threat = targets.length && Math.random() < 0.55 ? targets[(Math.random() * targets.length) | 0] : null;
      if (c.threat != null) c.log.unshift('Enemy fleets move on ' + D().planetById[c.planets[c.threat].id].name + '!');
    }
    c.log = c.log.slice(0, 12);
    P.save();
  };
})();
