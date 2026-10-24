// What If #04 — What if you could see how much people like you?   (36 s, silent)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, bubble, txt, rr, table, chair, cup, door, windowFrame, phoneCloseup, textMsg, kf, step, ease, lerp, clamp, twos, hash, walk,
  at, bed, music, STAND, SEATED, INK, WHITE, GREY, LIGHT, SOFT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const B = ACCENTS.blue;                               // the one accent: the % numbers
const SCARF = {kind: 'scarf', color: WHITE}, CAP = {kind: 'cap', color: WHITE};   // secondary characters, no colour
const blink = (t, off = 0) => ((t + off) % 3.2) < 2 / 24;
const breathe = (p, t, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(t * 2.3) * a]});

// a person + their number above the head. pulse 0..1 = flash (scale + alpha flicker), label = small ink name above
function person(ctx, x, s, pose, face, opts = {}, num, {pulse = 0, size = 60, label, alpha = 1} = {}) {
  const j = guy(ctx, x, GROUND, s, pose, face, opts);
  if (num !== undefined) {
    const hx = x + (opts.flip ? -1 : 1) * j.head[0] * s, hy = GROUND + j.head[1] * s - 58 * s - size * 0.75;
    const k = 1 + 0.55 * pulse, a = alpha * (pulse > 0 ? 0.55 + 0.45 * Math.abs(Math.cos(pulse * 18)) : 1);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(hx, hy); ctx.scale(k, k); txt(ctx, `${num}%`, 0, 0, size, B, 'InterTight'); ctx.restore();
    if (label) txt(ctx, label, hx, hy - size * 0.9, size * 0.6, INK, 'InterTight');
  }
  return j;
}
const tickIn = (t, a, from, to, dur = 0.01) => t < a ? from : t > a + dur ? to : Math.round(lerp(from, to, (t - a) / dur));
const pop = (t, a, d = 0.35) => t > a && t < a + d ? 1 - (t - a) / d : 0;

// S1 0–1.6: a pavement crowd, a % over every head; a stranger bumps him and his 0% flashes
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); const T = twos(lt);
  person(ctx, 215, 1.1, breathe({...STAND, lh: [-60, -110], rh: [60, -110]}, t + 2), {gx: 0.6, mouth: 'smile', eyes: blink(t) ? 'closed' : undefined}, {}, 87);
  person(ctx, 375, 1.1, breathe({...STAND, headLean: 0.3, rh: [70, -260], elbow: [1, 1]}, t), {gy: 0.8, mouth: 'flat'}, {after: (c, j) => { c.fillStyle = INK; c.fillRect(j.rh[0], j.rh[1] - 40, 28, 52); }}, 12);
  person(ctx, 1010, 1.1, breathe(STAND, t + 1), {gx: -0.6, mouth: 'smile'}, {flip: true}, 64);
  person(ctx, 1165, 1.1, breathe({...STAND, rh: [80, -250], elbow: [1, 1]}, t + 2), {gx: -0.6, mouth: 'flat', eyes: blink(t, 1) ? 'closed' : undefined}, {flip: true}, 31);
  // him walking right; the stranger walking left collides at ~0.55 s, then stops and glares
  const bump = ease((lt - 0.55) / 0.15) * (1 - ease((lt - 0.9) / 0.5));
  const me = lt < 0.55 ? walk(T * 1.8) : {...STAND, lean: -0.18 * bump, lh: [-110, -200], rh: [60, -150]};
  person(ctx, 540 + Math.min(lt, 0.55) * 140 - bump * 30, 1.15, me, {gx: lt > 0.6 ? 0.6 : 0.8, mouth: lt > 0.6 ? 'O' : 'flat', eyes: lt > 0.6 ? 'wide' : undefined});
  const sx = lt < 0.55 ? 930 - lt * 300 : 765 + ease((lt - 0.55) / 0.3) * 40;
  person(ctx, sx, 1.15, lt < 0.55 ? walk(T * 1.8, {lean: 0.08}) : {...STAND, lean: -0.08, lh: [-60, -110], rh: [60, -110]}, {gx: 0.7, mouth: lt < 0.55 ? 'flat' : 'frown', eyes: 'squint'}, {flip: true}, 0,
    {pulse: lt > 0.6 ? clamp((lt - 0.6) / 0.9) : 0, size: 70});
  at(t, 0.58, 'thud', 0.4); at(t, 0.62, 'pop', 0.7);
}, {cam: lt => ({z: lerp(1.08, 1.16, lt / 1.6), fx: 680, fy: 1170}), hand: 1.2, shake: lt => lt > 0.55 && lt < 0.7 ? 4 : 0});

