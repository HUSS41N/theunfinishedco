// What If #08 — What if gravity took a 10-second break?   (33.4 s, silent)
// One clock: gravity switches off at t = 0 and the red counter reads ceil(10 − t), so it hits 0 exactly at t = 10.0,
// the frame everything drops. The premise card is a cut-away; the count keeps running underneath it.
import path from 'node:path';
import {D, shot, run, guy, bg, floor, lampPost, card, cup, phoneCloseup, rr, txt, kf, ease, lerp, clamp, twos, mix, walk, runCycle,
  at, bed, music, STAND, INK, WHITE, GREY, LIGHT, SOFT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const RED = ACCENTS.red, EXTRA = '#9A9A9A';
const T_DROP = 10.0, T_NINE = 31.5; // gravity returns; 9:00:00 next morning
const S = 1.25;

// ---------- helpers ----------
const rise = (t, k = 1) => k * (30 * t + 7 * t * t); // how far a loose thing has drifted up since gravity left
const fall = (y0, dt, d = 0.38) => lerp(y0, GROUND, clamp(dt / d) ** 2);
/** draw a stickman rotated about a body point. anchor = local joint that sits at `pivot` in world. */
function guyAt(ctx, pivot, rot, s, pose, face, opts = {}, anchor = [0, -300]) {
  const fx = opts.flip ? -1 : 1;
  ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.rotate(rot);
  const j = guy(ctx, -anchor[0] * s * fx, -anchor[1] * s, s, pose, face, opts); ctx.restore(); return j;
}
/** a pram: origin = the handle grip; dir = +1 body extends to the right */
function pram(ctx, dir = 1, babyEyes = 'open') {
  ctx.save(); ctx.scale(dir, 1);
  D.line(ctx, [[-16, -4], [10, 6]], {w: 7}); D.line(ctx, [[0, 0], [62, 78]], {w: 6});
  D.line(ctx, [[95, 182], [95, 200]], {w: 5}); D.line(ctx, [[220, 182], [220, 200]], {w: 5});
  D.ellipse(ctx, 95, 214, 30, 30, {fill: WHITE, w: 5}); D.ellipse(ctx, 220, 214, 30, 30, {fill: WHITE, w: 5});
  D.dot(ctx, 95, 214, 6, 6); D.dot(ctx, 220, 214, 6, 6);
  D.ellipse(ctx, 118, 56, 25, 25, {fill: WHITE, w: 4.5});
  if (babyEyes === 'closed') { D.line(ctx, [[106, 56], [113, 58]], {w: 3.5}); D.line(ctx, [[123, 58], [130, 56]], {w: 3.5}); }
  else { D.dot(ctx, 110, 55, 3.6, 5); D.dot(ctx, 127, 55, 3.6, 5); }
  D.line(ctx, [[52, 78], [266, 78], [254, 142], [222, 184], [92, 184], [62, 142], [52, 78]], {w: 6, fill: WHITE});
  D.line(ctx, [[160, 78], [180, 24], [232, 0], [268, 34], [266, 78], [160, 78]], {w: 5.5, fill: WHITE});
  D.line(ctx, [[188, 70], [205, 22]], {w: 3}); D.line(ctx, [[222, 72], [236, 12]], {w: 3});
  ctx.restore();
}
function bench(ctx, x, w = 300) {
  D.line(ctx, [[x, GROUND - 150], [x + w, GROUND - 150]], {w: 7}); D.line(ctx, [[x + 10, GROUND - 260], [x + w - 10, GROUND - 260]], {w: 6});
  for (const k of [30, w - 30]) { D.line(ctx, [[x + k, GROUND - 150], [x + k, GROUND]], {w: 6}); D.line(ctx, [[x + k, GROUND - 150], [x + k - 8, GROUND - 270]], {w: 5}); }
}
function fountain(ctx, x) {
  D.rect(ctx, x - 170, GROUND - 120, 340, 120, {fill: WHITE, w: 6});
  D.line(ctx, [[x, GROUND - 120], [x, GROUND - 300]], {w: 7});
  D.line(ctx, [[x - 90, GROUND - 300], [x + 90, GROUND - 300], [x + 60, GROUND - 260], [x - 60, GROUND - 260], [x - 90, GROUND - 300]], {w: 5, fill: WHITE});
}
const rope = (ctx, a, b, sag = 30) => D.line(ctx, D.curve(a, b, sag, 14), {w: 4.5});
function umbrella(ctx, x, y, r = 0) { // handle bottom at (x, y)
  ctx.save(); ctx.translate(x, y); ctx.rotate(r);
  D.line(ctx, [[0, 0], [0, -230]], {w: 5}); D.line(ctx, [[0, 0], [-14, 12], [-26, 0]], {w: 5});
  D.line(ctx, [[-150, -200], [-110, -270], [-40, -305], [40, -305], [110, -270], [150, -200], [100, -215], [50, -200], [0, -215], [-50, -200], [-100, -215], [-150, -200]], {w: 5, fill: WHITE});
  ctx.restore();
}
function blob(ctx, x, y, r, t, k) { D.ellipse(ctx, x, y, r * (1 + 0.12 * Math.sin(t * 5 + k)), r * (1 - 0.12 * Math.sin(t * 5 + k)), {fill: SOFT, w: 3.5}); }
function book(ctx, x, y, r) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); D.line(ctx, [[-50, 0], [0, -14], [50, 0], [50, 50], [0, 36], [-50, 50], [-50, 0]], {w: 4.5, fill: WHITE}); D.line(ctx, [[0, -14], [0, 36]], {w: 4}); ctx.restore(); }
function hat(ctx, x, y, r) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); D.rect(ctx, -34, -60, 68, 60, {fill: INK, w: 4}); D.line(ctx, [[-60, 0], [60, 0]], {w: 7}); ctx.restore(); }

