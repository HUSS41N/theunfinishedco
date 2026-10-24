# Scene JSON — the format Claude writes

One file describes one video. Run `node src/render.mjs --list` for the live vocabulary (poses, props, sets, colours).
Units are pixels on the 1080 × 1920 frame; **y grows downward**; the ground is around y = 1500–1580 depending on the set.
Every time inside a shot is **shot-relative seconds** (`t`, `from`, `to`).

```jsonc
{
  "meta":  {"title": "…", "width": 1080, "height": 1920, "fps": 24, "duration": 14,
            "style": "flat|stick",                               // CLI --style overrides; a cast entry may set its own
            "motion": {"overlap": 1, "blend": 0.2, "idle": true}, // see Motion below
            "motionBlur": false},
  "cast":  {"<id>": Character, …},
  "shots": [Shot, …],                       // contiguous: shot[i].start == shot[i-1].end, first starts at 0
  "music": [{"mood": "playful|tense|eerie|tender|resolve", "a": 0, "b": 8, "gain": 1}],
  "beds":  [{"name": "room|street|crowd|wind|hum|rain|silence", "a": 0, "b": 14, "gain": 0.5}]
}
```

## Character (cast entry)

```jsonc
{
  "skin": "orange|peach|fair|tan|olive|brown|deep|#hex",
  "build": {"height": 1, "head": 1, "width": 1, "limbs": 1},          // kids ≈ height 0.66, width 0.78, limbs 0.85
  "hair":  {"style": "short|buzz|quiff|bob|long|bun|curly|spiky|bald", "color": "brown|blonde|black|ginger|grey|white|pink|blue|#hex"},
  "top":   {"style": "tee|stripes|tank|shirt|hoodie|jacket|dress", "color": "<cloth>", "detail": "<cloth>"},  // detail = stripes / jacket inner
  "bottom":{"style": "jeans|pants|shorts|skirt", "color": "<cloth>"},
  "shoes": {"color": "<cloth>", "sole": "#F4F2EE"},
  "face":  {"blush": false, "nose": "button|none"},
  "accessories": ["glasses", "sunglasses", "beard", "mustache", "headphones", "mask", {"type": "cap", "color": "blue"}]
}
```
`<cloth>`: green olive red coral pink yellow mustard blue navy denim teal purple grey charcoal white black brown tan, or `#hex`.
Shade and highlight colours are derived automatically (same hue, darker/lighter); never specify them.

## Shot

```jsonc
{
  "start": 0, "end": 3.4,
  "set": {"preset": "spotlight|cinema|room|street|park|office|nightCity|solid", …preset options},
  "in":     {"type": "push", "dur": 0.45, "dir": "left"},   // transition from the previous shot (default: cut)
  "camera": [{"t": 0, "x": 540, "y": 1100, "zoom": 1.2, "rot": 0}, {"t": 3.4, "zoom": 1.3}],
  "shake":  [{"from": 0, "to": 0.5, "amp": 6, "freq": 3}],
  "drift":  0.008,                                         // optional slow push-in (zoom fraction per second, ≤ 0.015)
  "blur":   false,                                         // motion blur for this shot (3 subframes, 0.5-frame shutter)
  "actors": [Actor, …],
  "props":  [Prop, …],
  "text":   [{"text": "WHAT IF…", "x": 540, "y": 280, "size": 150, "color": "#FFFFFF", "font": "display|sans|serif|mono", "from": 0.2, "to": 3, "pop": true, "shadow": true}],
  "overlay":[{"type": "flash|fadeIn|fadeOut|peephole", "from": 0, "to": 0.3, "color": "#FFFFFF", "r": 420, "cx": 540, "cy": 860}],
  // "hold": true keeps a fadeOut/black/peephole at its end state until the shot ends; "type": "black" is a solid card from `from` to `to`
  "sfx":    [{"t": 0.2, "kind": "pop", "gain": 0.6}]
}
```
- **camera**: the world point (x, y) shown at the frame centre, and zoom. 1.0 shows the whole 1080-wide set; 1.3 frames 3 seated people; 1.8–2.1 is a close-up. Keys are a smooth spline (see Motion); a key's `ease` overrides its segment.
- **shake**: smooth noise (never above 4 Hz) under an attack/decay envelope. `amp` ≤ 10 screen px (default 6, larger values are clamped), `freq` ≤ 4 Hz (default 3), optional `attack` (s, default 0.06). There is no handheld drift unless `drift` is set.
- **in** (shot transition, ignored on the first shot): `type` is `cut` (default), `fade` (dip to `color`, default black), `crossfade`, `push` (both shots slide; `dir` left/right/up/down), `whip` (a fast push with a directional smear), `zoom` (the old shot scales up and out while the new one settles in) or `iris` (a growing circle at `cx`, `cy`). `dur` defaults: fade 0.5, crossfade 0.4, push 0.45, whip 0.3, zoom 0.4, iris 0.5. The new shot's clock starts at its `start` as usual, and the previous shot keeps running past its end during the window. Push and whip get a shutter-length motion blur automatically.
- **set options**:
  - `cinema`: `seatX` (array of seat centres), `rowY`.
  - `room`: `wall`, `floor`, `window`, `night`.
  - `spotlight`: `color`, `floorY`.
  - `street`: `sky`.
  - `solid`: `color`, `vig`.
