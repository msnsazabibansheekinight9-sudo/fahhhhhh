'use strict';
/* Crumble — synthesised sound: impacts by material, guns, explosions, loops for fire, tools and engine. */

const SFX = {
  ctx: null, vol: 0.7, listener: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.loops = {};
    for (const [name, f, q, type] of [['fire', 900, 0.6, 'bandpass'], ['torch', 2400, 1.2, 'bandpass'], ['spray', 5200, 0.8, 'highpass'], ['ext', 1600, 0.5, 'lowpass']]) {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start();
      this.loops[name] = g;
    }
    const eng = c.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 40;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 300;
    const eg = c.createGain(); eg.gain.value = 0; eng.connect(ef); ef.connect(eg); eg.connect(this.master); eng.start();
    this.engine = { osc: eng, g: eg };
    this.alarm = { on: false, t: 0 };
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  att(pos) {
    if (!pos || !this.listener) return 1;
    const d = pos.distanceTo(this.listener);
    return 1 / (1 + d / 50);
  },
  burst(dur, freq, q, gain, type, pos, pitchDrop) {
    const c = this.ctx; if (!c) return;
    const a = this.att(pos) * gain; if (a < 0.01) return;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    if (pitchDrop) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * pitchDrop), c.currentTime + dur);
    const g = c.createGain(); g.gain.setValueAtTime(a, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(c.currentTime, Math.random()); s.stop(c.currentTime + dur + 0.05);
  },
  tone(freq, dur, gain, type, slide, pos) {
    const c = this.ctx; if (!c) return;
    const a = this.att(pos) * gain; if (a < 0.01) return;
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, c.currentTime + dur);
    const g = c.createGain(); g.gain.setValueAtTime(a, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + dur + 0.05);
  },
  breakMat(m, n, pos) {
    const snd = MATS[m] ? MATS[m].snd : 'stone', k = Math.min(1, 0.25 + n / 60);
    if (snd === 'glass') { this.burst(0.35, 4200, 2, 0.5 * k, 'highpass', pos); for (let i = 0; i < 4; i++) this.tone(2500 + Math.random() * 3000, 0.15 + Math.random() * 0.2, 0.06, 'sine', 1, pos); }
    else if (snd === 'wood') { this.burst(0.25, 700, 1.5, 0.7 * k, 'bandpass', pos); this.tone(160, 0.12, 0.2 * k, 'triangle', 0.6, pos); }
    else if (snd === 'metal') { this.burst(0.2, 2600, 4, 0.4 * k, 'bandpass', pos); this.tone(420 + Math.random() * 300, 0.5, 0.12, 'square', 0.98, pos); }
    else if (snd === 'leaf') this.burst(0.3, 3000, 0.5, 0.35 * k, 'highpass', pos);
    else if (snd === 'dirt') this.burst(0.3, 300, 0.8, 0.6 * k, 'lowpass', pos);
    else { this.burst(0.4, 420, 1, 0.8 * k, 'lowpass', pos); this.burst(0.15, 1500, 1, 0.3 * k, 'bandpass', pos); }
  },
  hammer(pos) { this.tone(90, 0.15, 0.5, 'sine', 0.5, pos); this.burst(0.08, 900, 1, 0.3, 'bandpass', pos); },
  whoosh() { this.burst(0.25, 1200, 0.7, 0.18, 'bandpass', null, 0.4); },
  shot() { this.burst(0.35, 1800, 0.6, 1, 'lowpass', null, 0.15); this.tone(70, 0.25, 0.6, 'sine', 0.4); },
  boom(pos, big) {
    const a = big ? 1.4 : 1;
    this.burst(2.2 * a, 220, 0.7, 1.6 * a, 'lowpass', pos, 0.2); this.tone(48, 1.4, 1.1 * a, 'sine', 0.45, pos);
    this.burst(0.5, 2200, 0.5, 0.6, 'bandpass', pos, 0.3);
    setTimeout(() => this.burst(1.6, 400, 0.6, 0.45 * a, 'lowpass', pos, 0.3), 160);
  },
  rumble(pos, mass) { this.burst(Math.min(2.5, 0.6 + mass / 3000), 160, 0.7, Math.min(1.4, 0.3 + mass / 2500), 'lowpass', pos, 0.5); },
  thump(pos, k) { this.burst(0.3, 260, 0.8, Math.min(1, k), 'lowpass', pos); },
  rocket() { this.burst(0.8, 900, 0.6, 0.6, 'bandpass', null, 0.3); },
  click() { this.tone(1200, 0.04, 0.15, 'square'); },
  empty() { this.tone(300, 0.06, 0.15, 'square'); },
  pickup() { this.tone(660, 0.1, 0.25, 'triangle'); setTimeout(() => this.tone(990, 0.18, 0.25, 'triangle'), 90); },
  plank() { this.burst(0.18, 600, 2, 0.5, 'bandpass'); this.tone(220, 0.1, 0.3, 'triangle', 0.8); },
  hurt() { this.tone(180, 0.2, 0.4, 'sawtooth', 0.6); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 0.25, 'triangle'), i * 120)); },
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 0.25, 'triangle'), i * 180)); },
  setLoop(name, v) { if (this.loops && this.loops[name]) this.loops[name].gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  setEngine(on, speed) {
    if (!this.engine) return;
    this.engine.g.gain.setTargetAtTime(on ? 0.12 + Math.min(0.12, Math.abs(speed) / 100) : 0, this.ctx.currentTime, 0.1);
    this.engine.osc.frequency.setTargetAtTime(38 + Math.abs(speed) * 4, this.ctx.currentTime, 0.1);
  },
  update(dt, alarmOn) {
    if (!this.ctx) return;
    if (alarmOn) { this.alarm.t -= dt; if (this.alarm.t <= 0) { this.alarm.t = 0.5; this.tone(this.alarm.hi ? 880 : 660, 0.45, 0.22, 'square'); this.alarm.hi = !this.alarm.hi; } }
  },
  silence() { if (!this.loops) return; for (const k in this.loops) this.setLoop(k, 0); this.setEngine(false, 0); }
};
