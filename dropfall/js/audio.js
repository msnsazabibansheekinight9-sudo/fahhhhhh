// Dropfall — synthesized sound. No audio files; everything is generated with WebAudio.
'use strict';
(function () {
  const A = DF.Audio = { vol: 0.6, ctx: null, master: null, noiseBuf: null, last: {} };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = A.ctx.createGain(); A.master.gain.value = A.vol; A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate; A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.ctx = null; }
  };
  A.setVol = v => { A.vol = v; if (A.master) A.master.gain.value = v; };

  // throttle the same sound so a 900 rpm gun does not stack 900 voices
  function gate(key, gap) { const t = performance.now(); if (A.last[key] && t - A.last[key] < gap) return false; A.last[key] = t; return true; }

  function noise(dur, freq, q, gain, type, attack, distGain) {
    const c = A.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = A.noiseBuf; src.playbackRate.value = 0.6 + Math.random() * 0.8;
    const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.25), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * (distGain || 1), t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(A.master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function tone(freq, dur, type, gain, slide, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
  }

  // dist: distance from listener in world px, scales volume
  A.play = function (name, dist) {
    if (!A.ctx || A.vol <= 0) return;
    const dg = dist == null ? 1 : Math.max(0.05, 1 - dist / 1400);
    try {
      switch (name) {
        case 'shot': if (gate('shot', 45)) noise(0.12, 2600, 0.8, 0.35, 'lowpass', 0.002, dg); break;
        case 'shotHeavy': if (gate('shotH', 60)) { noise(0.25, 1400, 0.7, 0.55, 'lowpass', 0.002, dg); tone(90, 0.18, 'sine', 0.3 * dg, 40); } break;
        case 'shotgun': noise(0.3, 1800, 0.6, 0.6, 'lowpass', 0.002, dg); break;
        case 'pistol': if (gate('pis', 50)) noise(0.1, 3200, 0.8, 0.3, 'lowpass', 0.002, dg); break;
        case 'enemyShot': if (gate('eshot', 70)) noise(0.09, 3800, 1.2, 0.18, 'bandpass', 0.002, dg); break;
        case 'laser': if (gate('las', 90)) tone(1400 + Math.random() * 200, 0.08, 'sawtooth', 0.05 * dg, 900); break;
        case 'plasma': tone(600, 0.2, 'sawtooth', 0.15 * dg, 120); break;
        case 'arc': noise(0.2, 6000, 4, 0.3, 'highpass', 0.002, dg); tone(180, 0.15, 'square', 0.08 * dg, 60); break;
        case 'flame': if (gate('flm', 120)) noise(0.2, 900, 0.5, 0.18, 'lowpass', 0.03, dg); break;
        case 'rocket': noise(0.5, 900, 0.6, 0.4, 'lowpass', 0.02, dg); tone(220, 0.4, 'sawtooth', 0.06 * dg, 80); break;
        case 'boom': if (gate('boom', 40)) { noise(0.9, 700, 0.7, 0.9, 'lowpass', 0.004, dg); tone(60, 0.6, 'sine', 0.5 * dg, 25); } break;
        case 'bigboom': noise(1.8, 500, 0.7, 1.0, 'lowpass', 0.004, dg); tone(45, 1.4, 'sine', 0.7 * dg, 18); break;
        case 'ricochet': if (gate('ric', 60)) tone(2400 + Math.random() * 1500, 0.09, 'triangle', 0.06 * dg, 1200); break;
        case 'hit': if (gate('hit', 35)) noise(0.06, 1200, 1, 0.15, 'bandpass', 0.002, dg); break;
        case 'hurt': if (gate('hurt', 120)) { noise(0.15, 500, 1, 0.4, 'lowpass'); tone(160, 0.12, 'square', 0.08, 90); } break;
        case 'reload': tone(900, 0.05, 'square', 0.06); tone(600, 0.06, 'square', 0.06, null, 0.12); break;
        case 'empty': tone(1800, 0.03, 'square', 0.05); break;
        case 'key': tone(880, 0.05, 'square', 0.06); break;
        case 'keyBad': tone(180, 0.15, 'square', 0.08); break;
        case 'callReady': tone(660, 0.07, 'square', 0.07); tone(990, 0.1, 'square', 0.07, null, 0.08); break;
        case 'beacon': tone(1200, 0.06, 'sine', 0.1); tone(1200, 0.06, 'sine', 0.1, null, 0.25); break;
        case 'pod': noise(1.0, 2500, 0.5, 0.4, 'highpass', 0.6, dg); break;
        case 'jet': noise(1.2, 1600, 0.4, 0.45, 'bandpass', 0.15, dg); break;
        case 'screech': if (gate('scr', 250)) tone(700 + Math.random() * 300, 0.25, 'sawtooth', 0.06 * dg, 1500); break;
        case 'servo': if (gate('serv', 300)) tone(140, 0.2, 'sawtooth', 0.05 * dg, 220); break;
        case 'warp': tone(200, 0.6, 'sine', 0.15 * dg, 900); tone(300, 0.6, 'triangle', 0.08 * dg, 1200); break;
        case 'shieldHit': if (gate('sh', 60)) tone(500 + Math.random() * 300, 0.07, 'sine', 0.08 * dg, 1200); break;
        case 'pickup': tone(1046, 0.06, 'triangle', 0.1); tone(1568, 0.09, 'triangle', 0.1, null, 0.06); break;
        case 'stim': noise(0.3, 3000, 1, 0.2, 'highpass'); tone(500, 0.2, 'sine', 0.08, 900); break;
        case 'ui': tone(700, 0.04, 'square', 0.05); break;
        case 'buy': tone(523, 0.08, 'triangle', 0.1); tone(784, 0.08, 'triangle', 0.1, null, 0.08); tone(1046, 0.14, 'triangle', 0.1, null, 0.16); break;
        case 'alarm': tone(440, 0.25, 'square', 0.08); tone(330, 0.25, 'square', 0.08, null, 0.28); break;
        case 'objective': tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12, null, 0.13); tone(784, 0.2, 'triangle', 0.12, null, 0.26); break;
        case 'fail': tone(392, 0.3, 'sawtooth', 0.1); tone(311, 0.5, 'sawtooth', 0.1, null, 0.3); break;
        case 'engine': if (gate('eng', 180)) tone(70 + Math.random() * 20, 0.2, 'sawtooth', 0.04, 60); break;
      }
    } catch (e) { /* audio is optional */ }
  };
})();
