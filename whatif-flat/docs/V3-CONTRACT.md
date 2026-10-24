# v3 engine contract: one engine, two styles

This is the shared interface for the v3 work. Every module must keep to it so the parallel work slots together.
If you need to change it, say so in your report; do not change it silently.

## Why v3

User feedback on v1 and v2 (25 Oct 2026):

- **v1 jitter.** v1 jitters ("the whole camera shakes whenever anything moves"). The cause: the canvas kit re-wobbles every
  line from one shared random sequence. Add handheld drift, poses on twos and aliased shake, and it is a strain to watch.
- **v1 needs colour.** v1 should gain a little colour, not too much.
- **Text is too short.** Text disappears before it can be read.
- **v2 motion.** Movement is not smooth and the joints do not move freely.
- **Cinema eye bug.** In the cinema example, one eye has no pupil.
- **World scale.** Buildings, rooms and props are too small next to the characters, so the world doesn't feel real.
- **Text placement.** Text sometimes does not overlay the characters properly.
- **v2 palettes and women.** v2 needs colour palette options for characters, plus women (and stick women with a little bow).
- **Production quality.** Both styles need smooth motion, motion graphics and better production quality.

Decision: **v1 becomes a second style of this engine** (`stick`). The old canvas kit (`../whatif-kit`) is retired for new
work. The same scene JSON renders in either style.

Reference images for the stick look:

- `/private/tmp/claude-501/-Users-hussain-dev-echo-bench/270fbf9b-0ae1-4787-8625-551bab31b069/images/2.png`
- `/private/tmp/claude-501/-Users-hussain-dev-echo-bench/270fbf9b-0ae1-4787-8625-551bab31b069/images/3.png`

What they show:

- white round heads with black outlines, two black dot eyes, a small curved smile
- thin black stick limbs with round caps
- coloured clothes (a tee, a beanie, a robe, an apron) worn over a stick body
- warm, softly coloured, outlined backgrounds (beige walls, red lanterns, a green plant, a kitchen)

## 1. Styles

- `scene.meta.style`: `"flat"` (v2, the default) or `"stick"` (v1). The CLI flag `--style stick|flat` overrides it.
- A cast entry may set `"style"`. Otherwise it inherits `meta.style`.
- `defineCharacter(def)` keeps `C.style` and `C.raw = def`, so the stick builder can read any field.
- `buildCharacter(C, pose, opts)` dispatches to `buildStick(C, pose, opts)` (from `src/stick.mjs`) when `C.style === 'stick'`.
  Both builders have the same signature and the same return shape (§3).
- `buildSet(spec, W, H)` receives `spec.style` (copied from `meta.style` by scene.mjs). Every set preset must render in both
  styles. Props also get `style` in their spec.
- The same cast definition must work in both styles. The stick builder maps the fields:
  - `top.color` → shirt colour, `bottom.color` → trousers or skirt colour
  - `hair.style` `long`/`bob`/`bun` → a woman with a little bow (unless `bow: false`)
  - `accessories` `cap` → beanie or cap, `glasses` → glasses
  - `skin` is ignored (the heads are white)

## 2. Pose schema (both rigs read the same pose)

```
{ body: {dx, dy, lean, scaleY, bend?},            // bend = extra chest/torso curve in degrees (optional)
  head: {tilt, dx, dy, turn?},                     // the neck pivot is at the torso top; tilt rotates about it
  armL|armR: {a, b, c?, la?, lb?, z?, reach?},     // a = shoulder, b = elbow (adds to a), c = wrist (adds to a+b)
  legL|legR: {a, b, c?, la?, lb?, reach?},         // a = hip, b = knee, c = ankle (0 = foot flat on the ground)
  face: {eyes, look:[x,y], mouth, brows, turn, blink} }
```

