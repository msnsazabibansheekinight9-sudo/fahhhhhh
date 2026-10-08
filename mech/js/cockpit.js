// Ironwalkers — first-person cockpit modelled on real fighter / armoured-vehicle crew stations.
// HOTAS throttle and stick, three soft-key MFDs with pages, standby gauges with live needles, attitude ball,
// HUD combiner, caution/warning annunciator panel, master caution/warning, guarded master-arm switch,
// ejection handle, circuit breakers, harness — all driven by the mech's real state, with a power-up sequence.
(function () {
'use strict';
const MW = window.MW;
const G = MW.mechs.geo; const add = MW.mechs.add; const node = MW.mechs.node;

function glove(side, mats) {
  const h = new THREE.Group();
  const gl = mats.glove, pl = mats.gplate;
  add(h, G.bbox(0.085, 0.1, 0.11, 0.02), gl, side * -0.05, 0, 0.0);
  add(h, G.bbox(0.05, 0.08, 0.1, 0.012), pl, side * -0.085, 0.005, 0.0);
  for (let i = 0; i < 4; i++) {
    const f = node(h, side * -0.02, 0.04 - i * 0.027, -0.05);
    add(f, G.bbox(0.04, 0.024, 0.05, 0.008), gl, side * 0.02, 0, -0.02);
    const f2 = node(f, side * 0.045, 0, -0.035); f2.rotation.y = side * -1.2;
    add(f2, G.bbox(0.035, 0.022, 0.045, 0.008), gl, side * 0.01, 0, -0.02);
  }
  const th = node(h, side * -0.02, 0.05, 0.03); th.rotation.set(0.6, side * 0.4, side * 0.4); th.name = 'thumb';
  add(th, G.bbox(0.032, 0.03, 0.07, 0.01), gl, 0, 0, -0.03);
  const wr = node(h, side * -0.06, -0.01, 0.07);
  add(wr, G.cyl(0.05, 0.055, 0.08, 10), pl, 0, 0, 0.0, Math.PI / 2);
  add(wr, G.cyl(0.055, 0.075, 0.5, 10), mats.sleeve, 0, -0.04, 0.27, Math.PI / 2 - 0.25);
  add(wr, G.box(0.06, 0.012, 0.04), mats.patch, 0, 0.03, 0.22, 0.2);
  return h;
}
function plate(text, w, h, fg, bg) { const t = MW.tex.label(text, fg || '#e8e8e8', bg || '#14161a', 256, Math.round(256 * h / w), `bold ${Math.round(256 * h / w * 0.55)}px Rajdhani, Arial Narrow, Arial, sans-serif`); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); }
function stripes(a, b) { const k = 'strp' + a + b; if (MW[k]) return MW[k]; const cv = MW.tex.canvas(64, 64), c = cv.getContext('2d'); c.fillStyle = a; c.fillRect(0, 0, 64, 64); c.fillStyle = b; for (let i = -64; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 8, 0); c.lineTo(i - 56, 64); c.lineTo(i - 64, 64); c.fill(); } const t = MW.tex.toTex(cv, true); t.repeat.set(4, 1); return (MW[k] = t); }

// analog dial: canvas face + needle
function dial(parent, x, y, z, r, label, max, ticks, hud, rot) {
  const cv = MW.tex.canvas(128), c = cv.getContext('2d');
  c.fillStyle = '#0b0c0e'; c.beginPath(); c.arc(64, 64, 63, 0, 7); c.fill();
  c.strokeStyle = '#d8d8d8'; c.fillStyle = '#d8d8d8'; c.lineWidth = 2; c.font = 'bold 13px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let i = 0; i <= ticks; i++) { const a = -Math.PI * 1.25 + i / ticks * Math.PI * 1.5; c.beginPath(); c.moveTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); c.lineTo(64 + Math.cos(a) * (i % 2 ? 48 : 44), 64 + Math.sin(a) * (i % 2 ? 48 : 44)); c.stroke(); if (!(i % 2)) c.fillText(Math.round(max * i / ticks / (max >= 100 ? 10 : 1)), 64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34); }
  c.strokeStyle = '#ff3b30'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 54, -Math.PI * 1.25 + Math.PI * 1.5 * 0.82, Math.PI * 0.25); c.stroke();
  c.font = 'bold 11px Arial'; c.fillStyle = hud; c.fillText(label, 64, 92); if (max >= 100) { c.font = '9px Arial'; c.fillText('x10', 64, 104); }
  const g = node(parent, x, y, z); if (rot) g.rotation.x = rot;
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ map: MW.tex.toTex(cv), toneMapped: false })); face.userData.keep = true; g.add(face);
  add(g, G.tor(r, r * 0.08, 6, 24), MW.mechs.darkMat(), 0, 0, 0.002);
  const needle = node(g, 0, 0, 0.004); needle.userData.keep = true;
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.06, r * 0.85), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); nm.position.y = r * 0.38; nm.userData.keep = true; needle.add(nm);
  add(g, G.cyl(r * 0.1, r * 0.1, 0.004, 10), MW.mechs.darkMat(), 0, 0, 0.006, Math.PI / 2);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 1 })); glass.position.z = 0.008; glass.userData.keep = true; g.add(glass);
  return { needle, max, set(v) { const t = MW.clamp(v / max, 0, 1.02); needle.rotation.z = -(-Math.PI * 0.75 + t * Math.PI * 1.5); } };
}

const ANN = [['OVERHEAT', 'r'], ['SHUTDOWN', 'r'], ['CORE CRIT', 'r'], ['MSL LAUNCH', 'r'], ['HEAT HI', 'a'], ['ARM L', 'a'], ['ARM R', 'a'], ['LEG DMG', 'a'], ['LOCK', 'a'], ['EMP', 'a'], ['JET LOW', 'a'], ['COOLANT', 'a'], ['SHIELD', 'g'], ['ECM', 'g'], ['ABILITY', 'g'], ['MASTER ARM', 'g']];

