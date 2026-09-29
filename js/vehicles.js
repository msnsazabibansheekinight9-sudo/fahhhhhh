// ============================================================================
// Terminal ballistics against vehicles and barriers, plus extra range targets.
//
// Penetration model: each bullet has a capability in mm of rolled homogeneous
// armour (RHA) that depends on calibre, projectile type (AP / ball / hollow
// point / shot) and the velocity it still carries. Each vehicle panel has an
// RHA-equivalent thickness and a slope. Effective thickness = t / cos(angle),
// where the angle combines the panel's slope and the bullet's impact obliquity.
// A bullet that defeats a panel keeps going with reduced velocity and can hit
// the crew or the far side; glass deflects it slightly.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const { gBox, gCylY, gCyl, gCylX, gSph, gRBox } = G.geo;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ capability (mm RHA at the muzzle, ball ammunition)
const PEN = {
  '9×19mm': 2.5, '.45 ACP': 2, '7.62×25mm': 4.5, '9×18mm': 2, '.32 ACP': 1.2, '.38/200': 1.5, '.38 Special': 1.8, '.455 Webley': 1.5, '.357 Magnum': 3.5, '.44 Magnum': 3.5, '.50 AE': 4,
  '7.63×25mm': 3.5, '9mm Glisenti': 2, '8×22mm Nambu': 1.8, '9×23mm Steyr': 2.8, '7.62×38mmR': 1.8, '5.7×28mm': 5, '4.6×30mm': 5.5, '5.45×18mm': 3, '9×21mm': 4, '.40 S&W': 2.5, '.45 Colt': 1.8,
  '.30 Carbine': 3.5, '.300 BLK': 4, '6.8 SPC': 6, '7.92×33mm Kurz': 5, '7.62×39mm': 5, '5.56×45mm': 6.5, '5.45×39mm': 6, '5.8×42mm': 7, '4.73×33mm caseless': 6,
  '7.62×51mm': 7.5, '7.62×54mmR': 8, '.303 British': 7, '7.92×57mm': 8, '.30-06': 8.5, '8mm Lebel': 7, '6.5×52mm': 6.5, '6.5×50mmSR': 6.5, '7.7×58mm': 7.5, '.30-40 Krag': 6.5, '7×57mm': 7.5, '8×50mmR': 7, '7.5×54mm': 7.5, '7.5×55mm Swiss': 8, '.351 WSL': 3.5,
  '6.8×51mm': 13, '6.5mm CT': 10, '.338 Lapua': 14, '.300 Win Mag': 11, '.408 CheyTac': 18, '.50 BMG': 20, '12.7×55mm': 9, '9×39mm': 8,
  '13.2mm TuF': 22, '.55 Boys': 23, '14.5×114mm': 32, '20×138mmB': 36,
  '5.56mm flechette': 11, '13mm Gyrojet': 2, '5.66mm MPS dart': 3, '12 gauge': 1, '23×75mmR': 2,
};
G.penCapability = function (b, speed) {
  let base = PEN[b.cal] ?? ((G.CAL[b.cal] || { pen: 2 }).pen * 3);
  if (b.cal === '12 gauge' && !b.pellet) base = 4; // slug
  if (b.ap) base *= 1.8;
  if (b.hp) base *= .5;
  if (b.pellet) base *= .45;
  return base * Math.pow(clamp(speed / b.v0, 0, 1.2), 1.6);
};

// ------------------------------------------------------------------ materials
const PM = {};
function pm(key, col, o = {}) { return PM[key] || (PM[key] = G.mat(Object.assign({ color: col, roughness: .55, metalness: .35 }, o))); }
const GLASS = () => pm('vglass', '#3a4c55', { roughness: .05, metalness: .6, transparent: true, opacity: .35, depthWrite: false });
const TIRE = () => pm('tire', '#171717', { roughness: .95, metalness: 0 });
const DARK = () => pm('vdark', '#1f2022', { roughness: .8, metalness: .2 });
const CHROME = () => pm('chrome', '#b8bcc0', { roughness: .15, metalness: 1 });
const LAMP = () => pm('lamp', '#f2f0dc', { roughness: .1, metalness: .2, emissive: '#6a685a' });
const TAIL = () => pm('tail', '#8a1a14', { roughness: .2, emissive: '#3a0604' });

