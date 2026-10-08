// Ironwalkers — player profile, wallet, inventory, loadouts, rewards, battle pass progress.
(function () {
'use strict';
const MW = window.MW;
const KEY = 'ironwalkers.save.v1';

const STARTER_WEAPONS = ['mg', 'slas', 'ac5', 'srm', 'plas', 'llas', 'lrm', 'ac20'];
const DEFAULT_SETTINGS = { scheme: 'classic', sens: 1, invertY: false, fov: 72, volume: 0.8, music: 0.5, quality: 'high', hudScale: 1, name: 'Pilot' };

function blankProfile() {
  const p = {
    v: 1, credits: 30000, owned: {}, classes: { wisp: true, vanguard: true, bastion: true },
    loadouts: {}, cur: 'vanguard', passWeek: -1, passXP: 0, passClaimed: {}, chal: {}, chalDone: {}, passItems: {},
    stats: { matches: 0, wins: 0, kills: 0, deaths: 0, dmg: 0, boxes: 0 }, settings: Object.assign({}, DEFAULT_SETTINGS), created: Date.now(),
  };
  STARTER_WEAPONS.forEach(w => (p.owned[`w_${w}_kessler_0`] = true));
  MW.EQUIP_SLOTS.forEach(s => (p.owned[`e_${s.id}_${s.variants[0].id}_0`] = true));
  ['f_satin', 'f_matte', 'c_0', 'j_0', 'ti_0', 's_solid_0'].forEach(id => (p.owned[id] = true));
  // a couple of free starter skins
  MW.ITEM_LIST.filter(i => i.cat === 'skin' && i.tier === 0).slice(0, 3).forEach(i => (p.owned[i.id] = true));
  return p;
}

const P = MW.profile = {
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || d.v !== 1) d = blankProfile();
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    this.data = d;
    MW.CLASSES.forEach(c => { if (d.classes[c.id] && !d.loadouts[c.id]) d.loadouts[c.id] = this.defaultLoadout(c.id); });
    this.checkWeek();
    this.save();
    return d;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  reset() { this.data = blankProfile(); MW.CLASSES.forEach(c => { if (this.data.classes[c.id]) this.data.loadouts[c.id] = this.defaultLoadout(c.id); }); this.checkWeek(); this.save(); },
  get s() { return this.data.settings; },

  passItem(id) { return this.data && this.data.passItems[id] || (this.pass && this.pass.items.find(i => i.id === id)) || null; },
  owns(id) { const it = MW.item(id); if (!it) return false; if (it.cat === 'class') return !!this.data.classes[it.cls]; return !!this.data.owned[id] || it.price === 0 && !it.exclusive && it.cat !== 'weapon' && it.cat !== 'equip'; },

  defaultLoadout(cls) {
    const c = MW.CLASS[cls];
    const pickW = size => {
      const prefs = { S: ['mg', 'slas'], M: ['ac5', 'srm', 'plas'], L: ['llas', 'ac20', 'lrm'] }[size];
      return `w_${prefs[(MW.hash(cls + size) % prefs.length)]}_kessler_0`;
    };
    const hp = c.hardpoints.map((h, i) => pickW(h.size === 'L' && i > 0 && c.hardpoints.filter(x => x.size === 'L').length > 1 ? (i % 2 ? 'L' : 'M') : h.size));
    const groups = hp.map(id => { const w = MW.WTYPE[MW.item(id).wtype]; return w.kind === 'missile' || w.fire === 'charge' ? 2 : 1; });
    const eq = {}; MW.EQUIP_SLOTS.forEach(s => (eq[s.id] = `e_${s.id}_${s.variants[0].id}_0`));
    const palIdx = MW.hash(cls) % 3;
    return { hp, groups, eq, skin: 's_solid_0', colors: [['#4a5058', '#2b2f35', '#ff8a1c'], ['#5b6237', '#2d3220', '#ffd60a'], ['#7d868f', '#2b2f35', '#ff3b30']][palIdx], finish: 'f_satin', emblem: null, wskin: null, trinket: null, cockpit: 'c_0', jet: 'j_0', title: 'ti_0' };
  },
  loadout(cls) { cls = cls || this.data.cur; return this.data.loadouts[cls]; },

  // runtime build for the battle/model systems
  buildFor(cls) {
    const L = this.loadout(cls);
    return MW.makeBuild(cls, L, this.s.name);
  },
  buildTier(cls) {
    const L = this.loadout(cls); let t = 0;
    L.hp.forEach(id => { const it = MW.item(id); if (it) t = Math.max(t, it.tier); });
    Object.values(L.eq).forEach(id => { const it = MW.item(id); if (it) t = Math.max(t, it.tier); });
    return t;
  },

  canAfford(n) { return this.data.credits >= n; },
  spend(n) { if (this.data.credits < n) return false; this.data.credits -= n; this.save(); return true; },
  earn(n) { this.data.credits += Math.round(n); this.save(); },

  // grant an item; returns {dupe, refund}
  grant(item) {
    if (item.cat === 'class') {
      if (this.data.classes[item.cls]) { const refund = Math.round(item.price * 0.25); this.earn(refund); return { dupe: true, refund }; }
      this.data.classes[item.cls] = true;
      // a new class ships with a stock loadout of Scrap-tier weapons
      const L = this.defaultLoadout(item.cls);
      L.hp.forEach(id => (this.data.owned[id] = true));
      this.data.loadouts[item.cls] = L; this.save();
      return { dupe: false };
    }
    if (this.data.owned[item.id]) { const refund = Math.round(Math.max(item.price || 0, MW.tierPrice(1200, item.tier)) * 0.35 / 50) * 50; this.earn(refund); return { dupe: true, refund }; }
    this.data.owned[item.id] = true;
    if (item.exclusive) this.data.passItems[item.id] = item;
    this.save();
    return { dupe: false };
  },
  buy(item) {
    if (this.owns(item.id)) return { ok: false, why: 'Already owned' };
    if (!this.spend(item.price)) return { ok: false, why: 'Not enough credits' };
    this.grant(item); return { ok: true };
  },

  // ----- weekly battle pass -----
  checkWeek() {
    const w = MW.weekIndex();
    this.pass = MW.battlePass(w);
    if (this.data.passWeek !== w) {
      this.data.passWeek = w; this.data.passXP = 0; this.data.passClaimed = {}; this.data.chal = {}; this.data.chalDone = {};
    }
  },
  passLevel() { return Math.min(MW.PASS_LEVELS, Math.floor(this.data.passXP / MW.PASS_XP)); },
  addPassXP(xp) { this.data.passXP += Math.round(xp); this.save(); },
  claimLevel(l) {
    if (this.data.passClaimed[l] || this.passLevel() < l) return null;
    const step = this.pass.track[l - 1]; this.data.passClaimed[l] = true;
    let res = {};
    if (step.credits) { this.earn(step.credits); res = { credits: step.credits }; }
    else if (step.box != null) { const rolls = MW.rollBox(step.box); res = { box: step.box, rolls }; }
    else if (step.item) { const it = this.pass.items.find(i => i.id === step.item); res = { item: it, g: this.grant(it) }; }
    this.save(); return res;
  },
  progressChallenge(id, n) {
    const ch = this.pass.challenges; const out = [];
    ch.forEach(c => {
      if (c.id !== id || this.data.chalDone[c.id]) return;
      this.data.chal[c.id] = (this.data.chal[c.id] || 0) + n;
      if (this.data.chal[c.id] >= c.n) { this.data.chalDone[c.id] = true; this.addPassXP(c.xp); out.push(c); }
    });
    return out;
  },

  // ----- match rewards -----
  applyMatch(res) {
    const d = this.data; const st = d.stats;
    st.matches++; if (res.win) st.wins++; st.kills += res.kills; st.deaths += res.deaths; st.dmg += Math.round(res.dmg);
    const tierMul = 1 + 0.55 * res.tier;
    const lines = [];
    const base = Math.round(5000 * tierMul); lines.push(['Deployment pay', base]);
    const kc = Math.round(res.kills * 900 * tierMul); if (kc) lines.push([`Kills ×${res.kills}`, kc]);
    const ac = Math.round(res.assists * 350 * tierMul); if (ac) lines.push([`Assists ×${res.assists}`, ac]);
    const dc = Math.round(res.dmg * 1.6 * Math.sqrt(tierMul)); if (dc) lines.push([`Damage ${MW.fmt(res.dmg)}`, dc]);
    const oc = Math.round(res.obj * 600 * tierMul); if (oc) lines.push(['Objectives', oc]);
    let total = lines.reduce((a, l) => a + l[1], 0);
    if (res.win) { const wb = Math.round(total * 0.5); lines.push(['Victory bonus', wb]); total += wb; }
    if (res.mvp) { const mb = Math.round(3000 * tierMul); lines.push(['Team MVP', mb]); total += mb; }
    this.earn(total);
    const xp = 350 + res.kills * 60 + Math.round(res.dmg / 40) + res.obj * 80 + (res.win ? 250 : 0);
    const prevLvl = this.passLevel();
    this.addPassXP(xp);
    const done = [];
    const pc = (id, n) => { if (n > 0) done.push(...this.progressChallenge(id, n)); };
    pc('matches', 1); pc('win', res.win ? 1 : 0); pc('kills', res.kills); pc('dmg', Math.round(res.dmg)); pc('caps', res.caps || 0);
    pc('mode_heist', res.mode === 'heist' ? 1 : 0); pc('mode_siege', res.mode === 'siege' ? 1 : 0); pc('big', res.teamSize >= 16 ? 1 : 0);
    pc('gens', res.gens || 0); pc('heistcaps', res.heistCaps || 0); pc('ability', res.abilities || 0); pc('top3', res.top3 ? 1 : 0);
    this.save();
    return { lines, total, xp, done, prevLvl, lvl: this.passLevel() };
  },
};

// Make a runtime build object from a loadout
MW.makeBuild = function (cls, L, name) {
  const c = MW.CLASS[cls];
  return {
    cls, cdef: c, name: name || 'Pilot',
    weapons: L.hp.map((id, i) => ({ item: MW.item(id), group: (L.groups && L.groups[i]) || 1, hp: c.hardpoints[i] })),
    equip: Object.fromEntries(Object.entries(L.eq).map(([k, id]) => [k, MW.item(id)])),
    skin: MW.item(L.skin) || MW.item('s_solid_0'), colors: L.colors.slice(), finish: MW.item(L.finish) || MW.item('f_satin'),
    emblem: L.emblem ? MW.item(L.emblem) : null, wskin: L.wskin ? MW.item(L.wskin) : null, trinket: L.trinket ? MW.item(L.trinket) : null,
    cockpit: MW.item(L.cockpit) || MW.item('c_0'), jet: MW.item(L.jet) || MW.item('j_0'), title: MW.item(L.title) || MW.item('ti_0'),
  };
};

// A random AI build at an exact gameplay tier
MW.randomBuild = function (tier, r, clsId) {
  r = r || Math.random;
  const c = clsId ? MW.CLASS[clsId] : MW.pick(r, MW.CLASSES);
  const weaponsAt = MW.ITEM_LIST.filter(i => i.cat === 'weapon' && i.tier === tier);
  const hp = c.hardpoints.map(h => {
    // prefer the hardpoint's own size most of the time so builds look purposeful
    const own = weaponsAt.filter(w => w.size === h.size);
    const any = weaponsAt.filter(w => MW.fits(h.size, w.size));
    return MW.pick(r, r() < 0.75 && own.length ? own : any).id;
  });
  const groups = hp.map(id => { const w = MW.WTYPE[MW.item(id).wtype]; return w.kind === 'missile' || w.fire === 'charge' ? 2 : 1; });
  const eq = {}; MW.EQUIP_SLOTS.forEach(s => (eq[s.id] = `e_${s.id}_${MW.pick(r, s.variants).id}_${tier}`));
  const skins = MW.ITEM_LIST.filter(i => i.cat === 'skin');
  const skin = MW.pick(r, skins);
  const usePal = r() < 0.7;
  const L = {
    hp, groups, eq, skin: skin.id,
    colors: usePal ? skin.colors.slice() : [MW.pick(r, MW.SWATCHES), MW.pick(r, MW.SWATCHES), MW.pick(r, MW.SWATCHES)],
    finish: MW.pick(r, MW.FINISHES).id.replace(/^/, 'f_'), emblem: r() < 0.7 ? MW.pick(r, MW.ITEM_LIST.filter(i => i.cat === 'emblem')).id : null,
    wskin: r() < 0.3 ? MW.pick(r, MW.ITEM_LIST.filter(i => i.cat === 'wskin')).id : null, trinket: null, cockpit: 'c_0',
    jet: MW.pick(r, MW.ITEM_LIST.filter(i => i.cat === 'jet')).id, title: MW.pick(r, MW.ITEM_LIST.filter(i => i.cat === 'title')).id,
  };
  return MW.makeBuild(c.id, L, MW.pick(r, MW.CALLSIGNS));
};
})();
