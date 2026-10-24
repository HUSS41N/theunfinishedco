# WhatIfMan #1 — What If Your Phone Predicted Your Death?

**Tiny stickman. Massive consequences.**
60.000 s · 1080×1920 · 24 fps · `whatifman-01.mp4`

Rendered locally at $0. The frames are drawn in code (`src/render.mjs`), the narration is Kokoro `am_michael` (`src/narrate.py`) and every sound effect is synthesized (`src/sfx.py`). Run those three in order to rebuild the video, then mux it with the ffmpeg line at the end of this file.

---

## 0. The continuity fix (read this first)

The brief's numbers can't all be true on one clock. The phone says "59 seconds" at about 5 s, "48 left" is spoken at about 13 s, "five seconds left" at 37 s, and zero lands at 49 s. Following the brief's own rule ("revise the countdown values rather than showing impossible timing"), **zero is pinned to the moment the narrator says "Zero." (49.23 s)**. Every number the viewer sees or hears is computed from that point:

| Moment | Video time | Time left | What the viewer gets |
|---|---|---|---|
| First notification | 6.23 s | 43.0 s | "Your death is in **43 seconds**." |
| "Same message…" | 13.75 s | 35.5 s | spoken "**Thirty-six** seconds left", badge reads 0:36 |
| Entering the shelter | 37.40 s | 11.8 s | spoken "**Twelve** seconds left", badge turns red and pulses at 0:10 |
| Zero | 49.23 s | 0 | phone 0:00, ticking stops |
| Second prediction | 56.30 s | 60 s | "You have **60 seconds** remaining." Its clock is already at 0:57 when we cut to black |

A countdown badge (skull + m:ss) sits in the top-left safe area on every shot between the notification and zero. One tick sounds each time the displayed number changes.

---

## 1. Final narration (timestamps are the real audio)