// the red counter, top-right, inside the safe area
const countN = t => clamp(Math.ceil(10 - t - 1e-9), 0, 10);
function counter(ctx, t, {size = 190} = {}) {
  const n = countN(t), since = t <= 0 ? 1 : (t % 1 + (t >= T_DROP ? t - T_DROP : 0)), pop = 1 + 0.14 * (1 - ease(Math.min(1, since / 0.25)));
  ctx.save(); ctx.translate(1150, 360); ctx.scale(pop, pop); txt(ctx, String(n), 0, 0, size, RED, 'InterTight', 'right'); ctx.restore();
}
function clockLabel(ctx, t, {size = 132, y = 340} = {}) {
  const secs = Math.floor(60 - (T_NINE - t)), s = t >= T_NINE ? '9:00:00' : `8:59:${String(clamp(secs, 0, 59)).padStart(2, '0')}`;
  txt(ctx, s, 640, y, size, RED, 'InterTight', 'center');
}
const ticks = (t, a, b, kind = 'tick', g = 0.45) => { for (let k = Math.ceil(a); k < b; k++) at(t, k, kind, g); };

// ---------- S1 0–1.5: his feet leave the pavement; his coffee slips up out of his hand and floats past his face ----------
shot(0, 1.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); lampPost(ctx, 1180);
  const T = twos(lt), up = 45 + lt * 70 + lt * lt * 30, wob = Math.sin(T * 3) * 0.05;
  const p = kf([[0, {...STAND, rh: [95, -250], elbow: [1, -1]}], [0.35, {...STAND, lf: [-40, -18], rf: [60, -30], rh: [110, -260], elbow: [1, -1]}],
    [0.8, {...STAND, lf: [-30, -40], rf: [70, -10], knee: [-1, -1], lh: [-160, -360], rh: [150, -390], elbow: [1, -1]}], [1.5, {...STAND, lf: [-60, -50], rf: [40, -20], lh: [-170, -420], rh: [160, -430], elbow: [1, -1]}]], T);
  const j = guyAt(ctx, [640, GROUND - 300 * S - up], wob, S, p, {gx: lerp(0.4, 0.2, lt), gy: lt > 0.5 ? lerp(0.5, -0.8, ease((lt - 0.5) / 0.8)) : 0.6, mouth: lt < 0.3 ? 'flat' : 'O', eyes: lt > 0.3 ? 'wide' : undefined});
  // the cup: in his hand at frame 0, drifting up across his face
  const cx = 640 + lerp(95 * S + 10, 190, ease(lt / 0.6)), cy = GROUND - up - 250 * S - lt * lt * 300 - lt * 120;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.2 + lt * 1.6); ctx.scale(1.5, 1.5); cup(ctx, 0, 28, t, false); ctx.restore();
  for (let k = 0; k < 5; k++) D.ellipse(ctx, cx - 30 + k * 26 + Math.sin(t * 4 + k) * 10, cy - 90 - k * 34 - lt * 70, 13 - k * 1.5, 11 - k, {fill: INK, w: 2});
  at(t, 0, 'rumble', 0.7); at(t, 0.05, 'whoosh', 0.3);
}, {cam: lt => ({z: lerp(1.42, 1.5, lt / 1.5), fx: 660, fy: 1150 - lt * 30}), hand: 1.2, shake: lt => 3 * (1 - lt / 1.5), overlay: (ctx, lt, t) => counter(ctx, t)});

