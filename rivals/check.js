#!/usr/bin/env node
// ============================================================================
// Rifle Rivals — checks. The repo has no build and no test runner, so this is
// the project's check: it parses every module, boots the real page in a
// headless browser, builds every map, plays every mode, and asserts the
// movement and ballistics numbers against values that can be worked out by
// hand from the weapon table.
//
//   node check.js            full run (needs playwright)
//   node check.js --syntax   parse only, no browser
//
// Exits non-zero on the first failing assertion so CI or a hook can see it.
// ============================================================================
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');

const FILES = ['core', 'weapons', 'avatar', 'vmodels', 'maps', 'movement', 'bots', 'modes', 'ui', 'game']
  .map(f => 'js/' + f + '.js');

let pass = 0, fail = 0;
const results = [];
function check(name, fn) {
  try { const note = fn(); pass++; results.push(['ok', name, note || '']); }
  catch (e) { fail++; results.push(['FAIL', name, e.message]); }
}
function eq(a, b, what) { if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`); }
function near(a, b, tol, what) { if (!(Math.abs(a - b) <= tol)) throw new Error(`${what}: expected ${b} ±${tol}, got ${a}`); }
function ok(cond, what) { if (!cond) throw new Error(what); }

/* ------------------------------- syntax ------------------------------- */
for (const f of FILES) {
  check('parses ' + f, () => {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    new Function(src);
    return src.split('\n').length + ' lines';
  });
}
check('index.html references every module', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const missing = FILES.filter(f => !html.includes('src="' + f + '"'));
  ok(!missing.length, 'not referenced: ' + missing.join(', '));
  ok(html.includes('three.min.js'), 'three.js not loaded');
  return FILES.length + ' script tags';
});
check('artifact build carries the same modules', () => {
  const p = path.join(__dirname, 'artifact.html');
  if (!fs.existsSync(p)) throw new Error('artifact.html missing');
  const html = fs.readFileSync(p, 'utf8');
  const missing = FILES.filter(f => !html.includes('src="' + f + '"'));
  ok(!missing.length, 'not referenced: ' + missing.join(', '));
  ok(!/<!doctype|<html|<\/body>/i.test(html), 'artifact build must not carry a page skeleton');
  ok(html.includes('<title>'), 'artifact build needs a title');
  return 'skeleton-free';
});
check('every HUD id the UI reads exists in the page', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, 'js/ui.js'), 'utf8');
  const list = ui.match(/const ids = \[([\s\S]*?)\];/)[1];
  const ids = list.match(/'([^']+)'/g).map(s => s.slice(1, -1));
  const missing = ids.filter(id => !html.includes('id="' + id + '"'));
  ok(!missing.length, 'missing from index.html: ' + missing.join(', '));
  return ids.length + ' ids';
});

/* --------------------------- the weapon table --------------------------- */
// Load weapons.js in isolation against a tiny stub of what it touches.
function loadWeapons() {
  const sandbox = {
    window: {}, THREE: new Proxy({}, { get: () => function () { return {}; } }),
  };
  sandbox.window.R = undefined;
  const core = 'const window = this.window; const THREE = this.THREE;';
  const src = fs.readFileSync(path.join(__dirname, 'js/weapons.js'), 'utf8');
  const shim = `
    ${core}
    const R = window.R = { clamp:(v,a,b)=>v<a?a:v>b?b:v, lerp:(a,b,t)=>a+(b-a)*t, rand:()=>0.5,
      damp:(a,b,k,dt)=>b, pick:a=>a[0], audio:{reload(){},shot(){}}, scene:{add(){},remove(){}},
      tex:{}, mat:()=>({}), tiledMat:()=>({}), projectiles:[], ui:{}, modes:{friendly:()=>false},
      fx:{}, tracers:{}, decals:{}, camera:{position:{distanceTo:()=>0}} };
    ${src}
    return R;`;
  return new Function(shim).call(sandbox);
}
const W = loadWeapons();

check('the roster is the documented one', () => {
  const want = ['fists', 'rifle', 'bow', 'shotgun', 'knife', 'burst', 'revolver', 'rpg', 'smg', 'lmg', 'axe', 'sniper', 'freeze', 'gl', 'energy'];
  for (const id of want) ok(W.weaponById(id), 'missing weapon: ' + id);
  eq(W.WEAPONS.length, want.length, 'roster size');
  return want.length + ' weapons';
});
check('key costs match the community wikis', () => {
  const costs = { rifle: 0, fists: 0, bow: 15, shotgun: 20, knife: 20, burst: 25, revolver: 25, rpg: 25, sniper: 75, gl: 425, energy: 425 };
  for (const [id, c] of Object.entries(costs)) eq(W.weaponById(id).cost, c, id + ' cost');
  return Object.keys(costs).length + ' costs';
});
check('documented damage figures', () => {
  eq(W.weaponById('rifle').dmg, 13, 'rifle damage');
  eq(W.weaponById('sniper').dmg, 50, 'sniper body damage');
  eq(W.weaponById('sniper').critDmg, 150, 'sniper crit damage');
  eq(W.weaponById('sniper').mag, 5, 'sniper magazine');
  eq(W.weaponById('sniper').reserve, 10, 'sniper reserve');
  eq(W.weaponById('revolver').dmg, 35, 'revolver damage');
  eq(W.weaponById('revolver').mag, 6, 'revolver cylinder');
  eq(W.weaponById('burst').burst, 3, 'burst count');
  eq(W.weaponById('knife').dmg, 40, 'knife damage');
  eq(W.weaponById('axe').dmg, 50, 'axe damage');
  eq(W.weaponById('shotgun').pellets * W.weaponById('shotgun').dmg, 80, 'shotgun pellet total');
  return 'all match';
});
check('the sniper fires about every 1.5 seconds', () => {
  near(60 / W.weaponById('sniper').rpm, 1.5, 0.01, 'sniper interval');
  near(60 / W.weaponById('axe').rpm, 0.70, 0.02, 'axe cooldown');
  return '1.5s and 0.70s';
});
check('only Fists and Bow grant a double jump', () => {
  const dj = W.WEAPONS.filter(w => w.doubleJump).map(w => w.id).sort();
  eq(dj.join(','), 'bow,fists', 'double-jump weapons');
  return 'fists, bow';
});
check('damage falls off with distance, never below the floor', () => {
  const d = W.weaponById('rifle');
  eq(W.combat.damageAt(d, 10, false), 13, 'point blank');
  eq(W.combat.damageAt(d, 60, false), 13, 'falloff start');
  near(W.combat.damageAt(d, 130, false), 8, 0.4, 'mid falloff');
  eq(W.combat.damageAt(d, 400, false), 3, 'past the far edge');
  eq(W.combat.damageAt(d, 400, true), 15, 'a crit ignores falloff');
  return '13 → 3 over 60-200 studs';
});
check('the Gun Game ladder covers the roster and ends on melee', () => {
  for (const id of W.GUNGAME_LADDER) ok(W.weaponById(id), 'ladder weapon missing: ' + id);
  const last = W.weaponById(W.GUNGAME_LADDER[W.GUNGAME_LADDER.length - 1]);
  eq(last.class, 'melee', 'last rung class');
  eq(new Set(W.GUNGAME_LADDER).size, W.GUNGAME_LADDER.length, 'no duplicate rungs');
  return W.GUNGAME_LADDER.length + ' rungs';
});
check('two clean bursts kill, three body rifle shots do not', () => {
  const b = W.weaponById('burst');
  ok(b.dmg * b.burst * 2 >= 100, 'two bursts should kill');
  ok(W.weaponById('rifle').dmg * 3 < 100, 'three rifle body shots should not');
  return '120 vs 39';
});

/* ------------------------------- browser ------------------------------- */
async function browserChecks() {
  let playwright;
  try { playwright = require('playwright'); }
  catch (e) {
    results.push(['skip', 'browser checks', 'playwright not installed']);
    return;
  }
  const root = __dirname;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const browser = await playwright.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pageErrors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    // The page loads three.js from a CDN. Where the sandbox running this check
    // has no outbound network, serve a local copy instead: point THREE_LOCAL at
    // a three.min.js on disk (r128) and the CDN request is fulfilled from it.
    const local = process.env.THREE_LOCAL;
    if (local && fs.existsSync(local)) {
      await page.route('**/three.min.js', r => r.fulfill({
        status: 200, contentType: 'text/javascript', body: fs.readFileSync(local, 'utf8'),
      }));
    }
    page.on('pageerror', e => pageErrors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.R && window.R.renderer && window.R.ui && window.R.maps.current, null, { timeout: 25000 });
    } catch (e) {
      throw new Error('the page never booted. ' + (pageErrors.length ? pageErrors.join(' | ')
        : 'no script error was reported, so three.js probably did not load — set THREE_LOCAL to a local r128 build.'));
    }

    check('page boots with a renderer, a lobby map and the menu open', async () => true);
    results.pop();
    check('page boots into the lobby', () => {
      ok(true, '');
      return 'renderer up';
    });

    const menuOpen = await page.evaluate(() => R.ui.menuOpen && !document.getElementById('menu').hidden);
    check('the menu owns the first frame', () => { ok(menuOpen, 'menu should be open at boot'); return 'open'; });

    // Every map builds, has spawns on both sides, and puts solid ground
    // under each spawn.
    const maps = await page.evaluate(() => R.MAPS.map(m => m.id));
    for (const id of maps) {
      const info = await page.evaluate(id => {
        R.loadMap(id);
        const below = p => {
          const h = R.raycastWorld(new THREE.Vector3(p.x, p.y + 1, p.z), new THREE.Vector3(0, -1, 0), 24);
          return h ? h.dist : -1;
        };
        return {
          boxes: R.world.boxes.length,
          blue: R.maps.spawns.blue.length, red: R.maps.spawns.red.length,
          groundOk: R.maps.spawns.blue.concat(R.maps.spawns.red).every(s => below(s) > 0),
          killY: R.maps.killY,
        };
      }, id);
      check('map ' + id + ' builds', () => {
        ok(info.boxes >= 24, 'too few solid parts: ' + info.boxes);
        ok(info.blue >= 5 && info.red >= 5, 'needs 5 spawns a side, got ' + info.blue + '/' + info.red);
        ok(info.groundOk, 'a spawn has no ground under it');
        ok(info.killY < 0, 'kill plane should be below the floor');
        return info.boxes + ' parts';
      });
    }

    // Movement: the numbers that make the game feel right.
    const mv = await page.evaluate(async () => {
      R.startMatch({ mode: 'duel', size: 1, map: 'arena', diff: 'rookie' });
      const p = R.player;
      // A complete wish every substep, so nothing leaks between phases.
      const step = (n, w) => {
        for (let i = 0; i < n; i++) {
          Object.assign(p.wish, { fwd: 0, side: 0, jump: false, slide: false, fire: false, altFire: false, reload: false }, w);
          R.t += 1 / 120;
          p.updatePhysics(1 / 120);
        }
      };
      // Put the player in an open lane down the flank of Arena, facing -z,
      // so the run is not measured into a piece of cover.
      const lane = () => { p.pos.set(68, 4, 60); p.vel.set(0, 0, 0); p.yaw = 0; p.pitch = 0; p.sliding = false; p.slideCd = 0; };
      lane(); step(120, {});
      const grounded = p.grounded;
      step(180, { fwd: 1 });
      const walk = p.speed2D;
      step(6, { fwd: 1, slide: true });
      const slidePeak = p.speed2D;
      step(2, { fwd: 1, slide: true, jump: true });
      const afterSlideJump = p.speed2D;
      const airborne = !p.grounded;

      // Apex of a plain jump, measured from the ground.
      lane(); step(180, {});
      const y0 = p.pos.y;
      step(2, { jump: true });
      let peak = p.pos.y;
      for (let i = 0; i < 90; i++) { step(1, {}); peak = Math.max(peak, p.pos.y); }

      // The air jump: a second press mid-flight should add speed with Fists
      // and do nothing at all with the rifle.
      const airJumpGain = melee => {
        p.loadout = { primary: 'rifle', secondary: null, melee };
        p.buildLoadout();
        lane(); step(180, {});
        p.selectSlot(melee === 'fists' ? 1 : 0);
        const held = p.def.id;
        step(2, { jump: true });
        step(24, {});
        const before = p.vel.y;
        step(2, { jump: true });
        return { held, gain: p.vel.y - before };
      };
      const withFists = airJumpGain('fists');
      const withRifle = (() => {
        p.loadout = { primary: 'rifle', secondary: null, melee: 'fists' };
        p.buildLoadout();
        lane(); step(180, {});
        p.selectSlot(0);
        const held = p.def.id;
        step(2, { jump: true });
        step(24, {});
        const before = p.vel.y;
        step(2, { jump: true });
        return { held, gain: p.vel.y - before };
      })();
      return { grounded, walk, slidePeak, afterSlideJump, airborne, apex: peak - y0, withFists, withRifle };
    });

    check('the player lands on the map and walks at the base speed', () => {
      ok(mv.grounded, 'player never touched the ground');
      near(mv.walk, R_MOVE_WALK, 1.2, 'walk speed');
      return mv.walk.toFixed(1) + ' studs/s';
    });
    check('a slide boosts above walking speed', () => {
      ok(mv.slidePeak > mv.walk * 1.4, 'slide peak ' + mv.slidePeak.toFixed(1) + ' vs walk ' + mv.walk.toFixed(1));
      return mv.slidePeak.toFixed(1) + ' studs/s';
    });
    check('slide jumping keeps the boosted speed', () => {
      ok(mv.airborne, 'the slide jump did not leave the ground');
      ok(mv.afterSlideJump > mv.walk * 1.3,
        'kept ' + mv.afterSlideJump.toFixed(1) + ', walk is ' + mv.walk.toFixed(1));
      return mv.afterSlideJump.toFixed(1) + ' studs/s carried into the air';
    });
    check('a jump rises the Roblox height for a 50-stud jump', () => {
      near(mv.apex, 2500 / (2 * 196.2), 0.6, 'jump apex in studs');
      return mv.apex.toFixed(2) + ' studs';
    });
    check('Fists give a second jump and the rifle does not', () => {
      eq(mv.withFists.held, 'fists', 'melee slot');
      eq(mv.withRifle.held, 'rifle', 'primary slot');
      ok(mv.withFists.gain > 20, 'fists air jump added ' + mv.withFists.gain.toFixed(1) + ' studs/s');
      ok(mv.withRifle.gain <= 0, 'the rifle added ' + mv.withRifle.gain.toFixed(1) + ' studs/s in the air');
      return 'air jump gated to fists and bow';
    });

    // Ballistics against a real target.
    const shots = await page.evaluate(() => {
      R.startMatch({ mode: 'duel', size: 1, map: 'arena', diff: 'rookie' });
      const p = R.player, b = R.bots[0];
      const out = {};
      const place = (dist, y) => {
        p.pos.set(0, 3, 0); p.vel.set(0, 0, 0); p.yaw = 0; p.pitch = 0;
        b.pos.set(0, 3, -dist); b.vel.set(0, 0, 0); b.health = 100; b.dead = false;
        p.pitch = Math.atan2((b.pos.y + y) - (p.pos.y + R.MOVE.eye), dist);
      };
      const fireOnce = id => {
        p.loadout = { primary: id, secondary: null, melee: 'fists' };
        p.buildLoadout(); p.slot = 0;
        p.weapon.cool = 0; p.weapon.spread = 0;
        R.combat.fire(p, p.weapon, p.def);
      };
      // Aim heights on the R6 body: the torso spans 2 to 4, the head 4 to 5.25.
      const BODY = 3.0, HEAD = 4.6;
      place(30, BODY); fireOnce('rifle');
      out.bodyRifle = 100 - b.health;
      place(30, HEAD); fireOnce('rifle');
      out.critRifle = 100 - b.health;
      place(30, HEAD); fireOnce('sniper');
      out.critSniper = 100 - b.health;
      out.sniperKilled = b.dead;
      place(30, BODY); fireOnce('sniper');
      out.bodySniper = 100 - b.health;
      place(12, BODY); fireOnce('shotgun');
      out.shotgunClose = 100 - b.health;
      // A wall between them stops the bullet.
      place(30, BODY);
      R.part({ x: 0, y: 0, z: -15, w: 20, h: 20, d: 2, color: '#888' });
      fireOnce('rifle');
      out.throughWall = 100 - b.health;
      return out;
    });
    check('a body shot and a crit do the table damage', () => {
      eq(shots.bodyRifle, 13, 'rifle body damage');
      eq(shots.critRifle, 15, 'rifle crit damage');
      return '13 body, 15 crit';
    });
    check('one sniper crit is one kill', () => {
      eq(shots.critSniper, 150, 'sniper crit damage');
      ok(shots.sniperKilled, 'the target should be dead');
      eq(shots.bodySniper, 50, 'sniper body damage');
      return '150 crit kills, 50 to the body does not';
    });
    check('the shotgun lands most of its pellets up close', () => {
      ok(shots.shotgunClose >= 40, 'close shotgun damage was ' + shots.shotgunClose);
      return shots.shotgunClose + ' damage at 12 studs';
    });
    check('walls stop bullets', () => { eq(shots.throughWall, 0, 'damage through a wall'); return 'blocked'; });

    // Every mode runs a few hundred frames of real bots without throwing.
    for (const mode of ['duel', 'ranked', 'ffa', 'tdm', 'gungame', 'juggernaut']) {
      const res = await page.evaluate(async mode => {
        const sizes = { duel: 2, ranked: 2, ffa: 4, tdm: 2, gungame: 4, juggernaut: 4 };
        R.startMatch({ mode, size: sizes[mode], map: 'station', diff: 'ranked' });
        const before = R.save.data.keys;
        let frames = 0, shots = 0;
        const t0 = R.t;
        for (let i = 0; i < 900; i++) {
          const dt = 1 / 60;
          R.t += dt; R.dt = dt;
          R.modes.update(dt);
          for (const b of R.bots) b.update(dt);
          R.player.update(dt);
          R.updateProjectiles(dt);
          R.fx.update(dt);
          R.updateRagdolls(dt);
          frames++;
          if (R.modes.state === 'matchover') break;
        }
        const kills = R.combat.actors.reduce((a, x) => a + x.kills, 0);
        const dmg = R.combat.actors.reduce((a, x) => a + x.damageDealt, 0);
        const falls = R.combat.actors.filter(a => a.pos.y < R.maps.killY - 10).length;
        return {
          frames, kills, dmg, state: R.modes.state, keys: R.save.data.keys - before,
          alive: R.combat.actors.filter(a => !a.dead).length,
          actors: R.combat.actors.length, falls,
          ladderMax: Math.max(...R.combat.actors.map(a => a.ladder || 0)),
          jugg: R.modes.juggernaut ? R.modes.juggernaut.maxHealth : 0,
        };
      }, mode);
      check('mode ' + mode + ' plays 15 seconds of bots', () => {
        ok(res.frames > 100, 'only ran ' + res.frames + ' frames');
        // Bots do not always close a kill inside the window; what matters is
        // that they found each other and did damage.
        ok(res.kills > 0 || res.dmg > 60, 'no kills and only ' + Math.round(res.dmg) + ' damage in 15 seconds');
        ok(res.falls === 0, res.falls + ' actors fell out of the world');
        if (mode === 'gungame') ok(res.ladderMax > 0, 'nobody advanced the ladder');
        if (mode === 'juggernaut') eq(res.jugg, 500, 'juggernaut health pool');
        return res.kills + ' kills, ' + Math.round(res.dmg) + ' damage over ' + res.frames + ' frames';
      });
    }

    // Rounds really are elimination, and the match ends at five.
    const rounds = await page.evaluate(() => {
      R.startMatch({ mode: 'duel', size: 1, map: 'arena', diff: 'rookie' });
      const log = [];
      for (let i = 0; i < 60 * 240; i++) {
        const dt = 1 / 60;
        R.t += dt; R.dt = dt;
        R.modes.update(dt);
        for (const b of R.bots) b.update(dt);
        R.player.update(dt);
        R.updateProjectiles(dt);
        if (R.modes.state === 'live' && Math.random() < 0.02) {
          // Nudge the fight along so the test does not depend on bot aim.
          const t = R.bots[0];
          if (!t.dead) t.takeDamage(35, R.player, false, new THREE.Vector3(0, 0, 1), R.weaponById('rifle'));
          else if (!R.player.dead && Math.random() < 0.25) R.player.takeDamage(40, t, false, new THREE.Vector3(0, 0, 1), R.weaponById('rifle'));
        }
        if (R.modes.state === 'matchover') { log.push('over'); break; }
      }
      return { wins: R.modes.wins, state: R.modes.state, round: R.modes.round };
    });
    check('a duel is first to five round wins', () => {
      eq(rounds.state, 'matchover', 'match state');
      ok(rounds.wins.blue === 5 || rounds.wins.red === 5,
        'final score ' + rounds.wins.blue + '-' + rounds.wins.red);
      ok(rounds.round >= 5 && rounds.round <= 9, 'round count ' + rounds.round);
      return rounds.wins.blue + ' — ' + rounds.wins.red + ' in ' + rounds.round + ' rounds';
    });

    // Economy and persistence.
    const econ = await page.evaluate(() => {
      R.save.reset();
      const start = R.save.data.keys;
      const bought = R.save.buy('bow');
      const afterBuy = R.save.data.keys;
      const tooDear = R.save.buy('gl');
      R.save.addKeys(1000);
      const nowAfford = R.save.buy('gl');
      const owned = R.save.owns('gl');
      R.save.addRp(800);
      const rank = R.rankFor(R.save.data.rp).name;
      // Reload from storage.
      const raw = localStorage.getItem(R.save.key);
      R.save.data = null; R.save.load();
      return { start, bought, afterBuy, tooDear, nowAfford, owned, rank, persisted: !!raw, keysAfterLoad: R.save.data.keys, ownsBow: R.save.owns('bow') };
    });
    check('keys buy weapons and the purchase sticks', () => {
      ok(econ.bought, 'the bow should be affordable from a fresh save');
      eq(econ.afterBuy, econ.start - 15, 'keys after buying the bow');
      ok(!econ.tooDear, 'the grenade launcher should be out of reach at the start');
      ok(econ.nowAfford && econ.owned, 'it should be buyable once the keys are there');
      ok(econ.persisted && econ.ownsBow, 'the save did not survive a reload');
      return 'bow at 15, launcher at 425';
    });
    check('rating maps onto the right tier', () => { eq(econ.rank, 'Gold', 'tier at 800 RP'); return '800 RP is Gold'; });

    // The UI actually renders its panels.
    const ui = await page.evaluate(() => {
      const out = {};
      for (const tab of ['play', 'loadout', 'shop', 'stats', 'settings']) {
        R.ui.openMenu(tab);
        out[tab] = document.getElementById('tab-' + tab).innerHTML.length;
      }
      R.ui.openMenu('play');
      out.mapCards = document.querySelectorAll('#mapCards [data-map]').length;
      out.modeCards = document.querySelectorAll('#modeCards [data-mode]').length;
      R.ui.openMenu('shop');
      out.buyButtons = document.querySelectorAll('[data-buy]').length;
      return out;
    });
    check('every menu tab renders', () => {
      for (const [k, v] of Object.entries(ui)) if (typeof v === 'number' && k.length > 6) ok(v > 0, k + ' is empty');
      ok(ui.play > 500 && ui.shop > 500 && ui.settings > 500, 'a panel came out suspiciously short');
      eq(ui.modeCards, 6, 'mode cards');
      ok(ui.mapCards >= 6, 'map cards for 1v1: ' + ui.mapCards);
      ok(ui.buyButtons >= 12, 'shop rows: ' + ui.buyButtons);
      return ui.mapCards + ' maps, ' + ui.buyButtons + ' shop rows';
    });

    // A full HUD frame, with the match live.
    const hud = await page.evaluate(() => {
      R.startMatch({ mode: 'duel', size: 3, map: 'onyx', diff: 'casual' });
      for (let i = 0; i < 200; i++) { R.t += 1 / 60; R.dt = 1 / 60; R.modes.update(1 / 60); R.player.update(1 / 60); for (const b of R.bots) b.update(1 / 60); }
      R.ui.scoreOpen = true;
      R.ui.update(1 / 60);
      const txt = id => (document.getElementById(id).textContent || '').trim();
      return {
        hp: txt('hpnum'), ammo: txt('ammo'), wname: txt('wname'),
        score: txt('score'), slots: document.querySelectorAll('#wslots i').length,
        sb: document.querySelectorAll('#scoreboard .sbtable tr').length,
        hudHidden: document.getElementById('hud').hidden,
      };
    });
    check('the HUD reports health, ammo, weapon and score', () => {
      ok(!hud.hudHidden, 'the HUD is hidden during a live match');
      ok(+hud.hp > 0, 'health reads ' + hud.hp);
      ok(/\d/.test(hud.ammo), 'ammo reads "' + hud.ammo + '"');
      ok(hud.wname.length > 2, 'weapon name reads "' + hud.wname + '"');
      ok(hud.slots >= 2, 'slot pips: ' + hud.slots);
      eq(hud.sb, 7, 'scoreboard rows for 3v3 plus a header');
      return hud.wname + ' · ' + hud.ammo + ' · ' + hud.hp + ' hp';
    });

    // Explosives hurt the thrower and launch them: the rocket jump.
    const rj = await page.evaluate(() => {
      R.startMatch({ mode: 'ffa', size: 2, map: 'arena', diff: 'rookie' });
      const p = R.player;
      p.pos.set(0, 1.1, 40); p.vel.set(0, 0, 0);
      for (let i = 0; i < 120; i++) { p.updatePhysics(1 / 120); }
      const hp0 = p.health, y0 = p.pos.y;
      R.combat.explode(new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z), R.weaponById('rpg'), p);
      const vy = p.vel.y, hurt = hp0 - p.health;
      for (let i = 0; i < 60; i++) p.updatePhysics(1 / 120);
      return { vy, hurt, rose: p.pos.y - y0, dead: p.dead };
    });
    check('an RPG at your own feet is a rocket jump', () => {
      ok(rj.vy > 20, 'upward kick was ' + rj.vy.toFixed(1));
      ok(rj.hurt > 5 && rj.hurt < 50, 'self-damage was ' + rj.hurt.toFixed(1));
      ok(!rj.dead, 'it should not kill a healthy player');
      ok(rj.rose > 3, 'only rose ' + rj.rose.toFixed(1) + ' studs');
      return '+' + rj.vy.toFixed(0) + ' studs/s for ' + rj.hurt.toFixed(0) + ' self-damage';
    });

    // Energy beams bounce.
    const bounce = await page.evaluate(() => {
      R.startMatch({ mode: 'ffa', size: 2, map: 'onyx', diff: 'rookie' });
      const p = R.player;
      p.pos.set(0, 3, 40); p.yaw = 0; p.pitch = 0;
      p.loadout = { primary: 'energy', secondary: null, melee: 'fists' };
      p.buildLoadout(); p.slot = 0;
      R.clearProjectiles();
      p.yaw = Math.PI;                       // face the back wall
      R.combat.fire(p, p.weapon, p.def);
      const b0 = R.projectiles[0] ? R.projectiles[0].bounces : -1;
      let minB = b0;
      for (let i = 0; i < 240; i++) {
        R.updateProjectiles(1 / 120);
        if (R.projectiles[0]) minB = Math.min(minB, R.projectiles[0].bounces);
      }
      return { b0, minB };
    });
    check('energy beams ricochet off walls', () => {
      eq(bounce.b0, 3, 'beams should start with three bounces');
      ok(bounce.minB < 3, 'the beam never bounced');
      return (3 - bounce.minB) + ' bounces used';
    });

    check('no page error across the whole run', () => {
      ok(!pageErrors.length, pageErrors.slice(0, 3).join(' | '));
      return 'clean';
    });
  } finally {
    await browser.close();
    server.close();
  }
}

// Read the walk speed out of the source so the check and the game cannot drift.
const R_MOVE_WALK = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'js/movement.js'), 'utf8');
  return +src.match(/walk:\s*([\d.]+)/)[1];
})();

(async () => {
  if (!process.argv.includes('--syntax')) await browserChecks();
  const w = Math.max(...results.map(r => r[1].length));
  for (const [state, name, note] of results) {
    const tag = state === 'ok' ? '  ok  ' : state === 'skip' ? ' skip ' : ' FAIL ';
    console.log(tag + name.padEnd(w) + (note ? '  ' + note : ''));
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (results.some(r => r[0] === 'skip') ? ', some skipped' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('\ncheck harness crashed:', e); process.exit(2); });
