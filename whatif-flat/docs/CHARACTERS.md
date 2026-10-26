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

## Film face, wardrobe, looks and story poses (THE LAST BUS, Oct 2026)

Modules: `src/face.mjs` (film face + drama extras), `src/wardrobe.mjs` (Indian wear, uniforms, overlays, new hair and
headwear), `src/geom.mjs` (the shared polygon/matrix helpers that used to live inside character.mjs). Everything is opt-in:
a cast entry without the new fields renders pixel-identical to before (checked on every example and series2 cast), except
that cartoon-face **glasses now follow the eyes in a 3/4 turn** (they used to drift off the eyes; a fix).

### The film face (`face.style: "film"`) — built for close-ups at zoom 2–3.5
Almond eyes with an iris (`face.iris`: brown dark hazel grey blue green or #hex), pupil and two catch-lights, a lash line that
thickens to the outer corner, a lid crease, a lower-lid hint; tapered brows drawn over any fringe; a shaded nose that
swings with the turn (and pokes out of the outline in profile); smooth curved mouths with lower-lip volume. The cartoon
face is untouched for every other cast.

| face field | values (film face) |
|---|---|
| `eyes` | `open wide shock fear glassy half soft tired bored sad grief cry down angry squint closed squeeze happy` |
| `brows` | `flat up raised worried sad angry grief fear shock soft furrow determined` |
| `mouth` | `flat smile sad sadSmile smirk tight part whisper speak open grin teeth O gasp scream quiver cry chew` |
| `tears` | 0..1: 0–0.35 water wells on the lower lid, 0.35–1 a streak runs down the cheek and ends in a slowly swelling drop. `tearSide: "L"|"R"|"both"` |
| `glisten` | 0..1 wet eyes (a water line and a second catch-light). `glassy`/`grief` eyes and tears imply it |
| `quiver` | 0..1 lip and chin tremble (smooth noise < 4 Hz, needs time, so it moves in video); `tight`, `quiver` and `cry` mouths add a chin crumple |
| `turn` | −2..2. ±1 is a strong 3/4 (the far ear hides). Past 1 the back of the head sweeps across: the far eye goes, the features bunch at the near edge, the ear rides round, 2 = seen from behind. Key it 2 → 0.3 over ~0.8 s for a turn-around |
| `look` | [x, y] moves the irises; `down` eyes force them low |
| `stubble`, `mark` | per-frame overrides of the cast fields below |

Tears, marks, stubble and wrinkles also work on the cartoon face.

### Cast fields
```jsonc
{
  "face": {"style": "film", "iris": "brown", "stubble": true, "wrinkles": true, "bindi": "red"},
  "age": "old",                 // stoop (rounded back, head forward), a little shorter, wrinkles, slower smaller idle, slower blinks
  "wet": true,                  // cloth darker + drip streaks, short hair flattened into wet strands
  "mark": {"type": "cut", "side": "R", "size": 1},      // temple cut: gash, dried trickle, faint bruise. type "bruise" too
  "hair":  {"style": "messy|parted|…"},                  // messy = dishevelled; parted = centre parting + low bun at the nape
  "top":   {"style": "saree|kameez|kurta|sherwani|uniform|army|school|gown|…", "color": "…", "detail": "…",
            "border": "gold",          // saree / sherwani / kameez trims
            "blouse": "mustard",       // saree only (default: a darker saree colour)
            "pallu": "L|R",            // saree: the shoulder the pallu goes over (default L)
            "print": "dots|confetti|checks",
            "sleeves": "full|threeq|elbow|short|rolled|none"},   // override the style's sleeve
  "bottom": {"style": "salwar|pyjama|churidar|…"},       // tunics imply one (kameez→salwar, kurta→pyjama, sherwani→churidar)
  "vest":    {"color": "brown", "border": "gold"},       // sleeveless Nehru jacket over any top
  "shawl":   {"color": "cream", "border": "rust"},       // over the shoulders and upper arms (and across the back)
  "dupatta": {"color": "mustard", "border": "rust"},     // U across the chest, tails behind the shoulders
  "accessories": [
    {"type": "watch", "side": "L", "color": "#5A3A26"},  // drawn when the wrist is bare (rolled / short sleeves)
    {"type": "cap", "style": "peaked", "color": "khaki"},// bus driver / conductor cap with visor and badge
    {"type": "turban", "color": "rust", "trim": "gold", "sehra": true},   // safa with fan, kalgi; sehra = jasmine strands over the face
    {"type": "partyHat", "color": "hotpink", "stripe": "yellow", "tilt": 14},
    {"type": "glasses", "style": "round", "color": "#7A6040"},
    {"type": "mustache", "style": "thick", "color": "grey"}
  ],
  "still": true                 // (also an actor field) idle life off, a slow blink every 7–10 s
}
```
Long garments (`saree` to the ankle, `kameez`/`gown` to the knee, `sherwani`, `kurta` mid-thigh) are a convex hull around the
hips and the legs, so they follow walking, sitting (front and side) and crouching; the saree hem carries its border and front
pleats, the kameez its hem band and side slits, the sherwani its gold placket and hem.

### Actor looks (scene.mjs passes them to `buildCharacter(…, {look})`)
| actor field | effect |
|---|---|
| `ghost` 0..1 (keyable), `ghostTo` | every colour pre-blended toward grey and a pale cold tint (no group opacity inside the character); the actor's opacity drops by up to 18 % |
| `fade` 0..1 (keyable), `fadeTo` | mist rising: legs blend into `fadeTo` (default `#8E9AA6`, match your fog) faster than the body; from 0.55 to 1 the actor's opacity eases to 0 |
| `view: "back"` (keyable) | seen from behind: head turn 2, front details hidden, arms (and held props) behind the body, saree pallu down the back, shawl across the back |
| `reflection: true | {tint, amount}` | mirror look: desaturated, tinted, no ground shadow |
| `crop: [x, y, w, h, r]` | world rect: only that part of the actor shows (a rear-view mirror, a window pane). Costs one clip path |
| `still: true` | uncanny stillness (see above) |
| `silhouette: "#hex"` | (existing) one flat colour: passengers seen through bus windows |

### Story poses (`style.mjs` POSES; "side" poses face +x)
`sitSide sit3q sitSleep grabFront sitHoldLap stillSit driveSeat turnSeat sitPhoneEar sitPhoneChest` (seated) ·
`pressGlass holdBar holdChest stoopPlace stoopSide stopHand backAway phoneEar phoneClose phoneChest lookHands standCry slamWall` (standing).
`holdBar` raises the right arm; give it `armR: {reach: [x, y]}` to pin the hand on a real bar (the sway keeps it there).

### Story actions (`motion.mjs` ACTIONS, run from scene.mjs; all smooth and under 5 Hz)
| act | fields | effect |
|---|---|---|
| `cry` | `from to amp sob tears well eyes brows mouth face` | sobs (irregular breath catches lift the shoulders), head that cannot hold still, lip/chin quiver, glassy eyes + grief brows + quiver mouth (`face: false` keeps yours); `tears: n | [from, to]` wells then runs over `well` s and stays after `to` |
| `jolt` | `t amp hold face` | waking with a start: a 2-frame snap up and back, hands flinch, shock eyes for `hold` s, then a slow settle. Key the pose change (e.g. sitSleep → sitSide) with `dur` ≈ 0.15 at the same time |
| `stumble` | `t dist dir amp face` | the bus brakes: lurch toward `dir` (+1 = facing), a catching step, arms fling forward, rebound; moves `dist` px (persists) |
| `sway` | `from to amp rate` | standing on a moving bus: a slow lean that drifts with the road, head lagging and countering; a `reach`ed hand stays on the bar |
| `slam` | `t arm target windup to release` | wind up, strike fast into `target` (reach coords; put it ≈ an arm's length away), hold until `to`, release |
| `run` | `from to dx rate lean` | running cycle: pumping bent arms, high knees, bob twice per stride, eased travel of `dx` |
`walk` with `dx` against the facing direction backs away (use `backAway`); `walk` with `dx: 0` + scale/y keys walks into depth.

### Speech mouths with the corners down (The Last Bus)

The open mouths `open`, `speak`, `teeth` and `scream` curve upward and read as smiling on a tense or angry face. For drama use:

| mouth | reads as |
|---|---|
| `say` | neutral speech (the film's default `talk` open shape) |
| `afraid` | frightened speech, a small open mouth with the corners down |
| `shout` | angry speech, a wide open mouth with the corners down and teeth |

`{"act": "talk", "open": "say", "closed": "part"}`. `open` and `closed` take mouth names; a number falls back to a smile.