// ------------------------------------------------------------------ catalogue
// Dimensions in metres (x = length, front at +x), armour in mm RHA-equivalent.
// kind: car | open | armored | apc | tank
G.VEHICLES = [
  { id: 'sedan', n: 'Civilian sedan', era: 'mod', kind: 'car', L: 4.6, W: 1.8, H: 1.45, sheet: .6, glass: 1.5, engine: 45, paint: ['#6e7a82', '#9b3a2e', '#d6d1bf', '#23303b'], crew: [[.15, -.38, 'Driver'], [.15, .38, 'Passenger'], [-.75, .38, 'Rear passenger']], d: 'Pressed steel skin barely slows rifle bullets. The engine block stops most of them.' },
  { id: 'pickup', n: 'Pickup truck', era: 'mod', kind: 'car', L: 5.3, W: 1.9, H: 1.8, sheet: .8, glass: 1.5, engine: 50, bed: true, paint: ['#7d7a70', '#2f4a63', '#8a2a1e'], crew: [[.55, -.4, 'Driver'], [.55, .4, 'Passenger']], d: 'Light truck. Cab and bed are thin sheet steel.' },
  { id: 'technical', n: 'Technical (DShK)', era: 'mod', kind: 'car', L: 5.3, W: 1.9, H: 1.8, sheet: .8, glass: 1.5, engine: 50, bed: true, gunner: true, paint: ['#b9a67c', '#e0dccb'], crew: [[.55, -.4, 'Driver'], [.55, .4, 'Passenger']], d: 'Improvised gun truck with an exposed gunner in the bed.' },
  { id: 'willys', n: 'Willys MB Jeep', era: 'ww2', kind: 'open', L: 3.4, W: 1.6, H: 1.1, sheet: .9, glass: 1.5, engine: 40, paint: ['#4c5236'], crew: [[-.15, -.35, 'Driver'], [-.15, .35, 'Passenger']], d: 'Open WW2 utility vehicle. Crew are protected by almost nothing.' },
  { id: 'kubel', n: 'VW Kübelwagen', era: 'ww2', kind: 'open', L: 3.7, W: 1.6, H: 1.35, sheet: .8, glass: 1.5, engine: 30, engineRear: true, paint: ['#6d6a55', '#8e8660'], crew: [[.3, -.35, 'Driver'], [.3, .35, 'Passenger'], [-.6, 0, 'Rear seat']], d: 'Air-cooled rear engine; thin pressed body panels.' },
  { id: 'humvee', n: 'HMMWV M998 (soft skin)', era: 'mod', kind: 'car', L: 4.6, W: 2.2, H: 1.8, sheet: .7, glass: 1.5, engine: 55, wide: true, paint: ['#b9a57d', '#4f553b'], crew: [[.1, -.5, 'Driver'], [.1, .5, 'Commander'], [-.9, -.5, 'Rear left'], [-.9, .5, 'Rear right']], d: 'Aluminium and fibreglass body with canvas doors.' },
  { id: 'm1114', n: 'M1114 up-armoured HMMWV', era: 'mod', kind: 'armored', L: 4.9, W: 2.3, H: 1.95, side: 12, glass: 32, roof: 6, engine: 60, turretRing: true, paint: ['#b9a57d'], crew: [[.1, -.5, 'Driver'], [.1, .5, 'Commander'], [-.9, -.5, 'Rear left'], [-.9, .5, 'Rear right']], d: 'Steel armour kit rated against 7.62 mm ball. Ballistic glass ~76 mm thick.' },
  { id: 'mrap', n: 'Cougar MRAP', era: 'now', kind: 'armored', L: 5.9, W: 2.6, H: 2.7, side: 16, glass: 40, roof: 10, engine: 70, tall: true, paint: ['#b9a57d', '#8b8466'], crew: [[1.4, -.55, 'Driver'], [1.4, .55, 'Commander'], [-.3, -.6, 'Troop 1'], [-.3, .6, 'Troop 2'], [-1.4, -.6, 'Troop 3']], d: 'Mine-resistant hull; protected against 7.62 mm AP from the side.' },
  { id: 'm113', n: 'M113 APC', era: 'cold', kind: 'apc', L: 4.9, W: 2.7, H: 2.5, side: 13, front: 13, frontSlope: 45, roof: 8, tracks: true, paint: ['#4c5236'], crew: [[1.3, -.6, 'Driver'], [-.2, .3, 'Commander'], [-1.3, -.7, 'Troop'], [-1.3, .7, 'Troop']], d: '38 mm aluminium hull ≈ 13 mm steel: stops rifle ball, not .50 or 14.5 mm.' },
  { id: 'btr80', n: 'BTR-80', era: 'mod', kind: 'apc', L: 7.6, W: 2.9, H: 2.4, side: 7, sideSlope: 30, front: 10, frontSlope: 60, roof: 7, wheels8: true, turret: { L: 1.3, W: 1.2, H: .5, side: 7, gun: 1.6 }, paint: ['#5b6445', '#6d6a55'], crew: [[2.4, -.5, 'Driver'], [2.4, .5, 'Commander'], [.5, 0, 'Gunner'], [-1.5, -.7, 'Troop'], [-1.5, .7, 'Troop']], d: '7–10 mm steel: stops rifle ball at range; defeated by AP up close and by .50 cal.' },
  { id: 'bmp2', n: 'BMP-2', era: 'cold', kind: 'apc', L: 6.7, W: 3.15, H: 2.45, side: 16, sideSlope: 20, front: 16, frontSlope: 78, roof: 7, tracks: true, turret: { L: 1.6, W: 1.6, H: .6, side: 23, gun: 2.9 }, paint: ['#5b6445'], crew: [[2.1, -.6, 'Driver'], [.3, -.3, 'Gunner'], [.3, .3, 'Commander'], [-1.8, -.6, 'Troop'], [-1.8, .6, 'Troop']], d: 'Sides resist 12.7 mm; the glacis is proof against 30 mm at normal ranges.' },
  { id: 'sdkfz251', n: 'Sd.Kfz. 251 half-track', era: 'ww2', kind: 'apc', open: true, L: 5.8, W: 2.1, H: 1.75, side: 8, sideSlope: 30, front: 14.5, frontSlope: 30, roof: 0, halftrack: true, paint: ['#6d6a55', '#8e8660'], crew: [[1.1, -.4, 'Driver'], [1.1, .4, 'Commander'], [-.4, -.55, 'Grenadier'], [-.4, .55, 'Grenadier'], [-1.6, -.55, 'Grenadier']], d: 'Open-topped; 8 mm sloped sides stop ball ammunition, not AP or anti-tank rifles.' },
  { id: 'panzer4', n: 'Panzer IV Ausf. H', era: 'ww2', kind: 'tank', L: 5.9, W: 2.9, H: 2.7, side: 30, front: 80, frontSlope: 12, roof: 12, tracks: true, turret: { L: 2.2, W: 2, H: .75, side: 30, front: 50, gun: 3.2 }, paint: ['#8e8660', '#6d6a55'], crew: [[1.8, -.6, 'Driver'], [1.8, .6, 'Radio operator'], [.1, 0, 'Commander']], d: 'Only anti-tank rifles have a chance against 30 mm side plates — and only up close.' },
  { id: 't72', n: 'T-72B', era: 'cold', kind: 'tank', L: 6.9, W: 3.6, H: 2.2, side: 80, front: 500, frontSlope: 68, roof: 20, tracks: true, skirts: true, turret: { L: 2.4, W: 2.2, H: .75, side: 380, front: 500, gun: 4.6 }, paint: ['#4d563b'], crew: [[2.3, 0, 'Driver'], [.1, -.5, 'Gunner'], [.1, .5, 'Commander']], d: 'Main battle tank. No small arm will penetrate it; aim for optics and exposed crew.' },
];
G.VEHICLE = Object.fromEntries(G.VEHICLES.map(v => [v.id, v]));

