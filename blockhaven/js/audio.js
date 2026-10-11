// Procedural sound effects with WebAudio: noise bursts and simple tones, no audio files.
(function () {
  'use strict';
  function Audio() { this.ctx = null; this.vol = 0.5; this.last = {}; }
  Audio.prototype.init = function () {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; return; }
    const len = this.ctx.sampleRate * 1.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
  };
  Audio.prototype.setVolume = function (v) { this.vol = v; if (this.master) this.master.gain.value = v; };
  Audio.prototype.burst = function (dur, freq, q, gain, type, sweep) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  };
  Audio.prototype.tone = function (dur, f0, f1, gain, type) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  };
  const MAT = { stone: [1800, 2], wood: [600, 3], dirt: [400, 1], grass: [900, 0.7], sand: [2500, 0.6], snow: [3000, 0.5], glass: [4000, 4], cloth: [700, 0.5], metal: [3000, 8] };
  Audio.prototype.play = function (name, mat, vol) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.04) return;
    this.last[name] = now;
    const m = MAT[mat] || MAT.stone, v = vol === undefined ? 1 : vol;
    switch (name) {
      case 'dig': this.burst(0.08, m[0], m[1], 0.35 * v); break;
      case 'break': this.burst(0.22, m[0] * 0.8, m[1], 0.6 * v, 'bandpass', m[0] * 0.4); if (mat === 'glass') this.tone(0.2, 2400, 1800, 0.12, 'triangle'); break;
      case 'place': this.burst(0.12, m[0] * 0.9, m[1], 0.5 * v); break;
      case 'step': this.burst(0.06, m[0] * 0.8, m[1], 0.12 * v); break;
      case 'hurt': this.tone(0.18, 300, 160, 0.35, 'square'); this.burst(0.12, 800, 1, 0.2); break;
      case 'hurt_mob': this.tone(0.14, 420, 220, 0.2, 'sawtooth'); break;
      case 'pop': this.tone(0.07, 900 + Math.random() * 500, 1600, 0.12, 'sine'); break;
      case 'explode': this.burst(1.2, 400, 0.5, 1.0, 'lowpass', 60); this.tone(0.6, 80, 30, 0.6, 'sine'); break;
      case 'bow': this.burst(0.15, 1200, 2, 0.3, 'bandpass', 400); break;
      case 'hiss': this.burst(1.2, 5000, 1, 0.25, 'highpass'); break;
      case 'spark': this.tone(0.3, 1400, 300, 0.2, 'triangle'); break;
      case 'fire': this.burst(0.5, 600, 0.8, 0.4, 'lowpass', 150); break;
      case 'eat': this.burst(0.08, 1500, 1.5, 0.3); break;
      case 'craft': this.burst(0.1, 900, 2, 0.25); break;
      case 'level': [523, 659, 784].forEach((f, i) => setTimeout(() => this.ctx && this.tone(0.25, f, f, 0.15, 'triangle'), i * 90)); break;
      case 'splash': this.burst(0.5, 1200, 0.6, 0.5, 'lowpass', 300); break;
      case 'portal': this.tone(2.5, 120, 480, 0.25, 'sawtooth'); this.burst(2.5, 600, 2, 0.15); break;
      case 'teleport': this.tone(0.4, 900, 200, 0.25, 'square'); break;
      case 'break_tool': this.burst(0.3, 3000, 4, 0.4); this.tone(0.2, 1200, 600, 0.2, 'triangle'); break;
      case 'click': this.tone(0.04, 1200, 1200, 0.1, 'square'); break;
      case 'roar': this.tone(1.6, 90, 45, 0.5, 'sawtooth'); this.burst(1.6, 300, 0.7, 0.4, 'lowpass', 80); break;
      case 'crystal': this.tone(0.6, 1800, 600, 0.25, 'triangle'); this.burst(0.6, 3000, 3, 0.3); break;
      case 'bell': this.tone(1.5, 880, 870, 0.2, 'sine'); this.tone(1.5, 1760, 1750, 0.08, 'sine'); break;
      case 'cave': this.tone(3, 60 + Math.random() * 40, 40, 0.08, 'sine'); this.burst(3, 200, 0.5, 0.05, 'lowpass', 80); break;
    }
  };
  BH.Audio = Audio;
})();
