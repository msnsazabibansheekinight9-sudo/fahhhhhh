// ============================================================================
// TERMINAL — technical indicators. Plain functions over an array of candles
// {t,o,h,l,c,v}. The chart draws them and the Chartist seat reasons from them,
// so they live in one place and there is only ever one definition of an RSI.
// ============================================================================
'use strict';
(function () {
const T = M.TA = {};
const closes = c => c.map(x => x.c);

T.sma = (data, n) => { const out = new Array(data.length).fill(null); let s = 0; for (let i = 0; i < data.length; i++) { s += data[i]; if (i >= n) s -= data[i - n]; if (i >= n - 1) out[i] = s / n; } return out; };
T.ema = (data, n) => { const out = new Array(data.length).fill(null), k = 2 / (n + 1); let e = null; for (let i = 0; i < data.length; i++) { e = e === null ? data[i] : data[i] * k + e * (1 - k); if (i >= n - 1) out[i] = e; } return out; };
T.wma = (data, n) => { const out = new Array(data.length).fill(null); const d = n * (n + 1) / 2; for (let i = n - 1; i < data.length; i++) { let s = 0; for (let j = 0; j < n; j++) s += data[i - j] * (n - j); out[i] = s / d; } return out; };

T.rsi = (candles, n = 14) => {
  const c = closes(candles), out = new Array(c.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i] - c[i - 1], up = Math.max(0, d), dn = Math.max(0, -d);
    if (i <= n) { g += up / n; l += dn / n; if (i === n) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  }
  return out;
};

T.macd = (candles, fast = 12, slow = 26, sig = 9) => {
  const c = closes(candles);
  const ef = T.ema(c, fast), es = T.ema(c, slow);
  const line = c.map((_, i) => ef[i] != null && es[i] != null ? ef[i] - es[i] : null);
  const valid = line.filter(x => x != null);
  const sg = T.ema(valid, sig);
  const signal = new Array(line.length).fill(null);
  let k = 0; for (let i = 0; i < line.length; i++) if (line[i] != null) signal[i] = sg[k++];
  const hist = line.map((v, i) => v != null && signal[i] != null ? v - signal[i] : null);
  return { line, signal, hist };
};

T.bbands = (candles, n = 20, mult = 2) => {
  const c = closes(candles), mid = T.sma(c, n), up = [], lo = [];
  for (let i = 0; i < c.length; i++) {
    if (mid[i] == null) { up.push(null); lo.push(null); continue; }
    let s = 0; for (let j = i - n + 1; j <= i; j++) s += (c[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / n);
    up.push(mid[i] + mult * sd); lo.push(mid[i] - mult * sd);
  }
  return { mid, up, lo, width: mid.map((m, i) => m ? (up[i] - lo[i]) / m * 100 : null) };
};

T.atr = (candles, n = 14) => {
  const tr = candles.map((c, i) => i === 0 ? c.h - c.l : Math.max(c.h - c.l, Math.abs(c.h - candles[i - 1].c), Math.abs(c.l - candles[i - 1].c)));
  return T.ema(tr, n);
};

T.vwap = (candles) => {
  let pv = 0, v = 0;
  return candles.map(c => { const tp = (c.h + c.l + c.c) / 3; pv += tp * c.v; v += c.v; return v ? pv / v : c.c; });
};

T.stoch = (candles, n = 14, d = 3) => {
  const k = candles.map((c, i) => {
    if (i < n - 1) return null;
    const win = candles.slice(i - n + 1, i + 1);
    const hi = Math.max(...win.map(x => x.h)), lo = Math.min(...win.map(x => x.l));
    return hi === lo ? 50 : (c.c - lo) / (hi - lo) * 100;
  });
  const valid = k.filter(x => x != null), sd = T.sma(valid, d);
  const dd = new Array(k.length).fill(null); let j = 0;
  for (let i = 0; i < k.length; i++) if (k[i] != null) dd[i] = sd[j++];
  return { k, d: dd };
};

T.obv = (candles) => { let o = 0; return candles.map((c, i) => { if (i) o += c.c > candles[i - 1].c ? c.v : c.c < candles[i - 1].c ? -c.v : 0; return o; }); };

T.adx = (candles, n = 14) => {
  const pdm = [], ndm = [], tr = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].h - candles[i - 1].h, dn = candles[i - 1].l - candles[i].l;
    pdm.push(up > dn && up > 0 ? up : 0); ndm.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - candles[i - 1].c), Math.abs(candles[i].l - candles[i - 1].c)));
  }
  const atr = T.ema(tr, n), pdi = T.ema(pdm, n), ndi = T.ema(ndm, n);
  const dx = atr.map((a, i) => { if (!a || pdi[i] == null || ndi[i] == null) return null; const p = pdi[i] / a * 100, m = ndi[i] / a * 100; return p + m === 0 ? 0 : Math.abs(p - m) / (p + m) * 100; });
  const valid = dx.filter(x => x != null), sm = T.ema(valid, n);
  const out = new Array(candles.length).fill(null); let j = 0;
  for (let i = 1; i < candles.length; i++) if (dx[i - 1] != null) out[i] = sm[j++];
  return out;
};

