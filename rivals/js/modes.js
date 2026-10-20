'use strict';
// ============================================================================
// Modes — the match flow. RIVALS runs team duels of 1v1 up to 5v5 where the
// first side to five round wins takes the match, plus the arcade rotation:
// free-for-all, team deathmatch, Gun Game and Juggernaut.
//
// Rounds in the duel modes are elimination: no respawns, wipe the other team.
// The arcade modes respawn and race to a kill target instead.
// ============================================================================

R.MODES = [
  {
    id: 'duel', name: 'Team Duel', kind: 'rounds', teams: true, roundWins: 5,
    sizes: [1, 2, 3, 4, 5], blurb: 'Elimination rounds, no respawns. First to five round wins.',
  },
  {
    id: 'ranked', name: 'Ranked', kind: 'rounds', teams: true, roundWins: 5, ranked: true,
    sizes: [1, 2, 3], blurb: 'The same elimination rounds, with rating on the line. 1v1, 2v2 and 3v3.',
  },
  {
    id: 'ffa', name: 'Free For All', kind: 'kills', teams: false, killTarget: 20,
    sizes: [4, 6, 8, 10, 12], blurb: 'Everyone against everyone. First to twenty kills.',
  },
  {
    id: 'tdm', name: 'Team Deathmatch', kind: 'kills', teams: true, killTarget: 40,
    sizes: [2, 3, 4, 5], blurb: 'Respawns on. First team to forty kills.',
  },
  {
    id: 'gungame', name: 'Gun Game', kind: 'ladder', teams: false,
    sizes: [4, 6, 8, 12, 16], blurb: 'Every kill hands you the next weapon. Finish the ladder to win.',
  },
  {
    id: 'juggernaut', name: 'Juggernaut', kind: 'jugg', teams: false,
    sizes: [4, 6, 8, 10], blurb: 'One player holds 500 health and an LMG. Kill them and the title is yours.',
  },
];
R.modeById = id => R.MODES.find(m => m.id === id);