// ------------------------------------------------------------------ vehicle builder
function buildVehicle(V, era) {
  const g = new THREE.Group();
  const parts = []; // {min, max, mm, slope, kind, name, mesh}
  const col = V.paint[Math.floor(Math.random() * V.paint.length)];
  const paint = pm('paint_' + V.kind + col, col, { roughness: V.kind === 'car' ? .35 : .75, metalness: V.kind === 'car' ? .45 : .25 });
  const L = V.L, W = V.W, H = V.H;
  const add = (x0, x1, y0, y1, z0, z1, mat, part) => {
    const m = new THREE.Mesh(gBox(x1 - x0, y1 - y0, z1 - z0), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (part) parts.push(Object.assign({ min: V3(x0, y0, z0), max: V3(x1, y1, z1), mesh: m }, part));
    return m;
  };
  const cyl = (r, len, x, y, z, mat, axis = 'z') => { const m = new THREE.Mesh(axis === 'z' ? gCyl(r, r, len, 20) : gCylX(r, r, len, 20), mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const t = .03; // visual panel thickness
  if (V.kind === 'car' || V.kind === 'open' || V.kind === 'armored') {
    const clr = V.tall ? .55 : V.wide ? .42 : .32, belt = V.kind === 'open' ? H * .72 : H * (V.tall ? .55 : .6);
    const armour = V.kind === 'armored';
    const sideMM = armour ? V.side : V.sheet, glassMM = V.glass;
    const cabF = V.bed ? L * .12 : L * .22, cabR = V.bed ? -L * .2 : -L * .32;
    const sheet = { mm: sideMM, kind: armour ? 'steel' : 'sheet' };
    // lower body sides, front, rear
    add(-L / 2, L / 2, clr, belt, W / 2 - t, W / 2, paint, Object.assign({ name: 'Right body panel' }, sheet));
    add(-L / 2, L / 2, clr, belt, -W / 2, -W / 2 + t, paint, Object.assign({ name: 'Left body panel' }, sheet));
    add(L / 2 - t * 2, L / 2, clr, belt - .05, -W / 2, W / 2, paint, Object.assign({ name: 'Front grille' }, sheet));
    add(-L / 2, -L / 2 + t, clr, belt, -W / 2, W / 2, paint, Object.assign({ name: 'Rear panel' }, sheet));
    add(cabF, L / 2, belt - t, belt, -W / 2, W / 2, paint, Object.assign({ name: 'Bonnet' }, sheet));
    add(-L / 2, cabR, clr, clr + .03, -W / 2, W / 2, DARK(), { name: 'Floor', mm: armour ? 8 : 1, kind: 'steel' });
    if (!V.bed) add(-L / 2, cabR, belt - t, belt, -W / 2, W / 2, paint, Object.assign({ name: 'Boot lid' }, sheet));
    // engine block
    if (V.engine) { const ex = V.engineRear ? [-L / 2 + .15, -L / 2 + .95] : [L / 2 - 1.05, L / 2 - .2]; add(ex[0], ex[1], clr + .1, belt - .08, -.38, .38, DARK(), { name: 'Engine block', mm: V.engine, kind: 'engine' }); }
    // cabin: glass all round, pillars and roof
    if (V.kind !== 'open') {
      const top = H;
      add(cabR, cabF, belt, top - t, W / 2 - t * .5, W / 2, GLASS(), { name: 'Side window', mm: glassMM, kind: 'glass' });
      add(cabR, cabF, belt, top - t, -W / 2, -W / 2 + t * .5, GLASS(), { name: 'Side window', mm: glassMM, kind: 'glass' });
      add(cabF - .04, cabF, belt, top - t, -W / 2, W / 2, GLASS(), { name: 'Windscreen', mm: glassMM, kind: 'glass', slope: 55 });
      add(cabR, cabR + .04, belt, top - t, -W / 2, W / 2, GLASS(), { name: 'Rear window', mm: glassMM, kind: 'glass', slope: 40 });
      add(cabR, cabF, top - t, top, -W / 2, W / 2, paint, { name: 'Roof', mm: armour ? V.roof : V.sheet, kind: armour ? 'steel' : 'sheet' });
      for (const x of [cabF - .05, (cabF + cabR) / 2, cabR + .05]) for (const z of [W / 2 - .04, -W / 2]) add(x - .04, x + .04, belt, top, z, z + .04, paint, { name: 'Pillar', mm: armour ? V.side : 2, kind: 'steel' });
      if (V.turretRing) { add(-.6, .2, top, top + .45, -.5, .5, paint, { name: 'Gunner shield', mm: 9, kind: 'steel' }); }
    } else { // open vehicles: windscreen frame only
      add(cabF - .03, cabF, belt, belt + .45, -W / 2 + .05, W / 2 - .05, GLASS(), { name: 'Windscreen', mm: V.glass, kind: 'glass', slope: 20 });
    }
    if (V.bed) { add(-L / 2, cabR, belt - .02, belt, -W / 2, W / 2, DARK(), null); }
    // wheels
    const wr = V.tall ? .55 : V.wide ? .45 : V.kind === 'open' ? .36 : .33;
    for (const x of [L * .32, -L * .32]) for (const z of [W / 2 - .18, -W / 2 + .18]) {
      const m = cyl(wr, .24, x, wr, z, TIRE()); cyl(wr * .55, .25, x, wr, z, CHROME());
      parts.push({ min: V3(x - wr, 0, z - .12), max: V3(x + wr, wr * 2, z + .12), mm: 1.5, kind: 'rubber', name: 'Tyre', mesh: m });
    }
    // lights
    for (const z of [W / 2 - .3, -W / 2 + .3]) { add(L / 2 - .01, L / 2 + .01, belt - .18, belt - .08, z - .1, z + .1, LAMP(), null); add(-L / 2 - .01, -L / 2 + .01, belt - .15, belt - .05, z - .08, z + .08, TAIL(), null); }
  } else {
    // armoured hull: tracked or wheeled
    const clr = V.tracks ? .45 : .55, top = H - (V.turret ? V.turret.H : 0);
    const sideMat = paint;
    add(-L / 2, L / 2, clr, top, W / 2 - t * 2, W / 2, sideMat, { name: 'Right hull side', mm: V.side, slope: V.sideSlope || 0, kind: 'steel' });
    add(-L / 2, L / 2, clr, top, -W / 2, -W / 2 + t * 2, sideMat, { name: 'Left hull side', mm: V.side, slope: V.sideSlope || 0, kind: 'steel' });
    add(L / 2 - t * 3, L / 2, clr, top - .05, -W / 2, W / 2, sideMat, { name: 'Glacis / front', mm: V.front, slope: V.frontSlope || 0, kind: 'steel' });
    add(-L / 2, -L / 2 + t * 2, clr, top, -W / 2, W / 2, sideMat, { name: 'Rear plate', mm: V.side, kind: 'steel' });
    if (!V.open) add(-L / 2, L / 2, top - t, top, -W / 2, W / 2, sideMat, { name: 'Roof', mm: V.roof, kind: 'steel' });
    add(-L / 2, L / 2, clr, clr + .03, -W / 2, W / 2, DARK(), { name: 'Belly', mm: V.side, kind: 'steel' });
    // vision blocks (glass) — the weak points
    for (const z of [W / 2, -W / 2 - .002]) add(L / 2 - 1, L / 2 - .8, top - .3, top - .2, z - .002, z + .002, GLASS(), { name: 'Vision block', mm: V.kind === 'tank' ? 60 : 40, kind: 'glass' });
    if (V.tracks || V.halftrack) {
      const tl = V.halftrack ? L * .6 : L * .95, tx = V.halftrack ? -L * .15 : 0;
      for (const z of [W / 2 + .02, -W / 2 - .02]) {
        const zz = z > 0 ? [W / 2 - .05, W / 2 + .25] : [-W / 2 - .25, -W / 2 + .05];
        add(tx - tl / 2, tx + tl / 2, 0, clr + .35, zz[0], zz[1], DARK(), { name: 'Track & road wheels', mm: 20, kind: 'steel' });
        for (let i = 0; i < 6; i++) cyl(.28, .3, tx - tl / 2 + .4 + i * (tl - .8) / 5, .32, (zz[0] + zz[1]) / 2, pm('rw', '#2e312c'));
        if (V.skirts) add(-L / 2, L / 2, clr + .1, clr + .5, zz[1] - (z > 0 ? 0 : -.01) - .01, zz[1] + (z > 0 ? .01 : 0), sideMat, { name: 'Side skirt', mm: 10, kind: 'steel' });
      }
      if (V.halftrack) for (const z of [W / 2 - .15, -W / 2 + .15]) { cyl(.42, .22, L / 2 - .6, .42, z, TIRE()); parts.push({ min: V3(L / 2 - 1.02, 0, z - .11), max: V3(L / 2 - .18, .84, z + .11), mm: 1.5, kind: 'rubber', name: 'Tyre' }); }
    } else {
      const n = V.wheels8 ? 4 : 3;
      for (let i = 0; i < n; i++) for (const z of [W / 2 - .15, -W / 2 + .15]) { const x = -L * .35 + i * L * .7 / (n - 1); cyl(.55, .3, x, .55, z, TIRE()); parts.push({ min: V3(x - .55, 0, z - .15), max: V3(x + .55, 1.1, z + .15), mm: 1.5, kind: 'rubber', name: 'Tyre' }); }
    }
    if (V.turret) {
      const T = V.turret, tx = V.kind === 'tank' ? -.1 : .4;
      add(tx - T.L / 2, tx + T.L / 2, top, top + T.H, -T.W / 2, T.W / 2, sideMat, { name: 'Turret', mm: T.side, kind: 'steel' });
      add(tx + T.L / 2 - .05, tx + T.L / 2, top, top + T.H, -T.W / 2, T.W / 2, sideMat, { name: 'Turret front', mm: T.front || T.side, kind: 'steel' });
      const bar = new THREE.Mesh(gCylX(.06, .08, T.gun, 12), DARK()); bar.position.set(tx + T.L / 2 + T.gun / 2, top + T.H * .5, 0); bar.castShadow = true; g.add(bar);
      add(tx - .3, tx + .1, top + T.H, top + T.H + .12, -.3, .1, sideMat, { name: 'Commander hatch', mm: T.side * .5, kind: 'steel' });
      add(tx + T.L / 2 - .3, tx + T.L / 2 - .1, top + T.H * .6, top + T.H * .85, T.W / 2 - .01, T.W / 2 + .01, GLASS(), { name: 'Gunner sight', mm: 20, kind: 'glass' });
    }
  }
  // crew mannequins ------------------------------------------------------------------
  const crew = [];
  const seatY = V.kind === 'tank' || V.kind === 'apc' ? .75 : V.tall ? .95 : .55;
  const crewEra = V.era || era;
  const list = V.crew.slice();
  if (V.gunner) list.push([-1.2, 0, 'Gunner', true]);
  for (const [x, z, name, standing] of list) {
    const S = G.buildSoldier({ era: crewEra, team: V.kind === 'car' && !V.gunner ? 1 : 1, tier: 'regular' });
    S.root.rotation.y = -PI / 2; g.add(S.root);
    G.animateSoldier(S, { dt: 1, speed: 0 });
    if (!standing) { for (const Lg of S.legs) { Lg.hip.rotation.x = -1.45; Lg.knee.rotation.x = 1.45; } S.hips.position.y = .96; S.root.position.set(x, seatY + .45 - .96, z); }
    else S.root.position.set(x, .95 - .0, z);
    crew.push({ S, name, hp: 100, dead: false });
  }
  return { g, parts, crew };
}

// ------------------------------------------------------------------ hit tests
const _inv = new THREE.Matrix4(), _ro = V3(), _rd = V3(), _n = V3();
function localRay(g, ro, rd) { g.updateMatrixWorld(true); _inv.copy(g.matrixWorld).invert(); _ro.copy(ro).applyMatrix4(_inv); _rd.copy(rd).transformDirection(_inv); return [_ro, _rd]; }
function boxT(ro, rd, min, max) {
  let t0 = 0, t1 = 1e9, ax = 0;
  for (let i = 0; i < 3; i++) {
    const a = 'xyz'[i], inv = 1 / rd[a]; let tn = (min[a] - ro[a]) * inv, tf = (max[a] - ro[a]) * inv; if (tn > tf) [tn, tf] = [tf, tn];
    if (tn > t0) { t0 = tn; ax = i; } t1 = Math.min(t1, tf); if (t0 > t1) return null;
  }
  return t0 > 0 ? { t: t0, ax } : null;
}
function markAt(parent, p, r, col) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 10), new THREE.MeshBasicMaterial({ color: G.col(col), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide })); m.position.copy(p); parent.add(m); return m; }

