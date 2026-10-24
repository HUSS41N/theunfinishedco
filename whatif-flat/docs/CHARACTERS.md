# Characters (flat v2 rig): cast fields, poses, anchors

Owner: `src/character.mjs` + `src/style.mjs`. The pose schema and return shape are the shared contract in `V3-CONTRACT.md`;
this page lists what the flat rig adds. Everything below is optional and every older cast entry and pose renders as before.

## Cast entry

```jsonc
{
  "palette": "sunny|ocean|forest|berry|mono|pastel|autumn|neon|royal|coral|earth|candy|auto",   // fills colours you leave out
  "build": "man|woman|slim|broad|tall|teen|kid|boy|girl|elder"   // or {"preset": "girl", "height": 0.7, …}
           // fields: height head width limbs thick waist shoulders hips   (thick = limb width, waist < 1 tapers the torso)
  "skin":  "<SKIN name>|#hex",
  "hair":  {"style": "short|buzz|quiff|bob|long|bun|curly|curlyLong|ponytail|pigtails|spiky|bald", "color": "<HAIR>"},
  "top":   {"style": "tee|stripes|tank|shirt|hoodie|jacket|blouse|dress", "color": "<CLOTH>", "detail": "<CLOTH>"},
  "bottom":{"style": "jeans|pants|shorts|skirt", "color": "<CLOTH>"},    // a dress with no bottom = bare legs
  "shoes": {"style": "sneaker|flat|boot", "color": "<CLOTH>", "sole": "#hex"},
  "face":  {"blush": true, "nose": "button|none", "lashes": true, "lipstick": true | "<CLOTH>|#hex"},
  "bow":   true | "<CLOTH>" | {"color": "pink", "size": 1.2},          // shortcut for the bow accessory
  "accessories": ["glasses", "sunglasses", "beard", "mustache", "headphones", "mask", "earrings",
                  {"type": "earrings", "style": "hoop", "color": "gold"}, {"type": "cap", "color": "blue"},
                  {"type": "bow", "color": "red", "size": 1}]
}
```

- **Palettes** (`style.mjs` `PALETTES`): each sets skin, hair, top, detail, bottom, shoes, an `accent` (bow, hair ties, default
  earrings) and `lips`. `"auto"` picks one by hashing the cast id, so a crowd gets a stable mix.
- **Colour tables** grew; the old names are unchanged. New SKIN: porcelain rose sand golden honey caramel chestnut espresso coral.
  New HAIR: dark chestnut auburn honey platinum red purple teal mint lilac. New CLOTH: sky mint lime orange rust burgundy
  magenta lilac lavender peach cream khaki forest royal plum sand gold silver slate rose cyan hotpink.
- **Women and girls**: `build: "woman"` (narrower shoulders, waist taper, wider hips, slimmer limbs) or `"girl"`, plus any of
  ponytail / pigtails / curlyLong / long / bob / bun, `lashes`, `lipstick`, `earrings`, `blouse` / `dress` / `skirt`, `flat` shoes.
  The bow sits by hairstyle: on the bun, at the ponytail tie, on both pigtail ties, otherwise high on the right of the head.
- Ponytails and pigtails hang with gravity: they counter-rotate against head tilt + lean.

## Pose fields (per V3-CONTRACT §2)

| field | meaning |
|---|---|
| `arm*.c` | wrist bend, adds to a+b (the hand and held prop rotate) |
| `leg*.c` | ankle. The foot is flat while planted and follows the shin once the ankle leaves the ground; `c` adds on top |
| `arm*.reach` / `leg*.reach` | `[x, y]` IK target for wrist / ankle: origin on the ground under the pelvis, +x = facing, y up negative. Elbows bend down and out, knees forward. Overrides a/b |
| `body.bend` | torso curve in degrees: the chest rotates progressively up the spine; shoulders, neck and head follow |
| `head.tilt` | rotates about the neck base (top of the torso); the neck stretches slightly. `head.dy < 0` lengthens the neck |
| `arm*.a < 0` | swings the arm across the body; `a` 150–175 goes over the head; `z: "back"` puts the arm behind torso and head |

`solveIK(root, target, L1, L2, {side, hint})` is exported for anyone who needs the same solve.

New named poses: `handsHips armsCrossed reachUp behindHead facepalm clap pointUp stretch bowDown dance kneel crouch run jump
sitFloor sitCross lie` (lie = a resting pose; rotate the actor −90 with `rot`). `walkPose(phase)` alternates the legs.

## Joints

- Shoulder and hip **ball caps** in the sleeve / trouser colour: raised (160°+), crossed or splayed limbs leave no gap or lump.
  The right shoulder ball uses the torso's shade colour so it only rounds the silhouette.
- Limb shade strokes are offset per segment with a **mitre on the inside of a bend and an arc on the outside**, so elbows and
  knees read as clean round joints at any angle.
- Short sleeves / shorts are hemmed covers that follow the upper segment; long sleeves end in a cuff band square to the forearm.
- The shin stops short of the ankle so no round cap pokes out under a shoe; a planted sole sits exactly on y = 0.

## Return value and anchors

`buildCharacter(C, pose, opts)` → `{svg, pelvis, height, anchors, joints}`.
`anchors` = `headTop` (top of the hair), `headCenter`, `mouth`, `handL/R` (palm centre), `footL/R` (sole centre), in the actor
layer's space with **scale and facing applied**: compose with the actor transform (translate x,y, then rot) for world coords.
They are computed with the same matrices that draw the parts (pelvis → lean/scaleY → bend → neck pivot → head), so they track
every pose field. `joints` (pelvis, neck, shoulders, elbows, hips, knees) is the same space, for debugging and props.

## Rendering notes

- No clip paths: resvg turns each into a full-frame mask, so all shading (torso, skirt, face, eyes, lids, open mouth, mask,
  tails, shoes) is computed as polygon ∩ convex region. The actors layer of a cinema frame went from 15 ms to 9 ms.
- Every id inside a built character is prefixed per build (`k<castId><n>-`), so ids can never collide with set or prop ids.
- No translucent fills on the character except the ground shadow and clear glasses lenses; shades are pre-blended colours.
