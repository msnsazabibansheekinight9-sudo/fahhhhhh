# Rock & Stone

A browser game in the shape of **Deep Rock Galactic**: four dwarf classes drop
into a procedurally generated, fully destructible cave, mine the quota, fight
off glyphid swarms and run for the drop pod. Built with Three.js (r128).
Everything is procedural — the caves, the rock, the bugs, the guns, the sound.
No imported assets, no build step: open `index.html`.

> An original fan homage to Ghost Ship Games' *Deep Rock Galactic*. It shares
> that game's shape, not its code, art or trademarks.

## The shape of a mission

1. The drop pod rides you down a shaft it drills into the cave roof, the door
   opens, and you walk out into the dark.
2. You dig. Morkite for the company, nitra for resupplies, gold and jewels for
   yourself. Minerals only count once they are inside the M.U.L.E.
3. Something notices. Ambient packs wander in; twice a mission the whole cave
   comes at you at once.
4. Objective done, Mission Control dispatches the drop pod to the far end of
   the cave, a three-minute clock starts, and everything underground follows
   you to it.

## Dwarves

| | Primary | Secondary | Throwable | Traversal | Support |
|---|---|---|---|---|---|
| **Driller** | CRSPR Flamethrower | Subata 120 | Impact Axe | Reinforced Power Drills | C4 Satchel Charge |
| **Engineer** | "Warthog" Auto 210 | "Stubby" Voltaic SMG | Plasma Burster | Platform Gun | LMG Gun Platform |
| **Gunner** | "Lead Storm" Minigun | "Bulldog" Revolver | Sticky Grenade | Zipline Launcher | Shield Generator |
| **Scout** | Deepcore GK2 | Jury-Rigged Boomstick | Cryo Grenade | Grappling Hook | Flare Gun |

Everyone carries a pickaxe. It is slow, it never runs out, and it is the answer
to most terrain problems. The Driller's drills are the fast answer; explosives
are the loud one.

Each tool behaves the way it should: the minigun spins up and overheats and
slows you to a walk, the platform gun builds a floor wherever you shoot it, the
grapple yanks you across a chasm, the shield is a bubble that bugs cannot cross
and that tops your health back up, C4 leaves a crater you can walk into.

## Mission types

- **Mining Expedition** — mine the morkite quota and deposit it.
- **Egg Hunt** — pull glyphid eggs out of the rock. Most of them wake the nest.
- **Point Extraction** — carry aquarqs to the mine head. Carrying one means
  both hands are full, so you cannot shoot.
- **Elimination** — crack open the cocoons and kill the dreadnoughts inside.
- **Salvage Operation** — repair two dead mules, start the uplink, hold the
  room for two minutes while everything arrives.

Ten biomes (Crystalline Caverns, Salt Pits, Fungus Bogs, Radioactive Exclusion
Zone, Dense Biozone, Glacial Strata, Magma Core, Azure Weald, Hollow Bough,
Sandblasted Corridors), each with its own rock palette, flora, fog and hazard.
Five hazard levels and three mission lengths scale the quota and the swarms.

## Glyphids

Swarmers, grunts, slashers, praetorian guards, exploders, praetorians, acid
spitters, Mactera spawn and a dreadnought boss with armour plates that have to
be broken off. Ground bugs are **surface crawlers**: they stick to whichever
rock face is nearest and walk along it, so they pour down walls and run across
ceilings. A bug that gets properly stuck chews through the rock instead, which
means a sealed tunnel is a delay, not a wall.

Armoured enemies soak frontal damage; the abdomen is the weak point, so
flanking is worth the walk.

## Support

- **Bosco**, the solo mining drone: follows you, shoots what shoots you, mines
  the seam you mark with the laser pointer (hold `Q`, press `X`), and revives
  you when you go down.
- **M.U.L.E.**, who carries everything you mine. Call her with `C`, deposit
  with `E`.
- **Resupply pods**, 80 nitra each, two uses per pod, ammo and health.

## Controls

`WASD` move · `Space` jump · `Shift` sprint · `Ctrl` crouch · `LMB` fire ·
`RMB` alt fire · `1`–`6` primary / secondary / throwable / pickaxe / traversal
/ support · `R` reload · `E` use · `F` flare · `C` call M.U.L.E. ·
`B` resupply · `Q` laser pointer · `X` send Bosco · `V` Rock and Stone ·
`Tab` terrain scanner · `Esc` pause.

## How it is built

| File | What it does |
|---|---|
| `js/core.js` | RNG, value noise, easing, the saved profile |
| `js/terrain.js` | The density field, carving, raycasts, and the mesher |
| `js/worldgen.js` | Cave graph: caverns, tunnels, shafts, ore seams, spawn points |
| `js/biomes.js` | Ten biome palettes and prop tables |
| `js/chunks.js` | Chunk meshes, dirty re-meshing, the rock detail shader |
| `js/models.js` `models2.js` `vmodels.js` | Every piece of geometry in the game |
| `js/decor.js` | Instanced props and mineral seams |
| `js/player.js` | Movement against the field, mining, health |
| `js/weapons.js` | Loadouts, firing, projectiles, the viewmodel |
| `js/gear.js` | Platforms, ziplines, sentries, shields, C4 |
| `js/enemies.js` | Glyphid AI and the swarm director |
| `js/units.js` | Drop pod, M.U.L.E., Bosco, resupply, escape pod |
| `js/mission.js` | Objectives, extraction, scoring |
| `js/fx.js` `audio.js` `ui.js` `game.js` | Particles, synthesised sound, HUD, the loop |

**The terrain is a signed field, not a mesh.** `d > 0` is rock, `d < 0` is air,
and the cave surface is wherever it crosses zero. Mining writes to the field
and flags the affected chunks; the mesher rebuilds a few per frame. That is why
you can drill a tunnel and immediately walk down it, and why a grenade leaves a
hole that bugs then path through.

Chunks are meshed with **naive surface nets** rather than marching cubes: one
vertex per cube that straddles the surface, quads across sign-changing edges.
Both of its lookup tables are derived at load time from first principles, so
there is no hand-copied 256-entry triangle table to get subtly wrong, and the
output is smoother and lighter than marching cubes on the same field.

One-metre voxels can only be so detailed, so the rock material perturbs its own
normal in the fragment shader from a generated, tileable grain texture sampled
on all three axes. The geometry is coarse; the surface is not.

The first-person weapon is drawn in **a second pass** with its own scene,
lights and narrower field of view, over a cleared depth buffer. That is what
keeps the gun a sane size at a wide world FOV and stops it clipping into rock.

Lights are a fixed set — ambient, hemisphere, headlamp spot, six flare slots
and three effect flashes — allocated once and dimmed to zero when unused, so
the shaders never recompile mid-swarm.

Dev harnesses: `models.html?s=bugs|guns|machines|props` renders every model on
a turntable; `test.html?b=<biome>` drops you straight into a cave.
