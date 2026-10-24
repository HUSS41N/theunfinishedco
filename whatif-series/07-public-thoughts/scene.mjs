// What If #07 — What if your thoughts were public?   (34 s, silent) · accent blue (thought bubbles)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, table, chair, cup, rr, txt, kf, step, ease, lerp, clamp, twos,
  at, bed, music, STAND, SEATED, INK, WHITE, GREY, LIGHT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const BLUE = ACCENTS.blue, S = 1.3;

// ---------- local helpers ----------
const backOut = k => { k = clamp(k); if (k <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
const blink = (t, off = 0) => ((t + off) % 3.2) < 0.085 ? 'closed' : undefined;
const breathe = (p, lt, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(twos(lt) * 2.6 + a) * 3]});
const W = (x, y, j, s = S, flip = false) => [x + (flip ? -1 : 1) * j[0] * s, y + j[1] * s];
const laughPose = (base, T, ph = 0, amt = 1) => { const b = Math.abs(Math.sin((T + ph) * 11)) * 8 * amt;
  return {...base, hip: [base.hip[0], base.hip[1] - b * 0.4], lean: (base.lean || 0) - 0.08 * amt, headLean: -0.18 * amt - b * 0.01, lh: [-20, -230 + b], rh: [40, -235 + b], elbow: [1, -1]}; };

/** thought bubble in blue: pill + text (kit bubble), with blue trailing dots towards (tx, ty). k = pop progress */
function thought(ctx, x, y, lines, {size = 50, tx, ty, k = 1, alpha = 1} = {}) {
  const s = backOut(k); if (s <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `600 ${size}px Inter6`; const h = lines.length * size * 1.25 + 46;
  if (tx !== undefined) for (const [u, r] of [[0.42, 15], [0.7, 10], [0.9, 6.5]]) {
    const px = lerp(x, tx, u), py = lerp(y + h / 2, ty, u); ctx.beginPath(); ctx.arc(px, py, r * s, 0, 6.283); ctx.fillStyle = WHITE; ctx.fill(); ctx.strokeStyle = BLUE; ctx.lineWidth = 4; ctx.stroke(); }
  ctx.translate(x, y); ctx.scale(s, s);
  // kit bubble draws pill outline + text in `color`
  thoughtCore(ctx, lines, size);
  ctx.restore();
}
function thoughtCore(ctx, lines, size) {
  ctx.font = `600 ${size}px Inter6`; const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + 80, h = lines.length * size * 1.25 + 46;
  // soft cloud bumps behind the pill
  ctx.fillStyle = WHITE; ctx.strokeStyle = BLUE; ctx.lineWidth = 4.5;
  const bumps = Math.max(3, Math.round(w / 110));
  for (let i = 0; i < bumps; i++) { const bx = -w / 2 + (i + 0.5) * w / bumps; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(bx, sy * h * 0.36, h * 0.3, 0, 6.283); ctx.fill(); ctx.stroke(); } }
  rr(ctx, -w / 2, -h / 2, w, h, h / 2, WHITE, null);
  lines.forEach((s, i) => txt(ctx, s, 0, -(lines.length - 1) * size * 0.625 + i * size * 1.25 + 2, size, BLUE, 'Inter6'));
}
/** a bubble whose text changes on keys [[t, lines], ...]; each change re-pops */
function changing(ctx, x, y, keys, lt, opts = {}) {
  let cur = null, t0 = 0; for (const [k, l] of keys) if (lt >= k) { cur = l; t0 = k; }
  if (!cur) return; thought(ctx, x, y, cur, {...opts, k: (lt - t0) / 0.28});
}

