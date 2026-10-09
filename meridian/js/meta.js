'use strict';
// Progression: save data, research, purchases, shop rotations, crates, battle pass, missions and rewards.
(function () {
  const KEY = 'steel-meridian-save-v1';
  const G = SM.G = {};

  G.defaultSave = function () {
    const s = {
      v: 1, credits: 60000, cores: 600, rp: 4000, freeXp: 0,
      researched: {}, owned: {}, unitXp: {}, mods: {}, skins: {}, equip: {}, lineups: {},
      faction: 'coalition', boosters: [], bp: { season: -1, xp: 0, premium: false, claimed: {} },
      stats: { battles: 0, wins: 0, kills: 0, losses: 0, captures: 0, inf: 0, veh: 0, air: 0, timePlayed: 0, maps: {} },
      flash: {}, missions: { day: -1, list: [], claimed: [] }, daily: -1, crates: 0, pity: 0,
      settings: { quality: 'medium', res: 1, edgePan: true, vol: { master: 0.7, sfx: 0.8, amb: 0.6, ui: 0.6 }, diff: 'veteran', lastMap: 'random' },
    };
    for (const f of SM.FACTIONS) {
      const starters = [];
      for (const br of SM.BRANCHES) SM.TREE[f.id][br.id].forEach(l => { const id = l.nodes[0]; s.researched[id] = true; s.owned[id] = true; starters.push(id); });
      s.lineups[f.id] = G.autoLineup(starters);
    }
    return s;
  };
  G.autoLineup = function (ids) {
    const by = {}; ids.forEach(id => { const u = SM.getUnit(id); (by[u.branch] || (by[u.branch] = [])).push(id); });
    const want = { infantry: 3, armor: 3, mech: 2, air: 2, naval: 1 };
    const out = [];
    for (const b in want) (by[b] || []).slice(0, want[b]).forEach(id => out.push(id));
    return out.slice(0, 10);
  };
  G.load = function () {
    let s = null;
    try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; }
    const d = G.defaultSave();
    if (!s || s.v !== 1) s = d;
    for (const k in d) if (s[k] === undefined) s[k] = d[k];
    for (const k in d.settings) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
    for (const k in d.stats) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
    for (const f of SM.FACTIONS) if (!s.lineups[f.id]) s.lineups[f.id] = d.lineups[f.id];
    // make sure exclusives referenced by the save exist
    Object.keys(s.owned).forEach(id => SM.getUnit(id));
    G.s = s;
    G.refreshSeason(); G.refreshMissions();
    return s;
  };
  G.save = function () { try { localStorage.setItem(KEY, JSON.stringify(G.s)); } catch (e) { } };
  G.reset = function () { try { localStorage.removeItem(KEY); } catch (e) { } G.s = G.defaultSave(); G.refreshSeason(); G.refreshMissions(); G.save(); };

  // ---------------------------------------------------------------- research & purchase
  G.status = function (id) {
    const s = G.s, u = SM.getUnit(id);
    if (!u) return 'none';
    if (s.owned[id]) return 'owned';
    if (s.researched[id]) return 'buy';
    if (u.exclusive) return 'exclusive';
    if (!u.parent || s.researched[u.parent]) return 'research';
    return 'locked';
  };
  G.research = function (id) {
    const u = SM.getUnit(id), s = G.s;
    if (G.status(id) !== 'research') return 'Research the previous vehicle in this line first.';
    const pool = s.rp + s.freeXp;
    if (pool < u.rp) return 'Not enough Research Points.';
    let cost = u.rp;
    const fromRp = Math.min(s.rp, cost); s.rp -= fromRp; cost -= fromRp; s.freeXp -= cost;
    s.researched[id] = true; G.save(); return null;
  };
  G.buy = function (id) {
    const u = SM.getUnit(id), s = G.s;
    if (G.status(id) !== 'buy') return 'Research this unit first.';
    if (s.credits < u.price) return 'Not enough credits.';
    s.credits -= u.price; s.owned[id] = true; G.save(); return null;
  };
  G.grantUnit = function (id) { const s = G.s; s.researched[id] = true; s.owned[id] = true; };
  G.modStatus = function (u, modId) {
    const s = G.s, mods = s.mods[u.id] || [];
    if (mods.indexOf(modId) >= 0) return 'done';
    const m = u.mods.find(x => x.id === modId);
    if (m.tier > 1) { const prev = u.mods.filter(x => x.tier === m.tier - 1); if (!prev.some(x => mods.indexOf(x.id) >= 0)) return 'locked'; }
    return 'open';
  };
  G.researchMod = function (u, modId) {
    const s = G.s;
    if (!s.owned[u.id]) return 'Own this unit first.';
    const st = G.modStatus(u, modId);
    if (st !== 'open') return st === 'done' ? 'Already installed.' : 'Install a modification from the previous tier first.';
    const m = u.mods.find(x => x.id === modId);
    const have = (s.unitXp[u.id] || 0) + s.freeXp;
    if (have < m.cost) return 'Not enough unit XP. Play battles with this unit, or earn free XP.';
    let c = m.cost; const a = Math.min(s.unitXp[u.id] || 0, c); s.unitXp[u.id] = (s.unitXp[u.id] || 0) - a; c -= a; s.freeXp -= c;
    (s.mods[u.id] || (s.mods[u.id] = [])).push(modId);
    G.save(); return null;
  };
  G.lineup = function (fac) { return (G.s.lineups[fac] || []).filter(id => G.s.owned[id] && SM.getUnit(id)); };
  G.lineupEntries = function (fac) { return G.lineup(fac).map(id => ({ id, mods: G.s.mods[id] || [], skin: G.s.equip[id] || null })); };
  G.toggleLineup = function (id) {
    const u = SM.getUnit(id), L = G.s.lineups[u.fac] || (G.s.lineups[u.fac] = []);
    const i = L.indexOf(id);
    if (i >= 0) { if (L.length <= 1) return 'A lineup needs at least one unit.'; L.splice(i, 1); }
    else { if (L.length >= 10) return 'Lineup is full (10 units). Remove one first.'; L.push(id); }
    G.save(); return null;
  };

  // ---------------------------------------------------------------- boosters
  G.boostMult = function () { return G.s.boosters.length ? G.s.boosters[0].mult : 1; };
  G.addBooster = function (b) { G.s.boosters.push({ name: b.name, mult: b.mult, battles: b.battles }); G.s.boosters.sort((a, c) => c.mult - a.mult); };

  // ---------------------------------------------------------------- shop rotations
  const ownedUnits = () => Object.keys(G.s.owned).map(SM.getUnit).filter(Boolean);
  G.giveaways = function (now) {
    const w = SM.weekIndex(now);
    return [0, 1].map(k => { const u = SM.getUnit('gw_' + w + '_' + k); return { id: u.id, unit: u, price: k ? 34000 : 19500, cur: 'cores', ends: SM.SEASON_EPOCH + (w + 1) * 7 * SM.DAY }; });
  };
  G.skinOffers = function (now) {
    const day = Math.floor(now / SM.DAY);
    const r = SM.rng(day * 31 + 7);
    const pool = ownedUnits().filter(u => !u.finish);
    const pats = Object.keys(SM.SKINS).filter(p => p !== 'factory');
    const out = [];
    for (let i = 0; i < 8 && pool.length; i++) {
      const u = pool[Math.floor(r() * pool.length)];
      const p = pats[Math.floor(r() * pats.length)];
      const rar = SM.SKINS[p].rarity;
      out.push({ key: 'sk_' + u.id + '_' + p, unit: u, pattern: p, price: [120, 260, 520, 980, 1900][rar], cur: 'cores' });
    }
    return out;
  };
  G.flashOffers = function (now) {
    const idx = SM.flashIndex(now);
    const r = SM.rng(idx * 977 + 13);
    const out = [];
    const pool = ownedUnits().filter(u => !u.finish);
    const pats = Object.keys(SM.SKINS).filter(p => p !== 'factory');
    for (let i = 0; i < 3 && pool.length; i++) {
      const u = pool[Math.floor(r() * pool.length)], p = pats[Math.floor(r() * pats.length)], rar = SM.SKINS[p].rarity;
      const base = [120, 260, 520, 980, 1900][rar], off = 0.4 + Math.floor(r() * 4) * 0.1;
      out.push({ key: 'f' + idx + 's' + i, kind: 'skin', unit: u, pattern: p, base, price: Math.round(base * (1 - off)), off, cur: 'cores' });
    }
    const b = SM.XP_BOOSTS[Math.floor(r() * SM.XP_BOOSTS.length)];
    out.push({ key: 'f' + idx + 'b', kind: 'boost', boost: b, base: 400, price: Math.round(400 * 0.5), off: 0.5, cur: 'cores' });
    // quick unlock: a random locked unit from anywhere in the trees
    const locked = SM.UNIT_LIST.filter(u => !u.exclusive && !G.s.owned[u.id]);
    if (locked.length) {
      const u = locked[Math.floor(r() * locked.length)];
      const base = Math.round((u.rp / 8 + u.price / 400) / 10) * 10 + 150;
      out.push({ key: 'f' + idx + 'q', kind: 'unlock', unit: u, base, price: Math.round(base * 0.6), off: 0.4, cur: 'cores' });
    }
    out.push({ key: 'f' + idx + 'c', kind: 'credits', amount: 150000, base: 600, price: 330, off: 0.45, cur: 'cores' });
    return out;
  };
  G.flashBought = function (key) { const idx = key.split(/[sbqc]/)[0]; return !!(G.s.flash[key]); };
  G.spend = function (cur, amount) {
    if (G.s[cur] < amount) return false;
    G.s[cur] -= amount; return true;
  };
  G.giveSkin = function (unitId, pattern) {
    const L = G.s.skins[unitId] || (G.s.skins[unitId] = []);
    if (L.indexOf(pattern) >= 0) return false;
    L.push(pattern); return true;
  };
  G.claimDaily = function (now) {
    const day = Math.floor(now / SM.DAY);
    if (G.s.daily === day) return null;
    G.s.daily = day; G.s.credits += 15000; G.s.cores += 60; G.save();
    return { credits: 15000, cores: 60 };
  };

  // ---------------------------------------------------------------- crates
  const SKIN_BY_RARITY = r => Object.keys(SM.SKINS).filter(p => p !== 'factory' && SM.SKINS[p].rarity === r);
  G.crateRoll = function (crate, r) {
    r = r || Math.random;
    let roll = r() * 100, rar = 0;
    for (let i = 0; i < crate.odds.length; i++) { roll -= crate.odds[i]; if (roll <= 0) { rar = i; break; } rar = i; }
    return G.crateItem(rar, r);
  };
  G.crateItem = function (rar, r) {
    r = r || Math.random;
    const units = ownedUnits().filter(u => !u.finish);
    const unitPick = () => units[Math.floor(r() * units.length)];
    const k = r();
    if (rar === 0) {
      if (k < 0.45) return { rar, kind: 'credits', amount: 5000 + Math.floor(r() * 10) * 1000, label: 'Credits' };
      if (k < 0.65) return { rar, kind: 'boost', boost: SM.XP_BOOSTS[2], label: SM.XP_BOOSTS[2].name };
      const u = unitPick(); const p = SM.pick(r, SKIN_BY_RARITY(0)); return { rar, kind: 'skin', unit: u, pattern: p, label: SM.SKINS[p].name };
    }
    if (rar === 1) {
      if (k < 0.3) return { rar, kind: 'credits', amount: 20000 + Math.floor(r() * 20) * 1000, label: 'Credits' };
      if (k < 0.45) return { rar, kind: 'cores', amount: 50, label: 'Cores' };
      if (k < 0.6) return { rar, kind: 'boost', boost: SM.XP_BOOSTS[0], label: SM.XP_BOOSTS[0].name };
      const u = unitPick(); const p = SM.pick(r, SKIN_BY_RARITY(1)); return { rar, kind: 'skin', unit: u, pattern: p, label: SM.SKINS[p].name };
    }
    if (rar === 2) {
      if (k < 0.2) return { rar, kind: 'cores', amount: 160, label: 'Cores' };
      if (k < 0.35) return { rar, kind: 'credits', amount: 100000, label: 'Credits' };
      if (k < 0.5) { const locked = SM.UNIT_LIST.filter(u => !u.exclusive && !G.s.owned[u.id] && u.rank <= 4); if (locked.length) { const u = locked[Math.floor(r() * locked.length)]; return { rar, kind: 'unlock', unit: u, label: 'Quick Unlock' }; } }
      const u = unitPick(); const p = SM.pick(r, SKIN_BY_RARITY(2)); return { rar, kind: 'skin', unit: u, pattern: p, label: SM.SKINS[p].name };
    }
    if (rar === 3) {
      if (k < 0.3) { const id = G.unownedCrateUnit(r); if (id) return { rar, kind: 'unit', unit: SM.getUnit(id), label: 'Crate Exclusive' }; }
      if (k < 0.45) return { rar, kind: 'cores', amount: 500, label: 'Cores' };
      const u = unitPick(); const p = SM.pick(r, SKIN_BY_RARITY(3)); return { rar, kind: 'skin', unit: u, pattern: p, label: SM.SKINS[p].name };
    }
    if (k < 0.45) { const id = G.unownedCrateUnit(r); if (id) return { rar, kind: 'unit', unit: SM.getUnit(id), label: 'Mythic Exclusive' }; }
    if (k < 0.6) return { rar, kind: 'cores', amount: 1500, label: 'Cores' };
    const u = unitPick(); const p = SM.pick(r, SKIN_BY_RARITY(4)); return { rar, kind: 'skin', unit: u, pattern: p, label: SM.SKINS[p].name };
  };
  G.unownedCrateUnit = function (r) {
    const ids = []; for (let i = 0; i < 30; i++) if (!G.s.owned['cr_' + i]) ids.push('cr_' + i);
    return ids.length ? ids[Math.floor(r() * ids.length)] : null;
  };
  G.grant = function (item) {
    // returns a short text describing what was received
    const s = G.s;
    switch (item.kind) {
      case 'credits': s.credits += item.amount; return SM.fmt(item.amount) + ' credits';
      case 'cores': s.cores += item.amount; return SM.fmt(item.amount) + ' cores';
      case 'rp': s.rp += item.amount; return SM.fmt(item.amount) + ' RP';
      case 'boost': G.addBooster(item.boost); return item.boost.name;
      case 'skin': if (G.giveSkin(item.unit.id, item.pattern)) return SM.SKINS[item.pattern].name + ' skin for ' + item.unit.name; s.credits += 8000 * (SM.SKINS[item.pattern].rarity + 1); return 'Duplicate skin converted to ' + SM.fmt(8000 * (SM.SKINS[item.pattern].rarity + 1)) + ' credits';
      case 'unlock': case 'unit': if (s.owned[item.unit.id]) { s.credits += 50000; return 'Duplicate unit converted to 50,000 credits'; } G.grantUnit(item.unit.id); return item.unit.name + ' unlocked';
      case 'crate': s.crates = (s.crates || 0) + 1; s.freeCrates = s.freeCrates || {}; s.freeCrates[item.crate] = (s.freeCrates[item.crate] || 0) + 1; return SM.CRATES.find(c => c.id === item.crate).name;
    }
    return '';
  };

  // ---------------------------------------------------------------- battle pass
  G.refreshSeason = function () {
    const now = Date.now(), si = SM.seasonIndex(now);
    if (G.s.bp.season !== si) G.s.bp = { season: si, xp: 0, premium: false, claimed: {} };
  };
  G.BP_TIERS = 50; G.BP_XP = 1000;
  G.bpTier = function () { return Math.min(G.BP_TIERS, Math.floor(G.s.bp.xp / G.BP_XP)); };
  G.bpRewards = function (season) {
    const r = SM.rng(season * 7331 + 1);
    const out = [];
    const vehTiers = { 10: 0, 25: 1, 40: 2, 50: 3 };
    for (let t = 1; t <= G.BP_TIERS; t++) {
      let free, prem;
      if (t % 10 === 5) free = { kind: 'crate', crate: t >= 35 ? 'elite' : 'veteran', label: (t >= 35 ? 'Elite' : 'Veteran') + ' Crate' };
      else if (t % 7 === 0) free = { kind: 'boost', boost: SM.XP_BOOSTS[t % 3], label: SM.XP_BOOSTS[t % 3].name };
      else if (t % 4 === 0) free = { kind: 'cores', amount: 25 + t, label: 'Cores' };
      else if (t === 30) free = { kind: 'unit', unitId: 'bp_' + season + '_9', label: 'Season Vehicle' };
      else free = { kind: 'credits', amount: 4000 + t * 400, label: 'Credits' };
      if (vehTiers[t] !== undefined) prem = { kind: 'unit', unitId: 'bp_' + season + '_' + vehTiers[t], label: 'Season Exclusive' };
      else if (t % 3 === 0) { const pats = Object.keys(SM.SKINS).filter(p => SM.SKINS[p].rarity >= (t > 30 ? 3 : 2)); prem = { kind: 'skinPick', pattern: SM.pick(r, pats), label: 'Season Skin' }; }
      else if (t % 5 === 2) prem = { kind: 'cores', amount: 80 + t * 2, label: 'Cores' };
      else if (t % 8 === 1) prem = { kind: 'boost', boost: SM.XP_BOOSTS[1], label: SM.XP_BOOSTS[1].name };
      else prem = { kind: 'credits', amount: 12000 + t * 900, label: 'Credits' };
      out.push({ t, free, prem });
    }
    return out;
  };
  G.bpGrant = function (rw) {
    if (rw.kind === 'unit') { const u = SM.getUnit(rw.unitId); return G.grant({ kind: 'unit', unit: u }); }
    if (rw.kind === 'skinPick') {
      const units = ownedUnits().filter(u => !u.finish);
      const u = units.find(x => !(G.s.skins[x.id] || []).includes(rw.pattern)) || units[0];
      return G.grant({ kind: 'skin', unit: u, pattern: rw.pattern });
    }
    return G.grant(rw);
  };
  G.bpClaim = function (t, track) {
    const key = t + track;
    if (G.s.bp.claimed[key]) return 'Already claimed.';
    if (G.bpTier() < t) return 'Reach tier ' + t + ' first.';
    if (track === 'p' && !G.s.bp.premium) return 'Unlock the premium track first.';
    const rw = G.bpRewards(G.s.bp.season)[t - 1][track === 'p' ? 'prem' : 'free'];
    const text = G.bpGrant(rw);
    G.s.bp.claimed[key] = true; G.save();
    return { text };
  };

  // ---------------------------------------------------------------- daily missions
  const MISSION_POOL = [
    { id: 'win', text: 'Win {n} battle(s)', n: [1, 2], stat: 'wins', xp: 900 },
    { id: 'veh', text: 'Destroy {n} vehicles, mechs or ships', n: [8, 15], stat: 'veh', xp: 800 },
    { id: 'inf', text: 'Destroy {n} infantry squads', n: [10, 20], stat: 'inf', xp: 700 },
    { id: 'air', text: 'Shoot down {n} aircraft', n: [3, 6], stat: 'air', xp: 900 },
    { id: 'cap', text: 'Capture {n} points', n: [6, 12], stat: 'captures', xp: 800 },
    { id: 'play', text: 'Play {n} battles', n: [2, 3], stat: 'battles', xp: 600 },
    { id: 'kills', text: 'Destroy {n} enemy units', n: [20, 35], stat: 'kills', xp: 900 },
  ];
  G.refreshMissions = function () {
    const day = Math.floor(Date.now() / SM.DAY);
    if (G.s.missions.day === day) return;
    const r = SM.rng(day * 53 + 3);
    const pool = MISSION_POOL.slice(), list = [];
    for (let i = 0; i < 3; i++) { const m = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = m.n[0] + Math.floor(r() * (m.n[1] - m.n[0] + 1)); list.push({ id: m.id, text: m.text.replace('{n}', n), n, stat: m.stat, xp: m.xp, cr: 6000 + n * 300, prog: 0 }); }
    G.s.missions = { day, list, claimed: [] };
  };
  G.claimMission = function (i) {
    const m = G.s.missions.list[i];
    if (!m || G.s.missions.claimed.indexOf(i) >= 0 || m.prog < m.n) return null;
    G.s.missions.claimed.push(i);
    G.s.bp.xp += m.xp; G.s.credits += m.cr; G.save();
    return m;
  };

  // ---------------------------------------------------------------- battle rewards
  G.DIFF = {
    recruit: { name: 'Recruit', income: 0.8, acc: 0.85, mult: 0.8, rank: -1 },
    veteran: { name: 'Veteran', income: 1.0, acc: 1.0, mult: 1.0, rank: 0 },
    elite: { name: 'Elite', income: 1.25, acc: 1.06, mult: 1.3, rank: 1 },
    nightmare: { name: 'Nightmare', income: 1.55, acc: 1.12, mult: 1.6, rank: 1 },
  };
  G.enemyLineup = function (fac, avgRank, diff, naval) {
    const r = SM.rng(Math.floor(Math.random() * 1e9));
    const want = naval ? { infantry: 3, armor: 3, mech: 1, air: 2, naval: 2 } : { infantry: 3, armor: 3, mech: 2, air: 2 };
    const out = [];
    for (const b in want) {
      const nodes = [];
      SM.TREE[fac][b].forEach(l => l.nodes.forEach(id => nodes.push(SM.getUnit(id))));
      const rank = SM.clamp(Math.round(avgRank + diff.rank), 1, 6);
      let cand = nodes.filter(u => Math.abs(u.rank - rank) <= 1);
      if (!cand.length) cand = nodes;
      for (let i = 0; i < want[b]; i++) {
        const u = cand[Math.floor(r() * cand.length)];
        if (out.find(e => e.id === u.id)) continue;
        const mods = [];
        const nm = diff.rank > 0 ? 6 : diff.rank < 0 ? 1 : 3;
        u.mods.forEach(m => { if (mods.length < nm && (m.tier === 1 || mods.some(x => u.mods.find(y => y.id === x).tier === m.tier - 1))) mods.push(m.id); });
        out.push({ id: u.id, mods, skin: null });
      }
    }
    return out;
  };
  G.computeRewards = function (res, lineup, diffKey) {
    const st = res.stats, d = G.DIFF[diffKey] || G.DIFF.veteran;
    const kills = st.kills[0], caps = st.captures[0], min = res.time / 60;
    const boost = G.boostMult();
    let credBonus = 0, xpBonus = 0;
    lineup.forEach(e => { if (!st.deployed[e.id]) return; const a = SM.skinAttrs(e.id, (SM.getUnit(e.id) || {}).finish || e.skin || 'factory'); credBonus += a.credits || 0; xpBonus += a.xp || 0; });
    const rp = Math.round((700 + kills * 70 + caps * 140 + (res.win ? 1100 : 350) + min * 45) * d.mult * boost);
    const credits = Math.round((5000 + kills * 600 + caps * 1100 + (res.win ? 9000 : 2000)) * d.mult * (1 + credBonus));
    const cores = (res.win ? 18 : 6) + Math.floor(kills / 8);
    const bpxp = Math.round((350 + kills * 22 + caps * 55 + (res.win ? 450 : 120)) * (1 + (d.mult - 1) * 0.5));
    const unitXp = {};
    for (const id in st.deployed) unitXp[id] = Math.round((120 + (st.unitScore[id] || 0) * 0.35) * d.mult * boost * (1 + xpBonus));
    for (const id in st.unitScore) if (!unitXp[id] && G.s.owned[id]) unitXp[id] = Math.round((st.unitScore[id] || 0) * 0.35 * d.mult * boost);
    const freeXp = Math.round(rp * 0.1);
    return { rp, credits, cores, bpxp, unitXp, freeXp, boost, diff: d.name };
  };
  G.applyRewards = function (res, rw) {
    const s = G.s;
    s.rp += rw.rp; s.credits += rw.credits; s.cores += rw.cores; s.freeXp += rw.freeXp;
    s.bp.xp += rw.bpxp;
    for (const id in rw.unitXp) s.unitXp[id] = (s.unitXp[id] || 0) + rw.unitXp[id];
    if (s.boosters.length) { s.boosters[0].battles--; if (s.boosters[0].battles <= 0) s.boosters.shift(); }
    const st = res.stats;
    s.stats.battles++; if (res.win) s.stats.wins++;
    s.stats.kills += st.kills[0]; s.stats.losses += st.losses[0]; s.stats.captures += st.captures[0];
    s.stats.inf += st.inf; s.stats.veh += st.veh; s.stats.air += st.air; s.stats.timePlayed += res.time;
    s.stats.maps[res.map] = (s.stats.maps[res.map] || 0) + 1;
    // missions
    const inc = { wins: res.win ? 1 : 0, veh: st.veh, inf: st.inf, air: st.air, captures: st.captures[0], battles: 1, kills: st.kills[0] };
    s.missions.list.forEach(m => { m.prog = Math.min(m.n, m.prog + (inc[m.stat] || 0)); });
    G.save();
  };
})();

