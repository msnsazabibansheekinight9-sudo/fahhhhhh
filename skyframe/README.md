# Skyframe FPV

A browser FPV drone simulator built with Three.js (r128) — ten scenic worlds, rate-mode flight physics,
gate racing and a line-of-sight view. Everything is generated in code: terrain, water, skies, trees,
buildings, weather, the quad itself and its motor sound. There are no asset files, and the whole thing
is one HTML file.

Open `skyframe/index.html`. The easiest way is to serve the repo folder (for example `python3 -m http.server`)
and visit `/skyframe/`.

## The ten worlds

Each one is a terrain function plus its own light, fog, palette, props and weather. Nothing is hand-placed
except the landmarks, and those pick their own spot by looking for ground that suits them.

| World | What it is |
| --- | --- |
| **Alpenglow Fjord** | Ridged peaks at sunrise over a 120 m-deep fjord, pine stands to the treeline, seven waterfalls off the cliffs, a lighthouse on the point. |
| **Redrock Mesa** | Terraced buttes carved by a dry wash, saguaro and dead wood, two natural arches, dust devils drifting across the flats. |
| **Coral Atoll** | Nine palm islands on a reef ring in twelve metres of clear turquoise, stilt huts and timber piers, birds working the shallows. |
| **Ashfall Caldera** | A 1.5 km crater with a lava lake at −42 m, basalt spires, ember columns and ash on the wind. |
| **Sakura Terraces** | Stepped paddy hills in blossom season, torii gates, a five-tier pagoda, an arched bridge and petals coming down. |
| **Neon Harbour** | Night city of 1,250 towers with individually lit windows, neon signage, a harbour crane, canals and reflective water. |
| **Aurora Ice Shelf** | Polar night: pack ice, 240 m icebergs, a research station on stilts, snowfall and a live aurora in the sky shader. |
| **Cathedral Pines** | Dawn fog in 90 m redwoods, a river cutting the hills, light shafts through the canopy, fireflies and a cabin. |
| **Skylands Drift** | Sixteen floating islands over a cloud sea with no floor at all — waterfalls pour off the edges into nothing. |
| **Silt Sea Dunes** | Golden-hour dune waves with wind-carved outcrops, a ruined caravan camp and 12 kt of wind. |

## Flying it

- **Acro (rate) mode** — full rate, nothing self-levels, exactly like a 5" freestyle quad. Three rate sets:
  Calm (320°/s), Sport (520°/s), Race (820°/s).
- **Angle mode** — the quad returns to level when you let go, for learning the sticks.
- Thrust runs along the quad's own up vector at 2.8 g, with gravity, quadratic air drag (terminal dive
  around 170 km/h), per-world wind, and prop wash damping on the ground.
- Three views: **FPV** with adjustable camera tilt (0–45°) and field of view (80–145°), a smoothed **chase**
  cam, and **LOS** — you stand where you launched and watch the quad, zooming as it gets further away,
  which is how the real line-of-sight practice works.
- Hit terrain hard, clip a tree at speed, splash down or go into the lava and you crash — screen flash,
  shake, and a respawn at the last gate you passed.
- The pack drains with throttle. When it's empty the motors stop. **R** gives you a fresh one.

### Controls

| | |
| --- | --- |
| `W` `S` | throttle |
| `A` `D` | yaw |
| `↑` `↓` | pitch (stick up pitches the nose down and flies forward, as on a real transmitter) |
| `←` `→` | roll |
| `R` | respawn · `C` camera · `M` mode · `G` new course · `Esc` pause |

**Touch**: two on-screen sticks. The left pad holds its throttle position when you let go, like a real
transmitter gimbal; the right pad self-centres. **Gamepad**: any standard pad takes over the moment you
move a stick — left stick throttle/yaw, right stick pitch/roll, B respawns.

## Racing

Time trial builds a fresh course of 8, 14 or 20 gates every run, threaded around the world and set above
the terrain. The clock starts when you cross the first gate and each gate has to be crossed inside its
frame — the next one is lit blue, cleared ones go green, and the radar in the corner shows the whole
course plus your heading and horizon. Best times are saved per world and per course length.

## How it's built

- **Terrain**: a heightfield from value-noise fBm — ridged for mountains, terraced for mesas and paddies,
  domain-warped for canyons, radial masks for islands and the caldera. The same array feeds the mesh,
  the bilinear height lookup used for collision, and the slope test that decides what can grow where.
- **Props**: instanced meshes, up to 5,200 trees per world, scattered in stands rather than evenly, with
  per-instance tint. Large props register a cylinder in a spatial grid so you can hit them — and land on
  top of them, rooftops and island plateaus included.
- **Water**: a custom shader with travelling waves, analytic normals, ripple detail, fresnel sky mix, a
  tight sun glint and its own fog term. The same shader does the lava lake and the harbour's neon sheen.
- **Sky**: gradient dome with a correctly sized sun disc and halo, plus optional stars and a noise-driven
  aurora. Cloud decks are canvas-generated fBm textures drifting on two layers.
- **Quality** setting trades terrain resolution, prop density, pixel ratio and shadow maps.

Tested in headless Chromium: all ten worlds build and fly, gate detection, camera modes, respawn and
race timing verified, zero console errors. `window.SKYFRAME` exposes the drone, world, config and race
state if you want to poke at it from the console.
