// Game core: renderer, match lifecycle, team setup, spawning, battle points, input, cameras, aiming, HUD and minimap.
var SF = window.SF || (window.SF = {});

(function () {
  var V3 = THREE.Vector3;
  var G = SF.G = { state: 'menu', units: [], vehicles: [], proj: [], deploy: [], time: 0, frame: 0, keys: {}, mouse: { dx: 0, dy: 0, l: false, r: false } };
  var Game = SF.Game = {};
  var tmp = new V3(), tmp2 = new V3(), tmp3 = new V3();

  // ------------------------------------------------------------------ renderer & scene
  Game.init = function (canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputEncoding = THREE.LinearEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    G.renderer = r;
    G.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 6000);
    G.scene = new THREE.Scene();
    SF.FX.init(G.scene);
    Game.resize();
    window.addEventListener('resize', Game.resize);
    Game.bindInput(canvas);
    G.clock = new THREE.Clock();
    Game.menuScene();
    requestAnimationFrame(Game.loop);
  };
  Game.applySettings = function () {
    var s = SF.Prog.p.settings;
    G.settings = s;
    var pr = Math.min(window.devicePixelRatio || 1, 2) * (s.quality === 0 ? 0.6 : s.quality === 1 ? 0.85 : 1);
    G.renderer.setPixelRatio(pr);
    G.renderer.shadowMap.enabled = !!s.shadows;
    SF.Audio.setVolume(s.volume);
    Game.resize();
  };
  Game.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (!G.renderer) return;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
    SF.FX.setScale && SF.FX.setScale(h * (G.renderer.getPixelRatio ? G.renderer.getPixelRatio() : 1));
  };

  function clearScene() {
    var s = G.scene;
    while (s.children.length) s.remove(s.children[0]);
    SF.FX.init(s);
    G.units = []; G.vehicles = []; G.proj = []; G.deploy = []; G.capitals = null;
  }

  // ------------------------------------------------------------------ menu backdrop: planet, fleet, fighters
  Game.menuScene = function () {
    clearScene();
    G.state = 'menu';
    G.world = null;
    var s = G.scene;
    s.fog = null; s.environment = null;
    s.background = new THREE.Color(0x02030a);
    var stars = new THREE.BufferGeometry(), p = [];
    for (var i = 0; i < 3000; i++) { var v = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2500); p.push(v.x, v.y, v.z); }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    s.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
    var sun = new THREE.DirectionalLight(0xfff0dd, 2.2); sun.position.set(-300, 200, 200); s.add(sun);
    s.add(new THREE.AmbientLight(0x334466, 0.6));
    var planet = new THREE.Mesh(new THREE.SphereGeometry(400, 64, 32), new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 1 }));
    planet.position.set(250, -380, -600); s.add(planet);
    var atm = new THREE.Mesh(new THREE.SphereGeometry(412, 64, 32), new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.15, side: THREE.BackSide }));
    atm.position.copy(planet.position); s.add(atm);
    var cap = SF.VModels.capital('wedge', 1); cap.root.position.set(-80, 40, -520); cap.root.rotation.y = 0.9; cap.root.scale.setScalar(0.6); s.add(cap.root);
    var cap2 = SF.VModels.capital('coralCruiser', 0); cap2.root.position.set(320, 10, -900); cap2.root.rotation.y = -2.2; cap2.root.scale.setScalar(0.5); s.add(cap2.root);
    G.menuFighters = [];
    ['talon', 'eyeball', 'arrowhead', 'dagger', 'talon', 'eyeball', 'yoke'].forEach(function (k, i) {
      var o = SF.VModels[k]([0xe8e6df, 0x2f63c4, 0x222222]);
      o.root.scale.setScalar(0.6);
      s.add(o.root);
      G.menuFighters.push({ o: o, ph: i * 0.9, r: 60 + i * 12, y: (i % 3) * 14 - 10 });
    });
    G.menuPlanet = planet;
    G.camera.position.set(0, 10, 60); G.camera.lookAt(0, 0, -200);
    G.camera.fov = 60; G.camera.updateProjectionMatrix();
    SF.Audio.startMusic('menu');
  };
  function menuTick(dt) {
    if (!G.menuFighters) return;
    G.menuPlanet.rotation.y += dt * 0.02;
    G.menuFighters.forEach(function (f, i) {
      f.ph += dt * 0.35 * (i % 2 ? 1 : 1.2);
      var x = Math.cos(f.ph) * f.r, z = -200 + Math.sin(f.ph) * f.r * 0.6;
      var nx = Math.cos(f.ph + 0.05) * f.r, nz = -200 + Math.sin(f.ph + 0.05) * f.r * 0.6;
      f.o.root.position.set(x, f.y + Math.sin(f.ph * 2) * 4, z);
      f.o.root.lookAt(nx, f.y + Math.sin((f.ph + 0.05) * 2) * 4, nz);
      f.o.root.rotateY(Math.PI);
      f.o.root.rotateZ(-0.5);
      if (Math.random() < 0.02 && i % 2 === 0) {
        var tgt = G.menuFighters[(i + 1) % G.menuFighters.length].o.root.position;
        SF.FX.beam(f.o.root.position.clone(), f.o.root.position.clone().lerp(tgt, 0.5), i % 4 ? 0xff3322 : 0x5aff5a, 2, 0.08);
      }
    });
    G.camera.position.x = Math.sin(G.time * 0.05) * 10;
    G.camera.lookAt(0, 0, -200);
  }

  // ------------------------------------------------------------------ match
  Game.startMatch = function (cfg) {
    SF.Audio.init(); SF.Audio.resume();
    clearScene();
    Game.applySettings();
    var D = SF.D;
    var map = D.mapById[cfg.mapId], mode = D.modeById[cfg.modeId];
    G.match = cfg;
    cfg.era = cfg.era || map.era;
    cfg.vehiclesOk = cfg.vehicles !== false && !map.indoor;
    G.skill = { easy: 0.35, normal: 0.6, hard: 0.8, legendary: 0.95 }[cfg.difficulty || 'normal'] + (mode.hardBots ? 0.12 : 0);
    G.difficultyK = { taken: { easy: 0.6, normal: 0.85, hard: 1.0, legendary: 1.2 }[cfg.difficulty || 'normal'] };
    G.bpK = cfg.bpCost === 'free' ? 0 : cfg.bpCost === 'half' ? 0.5 : 1;
    G.time = 0; G.frame = 0;
    G.feed = []; G.announcements = [];
    G.firstPerson = !SF.Prog.p.settings.thirdPerson;
    G.matchStats = { captures: 0, heroKills: 0, vehicleKills: 0, bestStreak: 0, heroUsed: false };

    // world
    G.world = SF.World.build(map, G.scene);
    var bio = G.world.bio;
    G.scene.background = null;
    if (map.space) G.scene.fog = new THREE.FogExp2(0x02030a, 0.00012);
    else G.scene.fog = new THREE.FogExp2(bio.fog, bio.fd * (map.indoor ? 1.6 : 0.65));
    var hemi = new THREE.HemisphereLight(bio.sky ? bio.sky[0] : 0xffffff, bio.g ? bio.g[2] : 0x444444, (bio.amb || 0.5) * 0.55);
    G.scene.add(hemi);
    // image-based lighting from the biome sky so armour, metal and paint pick up real reflections
    try {
      var envScene = new THREE.Scene();
      var eg = new THREE.SphereGeometry(100, 32, 16), ec = [], ep = eg.attributes.position;
      var cTop = new THREE.Color(bio.sky ? bio.sky[0] : 0x222233), cHor = new THREE.Color(bio.sky ? bio.sky[1] : 0x444455), cGr = new THREE.Color(bio.g ? bio.g[1] : 0x333333), cc = new THREE.Color();
      for (var ei = 0; ei < ep.count; ei++) { var yy = ep.getY(ei) / 100; if (yy >= 0) cc.copy(cHor).lerp(cTop, Math.pow(yy, 0.5)); else cc.copy(cHor).lerp(cGr, Math.min(1, -yy * 3)).multiplyScalar(0.6); ec.push(cc.r, cc.g, cc.b); }
      eg.setAttribute('color', new THREE.Float32BufferAttribute(ec, 3));
      envScene.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      var sunBall = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(bio.sun || 0xffffff).multiplyScalar(6) }));
      sunBall.position.set(-50, 70, -40); envScene.add(sunBall);
      var pm = new THREE.PMREMGenerator(G.renderer);
      G.scene.environment = pm.fromScene(envScene, 0.02).texture;
      pm.dispose();
    } catch (e) { G.scene.environment = null; }
    var sun = new THREE.DirectionalLight(bio.sun || 0xffffff, (bio.si || 1.4) * 1.35);
    sun.position.set(-160, 260, -120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 2;
    var sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 10; sc.far = 700;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    G.scene.add(sun); G.scene.add(sun.target);
    G.sun = sun;
    if (bio.neon || bio.night) { G.scene.add(new THREE.AmbientLight(0x6a6aaa, 0.35)); }
    SF.FX.setWeather(bio.snowfall ? 'snow' : bio.rain ? 'rain' : bio.embers ? 'embers' : null, bio.snowfall || bio.rain || bio.embers);

    // teams
    var era = D.eraById[cfg.era];
    var f0 = era.sides[0], f1 = era.sides[1];
    if (mode.type === 'hunt') { f0 = D.natives[map.planet] || 'wroshan'; if (D.factions[f0].side === 1) { f1 = era.sides[0]; } }
    if (mode.type === 'infect') { f0 = era.sides[1]; f1 = map.planet === 'kesh' || map.planet === 'nevrath' ? 'raiders' : 'tiklets'; }
    var pt = cfg.team || 0;
    G.teams = [f0, f1].map(function (fid, t) {
      var F = D.factions[fid];
      return { faction: fid, side: F.side, name: F.name, short: F.short, color: t === pt ? 0x3d9bff : 0xff4a3a, css: t === pt ? '#3d9bff' : '#ff4a3a', fcss: F.ui };
    });
    if (mode.type === 'hunt' && D.factions[f0].side === 1) G.teams[0].side = 1;

    C_reset();
    G.mode = SF.Modes.create(mode, cfg);
    G.mode.init();

    // players
    var per = Math.max(1, Math.round((mode.players || 12) * (cfg.teamScale || 1)));
    if (mode.type === 'showdown') per = 2; if (mode.type === 'cvt') per = 4;
    if (mode.type === 'legendhunt') per = Math.max(4, per);
    G.player = new SF.Unit({ team: pt, faction: G.teams[pt].faction, isPlayer: true, name: cfg.playerName || 'You', classId: 'assault' });
    G.player.alive = false; G.player.rig.root.visible = false;
    G.units.push(G.player);
    var counts = [per, per];
    if (mode.type === 'survival') counts = [4, 0];
    if (mode.type === 'legendhunt') counts = [per * 2 - 1, 1];
    if (mode.type === 'infect') counts = [per * 2 - 2, 2];
    if (mode.type === 'legendhunt' && pt === 1) { counts = [per * 2 - 1, 1]; }
    for (var t = 0; t < 2; t++) {
      var n = counts[t] - (t === pt ? 1 : 0);
      for (var i = 0; i < n; i++) {
        var b = Game.addBot(t, null, i * 0.15 + 0.3);
      }
    }
    G.state = 'deploy';
    G.deployCam = 0;
    SF.Audio.startMusic('battle');
    if (SF.UI) SF.UI.showDeploy(true);
  };
  function C_reset() { SF.Combat.reset(); }

  Game.addBot = function (team, opts, delay) {
    var u = new SF.Unit(Object.assign({ team: team, faction: G.teams[team].faction }, opts || {}));
    new SF.Brain(u);
    G.units.push(u);
    u.respawnT = delay == null ? 0.2 : delay;
    u.pendingKit = opts || null;
    return u;
  };
  G.addBot = function (team, opts) { var u = Game.addBot(team, opts, 0.5 + Math.random()); return u; };
  G.addBotVehicle = function (team, vdef) {
    var u = Game.addBot(team, null, 0.1); u.pendingVehicle = vdef; return u;
  };
  G.clearTeam = function (team) {
    G.units = G.units.filter(function (u) { if (u.team === team && !u.isPlayer) { u.remove(); return false; } return true; });
    G.vehicles.forEach(function (v) { if (v.team === team && !v.alive) v.remove(); });
  };

  // ------------------------------------------------------------------ queries
  G.teamAlive = function (t) { var n = 0; for (var i = 0; i < G.units.length; i++) if (G.units[i].team === t && G.units[i].alive) n++; return n; };
  G.teamHp = function (t) { var n = 0; G.units.forEach(function (u) { if (u.team === t && u.alive) n += u.hp / u.maxHp; }); return n; };
  G.teamHeroes = function (t) { var n = 0; G.units.forEach(function (u) { if (u.team === t && u.alive && u.isHero) n++; }); return n; };
  G.teamVehicles = function (t) { var n = 0; G.vehicles.forEach(function (v) { if (v.team === t && v.alive && v.driver) n++; }); return n; };

  // ------------------------------------------------------------------ spawning
  G.spawnVehicle = function (vdef, team, faction, driver, x, y, z, yaw) {
    var v = new SF.Vehicle(vdef, team, faction);
    v.spawn(x, y, z, yaw == null ? (team === 0 ? Math.PI : 0) : yaw);
    G.vehicles.push(v);
    if (driver) v.enter(driver);
    return v;
  };
  function spawnPos(sp, team, r) {
    var w = G.world;
    if (w.space) return new V3(sp.x + (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, sp.z + (Math.random() - 0.5) * 60);
    var p = SF.World.randomNavPoint(w, Math.random, sp.x, sp.z, r || 7);
    return new V3(p.x, w.groundAt(p.x, p.z, (sp.y || 0) + 6), p.z);
  }
  function faceYaw(team, pos) {
    // look toward the map centre / enemy base
    var b = G.world.bases[1 - team];
    return Math.atan2(-(b.x - pos.x), -(b.z - pos.z));
  }
  Game.chooseBotKit = function (u) {
    var D = SF.D, m = G.mode, def = m.def, team = u.team, F = G.teams[team];
    var era = G.match.era;
    if (u.pendingKit) { var k = u.pendingKit; u.pendingKit = null; if (k.heroId || k.classId) return k; }
    if (u.pendingVehicle) { var pv = u.pendingVehicle; u.pendingVehicle = null; return { vehicle: pv }; }
    var heroes = D.heroes.filter(function (h) { return h.era === era && h.side === F.side; });
    if (D.factions[F.faction].era === '*') heroes = [];
    if (def.heroesOnly && !m.space) {
      var taken = {}; G.units.forEach(function (o) { if (o !== u && o.team === team && o.isHero && (o.alive || o.respawnT != null)) taken[o.heroId] = 1; });
      var free = heroes.filter(function (h) { return !taken[h.id]; });
      var pick = (free.length ? free : heroes)[(Math.random() * (free.length || heroes.length)) | 0];
      return { heroId: pick.id };
    }
    if (m.space) {
      var ships = D.vehicles.filter(function (v) { return v.type === 'fighter' && v.era === era && v.side === F.side && !v.low; });
      var heroShips = ships.filter(function (v) { return v.hero; });
      var normal = ships.filter(function (v) { return !v.hero; });
      if (def.heroesOnly) return { vehicle: heroShips[(Math.random() * heroShips.length) | 0] || normal[0] };
      if (def.heroes && heroShips.length && u.bp >= 5000 * G.bpK && Math.random() < 0.5 && G.vehicles.filter(function (v) { return v.alive && v.team === team && v.def.hero; }).length < 1) { u.bp -= 5000 * G.bpK; return { vehicle: heroShips[(Math.random() * heroShips.length) | 0] }; }
      return { vehicle: normal[(Math.random() * normal.length) | 0] };
    }
    // legend?
    if (heroes.length && m.allowHero(team) && def.heroes !== false && G.match.heroes !== false) {
      var aff = heroes.filter(function (h) { return u.bp >= h.cost * G.bpK && !G.units.some(function (o) { return o.alive && o.heroId === h.id; }); });
      if (aff.length && Math.random() < 0.5) { var h = aff[(Math.random() * aff.length) | 0]; u.bp -= h.cost * G.bpK; return { heroId: h.id }; }
    }
    if (G.match.vehiclesOk && def.vehicles && m.allowVehicle(team)) {
      var vs = D.vehicles.filter(function (v) { return v.era === era && v.side === F.side && !v.hero && v.id !== 'atat' && (v.type !== 'fighter' || !G.world.map.indoor); });
      var av = vs.filter(function (v) { return u.bp >= v.cost * G.bpK; });
      if (av.length && Math.random() < 0.35) { var vv = av[(Math.random() * av.length) | 0]; u.bp -= vv.cost * G.bpK; return { vehicle: vv }; }
    }
    if (D.factions[F.faction].era !== '*' && u.bp >= 1500 * G.bpK && Math.random() < 0.25) {
      var r = D.reinforcements[(Math.random() * D.reinforcements.length) | 0];
      if (u.bp >= r.cost * G.bpK) { u.bp -= r.cost * G.bpK; return { classId: r.id }; }
    }
    var cls = ['assault', 'assault', 'assault', 'heavy', 'heavy', 'specialist', 'officer', 'engineer', 'commando'];
    var lo = D.loadouts[F.faction];
    var cid = cls[(Math.random() * cls.length) | 0];
    var list = lo[cid] || lo.assault;
    var wid = list[(Math.random() * list.length) | 0], mods = null;
    if (Math.random() < 0.45) {
      var A = D.attachments, pk = function (arr) { return arr[(Math.random() * arr.length) | 0].id; };
      mods = { optic: pk(A.optic), barrel: pk(A.barrel), grip: pk(A.grip), cooling: pk(A.cooling), cell: pk(A.cell), finish: D.finishes[(Math.random() * D.finishes.length) | 0].id };
    }
    return { classId: cid, weaponId: wid, allJet: def.allJet, mods: mods };
  };
  Game.spawnUnit = function (u, kit, spId) {
    var sps = G.mode.spawnPoints(u.team);
    var sp = null;
    if (spId) sp = sps.filter(function (s) { return s.id === spId; })[0];
    if (!sp) {
      if (u.ai) {
        // bots pick the spawn closest to their goal
        var goal = G.mode.botGoal(u) || sps[0];
        sps.sort(function (a, b) { return Math.hypot(a.x - goal.x, a.z - goal.z) - Math.hypot(b.x - goal.x, b.z - goal.z); });
        sp = Math.random() < 0.7 ? sps[0] : sps[(Math.random() * sps.length) | 0];
      } else sp = sps[0];
    }
    var D = SF.D;
    if (kit.vehicle) {
      var vd = kit.vehicle;
      if (!u.isHero && u.classId !== 'assault') u.setKit({ classId: 'assault', team: u.team });
      var pos = spawnPos(sp, u.team, vd.type === 'fighter' ? 30 : 10);
      if (vd.type !== 'fighter') pos = spawnPos(sp, u.team, 14);
      u.spawn(pos.x, pos.y, pos.z, faceYaw(u.team, pos));
      var yaw = faceYaw(u.team, pos);
      if (vd.type === 'fighter' && !G.world.space) pos.y += 50;
      var v = G.spawnVehicle(vd, u.team, G.teams[u.team].faction, u, pos.x, pos.y, pos.z, yaw);
      if (G.world.space) { v.quat.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ')); }
      u.yaw = yaw;
      return;
    }
    if (kit.heroId || kit.classId !== u.classId || u.isHero || kit.weaponId || kit.skin || kit.cards || !u.rig || kit.allJet || kit.look) {
      u.setKit({ heroId: kit.heroId, classId: kit.classId || 'assault', weaponId: kit.weaponId, team: u.team, allJet: kit.allJet, look: kit.look, mods: kit.mods !== undefined ? kit.mods : (u.isPlayer ? undefined : null) });
      if (kit.cards) { u.cards = kit.cards; u.maxHp = u.spec.hp * (u.has('bodyArmor') ? 1.15 : 1); u.speedK = (u.spec.speed || 1) * (u.has('sprinter') ? 1.1 : 1); }
      if (kit.skin && kit.skin !== 'default') { u.skin = kit.skin; u.buildModel(); }
    }
    var p = spawnPos(sp, u.team, 7);
    u.spawn(p.x, p.y + 0.05, p.z, faceYaw(u.team, p));
    if (u.isHero && u.isPlayer) G.matchStats.heroUsed = true;
  };
  G.queueRespawn = function (u, t) { u.respawnT = t; };
  G.respawnAll = function (delay, keepKit) {
    G.units.forEach(function (u) {
      if (u.alive) { u.alive = false; u.rig.root.visible = false; if (u.vehicle) u.vehicle.ejectDriver(true); }
      u.respawnT = delay; u.keepKit = true;
    });
    if (G.player && SF.UI) { G.playerAutoRespawn = true; }
    G.proj.forEach(function (p) { if (p.mesh) G.scene.remove(p.mesh); }); G.proj = [];
  };
  G.convertUnit = function (u, team) {
    u.team = team; u.faction = G.teams[team].faction;
    u.setKit({ classId: 'assault', team: team });
    if (u.isPlayer && SF.UI) SF.UI.toast('You have joined the tribe!');
  };
  G.swapLegend = function (oldHero, newHero) {
    // old legend returns to the hunters; the killer becomes the legend
    var hs = SF.D.heroes.filter(function (h) { return h.era === G.match.era; });
    var hid = oldHero.heroId || hs[0].id;
    oldHero.team = 0; oldHero.faction = G.teams[0].faction; oldHero.setKit({ classId: 'assault', team: 0 });
    newHero.team = 1; newHero.faction = G.teams[1].faction;
    var pick = hs[(Math.random() * hs.length) | 0];
    if (newHero.alive) { var p = newHero.pos.clone(), y = newHero.yaw; newHero.setKit({ heroId: pick.id, team: 1 }); newHero.spawn(p.x, p.y, p.z, y); }
    else { newHero.pendingKit = { heroId: pick.id }; }
    if (newHero.isPlayer && SF.UI) SF.UI.toast('You are the Legend now: ' + pick.name);
  };

  // player deploy from the UI
  Game.deployPlayer = function (choice, spId) {
    var u = G.player, D = SF.D;
    var kit = {};
    var cost = 0;
    if (choice.vehicle) { kit.vehicle = D.vehById[choice.vehicle]; cost = kit.vehicle.cost; }
    else if (choice.heroId) { kit.heroId = choice.heroId; cost = G.mode.def.heroesOnly ? 0 : D.heroById[choice.heroId].cost; kit.skin = SF.Prog.heroSkin(choice.heroId); }
    else {
      kit.classId = choice.classId;
      var r = D.reinfById[choice.classId]; if (r) cost = r.cost;
      var lo = SF.Prog.classLoadout(G.teams[u.team].faction, D.reinfById[choice.classId] ? 'commando' : choice.classId);
      kit.weaponId = choice.weaponId || lo.weapon; kit.cards = lo.cards; kit.skin = lo.skin;
      var lclass = D.reinfById[choice.classId] ? 'commando' : choice.classId;
      kit.look = SF.Prog.look(G.teams[u.team].faction, lclass); kit.mods = SF.Prog.wmods(kit.weaponId);
      kit.allJet = G.mode.def.allJet;
    }
    cost *= G.bpK;
    if (u.bp < cost) return 'Not enough battle points';
    u.bp -= cost;
    Game.spawnUnit(u, kit, spId);
    G.state = 'play';
    G.respawnT = null;
    Game.lockPointer();
    return null;
  };

  // ------------------------------------------------------------------ events
  G.addBp = function (u, amt, reason) {
    if (!u || !u.team === undefined) return;
    var k = u.has && u.has('bpBoost') ? 1.2 : 1;
    u.bp = (u.bp || 0) + amt * k; u.score = (u.score || 0) + amt;
    if (u.isPlayer && SF.UI) SF.UI.bpPopup('+' + Math.round(amt * k) + ' ' + reason);
    if (u.isPlayer && reason.indexOf('Captured') === 0) G.matchStats.captures++;
  };
  G.announce = function (msg, team) { if (SF.UI) SF.UI.announce(msg, team); };
  G.onKill = function (victim, killer, kind) {
    var kname = killer && killer.name ? killer.name : (kind === 'fall' ? 'Gravity' : 'Environment');
    G.feed.unshift({ k: kname, kt: killer && killer.team != null ? killer.team : -1, v: victim.name, vt: victim.team, hero: victim.isHero, t: G.time, how: kind });
    if (G.feed.length > 6) G.feed.length = 6;
    if (killer && killer.type === 'unit' && killer !== victim && killer.team !== victim.team) {
      killer.kills++; killer.streak = (killer.streak || 0) + 1;
      G.addBp(killer, victim.isHero ? 400 : 100, victim.isHero ? 'Legend eliminated' : 'Elimination');
      if (killer.has && killer.has('lifeSteal')) killer.heal(40);
      if (killer.isPlayer) {
        SF.Audio.kill();
        G.matchStats.bestStreak = Math.max(G.matchStats.bestStreak, killer.streak);
        if (killer.isHero) G.matchStats.heroKills++;
        if (killer.streak === 5 || killer.streak === 10 || killer.streak === 20) SF.UI.toast(killer.streak + ' kill streak!');
      }
    }
    if (victim.carrying) victim.carrying.drop();
    G.mode.onKill(victim, killer);
    var noR = G.mode.noRespawn || victim.noRespawn;
    victim.respawnT = noR ? null : G.mode.respawn;
    if (G.mode.def.type === 'survival' && victim.team === 0) victim.respawnT = G.mode.lives > 0 ? 8 : null;
    if (victim.isPlayer) { G.deathT = 0; G.killer = killer; if (victim.respawnT != null) G.respawnT = victim.respawnT; }
  };
  G.onVehicleDestroyed = function (v, killer) {
    var kname = killer && killer.name ? killer.name : 'Environment';
    G.feed.unshift({ k: kname, kt: killer && killer.team != null ? killer.team : -1, v: v.def.name, vt: v.team, t: G.time, veh: true });
    if (G.feed.length > 6) G.feed.length = 6;
    if (killer && killer.type === 'unit' && killer.team !== v.team) { G.addBp(killer, 300, 'Vehicle destroyed'); if (killer.isPlayer) G.matchStats.vehicleKills++; }
  };
  G.onSubsystemDestroyed = function (cap, sb, src) {
    G.announce(cap.name + ': ' + sb.name + ' destroyed!', 1 - cap.team);
    if (src && src.type === 'unit') G.addBp(src, 1000, sb.name + ' destroyed');
  };

  // ------------------------------------------------------------------ input
  Game.bindInput = function (canvas) {
    var K = G.keys;
    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      K[e.code] = true;
      if (G.state === 'play' || G.state === 'paused') {
        if (e.code === 'Tab') { e.preventDefault(); }
        if (e.code === 'Escape' || e.code === 'KeyP') { if (SF.UI) SF.UI.togglePause(); }
        var p = G.player;
        if (G.state === 'play' && p && p.alive) {
          if (e.code === 'KeyQ' || e.code === 'Digit1') p.input.ab[0] = true;
          if (e.code === 'KeyE' || e.code === 'Digit2') p.input.ab[1] = true;
          if (e.code === 'KeyF' || e.code === 'Digit3') p.input.ab[2] = true;
          if (e.code === 'KeyR') p.input.vent = true;
          if (e.code === 'KeyV') { G.firstPerson = !G.firstPerson; }
          if (e.code === 'KeyG' && p.vehicle && p.vehicle.kind !== 'fighter') p.vehicle.ejectDriver(false);
          if (e.code === 'KeyB' || e.code === 'Digit4') Game.emote(0);
          if (e.code === 'Digit5') Game.emote(1); if (e.code === 'Digit6') Game.emote(2); if (e.code === 'Digit7') Game.emote(3);
          if (e.code === 'KeyC' && !SF.Prog.p.settings.holdCrouch) p.toggleCrouch = !p.toggleCrouch;
          if (e.code === 'KeyX') { if (p.carrying) p.carrying.drop(); }
        }
      }
      if (G.state === 'deploy' && e.code === 'Escape' && SF.UI) SF.UI.togglePause();
    });
    window.addEventListener('keyup', function (e) { K[e.code] = false; });
    canvas.addEventListener('mousedown', function (e) {
      SF.Audio.init(); SF.Audio.resume();
      if (G.state === 'play' && document.pointerLockElement !== canvas) { Game.lockPointer(); return; }
      if (e.button === 0) G.mouse.l = true; if (e.button === 2) G.mouse.r = true;
    });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) G.mouse.l = false; if (e.button === 2) G.mouse.r = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement === canvas || G.touchLook) { G.mouse.dx += e.movementX || 0; G.mouse.dy += e.movementY || 0; }
    });
    document.addEventListener('pointerlockchange', function () {
      if (document.pointerLockElement !== canvas && G.state === 'play' && !G.touch && SF.UI && !SF.UI.suppressPause) SF.UI.togglePause(true);
    });
    G.canvas = canvas;
  };
  Game.lockPointer = function () { if (G.touch || document.pointerLockElement === G.canvas) return; try { var r = G.canvas.requestPointerLock(); if (r && r.catch) r.catch(function () { }); } catch (e) { } };
  Game.emote = function (i) {
    var p = G.player; if (!p || !p.alive || p.vehicle) return;
    var id = SF.Prog.p.equipped.emotes[i];
    if (id) { p.anim.emote = id; p.anim.emoteT = 0; }
  };

  function playerInput(dt) {
    var p = G.player, K = G.keys, s = SF.Prog.p.settings;
    if (!p || !p.alive) return;
    var inp = p.input;
    var sens = 0.0021 * (s.sens || 1) * (inp.aim ? (p.weapon && p.weapon.kind === 'sniper' ? 0.35 : 0.6) : 1);
    p.yaw -= G.mouse.dx * sens;
    p.pitch -= G.mouse.dy * sens * (s.invertY ? -1 : 1);
    G.mouse.dx = 0; G.mouse.dy = 0;
    p.pitch = Math.max(-1.4, Math.min(1.35, p.pitch));
    inp.fwd = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) + (G.touchMove ? G.touchMove.y : 0);
    inp.strafe = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + (G.touchMove ? G.touchMove.x : 0);
    inp.jump = !!K.Space || !!G.touchJump;
    inp.sprint = !!K.ShiftLeft || !!K.ShiftRight || s.autoSprint || (G.touchMove && G.touchMove.y > 0.85);
    inp.crouch = !!K.ControlLeft || !!p.toggleCrouch;
    inp.fire = G.mouse.l || !!G.touchFire;
    inp.aim = G.mouse.r || !!G.touchAim;
    if (inp.fire || inp.fwd || inp.strafe) p.toggleCrouch = p.toggleCrouch && !inp.sprint;
  }

  // ------------------------------------------------------------------ camera & aim
  var camYaw = 0, camPitch = 0, camDist = 3.4, fovCur = 75;
  function updateCamera(dt) {
    var cam = G.camera, p = G.player, s = SF.Prog.p.settings;
    var fov = s.fov || 75;
    G.shake = Math.max(0, (G.shake || 0) - dt * 2.5);
    G.camKick = Math.max(0, (G.camKick || 0) - dt * 6);
    if (G.state === 'deploy' || !p || (!p.alive && G.deathT > 2.5)) {
      // overview
      G.deployCam += dt * 0.05;
      var w = G.world, r = w.space ? 900 : w.half * 1.05;
      cam.position.set(Math.sin(G.deployCam) * r, w.space ? 300 : Math.max(60, w.half * 0.45), Math.cos(G.deployCam) * r);
      cam.lookAt(0, w.space ? 0 : 0, 0);
      fovCur = 60;
    } else if (!p.alive) {
      // death cam: orbit the body, look at killer
      G.deathT += dt;
      var tgt = G.killer && G.killer.pos ? G.killer.pos : p.pos;
      tmp.set(p.pos.x, p.pos.y + 2.5, p.pos.z);
      var dir = tmp2.subVectors(tmp, tgt).setY(0).normalize();
      cam.position.lerp(tmp3.copy(tmp).addScaledVector(dir, 5).setY(p.pos.y + 4), Math.min(1, dt * 3));
      cam.lookAt(tgt.x, tgt.y + 1, tgt.z);
    } else if (p.vehicle) {
      var v = p.vehicle;
      if (v.kind === 'fighter') {
        var aim = new V3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
        var up = new V3(0, 1, 0).applyQuaternion(v.quat);
        var d = v.radius * 2.6 + 6;
        tmp.copy(v.pos).addScaledVector(aim, -d).addScaledVector(up, v.radius * 0.7 + 1.5);
        cam.position.lerp(tmp, Math.min(1, dt * 10));
        cam.up.lerp(up, Math.min(1, dt * 3)).normalize();
        cam.lookAt(tmp2.copy(v.pos).addScaledVector(aim, 60));
        fov += v.boostT > 0 ? 12 : 0;
      } else {
        var dv = v.radius * 2.2 + 4;
        var piv = v.center(tmp2); piv.y += v.height * 0.45 + 1;
        var off = new V3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
        tmp.copy(piv).addScaledVector(off, -dv);
        var t = G.world.raycast(piv.x, piv.y, piv.z, tmp.x, tmp.y, tmp.z);
        if (t < 1) tmp.lerpVectors(piv, tmp, Math.max(0.15, t - 0.05));
        var gyc = G.world.groundAt(tmp.x, tmp.z, tmp.y + 2); if (tmp.y < gyc + 0.6) tmp.y = gyc + 0.6;
        cam.position.copy(tmp);
        cam.up.set(0, 1, 0);
        cam.lookAt(tmp3.copy(piv).addScaledVector(off, 30));
      }
    } else {
      cam.up.set(0, 1, 0);
      var aimK = p.input.aim && !p.melee ? 1 : 0;
      if (G.firstPerson && !p.melee) {
        p.eye(tmp);
        cam.position.copy(tmp);
        cam.rotation.order = 'YXZ'; cam.rotation.set(p.pitch + G.camKick * 0.02, p.yaw, 0);
        if (aimK) fov = fov / (p.weapon ? p.weapon.zoom : 1.3);
      } else {
        var targetDist = (p.melee ? 4.2 : 3.3) * (aimK ? 0.5 : 1) * (p.height / 1.8) * (p.isHero && p.spec.body && p.spec.body.kind === 'small' ? 1.3 : 1);
        camDist += (targetDist - camDist) * Math.min(1, dt * 10);
        var pv = tmp.set(p.pos.x, p.pos.y + p.height * (p.input.crouch ? 0.7 : 0.92), p.pos.z);
        var fwd = new V3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
        var right = new V3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
        var shoulder = p.melee ? 0.0 : 0.62;
        var desired = tmp2.copy(pv).addScaledVector(fwd, -camDist).addScaledVector(right, shoulder);
        desired.y += 0.25;
        var tt = G.world.raycast(pv.x, pv.y, pv.z, desired.x, desired.y, desired.z);
        if (tt < 1) desired.lerpVectors(pv, desired, Math.max(0.1, tt - 0.08));
        cam.position.copy(desired);
        cam.rotation.order = 'YXZ'; cam.rotation.set(p.pitch + G.camKick * 0.015, p.yaw, 0);
        if (aimK && p.weapon) fov = fov / Math.min(2.2, p.weapon.zoom);
      }
    }
    if (G.shake > 0) { cam.position.x += (Math.random() - 0.5) * G.shake * 0.4; cam.position.y += (Math.random() - 0.5) * G.shake * 0.4; }
    fovCur += (fov - fovCur) * Math.min(1, dt * 12);
    if (Math.abs(cam.fov - fovCur) > 0.05) { cam.fov = fovCur; cam.updateProjectionMatrix(); }
    G.camPos = cam.position;
    SF.Audio.listener = cam.position;
    // keep shadows centred on the camera
    if (G.sun) {
      G.sun.target.position.set(Math.round(cam.position.x / 8) * 8, 0, Math.round(cam.position.z / 8) * 8);
      G.sun.position.set(G.sun.target.position.x - 160, 260, G.sun.target.position.z - 120);
    }
    if (G.world && G.world.sky) G.world.sky.position.copy(cam.position);
  }
  // raycast from the screen centre to find what the player is aiming at
  function updateAim() {
    var p = G.player, cam = G.camera;
    if (!p || !p.alive) { G.aimPoint = null; return; }
    var o = cam.position, d = tmp.set(0, 0, -1).applyQuaternion(cam.quaternion);
    var maxD = G.world.space ? 900 : 400;
    var end = tmp2.copy(o).addScaledVector(d, maxD);
    var t = G.world.raycast(o.x, o.y, o.z, end.x, end.y, end.z);
    var best = t * maxD, target = null;
    // skip what is between camera and player
    var skip = p.vehicle ? p.vehicle.radius + 2 : camDist + 0.5;
    for (var i = 0; i < G.units.length; i++) {
      var u = G.units[i];
      if (!u.alive || u === p || u.vehicle) continue;
      tmp3.set(u.pos.x, u.pos.y + u.height * 0.6, u.pos.z);
      var tt = SF.Combat.segSphere(o.x, o.y, o.z, d.x * maxD, d.y * maxD, d.z * maxD, tmp3.x, tmp3.y, tmp3.z, u.radius + 0.5);
      if (tt <= 1 && tt * maxD > skip && tt * maxD < best) { best = tt * maxD; target = u; }
    }
    for (i = 0; i < G.vehicles.length; i++) {
      var v = G.vehicles[i];
      if (!v.alive || v === p.vehicle) continue;
      var c = v.center(tmp3);
      var tv = SF.Combat.segSphere(o.x, o.y, o.z, d.x * maxD, d.y * maxD, d.z * maxD, c.x, c.y, c.z, v.radius * 0.8);
      if (tv <= 1 && tv * maxD > skip && tv * maxD < best) { best = tv * maxD; target = v; }
    }
    if (G.capitals) G.capitals.forEach(function (cap) { cap.subs.forEach(function (sb) { if (sb.hp <= 0) return; var ts = SF.Combat.segSphere(o.x, o.y, o.z, d.x * maxD, d.y * maxD, d.z * maxD, sb.wpos.x, sb.wpos.y, sb.wpos.z, sb.r); if (ts <= 1 && ts * maxD < best) { best = ts * maxD; target = sb; } }); });
    if (best < skip + 1) best = Math.max(best, skip + 25);
    G.aimPoint = (G.aimPoint || new V3()).copy(o).addScaledVector(d, best);
    G.aimTarget = target && target.team !== p.team ? target : null;
  }

  // ------------------------------------------------------------------ loop
  Game.loop = function () {
    requestAnimationFrame(Game.loop);
    var dt = Math.min(0.05, G.clock ? G.clock.getDelta() : 0.016);
    if (G.state === 'paused' || G.state === 'menu-paused') { G.renderer.render(G.scene, G.camera); return; }
    G.dt = dt;
    G.time += dt; G.frame++;
    if (G.state === 'menu' || G.state === 'results') {
      menuTick(dt);
      SF.FX.update(dt, G.camera.position);
      G.renderer.render(G.scene, G.camera);
      return;
    }
    if (!G.world) return;
    Game.step(dt);
    G.renderer.render(G.scene, G.camera);
  };
  Game.step = function (dt) {
    G.pathBudget = 3;
    if (G.state === 'play') playerInput(dt);
    if (G.player && G.player.input && !G.player.alive) { G.mouse.dx = G.mouse.dy = 0; }
    var i;
    for (i = 0; i < G.units.length; i++) { var u = G.units[i]; if (u.ai && u.alive) u.ai.update(dt); }
    for (i = 0; i < G.units.length; i++) G.units[i].update(dt);
    for (i = G.vehicles.length - 1; i >= 0; i--) {
      var v = G.vehicles[i];
      v.update(dt);
      if (!v.alive && v.deadT > 1) { v.remove(); G.vehicles.splice(i, 1); }
      else if (v.alive && !v.driver && !v.autoGun && !v.isCargo) { v.idleT = (v.idleT || 0) + dt; if (v.idleT > 40) { v.alive = false; v.deadT = 2; v.root.visible = false; } }
    }
    SF.Combat.update(dt);
    SF.Combat.updateDeploy(dt);
    if (G.world.anim) for (i = 0; i < G.world.anim.length; i++) G.world.anim[i](dt, G.time);
    if (G.mode && !G.mode.result) { G.playerInZone = null; G.mode.update(dt); }
    // respawns
    for (i = 0; i < G.units.length; i++) {
      var b = G.units[i];
      if (b.alive || b.respawnT == null) continue;
      if (b.isPlayer) {
        if (G.respawnT != null) { G.respawnT -= dt; }
        if (G.playerAutoRespawn && b.respawnT != null) { b.respawnT -= dt; if (b.respawnT <= 0) { b.respawnT = null; G.playerAutoRespawn = false; Game.spawnUnit(b, b.heroId ? { heroId: b.heroId } : { classId: b.classId }); G.state = 'play'; if (SF.UI) SF.UI.showDeploy(false); } }
        continue;
      }
      b.respawnT -= dt;
      if (b.respawnT <= 0) {
        b.respawnT = null;
        var kit = b.keepKit && (b.isHero || b.classId) ? (b.isHero ? { heroId: b.heroId } : { classId: b.classId }) : Game.chooseBotKit(b);
        b.keepKit = false;
        if (G.mode.def.heroesOnly && !kit.heroId && !G.mode.space) kit = Game.chooseBotKit(b);
        Game.spawnUnit(b, kit);
      }
    }
    // slow BP trickle so everyone eventually earns a legend
    if (G.frame % 60 === 0) G.units.forEach(function (u) { if (u.alive) u.bp += 12; });
    // player died → deploy screen after a moment
    if (G.player && !G.player.alive && G.state === 'play' && !G.playerAutoRespawn) {
      G.deathT = (G.deathT || 0) + 0;
      if (G.deathT > 2.5 && G.mode.noRespawn !== true && G.player.respawnT != null) { G.state = 'deploy'; document.exitPointerLock && document.exitPointerLock(); if (SF.UI) SF.UI.showDeploy(true); }
      if (G.deathT > 2.5 && (G.mode.noRespawn || G.player.respawnT == null) && SF.UI && !G.spectating) { G.spectating = true; SF.UI.toast('Eliminated — waiting for the next round'); }
    }
    if (G.player && G.player.alive) G.spectating = false;
    updateCamera(dt);
    updateAim();
    SF.FX.update(dt, G.camPos);
    if (SF.UI) SF.UI.hud(dt);
    if (G.mode.result && G.state !== 'results') Game.endMatch();
  };

  // ------------------------------------------------------------------ end of match
  Game.endMatch = function () {
    var r = G.mode.result, p = G.player;
    G.state = 'results';
    if (document.exitPointerLock) document.exitPointerLock();
    var won = r.winner === p.team;
    var rewards = SF.Prog.award({ won: won, kills: p.kills, deaths: p.deaths, score: p.score || 0, heroKills: G.matchStats.heroKills, vehicleKills: G.matchStats.vehicleKills, captures: G.matchStats.captures, time: G.time, bestStreak: G.matchStats.bestStreak, space: G.world.space, heroUsed: G.matchStats.heroUsed });
    var board = G.units.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).map(function (u) { return { name: u.name, team: u.team, kills: u.kills, deaths: u.deaths, score: Math.round(u.score || 0), me: u.isPlayer }; });
    var summary = { result: r, won: won, draw: r.winner === -1, rewards: rewards, board: board, teams: G.teams, mode: G.mode.def, map: G.world.map, campaign: G.match.campaign };
    Game.cleanupMatch();
    Game.menuScene();
    G.state = 'results';
    SF.Audio.startMusic('menu');
    if (SF.UI) SF.UI.showResults(summary);
    return summary;
  };
  Game.cleanupMatch = function () {
    if (G.mode && G.mode.cleanup) try { G.mode.cleanup(); } catch (e) { }
    G.units.forEach(function (u) { u.stopHum(); });
    G.vehicles.forEach(function (v) { if (v.engine) v.engine.stop(); });
    SF.FX.setWeather(null);
    G.mode = null;
  };
  Game.quitMatch = function () {
    Game.cleanupMatch();
    Game.menuScene();
  };
})();
