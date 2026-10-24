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
