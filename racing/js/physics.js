// Vehicle dynamics: single-track (bicycle) model with combined-slip tyres, load transfer,
// aero, drivetrain with gears, surfaces, jumps, tyre wear, fuel and assists.
var RX = window.RX || (window.RX = {});

(function () {
  var G = 9.81;

  // Grip of each compound on each surface: asphalt, gravel, dirt, mud, snow, sand, salt, grass
  RX.COMPOUNDS = {
    soft: { name: 'Slick — Soft', g: [1.04, .6, .58, .42, .3, .48, .82, .5], wear: 1.7, rain: .55 },
    medium: { name: 'Slick — Medium', g: [1.0, .6, .58, .42, .3, .48, .82, .5], wear: 1.0, rain: .58 },
    hard: { name: 'Slick — Hard', g: [.96, .6, .58, .42, .3, .48, .82, .5], wear: 0.6, rain: .6 },
    inter: { name: 'Intermediate', g: [.93, .66, .64, .5, .38, .55, .8, .55], wear: 1.2, rain: .82 },
    wet: { name: 'Full Wet', g: [.86, .66, .64, .52, .4, .55, .78, .55], wear: 1.6, rain: .9 },
    treaded: { name: 'Treaded / Cross-ply', g: [.92, .72, .7, .55, .42, .6, .8, .55], wear: 0.7, rain: .75 },
    gravel: { name: 'Gravel', g: [.86, .84, .8, .63, .5, .7, .8, .6], wear: 0.9, rain: .78 },
    snow: { name: 'Studded Snow', g: [.72, .72, .7, .56, .8, .56, .72, .55], wear: 1.0, rain: .7 },
    dirt: { name: 'Dirt Oval', g: [.82, .8, .88, .68, .46, .72, .8, .62], wear: 1.0, rain: .75 },
    sand: { name: 'Desert / All-terrain', g: [.8, .8, .82, .68, .5, .86, .8, .62], wear: 0.5, rain: .75 },
    drag: { name: 'Drag Slick', g: [1.08, .5, .5, .4, .25, .4, .85, .45], wear: 1.0, rain: .4 }
  };
  var SURF_IDX = { asphalt: 0, gravel: 1, dirt: 2, mud: 3, snow: 4, sand: 5, salt: 6, grass: 7 };

  RX.autoCompound = function (car, track) {
    var s = track ? track.surface : 'asphalt';
    if (car.body === 'dragster' || car.body === 'funny' || car.body === 'prostock' || car.body === 'gasser') return 'drag';
    if (s === 'snow') return 'snow';
    if (car.sport === 'dirt') return 'dirt';
    if (car.sport === 'offroad') return 'sand';
    if (s === 'gravel' || s === 'dirt' || s === 'mud' || s === 'mixed' || car.sport === 'rx') return 'gravel';
    if (s === 'sand') return 'sand';
    if (car.year < 1966 || car.body === 'streamliner') return 'treaded';
    if (track && track.rain) return 'wet';
    return 'medium';
  };

  // Engine character per type: redline rpm, idle, gears (by era)
  var ENG = {
    I4: [7500, 900], I4T: [7800, 1000], I4H: [8500, 1000], I5: [7500, 900], I5T: [7500, 1000], I6: [7500, 900], I6T: [7800, 1000], I8: [6500, 800], I3T: [8000, 1000],
    V4: [7000, 900], V4H: [9000, 1200], V6: [8500, 1000], V6T: [10500, 1200], V6H: [13500, 4000], V8: [9200, 1000], V8T: [8800, 1100], V8H: [9500, 1200], V10: [17500, 4000], V12: [9500, 1000], V16: [6000, 800],
    F4: [6500, 900], F4T: [7500, 1000], F8: [8800, 1000], F6: [8500, 1000], F6T: [8000, 1000], F12: [9500, 1200], R: [9200, 1100], E: [18000, 0], T: [40000, 15000], '2T': [16000, 2500], '4T': [3800, 1400], D: [5000, 900], NITRO: [8400, 2500]
  };

  RX.carSpec = function (car, cus) {
    var y = car.year, b = car.body, sp = car.sport;
    var s = { mu: 1.3, df: 0.3, h: 0.45, wf: 0.5, steer: 0.5, gears: 6, shift: 0.15, susp: 0.5, brakeG: 1.0 };
    if (b === 'openwheel') {
      s.mu = y < 1940 ? .9 : y < 1959 ? .95 : y < 1968 ? 1.05 : y < 1971 ? 1.25 : (y >= 2017 && y < 2022 ? 1.55 : 1.45);
      s.df = y < 1968 ? .05 : y < 1971 ? .6 : y < 1977 ? .9 : y < 1983 ? 1.9 : y < 1989 ? 1.4 : y < 1998 ? 1.8 : y < 2009 ? 2.3 : y < 2017 ? 2.2 : y < 2022 ? 2.8 : 2.6;
      if (sp === 'indy' && y >= 1990) s.df *= 0.75; // oval aero
      if (sp === 'fe') { s.mu = 1.25; s.df = y < 2018 ? 1.0 : y < 2023 ? 1.2 : 0.9; }
      if (/BT46B/.test(car.name)) s.df = 2.4;
      s.h = .3; s.wf = y < 1959 ? .5 : .44; s.steer = .32; s.gears = y < 1960 ? 4 : y < 1970 ? 5 : y < 1989 ? 5 : y < 1995 ? 6 : y < 2014 ? 7 : 8;
      s.shift = y < 1990 ? 0.25 : y < 2000 ? 0.06 : 0.03; s.susp = .85; s.brakeG = y < 1970 ? 1 : y < 1990 ? 1.3 : 1.6;
      if (sp === 'indy') s.gears = y < 1965 ? 2 : 6;
    } else if (b === 'kart') { s.mu = 1.3; s.df = car.hp > 60 ? .4 : 0; s.h = .28; s.wf = .42; s.steer = .45; s.gears = /KZ|Superkart|100cc|McCulloch/.test(car.name) ? 6 : 1; s.shift = .05; s.susp = 1; s.brakeG = 1; }
    else if (b === 'sprint' || b === 'midget') { s.mu = 1.4; s.df = b === 'sprint' && !/Micro/.test(car.name) ? 1.0 : 0; s.h = .5; s.wf = .45; s.steer = .5; s.gears = 1; s.susp = .6; }
    else if (b === 'dragster') { s.mu = y < 1971 ? 1.6 : 3.2; s.df = y < 1971 ? .1 : 2.2; s.h = .35; s.wf = .25; s.steer = .08; s.gears = y < 1971 ? 2 : 1; s.shift = .1; s.susp = 1; }
    else if (b === 'funny') { s.mu = y < 1980 ? 2.0 : 3.0; s.df = 1.6; s.h = .35; s.wf = .3; s.steer = .1; s.gears = 1; }
    else if (b === 'prostock' || b === 'gasser') { s.mu = b === 'gasser' ? 1.4 : 1.8; s.df = .3; s.h = .5; s.wf = .45; s.steer = .2; s.gears = car.engine === 'E' ? 1 : 5; s.shift = .05; }
    else if (b === 'prewar') { s.mu = .82; s.df = 0; s.h = .55; s.wf = .52; s.steer = .5; s.gears = 4; s.shift = .45; s.susp = .3; s.brakeG = .6; }
    else if (b === 'stock' || b === 'latemodel' || b === 'modified' || b === 'legends') { s.mu = y < 1970 ? 1.0 : 1.2; s.df = y < 1969 ? .1 : .45; s.h = .45; s.wf = .52; s.steer = .45; s.gears = 4; s.shift = .2; s.brakeG = .9; }
    else if (b === 'gt') { s.mu = y < 1975 ? 1.05 : y < 1995 ? 1.25 : 1.4; s.df = y < 1975 ? .1 : y < 1995 ? .5 : y < 2006 ? 1.0 : .8; s.h = .42; s.wf = .48; s.steer = .5; s.gears = y < 1990 ? 5 : 6; s.shift = y < 2000 ? .2 : .05; }
    else if (b === 'proto' || b === 'hyper' || b === 'groupc' || b === 'lmpopen') {
      s.mu = y < 1968 ? 1.1 : y < 1982 ? 1.3 : 1.45; s.df = y < 1968 ? .25 : y < 1982 ? 1.0 : b === 'groupc' || y < 1993 ? 1.9 : y < 2012 ? 1.9 : b === 'hyper' ? 1.4 : 2.2;
      s.h = .33; s.wf = .45; s.steer = .38; s.gears = y < 1980 ? 5 : 6; s.shift = y < 2000 ? .15 : .04; s.brakeG = 1.3;
      if (sp === 'hill') s.df = 2.0;
    } else if (b === 'roadster') { s.mu = 1.0; s.df = .05; s.h = .45; s.wf = .5; s.steer = .45; s.gears = 4; s.shift = .3; s.brakeG = .8; }
    else if (b === 'canam') { s.mu = 1.3; s.df = y < 1968 ? .3 : /2J/.test(car.name) ? 2.0 : 1.2; s.h = .32; s.wf = .42; s.steer = .38; s.gears = 4; s.shift = .2; }
    else if (b === 'pickup' || b === 'suv' || b === 'buggy' || b === 'van') { s.mu = 1.15; s.df = sp === 'hill' ? 1.2 : .15; s.h = sp === 'nascar' ? .48 : .75; s.wf = .5; s.steer = .55; s.gears = 6; s.susp = .25; }
    else if (b === 'lorry') { s.mu = .95; s.df = 0; s.h = 1.3; s.wf = .55; s.steer = .5; s.gears = 10; s.susp = .2; s.brakeG = .7; s.shift = .4; }
    else if (b === 'streamliner') { s.mu = .95; s.df = .1; s.h = .4; s.wf = .5; s.steer = .07; s.gears = car.engine === 'T' ? 1 : 4; }
    else { // sedan / hatch / coupe / wagon
      s.mu = y < 1970 ? 1.0 : y < 1990 ? 1.15 : 1.3; s.df = sp === 'touring' ? (y > 2015 && /DTM/.test(car.name) ? 1.2 : y > 1990 ? .4 : .15) : sp === 'rally' ? (y > 2016 ? .5 : .3) : sp === 'drift' ? .35 : .3;
      s.h = .45; s.wf = car.drive === 'FWD' ? .62 : .52; s.steer = sp === 'drift' ? .9 : .55; s.gears = y < 1980 ? 4 : y < 1990 ? 5 : 6; s.shift = y < 1995 ? .2 : .06;
      if (/Stratos|Alpine A110|037|Delta S4|205 T16|RS200|6R4/.test(car.name)) s.wf = .42;
    }
    if (car.engine === 'E' && b !== 'prostock') s.gears = 1;
    if (car.engine === 'T' && b !== 'streamliner') s.gears = 1;
    if (sp === 'nascar') s.gears = y > 2021 ? 5 : 4;
    if (b === 'kart' && car.engine === 'E') s.gears = 1;
    // customisation
    var cpow = cus.power || 0;
    var e = ENG[car.engine] || ENG.V8;
    var red = e[0], idle = e[1];
    if (car.engine === 'V8' && sp === 'nascar') red = 9500;
    if (car.engine === 'V8' && y < 1970) red = 7000;
    if (car.engine === 'V12' && y < 1960) red = 7500;
    if (car.engine === 'V12' && sp === 'f1' && y > 1985) red = 14000;
    if (car.engine === 'V8' && sp === 'f1' && y >= 2006) red = 18000;
    if (car.engine === 'V8' && sp === 'f1' && y < 1990) red = 11000;
    if (car.engine === '2T' && /KZ|Superkart/.test(car.name)) red = 14500;
    var mass = car.kg * (1 - (cus.weightRed || 0) * 0.12) + (cus.ballast || 0) + (car.body === 'kart' ? 75 : car.kg < 1500 ? 80 : 90);
    var P = car.hp * 745.7 * (1 + cpow * 0.35) * (1 + ((cus.boost == null ? 0.5 : cus.boost) - 0.5) * (/T$|NITRO|H$/.test(car.engine) ? 0.25 : 0));
    var vtop = car.top / 3.6 * (1 + cpow * 0.06);
    var dfMul = s.df * (0.6 + 0.8 * (((cus.aeroF == null ? .5 : cus.aeroF) + (cus.aeroR == null ? .5 : cus.aeroR)) / 2));
    // drag coefficient so that power balances drag (+ rolling) at the listed top speed
    var effP = P * 0.86;
    var roll = 0.012 * mass * G * vtop;
    var cdrag = Math.max(0.05, (effP - roll) / (vtop * vtop * vtop));
    // more downforce = more drag
    cdrag *= 1 + (dfMul - s.df) * 0.12;
    // aero: downforce reference at 250 km/h, scaled with v^2
    var kd = dfMul * mass * G / (69.4 * 69.4);
    var aeroBal = 0.42 + ((cus.aeroF == null ? .5 : cus.aeroF) - (cus.aeroR == null ? .5 : cus.aeroR)) * 0.25;
    var wb = 2.7; // replaced from model dims later
    var gears = s.gears;
    var fd = cus.finalDrive || 1;
    var ratios = [];
    // geometric-ish spacing: top gear reaches vtop at ~98% of redline
    var first = gears === 1 ? 1 : (gears <= 2 ? 0.55 : gears <= 4 ? 0.4 : gears <= 6 ? 0.32 : 0.26);
    for (var i = 0; i < gears; i++) {
      var f = gears === 1 ? 1 : first * Math.pow(1 / first, Math.pow(i / (gears - 1), 0.85));
      ratios.push(vtop * 1.04 * f / fd);
    }
    var comp = cus.compound && cus.compound !== 'auto' ? cus.compound : null;
    return {
      car: car, mass: mass, P: P, vtop: vtop, cdrag: cdrag, kd: kd, aeroBal: aeroBal, mu: s.mu, h: s.h, wf: s.wf, steerMax: s.steer * (cus.steerLock || 1),
      gears: gears, gearV: ratios, shiftTime: s.shift, red: red * (cus.revLimit || 1), idle: idle, susp: s.susp, brakeG: s.brakeG, compound: comp, drive: car.drive,
      electric: car.engine === 'E', turbine: car.engine === 'T', diesel: car.engine === 'D', df: dfMul
    };
  };

  // power curve as fraction of peak at rpm fraction x (0..1 of redline)
  function powerCurve(x, spec) {
    if (spec.electric) return x < 0.35 ? Math.max(0.2, x / 0.35) : 1;
    if (spec.turbine) return 0.75 + 0.25 * x;
    if (x < 0.15) return 0.18 + x;
    if (x <= 0.88) return Math.pow(Math.sin(Math.min(1, x / 0.88) * Math.PI / 2), 0.9);
    return Math.max(0.6, 1 - (x - 0.88) * 2.5);
  }

  RX.makePhysics = function (car, cus, dims) {
    var spec = RX.carSpec(car, cus);
    var wb = dims.wb, a = wb * spec.wf, b2 = wb - a; // CG to front axle = wb*(1-wf)?
    // wf = static weight fraction on the front axle -> CG distance to front axle = wb*(1-wf)
    a = wb * (1 - spec.wf); b2 = wb * spec.wf;
    var st = {
      spec: spec, dims: dims, x: 0, y: 0, z: 0, heading: 0, vx: 0, vy: 0, r: 0, vY: 0, onGround: true, air: 0,
      gear: 1, rpm: spec.idle, shiftT: 0, clutch: 1, steer: 0, swAngle: 0, throttle: 0, brake: 0,
      a: a, b: b2, Iz: spec.mass * (a * a + b2 * b2) * 1.0, wear: 0, fuel: 1, fuelUse: 0, damage: 0,
      slipF: 0, slipR: 0, wheelspin: 0, lockF: 0, lockR: 0, latG: 0, lonG: 0, pitch: 0, roll: 0, heave: 0, pitchV: 0, rollV: 0,
      surf: 'asphalt', idx: 0, s: 0, lat: 0, offTrack: false, wallHit: 0, brakeHeat: 0, nitro: cus.nitro ? 1 : 0, nitroOn: false,
      wheelSpeed: 0, wheelSpeedF: 0, flame: 0, lastThrottle: 0, drs: false, attack: 0, energy: 1, susp: [0, 0, 0, 0], drift: 0, chute: false
    };
    st.cus = cus;
    return st;
  };

  function pacejka(alpha, B, C) { return Math.sin(C * Math.atan(B * alpha)); }

  // One integration step. input: {steer -1..1, throttle 0..1, brake 0..1, handbrake 0/1, shiftUp, shiftDown, boost}
  RX.stepPhysics = function (st, input, dt, env) {
    var sp = st.spec, cus = st.cus, m = sp.mass, track = env.track;
    // --- track query ---
    var q = RX.trackLocal(track, st.x, st.z, st.idx);
    st.idx = q.idx; st.s = q.s; st.lat = q.lat;
    var p = q.p;
    var absLat = Math.abs(q.lat), onRoad = absLat <= p.w + 0.2;
    var surf = p.surf;
    var kerb = false;
    if (!onRoad) {
      if (p.kerb && absLat < p.w + 1.3 && track.style !== 'stage' && track.style !== 'hill') { kerb = true; surf = 'asphalt'; }
      else if (track.style === 'drag') surf = track.theme === 'salt' ? 'salt' : 'grass';
      else if (track.style === 'stage' || track.style === 'hill' || track.style === 'rx') surf = surf === 'snow' ? 'snow' : (surf === 'sand' ? 'sand' : surf === 'asphalt' ? 'gravel' : surf);
      else surf = track.theme === 'desert' ? 'sand' : track.theme === 'snow' ? 'snow' : (track.style === 'oval' && absLat < p.w + 4 ? 'asphalt' : 'grass');
      if (track.theme === 'salt') surf = 'salt';
    }
    st.surf = surf; st.offTrack = !onRoad && !kerb;
    var comp = RX.COMPOUNDS[sp.compound || RX.autoCompound(sp.car, track)] || RX.COMPOUNDS.medium;
    var compKey = sp.compound || RX.autoCompound(sp.car, track);
    var surfMu = comp.g[SURF_IDX[surf]];
    if (env.rain && (surf === 'asphalt')) surfMu *= comp.rain;
    if (env.rain && surf !== 'asphalt') surfMu *= 0.92;
    var wearMul = 1 - st.wear * 0.28;
    var tempMul = 1;
    // camber & pressure: an optimum near -2.5 deg front, -1.5 rear and mid pressure
    var camberMul = 1 - Math.abs((cus.camberF || -2.5) + 2.5) * 0.015 - Math.abs((cus.camberR || -1.5) + 1.5) * 0.015;
    var pressMul = 1 - Math.abs((cus.tirePress == null ? .5 : cus.tirePress) - 0.5) * 0.12;
    var mu = sp.mu * surfMu * wearMul * camberMul * pressMul * (env.gripMul || 1);
    if (compKey === 'soft') mu *= 1.0; // already in table
    var muLowSpeedBonus = 1;
    // --- velocities ---
    var vx = st.vx, vy = st.vy, r = st.r;
    var speed = Math.sqrt(vx * vx + vy * vy);
    // --- inputs ---
    var steerIn = input.steer || 0;
    var steerSpeedRed = 1 / (1 + Math.max(0, speed - 8) / (sp.steerMax > 0.7 ? 60 : 32) * (cus.steerSens != null ? 1.5 - cus.steerSens * 0.5 : 1));
    if (input.analog) steerSpeedRed = 1 / (1 + Math.max(0, speed - 8) / 70);
    var targetSteer = steerIn * sp.steerMax * steerSpeedRed;
    // self-aligning countersteer help for keyboard when sliding (stability assist)
    var beta = speed > 3 ? Math.atan2(vy, Math.abs(vx)) : 0;
    if (cus.sc && !input.analog) targetSteer += -beta * 0.55 * (cus.sc ? 1 : 0);
    var steerRate = (input.analog ? 8 : 3.2) * (1 + speed / 60);
    st.steer += Math.max(-steerRate * dt, Math.min(steerRate * dt, targetSteer - st.steer));
    st.steer = Math.max(-sp.steerMax * 1.2, Math.min(sp.steerMax * 1.2, st.steer));
    var delta = st.steer;
    // steering assist: never steer the fronts far past their peak slip angle (keyboard / autopilot)
    var BtA = (surf === 'asphalt' || surf === 'salt') ? (sp.mu > 1.3 ? 14 : 11) : 6;
    if ((input.assist || cus.steerAssist) && speed > 6 && st.onGround) {
      var aPeak = Math.tan(Math.PI / 3.2) / BtA * 1.15;
      var aKin = Math.atan2(st.vy + st.a * st.r, Math.max(3, Math.abs(st.vx)));
      delta = Math.max(aKin - aPeak, Math.min(aKin + aPeak, delta));
    }
    var ratioSW = sp.steerMax < 0.15 ? 4 : sp.steerMax > 0.7 ? 7 : (sp.car.body === 'openwheel' ? 3.0 : 7);
    st.swAngle = delta * ratioSW;
    var thr = input.throttle || 0, brk = input.brake || 0;
    // --- gearbox ---
    var reverse = st.gear === -1;
    if (st.shiftT > 0) st.shiftT -= dt;
    var gv = sp.gearV, ng = sp.gears;
    var auto = cus.gearbox !== 'manual';
    var vForward = vx;
    if (auto) {
      if (!reverse) {
        var x = Math.abs(vForward) / gv[st.gear - 1];
        if (x > 0.965 && st.gear < ng && st.shiftT <= 0) { st.gear++; st.shiftT = sp.shiftTime; st.flame = 1; }
        else if (st.gear > 1 && Math.abs(vForward) / gv[st.gear - 2] < 0.68 && st.shiftT <= 0) { st.gear--; st.shiftT = sp.shiftTime * 0.6; }
        if (brk > 0.3 && speed < 1.0 && st.gear >= 1 && input.brakeHeld > 0.4) { st.gear = -1; }
      } else {
        if (thr > 0.3 && speed < 1.0) st.gear = 1;
      }
    } else {
      if (input.shiftUp && st.shiftT <= 0) { if (st.gear === -1) st.gear = 1; else if (st.gear === 0) st.gear = 1; else if (st.gear < ng) { st.gear++; st.flame = 1; } st.shiftT = sp.shiftTime; }
      if (input.shiftDown && st.shiftT <= 0) { if (st.gear > 1) st.gear--; else if (st.gear === 1 && speed < 2) st.gear = -1; st.shiftT = sp.shiftTime * 0.6; }
    }
    if (reverse) { var tmp = thr; thr = brk; brk = tmp; }
    // --- engine & drive force ---
    var gIdx = Math.max(0, st.gear - 1);
    var gvMax = reverse ? gv[0] * 0.6 : gv[gIdx];
    var xr = Math.abs(vForward) / gvMax;
    var rpmTarget = sp.idle + (sp.red - sp.idle) * Math.min(1.05, xr);
    // free revs when airborne / wheelspin / clutch in
    if (!st.onGround || st.shiftT > 0) rpmTarget = Math.max(rpmTarget, sp.idle + (sp.red - sp.idle) * Math.min(1, thr * 0.9));
    if (speed < 2 && thr > 0) rpmTarget = Math.max(rpmTarget, sp.idle + (sp.red - sp.idle) * (sp.car.sport === 'drag' ? 0.75 : 0.45) * thr);
    st.rpm += (rpmTarget - st.rpm) * Math.min(1, dt * 12);
    var rpm01 = (st.rpm - sp.idle) / (sp.red - sp.idle);
    st.rpm01 = Math.max(0, Math.min(1.05, rpm01));
    var limiter = xr > 1.02 && !sp.electric;
    var power = sp.P * powerCurve(Math.min(1, xr), sp);
    if (st.nitroOn) power *= 1.35;
    if (env.attack) power *= 1.15;
    if (env.powerMul) power *= env.powerMul;
    if (st.fuel <= 0) power *= 0.05;
    if (sp.electric && env.energyMode) { if (st.energy <= 0) power *= 0.2; }
    var vEff = Math.max(Math.abs(vForward), gvMax * (sp.electric ? 0.06 : 0.22));
    var Fdrive = st.shiftT > 0 || limiter ? 0 : thr * power * 0.9 / vEff;
    if (reverse) Fdrive = -Fdrive * 0.5;
    if (st.damage > 0.5) Fdrive *= 1 - (st.damage - 0.5) * 0.5;
    // --- aero & resistances ---
    var draftMul = 1 - (env.draft || 0);
    var dragF = sp.cdrag * speed * speed * draftMul * (st.drs ? 0.88 : 1) * (1 + st.damage * 0.15);
    var down = sp.kd * speed * speed * (env.dirtyAir ? 1 - env.dirtyAir * 0.25 : 1);
    var surfInfo = RX.SURF[surf];
    var rollF = (surfInfo ? surfInfo.roll : 0.015) * m * G;
    // --- loads ---
    var Fz = m * G * Math.cos(Math.atan(0)) + down;
    var lonTransfer = m * st.lonG * G * sp.h / (st.a + st.b);
    var FzF = m * G * st.b / (st.a + st.b) + down * sp.aeroBal - lonTransfer;
    var FzR = m * G * st.a / (st.a + st.b) + down * (1 - sp.aeroBal) + lonTransfer;
    // banking adds normal load (centripetal support) and a gravity component downhill
    var bank = p.bank;
    var bankGrav = 0;
    if (Math.abs(bank) > 0.001) {
      var cb = Math.cos(bank);
      FzF /= cb; FzR /= cb;
      // lateral gravity along the banked surface, pulling to the inside (lower) side; expressed in car frame
      var hRel = st.heading - Math.atan2(p.tx, p.tz);
      var latComp = Math.cos(hRel); // how much the car's lateral axis aligns with track normal
      bankGrav = G * Math.sin(bank) * latComp; // downhill = toward +lat (inside of the turn)
    }
    FzF = Math.max(50, FzF); FzR = Math.max(50, FzR);
    // lateral load transfer -> axle grip loss, distributed by roll stiffness (ARBs)
    var rollShareF = 0.5 + ((cus.arbF == null ? .5 : cus.arbF) - (cus.arbR == null ? .5 : cus.arbR)) * 0.35 + (sp.wf - 0.5) * 0.4;
    var trackW = st.dims.trackF || 1.6;
    var LLT = m * Math.abs(st.latG) * G * sp.h / trackW;
    var muF = mu * (1 - 0.32 * Math.pow(Math.min(1, LLT * rollShareF / FzF), 2));
    var muR = mu * (1 - 0.32 * Math.pow(Math.min(1, LLT * (1 - rollShareF) / FzR), 2));
    // springs: stiffer = slightly less mechanical grip on bumpy surfaces, more aero platform
    var sprK = cus.spring == null ? .5 : cus.spring;
    var bumpy = surf !== 'asphalt' || kerb;
    if (bumpy) { muF *= 1 - sprK * 0.08; muR *= 1 - sprK * 0.08; } else { muF *= 1 + (sprK - 0.5) * 0.02 * sp.df; muR *= 1 + (sprK - 0.5) * 0.02 * sp.df; }
    var capF = muF * FzF, capR = muR * FzR;
    // --- driven axles ---
    var driveF = sp.drive === 'FWD' ? 1 : sp.drive === 'AWD' ? 0.42 : 0;
    var FdF = Fdrive * driveF, FdR = Fdrive * (1 - driveF);
    // nitrous / diff open loss on inside wheel
    var diff = cus.diff == null ? .5 : cus.diff;
    var openLoss = 1 - (1 - diff) * 0.3 * Math.min(1, Math.abs(st.latG) / Math.max(0.3, mu));
    // traction control
    var spin = 0;
    // traction control keeps a lateral reserve: only the grip not already used for cornering is available
    var tcR = Math.sqrt(Math.max(capR * capR * 0.12, capR * capR - (st.FyR || 0) * (st.FyR || 0) * 1.1)) * openLoss;
    var tcF = Math.sqrt(Math.max(capF * capF * 0.12, capF * capF - (st.FyF || 0) * (st.FyF || 0) * 1.1)) * openLoss;
    if (cus.tc) { if (Math.abs(FdR) > tcR * 0.95) FdR = Math.sign(FdR) * tcR * 0.95; if (Math.abs(FdF) > tcF * 0.95) FdF = Math.sign(FdF) * tcF * 0.95; }
    if (Math.abs(FdR) > capR * openLoss) { spin = Math.max(spin, (Math.abs(FdR) - capR * openLoss) / (capR + 1)); FdR = Math.sign(FdR) * capR * openLoss * 0.88; }
    if (Math.abs(FdF) > capF * openLoss) { spin = Math.max(spin, (Math.abs(FdF) - capF * openLoss) / (capF + 1)); FdF = Math.sign(FdF) * capF * openLoss * 0.88; }
    st.wheelspin += (Math.min(1.5, spin) - st.wheelspin) * Math.min(1, dt * 10);
    // --- brakes ---
    var bias = cus.brakeBias == null ? 0.56 : cus.brakeBias;
    var maxBrake = (cus.brakePress || 1) * m * G * sp.brakeG * 1.3 + down * 1.1;
    var Fb = brk * maxBrake;
    var FbF = Fb * bias, FbR = Fb * (1 - bias);
    var lockF = 0, lockR = 0;
    if (cus.abs) {
      // ABS keeps steering/lateral reserve like a real system holding peak slip
      var absF = Math.sqrt(Math.max(capF * capF * 0.25, capF * capF - (st.FyF || 0) * (st.FyF || 0))) * 0.95;
      var absR = Math.sqrt(Math.max(capR * capR * 0.25, capR * capR - (st.FyR || 0) * (st.FyR || 0) * 1.2)) * 0.9;
      if (FbF > absF) FbF = absF;
      if (FbR > absR) FbR = absR;
    }
    if (FbF > capF) { lockF = 1; FbF = capF * 0.85; }
    if (FbR > capR) { lockR = 1; FbR = capR * 0.85; }
    if (input.handbrake) { lockR = 1; FbR = Math.max(FbR, capR * 0.75); FdR = 0; }
    st.lockF = lockF; st.lockR = lockR;
    st.brakeHeat = Math.max(0, st.brakeHeat + (brk * speed * 0.02 - st.brakeHeat * 0.6) * dt);
    // --- tyre slip angles ---
    var vxs = Math.max(Math.abs(vx), 3);
    var dirSign = vx >= 0 ? 1 : -1;
    var alphaF = Math.atan2(vy + st.a * r, vxs) - delta * dirSign;
    var alphaR = Math.atan2(vy - st.b * r, vxs);
    // tyre shape: slicks peak early, loose surfaces later
    // peak slip ~6 deg for slicks, ~8 deg for road tyres, ~14 deg on loose surfaces
    var Bt = (surf === 'asphalt' || surf === 'salt') ? (sp.mu > 1.3 ? 14 : 11) : 6, Ct = 1.6;
    if (sp.car.sport === 'drift' && surf === 'asphalt') { Bt = 9; Ct = 1.45; }
    // combined slip: lateral capacity left after longitudinal force
    var lonF = FdF - FbF * dirSign, lonR = FdR - FbR * dirSign;
    // full lateral curve, then clip the combined force to the friction circle (keeps linear-range stiffness)
    var latCapF = Math.sqrt(Math.max(0, capF * capF - lonF * lonF)) * (lockF ? 0.3 : 1);
    var latCapR = Math.sqrt(Math.max(0, capR * capR - lonR * lonR)) * (lockR ? (input.handbrake ? 0.38 : 0.3) : 1) * (1 - Math.min(0.55, st.wheelspin * 0.5));
    var FyF = -capF * (lockF ? 0.3 : 1) * pacejka(alphaF, Bt, Ct);
    // stable-at-the-limit setup: rears are stiffer and slightly grippier (drift cars stay loose)
    var drifty = sp.car.sport === 'drift' || (cus.diff > 0.85);
    var rearB = drifty ? 1.0 : 1.35, rearMu = drifty ? 1.0 : 1.07;
    var FyR = -capR * rearMu * (lockR ? (input.handbrake ? 0.38 : 0.3) : 1) * (1 - Math.min(0.55, st.wheelspin * 0.5)) * pacejka(alphaR, Bt * rearB, Ct);
    if (Math.abs(FyF) > latCapF) FyF = Math.sign(FyF) * latCapF;
    if (Math.abs(FyR) > latCapR * rearMu) FyR = Math.sign(FyR) * latCapR * rearMu;
    // low speed blend toward kinematic behaviour to avoid jitter
    st.slipF = alphaF; st.slipR = alphaR; st.FyF = FyF; st.FyR = FyR;
    if (!st.onGround) { FyF = FyR = 0; lonF = lonR = 0; }
    // --- equations of motion (car frame) ---
    var Fx = lonF * Math.cos(delta) - FyF * Math.sin(delta) + lonR;
    var Fy = lonF * Math.sin(delta) + FyF * Math.cos(delta) + FyR;
    // resistances
    var resist = dragF + (st.onGround ? rollF : 0);
    if (st.chute) resist += 0.9 * speed * speed;
    Fx -= resist * (vx >= 0 ? 1 : -1) * Math.min(1, Math.abs(vx) / 0.5 + 0.0);
    var ax = Fx / m + vy * r;
    var ay = Fy / m - vx * r + (st.onGround ? bankGrav : 0);
    // longitudinal slope from elevation
    var slopeAng = Math.atan2(RX.trackAt(track, st.s + 2, 0).y - RX.trackAt(track, st.s - 2, 0).y, 4);
    var hRel2 = st.heading - Math.atan2(p.tx, p.tz);
    ax -= G * Math.sin(slopeAng) * Math.cos(hRel2) * (st.onGround ? 1 : 0);
    var Mz = st.a * (lonF * Math.sin(delta) + FyF * Math.cos(delta)) - st.b * FyR;
    // locked diff resists yaw at low speed
    Mz -= diff * 0.25 * m * r * Math.min(speed, 15) * 0.2;
    // stability control: damp excessive yaw
    if (cus.sc && speed > 5) { var rTarget = vx * Math.tan(delta) / (st.a + st.b); Mz += (rTarget - r) * st.Iz * 2.5; }
    var rDot = Mz / st.Iz;
    vx += ax * dt; vy += ay * dt; r += rDot * dt;
    // low-speed stabilisation
    if (speed < 2.5 && st.onGround) {
      var kin = 1 - speed / 2.5;
      vy *= 1 - kin * Math.min(1, dt * 8);
      var rKin = vx * Math.tan(delta) / (st.a + st.b);
      r += (rKin - r) * kin * Math.min(1, dt * 10);
      if (thr < 0.05 && Math.abs(vx) < 0.4 && brk > 0.05) vx *= 0.8;
    }
    if (!st.onGround) r *= 1 - dt * 0.3;
    // stop in place when braking at rest
    if (Math.abs(vx) < 0.15 && thr < 0.02 && !reverse) { vx = 0; vy *= 0.9; }
    st.vx = vx; st.vy = vy; st.r = r;
    st.lonG += ((Fx / m) / G - st.lonG) * Math.min(1, dt * 6);
    st.latG += ((Fy / m) / G - st.latG) * Math.min(1, dt * 6);
    // --- integrate pose ---
    st.heading += r * dt;
    var ch = Math.cos(st.heading), sh = Math.sin(st.heading);
    // car forward = (sin h, cos h); right = (cos h, -sin h)
    var wx = vx * sh + vy * ch, wz = vx * ch - vy * sh;
    st.x += wx * dt; st.z += wz * dt;
    st.speed = vx;
    // --- vertical / jumps ---
    var q2 = RX.trackLocal(track, st.x, st.z, st.idx);
    var tp = RX.trackAt(track, q2.s, 0);
    var gY = RX.roadHeight({ y: tp.y, bank: tp.bank, w: tp.w }, q2.lat);
    // terrain bumps off-road
    if (!onRoad && !kerb && track.style !== 'drag') gY += Math.sin(st.x * 0.9) * Math.sin(st.z * 0.7) * 0.05;
    var groundVy = (gY - (st.lastGY == null ? gY : st.lastGY)) / dt;
    st.lastGY = gY;
    if (st.onGround) {
      // the road falls away faster than gravity can pull the car down -> airborne
      var gAcc = (groundVy - (st.lastGVy == null ? groundVy : st.lastGVy)) / dt;
      st.gAccS = (st.gAccS || 0) * 0.6 + gAcc * 0.4;
      if (st.gAccS < -G * 1.15 && speed > 10 && st.vY > groundVy) { st.onGround = false; st.air = 0; }
      else { st.y = gY; st.vY = groundVy; }
    }
    st.lastGVy = groundVy;
    if (!st.onGround) {
      st.vY -= G * dt; st.y += st.vY * dt; st.air += dt;
      if (st.y <= gY) { st.landing = Math.min(1, Math.max(0, (groundVy - st.vY) / 8)); st.y = gY; st.vY = groundVy; st.onGround = true; }
    }
    // --- walls ---
    st.wallHit = 0;
    var wallAt = q2.p.w + track.wallOff;
    if (track.style === 'drag') wallAt = q2.p.w + 2;
    var halfW = (st.dims.W || 1.8) / 2;
    if (Math.abs(q2.lat) + halfW > wallAt) {
      var n = q2.lat > 0 ? 1 : -1; // outward along track normal
      var nx = q2.p.nx * n, nz = q2.p.nz * n;
      var pen = Math.abs(q2.lat) + halfW - wallAt;
      st.x -= nx * pen; st.z -= nz * pen;
      var vn = wx * nx + wz * nz;
      if (vn > 0) {
        var tx2 = wx - vn * nx, tz2 = wz - vn * nz;
        var friction = 0.85 - Math.min(0.35, vn * 0.02);
        wx = tx2 * friction - vn * nx * 0.25; wz = tz2 * friction - vn * nz * 0.25;
        st.vx = wx * sh + wz * ch; st.vy = wx * ch - wz * sh;
        st.r *= 0.5;
        st.wallHit = vn;
        if (env.damage) st.damage = Math.min(1, st.damage + vn * 0.004);
      }
    }
    // --- body motion for visuals ---
    var soft = 1 - sp.susp * 0.6;
    var tP = -st.lonG * 0.022 * soft, tR = st.latG * 0.03 * soft;
    st.pitchV += ((tP - st.pitch) * 60 - st.pitchV * 9) * dt; st.pitch += st.pitchV * dt;
    st.rollV += ((tR - st.roll) * 60 - st.rollV * 9) * dt; st.roll += st.rollV * dt;
    var bumpAmp = (surf === 'asphalt' && !kerb) ? 0.002 : kerb ? 0.012 : 0.02 * (1 - sp.susp * 0.5);
    for (var i = 0; i < 4; i++) st.susp[i] = (st.susp[i] * 0.7 + (Math.random() - 0.5) * bumpAmp * Math.min(1, speed / 10) * 0.3);
    st.heave = -(down / m / G) * 0.015 + (st.landing ? -st.landing * 0.08 : 0);
    if (st.landing) st.landing = Math.max(0, st.landing - dt * 4);
    // --- wheel spin visuals ---
    st.wheelSpeed = vx + (sp.drive !== 'FWD' ? st.wheelspin * 25 * Math.sign(thr + 0.001) : 0);
    st.wheelSpeedF = vx + (sp.drive !== 'RWD' ? st.wheelspin * 25 : 0);
    if (lockR) st.wheelSpeed = 0; if (lockF) st.wheelSpeedF = 0;
    // --- tyre wear & fuel ---
    var slipEnergy = (Math.abs(alphaF) + Math.abs(alphaR)) * speed + st.wheelspin * 20 + (lockF + lockR) * speed * 0.5;
    if (env.wear) st.wear = Math.min(1, st.wear + slipEnergy * 0.000006 * comp.wear * env.wear * dt * 60);
    if (env.fuel) { var burn = thr * sp.P * 0.0000000006 * env.fuel * dt * 60; st.fuel = Math.max(0, st.fuel - burn); }
    if (sp.electric && env.energyMode) {
      st.energy = Math.max(0, Math.min(1, st.energy - thr * power / sp.P * 0.0006 * env.energyMode * dt * 60 + brk * speed * 0.00001 * dt * 60));
    }
    // drift metrics
    st.driftAngle = speed > 6 ? Math.atan2(Math.abs(vy), Math.abs(vx)) : 0;
    // backfire flames on lift-off at high rpm
    if (st.lastThrottle > 0.7 && thr < 0.2 && st.rpm01 > 0.6) st.flame = 0.8;
    st.flame = Math.max(0, st.flame - dt * 5);
    st.lastThrottle = thr;
    st.throttle = thr; st.brake = brk;
    st.kmh = Math.abs(vx) * 3.6;
    return st;
  };

  // Precompute an achievable speed profile for AI along the track, using the same grip model.
  RX.speedProfile = function (track, spec, skill, env) {
    var P = track.pts, N = track.N, v = new Float32Array(N);
    var comp = RX.COMPOUNDS[spec.compound || RX.autoCompound(spec.car, track)] || RX.COMPOUNDS.medium;
    var m = spec.mass, mu0 = spec.mu * skill;
    // curvature smoothed over a window approximates the racing line's larger radius
    var k = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var acc = 0, cnt = 0;
      for (var j = -6; j <= 6; j++) { var idx = track.closed ? (i + j + N) % N : Math.max(0, Math.min(N - 1, i + j)); acc += P[idx].curv; cnt++; }
      // a racing line on a wide circuit opens the radius; narrow stages leave little room
      var lineGain = Math.max(0.88, Math.min(1, 1.12 - P[i].w * 0.032));
      k[i] = Math.abs(acc / cnt) * lineGain;
    }
    for (i = 0; i < N; i++) {
      var sm = comp.g[SURF_IDX[P[i].surf] || 0] * (env && env.rain && P[i].surf === 'asphalt' ? comp.rain : 1);
      var mu = mu0 * sm * 0.95; // load-transfer losses
      var bk = Math.abs(P[i].bank);
      var kk = Math.max(1e-5, k[i]);
      // same banking model as the physics: extra normal load 1/cos(b) and gravity component g*sin(b)
      var denom = kk - mu * spec.kd / m;
      var vmax = denom <= 0 ? spec.vtop : Math.sqrt((mu * 9.81 / Math.cos(bk) + 9.81 * Math.sin(bk)) / denom);
      v[i] = Math.min(spec.vtop * 0.995, vmax * 0.97);
      // drivability over crests / jumps
      if (P[i].jump) v[i] = Math.min(v[i], 30);
    }
    var ds = track.ds;
    // braking pass (backwards)
    var passes = track.closed ? 2 : 1;
    for (var pss = 0; pss < passes; pss++) {
      for (i = N - 2 + (track.closed ? 1 : 0); i >= 0; i--) {
        var nxt = (i + 1) % N;
        var mu2 = mu0 * comp.g[SURF_IDX[P[i].surf] || 0];
        // braking is grip-limited (mechanical + aero), with weak period brakes limiting it further
        var dec = Math.min(spec.brakeG * 12, mu2 * 9.81) * 0.88 + spec.kd * v[nxt] * v[nxt] / m * mu2 * 0.85 + spec.cdrag * v[nxt] * v[nxt] / m;
        v[i] = Math.min(v[i], Math.sqrt(v[nxt] * v[nxt] + 2 * dec * ds));
      }
      // acceleration pass (forwards)
      for (i = 1; i < N + (track.closed ? 1 : 0); i++) {
        var cur = i % N, prv = (i - 1 + N) % N;
        var vv = Math.max(3, v[prv]);
        var mu3 = mu0 * comp.g[SURF_IDX[P[cur].surf] || 0];
        var aMax = Math.min(spec.P * 0.86 * skill / (vv * m), mu3 * 9.81 * (spec.drive === 'AWD' ? 1 : 0.62) + spec.kd * vv * vv / m * mu3 * 0.5) - spec.cdrag * vv * vv / m;
        v[cur] = Math.min(v[cur], Math.sqrt(Math.max(0, vv * vv + 2 * Math.max(0.05, aMax) * ds)));
      }
    }
    return v;
  };

  // Racing line lateral offsets (inside at apexes)
  RX.racingLine = function (track) {
    var P = track.pts, N = track.N, line = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var acc = 0;
      for (var j = -10; j <= 10; j++) { var idx = track.closed ? (i + j + N) % N : Math.max(0, Math.min(N - 1, i + j)); acc += P[idx].curv; }
      acc /= 21;
      // negative curvature turns toward +lat side -> inside is +lat
      line[i] = Math.max(-0.65, Math.min(0.65, -acc * 45)) * P[i].w;
    }
    // widen: outside on entry by smoothing with a forward-shifted copy
    var out = new Float32Array(N);
    for (i = 0; i < N; i++) {
      var s = 0;
      for (j = -25; j <= 25; j++) { var id2 = track.closed ? (i + j + N) % N : Math.max(0, Math.min(N - 1, i + j)); s += line[id2] * (j > 0 ? -0.35 : 1); }
      out[i] = Math.max(-P[i].w * 0.7, Math.min(P[i].w * 0.7, s / 30));
    }
    return out;
  };
})();
