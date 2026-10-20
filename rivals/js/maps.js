'use strict';
// ============================================================================
// Maps — the RIVALS map pool, rebuilt from blocks.
//
// The pool mirrors the real game's: Arena, Bridge, Crossroads, Station, Onyx,
// Dimension, Splash and Backrooms, plus the Big variants the game uses for
// 4v4 and 5v5. Each one is deterministic from its name, so a map always
// builds identically, and each reports team spawns plus a kill plane.
// ============================================================================

R.maps = {
  current: null, spawns: { blue: [], red: [], ffa: [] }, killY: -120, water: [], lights: [],
};

// ---- building helpers ----------------------------------------------------
const B = {
  // One part. `mirror` duplicates it across X, which is how symmetric
  // competitive maps get built.
  p(o) { return R.part(o); },
  mirrorX(o) { R.part(o); R.part(Object.assign({}, o, { x: -o.x, rotY: o.rotY ? -o.rotY : 0 })); },
  mirrorZ(o) { R.part(o); R.part(Object.assign({}, o, { z: -o.z, rotY: o.rotY ? -o.rotY : 0 })); },
  quad(o) { B.mirrorX(o); B.mirrorX(Object.assign({}, o, { z: -o.z })); },
  // A floor slab.
  floor(x, z, w, d, color, surface, y) {
    return R.part({ x, y: (y || 0) - 1, z, w, h: 1, d, color, surface: surface || 'studs' });
  },
  // A wall, thickness 1 by default.
  wall(x, z, w, h, d, color, surface) {
    return R.part({ x, y: 0, z, w, h, d, color, surface: surface || 'plastic' });
  },
  // A ramp from `y` up to `y + rise` over `len` studs. The visible slab is one
  // rotated brick; collision is a short stair the walker steps up, whose top
  // surface lands exactly on the platform it serves — if it overshoots, the
  // invisible steps stick out above the platform and block bullets.
  ramp(x, y, z, w, len, color, rotY, surface, rise) {
    rise = rise == null ? len * 0.4142 : rise;
    const ang = Math.atan2(rise, len);
    const slab = R.part({
      x, y: y + rise / 2 - 0.45, z, w, h: 0.9, d: Math.hypot(len, rise),
      color, surface: surface || 'studs', decor: true,
    });
    slab.rotation.order = 'YXZ';
    slab.rotation.y = rotY || 0;
    slab.rotation.x = -ang;
    const steps = Math.max(3, Math.round(len / 3));
    const hx = Math.sin(rotY || 0), hz = Math.cos(rotY || 0);
    for (let i = 0; i < steps; i++) {
      const u = (i + 0.5) / steps;
      const dz = (u - 0.5) * len;
      const top = y + u * rise;
      const step = R.part({
        x: x + dz * hx, z: z + dz * hz, y: top - 1.2,
        w: rotY ? len / steps + 0.4 : w, h: 1.2, d: rotY ? w : len / steps + 0.4,
        color, surface: surface || 'studs',
      });
      step.visible = false;
    }
    return slab;
  },
  // Crate-style cover.
  crate(x, z, s, color, surface, y) {
    return R.part({ x, y: y || 0, z, w: s, h: s, d: s, color: color || '#9a7a4a', surface: surface || 'wood', shadow: true });
  },
  // A hollow room: four walls with a doorway on chosen sides.
  room(x, z, w, d, h, color, doors, surface) {
    doors = doors || {};
    const t = 1;
    const seg = (cx, cz, sw, sd) => R.part({ x: cx, y: 0, z: cz, w: sw, h, d: sd, color, surface: surface || 'concrete' });
    const gap = 6;
    // north / south walls run along X
    for (const [side, cz] of [['n', z - d / 2], ['s', z + d / 2]]) {
      if (doors[side]) {
        const half = (w - gap) / 2;
        seg(x - (gap / 2 + half / 2), cz, half, t);
        seg(x + (gap / 2 + half / 2), cz, half, t);
        seg(x, cz, gap, t); // lintel handled by shorter wall below
      } else seg(x, cz, w, t);
    }
    for (const [side, cx] of [['w', x - w / 2], ['e', x + w / 2]]) {
      if (doors[side]) {
        const half = (d - gap) / 2;
        seg(cx, z - (gap / 2 + half / 2), t, half);
        seg(cx, z + (gap / 2 + half / 2), t, half);
      } else seg(cx, z, t, d);
    }
  },
  light(x, y, z, color, intensity, dist) {
    const l = new THREE.PointLight(R.col(color), intensity, dist || 60);
    l.position.set(x, y, z);
    R.scene.add(l);
    R.maps.lights.push(l);
    return l;
  },
  // Non-solid water: a surface you can swim through, used by Splash.
  waterSlab(x, z, w, d, y, color) {
    const m = R.part({ x, y: y - 0.5, z, w, h: 0.5, d, color: color || '#2f9ad8', surface: 'glass', decor: true, opacity: 0.55 });
    m.material.transparent = true; m.material.opacity = 0.5;
    R.maps.water.push({ min: { x: x - w / 2, y: y - 14, z: z - d / 2 }, max: { x: x + w / 2, y, z: z + d / 2 } });
    return m;
  },
  // Outer walls so nobody walks off a competitive map.
  arenaWalls(half, h, color, surface) {
    B.wall(0, -half, half * 2 + 2, h, 2, color, surface);
    B.wall(0, half, half * 2 + 2, h, 2, color, surface);
    B.wall(-half, 0, 2, h, half * 2 + 2, color, surface);
    B.wall(half, 0, 2, h, half * 2 + 2, color, surface);
  },
  // Four-way symmetric cover scatter.
  cover(rng, half, n, colors) {
    for (let i = 0; i < n; i++) {
      const x = rng() * half * 0.8 + 8, z = rng() * half * 0.8 + 8;
      const s = 3 + Math.floor(rng() * 3) * 2;
      const c = colors[Math.floor(rng() * colors.length)];
      B.quad({ x, y: 0, z, w: s, h: s * (rng() > 0.5 ? 1 : 1.6), d: s, color: c, surface: 'plastic', shadow: true });
    }
  },
};
R.B = B;

