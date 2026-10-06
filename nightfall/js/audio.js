// Procedural sound: every gunshot, groan, door and score cue is synthesized live.
var NF = window.NF || (window.NF = {});
NF.audio = (function () {
  var A = { ready: false }, ctx, master, sfx, music, verb, noiseBuf, listenerPos = new THREE.Vector3();
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(comp);
    music = ctx.createGain(); music.gain.value = 0.55; music.connect(comp);
    verb = ctx.createConvolver(); var vg = ctx.createGain(); vg.gain.value = 0.45; verb.connect(vg); vg.connect(comp);
    var len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    A.ready = true; A.ctx = ctx;
    startAmbience();
  };
  function now() { return ctx.currentTime; }
  function out(pos, wet) { // returns a node to connect a source into
    var g = ctx.createGain();
    if (pos) {
      var p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.3; p.maxDistance = 60;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p); p.connect(sfx); var w = ctx.createGain(); w.gain.value = wet === undefined ? 0.5 : wet; p.connect(w); w.connect(verb);
    } else { g.connect(sfx); var w2 = ctx.createGain(); w2.gain.value = wet === undefined ? 0.35 : wet; g.connect(w2); w2.connect(verb); }
    return g;
  }
  function noise(dest, t, dur, type, f, q, vol, attack) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var fl = ctx.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = f || 1000; fl.Q.value = q || 0.7;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return fl;
  }
  function tone(dest, t, dur, type, f0, f1, vol, attack) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  A.setListener = function (cam) {
    if (!ctx) return;
    var L = ctx.listener, p = cam.position, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    listenerPos.copy(p);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  };
  A.gun = function (kind) {
    if (!ctx) return; var t = now(), d = out(null, 0.8);
    var big = kind === 'shotgun' ? 1.6 : kind === 'magnum' ? 2 : 1;
    noise(d, t, 0.09 * big + 0.05, 'lowpass', 5000, 0.5, 0.9);
    noise(d, t, 0.35 * big, 'lowpass', 900, 0.8, 0.7);
    tone(d, t, 0.18 * big, 'sine', 140 / big + 40, 38, 0.9);
    if (kind === 'magnum') noise(d, t, 0.8, 'bandpass', 300, 1, 0.4);
    noise(d, t + 0.25 * big, 0.3, 'bandpass', 2400, 3, 0.03); // case/tail
  };
  A.click = function () { if (!ctx) return; var t = now(), d = out(null, 0.2); noise(d, t, 0.04, 'highpass', 3000, 1, 0.4); tone(d, t, 0.03, 'square', 1800, 900, 0.08); };
  A.reload = function (kind) {
    if (!ctx) return; var t = now(), d = out(null, 0.2);
    if (kind === 'shotgun') { for (var i = 0; i < 3; i++) { noise(d, t + i * 0.28, 0.06, 'bandpass', 1800, 2, 0.4); tone(d, t + i * 0.28, 0.05, 'triangle', 700, 300, 0.15); } noise(d, t + 1.0, 0.12, 'bandpass', 900, 1.5, 0.6); noise(d, t + 1.18, 0.1, 'bandpass', 1300, 1.5, 0.6); }
    else { noise(d, t + 0.1, 0.05, 'bandpass', 2200, 2, 0.4); noise(d, t + 0.5, 0.06, 'bandpass', 1600, 2, 0.5); noise(d, t + 0.95, 0.08, 'bandpass', 2600, 3, 0.6); tone(d, t + 0.95, 0.04, 'square', 2000, 800, 0.08); }
  };
  A.knife = function () { if (!ctx) return; var t = now(), d = out(null, 0.2); var f = noise(d, t, 0.18, 'bandpass', 2500, 2, 0.35, 0.02); f.frequency.exponentialRampToValueAtTime(6000, t + 0.15); };
  A.step = function (pos, surface, vol) {
    if (!ctx) return; var t = now(), d = out(pos, 0.25); vol = vol || 0.3;
    if (surface === 'tile') { noise(d, t, 0.06, 'bandpass', 2600, 1.5, vol * 0.8); tone(d, t, 0.04, 'sine', 180, 90, vol * 0.4); }
    else if (surface === 'carpet') noise(d, t, 0.08, 'lowpass', 500, 0.5, vol * 0.6);
    else { noise(d, t, 0.09, 'bandpass', 700, 1.2, vol); tone(d, t, 0.06, 'sine', 120, 60, vol * 0.5); }
  };
  A.thud = function (pos, big) { if (!ctx) return; var t = now(), d = out(pos, 0.6); tone(d, t, 0.4 * (big || 1), 'sine', 70, 30, 0.9); noise(d, t, 0.3, 'lowpass', 300, 0.6, 0.6); };
  A.impact = function (pos, flesh) {
    if (!ctx) return; var t = now(), d = out(pos, 0.3);
    if (flesh) { noise(d, t, 0.12, 'lowpass', 900, 1, 0.6); tone(d, t, 0.08, 'sine', 160, 60, 0.3); }
    else { noise(d, t, 0.05, 'highpass', 2500, 1, 0.35); tone(d, t, 0.06, 'triangle', 2400 + Math.random() * 1200, 600, 0.08); }
  };
  A.groan = function (pos, pitch, len) {
    if (!ctx) return; var t = now(), d = out(pos, 0.55); pitch = pitch || 1; len = len || (1 + Math.random());
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    var base = (70 + Math.random() * 40) * pitch;
    o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.5), t + len);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 5 + Math.random() * 6; var lg = ctx.createGain(); lg.gain.value = base * 0.08; lfo.connect(lg); lg.connect(o.frequency);
    var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 + Math.random() * 300; f1.Q.value = 4;
    var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100 + Math.random() * 500; f2.Q.value = 6;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.25); g.gain.setValueAtTime(0.7, t + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(d);
    noise(d, t, len, 'bandpass', 900, 2, 0.12, 0.2);
    o.start(t); lfo.start(t); o.stop(t + len + 0.1); lfo.stop(t + len + 0.1);
  };
  A.bark = function (pos) {
    if (!ctx) return; var t = now(), d = out(pos, 0.5);
    for (var i = 0; i < 2; i++) { var tt = t + i * 0.22; tone(d, tt, 0.15, 'sawtooth', 380, 180, 0.4, 0.01); noise(d, tt, 0.14, 'bandpass', 1200, 2, 0.5, 0.01); }
  };
  A.growl = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.4); var o = tone(d, t, 1.2, 'sawtooth', 60, 50, 0.35, 0.1); noise(d, t, 1.2, 'bandpass', 400, 3, 0.3, 0.1); };
  A.screech = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.6); var f = noise(d, t, 0.9, 'bandpass', 2000, 8, 0.8, 0.02); f.frequency.exponentialRampToValueAtTime(5000, t + 0.4); f.frequency.exponentialRampToValueAtTime(1500, t + 0.9); tone(d, t, 0.8, 'sawtooth', 900, 1500, 0.15); };
  A.roar = function (pos) {
    if (!ctx) return; var t = now(), d = out(pos, 0.9);
    tone(d, t, 2.2, 'sawtooth', 55, 40, 0.6, 0.3); tone(d, t, 2.0, 'sawtooth', 83, 60, 0.4, 0.3);
    noise(d, t, 2.2, 'bandpass', 600, 1.5, 0.7, 0.3); noise(d, t, 2.0, 'lowpass', 200, 1, 0.8, 0.2);
  };
  A.door = function (pos, locked) {
    if (!ctx) return; var t = now(), d = out(pos, 0.6);
    if (locked) { for (var i = 0; i < 3; i++) { noise(d, t + i * 0.12, 0.08, 'bandpass', 1500, 3, 0.4); tone(d, t + i * 0.12, 0.06, 'square', 500, 300, 0.06); } return; }
    var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t);
    for (var k = 0; k < 10; k++) o.frequency.linearRampToValueAtTime(180 + Math.random() * 200, t + 0.1 + k * 0.08);
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 9;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(f); f.connect(g); g.connect(d); o.start(t); o.stop(t + 1.1);
    noise(d, t, 0.15, 'bandpass', 1200, 2, 0.3); A.thud(pos, 0.5);
  };
  A.pickup = function () { if (!ctx) return; var t = now(), d = out(null, 0.3); tone(d, t, 0.25, 'sine', 660, 0, 0.18); tone(d, t + 0.09, 0.4, 'sine', 990, 0, 0.14); };
  A.hurt = function () { if (!ctx) return; var t = now(), d = out(null, 0.2); tone(d, t, 0.25, 'sawtooth', 330, 200, 0.2); noise(d, t, 0.2, 'bandpass', 900, 2, 0.3); };
  A.glass = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.8); for (var i = 0; i < 14; i++) { var tt = t + Math.random() * 0.4; tone(d, tt, 0.2 + Math.random() * 0.3, 'sine', 2500 + Math.random() * 4000, 0, 0.08); } noise(d, t, 0.5, 'highpass', 3000, 1, 0.6); };
  A.heartbeat = function () { if (!ctx) return; var t = now(), d = out(null, 0); tone(d, t, 0.15, 'sine', 55, 40, 0.5); tone(d, t + 0.18, 0.15, 'sine', 50, 38, 0.35); };
  A.sting = function () { // dissonant jump-scare cue
    if (!ctx) return; var t = now(), d = music;
    [55, 58.3, 82.4, 116.5, 233, 246.9].forEach(function (f) { tone(d, t, 2.5, 'sawtooth', f, f * 0.97, 0.12, 0.01); });
    noise(d, t, 1.4, 'highpass', 4000, 1, 0.25, 0.01);
  };
  A.typewriter = function () { if (!ctx) return; var t = now(), d = out(null, 0.2); for (var i = 0; i < 12; i++) { noise(d, t + i * 0.09 + Math.random() * 0.03, 0.03, 'bandpass', 2500, 2, 0.5); } tone(d, t + 1.2, 0.3, 'sine', 2000, 0, 0.08); };
  A.boom = function (pos, r) {
    if (!ctx) return; var t = now(), d = out(pos, 0.9); var big = Math.min(2, (r || 5) / 4);
    noise(d, t, 1.6 * big, 'lowpass', 700, 0.7, 1.0, 0.005); tone(d, t, 0.9 * big, 'sine', 90, 25, 1.0); noise(d, t, 0.25, 'highpass', 2000, 1, 0.6); noise(d, t + 0.1, 2.5 * big, 'lowpass', 180, 1, 0.5, 0.2);
  };
  A.hiss = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.3); noise(d, t, 0.6, 'highpass', 3500, 0.8, 0.3, 0.05); };
  A.whisper = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.5); for (var i = 0; i < 4; i++) { var f = noise(d, t + i * 0.16, 0.14, 'bandpass', 1200 + Math.random() * 1800, 6, 0.18, 0.03); } tone(d, t, 0.6, 'sawtooth', 140 + Math.random() * 40, 110, 0.05, 0.05); };
  A.chainsaw = function (pos, cutting) { if (!ctx) return; var t = now(), d = out(pos, 0.3); var o = tone(d, t, 0.5, 'sawtooth', cutting ? 140 : 95, cutting ? 160 : 90, cutting ? 0.4 : 0.25, 0.01); var lfo = ctx.createOscillator(); lfo.frequency.value = 38; var lg = ctx.createGain(); lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.55); noise(d, t, 0.5, 'bandpass', cutting ? 2400 : 1200, 2, 0.2, 0.01); };
  A.splatter = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.5); noise(d, t, 0.6, 'lowpass', 600, 1, 0.9); tone(d, t, 0.3, 'sine', 80, 30, 0.6); };
  A.caw = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.5); for (var i = 0; i < 2; i++) { var tt = t + i * 0.25 + Math.random() * 0.1; tone(d, tt, 0.18, 'sawtooth', 700 + Math.random() * 200, 450, 0.12, 0.01); noise(d, tt, 0.16, 'bandpass', 1500, 4, 0.18, 0.01); } };
  A.rumble = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.4); noise(d, t, 1.4, 'lowpass', 120, 1, 0.8, 0.3); tone(d, t, 1.2, 'sine', 40, 32, 0.5, 0.3); };
  A.thunder = function () { if (!ctx) return; var t = now(), d = out(null, 1.0); noise(d, t, 4, 'lowpass', 300, 0.7, 0.9, 0.05); noise(d, t + 0.3, 3, 'lowpass', 120, 1, 0.8, 0.4); };
  A.engine = function (rpm, on) {
    if (!ctx) return;
    if (!A._eng) { var o = ctx.createOscillator(); o.type = 'sawtooth'; var o2 = ctx.createOscillator(); o2.type = 'square'; var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; var g = ctx.createGain(); g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(sfx); o.start(); o2.start(); A._eng = { o: o, o2: o2, g: g, f: f }; }
    var e = A._eng, t = now(); e.o.frequency.setTargetAtTime(30 + rpm * 70, t, 0.1); e.o2.frequency.setTargetAtTime(15 + rpm * 35, t, 0.1); e.f.frequency.setTargetAtTime(300 + rpm * 900, t, 0.1); e.g.gain.setTargetAtTime(on ? 0.13 : 0, t, 0.15);
  };
  A.rain = function (level) {
    if (!ctx) return;
    if (!A._rain) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900; var g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx); s.start(); A._rain = g; }
    A._rain.gain.setTargetAtTime(level * 0.09, now(), 0.5);
  };
  A.heli = function (pos, on) {
    if (!ctx) return; var t = now(), d = out(pos, 0.4);
    for (var i = 0; i < 6; i++) noise(d, t + i * 0.09, 0.07, 'lowpass', 250, 1, on ? 0.7 : 0.3);
  };
  A.cash = function () { if (!ctx) return; var t = now(), d = out(null, 0.2); tone(d, t, 0.12, 'square', 1800, 0, 0.06); tone(d, t + 0.07, 0.3, 'square', 2400, 0, 0.06); };
  A.flare = function (pos) { if (!ctx) return; var t = now(), d = out(pos, 0.6); noise(d, t, 0.3, 'bandpass', 900, 1, 0.8); noise(d, t, 2.5, 'highpass', 4000, 1, 0.15, 0.2); };
  // ------------------------------------------------------------- music beds
  var amb = null, beds = {}, current = null;
  function startAmbience() {
    var t = now(); amb = ctx.createGain(); amb.gain.value = 0.0001; amb.connect(music);
    amb.gain.exponentialRampToValueAtTime(0.5, t + 4);
    [41.2, 41.7, 61.7].forEach(function (f) { var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; var g = ctx.createGain(); g.gain.value = 0.18; o.connect(g); g.connect(amb); o.start(); });
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; var lg = ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    var g2 = ctx.createGain(); g2.gain.value = 0.12; s.connect(f); f.connect(g2); g2.connect(amb); s.start();
    setInterval(function () { // distant creaks and knocks
      if (!A.ready || Math.random() < 0.5) return;
      var p = listenerPos.clone().add(new THREE.Vector3((Math.random() - .5) * 30, 2, (Math.random() - .5) * 30));
      if (Math.random() < 0.5) A.door(p, false); else A.thud(p, 0.3);
    }, 9000);
  }
  // simple sequenced pads/ostinatos
  function bed(name) {
    if (beds[name]) return beds[name];
    var g = ctx.createGain(); g.gain.value = 0.0001; g.connect(music);
    var b = { g: g, name: name, step: 0 };
    if (name === 'safe') {
      var notes = [261.6, 311.1, 392, 466.2, 392, 311.1, 233.1, 311.1];
      b.tick = function (t) { tone(g, t, 1.6, 'triangle', notes[b.step % 8] * 0.5, 0, 0.22, 0.05); if (b.step % 4 === 0) tone(g, t, 3.2, 'sine', notes[(b.step / 4 | 0) % 2 ? 0 : 6] * 0.25, 0, 0.25, 0.4); b.step++; };
      b.interval = 0.62;
    } else if (name === 'chase') {
      b.tick = function (t) { var f = [55, 55, 58.3, 55, 55, 51.9, 55, 61.7][b.step % 8]; tone(g, t, 0.22, 'sawtooth', f, f * 0.98, 0.35, 0.005); if (b.step % 2 === 0) noise(g, t, 0.08, 'highpass', 6000, 1, 0.1); if (b.step % 8 === 0) tone(g, t, 0.5, 'sine', 45, 30, 0.6); b.step++; };
      b.interval = 0.2;
    } else if (name === 'boss') {
      b.tick = function (t) { var f = [41.2, 41.2, 49, 41.2, 43.7, 41.2, 55, 51.9][b.step % 8]; tone(g, t, 0.18, 'sawtooth', f * 2, f * 1.9, 0.3, 0.004); tone(g, t, 0.18, 'square', f, f, 0.12, 0.004); if (b.step % 4 === 0) { tone(g, t, 0.4, 'sine', 60, 25, 0.8); noise(g, t, 0.2, 'lowpass', 400, 1, 0.4); } if (b.step % 4 === 2) noise(g, t, 0.15, 'bandpass', 1800, 1, 0.3); if (b.step % 16 === 0) [220, 233.1, 329.6].forEach(function (x) { tone(g, t, 2.6, 'sawtooth', x, x * 0.99, 0.05, 0.3); }); b.step++; };
      b.interval = 0.17;
    } else if (name === 'tension') {
      b.tick = function (t) { if (b.step % 6 === 0) [110, 116.5].forEach(function (x) { tone(g, t, 3.5, 'sawtooth', x, x * 1.01, 0.05, 1.2); }); if (b.step % 3 === 1) tone(g, t, 0.4, 'sine', 1760 + Math.random() * 300, 0, 0.03, 0.02); b.step++; };
      b.interval = 0.6;
    } else if (name === 'ending') {
      var ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]];
      b.tick = function (t) { if (b.step % 4 === 0) ch[(b.step / 4 | 0) % 4].forEach(function (x) { tone(g, t, 3.4, 'triangle', x, 0, 0.1, 0.6); }); tone(g, t, 0.9, 'sine', ch[(b.step / 4 | 0) % 4][b.step % 3] * 2, 0, 0.07, 0.02); b.step++; };
      b.interval = 0.85;
    }
    b.next = 0; beds[name] = b; return b;
  }
  A.music = function (name) {
    if (!ctx || current === name) return;
    var t = now();
    for (var k in beds) { beds[k].g.gain.cancelScheduledValues(t); beds[k].g.gain.setValueAtTime(Math.max(0.0001, beds[k].g.gain.value), t); beds[k].g.gain.exponentialRampToValueAtTime(0.0001, t + 2); }
    current = name;
    if (name) { var b = bed(name); b.g.gain.cancelScheduledValues(t); b.g.gain.setValueAtTime(Math.max(0.0001, b.g.gain.value), t); b.g.gain.exponentialRampToValueAtTime(1, t + 1.5); }
  };
  A.update = function () {
    if (!ctx) return; var t = now();
    for (var k in beds) { var b = beds[k]; if (b.g.gain.value < 0.001 && k !== current) continue; if (b.next < t) b.next = t + 0.05; while (b.next < t + 0.25) { b.tick(b.next); b.next += b.interval; } }
  };
  A.setVolume = function (v) { if (master) master.gain.value = v; };
  return A;
})();