// ======================================================================== expansion: customisation, stratagems, more rewards
(function () {
  const G = SM.G;
  const baseLoad = G.load, baseDefault = G.defaultSave;
  G.defaultSave = function () {
    const s = baseDefault();
    s.cust = {};
    s.strat = { researched: {}, owned: {}, ups: {}, loadout: [] };
    G.stratStarter(s);
    return s;
  };
  G.stratStarter = function (s) {
    SM.STRAT_BRANCHES.forEach(b => { const first = SM.STRATAGEMS.find(x => x.br === b.id && x.rank === 1); s.strat.researched[first.id] = true; if (['orbital', 'logistics', 'fort', 'airsup'].includes(b.id)) s.strat.owned[first.id] = true; });
    if (!s.strat.loadout.length) s.strat.loadout = ['orb_rail', 'air_strafe', 'fort_mg', 'log_supply'];
  };
  G.load = function () {
    const s = baseLoad();
    if (!s.cust) s.cust = {};
    if (!s.strat) { s.strat = { researched: {}, owned: {}, ups: {}, loadout: [] }; G.stratStarter(s); }
    // every tech line starts with its first unit owned (covers lines and factions added after a save was made)
    for (const f of SM.FACTIONS) for (const br of SM.BRANCHES) SM.TREE[f.id][br.id].forEach(l => { const id = l.nodes[0]; s.researched[id] = true; s.owned[id] = true; });
    for (const f of SM.FACTIONS) if (!s.lineups[f.id] || !s.lineups[f.id].length) { const st = []; for (const br of SM.BRANCHES) SM.TREE[f.id][br.id].forEach(l => st.push(l.nodes[0])); s.lineups[f.id] = G.autoLineup(st); }
    ['strats', 'mechs', 'naval'].forEach(k => { if (s.stats[k] === undefined) s.stats[k] = 0; });
    G.save();
    return s;
  };

  // ---------------------------------------------------------------- customisation
  G.custOwned = id => (G.s.cust[id] && G.s.cust[id].owned) || [];
  G.custEquipped = id => (G.s.cust && G.s.cust[id] && G.s.cust[id].eq) || [];
  G.custStatus = function (u, c) {
    const s = G.s, rec = s.cust[u.id] || { owned: [], eq: [] };
    if (rec.eq.indexOf(c.id) >= 0) return 'equipped';
    if (rec.owned.indexOf(c.id) >= 0) return 'owned';
    if (!s.owned[u.id]) return 'nounit';
    if (c.req && !u.exclusive && (s.mods[u.id] || []).indexOf(c.req) < 0) return 'needmod';
    if (c.tier > 1) { const prev = SM.customsFor(u).filter(x => x.tier === c.tier - 1); if (!prev.some(x => rec.owned.indexOf(x.id) >= 0)) return 'needtier'; }
    return 'open';
  };
  G.buyCust = function (u, cid) {
    const c = SM.CUSTOM[cid], st = G.custStatus(u, c);
    if (st === 'nounit') return 'Own this unit first.';
    if (st === 'needmod') return 'Install the ' + (u.mods.find(m => m.id === c.req) || {}).name + ' modification first.';
    if (st === 'needtier') return 'Buy a tier ' + (c.tier - 1) + ' customisation for this unit first.';
    if (st !== 'open') return 'Already owned.';
    const price = SM.customPrice(u, c);
    if (G.s.credits < price) return 'Not enough credits.';
    G.s.credits -= price;
    const rec = G.s.cust[u.id] || (G.s.cust[u.id] = { owned: [], eq: [] });
    rec.owned.push(cid);
    G.equipCust(u, cid, true);
    G.save(); return null;
  };
  G.equipCust = function (u, cid, on) {
    const rec = G.s.cust[u.id]; if (!rec || rec.owned.indexOf(cid) < 0) return;
    const c = SM.CUSTOM[cid];
    const i = rec.eq.indexOf(cid);
    if (on === undefined) on = i < 0;
    if (!on) { if (i >= 0) rec.eq.splice(i, 1); }
    else if (i < 0) { if (c.group) rec.eq = rec.eq.filter(x => SM.CUSTOM[x].group !== c.group); rec.eq.push(cid); }
    G.save();
  };
  const baseEntries = G.lineupEntries;
  G.lineupEntries = function (fac) { return baseEntries(fac).map(e => Object.assign(e, { cust: G.custEquipped(e.id) })); };

  // ---------------------------------------------------------------- stratagems
  G.stratStatus = function (id) {
    const st = G.s.strat, d = SM.STRAT[id];
    if (st.owned[id]) return 'owned';
    if (st.researched[id]) return 'buy';
    if (!d.parent || st.researched[d.parent]) return 'research';
    return 'locked';
  };
  G.researchStrat = function (id) {
    const d = SM.STRAT[id], s = G.s;
    if (G.stratStatus(id) !== 'research') return 'Research the previous stratagem in this branch first.';
    if (s.rp + s.freeXp < d.rp) return 'Not enough Research Points.';
    let c = d.rp; const a = Math.min(s.rp, c); s.rp -= a; c -= a; s.freeXp -= c;
    s.strat.researched[id] = true; G.save(); return null;
  };
  G.buyStrat = function (id) {
    const d = SM.STRAT[id], s = G.s;
    if (G.stratStatus(id) !== 'buy') return 'Research it first.';
    if (s.credits < d.price) return 'Not enough credits.';
    s.credits -= d.price; s.strat.owned[id] = true;
    if (s.strat.loadout.length < 4) s.strat.loadout.push(id);
    G.save(); return null;
  };
  G.stratUpStatus = function (id, up) {
    const s = G.s.strat, have = s.ups[id] || [];
    if (have.indexOf(up.id) >= 0) return 'done';
    if (!s.owned[id]) return 'locked';
    if (up.tier > 1) { const prev = SM.stratUpgrades(SM.STRAT[id]).filter(x => x.tier === up.tier - 1); if (!prev.some(x => have.indexOf(x.id) >= 0)) return 'locked'; }
    return 'open';
  };
  G.buyStratUp = function (id, upId) {
    const up = SM.stratUpgrades(SM.STRAT[id]).find(x => x.id === upId);
    const st = G.stratUpStatus(id, up);
    if (st === 'done') return 'Already installed.';
    if (st !== 'open') return G.s.strat.owned[id] ? 'Install an upgrade from the previous tier first.' : 'Buy the stratagem first.';
    if (G.s.credits < up.price) return 'Not enough credits.';
    G.s.credits -= up.price;
    (G.s.strat.ups[id] || (G.s.strat.ups[id] = [])).push(upId);
    G.save(); return null;
  };
  G.toggleStratLoadout = function (id) {
    const L = G.s.strat.loadout, i = L.indexOf(id);
    if (i >= 0) { L.splice(i, 1); G.save(); return null; }
    if (!G.s.strat.owned[id]) return 'Buy this stratagem first.';
    if (L.length >= 4) return 'The loadout holds four stratagems. Remove one first.';
    L.push(id); G.save(); return null;
  };
  G.stratEntries = () => G.s.strat.loadout.filter(id => G.s.strat.owned[id] && SM.STRAT[id]).map(id => ({ id, ups: G.s.strat.ups[id] || [] }));
  G.enemyStrats = function (diff) {
    const maxRank = { Recruit: 2, Veteran: 3, Elite: 5, Nightmare: 6 }[diff.name] || 3;
    const pool = SM.STRATAGEMS.filter(s => s.rank <= maxRank && s.fx !== 'scan');
    const out = [];
    while (out.length < Math.min(3 + (maxRank >= 5 ? 1 : 0), pool.length)) {
      const s = pool[Math.floor(Math.random() * pool.length)];
      if (out.find(e => e.id === s.id)) continue;
      const ups = SM.stratUpgrades(s).filter(u => u.tier <= (maxRank >= 5 ? 2 : 1) && Math.random() < 0.6).map(u => u.id);
      out.push({ id: s.id, ups });
    }
    return out;
  };

  // ---------------------------------------------------------------- crates: customisation and stratagem pools
  const baseRoll = G.crateRoll, baseGrant = G.grant;
  G.crateRoll = function (crate, r) {
    r = r || Math.random;
    if (!crate.pool) return baseRoll(crate, r);
    let roll = r() * 100, rar = 0;
    for (let i = 0; i < crate.odds.length; i++) { roll -= crate.odds[i]; if (roll <= 0) { rar = i; break; } rar = i; }
    return G.poolItem(crate.pool, rar, r);
  };
  G.poolItem = function (pool, rar, r) {
    r = r || Math.random;
    if (pool === 'cust') {
      const units = Object.keys(G.s.owned).map(SM.getUnit).filter(Boolean);
      for (let tries = 0; tries < 40; tries++) {
        const u = units[Math.floor(r() * units.length)];
        const cs = SM.customsFor(u).filter(c => c.tier === Math.min(5, rar + 1) && G.custOwned(u.id).indexOf(c.id) < 0);
        if (cs.length) { const c = cs[Math.floor(r() * cs.length)]; return { rar, kind: 'cust', unit: u, cust: c.id, label: c.name }; }
      }
      return { rar, kind: 'credits', amount: 15000 * (rar + 1), label: 'Credits' };
    }
    if (pool === 'strat') {
      const unowned = SM.STRATAGEMS.filter(s => !G.s.strat.owned[s.id] && s.rank <= rar + 2);
      if (unowned.length && r() < 0.55) { const s = unowned[Math.floor(r() * unowned.length)]; return { rar, kind: 'strat', strat: s.id, label: s.name }; }
      const owned = SM.STRATAGEMS.filter(s => G.s.strat.owned[s.id]);
      for (let tries = 0; tries < 20 && owned.length; tries++) {
        const s = owned[Math.floor(r() * owned.length)];
        const up = SM.stratUpgrades(s).find(u => G.stratUpStatus(s.id, u) === 'open');
        if (up) return { rar, kind: 'stratUp', strat: s.id, up: up.id, label: up.name };
      }
      return { rar, kind: 'cores', amount: 60 * (rar + 1), label: 'Cores' };
    }
    return G.crateItem(rar, r);
  };
  G.grant = function (item) {
    const s = G.s;
    if (item.kind === 'cust') { const rec = s.cust[item.unit.id] || (s.cust[item.unit.id] = { owned: [], eq: [] }); if (rec.owned.indexOf(item.cust) >= 0) { s.credits += 12000; return 'Duplicate part converted to 12,000 credits'; } rec.owned.push(item.cust); return SM.CUSTOM[item.cust].name + ' for ' + item.unit.name; }
    if (item.kind === 'strat') { if (s.strat.owned[item.strat]) { s.credits += 40000; return 'Duplicate stratagem converted to 40,000 credits'; } s.strat.researched[item.strat] = true; s.strat.owned[item.strat] = true; return 'Stratagem: ' + SM.STRAT[item.strat].name; }
    if (item.kind === 'stratUp') { const L = s.strat.ups[item.strat] || (s.strat.ups[item.strat] = []); if (L.indexOf(item.up) < 0) L.push(item.up); return SM.STRAT[item.strat].name + ': ' + item.label; }
    return baseGrant(item);
  };

  // ---------------------------------------------------------------- battle pass: more vehicles, stratagems and parts
  const baseBp = G.bpRewards;
  G.bpRewards = function (season) {
    const out = baseBp(season);
    const extraPrem = { 5: 10, 18: 11, 32: 12, 45: 13 };
    out.forEach(r => {
      if (extraPrem[r.t] !== undefined) r.prem = { kind: 'unit', unitId: 'bp_' + season + '_' + extraPrem[r.t], label: 'Season Exclusive' };
      if (r.t === 15) r.free = { kind: 'unit', unitId: 'bp_' + season + '_14', label: 'Season Vehicle' };
      if (r.t === 12 || r.t === 38) r.free = { kind: 'stratPick', label: 'Stratagem' };
      if (r.t === 22 || r.t === 34 || r.t === 48) r.prem = { kind: 'stratPick', label: 'Stratagem' };
      if (r.t % 9 === 4) r.free = { kind: 'custPick', tier: 2, label: 'Custom Part' };
      if (r.t % 8 === 6 && extraPrem[r.t] === undefined && r.prem.kind !== 'unit') r.prem = { kind: 'custPick', tier: 4, label: 'Elite Part' };
    });
    return out;
  };
  const baseBpGrant = G.bpGrant;
  G.bpGrant = function (rw) {
    if (rw.kind === 'stratPick') return G.grant(G.poolItem('strat', 3, Math.random));
    if (rw.kind === 'custPick') return G.grant(G.poolItem('cust', rw.tier - 1, Math.random));
    return baseBpGrant(rw);
  };

  // ---------------------------------------------------------------- giveaways: three a week
  const baseGw = G.giveaways;
  G.giveaways = function (now) {
    const out = baseGw(now), w = SM.weekIndex(now);
    const u = SM.getUnit('gw_' + w + '_2');
    out.push({ id: u.id, unit: u, price: 42000, cur: 'cores', ends: out[0].ends });
    return out;
  };

  // ---------------------------------------------------------------- daily orders: bigger pool
  const extra = [
    { id: 'strats', text: 'Call in {n} stratagems', n: [3, 6], stat: 'strats', xp: 800 },
    { id: 'mechs', text: 'Destroy {n} mechs', n: [3, 6], stat: 'mechs', xp: 800 },
    { id: 'naval', text: 'Sink {n} ships', n: [2, 4], stat: 'naval', xp: 900 },
    { id: 'kills2', text: 'Destroy {n} enemy units in total', n: [40, 60], stat: 'kills', xp: 1300 },
    { id: 'caps2', text: 'Capture {n} points in total', n: [15, 20], stat: 'captures', xp: 1200 },
  ];
  const baseRefresh = G.refreshMissions;
  G.refreshMissions = function () {
    const day = Math.floor(Date.now() / SM.DAY);
    if (G.s.missions.day === day) return;
    baseRefresh();
    // swap one order for an expansion order
    const r = SM.rng(day * 97 + 11);
    const m = extra[Math.floor(r() * extra.length)];
    const n = m.n[0] + Math.floor(r() * (m.n[1] - m.n[0] + 1));
    G.s.missions.list.push({ id: m.id, text: m.text.replace('{n}', n), n, stat: m.stat, xp: m.xp, cr: 8000 + n * 300, prog: 0 });
  };
  const baseApply = G.applyRewards;
  G.applyRewards = function (res, rw) {
    const st = res.stats;
    G.s.stats.strats = (G.s.stats.strats || 0) + (st.strats || 0);
    G.s.stats.mechs = (G.s.stats.mechs || 0) + (st.mechs || 0);
    G.s.stats.naval = (G.s.stats.naval || 0) + (st.naval || 0);
    G.s.missions.list.forEach(m => { if (m.stat === 'strats' || m.stat === 'mechs' || m.stat === 'naval') m.prog = Math.min(m.n, m.prog + (st[m.stat] || 0)); });
    baseApply(res, rw);
  };
})();
