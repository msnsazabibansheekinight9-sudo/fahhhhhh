// Inventory model, crafting matcher, item icons/meshes, and every HUD/menu screen.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);

  // ---------- item icons
  const iconCache = {};
  function blockIcon(id) {
    const b = BH.BLOCKS[id];
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const tile = name => { const t = BH.TEX[name], N = BH.ATLAS_COLS; return [(t % N) * 16, ((t / N) | 0) * 16]; };
    if (b.cross || b.liquid && false) {
      const [sx, sy] = tile(b.tex.side); g.drawImage(BH.atlas, sx, sy, 16, 16, 0, 0, 48, 48); return c;
    }
    const top = tile(b.tex.top), side = tile(b.tex.side), front = tile(b.tex.front);
    const tintTop = b.tintTop || b.tint ? '#7fb84a' : null;
    // top face
    g.save(); g.setTransform(1.5, 0.75, -1.5, 0.75, 24, 1); g.drawImage(BH.atlas, top[0], top[1], 16, 16, 0, 0, 16, 16);
    if (tintTop && (b.tint === 'foliage' || b.tintTop)) { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8fc860'; g.fillRect(0, 0, 16, 16); }
    if (b.tint === 'water') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a8ae8'; g.fillRect(0, 0, 16, 16); }
    g.restore();
    // left face
    g.save(); g.setTransform(1.5, 0.75, 0, 1.5, 0, 13); g.drawImage(BH.atlas, front[0], front[1], 16, 16, 0, 0, 16, 16);
    if (b.tint === 'foliage') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8fc860'; g.fillRect(0, 0, 16, 16); }
    if (b.tint === 'water') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a8ae8'; g.fillRect(0, 0, 16, 16); }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, 16, 16); g.restore();
    // right face
    g.save(); g.setTransform(1.5, -0.75, 0, 1.5, 24, 25); g.drawImage(BH.atlas, side[0], side[1], 16, 16, 0, 0, 16, 16);
    if (b.tint === 'foliage') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8fc860'; g.fillRect(0, 0, 16, 16); }
    if (b.tint === 'water') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a8ae8'; g.fillRect(0, 0, 16, 16); }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, 16, 16); g.restore();
    return c;
  }
  function itemCanvas(id) {
    const it = BH.ITEMS[id];
    if (it.block !== undefined) return blockIcon(it.block);
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(BH.ITEM_SPRITES[it.icon].toCanvas(), 0, 0, 48, 48);
    return c;
  }
  function icon(id) {
    if (!iconCache[id]) iconCache[id] = itemCanvas(id).toDataURL();
    return iconCache[id];
  }

  // ---------- inventory
  function Inventory(game) {
    this.game = game;
    this.slots = new Array(36).fill(null);
    this.armor = new Array(4).fill(null);
    this.sel = 0;
    this.cursor = null;
  }
  const maxStack = id => BH.ITEMS[id].stack || 64;
  Inventory.prototype.add = function (id, n, dur) {
    const ms = maxStack(id);
    const order = [];
    for (let i = 0; i < 36; i++) order.push(i);
    if (ms > 1) for (const i of order) {
      const s = this.slots[i];
      if (s && s.id === id && s.n < ms && !s.dur) { const k = Math.min(n, ms - s.n); s.n += k; n -= k; if (!n) break; }
    }
    for (const i of order) {
      if (!n) break;
      if (!this.slots[i]) { const k = Math.min(n, ms); this.slots[i] = { id, n: k, dur: dur || 0 }; n -= k; }
    }
    this.game.ui.refresh();
    return n;
  };
  Inventory.prototype.held = function () { const s = this.slots[this.sel]; return s ? BH.ITEMS[s.id] : null; };
  Inventory.prototype.heldStack = function () { return this.slots[this.sel]; };
  Inventory.prototype.consumeHeld = function (n) {
    if (this.game.mode === 'creative') return;
    const s = this.slots[this.sel]; if (!s) return;
    s.n -= n || 1; if (s.n <= 0) this.slots[this.sel] = null;
    this.game.ui.refresh();
  };
  Inventory.prototype.replaceHeld = function (key) {
    if (this.game.mode === 'creative') return;
    const id = BH.ID[key];
    const s = this.slots[this.sel];
    if (s && s.n > 1) { s.n--; if (this.add(id, 1)) this.game.entities.dropItem(id, 1, this.game.player.pos.x, this.game.player.pos.y + 1, this.game.player.pos.z); }
    else this.slots[this.sel] = { id, n: 1, dur: 0 };
    this.game.ui.refresh();
  };
  Inventory.prototype.damageHeld = function (amt) {
    if (this.game.mode === 'creative') return;
    const s = this.slots[this.sel]; if (!s) return;
    const it = BH.ITEMS[s.id]; if (!it.dur) return;
    s.dur = (s.dur || 0) + amt;
    if (s.dur >= it.dur) { this.slots[this.sel] = null; this.game.audio.play('break_tool'); this.game.ui.toast(it.name + ' broke'); }
    this.game.ui.refresh();
  };
  Inventory.prototype.count = function (id) { let n = 0; this.slots.forEach(s => { if (s && s.id === id) n += s.n; }); return n; };
  Inventory.prototype.remove = function (id, n) {
    for (let i = 0; i < 36 && n > 0; i++) { const s = this.slots[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.slots[i] = null; } }
    this.game.ui.refresh();
  };
  Inventory.prototype.armorPoints = function () { let p = 0; this.armor.forEach(s => { if (s) p += BH.ITEMS[s.id].armor.points; }); return p; };
  Inventory.prototype.damageArmor = function (amt) {
    if (this.game.mode === 'creative') return;
    this.armor.forEach((s, i) => { if (!s) return; s.dur = (s.dur || 0) + amt; if (s.dur >= BH.ITEMS[s.id].dur) { this.armor[i] = null; this.game.ui.toast(BH.ITEMS[s.id].name + ' broke'); } });
  };

  // ---------- crafting matcher
  function keyMatches(pat, key) {
    if (!pat) return !key;
    if (!key) return false;
    if (pat[0] === '#') return BH.GROUPS[pat.slice(1)](key);
    return pat === key;
  }
  function matchRecipe(grid, w) {
    // grid: array of item keys (or null), width w
    const h = grid.length / w;
    let minx = w, miny = h, maxx = -1, maxy = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grid[y * w + x]) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    if (maxx < 0) return null;
    const tw = maxx - minx + 1, th = maxy - miny + 1;
    const cell = (x, y) => grid[(y + miny) * w + x + minx];
    const items = grid.filter(Boolean);
    for (const r of BH.RECIPES) {
      if (r.ing) {
        if (r.ing.length !== items.length) continue;
        const used = new Array(items.length).fill(false);
        const ok = r.ing.every(p => { const i = items.findIndex((k, j) => !used[j] && keyMatches(p, k)); if (i < 0) return false; used[i] = true; return true; });
        if (ok) return r;
        continue;
      }
      const rh = r.shape.length, rw = Math.max(...r.shape.map(s => s.length));
      if (rw !== tw || rh !== th) continue;
      for (const mirror of [false, true]) {
        let ok = true;
        for (let y = 0; y < th && ok; y++) for (let x = 0; x < tw && ok; x++) {
          const rx = mirror ? tw - 1 - x : x;
          const ch = (r.shape[y][rx] || ' ');
          const pat = ch === ' ' ? null : r.keys[ch];
          if (!keyMatches(pat, cell(x, y))) ok = false;
        }
        if (ok) return r;
      }
    }
    return null;
  }

  // ---------- UI
  function UI(game) {
    this.game = game;
    this.inv = game.inv;
    this.screen = null;
    this.craft = new Array(9).fill(null);
    this.craftW = 2;
    this.container = null;
    this.toastT = 0;
    this.meshCache = {};
    this.buildHUD();
  }
  UI.prototype.icon = icon;
  UI.prototype.buildHUD = function () {
    const hb = $('#hotbar');
    hb.innerHTML = '';
    for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; d.dataset.i = i; hb.appendChild(d); }
    const mk = (id, n, cls) => { const el = $(id); el.innerHTML = ''; for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = cls; el.appendChild(s); } };
    mk('#hearts', 10, 'heart'); mk('#food', 10, 'drum'); mk('#armorbar', 10, 'shield'); mk('#air', 10, 'bubble');
  };
  UI.prototype.slotHTML = function (s) {
    if (!s) return '';
    const it = BH.ITEMS[s.id];
    let h = `<img src="${icon(s.id)}" alt="">`;
    if (s.n > 1) h += `<b>${s.n}</b>`;
    if (it.dur && s.dur) { const f = 1 - s.dur / it.dur; h += `<u style="--f:${f};--c:hsl(${f * 120},90%,45%)"></u>`; }
    return h;
  };
  UI.prototype.refresh = function () {
    const g = this.game, inv = this.inv;
    document.querySelectorAll('#hotbar .slot').forEach((el, i) => { el.innerHTML = this.slotHTML(inv.slots[i]); el.classList.toggle('sel', i === inv.sel); });
    const surv = g.mode === 'survival';
    $('#stats').style.visibility = surv ? 'visible' : 'hidden';
    const p = g.player;
    const setRow = (sel, v, cls) => document.querySelectorAll(sel + ' i').forEach((el, i) => { el.className = cls + (v >= (i + 1) * 2 ? '' : v >= i * 2 + 1 ? ' half' : ' empty'); });
    setRow('#hearts', Math.ceil(p.hp), 'heart' + (p.poison > 0 ? ' poison' : ''));
    // hunger fills right-to-left
    document.querySelectorAll('#food i').forEach((el, i) => { const v = p.food; el.className = 'drum' + (v >= (i + 1) * 2 ? '' : v >= i * 2 + 1 ? ' half' : ' empty'); });
    const ap = inv.armorPoints();
    $('#armorbar').style.visibility = ap ? 'visible' : 'hidden';
    setRow('#armorbar', ap, 'shield');
    const air = Math.ceil(p.air / 15 * 20) / 2;
    $('#air').style.visibility = p.air < 15 ? 'visible' : 'hidden';
    document.querySelectorAll('#air i').forEach((el, i) => el.className = 'bubble' + (air >= i + 1 ? '' : ' empty'));
    const lvl = p.level(); $('#xpfill').style.width = (p.levelProgress() * 100) + '%'; $('#xplvl').textContent = lvl > 0 ? lvl : '';
    $('#xpbar').style.visibility = surv ? 'visible' : 'hidden';
    if (this.screen) this.renderScreen();
  };
  UI.prototype.showHeldName = function () {
    const it = this.inv.held();
    const el = $('#heldname');
    el.textContent = it ? it.name : '';
    el.style.opacity = it ? 1 : 0;
    clearTimeout(this._hn); this._hn = setTimeout(() => el.style.opacity = 0, 1800);
  };
  UI.prototype.toast = function (msg, long) {
    const el = document.createElement('div'); el.className = 'msg'; el.textContent = msg;
    $('#chat').appendChild(el);
    setTimeout(() => el.classList.add('fade'), long ? 8000 : 4000);
    setTimeout(() => el.remove(), long ? 9000 : 5000);
  };

  // ---------- 3D meshes for dropped items and the held item
  UI.prototype.blockMesh = function (id, size) {
    const b = BH.BLOCKS[id];
    const N = BH.ATLAS_COLS, ts = 1 / N;
    const g = new THREE.BoxGeometry(size, size, size);
    const uv = g.attributes.uv;
    const order = ['side', 'side', 'top', 'bottom', 'front', 'side'];
    for (let f = 0; f < 6; f++) {
      const t = BH.TEX[b.tex[order[f]]], u0 = (t % N) * ts, v0 = ((t / N) | 0) * ts;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, u0 + uv.getX(i) * ts, v0 + (1 - uv.getY(i)) * ts);
      }
    }
    const tex = this.game.world.mats.tex;
    const col = b.tint === 'foliage' || b.tintTop ? 0x9ad070 : b.tint === 'water' ? 0x5a8ae8 : 0xffffff;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, color: col, transparent: !!b.cutout, alphaTest: 0.5 }));
    return m;
  };
  UI.prototype.spriteMesh = function (id, size) {
    const it = BH.ITEMS[id];
    if (!this.meshCache['t' + id]) {
      const t = new THREE.CanvasTexture(it.block !== undefined ? BH.atlasTile(BH.BLOCKS[it.block].tex.side) : BH.ITEM_SPRITES[it.icon].toCanvas());
      t.magFilter = t.minFilter = THREE.NearestFilter;
      this.meshCache['t' + id] = t;
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: this.meshCache['t' + id], transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    return m;
  };
  UI.prototype.itemMesh = function (id) {
    const it = BH.ITEMS[id];
    if (it.block !== undefined && !BH.BLOCKS[it.block].cross) return this.blockMesh(it.block, 0.25);
    return this.spriteMesh(id, 0.4);
  };

  // ---------- screens
  UI.prototype.open = function (name, data) {
    this.screen = name;
    this.container = data || null;
    this.craftW = name === 'craft' ? 3 : 2;
    $('#screen').hidden = false;
    document.exitPointerLock && document.exitPointerLock();
    this.renderScreen();
  };
  UI.prototype.close = function () {
    if (!this.screen) return;
    const g = this.game;
    // return crafting grid & cursor to inventory
    for (let i = 0; i < 9; i++) if (this.craft[i]) { const s = this.craft[i]; const left = this.inv.add(s.id, s.n, s.dur); if (left) g.entities.dropItem(s.id, left, g.player.pos.x, g.player.pos.y + 1.2, g.player.pos.z); this.craft[i] = null; }
    if (this.inv.cursor) { const s = this.inv.cursor; const left = this.inv.add(s.id, s.n, s.dur); if (left) g.entities.dropItem(s.id, left, g.player.pos.x, g.player.pos.y + 1.2, g.player.pos.z); this.inv.cursor = null; }
    this.screen = null; this.container = null;
    $('#screen').hidden = true;
    $('#tooltip').hidden = true;
    this.refresh();
    g.lockPointer();
  };

  // Slot references: {list, i} where list is an array we can mutate.
  UI.prototype.renderScreen = function () {
    const panel = $('#panel');
    const g = this.game, inv = this.inv;
    const S = (list, i, extra) => `<div class="slot ${extra || ''}" data-l="${list}" data-i="${i}">${this.slotHTML(this.listRef(list)[i])}</div>`;
    let h = '';
    const invGrid = () => {
      let s = '<div class="grid9">';
      for (let i = 9; i < 36; i++) s += S('inv', i);
      s += '</div><div class="grid9 hotrow">';
      for (let i = 0; i < 9; i++) s += S('inv', i);
      return s + '</div>';
    };
    const craftOut = () => {
      const r = this.currentRecipe();
      const out = r ? { id: BH.ID[r.out], n: r.n } : null;
      return `<div class="slot big out" data-l="craftout" data-i="0">${this.slotHTML(out)}</div>`;
    };
    if (this.screen === 'inv' && g.mode === 'creative') { this.renderCreative(); return; }
    if (this.screen === 'inv') {
      h += '<h3>Crafting</h3><div class="row top">';
      h += '<div class="armorcol">' + [0, 1, 2, 3].map(i => S('armor', i, 'armor a' + i)).join('') + '</div>';
      h += '<div class="paperdoll"><canvas id="doll" width="80" height="140"></canvas></div>';
      h += '<div class="craftbox"><div class="grid2">' + [0, 1, 3, 4].map(i => S('craft', i)).join('') + '</div><span class="arrow">➜</span>' + craftOut() + '</div>';
      h += '</div><h3>Inventory</h3>' + invGrid();
    } else if (this.screen === 'craft') {
      h += '<h3>Crafting Table</h3><div class="row top"><div class="craftbox"><div class="grid3">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => S('craft', i)).join('') + '</div><span class="arrow">➜</span>' + craftOut() + '</div></div>';
      h += '<div class="recipes"><input id="rsearch" placeholder="Search recipes…" value="' + (this.rq || '') + '"><div id="rlist"></div></div>';
      h += '<h3>Inventory</h3>' + invGrid();
    } else if (this.screen === 'furnace') {
      const f = this.container;
      const prog = f.cook / 10, burn = f.burnMax ? f.burn / f.burnMax : 0;
      h += '<h3>Furnace</h3><div class="row top furnace"><div class="fcol">' + S('furnace', 0) + `<div class="flame" style="--f:${burn}"></div>` + S('furnace', 1) + '</div>';
      h += `<div class="cookbar"><div style="width:${prog * 100}%"></div></div>` + S('furnace', 2, 'big out') + '</div>';
      h += '<h3>Inventory</h3>' + invGrid();
    } else if (this.screen === 'chest') {
      h += '<h3>' + (this.container.title || 'Chest') + '</h3><div class="grid9">';
      for (let i = 0; i < 27; i++) h += S('chest', i);
      h += '</div><h3>Inventory</h3>' + invGrid();
    } else if (this.screen === 'trade') {
      const npc = this.container;
      h += `<h3>${npc.title}</h3><div class="trades">`;
      npc.trades.forEach((t, i) => {
        const can = inv.count(BH.ID[t.give[0]]) >= t.give[1] && (!t.give2 || inv.count(BH.ID[t.give2[0]]) >= t.give2[1]);
        h += `<button class="trade ${can ? '' : 'no'}" data-t="${i}"><span class="ti"><img src="${icon(BH.ID[t.give[0]])}"><b>${t.give[1]}</b></span>${t.give2 ? `<span class="ti"><img src="${icon(BH.ID[t.give2[0]])}"><b>${t.give2[1]}</b></span>` : ''}<span class="arrow">➜</span><span class="ti"><img src="${icon(BH.ID[t.get[0]])}"><b>${t.get[1]}</b></span><em>${BH.itemByKey(t.get[0]).name}</em></button>`;
      });
      h += '</div><h3>Inventory</h3>' + invGrid();
    }
    panel.innerHTML = h;
    panel.className = 'panel ' + this.screen;
    if (this.screen === 'craft') this.renderRecipeList();
    if (this.screen === 'inv') this.drawDoll();
    this.drawCursor();
  };
  UI.prototype.listRef = function (l) {
    if (l === 'inv') return this.inv.slots;
    if (l === 'armor') return this.inv.armor;
    if (l === 'craft') return this.craft;
    if (l === 'furnace') return this.container.slots;
    if (l === 'chest') return this.container.slots;
    return [];
  };
  UI.prototype.currentRecipe = function () {
    const w = this.craftW;
    const grid = [];
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const s = this.craft[y * 3 + x]; grid.push(s ? BH.ITEMS[s.id].key : null); }
    return matchRecipe(grid, w);
  };
  UI.prototype.renderRecipeList = function () {
    const q = (this.rq || '').toLowerCase();
    const el = $('#rlist'); if (!el) return;
    const seen = new Set();
    let h = '';
    BH.RECIPES.forEach((r, ri) => {
      const it = BH.itemByKey(r.out);
      if (seen.has(r.out) || !it) return;
      if (q && !it.name.toLowerCase().includes(q)) return;
      seen.add(r.out);
      const can = this.canCraftFromInv(r);
      h += `<button class="rbtn ${can ? '' : 'no'}" data-r="${ri}" title="${it.name}"><img src="${icon(it.id)}"></button>`;
    });
    el.innerHTML = h;
  };
  UI.prototype.recipeNeeds = function (r) {
    const need = [];
    if (r.ing) r.ing.forEach(p => need.push(p));
    else r.shape.forEach(row => [...row].forEach(ch => { if (ch !== ' ') need.push(r.keys[ch]); }));
    return need;
  };
  UI.prototype.canCraftFromInv = function (r) {
    if (this.screen !== 'craft' && r.shape && (r.shape.length > 2 || r.shape.some(s => s.length > 2))) return false;
    const counts = {};
    this.inv.slots.forEach(s => { if (s) { const k = BH.ITEMS[s.id].key; counts[k] = (counts[k] || 0) + s.n; } });
    this.craft.forEach(s => { if (s) { const k = BH.ITEMS[s.id].key; counts[k] = (counts[k] || 0) + s.n; } });
    for (const p of this.recipeNeeds(r)) {
      const k = Object.keys(counts).find(k2 => counts[k2] > 0 && keyMatches(p, k2));
      if (!k) return false;
      counts[k]--;
    }
    return true;
  };
  // Fill the crafting grid from the inventory for a clicked recipe.
  UI.prototype.autofill = function (r) {
    for (let i = 0; i < 9; i++) if (this.craft[i]) { this.inv.add(this.craft[i].id, this.craft[i].n, this.craft[i].dur); this.craft[i] = null; }
    if (!this.canCraftFromInv(r)) { this.refresh(); return; }
    const take = p => {
      for (let i = 0; i < 36; i++) { const s = this.inv.slots[i]; if (s && keyMatches(p, BH.ITEMS[s.id].key)) { s.n--; const id = s.id; if (!s.n) this.inv.slots[i] = null; return { id, n: 1, dur: 0 }; } }
      return null;
    };
    if (r.ing) r.ing.forEach((p, k) => { this.craft[k] = take(p); });
    else r.shape.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ' ') this.craft[y * 3 + x] = take(r.keys[ch]); }));
    this.refresh();
  };
  UI.prototype.renderCreative = function () {
    const panel = $('#panel');
    panel.className = 'panel creative';
    const q = (this.cq || '').toLowerCase();
    const tabs = [['all', 'All'], ['build', 'Building'], ['nature', 'Nature'], ['func', 'Functional'], ['tools', 'Tools & Combat'], ['food', 'Food'], ['mats', 'Materials']];
    const tab = this.ctab || 'all';
    const cat = it => {
      if (it.tool || it.armor || it.bow || it.key === 'arrow' || it.igniter) return 'tools';
      if (it.food !== undefined) return 'food';
      if (it.block !== undefined) {
        const b = BH.BLOCKS[it.block];
        if (b.interact || b.light || b.key === 'tnt' || b.key === 'ladder' || b.key.includes('portal') || b.key === 'spawner') return 'func';
        if (b.cross || b.leaves || b.log || /grass|dirt|sand|snow|ice|ore|clay|gravel|mycelium|podzol|cactus|pumpkin|melon|stone$|mud|moss/.test(b.key)) return 'nature';
        return 'build';
      }
      return 'mats';
    };
    let h = '<div class="tabs">' + tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('') + `<input id="csearch" placeholder="Search ${BH.ITEMS.filter(Boolean).length - 1} items…" value="${this.cq || ''}"></div><div class="cgrid">`;
    BH.ITEMS.forEach(it => {
      if (!it || it.id === 0) return;
      if (it.block !== undefined && BH.BLOCKS[it.block].hidden) return;
      if (it.block !== undefined && BH.BLOCKS[it.block].hardness < 0 && it.key !== 'bedrock') { if (!['water', 'lava'].includes(it.key)) return; }
      if (q && !it.name.toLowerCase().includes(q)) return;
      if (tab !== 'all' && cat(it) !== tab) return;
      h += `<div class="slot" data-l="cat" data-i="${it.id}" title="${it.name}"><img src="${icon(it.id)}"></div>`;
    });
    h += '</div><h3>Hotbar <small>(drag items here · click a hotbar slot with an empty hand to clear it)</small></h3><div class="grid9 hotrow">';
    for (let i = 0; i < 9; i++) h += `<div class="slot" data-l="inv" data-i="${i}">${this.slotHTML(this.inv.slots[i])}</div>`;
    h += '</div>';
    panel.innerHTML = h;
    this.drawCursor();
  };
  UI.prototype.drawDoll = function () {
    const c = $('#doll'); if (!c) return;
    const g = c.getContext('2d');
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 80, 140);
    // simple player figure in our own palette
    g.fillStyle = '#c89a78'; g.fillRect(28, 12, 24, 24);
    g.fillStyle = '#3a2a1a'; g.fillRect(28, 12, 24, 7);
    g.fillStyle = '#fff'; g.fillRect(32, 22, 5, 4); g.fillRect(43, 22, 5, 4); g.fillStyle = '#2a4a7a'; g.fillRect(34, 22, 3, 4); g.fillRect(45, 22, 3, 4);
    g.fillStyle = '#4a7a3a'; g.fillRect(26, 38, 28, 36);
    g.fillStyle = '#c89a78'; g.fillRect(16, 38, 10, 34); g.fillRect(54, 38, 10, 34);
    g.fillStyle = '#5a4a3a'; g.fillRect(28, 74, 11, 40); g.fillRect(41, 74, 11, 40);
    g.fillStyle = '#3a3a3a'; g.fillRect(28, 110, 11, 8); g.fillRect(41, 110, 11, 8);
    const arm = this.inv.armor;
    const col = s => { if (!s) return null; const k = BH.ITEMS[s.id].key.split('_')[0]; return { leather: '#8a5a30', chain: '#9a9a9a', iron: '#d8d8d8', gold: '#f4d23e', diamond: '#4ae0d8', copper: '#d07a4a', duskiron: '#4a4260' }[k]; };
    if (col(arm[0])) { g.fillStyle = col(arm[0]); g.fillRect(26, 10, 28, 9); g.fillRect(26, 10, 4, 22); g.fillRect(50, 10, 4, 22); }
    if (col(arm[1])) { g.fillStyle = col(arm[1]); g.fillRect(24, 38, 32, 34); g.fillRect(14, 38, 12, 14); g.fillRect(54, 38, 12, 14); }
    if (col(arm[2])) { g.fillStyle = col(arm[2]); g.fillRect(26, 72, 28, 10); g.fillRect(26, 72, 13, 34); g.fillRect(41, 72, 13, 34); }
    if (col(arm[3])) { g.fillStyle = col(arm[3]); g.fillRect(26, 106, 14, 13); g.fillRect(40, 106, 14, 13); }
  };
  UI.prototype.drawCursor = function () {
    const el = $('#cursor');
    el.innerHTML = this.slotHTML(this.inv.cursor);
    el.hidden = !this.inv.cursor;
  };

  // Click handling for every slot type.
  UI.prototype.clickSlot = function (l, i, button, shift) {
    const g = this.game, inv = this.inv;
    if (l === 'cat') {
      const id = +i, it = BH.ITEMS[id];
      if (shift) { inv.cursor = { id, n: it.stack, dur: 0 }; }
      else if (inv.cursor && inv.cursor.id === id && inv.cursor.n < it.stack) inv.cursor.n++;
      else if (inv.cursor) inv.cursor = null;
      else inv.cursor = { id, n: button === 2 ? 1 : it.stack, dur: 0 };
      this.refresh(); return;
    }
    if (l === 'craftout') {
      const r = this.currentRecipe(); if (!r) return;
      const outId = BH.ID[r.out];
      const doOne = () => {
        for (let k = 0; k < 9; k++) if (this.craft[k]) {
          const it = BH.ITEMS[this.craft[k].id];
          this.craft[k].n--;
          if (!this.craft[k].n) this.craft[k] = null;
          if (it.leaves) { if (this.craft[k]) inv.add(BH.ID[it.leaves], 1); else this.craft[k] = { id: BH.ID[it.leaves], n: 1, dur: 0 }; }
        }
        g.stats.crafted++;
      };
      if (shift) {
        let guard = 0;
        while (this.currentRecipe() === r && guard++ < 64) {
          const space = this.spaceFor(outId);
          if (space < r.n) break;
          doOne(); inv.add(outId, r.n);
        }
      } else {
        if (inv.cursor && (inv.cursor.id !== outId || inv.cursor.n + r.n > BH.ITEMS[outId].stack)) return;
        doOne();
        if (inv.cursor) inv.cursor.n += r.n; else inv.cursor = { id: outId, n: r.n, dur: 0 };
      }
      g.audio.play('craft');
      g.onCraft && g.onCraft(r.out);
      this.refresh(); return;
    }
    const list = this.listRef(l);
    let s = list[i];
    if (l === 'furnace' && +i === 2) {
      if (!s) return;
      if (shift) { const left = inv.add(s.id, s.n); if (left) s.n = left; else list[i] = null; }
      else if (!inv.cursor) { inv.cursor = s; list[i] = null; }
      else if (inv.cursor.id === s.id && inv.cursor.n + s.n <= BH.ITEMS[s.id].stack) { inv.cursor.n += s.n; list[i] = null; }
      g.player.xp += 1;
      this.refresh(); return;
    }
    if (shift) {
      if (!s) return;
      if (l === 'inv') {
        const it = BH.ITEMS[s.id];
        if (it.armor && !inv.armor[it.armor.slot] && this.screen === 'inv') { inv.armor[it.armor.slot] = s; list[i] = null; }
        else if (this.screen === 'chest') { list[i] = null; const left = this.addTo(this.container.slots, 0, 27, s); if (left) list[i] = left; }
        else if (this.screen === 'furnace') { list[i] = null; const target = BH.SMELT[it.key] ? 0 : (it.fuel || (it.block !== undefined && BH.BLOCKS[it.block].fuel)) ? 1 : -1; if (target < 0) list[i] = s; else { const left = this.addTo(this.container.slots, target, target + 1, s); if (left) list[i] = left; } }
        else { list[i] = null; const left = +i < 9 ? this.addTo(inv.slots, 9, 36, s) : this.addTo(inv.slots, 0, 9, s); if (left) list[i] = left; }
      } else { list[i] = null; const left = this.addTo(inv.slots, 0, 36, s); if (left) list[i] = left; }
      this.refresh(); return;
    }
    const c = inv.cursor;
    if (l === 'armor') {
      if (c && (!BH.ITEMS[c.id].armor || BH.ITEMS[c.id].armor.slot !== +i)) return;
    }
    if (button === 2) {
      if (!c && s) { const half = Math.ceil(s.n / 2); inv.cursor = { id: s.id, n: half, dur: s.dur }; s.n -= half; if (!s.n) list[i] = null; }
      else if (c && !s) { list[i] = { id: c.id, n: 1, dur: c.dur }; c.n--; if (!c.n) inv.cursor = null; }
      else if (c && s && s.id === c.id && s.n < BH.ITEMS[s.id].stack && !s.dur) { s.n++; c.n--; if (!c.n) inv.cursor = null; }
    } else {
      if (c && s && c.id === s.id && !s.dur && BH.ITEMS[s.id].stack > 1) { const k = Math.min(c.n, BH.ITEMS[s.id].stack - s.n); s.n += k; c.n -= k; if (!c.n) inv.cursor = null; }
      else { list[i] = c; inv.cursor = s || null; }
      if (g.mode === 'creative' && this.screen === 'inv' && !c && s && l === 'inv') { /* picked up */ }
    }
    this.refresh();
  };
  UI.prototype.spaceFor = function (id) {
    const ms = BH.ITEMS[id].stack; let sp = 0;
    this.inv.slots.forEach(s => { if (!s) sp += ms; else if (s.id === id) sp += ms - s.n; });
    return sp;
  };
  UI.prototype.addTo = function (list, a, b, s) {
    const ms = BH.ITEMS[s.id].stack;
    let n = s.n;
    if (ms > 1) for (let k = a; k < b && n; k++) { const t = list[k]; if (t && t.id === s.id && t.n < ms) { const m = Math.min(n, ms - t.n); t.n += m; n -= m; } }
    for (let k = a; k < b && n; k++) if (!list[k]) { list[k] = { id: s.id, n, dur: s.dur }; n = 0; }
    return n ? { id: s.id, n, dur: s.dur } : null;
  };

  UI.prototype.bind = function () {
    const panel = $('#panel');
    panel.addEventListener('mousedown', e => {
      const t = e.target.closest('.slot');
      if (t && t.dataset.l) { e.preventDefault(); this.clickSlot(t.dataset.l, t.dataset.i, e.button, e.shiftKey); return; }
      const tab = e.target.closest('.tab');
      if (tab) { this.ctab = tab.dataset.tab; this.renderCreative(); return; }
      const rb = e.target.closest('.rbtn');
      if (rb) { this.autofill(BH.RECIPES[+rb.dataset.r]); return; }
      const tr = e.target.closest('.trade');
      if (tr) { this.game.doTrade(this.container, +tr.dataset.t); return; }
    });
    panel.addEventListener('contextmenu', e => e.preventDefault());
    panel.addEventListener('input', e => {
      if (e.target.id === 'csearch') { this.cq = e.target.value; const pos = e.target.selectionStart; this.renderCreative(); const inp = $('#csearch'); inp.focus(); inp.setSelectionRange(pos, pos); }
      if (e.target.id === 'rsearch') { this.rq = e.target.value; this.renderRecipeList(); }
    });
    panel.addEventListener('mousemove', e => {
      const t = e.target.closest('.slot, .rbtn');
      const tip = $('#tooltip');
      let txt = '';
      if (t && t.classList.contains('rbtn')) { const r = BH.RECIPES[+t.dataset.r]; const it = BH.itemByKey(r.out); txt = it.name + (t.classList.contains('no') ? ' — missing ingredients' : ' — click to fill grid'); }
      else if (t) {
        let s;
        if (t.dataset.l === 'cat') s = { id: +t.dataset.i };
        else if (t.dataset.l === 'craftout') { const r = this.currentRecipe(); s = r ? { id: BH.ID[r.out] } : null; }
        else s = this.listRef(t.dataset.l)[t.dataset.i];
        if (s) {
          const it = BH.ITEMS[s.id];
          txt = it.name;
          if (it.tool) txt += ` · ${it.tool.dmg} attack damage`;
          if (it.armor) txt += ` · +${it.armor.points} armor`;
          if (it.food) txt += ` · restores ${it.food / 2} food`;
          if (it.dur) txt += ` · durability ${it.dur - (s.dur || 0)}/${it.dur}`;
        }
      }
      tip.hidden = !txt; tip.textContent = txt;
      tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 10) + 'px';
    });
    document.addEventListener('mousemove', e => { const c = $('#cursor'); c.style.left = (e.clientX - 20) + 'px'; c.style.top = (e.clientY - 20) + 'px'; });
    $('#screen').addEventListener('mousedown', e => {
      // clicking outside the panel drops the cursor stack
      if (e.target.id === 'screen' && this.inv.cursor) {
        const g = this.game, s = this.inv.cursor;
        const n = e.button === 2 ? 1 : s.n;
        if (g.mode !== 'creative') { const dir = g.player.lookDir(); g.entities.dropItem(s.id, n, g.player.pos.x + dir.x, g.player.pos.y + 1.4, g.player.pos.z + dir.z, dir.clone().multiplyScalar(4), 1.5); }
        s.n -= n; if (!s.n) this.inv.cursor = null;
        this.refresh();
      }
    });
  };

  // single atlas tile as a canvas (for sprite meshes of plant blocks)
  BH.atlasTile = function (name) {
    const t = BH.TEX[name], N = BH.ATLAS_COLS;
    const c = document.createElement('canvas'); c.width = c.height = 16;
    c.getContext('2d').drawImage(BH.atlas, (t % N) * 16, ((t / N) | 0) * 16, 16, 16, 0, 0, 16, 16);
    return c;
  };

  BH.UI = UI;
  BH.Inventory = Inventory;
  BH.matchRecipe = matchRecipe;
  BH.itemIcon = icon;
})();
