# Safe zones and on-screen text for 1080x1920 vertical video

Researched 25 Oct 2026 for YouTube Shorts, Instagram Reels and TikTok. Every number below has a source. Where a number is our own engineering choice rather than a published figure, it is marked **[judgement]**. Anything I could not check against the primary page is marked **[unverified]**.

Main caveat: **no platform publishes a safe zone for organic posts.** All three publish one for ads only. Ads run in the same full-screen feed as organic posts, with the same caption, username and button rail, plus a CTA button on top. That makes the ad numbers a conservative bound for organic posts.

---

## Sources

Primary sources (read directly)

| # | Source | What it gives | URL |
|---|---|---|---|
| G1 | Google Ads Help, "Use square and vertical video…" | Vertical 1080x1920 safe-zone diagram; says vertical ads run "in-stream, in-feed, and YouTube Shorts" | https://support.google.com/google-ads/answer/9128498?hl=en |
| G2 | Google Ads Help, "About video ad specs" | Links the official vertical overlay PNG | https://support.google.com/google-ads/answer/13547298?hl=en |
| G3 | Google vertical overlay PNG (1080x1920) | I measured it pixel by pixel: the white safe rectangle runs x 48–887, y 289–1246 | https://services.google.com/fh/files/misc/youtubesafezoneoverlay_vertical_final.png |
| G4 | Google "Universal Video Ad Safe Zones" PDF | Vertical diagram labelled 288 / 672 / 48 / 192; "approved for use across all screens, formats & campaign types"; "no guarantees … for some device models" | https://services.google.com/fh/files/misc/universalsafezones-youtube.pdf |
| G5 | Google vertical diagram (SVG on the help page) | Its text labels read 288, 672, 192, 48 | https://storage.googleapis.com/support-kms-prod/jbb4hOyc2nGdunbKddqpFAEQpHOQvy582jIR |
| M1 | Meta Ads Guide, Instagram Reels video specs | "leaving at least 14% of the top, 35% of the bottom, and 6% on each side of your asset free from text, logos, or other important creative elements" | https://www.facebook.com/business/ads-guide/update/video/instagram-reels |
| B1 | BBC Subtitle Guidelines (current online version) | Reading rate, minimum timing, gaps, **9:16-specific** font size, line length and position | https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/ |
| N1 | Netflix Timed Text Style Guide, English (USA) | 42 chars per line; 20 cps for adults, 17 cps for children | https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide |
| N2 | Netflix Timed Text Style Guide, General Requirements | Minimum duration 5/6 s (20 frames at 24 fps); maximum 7 s | https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements |
| N3 | Netflix Subtitle Timing Guidelines | Minimum gap of 2 frames; gaps of 3–11 frames (24 fps) must close to 2; gaps are "2 frames or at least half a second" | https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines |

Secondary sources (third-party, used where no primary page could be read)

