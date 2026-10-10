// Kestrel — first-person viewmodels: detailed procedural weapons, IK arms with articulated gloved hands,
// keyframed reloads, sway/bob/recoil springs, motion tracker with live screen.
(function () {
  const K = window.K;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const Q = () => new THREE.Quaternion();
  const E = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  const tv = [V(), V(), V(), V(), V(), V(), V()];
  const sg = K.seg, ez = K.ease, bump = K.bump;

  // ---------------------------------------------------------------- materials
  let MT = null;
  function mats(env) {
    if (MT) return MT;
    const S = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMap: env, envMapIntensity: .9 }, o));
    const wood = K.canvas(128), wx = wood.getContext('2d');
    wx.fillStyle = '#4a2c18'; wx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) { wx.strokeStyle = `rgba(${20 + Math.random() * 30},${10 + Math.random() * 10},4,.5)`; wx.lineWidth = 1 + Math.random() * 2; wx.beginPath(); wx.moveTo(0, i * 3.2 + Math.random() * 3); wx.bezierCurveTo(40, i * 3.2 + Math.random() * 8, 80, i * 3.2 - Math.random() * 8, 128, i * 3.2 + Math.random() * 3); wx.stroke(); }
    const knurl = K.canvas(64), kx = knurl.getContext('2d'); kx.fillStyle = '#222'; kx.fillRect(0, 0, 64, 64); kx.strokeStyle = '#0c0c0c'; kx.lineWidth = 2; for (let i = -64; i < 128; i += 6) { kx.beginPath(); kx.moveTo(i, 0); kx.lineTo(i + 64, 64); kx.stroke(); kx.beginPath(); kx.moveTo(i + 64, 0); kx.lineTo(i, 64); kx.stroke(); }
    const kt = new THREE.CanvasTexture(knurl); kt.wrapS = kt.wrapT = THREE.RepeatWrapping; kt.repeat.set(3, 3);
    const glove = K.canvas(64), gx = glove.getContext('2d'); gx.fillStyle = '#3a3428'; gx.fillRect(0, 0, 64, 64); for (let i = 0; i < 400; i++) { gx.fillStyle = `rgba(0,0,0,${Math.random() * .25})`; gx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
    const sleeve = K.canvas(128), sx = sleeve.getContext('2d'); sx.fillStyle = '#4b4a3c'; sx.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 4) { sx.fillStyle = 'rgba(0,0,0,.12)'; sx.fillRect(0, i, 128, 2); } sx.fillStyle = '#9a6a20'; sx.fillRect(0, 100, 128, 10); sx.fillStyle = 'rgba(40,20,10,.5)'; for (let i = 0; i < 12; i++) { sx.beginPath(); sx.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 12, 0, 7); sx.fill(); }
    const tx = c => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    MT = {
      steel: S({ color: 0x2a2d31, metalness: .9, roughness: .32 }),
      blued: S({ color: 0x15181d, metalness: .85, roughness: .25, envMapIntensity: 1.2 }),
      bright: S({ color: 0x9aa0a8, metalness: 1, roughness: .2 }),
      brass: S({ color: 0xb8913f, metalness: 1, roughness: .25 }),
      copper: S({ color: 0xb06a3a, metalness: 1, roughness: .3 }),
      wood: S({ map: tx(wood), metalness: 0, roughness: .55, envMapIntensity: .3 }),
      rubber: S({ map: kt, color: 0x333333, metalness: 0, roughness: .9 }),
      poly: S({ color: 0x2b2c2a, metalness: .1, roughness: .6 }),
      olive: S({ color: 0x4d533c, metalness: .2, roughness: .55 }),
      orange: S({ color: 0xc8611c, metalness: .2, roughness: .5 }),
      red: S({ color: 0x8e1d14, metalness: .5, roughness: .4 }),
      yellow: S({ color: 0xc9a31e, metalness: .3, roughness: .5 }),
      glove: S({ map: tx(glove), metalness: 0, roughness: .85, envMapIntensity: .2 }),
      knuckle: S({ color: 0x26231d, metalness: .1, roughness: .7 }),
      sleeve: S({ map: tx(sleeve), metalness: 0, roughness: .95, envMapIntensity: .1 }),
      glass: S({ color: 0x8aa0aa, metalness: .2, roughness: .05, transparent: true, opacity: .1, depthWrite: false }),
      shell: S({ color: 0x9b1c1a, metalness: .2, roughness: .45 }),
      pilot: new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }),
      flash: new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      led: new THREE.MeshBasicMaterial({ color: 0x55ff88 }), ledR: new THREE.MeshBasicMaterial({ color: 0xff3322 }),
    };
    return MT;
  }
  const G0 = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(.5, .5, 1, 18), cyl8: new THREE.CylinderGeometry(.5, .5, 1, 8), sph: new THREE.SphereGeometry(.5, 16, 12), tor: new THREE.TorusGeometry(.5, .08, 8, 24) };
  function part(parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); parent.add(m); return m; }
  const box = (p, m, x, y, z, w, h, d, rx, ry, rz) => part(p, G0.box, m, x, y, z, w, h, d, rx, ry, rz);
  const cylZ = (p, m, x, y, z, r, len, lo) => part(p, lo ? G0.cyl8 : G0.cyl, m, x, y, z, r * 2, len, r * 2, Math.PI / 2, 0, 0);
  const cylX = (p, m, x, y, z, r, len) => part(p, G0.cyl, m, x, y, z, r * 2, len, r * 2, 0, 0, Math.PI / 2);
  const cylY = (p, m, x, y, z, r, len, lo) => part(p, lo ? G0.cyl8 : G0.cyl, m, x, y, z, r * 2, len, r * 2);
  const node = (p, x = 0, y = 0, z = 0) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; };
  const anchor = (p, x, y, z, rx, ry, rz) => { const o = node(p, x, y, z); o.rotation.set(rx, ry, rz); return o; };
  function flashMesh(p, x, y, z) {
    const g = node(p, x, y, z);
    const star = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * K.TAU, r = i % 2 ? .3 : 1; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const sg2 = new THREE.ShapeGeometry(star);
    const a = new THREE.Mesh(sg2, MT.flash); a.scale.setScalar(.07); g.add(a);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(.05, .26), MT.flash); b.position.z = -.12; b.rotation.set(Math.PI / 2, k * 1.05, 0); g.add(b); }
    g.visible = false; return g;
  }

  // ---------------------------------------------------------------- weapon models
  function buildJack() {
    const g = new THREE.Group();
    // haft with rubber grip, hydraulic ram, forked claw head
    cylY(g, MT.rubber, 0, -.02, 0, .018, .16); for (let k = 0; k < 6; k++) cylY(g, MT.poly, 0, -.09 + k * .028, 0, .02, .006);
    cylY(g, MT.steel, 0, .16, 0, .014, .24); cylY(g, MT.bright, .022, .2, 0, .008, .2); cylY(g, MT.steel, .022, .1, 0, .012, .05); cylY(g, MT.steel, .022, .3, 0, .012, .03);
    box(g, MT.yellow, 0, .34, 0, .05, .06, .04); box(g, MT.steel, 0, .36, .03, .06, .035, .05); box(g, MT.hazard || MT.yellow, 0, .29, 0, .042, .03, .042);
    for (const s of [-1, 1]) { box(g, MT.steel, s * .018, .42, .02, .012, .1, .02, s * .12, 0, 0); box(g, MT.bright, s * .018, .47, .035, .01, .03, .03, .5, 0, 0); }
    box(g, MT.steel, 0, .345, -.03, .035, .025, .06, .3, 0, 0);
    cylX(g, MT.bright, 0, .34, .0, .009, .065);
    g.userData.anchorR = anchor(g, 0, -.02, 0, 0, 0, 0);
    g.userData.anchorL = anchor(g, 0, .12, 0, 0, 0, 0);
    return g;
  }
  function buildRevolver() {
    const g = new THREE.Group(), P = {};
    // frame
    box(g, MT.blued, 0, .005, -.035, .03, .05, .11);
    box(g, MT.blued, 0, .036, -.045, .026, .014, .08);
    box(g, MT.blued, 0, -.02, -.07, .028, .012, .04);
    // barrel with full-length underlug + vent rib
    cylZ(g, MT.blued, 0, .024, -.17, .0105, .16); box(g, MT.blued, 0, .036, -.17, .008, .009, .16);
    for (let k = 0; k < 7; k++) box(g, MT.steel, 0, .0405, -.105 - k * .02, .0085, .002, .008);
    box(g, MT.blued, 0, .008, -.165, .016, .02, .15); cylZ(g, MT.steel, 0, .003, -.248, .004, .01);
    cylZ(g, MT.steel, 0, .024, -.251, .006, .004); // crown
    box(g, MT.red, 0, .045, -.238, .003, .012, .01); box(g, MT.blued, 0, .044, -.238, .005, .01, .016);
    box(g, MT.blued, -.007, .047, -.008, .004, .008, .01); box(g, MT.blued, .007, .047, -.008, .004, .008, .01); box(g, MT.led, 0, .046, -.006, .002, .002, .002);
    // cylinder on a swing-out crane
    P.crane = node(g, -.012, -.004, -.045);
    P.cyl = node(P.crane, .012, .023, 0);
    cylZ(P.cyl, MT.blued, 0, 0, 0, .0215, .046);
    P.rounds = [];
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * K.TAU;
      box(P.cyl, MT.steel, Math.cos(a + .52) * .0205, Math.sin(a + .52) * .0205, 0, .006, .006, .03, 0, 0, a + .52);
      const r = cylZ(P.cyl, MT.brass, Math.cos(a) * .0125, Math.sin(a) * .0125, .022, .0048, .004); P.rounds.push(r);
      cylZ(P.cyl, MT.bright, Math.cos(a) * .0125, Math.sin(a) * .0125, .0242, .0018, .001);
    }
    cylZ(P.cyl, MT.steel, 0, 0, -.026, .005, .01);
    P.ejector = cylZ(P.cyl, MT.steel, 0, 0, -.06, .003, .06);
    // hammer, trigger, guard
    P.hammer = node(g, 0, .028, .016);
    box(P.hammer, MT.blued, 0, .01, .004, .008, .025, .012, -.2, 0, 0); box(P.hammer, MT.steel, 0, .024, .012, .01, .006, .014);
    P.trigger = node(g, 0, -.012, -.022);
    box(P.trigger, MT.bright, 0, -.012, .003, .006, .022, .006, .25, 0, 0);
    const guard = part(g, new THREE.TorusGeometry(.017, .0028, 6, 16, Math.PI * 1.1), MT.blued, 0, -.022, -.025, 1, 1.2, 1, 0, Math.PI / 2, Math.PI * .95);
    // grip: wood panels with checkering and medallion
    const grip = node(g, 0, -.05, .02); grip.rotation.x = .28;
    box(grip, MT.blued, 0, .01, -.004, .02, .08, .03);
    for (const s of [-1, 1]) { box(grip, MT.wood, s * .0115, 0, 0, .006, .085, .036); cylX(grip, MT.brass, s * .0148, .02, 0, .004, .001); }
    box(grip, MT.blued, 0, -.044, .002, .026, .006, .04);
    P.flash = flashMesh(g, 0, .024, -.265);
    g.userData = { parts: P, anchorR: anchor(grip, 0, -.002, 0, 0, 0, 0), anchorL: anchor(grip, -.004, -.026, -.006, 0, 0, 0), muzzle: node(g, 0, .024, -.26), sight: .046 };
    return g;
  }
  function buildShotgun() {
    const g = new THREE.Group(), P = {};
    // receiver with loading port and ejection port
    box(g, MT.blued, 0, .02, -.02, .036, .055, .17); box(g, MT.steel, .0185, .028, -.03, .002, .022, .06); box(g, MT.blued, 0, -.005, -.04, .024, .01, .07);
    box(g, MT.poly, 0, .05, -.02, .01, .006, .14); for (let k = 0; k < 8; k++) box(g, MT.steel, 0, .054, -.08 + k * .016, .012, .002, .008);
    // barrel + magazine tube + barrel clamp
    cylZ(g, MT.blued, 0, .032, -.37, .0115, .55); cylZ(g, MT.steel, 0, .032, -.645, .0125, .012);
    cylZ(g, MT.blued, 0, .006, -.3, .011, .4); cylZ(g, MT.steel, 0, .006, -.502, .012, .012);
    box(g, MT.steel, 0, .019, -.5, .02, .04, .016); box(g, MT.bright, 0, .045, -.64, .004, .006, .006);
    // pump forend (moves)
    P.pump = node(g, 0, .006, -.27);
    cylZ(P.pump, MT.poly, 0, -.002, 0, .021, .15); for (let k = 0; k < 9; k++) cylZ(P.pump, MT.rubber, 0, -.002, -.06 + k * .015, .0225, .005, true);
    box(P.pump, MT.steel, .014, .018, .07, .004, .006, .14); box(P.pump, MT.steel, -.014, .018, .07, .004, .006, .14);
    // trigger group + pistol-grip stock
    box(g, MT.poly, 0, -.018, .03, .026, .02, .07);
    part(g, new THREE.TorusGeometry(.016, .003, 6, 16, Math.PI), MT.poly, 0, -.025, .02, 1, 1.1, 1, 0, Math.PI / 2, Math.PI);
    P.trigger = node(g, 0, -.024, .02); box(P.trigger, MT.bright, 0, -.01, 0, .006, .02, .006, .2, 0, 0);
    const grip = node(g, 0, -.045, .075); grip.rotation.x = .35;
    box(grip, MT.rubber, 0, 0, 0, .03, .085, .04); box(grip, MT.poly, 0, -.045, .004, .034, .008, .046);
    box(g, MT.poly, 0, -.01, .2, .04, .06, .22, .08, 0, 0); box(g, MT.rubber, 0, -.022, .315, .044, .1, .02, .08, 0, 0);
    box(g, MT.steel, .021, .0, .16, .002, .012, .04);
    // shell carrier with spare shells on the side
    for (let k = 0; k < 4; k++) { cylX(g, MT.shell, -.024, .03, -.06 + k * .022, .0095, .02); cylX(g, MT.brass, -.035, .03, -.06 + k * .022, .0098, .004); }
    box(g, MT.poly, -.021, .03, -.027, .004, .028, .1);
    P.flash = flashMesh(g, 0, .032, -.66);
    g.userData = { parts: P, anchorR: anchor(grip, 0, 0, 0, 0, 0, 0), anchorL: anchor(P.pump, 0, -.012, 0, 0, 0, 0), muzzle: node(g, 0, .032, -.65), port: node(g, .0, -.003, -.04), sight: .055 };
    return g;
  }
  function buildFlamer() {
    const g = new THREE.Group(), P = {};
    // fuel tank under the barrel with pressure gauge, hoses and pilot assembly
    cylZ(g, MT.red, 0, -.02, -.12, .042, .26); cylZ(g, MT.steel, 0, -.02, .012, .044, .01); cylZ(g, MT.steel, 0, -.02, -.252, .044, .01);
    for (const z of [-.05, -.19]) cylZ(g, MT.steel, 0, -.02, z, .0435, .012, true);
    box(g, MT.yellow, 0, .022, -.12, .03, .004, .12);
    const gauge = node(g, .045, -.005, -.08); cylX(gauge, MT.steel, 0, 0, 0, .017, .012); cylX(gauge, MT.glass, .007, 0, 0, .015, .002);
    const face = part(gauge, new THREE.CircleGeometry(.014, 20), new THREE.MeshBasicMaterial({ color: 0xe8e0c8 }), .0065, 0, 0, 1, 1, 1, 0, Math.PI / 2, 0);
    P.needle = node(gauge, .0075, 0, 0); box(P.needle, MT.red, 0, .006, 0, .001, .012, .0015);
    box(g, MT.steel, 0, .035, -.08, .03, .03, .2); box(g, MT.poly, 0, .055, -.08, .02, .01, .16);
    cylZ(g, MT.steel, 0, .04, -.27, .012, .22); cylZ(g, MT.blued, 0, .04, -.39, .017, .03); for (let k = 0; k < 6; k++) cylZ(g, MT.copper, 0, .04, -.29 - k * .015, .0135, .006, true);
    cylZ(g, MT.bright, 0, .04, -.408, .011, .01);
    // pilot light
    cylZ(g, MT.steel, 0, .018, -.38, .004, .05); P.pilot = part(g, G0.sph, MT.pilot, 0, .02, -.41, .012, .012, .028);
    const hose = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(.03, -.01, 0), V(.06, .02, -.05), V(.03, .04, -.15), V(.014, .04, -.2)]), 20, .006, 6);
    part(g, hose, MT.rubber, 0, 0, 0, 1, 1, 1);
    box(g, MT.poly, 0, -.01, .05, .026, .02, .06);
    const grip = node(g, 0, -.04, .07); grip.rotation.x = .3; box(grip, MT.rubber, 0, 0, 0, .028, .08, .036);
    P.trigger = node(g, 0, -.02, .04); box(P.trigger, MT.bright, 0, -.01, 0, .006, .02, .006, .2, 0, 0);
    const fg = node(g, 0, -.07, -.2); box(fg, MT.rubber, 0, 0, 0, .026, .07, .03);
    g.userData = { parts: P, anchorR: anchor(grip, 0, 0, 0, 0, 0, 0), anchorL: anchor(fg, 0, 0, 0, 0, 0, 0), muzzle: node(g, 0, .04, -.42), sight: .07 };
    return g;
  }
  function buildPulse() {
    const g = new THREE.Group(), P = {};
    // boxy carbine: upper receiver, shroud, carry handle, ammo counter
    box(g, MT.olive, 0, .03, -.06, .045, .06, .3); box(g, MT.olive, 0, .0, -.28, .05, .06, .16); box(g, MT.steel, 0, .0, -.37, .042, .05, .02);
    for (let k = 0; k < 5; k++) box(g, MT.poly, .0255, .0, -.22 - k * .025, .001, .03, .012);
    for (let k = 0; k < 5; k++) box(g, MT.poly, -.0255, .0, -.22 - k * .025, .001, .03, .012);
    cylZ(g, MT.blued, 0, .015, -.42, .011, .1); cylZ(g, MT.steel, 0, .015, -.475, .014, .02);
    box(g, MT.olive, 0, .075, -.06, .016, .012, .18); box(g, MT.olive, 0, .066, .015, .016, .03, .016); box(g, MT.olive, 0, .066, -.135, .016, .03, .016);
    box(g, MT.steel, 0, .085, -.12, .004, .01, .004);
    // ammo counter screen
    const cnv = K.canvas(64, 32); const ct = new THREE.CanvasTexture(cnv);
    P.counter = { cnv, ctx: cnv.getContext('2d'), tex: ct, last: -1 };
    box(g, MT.poly, 0, .066, -.04, .03, .02, .03);
    part(g, new THREE.PlaneGeometry(.026, .013), new THREE.MeshBasicMaterial({ map: ct }), 0, .0662, -.0245, 1, 1, 1, -.2, 0, 0).rotation.set(0, 0, 0);
    // magazine (removable)
    P.mag = node(g, 0, -.02, -.07);
    box(P.mag, MT.poly, 0, -.05, 0, .028, .1, .04, -.12, 0, 0); box(P.mag, MT.steel, 0, -.1, -.006, .03, .01, .044, -.12, 0, 0);
    P.magHome = P.mag.position.clone();
    P.bolt = node(g, .024, .045, -.02); box(P.bolt, MT.bright, 0, 0, 0, .008, .008, .02);
    const grip = node(g, 0, -.04, .05); grip.rotation.x = .3; box(grip, MT.rubber, 0, 0, 0, .028, .08, .035);
    P.trigger = node(g, 0, -.012, .02); box(P.trigger, MT.bright, 0, -.01, 0, .006, .02, .006, .2, 0, 0);
    box(g, MT.poly, 0, .01, .17, .035, .05, .14); box(g, MT.rubber, 0, .005, .245, .04, .07, .015);
    const fg = node(g, 0, -.04, -.28); box(fg, MT.poly, 0, 0, 0, .025, .055, .03);
    P.flash = flashMesh(g, 0, .015, -.49);
    g.userData = { parts: P, anchorR: anchor(grip, 0, 0, 0, 0, 0, 0), anchorL: anchor(fg, 0, 0, 0, 0, 0, 0), muzzle: node(g, 0, .015, -.48), sight: .088 };
    return g;
  }
  function buildTracker() {
    const g = new THREE.Group(), P = {};
    // chunky retro motion tracker: CRT screen, handle, antenna, buttons
    box(g, MT.poly, 0, .0, 0, .11, .085, .05); box(g, MT.olive, 0, .0, .028, .1, .075, .01);
    box(g, MT.poly, 0, -.07, .005, .032, .07, .035, .25, 0, 0); for (let k = 0; k < 4; k++) box(g, MT.rubber, 0, -.05 - k * .015, .025, .034, .004, .036, .25, 0, 0);
    cylY(g, MT.steel, .045, .065, -.01, .004, .05); part(g, G0.sph, MT.ledR, .045, .092, -.01, .008, .008, .008);
    for (let k = 0; k < 3; k++) box(g, k === 0 ? MT.led : MT.steel, -.04 + k * .012, -.035, .029, .007, .005, .004);
    const cnv = K.canvas(256); const t = new THREE.CanvasTexture(cnv);
    P.screen = { cnv, ctx: cnv.getContext('2d'), tex: t };
    part(g, new THREE.PlaneGeometry(.082, .062), new THREE.MeshBasicMaterial({ map: t }), 0, .006, .0335, 1, 1, 1);
    part(g, new THREE.PlaneGeometry(.086, .066), MT.glass, 0, .006, .035, 1, 1, 1);
    g.userData = { parts: P, anchorL: anchor(g, 0, -.07, .005, .25, 0, 0) };
    return g;
  }
  function buildSpeedloader() { const g = new THREE.Group(); cylZ(g, MT.blued, 0, 0, 0, .02, .014); cylZ(g, MT.steel, 0, 0, .012, .008, .012); for (let k = 0; k < 6; k++) { const a = k / 6 * K.TAU; cylZ(g, MT.brass, Math.cos(a) * .0125, Math.sin(a) * .0125, -.018, .0048, .03); } return g; }
  function buildShell() { const g = new THREE.Group(); cylX(g, MT.shell, 0, 0, 0, .0095, .055); cylX(g, MT.brass, .03, 0, 0, .0098, .012); return g; }
  function buildMag() { const g = new THREE.Group(); box(g, MT.poly, 0, -.05, 0, .028, .1, .04, -.12, 0, 0); box(g, MT.steel, 0, -.1, -.006, .03, .01, .044, -.12, 0, 0); return g; }
  function buildThrowable(kind) {
    const g = new THREE.Group();
    if (kind === 'flare') { cylY(g, MT.red, 0, 0, 0, .014, .14); cylY(g, MT.poly, 0, .075, 0, .015, .02); }
    else if (kind === 'noise') { box(g, MT.poly, 0, 0, 0, .05, .035, .025); box(g, MT.led, .015, .019, 0, .006, .004, .006); cylY(g, MT.steel, -.015, .03, 0, .002, .03); }
    else { cylY(g, MT.steel, 0, 0, 0, .02, .1); cylY(g, MT.bright, 0, .055, 0, .022, .01); cylY(g, MT.bright, 0, -.055, 0, .022, .01); box(g, MT.red, 0, 0, .021, .01, .04, .004); }
    return g;
  }
  K.buildThrowable = (k, env) => { mats(env); return buildThrowable(k); };

  // ---------------------------------------------------------------- hands
  // Hand frame: origin = centre of the held grip; grip axis = local Y; fingers wrap from the palm (+X side)
  // around the front (-Z). Back of hand faces +X. Wrist sits behind/right of the grip.
  function buildHand(side) {
    const h = new THREE.Group(); h.scale.x = side;
    const palm = part(h, G0.box, MT.glove, .028, -.004, .012, .018, .085, .075, 0, 0, .05);
    part(h, G0.sph, MT.glove, .03, -.03, .04, .03, .05, .06);
    part(h, G0.box, MT.knuckle, .036, .01, -.01, .006, .06, .03); // padded back
    h.userData.fingers = [];
    for (let f = 0; f < 4; f++) {
      const y = .028 - f * .02, len = [.024, .026, .025, .02][f];
      const base = node(h, .022, y, -.025); base.rotation.set(0, Math.PI, 0); // point toward -X
      const segs = [];
      let p = base;
      for (let s = 0; s < 3; s++) {
        const j = node(p, s ? len * (1 - s * .18) : 0, 0, 0);
        const seg = part(j, G0.cyl8, MT.glove, len * (1 - s * .18) / 2, 0, 0, .0105 - s * .0012, len * (1 - s * .18), .0105 - s * .0012, 0, 0, Math.PI / 2);
        if (s === 0) part(j, G0.sph, MT.knuckle, 0, 0, 0, .013, .013, .013);
        segs.push(j); p = j;
      }
      h.userData.fingers.push(segs);
    }
    // thumb
    const tb = node(h, .02, .03, .015); tb.rotation.set(.4, Math.PI * .8, -.6);
    const t1 = node(tb, 0, 0, 0); part(t1, G0.cyl8, MT.glove, .014, 0, 0, .013, .028, .013, 0, 0, Math.PI / 2);
    const t2 = node(t1, .028, 0, 0); part(t2, G0.cyl8, MT.glove, .011, 0, 0, .011, .022, .011, 0, 0, Math.PI / 2);
    h.userData.thumb = [tb, t1, t2];
    h.userData.wrist = V(.05, -.03, .055);
    h.userData.curl = 1;
    return h;
  }
  function poseHand(h, curl, spread = 0, thumb = 1) {
    h.userData.fingers.forEach((segs, f) => {
      segs[0].rotation.set(0, curl * 1.05 + (f - 1.5) * spread * .1, (f - 1.5) * spread * .15);
      segs[1].rotation.set(0, curl * 1.25, 0); segs[2].rotation.set(0, curl * .9, 0);
    });
    h.userData.thumb[1].rotation.set(0, thumb * .5, 0); h.userData.thumb[2].rotation.set(0, thumb * .6, 0);
  }

  // ---------------------------------------------------------------- weapon definitions
  const DEFS = {
    jack: { name: 'Maintenance Jack', melee: true, dmg: 48, rate: .75, hip: [.27, -.36, -.44], hipR: [-.3, .2, .38], noise: 4 },
    revolver: { name: '.357 Revolver', ammo: 'rounds', mag: 6, dmg: 64, rate: .42, spread: .012, ads: [0, -.046, -.26], hip: [.12, -.115, -.29], hipR: [0, .06, 0], recoil: [.045, .2], noise: 24, sound: 'revolver', reload: 2.7, lq: [0, 0, 0] },
    shotgun: { name: 'Pump Shotgun', ammo: 'shells', mag: 4, dmg: 17, pellets: 9, rate: .85, spread: .07, ads: [0, -.058, -.22], hip: [.12, -.125, -.24], hipR: [0, .05, 0], recoil: [.07, .28], noise: 30, sound: 'shotgun', reloadOne: .62, lq: [-Math.PI / 2, .9] },
    flamer: { name: 'Incinerator', ammo: 'fuel', mag: 100, flame: true, dmg: 40, hip: [.13, -.14, -.28], hipR: [0, .05, 0], ads: [.05, -.11, -.27], noise: 14, lq: [-Math.PI / 2, .9] },
    pulse: { name: 'Pulse Carbine', ammo: 'cells', mag: 32, dmg: 23, rate: .085, spread: .03, auto: true, ads: [0, -.088, -.2], hip: [.12, -.13, -.25], hipR: [0, .05, 0], recoil: [.016, .05], noise: 26, sound: 'pulse', reload: 2.3, lq: [-Math.PI / 2, .9] },
  };
  K.WEAPONS = DEFS;

  class ViewModel {
    constructor(G) {
      this.G = G; mats(G.envMap);
      this.scene = new THREE.Scene();
      this.cam = new THREE.PerspectiveCamera(52, 1, .01, 5);
      this.hemi = new THREE.HemisphereLight(0xb8c4d0, 0x302820, .3); this.scene.add(this.hemi);
      this.key = new THREE.DirectionalLight(0xffe6c8, .4); this.key.position.set(.5, 1, .3); this.scene.add(this.key);
      this.spot = new THREE.SpotLight(0xfff2dd, 0, 3, .7, .5, 1); this.spot.position.set(.15, .05, .2); this.spot.target.position.set(0, -.2, -1); this.scene.add(this.spot); this.scene.add(this.spot.target);
      this.muzzleLight = new THREE.PointLight(0xffaa55, 0, 2, 2); this.scene.add(this.muzzleLight);
      this.pilotLight = new THREE.PointLight(0x5599ff, 0, .6, 2); this.scene.add(this.pilotLight);
      this.root = new THREE.Group(); this.scene.add(this.root);
      this.models = { jack: buildJack(), revolver: buildRevolver(), shotgun: buildShotgun(), flamer: buildFlamer(), pulse: buildPulse() };
      for (const k in this.models) { this.models[k].visible = false; this.root.add(this.models[k]); }
      this.tracker = buildTracker(); this.tracker.visible = false; this.scene.add(this.tracker);
      this.loader = buildSpeedloader(); this.shell = buildShell(); this.spareMag = buildMag();
      this.throwables = { flare: buildThrowable('flare'), noise: buildThrowable('noise'), bomb: buildThrowable('bomb') };
      this.handR = buildHand(1); this.handL = buildHand(-1); this.scene.add(this.handR); this.scene.add(this.handL);
      for (const o of [this.loader, this.shell, this.spareMag, ...Object.values(this.throwables)]) { o.visible = false; this.scene.add(o); }
      // arms (sleeve + cuff)
      const seg = (len, r0, r1, m) => { const s = new THREE.Mesh(K.segGeo(len, r0, r1, 12), m); this.scene.add(s); return s; };
      this.arms = { R: [seg(.34, .05, .045, MT.sleeve), seg(.3, .043, .036, MT.sleeve)], L: [seg(.34, .05, .045, MT.sleeve), seg(.3, .043, .036, MT.sleeve)] };
      this.cuffs = { R: seg(.035, .038, .036, MT.knuckle), L: seg(.035, .038, .036, MT.knuckle) };
      this.watch = new THREE.Group(); box(this.watch, MT.poly, 0, 0, 0, .03, .012, .034); part(this.watch, new THREE.PlaneGeometry(.022, .022), MT.led, 0, .0065, 0, 1, 1, 1, -Math.PI / 2, 0, 0); this.scene.add(this.watch);
      this.cur = 'jack'; this.next = null; this.state = 'draw'; this.t = 0; this.fireT = 0; this.cool = 0;
      this.sway = V(); this.swayV = V(); this.recoil = { p: 0, v: 0, r: 0, rv: 0 }; this.bobT = 0; this.adsA = 0; this.sprintA = 0; this.trackA = 0; this.lowA = 0;
      this.flame = false; this.inspectT = -1;
      this.anchorPoses = { pocketL: { p: V(-.22, -.42, -.12), q: E(-.6, .4, .3) }, pocketR: { p: V(.25, -.45, -.1), q: E(-.4, -.3, -.2) } };
      this.select('jack', true);
    }
    get def() { return DEFS[this.cur]; }
    select(w, instant) {
      if (w === this.cur && !instant) return;
      if (instant) { this.cur = w; for (const k in this.models) this.models[k].visible = k === w; this.state = 'draw'; this.t = 0; return; }
      if (this.state === 'reload' || this.state === 'reloadOne') this.cancelReload = true;
      this.next = w; this.state = 'holster'; this.t = 0;
    }
    inspect() { if (this.state === 'idle') { this.state = 'inspect'; this.t = 0; } }
    trigger(down, pressed) {
      const G = this.G, d = this.def;
      if (this.state === 'reloadOne' && pressed && G.inv.mag[this.cur] > 0) { this.stopOne = true; return; }
      if (this.state !== 'idle' || G.player.locker || this.sprintA > .5) { if (this.cur === 'flamer') this.setFlame(false); return; }
      if (this.trackA > .5 && !['revolver', 'jack'].includes(this.cur)) return;
      if (d.flame) { this.setFlame(down && G.inv.mag.flamer > 0); return; }
      if (this.cool > 0) return;
      if (!(d.auto ? down : pressed)) return;
      if (d.melee) { this.state = 'melee'; this.t = 0; this.meleeHit = false; this.meleeSide = !this.meleeSide; G.audio.gun('melee'); return; }
      if (G.inv.mag[this.cur] <= 0) { if (pressed) { G.audio.click(); if (G.ammo(d.ammo) > 0) this.reload(); } return; }
      G.inv.mag[this.cur]--; this.cool = d.rate; this.fireT = 0;
      const ud = this.models[this.cur].userData, P = ud.parts;
      if (P && P.flash) { P.flash.visible = true; P.flash.rotation.z = Math.random() * 6; P.flash.scale.setScalar(.8 + Math.random() * .5); this.flashT = .05; }
      this.recoil.v += d.recoil[0] * 30 * (this.adsA > .5 ? .7 : 1); this.recoil.rv += d.recoil[1] * 30 * (this.adsA > .5 ? .7 : 1);
      if (this.cur === 'revolver') { P.cyl.rotation.z -= K.TAU / 6; P.rounds[(G.inv.mag.revolver) % 6].material = MT.steel; }
      G.audio.gun(d.sound);
      G.fireWeapon(this.cur, d, this.adsA);
      if (this.cur === 'shotgun') { this.state = 'pump'; this.t = 0; }
      if (this.cur === 'pulse') this.G.fx.spark.spawn(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); // keep pools warm
    }
    setFlame(on) { if (on !== this.flame) { this.flame = on; this.G.audio.flame(on); } }
    reload() {
      const G = this.G, d = this.def; if (!d.ammo || this.state !== 'idle') return;
      if (G.inv.mag[this.cur] >= d.mag || G.ammo(d.ammo) <= 0) return;
      this.setFlame(false);
      if (this.cur === 'shotgun') { this.state = 'reloadOne'; this.t = 0; this.stopOne = false; this.inserted = false; }
      else { this.state = 'reload'; this.t = 0; this.done = false; this.cancelReload = false; this.sfx = {}; }
    }
    once(key, t, at, fn) { if (t >= at && !this.sfx[key]) { this.sfx[key] = 1; fn(); } }

    // returns {pos, rot, L: target, R curl ...}
    update(dt, inp) {
      const G = this.G, P = G.player; let d = this.def, M = this.models[this.cur], ud = M.userData, parts = ud.parts || {};
      this.t += dt; this.cool = Math.max(0, this.cool - dt); this.fireT += dt;
      if (this.flashT !== undefined) { this.flashT -= dt; if (this.flashT <= 0 && parts.flash) parts.flash.visible = false; }
      // state machine
      let pos = V(...d.hip), rot = V(...(d.hipR || [0, 0, 0])), L = null, curlR = 1, curlL = 1, held = null, heldPose = null, lHandOverride = null;
      const want = this.def.ads && inp.ads && this.state !== 'reload' && this.state !== 'reloadOne' && this.sprintA < .3 && this.trackA < .3 && !P.locker;
      this.adsA = K.damp(this.adsA, want ? 1 : 0, 12, dt);
      this.sprintA = K.damp(this.sprintA, P.sprinting && P.moving ? 1 : 0, 8, dt);
      this.trackA = K.damp(this.trackA, inp.tracker && G.inv.tracker && !P.locker ? 1 : 0, 8, dt);
      this.lowA = K.damp(this.lowA, P.locker ? 1 : 0, 6, dt);
      if (d.ads) pos.lerp(V(...d.ads), ez.inOut(this.adsA));
      const s = this.state, t = this.t;
      if (s === 'draw') { const k = 1 - ez.out(sg(t, 0, .45)); pos.y -= k * .25; rot.x -= k * .9; rot.z += k * .4; if (t > .45) { this.state = 'idle'; this.t = 0; } }
      else if (s === 'holster') { const k = ez.in(sg(t, 0, .3)); pos.y -= k * .25; rot.x -= k * .9; rot.z += k * .4; this.setFlame(false); if (t > .3) { this.select(this.next, true); } }
      else if (s === 'melee') {
        // wind up, swing across, recover
        const side = this.meleeSide ? 1 : -1;
        const w = ez.inOut(sg(t, 0, .18)), sw = ez.in(sg(t, .18, .32)), rc = ez.inOut(sg(t, .4, .75));
        rot.z += (w * .9 * side - sw * 1.9 * side) * (1 - rc); rot.x += (w * .5 - sw * 1.2) * (1 - rc); rot.y += (w * .4 * side - sw * .9 * side) * (1 - rc);
        pos.x += (w * .1 * side - sw * .28 * side) * (1 - rc); pos.y += (w * .12 - sw * .05) * (1 - rc); pos.z += (sw * -.15) * (1 - rc);
        if (t > .27 && !this.meleeHit) { this.meleeHit = true; G.melee(d.dmg); }
        if (t > .75) { this.state = 'idle'; this.t = 0; }
      }
      else if (s === 'pump') {
        const k = bump(t, .12, .3, .38, .58);
        parts.pump.position.z = -.27 + k * .075;
        rot.x += k * .06; rot.z -= k * .08; pos.y -= k * .01;
        if (t > .25 && !this.ejected) { this.ejected = true; G.audio.mech('pump'); G.ejectShell(M, 'shell'); }
        if (t > .6) { this.state = 'idle'; this.t = 0; this.ejected = false; parts.pump.position.z = -.27; }
      }
      else if (s === 'inspect') {
        const k = bump(t, 0, .5, 2.2, 2.7);
        rot.y += k * .9; rot.z += k * .5 + Math.sin(t * 1.5) * .05 * k; rot.x += k * .25; pos.x -= k * .08; pos.y += k * .04; pos.z += k * .05;
        if (t > 2.7) { this.state = 'idle'; this.t = 0; }
      }
      else if (s === 'reload') { const r = this.animReload(t, pos, rot, M, parts); L = r.L; curlL = r.curlL ?? curlL; held = r.held; heldPose = r.heldPose; }
      else if (s === 'reloadOne') {
        // shell-by-shell: tilt, fetch shell, push into the port, repeat
        const cyc = .62, tilt = ez.inOut(sg(t, 0, .25));
        rot.z += tilt * .55; rot.x += tilt * .1; pos.x -= tilt * .03; pos.y += tilt * .02;
        if (t > .25) {
          const lt = (t - .25) % cyc, n = Math.floor((t - .25) / cyc);
          if (n !== this.lastN) { this.lastN = n; this.inserted = false; }
          const fetch = ez.inOut(sg(lt, 0, .25)), push = ez.inOut(sg(lt, .3, .48)), back = ez.inOut(sg(lt, .5, .62));
          const port = this.toVm(ud.port, V(0, -.03, .02));
          const pocket = this.anchorPoses.pocketL.p;
          const p = V().lerpVectors(pocket, port, fetch * (1 - back));
          p.y += push * .025; p.z += -push * .01;
          L = { p, q: E(-.2 + fetch * .1, .4, Math.PI / 2 - .2), curl: .55 };
          held = this.shell; heldPose = 'pinch';
          if (lt > .45 && !this.inserted) {
            this.inserted = true; G.audio.mech('insert');
            const ok = G.inv.mag.shotgun < d.mag && G.ammo('shells') > 0;
            if (ok) { G.inv.mag.shotgun++; G.useAmmo('shells', 1); }
            if (!ok || this.stopOne || G.inv.mag.shotgun >= d.mag || G.ammo('shells') <= 0 || this.cancelReload) { this.state = 'pumpEnd'; this.t = 0; }
          }
          if (lt > .45) held = null;
        }
      }
      else if (s === 'pumpEnd') {
        const back = 1 - ez.inOut(sg(t, 0, .3)); rot.z += back * .55; rot.x += back * .1;
        const k = bump(t, .25, .38, .45, .6); parts.pump.position.z = -.27 + k * .075;
        if (t > .32 && !this.racked) { this.racked = true; G.audio.mech('pump'); }
        if (t > .6) { this.state = 'idle'; this.t = 0; this.racked = false; this.cancelReload = false; }
      }
      // weapon may have switched during the state machine (holster -> draw)
      d = this.def; M = this.models[this.cur]; ud = M.userData; parts = ud.parts || {};
      // procedural layers: sprint, tracker lowering, bob, sway, breathing, recoil
      const sp = this.sprintA, lowW = !['revolver', 'jack'].includes(this.cur) ? this.trackA : this.trackA * .3;
      pos.x += sp * -.05; pos.y += sp * -.04; rot.x += sp * -.35; rot.y += sp * .55; rot.z += sp * .2;
      pos.y -= lowW * .18; rot.x -= lowW * .6; pos.x += lowW * .05;
      pos.y -= this.lowA * .4;
      const mv = P.moving ? Math.min(1, P.speed / 2.5) : 0;
      this.bobT += dt * (P.sprinting ? 11 : P.crouch ? 6 : 8.5) * (mv > .05 ? 1 : 0);
      const bobA = mv * (1 - this.adsA * .85) * (P.sprinting ? 1.8 : 1);
      pos.x += Math.sin(this.bobT) * .012 * bobA; pos.y += -Math.abs(Math.cos(this.bobT)) * .014 * bobA; rot.z += Math.sin(this.bobT) * .02 * bobA;
      const br = Math.sin(G.time * 1.6) * (1 - this.adsA * .7);
      pos.y += br * .003; rot.x += br * .006;
      // mouse sway spring
      this.swayV.x += (-inp.dx * .0006 - this.sway.x) * 70 * dt; this.swayV.y += (inp.dy * .0006 - this.sway.y) * 70 * dt;
      this.swayV.multiplyScalar(Math.exp(-11 * dt)); this.sway.addScaledVector(this.swayV, dt * 10);
      this.sway.x = K.clamp(this.sway.x, -.05, .05); this.sway.y = K.clamp(this.sway.y, -.05, .05);
      const sw = 1 - this.adsA * .7;
      pos.x += this.sway.x * .5 * sw; pos.y += this.sway.y * .5 * sw; rot.y += this.sway.x * 2 * sw; rot.x += this.sway.y * 2 * sw; rot.z += this.sway.x * 1.5 * sw;
      if (P.crouch) { rot.z += .04 * (1 - this.adsA); pos.y -= .01; }
      // recoil spring
      const R = this.recoil;
      R.v += (-R.p * 160 - R.v * 18) * dt; R.p += R.v * dt; R.rv += (-R.r * 120 - R.rv * 14) * dt; R.r += R.rv * dt;
      pos.z += R.p * .06; rot.x += R.r * .5; pos.y += R.r * .01;
      // flame
      if (this.cur === 'flamer') {
        const fuel = G.inv.mag.flamer; if (this.flame && fuel <= 0) this.setFlame(false);
        parts.needle.rotation.x = -(fuel / 100) * 4 + 2;
        parts.pilot.scale.set(.012, .012, .025 + Math.random() * .01 + (this.flame ? .02 : 0));
        if (this.flame) { pos.x += (Math.random() - .5) * .003; pos.y += (Math.random() - .5) * .003; rot.x += .02; G.fireFlame(dt); }
      }
      if (this.cur === 'pulse') this.drawCounter(parts.counter, G.inv.mag.pulse);
      if (this.cur === 'revolver' && this.state !== 'reload') { parts.crane.rotation.z = 0; parts.ejector.position.z = -.06; }
      // apply to weapon root
      M.position.copy(pos); M.rotation.set(rot.x, rot.y, rot.z);
      this.root.updateMatrixWorld(true);
      // tracker in the left hand
      if (this.trackA > .01) {
        const tk = this.tracker; tk.visible = true;
        const k = ez.out(this.trackA);
        tk.position.set(-.075 + (1 - k) * -.1, -.068 - (1 - k) * .3 + Math.sin(this.bobT) * .006 * bobA, -.27);
        tk.rotation.set(.12 - (1 - k) * .8 + this.sway.y * 2, .22 + this.sway.x * 2, .04);
        tk.updateMatrixWorld(true);
        G.drawTracker(tk.userData.parts.screen);
        if (!L) L = this.anchorOf(tk.userData.anchorL, .95);
      } else this.tracker.visible = false;
      // hands
      const twoHanded = this.cur !== 'jack';
      const R0 = this.anchorOf(ud.anchorR, 1);
      let Lt = L || (twoHanded ? this.anchorOf(ud.anchorL, this.cur === 'revolver' ? .8 : .9) : null);
      
      if (this.cur === 'jack' && !L) Lt = { p: V(-.24, -.42, -.25), q: E(-.4, .3, .2), curl: .5, rest: true };
      if (this.lowA > .5) Lt = null;
      this.placeHand(this.handR, R0, 'R', 1);
      if (Lt) { this.handL.visible = true; this.placeHand(this.handL, Lt, 'L', Lt.curl ?? curlL); } else { this.handL.visible = false; for (const m of this.arms.L) m.visible = false; this.cuffs.L.visible = false; }
      // trigger finger
      const tf = this.handR.userData.fingers[0];
      const pull = this.fireT < .08 ? 1 : 0; tf[0].rotation.y = .55 + pull * .35; tf[1].rotation.y = .7 + pull * .3;
      if (ud.parts && ud.parts.trigger) ud.parts.trigger.rotation.x = -pull * .3;
      if (this.cur === 'revolver') parts.hammer.rotation.x = this.fireT < .06 ? 0 : -Math.min(1, this.cool * 3) * .6;
      // held items
      for (const o of [this.loader, this.shell, this.spareMag]) o.visible = false;
      if (held && this.handL.visible) {
        held.visible = true; const hp = V(), hq = Q();
        this.handL.updateMatrixWorld(true); this.handL.getWorldPosition(hp); this.handL.getWorldQuaternion(hq);
        held.position.copy(hp).add(V(-.0, .0, -.03).applyQuaternion(hq)); held.quaternion.copy(hq);
        if (heldPose === 'loader') held.quaternion.multiply(E(0, 0, 0)), held.position.add(V(0, .03, -.01).applyQuaternion(hq));
      }
      // muzzle light
      this.muzzleLight.intensity = this.flashT > 0 ? 3 : 0; if (ud.muzzle) ud.muzzle.getWorldPosition(this.muzzleLight.position);
      this.pilotLight.intensity = this.cur === 'flamer' ? .4 + Math.random() * .2 + (this.flame ? 2 : 0) : 0; if (this.cur === 'flamer') parts.pilot.getWorldPosition(this.pilotLight.position);
      // lighting from the world
      const lum = G.playerLightRGB();
      this.hemi.color.setRGB(lum[0] * 3 + .03, lum[1] * 3 + .03, lum[2] * 3 + .035); this.hemi.groundColor.setRGB(lum[0] * 1.2, lum[1] * 1.2, lum[2] * 1.2);
      this.hemi.intensity = 1; this.key.intensity = Math.min(1.2, (lum[0] + lum[1] + lum[2]) * 2.5);
      this.spot.intensity = P.flashOn ? 1.6 : 0;
      return pos;
    }
    supportQ(d) { // roll around the barrel axis, then lay the grip axis along the barrel
      const lq = d.lq || [0, 0]; if (!lq[0]) return Q();
      return new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), lq[1]).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), lq[0]));
    }
    toVm(obj, off) { const v = off ? off.clone() : V(); obj.updateMatrixWorld(true); return obj.localToWorld(v); }
    anchorOf(a, curl) { a.updateMatrixWorld(true); const p = V(), q = Q(); a.getWorldPosition(p); a.getWorldQuaternion(q); return { p, q, curl }; }
    placeHand(h, tgt, side, curl) {
      h.position.copy(tgt.p); h.quaternion.copy(tgt.q);
      if (side === 'L' && !tgt.rest && this.state !== 'reload' && this.state !== 'reloadOne' && this.trackA < .3) {
        // support hand under/around the foregrip: rotate grip axis to run along the barrel
        h.quaternion.multiply(this.supportQ(this.def));
      }
      poseHand(h, curl, side === 'L' ? .3 : 0, curl);
      h.updateMatrixWorld(true);
      const wrist = h.localToWorld(h.userData.wrist.clone());
      const sh = side === 'R' ? V(.2, -.34, .16) : V(-.2, -.34, .16);
      const el = V(); K.ik2(sh, wrist, .34, .3, side === 'R' ? V(.8, -1, .2) : V(-.8, -1, .2), el, wrist);
      const [ua, fa] = this.arms[side];
      K.placeSeg(ua, sh, el, V(0, 1, 0)); K.placeSeg(fa, el, wrist, V(0, 1, 0)); ua.visible = fa.visible = true;
      const cuff = this.cuffs[side]; cuff.visible = true; const dir = V().subVectors(wrist, el).normalize();
      K.placeSeg(cuff, V().copy(wrist).addScaledVector(dir, -.05), V().copy(wrist).addScaledVector(dir, -.015), V(0, 1, 0));
      if (side === 'L') { this.watch.visible = true; this.watch.position.copy(wrist).addScaledVector(dir, -.07); this.watch.quaternion.copy(fa.quaternion); this.watch.translateX(.035); this.watch.rotateZ(-Math.PI / 2); }
    }
    animReload(t, pos, rot, M, P) {
      const G = this.G, d = this.def, cur = this.cur, out = {};
      const pocket = this.anchorPoses.pocketL;
      const fin = () => { if (!this.done) { this.done = true; const need = d.mag - G.inv.mag[cur], got = G.useAmmo(d.ammo, need); G.inv.mag[cur] += got; if (cur === 'revolver') P.rounds.forEach((r, i) => r.material = i < G.inv.mag.revolver ? MT.brass : MT.steel); } };
      if (cur === 'revolver') {
        // 0-.35 tilt left; .3-.6 swing cylinder out; .6-.9 eject; .9-1.7 speedloader in; 1.8-2.1 close + flick; ->2.7
        const tilt = bump(t, 0, .35, 2.2, 2.6);
        rot.z += tilt * .9; rot.y += tilt * .2; rot.x += tilt * .25 + bump(t, .6, .75, .8, 1.0) * .9; pos.x -= tilt * .06; pos.y += tilt * .03;
        P.crane.rotation.z = ez.back(sg(t, .3, .55)) * 1.25 * (1 - ez.inOut(sg(t, 1.8, 2.0)));
        P.ejector.position.z = -.06 + bump(t, .65, .75, .8, .9) * .03;
        this.once('open', t, .32, () => G.audio.mech('open'));
        this.once('eject', t, .75, () => { for (let k = 0; k < 6 - G.inv.mag.revolver; k++) G.ejectShell(M, 'casing'); G.inv.mag.revolver = 0; P.rounds.forEach(r => r.material = MT.steel); });
        this.once('insert', t, 1.55, () => { G.audio.mech('insert'); fin(); });
        this.once('close', t, 1.95, () => G.audio.mech('close'));
        const cylP = this.toVm(P.cyl, V(0, 0, .055));
        const toCyl = ez.inOut(sg(t, .95, 1.4)), push = ez.inOut(sg(t, 1.4, 1.55)), away = ez.inOut(sg(t, 1.65, 2.0));
        const support = this.anchorOf(M.userData.anchorL, .8);
        let p = V(), q = Q();
        const hold = 1 - ez.inOut(sg(t, .8, 1.0));
        if (t < 1.0) { p.lerpVectors(support.p, pocket.p, 1 - hold); q.slerpQuaternions(support.q, pocket.q, 1 - hold); }
        else { p.lerpVectors(pocket.p, cylP.clone().add(V(-.01, -.01, .04 - push * .03)), toCyl * (1 - away)); q.slerpQuaternions(pocket.q, E(-.3, .4, 1.4), toCyl * (1 - away)); if (away > 0) { p.lerp(support.p, away); q.slerp(support.q, away); } }
        out.L = { p, q, curl: t > .95 && t < 1.6 ? .5 : .8 };
        if (t > .95 && t < 1.62) { out.held = this.loader; out.heldPose = 'loader'; }
        if (t > 2.7) { this.state = 'idle'; this.t = 0; fin(); }
      } else if (cur === 'pulse') {
        const tilt = bump(t, 0, .3, 1.9, 2.3);
        rot.z += tilt * .5; rot.x += tilt * .15 + bump(t, 1.3, 1.4, 1.45, 1.6) * .1; pos.y += tilt * .02 + bump(t, 1.3, 1.36, 1.4, 1.55) * -.015;
        // mag drops out, new mag in, slap, bolt
        const drop = ez.in(sg(t, .35, .6));
        P.mag.position.set(P.magHome.x, P.magHome.y - drop * .4, P.magHome.z); P.mag.visible = t < .6 || t > 1.25;
        if (t > 1.25) { const ins = 1 - ez.out(sg(t, 1.0, 1.35)); P.mag.position.set(P.magHome.x, P.magHome.y - ins * .08, P.magHome.z); }
        this.once('out', t, .35, () => G.audio.mech('mag'));
        this.once('drop', t, .6, () => G.dropMag(M));
        this.once('in', t, 1.3, () => { G.audio.mech('slap'); fin(); });
        this.once('bolt', t, 1.75, () => G.audio.mech('cock'));
        P.bolt.position.z = -.02 + bump(t, 1.7, 1.78, 1.82, 1.95) * .04;
        const support = this.anchorOf(M.userData.anchorL, .9); support.q.multiply(this.supportQ(d));
        const magW = this.toVm(M, V(P.magHome.x, P.magHome.y - .1, P.magHome.z));
        const bolt = this.toVm(P.bolt, V(-.01, 0, 0));
        let p = V(), q = Q();
        const a1 = ez.inOut(sg(t, .3, .6)), a2 = ez.inOut(sg(t, .65, 1.0)), a3 = ez.inOut(sg(t, 1.0, 1.3)), a4 = ez.inOut(sg(t, 1.55, 1.72)), a5 = ez.inOut(sg(t, 1.9, 2.2));
        p.copy(support.p).lerp(pocket.p, a1); q.copy(support.q).slerp(pocket.q, a1);
        p.lerp(pocket.p, a2); p.lerp(magW, a3); q.slerp(E(-.2, .3, .4), a3);
        p.lerp(bolt, a4 * (1 - a5)); q.slerp(E(0, 1.2, 1.2), a4 * (1 - a5));
        if (a5 > 0) { p.lerp(support.p, a5); q.slerp(support.q, a5); }
        out.L = { p, q, curl: .8, rest: true };
        if (t > .62 && t < 1.28) { out.held = this.spareMag; }
        if (t > 2.3) { this.state = 'idle'; this.t = 0; fin(); P.mag.position.copy(P.magHome); P.mag.visible = true; }
      } else if (cur === 'flamer') {
        // swap the fuel canister: unscrew, pull, new one, screw in, pressure pump
        const tilt = bump(t, 0, .3, 2.0, 2.4);
        rot.z += tilt * .7; rot.x -= tilt * .25; pos.y += tilt * .04;
        this.once('a', t, .4, () => G.audio.mech('tank')); this.once('b', t, 1.2, () => { G.audio.mech('tank'); fin(); }); this.once('c', t, 1.6, () => G.audio.mech('cock'));
        const support = this.anchorOf(M.userData.anchorL, .9); support.q.multiply(this.supportQ(d));
        const tank = this.toVm(M, V(0, -.06, -.12));
        const a = ez.inOut(sg(t, .2, .5)), b = ez.inOut(sg(t, 1.6, 2.0));
        const p = V().lerpVectors(support.p, tank, a * (1 - b)); p.y += Math.sin(t * 14) * .01 * a * (1 - b);
        const q = support.q.clone().slerp(E(-.5, .2, 1.4 + Math.sin(t * 9) * .3), a * (1 - b));
        out.L = { p, q, curl: .7, rest: true };
        if (t > 2.4) { this.state = 'idle'; this.t = 0; fin(); }
      }
      return out;
    }
    drawCounter(c, n) {
      if (c.last === n) return; c.last = n;
      const x = c.ctx; x.fillStyle = '#0a1008'; x.fillRect(0, 0, 64, 32); x.fillStyle = n < 8 ? '#ff4030' : '#ff9a30'; x.font = 'bold 26px monospace'; x.textAlign = 'center'; x.fillText(String(n).padStart(2, '0'), 32, 26); c.tex.needsUpdate = true;
    }
    throwAnim(kind) { this.throwKind = kind; this.throwT = 0; }
    render(renderer, aspect) { this.cam.aspect = aspect; this.cam.updateProjectionMatrix(); renderer.render(this.scene, this.cam); }
  }
  K.ViewModel = ViewModel;
})();
