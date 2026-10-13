# Crumble

A voxel demolition and heist sandbox for the browser, built with Three.js (r128). Open `demolition/index.html` from any static server.

Everything is made of 25 cm voxels: about 5 million cells per 64 × 64 m map.

- **Destruction by material.** Glass, foliage and hay shatter at a touch. Timber and plaster break under the sledgehammer, and so does brick. Concrete needs explosives. Steel needs the blowtorch or a rocket.
- **Structural collapse.** After every break the game flood-fills outward to see what still reaches the ground. Anything that doesn't becomes a rigid body: it falls, tumbles, smashes what it lands on, and settles back into the grid.
- **Fire.** Timber, shingle, hay and foliage burn. Fire spreads, chars what's next to it, and eats its fuel until whatever it held up falls.
- **Tools.** Sledgehammer, blowtorch, extinguisher, spray can (to mark routes), pistol, shotgun, hunting rifle (shoots through soft walls), planks (bridge any two points), pipe bombs, remote charges (set several, then fire them all at once) and a rocket launcher.
- **Maps.**
  - *Gull Point*: a harbour town.
  - *Redcut Quarry*: a terraced pit with a tower crane, a crusher plant and an explosives bunker.
  - *Ashgrove Estate*: a walled country house with wings, a portico, a greenhouse, a pool and a hedge maze.
  - *Tollbridge Old Town*: canal rows, brick bridges, a bell tower, a market and a town hall.
- **Fourteen drivable vehicles.**
  - Sedan, sports car, pickup, box truck, dump truck, wheel loader, bulldozer and motorboat.
  - A wrecking-ball crane: the ball swings on a pendulum and smashes walls.
  - An excavator that digs ground and walls.
  - A fire engine with a water cannon.
  - An armoured vehicle with a cannon and a machine gun.
  - A forklift that lifts debris.
  - A helicopter with a magnet winch.
  - Every vehicle can be destroyed. Shots, blasts, crashes and falling rubble knock parts off it, and a wreck bursts apart and burns.
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
