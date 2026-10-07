# Ironclad: Crusade of the Ashen Legion

A grimdark sci-fi first-person shooter for the browser, built with Three.js (r128). It's inspired by the far-future gothic war genre and uses original names and designs. Every model, texture, animation and sound is generated in code. There are no asset files.

Open `grimdark/index.html` (serve the repo folder, e.g. `python3 -m http.server`, then visit `/grimdark/`).

## What's in it

- **Seven playable classes**, each with its own weapons and an **E** ability:
  - *Tactical Legionary*: bolt rifle, plasma, melta, chainsword. Calls an **orbital lance**.
  - *Assault Legionary*: bolt pistol, plasma pistol, chainsword, thunder hammer. **Jump pack** leap and slam.
  - *Terminator*: storm bolter, spin-up assault cannon, thunder hammer, lightning claws. Huge armour, **teleport strike**.
  - *Devastator*: heavy bolter, lascannon, missile launcher, bolt pistol. **Brace** for no recoil and extra damage.
  - *Librarian*: Smite (chain lightning; hold for a psychic blast; overuse brings Perils of the Warp), force staff, pistols. **Psychic storm**.
  - *Battle Sister*: bolter, flamer, melta, chainsword. **Act of faith** makes her untouchable for a few seconds.
  - *Guardsman*: lasgun, scoped long-las, plasma pistol, knife. Only human, but can **call a squad** in by gunship.
- **19 first-person weapons**, each with its own model and animation: reloads where the hand handles the magazine, plasma charge and vent, assault cannon spin-up, beam wind-up, sword/hammer/claw/staff combos with heavy attacks, and a sniper scope.
- **Eight enemy factions, 40 unit types, 8 bosses**, all procedurally rigged and animated:
  - *The Swarm*: rippers, spitters, flying gargoyles, warriors, cloaked lictors, carnifexes, **Hive Tyrant**
  - *Greenskins*: gretchin, brutes, shootas, burnas, nobs, junk dreadnoughts, **Warlord Gruskar**
  - *Undying Machines*: kamikaze scarabs, husks, flayed stalkers, canoptek wraiths, **the Overlord**. Machines reassemble after death.
  - *Traitors & Daemons*: cultists, bloodfiends, daemonettes, plaguebearers (poison clouds), pink horrors (homing warpfire), **Kharzul the Blood-Crowned**
  - *Traitor Legions*: traitor legionaries, possessed, **Voraxis the Unbound**
  - *The Ascendancy*: pulse warriors, shielded gun drones, jet-hopping battlesuits, **the Etherium Colossus** (shield, ion cannon, missile barrage)
  - *The Starborn*: guardians, cloaked sniper pathstalkers, wailing dancers, wraith constructs, **the Burning Avatar**
  - *The Brood Cult*: hybrids, purestrains, aberrants, **the Patriarch**
- **Allies** fight beside you: guardsmen, battle-brothers, battle sisters and dreadnoughts arrive by **drop pod** (or by gunship). In some missions the Starborn or the Ascendancy fight with you. Allies and enemies pick targets and fight each other.
- **13 worlds**: hive city, ice world, jungle death-world, tomb world, forge world, warp rift, cathedral shrine world, ash wastes, greenskin scrap-town, craftworld under the stars, tau-style sept city, agri world, and a space hulk interior. Titans stride on the horizon of some, and gunships fly overhead.
- **17-mission campaign** across five mission types: purge, **hold** a beacon, **defend** an objective, **assassinate** a boss, and **survive & extract** to a landing gunship. Plus **Endless Crusade** on any world against any faction, with reinforcements every 4th wave and a boss every 5th.
- Flow-field pathfinding, cover-keeping skirmishers, chargers, leapers, flyers, cloaking, shields and line-of-sight checks. HUD with auspex radar, objective and boss bars, ability cooldown and damage arcs. All sound is synthesised.

## Controls

| | |
|---|---|
| Move / sprint / jump / crouch | WASD / Shift / Space / C |
| Fire / aim (melee: heavy) | LMB / RMB |
| Weapons | 1–4, mouse wheel |
| Class ability | E |
| Reload, vent plasma | R |
| Grenade | G or Q |
| Rite of Fury | F |
| Pause | Esc |

Settings: difficulty (four levels), graphics quality, sensitivity, FOV and volume.
