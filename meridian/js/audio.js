'use strict';
// Procedural Web Audio: weapons, explosions, engines, weather beds and UI sounds.
(function () {
  const A = SM.Audio = {
    ctx: null, master: null, sfx: null, amb: null, ui: null, vol: { master: 0.7, sfx: 0.8, amb: 0.6, ui: 0.6 },
    last: {}, beds: {},
  };
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const c = A.ctx;
    A.master = c.createGain(); A.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6;
    comp.connect(A.master);
    A.sfx = c.createGain(); A.sfx.connect(comp);
    A.amb = c.createGain(); A.amb.connect(comp);
    A.ui = c.createGain(); A.ui.connect(comp);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    // brown noise for rumbles / wind
    const bb = c.createBuffer(1, len, c.sampleRate), bd = bb.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    A.brown = bb;
    A.applyVolumes();
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    A.master.gain.value = A.vol.master; A.sfx.gain.value = A.vol.sfx; A.amb.gain.value = A.vol.amb; A.ui.gain.value = A.vol.ui;
  };
  function throttle(key, ms) { const n = performance.now(); if (A.last[key] && n - A.last[key] < ms) return false; A.last[key] = n; return true; }
  function noiseBurst(dest, dur, f0, f1, q, gain, type, brown) {
    const c = A.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = brown ? A.brown : A.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  function tone(dest, dur, f0, f1, gain, type) {
    const c = A.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  // vol: 0..1 distance attenuation computed by caller
  A.shot = function (wt, vol) {
    if (!A.ctx || vol < 0.03 || !throttle('s' + wt, wt === 'mg' || wt === 'auto' ? 45 : 70)) return;
    const d = A.sfx;
    switch (wt) {
      case 'mg': noiseBurst(d, 0.09, 4200, 600, 0.8, 0.35 * vol, 'bandpass'); break;
      case 'auto': noiseBurst(d, 0.16, 2400, 200, 0.9, 0.5 * vol); tone(d, 0.08, 180, 60, 0.3 * vol, 'square'); break;
      case 'cannon': noiseBurst(d, 0.7, 1600, 60, 0.7, 0.9 * vol, 'lowpass', true); tone(d, 0.35, 120, 35, 0.6 * vol, 'sine'); noiseBurst(d, 0.25, 5000, 800, 0.5, 0.25 * vol, 'highpass'); break;
      case 'arty': noiseBurst(d, 1.2, 900, 40, 0.6, 1.0 * vol, 'lowpass', true); tone(d, 0.6, 90, 25, 0.7 * vol); break;
      case 'rocket': case 'missile': noiseBurst(d, 0.9, 3000, 400, 0.6, 0.45 * vol, 'bandpass'); tone(d, 0.5, 300, 900, 0.08 * vol, 'sawtooth'); break;
      case 'rail': tone(d, 0.35, 2400, 200, 0.25 * vol, 'sawtooth'); noiseBurst(d, 0.3, 8000, 1500, 0.5, 0.35 * vol, 'highpass'); tone(d, 0.2, 90, 40, 0.4 * vol); break;
      case 'laser': tone(d, 0.22, 1800, 300, 0.18 * vol, 'square'); tone(d, 0.22, 1810, 310, 0.12 * vol, 'sawtooth'); break;
      case 'plasma': tone(d, 0.3, 700, 120, 0.25 * vol, 'sawtooth'); noiseBurst(d, 0.25, 1800, 300, 2, 0.25 * vol, 'bandpass'); break;
      case 'torpedo': noiseBurst(d, 0.8, 500, 100, 1, 0.3 * vol, 'lowpass', true); break;
      case 'bomb': tone(d, 1.2, 900, 300, 0.06 * vol, 'sine'); break;
    }
  };
  A.boom = function (size, vol) {
    if (!A.ctx || vol < 0.03 || !throttle('boom', 60)) return;
    const s = Math.min(3, size || 1);
    noiseBurst(A.sfx, 0.9 + s * 0.5, 1200, 30, 0.7, Math.min(1.2, 0.7 * vol * s), 'lowpass', true);
    tone(A.sfx, 0.5 + s * 0.3, 70, 22, 0.8 * vol * Math.min(1.5, s));
    noiseBurst(A.sfx, 0.3, 3000, 400, 0.6, 0.3 * vol, 'bandpass');
  };
  A.hit = function (vol) { if (!A.ctx || vol < 0.05 || !throttle('hit', 50)) return; tone(A.sfx, 0.12, 1400, 600, 0.12 * vol, 'triangle'); noiseBurst(A.sfx, 0.08, 6000, 2000, 1, 0.15 * vol, 'highpass'); };
  A.thunder = function (delay) {
    if (!A.ctx) return;
    setTimeout(() => { if (!A.ctx) return; noiseBurst(A.amb, 3.5, 400, 30, 0.5, 1.0, 'lowpass', true); tone(A.amb, 2, 60, 25, 0.4); }, (delay || 0.5) * 1000);
  };
  A.ui = A.ui || null;
  A.click = function () { if (!A.ctx) return; tone(A.ui, 0.06, 1200, 900, 0.12, 'triangle'); };
  A.deploy = function () { if (!A.ctx) return; tone(A.ui, 0.12, 500, 900, 0.15, 'square'); setTimeout(() => A.ctx && tone(A.ui, 0.15, 900, 1300, 0.12, 'square'), 90); };
  A.alert = function () { if (!A.ctx || !throttle('alert', 1500)) return; tone(A.ui, 0.18, 880, 880, 0.15, 'square'); setTimeout(() => A.ctx && tone(A.ui, 0.18, 660, 660, 0.15, 'square'), 200); };
  A.reward = function (tier) {
    if (!A.ctx) return;
    const notes = [523, 659, 784, 1046, 1318].slice(0, 3 + Math.min(2, tier || 0));
    notes.forEach((f, i) => setTimeout(() => A.ctx && tone(A.ui, 0.35, f, f, 0.16, 'triangle'), i * 110));
  };
  A.tick = function () { if (!A.ctx || !throttle('tick', 30)) return; tone(A.ui, 0.03, 2200, 1800, 0.05, 'square'); };
  A.ability = function () { if (!A.ctx) return; tone(A.ui, 0.25, 300, 1200, 0.12, 'sawtooth'); };

  // looping beds (wind, rain, battle rumble)
  A.bed = function (name, level) {
    if (!A.ctx) return;
    let b = A.beds[name];
    if (!b) {
      const c = A.ctx, src = c.createBufferSource(); src.buffer = name === 'rumble' || name === 'wind' ? A.brown : A.noise; src.loop = true;
      const f = c.createBiquadFilter();
      if (name === 'rain') { f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.4; }
      else if (name === 'rainLight') { f.type = 'highpass'; f.frequency.value = 3500; }
      else if (name === 'wind') { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8; }
      else { f.type = 'lowpass'; f.frequency.value = 160; }
      const g = c.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(A.amb); src.start();
      b = A.beds[name] = { src, g, f };
    }
    b.g.gain.setTargetAtTime(level, A.ctx.currentTime, 0.8);
    if (name === 'wind') b.f.frequency.setTargetAtTime(300 + 400 * level, A.ctx.currentTime, 1);
  };
  A.stopBeds = function () { for (const k in A.beds) A.beds[k].g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.3); };
})();
