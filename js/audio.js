// ============================================================================
// Synthesised audio: gunshots by calibre, suppressors, mechanics, impacts.
// Distant sounds are delayed by the speed of sound (343 m/s) and low-passed.
// ============================================================================
'use strict';
(function () {
const G = window.G;
const A = G.Audio = { ready: false, vol: .8 };
let ctx, master, comp, verb, verbGain, noiseBuf, listenerPos = new THREE.Vector3();

A.init = function () {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = .002; comp.release.value = .2;
  master = ctx.createGain(); master.gain.value = A.vol;
  master.connect(comp); comp.connect(ctx.destination);
  verb = ctx.createConvolver(); verbGain = ctx.createGain(); verbGain.gain.value = .35;
  verb.connect(verbGain); verbGain.connect(master);
  A.setEnv('open');
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.ready = true;
};
A.setVolume = v => { A.vol = v; if (master) master.gain.value = v; };
// environment reverb: generated impulse responses
A.setEnv = function (kind) {
  if (!ctx) return;
  const P = { open: [2.6, 3.2, .18], urban: [2.2, 2.2, .4], forest: [1.8, 2.6, .28], industrial: [3.2, 1.6, .45], range: [2.4, 3.0, .22], snow: [1.4, 4, .12] }[kind] || [2, 3, .3];
  const len = Math.floor(ctx.sampleRate * P[0]), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, P[1]) * (kind === 'urban' && (i % 3100) < 40 ? 3 : 1); } }
  verb.buffer = ir; verbGain.gain.value = P[2];
};
A.listener = function (cam) {
  if (!ctx) return;
  const L = ctx.listener, p = cam.getWorldPosition(listenerPos), f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
  else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
};

// ---------------------------------------------------------------- primitives
function out(pos, wet = .5) {
  // returns an input node routed to master (+reverb); positional if pos given
  const g = ctx.createGain();
  if (pos) {
    const pn = ctx.createPanner(); pn.panningModel = 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = 4; pn.rolloffFactor = .9; pn.maxDistance = 2000;
    if (pn.positionX) { pn.positionX.value = pos.x; pn.positionY.value = pos.y; pn.positionZ.value = pos.z; } else pn.setPosition(pos.x, pos.y, pos.z);
    g.connect(pn); pn.connect(master); const s = ctx.createGain(); s.gain.value = wet; pn.connect(s); s.connect(verb);
  } else { g.connect(master); const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); }
  return g;
}
function noise(dest, t0, o) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = o.rate || 1;
  const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.f || 2000; f.Q.value = o.q || .7;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.dur || .1));
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(o.gain || 1, t0 + (o.atk || .001));
  g.gain.exponentialRampToValueAtTime(.0001, t0 + (o.dur || .1));
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t0, Math.random() * 1.5); src.stop(t0 + (o.dur || .1) + .05);
  return f;
}
function tone(dest, t0, o) {
  const osc = ctx.createOscillator(); osc.type = o.wave || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.dur || .1));
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(o.gain || .5, t0 + (o.atk || .002));
  g.gain.exponentialRampToValueAtTime(.0001, t0 + (o.dur || .1));
  osc.connect(g); g.connect(dest); osc.start(t0); osc.stop(t0 + (o.dur || .1) + .05);
}
function click(dest, t0, f = 3000, g = .3, dur = .018) { noise(dest, t0, { type: 'bandpass', f, q: 4, gain: g, dur }); noise(dest, t0, { type: 'lowpass', f: 900, gain: g * .5, dur: dur * 1.5 }); }