- Angles are degrees. 0 means hanging straight down; positive means outward, away from the body's centre line.
- `reach: [x, y]` is an IK target for the wrist or ankle, in character-local px: origin on the ground under the pelvis,
  +x the way the character faces, y negative upward. When it is present it overrides `a`/`b`. Solve two-bone IK; the
  elbow bends down and out, the knee forward.
- New fields are optional. Every existing pose and scene must render exactly as before or better.

## 3. Builder return shape

`buildCharacter` and `buildStick` both return:

```
{ svg, pelvis, height,
  anchors: { headTop:[x,y], headCenter:[x,y], mouth:[x,y], handL:[x,y], handR:[x,y], footL:[x,y], footR:[x,y] } }
```

Anchors are in the actor layer's coordinate space, with scale and facing already applied. scene.mjs turns them into world
coordinates with the actor transform (translate x,y, then rot).

## 4. Scale (the "real world" fix)

- A character at actor scale 1 stands about **800 px** tall, feet to head top, which is about 1.7 m.
  So **1 m ≈ 470 px** at scale 1.
- Sets and props are drawn at **real scale for actor scale 1**:
  - a door ≈ 2.1 m ≈ 990 px
  - a desk top ≈ 0.75 m ≈ 350 px
  - a chair seat ≈ 0.45 m ≈ 210 px
  - a storey ≈ 3 m ≈ 1400 px
  - a street lamp ≈ 4.5 m
  - a bus ≈ 3 m tall and 12 m long
- Wide shots use **camera zoom** (down to 0.4), not small actor scales. Sets must fill the frame with no visible edges at
  zoom 0.4, around any camera x from −1500 to 2600 and any y from 0 to 1920.
- The default floor stays at `floorY = 1500`.

## 5. Frame layer order (scene.mjs)

From back to front:

1. `set.back`
2. actors marked `behind`
3. `set.mid`
4. props (back)
5. actors (sorted by z, then y)
6. props (front)
7. `set.front`
8. **bubbles** (speech/thought bubbles anchored in the world, drawn above everything else in the world)
9. **screen text**
10. overlays and transitions

## 6. Ownership (do not edit files you do not own; ask in your report instead)

| file | owner |
|---|---|
| `src/scene.mjs`, `src/motion.mjs` (new), `src/render.mjs` | motion |
| `src/text.mjs` (new), `src/layout.mjs` (new) | text |
| `src/character.mjs`, `src/style.mjs` | flat-rig |
| `src/stick.mjs` (new) | stick-rig |
| `src/backgrounds.mjs`, `src/props.mjs`, `src/svg.mjs` | world |

`src/text.mjs` exports:

- `screenText(shot, lt, C)` → svg
- `bubbleLayer(shot, lt, C, speakers)` → svg, where `speakers` is `[{id, anchors (in world coords), facing}]`
- `lintText(C)` → `[{level, t, msg}]`

`src/layout.mjs` exports `SAFE` (the safe rect for 1080×1920), `readingTime(text)` and `MIN_TEXT_PX`.

Until text.mjs exists, scene.mjs keeps its inline text code. The motion owner wires text.mjs in once it exports the above.

## 7. Rules for everyone

- The modules other than render.mjs also run **in the browser** (the brand site imports `whatif-flat/src`). No Node-only
  imports outside render.mjs and cover.mjs.
- resvg (`@resvg/resvg-js` 2.7.0-alpha.2):
  - no translucent groups that go off canvas (use solid pre-blended colours)
  - fonts must be TTF and loaded from `fonts/`
- Keep backward compatibility: `node src/render.mjs <scene> --check` must pass for every `examples/*.json` and
  `series2/*/scene.json`.
- Verify by eye with `--stills` and `--sheet`, and put your verification images in `build/` folders. Never claim a visual
  result you have not looked at.
- No randomness that changes from frame to frame. Anything procedural is deterministic in (id, t), and any oscillation is
  below 6 Hz (the video is 24 fps), so nothing aliases into jitter.
