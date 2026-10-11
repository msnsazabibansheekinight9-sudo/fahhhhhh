// Menus and HUD: title, Instant Action setup, deploy screen, HUD/minimap/scoreboard, pause, results,
// battle passes, shop, collection, career, settings, controls, Sector Conquest campaign and touch controls.
var SF = window.SF || (window.SF = {});

(function () {
  var UI = SF.UI = {};
  var G = SF.G, D, P;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
  function fmt(n) { return Math.round(n).toLocaleString(); }
  function fmtT(t) { if (t == null) return ''; t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }

  var screens = ['title', 'play', 'deploy', 'hud', 'pause', 'results', 'pass', 'shop', 'collection', 'career', 'settings', 'controls', 'campaign'];
  UI.show = function (id) {
    screens.forEach(function (s) { $(s).classList.toggle('on', s === id); });
    UI.cur = id;
    if (id === 'title') UI.renderTitle();
    if (id === 'play') UI.renderPlay();
    if (id === 'pass') UI.renderPass();
    if (id === 'shop') UI.renderShop();
    if (id === 'collection') UI.renderCollection();
    if (id === 'career') UI.renderCareer();
    if (id === 'settings') UI.renderSettings();
    if (id === 'controls') UI.renderControls();
    if (id === 'campaign') UI.renderCampaign();
  };

  UI.boot = function () {
    D = SF.D; P = SF.Prog;
    P.load();
    SF.Game.init($('gl'));
    SF.Game.applySettings();
    G.touch = 'ontouchstart' in window && navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
    document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { SF.Audio.init(); SF.Audio.resume(); SF.Audio.ui(); UI.show(b.getAttribute('data-go')); }; });
    document.querySelectorAll('[data-back]').forEach(function (b) { b.onclick = function () { SF.Audio.ui(); UI.back(); }; });
    $('startBtn').onclick = function () { UI.launch(); };
    $('deployBtn').onclick = function () { UI.doDeploy(); };
    $('pResume').onclick = function () { UI.togglePause(false); };
    $('pDeploy').onclick = function () { if (G.player && G.player.alive) { if (G.player.vehicle) G.player.vehicle.ejectDriver(true); G.player.die(null, 'redeploy'); G.player.respawnT = 0; } $('pause').classList.remove('on'); G.state = 'deploy'; UI.showDeploy(true); };
    $('pControls').onclick = function () { UI.returnTo = 'pause'; $('pause').classList.remove('on'); UI.show('controls'); };
    $('pSettings').onclick = function () { UI.returnTo = 'pause'; $('pause').classList.remove('on'); UI.show('settings'); };
    $('pQuit').onclick = function () { $('pause').classList.remove('on'); SF.Game.quitMatch(); UI.show('title'); };
    $('resMenu').onclick = function () { G.state = 'menu'; UI.show('title'); };
    $('resAgain').onclick = function () { G.state = 'menu'; if (UI.lastCfg && !UI.lastCfg.campaign) UI.start(UI.lastCfg); else UI.show(UI.lastCfg && UI.lastCfg.campaign ? 'campaign' : 'play'); };
    $('campNew').onclick = function () { UI.newCampaignDialog(); };
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Tab' && G.state === 'play') { e.preventDefault(); $('board').style.display = 'block'; UI.renderBoard(); }
    });
    window.addEventListener('keyup', function (e) { if (e.code === 'Tab') $('board').style.display = 'none'; });
    UI.initTouch();
    UI.setup = { modeId: 'conquest', mapId: 'kesh_dunes', era: null, team: 0, teamScale: 1, difficulty: P.p.settings.difficulty || 'normal', bpCost: 'normal', heroes: true, vehicles: true, mapFilter: 'All' };
    UI.show('title');
  };
  UI.back = function () {
    if (UI.returnTo === 'pause' && G.mode) { UI.returnTo = null; screens.forEach(function (s) { if (s !== 'hud') $(s).classList.remove('on'); }); $('hud').classList.add('on'); $('pause').classList.add('on'); return; }
    UI.show('title');
  };

  // ------------------------------------------------------------------ title
  UI.renderTitle = function () {
    var p = P.p;
    $('wCredits').textContent = fmt(p.credits); $('wShards').textContent = fmt(p.shards); $('wLevel').textContent = p.level; $('wTitle').textContent = p.equipped.title || '';
    var nGround = D.maps.filter(function (m) { return !m.space; }).length, nSpace = D.maps.length - nGround;
    $('tCounts').textContent = nGround + ' ground battlefields, ' + nSpace + ' space battles, ' + D.modes.length + ' modes, ' + D.heroes.length + ' legends, ' + D.vehicles.length + ' vehicles and ' + Object.keys(D.weapons).length + ' weapons';
    P.ensureChallenges();
    $('chalList').innerHTML = p.challenges.list.map(function (c) {
      var pr = P.challengeProgress(c);
      return '<div class="chal-item"><div style="flex:1">' + esc(c.desc) + '<div class="bar"><i style="width:' + (pr / c.goal * 100) + '%"></i></div></div><div style="text-align:right;white-space:nowrap">' + (c.done ? '<span class="good">✔ Done</span>' : pr + '/' + c.goal) + '<div class="shard" style="font-size:11px">◆' + c.reward + ' <span class="coin">◈' + c.credits + '</span></div></div></div>';
    }).join('');
  };

  // ------------------------------------------------------------------ instant action
  UI.renderPlay = function () {
    var s = UI.setup;
    var mode = D.modeById[s.modeId];
    var groups = {};
    D.modes.forEach(function (m) { if (m.type !== 'campaign') (groups[m.space ? 'Space' : m.heroesOnly ? 'Legends' : 'Ground'] = groups[m.space ? 'Space' : m.heroesOnly ? 'Legends' : 'Ground'] || []).push(m); });
    $('modeList').innerHTML = ['Ground', 'Legends', 'Space'].map(function (g) {
      return '<div class="sect" style="margin:8px 10px 4px">' + g + '</div>' + groups[g].map(function (m) { return '<button class="item' + (m.id === s.modeId ? ' sel' : '') + '" data-mode="' + m.id + '"><div class="n">' + esc(m.name) + '</div><div class="m">' + esc(m.origin) + ' · ' + m.players + ' v ' + m.players + '</div></button>'; }).join('');
    }).join('');
    $('modeDesc').textContent = mode.desc;
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { s.modeId = b.getAttribute('data-mode'); var m = D.modeById[s.modeId]; if (!D.modeOk(m, D.mapById[s.mapId])) { var ok = D.maps.filter(function (mp) { return D.modeOk(m, mp); })[0]; if (ok) s.mapId = ok.id; } SF.Audio.ui(); UI.renderPlay(); }; });
    var origins = ['All', 'Classic I', 'Classic II', 'Squadron Saga', 'Reboot I', 'Reboot II', 'Rim Tales', 'Remastered'];
    $('mapFilter').innerHTML = origins.map(function (o) { return '<button class="btn small' + (s.mapFilter === o ? ' on' : '') + '" data-mf="' + o + '">' + o + '</button>'; }).join('');
    document.querySelectorAll('[data-mf]').forEach(function (b) { b.onclick = function () { s.mapFilter = b.getAttribute('data-mf'); UI.renderPlay(); }; });
    var maps = D.maps.filter(function (m) { return D.modeOk(mode, m) && (s.mapFilter === 'All' || m.origin === s.mapFilter); });
    $('mapList').innerHTML = maps.map(function (m) { var pl = D.planetById[m.planet]; return '<button class="item' + (m.id === s.mapId ? ' sel' : '') + '" data-map="' + m.id + '"><div class="n">' + esc(m.name) + '</div><div class="m">' + esc(pl.name) + ' · ' + m.origin + ' · ' + D.eraById[m.era].name + (m.space ? ' · space' : ' · ' + m.size + ' m') + '</div></button>'; }).join('') || '<div class="dim" style="padding:12px">No battlefield from this game supports the selected mode.</div>';
    document.querySelectorAll('[data-map]').forEach(function (b) { b.onclick = function () { s.mapId = b.getAttribute('data-map'); s.era = null; SF.Audio.ui(); UI.renderPlay(); }; });
    var map = D.mapById[s.mapId];
    var bio = SF.World.biomes[map.biome] || SF.World.biomes.plains;
    $('mapPreview').style.background = map.space ? 'radial-gradient(circle at 70% 120%,' + hex(map.planetColor || 0x3d7a3d) + ' 0 45%,transparent 46%),#02030a' : 'linear-gradient(180deg,' + hex(bio.sky[0]) + ',' + hex(bio.sky[1]) + ' 55%,' + hex(bio.g ? bio.g[1] : 0x555555) + ' 56%,' + hex(bio.g ? bio.g[2] : 0x333333) + ')';
    $('mapPrevLbl').innerHTML = esc(map.name) + '<div style="font-size:12px;font-weight:600">' + esc(D.planetById[map.planet].blurb) + '</div>';
    var era = s.era || map.era;
    $('eraOpt').innerHTML = D.eras.map(function (e) { return '<button class="btn' + (e.id === era ? ' on' : '') + '" data-era="' + e.id + '">' + e.name + '</button>'; }).join('');
    document.querySelectorAll('[data-era]').forEach(function (b) { b.onclick = function () { s.era = b.getAttribute('data-era'); UI.renderPlay(); }; });
    var sides = D.eraById[era].sides;
    var t0 = sides[0], t1 = sides[1];
    if (mode.type === 'hunt') { t0 = D.natives[map.planet] || 'wroshan'; }
    if (mode.type === 'infect') { t0 = sides[1]; t1 = 'tiklets'; }
    $('sideOpt').innerHTML = [t0, t1].map(function (f, i) { return '<button class="btn' + (s.team === i ? ' on' : '') + '" data-team="' + i + '" style="border-left:3px solid ' + D.factions[f].ui + '">' + D.factions[f].name + '</button>'; }).join('');
    document.querySelectorAll('[data-team]').forEach(function (b) { b.onclick = function () { s.team = +b.getAttribute('data-team'); UI.renderPlay(); }; });
    opt('sizeOpt', [['Skirmish', 0.5], ['Standard', 1], ['Epic', 1.5], ['Massive', 2]], 'teamScale');
    opt('diffOpt', [['Easy', 'easy'], ['Normal', 'normal'], ['Hard', 'hard'], ['Legendary', 'legendary']], 'difficulty');
    opt('bpOpt', [['Normal', 'normal'], ['Half', 'half'], ['Free (sandbox)', 'free']], 'bpCost');
    $('flagOpt').innerHTML = '<button class="btn' + (s.heroes ? ' on' : '') + '" id="fHero">Legends</button><button class="btn' + (s.vehicles ? ' on' : '') + '" id="fVeh">Vehicles</button>';
    $('fHero').onclick = function () { s.heroes = !s.heroes; UI.renderPlay(); }; $('fVeh').onclick = function () { s.vehicles = !s.vehicles; UI.renderPlay(); };
    var n = Math.round(mode.players * s.teamScale);
    $('playSummary').textContent = mode.name + ' · ' + map.name + ' · ' + D.eraById[era].name + ' · ' + n + ' v ' + n;
    function opt(id, list, key) {
      $(id).innerHTML = list.map(function (o) { return '<button class="btn' + (s[key] === o[1] ? ' on' : '') + '" data-k="' + key + '" data-v="' + o[1] + '">' + o[0] + '</button>'; }).join('');
      $(id).querySelectorAll('button').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-v'); s[key] = isNaN(+v) ? v : +v; UI.renderPlay(); }; });
    }
  };
  UI.launch = function () {
    var s = UI.setup;
    UI.start({ modeId: s.modeId, mapId: s.mapId, era: s.era || D.mapById[s.mapId].era, team: s.team, teamScale: s.teamScale, difficulty: s.difficulty, bpCost: s.bpCost, heroes: s.heroes, vehicles: s.vehicles });
  };
  UI.start = function (cfg) {
    UI.lastCfg = cfg;
    $('loading').classList.add('on');
    SF.Audio.init(); SF.Audio.resume();
    setTimeout(function () {
      try { SF.Game.startMatch(cfg); }
      catch (e) { console.error(e); UI.flash('Failed to start battle: ' + e.message); $('loading').classList.remove('on'); UI.show('title'); return; }
      $('loading').classList.remove('on');
    }, 40);
  };

  // ------------------------------------------------------------------ deploy
  UI.depTab = 'Troopers';
  UI.depSel = { classId: 'assault' };
  UI.showDeploy = function (on) {
    screens.forEach(function (s) { if (s !== 'hud') $(s).classList.remove('on'); });
    $('hud').classList.add('on');
    $('deploy').classList.toggle('on', on);
    $('touch').classList.toggle('on', !!G.touch && !on);
    if (on) {
      var space = G.mode && G.mode.space;
      if (space && UI.depTab !== 'Starfighters' && UI.depTab !== 'Legend Ships') UI.depTab = 'Starfighters';
      if (!space && (UI.depTab === 'Starfighters' && !G.match.vehiclesOk || UI.depTab === 'Legend Ships')) UI.depTab = 'Troopers';
      if (G.mode.def.heroesOnly && !space) UI.depTab = 'Legends';
      UI.depSpawn = null;
      UI.renderDeploy();
    }
  };
  UI.renderDeploy = function () {
    var p = G.player, team = p.team, F = G.teams[team], fac = D.factions[F.faction];
    var m = G.mode, def = m.def, era = G.match.era;
    var space = m.space;
    $('depTitle').textContent = 'Deploy · ' + F.name;
    $('depSub').textContent = def.name + ' on ' + G.world.map.name + (G.respawnT > 0 ? ' · respawn in ' + Math.ceil(G.respawnT) + 's' : '');
    $('depBp').textContent = fmt(p.bp);
    var tabs;
    if (space) tabs = def.heroesOnly ? ['Legend Ships'] : ['Starfighters'].concat(def.heroes ? ['Legend Ships'] : []);
    else if (def.heroesOnly) tabs = ['Legends'];
    else {
      tabs = ['Troopers'];
      if (fac.era !== '*') tabs.push('Reinforcements');
      if (def.heroes !== false && G.match.heroes !== false && fac.era !== '*' && def.type !== 'legendhunt') tabs.push('Legends');
      if (def.type === 'legendhunt' && team === 1) tabs = ['Legends'];
      if (G.match.vehiclesOk && def.vehicles) tabs.push('Vehicles');
    }
    if (tabs.indexOf(UI.depTab) < 0) UI.depTab = tabs[0];
    $('depTabs').innerHTML = tabs.map(function (t) { return '<button class="btn small' + (UI.depTab === t ? ' on' : '') + '" data-dt="' + t + '">' + t + '</button>'; }).join('');
    document.querySelectorAll('[data-dt]').forEach(function (b) { b.onclick = function () { UI.depTab = b.getAttribute('data-dt'); UI.depSel = null; UI.renderDeploy(); }; });
    var k = G.bpK;
    var items = [];
    var fcn = D.factionClassNames[F.faction] || {};
    if (UI.depTab === 'Troopers') D.classes.forEach(function (c) { items.push({ sel: { classId: c.id }, ic: c.id === 'assault' ? '⌖' : c.id === 'heavy' ? '▣' : c.id === 'specialist' ? '◎' : c.id === 'officer' ? '★' : c.id === 'engineer' ? '⚙' : '✦', n: fcn[c.id] || c.name, d: c.desc, cost: 0 }); });
    if (UI.depTab === 'Reinforcements') D.reinforcements.forEach(function (r) { items.push({ sel: { classId: r.id }, ic: '⇑', n: fcn[r.id] || r.name, d: r.desc, cost: r.cost * k }); });
    if (UI.depTab === 'Legends') D.heroes.filter(function (h) { return h.era === era && h.side === F.side; }).forEach(function (h) {
      var owned = P.heroOwned(h.id), busy = G.units.some(function (o) { return o !== p && o.alive && o.heroId === h.id && o.team === team; });
      items.push({ sel: { heroId: h.id }, ic: typeof h.weapon === 'object' ? '⚔' : '✪', n: h.name, d: h.title + ' — ' + h.desc, cost: def.heroesOnly ? 0 : h.cost * k, locked: !owned ? 'Unlock in the Shop' : busy ? 'In use' : (!def.heroesOnly && !m.allowHero(team)) ? 'Legend limit reached' : null, color: typeof h.weapon === 'object' ? hex(h.weapon.blade) : null });
    });
    if (UI.depTab === 'Vehicles') D.vehicles.filter(function (v) { return v.era === era && v.side === F.side && !v.hero && v.id !== 'atat'; }).forEach(function (v) {
      items.push({ sel: { vehicle: v.id }, ic: v.type === 'fighter' ? '✈' : v.type === 'walker' ? '⩚' : '▬', n: v.name, d: v.desc || v.type, cost: v.cost * k, locked: !m.allowVehicle(team) ? 'Vehicle limit reached' : null });
    });
    if (UI.depTab === 'Starfighters') D.vehicles.filter(function (v) { return v.type === 'fighter' && v.era === era && v.side === F.side && !v.hero && !v.low; }).forEach(function (v) { items.push({ sel: { vehicle: v.id }, ic: '✈', n: v.name, d: v.desc, cost: 0 }); });
    if (UI.depTab === 'Legend Ships') D.vehicles.filter(function (v) { return v.type === 'fighter' && v.era === era && v.side === F.side && v.hero; }).forEach(function (v) { items.push({ sel: { vehicle: v.id }, ic: '✪', n: v.name, d: v.desc, cost: def.heroesOnly ? 0 : 5000 * k }); });
    if (!UI.depSel || !items.some(function (it) { return JSON.stringify(it.sel) === JSON.stringify(UI.depSel); })) UI.depSel = items.length ? items.filter(function (i) { return !i.locked; })[0] ? items.filter(function (i) { return !i.locked; })[0].sel : items[0].sel : null;
    $('deployList').innerHTML = items.map(function (it, i) {
      var sel = JSON.stringify(it.sel) === JSON.stringify(UI.depSel);
      return '<button class="dcard' + (sel ? ' sel' : '') + (it.locked ? ' locked' : '') + '" data-di="' + i + '"><div class="ic"' + (it.color ? ' style="color:' + it.color + ';text-shadow:0 0 8px ' + it.color + '"' : '') + '>' + it.ic + '</div><div class="tx"><div class="n">' + esc(it.n) + '</div><div class="d">' + esc(it.locked || it.d) + '</div></div><div class="c">' + (it.cost ? fmt(it.cost) + ' BP' : '') + '</div></button>';
    }).join('');
    document.querySelectorAll('[data-di]').forEach(function (b) { b.onclick = function () { var it = items[+b.getAttribute('data-di')]; UI.depSel = it.sel; SF.Audio.ui(); UI.renderDeploy(); }; });
    UI.depItems = items;
    // weapon picker for trooper classes
    var wp = $('weaponPick');
    if (UI.depSel && UI.depSel.classId && D.classById[UI.depSel.classId]) {
      var lo = P.classLoadout(F.faction, UI.depSel.classId);
      var list = (D.loadouts[F.faction] || {})[UI.depSel.classId] || [];
      wp.innerHTML = '<div class="sect">Primary weapon</div><div class="opt">' + list.map(function (wid) { var w = D.weapons[wid], own = P.weaponOwned(wid); return '<button class="btn small' + (lo.weapon === wid ? ' on' : '') + '" data-w="' + wid + '"' + (own ? '' : ' disabled title="Buy in the shop"') + '>' + esc(w.name) + (own ? '' : ' 🔒') + '</button>'; }).join('') + '</div><div class="dim" style="font-size:12px;margin-top:6px">Star cards: ' + (lo.cards.length ? lo.cards.map(function (c) { return D.cardById[c].name; }).join(', ') : 'none — equip in Collection') + '</div>';
      wp.querySelectorAll('[data-w]').forEach(function (b) { b.onclick = function () { lo.weapon = b.getAttribute('data-w'); P.setClassLoadout(F.faction, UI.depSel.classId, lo); UI.renderDeploy(); }; });
    } else wp.innerHTML = '';
    // spawn points
    var sps = m.spawnPoints(team);
    if (!UI.depSpawn || !sps.some(function (s) { return s.id === UI.depSpawn; })) UI.depSpawn = sps[sps.length > 1 ? 1 : 0].id;
    $('spawnList').innerHTML = sps.map(function (s) { return '<button class="item' + (s.id === UI.depSpawn ? ' sel' : '') + '" data-sp="' + s.id + '"><div class="n">' + esc(s.label) + '</div></button>'; }).join('');
    document.querySelectorAll('[data-sp]').forEach(function (b) { b.onclick = function () { UI.depSpawn = b.getAttribute('data-sp'); UI.renderDeploy(); }; });
    var cur = items.filter(function (it) { return JSON.stringify(it.sel) === JSON.stringify(UI.depSel); })[0];
    var wait = p.respawnT != null && G.respawnT > 0;
    $('deployBtn').disabled = !cur || !!cur.locked || (cur.cost > p.bp) || wait || (m.noRespawn && G.spectating);
    $('deployBtn').textContent = wait ? 'Deploy in ' + Math.ceil(G.respawnT) + 's' : cur && cur.cost > p.bp ? 'Need ' + fmt(cur.cost) + ' BP' : 'Deploy';
    $('deployInfo').innerHTML = cur ? esc(cur.d) : '';
    UI.drawMap($('deployMap'), null, sps);
  };
  UI.doDeploy = function () {
    if (!UI.depSel) return;
    var err = SF.Game.deployPlayer(UI.depSel, UI.depSpawn);
    if (err) { UI.toast(err); return; }
    SF.Audio.ui();
    UI.showDeploy(false);
  };

  // ------------------------------------------------------------------ HUD
  var hudT = 0, fpsAcc = 0, fpsN = 0, feedKey = '', annT = 0, toastT = 0, popT = 0, pops = [];
  UI.hud = function (dt) {
    var p = G.player;
    if (!p || !G.mode) return;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { $('fps').textContent = P.p.settings.showFps ? Math.round(fpsN / fpsAcc) + ' fps' : ''; fpsAcc = 0; fpsN = 0; }
    // fast elements
    G.hitMarker = Math.max(0, (G.hitMarker || 0) - dt);
    $('hitm').style.opacity = G.hitMarker > 0 ? 1 : 0;
    G.dmgFlash = Math.max(0, (G.dmgFlash || 0) - dt * 1.5);
    var low = p.alive ? Math.max(0, 1 - p.hp / p.maxHp * 2) : 0;
    $('vign').style.boxShadow = 'inset 0 0 ' + (120 + G.dmgFlash * 80) + 'px rgba(200,0,0,' + Math.min(0.85, G.dmgFlash * 0.8 + low * 0.5) + ')';
    $('xhair').className = G.aimTarget ? 'enemy' : '';
    var showX = p.alive && G.state === 'play' && !(p.melee && !p.vehicle);
    $('xhair').style.display = showX ? '' : 'none';
    $('scope').style.display = p.alive && !p.vehicle && p.input.aim && p.weapon && p.weapon.kind === 'sniper' && G.firstPerson ? 'block' : 'none';
    annT -= dt; if (annT <= 0) $('announce').textContent = '';
    toastT -= dt; $('toast').style.opacity = toastT > 0 ? 1 : 0;
    popT -= dt; if (popT <= 0 && pops.length) { pops.shift(); popT = 1.2; $('bpPops').innerHTML = pops.slice(-3).map(esc).join('<br>'); } if (!pops.length) $('bpPops').innerHTML = '';
    UI.drawMinimap();
    UI.drawDmgDir();
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.1;
    if (G.state === 'deploy') UI.renderDeployTick();
    var h = G.mode.hud();
    $('s0').textContent = h.score ? fmt(h.score[0]) : ''; $('s1').textContent = h.score ? fmt(h.score[1]) : '';
    $('s0').style.borderColor = G.teams[0].css; $('s1').style.borderColor = G.teams[1].css;
    $('timer').textContent = fmtT(h.time); $('timer').style.display = h.time == null ? 'none' : '';
    $('scoreLbl').textContent = (h.scoreLabel || '') + (G.mode.def ? '  ·  ' + G.mode.def.name : '');
    $('objs').innerHTML = (h.zones || []).map(function (z, i) {
      var c = z.owner < 0 ? '#ddd' : G.teams[z.owner].css;
      return '<div class="obj' + (z.contested ? ' cont' : '') + '" style="border-color:' + c + ';color:' + c + '">' + esc((z.name || '?').charAt(0)) + '</div>';
    }).join('');
    // capture bar
    var z = G.playerInZone;
    if (z && p.alive) { $('capbar').style.display = 'block'; $('capName').textContent = z.name + (z.contested ? ' — CONTESTED' : ''); var pr = Math.abs(z.progress); $('capFill').style.width = (pr * 100) + '%'; $('capFill').style.background = z.progress < 0 ? G.teams[0].css : z.progress > 0 ? G.teams[1].css : '#ddd'; }
    else $('capbar').style.display = 'none';
    // player panel
    if (p.alive) {
      var v = p.vehicle;
      $('unitName').textContent = (v ? v.def.name : p.isHero ? p.spec.name + ' · ' + p.spec.title : (D.factionClassNames[p.faction] || {})[p.classId] || p.spec.name) + (p.carrying ? ' · CARRYING ' + p.carrying.label.toUpperCase() : '');
      var hp = v ? v.hp : p.hp, mhp = v ? v.maxHp : p.maxHp;
      $('hpTxt').textContent = Math.ceil(hp);
      $('hpBar').firstChild.style.width = (hp / mhp * 100) + '%';
      $('hpBar').firstChild.style.background = hp / mhp < 0.3 ? '#ff5a4a' : '';
      var heat = 0, over = false, wn = '';
      if (v) { var W = v.weapons[0]; heat = W.heat; over = W.overT > 0; wn = v.weapons.map(function (x, i) { return (i ? '<span class="dim"> · ' + (v.kind === 'fighter' ? 'Q' : 'RMB') + ' </span>' : '') + x.w.name + (i && x.overT > 0 ? ' (reloading)' : ''); }).join(''); }
      else if (p.weapon && p.weapon.kind !== 'melee') { heat = p.heat; over = p.overT > 0; wn = esc(p.weapon.name) + (p.buffs.overcharge > 0 ? ' <span class="acc">OVERCHARGED</span>' : ''); }
      else { heat = 100 - p.blockEnergy; wn = 'Lumablade' + (p.blade ? ' <span class="dim">· hold RMB to deflect</span>' : ''); }
      $('wName').innerHTML = wn;
      $('heatBar').firstChild.style.width = heat + '%';
      $('heatBar').classList.toggle('over', over);
      if (v) {
        $('abil').innerHTML = '';
        $('vehHud').style.display = 'block';
        $('vehHud').innerHTML = v.kind === 'fighter' ? '<span class="dim">Throttle</span> ' + Math.round(v.throttle * 100) + '% · <span class="dim">Speed</span> ' + Math.round(v.vel.length() * 3.6) + ' km/h' + (v.boostT > 0 ? ' · <span class="acc">BOOST</span>' : ' · E boost') : (v.kind === 'walker' ? 'A/D turn · ' : '') + 'G to dismount';
      } else {
        $('vehHud').style.display = 'none';
        $('abil').innerHTML = p.abilities.map(function (a, i) {
          var ad = D.abilities[a.id] || {};
          var cdp = a.t > 0 ? a.t / a.cd * 100 : 0;
          return '<div class="ab"><span class="k">' + ['Q', 'E', 'F'][i] + '</span>' + (ad.icon || '•') + '<div class="cd" style="height:' + cdp + '%"></div>' + (a.t > 0 ? '<div class="cdt">' + Math.ceil(a.t) + '</div>' : '') + '<div class="nm">' + esc(ad.name || a.id) + '</div></div>';
        }).join('');
      }
    } else {
      $('unitName').textContent = G.spectating ? 'Spectating' : 'Down';
      $('hpTxt').textContent = 0; $('hpBar').firstChild.style.width = '0%'; $('abil').innerHTML = ''; $('wName').textContent = ''; $('vehHud').style.display = 'none';
    }
    $('bp').textContent = 'Battle points: ' + fmt(p.bp) + ' · K/D ' + p.kills + '/' + p.deaths;
    $('prompt').innerHTML = p.alive && p.carrying ? 'X to drop' : '';
    // kill feed
    var key = G.feed.map(function (f) { return f.t; }).join(',');
    if (key !== feedKey) {
      feedKey = key;
      $('feed').innerHTML = G.feed.filter(function (f) { return G.time - f.t < 8; }).map(function (f) {
        return '<div><span style="color:' + (f.kt >= 0 ? G.teams[f.kt].css : '#bbb') + '">' + esc(f.k) + '</span> <span class="dim">' + (f.veh ? '⊗' : f.how === 'melee' ? '⚔' : f.how === 'explosive' ? '✸' : '▸') + '</span> <span style="color:' + G.teams[f.vt].css + '">' + (f.hero ? '★ ' : '') + esc(f.v) + '</span></div><br>';
      }).join('');
    } else if (G.feed.length && G.time - G.feed[G.feed.length - 1].t > 8) { feedKey = ''; }
    if ($('board').style.display === 'block') UI.renderBoard();
  };
  UI.renderDeployTick = function () {
    var p = G.player;
    $('depBp').textContent = fmt(p.bp);
    var wait = p.respawnT != null && G.respawnT > 0;
    var cur = (UI.depItems || []).filter(function (it) { return JSON.stringify(it.sel) === JSON.stringify(UI.depSel); })[0];
    $('deployBtn').disabled = !cur || !!cur.locked || cur.cost > p.bp || wait || !!G.spectating && !!G.mode.noRespawn;
    $('deployBtn').textContent = wait ? 'Deploy in ' + Math.ceil(G.respawnT) + 's' : cur && cur.cost > p.bp ? 'Need ' + fmt(cur.cost) + ' BP' : (G.mode.noRespawn && G.spectating ? 'Wait for next round' : 'Deploy');
    UI.drawMap($('deployMap'), null, G.mode.spawnPoints(p.team));
  };
  UI.renderBoard = function () {
    var cols = [0, 1].map(function (t) {
      var list = G.units.filter(function (u) { return u.team === t; }).sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      return '<div><div style="font-weight:900;color:' + G.teams[t].css + ';margin-bottom:4px">' + esc(G.teams[t].name) + '</div><table><tr class="dim"><th>Name</th><th>K</th><th>D</th><th>Score</th></tr>' + list.map(function (u) {
        return '<tr class="' + (u.isPlayer ? 'me' : '') + (u.alive ? '' : ' dead') + '"><td>' + (u.isHero ? '★ ' : '') + esc(u.name) + '</td><td>' + u.kills + '</td><td>' + u.deaths + '</td><td>' + fmt(u.score || 0) + '</td></tr>';
      }).join('') + '</table></div>';
    });
    $('board').innerHTML = '<div class="cols">' + cols.join('') + '</div>';
  };
  UI.announce = function (msg, team) { $('announce').textContent = msg; $('announce').style.color = team >= 0 && G.teams ? G.teams[team].css : '#fff'; annT = 4; };
  UI.toast = function (msg) { $('toast').textContent = msg; toastT = 2.5; };
  UI.bpPopup = function (msg) { pops.push(msg); if (pops.length > 6) pops.shift(); $('bpPops').innerHTML = pops.slice(-3).map(esc).join('<br>'); popT = 1.2; };

  // minimap: player-centred, rotating
  UI.drawMinimap = function () {
    var c = $('minimap'), x = c.getContext('2d'), p = G.player, w = G.world;
    var W = c.width, R = W / 2;
    x.clearRect(0, 0, W, W);
    if (!p) return;
    var center = p.alive ? (p.vehicle ? p.vehicle.pos : p.pos) : (G.camPos || p.pos);
    var scale = R / (w.space ? 500 : p.vehicle && p.vehicle.kind === 'fighter' ? 220 : 70);
    var yaw = p.yaw;
    var cs = Math.cos(yaw), sn = Math.sin(yaw);
    function tr(px, pz) { var dx = px - center.x, dz = pz - center.z; return [R + (dx * cs - dz * sn) * scale, R + (dx * sn + dz * cs) * scale]; }
    x.save(); x.beginPath(); x.arc(R, R, R - 1, 0, Math.PI * 2); x.clip();
    // bounds
    if (!w.space) { x.strokeStyle = 'rgba(255,255,255,.25)'; x.beginPath(); var a = tr(-w.half, -w.half), b = tr(w.half, -w.half), cc = tr(w.half, w.half), d = tr(-w.half, w.half); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(cc[0], cc[1]); x.lineTo(d[0], d[1]); x.closePath(); x.stroke(); }
    var h = G.mode.hud();
    (h.zones || []).forEach(function (z) {
      var q = tr(z.x, z.z); x.fillStyle = z.owner < 0 ? '#ddd' : G.teams[z.owner].css; x.globalAlpha = 0.85;
      x.beginPath(); x.arc(q[0], q[1], 7, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; x.fillStyle = '#000'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText((z.name || '?').charAt(0), q[0], q[1] + 3);
    });
    (h.markers || []).forEach(function (m) { var q = tr(m.x, m.z); x.fillStyle = '#ffd84a'; x.fillRect(q[0] - 4, q[1] - 4, 8, 8); });
    if (h.marker) { var q2 = tr(h.marker.x, h.marker.z); x.fillStyle = '#ffd84a'; x.fillRect(q2[0] - 5, q2[1] - 5, 10, 10); }
    var scout = p.has && p.has('scout');
    G.units.forEach(function (u) {
      if (!u.alive || u === p) return;
      var ally = u.team === p.team;
      var seen = ally || u.buffs.revealed > 0 || (u.fireT > -1 && !u.cloaked() && u.pos.distanceTo(center) < 60) || (scout && u.pos.distanceTo(center) < 30);
      if (!seen) return;
      var q = tr(u.pos.x, u.pos.z);
      x.fillStyle = ally ? G.teams[p.team].css : '#ff4a3a';
      x.beginPath(); x.arc(q[0], q[1], u.isHero ? 4.5 : 3, 0, Math.PI * 2); x.fill();
      if (u.isTarget) { x.strokeStyle = '#ffd84a'; x.stroke(); }
    });
    G.vehicles.forEach(function (v) { if (!v.alive) return; var q = tr(v.pos.x, v.pos.z); x.fillStyle = v.team === p.team ? G.teams[p.team].css : '#ff4a3a'; x.fillRect(q[0] - 4, q[1] - 4, 8, 8); });
    x.restore();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(R, R - 7); x.lineTo(R - 5, R + 5); x.lineTo(R + 5, R + 5); x.closePath(); x.fill();
  };
  UI.drawMap = function (c, unused, sps) {
    var x = c.getContext('2d'), w = G.world, W = c.width;
    x.fillStyle = '#0a0e16'; x.fillRect(0, 0, W, W);
    if (!w) return;
    var S = w.space ? 1400 : w.map.size;
    function tr(px, pz) { return [W / 2 + px / S * W * 0.92, W / 2 + pz / S * W * 0.92]; }
    if (!w.space && w.nav) {
      var nv = w.nav, step = Math.max(1, Math.floor(nv.n / 80));
      for (var j = 0; j < nv.n; j += step) for (var i = 0; i < nv.n; i += step) {
        var id = j * nv.n + i;
        x.fillStyle = nv.ok[id] ? 'rgba(120,140,160,' + (0.15 + Math.min(0.25, Math.max(0, nv.h[id] / 60))) + ')' : 'rgba(40,46,56,.9)';
        var q = tr(-w.half + i * nv.cs, -w.half + j * nv.cs); x.fillRect(q[0], q[1], W * 0.92 / nv.n * step + 0.5, W * 0.92 / nv.n * step + 0.5);
      }
    }
    var h = G.mode.hud();
    (h.zones || []).forEach(function (z) { var q = tr(z.x, z.z); x.fillStyle = z.owner < 0 ? '#ddd' : G.teams[z.owner].css; x.beginPath(); x.arc(q[0], q[1], 8, 0, Math.PI * 2); x.fill(); x.fillStyle = '#000'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.fillText((z.name || '?').charAt(0), q[0], q[1] + 4); });
    (sps || []).forEach(function (s) { var q = tr(s.x, s.z); x.strokeStyle = s.id === UI.depSpawn ? '#ffc94a' : '#fff'; x.lineWidth = s.id === UI.depSpawn ? 3 : 1.5; x.beginPath(); x.arc(q[0], q[1], 11, 0, Math.PI * 2); x.stroke(); });
    G.units.forEach(function (u) { if (!u.alive || u.team !== G.player.team) return; var q = tr(u.pos.x, u.pos.z); x.fillStyle = G.teams[u.team].css; x.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); });
    c.onclick = function (e) {
      var r = c.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * W, best = null, bd = 30;
      (sps || []).forEach(function (s) { var q = tr(s.x, s.z), d = Math.hypot(q[0] - mx, q[1] - my); if (d < bd) { bd = d; best = s; } });
      if (best) { UI.depSpawn = best.id; UI.renderDeploy(); }
    };
  };
  UI.drawDmgDir = function () {
    var c = $('dmgDir'), x = c.getContext('2d');
    x.clearRect(0, 0, 200, 200);
    var p = G.player;
    if (!p || !p.alive || !G.dmgFrom || G.dmgFlash < 0.05) return;
    var a = Math.atan2(G.dmgFrom.x - p.pos.x, G.dmgFrom.z - p.pos.z) - Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw));
    x.save(); x.translate(100, 100); x.rotate(-a);
    x.strokeStyle = 'rgba(255,60,40,' + Math.min(1, G.dmgFlash * 1.5) + ')'; x.lineWidth = 6;
    x.beginPath(); x.arc(0, 0, 80, -Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35); x.stroke(); x.restore();
  };

  // ------------------------------------------------------------------ pause & results
  UI.togglePause = function (force) {
    var on = force == null ? G.state !== 'paused' : force;
    if (G.state === 'deploy' && on) { $('pause').classList.add('on'); G.prevState = 'deploy'; G.state = 'paused'; return; }
    if (on && G.state === 'play') { G.prevState = 'play'; G.state = 'paused'; $('pause').classList.add('on'); $('pauseInfo').textContent = G.mode.def.name + ' · ' + G.world.map.name; if (document.exitPointerLock) { UI.suppressPause = true; document.exitPointerLock(); setTimeout(function () { UI.suppressPause = false; }, 100); } }
    else if (!on && G.state === 'paused') { $('pause').classList.remove('on'); G.state = G.prevState || 'play'; G.clock.getDelta(); if (G.state === 'play') SF.Game.lockPointer(); }
  };
  UI.showResults = function (s) {
    screens.forEach(function (x) { $(x).classList.remove('on'); });
    $('results').classList.add('on');
    $('resTitle').textContent = s.draw ? 'DRAW' : s.won ? 'VICTORY' : 'DEFEAT';
    $('resTitle').style.color = s.draw ? '#ddd' : s.won ? '#4cd97b' : '#ff5a4a';
    $('resReason').textContent = s.result.reason + ' — ' + s.mode.name + ' on ' + s.map.name;
    var r = s.rewards;
    $('resRewards').innerHTML = '<span class="coin">+' + fmt(r.credits) + ' credits</span><span>+' + fmt(r.xp) + ' XP</span>' + (r.levelUps ? '<span class="acc">Level up! LV ' + P.p.level + '</span>' : '') + (r.tierAfter > r.tierBefore ? '<span style="color:#bf6aff">Battle pass tier ' + r.tierAfter + '!</span>' : '<span class="dim">Pass tier ' + r.tierAfter + '</span>') + r.challenges.map(function (c) { return '<span class="good">✔ ' + esc(c.desc) + '</span>'; }).join('');
    $('resBoard').innerHTML = [0, 1].map(function (t) {
      return '<div><div style="font-weight:900;color:' + s.teams[t].css + '">' + esc(s.teams[t].name) + '</div><table>' + s.board.filter(function (b) { return b.team === t; }).map(function (b) { return '<tr class="' + (b.me ? 'me' : '') + '"><td>' + esc(b.name) + '</td><td>' + b.kills + '/' + b.deaths + '</td><td style="text-align:right">' + fmt(b.score) + '</td></tr>'; }).join('') + '</table></div>';
    }).join('');
    if (s.campaign) { P.campaignResolve(s.campaign.planet, s.won, s.campaign.attacking); $('resAgain').textContent = 'Back to campaign'; }
    else $('resAgain').textContent = 'Play again';
  };

  // ------------------------------------------------------------------ battle pass
  UI.passSeason = null;
  UI.renderPass = function () {
    var sid = UI.passSeason || P.p.activeSeason;
    UI.passSeason = sid;
    document.querySelectorAll('.shardVal').forEach(function (e) { e.textContent = fmt(P.p.shards); });
    $('seasonTabs').innerHTML = D.seasons.map(function (s) { return '<button class="btn small' + (s.id === sid ? ' on' : '') + '" data-ss="' + s.id + '">' + esc(s.name.split(':')[0]) + (s.id === P.p.activeSeason ? ' ●' : '') + '</button>'; }).join('');
    document.querySelectorAll('[data-ss]').forEach(function (b) { b.onclick = function () { UI.passSeason = b.getAttribute('data-ss'); UI.renderPass(); }; });
    var S = D.seasonById[sid], st = P.p.seasons[sid], tier = P.seasonTier(sid);
    var into = st.xp - tier * P.TIER_XP;
    $('passHead').innerHTML = '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div style="font-size:22px;font-weight:900;color:' + S.color + '">' + esc(S.name) + '</div><div class="dim">Tier ' + tier + ' / ' + S.tiers + ' · ' + (tier < S.tiers ? fmt(into) + ' / ' + fmt(P.TIER_XP) + ' XP to next tier' : 'Complete') + '</div><div class="bar" style="height:8px;max-width:420px"><i style="width:' + (tier < S.tiers ? into / P.TIER_XP * 100 : 100) + '%;background:' + S.color + '"></i></div></div>' +
      (sid !== P.p.activeSeason ? '<button class="btn" id="passActive">Set as active pass</button>' : '<span class="tag" style="background:' + S.color + ';color:#111">Active — earning XP</span>') +
      (st.premium ? '<span class="tag" style="background:#bf6aff">Premium track unlocked</span>' : '<button class="btn" id="passPrem">Unlock premium · ◆ ' + P.PREMIUM_COST + '</button>') + '<button class="btn primary" id="passClaim">Claim all</button></div>';
    var a = $('passActive'); if (a) a.onclick = function () { P.p.activeSeason = sid; P.save(); UI.renderPass(); };
    var pr = $('passPrem'); if (pr) pr.onclick = function () { var e = P.buyPremium(sid); UI.flash(e || 'Premium unlocked!'); UI.renderPass(); };
    $('passClaim').onclick = function () { var n = P.claimAll(sid); UI.flash(n ? 'Claimed ' + n + ' rewards' : 'Nothing to claim'); UI.renderPass(); };
    var rw = P.seasonRewards(sid);
    $('passTrack').innerHTML = rw.map(function (r) {
      var reached = tier >= r.tier;
      function cell(track, item) {
        var claimed = st.claimed[track + r.tier];
        var can = reached && !claimed && (track === 'free' || st.premium);
        return '<div class="rw' + (track === 'prem' ? ' prem' : '') + '"><div>' + esc(item.label) + '</div>' + (claimed ? '<span class="good">✔ Claimed</span>' : can ? '<button class="btn small primary" data-cl="' + track + ':' + r.tier + '">Claim</button>' : '<span class="dim">' + (track === 'prem' && !st.premium ? 'Premium' : 'Locked') + '</span>') + '</div>';
      }
      return '<div class="tier' + (reached ? ' reached' : '') + '"><div class="num">' + r.tier + '</div>' + cell('free', r.free) + cell('prem', r.prem) + '</div>';
    }).join('');
    document.querySelectorAll('[data-cl]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-cl').split(':'); var e = P.claim(sid, +x[1], x[0]); UI.flash(e || 'Reward claimed'); UI.renderPass(); }; });
  };
  UI.flash = function (msg) {
    var d = document.createElement('div');
    d.textContent = msg; d.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#111722;border:1px solid #ffc94a;padding:10px 18px;border-radius:5px;z-index:50;font-weight:700';
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2200);
  };

  // ------------------------------------------------------------------ shop
  UI.shopTab = 'Featured';
  UI.renderShop = function () {
    document.querySelectorAll('.shardVal').forEach(function (e) { e.textContent = fmt(P.p.shards); });
    document.querySelectorAll('.credVal').forEach(function (e) { e.textContent = fmt(P.p.credits); });
    var tabs = ['Featured', 'Legends', 'Weapons', 'Star Cards', 'Trooper Looks', 'Legend Looks', 'Emotes'];
    $('shopTabs').innerHTML = tabs.map(function (t) { return '<button class="btn small' + (t === UI.shopTab ? ' on' : '') + '" data-st="' + t + '">' + t + '</button>'; }).join('');
    document.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { UI.shopTab = b.getAttribute('data-st'); UI.renderShop(); }; });
    var items = UI.shopTab === 'Featured' ? P.featured() : P.catalogue().filter(function (i) { return i.cat === UI.shopTab; });
    UI.shopItems = items;
    $('shopGrid').innerHTML = items.map(function (it, i) {
      return '<div class="card' + (it.owned ? ' owned' : '') + '">' + (it.sale ? '<span class="tag" style="position:absolute;right:8px;top:8px;background:#ff5a4a">-30%</span>' : '') + '<div class="t">' + esc(it.name) + '</div><div class="s">' + esc(it.sub) + '</div><div class="p">' + (it.owned ? '<span class="good">Owned</span>' : '<span class="' + (it.cur === 'shards' ? 'shard">◆ ' : 'coin">◈ ') + fmt(it.price) + '</span> <button class="btn small" data-buy="' + i + '" style="float:right">Buy</button>') + '</div></div>';
    }).join('');
    document.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function () { var e = P.buy(UI.shopItems[+b.getAttribute('data-buy')]); UI.flash(e || 'Purchased!'); SF.Audio.ui(); UI.renderShop(); }; });
  };

  // ------------------------------------------------------------------ collection
  UI.colTab = 'Troopers'; UI.colFaction = 'concord'; UI.colClass = 'assault';
  UI.renderCollection = function () {
    var tabs = ['Troopers', 'Legends', 'Emotes & Title'];
    $('colTabs').innerHTML = tabs.map(function (t) { return '<button class="btn small' + (t === UI.colTab ? ' on' : '') + '" data-ct="' + t + '">' + t + '</button>'; }).join('');
    document.querySelectorAll('[data-ct]').forEach(function (b) { b.onclick = function () { UI.colTab = b.getAttribute('data-ct'); UI.renderCollection(); }; });
    var body = $('colBody'), html = '';
    if (UI.colTab === 'Troopers') {
      var facs = ['concord', 'syndicate', 'alliance', 'dominion', 'rangers', 'remnant'];
      html += '<div class="opt">' + facs.map(function (f) { return '<button class="btn small' + (f === UI.colFaction ? ' on' : '') + '" data-cf="' + f + '">' + D.factions[f].name + '</button>'; }).join('') + '</div>';
      html += '<div class="opt" style="margin-top:8px">' + D.classes.map(function (c) { return '<button class="btn small' + (c.id === UI.colClass ? ' on' : '') + '" data-cc="' + c.id + '">' + ((D.factionClassNames[UI.colFaction] || {})[c.id] || c.name) + '</button>'; }).join('') + '</div>';
      var lo = P.classLoadout(UI.colFaction, UI.colClass);
      var list = D.loadouts[UI.colFaction][UI.colClass];
      html += '<div class="sect">Primary weapon</div><div class="grid">' + list.map(function (wid) { var w = D.weapons[wid], own = P.weaponOwned(wid); return '<button class="card' + (lo.weapon === wid ? ' sel' : '') + '" data-cw="' + wid + '"' + (own ? '' : ' disabled') + '><div class="t">' + esc(w.name) + (own ? '' : ' 🔒') + '</div><div class="s">' + w.kind + ' · ' + w.dmg + (w.pellets > 1 ? '×' + w.pellets : '') + ' dmg · ' + w.rpm + ' rpm · heat ' + w.heat + '/shot · range ' + w.range + ' m</div></button>'; }).join('') + '</div>';
      html += '<div class="sect">Star cards (pick up to 3)</div><div class="grid">' + D.starCards.map(function (c) { var own = P.cardOwned(c.id), on = lo.cards.indexOf(c.id) >= 0; return '<button class="card' + (on ? ' sel' : '') + '" data-cd="' + c.id + '"' + (own ? '' : ' disabled') + '><div class="t">' + esc(c.name) + (own ? '' : ' 🔒') + '</div><div class="s">' + esc(c.desc) + '</div></button>'; }).join('') + '</div>';
      html += '<div class="sect">Appearance (all ' + D.factions[UI.colFaction].short + ' troopers)</div><div class="opt">' + D.skinVariants.map(function (s) { var own = P.skinOwned('f:' + UI.colFaction + ':' + s.id); return '<button class="btn small' + (lo.skin === s.id ? ' on' : '') + '" data-sk="' + s.id + '"' + (own ? '' : ' disabled') + '>' + s.name + (own ? '' : ' 🔒') + '</button>'; }).join('') + '</div>';
      body.innerHTML = html;
      body.querySelectorAll('[data-cf]').forEach(function (b) { b.onclick = function () { UI.colFaction = b.getAttribute('data-cf'); UI.renderCollection(); }; });
      body.querySelectorAll('[data-cc]').forEach(function (b) { b.onclick = function () { UI.colClass = b.getAttribute('data-cc'); UI.renderCollection(); }; });
      body.querySelectorAll('[data-cw]').forEach(function (b) { b.onclick = function () { lo.weapon = b.getAttribute('data-cw'); P.setClassLoadout(UI.colFaction, UI.colClass, lo); UI.renderCollection(); }; });
      body.querySelectorAll('[data-cd]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-cd'), i = lo.cards.indexOf(id); if (i >= 0) lo.cards.splice(i, 1); else if (lo.cards.length < 3) lo.cards.push(id); else UI.flash('Three cards maximum'); P.setClassLoadout(UI.colFaction, UI.colClass, lo); UI.renderCollection(); }; });
      body.querySelectorAll('[data-sk]').forEach(function (b) { b.onclick = function () { var sk = b.getAttribute('data-sk'); D.classes.forEach(function (c) { var l = P.classLoadout(UI.colFaction, c.id); l.skin = sk; P.setClassLoadout(UI.colFaction, c.id, l); }); UI.renderCollection(); }; });
    } else if (UI.colTab === 'Legends') {
      html = '<div class="grid">' + D.heroes.map(function (h) {
        var own = P.heroOwned(h.id), sk = P.heroSkin(h.id);
        var skins = ['default', 'crimson', 'midnight', 'gold', 'veteran', 'shadow', 'chrome'].filter(function (s) { return P.skinOwned('h:' + h.id + ':' + s); });
        return '<div class="card' + (own ? '' : ' owned') + '"><div class="t">' + esc(h.name) + '</div><div class="s">' + esc(h.title) + ' · ' + D.eraById[h.era].name + ' · ' + (h.side ? 'Tyrant' : 'Champion') + '</div><div class="s">' + h.abilities.map(function (a) { return D.abilities[a].name; }).join(' · ') + '</div><div class="p">' + (own ? '<select data-hs="' + h.id + '">' + skins.map(function (s) { return '<option value="' + s + '"' + (s === sk ? ' selected' : '') + '>' + D.skinById[s].name + '</option>'; }).join('') + '</select>' : '<span class="dim">🔒 ◈ ' + fmt(h.price) + ' in the Shop</span>') + '</div></div>';
      }).join('') + '</div>';
      body.innerHTML = html;
      body.querySelectorAll('[data-hs]').forEach(function (s) { s.onchange = function () { P.setHeroSkin(s.getAttribute('data-hs'), s.value); }; });
    } else {
      var eq = P.p.equipped.emotes;
      html = '<div class="sect">Emote slots (B, 5, 6, 7 in battle)</div><div class="opt">' + [0, 1, 2, 3].map(function (i) { return '<select data-es="' + i + '"><option value="">— empty —</option>' + D.emotes.filter(function (e) { return P.emoteOwned(e.id); }).map(function (e) { return '<option value="' + e.id + '"' + (eq[i] === e.id ? ' selected' : '') + '>' + e.name + '</option>'; }).join('') + '</select>'; }).join('') + '</div>';
      html += '<div class="sect">Title</div><select id="titleSel">' + P.p.titles.map(function (t) { return '<option' + (t === P.p.equipped.title ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
      body.innerHTML = html;
      body.querySelectorAll('[data-es]').forEach(function (s) { s.onchange = function () { eq[+s.getAttribute('data-es')] = s.value || null; P.save(); }; });
      $('titleSel').onchange = function () { P.p.equipped.title = this.value; P.save(); };
    }
  };

  // ------------------------------------------------------------------ career / settings / controls
  UI.renderCareer = function () {
    var p = P.p, s = p.stats;
    var nx = P.xpFor(p.level + 1), cur = P.xpFor(p.level);
    $('careerBody').innerHTML = '<div class="panel" style="padding:16px;max-width:760px"><div style="font-size:22px;font-weight:900">Level ' + p.level + ' <span class="dim" style="font-size:14px">' + esc(p.equipped.title) + '</span></div><div class="bar" style="max-width:420px"><i style="width:' + ((p.xp - cur) / (nx - cur) * 100) + '%"></i></div><div class="dim" style="font-size:12px">' + fmt(p.xp - cur) + ' / ' + fmt(nx - cur) + ' XP</div>' +
      '<div class="grid" style="margin-top:14px">' + [['Matches', s.matches], ['Wins', s.wins], ['Win rate', s.matches ? Math.round(s.wins / s.matches * 100) + '%' : '-'], ['Eliminations', s.kills], ['Deaths', s.deaths], ['K/D', s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills], ['Legend kills', s.heroKills], ['Vehicles destroyed', s.vehicleKills], ['Objectives captured', s.captures], ['Best streak', s.bestStreak], ['Space battles', s.spaceMatches], ['Time in battle', Math.round(s.playtime / 60) + ' min']].map(function (x) { return '<div class="card"><div class="s">' + x[0] + '</div><div class="t" style="font-size:22px">' + x[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="sect">Collection</div><div class="dim">' + Object.keys(p.unlocked.heroes).length + ' / ' + D.heroes.length + ' legends · ' + Object.keys(p.unlocked.cards).length + ' / ' + D.starCards.length + ' star cards · ' + Object.keys(p.unlocked.skins).length + ' appearances · ' + Object.keys(p.unlocked.emotes).length + ' / ' + D.emotes.length + ' emotes</div>' +
      '<div style="margin-top:18px"><button class="btn" id="resetProf">Reset profile</button></div></div>';
    $('resetProf').onclick = function () { if (this.dataset.armed) { P.reset(); UI.renderCareer(); UI.flash('Profile reset'); } else { this.dataset.armed = 1; this.textContent = 'Click again to erase all progress'; } };
  };
  UI.renderSettings = function () {
    var s = P.p.settings;
    function row(label, ctrl) { return '<div class="setrow"><span>' + label + '</span>' + ctrl + '</div>'; }
    $('setBody').innerHTML = row('Graphics quality', '<select id="sq"><option value="0">Low</option><option value="1">Medium</option><option value="2">High</option></select>') +
      row('Shadows', '<input type="checkbox" id="ssh"' + (s.shadows ? ' checked' : '') + '>') +
      row('Field of view <b id="sfovv">' + s.fov + '</b>', '<input type="range" id="sfov" min="60" max="100" value="' + s.fov + '">') +
      row('Mouse sensitivity <b id="ssensv">' + s.sens + '</b>', '<input type="range" id="ssens" min="0.2" max="3" step="0.1" value="' + s.sens + '">') +
      row('Invert Y', '<input type="checkbox" id="sinv"' + (s.invertY ? ' checked' : '') + '>') +
      row('Third-person camera (V toggles in battle)', '<input type="checkbox" id="stp"' + (s.thirdPerson ? ' checked' : '') + '>') +
      row('Volume', '<input type="range" id="svol" min="0" max="1" step="0.05" value="' + s.volume + '">') +
      row('Show FPS', '<input type="checkbox" id="sfps"' + (s.showFps ? ' checked' : '') + '>');
    $('sq').value = s.quality;
    function bind(id, key, f) { $(id).oninput = $(id).onchange = function () { s[key] = f(this); if ($(id + 'v')) $(id + 'v').textContent = s[key]; P.save(); SF.Game.applySettings(); }; }
    bind('sq', 'quality', function (e) { return +e.value; }); bind('ssh', 'shadows', function (e) { return e.checked; }); bind('sfov', 'fov', function (e) { return +e.value; });
    bind('ssens', 'sens', function (e) { return +e.value; }); bind('sinv', 'invertY', function (e) { return e.checked; }); bind('stp', 'thirdPerson', function (e) { return e.checked; });
    bind('svol', 'volume', function (e) { return +e.value; }); bind('sfps', 'showFps', function (e) { return e.checked; });
  };
  UI.renderControls = function () {
    var k = function (x) { return '<span class="kbd">' + x + '</span>'; };
    $('ctrlBody').innerHTML = '<div class="panel" style="padding:16px">' +
      k('W') + k('A') + k('S') + k('D') + ' move · ' + k('Mouse') + ' look · ' + k('LMB') + ' fire / swing · ' + k('RMB') + ' aim, block with blades, secondary weapon in tanks<br>' +
      k('Shift') + ' sprint · ' + k('Space') + ' jump / hold for jetpack · ' + k('Ctrl') + ' crouch (hold) · ' + k('C') + ' crouch (toggle)<br>' +
      k('Q') + k('E') + k('F') + ' (or ' + k('1') + k('2') + k('3') + ') abilities · ' + k('R') + ' vent heat · ' + k('V') + ' first/third person<br>' +
      k('B') + k('5') + k('6') + k('7') + ' emotes · ' + k('X') + ' drop flag/cargo · ' + k('G') + ' leave ground vehicle · ' + k('Tab') + ' scoreboard · ' + k('Esc') + ' pause<br>' +
      '<b>Starfighters:</b> the ship turns toward where you look · ' + k('W') + '/' + k('S') + ' throttle · ' + k('A') + '/' + k('D') + ' roll · ' + k('LMB') + ' lasers · ' + k('Q') + ' missiles (lock on by keeping the target near your crosshair) · ' + k('E') + ' boost<br>' +
      '<b>Blasters overheat:</b> watch the heat bar; press ' + k('R') + ' to vent early. <b>Legends</b> cost battle points, earned by eliminations and objectives.<br>' +
      '<b>Touch screens:</b> left stick moves, drag the right half to look, buttons fire, aim, jump and use abilities.</div>';
  };

  // ------------------------------------------------------------------ campaign
  UI.renderCampaign = function () {
    var c = P.p.campaign;
    var body = $('campBody');
    if (!c) { body.innerHTML = '<div class="panel" style="padding:18px;max-width:560px"><div class="t" style="font-weight:800;font-size:18px">No campaign in progress</div><p class="dim">Pick an era and a side, then take the sector one planet at a time. Each attack or defence is a full Conquest battle on that planet.</p><button class="btn primary" id="campStart">Start a campaign</button></div>'; $('campStart').onclick = UI.newCampaignDialog; return; }
    var me = c.side;
    var era = D.eraById[c.era], myF = D.factions[era.sides[me]], enF = D.factions[era.sides[1 - me]];
    var html = '<div id="campMap"><svg id="campSvg" viewBox="0 0 100 100" preserveAspectRatio="none">' + c.planets.map(function (p, i) { return p.links.map(function (j) { var q = c.planets[j]; return j > i ? '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '" stroke="rgba(255,255,255,.15)" stroke-width=".4"/>' : ''; }).join(''); }).join('') + '</svg>' +
      c.planets.map(function (p, i) {
        var col = p.owner === me ? myF.ui : enF.ui;
        var attackable = p.owner !== me && p.links.some(function (j) { return c.planets[j].owner === me; });
        return '<div class="planet' + (c.threat === i ? ' threat' : '') + '" data-pl="' + i + '" style="left:' + p.x + '%;top:' + p.y + '%;border-color:' + col + ';background:radial-gradient(circle at 35% 35%,' + col + '55,#0a0e16);opacity:' + (attackable || p.owner === me ? 1 : 0.55) + '"><div class="nm">' + esc(D.planetById[p.id].name) + '</div></div>';
      }).join('') + '</div>';
    var mine = c.planets.filter(function (p) { return p.owner === me; }).length;
    html += '<div class="panel" style="padding:16px;flex:1;min-width:280px;max-width:460px"><div style="font-weight:900;font-size:18px">' + esc(era.name) + '</div><div class="dim">Playing as <span style="color:' + myF.ui + '">' + esc(myF.name) + '</span> · Turn ' + c.turn + ' · ' + mine + '/' + c.planets.length + ' planets</div>' +
      (c.over ? '<div style="font-size:22px;font-weight:900;margin-top:10px" class="' + (c.over === 'won' ? 'good' : 'bad') + '">Campaign ' + c.over + '!</div>' : c.threat != null ? '<div style="margin-top:10px" class="bad"><b>Enemy attack on ' + esc(D.planetById[c.planets[c.threat].id].name) + '!</b></div><button class="btn primary" id="campDefend" style="margin-top:6px">Defend</button>' : '<div style="margin-top:10px">Select a highlighted enemy planet next to your territory to attack it.</div>') +
      '<div class="sect">War log</div><div style="font-size:13px;line-height:1.6">' + c.log.map(esc).join('<br>') + '</div></div>';
    body.innerHTML = html;
    if ($('campDefend')) $('campDefend').onclick = function () { UI.campBattle(c.threat, false); };
    body.querySelectorAll('[data-pl]').forEach(function (b) {
      b.onclick = function () {
        if (c.over || c.threat != null) return;
        var i = +b.getAttribute('data-pl'), p = c.planets[i];
        if (p.owner === me || !p.links.some(function (j) { return c.planets[j].owner === me; })) return;
        UI.campBattle(i, true);
      };
    });
  };
  UI.campBattle = function (i, attacking) {
    var c = P.p.campaign, p = c.planets[i];
    var maps = D.maps.filter(function (m) { return m.planet === p.id && !m.space; });
    var space = Math.random() < 0.25 && D.maps.some(function (m) { return m.space && m.planet === p.id; });
    var map = space ? D.maps.filter(function (m) { return m.space && m.planet === p.id; })[0] : maps[(Math.random() * maps.length) | 0];
    if (c.threat === i) c.threat = null;
    UI.start({ modeId: space ? 'spaceassault' : 'conquest', mapId: map.id, era: c.era, team: c.side, teamScale: 1, difficulty: UI.setup.difficulty, bpCost: 'normal', heroes: true, vehicles: true, campaign: { planet: i, attacking: attacking } });
  };
  UI.newCampaignDialog = function () {
    var body = $('campBody');
    body.innerHTML = '<div class="panel" style="padding:18px;max-width:640px"><div class="sect" style="margin-top:0">Era</div><div class="opt">' + D.eras.map(function (e, i) { return '<button class="btn' + (i === 0 ? ' on' : '') + '" data-ce="' + e.id + '">' + e.name + '</button>'; }).join('') + '</div><div class="sect">Side</div><div class="opt" id="cSide"></div><button class="btn primary" id="cGo" style="margin-top:14px">Begin</button></div>';
    var era = 'cw', side = 0;
    function sides() { var e = D.eraById[era]; $('cSide').innerHTML = e.sides.map(function (f, i) { return '<button class="btn' + (i === side ? ' on' : '') + '" data-cs="' + i + '">' + D.factions[f].name + '</button>'; }).join(''); $('cSide').querySelectorAll('[data-cs]').forEach(function (b) { b.onclick = function () { side = +b.getAttribute('data-cs'); sides(); }; }); }
    sides();
    body.querySelectorAll('[data-ce]').forEach(function (b) { b.onclick = function () { era = b.getAttribute('data-ce'); body.querySelectorAll('[data-ce]').forEach(function (x) { x.classList.toggle('on', x === b); }); sides(); }; });
    $('cGo').onclick = function () { P.newCampaign(era, side); UI.renderCampaign(); };
  };

  // ------------------------------------------------------------------ touch controls
  UI.initTouch = function () {
    var stick = $('tStick'), knob = stick.firstChild, look = $('tLook');
    var sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
    stick.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; sid = t.identifier; var r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === sid) { var dx = Math.max(-50, Math.min(50, t.clientX - sx)), dy = Math.max(-50, Math.min(50, t.clientY - sy)); knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; G.touchMove = { x: dx / 50, y: -dy / 50 }; }
        if (t.identifier === lid) { G.mouse.dx += (t.clientX - lx) * 2.2; G.mouse.dy += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY; }
      }
    }, { passive: true });
    window.addEventListener('touchend', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === sid) { sid = null; knob.style.transform = ''; G.touchMove = null; }
        if (t.identifier === lid) lid = null;
      }
    });
    look.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
    document.querySelectorAll('#touch .tb').forEach(function (b) {
      var k = b.getAttribute('data-t');
      b.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (k === 'fire') G.touchFire = true; else if (k === 'aim') G.touchAim = !G.touchAim; else if (k === 'jump') G.touchJump = true;
        else if (k === 'pause') UI.togglePause(); else if (G.player && G.player.alive) G.player.input.ab[+k.slice(2)] = true;
      }, { passive: false });
      b.addEventListener('touchend', function () { if (k === 'fire') G.touchFire = false; if (k === 'jump') G.touchJump = false; });
    });
  };
})();
