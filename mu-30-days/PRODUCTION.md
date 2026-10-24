# Masked & Undefined — What If You Disappeared From the Internet for 30 Days?

34.5 s · 1080×1920 · 24 fps · no voice-over · `mu-30-days.mp4` (rendered locally, $0)
Rebuild: `node src/render.mjs && python -I src/sfx.py . && ffmpeg -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -shortest mu-30-days.mp4`

**One story fix.** Sam sends the message on **day 2** (the phone shows "28 days ago") and is the friend who knocks on **day 15**. The visit becomes the follow-up to an unanswered text, so the day-30 message lands as "this person noticed the whole time" instead of contradicting the visit.

## 1. Shot-by-shot script

| # | Time | Shot | What happens |
|---|---|---|---|
| 01 | 0.00–0.85 | Full figure, centre, static | Frame 1: he's already glitching. His body breaks into navy and blue pixel blocks from the head down and drifts upward; the phone stays whole |
| 02 | 0.85–1.35 | Low, floor level | The phone falls through empty white and clatters onto the floor; the screen stays lit |
| 03 | 1.35–2.15 | Full-screen feed | Two columns of posts race upward, hearts float, "+99 / +1.2K" badges pop. One card passes: dashed empty avatar, "account inactive", ♡ 0. Nobody stops |
| 04 | 2.15–3.45 | Title card, slow 4% push | **WHAT IF YOU / DISAPPEARED / FOR 30 DAYS?** |
| 05 | 3.45–5.45 | Medium, table with drawer | DAY 1. Looks at the phone, switches it off (screen goes dark), opens the drawer, puts it in, shuts it |
| 06 | 5.45–7.70 | Medium, slow push | Sits back, arms folded, waiting. Clock ticks. Nothing. At 6.75 his head snaps to the drawer; a faint blue line pulses at the drawer edge |
| 07 | 7.70–8.90 | Tracking walk | DAY 7. Walks alone, head down; his hand reaches for the empty pocket out of habit |
| 08 | 8.90–10.00 | Medium, table | Glances at the empty spot by his plate, then eats |
| 09 | 10.00–11.20 | Medium, window | Birds outside; his head lifts, posture opens, a small smile |
| 10 | 11.20–12.50 | Wide, horizon | Sits on the ground leaning back on his hands, watching the sun go down (the only warm colour in the film) |
| 11 | 12.50–13.75 | Medium, room | DAY 15. Two knocks; the door jolts; his head turns |
| 12 | 13.75–15.10 | Doorway | Door opens: Sam (blue scarf) holds two steaming coffees and raises one; he startles |
| 13 | 15.10–18.50 | Two-shot, slow push 1.2→1.42× | They sit with coffees; Sam gestures mid-story; at 16.3 he laughs for the first time (head back, shoulders bob) |
| 14 | 18.50–19.70 | Medium, table | DAY 30. Opens the drawer, takes the phone, powers it on; the screen glows |
| 15 | 19.70–22.10 | Phone close-up | Notifications stack faster and faster: group chats (214 new), trends, likes, "You missed 48 posts", counter climbs to 999+ |
| 16 | 22.10–23.30 | Face close-up | Curious → wide-eyed → overwhelmed; he leans back from the glow |
| 17 | 23.30–24.45 | Phone close-up | Thumb flicks the feed in a blur |
| 18 | 24.45–26.70 | Phone close-up, push-in | Everything stops. One message: **Sam · 28 days ago — "Hey. You disappeared. Are you okay?"** At 25.65 a blue underline traces it (he rereads) |
| 19 | 26.70–28.30 | Medium-close | Eyes move across the text twice; shoulders drop; a small smile |
| 20 | 28.30–29.60 | Medium-close | Taps, lifts the phone to his ear; it rings twice |
| 21 | 29.60–31.00 | Medium-close | Sam, somewhere white, sees the phone buzz, answers, grins |
| 22 | 31.00–34.50 | Wide, slow pull-out | He walks out of the doorway into open white, still on the call; the door and floor fade away. The final line builds one row at a time |

