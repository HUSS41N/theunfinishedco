---
name: smooth-2d-motion
description: >-
  Make code-generated 2D animation (SVG, canvas or JSON-keyframed characters rendered frame by frame) move
  smoothly instead of janky. Covers why frames boil or shake, interpolation that doesn't stop at every key,
  overlapping action, blending actions in and out, walks with planted feet, free-moving joints, camera
  motion, transitions, motion blur, and how to verify by eye. Use when animation "looks janky", "shakes",
  "isn't smooth", when joints look stiff or broken, when building or fixing a keyframe/rig engine, or when
  authoring motion for the whatif-flat engine.
---

# Smooth motion for code-rendered 2D animation

These lessons come from fixing real complaints on a 24 fps stick-figure and flat-vector series ("the whole
camera shakes whenever something moves", "joints don't move freely", "the movement is janky").
Engine-specific fields for whatif-flat are in its `docs/SCENE-FORMAT.md` (Motion section).

## What causes jank, and the fix for each

| symptom | cause we found | fix |
|---|---|---|
| The whole picture shimmers or "shakes" when anything moves | A hand-drawn line wobble drawn from **one shared random stream per frame**: any change in what gets drawn shifts the stream, so every line re-wobbles | No per-frame randomness. Make every procedural value a pure function of (element id, t), or use clean lines. |
| Constant low-level drift | Default "handheld" camera noise | Off by default; move the camera only on purpose. |
| Choppy limbs | Poses stepped "on twos" (12 fps) | Interpolate every frame at 24 fps. |
| Robotic pose → stop → pose | Smoothstep easing on **every segment**, so the velocity is zero at every key | A spline through the keys (monotone cubic Hermite, so no overshoot): ease in at the first key, ease out at the last, continuous velocity in between. Keep explicit eases where the author asks. |
| Everything arrives at once | All joints share one time | **Overlapping action**: sample parts at small delays. Body at t, head t−0.04, upper arm t−0.03, forearm t−0.07, wrist t−0.10 (seconds). |
| Arms teleport when an action starts or ends | Actions replace the pose instantly | Every action blends in and out (0.2 s; 0.45 s for big arm moves such as a wave or a reach). |
| Feet slide while walking | Travel is linear while the legs cycle at a fixed rate | Derive the step rate from distance ÷ stride, ease the travel in and out, plant the stance foot with two-bone IK, and bob the body twice per cycle. |
| Random jitter on "tremble" or "shake" | sin(t·61) or sin(t·83) at 24 fps **aliases** (above Nyquist, 12 Hz) | Every oscillation under ~5 Hz: a smooth noise sum of low sines with an attack/decay envelope. Keep shake amplitude ≤ 8–10 px. |
| A held item or a new message appears early | Object/list keys merged new fields at the START of the move | Fields and list items new in the next key appear AT that key. |
| A mirror flip pops | Facing flipped instantly | Squash to ~half width through the turn and lead with the face. |

## Joints that move freely (cutout rig)

- **Forward kinematics** with angles: 0° = hanging down, positive = outward. Each joint adds to its parent:
  shoulder → elbow → wrist, hip → knee → ankle.
- **Shoulder and hip "ball" caps** in the sleeve or trouser colour, so a raised (160°) or crossed arm shows no
  gap or lump.
- **Limbs drawn as one smooth stroke through the joints**, a gentle bezier at the elbow and knee. Shade
  strokes are offset per segment, mitred inside the bend and arced outside, so there's no kink.
- **Wrists rotate the hand and held props. Ankles keep the foot flat while planted**, then follow the shin
  once lifted.
- **The head pivots at the neck base**, with a little neck stretch, not around the face centre. Also allow a
  torso bend.
- **Two-bone IK** (`reach: [x, y]`) for hands and feet. Elbows bend down and out, knees forward, and
  unreachable targets straighten toward the target.
- **Test with a contact grid of 30+ extreme poses** at 2× zoom: cheer, reach up, arms crossed, kneel, run,
  jump, lie down. Fix every seam.
- **Unflip text on held props** when the body is mirrored; otherwise signs read backwards.

## Life without jitter

- **Idle by default:** breathing (scale ≤ 1%), a slow weight shift, head drift and blinks, all under 0.5 Hz.
  Still characters feel alive and never vibrate.
- **Mouth flaps while a speech bubble is up**, but never on frozen or silent characters.

## Camera and transitions

- The camera is a spline through keys, with slow pushes (≤ 1.5%/s). Use shake only on real impacts, amp ≤ 8,
  decaying over ≤ 0.4 s.
- **Real-scale world, camera zoom for wide shots:** don't shrink the actors. A 0.4–0.7 zoom shows the place,
  1.0 a medium, 1.4–2.2 a face.
- Transitions add energy at scene changes: push, whip (with directional motion blur), crossfade, zoom, iris,
  fade or dip, and fade-to-black-and-hold. Hard cuts are still right for comic timing and endings.
- **Motion blur:** average 3 subframes across a half-frame shutter. Only on fast moves; elsewhere it
  costs 3× and ghosts.

## Verify by eye (never claim smooth without looking)

1. A contact sheet (1 frame/s) for staging.
2. **12 consecutive frames** (a strip) of the busiest beats: walks, waves, pose changes, transitions. Check
   for pops, snaps, sliding feet, double images and frames that jump back.
3. An onion skin of a walk cycle: the stance foot must hold the same x for several frames.
4. Extract the strips from the **final MP4** (`ffmpeg -vf select`), not just from stills, so you catch
   encode, blur and transition problems.

## Performance notes (resvg / SVG engines)

- **Each `clip-path` costs a full-frame mask** in resvg (one was 800 ms/frame). Pre-clip shading geometry
  (polygon ∩ convex region) instead of clipping each part.
- **Prefix ids per build or shot.** The set's ids and the character's ids collided once, and an eye's pupil
  was clipped by a cinema seat 400 px away.
- **resvg panics on translucent or clipped groups entirely off-canvas** at high zoom. Pre-blend colours
  instead of group opacity, and add a guarded retry.
