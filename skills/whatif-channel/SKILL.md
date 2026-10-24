---
name: whatif-channel
description: >-
  Creative director and scriptwriter for the user's channel (brand: theunfinishedco; series format "What if…?"):
  silent stickman Shorts/Reels about hypotheticals, twists and thought experiments. Use when the user asks for What If
  video ideas, hooks, a script, a shot list, titles/covers/captions, or "the next video" for the channel.
  Routes each step to the installed yt-* skills and applies the channel profile.
---

# whatif-channel

The channel profile is `~/.claude/youtube/voice.md`. **Read it first, every time.** It overrides any
default in the yt-* skills where they disagree (they assume a talking-head, spoken channel; this one is
silent by default).

This skill adds no pipeline of its own. It sequences the installed skills and says how to read their
tools for a no-voice-over, visual format. The craft lives in focused skills, which stay separate:
`shorts-hooks-story` (story shape, hooks, packaging), `shorts-text-safe-zones` (text placement and timing),
`smooth-2d-motion` (movement) and `whatif-flat` (production).

## Workflow (run in order; stop where the user asked to stop)

1. **Ideas.** When asked for ideas, generate 10 original premises (one line each + the opening image).
   No repeats of past videos (see `~/dev/stickman-videos/whatif-series/IDEAS-LOG.md`, append to it).
2. **Research.** If web access is available, use `/yt-viral` for competitor outliers (needs `yt-dlp`;
   if missing, say so) and web search for qualitative trends. Cite sources. **Never invent views,
   statistics or trend data.**
3. **Rank** on six editorial criteria, 1–5 each, and say plainly they are editorial judgements:
   hook strength · curiosity · visual potential · emotional payoff · originality · feasibility in
   minimalist stickman animation.
4. **Select** the strongest; one sentence each on why it could work.
5. **Hooks.** For a selected idea, write FIVE distinctly different openings. Write each as an
   *opening image* plus the *on-screen premise line*. Use `/yt-script`'s `hooks.json` as shapes:
   the visual-friendly formulas are The Impossible Claim, Before and After, The Clock, The Reveal,
   The Warning, The Question and The Statistic (only with an in-story number). Run the premise lines
   through `python3 ~/.claude/skills/yt-script/hookscore.py hooks.txt`. **How to read it here:** BREVITY,
   CURIOSITY and SPECIFICITY transfer; ADDRESS and STAKES are tuned to spoken "you" hooks and will
   under-score silent images, so judge those two by the picture. Reject slow introductions, generic
   questions and anything that takes more than ~1 s to understand.
6. **Script**, 35–45 s, in the `shorts-hooks-story` shape (hook, want and plant, rule, turn at ~55%, climax,
   twist), beat by beat. Each beat is what is ON SCREEN (action, text, sound),
   never narration unless the user asked for voice.
7. **Evaluate** retention, pacing, escalating stakes, visual clarity, originality and ending quality.
   Name the weakest beat.
8. **Rewrite** the weak sections before showing the final script.
9. **Shot list** with timestamps, actions, camera (real scale, zoom for wide shots), transitions, SFX and exact
   on-screen text, timed per `shorts-text-safe-zones`.
10. **Package** with `/yt-package`: ten titles through `python3 ~/.claude/skills/yt-package/title.py`,
    keep the best, then the cover concept (3 words max, must not repeat the title) and the caption
    (Instagram + YouTube versions per the profile).
11. **Produce** only when asked. Write ONE scene JSON with the `whatif-flat` skill
    (`~/dev/stickman-videos/whatif-flat/`, quality bar in `docs/EPISODE-BRIEF-v3.md`). Render it as v1
    (`--style stick`, the channel default) and/or v2 (flat). The canvas kit `whatif-kit` is retired. Do not
    build a separate pipeline per video.

## Rules that never bend

- No voice-over by default. Story readable with the sound off.
- v1 stick is the default look: white round heads, ink limbs, restrained coloured clothes, soft outlined sets.
- First frame already strange or already in motion.
- No generic motivation, no predictable endings, no stretched runtime.
- Never claim virality; never present scores as audience data.
- Every output ends with the yt-* gate line: **ship it, or change it?**
