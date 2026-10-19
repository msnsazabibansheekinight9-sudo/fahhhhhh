// ============================================================================
// TERMINAL — charting. A canvas price chart with candles or a line, a volume
// pane, overlays (moving averages, Bollinger, VWAP), one indicator pane
// (RSI, MACD, volume), a crosshair readout, wheel zoom and drag pan.
// Also the depth ladder and the small sparkline used in list rows.
// ============================================================================
'use strict';
(function () {
const C = M.Chart = {};
const TA = M.TA;

const COL = () => {
  const s = getComputedStyle(document.documentElement);
  const g = n => s.getPropertyValue(n).trim();
  return { up: g('--up') || '#26a69a', dn: g('--dn') || '#ef5350', fg: g('--fg') || '#d8dee9', dim: g('--dim') || '#6b7585', grid: g('--grid') || 'rgba(255,255,255,.06)', panel: g('--panel') || '#131821', acc: g('--acc') || '#f0b429' };
};

class PriceChart {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.opts = Object.assign({ type: 'candle', overlays: ['sma50', 'sma200'], lower: 'volume', showVol: true }, opts);
    this.data = []; this.view = { from: 0, to: 0 }; this.hover = null;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this._bind();
  }
  setData(rows, keepView) {
    this.data = rows || [];
    if (!keepView || this.view.to === 0) { const n = this.data.length; this.view = { from: Math.max(0, n - 140), to: n }; }
    else { this.view.to = Math.min(this.data.length, this.view.to); this.view.from = M.clamp(this.view.from, 0, Math.max(0, this.view.to - 10)); }
    this.draw();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    this.w = r.width; this.h = r.height;
    this.draw();
  }
  _bind() {
    const cv = this.cv;
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const span = this.view.to - this.view.from;
      const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const next = M.clamp(Math.round(span * k), 15, this.data.length);
      const r = cv.getBoundingClientRect();
      const frac = (e.clientX - r.left) / r.width;
      const anchor = this.view.from + span * frac;
      this.view.from = M.clamp(Math.round(anchor - next * frac), 0, Math.max(0, this.data.length - 15));
      this.view.to = M.clamp(this.view.from + next, this.view.from + 15, this.data.length);
      this.draw();
    }, { passive: false });
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, from: this.view.from, to: this.view.to }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      if (drag) {
        const span = drag.to - drag.from;
        const shift = Math.round((drag.x - e.clientX) / r.width * span);
        const from = M.clamp(drag.from + shift, 0, Math.max(0, this.data.length - span));
        this.view = { from, to: from + span };
      }
      this.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.draw();
    });
    const end = e => { drag = null; try { cv.releasePointerCapture(e.pointerId); } catch (x) {} };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { this.hover = null; drag = null; this.draw(); });
    cv.addEventListener('dblclick', () => { const n = this.data.length; this.view = { from: Math.max(0, n - 140), to: n }; this.draw(); });
  }
  slice() { return this.data.slice(this.view.from, this.view.to); }

  draw() {
    const ctx = this.ctx, c = COL();
    if (!this.w) { this.resize(); return; }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const rows = this.slice();
    if (rows.length < 2) { ctx.fillStyle = c.dim; ctx.font = '12px ui-monospace, monospace'; ctx.fillText('No data', 12, 20); return; }

    const padL = 8, padR = 62, padT = 10;
    const lowerH = this.opts.lower && this.opts.lower !== 'none' ? Math.min(96, this.h * .24) : 0;
    const volH = this.opts.showVol ? Math.min(54, this.h * .14) : 0;
    const axisH = 20;
    const priceH = this.h - padT - lowerH - volH - axisH;
    const W = this.w - padL - padR;
    const n = rows.length, bw = W / n;

    let lo = Infinity, hi = -Infinity;
    for (const r of rows) { lo = Math.min(lo, r.l); hi = Math.max(hi, r.h); }
    // Overlays must fit in the frame too, or a moving average walks off it.
    const ov = this._overlays();
    for (const o of ov) for (let i = this.view.from; i < this.view.to; i++) { const v = o.data[i]; if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    const pad = (hi - lo) * .06 || hi * .01 || 1;
    lo -= pad; hi += pad;
    const Y = p => padT + priceH - (p - lo) / (hi - lo) * priceH;
    const X = i => padL + i * bw + bw / 2;

    // grid + price axis
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.dim; ctx.font = '10px ui-monospace, SFMono-Regular, monospace'; ctx.textAlign = 'left';
    const steps = 5;
    for (let k = 0; k <= steps; k++) {
      const p = lo + (hi - lo) * k / steps, y = Y(p);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
      ctx.fillText(M.fmt.px(p), padL + W + 6, y + 3);
    }

    // overlays behind the candles
    for (const o of ov) {
      ctx.strokeStyle = o.colour; ctx.lineWidth = 1.2; ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) { const v = o.data[this.view.from + i]; if (v == null) { started = false; continue; } const x = X(i), y = Y(v); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
      ctx.stroke();
    }

    // price
    if (this.opts.type === 'line' || this.opts.type === 'area') {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = X(i), y = Y(rows[i].c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      const rising = rows[n - 1].c >= rows[0].c;
      ctx.strokeStyle = rising ? c.up : c.dn; ctx.lineWidth = 1.6; ctx.stroke();
      if (this.opts.type === 'area') {
        ctx.lineTo(X(n - 1), padT + priceH); ctx.lineTo(X(0), padT + priceH); ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + priceH);
        grad.addColorStop(0, (rising ? c.up : c.dn) + '38'); grad.addColorStop(1, (rising ? c.up : c.dn) + '00');
        ctx.fillStyle = grad; ctx.fill();
      }
    } else {
      const body = Math.max(1, Math.min(bw * .68, 14));
      for (let i = 0; i < n; i++) {
        const r = rows[i], x = X(i), up = r.c >= r.o;
        ctx.strokeStyle = ctx.fillStyle = up ? c.up : c.dn;
        ctx.beginPath(); ctx.moveTo(x, Y(r.h)); ctx.lineTo(x, Y(r.l)); ctx.lineWidth = Math.max(1, body * .14); ctx.stroke();
        const yo = Y(r.o), yc = Y(r.c);
        if (bw > 2.2) ctx.fillRect(x - body / 2, Math.min(yo, yc), body, Math.max(1, Math.abs(yc - yo)));
        else { ctx.lineWidth = Math.max(1, bw * .8); ctx.beginPath(); ctx.moveTo(x, Math.min(yo, yc)); ctx.lineTo(x, Math.max(yo, yc) + 1); ctx.stroke(); }
      }
    }

    // last price marker
    const last = rows[n - 1];
    const ly = Y(last.c);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = c.acc; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(padL + W, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c.acc; ctx.fillRect(padL + W + 2, ly - 8, padR - 4, 16);
    ctx.fillStyle = '#10141c'; ctx.font = 'bold 10px ui-monospace, monospace'; ctx.fillText(M.fmt.px(last.c), padL + W + 6, ly + 3);

    // volume
    if (volH) {
      const vTop = padT + priceH + 4, maxV = Math.max(...rows.map(r => r.v)) || 1;
      for (let i = 0; i < n; i++) {
        const r = rows[i], h = r.v / maxV * (volH - 8);
        ctx.fillStyle = (r.c >= r.o ? c.up : c.dn) + '66';
        ctx.fillRect(X(i) - Math.max(.5, bw * .34), vTop + (volH - 8) - h, Math.max(1, bw * .68), h);
      }
      ctx.fillStyle = c.dim; ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('VOL ' + M.fmt.qty(last.v), padL + 2, vTop + 9);
    }

    // lower pane
    if (lowerH) this._lower(ctx, c, padL, W, padT + priceH + volH + 6, lowerH - 8, rows);

    // time axis
    ctx.fillStyle = c.dim; ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center';
    const every = Math.max(1, Math.floor(n / 7));
    for (let i = 0; i < n; i += every) {
      const t = rows[i].t;
      const span = rows[n - 1].t - rows[0].t;
      ctx.fillText(span < 5 * 864e5 ? M.fmt.hm(t) : M.fmt.dayMon(t), X(i), this.h - 6);
    }
    ctx.textAlign = 'left';

    // crosshair
    if (this.hover && this.hover.x > padL && this.hover.x < padL + W) {
      const i = M.clamp(Math.floor((this.hover.x - padL) / bw), 0, n - 1), r = rows[i];
      ctx.strokeStyle = c.dim; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(i), padT); ctx.lineTo(X(i), this.h - axisH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, this.hover.y); ctx.lineTo(padL + W, this.hover.y); ctx.stroke(); ctx.setLineDash([]);
      const p = lo + (1 - (this.hover.y - padT) / priceH) * (hi - lo);
      if (this.hover.y > padT && this.hover.y < padT + priceH) {
        ctx.fillStyle = c.panel; ctx.fillRect(padL + W + 2, this.hover.y - 8, padR - 4, 16);
        ctx.strokeStyle = c.grid; ctx.strokeRect(padL + W + 2, this.hover.y - 8, padR - 4, 16);
        ctx.fillStyle = c.fg; ctx.font = '10px ui-monospace, monospace'; ctx.fillText(M.fmt.px(p), padL + W + 6, this.hover.y + 3);
      }
      const txt = `${M.fmt.dayMon(r.t)} ${M.fmt.hm(r.t)}  O ${M.fmt.px(r.o)}  H ${M.fmt.px(r.h)}  L ${M.fmt.px(r.l)}  C ${M.fmt.px(r.c)}  V ${M.fmt.qty(r.v)}`;
      ctx.font = '10px ui-monospace, monospace';
      const tw = ctx.measureText(txt).width + 12;
      ctx.fillStyle = c.panel + 'ee'; ctx.fillRect(padL, 2, tw, 16);
      ctx.fillStyle = r.c >= r.o ? c.up : c.dn; ctx.fillText(txt, padL + 6, 13);
      this.onHover && this.onHover(r);
    }
  }

  _overlays() {
    const c = COL(), closes = this.data.map(r => r.c), out = [];
    for (const id of this.opts.overlays) {
      if (id === 'sma20') out.push({ data: TA.sma(closes, 20), colour: '#6cc5ff' });
      else if (id === 'sma50') out.push({ data: TA.sma(closes, 50), colour: '#f0b429' });
      else if (id === 'sma200') out.push({ data: TA.sma(closes, 200), colour: '#c678dd' });
      else if (id === 'ema21') out.push({ data: TA.ema(closes, 21), colour: '#7fd1a4' });
      else if (id === 'vwap') out.push({ data: TA.vwap(this.data), colour: '#ff9f6b' });
      else if (id === 'bb') { const b = TA.bbands(this.data); out.push({ data: b.up, colour: 'rgba(140,160,200,.45)' }, { data: b.lo, colour: 'rgba(140,160,200,.45)' }, { data: b.mid, colour: 'rgba(140,160,200,.25)' }); }
    }
    return out;
  }

  _lower(ctx, c, x0, W, y0, H, rows) {
    const kind = this.opts.lower, n = rows.length, bw = W / n, X = i => x0 + i * bw + bw / 2;
    ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + W, y0); ctx.stroke();
    ctx.font = '9px ui-monospace, monospace'; ctx.fillStyle = c.dim;
    if (kind === 'rsi') {
      const r = TA.rsi(this.data);
      const Y = v => y0 + H - v / 100 * H;
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([2, 3]);
      for (const lv of [30, 70]) { ctx.beginPath(); ctx.moveTo(x0, Y(lv)); ctx.lineTo(x0 + W, Y(lv)); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.strokeStyle = '#c678dd'; ctx.lineWidth = 1.2; ctx.beginPath();
      let s = false;
      for (let i = 0; i < n; i++) { const v = r[this.view.from + i]; if (v == null) { s = false; continue; } const X2 = X(i), Y2 = Y(v); s ? ctx.lineTo(X2, Y2) : (ctx.moveTo(X2, Y2), s = true); }
      ctx.stroke();
      const lastV = r[this.view.to - 1];
      ctx.fillStyle = c.dim; ctx.fillText('RSI 14' + (lastV != null ? '  ' + lastV.toFixed(1) : ''), x0 + 2, y0 + 10);
    } else if (kind === 'macd') {
      const m = TA.macd(this.data);
      const vals = [];
      for (let i = this.view.from; i < this.view.to; i++) { if (m.line[i] != null) vals.push(m.line[i], m.signal[i] || 0, m.hist[i] || 0); }
      const mx = Math.max(...vals.map(Math.abs)) || 1;
      const Y = v => y0 + H / 2 - v / mx * (H / 2 - 2);
      for (let i = 0; i < n; i++) {
        const h = m.hist[this.view.from + i]; if (h == null) continue;
        ctx.fillStyle = h >= 0 ? c.up + '99' : c.dn + '99';
        ctx.fillRect(X(i) - Math.max(.5, bw * .3), Math.min(Y(0), Y(h)), Math.max(1, bw * .6), Math.abs(Y(h) - Y(0)));
      }
      for (const [arr, col] of [[m.line, '#6cc5ff'], [m.signal, '#f0b429']]) {
        ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.beginPath(); let s = false;
        for (let i = 0; i < n; i++) { const v = arr[this.view.from + i]; if (v == null) { s = false; continue; } const a = X(i), b = Y(v); s ? ctx.lineTo(a, b) : (ctx.moveTo(a, b), s = true); }
        ctx.stroke();
      }
      ctx.fillStyle = c.dim; ctx.fillText('MACD 12/26/9', x0 + 2, y0 + 10);
    } else if (kind === 'volume') {
      const maxV = Math.max(...rows.map(r => r.v)) || 1;
      for (let i = 0; i < n; i++) { const r = rows[i], h = r.v / maxV * (H - 10); ctx.fillStyle = (r.c >= r.o ? c.up : c.dn) + '88'; ctx.fillRect(X(i) - Math.max(.5, bw * .34), y0 + H - h, Math.max(1, bw * .68), h); }
      ctx.fillStyle = c.dim; ctx.fillText('Volume', x0 + 2, y0 + 10);
    }
  }
}
C.PriceChart = PriceChart;

