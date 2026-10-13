# Crumble

A voxel demolition and heist sandbox for the browser, built with Three.js (r128). Open `demolition/index.html` from any static server.

Everything is made of 25 cm voxels. Each map is a 192 × 192 m city, 768 × 112 × 768 voxels (66 million cells), on 4 m of solid ground. Chunks are meshed nearest-first while you play, and parked vehicles are merged into a few meshes until disturbed.

- **Destruction by material.** Glass, foliage and hay shatter at a touch. Timber and plaster break under the sledgehammer, and so does brick. Concrete needs explosives. Steel needs the blowtorch or a rocket.
- **Structural collapse.** After every break the game flood-fills outward to see what still reaches the ground. Anything that doesn't becomes a rigid body: it falls, tumbles, smashes what it lands on, and settles back into the grid.
- **Fire.** Timber, shingle, hay and foliage burn. Fire spreads, chars what's next to it, and eats its fuel until whatever it held up falls.
- **Tools.** Sledgehammer, blowtorch, extinguisher, spray can (to mark routes), pistol, shotgun, hunting rifle (shoots through soft walls), planks (bridge any two points), pipe bombs, remote charges (set several, then fire them all at once) and a rocket launcher.
- **Four city maps**, each with a street grid, districts and landmarks:
  - *Gull Point*: a harbour city with downtown towers and car parks, suburbs, the old waterfront town, a marina and an airport (airliner, cargo plane, business jet, light aircraft).
  - *Redcut*: an industrial town with factories, warehouses, a container yard, a lumber yard, a construction site, Redcut quarry and a fenced military base (battle tanks, tracked carriers, army trucks and vans, rocket launcher vans, jet fighters in hardened shelters, attack helicopters, watchtowers, bunkers).
  - *Ashgrove*: suburbs with Ashgrove Estate, a golf course with carts, a park, shops, a works depot and a small airfield.
  - *Tollbridge*: a dense old city on a canal with timber and brick rows, a bell tower, a town hall, a harbour basin and a building site.
- **56 drivable, destructible vehicles**, spawned where they belong:
  - *Civilian*, parked along the streets, in car parks and in driveways: saloons, a finned convertible, a fifties saloon, coupes, a boxy hatchback, a utility 4×4, a wedge supercar, a chrome cruiser, a big SUV, an estate wagon, a microcar, a muscle car, pickups, a golf cart, an ice cream van, a monster truck that crushes cars, and an articulated lorry.
  - *Industrial*: dump truck, wheel loader, bulldozer, excavator and mini excavator that dig, a cement mixer that pours concrete, a bucket truck, a snow plough and a fire engine with a water cannon.
  - *Utility*: forklifts (standard, heavy and warehouse), a telehandler, a mobile crane that hooks debris, a boom lift you can stand in, a wrecking-ball crane and a wood chipper that shreds timber and debris.
  - *Military*: battle tank, tracked carrier, army truck, army van, field jeep and a rocket launcher van.
  - *Boats*: speedboat, mahogany runabout, rowing boat, trawler, river cruiser, motor yacht and harbour tug.
  - *Aircraft*: light aircraft, business jet, airliner, cargo plane and jet fighter, all flyable, plus helicopters with a magnet winch or rockets.
  - Every vehicle can be destroyed. Shots, blasts, crashes and falling rubble knock parts off it, and a wreck bursts apart and burns.
- **Every building is walkable.** Each house, flat, office, shop, car park, hangar, barracks and tower has a street door and stairs (or a ladder) to every floor, and flat roofs are reachable. An automated walk-through checks this on every map by flood-filling every spot a player can stand from the spawn: all 1,436 floors pass.
- **Physics.** Falling debris breaks up where it hits and splits into separate pieces. Pieces collide with each other. Blasts throw vehicles around. Fuel barrels chain-react. Press F to grab loose debris and throw it.
- **Jobs.**
  - *Gull Point*:
    - *Clean Slate*: demolish the Halloway house.
    - *Kindling*: burn down the Pruitt barn against the clock.
    - *Night Shift*: a heist. Taking the first alarmed item starts a 75-second timer to grab the rest and reach the boat.
  - *Redcut Quarry*:
    - *Crane Down*: bring down the tower crane.
    - *Payroll*: a heist across the quarry.
  - *Ashgrove Estate*:
    - *Renovation*: demolish the east wing.
    - *Collector's Evening*: a heist across the estate.
  - *Tollbridge Old Town*:
    - *Bell Tower*: bring down the bell tower.
    - *Old Flames*: burn down the timber row.
    - *Market Day*: a heist across the town.
  - Every map also has a *Free Roam* with every tool, unlimited.

Controls: WASD, mouse, Shift sprint, C crouch, Space jump. 1–0 and − or the mouse wheel pick tools. E takes items and gets in or out of vehicles. F grabs debris. In work vehicles, R/F raise and lower, the mouse aims and clicking works. Esc pauses.
