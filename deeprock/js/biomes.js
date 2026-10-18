/* Rock & Stone — biome definitions. Each biome drives the rock palette, the
   fog, the ambient light, which props grow on the walls and what hazards the
   cave throws at you. Ore colours stay constant so you can read a seam
   anywhere in the galaxy. */
(function (RS) {
  'use strict';
  var MAT = RS.MAT;

  // Ore colours, shared by every biome.
  var ORE = {
    NITRA: 0xd4411f,     // red-orange — pays for resupply
    MORKITE: 0x27d6a0,   // teal — the primary mining quota
    GOLD: 0xffc436,
    CRYSTAL: 0xb43ae0    // jewels / aquarqs
  };
  RS.ORE = ORE;

  function biome(o) { return o; }

  RS.BIOMES = [
    biome({
      id: 'crystal', name: 'Crystalline Caverns',
      rock: 0x3b4660, rock2: 0x626f8d, dirt: 0x2d3346, hard: 0x8d9ab8, mud: 0x343a4c, ice: 0x8fb6cc,
      fog: 0x070c18, fogNear: 14, fogFar: 72, ambient: 0x1b2440, ambientPower: 0.17,
      glow: 0x7fd8ff, props: ['crystal', 'crystal', 'stalag', 'shard'], propDensity: 1.0,
      hazard: null,
      desc: 'Vast blue halls studded with glowing crystal. Watch the spires.'
    }),
    biome({
      id: 'salt', name: 'Salt Pits',
      rock: 0x8d7f5d, rock2: 0xb0a385, dirt: 0x8b7c5c, hard: 0xc4bb9e, mud: 0x6e6248, ice: 0xe6e0cc,
      fog: 0x16120c, fogNear: 16, fogFar: 80, ambient: 0x2e2a20, ambientPower: 0.2,
      glow: 0xffe9b0, props: ['saltpillar', 'stalag', 'shard'], propDensity: 0.85,
      hazard: null,
      desc: 'Dry, bright and brittle. Salt crusts crack under the boots.'
    }),
    biome({
      id: 'fungus', name: 'Fungus Bogs',
      rock: 0x47492c, rock2: 0x6d6f3c, dirt: 0x3a3a22, hard: 0x8a8c58, mud: 0x2e3318, ice: 0x6a7a52,
      fog: 0x0d120a, fogNear: 10, fogFar: 56, ambient: 0x1c2412, ambientPower: 0.16,
      glow: 0xa8ff5c, props: ['mushroom', 'mushroom', 'vine', 'stalag'], propDensity: 1.3,
      hazard: 'spores',
      desc: 'Wet, close and overgrown. The fungus glows; the puddles do not.'
    }),
    biome({
      id: 'rad', name: 'Radioactive Exclusion Zone',
      rock: 0x414a40, rock2: 0x5d6a56, dirt: 0x343a32, hard: 0x7e8a76, mud: 0x2a3028, ice: 0x6f8a68,
      fog: 0x08120a, fogNear: 12, fogFar: 64, ambient: 0x16281a, ambientPower: 0.18,
      glow: 0x86ff3c, props: ['radcrystal', 'stalag', 'shard'], propDensity: 1.0,
      hazard: 'radiation',
      desc: 'Hot in every sense. The green glow is not a light source, it is a warning.'
    }),
    biome({
      id: 'biozone', name: 'Dense Biozone',
      rock: 0x3b5433, rock2: 0x567a46, dirt: 0x2f4028, hard: 0x7fa060, mud: 0x253320, ice: 0x6d9a5a,
      fog: 0x0b160c, fogNear: 10, fogFar: 54, ambient: 0x1a2a16, ambientPower: 0.2,
      glow: 0xffb13c, props: ['plant', 'vine', 'mushroom', 'plant'], propDensity: 1.5,
      hazard: null,
      desc: 'Choked with growth. Something eats the plants, and something eats that.'
    }),
    biome({
      id: 'glacial', name: 'Glacial Strata',
      rock: 0x5d7a92, rock2: 0x8fb2c8, dirt: 0x5f7788, hard: 0xaecadb, mud: 0x4a5e6c, ice: 0xa8cde0,
      fog: 0x0b1620, fogNear: 18, fogFar: 88, ambient: 0x1e2c3a, ambientPower: 0.22,
      glow: 0x9fe4ff, props: ['icespike', 'icespike', 'stalag'], propDensity: 1.0,
      hazard: 'cold',
      desc: 'Blue ice over black rock. Keep moving or freeze solid.'
    }),
    biome({
      id: 'magma', name: 'Magma Core',
      rock: 0x332622, rock2: 0x4e3a32, dirt: 0x281e1a, hard: 0x6b5048, mud: 0x1e1614, ice: 0x5a4038,
      fog: 0x160805, fogNear: 10, fogFar: 58, ambient: 0x331408, ambientPower: 0.24,
      glow: 0xff6a1e, props: ['lavacrack', 'stalag', 'shard'], propDensity: 0.9,
      hazard: 'heat',
      desc: 'Basalt and firelight. The floor is occasionally a suggestion.'
    }),
    biome({
      id: 'azure', name: 'Azure Weald',
      rock: 0x443a66, rock2: 0x5f5490, dirt: 0x342c50, hard: 0x8276b8, mud: 0x2a2440, ice: 0x7a6fae,
      fog: 0x0a0816, fogNear: 14, fogFar: 70, ambient: 0x1e1838, ambientPower: 0.2,
      glow: 0x5ce8d0, props: ['plant', 'crystal', 'vine'], propDensity: 1.2,
      hazard: null,
      desc: 'Violet rock and cyan growth. Beautiful, and absolutely full of bugs.'
    }),
    biome({
      id: 'bough', name: 'Hollow Bough',
      rock: 0x4a3626, rock2: 0x6b4e34, dirt: 0x3a2a1c, hard: 0x8a6a46, mud: 0x2c2016, ice: 0x7a5a3a,
      fog: 0x120a06, fogNear: 12, fogFar: 60, ambient: 0x2a1a10, ambientPower: 0.18,
      glow: 0xff5c6a, props: ['root', 'vine', 'thorn', 'plant'], propDensity: 1.4,
      hazard: 'thorns',
      desc: 'Grown, not dug. Everything in here has barbs.'
    }),
    biome({
      id: 'sand', name: 'Sandblasted Corridors',
      rock: 0x7a6038, rock2: 0x9c8252, dirt: 0x6f583a, hard: 0xb49c6c, mud: 0x5a4830, ice: 0xc0a878,
      fog: 0x140e07, fogNear: 16, fogFar: 78, ambient: 0x2e2416, ambientPower: 0.2,
      glow: 0xffd27a, props: ['stalag', 'shard', 'saltpillar'], propDensity: 0.8,
      hazard: null,
      desc: 'Wind-cut sandstone ribs. Dry, open, and very exposed.'
    })
  ];

  // typo guard: keep every colour a real number
  RS.BIOMES.forEach(function (b) {
    if (typeof b.ambient !== 'number' || !isFinite(b.ambient)) b.ambient = 0x202838;
  });

  RS.biomeById = function (id) {
    for (var i = 0; i < RS.BIOMES.length; i++) if (RS.BIOMES[i].id === id) return RS.BIOMES[i];
    return RS.BIOMES[0];
  };

  // Vertex-colour palette for the mesher, indexed by material id.
  RS.palleteFor = RS.paletteFor = function (b) {
    var p = new Float32Array(16 * 3);
    function put(id, hex) {
      p[id * 3] = ((hex >> 16) & 255) / 255;
      p[id * 3 + 1] = ((hex >> 8) & 255) / 255;
      p[id * 3 + 2] = (hex & 255) / 255;
    }
    put(MAT.ROCK, b.rock);
    put(MAT.DIRT, b.dirt);
    put(MAT.NITRA, ORE.NITRA);
    put(MAT.MORKITE, ORE.MORKITE);
    put(MAT.GOLD, ORE.GOLD);
    put(MAT.CRYSTAL, ORE.CRYSTAL);
    put(MAT.HARD, b.hard);
    put(MAT.MUD, b.mud);
    put(MAT.ICE, b.ice);
    return p;
  };
})(window.RS);
