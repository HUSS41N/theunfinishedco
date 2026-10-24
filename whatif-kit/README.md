# What If kit

Shared renderer for the **What If** channel: silent, minimalist black stickmen on white, 1080×1920, 24 fps,
every frame drawn in code; sound synthesized; $0 per video. Channel rules: `~/.claude/youtube/voice.md`.
Reference video: `../whatif-series/01-shadow/scene.mjs` (read it before writing a new one).

```
whatif-kit/
  kit.mjs     drawing helpers, characters, phone UI, cards, render loop  (import this)
  draw.mjs    low-level pen: wobbly lines, stick figure + IK, faces        (via `D`)
  sfx.py      sound effects, beds, music moods → build/mix.wav
  build.sh    render + mix + mux (+ −14 LUFS) + verify:  build.sh <video dir> [name]
  fonts/      Inter Tight 700, Inter 600/400
```

## A video = one `scene.mjs`

```js
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, kf, ease, lerp, twos, at, bed, music, STAND, INK, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
shot(0, 1.6, (ctx, lt, t) => { bg(ctx); floor(ctx); guy(ctx, 640, GROUND, 1.25, STAND, {mouth: 'O', eyes: 'wide'}); }, {cam: lt => ({z: 1.3, fx: 640, fy: 1230})});
shot(1.6, 2.9, (ctx, lt) => { bg(ctx); card(ctx, [['WHAT IF …', INK], ['…?', ACCENTS.red]], {lt}); at(1.6 + lt, 1.6, 'cut'); });
// … more shots, contiguous, covering 0 → duration …
bed('room', 0, 10); music('tender', 20, 34);
await run({dir: DIR, duration: 34});
```

Commands (from the video folder):
- `node scene.mjs --sheet` → `build/sheet.png`, one frame per second. **Look at it.**
- `node scene.mjs --stills 0.3,12.5` → `build/stills/t0.30.png`, …  Full-size checks.
- `~/dev/stickman-videos/whatif-kit/build.sh . NN-slug` → `NN-slug.mp4` plus a decode/duration/loudness report.

## World and camera

- The design plane is **1280 × 2276**, scaled to 1080×1920. The ground line is `GROUND = 1560`.
- `shot(a, b, draw, opts)`: `draw(ctx, lt, t)` runs in world units, where `lt` = seconds into the shot and `t` = video time.
- Camera `opts.cam(lt) → {z, fx, fy}`: zoom `z` around world point (fx, fy). A full-body shot of one figure is about `z 1.25–1.45`; a wide shot is about `z 1.0`.
- `opts.hand` = handheld drift in px (default 0.8). `opts.shake(lt)` = impact shake in px.
- `opts.overlay(ctx, lt, t)` draws in screen space after the camera (labels, counters).
- `opts.black(lt)` / `opts.fade(lt)` return 0..1 for a black or white cover.
- `opts.pixel(ctx, lt, t)` draws in raw output pixels (see `makePixels`/`drawPixels`).
- Safe area: keep text between screen-y ≈ 260 and ≈ 1730 design units (≈220–1460 px). Nothing important under the Shorts/Reels UI.

## Characters

`guy(ctx, x, groundY, scale, pose, face, opts)`:
- `pose`: `STAND`, `SEATED`, `walk(phase)`, `runCycle(phase, {lean, flail})`, or your own `{hip, lean, headLean, headTilt, lh, rh, lf, rf, elbow:[±1,±1], knee:[±1,±1], footDir}`.
  - Joints are local, relative to the ground point under the hip. +x is the way he faces; up is −y.
  - **The shoulder sits about 400 above the ground, so a raised hand needs y ≈ −520…−580.** Arms reach about 180 from the shoulder; IK clamps anything further.
  - Use `{...STAND, rh: [...]}` to tweak one limb. For hand-drawn timing, put `twos(lt)` into cycles and keyframes.
- `face`: `gx`, `gy` (gaze −1..1), `mouth` (`smile` `grin` `frown` `O` `shout` `strain` `wavy` `flat`), `eyes` (`wide` `squint` `closed` `happy` `oneOpen`), `sweat`, `lines` (±1 pop marks).
- `opts`:
  - `flip` faces him left.
  - `alpha` fades him.
  - `color` changes his ink (ghosts, frozen people: e.g. `'#B8B8B8'`).
  - `accent: {kind: 'scarf'|'cap', color}` marks a secondary character. **The main character never wears colour.**
  - `after(ctx, joints)` draws a held prop in his local space, e.g. `phoneSmall(c, j.rh[0], j.rh[1] - 28)`.