// ---------- the office set ----------
const HIM = 430, INT = 820, P1 = 130, P3 = 1030, P2 = 1210;
function office(ctx, t) {
  bg(ctx); floor(ctx, -900, 2200);
  // windows and a clock on the back wall
  for (const x of [-260, 1120]) { D.rect(ctx, x, 560, 300, 340, {w: 4, color: '#C9C9C9'}); D.line(ctx, [[x + 150, 560], [x + 150, 900]], {w: 3, color: '#D6D6D6'}); }
  D.ellipse(ctx, 640, 190, 52, 52, {fill: WHITE, w: 5}); const a = t * 0.8; D.line(ctx, [[640, 190], [640 + Math.sin(a) * 34, 190 - Math.cos(a) * 34]], {w: 4}); D.line(ctx, [[640, 190], [640 + 22, 190 - 6]], {w: 5});
  // a plant
  D.poly(ctx, [[1470, GROUND], [1530, GROUND], [1540, GROUND - 110], [1460, GROUND - 110]], {fill: WHITE, w: 5});
  for (const [dx, dy] of [[-60, -260], [10, -300], [70, -240]]) D.line(ctx, D.curve([1500, GROUND - 110], [1500 + dx, GROUND - 110 + dy], 20 * Math.sign(dx || 1), 6), {w: 4});
  chair(ctx, HIM); chair(ctx, INT, {flip: true});
  table(ctx, 515, {w: 220});
  D.rect(ctx, 580, 1236, 100, 14, {fill: WHITE, w: 3.5}); // papers
}
const seated = (lt, o = {}) => ({...breathe(SEATED, lt), lh: [80, -200], rh: [110, -205], ...o});
function interviewer(ctx, p, face) { return guy(ctx, INT, GROUND, S, p, face, {flip: true, accent: {kind: 'scarf', color: BLUE}}); }
const headOf = (x, j, flip, s = S) => W(x, GROUND, j.head, s, flip);

// ---------- S1 0–1.6: the interview. A bubble over him; the interviewer's eyes go up to it ----------
shot(0, 1.6, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  const jh = guy(ctx, HIM, GROUND, S, seated(lt), {gx: 0.7, mouth: 'smile', eyes: blink(t, 0.5), sweat: lt > 0.9});
  const up = T > 0.55;
  const ji = interviewer(ctx, seated(lt, {headLean: up ? -0.12 : 0.05}), {gx: up ? 0.5 : 0.7, gy: up ? -0.9 : 0.2, mouth: up ? 'O' : 'flat', eyes: up ? 'wide' : undefined});
  const h = headOf(HIM, jh, false);
  thought(ctx, 470, 690, ["I HAVE NO IDEA", "WHAT I'M DOING."], {size: 52, tx: h[0], ty: h[1] - 70, k: (lt - 0.05) / 0.3});
  at(t, 0.05, 'pop', 0.7);
}, {cam: lt => ({z: lerp(1.2, 1.26, lt / 1.6), fx: 640, fy: 1010}), hand: 0.8});

// ---------- S2 1.6–2.9: premise card ----------
shot(1.6, 2.9, (ctx, lt, t) => { bg(ctx); at(t, 1.6, 'cut'); card(ctx, [['WHAT IF', INK], ['YOUR THOUGHTS', INK], ['WERE PUBLIC?', BLUE]], {lt, size: 112}); });

