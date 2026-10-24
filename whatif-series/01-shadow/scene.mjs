// What If #01 — What if your shadow stopped copying you?   (36 s, silent)
import path from 'node:path';
import {D, shot, run, guy, silhouette, bg, floor, lampPost, card, kf, step, ease, lerp, clamp, twos, mix, walk, runCycle as runPose,
  at, bed, music, STAND, INK, WHITE, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const RED = ACCENTS.red, SHADE = 'rgba(17,17,17,0.20)';
const LAMP = 1180;
// a shadow is the same pose, thrown onto the wall behind: shifted left, a bit larger, skewed away from the lamp
const shadow = (ctx, x, s, p, opts = {}) => silhouette(ctx, x - 380, GROUND - 6, s * 1.12, p, opts.color || SHADE, {skewX: -0.14, flip: opts.flip});
const wave = (t, on = 1) => ({...STAND, rh: [110 + Math.sin(t * 14) * 40 * on, -560 * on - 105 * (1 - on)], elbow: [1, 1]});
function street(ctx) { bg(ctx); floor(ctx, -600, 2400); lampPost(ctx, LAMP); }

// S1 0–1.8: he waves at someone off-screen; his shadow doesn't — it has turned to look at him
shot(0, 1.8, (ctx, lt, t) => {
  street(ctx);
  shadow(ctx, 640, 1.25, {...STAND, lh: [-60, -110], rh: [60, -110]}, {flip: true});
  guy(ctx, 640, GROUND, 1.25, wave(t), {gx: 0.7, mouth: 'smile'});
}, {cam: lt => ({z: 1.35, fx: 520, fy: 1220}), hand: 1});
// S2 1.8–3.1: premise card
shot(1.8, 3.1, (ctx, lt) => { bg(ctx); at(1.8 + lt, 1.8, 'cut'); card(ctx, [['WHAT IF YOUR SHADOW', INK], ['STOPPED', INK], ['COPYING YOU?', RED]], {lt, size: 104}); });
// S3 3.1–8.0: the shadow is one second late — then stops copying at all
const myPose = lt => kf([[0, {...STAND}], [0.3, {...STAND}], [0.6, {...STAND, rh: [70, -560], elbow: [1, 1]}], [1.3, {...STAND, rh: [70, -560], elbow: [1, 1]}],
  [1.6, {...STAND}], [2.2, {...STAND, hip: [0, -200], lf: [-60, 0], rf: [60, 0]}], [2.35, {...STAND, hip: [0, -300], lf: [-40, -80], rf: [40, -80], lh: [-120, -520], rh: [120, -520]}], [2.55, {...STAND}],
  [3.4, {...STAND}]], lt);
shot(3.1, 8.0, (ctx, lt, t) => {
  street(ctx);
  const late = lt < 3.4 ? myPose(Math.max(0, twos(lt) - 1.0)) : kf([[3.4, {...STAND}], [4.0, {...STAND, lean: -0.05, lh: [-70, -110], rh: [70, -110]}]], lt);
  shadow(ctx, 640, 1.25, late, {flip: lt > 4.0});
  const T = twos(lt), laugh = lt > 2.8 && lt < 3.9, bob = laugh ? Math.abs(Math.sin(T * 12)) * 10 : 0;
  guy(ctx, 640, GROUND, 1.25, laugh ? {...STAND, hip: [0, -223 - bob * 0.4], headLean: -0.15, lh: [-30, -150], rh: [40, -150], elbow: [1, -1]} : myPose(T),
    {gx: lt > 0.5 ? -0.8 : 0.3, mouth: laugh ? 'grin' : lt > 4.0 ? 'O' : 'flat', eyes: laugh ? 'happy' : lt > 4.0 ? 'wide' : undefined});
  at(t, 3.75, 'pop', 0.4); at(t, 5.45, 'thud', 0.4); at(t, 7.1, 'hit', 0.7);
}, {cam: lt => ({z: lerp(1.3, 1.45, ease(lt / 4.9)), fx: 470, fy: 1230}), hand: 1});
// S4 8.0–11.5: the shadow peels off and walks away along the wall; he follows
shot(8.0, 11.5, (ctx, lt, t) => {
  street(ctx); const T = twos(lt);
  const sx = 640 - ease(lt / 3.5) * 900; // the shadow walks left on its own
  silhouette(ctx, sx - 380, GROUND - 6, 1.25 * 1.12, walk(T * 1.5), SHADE, {skewX: -0.14, flip: true});
  const go = lt > 1.4;
  guy(ctx, go ? 640 - (lt - 1.4) * 260 : 640, GROUND, 1.25, go ? walk(T * 1.5, {lean: 0.06}) : {...STAND, lh: [-60, -120], rh: [60, -120]}, {gx: 0.8, mouth: 'O', eyes: 'wide'}, {flip: true});
  if (lt > 1.4) for (const k of [0, 1, 2, 3]) at(t, 9.6 + k * 0.33, 'step', 0.4);
}, {cam: lt => ({z: 1.15, fx: lerp(560, 260, ease(lt / 3.5)), fy: 1230}), hand: 1.5});
// S5 11.5–19.5: bus stop — his shadow does what he won't: says hello to hers
const BUS = 900, HER = 1180;
shot(11.5, 19.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); lampPost(ctx, 1500);
  D.line(ctx, [[BUS - 250, GROUND], [BUS - 250, GROUND - 620]], {w: 6}); D.rect(ctx, BUS - 330, GROUND - 720, 160, 110, {fill: WHITE, w: 5}); D.text(ctx, 'BUS', BUS - 250, GROUND - 665, {size: 44, font: 'InterTight', color: INK});
  const T = twos(lt);
  // shadows on the wall: his leans over, waves; hers waves back; they hold hands, then leave together
  const hisS = kf([[0, {...STAND}], [1.4, {...STAND}], [1.8, {...STAND, lean: 0.25, rh: [110, -540], elbow: [1, 1]}], [2.6, {...STAND, lean: 0.25, rh: [110, -540], elbow: [1, 1]}],
    [3.4, {...STAND, lean: 0.1, rh: [130, -150]}], [6.0, {...STAND, lean: 0.1, rh: [130, -150]}]], T);
  const herS = kf([[0, {...STAND}], [2.3, {...STAND}], [2.7, {...STAND, lh: [-110, -540], elbow: [1, 1]}], [3.3, {...STAND, lh: [-130, -150]}], [6.0, {...STAND, lh: [-130, -150]}]], T);
  const close = ease((lt - 3.0) / 1.2) * 160, leave = ease((lt - 6.2) / 1.6) * 1200;
  if (lt < 6.2) { silhouette(ctx, BUS - 380 + close * 0.5 - leave, GROUND - 6, 1.4, hisS, SHADE, {skewX: -0.14}); silhouette(ctx, HER - 380 - close * 0.5 - leave, GROUND - 6, 1.4, herS, SHADE, {skewX: -0.14, flip: true}); }
  else for (const [x, f] of [[BUS - 300, false], [HER - 460, true]]) silhouette(ctx, x - leave, GROUND - 6, 1.4, walk(T * 1.6), SHADE, {skewX: -0.14, flip: true});
  // the real people: he stares at the wall, she reads her phone and never notices
  guy(ctx, BUS, GROUND, 1.25, {...STAND, headLean: lt > 1.6 ? -0.25 : 0.05, lh: [-60, -110], rh: [60, -110]}, {gx: lt > 1.6 ? -0.6 : 0.6, gy: lt > 1.6 ? -0.5 : 0, mouth: lt > 3.2 ? 'O' : 'flat', eyes: lt > 3.2 ? 'wide' : undefined});
  guy(ctx, HER, GROUND, 1.25, {...STAND, headLean: 0.3, lh: [70, -170], rh: [90, -175], elbow: [1, 1]}, {gx: 0.4, gy: 0.8, mouth: 'flat'},
    {flip: true, accent: {kind: 'scarf', color: RED}, after: (c, j) => { c.save(); c.translate(j.rh[0] + 6, j.rh[1] - 26); c.fillStyle = INK; c.fillRect(-20, -36, 40, 72); c.restore(); }});
  at(t, 13.3, 'pop', 0.35); at(t, 14.2, 'pop', 0.35); at(t, 15.6, 'chime', 0.5);
}, {cam: lt => ({z: lerp(1.0, 1.08, lt / 8), fx: 960, fy: 1230}), hand: 1.2});
// S6 19.5–24.5: he chases them; at the corner his shadow stops, turns, and offers its hand
shot(19.5, 24.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); D.line(ctx, [[1240, GROUND], [1240, GROUND - 1300]], {w: 6}); // the corner
  const T = twos(lt), x = Math.min(860, 200 + lt * 330), arrived = lt > 2.0;
  const offer = ease((lt - 2.6) / 0.6), take = ease((lt - 4.0) / 0.4);
  silhouette(ctx, 1100, GROUND - 6, 1.4, kf([[0, walk(T * 1.6)], [1.8, {...STAND}], [2.6, {...STAND}], [3.2, {...STAND, lh: [-175, -380], elbow: [1, -1]}]], lt), SHADE, {skewX: -0.14, flip: true});
  guy(ctx, x, GROUND, 1.25, arrived ? {...STAND, lean: -0.05, rh: mix([60, -110], [175, -380], take)} : runPose(T * 2.6, {lean: 0.25}), {gx: 0.8, mouth: take > 0.5 ? 'flat' : arrived ? 'O' : 'shout', eyes: arrived ? 'wide' : undefined});
  if (!arrived) for (const k of [0, 1, 2, 3, 4]) at(t, 19.6 + k * 0.38, 'step', 0.5);
  at(t, 23.9, 'click', 0.6);
}, {cam: lt => ({z: lerp(1.15, 1.45, ease((lt - 1.5) / 3)), fx: lerp(700, 980, ease((lt - 1.5) / 3)), fy: 1220}), hand: 1.2});
// S7 24.5–26.0: the lamp flickers out
shot(24.5, 26.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  silhouette(ctx, 1100, GROUND - 6, 1.4, {...STAND, lh: [-175, -380], elbow: [1, -1]}, SHADE, {skewX: -0.14, flip: true});
  guy(ctx, 860, GROUND, 1.25, {...STAND, rh: [175, -380]}, {gx: 0.8, mouth: 'flat', eyes: 'wide'});
  at(t, 24.6, 'buzz', 0.5); at(t, 25.3, 'hit', 0.8);
}, {cam: () => ({z: 1.45, fx: 980, fy: 1220}), black: lt => (lt > 0.1 && lt < 0.18) || (lt > 0.35 && lt < 0.5) || lt > 0.75 ? 1 : 0});
// S8 26.0–32.5: light returns. The shadow is the one standing in the street now — with her. He is on the wall.
shot(26.0, 32.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); lampPost(ctx, 1500);
  const T = twos(lt), leave = ease((lt - 3.6) / 2.8) * 900;
  silhouette(ctx, 700 - 380, GROUND - 6, 1.4, {...STAND, lh: [-60, -110], rh: [60, -110]}, SHADE, {skewX: -0.14}); // the old him, flat on the wall
  const walking = lt > 3.6;
  guy(ctx, 860 + leave, GROUND, 1.25, walking ? walk(T * 1.5, {rh: [110, -120]}) : {...STAND, rh: [120, -130], lh: [-70, -110]}, {gx: lt < 2.4 ? -0.9 : 0.6, mouth: 'grin'});
  guy(ctx, 1080 + leave, GROUND, 1.25, walking ? walk(T * 1.5 + 0.5, {lh: [-110, -120]}) : {...STAND, lh: [-120, -130], rh: [70, -110]}, {gx: 0.6, mouth: 'smile'}, {flip: true, accent: {kind: 'scarf', color: RED}});
  at(t, 26.05, 'unfreeze', 0.5); if (walking) for (const k of [0, 1, 2, 3, 4, 5, 6]) at(t, 29.7 + k * 0.4, 'step', 0.3);
}, {cam: lt => ({z: lerp(1.1, 1.0, ease(lt / 6)), fx: 800, fy: 1230}), hand: 1});
// S9 32.5–36.0: the shadow on the wall raises a hand to wave — one second late, to nobody
shot(32.5, 36.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  const up = ease((lt - 1.0) / 0.6), w = up > 0.9 ? Math.sin((lt - 1.6) * 9) * 22 : 0;
  silhouette(ctx, 440, GROUND - 6, 1.4, {...STAND, lh: [-60, -110], rh: [70 + w, lerp(-110, -560, up)], elbow: [1, up > 0.5 ? 1 : -1]}, SHADE, {skewX: -0.14});
}, {cam: lt => ({z: lerp(1.5, 1.62, lt / 3.5), fx: 300, fy: 1150}), hand: 0.8});

bed('street', 0, 1.8); bed('street', 3.1, 24.5, 0.8); bed('silence', 25.3, 26.0);
music('eerie', 8.0, 24.4, 1); music('tender', 26.2, 32.4, 0.8); bed('silence', 32.5, 33.3);
await run({dir: DIR, duration: 36.0});
