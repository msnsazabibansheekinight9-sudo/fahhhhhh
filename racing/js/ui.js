// Menus, garage, HUD and results.
var RX = window.RX || (window.RX = {});

(function () {
  var G = RX.G, V3 = THREE.Vector3;
  var $ = function (id) { return document.getElementById(id); };
  var h = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var ui = RX.ui = {};
  var sel = { sport: null, mode: null, track: null, car: null };
  var raceOpts = { laps: 5, opponents: 11, weather: 'auto', tod: 'auto', endurance: 8 };

  ui.show = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    $('hud').classList.toggle('on', id === 'hud');
    G.preview && (G.preview.active = id === 'setup' || id === 'garage' || id === 'title' || id === 'sports');
    if (G.preview) G.preview.view = id;
  };

  // ---------------- customisation schema ----------------
  var COL = 'color';
  RX.CUSTOM_SCHEMA = [
    ['Paint', 'paint1', 'Primary colour', COL], ['Paint', 'paint2', 'Secondary colour', COL], ['Paint', 'paint3', 'Accent colour', COL],
    ['Paint', 'finish', 'Finish', ['gloss', 'metallic', 'matte', 'satin', 'chrome', 'pearl', 'candy', 'flake']],
    ['Paint', 'dirt', 'Weathering / grime', [0, 1, 0.05]],
    ['Livery', 'pattern', 'Livery pattern', 'PATTERNS'], ['Livery', 'patScale', 'Pattern scale', [0.5, 2, 0.05]],
    ['Livery', 'number', 'Race number', [0, 999, 1]], ['Livery', 'numColor', 'Number colour', COL],
    ['Livery', 'numStyle', 'Number style', ['plain', 'roundel', 'square', 'outline', 'none']],
    ['Livery', 'sponsor', 'Sponsor set', [['0', 'Apex / Velocita'], ['1', 'Turbotec / Zenith'], ['2', 'Orion / Helix'], ['3', 'Fusion / Titan'], ['4', 'Rocketfuel / Dynamo'], ['5', 'No sponsors']]],
    ['Livery', 'roofNumber', 'Roof number', [['-1', 'Auto'], ['0', 'Off'], ['1', 'On']]],
    ['Livery', 'tint', 'Window tint', [0, 1, 0.05]],
    ['Wheels & Tyres', 'rimStyle', 'Rim design', 'RIMS'], ['Wheels & Tyres', 'rimColor', 'Rim colour', COL],
    ['Wheels & Tyres', 'rimFinish', 'Rim finish', ['metal', 'matte', 'chrome']], ['Wheels & Tyres', 'rimSize', 'Rim size (inches +/-)', [-2, 3, 1]],
    ['Wheels & Tyres', 'tireWall', 'Sidewall', ['plain', 'letters', 'redline', 'whitewall', 'stripe']],
    ['Wheels & Tyres', 'compound', 'Tyre compound', [['auto', 'Auto (track)'], ['soft', 'Slick soft'], ['medium', 'Slick medium'], ['hard', 'Slick hard'], ['inter', 'Intermediate'], ['wet', 'Full wet'], ['treaded', 'Treaded'], ['gravel', 'Gravel'], ['snow', 'Studded snow'], ['dirt', 'Dirt oval'], ['sand', 'Desert'], ['drag', 'Drag slick']], 1],
    ['Wheels & Tyres', 'tirePress', 'Tyre pressure', [0, 1, 0.05], 1], ['Wheels & Tyres', 'caliperColor', 'Brake caliper colour', COL],
    ['Aero & Body', 'wing', 'Rear wing', [['-1', 'Period default'], ['0', 'None'], ['1', 'Lip spoiler'], ['2', 'Low wing'], ['3', 'High wing'], ['4', 'Time-attack wing'], ['5', 'Superbird hoop']]],
    ['Aero & Body', 'splitter', 'Front splitter', [['-1', 'Default'], ['0', 'None'], ['1', 'Short'], ['2', 'Extended']]],
    ['Aero & Body', 'skirts', 'Side skirts', 'BOOL'], ['Aero & Body', 'diffuser', 'Rear diffuser', 'BOOL'], ['Aero & Body', 'canards', 'Dive planes', 'BOOL'],
    ['Aero & Body', 'widebody', 'Wide-body fenders', 'BOOL'],
    ['Aero & Body', 'scoop', 'Scoop', [['-1', 'Default'], ['0', 'None'], ['1', 'Roof scoop'], ['2', 'Hood scoop']]],
    ['Aero & Body', 'mudflaps', 'Mud flaps', [['-1', 'Default'], ['0', 'Off'], ['1', 'On']]],
    ['Aero & Body', 'lightpod', 'Rally light pod', 'BOOL'], ['Aero & Body', 'mirrors', 'Door mirrors', 'BOOL'],
    ['Aero & Body', 'aeroF', 'Front downforce', [0, 1, 0.05], 1], ['Aero & Body', 'aeroR', 'Rear downforce', [0, 1, 0.05], 1],
    ['Aero & Body', 'exhaustTip', 'Exhaust tips', ['auto', 'single', 'dual', 'quad', 'center', 'side']],
    ['Aero & Body', 'headColor', 'Headlight tint', COL], ['Aero & Body', 'underglow', 'Underglow', [['none', 'Off'], ['#00e5ff', 'Cyan'], ['#ff2bd6', 'Magenta'], ['#39ff14', 'Green'], ['#ff3b30', 'Red'], ['#ffffff', 'White']]],
    ['Aero & Body', 'flameColor', 'Backfire flame colour', COL],
    ['Driver & Cockpit', 'helmetColor', 'Helmet base', COL], ['Driver & Cockpit', 'helmetColor2', 'Helmet design colour', COL],
    ['Driver & Cockpit', 'helmetDesign', 'Helmet design', [['0', 'Stripe'], ['1', 'Saw-tooth'], ['2', 'Eyes'], ['3', 'Cross'], ['4', 'Bands'], ['5', 'Arc']]],
    ['Driver & Cockpit', 'suitColor', 'Race suit', COL], ['Driver & Cockpit', 'gloveColor', 'Gloves', COL],
    ['Driver & Cockpit', 'cage', 'Roll cage', [['-1', 'Default'], ['0', 'None'], ['1', 'Full cage']]],
    ['Driver & Cockpit', 'windowNet', 'Window net', [['-1', 'Default'], ['0', 'Off'], ['1', 'On']]],
    ['Driver & Cockpit', 'steerLock', 'Steering lock', [0.7, 1.4, 0.05], 1], ['Driver & Cockpit', 'steerSens', 'Steering sensitivity', [0, 1, 0.05], 1],
    ['Engine', 'power', 'Engine tune (+%)', [0, 1, 0.05], 1], ['Engine', 'boost', 'Boost pressure (turbo cars)', [0, 1, 0.05], 1],
    ['Engine', 'revLimit', 'Rev limiter', [0.9, 1.05, 0.01], 1], ['Engine', 'finalDrive', 'Final drive (short ↔ long)', [0.8, 1.25, 0.01], 1],
    ['Engine', 'gearbox', 'Gearbox', [['auto', 'Automatic'], ['manual', 'Manual (E/Q)']], 1], ['Engine', 'nitro', 'Nitrous (N)', 'BOOL', 1],
    ['Chassis', 'rideHeight', 'Ride height (cm)', [-5, 8, 1]], ['Chassis', 'camberF', 'Front camber (°)', [-5, 0, 0.1], 1], ['Chassis', 'camberR', 'Rear camber (°)', [-4, 0, 0.1], 1],
    ['Chassis', 'toe', 'Toe (°)', [-0.5, 0.5, 0.05], 1], ['Chassis', 'spring', 'Spring stiffness', [0, 1, 0.05], 1], ['Chassis', 'damper', 'Damper stiffness', [0, 1, 0.05], 1],
    ['Chassis', 'arbF', 'Front anti-roll bar', [0, 1, 0.05], 1], ['Chassis', 'arbR', 'Rear anti-roll bar', [0, 1, 0.05], 1],
    ['Chassis', 'weightRed', 'Weight reduction', [0, 1, 0.05], 1], ['Chassis', 'ballast', 'Ballast (kg)', [0, 120, 5], 1],
    ['Brakes & Diff', 'brakeBias', 'Brake bias (front)', [0.45, 0.72, 0.01], 1], ['Brakes & Diff', 'brakePress', 'Brake pressure', [0.7, 1.2, 0.01], 1],
    ['Brakes & Diff', 'diff', 'Differential lock (open ↔ spool)', [0, 1, 0.05], 1],
    ['Paint', 'roofColor', 'Two-tone roof', [['none', 'Body colour'], ['#111111', 'Black'], ['#f2f2f2', 'White'], ['#c0c4ca', 'Silver'], ['#c8102e', 'Red'], ['#0a2a6b', 'Navy'], ['#ffd400', 'Yellow']]],
    ['Paint', 'carbonHood', 'Carbon bonnet', 'BOOL'],
    ['Paint', 'mirrorColor', 'Mirror caps', [['body', 'Body colour'], ['carbon', 'Carbon'], ['#111111', 'Black'], ['#f2f2f2', 'White'], ['#ffd400', 'Yellow'], ['#c8102e', 'Red']]],
    ['Paint', 'wingColor', 'Wing finish', [['body', 'Default'], ['carbon', 'Carbon'], ['#111111', 'Black'], ['#f2f2f2', 'White'], ['#c0c4ca', 'Silver']]],
    ['Paint', 'trimColor', 'Window seals', COL],
    ['Livery', 'pattern2', 'Second pattern layer', 'PATTERNS2'], ['Livery', 'numFont', 'Number font', ['sans', 'serif', 'stencil', 'script', 'mono']],
    ['Livery', 'decal', 'Decal', [['none', 'None'], ['stars', 'Stars'], ['bolt', 'Lightning bolt'], ['shark', 'Shark teeth'], ['eyes', 'Headlight eyes'], ['checkflag', 'Chequered flag']]],
    ['Livery', 'decalColor', 'Decal colour', COL],
    ['Livery', 'flag', 'National flag', [['none', 'None'], ['italy', 'Italy'], ['germany', 'Germany'], ['france', 'France'], ['uk', 'United Kingdom'], ['usa', 'USA'], ['japan', 'Japan'], ['brazil', 'Brazil'], ['belgium', 'Belgium'], ['mexico', 'Mexico']]],
    ['Livery', 'driverName', 'Driver name (window)', 'TEXT'], ['Livery', 'banner', 'Windscreen banner', 'TEXT'], ['Livery', 'bannerColor', 'Banner colour', COL], ['Livery', 'bannerText', 'Banner text colour', COL],
    ['Wheels & Tyres', 'wallColor', 'Sidewall lettering colour', COL],
    ['Aero & Body', 'hoodPins', 'Bonnet pins', 'BOOL'], ['Aero & Body', 'fenderVents', 'Fender vents', 'BOOL'], ['Aero & Body', 'roofVent', 'Roof vent', 'BOOL'], ['Aero & Body', 'louvres', 'Rear window louvres', 'BOOL'],
    ['Aero & Body', 'towHook', 'Tow straps', 'BOOL'], ['Aero & Body', 'towColor', 'Tow strap colour', COL], ['Aero & Body', 'antenna', 'Radio aerial', 'BOOL'], ['Aero & Body', 'classLight', 'Endurance class lights', COL],
    ['Driver & Cockpit', 'visor', 'Visor', [['smoke', 'Smoke'], ['clear', 'Clear'], ['gold', 'Gold iridium'], ['blue', 'Blue iridium'], ['red', 'Red iridium']]],
    ['Driver & Cockpit', 'helmetType', 'Helmet', [['full', 'Full face'], ['open', 'Open face + goggles']]], ['Driver & Cockpit', 'skinTone', 'Skin tone', COL],
    ['Interior', 'interiorColor', 'Interior colour', COL], ['Interior', 'interiorTrim', 'Interior trim', [['race', 'Stripped race carbon'], ['road', 'Trimmed']]],
    ['Interior', 'seatColor', 'Seat colour', COL], ['Interior', 'harnessColor', 'Harness colour', COL],
    ['Interior', 'wheelStyle', 'Steering wheel', [['auto', 'Period correct'], ['wood', 'Wood-rim'], ['classic', 'Leather 3-spoke'], ['race', 'Suede dished'], ['gt', 'Flat-bottom GT'], ['formula', 'Formula wheel'], ['kart', 'Kart'], ['yoke', 'Yoke'], ['truck', 'Large truck']]],
    ['Interior', 'wheelMark', 'Wheel centre mark', COL],
    ['Interior', 'dashStyle', 'Instruments', [['auto', 'Period correct'], ['analog', 'Analogue dials'], ['digital', 'Digital display']]],
    ['Interior', 'leverStyle', 'Gear selector', [['auto', 'Period correct'], ['H', 'H-pattern'], ['seq', 'Sequential'], ['paddle', 'Paddles'], ['none', 'None']]],
    ['Interior', 'knobColor', 'Gear knob colour', COL],
    ['Interior', 'seatHeight', 'Seat height (cm)', [-6, 6, 1]], ['Interior', 'seatFore', 'Seat fore/aft (cm)', [-12, 12, 1]],
    ['Assists', 'tc', 'Traction control (T)', 'BOOL', 1], ['Assists', 'abs', 'ABS', 'BOOL', 1], ['Assists', 'sc', 'Stability control', 'BOOL', 1], ['Assists', 'steerAssistOff', 'Disable steering assist', 'BOOL', 1]
  ];

  // ---------------- 3D preview (showroom) ----------------
  ui.initPreview = function () {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color('#0d1016');
    G.previewEnv = RX.makeEnv(false, '#3a4a66', '#b8c6da');
    sc.environment = G.previewEnv;
    var floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.35, metalness: 0.5 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    var ring = new THREE.Mesh(new THREE.RingGeometry(8.9, 9.1, 64), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; sc.add(ring);
    var grid = new THREE.GridHelper(60, 60, 0x222833, 0x161a22); grid.position.y = -0.01; sc.add(grid);
    sc.add(new THREE.HemisphereLight(0xdde6ff, 0x222222, 0.6));
    var key = new THREE.SpotLight(0xffffff, 2.2, 40, 0.6, 0.5, 1); key.position.set(6, 10, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); sc.add(key);
    var rim = new THREE.DirectionalLight(0x88aaff, 0.8); rim.position.set(-8, 5, -6); sc.add(rim);
    var cam = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.05, 300);
    G.preview = { scene: sc, cam: cam, rig: null, active: true, theta: 0.8, phi: 0.32, dist: 9, auto: true, view: 'title', t: 0 };
    var c = G.renderer.domElement, drag = null;
    c.addEventListener('pointerdown', function (e) { if (!G.preview.active) return; drag = [e.clientX, e.clientY]; G.preview.auto = false; });
    window.addEventListener('pointerup', function () { drag = null; });
    window.addEventListener('pointermove', function (e) {
      if (!drag || !G.preview.active) return;
      G.preview.theta -= (e.clientX - drag[0]) * 0.008; G.preview.phi = Math.max(0.02, Math.min(1.3, G.preview.phi + (e.clientY - drag[1]) * 0.006)); drag = [e.clientX, e.clientY];
    });
    c.addEventListener('wheel', function (e) { if (!G.preview.active) return; G.preview.dist = Math.max(2.5, Math.min(25, G.preview.dist * (1 + e.deltaY * 0.001))); });
  };

  ui.setPreviewCar = function (car, cus) {
    var P = G.preview; if (!P) return;
    if (P.rig) { P.scene.remove(P.rig.root); disposeObj(P.rig.root); }
    RX.carEnv = G.previewEnv;
    P.rig = RX.buildCar(car, cus, {});
    P.scene.add(P.rig.root);
    P.dist = Math.max(4, P.rig.dims.L * 1.45 + 2);
    P.car = car;
  };
  function disposeObj(o) { o.traverse(function (m) { if (m.geometry) m.geometry.dispose(); if (m.material) { if (m.material.map && m.material.map.isCanvasTexture) m.material.map.dispose(); m.material.dispose(); } }); }

  ui.renderPreview = function (dt) {
    var P = G.preview, r = G.renderer; P.t += dt;
    if (P.auto) P.theta += dt * 0.25;
    if (P.cockpit && P.rig && P.rig.eye && P.view === 'garage') {
      var rg = P.rig; rg.root.updateMatrixWorld(true);
      var e = rg.body.localToWorld(rg.eye.clone());
      P.cam.position.copy(e); P.cam.fov = 72;
      P.cam.setViewOffset(window.innerWidth, window.innerHeight, -window.innerWidth * 0.17, 0, window.innerWidth, window.innerHeight);
      P.cam.aspect = window.innerWidth / window.innerHeight; P.cam.updateProjectionMatrix();
      var yaw = Math.sin(P.t * 0.3) * 0.5 + (P.lookYaw || 0);
      P.cam.lookAt(e.x + Math.sin(yaw) * 3, e.y - 0.35 - (rg.lookPitch || 0) * 3, e.z + Math.cos(yaw) * 3);
      if (rg.driverHead) rg.driverHead.visible = false;
      rg.interior.forEach(function (m) { m.visible = true; });
      RX.animateRig(rg, { speed: 0, steer: Math.sin(P.t * 0.8) * 0.3, swAngle: Math.sin(P.t * 0.8) * 1.8, pitch: 0, roll: 0, heave: 0, brake: 0, throttle: 0.5, rpm01: 0.55 + Math.sin(P.t * 1.7) * 0.4, rpm: 6000, kmh: 120 + Math.sin(P.t) * 60, gear: 1 + Math.floor(P.t / 1.5) % 5, lights: true, latG: 0, rain: false }, dt);
      G.renderer.setScissorTest(false); G.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      G.renderer.render(P.scene, P.cam);
      return;
    }
    P.cam.fov = 35;
    if (P.rig) { if (P.rig.driverHead) P.rig.driverHead.visible = true; P.rig.interior.forEach(function (m) { m.visible = false; }); }
    var tgtY = P.rig ? Math.min(1.2, P.rig.dims.L * 0.08 + 0.3) : 0.5;
    P.cam.position.set(Math.sin(P.theta) * Math.cos(P.phi) * P.dist, Math.sin(P.phi) * P.dist + 0.3, Math.cos(P.theta) * Math.cos(P.phi) * P.dist);
    P.cam.lookAt(0, tgtY, 0);
    // frame the car in the free part of the screen
    var w = window.innerWidth, hh = window.innerHeight;
    var off = P.view === 'setup' ? -w * 0.2 : P.view === 'garage' ? -w * 0.17 : 0;
    P.cam.setViewOffset(w, hh, off, P.view === 'setup' ? hh * 0.08 : 0, w, hh);
    P.cam.aspect = w / hh; P.cam.updateProjectionMatrix();
    if (P.rig) {
      var spin = P.t * 6;
      RX.animateRig(P.rig, { speed: 0, steer: Math.sin(P.t * 0.6) * 0.25, swAngle: Math.sin(P.t * 0.6) * 0.25 * 6, pitch: 0, roll: 0, heave: 0, brake: Math.sin(P.t) > 0.8 ? 1 : 0, throttle: 0, rpm01: 0.2, flame: 0, drs: Math.sin(P.t * 0.4) > 0.6, lights: true, latG: 0 }, dt);
      P.rig.root.position.y = 0;
    }
    r.setScissorTest(false); r.setViewport(0, 0, w, hh);
    r.render(P.scene, P.cam);
  };

  // ---------------- screens ----------------
  ui.build = function () {
    // title
    $('btnPlay').onclick = function () { ui.ensureAudio(); ui.show('sports'); };
    $('btnSettings').onclick = function () { ui.openSettings('title'); };
    $('btnHelp').onclick = function () { ui.show('help'); };
    $('helpBack').onclick = function () { ui.show('title'); };
    $('totals').textContent = RX.SPORTS.length + ' disciplines · ' + RX.CARS.length + ' cars · ' + RX.SPORTS.reduce(function (a, s) { return a + s.trackList.length; }, 0) + ' tracks · ' + Object.keys(RX.MODE_INFO).length + ' game modes';
    // sports grid
    var grid = $('sportGrid');
    RX.SPORTS.forEach(function (s, i) {
      var card = h('button', 'sport-card');
      card.innerHTML = '<div class="sc-thumb"></div><div class="sc-name">' + s.name + '</div><div class="sc-years">' + s.years + '</div><div class="sc-meta">' + s.carList.length + ' cars · ' + s.trackList.length + ' tracks · ' + s.modes.length + ' modes</div>';
      var thumb = card.querySelector('.sc-thumb');
      var hero = s.carList[s.carList.length - 1];
      thumb.style.background = 'linear-gradient(135deg,' + RX.defaultCustom(hero).paint1 + ',' + RX.defaultCustom(hero).paint2 + ')';
      thumb.textContent = hero.name;
      card.onmouseenter = function () { ui.setPreviewCar(hero, RX.loadCustom(hero)); };
      card.onclick = function () { ui.openSport(s); };
      grid.appendChild(card);
    });
    $('sportsBack').onclick = function () { ui.show('title'); };
    $('setupBack').onclick = function () { ui.show('sports'); };
    $('btnGarage').onclick = function () { ui.openGarage(); };
    $('btnStart').onclick = function () { ui.startRace(); };
    $('garageBack').onclick = function () { G.preview.cockpit = false; RX.saveCustom(sel.car, sel.cus); ui.show('setup'); ui.refreshCarInfo(); };
    $('garageReset').onclick = function () { sel.cus = RX.defaultCustom(sel.car); RX.saveCustom(sel.car, sel.cus); ui.openGarage(); };
    $('garageRandom').onclick = function () { ui.randomize(); };
    $('carSearch').oninput = function () { ui.fillCars(); };
    $('carSort').onchange = function () { ui.fillCars(); };
    // pause
    $('pResume').onclick = RX.resume;
    $('pRestart').onclick = function () { G.state = 'race'; RX.startSession(); };
    $('pQuit').onclick = function () { RX.quitRace(); };
    $('pSettings').onclick = function () { ui.openSettings('pause'); };
    $('setBack').onclick = function () { RX.saveSettings(); ui.show(ui._settingsFrom || 'title'); };
    ui.buildSettings();
  };

  ui.ensureAudio = function () {
    if (!G.audio) { G.audio = new RX.Audio(); G.audio.vol = G.settings.volume; }
    G.audio.init(); G.audio.resume();
  };

  ui.openSport = function (s) {
    sel.sport = s; sel.mode = s.modes[0]; sel.track = s.trackList[0];
    sel.car = sel.car && sel.car.sport === s.id ? sel.car : s.carList[s.carList.length - 1];
    $('setupTitle').textContent = s.name; $('setupYears').textContent = s.years; $('setupDesc').textContent = s.desc;
    // modes
    var ml = $('modeList'); ml.innerHTML = '';
    s.modes.forEach(function (m) {
      var info = RX.MODE_INFO[m] || { name: m, desc: '' };
      var b = h('button', 'mode-item' + (m === sel.mode ? ' sel' : ''), '<b>' + info.name + '</b><span>' + info.desc + '</span>');
      b.onclick = function () { sel.mode = m; ml.querySelectorAll('.mode-item').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); ui.updateRaceOpts(); };
      ml.appendChild(b);
    });
    // tracks
    var tl = $('trackList'); tl.innerHTML = '';
    s.trackList.forEach(function (td) {
      var tr = RX.buildTrack(td, s);
      var b = h('button', 'track-item' + (td === sel.track ? ' sel' : ''));
      var c = RX.canvas(84, 60); drawOutline(c, tr);
      b.appendChild(c);
      var info = h('div', 'ti-info', '<b>' + td.name + '</b><span>' + styleName(tr) + ' · ' + (tr.length / 1000).toFixed(2) + ' km · ' + themeName(td.theme) + (td.opts.night ? ' · night' : '') + (td.opts.rain ? ' · wet' : '') + '</span>');
      b.appendChild(info);
      b.onclick = function () { sel.track = td; tl.querySelectorAll('.track-item').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); ui.updateRaceOpts(); };
      tl.appendChild(b);
    });
    $('carSearch').value = '';
    ui.fillCars();
    ui.updateRaceOpts();
    ui.selectCar(sel.car);
    ui.show('setup');
  };

  function styleName(tr) { return { circuit: 'Road course', street: 'Street circuit', oval: 'Oval', stage: 'Point-to-point stage', hill: 'Hill climb', drag: 'Drag strip', kart: 'Kart circuit', rx: 'Mixed-surface' }[tr.style] || tr.style; }
  function themeName(t) { return { grass: 'parkland', forest: 'forest', desert: 'desert', coast: 'coastal', city: 'city', nightcity: 'city lights', mountain: 'mountains', snow: 'snow', autumn: 'autumn woods', canyon: 'red canyon', jungle: 'jungle', savanna: 'savanna', salt: 'salt flats' }[t] || t; }
  function drawOutline(c, tr) {
    var g = c.getContext('2d'), b = tr.bounds, sx = b.maxx - b.minx, sz = b.maxz - b.minz, s = Math.min((c.width - 10) / Math.max(sx, 1), (c.height - 10) / Math.max(sz, 1));
    if (tr.style === 'drag') { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, c.height / 2); g.lineTo(c.width - 10, c.height / 2); g.stroke(); return; }
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 2.2; g.lineJoin = 'round'; g.beginPath();
    tr.pts.forEach(function (p, i) { var x = c.width / 2 - (p.x - (b.minx + sx / 2)) * s, y = c.height / 2 + (p.z - (b.minz + sz / 2)) * s; if (i % 3 === 0 || i === tr.N - 1) { if (i) g.lineTo(x, y); else g.moveTo(x, y); } });
    if (tr.closed) g.closePath(); g.stroke();
    var p0 = tr.pts[tr.startIdx]; g.fillStyle = '#ff3b30'; g.fillRect(c.width / 2 - (p0.x - (b.minx + sx / 2)) * s - 3, c.height / 2 + (p0.z - (b.minz + sz / 2)) * s - 3, 6, 6);
  }

  ui.fillCars = function () {
    var s = sel.sport, q = $('carSearch').value.toLowerCase(), sort = $('carSort').value;
    var list = s.carList.filter(function (c) { return !q || c.name.toLowerCase().indexOf(q) >= 0 || String(c.year).indexOf(q) >= 0; });
    list = list.slice().sort(function (a, b) { return sort === 'year' ? a.year - b.year : sort === 'hp' ? b.hp - a.hp : sort === 'pw' ? b.hp / b.kg - a.hp / a.kg : sort === 'top' ? b.top - a.top : a.name.localeCompare(b.name); });
    var cl = $('carList'); cl.innerHTML = '';
    list.forEach(function (c) {
      var b = h('button', 'car-item' + (c === sel.car ? ' sel' : ''), '<span class="ci-year">' + c.year + '</span><b>' + c.name + '</b><span class="ci-spec">' + c.hp.toLocaleString() + ' hp · ' + c.kg + ' kg · ' + engineName(c.engine) + '</span>');
      b.onclick = function () { cl.querySelectorAll('.car-item').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); ui.selectCar(c); };
      cl.appendChild(b);
    });
    $('carCount').textContent = list.length + ' / ' + s.carList.length + ' cars';
  };

  function engineName(e) { return { I4: 'inline-4', I4T: 'turbo I4', I4H: 'hybrid I4', I5: 'inline-5', I5T: 'turbo I5', I6: 'inline-6', I6T: 'turbo I6', I8: 'straight-8', I3T: 'turbo I3', V4: 'V4', V4H: 'hybrid V4', V6: 'V6', V6T: 'turbo V6', V6H: 'hybrid V6', V8: 'V8', V8T: 'turbo V8', V8H: 'hybrid V8', V10: 'V10', V12: 'V12', V16: 'V16', F4: 'flat-4', F8: 'flat-8', F4T: 'turbo flat-4', F6: 'flat-6', F6T: 'turbo flat-6', F12: 'flat-12', R: 'rotary', E: 'electric', T: 'turbine / jet', '2T': '2-stroke', '4T': '4-stroke single', D: 'turbodiesel', NITRO: 'nitromethane V8' }[e] || e; }

  ui.selectCar = function (c) {
    sel.car = c; sel.cus = RX.loadCustom(c);
    ui.setPreviewCar(c, sel.cus);
    G.preview.auto = true;
    ui.refreshCarInfo();
  };
  ui.refreshCarInfo = function () {
    var c = sel.car, spec = RX.carSpec(c, sel.cus);
    var pw = c.hp / c.kg * 1000;
    $('carName').textContent = c.name;
    $('carSpecs').innerHTML = [
      ['Year', c.year], ['Power', c.hp.toLocaleString() + ' hp'], ['Weight', c.kg.toLocaleString() + ' kg'], ['Top speed', RX.fmtSpeed(c.top / 3.6) + ' ' + RX.unitLabel()],
      ['Engine', engineName(c.engine)], ['Drive', c.drive], ['Gears', spec.gears], ['Downforce', spec.df < 0.2 ? 'none' : spec.df < 0.8 ? 'low' : spec.df < 1.6 ? 'medium' : 'high']
    ].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    function bar(label, v) { return '<div class="bar"><span>' + label + '</span><i style="width:' + Math.round(Math.max(4, Math.min(100, v * 100))) + '%"></i></div>'; }
    $('carBars').innerHTML = bar('Acceleration', Math.log10(1 + pw) / 4) + bar('Top speed', c.top / 600) + bar('Grip', (spec.mu * (1 + spec.df * 0.5)) / 3.2) + bar('Braking', spec.brakeG / 1.6);
    var n = RX.CUSTOM_SCHEMA.length;
    $('custCount').textContent = n + ' customisation options';
  };

  ui.updateRaceOpts = function () {
    var s = sel.sport, m = sel.mode;
    var tr = RX.buildTrack(sel.track, s);
    var laps = RX.defaultLaps(s, tr), opp = RX.opponentsFor(s, m);
    var ro = $('raceOpts');
    var solo = /stage|timetrial|quali|climb|driftattack|touge|raid|checkpoint|mile|flyingmile/.test(m);
    var p2p = tr.style === 'stage' || tr.style === 'hill' || tr.style === 'drag';
    var html = '';
    if (!solo && !p2p && m !== 'endurance' && m !== 'elimination' && m !== 'championship' || m === 'championship') html += '<label>Laps <input id="oLaps" type="number" min="1" max="99" value="' + laps + '"></label>';
    if (!solo && m !== 'drag' && m !== 'bracket' && m !== 'dragladder' && m !== 'superspecial') html += '<label>Opponents <input id="oOpp" type="number" min="0" max="23" value="' + opp + '"></label>';
    if (m === 'endurance') html += '<label>Race length <select id="oEnd"><option value="4">4 min</option><option value="8" selected>8 min</option><option value="15">15 min</option><option value="30">30 min</option></select></label>';
    html += '<label>AI level <select id="oDiff"><option value="0.72">Rookie</option><option value="0.8">Amateur</option><option value="0.88">Pro</option><option value="0.95">Legend</option><option value="1.0">Alien</option></select></label>';
    html += '<label>Weather <select id="oWeather"><option value="auto">Track default</option><option value="clear">Clear</option><option value="rain">Rain</option><option value="fog">Fog</option></select></label>';
    html += '<label>Time <select id="oTod"><option value="auto">Track default</option><option value="day">Day</option><option value="dusk">Dusk</option><option value="night">Night</option></select></label>';
    ro.innerHTML = html;
    var d = $('oDiff'); d.value = String(G.settings.difficulty); if (!d.value) d.value = '0.8';
    $('modeDesc').textContent = (RX.MODE_INFO[m] || {}).desc || '';
  };

  ui.startRace = function () {
    ui.ensureAudio();
    var laps = $('oLaps') ? +$('oLaps').value : 1, opp = $('oOpp') ? +$('oOpp').value : 0;
    G.settings.difficulty = +$('oDiff').value; RX.saveSettings();
    var cfg = {
      sport: sel.sport, mode: sel.mode, trackDef: sel.track, car: sel.car, cus: JSON.parse(JSON.stringify(sel.cus)),
      laps: Math.max(1, laps || 1), opponents: Math.max(0, Math.min(23, opp)), weather: $('oWeather').value, tod: $('oTod').value,
      enduranceMinutes: $('oEnd') ? +$('oEnd').value : 8
    };
    G.preview.active = false;
    RX.startEvent(cfg);
  };

  // ---------------- garage ----------------
  ui.openGarage = function () {
    var car = sel.car, cus = sel.cus;
    $('garageTitle').textContent = car.name;
    var tabs = $('garageTabs'), panel = $('garagePanel');
    tabs.innerHTML = ''; panel.innerHTML = '';
    var groups = {};
    RX.CUSTOM_SCHEMA.forEach(function (o) { (groups[o[0]] || (groups[o[0]] = [])).push(o); });
    var names = Object.keys(groups);
    var rebuildT = null;
    function rebuild() { clearTimeout(rebuildT); rebuildT = setTimeout(function () { ui.setPreviewCar(car, cus); RX.saveCustom(car, cus); }, 120); }
    function showTab(name) {
      G.preview.cockpit = name === 'Interior' || name === 'Driver & Cockpit';
      tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.textContent === name); });
      panel.innerHTML = '';
      groups[name].forEach(function (o) {
        var key = o[1], label = o[2], type = o[3], physOnly = o[4];
        var row = h('div', 'opt');
        row.appendChild(h('span', 'opt-l', label + (physOnly ? ' <i class="phys">physics</i>' : '')));
        var input;
        var set = function (v) { cus[key] = v; if (!physOnly) rebuild(); else RX.saveCustom(car, cus); ui.refreshCarInfo(); };
        if (type === COL) { input = h('input'); input.type = 'color'; input.value = toHex(cus[key]); input.oninput = function () { set(input.value); }; }
        else if (type === 'BOOL') { input = h('input'); input.type = 'checkbox'; input.checked = !!cus[key]; input.onchange = function () { set(input.checked ? 1 : 0); }; }
        else if (type === 'TEXT') { input = h('input'); input.type = 'text'; input.maxLength = 20; input.value = cus[key] || ''; input.placeholder = 'type…'; input.oninput = function () { set(input.value); }; input.onkeydown = function (e) { e.stopPropagation(); }; }
        else if (type === 'PATTERNS' || type === 'RIMS' || type === 'PATTERNS2') {
          input = h('select'); var opts = type === 'PATTERNS' ? RX.PATTERNS : type === 'PATTERNS2' ? ['none'].concat(RX.PATTERNS) : ['auto'].concat(RX.RIMS);
          opts.forEach(function (v) { var op = h('option', null, v); op.value = v; input.appendChild(op); }); input.value = cus[key]; input.onchange = function () { set(input.value); };
        } else if (Array.isArray(type) && typeof type[0] === 'number') {
          input = h('div', 'rng'); var r = h('input'); r.type = 'range'; r.min = type[0]; r.max = type[1]; r.step = type[2]; r.value = cus[key];
          var out = h('em', null, fmtV(cus[key])); r.oninput = function () { out.textContent = fmtV(+r.value); set(+r.value); };
          input.appendChild(r); input.appendChild(out);
        } else if (Array.isArray(type)) {
          input = h('select');
          type.forEach(function (v) { var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; var op = h('option', null, lab); op.value = val; input.appendChild(op); });
          input.value = String(cus[key]);
          input.onchange = function () { var v = input.value; set(/^-?\d+(\.\d+)?$/.test(v) && key !== 'number' ? +v : v); };
        }
        row.appendChild(input); panel.appendChild(row);
      });
    }
    names.forEach(function (n) { var b = h('button', null, n); b.onclick = function () { showTab(n); }; tabs.appendChild(b); });
    showTab(names[0]);
    $('garageCount').textContent = RX.CUSTOM_SCHEMA.length + ' options · settings save per car';
    ui.show('garage');
  };
  function fmtV(v) { return Math.abs(v) >= 10 ? Math.round(v) : (+v).toFixed(2); }
  function toHex(c) { if (!c || c === 'none' || c === 'body' || c === 'carbon') return '#000000'; var x = new THREE.Color(c); return '#' + x.getHexString(); }
  ui.randomize = function () {
    var c = sel.cus, r = Math.random;
    var hue = function () { return '#' + new THREE.Color().setHSL(r(), 0.5 + r() * 0.5, 0.25 + r() * 0.5).getHexString(); };
    c.paint1 = hue(); c.paint2 = hue(); c.paint3 = hue(); c.pattern = RX.PATTERNS[Math.floor(r() * RX.PATTERNS.length)];
    c.finish = ['gloss', 'metallic', 'matte', 'satin', 'chrome', 'pearl', 'candy', 'flake'][Math.floor(r() * 8)];
    c.number = Math.floor(r() * 99) + 1; c.rimStyle = r() < 0.3 ? 'auto' : RX.RIMS[Math.floor(r() * RX.RIMS.length)]; c.rimColor = r() < 0.5 ? '#c0c4ca' : hue();
    c.helmetColor = hue(); c.helmetColor2 = hue(); c.helmetDesign = Math.floor(r() * 6); c.suitColor = c.paint1; c.sponsor = Math.floor(r() * 6);
    RX.saveCustom(sel.car, c); ui.openGarage(); ui.setPreviewCar(sel.car, c);
  };

  // ---------------- settings ----------------
  ui.buildSettings = function () {
    var S = G.settings, box = $('setList');
    var rows = [
      ['Graphics quality', 'quality', [[0.6, 'Low'], [0.8, 'Medium'], [1, 'High'], [1.25, 'Ultra']]],
      ['Shadows', 'shadows', 'BOOL'], ['Rear-view mirror (M)', 'mirror', 'BOOL'], ['Units', 'units', [['kmh', 'km/h'], ['mph', 'mph']]],
      ['Field of view', 'fov', [55, 95, 1]], ['Master volume', 'volume', [0, 1, 0.05]], ['Co-driver voice', 'voice', 'BOOL'],
      ['Keyboard steering assist', 'steerAssist', 'BOOL'], ['Helmet view in cockpit', 'helmetCam', 'BOOL'], ['Look into corners', 'apexLook', 'BOOL'], ['Camera shake', 'shake', [0, 2, 0.1]], ['AI catch-up', 'catchup', 'BOOL'], ['Damage', 'damage', 'BOOL']
    ];
    if (S.voice == null) S.voice = true; if (S.apexLook == null) S.apexLook = true; if (S.shake == null) S.shake = 1;
    box.innerHTML = '';
    rows.forEach(function (r) {
      var row = h('div', 'opt'); row.appendChild(h('span', 'opt-l', r[0]));
      var inp;
      if (r[2] === 'BOOL') { inp = h('input'); inp.type = 'checkbox'; inp.checked = !!S[r[1]]; inp.onchange = function () { S[r[1]] = inp.checked; apply(r[1]); }; }
      else if (typeof r[2][0] === 'number') { inp = h('input'); inp.type = 'range'; inp.min = r[2][0]; inp.max = r[2][1]; inp.step = r[2][2]; inp.value = S[r[1]]; inp.oninput = function () { S[r[1]] = +inp.value; apply(r[1]); }; }
      else { inp = h('select'); r[2].forEach(function (o) { var op = h('option', null, o[1]); op.value = o[0]; inp.appendChild(op); }); inp.value = String(S[r[1]]); inp.onchange = function () { S[r[1]] = isNaN(+inp.value) ? inp.value : +inp.value; apply(r[1]); }; }
      row.appendChild(inp); box.appendChild(row);
    });
    function apply(k) {
      if (k === 'quality') G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * S.quality);
      if (k === 'volume' && G.audio) G.audio.setVolume(S.volume);
      if (k === 'shadows' && G.race) G.race.world.lights.sun.castShadow = S.shadows;
      RX.saveSettings();
    }
  };
  ui.openSettings = function (from) { ui._settingsFrom = from; ui.show('settings'); };

  // ---------------- race HUD ----------------
  ui.raceStart = function (race) {
    var sess = race.sess;
    $('hudTitle').textContent = sess.title + ' · ' + sess.trackDef.name;
    $('hudMode').innerHTML = '';
    $('paceNote').classList.remove('on');
    $('mmCanvas').getContext('2d').clearRect(0, 0, 220, 220);
    $('hudPos').style.display = (sess.kind === 'race') ? '' : 'none';
    $('flash').innerHTML = '';
    var tips = sess.kind === 'drag' ? 'Hold BRAKE + THROTTLE to rev · release BRAKE on green (or hit throttle on green)' : sess.paceNotes ? 'Listen to your co-driver. R resets (+5 s).' : sess.drift ? 'Hold big angle at speed to build the multiplier.' : 'C camera · B look back · P pit · F DRS/boost · R reset · Esc pause';
    ui.flash(tips, 3.5, 'tip');
  };

  ui.flash = function (txt, dur, cls) {
    var f = $('flash'), el = h('div', 'fl ' + (cls || ''), txt);
    f.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, (dur || 1.4) * 1000);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, (dur || 1.4) * 1000 + 500);
    while (f.children.length > 4) f.removeChild(f.firstChild);
  };

  ui.paceNote = function (n) {
    var el = $('paceNote');
    var icon = n.grade === 'hairpin' ? '↶' : n.grade === 'jump' ? '⤴' : n.dir === 'left' ? '↰' : '↱';
    el.innerHTML = '<span class="pn-i">' + icon + '</span>' + n.text.toUpperCase();
    el.classList.add('on'); clearTimeout(ui._pnT); ui._pnT = setTimeout(function () { el.classList.remove('on'); }, 2200);
  };

  ui.initTouch = function () {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) $('touch').classList.add('on');
    document.querySelectorAll('#touch .tb').forEach(function (b) {
      var k = b.getAttribute('data-k'), tap = b.getAttribute('data-tap');
      var down = function (e) { e.preventDefault(); b.classList.add('down'); if (k) G.keys[k] = true; if (tap) { if (tap === 'Escape' && G.state === 'paused') RX.resume(); else if (G.race) G.race.onKey(tap); } };
      var up = function (e) { e.preventDefault(); b.classList.remove('down'); if (k) G.keys[k] = false; };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  };
  ui.mirrorFrame = function (x, y, w, h2, on) {
    var vz = $('visor'); vz.style.display = G.race && G.race.camMode === 2 && G.settings.helmetCam ? 'block' : 'none';
    var m = $('mirrorFrame'); m.style.display = on ? 'block' : 'none';
    if (on) { m.style.left = x - 3 + 'px'; m.style.top = y - 3 + 'px'; m.style.width = w + 'px'; m.style.height = h2 + 'px'; }
  };

  ui.hud = function (race) {
    var p = race.player, st = p.st, sess = race.sess;
    $('spd').textContent = RX.fmtSpeed(Math.abs(st.vx));
    $('spdU').textContent = RX.unitLabel();
    $('gear').textContent = st.gear === -1 ? 'R' : (st.shiftT > 0 ? '-' : st.gear);
    $('rpmBar').style.width = Math.min(100, st.rpm01 * 100) + '%';
    $('rpmBar').className = st.rpm01 > 0.94 ? 'red' : st.rpm01 > 0.82 ? 'amber' : '';
    $('rpmTxt').textContent = Math.round(st.rpm).toLocaleString() + ' rpm';
    var assists = [p.cus.tc ? 'TC' : '', p.cus.abs ? 'ABS' : '', p.cus.gearbox === 'manual' ? 'MAN' : 'AUTO', st.drs ? 'DRS' : '', st.nitroOn ? 'N2O' : '', race.p2pOn ? 'P2P' : '', race.attackT > 0 ? 'ATTACK ' + Math.ceil(race.attackT) : ''].filter(Boolean).join(' · ');
    $('assists').textContent = assists;
    // timing
    var lapT = race.started ? race.raceTime - p.lapStart : 0;
    var html = '';
    if (sess.kind === 'race') {
      var list = race.standings(), pos = list.indexOf(p) + 1;
      $('hudPos').innerHTML = '<b>' + pos + '</b><span>/' + list.filter(function (c) { return !c.out; }).length + '</span>';
      if (sess.timeLimit) html += '<div class="t-row"><span>Remaining</span><b>' + RX.fmtTime(Math.max(0, sess.timeLimit - race.raceTime)) + '</b></div>' + (race.hour != null ? '<div class="t-row"><span>Race clock</span><b>' + pad2(Math.floor(race.hour)) + ':' + pad2(Math.floor((race.hour % 1) * 60)) + '</b></div>' : '');
      else if (sess.elimination) html += '<div class="t-row"><span>Elimination</span><b>Lap ' + Math.max(1, p.lap + 1) + '</b></div>';
      else if (race.track.closed) html += '<div class="t-row"><span>Lap</span><b>' + Math.min(sess.laps, Math.max(1, p.lap + 1)) + ' / ' + sess.laps + '</b></div>';
      else html += '<div class="t-row"><span>Stage</span><b>' + Math.round((p.stageFrac || 0) * 100) + '%</b></div>';
      // gaps to the cars around
      var me = list.indexOf(p), ahead = list[me - 1], behind = list[me + 1];
      var vv = Math.max(10, st.vx);
      if (ahead) html += '<div class="t-row small"><span>▲ ' + nameOf(ahead) + '</span><b>+' + ((race.progress(ahead) - race.progress(p)) / vv).toFixed(1) + 's</b></div>';
      if (behind) html += '<div class="t-row small"><span>▼ ' + nameOf(behind) + '</span><b>-' + ((race.progress(p) - race.progress(behind)) / vv).toFixed(1) + 's</b></div>';
    }
    if (race.track.closed && sess.kind !== 'drag') {
      html += '<div class="t-row"><span>Current</span><b>' + (p.lap < 0 ? 'out lap' : RX.fmtTime(lapT)) + '</b></div>';
      html += '<div class="t-row"><span>Last</span><b>' + (p.laps.length ? RX.fmtTime(p.laps[p.laps.length - 1].time) : '--') + '</b></div>';
      html += '<div class="t-row"><span>Best</span><b class="purple">' + (p.best < Infinity ? RX.fmtTime(p.best) : '--') + '</b></div>';
    } else if (sess.kind !== 'drag') {
      html += '<div class="t-row"><span>Time</span><b>' + RX.fmtTime(race.raceTime + (race.resetPenalty || 0)) + '</b></div>';
      if (race.rivals) {
        // predicted position against rival times by fraction of stage completed
        var frac = Math.max(0.02, p.stageFrac || 0.02), pred = (race.raceTime + (race.resetPenalty || 0)) / frac;
        var rank = race.rivals.filter(function (r) { return r.time < pred; }).length + 1;
        html += '<div class="t-row small"><span>Projected</span><b>P' + rank + ' of ' + (race.rivals.length + 1) + '</b></div>';
        html += '<div class="t-row small"><span>Target (P1)</span><b>' + RX.fmtTime(race.rivals[0].time) + '</b></div>';
      }
      if (sess.timeAttack) html += '<div class="t-row"><span>Time left</span><b class="' + (race.timeLimitLeft < 10 ? 'red' : '') + '">' + race.timeLimitLeft.toFixed(1) + '</b></div>';
      if (race.cpS) html += '<div class="t-row small"><span>Waypoints</span><b>' + race.cpIdx + ' / ' + race.cpS.length + '</b></div>';
    }
    if (sess.kind === 'drag' && race.drag) {
      var D = race.drag;
      html += '<div class="t-row"><span>Reaction</span><b>' + (D.reaction != null ? D.reaction.toFixed(3) : '--') + '</b></div>';
      html += '<div class="t-row"><span>Elapsed</span><b>' + (D.et != null ? D.et.toFixed(3) : (D.phase === 'run' ? (race.raceTime - (D.reaction || 0)).toFixed(2) : '--')) + '</b></div>';
      if (D.oppEt != null) html += '<div class="t-row small"><span>Opponent ET</span><b>' + D.oppEt.toFixed(3) + '</b></div>';
      if (race.sess.bracket) html += '<div class="t-row small"><span>Dial-in</span><b>' + D.dial.toFixed(2) + '</b></div>';
      if (race.sess.topSpeed || race.sess.flyingMile) html += '<div class="t-row"><span>Top speed</span><b>' + RX.fmtSpeed(D.topSpeed || 0) + ' ' + RX.unitLabel() + '</b></div>';
    }
    $('timing').innerHTML = html;
    // mode widget: drift score, fuel/tyres/energy/nitro bars
    var mw = '';
    if (race.driftS) mw += '<div class="drift"><b>' + Math.round(race.driftS.score).toLocaleString() + '</b><span>' + (race.driftS.chain > 0 ? '+' + Math.round(race.driftS.chain) + ' x' + race.driftS.mult.toFixed(1) + (race.driftS.prox ? ' PROXIMITY' : '') : 'drift score') + '</span></div>';
    function bar(lab, v, cls) { return '<div class="mbar ' + (cls || '') + '"><span>' + lab + '</span><i><em style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%"></em></i></div>'; }
    if (sess.fuel) mw += bar('Fuel', st.fuel, st.fuel < 0.15 ? 'low' : '');
    if (sess.wear) mw += bar('Tyres', 1 - st.wear, st.wear > 0.7 ? 'low' : '');
    if (sess.energy) mw += bar('Battery', st.energy, st.energy < 0.15 ? 'low' : '');
    if (p.cus.nitro) mw += bar('Nitrous', st.nitro, 'cyan');
    if (sess.damage && G.settings.damage && st.damage > 0.02) mw += bar('Damage', st.damage, 'low');
    if (sess.mandatoryPit) mw += '<div class="note">' + (p.pitDone ? 'Pit stop done ✓' : 'Pit stop required (P in pit lane)') + '</div>';
    if (sess.joker) mw += '<div class="note">' + (p.jokerDone ? 'Joker lap ✓' : 'Joker lap: take the yellow lane once') + '</div>';
    if (race.attackArmed && !race.attackT && race.attackUses < 2) mw += '<div class="note cyan">Attack Mode armed — F</div>';
    $('hudMode').innerHTML = mw;
    // minimap
    var mm = $('mmCanvas'), g = mm.getContext('2d');
    g.clearRect(0, 0, 220, 220); g.drawImage(race.mm.base, 0, 0);
    race.ai.forEach(function (a) { if (a.out) return; var xy = race.mmXY(a.x, a.z); g.fillStyle = a.cus.paint1; g.beginPath(); g.arc(xy[0], xy[1], 4, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); });
    var me2 = race.mmXY(st.x, st.z); g.fillStyle = '#ffcc00'; g.beginPath(); g.arc(me2[0], me2[1], 6, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
    // start countdown
    var cd = $('countdown');
    if (!race.started && sess.kind !== 'drag' && race.countdown > 0) { cd.style.display = 'block'; cd.textContent = race.countdown > 3.5 ? 'READY' : Math.ceil(race.countdown); }
    else cd.style.display = 'none';
    if (race.pitting) { cd.style.display = 'block'; cd.textContent = 'PIT ' + Math.max(0, race.pitting.dur - race.pitting.t).toFixed(1); }
  };
  function nameOf(c) { return c.isPlayer ? 'You' : (c.name + ' · ' + c.car.name.split(' ').slice(0, 2).join(' ')); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // ---------------- results ----------------
  ui.results = function (race) {
    if (G.state !== 'race') return;
    var ev = race.event, sess = race.sess, p = race.player, rows = [], title = sess.title + ' — Results';
    var pts = RX.POINTS[sess.sport.id] || RX.POINTS.default;
    var summary = '';
    if (sess.kind === 'race') {
      var list = race.standings();
      var leader = list[0];
      list.forEach(function (c, i) {
        var gap = i === 0 ? (c.finishTime ? RX.fmtTime(c.finishTime) : '') : (c.out ? 'OUT' : (c.finishTime && leader.finishTime ? '+' + (c.finishTime - leader.finishTime).toFixed(3) : '+' + ((race.progress(leader) - race.progress(c)) / Math.max(10, (c.isPlayer ? c.st.vx : c.v) || 30)).toFixed(1) + 's'));
        var best = c.isPlayer ? c.laps.reduce(function (m, l) { return Math.min(m, l.time); }, Infinity) : c.best;
        rows.push([i + 1, c.isPlayer ? '<b>You</b>' : c.name, c.car.name, gap, best < Infinity ? RX.fmtTime(best) : '--', sess.championship ? (pts[i] || 0) : '']);
        if (sess.championship) { var key = c.isPlayer ? 'You' : c.name; ev.standings[key] = (ev.standings[key] || 0) + (pts[i] || 0); }
      });
      var pos = list.indexOf(p) + 1;
      ev.playerGridSlot = Math.max(0, pos - 1);
      ev.lastPos = pos;
      summary = pos === 1 ? 'Victory!' : 'You finished P' + pos;
    } else if (sess.kind === 'drag') {
      var D = race.drag;
      rows.push(['', '<b>You</b>', p.car.name, D.reaction != null ? D.reaction.toFixed(3) : '--', D.et != null ? D.et.toFixed(3) : '--', D.trap ? RX.fmtSpeed(D.trap) + ' ' + RX.unitLabel() : (D.topSpeed ? RX.fmtSpeed(D.topSpeed) + ' ' + RX.unitLabel() : '')]);
      if (race.ai[0]) rows.push(['', race.ai[0].name, race.ai[0].car.name, D.oppReaction.toFixed(3), D.oppEt != null ? D.oppEt.toFixed(3) : '--', D.oppTrap ? RX.fmtSpeed(D.oppTrap) + ' ' + RX.unitLabel() : '']);
      summary = sess.flyingMile ? 'Flying mile: ' + (D.avg ? RX.fmtSpeed(D.avg) + ' ' + RX.unitLabel() : 'no time') : sess.topSpeed ? 'Top speed ' + RX.fmtSpeed(D.topSpeed || 0) + ' ' + RX.unitLabel() : (D.redlit ? 'Red light — disqualified' : (D.win ? 'You win the round!' : 'Defeated'));
      ev.lastWin = D.win && !D.redlit;
    } else {
      // solo timed: you against rival times
      var my = p.dnf ? Infinity : (race.track.closed ? p.best : p.finishTime);
      if (sess.drift) { summary = 'Drift score: ' + Math.round(race.driftS ? race.driftS.score : 0).toLocaleString(); }
      var entries = (race.rivals || []).map(function (r) { return { name: r.name, car: r.car.name, time: r.time }; });
      if (ev.cumulative && sess.cumulative) {
        entries.forEach(function (e) { ev.cumulative[e.name] = (ev.cumulative[e.name] || 0) + e.time; e.time = ev.cumulative[e.name]; });
        ev.cumulative.You = (ev.cumulative.You || 0) + my; my = ev.cumulative.You;
      }
      if (sess.bestOf) { ev.bestRun = Math.min(ev.bestRun || Infinity, my); my = ev.bestRun; }
      entries.push({ name: '<b>You</b>', car: p.car.name, time: my, me: true });
      entries.sort(function (a, b) { return a.time - b.time; });
      entries.forEach(function (e, i) { rows.push([i + 1, e.name, e.car, isFinite(e.time) ? RX.fmtTime(e.time) : 'DNF', i ? (isFinite(e.time) ? '+' + (e.time - entries[0].time).toFixed(3) : '') : '', '']); });
      var myPos = entries.findIndex(function (e) { return e.me; }) + 1;
      ev.playerGridSlot = Math.max(0, Math.round((myPos - 1) / entries.length * ((sess.opponents || 11) + 1)));
      if (!sess.drift) summary = isFinite(my) ? (race.track.closed ? 'Best lap ' : 'Time ') + RX.fmtTime(my) + ' — P' + myPos : 'Did not finish';
      if (sess.quali) { ev.playerGridSlot = Math.max(0, Math.min(11, myPos - 1)); summary += ' (grid slot ' + (ev.playerGridSlot + 1) + ')'; }
    }
    var heads = sess.kind === 'drag' ? ['', 'Driver', 'Car', 'Reaction', 'ET', 'Trap'] : sess.kind === 'race' ? ['Pos', 'Driver', 'Car', 'Time / Gap', 'Best lap', sess.championship ? 'Pts' : ''] : ['Pos', 'Driver', 'Car', 'Time', 'Gap', ''];
    var html = '<table><tr>' + heads.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr' + (String(r[1]).indexOf('You') >= 0 ? ' class="me"' : '') + '>' + r.map(function (x) { return '<td>' + x + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    if (sess.championship) {
      var st2 = Object.keys(ev.standings).map(function (k) { return [k, ev.standings[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      html += '<h3>Championship standings</h3><table><tr><th>Pos</th><th>Driver</th><th>Points</th></tr>' + st2.slice(0, 12).map(function (r, i) { return '<tr' + (r[0] === 'You' ? ' class="me"' : '') + '><td>' + (i + 1) + '</td><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>';
    }
    $('resTitle').textContent = title; $('resSummary').textContent = summary; $('resTable').innerHTML = html;
    var next = ev.sessions[ev.index + 1];
    var ladderOut = sess.ladder != null && !ev.lastWin;
    var nb = $('resNext');
    if (next && !ladderOut) { nb.style.display = ''; nb.textContent = 'Continue: ' + next.title; nb.onclick = function () { ev.index++; RX.startSession(); }; }
    else nb.style.display = 'none';
    $('resRetry').onclick = function () { RX.startSession(); };
    $('resMenu').onclick = function () { RX.quitRace(); };
    G.state = 'results';
    ui.show('results');
  };

  ui.loading = function (on, txt) { $('loading').classList.toggle('on', !!on); if (txt) $('loadTxt').textContent = txt; };
  ui.backToMenu = function () { G.preview.active = true; ui.show(sel.sport ? 'setup' : 'title'); if (sel.car) ui.setPreviewCar(sel.car, sel.cus); };

  // ---------------- boot ----------------
  RX.boot = function () {
    RX.initRenderer($('gl'));
    ui.initPreview();
    ui.build();
    ui.initTouch();
    var hero = RX.sportById.f1.carList[RX.sportById.f1.carList.length - 1];
    ui.setPreviewCar(hero, RX.loadCustom(hero));
    ui.show('title');
    requestAnimationFrame(RX.loop);
  };
})();
