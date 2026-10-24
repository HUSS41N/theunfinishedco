# What If v2: the flat-vector layer engine

A second art style for the What If channel, beside the v1 minimalist stickman (`../whatif-kit`, unchanged).
v2 is **flat vector, layered SVG, cutout-rig animation**: saturated flat colour, no outlines, same-hue shade shapes clipped
inside each part, big expressive heads, rounded-tube limbs, dark charcoal sets with a soft pool of light.
Everything is generated from **JSON**, so Claude CLI writes a scene file and the engine renders it.

```bash
npm install                                        # once: @resvg/resvg-js (the SVG rasteriser)
node src/render.mjs examples/cinema-stranger.json  # → build/cinema-stranger/cinema-stranger.mp4 (with sound)
node src/render.mjs scene.json --check             # validate
node src/render.mjs scene.json --stills 1,4.5      # PNG stills
node src/render.mjs scene.json --sheet             # one frame per second
node src/render.mjs scene.json --layers 2          # the layered SVGs for that frame
node src/render.mjs --cast examples/cast-family.json   # character sheet: expressions × poses
node src/render.mjs --list                         # the whole vocabulary as JSON
```
The format is in **[docs/SCENE-FORMAT.md](docs/SCENE-FORMAT.md)**. Speed: about 20 frames/s on this Mac (a 14 s video renders in about 16 s).

## How this style is made (research), and how the engine copies it

| In the studio pipeline | In this engine |
|---|---|
| Characters and props are drawn as flat shapes in Illustrator, then animated in After Effects ([DVXUser thread](https://www.dvxuser.com/threads/2d-animations.352427/)) | `src/character.mjs`, `src/props.mjs` and `src/backgrounds.mjs` generate the shapes as SVG; `src/scene.mjs` animates them |
| Each body part is its own layer, with its anchor point moved to the joint so limbs rotate believably ([Duik rigging](https://tristanamond.substack.com/p/animation-duik-after-effects)) | every limb is built from its joint: angles at shoulder/hip, elbow/knee relative to the parent |
| A rig hierarchy: arms parent to the torso, legs to the hips, neck and head follow the torso; layer order is render order ([Toon Boom cut-out rigging](https://docs.toonboom.com/help/harmony-24/premium/getting-started/character-building.html)) | pelvis → torso(lean) → neck → head(tilt); torso → arms; pelvis → legs. Named `<g data-layer>` groups in fixed order |
| Flat colour, no outlines, minimal shading; shading by clipping a darker shape inside the part ([Cutout and Keep](https://cutoutandkeep.net/projects/character-illustration), [Shutterstock tutorial](https://www.shutterstock.com/blog/flat-design-character-illustrator-tutorial)) | `clipped()` puts a same-hue shade shape inside the torso, face, garments and props; limbs use an offset narrower shade stroke |
| Motion is basic: rotations at joints, position and scale keys, eased; mouths and eyes swap | keyframes (pose angles, position, face) with easing, plus `do` cycles: blink, talk, chew, walk, wave, laugh, tremble, jump |

### Read from the reference image
Each item is followed by how the engine implements it.
- Saturated orange skin with a darker same-hue side: `SKIN.orange` and `face-shade`.
- Uniform-width limbs with round ends: the round-capped `stroke()`.
- Mitten hands with a thumb: `handShape()`.
- White oval eyes with large dark pupils and a catch-light: `eyes()`.
- Open mouth with a white teeth band and a pink tongue: `mouth('grin'|'open'|'scream')`.
- Hair as solid shapes with a lighter streak: `hairFront()` and `hairBack()`.
- Red seats with a darker side and a highlight: `SCENE.seat`.
- Popcorn tubs with stripes: `HELD.popcorn`.
- A dark charcoal set with a soft radial light pool, and dark contact shadows on the floor: `SETS.spotlight` and `SETS.cinema`.
- Heavy white headline type with a hard soft-black drop shadow: scene `text`.

## Layers
Every frame is one SVG document:
```
world (camera)
 ├─ bg:* (wall, light pool, back rows, floor)           set.back
 ├─ actor:* with "behind": true                          (e.g. behind the seat row)
 ├─ bg:seat-row …                                        set.mid
 ├─ prop:* (layer back)
 ├─ actor:<id> → character:<id>
 │    ├─ shadow · legs[leg-L, leg-R] · torso · neck
 │    ├─ head[hair-back, ears, face, face-shade, cheeks, eyes, brows, nose, mouth, hair-front, accessory]
 │    └─ arm-L · arm-R (+ held:<prop> at the hand)
 ├─ prop:* (layer front)
 └─ vignette                                             set.front
screen: text · overlays (flash / fades)
```
`--layers t` writes `set.svg`, `props.svg`, `actors.svg`, `composite.svg` and `layers.txt` (every named layer). They open in any SVG editor (Illustrator, Figma, Inkscape) as editable groups.

## Files
| Path | What |
|---|---|
| `src/svg.mjs` | SVG builder: layers, shapes, clip paths, blobs, gradients |
| `src/style.mjs` | v2 palette: skins, hair, cloth, environment; shade/light derivation |
| `src/character.mjs` | the parametric character, the rig, the poses, the walk cycle, faces |
| `src/props.mjs` | held props and scene props |
| `src/backgrounds.mjs` | set presets: spotlight, cinema, room, street, park, office, nightCity, solid |
| `src/scene.mjs` | JSON → per-frame layered SVG; keys, easing, actions, camera, text, overlays; sound events |
| `src/render.mjs` | CLI: video, stills, svg, layers, sheet, cast sheet, check, list |
| `fonts/` | Inter Display / Inter TTFs (OFL), used for SVG text |
| `examples/` | `cinema-stranger.json` (the reference-style demo), `park-hello.json` (engine test), `cast-family.json` |

Sound uses the What If kit's synthesiser (`../whatif-kit/sfx.py`) and loudness-normalises to −14 LUFS.

## Limits (v0.1)
- Characters are front-facing with a 3/4 face turn. There is no true profile body yet, so a walk reads as a front-3/4 walk.
- Sitting is a front view with foreshortened thighs (`la`).
- Hands are mittens. There is no finger posing beyond the thumb.
- Props and sets are a starter library. Add new ones as functions in `props.mjs` / `backgrounds.mjs`, and they become available to JSON by name.