// ---------- S3 2.9–9.0: he tries to hide it; it changes: DON'T THINK ABOUT THE BUBBLE. -> STOP. ----------
shot(2.9, 9.0, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  const fl = Math.sin(T * 13) * 30;
  const cover = (a) => ({...STAND, hip: [0, -228], headLean: -0.12, lh: [-70 + fl * a, -572], rh: [95 - fl * a, -578], elbow: [1, 1]});
  const p = kf([[0, seated(lt)], [0.5, {...SEATED, hip: [10, -200], lean: 0.18}], [0.95, cover(0)], [1.6, cover(1)], [2.6, cover(1)], [3.1, {...STAND, hip: [0, -215], lean: 0.05, lh: [-90, -540], rh: [100, -545], elbow: [1, 1], headLean: -0.1}],
    [3.9, cover(1)], [4.1, {...STAND, hip: [0, -226], lh: [-120, -470], rh: [130, -470], elbow: [1, 1], headLean: -0.15}], [4.8, {...STAND, hip: [0, -226], lh: [-120, -470], rh: [130, -470], elbow: [1, 1], headLean: -0.15}],
    [5.4, {...STAND, hip: [0, -218], lean: 0.04, headLean: 0.1, lh: [-60, -110], rh: [70, -110]}]], T);
  if (T > 0.95 && T < 3.95) { const a = clamp((T - 0.95) / 0.65); p.lh = [p.lh[0] + fl * a * 0.6, p.lh[1]]; p.rh = [p.rh[0] - fl * a * 0.6, p.rh[1]]; }
  const face = T < 0.5 ? {gx: 0.2, gy: -0.9, mouth: 'O', eyes: 'wide', sweat: true} : T < 4.0 ? {gx: 0.1, gy: -0.9, mouth: T < 1.6 ? 'strain' : 'shout', eyes: T > 1.6 ? 'squint' : 'wide', sweat: true}
    : T < 5.2 ? {gx: 0.1, gy: -0.9, mouth: 'flat', eyes: 'wide'} : {gx: 0.8, gy: 0, mouth: 'wavy', eyes: blink(t, 0.3), sweat: true};
  const jh = guy(ctx, HIM, GROUND, S, p, face);
  interviewer(ctx, seated(lt, {headLean: -0.1}), {gx: 0.4, gy: -0.8, mouth: 'O', eyes: blink(t, 1.1)});
  const h = headOf(HIM, jh, false);
  changing(ctx, 450, 640, [[-1, ["I HAVE NO IDEA", "WHAT I'M DOING."]], [1.6, ["DON'T THINK ABOUT", "THE BUBBLE."]], [4.0, ["STOP."]]], lt, {size: 54, tx: h[0], ty: h[1] - 70});
  if (lt > 4.0) thought(ctx, 450, 640, ["STOP."], {size: 92, tx: h[0], ty: h[1] - 70, k: (lt - 4.0) / 0.28});
  at(t, 2.9 + 0.5, 'whoosh', 0.3); at(t, 2.9 + 1.6, 'pop', 0.7); at(t, 2.9 + 4.0, 'pop', 0.9); at(t, 2.9 + 2.2, 'swipe', 0.3); at(t, 2.9 + 3.2, 'swipe', 0.3);
}, {cam: lt => ({z: lerp(1.3, 1.4, ease(lt / 6)), fx: 500, fy: 1000}), hand: 1, shake: lt => lt > 4.0 && lt < 4.3 ? 4 : 0});

// ---------- S4 9.0–15.0: reverse — the interviewer's own bubble ----------
shot(9.0, 15.0, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  const tap = Math.max(0, Math.sin(T * 9)) * (T < 1.2 ? 1 : 0);
  const jh = guy(ctx, HIM, GROUND, S, {...breathe(STAND, lt), lean: 0.03}, {gx: 0.8, gy: T > 1.0 ? -0.5 : 0.2, mouth: T > 1.2 ? 'O' : 'wavy', eyes: T > 1.2 && T < 3.6 ? 'wide' : blink(t)});
  const look = T > 3.0 && T < 4.4;
  const ji = interviewer(ctx, seated(lt, {rh: [140, -230 + tap * 25], headLean: look ? -0.15 : 0.08}),
    T < 1.0 ? {gx: 0.3, gy: 0.7, mouth: 'flat'} : T < 3.0 ? {gx: 0.7, gy: 0.4, mouth: 'flat', sweat: T > 2.0, eyes: blink(t, 0.6)} : look ? {gx: 0.2, gy: -0.9, mouth: 'O', eyes: 'wide', sweat: true} : {gx: 0.8, gy: 0, mouth: 'wavy', sweat: true});
  void jh;
  const h = headOf(INT, ji, true);
  thought(ctx, 860, 640, ["I HOPE HE DOESN'T", "NOTICE I'M NEW TOO."], {size: 52, tx: h[0], ty: h[1] - 70, k: (lt - 1.0) / 0.3});
  at(t, 10.0, 'pop', 0.8); at(t, 9.1, 'tap', 0.3); at(t, 9.4, 'tap', 0.3); at(t, 9.7, 'tap', 0.3); at(t, 12.1, 'breath', 0.3);
}, {cam: lt => ({z: lerp(1.32, 1.42, ease(lt / 6)), fx: 830, fy: 1010}), hand: 0.9});