| # | Source | URL |
|---|---|---|
| T1 | TikTok Ads Help, Auction In-Feed Ads. Publishes safe-zone **files**, not numbers. **The page refused connections from this network (TLS reset), so I could not read it.** | https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads |
| T2 | upload-post.com safe-zone checker (checked 23 Sep 2026). Measured TikTok's "In-Feed Standard Version LTR" file: drawn at 720x1280, 160 top / 440 bottom / 80 sides, scaled x1.5 | https://www.upload-post.com/tools/safe-zone-checker/ |
| T3 | Socialync TikTok safe zone. Same template, scaled to 240 / 660 / 120 / 120 | https://www.socialync.io/tools/safe-zones/tiktok |
| T4 | TikTok "Creative best practices for performance ads" (via search snippets; same TLS block) | https://ads.tiktok.com/help/article/creative-best-practices?lang=en |
| S1 | Socialync YouTube Shorts and Reels pages (repeat G and M numbers) | https://www.socialync.io/tools/safe-zones/youtube-shorts , https://www.socialync.io/tools/safe-zones/instagram-reels |
| S2 | Hopper HQ, Reel size 2026 (Meta % converted to px) | https://www.hopperhq.com/blog/instagram-reel-size/ |
| S3 | VidPros, vertical video safe zone (27 Jul 2026), UI-change notes | https://vidpros.com/vertical-video-safe-zone/ |
| S4 | Reap, short-form safe zones 2026 | https://reap.video/blog/short-form-video-safe-zones |
| S5 | Poster.ly TikTok checker | https://www.poster.ly/tools/tiktok-safe-zone-checker |
| S6 | Revid TikTok and Shorts checkers | https://www.revid.ai/tiktok-safe-zone , https://www.revid.ai/youtube-shorts-safe-zone |
| S7 | Outfy / First Pier Reels numbers | https://www.outfy.com/blog/instagram-safe-zone/ , https://www.firstpier.com/resources/instagram-ad-safe-zones |
| A1 | Apple HIG Typography: iOS 17 pt default, 11 pt minimum (confirmed through search; the page body would not render in fetch) | https://developer.apple.com/design/human-interface-guidelines/typography |
| R1 | Brysbaert (2019), "How many words do we read per minute?", J. Memory and Language 109:104047. Silent reading averages 238 wpm (non-fiction) and 260 wpm (fiction) | https://www.Gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf |
| R2 | DCMP Captioning Key, presentation rates (120–160 wpm by audience; adult movies: never < 2 s on screen, never > 225 wpm) | https://dcmp.org/learn/captioningkey/601 |
| R3 | Facebook-cited Fors Marsh research (2016): mobile feed content recalled after 0.25 s of exposure | https://www.marketingdive.com/news/facebook-why-mobile-video-ads-must-work-fast/446217/ |
| R4 | Marketing Dive (2016): publishers reported ~85% of Facebook video views silent | https://marketingdive.com/news/most-of-facebooks-8b-daily-video-views-happen-without-sound/419407 |
| R5 | Eye-tracking study (2024, n=168): watching subtitled video with sound off raises cognitive load and lowers comprehension | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11458047/ |

---

## Safe zones

All numbers are pixels on a 1080x1920 frame, given as the band the platform UI covers along each edge.

### YouTube Shorts

| Edge | Covered px | What sits there | Sources |
|---|---|---|---|
| Top | **288** | search, camera, menu; ad label | G3 (measured), G4, G5 |
| Bottom | **672** | title, channel, Subscribe, sound, progress bar; ad CTA | G3, G4, G5 |
| Left | **48** | edge | G3, G4, G5 |
| Right | **192** | like / dislike / comment / share / remix rail | G3, G4, G5 |
| Safe rect | x 48–888, y 288–1248 (840x960) | | measured on G3 |

Where sources disagree:
- Revid (S6): 380 top and bottom, 60 left, 120 right.
- VidPros (S3): at least 380 top and bottom.
- Other blogs: 150 / 450 / 150.

None of these cite a primary source. **Google's 288/672/48/192 is official and I measured it from Google's own overlay**, so it wins. S3 also says Shorts' Subscribe button grew about 30% in late 2025, which enlarges the bottom-left dead zone **[unverified, no source given]**. Google's bottom band is already 672 px, so it covers that change.

### Instagram Reels

| Edge | Covered px | What sits there | Sources |
|---|---|---|---|
| Top | **269** (14%) | "Reels" header, camera; Sponsored label | M1 (official %), S1/S2 (px) |
| Bottom | **672** (35%) | username, caption, audio bar; ad CTA | M1 |
| Left | **65** (6%) | edge, and crop on screens taller than 9:16 | M1 |
| Right | **65** (6%) | edge. **The like/comment/share rail is NOT inside 6%** | M1 |
| Safe rect | x 65–1015, y 269–1248 (950x979) | | derived from M1 |

Where sources disagree:
- Meta's 6% sides do not clear the right button rail, which reaches well above the 35% bottom band. Hopper HQ (S2) quotes about 770 px (40%) clear at the bottom right for the rail. It also says ads with disclaimers must keep the bottom 40% clear. **[unverified against Meta]**
- Third-party organic numbers (S7) are smaller: Outfy gives 108 / 320 / 60 / 120, and Lilach Bullock gives 250 top / 340 bottom.
- VidPros (S3) says the audio bar grew about 50 px in late 2025 **[unverified]**.
- For our purposes, the YouTube 192 px right margin and the TikTok rail notch below cover the Reels rail.

