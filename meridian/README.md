# Steel Meridian

A 3D real-time strategy game about a future war, built with Three.js (r128). All models, terrain, textures, weather, effects and audio are generated in code. There are no asset files.

Play it at https://claude.ai/artifact/RGLg3BWVwQ4GctbAwNLbWZ (use the **Open in Chrome** link at the top of the menu for a full-screen tab), or open `meridian/index.html` in Chrome.

## Battles

- **Conquest.** Capture points to drain the enemy's 800 tickets. Destroyed units cost tickets too. Destroying the enemy headquarters wins outright.
- **Deployment.** Pick a 10-unit lineup in the Hangar. In battle you spend Command Points (income grows with captured points) to deploy from your HQ. Aircraft fly in from your map edge and leave when their loiter time ends. Ships launch from your naval dock on maps with sea access.
- **Combat.** Armor values against penetration, side and rear shots, turret traverse, accuracy falloff, smoke, flares, ECM, fog of war and sight ranges. Squads lose soldiers as they take damage.
- **39 unit abilities**, such as smoke screens, siege mode, jump jets, EMP, active camo, drone swarms, holo decoys, napalm, carpet bombing, torpedo spreads, triage, lockdown fields, target designators, depth charges, barrier domes and an orbital lance.
- **36 stratagems** (see below) called in from off the map with T, Y, U and I.
- **AI commander** with four difficulties (Recruit, Veteran, Elite, Nightmare) that deploys counters, contests points, uses abilities and pushes your HQ late.

## 32 maps, each with fitting weather

Dune Sea of Erg Kharif, Khar'zul Canyons, Verdant Hell, Mekong Delta Rivers, Frostbite Ridge, Glacier Bay, Neo-Shanghai Ruins, Ashfall Caldera, Bonneville-9 Salt Flats, Coral Archipelago, Iron Steppe, Blackwood Forest, Caledon Highlands, Crater Field Omega, Serengeti Kopjes, Coastal Bastion, Tundra Pipeline, Bayou Basin, Fallen Star Debris Field, The Glass Desert, Great Rift Escarpment, Atoll Zero, Kolyma Penal Colony, Ares Basin (Mars), Tycho Mining Colony (the Moon), Amazon Floodplain, Eiger Fortress Line, Gobi Ironworks, Fjords of Nordheim, Monsoon Terraces, Bosporus Strait and the Necropolis of Ur.

Weather changes every one to three minutes and blends in. It changes how battles play: sandstorms and blizzards cut sight and accuracy, downpours and monsoons slow ground units in mud, sea squalls slow ships, acid rain corrodes hulls, ember storms and radiation fronts hurt infantry, ion storms boost energy weapons, and dry lightning can strike units. There are 32 weather types, including heatwaves, fog, freezing fog, ashfall, smog, marsh gas, aurora nights, hailstorms, meteor showers (impacts hit units), solar flares (abilities recharge slower), wildfires, sleet, cyclones and a blood moon (+10% damage).

## Units and tech trees

- **6 factions:** Atlantic Coalition, Red Dawn Federation, Pacific Concord, Nova Syndicate, the scrap-built Ashen Legion and the orbital Helios Directive. Each has its own design language, palette, naming and stat bonus.
- **1,998 tree units** in 57 classes across 5 branches (Infantry, Armor, Mechs, Aviation, Naval), 34 lines per faction and 7 ranks: rifle, anti-armor, marksman, exo-suit, jump, engineer, flame trooper, medic, synthetic, mortar and air-defense squads; recon buggies, carriers, armored cars, missile carriers, light, main battle, laser and super-heavy tanks, tank destroyers, assault guns, hover tanks, artillery, rocket trucks, EW vehicles and air defense; scout walkers, light walkers, jump mechs, battle mechs, heavy assault mechs, inferno mechs, artillery walkers, siege striders and titans; scout, attack and heavy helicopters, VTOL gunships, tiltrotors, fighters, interceptors, attack jets, bombers, stealth bombers and drones; patrol boats, missile boats, hovercraft, amphibious tanks, corvettes, destroyers, frigates, cruisers, battleships, drone carriers and submarines.
- Research with RP, then buy with credits, War Thunder style.
- **Every unit has its own 10-node modification tree** paid with that unit's XP. Mods add stats, unlock up to three more abilities, and change the model: reactive armor blocks, new guns, exhaust stacks, antennas and camo nets.
- **Every unit has its own customisation tree** of up to 29 cosmetic parts bought with credits, in five tiers. Higher tiers need the matching modification on that unit (slat cages need Reactive Armor, metallic paint needs the Mk.II Armament, kill marks need the Elite Package, the holo halo needs Prototype Systems). Parts include insignia, hull numbers, kill marks, skulls, shark mouths, wing stripes, sandbags, spare tracks, stowage, searchlights, camo nets, slat cages, dozer blades, ram spikes, pennants, signal flags, contrails, gold and chrome trim, matte/gloss/metallic/weathered/pearl finishes, light colours and tracer colours. Infantry get helmet netting, night goggles, packs, pauldrons, patches and capes. All of it renders on the 3D model.

