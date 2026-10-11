# Starfront: Legions of the Galaxy

A browser sci-fi "battlefront"-style shooter built with Three.js (r128). Everything is procedural: models, maps, effects and audio. No asset files. All names, characters and designs are original stand-ins for the genre.

Open `starfront/index.html` (serve the repo, e.g. `python3 -m http.server`, then visit `/starfront/`).

## Content
- **3 eras**: Concord Wars (Legion vs Synth Host), Rebellion (Free Alliance vs Dominion), Outer Rim Reckoning (Rim Rangers vs Dominion Remnant), plus native factions for Hunt modes.
- **74 battlefields** (61 ground, 13 space) across 33 planets, grouped by the classic game they are modelled on (Classic I, Classic II, Squadron Saga, Reboot I, Reboot II, Rim Tales). Generated from 30+ biomes and 14 layouts with collision and a navigation grid for bots.
- **28 modes + Sector Conquest campaign**: Conquest, Supremacy, Capital Supremacy, Frontline Assault, Turning Point, Colossus Assault, Extraction, Sabotage, CTF, One-Flag CTF, Cargo, Jetpack Cargo, Strike, Drop Zone, Synth Run, Blast, Hunt, Forest Hunt, Legends Assault, Champions vs Tyrants, Legends Showdown, Legend Hunt, Survival, Co-op Onslaught, Fighter Squadron, Starfighter Assault, Space Assault, Legend Starships.
- **34 legends** with blades or blasters and 3 abilities each; 6 classes + 4 reinforcements per faction; ~80 weapons with heat; 15 star cards; 41 vehicles (speeders, hover tanks, 2/4/6-legged walkers, starfighters, legend ships) and capital ships with destructible subsystems.
- **Armoury**: ~320 weapons (each faction has its own manufacturers and ~40 generated designs with their own stats and model proportions), 26 attachments across optics, barrels, grips, cooling and power cells (they change stats and appear on the model), and 18 paint finishes.
- **Trooper customisation** per faction and class with a live 3D preview: 22 armour colours for primary, secondary and undersuit, 8 visor tints, 8 helmet styles, 8 marking patterns, pauldrons, kamas, capes, packs, gauntlets and body build. Bots get varied looks and loadouts too.
- **Rendering**: procedural albedo + normal maps (armour panels, cloth weave, bark, rock, ground, sci-fi panels), triplanar world texturing, sky-based image lighting, displaced rocks, branching trees, wind-blown instanced grass, animated water and textured clouds.
- **Animation**: blended poses, gait with knee and foot roll, lean into turns and acceleration, breathing, weapon sway and recoil, foot placement on slopes, directional hit reactions, four physics-driven death variants, four-hit blade combos with wind-up, lunge and follow-through, deflection reactions, venting, emotes and cloth/cape spring motion.
- **Progression**: credits and shards (earned only by playing), levels, 8 battle passes with free and premium tracks, a shop with daily featured items, collection/loadouts, emotes, titles, daily challenges and career stats.

## Controls
WASD move, mouse look, LMB fire/swing, RMB aim/block, Shift sprint, Space jump/jetpack, Q/E/F abilities, R vent, V camera, B/5/6/7 emotes, G leave vehicle, Tab scoreboard, Esc pause. Touch controls on phones.