- **text**: screen space (not affected by the camera). Lines split on `\n`. Keep important text between y ≈ 220 and 1460 (Shorts/Reels UI).
  - `font: "display"` (default): heavy Inter Display Black, the v2 title look.
  - `"serif"`: Instrument Serif italic, for an accent phrase.
  - `"mono"`: JetBrains Mono, for labels (DAY 7, 8:00 AM).
  - `"sans"`: Inter 600.
- **overlay `peephole`**: darkens everything outside a circle (`r`, `cx`, `cy`). Use it for a peephole, a spotlight or an iris.

## Actor

```jsonc
{
  "id": "dad",                 // a cast id
  "x": 540, "y": 1500,         // the ground point under the character (feet / seat base)
  "scale": 0.9, "facing": 1,   // facing -1 mirrors (looks left)
  "z": 0,                      // draw order among actors (then by y)
  "behind": false,             // true: drawn behind the set's mid layer (e.g. behind the cinema seat row)
  "pose": "sitEat" | {"base": "stand", "armR": {"a": 92, "b": 4}},
  "face": {"eyes": "open", "mouth": "smile", "brows": "flat", "look": [0, 0], "turn": 0},
  "hold": {"L": "popcorn", "R": {"type": "sign", "label": "HI :)", "scale": 0.8, "tilt": 0}},
  "keys": [{"t": 1.5, "pose": "point", "face": {"mouth": "open"}, "x": 600, "dur": 0.4, "ease": "inOut"}],
  "do":   [{"act": "blink"}, {"act": "talk", "from": 1, "to": 2.5}],
  "rot": 0,                    // whole-body rotation in degrees (floating, falling); keyable
  "silhouette": "#1C1D22",     // draw the whole character as one flat colour (shadows, ghosts); keyable, null = off
  "tint": "frozen"             // greyed-out (time frozen, memories); keyable, null = off
}
```
### Poses
Named: `stand relaxed wave cheer point shrug think scared hold phone sit sitEat sitSprawl sitPhone sitScream`.
Custom: `{"base": "<named>", "<limb>": {...}, "body": {...}, "head": {...}}` where
- limbs `armL armR legL legR`: `a` = joint angle at shoulder/hip in degrees (0 = hanging down, **positive swings outward**), `b` = elbow/knee added to `a` (negative bends inward/up), `la`/`lb` = length scale of upper/lower segment (foreshortening, e.g. seated thighs 0.55), `z` = `front|back` (arms only).
- `body`: `dy` (positive lowers the pelvis; sitting ≈ 150), `dx`, `lean` (degrees), `scaleY`.
- `head`: `tilt` (degrees), `dx`, `dy`.