// ---------------------------------------------------------------- gunshot
// o: { cal, cls, sup, loud, pos (Vector3 or null for the shooter), player }
A.shot = function (o) {
  if (!A.ready) return;
  const c = G.CAL[o.cal] || G.CAL['5.56×45mm'];
  const pen = c.pen, big = c.cs[0] * c.cs[1] * 4000; // relative case volume
  const size = Math.min(2.4, .45 + big * .9 + (o.cls === 'LMG' ? .1 : 0));
  let d = 0; const t = ctx.currentTime;
  if (o.pos) d = o.pos.distanceTo(listenerPos);
  const delay = o.pos ? d / 343 : 0;
  const t0 = t + delay;
  const far = Math.min(1, d / 400);
  const dest = out(o.pos, o.sup ? .25 : .55 + far * .3);
  const vol = (o.loud || 1) * (o.player ? 1 : 1.25);
  if (o.sup) {
    noise(dest, t0, { type: 'lowpass', f: 1400, f2: 300, gain: .35 * vol * size, dur: .09 });
    noise(dest, t0, { type: 'bandpass', f: 4200, q: 1.2, gain: .12 * vol, dur: .03 });
    if (!o.subsonic && pen >= 2 && o.cls !== 'SMG' && o.cls !== 'PST') noise(dest, t0, { type: 'highpass', f: 3000, gain: .5 * vol, dur: .012 }); // supersonic crack remains
    click(dest, t0 + .015, 2400, .25 * vol);
    return;
  }
  const lp = 5200 - far * 4200 - (size - 1) * 800;
  noise(dest, t0, { type: 'highpass', f: 1800, gain: .9 * vol * (1 - far * .6), dur: .012 + size * .004 });           // crack / transient
  noise(dest, t0, { type: 'lowpass', f: Math.max(500, lp), f2: 180, gain: 1.1 * vol * size, dur: .11 + size * .12 });  // blast
  tone(dest, t0, { f: 140 / Math.sqrt(size), f2: 38, gain: .9 * vol * Math.min(1.4, size), dur: .12 + size * .1 });   // body thump
  noise(dest, t0 + .004, { type: 'bandpass', f: 700, q: .8, gain: .5 * vol * size, dur: .25 + size * .25, atk: .01 }); // boom tail
  if (o.player && o.mech !== false) click(dest, t0 + .03, 2600, .12);
};
// Supersonic bullet passing near the listener
A.snap = function (pos, supersonic) {
  if (!A.ready) return;
  const dest = out(pos, .2), t0 = ctx.currentTime;
  if (supersonic) { noise(dest, t0, { type: 'highpass', f: 2500, gain: .9, dur: .01 }); noise(dest, t0, { type: 'bandpass', f: 1200, gain: .3, dur: .05 }); }
  else noise(dest, t0, { type: 'bandpass', f: 900, f2: 400, q: 2, gain: .5, dur: .18, atk: .05 });
};