## 2. Visual-generation prompts (each one stands alone)

Every prompt starts with the character block from section 6. Add "vertical 9:16, clean off-white background #FEFEFA, thin navy #020A1D lines, flat, no shading, no texture" to each.

- **01** — The stickman standing centred, holding a phone, his body disintegrating into small square pixels from the head down; navy and electric-blue pixel squares drift upward; the phone remains intact.
- **02** — Empty white space; a smartphone mid-fall, tilted, screen lit pale blue; a thin floor line below.
- **03** — A dense two-column social feed filling the frame: white rounded post cards with round avatars, tiny stick-figure post images, blue hearts and "+99" badges; one card has a dashed empty avatar labelled "account inactive".
- **04** — Typography only: "WHAT IF YOU / DISAPPEARED / FOR 30 DAYS?" in heavy Inter Tight; the last line in electric blue.
- **05** — The stickman beside a simple table with a drawer, putting a switched-off phone into the open drawer.
- **06** — The stickman seated on a simple chair beside the table, arms folded, head turned sharply toward the closed drawer.
- **07** — The stickman walking alone on a bare floor line, head down, hand half-reaching toward his pocket.
- **08** — The stickman seated at a table with one plate, glancing at the empty spot beside it.
- **09** — The stickman at a four-pane window, two small birds outside, head lifted, relaxed.
- **10** — The stickman sitting on the ground leaning back on his hands, a half-set sun on the horizon, pale warm gradient sky.
- **11** — A plain door at left, the stickman seated at a table turning toward the door; small knock marks.
- **12** — An open doorway: a second identical stickman with a blue scarf holding two steaming coffee cups; the main stickman startled.
- **13** — Both stickmen seated at a small table with coffee cups; the main one laughing with his head tipped back.
- **14** — The stickman taking a glowing phone out of an open drawer.
- **15** — Close-up of a phone screen overflowing with stacked notifications: "Group chat · Weekend plans — 214 new messages", "Trending now", "You missed 48 posts", badge "999+".
- **16** — Close-up of the stickman's round head, wide eyes, small open mouth, lit from below by pale blue screen glow.
- **17** — Close-up of a thumb flicking a motion-blurred feed on a phone.
- **18** — Close-up of a calm phone screen: one message from "Sam" (avatar with a blue scarf), "28 days ago", in a light-blue bubble: "Hey. You disappeared. Are you okay?"
- **19** — The stickman standing still, reading his phone, shoulders relaxed, slight smile.
- **20** — The stickman lifting the phone to his ear, smiling.
- **21** — The scarf stickman answering a phone call, grinning.
- **22** — Wide off-white space; the stickman small at lower centre, walking away from a fading doorway, phone at ear; the final text block above.

## 3. Camera and animation

- **Opening (01–04):** a cut every 0.5–1.3 s. Locked camera on 01 so the pixels do the moving; a fast-feed scroll (≈2,600 px/s) on 03; a hard cut to the title.
- **Days 1–7:** handheld drift of 1–2 px, slow push-ins (≈10% over a shot). Character animation carries the change: hunched, head-down walk and phantom pocket reach → head lifting at the window → leaning back at the sunset.
- **Day 15:** knock-jolt on the door (4 px for 0.1 s), a startle (lean back 0.12 rad), then a 3.4 s push-in left to breathe. The laugh is shoulder bob on twos.
- **Day 30:** the notification flood accelerates (rows arrive on a power curve); slight camera tremble grows from 2 to 6 px; a 1.15 s blur scroll.
- **Twist:** dead stop. Slow push on the message, a reread underline, a two-beat eye scan, a 6 px shoulder drop.
- **Final:** slow pull-out (1.0 → 0.94×) while he walks 120 px/s out of the doorway; the doorway fades over 1.4 s.