// S2 1.6–2.9: premise card
shot(1.6, 2.9, (ctx, lt) => { bg(ctx); at(1.6 + lt, 1.6, 'cut'); card(ctx, [['WHAT IF YOU COULD SEE', INK], ['HOW MUCH PEOPLE', B], ['LIKE YOU?', B]], {lt, size: 90}); });

// S3 2.9–7.0: home doorway — Mom hugs him: 100%
shot(2.9, 7.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  door(ctx, 860, ease(lt / 0.6));
  const hug = ease((lt - 0.9) / 0.5);
  const momX = lerp(1000, 760, ease((lt - 0.3) / 0.7));
  // he walks in, stops, she comes out and hugs him
  const meX = lerp(380, 590, ease(lt / 0.9));
  const meP = lt < 0.9 ? walk(T * 1.6) : kf([[0.9, STAND], [1.4, {...STAND, lean: 0.06, lh: [150, -330], rh: [170, -350], elbow: [1, 1]}]], T);
  person(ctx, meX, 1.25, breathe(meP, t, 2), {gx: 0.7, mouth: lt > 1.0 ? 'grin' : 'smile', eyes: lt > 1.5 ? 'happy' : undefined});
  const momP = lt < 1.0 ? walk(T * 1.4) : kf([[1.0, STAND], [1.4, {...STAND, lean: 0.08, headLean: 0.1, lh: [160, -360], rh: [180, -340], elbow: [1, 1]}]], T);
  const sway = hug > 0.9 ? Math.sin(t * 2.4) * 0.03 : 0;
  person(ctx, momX, 1.2, breathe({...momP, lean: momP.lean + sway}, t + 1), {gx: 0.7, mouth: 'smile', eyes: lt > 1.4 ? 'closed' : undefined}, {flip: true, accent: SCARF}, 100,
    {label: 'MOM', alpha: ease((lt - 0.4) / 0.3), pulse: pop(lt, 1.4, 0.4) * 0.6, size: 66});
  at(t, 2.95, 'dooropen', 0.5); at(t, 4.3, 'chime', 0.8);
}, {cam: lt => ({z: lerp(1.2, 1.32, ease(lt / 4)), fx: lerp(700, 690, lt / 4), fy: 1150}), hand: 1});

