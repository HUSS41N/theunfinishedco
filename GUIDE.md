# The guide: from idea to upload

This is the whole workflow, in the order it's done. Each step names the skill in [`skills/`](skills/) that holds
the detail, so you can do it by hand or ask Claude Code to do it with those skills installed.

## 0. Setup

| need | notes |
|---|---|
| Node ≥ 20 | `cd whatif-flat && npm install` gives `@resvg/resvg-js` **2.7.0-alpha.2**. Don't use 2.6.x, whose panics kill the process. |
| ffmpeg | with libx264 and AAC |
| Python 3 + numpy | the sound mixer `whatif-kit/sfx.py`; point `PY` in `whatif-flat/src/render.mjs` at it |
| Fonts | already in `whatif-flat/fonts/` (TTF; resvg can't read WOFF) |
| Claude Code (optional) | to install the skills, see [skills/README.md](skills/README.md) |

## 1. Idea and story (`shorts-hooks-story`, `whatif-channel`)

- **Write the premise as a "What if…?"** with a strong opening *image*, not just a question.
- **Build the shape, 35–45 s:**

  | beat | time | job |
  |---|---|---|
  | Hook | 0–2.5 s | strangest image, already moving; premise text ≤ 6 words on top |
  | Want + plant | → 8 s | who they are and what they want; plant what the ending pays off |
  | Rule in action | → 16 s | the premise works; each beat escalates |
  | Turn | ~55% | the cost, stake or surprise that reframes everything |
  | Climax | → 85% | a choice under pressure; ≥ 3 s on the decision |
  | Twist | last 4–8 s | pays off the plant; hard cut |

- **Avoid the four mistakes we made in Series 1:**
  - a premise card that interrupts the hook
  - list-like middles
  - no turn
  - soft endings
- **Score hooks** with the yt-script `hookscore.py` (read ADDRESS and STAKES loosely for silent video).
- **Score titles** with the yt-package `title.py`.

## 2. Text and timing (`shorts-text-safe-zones`)

- **Safe area:** x 120–888, y 288–1248. Below y 840, text must end by x 780. Never put text below y 1248.
- **Reading time:** `max(1.2 s, 0.375 s/word, chars/17)`, plus 0.5 s if a new visual arrives with it, plus 0.5 s
  for a 3+ digit number. It's counted from the end of the entrance animation.
- **Gaps:** 2 frames or ≥ 0.5 s between texts, never 3–11 frames.
- **Sizes:** headline ≥ 84 px, bubbles ≥ 52 px, labels ≥ 36 px.
- **Dialogue** goes in `say` bubbles on the speaker, never in floating labels.

## 3. Scene JSON (`whatif-flat`)

- **Read first,** in `whatif-flat/docs/`:
  - `EPISODE-BRIEF-v3.md` (the bar)
  - `SCENE-FORMAT.md`, `TEXT.md`, `CHARACTERS.md`, `STICK.md`, `WORLD.md`
- **Cast:** one entry per person, with `palette` presets. The same cast renders in both styles; in stick,
  long-haired, bun and ponytail characters get a bow.
- **Real scale:** an actor at scale 1 ≈ 800 px ≈ 1.7 m, and the floor is at y 1500. Use camera zoom for shot
  size: 0.45–0.7 wide, 1.0 medium, 1.4–2.2 close.
- **Big episodes are easiest to write with a generator script.** The episodes in `series2/` were written that
  way; the JSON is the deliverable.

## 4. Motion (`smooth-2d-motion`)

- Let the defaults work: a `smooth` spline, overlapping action and idle breathing.
- Move people with `do` actions, which blend in and out: walk (planted feet), wave, turn, reach (IK), jump.
- Use the shot `in` transitions at scene changes: push, whip, crossfade, zoom, iris, fade.
- Shake only on impacts, amp ≤ 8.

## 5. Check, look, render

```bash
cd whatif-flat
node src/render.mjs series2/NN-slug/scene.json --check                 # aim: zero warnings
node src/render.mjs series2/NN-slug/scene.json --check --style stick
node src/render.mjs series2/NN-slug/scene.json --sheet                  # look at it
node src/render.mjs series2/NN-slug/scene.json --sheet --style stick    # look at it
node src/render.mjs series2/NN-slug/scene.json --strip 12.0,24.5        # 12 consecutive frames of busy beats
node src/render.mjs series2/NN-slug/scene.json --out series2/NN-slug/build/flat
node src/render.mjs series2/NN-slug/scene.json --style stick --out series2/NN-slug/build/stick
node src/cover.mjs  series2/NN-slug/scene.json 3.5 "IT" "LEFT."                  # cover.png
node src/cover.mjs  series2/NN-slug/scene.json 3.5 "IT" "LEFT." --style stick    # cover-stick.png
ffmpeg -v error -i series2/NN-slug/NN-slug.mp4 -f null -                # decode check
node tools-series2-index.mjs                                            # refresh the site gallery
```

Look at every sheet and strip. Check for:
- covered faces
- floating feet
- hands that miss their props
- text inside props held too briefly (that text isn't linted, so time it by hand)
- bubbles that hop sides

## 6. Publish (by hand)

- Upload the MP4 as a Short or Reel.
- **Title:** ≤ 60 characters, from `title.py`.
- **Cover:** ≤ 3 words, different from the title; the words sit inside the profile grid's 3:4 crop.
- **Caption:** 1–2 lines that don't spoil the twist, plus 3–5 hashtags.
- **Never claim virality** in captions or reports, and never present editorial scores as audience data.

## 7. Brand assets

```bash
cd whatif-brand
node tools/brand.mjs          # mark, lockups, avatar, YouTube banner → assets/brand/ (SVG + PNG)
node tools/build-tokens.mjs   # after editing tokens.json
./serve.sh                    # site on :4173 (light/dark, v1/v2)
```

- **The mark** is a stickman's head still being drawn: the outline stops short, a red pencil is mid-stroke, and
  a dotted guide shows the unfinished part.
- **The banner** keeps the logo, name and tagline inside YouTube's 1546×423 all-device area.
- **Dark mode:** `youtube-banner-safe-check.png` shows that area.

## Known pitfalls (and their fixes)

All of these are handled in the engine. They're listed so you recognise them if something looks off.

| symptom | cause | fix |
|---|---|---|
| The whole frame shimmers | per-frame random line wobble (the old canvas kit) | no per-frame randomness |
| Arms teleport | actions replaced the pose instantly | blends |
| Feet slide | linear travel with a fixed step rate | step rate from distance, plus IK |
| A held item shows early | object keys merged at the start of a move | fields appear at their key |
| A pupil vanished | SVG id collision between the set and a character | per-build id prefixes |
| Renders crash at high zoom | resvg panics on translucent groups off canvas | pre-blended colours, guarded retry |
| Renders slow (~800 ms/frame) | a clip-path per part | pre-clipped geometry |
| Text vanishes on a line with "fi" | resvg drops the text when a "fi" ligature crosses into a mixed-font `<tspan>` | insert U+200C between f and i (see `whatif-brand/tools/brand.mjs`) |
| A fade won't hold black | overlays end at `to` | `"hold": true` or a `"black"` card |
