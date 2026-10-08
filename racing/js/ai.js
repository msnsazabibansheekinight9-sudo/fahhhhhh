// AI opponents (kinematic along the racing line with real performance limits) and an autopilot for the player car.
var RX = window.RX || (window.RX = {});

(function () {
  // Pure-pursuit autopilot that drives the full physics model (used for demo laps and testing).
  RX.autopilot = function (st, track, line, profile, opts) {
    opts = opts || {};
    var sp = st.spec, speed = Math.max(0, st.vx);
    // Stanley controller on the racing line with curvature feed-forward and yaw-rate damping
    var pre = Math.max(2, speed * 0.12);
    var ref = RX.trackAt(track, st.s + pre, 0);
    var lineLat = line[ref.idx] + (opts.latOffset || 0);
    var path = RX.trackAt(track, st.s + pre, lineLat);
    var pathH = Math.atan2(ref.tx, ref.tz);
    var psi = st.heading - pathH; psi = Math.atan2(Math.sin(psi), Math.cos(psi));
    var e = (st.x - path.x) * (ref.tz) + (st.z - path.z) * (-ref.tx); // + = car on the +lat side
    var wb = st.a + st.b;
    var kAhead = RX.trackAt(track, st.s + speed * 0.35, 0).curv;
    var rDes = speed * -kAhead;
    var beta = speed > 4 ? Math.atan2(st.vy, speed) : 0;
    var delta = Math.atan(wb * -kAhead) * 1.15 - (psi + beta) * 0.9 - Math.atan(2.2 * e / (speed + 4)) - (st.r - rDes) * 0.06;
    var red = 1 / (1 + Math.max(0, speed - 8) / 70);
    var steer = Math.max(-1, Math.min(1, delta / (sp.steerMax * red)));
    var vT = profile[RX.trackAt(track, st.s + Math.max(4, speed * 0.3), 0).idx] * (opts.pace || 1);
    var throttle = 0, brake = 0;
    if (speed < vT * 0.985) throttle = 1;
    else if (speed > vT * 1.02) brake = Math.min(1, (speed - vT) / 6);
    else throttle = 0.35;
    if (st.driftAngle > 0.18) throttle *= 0.5;
    if (Math.abs(e) > 2.5) { vT *= 0.92; if (speed > vT) { throttle = 0; brake = Math.max(brake, 0.4); } }
    if (st.gear === -1) { throttle = 0; brake = 0; }
    return { steer: steer, throttle: throttle, brake: brake, analog: true, assist: true };
  };

  RX.AICar = function (car, cus, track, opts) {
    this.car = car; this.cus = cus; this.track = track;
    this.skill = opts.skill || 0.95;
    this.spec = RX.carSpec(car, cus);
    // difficulty is a pace multiplier on the theoretical limit of this car on this track
    this.profile = RX.speedProfile(track, this.spec, 1.0, opts.env);
    this.line = opts.line;
    this.d = opts.startS || 0; // distance travelled (can be negative on the grid)
    this.lat = opts.lat || 0;
    this.latV = 0; this.v = 0; this.laneBias = (Math.random() - 0.5) * 1.2;
    this.lap = 0; this.finished = false; this.finishTime = 0;
    this.wheelSpin = 0; this.steer = 0; this.pitch = 0; this.roll = 0; this.accel = 0;
    this.launchDelay = opts.launchDelay || Math.random() * 0.25;
    this.overtake = 0; this.overtakeT = 0;
    this.mistakeT = 5 + Math.random() * 30;
    this.name = opts.name || 'AI';
    this.x = 0; this.z = 0; this.y = 0; this.heading = 0;
    this.jokerDone = false; this.pitDone = false; this.pitT = 0;
    this.chute = false;
  };

  RX.AICar.prototype.s = function () {
    var L = this.track.length;
    return this.track.closed ? ((this.d % L) + L) % L : this.d;
  };

  RX.AICar.prototype.update = function (dt, others, env) {
    if (this.finished && !this.track.closed) { this.v = Math.max(0, this.v - 12 * dt); }
    var tr = this.track, sp = this.spec;
    var s = this.s();
    var here = RX.trackAt(tr, s, 0);
    if (env.started === false || env.t < this.launchDelay) { this.place(here); return; }
    // target speed with look-ahead
    var ahead = RX.trackAt(tr, s + Math.max(3, this.v * 0.2), 0);
    var target = this.profile[ahead.idx] * this.skill;
    if (env.rubber) target *= env.rubber(this);
    if (this.pitT > 0) { this.pitT -= dt; target = 0; }
    if (env.pitLimit && this.inPit) target = Math.min(target, 22);
    // occasional small mistakes
    this.mistakeT -= dt;
    if (this.mistakeT < 0) { this.mistakeT = 10 + Math.random() * 40; this.mistake = 0.6 + Math.random() * 0.8; }
    if (this.mistake > 0) { this.mistake -= dt; target *= 0.9; }
    // traffic: look for cars ahead
    var gapAhead = 1e9, blocker = null, myLat = this.lat;
    for (var i = 0; i < others.length; i++) {
      var o = others[i]; if (o === this || o.out) continue;
      var ds = o.sNow - s; if (tr.closed) { if (ds < -tr.length / 2) ds += tr.length; if (ds > tr.length / 2) ds -= tr.length; }
      if (ds > 0 && ds < 18 && Math.abs(o.latNow - myLat) < 2.3) { if (ds < gapAhead) { gapAhead = ds; blocker = o; } }
    }
    var wantLat = this.line[here.idx] + this.laneBias;
    if (tr.style === 'oval') wantLat = this.laneBias * 3;
    if (blocker) {
      if (this.overtakeT <= 0) {
        // choose the side with more room
        var w = here.w;
        var leftRoom = w - blocker.latNow, rightRoom = blocker.latNow + w;
        this.overtake = leftRoom > rightRoom ? 1 : -1; this.overtakeT = 2.5;
      }
      if (gapAhead < 9) target = Math.min(target, blocker.vNow * (gapAhead < 5 ? 0.97 : 1.02));
    }
    if (this.overtakeT > 0) { this.overtakeT -= dt; wantLat = (blocker ? blocker.latNow : this.lat) + this.overtake * 2.8; }
    // drafting bonus
    if (env.draftFor) target *= 1 + env.draftFor(this) * 0.25;
    // longitudinal dynamics with power/grip limits
    var v = this.v, m = sp.mass;
    var mu = sp.mu * this.skill * 0.95;
    var accMax = Math.min(sp.P * 0.86 * this.skill / (Math.max(3, v) * m), mu * 9.81 * (sp.drive === 'AWD' ? 1 : 0.65) + sp.kd * v * v / m * mu * 0.5) - sp.cdrag * v * v / m;
    if (sp.car.sport === 'drag' || sp.car.sport === 'land') accMax = Math.min(sp.P * 0.86 * this.skill / (Math.max(3, v) * m), sp.mu * 9.81 * 0.9 + sp.kd * v * v / m) - sp.cdrag * v * v / m;
    var dec = Math.min(sp.brakeG * 12, mu * 9.81) * 0.9 + sp.kd * v * v / m * mu * 0.85;
    if (this.chute) { target = 0; dec += 30; }
    var dv = target - v;
    this.accel = dv > 0 ? Math.min(dv / dt, Math.max(0.2, accMax)) : Math.max(dv / dt, -dec);
    this.v = Math.max(0, v + this.accel * dt);
    this.d += this.v * dt;
    // lateral
    var maxLat = here.w - 1.0;
    wantLat = Math.max(-maxLat, Math.min(maxLat, wantLat));
    var latSpd = 2.5 + this.v * 0.04;
    this.latV += ((Math.max(-latSpd, Math.min(latSpd, (wantLat - this.lat) * 1.5))) - this.latV) * Math.min(1, dt * 4);
    this.lat += this.latV * dt;
    this.lat = Math.max(-here.w - 1, Math.min(here.w + 1, this.lat));
    // visuals
    var pos = RX.trackAt(tr, this.s(), this.lat);
    this.place(pos);
    var wb = this.wb || 2.7;
    this.steer = Math.atan(wb * -pos.curv) * 1.0 + this.latV * 0.02;
    this.pitch += ((-this.accel / 9.81) * 0.02 - this.pitch) * Math.min(1, dt * 5);
    this.roll += ((this.v * this.v * pos.curv / 9.81) * -0.025 - this.roll) * Math.min(1, dt * 5);
    var x = this.v / (sp.gearV[this.gear - 1 || 0] || sp.vtop);
    if (!this.gear) this.gear = 1;
    if (x > 0.96 && this.gear < sp.gears) this.gear++; else if (this.gear > 1 && this.v / sp.gearV[this.gear - 2] < 0.68) this.gear--;
    this.rpm01 = Math.min(1, this.v / sp.gearV[this.gear - 1]);
  };

  RX.AICar.prototype.place = function (pos) {
    this.x = pos.x; this.z = pos.z;
    this.y = RX.roadHeight(pos.p, this.lat);
    this.heading = Math.atan2(pos.tx, pos.tz) + Math.atan2(this.latV, Math.max(3, this.v));
    this.bank = pos.bank;
    this.idx = pos.idx;
  };
})();
