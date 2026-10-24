// generated from tokens.json by tools/build-tokens.mjs
export default {
 "$name": "theunfinishedco",
 "$version": 1,
 "$note": "Source of truth. Run `node tools/build-tokens.mjs` to regenerate css/tokens.css and js/tokens.js. Values come from whatif-kit (kit.mjs, draw.mjs, sfx.py) and the Series 1 videos.",
 "color": {
  "stage": {
   "value": "#FFFFFF",
   "usage": "Every video background and the web page ground. The channel is white-first; there is no dark stage."
  },
  "ink": {
   "value": "#111111",
   "usage": "Figure lines, props, premise-card text. 18.9:1 on stage."
  },
  "ink-muted": {
   "value": "#5C5C5C",
   "usage": "Secondary text: taglines, captions, metadata. 6.7:1 on stage."
  },
  "grey": {
   "value": "#8A8A8A",
   "usage": "Steam, motion lines, timestamps inside phone UI. Not for body text (3.5:1)."
  },
  "frozen": {
   "value": "#B8B8B8",
   "usage": "Ink for frozen, ghost or background figures (03 pause-time, 08 extras). Never text."
  },
  "line-soft": {
   "value": "#E6E6E6",
   "usage": "Progress-bar track under corner labels, dividers."
  },
  "surface-soft": {
   "value": "#F4F4F4",
   "usage": "Incoming chat bubbles, open-door fill, web card hover."
  },
  "shadow-cast": {
   "value": "rgba(17,17,17,0.20)",
   "usage": "Cast shadows and silhouettes (01 shadow). Always flat, never blurred."
  },
  "dark-shot": {
   "value": "#141414",
   "usage": "The rare dark frame: sealed wall (02), peephole surround (10). Use for less than 5 s per video."
  }
 },
 "accent": {
  "red": {
   "value": "#E5322D",
   "usage": "The brand accent (logo hook). Episodes 01 08 09. Text at 24px+ only (4.35:1).",
   "episodes": [
    "01",
    "08",
    "09"
   ],
   "text": "large"
  },
  "blue": {
   "value": "#1F6FEB",
   "usage": "Numbers, thoughts, phone UI. Episodes 04 07 10. Text-safe (4.63:1).",
   "episodes": [
    "04",
    "07",
    "10"
   ],
   "text": "yes"
  },
  "green": {
   "value": "#2E9E5B",
   "usage": "Money. Episode 06. Text at 24px+ only (3.41:1).",
   "episodes": [
    "06"
   ],
   "text": "large"
  },
  "pink": {
   "value": "#E8508A",
   "usage": "Flowers. Episode 05. Text at 24px+ only (3.53:1).",
   "episodes": [
    "05"
   ],
   "text": "large"
  },
  "brick": {
   "value": "#B5462E",
   "usage": "Bricks. Episode 02. Text-safe (5.41:1).",
   "episodes": [
    "02"
   ],
   "text": "yes"
  },
  "yellow": {
   "value": "#F2B705",
   "usage": "Fill only (pause button, lamp light). Never text (1.82:1).",
   "episodes": [
    "03"
   ],
   "text": "no"
  },
  "amber": {
   "value": "#C98A00",
   "usage": "The 03 premise line. Below 3:1 (2.95:1): known exception, use ink or gold-text next time.",
   "episodes": [
    "03"
   ],
   "text": "no"
  },
  "gold-text": {
   "value": "#8A6200",
   "usage": "Text-safe partner for yellow episodes (5.49:1).",
   "episodes": [],
   "text": "yes"
  },
  "orange": {
   "value": "#F07C22",
   "usage": "Reserved. Fill only (2.76:1).",
   "episodes": [],
   "text": "no"
  },
  "tan": {
   "value": "#A8865A",
   "usage": "Cardboard (09 rocket). Prop colour, not an episode accent.",
   "episodes": [
    "09"
   ],
   "text": "no"
  }
 },
 "font": {
  "display": {
   "value": "\"InterTight\", \"Inter\", system-ui, sans-serif",
   "file": "assets/fonts/Inter-SemiBold.ttf",
   "weight": 600,
   "usage": "Headlines, premise cards, cover text: Inter 600, tracking −0.03em, sentence case (from hussnakhtr.com)."
  },
  "accent": {
   "value": "\"WIAccentSerif\", \"Instrument Serif\", Georgia, serif",
   "file": "assets/fonts/InstrumentSerif-Italic.ttf",
   "weight": 400,
   "style": "italic",
   "usage": "The accent phrase inside a headline: Instrument Serif italic at 1.07–1.12×, in the episode accent colour."
  },
  "mono": {
   "value": "\"WIMono\", \"JetBrains Mono\", ui-monospace, monospace",
   "file": "assets/fonts/JetBrainsMono-SemiBold.ttf",
   "weight": 600,
   "usage": "Labels: DAY 7, 8:00 AM, AGE 41. Uppercase, tracking +0.08em."
  },
  "ui": {
   "value": "\"Inter6\", \"Inter\", system-ui, sans-serif",
   "file": "assets/fonts/Inter-SemiBold.ttf",
   "weight": 600,
   "usage": "Speech and thought bubbles, phone messages, tags."
  },
  "text": {
   "value": "\"Inter4\", \"Inter\", system-ui, sans-serif",
   "file": "assets/fonts/Inter-Regular.ttf",
   "weight": 400,
   "usage": "Captions, phone timestamps, web body copy."
  },
  "hand": {
   "value": "\"Chalkboard SE\", \"Bradley Hand\", \"Comic Neue\", cursive",
   "file": null,
   "weight": 400,
   "usage": "Handwritten notes and signs in-world. macOS system font: not bundled."
  }
 },
 "type": {
  "premise": {
   "font": "display",
   "size": 118,
   "line": 1.12,
   "usage": "Premise card: Inter 600 sentence case + one accent line in Instrument Serif italic (\"What if your shadow / stopped copying you?\"). Auto-fits to 1060 units."
  },
  "cover": {
   "font": "display",
   "size": 150,
   "line": 1.08,
   "usage": "Cover text, ≤ 3 words: line 1 Inter 600, accent line Instrument Serif italic, white stroke 16%."
  },
  "label": {
   "font": "mono",
   "size": 96,
   "line": 1,
   "usage": "Corner labels in JetBrains Mono caps, tracked: DAY 7, AGE 41, 8:00 AM."
  },
  "countdown": {
   "font": "display",
   "size": 160,
   "line": 1,
   "usage": "Real-time counters (08)."
  },
  "bubble": {
   "font": "ui",
   "size": 46,
   "line": 1.25,
   "usage": "Speech and thought bubbles. Minimum 40."
  },
  "phone": {
   "font": "ui",
   "size": 40,
   "line": 1.3,
   "usage": "Chat messages inside the phone close-up."
  },
  "tag": {
   "font": "display",
   "size": 44,
   "line": 1,
   "usage": "Floating %, $ and counters above heads."
  },
  "caption": {
   "font": "text",
   "size": 26,
   "line": 1.3,
   "usage": "Phone timestamps and headers."
  },
  "hand": {
   "font": "hand",
   "size": 44,
   "line": 1.2,
   "usage": "In-world handwriting."
  },
  "web-display": {
   "font": "display",
   "size": 72,
   "line": 0.95,
   "usage": "Web: page heroes. px."
  },
  "web-title": {
   "font": "display",
   "size": 28,
   "line": 1.15,
   "usage": "Web: section and card titles. px."
  },
  "web-body": {
   "font": "text",
   "size": 17,
   "line": 1.55,
   "usage": "Web: running text. px."
  },
  "web-meta": {
   "font": "ui",
   "size": 13,
   "line": 1.4,
   "usage": "Web: labels and metadata, uppercase with 0.06em tracking. px."
  }
 },
 "space": {
  "1": {
   "value": "8px",
   "usage": "Inside tags and chips."
  },
  "2": {
   "value": "16px",
   "usage": "Gutter on phones; gap between related items."
  },
  "3": {
   "value": "24px",
   "usage": "Card padding."
  },
  "4": {
   "value": "40px",
   "usage": "Gap between groups."
  },
  "5": {
   "value": "64px",
   "usage": "Between page sections (the video kit's background grid pitch)."
  },
  "6": {
   "value": "112px",
   "usage": "Hero padding on desktop."
  }
 },
 "radius": {
  "bubble": {
   "value": "30px",
   "usage": "Speech bubbles (video units)."
  },
  "message": {
   "value": "34px",
   "usage": "Chat messages inside the phone (video units)."
  },
  "phone": {
   "value": "84px",
   "usage": "The phone body in close-ups (video units)."
  },
  "card": {
   "value": "18px",
   "usage": "Web cards and the episode tiles."
  },
  "pill": {
   "value": "999px",
   "usage": "Tags, the progress bar, buttons."
  }
 },
 "stroke": {
  "figure": {
   "value": "4.3",
   "usage": "Figure limbs at scale 1 (6 × 0.72). Thins as the figure scales past 1.3 so lines stay constant on screen."
  },
  "prop": {
   "value": "5",
   "usage": "Tables, doors, lamp posts."
  },
  "ground": {
   "value": "5",
   "usage": "The ground line at y = 1560."
  },
  "bubble": {
   "value": "4.5",
   "usage": "Bubble and tag outlines."
  },
  "mark": {
   "value": "15",
   "usage": "The logo's question-mark hook (200-unit box)."
  }
 },
 "stage": {
  "output-w": {
   "value": "1080px",
   "usage": "Rendered video width."
  },
  "output-h": {
   "value": "1920px",
   "usage": "Rendered video height."
  },
  "plane-w": {
   "value": "1280",
   "usage": "Design units across. All kit coordinates use this plane."
  },
  "plane-h": {
   "value": "2276",
   "usage": "Design units down (1280 × 16/9)."
  },
  "ground-y": {
   "value": "1560",
   "usage": "The floor line every figure stands on."
  },
  "safe-top": {
   "value": "260",
   "usage": "No important text above this (≈ 220 px): platform header."
  },
  "safe-bottom": {
   "value": "1730",
   "usage": "No important text below this (≈ 1460 px): caption, buttons, title UI."
  },
  "figure-full": {
   "value": "1.25",
   "usage": "Scale for a full-body figure; camera zoom 1.25–1.45 for one-figure shots."
  },
  "hand-up-y": {
   "value": "-540",
   "usage": "Local y for a raised hand. The shoulder is ~400 above ground; -300 reads as a flat arm."
  }
 },
 "motion": {
  "fps": {
   "value": "24",
   "usage": "Render rate. Every frame is drawn."
  },
  "twos": {
   "value": "83ms",
   "usage": "Pose updates at 12/s (twos(lt)): the hand-animated feel."
  },
  "pop": {
   "value": "150ms",
   "usage": "Cards, labels, tags and bubbles scale 0.94 → 1 with smoothstep."
  },
  "premise": {
   "value": "1300ms",
   "usage": "How long the premise card holds. Never more than 1500ms."
  },
  "hook": {
   "value": "2000ms",
   "usage": "The premise card must be on screen by this time."
  },
  "blink": {
   "value": "83ms",
   "usage": "Eyes closed for two frames."
  },
  "push-in": {
   "value": "3–6s",
   "usage": "Slow camera push of 5–15% over a shot."
  },
  "shake": {
   "value": "250ms",
   "usage": "Impact shake, 10–22 px, decaying."
  },
  "silence": {
   "value": "700–1500ms",
   "usage": "True silence before a payoff (bed('silence'))."
  },
  "ease": {
   "value": "cubic-bezier(0.45, 0, 0.55, 1)",
   "usage": "Web approximation of the kit's smoothstep."
  },
  "ease-pop": {
   "value": "cubic-bezier(0.34, 1.56, 0.64, 1)",
   "usage": "Web: pop-in with a little overshoot."
  }
 }
};
