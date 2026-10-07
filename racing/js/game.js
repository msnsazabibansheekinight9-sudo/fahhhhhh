// Game core: renderer, race sessions, cameras, timing, AI, collisions, effects, mode rules.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;
  var G = RX.G = {
    settings: { quality: 1, shadows: true, units: 'kmh', volume: 0.8, mirror: true, damage: true, difficulty: 0.85, steerAssist: true, catchup: true, fov: 70 },
    keys: {}, state: 'menu'
  };
  try { var saved = JSON.parse(localStorage.getItem('gridlock_settings') || 'null'); if (saved) Object.assign(G.settings, saved); } catch (e) { }
  RX.saveSettings = function () { try { localStorage.setItem('gridlock_settings', JSON.stringify(G.settings)); } catch (e) { } };

  RX.loadCustom = function (car) {
    var c = RX.defaultCustom(car);
    try { var s = JSON.parse(localStorage.getItem('gridlock_cus_' + car.id) || 'null'); if (s) Object.assign(c, s); } catch (e) { }
    return c;
  };
  RX.saveCustom = function (car, cus) { try { localStorage.setItem('gridlock_cus_' + car.id, JSON.stringify(cus)); } catch (e) { } };

  RX.fmtTime = function (t) {
    if (t == null || !isFinite(t)) return '--:--.---';
    var m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
  };
  RX.fmtSpeed = function (ms) { return G.settings.units === 'mph' ? Math.round(ms * 2.23694) : Math.round(ms * 3.6); };
  RX.unitLabel = function () { return G.settings.units === 'mph' ? 'mph' : 'km/h'; };

  // ---------------- renderer ----------------
  RX.initRenderer = function (canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * G.settings.quality);
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    G.renderer = r;
    G.pmrem = new THREE.PMREMGenerator(r);
    window.addEventListener('resize', function () {
      r.setSize(window.innerWidth, window.innerHeight);
      if (G.camera) { G.camera.aspect = window.innerWidth / window.innerHeight; G.camera.updateProjectionMatrix(); }
      if (G.preview) { G.preview.cam.aspect = window.innerWidth / window.innerHeight; G.preview.cam.updateProjectionMatrix(); }
    });
    return r;
  };

  // studio environment map for paint reflections
  RX.makeEnv = function (night, skyTop, skyHor) {
    var sc = new THREE.Scene();
    var geo = new THREE.SphereGeometry(50, 32, 16), cols = [], pos = geo.attributes.position;
    var top = new THREE.Color(night ? '#0a0f20' : (skyTop || '#6a9ad8')), hor = new THREE.Color(night ? '#2a3050' : (skyHor || '#e8eef6')), gnd = new THREE.Color(night ? '#050505' : '#55504a');
    for (var i = 0; i < pos.count; i++) { var y = pos.getY(i) / 50; var c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.5)) : hor.clone().lerp(gnd, Math.min(1, -y * 4)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    // soft boxes
    var lm = new THREE.MeshBasicMaterial({ color: night ? 0x8899aa : 0xffffff });
    [[0, 40, 0, 40, 1, 20], [30, 20, 0, 1, 12, 30], [-30, 20, 0, 1, 12, 30]].forEach(function (b) { var m = new THREE.Mesh(new THREE.BoxGeometry(b[3], b[4], b[5]), lm); m.position.set(b[0], b[1], b[2]); sc.add(m); });
    var rt = G.pmrem.fromScene(sc, 0.03);
    return rt.texture;
  };

  // ---------------- input ----------------
  var KEYMAP = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], hand: ['Space'], shiftUp: ['ShiftLeft', 'ShiftRight', 'KeyE'], shiftDown: ['ControlLeft', 'ControlRight', 'KeyQ'] };
  function key(name) { var l = KEYMAP[name]; for (var i = 0; i < l.length; i++) if (G.keys[l[i]]) return true; return false; }
  window.addEventListener('keydown', function (e) {
    if (G.state === 'race' || G.state === 'paused') {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    }
    if (e.repeat) { G.keys[e.code] = true; return; }
    G.keys[e.code] = true;
    if (G.state === 'race' && G.race) G.race.onKey(e.code);
    else if (G.state === 'paused' && e.code === 'Escape') RX.resume();
  });
  window.addEventListener('keyup', function (e) { G.keys[e.code] = false; });
  window.addEventListener('blur', function () { G.keys = {}; });

  var pad = { prev: {} };
  function readPad() {
    var gps = navigator.getGamepads ? navigator.getGamepads() : [], gp = null;
    for (var i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { gp = gps[i]; break; }
    if (!gp) return null;
    var b = function (i) { return gp.buttons[i] ? gp.buttons[i].value : 0; };
    var o = { steer: Math.abs(gp.axes[0]) > 0.06 ? -gp.axes[0] : 0, throttle: b(7), brake: b(6), hand: b(0) > 0.5, presses: {} };
    [0, 1, 2, 3, 4, 5, 8, 9, 12, 13, 14, 15].forEach(function (i) { var now = b(i) > 0.5; if (now && !pad.prev[i]) o.presses[i] = true; pad.prev[i] = now; });
    o.lookBack = b(1) > 0.5;
    return o;
  }

  // ---------------- race session ----------------
  function Race(event, sess) {
    this.event = event; this.sess = sess; this.cfg = event.cfg;
    this.t = 0; this.raceTime = 0; this.started = false; this.finished = false; this.countdown = 0;
    this.camMode = G.camMode || 0; this.lookBack = false;
    this.messages = [];
  }
  RX.Race = Race;

  Race.prototype.build = function () {
    var self = this, cfg = this.cfg, sess = this.sess, sport = sess.sport;
    var rnd = this.rnd = RX.rng(Date.now() & 0xffff);
    var track = this.track = RX.buildTrack(sess.trackDef, sport);
    this.line = RX.racingLine(track);
    var weather = cfg.weather === 'auto' ? (track.rain ? 'rain' : 'clear') : cfg.weather;
    var tod = cfg.tod === 'auto' ? (track.night ? 'night' : 'day') : cfg.tod;
    if (sess.dayNight) tod = 'day';
    this.rain = weather === 'rain'; this.fog = weather === 'fog';
    this.tod = { night: tod === 'night', dusk: tod === 'dusk' };
    var scene = this.scene = new THREE.Scene();
    var world = this.world = RX.buildWorld(scene, track, { tod: this.tod, rain: this.rain, fog: this.fog, lowQuality: G.settings.quality < 0.8, attackZone: sess.attack, joker: sess.joker, checkpoints: this.checkpointList() });
    world.lights.sun.castShadow = G.settings.shadows;
    // reflections only on the cars (an environment on the whole scene washes out the world)
    this.env = RX.carEnv = RX.makeEnv(this.tod.night, world.theme.sky[0], world.theme.sky[1]);
    this.camera = G.camera = new THREE.PerspectiveCamera(G.settings.fov, window.innerWidth / window.innerHeight, 0.05, 6000);
    this.mirrorCam = new THREE.PerspectiveCamera(50, 3, 0.1, 1500);
    this.particles = new RX.Particles(scene, 500);
    if (this.rain) this.rainFx = new RX.Rain(scene);
    var env = { night: this.tod.night };
    // ---- player ----
    var car = cfg.car, cus = cfg.cus;
    cus.steerAssist = G.settings.steerAssist ? (cus.steerAssistOff ? 0 : 1) : 0;
    var rig = RX.buildCar(car, cus, env);
    scene.add(rig.root);
    var st = RX.makePhysics(car, cus, rig.dims);
    this.player = { isPlayer: true, car: car, cus: cus, rig: rig, st: st, lap: 0, lapStart: 0, laps: [], best: Infinity, sector: 0, finished: false, name: 'You', out: false, pitStops: 0, jokers: 0, drift: 0 };
    // headlight for the player
    if (this.tod.night || sess.dayNight || this.fog) {
      var hl = new THREE.SpotLight(0xfff4dc, 0, 160, 0.5, 0.5, 1.2);
      hl.position.set(0, 0.8, rig.dims.zF + 0.5); hl.target.position.set(0, -2, rig.dims.zF + 30);
      rig.root.add(hl); rig.root.add(hl.target); this.headlight = hl;
    }
    // ---- opponents ----
    var nOpp = sess.opponents || 0;
    if (sess.kind === 'drag') nOpp = sess.opponents ? 1 : 0;
    var oppCars = nOpp ? RX.pickOpponents(sess, car, nOpp, rnd) : [];
    if (sess.headToHead && oppCars.length) oppCars = [oppCars[0]];
    var diff = G.settings.difficulty * (cfg.difficultyMul || 1);
    if (sess.ladder != null) diff *= 0.86 + sess.ladder * 0.05;
    this.ai = [];
    var names = RX.DRIVER_NAMES.slice().sort(function () { return rnd() - 0.5; });
    oppCars.forEach(function (oc, i) {
      var ocus = RX.defaultCustom(oc);
      ocus.number = (ocus.number + i * 7) % 99 + 1;
      if (i > 0 && oc === oppCars[i - 1]) { ocus.paint1 = ['#d40000', '#0a2a6b', '#00a19b', '#ff8000', '#1a7a2e', '#5d2e8c', '#ffd400', '#f2f2f2'][i % 8]; ocus.pattern = RX.PATTERNS[i % RX.PATTERNS.length]; }
      ocus.tc = 1; ocus.abs = 1;
      var orig = RX.buildCar(oc, ocus, env);
      scene.add(orig.root);
      var skill = diff * (0.95 + rnd() * 0.08);
      if (sess.tandem) skill = diff * 0.82;
      if (sess.multiclass && oc.sport === 'gt') skill *= 1.0;
      var a = new RX.AICar(oc, ocus, track, { skill: skill, line: self.line, env: { rain: self.rain }, name: names[i % names.length] });
      a.rig = orig; a.wb = orig.dims.wb; a.lap = 0; a.laps = []; a.best = Infinity; a.lapStart = 0; a.finished = false; a.out = false; a.cus = ocus; a.pitStops = 0;
      self.ai.push(a);
    });
    this.allCars = [this.player].concat(this.ai);
    this.placeGrid();
    // ---- audio ----
    var au = G.audio;
    if (au && au.ok) {
      this.eng = au.makeEngine(car);
      this.oppEng = this.ai.length ? au.makeEngine(this.ai[0].car, 0.8) : null;
      this.amb = G.amb || (G.amb = au.makeAmbient());
    }
    // rally pace notes
    if (sess.paceNotes) { this.notes = RX.paceNotes(track); this.noteIdx = 0; }
    // rival times for solo timed events
    if (sess.rival || sess.quali) this.rivals = this.makeRivals();
    // ghost
    if (sess.ghost) this.loadGhost();
    // minimap
    this.buildMinimap();
    // drag christmas tree / staging
    if (sess.kind === 'drag') this.dragSetup();
    this.countdown = sess.kind === 'drag' ? 0 : (sess.flying ? 0 : 4.2);
    if (sess.flying) this.started = true;
    if (sess.staggered) this.started = true;
    this.lastHudT = 0;
    this.timeLimitLeft = sess.timeAttack ? 45 : 0;
    RX.ui.raceStart(this);
  };

  Race.prototype.checkpointList = function () {
    var s = this.sess; if (!s.checkpoints) return null;
    var tr = RX.buildTrack(s.trackDef, s.sport), list = [];
    var L = tr.closed ? tr.length : tr.finishS - tr.startS;
    for (var i = 1; i <= s.checkpoints; i++) list.push(tr.startS + L * i / (s.checkpoints + 1));
    this.cpS = list; this.cpIdx = 0;
    return list;
  };

  Race.prototype.placeGrid = function () {
    var self = this, tr = this.track, sess = this.sess, n = this.allCars.length;
    var order = this.allCars.slice(1);
    // player grid slot
    var slot = 0;
    if (sess.gridPos === 'back') slot = n - 1;
    else if (sess.gridPos === 'mid') slot = Math.floor(n * 0.5);
    else if (sess.gridPos === 'front') slot = 0;
    else if (sess.gridPos === 'quali' || sess.gridPos === 'heat' || sess.gridPos === 'standings') slot = Math.max(0, Math.min(n - 1, this.event.playerGridSlot || Math.floor(n / 2)));
    // AI sorted fastest-first behind/ahead
    order.sort(function (a, b) { return b.skill - a.skill; });
    var grid = order.slice(0, slot).concat([this.player]).concat(order.slice(slot));
    if (sess.staggered) grid = order.concat([this.player]);
    var w = tr.pts[0].w;
    grid.forEach(function (c, i) {
      var row = Math.floor(i / 2), col = i % 2;
      var s = (tr.closed ? 0 : tr.startS) - 8 - row * 9 - col * 4.5;
      var lat = (col ? -1 : 1) * Math.min(w * 0.45, 3.2);
      if (tr.style === 'drag') { s = tr.startS - 0.5; lat = (i === 0 ? 1 : -1) * 5.3; }
      if (sess.staggered) { s = tr.startS + (grid.length - 1 - i) * 0; lat = 0; }
      if (sess.kind === 'solo' && !sess.flying && c.isPlayer) { s = tr.startS - 3; lat = 0; }
      if (sess.flying && c.isPlayer) { s = tr.closed ? -260 : tr.startS - 3; lat = 0; }
      if (sess.tandem && !c.isPlayer) { s = (tr.closed ? 0 : tr.startS) - 2; lat = 0; }
      if (sess.tandem && c.isPlayer) { s = (tr.closed ? 0 : tr.startS) - 16; lat = 0; }
      c.gridIdx = i;
      if (c.isPlayer) {
        var p = RX.trackAt(tr, s, lat), st = c.st;
        st.x = p.x; st.z = p.z; st.heading = Math.atan2(p.tx, p.tz); st.idx = p.idx; st.y = RX.roadHeight(p.p, lat);
        st.vx = sess.flying ? Math.min(st.spec.vtop * 0.55, 45) : 0;
        if (sess.flying && st.spec.gears > 1) { st.gear = 1; }
        c.dist = s; c.lastS = (tr.closed ? (s + tr.length) % tr.length : s);
        // the run from the grid to the line is not a lap: the first counted crossing completes lap 1
        c.lapCount = sess.flying ? -1 : 0;
      } else {
        c.d = s; c.lat = lat; c.laneBias = tr.style === 'oval' ? lat / 3 : (c.laneBias || 0);
        if (sess.staggered) { c.d = tr.startS + (grid.length - 1 - i) * 120 + 60; c.launchDelay = 0; }
        if (sess.tandem) c.launchDelay = 0.2;
        c.place(RX.trackAt(tr, c.s(), lat));
      }
    });
    if (sess.flying) { this.player.lap = -1; }
  };

  Race.prototype.makeRivals = function () {
    var self = this, sess = this.sess, tr = this.track, car = this.cfg.car;
    var list = [], n = 9, rnd = this.rnd;
    var pool = RX.sportById[car.sport].carList;
    for (var i = 0; i < n; i++) {
      var c = pool[Math.floor(rnd() * pool.length)];
      var spec = RX.carSpec(c, RX.defaultCustom(c));
      var prof = RX.speedProfile(tr, spec, 1, { rain: this.rain });
      var t = 0, a = tr.closed ? 0 : tr.startIdx, b = tr.closed ? tr.N : Math.min(tr.N, Math.round(tr.finishS / tr.ds));
      for (var k = a; k < b; k++) t += tr.ds / Math.max(2, prof[k]);
      t /= G.settings.difficulty * (0.95 + rnd() * 0.07);
      list.push({ name: RX.DRIVER_NAMES[(i * 5 + 3) % RX.DRIVER_NAMES.length], car: c, time: t });
    }
    list.sort(function (a, b) { return a.time - b.time; });
    return list;
  };

  Race.prototype.buildMinimap = function () {
    var tr = this.track, c = RX.canvas(220, 220), g = c.getContext('2d');
    var b = tr.bounds, sx = b.maxx - b.minx, sz = b.maxz - b.minz, sc = 190 / Math.max(sx, sz, 1);
    this.mm = { canvas: c, sc: sc, ox: 110 - (b.minx + sx / 2) * sc, oz: 110 - (b.minz + sz / 2) * sc };
    var self = this;
    g.lineCap = 'round'; g.lineJoin = 'round';
    [[9, 'rgba(0,0,0,0.6)'], [5, '#e8e8e8']].forEach(function (s) {
      g.strokeStyle = s[1]; g.lineWidth = s[0]; g.beginPath();
      tr.pts.forEach(function (p, i) { var x = -p.x * sc + 220 - self.mm.ox, y = p.z * sc + self.mm.oz; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (tr.closed) g.closePath(); g.stroke();
    });
    var p0 = tr.pts[tr.startIdx];
    g.fillStyle = '#ffcc00'; g.fillRect(-p0.x * sc + 220 - this.mm.ox - 4, p0.z * sc + this.mm.oz - 4, 8, 8);
    this.mm.base = c;
  };
  Race.prototype.mmXY = function (x, z) { return [-x * this.mm.sc + 220 - this.mm.ox, z * this.mm.sc + this.mm.oz]; };

  // ---------------- drag racing ----------------
  Race.prototype.dragSetup = function () {
    this.drag = { phase: 'stage', t: 0, greenAt: 0, reaction: null, oppReaction: 0.04 + this.rnd() * 0.1, et: null, oppEt: null, trap: 0, oppTrap: 0, dial: 0 };
    var sess = this.sess;
    if (sess.bracket) {
      // predicted ET from a quick sim of the player car
      var spec = this.player.st.spec, v = 0, x = 0, t = 0, dt = 0.01, L = this.track.dragLen;
      while (x < L && t < 60) { var a = Math.min(spec.P * 0.86 / (Math.max(3, v) * spec.mass), spec.mu * 9.81 * 0.75 + spec.kd * v * v / spec.mass) - spec.cdrag * v * v / spec.mass; v += a * dt; x += v * dt; t += dt; }
      this.drag.dial = Math.round(t * 1.04 * 100) / 100;
    }
    if (sess.flyingMile) { this.drag.flyStart = this.track.dragLen * 0.62; this.drag.flyEnd = this.track.dragLen * 0.62 + 1609; }
  };

  // ---------------- per-frame ----------------
  Race.prototype.onKey = function (code) {
    var self = this, p = this.player;
    if (code === 'KeyC') { this.camMode = (this.camMode + 1) % 6; G.camMode = this.camMode; this.flash(['Chase cam', 'Far chase', 'Cockpit', 'Hood', 'Bumper', 'TV cameras'][this.camMode]); }
    if (code === 'Escape') RX.pause();
    if (code === 'KeyR') this.resetCar();
    if (code === 'KeyP') this.requestPit();
    if (code === 'KeyH') { this.lightsForced = !this.lightsForced; }
    if (code === 'KeyM') { G.settings.mirror = !G.settings.mirror; }
    if (code === 'KeyF') this.useBoost();
    if (code === 'KeyN' && p.cus.nitro) { if (p.st.nitro > 0) p.st.nitroOn = !p.st.nitroOn; }
    if (code === 'Enter' && this.drag && this.drag.phase === 'stage') this.drag.phase = 'staged';
    if (code === 'KeyG') { p.cus.gearbox = p.cus.gearbox === 'manual' ? 'auto' : 'manual'; this.flash(p.cus.gearbox === 'manual' ? 'Manual gears (E/Q)' : 'Automatic gears'); }
    if (code === 'KeyT') { p.cus.tc = p.cus.tc ? 0 : 1; this.flash('Traction control ' + (p.cus.tc ? 'ON' : 'OFF')); }
  };

  Race.prototype.flash = function (txt, dur, cls) { RX.ui.flash(txt, dur || 1.4, cls); };

  Race.prototype.useBoost = function () {
    var p = this.player, st = p.st, car = p.car;
    if (this.sess.attack) {
      if (this.attackArmed && !this.attackT && this.attackUses < 2) { this.attackT = 30; this.attackUses++; this.flash('ATTACK MODE', 1.5, 'cyan'); }
      else if (!this.attackArmed) this.flash('Drive through the blue activation zone to arm Attack Mode');
      return;
    }
    if (car.sport === 'f1' && car.year >= 2011 || car.sport === 'indy' && car.year >= 2012) {
      // DRS / push-to-pass
      if (car.sport === 'indy') { if ((this.p2p == null ? (this.p2p = 200) : this.p2p) > 0) { this.p2pOn = !this.p2pOn; this.flash('Push-to-pass ' + (this.p2pOn ? 'ON' : 'off')); } return; }
      var ahead = this.gapAhead();
      if (Math.abs(st.latG) < 0.8 && (ahead < 1.0 || this.sess.kind === 'solo' || this.sess.timeTrial)) { st.drs = true; this.flash('DRS OPEN', 0.8, 'green'); }
      else this.flash('DRS not available' + (ahead >= 1 ? ' (need < 1 s gap)' : ''));
      return;
    }
    if (p.cus.nitro) { if (st.nitro > 0) st.nitroOn = !st.nitroOn; return; }
    if (this.sess.kind === 'drag' && st.chute === false && this.drag && this.drag.phase === 'done') { st.chute = true; }
  };

  Race.prototype.gapAhead = function () {
    var me = this.player, best = Infinity;
    var myProg = this.progress(me);
    var v = Math.max(5, me.st.vx);
    for (var i = 0; i < this.ai.length; i++) { var d = this.progress(this.ai[i]) - myProg; if (d > 0 && d / v < best) best = d / v; }
    return best;
  };

  Race.prototype.requestPit = function () {
    var p = this.player, st = p.st, tr = this.track;
    if (!tr.closed) return;
    var inZone = st.s > tr.pitStart || st.s < tr.pitEnd + 40;
    if (!inZone) { this.flash('Pit lane is just before the start/finish line'); return; }
    if (st.vx > 22) { this.flash('Slow down below ' + RX.fmtSpeed(22) + ' ' + RX.unitLabel() + ' to pit'); return; }
    if (this.pitting) return;
    this.pitting = { t: 0, dur: 2.8 + (st.fuel < 1 && this.sess.fuel ? (1 - st.fuel) * 6 : 0) + (st.damage * 6) };
    p.pitStops++;
    this.flash('PIT STOP', this.pitting.dur, 'yellow');
  };

  Race.prototype.resetCar = function () {
    var p = this.player, st = p.st, tr = this.track;
    var lat = Math.max(-tr.pts[st.idx].w * 0.5, Math.min(tr.pts[st.idx].w * 0.5, st.lat * 0.3));
    var pos = RX.trackAt(tr, st.s, lat);
    st.x = pos.x; st.z = pos.z; st.heading = Math.atan2(pos.tx, pos.tz); st.vx = 0; st.vy = 0; st.r = 0; st.onGround = true; st.y = RX.roadHeight(pos.p, lat) + 0.2;
    st.gear = 1;
    this.resetPenalty = (this.resetPenalty || 0) + (this.sess.kind === 'solo' ? 5 : 0);
    if (this.sess.kind === 'solo') this.flash('Reset: +5 s');
    p.invalidLap = true;
  };

  Race.prototype.progress = function (c) {
    if (c.isPlayer) return c.dist;
    return c.d;
  };

  // Standard per-frame update
  Race.prototype.update = function (dt) {
    var self = this, sess = this.sess, tr = this.track, p = this.player, st = p.st;
    this.t += dt;
    // ---- input ----
    var gp = readPad();
    var inp = this.readInput(dt, gp);
    // ---- start procedures ----
    if (!this.started && sess.kind !== 'drag') {
      this.countdown -= dt;
      this.startLightsUpdate();
      if (this.countdown <= 0) { this.started = true; this.raceTime = 0; this.flash('GO!', 1, 'green'); if (G.audio) G.audio.beep(880, 0.4, 0.2); this.player.lapStart = 0; }
      // engine revs on the grid but no movement
      inp.handbrake = true; if (inp.throttle > 0) inp.brake = 1;
    }
    if (sess.kind === 'drag') this.dragUpdate(dt, inp);
    if (this.pitting) {
      this.pitting.t += dt; inp.throttle = 0; inp.brake = 1;
      if (this.pitting.t >= this.pitting.dur) { st.wear = 0; st.fuel = 1; st.damage = 0; st.energy = 1; this.pitting = null; this.flash('GO GO GO', 1, 'green'); p.pitDone = true; }
    }
    if (p.finished && sess.kind !== 'drag') { inp.throttle = 0; inp.brake = 0.35; inp.steer = this.autoSteer(); }
    if (this.started) this.raceTime += dt;
    // ---- environment for physics ----
    var env = { track: tr, rain: this.rain, wear: sess.wear || 0, fuel: sess.fuel || 0, damage: sess.damage && G.settings.damage, energyMode: sess.energy ? 1 : 0 };
    if (this.p2pOn && this.p2p > 0) { env.powerMul = 1.08; this.p2p -= dt; if (this.p2p <= 0) this.p2pOn = false; }
    if (this.attackT > 0) { env.attack = true; this.attackT -= dt; if (this.attackT <= 0) { this.attackT = 0; this.flash('Attack mode over'); } }
    // drafting & dirty air
    var dr = this.draftFor(st.s, st.lat, p, true);
    env.draft = dr.draft * (sess.draft || 0.6); env.dirtyAir = dr.dirty;
    if (st.drs && (inp.brake > 0.1 || Math.abs(st.latG) > 1.2)) st.drs = false;
    if (st.nitroOn) { st.nitro -= dt / 8; if (st.nitro <= 0) { st.nitro = 0; st.nitroOn = false; } }
    // ---- physics substeps ----
    var sub = 2, h = dt / sub;
    var prevS = st.s;
    var hold = !this.started || (this.drag && this.drag.phase !== 'run' && this.drag.phase !== 'done');
    for (var k = 0; k < sub; k++) {
      RX.stepPhysics(st, inp, h, env);
      if (hold) { st.vx = 0; st.vy = 0; st.r = 0; }
    }
    inp.shiftUp = inp.shiftDown = false;
    if (st.flame > 0.7 && G.audio && Math.random() < 0.3) G.audio.backfire();
    // ---- progress / laps ----
    this.trackProgress(p, prevS);
    // ---- AI ----
    var others = this.allCars.map(function (c) { return c.isPlayer ? { sNow: c.st.s, latNow: c.st.lat, vNow: c.st.vx, ref: c, out: c.out } : { sNow: c.s(), latNow: c.lat, vNow: c.v, ref: c, out: c.out }; });
    var aenv = { started: this.started && (!this.drag || this.drag.phase === 'run' || this.drag.phase === 'done'), t: this.raceTime - (this.drag ? this.drag.oppReaction : 0), rubber: G.settings.catchup ? function (a) { return self.rubberBand(a); } : null, draftFor: function (a) { return self.draftFor(a.s(), a.lat, a, false).draft * (sess.draft || 0.6); } };
    this.ai.forEach(function (a, i) {
      if (a.out) return;
      var ob = others.filter(function (o) { return o.ref !== a; });
      var prevD = a.d;
      a.update(dt, ob, aenv);
      if (a.finished && tr.closed) { a.v = Math.max(0, a.v - 4 * dt); }
      self.aiLaps(a, prevD);
      self.aiPit(a, dt);
    });
    this.separateAI(dt);
    this.collisions(dt);
    // ---- mode rules ----
    this.modeUpdate(dt, inp);
    // ---- visuals ----
    this.updateVisuals(dt, inp);
    this.updateCamera(dt);
    this.updateAudio(dt);
    if (this.t - this.lastHudT > 0.05) { this.lastHudT = this.t; RX.ui.hud(this); }
  };

  Race.prototype.autoSteer = function () {
    var st = this.player.st, tr = this.track;
    var ahead = RX.trackAt(tr, st.s + 15, 0);
    var dx = ahead.x - st.x, dz = ahead.z - st.z, ch = Math.cos(st.heading), sh = Math.sin(st.heading);
    var lat = dx * ch - dz * sh, fwd = dx * sh + dz * ch;
    return Math.max(-1, Math.min(1, Math.atan2(lat, fwd) * 2));
  };

  Race.prototype.readInput = function (dt, gp) {
    var p = this.player, st = p.st;
    var I = this.inp || (this.inp = { steer: 0, throttle: 0, brake: 0, handbrake: false, brakeHeld: 0 });
    var analog = false;
    var tgtSteer = (key('left') ? 1 : 0) - (key('right') ? 1 : 0);
    var thr = key('up') ? 1 : 0, brk = key('down') ? 1 : 0;
    if (gp && (Math.abs(gp.steer) > 0 || gp.throttle > 0.02 || gp.brake > 0.02)) {
      analog = Math.abs(gp.steer) > 0.02;
      if (analog) tgtSteer = gp.steer * Math.abs(gp.steer) * 0.4 + gp.steer * 0.6;
      thr = Math.max(thr, gp.throttle); brk = Math.max(brk, gp.brake);
    }
    if (analog) I.steer = tgtSteer;
    else {
      var rate = tgtSteer === 0 ? 6 : (Math.sign(tgtSteer) !== Math.sign(I.steer) && I.steer !== 0 ? 8 : 3.2);
      I.steer += Math.max(-rate * dt, Math.min(rate * dt, tgtSteer - I.steer));
    }
    I.throttle += Math.max(-dt * 8, Math.min(dt * (analog ? 20 : 6), thr - I.throttle));
    I.brake += Math.max(-dt * 10, Math.min(dt * (analog ? 20 : 7), brk - I.brake));
    I.handbrake = key('hand') || (gp && gp.hand);
    I.brakeHeld = brk > 0.5 ? I.brakeHeld + dt : 0;
    I.analog = analog;
    I.assist = G.settings.steerAssist && !analog;
    if (gp) {
      if (gp.presses[5]) I.shiftUp = true;
      if (gp.presses[4]) I.shiftDown = true;
      if (gp.presses[3]) this.onKey('KeyC');
      if (gp.presses[9]) RX.pause();
      if (gp.presses[2]) this.resetCar();
      if (gp.presses[12]) this.useBoost();
      if (gp.presses[13]) this.requestPit();
      this.padBack = gp.lookBack;
    }
    // edge-triggered shift keys
    var su = key('shiftUp'), sd = key('shiftDown');
    if (su && !this._su) I.shiftUp = true; if (sd && !this._sd) I.shiftDown = true;
    if ((I.shiftUp || I.shiftDown) && G.audio) G.audio.shift();
    this._su = su; this._sd = sd;
    this.lookBack = G.keys.KeyB || this.padBack;
    return I;
  };

  Race.prototype.startLightsUpdate = function () {
    var L = this.world.startLights; if (!L || !L.length) return;
    var cd = this.countdown, lit = Math.max(0, Math.min(5, Math.floor((4.2 - cd) / 0.7)));
    if (cd <= 0) lit = 0;
    L.forEach(function (m, i) { m.color.setHex(i < lit ? 0xff1a1a : 0x220000); });
    if (lit !== this._lit) { this._lit = lit; if (lit > 0 && G.audio) G.audio.beep(440, 0.15, 0.15); }
  };

  Race.prototype.rubberBand = function (a) {
    // gentle catch-up: AI far ahead eases off a touch, AI far behind pushes slightly
    var d = this.progress(a) - this.progress(this.player);
    if (!this.track.closed) return 1;
    if (d > 200) return 0.96;
    if (d < -250) return 1.04;
    return 1;
  };

  Race.prototype.draftFor = function (s, lat, me, isPlayer) {
    var tr = this.track, best = 0, dirty = 0;
    for (var i = 0; i < this.allCars.length; i++) {
      var o = this.allCars[i]; if (o === me || o.out) continue;
      var os = o.isPlayer ? o.st.s : o.s(), ol = o.isPlayer ? o.st.lat : o.lat;
      var ds = os - s; if (tr.closed) { if (ds < -tr.length / 2) ds += tr.length; if (ds > tr.length / 2) ds -= tr.length; }
      if (ds > 3 && ds < 45 && Math.abs(ol - lat) < 2.2) {
        var f = 1 - ds / 45; best = Math.max(best, f * 0.35);
        if (ds < 18) dirty = Math.max(dirty, (1 - ds / 18) * 0.6);
      }
    }
    return { draft: best, dirty: this.player.car.body === 'openwheel' ? dirty : dirty * 0.3 };
  };

  // laps, sectors, finish
  Race.prototype.trackProgress = function (p, prevS) {
    var st = p.st, tr = this.track, sess = this.sess;
    var ds = st.s - (p.lastS == null ? st.s : p.lastS);
    if (tr.closed) { if (ds < -tr.length / 2) ds += tr.length; if (ds > tr.length / 2) ds -= tr.length; }
    p.lastS = st.s;
    p.dist = (p.dist || 0) + ds;
    if (!this.started) return;
    if (tr.closed) {
      var L = tr.length;
      // sector checkpoints guard against cutting
      var sec = Math.floor(((st.s % L) + L) % L / (L / 3));
      if (sec === (p.sector + 1) % 3) p.sector = sec;
      var lapNow = Math.floor((p.dist + 0.001) / L);
      if (p.lapCount == null) p.lapCount = lapNow;
      if (lapNow > p.lapCount) {
        p.lapCount = lapNow;
        this.completeLap(p);
      }
      if (lapNow < p.lapCount - 1) p.lapCount = lapNow; // reversed past the line
    } else {
      var travelled = st.s - tr.startS;
      if (!p.finished && st.s >= tr.finishS) { p.finished = true; p.finishTime = this.raceTime + (this.resetPenalty || 0); this.onPlayerFinish(); }
      p.stageFrac = Math.max(0, Math.min(1, travelled / (tr.finishS - tr.startS)));
    }
  };

  Race.prototype.completeLap = function (p) {
    var sess = this.sess, now = this.raceTime;
    if (p.lap === -1 && sess.flying) { p.lap = 0; p.lapStart = now; p.invalidLap = false; this.flash('Flying lap started'); return; }
    var lt = now - p.lapStart;
    p.lapStart = now;
    var valid = !p.invalidLap;
    p.invalidLap = false;
    if (lt > 3) {
      p.laps.push({ time: lt, valid: valid });
      if (valid && lt < p.best) { p.best = lt; if (sess.ghost) this.saveGhost(); this.flash(p.laps.length > 1 ? 'Best lap ' + RX.fmtTime(lt) : 'Lap ' + RX.fmtTime(lt), 2, 'purple'); }
      else this.flash('Lap ' + RX.fmtTime(lt) + (valid ? '' : ' (invalid)'), 2);
      if (sess.ghost) { this.ghostRec = []; this.ghostT = 0; }
    }
    p.lap++;
    if (sess.mandatoryPit && p.lap === sess.laps - 1 && !p.pitDone) this.flash('Mandatory pit stop this lap! (P in pit lane)', 3, 'yellow');
    if (sess.timeLimit) {
      if (this.raceTime >= sess.timeLimit) this.finishPlayer();
    } else if (sess.elimination) {
      this.eliminate();
    } else if (p.lap >= sess.laps && !p.finished) this.finishPlayer();
    if (sess.laps - p.lap === 1 && !sess.elimination && !sess.timeLimit && !p.finished && !sess.quali && !sess.timeTrial) this.flash('FINAL LAP', 2, 'white');
  };

  Race.prototype.aiLaps = function (a, prevD) {
    var tr = this.track, sess = this.sess;
    if (!this.started) return;
    if (tr.closed) {
      var L = tr.length, prevLap = Math.floor(prevD / L), nowLap = Math.floor(a.d / L);
      if (nowLap > prevLap && a.d > 0) {
        var lt = this.raceTime - a.lapStart; a.lapStart = this.raceTime;
        if (a.lap > 0 && lt > 3) { a.laps.push(lt); a.best = Math.min(a.best, lt); }
        a.lap++; // a.lap = line crossings; crossing N+1 completes lap N
        if (!a.finished && !sess.elimination) {
          if (sess.timeLimit ? this.raceTime >= sess.timeLimit : a.lap > sess.laps) { a.finished = true; a.finishTime = this.raceTime; }
        }
      }
    } else if (!a.finished && a.s() >= tr.finishS) { a.finished = true; a.finishTime = this.raceTime; }
  };

  Race.prototype.aiPit = function (a, dt) {
    var sess = this.sess, tr = this.track;
    if (!sess.mandatoryPit && !sess.fuel) return;
    if (a.pitStops === 0 && a.lap >= Math.max(1, Math.floor(sess.laps / 2)) && a.s() > tr.pitStart && a.pitT <= 0 && !a.finished) {
      a.pitT = 3 + this.rnd() * 3; a.pitStops = 1;
    }
  };

  Race.prototype.eliminate = function () {
    // last car at the end of each player lap is out
    var alive = this.allCars.filter(function (c) { return !c.out; });
    if (alive.length <= 1) return;
    var self = this;
    alive.sort(function (a, b) { return self.progress(b) - self.progress(a); });
    var last = alive[alive.length - 1];
    last.out = true; last.outPos = alive.length;
    if (last.isPlayer) { this.flash('ELIMINATED', 3, 'red'); this.finishPlayer(); }
    else { last.rig.root.visible = false; this.flash(last.name + ' eliminated — ' + (alive.length - 1) + ' left', 2, 'red'); if (alive.length - 1 === 1) { this.flash('YOU WIN', 3, 'green'); this.finishPlayer(); } }
  };

  Race.prototype.finishPlayer = function () {
    var p = this.player;
    if (p.finished) return;
    p.finished = true; p.finishTime = this.raceTime;
    this.onPlayerFinish();
  };

  Race.prototype.onPlayerFinish = function () {
    var self = this;
    if (this.sess.kind === 'race' || this.sess.timeLimit) {
      var pos = this.standings().indexOf(this.player) + 1;
      this.flash(pos === 1 ? 'WINNER!' : 'Finished P' + pos, 3, pos === 1 ? 'green' : 'white');
    } else this.flash('FINISH  ' + RX.fmtTime(this.player.finishTime), 3, 'green');
    if (G.audio && G.audio.ok) { this.crowdT = 4; }
    setTimeout(function () { if (G.race === self) RX.ui.results(self); }, this.sess.kind === 'drag' ? 3500 : 3000);
  };

  Race.prototype.standings = function () {
    var self = this;
    var list = this.allCars.slice();
    list.sort(function (a, b) {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.out && b.out) return (a.outPos || 0) - (b.outPos || 0);
      if (a.finished && b.finished && a.finishTime != null && b.finishTime != null) return a.finishTime - b.finishTime;
      if (a.finished !== b.finished && self.track.closed) { var pa = self.progress(a), pb = self.progress(b); if (Math.abs(pa - pb) > 50) return pb - pa; return a.finished ? -1 : 1; }
      return self.progress(b) - self.progress(a);
    });
    return list;
  };

  // ---------------- mode-specific ----------------
  Race.prototype.modeUpdate = function (dt, inp) {
    var self = this, sess = this.sess, p = this.player, st = p.st, tr = this.track;
    // attack mode arming zone
    if (sess.attack) {
      if (this.attackUses == null) { this.attackUses = 0; }
      var dz = Math.abs(st.s - tr.attackS);
      if (dz < 10 && st.lat > tr.pts[0].w * 0.4 && !this.attackArmed && this.attackUses < 2) { this.attackArmed = true; this.flash('Attack Mode armed — press F', 2, 'cyan'); }
      if (sess.energy && st.energy <= 0.0001 && !this.energyWarn) { this.energyWarn = true; this.flash('BATTERY DEPLETED', 2, 'red'); }
    }
    // joker lap
    if (sess.joker) {
      var dj = st.s - tr.jokerS;
      if (Math.abs(dj) < 12 && st.lat < -tr.pts[0].w * 0.25 && !this._inJoker) { this._inJoker = true; if (!p.jokerDone) { p.jokerDone = true; this.resetPenalty = (this.resetPenalty || 0); this.jokerPenaltyT = 2.0; this.flash('Joker lap taken', 1.5, 'yellow'); } }
      if (Math.abs(dj) > 30) this._inJoker = false;
      if (this.jokerPenaltyT > 0) { this.jokerPenaltyT -= dt; inp.throttle *= 0.5; }
      this.ai.forEach(function (a) { if (!a.jokerDone && a.lap >= 1 && Math.abs(a.s() - tr.jokerS) < 10) { a.jokerDone = true; a.pitT = 1.6; } });
    }
    // rally pace notes
    if (this.notes && this.started) {
      while (this.noteIdx < this.notes.length && this.notes[this.noteIdx].s < st.s + Math.max(60, st.vx * 3.2)) {
        var n = this.notes[this.noteIdx++];
        RX.ui.paceNote(n);
        if (G.audio && G.settings.voice !== false) G.audio.say(n.text);
      }
    }
    // checkpoints
    if (this.cpS && this.cpIdx < this.cpS.length && st.s >= this.cpS[this.cpIdx]) {
      this.cpIdx++;
      if (sess.timeAttack) { this.timeLimitLeft += 14; this.flash('CHECKPOINT +14 s', 1.5, 'green'); }
      else this.flash('Waypoint ' + this.cpIdx + '/' + this.cpS.length + '  ' + RX.fmtTime(this.raceTime), 1.5, 'green');
      if (this.world.checkpointMeshes && this.world.checkpointMeshes[this.cpIdx - 1]) this.world.checkpointMeshes[this.cpIdx - 1].visible = false;
    }
    if (sess.timeAttack && this.started && !p.finished) {
      this.timeLimitLeft -= dt;
      if (this.timeLimitLeft <= 0) { this.timeLimitLeft = 0; p.dnf = true; this.flash('OUT OF TIME', 3, 'red'); this.finishPlayer(); }
    }
    // drift scoring
    if (sess.drift && this.started && !p.finished) {
      var ang = st.driftAngle || 0, sp = st.vx;
      var D = this.driftS || (this.driftS = { score: 0, combo: 0, mult: 1, chain: 0, idle: 0 });
      if (ang > 0.17 && sp > 8 && st.onGround && !st.offTrack) {
        var pts = (ang * 57) * (sp * 0.6) * dt * 0.6;
        if (sess.tandem && this.ai[0]) { var d = Math.abs(this.ai[0].d - p.dist); if (d < 18) { pts *= 1 + (18 - d) / 9; D.prox = true; } else D.prox = false; }
        D.chain += pts; D.idle = 0; D.mult = Math.min(5, 1 + D.chain / 1500);
      } else {
        D.idle += dt;
        if (D.idle > 0.9 && D.chain > 0) { D.score += Math.round(D.chain * D.mult); D.last = Math.round(D.chain * D.mult); RX.ui.flash('+' + D.last + (D.mult > 1.5 ? '  x' + D.mult.toFixed(1) : ''), 1, 'purple'); D.chain = 0; D.mult = 1; }
      }
      if (st.wallHit > 2 || (st.offTrack && D.chain > 0)) { if (D.chain > 0) RX.ui.flash('Combo lost', 0.8, 'red'); D.chain = 0; D.mult = 1; }
    }
    // endurance day/night
    if (sess.dayNight) this.dayNight();
    // timed race end
    if (sess.timeLimit && this.raceTime >= sess.timeLimit && !this._timeUp) { this._timeUp = true; this.flash('Final lap — time is up', 2, 'white'); }
    // rally / climb finish times compared to rivals in HUD done by ui
    // flying-mile & top speed handled in dragUpdate
  };

  Race.prototype.dayNight = function () {
    var sess = this.sess, f = (this.raceTime / sess.timeLimit) * 24 + 15; // start at 15:00
    var hour = f % 24;
    var sunH = Math.sin((hour - 6) / 12 * Math.PI); // >0 day
    var day = Math.max(0, Math.min(1, sunH * 2 + 0.2));
    var L = this.world.lights;
    L.sun.intensity = 0.15 + day * 1.25;
    L.hemi.intensity = 0.25 + day * 0.55;
    var dusk = Math.max(0, 1 - Math.abs(sunH) * 4);
    L.sun.color.setRGB(1, 0.75 + day * 0.25 - dusk * 0.2, 0.6 + day * 0.35 - dusk * 0.3);
    var fog = new THREE.Color(this.world.theme.fog).multiplyScalar(0.12 + day * 0.88);
    fog.lerp(new THREE.Color('#d08050'), dusk * 0.4 * day);
    this.scene.fog.color.copy(fog); this.scene.background = fog;
    if (this.world.sky) this.world.sky.material.color.setScalar(0.1 + day * 0.9);
    this.night = day < 0.35;
    this.hour = hour;
    if (this.headlight) this.headlight.intensity = this.night ? 2.2 : 0;
  };

  Race.prototype.dragUpdate = function (dt, inp) {
    var D = this.drag, p = this.player, st = p.st, tr = this.track, sess = this.sess, tree = this.world.tree;
    D.t += dt;
    function lamp(row, lane, on) { if (!tree) return; var m = tree.mats[row][lane]; m.color.copy(on ? m.userData.on : m.userData.off); }
    if (D.phase === 'stage') {
      lamp(0, 0, true); lamp(0, 1, !!this.ai.length);
      if (D.t > 1.2) { D.phase = 'staged'; }
    }
    if (D.phase === 'staged') {
      lamp(1, 0, true); lamp(1, 1, !!this.ai.length);
      D.phase = 'tree'; D.treeT = 0.6 + Math.random() * 1.2;
      this.flash(sess.bracket ? 'Dial-in ' + D.dial.toFixed(2) + ' s — launch on green!' : 'Staged — launch on green!', 1.5);
    }
    if (D.phase === 'tree') {
      D.treeT -= dt;
      if (D.treeT <= 0) {
        // pro tree: all ambers together, green 0.4 s later
        lamp(2, 0, true); lamp(3, 0, true); lamp(4, 0, true); lamp(2, 1, true); lamp(3, 1, true); lamp(4, 1, true);
        if (G.audio && !D.amb) { D.amb = true; G.audio.beep(600, 0.1, 0.15); }
        if (D.treeT <= -0.4) {
          D.phase = 'run'; D.greenT = this.t; this.started = true; this.raceTime = 0;
          if (D.launchT != null && !sess.topSpeed && !sess.flyingMile) { D.reaction = D.launchT - this.t; D.redlit = true; lamp(6, 0, true); }
          [2, 3, 4].forEach(function (r) { lamp(r, 0, false); lamp(r, 1, false); });
          lamp(5, 0, true); lamp(5, 1, true);
          if (G.audio) G.audio.beep(1200, 0.25, 0.2);
        }
      }
      // trans-brake: hold brake + throttle to rev; launching (throttle without brake) before green is a red light
      var launching = inp.throttle > 0.5 && inp.brake < 0.3;
      if (launching && !D.wasLaunching && D.launchT == null) D.launchT = this.t;
      if (!launching && D.launchT != null && D.launchT > this.t - 0.05) D.launchT = null;
      D.wasLaunching = launching;
      inp.handbrake = true;
    }
    if (D.phase === 'run') {
      if (D.reaction == null && inp.throttle > 0.5 && inp.brake < 0.3) D.reaction = this.t - D.greenT;
      if (D.reaction == null) { inp.handbrake = true; st.vx = 0; }
      var travelled = st.s - tr.startS;
      if (sess.flyingMile) {
        if (D.flyT0 == null && travelled >= D.flyStart) { D.flyT0 = this.raceTime; this.flash('Measured mile — GO', 1, 'green'); }
        if (D.flyT0 != null && D.flyT1 == null && travelled >= D.flyEnd) { D.flyT1 = this.raceTime; D.avg = 1609 / (D.flyT1 - D.flyT0); this.flash('Average ' + RX.fmtSpeed(D.avg) + ' ' + RX.unitLabel(), 3, 'green'); this.endDrag(); }
      } else if (D.et == null && travelled >= tr.dragLen) {
        D.et = this.raceTime - (D.reaction || 0); D.trap = st.vx;
        if (tree) RX.drawBoard(tree.boards[0], D.et.toFixed(3), RX.fmtSpeed(D.trap) + (G.settings.units === 'mph' ? ' mph' : ' kmh'));
        this.endDrag();
      }
      D.topSpeed = Math.max(D.topSpeed || 0, st.vx);
      var opp = this.ai[0];
      if (opp && D.oppEt == null && opp.d - tr.startS >= tr.dragLen) {
        D.oppEt = this.raceTime - D.oppReaction; D.oppTrap = opp.v;
        if (tree) RX.drawBoard(tree.boards[1], D.oppEt.toFixed(3), RX.fmtSpeed(D.oppTrap) + (G.settings.units === 'mph' ? ' mph' : ' kmh'));
        if (D.et == null) lamp(5, 1, true);
      }
      if (opp && opp.d - tr.startS >= tr.dragLen + 40) opp.chute = opp.car.hp > 2000;
    }
    if (D.phase === 'done') {
      if (st.vx > 20 && p.car.hp > 1500 && D.t - D.doneT > 0.4) st.chute = true;
      if (!this.ai.length || D.oppEt != null || D.t - D.doneT > 8) {
        if (!p.finished) { p.finished = true; p.finishTime = D.et != null ? D.et : this.raceTime; this.onDragResult(); }
      }
    }
  };
  Race.prototype.endDrag = function () { this.drag.phase = 'done'; this.drag.doneT = this.drag.t; };
  Race.prototype.onDragResult = function () {
    var D = this.drag, sess = this.sess, self = this;
    var win;
    if (sess.bracket) {
      var mine = D.et - D.dial, opp = D.oppEt != null ? D.oppEt - (D.oppDial || D.oppEt * 1.01) : 9;
      win = (mine >= 0 && (opp < 0 || mine < opp)) && !D.redlit;
    } else {
      var myTotal = (D.reaction || 0) + (D.et || 99), oppTotal = D.oppReaction + (D.oppEt || 99);
      win = !D.redlit && myTotal < oppTotal;
    }
    D.win = this.ai.length ? win : true;
    this.flash(D.redlit ? 'RED LIGHT' : (this.ai.length ? (win ? 'WIN!' : 'LOSS') : 'RUN COMPLETE'), 3, D.redlit || (!win && this.ai.length) ? 'red' : 'green');
    setTimeout(function () { if (G.race === self) RX.ui.results(self); }, 3200);
  };

  // ---------------- collisions ----------------
  Race.prototype.collisions = function (dt) {
    var p = this.player, st = p.st, self = this;
    var pw = (p.rig.dims.W || 1.9) * 0.5, pl = (p.rig.dims.L || 4.5) * 0.5;
    var ch = Math.cos(st.heading), sh = Math.sin(st.heading);
    this.ai.forEach(function (a) {
      if (a.out || !a.rig) return;
      var dx = a.x - st.x, dz = a.z - st.z;
      var dist = Math.hypot(dx, dz);
      var aw = (a.rig.dims.W || 1.9) * 0.5, al = (a.rig.dims.L || 4.5) * 0.5;
      if (dist > pl + al + 1) return;
      // in player frame: oriented box overlap approximated
      var fx = dx * sh + dz * ch, lx = dx * ch - dz * sh;
      var ovF = (pl + al * 0.9) - Math.abs(fx), ovL = (pw + aw) - Math.abs(lx);
      if (ovF > 0 && ovL > 0) {
        var vAx = a.v * Math.sin(a.heading), vAz = a.v * Math.cos(a.heading);
        var wx = st.vx * sh + st.vy * ch, wz = st.vx * ch - st.vy * sh;
        var relx = vAx - wx, relz = vAz - wz;
        var nx, nz, pen;
        if (ovL < ovF) { var s = Math.sign(lx) || 1; nx = ch * s; nz = -sh * s; pen = ovL; } else { var s2 = Math.sign(fx) || 1; nx = sh * s2; nz = ch * s2; pen = ovF; }
        var mP = st.spec.mass, mA = a.spec.mass, tot = mP + mA;
        st.x -= nx * pen * mA / tot; st.z -= nz * pen * mA / tot;
        // push AI sideways / along
        var tA = Math.atan2(RX.trackAt(self.track, a.s(), 0).tx, RX.trackAt(self.track, a.s(), 0).tz);
        var pushLat = (nx * Math.cos(tA) - nz * Math.sin(tA)) * pen * mP / tot;
        a.lat += pushLat; a.latV += pushLat * 4;
        var vn = relx * nx + relz * nz;
        if (vn < 0) {
          var j = -(1 + 0.25) * vn / (1 / mP + 1 / mA);
          wx -= j / mP * nx; wz -= j / mP * nz;
          st.vx = wx * sh + wz * ch; st.vy = wx * ch - wz * sh;
          var along = (nx * Math.sin(tA) + nz * Math.cos(tA));
          a.v = Math.max(0, a.v + j / mA * along);
          if (-vn > 2) {
            st.r += (Math.random() - 0.5) * Math.min(1.5, -vn * 0.08);
            if (G.audio) G.audio.impact(-vn);
            self.sparks(new V3(st.x + nx * pw, st.y + 0.4, st.z + nz * pw), -vn);
            if (self.sess.damage && G.settings.damage) st.damage = Math.min(1, st.damage + (-vn) * 0.003);
            p.invalidLap = p.invalidLap || -vn > 6;
          }
        }
      }
    });
    if (st.wallHit > 1.5) {
      if (G.audio && (!this._wallT || this.t - this._wallT > 0.25)) { G.audio.impact(st.wallHit); this._wallT = this.t; }
      var n = st.lat > 0 ? 1 : -1, P = this.track.pts[st.idx];
      this.sparks(new V3(st.x + P.nx * n * 0.9, st.y + 0.3, st.z + P.nz * n * 0.9), st.wallHit);
    }
  };

  // keep AI cars from driving through each other: push apart sideways, the car behind backs off
  Race.prototype.separateAI = function (dt) {
    var A = this.ai, tr = this.track, L = tr.length;
    for (var i = 0; i < A.length; i++) {
      var a = A[i]; if (a.out) continue;
      for (var j = i + 1; j < A.length; j++) {
        var b = A[j]; if (b.out) continue;
        var ds = b.d - a.d;
        if (tr.closed) { ds = ((b.s() - a.s()) % L + L) % L; if (ds > L / 2) ds -= L; }
        var len = ((a.rig ? a.rig.dims.L : 4.5) + (b.rig ? b.rig.dims.L : 4.5)) * 0.5;
        var wid = ((a.rig ? a.rig.dims.W : 1.9) + (b.rig ? b.rig.dims.W : 1.9)) * 0.5 + 0.2;
        var dl = b.lat - a.lat;
        if (Math.abs(ds) < len && Math.abs(dl) < wid) {
          var ovL = wid - Math.abs(dl), ovF = len - Math.abs(ds);
          if (ovL < ovF * 0.8) { var push = ovL * 0.5 * (dl >= 0 ? 1 : -1); a.lat -= push; b.lat += push; }
          else { var back = ds >= 0 ? a : b, front = ds >= 0 ? b : a; back.d -= ovF * 0.6; back.v = Math.min(back.v, front.v * 0.98); }
        }
      }
    }
  };

  Race.prototype.sparks = function (pos, strength) {
    for (var i = 0; i < Math.min(14, 3 + strength); i++) {
      this.particles.emit(pos, new V3((Math.random() - 0.5) * 6, Math.random() * 3, (Math.random() - 0.5) * 6), '#ffb030', 0.12, 0.35 + Math.random() * 0.3, true, 0);
    }
  };

  // ---------------- visuals ----------------
  var tmpV = new V3(), tmpV2 = new V3();
  Race.prototype.poseCar = function (rig, x, y, z, heading, s, lat, extraPitch, extraRoll) {
    var tr = this.track;
    var a = RX.trackAt(tr, s - 1.5, lat), b = RX.trackAt(tr, s + 1.5, lat);
    var slope = Math.atan2(b.y - a.y, 3);
    var tH = Math.atan2(a.tx, a.tz);
    var rel = heading - tH;
    var pitch = -slope * Math.cos(rel);
    var bank = a.bank;
    var roll = -bank * Math.cos(rel) + slope * Math.sin(rel) * 0;
    rig.root.position.set(x, y, z);
    rig.root.rotation.order = 'YXZ';
    rig.root.rotation.set(pitch + (extraPitch || 0), heading, roll + (extraRoll || 0));
  };

  Race.prototype.updateVisuals = function (dt, inp) {
    var self = this, p = this.player, st = p.st, rig = p.rig, tr = this.track;
    // player car pose
    var airPitch = st.onGround ? 0 : Math.max(-0.4, Math.min(0.3, -st.vY * 0.02));
    this.poseCar(rig, st.x, st.y, st.z, st.heading, st.s, st.lat, airPitch, 0);
    var lightsOn = this.tod.night || this.night || this.fog || this.rain || this.lightsForced;
    RX.animateRig(rig, {
      speed: st.vx, wheelSpeed: st.wheelSpeed, wheelSpeedF: st.wheelSpeedF, steer: st.steer, swAngle: st.swAngle, pitch: st.pitch, roll: st.roll, heave: st.heave,
      brake: st.brake, throttle: st.throttle, rpm01: st.rpm01, flame: st.flame, drs: st.drs, lights: lightsOn, susp: st.susp, brakeHeat: st.brakeHeat * 2.5, latG: st.latG, chute: st.chute, camber: 0
    }, dt);
    if (this.headlight && !this.sess.dayNight) this.headlight.intensity = lightsOn ? 2.2 : 0;
    // dash display
    if (this.t - (rig.dash.last || 0) > 0.08) {
      rig.dash.last = this.t;
      var lapT = this.started ? this.raceTime - p.lapStart : 0;
      RX.drawDash(rig, { rpm01: st.rpm01, gear: st.gear === -1 ? 'R' : st.gear, kmh: RX.fmtSpeed(Math.abs(st.vx)), units: RX.unitLabel(), lap: RX.fmtTime(lapT), delta: p.best < Infinity ? 'B ' + RX.fmtTime(p.best) : '', extra: this.sess.fuel ? 'FUEL ' + Math.round(st.fuel * 100) + '%' : (this.sess.energy ? 'BATT ' + Math.round(st.energy * 100) + '%' : ''), extra2: st.drs ? 'DRS' : (p.cus.tc ? 'TC' : '') });
    }
    // AI poses
    this.ai.forEach(function (a) {
      if (!a.rig || a.out) return;
      self.poseCar(a.rig, a.x, a.y, a.z, a.heading, a.s(), a.lat, 0, 0);
      var lo = self.tod.night || self.night || self.fog || self.rain;
      RX.animateRig(a.rig, { speed: a.v, steer: a.steer, swAngle: a.steer * 7, pitch: a.pitch, roll: a.roll, heave: 0, brake: a.accel < -3 ? 1 : 0, throttle: a.accel > 0 ? 1 : 0, rpm01: a.rpm01 || 0.5, flame: 0, drs: false, lights: lo, latG: 0, chute: a.chute }, dt);
      // dust from AI on loose surfaces
      var surf = self.track.pts[a.idx || 0].surf;
      if (surf !== 'asphalt' && a.v > 8 && Math.random() < 0.5) {
        tmpV.set(a.x - Math.sin(a.heading) * 2, a.y + 0.3, a.z - Math.cos(a.heading) * 2);
        self.particles.emit(tmpV, tmpV2.set((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), RX.SURF[surf] ? RX.SURF[surf].color : '#9a8566', 1.2, 1.4, false, 4);
      }
    });
    // player particles: smoke, dust, rain spray
    var slip = Math.max(Math.abs(st.slipR) * 3 - 0.25, st.wheelspin, st.lockR || st.lockF ? 0.6 : 0, (st.driftAngle || 0) * 2 - 0.3);
    var surfP = st.surf, loose = surfP !== 'asphalt' && surfP !== 'salt';
    var spd = Math.abs(st.vx);
    var back = new V3(-Math.sin(st.heading) * rig.dims.L * 0.4, 0.25, -Math.cos(st.heading) * rig.dims.L * 0.4);
    if (st.onGround && ((slip > 0.1 && spd > 3) || (loose && spd > 6))) {
      var n = loose ? 2 : Math.min(3, Math.ceil(slip * 3));
      for (var i = 0; i < n; i++) {
        var side = (i % 2 ? 1 : -1) * (rig.dims.trackR || 1.5) * 0.5;
        tmpV.set(st.x + back.x + Math.cos(st.heading) * side, st.y + 0.25, st.z + back.z - Math.sin(st.heading) * side);
        var col = loose ? (RX.SURF[surfP] ? RX.SURF[surfP].color : '#9a8566') : (this.rain ? '#cfd6dd' : '#e9e9e9');
        this.particles.emit(tmpV, tmpV2.set((Math.random() - 0.5) * 2 - Math.sin(st.heading) * spd * 0.15, 0.6 + Math.random(), (Math.random() - 0.5) * 2 - Math.cos(st.heading) * spd * 0.15), col, loose ? 1.1 : 0.9, loose ? 1.6 : 2.2, false, loose ? 3 : 4);
      }
    }
    if (this.rain && spd > 15 && Math.random() < 0.7) {
      tmpV.set(st.x + back.x, st.y + 0.3, st.z + back.z);
      this.particles.emit(tmpV, tmpV2.set((Math.random() - 0.5) * 3, 1.5, (Math.random() - 0.5) * 3), '#c8d2dc', 1.4, 0.8, false, 3);
    }
    if (st.flame > 0.5 && rig.exhausts.length) {
      rig.body.updateMatrixWorld();
      var ex = rig.body.localToWorld(rig.exhausts[0].clone());
      this.particles.emit(ex, tmpV2.set(-Math.sin(st.heading) * 3, 0.5, -Math.cos(st.heading) * 3), p.cus.flameColor || '#66aaff', 0.35, 0.15, true, 1);
    }
    this.particles.update(dt);
    if (this.rainFx) this.rainFx.update(dt, this.camera);
    this.world.sunFollow(tmpV.set(st.x, st.y, st.z));
    // ghost
    if (this.sess.ghost) this.ghostUpdate(dt);
  };

  // ---------------- cameras ----------------
  Race.prototype.updateCamera = function (dt) {
    var cam = this.camera, p = this.player, st = p.st, rig = p.rig;
    var mode = this.camMode;
    var fwd = new V3(Math.sin(st.heading), 0, Math.cos(st.heading));
    var spd = Math.abs(st.vx);
    var back = this.lookBack ? -1 : 1;
    var helmetVis = !(mode === 2 && !this.lookBack);
    if (rig.driverHead) rig.driverHead.visible = helmetVis;
    rig.interior.forEach(function (m) { m.visible = mode === 2; });
    cam.fov += ((G.settings.fov + (mode < 2 ? Math.min(14, spd * 0.12) : Math.min(8, spd * 0.06))) - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
    if (mode === 0 || mode === 1) {
      var dist = (mode === 0 ? 1.15 : 1.75) * (rig.dims.L * 0.75 + 3.2), hgt = (mode === 0 ? 0.42 : 0.6) * (rig.dims.L * 0.3 + 1.6);
      // blend toward velocity direction when sliding
      var vdir = fwd.clone();
      if (spd > 4) { var wx = st.vx * Math.sin(st.heading) + st.vy * Math.cos(st.heading), wz = st.vx * Math.cos(st.heading) - st.vy * Math.sin(st.heading); vdir.set(wx, 0, wz).normalize().lerp(fwd, 0.5).normalize(); }
      if (back < 0) vdir.multiplyScalar(-1);
      var target = new V3(st.x, st.y, st.z);
      var want = target.clone().addScaledVector(vdir, -dist).add(new V3(0, hgt + 0.8, 0));
      // keep above terrain/road
      var gy = RX.trackAt(this.track, st.s - dist, 0).y + 1.0;
      if (want.y < gy) want.y = gy;
      if (!this.camPos || this._lastMode !== mode || back !== this._lastBack) this.camPos = want.clone();
      var k = 1 - Math.exp(-dt * (mode === 0 ? 9 : 6));
      this.camPos.lerp(want, k);
      cam.position.copy(this.camPos);
      cam.up.set(0, 1, 0);
      cam.lookAt(target.x + vdir.x * 3, target.y + hgt * 0.55, target.z + vdir.z * 3);
    } else if (mode === 2 || mode === 3 || mode === 4) {
      rig.root.updateMatrixWorld(true);
      var eye = mode === 2 ? rig.eye.clone() : mode === 3 ? rig.hood.clone() : rig.bumper.clone();
      if (mode === 2) {
        // head moves with g-forces
        eye.x += -st.latG * 0.015; eye.z += -st.lonG * 0.012; eye.y += (Math.random() - 0.5) * 0.002 * Math.min(1, spd / 30) * (st.surf !== 'asphalt' ? 6 : 1);
      }
      var src = mode === 2 ? rig.body : rig.root;
      var wp = src.localToWorld(eye);
      cam.position.copy(wp);
      var q = new THREE.Quaternion(); src.getWorldQuaternion(q);
      var look = new THREE.Quaternion().setFromEuler(new THREE.Euler(mode === 2 ? (rig.lookPitch != null ? rig.lookPitch : 0.08) : 0.05, back < 0 ? 0 : Math.PI, mode === 2 ? st.latG * 0.02 : 0, 'YXZ'));
      cam.quaternion.copy(q).multiply(look);
      if (mode === 2 && this.lookAround) cam.rotateY(this.lookAround);
    } else {
      // TV cameras placed along the track
      var tr = this.track, spacing = tr.closed ? Math.max(120, tr.length / 14) : 140;
      var idx = Math.floor(st.s / spacing), camS = (idx + 0.6) * spacing;
      var cp = RX.trackAt(tr, camS, (idx % 2 ? 1 : -1) * (tr.pts[0].w + 12));
      cam.position.set(cp.x, cp.y + 5, cp.z);
      cam.up.set(0, 1, 0);
      cam.lookAt(st.x, st.y + 0.8, st.z);
      var dd = cam.position.distanceTo(new V3(st.x, st.y, st.z));
      cam.fov = Math.max(10, Math.min(60, 1400 / Math.max(10, dd) * 0.7 + 8)); cam.updateProjectionMatrix();
    }
    this._lastMode = mode; this._lastBack = back;
  };

  Race.prototype.render = function () {
    var r = G.renderer;
    r.setScissorTest(false);
    r.setViewport(0, 0, window.innerWidth, window.innerHeight);
    r.render(this.scene, this.camera);
    if (G.settings.mirror && (this.camMode >= 2 && this.camMode <= 4) && !this.lookBack) {
      var w = Math.round(window.innerWidth * 0.28), h = Math.round(w / 3.2), x = Math.round((window.innerWidth - w) / 2), y = window.innerHeight - h - 12;
      var mc = this.mirrorCam, st = this.player.st, rig = this.player.rig;
      var wp = rig.body.localToWorld(new V3(0, (rig.eye ? rig.eye.y : 1) + 0.15, rig.eye ? rig.eye.z : 0));
      mc.position.copy(wp);
      mc.lookAt(wp.x - Math.sin(st.heading) * 10, wp.y - 0.4, wp.z - Math.cos(st.heading) * 10);
      mc.aspect = w / h; mc.updateProjectionMatrix();
      r.setScissorTest(true); r.setScissor(x, y, w, h); r.setViewport(x, y, w, h);
      // mirror image flipped horizontally
      mc.projectionMatrix.elements[0] *= -1;
      var fs = r.state;
      rig.root.visible = false;
      r.render(this.scene, mc);
      rig.root.visible = true;
      mc.projectionMatrix.elements[0] *= -1;
      r.setScissorTest(false);
      RX.ui.mirrorFrame(x, window.innerHeight - y - h, w, h, true);
    } else RX.ui.mirrorFrame(0, 0, 0, 0, false);
  };

  // ---------------- audio ----------------
  Race.prototype.updateAudio = function (dt) {
    var au = G.audio; if (!au || !au.ok) return;
    var st = this.player.st;
    au.updateEngine(this.eng, st.rpm, st.rpm01, st.throttle, null, dt);
    if (this.oppEng && this.ai.length) {
      var near = null, nd = 1e9;
      for (var i = 0; i < this.ai.length; i++) { var a = this.ai[i]; if (a.out) continue; var d = Math.hypot(a.x - st.x, a.z - st.z); if (d < nd) { nd = d; near = a; } }
      if (near) au.updateEngine(this.oppEng, (near.rpm01 || 0.5) * near.spec.red, near.rpm01 || 0.5, near.accel > 0 ? 1 : 0.2, nd, dt);
    }
    var slip = Math.max(Math.abs(st.slipR) * 4 - 0.3, Math.abs(st.slipF) * 4 - 0.4, st.wheelspin, (st.lockF || st.lockR) ? 0.8 : 0);
    if (!st.onGround) slip = 0;
    if (this.crowdT > 0) this.crowdT -= dt;
    au.updateAmbient(this.amb, { slip: slip, speed: Math.abs(st.vx), loose: st.surf !== 'asphalt' && st.surf !== 'salt', cockpit: this.camMode === 2, rain: this.rain, crowd: this.crowdT > 0 ? 0.12 : 0 });
  };

  // ---------------- ghost ----------------
  Race.prototype.ghostKey = function () { return 'gridlock_ghost_' + this.cfg.car.id + '_' + this.sess.trackDef.id; };
  Race.prototype.loadGhost = function () {
    this.ghostRec = []; this.ghostT = 0;
    try { var g = JSON.parse(localStorage.getItem(this.ghostKey()) || 'null'); if (g) { this.ghostData = g; this.player.best = g.time || Infinity; } } catch (e) { }
    if (this.ghostData) this.makeGhostMesh();
  };
  Race.prototype.makeGhostMesh = function () {
    if (this.ghostRig) return;
    var rig = RX.buildCar(this.cfg.car, this.cfg.cus, {});
    rig.root.traverse(function (o) { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false; o.castShadow = false; } });
    this.scene.add(rig.root); this.ghostRig = rig;
  };
  Race.prototype.ghostUpdate = function (dt) {
    var p = this.player, st = p.st;
    if (p.lap >= 0) {
      this.ghostT += dt;
      if (!this._gs || this.ghostT - this._gs >= 0.1) { this._gs = this.ghostT; this.ghostRec.push([+st.x.toFixed(2), +st.y.toFixed(2), +st.z.toFixed(2), +st.heading.toFixed(3), +st.s.toFixed(1), +st.lat.toFixed(2)]); }
    }
    if (this.ghostData && this.ghostRig && p.lap >= 0) {
      var fr = this.ghostData.frames, f = this.ghostT / 0.1, i = Math.floor(f), t = f - i;
      if (i < fr.length - 1) {
        var a = fr[i], b = fr[i + 1];
        this.ghostRig.root.visible = true;
        var h = a[3] + Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3])) * t;
        this.poseCar(this.ghostRig, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, h, a[4], a[5], 0, 0);
      } else this.ghostRig.root.visible = false;
    }
  };
  Race.prototype.saveGhost = function () {
    var data = { time: this.player.best, frames: this.ghostRec.slice() };
    try { localStorage.setItem(this.ghostKey(), JSON.stringify(data)); } catch (e) { }
    this.ghostData = data; this.makeGhostMesh();
  };

  Race.prototype.dispose = function () {
    var au = G.audio;
    if (au && au.ok) {
      au.stopEngine(this.eng); au.stopEngine(this.oppEng);
      if (this.amb) { var t = au.ctx.currentTime; Object.keys(this.amb).forEach(function (k) { this.amb[k].g.gain.cancelScheduledValues(t); this.amb[k].g.gain.setValueAtTime(0, t); }, this); }
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { }
    }
    this.scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }
    });
    if (this.env) { this.env.dispose(); if (RX.carEnv === this.env) RX.carEnv = null; }
  };

  // ---------------- top-level flow ----------------
  RX.startEvent = function (cfg) {
    var ev = RX.buildEvent(cfg);
    G.event = ev;
    RX.startSession();
  };
  RX.startSession = function () {
    var ev = G.event, sess = ev.sessions[ev.index];
    if (G.race) { G.race.dispose(); G.race = null; }
    RX.ui.loading(true, sess.title + ' — ' + sess.trackDef.name);
    setTimeout(function () {
      var race = new Race(ev, sess);
      race.build();
      G.race = race; G.state = 'race';
      RX.ui.loading(false);
      RX.ui.show('hud');
      if (G.audio) G.audio.resume();
    }, 30);
  };
  RX.pause = function () { if (G.state !== 'race') return; G.state = 'paused'; RX.ui.show('pause'); if (G.audio && G.audio.ctx) G.audio.ctx.suspend(); };
  RX.resume = function () { if (G.state !== 'paused') return; G.state = 'race'; RX.ui.show('hud'); if (G.audio && G.audio.ctx) G.audio.ctx.resume(); G.lastT = performance.now(); };
  RX.quitRace = function () {
    if (G.race) { G.race.dispose(); G.race = null; }
    if (G.audio && G.audio.ctx) G.audio.ctx.resume();
    G.state = 'menu'; RX.ui.backToMenu();
  };

  // main loop
  RX.loop = function () {
    var now = performance.now(), dt = Math.min(0.05, (now - (G.lastT || now)) / 1000); G.lastT = now;
    if (G.state === 'race' && G.race) { G.race.update(dt); G.race.render(); }
    else if (G.state === 'paused' && G.race) { G.race.render(); }
    else if (G.preview && G.preview.active) { RX.ui.renderPreview(dt); }
    requestAnimationFrame(RX.loop);
  };
})();
