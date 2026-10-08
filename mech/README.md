# Ironwalkers — a Broker Games mech combat sim

A browser mech game in the spirit of MechWarrior, built with Three.js (r128). You pilot from inside a working cockpit and fight AI-piloted mechs in team battles. All models, textures, maps, effects, music and sound are generated in code; the game ships no asset files.

Open `mech/index.html`. The easiest way is to serve the repo folder (for example `python3 -m http.server`) and visit `/mech/`. Progress is saved in your browser's local storage.

## What's in it

- **Studio splash and live title screen.** A *Broker Games* logo opens the game. The title menu sits over a real AI battle that keeps running behind it, filmed by a camera director that cuts between tracking, low-angle, orbit, crane and over-the-shoulder shots.
- **Ten mech classes.** You start with three: **Wisp** (scout), **Vanguard** (assault) and **Bastion** (defender). The other seven are sold in the shop, and the stronger the class, the higher the price: **Longbow** (sniper, 240K), **Mortar** (quad-legged artillery, 420K), **Phantom** (stealth, 680K), **Aegis** (tower-shield bulwark, 1.05M), **Tempest** (winged jump-jet skirmisher, 1.6M), **Juggernaut** (95-ton assault, 2.4M) and **Colossus** (120-ton quad titan, 4M). Each class has its own model with biped, reverse-joint or four-legged locomotion, plus its own hardpoints, armour, speed, heat capacity, jump jets and a unique ability on Q: Overdrive, Barrage, Fortify, Deadeye, Fire Mission artillery strikes, Cloak, a projected shield dome, Skyburst flight, Battering Ram or Core Overload.
- **20 arenas, from 6v6 to 20v20,** each with its own terrain, sky, lighting, weather and landmarks:
  - *6v6:* Foundry Pit (molten channels and cranes), Colosseum Prime (floodlit arena at night), Crystal Hollow (glowing alien crystals), Rust Yard (container maze and mech wrecks), Neon Alley (rainy cyberpunk streets).
  - *8v8 to 12v12:* Frostbite Ridge, Dust Devil Canyon (mesas and a riverbed), Verdant Ruins (jungle pyramid), Harbor Siege (docks, cranes and a beached ship), Ashfall Caldera (lava), Tycho Lunar Base (low gravity, with Earth in the sky), Blackwater Swamp (water slows you and cools you), Refinery Nine (flare stacks and cooling towers), Tempest Flats (lightning storm).
  - *16v16 and 20v20:* Ares Outpost (Mars, low gravity), Glacier Rift (crevasses under an aurora), Fallen Metropolis (ruined skyscraper grid), Ironwood Forest (giant redwoods), Orbital Spaceport (a rocket on its launch tower), Titanfall Wastes (toxic pools around the skeleton of a fallen colossal mech).
- **Five game modes:** Team Deathmatch, Domination (three capture points), Attrition (one life each), Data Heist (carry the core home) and Siege (attackers destroy three shield generators while defenders hold out).
- **AI opponents.** Every AI pilot, ally or enemy, gets a random build: a random class, random weapons and systems, and a random skin, colours, finish, emblem and thruster colour. AI pilots follow A* paths around cover, strafe at their best range, lead their shots, manage heat, lock missiles, use their class abilities and play the objectives.
- **Tier matchmaking.** Every weapon and system belongs to one of six tiers: I Scrap, II Standard, III Advanced, IV Elite, V Legendary and VI Mythic. Your *build tier* is the highest tier among your equipped gameplay parts. Every AI in your match is built from parts of exactly that tier, and higher-tier matches pay more.
- **Combat model.** Separate armour for the core, each arm and the legs. Losing an arm takes its weapons with it, and damaged legs slow you down. Heat builds as you fire; overheat and the reactor scrams. Jump jets, missile lock-on, AMS, ECM, shields, repair drones, EMP from PPCs, splash damage, lava and toxic damage, and water cooling are all simulated.
- **16 weapon types:** machine gun, small laser, flamer, autocannon, rotary cannon (spins up), pulse laser, SRM, plasma cannon, mortar, arc projector (chains between targets), heavy autocannon, Gauss rifle (charge and release), large laser, PPC, LRM (lock-on and indirect fire) and railgun. Each comes from up to six manufacturers with different stat profiles, at every tier.
- **Customisation.** 988 catalogue items, plus weekly exclusives: 344 weapons, 144 systems in six slots (armour, reactor, actuators, jump jets, targeting, module), 252 camouflage skins across 30 procedural patterns, 13 finishes (chrome, gold, carbon, pearlescent, neon lines and more), 72 emblems, 48 cockpit trinkets, 14 cockpit themes, 11 thruster colours, 40 weapon skins and 32 pilot titles. Primary, secondary and accent colours are free to pick from 40 swatches or a full colour picker. That adds up to roughly 10³⁹ possible builds.
- **Shop.** Every part is shown as a rendered 3D model, and skins, paints, cockpit themes and thrusters also show their real colours. Click any item to inspect a rotating 3D preview with its full stats. Higher tiers cost exponentially more. Eight daily deals at 25% off refresh every day.
- **Supply crates.** There is one crate per tier, from 2,500 to 480,000 credits. Each holds three rolls that can land up to two tiers below or above the crate's tier, so results range from junk to jackpots. Elite crates and up can drop an entire mech class. Duplicates are refunded. A crate drops onto the hangar turntable, shakes and bursts open, then the cards flip over.
- **Weekly battle pass.** Each week has a new theme. Thirty levels unlock that week's exclusive skins (including an animated prismatic one), an emblem, trinket, cockpit theme, thruster colour, weapon skin, finish, title, prototype system and three signature weapons. None of these are ever sold in the shop. The pass also has six weekly challenges, and it resets every Monday 00:00 UTC.

