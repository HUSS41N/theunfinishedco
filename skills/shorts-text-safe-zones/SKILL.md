---
name: shorts-text-safe-zones
description: >-
  Where on-screen text, captions, speech bubbles and covers can go in 1080×1920 vertical video, how big they
  must be, and how long they must stay up to be read. Covers YouTube Shorts, Instagram Reels and TikTok UI
  safe zones, plus reading-time and caption-gap rules from BBC and Netflix subtitle standards. Use when placing
  or timing text in a short, when text "disappears too fast" or sits under the app buttons, when designing a
  cover or thumbnail for the profile grid, or when building a linter or renderer that enforces these rules.
---

# Text and safe zones for vertical shorts

All numbers are for a **1080×1920** frame. Sources and the full evidence are in
[references/research.md](references/research.md); read it when a number needs defending or updating.

Caveat: no platform publishes a safe zone for organic posts. The numbers below come from each platform's
**ad** safe zones, which share the organic UI plus a call-to-action button, so they are slightly cautious.
Re-check them yearly, because the apps move their buttons.

## Safe zones

Pixels covered by the app's UI on each edge:

| platform | top | bottom | left | right | source |
|---|---|---|---|---|---|
| YouTube Shorts | 288 | 672 | 48 | 192 | Google's official vertical overlay, measured |
| Instagram Reels | 269 (14%) | 672 (35%) | 65 (6%) | 65 (6%) | Meta Reels ad spec |
| TikTok | 240 | 660 | 120 | 120, widening to ~300 below y 840 | TikTok template via third-party sites |

**Safe for all three:**

```
SAFE        x 120–888, y 288–1248   (768 × 960)
RAIL NOTCH  for y > 840, text must end by x 780   (the like/comment/share button column)
NO TEXT     below y 1248, the bottom third: captions, usernames and the progress bar live there
```

- **Centre:** the safe area's centre is **x 504, not 540**. Text centred on 540 must stay within x 192–888,
  or within x 300–780 below y 840.
- **The bottom third** can hold background art, never text or anything the story depends on.

## Where text goes

| band | y | use |
|---|---|---|
| hook | 288–640 | the premise or hook line; covers' words |
| stage | 640–1000 | speech bubbles near heads, labels |
| caption | 1000–1248 | short captions and counters |

- Keep one text "voice" per scene: a premise line, one label (in mono, e.g. `DAY 1`, `8:59 AM`), plus diegetic
  text (phone screens, signs, bubbles).
- **Dialogue goes in speech bubbles attached to the speaker**, drawn **above all characters**, tail to the
  mouth, never over a face. Place the bubble above the head; if there's no room, move it to the side away from
  the frame centre. When two bubbles share the space under the heads, stack them, and draw the later one
  underneath so its tail tucks behind.
- Text must read on ANY background: add a paint-order outline (dark outline for light text, light for dark)
  plus a soft shadow, or a rounded backing plate. White text with a faint shadow vanishes on light sets.

## Sizes (at 1080 wide)

| role | min px | note |
|---|---|---|
| headline / hook | 84 | auto-shrink long lines rather than overflow |
| body, captions, bubbles | 52 | BBC 9:16 guidance is a line height of 3.9–4.5% of the frame height |
| labels | 36 | mono, tracked caps |

Use ~25 characters per line, ≤ 3 lines per text block and ≤ 2 lines per bubble.

## How long text stays up

```
read(s) = max(1.2, 0.375 × words, characters / 17)
          + 0.5  if it arrives together with a new visual (a cut, a new shot)
          + 0.5  if it holds a number of 3+ digits
          capped at 7.0 s; split anything longer into two cards
on_screen = entrance + read + exit
```

- **The rates:** 0.375 s/word is BBC's 160 wpm; 17 characters/s is Netflix's slower rate for children. The
  1.2 s floor is BBC's minimum for a short line.
- **Readable time starts only after the entrance:** text counts as readable once it's ≥ 90% opaque and within
  2% of its final scale. Keep entrances ≤ 7 frames (0.3 s). A typewriter reveal counts only if it types at
  ≤ 17 characters/s.
- **Gaps between consecutive texts** are exactly 2 frames, or ≥ 0.5 s. **Never 3–11 frames at 24 fps**: it
  reads as a flicker (Netflix's timing rule). An empty pause between two cards reads best at ≥ 1 s.
- **Exit animations** (a 0.15–0.25 s fade or slide) beat vanishing, which feels like a glitch.
- **Countdown digits and tickers** are exempt from the reading rule. They're read as motion, not text.
- **Text drawn inside props** (phone messages, signs, napkins) needs the same timing. Engines often don't lint
  it, so time it by hand.

## Hook text

The hook line is ≤ 6 words, readable by frame 6 (0.25 s; people recall feed content after ~0.25 s of
exposure), and sits in the hook band. Most shorts are watched muted, so on-screen text carries the story.
That's why it must hold long enough.

## Covers and thumbnails

- **≤ 3 words**, and different from the title (see `shorts-hooks-story` and `yt-package`).
- **The Instagram profile grid crops to 3:4 (y 240–1680).** Keep the cover words within y 300–700 and 900 px
  of width, centred on x 540.
- **Theme the text:** on dark frames, white with a hard shadow; on light frames, ink with a thick white
  outline. Add a soft fade behind the words in the frame's own tone.
- **Speech or thought bubbles** that carry the premise belong on the cover too; drop only the video's titles.

## Lint checklist (for a renderer, or by hand)

- [ ] Every text box is inside SAFE, respecting the rail notch, and nothing is below y 1248.
- [ ] Each text's on-screen time is ≥ `read()`, measured from the end of its entrance.
- [ ] No gap between consecutive texts in the same region is 3–11 frames.
- [ ] No font renders below its role's minimum after auto-shrink.
- [ ] The hook is ≤ 6 words and readable by frame 6.
- [ ] Bubbles don't cover any face, and stacked bubbles don't overlap.
- [ ] Text inside props is timed by hand.

In the whatif-flat engine, `node src/render.mjs scene.json --check` runs all of these except the last
(`src/layout.mjs` and `src/text.mjs`).
