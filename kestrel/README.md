# Kestrel: Dead Orbit

A first-person sci-fi survival horror game for the browser, inspired by the stalker-in-the-vents dread of *Alien: Isolation* and the item-scarce, lock-and-key exploration of classic *Resident Evil*. Original setting, names and designs. Built with Three.js (r128). Every model, texture, animation and sound is generated in code. There are no asset files.

Open `kestrel/index.html` (serve the repo folder, e.g. `python3 -m http.server`, then visit `/kestrel/`).

## The two maps

Both maps are generated from a seed each new game, then validated so the key-and-lock progression always works.

- **Kestrel Station**, about 245 m across: a disc-shaped research platform with a nine-storey Concourse atrium at its hub, three ring corridors, spokes and diagonal braces, and about 90 rooms across ten named sectors (Medical, Habitation, Engineering, Science, Security…). Progression: restore power at Reactor Control, find the Blue clearance card in Security, then the Red card in Administration, and reach the Docking Ring.
- **ISV Calliope**, about 450 m long: a heavy cruiser docked at the station, with a central spine, port and starboard passages, cross-corridors and about 100 rooms. Progression: restart the reactor in Engineering, find an Officer keycard, then the Captain's keycard, and reach the Bridge. Arming the self-destruct releases the shuttle bay and starts a five-minute run back through the ship with the creature hunting you.

## The horror

- **The Stalker** can't be killed. It lives in a vent network that covers both maps, drops out of ceiling vents near you, prowls, investigates noises, sniffs around, checks lockers and hunts on sight. A "menace" director sends it back into the vents after a while, and crawling sounds and tracker ghosts give it away while it's up there. Fire is the only thing it fears. Bullets just make it flinch and enrages it. It won't enter emergency shelters.
- **Hiding**: walk into any locker and look out through real see-through slats. Hold your breath (Space or right mouse) when it stops outside. It will drag you out if it saw you climb in, or if you run out of air.
- **Husks** are infected crew who shamble, lurch, feed on corpses and grab. Shooting the head can take it clean off. **Crawlers** are fast, leaping eight-legged parasites, mostly found aboard the Calliope.
- **Sound** drives the AI: footsteps (sprinting is loud, crouching is silent), gunfire, doors, thrown objects, the motion tracker's own beeps, alarms and explosions.
- **Environmental storytelling**: blood drag trails, warnings scrawled in blood, bloody handprints, claw gouges, black biomechanical resin spreading out of torn-open vents, infested nest rooms with cocooned crew (some with burst chests) and egg pods, barricades with spent casings, sparking wall panels, steam leaks, hanging cables, flickering and broken lights, 18 written data logs, and defaced corporate posters.

## Systems

- **Weapons**, all fully modelled with IK-driven arms and articulated gloved hands: maintenance jack (melee), .357 revolver (swing-out cylinder, ejected casings, speed-loader reload), pump shotgun (shell-by-shell reload, working pump), Incinerator flamethrower (pilot light, live fuel gauge), and pulse carbine (live ammo counter, magazine drop). Aim down sights, sway, bob, recoil springs and an inspect animation.
- **Motion tracker** held in the left hand, with a live CRT screen: ping wave, movement blips, distance readout and an objective arrow.
- **Inventory and crafting**: trauma kits, gel, bandages, scrap, ethanol, power cells, flares, noisemakers and pipe bombs.
- **Interaction**: lockers, levers, save terminals, consoles, emergency airlock vents (which can suck the creature out into space), physics props you can kick, pick up and throw (bottles shatter), explosive canisters, and lights you can shoot out (the baked lighting updates).
- **Lighting**: dark by design — about a third of corridors and rooms are blackout zones lit only by red emergency lamps, and many other lights are dead or flickering. Per-vertex baked light from about 1,500 fixtures per map. Restoring power lights the ship up in a wave spreading out from the reactor. The shoulder lamp casts shadows, nearby lights flicker, and light halos fake bloom. Post-processing adds tone mapping, film grain, scanlines, chromatic aberration and fear and hurt grading.
- **Audio** is synthesised with WebAudio: positional sound with wall occlusion and reverb, life-support ambience, distant hull groans, a dissonant dread score that swells with danger, a heartbeat, stingers, creature vocals and foley.
- **Resident Evil-style rules**: you can only save at emergency shelters (green-lit rooms), which also download the local deck plan. The health display is an ECG reading FINE, CAUTION or DANGER. The deck map reveals rooms as you explore them.
- Touch controls on phones and tablets.

## Controls

| Action | Key |
| --- | --- |
| Move / sprint / crouch | WASD / Shift / C (toggle) or Ctrl (hold) |
| Fire / aim | Left / right mouse |
| Interact, hide, leave locker | E |
| Reload / inspect | R / V |
| Weapons | 1–5 or mouse wheel |
| Motion tracker | hold T (or Tab, or middle mouse) |
| Shoulder lamp / recharge lamp | F / X |
| Throw / cycle throwable | G / Z |
| Use trauma kit | Q |
| Hold breath (in a locker) | Space or right mouse |
| Inventory and crafting / deck map | I / M |
| Pause and settings | Esc |

## Code layout (`kestrel/js`)

| File | Contents |
| --- | --- |
| `util.js` | RNG, procedural textures, baked-light material, geometry builder, two-bone IK |
| `levelgen.js` | Grid level generator (rooms, A* corridors, sectors, lock-and-key validation, vents), LOS, raycasts and pathfinding. No Three.js dependency, so it can be tested in Node |
| `props.js` | Prop library and room furnishing per room type |
| `corpses.js` | Articulated corpses: a jointed skeleton posed into death poses (slumped, prone, supine, fetal, crawling), floor-snapped, with textured coveralls and skin, skulls with jaws and teeth, fingers, boots, burst ribcages, head and throat wounds, missing limbs |
| `detail.js` | Architectural detail: ducts, cable trays, conduits, posters, stencils, hatches |
| `horror.js` | Environmental horror dressing and infested nests |
| `build.js` | Chunked merged geometry, walls, doors, windows, fixtures, light baking, halos, lockers, physics props |
| `creatures.js` | Stalker, Husk and Crawler rigs, gaits, animation and AI |
| `weapons.js` | Viewmodels, hands, reload choreography, motion tracker |
| `fx.js` | Particles, decals, light flashes |
| `audio.js` | Synthesised audio engine |
| `content.js` | Items, recipes, logs, population |
| `game.js` | Main loop, player, collision, doors, combat, physics, power, saving, death |
| `ui.js` | HUD, menus, inventory, map, touch controls |
