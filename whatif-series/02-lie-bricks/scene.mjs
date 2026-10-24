// What If #02 — What if every lie built a wall?   (35 s, silent)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, label, bubble, txt, rr, table, chair, phoneSmall, kf, step, ease, lerp, clamp, twos, hash,
  at, bed, music, STAND, SEATED, INK, WHITE, GREY, LIGHT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const BRICK = '#B5462E';                              // the one accent: bricks only
const CAP = {kind: 'cap', color: '#FFFFFF'};           // the friend: white cap keeps brick red the only colour
const BW = 104, BH = 48, FALL = 0.24;

// ---------------- the wall ----------------
// pieces in build order; even rows 5 bricks, odd rows 6 (offset half a brick, ragged ends). Row 0 starts in the middle.
const PIECES = [];
for (let r = 0; r < 16; r++) {
  const xs = r % 2 === 0 ? [0, 1, 2, 3, 4].map(i => i * BW) : [-52, 52, 156, 260, 364, 468];
  const order = r === 0 ? [2, 1, 3, 0, 4] : r % 4 === 1 ? xs.map((_, i) => i) : xs.map((_, i) => xs.length - 1 - i);
  for (const i of order) PIECES.push({r, x: xs[i]});
}
const rowsCount = R => PIECES.filter(p => p.r < R).length;
// drop times: schedule = [[time, uptoCount, duration]]
function plan(schedule) {
  const T = new Array(PIECES.length).fill(Infinity); let n = 0;
  for (const [t, upto, dur] of schedule) { const k = upto - n; for (let i = 0; i < k; i++) T[n + i] = t + (k > 1 ? dur * i / (k - 1) : 0); n = upto; }
  return T;
}
const MAIN = plan([[3.9, 1, 0], [6.1, rowsCount(1), 0.25], [8.25, rowsCount(2), 0.25], [10.0, rowsCount(3) + 8, 0.35], [10.5, rowsCount(6), 0.45],
  [11.3, rowsCount(11), 4.4], [19.5, rowsCount(15), 0.85]]);
const OPEN = plan([[-5, rowsCount(12) - 1, 0], [0.62, rowsCount(12), 0]]);
// draw the wall centred on cx. skip(i) → hide piece i (holes)
function wall(ctx, cx, t, T, {skip, dark = false} = {}) {
  const x0 = cx - 260;
  PIECES.forEach((p, i) => {
    if (skip && skip(i)) return;
    const land = T[i]; if (t < land - FALL) return;
    const k = clamp((t - (land - FALL)) / FALL), dy = -230 * (1 - k * k), wob = k < 1 ? (hash(i) - 0.5) * 0.25 * (1 - k) : 0;
    const x = x0 + p.x, y = GROUND - (p.r + 1) * BH + dy;
    ctx.save(); ctx.translate(x + BW / 2, y + BH / 2); ctx.rotate(wob);
    D.rect(ctx, -BW / 2, -BH / 2, BW, BH, {fill: dark ? '#1c1c1c' : BRICK, w: 4, color: dark ? '#2e2e2e' : INK, amp: 0.5});
    ctx.restore();
  });
}
const brickAt = (ctx, x, y, rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); D.rect(ctx, -BW / 2, -BH / 2, BW, BH, {fill: BRICK, w: 4, amp: 0.5}); ctx.restore(); };

// ---------------- life ----------------
const blink = (t, off = 0) => ((t + off) % 3.3) < 2 / 24;
const breathe = (p, t, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(t * 2.4) * a]});
const lies = t => step([[0, 0], [3.95, 1], [6.15, 2], [8.3, 3], [10.0, 5], [10.5, 7], [11.4, 8], [12.2, 9], [13.0, 10], [13.8, 11], [14.6, 12], [15.4, 13], [20.3, 14]], t);
const lieTimes = [3.95, 6.15, 8.3, 10.0, 10.5, 11.4, 12.2, 13.0, 13.8, 14.6, 15.4, 20.3];
function overlay(clock, clockAt) {
  return (ctx, lt, t) => {
    if (clock) label(ctx, clock, {lt: t - clockAt, size: 84, y: 300});
    const n = lies(t), since = t - Math.max(...lieTimes.filter(x => x <= t), -9), pop = 1 + 0.25 * Math.max(0, 1 - since / 0.25);
    ctx.save(); ctx.translate(1184, 300); ctx.scale(pop, pop); txt(ctx, `LIES: ${n}`, 0, 0, 84, INK, 'InterTight', 'right'); ctx.restore();
  };
}
const thumb = (c, j) => D.line(c, [[j.rh[0] + 2, j.rh[1] - 6], [j.rh[0] + 4, j.rh[1] - 34]], {w: 7});

