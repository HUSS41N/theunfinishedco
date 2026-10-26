# World: sets and props (v3)

Owner: world. Files: `src/backgrounds.mjs` (sets), `src/props.mjs` (props, palettes), `src/svg.mjs` (SVG helpers, style context),
`tools/world-harness.mjs` (verification).

## Scale

Everything is drawn at **real scale for an actor at scale 1**: 800 px ≈ 1.7 m, so **1 m ≈ 470 px** (`M` in props.mjs).
Frame wider shots with camera zoom (down to 0.4), not by shrinking actors.

| thing | real | px | origin |
|---|---|---|---|
| storey (facades) | 3 m | 1410 | bottom centre |
| door (with casing) | 0.9 × 2.1 m | 420 × 990 | bottom centre |
| window (glass) | 1.2 × 1.4 m, sill 0.9 m | 560 × 660 | bottom centre of the glass: place at `floorY − 430` |
| desk / table top | 0.75 m | 352–362 | bottom centre |
| kitchen worktop | 0.92 m | 450 | bottom centre |
| chair / sofa / bench seat | 0.45 m | 210–232 | bottom centre |
| sofa | 2.0 × 0.85 m | 940 × 410 | bottom centre |
| bed | 2.0 m long, mattress 0.55 m, headboard 1.15 m | 980 × 540 | bottom centre |
| cinema seat | 0.6 × 1.05 m | 280 × 495 | bottom centre |
| floor lamp | 1.6 m (table lamp 0.5 m, `table: true`) | 750 | bottom centre |
| floor plant | 1.2 m | 560 | bottom centre |
| fridge | 0.7 × 1.85 m | 340 × 870 | bottom centre |
| wardrobe / bookcase | 2.1 m / 1.9 m | 1000 / 900 | bottom centre |
| TV (55") | 1.2 m wide | 570 × 380 | stands on its surface |
| laptop | 33 cm | 192 × 128 | stands on its surface (desk top = `y − 362`) |
| mirror (default) | 0.9 × 2 m | 420 × 940 (`w`, `h`) | bottom centre |
| patient monitor | screen at 1.5–1.85 m | 880 | bottom centre (wheels) |
| IV stand | 2 m | 940 | bottom centre |
| street lamp | 4.5 m | 2140 | bottom centre |
| bus shelter | 2.6 m, sign 2.8 m | 1260 | bottom centre |
| tree | ≈ 5.5 m, canopy ≈ 4 m (`h`) | 2600 | bottom centre |
| car | 4.5 × 1.6 m | 2100 × 750 | bottom centre (wheels on y) |
| fountain | basin 3 m, 2 m tall | 1480 × 950 | bottom centre |
| wall clock | 30 cm | r 78 | **centre** |
| picture frame | `w × h` (default 360 × 280) | | **centre** |
| lantern / pendant | | | **hang point** (ceiling: `ceilY + 40`; ceiling is at `floorY − 1320`) |
| rug | `w × h` ellipse | | **centre**, on the floor |
| phone (held) | 15 cm | 82 | grip point |

Story props (`tag`, `thought`, `bubble`, `phoneUI`, `board`, `checklist`, `brickWall`, `flower`, `flowerTrail`, `rope`,
`stars`, `svg`, held items) are graphic devices: their size is a design choice and did not change. `rocket` is ≈ 1.3 m now.

## Layers

Every preset returns `{back, mid, front}` (scene.mjs draws: back → actors with `"behind": true` → mid → props → actors →
props(front) → front). `mid` holds what you can stand behind; it is `[]` where a preset has nothing there.

## Coverage

Sets cover world x −3400..4600, y −3400..5600, so camera zoom ≥ 0.4 at x −1500..2600, y 0..1920 never shows an edge
(the harness probes the corners and prints `edges: OK`). Interiors are one-point-perspective boxes: the back wall stands on
`floorY`, side walls start at the corners `L`/`R` (visible on wide pans), a perspective floor and ceiling, skirting, cornice.
The vanishing point is at eye height (`floorY − 730`) over x = 540.

## Presets

All take `floorY` (default 1500; `street`, `nightCity` 1560) and render in both styles.

| preset | options | back | mid |
|---|---|---|---|
| `spotlight` | `color` | flat: charcoal void + light pool; stick: a pale tiled studio void (reference 2.png). A dark `color` is lifted to a pale tint in stick. | – |
| `cinema` | `seatX`, `rowY`, `seats`, `spacing` (300) | 6 rising stadium rows, wall panels, sconces, EXIT sign | the front seat row across the whole width (the given `seatX` seats are always in it) |
| `room` | `wall`, `floor`, `window`, `night` | window (curtains in stick) at x 778, portrait + abstract frames, shelf, clock, bookcase (2250), door (−1000), floor lamp (−560), plants (1300, −2150), rug, light pool | – |
| `street` | `sky`, `night`, `seed` | sky, far skyline, a continuous row of 2–6-storey facades with shopfronts, awnings, doors; pavement, curb, road; bin, hydrant, tree | lamp posts at −1150, 2150, 4300 |
| `park` | `sky`, `seed` | sky, sun, clouds, hills, a far tree line, mid trees, path, bushes, bench (1750), lamp post, flowers, big trees at −2000, −300, 2200, 3900 | hedges at −1300 and 2700 |
| `office` | `wall` (a dark wall gives a night office) | floor-to-ceiling windows onto the city (−1100..2300), ceiling panels, carpet, whiteboard, door, plants, a desk at 3200 | – |
| `nightCity` | `seed` | stars, moon, two skyline layers with lit windows across water, a promenade rail, lit lamp posts | – |
| `solid` | `color`, `vig` | one colour | – |
| **`kitchen`** | `wall`, `floor`, `table`, `tableX` | tiled splashback, worktops with sink and hob (−700), wall cabinets, fridge (2050), window over the sink (900), clock, coffee machine; stick: a red lantern, flat: a pendant | `table: true` → a dining table at `tableX` (stand behind it with `behind`) |
| **`bedroom`** | `wall`, `floor`, `night`, `bedX` (1500) | bed + nightstands, wardrobe (−800), curtained window (540), frames, shelf, door, rug | – |
| **`cafe`** | `wall`, `floor`, `counterX` (2050), `menu` | shop window onto the street (−1800..−150), menu board, café tables (−1000, 1000), chairs, pendants (one red in stick), plant | the counter with an espresso machine and cake (barista stands `behind` at ≈ 2000) |
| **`hospital`** | `wall`, `floor`, `bedX` (1450), `beat` | hospital bed, patient monitor, IV stand, chair (300), window (540), clock, privacy curtain, ceiling panels, lino | – |
| **`bus`** | `night`, `seed` | a long run of windows (street outside), seats along the wall, straps, rail, light strip | yellow grab poles at −1300, 1950, 4300 |
| **`rooftop`** | `seed` | night sky, moon, skyline, parapet (1.2 m), stair hut with a lit door (−1300), water tank (2500), string lights, plants | – |
| **`classroom`** | `wall`, `floor`, `label`, `desks` | chalkboard (2400 wide at 540, `label` writes on it), clock, windows (2500, 3400), pinboard with posters, teacher's desk (1100), bookcase | `desks: true` → school desks + chairs at −1400, −600, 2400, 3200 |
| **`livingRoom`** | `wall`, `floor`, `night`, `sofaX` (540), `sofa` (colour), `lantern` | sofa against the wall, floor lamp, plant, TV on a console (1950), curtained window (−1300), frames, shelf, clock, door, rug; stick: a red lantern | – |

## Styles

`spec.style === 'stick'` → the v1 look; anything else → flat (v2). scene.mjs passes `style` to `buildSet` and to each prop
(`sceneProp({..., style})`). Held props take `item.style`, or the 6th argument `PROPS_HELD(item, p, deg, side, t, {style})`,
or the active style (wrap a build in `withStyle('stick', () => …)`).

| | flat (v2) | stick (v1) |
|---|---|---|
| outlines | none; shading is a second flat shape | warm-black ink `#2A2522`, ~6 px at scale 1, round joins (held props 4.5 px) |
| palette | `WORLD.flat` (the v2 colours) | `WORLD.stick`: cream walls, pale wood, muted sage, dusty red; 1–2 brighter accents per set (red lantern, green plant, awnings) |
| user colours (`color`, `wall`, …) | as given | softened toward warm paper (`soften`) so they sit in the palette |
| night / dark sets | dark navy / charcoal | mid-value lavender / dusty rose, so black stick limbs still read |
| vignette | soft, world-space | none (light and airy) |
| floor lines | subtle shade of the floor | tan lines (not ink) |

How it works (svg.mjs): `withStyle(style, fn)` sets a module-level style for the duration of `fn` (nestable, restored in
`finally`, so it is deterministic and browser-safe). In stick mode `path/rect/circle/ellipse/poly` add an ink stroke to every
solid-filled shape. Per-shape: `{ink: false}` (shading), `{ink: 'thin'}`, `{ink: 'bold'}`, `{ink: <px>}`. Shapes with
`fill="none"`, a gradient fill, an explicit stroke or opacity < 1 never get one. `rod()` gives poles an ink casing,
`cluster()` gives foliage/clouds one outer outline, `inkOver()` redraws an outline that shading covered. Palette lookups:
`P(key)` (active style), `col(value, key)` (user value or palette key, softened in stick).

## resvg rules the world follows

- **No clip groups and no group opacity** in sets or props: resvg 2.7 panics when such a group's content lies wholly right
  of / below the canvas, and every clip group costs a mask (a guarded one ≈ 0.1 s per 1080×1920 frame). Window views,
  floor patterns, awnings, pictures are pre-fitted geometry instead. Set frames rasterize in 60–100 ms.
- Single translucent shapes are written as `fill-opacity` (safe off canvas). Prefer pre-blended solid colours.
- A prop with `opacity` between 0 and 1 gets `GUARD` (an invisible giant rect) inside its group; `opacity: 0` draws nothing.
- `svg.mjs` exports `GUARD`, `clippedSafe()` and `guardSVG(svg)` (retry a panicking frame with every clip/opacity group
  guarded).

## Verify

```
node tools/world-harness.mjs                 # build/world/sheet-{flat,stick}-{1,2}.png, props-{flat,stick}.png, edges.txt
node tools/world-harness.mjs --only cafe,bus
node tools/world-harness.mjs --frame kitchen stick 0.55 700 1000   # one full-size frame
```
The stand-in is 800 px tall (1.7 m) with a 2 m ruler (ticks every 0.5 m).

## The Last Bus (night world)

Presets and props for *THE LAST BUS* (the-last-bus/STORYBOARD.md), drawn at real scale, centred on **x = 960** (the
16:9 frame centre), floorY 1500. Night palette `NIGHT` in props.mjs; light, grade and atmosphere are shot fields
(SCENE-FORMAT.md, "Light, grade and atmosphere"). Every preset renders at 1920×1080 and 1080×1920 and in both styles.
Demo of everything: `the-last-bus/demo/world-demo.json` (16:9) and `world-demo-9x16.json` (`node make-demo.mjs` writes both).

Code: `src/nightbus.mjs` (oldBus, busExterior, tunnel, the ghat road, the light passes, the night backdrop); story
props in `src/props.mjs`; Hindi signage is pre-shaped outlines in `src/devanagari.mjs` (resvg garbles Devanagari text —
add a string to `tools/gen-devanagari.mjs` and re-run it; needs `hb-view` from harfbuzz).

**One bus, one palette** (`BUS` in nightbus.mjs): a worn state-transport interior — deep teal lower panels and seat
frames, ivory upper wall/ceiling with teal pinstripes, aluminium trim with rivet rows and rust runs, rust-red rexine
seats with faded printed covers and white headrest towels, louvered aluminium shutters part-way down, painted
Hindi/English notices (महिलाएँ LADIES, धूम्रपान निषेध NO SMOKING, वरिष्ठ नागरिक, बिना टिकट…), yellowed tubes, caged fans,
a bell cord, leather straps; at the cab a header board (शुभ यात्रा, route plate 13 · सिटी सेंटर · CITY CENTRE), the
driver's shrine (framed ॐ, marigold garland, a red zero-watt bulb), nimbu-mirchi, the conductor's ticket rack. Interiors
set `info.gradeAs: {night: 'bus'}`: a `grade: 'night'` shot grades with the warm, slightly sick `bus` preset while the
night outside (`EXT`, cold blue) stays cold.

**Outside** (every exterior and window): a ghat road at night — two mountain ranges with moonlit rims, forested hills
with village lights, a tree line, trees / bushes / electric poles with sagging wires, verge bushes, rocks, milestones,
a black-and-white parapet, sodium lamps, fog banks between layers. Side windows are an orthographic parallax strip
(`roadside`: layers at depth 0.012 … 1 scroll at v·190·dp px/s, each silhouette sampled on its own scrolling lattice
so it never boils, fast layers smeared by a half-frame shutter, periodic features ≥ 2.5× their per-frame travel so
nothing wagon-wheels); the aisle / windscreen / mirror see the same road in perspective (`roadAhead`).

**Light passes**: every bus interior gets window-shaped soft sodium pools when a street lamp passes (the same
`lampAt` lamps as the exterior), sliding across passengers, seats and floor; steady cadence LAMP_SPACING / speed
(≈ 3.8 s at 9 m/s), off when stopped, the tunnel's own 6 m lamps (orange) inside a tunnel. No light needed; a
`{type: 'sweep'}` light only overrides `intensity` (old band values are scaled ×0.6), `color`, `every` (s), `from/to`.
Opt out per shot with `{type: 'sweep', intensity: 0}`.

### `oldBus` — an old Indian state-transport bus at night

| view | what | options |
|---|---|---|
| `side` (default) | the window wall: side-facing benches (rexine backs, printed covers, towels, split cushions, teal frames), ivory pillars with rivets and seat numbers, aluminium window frames with sliding panes and shutters, the signage band, tubes and caged fans, bell cord, grab rail + straps, poles (mid) | `front: left|right` (which way the bus drives; the exterior streams the other way), `outside: road|tunnel`, `passes: [{at, depth, dx, what, seed}]` |
| `aisle` | one-point perspective down the aisle: benches along both walls, windows both sides, tubes, rails, straps, poles (mid). `toward: front` ends at the cab: partition, steering wheel, the **driver's back with his khaki cap** (`driver: false` to place your own), the small rear-view mirror over the windscreen; `toward: rear` ends at the back row and rear window | `toward`, `driver`, `length` (m, default 9.6 front / 6.6 rear), `dipSeat` (0–4, back row), `dip` (number or `[{t, v}]` 0..1: the empty seat creaks and sinks), `oncoming: [{from, to}]` (headlights in the windscreen), `outside: road|tunnel` |
| `mirror` | close-up of the rear-view mirror over the windscreen: header, visors, route plate, the moving road through the glass, a swinging nimbu-mirchi charm. The mirror glass is a **slot**: actors with `crop: [470, 170, 980, 330, 40]` appear in it over a reflection | `reflect: interior` (the bus behind the driver, tubes flicker with the shot) `| road` (the road pouring away behind the bus: put Aarav small in it), `charm`, `oncoming` |
| `door` | the open front door from inside: folded leaves, grab poles, stairwell steps down to the road; the bus wall is in `mid`, so actors marked `behind: true` are outside, seen only through the door/window | `outside: road` (moving) or a set spec `{preset: 'lane', state, scale: 0.42, x, y: 1970}`: outside point (X, Y) appears at (960 + (X − x)·scale, y + (Y − 1500)·scale) |

Placement:
- **side**: seats every 270 px centred on 960 ± 135 (`x` = 825, 1095, 555, 1365 …), `y` 1500, pose `sit`; a window is
  centred on x 960 (glass 430 × 430 at y 600–1030). Window POV: camera `{x: 960, y: 815, zoom: 2.2}`; WS `{x: 960, y: 1010, zoom: 0.78}`.
- **aisle** (camera `{x: 960, y: 800, zoom: 1}`): a point (X m right, Z m away) on the floor is at
  `x = 960 + 1034·X/Z`, `y = 819 + 1499/Z`, actor `scale = 2.2/Z`. Bench sitters: X = ±0.95, Z = 1.6 … 7.6 in 0.6 m
  steps, `facing` toward the aisle, `face.turn` ±0.55. Tubes: indices 0–3 left wall far→near, 4–7 right wall
  (0 and 4 hang over the back row / the cab).
- **mirror**: the driver's eyes land in the slot at about `{x: 960, y: 2050, scale: 2.5, facing: -1}`; key `face.look`
  to slide his eyes to Aarav. Aarav in the road behind: `{x: 960, y: 418, scale: 0.2}`.
- **door**: camera `{x: 960, y: 1180, zoom: 0.72}`; the doorway is x 725–1195, y 540–1970.

### Exteriors

| preset | what | options |
|---|---|---|
| `busExterior` | the bus on a foggy ghat road. `angle: side`: the `busSide` prop (lit windows with passenger silhouettes, headlights, destination board) while lamps and trees stream past with `speed`; `tunnel: 'mouth'` puts the portal face in front so the bus drives into it. `angle: front`: the road in one-point perspective (rock cut + trees on the hill side, parapet + treetops on the valley side, poles, lamps); the bus drives toward the camera: `busZ` = start depth (m) or keys `[{t, v}]`; default: a moving shot starts it so it arrives at 5 m at the cut (shot speed), a still shot parks it at 14 m; `busX` (m, default 1.45, its own lane). Its headlights light the road and fog; `info.headlamps` anchors the `headlights` light on them. `tunnel: 'mouth'`: we are inside the tunnel, its portal (ring joints, a sodium lamp overhead) frames the road | `angle`, `bus`, `busX`, `busZ`, `tunnel`, `tunnelX`, `front`, `board`, `route`, `headlights` |
| `tunnel` | inside the tunnel looking ahead: sodium lamps rush past (with `speed`), lane dashes | `exit: true` (the far end glows) |
| `teaStall` | the roadside chai stall at night: blue tarp, CHAI sign, kettle, jars, a red plastic chair upside down on the side table, a single bulb that flickers (the same `teaStall` prop the window exterior passes) | `lit`, `stallSeed` |
| `lane` | a narrow lane, one two-storey house (3 m storeys, plinth, balcony, black water tank) under a flickering streetlight on an electricity pole, row houses either side, a low compound wall. `state: alive`: warm lit windows (a room with balloons behind them), the HAPPY BIRTHDAY bunting across the doorway; `state: abandoned`: the same coordinates, faded paint with peeling patches, damp, vines, weeds, a cracked pane, dusty dark glass, the gate hanging open, TO LET | `state`, `banner`, `paint` |
| `homeStreet` | Aarav's street at dawn: the road in one-point perspective between row houses, his house at the end at real scale, the upstairs window lit (a slot for Ma) | `lit`, `paint` |
| `kitchenTable` | the `kitchen` preset with the table, Ma's phone lying lit on it, a mug, a calendar, a portrait frame | `tableX`, `phone: lit|dark|call` |
| `crashFlash` | live flash frames: `frame: headlights` (a wet road, a truck grille and two lamps rushing in, the horn's glare), `glass` (the windscreen cracks from one point, shards burst), `phone` (a phone skids to rest on wet asphalt, cracked, "MUM calling", rain rings) | `frame`, `dur` (s, how long the motion takes), `who` |

Slots (actors `behind: true`, or `crop`): lane ground-floor window x 1380–2020, y 680–1380, inside floor y 1340 (a
child's head and shoulders clear the sill); lane upstairs window x 630–1290, y −390–310 (inside floor y −70);
homeStreet uses the same house (Ma upstairs at y −70). Recommended WS cameras: lane `{x: 960, y: 420, zoom: 0.31}`,
homeStreet `{x: 960, y: 250, zoom: 0.32}`, teaStall `{x: 960, y: 1020, zoom: 0.55}`, busExterior side `{x: 960, y: 900, zoom: 0.3}`.

### Props

| prop | what | options |
|---|---|---|
| `cakeBox` | a bakery box (26 cm): open — lid swung up behind (kraft inside lit by the candle), printed front wall (Sweet Home), a round strawberry cake with glaze drips, piped shell borders, sprinkles, rosettes, "Happy Birthday"; one striped candle bent over by `bend` with a wax drip, an upright layered flame — or closed with a ribbon | `open`, `bend` 0..1 (straight → bent against the frosting), `flame` (flickers, < 5 Hz), `smoke` (a thread of smoke when the flame is out), `frosting`, `glow` |
| `destinationBoard` | amber LED route board (1.6 m) | `text`, `route`, `prev` + `change` 0..1 (keyable: `prev` squashes out, `text` in — the series sting) |
| `phoneUI` | new modes: `lock` (11:59 PM, date, NO SIGNAL, a notification card: `notifs: [{title, body, when}]`, default MUM · 7 MISSED CALLS), `voicemail` (`who`, `when`, `length`, `progress` 0..1 keyable, `playing`), `call` (`who`, `sub`: "MUM calling…"); `cracked: true` (+ `crack: [u, v]` impact point) works on every mode | `mode`, `cracked` |
| `phoneFlat` | a phone lying on a table / the road, screen lit | `screen: lit|dark|call`, `cracked` |
| `birthdayBanner` | a string of pennants, one letter each; origin = left tie point | `text`, `w`, `dy`, `sag`, `colors` |
| `plasticChair` | a red monobloc chair (seat 0.45 m) | `color`, `upside` (legs up, origin = the seat on the table) |
| `teaStall` | the stall itself (2.6 m wide) | `lit`, `t`, `flicker`, `seed` |
| `garland` | marigold wedding garland; origin = the neck | `w`, `drop`, `color`; also HELD |
| `schoolBag` | a school backpack with a cricket bat strapped to it | `color`, `bat`; also HELD |
| `soldierCap` | an Indian Army olive beret with a brass badge, or `kind: 'peaked'` | `kind`, `color`; also HELD |
| `wristband` | a hospital ID band at about 2× life so its label reads in an insert | `label`, `name`; also HELD |
| `busSide`, `busFront` | the same red-and-cream state bus, 12 m × 3 m, from the side / front: cream belt with राज्य परिवहन, LED route board, round headlights, no roof lamps | `board`, `route`, `lit`, `headlights`, `passengers` (side), `glare` (front), `door` (side) |

HELD (in a hand): `garland`, `schoolBag`, `soldierCap`, `wristband`, `cakeBox` (closed).

### Speed (render.mjs, 1920×1080, this Mac; `node tools/fx-bench.mjs scene.json t frames`)

| frame (film) | before the Oct revision | now |
|---|---|---|
| side two-shot, grade + flicker + pools + fog + rain (s3 5.5 s) | 52 | ≈ 65 |
| cake ECU on the side set (s1 0.5 s) | 49 | ≈ 65 |
| aisle WS, 6 actors (s1 8 s) | 69 | ≈ 75 |
| mirror + crop (s1 13.8 s) | 68 | ≈ 75 |
| busExterior front, tunnel mouth (s1 19.6 s) | 51 | ≈ 57 |

The window exterior costs ≈ 13 ms, atmosphere (fog + rain) ≈ 12 ms. Repeated small shapes (rivets, louvers, fringes,
diamonds, cake shells) are merged into single paths; fine detail is drawn only within ±2500 px of the set centre.