// ---------------------------------------------------------------- mechanics
A.mech = function (kind, pos) {
  if (!A.ready) return;
  const dest = out(pos, .15), t = ctx.currentTime;
  switch (kind) {
    case 'dry': click(dest, t, 3500, .35, .012); break;
    case 'magout': click(dest, t, 1800, .35); noise(dest, t + .02, { type: 'bandpass', f: 800, gain: .25, dur: .06 }); break;
    case 'magin': click(dest, t, 2200, .45); click(dest, t + .05, 3200, .35); break;
    case 'boltback': click(dest, t, 2000, .4, .03); noise(dest, t, { type: 'bandpass', f: 1300, q: 2, gain: .2, dur: .08 }); break;
    case 'boltfwd': click(dest, t, 2800, .5, .025); click(dest, t + .03, 1600, .3); break;
    case 'boltup': click(dest, t, 2400, .3); break;
    case 'pump': noise(dest, t, { type: 'bandpass', f: 1500, q: 1.5, gain: .5, dur: .09 }); click(dest, t + .12, 2200, .5); noise(dest, t + .14, { type: 'bandpass', f: 1100, gain: .3, dur: .07 }); break;
    case 'lever': click(dest, t, 2000, .45); click(dest, t + .16, 2600, .45); break;
    case 'shell': click(dest, t, 1400, .35, .03); noise(dest, t + .02, { type: 'lowpass', f: 700, gain: .25, dur: .06 }); break;
    case 'ping': // Garand en-bloc clip ejection
      tone(dest, t, { f: 2650, gain: .25, dur: .9, wave: 'sine' }); tone(dest, t, { f: 4150, gain: .12, dur: .6 }); tone(dest, t, { f: 6900, gain: .06, dur: .35 }); click(dest, t, 3000, .3); break;
    case 'cover': click(dest, t, 1200, .4, .03); click(dest, t + .08, 2000, .3); break;
    case 'belt': noise(dest, t, { type: 'bandpass', f: 3500, q: .8, gain: .2, dur: .25 }); break;
    case 'slide': noise(dest, t, { type: 'bandpass', f: 2500, q: 1.5, gain: .3, dur: .05 }); click(dest, t + .06, 3000, .5); break;
    case 'cyl': click(dest, t, 2600, .3); click(dest, t + .2, 2000, .3); break;
    case 'mode': click(dest, t, 4200, .25, .01); break;
    case 'bipod': click(dest, t, 1500, .3); click(dest, t + .05, 1800, .3); break;
    case 'gl': tone(dest, t, { f: 90, f2: 40, gain: .8, dur: .2 }); noise(dest, t, { type: 'lowpass', f: 700, gain: .7, dur: .2 }); break;
    case 'melee': noise(dest, t, { type: 'bandpass', f: 600, gain: .5, dur: .15 }); break;
    case 'equip': noise(dest, t, { type: 'bandpass', f: 1800, gain: .2, dur: .15, atk: .05 }); click(dest, t + .15, 2400, .25); break;
  }
};
A.casing = function (pos, shell) {
  if (!A.ready) return;
  const dest = out(pos, .05), t = ctx.currentTime, f = shell ? 500 : 3800 + Math.random() * 2400;
  tone(dest, t, { f, gain: shell ? .15 : .05, dur: shell ? .05 : .09, wave: 'triangle' });
  tone(dest, t, { f: f * 1.51, gain: .03, dur: .06 });
};
// impact sounds by surface
A.impact = function (pos, mat, strong) {
  if (!A.ready) return;
  const d = pos.distanceTo(listenerPos); if (d > 120) return;
  const dest = out(pos, .15), t = ctx.currentTime, g = strong ? .8 : .45;
  switch (mat) {
    case 'metal': case 'steel': tone(dest, t, { f: 1800 + Math.random() * 800, gain: g * .5, dur: .25, wave: 'triangle' }); noise(dest, t, { type: 'highpass', f: 3000, gain: g * .4, dur: .03 }); break;
    case 'wood': case 'planks': noise(dest, t, { type: 'bandpass', f: 600, q: 1.5, gain: g, dur: .06 }); break;
    case 'flesh': case 'gel': noise(dest, t, { type: 'lowpass', f: 400, gain: g * 1.2, dur: .07 }); break;
    case 'glass': for (let i = 0; i < 5; i++) tone(dest, t + i * .02, { f: 3000 + Math.random() * 3000, gain: .08, dur: .2 }); break;
    default: noise(dest, t, { type: 'lowpass', f: 900, gain: g, dur: .08 }); noise(dest, t, { type: 'bandpass', f: 2200, gain: g * .2, dur: .03 });
  }
};
// AR500 steel ding, arrives later at range distance (bullet flight + sound return)
A.ding = function (pos, extraDelay) {
  if (!A.ready) return;
  const d = pos.distanceTo(listenerPos), t = ctx.currentTime + (extraDelay || 0) + d / 343;
  const dest = out(pos, .5), g = Math.max(.15, 1 - d / 1500);
  for (const [f, a, du] of [[980, .5, 1.1], [2470, .3, .8], [3900, .18, .5], [5600, .08, .3]]) tone(dest, t, { f: f * (1 + (Math.random() - .5) * .04), gain: a * g, dur: du });
};
A.hit = function (head, kill) {
  if (!A.ready) return;
  const dest = out(null, 0), t = ctx.currentTime;
  if (kill) { tone(dest, t, { f: 520, gain: .18, dur: .12, wave: 'square' }); tone(dest, t + .07, { f: 780, gain: .15, dur: .15, wave: 'square' }); }
  else noise(dest, t, { type: 'bandpass', f: head ? 5200 : 3200, q: 3, gain: head ? .6 : .4, dur: .04 });
  if (head) tone(dest, t, { f: 3100, gain: .12, dur: .12, wave: 'triangle' });
};
A.hurt = function () { if (!A.ready) return; const dest = out(null, 0), t = ctx.currentTime; tone(dest, t, { f: 90, f2: 40, gain: .8, dur: .2 }); noise(dest, t, { type: 'lowpass', f: 500, gain: .5, dur: .15 }); };
A.step = function (surface, pos, run) {
  if (!A.ready) return;
  const dest = out(pos, .03), t = ctx.currentTime;
  const f = { snow: 700, sand: 900, mud: 400, metal: 2200, wood: 800, concrete: 1400, grass: 1100 }[surface] || 1000;
  noise(dest, t, { type: 'bandpass', f: f * (.9 + Math.random() * .2), q: .8, gain: (run ? .22 : .13) * (surface === 'metal' ? 1.4 : 1), dur: surface === 'snow' ? .14 : .07 });
};
A.explosion = function (pos) {
  if (!A.ready) return;
  const d = pos.distanceTo(listenerPos), t = ctx.currentTime + d / 343, dest = out(pos, .9);
  noise(dest, t, { type: 'lowpass', f: 1800, f2: 80, gain: 2.2, dur: 1.4 });
  tone(dest, t, { f: 70, f2: 22, gain: 1.6, dur: .9 });
  noise(dest, t + .05, { type: 'bandpass', f: 400, gain: .8, dur: 2.2, atk: .05 });
};
A.ui = function (kind) {
  if (!A.ready) return;
  const dest = out(null, 0), t = ctx.currentTime;
  if (kind === 'hover') tone(dest, t, { f: 1800, gain: .03, dur: .03, wave: 'triangle' });
  else if (kind === 'attach') { click(dest, t, 2600, .3); click(dest, t + .06, 1800, .25); }
  else tone(dest, t, { f: 1200, gain: .06, dur: .05, wave: 'triangle' });
};
// continuous ambience (wind, distant battle) — a simple looped filtered noise bed
let amb;
A.ambience = function (kind) {
  if (!A.ready) return;
  if (amb) { try { amb.src.stop(); } catch (e) {} amb = null; }
  if (!kind) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'jungle' ? 2400 : kind === 'wind' ? 500 : 350;
  const g = ctx.createGain(); g.gain.value = kind === 'jungle' ? .025 : .05;
  src.connect(f); f.connect(g); g.connect(master); src.start();
  amb = { src, g, f, kind };
  // distant artillery rumble for war eras
  if (kind === 'war') {
    const boom = () => { if (!amb || amb.kind !== 'war') return; const t = ctx.currentTime; const dd = out(null, .8); tone(dd, t, { f: 45, f2: 25, gain: .35, dur: 1.6 }); noise(dd, t, { type: 'lowpass', f: 200, gain: .3, dur: 2 }); setTimeout(boom, 4000 + Math.random() * 9000); };
    setTimeout(boom, 3000);
  }
  if (kind === 'jungle') {
    const bird = () => { if (!amb || amb.kind !== 'jungle') return; const t = ctx.currentTime; const dd = out(null, .6); const f0 = 1800 + Math.random() * 2500; for (let i = 0; i < 3; i++) tone(dd, t + i * .12, { f: f0, f2: f0 * 1.3, gain: .03, dur: .08 }); setTimeout(bird, 1500 + Math.random() * 5000); };
    setTimeout(bird, 1000);
  }
};
})();
