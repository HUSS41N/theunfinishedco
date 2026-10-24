# Text: screen text, speech bubbles, the linter

Code: `src/text.mjs` (drawing, bubbles, lint) and `src/layout.mjs` (the numbers).
Research and sources: [`../../RESEARCH-safe-zones-text.md`](../../RESEARCH-safe-zones-text.md). Every number below comes from
it. The source tags (G3, M1, T2, B1, N1–N3, A1) refer to its source table. **[judgement]** marks our own choices.

## The rules (1080 × 1920, 24 fps)

| Rule | Value | Source |
|---|---|---|
| Safe rect for text | x 120–888, y 288–1248 (`SAFE`) | combined YouTube Shorts (G3/G4) + Reels (M1) + TikTok (T2) |
| Rail notch | a text box whose bottom passes y 840 must end by x 780 (`RAIL_NOTCH`). `meta.platformSafe: false` turns it off | TikTok button rail (T2) |
| Centre | the safe centre is **x 504**, which is the default `x`. A box centred on 540 must stay within x 192–888 (300–780 below y 840) | derived |
| Bottom third | nothing readable below y 1248. Art only | all three platforms |
| Bands | hook 288–640 · stage 640–1000 · caption 1000–1248 (`BANDS`) | [judgement] on B1 |
| Minimum px | headline/hook **84** · body and bubbles **52** · labels (mono) **36** (`MIN_TEXT_PX`) | B1 9:16 size, A1 iOS 17 pt / 11 pt, [judgement] |
| Target px | headline 96–120 (default 108) · body 60–72 (64) · bubble 60 · label 40–48 (44) | B1 |
| Lines | ≤ 3 per block, ≤ 2 per bubble; about 25 characters per line | B1 (9:16) |
| Reading time | `min(7, max(1.2, 0.375 × words, chars / 17) + 0.5 with a new visual + 0.5 for a 3+ digit number)` (`readingTime`) | B1 160 wpm, N1 17 cps, N2 7 s cap |
| What counts as readable | only from the frame the text is ≥ 90% opaque and within 2% of its final scale and position, until its exit starts | [judgement] |
| Entry | ≤ 7 frames. The engine's entrances take 6 | [judgement] |
| Typewriter | at ≤ 17 cps the typing counts as reading; afterwards hold ≥ max(0.5 s, read − typing) | N1 |
| Gap in one slot | exactly **2 frames**, or **≥ 0.5 s**. 0–1 frames and 3–11 frames are errors | N3 |
| Empty pause | between text cards, ≥ 1 s (info) | B1 |
| Hook | the first text of the video: readable by **frame 6**, ≤ 6 words (read ≤ 2.5 s), inside y 288–640 | R3, T4, [judgement] |
| Overlap | text and bubbles never cover a head or a face | B1 |

## Screen text (`shot.text[]`)

The old fields all still work: `text x y size color font from to pop shadow anchor weight tracking shadowColor`.
`y` is the baseline of the first line. Lines split on `\n`. `x` defaults to 504 and `y` to 420.

New fields:

| field | values | default |
|---|---|---|
| `anim` | `pop` (scale 0.7→1 with a small overshoot) · `words` (each word pops, staggered) · `type` (typewriter + cursor) · `slide` (with `dir`: up/down/left/right) · `count` (numbers in the text count up from `countFrom`, over `countDur`) · `none` | `pop` (`pop: false` → `none`) |
| `exit` | `fade` · `slide` (up) · `down` · `pop` (shrink) · `none`; it runs in the last `exitDur` s before `to` | `fade`, 0.2 s |
| `highlight` | `'word'`/`true`: the `*marked*` words, else the last word · `"PRICE"`: that word · `2`: the word at that index. The word turns `accent` and an underline swipes in under it. `*marked*` words highlight even without this field. `underline: false` keeps the colour only | none |
| `accent` | colour of highlighted words | flat `#FFD23F`, stick `#E8442E` |
| `outline` | `false`, or a colour. Paint-order stroke, ≈ 14% of the size | dark under light text, white under dark text |
| `outlineWidth` | px | |
| `plate` | `true` or `{color, pad, r, opacity}`: a rounded backing pill (the outline thins to 7%) | none |
| `shadow` | `false` turns the soft drop shadow off | on |
| `role` | `headline` · `body` · `label` (sets the minimum size) | display → headline, sans/serif → body, mono → label |
| `wrap` | `false` never re-wraps (shrinks instead) | |
| `safe` | `false` skips the safe-rect clamp (full-bleed art text only) | |
| `avoid` | `false` lets it sit over heads or other text | |
| `tick` | `true`: a ticking counter (a countdown digit per second), exempt from reading time and the gap rule | |
| `newVisual` | override the +0.5 s "arrives with a new visual" term. Default: true when the text starts within 0.1 s of its shot | |
| `cps`, `stagger`, `countFrom`, `countDur`, `dir`, `exitDur`, `lineHeight` | tuning | |

