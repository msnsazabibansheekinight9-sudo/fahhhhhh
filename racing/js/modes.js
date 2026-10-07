// Mode presets: every discipline's modes map to sessions of a few kinds (race, solo, drag, drift),
// and multi-part events (GP weekend, rally event, RX heats, championships, ladders) are session lists.
var RX = window.RX || (window.RX = {});

(function () {
  RX.POINTS = {
    f1: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], indy: [50, 40, 35, 32, 30, 28, 26, 24, 22, 20, 19, 18],
    nascar: [40, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25], default: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
  };

  // Default race lengths per discipline (laps), scaled for quick play
  function lapsFor(sport, track) {
    var L = track.length;
    var base = { f1: 5, indy: 8, nascar: 10, endurance: 0, gt: 4, touring: 5, rx: 4, fe: 5, kart: 8, prewar: 4, canam: 4, dirt: 10, drift: 2 }[sport.id] || 4;
    if (L > 4500) base = Math.max(2, Math.round(base * 0.6));
    if (L < 1300) base = Math.round(base * 1.5);
    return base;
  }
  RX.defaultLaps = lapsFor;

  RX.opponentsFor = function (sport, mode) {
    if (mode === 'pack') return 23;
    if (sport.id === 'kart' || mode === 'kartgp') return 13;
    if (sport.id === 'dirt') return 11;
    if (sport.id === 'rx') return 5;
    if (sport.id === 'nascar') return 15;
    return 11;
  };

  // Build the list of sessions for an event.
  // cfg: {sport, mode, track(def), car, laps, opponents, difficulty}
  RX.buildEvent = function (cfg) {
    var s = cfg.sport, m = cfg.mode, tdef = cfg.trackDef;
    var base = { sport: s, trackDef: tdef, laps: cfg.laps, opponents: cfg.opponents, kind: 'race', start: 'grid' };
    var sess = [];
    function S(o) { return Object.assign({}, base, o); }
    switch (m) {
      case 'quick': sess.push(S({ title: 'Race', gridPos: 'mid' })); break;
      case 'sprint': sess.push(S({ title: 'Sprint Race', gridPos: 'mid', laps: Math.max(2, Math.round(cfg.laps * 0.7)) })); break;
      case 'gp':
        sess.push(S({ title: 'Qualifying', kind: 'solo', laps: 1, flying: true, quali: true, opponents: 0 }));
        sess.push(S({ title: 'Grand Prix', gridPos: 'quali', wear: 1.6, fuel: 1, mandatoryPit: cfg.laps >= 3, damage: true }));
        break;
      case 'quali': sess.push(S({ title: 'Qualifying Shootout', kind: 'solo', laps: 3, flying: true, quali: true, opponents: 0 })); break;
      case 'timetrial': sess.push(S({ title: 'Time Trial', kind: 'solo', laps: 99, flying: true, ghost: true, opponents: 0, timeTrial: true })); break;
      case 'championship':
        var list = s.trackList.slice(0, 5);
        list.forEach(function (t, i) { sess.push(S({ title: 'Round ' + (i + 1) + ' — ' + t.name, trackDef: t, gridPos: i === 0 ? 'mid' : 'standings', championship: true })); });
        break;
      case 'elimination': sess.push(S({ title: 'Elimination', gridPos: 'back', elimination: true, laps: 99, opponents: Math.min(cfg.opponents, 7) })); break;
      case 'oval500': sess.push(S({ title: '500 Sprint', gridPos: 'mid', fuel: 2.2, wear: 1.2, mandatoryPit: true, draft: 1.2 })); break;
      case 'pack': sess.push(S({ title: 'Superspeedway Pack Race', gridPos: 'mid', opponents: 23, draft: 1.8 })); break;
      case 'endurance': sess.push(S({ title: 'Endurance 24', gridPos: 'mid', timeLimit: cfg.enduranceMinutes * 60 || 480, laps: 999, wear: 1.5, fuel: 1.6, damage: true, dayNight: true })); break;
      case 'multiclass': sess.push(S({ title: 'Multi-class Race', gridPos: 'mid', multiclass: true, opponents: 15 })); break;
      case 'reversegrid': sess.push(S({ title: 'Reverse-Grid Sprint', gridPos: 'back' })); break;
      case 'stage': sess.push(S({ title: 'Stage', kind: 'solo', laps: 1, rival: true, paceNotes: true, opponents: 0 })); break;
      case 'rallyevent':
        var idx = s.trackList.indexOf(tdef);
        for (var k = 0; k < 3; k++) { var td = s.trackList[(idx + k) % s.trackList.length]; if (td.style === 'rx') td = s.trackList[(idx + k + 1) % s.trackList.length]; sess.push(S({ title: 'SS' + (k + 1) + ' — ' + td.name, trackDef: td, kind: 'solo', laps: 1, rival: true, paceNotes: true, opponents: 0, cumulative: true })); }
        break;
      case 'superspecial': sess.push(S({ title: 'Super Special', laps: 2, opponents: 1, gridPos: 'front', headToHead: true })); break;
      case 'rxevent':
        sess.push(S({ title: 'Heat', laps: 3, opponents: 3, gridPos: 'mid', joker: true }));
        sess.push(S({ title: 'Final', laps: 5, opponents: 5, gridPos: 'heat', joker: true }));
        break;
      case 'drag': sess.push(S({ title: 'Drag Race', kind: 'drag', opponents: 1 })); break;
      case 'bracket': sess.push(S({ title: 'Bracket Race', kind: 'drag', opponents: 1, bracket: true })); break;
      case 'dragladder':
        ['Round of 8', 'Quarter-final', 'Semi-final', 'Final'].forEach(function (t, i) { sess.push(S({ title: t, kind: 'drag', opponents: 1, ladder: i })); });
        break;
      case 'mile': sess.push(S({ title: 'Standing Mile', kind: 'drag', opponents: 0, topSpeed: true })); break;
      case 'flyingmile': sess.push(S({ title: 'Flying Mile', kind: 'drag', opponents: 0, flyingMile: true })); break;
      case 'driftattack': sess.push(S({ title: 'Drift Score Attack', kind: 'solo', laps: 2, drift: true, opponents: 0 })); break;
      case 'tandem': sess.push(S({ title: 'Tandem Battle', kind: 'solo', laps: 2, drift: true, tandem: true, opponents: 1 })); break;
      case 'touge': sess.push(S({ title: 'Touge Run', kind: 'solo', laps: 1, drift: true, rival: true, opponents: 0 })); break;
      case 'eprix': sess.push(S({ title: 'E-Prix', gridPos: 'mid', energy: true, attack: true })); break;
      case 'kartgp':
        sess.push(S({ title: 'Pre-Final', gridPos: 'mid', opponents: 13 }));
        sess.push(S({ title: 'Final', gridPos: 'heat', opponents: 13, laps: Math.round(cfg.laps * 1.4) }));
        break;
      case 'raid': sess.push(S({ title: 'Rally-Raid Stage', kind: 'solo', laps: 1, rival: true, checkpoints: 6, opponents: 0 })); break;
      case 'baja': sess.push(S({ title: 'Baja Race', kind: 'race', laps: 1, staggered: true, opponents: 7, gridPos: 'back' })); break;
      case 'checkpoint': sess.push(S({ title: 'Checkpoint Rush', kind: 'solo', laps: 1, checkpoints: 8, timeAttack: true, opponents: 0 })); break;
      case 'grandepreuve': sess.push(S({ title: 'Grande Épreuve', gridPos: 'mid', laps: Math.round(cfg.laps * 1.5), wear: 2.2, damage: true })); break;
      case 'climb': sess.push(S({ title: 'Hill Climb', kind: 'solo', laps: 1, rival: true, opponents: 0 })); break;
      case 'climbevent':
        sess.push(S({ title: 'Run 1', kind: 'solo', laps: 1, rival: true, opponents: 0, bestOf: true }));
        sess.push(S({ title: 'Run 2', kind: 'solo', laps: 1, rival: true, opponents: 0, bestOf: true }));
        break;
      case 'heats':
        sess.push(S({ title: 'Heat Race', laps: Math.max(4, Math.round(cfg.laps * 0.5)), opponents: 7, gridPos: 'mid' }));
        sess.push(S({ title: 'A-Main', laps: cfg.laps, opponents: 11, gridPos: 'heat' }));
        break;
      default: sess.push(S({ title: 'Race', gridPos: 'mid' }));
    }
    // circuits only: point-to-point tracks can't host lapped races
    sess.forEach(function (x) {
      var st = x.trackDef.style;
      if ((st === 'stage' || st === 'hill' || st === 'drag') && x.kind === 'race') { x.laps = 1; }
      if (st === 'drag' && x.kind !== 'drag') x.kind = 'drag';
    });
    return { cfg: cfg, sessions: sess, index: 0, results: [], standings: {}, cumulative: {} };
  };

  // Choose opponent cars for a session
  RX.pickOpponents = function (sess, playerCar, n, rnd) {
    var pool = RX.sportById[playerCar.sport].carList.filter(function (c) { return c !== playerCar; });
    if (sess.multiclass) pool = pool.concat(RX.sportById.gt.carList.filter(function (c) { return Math.abs(c.year - playerCar.year) < 12; }));
    // prefer similar era
    pool.sort(function (a, b) { return Math.abs(a.year - playerCar.year) - Math.abs(b.year - playerCar.year) + (rnd() - 0.5) * 6; });
    var era = pool.filter(function (c) { return Math.abs(c.year - playerCar.year) <= (playerCar.sport === 'drag' || playerCar.sport === 'land' ? 60 : 12); });
    if (era.length < 4) era = pool.slice(0, Math.max(6, n));
    // drag: same class body if possible
    if (playerCar.sport === 'drag') { var same = pool.filter(function (c) { return c.body === playerCar.body; }); if (same.length) era = same; }
    var out = [];
    for (var i = 0; i < n; i++) out.push(era[i % era.length]);
    if (sess.multiclass) { out = out.map(function (c, i) { return i % 2 ? RX.sportById.gt.carList[Math.floor(rnd() * RX.sportById.gt.carList.length)] : c; }); }
    return out;
  };

  RX.DRIVER_NAMES = ['A. Moreau', 'K. Tanaka', 'L. Vettori', 'J. Kowalski', 'M. Okafor', 'S. Lindqvist', 'R. Alvarez', 'T. Brennan', 'D. Novak', 'P. Haddad', 'E. Fischer', 'H. Sato', 'C. Duval', 'B. Mendes',
    'N. Petrov', 'O. Achterberg', 'F. Rossi', 'G. Larsen', 'I. Murphy', 'V. Castillo', 'W. Chen', 'Y. Kim', 'Z. Abara', 'Q. Delacroix', 'U. Grant', 'X. Ibáñez'];

  // Pace-note grading for rally stages
  RX.paceNotes = function (track) {
    var P = track.pts, notes = [], i = 0, N = track.N;
    while (i < N - 5) {
      var c = P[i].curv;
      if (Math.abs(c) > 0.006) {
        var start = i, peak = 0, sgn = Math.sign(c);
        while (i < N - 1 && Math.abs(P[i].curv) > 0.004 && Math.sign(P[i].curv) === sgn) { peak = Math.max(peak, Math.abs(P[i].curv)); i++; }
        var len = (i - start) * track.ds;
        var r = 1 / peak, grade = r < 18 ? 'hairpin' : r < 30 ? '2' : r < 45 ? '3' : r < 70 ? '4' : r < 110 ? '5' : '6';
        var dir = sgn < 0 ? 'left' : 'right';
        var txt = grade === 'hairpin' ? 'hairpin ' + dir : dir + ' ' + grade;
        if (len > 60 && grade !== 'hairpin') txt += ' long';
        notes.push({ s: P[start].s, text: txt, grade: grade, dir: dir });
      }
      if (P[i].jump) { notes.push({ s: P[i].s - 10, text: 'over crest, jump', grade: 'jump' }); i += 20; }
      i++;
    }
    return notes;
  };
})();