R.modes = {
  def: null, cfg: null, lockLoadout: false,
  state: 'idle',            // idle | countdown | live | roundover | matchover
  stateT: 0,
  round: 0,
  wins: { blue: 0, red: 0 },
  kills: { blue: 0, red: 0 },
  feed: [],
  juggernaut: null,
  banner: null, bannerT: 0,
  earnedKeys: 0, earnedRp: 0,

  friendly(a, b) {
    if (a === b) return true;
    if (!this.def || !this.def.teams) return false;
    return a.team === b.team;
  },

  start(cfg) {
    this.def = R.modeById(cfg.mode) || R.MODES[0];
    this.cfg = cfg;
    this.lockLoadout = this.def.kind === 'ladder';
    this.round = 0;
    this.wins = { blue: 0, red: 0 };
    this.kills = { blue: 0, red: 0 };
    this.feed.length = 0;
    this.earnedKeys = 0; this.earnedRp = 0;
    this.juggernaut = null;
    for (const a of R.combat.actors) {
      a.kills = 0; a.deaths = 0; a.streak = 0; a.damageDealt = 0; a.roundKills = 0;
      a.ladder = 0;
    }
    if (this.def.kind === 'jugg') this.pickJuggernaut(null);
    this.beginRound();
  },

  beginRound() {
    this.round++;
    for (const a of R.combat.actors) {
      a.roundKills = 0;
      a.respawn(R.pickSpawn(this.def.teams ? a.team : 'ffa', R.combat.actors, a));
      if (this.def.kind === 'ladder') this.giveLadder(a, a.ladder || 0);
      if (this.def.kind === 'jugg') this.applyJuggStats(a);
    }
    R.clearProjectiles();
    this.state = 'countdown';
    this.stateT = this.def.kind === 'rounds' ? 2.6 : 1.6;
    this.setBanner(this.def.kind === 'rounds' ? 'ROUND ' + this.round : this.def.name.toUpperCase(), 1.6);
    R.audio.ui('countdown');
  },

  setBanner(text, time, sub) {
    this.banner = { text, sub };
    this.bannerT = time || 2;
  },

  /* ------------------------------ Gun Game ------------------------------ */
  giveLadder(actor, step) {
    const ladder = R.GUNGAME_LADDER;
    actor.ladder = R.clamp(step, 0, ladder.length - 1);
    const id = ladder[actor.ladder];
    const def = R.weaponById(id);
    actor.loadout = def.class === 'melee'
      ? { primary: null, secondary: null, melee: id }
      : { primary: id, secondary: null, melee: 'fists' };
    actor.buildLoadout();
    actor.slot = 0;
    for (const w of actor.slots) w.refill();
  },

  /* ----------------------------- Juggernaut ----------------------------- */
  pickJuggernaut(who) {
    const pool = R.combat.actors;
    this.juggernaut = who || R.pick(pool);
    for (const a of pool) this.applyJuggStats(a);
    if (this.juggernaut) {
      this.setBanner(this.juggernaut.isLocal ? 'YOU ARE THE JUGGERNAUT' : this.juggernaut.name.toUpperCase() + ' IS THE JUGGERNAUT', 2.6);
      R.audio.ui('round');
    }
  },
  applyJuggStats(a) {
    const isJ = a === this.juggernaut;
    a.maxHealth = isJ ? 500 : 100;
    a.health = Math.min(a.health <= 0 ? a.maxHealth : a.health, a.maxHealth);
    if (a.dead) a.health = a.maxHealth;
    if (isJ) {
      a.loadout = { primary: 'lmg', secondary: 'shotgun', melee: 'axe' };
      a.buildLoadout();
    } else if (a._juggRestore !== false) {
      a.loadout = a.baseLoadout ? Object.assign({}, a.baseLoadout) : a.loadout;
      a.buildLoadout();
    }
  },

  /* -------------------------------- kills -------------------------------- */
  onKill(killer, victim, info) {
    const d = this.def;
    if (!d) return;
    const name = w => (w ? w.name : 'the void');
    this.feed.unshift({
      killer: killer ? killer.name : null,
      killerTeam: killer ? killer.team : null,
      victim: victim.name, victimTeam: victim.team,
      weapon: info && info.def ? (info.def.name || (info.def.void ? 'void' : '')) : (info && info.def && info.def.void ? 'void' : ''),
      crit: !!(info && info.crit),
      t: R.t, local: !!(killer && killer.isLocal) || !!victim.isLocal,
    });
    if (this.feed.length > 7) this.feed.pop();

    if (killer && killer !== victim) {
      // Payouts: keys for a kill, more for a crit kill and for a streak.
      if (killer.isLocal) {
        const base = 2 + (info && info.crit ? 1 : 0) + Math.min(4, Math.floor(killer.streak / 2));
        this.earnedKeys += base;
        R.save.addKeys(base);
        R.ui.onKillFeedLocal(victim, info);
        R.audio.kill();
      }
      if (d.teams) this.kills[killer.team] = (this.kills[killer.team] || 0) + 1;
      // Gun Game: a kill is a promotion; a melee kill demotes the victim.
      if (d.kind === 'ladder') {
        const last = R.GUNGAME_LADDER.length - 1;
        if (killer.ladder >= last) { this.endMatch(killer.isLocal ? 'win' : 'loss', killer); return; }
        this.giveLadder(killer, (killer.ladder || 0) + 1);
        if (info && info.def && info.def.class === 'melee' && victim.ladder > 0) this.giveLadder(victim, victim.ladder - 1);
      }
      // Killing the juggernaut makes you the juggernaut.
      if (d.kind === 'jugg' && victim === this.juggernaut) {
        killer.baseLoadout = killer.baseLoadout || Object.assign({}, killer.loadout);
        this.pickJuggernaut(killer);
        killer.health = killer.maxHealth;
      }
      // Kill-heal in respawn modes, so a win streak is survivable.
      if (d.kind !== 'rounds') killer.health = Math.min(killer.maxHealth, killer.health + 25);
    }
  },

  /* ------------------------------- update ------------------------------- */
  update(dt) {
    const d = this.def;
    if (!d) return;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.stateT -= dt;

    if (this.state === 'countdown') {
      if (this.stateT <= 0) { this.state = 'live'; this.setBanner('FIGHT', 0.8); R.audio.ui('round'); }
      return;
    }
    if (this.state === 'roundover') {
      if (this.stateT <= 0) {
        if (this.wins.blue >= d.roundWins || this.wins.red >= d.roundWins) {
          const localTeam = R.player ? R.player.team : 'blue';
          this.endMatch(this.wins[localTeam] >= d.roundWins ? 'win' : 'loss');
        } else this.beginRound();
      }
      return;
    }
    if (this.state !== 'live') return;

    if (d.kind === 'rounds') {
      // Elimination: a side is out when every one of its members is dead.
      const alive = { blue: 0, red: 0 };
      for (const a of R.combat.actors) if (!a.dead) alive[a.team]++;
      if (alive.blue === 0 || alive.red === 0) {
        const winner = alive.blue > 0 ? 'blue' : alive.red > 0 ? 'red' : null;
        if (winner) this.wins[winner]++;
        this.state = 'roundover';
        this.stateT = 3.2;
        const localTeam = R.player ? R.player.team : 'blue';
        const won = winner === localTeam;
        this.setBanner(
          winner ? (won ? 'ROUND WON' : 'ROUND LOST') : 'DRAW',
          3, this.wins.blue + ' — ' + this.wins.red);
        R.audio.ui(won ? 'round' : 'lose');
        if (won && R.player) { R.save.addKeys(5); this.earnedKeys += 5; }
      }
    } else {
      // Respawn modes: a timer on each corpse, then back in.
      for (const a of R.combat.actors) {
        if (a.dead && a.deadT > (a.isLocal ? 2.4 : 2.0)) {
          if (d.kind === 'jugg') this.applyJuggStats(a);
          a.respawn(R.pickSpawn(d.teams ? a.team : 'ffa', R.combat.actors, a));
          if (d.kind === 'ladder') this.giveLadder(a, a.ladder || 0);
        }
      }
      if (d.kind === 'kills') {
        if (d.teams) {
          for (const t of ['blue', 'red']) {
            if (this.kills[t] >= d.killTarget) {
              this.endMatch(R.player && R.player.team === t ? 'win' : 'loss');
              return;
            }
          }
        } else {
          for (const a of R.combat.actors) {
            if (a.kills >= d.killTarget) { this.endMatch(a.isLocal ? 'win' : 'loss', a); return; }
          }
        }
      }
      if (d.kind === 'jugg') {
        // Hold the title for 90 seconds of game time to win it outright.
        if (this.juggernaut) {
          this._juggHold = (this._juggHold || 0) + (this.juggernaut.dead ? 0 : dt);
          if (this._juggHold > 90) { this.endMatch(this.juggernaut.isLocal ? 'win' : 'loss', this.juggernaut); return; }
        }
      }
    }
  },

  endMatch(result, who) {
    if (this.state === 'matchover') return;
    this.state = 'matchover';
    this.stateT = 99;
    const won = result === 'win';
    // Payouts, roughly the shape of the real game's: a win pays, a loss pays
    // less, and ranked moves your rating.
    const keys = won ? 35 : 12;
    R.save.addKeys(keys);
    this.earnedKeys += keys;
    if (this.def.ranked) {
      const delta = won ? R.randi(18, 26) : -R.randi(10, 18);
      this.earnedRp = delta;
      R.save.addRp(delta);
    }
    R.save.recordMatch(won, R.player);
    this.setBanner(won ? 'VICTORY' : 'DEFEAT', 6,
      who ? who.name : (this.wins.blue + ' — ' + this.wins.red));
    R.audio.ui(won ? 'round' : 'lose');
    R.ui.showMatchEnd(won, who);
  },

  // Scoreboard rows, sorted the way the game sorts them.
  standings() {
    const rows = R.combat.actors.map(a => ({
      name: a.name, team: a.team, kills: a.kills, deaths: a.deaths,
      dmg: Math.round(a.damageDealt), local: a.isLocal, dead: a.dead,
      ladder: a.ladder || 0, jugg: a === this.juggernaut, hp: a.health, max: a.maxHealth,
    }));
    rows.sort((x, y) => y.kills - x.kills || x.deaths - y.deaths || y.dmg - x.dmg);
    return rows;
  },
};