// ---------- S2 1.5–2.8: premise card ----------
shot(1.5, 2.8, (ctx, lt) => { bg(ctx); at(1.5 + lt, 1.5, 'cut'); card(ctx, [['WHAT IF GRAVITY', INK], ['TOOK A', INK], ['10-SECOND BREAK?', RED]], {lt, size: 100}); });

// ---------- S3+S4 2.8–12.0: the street floats; he holds a lamp post upside-down, catches a pram; at 0 everything drops ----------
const POST = 560, PIV = [POST - 4, GROUND - 540 * S], FOUNT = 1090;
const GRIP = {hip: [0, -223], lean: 0, lh: [-90, -540], rh: [-70, -550], elbow: [1, 1], lf: [-60, -30], rf: [40, -60], knee: [1, 1]};
const REACH = {...GRIP, rh: [130, -440], elbow: [1, 1]}, HOLD = {...GRIP, rh: [150, -400], elbow: [1, 1], lf: [-90, -60], rf: [20, -20]};
const LANDED = {...STAND, lh: [-90, -540], rh: [150, -250], elbow: [1, 1], lean: -0.04};
const extras = [ // background people who were standing in the street when it happened
  {x: 120, k: 1.75, s: 1.0, r0: 0.0, w: 0.22, ph: 0, flip: false},
  {x: 1250, k: 1.15, s: 1.0, r0: -0.2, w: 0.3, ph: 4, flip: true},
];
const floatPose = (T, ph) => ({hip: [0, -223], lean: 0, lh: [-150 + 30 * Math.sin(T * 5 + ph), -380 - 60 * Math.sin(T * 4 + ph)], rh: [150, -400 + 70 * Math.sin(T * 4.5 + ph)], elbow: [1, -1],
  lf: [-60 + 30 * Math.sin(T * 3 + ph), -30], rf: [60, -40 - 30 * Math.sin(T * 3.3 + ph)], knee: [-1, -1]});
