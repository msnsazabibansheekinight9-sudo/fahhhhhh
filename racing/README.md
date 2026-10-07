# Gridlock: Legends of Motorsport

A browser racing game covering 18 motorsport disciplines from 1899 to 2025, built with Three.js (r128). Everything is generated in code: car models, liveries, tracks, scenery, physics and engine sounds. There are no asset files.

Open `racing/index.html`. The easiest way is to serve the repo folder (for example `python3 -m http.server`) and visit `/racing/`.

## What's in it

- **18 disciplines** with **518 real cars** from period race series, each with its own year, power, weight, top speed, engine type and drivetrain:
  Formula 1 (1950–2025), IndyCar & CART (1911–2025), NASCAR (1949–2025, including Truck Series), Le Mans & endurance (Bentley Boys to hypercars), GT racing, touring cars (BTCC, DTM, Group A, Supercars, TCR), rally (Group 2 to Rally1, Group B included), rallycross, drag racing (Top Fuel, Funny Car, Pro Stock, Pro Mod, Super Stock), drifting, Formula E (Gen1 to Gen3 Evo), karting, Dakar & trophy trucks, pre-war Grand Prix, Can-Am, hill climb (Pikes Peak), dirt oval & sprint cars, and land speed records.
- **10 tracks per discipline (180 total)**, generated from a style and a seed: road courses, street circuits with 90° corners, tri-ovals, paperclips and superspeedways with banking, kart tracks, mixed-surface rallycross loops with jumps, point-to-point rally stages, switchback hill climbs with up to 550 m of climb, drag strips and multi-mile salt flats. Ten scenery themes: parkland, forest, desert, coast, city, city at night, mountains, snow, savanna and salt flats.
- **33 game modes.** Every discipline has its own set:
  - *F1:* Quick Race, Grand Prix Weekend (qualifying sets your grid, then a race with tyre wear, fuel, damage and a mandatory pit stop), Qualifying Shootout, Time Trial with a ghost, five-round Championship with real points, Elimination. DRS on 2011+ cars.
  - *IndyCar:* 500 sprint with drafting and fuel stops. Push-to-pass on 2012+ cars.
  - *NASCAR:* 24-car superspeedway pack racing with strong drafting.
  - *Endurance:* a compressed 24-hour race with a day–night cycle, headlights, fuel, tyres and pit stops, and a multi-class race with GT traffic.
  - *Touring cars:* reverse-grid sprints.
  - *Rally:* single stages and a three-stage event against rival times. A co-driver calls pace notes on screen and by voice. Also a head-to-head super special.
  - *Rallycross:* heat and final, with a mandatory joker lap.
  - *Drag racing:* a Christmas tree with a trans-brake launch, reaction time, elapsed time and trap speed, red lights, bracket racing with a dial-in, and a four-round eliminator ladder. Top Fuel cars deploy a parachute.
  - *Land speed:* standing mile and flying mile.
  - *Drifting:* score attack with angle × speed combos, tandem battles with a proximity bonus, and touge runs.
  - *Formula E:* battery management, and an Attack Mode you arm by driving through the activation zone.
  - *Karting:* pre-final and final.
  - *Dakar:* rally-raid stages with waypoints, staggered-start Baja races and a checkpoint time-extension mode.
  - *Hill climb:* single run, or best of two runs.
  - *Dirt oval:* heat race then A-main.
- **Customisation: 69 options per car**, saved per car:
  - *Paint:* three colours, eight finishes (gloss, metallic, matte, satin, chrome, pearl, candy, flake), weathering.
  - *Livery:* 24 patterns with adjustable scale, race number in five styles, sponsor sets, roof number, window tint.
  - *Wheels & tyres:* 14 rim designs (wire, Minilite-style split, BBS-style mesh, dish, turbofan, beadlock and others), rim colour, finish and size, sidewall lettering, 11 tyre compounds, pressure, brake caliper colour.
  - *Aero & body:* five rear-wing levels plus a Superbird hoop, splitter, skirts, diffuser, dive planes, wide-body fenders, roof or hood scoops, mud flaps, rally light pod, exhaust tips, headlight tint, underglow, backfire flame colour.
  - *Driver & cockpit:* helmet colours and design, race suit, gloves, roll cage, window net, steering lock and sensitivity.
  - *Tuning:* engine tune, boost, rev limiter, final drive, manual or automatic gearbox, nitrous, ride height, camber, toe, springs, dampers, anti-roll bars, weight reduction, ballast, brake bias and pressure, differential lock, and the traction control, ABS, stability and steering assists.

  Tuning options marked "physics" change how the car drives. Downforce, anti-roll bars, the differential, brake bias, camber, tyre compound and pressure, power and gearing are all in the vehicle model.