- `silhouette(ctx, x, y, s, pose, color, {flip, skewX})` draws a filled shadow version.
- Keyframe poses with `kf([[t, poseA], [t2, poseB]], lt)`; it mixes nested objects. Use `step(...)` for hard switches such as faces.

## Props and text

- **Furniture and scenery:** `floor`, `table(ctx, x, {drawer})`, `chair(ctx, x, {flip})`, `door(ctx, x, open)`, `windowFrame`, `cup(ctx, x, y, t)`, `lampPost`, `phoneSmall(ctx, x, y, angle, scale, lit)`.
- **Speech and thought:** `bubble(ctx, x, y, ['LINE'], {size, tx, ty, think})` draws a speech or thought bubble with its tail pointing at (tx, ty).
- **Premise card:** `card(ctx, [['LINE', colour], …], {lt, size})`. Keep it to 2–3 lines, about 100–118 size, and use the accent on one line only.
- **Corner label:** `label(ctx, 'DAY 7', {lt, bar: 7/30})` for DAY / AGE / time stamps, with an optional progress bar.
- **Phone close-up:** `phoneCloseup(ctx, (c, SX, SY, SW, SH) => {...}, {thumb, buzz, t})`. Inside it, `textMsg(c, SX, SY, SW, y, ['line'], {from, color, header})` draws a message bubble.
- **Text:** `txt(ctx, s, x, y, size, color, 'InterTight'|'Inter6'|'Inter4', align)`, `rr()` for rounded rectangles, and the raw pen `D.line / D.poly / D.rect / D.ellipse / D.dot`.

## Sound

- `at(t, when, kind, gain)` fires once as the playhead passes `when`. Call it inside a draw function and pass `t`.
- `ev(t, kind, gain)` fires unconditionally.
- **Kinds:** tick clock step tap pop ping notif buzz swipe whoosh knock dooropen doorclose thud brick crumble coin cash freeze unfreeze glitch rumble boing splash sting hit chime heart breath chuckle scribble paper clink birds ring click alarm skid car cut flower.
- `bed(name, a, b, gain)` adds a background bed: `room`, `street`, `crowd`, `wind`, `hum`, `rain`. The special name `'silence'` forces true silence in that window.
- `music(mood, a, b, gain)` adds music. Moods: `tender` `resolve` `eerie` `playful` `tense`.
- Use silence on purpose before payoffs. Music stays under the SFX, and there's no voice.

## Known gotchas

- Inter has no "✓" glyph, so draw ticks with `D.line`.
- `bed('silence', a, b)` mutes everything in that window, including one-shot SFX. Place hits outside it.
- `walk`/`runCycle`: positive phase walks forward and negative walks backward (fixed 2026-10-24; before that the cycle moonwalked).
- `D.text` uses the 'Chalk' handwriting font (Chalkboard SE, registered by the kit).

## Rules (from the channel profile)

- No voice-over. The story must read with the sound off.
- The first frame is already strange or in motion. The premise card comes by 2 s at the latest and stays ≤ 1.5 s.
- Black ink on pure white, with **one** accent colour per video.
- The main character is identical in every video.
- Hard cut at the end: no outro, logo or subscribe ask.
- Duration is whatever the story earns, inside 30–45 s.
- On-screen text is short, spelled right, and readable at phone size (≥ 40 design units for anything that matters).

## QA before calling a video done

1. `--sheet`: every second has something happening, and no frame shows a broken pose (limbs folded through the head, hands far from props), clipping, or text under the safe line.
2. `--stills` at each beat's key moment. Check gaze direction, prop contact, and that raised arms actually go above the head.
3. `build.sh`: decode OK, duration as planned, mean volume about −14 to −17 dB.
4. Do not edit `kit.mjs`, `draw.mjs` or `sfx.py` from a video; they're shared. Put one-off helpers in the scene file. If the kit has a bug, report it.
