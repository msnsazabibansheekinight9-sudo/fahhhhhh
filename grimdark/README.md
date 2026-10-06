# Ironclad: Crusade of the Ashen Legion

A grimdark sci-fi first-person shooter for the browser, built with Three.js (r128). It's inspired by the far-future gothic war genre and uses original names and designs. Every model, texture, animation and sound is generated in code. There are no asset files.

Open `grimdark/index.html` (serve the repo folder, e.g. `python3 -m http.server`, then visit `/grimdark/`).

## What's in it

- **You**: an armoured legionary with five weapons, each with its own first-person model, armoured gauntlets and animation set:
  - **Bolt Rifle**: automatic, explosive bolts, sickle magazine, brass casings, ammo counter. Full reload choreography: the left hand pulls the magazine, fetches a new one and seats it, then the bolt is racked.
  - **Plasma Incinerator**: hold to charge a big shot. Builds heat, overheats (burns you), **R** vents with sliding vents and steam. Coils glow with heat and charge.
  - **Purgation Flamer**: a continuous stream of burning promethium that sets enemies alight. Pilot light.
  - **Melta Gun**: a short wind-up, then a piercing heat beam that goes through every enemy in line.
  - **Chainsword**: three-swing combo with moving teeth, a revving engine sound, and an **RMB** lunge into an overhead strike.
  - Frag grenades (**G/Q**). **Rite of Fury** (**F**, charged by kills) slows every enemy for nine seconds.
- **Viewmodel animation**: mouse sway, walk and sprint bob, a sprint pose, aim-down-sights, spring recoil, landing dip, weapon switching, grenade throw, reloads, vents and swings.
- **Four factions, 12 enemy types and 4 bosses**, all articulated rigs with procedural walk cycles, aiming, melee swings, hit flinches, staggers, crumple-and-topple deaths and gibbing:
  - *The Swarm*: Rippers that leap, Spitters, four-armed Hive Warriors, and **the Hive Tyrant** (winged; slams, acid barrages, summons the brood). They burrow up out of the ground.
  - *Greenskins*: charging Brutes, Shootas, and **Warlord Gruskar** in smoking mega-armour with a power claw.
  - *Undying Machines*: Husks with telegraphed gauss beams, Flayed Stalkers, and **the Overlord** (teleports, volleys, raises the fallen). Machines reassemble after death unless you obliterate them.
  - *Traitors & Daemons*: Cultists in rebreathers, Bloodfiends, and **Kharzul the Blood-Crowned** (winged greater daemon; ring-of-fire slam, fireball fans).
- **Six worlds** with their own sky shader, light, fog, ground, props and ambient particles: a burning hive city, an ice world, a jungle death-world, a tomb world, a forge world and a warp rift. Layouts are seeded and procedural (gothic ruins with climbable floors, statues, tank wrecks, crystals, giant trees, pyramids and pylons, chimneys and lava, obsidian spikes and altars).
- **Enemy AI**: flow-field pathfinding around buildings, skirmishers that keep range and strafe, chargers, leapers, line-of-sight checks, separation, and hunting down the last stragglers.
- **Campaign** of six missions (unlocked in order, with best scores saved) and **Endless Crusade** on any world, with a boss every fifth wave.
- **HUD**: armour (regenerates) and vitality, fury meter, ammo/heat, grenades, an auspex motion tracker, damage direction arcs, hit and headshot markers, kill feed, boss bar and banners.
- **Audio**: everything is synthesised with WebAudio, positional and with reverb.

## Controls

| | |
|---|---|
| Move / sprint / jump / crouch | WASD / Shift / Space / C |
| Fire / aim | LMB / RMB |
| Weapons | 1–5, mouse wheel |
| Reload, vent plasma | R |
| Grenade | G or Q |
| Rite of Fury | F |
| Pause | Esc |

Settings: difficulty (four levels), graphics quality, sensitivity, FOV and volume.