## 4. Sound and music cues

| Time | Cue |
|---|---|
| 0.00 | Hard digital glitch (stuttered square tones + gated noise) |
| 1.12 | Phone clatter, then silence |
| 1.35 | Feed whoosh with a rapid run of muted pings |
| 2.15 | Sub thump on the title cut, then silence |
| 3.45–7.70 | Room tone |
| 3.84 / 4.22 / 5.00 | Power-off blip / drawer slide / **drawer shut** |
| 5.85, 6.85 | Two wall-clock ticks: the wait is audible |
| 7.70 | Music begins: sparse felt-piano notes over a soft pad (Cmaj7 → Am → Fmaj7 → G), warming from day 15 |
| 7.85 / 9.62 / 10.00 | Footsteps / fork clink / birds |
| 12.75, 12.95 | Two knocks |
| 13.85 / 15.35 | Door creak / cups set down |
| 19.40 | Music fades out |
| 19.20 | Power-on chime |
| 19.70–24.40 | Notification pings, accelerating; swipe ticks during the scroll |
| **24.45–26.00** | **Total silence** while the message appears |
| 26.90 | Warm resolution: Fmaj7 → C(add9) with a few piano notes |
| 28.52 / 28.95, 29.45 / 29.92 | Tap / two ring tones / pickup click |
| 34.50 | Music has settled; clean end |

## 5. On-screen text

Brand type is Inter Tight 700 in navy `#020A1D`, with the electric-blue `#0573FE` accent used once per card.
- **Title (2.15–3.45):** centred, 128 design-px (≈108 px at 1080 wide), three lines; "FOR 30 DAYS?" in blue.
- **Day labels:** "DAY 1", "DAY 7", "DAY 15", "DAY 30". Top-left at x 96, y≈300 (≈253 px), 104 design-px. A 0.16 s pop-in, with a thin progress bar beneath filling to 1/30, 7/30, 15/30 and 30/30.
- **Phone UI:** Inter 600/400 at 28–42 px, correctly spelled: "Hey. You disappeared." / "Are you okay?" / "Sam" / "28 days ago".
- **Final (31.5–34.5):** "MAYBE BEING / **REMEMBERED** / ISN'T THE SAME AS / BEING SEEN." Centred, 92 design-px, one line every 0.28 s, "REMEMBERED" in blue. It sits at y≈350–700 px, clear of the Reels/Shorts UI (nothing important below ≈1460 px).

## 6. Character consistency block (paste into every generation prompt)

> **The main character:** a minimalist stickman with a perfectly round head (white fill, thin navy outline), two small solid navy oval eyes, a single-line mouth, no hair, no clothes, no accessories. One straight navy line for the torso; thin single-line arms and legs; small white oval hands and feet with thin outlines. About 4.5 heads tall, slender. Line weight is identical on the head, body and limbs, thin and even. Emotion comes from head angle, posture and timing; faces stay minimal (no eyebrows, no cheeks).
> **Sam (secondary):** identical build and line weight, plus one electric-blue `#0573FE` scarf. Never give the main character any colour.
> **World:** off-white `#FEFEFA`, navy lines, at most one accent colour per shot (electric blue for the online world and Sam; a single pale warm sunset in shot 10). Props are line drawings only: phone, table with drawer, chair, door, window, cups.

## 7. Cover frame

`cover-9x16.png`. **Prompt:** "The minimalist stickman (character block above) mid-disintegration: legs and torso still solid, head and shoulders breaking into navy and electric-blue pixel squares drifting upward, a pale-blue phone still in his hand. Off-white background. Huge Inter Tight headline at the top: '30 DAYS.' in navy over 'GONE.' in electric blue. Vertical 9:16, flat, no texture."

## 8. Caption and hashtags

> Thousands kept scrolling.
> One person noticed.
>
> #whatif #stickmananimation #digitaldetox #animatedshort #socialmedia #MaskedAndUndefined
