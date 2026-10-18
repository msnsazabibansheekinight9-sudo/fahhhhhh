/* Rock & Stone — screens, HUD and the terrain scanner. All DOM, no rendering:
   the game pushes a 'hud' event once a frame and this file draws the numbers. */
(function (RS) {
  'use strict';

  var G = RS.Game;
  var $ = function (id) { return document.getElementById(id); };
  var profile = RS.loadProfile();

  var UI = RS.UI = {
    screen: 'menu', selected: null, hazard: 3, length: 2,
    classId: 'scout', board: [], mapReady: false, inMission: false
  };

  function show(name) {
    ['menu', 'missions', 'classes', 'settings', 'controls', 'pause', 'summary'].forEach(function (s) {
      $(s).classList.toggle('on', s === name);
    });
    UI.screen = name;
    $('hud').classList.toggle('on', name === null);
  }
  function hideAll() {
    ['menu', 'missions', 'classes', 'settings', 'controls', 'pause', 'summary'].forEach(function (s) {
      $(s).classList.remove('on');
    });
    UI.screen = null;
  }

  // ------------------------------------------------------------ cave names
  var NAME_A = ['Bitter', 'Hollow', 'Grim', 'Rusted', 'Frozen', 'Scorched', 'Weeping', 'Broken', 'Sunken',
    'Howling', 'Silent', 'Crooked', 'Deep', 'Black', 'Shattered', 'Forgotten', 'Gilded', 'Salted', 'Dread', 'Quiet'];
  var NAME_B = ['Pocket', 'Gorge', 'Shaft', 'Hollow', 'Gallery', 'Vault', 'Throat', 'Basin', 'Spine', 'Drift',
    'Seam', 'Chasm', 'Den', 'Reach', 'Burrow', 'Sump', 'Crown', 'Maw', 'Fissure', 'Cradle'];

  function caveName(rng) { return rng.pick(NAME_A) + ' ' + rng.pick(NAME_B); }

  // ------------------------------------------------------------ board
  function rollBoard(seed) {
    var rng = RS.Rng(seed);
    UI.board = [];
    // Draw from a bag rather than rolling each slot, so the board always
    // shows every mission type instead of five Eliminations in a row.
    var typeBag = [], biomeBag = [];
    for (var t = 0; t < RS.MISSION_TYPES.length; t++) typeBag.push(RS.MISSION_TYPES[t], RS.MISSION_TYPES[t]);
    for (var bq = 0; bq < RS.BIOMES.length; bq++) biomeBag.push(RS.BIOMES[bq]);
    rng.shuffle(typeBag); rng.shuffle(biomeBag);
    for (var i = 0; i < 8; i++) {
      var type = typeBag[i];
      var biome = biomeBag[i % biomeBag.length];
      UI.board.push({
        name: caveName(rng), type: type, biome: biome,
        seed: (rng() * 1e9) | 0,
        complexity: rng.range(0.6, 1.6)
      });
    }
    UI.selected = null;
    renderBoard();
  }

  function renderBoard() {
    var grid = $('missionGrid');
    grid.innerHTML = '';
    UI.board.forEach(function (m, i) {
      var b = document.createElement('button');
      b.className = 'mcard' + (UI.selected === i ? ' sel' : '');
      var goals = m.type.primary(UI.length);
      var goalTxt = goals.morkite ? goals.morkite + ' morkite'
        : goals.eggs ? goals.eggs + ' eggs'
          : goals.aquarqs ? goals.aquarqs + ' aquarqs'
            : goals.dreads ? goals.dreads + ' dreadnoughts'
              : 'repair + uplink';
      b.innerHTML =
        '<div class="bar" style="background:' + hazColour(UI.hazard) + '"></div>' +
        '<div class="ico">' + m.type.icon + '</div>' +
        '<div class="inner">' +
        '<div class="mt">' + m.name + '</div>' +
        '<div class="mbio">' + m.biome.name + '</div>' +
        '<div class="mb">' + m.type.blurb + '</div>' +
        '<div class="meta"><span>' + m.type.name + '</span><span>' + goalTxt + '</span></div>' +
        '</div>';
      b.onclick = function () { UI.selected = i; renderBoard(); $('btnLaunch').disabled = false; };
      grid.appendChild(b);
    });
    $('boardSub').textContent = UI.board.length + ' contracts available · hazard ' + UI.hazard + ' · length ' + UI.length;
  }

  function hazColour(h) {
    return ['#7ae08a', '#b8d84a', '#ffb13c', '#e0742a', '#e05a3a'][h - 1] || '#ffb13c';
  }

  function buildSegs() {
    var hs = $('hazSeg'); hs.innerHTML = '';
    for (var h = 1; h <= 5; h++) {
      (function (hh) {
        var b = document.createElement('button');
        b.textContent = hh;
        b.className = hh === UI.hazard ? 'on' : '';
        b.onclick = function () { UI.hazard = hh; buildSegs(); renderBoard(); };
        hs.appendChild(b);
      })(h);
    }
    var ls = $('lenSeg'); ls.innerHTML = '';
    ['I', 'II', 'III'].forEach(function (lbl, idx) {
      var b = document.createElement('button');
      b.textContent = lbl;
      b.className = (idx + 1) === UI.length ? 'on' : '';
      b.onclick = function () { UI.length = idx + 1; buildSegs(); renderBoard(); };
      ls.appendChild(b);
    });
  }

  // ------------------------------------------------------------ classes
  var SLOTNAMES = { primary: 'Primary', secondary: 'Secondary', throwable: 'Throwable', pickaxe: 'Melee', traversal: 'Traversal', support: 'Support' };
  function renderClasses() {
    var grid = $('classGrid');
    grid.innerHTML = '';
    RS.CLASS_IDS.forEach(function (id) {
      var L = RS.LOADOUTS[id];
      var col = '#' + L.colour.toString(16).padStart(6, '0');
      var b = document.createElement('button');
      b.className = 'ccard' + (UI.classId === id ? ' sel' : '');
      var gear = L.weapons.map(function (w) {
        return '<div><span class="slot">' + (SLOTNAMES[w.slot] || w.slot) + '</span><span>' + w.name + '</span></div>';
      }).join('');
      b.innerHTML = '<div class="bar" style="background:' + col + '"></div>' +
        '<div class="inner"><h3 style="color:' + col + '">' + L.name + '</h3>' +
        '<div class="blurb">' + L.blurb + '</div>' +
        '<div class="gearlist">' + gear + '</div></div>';
      b.onclick = function () {
        UI.classId = id;
        profile.lastClass = id;
        RS.saveProfile(profile);
        renderClasses(); refreshRig();
      };
      grid.appendChild(b);
    });
  }

  // ------------------------------------------------------------ perks
  function perkChoice() {
    if (!profile.perks) profile.perks = { active: 'ironwill', passive: ['tough', 'vampire'] };
    if (!profile.perks.passive) profile.perks.passive = [];
    return profile.perks;
  }

  function renderPerks() {
    var ch = perkChoice();
    var ag = $('activePerks'); ag.innerHTML = '';
    RS.ACTIVE_PERKS.forEach(function (pk) {
      var b = document.createElement('button');
      b.className = 'perk' + (ch.active === pk.id ? ' on' : '');
      b.innerHTML = '<div class="pn">' + pk.name + '</div><div class="pd">' + pk.desc + '</div>';
      b.onclick = function () { ch.active = pk.id; RS.saveProfile(profile); renderPerks(); };
      ag.appendChild(b);
    });
    var pg = $('passivePerks'); pg.innerHTML = '';
    RS.PASSIVE_PERKS.forEach(function (pk) {
      var on = ch.passive.indexOf(pk.id) >= 0;
      var b = document.createElement('button');
      b.className = 'perk' + (on ? ' on' : '');
      b.innerHTML = '<div class="pn">' + pk.name + '</div><div class="pd">' + pk.desc + '</div>';
      b.onclick = function () {
        var i = ch.passive.indexOf(pk.id);
        if (i >= 0) ch.passive.splice(i, 1);
        else {
          ch.passive.push(pk.id);
          if (ch.passive.length > 2) ch.passive.shift();   // keep the two most recent
        }
        RS.saveProfile(profile);
        renderPerks();
      };
      pg.appendChild(b);
    });
  }

  function refreshRig() {
    var r = RS.rankFor(profile.xp);
    $('sRank').textContent = r.level;
    $('sRankName').textContent = r.title;
    $('sCredits').textContent = RS.fmtNum(profile.credits);
    $('sMissions').textContent = profile.missions;
    $('sClass').textContent = RS.LOADOUTS[UI.classId].name;
  }

  // ------------------------------------------------------------ settings
  function bindSetting(id, valId, key, fmt, onChange) {
    var el = $(id), v = $(valId);
    el.value = profile.settings[key];
    if (v) v.textContent = fmt(profile.settings[key]);
    el.addEventListener('input', function () {
      var val = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
      profile.settings[key] = val;
      if (v) v.textContent = fmt(val);
      RS.saveProfile(profile);
      if (onChange) onChange(val);
    });
  }

  function initSettings() {
    bindSetting('setSens', 'vSens', 'sens', function (x) { return x.toFixed(2); });
    bindSetting('setFov', 'vFov', 'fov', function (x) { return x.toFixed(0); }, function (v) {
      if (G.camera) { G.camera.fov = v; G.camera.updateProjectionMatrix(); }
    });
    bindSetting('setShake', 'vShake', 'shake', function (x) { return x.toFixed(2); });
    bindSetting('setSfx', 'vSfx', 'sfx', function (x) { return x.toFixed(2); }, function () {
      if (G.audio) G.audio.setVolumes(profile.settings.sfx, profile.settings.music);
    });
    bindSetting('setMus', 'vMus', 'music', function (x) { return x.toFixed(2); }, function () {
      if (G.audio) G.audio.setVolumes(profile.settings.sfx, profile.settings.music);
    });
    var inv = $('setInv');
    inv.checked = !!profile.settings.invertY;
    inv.addEventListener('change', function () {
      profile.settings.invertY = inv.checked; RS.saveProfile(profile);
    });
    $('btnWipe').onclick = function () {
      try { localStorage.removeItem('rockandstone.profile.v1'); } catch (e) { }
      profile = RS.loadProfile();
      G.profile = profile;
      refreshRig();
      toast('Progress erased');
    };
  }

  // ------------------------------------------------------------ loading
  var TIPS = [
    'Nitra pays for resupplies. Eighty units gets you a pod.',
    'Mined minerals do not count until they are in the M.U.L.E. Press C to call her.',
    'Hold Q for the laser pointer, then press X and Bosco will mine what you marked.',
    'The pickaxe digs anything that is not marked as hard rock. The drop pod is the only way out.',
    'A praetorian is armoured at the front. Walk around it.',
    'Exploders go off when they die. Kill them from range, or from behind cover.',
    'Flares are free light. Throw them before you walk into a room, not after.',
    'The Engineer can shoot a platform onto any wall. So can gravity, eventually.',
    'Falling more than about fifteen metres per second hurts. Platforms and ziplines do not.',
    'Rock and Stone.'
  ];

  function showLoading(on) { $('loading').classList.toggle('on', !!on); }

  // ------------------------------------------------------------ launch
  function launch() {
    if (UI.selected === null) return;
    var m = UI.board[UI.selected];
    hideAll();
    showLoading(true);
    $('loadTip').textContent = TIPS[(Math.random() * TIPS.length) | 0];
    $('loadBar').style.width = '0%';
    $('loadMsg').textContent = 'surveying';
    UI.mapReady = false;
    G.profile = profile;
    G.audio.resume();

    var len = UI.length;
    var def = {
      biome: m.biome.id, seed: m.seed, type: m.type.id,
      hazard: UI.hazard, length: len, name: m.name,
      dwarfClass: UI.classId,
      rooms: 7 + len * 2,
      complexity: m.complexity,
      sizeX: 176, sizeY: 80, sizeZ: 176,
      ore: {
        nitra: 300 + len * 90,
        morkite: m.type.id === 'mining' ? Math.round((100 + len * 75) * 2.1) : 120,
        gold: 120 + len * 40,
        crystal: 30 + len * 10
      }
    };
    G.camera.fov = profile.settings.fov;
    G.camera.updateProjectionMatrix();

    G.loadMission(def, function (p, label) {
      $('loadBar').style.width = Math.round(p * 100) + '%';
      if (label) $('loadMsg').textContent = label.toLowerCase();
    }, function () {
      showLoading(false);
      $('hud').classList.add('on');
      UI.inMission = true;
      buildMap();
      G.start();
      G.paused = false;
      setTimeout(function () { G.requestLock(); }, 60);
    });
  }

  // ------------------------------------------------------------ HUD
  var lastToast = 0;
  function toast(msg) {
    var box = $('toasts');
    var d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    box.appendChild(d);
    setTimeout(function () {
      d.style.transition = 'opacity .4s'; d.style.opacity = '0';
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 420);
    }, 3200);
    while (box.children.length > 4) box.removeChild(box.firstChild);
  }
  RS.bus.on('toast', toast);

  RS.bus.on('radio', function (msg, who) {
    var box = $('radio');
    box.innerHTML = '<div class="rline"><span class="who">' + who + '</span>' + msg + '</div>';
    clearTimeout(box._t);
    box._t = setTimeout(function () { box.innerHTML = ''; }, 6500);
  });

  RS.bus.on('shout', function (line) {
    var el = $('shout');
    el.textContent = line;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 1500);
  });

  RS.bus.on('hud-flash', function (a) { $('dmg').style.opacity = Math.min(0.95, a); });

  RS.bus.on('swarm-start', function () {
    var el = $('alert');
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 2600);
  });

  RS.bus.on('player-down', function () { $('downed').style.display = 'flex'; });
  RS.bus.on('player-revived', function () { $('downed').style.display = 'none'; });
  RS.bus.on('player-dead', function () { $('downed').style.display = 'none'; });

  RS.bus.on('weapon-switch', function () { /* HUD refresh happens next frame */ });

  var slotLabels = ['1', '2', '3', '4', '5', '6'];
  function buildSlots(w) {
    var box = $('slots');
    if (box.children.length !== w.list.length) {
      box.innerHTML = '';
      for (var i = 0; i < w.list.length; i++) {
        var d = document.createElement('div');
        d.textContent = slotLabels[i] || (i + 1);
        box.appendChild(d);
      }
    }
    for (var k = 0; k < box.children.length; k++) box.children[k].classList.toggle('on', k === w.idx);
  }

  // Writing twenty-odd DOM nodes every frame is wasted work; 20 Hz is past
  // the point anyone can read a changing number anyway.
  var hudAcc = 0, lastTxt = {};
  function setText(el, v) {
    if (lastTxt[el.id] === v) return;
    lastTxt[el.id] = v;
    el.textContent = v;
  }

  RS.bus.on('hud', function (g) {
    hudAcc += g.dt;
    if (hudAcc < 0.05) return;
    hudAcc = 0;
    var p = g.player;
    var hp = RS.clamp01(p.hp / p.maxHp);
    $('hpFill').style.transform = 'scaleX(' + hp + ')';
    setText($('hpTxt'), String(Math.max(0, Math.ceil(p.hp))));
    $('shFill').style.transform = 'scaleX(' + RS.clamp01(p.shield / p.maxShield) + ')';
    setText($('flareN'), String(p.flares));
    setText($('lifeN'), String(p.lives));

    if (g.weapons) {
      var w = g.weapons.cur();
      setText($('wName'), w.name);
      var am = $('wAmmo');
      setText(am, g.weapons.ammoString());
      var low = (w.magMax && w.mag / w.magMax < 0.26) || (w.chargeMax !== undefined && w.charges === 0) ||
        (w.fuelMax !== undefined && w.fuel < w.fuelMax * 0.2);
      am.classList.toggle('low', !!low);
      var heat = $('heatWrap');
      if (w.heatRate) { heat.hidden = false; $('heatFill').style.width = (w.heat * 100) + '%'; }
      else heat.hidden = true;
      buildSlots(g.weapons);
    }

    var r = p.resources;
    setText($('rNitra'), String(Math.floor(r.nitra)));
    setText($('rMorkite'), String(Math.floor(r.morkite)));
    setText($('rGold'), String(Math.floor(r.gold)));
    setText($('rCrystal'), String(Math.floor(r.crystal)));
    if (g.units && g.units.mule) {
      var d = g.units.mule.deposited;
      setText($('rBank'), String(Math.floor((d.nitra || 0) + (d.morkite || 0) + (d.gold || 0) + (d.crystal || 0))));
    }

    if (g.mission) {
      $('objType').textContent = g.mission.type.name + (g.def.name ? ' · ' + g.def.name : '');
      setText($('objText'), g.mission.objectiveText());
      $('objBar').style.width = (RS.clamp01(g.mission.objectiveProgress()) * 100) + '%';
      setText($('objSecond'), g.mission.secondaryDone
        ? 'Secondary complete'
        : 'Secondary: ' + Math.floor(g.mission.secondaryProgress) + ' / ' + g.mission.secondaryGoal + ' jewels banked');
      var ex = $('extract');
      if (g.mission.state === 'extracting') {
        ex.style.display = 'block';
        var exT = ex.querySelector('.t'), exV = RS.fmtTime(g.mission.extractLimit - g.mission.extractTimer);
        if (exT.textContent !== exV) exT.textContent = exV;
      } else ex.style.display = 'none';
    }

    var lbl = g.interactLabel && g.interactLabel();
    var pr = $('prompt');
    if (lbl && !p.downed) { pr.style.display = 'block'; setText($('promptTxt'), lbl); }
    else pr.style.display = 'none';

    if (p.downed) $('revFill').style.width = (p.reviveProgress * 100) + '%';

    var bs = $('boscoState');
    if (g.units && g.units.bosco) {
      var b = g.units.bosco;
      setText(bs, 'Bosco: ' + (b.state === 'revive' ? 'reviving you' : (b.state === 'mine' ? 'mining' : 'ready')));
    }

    // boss bar: shown whenever a dreadnought is alive
    var bossEl = $('boss');
    var boss = null;
    if (g.enemies) {
      for (var bi = 0; bi < g.enemies.list.length; bi++) {
        var be = g.enemies.list[bi];
        if (be.alive && be.def.boss) { boss = be; break; }
      }
    }
    if (boss) {
      bossEl.style.display = 'block';
      setText(bossEl.querySelector('.bn'), boss.def.name);
      $('bossFill').style.transform = 'scaleX(' + RS.clamp01(boss.hp / boss.maxHp) + ')';
      var pl = $('bossPlates');
      if (pl.children.length !== (boss.def.plates || 0)) {
        pl.innerHTML = '';
        for (var pi = 0; pi < (boss.def.plates || 0); pi++) pl.appendChild(document.createElement('span'));
      }
      for (var pj = 0; pj < pl.children.length; pj++) {
        pl.children[pj].classList.toggle('on', pj < boss.plates);
      }
    } else bossEl.style.display = 'none';

    var pk = $('perkState');
    if (g.perks && g.perks.active) {
      setText(pk, g.perks.active.name + (g.perks.cd > 0 ? ' ' + Math.ceil(g.perks.cd) + 's' : ' [Z]'));
      pk.style.color = g.perks.cd > 0 ? 'var(--muted)' : 'var(--amber)';
    } else setText(pk, '');

    $('cold').style.opacity = p.cold ? p.cold * 0.8 : 0;

    $('fps').textContent = g.stats.fps + ' fps · ' + (g.enemies ? g.enemies.count() : 0) + ' hostiles' +
      '\n' + g.renderer.info.render.calls + ' draws';
  });

  // ------------------------------------------------------------ scanner
  var mapImg = null, mapSize = 352;
  function buildMap() {
    var t = G.terrain;
    if (!t) return;
    var cv = $('mapCv');
    var ctx = cv.getContext('2d');
    mapSize = cv.width;
    var img = ctx.createImageData(mapSize, mapSize);
    var d = img.data;
    var sx = t.nx / mapSize, sz = t.nz / mapSize;
    for (var py = 0; py < mapSize; py++) {
      for (var px = 0; px < mapSize; px++) {
        var wx = Math.floor(px * sx), wz = Math.floor(py * sz);
        // find how much open air is in this column and where its floor sits
        var air = 0, lowest = -1;
        for (var y = 2; y < t.ny; y += 2) {
          if (t.d[wx + y * t.strideY + wz * t.strideZ] <= 0) {
            air++;
            if (lowest < 0) lowest = y;
          }
        }
        var i = (py * mapSize + px) * 4;
        if (air === 0) { d[i] = 8; d[i + 1] = 10; d[i + 2] = 14; d[i + 3] = 255; continue; }
        var depth = RS.clamp01(lowest / t.ny);
        var v = 40 + Math.min(1, air / 12) * 120;
        d[i] = v * (0.55 + depth * 0.7);
        d[i + 1] = v * (0.52 + depth * 0.4);
        d[i + 2] = v * (0.62 + (1 - depth) * 0.5);
        d[i + 3] = 255;
      }
    }
    mapImg = img;
    UI.mapReady = true;
  }

  function drawMap() {
    if (!UI.mapReady || !G.terrain) return;
    var cv = $('mapCv'), ctx = cv.getContext('2d');
    ctx.putImageData(mapImg, 0, 0);
    var t = G.terrain;
    var sx = mapSize / t.nx, sz = mapSize / t.nz;
    function dot(x, z, col, r, ring) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x * sx, z * sz, r, 0, Math.PI * 2);
      ctx.fill();
      if (ring) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x * sx, z * sz, r + 4, 0, Math.PI * 2); ctx.stroke(); }
    }
    // ore seams still in the rock
    if (G.decor) {
      for (var gidx = 0; gidx < G.decor.oreGroups.length; gidx++) {
        var grp = G.decor.oreGroups[gidx];
        for (var k = 0; k < grp.items.length; k += 2) {
          var n = grp.items[k];
          if (!n.alive) continue;
          ctx.fillStyle = n.mat === RS.MAT.NITRA ? 'rgba(212,65,31,.75)'
            : n.mat === RS.MAT.MORKITE ? 'rgba(39,214,160,.75)'
              : n.mat === RS.MAT.GOLD ? 'rgba(255,196,54,.6)' : 'rgba(180,58,224,.7)';
          ctx.fillRect(n.x * sx - 1, n.z * sz - 1, 2.4, 2.4);
        }
      }
    }
    // objectives
    if (G.mission) {
      for (var i = 0; i < G.mission.items.length; i++) {
        var it = G.mission.items[i];
        if (it.taken || it.repaired) continue;
        dot(it.x, it.z, '#7ae08a', 4, true);
      }
      if (G.mission.mineheadPos) dot(G.mission.mineheadPos.x, G.mission.mineheadPos.z, '#46d2e6', 5, true);
      if (G.mission.uplinkPos) dot(G.mission.uplinkPos.x, G.mission.uplinkPos.z, '#46d2e6', 5, true);
    }
    // enemies
    if (G.enemies) {
      for (var e = 0; e < G.enemies.list.length; e++) {
        var en = G.enemies.list[e];
        if (!en.alive) continue;
        dot(en.pos.x, en.pos.z, en.def.boss ? '#ff3020' : 'rgba(224,90,58,.85)', en.def.boss ? 6 : 2.4);
      }
    }
    if (G.units) {
      if (G.units.mule && G.units.mule.active) dot(G.units.mule.pos.x, G.units.mule.pos.z, '#46d2e6', 4);
      if (G.units.escapePod) dot(G.units.escapePod.x, G.units.escapePod.z, '#b96ad8', 7, true);
      for (var ri = 0; ri < G.units.resupplies.length; ri++) {
        var rp = G.units.resupplies[ri];
        if (rp.uses > 0) dot(rp.x, rp.z, '#ffd27a', 4);
      }
    }
    // player + facing
    var p = G.player;
    dot(p.pos.x, p.pos.z, '#ffb13c', 5);
    ctx.strokeStyle = '#ffb13c'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.pos.x * sx, p.pos.z * sz);
    ctx.lineTo((p.pos.x - Math.sin(p.yaw) * 9) * sx, (p.pos.z - Math.cos(p.yaw) * 9) * sz);
    ctx.stroke();
  }

  // ------------------------------------------------------------ summary
  RS.bus.on('mission-end', function (s) {
    G.paused = true;
    document.exitPointerLock && document.exitPointerLock();
    UI.inMission = false;
    $('hud').classList.remove('on');
    $('downed').style.display = 'none';
    var v = $('sumVerdict');
    v.textContent = s.won ? 'Mission complete' : 'Mission failed';
    v.className = 'verdict ' + (s.won ? 'win' : 'lose');
    $('sumSub').textContent = s.type + ' · ' + s.biome + ' · hazard ' + s.hazard +
      ' · length ' + ['I', 'II', 'III'][s.length - 1] + (s.reason ? ' · ' + s.reason : '');
    var d = s.deposited || {};
    var cells = [
      ['Time', RS.fmtTime(s.time)],
      ['Glyphids killed', s.kills],
      ['Minerals mined', Math.floor(s.mined)],
      ['Morkite banked', Math.floor(d.morkite || 0)],
      ['Nitra banked', Math.floor(d.nitra || 0)],
      ['Gold banked', Math.floor(d.gold || 0)],
      ['Jewels banked', Math.floor(d.crystal || 0)],
      ['Secondary', s.secondary ? 'complete' : 'missed']
    ];
    $('sumGrid').innerHTML = cells.map(function (c) {
      return '<div class="stat"><div class="k">' + c[0] + '</div><div class="v" style="font-size:21px">' + c[1] + '</div></div>';
    }).join('');
    $('sumRows').innerHTML =
      '<div class="sumrow"><span>Experience earned</span><b>+' + RS.fmtNum(s.xp) + '</b></div>' +
      '<div class="sumrow"><span>Credits earned</span><b>+' + RS.fmtNum(s.credits) + '</b></div>';
    var r = RS.rankFor(profile.xp);
    var nextAt = Math.pow(r.level, 2) * 900;
    var prevAt = Math.pow(r.level - 1, 2) * 900;
    $('sumRank').textContent = r.level + ' · ' + r.title;
    $('sumXp').style.width = RS.clamp01((profile.xp - prevAt) / Math.max(1, nextAt - prevAt)) * 100 + '%';
    show('summary');
    refreshRig();
  });

  RS.bus.on('load-error', function (err) {
    showLoading(false);
    show('menu');
    toast('Mission generation failed — try another contract');
    console.error(err);
  });

  // ------------------------------------------------------------ keys
  RS.bus.on('key-escape', function () {
    if (!UI.inMission) return;
    if ($('scanner').classList.contains('on')) { $('scanner').classList.remove('on'); G.paused = false; G.requestLock(); return; }
    if (UI.screen === 'pause') { resume(); }
    else if (UI.screen === null) { pauseGame(); }
    else if (UI.screen === 'settings' && UI.pausedFromGame) { show('pause'); }
  });

  function pauseGame() {
    G.paused = true;
    document.exitPointerLock && document.exitPointerLock();
    $('hud').classList.remove('on');
    $('pauseSub').textContent = G.def ? (G.mission.type.name + ' · ' + G.biome.name + ' · ' + G.def.name) : '';
    UI.pausedFromGame = true;
    show('pause');
  }
  function resume() {
    hideAll();
    $('hud').classList.add('on');
    G.paused = false;
    UI.pausedFromGame = false;
    G.requestLock();
  }

  RS.bus.on('lock-change', function (locked) {
    if (!locked && UI.inMission && UI.screen === null && !$('scanner').classList.contains('on')) pauseGame();
  });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Tab' && UI.inMission) {
      e.preventDefault();
      var sc = $('scanner');
      if (sc.classList.contains('on')) {
        sc.classList.remove('on'); G.paused = false; G.requestLock();
      } else {
        drawMap();
        sc.classList.add('on');
        G.paused = true;
        document.exitPointerLock && document.exitPointerLock();
        G.audio && G.audio.play('scan', null, 0.6);
      }
    }
  });

  // refresh the map while it is open
  setInterval(function () { if ($('scanner').classList.contains('on')) drawMap(); }, 450);

  // ------------------------------------------------------------ buttons
  function wire() {
    $('btnDeploy').onclick = function () { show('missions'); G.audio.resume(); };
    $('btnClasses').onclick = function () { show('classes'); };
    $('btnSettings').onclick = function () { UI.pausedFromGame = false; show('settings'); };
    $('btnControls').onclick = function () { show('controls'); };
    $('btnBack1').onclick = function () { show('menu'); };
    $('btnBack2').onclick = function () { show('menu'); };
    $('btnBack3').onclick = function () { show(UI.pausedFromGame ? 'pause' : 'menu'); };
    $('btnBack4').onclick = function () { show('menu'); };
    $('btnReroll').onclick = function () { rollBoard((Math.random() * 1e9) | 0); };
    $('btnLaunch').onclick = launch;
    $('btnResume').onclick = resume;
    $('btnPauseSettings').onclick = function () { show('settings'); };
    $('btnAbandon').onclick = function () {
      if (G.mission) G.mission.fail('Abandoned');
      else { G.unloadMission(); show('menu'); }
    };
    $('btnAgain').onclick = function () {
      G.unloadMission();
      G.paused = true;
      UI.inMission = false;
      show('menu');
      rollBoard((Math.random() * 1e9) | 0);
    };
  }

  // ------------------------------------------------------------ boot
  function boot() {
    if (!window.THREE) {
      document.body.innerHTML = '<div style="padding:40px;font:16px sans-serif;color:#e9e3d6">' +
        'Three.js failed to load. Check your connection and reload.</div>';
      return;
    }
    G.init($('view'));
    G.profile = profile;
    if (profile.lastClass && RS.LOADOUTS[profile.lastClass]) UI.classId = profile.lastClass;
    initSettings();
    buildSegs();
    renderClasses();
    renderPerks();
    refreshRig();
    rollBoard((Math.random() * 1e9) | 0);
    wire();
    show('menu');
    // keep rendering a dark idle frame so the canvas is never a white flash
    G.start();
    G.paused = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.RS);