// S1 0–1.5: only his eyes over a brick wall; the last brick drops into the top row
shot(0, 1.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx);
  const T = twos(lt);
  guy(ctx, 640, GROUND, 1.31, breathe(STAND, t, 1), {gx: T < 0.7 ? -0.5 : 0.5, gy: T < 0.7 ? 0.2 : -0.6, mouth: 'flat', eyes: lt > 1.1 && lt < 1.19 ? 'closed' : undefined});
  wall(ctx, 640, t, OPEN);
  at(t, 0.62, 'brick', 0.9); at(t, 0.66, 'thud', 0.4);
}, {cam: lt => ({z: lerp(1.42, 1.5, lt / 1.5), fx: 640, fy: 1060}), hand: 0.8, shake: lt => lt > 0.62 && lt < 0.8 ? 4 : 0});

// S2 1.5–2.8: premise card
shot(1.5, 2.8, (ctx, lt) => { bg(ctx); at(1.5 + lt, 1.5, 'cut'); card(ctx, [['WHAT IF EVERY LIE', INK], ['BUILT A WALL?', BRICK]], {lt, size: 104}); });

// S3 2.8–5.0: friend's new haircut — "LOVE IT!"; a brick lands at his feet
shot(2.8, 5.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  // friend touches his new hair, proud
  const fr = kf([[0, {...STAND, lh: [40, -480], elbow: [1, -1]}], [0.6, {...STAND, lh: [30, -500], elbow: [1, -1]}], [1.0, {...STAND, lh: [-60, -110]}]], T);
  guy(ctx, 880, GROUND, 1.25, breathe(fr, t + 1), {gx: 0.6, mouth: 'grin', eyes: lt < 0.9 ? 'happy' : undefined}, {flip: true, accent: CAP});
  // he looks, pauses (anticipation), then thumbs up + big fake smile
  const me = kf([[0, STAND], [0.5, {...STAND, lean: -0.04}], [0.75, {...STAND, lean: 0.06, rh: [120, -470], elbow: [1, 1]}], [2.2, {...STAND, lean: 0.06, rh: [120, -470], elbow: [1, 1]}]], T);
  guy(ctx, 470, GROUND, 1.25, breathe(me, t), {gx: 0.7, gy: lt < 0.5 ? -0.5 : 0, mouth: lt < 0.6 ? 'flat' : 'grin', eyes: blink(t) ? 'closed' : undefined}, {after: lt > 0.75 ? thumb : null});
  if (lt > 0.7) bubble(ctx, 400, 760, ['LOVE IT!'], {size: 50, tx: 460, ty: 870});
  wall(ctx, 470, t, MAIN);
  at(t, 3.5, 'pop', 0.5); at(t, 3.9, 'brick', 0.8);
}, {cam: lt => ({z: lerp(1.12, 1.18, lt / 2.2), fx: 660, fy: 1190}), hand: 1, overlay: overlay('8:00 AM', 2.8)});

// S4 5.0–7.0: in bed, phone to ear: "ON MY WAY!"
shot(5.0, 7.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  // bed: frame + mattress + pillow, he sits up in it
  D.rect(ctx, 300, 1380, 700, 70, {fill: WHITE, w: 6}); D.line(ctx, [[300, 1450], [300, GROUND]], {w: 6}); D.line(ctx, [[1000, 1450], [1000, GROUND]], {w: 6});
  D.line(ctx, [[300, 1220], [300, 1380]], {w: 7}); D.ellipse(ctx, 360, 1350, 60, 28, {fill: WHITE, w: 5});
  const me = {hip: [0, -205], lean: -0.12 + Math.sin(t * 2.2) * 0.02, headLean: 0.05, lf: [215, -188], rf: [235, -190], knee: [-1, -1], footDir: [1, 1],
    lh: [60, -260], rh: [30, -440], elbow: [1, 1]};
  guy(ctx, 450, 1380 + 205 * 1.2 - 12, 1.2, me, {gx: -0.4, gy: -0.3, mouth: T % 0.5 < 0.25 ? 'shout' : 'grin', eyes: lt > 1.6 && lt < 1.69 ? 'closed' : 'squint'},
    {after: (c, j) => phoneSmall(c, j.rh[0] + 14, j.rh[1] - 10, -0.3, 0.9, true, LIGHT)});
  // blanket over his legs
  D.poly(ctx, [[470, 1385], [700, 1330], [780, 1385]], {fill: WHITE, w: 5});
  bubble(ctx, 560, 930, ['ON MY WAY!'], {size: 50, tx: 500, ty: 1040});
  wall(ctx, 460, t, MAIN);
  at(t, 5.25, 'pop', 0.5); at(t, 6.1, 'brick', 0.8);
}, {cam: lt => ({z: lerp(1.28, 1.34, lt / 2), fx: 620, fy: 1200}), hand: 1, overlay: overlay('8:40 AM', 5.0)});

