---
name: shorts-hooks-story
description: >-
  Hooks, story structure and packaging for SILENT vertical shorts (YouTube Shorts, Instagram Reels, TikTok)
  that tell a story with pictures and on-screen text instead of a voice-over. Use when writing or fixing a
  short's hook, beat sheet, turn, ending, loop, title, cover or caption, when a short "lacks story" or "has
  no hook", or when reviewing why one would leak viewers. Uses the installed yt-* skills' tools (hookscore,
  title linter) and says how to read them for silent video. Channel-specific rules live in the channel's
  profile (e.g. ~/.claude/youtube/voice.md), which overrides this skill.
---

# Silent shorts: hooks, story and packaging

A silent short has to be understood **with the sound off, in under a second, by someone who did not choose
to watch it**. Everything here follows from that.

If a channel profile exists (`~/.claude/youtube/voice.md`), read it first; it wins where it disagrees.
Never invent views, retention numbers or trend data, and never present an editorial score as audience data.

## The story shape (35–45 s)

| beat | time | job |
|---|---|---|
| **Hook** | 0–2.5 s | The strangest, most specific image of the story, **already in motion**. The premise text sits ON the image; there is no separate title card. |
| **Want** | 2.5–8 s | Who this is and what they want, shown, not told. **Plant** the thing the ending pays off. |
| **Rule in action** | 8–16 s | The premise works, and it's fun, funny or useful. Each beat escalates; never just repeat. |
| **Turn** | ~55% | The cost, the stake or the surprise that reframes the premise. This is where attention would otherwise leak. |
| **Climax** | to ~85% | A choice under pressure: the biggest image. Give the decision room, ≥ 3 s on the face. |
| **Twist / button** | last 4–8 s | Pays off the plant, ideally making the first shot read differently on a rewatch. Hard cut on the strongest frame. |

## Why stories fail: the four mistakes (from our own Series 1 → Series 2 rewrite)

1. **A premise card kills the hook.** Cutting from the strongest image to a text card at 1.5 s throws away the
   only seconds that matter. Overlay the premise on the moving hook image.
2. **The middle is a list.** "Lie 1, lie 2, lie 3" is repetition, not escalation. Every beat must raise the
   cost, answer a question or plant a new one, and something must change on screen every 2–4 s.
3. **There is no turn.** Without a reframe at ~55%, viewers drift at 15–20 s.
4. **The ending is soft or doesn't loop.** End on a payoff of an early plant, then a hard cut. No outro, no
   subscribe ask, no logo sting.

## Hooks

**Rules for silent hooks**
- The first frame is already strange or already moving. No establishing shot and no slow intro.
- The premise text is ≤ 6 words, readable by frame 6 (0.25 s), and placed in the top band of the safe area
  (see `shorts-text-safe-zones`). A question mark counts as a word for the 6-word limit when it stands
  alone, as in "8?".
- One idea. A hook carrying two promises keeps neither.
- Specific beats big: a number, a name or a concrete object beats an adjective.
- Make the image confirm the text, so the picture alone tells you the premise.

**Write five, keep two.** Use the 21 formulas in `~/.claude/skills/yt-script/hooks.json` as *shapes*. The ones
that translate to pictures are the impossible, before-after, clock, reveal, warning, question and statistic
(the statistic only when the number is part of the story world, e.g. a price board or a countdown).
Write each hook as an **opening image** plus an **on-screen line**.

**Score them** with `python3 ~/.claude/skills/yt-script/hookscore.py hooks.txt`.

How to read the score for silent video:
- BREVITY, CURIOSITY and SPECIFICITY transfer to silent hooks.
- ADDRESS and STAKES are tuned to spoken "you" hooks, so they under-score a strong image. Judge those two by
  the picture.
- Reject anything that takes more than ~1 s to understand.

## Loop

From `yt-shorts`: write the last beat so it sets up the first. The twist should make the opening image mean
something new. Shorts replay automatically, and a loop turns a replay into a rewatch.

## Packaging (title, cover, caption)

This follows `yt-package`; run `python3 ~/.claude/skills/yt-package/title.py titles.txt`.
- **Title:** ≤ 60 characters (desktop search) and ideally ≤ 40 (mobile feed). Write ten, keep the best.
  No more than two words in ALL CAPS.
- **Cover:**
  - ≤ 3 words, and they **must not repeat the title**: different words, same promise.
  - Pick the frame with the strongest silhouette or expression.
  - Keep the words inside the 3:4 grid crop (see `shorts-text-safe-zones`).
- **Caption:** one or two lines that extend the hook without spoiling the twist, plus 3–5 hashtags. Write
  separate Instagram and YouTube versions if the profile asks for both.

## Diagnose a short that underperforms

The three leak types come from `yt-retention`; run `retention.py` on a Studio export.
- **Hook leak** (lost in the first ~3 s of a short): fix the first frame and the premise line, never the
  edit.
- **Cliff:** one moment drops viewers, such as a confusing cut or text that's too fast. Find it and fix that
  beat.
- **Slide:** a steady bleed through the middle is pacing. Cut, and escalate harder.
- If retention is healthy but views are low, the problem is packaging: use `yt-package`.

## Checklist before production

- [ ] The hook image is described in one sentence and is already moving at frame 0.
- [ ] The premise line is ≤ 6 words.
- [ ] The plant appears in the first 8 s and the twist pays it off.
- [ ] The turn sits at 50–60%.
- [ ] No beat repeats the previous one without raising the cost.
- [ ] The climax decision has ≥ 3 s.
- [ ] The story reads with the sound off.
- [ ] The title passes `title.py`, and the cover is ≤ 3 words and different from the title.

End every output with the yt-* gate line: **ship it, or change it?**
