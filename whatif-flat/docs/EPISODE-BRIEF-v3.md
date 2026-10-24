# Series 2 re-author brief (v3 engine, both styles)

Each Series 2 episode is ONE `scene.json`. It renders twice:

- **v2 flat**: `meta.style: "flat"`
- **v1 stick**: `--style stick`

## Read first

- `docs/V3-CONTRACT.md`
- `docs/SCENE-FORMAT.md` (the motion, transitions and eases sections)
- `docs/TEXT.md` (text rules, `say` bubbles, kinetic text)
- `docs/CHARACTERS.md` (poses, IK `reach`, palettes, women)
- `docs/STICK.md`
- `docs/WORLD.md` (real scale, presets, props)
- `../whatif-series/SERIES-2.md` (the beat sheets: hook, plant, turn at ~55%, payoff)
- `/Users/hussain/dev/stickman-videos/RESEARCH-safe-zones-text.md` (safe zones and reading times)

## What the user asked for (25 Oct)

- Smooth motion: no jank, no shake strain.
- Text that stays up long enough to read.
- Text that never fights the characters.
- A world at real scale.
- A little colour in v1.
- Better production quality and motion graphics.

## The bar for every episode

1. **Story first.** Keep the SERIES-2 beat sheet: the hook image in 0–2.5 s, the plant, the turn at ~55%, the climax and the payoff. You may tighten a beat if it reads better. Fix the known weak spots:
   - phone screens with nothing on them (fill them with real UI: names, times, typed text, read receipts)
   - tiny walkers in 05
   - the compressed decision beat in 08
2. **Real-scale blocking.**
   - Actors at scale ~1 for mediums.
   - Wide shots use camera zoom 0.45–0.7, never tiny actor scales.
   - Close-ups use zoom 1.4–2.2 on faces.
   - Props sit on furniture at the right heights (see `docs/WORLD.md`).
   - Use the new presets where they fit: kitchen, bedroom, cafe, hospital, bus, rooftop, classroom, livingRoom.
   - Vary the shot sizes: establish wide, then medium, then close on the reaction.
3. **Smooth motion.**
   - Let the default `smooth` spline and overlap do the work.
   - Use `do` actions with blends (walk with planted feet, wave, turn, reach, jump with crouch).
   - Prefer fewer, bigger, well-timed moves over many twitches.
   - Every actor idles by default; don't fight it.
   - Camera: slow pushes and gentle moves; `shake` only on real impacts, amp ≤ 8.
4. **Motion graphics.**
   - At scene changes, use transitions (`in`: push/whip/crossfade/zoom/iris/fade) instead of hard cuts where they add energy. Hard cuts are still fine for comic timing.
   - Use kinetic text (`anim: words/count/type`, `highlight`) on the beats that need it.
   - Counters animate (`count`).
5. **Text.**
   - Dialogue goes in `say` bubbles on the speaker; no floating `tag` props for speech.
   - Captions are minimal and inside SAFE.
   - The hook title is readable by frame 6, has ≤ 6 words and sits in y 288–640.
   - `node src/render.mjs <scene> --check` must show **zero reading-time, gap, safe-zone and size warnings** in both styles. Info lines are fine.
   - Remember: the bottom of the frame (y > 1248) is platform UI. Put no text there, and nothing important.
6. **Both styles must look good.**
   - Don't hard-code dark-only colours that vanish in stick. Sets restyle themselves.
   - Text themes switch automatically.
   - Silhouettes and tints work in both styles.
   - Check `--sheet` in BOTH styles and fix anything that reads badly in one of them.
7. **Length.** 34–45 s. Keep each episode's sound design: sfx on actions, a music bed if it has one.

## Process for each episode

1. Back up the old file as `scene.v2-old.json` in the same folder.
2. Re-author `scene.json`. Hand-write it, or write a generator script in your own scratch folder. Either way, `scene.json` is the deliverable.
3. Run `--check` in both styles until the lint is clean.
4. Run `--sheet` and `--style stick --sheet`. LOOK at both. Also look at `--strip` on the two busiest moving beats. Fix what you see.
5. Render the videos:
   - flat: `node src/render.mjs series2/NN-slug/scene.json --out series2/NN-slug/build/flat`, then copy the mp4 to `series2/NN-slug/NN-slug.mp4`
   - stick: the same with `--style stick --out .../build/stick`, then copy to `series2/NN-slug/NN-slug-stick.mp4`
6. Make the covers:
   - flat: `node src/cover.mjs series2/NN-slug/scene.json <t> "LINE1" ["LINE2"]` → `cover.png`
   - stick: the same plus `--style stick` → `cover-stick.png`

   Use the SERIES-2 cover words, or better ones, at most 3 words per line.
7. Check each mp4 with ffprobe: duration, plus a decode check (`ffmpeg -v error -i x.mp4 -f null -`).

Rendering is CPU-bound and other agents render at the same time. Render your episodes one after another, not in parallel.

## Don't

- Don't edit `src/*`. If the engine has a bug, work around it in JSON and describe it in your report with a minimal repro.
- Don't claim something looks right without looking at it.
