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
    magnum: { name: 'Bulldog .50', cap: 6, dmg: 160, rate: 0.85, reload: 2.4, spread: [0.04, 0.002], recoil: 0.16, long: false }
  };
  var P = G.player = {
    pos: new V3(0, 0, 2.2), yaw: 0, hp: 100, alive: true, invuln: 0, ph: 0, speed: 0, grabbedBy: null, grabT: 0, flinch: 0,
    weapon: 'handgun', owned: { handgun: true, shotgun: false, magnum: false }, mag: { handgun: 13, shotgun: 0, magnum: 0 }, ammo: { handgun: 18, shotgun: 0, magnum: 0 },
    inv: { herb: 0, mixed: 0, spray: 0, key_raven: 0, crest: 0, keycard: 0 }, files: [],
    fireCd: 0, reloadT: 0, knifeT: 0, healT: 0, recoil: 0, focus: 0, flashOn: true, deadT: 0, stepPh: 0,
    chest: function () { return new V3(P.pos.x, 1.35, P.pos.z); },
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
    camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 120);
    hemi = new THREE.HemisphereLight('#5a6478', '#20160e', 0.42); scene.add(hemi);
    flash = new THREE.SpotLight('#fff1d8', 2.6, 24, 0.42, 0.55, 1.4); flash.castShadow = true;
    flash.shadow.mapSize.set(1024, 1024); flash.shadow.camera.near = 0.3; flash.shadow.camera.far = 24; flash.shadow.bias = -0.0005;
    scene.add(flash); scene.add(flash.target);
    W.build(scene); FX.init(scene); E.init(scene);
    rig = Mo.mara(); rig.root.rotation.order = 'YXZ'; scene.add(rig.root);
    gun.handgun = Mo.weapon('handgun'); gun.magnum = Mo.weapon('magnum'); gun.shotgun = Mo.weapon('shotgun'); gun.knife = Mo.weapon('knife');
    [gun.handgun, gun.magnum, gun.knife].forEach(function (g) { g.rotation.x = PI / 2; g.position.set(0, -0.085, 0.01); rig.J.wrR.add(g); g.visible = false; });
    rig.J.chest.add(gun.shotgun); gun.shotgun.visible = false;
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
      if (k === 'escape' || k === 'p') openUI('pause');
      else if (k === 'tab' || k === 'i') openUI('inv');
      else if (k === 'm') openUI('map');
      else if (k === 'e') interact();
      else if (k === 'r') startReload();
      else if (k === 'q' && !mouse.aim) { cam.quick = PI; }
      else if (k === 'f') { P.flashOn = !P.flashOn; AU.click(); }
      else if (k === 'h') quickHeal();
      else if (k === '1') equip('handgun'); else if (k === '2') equip('shotgun'); else if (k === '3') equip('magnum');
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
    P.hp -= dmg; P.flinch = 1; P.invuln = kind === 'grab' ? 1.6 : 0.8; P.reloadT = 0; P.healT = 0;
    AU.hurt(); G.shake(kind === 'cleave' || kind === 'slam' ? 0.9 : 0.4);
    $('dmg').style.opacity = 1; setTimeout(function () { $('dmg').style.opacity = 0; }, 260);
    FX.blood(P.chest(), new V3((Math.random() - .5), 0.5, (Math.random() - .5)), 10);
    if (kind === 'grab' && src) { P.grabbedBy = src; P.grabT = 1.1; P.yaw = Math.atan2(src.pos.x - P.pos.x, src.pos.z - P.pos.z); }
    if (kind === 'cleave' || kind === 'slam' || kind === 'claw') { var away = P.pos.clone().sub(src.pos).setY(0).normalize(); P.knock = away.multiplyScalar(kind === 'slam' ? 5 : 3.5); }
    if (P.hp <= 0) { P.hp = 0; P.alive = false; P.deadT = 0; P.grabbedBy = null; gameOver(); }
  }
  function equip(w) {
    if (!P.owned[w] || P.weapon === w || P.reloadT > 0) return;
    P.weapon = w; AU.reload('x'); toast(WEAP[w].name);
  }
  function startReload() {
    var w = P.weapon, d = WEAP[w];
    if (P.reloadT > 0 || P.mag[w] >= d.cap || P.ammo[w] <= 0) { if (P.ammo[w] <= 0 && P.mag[w] < d.cap) toast('No ammunition'); return; }
    P.reloadT = w === 'shotgun' ? d.reload * Math.min(d.cap - P.mag[w], P.ammo[w]) + 0.4 : d.reload; P.reloadMax = P.reloadT;
    AU.reload(w);
  }
  function finishReload() { var w = P.weapon, d = WEAP[w], n = Math.min(d.cap - P.mag[w], P.ammo[w]); P.mag[w] += n; P.ammo[w] -= n; }
  function camForward() { return new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)); }
  function fire() {
    var w = P.weapon, d = WEAP[w];
    if (P.fireCd > 0 || P.reloadT > 0) return;
    if (P.mag[w] <= 0) { AU.click(); P.fireCd = 0.3; if (P.ammo[w] > 0) startReload(); return; }
    P.mag[w]--; P.fireCd = d.rate; stats.shots++;
    var spread = d.spread[0] + (d.spread[1] - d.spread[0]) * P.focus;
    var o = camera.position.clone(), fwd = new V3(); camera.getWorldDirection(fwd);
    var skip = Math.max(0.2, camera.position.distanceTo(P.pos.clone().setY(1.5)) - 0.4);
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
    var gm = d.long ? gun.shotgun : gun[w]; gm.updateMatrixWorld(true);
    var mz = gm.localToWorld(gm.userData.muzzle.clone());
    FX.muzzle(mz, fwd, w !== 'handgun');
    var rr = new V3(-Math.cos(P.yaw), 0, Math.sin(P.yaw)).multiplyScalar(-1);
    if (w === 'handgun') FX.shell(mz.clone().addScaledVector(fwd, -0.12), rr, false);
    if (w === 'shotgun') setTimeout(function () { FX.shell(mz.clone().addScaledVector(fwd, -0.5), rr, true); AU.reload('pump'); }, 380);
    AU.gun(w); E.noise(P.pos, w === 'handgun' ? 22 : 30);
    cam.pitch = Math.min(1.0, cam.pitch + d.recoil * (0.7 + Math.random() * 0.5)); cam.yaw += (Math.random() - .5) * d.recoil * 0.4;
    P.recoil = 1; P.focus *= w === 'handgun' ? 0.35 : 0.1; G.shake(d.recoil * 2);
  }
  function knife() {
    if (P.knifeT > 0 || P.reloadT > 0) return;
    P.knifeT = 0.5; AU.knife();
    setTimeout(function () {
      var fwd = new V3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), best = null, bd = 1.8;
      E.list.forEach(function (e) { if (e.dead || e.state === 'dormant') return; var to = e.pos.clone().sub(P.pos); var d = to.length(); if (d < bd && fwd.dot(to.normalize()) > 0.4) { bd = d; best = e; } });
      if (best) { var pt = best.pos.clone().setY(best.type === 'dog' ? 0.6 : best.state === 'down' ? 0.3 : 1.25); E.damage(best, best.state === 'down' ? 16 : 10, 'body', pt, fwd, 'knife'); AU.impact(pt, true); }
    }, 160);
  }
  function quickHeal() {
    if (P.healT > 0 || P.hp >= 100) return;
    var it = P.inv.herb > 0 && P.hp > 40 ? 'herb' : P.inv.mixed > 0 ? 'mixed' : P.inv.herb > 0 ? 'herb' : P.inv.spray > 0 ? 'spray' : null;
    if (!it) { toast('Nothing to heal with'); return; }
    useHeal(it);
  }
  function useHeal(it) {
    if (P.inv[it] <= 0 || P.hp >= 100) return false;
    P.inv[it]--; P.healT = 1.0; P.hp = Math.min(100, P.hp + (it === 'herb' ? 35 : it === 'mixed' ? 75 : 100)); AU.pickup(); toast('Used ' + S.items[it].name); return true;
  }
  function updatePlayer(dt) {
    var J = rig.J;
    P.invuln -= dt; P.fireCd -= dt; P.knifeT -= dt; P.healT -= dt; P.flinch = Math.max(0, P.flinch - dt * 2.5); P.recoil = Math.max(0, P.recoil - dt * 7);
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) finishReload(); }
    var pose;
    if (!P.alive) {
      P.deadT += dt; pose = A.base();
      var f = Math.min(1, Math.max(0, (P.deadT - 0.3) / 0.6));
      rig.root.rotation.x = -PI / 2 * f * f; rig.root.position.y = 0.12 * f;
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
    gun.handgun.visible = gun.magnum.visible = gun.shotgun.visible = gun.knife.visible = false;
    if (P.grabbedBy) A.grabbed(pose, t);
    else if (P.healT > 0) A.heal(pose, 1 - P.healT);
    else if (P.knifeT > 0) { A.knife(pose, 1 - P.knifeT / 0.5); gun.knife.visible = true; }
    else if (P.reloadT > 0) { A.reload(pose, 1 - P.reloadT / P.reloadMax); if (long) gun.shotgun.visible = true; else gun[w].visible = true; }
    else if (aiming) { if (long) A.aimLong(pose, cam.pitch, P.recoil, t); else A.aimPistol(pose, cam.pitch, P.recoil, t); if (long) gun.shotgun.visible = true; else gun[w].visible = true; }
    else if (long) { A.holdLong(pose); gun.shotgun.visible = true; }
    if (long) {
      if (aiming) { gun.shotgun.position.set(-0.1, 0.16, 0.18); gun.shotgun.rotation.set(-cam.pitch * 0.75 - P.recoil * 0.2, 0.03, 0); }
      else { gun.shotgun.position.set(-0.1, -0.02, 0.2); gun.shotgun.rotation.set(0.6, 0.38, 0.1); }
    }
    if (state === 2 && sp > 0.15) { A.add(pose, 'spine', 0.15, 0, 0.1); A.add(pose, 'knR', 0.3, 0, 0); if (!aiming) { pose.shL = [-0.5, 0, -0.3]; pose.elL = [-1.6, 0, 0]; } }
    if (P.flinch > 0) A.flinch(pose, P.flinch);
    A.apply(rig, pose, 1 - Math.exp(-dt * 14));
    rig.root.position.copy(P.pos); rig.root.rotation.y = P.yaw; rig.root.rotation.x = 0;
    // combat input
    if (canAct) {
      if (aiming && mouse.fire && (mouse.fireEdge || P.weapon === 'handgun' && false)) fire();
      else if (!aiming && mouse.fireEdge && P.healT <= 0) knife();
    }
    mouse.fireEdge = false;
  }
  // ------------------------------------------------------------------ camera
  var camPos = new V3(), lookAt = new V3();
  function updateCamera(dt) {
    if (mode === 'cine') return;
    var aiming = mouse.aim && P.alive && mode === 'play' && P.reloadT <= 0 && P.healT <= 0;
    var tDist = aiming ? 1.15 : 2.55, tSh = aiming ? 0.52 : 0.45, tFov = aiming ? 48 : 62;
    if (mode === 'title') { var a = Math.sin(T * 0.06) * 0.9; camera.position.set(Math.sin(a) * 3.5, 1.9 + Math.sin(T * 0.2) * 0.25, 4.5 - Math.abs(Math.sin(a)) * 1.5); camera.lookAt(Math.sin(a) * 1.2, 3.2, 16); return; }
    if (!P.alive) tDist = 3.6;
    var k = 1 - Math.exp(-dt * 10);
    cam.dist += (tDist - cam.dist) * k; cam.sh += (tSh - cam.sh) * k; cam.fov += (tFov - cam.fov) * k;
    var f = camForward(), right = new V3(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    var pivot = new V3(P.pos.x, aiming ? 1.58 : 1.62, P.pos.z).addScaledVector(right, cam.sh);
    if (!P.alive) pivot.y = 0.8;
    // keep the shoulder offset inside walls
    var sideD = W.ray(new V3(P.pos.x, pivot.y, P.pos.z), right, cam.sh + 0.2); if (sideD < cam.sh + 0.2) pivot = new V3(P.pos.x, pivot.y, P.pos.z).addScaledVector(right, Math.max(0, sideD - 0.2));
    var back = f.clone().negate(), dd = W.ray(pivot, back, cam.dist + 0.3);
    var dist = Math.max(0.25, Math.min(cam.dist, dd - 0.25));
    camPos.copy(pivot).addScaledVector(back, dist);
    if (cam.shake > 0) { camPos.x += (Math.random() - .5) * cam.shake * 0.12; camPos.y += (Math.random() - .5) * cam.shake * 0.12; cam.shake = Math.max(0, cam.shake - dt * 2.2); }
    camera.position.copy(camPos); lookAt.copy(pivot).addScaledVector(f, 10); camera.lookAt(lookAt);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    rig.J.headMesh.visible = dist > 0.45;
  }
  G.shake = function (a) { cam.shake = Math.min(1.5, cam.shake + a); };
  function updateFlash() {
    var f = mode === 'cine' || mode === 'title' ? new V3(Math.sin(P.yaw), -0.1, Math.cos(P.yaw)) : camForward();
    var base = new V3(P.pos.x, 1.5, P.pos.z).add(new V3(-Math.cos(P.yaw) * 0.1, 0, Math.sin(P.yaw) * 0.1));
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
    return best;
  }
  function promptText(o) {
    if (o.kind === 'item') { var it = o.it; if (it.type === 'file') return 'Read ' + S.files[it.file].title; return 'Pick up ' + itemName(it); }
    if (o.kind === 'door') return o.d.never || (o.d.lock && !hasKey(o.d)) ? 'Examine door' : 'Open door';
    return o.s.prompt;
  }
  function itemName(it) { return it.name || (it.type === 'hg_ammo' ? 'Handgun Ammo' : it.type === 'sg_ammo' ? 'Shotgun Shells' : it.type === 'mag_ammo' ? 'Magnum Rounds' : S.items[it.type] ? S.items[it.type].name : it.type); }
  function hasKey(d) { if (!d.lock) return true; if (d.lock.indexOf('flag:') === 0) return !!flags[d.lock.slice(5)]; return P.inv[d.lock] > 0 || flags['used_' + d.lock]; }
  function interact() {
    var o = curInteract; if (!o) return;
    if (o.kind === 'item') take(o.it);
    else if (o.kind === 'door') useDoor(o.d);
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
    if (t === 'hg_ammo') P.ammo.handgun += it.amount; else if (t === 'sg_ammo') P.ammo.shotgun += it.amount; else if (t === 'mag_ammo') P.ammo.magnum += it.amount;
    else if (t === 'shotgun' || t === 'magnum') { P.owned[t] = true; P.mag[t] = WEAP[t].cap; equip(t); hint('Press ' + (t === 'shotgun' ? '2' : '3') + ' to equip the ' + WEAP[t].name + ' · 1 for the handgun', 5); }
    else P.inv[t] = (P.inv[t] || 0) + 1;
    W.takeItem(it); markTaken(it); AU.pickup();
    toast('Picked up ' + itemName(it) + (it.amount ? ' ×' + it.amount : ''));
    if (t === 'key_raven') { flags.gotRaven = true; spawnStage(); objective('raven'); say([['MARA', 'A raven on the bow. The library door had the same engraving.', 3.2]]); }
    if (t === 'crest') skinnerEvent();
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
    if (flags.bossDead && !flags.escaped && P.pos.z > 71.6) ending();
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
  function ending() {
    flags.escaped = true; mode = 'end'; G.escapeT = undefined; $('timer').style.display = 'none';
    document.exitPointerLock && document.exitPointerLock();
    fade(1, 1.5); AU.music('ending');
    var t = stats.time, mins = Math.floor(t / 60), secs = Math.floor(t % 60);
    var rank = t < 900 && stats.saves <= 3 ? 'S' : t < 1500 ? 'A' : t < 2400 ? 'B' : 'C';
    setTimeout(function () {
      $('endT').innerHTML = 'Dawn broke over Ashgrove as the manor burned behind her.<br><br>A county rescue team found Officer Mara Voss at the helipad, alone, with three rounds left and no explanation anyone would believe.<br><br>When they searched the ruins, the body of Officer Teo Ramirez was never recovered.<br><br><b>THE END?</b>';
      $('endS').innerHTML = '<span>Time</span><span>' + mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's</span><span>Kills</span><span>' + stats.kills + '</span><span>Accuracy</span><span>' + (stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0) + '%</span><span>Saves</span><span>' + stats.saves + '</span>';
      $('endR').textContent = 'RANK ' + rank;
      showScreen('end');
      try { localStorage.removeItem('nf_save'); } catch (e) { }
    }, 1800);
  }
  G.onKill = function (e) { stats.kills++; flags.killed = flags.killed || {}; flags.killed[e.id] = true; };

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
    ['handgun', 'shotgun', 'magnum'].forEach(function (w) { if (P.owned[w]) list.push({ k: w, ct: P.mag[w] + '/' + P.ammo[w], eq: P.weapon === w }); });
    list.push({ k: 'knife' });
    ['herb', 'mixed', 'spray', 'key_raven', 'crest', 'keycard'].forEach(function (k) { if (P.inv[k] > 0) list.push({ k: k, ct: P.inv[k] > 1 || k === 'herb' ? P.inv[k] : '' }); });
    list.forEach(function (it) {
      var d = document.createElement('div'); d.className = 'slot' + (it.eq ? ' eq' : '') + (invSel === it.k ? ' sel' : '');
      d.innerHTML = '<div class="ic">' + S.items[it.k].icon + '</div><div>' + S.items[it.k].name + '</div>' + (it.ct !== undefined && it.ct !== '' ? '<div class="ct">' + it.ct + '</div>' : '');
      d.onclick = function () { invSel = it.k; buildInv(); };
      g.appendChild(d);
    });
    for (var i = list.length; i < 12; i++) { var e = document.createElement('div'); e.className = 'slot'; e.style.opacity = 0.35; g.appendChild(e); }
    var info = $('invInfo'), acts = $('invActs'); acts.innerHTML = '';
    if (invSel && S.items[invSel]) {
      info.innerHTML = '<b style="font-family:Cinzel,serif;letter-spacing:.15em">' + S.items[invSel].name + '</b><br>' + S.items[invSel].desc;
      function btn(lbl, fn) { var b = document.createElement('button'); b.textContent = lbl; b.onclick = function () { fn(); buildInv(); }; acts.appendChild(b); }
      if (WEAP[invSel] && P.weapon !== invSel) btn('Equip', function () { equip(invSel); });
      if ((invSel === 'herb' || invSel === 'mixed' || invSel === 'spray') && P.hp < 100) btn('Use', function () { useHeal(invSel); });
      if (invSel === 'herb' && P.inv.herb >= 2) btn('Combine (G+G)', function () { P.inv.herb -= 2; P.inv.mixed++; AU.pickup(); invSel = 'mixed'; });
    } else info.innerHTML = '<span style="color:var(--dim)">Health: ' + Math.round(P.hp) + '% · Select an item.</span>';
    var fl = $('invFiles'); fl.innerHTML = P.files.length ? '' : '<div style="color:var(--dim)">No files found yet.</div>';
    P.files.forEach(function (id) { var b = document.createElement('button'); b.className = 'small'; b.style.display = 'block'; b.style.margin = '0 0 8px'; b.textContent = S.files[id].title; b.onclick = function () { readFile(id); }; fl.appendChild(b); });
  }
  function drawMap() {
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
    g.save(); g.translate(px, pz); g.rotate(P.yaw); g.fillStyle = '#ff4040'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
  }

  // ------------------------------------------------------------------ saving
  function snapshot() {
    var killed = {}; E.list.forEach(function (e) { if (e.dead) killed[e.id] = true; });
    return { v: 1, pos: [P.pos.x, P.pos.z], yaw: P.yaw, hp: P.hp, weapon: P.weapon, owned: P.owned, mag: P.mag, ammo: P.ammo, inv: P.inv, files: P.files, flags: JSON.parse(JSON.stringify(flags)), killed: killed, stats: stats, flash: P.flashOn };
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
    var b = E.byId('boss'); if (b && flags.boss && !b.dead) $('bossF').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
    if (G.escapeT !== undefined) { var s = Math.max(0, G.escapeT); $('timer').textContent = Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2) + '.' + ('0' + Math.floor(s * 100 % 100)).slice(-2); }
    // prompt
    var pr = $('prompt');
    if (mode === 'play' && P.alive && curInteract) { $('promptT').textContent = promptText(curInteract); pr.style.opacity = 1; } else pr.style.opacity = 0;
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
        updatePlayer(dt);
        E.update(T, dt, P);
        if (mode === 'cine') { P.invuln = Math.max(P.invuln, 0.3); updateCine(dt); }
        curInteract = mode === 'play' ? findInteract() : null;
        checkTriggers();
        if (G.escapeT !== undefined && mode === 'play') { G.escapeT -= dt; if (G.escapeT <= 0 && P.alive) { P.hp = 1; P.invuln = 0; hurtPlayer(999, null, 'boom'); fade(1, 0.2); setTimeout(function () { fade(0, 2); }, 300); } }
      }
      W.update(T, dt); FX.update(dt);
      if (teo && !flags.teoGone) { var tp = JSON.parse(JSON.stringify(teo.pose)); A.add(tp, 'chest', 0.04 * Math.sin(T * 2.2), 0, 0); A.add(tp, 'head', 0.05 * Math.sin(T * 0.7), 0, 0); A.apply(teo, tp, 0.2); }
      updateCamera(dt); updateFlash();
      updateSay(dt);
      if (frame % 2 === 0) grain();
      if (frame % 10 === 0) musicLogic();
      hud(dt);
    }
  }
  // inspection hook for testing in the console
  G.dbg = function () { return { P: P, flags: flags, cam: cam, mode: mode, camera: camera, scene: scene, renderer: renderer, keys: keys, mouse: mouse, setMode: function (m) { mode = m; }, step: function (sec) { for (var i = 0; i < sec * 30; i++) tick(1 / 30); }, take: take, useDoor: useDoor, interact: interact }; };
  window.addEventListener('load', function () { G.boot(); });
  return G;
})();