// S5 7.0–9.0: laptop — ☑ "I have read the terms."
shot(7.0, 9.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  chair(ctx, 540); table(ctx, 730, {w: 470});
  // monitor facing us
  D.line(ctx, [[1000, 1250], [1000, 1200]], {w: 7}); D.line(ctx, [[940, 1250], [1060, 1250]], {w: 7});
  rr(ctx, 780, 950, 440, 250, 18, WHITE, INK, 6);
  const ticked = lt > 0.9;
  D.rect(ctx, 806, 1032, 42, 42, {w: 5});
  if (ticked) D.line(ctx, [[814, 1052], [826, 1066], [844, 1036]], {w: 6});
  txt(ctx, 'I have read', 864, 1036, 40, INK, 'Inter6', 'left'); txt(ctx, 'the terms.', 864, 1082, 40, INK, 'Inter6', 'left');
  rr(ctx, 1066, 1140, 130, 42, 12, ticked ? INK : LIGHT); txt(ctx, 'AGREE', 1131, 1162, 24, WHITE, 'InterTight');
  const reach = kf([[0, 0], [0.45, 0], [0.8, 1], [1.2, 1], [1.6, 0.4]], T);
  const me = {...SEATED, lean: 0.05 + reach * 0.12, rh: [lerp(100, 230, reach), lerp(-200, -270, reach)], lh: [80, -200]};
  guy(ctx, 540, GROUND, 1.25, me, {gx: 0.8, gy: -0.3, mouth: lt > 1.0 ? 'smile' : 'flat', eyes: lt < 0.9 ? 'squint' : blink(t) ? 'closed' : undefined});
  // mouse under his hand
  D.ellipse(ctx, 540 + 1.25 * lerp(100, 230, reach) + 6, 1238, 22, 12, {fill: WHITE, w: 4});
  wall(ctx, 540, t, MAIN);
  at(t, 7.9, 'click', 0.9); at(t, 8.25, 'brick', 0.8);
}, {cam: lt => ({z: lerp(1.22, 1.27, lt / 2), fx: 770, fy: 1170}), hand: 0.8, overlay: overlay('9:15 AM', 7.0)});

// S6 9.0–11.0: meeting — "GREAT IDEA!"; bricks reach his waist
shot(9.0, 11.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  // whiteboard with a chart going down
  D.rect(ctx, 780, 860, 400, 280, {fill: WHITE, w: 6}); D.line(ctx, [[820, 900], [820, 1100], [1140, 1100]], {w: 4});
  D.line(ctx, [[830, 940], [920, 990], [1000, 960], [1080, 1060], [1130, 1090]], {w: 5});
  D.line(ctx, [[880, 1140], [860, GROUND]], {w: 5}); D.line(ctx, [[1080, 1140], [1100, GROUND]], {w: 5});
  // coworker points at the board, eager
  const pt = kf([[0, {...STAND, rh: [-60, -110]}], [0.3, {...STAND, lh: [-170, -420], elbow: [1, 1]}]], T);
  guy(ctx, 1110, GROUND, 1.2, breathe({...pt, lh: [-170 + Math.sin(T * 9) * 10, -420]}, t), {gx: -0.6, mouth: 'grin'}, {flip: true});
  const me = kf([[0, STAND], [0.4, {...STAND, lean: -0.03}], [0.7, {...STAND, lean: 0.05, lh: [-30, -300], rh: [60, -300], elbow: [1, -1]}],
    [0.9, {...STAND, lean: 0.05, lh: [-20, -320], rh: [50, -320], elbow: [1, -1]}], [1.1, {...STAND, lean: 0.05, lh: [-30, -300], rh: [60, -300], elbow: [1, -1]}]], T);
  guy(ctx, 470, GROUND, 1.25, breathe(me, t), {gx: 0.8, gy: -0.2, mouth: lt > 0.6 ? 'grin' : 'flat', eyes: lt > 0.6 ? 'happy' : undefined});
  if (lt > 0.6) bubble(ctx, 420, 760, ['GREAT IDEA!'], {size: 50, tx: 470, ty: 870});
  wall(ctx, 470, t, MAIN);
  at(t, 9.6, 'pop', 0.5); at(t, 10.0, 'brick', 0.8); at(t, 10.5, 'brick', 0.8);
}, {cam: lt => ({z: lerp(1.12, 1.18, lt / 2), fx: 700, fy: 1180}), hand: 1, overlay: overlay('11:30 AM', 9.0)});

