# STICK style (v1 look) — `src/stick.mjs`

The channel's classic stickman, rebuilt as clean vector layers on the same rig as the flat character. Select it with
`meta.style: "stick"`, a cast entry's `"style": "stick"`, or `--style stick`. `buildCharacter` dispatches to
`buildStick(C, pose, {scale, facing, hold, shadow, t})`; the return shape is the contract's
`{svg, pelvis, height, anchors:{headTop, headCenter, mouth, handL, handR, footL, footR}}` (actor-layer coords, scale and
facing applied; `footL/R` are the ankles, like the flat rig).

## The look

- Big white round head (radius 112 px, ~28% of the height: between ref 3's chibi third and ref 2's classic), ink outline.
- Ink `#1E1E22`. Limbs 10 px, outlines 8 px, face marks 7 px, all round caps and joins.
- Limbs are straight bones with the elbow/knee rounded by a quadratic (the fillet grows as the joint folds), so joints look supple.
- Small white round hands with an ink ring; small ink oval feet (coloured, outlined shoes when `shoes.color` is set).
- Clothes are flat colour with an ink outline, worn over the stick. The top and its upper sleeves are drawn as ONE
  silhouette (all ink first, then all fills), so no seams cross the chest. Long-sleeve forearms keep their own outline so
  a forearm across the chest still reads.
- A hand raised above the middle of the head is drawn BEHIND the head (wave, cheer); lower hands are in front (think, phone).
- Colour is restrained: CLOTH colours softened 12% toward white; one or two colours per character; pink blush and the bow
  are the only accents.
- Soft grey shadow: two faint ellipses.
- About 790 px tall at scale 1 (stand pose).
- Deterministic: no randomness and no wobble. The same (C, pose, t) gives the same SVG, apart from the svg.mjs clip-id
  counter that scene.mjs resets every frame. The only time-driven part is the `chew` mouth (2 Hz).

## Pose schema

Same as the flat rig (V3-CONTRACT §2): `body {dx, dy, lean, scaleY, bend}`, `head {tilt, dx, dy, turn}`,
`armL/armR {a, b, c, la, lb, z, reach}`, `legL/legR {a, b, c, la, lb, reach}`, `face {...}`. Same angle convention:
0 = straight down, positive = outward, children add to parents.

- `reach` is a two-bone IK target (character-local, ground origin under the pelvis, +x facing). Arms pick the elbow down
  and out; legs pick the knee forward. Unreachable targets stretch the limb straight toward them.
- `bend` curls the chest about the lower torso.
- `head.tilt` pivots at the neck (torso top).
- `c` on a leg tilts the foot; on an arm it is added to the held prop's angle.
- `z: "back"` draws the whole arm, sleeve included, behind the top.

## Face fields

| field | values |
|---|---|
| `eyes` | `open` (oval dots), `wide` (white ring + big dot), `closed` (∪ arc), `happy` (∩ arc), `tired`/`bored` (half lid), `angry` (slanted brow over the dot), `squint` |
| `look` `[x, y]` | shifts the dots (and the mouth a little) |
| `turn` −1…1 | shifts all features sideways and narrows the eye spacing; the far eye narrows |
| `blink` 0…1 | squashes the dots; 1 = closed arc |
| `mouth` | `smile` (default), `grin`, `open`, `O`, `flat`, `sad`/`frown`, `scream`, `teeth`, `chew`, `smirk` |
| `brows` | none by default (the references have none); `up`, `raised`, `worried`, `sad`, `angry` draw short strokes (`flat` = none) |
| `blush` | two soft pink ovals |
| `lashes` | three small lash ticks per eye |

## Cast definition → stick (reads `C.raw`)

| cast field | stick result |
|---|---|
| `top.style` | `tee` (default, short sleeves), `stripes` (tee + 3 stripes in `top.detail` or white), `tank` (no sleeves), `hoodie` (long sleeves, hood line, pocket), `shirt` (long sleeves, collar, buttons), `jacket` (long sleeves, open front in `top.detail` or white), `dress` (short sleeves, waist seam, knee length, flared), `robe` (long sleeves, wrap collar, mid-shin, like ref 2), `apron` (white tee or `top.detail` + bib apron in `top.color` and neck straps, like ref 3), `none` (bare stick) |
| `top.color` | garment colour (softened). If no `top` is given at all: the reference's yellow tee |
| `bottom.style` / `bottom.color` | `jeans`/`pants`/`trousers` → outlined tubes along both legs; `shorts` → short tubes; `skirt` → outlined trapezoid. No `bottom` → plain stick legs |
| `shoes.color` | coloured outlined oval shoes (otherwise ink feet) |
| `hair.style` | `long`, `bob`, `bun`, `ponytail`, `pigtails` → a woman/girl: little **bow** + a few ink strands (long, bob, ponytail, pigtails) or a bun circle. Men: none by default (classic stick); `spiky`, `quiff`, `curly` → a few ink strokes on top; `short`, `buzz`, `bald` → nothing |
| `bow` | `false` disables the bow; a colour name or hex sets it; `true` forces a bow (with `woman: true` for a bow without women's hair). The default bow colour is the top's colour, or coral-red `#E5566A` when the top is neutral (white/grey/charcoal/black/navy/denim/tan/brown) or an apron |
| `accessories` | `cap`/`beanie` → ref-1 beanie (dome + ribbed cuff; default red); `{type: "cap", style: "peak"}` or `hat` → peaked cap; `glasses`, `sunglasses`; `headphones`; `mustache` (ink); `beard` (a small outlined chin beard in soft brown `#A88B70` that shares the jaw line and stays below the mouth); `mask` (off-white face mask). `{type, color}` sets the colour |
| `build.height` | body length (torso and limbs). The head does NOT shrink with it, so kids (`height ≈ 0.65`) get the big head of ref 3 |
| `build.head` | head size |
| `build.width` | top/hem width and shoulder spread (`> 1.1` gets an extra 10% wide top) |
| `build.limbs` | limb length and limb stroke weight |
| `skin`, `hair.color` | ignored (heads are white; hair is ink) |

## Layers

`character:<id>` › `shadow`, `legs` › `leg-L`, `leg-R`; upper body (lean) › `arm-*` (z:back), `torso` › `spine`, `top`,
`top-detail`; `bottom` (skirt); `neck`; `arm-*` (raised); `head` › `hair-back`, `face`, `cheeks`, `eyes`, `lashes`,
`brows`, `mouth`, `hair`, `accessory`, `bow`; `arm-*` (front). Held props reuse `PROPS_HELD` at the wrist, exactly as the
flat rig does.

## Verify

`node tools/stick-harness.mjs [cast|poses|walk|faces|all]` writes to `build/stick/`:

- `cast.png`: 16 characters beside the two references.
- `poses.png`: every POSE plus extremes, with the anchors dotted and the IK targets in red.
- `walk.png` and `walk-onion.png`: 12 consecutive frames of `walkPose`.
- `faces.png`: every face option at 1.25× head scale.
- `zoom-2x.png` (`zoom jake,jake2,elder`): chosen heads at 2×.
