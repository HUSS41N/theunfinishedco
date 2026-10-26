# 100 YouTube keywords for theunfinishedco. "*" = the exact phrase appeared in YouTube search autocomplete
# (suggestqueries.google.com, ds=yt) on 25 Oct 2026. Autocomplete shows what people type, not how often.
CORE = ["what if*", "what if animation stories*", "what if scenario*", "what if stories", "what if animation", "what if shorts",
        "what if questions", "what if videos", "theunfinishedco", "the unfinished co", "unfinished stories", "stories still being drawn"]
STYLE = ["stickman animation*", "stickman story*", "stickman story animation*", "stickman animation story*", "stickman animation love story*",
         "funny stickman animation*", "funny stickman shorts*", "stick figure animation", "stickman shorts", "silent animation*",
         "silent animated short film*", "silent animation shorts*", "mute animated short film*", "animation shorts*", "animation short film*",
         "short story animation*", "animated story shorts*", "animated short story*"]
THEME = ["hypothetical questions*", "hypothetical scenarios", "thought experiments*", "thought experiments philosophy*", "philosophical thought experiments*",
         "plot twist animation*", "plot twist story", "emotional animation*", "emotional animated short*", "sad animation story*",
         "relatable animation*", "relatable animation shorts*", "short animated films*", "cartoon story shorts*", "sci-fi short story",
         "psychological twist", "eerie animation", "wholesome animation", "time travel animation", "no dialogue animation"]
EPISODES = {
 "01 · What If Your Shadow Got Tired of You?": ["what if your shadow came alive", "shadow animation", "shadow came alive", "shy guy love story", "bus stop love story"],
 "02 · What If Every Lie Added a Brick?": ["what if every lie added a brick", "lying animation", "white lies", "honesty animation", "people pleaser"],
 "03 · What If You Could Pause Time?": ["what if you could pause time*", "what if you could stop time*", "what if you could freeze time*", "time freeze story", "pause time animation"],
 "04 · What If You Could See How Much People Like You?": ["what if you could see how much people like you", "like meter", "social anxiety animation", "self love animation", "what people think of you"],
 "05 · What If Your Steps Grew Flowers?": ["what if steps grew flowers", "flower trail", "footsteps love story", "same route every day", "routine animation"],
 "06 · What If Every Word Cost Money?": ["what if every word cost money", "words cost money", "i love you animation", "mom love story", "hospital story animation"],
 "07 · What If Your Thoughts Were Public?": ["what if your thoughts were public", "what if boss could hear your thoughts*", "job interview animation", "imposter syndrome animation", "thought bubbles"],
 "08 · What If Gravity Took a 10-Second Break?": ["what if gravity disappeared*", "what if gravity stopped for 10 seconds", "zero gravity animation", "gravity turned off", "hero saves baby"],
 "09 · What If You Met Yourself at Age 8?": ["what if you met your younger self", "what if you meet your future self*", "inner child animation", "childhood dreams", "letter to my younger self"],
 "10 · What If You Got a Text From Yourself?": ["what if you got a text from your future self", "text from future self", "future self message", "time travel text", "creepy text story"],
}
allk = CORE + STYLE + THEME + [k for v in EPISODES.values() for k in v]
assert len(allk) == 100, len(allk); assert len({k.rstrip('*') for k in allk}) == 100, 'duplicates'
clean = lambda k: k.rstrip('*')
def block(words, limit=500):   # YouTube tag field: comma separated, ≤ 500 chars (third-party figure; keep under it)
    out = []
    for w in words:
        if len(', '.join(out + [clean(w)])) <= limit: out.append(clean(w))
    return ', '.join(out)
def chan(words, limit=500):    # channel keywords field: comma separated, like tags (no quotes)
    return block(words, limit)
md = ["# YouTube keywords: theunfinishedco", "",
      "100 keywords: channel, style, theme, and five per Series 2 episode (video context). `*` = the exact phrase appeared",
      "in YouTube's search autocomplete on 25 Oct 2026; autocomplete shows what people type, not how many.", "",
      "> YouTube says the title, thumbnail and description matter more than tags; tags mostly help with misspellings, and",
      "> excessive tags break its spam policy. Use these mainly to word titles and descriptions; tags are a bonus.", ""]
n = 0
for name, group in [("Channel and series", CORE), ("Style and format", STYLE), ("Themes and genre", THEME)]:
    md += [f"## {name}", ""] + [f"{(n := n + 1)}. {k}" for k in group] + [""]
md += ["## Video context (five per episode)", ""]
for ep, ks in EPISODES.items():
    md += [f"**{ep}**", ""] + [f"{(n := n + 1)}. {k}" for k in ks] + [""]
CHANNEL = ["what if*", "what if animation stories*", "what if scenario*", "what if stories", "theunfinishedco", "unfinished stories",
           "stickman animation*", "stickman story animation*", "funny stickman shorts*", "silent animated short film*", "silent animation shorts*",
           "animation shorts*", "short story animation*", "hypothetical questions*", "thought experiments*", "plot twist animation*",
           "emotional animated short*", "relatable animation shorts*", "what if you could pause time*", "what if gravity disappeared*", "what if you meet your future self*"]
md += ["## Paste blocks", "", "**Channel keywords** (Studio → Settings → Channel → Basic info → Keywords; ≤ 500 characters):", "", "```", chan(CHANNEL), "```", ""]
base = ["what if*", "what if animation stories*", "stickman animation*", "stickman story animation*", "silent animated short film*", "animation shorts*", "theunfinishedco"]
for ep, ks in EPISODES.items():
    md += [f"**Tags · {ep}** (≤ 500 characters):", "", "```", block(ks + base + THEME[:6]), "```", ""]
open('youtube-keywords.md', 'w').write('\n'.join(md) + '\n')
c = chan(CHANNEL); print('channel block chars', len(c), 'kept', c.count(', ') + 1, 'of', len(CHANNEL))
for ep, ks in EPISODES.items(): print(ep[:2], 'tags chars', len(block(ks + base + THEME[:6])))
print('autocomplete-confirmed:', sum(k.endswith('*') for k in allk))
