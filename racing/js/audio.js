// Synthesised audio: engines by type, turbo, backfires, tyres, surface, wind, impacts, opponents, UI beeps, pace-note voice.
var RX = window.RX || (window.RX = {});

(function () {
  var CYL = { I3T: 3, I4: 4, I4T: 4, I4H: 4, I5: 5, I5T: 5, I6: 6, I6T: 6, I8: 8, V4: 4, V4H: 4, V6: 6, V6T: 6, V6H: 6, V8: 8, V8T: 8, V8H: 8, V10: 10, V12: 12, V16: 16, F4: 4, F4T: 4, F6: 6, F6T: 6, F12: 12, R: 6, '2T': 2, '4T': 1, D: 6, NITRO: 8, E: 0, T: 0 };

  RX.Audio = function () { this.ok = false; this.vol = 0.8; };

  RX.Audio.prototype.init = function () {
    if (this.ok) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.vol;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    // shared noise buffer
    var len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.ok = true;
  };
  RX.Audio.prototype.resume = function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
  RX.Audio.prototype.setVolume = function (v) { this.vol = v; if (this.master) this.master.gain.value = v; };

  RX.Audio.prototype.noise = function () {
    var s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start(0, Math.random() * 1.5); return s;
  };

  function curve(amount) {
    var n = 1024, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (1 + amount) * x / (1 + amount * Math.abs(x)); }
    return c;
  }

  // An engine voice: create per car (player + one shared opponent voice)
  RX.Audio.prototype.makeEngine = function (car, gainScale) {
    if (!this.ok) return null;
    var ctx = this.ctx, e = { car: car, type: car.engine, cyl: CYL[car.engine] || 8 };
    var out = ctx.createGain(); out.gain.value = 0; out.connect(this.master); e.out = out;
    var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1200; filt.Q.value = 1.2;
    var shaper = ctx.createWaveShaper(); shaper.curve = curve(e.type === 'NITRO' ? 30 : e.type === '2T' ? 12 : 6);
    shaper.connect(filt); filt.connect(out);
    e.filt = filt;
    e.oscs = [];
    var mk = function (type, mul, g) { var o = ctx.createOscillator(); o.type = type; var gg = ctx.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(shaper); o.start(); e.oscs.push({ o: o, mul: mul, g: gg, base: g }); };
    if (e.type === 'E') {
      mk('sine', 1, 0.25); mk('sine', 2.01, 0.12); mk('triangle', 3.0, 0.05);
      shaper.curve = curve(0.5); filt.type = 'bandpass'; filt.Q.value = 2;
    } else if (e.type === 'T') {
      mk('sine', 1, 0.15); mk('sawtooth', 0.5, 0.05);
      var tn = this.noise(), tb = ctx.createBiquadFilter(); tb.type = 'bandpass'; tb.frequency.value = 2400; tb.Q.value = 0.7;
      var tg = ctx.createGain(); tg.gain.value = 0.5; tn.connect(tb); tb.connect(tg); tg.connect(out); e.tnoise = tg;
    } else {
      mk('sawtooth', 1, 0.35); mk('square', 0.5, e.type === '2T' ? 0.05 : 0.18); mk('sawtooth', 2, 0.12); mk('triangle', 0.25, e.cyl >= 8 ? 0.25 : 0.1);
    }
    // intake / exhaust roar
    var n = this.noise(), nb = ctx.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 400; nb.Q.value = 0.8;
    var ng = ctx.createGain(); ng.gain.value = 0.0; n.connect(nb); nb.connect(ng); ng.connect(out); e.roar = ng; e.roarF = nb;
    // turbo whistle
    if (/T$|H$/.test(e.type) && e.type !== 'T' && e.type !== '2T' && e.type !== '4T') {
      var tw = ctx.createOscillator(); tw.type = 'sine'; var twg = ctx.createGain(); twg.gain.value = 0; tw.connect(twg); twg.connect(this.master); tw.start(); e.turbo = { o: tw, g: twg };
    }
    e.scale = gainScale == null ? 1 : gainScale;
    e.lastThr = 0;
    return e;
  };

  RX.Audio.prototype.updateEngine = function (e, rpm, rpm01, throttle, dist, dt) {
    if (!e) return;
    var ctx = this.ctx, t = ctx.currentTime;
    var f0;
    if (e.type === 'E') f0 = 120 + rpm01 * 2600;
    else if (e.type === 'T') f0 = 1200 + rpm01 * 3200;
    else if (e.type === '4T') f0 = rpm / 60 * 0.5;
    else f0 = rpm / 60 * e.cyl / 2;
    f0 = Math.max(18, Math.min(8000, f0));
    e.oscs.forEach(function (o) { o.o.frequency.setTargetAtTime(f0 * o.mul, t, 0.015); });
    var vol = (e.type === 'E' ? 0.12 + rpm01 * 0.25 : 0.25 + throttle * 0.55 + rpm01 * 0.2) * e.scale;
    if (dist != null) vol *= Math.max(0, 1 - dist / 220) / (1 + dist * 0.03);
    e.out.gain.setTargetAtTime(vol * 0.5, t, 0.03);
    var cutoff = e.type === 'E' ? f0 * 1.5 : 300 + throttle * 2600 + rpm01 * 2200;
    e.filt.frequency.setTargetAtTime(cutoff, t, 0.03);
    e.roar.gain.setTargetAtTime((e.type === 'E' ? 0.03 : 0.12 + throttle * 0.3) * (dist != null ? 0.5 : 1), t, 0.05);
    e.roarF.frequency.setTargetAtTime(200 + f0 * 1.2, t, 0.05);
    if (e.turbo) {
      e.turbo.o.frequency.setTargetAtTime(2500 + rpm01 * 5500, t, 0.05);
      e.turbo.g.gain.setTargetAtTime(dist == null ? throttle * rpm01 * 0.025 : 0, t, 0.1);
      if (dist == null && e.lastThr > 0.7 && throttle < 0.2 && rpm01 > 0.5) this.blowoff();
    }
    e.lastThr = throttle;
  };

  RX.Audio.prototype.stopEngine = function (e) {
    if (!e) return;
    try { e.out.gain.value = 0; e.oscs.forEach(function (o) { o.o.stop(); }); if (e.turbo) e.turbo.o.stop(); } catch (x) { }
    e.out.disconnect();
  };

  // tyres, surface crunch and wind
  RX.Audio.prototype.makeAmbient = function () {
    if (!this.ok) return null;
    var ctx = this.ctx, A = {};
    var mk = function (self, type, f, q) { var n = self.noise(), fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; var g = ctx.createGain(); g.gain.value = 0; n.connect(fl); fl.connect(g); g.connect(self.master); return { g: g, f: fl }; };
    A.squeal = mk(this, 'bandpass', 1100, 9);
    A.squeal2 = mk(this, 'bandpass', 1650, 12);
    A.gravel = mk(this, 'lowpass', 700, 0.7);
    A.wind = mk(this, 'lowpass', 500, 0.5);
    A.rain = mk(this, 'highpass', 3000, 0.5);
    A.crowd = mk(this, 'bandpass', 900, 0.4);
    return A;
  };
  RX.Audio.prototype.updateAmbient = function (A, o) {
    if (!A) return;
    var t = this.ctx.currentTime;
    var sq = Math.max(0, Math.min(1, o.slip)) * (o.loose ? 0.2 : 1) * Math.min(1, o.speed / 6);
    A.squeal.g.gain.setTargetAtTime(sq * 0.35, t, 0.04);
    A.squeal.f.frequency.setTargetAtTime(900 + o.speed * 6 + Math.random() * 60, t, 0.05);
    A.squeal2.g.gain.setTargetAtTime(sq * 0.15, t, 0.04);
    A.gravel.g.gain.setTargetAtTime(o.loose ? Math.min(0.5, o.speed / 50) : 0, t, 0.08);
    A.gravel.f.frequency.setTargetAtTime(300 + o.speed * 12, t, 0.08);
    A.wind.g.gain.setTargetAtTime(Math.min(0.5, o.speed * o.speed / 9000) * (o.cockpit ? 0.5 : 1), t, 0.1);
    A.wind.f.frequency.setTargetAtTime(300 + o.speed * 10, t, 0.1);
    A.rain.g.gain.setTargetAtTime(o.rain ? 0.12 : 0, t, 0.3);
    A.crowd.g.gain.setTargetAtTime(o.crowd || 0, t, 0.5);
  };

  RX.Audio.prototype.burst = function (dur, freq, gain, type) {
    if (!this.ok) return;
    var ctx = this.ctx, n = this.noise(), f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
    var g = ctx.createGain(); g.gain.value = gain; n.connect(f); f.connect(g); g.connect(this.master);
    g.gain.setTargetAtTime(0, ctx.currentTime + dur * 0.3, dur * 0.3);
    n.stop(ctx.currentTime + dur + 0.2);
  };
  RX.Audio.prototype.backfire = function () { this.burst(0.12, 600, 0.9); this.thump(70, 0.5, 0.1); };
  RX.Audio.prototype.blowoff = function () { this.burst(0.35, 2500, 0.25, 'highpass'); };
  RX.Audio.prototype.impact = function (strength) { this.burst(0.25, 500, Math.min(1.5, 0.3 + strength * 0.08)); this.thump(55, Math.min(1, 0.2 + strength * 0.05), 0.2); };
  RX.Audio.prototype.thump = function (f, g, d) {
    if (!this.ok) return;
    var ctx = this.ctx, o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.value = f; o.frequency.exponentialRampToValueAtTime(f * 0.5, ctx.currentTime + d);
    gg.gain.value = g; gg.gain.setTargetAtTime(0, ctx.currentTime, d * 0.4); o.connect(gg); gg.connect(this.master); o.start(); o.stop(ctx.currentTime + d + 0.3);
  };
  RX.Audio.prototype.beep = function (freq, dur, vol) {
    if (!this.ok) return;
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = freq; g.gain.value = vol || 0.15;
    o.connect(g); g.connect(this.master); o.start(); g.gain.setTargetAtTime(0, ctx.currentTime + dur, 0.02); o.stop(ctx.currentTime + dur + 0.1);
  };
  RX.Audio.prototype.shift = function () { this.thump(120, 0.15, 0.05); };

  // Co-driver pace notes using speech synthesis when available
  RX.Audio.prototype.say = function (text) {
    try {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(text); u.rate = 1.35; u.pitch = 0.9; u.volume = Math.min(1, this.vol + 0.2);
      window.speechSynthesis.speak(u);
    } catch (e) { }
  };
})();