// ---------- S5 15.0–22.0: pull back — everyone in the office has a bubble ----------
const OTHERS = [
  {x: P1, flip: false, bx: 205, by: 300, lines: ['AM I DOING', 'THIS RIGHT?'], pop: 2.2, kind: 'cap', cupIn: true},
  {x: P2, flip: true, bx: 1000, by: 290, lines: ["EVERYONE'S", 'SMARTER THAN ME.'], pop: 3.2, kind: 'cap'},
  {x: P3, flip: true, bx: 960, by: 640, lines: ['JUST NOD.'], pop: 4.2, kind: 'cap', folder: true},
];
function others(ctx, lt, t, {same = -1} = {}) {
  const T = twos(lt);
  for (const [i, o] of OTHERS.entries()) {
    const nod = o.folder ? Math.max(0, Math.sin(T * 6)) * 0.12 : 0;
    const p = {...breathe(STAND, lt, i), headLean: nod, ...(o.cupIn ? {rh: [70, -250], elbow: [1, 1]} : {}), ...(o.folder ? {lh: [60, -230], rh: [90, -235], elbow: [1, 1]} : {})};
    const j = guy(ctx, o.x, GROUND, 1.25, p, {gx: 0.5, gy: same >= 0 && lt > same + 0.3 * i + 0.4 ? -0.6 : 0.2, mouth: same >= 0 && lt > same + 0.3 * i + 0.4 ? 'smile' : 'flat', eyes: blink(t, i * 0.9)},
      {flip: o.flip, accent: {kind: o.kind, color: BLUE}, after: o.cupIn ? (c, jj) => cup(c, jj.rh[0] + 10, jj.rh[1] + 40, t, false) : o.folder ? (c, jj) => D.rect(c, jj.lh[0] - 10, jj.lh[1] - 70, 70, 90, {fill: WHITE, w: 4}) : undefined});
    o.head = headOf(o.x, j, o.flip, 1.25);
  }
}
function othersBubbles(ctx, lt, {same = -1, sameSize = 44} = {}) {
  for (const [i, o] of OTHERS.entries()) {
    const sw = same >= 0 ? same + 0.35 + i * 0.3 : 99;
    if (lt < sw) thought(ctx, o.bx, o.by, o.lines, {size: 44, tx: o.head[0], ty: o.head[1] - 70, k: (lt - o.pop) / 0.3});
    else thought(ctx, o.bx, o.by, ["OH. IT'S NOT", 'JUST ME.'], {size: sameSize, tx: o.head[0], ty: o.head[1] - 70, k: (lt - sw) / 0.3});
  }
}
shot(15.0, 22.0, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  others(ctx, lt, t);
  // the two of them look around the room, then at each other
  const g = kf([[0, 0.8], [2.4, 0.8], [2.7, -0.9], [3.5, -0.9], [3.8, 0.9], [4.9, 0.9], [5.2, 0.8]], T);
  guy(ctx, HIM, GROUND, S, {...breathe(STAND, lt), headLean: g < 0 ? -0.06 : 0.04}, {gx: g, gy: T > 2.4 && T < 5.2 ? -0.5 : 0, mouth: T > 2.4 ? 'O' : 'wavy', eyes: blink(t, 0.4)});
  interviewer(ctx, seated(lt), {gx: -g, gy: T > 2.4 && T < 5.2 ? -0.5 : 0, mouth: T > 2.4 ? 'O' : 'wavy', eyes: blink(t, 1.6)});
  othersBubbles(ctx, lt);
  for (const o of OTHERS) at(t, 15.0 + o.pop, 'pop', 0.6);
}, {cam: lt => ({z: lerp(1.35, 1.0, ease(lt / 3.2)), fx: 640, fy: lerp(1050, 970, ease(lt / 3.2))}), hand: 0.8});