// ------------------------------------------------------------------ TGT.vehicle
const TGT = G.TGT;
const ORIENT = { side: 0, front: -PI / 2, rear: PI / 2, quarter: -PI / 4 };
TGT.vehicle = function (x, z, dist, o = {}) {
  const V = G.VEHICLE[o.veh || 'sedan'];
  const { g, parts, crew } = buildVehicle(V, o.era);
  g.position.set(x, 0, z); g.rotation.y = ORIENT[o.orient || 'side'] || 0;
  const marks = new THREE.Group(); g.add(marks);
  const T = { type: 'vehicle', g, V, parts, crew, w: V.L * .55, focus: V3(x, V.H * .6, z), label: V.n,
    rayTest(ro, rd, maxT, b) {
      const [lo, ld] = localRay(g, ro, rd);
      let best = -1; this._hit = null;
      for (const P of parts) {
        if (b && b.vparts && b.vparts.has(P)) continue;
        const h = boxT(lo, ld, P.min, P.max);
        if (h && h.t < maxT && (best < 0 || h.t < best)) { best = h.t; const nl = V3(0, 0, 0); nl.setComponent(h.ax, -Math.sign(ld.getComponent(h.ax)) || 1); this._hit = { P, nl, cosI: Math.abs(ld.getComponent(h.ax)) }; }
      }
      for (const c of crew) {
        if (b && b.vparts && b.vparts.has(c)) continue;
        for (const hb of G.soldierHitboxes(c.S)) { const t2 = G.rayCapsule(ro, rd, hb.a, hb.b, hb.r); if (t2 >= 0 && t2 < maxT && (best < 0 || t2 < best)) { best = t2; this._hit = { crew: c, zone: hb.zone }; } }
      }
      return best;
    },
    onHit(b, p, dir, energy, speed) {
      const H = this._hit; if (!H) return { pass: false };
      const vp = b.vparts || (b.vparts = new Set());
      if (H.crew) { // a mannequin inside
        const c = H.crew; vp.add(c);
        const dmg = b.dmg * energy * (G.ZONE_MUL[H.zone] || 1);
        G.FX.impact(p, dir.clone().negate(), dir, 'flesh', 1);
        if (!c.dead) { c.hp -= dmg; c.S.flinch = 1; if (c.hp <= 0) { c.dead = true; c.S.chest.rotation.x = .7; c.S.neck.rotation.x = .9; c.S.spine.rotation.z = (Math.random() - .5) * .8; } }
        this.crewHit = true;
        return { pass: true, keep: true, v: .45, depth: .3, info: `${c.name} hit · ${H.zone} · ${Math.round(dmg)} dmg${c.dead ? ' · KILLED' : ''}` };
      }
      const P = H.P; vp.add(P);
      // impact obliquity against the panel face, combined with the panel's own slope
      const incidence = Math.acos(clamp(H.cosI, 0, 1)), slope = (P.slope || 0) * PI / 180;
      const ang = Math.min(1.45, Math.acos(Math.cos(incidence) * Math.cos(slope)));
      const eff = P.mm / Math.max(.12, Math.cos(ang));
      const cap = G.penCapability(b, speed);
      g.updateMatrixWorld(true);
      const nOut = H.nl.clone().transformDirection(g.matrixWorld);
      const lp = g.worldToLocal(p.clone());
      const place = (r, col) => { const m = markAt(marks, lp.clone().addScaledVector(H.nl, .004), r, col); m.lookAt(p.clone().add(nOut)); return m; };
      const pen = cap > eff;
      const deg = Math.round(ang * 180 / PI);
      const info = `${P.name} · ${P.mm} mm @ ${deg}° = ${eff.toFixed(1)} mm eff · bullet ${cap.toFixed(1)} mm → ${pen ? 'PENETRATED' : 'NO PENETRATION'}`;
      if (P.kind === 'glass') {
        const c = place(pen ? .05 : .03, '#e8eef2'); c.material.transparent = true; c.material.opacity = .55;
        place(.006, '#101010');
        for (let i = 0; i < 14; i++) G.FX.debris.spawn({ x: p.x, y: p.y, z: p.z, vx: dir.x * 2 + (Math.random() - .5) * 2, vy: Math.random() * 1.5, vz: dir.z * 2 + (Math.random() - .5) * 2, life: 1, s0: .02, s1: .015, r: .8, g: .9, b: .95, grav: 9.8, drag: .6, bounce: .2, floor: 0 });
        G.Audio.impact(p, 'glass', true);
        if (pen) { const d2 = dir.clone(); d2.x += (Math.random() - .5) * .06; d2.y += (Math.random() - .5) * .06; d2.normalize(); return { pass: true, keep: true, v: Math.max(.2, 1 - eff / cap * .8), dir: d2, depth: .03, info }; }
        return { pass: false, info };
      }
      if (P.kind === 'rubber') { G.FX.impact(p, nOut, dir, 'dirt', .5, { decal: false }); if (!P.flat && P.mesh) { P.flat = true; P.mesh.scale.y = .88; P.mesh.position.y *= .92; } return { pass: true, keep: true, v: .85, depth: .05, info: 'Tyre punctured' }; }
      G.FX.impact(p, nOut, dir, P.kind === 'sheet' ? 'metal' : 'steel', pen ? .8 : 1.3, { decal: false });
      G.Audio.impact(p, 'metal', true);
      place(pen ? Math.max(.004, (G.CAL[b.cal] || { cs: [0, .004] }).cs[1] * .9) : .012, pen ? '#050505' : '#b9b6ac');
      if (pen) { // spall behind steel armour
        if (P.kind === 'steel') for (let i = 0; i < 8; i++) G.FX.spark.spawn({ x: p.x + dir.x * .1, y: p.y, z: p.z + dir.z * .1, vx: dir.x * 6 + (Math.random() - .5) * 5, vy: (Math.random() - .5) * 4, vz: dir.z * 6 + (Math.random() - .5) * 5, life: .25, s0: .03, s1: .01, r: 1, g: .7, b: .3, grav: 5, drag: .3 });
        return { pass: true, keep: true, v: Math.max(.12, 1 - Math.pow(eff / cap, 1.4)), depth: .02, info };
      }
      return { pass: false, info };
    },
    update(dt) { for (const c of this.crew) if (!c.dead) { c.S.breath += dt; c.S.chest.rotation.x = Math.sin(c.S.breath * 1.6) * .012; } },
    reset() { marks.clear(); for (const c of crew) { c.hp = 100; c.dead = false; c.S.chest.rotation.x = 0; c.S.neck.rotation.x = 0; c.S.spine.rotation.z = 0; } for (const P of parts) if (P.flat && P.mesh) { P.flat = false; P.mesh.scale.y = 1; P.mesh.position.y /= .92; } },
  };
  return T;
};