## Stratagems

36 call-in support powers in six branches: Orbital Strikes (rail strike, barrage, a tracking orbital laser, EMP lance, kinetic rod storm, Annihilator Lance), Air Support (strafing run, missile strike, cluster bombs, napalm run, gunship on station, heavy bomber run), Logistics (supply drop, repair beacon, ammunition cache, fuel surge, field hospital, logistic overdrive), Fortifications (MG and missile sentries, flak battery, mortar pits, shield dome, smart minefield), Electronic Warfare (recon sweep, jammer field, hack uplink, spoofed signals, blackout, orbital scan) and Reinforcements (paratroopers, exo, armor, mech and heavy drops, Titanfall). Each is researched with RP, bought with credits, and has its own upgrade tree (cooldown, cost, payload, radius, count, a second "echo" strike, faster arrival). Take four into battle; the AI commander uses them too.

## Shop, crates and battle pass

- **Flash sale** that refreshes twice a day (local midnight and noon): discounted skins, XP boosters, a quick unlock of a random unit from anywhere in the trees, a discounted stratagem, a discounted customisation part and a credit bundle.
- **Limited giveaways** each week: three exclusive vehicles found in no tech tree, very expensive.
- **Camouflage showcase**: 40 patterns (woodland to galaxy, chrome, gold and prismatic holo) sold for specific units. Each skin carries real bonuses such as armor, speed, fire rate, stealth, unit XP or credits.
- **Crates**: Supply, Veteran, Elite, Mythic, the Armory Locker (customisation parts) and the Stratagem Cache (stratagems and upgrades). Rarer pools cost more, odds are shown, and a reel animation reveals the drop. Thirty crate-exclusive vehicles exist.
- **Battle pass**: a new season every two weeks with 50 tiers on free and premium tracks, ten season-exclusive vehicles, season skins, stratagems and customisation parts.
- Daily orders, a daily supply drop, a profile with service record, and graphics and audio settings.

## Controls

Left-click or drag to select, right-click to move or attack, **F** attack-move, **Z X C V** abilities, **T Y U I** stratagems, **Ctrl+1–9** groups, **H** halt, **R** rally point, **Space** focus, **WASD**, arrows or screen edges to pan, **Q/E** or middle-drag to rotate, wheel to zoom, **Esc** pause. Touch: drag to pan, pinch to zoom, tap to select or order.

## Code

`js/data.js` + `js/data2.js` factions, classes, abilities, tech lines, skins, maps, weather, stratagems and customisation parts · `js/textures.js` procedural camo and sprites · `js/models.js` unit, HQ and objective models · `js/models2.js` emplacements, faction details, customisation parts and animation · `js/terrain.js` heightfields, roads, bridges, navigation and scenery · `js/fx.js` particles and weather · `js/audio.js` synthesized sound · `js/battle.js` simulation and AI · `js/battle_ui.js` camera, input and HUD · `js/battle2.js` stratagems · `js/meta.js` progression · `js/ui.js` + `js/ui2.js` menus.

`tools/build_single.py` bundles everything into one HTML file.