/* ======================= ranks and persistence ======================= */
// Ranked tiers, in the style of the real ladder.

R.RANKS = [
  { name: 'Bronze', min: 0, color: '#b07a3a' },
  { name: 'Silver', min: 300, color: '#b8bcc4' },
  { name: 'Gold', min: 700, color: '#e0b63a' },
  { name: 'Platinum', min: 1200, color: '#4ad8d0' },
  { name: 'Diamond', min: 1800, color: '#6aa8ff' },
  { name: 'Master', min: 2500, color: '#b388ff' },
  { name: 'Rival', min: 3200, color: '#ff4a6a' },
];
R.rankFor = rp => {
  let r = R.RANKS[0];
  for (const t of R.RANKS) if (rp >= t.min) r = t;
  return r;
};

R.save = {
  key: 'rivals.save.v1',
  data: null,
  defaults() {
    return {
      keys: 30, rp: 0, matches: 0, wins: 0, kills: 0, deaths: 0,
      owned: ['fists', 'rifle'], charms: ['none'], skins: ['default'],
      loadout: { primary: 'rifle', secondary: null, melee: 'fists' },
      charm: 'none', skin: 'default', name: 'You',
      settings: null, bestStreak: 0,
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { d = null; }
    this.data = Object.assign(this.defaults(), d || {});
    // Owned lists can drift if the roster changes; keep them valid.
    this.data.owned = this.data.owned.filter(id => R.weaponById(id));
    for (const w of R.WEAPONS) if (w.cost === 0 && !this.data.owned.includes(w.id)) this.data.owned.push(w.id);
    if (this.data.settings) Object.assign(R.settings, this.data.settings);
    return this.data;
  },
  flush() {
    try {
      this.data.settings = Object.assign({}, R.settings);
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) { /* private window: play on without saving */ }
  },
  addKeys(n) { this.data.keys += n; this.flush(); },
  addRp(n) { this.data.rp = Math.max(0, this.data.rp + n); this.flush(); },
  owns(id) { return this.data.owned.includes(id); },
  buy(id) {
    const w = R.weaponById(id);
    if (!w || this.owns(id) || this.data.keys < w.cost) return false;
    this.data.keys -= w.cost;
    this.data.owned.push(id);
    this.flush();
    return true;
  },
  buyCharm(id) {
    const c = R.CHARMS.find(x => x.id === id);
    if (!c || this.data.charms.includes(id) || this.data.keys < c.cost) return false;
    this.data.keys -= c.cost; this.data.charms.push(id); this.flush(); return true;
  },
  buySkin(id) {
    const s = R.SKINS.find(x => x.id === id);
    if (!s || this.data.skins.includes(id) || this.data.keys < s.cost) return false;
    this.data.keys -= s.cost; this.data.skins.push(id); this.flush(); return true;
  },
  recordMatch(won, player) {
    this.data.matches++;
    if (won) this.data.wins++;
    if (player) {
      this.data.kills += player.kills;
      this.data.deaths += player.deaths;
      this.data.bestStreak = Math.max(this.data.bestStreak, player.streak);
    }
    this.flush();
  },
  reset() { this.data = this.defaults(); this.flush(); },
};