Useful arm angles: hanging 8 · hand on hip 40/−95 · hand to mouth 24/−148 · pointing 92/4 · raised 146/22 · both up 150/18.

### Face
- `eyes`: open wide closed happy tired bored angry.
- `mouth`: smile grin open scream O flat sad smirk teeth chew.
- `brows`: flat up raised worried angry sad.
- `look`: pupils, from [−1..1, −1..1].
- `turn`: −1..1, shifts the face toward a 3/4 view.
- `blink`: 0..1, normally driven by the `blink` action.

### Keys
Any of `x y scale facing opacity pose face hold rot silhouette tint` may appear in a key.
- **Interpolation:** numbers, pose angles and `look` follow a smooth spline (see Motion). Strings (mouth, eyes) switch when the key time is reached.
- **`dur`:** the move into a key takes `dur` seconds and ends at `t`; the value holds before that. Without it, the move spans the time since the previous key.
- **`ease`** on a key sets the ease of the move into it: `smooth` (the default spline), `linear`, `inQuad outQuad inOutQuad`, `inCubic outCubic inOutCubic`, `inSine outSine inOutSine`, `outBack` (≈4 % overshoot), `anticipate` (a small wind-up back first), `hold` (jump at the key), plus the v2 names `in out inOut back step`.
- **`facing`** changes play as a quick turn (a horizontal squash to half width around the flip), not an instant mirror.

### Actions (`do`): cycles layered on top of keys
Every action with `from`/`to` blends in and out over `blend` seconds (default `meta.motion.blend` = 0.2; wave and reach 0.45, look 0.25): the pose mixes from the keyed pose into the action pose and back, so nothing snaps.

| act | fields | effect |
|---|---|---|
| blink | `every` | smooth blink (about 4 frames). Idle life already blinks, so this only sets the period |
| breathe | | subtle torso scale (idle life already breathes) |
| talk | `from to rate open closed` | mouth flaps |
| chew | `from to rate` | chewing |
| laugh | `from to amp rate eyes blend` | smooth bounce (rate/2 per second) + grin + happy eyes |
| bob | `from to amp rate blend` | vertical bob |
| tremble | `from to amp blend` | nervous shake (smooth noise under 5 Hz) |
| wave | `arm rate a b amp blend` | arm rises, waves, comes back down |
| walk | `from to dx stride rate lift lead keepArms blend` | planted-foot walk over `dx` px: footsteps are planned in world space so a standing foot never slides, travel eases in over the first (half) step and out over the last, the cadence comes from the distance and `stride` (× natural step), the body bobs once per step with a small head counter-bob, arms swing. `rate` (cycles/s) overrides the cadence; `dx: 0` walks on the spot. The distance persists after `to` |
| turn | `from` (or `t`) `dur` | turn to face the other way through a quick squash (default 0.3 s); persists |
| reach | `arm from to target blend` | the hand moves to `target: [x, y]` (character-local px: origin on the ground under the pelvis, +x the way the character faces, y negative up) by two-bone IK, elbow down and out, and returns |
| look | `look turn from to` | override gaze (blended) |
| jump | `from dur height crouch` | one hop with a small crouch before take-off and on landing |

## Motion
- **Spline keys.** Without an explicit `ease`, keys form a monotone cubic spline: the move eases in at the first key and out at the last, and passes through middle keys without stopping (it only stops where the value turns around). It never overshoots.
- **Overlapping action** (`meta.motion.overlap`, default 1; 0 = off, 0.5 = half): when a pose changes, the torso and legs lead, the head follows 0.04 s later, the upper arm 0.03 s, the forearm 0.07 s and the wrist 0.10 s. The drag gives follow-through.
- **Idle life** (on unless the actor has `"idle": false` or `meta.motion.idle` is false): breathing, a slow weight shift (lean), a drifting head tilt, small arm sway and blinks. All smooth noise under 0.5 Hz.
- **Motion blur**: `blur: true` on a shot or `meta.motionBlur` renders 3 subframes over a 0.5-frame shutter and averages them. Push and whip transitions get a shutter-length directional blur automatically.
- Nothing procedural changes randomly from frame to frame: everything is deterministic in (actor id, t), and every oscillation stays under 5 Hz.