- **Procedural car models** built from lofted body sections with period-specific shapes:
  - *Single-seaters:* front-engined Alfettas, 1960s cigars with exposed engines, the 1968 high-strut wings, ground-effect sidepods, raised noses, the 2017 wide cars, halo, aeroscreen and Formula E fairings. The Tyrrell P34 has six wheels and the Brabham BT46B has its fan.
  - *Closed cars:* saloons, hatchbacks, estates, coupés, GTs, stock cars, Group C, LMP and hypercars, pickups, SUVs, buggies, a Kamaz-style lorry and streamliners.
  - *Specialist chassis:* funny cars, Pro Stock, gassers, front- and rear-engined dragsters, sprint cars with top wings, midgets, karts with a full seated driver, and pre-war racers with wire wheels and mudguards.
- **Animation:**
  - wheels spin and steer, the bodies pitch, roll and heave on their suspension, and open-wheel suspension arms follow the wheels
  - the steering wheel turns and the driver's arms reach to it, and the helmet leans into corners
  - DRS flaps open, the BT46B fan spins and parachutes deploy
  - brake discs glow and brake lights come on
  - exhausts backfire with flames on lift-off and upshifts
  - tyres smoke, loose surfaces throw dust, rain throws spray and walls throw sparks
- **First-person cockpit view** for every car. The cockpit has a modelled interior (window openings, pillars, roll cage, dashboard) and a live dash or steering-wheel display with shift lights, gear, speed and lap time. The driver's head moves with g-forces. There's also a rear-view mirror inset, plus chase, far chase, hood, bumper and TV cameras.
- **Physics:** a single-track vehicle model with tyre slip curves and a friction circle, longitudinal and lateral load transfer, aero downforce and drag, power curves, gearboxes, and grip for each surface and tyre compound (tarmac, gravel, dirt, mud, snow, sand, salt and wet tarmac). Ovals are banked, crests launch the car into jumps, the lead car gives a slipstream and dirty air, and tyre wear, fuel, battery energy and damage are modelled.
- **AI opponents** drive each car's real performance envelope. Their speed comes from the car's grip, downforce, power and braking on that track. They follow a racing line, overtake, draft, make occasional mistakes and pit. There are five difficulty levels and optional catch-up.
- **Audio** is synthesised for each engine type: straight-8 and V12 harmonics, a V10 scream, the 2-stroke kart buzz, turbo whistle and blow-off, electric whine, jet turbines and nitromethane V8s. There are also tyre squeal, gravel, wind, rain, crowd, impacts and start-light beeps.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Throttle |
| S / ↓ | Brake. Hold it when stopped to reverse. |
| A D / ← → | Steer |
| Space | Handbrake |
| E or Shift / Q or Ctrl | Shift up / down. G toggles manual gears. |
| C | Cycle cameras |
| B | Look back |
| F | DRS, push-to-pass, Attack Mode or nitrous |
| P | Pit stop: in the zone before the start line, below 80 km/h |
| T | Traction control on/off |
| H / M | Headlights / mirror |
| R | Reset to the track |
| Esc | Pause |

Gamepads are supported: analog steering, throttle and brake on the triggers, and buttons for shifting, cameras, reset, boost and pit.

## Files

| File | Contents |
| --- | --- |
| `js/cars.js` | Disciplines, the car roster, tracks and mode descriptions |
| `js/tracks.js` | Track generators, surfaces and track queries |
| `js/models.js` | Materials, livery painter, lofted bodies, wheels, drivers and mesh merging |
| `js/models2.js` | Body builders for each car type, and the animation rig |
| `js/physics.js` | Vehicle dynamics, tyre compounds and the AI speed profile |
| `js/ai.js` | AI drivers and an autopilot used for testing |
| `js/world.js` | Sky, terrain, road, kerbs, barriers, grandstands, pits, scenery, particles and rain |
| `js/audio.js` | Synthesised sound |
| `js/modes.js` | Mode presets, event sequencing, points and pace notes |
| `js/game.js` | Race sessions, timing, cameras, collisions, drag tree, drift scoring, pit stops and ghosts |
| `js/ui.js` | Menus, garage, HUD and results |

## Notes

- Car specifications are approximate period race-trim figures. Track names are fictional or loosely inspired by real venues, and their layouts are generated rather than surveyed. Sponsor names on liveries are made up.
- Settings, car setups, ghosts and best laps are kept in the browser's local storage.