// S7 11.0–16.0: montage — nods, smiles, thumbs-up to whoever is there; the wall climbs to his neck
shot(11.0, 16.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt), k = Math.floor(lt / 0.8), ph = lt - k * 0.8, right = k % 2 === 0;
  // someone different on each side, every beat
  const ox = right ? 1110 : 170, kind = k % 3;
  guy(ctx, ox, GROUND, 1.2, breathe({...STAND, ...(kind === 1 ? {rh: [80, -380], elbow: [1, 1]} : kind === 2 ? {lh: [-40, -330], rh: [50, -330]} : {})}, t + k),
    {gx: 0.7, mouth: ['O', 'smile', 'flat'][kind], eyes: kind === 2 ? 'squint' : undefined}, {flip: right, accent: undefined});
  const gest = k % 3; // 0 nod, 1 thumbs-up, 2 big smile + shrug
  const nod = gest === 0 ? Math.sin(ph * 16) * 0.12 : 0;
  const pose = gest === 1 ? {...STAND, rh: [120, -480], elbow: [1, 1]} : gest === 2 ? {...STAND, lh: [-150, -420], rh: [150, -420], elbow: [-1, 1]} : STAND;
  guy(ctx, 640, GROUND, 1.25, breathe({...pose, headLean: nod}, t), {gx: 0.8, mouth: gest === 1 ? 'grin' : 'smile', eyes: gest === 2 ? 'happy' : undefined},
    {flip: !right, after: gest === 1 ? thumb : null});
  wall(ctx, 640, t, MAIN);
  for (let i = 0; i < 12; i++) at(t, 11.4 + i * 0.4, 'brick', 0.45);
  for (let i = 0; i < 6; i++) at(t, 11.05 + i * 0.8, 'pop', 0.25);
}, {cam: lt => ({z: lerp(1.15, 1.32, ease(lt / 5)), fx: 640, fy: lerp(1220, 1120, ease(lt / 5))}), hand: 1.4, overlay: overlay(null)});

// S8 16.0–21.0: the friend knocks: "ARE YOU OKAY?" — "I'M FINE." — the last bricks seal him in
shot(16.0, 21.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  const knock = lt > 0.2 && lt < 1.1 ? Math.max(0, Math.sin((lt - 0.2) * 22)) : 0;
  guy(ctx, 210, GROUND, 1.25, breathe({...STAND, lean: 0.05, rh: [130 + knock * 30, -330], elbow: [1, 1]}, t), {gx: 0.7, gy: -0.3, mouth: lt > 3.6 ? 'O' : 'frown', eyes: lt > 3.6 ? 'wide' : undefined}, {accent: CAP});
  // he's behind the wall, only the head shows; he turns, forces a smile
  guy(ctx, 680, GROUND, 1.25, breathe({...STAND, headLean: lt > 2.2 && lt < 3.6 ? -0.08 : 0}, t, 2), {gx: -0.7, mouth: lt > 2.3 && lt < 3.4 ? 'grin' : 'flat', eyes: lt > 2.3 && lt < 3.4 ? 'happy' : blink(t) ? 'closed' : undefined}, {flip: true});
  wall(ctx, 680, t, MAIN);
  if (lt > 0.6 && lt < 3.4) bubble(ctx, 250, 720, ['ARE YOU OKAY?'], {size: 48, tx: 230, ty: 850});
  if (lt > 2.3 && lt < 3.5) bubble(ctx, 720, 760, ["I'M FINE."], {size: 52, tx: 680, ty: 880});
  for (const k of [0, 1, 2]) at(t, 16.3 + k * 0.28, 'knock', 0.8);
  at(t, 16.65, 'pop', 0.3); at(t, 18.3, 'pop', 0.3);
  for (let i = 0; i < 6; i++) at(t, 19.5 + i * 0.15, 'brick', 0.5);
  at(t, 20.3, 'brick', 1); at(t, 20.32, 'thud', 0.8);
}, {cam: lt => ({z: lerp(1.15, 1.32, ease((lt - 3.2) / 1.6)), fx: lerp(460, 640, ease((lt - 3.2) / 1.6)), fy: lerp(1180, 1080, ease((lt - 3.2) / 1.6))}), hand: 1,
  overlay: overlay(null), black: lt => lt > 4.35 ? 1 : 0, shake: lt => lt > 4.3 && lt < 4.45 ? 5 : 0});