const LYING = {...STAND, lh: [-150, -260], rh: [140, -300], lf: [-80, 0], rf: [90, -10], elbow: [1, -1]};
const things = [ // loose objects: [kind, x, y offset at t=0, k, spin]
  ['book', 300, 60, 0.9, 0.7], ['hat', 980, 380, 0.95, -0.5], ['cup', 760, 200, 1.05, 1.1], ['book', 1180, 120, 0.7, -0.9], ['hat', 60, 300, 1.1, 0.4],
];
function streetFloat(ctx, lt, t) {
  bg(ctx); floor(ctx, -800, 2600); lampPost(ctx, POST); fountain(ctx, FOUNT); bench(ctx, -80, 260);
  const T = twos(t), dt = t - T_DROP, dropped = dt >= 0;
  // fountain water: blobs lift off the basin, then rain back down
  for (let k = 0; k < 9; k++) {
    const r = 12 + (k * 37) % 26, bx = FOUNT - 140 + k * 34 + Math.sin(T * 1.3 + k) * 22, by0 = GROUND - 140 - rise(Math.max(0, t - k * 0.25), 0.55 + (k % 3) * 0.12);
    if (!dropped) blob(ctx, bx, by0, r, T, k); else if (dt < 0.4) blob(ctx, bx, fall(by0, dt, 0.32), r, T, k);
  }
  if (dropped && dt < 0.7) for (let k = 0; k < 7; k++) D.line(ctx, [[FOUNT - 150 + k * 50, GROUND - 130], [FOUNT - 170 + k * 56, GROUND - 130 - 70 * Math.sin(Math.min(1, (dt - 0.3) / 0.4) * 3.14) * (dt > 0.3 ? 1 : 0)]], {w: 3.5});
  // loose things
  for (const [kind, x, y0, k, sp] of things) {
    const yt = GROUND - 30 - y0 * 0.3 - rise(Math.min(t, T_DROP), k), y = dropped ? fall(yt, dt) : yt, r = (dropped ? T_DROP : T) * sp + (dropped ? 0 : 0);
    const rr_ = dropped && dt > 0.38 ? Math.round(r / 3.14) * 3.14 : r, yy = dropped && dt > 0.38 ? GROUND - 30 : y;
    if (kind === 'book') book(ctx, x + Math.sin(t * 0.7 + x) * 30, yy - 20, rr_); else if (kind === 'hat') hat(ctx, x + Math.sin(t * 0.6 + x) * 30, yy, rr_ * 0.5);
    else { ctx.save(); ctx.translate(x + Math.sin(t * 0.8) * 30, yy); ctx.rotate(rr_); cup(ctx, 0, 28, t, false); ctx.restore(); }
  }
  // extras drift up turning slowly; at 0 they drop and lie where they land
  for (const e of extras) {
    const cy = GROUND - 300 * e.s - rise(Math.min(t, T_DROP), e.k), cx = e.x + Math.sin(t * 0.5 + e.ph) * 40;
    if (!dropped) guyAt(ctx, [cx, cy], e.r0 + e.w * T, e.s, floatPose(T, e.ph), {mouth: 'O', eyes: 'wide', gx: e.flip ? 0.5 : -0.3}, {color: EXTRA, flip: e.flip});
    else { const land = dt > 0.4, y = land ? GROUND - 60 * e.s : fall(cy, dt, 0.4), r = land ? -Math.PI / 2 : lerp(e.r0 + e.w * T_DROP, -Math.PI / 2, clamp(dt / 0.4));
      guyAt(ctx, [cx, y], r, e.s, land ? LYING : floatPose(T_DROP, e.ph), {mouth: land ? 'strain' : 'O', eyes: land ? 'closed' : 'wide'}, {color: EXTRA, flip: e.flip}, land ? [0, -180] : [0, -300]); }
  }
  // the man with the umbrella: sails up faster than anyone — and is the only one who comes down gently
  if (t > 6.0 && !dropped) { const u = t - 6.0, x = 1150 + u * 30, y = GROUND - 30 - u * u * 120 - u * 90;
    umbrella(ctx, x + 70, y - 430, 0.08 + Math.sin(t * 2) * 0.05); guy(ctx, x, y, 1.0, {...STAND, rh: [70, -430], elbow: [1, 1], lf: [-30, -40], rf: [50, -10]}, {mouth: 'smile', gy: -0.8, gx: 0.3}, {color: EXTRA}); }
  if (dropped && dt > 0.5) { const y = lerp(300, GROUND, clamp((dt - 0.5) / 1.5)), x = 1080 - Math.sin(dt * 2) * 30;
    umbrella(ctx, x + 70, y - 430, Math.sin(dt * 3) * 0.08); guy(ctx, x, y, 1.0, {...STAND, rh: [70, -430], elbow: [1, 1], lf: [-30, y < GROUND - 5 ? -30 : 0], rf: [50, 0]}, {mouth: 'smile', gx: -0.5}, {color: EXTRA}); }
  // HIM: upside-down on the lamp post, swaying like a flag; catches the drifting pram one-handed; swings down at 0
  const sway = Math.sin(t * 1.7) * 0.12 + Math.sin(t * 0.9) * 0.05;
  let rot = Math.PI + 0.32 + sway, pose;
  const catchT = 5.0;
  if (!dropped) pose = kf([[2.8, GRIP], [4.3, GRIP], [4.7, REACH], [catchT, HOLD], [6.0, {...HOLD, lf: [-40, -80], rf: [60, -20]}], [8, {...HOLD, lf: [-100, -40], rf: [30, -70]}], [10, HOLD]], T);
  else { const sw = ease(clamp(dt / 0.42)); rot = lerp(Math.PI + 0.32 + Math.sin(T_DROP * 1.7) * 0.12 + Math.sin(T_DROP * 0.9) * 0.05, 2 * Math.PI, sw); pose = mix(HOLD, LANDED, clamp(dt / 0.3)); }
  const face = dropped ? {mouth: dt > 0.5 ? 'strain' : 'shout', eyes: dt > 0.45 && dt < 0.75 ? 'closed' : 'wide', gx: -0.3, sweat: dt > 0.6} :
    {mouth: t > catchT && t < 6.2 ? 'shout' : t > 4.2 ? 'O' : 'strain', eyes: (t > 7.1 && t < 7.2) ? 'closed' : 'wide', gx: t > 4 && t < 5.2 ? 0.8 : 0.2, gy: t > 6.5 ? 0.6 : -0.2, sweat: t > 6};
  // pram: drifts up from the lower right, then rides in his right hand
  const pramIn = clamp((t - 2.8) / (catchT - 2.8));
  guyAt(ctx, PIV, rot, S, pose, face, {flip: true, after: (c, j) => {
    const prRotW = dropped ? lerp(0.5, 0, clamp(dt / 0.4)) : t < catchT ? lerp(0.9, 0.35, pramIn) : 0.35 + Math.sin(t * 2.2) * 0.12;
    const dir = dropped && dt > 0.22 ? -1 : 1;
    c.save(); c.translate(j.rh[0] + (t < catchT ? (1 - ease(pramIn)) * 420 : 0), j.rh[1] + (t < catchT ? (1 - ease(pramIn)) * 260 : 0));
    c.scale(-1, 1); c.rotate(prRotW - rot); pram(c, dir, dropped ? 'closed' : 'open'); c.restore();
  }}, GRIP.lh);
  // sound
  ticks(t, 3.0, 10.0); at(t, 3.4, 'alarm', 0.35); at(t, 4.4, 'alarm', 0.3); at(t, 5.0, 'pop', 0.6); at(t, 5.05, 'thud', 0.3); at(t, 4.7, 'whoosh', 0.35);
  at(t, T_DROP, 'hit', 0.8); at(t, 10.18, 'thud', 0.9); at(t, 10.3, 'brick', 0.8); at(t, 10.36, 'thud', 0.8); at(t, 10.4, 'splash', 0.6); at(t, 10.45, 'crumble', 0.5); at(t, 10.42, 'thud', 0.7);
}
shot(2.8, 12.0, (ctx, lt, t) => streetFloat(ctx, lt, t), {
  cam: lt => { const t = lt + 2.8; return t < T_DROP ? {z: lerp(0.98, 1.1, ease((t - 2.8) / 7)), fx: lerp(640, 640, 0), fy: lerp(1000, 980, ease((t - 2.8) / 7))} : {z: lerp(1.1, 1.0, ease((t - T_DROP) / 0.3)), fx: lerp(640, 560, ease((t - T_DROP) / 0.3)), fy: lerp(980, 1080, ease((t - T_DROP) / 0.3))}; },
  hand: 1.6, shake: lt => { const d = lt + 2.8 - T_DROP; return d > 0.15 && d < 0.8 ? 14 * (1 - (d - 0.15) / 0.65) : 0; },
  overlay: (ctx, lt, t) => counter(ctx, t)});