## The cockpit

The first-person view is laid out like a real crew station:

- **HOTAS**: a throttle quadrant (IDLE / MIL / AB scale) and a side-stick, gripped by gloved hands. Both move with your inputs, and the trigger pulls when you fire.
- **Three soft-key MFDs.** The left screen shows SYS (armour diagram and shield) or ENG (core temperature, heat load, cooling, throttle, fuel, actuators, coolant). The centre screen is a radar PPI scope with a sweep and torso-twist arc. The right screen shows WPN (cooldowns), TGT (the target's armour diagram) or MAP. Press **B** and **N** to page them, and the soft-key presses.
- **Standby gauges** with live needles for speed, heat, reactor output and jump fuel, and an attitude indicator ball.
- **Glareshield** with a heading tape, MASTER WARN and MASTER CAUTION push-lights and a HUD combiner glass.
- **Caution/warning annunciator panel**: OVERHEAT, SHUTDOWN, CORE CRIT, MSL LAUNCH, HEAT HI, ARM L/R, LEG DMG, LOCK, EMP, JET LOW, COOLANT, SHIELD, ECM, ABILITY and MASTER ARM, each driven by real game state.
- **Guarded MASTER ARM switch** that flips open during start-up, overhead and console toggle switches with placards, circuit-breaker rails, an ejection handle, harness straps and the pilot's knees.
- **Power-up sequence** on every drop: the screens boot, the annunciator lamps run a test, the guard opens and weapons come online. An overheat shows a REACTOR SCRAM screen with a restart countdown.
- **Damage and motion.** The canopy glass cracks as your core takes damage. The flood light strobes red when you overheat. The cockpit sways on its mounts as you walk, and your trinket swings or bobbles.
- **Cockpit frame by weight class.** Light mechs get a wide bubble, mediums a split canopy and heavies an armoured vision slit.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Aim torso and weapons |
| W / S | Throttle forward / reverse |
| A / D | Turn legs (Classic) or walk relative to view (Arcade — change in Settings) |
| Left / right mouse | Fire weapon group 1 / 2 (set per hardpoint in the garage) |
| F | Alpha strike: fire every weapon |
| Space | Jump jets |
| Q | Class ability |
| Z | Zoom |
| C | Centre torso to legs |
| V | Cockpit / third-person |
| B / N | Page the left / right MFD |
| Tab | Scoreboard |
| H | Controls overlay |
| Esc | Pause |

## Files

- `js/data.js`: tiers, classes, weapons, equipment, cosmetics, maps, modes, crates and the weekly battle pass generator.
- `js/profile.js`: save data, wallet, inventory, loadouts, match rewards, challenges and random AI builds.
- `js/tex.js`: procedural camo patterns, emblems, panel bump maps, terrain and sprites.
- `js/mechs.js`: mech, weapon, equipment and trinket models, mesh merging and the walk, aim and recoil animation rig.
- `js/cockpit.js`: the cockpit interior and its instruments.
- `js/maps.js`: terrain, landmarks, hazards, sky, weather, collision, raycasts and the A* navigation grid for all 20 arenas.
- `js/battle.js`: the simulation. Movement, heat, weapons, projectiles, damage, abilities, AI, game modes and cameras, including the cinematic director.
- `js/hud.js`: the heads-up display.
- `js/fx.js`: particles, beams, tracers, explosions, lightning and the synthesised audio and music.
- `js/main.js`: renderer, game loop, input and the 3D thumbnail renderer used by the shop.
- `js/ui.js`: splash, title, hangar, garage, shop, crates, battle pass, settings and results screens.
