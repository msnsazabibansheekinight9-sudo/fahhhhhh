// Dropfall — first-person weapon and hands, with animation.
'use strict';
(function () {
  const T = THREE, MD = DF.Models, U = DF.U;
  const VW = DF.View = {};
  const part = MD.part, joint = MD.joint;
  let scene, cam, rig, gunHolder, gun = null, gunId = null, leftArm, rightArm, wrist, wristTex, wristCtx, nadeMesh, stimMesh, beaconMesh, boxMesh, flashSprite, flashLight, cockpit;
  const st = { bob: 0, swayX: 0, swayY: 0, recoil: 0, recoilRot: 0, sw: 1, swTarget: 1, sprint: 0, ads: 0, throwT: 0, stimT: 0, menu: 0, ready: 0, lastMag: -1, lastNades: -1, lastStims: -1, lastCd: 0, reloadMax: 1, wasReload: false, shellT: 0, menuK: 0, prone: 0, beaconThrowT: 0 };
  const shells = [];

  VW.init = function () {
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(52, 1, 0.1, 400);
    VW.hemi = new T.HemisphereLight('#dfe8ff', '#4a4030', 0.55); scene.add(VW.hemi);
    VW.key = new T.DirectionalLight('#fff2dc', 0.9); VW.key.position.set(30, 60, 20); scene.add(VW.key);
    const rim = new T.DirectionalLight('#9fb8ff', 0.6); rim.position.set(-40, 10, -30); scene.add(rim);
    flashLight = new T.PointLight('#ffcf8a', 0, 80, 2); scene.add(flashLight);
    rig = new T.Group(); rig.scale.setScalar(0.42); scene.add(rig);
    gunHolder = joint(rig, 0, 0, 0);
    // arms: sleeves come from below the camera
    rightArm = makeArm(1); leftArm = makeArm(-1);
    // held items for the left hand
    nadeMesh = part(leftArm.hand, 'sph', '#4a5240', 1.8, 2.1, 1.8, 0, 0.5, -1, { m: 0.4 });
    stimMesh = joint(leftArm.hand, 0, 1, -2); part(stimMesh, 'cylXc', '#d8e8e0', 0.7, 6, 0.7, 0, 0, 0, { r: 0.2 }); part(stimMesh, 'cylXc', '#7fffd0', 0.5, 3, 0.5, 1, 0, 0, { e: '#3fbf90', ei: 1 }); part(stimMesh, 'cylXc', '#aaaaaa', 0.12, 3, 0.12, 4.4, 0, 0); stimMesh.rotation.y = -Math.PI / 2;
    beaconMesh = joint(leftArm.hand, 0, 1, -1); part(beaconMesh, 'cyl', '#2a2c2e', 1.1, 7, 1.1, 0, 2, 0, { m: 0.6 }); VW.beaconLight = part(beaconMesh, 'sphLo', '#ff5a3a', 1, 1, 1, 0, 6, 0, { add: true, o: 1 });
    boxMesh = part(rig, 'box', '#e07a2a', 12, 9, 9, -9, -12, -16, { m: 0.4 });
    // wrist computer
    // wrist computer: a forearm-mounted panel raised in front of the face
    wrist = joint(rig, 0, 0, 0);
    const c = document.createElement('canvas'); c.width = 256; c.height = 192; wristCtx = c.getContext('2d');
    wristTex = new T.CanvasTexture(c);
    part(wrist, 'box', '#2a2c2e', 15, 11.5, 1.6, 0, 0, -0.9, { m: 0.6, r: 0.4 });
    part(wrist, 'box', '#3a3e38', 16, 2.4, 3, 0, -6.5, -0.5, { m: 0.4 });
    for (const x of [-6.5, 6.5]) part(wrist, 'box', '#1e1f20', 1.2, 12, 2.2, x, 0, -0.3, { m: 0.5 });
    const scr = new T.Mesh(new T.PlaneGeometry(13, 9.75), new T.MeshBasicMaterial({ map: wristTex }));
    scr.position.set(0, 0.2, 0.01); wrist.add(scr);
    const sl = part(wrist, 'box', '#25272a', 9, 7, 6, 0, -9, 2, { r: 0.85 }); // sleeve under the panel
    // muzzle flash
    flashSprite = new T.Sprite(new T.SpriteMaterial({ map: flashTex(), color: '#ffd9a0', blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
    flashSprite.visible = false; scene.add(flashSprite);
    // exosuit cockpit frame
    cockpit = new T.Group(); cockpit.scale.setScalar(0.55); scene.add(cockpit); cockpit.visible = false;
    const steel = { m: 0.6, r: 0.45 };
    part(cockpit, 'box', '#2c302a', 4, 60, 4, -26, 0, -30, steel).rotation.z = 0.35;
    part(cockpit, 'box', '#2c302a', 4, 60, 4, 26, 0, -30, steel).rotation.z = -0.35;
    part(cockpit, 'box', '#2c302a', 80, 6, 6, 0, -17, -28, steel);
    part(cockpit, 'box', '#3a3e38', 70, 10, 14, 0, -24, -24, steel);
    for (let i = 0; i < 6; i++) part(cockpit, 'box', i % 2 ? '#ffb020' : '#3fbf5a', 2, 1, 1, -12 + i * 5, -18.6, -21.5, { e: i % 2 ? '#ffb020' : '#3fbf5a', ei: 2 });
    part(cockpit, 'box', '#2c302a', 70, 4, 4, 0, 24, -32, steel);
  };

  function flashTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,220,150,0.9)'); g.addColorStop(1, 'rgba(255,120,30,0)');
    x.fillStyle = g; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 14 : 32; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill();
    return new T.CanvasTexture(c);
  }

  function makeArm(side) {
    const A = {};
    A.sh = joint(rig, 8 * side, -24, 12);
    A.up = joint(A.sh, 0, 0, 0);
    A.fore = joint(A.up, 0, 0, -20);
    A.hand = joint(A.fore, 0, 0, -19.5);
    A.sleeveMeshes = [];
    A.sleeveMeshes.push(part(A.up, 'cyl', '#6c7458', 2.2, 21, 2.2, 0, 0, -9.5, { r: 0.8, m: 0.05 }));
    A.sleeveMeshes[0].rotation.x = Math.PI / 2;
    const fo = part(A.fore, 'cyl', '#25272a', 1.7, 17, 1.5, 0, 0, -9, { r: 0.9, m: 0.05 }); fo.rotation.x = Math.PI / 2;
    const cuff = part(A.fore, 'cyl', '#2e3033', 2, 3, 2, 0, 0, -17.5, { r: 0.85 }); cuff.rotation.x = Math.PI / 2;
    A.guard = part(A.fore, 'box', '#6c7458', 3.4, 1.4, 10, 0, 1.6, -9.5, { m: 0.2, r: 0.6 });
    part(A.up, 'sph', '#6c7458', 2.4, 2.4, 2.4, 0, 0, -20, { r: 0.7 });
    part(A.hand, 'box', '#1e1f20', 3.2, 2.4, 3.6, 0, 0, -0.8, { r: 0.85 });
    for (let i = 0; i < 4; i++) part(A.hand, 'box', '#1e1f20', 0.7, 0.9, 2.6, -1.1 + i * 0.75, 0.3, -3.6, { r: 0.85 });
    part(A.hand, 'box', '#1e1f20', 0.9, 0.9, 2.4, 1.6 * side, -0.4, -2, { r: 0.85 });
    return A;
  }

  VW.setArmor = function (arm) {
    for (const A of [leftArm, rightArm]) { A.sleeveMeshes[0].material = MD.mat(arm.main, { r: 0.8, m: 0.05 }); A.guard.material = MD.mat(arm.trim, { r: 0.6, m: 0.2 }); }
  };

  VW.debug = () => ({ scene, rig, cam, gun, leftArm, rightArm, st });
  VW.resize = function (w, h) { if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); } };

  // ---------------------------------------------------------------- weapon models (built along -Z, +Y up, +X right)
  function buildGun(id) {
    const d = DF.WEAPONS[id], root = new T.Group(), g = { root, id, d };
    const m = { m: 0.42, r: 0.45 }, poly = { m: 0.05, r: 0.7 }, dark = '#1d1f21', mid = '#34373a', tan = '#5a5040', olive = '#4a5040';
    const B = (col, sx, sy, sz, x, y, z, o) => part(root, 'box', col, sx, sy, sz, x, y, z, o || m);
    const Cz = (col, r, len, x, y, z, o, parent) => { const c = part(parent || root, 'cyl', col, r, len, r, x, y, z, o || m); c.rotation.x = Math.PI / 2; return c; };
    g.muzzle = new T.Object3D(); root.add(g.muzzle);
    g.mag = joint(root, 0, 0, 0); g.glow = []; g.heat = [];
    const muzzleAt = z => g.muzzle.position.set(0, 0.6, z);
    const grip = (z, col) => { const p = B(col || dark, 1.8, 4.5, 2.4, 0, -3, z, poly); p.rotation.x = 0.25; };
    const stock = (z, len, col) => { B(col || dark, 1.6, 3.5, len, 0, -0.6, z + len / 2, poly); B(col || dark, 1.8, 5, 1.2, 0, -1.2, z + len, poly); };
    const reddot = z => { B(dark, 1.6, 1.6, 2.6, 0, 2.4, z); const l = part(root, 'box', '#ff3a2a', 0.3, 0.3, 0.1, 0, 2.6, z - 1.35, { e: '#ff2a1a', ei: 3 }); l.userData.noFlash = true; };
    const scope = (z, len) => { Cz(dark, 1.2, len, 0, 2.8, z); Cz(dark, 1.5, 2, 0, 2.8, z - len / 2); Cz(dark, 1.5, 2, 0, 2.8, z + len / 2); B(mid, 0.8, 1.2, 1, 0, 1.6, z - len / 4); B(mid, 0.8, 1.2, 1, 0, 1.6, z + len / 4); part(root, 'sphLo', '#3a8ab8', 1.05, 1.05, 0.2, 0, 2.8, z - len / 2 - 1, { m: 0.9, r: 0.05, e: '#0a2a4a' }); };
    const rail = (z0, z1) => { for (let z = z0; z > z1; z -= 1.2) B(mid, 1.4, 0.5, 0.6, 0, 1.6, z); };
    const cls = d.cls;
    switch (id) {
      case 'ar7': case 'ar7p': case 'ar61': {
        B(mid, 2.4, 3, 12, 0, 0, -2);            // receiver
        B(id === 'ar61' ? tan : olive, 2.6, 2.6, 9, 0, 0.2, -12, poly); // handguard
        for (let i = 0; i < 4; i++) B(dark, 2.7, 0.5, 1.2, 0, -0.2, -9 - i * 2.2);
        Cz(dark, 0.55, 10, 0, 0.6, -20); Cz(dark, 0.9, 2.6, 0, 0.6, -25.5); muzzleAt(-27);
        grip(2.5); stock(4, 9, id === 'ar61' ? tan : dark); rail(1, -14); reddot(-1);
        const mg = part(g.mag, 'box', dark, 1.8, 6, 3, 0, -4, -5.5, m); mg.rotation.x = -0.2;
        B(mid, 0.6, 1, 1.4, 1.4, 0.6, 0); g.bolt = B('#8a8a86', 0.5, 0.6, 1.6, 1.3, 0.8, -2.5);
        if (id === 'ar7p') part(root, 'box', '#d8a33a', 2.65, 0.4, 3, 0, 1.3, -12);
        break;
      }
      case 'smg12': {
        B(mid, 2.2, 3, 9, 0, 0, -2); B(dark, 2.3, 2.4, 5, 0, 0, -9); Cz(dark, 0.5, 5, 0, 0.6, -13); Cz(dark, 1, 3, 0, 0.6, -15); muzzleAt(-17);
        grip(1.5); B(dark, 0.6, 0.6, 9, 0.9, -0.3, 6); B(dark, 0.6, 0.6, 9, -0.9, -0.3, 6); B(dark, 2, 3, 0.8, 0, -0.8, 10.5); reddot(-1);
        part(g.mag, 'box', dark, 1.6, 7, 2.2, 0, -5, -4.5, m);
        break;
      }
      case 'sg4': case 'sg8': case 'sg12': {
        B(mid, 2.4, 3.2, 10, 0, 0, 0); Cz(dark, 0.85, 22, 0, 1, -15); muzzleAt(-26.5);
        if (id === 'sg12') { const dr = part(g.mag, 'cyl', dark, 3.6, 3, 3.6, 0, -3.2, -4, m); dr.rotation.z = Math.PI / 2; B(olive, 2.6, 2.6, 8, 0, -0.6, -11, poly); }
        else { Cz(dark, 0.7, 18, 0, -0.8, -13); g.pump = joint(root, 0, 0, 0); part(g.pump, 'box', id === 'sg8' ? tan : olive, 2.8, 2.6, 7, 0, -0.8, -12, poly); for (let i = 0; i < 4; i++) part(g.pump, 'box', dark, 2.9, 0.4, 0.6, 0, -0.8, -9.5 - i * 1.6); }
        grip(3.5); stock(5, 10, id === 'sg8' ? tan : dark);
        B('#c0a040', 0.3, 0.5, 1, 0, 2.7, -25); // bead sight
        for (let i = 0; i < 4; i++) part(root, 'cylXc', '#b02a1a', 0.45, 2, 0.45, 1.6, -0.5 + i * 0.9, 1);
        break;
      }
      case 'mr2': case 'br23': {
        B(mid, 2.5, 3.4, 14, 0, 0, -1); B(id === 'mr2' ? tan : olive, 2.8, 3, 11, 0, 0.2, -13, poly);
        Cz(dark, 0.6, 14, 0, 0.6, -24); Cz(dark, 1.1, 3, 0, 0.6, -31); muzzleAt(-33);
        grip(4); stock(6, 11, id === 'mr2' ? tan : dark);
        if (id === 'mr2') scope(-3, 11); else { reddot(-2); rail(2, -16); }
        part(g.mag, 'box', dark, 2, 5, 3.4, 0, -3.6, -4, m);
        break;
      }
      case 'ls1': case 'lp1': case 'las9': {
        const big = id === 'las9', pistol = id === 'lp1', k = big ? 1.4 : pistol ? 0.6 : 1;
        B('#e2e4e6', 2.6 * k, 3.4 * k, 16 * k, 0, 0, -3 * k, { m: 0.4, r: 0.3 });
        B('#2a2c30', 2.7 * k, 1.4 * k, 14 * k, 0, 1.6 * k, -3 * k);
        for (let i = 0; i < 4; i++) { const r = part(root, 'torus', '#ff5a40', 1.3 * k, 1.3 * k, 1.3 * k, 0, 0.4 * k, -15 * k - i * 1.8 * k, { e: '#ff3a20', ei: 1.5 }); g.heat.push(r); }
        Cz('#3a3c40', 0.8 * k, 8 * k, 0, 0.4 * k, -17 * k); muzzleAt(-22 * k);
        grip(pistol ? 0 : 3 * k, '#2a2c30');
        if (!pistol) stock(5 * k, 8 * k, '#e2e4e6');
        part(g.mag, 'box', '#c8a030', 1.6 * k, 3 * k, 3 * k, 1.6 * k, -0.5 * k, 0, { m: 0.6, e: '#4a3a0a', ei: 0.5 });
        if (pistol) root.scale.setScalar(1);
        break;
      }
      case 'pl3': {
        B('#3a3a46', 3, 4, 12, 0, 0, -2); const ch = part(root, 'sph', '#7fd0ff', 2.4, 2.4, 4, 0, 0.4, -11, { e: '#2a8adf', ei: 1.4, o: 0.9 }); g.glow.push(ch);
        B('#2a2a36', 3.6, 4.4, 4, 0, 0.4, -15); Cz('#1a1a22', 1.2, 4, 0, 0.4, -18.5); muzzleAt(-21);
        grip(2.5, '#22222a'); stock(4, 8, '#3a3a46'); reddot(-2);
        part(g.mag, 'box', '#2a8adf', 1.8, 3, 3, 0, -2.8, -5, { e: '#1a5aaf', ei: 0.8 });
        break;
      }
      case 'xb5': {
        B(olive, 2.4, 3, 18, 0, 0, -4, poly); grip(3); stock(5, 8, dark);
        for (const s of [1, -1]) { const l = part(root, 'box', dark, 9, 1, 1.4, 5 * s, 0.4, -12, m); l.rotation.y = 0.35 * s; }
        g.string = part(root, 'box', '#c8c0b0', 18, 0.2, 0.2, 0, 0.4, -9, poly);
        g.mag = joint(root, 0, 0, 0); part(g.mag, 'cyl', '#7a6a4a', 0.35, 14, 0.35, 0, 1.7, -14, poly).rotation.x = Math.PI / 2; part(g.mag, 'cone', '#c8c0b0', 0.8, 2, 0.8, 0, 1.7, -21.5).rotation.x = -Math.PI / 2;
        muzzleAt(-22); reddot(1);
        break;
      }
      case 'fl2': case 'fl7': {
        const k = id === 'fl7' ? 1.25 : 1;
        B('#5a3a2a', 2.6 * k, 3.4 * k, 12 * k, 0, 0, -2, poly); Cz('#2a2220', 1 * k, 12 * k, 0, 0.6, -14 * k); Cz('#3a2a22', 1.5 * k, 2.4 * k, 0, 0.6, -20 * k); muzzleAt(-21.5 * k);
        part(g.mag, 'cyl', '#b02a1a', 2.4 * k, 10 * k, 2.4 * k, 0, -3.5 * k, -4, { m: 0.4, r: 0.4 }).rotation.x = Math.PI / 2;
        grip(3); if (id === 'fl7') stock(5, 9, dark);
        g.pilot = part(root, 'sphLo', '#ff9a3a', 0.8, 0.8, 0.8, 0, -0.6, -21 * k, { add: true, o: 0.9 }); g.pilot.userData.noFlash = true;
        break;
      }
      case 'rg3': case 'rs4': {
        const k = id === 'rs4' ? 1.25 : 1;
        B('#3c4046', 2.6 * k, 3.6 * k, 12 * k, 0, 0, -1);
        for (const s of [1, -1]) B('#5a6066', 0.8 * k, 1 * k, 22 * k, 1.3 * s * k, 0.6, -17 * k);
        for (let i = 0; i < 5; i++) { const c = part(root, 'box', '#7fd0ff', 3.2 * k, 0.8 * k, 0.9 * k, 0, 0.6, -10 * k - i * 3.4 * k, { e: '#2a9adf', ei: 0.4 }); g.glow.push(c); }
        muzzleAt(-28 * k); grip(3); stock(5, 9 * k, dark); if (id === 'rs4') scope(-2, 9); else reddot(-1);
        part(g.mag, 'box', '#2a2c30', 1.8, 4, 3, 0, -3.4, -4, m);
        break;
      }
      case 'arc1': case 'arc3': {
        const k = id === 'arc3' ? 1.25 : 1;
        B('#3c4a56', 3 * k, 4 * k, 12 * k, 0, 0, -1);
        for (let i = 0; i < 3; i++) { const c = part(root, 'torus', '#9ab8d0', 2 * k, 2 * k, 2 * k, 0, 0.4, -9 * k - i * 2.5 * k, { m: 0.9, r: 0.3 }); }
        for (const s of [1, -1]) { const p = part(root, 'box', '#8a9aa8', 0.6 * k, 0.6 * k, 7 * k, 1.4 * s * k, 0.4, -18 * k, m); p.rotation.y = 0.12 * s; }
        g.glow.push(part(root, 'sphLo', '#9fe8ff', 1.2 * k, 1.2 * k, 1.2 * k, 0, 0.4, -21 * k, { add: true, o: 0.8 }));
        muzzleAt(-22 * k); grip(3); stock(5, 8, dark);
        part(g.mag, 'cyl', '#3a4a56', 2, 6, 2, 0, -3, 3, m).rotation.x = Math.PI / 2;
        break;
      }
      case 'p2': case 'smg37': case 'gp1': {
        const big = id === 'gp1';
        B(id === 'smg37' ? mid : '#2a2c2e', 2 * (big ? 1.4 : 1), 2.6, 9, 0, 0.6, -3); B(dark, 2, 1.4, 9, 0, -0.8, -3);
        if (big) { Cz('#b02a1a', 1.6, 8, 0, 0.6, -10); muzzleAt(-14); } else { Cz(dark, 0.5, 2, 0, 0.6, -8); muzzleAt(-8.6); }
        const gp = B(dark, 1.8, 5.5, 2.6, 0, -3.6, 0, poly); gp.rotation.x = 0.2;
        part(g.mag, 'box', dark, 1.5, id === 'smg37' ? 9 : 5, 2.2, 0, id === 'smg37' ? -5 : -3.8, -0.2, m);
        B('#e8e2c8', 0.3, 0.5, 0.3, 0, 2.1, -7);
        break;
      }
      case 'p6': {
        B('#4a4c4e', 1.8, 2.6, 5, 0, 0.6, -1); Cz('#3a3c3e', 0.7, 9, 0, 1, -8); B('#3a3c3e', 1.2, 1, 9, 0, 1.9, -8); muzzleAt(-12.6);
        g.cyl = joint(root, 0, 0.4, -2.5); const cy = part(g.cyl, 'cyl', '#5a5c5e', 1.9, 3.4, 1.9, 0, 0, 0, m); cy.rotation.x = Math.PI / 2;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(g.cyl, 'cylXc', '#c0a040', 0.35, 0.2, 0.35, Math.cos(a) * 1.1, Math.sin(a) * 1.1, 1.75).rotation.y = Math.PI / 2; }
        const gp = B('#5a3a2a', 1.8, 5.5, 2.6, 0, -3.2, 1.5, poly); gp.rotation.x = 0.35;
        break;
      }
      case 'mg50': case 'hmg': {
        const k = id === 'hmg' ? 1.2 : 1;
        B(mid, 3 * k, 4 * k, 16 * k, 0, 0, -2); B(dark, 3.2 * k, 1.6 * k, 15 * k, 0, 2.4 * k, -2);
        Cz(dark, 0.9 * k, 18 * k, 0, 0.6, -19 * k); if (id === 'hmg') for (let i = 0; i < 6; i++) Cz(mid, 1.3, 1, 0, 0.6, -14 - i * 2.4); Cz(dark, 1.4 * k, 3, 0, 0.6, -29 * k); muzzleAt(-31 * k);
        grip(4); stock(6, 9 * k, dark); reddot(-4); B(mid, 0.6, 3, 0.6, 0, 3.4, -20);
        part(g.mag, 'box', olive, 4 * k, 5 * k, 6 * k, -1.8 * k, -3.4 * k, -4, poly);
        for (let i = 0; i < 6; i++) part(g.mag, 'box', '#c0a040', 1, 0.8, 0.6, 1.4, 0.8 - i * 0.6, -4 + (i % 2) * 0.4);
        for (const s of [1, -1]) { const l = B(dark, 0.4, 0.4, 7, 0.8 * s, -1.6, -24 * k); l.rotation.x = -0.3; }
        break;
      }
      case 'amr': {
        B(mid, 2.6, 3.8, 16, 0, 0, -1); B(olive, 2.8, 2.8, 10, 0, 0.2, -14, poly); Cz(dark, 0.75, 22, 0, 0.6, -29); B(dark, 2.6, 2, 3.2, 0, 0.6, -41); muzzleAt(-43);
        grip(4); stock(7, 12, dark); scope(-2, 13);
        part(g.mag, 'box', dark, 2, 5, 4.4, 0, -3.8, -4, m);
        break;
      }
      case 'ac8': {
        B(olive, 4, 5, 18, 0, 0, -1, poly); B(mid, 4.2, 2, 12, 0, 3, -1); Cz(dark, 1.4, 22, 0, 1, -21); Cz(dark, 2.2, 4, 0, 1, -33); for (let i = 0; i < 4; i++) Cz(mid, 1.8, 0.6, 0, 1, -14 - i * 2); muzzleAt(-35);
        grip(4); stock(7, 10, dark); reddot(-3);
        part(g.mag, 'box', dark, 3, 7, 6, -0.5, -5, -4, m);
        break;
      }
      case 'rr1': case 'os1': case 'sk3': case 'qs1': {
        const col = id === 'os1' ? '#5a6a4a' : id === 'qs1' ? '#c8ccd2' : id === 'sk3' ? '#3a4048' : olive;
        Cz(col, 3.2, 36, 0, 3, -10, poly); Cz(dark, 3.6, 3, 0, 3, -28); Cz(dark, 3.4, 3, 0, 3, 8);
        muzzleAt(-30); g.muzzle.position.y = 3;
        const gp = B(dark, 1.8, 5, 2.4, 0, -2.6, -3, poly); gp.rotation.x = 0.2; B(dark, 1.8, 4.5, 2.4, 0, -2.4, -13, poly);
        B(mid, 1.4, 3, 3, -3.6, 4.5, -10); // sight
        if (id === 'sk3') { const s = part(root, 'box', '#2a8adf', 0.3, 2.6, 3.4, -3.8, 5, -6, { e: '#1a5aaf', ei: 1.5 }); g.glow.push(s); }
        if (id === 'qs1') for (let i = 0; i < 4; i++) { const r = part(root, 'torus', '#7fe3ff', 3.5, 3.5, 3.5, 0, 3, -18 + i * 6, { e: '#2ab8ff', ei: 0.4 }); g.glow.push(r); }
        if (id !== 'qs1') { g.mag = joint(root, 0, 0, 0); part(g.mag, 'cone', '#8a8a7a', 2.4, 6, 2.4, 0, 3, -26).rotation.x = -Math.PI / 2; g.mag.visible = false; }
        break;
      }
      case 'gl2': {
        B(olive, 3, 4, 12, 0, 0, -2, poly); Cz(dark, 1.8, 12, 0, 1, -13); muzzleAt(-19.5);
        g.cyl = joint(root, 0, -1, -6); const dr = part(g.cyl, 'cyl', dark, 4.4, 6, 4.4, 0, 0, 0, m); dr.rotation.x = Math.PI / 2;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(g.cyl, 'cylXc', '#c0a040', 0.8, 0.3, 0.8, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 3.1).rotation.y = Math.PI / 2; }
        grip(3); stock(5, 9, dark); reddot(-2);
        break;
      }
      default: { B(mid, 2.4, 3, 14, 0, 0, -3); Cz(dark, 0.6, 12, 0, 0.6, -15); muzzleAt(-21); grip(2); stock(4, 8); part(g.mag, 'box', dark, 1.8, 5, 3, 0, -3.5, -4, m); }
    }
    // left hand grip point along the barrel; pistols are held in both hands at the grip
    const pistolish = /Pistol|Revolver|Special/.test(cls) && d.slot === 'secondary';
    g.left = pistolish ? new T.Vector3(-1.2, -3, 1.5) : new T.Vector3(-0.5, -1.8, d.slot === 'support' ? -14 : -11);
    g.right = new T.Vector3(1, -3, d.kind === 'rocket' && d.slot === 'support' && /Recoilless|Disposable|Guided|Energy/.test(cls) ? -3 : 2.5);
    g.tube = /Recoilless|Disposable|Guided/.test(cls) || id === 'qs1';
    g.root.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
    return g;
  }

  // point an arm's hand at a target position (in rig space) by aiming the upper arm and bending the elbow
  const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();
  function reach(A, target) {
    const sh = A.sh.position, L1 = 20, L2 = 19.5;
    tmpV.copy(target).sub(sh);
    const dist = Math.min(L1 + L2 - 0.01, Math.max(4, tmpV.length()));
    // elbow bend from the law of cosines
    const cosB = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), bend = Math.PI - Math.acos(U.clamp(cosB, -1, 1));
    const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), a = Math.acos(U.clamp(cosA, -1, 1));
    // aim upper arm at target, then raise by angle a so the elbow sits outside/below
    const yaw = Math.atan2(-tmpV.x, -tmpV.z), pitch = Math.atan2(tmpV.y, Math.hypot(tmpV.x, tmpV.z));
    A.up.rotation.order = 'YXZ';
    A.up.rotation.set(pitch - a, yaw, 0);
    A.fore.rotation.set(bend, 0, 0);
    A.hand.rotation.set(-bend + a - 0.1, 0, 0);
  }

  // ---------------------------------------------------------------- per-frame animation
  VW.render = function (renderer, g, look, dt) {
    const P = g.player, t = g.t;
    if (!scene) VW.init();
    if (DF.Gfx.env && scene.environment !== DF.Gfx.env) { scene.environment = DF.Gfx.env; VW.key.color.set(DF.Gfx.look.sun); VW.hemi.color.set(DF.Gfx.look.skyTop); VW.hemi.groundColor.set(DF.Gfx.look.ground); }
    const inVeh = P.veh;
    cockpit.visible = !!(inVeh && inVeh.vt !== 'buggy' && P.alive);
    rig.visible = P.alive && !inVeh;
    const w = P.weapons[P.cur];
    if (w && w.id !== gunId) {
      // swap the model when the lower animation is done
      if (st.sw <= 0.02 || !gun) {
        if (gun) gunHolder.remove(gun.root);
        gun = buildGun(w.id); gunId = w.id; gunHolder.add(gun.root);
        st.lastMag = w.mag; st.reloadMax = w.d.reload || 1;
        st.swTarget = 1;
      } else st.swTarget = 0;
    } else st.swTarget = 1;
    st.sw += (st.swTarget - st.sw) * Math.min(1, dt * (st.swTarget ? 9 : 14));
    if (Math.abs(st.sw - st.swTarget) < 0.02) st.sw = st.swTarget;
    if (!rig.visible || !gun) {
      if (cockpit.visible) { cockpit.position.set(look.dx * -0.05, -2 + Math.sin(t * 6) * 0.3 * Math.min(1, Math.hypot(inVeh.vx, inVeh.vy) / 60), 0); }
      renderer.clearDepth(); renderer.render(scene, cam); return;
    }
    const d = w.d;
    // inputs to the animator
    const speed = Math.hypot(P.vx, P.vy);
    st.bob += speed * dt * 0.06;
    const sprint = P.sprinting ? 1 : 0;
    st.sprint += (sprint - st.sprint) * Math.min(1, dt * 8);
    const ads = P.aimDown && !P.sprinting && w.reloadT <= 0 ? 1 : 0;
    st.ads += (ads - st.ads) * Math.min(1, dt * 12);
    st.swayX += (U.clamp(-look.dx * 0.02, -2, 2) - st.swayX) * Math.min(1, dt * 8);
    st.swayY += (U.clamp(look.dy * 0.02, -2, 2) - st.swayY) * Math.min(1, dt * 8);
    // detect shots: magazine drop, cooldown reset, heat or charge activity
    const fired = (w.mag < st.lastMag && w.reloadT <= 0) || (d.kind === 'arc' && w.cd > st.lastCd + 0.2) || (d.kind === 'charge' && w.cool > st.lastCd + 1);
    if (fired) {
      const heavy = (d.dmg || 0) > 400 || d.kind === 'rocket' && d.slot === 'support' || d.kind === 'pellet';
      st.recoil = Math.min(1.2, st.recoil + (heavy ? 0.9 : d.slot === 'secondary' ? 0.5 : 0.35));
      st.recoilRot = (Math.random() - 0.5) * 0.06;
      flashSprite.visible = d.kind !== 'arc'; st.flashT = 0.05;
      flashLight.intensity = 3;
      if (d.kind === 'bullet' || d.kind === 'pellet') spawnShell();
      if (gun.cyl && d.id === 'p6') gun.cyl.rotation.z += Math.PI / 3;
      if (gun.cyl && d.id === 'gl2') gun.cyl.rotation.z += Math.PI / 3;
      if (gun.pump) st.pumpT = 0.4;
      if (gun.tube && gun.mag) gun.mag.visible = false;
      DF.Gfx.muzzleWorldLight && DF.Gfx.muzzleWorldLight();
    }
    if ((d.kind === 'beam' && P.firing && !w.over) || (d.kind === 'flame' && P.firing && w.mag > 0)) { st.recoil = Math.min(0.25, st.recoil + dt * 2); st.recoilRot = (Math.random() - 0.5) * 0.015; }
    st.lastMag = w.mag; st.lastCd = d.kind === 'charge' ? w.cool : w.cd;
    st.recoil = Math.max(0, st.recoil - dt * (st.recoil > 0.5 ? 9 : 6));
    if (st.flashT > 0) { st.flashT -= dt; if (st.flashT <= 0) flashSprite.visible = false; }
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 40);
    // reload progress
    if (w.reloadT > 0 && !st.wasReload) { st.reloadMax = w.reloadT; }
    st.wasReload = w.reloadT > 0;
    const rk = w.reloadT > 0 ? 1 - w.reloadT / st.reloadMax : -1;
    // grenade / stim / call-in triggers
    if (st.lastNades >= 0 && P.nades < st.lastNades) st.throwT = 0.55;
    if (st.lastStims >= 0 && P.stims < st.lastStims) st.stimT = 0.8;
    st.lastNades = P.nades; st.lastStims = P.stims;
    if (st.hadReady && !g.ready && g.throws.some(o => o.kind === 'beacon')) st.beaconThrowT = 0.5;
    st.hadReady = !!g.ready;
    st.throwT = Math.max(0, st.throwT - dt); st.stimT = Math.max(0, st.stimT - dt); st.beaconThrowT = Math.max(0, st.beaconThrowT - dt);
    const menu = g.menu || g.codeTask ? 1 : 0;
    st.menuK += (menu - st.menuK) * Math.min(1, dt * 10);
    st.prone += ((P.proneT > 0 || P.diveT > 0 ? 1 : 0) - st.prone) * Math.min(1, dt * 10);

    // ---- gun pose
    const bobA = Math.min(1, speed / 150) * (1 - st.ads * 0.85);
    const bx = Math.sin(st.bob) * 0.7 * bobA, by = -Math.abs(Math.cos(st.bob)) * 0.6 * bobA;
    const idle = Math.sin(t * 1.3) * 0.12 * (1 - st.ads);
    const hip = new T.Vector3(gun.tube ? 6 : 5.5, gun.tube ? -8.5 : -6.2, -14), adsP = new T.Vector3(0, gun.tube ? -6.2 : -2.9, -10);
    if (/Pistol|Revolver/.test(d.cls)) { hip.set(5, -6.5, -12); adsP.set(0, -2.6, -11); }
    const pos = hip.clone().lerp(adsP, st.ads);
    pos.x += bx + st.swayX * 0.6; pos.y += by + idle + st.swayY * 0.5;
    pos.z += st.recoil * (d.slot === 'support' ? 3.2 : 2.2);
    pos.y += st.recoil * 0.4;
    // sprint pose: gun swings across and down
    pos.x -= st.sprint * 2; pos.y -= st.sprint * 3;
    // switching: drop out of view
    pos.y -= (1 - st.sw) * 14;
    // menu, throw, stim lower the gun
    pos.y -= st.menuK * 5 + (st.throwT > 0 ? 3 : 0) + (st.stimT > 0 ? 2 : 0) + (g.ready ? 2.5 : 0);
    pos.y -= st.prone * 1.5;
    gunHolder.position.copy(pos);
    let rx = st.recoil * (d.slot === 'support' ? 0.12 : 0.18) + st.swayY * 0.02, ry = st.swayX * 0.03 - st.sprint * 0.9 + 0.05 * (1 - st.ads), rz = st.recoilRot + bx * 0.02 + st.sprint * 0.5;
    // reload choreography
    let magOff = new T.Vector3(), leftOverride = null, magVis = true;
    if (rk >= 0) {
      const ph = (a, b) => U.clamp((rk - a) / (b - a), 0, 1), ease = x => x * x * (3 - 2 * x);
      if (d.kind === 'beam') { // eject heat sink
        rz += 0.4 * Math.sin(Math.min(1, rk * 2) * Math.PI * 0.5) * (1 - ph(0.8, 1));
        magOff.set(ease(ph(0.1, 0.35)) * 6 - ease(ph(0.55, 0.85)) * 6, ease(ph(0.1, 0.35)) * 2, 0);
        if (rk > 0.15 && rk < 0.6 && Math.random() < 0.3) DF.Gfx.steam && DF.Gfx.steam();
        leftOverride = new T.Vector3(3 + magOff.x, -3, -2);
      } else if (gun.tube) {
        rx += -0.5 * ease(ph(0, 0.2)) * (1 - ease(ph(0.85, 1)));
        pos.y -= 3 * ease(ph(0, 0.2)) * (1 - ease(ph(0.85, 1)));
        gunHolder.position.copy(pos);
        if (gun.mag) { gun.mag.visible = rk > 0.35; gun.mag.position.z = (1 - ease(ph(0.35, 0.8))) * 40; }
        leftOverride = new T.Vector3(-2, -6 + ease(ph(0.2, 0.4)) * 4, 12 - ease(ph(0.35, 0.8)) * 30);
      } else if (d.id === 'p6') {
        rz += 0.9 * ease(ph(0, 0.15)) * (1 - ease(ph(0.85, 1)));
        if (gun.cyl) gun.cyl.position.x = -2.2 * ease(ph(0.1, 0.25)) * (1 - ease(ph(0.75, 0.9)));
        leftOverride = new T.Vector3(-4, -8 + ease(ph(0.3, 0.5)) * 6 - ease(ph(0.6, 0.75)) * 6, -10);
      } else if (gun.pump) { // shell by shell
        rz += 0.5 * ease(ph(0, 0.1)) * (1 - ease(ph(0.9, 1)));
        const cyc = (rk * 6) % 1;
        leftOverride = new T.Vector3(1.5, -6 + Math.sin(cyc * Math.PI) * 3, -4 - Math.sin(cyc * Math.PI) * 2);
        if (rk > 0.88) st.pumpT = 0.3;
      } else {
        rz += 0.45 * ease(ph(0, 0.15)) * (1 - ease(ph(0.85, 1)));
        rx -= 0.15 * ease(ph(0, 0.15)) * (1 - ease(ph(0.85, 1)));
        const drop = ease(ph(0.15, 0.35)), back = ease(ph(0.5, 0.75));
        magOff.set(0, -drop * 18 + back * 18, 0);
        magVis = !(rk > 0.35 && rk < 0.5);
        leftOverride = rk < 0.5 ? new T.Vector3(-1, -6 - drop * 12, -4) : rk < 0.8 ? new T.Vector3(-1, -6 - (1 - back) * 12, -4) : new T.Vector3(2, 1, 0 + Math.sin(ph(0.8, 1) * Math.PI) * 3);
      }
    }
    if (d.kind === 'charge' && w.charge > 0) { rz += (Math.random() - 0.5) * 0.02 * w.charge; }
    if (d.kind === 'rail' && w.charge > d.charge) { rz += (Math.random() - 0.5) * 0.05; }
    gunHolder.rotation.set(rx, ry, rz);
    if (gun.mag && !gun.tube) { gun.mag.position.copy(magOff); gun.mag.visible = magVis; }
    if (gun.tube && gun.mag && rk < 0) gun.mag.visible = w.mag > 0;
    if (gun.pump) { st.pumpT = Math.max(0, (st.pumpT || 0) - dt); gun.pump.position.z = Math.sin((1 - st.pumpT / 0.4) * Math.PI) * 3 * (st.pumpT > 0 ? 1 : 0); }
    if (gun.string) gun.string.position.z = -9 + (w.mag > 0 ? 0 : 3);
    // glow parts: heat, charge, energy
    for (const r of gun.heat) r.material = MD.mat('#ff5a40', { e: '#ff3a20', ei: 0.3 + w.heat * 3 });
    if (gun.glow.length) { const k = d.kind === 'charge' ? (w.cool > 0 ? 0.2 : 0.4 + w.charge / d.charge * 3) : d.kind === 'rail' ? 0.3 + Math.min(1.4, w.charge / d.charge) * 3 : 1 + Math.sin(t * 6) * 0.3; for (const o of gun.glow) { if (o.material.emissive) { o.material = o.material.clone(); o.material.emissiveIntensity = k; } } if (d.id === 'qs1') gun.glow.forEach((o, i) => o.rotation.z = t * (2 + w.charge * 10) * (i % 2 ? 1 : -1)); }
    if (gun.pilot) gun.pilot.scale.setScalar(P.firing && w.mag > 0 ? 2.5 + Math.random() : 0.8);
    // muzzle flash
    rig.updateMatrixWorld(true);
    if (flashSprite.visible) { gun.muzzle.getWorldPosition(flashSprite.position); const s = (d.slot === 'support' ? 9 : d.slot === 'secondary' ? 4 : 6) * 0.42; flashSprite.scale.set(s * (0.8 + Math.random() * 0.5), s * (0.8 + Math.random() * 0.5), 1); flashSprite.material.rotation = Math.random() * 6; flashLight.position.copy(flashSprite.position); }

    // ---- hands
    const toRig = v => gun.root.localToWorld(v.clone()).applyMatrix4(new T.Matrix4().copy(rig.matrixWorld).invert());
    const rTarget = toRig(gun.right);
    let lTarget = leftOverride ? leftOverride.clone().add(pos) : toRig(gun.left);
    leftArm.hand.visible = true; nadeMesh.visible = stimMesh.visible = beaconMesh.visible = false;
    boxMesh.visible = !!P.carrying;
    if (P.carrying && !/secondary/.test(d.slot) && !d.onehand) lTarget = new T.Vector3(-8, -10, -14);
    if (P.carrying) lTarget = new T.Vector3(-8, -9, -13);
    if (st.menuK > 0.02) {
      const k = st.menuK, e = k * k * (3 - 2 * k);
      wrist.position.set(-12 + e * 3, -30 + e * 19, -28); wrist.scale.setScalar(0.62);
      wrist.rotation.set(-0.12, 0.4, 0.1 - e * 0.08);
      lTarget = lTarget.clone().lerp(new T.Vector3(-9, -19, -24), e);
      drawWrist(g);
    }
    if (g.ready) { beaconMesh.visible = true; lTarget = new T.Vector3(-7, -6 + Math.sin(t * 3) * 0.3, -15); VW.beaconLight.material.color.set(Math.floor(t * 8) % 2 ? '#ff5a3a' : '#5ab4ff'); }
    if (st.beaconThrowT > 0) { const k = 1 - st.beaconThrowT / 0.5; lTarget = new T.Vector3(-7 + k * 4, -4 + Math.sin(k * Math.PI) * 6, -15 - k * 10); }
    if (st.throwT > 0) { const k = 1 - st.throwT / 0.55; nadeMesh.visible = k < 0.6; lTarget = k < 0.4 ? new T.Vector3(-10, -6 + k * 5, -6 + k * 10) : new T.Vector3(-8 + (k - 0.4) * 10, -4 + Math.sin((k - 0.4) * 5) * 5, -6 - (k - 0.4) * 30); }
    if (st.stimT > 0) { const k = 1 - st.stimT / 0.8; stimMesh.visible = true; lTarget = k < 0.5 ? new T.Vector3(-6 + k * 6, -9 + k * 4, -12 + k * 6) : new T.Vector3(-3, -7, -9 + Math.sin((k - 0.5) * 6) * 1.5); }
    reach(rightArm, rTarget); reach(leftArm, lTarget);
    // the wrist turns toward the camera when the menu is open
    wrist.visible = st.menuK > 0.05;
    // brass
    for (let i = shells.length - 1; i >= 0; i--) { const s = shells[i]; s.v.y -= 70 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 20; s.life -= dt; if (s.life <= 0) { scene.remove(s.m); shells.splice(i, 1); } }
    renderer.clearDepth();
    renderer.render(scene, cam);
  };

  function spawnShell() {
    if (shells.length > 12) return;
    const m = part(scene, 'cyl', '#c8a040', 0.35, 1.4, 0.35, 0, 0, 0, { m: 0.9, r: 0.3 });
    const p = new T.Vector3(); gun.root.localToWorld(p.set(1.5, 1, -3));
    m.position.copy(p);
    m.scale.multiplyScalar(0.42); shells.push({ m, v: new T.Vector3(13 + Math.random() * 8, 11 + Math.random() * 6, 2), life: 0.6 });
  }

  // wrist computer screen
  function drawWrist(g) {
    const c = wristCtx, A = DF.Render.ARROW;
    c.fillStyle = '#081210'; c.fillRect(0, 0, 256, 192);
    c.strokeStyle = 'rgba(120,255,180,0.12)'; for (let y = 0; y < 192; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    c.fillStyle = '#7fffb0'; c.font = 'bold 18px monospace'; c.textAlign = 'left';
    if (g.codeTask) {
      const tk = g.codeTask, s = tk.seqs[tk.idx];
      c.fillText('UPLINK ' + (tk.idx + 1) + '/' + tk.seqs.length, 10, 26);
      c.font = 'bold 34px monospace';
      for (let i = 0; i < s.length; i++) { c.fillStyle = i < tk.pos ? '#ffd27a' : '#7fffb0'; c.fillText(A[s[i]], 12 + i * 38, 90); }
    } else {
      c.fillText('CALL-IN ' + (g.code ? g.code.split('').map(x => A[x]).join('') : '_'), 10, 26);
      c.font = '15px monospace';
      const ids = Object.keys(g.cs).filter(id => id !== 'nova' || g.M.objectives.some(o => o.type === 'nova' && !o.done));
      ids.slice(0, 7).forEach((id, i) => {
        const cs = g.cs[id], match = !g.code || cs.d.code.startsWith(g.code), ok = DF.Sim.callAvail(id);
        c.fillStyle = !match ? '#1f4a33' : ok ? '#7fffb0' : '#3f7a5a';
        c.fillText(cs.d.name.slice(0, 15), 10, 52 + i * 20);
        c.fillText(cs.d.code.split('').map(x => A[x]).join(''), 150, 52 + i * 20);
      });
    }
    wristTex.needsUpdate = true;
  }
})();