// ---------- S5 12.0–16.5: still clutching the post and the pram. The mother (red scarf) runs up. Relief. ----------
const HX = POST - 4 - 112, PR = [HX - 150 * S, GROUND - 250 * S];
shot(12.0, 16.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -800, 2600); lampPost(ctx, POST);
  const T = twos(lt), arrive = 1.7, mx = lt < arrive ? lerp(-420, -60, lt / arrive) : -60;
  // him: frozen with fear; lets go of the pram when she has it, then the post; slumps and breathes
  const him = kf([[0, LANDED], [2.3, LANDED], [2.7, {...LANDED, rh: [80, -130], elbow: [1, -1]}], [3.2, {...LANDED, rh: [80, -130], elbow: [1, -1]}],
    [3.7, {...STAND, hip: [0, -212], lean: 0.12, headLean: 0.15, lh: [-60, -120], rh: [70, -125], elbow: [1, -1]}], [4.5, {...STAND, hip: [0, -216], lean: 0.08, headLean: 0.1, lh: [-60, -120], rh: [70, -125], elbow: [1, -1]}]], T);
  const breathe = lt > 3.7 ? Math.sin(lt * 4) * 4 : 0;
  guy(ctx, HX, GROUND, S, {...him, hip: [him.hip[0], him.hip[1] + breathe]}, {mouth: lt < 2.6 ? 'strain' : lt < 3.6 ? 'O' : 'wavy', eyes: lt > 3.75 && lt < 3.85 ? 'closed' : lt < 3.0 ? 'wide' : undefined, gx: lt < 1.0 ? 0 : 0.7, sweat: lt < 3.5}, {flip: true});
  // pram: held still, then rocked by her
  const rock = lt > 2.8 ? Math.sin(lt * 5) * 6 : 0;
  ctx.save(); ctx.translate(PR[0] + rock, PR[1]); pram(ctx, -1, lt > 2.8 ? 'closed' : 'open'); ctx.restore();
  // her: runs in, grabs the far side of the pram, hand to her chest, a little bow of thanks
  const her = lt < arrive ? runCycle(T * 2.4, {lean: 0.22}) : kf([[arrive, {...STAND, lean: 0.15, rh: [210, -210], lh: [180, -220], elbow: [1, 1]}], [2.5, {...STAND, lean: 0.12, rh: [205, -215], lh: [175, -225], elbow: [1, 1]}],
    [3.0, {...STAND, lean: 0.05, rh: [205, -215], lh: [40, -330], elbow: [-1, 1]}], [3.6, {...STAND, lean: 0.3, headLean: 0.15, rh: [205, -215], lh: [40, -320], elbow: [-1, 1]}], [4.5, {...STAND, lean: 0.05, rh: [205, -215], lh: [40, -320], elbow: [-1, 1]}]], T);
  guy(ctx, mx, GROUND, S, her, {mouth: lt < arrive ? 'shout' : lt < 3.0 ? 'O' : 'smile', eyes: lt > 3.0 && lt < 3.9 ? 'happy' : 'wide', gx: lt > 2.2 ? 0.9 : 0.5, gy: lt > 1.8 && lt < 2.6 ? 0.6 : 0, sweat: lt < 2.4}, {accent: {kind: 'scarf', color: RED}});
  if (lt < arrive) for (const k of [0, 1, 2, 3, 4]) at(t, 12.05 + k * 0.33, 'step', 0.5);
  at(t, 13.8, 'tap', 0.4); at(t, 14.6, 'breath', 0.7); at(t, 15.3, 'breath', 0.6); at(t, 15.0, 'chuckle', 0.3);
}, {cam: lt => ({z: lerp(1.28, 1.4, ease(lt / 4.5)), fx: lerp(260, 280, lt / 4.5), fy: 1230}), hand: 1.1});

