# Steel Meridian

A 3D real-time strategy game about a future war, built with Three.js (r128). All models, terrain, textures, weather, effects and audio are generated in code. There are no asset files.

Play it at https://claude.ai/artifact/RGLg3BWVwQ4GctbAwNLbWZ (use the **Open in Chrome** link at the top of the menu for a full-screen tab), or open `meridian/index.html` in Chrome.

## Battles

- **Conquest.** Capture points to drain the enemy's 800 tickets. Destroyed units cost tickets too. Destroying the enemy headquarters wins outright.
- **Deployment.** Pick a 10-unit lineup in the Hangar. In battle you spend Command Points (income grows with captured points) to deploy from your HQ. Aircraft fly in from your map edge and leave when their loiter time ends. Ships launch from your naval dock on maps with sea access.
- **Combat.** Armor values against penetration, side and rear shots, turret traverse, accuracy falloff, smoke, flares, ECM, fog of war and sight ranges. Squads lose soldiers as they take damage.
- **27 abilities**, such as smoke screens, siege mode, jump jets, EMP, active camo, drone swarms, holo decoys, napalm, carpet bombing, torpedo spreads and an orbital lance.
- **AI commander** with four difficulties (Recruit, Veteran, Elite, Nightmare) that deploys counters, contests points, uses abilities and pushes your HQ late.

## 20 maps, each with fitting weather

Dune Sea of Erg Kharif, Khar'zul Canyons, Verdant Hell, Mekong Delta Rivers, Frostbite Ridge, Glacier Bay, Neo-Shanghai Ruins, Ashfall Caldera, Bonneville-9 Salt Flats, Coral Archipelago, Iron Steppe, Blackwood Forest, Caledon Highlands, Crater Field Omega, Serengeti Kopjes, Coastal Bastion, Tundra Pipeline, Bayou Basin, Fallen Star Debris Field and The Glass Desert.

Weather changes every one to three minutes and blends in. It changes how battles play: sandstorms and blizzards cut sight and accuracy, downpours and monsoons slow ground units in mud, sea squalls slow ships, acid rain corrodes hulls, ember storms and radiation fronts hurt infantry, ion storms boost energy weapons, and dry lightning can strike units. There are 24 weather types, including heatwaves, fog, freezing fog, ashfall, smog, marsh gas and aurora nights.

## Units and tech trees

- **4 factions:** Atlantic Coalition, Red Dawn Federation, Pacific Concord and Nova Syndicate. Each has its own design language, palette, naming and stat bonus.
- **608 tree units** across 5 branches (Infantry, Armor, Mechs, Aviation, Naval) and 6 ranks: rifle, anti-armor, marksman, exo-suit, jump and engineer squads; recon buggies, carriers, light, main battle and super-heavy tanks, tank destroyers, hover tanks, artillery and air defense; light walkers, battle mechs, heavy assault mechs, siege striders and titans; scout, attack and heavy helicopters, fighters, attack jets, bombers and drones; patrol boats, hovercraft, destroyers, cruisers, battleships and submarines.
- Research with RP, then buy with credits, War Thunder style.
- **Every unit has its own 10-node modification tree** paid with that unit's XP. Mods add stats, unlock up to three more abilities, and change the model: reactive armor blocks, new guns, exhaust stacks, antennas and camo nets.

## Shop, crates and battle pass

- **Flash sale** that refreshes twice a day (local midnight and noon): discounted skins, XP boosters, a quick unlock of a random unit from anywhere in the trees, and a credit bundle.
- **Limited giveaways** each week: two exclusive vehicles found in no tech tree, very expensive.
- **Camouflage showcase**: 24 patterns (woodland to galaxy, chrome, gold and prismatic holo) sold for specific units. Each skin carries real bonuses such as armor, speed, fire rate, stealth, unit XP or credits.
- **Crates**: Supply, Veteran, Elite and Mythic. Rarer pools cost more, odds are shown, and a reel animation reveals the drop. Thirty crate-exclusive vehicles exist.
- **Battle pass**: a new season every two weeks with 50 tiers on free and premium tracks, five season-exclusive vehicles and season skins.
- Daily orders, a daily supply drop, a profile with service record, and graphics and audio settings.

## Controls

Left-click or drag to select, right-click to move or attack, **F** attack-move, **Z X C V** abilities, **Ctrl+1–9** groups, **H** halt, **R** rally point, **Space** focus, **WASD**, arrows or screen edges to pan, **Q/E** or middle-drag to rotate, wheel to zoom, **Esc** pause. Touch: drag to pan, pinch to zoom, tap to select or order.

## Code

`js/data.js` factions, classes, abilities, tech lines, skins, maps and weather · `js/textures.js` procedural camo and sprites · `js/models.js` unit, HQ and objective models with animation rigs · `js/terrain.js` heightfields, roads, bridges, navigation and scenery · `js/fx.js` particles and weather · `js/audio.js` synthesized sound · `js/battle.js` simulation and AI · `js/battle_ui.js` camera, input and HUD · `js/meta.js` progression · `js/ui.js` menus.

`tools/build_single.py` bundles everything into one HTML file.
