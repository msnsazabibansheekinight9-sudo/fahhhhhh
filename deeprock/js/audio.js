/* Rock & Stone — all sound is synthesised at run time. Recipes are small layer
   lists (noise or tone, a filter sweep and an envelope), so a pickaxe, a
   minigun and a glyphid screech all come out of the same tiny engine. */
(function (RS) {
  'use strict';

  function L(o) { return o; }
  // type: 'n' noise, 't' tone. f: freq, f1: end freq. fc/fc1: filter sweep.
  var RECIPES = {
    pick:        [L({ t: 'n', dur: 0.11, g: 0.5, flt: 'bp', fc: 2600, fc1: 700, q: 1.2 }), L({ t: 't', w: 'triangle', f: 300, f1: 90, dur: 0.09, g: 0.3 })],
    pickbig:     [L({ t: 'n', dur: 0.26, g: 0.7, flt: 'bp', fc: 1800, fc1: 320, q: 1.0 }), L({ t: 't', w: 'triangle', f: 180, f1: 48, dur: 0.22, g: 0.5 })],
    clang:       [L({ t: 't', w: 'square', f: 1500, f1: 1380, dur: 0.3, g: 0.18 }), L({ t: 't', w: 'sine', f: 2300, f1: 2100, dur: 0.22, g: 0.12 }), L({ t: 'n', dur: 0.07, g: 0.35, flt: 'hp', fc: 3000 })],
    step:        [L({ t: 'n', dur: 0.09, g: 0.3, flt: 'lp', fc: 900, fc1: 260, q: 0.9 })],
    jump:        [L({ t: 'n', dur: 0.1, g: 0.22, flt: 'lp', fc: 1200, fc1: 400 }), L({ t: 't', w: 'sine', f: 170, f1: 260, dur: 0.1, g: 0.2 })],
    thud:        [L({ t: 'n', dur: 0.3, g: 0.6, flt: 'lp', fc: 380, fc1: 90 }), L({ t: 't', w: 'sine', f: 90, f1: 38, dur: 0.3, g: 0.6 })],
    shieldbreak: [L({ t: 't', w: 'sawtooth', f: 900, f1: 180, dur: 0.3, g: 0.25 }), L({ t: 'n', dur: 0.25, g: 0.3, flt: 'bp', fc: 2400, fc1: 600, q: 2 })],
    flare:       [L({ t: 'n', dur: 0.4, g: 0.3, flt: 'hp', fc: 1800, fc1: 5200 })],
    hiss:        [L({ t: 'n', dur: 0.8, g: 0.22, flt: 'bp', fc: 3400, fc1: 1200, q: 1.4 })],

    gun_rifle:   [L({ t: 'n', dur: 0.1, g: 0.55, flt: 'hp', fc: 900 }), L({ t: 't', w: 'square', f: 240, f1: 70, dur: 0.1, g: 0.4 }), L({ t: 'n', dur: 0.3, g: 0.14, flt: 'lp', fc: 1600, fc1: 300 })],
    gun_smg:     [L({ t: 'n', dur: 0.07, g: 0.42, flt: 'hp', fc: 1300 }), L({ t: 't', w: 'square', f: 300, f1: 110, dur: 0.07, g: 0.28 })],
    gun_shotgun: [L({ t: 'n', dur: 0.2, g: 0.75, flt: 'lp', fc: 3200, fc1: 500 }), L({ t: 't', w: 'sine', f: 140, f1: 44, dur: 0.24, g: 0.55 })],
    gun_pistol:  [L({ t: 'n', dur: 0.09, g: 0.4, flt: 'bp', fc: 2200, fc1: 800, q: 1.1 }), L({ t: 't', w: 'square', f: 330, f1: 120, dur: 0.08, g: 0.26 })],
    gun_revolver:[L({ t: 'n', dur: 0.16, g: 0.68, flt: 'lp', fc: 2600, fc1: 420 }), L({ t: 't', w: 'sine', f: 170, f1: 52, dur: 0.2, g: 0.5 })],
    gun_mini:    [L({ t: 'n', dur: 0.06, g: 0.4, flt: 'hp', fc: 1100 }), L({ t: 't', w: 'sawtooth', f: 260, f1: 90, dur: 0.06, g: 0.3 })],
    gun_launch:  [L({ t: 'n', dur: 0.14, g: 0.5, flt: 'lp', fc: 1400, fc1: 300 }), L({ t: 't', w: 'sine', f: 200, f1: 80, dur: 0.16, g: 0.4 })],
    gun_nail:    [L({ t: 't', w: 'square', f: 900, f1: 420, dur: 0.05, g: 0.2 }), L({ t: 'n', dur: 0.05, g: 0.2, flt: 'hp', fc: 2600 })],
    gun_zip:     [L({ t: 'n', dur: 0.3, g: 0.4, flt: 'bp', fc: 1200, fc1: 2600, q: 1.5 }), L({ t: 't', w: 'sine', f: 120, f1: 300, dur: 0.3, g: 0.2 })],
    gun_plat:    [L({ t: 'n', dur: 0.18, g: 0.35, flt: 'bp', fc: 900, fc1: 2400, q: 2 }), L({ t: 't', w: 'triangle', f: 420, f1: 760, dur: 0.2, g: 0.18 })],
    platform:    [L({ t: 'n', dur: 0.35, g: 0.3, flt: 'lp', fc: 2200, fc1: 500 }), L({ t: 't', w: 'sine', f: 300, f1: 170, dur: 0.3, g: 0.2 })],
    grapple:     [L({ t: 'n', dur: 0.25, g: 0.3, flt: 'bp', fc: 1500, fc1: 3600, q: 1.6 })],

    explode:     [L({ t: 'n', dur: 0.75, g: 0.95, flt: 'lp', fc: 2600, fc1: 110 }), L({ t: 't', w: 'sine', f: 110, f1: 28, dur: 0.75, g: 0.85 }), L({ t: 'n', dur: 0.25, g: 0.5, flt: 'hp', fc: 1800, fc1: 400 })],
    c4:          [L({ t: 'n', dur: 1.1, g: 1.0, flt: 'lp', fc: 2200, fc1: 70 }), L({ t: 't', w: 'sine', f: 80, f1: 20, dur: 1.1, g: 0.95 })],
    beep:        [L({ t: 't', w: 'square', f: 1200, dur: 0.05, g: 0.12 })],
    radio:       [L({ t: 't', w: 'square', f: 1500, dur: 0.04, g: 0.09 }), L({ t: 't', w: 'square', f: 1900, dur: 0.04, g: 0.09, delay: 0.06 })],
    pickup:      [L({ t: 't', w: 'sine', f: 760, f1: 1240, dur: 0.11, g: 0.17 })],
    deposit:     [L({ t: 't', w: 'sine', f: 420, f1: 820, dur: 0.17, g: 0.2 }), L({ t: 't', w: 'sine', f: 620, f1: 1240, dur: 0.17, g: 0.14, delay: 0.07 })],
    objective:   [L({ t: 't', w: 'sine', f: 520, dur: 0.15, g: 0.2 }), L({ t: 't', w: 'sine', f: 780, dur: 0.2, g: 0.2, delay: 0.14 }), L({ t: 't', w: 'sine', f: 1040, dur: 0.3, g: 0.18, delay: 0.28 })],
    fail:        [L({ t: 't', w: 'sawtooth', f: 300, f1: 90, dur: 0.9, g: 0.25 }), L({ t: 't', w: 'sawtooth', f: 220, f1: 60, dur: 1.1, g: 0.2, delay: 0.1 })],
    swarm:       [L({ t: 't', w: 'sawtooth', f: 180, f1: 380, dur: 1.1, g: 0.3, flt: 'lp', fc: 900, fc1: 2400 }), L({ t: 't', w: 'sawtooth', f: 90, f1: 190, dur: 1.3, g: 0.26 })],
    rockstone:   [L({ t: 't', w: 'sawtooth', f: 160, f1: 200, dur: 0.18, g: 0.3, flt: 'lp', fc: 1400 }), L({ t: 't', w: 'sawtooth', f: 200, f1: 120, dur: 0.3, g: 0.3, delay: 0.2, flt: 'lp', fc: 1100 }), L({ t: 'n', dur: 0.5, g: 0.1, flt: 'bp', fc: 700, q: 1.6 })],

    bug_screech: [L({ t: 't', w: 'sawtooth', f: 620, f1: 1500, dur: 0.22, g: 0.17, flt: 'bp', fc: 2000, fc1: 3400, q: 2.4 }), L({ t: 'n', dur: 0.2, g: 0.13, flt: 'bp', fc: 3000, q: 3 })],
    bug_hurt:    [L({ t: 'n', dur: 0.12, g: 0.3, flt: 'bp', fc: 1400, fc1: 600, q: 1.4 })],
    bug_die:     [L({ t: 't', w: 'sawtooth', f: 500, f1: 90, dur: 0.4, g: 0.2, flt: 'lp', fc: 2000, fc1: 400 }), L({ t: 'n', dur: 0.3, g: 0.25, flt: 'lp', fc: 1200, fc1: 200 })],
    bug_roar:    [L({ t: 't', w: 'sawtooth', f: 150, f1: 70, dur: 0.9, g: 0.5, flt: 'lp', fc: 1100, fc1: 300 }), L({ t: 't', w: 'square', f: 74, f1: 40, dur: 1.0, g: 0.35 }), L({ t: 'n', dur: 0.7, g: 0.2, flt: 'bp', fc: 500, q: 1.2 })],
    spit:        [L({ t: 'n', dur: 0.18, g: 0.3, flt: 'bp', fc: 900, fc1: 2200, q: 1.8 })],
    bite:        [L({ t: 'n', dur: 0.08, g: 0.35, flt: 'bp', fc: 1100, fc1: 400, q: 1.2 }), L({ t: 't', w: 'square', f: 160, f1: 70, dur: 0.07, g: 0.2 })],

    pod_land:    [L({ t: 'n', dur: 1.4, g: 0.8, flt: 'lp', fc: 900, fc1: 80 }), L({ t: 't', w: 'sine', f: 70, f1: 30, dur: 1.5, g: 0.7 })],
    pod_launch:  [L({ t: 'n', dur: 2.2, g: 0.7, flt: 'lp', fc: 500, fc1: 2200 }), L({ t: 't', w: 'sawtooth', f: 60, f1: 190, dur: 2.4, g: 0.5 })],
    resupply:    [L({ t: 't', w: 'square', f: 700, dur: 0.1, g: 0.14 }), L({ t: 't', w: 'square', f: 900, dur: 0.1, g: 0.14, delay: 0.12 }), L({ t: 't', w: 'square', f: 1200, dur: 0.14, g: 0.14, delay: 0.24 })],
    revive:      [L({ t: 't', w: 'sine', f: 300, f1: 900, dur: 0.4, g: 0.25 })],
    downed:      [L({ t: 't', w: 'sine', f: 400, f1: 120, dur: 0.8, g: 0.3 }), L({ t: 'n', dur: 0.6, g: 0.2, flt: 'lp', fc: 600, fc1: 150 })],
    heal:        [L({ t: 't', w: 'sine', f: 600, f1: 1100, dur: 0.3, g: 0.16 })],
    laser:       [L({ t: 't', w: 'sine', f: 1800, f1: 2400, dur: 0.07, g: 0.08 })],
    scan:        [L({ t: 't', w: 'sine', f: 900, f1: 1800, dur: 0.25, g: 0.1 })],
    drop:        [L({ t: 'n', dur: 0.12, g: 0.2, flt: 'lp', fc: 1400, fc1: 400 })],
    ice:         [L({ t: 'n', dur: 0.3, g: 0.3, flt: 'hp', fc: 4000, fc1: 1200 })],
    weld:        [L({ t: 'n', dur: 0.2, g: 0.25, flt: 'bp', fc: 3000, q: 2 })]
  };

  RS.Audio = function (profile) {
    this.profile = profile;
    this.ctx = null;
    this.ready = false;
    this.listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
    this.loops = {};
    this.lastPlay = {};
    this.tension = 0;
  };
  var A = RS.Audio.prototype;

  A.init = function () {
    if (this.ctx) return;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try { this.ctx = new C(); } catch (e) { return; }
    var ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.profile ? this.profile.settings.sfx : 0.8;
    this.sfxBus.connect(this.master);
    this.musBus = ctx.createGain();
    this.musBus.gain.value = (this.profile ? this.profile.settings.music : 0.5) * 0.5;
    this.musBus.connect(this.master);

    // one second of white noise, reused by every noise layer
    var n = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, n, n);
    var data = this.noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;

    this.ready = true;
    this.startAmbient();
  };

  A.resume = function () {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  A.setListener = function (pos, yaw) {
    this.listener.x = pos.x; this.listener.y = pos.y; this.listener.z = pos.z;
    this.listener.rx = Math.cos(yaw); this.listener.rz = -Math.sin(yaw);
  };

  // Distance gain plus a cheap stereo pan from the listener's right vector.
  A.spatial = function (pos, maxDist) {
    if (!pos) return { gain: 1, pan: 0 };
    var dx = pos.x - this.listener.x, dy = pos.y - this.listener.y, dz = pos.z - this.listener.z;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    maxDist = maxDist || 55;
    var g = Math.max(0, 1 - d / maxDist);
    g *= g;
    var pan = 0;
    if (d > 0.1) pan = RS.clamp((dx * this.listener.rx + dz * this.listener.rz) / d, -1, 1) * 0.8;
    return { gain: g, pan: pan, dist: d };
  };

  A.play = function (name, pos, vol, pitch) {
    if (!this.ready) return;
    var rec = RECIPES[name];
    if (!rec) return;
    var sp = this.spatial(pos);
    if (sp.gain <= 0.004) return;
    // throttle identical sounds fired in the same instant
    var now = this.ctx.currentTime;
    var lk = name + '|' + ((sp.pan * 4) | 0);
    if (this.lastPlay[lk] !== undefined && now - this.lastPlay[lk] < 0.022) return;
    this.lastPlay[lk] = now;

    var out = this.ctx.createGain();
    out.gain.value = (vol === undefined ? 1 : vol) * sp.gain;
    var panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panNode) { panNode.pan.value = sp.pan; out.connect(panNode); panNode.connect(this.sfxBus); }
    else out.connect(this.sfxBus);

    pitch = pitch || 1;
    for (var i = 0; i < rec.length; i++) this.layer(rec[i], out, now, pitch);
  };

  A.layer = function (l, dest, now, pitch) {
    var ctx = this.ctx;
    var t0 = now + (l.delay || 0);
    var dur = l.dur * (0.92 + Math.random() * 0.16);
    var src, g = ctx.createGain();
    if (l.t === 'n') {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      src.playbackRate.value = 0.8 + Math.random() * 0.5;
    } else {
      src = ctx.createOscillator();
      src.type = l.w || 'sine';
      var f0 = l.f * pitch * (0.97 + Math.random() * 0.06);
      src.frequency.setValueAtTime(f0, t0);
      if (l.f1) src.frequency.exponentialRampToValueAtTime(Math.max(20, l.f1 * pitch), t0 + dur);
    }
    var node = src;
    if (l.flt) {
      var f = ctx.createBiquadFilter();
      f.type = l.flt === 'lp' ? 'lowpass' : (l.flt === 'hp' ? 'highpass' : 'bandpass');
      f.Q.value = l.q || 1;
      f.frequency.setValueAtTime(l.fc, t0);
      if (l.fc1) f.frequency.exponentialRampToValueAtTime(Math.max(40, l.fc1), t0 + dur);
      node.connect(f); node = f;
    }
    var peak = l.g;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  };

  /* Continuous sources — flamethrower, drills, minigun spin. Created once and
     gated by gain so there is no click on every trigger pull. */
  A.loop = function (name, on, vol, pitch) {
    if (!this.ready) return;
    var L2 = this.loops[name];
    var ctx = this.ctx;
    if (!L2) {
      var src, filt = ctx.createBiquadFilter(), g = ctx.createGain();
      g.gain.value = 0;
      if (name === 'flame') {
        src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        filt.type = 'bandpass'; filt.frequency.value = 700; filt.Q.value = 0.8;
      } else if (name === 'drill') {
        src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 95;
        filt.type = 'lowpass'; filt.frequency.value = 1300; filt.Q.value = 4;
      } else if (name === 'spin') {
        src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 60;
        filt.type = 'lowpass'; filt.frequency.value = 900;
      } else if (name === 'zipride') {
        src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        filt.type = 'bandpass'; filt.frequency.value = 2200; filt.Q.value = 2;
      } else {
        src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        filt.type = 'bandpass'; filt.frequency.value = 1000;
      }
      src.connect(filt); filt.connect(g); g.connect(this.sfxBus);
      src.start();
      L2 = this.loops[name] = { src: src, g: g, filt: filt, osc: src.frequency !== undefined && !src.buffer };
    }
    var target = on ? (vol === undefined ? 0.3 : vol) : 0;
    L2.g.gain.setTargetAtTime(target, ctx.currentTime, 0.04);
    if (pitch && L2.src.frequency && !L2.src.buffer) {
      L2.src.frequency.setTargetAtTime(L2 === this.loops.drill ? 95 * pitch : 60 * pitch, ctx.currentTime, 0.08);
    }
    if (pitch && L2.src.playbackRate) L2.src.playbackRate.setTargetAtTime(pitch, ctx.currentTime, 0.08);
  };

  A.stopAllLoops = function () {
    for (var k in this.loops) this.loop(k, false);
  };

  /* Cave ambience: a slow drone that tightens when a swarm is inbound. */
  A.startAmbient = function () {
    var ctx = this.ctx;
    this.amb = { oscs: [], gain: ctx.createGain() };
    this.amb.gain.gain.value = 0.22;
    this.amb.gain.connect(this.musBus);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 1.2;
    lp.connect(this.amb.gain);
    this.ambFilter = lp;
    var freqs = [55, 82.4, 110.2, 164.5];
    for (var i = 0; i < freqs.length; i++) {
      var o = ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'sine';
      o.frequency.value = freqs[i] * (0.998 + Math.random() * 0.004);
      var g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.16;
      o.connect(g); g.connect(lp);
      o.start();
      this.amb.oscs.push({ o: o, g: g });
    }
    // slow breathing LFO on the filter
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    var lg = ctx.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();

    // noise bed: distant cave wind
    var nz = ctx.createBufferSource(); nz.buffer = this.noiseBuf; nz.loop = true;
    var nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 240; nf.Q.value = 0.6;
    var ng = ctx.createGain(); ng.gain.value = 0.1;
    nz.connect(nf); nf.connect(ng); ng.connect(this.amb.gain); nz.start();
  };

  // 0 = calm cave, 1 = full swarm.
  A.setTension = function (x) {
    if (!this.ready || !this.ambFilter) return;
    this.tension = x;
    this.ambFilter.frequency.setTargetAtTime(380 + x * 900, this.ctx.currentTime, 0.6);
    this.amb.gain.gain.setTargetAtTime(0.22 + x * 0.3, this.ctx.currentTime, 0.8);
    for (var i = 0; i < this.amb.oscs.length; i++) {
      var o = this.amb.oscs[i];
      o.g.gain.setTargetAtTime((i === 0 ? 0.5 : 0.16) * (1 + x * 1.1), this.ctx.currentTime, 0.8);
    }
  };

  A.setVolumes = function (sfx, mus) {
    if (!this.ready) return;
    this.sfxBus.gain.value = sfx;
    this.musBus.gain.value = mus * 0.5;
  };
})(window.RS);