// ---------- S6 16.5–21.5: every phone on the street gets the same alert ----------
shot(16.5, 21.5, (ctx, lt, t) => {
  bg(ctx);
  const slide = ease((lt - 0.35) / 0.3), buzz = lt > 0.35 && lt < 1.0 ? 1 : 0;
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => {
    txt(c, '9:41', SX + 70, SY + 40, 30, INK, 'Inter6', 'left');
    txt(c, 'WED 14', SX + SW / 2, SY + 250, 42, GREY, 'Inter6');
    txt(c, '6:12', SX + SW / 2, SY + 360, 150, INK, 'InterTight');
    if (slide > 0) {
      c.save(); c.translate(0, (1 - slide) * -420); c.globalAlpha = slide;
      const bx = SX + 26, by = SY + 520, bw = SW - 52, bh = 560;
      rr(c, bx, by, bw, bh, 34, WHITE, INK, 5); c.fillStyle = INK; c.beginPath(); c.roundRect(bx, by, bw, 92, [34, 34, 0, 0]); c.fill();
      txt(c, 'EMERGENCY ALERT', bx + bw / 2, by + 48, 38, WHITE, 'InterTight');
      const L = [['NEXT GRAVITY BREAK:', INK, 0.9], ['TOMORROW 9:00 AM.', INK, 1.4], ['DURATION:', INK, 2.3], ['60 SECONDS.', RED, 2.7]];
      L.forEach(([s, col, when], i) => { const a = ease((lt - when) / 0.2); if (a <= 0) return; c.save(); c.globalAlpha *= a;
        const sz = i === 3 ? 74 : 46, y = by + 160 + [0, 70, 175, 265][i]; c.translate(bx + bw / 2, y); const sc = i === 3 ? lerp(1.3, 1, a) : 1; c.scale(sc, sc); txt(c, s, 0, 0, sz, col, 'InterTight'); c.restore(); });
      c.restore();
    }
  }, {buzz, t, thumb: [PHONE_TH(lt)[0], PHONE_TH(lt)[1]]});
  at(t, 16.85, 'ping', 0.8); at(t, 16.9, 'buzz', 0.6); at(t, 17.4, 'notif', 0.3); at(t, 18.8, 'tap', 0.3); at(t, 19.2, 'hit', 0.9);
}, {cam: lt => ({z: lerp(1.0, 1.1, ease(lt / 5)), fx: 640, fy: lerp(1000, 1060, ease(lt / 5))}), hand: 1.4,
  overlay: (ctx, lt) => { if (lt > 3.4 && lt < 3.48) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, 1280, 2276); } }});
