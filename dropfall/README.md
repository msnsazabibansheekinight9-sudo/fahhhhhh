# Dropfall

A top-down co-op squad shooter in the browser: drop onto alien planets, type arrow codes to call in orbital strikes and supplies, complete objectives, and extract. All names, factions, weapons and art are original. Everything is drawn and synthesized in code, with no image or audio files.

Open `index.html` in a browser. Keyboard and mouse required.

## What's in it

- **3 enemy factions, 29 enemy types**: the Brood (bugs, burrows, breaches), the Foundry (machines, fabricators, dropships) and the Veil (shielded psionics, rifts). Enemies have directional armor, and some have shields, flight or reinforcement callers.
- **12 planets** across 9 biomes (dunes, tundra, jungle, volcanic, marsh, moon, ash, crystal, ruined colony) and 9 hazards (sandstorms, blizzards, monsoon, fog, fire tornadoes, ion storms, meteors, night).
- **6 mission types**: Eliminate, Purge spawners, Relay Beacon, Evacuate Colonists, Recover Flight Recorder, Nova Bomb. Difficulty runs from 1 to 10. Difficulty 5 and up adds a second main objective. Every map has side objectives (radar, jammer, anti-air, artillery), outposts, loot caches and samples.
- **33 weapons and 8 grenades**, with an armor-penetration model (full damage, glance or bounce).
- **50 call-ins**: orbitals, raptor strikes, support weapons, backpacks, sentries, minefields and 3 drivable vehicles (two exosuits and a buggy).
- **Strike cruiser hub**: galaxy war table with planet liberation and major orders, loadout, Requisition shop (credits), Ship Modules (samples), four Campaign Passes (medals; premium ones cost shards), Quartermaster cosmetics store (shards, daily rotation), 18 armor sets with passives, 12 capes, player cards, titles, boosters, and a codex.
- Up to 3 AI squadmates, friendly fire, reinforcements, and extraction under fire.

Progress saves to the browser's local storage.

## Code layout

`js/data.js` content tables · `world.js` map generation · `sim.js` state, damage, explosions · `combat.js` weapons, projectiles, call-ins · `enemies.js` enemy AI · `update.js` per-frame logic, objectives, extraction · `render.js` drawing and HUD · `hub.js` menus and progression · `main.js` loop and input.