// inside the sealed wall: bricks in the dark, him dim — and later a shaft of light from one gap
const HOLE = {x: 744, y: 744};
function inside(ctx, lt, t, light, drawGuy) {
  bg(ctx, '#050505');
  for (let r = 0; r < 30; r++) for (let i = -1; i < 10; i++) {
    const x = 120 + i * BW + (r % 2) * 52, y = GROUND - (r + 1) * BH;
    if (light > 0 && Math.abs(x - HOLE.x) < 2 && Math.abs(y - HOLE.y) < 30) continue;
    D.rect(ctx, x, y, BW, BH, {fill: '#0d0d0d', w: 3, color: '#262626', amp: 0.4});
  }
  D.line(ctx, [[-400, GROUND], [1700, GROUND]], {w: 4, color: '#222'});
  ctx.save(); ctx.globalAlpha = 0.16; drawGuy(); ctx.restore();
  if (light > 0) {
    const shaft = [[HOLE.x, HOLE.y], [HOLE.x + BW, HOLE.y], [HOLE.x + 60, GROUND + 40], [120, GROUND + 40]];
    ctx.save(); ctx.globalAlpha = light; ctx.beginPath(); shaft.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#F4F4F4'; ctx.fillRect(-400, 0, 2400, 2400); D.line(ctx, [[-400, GROUND], [1700, GROUND]], {w: 5}); drawGuy(); ctx.restore();
    ctx.save(); ctx.globalAlpha = light; ctx.fillStyle = WHITE; ctx.fillRect(HOLE.x, HOLE.y, BW, BH); ctx.restore();
  }
}

// S9 21.0–25.0: darkness; a small "No."
shot(21.0, 25.0, (ctx, lt, t) => {
  const g = () => guy(ctx, 660, GROUND, 1.3, breathe({...STAND, headLean: 0.25, lean: 0.03, lh: [-30, -120], rh: [40, -120]}, t, 1.5), {gx: 0.2, gy: 0.8, mouth: 'frown', eyes: 'closed'});
  inside(ctx, lt, t, 0, g);
  if (lt > 1.4) { ctx.save(); ctx.globalAlpha = ease((lt - 1.4) / 0.3); bubble(ctx, 800, 760, ['No.'], {size: 56, tx: 720, ty: 880}); ctx.restore(); }
  at(t, 23.3, 'heart', 0.8);
}, {cam: lt => ({z: lerp(1.3, 1.42, lt / 4), fx: 640, fy: 1060}), hand: 0.6, black: lt => clamp(1 - lt / 1.2) * 0.9});

