---
name: whatif-flat
description: >-
  Produce theunfinishedco / "What If" shorts with the whatif-flat engine: one JSON scene renders as v1 stick
  (white round heads, coloured clothes, soft outlined sets; `--style stick`) or v2 flat vector (the "YOU VS…"
  infographic look). Covers setup and requirements, scene authoring, the quality bar, rendering, covers,
  verification and every known engine pitfall. Use for any video, character, cast sheet, layered SVG frame,
  cover or scene edit for the channel, in v1 or v2. The old canvas kit (whatif-kit) is retired.
---

# whatif-flat: theunfinishedco shorts from JSON

Engine: `~/dev/stickman-videos/whatif-flat/` (repo: github.com/HUSS41N/theunfinishedco).
This skill is the **how-to**. The craft lives in the focused skills; read them alongside:
- story, hooks and packaging: `shorts-hooks-story`
- text placement, sizes and timing: `shorts-text-safe-zones`
- movement: `smooth-2d-motion`
- channel rules: `~/.claude/youtube/voice.md` (wins on conflicts)

## What you need

| need | where / version |
|---|---|
| Node | ≥ 20 (built on 24); ESM |
| `@resvg/resvg-js` | **2.7.0-alpha.2** (`npm i` in `whatif-flat/`); 2.6.2 crashed the whole process on panics |
| ffmpeg | any recent version (built on 8.1), with libx264 + AAC |
| Python with numpy | renders the sound with `whatif-kit/sfx.py`; the path is `PY` in `src/render.mjs` (currently `~/dev/masked-and-undefined/tools/.venv/bin/python`) |
| Fonts | TTFs in `whatif-flat/fonts/`: Inter Display 700/800/900, Inter 400/600, Instrument Serif Italic, JetBrains Mono. resvg needs TTF, not WOFF. |
| Verification browser (site) | playwright-core + chrome-headless-shell 1228 (it can't play H.264, so videos won't decode there) |

## Docs to read before writing a scene (in `whatif-flat/docs/`)

| doc | covers |
|---|---|
| `EPISODE-BRIEF-v3.md` | the quality bar and per-episode process |
| `SCENE-FORMAT.md` | JSON fields, motion, transitions, eases, actions |
| `TEXT.md` | `say` bubbles, kinetic text, plates, lint |
| `CHARACTERS.md` | the flat rig, poses, IK `reach`, 12 palettes, women and girls |
| `STICK.md` | the v1 look and how cast fields map to it |
| `WORLD.md` | presets, props, real scale |
| `V3-CONTRACT.md` | module interfaces |

`node src/render.mjs --list` prints the exact vocabulary: poses, props, sets and colours.

## How to make an episode

1. **Story first** (`shorts-hooks-story`): hook at 0–2.5 s, want and plant, rule in action, turn at ~55%,
   climax, twist that pays off the plant. 35–45 s.
2. **Cast.** One entry per person. Tell people apart by hair, colour and silhouette, keep each person
   identical across shots, and use `palette` presets. The same cast works in both styles; in stick, long
   hair, bob, bun, ponytail and pigtails get a bow.
3. **Block at real scale.** An actor at scale 1 is ~800 px ≈ 1.7 m, so 1 m ≈ 470 px and the floor is at y
   1500. Use camera zoom for size: 0.45–0.7 wide, 1.0 medium, 1.4–2.2 close. Props sit on furniture at real
   heights (desk top y−362).
4. **Write the JSON.** Shots must be contiguous. Use named poses first and `do` actions for movement; put
   dialogue in `say` bubbles on the actor; use the shot's `in` transitions at scene changes. Larger episodes
   are easier to write with a small generator script; the JSON is the deliverable.
5. **Check in both styles:** `node src/render.mjs scene.json --check` and `... --check --style stick`. The aim
   is **zero warnings** (info lines are fine). It lints reading time, gaps, safe zone, sizes, sfx names,
   actions and transitions.
6. **Look:** run `--sheet` in BOTH styles, plus `--strip t1,t2` (12 consecutive frames) on the busiest
   beats, and read the PNGs. Check for:
   - covered faces
   - people cropped unintentionally
   - floating or sinking feet
   - hands that miss their props
   - bubbles that hop or overlap
   - text inside props held too briefly (hand-time it: `read = max(1.2, 0.375×words, chars/17)`)
7. **Render:**
   - flat: `node src/render.mjs series2/NN/scene.json --out series2/NN/build/flat`, then copy to `NN-slug.mp4`
   - stick: `--style stick --out .../build/stick`, then copy to `NN-slug-stick.mp4`
   - Render one at a time, or ≤ 4 in parallel.
8. **Covers:**
   - flat: `node src/cover.mjs scene.json <t> "LINE1" ["LINE2"] [accent] [out]` writes `cover.png`
   - stick: the same plus `--style stick`, which writes `cover-stick.png`
   - Bubbles are kept on the cover; only the titles are dropped.
9. **Verify:** confirm each mp4's duration with ffprobe and decode it (`ffmpeg -v error -i x.mp4 -f null -`).
   Refresh the site gallery with `node tools-series2-index.mjs`. Report the paths, the durations and what you
   could not check: **you cannot hear the mix**.

## Known pitfalls (all fixed or handled; know them when something looks off)

- **resvg panics** on translucent or clipped groups fully off-canvas. Use pre-blended solid colours.
  `rasterize` retries with fallbacks, including `guardSVG`.
- **Each `clip-path` is a full-frame mask in resvg** and is slow. Sets, props and characters avoid clips.
- **SVG ids must be unique per frame.** A set/character id collision once removed a pupil. Ids are prefixed
  per build or shot.
- **Overlays end at `to`.** Use `"hold": true` to keep a fade-to-black, or a `"type": "black"` card.
- **A prop with `scale: 0` used to draw at full size.** It's fixed (`??`), but `0.01` is safe in old engines.
- **sfx kinds must exist in `whatif-kit/sfx.py`.** Beds are not one-shots, and `--check` now catches unknown
  names before a long render.
- **`plate.pad` and `plate.r` are fractions of the font size, not px.**
- **Bubble placement:**
  - It avoids heads, bubbles and screen text, but not tags or props.
  - Silhouettes and faded actors don't count as heads.
  - Give a bubble clear space in the frame, or it may change sides when another head moves close.
- **Stick-style differences:**
  - Hair colour isn't shown, so don't hang a plot point on it.
  - Dark `solid` sets turn pale, so use `spotlight` for inserts.
- **Airborne actors** keep their shadow under their feet; set `"shadow": false`.
- **resvg drops a whole `<text>` when a "fi" ligature sits inside a mixed-font `<tspan>`.** Put a zero-width
  non-joiner between f and i: `unf&#8204;inished`.

## Style rules

- **v2 flat:** flat colour, no outlines, automatic same-hue shading. Dark sets for drama, bright for everyday
  life.
- **v1 stick:** clean ink lines (never per-frame wobble), white heads, restrained colour (1–2 per character),
  soft outlined sets with 1–2 accents.
- **Both styles:**
  - Faces carry emotion, so key `face` on every beat.
  - Never recreate a real person, a brand mascot or an iconic character.