MW.cockpit = {
  create(build) {
    const cls = build.cdef;
    const theme = build.cockpit || MW.item('c_0');
    const hud = new THREE.Color(theme.hud), light = new THREE.Color(theme.light);
    const root = new THREE.Group(); root.name = 'cockpit';
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, metalness: 0.6, roughness: 0.5, bumpMap: MW.tex.panelBump(), bumpScale: 0.004 });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2e3238, metalness: 0.2, roughness: 0.8 }); // instrument grey (FS 36231-ish)
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.3, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(build.colors[2]), metalness: 0.5, roughness: 0.35 });
    const paintMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(build.colors[0]), metalness: 0.4, roughness: 0.55 });
    const rubber = MW.mechs.rubberMat(); const chrome = MW.mechs.jointMat();
    const yb = new THREE.MeshStandardMaterial({ map: stripes('#f2c200', '#111111'), roughness: 0.5 });
    const strap = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.95 });
    const mats = { glove: new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.75 }), gplate: new THREE.MeshStandardMaterial({ color: new THREE.Color(build.colors[2]).multiplyScalar(0.8), metalness: 0.4, roughness: 0.4 }), sleeve: new THREE.MeshStandardMaterial({ color: new THREE.Color(build.colors[1]).lerp(new THREE.Color(0x3a4048), 0.5), roughness: 0.85 }), patch: new THREE.MeshStandardMaterial({ map: MW.tex.label(cls.name.toUpperCase(), '#ffd27a', '#2a2a2a', 128, 64), roughness: 0.8 }) };
    const ledOn = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hud.clone(), emissiveIntensity: 1.6 });
    const ledGrn = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color('#4cff7a'), emissiveIntensity: 1.2 });
    const style = cls.weight === 'Light' ? 'wide' : (cls.tons >= 70 ? 'slit' : 'std');

    // ---- canopy / vision block frame ----
    const top = style === 'slit' ? 0.36 : style === 'wide' ? 0.75 : 0.6;
    const bot = style === 'slit' ? -0.2 : -0.34;
    const z = -0.95, halfW = style === 'wide' ? 1.45 : 1.25;
    add(root, G.bbox(halfW * 2 + 0.5, 0.16, 0.5), frameMat, 0, top + 0.08, z + 0.1);
    add(root, G.box(halfW * 2 + 1.2, 0.05, 1.6), panelMat, 0, top + 0.2, z + 0.75);
    for (const s of [-1, 1]) {
      const p = add(root, G.bbox(0.16, top - bot + 0.6, 0.22), frameMat, s * (halfW + 0.05), (top + bot) / 2, z + 0.08); p.rotation.z = s * 0.18; p.rotation.y = s * -0.35;
      add(root, G.box(0.08, top - bot + 0.4, 1.4), panelMat, s * (halfW + 0.35), (top + bot) / 2 - 0.2, z + 0.75);
      // canopy rail with circuit-breaker panel
      const cb = node(root, s * (halfW + 0.12), bot + 0.02, z + 0.65); cb.rotation.z = s * 0.5;
      add(cb, G.box(0.16, 0.02, 0.5), blackMat, 0, 0, 0);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) { add(cb, G.cyl(0.008, 0.008, 0.018, 6), blackMat, -0.05 + i * 0.05, 0.015, -0.21 + j * 0.06); add(cb, G.cyl(0.0095, 0.0095, 0.004, 6), chrome, -0.05 + i * 0.05, 0.012, -0.21 + j * 0.06); }
      // grab handle
      add(root, G.tor(0.07, 0.012, 5, 10, Math.PI), yb, s * (halfW - 0.1), top - 0.02, z + 0.35, 0, Math.PI / 2, Math.PI);
    }
    if (style === 'std') for (const sx of [-1, 1]) { const st = add(root, G.bbox(0.06, top - bot + 0.1, 0.08), frameMat, sx * 0.62, (top + bot) / 2 + 0.02, z - 0.02); st.rotation.z = sx * 0.12; }
    if (style === 'slit') { add(root, G.bbox(halfW * 2 + 0.6, 0.4, 0.3), paintMat, 0, top + 0.35, z + 0.05); for (const s of [-1, 1]) add(root, G.bbox(0.4, 0.5, 0.4), paintMat, s * (halfW + 0.15), 0.05, z); }
    if (style === 'wide') { for (const s of [-1, 1]) add(root, G.tor(0.6, 0.035, 6, 16), frameMat, s * 0.7, top - 0.5, z - 0.02, 0, 0, 0, 1, 1, 0.2); }
    // overhead panel: dome light, switches with placards
    const over = node(root, 0, top + 0.12, z + 0.5);
    add(over, G.box(1.0, 0.05, 0.42), panelMat, 0, 0, 0);
    const toggles = [];
    ['NAV', 'IFF', 'TAC', 'EXT LT', 'DE-ICE', 'WIPER'].forEach((l, i) => { const x = -0.38 + i * 0.15; const tg = node(over, x, -0.03, -0.05); tg.userData.keep = true; add(tg, G.cyl(0.006, 0.004, 0.04, 5), chrome, 0, -0.02, 0); toggles.push(tg); const pl = plate(l, 0.1, 0.022); pl.rotation.x = Math.PI / 2; pl.position.set(x, -0.026, 0.04); pl.userData.keep = true; over.add(pl); });
    add(over, G.cyl(0.06, 0.06, 0.02, 14), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: light.clone(), emissiveIntensity: 0.8 }), 0, -0.03, 0.14);

    // ---- glareshield with master caution / master warning + heading tape + HUD combiner ----
    const gs = node(root, 0, bot + 0.05, -0.78);
    add(gs, G.bbox(2.4, 0.06, 0.2, 0.02), blackMat, 0, 0, 0.04);
    const mkLamp = (txt, col, x) => { const cv = MW.tex.canvas(128, 64), c = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, 0.045, -0.02); m.rotation.x = -0.5; m.userData.keep = true; gs.add(m); add(gs, G.bbox(0.13, 0.03, 0.08, 0.008), blackMat, x, 0.03, -0.02); const L = { cv, c, tex, txt, col, on: -1 }; L.set = on => { if (L.on === on) return; L.on = on; c.fillStyle = on ? col : '#1a1410'; c.fillRect(0, 0, 128, 64); c.fillStyle = on ? '#000' : '#4a3a30'; c.font = 'bold 20px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; txt.split('\n').forEach((t, i, a) => c.fillText(t, 64, 32 + (i - (a.length - 1) / 2) * 22)); tex.needsUpdate = true; }; L.set(false); return L; };
    const mWarn = mkLamp('MASTER\nWARN', '#ff2a2a', -0.75), mCaut = mkLamp('MASTER\nCAUTION', '#ffb52e', 0.75);
    // heading tape
    const hcv = MW.tex.canvas(512, 64); const htex = new THREE.CanvasTexture(hcv); htex.encoding = THREE.sRGBEncoding;
    const hmesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), new THREE.MeshBasicMaterial({ map: htex, toneMapped: false })); hmesh.position.set(0, 0.045, 0.06); hmesh.rotation.x = -0.6; hmesh.userData.keep = true; gs.add(hmesh);
    // HUD combiner glass on its mount
    add(gs, G.box(0.04, 0.12, 0.04), blackMat, -0.24, 0.08, -0.05); add(gs, G.box(0.04, 0.12, 0.04), blackMat, 0.24, 0.08, -0.05);
    const comb = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.hud).multiplyScalar(0.3), transparent: true, opacity: 0.12, roughness: 0.02, metalness: 1, depthWrite: false }));
    comb.position.set(0, 0.25, -0.1); comb.rotation.x = -0.18; comb.userData.keep = true; gs.add(comb);
    add(gs, G.box(0.48, 0.012, 0.012), blackMat, 0, 0.4, -0.13);

    // ---- main instrument panel ----
    const ip = node(root, 0, bot - 0.2, -0.72); ip.rotation.x = -0.22;
    add(ip, G.bbox(2.3, 0.5, 0.06, 0.015), panelMat, 0, 0, -0.03);
    const mkScreen = (w, h) => { const cv = MW.tex.canvas(256, Math.round(256 * h / w)); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.userData.keep = true; return { cv, ctx: cv.getContext('2d'), tex: t, mesh: m }; };
    const screens = { L: mkScreen(0.3, 0.3), C: mkScreen(0.3, 0.3), R: mkScreen(0.3, 0.3) };
    const softkeys = {};
    [['L', -0.56], ['C', 0], ['R', 0.56]].forEach(([k, x]) => {
      const s = screens[k]; const bez = node(ip, x, 0.0, 0.0);
      add(bez, G.bbox(0.42, 0.42, 0.03, 0.01), blackMat, 0, 0, 0);
      s.mesh.position.z = 0.017; bez.add(s.mesh);
      softkeys[k] = [];
      for (let i = 0; i < 5; i++) for (const [px, py] of [[-0.12 + i * 0.06, 0.185], [-0.12 + i * 0.06, -0.185], [-0.185, 0.12 - i * 0.06], [0.185, 0.12 - i * 0.06]]) { const b = add(bez, G.box(0.03, 0.022, 0.016), rubber, px, py, 0.018); b.userData.keep = true; softkeys[k].push(b); }
      add(bez, G.cyl(0.012, 0.012, 0.02, 8), chrome, -0.185, 0.185, 0.02, Math.PI / 2); add(bez, G.cyl(0.012, 0.012, 0.02, 8), chrome, 0.185, 0.185, 0.02, Math.PI / 2);
    });
    // standby instruments between/below MFDs
    const hudHex = theme.hud;
    const gauges = {
      spd: dial(ip, -0.28, -0.15, 0.005, 0.065, 'KPH', 120, 12, hudHex),
      heat: dial(ip, 0.28, -0.15, 0.005, 0.065, 'HEAT %', 100, 10, hudHex),
      rct: dial(ip, -0.28, 0.13, 0.005, 0.055, 'RCT %', 100, 10, hudHex),
      jet: dial(ip, 0.28, 0.13, 0.005, 0.055, 'JET FUEL', 100, 10, hudHex),
    };
    // attitude indicator ball
    const adiG = node(ip, 0, -0.205, 0.0);
    const adiCv = MW.tex.canvas(256, 128), adc = adiCv.getContext('2d');
    adc.fillStyle = '#3a8ad0'; adc.fillRect(0, 0, 256, 64); adc.fillStyle = '#6a4a2a'; adc.fillRect(0, 64, 256, 64); adc.fillStyle = '#fff'; adc.fillRect(0, 63, 256, 2);
    adc.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) if (i) adc.fillRect(118, 64 + i * 9, 20, 1.5);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshBasicMaterial({ map: MW.tex.toTex(adiCv), toneMapped: false })); ball.userData.keep = true; ball.rotation.y = -Math.PI / 2; const ballP = node(adiG, 0, 0, 0.01); ballP.userData.keep = true; ballP.add(ball);
    add(adiG, G.tor(0.048, 0.008, 6, 20), blackMat, 0, 0, 0.03);
    const adiBar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.006), new THREE.MeshBasicMaterial({ color: 0xffb52e })); adiBar.position.z = 0.06; adiBar.userData.keep = true; adiG.add(adiBar);
    // panel placards
    [['RADAR', 0, 0.21], ['SYS', -0.56, 0.21], ['WPN', 0.56, 0.21]].forEach(([t, x, y]) => { const p = plate(t, 0.08, 0.02); p.position.set(x, y + 0.015, 0.002); p.userData.keep = true; ip.add(p); });

    // ---- left console: throttle quadrant (HOTAS), reactor + jet switches ----
    const lc = node(root, -0.78, bot - 0.38, -0.4); lc.rotation.z = 0.18; lc.rotation.x = -0.1;
    add(lc, G.bbox(0.5, 0.06, 0.9, 0.015), panelMat, 0, 0, 0);
    const guardSw = [];
    [['REACTOR', 0.14, 0.35], ['JUMP JET', 0.14, 0.2], ['COOLANT', 0.14, 0.05]].forEach(([t, x, zz]) => { const tg = node(lc, x, 0.035, zz); tg.userData.keep = true; add(tg, G.cyl(0.008, 0.005, 0.05, 5), chrome, 0, 0.025, 0); toggles.push(tg); const p = plate(t, 0.12, 0.022); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.032, zz + 0.04); p.userData.keep = true; lc.add(p); });
    for (let i = 0; i < 3; i++) { add(lc, G.cyl(0.022, 0.025, 0.025, 12), blackMat, -0.16 + i * 0.08, 0.04, 0.32); add(lc, G.box(0.004, 0.01, 0.018), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.16 + i * 0.08, 0.055, 0.32); }
    const thrBase = node(lc, -0.05, 0.03, -0.15);
    add(thrBase, G.bbox(0.12, 0.06, 0.36, 0.015), blackMat, 0, 0, 0);
    const thrScale = plate('IDLE   MIL   AB', 0.3, 0.03, '#d8d8d8', '#14161a'); thrScale.rotation.set(-Math.PI / 2, 0, Math.PI / 2); thrScale.position.set(0.075, 0.032, 0); thrScale.userData.keep = true; thrBase.add(thrScale);
    const lever = node(thrBase, 0, 0.03, 0); lever.userData.keep = true;
    add(lever, G.box(0.03, 0.2, 0.03), chrome, 0, 0.1, 0);
    add(lever, G.bbox(0.08, 0.13, 0.1, 0.025), rubber, 0, 0.24, 0);
    add(lever, G.cyl(0.012, 0.012, 0.015, 8), new THREE.MeshStandardMaterial({ color: 0xc62828 }), 0.035, 0.28, -0.02, 0, 0, Math.PI / 2);
    add(lever, G.box(0.02, 0.02, 0.012), chrome, 0.0, 0.29, -0.05);
    const handL = glove(-1, mats); handL.position.set(0.0, 0.24, 0.0); handL.rotation.y = 0.1; lever.add(handL);

    // ---- right console: side-stick, master arm (guarded), caution panel ----
    const rc = node(root, 0.78, bot - 0.38, -0.4); rc.rotation.z = -0.18; rc.rotation.x = -0.1;
    add(rc, G.bbox(0.5, 0.06, 0.9, 0.015), panelMat, 0, 0, 0);
    const stBase = node(rc, -0.05, 0.03, -0.12);
    add(stBase, G.cyl(0.06, 0.08, 0.04, 14), blackMat, 0, 0, 0);
    add(stBase, G.cyl(0.055, 0.03, 0.05, 10, true), rubber, 0, 0.04, 0);
    const stick = node(stBase, 0, 0.04, 0); stick.userData.keep = true;
    add(stick, G.cyl(0.015, 0.018, 0.16, 8), chrome, 0, 0.08, 0);
    add(stick, G.bbox(0.07, 0.16, 0.085, 0.025), rubber, 0, 0.22, 0, -0.15);
    const trig = add(stick, G.box(0.018, 0.035, 0.015), chrome, 0, 0.2, -0.05); trig.userData.keep = true;
    add(stick, G.box(0.028, 0.028, 0.028), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), 0, 0.31, -0.02);
    add(stick, G.cyl(0.012, 0.012, 0.02, 8), blackMat, 0.02, 0.29, 0.02);
    const handR = glove(1, mats); handR.position.set(0, 0.22, 0.005); stick.add(handR);
    // master arm guarded switch
    const ma = node(rc, 0.14, 0.035, 0.3);
    add(ma, G.box(0.06, 0.02, 0.07), blackMat, 0, 0, 0);
    const maTog = node(ma, 0, 0.01, 0); maTog.userData.keep = true; add(maTog, G.cyl(0.008, 0.005, 0.05, 5), chrome, 0, 0.025, 0);
    const guard = node(ma, 0, 0.012, 0.035); guard.userData.keep = true;
    add(guard, G.box(0.065, 0.06, 0.004), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), 0, 0.03, -0.0);
    add(guard, G.box(0.004, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), 0.03, 0.03, -0.03); add(guard, G.box(0.004, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), -0.03, 0.03, -0.03);
    const maPl = plate('MASTER ARM', 0.13, 0.022, '#ffffff', '#8a1414'); maPl.rotation.x = -Math.PI / 2; maPl.position.set(0.14, 0.033, 0.38); maPl.userData.keep = true; rc.add(maPl);
    // caution / warning annunciator panel (4x4)
    const acv = MW.tex.canvas(256, 256); const atex = new THREE.CanvasTexture(acv); atex.encoding = THREE.sRGBEncoding;
    const ann = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: atex, toneMapped: false })); ann.rotation.x = -Math.PI / 2; ann.position.set(-0.08, 0.034, 0.2); ann.userData.keep = true; rc.add(ann);
    add(rc, G.box(0.24, 0.01, 0.24), blackMat, -0.08, 0.03, 0.2);

    // ---- seat, harness, ejection handle, pilot knees ----
    for (const s of [-1, 1]) {
      add(root, G.sph(0.13, 12, 8), mats.sleeve, s * 0.2, bot - 0.62, -0.5, 0, 0, 0, 1, 0.8, 1.6);
      add(root, G.bbox(0.12, 0.08, 0.12, 0.02), mats.gplate, s * 0.2, bot - 0.54, -0.62);
      add(root, G.box(0.06, 0.012, 0.7), strap, s * 0.22, -0.42, 0.05, 0.9, 0, s * -0.25);
      add(root, G.box(0.045, 0.06, 0.012), chrome, s * 0.16, -0.66, -0.16, 0.9, 0, s * -0.25);
    }
    add(root, G.cyl(0.06, 0.06, 0.02, 16), chrome, 0, -0.74, -0.22, 0.9);
    const eject = add(root, G.tor(0.07, 0.014, 6, 16, Math.PI), yb, 0, bot - 0.66, -0.32, -0.4, 0, Math.PI); eject.userData.keep = true;
    const ejPl = plate('EJECT', 0.08, 0.02, '#111', '#f2c200'); ejPl.position.set(0, bot - 0.57, -0.36); ejPl.rotation.x = -0.4; ejPl.userData.keep = true; root.add(ejPl);

    // ---- glass (cracks appear with core damage) ----
    const glassMat = new THREE.MeshBasicMaterial({ map: MW.tex.cracks(), transparent: true, opacity: 0, depthWrite: false });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2.1, top - bot + 0.1), glassMat);
    glass.position.set(0, (top + bot) / 2, z - 0.05); glass.userData.keep = true; root.add(glass);

    // ---- trinket ----
    let trinket = null, trinketPivot = null;
    if (build.trinket) {
      const tm = MW.mechs.trinketModel(build.trinket.trinket, build.trinket.color);
      if (tm.userData.hang) { trinketPivot = node(root, -0.32, top + 0.0, z + 0.25); tm.scale.setScalar(0.32); trinketPivot.add(tm); }
      else { trinketPivot = node(gs, -0.95, 0.04, 0.0); tm.scale.setScalar(0.26); trinketPivot.add(tm); }
      trinketPivot.userData.keep = true; trinket = tm; tm.userData.keep = true;
    }

    // ---- lighting: flood light + screen spill ----
    const lamp = new THREE.PointLight(light, 0.8, 3.5, 2); lamp.position.set(0, top + 0.05, z + 0.6); root.add(lamp);
    const screenGlow = new THREE.PointLight(hud, 0.45, 1.8, 2); screenGlow.position.set(0, bot - 0.1, -0.5); root.add(screenGlow);

    MW.mechs.mergeNode(root);
    const seen = new Set();
    root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.material.isMeshStandardMaterial && !seen.has(o.material)) { seen.add(o.material); o.material = o.material.clone(); o.material.envMapIntensity = 0.12; } } });

    return {
      root, screens, softkeys, lever, stick, trig, guard, maTog, toggles, gauges, ballP, mWarn, mCaut, ann: { cv: acv, c: acv.getContext('2d'), tex: atex, key: '' }, heading: { cv: hcv, c: hcv.getContext('2d'), tex: htex },
      glassMat, trinket, trinketPivot, lamp, screenGlow, hud: theme.hud, lightCol: theme.light, handL, handR,
      sway: new THREE.Vector3(), swayV: new THREE.Vector3(), tp: { a: 0, v: 0, b: 0, bv: 0 }, mfdT: 0, sweep: 0, pageL: 0, pageR: 0, press: 0, armed: 0,
    };
  },

  // st: {throttle, stickX, stickY, heat, dmg, shutdown, locked, msl, t, accel, turn, firing, boot (0..1, 1=running), info}
  update(ck, dt, st) {
    const boot = st.boot == null ? 1 : st.boot;
    const power = boot > 0.15 && !st.dead;
    ck.lever.rotation.x = -st.throttle * 0.45;
    ck.stick.rotation.z += ((-st.stickX * 0.35) - ck.stick.rotation.z) * Math.min(1, dt * 12);
    ck.stick.rotation.x += ((-st.stickY * 0.3) - ck.stick.rotation.x) * Math.min(1, dt * 12);
    ck.trig.position.z = st.firing ? -0.04 : -0.05;
    // master arm guard flips open and the switch goes up as the boot finishes
    ck.armed += ((boot >= 0.9 && !st.shutdown ? 1 : 0) - ck.armed) * Math.min(1, dt * 5);
    ck.guard.rotation.x = -ck.armed * 1.9; ck.maTog.rotation.x = MW.lerp(0.5, -0.5, ck.armed);
    ck.toggles.forEach((tg, i) => { tg.rotation.x = boot > 0.1 + i * 0.07 ? -0.5 : 0.5; });
    // inertial sway
    const k = 40, d = 9;
    ck.swayV.x += (-ck.sway.x * k - ck.swayV.x * d - (st.accel ? st.accel.x : 0) * 0.002) * dt;
    ck.swayV.y += (-ck.sway.y * k - ck.swayV.y * d - (st.accel ? st.accel.y : 0) * 0.002) * dt;
    ck.sway.addScaledVector(ck.swayV, dt);
    ck.root.position.set(ck.sway.x, ck.sway.y, 0);
    const info = st.info || {};
    const blink = (Math.sin(st.t * 12) > 0) ? 1 : 0;
    // gauges
    if (info.speed != null) {
      ck.gauges.spd.set(power ? info.speed : 0); ck.gauges.heat.set(info.heat * 100); ck.gauges.rct.set(power ? 25 + Math.abs(st.throttle) * 65 + (st.firing ? 8 : 0) + Math.sin(st.t * 7) * 1.5 : 0); ck.gauges.jet.set((info.jumpFuel || 0) * 100);
      ck.ballP.rotation.x = power ? (info.pitch || 0) : 0.6; ck.ballP.rotation.z = power ? -(info.roll || 0) : 0;
    }
    // master warn / caution
    const warn = st.shutdown || info.heat > 0.92 || info.hp && info.hp.core < 0.25 || st.msl;
    const caut = !warn && (info.heat > 0.75 || st.locked || (info.hp && (info.hp.armL < 0.3 || info.hp.armR < 0.3 || info.hp.legs < 0.3)) || info.emp > 0);
    ck.mWarn.set(boot < 0.4 && boot > 0.15 ? true : (warn && blink === 1));
    ck.mCaut.set(boot < 0.4 && boot > 0.15 ? true : (caut && blink === 1));
    // flood light
    ck.lamp.intensity = !power ? 0.05 : st.shutdown ? 0.15 + blink * 0.6 : (info.heat > 0.85 ? 0.6 + blink * 0.6 : 0.8);
    if (st.shutdown || info.heat > 0.85) ck.lamp.color.set(blink ? '#ff2020' : '#401010'); else ck.lamp.color.lerp(new THREE.Color(ck.lightCol), 0.1);
    ck.screenGlow.intensity = power ? 0.45 : 0;
    ck.glassMat.opacity = MW.clamp(((st.dmg || 0) - 0.3) * 1.2, 0, 0.75);
    // trinket pendulum / wobble
    if (ck.trinketPivot) {
      const p = ck.tp; const force = -(st.accel ? st.accel.x : 0) * 0.02 + (st.turn || 0) * 0.4;
      p.v += (-p.a * 18 - p.v * 1.2 + force) * dt; p.a += p.v * dt;
      p.bv += (-p.b * 18 - p.bv * 1.2 - (st.accel ? st.accel.z : 0) * 0.02 + (st.bump || 0)) * dt; p.b += p.bv * dt;
      if (ck.trinket.userData.hang) { ck.trinketPivot.rotation.z = MW.clamp(p.a, -0.9, 0.9); ck.trinketPivot.rotation.x = MW.clamp(p.b, -0.9, 0.9); }
      else ck.trinket.traverse(o => { if (o.userData.wobble) { o.rotation.z = MW.clamp(p.a * 2, -0.6, 0.6); o.rotation.x = MW.clamp(p.b * 2, -0.6, 0.6); } if (o.userData.wave) o.rotation.x = Math.sin(st.t * 4) * 0.6; });
    }
    // soft-key press animation
    if (ck.press > 0) { ck.press -= dt; if (ck.press <= 0 && ck.pressed) { ck.pressed.position.z = 0.018; ck.pressed = null; } }
    ck.mfdT -= dt; ck.sweep += dt * 2.5;
    if (ck.mfdT <= 0) { ck.mfdT = 0.1; this.drawMFD(ck, st, boot, power); this.drawAnn(ck, st, boot, power); this.drawHeading(ck, st, power); }
  },
  // cycle an MFD page and animate the soft-key press
  page(ck, which) {
    if (which === 'L') ck.pageL = (ck.pageL + 1) % 2; else ck.pageR = (ck.pageR + 1) % 3;
    const keys = ck.softkeys[which]; const b = keys[(which === 'L' ? ck.pageL : ck.pageR) * 4]; if (b) { b.position.z = 0.012; ck.pressed = b; ck.press = 0.15; }
    MW.audio.play('ui', null, 0.4);
  },

  drawHeading(ck, st, power) {
    const { c, cv, tex } = ck.heading; const W = cv.width, Hh = cv.height; c.fillStyle = '#05070a'; c.fillRect(0, 0, W, Hh);
    if (power && st.info && st.info.headingDeg != null) {
      const hd = st.info.headingDeg; c.strokeStyle = ck.hud; c.fillStyle = ck.hud; c.font = 'bold 18px monospace'; c.textAlign = 'center';
      for (let a = Math.floor(hd / 5) * 5 - 40; a <= hd + 40; a += 5) { const x = W / 2 + (a - hd) * 6; const v = ((a % 360) + 360) % 360; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, v % 10 ? 10 : 18); c.stroke(); if (v % 30 === 0) c.fillText(v === 0 ? 'N' : v === 90 ? 'E' : v === 180 ? 'S' : v === 270 ? 'W' : String(v / 10), x, 42); }
      c.beginPath(); c.moveTo(W / 2, Hh); c.lineTo(W / 2 - 8, Hh - 12); c.lineTo(W / 2 + 8, Hh - 12); c.fill();
    }
    tex.needsUpdate = true;
  },
  drawAnn(ck, st, boot, power) {
    const info = st.info || {}; const hp = info.hp || {};
    const test = boot > 0.15 && boot < 0.45;
    const on = {
      'OVERHEAT': info.heat > 0.92, 'SHUTDOWN': st.shutdown, 'CORE CRIT': hp.core < 0.25, 'MSL LAUNCH': st.msl, 'HEAT HI': info.heat > 0.7, 'ARM L': hp.armL < 0.35, 'ARM R': hp.armR < 0.35, 'LEG DMG': hp.legs < 0.35,
      'LOCK': st.locked, 'EMP': info.emp > 0, 'JET LOW': info.jumpFuel != null && info.jumpFuel < 0.2 && info.hasJets, 'COOLANT': info.water, 'SHIELD': info.shield != null && info.shield > 0.05, 'ECM': info.ecm, 'ABILITY': info.abilityReady, 'MASTER ARM': ck.armed > 0.5,
    };
    const blink = Math.sin(st.t * 12) > 0;
    const key = (power ? 1 : 0) + (test ? 'T' : '') + ANN.map(([n, c]) => on[n] ? (c === 'r' && !blink ? 2 : 1) : 0).join('');
    if (key === ck.ann.key) return; ck.ann.key = key;
    const c = ck.ann.c; c.fillStyle = '#0a0b0d'; c.fillRect(0, 0, 256, 256);
    ANN.forEach(([n, col], i) => {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 64; const lit = power && (test || (on[n] && !(col === 'r' && !blink)));
      const cc = col === 'r' ? '#ff3030' : col === 'a' ? '#ffb52e' : '#4cff7a';
      c.fillStyle = lit ? cc : '#1c1a17'; c.fillRect(x + 3, y + 3, 58, 58);
      c.fillStyle = lit ? '#000' : '#3a3630'; c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      n.split(' ').forEach((w, j, a) => c.fillText(w, x + 32, y + 32 + (j - (a.length - 1) / 2) * 13));
    });
    ck.ann.tex.needsUpdate = true;
  },
  drawMFD(ck, st, boot, power) {
    const hud = ck.hud, info = st.info || {};
    const keyLabels = (c, W, H, top, bottom, sel) => { c.font = 'bold 11px monospace'; c.textAlign = 'center'; top.forEach((t, i) => { const x = W * (0.1 + i * 0.2); c.fillStyle = i === sel ? '#000' : hud; if (i === sel) { c.fillStyle = hud; c.fillRect(x - 22, 2, 44, 14); c.fillStyle = '#000'; } c.fillText(t, x, 13); }); (bottom || []).forEach((t, i) => { c.fillStyle = hud; c.fillText(t, W * (0.1 + i * 0.2), H - 5); }); c.textAlign = 'left'; };
    const bg = ctx => { ctx.fillStyle = '#04070a'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); };
    const scan = ctx => { ctx.strokeStyle = MW.tex.hexA(hud, 0.06); ctx.lineWidth = 1; for (let y = 0; y < ctx.canvas.height; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ctx.canvas.width, y); ctx.stroke(); } };
    const all = [ck.screens.L, ck.screens.C, ck.screens.R];
    if (!power) { all.forEach(s => { s.ctx.fillStyle = '#020203'; s.ctx.fillRect(0, 0, 256, 256); s.tex.needsUpdate = true; }); return; }
    if (boot < 1 || st.shutdown) {
      const lines = st.shutdown ? ['REACTOR SCRAM', 'THERMAL LIMIT EXCEEDED', 'COOLING...', 'RESTART ' + (info.restart || 0).toFixed(1) + 's'] : ['IRONWALKER OS 4.2', 'BIOS ........ OK', 'REACTOR IGN . ' + (boot > 0.35 ? 'OK' : '..'), 'GYRO ALIGN .. ' + (boot > 0.5 ? 'OK' : '..'), 'ACTUATORS ... ' + (boot > 0.62 ? 'OK' : '..'), 'SENSORS ..... ' + (boot > 0.74 ? 'OK' : '..'), 'WEAPONS ..... ' + (boot > 0.86 ? 'OK' : '..'), 'MASTER ARM .. ' + (boot > 0.95 ? 'ON' : 'SAFE')];
      all.forEach((s, k) => { const c = s.ctx; bg(c); c.fillStyle = st.shutdown ? '#ff4040' : hud; c.font = 'bold 14px monospace'; lines.forEach((l, i) => { if (st.shutdown || i < 2 + boot * 7 || k !== 1) c.fillText(l, 12, 36 + i * 20); }); if (!st.shutdown) { c.strokeStyle = hud; c.strokeRect(12, 220, 232, 12); c.fillRect(12, 220, 232 * boot, 12); } scan(c); s.tex.needsUpdate = true; });
      return;
    }
    const glitch = info.emp > 0;
    // LEFT: SYS (armour doll + shield) / ENG (reactor, actuators, jets)
    { const s = ck.screens.L, c = s.ctx, W = 256, H = 256; bg(c); keyLabels(c, W, H, ['SYS', 'ENG', '', '', ''], ['', 'DCLT', '', 'MENU', ''], ck.pageL);
      const col = r => r <= 0 ? '#333' : r < 0.3 ? '#ff3b30' : r < 0.6 ? '#ffb52e' : hud;
      const hp = info.hp || { core: 1, armL: 1, armR: 1, legs: 1 };
      if (ck.pageL === 0) {
        c.fillStyle = col(hp.core); c.fillRect(98, 46, 60, 74);
        c.fillStyle = col(hp.armL); c.fillRect(60, 52, 32, 58);
        c.fillStyle = col(hp.armR); c.fillRect(164, 52, 32, 58);
        c.fillStyle = col(hp.legs); c.fillRect(98, 126, 26, 70); c.fillRect(132, 126, 26, 70);
        c.fillStyle = '#000'; c.font = 'bold 13px monospace'; c.fillText(String(Math.round(hp.core * 100)), 114, 88);
        c.fillStyle = hud; c.font = '11px monospace'; c.fillText('L ' + Math.round(hp.armL * 100), 62, 124); c.fillText('R ' + Math.round(hp.armR * 100), 166, 124); c.fillText('LEGS ' + Math.round(hp.legs * 100), 100, 212);
        if (info.shield != null) { c.strokeStyle = '#62c8ff'; c.lineWidth = 3; c.globalAlpha = 0.25 + info.shield * 0.75; c.beginPath(); c.arc(128, 120, 92, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.globalAlpha = 1; c.fillStyle = '#62c8ff'; c.fillText('SHLD ' + Math.round(info.shield * 100), 100, 30); }
      } else {
        c.fillStyle = hud; c.font = 'bold 12px monospace';
        const rows = [['CORE TEMP', Math.round(320 + info.heat * 900) + ' K'], ['HEAT LOAD', Math.round(info.heat * 100) + ' %'], ['DISSIPATION', (info.diss || 0).toFixed(1) + ' /s'], ['THROTTLE', Math.round(st.throttle * 100) + ' %'], ['GROUND SPD', Math.round(info.speed) + ' KPH'], ['JET FUEL', Math.round((info.jumpFuel || 0) * 100) + ' %'], ['ACTUATORS', hp.legs > 0.35 ? 'NOMINAL' : 'DAMAGED'], ['COOLANT', info.water ? 'EXT FLOW' : 'CLOSED']];
        rows.forEach(([a, b], i) => { c.fillText(a, 14, 40 + i * 24); c.textAlign = 'right'; c.fillText(b, 242, 40 + i * 24); c.textAlign = 'left'; });
        c.strokeStyle = hud; c.strokeRect(14, 232, 228, 8); c.fillStyle = info.heat > 0.85 ? '#ff3b30' : hud; c.fillRect(14, 232, 228 * info.heat, 8);
      }
      scan(c); s.tex.needsUpdate = true; }
    // CENTRE: radar (PPI scope)
    { const s = ck.screens.C, c = s.ctx, W = 256, H = 256; bg(c); keyLabels(c, W, H, ['RDR', String(info.radar || 300), 'ACT', '', ''], ['', '', 'TWS', '', ''], 0);
      const cx = W / 2, cy = H / 2 + 8, R = H / 2 - 26;
      c.strokeStyle = MW.tex.hexA(hud, 0.5); c.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(cx, cy, R * i / 3, 0, 7); c.stroke(); }
      c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
      const a = ck.sweep % (Math.PI * 2);
      if (c.createConicGradient) { const g = c.createConicGradient(a - 0.6, cx, cy); g.addColorStop(0, MW.tex.hexA(hud, 0)); g.addColorStop(0.09, MW.tex.hexA(hud, 0.35)); g.addColorStop(0.1, MW.tex.hexA(hud, 0)); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); }
      c.strokeStyle = hud; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R + 5, -Math.PI / 2 - 0.5 + (info.twist || 0), -Math.PI / 2 + 0.5 + (info.twist || 0)); c.stroke();
      (info.blips || []).forEach(b => { const x = cx + b.x * R, y = cy + b.y * R; if (Math.hypot(b.x, b.y) > 1.05) return; c.fillStyle = b.c; if (b.obj) { c.fillRect(x - 4, y - 4, 8, 8); } else { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 4, y + 4); c.lineTo(x - 4, y + 4); c.fill(); } if (b.tgt) { c.strokeStyle = '#ff5050'; c.strokeRect(x - 7, y - 7, 14, 14); } });
      c.fillStyle = hud; c.beginPath(); c.moveTo(cx, cy - 6); c.lineTo(cx + 5, cy + 5); c.lineTo(cx - 5, cy + 5); c.fill();
      if (glitch) { for (let i = 0; i < 14; i++) { c.fillStyle = MW.tex.hexA(hud, Math.random() * 0.6); c.fillRect(0, Math.random() * H, W, 2 + Math.random() * 8); } }
      scan(c); s.tex.needsUpdate = true; }
    // RIGHT: WPN / TGT / MAP
    { const s = ck.screens.R, c = s.ctx, W = 256, H = 256; bg(c); keyLabels(c, W, H, ['WPN', 'TGT', 'MAP', '', ''], ['', '', 'GRP', '', ''], ck.pageR);
      c.font = 'bold 13px monospace';
      if (ck.pageR === 0) {
        (info.weapons || []).forEach((w, i) => { const y = 26 + i * 30; c.fillStyle = w.dead ? '#444' : hud; c.globalAlpha = w.ready ? 1 : 0.55; c.fillText(w.group + ' ' + w.short, 12, y + 14); c.strokeStyle = c.fillStyle; c.strokeRect(118, y + 4, 124, 12); c.fillRect(118, y + 4, 124 * w.cd, 12); c.globalAlpha = 1; });
      } else if (ck.pageR === 1) {
        const t = info.target;
        if (!t) { c.fillStyle = hud; c.fillText('NO TARGET', 80, 130); }
        else { c.fillStyle = '#ff5050'; c.fillText(t.name.toUpperCase(), 12, 40); c.fillText(t.cls, 12, 58); c.fillText('RNG ' + Math.round(t.dist) + 'm', 12, 76); c.fillText('TIER ' + t.tier, 12, 94);
          const col = r => r <= 0 ? '#333' : r < 0.3 ? '#ff3b30' : r < 0.6 ? '#ffb52e' : '#ff8080'; const p = t.parts || {};
          c.fillStyle = col(p.core); c.fillRect(150, 50, 44, 54); c.fillStyle = col(p.armL); c.fillRect(124, 54, 22, 44); c.fillStyle = col(p.armR); c.fillRect(198, 54, 22, 44); c.fillStyle = col(p.legs); c.fillRect(150, 108, 19, 50); c.fillRect(175, 108, 19, 50);
          c.fillStyle = '#ff5050'; c.fillRect(12, 200, 230 * t.hp, 10); }
      } else if (info.map) {
        c.globalAlpha = 0.8; c.drawImage(info.map, 18, 20, 220, 220); c.globalAlpha = 1;
        (info.mapBlips || []).forEach(b => { c.fillStyle = b.c; c.fillRect(18 + b.x * 220 - 2, 20 + b.y * 220 - 2, b.me ? 6 : 4, b.me ? 6 : 4); });
      }
      scan(c); s.tex.needsUpdate = true; }
  },
};
})();