// Pivot-based support and resistance: the prices where the tape actually turned.
T.levels = (candles, look = 5, max = 6) => {
  const piv = [];
  for (let i = look; i < candles.length - look; i++) {
    let hi = true, lo = true;
    for (let j = 1; j <= look; j++) {
      if (candles[i].h <= candles[i - j].h || candles[i].h <= candles[i + j].h) hi = false;
      if (candles[i].l >= candles[i - j].l || candles[i].l >= candles[i + j].l) lo = false;
    }
    if (hi) piv.push({ p: candles[i].h, kind: 'r', i });
    if (lo) piv.push({ p: candles[i].l, kind: 's', i });
  }
  // Cluster nearby pivots: three touches at one price is a level, one is noise.
  const px = candles[candles.length - 1].c, tol = px * .012, groups = [];
  for (const p of piv) {
    const g = groups.find(x => Math.abs(x.p - p.p) < tol);
    if (g) { g.p = (g.p * g.n + p.p) / (g.n + 1); g.n++; g.last = Math.max(g.last, p.i); }
    else groups.push({ p: p.p, n: 1, kind: p.kind, last: p.i });
  }
  return groups.sort((a, b) => b.n - a.n || b.last - a.last).slice(0, max).map(g => ({ p: g.p, touches: g.n, kind: g.p > px ? 'r' : 's' }));
};

// Stan Weinstein's four stages, read off the long average and its slope.
T.stage = (candles) => {
  const c = closes(candles);
  if (c.length < 160) return { n: 0, name: 'Not enough history' };
  const ma = T.sma(c, 150);
  const i = c.length - 1, px = c[i], m = ma[i], m20 = ma[i - 20];
  if (m == null || m20 == null) return { n: 0, name: 'Not enough history' };
  const slope = (m - m20) / m20 * 100;
  if (px > m && slope > 0.8) return { n: 2, name: 'Stage 2 — advancing', note: 'Price above a rising long average. The only stage Weinstein buys in.' };
  if (px > m && slope <= 0.8) return { n: 3, name: 'Stage 3 — topping', note: 'Above the average but the average has flattened. Distribution territory.' };
  if (px < m && slope < -0.8) return { n: 4, name: 'Stage 4 — declining', note: 'Below a falling average. The stage where the worst losses happen.' };
  return { n: 1, name: 'Stage 1 — basing', note: 'Below or around a flat average. Accumulation, not yet confirmed.' };
};

// Everything the Chartist seat needs, in one pass.
T.snapshot = (candles) => {
  if (!candles || candles.length < 30) return null;
  const c = closes(candles), i = c.length - 1, px = c[i];
  const s20 = T.sma(c, 20), s50 = T.sma(c, 50), s200 = T.sma(c, 200);
  const e21 = T.ema(c, 21);
  const rsi = T.rsi(candles), macd = T.macd(candles), bb = T.bbands(candles), atr = T.atr(candles), adx = T.adx(candles), st = T.stoch(candles), obv = T.obv(candles);
  const hi52 = Math.max(...candles.slice(-252).map(x => x.h));
  const lo52 = Math.min(...candles.slice(-252).map(x => x.l));
  const volAvg = candles.slice(-50).reduce((a, x) => a + x.v, 0) / Math.min(50, candles.length);
  const obvSlope = obv.length > 21 ? (obv[i] - obv[i - 20]) / Math.max(1, Math.abs(obv[i - 20])) : 0;
  return {
    px, sma20: s20[i], sma50: s50[i], sma200: s200[i], ema21: e21[i],
    rsi: rsi[i], macd: macd.line[i], macdSig: macd.signal[i], macdHist: macd.hist[i],
    bbUp: bb.up[i], bbLo: bb.lo[i], bbWidth: bb.width[i],
    atr: atr[i], atrPct: atr[i] ? atr[i] / px * 100 : 0, adx: adx[i],
    stochK: st.k[i], stochD: st.d[i],
    hi52, lo52, pctOfHigh: px / hi52 * 100, pctOffLow: (px / lo52 - 1) * 100,
    volLast: candles[i].v, volAvg, volRatio: volAvg ? candles[i].v / volAvg : 1,
    obvSlope, levels: T.levels(candles), stage: T.stage(candles),
    above200: s200[i] != null && px > s200[i], above50: s50[i] != null && px > s50[i],
    goldenCross: s50[i] != null && s200[i] != null && s50[i] > s200[i],
    trendUp: s50[i] != null && s50[i - 20] != null && s50[i] > s50[i - 20]
  };
};
})();
