// Procedural 16x16 pixel art: the block texture atlas and the item sprites.
(function () {
  'use strict';
  const T = 16, COLS = 16;
  const atlas = document.createElement('canvas');
  atlas.width = atlas.height = T * COLS;
  const actx = atlas.getContext('2d');
  const TEX = {};
  let next = 0;

  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const mul = (c, f) => [clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f)];
  const mix = (a, b, t) => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];

  // A 16x16 RGBA buffer with drawing helpers.
  function Img(seed) {
    this.d = new Uint8ClampedArray(T * T * 4);
    this.r = BH.mulberry32(seed * 7919 + 13);
  }
  Img.prototype.set = function (x, y, c, a) {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = (y * T + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a === undefined ? 255 : a;
  };
  Img.prototype.get = function (x, y) { const i = (y * T + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; };
  Img.prototype.fill = function (c, v) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) this.set(x, y, mul(c, 1 + (this.r() - 0.5) * v));
    return this;
  };
  Img.prototype.specks = function (c, n, v) {
    for (let k = 0; k < n; k++) this.set((this.r() * T) | 0, (this.r() * T) | 0, mul(c, 1 + (this.r() - 0.5) * (v || 0.2)));
    return this;
  };
  Img.prototype.blobs = function (c, n, size, v) {
    for (let k = 0; k < n; k++) {
      const cx = (this.r() * T) | 0, cy = (this.r() * T) | 0, s = 1 + ((this.r() * size) | 0);
      for (let j = 0; j < s * 3; j++) this.set(cx + ((this.r() * s) | 0) - (s >> 1), cy + ((this.r() * s) | 0) - (s >> 1), mul(c, 1 + (this.r() - 0.5) * (v || 0.2)));
    }
    return this;
  };
  Img.prototype.clear = function () { this.d.fill(0); return this; };
  Img.prototype.rect = function (x0, y0, w, h, c, v) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v ? mul(c, 1 + (this.r() - 0.5) * v) : c);
    return this;
  };
  Img.prototype.border = function (c) {
    for (let i = 0; i < T; i++) { this.set(i, 0, c); this.set(i, T - 1, c); this.set(0, i, c); this.set(T - 1, i, c); }
    return this;
  };
  Img.prototype.mask = function (rows, pal) {
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch !== '.' && pal[ch]) this.set(x, y, pal[ch]);
    }
    return this;
  };
  Img.prototype.outline = function (c) {
    const src = this.d.slice();
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (src[(y * T + x) * 4 + 3]) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const xx = x + dx, yy = y + dy;
        return xx >= 0 && yy >= 0 && xx < T && yy < T && src[(yy * T + xx) * 4 + 3] > 0;
      });
      if (n) this.set(x, y, c);
    }
    return this;
  };
  Img.prototype.toCanvas = function () {
    const c = document.createElement('canvas'); c.width = c.height = T;
    c.getContext('2d').putImageData(new ImageData(this.d, T, T), 0, 0);
    return c;
  };

  function add(name, img) {
    const i = next++;
    TEX[name] = i;
    actx.putImageData(new ImageData(img.d, T, T), (i % COLS) * T, ((i / COLS) | 0) * T);
    return i;
  }
  let seedCounter = 1;
  const I = () => new Img(seedCounter++);

  // ---------- reusable block painters
  function stoneLike(c, v, cracks) {
    const m = I().fill(c, v || 0.16);
    m.blobs(mul(c, 0.82), cracks || 5, 3, 0.1).blobs(mul(c, 1.12), 4, 2, 0.08);
    return m;
  }
  function ore(base, oc, hi) {
    const m = stoneLike(base);
    for (let k = 0; k < 5; k++) {
      const cx = 2 + ((m.r() * 12) | 0), cy = 2 + ((m.r() * 12) | 0);
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(() => m.r() < 0.85);
      pts.forEach(([dx, dy]) => m.set(cx + dx, cy + dy, mul(oc, 0.85 + m.r() * 0.3)));
      m.set(cx, cy, hi || mul(oc, 1.3));
      m.set(cx - 1, cy + 1, mul(base, 0.6));
    }
    return m;
  }
  function planks(c) {
    const m = I().fill(c, 0.08);
    for (let y = 0; y < T; y++) {
      const row = y % 4;
      for (let x = 0; x < T; x++) {
        if (row === 3) m.set(x, y, mul(c, 0.62));
        else if (m.r() < 0.12) m.set(x, y, mul(c, 0.85));
      }
      if (row !== 3) { const sx = ((y >> 2) * 7 + 3) % T; m.set(sx, y, mul(c, 0.6)); }
    }
    return m;
  }
  function logSide(c, dark) {
    const m = I().fill(c, 0.1);
    for (let x = 0; x < T; x++) {
      const stripe = m.r() < 0.35;
      for (let y = 0; y < T; y++) if (stripe && m.r() < 0.7) m.set(x, y, mul(c, dark || 0.72));
    }
    return m;
  }
  function birchSide() {
    const m = I().fill(hex(0xd8d6cc), 0.06);
    for (let k = 0; k < 9; k++) {
      const y = (m.r() * T) | 0, x = (m.r() * 12) | 0, w = 2 + ((m.r() * 4) | 0);
      m.rect(x, y, w, 1, hex(0x2e2c28), 0.2);
    }
    return m;
  }
  function logTop(bark, wood) {
    const m = I().fill(wood, 0.06);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (d > 6.5) m.set(x, y, mul(bark, 1 + (m.r() - 0.5) * 0.15));
      else if ((d | 0) % 2 === 0) m.set(x, y, mul(wood, 0.84));
    }
    return m;
  }
  function leaves(c, holes) {
    const m = I();
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (m.r() < (holes || 0.2)) continue;
      m.set(x, y, mul(c, 0.7 + m.r() * 0.55));
    }
    return m;
  }
  function wool(c) {
    const m = I().fill(c, 0.07);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x + y * 3) % 5 === 0) m.set(x, y, mul(c, 0.9));
    return m;
  }
  function plant(fn) { const m = I(); fn(m); return m; }
  function bricks(c, mortar) {
    const m = I().fill(mortar, 0.06);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -1; bx < 2; bx++) {
        const x0 = bx * 8 + off;
        m.rect(Math.max(0, x0), row * 4, Math.min(7, x0 + 7) - Math.max(0, x0) + (x0 + 7 > 15 ? 0 : 0), 3, mul(c, 0.95 + m.r() * 0.1), 0.12);
      }
    }
    return m;
  }
  function stoneBricks(c) {
    const m = I().fill(mul(c, 0.7), 0.05);
    for (let row = 0; row < 2; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -1; bx < 2; bx++) {
        const x0 = bx * 8 + off;
        for (let y = row * 8; y < row * 8 + 7; y++) for (let x = Math.max(0, x0); x < Math.min(16, x0 + 7); x++)
          m.set(x, y, mul(c, (y === row * 8 ? 1.12 : 1) * (1 + (m.r() - 0.5) * 0.12)));
      }
    }
    return m;
  }
  function cobble(c) {
    const m = I().fill(mul(c, 0.55), 0.1);
    const pts = [];
    for (let k = 0; k < 11; k++) pts.push([m.r() * 16, m.r() * 16, 0.8 + m.r() * 0.45]);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let best = 1e9, second = 1e9, bi = 0;
      pts.forEach((p, i) => {
        for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
          const d = (x - p[0] - ox) ** 2 + (y - p[1] - oy) ** 2;
          if (d < best) { second = best; best = d; bi = i; } else if (d < second) second = d;
        }
      });
      if (Math.sqrt(second) - Math.sqrt(best) > 1.1) m.set(x, y, mul(c, pts[bi][2] * (1 + (m.r() - 0.5) * 0.15) * (x + y < 10 ? 1.05 : 1)));
    }
    return m;
  }
  function terracotta(c) { return I().fill(c, 0.08).specks(mul(c, 0.9), 20); }
  function metalBlock(c) {
    const m = I().fill(c, 0.05);
    m.border(mul(c, 0.7));
    for (let i = 1; i < 15; i++) { m.set(i, 1, mul(c, 1.25)); m.set(1, i, mul(c, 1.2)); }
    m.rect(4, 4, 3, 2, mul(c, 1.2));
    return m;
  }
  function gemBlock(c) {
    const m = I().fill(c, 0.08);
    m.border(mul(c, 0.65));
    for (let k = 0; k < 6; k++) { const x = 2 + ((m.r() * 11) | 0), y = 2 + ((m.r() * 11) | 0); m.set(x, y, mul(c, 1.4)); m.set(x + 1, y + 1, mul(c, 0.75)); }
    return m;
  }
  function crop(stage) {
    return plant(m => {
      const h = 4 + stage * 3;
      for (let k = 0; k < 6; k++) {
        const x = 1 + k * 2 + ((m.r() * 2) | 0);
        for (let y = 15; y > 15 - h; y--) m.set(x, y, stage === 3 ? hex(0xb89a3a) : mix(hex(0x4e8a2e), hex(0x8aa83a), stage / 3));
        if (stage === 3) { m.set(x - 1, 16 - h, hex(0xd6b75a)); m.set(x, 15 - h, hex(0xe0c46a)); m.set(x + 1, 17 - h, hex(0xc8a848)); }
      }
    });
  }
  function flower(stem, petal, center) {
    return plant(m => {
      for (let y = 8; y < 16; y++) m.set(7, y, stem);
      m.set(6, 12, stem); m.set(5, 11, stem); m.set(8, 13, stem); m.set(9, 12, stem);
      [[7, 4], [6, 5], [8, 5], [7, 6], [6, 6], [8, 6], [7, 7], [5, 5], [9, 5]].forEach(([x, y]) => m.set(x, y, mul(petal, 0.85 + m.r() * 0.3)));
      m.set(7, 5, center);
    });
  }

  // ---------- block tiles
  const STONE = hex(0x7d7d7d), DIRT = hex(0x86603e);
  add('stone', stoneLike(STONE));
  add('dirt', I().fill(DIRT, 0.18).blobs(mul(DIRT, 0.8), 6, 2).specks(hex(0x6e6e66), 6));
  add('grass_top', I().fill(hex(0x74ad44), 0.16).specks(hex(0x8cc45a), 25).specks(hex(0x5e9436), 25));
  (function () {
    const m = I().fill(DIRT, 0.18).blobs(mul(DIRT, 0.8), 5, 2);
    for (let x = 0; x < T; x++) { const h = 3 + ((m.r() * 3) | 0); for (let y = 0; y < h; y++) m.set(x, y, mul(hex(0x6a9a3e), 0.85 + m.r() * 0.3)); }
    add('grass_side', m);
  })();
  add('cobble', cobble(hex(0x8a8a8a)));
  add('oak_planks', planks(hex(0xa5814f)));
  add('bedrock', I().fill(hex(0x4a4a4a), 0.5).blobs(hex(0x222222), 8, 3).blobs(hex(0x8a8a8a), 5, 2));
  add('sand', I().fill(hex(0xdccf9e), 0.1).specks(hex(0xc4b582), 30).specks(hex(0xeee3b6), 20));
  add('gravel', cobble(hex(0x8a807a)).specks(hex(0x6a625e), 20));
  add('oak_log', logSide(hex(0x6b5333)));
  add('oak_log_top', logTop(hex(0x6b5333), hex(0xb08d57)));
  add('oak_leaves', leaves(hex(0x6aa040)));
  (function () {
    const m = I().clear();
    m.border(hex(0xc8e0e8));
    for (let i = 0; i < 4; i++) { m.set(3 + i, 3 + i - 1, hex(0xf0fbff)); m.set(9 + i, 9 + i - 1, hex(0xf0fbff)); }
    add('glass', m);
  })();
  add('coal_ore', ore(STONE, hex(0x262626), hex(0x444444)));
  add('iron_ore', ore(STONE, hex(0xd0a88a), hex(0xe8c8b0)));
  add('gold_ore', ore(STONE, hex(0xf2d040), hex(0xfff2a0)));
  add('diamond_ore', ore(STONE, hex(0x5ce0d8), hex(0xc8fff8)));
  add('copper_ore', ore(STONE, hex(0xd0763c), hex(0x5cc0a0)));
  add('lapis_ore', ore(STONE, hex(0x2848b0), hex(0x5878e0)));
  add('cinnabar_ore', ore(STONE, hex(0xc01818), hex(0xff5040)));
  add('emerald_ore', ore(STONE, hex(0x20c060), hex(0x90ffb0)));
  add('water', I().fill(hex(0xb0c8f0), 0.1).specks(hex(0xd8e8ff), 14));
  add('lava', I().fill(hex(0xd85a10), 0.18).blobs(hex(0xffb030), 7, 3).blobs(hex(0xa83a08), 4, 2));
  add('birch_log', birchSide());
  add('birch_log_top', logTop(hex(0xd8d6cc), hex(0xc8b27a)));
  add('birch_leaves', leaves(hex(0x80a755)));
  add('spruce_log', logSide(hex(0x3e2c1a), 0.75));
  add('spruce_log_top', logTop(hex(0x3e2c1a), hex(0x7a5a36)));
  add('spruce_leaves', leaves(hex(0x3d5e3d), 0.15));
  add('jungle_log', logSide(hex(0x5a4a22), 0.7).specks(hex(0x6a8a30), 10));
  add('jungle_log_top', logTop(hex(0x5a4a22), hex(0xb08860)));
  add('jungle_leaves', leaves(hex(0x60a838), 0.12));
  add('acacia_log', logSide(hex(0x676157), 0.8));
  add('acacia_log_top', logTop(hex(0x676157), hex(0xb0603a)));
  add('acacia_leaves', leaves(hex(0x7aa040), 0.22));
  add('dark_oak_log', logSide(hex(0x3c2a14), 0.7));
  add('dark_oak_log_top', logTop(hex(0x3c2a14), hex(0x5a4024)));
  add('dark_oak_leaves', leaves(hex(0x5a8a38), 0.14));
  add('birch_planks', planks(hex(0xc8b67c)));
  add('spruce_planks', planks(hex(0x735536)));
  add('jungle_planks', planks(hex(0xa77554)));
  add('acacia_planks', planks(hex(0xb05e32)));
  add('dark_oak_planks', planks(hex(0x4a3218)));
  add('sandstone_top', I().fill(hex(0xd8cb98), 0.06));
  (function () {
    const m = I().fill(hex(0xd8cb98), 0.06);
    for (let x = 0; x < T; x++) { m.set(x, 3, hex(0xc4b47e)); m.set(x, 4, hex(0xe6daa8)); m.set(x, 11, hex(0xc4b47e)); }
    add('sandstone_side', m);
  })();
  add('sandstone_bottom', I().fill(hex(0xcfc08a), 0.12).specks(hex(0xb8a874), 20));
  add('snow', I().fill(hex(0xf4fafc), 0.04).specks(hex(0xdde8ee), 15));
  (function () {
    const m = I().fill(DIRT, 0.18).blobs(mul(DIRT, 0.8), 5, 2);
    for (let x = 0; x < T; x++) { const h = 3 + ((m.r() * 4) | 0); for (let y = 0; y < h; y++) m.set(x, y, mul(hex(0xf4fafc), 0.95 + m.r() * 0.05)); }
    add('snow_grass_side', m);
  })();
  (function () {
    const m = I().fill(hex(0x8eb4f4), 0.06);
    for (let i = 0; i < 5; i++) m.set(10 + i, 2 + i, hex(0xd0e4ff));
    add('ice', m);
  })();
  add('packed_ice', I().fill(hex(0x8aaee8), 0.1).specks(hex(0xb0ccf8), 20));
  add('clay', I().fill(hex(0xa0a6b4), 0.08).specks(hex(0x8a90a0), 20));
  add('terracotta', terracotta(hex(0x985e44)));
  add('red_sand', I().fill(hex(0xbe6621), 0.1).specks(hex(0xa45218), 30).specks(hex(0xd88040), 20));
  add('terracotta_orange', terracotta(hex(0xa05426)));
  add('terracotta_yellow', terracotta(hex(0xba8524)));
  add('terracotta_brown', terracotta(hex(0x4e3424)));
  add('terracotta_white', terracotta(hex(0xd2b2a2)));
  add('terracotta_red', terracotta(hex(0x8e3c2e)));
  (function () {
    const m = I().fill(hex(0x5a8a2c), 0.08);
    for (let y = 0; y < T; y++) { m.set(0, y, hex(0x3a6418)); m.set(15, y, hex(0x3a6418)); if (y % 4 === 1) { m.set(3, y, hex(0xd8d8a0)); m.set(12, y + 2, hex(0xd8d8a0)); } }
    for (let y = 0; y < T; y += 2) { m.set(6, y, hex(0x4a7a20)); m.set(9, y + 1, hex(0x4a7a20)); }
    add('cactus_side', m);
  })();
  add('cactus_top', I().fill(hex(0x6a9a34), 0.08).border(hex(0x3a6418)));
  add('tall_grass', plant(m => {
    for (let k = 0; k < 9; k++) {
      const x = 1 + ((m.r() * 14) | 0), h = 6 + ((m.r() * 9) | 0), lean = m.r() < 0.5 ? -1 : 1;
      for (let y = 0; y < h; y++) m.set(x + (y > h * 0.6 ? lean : 0), 15 - y, mul(hex(0x74ad44), 0.75 + m.r() * 0.4));
    }
  }));
  add('dandelion', flower(hex(0x4e8a2e), hex(0xf6e030), hex(0xe0a020)));
  add('poppy', flower(hex(0x4e8a2e), hex(0xd82020), hex(0x2a1a10)));
  add('blue_orchid', flower(hex(0x4e8a2e), hex(0x30a8e8), hex(0x9adcff)));
  add('cornflower', flower(hex(0x4e8a2e), hex(0x4060e0), hex(0x203080)));
  add('dead_bush', plant(m => {
    const c = hex(0x8a6a3a);
    for (let y = 9; y < 16; y++) m.set(7, y, c);
    [[6, 8], [5, 7], [4, 6], [8, 9], [9, 8], [10, 7], [11, 5], [3, 5], [8, 6], [8, 5], [9, 4], [6, 4], [5, 3]].forEach(([x, y]) => m.set(x, y, mul(c, 0.8 + m.r() * 0.3)));
  }));
  add('red_mushroom', plant(m => {
    m.rect(7, 10, 2, 6, hex(0xe0dccc));
    m.rect(4, 6, 8, 4, hex(0xd02828), 0.1);
    m.rect(5, 5, 6, 1, hex(0xd02828));
    m.set(5, 7, hex(0xffffff)); m.set(9, 6, hex(0xffffff)); m.set(10, 8, hex(0xffffff));
  }));
  add('brown_mushroom', plant(m => {
    m.rect(7, 11, 2, 5, hex(0xd8d0c0));
    m.rect(4, 8, 8, 3, hex(0x9a7656), 0.1);
    m.rect(5, 7, 6, 1, hex(0xa88464));
  }));
  add('sugar_cane', plant(m => {
    [3, 8, 12].forEach(x => {
      for (let y = 0; y < 16; y++) m.set(x, y, y % 5 === 0 ? hex(0x8ab05a) : mul(hex(0x9cd06c), 0.85 + m.r() * 0.3));
      m.set(x + 1, 3, hex(0x7ab04a)); m.set(x - 1, 9, hex(0x7ab04a));
    });
  }));
  add('fern', plant(m => {
    for (let y = 2; y < 16; y++) {
      m.set(7, y, hex(0x6a9a40));
      if (y % 2 === 0) { const w = Math.min(5, (16 - y) >> 1); for (let i = 1; i <= w; i++) { m.set(7 - i, y - (i >> 1), mul(hex(0x7aa850), 0.8 + m.r() * 0.3)); m.set(7 + i, y - (i >> 1), mul(hex(0x7aa850), 0.8 + m.r() * 0.3)); } }
    }
  }));
  add('mushroom_red_block', I().fill(hex(0xc02828), 0.1).blobs(hex(0xf0e8e0), 6, 2, 0.05));
  add('mushroom_stem', I().fill(hex(0xd8d2c0), 0.08).specks(hex(0xc0b8a4), 20));
  add('mycelium_top', I().fill(hex(0x7a6670), 0.14).specks(hex(0x9a8a94), 30).specks(hex(0x5e4e58), 20));
  (function () {
    const m = I().fill(DIRT, 0.18);
    for (let x = 0; x < T; x++) { const h = 2 + ((m.r() * 3) | 0); for (let y = 0; y < h; y++) m.set(x, y, mul(hex(0x7a6670), 0.85 + m.r() * 0.3)); }
    add('mycelium_side', m);
  })();
  add('podzol_top', I().fill(hex(0x6a4a24), 0.18).specks(hex(0x8a6a34), 40).specks(hex(0x4a3418), 20));
  (function () {
    const m = I().fill(DIRT, 0.18);
    for (let x = 0; x < T; x++) { const h = 2 + ((m.r() * 3) | 0); for (let y = 0; y < h; y++) m.set(x, y, mul(hex(0x6a4a24), 0.85 + m.r() * 0.3)); }
    add('podzol_side', m);
  })();
  (function () {
    const p = planks(hex(0xa5814f));
    p.border(hex(0x5a3e20));
    p.rect(2, 2, 12, 1, hex(0x6a4a28)); p.rect(2, 13, 12, 1, hex(0x6a4a28));
    p.rect(7, 2, 1, 12, hex(0x6a4a28)); p.rect(2, 7, 12, 1, hex(0x6a4a28));
    add('crafting_top', p);
    const s = planks(hex(0xa5814f));
    s.rect(0, 0, 16, 3, hex(0x7a5a30), 0.1);
    s.rect(3, 6, 4, 6, hex(0x8a8a8a), 0.1); s.rect(4, 5, 2, 1, hex(0x6a4a28));
    s.rect(10, 5, 2, 8, hex(0x6a4a28)); s.rect(9, 5, 4, 2, hex(0x9a9a9a));
    add('crafting_side', s);
    const f = planks(hex(0xa5814f));
    f.rect(0, 0, 16, 3, hex(0x7a5a30), 0.1);
    f.rect(2, 6, 12, 1, hex(0x5a3e20)); f.rect(3, 7, 2, 7, hex(0x5a3e20)); f.rect(11, 7, 2, 7, hex(0x5a3e20));
    f.rect(6, 8, 4, 3, hex(0xb0b0b0), 0.1);
    add('crafting_front', f);
  })();
  (function () {
    const base = () => stoneLike(hex(0x7a7a7a)).border(hex(0x4a4a4a));
    const f = base(); f.rect(3, 8, 10, 6, hex(0x1a1a1a)); f.rect(3, 3, 10, 2, hex(0x5a5a5a));
    add('furnace_front', f);
    const fl = base(); fl.rect(3, 8, 10, 6, hex(0x2a1208));
    for (let k = 0; k < 14; k++) fl.set(4 + ((fl.r() * 8) | 0), 10 + ((fl.r() * 4) | 0), fl.r() < 0.5 ? hex(0xffa020) : hex(0xffe060));
    fl.rect(3, 3, 10, 2, hex(0x5a5a5a));
    add('furnace_front_lit', fl);
    add('furnace_side', base());
    add('furnace_top', stoneLike(hex(0x8a8a8a)).border(hex(0x5a5a5a)));
  })();
  (function () {
    const w = hex(0xa0742e);
    const f = planks(w); f.border(hex(0x4a3014)); f.rect(0, 6, 16, 1, hex(0x4a3014)); f.rect(7, 5, 2, 4, hex(0xd0d0d0)); f.set(7, 8, hex(0x404040));
    add('chest_front', f);
    const s = planks(w); s.border(hex(0x4a3014)); s.rect(0, 6, 16, 1, hex(0x4a3014));
    add('chest_side', s);
    add('chest_top', planks(w).border(hex(0x4a3014)));
  })();
  add('torch', plant(m => {
    for (let y = 6; y < 16; y++) m.set(7, y, mul(hex(0x8a6a3a), 0.9 + m.r() * 0.2)), m.set(8, y, mul(hex(0x6a4a22), 0.9 + m.r() * 0.2));
    m.rect(7, 4, 2, 2, hex(0xffd040)); m.set(7, 3, hex(0xfff0a0)); m.set(8, 4, hex(0xff8020));
  }));
  add('bricks', bricks(hex(0x9a4a3a), hex(0xb0a89c)));
  add('stone_bricks', stoneBricks(hex(0x7d7d7d)));
  add('mossy_cobble', cobble(hex(0x8a8a8a)).blobs(hex(0x5a7a3a), 7, 3));
  add('obsidian', I().fill(hex(0x140f20), 0.3).blobs(hex(0x3a2a5a), 6, 2).specks(hex(0x5a4a7a), 6));
  (function () {
    const s = I().fill(hex(0xd03a2a), 0.08);
    s.rect(0, 5, 16, 6, hex(0xe8e0d0), 0.05);
    s.rect(3, 7, 1, 2, hex(0x1a1a1a)); s.rect(5, 7, 3, 1, hex(0x1a1a1a)); s.rect(6, 7, 1, 3, hex(0x1a1a1a)); s.rect(9, 7, 1, 2, hex(0x1a1a1a)); s.rect(11, 7, 1, 2, hex(0x1a1a1a)); s.set(10, 8, hex(0x1a1a1a));
    s.rect(4, 0, 1, 5, hex(0xa82a1a)); s.rect(11, 0, 1, 5, hex(0xa82a1a)); s.rect(4, 11, 1, 5, hex(0xa82a1a)); s.rect(11, 11, 1, 5, hex(0xa82a1a));
    add('tnt_side', s);
    const t = I().fill(hex(0xd03a2a), 0.08); t.rect(6, 6, 4, 4, hex(0x3a3a3a)); t.set(7, 7, hex(0xc0c0c0));
    add('tnt_top', t);
    add('tnt_bottom', I().fill(hex(0xd03a2a), 0.08));
  })();
  (function () {
    const m = planks(hex(0xa5814f));
    const cols = [0x8a2a2a, 0x2a4a8a, 0x2a7a3a, 0x8a6a2a, 0x5a2a6a, 0x2a6a6a];
    [1, 9].forEach(y0 => {
      m.rect(0, y0, 16, 6, hex(0x3a2a18));
      for (let x = 1; x < 15;) { const w = 1 + ((m.r() * 2) | 0), h = 4 + ((m.r() * 2) | 0); m.rect(x, y0 + 6 - h, w, h, hex(cols[(m.r() * cols.length) | 0]), 0.1); x += w + (m.r() < 0.2 ? 1 : 0); }
    });
    add('bookshelf', m);
  })();
  const WOOL = { white: 0xeaeaea, orange: 0xe8762a, magenta: 0xb84ab8, light_blue: 0x4aaad8, yellow: 0xf4ce2e, lime: 0x72bc22, pink: 0xec90ae, gray: 0x40464a, light_gray: 0x9a9a94, cyan: 0x168a92, purple: 0x7a2aaa, blue: 0x34389a, brown: 0x725034, green: 0x546c1c, red: 0xa42424, black: 0x16161a };
  Object.keys(WOOL).forEach(k => add('wool_' + k, wool(hex(WOOL[k]))));
  (function () {
    const m = I().fill(hex(0x6a4a2c), 0.1);
    for (let y = 0; y < T; y += 3) for (let x = 0; x < T; x++) m.set(x, y, hex(0x4a3018));
    add('farmland', m);
    const w = I().fill(hex(0x4a3018), 0.1);
    for (let y = 0; y < T; y += 3) for (let x = 0; x < T; x++) w.set(x, y, hex(0x2e1c0c));
    add('farmland_wet', w);
  })();
  for (let s = 0; s < 4; s++) add('wheat_' + s, crop(s));
  (function () {
    const m = I().fill(hex(0xd88a1e), 0.08);
    for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) m.set(x, y, hex(0xb86a0e));
    add('pumpkin_side', m);
    const t = I().fill(hex(0xd88a1e), 0.08); t.rect(6, 6, 4, 4, hex(0x6a7a2a)); t.rect(7, 7, 2, 2, hex(0x4a5a1a));
    add('pumpkin_top', t);
    const f = I().fill(hex(0xd88a1e), 0.08);
    for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) f.set(x, y, hex(0xb86a0e));
    f.rect(3, 4, 3, 3, hex(0xffd040)); f.rect(10, 4, 3, 3, hex(0xffd040)); f.rect(4, 10, 8, 2, hex(0xffd040)); f.rect(6, 12, 2, 1, hex(0xffd040)); f.rect(9, 9, 1, 1, hex(0xffd040));
    add('pumpkin_face', f);
  })();
  (function () {
    const m = I().fill(hex(0x6a9a2a), 0.1);
    for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (m.r() < 0.8) m.set(x, y, hex(0x3a6a14));
    add('melon_side', m);
    add('melon_top', I().fill(hex(0x6a9a2a), 0.12).specks(hex(0x3a6a14), 40));
  })();
  (function () {
    const m = I().fill(hex(0xc8a830), 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (m.r() < 0.25) m.set(x, y, hex(0xa88818));
    m.rect(0, 2, 16, 1, hex(0x7a4a1a)); m.rect(0, 13, 16, 1, hex(0x7a4a1a));
    add('hay_side', m);
    const t = I().fill(hex(0xc8a830), 0.15); t.border(hex(0x9a7a18));
    add('hay_top', t);
  })();
  add('block_coal', gemBlock(hex(0x1c1c1c)));
  add('block_iron', metalBlock(hex(0xd8d8d8)));
  add('block_gold', metalBlock(hex(0xf4d23e)));
  add('block_diamond', gemBlock(hex(0x62e8de)));
  add('block_emerald', gemBlock(hex(0x2acc66)));
  add('block_lapis', gemBlock(hex(0x2448a8)));
  add('block_copper', metalBlock(hex(0xc8704a)));
  add('block_cinnabar', gemBlock(hex(0xb01414)));
  (function () {
    const t = I().fill(hex(0xb02a2a), 0.08); t.rect(0, 0, 16, 5, hex(0xeeeeee), 0.04); t.rect(0, 5, 16, 1, hex(0x8a1a1a));
    add('bed_top', t);
    const s = I().fill(hex(0xa5814f), 0.08); s.rect(0, 0, 16, 8, hex(0xb02a2a), 0.08); s.rect(0, 0, 5, 8, hex(0xeeeeee), 0.04);
    add('bed_side', s);
  })();
  (function () {
    const m = I().fill(hex(0xe8c068), 0.1); m.border(hex(0x7a5a2a));
    m.rect(4, 4, 8, 8, hex(0xfff0b0), 0.06); m.rect(6, 6, 4, 4, hex(0xffffe8));
    add('lamp', m);
  })();
  add('andesite', stoneLike(hex(0x888a88), 0.22).specks(hex(0x6a6c6a), 30));
  add('diorite', I().fill(hex(0xc4c4c4), 0.1).specks(hex(0x8a8a8a), 40).specks(hex(0xf0f0f0), 20));
  add('granite', I().fill(hex(0x9a6a56), 0.12).specks(hex(0x7a4a3a), 35).specks(hex(0xc89a88), 25));
  add('slate', I().fill(hex(0x4a4a50), 0.14).blobs(hex(0x3a3a40), 6, 3));
  add('slate_ore_diamond', ore(hex(0x4a4a50), hex(0x5ce0d8), hex(0xc8fff8)));
  add('tuff', I().fill(hex(0x6a6a5e), 0.15).specks(hex(0x8a8a7a), 30));
  add('calcite', I().fill(hex(0xdcdcd6), 0.06).specks(hex(0xc4c4be), 15));
  add('moss', I().fill(hex(0x5a7a2e), 0.16).specks(hex(0x7a9a3e), 30));
  add('coarse_dirt', I().fill(hex(0x77553a), 0.22).specks(hex(0x5a4030), 40).specks(hex(0x8a8a80), 10));
  add('mud', I().fill(hex(0x3c3a3a), 0.14).specks(hex(0x2c2a2a), 30));
  add('smooth_stone', I().fill(hex(0x9e9e9e), 0.04).border(hex(0x7a7a7a)));
  (function () {
    const m = I().fill(hex(0xd8cb98), 0.05); m.border(hex(0xc0b07e));
    m.rect(1, 7, 14, 1, hex(0xc0b07e));
    add('cut_sandstone', m);
  })();
  add('grass_path', I().fill(hex(0x9a7a44), 0.12).specks(hex(0x8a6a34), 30));
  add('ladder', plant(m => {
    m.rect(2, 0, 2, 16, hex(0x8a6a3a), 0.1); m.rect(12, 0, 2, 16, hex(0x8a6a3a), 0.1);
    [2, 6, 10, 14].forEach(y => m.rect(4, y, 8, 2, hex(0xa07e48), 0.1));
  }));
  (function () {
    const m = I().fill(hex(0xd0a050), 0.08);
    for (let i = 0; i < 16; i += 4) { m.rect(0, i, 16, 1, hex(0xa07830)); }
    m.border(hex(0x7a5a20));
    add('barrel_side', m);
    const t = planks(hex(0xa07830)); t.border(hex(0x6a4a18)); t.rect(6, 6, 4, 4, hex(0x5a3a10));
    add('barrel_top', t);
  })();
  add('snow_block_side', I().fill(hex(0xf0f6f8), 0.05));

  // ---------- Cinderdeep & Hollow tiles
  add('ashrock', I().fill(hex(0x6e3a3a), 0.22).blobs(hex(0x4e2626), 7, 2).specks(hex(0x8e5050), 18));
  add('ember_ore', ore(hex(0x6e3a3a), hex(0xff8a3a), hex(0xffe0a0)));
  add('cinder_gold_ore', ore(hex(0x6e3a3a), hex(0xf2d040), hex(0xfff2a0)));
  add('duskiron_ore', (function () { const m = I().fill(hex(0x4a3a44), 0.2); for (let k = 0; k < 6; k++) { const x = 2 + ((m.r() * 11) | 0), y = 2 + ((m.r() * 11) | 0); m.rect(x, y, 2, 2, hex(0x8a80a8)); m.set(x, y, hex(0xc0b8e0)); } for (let i = 0; i < 16; i += 4) m.rect(0, i, 16, 1, hex(0x3a2a34)); return m; })());
  add('gloomsand', I().fill(hex(0x4e3c30), 0.18).specks(hex(0x2e221a), 30).blobs(hex(0x6a5444), 4, 2));
  add('sunstone', I().fill(hex(0xc89a40), 0.2).blobs(hex(0xffe090), 8, 2).blobs(hex(0x8a5a20), 4, 2));
  add('basalt_side', (function () { const m = I().fill(hex(0x4a4a50), 0.12); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (m.r() < 0.7) m.set(x, y, hex(0x34343a)); return m; })());
  add('basalt_top', I().fill(hex(0x4a4a50), 0.1).border(hex(0x34343a)));
  add('scorch_block', I().fill(hex(0x5a1a0a), 0.2).blobs(hex(0xff6a10), 6, 2).blobs(hex(0xffb030), 3, 1));
  add('emberwood_stem', logSide(hex(0x8a2a2a), 0.6).specks(hex(0xff8a3a), 10));
  add('emberwood_top', logTop(hex(0x8a2a2a), hex(0xb0503a)));
  add('emberwood_planks', planks(hex(0x9a3a3a)));
  add('ember_cap', I().fill(hex(0xa01c1c), 0.18).blobs(hex(0xd03a2a), 5, 2).specks(hex(0x6a0a0a), 20));
  add('glowshroom', plant(m => { m.rect(7, 9, 2, 7, hex(0x8a6a8a)); m.rect(4, 5, 8, 4, hex(0x60e0d0), 0.15); m.rect(5, 4, 6, 1, hex(0x90fff0)); m.set(6, 6, hex(0xffffff)); }));
  add('cinder_bricks', bricks(hex(0x3a1414), hex(0x1e0a0a)));
  add('ash_soil_top', I().fill(hex(0x7a2a5a), 0.2).specks(hex(0xa04a7a), 30));
  add('ash_soil_side', (function () { const m = I().fill(hex(0x6e3a3a), 0.22); for (let x = 0; x < T; x++) { const h = 2 + ((m.r() * 3) | 0); for (let y = 0; y < h; y++) m.set(x, y, mul(hex(0x7a2a5a), 0.85 + m.r() * 0.3)); } return m; })());
  add('ember_gate', (function () { const m = I(); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const v = Math.sin(x * 0.8 + y * 0.5) * 0.5 + 0.5; m.set(x, y, mix(hex(0xc0204a), hex(0xff9a40), v * m.r()), 200); } return m; })());
  add('monster_cage', (function () { const m = I().clear(); m.border(hex(0x2a2a3a)); for (let i = 3; i < 16; i += 4) { m.rect(i, 0, 1, 16, hex(0x3a3a50)); m.rect(0, i, 16, 1, hex(0x3a3a50)); } m.rect(6, 6, 4, 4, hex(0x8a2020)); return m; })());
  add('voidstone', I().fill(hex(0xd8d4b0), 0.1).specks(hex(0xb8b48e), 30).blobs(hex(0xe8e4c4), 4, 2));
  add('voidstone_bricks', stoneBricks(hex(0xd8d4b0)));
  add('lumen_tile', (function () { const m = I().fill(hex(0xa07ab0), 0.06); m.border(hex(0x7a5a8a)); m.rect(3, 3, 10, 10, hex(0xb48ac4), 0.05); m.border(hex(0x7a5a8a)); m.rect(7, 0, 2, 16, hex(0x8a6a9a)); return m; })());
  add('rift_frame_side', (function () { const m = I().fill(hex(0x3a6a5a), 0.1); m.rect(0, 0, 16, 4, hex(0xd8d4b0), 0.1); m.rect(3, 8, 10, 5, hex(0x2a4a40)); return m; })());
  add('rift_frame_top', (function () { const m = I().fill(hex(0x3a6a5a), 0.08); m.border(hex(0x2a4a40)); m.rect(5, 5, 6, 6, hex(0x1a2a24)); return m; })());
  add('rift_frame_eye', (function () { const m = I().fill(hex(0x3a6a5a), 0.08); m.border(hex(0x2a4a40)); m.rect(4, 4, 8, 8, hex(0x2a8a6a)); m.rect(7, 5, 2, 6, hex(0x0a1a14)); return m; })());
  add('rift_portal', (function () { const m = I().fill(hex(0x08060e), 0.3); for (let k = 0; k < 18; k++) m.set((m.r() * 16) | 0, (m.r() * 16) | 0, m.r() < 0.5 ? hex(0x6a4ac0) : hex(0x40a080)); return m; })());
  add('drift_bloom', plant(m => { for (let y = 3; y < 16; y++) m.set(7 + (y % 4 === 0 ? 1 : 0), y, hex(0x7a5a9a)); [[5, 6], [10, 9], [4, 11]].forEach(([x, y]) => { m.rect(x, y, 3, 3, hex(0xc090e0)); m.set(x + 1, y + 1, hex(0xf0d0ff)); }); m.rect(6, 1, 4, 3, hex(0xd8a8f0)); }));
  add('hollow_lantern', plant(m => { m.rect(7, 0, 2, 16, hex(0xf8f4ff)); m.rect(6, 14, 4, 2, hex(0x8a6a9a)); }));
  add('stair_dummy', I().fill(hex(0x888888), 0.1));
  add('mossy_stone_bricks', stoneBricks(hex(0x7d7d7d)).blobs(hex(0x5a7a3a), 6, 2));
  add('cracked_stone_bricks', stoneBricks(hex(0x7d7d7d)).specks(hex(0x3a3a3a), 25));
  add('chiseled_sandstone', (function () { const m = I().fill(hex(0xd8cb98), 0.05); m.border(hex(0xc0b07e)); m.rect(4, 4, 8, 8, hex(0xc0b07e)); m.rect(6, 6, 4, 4, hex(0xe6daa8)); return m; })());
  add('hay_path', I().fill(hex(0x9a7a44), 0.12));
  add('bell', (function () { const m = I().clear(); m.rect(5, 4, 6, 8, hex(0xf4d23e), 0.08); m.rect(4, 11, 8, 2, hex(0xd8b830)); m.rect(7, 1, 2, 3, hex(0x6a4a22)); return m; })());

  [['oak', 0x4e8a2e, 0x6b5333], ['birch', 0x80a755, 0xd8d6cc], ['spruce', 0x3d5e3d, 0x3e2c1a], ['jungle', 0x50a030, 0x5a4a22], ['acacia', 0x8aa040, 0x676157], ['dark_oak', 0x3a6a20, 0x3c2a14]].forEach(([k, leaf, bark]) => add('sapling_' + k, plant(m => {
    for (let y = 9; y < 16; y++) m.set(7, y, hex(bark)), m.set(8, y, mul(hex(bark), 0.8));
    for (let k2 = 0; k2 < 34; k2++) { const a = m.r() * 6.28, r = m.r() * 5; m.set((7.5 + Math.cos(a) * r) | 0, (6 + Math.sin(a) * r * 0.9) | 0, mul(hex(leaf), 0.75 + m.r() * 0.5)); }
  })));
  // ---------- item sprites
  const ITEM = {};
  const P = (h) => hex(h);
  function sprite(name, fn) { const m = I().clear(); fn(m); ITEM[name] = m; }

  const MAT = {
    wood: [0x6a4a22, 0xa5814f, 0xc8a46a], stone: [0x505050, 0x8a8a8a, 0xb0b0b0], iron: [0x8a8a8a, 0xd8d8d8, 0xffffff],
    gold: [0xb08a10, 0xf4d23e, 0xfff4a0], diamond: [0x1a8a84, 0x4ae0d8, 0xc0fff8], copper: [0x8a4a2a, 0xd07a4a, 0xf0b090],
    leather: [0x5a3418, 0x8a5a30, 0xb07a48], chain: [0x4a4a4a, 0x9a9a9a, 0xd0d0d0], duskiron: [0x2a2238, 0x4a4260, 0x8a80a8],
  };
  const TOOLMASK = {
    pickaxe: [
      '................',
      '....dmmmmmd.....',
      '...mllllllmd....',
      '....ddddmmlmd...',
      '.........hmlm...',
      '........hh.mlm..',
      '.......hh..dlm..',
      '......hh....dlm.',
      '.....hh.....dmd.',
      '....hh.......d..',
      '...hh...........',
      '..hh............',
      '.hh.............',
      'hh..............',
      '................',
      '................'],
    sword: [
      '................',
      '.............dl.',
      '............dlm.',
      '...........dlm..',
      '..........dlm...',
      '.........dlm....',
      '........dlm.....',
      '.......dlm......',
      '......dlm.......',
      '..g..dlm........',
      '...gdlm.........',
      '....gd..........',
      '...h.gg.........',
      '..h...g.........',
      '.h..............',
      '................'],
    shovel: [
      '................',
      '...........dm...',
      '..........mllm..',
      '.........mlllld.',
      '........dmllmd..',
      '.......hddmmd...',
      '......hh..d.....',
      '.....hh.........',
      '....hh..........',
      '...hh...........',
      '..hh............',
      '.hh.............',
      'hh..............',
      '................',
      '................',
      '................'],
    axe: [
      '................',
      '........dmm.....',
      '.......mlllm....',
      '......mllllmd...',
      '......mllhhlm...',
      '.......mhhmmd...',
      '.......hh.d.....',
      '......hh........',
      '.....hh.........',
      '....hh..........',
      '...hh...........',
      '..hh............',
      '.hh.............',
      'hh..............',
      '................',
      '................'],
    hoe: [
      '................',
      '.......dmmmm....',
      '......mllllmd...',
      '.......dd.hmd...',
      '.........hh.....',
      '........hh......',
      '.......hh.......',
      '......hh........',
      '.....hh.........',
      '....hh..........',
      '...hh...........',
      '..hh............',
      '.hh.............',
      'hh..............',
      '................',
      '................'],
  };
  const ARMORMASK = {
    helmet: ['................', '................', '................', '....dmmmmmmd....', '...mllllllllm...', '...mlmmmmmmlm...', '...mm......mm...', '...md......dm...', '................'],
    chestplate: ['................', '..dmm......mmd..', '.mllm......mllm.', '.mlllmmmmmmlllm.', '.mllllllllllllm.', '.dmmlllllllldmd.', '...mllllllllm...', '...mllllllllm...', '...mllllllllm...', '...mllllllllm...', '...mllllllllm...', '...dmmmmmmmmd...'],
    leggings: ['................', '................', '...dmmmmmmmmd...', '...mllllllllm...', '...mllmmmmllm...', '...mllm..mllm...', '...mllm..mllm...', '...mllm..mllm...', '...mllm..mllm...', '...mllm..mllm...', '...mllm..mllm...', '...dmmd..dmmd...'],
    boots: ['................', '................', '................', '................', '................', '................', '...dmm....mmd...', '...mlm....mlm...', '...mlm....mlm...', '..mllm....mllm..', '.dmmmm....mmmmd.', '................'],
  };
  Object.keys(MAT).forEach(mk => {
    const c = MAT[mk];
    const pal = { d: P(c[0]), m: P(c[1]), l: P(c[2]), h: P(0x6a4a22), g: P(0x4a3014) };
    if (mk !== 'leather' && mk !== 'chain') Object.keys(TOOLMASK).forEach(tk => sprite(mk + '_' + tk, m => m.mask(TOOLMASK[tk], pal)));
    if (mk !== 'wood' && mk !== 'stone') Object.keys(ARMORMASK).forEach(ak => sprite(mk + '_' + ak, m => {
      m.mask(ARMORMASK[ak], pal);
      if (mk === 'chain') for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x + y) % 2 === 0 && m.get(x, y)[3] && m.get(x, y)[0] > 120) m.set(x, y, P(0x5a5a5a));
    }));
  });

  function lump(m, c, cx, cy, rx, ry) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (m.r() - 0.5) * 0.35;
      if (d < 1) m.set(x, y, mul(c, (x + y < cx + cy ? 1.15 : 0.9) * (0.92 + m.r() * 0.16)));
    }
  }
  function ingot(c) {
    return m => {
      for (let y = 6; y < 11; y++) for (let x = 2 + (10 - y) * 0 + (y - 6); x < 14 - (y - 6) * 0; x++) m.set(x - (y - 6) + 1, y, mul(P(c), y === 6 ? 1.3 : y === 10 ? 0.7 : 1));
      m.outline(mul(P(c), 0.5));
    };
  }
  function gem(c) {
    return m => {
      const rows = ['.....dmmd.....', '....dllmmd....', '...dlllmmmd...', '...mlmmmmmm...', '....dmmmmd....', '.....dmmd.....', '......dd......'];
      m.mask(rows.map(r => '.' + r), { d: mul(P(c), 0.55), m: P(c), l: mul(P(c), 1.4) });
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const p = m.get(x, y); if (p[3]) { m.set(x, y + 4, p); m.set(x, y, [0, 0, 0], 0); } }
      for (let y = 15; y >= 0; y--) for (let x = 0; x < T; x++) { const p = m.get(x, y); if (p[3] && y < 4) m.set(x, y, [0, 0, 0], 0); }
      m.outline(P(0x101820));
    };
  }
  function meat(c, cooked) {
    return m => {
      lump(m, P(c), 8, 8, 5.5, 4);
      for (let k = 0; k < 6; k++) m.set(5 + ((m.r() * 6) | 0), 6 + ((m.r() * 4) | 0), cooked ? mul(P(c), 0.7) : P(0xf0e0d0));
      m.rect(12, 10, 3, 2, P(0xe8e0d0)); m.set(14, 12, P(0xe8e0d0));
      m.outline(mul(P(c), 0.45));
    };
  }
  function dye(c) {
    return m => { lump(m, P(c), 8, 9, 4.5, 4.5); m.outline(mul(P(c), 0.45)); m.set(6, 7, mul(P(c), 1.4)); };
  }
  sprite('stick', m => { for (let i = 0; i < 12; i++) { m.set(2 + i, 13 - i, P(0x8a6a3a)); m.set(3 + i, 13 - i, P(0x5a4020)); } });
  sprite('coal', m => { lump(m, P(0x2a2a2a), 8, 8, 5, 4.5); m.specks(P(0x505050), 4); m.outline(P(0x0a0a0a)); });
  sprite('charcoal', m => { lump(m, P(0x3a3028), 8, 8, 5, 4.5); m.outline(P(0x140e0a)); });
  sprite('iron_ingot', ingot(0xd8d8d8));
  sprite('gold_ingot', ingot(0xf4d23e));
  sprite('copper_ingot', ingot(0xd07a4a));
  sprite('diamond', gem(0x4ae0d8));
  sprite('emerald', gem(0x2acc66));
  sprite('lapis', m => { lump(m, P(0x2848b0), 7, 8, 4, 5); lump(m, P(0x3a60d0), 10, 10, 3, 3); m.outline(P(0x101840)); });
  sprite('cinnabar', m => { for (let k = 0; k < 22; k++) { const x = 4 + ((m.r() * 8) | 0), y = 4 + ((m.r() * 8) | 0); m.set(x, y, mul(P(0xd02020), 0.8 + m.r() * 0.5)); } m.outline(P(0x400808)); });
  sprite('raw_iron', m => { lump(m, P(0xc8a088), 8, 8, 5, 4); m.specks(P(0x8a6a58), 6); m.outline(P(0x4a3a30)); });
  sprite('raw_gold', m => { lump(m, P(0xe8c040), 8, 8, 5, 4); m.specks(P(0xb08a20), 6); m.outline(P(0x5a4008)); });
  sprite('raw_copper', m => { lump(m, P(0xc8703c), 8, 8, 5, 4); m.specks(P(0x5cb090), 5); m.outline(P(0x4a2010)); });
  sprite('flint', m => { lump(m, P(0x4a4a4e), 8, 8, 4, 5.5); m.set(6, 5, P(0x8a8a8e)); m.outline(P(0x18181a)); });
  sprite('feather', m => { for (let i = 0; i < 11; i++) { m.set(3 + i, 13 - i, P(0xc8c8c8)); m.set(4 + i, 13 - i, P(0xf4f4f4)); m.set(3 + i, 12 - i, P(0xffffff)); if (i > 2) m.set(5 + i, 13 - i, P(0xe0e0e0)); } });
  sprite('string', m => { let x = 3; for (let y = 2; y < 14; y++) { x += m.r() < 0.5 ? 1 : 0; m.set(x, y, P(0xf0f0f0)); m.set(x + 1, y, P(0xc8c8c8)); } });
  sprite('bone', m => { for (let i = 0; i < 9; i++) { m.set(4 + i, 11 - i, P(0xf0ece0)); m.set(5 + i, 11 - i, P(0xd8d0c0)); } m.rect(2, 11, 3, 3, P(0xf0ece0)); m.rect(12, 2, 3, 3, P(0xf0ece0)); m.outline(P(0x7a7060)); });
  sprite('bone_meal', dye(0xf4f4ec));
  sprite('gunpowder', m => { for (let k = 0; k < 40; k++) { const a = m.r() * 6.28, r = m.r() * 5; m.set((8 + Math.cos(a) * r) | 0, (9 + Math.sin(a) * r * 0.7) | 0, mul(P(0x5a5a5a), 0.7 + m.r() * 0.6)); } });
  sprite('leather', m => { lump(m, P(0x8a5a30), 8, 8, 6, 5.5); m.rect(4, 3, 2, 2, [0, 0, 0]); m.outline(P(0x3a2010)); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (m.get(x, y)[0] === 0 && m.get(x, y)[1] === 0) m.set(x, y, [0, 0, 0], 0); });
  sprite('seeds', m => { for (let k = 0; k < 7; k++) { const x = 4 + ((m.r() * 8) | 0), y = 5 + ((m.r() * 7) | 0); m.set(x, y, P(0x6a9a3a)); m.set(x + 1, y, P(0x4a7a2a)); } });
  sprite('wheat', m => { for (let k = 0; k < 4; k++) for (let i = 0; i < 11; i++) { m.set(3 + k * 2 + (i > 6 ? 1 : 0), 14 - i, i > 6 ? P(0xd8b84a) : P(0xb89a3a)); } });
  sprite('bread', m => { lump(m, P(0xc08a3a), 8, 9, 6.5, 3.5); for (let x = 4; x < 13; x += 3) m.set(x, 8, P(0xe8b868)); m.outline(P(0x5a3a10)); });
  sprite('apple', m => { lump(m, P(0xd8262a), 8, 9, 5, 5); m.set(6, 7, P(0xff8080)); m.rect(8, 2, 1, 3, P(0x5a3a1a)); m.rect(9, 2, 2, 1, P(0x4aa02a)); m.outline(P(0x5a0a0a)); });
  sprite('golden_apple', m => { lump(m, P(0xf4d23e), 8, 9, 5, 5); m.set(6, 7, P(0xffffc0)); m.rect(8, 2, 1, 3, P(0x5a3a1a)); m.rect(9, 2, 2, 1, P(0x4aa02a)); m.outline(P(0x6a5008)); });
  sprite('porkchop', meat(0xe89090));
  sprite('cooked_porkchop', meat(0xb87850, true));
  sprite('beef', meat(0xc83838));
  sprite('steak', meat(0x7a4a2a, true));
  sprite('chicken', meat(0xf0c8b0));
  sprite('cooked_chicken', meat(0xc89050, true));
  sprite('mutton', meat(0xd05050));
  sprite('cooked_mutton', meat(0x8a5030, true));
  sprite('rotten_flesh', meat(0x7a8a4a));
  sprite('egg', m => { lump(m, P(0xf0e4c8), 8, 9, 4, 5); m.outline(P(0x8a7a5a)); });
  sprite('sugar', m => { for (let k = 0; k < 30; k++) m.set(4 + ((m.r() * 8) | 0), 6 + ((m.r() * 7) | 0), P(0xffffff)); m.outline(P(0xa0a0a0)); });
  sprite('paper', m => { m.rect(3, 3, 10, 11, P(0xf4f4ec), 0.04); m.rect(4, 6, 8, 1, P(0xc8c8c0)); m.rect(4, 9, 8, 1, P(0xc8c8c0)); m.outline(P(0x8a8a80)); });
  sprite('book', m => { m.rect(3, 3, 10, 11, P(0x7a3a1a), 0.08); m.rect(4, 4, 1, 9, P(0x5a2a10)); m.rect(12, 4, 1, 9, P(0xf0f0e8)); m.outline(P(0x2a1008)); });
  sprite('bowl', m => { for (let x = 3; x < 13; x++) { const d = Math.round(Math.sqrt(25 - (x - 7.5) ** 2)); for (let y = 8; y < 8 + d / 1.4; y++) m.set(x, y, mul(P(0x8a6a3a), 0.85 + m.r() * 0.2)); } m.rect(3, 8, 10, 1, P(0x5a4020)); m.outline(P(0x3a2810)); });
  sprite('mushroom_stew', m => { for (let x = 3; x < 13; x++) { const d = Math.round(Math.sqrt(25 - (x - 7.5) ** 2)); for (let y = 8; y < 8 + d / 1.4; y++) m.set(x, y, mul(P(0x8a6a3a), 0.85 + m.r() * 0.2)); } m.rect(4, 7, 8, 2, P(0xb08050), 0.15); m.outline(P(0x3a2810)); });
  sprite('melon_slice', m => { for (let y = 4; y < 13; y++) for (let x = 3; x < 14; x++) { if (x - 3 < (y - 4) * 1.2) m.set(x, y, x - 3 > (y - 4) * 1.2 - 2 ? P(0x4a8a2a) : P(0xe83a3a)); } m.specks(P(0x1a1a1a), 0); m.set(6, 10, P(0x1a1a1a)); m.set(9, 11, P(0x1a1a1a)); m.outline(P(0x2a3a10)); });
  sprite('pumpkin_pie', m => { lump(m, P(0xd88a3a), 8, 9, 6, 4); m.rect(4, 7, 8, 1, P(0xf0c070)); m.outline(P(0x5a3010)); });
  sprite('clay_ball', m => { lump(m, P(0xa0a6b4), 8, 9, 4.5, 4); m.outline(P(0x4a4e5a)); });
  sprite('brick', m => { m.rect(2, 6, 12, 5, P(0xa04a34), 0.1); m.rect(2, 6, 12, 1, P(0xc06a50)); m.outline(P(0x401a10)); });
  const bucket = (fill) => m => {
    for (let y = 5; y < 14; y++) { const w = 6 - ((y - 5) / 3 | 0); for (let x = 8 - w; x < 8 + w; x++) m.set(x, y, mul(P(0xc8c8c8), x < 8 ? 1.1 : 0.85)); }
    m.rect(2, 5, 12, 1, P(0x8a8a8a));
    if (fill) m.rect(3, 5, 10, 2, P(fill), 0.15);
    for (let x = 3; x < 13; x++) m.set(x, 2 + Math.round(Math.abs(x - 7.5) / 2.5), P(0x6a6a6a));
    m.outline(P(0x2a2a2a));
  };
  sprite('bucket', bucket(0));
  sprite('water_bucket', bucket(0x3a6ad8));
  sprite('lava_bucket', bucket(0xe86a10));
  sprite('milk_bucket', bucket(0xf8f8f8));
  sprite('bow', m => {
    for (let i = 0; i < 12; i++) { const a = -0.4 + i / 11 * 2.2; m.set((3 + Math.cos(a - 0.8) * 10) | 0, (13 - Math.sin(a + 0.2) * 10 + 0.5) | 0, P(0x8a5a2a)); }
    for (let i = 1; i < 14; i++) m.set(i, 14 - i, P(0xd8d8d8));
    m.rect(1, 13, 2, 2, P(0x5a3a1a)); m.rect(13, 1, 2, 2, P(0x5a3a1a));
  });
  sprite('arrow', m => { for (let i = 0; i < 10; i++) m.set(3 + i, 12 - i, P(0x8a6a3a)); m.rect(12, 2, 2, 2, P(0x9a9a9a)); m.set(14, 1, P(0xc0c0c0)); m.rect(2, 12, 2, 2, P(0xf0f0f0)); m.set(1, 14, P(0xd0d0d0)); m.set(3, 14, P(0xd0d0d0)); });
  sprite('flint_steel', m => { lump(m, P(0x4a4a4e), 6, 10, 3, 3.5); for (let i = 0; i < 6; i++) { m.set(8 + i, 7 - i, P(0xd0d0d0)); m.set(8 + i, 8 - i, P(0x8a8a8a)); } m.outline(P(0x1a1a1a)); });
  sprite('shears', m => { for (let i = 0; i < 7; i++) { m.set(5 + i, 9 - i, P(0xd8d8d8)); m.set(8 + i, 12 - i, P(0xd8d8d8)); } m.rect(2, 10, 3, 3, P(0x9a3a2a)); m.rect(6, 12, 3, 3, P(0x9a3a2a)); m.outline(P(0x2a2a2a)); });
  sprite('compass', m => { lump(m, P(0x8a8a8a), 8, 8, 5.5, 5.5); m.rect(5, 5, 6, 6, P(0xe8e8e0)); m.set(8, 6, P(0xd02020)); m.set(8, 7, P(0xd02020)); m.set(8, 9, P(0x303030)); m.outline(P(0x2a2a2a)); });
  sprite('cookie', m => { lump(m, P(0xc8884a), 8, 8, 5, 5); m.set(6, 6, P(0x3a2010)); m.set(10, 8, P(0x3a2010)); m.set(7, 10, P(0x3a2010)); m.outline(P(0x5a3010)); });
  sprite('carrot', m => { for (let i = 0; i < 9; i++) { m.set(3 + i, 12 - i, P(0xf08a20)); m.set(4 + i, 12 - i, P(0xd06a10)); } m.rect(12, 1, 2, 3, P(0x4aa02a)); m.set(11, 2, P(0x3a8a1a)); m.outline(P(0x5a2a08)); });
  sprite('potato', m => { lump(m, P(0xd8b060), 8, 9, 5, 4); m.specks(P(0xa08040), 3); m.outline(P(0x5a4018)); });
  sprite('baked_potato', m => { lump(m, P(0xc89040), 8, 9, 5, 4); m.rect(6, 7, 4, 1, P(0xf0d890)); m.outline(P(0x4a3010)); });
  sprite('snowball', m => { lump(m, P(0xf4fafc), 8, 8, 4.5, 4.5); m.outline(P(0x8aa0b0)); });
  sprite('slimeball', m => { lump(m, P(0x6ac04a), 8, 8, 4.5, 4.5); m.set(6, 6, P(0xc0ffa0)); m.outline(P(0x2a5a1a)); });
  sprite('glow_dust', m => { for (let k = 0; k < 26; k++) m.set(4 + ((m.r() * 8) | 0), 5 + ((m.r() * 7) | 0), mul(P(0xf8d860), 0.8 + m.r() * 0.4)); m.outline(P(0x6a5010)); });
  sprite('beetle_shell', m => { lump(m, P(0x3a5a8a), 8, 8, 5, 5.5); m.rect(8, 3, 1, 10, P(0x1a2a4a)); m.set(6, 6, P(0x8ab0e0)); m.outline(P(0x101828)); });
  sprite('wisp_essence', m => { lump(m, P(0xb090e8), 8, 8, 4, 4); m.set(7, 7, P(0xffffff)); m.outline(P(0x3a2a6a)); });
  sprite('ember_shard', m => { [[8, 3], [7, 4], [8, 4], [9, 5], [6, 6], [7, 6], [8, 6], [9, 7], [7, 8], [8, 8], [8, 9], [9, 10], [8, 11]].forEach(([x, y]) => m.set(x, y, mul(P(0xff8a3a), 0.8 + m.r() * 0.4))); m.set(7, 5, P(0xffe0a0)); m.outline(P(0x5a1a0a)); });
  sprite('duskiron_scrap', m => { lump(m, P(0x5a4a5a), 8, 8, 5, 4.5); m.rect(5, 7, 6, 1, P(0x8a80a8)); m.outline(P(0x1a141a)); });
  sprite('duskiron_ingot', ingot(0x5a5070));
  sprite('ember_rod', m => { for (let i = 0; i < 12; i++) { m.set(3 + i, 14 - i, P(0xffb030)); m.set(4 + i, 14 - i, P(0xd86a10)); } m.set(14, 2, P(0xffffa0)); m.outline(P(0x5a2a08)); });
  sprite('ember_dust', m => { for (let k = 0; k < 28; k++) m.set(4 + ((m.r() * 8) | 0), 6 + ((m.r() * 7) | 0), mul(P(0xff9a30), 0.7 + m.r() * 0.5)); m.outline(P(0x5a2a08)); });
  sprite('drift_pearl', m => { lump(m, P(0x4a8aa0), 8, 8, 4.5, 4.5); m.set(6, 6, P(0xc0f0ff)); m.set(7, 6, P(0x90d0e8)); m.outline(P(0x0a2a34)); });
  sprite('seeker_eye', m => { lump(m, P(0x3aa080), 8, 8, 4.5, 4.5); m.rect(7, 5, 2, 6, P(0x0a1a14)); m.set(6, 6, P(0xc0ffe0)); m.outline(P(0x0a2a20)); });
  sprite('drift_fruit', m => { lump(m, P(0xb080d0), 8, 9, 4.5, 4.5); m.set(6, 7, P(0xf0d0ff)); m.rect(8, 3, 1, 2, P(0x7a5a9a)); m.outline(P(0x3a2050)); });
  sprite('warden_heart', m => { const rows = ['..mm..mm..', '.mllmmllm.', 'mlllmmlllm', 'mllllllllm', '.mllllllm.', '..mllllm..', '...mllm...', '....mm....']; m.mask(rows.map(r => '...' + r), { m: P(0x2a8a6a), l: P(0x6ae0b0) }); for (let y = 15; y >= 0; y--) for (let x = 0; x < 16; x++) { const p = m.get(x, y); if (p[3] && y + 4 < 16) { m.set(x, y + 4, p); m.set(x, y, [0, 0, 0], 0); } } m.set(8, 8, P(0xffffff)); m.outline(P(0x0a2a20)); });
  sprite('drift_cloak', m => { m.mask(['................', '...dmmmmmmmmd...', '..mllllllllllm..', '..mlmmmmmmmmlm..', '.mllm......mllm.', '.mlm........mlm.', 'mllm........mllm', 'mlm..........mlm', 'mm............mm'].map(r => r), { d: P(0x3a2a5a), m: P(0x6a4ac0), l: P(0xa88af0) }); for (let y = 15; y >= 0; y--) for (let x = 0; x < 16; x++) { const p = m.get(x, y); if (p[3] && y + 3 < 16) { m.set(x, y + 3, p); m.set(x, y, [0, 0, 0], 0); } } });
  sprite('wraith_skull', m => { lump(m, P(0x2a2a2e), 8, 8, 5.5, 5.5); m.rect(5, 7, 2, 2, P(0xff4020)); m.rect(9, 7, 2, 2, P(0xff4020)); m.rect(6, 11, 4, 1, P(0x0a0a0a)); m.outline(P(0x0a0a0a)); });
  sprite('fire_charge', m => { lump(m, P(0x3a1a0a), 8, 8, 4.5, 4.5); m.specks(P(0xff8a20), 8); m.outline(P(0x1a0a04)); });
  sprite('name_tag', m => { m.rect(3, 6, 10, 5, P(0xd8c8a0)); m.set(4, 8, P(0x3a2a1a)); m.rect(1, 8, 2, 1, P(0x8a8a8a)); m.outline(P(0x5a4a2a)); });
  const DYES = { white: 0xf0f0f0, orange: 0xf0902a, magenta: 0xc860c8, light_blue: 0x60b8e8, yellow: 0xf8d830, lime: 0x80c830, pink: 0xf0a0c0, gray: 0x505458, light_gray: 0xa0a0a0, cyan: 0x20a0a8, purple: 0x8a3ac0, blue: 0x3a4ab0, brown: 0x7a5434, green: 0x5a7a20, red: 0xc02a2a, black: 0x202024 };
  Object.keys(DYES).forEach(k => sprite(k + '_dye', dye(DYES[k])));

  BH.TEX = TEX;
  BH.atlas = atlas;
  BH.ATLAS_COLS = COLS;
  BH.ITEM_SPRITES = ITEM;
  BH.WOOL_COLORS = Object.keys(WOOL);
  BH.hexToRgb = hex;
})();