/* ============================== the pool ============================== */
// Each entry: id, name, teams it suits, sky, sun, fog, and a builder.

R.MAPS = [
  /* ---------------------------------------------------------------- Arena */
  {
    id: 'arena', name: 'Arena', sizes: [1, 2, 3], big: false,
    sky: '#79c8f0', fog: [0.0016, '#9fd8f4'], sun: ['#fff6e0', 1.05], amb: ['#9fc8e8', 0.62],
    blurb: 'The default duel box. Raised middle, four ramps, nowhere to hide.',
    build(rng) {
      const half = 78;
      B.floor(0, 0, half * 2, half * 2, '#a6adb4', 'studs');
      B.arenaWalls(half, 26, '#7e868e', 'concrete');
      // Centre podium with ramps on all four sides.
      R.part({ x: 0, y: 0, z: 0, w: 30, h: 6, d: 30, color: '#c2b89e', surface: 'tile', shadow: true });
      B.ramp(0, 0, -24, 14, 18, '#a89f89', 0, 'studs', 6);
      B.ramp(0, 0, 24, 14, 18, '#a89f89', Math.PI, 'studs', 6);
      B.ramp(-24, 0, 0, 14, 18, '#a89f89', Math.PI / 2, 'studs', 6);
      B.ramp(24, 0, 0, 14, 18, '#a89f89', -Math.PI / 2, 'studs', 6);
      // Corner towers with a sniper window each.
      B.quad({ x: 56, y: 0, z: 56, w: 18, h: 14, d: 18, color: '#9e3a33', surface: 'concrete', shadow: true });
      B.quad({ x: 56, y: 14, z: 56, w: 20, h: 1.5, d: 20, color: '#6f2b25', surface: 'plastic' });
      // Side cover.
      B.mirrorX({ x: 40, y: 0, z: 0, w: 6, h: 10, d: 24, color: '#5e87a6', surface: 'plastic', shadow: true });
      B.mirrorZ({ x: 0, y: 0, z: 40, w: 24, h: 10, d: 6, color: '#5e87a6', surface: 'plastic', shadow: true });
      B.cover(rng, half - 20, 5, ['#d8c44a', '#6ab04a', '#4a8ad8']);
      // Spawn platforms.
      B.mirrorZ({ x: 0, y: 0, z: 66, w: 36, h: 2, d: 14, color: '#c6ccd1', surface: 'studs' });
      return {
        blue: [[0, 3, 66], [-12, 3, 66], [12, 3, 66], [-24, 3, 62], [24, 3, 62]],
        red: [[0, 3, -66], [-12, 3, -66], [12, 3, -66], [-24, 3, -62], [24, 3, -62]],
        killY: -40,
      };
    },
  },

  /* ------------------------------------------------------------ Big Arena */
  {
    id: 'bigarena', name: 'Big Arena', sizes: [3, 4, 5], big: true,
    sky: '#79c8f0', fog: [0.0013, '#9fd8f4'], sun: ['#fff6e0', 1.05], amb: ['#9fc8e8', 0.62],
    blurb: 'Arena stretched for 4v4 and 5v5, with a second tier and long lanes.',
    build(rng) {
      const half = 120;
      B.floor(0, 0, half * 2, half * 2, '#a6adb4', 'studs');
      B.arenaWalls(half, 34, '#7e868e', 'concrete');
      R.part({ x: 0, y: 0, z: 0, w: 46, h: 8, d: 46, color: '#c2b89e', surface: 'tile', shadow: true });
      R.part({ x: 0, y: 8, z: 0, w: 22, h: 6, d: 22, color: '#b3a98f', surface: 'tile', shadow: true });
      B.ramp(0, 0, -36, 18, 24, '#a89f89', 0, 'studs', 8);
      B.ramp(0, 0, 36, 18, 24, '#a89f89', Math.PI, 'studs', 8);
      B.ramp(-36, 0, 0, 18, 24, '#a89f89', Math.PI / 2, 'studs', 8);
      B.ramp(36, 0, 0, 18, 24, '#a89f89', -Math.PI / 2, 'studs', 8);
      // Elevated walkways down both flanks.
      B.mirrorX({ x: 86, y: 14, z: 0, w: 14, h: 1.5, d: 150, color: '#6c8ba3', surface: 'metal', shadow: true });
      B.mirrorX({ x: 86, y: 0, z: 0, w: 4, h: 14, d: 10, color: '#8a9aa8', surface: 'metal' });
      B.mirrorX({ x: 86, y: 0, z: 50, w: 4, h: 14, d: 10, color: '#8a9aa8', surface: 'metal' });
      B.mirrorX({ x: 86, y: 0, z: -50, w: 4, h: 14, d: 10, color: '#8a9aa8', surface: 'metal' });
      B.ramp(72, 0, 60, 14, 26, '#8a9aa8', Math.PI * 0.75, 'metal', 14);
      B.ramp(-72, 0, -60, 14, 26, '#8a9aa8', -Math.PI * 0.25, 'metal', 14);
      B.quad({ x: 92, y: 0, z: 92, w: 24, h: 18, d: 24, color: '#b84840', surface: 'concrete', shadow: true });
      B.cover(rng, half - 28, 9, ['#d8c44a', '#6ab04a', '#4a8ad8', '#b06ad8']);
      B.mirrorZ({ x: 0, y: 0, z: 104, w: 56, h: 2, d: 18, color: '#c6ccd1', surface: 'studs' });
      return {
        blue: [[0, 3, 104], [-18, 3, 104], [18, 3, 104], [-36, 3, 100], [36, 3, 100]],
        red: [[0, 3, -104], [-18, 3, -104], [18, 3, -104], [-36, 3, -100], [36, 3, -100]],
        killY: -40,
      };
    },
  },

  /* --------------------------------------------------------------- Bridge */
  {
    id: 'bridge', name: 'Bridge', sizes: [1, 2, 3], big: false,
    sky: '#5a86b8', fog: [0.0022, '#7fa8cc'], sun: ['#ffe8c0', 0.95], amb: ['#8fa8c8', 0.6],
    blurb: 'Two platforms, one long bridge, a drop that kills. Crossing is the whole game.',
    build(rng) {
      // Two bases at either end over a void.
      for (const sz of [1, -1]) {
        B.floor(0, 70 * sz, 76, 60, '#b0b8c0', 'concrete');
        R.part({ x: 0, y: 0, z: 84 * sz, w: 76, h: 20, d: 2, color: '#98a0a8', surface: 'concrete' });
        R.part({ x: -38, y: 0, z: 70 * sz, w: 2, h: 20, d: 60, color: '#98a0a8', surface: 'concrete' });
        R.part({ x: 38, y: 0, z: 70 * sz, w: 2, h: 20, d: 60, color: '#98a0a8', surface: 'concrete' });
        // Base cover and a raised firing step.
        R.part({ x: 0, y: 0, z: 78 * sz, w: 30, h: 5, d: 8, color: '#a8b0b8', surface: 'concrete', shadow: true });
        R.part({ x: -22, y: 0, z: 58 * sz, w: 8, h: 8, d: 8, color: '#c04840', surface: 'plastic', shadow: true });
        R.part({ x: 22, y: 0, z: 58 * sz, w: 8, h: 8, d: 8, color: '#c04840', surface: 'plastic', shadow: true });
      }
      // The bridge: a 20-wide span with low rails and two mid-pillars.
      B.floor(0, 0, 20, 86, '#8a7a62', 'wood');
      R.part({ x: -10, y: 0, z: 0, w: 1.5, h: 3.5, d: 86, color: '#6a5a44', surface: 'wood' });
      R.part({ x: 10, y: 0, z: 0, w: 1.5, h: 3.5, d: 86, color: '#6a5a44', surface: 'wood' });
      R.part({ x: 0, y: 0, z: 0, w: 14, h: 7, d: 10, color: '#7a6a52', surface: 'wood', shadow: true });
      // Lower catwalks: the risky flank route under the bridge.
      B.mirrorX({ x: 30, y: -16, z: 0, w: 10, h: 1.2, d: 70, color: '#6a7a8a', surface: 'grate', shadow: true });
      for (const sz of [1, -1]) {
        B.ramp(30, -16, 44 * sz, 10, 22, '#6a7a8a', sz > 0 ? Math.PI : 0, 'metal', 16);
        B.ramp(-30, -16, 44 * sz, 10, 22, '#6a7a8a', sz > 0 ? Math.PI : 0, 'metal', 16);
      }
      // Suspension towers for silhouette.
      for (const sz of [1, -1]) {
        B.mirrorX({ x: 12, y: 0, z: 40 * sz, w: 3, h: 40, d: 3, color: '#b03830', surface: 'metal', shadow: true });
        R.part({ x: 0, y: 38, z: 40 * sz, w: 27, h: 2, d: 3, color: '#b03830', surface: 'metal' });
      }
      // Spawns sit on open deck: clear of the firing step at z 74-82 and of
      // the corner cover at z 54-62.
      return {
        blue: [[0, 3, 70], [-10, 3, 66], [10, 3, 66], [-30, 3, 70], [30, 3, 70]],
        red: [[0, 3, -70], [-10, 3, -66], [10, 3, -66], [-30, 3, -70], [30, 3, -70]],
        killY: -70,
      };
    },
  },

  /* ----------------------------------------------------------- Crossroads */
  {
    id: 'crossroads', name: 'Crossroads', sizes: [1, 2, 3, 4], big: false,
    sky: '#8ec8e8', fog: [0.0018, '#a8d8ee'], sun: ['#fff4d8', 1.1], amb: ['#a8c0d8', 0.66],
    blurb: 'Four roads, four bunkers, a river through the middle. The old classic.',
    build(rng) {
      const half = 96;
      B.floor(0, 0, half * 2, half * 2, '#4f9a3f', 'grass');
      B.arenaWalls(half, 24, '#6a8a5a', 'plastic');
      // Roads forming the cross.
      B.floor(0, 0, 22, half * 2, '#9a9a92', 'concrete', 0.2);
      B.floor(0, 0, half * 2, 22, '#9a9a92', 'concrete', 0.2);
      // The river cutting diagonally, with two plank bridges.
      B.waterSlab(0, 54, half * 2, 18, 0.6, '#3a86c8');
      B.floor(-30, 54, 20, 20, '#8a7a62', 'wood', 1.2);
      B.floor(30, 54, 20, 20, '#8a7a62', 'wood', 1.2);
      // Four corner bunkers, the Crossroads silhouette.
      const bunker = (x, z, col) => {
        R.part({ x, y: 0, z, w: 26, h: 12, d: 26, color: col, surface: 'concrete', shadow: true });
        R.part({ x, y: 12, z, w: 30, h: 2, d: 30, color: '#8a8a82', surface: 'concrete' });
        // Battlements.
        for (let i = -2; i <= 2; i++) {
          R.part({ x: x + i * 6, y: 14, z: z - 14, w: 4, h: 3, d: 2, color: '#8a8a82', surface: 'concrete' });
          R.part({ x: x + i * 6, y: 14, z: z + 14, w: 4, h: 3, d: 2, color: '#8a8a82', surface: 'concrete' });
          R.part({ x: x - 14, y: 14, z: z + i * 6, w: 2, h: 3, d: 4, color: '#8a8a82', surface: 'concrete' });
          R.part({ x: x + 14, y: 14, z: z + i * 6, w: 2, h: 3, d: 4, color: '#8a8a82', surface: 'concrete' });
        }
        B.ramp(x, 0, z + 20, 10, 20, '#8a8a82', Math.PI, 'concrete', 12);
      };
      bunker(-54, -54, '#a8a49a'); bunker(54, -54, '#a8a49a');
      bunker(-54, 20, '#a8a49a'); bunker(54, 20, '#a8a49a');
      // Centre: a small walled square with a tower.
      R.part({ x: 0, y: 0, z: 0, w: 5, h: 22, d: 5, color: '#b8b4aa', surface: 'concrete', shadow: true });
      R.part({ x: 0, y: 22, z: 0, w: 14, h: 1.5, d: 14, color: '#a8a49a', surface: 'concrete' });
      B.quad({ x: 16, y: 0, z: 16, w: 8, h: 7, d: 8, color: '#8a6a4a', surface: 'wood', shadow: true });
      // Trees and barrels for cover.
      for (let i = 0; i < 16; i++) {
        const x = R.lerp(-half + 14, half - 14, rng()), z = R.lerp(-half + 14, half - 14, rng());
        if (Math.abs(x) < 16 || Math.abs(z) < 16) continue;
        if (Math.abs(z - 54) < 14) continue;
        R.part({ x, y: 0, z, w: 2.5, h: 10, d: 2.5, color: '#6a4a2a', surface: 'wood', shadow: true });
        R.part({ x, y: 9, z, w: 12, h: 9, d: 12, color: '#3f8a2f', surface: 'grass', decor: true, shadow: true });
      }
      return {
        blue: [[0, 3, 84], [-14, 3, 84], [14, 3, 84], [-28, 3, 80], [28, 3, 80]],
        red: [[0, 3, -84], [-14, 3, -84], [14, 3, -84], [-28, 3, -80], [28, 3, -80]],
        killY: -40,
      };
    },
  },

  /* ------------------------------------------------------- Big Crossroads */
  {
    id: 'bigcrossroads', name: 'Big Crossroads', sizes: [4, 5], big: true,
    sky: '#8ec8e8', fog: [0.0014, '#a8d8ee'], sun: ['#fff4d8', 1.1], amb: ['#a8c0d8', 0.66],
    blurb: 'Crossroads at 5v5 scale: longer roads, bigger keeps, two rivers.',
    build(rng) {
      const half = 140;
      B.floor(0, 0, half * 2, half * 2, '#4f9a3f', 'grass');
      B.arenaWalls(half, 30, '#6a8a5a', 'plastic');
      B.floor(0, 0, 28, half * 2, '#9a9a92', 'concrete', 0.2);
      B.floor(0, 0, half * 2, 28, '#9a9a92', 'concrete', 0.2);
      for (const sz of [1, -1]) {
        B.waterSlab(0, 70 * sz, half * 2, 22, 0.6, '#3a86c8');
        B.floor(-44, 70 * sz, 24, 26, '#8a7a62', 'wood', 1.2);
        B.floor(44, 70 * sz, 24, 26, '#8a7a62', 'wood', 1.2);
      }
      const keep = (x, z) => {
        R.part({ x, y: 0, z, w: 36, h: 16, d: 36, color: '#a8a49a', surface: 'concrete', shadow: true });
        R.part({ x, y: 16, z, w: 42, h: 2, d: 42, color: '#8a8a82', surface: 'concrete' });
        R.part({ x, y: 18, z, w: 10, h: 12, d: 10, color: '#b8b4aa', surface: 'concrete', shadow: true });
        B.ramp(x, 0, z + 28, 12, 26, '#8a8a82', Math.PI, 'concrete', 16);
      };
      keep(-80, -80); keep(80, -80); keep(-80, 80); keep(80, 80);
      R.part({ x: 0, y: 0, z: 0, w: 7, h: 30, d: 7, color: '#b8b4aa', surface: 'concrete', shadow: true });
      R.part({ x: 0, y: 30, z: 0, w: 20, h: 2, d: 20, color: '#a8a49a', surface: 'concrete' });
      B.cover(rng, half - 34, 12, ['#8a6a4a', '#a8a49a', '#6a8a5a']);
      for (let i = 0; i < 30; i++) {
        const x = R.lerp(-half + 16, half - 16, rng()), z = R.lerp(-half + 16, half - 16, rng());
        if (Math.abs(x) < 20 || Math.abs(z) < 20) continue;
        R.part({ x, y: 0, z, w: 3, h: 12, d: 3, color: '#6a4a2a', surface: 'wood', shadow: true });
        R.part({ x, y: 11, z, w: 14, h: 10, d: 14, color: '#3f8a2f', surface: 'grass', decor: true, shadow: true });
      }
      return {
        blue: [[0, 3, 124], [-20, 3, 124], [20, 3, 124], [-40, 3, 118], [40, 3, 118]],
        red: [[0, 3, -124], [-20, 3, -124], [20, 3, -124], [-40, 3, -118], [40, 3, -118]],
        killY: -40,
      };
    },
  },

  /* -------------------------------------------------------------- Station */
  {
    id: 'station', name: 'Station', sizes: [1, 2, 3, 4], big: false,
    sky: '#3a4450', fog: [0.004, '#2a3038'], sun: ['#c8d8f0', 0.7], amb: ['#6a7a90', 1.0],
    blurb: 'Underground platforms, two trains, pillars everywhere. Close and loud.',
    build(rng) {
      const half = 84;
      B.floor(0, 0, half * 2, half * 2, '#767870', 'tile');
      // Ceiling and outer walls make it a box.
      R.part({ x: 0, y: 30, z: 0, w: half * 2, h: 2, d: half * 2, color: '#4a4a48', surface: 'concrete' });
      B.arenaWalls(half, 30, '#7a7a74', 'tile');
      // Two track trenches with trains parked in them.
      for (const sx of [-46, 46]) {
        R.part({ x: sx, y: -6, z: 0, w: 26, h: 1, d: half * 2, color: '#3a3a38', surface: 'concrete' });
        R.part({ x: sx - 13, y: -6, z: 0, w: 1.5, h: 6, d: half * 2, color: '#6a6a66', surface: 'concrete' });
        R.part({ x: sx + 13, y: -6, z: 0, w: 1.5, h: 6, d: half * 2, color: '#6a6a66', surface: 'concrete' });
        for (const rz of [-6.5, 6.5]) R.part({ x: sx + rz, y: -5, z: 0, w: 1.2, h: 0.6, d: half * 2, color: '#9a9a94', surface: 'metal' });
        // Train cars: solid boxes you can climb and fight over.
        for (const cz of [-50, -16, 20, 56]) {
          R.part({ x: sx, y: -4.5, z: cz, w: 22, h: 16, d: 30, color: sx < 0 ? '#c04840' : '#3a6ac0', surface: 'metal', shadow: true });
          R.part({ x: sx, y: 11.5, z: cz, w: 24, h: 1.5, d: 32, color: '#8a8a84', surface: 'metal' });
          for (const w of [-10, 10]) R.part({ x: sx + w, y: 1, z: cz, w: 1, h: 7, d: 18, color: '#dff0ff', surface: 'glass', decor: true, opacity: 0.4 });
        }
        B.ramp(sx, -6, 70, 12, 20, '#6a6a66', Math.PI, 'concrete', 6);
      }
      // Central concourse with pillars and a mezzanine.
      for (let i = -2; i <= 2; i++) for (const z of [-40, 0, 40]) {
        R.part({ x: i * 14, y: 0, z, w: 4, h: 30, d: 4, color: '#b8b0a0', surface: 'tile', shadow: true });
      }
      R.part({ x: 0, y: 14, z: 0, w: 60, h: 1.5, d: 34, color: '#9a9288', surface: 'tile', shadow: true });
      B.ramp(0, 0, 26, 14, 24, '#9a9288', Math.PI, 'tile', 14);
      B.ramp(0, 0, -26, 14, 24, '#9a9288', 0, 'tile', 14);
      // Benches, kiosks, vending machines.
      B.quad({ x: 22, y: 0, z: 56, w: 10, h: 8, d: 6, color: '#c8a848', surface: 'metal', shadow: true });
      B.quad({ x: 8, y: 0, z: 30, w: 8, h: 2.5, d: 3, color: '#8a6a4a', surface: 'wood' });
      // Fluorescent strips.
      for (const z of [-60, -20, 20, 60]) {
        R.part({ x: 0, y: 28.5, z, w: 70, h: 0.4, d: 2, color: '#fff8e0', surface: 'neon', decor: true });
        B.light(0, 26, z, '#dfe8ff', 1.1, 90);
      }
      return {
        blue: [[0, 3, 72], [-14, 3, 72], [14, 3, 72], [-26, 3, 66], [26, 3, 66]],
        red: [[0, 3, -72], [-14, 3, -72], [14, 3, -72], [-26, 3, -66], [26, 3, -66]],
        killY: -60,
      };
    },
  },

  /* ----------------------------------------------------------------- Onyx */
  {
    id: 'onyx', name: 'Onyx', sizes: [1, 2, 3], big: false,
    sky: '#0a0a10', fog: [0.006, '#0d0d14'], sun: ['#6a7aff', 0.5], amb: ['#5a6490', 1.5],
    blurb: 'Black stone and cold neon. Tight, symmetric, and every sightline is short.',
    build(rng) {
      const half = 66;
      B.floor(0, 0, half * 2, half * 2, '#24242e', 'tile');
      R.part({ x: 0, y: 36, z: 0, w: half * 2, h: 2, d: half * 2, color: '#0e0e13', surface: 'concrete' });
      B.arenaWalls(half, 36, '#2a2a36', 'concrete');
      // Neon floor seams.
      for (const z of [-44, -22, 0, 22, 44]) R.part({ x: 0, y: -0.4, z, w: half * 2, h: 0.3, d: 0.6, color: '#19ffd0', surface: 'neon', decor: true });
      for (const x of [-44, -22, 22, 44]) R.part({ x, y: -0.4, z: 0, w: 0.6, h: 0.3, d: half * 2, color: '#19ffd0', surface: 'neon', decor: true });
      // A ring of pillars, each with a neon band.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = 34;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        R.part({ x, y: 0, z, w: 7, h: 36, d: 7, color: '#32323f', surface: 'concrete', shadow: true });
        R.part({ x, y: 9, z, w: 7.4, h: 1, d: 7.4, color: '#b388ff', surface: 'neon', decor: true });
        B.light(x, 12, z, '#8a66ff', 0.6, 44);
      }
      // Centre dais, two levels, neon rim.
      R.part({ x: 0, y: 0, z: 0, w: 24, h: 5, d: 24, color: '#34343f', surface: 'tile', shadow: true });
      R.part({ x: 0, y: 5, z: 0, w: 26, h: 0.6, d: 26, color: '#19ffd0', surface: 'neon', decor: true });
      R.part({ x: 0, y: 5.6, z: 0, w: 12, h: 5, d: 12, color: '#3e3e4a', surface: 'tile', shadow: true });
      B.light(0, 14, 0, '#19ffd0', 1.4, 70);
      B.ramp(0, 0, -20, 12, 16, '#34343f', 0, 'tile', 5);
      B.ramp(0, 0, 20, 12, 16, '#34343f', Math.PI, 'tile', 5);
      // Flank boxes.
      B.quad({ x: 50, y: 0, z: 26, w: 12, h: 11, d: 12, color: '#30303c', surface: 'concrete', shadow: true });
      B.quad({ x: 50, y: 11, z: 26, w: 13, h: 0.5, d: 13, color: '#ff3a7a', surface: 'neon', decor: true });
      B.mirrorX({ x: 24, y: 0, z: 0, w: 5, h: 14, d: 20, color: '#30303c', surface: 'concrete', shadow: true });
      return {
        blue: [[0, 3, 56], [-12, 3, 56], [12, 3, 56], [-24, 3, 52], [24, 3, 52]],
        red: [[0, 3, -56], [-12, 3, -56], [12, 3, -56], [-24, 3, -52], [24, 3, -52]],
        killY: -40,
      };
    },
  },

  /* ------------------------------------------------------------ Dimension */
  {
    id: 'dimension', name: 'Dimension', sizes: [1, 2, 3], big: false,
    sky: '#1a0a2a', fog: [0.0035, '#2a1040'], sun: ['#c8a0ff', 0.8], amb: ['#6a4a9a', 1.0],
    blurb: 'Floating slabs in a purple void. Miss a jump and the void takes the round.',
    build(rng) {
      // No floor at all: islands over nothing.
      const island = (x, y, z, w, d, col) => {
        R.part({ x, y: y - 1.5, z, w, h: 1.5, d, color: col, surface: 'studs', shadow: true });
        R.part({ x, y: y - 4, z, w: w * 0.7, h: 2.5, d: d * 0.7, color: '#2a1a40', surface: 'concrete' });
      };
      // Two spawn islands and a big centre.
      island(0, 0, 70, 50, 34, '#6a4a9a');
      island(0, 0, -70, 50, 34, '#6a4a9a');
      island(0, 4, 0, 54, 54, '#8a5aba');
      R.part({ x: 0, y: 4, z: 0, w: 16, h: 12, d: 16, color: '#b388ff', surface: 'neon', decor: true, opacity: 0.8 });
      B.light(0, 14, 0, '#b388ff', 2, 120);
      // Stepping stones between them.
      for (const sz of [1, -1]) {
        island(0, 2, 40 * sz, 22, 18, '#7a4aa8');
        island(-30, 6, 30 * sz, 16, 16, '#7a4aa8');
        island(30, 6, 30 * sz, 16, 16, '#7a4aa8');
        island(-46, 1, 0, 20, 26, '#7a4aa8');
        island(46, 1, 0, 20, 26, '#7a4aa8');
      }
      // Floating cover cubes that also serve as jump pads visually.
      for (let i = 0; i < 12; i++) {
        const a = rng() * Math.PI * 2, r = 20 + rng() * 44;
        const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 10 + rng() * 22;
        R.part({ x, y, z, w: 7, h: 7, d: 7, color: rng() > 0.5 ? '#b388ff' : '#5a3a8a', surface: 'plastic', shadow: true });
      }
      // Rings of neon around the centre for orientation.
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        R.part({ x: Math.cos(a) * 36, y: 24, z: Math.sin(a) * 36, w: 2, h: 2, d: 2, color: '#19d0ff', surface: 'neon', decor: true });
      }
      return {
        blue: [[0, 3, 70], [-14, 3, 70], [14, 3, 70], [-20, 3, 64], [20, 3, 64]],
        red: [[0, 3, -70], [-14, 3, -70], [14, 3, -70], [-20, 3, -64], [20, 3, -64]],
        killY: -60,
      };
    },
  },

  /* --------------------------------------------------------------- Splash */
  {
    id: 'splash', name: 'Splash', sizes: [1, 2, 3, 4], big: false,
    sky: '#9fe0f8', fog: [0.0014, '#c0eeff'], sun: ['#fffbe8', 1.2], amb: ['#bfe4f8', 0.72],
    blurb: 'A pool park: shallow water, slides, inflatables. Bright, loud, and slippery.',
    build(rng) {
      const half = 80;
      B.floor(0, 0, half * 2, half * 2, '#d9c58c', 'sand');
      B.arenaWalls(half, 20, '#d8c890', 'plastic');
      // The big pool in the middle, waded through rather than swum.
      R.part({ x: 0, y: -4, z: 0, w: 70, h: 1, d: 70, color: '#3aa8d8', surface: 'tile' });
      for (const [x, z, w, d] of [[0, -36, 70, 2], [0, 36, 70, 2], [-36, 0, 2, 70], [36, 0, 2, 70]]) {
        R.part({ x, y: -4, z, w, h: 4, d, color: '#dfe8ee', surface: 'tile' });
      }
      B.waterSlab(0, 0, 70, 70, -0.6, '#2f9ad8');
      // Pool-side cover: loungers, planters, a bar.
      B.quad({ x: 50, y: 0, z: 50, w: 16, h: 9, d: 16, color: '#ff8a4a', surface: 'plastic', shadow: true });
      B.quad({ x: 50, y: 9, z: 50, w: 18, h: 1, d: 18, color: '#ffd24a', surface: 'plastic' });
      B.mirrorX({ x: 52, y: 0, z: 0, w: 8, h: 6, d: 26, color: '#4ad8b0', surface: 'plastic', shadow: true });
      B.mirrorZ({ x: 0, y: 0, z: 52, w: 26, h: 6, d: 8, color: '#4ad8b0', surface: 'plastic', shadow: true });
      // Two water slides: tall towers with ramps down into the pool.
      for (const sx of [-1, 1]) {
        R.part({ x: 58 * sx, y: 0, z: -58, w: 12, h: 26, d: 12, color: '#ff5a8a', surface: 'plastic', shadow: true });
        R.part({ x: 58 * sx, y: 26, z: -58, w: 14, h: 1, d: 14, color: '#ffd24a', surface: 'plastic' });
        B.ramp(58 * sx, 0, -42, 10, 30, '#ff8ab0', Math.PI, 'plastic', 26);
        B.ramp(44 * sx, 0, -22, 10, 34, '#ff8ab0', Math.PI * (sx > 0 ? 0.82 : 1.18), 'plastic', 12);
      }
      // Inflatables floating in the pool: solid platforms.
      for (let i = 0; i < 7; i++) {
        const x = R.lerp(-28, 28, rng()), z = R.lerp(-28, 28, rng());
        R.part({ x, y: -1.2, z, w: 10, h: 1.2, d: 10, color: R.pick(['#ffd24a', '#ff6a8a', '#4ad8ff', '#8aff6a']), surface: 'plastic', shadow: true });
      }
      // Diving platform in the centre.
      R.part({ x: 0, y: -4, z: 0, w: 6, h: 18, d: 6, color: '#dfe8ee', surface: 'tile', shadow: true });
      R.part({ x: 0, y: 14, z: 0, w: 18, h: 1.2, d: 18, color: '#dfe8ee', surface: 'tile', shadow: true });
      return {
        blue: [[0, 3, 68], [-14, 3, 68], [14, 3, 68], [-28, 3, 64], [28, 3, 64]],
        red: [[0, 3, -68], [-14, 3, -68], [14, 3, -68], [-28, 3, -64], [28, 3, -64]],
        killY: -40,
      };
    },
  },

  /* ------------------------------------------------------------ Backrooms */
  {
    id: 'backrooms', name: 'Backrooms', sizes: [1, 2, 3], big: false,
    sky: '#b8a858', fog: [0.012, '#c0b060'], sun: ['#fff0a0', 0.45], amb: ['#c8b870', 1.5],
    blurb: 'Yellow wallpaper, damp carpet, humming lights. A maze with no sightlines.',
    build(rng) {
      const half = 76, H = 14;
      B.floor(0, 0, half * 2, half * 2, '#9a8a4a', 'carpet');
      R.part({ x: 0, y: H, z: 0, w: half * 2, h: 2, d: half * 2, color: '#c8bc78', surface: 'tile' });
      B.arenaWalls(half, H, '#c8b860', 'plastic');
      // A maze on a 19-stud grid, carved so it stays connected and symmetric.
      const step = 19, n = Math.floor(half * 2 / step);
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
          const x = -half + i * step, z = -half + j * step;
          // Spawn corridors at the north and south edges stay clear.
          if (Math.abs(z) > half - step * 1.2) continue;
          if (rng() > 0.46) {
            const len = step * (rng() > 0.6 ? 2 : 1);
            R.part({ x: x + len / 2, y: 0, z, w: len, h: H, d: 2, color: '#c8b860', surface: 'plastic', shadow: true });
          }
          if (rng() > 0.52) {
            const len = step * (rng() > 0.6 ? 2 : 1);
            R.part({ x, y: 0, z: z + len / 2, w: 2, h: H, d: len, color: '#c8b860', surface: 'plastic', shadow: true });
          }
        }
      }
      // Fluorescent panels, the only light.
      for (let i = 0; i < 26; i++) {
        const x = R.lerp(-half + 10, half - 10, rng()), z = R.lerp(-half + 10, half - 10, rng());
        R.part({ x, y: H - 0.6, z, w: 8, h: 0.4, d: 2.5, color: '#fffbd0', surface: 'neon', decor: true });
        if (i < 14) B.light(x, H - 2, z, '#fff4c0', 0.85, 54);
      }
      // Damp patches and stacked boxes for cover.
      for (let i = 0; i < 18; i++) {
        const x = R.lerp(-half + 12, half - 12, rng()), z = R.lerp(-half + 12, half - 12, rng());
        B.crate(x, z, 4 + Math.floor(rng() * 3), '#8a7a4a', 'wood');
      }
      return {
        blue: [[0, 3, 66], [-16, 3, 66], [16, 3, 66], [-32, 3, 66], [32, 3, 66]],
        red: [[0, 3, -66], [-16, 3, -66], [16, 3, -66], [-32, 3, -66], [32, 3, -66]],
        killY: -40,
      };
    },
  },
];

