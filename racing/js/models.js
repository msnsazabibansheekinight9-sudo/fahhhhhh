// Procedural car modelling, part 1: materials, liveries, lofted bodies, wheels, drivers, mesh merging.
var RX = window.RX || (window.RX = {});

(function () {
  var V3 = THREE.Vector3;

  // ---------- canvas textures ----------
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  RX.canvas = canvas;
  function tex(c, repeat) {
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  RX.tex = tex;

  var cache = {};
  function once(key, fn) { return cache[key] || (cache[key] = fn()); }

  RX.carbonTex = function () {
    return once('carbon', function () {
      var c = canvas(64, 64), g = c.getContext('2d');
      g.fillStyle = '#151618'; g.fillRect(0, 0, 64, 64);
      for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
        var odd = (x + y) % 2;
        var gr = g.createLinearGradient(x * 8, y * 8, x * 8 + (odd ? 8 : 0), y * 8 + (odd ? 0 : 8));
        gr.addColorStop(0, '#2a2c30'); gr.addColorStop(0.5, '#0d0e10'); gr.addColorStop(1, '#2a2c30');
        g.fillStyle = gr; g.fillRect(x * 8 + 0.5, y * 8 + 0.5, 7, 7);
      }
      return tex(c, [6, 6]);
    });
  };

  RX.mats = function () {
    return once('mats', function () {
      var M = {};
      M.black = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6, metalness: 0.2 });
      M.plastic = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.75 });
      M.carbon = new THREE.MeshPhysicalMaterial({ map: RX.carbonTex(), roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
      M.chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 1 });
      M.alu = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.9 });
      M.steel = new THREE.MeshStandardMaterial({ color: 0x6d7076, roughness: 0.45, metalness: 0.85 });
      M.rubber = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.92 });
      M.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1118, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 });
      M.clearGlass = new THREE.MeshPhysicalMaterial({ color: 0x9fb3c8, roughness: 0.02, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
      M.head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 0.5, roughness: 0.1 });
      M.tail = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1010, emissiveIntensity: 0.4, roughness: 0.3 });
      M.disc = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.5, metalness: 0.8, emissive: 0xff3300, emissiveIntensity: 0 });
      M.interior = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.9, side: THREE.BackSide });
      M.seat = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.85 });
      M.cage = new THREE.MeshStandardMaterial({ color: 0x8a8d93, roughness: 0.4, metalness: 0.7 });
      M.exhaust = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.4, metalness: 0.9 });
      M.radiator = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.5 });
      M.leather = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });
      M.wood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.6 });
      M.engine = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.7 });
      M.red = new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.4 });
      M.fan = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.5, metalness: 0.4 });
      M.mesh = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.8, metalness: 0.4 });
      M.skin = new THREE.MeshStandardMaterial({ color: 0xc89a7a, roughness: 0.7 });
      M.flame = new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      return M;
    });
  };

  // ---------- default customisation ----------
  var TEAM_COLORS = [
    ['#d40000', '#ffffff', '#111111'], ['#0a2a6b', '#ff8a00', '#ffffff'], ['#00a19b', '#111111', '#c0c0c0'],
    ['#ff8000', '#1e1e1e', '#3ab0ff'], ['#0d1b4c', '#e10600', '#f5d000'], ['#f2f2f2', '#d40000', '#1c3f94'],
    ['#00594f', '#cedc00', '#ffffff'], ['#000000', '#d4af37', '#ffffff'], ['#7fc6e8', '#f68b1f', '#ffffff'],
    ['#ffd400', '#000000', '#e30613'], ['#1a7a2e', '#ffffff', '#f0c419'], ['#5d2e8c', '#ffffff', '#fbd000'],
    ['#c9ccd1', '#111111', '#00a3e0'], ['#e4002b', '#002f6c', '#ffffff'], ['#ff5fa2', '#1b1b1b', '#ffffff']
  ];
  RX.PATTERNS = ['solid', 'stripes', 'center', 'side', 'twotone', 'band', 'chevron', 'fade', 'checker', 'split', 'flames',
    'camo', 'hex', 'pinstripe', 'tricolor', 'lightning', 'digital', 'waves', 'carbonhalf', 'panels', 'arrow', 'dots', 'tiger', 'sunburst'];
  RX.RIMS = ['monoblock', 'spoke5', 'spokeY', 'multi10', 'mesh', 'split', 'dish', 'turbofan', 'wire', 'steelie', 'beadlock', 'spoke7', 'kart', 'aero'];
  RX.SPONSORS = [
    ['APEX OIL', 'VELOCITA', 'NORTHSTAR', 'KESTREL'], ['TURBOTEC', 'ZENITH', 'GALLANT', 'RAPIDE'],
    ['ORION', 'HELIX', 'MAVERICK', 'POLARIS'], ['FUSION', 'TITAN TYRES', 'BOREAL', 'QUANTA'],
    ['ROCKETFUEL', 'DYNAMO', 'SPECTRE', 'IRONWOOD'], ['NONE', '', '', '']
  ];
  RX.defaultCustom = function (car) {
    var h = 0; for (var i = 0; i < car.name.length; i++) h = (h * 31 + car.name.charCodeAt(i)) >>> 0;
    var tc = TEAM_COLORS[h % TEAM_COLORS.length];
    var nm = car.name.toLowerCase();
    // a few period-correct defaults
    if (/ferrari|alfa romeo 1|maserati 250|lancia d|scarlet/.test(nm)) tc = ['#c8102e', '#f5d000', '#ffffff'];
    if (/mercedes|auto union|silver/.test(nm) && car.year < 1960) tc = ['#c9ccd1', '#9aa0a8', '#111111'];
    if (/bugatti/.test(nm)) tc = ['#1b4d9b', '#c9ccd1', '#111111'];
    if (/bentley|vanwall|brm|jaguar d|aston|lotus 25|lotus 49|cooper/.test(nm) && car.year < 1968) tc = ['#0b4d2c', '#f5f5f0', '#f5d000'];
    if (/gulf|917k|gt40 mk ii/.test(nm)) tc = ['#8ec9e8', '#f68b1f', '#ffffff'];
    if (/mclaren m8|mclaren m6|mclaren m1/.test(nm)) tc = ['#ff7f00', '#1b1b1b', '#ffffff'];
    var pat = RX.PATTERNS[(h >> 3) % 12];
    if (car.year < 1960) pat = (h & 1) ? 'solid' : 'center';
    return {
      paint1: tc[0], paint2: tc[1], paint3: tc[2], finish: car.year < 1970 ? 'gloss' : ['gloss', 'metallic', 'satin', 'pearl'][h % 4],
      pattern: pat, patScale: 1, number: (h % 98) + 1, numColor: tc[0] === '#f2f2f2' ? '#111111' : '#ffffff', numStyle: car.year < 1980 ? 'roundel' : 'plain',
      sponsor: car.year < 1968 ? 5 : h % 5, rimStyle: 'auto', rimColor: '#c0c4ca', rimFinish: 'metal', rimSize: 0,
      tireWall: car.year > 1970 && car.year < 2000 ? 'letters' : 'plain', caliperColor: '#d01818', tint: 0.6,
      headColor: '#fff4dc', underglow: 'none', flameColor: '#66aaff', helmetColor: tc[1], helmetColor2: tc[0], helmetDesign: (h >> 5) % 6,
      suitColor: tc[0], gloveColor: '#222222',
      wing: -1, splitter: -1, skirts: 0, diffuser: 0, canards: 0, scoop: -1, mudflaps: -1, lightpod: 0, cage: -1, widebody: 0,
      exhaustTip: 'auto', mirrors: 1, windowNet: -1, towHook: 1, antenna: 0, roofNumber: -1, dirt: 0,
      rideHeight: 0, camberF: -2.5, camberR: -1.5, toe: 0, spring: 0.5, damper: 0.5, arbF: 0.5, arbR: 0.5,
      tirePress: 0.5, brakeBias: 0.56, brakePress: 1, diff: 0.5, finalDrive: 1, power: 0, weightRed: 0, ballast: 0,
      boost: 0.5, nitro: 0, tc: 1, abs: 1, sc: 1, gearbox: 'auto', steerLock: 1, steerSens: 1, compound: 'auto',
      aeroF: 0.5, aeroR: 0.5, revLimit: 1, launch: 1,
      pattern2: 'none', roofColor: 'none', carbonHood: 0, decal: 'none', decalColor: tc[2], flag: 'none', driverName: '', banner: '', bannerColor: '#111111', bannerText: '#ffffff',
      numFont: 'sans', mirrorColor: 'body', wingColor: 'body', trimColor: '#0c0c0d', wallColor: '#f2f2f2', towColor: '#e01e1e', hoodPins: 0, fenderVents: 0, roofVent: 0, louvres: 0,
      classLight: '#ff2a2a', interiorColor: '#1f2024', interiorTrim: 'race', seatColor: '#202226', harnessColor: tc[0] === '#c81e1e' ? '#1c3f94' : '#c81e1e', wheelStyle: 'auto', wheelMark: '#ffcc00',
      dashStyle: 'auto', leverStyle: 'auto', knobColor: '', visor: 'smoke', skinTone: '#c89a7a', helmetType: 'full', seatHeight: 0, seatFore: 0
    };
  };

  // ---------- paint ----------
  RX.paintMaterial = function (cus, map) {
    var f = cus.finish, p = { map: map, color: 0xffffff };
    var o = {
      gloss: { roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 },
      metallic: { roughness: 0.35, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.08 },
      matte: { roughness: 0.85, metalness: 0.0, clearcoat: 0 },
      satin: { roughness: 0.55, metalness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.5 },
      chrome: { roughness: 0.06, metalness: 1.0, clearcoat: 1, clearcoatRoughness: 0.02 },
      pearl: { roughness: 0.25, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.03 },
      candy: { roughness: 0.15, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.0 },
      flake: { roughness: 0.4, metalness: 0.8, clearcoat: 1, clearcoatRoughness: 0.05 }
    }[f] || {};
    for (var k in o) p[k] = o[k];
    var m = new THREE.MeshPhysicalMaterial(p);
    m.envMapIntensity = f === 'chrome' ? 1.6 : 1.1;
    return m;
  };

  // Livery canvas in body UV space: u = rear->front, v = bottom centre -> right side -> top centre -> left side.
  // glassFn(u, v) -> true if that texel is a window.
  RX.drawLivery = function (cus, glassFn, opts) {
    opts = opts || {};
    var W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d');
    var c1 = cus.paint1, c2 = cus.paint2, c3 = cus.paint3, sc = cus.patScale || 1;
    g.fillStyle = c1; g.fillRect(0, 0, W, H);
    // a(v): 0 at top centre, 1 at bottom centre; canvas y = (1-v)*H.
    function band(a0, a1, col, u0, u1) {
      u0 = u0 || 0; u1 = u1 == null ? 1 : u1;
      g.fillStyle = col;
      // two mirrored rectangles (right: v=0.5-a/2, left: v=0.5+a/2)
      var vA = 0.5 - a1 / 2, vB = 0.5 - a0 / 2;
      g.fillRect(u0 * W, (1 - vB) * H, (u1 - u0) * W, (vB - vA) * H);
      vA = 0.5 + a0 / 2; vB = 0.5 + a1 / 2;
      g.fillRect(u0 * W, (1 - vB) * H, (u1 - u0) * W, (vB - vA) * H);
    }
    function poly(pts, col) { // pts in (u, a) space, mirrored
      g.fillStyle = col;
      [1, -1].forEach(function (sgn) {
        g.beginPath();
        pts.forEach(function (p, i) { var v = 0.5 - sgn * p[1] / 2; var x = p[0] * W, y = (1 - v) * H; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.closePath(); g.fill();
      });
    }
    var R = RX.rng(cus.number * 31 + 7);
    function drawPattern(name, c2, c3) {
    switch (name) {
      case 'stripes': band(0.03 * sc, 0.09 * sc, c2); break;
      case 'center': band(0, 0.1 * sc, c2); band(0.1 * sc, 0.12 * sc, c3); break;
      case 'side': band(0.42, 0.5 * sc + 0.02, c2); band(0.5 * sc + 0.02, 0.53 * sc + 0.03, c3); break;
      case 'twotone': band(0.55, 1, c2); band(0.53, 0.55, c3); break;
      case 'band': band(0.25, 0.75, c2, 0.25, 0.75); band(0.25, 0.75, c3, 0.48, 0.52); break;
      case 'chevron':
        for (var i = 0; i < 6; i++) { var u = 0.1 + i * 0.15 * sc; poly([[u, 0], [u + 0.06, 0], [u + 0.14, 0.6], [u + 0.08, 0.6]], i % 2 ? c2 : c3); }
        break;
      case 'fade':
        var gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, c2); gr.addColorStop(0.65, c1); g.fillStyle = gr; g.fillRect(0, 0, W, H); break;
      case 'checker':
        var cs = 22 * sc;
        for (var x = 0; x < W * 0.3; x += cs) for (var y = 0; y < H; y += cs) if (((x + y) / cs) % 2 === 0) { g.fillStyle = c2; g.fillRect(x, y, cs, cs); }
        break;
      case 'split': g.fillStyle = c2; g.fillRect(0, 0, W * 0.5, H); g.fillStyle = c3; g.fillRect(W * 0.49, 0, W * 0.02, H); break;
      case 'flames':
        for (var f = 0; f < 7; f++) {
          var a0 = 0.28 + f * 0.06, len = 0.25 + R() * 0.25;
          poly([[1, a0], [1 - len * 0.6, a0 - 0.04], [1 - len, a0 + 0.02], [1 - len * 0.7, a0 + 0.04], [1 - len * 0.4, a0 + 0.07], [1, a0 + 0.06]], f % 2 ? c2 : c3);
        }
        break;
      case 'camo':
        for (var k = 0; k < 140; k++) { g.fillStyle = [c2, c3, c1][k % 3]; g.beginPath(); g.ellipse(R() * W, R() * H, (20 + R() * 50) * sc, (10 + R() * 30) * sc, R() * 3, 0, 7); g.fill(); }
        break;
      case 'hex':
        g.strokeStyle = c2; g.lineWidth = 3;
        for (var hy = 0; hy < H; hy += 26 * sc) for (var hx = 0; hx < W; hx += 30 * sc) {
          g.beginPath(); for (var q = 0; q < 6; q++) { var an = q * Math.PI / 3; g.lineTo(hx + ((hy / (26 * sc)) % 2) * 15 * sc + Math.cos(an) * 12 * sc, hy + Math.sin(an) * 12 * sc); } g.closePath(); g.stroke();
        }
        break;
      case 'pinstripe': band(0.38, 0.39, c2); band(0.41, 0.42, c3); band(0.02, 0.025, c2); break;
      case 'tricolor': band(0.30, 0.36, c2); band(0.36, 0.42, c3); band(0.42, 0.48, '#e30613'); break;
      case 'lightning':
        poly([[0.95, 0.3], [0.6, 0.38], [0.65, 0.33], [0.2, 0.45], [0.55, 0.37], [0.5, 0.42], [0.95, 0.34]], c2); break;
      case 'digital':
        var px = 16 * sc;
        for (var dx = 0; dx < W; dx += px) for (var dy = 0; dy < H; dy += px) if (R() < dx / W * 0.9) { g.fillStyle = R() < 0.5 ? c2 : c3; g.fillRect(W - dx, dy, px - 1, px - 1); }
        break;
      case 'waves':
        g.fillStyle = c2;
        for (var wv = 0; wv < 3; wv++) {
          g.beginPath(); g.moveTo(0, H * (0.2 + wv * 0.3));
          for (var wx = 0; wx <= W; wx += 8) g.lineTo(wx, H * (0.2 + wv * 0.3) + Math.sin(wx / (60 * sc) + wv) * 18);
          g.lineTo(W, H * (0.27 + wv * 0.3)); g.lineTo(0, H * (0.27 + wv * 0.3)); g.fill();
        }
        break;
      case 'carbonhalf':
        var cc = canvas(32, 32), cg = cc.getContext('2d'); cg.fillStyle = '#1b1c1e'; cg.fillRect(0, 0, 32, 32);
        cg.fillStyle = '#2c2e32'; cg.fillRect(0, 0, 16, 16); cg.fillRect(16, 16, 16, 16);
        g.fillStyle = g.createPattern(cc, 'repeat'); band(0.6, 1, g.fillStyle); band(0.58, 0.6, c2); break;
      case 'panels': band(0.3, 0.6, c2, 0.3, 0.7); band(0.3, 0.6, c3, 0.68, 0.7); band(0.3, 0.6, c3, 0.3, 0.32); break;
      case 'arrow': poly([[0.2, 0.2], [0.75, 0.2], [0.75, 0.1], [0.95, 0.35], [0.75, 0.6], [0.75, 0.5], [0.2, 0.5]], c2); break;
      case 'dots': g.fillStyle = c2; for (var d2 = 0; d2 < 220; d2++) { var dxp = R() * W; g.beginPath(); g.arc(dxp, R() * H, (2 + dxp / W * 12) * sc, 0, 7); g.fill(); } break;
      case 'tiger':
        for (var t2 = 0; t2 < 18; t2++) { var tu = t2 / 18 + R() * 0.02; poly([[tu, 0.1], [tu + 0.02, 0.1], [tu + 0.05, 0.5], [tu + 0.01, 0.8], [tu + 0.02, 0.5]], c2); } break;
      case 'sunburst':
        g.save(); g.translate(W * 0.55, H * 0.5);
        for (var sb = 0; sb < 24; sb++) { g.rotate(Math.PI / 12); g.fillStyle = sb % 2 ? c2 : c1; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, -60); g.lineTo(900, 60); g.fill(); }
        g.restore(); break;
    }
    }
    drawPattern(cus.pattern, c2, c3);
    if (cus.pattern2 && cus.pattern2 !== 'none') drawPattern(cus.pattern2, c3, c2);
    // two-tone roof and carbon bonnet
    if (cus.roofColor && cus.roofColor !== 'none' && opts.roofU) band(0, 0.16, cus.roofColor, opts.roofU[0], opts.roofU[1]);
    if (cus.carbonHood && opts.hoodU) {
      var ccv = canvas(16, 16), ccg = ccv.getContext('2d'); ccg.fillStyle = '#16171a'; ccg.fillRect(0, 0, 16, 16); ccg.fillStyle = '#2c2e33'; ccg.fillRect(0, 0, 8, 8); ccg.fillRect(8, 8, 8, 8);
      band(0, 0.3, g.createPattern(ccv, 'repeat'), opts.hoodU[0], opts.hoodU[1]);
    }
    // decals
    var dcol = cus.decalColor || c3;
    switch (cus.decal) {
      case 'stars': g.fillStyle = dcol; [0.7, 0.76, 0.82].forEach(function (u, i) { [1, -1].forEach(function (sg) { var v = 0.5 - sg * 0.31; star(u * W, (1 - v) * H, 14 - i * 2); }); }); break;
      case 'bolt': poly([[0.84, 0.35], [0.74, 0.47], [0.78, 0.47], [0.68, 0.62], [0.8, 0.46], [0.76, 0.46], [0.86, 0.35]], dcol); break;
      case 'shark': for (var st2 = 0; st2 < 6; st2++) poly([[0.96 - st2 * 0.02, 0.72], [0.95 - st2 * 0.02, 0.84], [0.94 - st2 * 0.02, 0.72]], '#ffffff'); poly([[0.99, 0.7], [0.92, 0.7], [0.9, 0.86], [0.99, 0.86]], 'rgba(0,0,0,0)'); break;
      case 'eyes': [0.06, 0.1].forEach(function (aa) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0.955 * W, (1 - (0.5 - aa / 2)) * H, 14, 9, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(0.955 * W, (1 - (0.5 + aa / 2)) * H, 14, 9, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(0.958 * W, (1 - (0.5 - aa / 2)) * H, 5, 0, 7); g.fill(); g.beginPath(); g.arc(0.958 * W, (1 - (0.5 + aa / 2)) * H, 5, 0, 7); g.fill(); }); break;
      case 'checkflag': for (var cx = 0; cx < 6; cx++) for (var cy = 0; cy < 3; cy++) if ((cx + cy) % 2 === 0) band(0.33 + cy * 0.035, 0.365 + cy * 0.035, '#111', 0.04 + cx * 0.015, 0.055 + cx * 0.015); break;
    }
    function star(x, yy, r) { g.beginPath(); for (var k = 0; k < 10; k++) { var an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(an) * rr, yy + Math.sin(an) * rr); } g.closePath(); g.fill(); }
    var FLAGS = { italy: ['#009246', '#ffffff', '#ce2b37'], germany: ['#000000', '#dd0000', '#ffce00'], france: ['#0055a4', '#ffffff', '#ef4135'], uk: ['#012169', '#ffffff', '#c8102e'], usa: ['#3c3b6e', '#ffffff', '#b22234'], japan: ['#ffffff', '#bc002d', '#ffffff'], brazil: ['#009c3b', '#ffdf00', '#002776'], belgium: ['#000000', '#fdda24', '#ef3340'], mexico: ['#006847', '#ffffff', '#ce1126'] };
    if (cus.flag && FLAGS[cus.flag]) FLAGS[cus.flag].forEach(function (fc, i) { band(0.36, 0.44, fc, 0.08 + i * 0.025, 0.105 + i * 0.025); });
    // dark lower valance / sills (the underside of the body)
    if (opts.valance !== false) { band(0.9, 1, '#151618'); band(0.88, 0.9, 'rgba(0,0,0,0.5)'); }
    // sponsor text along lower sides (only when the body exposes them)
    var sp = RX.SPONSORS[cus.sponsor] || RX.SPONSORS[0];
    if (sp[0] && sp[0] !== 'NONE' && !opts.noSponsors) {
      g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var drawSide = function (txt, u, a, col) {
        // right side (v = 0.5 - a/2): u runs screen-left, so mirror horizontally
        var vR = 0.5 - a / 2, vL = 0.5 + a / 2;
        g.save(); g.translate(u * W, (1 - vR) * H); g.scale(-1, 1); g.fillStyle = col; g.fillText(txt, 0, 0); g.restore();
        g.save(); g.translate(u * W, (1 - vL) * H); g.scale(1, -1); g.fillStyle = col; g.fillText(txt, 0, 0); g.restore();
      };
      var tcol = cus.paint1 === cus.numColor ? cus.paint3 : cus.numColor;
      drawSide(sp[0], opts.sponsorU || 0.18, opts.sponsorA || 0.62, tcol);
      drawSide(sp[1], opts.sponsorU2 || 0.82, opts.sponsorA || 0.62, tcol);
      g.font = 'bold 18px Arial';
      drawSide(sp[2], 0.5, 0.82, tcol);
    }
    // windows
    var mask = canvas(256, 128), mg = mask.getContext('2d');
    mg.fillStyle = '#fff'; mg.fillRect(0, 0, 256, 128);
    if (glassFn) {
      var tint = 0.25 + (cus.tint || 0) * 0.7;
      var gcol = 'rgb(' + Math.round(40 * (1 - tint) + 8) + ',' + Math.round(52 * (1 - tint) + 10) + ',' + Math.round(64 * (1 - tint) + 14) + ')';
      var gl = new Uint8Array(256 * 128);
      for (var gx = 0; gx < 256; gx++) for (var gy = 0; gy < 128; gy++) if (glassFn((gx + 0.5) / 256, 1 - (gy + 0.5) / 128)) gl[gy * 256 + gx] = 1;
      var trim = cus.trimColor || '#0c0c0d';
      for (gx = 0; gx < 256; gx++) for (gy = 0; gy < 128; gy++) {
        var i0 = gy * 256 + gx;
        if (gl[i0]) {
          g.fillStyle = gcol; g.fillRect(gx * 4, gy * 4, 4, 4);
          mg.fillStyle = '#000'; mg.fillRect(gx, gy, 1, 1);
        } else if ((gx > 0 && gl[i0 - 1]) || (gx < 255 && gl[i0 + 1]) || (gy > 0 && gl[i0 - 256]) || (gy < 127 && gl[i0 + 256])) {
          g.fillStyle = trim; g.fillRect(gx * 4, gy * 4, 4, 4); // rubber window seal
        }
      }
      // windscreen banner across the top of the screen
      if (cus.banner && opts.wsU) {
        var bu0 = opts.wsU[1] - 0.03, bu1 = opts.wsU[1];
        g.fillStyle = cus.bannerColor || '#111111'; g.fillRect(bu0 * W, (1 - 0.58) * H, (bu1 - bu0) * W, 0.16 * H);
        g.save(); g.translate((bu0 + bu1) / 2 * W, 0.5 * H); g.rotate(-Math.PI / 2); g.fillStyle = cus.bannerText || '#ffffff'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(cus.banner).slice(0, 18).toUpperCase(), 0, 0); g.restore();
      }
      // reflections streak
      g.globalAlpha = 0.12; g.fillStyle = '#ffffff';
      for (var rs = 0; rs < 6; rs++) { g.fillRect(rs * 170 + 40, 0, 20, H); }
      g.globalAlpha = 1;
    }
    // driver name under the side window
    if (cus.driverName && opts.nameU) {
      g.font = 'bold 18px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var nv = [0.5 - 0.34 / 2 * 2 * 0.5, 0.5 + 0.34 / 2 * 2 * 0.5];
      g.save(); g.translate(opts.nameU * W, (1 - (0.5 - 0.37 / 2 * 2 * 0.5)) * H); g.scale(-1, 1); g.fillStyle = '#ffffff'; g.fillText(String(cus.driverName).slice(0, 20), 0, 0); g.restore();
      g.save(); g.translate(opts.nameU * W, (1 - (0.5 + 0.37 / 2 * 2 * 0.5)) * H); g.scale(1, -1); g.fillStyle = '#ffffff'; g.fillText(String(cus.driverName).slice(0, 20), 0, 0); g.restore();
    }
    // panel lines and grime
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
    if (opts.doors) opts.doors.forEach(function (u) { g.beginPath(); g.moveTo(u * W, H * 0.12); g.lineTo(u * W, H * 0.4); g.moveTo(u * W, H * 0.6); g.lineTo(u * W, H * 0.88); g.stroke(); });
    if (cus.dirt > 0) {
      var dirtCol = cus.dirtColor || 'rgba(110,80,50,';
      for (var dd = 0; dd < 900 * cus.dirt; dd++) {
        var dyv = R(); var a = Math.abs(dyv - 0.5) * 2; if (a < 0.5 && R() > 0.2) continue;
        g.fillStyle = dirtCol + (0.08 + R() * 0.25 * a) + ')'; g.fillRect(R() * W, (1 - dyv) * H, 2 + R() * 12, 2 + R() * 6);
      }
    }
    var t = tex(c); var mt = new THREE.CanvasTexture(mask);
    return { tex: t, mask: mt, canvas: c, maskCanvas: mask };
  };

  // number / logo decals
  RX.numberDecal = function (cus, w, h, kind) {
    var key = ['num', cus.number, cus.numColor, cus.numStyle, cus.paint1, cus.paint3, kind, cus.numFont].join('|');
    var tx = once(key, function () {
      var c = canvas(256, 256), g = c.getContext('2d');
      g.clearRect(0, 0, 256, 256);
      var style = cus.numStyle;
      if (style === 'roundel') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.fillStyle = '#111'; }
      else if (style === 'square') { g.fillStyle = '#ffffff'; g.fillRect(14, 30, 228, 196); g.fillStyle = '#111'; }
      else if (style === 'outline') { g.fillStyle = cus.numColor; g.strokeStyle = cus.paint3; g.lineWidth = 14; }
      else g.fillStyle = cus.numColor;
      g.font = { serif: 'bold 150px Georgia, serif', stencil: 'bold 150px Impact, Arial Black', script: 'italic bold 140px "Brush Script MT", cursive', mono: 'bold 140px Courier New, monospace' }[cus.numFont] || 'italic bold 150px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (style === 'outline') g.strokeText(String(cus.number), 128, 136);
      if (style !== 'none') g.fillText(String(cus.number), 128, 136);
      var t = tex(c); return t;
    });
    var m = new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    return mesh;
  };

  // ---------- monotone cubic interpolation over keyframe tables ----------
  function pchip(xs, ys) {
    var n = xs.length, d = [], m = [], hs = [];
    for (var i = 0; i < n - 1; i++) { hs.push(xs[i + 1] - xs[i] || 1e-6); d.push((ys[i + 1] - ys[i]) / hs[i]); }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
      var w1 = 2 * hs[i] + hs[i - 1], w2 = hs[i] + 2 * hs[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return function (x) {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      var k = 0; while (x > xs[k + 1]) k++;
      var h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
    };
  }
  RX.profile = function (table) {
    var xs = table.map(function (r) { return r[0]; }), cols = [];
    for (var c = 1; c < table[0].length; c++) cols.push(pchip(xs, table.map(function (r) { return r[c]; })));
    return function (t) { return cols.map(function (f) { return f(t); }); };
  };

  // ---------- lofted body ----------
  // prof(t) -> {hw, yb, belt, x5, y5, y6} (meters). Returns geometry + helpers.
  RX.loft = function (L, prof, opts) {
    opts = opts || {};
    var S = opts.stations || 72, sub = 3;
    var stations = [];
    for (var i = 0; i <= S; i++) {
      // cluster stations toward the ends for rounder noses
      var t = i / S; t = 0.5 - 0.5 * Math.cos(t * Math.PI) * 0.15 + (t - 0.5) * 0.85; t = Math.max(0, Math.min(1, t));
      if (i === 0) t = 0; if (i === S) t = 1;
      var p = prof(t);
      var hw = Math.max(0.001, p.hw), yb = p.yb, belt = Math.max(yb + 0.02, p.belt);
      var right = [
        [0, yb], [hw * 0.82, yb], [hw * 0.985, yb + (belt - yb) * 0.35], [hw, yb + (belt - yb) * 0.75],
        [hw * 0.975, belt], [hw * 0.9, belt + Math.min(0.05, Math.max(0.005, (p.y5 - belt) * 0.15))], [Math.max(0.001, hw * p.x5), p.y5]
      ];
      var top = [0, p.y6];
      var ring = right.concat([top]);
      for (var k = right.length - 1; k >= 1; k--) ring.push([-right[k][0], right[k][1]]);
      // ring is a closed loop of 14 points (bottom centre implicit closure)
      stations.push({ z: (t - 0.5) * L, t: t, ring: ring });
    }
    var RN = stations[0].ring.length; // 14
    var RS = RN * sub; // samples around (closed)
    var pos = [], uv = [], idx = [];
    var vOf = [];
    stations.forEach(function (st) {
      for (var j = 0; j <= RS; j++) {
        var jj = j % RS, seg = Math.floor(jj / sub), f = (jj % sub) / sub;
        var r = st.ring, p0 = r[(seg - 1 + RN) % RN], p1 = r[seg], p2 = r[(seg + 1) % RN], p3 = r[(seg + 2) % RN];
        var tt = f, t2 = tt * tt, t3 = t2 * tt;
        var x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * tt + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        var y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * tt + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        pos.push(x, y, st.z);
        uv.push(st.t, j / RS);
      }
    });
    var W = RS + 1;
    for (i = 0; i < stations.length - 1; i++) for (var j2 = 0; j2 < RS; j2++) {
      var a = i * W + j2, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    // end caps
    [0, stations.length - 1].forEach(function (si, e) {
      var cx = 0, cy = 0; var base = si * W;
      for (var j = 0; j < RS; j++) { cx += pos[(base + j) * 3]; cy += pos[(base + j) * 3 + 1]; }
      var ci = pos.length / 3; pos.push(cx / RS, cy / RS, stations[si].z); uv.push(stations[si].t, 0.5);
      for (j = 0; j < RS; j++) { if (e === 0) idx.push(ci, base + j, base + j + 1); else idx.push(ci, base + j + 1, base + j); }
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // v-coordinate of key ring points (right side); left = 1 - v
    var keyV = []; for (var q = 0; q < RN; q++) keyV.push(q * sub / RS);
    return { geo: geo, keyV: keyV, stations: stations };
  };

  // ---------- wheels ----------
  function tireGeo(r, w, profile) {
    // cross-section of a tyre: rounded rectangle from rim radius to tread
    var rim = r * (1 - profile), pts = [];
    var hw = w / 2, rr = Math.min(hw * 0.45, (r - rim) * 0.45);
    pts.push(new THREE.Vector2(rim, -hw * 0.92));
    pts.push(new THREE.Vector2(r - rr, -hw));
    for (var i = 0; i <= 5; i++) { var a = -Math.PI / 2 + i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, -hw + rr + Math.sin(a) * rr)); }
    for (i = 0; i <= 5; i++) { a = i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, hw - rr + Math.sin(a) * rr)); }
    pts.push(new THREE.Vector2(rim, hw * 0.92));
    var g = new THREE.LatheGeometry(pts, 40);
    g.rotateZ(Math.PI / 2); // axis along x
    return g;
  }
  function tireWallTex(kind, color) {
    return once('tw' + kind + color, function () {
      var c = canvas(512, 32), g = c.getContext('2d');
      g.fillStyle = '#18181a'; g.fillRect(0, 0, 512, 32);
      if (kind === 'letters') { g.fillStyle = color || '#f2f2f2'; g.font = 'bold 20px Arial'; g.fillText('RACING  SLICK   APEX   RACING  SLICK   APEX', 4, 23); }
      if (kind === 'redline') { g.fillStyle = '#c01818'; g.fillRect(0, 12, 512, 5); }
      if (kind === 'whitewall') { g.fillStyle = '#eeeeea'; g.fillRect(0, 6, 512, 16); }
      if (kind === 'stripe') { g.fillStyle = color || '#ffd400'; g.fillRect(0, 13, 512, 3); }
      var t = tex(c); return t;
    });
  }

  RX.buildWheel = function (r, w, style, cus, opts) {
    opts = opts || {};
    var M = RX.mats();
    var profile = opts.profile || 0.35;
    var pivot = new THREE.Group(); // steering pivot (at hub)
    var spin = new THREE.Group(); pivot.add(spin);
    var side = opts.side || 1; // +1 = wheel on +x side (outer face toward +x)
    // tyre
    var tex = RX.tyreTex ? RX.tyreTex(opts.tread || 'medium', cus.tireWall || 'plain', cus.wallColor || cus.paint3) : null;
    var tm = tex ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.88 }) : M.rubber;
    if (tex) tex.repeat.x = Math.max(1, Math.round(r * 6));
    var tyre = new THREE.Mesh(tireGeo(r, w, profile), tm);
    spin.add(tyre);
    // tread blocks for off-road tyres
    if (opts.knobby) {
      var kg = new THREE.BoxGeometry(w * 0.42, 0.04, 0.07);
      for (var k = 0; k < 28; k++) {
        var a = k / 28 * Math.PI * 2;
        [-1, 1].forEach(function (sd) {
          var kn = new THREE.Mesh(kg, M.rubber);
          kn.position.set(sd * w * 0.22, Math.cos(a + sd * 0.1) * r, Math.sin(a + sd * 0.1) * r);
          kn.rotation.x = -(a + sd * 0.1); spin.add(kn);
        });
      }
    }
    var rim = r * (1 - profile);
    var rimMat = cus.rimFinish === 'chrome' ? M.chrome : new THREE.MeshStandardMaterial({
      color: cus.rimColor || '#c0c4ca', roughness: cus.rimFinish === 'matte' ? 0.7 : 0.3, metalness: cus.rimFinish === 'matte' ? 0.3 : 0.85
    });
    // rim barrel + lip
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.97, rim * 0.97, w * 0.86, 28, 1, true), M.steel);
    barrel.rotation.z = Math.PI / 2; spin.add(barrel);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(rim * 0.98, Math.max(0.006, rim * 0.035), 6, 32), rimMat);
    lip.rotation.y = Math.PI / 2; lip.position.x = side * w * 0.42; spin.add(lip);
    var face = new THREE.Group(); face.position.x = side * w * 0.3; spin.add(face);
    var hubR = rim * 0.22;
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(hubR, hubR * 1.1, 0.05, 16), rimMat);
    hub.rotation.z = Math.PI / 2; face.add(hub);
    var nut = new THREE.Mesh(new THREE.CylinderGeometry(hubR * 0.45, hubR * 0.45, 0.07, 6), opts.knockoff ? M.chrome : M.steel);
    nut.rotation.z = Math.PI / 2; nut.position.x = side * 0.03; face.add(nut);
    function spokes(n, width, depth, twist, mat) {
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2;
        var sp = new THREE.Mesh(new THREE.BoxGeometry(depth, rim * 0.78, width), mat || rimMat);
        sp.position.set(0, Math.cos(a) * rim * 0.55, Math.sin(a) * rim * 0.55);
        sp.rotation.x = -a; sp.rotation.y = twist || 0; face.add(sp);
      }
    }
    switch (style) {
      case 'spoke5': spokes(5, rim * 0.28, 0.04); break;
      case 'spoke7': spokes(7, rim * 0.2, 0.04); break;
      case 'spokeY': spokes(5, rim * 0.12, 0.04, 0.0); spokes(10, rim * 0.07, 0.035, 0.25); break;
      case 'multi10': spokes(10, rim * 0.1, 0.035); break;
      case 'split': spokes(12, rim * 0.08, 0.03, 0.15); break;
      case 'mesh':
        spokes(16, rim * 0.05, 0.025, 0.5); spokes(16, rim * 0.05, 0.025, -0.5); break;
      case 'monoblock':
        spokes(10, rim * 0.13, 0.05, 0.1); break;
      case 'aero':
        var cover = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.95, rim * 0.95, 0.03, 28), rimMat);
        cover.rotation.z = Math.PI / 2; face.add(cover); break;
      case 'dish':
        var dish = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.95, rim * 0.6, 0.06, 28), rimMat);
        dish.rotation.z = Math.PI / 2 * side; face.add(dish);
        for (var hh = 0; hh < 8; hh++) { var hl = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.09, rim * 0.09, 0.07, 10), M.black); var aa = hh / 8 * 6.283; hl.position.set(0, Math.cos(aa) * rim * 0.62, Math.sin(aa) * rim * 0.62); hl.rotation.z = Math.PI / 2; face.add(hl); }
        break;
      case 'turbofan':
        var tf = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.92, rim * 0.92, 0.03, 28), rimMat); tf.rotation.z = Math.PI / 2; face.add(tf);
        for (var fb = 0; fb < 14; fb++) { var bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, rim * 0.5, rim * 0.1), M.black); var fa = fb / 14 * 6.283; bl.position.set(side * 0.01, Math.cos(fa) * rim * 0.55, Math.sin(fa) * rim * 0.55); bl.rotation.x = -fa; bl.rotation.y = 0.6; face.add(bl); }
        break;
      case 'wire':
        var wg = new THREE.CylinderGeometry(0.004, 0.004, rim * 0.95, 3);
        for (var wi = 0; wi < 36; wi++) {
          var wa = wi / 36 * Math.PI * 2, off = (wi % 2 ? 1 : -1) * w * 0.25;
          var wire = new THREE.Mesh(wg, M.chrome);
          var p1 = new V3(-side * w * 0.3 + off * side * 0.4, 0, 0), p2 = new V3(off - side * w * 0.3, Math.cos(wa) * rim * 0.95, Math.sin(wa) * rim * 0.95);
          wire.position.copy(p1).add(p2).multiplyScalar(0.5);
          wire.lookAt(new V3().copy(p2).add(face.position)); wire.rotateX(Math.PI / 2);
          wire.quaternion.setFromUnitVectors(new V3(0, 1, 0), p2.clone().sub(p1).normalize());
          wire.scale.y = p2.distanceTo(p1) / (rim * 0.95);
          face.add(wire);
        }
        nut.scale.set(1.4, 2.2, 1.4);
        var ear = new THREE.Mesh(new THREE.BoxGeometry(0.02, hubR * 2.4, 0.02), M.chrome); ear.position.x = side * 0.06; face.add(ear);
        break;
      case 'steelie':
        var st = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.92, rim * 0.92, 0.035, 28), rimMat); st.rotation.z = Math.PI / 2; face.add(st);
        for (var sh = 0; sh < 6; sh++) { var so = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.1, rim * 0.1, 0.04, 10), M.black); var sa = sh / 6 * 6.283; so.position.set(side * 0.003, Math.cos(sa) * rim * 0.6, Math.sin(sa) * rim * 0.6); so.rotation.z = Math.PI / 2; face.add(so); }
        break;
      case 'beadlock':
        spokes(8, rim * 0.16, 0.05);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(rim * 0.93, rim * 0.06, 6, 28), rimMat); ring.rotation.y = Math.PI / 2; ring.position.x = side * 0.02; face.add(ring);
        for (var bb = 0; bb < 24; bb++) { var bolt = new THREE.Mesh(new THREE.SphereGeometry(rim * 0.025, 5, 4), M.steel); var ba = bb / 24 * 6.283; bolt.position.set(side * 0.05, Math.cos(ba) * rim * 0.93, Math.sin(ba) * rim * 0.93); face.add(bolt); }
        break;
      case 'kart':
        var kc = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.92, rim * 0.92, 0.02, 20), rimMat); kc.rotation.z = Math.PI / 2; face.add(kc);
        for (var kh = 0; kh < 6; kh++) { var ko = new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.16, rim * 0.16, 0.03, 8), M.black); var ka = kh / 6 * 6.283; ko.position.set(side * 0.003, Math.cos(ka) * rim * 0.55, Math.sin(ka) * rim * 0.55); ko.rotation.z = Math.PI / 2; face.add(ko); }
        break;
      default: spokes(5, rim * 0.24, 0.04);
    }
    // brake disc + caliper (caliper does not spin)
    if (!opts.noBrake) {
      var discR = rim * 0.78;
      if (!M.disc.map && RX.discTex) { M.disc.map = RX.discTex(true); M.disc.needsUpdate = true; }
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR, 0.03, 24), M.disc);
      disc.rotation.z = Math.PI / 2; disc.position.x = -side * 0.02; spin.add(disc);
      var calMat = new THREE.MeshStandardMaterial({ color: cus.caliperColor || '#d01818', roughness: 0.4, metalness: 0.3 });
      var cal = new THREE.Mesh(new THREE.BoxGeometry(0.07, discR * 0.55, discR * 0.35), calMat);
      cal.position.set(0, discR * 0.65, -discR * 0.45); cal.rotation.x = 0.6;
      pivot.add(cal);
    }
    pivot.userData = { r: r, w: w };
    return { pivot: pivot, spin: spin, r: r, w: w };
  };

  // ---------- driver ----------
  RX.helmetTex = function (cus, vintage) {
    var key = 'helm' + cus.helmetColor + cus.helmetColor2 + cus.helmetDesign + (vintage ? 'v' : '');
    return once(key, function () {
      var c = canvas(256, 128), g = c.getContext('2d');
      g.fillStyle = vintage ? '#6b4a2d' : cus.helmetColor; g.fillRect(0, 0, 256, 128);
      if (!vintage) {
        g.fillStyle = cus.helmetColor2;
        switch (cus.helmetDesign) {
          case 0: g.fillRect(0, 50, 256, 18); break;
          case 1: for (var i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 64); g.lineTo(i * 32 + 32, 0); g.fill(); } break;
          case 2: g.beginPath(); g.arc(64, 40, 26, 0, 7); g.arc(192, 40, 26, 0, 7); g.fill(); break;
          case 3: g.fillRect(118, 0, 20, 128); g.fillRect(0, 70, 256, 10); break;
          case 4: for (var s = 0; s < 6; s++) { g.fillRect(0, s * 22, 256, 7); } break;
          case 5: g.beginPath(); g.moveTo(0, 90); g.quadraticCurveTo(128, 0, 256, 90); g.lineTo(256, 128); g.lineTo(0, 128); g.fill(); break;
        }
      }
      return tex(c);
    });
  };

  RX.buildDriver = function (cus, opts) {
    opts = opts || {};
    var M = RX.mats();
    var g = new THREE.Group();
    var vintage = opts.vintage || cus.helmetType === 'open';
    var suit = new THREE.MeshStandardMaterial({ color: vintage ? '#d8cfbd' : cus.suitColor, roughness: 0.8 });
    var glove = new THREE.MeshStandardMaterial({ color: vintage ? '#5a3a22' : cus.gloveColor, roughness: 0.8 });
    // torso (leaning back for single-seaters)
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.55, 10), suit);
    torso.position.set(0, 0.28, 0); torso.rotation.x = -(opts.recline || 0.2); g.add(torso);
    var shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), suit);
    shoulders.position.set(0, 0.52, -0.05 - (opts.recline || 0.2) * 0.25); g.add(shoulders);
    // HANS / collar
    if (!vintage) { var hans = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.22), M.carbon); hans.position.set(0, 0.6, -0.08 - (opts.recline || 0.2) * 0.25); g.add(hans); }
    var headPivot = new THREE.Group(); headPivot.position.set(0, 0.68, -0.02 - (opts.recline || 0.2) * 0.3); g.add(headPivot);
    var hmat = new THREE.MeshPhysicalMaterial({ map: RX.helmetTex(cus, vintage), roughness: vintage ? 0.8 : 0.2, clearcoat: vintage ? 0 : 1 });
    var helmet;
    if (vintage) {
      helmet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hmat);
      var face = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), cus.skinTone ? new THREE.MeshStandardMaterial({ color: cus.skinTone, roughness: 0.7 }) : M.skin); face.position.set(0, -0.02, 0.01); headPivot.add(face);
      var goggles = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), M.chrome);
      [-0.045, 0.045].forEach(function (x) { var gg = goggles.clone(); gg.position.set(x, 0.02, 0.1); headPivot.add(gg); });
    } else {
      helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 16), hmat);
      helmet.scale.set(1, 1.05, 1.12);
      var vcol = { smoke: 0x111820, clear: 0x8a9aa8, gold: 0xb8860b, blue: 0x1a4a9a, red: 0x8a1a1a }[cus.visor] || 0x111820;
      var visor = new THREE.Mesh(new THREE.SphereGeometry(0.138, 18, 10, -0.9, 1.8, 1.25, 0.55), new THREE.MeshPhysicalMaterial({ color: vcol, roughness: 0.05, metalness: cus.visor === 'gold' || cus.visor === 'blue' ? 0.95 : 0.6, clearcoat: 1 }));
      visor.rotation.y = 0; visor.scale.set(1, 1.05, 1.12); headPivot.add(visor);
      var chin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.08), hmat); chin.position.set(0, -0.09, 0.09); headPivot.add(chin);
    }
    headPivot.add(helmet);
    // arms: shoulder anchors, solved each frame toward hands on the wheel
    var armMat = suit;
    var arms = [];
    [-1, 1].forEach(function (s) {
      var up = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.037, 1, 10), armMat);
      var lo = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 1, 10), armMat);
      var hand = RX.buildGlove ? RX.buildGlove(glove, s) : new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glove);
      g.add(up); g.add(lo); g.add(hand);
      arms.push({ s: s, up: up, lo: lo, hand: hand, shoulder: new V3(s * 0.19, 0.5, -0.05 - (opts.recline || 0.2) * 0.25) });
    });
    // legs (only visible on karts / open cockpits)
    if (opts.legs) {
      [-1, 1].forEach(function (s) {
        var th = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8), suit);
        th.position.set(s * 0.1, 0.12, 0.25); th.rotation.x = Math.PI / 2 - 0.5; g.add(th);
        var sh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.45, 8), suit);
        sh.position.set(s * 0.12, 0.12, 0.6); sh.rotation.x = Math.PI / 2 + 0.4; g.add(sh);
        var boot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.2), M.black); boot.position.set(s * 0.12, 0.05, 0.82); g.add(boot);
      });
    }
    g.userData = { arms: arms, head: headPivot, helmet: helmet, recline: opts.recline || 0.2 };
    return g;
  };

  var tmpA = new V3(), tmpB = new V3(), tmpE = new V3(), up = new V3(0, 1, 0);
  function placeLimb(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    tmpE.copy(b).sub(a); var len = tmpE.length();
    mesh.scale.set(1, Math.max(0.01, len), 1);
    mesh.quaternion.setFromUnitVectors(up, tmpE.normalize());
  }
  RX.placeLimb = placeLimb;
  // hands is array of 2 Vector3 in driver-local space
  RX.poseArms = function (driver, hands) {
    var arms = driver.userData.arms;
    for (var i = 0; i < 2; i++) {
      var a = arms[i], sh = a.shoulder, h = hands[i];
      // elbow: midpoint pushed outward and down
      tmpA.copy(sh).add(h).multiplyScalar(0.5);
      var d = sh.distanceTo(h), bend = Math.sqrt(Math.max(0, 0.29 * 0.29 - (d / 2) * (d / 2)));
      tmpA.x += a.s * bend * 0.8; tmpA.y -= bend * 0.6;
      placeLimb(a.up, sh, tmpA); placeLimb(a.lo, tmpA, h);
      a.hand.position.copy(h);
    }
  };

  // ---------- steering wheels ----------
  RX.buildSteeringWheel = function (kind) {
    var M = RX.mats(), g = new THREE.Group();
    var R = 0.17;
    if (kind === 'formula') {
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.04), M.carbon); g.add(body);
      [-1, 1].forEach(function (s) {
        var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 10), M.rubber); grip.position.set(s * 0.15, 0, 0); g.add(grip);
      });
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), new THREE.MeshBasicMaterial({ color: 0x113322 }));
      // the face the driver sees points along -z (toward the seat)
      scr.position.z = -0.021; scr.rotation.y = Math.PI; g.add(scr); g.userData.screen = scr;
      for (var b = 0; b < 8; b++) { var btn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), b % 3 ? M.red : M.alu); btn.rotation.x = Math.PI / 2; btn.position.set(-0.115 + (b % 4) * 0.025 + (b % 4 > 1 ? 0.13 : 0), b < 4 ? 0.04 : -0.04, -0.022); g.add(btn); }
      g.userData.R = 0.15; g.userData.flat = true;
    } else if (kind === 'wood') {
      var rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 32), M.wood); g.add(rim);
      for (var s = 0; s < 4; s++) { var sp = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.2, 0.004), M.alu); sp.rotation.z = s * Math.PI / 2 + Math.PI / 4; sp.position.set(Math.cos(s * Math.PI / 2 + Math.PI / 4) * -0.1, Math.sin(s * Math.PI / 2 + Math.PI / 4) * -0.1, 0); sp.position.set(0, 0, 0); sp.translateY(0.1); g.add(sp); }
      g.userData.R = 0.2;
    } else {
      var rim2 = new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 8, 32), M.rubber); g.add(rim2);
      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), M.plastic); hub.rotation.x = Math.PI / 2; g.add(hub);
      [0, Math.PI * 0.7, -Math.PI * 0.7].forEach(function (a) { var sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, R, 0.01), M.alu); sp.rotation.z = a; sp.translateY(-R / 2); g.add(sp); });
      var mark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.035), new THREE.MeshBasicMaterial({ color: 0xffcc00 })); mark.position.y = R; g.add(mark);
      g.userData.R = R;
    }
    return g;
  };

  // ---------- merge static meshes per material ----------
  RX.mergeStatic = function (root) {
    root.updateMatrixWorld(true);
    var inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    var buckets = {}, remove = [];
    root.traverse(function (o) {
      if (!o.isMesh || o.userData.dyn) return;
      // skip anything below a dynamic ancestor
      var p = o.parent; while (p && p !== root) { if (p.userData.dyn) return; p = p.parent; }
      var m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      var geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(m);
      if (m.determinant() < 0) { // mirrored: flip winding
        var pa = geo.attributes.position.array;
        for (var i = 0; i < pa.length; i += 9) for (var k = 0; k < 3; k++) { var t = pa[i + 3 + k]; pa[i + 3 + k] = pa[i + 6 + k]; pa[i + 6 + k] = t; }
        geo.computeVertexNormals();
      }
      var key = o.material.uuid;
      (buckets[key] || (buckets[key] = { mat: o.material, geos: [], shadow: o.castShadow !== false })).geos.push(geo);
      remove.push(o);
    });
    remove.forEach(function (o) { o.parent.remove(o); });
    Object.keys(buckets).forEach(function (k) {
      var b = buckets[k], n = 0;
      b.geos.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), off = 0;
      b.geos.forEach(function (g) {
        pos.set(g.attributes.position.array, off * 3);
        if (!g.attributes.normal) g.computeVertexNormals();
        nor.set(g.attributes.normal.array, off * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
        off += g.attributes.position.count;
        g.dispose();
      });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      var mesh = new THREE.Mesh(geo, b.mat);
      mesh.castShadow = !b.mat.transparent; mesh.receiveShadow = true;
      root.add(mesh);
    });
  };

  RX.box = function (w, h, d, mat, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(m); return m;
  };
  RX.cyl = function (r1, r2, h, mat, seg, parent) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 12), mat); if (parent) parent.add(m); return m;
  };
  // cylinder between two points
  RX.rod = function (a, b, r, mat, parent) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 6), mat);
    placeLimb(m, a, b); if (parent) parent.add(m); return m;
  };
})();
