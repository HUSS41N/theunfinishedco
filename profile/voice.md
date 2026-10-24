# voice.md — What If

Channel profile read by every yt-* skill (youtube-agent-skill) and by the `whatif-channel` workflow skill.
Last updated 2026-10-24.

## The channel

**Name:** What If
**What it is:** short, faceless, minimalist stickman animations about hypothetical scenarios, strange
possibilities, psychological twists, science-fiction concepts and emotional thought experiments.
**Where:** vertical YouTube Shorts and Instagram Reels, 1080×1920.
**Default length:** 25–40 seconds (30–45 s when a story genuinely needs it). Never stretch a story to hit
a duration; cut it to the length it earns.

## Who I am talking to

One person, scrolling with the sound off, who stops for an image they can't explain in under a second
and stays because the next shot raises the stakes. They like a premise they can argue about in the
comments. They aren't here for advice and they skip anything that smells like a lecture.

## How the channel "talks"

**No voice-over by default.** The picture tells the story. The words on screen are:
- a premise card ("WHAT IF…?") of 3–8 words, shown for no more than 1.5 s;
- diegetic text such as phone screens, signs, counters and labels, spelled correctly and readable on a phone;
- at most one closing line, and only if the ending needs it. It should land a feeling, not explain the plot.

Tone: curious, slightly eerie, dry humour, quiet emotion. Twists are earned by something planted earlier.
The audience should be able to follow every video with the sound off.

## Words I never use

On screen, in titles or in captions: "you won't believe", "mind-blowing", "insane", "this changes
everything", "wait for it", "watch till the end", "life hack", "motivation", "grind", "hustle",
"stop scrolling", "POV:" as a crutch, "little did he know", "imagine a world where". No emoji walls.

## Words I do use

"What if…", short declaratives, exact numbers that live inside the story world (a countdown, a day
counter, a price tag), one-word labels (DAY 1, 03:12, SOLD).

## What I will not claim

- That a video will go viral, or any predicted view/retention number.
- Editorial scores (hookscore, title.py, my own rubric) presented as audience data. They are heuristics.
- Trend, view or growth statistics I did not read from a real source. Cite the source or leave it out.
- Real science stated as fact unless it is checked; a sci-fi premise is labelled as a premise.

## My format

- **Opening:** the first frame is already strange or already in motion (something breaking, vanishing,
  counting down, duplicating, being watched). No title card first, no logo, no "Day 1 he wakes up".
  The premise card comes after the image, by 2 s at the latest.
- **Structure:** hook image (0–2 s) → premise card → 3–5 escalating beats, each one raising the stakes,
  answering a question or opening a new one → a twist or emotional payoff → a hard, clean ending.
  No outro, no subscribe ask, no logo sting.
- **Look (v1 stick, default):** stickman characters with round white heads, black outlines, dot eyes and small
  mouths, and thin black stick limbs, wearing simple coloured clothes (a tee, a hoodie, a dress, an apron, a beanie).
  Women and girls wear a little bow. Sets are soft, warm, outlined and real-scale, with one or two accent objects.
  Keep the colour restrained: one or two colours per character. Body language and timing carry the emotion.
  Every scene must be simple enough to reproduce consistently.
- **Recurring character:** the main stickman is identical in every video. Secondary characters are
  told apart by a single accent item (a scarf, a hat), never by a different body.
- **Sound:** designed SFX and sparse music; silence is used deliberately before payoffs.
- **Styles:** both come from ONE engine (`~/dev/stickman-videos/whatif-flat/`, the `whatif-flat` skill). The same
  scene JSON renders as v1 (`--style stick`, the default look for the channel) or v2 (`flat`: flat-vector layered
  SVG characters, the "YOU VS…" infographic look). The old canvas kit (`whatif-kit`) is retired for new work; only its
  `sfx.py` mixer is still used. Both styles keep every rule here (silent, hook first, premise by 2 s, hard cut).
- **Production:** rendered locally at 24 fps. Smooth spline motion with overlapping action, no handheld shake,
  transitions between scenes, and speech in `say` bubbles. $0 per video.

## Platform notes

- Text safe area at 1080×1920: x 120–888, y 288–1248. Below y 840, end text by x 780. Nothing below y 1248. Sources: `~/dev/stickman-videos/RESEARCH-safe-zones-text.md`.
- On-screen time ≥ max(1.2 s, 0.375 s/word, chars/17). The engine's `--check` lints this. The hook title is ≤ 6 words and readable by frame 6.
- Instagram captions: 1–3 short lines + 4–6 hashtags. YouTube: title ≤ 40 characters where possible
  (mobile feed), description 1–2 lines + 3–5 hashtags including #shorts.

## Research

Competitor research uses `/yt-viral` (public listings only). It needs `yt-dlp` (`brew install yt-dlp`),
which is not installed as of 2026-10-24. Until then, research is qualitative (web search) and labelled as such.