R.mapById = id => R.MAPS.find(m => m.id === id);

/* ============================ map loading ============================ */

R.clearMap = function () {
  // Drop every world object but keep the particle systems and decals, which
  // are pooled and re-added on the next build.
  const keep = new Set([R.fx.points, R.fx.smoke, ...R.decals.pool, ...R.tracers.pool]);
  for (let i = R.scene.children.length - 1; i >= 0; i--) {
    const c = R.scene.children[i];
    if (keep.has(c)) continue;
    R.scene.remove(c);
    if (c.geometry && c.geometry.dispose && !c.userData.shared) c.geometry.dispose();
  }
  R.world.reset();
  R.maps.lights.length = 0;
  R.maps.water.length = 0;
  R.fx.clear(); R.decals.clear(); R.tracers.clear();
  R.clearProjectiles(); R.clearRagdolls();
};

R.loadMap = function (id) {
  const def = R.mapById(id) || R.MAPS[0];
  R.clearMap();

  R.scene.background = R.col(def.sky);
  R.scene.fog = new THREE.FogExp2(R.col(def.fog[1]), def.fog[0] * (R.settings.quality === 'low' ? 1.4 : 1));

  // The light budget is deliberately kept under 1.0 on a lit face: sun plus
  // ambient plus sky together used to exceed it, which washed every surface
  // out to white whatever colour the plastic was.
  const amb = new THREE.AmbientLight(R.col(def.amb[0]), def.amb[1] * 0.6);
  R.scene.add(amb);
  const hemi = new THREE.HemisphereLight(R.col(def.sky), R.col(def.amb[0]), 0.22);
  R.scene.add(hemi);
  const sun = new THREE.DirectionalLight(R.col(def.sun[0]), def.sun[1] * 0.95);
  sun.position.set(90, 160, 70);
  if (R.settings.quality === 'high') {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = 170;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.0012;
  }
  R.scene.add(sun);

  const rng = R.seeded(def.id);
  const info = def.build(rng) || {};
  R.maps.current = def;
  R.maps.spawns.blue = (info.blue || [[0, 3, 40]]).map(a => new THREE.Vector3(a[0], a[1], a[2]));
  R.maps.spawns.red = (info.red || [[0, 3, -40]]).map(a => new THREE.Vector3(a[0], a[1], a[2]));
  R.maps.spawns.ffa = R.maps.spawns.blue.concat(R.maps.spawns.red);
  R.maps.killY = info.killY != null ? info.killY : -120;
  return def;
};

// Is a point inside water? Splash and Crossroads use this to slow movement.
R.inWater = function (p) {
  for (const w of R.maps.water) {
    if (p.x > w.min.x && p.x < w.max.x && p.z > w.min.z && p.z < w.max.z && p.y > w.min.y && p.y < w.max.y) return true;
  }
  return false;
};

// Spawn choice: the friendly spawn furthest from the nearest live enemy.
R.pickSpawn = function (team, actors, self) {
  const list = team === 'ffa' ? R.maps.spawns.ffa : (R.maps.spawns[team] || R.maps.spawns.ffa);
  let best = list[0], bestScore = -Infinity;
  for (const s of list) {
    let near = Infinity;
    for (const a of actors || []) {
      if (a === self || a.dead) continue;
      if (self && R.modes.friendly(self, a)) continue;
      near = Math.min(near, a.pos.distanceTo(s));
    }
    const score = (near === Infinity ? 1000 : near) + Math.random() * 12;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best.clone();
};
