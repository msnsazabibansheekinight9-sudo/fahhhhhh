# Blockhaven

A browser voxel survival sandbox built with Three.js (r128). All textures, creature models, terrain, structures and sounds are generated in code. There are no asset files.

It plays like the classic block-survival games: mine, craft, build, farm, fight and explore. All art, creatures, names, dimensions and the boss are original designs.

Open `blockhaven/index.html` through a local web server (for example `python3 -m http.server` in the repo folder, then visit `/blockhaven/`). It needs a keyboard and mouse.

## What's in it

- **Three dimensions**
  - **Overworld**: 21 biomes (plains, forest, birch forest, dark forest, taiga, snowy taiga, snowy plains, desert, savanna, jungle, swamp, badlands, stony peaks, meadow, mushroom fields, ocean, frozen ocean, beach, snowy beach, river, frozen river) with caves, ravine-like tunnels, lava lakes deep down, ore veins and biome-specific trees.
  - **The Cinderdeep**: a fiery underworld reached through an **Ember Gate** (an obsidian frame lit with flint and steel; travel scales 8:1). It has four biomes: Cinder Wastes, Ember Forest, Gloom Valley and Ash Basin. There are lava seas, sunstone clusters, ember ore and rare duskiron ore.
  - **The Hollow**: void islands reached through the **Rift** in the Sealed Archive. A central island is ringed by obsidian pillars topped with Warding Crystals, and the **Hollow Warden** boss guards it. The Outer Hollow lies beyond.
- **156 blocks and 310 item types**: ores (coal, iron, copper, gold, lapis, cinnabar, diamond, emerald, ember, duskiron), stone types, six wood types with logs, planks, leaves and saplings, 16 wool colours, terracotta, crops, plants, utility blocks (crafting table, furnace, chest, barrel, bed, TNT, ladder, lamps, bell).
- **Tools and armour**: wood, stone, copper, iron, gold, diamond and duskiron tools (pickaxe, axe, shovel, hoe, sword), plus leather, chainmail, copper, iron, gold, diamond and duskiron armour, a bow and arrows, shears, buckets, flint and steel, and the Drift Cloak (slow falling).
- **171 crafting recipes** (shaped and shapeless, mirrored, with a recipe browser that fills the grid for you) and a furnace with fuel and smelting.
- **Survival**: health, hunger and saturation, armour, air, fall damage, fire and lava, poison, XP, day/night cycle, beds and spawn points, farming (hoe, seeds, crops, bone meal), saplings that grow into trees, breeding animals, milking, shearing, falling sand and gravel, leaf decay, and water and lava that make obsidian and cobblestone.
- **Creatures (all original designs)**
  - Passive: pig, cow, sheep (six wool colours), chicken (lays eggs).
  - Settlers: villagers in six professions with trades.
  - Overworld monsters: Shambler, Bone Archer, Cave Crawler, Blast Beetle, Bog Blob (splits), Gloom Wisp, Drifter.
  - Cinderdeep: Cinder Imp, Magma Hound, Ash Wraith, Ember Sentinel.
  - Boss: the Hollow Warden, with its Warding Crystals.
- **Structures, each with loot tables**
  - Overworld: villages with houses, farms, a well and a bell; dungeons with monster cages; abandoned mines; sun pyramids with a hidden vault; jungle shrines; bog huts; igloos with basements; shipwrecks; ocean ruins; ruined portals; watchtowers; woodland lodges; desert wells; and the Sealed Archive (library, store rooms, fountain, cells and the Rift Frame room).
  - Cinderdeep: Cinder Fortresses and Ashen Keeps.
  - Outer Hollow: lumen spires.
- **Progression journal (J)**: wood, then a crafting table, stone tools, iron, diamonds, an Ember Gate, the Cinderdeep, Ember Rods, Seeker Eyes (Drift Pearl plus Ember Dust; throw them to find the Archive), opening the Rift, defeating the Warden, the Drift Cloak and duskiron gear.
- **Creative mode** with flight and a searchable catalogue of every block and item.
- Saves to browser storage: every block change, chest and furnace contents, inventory, position and dimension, and progress.

## Controls

WASD move · Space jump (double-tap to fly in creative) · Shift sneak · Ctrl or double-tap W sprint · Left click mine/attack · Right click place/use/eat/draw bow · Middle click pick block · E inventory · 1–9 or wheel hotbar · Q drop · J journal · F3 debug · F1 hide HUD · Esc pause.

In inventories: shift-click to quick-move, right-click to split a stack, 1–9 to swap with the hotbar.

## Not included

- No multiplayer.
- No redstone-style circuitry, minecarts, boats, enchanting, brewing or note blocks.
- No doors, fences, slabs or stairs, because blocks are full cubes (ladders, plants and torches aside).
- Water does not spread sideways. It fills gaps and falls straight down.
- Creatures are not saved between sessions; they respawn naturally.