### TikTok

| Edge | Covered px | What sits there | Sources |
|---|---|---|---|
| Top | **240** (160 on the 720 template) | Following / For You tabs, search, LIVE | T2, T3 (from TikTok's In-Feed template, T1) |
| Bottom | **660** (440 on the template) | username, caption, sound, ad CTA | T2, T3 |
| Left | **120** (80 on the template) | edge | T2, T3 |
| Right | **120** (80 on the template), **widening to 300 from y = 840 down** | avatar, like, comment, bookmark, share rail | T2 (rail 200 px wide on the template, so 300 px); T3 measured it as 180 px |
| Safe rect | x 120–960, y 240–1260 (840x1020), with the rail notch x > 780 for y > 840 | | |

Where sources disagree:
- **This explains the common "160 top / 440 bottom" blog figures.** Those are TikTok's template values on a 720x1280 canvas, quoted as if they were 1080 px. At 1080x1920 they are 240 / 660.
- Poster.ly (S5) gives 160 / 480 / 120 / 120, and Revid (S6) gives 220 / 480 / 60 / 140. These are likely organic estimates, unsourced.
- The width of the rail is disputed: T2 says 300 px (x 780–1080), T3 says 180 px.
- VidPros (S3) reports an "Add to Playlist" button added in January 2026 that widens the right dead zone by about 20 px **[unverified]**.
- TikTok states that the safe zone also depends on caption length and on add-ons such as anchors (T1, via S-sources). A long caption pushes the bottom band higher.

### Combined "safe for all three"

Rule: take the largest margin per edge, then cut out TikTok's button rail.

| Edge | Value | Set by |
|---|---|---|
| Top | **288** | YouTube (> IG 269, TikTok 240) |
| Bottom | **672**, so content ends at y = 1248 | YouTube = IG (> TikTok 660) |
| Left | **120** | TikTok (> IG 65, YT 48) |
| Right | **192**, so content ends at x = 888 | YouTube (> TikTok 120, IG 65) |
| Rail notch | for **y > 840**, content ends at **x = 780** | TikTok rail at its widest measurement (T2). The narrower 180 px reading (T3) is already covered by the 192 margin |

```
SAFE      = { x: 120, y: 288, w: 768, h: 960 }   // x 120–888, y 288–1248
RAIL_NOTCH = { x: 780, y: 840, w: 300, h: 1080 } // keep text out where it overlaps SAFE
SAFE_LOW  = { x: 120, y: 840, w: 660, h: 408 }   // x 120–780, y 840–1248
CENTER_X  = 504   // horizontal centre of SAFE (not 540)
```

Why this shape:
1. The YouTube numbers are the only ones measured from an official overlay. They are also the largest at top, bottom and right.
2. TikTok's sides are the largest on the left, and its rail is the widest object at the lower right.
3. Ad templates include a CTA that organic posts lack, so this is conservative for organic posts. It still has to be conservative, because a long organic caption expands TikTok's bottom band (T1) and none of the platforms publish organic numbers.
4. Centred text: the safe rectangle is off-centre, with its middle at x = 504. A box centred on 540 must stay within x 192–888 (696 wide). Below y = 840 it must stay within x 300–780 (480 wide). Left-aligned text from x = 120 gets more width.

---

## Text placement

Vertical bands inside SAFE (y in px). The bands are **[judgement]**, built on the cited facts noted against each one.

| Band | y range | Use | Basis |
|---|---|---|---|
| Hook / headline | **288–640** | Titles, hook text, "YOU VS…" headers | Top of the safe area. 640 is the end of the frame's top third. Text here is clear of the rail notch, which starts at y 840, so it gets the full 768 px width |
| Stage / action | **640–1248** | Characters, objects; speech bubbles next to the speaker | BBC (B1) on 9:16: faces sit "generally in the top half". In our videos the stage is the middle band, so bubbles go beside heads, not over them |
| Speech bubbles | anywhere in **400–1100**, beside the speaker's head, tail toward the mouth. Never over a face | | Bubbles that reach below 840 must respect the notch (x ≤ 780) |
| Labels | next to their object, anywhere in SAFE, out of the notch | | |
| Captions / subtitles | **≈ 1000–1248**, the lowest part of the safe area | Transcribed narration | BBC (B1) on 9:16: "position subtitles a little higher up, though still generally in the lower third". In social video the lower third of the frame is UI, so "lower" here means the bottom of SAFE |

**Is the bottom third usable?** **No, not for text.** The bottom third of the frame is y 1280–1920. It sits entirely inside the bottom UI band on all three platforms: YouTube and IG are unsafe from y 1248, TikTok from y 1260. It also lies under the caption, username and CTA. Use it only for background art and anything that may be covered. y 1248–1280 is also unsafe. The lowest usable text baseline is about y 1248 minus the descender.

Other placement rules from the sources:
- Lines per text block. BBC (B1): at most 2 lines for landscape and **at most 3 lines for 9:16**. Netflix (N1, N2): 2 lines. Reap (S4): "one or two short lines are easier to protect than a wide paragraph."
- Line length on 9:16. BBC (B1): "the equivalent to 37 characters in a 75% width region of a 16:9 video is **25 characters in a 90% width region of a 9:16** video." Our SAFE is 768 px wide, only 71% of 1080, so expect fewer characters. See Sizes below.
- Contrast. BBC (B1): white text on black is the norm. Reap (S4): "text inside a safe zone can still be unreadable over a bright … changing background."

---

## Sizes

No platform publishes a minimum text size for vertical video. I searched, and only creator blogs give pixel numbers. Two real anchors exist, and the rest is derived from them.

**Anchor 1: BBC 9:16 subtitle size (B1, section 9.2.1).** "Font size should be set to fit within a line height in the range **3.9% to 4.5% of the active video height for 9:16** … e.g. 4.2%." BBC derives this from its 8% landscape figure × 9/16, so text appears the same size as landscape subtitles. At 1920 px that is a **line height of 75–86 px (target 81)**. With a typical line-height of 1.2–1.25 the font size comes out at **≈ 60–72 px**; that conversion is mine. BBC calls this "the largest size needed for presentation." Players may shrink it but never enlarge it.

**Anchor 2: Apple HIG (A1).** iOS body text defaults to 17 pt with a hard minimum of 11 pt. A vertical video fills the phone's width. iPhone widths run about 375–440 pt, so 1 pt ≈ 1080/375 = **2.88 video px on the smallest common phone** (the worst case). That gives:
- 17 pt body ≈ **49 px**
- 11 pt minimum ≈ **32 px**

Check against BBC: BBC's 81 px line ≈ 28 pt line ≈ 22–23 pt type, a little larger than iOS body. That fits text on moving video that viewers only glance at.

| Role | Minimum font px | Target font px | Basis |
|---|---|---|---|
| Body: captions, speech bubbles, narration lines | **52** | **60–72** (line height 75–86) | Target is BBC 9:16 (B1). Minimum = iOS 17 pt body (A1) ≈ 49, rounded up **[judgement]** |
| Labels: short tags on objects, 1–3 words | **36** | 40–48 | Floor = iOS 11 pt minimum (A1) ≈ 32, plus margin **[judgement]**. No published figure exists |
| Headline / hook | **84** | 96–120 | **[judgement]**: about 1.5× the body target. No published figure exists |

Unverified creator figures, for context only: blitzcut.ai says TikTok captions start being readable at 48–55 px and gives 60–75 px as standard (https://blitzcutai.com/blog/best-caption-size-tiktok-2026). That agrees with the derived numbers.

**Characters per line.** BBC's 25 characters in 972 px at a line height of about 81 px implies an average glyph advance of **≈ 0.58 em** for a wide sans (Reith Sans) at about 67 px. So:

```
max_chars_per_line ≈ box_width_px / (0.58 × font_px)
```

| Font px | Full SAFE (768 px) | SAFE_LOW (660 px) |
|---|---|---|
| 64 | ≈ 20 | ≈ 17 |
| 104 | ≈ 12 | — |

For a narrower font, measure the font itself instead of using 0.58.

---

## Duration formula

### Evidence

| Source | Rate | Minimum on screen | Maximum | Gap between texts |
|---|---|---|---|---|
| BBC (B1 §4, 4.1, 4.5) | **160–180 wpm = 0.33–0.375 s per word** | "around **0.3 s per word** (e.g. **1.2 s for a 4-word** subtitle)" | — | If there is a gap, "a minimum of **one second**, preferably a second and a half. Anything shorter … produces a very jerky effect." Do not leave gaps if the time can go to text |
| Netflix (N1–N3) | **20 cps** adults, **17 cps** children | **5/6 s (20 frames at 24 fps)** | **7 s** | **≥ 2 frames**. Gaps are either 2 frames or ≥ 0.5 s; 3–11 frames (24 fps) must be closed |
| DCMP (R2) | 120–130 wpm (education), 150–160 wpm (adult special interest), ≤ 225 wpm (adult movies) | adult movies: never < **2 s** | — | — |
| Brysbaert (R1) | silent reading of static text: 238 wpm (non-fiction) | — | — | — |
| BBC (B1 §4.3) | — | add time for labels ("an extra second … where possible"), long figures, busy visuals, crossing shot changes | — | — |
| TikTok (T4) | "5–10 words per second" for ad text overlays **[unverified, page blocked; from search snippets]** | — | — | — |

The TikTok figure is an ad-pacing heuristic. It reportedly traces to a 2020 Vidmob correlation with 6-second view rate. It is 300–600 wpm, far beyond any reading-speed evidence. Do not use it for text the viewer must read. At most it describes flashing single keywords.

Our case is harder than subtitles. The viewer is muted, the text carries the story, and the text competes with a moving illustration (BBC §4.3.4). So use the **slow** end of each guideline: 160 wpm and 17 cps.

### Formula

```
W = word count, C = characters including spaces and punctuation

read(s)    = max( 1.2,  0.375 × W,  C / 17 )
           + 0.5  if the text appears together with a new visual event   [judgement]
           + 0.5  if the text contains a number with 3 or more digits    [judgement]
read(s)    = min(read, 7.0)          // Netflix max. Split longer text into two cards

on_screen  = t_in_unreadable + read + t_out
gap        = exactly 2 frames (swap in the same slot)   OR   ≥ 0.5 s
             never between 3 and 11 frames at 24 fps (0.09–0.49 s)
             a gap left as a pause, with nothing on screen: ≥ 1.0 s (BBC)
```

Where each term comes from:
- 1.2 s floor: BBC's worked minimum for 4 words. It is above Netflix's 0.833 s floor, because our text is not synced to audible speech. **[judgement in choosing BBC over Netflix]**
- 0.375 s per word: BBC, 160 wpm.
- C / 17: Netflix's children's rate. It catches long words that the word count misses. 0.375 s per word assumes an average word of about 6 characters with its space, so 17 cps ≈ 160 wpm and the two terms agree on typical text.
- The two +0.5 s terms are judgements. BBC says to add time for both cases but gives a number only for labels ("an extra second").

Worked examples:

| Text | W | C | read |
|---|---|---|---|
| "Wait." | 1 | 5 | 1.2 s (floor) |
| "What if the Sun went out?" | 6 | 25 | max(1.2, 2.25, 1.47) = **2.25 s** |
| "You'd have 8 minutes before you noticed." | 7 | 40 | max(1.2, 2.63, 2.35) = **2.63 s** |

### How much of an animate-in counts as readable time

**No guideline addresses this; everything here is [judgement].**
- A fade, scale or slide-in counts as readable only from the frame where the text reaches **≥ 90% opacity** and is within **2% of its final scale and position**. Everything before that frame is `t_in_unreadable` and is added on top of `read`. The same applies to animate-out: the readable clock stops when the exit starts.
- Keep entry animations at **≤ 0.3 s (≤ 7 frames at 24 fps)**. Then the unreadable portion is small and the formula stays honest.
- Progressive reveals (typewriter, word-by-word): if the reveal runs **no faster than 17 cps**, reveal time counts as reading time, because the eye follows it. After the last character, the line must stay fully visible for at least **max(0.5 s, read − reveal_time)**. If the reveal runs faster than 17 cps, treat it as an ordinary animate-in and count none of it.

---

## Hook and silent viewing

What the sources actually say:
- **TikTok (T4, ads)** **[unverified, page blocked; from search snippets]**: prioritise the hook in the first 6 seconds and introduce the core proposition within the first 3 seconds. Use captions or text overlays for context.
- **Google ABCD (ads, secondary sources only)**: on skippable ads, viewers decide in about 5 s, so the opening must hook them with tight framing and fast pacing. **[unverified, Think with Google page not reached]**
- **Meta / Fors Marsh (R3, 2016)**: people can recall mobile feed content at a significant rate after **0.25 s** of exposure. The first frame is already being judged. The underlying report was not found **[unverified]**.
- **Silent viewing (R4)**: the commonly quoted "85% of Facebook video is watched without sound" comes from **two publishers' own stats in 2016**, not a Meta study. It is dated and not platform-wide. The "80% of TikTok watched muted" figure has no primary source **[unverified]**. Nothing current and primary measures muted viewing on Shorts, Reels or TikTok. Still, every platform auto-captions by default now (S3) and every guide says to design for sound off.
- **Cost of muted viewing (R5, 2024, peer reviewed)**: subtitled video watched with sound off raised cognitive load and lowered comprehension and enjoyment. Text-only storytelling needs *more* reading time than subtitle norms, not less. That supports using the slow end of the rates above.

Consequences for the hook **[judgement, built on the above]**:
1. Hook text is fully readable by the end of the first **6 frames (0.25 s)**. Either it is present on frame 0 or its entry animation is at most 6 frames.
2. The hook headline is short enough to read inside the 3 s window: `read(hook) ≤ 2.5 s`, so roughly **≤ 6 words / ≤ 40 characters**. It sits in the headline band (y 288–640) in one or two lines.
3. The story must survive with the sound off. Every beat that carries meaning has on-screen text or an unambiguous visual. Narration audio is optional, never load-bearing.
4. No intro card or logo sting before the hook, which secondary sources (S4 and the YouTube guides) also advise.

---

## Engine rules

Rules a renderer can check per frame. Frame is 1080x1920 at 24 fps.

1. **Safe rect.** Every text glyph's bounding box lies within `x 120–888, y 288–1248`. Fail on violation.
2. **Rail notch.** Any text box whose bottom edge passes `y 840` must end by `x 780`.
3. **No text in the bottom third.** Nothing readable below `y 1248`. Art may extend there.
4. **Centre.** Centred text boxes use `x 192–888` (centre 540) above y 840 and `x 300–780` below it. Alternatively, centre on `x 504` inside SAFE.
5. **Font floors (px).** Body and bubbles ≥ 52 (target 60–72, line height 75–86). Labels ≥ 36. Headline and hook ≥ 84 (target 96–120).
6. **Line limits.** At most 3 lines per block (BBC 9:16), and 2 for bubbles. Characters per line ≤ `box_w / (0.58 × font_px)`, using the real font's advance if known.
7. **Hold time.** `read = clamp(max(1.2, 0.375·W, C/17) [+0.5 new visual] [+0.5 long number], –, 7.0)`. Readable time counts only while opacity ≥ 0.9 and transform is within 2% of final.
8. **Animate-in.** At most 7 frames, and not counted toward `read`. Typewriter reveals count only if ≤ 17 cps, and the full line then holds ≥ max(0.5 s, read − reveal).
9. **Gaps.** Two texts in the same slot are either 2 frames apart or ≥ 12 frames (0.5 s) apart. 3–11 frames is a failure. An empty pause between text cards is ≥ 24 frames (1 s).
10. **Hook.** Text readable by frame 6, read time ≤ 2.5 s (≈ ≤ 6 words), placed in y 288–640.
11. **Contrast.** Text sits on a solid or near-solid plate, or has a stroke or shadow. White on dark is the default (BBC).
12. **Overlap.** Text and bubbles never cover a character's face or head.
