// Kestrel — fully synthesised audio: positional SFX with wall occlusion, reverb, ambience and a dynamic dread score.
(function () {
  const K = window.K;
  class Audio {
    constructor() { this.ok = false; this.lx = 0; this.ly = 1.6; this.lz = 0; this.occlude = () => false; this.vol = .8; }
    init() {
      if (this.ok) return; this.ok = true;
      const A = this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = A.createGain(); this.master.gain.value = this.vol; this.master.connect(A.destination);
      const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(this.master); this.out = A.createGain(); this.out.connect(comp);
      // reverb bus (long metallic tail)
      this.verb = A.createConvolver(); this.verb.buffer = this.impulse(2.8, 2.2); this.verbIn = A.createGain(); this.verbIn.gain.value = .35; this.verbIn.connect(this.verb); this.verb.connect(this.out);
      // noise buffers
      const n = A.sampleRate * 2, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = b;
      const bb = A.createBuffer(1, n, A.sampleRate), db = bb.getChannelData(0); let last = 0;
      for (let i = 0; i < n; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; db[i] = last * 3.5; } this.brownBuf = bb;
      this.ambience(); this.score();
    }
    impulse(sec, decay) { const A = this.ac, len = A.sampleRate * sec, b = A.createBuffer(2, len, A.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1); } return b; }
    get t() { return this.ac.currentTime; }
    setListener(x, y, z, yaw) {
      this.lx = x; this.ly = y; this.lz = z;
      if (!this.ok) return; const L = this.ac.listener;
      if (L.positionX) { L.positionX.value = x; L.positionY.value = y; L.positionZ.value = z; L.forwardX.value = -Math.sin(yaw); L.forwardY.value = 0; L.forwardZ.value = -Math.cos(yaw); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
      else { L.setPosition(x, y, z); L.setOrientation(-Math.sin(yaw), 0, -Math.cos(yaw), 0, 1, 0); }
    }
    // positional destination with occlusion low-pass; returns input node
    at(x, y, z, ref = 2, verb = .5) {
      const A = this.ac, p = A.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1.3; p.maxDistance = 60;
      if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
      const lp = A.createBiquadFilter(); lp.type = 'lowpass';
      const occ = this.occlude(x, z); lp.frequency.value = occ ? 700 : 18000;
      const g = A.createGain(); g.gain.value = occ ? .55 : 1;
      g.connect(lp); lp.connect(p); p.connect(this.out);
      const s = A.createGain(); s.gain.value = verb; p.connect(s); s.connect(this.verbIn);
      return g;
    }
    dry() { const g = this.ac.createGain(); g.connect(this.out); return g; }
    env(g, t0, a, peak, dec, sus = 0) { g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, .0001), t0 + a + dec); }
    noise(dest, dur, type, freq, q, peak, a = .005, brown = false, rate = 1) {
      const A = this.ac, s = A.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; s.playbackRate.value = rate;
      const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = A.createGain(); this.env(g, this.t, a, peak, dur);
      s.connect(f); f.connect(g); g.connect(dest); s.start(this.t, Math.random()); s.stop(this.t + a + dur + .05);
      return { s, f, g };
    }
    tone(dest, type, f0, f1, dur, peak, a = .005) {
      const A = this.ac, o = A.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, this.t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), this.t + dur);
      const g = A.createGain(); this.env(g, this.t, a, peak, dur); o.connect(g); g.connect(dest); o.start(); o.stop(this.t + a + dur + .05); return { o, g };
    }

    // ---------------------------------------------------- ambience & score
    ambience() {
      const A = this.ac, bus = A.createGain(); bus.gain.value = .5; bus.connect(this.out); this.ambBus = bus;
      // life-support hum + air handling
      for (const [f, gv] of [[48, .05], [48.6, .04], [96.3, .015], [144, .006]]) { const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; const g = A.createGain(); g.gain.value = gv; o.connect(lp); lp.connect(g); g.connect(bus); o.start(); }
      const s = A.createBufferSource(); s.buffer = this.brownBuf; s.loop = true; const bp = A.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = .6; const g = A.createGain(); g.gain.value = .08; s.connect(bp); bp.connect(g); g.connect(bus); s.start();
      const lfo = A.createOscillator(); lfo.frequency.value = .07; const lg = A.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    }
    score() {
      const A = this.ac; this.scoreBus = A.createGain(); this.scoreBus.gain.value = 0; this.scoreBus.connect(this.out);
      const send = A.createGain(); send.gain.value = .6; this.scoreBus.connect(send); send.connect(this.verbIn);
      // dissonant cluster that swells with danger
      for (const f of [55, 58.3, 82.4, 87.3, 110, 116.5, 164.8]) {
        const o = A.createOscillator(); o.type = f > 100 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
        const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
        const g = A.createGain(); g.gain.value = .03;
        const trem = A.createOscillator(); trem.frequency.value = .2 + Math.random() * 2.5; const tg = A.createGain(); tg.gain.value = .02; trem.connect(tg); tg.connect(g.gain); trem.start();
        o.connect(lp); lp.connect(g); g.connect(this.scoreBus); o.start();
      }
      // heartbeat-tempo pulse layer
      this.pulseBus = A.createGain(); this.pulseBus.gain.value = 0; this.pulseBus.connect(this.out); this.nextPulse = 0;
    }
    tick(dt, tension, danger) {
      if (!this.ok) return;
      const t = this.t;
      this.scoreBus.gain.setTargetAtTime(.05 + tension * .6, t, .8);
      this.pulseBus.gain.setTargetAtTime(danger * .9, t, .3);
      if (danger > .05 && t > this.nextPulse) { // heartbeat
        const rate = .95 - danger * .45; this.nextPulse = t + rate;
        this.tone(this.pulseBus, 'sine', 62, 38, .16, .6); setTimeout(() => this.ok && this.tone(this.pulseBus, 'sine', 55, 34, .14, .4), 170);
      }
      // random distant metal groans / bangs / creaks
      this.ambT = (this.ambT ?? 4) - dt;
      if (this.ambT <= 0) {
        this.ambT = 6 + Math.random() * 14;
        const a = Math.random() * K.TAU, d = 12 + Math.random() * 25, x = this.lx + Math.cos(a) * d, z = this.lz + Math.sin(a) * d;
        const dest = this.at(x, 3, z, 6, 1.4), k = Math.random();
        if (k < .4) { const o = this.tone(dest, 'sawtooth', 70 + Math.random() * 40, 40 + Math.random() * 30, 2.5, .12, .6); const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 8; o.o.disconnect(); o.o.connect(f); f.connect(o.g); }
        else if (k < .65) { this.noise(dest, .6, 'lowpass', 300, 1, .5, .002, true); this.tone(dest, 'sine', 90, 40, .5, .25); }
        else if (k < .85) { for (let i = 0; i < 3; i++) setTimeout(() => this.ok && this.noise(dest, .08, 'bandpass', 1800 + Math.random() * 1500, 6, .1), i * (90 + Math.random() * 200)); }
        else { const o = this.tone(dest, 'sine', 880 + Math.random() * 400, 700, 2, .015, .5); } // ghostly whine
      }
    }
    stinger(kind) {
      if (!this.ok) return; const d = this.dry();
      if (kind === 'spotted') {
        for (const f of [220, 233, 311, 330, 466]) { const o = this.tone(d, 'sawtooth', f * .5, f * 1.04, 1.6, .05, .02); }
        this.noise(d, 1.4, 'highpass', 3000, .5, .25, .3);
        this.tone(d, 'sine', 50, 30, 1.5, .5, .01);
      } else if (kind === 'death') {
        for (const f of [110, 116, 155, 165]) this.tone(d, 'sawtooth', f, f * .5, 3, .08, .01);
        this.noise(d, 2.5, 'lowpass', 900, 1, .5, .01, true);
      } else if (kind === 'power') {
        this.tone(d, 'sawtooth', 40, 220, 2.2, .15, .1); this.noise(d, 1.5, 'bandpass', 1200, 2, .12, .4);
        setTimeout(() => this.ok && this.noise(this.dry(), .3, 'lowpass', 400, 1, .6, .002, true), 2100);
      } else if (kind === 'save') { [523, 659, 784].forEach((f, i) => setTimeout(() => this.ok && this.tone(this.dry(), 'square', f, f, .12, .05), i * 110)); }
      else if (kind === 'item') { this.tone(d, 'triangle', 660, 990, .12, .08); }
      else if (kind === 'key') { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.ok && this.tone(this.dry(), 'triangle', f, f, .2, .07), i * 90)); }
      else if (kind === 'objective') { this.tone(d, 'sine', 330, 330, 1.5, .08, .3); this.tone(d, 'sine', 494, 494, 1.5, .05, .3); }
    }

    // ---------------------------------------------------- player
    step(x, z, loud, type) {
      if (!this.ok) return; const own = type === 'player';
      const d = own ? this.dry() : this.at(x, 0, z, 1.5, .4);
      const v = (type === 'husk' ? .35 : .22) * loud;
      this.noise(d, .07 + loud * .05, 'bandpass', own ? 900 + Math.random() * 400 : 600, 1.2, v);
      this.noise(d, .05, 'highpass', 4000, 1, v * .3);
      if (type === 'husk' && Math.random() < .5) this.noise(d, .25, 'lowpass', 500, 1, v * .5, .02, true); // dragging foot
    }
    breath(state) {
      if (!this.ok) return; const d = this.dry();
      if (state === 'hold') this.noise(d, .4, 'bandpass', 700, 1, .12, .05);
      else if (state === 'gasp') { this.noise(d, .9, 'bandpass', 900, .8, .3, .05); }
      else this.noise(d, .7, 'bandpass', 600, .7, .07, .2);
    }
    hurt() { if (!this.ok) return; const d = this.dry(); this.noise(d, .25, 'bandpass', 500, 2, .5, .01); this.tone(d, 'sawtooth', 180, 120, .25, .1); }
    // ---------------------------------------------------- weapons
    gun(kind) {
      if (!this.ok) return; const d = this.dry(), A = this.ac;
      if (kind === 'revolver') { this.noise(d, .5, 'lowpass', 2500, .7, 1.2, .001); this.tone(d, 'sine', 120, 40, .3, .9); this.noise(this.verbIn, .9, 'lowpass', 900, .7, .8, .001); }
      else if (kind === 'shotgun') { this.noise(d, .7, 'lowpass', 1800, .6, 1.4, .001, true, .7); this.noise(d, .3, 'lowpass', 5000, .6, .7, .001); this.tone(d, 'sine', 90, 30, .45, 1.2); this.noise(this.verbIn, 1.2, 'lowpass', 700, .7, 1, .001); }
      else if (kind === 'pulse') { this.noise(d, .12, 'bandpass', 2600, 1, .6, .001); this.tone(d, 'square', 300, 90, .08, .25); this.noise(this.verbIn, .4, 'lowpass', 1200, .7, .3, .001); }
      else if (kind === 'melee') this.noise(d, .2, 'bandpass', 600, 2, .3, .05);
      else if (kind === 'meleeHit') { this.noise(d, .15, 'lowpass', 900, 1, .9, .001, true); this.tone(d, 'sine', 140, 60, .15, .5); }
    }
    click() { if (!this.ok) return; this.noise(this.dry(), .03, 'highpass', 3000, 2, .3); }
    mech(kind) { // reload foley
      if (!this.ok) return; const d = this.dry();
      const m = { open: [1800, .05, .25], close: [1400, .06, .35], shell: [2600, .04, .2], mag: [900, .08, .4], slap: [700, .08, .6], pump: [1100, .12, .5], insert: [2200, .03, .2], cock: [2400, .05, .3], tank: [600, .2, .3] }[kind] || [1500, .05, .3];
      this.noise(d, m[1], 'bandpass', m[0], 3, m[2]); this.noise(d, m[1] * .5, 'highpass', 5000, 1, m[2] * .3);
    }
    flame(on) {
      if (!this.ok) return;
      if (on && !this.flameNode) {
        const A = this.ac, s = A.createBufferSource(); s.buffer = this.brownBuf; s.loop = true;
        const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g = A.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.9, this.t, .05);
        const s2 = A.createBufferSource(); s2.buffer = this.noiseBuf; s2.loop = true; const f2 = A.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 3000; const g2 = A.createGain(); g2.gain.value = .08;
        s.connect(f); f.connect(g); s2.connect(f2); f2.connect(g2); g2.connect(g); g.connect(this.out); s.start(); s2.start(); this.flameNode = { s, s2, g };
      } else if (!on && this.flameNode) { const n = this.flameNode; n.g.gain.setTargetAtTime(0, this.t, .08); setTimeout(() => { n.s.stop(); n.s2.stop(); }, 400); this.flameNode = null; this.noise(this.dry(), .3, 'lowpass', 400, 1, .3, .01, true); }
    }
    impact(x, y, z, mat) { if (!this.ok) return; const d = this.at(x, y, z, 1, .6); if (mat === 'flesh') { this.noise(d, .12, 'lowpass', 700, 1, .7); } else { this.noise(d, .06, 'bandpass', 2500 + Math.random() * 2000, 4, .4); this.tone(d, 'sine', 2000 + Math.random() * 1500, 1500, .2, .04); } }
    explosion(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, 4, 1.5); this.noise(d, 2, 'lowpass', 700, .5, 2, .002, true, .5); this.tone(d, 'sine', 70, 20, 1.2, 1.5); this.noise(d, .4, 'highpass', 2000, .5, .8, .002); }
    glass(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, 1, .8); for (let i = 0; i < 6; i++) setTimeout(() => this.ok && this.tone(d, 'sine', 3000 + Math.random() * 4000, 2500, .25, .05), i * 25); this.noise(d, .3, 'highpass', 5000, 1, .4); }
    thud(x, y, z, v = .5) { if (!this.ok) return; const d = this.at(x, y, z, 2, .7); this.noise(d, .3, 'lowpass', 400, 1, .8 * v, .002, true); this.tone(d, 'sine', 80, 40, .25, .6 * v); }
    clank(x, y, z, v = .5) { if (!this.ok) return; const d = this.at(x, y, z, 1.5, .7); this.noise(d, .1, 'bandpass', 1500 + Math.random() * 1500, 3, .5 * v); this.tone(d, 'triangle', 600 + Math.random() * 500, 400, .25, .1 * v); }
    // ---------------------------------------------------- world
    door(x, z, open, bulk) { if (!this.ok) return; const d = this.at(x, 1.5, z, 2, .6); this.noise(d, bulk ? 1 : .6, 'bandpass', bulk ? 500 : 1100, .8, .35, .05); this.tone(d, 'sawtooth', bulk ? 60 : 90, bulk ? 45 : 70, bulk ? 1 : .55, .06); if (!open) setTimeout(() => this.ok && this.thud(x, 1, z, bulk ? .7 : .4), bulk ? 900 : 500); }
    denied(x, z) { if (!this.ok) return; const d = this.at(x, 1.4, z, 2, .3); this.tone(d, 'square', 220, 220, .15, .08); setTimeout(() => this.ok && this.tone(d, 'square', 180, 180, .25, .08), 170); }
    beep(f = 880, v = .05) { if (!this.ok) return; this.tone(this.dry(), 'square', f, f, .06, v); }
    tracker(dist) { if (!this.ok) return; const f = 1300 - Math.min(1, dist / 25) * 600; this.tone(this.dry(), 'sine', f, f, .12, .09); }
    trackerPing() { if (!this.ok) return; this.tone(this.dry(), 'sine', 1800, 1200, .3, .05); }
    alarm(x, z, n = 6) { if (!this.ok) return; const d = this.at(x, 2.5, z, 6, 1); for (let i = 0; i < n; i++) setTimeout(() => this.ok && this.tone(d, 'square', i % 2 ? 620 : 880, i % 2 ? 620 : 880, .38, .1), i * 420); }
    spark(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, .8, .3); for (let i = 0; i < 4; i++) setTimeout(() => this.ok && this.noise(d, .02, 'highpass', 4000, 1, .4), i * 30 + Math.random() * 30); }
    steam(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, 1.5, .4); this.noise(d, 1.8, 'highpass', 2500, .5, .3, .1); }
    drip(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, .6, 1); this.tone(d, 'sine', 1400 + Math.random() * 600, 600, .08, .08); }
    // ---------------------------------------------------- creatures
    stalkerStep(p, loud) { if (!this.ok) return; const d = this.at(p.x, 0, p.z, 1.2, .5); this.noise(d, .1, 'lowpass', 500, 1.5, .35 * loud, .004, true); this.noise(d, .03, 'highpass', 3500, 1, .15 * loud); }
    screech(x, y, z, v = 1) {
      if (!this.ok) return; const d = this.at(x, y, z, 5, 1.2), A = this.ac;
      for (const f of [700, 1050, 1580]) { const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .8, this.t); o.frequency.exponentialRampToValueAtTime(f * 1.3, this.t + .25); o.frequency.exponentialRampToValueAtTime(f * .7, this.t + 1.1 * v);
        const bp = A.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.6; bp.Q.value = 3; const g = A.createGain(); this.env(g, this.t, .05, .14 * v, 1.1 * v);
        const lfo = A.createOscillator(); lfo.frequency.value = 38; const lg = A.createGain(); lg.gain.value = f * .05; lfo.connect(lg); lg.connect(o.frequency); lfo.start(); lfo.stop(this.t + 1.3);
        o.connect(bp); bp.connect(g); g.connect(d); o.start(); o.stop(this.t + 1.3 * v); }
      this.noise(d, 1.1 * v, 'bandpass', 2400, 1.5, .5 * v, .04);
    }
    hiss(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, 2, .6); this.noise(d, 1.2, 'bandpass', 3500, 1.2, .35, .15); }
    ventCrawl(x, y, z) { if (!this.ok) return; const d = this.at(x, y, z, 3, .9); for (let i = 0; i < 8; i++) setTimeout(() => { if (!this.ok) return; this.noise(d, .09, 'bandpass', 400 + Math.random() * 300, 4, .5); if (Math.random() < .4) this.tone(d, 'triangle', 200 + Math.random() * 80, 150, .1, .08); }, i * (140 + Math.random() * 120)); }
    ventExit(x, y, z) { if (!this.ok) return; this.ventCrawl(x, y, z); setTimeout(() => { if (!this.ok) return; this.clank(x, y, z, 1.2); this.hiss(x, y - 1, z); }, 900); }
    ventEnter(x, y, z) { if (!this.ok) return; this.clank(x, y, z, 1); setTimeout(() => this.ok && this.ventCrawl(x, y, z), 400); }
    groan(x, y, z, v = 1, seed = .5) {
      if (!this.ok) return; const d = this.at(x, y, z, 2, .7), A = this.ac, f0 = 90 + seed * 60;
      const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, this.t); o.frequency.linearRampToValueAtTime(f0 * (.7 + Math.random() * .3), this.t + 1.2);
      const f1 = A.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 + seed * 300; f1.Q.value = 5; const f2 = A.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100 + seed * 500; f2.Q.value = 6;
      const g = A.createGain(); this.env(g, this.t, .15, .3 * v, 1.3);
      const jit = A.createOscillator(); jit.frequency.value = 9 + seed * 8; const jg = A.createGain(); jg.gain.value = 12; jit.connect(jg); jg.connect(o.frequency); jit.start(); jit.stop(this.t + 1.6);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(d); o.start(); o.stop(this.t + 1.6);
      this.noise(d, 1, 'bandpass', 900, 1, .08 * v, .2);
    }
    swish() { if (!this.ok) return; this.noise(this.dry(), .18, 'bandpass', 1200, 1, .2, .03); }
    skitter(x, z, v = .5) { if (!this.ok) return; const d = this.at(x, .2, z, 1, .4); for (let i = 0; i < 5; i++) setTimeout(() => this.ok && this.noise(d, .02, 'bandpass', 3000 + Math.random() * 2000, 5, .3 * v), i * 35); }
    shriek(x, z, v = 1) { if (!this.ok) return; const d = this.at(x, .4, z, 3, .8); this.tone(d, 'sawtooth', 1800, 3200, .35 * v, .12); this.noise(d, .4 * v, 'bandpass', 4000, 2, .3); }
    setVolume(v) { this.vol = v; if (this.ok) this.master.gain.value = v; }
  }
  K.Audio = Audio;
})();