## Props

```jsonc
{"type": "seat", "x": 540, "y": 1500, "scale": 1, "rot": 0, "flip": false, "layer": "back|front", "id": "…", "keys": [{"t": 0.6, "x": 760, "y": 760, "rot": 160, "ease": "out"}], …options}
```
- **Scene props:** seat sofa table desk laptop lamp plant door window tv tree building car clock bubble popcornSpill shoes,
  plus story props: tag thought phoneUI brickWall flower flowerTrail board bed monitor lampPost busStop fountain pram rocket telescope mirror checklist rope bench stars svg.
- **Handheld props** (also valid as scene props): popcorn soda phone coffee book glasses3d bottle sign flag balloon money remote cane drawing note plate sponge rose cake key.
- **Every field of a prop can be keyed:** rows of a brickWall, progress of a flowerTrail, a tag's text, a phone's messages. Numbers interpolate; text and lists switch when their key is reached.
- **Options:**
  - `bubble`: `text w h tail(left|right) color ink size`.
  - `sign`: `label`.
  - `door`: `open` (0..1).
  - `window`: `night`.
  - `building`: `w h lit color`.
  - seats, sofa, tree, car, lamp: `color`.
- **Story-prop options:**
  - `tag`: `text color ink size`. A pill with a pointer: numbers over heads, prices, counters.
  - `thought`: `text w h size dx dy max`. A cloud bubble with trailing dots toward (dx, dy).
  - `phoneUI`: `header messages:[{text, from:"them"|"me"}] typing banner accent`. A big phone; scale it about 0.5–0.9.
  - `brickWall`: `rows cols bw bh color`. Key `rows` to grow it; fractional rows are partly built.
  - `flowerTrail`: `points:[[x,y],…] progress color spacing s`. Key `progress` from 0 to 1 to reveal it.
  - `board`: `title rows:[[label, value]] color ink accent`. A chalkboard price or menu list.
  - `monitor`: `beat` (`"flat"` for a flatline).
  - `rocket`: `built` (0..1).
  - `checklist`: `items:[[label, true|false]] title`.
  - `rope`: `x2 y2` (the other end, relative).
  - `mirror`: `w h glass`.
  - `stars`: `n w h`.
  - `svg`: `markup`. Raw SVG in prop coordinates, for one-off shapes. Keep it flat: no outlines, plus a darker same-hue shade shape.
- `layer: "front"` draws over the actors (popcorn on the floor, a desk in front of someone).

## Sound
`sfx[].kind` is any What If kit effect: tick step pop ping notif buzz swipe whoosh knock dooropen doorclose thud brick crumble coin cash freeze unfreeze glitch rumble boing splash sting hit chime heart breath chuckle scribble paper clink birds ring click alarm skid car cut flower.

## Workflow
1. `node src/render.mjs scene.json --check`: fix every problem it lists.
2. `--stills t1,t2,…` at each beat, then look at the PNGs: framing, poses, overlaps, text in the safe area.
   `--strip t` writes 12 consecutive frames from t side by side (strip-t.png), for checking motion for pops and jitter.
3. `--sheet` for the whole timeline at one frame per second.
4. `node src/render.mjs scene.json`: the video with mixed sound.
5. Optional: `--layers t` exports the layered SVGs for that frame (set / props / actors / composite + a list of every named layer).

### Notes (v3)
- Actor `"shadow": false` hides the ground shadow. The shadow sits under the feet, so turn it off for airborne actors (y well above the floor).
- `src/cover.mjs` keeps `say` bubbles on covers and drops only screen text; pass `--style stick` for the v1 cover.