// S4 7.0–12.0: office, late; the boss is at 41%; he works on; it ticks to 42%; he sighs
shot(7.0, 12.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  windowFrame(ctx, 120, 760, 300, 360); D.ellipse(ctx, 330, 850, 34, 34, {w: 4}); D.ellipse(ctx, 345, 840, 30, 30, {fill: WHITE, w: 0});
  // a clock on the wall
  D.ellipse(ctx, 620, 820, 56, 56, {fill: WHITE, w: 5}); const ca = t * 0.6; D.line(ctx, [[620, 820], [620 + Math.sin(ca) * 38, 820 - Math.cos(ca) * 38]], {w: 4}); D.line(ctx, [[620, 820], [646, 836]], {w: 5});
  table(ctx, 460, {w: 400}); chair(ctx, 400);
  // a laptop
  D.line(ctx, [[560, 1250], [700, 1250]], {w: 6}); D.line(ctx, [[700, 1250], [740, 1150]], {w: 6});
  const typing = lt < 2.8 || lt > 4.6;
  const meP = typing ? {...SEATED, lean: 0.1, rh: [190 + (T % 0.17 < 0.08 ? 10 : 0), -255], lh: [160 + (T % 0.25 < 0.12 ? 8 : 0), -258]} :
    kf([[2.8, {...SEATED, lean: 0.1}], [3.3, {...SEATED, lean: -0.12, headLean: -0.2, lh: [-20, -420], rh: [30, -430], elbow: [-1, 1]}], [4.1, {...SEATED, lean: 0.12, headLean: 0.15}], [4.6, {...SEATED, lean: 0.1}]], T);
  person(ctx, 400, 1.25, breathe(meP, t, 2), {gx: lt > 3.3 && lt < 4.4 ? -0.2 : 0.8, gy: lt > 3.3 && lt < 4.4 ? 0.5 : 0.2, mouth: lt > 3.4 && lt < 4.4 ? 'wavy' : 'flat',
    eyes: lt > 3.4 && lt < 4.2 ? 'closed' : blink(t) ? 'closed' : 'squint'});
  // the boss walks past behind, glances at him; number ticks 41 → 42
  const bx = lerp(1250, 980, ease(lt / 1.4));
  const n = tickIn(t, 9.6, 41, 42);
  person(ctx, bx, 1.2, lt < 1.4 ? walk(T * 1.4) : breathe({...STAND, lh: [-60, -110], rh: [70, -260], elbow: [1, 1]}, t), {gx: 0.7, mouth: 'flat'}, {flip: true, accent: CAP,
    after: (c, j) => { c.save(); c.translate(j.rh[0] + 6, j.rh[1] - 10); D.rect(c, -26, -36, 52, 70, {fill: WHITE, w: 4}); c.restore(); }}, n, {pulse: pop(t, 9.6, 0.6) * 0.7});
  at(t, 7.2, 'step', 0.3); at(t, 7.6, 'step', 0.3);
  for (let k = 0; k < 9; k++) at(t, 7.1 + k * 0.28, 'tap', 0.25);
  at(t, 9.6, 'tick', 0.9); at(t, 10.3, 'breath', 0.9); at(t, 11.65, 'click', 0.6);
}, {cam: lt => ({z: lerp(1.15, 1.25, ease(lt / 5)), fx: 680, fy: 1150}), hand: 1});

// S5 12.0–18.0: café — his crush: 12%. He spills his coffee: 9%. She laughs: 15%.
shot(12.0, 18.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const T = twos(lt);
  table(ctx, 700, {w: 280}); chair(ctx, 1050, {flip: true});
  const n = lt < 1.8 ? 12 : lt < 3.0 ? 9 : 15;
  const laugh = lt > 3.0 && lt < 4.6, lb = laugh ? Math.abs(Math.sin(T * 11)) * 8 : 0;
  person(ctx, 1050, 1.2, {...SEATED, hip: [0, -192 - lb], lean: laugh ? -0.08 : 0, lh: [100, -230], rh: [90 + (laugh ? 30 : 0), laugh ? -380 : -230], elbow: [1, 1]},
    {gx: 0.7, gy: lt > 1.5 && lt < 3.0 ? 0.5 : 0, mouth: laugh ? 'grin' : lt > 1.5 && lt < 3.0 ? 'O' : 'flat', eyes: laugh ? 'happy' : blink(t) ? 'closed' : undefined}, {flip: true, accent: SCARF},
    n, {pulse: Math.max(pop(lt, 1.8, 0.5), pop(lt, 3.0, 0.5))});
  // he carries a coffee over, trips, spills
  const walkIn = lt < 1.4, x = lerp(240, 560, ease(lt / 1.4));
  const trip = kf([[1.4, 0], [1.6, 1], [2.2, 1], [2.6, 0]], T);
  let meP = walkIn ? walk(T * 1.7, {rh: [130, -260]}) : {...STAND, lean: 0.22 * trip, rh: [lerp(130, 180, trip), lerp(-260, -320, trip)], lh: [lerp(-60, 60, trip), lerp(-110, -300, trip)], elbow: [1, 1], rf: [55 + 40 * trip, -30 * trip]};
  if (lt > 4.0) meP = kf([[4.0, {...STAND, lh: [-60, -110], rh: [60, -110]}], [4.4, {...STAND, lh: [-20, -300], rh: [30, -470], headTilt: 0.15, elbow: [1, 1]}], [5.2, {...STAND, lh: [-40, -200], rh: [60, -200], elbow: [1, 1]}]], T);
  const confused = lt > 3.0 && lt < 4.8;
  person(ctx, x, 1.25, breathe(meP, t, 2), {gx: 0.8, mouth: lt > 4.8 ? 'smile' : confused ? 'wavy' : trip > 0.5 ? 'O' : 'smile', eyes: trip > 0.5 && lt < 3 ? 'wide' : blink(t, 1) ? 'closed' : undefined, sweat: lt > 1.6 && lt < 3.0},
    {after: lt < 1.6 ? (c, j) => cup(c, j.rh[0] + 4, j.rh[1] + 10, t, true) : null});
  // the cup flies and the coffee splashes
  if (lt > 1.6) { const k = clamp((lt - 1.6) / 0.45), cx = lerp(x + 230, 790, k), cy = lerp(1170, 1520, k * k);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * 2.4); cup(ctx, 0, 28, 0, false); ctx.restore();
    if (k >= 1) { D.ellipse(ctx, 800, 1556, 110, 14, {fill: '#DADADA', w: 4}); }
    else for (let i = 0; i < 7; i++) D.ellipse(ctx, cx - 20 + i * 18 - k * 40, cy - 30 - Math.sin(i) * 30 * k, 7, 9, {fill: WHITE, w: 3}); }
  at(t, 13.55, 'skid', 0.25); at(t, 14.05, 'splash', 0.9); at(t, 13.8, 'pop', 0.5); at(t, 15.0, 'pop', 0.6);
  for (let k = 0; k < 5; k++) at(t, 15.05 + k * 0.28, 'chuckle', 0.8);
}, {cam: lt => ({z: lerp(1.15, 1.25, ease(lt / 6)), fx: lerp(640, 740, ease(lt / 6)), fy: 1150}), hand: 1});