const PHONE_TH = lt => [910 - Math.sin(lt * 2) * 10, 1300 + (lt > 3.4 ? -12 : 0)];

// ---------- S7 21.5–31.0: next morning. The whole street is tied down. ----------
const P1 = 380, P2 = 1250, ME = 500, MOM = 710;
function morning(ctx, lt, t, lift = 0) {
  bg(ctx); floor(ctx, -800, 2600); lampPost(ctx, P1); lampPost(ctx, P2); bench(ctx, 830, 300);
  const T = twos(t), nod = (a) => (t > a && t < a + 0.9 ? Math.sin((t - a) * 14) * 0.12 : 0), lookUp = t > 28.6;
  const tau = lift > 0 ? 0 : 1, up = lift; // ropes sag until the feet lift
  // extras: one tied to the bench, one to the far post (grey), the pram tied to the bench leg, the umbrella man untied
  const exPose = t > 25.0 && t < 26.6 ? {...STAND, lh: [60, -300], rh: [90, -300], elbow: [1, 1]} : {...STAND, lh: [-60, -120], rh: [70, -150]};
  guy(ctx, 1000, GROUND - up, 1.15, exPose, {mouth: 'flat', gy: lookUp ? -0.9 : t > 25 && t < 26.6 ? 0.7 : 0, gx: -0.4, eyes: Math.abs(t - 24.2) < 0.05 ? 'closed' : undefined}, {color: EXTRA});
  rope(ctx, [1000, GROUND - up - 223 * 1.15], [1110, GROUND - 150], 30 * tau);
  guy(ctx, 1160, GROUND - up, 1.15, {...STAND, lh: [-60, -110], rh: [90, -230], elbow: [1, 1]}, {mouth: 'frown', gx: 0.6, gy: lookUp ? -0.9 : 0}, {color: EXTRA, flip: true});
  rope(ctx, [1160, GROUND - up - 223 * 1.15], [P2, GROUND - 300], 25 * tau);
  // umbrella man: open umbrella, no rope, quietly confident
  const tw = t > 26.5 && t < 27.6 ? Math.sin((t - 26.5) * 6) * 0.25 : 0;
  umbrella(ctx, 1390, GROUND - up - 300, tw); guy(ctx, 1330, GROUND - up, 1.0, {...STAND, rh: [60, -300], elbow: [1, 1]}, {mouth: 'smile', gx: -0.6, gy: lookUp ? -0.9 : 0}, {color: EXTRA});
  // the pram, tied to the post too
  ctx.save(); ctx.translate(250, GROUND - up - 245 * 1.0); ctx.scale(1, 1); pram(ctx, -1, t > 23 && t < 28 ? 'closed' : 'open'); ctx.restore();
  rope(ctx, [250, GROUND - up - 245 + 20], [P1, GROUND - 420], 20 * tau);
  // him and the mother, side by side, roped to the same post. He tugs the knot; they nod; they look up.
  const tug = t > 22.0 && t < 22.8 ? Math.sin((t - 22) * 12) * 18 : 0, knot = t > 26.6 && t < 28.2;
  const meP = lift > 0 ? {...STAND, lh: [-110, -200], rh: [-60, -240], elbow: [1, 1], lf: [-40, 0], rf: [40, 0]}
    : knot ? {...STAND, lh: [20, -235], rh: [40, -225], elbow: [1, 1]} : t > 28.6 ? {...STAND, lh: [-110, -200], rh: [-60, -240], elbow: [1, 1]}
    : {...STAND, lh: [-100 - tug, -215], rh: [75, -105], elbow: [1, -1], headLean: nod(23.2)};
  guy(ctx, ME, GROUND - up, S, {...meP, headLean: (meP.headLean || 0) + nod(23.2) + nod(25.6)}, {mouth: lift ? 'strain' : t > 28.6 ? 'flat' : 'flat', gx: t > 22.9 && t < 24.4 ? 0.8 : t > 25.4 && t < 26.4 ? 0.8 : 0.1, gy: lookUp ? -0.9 : knot ? 0.8 : 0,
    eyes: lift ? 'closed' : Math.abs(t - 27.0) < 0.05 ? 'closed' : undefined, sweat: t > 29}, {});
  rope(ctx, [ME, GROUND - up - 223 * S], [P1, GROUND - 330], 30 * tau); D.ellipse(ctx, ME, GROUND - up - 223 * S, 34, 11, {w: 4.5});
  const momP = lift > 0 ? {...STAND, lh: [-60, -240], rh: [-110, -200], elbow: [1, 1]} : {...STAND, lh: [-60, -110], rh: [70, -120]};
  guy(ctx, MOM, GROUND - up, S, {...momP, headLean: nod(23.5) + nod(25.8)}, {mouth: lift ? 'strain' : 'flat', gx: t > 22.6 && t < 24.4 ? 0.8 : t > 25.4 && t < 26.4 ? 0.8 : -0.2, gy: lookUp ? -0.9 : 0, eyes: lift ? 'closed' : Math.abs(t - 25.0) < 0.05 ? 'closed' : undefined}, {flip: true, accent: {kind: 'scarf', color: RED}});
  rope(ctx, [MOM, GROUND - up - 223 * S], [P1, GROUND - 310], 45 * tau); D.ellipse(ctx, MOM, GROUND - up - 223 * S, 34, 11, {w: 4.5});
  if (lift > 0) for (const x of [ME, MOM, 1000, 1160, 1330]) for (const k of [-1, 1]) D.line(ctx, [[x + k * 40, GROUND - 4], [x + k * 70, GROUND - 4 - lift * 0.3]], {w: 3});
}
shot(21.5, 31.0, (ctx, lt, t) => {
  morning(ctx, lt, t);
  ticks(t, 22.0, 31.0, 'tick', 0.55); at(t, 22.0, 'tap', 0.4); at(t, 26.6, 'paper', 0.4); at(t, 27.0, 'tap', 0.3);
}, {cam: lt => ({z: lerp(1.05, 1.25, ease(lt / 9.5)), fx: lerp(700, 650, ease(lt / 9.5)), fy: lerp(1180, 1250, ease(lt / 9.5))}), hand: 1,
  overlay: (ctx, lt, t) => clockLabel(ctx, t)});
// ---------- S8 31.0–33.4: 9:00:00. Everyone's feet lift. Hard cut. ----------
shot(31.0, 33.4, (ctx, lt, t) => {
  const lift = t > 32.4 ? ease((t - 32.4) / 1.0) * 70 : 0;
  morning(ctx, lt, t, lift);
  at(t, T_NINE, 'hit', 0.9); at(t, 32.4, 'rumble', 0.6);
}, {cam: lt => ({z: lerp(1.45, 1.55, lt / 2.4), fx: 560, fy: 1230}), hand: 1, shake: lt => lt > 1.4 ? 3 : 0, overlay: (ctx, lt, t) => clockLabel(ctx, t)});

bed('street', 0, 1.5, 0.6); bed('wind', 2.8, T_DROP, 1); music('tense', 2.8, T_DROP, 0.9); bed('silence', 10.6, 12.0);
bed('street', 12.0, 16.5, 0.5); bed('wind', 21.5, 33.4, 0.8); bed('silence', 32.2, 32.4);
await run({dir: DIR, duration: 33.4});
