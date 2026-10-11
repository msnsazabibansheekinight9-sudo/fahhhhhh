// Customisation: the procedural armoury (~240 extra weapons), weapon attachments and finishes,
// and trooper appearance options (colours, helmets, markings, pauldrons, kamas, capes, packs, build).
var SF = window.SF || (window.SF = {});

(function () {
  var D = SF.D, C = SF.Custom = {};

  // ------------------------------------------------------------------ procedural armoury
  var MAKERS = {
    concord: [['VA', 'Valken Arms'], ['MD', 'Merr Dynamics'], ['CX', 'Corvex Armory']],
    syndicate: [['BT', 'Baktech Foundries'], ['TO', 'Tarn Ordnance'], ['SK', 'Syndicate Kilnworks']],
    alliance: [['DX', 'Drexx Arms'], ['SW', 'Sorrin Works'], ['HR', 'Halcyon Repeaters']],
    dominion: [['DA', 'Dominion Arsenal'], ['IM', 'Imperial Mesa'], ['KR', 'Krell Ballistics']],
    rangers: [['WL', 'Westline'], ['CF', 'Clan Forge'], ['RR', 'Rimrunner Customs']],
    remnant: [['SL', 'Shadowline'], ['DA', 'Dominion Arsenal'], ['VT', 'Vantablack Works']]
  };
  var BASE = {
    carbine: { dmg: 23, rpm: 420, heat: 6.6, spread: 1.4, speed: 220, range: 52 },
    rifle: { dmg: 31, rpm: 300, heat: 8.6, spread: 1.0, speed: 235, range: 75 },
    repeater: { dmg: 17, rpm: 660, heat: 2.6, spread: 2.1, speed: 215, range: 50 },
    sniper: { dmg: 98, rpm: 55, heat: 34, spread: 0.12, speed: 440, range: 240, zoom: 4.5 },
    pistol: { dmg: 28, rpm: 340, heat: 9, spread: 1.1, speed: 220, range: 40 },
    hpistol: { dmg: 54, rpm: 135, heat: 19, spread: 0.6, speed: 235, range: 45 },
    shotgun: { dmg: 14, rpm: 88, heat: 30, spread: 6, speed: 180, range: 14, pellets: 8 },
    launcher: { dmg: 150, rpm: 36, heat: 68, spread: 0.4, speed: 72, range: 200, radius: 5, antiv: 2.5 },
    flamer: { dmg: 7, rpm: 900, heat: 1.7, spread: 8, speed: 28, range: 11 },
    ion: { dmg: 34, rpm: 240, heat: 9, spread: 1, speed: 210, range: 60, antiv: 2.8 }
  };
  var WORDS = {
    carbine: ['Patrol Carbine', 'Strike Carbine', 'Recon Carbine', 'Shock Carbine', 'Compact Carbine', 'Breacher Carbine'],
    rifle: ['Battle Rifle', 'Assault Rifle', 'Line Rifle', 'Marksman Rifle', 'Burst Rifle', 'Service Rifle'],
    repeater: ['Light Repeater', 'Heavy Repeater', 'Rotary Cannon', 'Suppressor', 'Squad Repeater'],
    sniper: ['Longrifle', 'Precision Rifle', 'Hunting Rifle', 'Anti-Materiel Rifle', 'Slug Thrower'],
    pistol: ['Sidearm', 'Holdout Pistol', 'Machine Pistol', 'Service Pistol', 'Duelling Pistol'],
    hpistol: ['Heavy Pistol', 'Hand Cannon', 'Magnum Blaster', 'Revolver'],
    shotgun: ['Scattergun', 'Riot Blaster', 'Boarding Shotgun', 'Pump Scatter'],
    launcher: ['Rocket Tube', 'Smart Launcher'],
    flamer: ['Incinerator'],
    ion: ['Ion Carbine', 'Disruptor']
  };
  var PLAN = [['carbine', 6], ['rifle', 6], ['repeater', 5], ['sniper', 5], ['pistol', 5], ['hpistol', 4], ['shotgun', 4], ['launcher', 2], ['flamer', 1], ['ion', 2]];
  function hrng(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h += 0x6D2B79F5; var t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var CLASS_KINDS = {
    assault: ['carbine', 'rifle', 'shotgun', 'ion'], heavy: ['repeater', 'launcher', 'flamer'], specialist: ['sniper', 'hpistol', 'rifle'],
    officer: ['pistol', 'hpistol', 'carbine'], engineer: ['shotgun', 'carbine', 'ion'], commando: ['carbine', 'rifle', 'shotgun', 'hpistol'],
    jet: ['pistol', 'hpistol', 'carbine'], infiltrator: ['carbine', 'rifle', 'hpistol'], enforcer: ['repeater', 'flamer', 'shotgun'], aerial: ['carbine', 'rifle']
  };
  C.generated = [];
  Object.keys(MAKERS).forEach(function (fid) {
    var mk = MAKERS[fid];
    PLAN.forEach(function (pl) {
      var kind = pl[0];
      for (var i = 0; i < pl[1]; i++) {
        var id = 'g_' + fid + '_' + kind + i;
        var R = hrng(id);
        var m = mk[(i + kind.length) % mk.length];
        var b = BASE[kind];
        var power = 0.85 + R() * 0.35;          // trades damage for fire rate
        var w = {
          id: id, name: m[0] + '-' + (10 + ((R() * 89) | 0)) + ' ' + WORDS[kind][i % WORDS[kind].length], kind: kind, maker: m[1],
          dmg: Math.round(b.dmg * power * 10) / 10, rpm: Math.round(b.rpm / Math.pow(power, 1.15) / 5) * 5, heat: Math.round(b.heat * (0.85 + R() * 0.3) * 10) / 10,
          spread: Math.round(b.spread * (0.75 + R() * 0.5) * 100) / 100, speed: Math.round(b.speed * (0.9 + R() * 0.2)), range: Math.round(b.range * (0.85 + R() * 0.3)),
          pellets: b.pellets || 1, cool: 32 + Math.round(R() * 14), zoom: b.zoom || (kind === 'rifle' ? 1.6 : 1.35), price: 600 + Math.round(R() * 30) * 150,
          radius: b.radius, antiv: b.antiv, faction: fid,
          look: { len: 0.85 + R() * 0.4, stock: (R() * 3) | 0, scope: R() < 0.45, mag: (R() * 3) | 0, shroud: R() < 0.5, fins: R() < 0.35, twin: kind === 'rifle' && R() < 0.2 }
        };
        if (kind === 'rifle' && R() < 0.3) w.burst = 3;
        if (kind === 'carbine' && R() < 0.15) w.burst = 3;
        if (kind === 'launcher' && i === 1) w.homing = true;
        if (kind === 'sniper' && R() < 0.2 && fid === 'remnant') w.disintegrate = true;
        w.desc = m[1] + ' ' + kind + '.';
        D.weapons[id] = w;
        C.generated.push(id);
        var lo = D.loadouts[fid];
        Object.keys(CLASS_KINDS).forEach(function (cls) { if (CLASS_KINDS[cls].indexOf(kind) >= 0 && lo[cls]) lo[cls].push(id); });
      }
    });
  });

  // ------------------------------------------------------------------ attachments
  // effect multipliers: dmg, rpm, heat, spread, range, speed, cool; zoom absolute
  D.attachments = {
    optic: [
      { id: 'none', name: 'Iron Sights', price: 0, fx: {} },
      { id: 'dot', name: 'Reflex Dot', price: 600, fx: { spread: 0.9 }, desc: 'Cleaner aim, small zoom.', zoom: 1.5 },
      { id: 'holo', name: 'Holo Sight', price: 900, fx: { spread: 0.88 }, zoom: 1.8 },
      { id: 'x2', name: '2× Scope', price: 1200, fx: { spread: 0.85, range: 1.1 }, zoom: 2.2 },
      { id: 'x4', name: '4× Scope', price: 1600, fx: { spread: 0.8, range: 1.2 }, zoom: 4 },
      { id: 'x8', name: '8× Long Scope', price: 2200, fx: { spread: 0.75, range: 1.35 }, zoom: 7 },
      { id: 'thermal', name: 'Thermal Scope', price: 2500, fx: { spread: 0.85 }, zoom: 3, desc: 'Highlights enemies in smoke.' }
    ],
    barrel: [
      { id: 'std', name: 'Standard Barrel', price: 0, fx: {} },
      { id: 'long', name: 'Extended Barrel', price: 1000, fx: { range: 1.3, speed: 1.15, rpm: 0.92 } },
      { id: 'short', name: 'Compact Barrel', price: 1000, fx: { rpm: 1.1, range: 0.8, spread: 1.1 } },
      { id: 'heavy', name: 'Heavy Barrel', price: 1400, fx: { dmg: 1.12, rpm: 0.88, heat: 1.1 } },
      { id: 'brake', name: 'Muzzle Brake', price: 1200, fx: { spread: 0.85 } },
      { id: 'supp', name: 'Bolt Suppressor', price: 1500, fx: { dmg: 0.95, spread: 0.92 }, desc: 'Firing no longer shows you on enemy maps.' }
    ],
    grip: [
      { id: 'none', name: 'No Grip', price: 0, fx: {} },
      { id: 'vert', name: 'Vertical Grip', price: 700, fx: { spread: 0.85 } },
      { id: 'angled', name: 'Angled Grip', price: 800, fx: { spread: 0.92, rpm: 1.03 } },
      { id: 'bipod', name: 'Folding Bipod', price: 1100, fx: { spread: 0.7 }, desc: 'Best when crouched.' }
    ],
    cooling: [
      { id: 'std', name: 'Standard Cooling', price: 0, fx: {} },
      { id: 'rapid', name: 'Rapid Vent Coils', price: 1100, fx: { cool: 1.35 } },
      { id: 'sink', name: 'Large Heat Sink', price: 1300, fx: { heat: 0.8, cool: 0.9 } },
      { id: 'cryo', name: 'Cryo Jacket', price: 2000, fx: { heat: 0.85, cool: 1.15 } }
    ],
    cell: [
      { id: 'std', name: 'Standard Cell', price: 0, fx: {} },
      { id: 'hv', name: 'High-Velocity Cell', price: 1000, fx: { speed: 1.35 } },
      { id: 'over', name: 'Overcharged Cell', price: 1800, fx: { dmg: 1.1, heat: 1.15 } },
      { id: 'pierce', name: 'Armour-Piercing Cell', price: 1600, fx: { antiv: 1.8, dmg: 0.95 } },
      { id: 'ion', name: 'Ion Cell', price: 1400, fx: { antiv: 2.2, dmg: 0.9 }, color: 0x6ab0ff }
    ]
  };
  D.attachById = {};
  Object.keys(D.attachments).forEach(function (slot) { D.attachments[slot].forEach(function (a) { a.slot = slot; D.attachById[slot + ':' + a.id] = a; }); });
  D.finishes = [
    { id: 'std', name: 'Factory', body: null, price: 0 },
    { id: 'black', name: 'Gunmetal Black', body: 0x15161a, acc: 0x3a3c42, price: 400 },
    { id: 'desert', name: 'Desert Tan', body: 0xb89a6a, acc: 0x6a5a3a, price: 600 },
    { id: 'woodland', name: 'Woodland', body: 0x4a5a32, acc: 0x2a3220, price: 600 },
    { id: 'arctic', name: 'Arctic White', body: 0xe8ecf0, acc: 0x9aa8b8, price: 600 },
    { id: 'urban', name: 'Urban Grey', body: 0x6a6e74, acc: 0x3a3c40, price: 600 },
    { id: 'crimson', name: 'Crimson', body: 0x8a1a1a, acc: 0x2a0a0a, price: 900 },
    { id: 'navy', name: 'Fleet Navy', body: 0x1a2a4a, acc: 0x8a9ab8, price: 900 },
    { id: 'olive', name: 'Olive Drab', body: 0x5a5a3a, acc: 0x3a3a24, price: 600 },
    { id: 'carbon', name: 'Carbon Weave', body: 0x222326, acc: 0x55585e, price: 1200, metal: 0.3 },
    { id: 'chrome', name: 'Chrome', body: 0xd8dce4, acc: 0x9aa0aa, price: 2500, metal: 1, rough: 0.12 },
    { id: 'gold', name: 'Gilded', body: 0xd8b04a, acc: 0x6a4a1a, price: 3000, metal: 1, rough: 0.2 },
    { id: 'ferro', name: 'Ferrosteel', body: 0xb8bcc4, acc: 0x5a5e66, price: 2800, metal: 0.95, rough: 0.25 },
    { id: 'violet', name: 'Violet Anodised', body: 0x4a2a7a, acc: 0xb08ae8, price: 1500, metal: 0.6 },
    { id: 'teal', name: 'Teal Anodised', body: 0x1a6a6a, acc: 0x8ae8e8, price: 1500, metal: 0.6 },
    { id: 'orange', name: 'Hazard Orange', body: 0xd86a1a, acc: 0x2a2a2a, price: 800 },
    { id: 'ivory', name: 'Ivory & Brass', body: 0xe8dcc0, acc: 0xb8903a, price: 1800, metal: 0.4 },
    { id: 'obsidian', name: 'Obsidian Glow', body: 0x0a0a0c, acc: 0xff3a2a, price: 3500, emissiveAcc: true }
  ];
  D.finishById = {}; D.finishes.forEach(function (f) { D.finishById[f.id] = f; });

  C.applyMods = function (base, mods) {
    if (!mods) return base;
    var w = Object.assign({}, base);
    ['optic', 'barrel', 'grip', 'cooling', 'cell'].forEach(function (slot) {
      var a = D.attachById[slot + ':' + (mods[slot] || '')];
      if (!a) return;
      var fx = a.fx;
      if (fx.dmg) w.dmg *= fx.dmg; if (fx.rpm) w.rpm *= fx.rpm; if (fx.heat) w.heat *= fx.heat; if (fx.spread) w.spread *= fx.spread;
      if (fx.range) w.range *= fx.range; if (fx.speed) w.speed *= fx.speed; if (fx.cool) w.cool *= fx.cool; if (fx.antiv) w.antiv = (w.antiv || 1) * fx.antiv;
      if (a.zoom) w.zoom = Math.max(w.zoom || 1, a.zoom);
      if (a.id === 'supp') w.silent = true;
      if (a.color) w.boltColor = a.color;
    });
    w.mods = mods;
    return w;
  };
  C.statLine = function (w) {
    return Math.round(w.dmg * 10) / 10 + (w.pellets > 1 ? '×' + w.pellets : '') + ' dmg · ' + Math.round(w.rpm) + ' rpm · heat ' + Math.round(w.heat * 10) / 10 + ' · spread ' + Math.round(w.spread * 100) / 100 + '° · range ' + Math.round(w.range) + ' m';
  };

  // ------------------------------------------------------------------ appearance options
  D.colors = [
    ['Legion White', 0xe8e6df], ['Bone', 0xd8ccb0], ['Sand', 0xc8a874], ['Rust', 0x9a4a2a], ['Crimson', 0xa01818], ['Maroon', 0x5a1414], ['Orange', 0xd86a1a],
    ['Gold', 0xd8b04a], ['Olive', 0x5a5a3a], ['Forest', 0x3a5a32], ['Jungle', 0x3a8a3a], ['Teal', 0x1a7a7a], ['Sky', 0x4a8ad8], ['Legion Blue', 0x2f63c4],
    ['Navy', 0x1a2a4a], ['Violet', 0x6a2aa0], ['Magenta', 0xa02a7a], ['Slate', 0x5a6070], ['Gunmetal', 0x3a3c42], ['Charcoal', 0x222326], ['Black', 0x0e0e10], ['Chrome', 0xd8dce4]
  ];
  D.visorColors = [['Black', 0x101418], ['Smoke', 0x2a2e36], ['Red', 0xc8102e], ['Amber', 0xd88a1a], ['Green', 0x2ac84a], ['Blue', 0x2a6ad8], ['Gold', 0xd8b04a], ['Mirror', 0xb8c8d8]];
  D.lookOptions = {
    helmet: [['std', 'Standard', 0], ['crest', 'Crested', 600], ['pilot', 'Pilot', 800], ['scout', 'Scout Visor', 800], ['heavy', 'Heavy Plated', 1000], ['commander', 'Commander', 1500], ['hood', 'Hooded', 1200], ['bare', 'No Helmet', 500]],
    marking: [['none', 'None', 0], ['stripe', 'Centre Stripe', 0], ['chevron', 'Chevrons', 400], ['band', 'Shoulder Bands', 300], ['split', 'Half & Half', 600], ['tally', 'Kill Tally', 500], ['sigil', 'Clan Sigil', 900], ['tiger', 'Tiger Stripes', 1000]],
    pauldron: [['none', 'None', 0], ['left', 'Left Pauldron', 300], ['both', 'Both Pauldrons', 500], ['officer', 'Officer Cape-Pauldron', 900], ['spiked', 'Spiked Pauldron', 800]],
    kama: [['none', 'None', 0], ['short', 'Short Kama', 500], ['long', 'Long Kama', 800], ['tabard', 'Tabard', 700]],
    cape: [['none', 'None', 0], ['short', 'Short Cape', 700], ['long', 'Long Cape', 1000], ['poncho', 'Poncho', 900], ['scarf', 'Scarf', 400]],
    pack: [['std', 'Standard Pack', 0], ['comms', 'Comms Pack', 500], ['heavy', 'Heavy Pack', 600], ['none', 'No Pack', 0], ['medic', 'Medic Pack', 600]],
    build: [['std', 'Standard', 0], ['slim', 'Slim', 0], ['bulky', 'Bulky', 0], ['tall', 'Tall', 0]],
    gloves: [['std', 'Standard', 0], ['armored', 'Armoured Gauntlets', 400], ['wrist', 'Wrist Gadget', 600]]
  };
  C.defaultLook = function (fid) {
    var F = D.factions[fid];
    return { primary: F.pal[0], secondary: F.pal[1], accent: F.pal[2], visor: F.pal[3], helmet: 'std', marking: 'stripe', pauldron: 'none', kama: 'none', cape: 'none', pack: 'std', build: 'std', gloves: 'std' };
  };
  // bots get varied looks so squads don't look cloned
  C.randomLook = function (fid, classId) {
    var L = C.defaultLook(fid), r = Math.random;
    function pick(arr) { return arr[(r() * arr.length) | 0][0]; }
    if (r() < 0.35) L.helmet = pick(D.lookOptions.helmet.slice(0, 6));
    if (r() < 0.4) L.marking = pick(D.lookOptions.marking);
    if (r() < 0.3) L.pauldron = pick(D.lookOptions.pauldron);
    if (r() < 0.2) L.kama = pick(D.lookOptions.kama);
    if (r() < 0.12) L.cape = pick(D.lookOptions.cape);
    if (r() < 0.3) L.pack = pick(D.lookOptions.pack);
    if (r() < 0.4) L.build = pick(D.lookOptions.build);
    if (r() < 0.25) L.secondary = D.colors[(r() * D.colors.length) | 0][1];
    if (classId === 'officer') { L.pauldron = 'officer'; L.helmet = r() < 0.5 ? 'commander' : L.helmet; }
    if (classId === 'heavy' && r() < 0.6) L.helmet = 'heavy';
    if (classId === 'specialist' && r() < 0.5) L.helmet = 'scout';
    return L;
  };

  // palette order differs per armour style
  C.lookPal = function (style, F, L) {
    var p = F.pal.slice();
    if (style === 'dominion') { p[0] = L.primary; p[1] = L.accent; p[2] = L.secondary; p[3] = L.visor; }
    else { p[0] = L.primary; p[1] = L.secondary; p[2] = L.accent; p[3] = L.visor; }
    return p;
  };
  // Rebuild helmet and add gear onto a trooper rig according to a look
  C.applyLook = function (R, L, style) {
    var M = SF.Models, mesh = M.mesh;
    if (!L) return;
    var armored = style === 'legion' || style === 'dominion' || style === 'remnant' || style === 'ranger' || style === 'rebel';
    var pri = M.mat(L.primary, 0.35, 0.05), sec = M.mat(L.secondary, 0.4), acc = M.mat(L.accent, 0.7), vis = M.mat(L.visor, 0.15, 0.6);
    // build
    var bs = { slim: [0.92, 1.0], bulky: [1.12, 1.0], tall: [1.0, 1.07] }[L.build];
    if (bs) { R.body.scale.set(bs[0], bs[1], bs[0]); }
    // helmet variants (armoured styles only)
    if (armored && L.helmet && L.helmet !== 'std') {
      var head = R.head;
      for (var i = head.children.length - 1; i >= 0; i--) head.remove(head.children[i]);
      var h = L.helmet;
      if (h === 'bare' || h === 'hood') {
        var skin = M.mat(0xc8946a, 0.75);
        mesh('sph', skin, head, 0, 0.1, 0, 0.21, 0.26, 0.23);
        mesh('hemi', M.mat(0x2a1f17, 0.9), head, 0, 0.13, 0.02, 0.23, 0.18, 0.25);
        mesh('box', M.mat(0x111111, 0.4), head, 0.045, 0.12, -0.11, 0.03, 0.015, 0.01); mesh('box', M.mat(0x111111, 0.4), head, -0.045, 0.12, -0.11, 0.03, 0.015, 0.01);
        if (h === 'hood') mesh('hemi', M.mat(L.secondary, 0.95, 0, 'cloth2'), head, 0, 0.1, 0.04, 0.32, 0.36, 0.34, -0.15, 0, 0);
      } else {
        mesh('sph', pri, head, 0, 0.11, 0, 0.29, 0.3, 0.31);
        mesh('box', pri, head, 0, 0.0, -0.05, 0.27, 0.15, 0.24);
        if (h === 'crest') { mesh('box', sec, head, 0, 0.27, 0.0, 0.035, 0.12, 0.3); mesh('box', vis, head, 0, 0.1, -0.155, 0.2, 0.05, 0.02); mesh('box', vis, head, 0, 0.04, -0.155, 0.05, 0.12, 0.02); }
        if (h === 'pilot') { mesh('box', vis, head, 0, 0.1, -0.15, 0.24, 0.1, 0.04); mesh('cyl', acc, head, 0.12, 0.26, 0.04, 0.012, 0.22, 0.012); mesh('cyl', sec, head, 0, 0.0, -0.17, 0.1, 0.05, 0.05, Math.PI / 2, 0, 0); }
        if (h === 'scout') { mesh('box', vis, head, 0, 0.1, -0.15, 0.22, 0.06, 0.03); mesh('box', pri, head, 0, 0.18, -0.12, 0.3, 0.03, 0.14); mesh('box', acc, head, 0.12, 0.12, -0.16, 0.05, 0.05, 0.08); }
        if (h === 'heavy') { mesh('box', pri, head, 0, 0.05, -0.12, 0.3, 0.2, 0.1); mesh('box', vis, head, 0, 0.11, -0.175, 0.18, 0.035, 0.02); mesh('box', sec, head, 0, 0.0, -0.18, 0.12, 0.06, 0.02); mesh('box', pri, head, 0.16, 0.08, 0, 0.06, 0.18, 0.2); mesh('box', pri, head, -0.16, 0.08, 0, 0.06, 0.18, 0.2); }
        if (h === 'commander') { mesh('box', vis, head, 0, 0.1, -0.155, 0.2, 0.05, 0.02); mesh('box', vis, head, 0, 0.04, -0.155, 0.05, 0.12, 0.02); mesh('box', sec, head, 0, 0.29, -0.02, 0.18, 0.04, 0.22); mesh('cone', M.mat(L.secondary, 0.5), head, 0.1, 0.33, 0.06, 0.03, 0.14, 0.03); mesh('cone', M.mat(L.secondary, 0.5), head, -0.1, 0.33, 0.06, 0.03, 0.14, 0.03); }
      }
    }
    // markings
    var mk = L.marking;
    if (armored && mk && mk !== 'none') {
      if (mk === 'stripe') mesh('box', sec, R.chest, 0, 0.13, -0.126, 0.06, 0.3, 0.02);
      if (mk === 'chevron') for (var c = 0; c < 3; c++) { mesh('box', sec, R.lUA, -0.02, -0.06 - c * 0.04, -0.06, 0.13, 0.02, 0.02, 0, 0, 0.5); mesh('box', sec, R.lUA, 0.02, -0.06 - c * 0.04, -0.06, 0.13, 0.02, 0.02, 0, 0, -0.5); }
      if (mk === 'band') { mesh('box', sec, R.lUA, 0, -0.1, 0, 0.13, 0.05, 0.13); mesh('box', sec, R.rUA, 0, -0.1, 0, 0.13, 0.05, 0.13); }
      if (mk === 'split') mesh('box', sec, R.chest, 0.105, 0.13, -0.122, 0.2, 0.32, 0.02);
      if (mk === 'tally') for (var tl = 0; tl < 5; tl++) mesh('box', sec, R.chest, -0.15 + tl * 0.025, 0.2, -0.126, 0.01, 0.06, 0.02);
      if (mk === 'sigil') { mesh('box', sec, R.chest, 0, 0.17, -0.127, 0.1, 0.1, 0.02, 0, 0, Math.PI / 4); mesh('box', acc, R.chest, 0, 0.17, -0.13, 0.05, 0.05, 0.02, 0, 0, Math.PI / 4); }
      if (mk === 'tiger') for (var ts = 0; ts < 4; ts++) mesh('box', sec, R.chest, -0.15 + ts * 0.1, 0.12, -0.125, 0.025, 0.3, 0.02, 0, 0, 0.3);
    }
    if (!armored) { if (L.pack === 'comms') mesh('cyl', M.mat(0x111111, 0.5, 0.5), R.chest, 0.06, 0.4, 0.15, 0.012, 0.4, 0.012); return; }
    if (L.pauldron && L.pauldron !== 'none') {
      var pm = L.pauldron === 'officer' ? sec : pri;
      mesh('sph', pm, R.lUA, -0.02, 0.0, 0, 0.21, 0.14, 0.2, 0, 0, 0.3);
      if (L.pauldron !== 'left') mesh('sph', pm, R.rUA, 0.02, 0.0, 0, 0.21, 0.14, 0.2, 0, 0, -0.3);
      if (L.pauldron === 'spiked') for (var sp = 0; sp < 3; sp++) mesh('cone', acc, R.lUA, -0.05, 0.06, -0.06 + sp * 0.06, 0.03, 0.09, 0.03, 0, 0, 0.5);
      if (L.pauldron === 'officer') mesh('plane', M.mat(L.secondary, 0.95, 0, 'cloth2'), R.lUA, -0.06, 0.02, 0.0, 0.2, 0.5, 1, 0, Math.PI / 2, 0.2);
    }
    if (L.kama && L.kama !== 'none') {
      var km = M.mat(L.kama === 'tabard' ? L.secondary : L.accent === 0x1c1f26 ? 0x2a2c30 : L.accent, 0.95, 0, 'cloth2');
      var len = L.kama === 'long' ? 0.55 : 0.32;
      if (L.kama === 'tabard') { mesh('plane', km, R.hips, 0, 0.02, -0.13, 0.22, len + 0.1, 1); mesh('plane', km, R.hips, 0, 0.02, 0.13, 0.22, len + 0.1, 1); }
      else { mesh('plane', km, R.hips, -0.12, 0.02, 0.0, 0.24, len, 1, 0, Math.PI / 2, 0.1); mesh('plane', km, R.hips, 0.12, 0.02, 0.0, 0.24, len, 1, 0, -Math.PI / 2, -0.1); mesh('plane', km, R.hips, 0, 0.02, 0.12, 0.34, len, 1, 0.05, 0, 0); }
    }
    if (L.cape && L.cape !== 'none') {
      var cm = M.mat(L.secondary, 0.95, 0, 'cloth2');
      if (L.cape === 'scarf') { mesh('cyl', cm, R.neck, 0, 0.02, 0, 0.22, 0.08, 0.22); mesh('plane', cm, R.chest, 0.08, 0.34, 0.12, 0.08, 0.5, 1, 0.1, 0, 0); }
      else if (L.cape === 'poncho') { mesh('cone', cm, R.chest, 0, 0.2, 0, 0.62, 0.42, 0.42, 0, 0, 0); }
      else { var cp = mesh('plane', cm, R.chest, 0, 0.32, 0.15, 0.5, L.cape === 'long' ? 1.25 : 0.75, 1, 0.08, 0, 0); R.cape = cp; }
    }
    if (L.pack && L.pack !== 'std') {
      if (L.pack === 'comms') { mesh('box', acc, R.chest, 0, 0.12, 0.2, 0.26, 0.28, 0.12); mesh('cyl', M.mat(0x111111, 0.5, 0.5), R.chest, 0.09, 0.45, 0.22, 0.012, 0.5, 0.012); mesh('cyl', M.mat(0x111111, 0.5, 0.5), R.chest, -0.06, 0.38, 0.22, 0.01, 0.34, 0.01); }
      if (L.pack === 'heavy') { mesh('box', pri, R.chest, 0, 0.1, 0.22, 0.34, 0.36, 0.16); mesh('cyl', acc, R.chest, 0, 0.32, 0.24, 0.1, 0.32, 0.1, 0, 0, Math.PI / 2); }
      if (L.pack === 'medic') { mesh('box', M.mat(0xe8e8e8, 0.5), R.chest, 0, 0.12, 0.2, 0.26, 0.26, 0.1); mesh('box', M.mat(0xc81818, 0.5), R.chest, 0, 0.12, 0.255, 0.04, 0.14, 0.01); mesh('box', M.mat(0xc81818, 0.5), R.chest, 0, 0.12, 0.255, 0.14, 0.04, 0.01); }
    }
    if (L.gloves === 'armored') { mesh('box', pri, R.lEl, 0, -0.2, 0, 0.13, 0.16, 0.13); mesh('box', pri, R.rEl, 0, -0.2, 0, 0.13, 0.16, 0.13); }
    if (L.gloves === 'wrist') { mesh('box', acc, R.lEl, 0, -0.2, -0.04, 0.12, 0.1, 0.1); mesh('box', M.mat(0x3affd8, 0, 0, 'glow'), R.lEl, 0, -0.2, -0.095, 0.06, 0.04, 0.005); }
  };
})();