// ------------------------------------------------------------------ barrier test: common cover materials with gel behind each
const BARRIERS = [
  ['Drywall (2 × 12.5 mm)', .6, '#e9e6de', .1], ['Plywood 19 mm', 1.4, '#b7925c', .06], ['Car door', 1.2, '#6e7a82', .12],
  ['Auto glass', 1.6, '#9fc4d8', .02], ['Mild steel 6 mm', 4.5, '#8b8a86', .03], ['Brick 100 mm', 28, '#8b4a34', .1], ['Cinder block', 22, '#9a978f', .19], ['Sandbag 300 mm', 45, '#9b8a65', .3],
];
TGT.barrier = function (x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const cells = [], marks = new THREE.Group(); g.add(marks);
  BARRIERS.forEach(([name, mm, col, th], i) => {
    const cx = (i - 3.5) * .7;
    const mat = name === 'Auto glass' ? G.mat({ color: col, transparent: true, opacity: .4, roughness: .05, metalness: .5 }) : G.mat({ color: col, roughness: .9 });
    const panel = new THREE.Mesh(gBox(.55, .6, th), mat); panel.position.set(cx, 1.3, 0); panel.castShadow = true; g.add(panel);
    const gel = new THREE.Mesh(gBox(.15, .15, .4), G.mat({ color: '#e7a24a', transparent: true, opacity: .5, roughness: .15, depthWrite: false })); gel.position.set(cx, 1.3, -th / 2 - .5); g.add(gel);
    const stand = new THREE.Mesh(gBox(.05, 1, .05), G.surf('darkmetal')); stand.position.set(cx, .5, 0); g.add(stand);
    const tbl = new THREE.Mesh(gBox(.3, 1.22, .3), G.surf('planks')); tbl.position.set(cx, .61, -th / 2 - .5); g.add(tbl);
    const lab = document.createElement('canvas'); lab.width = 256; lab.height = 64; const lx = lab.getContext('2d'); lx.fillStyle = '#e9e4d4'; lx.fillRect(0, 0, 256, 64); lx.fillStyle = '#1b1b1b'; lx.font = 'bold 20px monospace'; lx.textAlign = 'center'; lx.fillText(name, 128, 40);
    const tex = new THREE.CanvasTexture(lab); tex.encoding = THREE.sRGBEncoding;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.6, .15), new THREE.MeshBasicMaterial({ map: tex })); sign.position.set(cx, .88, th / 2 + .01); g.add(sign);
    cells.push({ name, mm, th, cx, gelZ: -th / 2 - .5 });
  });
  return { type: 'barrier', g, focus: V3(x, 1.3, z), w: 3,
    rayTest(ro, rd, maxT, b) {
      let best = -1; this._hit = null;
      for (const c of cells) {
        const pz = z + c.th / 2; if (!(b && b.vparts && b.vparts.has(c))) { const t = (pz - ro.z) / rd.z; if (t > 0 && t < maxT) { const p = ro.clone().addScaledVector(rd, t); if (Math.abs(p.x - x - c.cx) < .275 && Math.abs(p.y - 1.3) < .3 && (best < 0 || t < best)) { best = t; this._hit = { c, gel: false }; } } }
        const gz = z + c.gelZ + .2; const t2 = (gz - ro.z) / rd.z; if (t2 > 0 && t2 < maxT) { const p = ro.clone().addScaledVector(rd, t2); if (Math.abs(p.x - x - c.cx) < .075 && Math.abs(p.y - 1.3) < .075 && (best < 0 || t2 < best)) { best = t2; this._hit = { c, gel: true }; } }
      }
      return best;
    },
    onHit(b, p, dir, energy, speed) {
      const { c, gel } = this._hit; const vp = b.vparts || (b.vparts = new Set());
      if (gel) {
        const depth = Math.min(.4, .5 * Math.pow(speed / b.v0, .8) * (b.pen >= 3 ? 1.4 : 1) * (b.pellet ? .6 : 1));
        const tr = new THREE.Mesh(gCyl(.003, .003, depth, 6), G.mat({ color: '#5a1a10' })); tr.position.set(p.x - x, p.y, c.gelZ + .2 - depth / 2); marks.add(tr);
        return { pass: false, info: `${c.name}: bullet passed · ${Math.round(speed)} m/s left · ${(depth * 100).toFixed(0)} cm in gel${depth >= .4 ? ' (exited)' : ''}` };
      }
      vp.add(c);
      const cap = G.penCapability(b, speed), pen = cap > c.mm;
      const mk = markAt(marks, V3(p.x - x, p.y, c.th / 2 + .003), pen ? .006 : .015, pen ? '#050505' : '#777'); mk.material.side = THREE.DoubleSide;
      G.FX.impact(p, V3(0, 0, 1), dir, c.name.includes('glass') ? 'glass' : c.name.includes('steel') || c.name.includes('door') ? 'metal' : c.name.includes('Brick') ? 'brick' : c.name.includes('block') ? 'concrete' : c.name.includes('Sand') ? 'sand' : 'wood', .8, { decal: false });
      if (pen) return { pass: true, keep: true, v: Math.max(.15, 1 - Math.pow(c.mm / cap, 1.3)), depth: c.th + .02, info: `${c.name}: PENETRATED` };
      return { pass: false, info: `${c.name}: STOPPED (${cap.toFixed(1)} mm vs ${c.mm} mm eq.)` };
    },
    reset() { marks.clear(); } };
};