// ---------- S6 22.0–28.0: two-shot — he laughs; the interviewer laughs ----------
shot(22.0, 28.0, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  const hisL = clamp((T - 1.0) / 0.4) * (1 - clamp((T - 5.0) / 0.6)), herL = clamp((T - 1.7) / 0.4) * (1 - clamp((T - 5.2) / 0.6));
  const hb = {...breathe(STAND, lt), lean: 0.02};
  guy(ctx, HIM, GROUND, S, hisL > 0.05 ? laughPose(hb, T, 0, hisL) : hb, hisL > 0.3 ? {gx: 0.7, mouth: 'grin', eyes: 'happy'} : {gx: 0.8, mouth: T < 0.6 ? 'wavy' : 'smile', eyes: blink(t, 0.2)});
  const ib = seated(lt);
  interviewer(ctx, herL > 0.05 ? laughPose(ib, T, 0.4, herL) : ib, herL > 0.3 ? {gx: 0.7, mouth: 'grin', eyes: 'happy'} : {gx: 0.8, mouth: T < 1.2 ? 'O' : 'smile', eyes: blink(t, 0.9)});
  for (let k = 0; k < 6; k++) { at(t, 23.0 + k * 0.62, 'chuckle', 0.55); at(t, 23.75 + k * 0.6, 'chuckle', 0.45); }
}, {cam: lt => ({z: lerp(1.28, 1.36, ease(lt / 6)), fx: 640, fy: 1080}), hand: 1.2});

// ---------- S7 28.0–34.0: wide — every bubble changes to the same line. Hold. ----------
shot(28.0, 34.0, (ctx, lt, t) => {
  office(ctx, t); const T = twos(lt);
  others(ctx, lt, t, {same: 0.6});
  const jh = guy(ctx, HIM, GROUND, S, breathe(STAND, lt), {gx: T > 1.6 ? 0.8 : 0.2, gy: T > 1.6 ? 0 : -0.6, mouth: 'smile', eyes: T > 2.6 ? 'happy' : blink(t)});
  const ji = interviewer(ctx, seated(lt), {gx: 0.8, mouth: 'smile', eyes: T > 2.8 ? 'happy' : blink(t, 0.8)});
  othersBubbles(ctx, lt, {same: 0.6});
  const h = headOf(HIM, jh, false), hi = headOf(INT, ji, true);
  thought(ctx, 380, 640, ["OH. IT'S NOT", 'JUST ME.'], {size: 52, tx: h[0], ty: h[1] - 70, k: (lt - 0.6) / 0.3});
  thought(ctx, 600, 300, ["OH. IT'S NOT", 'JUST ME.'], {size: 52, tx: hi[0], ty: hi[1] - 70, k: (lt - 0.8) / 0.3});
  at(t, 28.6, 'chime', 0.7); for (let k = 0; k < 4; k++) at(t, 28.8 + k * 0.3, 'pop', 0.35);
}, {cam: lt => ({z: lerp(0.98, 1.01, ease(lt / 6)), fx: 640, fy: lerp(980, 950, ease(lt / 6))}), hand: 0.6});

// ---------- sound ----------
bed('room', 0, 1.6, 0.6);
bed('room', 2.9, 15.0, 0.6);
bed('crowd', 15.0, 22.0, 0.55);
music('playful', 22.0, 28.0, 0.8); bed('room', 22.0, 28.0, 0.4);
music('resolve', 28.3, 34.0, 0.9); bed('room', 28.0, 34.0, 0.35);
await run({dir: DIR, duration: 34.0});
