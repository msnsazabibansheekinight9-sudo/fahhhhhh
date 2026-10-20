'use strict';
// ============================================================================
// UI — the HUD and the menus. Everything the player reads: health, ammo, the
// spread-aware crosshair, hitmarkers, the kill feed, the round score, the
// scoreboard, the shop that spends keys, and the loadout with three slots.
// ============================================================================

R.ui = {
  el: {}, menuOpen: true, tab: 'play', scoreOpen: false,
  hitT: 0, hitCrit: false, hitDmg: 0,
  hurtT: 0, hurtDir: 0,
  killT: 0, killText: '',
  feedCache: '',
  cfg: { mode: 'duel', size: 1, map: 'arena', diff: 'casual' },

  $(id) { return document.getElementById(id); },

  init() {
    const ids = ['hud', 'menu', 'cross', 'hitmark', 'feed', 'banner', 'bannersub', 'vitals', 'hpbar', 'hpnum',
      'ammo', 'wname', 'wslots', 'score', 'scoreboard', 'scope', 'vignette', 'keys', 'ladder', 'juggbar',
      'matchend', 'fps', 'lowammo', 'killtoast', 'deadpanel', 'deadtext', 'chargebar', 'chargefill', 'speedo'];
    for (const id of ids) this.el[id] = this.$(id);
    this.buildMenu();
    this.bind();
    this.refreshMenu();
  },

  bind() {
    addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (R.modes.state === 'matchover') return;
        if (this.menuOpen) { if (R.inMatch) this.closeMenu(); }
        else this.openMenu('play');
      }
      if (e.code === 'Tab') { e.preventDefault(); this.scoreOpen = true; }
      if (e.code === 'KeyV' && R.inMatch && !this.menuOpen) R.thirdPerson = !R.thirdPerson;
    });
    addEventListener('keyup', e => { if (e.code === 'Tab') this.scoreOpen = false; });
    R.onLockChange = locked => {
      if (!locked && R.inMatch && !this.menuOpen && R.modes.state !== 'matchover') this.openMenu('play');
    };
  },

  /* ============================== the menu ============================== */
  buildMenu() {
    const m = this.el.menu;
    m.innerHTML = `
      <div class="mwrap">
        <header class="mhead">
          <div class="brand"><span class="bmark">R</span><h1>RIVALS</h1></div>
          <div class="wallet">
            <div class="wkeys"><b id="walletKeys">0</b><span>KEYS</span></div>
            <div class="wrank"><b id="walletRank">Bronze</b><span id="walletRp">0 RP</span></div>
          </div>
        </header>
        <nav class="tabs">
          <button data-tab="play" class="on">Play</button>
          <button data-tab="loadout">Loadout</button>
          <button data-tab="shop">Shop</button>
          <button data-tab="stats">Stats</button>
          <button data-tab="settings">Settings</button>
        </nav>
        <section class="panel" id="tab-play"></section>
        <section class="panel" id="tab-loadout" hidden></section>
        <section class="panel" id="tab-shop" hidden></section>
        <section class="panel" id="tab-stats" hidden></section>
        <section class="panel" id="tab-settings" hidden></section>
        <footer class="mfoot">
          <span>WASD move · SPACE jump · SHIFT slide · 1/2/3 weapons · R reload · RMB scope · TAB scoreboard · V camera</span>
        </footer>
      </div>`;
    m.querySelectorAll('.tabs button').forEach(b => {
      b.onclick = () => { R.audio.ui('click'); this.openMenu(b.dataset.tab); };
    });
  },

  openMenu(tab) {
    this.menuOpen = true;
    this.tab = tab || this.tab;
    this.el.menu.hidden = false;
    this.el.hud.classList.add('dim');
    R.unlockPointer();
    this.el.menu.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    for (const t of ['play', 'loadout', 'shop', 'stats', 'settings']) this.$('tab-' + t).hidden = t !== this.tab;
    this.refreshMenu();
  },

  closeMenu() {
    this.menuOpen = false;
    this.el.menu.hidden = true;
    this.el.hud.classList.remove('dim');
    R.audio.init(); R.audio.resume();
    R.lockPointer();
  },

  refreshMenu() {
    const d = R.save.data;
    const rank = R.rankFor(d.rp);
    this.$('walletKeys').textContent = R.fmt(d.keys);
    this.$('walletRank').textContent = rank.name;
    this.$('walletRank').style.color = rank.color;
    this.$('walletRp').textContent = d.rp + ' RP';
    if (this.tab === 'play') this.renderPlay();
    if (this.tab === 'loadout') this.renderLoadout();
    if (this.tab === 'shop') this.renderShop();
    if (this.tab === 'stats') this.renderStats();
    if (this.tab === 'settings') this.renderSettings();
  },

  renderPlay() {
    const c = this.cfg;
    const mode = R.modeById(c.mode);
    if (!mode.sizes.includes(c.size)) c.size = mode.sizes[0];
    const maps = R.MAPS.filter(mp => mode.teams ? mp.sizes.includes(c.size) || mp.sizes.includes(Math.min(5, c.size)) : true);
    if (!maps.find(mp => mp.id === c.map)) c.map = maps[0].id;

    const p = this.$('tab-play');
    p.innerHTML = `
      <div class="grid2">
        <div>
          <h2>Mode</h2>
          <div class="cards" id="modeCards">
            ${R.MODES.map(m => `
              <button class="card ${m.id === c.mode ? 'sel' : ''}" data-mode="${m.id}">
                <b>${m.name}</b>
                <small>${m.blurb}</small>
                ${m.ranked ? '<i class="pill rank">RANKED</i>' : ''}
              </button>`).join('')}
          </div>

          <h2>Team size</h2>
          <div class="chips" id="sizeChips">
            ${mode.sizes.map(s => `<button class="chip ${s === c.size ? 'sel' : ''}" data-size="${s}">${mode.teams ? s + 'v' + s : s + ' players'}</button>`).join('')}
          </div>

          <h2>Difficulty</h2>
          <div class="chips" id="diffChips">
            ${Object.entries(R.DIFFICULTY).map(([k, v]) => `<button class="chip ${k === c.diff ? 'sel' : ''}" data-diff="${k}">${v.label}</button>`).join('')}
          </div>
        </div>
        <div>
          <h2>Map</h2>
          <div class="cards maps" id="mapCards">
            ${maps.map(mp => `
              <button class="card map ${mp.id === c.map ? 'sel' : ''}" data-map="${mp.id}" style="--sky:${mp.sky}">
                <span class="mapsky"></span>
                <b>${mp.name}</b>
                <small>${mp.blurb}</small>
                ${mp.big ? '<i class="pill">BIG</i>' : ''}
              </button>`).join('')}
          </div>
          <div class="playrow">
            <button class="btn big" id="btnPlay">${R.inMatch ? 'New match' : 'Play'}</button>
            ${R.inMatch ? '<button class="btn ghost" id="btnResume">Resume</button>' : ''}
          </div>
        </div>
      </div>`;

    p.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { c.mode = b.dataset.mode; R.audio.ui('click'); this.renderPlay(); });
    p.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { c.size = +b.dataset.size; R.audio.ui('click'); this.renderPlay(); });
    p.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { c.diff = b.dataset.diff; R.audio.ui('click'); this.renderPlay(); });
    p.querySelectorAll('[data-map]').forEach(b => b.onclick = () => { c.map = b.dataset.map; R.audio.ui('click'); this.renderPlay(); });
    this.$('btnPlay').onclick = () => { R.audio.ui('buy'); R.startMatch(Object.assign({}, c)); };
    const res = this.$('btnResume');
    if (res) res.onclick = () => this.closeMenu();
  },

  renderLoadout() {
    const d = R.save.data;
    const slotFor = cls => d.loadout[cls];
    const list = cls => R.WEAPONS.filter(w => w.class === cls);
    const row = (cls, label) => `
      <h2>${label}</h2>
      <div class="wlist">
        ${list(cls).map(w => {
      const owned = R.save.owns(w.id);
      const sel = slotFor(cls) === w.id;
      return `<button class="wrow ${sel ? 'sel' : ''} ${owned ? '' : 'locked'}" data-pick="${w.id}" data-cls="${cls}">
            <span class="wn">${w.name}</span>
            <span class="wst">${w.dmg}<i>dmg</i> ${w.critDmg !== w.dmg ? w.critDmg + '<i>crit</i>' : ''} ${w.rpm}<i>rpm</i> ${w.mag === Infinity ? '' : w.mag + '<i>mag</i>'}</span>
            <span class="wtag">${owned ? (sel ? 'EQUIPPED' : 'OWNED') : w.cost + ' KEYS'}</span>
          </button>`;
    }).join('')}
      </div>`;

    const p = this.$('tab-loadout');
    p.innerHTML = `
      <div class="grid2">
        <div>${row('primary', 'Primary')}${row('secondary', 'Secondary')}</div>
        <div>
          ${row('melee', 'Melee')}
          <h2>Appearance</h2>
          <div class="chips">
            ${R.SKINS.map(s => `<button class="chip ${d.skin === s.id ? 'sel' : ''} ${d.skins.includes(s.id) ? '' : 'locked'}" data-skin="${s.id}">${s.name}</button>`).join('')}
          </div>
          <div class="chips">
            ${R.CHARMS.map(s => `<button class="chip ${d.charm === s.id ? 'sel' : ''} ${d.charms.includes(s.id) ? '' : 'locked'}" data-charm="${s.id}">${s.name}</button>`).join('')}
          </div>
          <p class="hint">Secondary can be left empty — plenty of players run primary and fists only, for the double jump.</p>
          <div class="chips"><button class="chip" data-pick="" data-cls="secondary">No secondary</button></div>
        </div>
      </div>`;

    p.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const id = b.dataset.pick, cls = b.dataset.cls;
      if (id && !R.save.owns(id)) { this.openMenu('shop'); R.audio.ui('deny'); return; }
      d.loadout[cls] = id || null;
      if (cls === 'melee' && !id) d.loadout.melee = 'fists';
      R.save.flush(); R.audio.ui('click');
      if (R.player) { R.player.loadout = Object.assign({}, d.loadout); R.player.buildLoadout(); }
      this.renderLoadout();
    });
    p.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => {
      const id = b.dataset.skin;
      if (!d.skins.includes(id)) { this.openMenu('shop'); R.audio.ui('deny'); return; }
      d.skin = id; R.save.flush(); R.audio.ui('click');
      if (R.player) { R.player.skin = id; R.player.vmId = null; }
      this.renderLoadout();
    });
    p.querySelectorAll('[data-charm]').forEach(b => b.onclick = () => {
      const id = b.dataset.charm;
      if (!d.charms.includes(id)) { this.openMenu('shop'); R.audio.ui('deny'); return; }
      d.charm = id; R.save.flush(); R.audio.ui('click');
      this.renderLoadout();
    });
  },

  renderShop() {
    const d = R.save.data;
    const p = this.$('tab-shop');
    const wcards = R.WEAPONS.filter(w => w.cost > 0).map(w => {
      const owned = R.save.owns(w.id);
      const afford = d.keys >= w.cost;
      return `<div class="scard ${owned ? 'owned' : afford ? '' : 'poor'}">
        <div class="sh"><b>${w.name}</b><i class="pill">${w.class}</i></div>
        <p>${w.desc}</p>
        <div class="stats">
          <span>${w.dmg}<i>dmg</i></span>
          ${w.critDmg !== w.dmg ? `<span>${w.critDmg}<i>crit</i></span>` : ''}
          <span>${w.rpm}<i>rpm</i></span>
          ${w.mag === Infinity ? '' : `<span>${w.mag}<i>mag</i></span>`}
          ${w.pellets ? `<span>${w.pellets}<i>pellets</i></span>` : ''}
          ${w.splash ? `<span>${w.splash}<i>splash</i></span>` : ''}
          ${w.doubleJump ? '<span class="good">double jump</span>' : ''}
        </div>
        <button class="btn ${owned ? 'ghost' : ''}" data-buy="${w.id}" ${owned ? 'disabled' : ''}>
          ${owned ? 'Owned' : w.cost + ' keys'}
        </button>
      </div>`;
    }).join('');

    p.innerHTML = `
      <h2>Weapons</h2>
      <div class="shop">${wcards}</div>
      <h2>Charms</h2>
      <div class="shop small">
        ${R.CHARMS.filter(c => c.cost > 0).map(c => `
          <div class="scard ${d.charms.includes(c.id) ? 'owned' : d.keys >= c.cost ? '' : 'poor'}">
            <div class="sh"><b>${c.name}</b></div>
            <button class="btn ${d.charms.includes(c.id) ? 'ghost' : ''}" data-buycharm="${c.id}" ${d.charms.includes(c.id) ? 'disabled' : ''}>
              ${d.charms.includes(c.id) ? 'Owned' : c.cost + ' keys'}</button>
          </div>`).join('')}
      </div>
      <h2>Skins</h2>
      <div class="shop small">
        ${R.SKINS.filter(s => s.cost > 0).map(s => `
          <div class="scard ${d.skins.includes(s.id) ? 'owned' : d.keys >= s.cost ? '' : 'poor'}">
            <div class="sh"><b>${s.name}</b></div>
            <button class="btn ${d.skins.includes(s.id) ? 'ghost' : ''}" data-buyskin="${s.id}" ${d.skins.includes(s.id) ? 'disabled' : ''}>
              ${d.skins.includes(s.id) ? 'Owned' : s.cost + ' keys'}</button>
          </div>`).join('')}
      </div>
      <p class="hint">Keys come from playing: 2 a kill, 1 more for a crit, 5 a round win, 35 for a match win.</p>`;

    p.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      if (R.save.buy(b.dataset.buy)) { R.audio.ui('buy'); this.refreshMenu(); } else R.audio.ui('deny');
    });
    p.querySelectorAll('[data-buycharm]').forEach(b => b.onclick = () => {
      if (R.save.buyCharm(b.dataset.buycharm)) { R.audio.ui('buy'); this.refreshMenu(); } else R.audio.ui('deny');
    });
    p.querySelectorAll('[data-buyskin]').forEach(b => b.onclick = () => {
      if (R.save.buySkin(b.dataset.buyskin)) { R.audio.ui('buy'); this.refreshMenu(); } else R.audio.ui('deny');
    });
  },

  renderStats() {
    const d = R.save.data;
    const rank = R.rankFor(d.rp);
    const next = R.RANKS.find(r => r.min > d.rp);
    const kd = d.deaths ? (d.kills / d.deaths).toFixed(2) : d.kills.toFixed(2);
    const wr = d.matches ? Math.round(d.wins / d.matches * 100) : 0;
    this.$('tab-stats').innerHTML = `
      <div class="grid2">
        <div>
          <h2>Rank</h2>
          <div class="rankbox" style="--rc:${rank.color}">
            <b>${rank.name}</b>
            <span>${d.rp} RP</span>
            ${next ? `<div class="bar"><div style="width:${Math.round((d.rp - rank.min) / (next.min - rank.min) * 100)}%"></div></div>
              <small>${next.min - d.rp} RP to ${next.name}</small>` : '<small>Top of the ladder.</small>'}
          </div>
          <h2>Career</h2>
          <div class="statgrid">
            <div><b>${d.matches}</b><span>matches</span></div>
            <div><b>${d.wins}</b><span>wins</span></div>
            <div><b>${wr}%</b><span>win rate</span></div>
            <div><b>${d.kills}</b><span>kills</span></div>
            <div><b>${d.deaths}</b><span>deaths</span></div>
            <div><b>${kd}</b><span>K/D</span></div>
            <div><b>${d.bestStreak}</b><span>best streak</span></div>
            <div><b>${R.fmt(d.keys)}</b><span>keys</span></div>
          </div>
        </div>
        <div>
          <h2>The arsenal</h2>
          <div class="wlist tight">
            ${R.WEAPONS.map(w => `<div class="wrow ${R.save.owns(w.id) ? '' : 'locked'}">
              <span class="wn">${w.name}</span>
              <span class="wst">${w.class}</span>
              <span class="wtag">${R.save.owns(w.id) ? 'OWNED' : w.cost + ' KEYS'}</span></div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  renderSettings() {
    const s = R.settings;
    this.$('tab-settings').innerHTML = `
      <div class="settings">
        <label>Sensitivity <b id="vSens">${s.sens.toFixed(2)}</b>
          <input type="range" id="sSens" min="0.08" max="1.6" step="0.01" value="${s.sens}"></label>
        <label>Field of view <b id="vFov">${s.fov}</b>
          <input type="range" id="sFov" min="60" max="110" step="1" value="${s.fov}"></label>
        <label>Volume <b id="vVol">${Math.round(s.volume * 100)}</b>
          <input type="range" id="sVol" min="0" max="1" step="0.02" value="${s.volume}"></label>
        <label>View bobbing <b id="vBob">${Math.round(s.bobbing * 100)}</b>
          <input type="range" id="sBob" min="0" max="1" step="0.05" value="${s.bobbing}"></label>
        <label>Quality
          <select id="sQual">
            ${['high', 'medium', 'low'].map(q => `<option value="${q}" ${s.quality === q ? 'selected' : ''}>${q}</option>`).join('')}
          </select></label>
        <label>Show viewmodel
          <select id="sVm"><option value="1" ${s.viewmodel ? 'selected' : ''}>on</option><option value="0" ${!s.viewmodel ? 'selected' : ''}>off</option></select></label>
        <label>FPS counter
          <select id="sFps"><option value="0" ${!s.showFps ? 'selected' : ''}>off</option><option value="1" ${s.showFps ? 'selected' : ''}>on</option></select></label>
      </div>
      <h2>Controls</h2>
      <div class="controls">
        <div><span>Move</span><kbd>W A S D</kbd></div>
        <div><span>Jump / double jump</span><kbd>SPACE</kbd></div>
        <div><span>Slide</span><kbd>SHIFT</kbd> or <kbd>C</kbd></div>
        <div><span>Fire</span><kbd>LMB</kbd></div>
        <div><span>Scope</span><kbd>RMB</kbd></div>
        <div><span>Reload</span><kbd>R</kbd></div>
        <div><span>Weapons</span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>Q</kbd></div>
        <div><span>Scoreboard</span><kbd>TAB</kbd></div>
        <div><span>Camera</span><kbd>V</kbd></div>
        <div><span>Menu</span><kbd>ESC</kbd></div>
      </div>
      <h2>Save</h2>
      <div class="chips"><button class="chip danger" id="btnWipe">Reset progress</button></div>`;

    const bind = (id, key, fn) => {
      const e = this.$(id);
      if (!e) return;
      e.oninput = () => {
        const v = e.type === 'range' ? +e.value : e.value;
        fn(v);
        R.save.flush();
        this.renderSettingsValues();
      };
    };
    bind('sSens', 'sens', v => R.settings.sens = v);
    bind('sFov', 'fov', v => { R.settings.fov = v; if (R.player) R.player.fovTarget = v; });
    bind('sVol', 'volume', v => { R.settings.volume = v; R.audio.setVolume(v); });
    bind('sBob', 'bobbing', v => R.settings.bobbing = v);
    this.$('sQual').onchange = e => { R.settings.quality = e.target.value; R.save.flush(); };
    this.$('sVm').onchange = e => { R.settings.viewmodel = e.target.value === '1'; R.save.flush(); };
    this.$('sFps').onchange = e => { R.settings.showFps = e.target.value === '1'; R.save.flush(); };
    this.$('btnWipe').onclick = () => { R.save.reset(); R.audio.ui('deny'); this.refreshMenu(); };
  },

  renderSettingsValues() {
    const s = R.settings;
    const set = (id, v) => { const e = this.$(id); if (e) e.textContent = v; };
    set('vSens', s.sens.toFixed(2)); set('vFov', s.fov);
    set('vVol', Math.round(s.volume * 100)); set('vBob', Math.round(s.bobbing * 100));
  },

  /* =============================== the HUD =============================== */
  onLocalShot() { /* crosshair bloom is read from the weapon each frame */ },

  hitmarker(crit, dmg) {
    this.hitT = crit ? 0.3 : 0.22;
    this.hitCrit = crit;
    this.hitDmg = Math.round(dmg);
  },

  onHurt(amount, by, crit) {
    this.hurtT = Math.min(1, this.hurtT + amount / 70);
    if (by && by.pos && R.player) {
      const to = new THREE.Vector3().subVectors(by.pos, R.player.pos);
      this.hurtDir = Math.atan2(to.x, to.z) - R.player.yaw;
    }
    R.addShake(Math.min(0.3, amount / 220));
  },

  onKillFeedLocal(victim, info) {
    this.killT = 1.6;
    this.killText = (info && info.crit ? 'CRIT KILL' : 'ELIMINATED') + ' ' + victim.name;
    const p = R.player;
    if (p && p.streak >= 2) this.killText += '  ×' + p.streak;
  },

  showMatchEnd(won, who) {
    const M = R.modes;
    const rows = M.standings();
    const d = R.save.data;
    this.el.matchend.hidden = false;
    this.el.matchend.innerHTML = `
      <div class="endwrap ${won ? 'win' : 'loss'}">
        <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
        <p class="endsub">${M.def.name} · ${R.maps.current.name}${M.def.kind === 'rounds' ? ' · ' + M.wins.blue + ' — ' + M.wins.red : who ? ' · ' + who.name + ' finished it' : ''}</p>
        <div class="endstats">
          <div><b>+${M.earnedKeys}</b><span>keys earned</span></div>
          ${M.def.ranked ? `<div><b>${M.earnedRp >= 0 ? '+' : ''}${M.earnedRp}</b><span>RP</span></div>` : ''}
          <div><b>${R.player.kills}</b><span>kills</span></div>
          <div><b>${R.player.deaths}</b><span>deaths</span></div>
          <div><b>${Math.round(R.player.damageDealt)}</b><span>damage</span></div>
        </div>
        <table class="sbtable">
          <tr><th>#</th><th>Player</th><th>K</th><th>D</th><th>DMG</th></tr>
          ${rows.map((r, i) => `<tr class="${r.local ? 'me' : ''} t-${r.team}">
            <td>${i + 1}</td><td>${r.name}</td><td>${r.kills}</td><td>${r.deaths}</td><td>${r.dmg}</td></tr>`).join('')}
        </table>
        <div class="playrow">
          <button class="btn big" id="btnAgain">Play again</button>
          <button class="btn ghost" id="btnLobby">Lobby</button>
        </div>
      </div>`;
    R.unlockPointer();
    this.$('btnAgain').onclick = () => {
      this.el.matchend.hidden = true;
      R.audio.ui('buy');
      R.startMatch(Object.assign({}, this.cfg));
    };
    this.$('btnLobby').onclick = () => {
      this.el.matchend.hidden = true;
      this.openMenu('play');
    };
  },

  update(dt) {
    const p = R.player, M = R.modes;
    this.hitT = Math.max(0, this.hitT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt * 1.6);
    this.killT = Math.max(0, this.killT - dt);

    if (!R.inMatch || !p) { this.el.hud.hidden = true; return; }
    this.el.hud.hidden = false;

    // Health.
    const hp = R.clamp(p.health / p.maxHealth, 0, 1);
    this.el.hpbar.style.width = (hp * 100).toFixed(1) + '%';
    this.el.hpbar.style.background = hp > 0.5 ? 'var(--ok)' : hp > 0.25 ? 'var(--warn)' : 'var(--bad)';
    this.el.hpnum.textContent = Math.max(0, Math.ceil(p.health));

    // Weapon and ammo.
    const wep = p.weapon, def = p.def;
    if (def) {
      this.el.wname.textContent = def.name;
      this.el.ammo.innerHTML = def.mag === Infinity
        ? '<b>∞</b>'
        : `<b>${wep.ammo}</b><span>/ ${wep.reserve === Infinity ? '∞' : wep.reserve}</span>`;
      const low = def.mag !== Infinity && wep.ammo <= Math.max(1, def.mag * 0.25);
      this.el.lowammo.hidden = !(low && wep.reloading <= 0);
      this.el.lowammo.textContent = wep.ammo === 0 ? 'RELOAD [R]' : 'LOW AMMO';
    }
    // Slots.
    this.el.wslots.innerHTML = p.slots.map((w, i) =>
      `<i class="${i === p.slot ? 'on' : ''}">${i + 1} ${w.def.name}</i>`).join('');

    // Crosshair: opens with spread, hides when scoped.
    const spread = wep ? wep.spread : 0;
    const bloom = 6 + spread * 900 + (p.grounded ? 0 : 6) + Math.min(10, p.speed2D * 0.18);
    this.el.cross.style.setProperty('--gap', bloom.toFixed(1) + 'px');
    this.el.cross.classList.toggle('hidden', R.vmScopeAmount(p.vm) > 0.6 || p.dead);
    this.el.cross.classList.toggle('melee', !!(def && def.class === 'melee'));

    // Scope overlay.
    const sc = R.vmScopeAmount(p.vm);
    this.el.scope.style.opacity = sc > 0.5 ? ((sc - 0.5) * 2).toFixed(2) : '0';
    this.el.scope.hidden = sc <= 0.5;

    // Bow charge bar.
    const charging = def && def.charge && wep.chargeT > 0.02;
    this.el.chargebar.hidden = !charging;
    if (charging) this.el.chargefill.style.width = (R.clamp(wep.chargeT / def.charge, 0, 1) * 100) + '%';

    // Hitmarker.
    this.el.hitmark.style.opacity = this.hitT > 0 ? '1' : '0';
    this.el.hitmark.classList.toggle('crit', this.hitCrit);
    this.el.hitmark.dataset.dmg = this.hitDmg;

    // Damage vignette.
    this.el.vignette.style.opacity = (this.hurtT * 0.75).toFixed(2);

    // Kill toast.
    this.el.killtoast.hidden = this.killT <= 0;
    if (this.killT > 0) this.el.killtoast.textContent = this.killText;

    // Score line.
    if (M.def) {
      if (M.def.kind === 'rounds') {
        const me = p.team, them = me === 'blue' ? 'red' : 'blue';
        this.el.score.innerHTML = `<i class="t-${me}">${M.wins[me]}</i><span>ROUND ${M.round}</span><i class="t-${them}">${M.wins[them]}</i>`;
      } else if (M.def.kind === 'kills' && M.def.teams) {
        const me = p.team, them = me === 'blue' ? 'red' : 'blue';
        this.el.score.innerHTML = `<i class="t-${me}">${M.kills[me] || 0}</i><span>TO ${M.def.killTarget}</span><i class="t-${them}">${M.kills[them] || 0}</i>`;
      } else if (M.def.kind === 'ladder') {
        this.el.score.innerHTML = `<span>GUN GAME</span><i>${(p.ladder || 0) + 1} / ${R.GUNGAME_LADDER.length}</i>`;
      } else if (M.def.kind === 'jugg') {
        const j = M.juggernaut;
        this.el.score.innerHTML = `<span>JUGGERNAUT</span><i>${j ? (j.isLocal ? 'YOU' : j.name) : '—'}</i>`;
      } else {
        const lead = M.standings()[0];
        this.el.score.innerHTML = `<span>FFA · FIRST TO ${M.def.killTarget}</span><i>${p.kills} / ${lead ? lead.kills : 0}</i>`;
      }
    }

    // Gun Game ladder strip.
    const ladderOn = M.def && M.def.kind === 'ladder';
    this.el.ladder.hidden = !ladderOn;
    if (ladderOn) {
      this.el.ladder.innerHTML = R.GUNGAME_LADDER.map((id, i) => {
        const w = R.weaponById(id);
        return `<i class="${i === p.ladder ? 'on' : i < p.ladder ? 'done' : ''}">${w.name}</i>`;
      }).join('');
    }

    // Juggernaut health bar.
    const j = M.juggernaut;
    const juggOn = M.def && M.def.kind === 'jugg' && j && !j.dead;
    this.el.juggbar.hidden = !juggOn;
    if (juggOn) {
      this.el.juggbar.innerHTML = `<span>${j.isLocal ? 'YOU' : j.name}</span>
        <div class="bar"><div style="width:${(j.health / j.maxHealth * 100).toFixed(1)}%"></div></div>
        <b>${Math.ceil(j.health)}</b>`;
    }

    // Kill feed.
    const feed = M.feed.filter(f => R.t - f.t < 6);
    const html = feed.map(f => {
      const age = R.t - f.t;
      const fade = age > 4.5 ? (1 - (age - 4.5) / 1.5) : 1;
      return `<div style="opacity:${fade.toFixed(2)}">
        <b class="t-${f.killerTeam || 'none'}">${f.killer || 'The void'}</b>
        <i class="${f.crit ? 'crit' : ''}">${f.crit ? '⌖' : '›'}</i>
        <b class="t-${f.victimTeam}">${f.victim}</b>
        ${f.weapon ? `<em>${f.weapon}</em>` : ''}
      </div>`;
    }).join('');
    if (html !== this.feedCache) { this.el.feed.innerHTML = html; this.feedCache = html; }

    // Dead panel.
    this.el.deadpanel.hidden = !p.dead || M.state === 'matchover';
    if (p.dead && M.state !== 'matchover') {
      const killer = p.lastHitBy;
      const respawns = M.def.kind !== 'rounds';
      this.el.deadtext.innerHTML = `<b>${killer && killer !== p ? 'Eliminated by ' + killer.name : 'You died'}</b>
        <span>${respawns ? 'Respawning in ' + Math.max(0, 2.4 - p.deadT).toFixed(1) + 's' : 'Waiting for the round to end'}</span>`;
    }

    // Banner.
    this.el.banner.hidden = M.bannerT <= 0;
    if (M.bannerT > 0 && M.banner) {
      this.el.banner.textContent = M.banner.text;
      this.el.bannersub.textContent = M.banner.sub || '';
      this.el.banner.style.opacity = Math.min(1, M.bannerT * 2).toFixed(2);
    }
    // Countdown replaces the banner text while a round is starting.
    if (M.state === 'countdown' && M.stateT > 0.2) {
      this.el.banner.hidden = false;
      this.el.banner.textContent = Math.ceil(M.stateT);
      this.el.banner.style.opacity = '1';
      this.el.bannersub.textContent = M.def.kind === 'rounds' ? 'ROUND ' + M.round : M.def.name;
    }

    // Keys and speed readouts.
    this.el.keys.innerHTML = `<b>${R.fmt(R.save.data.keys)}</b> keys${M.earnedKeys ? ` <i>+${M.earnedKeys}</i>` : ''}`;
    this.el.speedo.textContent = Math.round(p.speed2D) + ' sps';
    this.el.speedo.classList.toggle('fast', p.speed2D > R.MOVE.walk * 1.15);

    // Scoreboard.
    this.el.scoreboard.hidden = !this.scoreOpen;
    if (this.scoreOpen) {
      const rows = M.standings();
      this.el.scoreboard.innerHTML = `
        <div class="sbhead">${M.def.name} · ${R.maps.current.name}
          ${M.def.kind === 'rounds' ? `<span>${M.wins.blue} — ${M.wins.red}</span>` : ''}</div>
        <table class="sbtable">
          <tr><th>Player</th><th>K</th><th>D</th><th>DMG</th><th>HP</th></tr>
          ${rows.map(r => `<tr class="${r.local ? 'me' : ''} t-${r.team} ${r.dead ? 'out' : ''}">
            <td>${r.name}${r.jugg ? ' <i class="pill">JUGG</i>' : ''}</td>
            <td>${r.kills}</td><td>${r.deaths}</td><td>${r.dmg}</td>
            <td>${r.dead ? '—' : Math.ceil(r.hp)}</td></tr>`).join('')}
        </table>`;
    }

    this.el.fps.hidden = !R.settings.showFps;
  },
};