// S10 25.0–29.0: one brick falls out; light; the friend's hand reaches in
shot(25.0, 29.0, (ctx, lt, t) => {
  const T = twos(lt), light = ease((lt - 0.25) / 0.6);
  const up = ease((T - 1.2) / 0.8), reach = ease((T - 2.0) / 1.4);
  const g = () => guy(ctx, 660, GROUND, 1.3, breathe({...STAND, headLean: lerp(0.25, -0.25, up), lh: [-30, -120], rh: mix2([40, -120], [95, -540], reach), elbow: [1, 1]}, t, 1.5),
    {gx: lerp(0.2, 0.6, up), gy: lerp(0.8, -0.8, up), mouth: reach > 0.5 ? 'O' : 'flat', eyes: up > 0.4 ? 'wide' : 'closed'});
  inside(ctx, lt, t, light, g);
  // the brick tumbles in and down
  if (lt < 1.4) { const k = clamp(lt / 0.9); brickAt(ctx, HOLE.x + BW / 2 - 140 * k, HOLE.y + BH / 2 + 700 * k * k, k * 2.4); }
  else brickAt(ctx, HOLE.x + BW / 2 - 140, GROUND - BH / 2 + 2, 0.08);
  // the friend's arm comes through the gap
  const arm = ease((lt - 2.2) / 1.2);
  if (arm > 0) { const hx = HOLE.x + 70 - 40 * arm, hy = HOLE.y + 30 + 70 * arm; D.line(ctx, [[HOLE.x + 120, HOLE.y + 20], [hx, hy]], {w: 7}); D.ellipse(ctx, hx - 6, hy + 2, 13, 10, {fill: WHITE, w: 5, rot: 2.6}); }
  at(t, 25.3, 'crumble', 0.8); at(t, 25.95, 'thud', 0.4);
}, {cam: lt => ({z: lerp(1.42, 1.3, ease(lt / 4)), fx: lerp(640, 690, ease(lt / 4)), fy: lerp(1060, 1080, ease(lt / 4))}), hand: 0.8});
const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// S11 29.0–35.0: outside: their hands clasp through the hole; the top of the wall starts to fall
const OUT = plan([[-5, rowsCount(15), 0]]);
const HOLE_I = PIECES.findIndex(p => p.r === 11 && p.x === 52);
const TOP = PIECES.map((p, i) => i).filter(i => PIECES[i].r >= 12);
shot(29.0, 35.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  const hp = PIECES[HOLE_I], hx = 640 - 260 + hp.x, hy = GROUND - (hp.r + 1) * BH;
  // him, behind the wall, reaching into the hole
  guy(ctx, 640, GROUND, 1.25, breathe({...STAND, rh: [125, -430], elbow: [1, 1], headLean: -0.1}, t, 1.5), {gx: 0.6, gy: 0.3, mouth: lt > 3.6 ? 'smile' : 'flat', eyes: blink(t, 1) ? 'closed' : undefined}, {flip: true});
  // the wall, minus the hole and the falling top bricks
  const fallT = i => 30.6 + (TOP.indexOf(i) % 9) * 0.32 + Math.floor(TOP.indexOf(i) / 9) * 0.7 + hash(i) * 0.15;
  wall(ctx, 640, t, OUT, {skip: i => i === HOLE_I || (TOP.includes(i) && t > fallT(i))});
  ctx.fillStyle = '#111'; ctx.fillRect(hx + 2, hy + 2, BW - 4, BH - 4);
  for (const i of TOP) {
    const ft = fallT(i); if (t <= ft || t > ft + 1.6) continue;
    const p = PIECES[i], k = t - ft, x0 = 380 + p.x + BW / 2, y0 = GROUND - (p.r + 1) * BH + BH / 2, dir = p.x < 200 ? -1 : 1;
    const y = Math.min(GROUND - BH / 2, y0 + 1400 * k * k), x = x0 + dir * (90 * k + 40);
    brickAt(ctx, x, y, y < GROUND - BH / 2 ? dir * k * 3 : dir * 0.15);
  }
  // fallen bricks resting on the ground
  TOP.forEach(i => { if (t > fallT(i) + 1.6) { const p = PIECES[i], dir = p.x < 200 ? -1 : 1; brickAt(ctx, 380 + p.x + BW / 2 + dir * (90 * 1.6 + 40), GROUND - BH / 2, dir * 0.15); } });
  // the friend, reaching in; his hand comes out to meet it
  const clasp = ease((T - 0.3) / 0.8);
  guy(ctx, 280, GROUND, 1.25, breathe({...STAND, lean: 0.04, rh: [lerp(130, 165, clasp), lerp(-380, -440, clasp)], elbow: [1, 1]}, t), {gx: 0.7, gy: -0.3, mouth: lt > 1.3 ? 'smile' : 'O', eyes: blink(t, 2) ? 'closed' : undefined}, {accent: CAP});
  D.ellipse(ctx, hx + 30 - 10 * clasp, hy + 26, 13, 10, {fill: WHITE, w: 5});
  at(t, 29.4, 'clink', 0.25);
  at(t, 30.6, 'crumble', 0.7); at(t, 31.4, 'crumble', 0.6); at(t, 32.1, 'crumble', 0.7);
}, {cam: lt => ({z: lerp(1.6, 1.2, ease((lt - 0.8) / 4.5)), fx: lerp(470, 600, ease((lt - 0.8) / 4.5)), fy: lerp(1020, 1180, ease((lt - 0.8) / 4.5))}), hand: 1});

bed('room', 0, 1.5, 3); bed('room', 2.8, 20.4, 3.5); bed('hum', 25.3, 35, 1.5);
bed('silence', 20.45, 23.2); bed('silence', 23.9, 25.2);
music('tender', 25.3, 29.2, 1); music('resolve', 29.0, 35.0, 1);
await run({dir: DIR, duration: 35.0});