Edits from the supplied text: "dumb" instead of "stupid"; "dodging literally everything" replaces "trying to escape literally everything" (shorter, and it carries the action); "right where he was about to step" replaces "right next to him" (it's scarier, and the storyboard shows it); the countdown numbers follow the table above.

| Time | Line |
|---|---|
| 0.35 | Bro, imagine you're just lying in bed, |
| 2.78 | doing absolutely nothing… |
| 4.46 | and your phone sends you this. |
| 7.10 | Obviously, he thinks it's some dumb prank. |
| 9.59 | He closes the app. |
| 11.14 | Opens it again. |
| 12.55 | Same message. |
| 13.75 | Thirty-six seconds left. |
| 15.47 | So he runs outside. |
| 17.10 | And literally one second later, |
| 18.85 | a flowerpot smashes into the ground |
| 21.02 | right where he was about to step. |
| 22.86 | Okay. |
| 23.87 | Not funny anymore. |
| 25.31 | Now he's running around like a maniac, |
| 27.72 | dodging literally everything. |
| 29.77 | Cars. |
| 30.89 | Buildings. |
| 32.09 | Other people. |
| 33.47 | Then he checks the phone again. |
| 37.40 | Twelve seconds left. |
| 38.96 | He hides in the safest place he can find. |
| 41.90 | Locks the door. |
| 43.29 | Sits down. |
| 44.56 | And just… waits. |
| 45.60–49.23 | *(no narration: breathing, heartbeat, ticks)* |
| 49.23 | Zero. |
| 51.09 | Nothing happens. |
| 52.87 | He starts laughing. |
| 54.81 | Then his phone buzzes again. |
| 56.30–60.00 | *(no narration: the notification speaks)* |

---

## 2. Storyboard (as rendered)

Every shot after the notification carries the countdown badge, except the phone close-ups, where the phone itself shows the time.

| # | Time | Shot / camera | Action | Background | Sound |
|---|---|---|---|---|---|
| 1A | 0.00–5.70 | Medium, slow push-in (1.3→1.55×), handheld | Reclined against the headboard, scrolling, foot bouncing; reaches into the chips bag and eats one | Night bedroom: moon in the window, lamp glow, "NO STRESS" poster, chips on the bed | Room tone, chip crunch |
| 1B | 5.70–6.25 | Close (1.9×) | The phone buzzes; he jerks upright with wide eyes and an O mouth | same | Vibration buzz |
| 1C | 6.25–8.40 | Phone close-up (ECU), slow push | The notification slides down: **UNKNOWN APP · now / "Your death is in 43 seconds."** A big red 0:43 starts counting | blank wall | Notification ping |
| 2A | 8.40–9.65 | Medium-close | Sits up and laughs nervously (shoulders bob, happy eyes); a sweat drop appears | bedroom | Breathy chuckles |
| 2B | 9.65–11.10 | Phone ECU | Thumb swipes the app away; the home screen appears | — | Swipe |
| 2C | 11.10–12.50 | Phone ECU | Thumb taps the black **?** icon; the notification is back with the live countdown | — | Tap, softer ping |
| 2D | 12.50–15.40 | Face close-up, push-in | Grin → flat → worried → wide-eyed with sweat (changes every 0.7 s) | bedroom (window, poster) | Ticking starts, quiet |
| 3A | 15.40–17.10 | Street, side tracking (1.3×) | Door opens and he runs out (run cycle) | Facades, balcony with **three** flowerpots, lamp posts | Door, footsteps, street bed |
| 3B | 17.10–19.00 | Wide enough for balcony and pavement | He slows, lifts the phone, freezes mid-step; a pot falls from the balcony with motion lines | same | Whoosh |
| 3C | 19.00–21.00 | Same, camera shake then push to 1.5× | **SMASH** where his foot was going to land; shards, soil and dust. He recoils, arms up | Balcony now has **two** pots | Impact, shards; the street bed ducks |
| 3D | 21.00–22.70 | Low angle up at the balcony (1.7×) | Nobody there; the curtain sways | — | near silence |
| 3E | 22.70–25.25 | Face close-up | Looks up, then at us: angry → worried → wide-eyed. "Okay. Not funny anymore." | street | — |
| 4A | 25.25–29.60 | Tracking run, handheld 6 px | Full panic sprint: flailing arms, shout mouth, sweat | Scrolling street | Footsteps, drone starts |
| 4B | 29.60–30.90 | Fixed, shake on the skid | Steps off the curb at a crosswalk; a blue car skids past, smoke and skid marks. He jerks back | Crosswalk | Skid, horn |
| 4C | 30.90–32.00 | Tracking | A window shutter bangs open above; he ducks and swerves | Facades | Bang |
| 4D | 32.00–33.20 | Fixed | A grey pedestrian with an umbrella (half transparent, an extra) walks toward him; he leaps away; the pedestrian looks baffled | Street | — |
| 4E | 33.20–34.60 | Low, push-in | Trips onto all fours, panting, pulls out the phone | Pavement | Thud, fast breathing |
| 4F | 34.60–37.30 | Phone ECU, vignette | Screen glitches red: **YOU CANNOT ESCAPE.** with the countdown under it | — | Glitch burst |
| 5A | 37.30–40.00 | Wide | Sprints to a grey **SHELTER** block and vanishes through the open steel door | Street end | Footsteps |
| 5B | 40.00–43.10 | Interior, dark, single swinging bulb | The door swings shut; he slides the bolt | Concrete shelter | Metal slam (41.10), bolt (42.18), hum |
| 5C | 43.10–45.60 | Push-in 1.35→1.75× | Slides down the wall to sit, knees up, phone in shaking hands | same | Scrape, breathing, heartbeat |
| 5D1 | 45.60–46.60 | Phone ECU | 0:04 → 0:03 | dark | Ticks get louder |
| 5D2 | 46.60–47.40 | Hands ECU | Trembling hands around the phone | dark | — |
| 5D3 | 47.40–48.20 | Eyes ECU | Eyes squeezed shut, gritted teeth, sweat | dark | Beds cut at 47.6 |
| 5D4 | 48.20–50.85 | Phone ECU, push | 0:01 → **0:00** on "Zero." | dark | Last tick, sub-bass thud, silence |
| 6B | 50.85–52.75 | Medium-close | Opens one eye, glances left and right, both eyes open | shelter | near silence |
| 6C | 52.75–54.75 | Medium-close | Head back, laughing with relief | shelter | Chuckles |
| 6D | 54.75–56.25 | Push-in 1.9→2.4× | The phone buzzes; his laugh stops and he looks down | shelter | Buzz (55.57) |
| 6E | 56.25–58.65 | Phone ECU | **UNKNOWN APP · now / "Prediction updated. You have 60 seconds remaining."** 1:00 starts counting | dark | Ping + low dissonant sting |
| 6F | 58.65–59.45 | Face close-up | The smile drains: flat, then wide-eyed and slack. Badge reads 0:58 → 0:57 | shelter | sting tail |
| 6G | 59.45–60.00 | — | **Cut to black** | — | silence |

---

## 3. Image-generation prompts (if you redo the art with an AI image model)

Use the same **character anchor** at the start of every prompt, and attach your approved character sheet as a reference image.

> **Anchor:** WhatIfMan, a slender hand-drawn stick figure: round white-filled head with a fine black pen outline, two short hair strands on top, solid black oval eyes, expressive eyebrows, single-line black torso and limbs, small white oval hands and feet, **red sneakers**. About 4.5 heads tall. Fine slightly wobbly black ink lines, flat colors, near-white paper background with a faint grid in daytime scenes. Minimal 2D explainer-cartoon style; no shading on the character. Vertical 9:16.

| # | Prompt (after the anchor) |
|---|---|
| Sheet | Character turnaround: front, side and back, neutral, plus six expressions: smug, nervous laugh, confused, terrified (open mouth, sweat), eyes squeezed shut, blank stare. White background. |
| 1A | Night bedroom, medium shot. WhatIfMan reclines against a wooden headboard on a bed with a pale blue blanket, scrolling a navy smartphone, red chips bag beside him; window with a crescent moon, warm lamp glow at left, yellow "NO STRESS" poster. Relaxed smile. |
| 1C | Extreme close-up of a smartphone held in a cartoon white hand. Dark lock screen with a white notification card: "UNKNOWN APP · now — Your death is in 43 seconds." Large red "0:43" with "TIME REMAINING" underneath. Crisp, correctly spelled text. |
| 2A | Same bedroom; WhatIfMan sits up on the bed laughing nervously, eyes closed in arcs, single sweat drop, phone in hand. |
| 2D | Close-up of WhatIfMan's face, worried brows, wavy mouth, wide eyes, sweat drop, bedroom softly behind him. |
| 3A | Side view of a city pavement: pastel facades with blue windows, wooden doors, lamp posts; a second-floor balcony with three terracotta flowerpots. WhatIfMan running out of a doorway. |
| 3C | Same street. A terracotta flowerpot shattering on the pavement just ahead of WhatIfMan: shards, soil, green leaves, dust puff. He recoils with arms up, eyes wide, mouth open. The balcony above now has two pots. |
| 3D | Low angle up at an empty second-floor balcony, a cream curtain blowing in the dark doorway, two flowerpots and a gap. Eerie stillness. |
| 4A | WhatIfMan sprinting in panic along the street, arms flailing, shouting, sweat flying. |
| 4B | Crosswalk; a blue cartoon car skids past right in front of WhatIfMan with tire smoke and black skid marks; he jerks backward, arms up. |
| 4D | WhatIfMan leaping sideways away from a calm grey stick-figure pedestrian holding a blue umbrella, who looks confused. |
| 4F | Phone close-up, glitching red-black screen: "YOU CANNOT ESCAPE." in large white letters with red/cyan chromatic offset, red countdown "0:15". |
| 5A | End of the street: a small grey concrete block labeled "SHELTER" with a heavy steel door and yellow-black hazard stripes. WhatIfMan running toward it. |
| 5C | Inside a dark concrete shelter lit by one swinging bare bulb. WhatIfMan sits against the wall, knees up, clutching his phone, terrified. Steel door with a slid bolt at left. |
| 5D | Extreme close-ups: (a) phone reading "0:03"; (b) two trembling white cartoon hands holding the phone; (c) WhatIfMan's eyes squeezed shut, teeth gritted, sweat. |
| 6C | Same shelter, WhatIfMan laughing with relief, head tilted back, big open grin. |
| 6E | Phone close-up: "UNKNOWN APP · now — Prediction updated. You have 60 seconds remaining." Red "1:00". |
| 6F | Close-up: WhatIfMan's face frozen, smile gone, wide eyes, blank mouth, dim bulb light. |

## 4. Image-to-video / animation prompts

Use these with any image-to-video tool, starting from the matching still. Keep clips under 5 s; the hand-drawn style survives short clips better.

| # | Movement and camera |
|---|---|
| 1A | Slow push-in. His thumb flicks the screen every half-second, one foot taps, he reaches into the chips bag and eats a chip. Hold the linework. |
| 1B | The phone vibrates. He snaps his head up toward it, eyes going wide. 0.5 s. |
| 1C | The notification card slides down from the top; the red counter ticks 0:43 → 0:41. Slight handheld drift. |
| 2A | He laughs: shoulders bob 3–4 times, then a sweat drop appears. |
| 2B/2C | The thumb swipes the app up and away, then taps the black "?" icon; the notification returns. |
| 2D | Slow push-in on his face as the grin fades to worry. No other motion. |
| 3A | Camera tracks right as he bursts out of the door and runs. |
| 3B→3C | He slows and raises the phone, one foot mid-step. The pot falls from the top of frame and smashes where that foot would land. 4-frame camera shake, then he jumps back. |
| 3D | Very slow tilt up to the balcony. Only the curtain moves. |
| 4A | Fast tracking run with handheld shake. Panic flails, no camera zooms. |
| 4B | Fixed camera. The car enters fast from the right, skids past within a foot of him; smoke drifts. |
| 4C–4D | Two quick beats: shutter bang → duck; pedestrian → leap away. |
| 4E | He trips and lands on all fours, chest heaving; he pulls out the phone. |
| 4F | The screen glitches at 12 fps with chromatic jitter; slow push-in. |
| 5A | He sprints into the shelter doorway and disappears into the dark. |
| 5B | The heavy door swings shut; his hand slides the bolt. The bulb sways. |
| 5C | He slides down the wall to sit; camera slowly pushes in. |
| 5D | Static extreme close-ups, trembling only. Countdown 4, 3, 2, 1, 0. |
| 6B–6D | One eye opens, glances around; a laugh with head thrown back; the phone buzzes; the laugh stops dead. |
| 6E–6F | The notification slides in; cut to his face as the smile drains; hard cut to black. |

---

## 5. Editing timeline: sound, music and on-screen text

**Beds:** room tone 0–15.4 · street 15.4–40.0 · drone (two detuned low sines, swelling) 25.2–47.6 · shelter hum 40.0–47.6 and 50.9–56.2 · fast breathing 33.3–35.2 · slow nervous breathing 43.2–49.1 · heartbeat 44.6–49.15. Beds duck about 5 dB under the narration.

**Hits:** buzz 5.72 · ping 6.23 · swipe 10.0 · tap and ping 11.45 · door 15.42 · whoosh 18.45 · **smash 19.00** · skid 29.75 + horn 29.90 · shutter bang 31.10 · thud 33.45 · glitch 34.62 · **steel slam 41.10** · bolt 42.18 · scrape 43.15 · zero thud 49.23 · buzz 55.57 · **ping + sting 56.30** · footsteps on every run-cycle contact.

**Ticks:** one per displayed-second change from 14.23 to 48.23, rising from soft to loud, then three on the new countdown (57.3–59.3).

**Silence:** everything but breathing, heartbeat and ticks drops out at 47.6. After "Zero." the mix sits around −36 dB. The last 0.55 s (black) is digital silence.

**Music:** none beyond the drone, which is deliberate: the ticks are the score.

**On-screen text:** phone screens (1C, 2B–2C, 4F, 5D, 6E), the countdown badge (top-left), and burned-in captions at 72% height. Captions are white-stroked dark text in light scenes and inverted in dark ones, kept clear of the Shorts/Reels bottom UI and the right-hand button column. Separate subtitle file: `build/captions.srt`.

**Transitions:** hard cuts only. Danger beats are 0.5–1.3 s; suspense shots are 2–4 s.

---

## 6. Continuity checklist

- [x] **Character:** same head size, two hair strands, black oval eyes and red sneakers in every full-body shot (`guy()` is the only way the figure is drawn). The pedestrian has no red shoes and is semi-transparent, so they never read as him.
- [x] **Countdown:** all values computed from `zero = 49.233`; spoken numbers re-checked against the display after synthesis (36 at 13.75 s, 12 at 37.40 s).
- [x] **Badge:** visible on every non-phone shot from 8.4 s to zero; red and pulsing at 10 s or less; hidden after zero until the new countdown.
- [x] **Flowerpots:** balcony shows three pots before 18.45 s and two afterward, including the 3D look-up shot.
- [x] **Phone:** same navy phone, same lock-screen time (11:42), same "UNKNOWN APP" black "?" icon in every close-up.
- [x] **Shelter:** door closed and bolted from 42.2 s onward; bulb keeps swinging; he stays sitting in the same spot through the twist.
- [x] **Logic:** the first notification arrives before he knows anything; danger escalates pot → car → shutter → crowd → "YOU CANNOT ESCAPE"; zero resolves the countdown; the update reopens it with a new 60-second clock that is already running when we cut.
- [x] **Spelling:** every screen string checked: "Your death is in 43 seconds." / "YOU CANNOT ESCAPE." / "Prediction updated. You have 60 seconds remaining." / "TIME REMAINING" / "SHELTER".
- [ ] **Human review:** watch on a phone with sound. Automated checks can't judge timing feel or whether the Kokoro voice sells "Bro".

---

## 7. YouTube Shorts

**Title:** What If Your Phone Predicted Your Death?
*(alternatives: "My Phone Said I Had 43 Seconds Left" · "This App Knows When You'll Die")*

**Description:**
> One notification. 43 seconds. No way to turn it off.
> What would you do if your phone knew exactly when you'd die?
>
> WhatIfMan — tiny stickman, massive consequences.
>
> #whatif #stickman #shorts #animation #creepy #thriller #storytime #plottwist #scary #animatedshort

## 8. Instagram Reels

**Caption:**
> Your phone just gave you 43 seconds. 📱⏳
> He did everything right… and it still wasn't enough.
> What would YOU have done with 43 seconds? 👇
>
> #whatif #stickmananimation #animation #creepystories #shortfilm #plottwist #thrillerstory #reels #animatedreels #darkcomedy #storytime

---

## 9. Thumbnail

`thumbnail-9x16.png` (Shorts cover) and `thumbnail-16x9.png` (feed/grid). WhatIfMan's terrified face (wide eyes, open mouth, two sweat drops) beside a tilted phone glowing red with **0:03 / TIME REMAINING**, on a dark vignette. The headline is hand-lettered: "YOUR PHONE / PREDICTS / **YOUR DEATH**" (vertical) or "IT KNOWS / **WHEN.**" (horizontal). It shows the moment of peak dread without spoiling the twist.

---

### Rebuild

```bash
cd ~/dev/stickman-videos/whatifman-01
~/dev/masked-and-undefined/tools/.venv/bin/python -I src/narrate.py .        # voice + timing.json (am_michael; pass another voice as arg 2)
node src/render.mjs                                                          # frames -> build/video.mp4 + events.json + captions.srt
~/dev/masked-and-undefined/tools/.venv/bin/python -I src/sfx.py .            # sound design -> build/mix.wav
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart whatifman-01.mp4
node src/render.mjs --stills 19.1,49.5                                       # spot-check frames without a full render
```