Theme: `meta.style: "stick"` → ink `#1E1E22` text with a white outline (made for the light stick sets). Flat → white with a
near-black outline. Any `color` gets the contrasting outline automatically, so text reads on any background and over characters.

Automatic layout, in order:
1. **Fit.** If a line is wider than the safe width, shrink the text down to the role minimum. Past that, wrap the words, keeping
   the largest size that fits in ≤ 3 lines. Below y 840 the safe width is 660, not 768.
2. **Clamp.** Move the block into SAFE and out of the rail notch.
3. **No collisions.** A block that shares screen time with an earlier block in the same shot is pushed off it vertically.
   This is decided once per shot, so nothing jumps. When scene.mjs passes the speakers, a block is also pushed off any head
   it would cover, continuously with the head's position.

## Speech bubbles (`actors[].say[]`)

```jsonc
"say": [{"from": 0.4, "to": 3.2, "text": "Did you hear that?", "kind": "speech|think|shout|whisper", "side": "auto|left|right"}]
```
Optional fields: `size` (raised to at least 52), `w` (wrap width), `color`, `ink`. Without `to`, the bubble stays up for its
reading time plus its motion.

How a bubble is drawn:
- It is drawn in screen space, above every character (layer 8), with the tail pointing at the speaker's mouth. The tail stops
  at the edge of the head, so it never covers the face.
- **Placement.** It tries, in order: above the head; above, shifted away from the frame centre; above, shifted toward it; beside
  the head (away side first); then below the heads, over the bodies. Each try is clamped into SAFE and the notch. The first try
  that covers no head, no other bubble and no screen text wins. If none is clean, it shrinks (×0.9, ×0.8, never below 52 px)
  and tries again, then takes the least-bad try.
- `side` puts that side first.
- **Kinds.** Speech is a rounded box. Think is a cloud with trailing dots. Shout is an upper-case burst with a 5 Hz wobble as
  it enters. Whisper has a dashed outline.
- **Style.** Stick: ink outline. Flat: a light-grey edge plus a soft shadow.
- **Motion.** It grows out of the tail tip in 5 frames with an overshoot. It shrinks and fades out over 0.18 s.
- **Mouths.** `talking(shot, lt, id)` returns the active say (not a thought), so the mouth can flap.

## For scene.mjs / render.mjs

```js
import {screenText, bubbleLayer, talking, camToScreen, lintText, headBoxes} from './text.mjs';
const toScreen = camToScreen(cam, W, H);                 // cam = {x, y, zoom, rot} after shake
const speakers = actors.map(a => ({id, facing, anchors: {headTop, headCenter, mouth}}));   // WORLD coords
layer('screen', {}, bubbleLayer(shot, lt, C, speakers, toScreen), screenText(shot, lt, C, speakers, toScreen), overlays)
lintText(C, {headsAt})   // → [{level, t, msg}]; headsAt(tAbs) → screen head boxes (optional) adds the "covers a head" check
```

## Tools

- `node tools/text-harness.mjs` renders the test frames to `build/text/` and prints the lint for each test scene.
  Images: light and dark captions, close bubbles (with a debug overlay of SAFE, the notch, the bands and the head boxes),
  bubble kinds, auto-shrink, the stick theme, an exit mid-fade, and 10-frame strips of `words`, `count` and the highlight.
- `node tools/text-lint-all.mjs [-v]` lints every example and Series 2 scene.
- `node tools/gen-metrics.mjs` regenerates the glyph-advance table in text.mjs from `fonts/*.ttf`. text.mjs has to run in
  the browser, so it cannot read the fonts itself. Re-run it if the fonts change.

### Plate units
`plate.pad` and `plate.r` are **fractions of the font size** (e.g. `{"pad": 0.18, "r": 0.3}`), not px. A px-sized value makes the fitted size go negative.