// ------------------------------------------------------------------ sparkline
C.spark = (canvas, values, colour) => {
  const ctx = canvas.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  if (!values || values.length < 2) return;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  ctx.beginPath();
  values.forEach((v, i) => { const x = i / (values.length - 1) * r.width, y = r.height - 2 - (v - lo) / span * (r.height - 4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  const col = colour || (values[values.length - 1] >= values[0] ? COL().up : COL().dn);
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.lineTo(r.width, r.height); ctx.lineTo(0, r.height); ctx.closePath();
  ctx.fillStyle = col + '22'; ctx.fill();
};

// ------------------------------------------------------------------ depth
C.depth = (canvas, book) => {
  const ctx = canvas.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  if (!r.width || !book || !book.bids.length) return;
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
  const c = COL();
  const maxC = Math.max(book.bids[book.bids.length - 1].c, book.asks[book.asks.length - 1].c) || 1;
  const mid = (book.bids[0].p + book.asks[0].p) / 2;
  const span = Math.max(book.asks[book.asks.length - 1].p - mid, mid - book.bids[book.bids.length - 1].p) || 1;
  const X = p => r.width / 2 + (p - mid) / span * (r.width / 2 - 4);
  const Y = v => r.height - 2 - v / maxC * (r.height - 6);
  for (const [side, col] of [[book.bids, c.up], [book.asks, c.dn]]) {
    ctx.beginPath(); ctx.moveTo(X(side[0].p), r.height);
    for (const lv of side) ctx.lineTo(X(lv.p), Y(lv.c));
    ctx.lineTo(X(side[side.length - 1].p), r.height); ctx.closePath();
    ctx.fillStyle = col + '2e'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath(); let first = true;
    for (const lv of side) { const x = X(lv.p), y = Y(lv.c); first ? (ctx.moveTo(x, y), first = false) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(r.width / 2, 0); ctx.lineTo(r.width / 2, r.height); ctx.stroke();
};
})();