// ------------------------------------------------------------------ plate rack: six 20 cm plates that fall
TGT.platerack = function (x, z, dist) {
  const s = clamp(dist / 100, 1, 3);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const beam = new THREE.Mesh(gBox(2.2 * s, .08, .15), G.surf('darkmetal')); beam.position.set(0, 1, -.05); g.add(beam);
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(gBox(.06, 1, .06), G.surf('darkmetal')); l.position.set(sx * 1.05 * s, .5, -.05); g.add(l); }
  const plates = [];
  for (let i = 0; i < 6; i++) {
    const piv = new THREE.Group(); piv.position.set((i - 2.5) * .35 * s, 1.04, 0); g.add(piv);
    const m = new THREE.Mesh(gCyl(.1 * s, .1 * s, .012, 28), G.mat({ color: '#e8e3d4', roughness: .6, metalness: .3 })); m.position.y = .11 * s; piv.add(m);
    plates.push({ piv, down: 0, fall: false, cx: x + (i - 2.5) * .35 * s, cy: 1.04 + .11 * s });
  }
  return { type: 'platerack', g, focus: V3(x, 1.1, z), w: 1.2 * s,
    rayTest(ro, rd, maxT) { const t = (z - ro.z) / rd.z; if (t <= 0 || t > maxT) return -1; const p = ro.clone().addScaledVector(rd, t); this._p = null; for (const P of plates) if (!P.fall && Math.hypot(p.x - P.cx, p.y - P.cy) < .1 * s) { this._p = P; return t; } return -1; },
    onHit(b, p, dir, e, speed) { const P = this._p; P.fall = true; G.Audio.ding(p, 0); G.FX.impact(p, V3(0, 0, 1), dir, 'steel', 1, { decal: false }); const left = plates.filter(q => !q.fall).length; return { pass: false, info: left ? `Plate down · ${left} left` : 'Rack cleared!' }; },
    update(dt) { for (const P of plates) { if (P.fall) P.down = Math.min(1, P.down + dt * (3 + P.down * 10)); P.piv.rotation.x = -P.down * 1.5; } if (plates.every(q => q.fall && q.down >= 1)) { this.t = (this.t || 0) + dt; if (this.t > 2.5) this.reset(); } },
    reset() { this.t = 0; for (const P of plates) { P.fall = false; P.down = 0; } } };
};

