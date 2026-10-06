// Procedural canvas textures. Everything in the game is generated at load time.
var NF = window.NF || (window.NF = {});
NF.tex = (function () {
  var cache = {};
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function make(key, w, h, draw, rx, ry) {
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); draw(g, w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    cache[key] = t; return t;
  }
  function noise(g, w, h, amt, r) {
    var d = g.getImageData(0, 0, w, h), p = d.data;
    for (var i = 0; i < p.length; i += 4) { var n = (r() - 0.5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
    g.putImageData(d, 0, 0);
  }
  function stains(g, w, h, r, n, col) {
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, rad = 6 + r() * 40;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  function blood(g, w, h, r, n, a) {
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, s = 2 + r() * 7;
      var col = 'rgba(' + (40 + r() * 35 | 0) + ',' + (2 + r() * 6 | 0) + ',' + (2 + r() * 4 | 0) + ',';
      var gr = g.createRadialGradient(x, y, 0, x, y, s * 2.2);
      gr.addColorStop(0, col + (a || 0.85) + ')'); gr.addColorStop(0.6, col + (a || 0.85) * 0.6 + ')'); gr.addColorStop(1, col + '0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, s * 2.2, s * (1.2 + r()), r() * 3, 0, 7); g.fill();
      g.fillStyle = col + (a || 0.85) + ')';
      for (var k = 0; k < 10; k++) { g.beginPath(); g.arc(x + (r() - .5) * s * 6, y + (r() - .5) * s * 6, 0.5 + s * r() * 0.22, 0, 7); g.fill(); }
      if (r() < 0.6) { var dl = s * (2 + r() * 6); g.fillRect(x - 0.8, y, 1.6 + r(), dl); g.beginPath(); g.arc(x, y + dl, 1.6, 0, 7); g.fill(); }
    }
  }
  var T = {};
  T.wood = function () {
    return make('wood', 512, 512, function (g, w, h) {
      var r = rnd(7);
      for (var y = 0; y < h; y += 32) {
        var off = (y / 32 % 2) * 128 + r() * 60;
        for (var x = -256; x < w; x += 256) {
          var b = 40 + r() * 22;
          g.fillStyle = 'rgb(' + (b + 30 | 0) + ',' + (b + 8 | 0) + ',' + (b - 12 | 0) + ')';
          g.fillRect(x + off, y, 256, 32);
          g.strokeStyle = 'rgba(0,0,0,0.12)';
          for (var k = 0; k < 9; k++) { g.beginPath(); var yy = y + 3 + r() * 26; g.moveTo(x + off, yy); g.bezierCurveTo(x + off + 80, yy + (r() - .5) * 6, x + off + 170, yy + (r() - .5) * 6, x + off + 256, yy); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x + off, y, 2, 32);
        }
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y, w, 2);
      }
      noise(g, w, h, 18, r); stains(g, w, h, r, 14, 'rgba(0,0,0,0.25)');
    }, 4, 4);
  };
  T.wallpaper = function () {
    return make('wallpaper', 256, 512, function (g, w, h) {
      var r = rnd(3);
      g.fillStyle = '#4a1414'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 64) for (var x = 0; x < w; x += 64) {
        var ox = ((y / 64) % 2) * 32;
        g.save(); g.translate(x + ox + 32, y + 32);
        g.fillStyle = 'rgba(160,110,50,0.32)';
        for (var a = 0; a < 4; a++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(0, -13, 5, 13, 0, 0, 7); g.fill(); }
        g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill();
        g.restore();
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (var x2 = 0; x2 < w; x2 += 128) g.fillRect(x2, 0, 2, h);
      stains(g, w, h, r, 18, 'rgba(20,10,0,0.35)');
      var gr = g.createLinearGradient(0, h * 0.75, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      noise(g, w, h, 14, r);
    }, 1, 1);
  };
  T.panel = function () { // dark wood wainscot
    return make('panel', 256, 256, function (g, w, h) {
      var r = rnd(11);
      g.fillStyle = '#2a1608'; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 128) {
        g.fillStyle = '#3a210e'; g.fillRect(x + 12, 16, 104, h - 32);
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(x + 12, 16, 104, h - 32);
        g.strokeStyle = 'rgba(255,200,140,0.08)'; g.lineWidth = 1; g.strokeRect(x + 16, 20, 96, h - 40);
      }
      noise(g, w, h, 16, r);
    }, 1, 1);
  };
  T.stone = function () {
    return make('stone', 512, 512, function (g, w, h) {
      var r = rnd(5);
      g.fillStyle = '#55524c'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 64) for (var x = 0; x < w; x += 128) {
        var ox = (y / 64 % 2) * 64, b = 70 + r() * 30;
        g.fillStyle = 'rgb(' + (b | 0) + ',' + (b - 3 | 0) + ',' + (b - 8 | 0) + ')';
        g.fillRect(x + ox + 2, y + 2, 124, 60);
      }
      noise(g, w, h, 30, r); stains(g, w, h, r, 30, 'rgba(10,20,0,0.25)');
    }, 2, 2);
  };
  T.marble = function () {
    return make('marble', 512, 512, function (g, w, h) {
      var r = rnd(9);
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
        var dark = (x + y) % 2;
        g.fillStyle = dark ? '#1d1a18' : '#b9b2a6'; g.fillRect(x * 128, y * 128, 128, 128);
        g.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,50,40,0.25)';
        for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x * 128 + r() * 128, y * 128); g.bezierCurveTo(x * 128 + r() * 128, y * 128 + 40, x * 128 + r() * 128, y * 128 + 90, x * 128 + r() * 128, y * 128 + 128); g.stroke(); }
      }
      g.strokeStyle = 'rgba(0,0,0,0.5)'; for (var i = 0; i <= 4; i++) { g.strokeRect(i * 128, 0, 0.1, h); g.strokeRect(0, i * 128, w, 0.1); }
      noise(g, w, h, 12, r); stains(g, w, h, r, 10, 'rgba(0,0,0,0.3)'); blood(g, w, h, r, 2, 0.6);
    }, 6, 6);
  };
  T.carpet = function () {
    return make('carpet', 256, 512, function (g, w, h) {
      var r = rnd(13);
      g.fillStyle = '#5b0c0c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a07a2a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
      g.lineWidth = 2; g.strokeRect(30, 30, w - 60, h - 60);
      g.fillStyle = 'rgba(160,122,42,0.4)';
      for (var y = 70; y < h - 60; y += 60) { g.save(); g.translate(w / 2, y); g.rotate(Math.PI / 4); g.fillRect(-14, -14, 28, 28); g.restore(); }
      noise(g, w, h, 24, r); stains(g, w, h, r, 8, 'rgba(0,0,0,0.35)');
    }, 1, 1);
  };
  T.tile = function () {
    return make('tile', 512, 512, function (g, w, h) {
      var r = rnd(17);
      g.fillStyle = '#4c5452'; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 64) for (var x = 0; x < w; x += 64) {
        var b = 165 + r() * 25; g.fillStyle = 'rgb(' + (b - 10 | 0) + ',' + (b | 0) + ',' + (b - 2 | 0) + ')';
        g.fillRect(x + 2, y + 2, 60, 60);
        if (r() < 0.12) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(x + r() * 64, y); g.lineTo(x + r() * 64, y + 64); g.stroke(); }
      }
      noise(g, w, h, 14, r); stains(g, w, h, r, 26, 'rgba(60,50,20,0.25)'); blood(g, w, h, r, 3, 0.7);
    }, 6, 6);
  };
  T.labwall = function () {
    return make('labwall', 256, 256, function (g, w, h) {
      var r = rnd(19);
      g.fillStyle = '#7d8784'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5e6866'; g.fillRect(0, 0, w, 6); g.fillRect(0, 128, w, 6); g.fillRect(0, 0, 4, h); g.fillRect(128, 0, 4, h);
      g.fillStyle = '#9a8a1a'; g.fillRect(0, h - 26, w, 18);
      g.fillStyle = '#111'; for (var x = -20; x < w; x += 28) { g.beginPath(); g.moveTo(x, h - 8); g.lineTo(x + 14, h - 26); g.lineTo(x + 24, h - 26); g.lineTo(x + 10, h - 8); g.fill(); }
      noise(g, w, h, 16, r); stains(g, w, h, r, 14, 'rgba(40,30,0,0.3)');
    }, 1, 1);
  };
  T.metal = function () {
    return make('metal', 256, 256, function (g, w, h) {
      var r = rnd(23);
      g.fillStyle = '#5a5f62'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,' + r() * 0.05 + ')'; g.fillRect(0, r() * h, w, 1); }
      stains(g, w, h, r, 12, 'rgba(90,40,10,0.35)');
      noise(g, w, h, 10, r);
    }, 1, 1);
  };
  T.books = function () {
    return make('books', 512, 512, function (g, w, h) {
      var r = rnd(29);
      g.fillStyle = '#1a0e06'; g.fillRect(0, 0, w, h);
      var cols = ['#5a1a12', '#1f3a22', '#2a2a4a', '#6a4a1a', '#3a1a2a', '#40382a', '#14202e'];
      for (var y = 0; y < h; y += 102) {
        var x = 4;
        while (x < w - 4) {
          var bw = 10 + r() * 18, bh = 70 + r() * 26;
          g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x, y + 98 - bh, bw, bh);
          g.fillStyle = 'rgba(200,160,60,0.5)'; g.fillRect(x + 2, y + 98 - bh + 10, bw - 4, 2); g.fillRect(x + 2, y + 98 - 16, bw - 4, 2);
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + bw - 2, y + 98 - bh, 2, bh);
          x += bw + 1; if (r() < 0.05) x += 20;
        }
        g.fillStyle = '#3a220e'; g.fillRect(0, y + 96, w, 8);
      }
      noise(g, w, h, 16, r);
    }, 1, 1);
  };
  T.skin = function (tone, zombie, seed) {
    var key = 'skin' + tone + zombie + seed;
    return make(key, 128, 128, function (g, w, h) {
      var r = rnd(seed || 31);
      g.fillStyle = tone; g.fillRect(0, 0, w, h);
      if (zombie) {
        stains(g, w, h, r, 22, 'rgba(60,70,40,0.45)');
        g.strokeStyle = 'rgba(40,20,60,0.45)'; g.lineWidth = 1;
        for (var i = 0; i < 14; i++) { g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); for (var k = 0; k < 5; k++) { x += (r() - .5) * 24; y += (r() - .5) * 24; g.lineTo(x, y); } g.stroke(); }
        blood(g, w, h, r, 2, 0.7);
        stains(g, w, h, r, 6, 'rgba(40,10,30,0.35)');
      } else stains(g, w, h, r, 10, 'rgba(120,60,50,0.1)');
      noise(g, w, h, zombie ? 22 : 8, r);
    }, 1, 1);
  };
  T.cloth = function (col, dirty, seed) {
    var key = 'cloth' + col + dirty + seed;
    return make(key, 128, 128, function (g, w, h) {
      var r = rnd(seed || 37);
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.08)'; for (var i = 0; i < w; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      if (dirty) {
        stains(g, w, h, r, 16, 'rgba(30,20,10,0.45)');
        blood(g, w, h, r, 2 + (r() * 4 | 0), 0.85);
        for (var k = 0; k < 4; k++) { g.fillStyle = 'rgba(12,4,2,0.8)'; g.beginPath(); var tx = r() * w, ty = r() * h; g.moveTo(tx, ty); for (var q = 0; q < 6; q++) g.lineTo(tx + (r() - .5) * 16, ty + (r() - .5) * 12); g.closePath(); g.fill(); }
      }
      noise(g, w, h, 18, r);
    }, 1, 1);
  };
  T.muscle = function () {
    return make('muscle', 128, 256, function (g, w, h) {
      var r = rnd(41);
      g.fillStyle = '#4a120e'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 90; i++) {
        g.strokeStyle = 'rgba(' + (110 + r() * 60 | 0) + ',' + (25 + r() * 25 | 0) + ',' + (25 + r() * 15 | 0) + ',0.55)'; g.lineWidth = 1 + r() * 3;
        var x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 30, h * .3, x + (r() - .5) * 30, h * .7, x + (r() - .5) * 20, h); g.stroke();
      }
      g.fillStyle = 'rgba(230,210,180,0.5)'; for (var k = 0; k < 12; k++) g.fillRect(r() * w, r() * h, 2 + r() * 10, 1 + r() * 3);
      noise(g, w, h, 20, r);
    }, 1, 1);
  };
  T.flesh = function () {
    return make('flesh', 256, 256, function (g, w, h) {
      var r = rnd(43);
      g.fillStyle = '#4a2a28'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) {
        var x = r() * w, y = r() * h, s = 3 + r() * 14;
        var gr = g.createRadialGradient(x, y, 0, x, y, s);
        gr.addColorStop(0, 'rgba(' + (110 + r() * 60 | 0) + ',' + (45 + r() * 30 | 0) + ',' + (45 + r() * 25 | 0) + ',0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
      }
      g.strokeStyle = 'rgba(25,0,30,0.45)'; for (var k = 0; k < 40; k++) { g.lineWidth = 0.5 + r() * 1.5; g.beginPath(); var x2 = r() * w, y2 = r() * h; g.moveTo(x2, y2); for (var j = 0; j < 7; j++) { x2 += (r() - .5) * 26; y2 += (r() - .5) * 26; g.lineTo(x2, y2); } g.stroke(); }
      g.strokeStyle = 'rgba(200,150,130,0.18)'; for (var m = 0; m < 60; m++) { g.lineWidth = 1; g.beginPath(); var x3 = r() * w, y3 = r() * h; g.moveTo(x3, y3); g.quadraticCurveTo(x3 + (r() - .5) * 20, y3 + 10, x3 + (r() - .5) * 10, y3 + 20); g.stroke(); }
      noise(g, w, h, 26, r);
    }, 1, 1);
  };
  T.bloodDecal = function (seed) {
    return make('bd' + seed, 256, 256, function (g, w, h) {
      var r = rnd(seed || 47);
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(70,0,0,0.9)';
      g.beginPath(); g.ellipse(w / 2, h / 2, 40 + r() * 40, 30 + r() * 40, r() * 3, 0, 7); g.fill();
      for (var i = 0; i < 40; i++) { var a = r() * 7, d = 40 + r() * 80, s = 2 + r() * 10; g.beginPath(); g.arc(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, s, 0, 7); g.fill(); }
      for (var j = 0; j < 6; j++) { var a2 = r() * 7; g.save(); g.translate(w / 2, h / 2); g.rotate(a2); g.fillRect(0, -3, 70 + r() * 50, 6); g.restore(); }
    }, 1, 1);
  };
  T.painting = function (seed) {
    return make('paint' + seed, 192, 256, function (g, w, h) {
      var r = rnd(seed * 97 + 3);
      var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2c2214'); bg.addColorStop(1, '#0c0804');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // a grim portrait: a figure with a pale face and shadowed eyes
      var cx = w / 2 + (r() - .5) * 20;
      g.fillStyle = ['#1a1a24', '#2a1010', '#14201a'][seed % 3];
      g.beginPath(); g.moveTo(cx - 70, h); g.quadraticCurveTo(cx - 60, h * 0.55, cx, h * 0.52); g.quadraticCurveTo(cx + 60, h * 0.55, cx + 70, h); g.fill();
      g.fillStyle = '#c8b090'; g.beginPath(); g.ellipse(cx, h * 0.36, 30, 40, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.ellipse(cx + 12, h * 0.37, 26, 40, 0, 0, 7); g.fill();
      g.fillStyle = '#100604'; g.beginPath(); g.ellipse(cx - 11, h * 0.34, 6, 4, 0, 0, 7); g.ellipse(cx + 11, h * 0.34, 6, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#1a0e06'; g.beginPath(); g.ellipse(cx, h * 0.22, 34, 18, 0, Math.PI, 0); g.fill();
      g.fillStyle = 'rgba(90,0,0,0.6)'; g.fillRect(cx - 1, h * 0.36, 2, 20 + r() * 30);
      noise(g, w, h, 30, r);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; for (var i = 0; i < 40; i++) { g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
    }, 1, 1);
  };
  T.paper = function () {
    return make('paper', 128, 128, function (g, w, h) {
      var r = rnd(53); g.fillStyle = '#d6cba8'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(40,30,20,0.6)'; for (var y = 16; y < h - 10; y += 8) g.fillRect(12, y, 40 + r() * 60, 2);
      noise(g, w, h, 20, r);
    }, 1, 1);
  };
  T.screen = function (seed) {
    return make('scr' + seed, 128, 96, function (g, w, h) {
      var r = rnd(seed + 61); g.fillStyle = '#021a0c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2cff7a'; g.font = '9px monospace';
      var lines = ['VELGEN BIOMED', 'LAZARUS-7 STATUS', 'SUBJ 04 ... LOST', 'SUBJ 07 ... ACTIVE', 'CONTAINMENT: FAIL', '> _'];
      for (var i = 0; i < lines.length; i++) g.fillText(lines[(i + seed) % lines.length], 6, 14 + i * 13);
      for (var y = 0; y < h; y += 2) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y, w, 1); }
    }, 1, 1);
  };
  T.spark = function () {
    return make('spark', 64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,230,160,0.8)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 1, 1);
  };
  T.smoke = function () {
    return make('smoke', 64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 1, 1);
  };
  T.rnd = rnd;
  return T;
})();
