# Dropfall

A first-person co-op squad shooter in the browser, built on Three.js. Drop onto alien planets, type arrow codes on your wrist computer to call in orbital strikes and supplies, complete objectives, and extract. All names, factions, weapons and art are original. Every model, animation, texture and sound is generated in code, with no asset files.

Open `index.html` in a browser with WebGL. Keyboard and mouse required. Click the game once to capture the mouse; Esc releases it and pauses.

## What's in it

- **3 enemy factions, 29 enemy types**: the Brood (bugs, burrows, breaches), the Foundry (machines, fabricators, dropships) and the Veil (shielded psionics, rifts). Enemies have directional armor, and some have shields, flight or reinforcement callers.
- **12 planets** across 9 biomes (dunes, tundra, jungle, volcanic, marsh, moon, ash, crystal, ruined colony) and 9 hazards (sandstorms, blizzards, monsoon, fog, fire tornadoes, ion storms, meteors, night).
- **6 mission types**: Eliminate, Purge spawners, Relay Beacon, Evacuate Colonists, Recover Flight Recorder, Nova Bomb. Difficulty runs from 1 to 10. Difficulty 5 and up adds a second main objective. Every map has side objectives (radar, jammer, anti-air, artillery), outposts, loot caches and samples.
- **33 weapons and 8 grenades**, with an armor-penetration model (full damage, glance or bounce).
- **50 call-ins**: orbitals, raptor strikes, support weapons, backpacks, sentries, minefields and 3 drivable vehicles (two exosuits and a buggy).
- **Strike cruiser hub**: galaxy war table with planet liberation and major orders, loadout, Requisition shop (credits), Ship Modules (samples), four Campaign Passes (medals; premium ones cost shards), Quartermaster cosmetics store (shards, daily rotation), 18 armor sets with passives, 12 capes, player cards, titles, boosters, and a codex.
- Up to 3 AI squadmates, friendly fire, reinforcements, and extraction under fire.

Progress saves to the browser's local storage.

## 3D and animation

- First-person weapon models for all 33 guns, gloved hands placed on each weapon with two-bone inverse kinematics, and animations for bob, sway, recoil, aim down sights, sprint, weapon swap, grenade throw, stims, beacon throw, and reloads that differ by type (magazine swap, shell-by-shell, revolver cylinder, heat-sink eject, launcher tube load).
- A wrist computer that shows the call-in codes as you type them.
- Jointed enemy models for all 29 types: multi-legged bugs with tripod gaits and snapping mandibles, stomping robots and walkers, tanks with turrets and moving treads, hovering gunships, robed Veil casters with swaying robes and shield bubbles, a three-legged boss. Each has a death animation.
- Squadmates rendered with armor sets and capes that sway, with hands placed on their guns by inverse kinematics; drivable exosuits (cockpit view) and a buggy (chase camera).
- Terrain with rolling height and scorch decals, instanced scenery per biome, a gradient sky with a ringed planet and stars, image-based lighting from the sky, sun shadows, a helmet lamp at night, 3D weather, fog tied to hazards, fireballs, tracers, beams and dynamic lights.

## Code layout

`js/data.js` content tables · `world.js` map generation · `sim.js` state, damage, explosions · `combat.js` weapons, projectiles, call-ins · `enemies.js` enemy AI · `update.js` per-frame logic, objectives, extraction · `render.js` HUD, minimap and the 2D codex fallback · `models.js` procedural 3D models and rigs · `gfx.js` scene, terrain, effects and entity sync · `viewmodel.js` first-person weapon and hands · `hub.js` menus and progression · `main.js` loop and input.