// ------------------------------------------------------------------ dueling tree: paddles flip to the other side
TGT.dueltree = function (x, z, dist) {
  const s = clamp(dist / 100, 1, 3);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const post = new THREE.Mesh(gBox(.06, 1.8 * s, .06), G.surf('darkmetal')); post.position.y = .9 * s; g.add(post);
  const pads = [];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, y = (.6 + i * .2) * s;
    const piv = new THREE.Group(); piv.position.set(0, y, 0); g.add(piv);
    const arm = new THREE.Mesh(gBox(.3 * s, .02, .02), G.surf('darkmetal')); arm.position.x = .15 * s; piv.add(arm);
    const pad = new THREE.Mesh(gCyl(.07 * s, .07 * s, .012, 24), G.mat({ color: '#e8e3d4', roughness: .6, metalness: .3 })); pad.position.x = .32 * s; piv.add(pad);
    const P = { piv, side, ang: side > 0 ? 0 : PI, target: side > 0 ? 0 : PI, y }; piv.rotation.z = P.ang; pads.push(P);
  }
  return { type: 'dueltree', g, focus: V3(x, 1.1 * s, z), w: .8 * s,
    rayTest(ro, rd, maxT) { const t = (z - ro.z) / rd.z; if (t <= 0 || t > maxT) return -1; const p = ro.clone().addScaledVector(rd, t); for (const P of pads) { const px = x + Math.cos(P.ang) * .32 * s, py = P.y + Math.sin(P.ang) * .32 * s; if (Math.hypot(p.x - px, p.y - py) < .07 * s) { this._p = P; return t; } } return -1; },
    onHit(b, p, dir) { const P = this._p; P.target = Math.abs(P.target) < .1 ? PI : 0; G.Audio.ding(p, 0); G.FX.impact(p, V3(0, 0, 1), dir, 'steel', .8, { decal: false }); const left = pads.filter(q => Math.abs(q.target) < .1).length; return { pass: false, info: `Paddle swung · ${left} on the right, ${6 - left} on the left` }; },
    update(dt) { for (const P of pads) { P.ang += (P.target - P.ang) * Math.min(1, dt * 9); P.piv.rotation.z = P.ang; } },
    reset() { for (const P of pads) { P.target = P.ang = P.side > 0 ? 0 : PI; } } };
};

