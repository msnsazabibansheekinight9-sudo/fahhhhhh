// Synthesised audio: blaster bolts, blade hum and swings, explosions, engines, UI blips. No sample files.
var SF = window.SF || (window.SF = {});

(function () {
  var A = SF.Audio = { ctx: null, master: null, vol: 0.7, listener: null, last: {} };

  A.init = function () {
    if (A.ctx) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = A.vol;
      var comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6;
      A.master.connect(comp); comp.connect(A.ctx.destination);
      var len = A.ctx.sampleRate * 1.5;
      A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      var d = A.noise.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.ctx = null; }
  };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setVolume = function (v) { A.vol = v; if (A.master) A.master.gain.value = v; };

  // distance attenuation from the listener position
  function att(pos) {
    if (!pos || !A.listener) return 1;
    var dx = pos.x - A.listener.x, dy = pos.y - A.listener.y, dz = pos.z - A.listener.z;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return Math.max(0, 1 / (1 + d * 0.035) - 0.02);
  }
  function throttle(key, ms) {
    var now = performance.now();
    if (A.last[key] && now - A.last[key] < ms) return false;
    A.last[key] = now; return true;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  // kind: carbine rifle repeater sniper pistol hpistol shotgun launcher flamer ion laser cannon
  A.shot = function (kind, pos, pitch) {
    if (!A.ctx) return;
    var v = att(pos); if (v < 0.03) return;
    if (!throttle('shot' + (pos ? Math.round(pos.x / 6) + ',' + Math.round(pos.z / 6) : 'p'), 28)) return;
    var t = A.ctx.currentTime, p = pitch || 1;
    var base = { carbine: 1500, rifle: 1250, repeater: 1700, sniper: 900, pistol: 1800, hpistol: 1100, shotgun: 700, launcher: 300, ion: 600, laser: 1400, cannon: 260, flamer: 0 }[kind] || 1400;
    if (kind === 'flamer') { A.noiseBurst(pos, 0.12, 1800, 0.25 * v); return; }
    var o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = kind === 'sniper' || kind === 'cannon' ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(base * p, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.18 * p, t + (kind === 'sniper' ? 0.35 : 0.16));
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 4200;
    env(g, t, 0.004, (kind === 'repeater' ? 0.16 : 0.22) * v, kind === 'sniper' ? 0.38 : 0.17);
    o.connect(f); f.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.45);
    if (kind === 'shotgun' || kind === 'launcher' || kind === 'cannon' || kind === 'sniper' || kind === 'hpistol') A.noiseBurst(pos, 0.16, 900, 0.3 * v);
  };

  A.noiseBurst = function (pos, dur, freq, vol) {
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    var s = A.ctx.createBufferSource(); s.buffer = A.noise;
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    var g = A.ctx.createGain(); env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  };

  A.explosion = function (pos, big) {
    if (!A.ctx) return;
    var v = att(pos) * (big ? 1.4 : 1); if (v < 0.03) return;
    if (!throttle('boom', 40)) return;
    var t = A.ctx.currentTime;
    var s = A.ctx.createBufferSource(); s.buffer = A.noise;
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.0);
    var g = A.ctx.createGain(); env(g, t, 0.01, 0.9 * v, big ? 1.6 : 1.0);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random() * 0.3); s.stop(t + 1.8);
    var o = A.ctx.createOscillator(), g2 = A.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    env(g2, t, 0.01, 0.7 * v, 0.7); o.connect(g2); g2.connect(A.master); o.start(t); o.stop(t + 0.9);
  };

  A.swing = function (pos, pitch) {
    if (!A.ctx) return;
    var v = att(pos); if (v < 0.04) return;
    var t = A.ctx.currentTime, p = pitch || 1;
    var o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110 * p, t); o.frequency.linearRampToValueAtTime(190 * p, t + 0.12); o.frequency.linearRampToValueAtTime(90 * p, t + 0.3);
    var f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 1.4;
    env(g, t, 0.03, 0.35 * v, 0.3);
    o.connect(f); f.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.4);
  };
  A.clash = function (pos) {
    if (!A.ctx) return;
    var v = att(pos); if (v < 0.04) return;
    if (!throttle('clash', 60)) return;
    var t = A.ctx.currentTime;
    [1, 1.51, 2.3].forEach(function (m) {
      var o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = 'square'; o.frequency.value = 520 * m + Math.random() * 30;
      env(g, t, 0.002, 0.12 * v, 0.25); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.3);
    });
    A.noiseBurst(pos, 0.08, 5000, 0.25 * v);
  };
  A.deflect = function (pos) {
    if (!A.ctx) return;
    var v = att(pos); if (v < 0.04 || !throttle('defl', 50)) return;
    var t = A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.1);
    env(g, t, 0.002, 0.12 * v, 0.12); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.2);
  };

  // looping hum for an ignited blade; returns handle with set(vol) & stop()
  A.hum = function () {
    if (!A.ctx) return { set: function () { }, stop: function () { } };
    var t = A.ctx.currentTime;
    var o1 = A.ctx.createOscillator(), o2 = A.ctx.createOscillator(), g = A.ctx.createGain();
    o1.type = 'sawtooth'; o1.frequency.value = 92; o2.type = 'sawtooth'; o2.frequency.value = 94.5;
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.master); o1.start(t); o2.start(t);
    return {
      set: function (v, pitch) { g.gain.setTargetAtTime(v * 0.08, A.ctx.currentTime, 0.05); if (pitch) { o1.frequency.setTargetAtTime(92 * pitch, A.ctx.currentTime, 0.05); o2.frequency.setTargetAtTime(94.5 * pitch, A.ctx.currentTime, 0.05); } },
      stop: function () { try { g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); o1.stop(A.ctx.currentTime + 0.3); o2.stop(A.ctx.currentTime + 0.3); } catch (e) { } }
    };
  };

  // looping engine for vehicles
  A.engine = function (type) {
    if (!A.ctx) return { set: function () { }, stop: function () { } };
    var t = A.ctx.currentTime;
    var o = A.ctx.createOscillator(), o2 = A.ctx.createOscillator(), g = A.ctx.createGain();
    var nz = A.ctx.createBufferSource(); nz.buffer = A.noise; nz.loop = true;
    var nf = A.ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = type === 'fighter' ? 1400 : 500; nf.Q.value = 0.8;
    var ng = A.ctx.createGain(); ng.gain.value = 0.25;
    o.type = type === 'walker' ? 'triangle' : 'sawtooth'; o2.type = 'square';
    var base = type === 'fighter' ? 140 : type === 'walker' ? 45 : 70;
    o.frequency.value = base; o2.frequency.value = base * 0.5;
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    var og = A.ctx.createGain(); og.gain.value = 0.5;
    o.connect(og); o2.connect(og); og.connect(f); f.connect(g); nz.connect(nf); nf.connect(ng); ng.connect(g);
    g.gain.value = 0; g.connect(A.master); o.start(t); o2.start(t); nz.start(t);
    return {
      set: function (thr, vol) {
        var ct = A.ctx.currentTime;
        o.frequency.setTargetAtTime(base * (0.8 + thr * 1.2), ct, 0.1); o2.frequency.setTargetAtTime(base * 0.5 * (0.8 + thr * 1.2), ct, 0.1);
        g.gain.setTargetAtTime((vol == null ? 0.12 : vol) * (0.5 + thr * 0.6), ct, 0.1);
      },
      stop: function () { try { g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); o.stop(A.ctx.currentTime + 0.3); o2.stop(A.ctx.currentTime + 0.3); nz.stop(A.ctx.currentTime + 0.3); } catch (e) { } }
    };
  };

  A.blip = function (f, dur, vol, type) {
    if (!A.ctx) return;
    var t = A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    env(g, t, 0.005, vol || 0.1, dur || 0.1); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + (dur || 0.1) + 0.05);
  };
  A.ui = function () { A.blip(880, 0.06, 0.06, 'triangle'); };
  A.hit = function () { if (throttle('hit', 40)) A.blip(1600, 0.05, 0.08, 'square'); };
  A.kill = function () { A.blip(660, 0.08, 0.1, 'triangle'); setTimeout(function () { A.blip(990, 0.12, 0.1, 'triangle'); }, 70); };
  A.capture = function () { [523, 659, 784].forEach(function (f, i) { setTimeout(function () { A.blip(f, 0.15, 0.09, 'triangle'); }, i * 110); }); };
  A.overheat = function () { A.noiseBurst(null, 0.5, 3000, 0.12); };
  A.lightning = function (pos) { if (throttle('zap', 70)) A.noiseBurst(pos, 0.12, 6000, 0.18 * att(pos)); };
  A.jet = function (pos) { if (throttle('jet', 90)) A.noiseBurst(pos, 0.25, 700, 0.25 * att(pos)); };
  A.push = function (pos) {
    if (!A.ctx) return;
    var t = A.ctx.currentTime, o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.5);
    env(g, t, 0.01, 0.5 * att(pos), 0.5); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.6);
    A.noiseBurst(pos, 0.4, 500, 0.3 * att(pos));
  };
  A.music = null;
  // Ambient pad that changes chord with the menu/battle state.
  A.startMusic = function (mood) {
    if (!A.ctx) return;
    A.stopMusic();
    var chords = mood === 'battle' ? [[110, 130.8, 164.8], [98, 123.5, 146.8], [87.3, 110, 130.8], [98, 116.5, 146.8]] : [[130.8, 164.8, 196], [110, 130.8, 164.8], [116.5, 146.8, 174.6], [98, 123.5, 146.8]];
    var g = A.ctx.createGain(); g.gain.value = 0; g.connect(A.master);
    g.gain.setTargetAtTime(mood === 'battle' ? 0.025 : 0.04, A.ctx.currentTime, 1.5);
    var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(g);
    var oscs = [];
    for (var i = 0; i < 3; i++) { var o = A.ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth'; o.connect(f); o.start(); oscs.push(o); }
    var idx = 0;
    function step() { var c = chords[idx++ % chords.length]; oscs.forEach(function (o, i) { o.frequency.setTargetAtTime(c[i] * (i === 0 ? 0.5 : 1), A.ctx.currentTime, 0.6); }); }
    step();
    var timer = setInterval(step, 4200);
    A.music = { stop: function () { clearInterval(timer); g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.4); oscs.forEach(function (o) { o.stop(A.ctx.currentTime + 1.5); }); } };
  };
  A.stopMusic = function () { if (A.music) { A.music.stop(); A.music = null; } };
})();
