// Nightfall at Ashgrove — player, camera, combat, scripted story, UI and saves.
var NF = window.NF || (window.NF = {});
NF.game = (function () {
  var G = {}, V3 = THREE.Vector3, PI = Math.PI;
  var W = NF.world, E = NF.enemies, A = NF.anim, Mo = NF.models, S = NF.story, AU = NF.audio, FX = NF.fx;
  var renderer, scene, camera, hemi, flash, clock = new THREE.Clock();
  var mode = 'title', T = 0, flags = {}, stats = { kills: 0, saves: 0, time: 0, shots: 0, hits: 0 };
  var keys = {}, mouse = { aim: false, fire: false, fireEdge: false }, sens = 0.0022;
  var cam = { yaw: 0, pitch: -0.08, dist: 2.6, sh: 0.48, fov: 62, shake: 0, quick: 0 };
  var $ = function (id) { return document.getElementById(id); };
  var WEAP = {
    handgun: { name: 'M19 Handgun', cap: 13, dmg: 17, rate: 0.24, reload: 1.5, spread: [0.05, 0.004], recoil: 0.035, long: false },
    shotgun: { name: 'M37 Shotgun', cap: 6, dmg: 12, pellets: 9, rate: 0.95, reload: 0.5, spread: [0.1, 0.065], recoil: 0.09, long: true },
    magnum: { name: 'Bulldog .50', cap: 6, dmg: 160, rate: 0.85, reload: 2.4, spread: [0.04, 0.002], recoil: 0.16, long: false },
    smg: { name: 'MP5-K', cap: 32, dmg: 9, rate: 0.075, reload: 1.9, spread: [0.075, 0.025], recoil: 0.014, long: true, auto: true },
    rifle: { name: 'Remington 700', cap: 5, dmg: 110, rate: 1.15, reload: 2.6, spread: [0.03, 0.0004], recoil: 0.12, long: true, scope: true },
    gl: { name: 'M79 Launcher', cap: 1, dmg: 0, rate: 1.0, reload: 1.6, spread: [0.02, 0.01], recoil: 0.1, long: true, proj: 'gl' },
    rpg: { name: 'M72 Rocket', cap: 1, dmg: 0, rate: 1.0, reload: 3.0, spread: [0.01, 0.005], recoil: 0.14, long: true, proj: 'rpg' }
  };
  var WORDER = ['handgun', 'shotgun', 'magnum', 'smg', 'rifle', 'gl', 'rpg'];
  var AMMO_OF = { hg_ammo: 'handgun', sg_ammo: 'shotgun', mag_ammo: 'magnum', smg_ammo: 'smg', rifle_ammo: 'rifle', gl_ammo: 'gl', rpg_ammo: 'rpg' };
  var AMMO_NAME = { handgun: 'Handgun Ammo', shotgun: 'Shotgun Shells', magnum: 'Magnum Rounds', smg: 'SMG Ammo', rifle: 'Rifle Rounds', gl: 'Launcher Grenades', rpg: 'Rocket' };
  var CONSUMABLE = ['herb', 'red_herb', 'blue_herb', 'mixed', 'mixed_gr', 'spray', 'powder'];
  // weapon stats with the player's upgrades applied
  function WS(w) {
    var d = WEAP[w], u = P.upg[w] || {}, o = {}; for (var k in d) o[k] = d[k];
    o.cap = d.cap + (d.cap > 1 ? Math.ceil(d.cap * 0.3) * (u.cap || 0) : 0);
    o.dmg = d.dmg * (1 + 0.25 * (u.pow || 0)); o.reload = d.reload * (1 - 0.15 * (u.rel || 0)); o.rate = d.rate * (1 - 0.12 * (u.rate || 0));
    return o;
  }
  var P = G.player = {
    pos: new V3(0, 0, 2.2), yaw: 0, hp: 100, alive: true, invuln: 0, ph: 0, speed: 0, grabbedBy: null, grabT: 0, flinch: 0,
    weapon: 'handgun', owned: { handgun: true, shotgun: false, magnum: false, smg: false, rifle: false, gl: false, rpg: false }, mag: { handgun: 13, shotgun: 0, magnum: 0, smg: 0, rifle: 0, gl: 0, rpg: 0 }, ammo: { handgun: 18, shotgun: 0, magnum: 0, smg: 0, rifle: 0, gl: 0, rpg: 0 },
    inv: { herb: 0, mixed: 0, spray: 0, key_raven: 0, crest: 0, keycard: 0, red_herb: 0, blue_herb: 0, mixed_gr: 0, powder: 0, fuse: 0, flare: 0 }, files: [],
    money: 0, treasures: [], upg: {}, slots: 8, stash: {}, poison: 0, grenades: 0, vest: false, inVeh: null,
    fireCd: 0, reloadT: 0, knifeT: 0, healT: 0, recoil: 0, focus: 0, flashOn: true, deadT: 0, stepPh: 0,
    chest: function () { return new V3(P.pos.x, P.pos.y + 1.35, P.pos.z); },
    hurt: function (dmg, src, kind) { hurtPlayer(dmg, src, kind); }
  };
  var rig, gun = {}, teo = null;

  // ------------------------------------------------------------------ boot
  G.boot = function () {
    renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.physicallyCorrectLights = false;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#020203'); scene.fog = new THREE.FogExp2('#030304', 0.045);
    camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 420);
    hemi = new THREE.HemisphereLight('#5a6478', '#20160e', 0.42); scene.add(hemi);
    flash = new THREE.SpotLight('#fff1d8', 2.6, 24, 0.42, 0.55, 1.4); flash.castShadow = true;
    flash.shadow.mapSize.set(1024, 1024); flash.shadow.camera.near = 0.3; flash.shadow.camera.far = 24; flash.shadow.bias = -0.0005;
    scene.add(flash); scene.add(flash.target);
    W.build(scene); FX.init(scene); E.init(scene);
    NF.terrain.init(scene); NF.creatures.init(scene); NF.vehicles.init(scene);
    initEnv();
    rig = Mo.mara(); rig.root.rotation.order = 'YXZ'; scene.add(rig.root);
    gun.handgun = Mo.weapon('handgun'); gun.magnum = Mo.weapon('magnum'); gun.shotgun = Mo.weapon('shotgun'); gun.knife = Mo.weapon('knife');
    [gun.handgun, gun.magnum, gun.knife].forEach(function (g) { g.rotation.x = PI / 2; g.position.set(0, -0.085, 0.01); rig.J.wrR.add(g); g.visible = false; });
    ['shotgun', 'smg', 'rifle', 'gl', 'rpg'].forEach(function (w) { if (!gun[w]) gun[w] = Mo.weapon(w); rig.J.chest.add(gun[w]); gun[w].visible = false; });
    var lamp = new THREE.Mesh(Mo.box(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 2 })); lamp.position.set(-0.1, 0.22, 0.16); rig.J.chest.add(lamp);
    makeTeo();
    window.addEventListener('resize', function () { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
    bindInput(); bindUI();
    var cont = false; try { cont = sessionStorage.getItem('nf_continue') === '1'; sessionStorage.removeItem('nf_continue'); } catch (e) { }
    $('bCont').disabled = !loadData();
    $('loading').style.display = 'none';
    // warm the renderer so the first frames don't hitch
    renderer.compile(scene, camera);
    if (cont && loadData()) { startFromSave(); } else showTitle();
    requestAnimationFrame(loop);
  };
  function makeTeo() {
    teo = Mo.teo(); teo.root.position.set(8.6, 0, 30.42); scene.add(teo.root);
    var p = A.base(); p.hipsY = -0.8; p.hipL = [-2.05, 0, 0.18]; p.knL = [1.95, 0, 0]; p.anL = [0.1, 0, 0]; p.hipR = [-1.5, 0.15, -0.12]; p.knR = [0.15, 0, 0]; p.anR = [-0.3, 0, 0]; p.spine = [-0.3, 0, 0]; p.chest = [0.05, 0, 0]; p.head = [0.45, 0.2, 0.25];
    p.shR = [-0.35, 0, 0.5]; p.elR = [-1.6, 0, 0]; p.shL = [-0.95, 0, 0.15]; p.elL = [-0.45, 0, 0];
    teo.pose = p; A.apply(teo, p, 1);
    W.decal(8.6, 30.9, 1.2, 77);
    W.spot('teo', 8.6, 31.3, 1.8, 'Talk to Teo', function () { teoTalk(); }, 0.7);
  }

  // ------------------------------------------------------------------ input
  function bindInput() {
    var cv = $('game');
    cv.addEventListener('click', function () { AU.init(); if (mode === 'play' && !document.pointerLockElement && cv.requestPointerLock) { try { var r = cv.requestPointerLock(); if (r && r.catch) r.catch(function () { }); } catch (e) { } } });
    document.addEventListener('mousemove', function (e) {
      if (mode !== 'play' || !P.alive) return;
      if (!document.pointerLockElement && !(e.buttons & 2) && !mouse.free) { if (!mouse.free) return; }
      cam.yaw -= e.movementX * sens; cam.pitch = Math.max(-1.1, Math.min(1.0, cam.pitch - e.movementY * sens));
    });
    document.addEventListener('pointerlockchange', function () { mouse.free = false; });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('mousedown', function (e) {
      AU.init();
      if (mode !== 'play') return;
      if (!document.pointerLockElement) mouse.free = true;
      if (e.button === 2) mouse.aim = true;
      if (e.button === 0) { mouse.fire = true; mouse.fireEdge = true; }
    });
    document.addEventListener('mouseup', function (e) { if (e.button === 2) mouse.aim = false; if (e.button === 0) mouse.fire = false; });
    document.addEventListener('keydown', function (e) {
      AU.init();
      var k = e.key.toLowerCase(); keys[k] = true;
      if (k === 'tab') e.preventDefault();
      if (mode === 'cine' && (k === ' ' || k === 'enter' || k === 'escape')) { skipCine(); return; }
      if (mode === 'ui') { if (k === 'escape' || k === 'tab' || k === 'i' || k === 'm' || (k === 'e' && G.ui === 'file') || (k === 'p' && G.ui === 'pause')) closeUI(); return; }
      if (mode !== 'play') return;
      if (P.inVeh) { if (k === 'e') G.exitVehicle(); else if (k === 'escape' || k === 'p') openUI('pause'); else if (k === 'm') openUI('map'); else if (k === 'tab' || k === 'i') openUI('inv'); else if (k === 'f') { P.flashOn = !P.flashOn; } return; }
      if (k === 'escape' || k === 'p') openUI('pause');
      else if (k === 'tab' || k === 'i') openUI('inv');
      else if (k === 'm') openUI('map');
      else if (k === 'e') interact();
      else if (k === 'r') startReload();
      else if (k === 'q' && !mouse.aim) { cam.quick = PI; }
      else if (k === 'f') { P.flashOn = !P.flashOn; AU.click(); }
      else if (k === 'h') quickHeal();
      else if (k === 'g') throwGrenade();
      else if (k >= '1' && k <= '7') equip(WORDER[+k - 1]);
    });
    document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', function () { keys = {}; mouse.aim = mouse.fire = false; if (mode === 'play') openUI('pause'); });
  }
  function bindUI() {
    $('bNew').onclick = function () { AU.init(); newGame(); };
    $('bCont').onclick = function () { AU.init(); startFromSave(); };
    $('bCtl').onclick = function () { showScreen('controls'); };
    $('bCtl2').onclick = function () { $('pause').classList.remove('on'); showScreen('controls'); G.ui = 'controls'; };
    document.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { $('controls').classList.remove('on'); if (mode === 'title') showScreen('title'); else { G.ui = 'pause'; $('pause').classList.add('on'); } }; });
    $('bRes').onclick = closeUI;
    $('bTitle').onclick = $('bTitle2').onclick = $('bTitle3').onclick = function () { location.reload(); };
    $('bRetry').onclick = function () { try { sessionStorage.setItem('nf_continue', '1'); } catch (e) { } location.reload(); };
    $('vol').oninput = function () { AU.setVolume(+this.value); };
    $('sens').oninput = function () { sens = +this.value; };
    $('bright').oninput = function () { renderer.toneMappingExposure = 1.15 * this.value; };
    document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); $('invItems').style.display = b.dataset.tab === 'items' ? '' : 'none'; $('invFiles').style.display = b.dataset.tab === 'files' ? '' : 'none'; }; });
    try { var st = JSON.parse(localStorage.getItem('nf_settings') || '{}'); if (st.sens) { sens = st.sens; $('sens').value = st.sens; } } catch (e) { }
  }
  function showScreen(id) { document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('on', s.id === id); }); }
  function hideScreens() { document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); }); }

  // ------------------------------------------------------------------ flow
  function showTitle() { mode = 'title'; showScreen('title'); fade(0, 1.5); $('hud').style.opacity = 0; }
  function newGame() {
    hideScreens(); mode = 'intro'; fade(1, 0.01);
    spawnAll();
    var lines = S.intro, i = 0, el = $('introT'); showScreen('intro');
    function next() {
      if (mode !== 'intro') return;
      if (i >= lines.length) { $('intro').classList.remove('on'); introCine(); return; }
      el.style.opacity = 0;
      setTimeout(function () { el.innerHTML = lines[i++]; el.style.opacity = 1; setTimeout(next, 4200); }, 900);
    }
    next();
    var skipper = function (e) { if (mode === 'intro' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { i = lines.length; mode = 'introSkip'; document.removeEventListener('keydown', skipper); $('intro').classList.remove('on'); introCine(); } };
    document.addEventListener('keydown', skipper);
  }
  function introCine() {
    if (mode === 'cine' || mode === 'play') return;
    P.pos.set(0, 0, 1.6); P.yaw = 0; cam.yaw = 0;
    $('hud').style.opacity = 1;
    flags.visited = { foyer: true };
    AU.music(null);
    cine([
      { pos: [0, 6.5, 14], look: [0, 6.3, 9], pos2: [0, 4.5, 13], look2: [0, 2.5, 6], dur: 4, at: function () { fade(0, 2.5); } },
      { pos: [3.5, 1.6, 6.5], look: [0, 1.4, 2], pos2: [2.2, 1.6, 5.6], look2: [0, 1.4, 1.8], dur: 5.5, at: function () { setTimeout(function () { var d = W.doors.filter(function (x) { return x.id === 'front'; })[0]; AU.thud(new V3(0, 1.5, -0.5), 1.2); setTimeout(function () { AU.thud(new V3(0, 1.5, -0.5), 1); }, 600); setTimeout(function () { AU.thud(new V3(0, 1.5, -0.5), 1); }, 1100); }, 600); },
        lines: [['', '(Hammering — from outside the front doors.)', 2.5], ['MARA', 'Hey! HEY! There\'s someone in here!', 2.8]] },
      { pos: [-1.6, 1.7, 4.2], look: [0, 1.55, 1.6], dur: 6,
        lines: [['MARA', 'Teo? Teo, do you copy? ...Raven Unit, anyone?', 3], ['', '(Static.)', 1.4], ['MARA', 'Boarded in. Great. Somebody wanted us in here.', 2.8]] },
      { pos: [1.2, 1.8, 0.4], look: [-6, 1.5, 9], dur: 4.5, at: function () { setTimeout(function () { AU.gun('handgun'); AU.sting(); }, 400); },
        lines: [['', '(A gunshot echoes from the west wing.)', 2], ['MARA', 'A gunshot — the dining room. Teo...', 2.5]] }
    ], function () { objective('start'); hint('Click the game to capture the mouse · WASD move · Shift run · Right-click aim · E interact', 7); autosave(); });
  }
  function startFromSave() {
    var d = loadData(); if (!d) { newGame(); return; }
    hideScreens(); spawnAll(); applySave(d); mode = 'play'; $('hud').style.opacity = 1; fade(0, 1.2);
    toast('Continue — ' + (W.roomAt(P.pos.x, P.pos.z) || { name: 'Ashgrove' }).name);
    if (flags.bossDead && !flags.escaped) startEscape();
  }
  function gameOver() {
    mode = 'dead'; document.exitPointerLock && document.exitPointerLock();
    AU.music(null); AU.sting();
    setTimeout(function () { showScreen('death'); requestAnimationFrame(function () { $('death').classList.add('on'); }); }, 2600);
  }

  // ------------------------------------------------------------------ spawns
  function spawnAll() {
    if (G.spawned) return; G.spawned = true;
    E.spawn('zombie', 'z_eat', -20.25, 6.75, { state: 'eat', yaw: -2.95, variant: 1, seed: 11 });
    E.spawn('zombie', 'z_d2', -25.5, 15.3, { variant: 6, yaw: 0.8, seed: 12 });
    E.spawn('zombie', 'z_l1', 21.5, 8.0, { variant: 2, yaw: -1.5, seed: 13 });
    E.spawn('zombie', 'z_l2', 12.6, 15.6, { variant: 4, yaw: 2.5, seed: 14 });
    E.spawn('zombie', 'z_h1', 0.6, 44.6, { variant: 3, yaw: PI, seed: 15 });
    E.spawn('zombie', 'z_g1', -1.5, 39.5, { variant: 7, yaw: 2, seed: 16 });
    E.spawn('boss', 'boss', 0, 62, { hidden: true, yaw: PI });
  }
  function spawnStage() { // event spawns that depend on story flags
    if (flags.gotRaven && !E.byId('z_f1')) E.spawn('zombie', 'z_f1', 6.5, 13.5, { variant: 5, yaw: -2, seed: 21 });
    if (flags.gotCrest && !E.byId('skinner')) E.spawn('skinner', 'skinner', 25.0, 15.6, { yaw: -2.2 });
    if (flags.gotCrest && !E.byId('z_f2')) E.spawn('zombie', 'z_f2', -6.5, 15.5, { variant: 4, yaw: 2.5, seed: 22 });
    if (flags.hallDogs && !E.byId('dog1')) { E.spawn('dog', 'dog1', -2.0, 29, { alert: true, yaw: PI / 2, seed: 4 }); E.spawn('dog', 'dog2', -2.0, 38, { alert: true, yaw: PI / 2, seed: 7 }); }
    if (flags.teoTalked && !E.byId('z_f3')) { E.spawn('zombie', 'z_f3', -4, 6, { variant: 3, seed: 23 }); E.spawn('zombie', 'z_d3', -14, 4.5, { variant: 0, seed: 24 }); }
    if (flags.warden && !flags.labIn && !E.byId('warden')) E.spawn('warden', 'warden', -4.1, 33, { yaw: PI / 2, state: 'walk' });
  }

  // ------------------------------------------------------------------ player
  function hurtPlayer(dmg, src, kind) {
    if (!P.alive || P.invuln > 0 || mode !== 'play') return;
    if (P.vest) dmg *= 0.75;
    if (P.inVeh) { dmg *= 0.4; kind = 'hit'; }
    P.hp -= dmg; P.flinch = 1; P.invuln = kind === 'grab' ? 1.6 : 0.8; P.reloadT = 0; P.healT = 0;
    AU.hurt(); G.shake(kind === 'cleave' || kind === 'slam' ? 0.9 : 0.4);
    $('dmg').style.opacity = 1; setTimeout(function () { $('dmg').style.opacity = 0; }, 260);
    FX.blood(P.chest(), new V3((Math.random() - .5), 0.5, (Math.random() - .5)), 10);
    if (kind === 'grab' && src) { P.grabbedBy = src; P.grabT = 1.1; P.yaw = Math.atan2(src.pos.x - P.pos.x, src.pos.z - P.pos.z); }
    if ((kind === 'cleave' || kind === 'slam' || kind === 'claw' || kind === 'blast') && src && src.pos) { var away = P.pos.clone().sub(src.pos).setY(0).normalize(); P.knock = away.multiplyScalar(kind === 'slam' ? 5 : 3.5); }
    if (P.hp <= 0) { P.hp = 0; P.alive = false; P.deadT = 0; P.grabbedBy = null; gameOver(); }
  }
  function equip(w) {
    if (!P.owned[w] || P.weapon === w || P.reloadT > 0) return;
    P.weapon = w; P.reloadT = 0; AU.reload('x'); toast(WEAP[w].name);
  }
  function startReload() {
    var w = P.weapon, d = WS(w);
    if (P.reloadT > 0 || P.mag[w] >= d.cap || P.ammo[w] <= 0) { if (P.ammo[w] <= 0 && P.mag[w] < d.cap) toast('No ammunition'); return; }
    P.reloadT = w === 'shotgun' ? d.reload * Math.min(d.cap - P.mag[w], P.ammo[w]) + 0.4 : d.reload; P.reloadMax = P.reloadT;
    AU.reload(w);
  }
  function finishReload() { var w = P.weapon, d = WS(w), n = Math.min(d.cap - P.mag[w], P.ammo[w]); P.mag[w] += n; P.ammo[w] -= n; }
  function camForward() { return new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  function fire() {
    var w = P.weapon, d = WS(w);
    if (P.fireCd > 0 || P.reloadT > 0) return;
    if (P.mag[w] <= 0) { AU.click(); P.fireCd = 0.3; if (P.ammo[w] > 0) startReload(); return; }
    P.mag[w]--; P.fireCd = d.rate; stats.shots++;
    if (d.proj) { launch(w, d); return; }
    var spread = d.spread[0] + (d.spread[1] - d.spread[0]) * P.focus;
    var o = camera.position.clone(), fwd = new V3(); camera.getWorldDirection(fwd);
    var skip = Math.max(0.2, camera.position.distanceTo(P.pos.clone().setY(P.pos.y + 1.5)) - 0.4);
    var right = new V3().crossVectors(fwd, camera.up).normalize(), up = new V3().crossVectors(right, fwd).normalize();
    var n = d.pellets || 1, anyHit = false, crit = w === 'handgun' && P.focus > 0.95 && Math.random() < 0.25;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * PI * 2, r = Math.sqrt(Math.random()) * spread;
      var dir = fwd.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      var o2 = o.clone().addScaledVector(dir, skip);
      var wd = W.ray(o2, dir, 60);
      var hit = E.raycast(o2, dir, wd);
      if (hit) {
        var dmg = d.dmg; if (w === 'shotgun') dmg *= Math.max(0.35, 1 - hit.t / 14);
        if (crit && hit.part === 'head') { dmg *= 6; toast('CRITICAL'); }
        E.damage(hit.e, dmg, hit.part, hit.point, dir, crit ? 'magnum' : w); anyHit = true;
      } else if (wd < 60) { var pt = o2.clone().addScaledVector(dir, wd - 0.02); FX.sparks(pt, dir.clone().negate()); if (i < 2) AU.impact(pt, false); }
    }
    if (anyHit) stats.hits++;
    var gm = gun[w]; gm.updateMatrixWorld(true);
    var mz = gm.localToWorld(gm.userData.muzzle.clone());
    FX.muzzle(mz, fwd, w !== 'handgun');
    var rr = new V3(-Math.cos(P.yaw), 0, Math.sin(P.yaw)).multiplyScalar(-1);
    if (w === 'handgun') FX.shell(mz.clone().addScaledVector(fwd, -0.12), rr, false);
    if (w === 'shotgun') setTimeout(function () { FX.shell(mz.clone().addScaledVector(fwd, -0.5), rr, true); AU.reload('pump'); }, 380);
    if (w === 'smg' || w === 'rifle') FX.shell(mz.clone().addScaledVector(fwd, -0.3), rr, false);
    AU.gun(w === 'smg' ? 'handgun' : w === 'rifle' ? 'magnum' : w); E.noise(P.pos, w === 'handgun' || w === 'smg' ? 22 : 34);
    cam.pitch = Math.min(1.0, cam.pitch + d.recoil * (0.7 + Math.random() * 0.5)); cam.yaw += (Math.random() - .5) * d.recoil * 0.4;
    P.recoil = 1; P.focus *= w === 'handgun' ? 0.35 : 0.1; G.shake(d.recoil * 2);
  }
  function knife() {
    if (P.knifeT > 0 || P.reloadT > 0) return;
    P.knifeT = 0.5; AU.knife();
    setTimeout(function () {
      var fwd = new V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), best = null, bd = 1.8;
      E.list.forEach(function (e) { if (e.dead || e.state === 'dormant') return; var to = e.pos.clone().sub(P.pos); var d = to.length(); if (d < bd && fwd.dot(to.normalize()) > 0.4) { bd = d; best = e; } });
      if (best) { var pt = best.pos.clone().setY(best.pos.y + (best.type === 'dog' ? 0.6 : best.state === 'down' ? 0.3 : 1.25)); E.damage(best, best.state === 'down' ? 16 : 10, 'body', pt, fwd, 'knife'); AU.impact(pt, true); }
    }, 160);
  }
  function muzzleOf(w) { var gm = gun[w]; gm.updateMatrixWorld(true); return gm.localToWorld(gm.userData.muzzle.clone()); }
  function aimPoint() { var o = camera.position.clone(), f = new V3(); camera.getWorldDirection(f); var skip = Math.max(0.2, camera.position.distanceTo(P.chest()) - 0.3); var o2 = o.clone().addScaledVector(f, skip); var t = W.ray(o2, f, 200); var h = E.raycast(o2, f, t); return o2.addScaledVector(f, h ? h.t : t); }
  function launch(w, d) {
    var mz = muzzleOf(w), tgt = aimPoint(), dir = tgt.clone().sub(mz).normalize(), m;
    if (w === 'gl') { m = new THREE.Mesh(Mo.sphere(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#3a4a2a' })); var v = dir.multiplyScalar(32); v.y += 2.2; NF.creatures.shoot({ pos: mz, vel: v, g: 9.8, mesh: m, explode: { r: 6, dmg: 160 }, life: 5, trail: '#999' }); AU.gun('shotgun'); }
    else { m = new THREE.Group(); var b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#4a5a3a' })); b.rotation.x = PI / 2; m.add(b); m.lookAt(dir); NF.creatures.shoot({ pos: mz, vel: dir.multiplyScalar(55), g: 0.4, mesh: m, explode: { r: 8, dmg: 650 }, life: 6, trail: '#ccc' }); AU.boom(mz, 2); FX.puff(mz.clone().addScaledVector(dir, -1.2), '#bbb'); }
    FX.muzzle(mz, dir, true); E.noise(P.pos, 30); P.recoil = 1; cam.pitch = Math.min(1, cam.pitch + d.recoil); G.shake(0.3);
    if (P.ammo[w] > 0) setTimeout(function () { if (P.weapon === w && P.mag[w] === 0) startReload(); }, 400);
  }
  function throwGrenade() {
    if (P.grenades <= 0) { toast('No grenades'); return; }
    if (P.knifeT > 0) return;
    P.grenades--; P.knifeT = 0.5; AU.knife();
    var from = P.chest().add(new V3(0, 0.3, 0)), f = camForward(); var v = f.multiplyScalar(15); v.y += 5;
    var m = new THREE.Mesh(Mo.sphere(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: '#3a4a2a', roughness: 0.6 })); m.scale.y = 1.3;
    setTimeout(function () { NF.creatures.shoot({ pos: from, vel: v, g: 12, mesh: m, explode: { r: 6.5, dmg: 180 }, life: 2.4, spin: 9 }); }, 150);
  }
  G.poison = function (n) { if (P.poison <= 0) toast('Poisoned! Use a blue herb'); P.poison = Math.max(P.poison, n); };
  G.toastMsg = function (m) { toast(m); };
  G.flag = function (k) { return flags[k]; };
  G.noDrop = function (e) { e.noDrop = true; };
  G.spawnGate = function () { return true; };
  G.onRevive = function (e) { if (flags.killed) delete flags.killed[e.id]; };
  function quickHeal() {
    if (P.healT > 0 || P.hp >= 100) return;
    if (P.poison > 0 && P.inv.blue_herb > 0) { useHeal('blue_herb'); return; }
    var it = P.inv.herb > 0 && P.hp > 40 ? 'herb' : P.inv.mixed > 0 ? 'mixed' : P.inv.mixed_gr > 0 ? 'mixed_gr' : P.inv.herb > 0 ? 'herb' : P.inv.spray > 0 ? 'spray' : null;
    if (!it) { toast('Nothing to heal with'); return; }
    useHeal(it);
  }
  function useHeal(it) {
    if (P.inv[it] <= 0 || (P.hp >= 100 && !(it === 'blue_herb' && P.poison > 0))) return false;
    if (it === 'blue_herb') P.poison = 0;
    P.inv[it]--; P.healT = 1.0; P.hp = Math.min(100, P.hp + (it === 'herb' ? 35 : it === 'blue_herb' ? 10 : it === 'mixed' ? 75 : 100)); AU.pickup(); toast('Used ' + S.items[it].name); return true;
  }
  function updatePlayer(dt) {
    var J = rig.J;
    P.invuln -= dt; P.fireCd -= dt; P.knifeT -= dt; P.healT -= dt; P.flinch = Math.max(0, P.flinch - dt * 2.5); P.recoil = Math.max(0, P.recoil - dt * 7);
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) finishReload(); }
    var pose;
    if (P.poison > 0 && P.alive && mode === 'play') { P.poison -= dt; P.hp -= dt * 1.4; if (P.hp <= 1) { P.hp = 1; } }
    if (P.inVeh && P.alive) { driveUpdate(dt); return; }
    if (!P.alive) {
      P.deadT += dt; pose = A.base();
      var f = Math.min(1, Math.max(0, (P.deadT - 0.3) / 0.6));
      rig.root.rotation.x = -PI / 2 * f * f; rig.root.position.y = P.pos.y + 0.12 * f;
      if (P.deadT < 0.4) A.dying(pose, P.deadT / 0.4); else A.dead(pose);
      A.apply(rig, pose, 1 - Math.exp(-dt * 10)); rig.root.position.x = P.pos.x; rig.root.position.z = P.pos.z; rig.root.rotation.y = P.yaw;
      return;
    }
    var input = new V3(), fwd = new V3(Math.sin(cam.yaw), 0, Math.cos(cam.yaw)), right = new V3(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    var canAct = mode === 'play' && !P.grabbedBy;
    if (canAct) {
      if (keys.w) input.add(fwd); if (keys.s) input.sub(fwd); if (keys.d) input.add(right); if (keys.a) input.sub(right);
      if (keys.arrowleft) cam.yaw += dt * 2.2; if (keys.arrowright) cam.yaw -= dt * 2.2;
      if (keys.arrowup) cam.pitch = Math.min(1, cam.pitch + dt * 1.2); if (keys.arrowdown) cam.pitch = Math.max(-1.1, cam.pitch - dt * 1.2);
    }
    if (cam.quick > 0) { var qs = Math.min(cam.quick, dt * 12); cam.yaw += qs; P.yaw += qs; cam.quick -= qs; }
    var aiming = canAct && mouse.aim && P.reloadT <= 0 && P.healT <= 0;
    var running = keys.shift && !aiming && input.lengthSq() > 0;
    var state = P.hp >= 60 ? 0 : P.hp >= 25 ? 1 : 2;
    var spd = aiming ? 1.0 : running ? (state === 2 ? 3.0 : 4.6) : (state === 2 ? 1.4 : 2.1);
    if (P.reloadT > 0 || P.healT > 0) spd = Math.min(spd, 1.6);
    if (P.knifeT > 0) spd = 0.6;
    var moving = input.lengthSq() > 0;
    if (moving) input.normalize();
    var targetV = input.multiplyScalar(spd);
    P.vel = P.vel || new V3(); P.vel.lerp(targetV, 1 - Math.exp(-dt * 10));
    if (P.knock) { P.vel.add(P.knock); P.knock.multiplyScalar(Math.exp(-dt * 6)); if (P.knock.length() < 0.1) P.knock = null; }
    P.pos.addScaledVector(P.vel, dt); W.collide(P.pos, 0.3);
    E.list.forEach(function (e) { if (e.dead || e.state === 'dormant') return; var dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d2 = dx * dx + dz * dz, m = 0.3 + e.rad; if (d2 < m * m && d2 > 1e-6) { var d = Math.sqrt(d2); P.pos.x += dx / d * (m - d); P.pos.z += dz / d * (m - d); } });
    W.collide(P.pos, 0.3);
    P.pos.y = W.ground(P.pos.x, P.pos.z);
    var sp = Math.hypot(P.vel.x, P.vel.z); P.speed = sp;
    if (aiming) { P.yaw = cam.yaw; P.focus = Math.min(1, P.focus + dt * (sp > 0.3 ? 0.25 : 0.9)); }
    else { P.focus = Math.max(0, P.focus - dt * 2); if (sp > 0.2) { var ty = Math.atan2(P.vel.x, P.vel.z), dy = ty - P.yaw; while (dy > PI) dy -= 2 * PI; while (dy < -PI) dy += 2 * PI; P.yaw += dy * (1 - Math.exp(-dt * 10)); } }
    if (P.grabbedBy) { P.grabT -= dt; if (P.grabT <= 0 || P.grabbedBy.dead) { var z = P.grabbedBy; if (!z.dead) { var push = z.pos.clone().sub(P.pos).setY(0).normalize(); z.pos.addScaledVector(push, 0.8); z.state = 'stagger'; z.t = 0; W.collide(z.pos, z.rad); } P.grabbedBy = null; } }
    // footsteps
    var prev = P.ph; P.ph += dt * (sp * (running ? 2.4 : 3.0) + (sp > 0.1 ? 1 : 0));
    if (sp > 0.3 && Math.floor(prev / PI) !== Math.floor(P.ph / PI)) {
      var room = W.roomAt(P.pos.x, P.pos.z); AU.step(P.pos.clone(), room ? (room.floor === 'tile' || room.floor === 'marble' ? 'tile' : room.floor) : 'wood', running ? 0.5 : 0.28);
      E.noise(P.pos, running ? 9 : 2.2);
    }
    // pose
    var t = T;
    var amp = Math.min(1, sp / 2.1), run = running ? Math.min(1, (sp - 2) / 2.5) : 0;
    pose = sp > 0.15 ? A.walk(P.ph, amp, Math.max(0, run)) : A.idle(t, 0.5);
    var w = P.weapon, long = WEAP[w].long;
    for (var gk in gun) gun[gk].visible = false;
    if (P.grabbedBy) A.grabbed(pose, t);
    else if (P.healT > 0) A.heal(pose, 1 - P.healT);
    else if (P.knifeT > 0) { A.knife(pose, 1 - P.knifeT / 0.5); gun.knife.visible = true; }
    else if (P.reloadT > 0) { A.reload(pose, 1 - P.reloadT / P.reloadMax); gun[w].visible = true; }
    else if (aiming) { if (long) A.aimLong(pose, cam.pitch, P.recoil, t); else A.aimPistol(pose, cam.pitch, P.recoil, t); gun[w].visible = true; }
    else if (long) { A.holdLong(pose); gun[w].visible = true; }
    if (long) {
      var gl = gun[w], shoulder = w === 'rpg';
      if (aiming) { gl.position.set(-0.1, shoulder ? 0.3 : 0.16, 0.18); gl.rotation.set(-cam.pitch * 0.75 - P.recoil * 0.2, 0.03, 0); }
      else { gl.position.set(-0.1, -0.02, 0.2); gl.rotation.set(0.6, 0.38, 0.1); }
    }
    if (state === 2 && sp > 0.15) { A.add(pose, 'spine', 0.15, 0, 0.1); A.add(pose, 'knR', 0.3, 0, 0); if (!aiming) { pose.shL = [-0.5, 0, -0.3]; pose.elL = [-1.6, 0, 0]; } }
    if (P.flinch > 0) A.flinch(pose, P.flinch);
    A.apply(rig, pose, 1 - Math.exp(-dt * 14));
    rig.root.position.copy(P.pos); rig.root.rotation.y = P.yaw; rig.root.rotation.x = 0;
    // combat input
    if (canAct) {
      if (aiming && mouse.fire && (mouse.fireEdge || WEAP[P.weapon].auto)) fire();
      else if (!aiming && mouse.fireEdge && P.healT <= 0) knife();
    }
    mouse.fireEdge = false;
  }
  // ------------------------------------------------------------------ camera
  var camPos = new V3(), lookAt = new V3();
  function updateCamera(dt) {
    if (mode === 'cine') return;
    var aiming = mouse.aim && P.alive && mode === 'play' && P.reloadT <= 0 && P.healT <= 0;
    var scoped = aiming && WEAP[P.weapon].scope;
    var tDist = aiming ? 1.15 : 2.55, tSh = aiming ? 0.52 : 0.45, tFov = scoped ? 16 : aiming ? 48 : 62;
    if (scoped) { tDist = 0.25; tSh = 0.1; }
    $('scope').style.display = scoped && cam.fov < 30 ? 'block' : 'none';
    if (P.inVeh && mode === 'play') { vehicleCamera(dt); return; }
    if (mode === 'title') { var a = Math.sin(T * 0.06) * 0.9; camera.position.set(Math.sin(a) * 3.5, 1.9 + Math.sin(T * 0.2) * 0.25, 4.5 - Math.abs(Math.sin(a)) * 1.5); camera.lookAt(Math.sin(a) * 1.2, 3.2, 16); return; }
    if (!P.alive) tDist = 3.6;
    var k = 1 - Math.exp(-dt * 10);
    cam.dist += (tDist - cam.dist) * k; cam.sh += (tSh - cam.sh) * k; cam.fov += (tFov - cam.fov) * k;
    var f = camForward(), right = new V3(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    var pivot = new V3(P.pos.x, P.pos.y + (aiming ? 1.58 : 1.62), P.pos.z).addScaledVector(right, cam.sh);
    if (!P.alive) pivot.y = P.pos.y + 0.8;
    // keep the shoulder offset inside walls
    var sideD = W.ray(new V3(P.pos.x, pivot.y, P.pos.z), right, cam.sh + 0.2); if (sideD < cam.sh + 0.2) pivot = new V3(P.pos.x, pivot.y, P.pos.z).addScaledVector(right, Math.max(0, sideD - 0.2));
    var back = f.clone().negate(), dd = W.ray(pivot, back, cam.dist + 0.3);
    var dist = Math.max(0.25, Math.min(cam.dist, dd - 0.25));
    camPos.copy(pivot).addScaledVector(back, dist);
    if (cam.shake > 0) { camPos.x += (Math.random() - .5) * cam.shake * 0.12; camPos.y += (Math.random() - .5) * cam.shake * 0.12; cam.shake = Math.max(0, cam.shake - dt * 2.2); }
    camera.position.copy(camPos); lookAt.copy(pivot).addScaledVector(f, 10); camera.lookAt(lookAt);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    rig.J.headMesh.visible = dist > 0.45;
    rig.root.visible = !(scoped && cam.fov < 30);
  }
  // ------------------------------------------------------------------ driving
  function vehicleCamera(dt) {
    var v = P.inVeh, f = new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
    if (!mouse.aim) { var dy = v.yaw - cam.yaw; while (dy > PI) dy -= 2 * PI; while (dy < -PI) dy += 2 * PI; if (Math.abs(v.speed) > 2) cam.yaw += dy * (1 - Math.exp(-dt * 2.5)); cam.pitch += (-0.18 - cam.pitch) * (1 - Math.exp(-dt * 2)); }
    var pivot = new V3(v.pos.x, v.pos.y + 2.2, v.pos.z), dd = W.ray(pivot, f.clone().negate(), 8);
    camera.position.copy(pivot).addScaledVector(f, -Math.min(7.5, dd - 0.3));
    if (cam.shake > 0) { camera.position.x += (Math.random() - .5) * cam.shake * 0.15; camera.position.y += (Math.random() - .5) * cam.shake * 0.15; cam.shake = Math.max(0, cam.shake - dt * 2.2); }
    camera.lookAt(pivot.clone().addScaledVector(f, 10)); if (camera.fov !== 68) { camera.fov = 68; camera.updateProjectionMatrix(); }
  }
  function driveUpdate(dt) {
    var v = P.inVeh;
    if (keys.arrowleft) cam.yaw += dt * 2.2; if (keys.arrowright) cam.yaw -= dt * 2.2;
    P.pos.copy(v.pos); P.yaw = v.yaw; rig.root.visible = false;
    $('veh').style.display = 'block'; $('veh').textContent = 'TRUCK  ' + Math.round(Math.abs(v.speed) * 3.6) + ' KM/H  ·  ' + Math.max(0, Math.round(v.hp / 3)) + '%';
  }
  G.enterVehicle = function (v) { P.inVeh = v; mouse.aim = false; toast('E — get out · W/S drive · A/D steer · Space brake'); AU.thud(v.pos, 0.6); };
  G.exitVehicle = function (forced) {
    var v = P.inVeh; if (!v) return; P.inVeh = null; rig.root.visible = true; $('veh').style.display = 'none'; NF.vehicles.lights(null, false); AU.engine(0, false);
    var side = new V3(Math.cos(v.yaw), 0, -Math.sin(v.yaw)); P.pos.copy(v.pos).addScaledVector(side, 1.8); W.collide(P.pos, 0.3); P.pos.y = W.ground(P.pos.x, P.pos.z);
    if (forced) { P.hp -= 25; if (P.hp <= 0) hurtPlayer(10, null, 'blast'); }
  };
  G.shake = function (a) { cam.shake = Math.min(1.5, cam.shake + a); };
  function updateFlash() {
    var f = mode === 'cine' || mode === 'title' ? new V3(Math.sin(P.yaw), -0.1, Math.cos(P.yaw)) : camForward();
    var base = new V3(P.pos.x, P.pos.y + 1.5, P.pos.z).add(new V3(-Math.cos(P.yaw) * 0.1, 0, Math.sin(P.yaw) * 0.1));
    flash.position.copy(base).addScaledVector(f, 0.25); flash.target.position.copy(base).addScaledVector(f, 8);
    flash.intensity = P.flashOn && mode !== 'title' ? 2.6 * (0.97 + 0.03 * Math.sin(T * 40)) : 0;
  }

  // ------------------------------------------------------------------ interaction
  var curInteract = null;
  function findInteract() {
    var best = null, bd = 99, fwd = new V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    function consider(x, z, r, obj) { var dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz); if (d > r) return; var facing = d < 0.6 ? 1 : (dx * fwd.x + dz * fwd.z) / d; var score = d - facing * 0.6; if (facing > -0.2 && score < bd) { bd = score; best = obj; } }
    W.items.forEach(function (it) { if (!it.taken) consider(it.x, it.z, 1.5, { kind: 'item', it: it }); });
    W.doors.forEach(function (d) { if (!d.open || d.relock) consider(d.x, d.z, 1.9, { kind: 'door', d: d }); });
    W.spots.forEach(function (s) { if (s.on) consider(s.x, s.z, s.r, { kind: 'spot', s: s }); });
    if (!best) { var v = NF.vehicles.nearest(P.pos, 3.4); if (v) best = { kind: 'veh', v: v }; }
    return best;
  }
  function promptText(o) {
    if (o.kind === 'item') { var it = o.it; if (it.type === 'file') return 'Read ' + S.files[it.file].title; return 'Pick up ' + itemName(it); }
    if (o.kind === 'veh') return 'Drive the truck';
    if (o.kind === 'door') return o.d.never || (o.d.lock && !hasKey(o.d)) ? 'Examine door' : 'Open door';
    return o.s.prompt;
  }
  function itemName(it) { return it.name || (AMMO_OF[it.type] ? AMMO_NAME[AMMO_OF[it.type]] : it.type === 'money' ? 'Cash' : it.type === 'treasure' ? 'Treasure' : S.items[it.type] ? S.items[it.type].name : it.type); }
  function usedSlots() { var n = 0; CONSUMABLE.forEach(function (c) { n += P.inv[c] || 0; }); return n; }
  function hasKey(d) { if (!d.lock) return true; if (d.lock.indexOf('flag:') === 0) return !!flags[d.lock.slice(5)]; return P.inv[d.lock] > 0 || flags['used_' + d.lock]; }
  function interact() {
    var o = curInteract; if (!o) return;
    if (o.kind === 'item') take(o.it);
    else if (o.kind === 'door') useDoor(o.d);
    else if (o.kind === 'veh') G.enterVehicle(o.v);
    else o.s.fn();
  }
  function useDoor(d) {
    if (d.never || d.relock) { AU.door(new V3(d.x, 1.4, d.z), true); toast(d.relock || d.msg); return; }
    if (d.lock && !hasKey(d)) { AU.door(new V3(d.x, 1.4, d.z), true); toast(d.msg || 'Locked.'); return; }
    if (d.lock && d.lock.indexOf('flag:') !== 0 && !flags['used_' + d.lock]) { flags['used_' + d.lock] = true; P.inv[d.lock] = 0; toast('Used the ' + S.items[d.lock].name + '.'); }
    var room = W.roomAt(P.pos.x, P.pos.z);
    d.swing = (room && room.id === d.a) ? 1 : -1;
    W.openDoor(d); flags.doors = flags.doors || {}; flags.doors[d.id] = d.swing;
  }
  function take(it) {
    var t = it.type;
    if (t === 'file') { W.takeItem(it); markTaken(it); if (P.files.indexOf(it.file) < 0) P.files.push(it.file); readFile(it.file); return; }
    if (CONSUMABLE.indexOf(t) >= 0 && usedSlots() >= P.slots) { toast('No room for ' + itemName(it) + '. Use, combine or store items.'); AU.click(); return; }
    if (AMMO_OF[t]) P.ammo[AMMO_OF[t]] += it.amount || 1;
    else if (WEAP[t]) { P.owned[t] = true; P.mag[t] = WS(t).cap; equip(t); hint('Press ' + (WORDER.indexOf(t) + 1) + ' to equip the ' + WEAP[t].name, 5); }
    else if (t === 'money') { P.money += it.amount || 100; AU.cash(); }
    else if (t === 'treasure') { P.treasures.push({ name: it.name || 'Antique Pocket Watch', value: it.value || (800 + (Math.abs(Math.round(it.x * 13 + it.z)) % 12) * 250) }); AU.cash(); }
    else if (t === 'grenade') P.grenades += it.amount || 1;
    else P.inv[t] = (P.inv[t] || 0) + 1;
    W.takeItem(it); markTaken(it); AU.pickup();
    toast('Picked up ' + itemName(it) + (it.amount ? ' ×' + it.amount : ''));
    if (t === 'key_raven') { flags.gotRaven = true; spawnStage(); objective('raven'); say([['MARA', 'A raven on the bow. The library door had the same engraving.', 3.2]]); }
    if (t === 'crest') skinnerEvent();
    if (t === 'fuse') { say([['MARA', 'The relay fuse. Crow Ridge is east of town, up on the hill.', 3]]); if (!flags.radio) objective('relay'); }
    if (t === 'shotgun') say([['MARA', 'Finally, something with some stopping power.', 2.6]]);
    if (t === 'magnum') say([['MARA', 'Velgen\'s armory. Six rounds. Make them count.', 2.8]]);
  }
  function markTaken(it) { flags.taken = flags.taken || {}; flags.taken[it.id] = true; }
  function readFile(id) {
    var f = S.files[id]; $('fileP').innerHTML = '<h4>' + f.title + '</h4>' + f.text.replace(/</g, '&lt;'); openUI('file');
    if (id === 'memo') setTimeout(function () { }, 0);
  }

  // ------------------------------------------------------------------ story events
  function checkTriggers() {
    var room = W.roomAt(P.pos.x, P.pos.z), id = room && room.id;
    if (room && G.lastRoom !== id) {
      G.lastRoom = id; flags.visited = flags.visited || {}; flags.visited[id] = true;
      $('roomName').textContent = room.name; $('roomName').style.opacity = 1; clearTimeout(G.rnT); G.rnT = setTimeout(function () { $('roomName').style.opacity = 0; }, 3500);
    }
    if (mode !== 'play') return;
    if (id === 'dining' && !flags.dining) diningScene();
    if (id === 'library' && !flags.library) { flags.library = true; say([['MARA', 'Velgen money. Half these books are pharmacology journals.', 3]]); }
    if (id === 'hall' && !flags.hallDogs && P.pos.z > 24.5) dogEvent();
    if (id === 'hall' && !flags.hallIn) { flags.hallIn = true; objective('hall'); }
    if (id === 'guard' && !flags.guardIn) { flags.guardIn = true; say([['MARA', 'Teo!', 1.2]]); }
    if (flags.teoTalked && !flags.warden && id === 'hall' && P.pos.z > 30) wardenEvent();
    if (id === 'lab' && !flags.labIn && P.pos.z > 47.5) labEntry();
    if (id === 'lab' && flags.labIn && !flags.boss && P.pos.z > 53.5) bossScene();
    if (flags.bossDead && !flags.escaped && P.pos.z > 72.6) outsideScene();
    if (!flags.escaped) return;
    // ---- Act 2: Ashgrove County
    var poi = NF.terrain.nearestPoi(P.pos.x, P.pos.z);
    if (poi && G.lastPoi !== poi.id) { G.lastPoi = poi.id; if (poi.id !== 'manor') areaTitle(poi.name, poi.id === 'town' ? 'Pop. 2,140' : poi.id === 'airfield' ? 'Evac point' : 'Ashgrove County'); flags.disc = flags.disc || {}; flags.disc[poi.id] = true; }
    if (!poi) G.lastPoi = null;
    NF.terrain.pois.forEach(function (p) { if (Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < p.r + 160) { flags.disc = flags.disc || {}; flags.disc[p.id] = true; } });
    if (id === 'room_church' && flags.beacon && !flags.teoFight) teoScene();
    if (flags.defend && !flags.beacon) defendTick();
  }
  function areaTitle(name, sub) { var el = $('areaName'); el.innerHTML = name + '<small>' + (sub || '') + '</small>'; el.style.opacity = 1; clearTimeout(G.atT); G.atT = setTimeout(function () { el.style.opacity = 0; }, 3800); }
  // ------------------------------------------------------------------ act 2
  var heli = null;
  function act2Spots() {
    if (G.act2Ready) return; G.act2Ready = true;
    var af = NF.terrain.poi('airfield');
    W.spot('helipad', af.x - 80, af.z + 120, 6, 'Fire the flare', function () { flareEvent(); }, 0.5);
  }
  function outsideScene() {
    flags.escaped = true; G.escapeT = undefined; $('timer').style.display = 'none'; act2Spots();
    var behind = new V3(0, 3, 64);
    cine([
      { pos: [6, 2.2, 88], look: [0, 3, 70], pos2: [7, 3.2, 92], look2: [0, 5, 66], dur: 4.2, at: function () { [0, 400, 900, 1500].forEach(function (d, i) { setTimeout(function () { NF.creatures.explode(new V3((i - 1.5) * 6, 4 + i, 60 - i * 4), 9, 0, false); }, d); }); AU.music(null); }, lines: [['', '(Behind her, Velgen\'s laboratory tears itself apart.)', 3.6]] },
      { pos: [3, 1.7, 80], look: [0, 1.4, 76], dur: 4.6, lines: [['MARA', 'Raven Unit to County Dispatch. Anybody. Please.', 3], ['', '(Static.)', 1.4]] },
      { pos: [1.5, 1.7, 82], look: [0, 1.5, 76], dur: 7.4, lines: [['HOLLIS (radio)', '—Voss? Voss, this is Hollis at County. Thank God. Where are you?', 3.4], ['MARA', 'Outside the Ashgrove estate. The manor\'s gone. Teo\'s missing.', 3.2]] },
      { pos: [4, 2.4, 84], look: [0, 1.5, 76], dur: 9, lines: [['HOLLIS (radio)', 'Listen. The whole county\'s gone dark. The evac bird can only land at the airfield, and only if the beacon\'s up.', 4.2], ['HOLLIS (radio)', 'Get to the police station in Halverson Falls, north up Route 9. Call me from the station radio. Trucks still run if you find one.', 4.6]] }
    ], function () { objective('town'); hint('A compass at the top points to your objective. M opens the county map. There\'s a truck by the gate. E to drive it.', 9); autosave(); });
  }
  function act2Event(name) {
    if (name === 'policeRadio') {
      if (!flags.escaped) return;
      if (flags.radio) { say([['HOLLIS (radio)', flags.beacon ? 'Bird\'s on the way. Find that flare and get to the airfield.' : 'Fuse into the relay generator, Voss. Crow Ridge.', 3]]); return true; }
      flags.radio = true;
      cine([
        { pos: [P.pos.x - 2, P.pos.y + 1.7, P.pos.z + 1.5], look: [P.pos.x + 2, P.pos.y + 1.1, P.pos.z], dur: 8, lines: [['HOLLIS (radio)', 'You made it. Okay. The airfield beacon runs off the Crow Ridge relay, and the relay generator blew its fuse.', 4.2], ['HOLLIS (radio)', 'There\'s a spare in the armory, back of that station. Take it up the ridge, east of town.', 3.8]] },
        { pos: [P.pos.x + 1.5, P.pos.y + 1.6, P.pos.z - 1.5], look: [P.pos.x, P.pos.y + 1.3, P.pos.z], dur: 4.6, lines: [['MARA', 'And Teo?', 1.4], ['HOLLIS (radio)', 'Last report had a wounded officer heading for St. Agnes. I\'m sorry, Voss. One thing at a time.', 3.2]] }
      ], function () { objective('relay'); autosave(); });
      return true;
    }
    if (name === 'generator') {
      if (flags.beacon) { toast('The beacon is live.'); return true; }
      if (flags.defend) return;
      if (!P.inv.fuse) { toast('The generator\'s fuse socket is empty.'); return true; }
      P.inv.fuse = 0; flags.defend = true; G.defendT = 90; G.waveT = 2; objective('defend');
      $('timer').style.display = 'block'; AU.thud(P.pos, 1); AU.music('chase');
      say([['MARA', 'Fuse is in. Come on, come on—', 2], ['HOLLIS (radio)', 'Generator needs ninety seconds to spin up. And Voss, that noise will carry. They\'re coming to you.', 4]]);
      return true;
    }
    if (name === 'teoPhase2') { say([['TEO', 'Ma... ra... RUN...', 2.4]]); return true; }
    if (name === 'teoDead') {
      flags.teoDead = true; G.bossRef = null; $('bossbar').style.display = 'none';
      var tb = E.byId('teo_boss') || { pos: P.pos.clone().add(new V3(0, 0, 3)) };
      cine([
        { pos: [P.pos.x + 1.5, P.pos.y + 1.2, P.pos.z + 1.2], look: [tb.pos.x, tb.pos.y + 0.3, tb.pos.z], dur: 6, lines: [['MARA', 'Teo...', 1.6], ['MARA', 'You said you were sorry you lied. You told me to go. You knew.', 3.8]] },
        { pos: [tb.pos.x - 2, tb.pos.y + 1.6, tb.pos.z - 2], look: [tb.pos.x, tb.pos.y + 1, tb.pos.z + 3], dur: 5, at: function () { P.inv.flare = 1; AU.pickup(); }, lines: [['', '(The flare gun lies on the altar, where the sexton left it.)', 3], ['MARA', 'I\'m getting out, partner. For both of us.', 2.4]] }
      ], function () { toast('Received the Flare Gun'); objective('airfield'); autosave(); AU.music(null); });
      return true;
    }
    if (name === 'unboundPhase') { AU.sting(); say([['', '(The Warden tears free of its restraints.)', 2.4]]); return true; }
    if (name === 'unboundDead') { flags.unboundDead = true; G.bossRef = null; $('bossbar').style.display = 'none'; setTimeout(evacScene, 2500); return true; }
    if (name === 'butcherDead') { toast('The Butcher is dead'); E.byId('butcher') && dropAt(E.byId('butcher').pos, 'money', 5000); return true; }
    if (name === 'wormDead') { toast('The burrower is dead'); return true; }
    return false;
  }
  function diningScene() {
    flags.dining = true;
    var z = E.byId('z_eat');
    cine([
      { pos: [-13.5, 1.6, 8.5], look: [-20.3, 0.6, 6.4], pos2: [-15, 1.4, 7.6], look2: [-20.3, 0.6, 6.4], dur: 4.2, lines: [['', '(Wet, rhythmic chewing.)', 2], ['MARA', 'Hey... are you alright?', 2]] },
      { pos: [-18.6, 1.0, 7.4], look: [-20.25, 1.1, 6.6], dur: 2.6, at: function () { if (z) { z.alert = true; z.t = 0; } AU.sting(); AU.groan(new V3(-20.2, 1.2, 6.7), 1, 2); }, lines: [['', '(It turns. Half its face is gone.)', 2.4]] },
      { pos: [-13.0, 1.7, 9.4], look: [-20, 1.3, 7], dur: 2.6, lines: [['MARA', 'Stay back. I said stay BACK!', 2.4]] }
    ], function () { hint('Hold right mouse to aim · Left mouse to fire · Headshots save ammo', 6); });
  }
  function skinnerEvent() {
    flags.gotCrest = true; spawnStage(); objective('crest');
    var s = E.byId('skinner'); if (!s) return;
    s.pos.set(25.0, 0, 15.6);
    AU.glass(new V3(24, 5, 15)); FX.glass(new V3(24, 5.5, 15), new V3(0, -1, 0));
    cine([
      { pos: [21.2, 1.3, 11.2], look: [25, 0.4, 15.4], pos2: [21.6, 1.0, 11.8], look2: [24.6, 0.4, 15], dur: 3.6, at: function () { AU.sting(); setTimeout(function () { AU.screech(new V3(25, 0.5, 15.5)); }, 500); }, lines: [['', '(Something drops from the rafters.)', 1.8], ['MARA', '...What the hell are you?', 1.8]] },
      { pos: [23.6, 0.55, 14.2], look: [25.0, 0.55, 15.6], dur: 2.6, lines: [['MARA', '(whispering) No eyes. It can\'t see me. It\'s listening.', 2.6]] }
    ], function () { hint('It hunts by sound. WALK — don\'t run. Gunshots will bring it straight to you.', 7); });
  }
  function dogEvent() {
    flags.hallDogs = true;
    [29, 38].forEach(function (z, i) { setTimeout(function () { AU.glass(new V3(-3, 2, z)); FX.glass(new V3(-2.8, 2, z), new V3(1, 0, 0)); var win = W.windows.filter(function (w) { return w.z === z; })[0]; if (win) win.mesh.material = new THREE.MeshStandardMaterial({ color: '#05070a' }); }, i * 450); });
    setTimeout(function () { spawnStage(); AU.sting(); }, 200);
    say([['MARA', 'Not again—!', 1.5]]);
  }
  function teoTalk() {
    if (flags.teoTalked) { say([['TEO', 'Go, Mara. The lab. Don\'t make me waste this keycard.', 2.6]]); return; }
    flags.teoTalked = true;
    cine([
      { pos: [9.6, 1.0, 33.2], look: [8.6, 0.6, 30.8], dur: 3.8, lines: [['TEO', 'Mara... figured you\'d be too stubborn to die.', 3.4]] },
      { pos: [8.9, 1.55, 32.6], look: [8.6, 0.5, 30.8], dur: 3.2, lines: [['MARA', 'Teo — you\'re bleeding. Let me see it.', 3]] },
      { pos: [7.4, 0.8, 32.2], look: [8.6, 0.7, 30.8], dur: 7.6, lines: [['TEO', 'Don\'t. One of them got me in the corridor. I can feel it working... under the skin.', 4], ['TEO', 'Guards\' log says the lab is behind the steel door at the end of the hall. This card opens it.', 3.6]] },
      { pos: [10, 1.3, 33.6], look: [8.6, 0.8, 30.8], dur: 6.6, at: function () { P.inv.keycard = 1; flags.gotKeycard = true; AU.pickup(); },
        lines: [['TEO', 'Crane — Velgen\'s scientist — he did this. There\'s a helipad past the lab. Go.', 3.6], ['MARA', 'I\'m coming back for you.', 1.8], ['TEO', '...Sure you are.', 1.2]] }
    ], function () { toast('Received the Lab Keycard'); objective('teo'); spawnStage(); });
  }
  function wardenEvent() {
    flags.warden = true;
    var bw = W.breakWall;
    cine([
      { pos: [1.6, 1.7, 39.5], look: [-3, 1.6, 33], dur: 3.4, at: function () { AU.thud(new V3(-4, 1, 33), 1.5); G.shake(0.4); setTimeout(function () { AU.thud(new V3(-4, 1, 33), 1.6); G.shake(0.5); }, 900); setTimeout(function () { AU.thud(new V3(-4, 1, 33), 1.8); G.shake(0.6); }, 1800); }, lines: [['', '(Something is pounding on the other side of the wall.)', 3]] },
      { pos: [1.4, 1.5, 37.8], look: [-3, 2.0, 33], dur: 3.2, at: function () {
          bw.visible = false; bw.userData.box.on = false; FX.debris(new V3(-3, 0.2, 33), 22, 1); AU.thud(new V3(-3, 1, 33), 2.5); G.shake(1.2); AU.sting();
          spawnStage(); var w = E.byId('warden'); if (w) { w.pos.set(-3.6, 0, 33); w.state = 'walk'; }
        }, lines: [['MARA', 'What the—', 1.5]] },
      { pos: [0.5, 2.4, 35.6], look: [-3.2, 2.6, 33], dur: 3.4, lines: [['', '(The Warden.)', 1.4], ['MARA', 'Okay. Okay — move, Mara. MOVE.', 2]] }
    ], function () { hint('You can\'t kill the Warden — only put it down for a while. Keep moving. It won\'t enter safe rooms.', 7); flags.teoGone = true; if (teo) { scene.remove(teo.root); W.spots.forEach(function (s) { if (s.id === 'teo') s.on = false; }); } });
  }
  function labEntry() {
    flags.labIn = true;
    var d = W.doors.filter(function (x) { return x.id === 'd_lab'; })[0];
    if (d && d.open) { d.open = false; d.box.on = true; d.panels.forEach(function (p) { p.piv.position[d.axis === 'x' ? 'x' : 'z'] = d.along + p.side * d.w / 2; p.piv.rotation.y = 0; }); AU.thud(new V3(d.x, 1, d.z), 1.4); }
    if (d) d.relock = 'Sealed. CONTAINMENT LOCKDOWN — the door won\'t budge.';
    var w = E.byId('warden'); if (w) { scene.remove(w.rig.root); E.list.splice(E.list.indexOf(w), 1); }
    objective('lab');
    say([['', '(The security door slams and seals behind you.)', 2.5], ['CRANE (intercom)', 'Officer. You have made quite a mess of my house.', 3.2], ['CRANE (intercom)', 'Come in. Come closer. I want you to see what Lazarus kept of me.', 3.6]]);
    autosave();
  }
  function bossScene() {
    flags.boss = true;
    var b = E.byId('boss'), tk = W.bossTank;
    AU.music(null);
    cine([
      { pos: [3.8, 1.4, 55.6], look: [0, 2.4, 62], pos2: [3.2, 1.6, 56.6], look2: [0, 2.4, 62], dur: 3.6, at: function () { W.lights.forEach(function (l) { if (l.userData.room === 'lab') l.color.set('#ff4040'); }); AU.sting(); }, lines: [['', '(Something moves inside the central tank.)', 2.4], ['CRANE', 'Forty-one days... and they wanted to BURN it.', 2.6]] },
      { pos: [2.6, 1.0, 57.4], look: [0, 2.2, 62], dur: 3.6, at: function () {
          tk.glass.visible = false; tk.liq.visible = false; tk.box.on = false; FX.glass(new V3(0, 2, 61), new V3(0, 0.2, -1)); FX.glass(new V3(0, 2, 63), new V3(0, 0.2, -1)); AU.glass(new V3(0, 2, 62)); AU.roar(new V3(0, 2, 62)); G.shake(1);
          b.rig.root.visible = true; b.state = 'emerge'; b.t = 0; b.yaw = PI;
          for (var i = 0; i < 14; i++) FX.blood(new V3((Math.random() - .5) * 2, 1 + Math.random() * 2, 62 + (Math.random() - .5) * 2), new V3(0, 0.5, -1), 3);
        }, lines: [['CRANE', 'BEHOLD what it kept.', 2.2]] },
      { pos: [-2.5, 0.5, 56.5], look: [0, 3.4, 61.5], dur: 3.0, lines: [['MARA', 'You did this to yourself...', 2.4]] }
    ], function () { b.state = 'walk'; b.alert = true; $('bossbar').style.display = 'block'; AU.music('boss'); objective('boss'); hint('Shoot the glowing eyes and the exposed heart.', 6); });
  }
  G.event = function (name) {
    if (act2Event(name)) return;
    if (name === 'bossPhase2') {
      say([['CRANE', 'MORE... I need MORE!', 2.2]]);
      [[-10.3, 51], [10.3, 56]].forEach(function (p, i) {
        setTimeout(function () {
          AU.glass(new V3(p[0], 1.5, p[1])); FX.glass(new V3(p[0], 1.5, p[1]), new V3(-Math.sign(p[0]), 0, 0));
          var tk = null; W.specimens = W.specimens || [];
          E.spawn('zombie', 'z_spec' + i, p[0] - Math.sign(p[0]) * 1.4, p[1], { variant: 2, alert: true, seed: 90 + i, yaw: -Math.sign(p[0]) * PI / 2 });
        }, 600 + i * 900);
      });
    }
    if (name === 'bossDead') { flags.bossDead = true; $('bossbar').style.display = 'none'; setTimeout(function () { startEscape(); autosave(); }, 2800); }
  };
  function startEscape() {
    if (G.escapeT !== undefined) return;
    G.escapeT = 150; $('timer').style.display = 'block'; objective('escape'); AU.music('chase');
    W.lights.forEach(function (l) { if (l.userData.room === 'lab') l.color.set('#ff3030'); });
    say([['SYSTEM', 'Containment failure. Self-destruct sequence initiated. All personnel evacuate.', 3.6], ['MARA', 'Of course it does.', 1.6]]);
  }
  function defendTick() {
    var rl = NF.terrain.poi('relay'), dist = Math.hypot(P.pos.x - rl.x, P.pos.z - rl.z), dt = 1 / 60;
    if (dist < 45) G.defendT -= G.lastDt || dt; else if (Math.random() < 0.01) toast('Get back to the relay!');
    G.waveT -= G.lastDt || dt;
    $('timer').textContent = 'BEACON ' + Math.max(0, Math.ceil(G.defendT)) + 's';
    if (G.waveT <= 0 && E.list.filter(function (e) { return !e.dead && e.alert; }).length < 22) {
      G.waveT = 6; G.waveN = (G.waveN || 0) + 1;
      for (var i = 0; i < 4 + Math.min(4, G.waveN); i++) {
        var a = Math.random() * PI * 2, rr = 28 + Math.random() * 10, x = rl.x + Math.cos(a) * rr, z = rl.z + Math.sin(a) * rr;
        var ty = G.waveN > 4 && i === 0 ? 'reaper' : i % 4 === 3 ? 'hollow' : 'zombie';
        var e = E.spawn(ty, 'wave' + G.waveN + '_' + i, x, z, { alert: true, revenant: Math.random() < 0.25, variant: (Math.random() * 8) | 0, weapon: 'axe' });
        e.alert = true; e.noDrop = Math.random() < 0.6;
      }
      if (G.waveN % 3 === 0) for (var dg = 0; dg < 3; dg++) { var e2 = E.spawn('dog', 'wavedog' + G.waveN + dg, rl.x + 30, rl.z + dg * 3, { alert: true, seed: dg }); e2.alert = true; }
    }
    if (G.defendT <= 0) {
      flags.beacon = true; flags.defend = false; $('timer').style.display = 'none'; AU.music(null); AU.sting();
      say([['', '(High above, the beacon flares red.)', 2.4], ['HOLLIS (radio)', 'Beacon\'s live! Bird is twenty minutes out. Pilot won\'t set down without a flare, and the last flare gun went to the sexton at St. Agnes Church.', 5], ['HOLLIS (radio)', 'North-west of the ridge. Go.', 2]]);
      objective('church'); autosave();
    }
  }
  function teoScene() {
    flags.teoFight = true;
    var ch = NF.terrain.poi('church'), room = W.roomAt(P.pos.x, P.pos.z), y = room ? room.y : P.pos.y;
    var tb = E.byId('teo_boss') || E.spawn('teo', 'teo_boss', ch.x, ch.z + 9, { yaw: PI });
    tb.state = 'dormant2'; tb.pos.set(ch.x, y, ch.z + 9); tb.yaw = PI;
    cine([
      { pos: [ch.x + 2.5, y + 1.6, ch.z - 2], look: [ch.x, y + 0.8, ch.z + 9], dur: 4, lines: [['', '(Someone kneels at the altar, back turned.)', 2.4], ['MARA', 'Teo?', 1.4]] },
      { pos: [ch.x + 1, y + 1.1, ch.z + 5.5], look: [ch.x, y + 1.3, ch.z + 9], dur: 3.6, at: function () { tb.state = 'roar'; tb.t = 0; AU.sting(); }, lines: [['TEO', 'M... Mara. Told you... to go...', 3]] },
      { pos: [ch.x - 2, y + 2.2, ch.z + 1], look: [ch.x, y + 1.6, ch.z + 8], dur: 3, lines: [['MARA', 'No. No, no, no—', 2]] }
    ], function () { tb.state = 'chase'; tb.alert = true; G.bossRef = tb; $('bossbar').querySelector('.n').textContent = 'TEO RAMIREZ'; $('bossbar').style.display = 'block'; AU.music('boss'); hint('His mutated arm is armoured. Aim for the head and chest.', 5); });
  }
  function flareEvent() {
    if (flags.flared) { toast('The helicopter is coming.'); return; }
    if (!P.inv.flare) { toast(flags.beacon ? 'You need the flare gun from St. Agnes Church.' : 'The beacon isn\'t live yet.'); return; }
    P.inv.flare = 0; flags.flared = true; FX.flare(P.chest()); AU.flare(P.pos);
    var af = NF.terrain.poi('airfield');
    heli = makeHeli(); heli.position.set(af.x - 400, af.h + 60, af.z + 400); scene.add(heli);
    say([['MARA', 'Come on... come on...', 2], ['PILOT (radio)', 'Flare sighted. Inbound, ninety seconds.', 2.6]]);
    setTimeout(function () {
      var e = E.spawn('unbound', 'unbound', af.x - 40 + 16, af.z + 20, { yaw: -PI / 2 });
      cine([
        { pos: [af.x - 72, af.h + 2.2, af.z + 112], look: [af.x - 24, af.h + 3, af.z + 20], dur: 3.4, at: function () { AU.thud(e.pos, 2.5); G.shake(1.2); FX.debris(e.pos.clone().setY(e.pos.y + 1), 20, 1); AU.sting(); }, lines: [['', '(Something tears through the hangar doors.)', 2.6]] },
        { pos: [e.pos.x + 6, e.pos.y + 2.4, e.pos.z + 6], look: [e.pos.x, e.pos.y + 3.2, e.pos.z], dur: 4, at: function () { e.state = 'roar'; e.t = 0; }, lines: [['MARA', 'You. You followed me all this way.', 2.4], ['PILOT (radio)', 'What the hell is THAT? I can\'t set down with that thing on the pad!', 3]] }
      ], function () { G.bossRef = e; $('bossbar').querySelector('.n').textContent = 'THE WARDEN, UNBOUND'; $('bossbar').style.display = 'block'; AU.music('boss'); objective('final'); hint('The exposed heart takes double damage. Explosives hurt it most.', 6); });
    }, 4500);
  }
  function makeHeli() {
    var g = new THREE.Group(), m = Mo.std({ color: '#3a4a3a', metalness: 0.5, roughness: 0.5, map: NF.tex.metal() });
    var b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), m); b.scale.set(1, 0.9, 1.8); g.add(b);
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 6, 8), m); tail.rotation.x = PI / 2; tail.position.z = -4.5; g.add(tail);
    var rot = new THREE.Group(); rot.position.y = 1.6; g.add(rot); for (var i = 0; i < 4; i++) { var bl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 9), Mo.std({ color: '#111' })); bl.rotation.y = i * PI / 2; rot.add(bl); }
    var win = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), NF.terrain.mats.windowLit); win.scale.set(1, 0.6, 1); win.position.set(0, 0.4, 1.6); g.add(win);
    var lamp = new THREE.SpotLight('#ffffff', 2, 80, 0.3, 0.5, 1); lamp.position.set(0, -1, 2); g.add(lamp); g.add(lamp.target); lamp.target.position.set(0, -30, 10);
    g.rotor = rot; return g;
  }
  function updateHeli(dt) {
    if (!heli) return; heli.rotor.rotation.y += dt * 30;
    var af = NF.terrain.poi('airfield'), pad = new V3(af.x - 80, af.h, af.z + 120), tgt;
    if (flags.unboundDead) tgt = pad.clone().setY(af.h + 1.6 + Math.max(0, (G.evacT || 0)));
    else { var a = T * 0.15; tgt = new V3(pad.x + Math.cos(a) * 60, af.h + 45, pad.z + Math.sin(a) * 60); }
    heli.position.lerp(tgt, 1 - Math.exp(-dt * 0.5)); heli.lookAt(heli.position.clone().add(new V3(Math.cos(T * 0.15 + 1.6), 0, Math.sin(T * 0.15 + 1.6))));
    if (Math.random() < dt * 3) AU.heli(heli.position, true);
  }
  function evacScene() {
    var af = NF.terrain.poi('airfield'), pad = new V3(af.x - 80, af.h, af.z + 120);
    if (!heli) { heli = makeHeli(); scene.add(heli); }
    cine([
      { pos: [pad.x + 14, pad.y + 4, pad.z - 10], look: [pad.x, pad.y + 2, pad.z], dur: 6, at: function () { heli.position.set(pad.x + 30, pad.y + 25, pad.z - 30); }, lines: [['PILOT (radio)', 'Setting down! Get aboard, officer!', 2.6], ['MARA', 'Get us out of here.', 2]] },
      { pos: [pad.x - 20, pad.y + 30, pad.z - 30], look: [pad.x, pad.y + 10, pad.z], dur: 6, at: function () { setTimeout(function () { G.evacT = 40; }, 2500); }, lines: [['', '(Dawn breaks over Ashgrove County.)', 3]] }
    ], ending);
  }
  function dropAt(pos, type, amount) { var id = 'drop' + (G.dropN = (G.dropN || 0) + 1); var it = W.item(id, type, pos.x + (Math.random() - .5), W.ground(pos.x, pos.z), pos.z + (Math.random() - .5), { amount: amount }); return it; }
  function ending() {
    flags.escaped = true; flags.done = true; mode = 'end'; G.escapeT = undefined; $('timer').style.display = 'none';
    document.exitPointerLock && document.exitPointerLock();
    fade(1, 1.5); AU.music('ending');
    var t = stats.time, mins = Math.floor(t / 60), secs = Math.floor(t % 60);
    var rank = t < 900 && stats.saves <= 3 ? 'S' : t < 1500 ? 'A' : t < 2400 ? 'B' : 'C';
    setTimeout(function () {
      $('endT').innerHTML = 'The helicopter lifted off as the sun came up over Ashgrove County.<br><br>Officer Mara Voss gave her statement to three different agencies. None of them wrote down the word she kept using: <i>Lazarus</i>.<br><br>Velgen Pharmaceuticals announced a voluntary recall the following week. Its share price recovered within the month.<br><br>Mara kept Teo\'s badge.<br><br><b>THE END?</b>';
      $('endS').innerHTML = '<span>Time</span><span>' + mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's</span><span>Kills</span><span>' + stats.kills + '</span><span>Accuracy</span><span>' + (stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0) + '%</span><span>Saves</span><span>' + stats.saves + '</span>';
      $('endR').textContent = 'RANK ' + rank;
      showScreen('end');
      try { localStorage.removeItem('nf_save'); } catch (e) { }
    }, 1800);
  }
  G.onKill = function (e) {
    stats.kills++; flags.killed = flags.killed || {}; flags.killed[e.id] = true;
    if (G.bossRef === e) { G.bossRef = null; }
    if (e.noDrop || !flags.escaped || e.type === 'boss') return;
    var r = Math.random();
    setTimeout(function () {
      if (r < 0.35) dropAt(e.pos, 'money', 50 * (1 + (Math.random() * (e.type === 'zombie' ? 4 : 12) | 0)));
      else if (r < 0.6) { var owned = WORDER.filter(function (w) { return P.owned[w] && w !== 'rpg' && w !== 'gl'; }); var w = owned[(Math.random() * owned.length) | 0]; var t = { handgun: 'hg_ammo', shotgun: 'sg_ammo', magnum: 'mag_ammo', smg: 'smg_ammo', rifle: 'rifle_ammo' }[w]; dropAt(e.pos, t, NF.terrain.defaultAmount(t)); }
      else if (r < 0.66) dropAt(e.pos, 'powder', 1);
      else if (r < 0.7) dropAt(e.pos, 'herb', 1);
    }, 900);
  };

  // ------------------------------------------------------------------ cinematics & dialogue
  var cineData = null;
  function cine(steps, done) {
    mode = 'cine'; document.body.classList.add('cine'); mouse.aim = mouse.fire = false;
    cineData = { steps: steps, i: -1, t: 0, done: done };
    nextShot();
  }
  function nextShot() {
    var c = cineData; c.i++; c.t = 0;
    if (c.i >= c.steps.length) { endCine(); return; }
    var s = c.steps[c.i]; if (s.at) s.at();
    if (s.lines) say(s.lines, null, true);
  }
  function updateCine(dt) {
    var c = cineData; if (!c) return; var s = c.steps[c.i]; if (!s) return;
    c.t += dt; var k = Math.min(1, c.t / s.dur), e = k * k * (3 - 2 * k);
    var p0 = s.pos, p1 = s.pos2 || s.pos, l0 = s.look, l1 = s.look2 || s.look;
    camera.position.set(p0[0] + (p1[0] - p0[0]) * e, p0[1] + (p1[1] - p0[1]) * e, p0[2] + (p1[2] - p0[2]) * e);
    if (cam.shake > 0) { camera.position.x += (Math.random() - .5) * cam.shake * 0.1; camera.position.y += (Math.random() - .5) * cam.shake * 0.1; cam.shake = Math.max(0, cam.shake - dt * 2); }
    camera.lookAt(l0[0] + (l1[0] - l0[0]) * e, l0[1] + (l1[1] - l0[1]) * e, l0[2] + (l1[2] - l0[2]) * e);
    if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
    if (c.t >= s.dur) nextShot();
  }
  function skipCine() {
    var c = cineData; if (!c) return;
    for (var i = c.i + 1; i < c.steps.length; i++) if (c.steps[i].at) c.steps[i].at();
    c.i = c.steps.length; endCine();
  }
  function endCine() {
    var c = cineData; cineData = null; document.body.classList.remove('cine'); mode = 'play'; sayQ = []; $('sub').innerHTML = '';
    cam.yaw = P.yaw; cam.pitch = -0.08; camera.fov = 62; camera.updateProjectionMatrix();
    if (c && c.done) c.done();
  }
  var sayQ = [], sayT = 0;
  function say(lines, done, replace) { if (replace) sayQ = []; lines.forEach(function (l) { sayQ.push(l); }); if (sayT <= 0) nextLine(); }
  function nextLine() {
    var l = sayQ.shift(); if (!l) { $('sub').innerHTML = ''; sayT = 0; return; }
    $('sub').innerHTML = (l[0] ? '<span class="who">' + l[0] + '</span>' : '') + (l[0] ? '' : '<i>') + l[1] + (l[0] ? '' : '</i>'); sayT = l[2] || 2.5;
  }
  function updateSay(dt) { if (sayT > 0) { sayT -= dt; if (sayT <= 0) nextLine(); } }
  G.say = say;
  function toast(msg) { var el = $('toast'); el.textContent = msg; el.style.opacity = 1; clearTimeout(G.toastT); G.toastT = setTimeout(function () { el.style.opacity = 0; }, 2400); }
  function hint(msg, dur) { var el = $('hint'); el.textContent = msg; el.style.opacity = 1; clearTimeout(G.hintT); G.hintT = setTimeout(function () { el.style.opacity = 0; }, (dur || 4) * 1000); }
  function objective(key) { flags.obj = key; $('objT').textContent = S.objectives[key]; var o = $('obj'); o.style.opacity = 1; clearTimeout(G.objT); G.objT = setTimeout(function () { o.style.opacity = 0.35; }, 6000); }
  function fade(to, dur) { var f = $('fade'); f.style.transition = 'opacity ' + (dur || 0.8) + 's'; f.style.opacity = to; }

  // ------------------------------------------------------------------ UI screens
  function openUI(which) {
    mode = 'ui'; G.ui = which; mouse.aim = mouse.fire = false; keys = {};
    if (document.exitPointerLock && which !== 'file') document.exitPointerLock();
    if (which === 'inv') buildInv();
    if (which === 'map') drawMap();
    showScreen(which);
  }
  function closeUI() { hideScreens(); mode = 'play'; G.ui = null; }
  var invSel = null;
  function buildInv() {
    var g = $('invGrid'); g.innerHTML = '';
    var list = [];
    WORDER.forEach(function (w) { if (P.owned[w]) list.push({ k: w, ct: P.mag[w] + '/' + P.ammo[w], eq: P.weapon === w }); });
    list.push({ k: 'knife' });
    if (P.grenades > 0) list.push({ k: 'grenade', ct: P.grenades });
    CONSUMABLE.concat(['key_raven', 'crest', 'keycard', 'fuse', 'flare']).forEach(function (k) { if (P.inv[k] > 0) list.push({ k: k, ct: P.inv[k] }); });
    list.forEach(function (it) {
      var d = document.createElement('div'); d.className = 'slot' + (it.eq ? ' eq' : '') + (invSel === it.k ? ' sel' : '');
      d.innerHTML = '<div class="ic">' + S.items[it.k].icon + '</div><div>' + S.items[it.k].name + '</div>' + (it.ct !== undefined && it.ct !== '' ? '<div class="ct">' + it.ct + '</div>' : '');
      d.onclick = function () { invSel = it.k; buildInv(); };
      g.appendChild(d);
    });
    for (var i = list.length; i < 12; i++) { var e = document.createElement('div'); e.className = 'slot'; e.style.opacity = 0.35; g.appendChild(e); }
    var info = $('invInfo'), acts = $('invActs'); acts.innerHTML = '';
    var summary = '<span style="color:var(--dim)">Health ' + Math.round(P.hp) + '% · Pack ' + usedSlots() + '/' + P.slots + ' · <span style="color:var(--gold)">$' + P.money.toLocaleString() + '</span>' + (P.poison > 0 ? ' · <span style="color:#b080ff">Poisoned</span>' : '') + (P.vest ? ' · Kevlar vest' : '') + '</span>';
    if (P.treasures.length) summary += '<br><span style="color:var(--dim)">Treasures: ' + P.treasures.map(function (t) { return t.name + ' ($' + t.value.toLocaleString() + ')'; }).join(', ') + '</span>';
    function btn(lbl, fn, off) { var bb = document.createElement('button'); bb.textContent = lbl; if (off) { bb.disabled = true; bb.style.opacity = 0.4; } bb.onclick = function () { fn(); buildInv(); }; acts.appendChild(bb); }
    function craft(lbl, need, fn, ok) { btn(lbl + ' (' + need + ' powder)', function () { if (P.inv.powder >= need) { P.inv.powder -= need; fn(); AU.reload('x'); toast('Crafted'); } }, P.inv.powder < need || ok === false); }
    if (invSel && S.items[invSel]) {
      info.innerHTML = '<b style="font-family:Cinzel,serif;letter-spacing:.15em">' + S.items[invSel].name + '</b><br>' + S.items[invSel].desc + '<br>' + summary;
      if (WEAP[invSel] && P.weapon !== invSel) btn('Equip', function () { equip(invSel); });
      if (['herb', 'mixed', 'mixed_gr', 'spray', 'blue_herb'].indexOf(invSel) >= 0) btn('Use', function () { useHeal(invSel); }, P.hp >= 100 && !(invSel === 'blue_herb' && P.poison > 0));
      if (invSel === 'herb' || invSel === 'red_herb') { btn('Combine G+G', function () { P.inv.herb -= 2; P.inv.mixed++; AU.pickup(); invSel = 'mixed'; }, P.inv.herb < 2); btn('Combine G+R', function () { P.inv.herb--; P.inv.red_herb--; P.inv.mixed_gr++; AU.pickup(); invSel = 'mixed_gr'; }, !(P.inv.herb > 0 && P.inv.red_herb > 0)); }
      if (invSel === 'powder') {
        craft('Handgun ammo ×12', 1, function () { P.ammo.handgun += 12; });
        craft('Shells ×5', 2, function () { P.ammo.shotgun += 5; }, P.owned.shotgun);
        craft('SMG ammo ×30', 1, function () { P.ammo.smg += 30; }, P.owned.smg);
        craft('Rifle rounds ×4', 2, function () { P.ammo.rifle += 4; }, P.owned.rifle);
        craft('Magnum ×2', 3, function () { P.ammo.magnum += 2; }, P.owned.magnum);
        craft('Hand grenade', 3, function () { P.grenades++; });
      }
      if (CONSUMABLE.indexOf(invSel) >= 0) btn('Discard one', function () { P.inv[invSel]--; });
    } else info.innerHTML = summary + '<br><span style="color:var(--dim)">Select an item.</span>';
    var fl = $('invFiles'); fl.innerHTML = P.files.length ? '' : '<div style="color:var(--dim)">No files found yet.</div>';
    P.files.forEach(function (id) { var bb = document.createElement('button'); bb.className = 'small'; bb.style.display = 'block'; bb.style.margin = '0 0 8px'; bb.textContent = S.files[id].title; bb.onclick = function () { readFile(id); }; fl.appendChild(bb); });
  }
  // ------------------------------------------------------------------ the peddler
  var shopTab = 'buy';
  var TALK = ['"Bullets, blades, bandages. Cash only, officer."', '"Velgen paid me to keep quiet. You pay me to keep you breathing."', '"That rifle? Took it off a man who didn\'t need it anymore."', '"Come back alive. Dead customers don\'t tip."', '"I hear the Warden walks the roads at night. Bad for business."'];
  G.openShop = function () {
    openUI('shop'); $('shopTalk').textContent = TALK[(Math.random() * TALK.length) | 0];
    document.querySelectorAll('[data-stab]').forEach(function (b) { b.onclick = function () { shopTab = b.dataset.stab; document.querySelectorAll('[data-stab]').forEach(function (x) { x.classList.toggle('on', x === b); }); buildShop(); }; });
    buildShop();
  };
  function buildShop() {
    var body = $('shopBody'); body.innerHTML = ''; $('shopMoney').textContent = '$' + P.money.toLocaleString();
    var grid = document.createElement('div'); grid.className = 'shopGrid'; body.appendChild(grid);
    function card(name, desc, price, fn, off, label) {
      var c = document.createElement('div'); c.className = 'shopItem' + (off || (price > 0 && P.money < price) ? ' off' : '');
      c.innerHTML = '<b>' + name + '</b><span style="color:var(--dim)">' + desc + '</span><span class="pr">' + (label || (price > 0 ? '$' + price.toLocaleString() : '+$' + (-price).toLocaleString())) + '</span>';
      c.onclick = function () { if (price > 0 && P.money < price) return; P.money -= price; fn(); AU.cash(); buildShop(); }; grid.appendChild(c);
    }
    if (shopTab === 'buy') {
      var WP = { shotgun: 3500, magnum: 12000, smg: 7000, rifle: 9000, gl: 16000, rpg: 28000 };
      Object.keys(WP).forEach(function (w) { if (!P.owned[w]) card(WEAP[w].name, S.items[w].desc, WP[w], function () { P.owned[w] = true; P.mag[w] = WS(w).cap; if (w === 'rpg') P.ammo.rpg += 1; toast('Bought the ' + WEAP[w].name); }); });
      var AM = [['handgun', 15, 400], ['shotgun', 6, 600], ['smg', 40, 700], ['rifle', 6, 900], ['magnum', 4, 1500], ['gl', 3, 1800], ['rpg', 1, 7000]];
      AM.forEach(function (a) { if (P.owned[a[0]]) card(AMMO_NAME[a[0]] + ' ×' + a[1], 'For the ' + WEAP[a[0]].name + '. You carry ' + P.ammo[a[0]] + '.', a[2], function () { P.ammo[a[0]] += a[1]; }); });
      [['herb', 500], ['red_herb', 1000], ['blue_herb', 700], ['spray', 2500], ['powder', 300]].forEach(function (h) { card(S.items[h[0]].name, S.items[h[0]].desc, h[1], function () { P.inv[h[0]]++; }, usedSlots() >= P.slots, usedSlots() >= P.slots ? 'Pack full' : null); });
      card('Hand Grenade', 'Press G to throw. You carry ' + P.grenades + '.', 1200, function () { P.grenades++; });
      if (P.slots < 16) card('Larger Pouch', 'Carry 2 more items (' + P.slots + ' → ' + (P.slots + 2) + ').', 4000 + (P.slots - 8) * 2500, function () { P.slots += 2; });
      if (!P.vest) card('Kevlar Vest', 'Take a quarter less damage from everything.', 15000, function () { P.vest = true; });
    } else if (shopTab === 'sell') {
      if (!P.treasures.length && !CONSUMABLE.some(function (c) { return P.inv[c] > 0; })) body.insertAdjacentHTML('beforeend', '<div style="color:var(--dim)">Nothing to sell. Treasures from around the county fetch a good price.</div>');
      P.treasures.slice().forEach(function (t, i) { card(t.name, 'Treasure', -t.value, function () { P.treasures.splice(P.treasures.indexOf(t), 1); }); });
      var SV = { herb: 150, red_herb: 300, blue_herb: 200, mixed: 400, mixed_gr: 600, spray: 800, powder: 100 };
      CONSUMABLE.forEach(function (c) { if (P.inv[c] > 0) card(S.items[c].name + ' (' + P.inv[c] + ')', 'Sell one', -SV[c], function () { P.inv[c]--; }); });
    } else {
      var BASE = { handgun: 1500, shotgun: 2500, magnum: 4000, smg: 3000, rifle: 3500 };
      Object.keys(BASE).forEach(function (w) {
        if (!P.owned[w]) return; var u = P.upg[w] || (P.upg[w] = {});
        [['pow', 'Firepower', '+25% damage'], ['cap', 'Capacity', '+30% magazine'], ['rel', 'Reload speed', '15% faster'], ['rate', 'Fire rate', '12% faster']].forEach(function (st) {
          var lv = u[st[0]] || 0;
          card(WEAP[w].name + ' — ' + st[1], st[2] + ' · level ' + lv + '/3', lv >= 3 ? 0 : BASE[w] * (lv + 1), function () { u[st[0]] = lv + 1; toast(WEAP[w].name + ' ' + st[1] + ' ' + (lv + 1)); }, lv >= 3, lv >= 3 ? 'MAX' : null);
        });
      });
    }
  }
  // ------------------------------------------------------------------ item box
  G.openStash = function () { openUI('stash'); buildStash(); };
  function buildStash() {
    var inv = $('stashInv'), box = $('stashBox'); inv.innerHTML = ''; box.innerHTML = '';
    $('stashCarry').textContent = 'CARRYING  ' + usedSlots() + '/' + P.slots;
    var types = CONSUMABLE;
    types.forEach(function (c) {
      if (P.inv[c] > 0) { var b1 = document.createElement('button'); b1.className = 'small'; b1.style.cssText = 'display:block;width:100%;text-align:left;margin:0 0 6px'; b1.textContent = S.items[c].icon + ' ' + S.items[c].name + ' ×' + P.inv[c] + '  →'; b1.onclick = function () { P.inv[c]--; P.stash[c] = (P.stash[c] || 0) + 1; buildStash(); }; inv.appendChild(b1); }
      if (P.stash[c] > 0) { var b2 = document.createElement('button'); b2.className = 'small'; b2.style.cssText = 'display:block;width:100%;text-align:left;margin:0 0 6px'; b2.textContent = '←  ' + S.items[c].icon + ' ' + S.items[c].name + ' ×' + P.stash[c]; b2.onclick = function () { if (usedSlots() >= P.slots) { toast('Your pack is full'); return; } P.stash[c]--; P.inv[c]++; buildStash(); }; box.appendChild(b2); }
    });
    if (!inv.innerHTML) inv.innerHTML = '<div style="color:var(--dim)">Nothing to store.</div>';
    if (!box.innerHTML) box.innerHTML = '<div style="color:var(--dim)">Empty.</div>';
  }
  // ------------------------------------------------------------------ county map
  var worldMapImg = null;
  function drawWorldMap() {
    var c = $('mapC'), g = c.getContext('2d'), w = c.width, h = c.height, L = 3072, s = Math.min(w, h - 60) / (2 * L);
    var cx = w / 2, cy = (h - 60) / 2 + 10;
    function X(x) { return cx - x * s; } function Y(z) { return cy - z * s; }
    if (!worldMapImg) {
      var N = 96, img = g.createImageData(w, h - 60), Tn = NF.terrain, lake = Tn.poi('lake');
      var grid = []; for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) { var wx = -L + i / N * 2 * L, wz = -L + j / N * 2 * L; grid.push(Tn.hExact(wx, wz)); }
      for (var py = 0; py < h - 60; py++) for (var px = 0; px < w; px++) {
        var wx2 = (cx - px) / s, wz2 = (cy - py) / s; var gi = Math.min(N, Math.max(0, Math.round((wx2 + L) / (2 * L) * N))), gj = Math.min(N, Math.max(0, Math.round((wz2 + L) / (2 * L) * N)));
        var hh = grid[gj * (N + 1) + gi], o = (py * w + px) * 4, v = Math.max(0, Math.min(1, (hh + 20) / 160));
        var water = Math.hypot(wx2 - lake.x, wz2 - lake.z) < lake.r - 10;
        img.data[o] = water ? 20 : 26 + v * 70; img.data[o + 1] = water ? 40 : 34 + v * 60; img.data[o + 2] = water ? 60 : 24 + v * 40; img.data[o + 3] = 255;
        if (Math.abs(hh % 15) < 0.8) { img.data[o] += 14; img.data[o + 1] += 14; img.data[o + 2] += 10; }
      }
      worldMapImg = img;
    }
    g.fillStyle = '#06080a'; g.fillRect(0, 0, w, h); g.putImageData(worldMapImg, 0, 0);
    g.strokeStyle = 'rgba(210,190,150,0.75)'; g.lineWidth = 2;
    NF.terrain.roads.forEach(function (r) { g.beginPath(); g.moveTo(X(r.ax), Y(r.az)); g.lineTo(X(r.bx), Y(r.bz)); g.stroke(); });
    var disc = flags.disc || {};
    g.textAlign = 'center'; g.font = '11px Cinzel, serif';
    NF.terrain.pois.forEach(function (p) {
      if (p.id === 'lake') return; var known = disc[p.id] || ['town', 'manor'].indexOf(p.id) >= 0 || (flags.radio && p.id === 'relay') || (flags.beacon && p.id === 'church') || (flags.teoDead && p.id === 'airfield');
      g.fillStyle = known ? '#e8dcc8' : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(X(p.x), Y(p.z), known ? 4 : 2.5, 0, 7); g.fill();
      if (known) { g.fillStyle = '#e8dcc8'; g.fillText(p.name, X(p.x), Y(p.z) - 8); }
    });
    NF.vehicles.list.forEach(function (v) { if (v.hp > 0) { g.fillStyle = '#5aa0ff'; g.fillRect(X(v.pos.x) - 3, Y(v.pos.z) - 3, 6, 6); } });
    var ob = objTarget(); if (ob) { g.fillStyle = '#c9a24a'; g.font = '18px serif'; g.fillText('★', X(ob.x), Y(ob.z) + 6); }
    g.save(); g.translate(X(P.pos.x), Y(P.pos.z)); g.rotate(-P.yaw); g.fillStyle = '#ff4040'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#9a8e7a'; g.font = '12px Cinzel, serif'; g.textAlign = 'left';
    g.fillText('ASHGROVE COUNTY · 6 km × 6 km · ★ objective · ■ truck', 12, h - 30);
    g.fillText('N ↑', w - 40, 20);
  }
  function objTarget() {
    var T2 = NF.terrain, o = flags.obj;
    if (!flags.escaped || !T2) return null;
    if (o === 'town' || (o === 'relay' && !P.inv.fuse && !flags.radio)) return { x: 436, z: 862 };
    if (o === 'relay') return P.inv.fuse ? { x: T2.poi('relay').x + 8, z: T2.poi('relay').z - 3 } : { x: 452, z: 868 };
    if (o === 'defend') return T2.poi('relay');
    if (o === 'church') return T2.poi('church');
    if (o === 'airfield' || o === 'final') { var af = T2.poi('airfield'); return { x: af.x - 80, z: af.z + 120 }; }
    return null;
  }
  function drawMap() {
    var room = W.roomAt(P.pos.x, P.pos.z);
    if (flags.escaped && !(room && W.rooms.indexOf(room) >= 0)) { $('map').querySelector('h3').textContent = 'Ashgrove County'; drawWorldMap(); return; }
    $('map').querySelector('h3').textContent = 'Ashgrove Manor';
    var c = $('mapC'), g = c.getContext('2d'), w = c.width, h = c.height;
    var minX = -30, maxX = 30, minZ = -2, maxZ = 74, s = Math.min(w / (maxX - minX), h / (maxZ - minZ)) * 0.92;
    var ox = w / 2, oz = h - 20;
    function X(x) { return ox - x * s; } function Z(z) { return oz - (z - minZ) * s; }
    g.fillStyle = '#06080a'; g.fillRect(0, 0, w, h);
    var vis = flags.visited || {}, here = W.roomAt(P.pos.x, P.pos.z);
    W.rooms.forEach(function (r) {
      var seen = vis[r.id];
      g.fillStyle = r === here ? 'rgba(201,162,74,.35)' : seen ? (r.safe ? 'rgba(60,140,90,.3)' : 'rgba(60,90,140,.28)') : 'rgba(255,255,255,.05)';
      g.strokeStyle = seen ? 'rgba(220,210,190,.7)' : 'rgba(255,255,255,.15)'; g.lineWidth = 2;
      var x0 = X(r.x1), x1 = X(r.x0), z0 = Z(r.z1), z1 = Z(r.z0);
      g.fillRect(x0, z0, x1 - x0, z1 - z0); g.strokeRect(x0, z0, x1 - x0, z1 - z0);
      g.fillStyle = seen ? '#d8ccb4' : 'rgba(255,255,255,.3)'; g.font = '12px Cinzel, serif'; g.textAlign = 'center';
      g.fillText(seen ? r.name.toUpperCase() : '?', (x0 + x1) / 2, (z0 + z1) / 2 + 4);
    });
    W.doors.forEach(function (d) {
      g.fillStyle = d.open && !d.relock ? '#3cff7a' : d.lock && !hasKey(d) || d.never || d.relock ? '#ff3a3a' : '#5aa0ff';
      var px = X(d.x), pz = Z(d.z); g.fillRect(px - 4, pz - 4, 8, 8);
    });
    W.items.forEach(function (it) { if (it.taken) return; var r = W.roomAt(it.x, it.z); if (r && vis[r.id]) { g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(X(it.x), Z(it.z), 3, 0, 7); g.fill(); } });
    W.spots.forEach(function (sp) { if (sp.id.indexOf('tw_') === 0) { g.fillStyle = '#3cff7a'; g.font = '14px sans-serif'; g.fillText('⌨', X(sp.x), Z(sp.z) + 5); } });
    var px = X(P.pos.x), pz = Z(P.pos.z);
    g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = '#ff4040'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
  }

  // ------------------------------------------------------------------ saving
  function snapshot() {
    var killed = {}; E.list.forEach(function (e) { if (e.dead) killed[e.id] = true; });
    return { v: 2, pos: [P.pos.x, P.pos.z], yaw: P.yaw, hp: P.hp, weapon: P.weapon, owned: P.owned, mag: P.mag, ammo: P.ammo, inv: P.inv, files: P.files, flags: JSON.parse(JSON.stringify(flags)), killed: killed, stats: stats, flash: P.flashOn,
      money: P.money, treasures: P.treasures, upg: P.upg, slots: P.slots, stash: P.stash, grenades: P.grenades, vest: P.vest, veh: NF.vehicles.state() };
  }
  function writeSave(d) { try { localStorage.setItem('nf_save', JSON.stringify(d)); return true; } catch (e) { return false; } }
  function loadData() { try { var s = localStorage.getItem('nf_save'); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  G.save = function () {
    if (mode !== 'play') return;
    AU.typewriter(); stats.saves++;
    var ok = writeSave(snapshot());
    toast(ok ? 'Your progress has been recorded.' : 'Saving is unavailable in this browser.');
    P.hp = Math.max(P.hp, P.hp);
  };
  function autosave() { writeSave(snapshot()); }
  function applySave(d) {
    flags = d.flags || {}; P.pos.set(d.pos[0], 0, d.pos[1]); P.yaw = d.yaw; cam.yaw = d.yaw; P.hp = d.hp; P.weapon = d.weapon; P.owned = d.owned; P.mag = d.mag; P.ammo = d.ammo; P.inv = d.inv; P.files = d.files || []; stats = d.stats || stats; P.flashOn = d.flash !== false;
    P.money = d.money || 0; P.treasures = d.treasures || []; P.upg = d.upg || {}; P.slots = d.slots || 8; P.stash = d.stash || {}; P.grenades = d.grenades || 0; P.vest = !!d.vest; P.poison = 0;
    ['smg', 'rifle', 'gl', 'rpg'].forEach(function (w) { if (P.owned[w] === undefined) { P.owned[w] = false; P.mag[w] = 0; P.ammo[w] = 0; } });
    ['red_herb', 'blue_herb', 'mixed_gr', 'powder', 'fuse', 'flare'].forEach(function (k) { if (P.inv[k] === undefined) P.inv[k] = 0; });
    NF.vehicles.restore(d.veh);
    if (flags.escaped) {
      act2Spots();
      if (flags.defend && !flags.beacon) { flags.defend = false; P.inv.fuse = 1; }
      if (flags.teoFight && !flags.teoDead) flags.teoFight = false;
      if (flags.flared && !flags.unboundDead) { flags.flared = false; P.inv.flare = 1; }
      NF.terrain.update(P.pos.x, P.pos.z, flags, true);
      P.pos.y = W.ground(P.pos.x, P.pos.z);
    }
    var taken = flags.taken || {};
    W.items.forEach(function (it) { if (taken[it.id]) W.takeItem(it); });
    var doors = flags.doors || {};
    W.doors.forEach(function (dd) { if (doors[dd.id] !== undefined) { dd.swing = doors[dd.id]; dd.open = true; dd.box.on = false; dd.t = 0.99; } });
    spawnStage();
    if (flags.warden) { W.breakWall.visible = false; W.breakWall.userData.box.on = false; if (teo) { scene.remove(teo.root); W.spots.forEach(function (s) { if (s.id === 'teo') s.on = false; }); } }
    if (flags.labIn) { flags.labIn = false; labEntryQuiet(); }
    if (flags.boss && !flags.bossDead) flags.boss = false;
    var b = E.byId('boss');
    if (flags.bossDead && b) { scene.remove(b.rig.root); b.dead = true; b.state = 'dead'; W.bossTank.glass.visible = false; W.bossTank.liq.visible = false; W.bossTank.box.on = false; }
    var killed = d.killed || {};
    E.list.slice().forEach(function (e) { if (killed[e.id]) { scene.remove(e.rig.root); E.list.splice(E.list.indexOf(e), 1); } });
    if (flags.obj) objective(flags.obj);
  }
  function labEntryQuiet() {
    flags.labIn = true;
    var d = W.doors.filter(function (x) { return x.id === 'd_lab'; })[0];
    if (d) { d.open = false; d.box.on = true; d.t = 0; d.relock = 'Sealed. CONTAINMENT LOCKDOWN — the door won\'t budge.'; }
    var w = E.byId('warden'); if (w) { scene.remove(w.rig.root); E.list.splice(E.list.indexOf(w), 1); }
  }

  // ------------------------------------------------------------------ HUD
  var ecgC, ecgG, ecgX = 0, ecgPts = [], grainC, grainG, grainImg, lastBeat = 0;
  function hud(dt) {
    var st = P.hp >= 60 ? ['FINE', '--fine'] : P.hp >= 25 ? ['CAUTION', '--caution'] : ['DANGER', '--danger'];
    var col = getComputedStyle(document.documentElement).getPropertyValue(st[1]).trim();
    var hs = $('hpSt'); if (hs.textContent !== st[0]) { hs.textContent = st[0]; hs.style.color = col; }
    if (!ecgC) { ecgC = $('ecg'); ecgG = ecgC.getContext('2d'); }
    var rate = P.hp >= 60 ? 1.1 : P.hp >= 25 ? 1.6 : 2.3; ecgX += dt * 140;
    var w = ecgC.width, h = ecgC.height, phase = (T * rate) % 1;
    var y = h / 2;
    if (phase < 0.08) y -= Math.sin(phase / 0.08 * PI) * 6; else if (phase > 0.12 && phase < 0.15) y += 10; else if (phase >= 0.15 && phase < 0.19) y -= (P.alive ? 34 : 0) * Math.sin((phase - 0.15) / 0.04 * PI); else if (phase > 0.3 && phase < 0.42) y -= Math.sin((phase - 0.3) / 0.12 * PI) * 9;
    if (!P.alive) y = h / 2;
    ecgPts.push([ecgX % w, y]);
    if (ecgPts.length > 260) ecgPts.shift();
    ecgG.clearRect(0, 0, w, h); ecgG.lineWidth = 3; ecgG.strokeStyle = col; ecgG.shadowColor = col; ecgG.shadowBlur = 8;
    ecgG.beginPath(); for (var i = 1; i < ecgPts.length; i++) { var a = ecgPts[i - 1], b = ecgPts[i]; if (b[0] < a[0]) continue; ecgG.moveTo(a[0], a[1]); ecgG.lineTo(b[0], b[1]); } ecgG.stroke();
    if (P.hp < 25 && P.alive && T - lastBeat > 0.85) { lastBeat = T; AU.heartbeat(); }
    $('lowhp').style.opacity = P.hp < 25 && P.alive ? (0.5 + 0.4 * Math.sin(T * 5)) : 0;
    var wd = WEAP[P.weapon]; $('wName').textContent = wd.name + (P.reloadT > 0 ? ' — reloading' : '');
    $('wAmmo').innerHTML = P.mag[P.weapon] + ' <small>/ ' + P.ammo[P.weapon] + '</small>';
    $('wAmmo').style.color = P.mag[P.weapon] === 0 ? 'var(--red2)' : '';
    var aiming = mouse.aim && mode === 'play' && P.alive && P.reloadT <= 0;
    var cr = $('cross'); cr.style.opacity = aiming ? 1 : 0;
    if (aiming) { var sp = wd.spread[0] + (wd.spread[1] - wd.spread[0]) * P.focus; var px = Math.max(3, sp / Math.tan(camera.fov * PI / 360) * innerHeight / 2); $('chL').style.left = (-px - 10) + 'px'; $('chR').style.left = px + 'px'; $('chU').style.top = (-px - 10) + 'px'; $('chD').style.top = px + 'px'; cr.querySelector('.c').style.background = P.focus > 0.95 ? '#ff2a2a' : '#fff'; }
    var b = G.bossRef || (flags.boss && !flags.bossDead ? E.byId('boss') : null); if (b && !b.dead) $('bossF').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
    if (P.grenades > 0) $('wName').textContent += '  ·  ' + P.grenades + ' GRENADE' + (P.grenades > 1 ? 'S' : '');
    $('money').textContent = flags.escaped || P.money ? '$' + P.money.toLocaleString() : '';
    $('status').textContent = P.poison > 0 ? 'POISONED' : '';
    if (P.poison > 0) { hs.textContent = 'POISON'; hs.style.color = '#b080ff'; }
    compass();
    if (G.escapeT !== undefined) { var s = Math.max(0, G.escapeT); $('timer').textContent = Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2) + '.' + ('0' + Math.floor(s * 100 % 100)).slice(-2); }
    // prompt
    var pr = $('prompt');
    if (mode === 'play' && P.alive && curInteract) { $('promptT').textContent = promptText(curInteract); pr.style.opacity = 1; } else pr.style.opacity = 0;
  }
  function compass() {
    var el = $('compass'), dEl = $('compassD');
    var outside = flags.escaped && !(W.roomAt(P.pos.x, P.pos.z) && W.rooms.indexOf(W.roomAt(P.pos.x, P.pos.z)) >= 0);
    if (!outside || mode !== 'play') { el.style.display = 'none'; dEl.style.display = 'none'; return; }
    el.style.display = 'block';
    var f = new V3(); camera.getWorldDirection(f); var head = Math.atan2(-f.x, f.z);
    var html = '', names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (var i = 0; i < 24; i++) { var a = i / 24 * PI * 2, dlt = a - head; while (dlt > PI) dlt -= 2 * PI; while (dlt < -PI) dlt += 2 * PI; if (Math.abs(dlt) > PI / 2) continue; var x = 50 + dlt / (PI / 2) * 50; html += '<span class="tick' + (i % 3 === 0 ? ' big' : '') + '" style="left:' + x + '%">' + (i % 3 === 0 ? names[i / 3] : '·') + '</span>'; }
    var ob = objTarget();
    if (ob) { var bear = Math.atan2(-(ob.x - P.pos.x), ob.z - P.pos.z), d2 = bear - head; while (d2 > PI) d2 -= 2 * PI; while (d2 < -PI) d2 += 2 * PI; var x2 = 50 + Math.max(-1, Math.min(1, d2 / (PI / 2))) * 50; html += '<span class="obj" style="left:' + x2 + '%">◆</span>'; dEl.style.display = 'block'; dEl.textContent = Math.round(Math.hypot(ob.x - P.pos.x, ob.z - P.pos.z)) + ' m'; }
    else dEl.style.display = 'none';
    el.innerHTML = html;
  }
  // ------------------------------------------------------------------ sky, weather, lights
  var env = { out: 0 }, moon, stars, moonSprite, rain, rainPos, pool = [], lightningT = 30, flashT2 = 0;
  function initEnv() {
    moon = new THREE.DirectionalLight('#8a9ac8', 0); moon.position.set(-300, 400, 200); scene.add(moon); scene.add(moon.target);
    var n = 1500, sg = new THREE.BufferGeometry(), sp = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var u = Math.random() * 2 - 1, th = Math.random() * PI * 2, r = Math.sqrt(1 - u * u); sp[i * 3] = r * Math.cos(th) * 380; sp[i * 3 + 1] = Math.abs(u) * 380; sp[i * 3 + 2] = r * Math.sin(th) * 380; }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 })); scene.add(stars);
    moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: NF.tex.spark(), color: '#dfe6ff', fog: false, transparent: true, opacity: 0 })); moonSprite.scale.setScalar(40); scene.add(moonSprite);
    var rn = 1800, rg = new THREE.BufferGeometry(); rainPos = new Float32Array(rn * 6);
    for (var j = 0; j < rn; j++) { var x = (Math.random() - .5) * 40, y = Math.random() * 20, z = (Math.random() - .5) * 40; rainPos.set([x, y, z, x + 0.03, y - 0.45, z], j * 6); }
    rg.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#8a9ab0', transparent: true, opacity: 0.35 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
    for (var k = 0; k < 6; k++) { var l = new THREE.PointLight('#ffc070', 0, 24, 2); scene.add(l); pool.push(l); }
  }
  var fogIn = new THREE.Color('#030304'), fogOut = new THREE.Color('#141c28');
  function updateEnv(dt) {
    var room = W.roomAt(P.pos.x, P.pos.z), inManor = room && W.rooms.indexOf(room) >= 0;
    var target = mode === 'title' || inManor ? 0 : room ? 0.5 : 1;
    if (mode === 'cine' && !flags.escaped) target = 0;
    env.out += (target - env.out) * (1 - Math.exp(-dt * 2));
    var o = env.out;
    scene.fog.density = 0.045 + (0.0095 - 0.045) * Math.min(1, o * 1.5);
    scene.fog.color.copy(fogIn).lerp(fogOut, o); scene.background.copy(scene.fog.color);
    moon.intensity = 0.95 * o; moon.position.set(P.pos.x - 300, 400, P.pos.z + 200); moon.target.position.copy(P.pos);
    hemi.intensity = 0.42 + 0.33 * o; hemi.color.set(o > 0.5 ? '#6a7ca0' : '#5a6478');
    stars.material.opacity = o * 0.9; stars.position.copy(camera.position); moonSprite.material.opacity = o; moonSprite.position.set(camera.position.x - 160, camera.position.y + 220, camera.position.z + 120);
    var chunksVisible = !inManor || !flags.escaped && false; if (G.chunksVis !== !inManor) { G.chunksVis = !inManor; for (var k in NF.terrain.chunks) NF.terrain.chunks[k].group.visible = G.chunksVis; }
    // rain outdoors
    var raining = !!(flags.escaped && o > 0.6 && !room);
    rain.visible = raining; AU.rain(raining ? 1 : room && flags.escaped ? 0.35 : 0);
    if (raining) {
      rain.position.set(camera.position.x, camera.position.y - 8, camera.position.z);
      for (var j = 0; j < rainPos.length; j += 6) { rainPos[j + 1] -= dt * 22; rainPos[j + 4] -= dt * 22; if (rainPos[j + 1] < 0) { var y = 20 + Math.random() * 2; rainPos[j + 1] = y; rainPos[j + 4] = y - 0.45; } }
      rain.geometry.attributes.position.needsUpdate = true;
      lightningT -= dt; if (lightningT < 0) { lightningT = 25 + Math.random() * 45; flashT2 = 0.25; setTimeout(function () { AU.thunder(); }, 600 + Math.random() * 2000); }
    }
    if (flashT2 > 0) { flashT2 -= dt; var fl = Math.random() > 0.3 ? 1 : 0.2; moon.intensity += 2.5 * fl * o; hemi.intensity += 1.2 * fl * o; }
    // lamp pool: the nearest street lights, bonfires and porch lamps get real lights
    if (frame % 8 === 0) {
      var cand = NF.terrain.lamps.filter(function (l) { return Math.abs(l.x - P.pos.x) < 70 && Math.abs(l.z - P.pos.z) < 70; }).sort(function (a, b) { return Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z); });
      pool.forEach(function (l, i) { var c = cand[i]; if (!c || inManor) { l.intensity = 0; return; } l.position.set(c.x, W.ground(c.x, c.z) + c.y, c.z); l.color.set(c.c || '#ffc070'); l.userData.base = c.i || 1.3; l.userData.flick = c.flick; });
    }
    pool.forEach(function (l) { if (l.userData.base) l.intensity = l.userData.flick ? l.userData.base * (0.75 + 0.25 * Math.sin(T * 9 + l.position.x)) : l.userData.base; if (inManor) l.intensity = 0; });
    if (P.inVeh) NF.vehicles.lights(P.inVeh, true);
  }
  function grain() {
    if (!grainC) { grainC = $('grain'); grainG = grainC.getContext('2d'); grainImg = grainG.createImageData(256, 256); }
    var d = grainImg.data; for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    grainG.putImageData(grainImg, 0, 0);
  }
  function musicLogic() {
    if (mode === 'title' || mode === 'intro' || mode === 'end' || mode === 'dead') return;
    var room = W.roomAt(P.pos.x, P.pos.z);
    if (G.escapeT !== undefined) { AU.music('chase'); return; }
    if (flags.boss && !flags.bossDead) { AU.music('boss'); return; }
    if (room && room.safe) { AU.music('safe'); return; }
    var w = E.byId('warden'); if (w && !w.dead && w.state !== 'stunned' && w.pos.distanceTo(P.pos) < 22) { AU.music('chase'); return; }
    var danger = E.list.some(function (e) { return !e.dead && e.alert && e.state !== 'dormant' && e.pos.distanceTo(P.pos) < 9; });
    AU.music(danger ? 'tension' : null);
  }

  // ------------------------------------------------------------------ loop
  var frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    tick(Math.min(0.05, clock.getDelta()));
    AU.setListener(camera); AU.update();
    renderer.render(scene, camera);
  }
  function tick(dt) {
    T += dt; frame++;
    if (mode !== 'ui') {
      if (mode === 'play' || mode === 'cine' || mode === 'dead') {
        if (mode === 'play') stats.time += dt;
        G.lastDt = dt;
        if (mode === 'play') NF.vehicles.update(dt, P.inVeh, P.inVeh ? keys : {}); else NF.vehicles.update(dt, null, {});
        updatePlayer(dt);
        E.update(T, dt, P);
        NF.creatures.update(dt);
        updateHeli(dt);
        if (mode === 'cine') { P.invuln = Math.max(P.invuln, 0.3); updateCine(dt); }
        curInteract = mode === 'play' ? findInteract() : null;
        checkTriggers();
        if (G.escapeT !== undefined && mode === 'play') { G.escapeT -= dt; if (G.escapeT <= 0 && P.alive) { P.hp = 1; P.invuln = 0; hurtPlayer(999, null, 'boom'); fade(1, 0.2); setTimeout(function () { fade(0, 2); }, 300); } }
      }
      W.update(T, dt); FX.update(dt);
      if (mode !== 'title') NF.terrain.update(P.pos.x, P.pos.z, flags);
      updateEnv(dt);
      if (teo && !flags.teoGone) { var tp = JSON.parse(JSON.stringify(teo.pose)); A.add(tp, 'chest', 0.04 * Math.sin(T * 2.2), 0, 0); A.add(tp, 'head', 0.05 * Math.sin(T * 0.7), 0, 0); A.apply(teo, tp, 0.2); }
      updateCamera(dt); updateFlash();
      updateSay(dt);
      if (frame % 2 === 0) grain();
      if (frame % 10 === 0) musicLogic();
      hud(dt);
    }
  }
  // inspection hook for testing in the console
  G.dbg = function () { return { P: P, flags: flags, cam: cam, mode: mode, camera: camera, scene: scene, rain: rain, env: env, renderer: renderer, keys: keys, mouse: mouse, setMode: function (m) { mode = m; }, step: function (sec) { for (var i = 0; i < sec * 30; i++) tick(1 / 30); }, take: take, useDoor: useDoor, interact: interact }; };
  window.addEventListener('load', function () { G.boot(); });
  return G;
})();
