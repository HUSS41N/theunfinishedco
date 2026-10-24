# Claude Code skills

Five skills hold what we learned making theunfinishedco. They're deliberately **separate**: each does one job
and points to the others, so Claude loads only what a task needs.

| skill | use it for |
|---|---|
| [`shorts-hooks-story`](shorts-hooks-story/SKILL.md) | Story shape, silent hooks, the turn, loops, titles, covers and captions, and diagnosing a short that leaks viewers. It's channel-agnostic and reads the yt-* tools for silent video. |
| [`shorts-text-safe-zones`](shorts-text-safe-zones/SKILL.md) | Safe zones for Shorts, Reels and TikTok, text bands and sizes, the reading-time formula, caption gaps, bubbles and covers. Sourced numbers are in `references/research.md`. |
| [`smooth-2d-motion`](smooth-2d-motion/SKILL.md) | Why code-drawn animation looks janky, and the fixes: splines, overlap, blends, IK walks, joints, camera, transitions, motion blur, verifying by eye. |
| [`whatif-flat`](whatif-flat/SKILL.md) | Producing an episode with the engine: requirements, commands, the quality bar, covers, verification and known pitfalls. |
| [`whatif-channel`](whatif-channel/SKILL.md) | The channel's 11-step workflow (ideas → research → hooks → script → shot list → package → produce). It routes to the skills above and to yt-*. |

The channel profile they all read is [`../profile/voice.md`](../profile/voice.md). Claude Code expects it at
`~/.claude/youtube/voice.md`.

## Install

```bash
# from the repo root: link each skill into Claude Code's skills folder
for s in skills/*/; do ln -sfn "$PWD/$s" ~/.claude/skills/$(basename "$s"); done
mkdir -p ~/.claude/youtube && ln -sfn "$PWD/profile/voice.md" ~/.claude/youtube/voice.md
```

## Pairs with (not included)

The `yt-*` skills from [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill):

| skill | provides |
|---|---|
| `yt-script` | `hookscore.py` and the 21 hook formulas |
| `yt-package` | `title.py` |
| `yt-shorts` | the loop point |
| `yt-retention` | hook leak, cliffs and slide |
| `yt-viral` | outliers; needs `yt-dlp` |

Install them the same way. These skills refer to them by name and never modify them.