// ------------------------------------------------------------------ hostage: IPSC target with a no-shoot overlapping it
TGT.hostage = function (x, z, dist) {
  const T = TGT.ipsc(x, z, dist); T.type = 'hostage';
  const s = clamp(dist / 150, 1, 4), w = .46 * s, h = .76 * s, cy = .9 + h / 2;
  const ns = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.113, h * 1.113 * .96), G.mat({ map: G.texTarget('ipsc'), color: '#f4f2ea', transparent: true, alphaTest: .5, roughness: 1, side: THREE.DoubleSide }));
  ns.position.set(w * .45, cy - h * .05, .03); T.card.add(ns);
  const base = T.onHit.bind(T), baseRay = T.rayTest.bind(T);
  T.rayTest = function (ro, rd, maxT) { const t = (z + .03 - ro.z) / rd.z; if (t > 0 && t < maxT) { const p = ro.clone().addScaledVector(rd, t); const lx = (p.x - x - w * .45) / w, ly = (p.y - (cy - h * .05)) / h; if ((Math.abs(lx) < .22 && ly > .28 && ly < .5) || (Math.abs(lx) < .5 && ly < .28 && ly > -.5)) { this._ns = true; return t; } } this._ns = false; return baseRay(ro, rd, maxT); };
  T.onHit = function (b, p) { if (this._ns) { G.Audio.hit(false, false); return { pass: true, v: .98, info: 'NO-SHOOT hit! Hostage struck (−10 pts)' }; } return base(b, p); };
  return T;
};

// ------------------------------------------------------------------ walking enemy mannequin
TGT.walker = function (x, z, dist, o = {}) {
  const era = o.era || 'ww2', tier = o.tier || 'regular';
  const wp = G.eraWeapons(era, ['RIF', 'AR', 'SMG'])[0];
  const S = G.buildSoldier({ era, team: 1, tier, weapon: wp });
  S.root.position.set(x, 0, z); S.root.rotation.y = -PI / 2;
  const T = { type: 'walker', g: S.root, S, hp: G.TIER[tier].hp, dir: 1, cx: 0, focus: V3(x, 1.3, z), tier: G.TIER[tier], era,
    rayTest(ro, rd, maxT) { if (S.dead > 0) return -1; let best = -1; for (const hb of G.soldierHitboxes(S)) { const t = G.rayCapsule(ro, rd, hb.a, hb.b, hb.r); if (t >= 0 && t < maxT && (best < 0 || t < best)) { best = t; this._zone = hb.zone; } } return best; },
    onHit(b, p, dir, energy) { const d = b.dmg * energy * (G.ZONE_MUL[this._zone] || 1); this.hp -= d; S.flinch = 1; G.FX.impact(p, dir.clone().negate(), dir, 'flesh', 1);
      if (this.hp <= 0) { S.dead = .0001; S.deathKind = null; S.headshot = this._zone === 'head'; S.deathDir.set(0, 0, 1); this.t = 0; }
      return { pass: false, info: `Moving target · ${this._zone} · ${Math.round(d)} dmg${this.hp <= 0 ? ' · DOWN' : ''}` }; },
    update(dt) {
      if (S.dead > 0) { G.animateSoldier(S, { dt, dead: true }); this.t += dt; if (this.t > 3) this.reset(); return; }
      this.cx += this.dir * 1.5 * dt; if (Math.abs(this.cx) > 7) { this.cx = Math.sign(this.cx) * 7; this.dir *= -1; }
      S.root.position.x = x + this.cx; S.root.rotation.y = this.dir > 0 ? -PI / 2 : PI / 2; this.focus.x = x + this.cx;
      G.animateSoldier(S, { dt, speed: 1.5 });
    },
    reset() { this.hp = this.tier.hp; S.dead = 0; S.deathKind = null; S.root.rotation.set(0, -PI / 2, 0); S.hips.position.y = .96; S.chest.rotation.x = 0; S.neck.rotation.set(0, 0, 0); for (const L of S.legs) { L.knee.rotation.x = 0; L.hip.rotation.x = 0; } if (S.gun) { S.gun.holder.rotation.set(0, 0, 0); S.gun.holder.position.set(.13, .06, -.12); } },
  };
  return T;
};

G.TARGETS.push(
  { id: 'vehicle', n: 'Vehicle with crew', d: 'Cars to tanks. Real armour thickness, slope and penetration.' },
  { id: 'barrier', n: 'Barrier penetration test', d: 'Drywall, plywood, car door, glass, steel, brick, block, sandbag — with gel behind each.' },
  { id: 'platerack', n: 'Plate rack', d: 'Six falling 20 cm plates. Clear the rack.' },
  { id: 'dueltree', n: 'Dueling tree', d: 'Paddles flip to the other side when hit.' },
  { id: 'hostage', n: 'Hostage target', d: 'IPSC target partly covered by a no-shoot.' },
  { id: 'walker', n: 'Walking enemy', d: 'Era soldier walking across the lane at 1.5 m/s.' },
);
})();