// S6 18.0–23.0: phone — "can't make it, sorry" to his best friend; the friend's number stays 96%
shot(18.0, 23.0, (ctx, lt, t) => {
  bg(ctx);
  const msg = "can't make it, sorry", typed = Math.floor(clamp((lt - 0.4) / 1.8) * msg.length), sent = lt > 2.6;
  const tap = typed < msg.length && lt > 0.4 && Math.floor(lt * 9) % 2 === 0;
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => {
    rr(c, SX, SY, SW, 220, 0, SOFT);
    D.ellipse(c, SX + SW / 2, SY + 110, 36, 36, {fill: WHITE, w: 4});
    txt(c, 'SAM', SX + SW / 2, SY + 175, 40, INK, 'InterTight');
    const p = pop(lt, 2.75, 0.6);
    c.save(); c.translate(SX + SW / 2, SY + 260); c.scale(1 + 0.25 * p, 1 + 0.25 * p); txt(c, '96%', 0, 0, 64, B, 'InterTight'); c.restore();
    textMsg(c, SX, SY, SW, SY + 350, ['tonight, 8?'], {from: 'left'});
    if (sent) textMsg(c, SX, SY, SW, SY + 480, [msg], {from: 'right', color: INK, ink: WHITE});
    // input + keyboard
    rr(c, SX + 30, SY + SH - 470, SW - 60, 74, 37, WHITE, LIGHT, 4);
    if (!sent) txt(c, msg.slice(0, typed) + (Math.floor(lt * 3) % 2 ? '|' : ''), SX + 60, SY + SH - 433, 34, INK, 'Inter6', 'left');
    rr(c, SX, SY + SH - 370, SW, 370, 0, SOFT);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) rr(c, SX + 22 + k * 66 + (r === 1 ? 30 : 0), SY + SH - 340 + r * 96, 54, 76, 10, WHITE);
  }, {thumb: [tap ? 600 : 640, tap ? 1450 : 1400], t});
  for (let k = 0; k < 9; k++) at(t, 18.45 + k * 0.2, 'tap', 0.4);
  at(t, 20.6, 'swipe', 0.5); at(t, 20.65, 'ping', 0.6);
}, {cam: lt => ({z: lerp(1.0, 1.05, lt / 5), fx: 640, fy: 1000}), hand: 0.8});

// the bathroom mirror: him on the left, his reflection inside the frame
const MX0 = 780, MX1 = 1180, MY0 = 620, MY1 = 1290;
function bathroom(ctx, t, x, pose, face, num, numA, pulse = 0) {
  bg(ctx); floor(ctx);
  D.line(ctx, [[600, 1300], [1260, 1300]], {w: 7}); D.poly(ctx, [[860, 1300], [1100, 1300], [1060, 1380], [900, 1380]], {fill: WHITE, w: 5}); D.line(ctx, [[980, 1380], [980, GROUND]], {w: 6});
  D.line(ctx, [[960, 1300], [960, 1260], [1000, 1260]], {w: 5});
  rr(ctx, MX0 - 18, MY0 - 18, MX1 - MX0 + 36, MY1 - MY0 + 36, 14, WHITE, INK, 7);
  ctx.save(); ctx.beginPath(); ctx.rect(MX0, MY0, MX1 - MX0, MY1 - MY0); ctx.clip(); ctx.fillStyle = '#F6F6F6'; ctx.fillRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
  D.line(ctx, [[MX0 + 40, MY0 + 60], [MX0 + 110, MY0 - 10]], {w: 3, color: '#DDDDDD'});
  const rx = 2 * MX0 - x;
  person(ctx, rx, 1.3, pose, face, {flip: true}, num, {alpha: numA, pulse, size: 72});
  ctx.restore();
  rr(ctx, MX0 - 18, MY0 - 18, MX1 - MX0 + 36, MY1 - MY0 + 36, 14, null, INK, 7);
  guy(ctx, x, GROUND, 1.3, pose, face);
}
// S7 23.0–29.0: he looks up; above his own reflection: 4%. Silence.
shot(23.0, 29.0, (ctx, lt, t) => {
  const T = twos(lt), up = ease((T - 1.0) / 0.8);
  const pose = breathe({...STAND, headLean: lerp(0.35, 0, up), lean: 0.04, lh: [80, -240], rh: [110, -250], elbow: [1, 1]}, t, 1.5);
  bathroom(ctx, t, 560, pose, {gx: 0.8, gy: lerp(0.8, 0, up), mouth: up > 0.9 && lt > 2.6 ? 'flat' : 'flat', eyes: lt > 2.4 && lt < 3.6 ? 'wide' : blink(t) ? 'closed' : undefined}, 4, ease((lt - 2.2) / 0.5));
}, {cam: lt => ({z: lerp(1.25, 1.42, ease(lt / 6)), fx: lerp(800, 860, ease(lt / 6)), fy: lerp(1120, 1080, ease(lt / 6))}), hand: 0.6});

// S8 29.0–36.0: push in; he touches the mirror, tries a small smile: 4% → 5%. Hold.
shot(29.0, 36.0, (ctx, lt, t) => {
  const T = twos(lt), touch = ease((T - 0.6) / 1.0);
  const pose = breathe({...STAND, lean: 0.04 + 0.03 * touch, lh: [80, -240], rh: [lerp(110, 168, touch), lerp(-250, -440, touch)], elbow: [1, 1]}, t, 1.5);
  const smile = lt > 2.6, n = lt > 3.6 ? 5 : 4;
  bathroom(ctx, t, 560, pose, {gx: 0.8, mouth: smile ? 'smile' : 'flat', eyes: blink(t, 1) ? 'closed' : undefined}, n, 1, pop(lt, 3.6, 0.7) * 0.6);
  at(t, 30.4, 'tap', 0.4); at(t, 32.6, 'tick', 0.8);
}, {cam: lt => ({z: lerp(1.42, 1.72, ease(lt / 6.5)), fx: lerp(860, 840, ease(lt / 6.5)), fy: lerp(1080, 1000, ease(lt / 6.5))}), hand: 0.6});

bed('crowd', 0, 1.6, 1.4); bed('street', 0, 1.6, 0.8);
bed('room', 2.9, 7.0, 2.5); music('playful', 2.9, 7.0, 0.5);
bed('hum', 7.0, 12.0, 1.4); bed('room', 12.0, 18.0, 2.5); bed('crowd', 12.0, 18.0, 0.5);
bed('room', 18.0, 23.0, 2);
bed('silence', 23.0, 29.0);
music('tender', 29.2, 36.0, 1);
await run({dir: DIR, duration: 36.0});
