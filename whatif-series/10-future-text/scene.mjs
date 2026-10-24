// What If #10 — What if you got a text from yourself?   (34 s, silent)
import path from 'node:path';
import {GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import {D, shot, run, guy, silhouette, bg, floor, table, windowFrame, card, phoneCloseup, textMsg, phoneSmall, rr, txt, textWidth, kf, ease, lerp, clamp, twos, mix, walk,
  at, bed, music, STAND, INK, WHITE, GREY, LIGHT, SOFT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf', 'Hand'); // local system font, for the hand-written sign
const BLUE = ACCENTS.blue, PALE = '#E8F0FE', S = 1.3;
const blink = (t, ...ts) => ts.some(b => t > b && t < b + 0.09);
const tick = (ctx, x, y, s = 1, color = INK, w = 7) => D.line(ctx, [[x - 18 * s, y], [x - 4 * s, y + 15 * s], [x + 22 * s, y - 18 * s]], {w, color, amp: 0.2});

// ---------- the phone: a chat with "Me" ----------
/** msgs: [{lines, from:'left'|'right', header, size, check, strike}], newest last; shown from the top, scrolled so the newest is visible */
function chat(c, SX, SY, SW, SH, msgs, {typing = 0, t = 0, pop = 1} = {}) {
  txt(c, '9:13', SX + 72, SY + 40, 30, INK, 'Inter6', 'left');
  rr(c, SX, SY + 76, SW, 150, 0, SOFT); D.line(c, [[SX, SY + 226], [SX + SW, SY + 226]], {w: 2, color: LIGHT});
  D.ellipse(c, SX + SW / 2, SY + 128, 36, 36, {fill: BLUE, w: 0}); txt(c, 'M', SX + SW / 2, SY + 130, 36, WHITE, 'InterTight');
  txt(c, 'Me', SX + SW / 2, SY + 194, 32, INK, 'Inter6'); D.line(c, [[SX + 64, SY + 112], [SX + 44, SY + 132], [SX + 64, SY + 152]], {w: 6, color: BLUE, amp: 0.2});
  // lay out, then scroll so the last bubble ends above the bottom
  c.font = '600 44px Inter6';
  const hs = msgs.map(m => (m.header ? 52 : 0) + m.lines.length * (m.size || 44) * 1.3 + 40 + 34);
  let total = hs.reduce((a, b) => a + b, 0) + (typing ? 110 : 0), y = SY + 280 - Math.max(0, total - (SH - 330));
  msgs.forEach((m, i) => {
    if (m.header) y += 52;
    const last = i === msgs.length - 1, k = last ? pop : 1;
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 40);
    const right = m.from === 'right', h = textMsg(c, SX, SY, SW, y, m.lines, {from: m.from || 'left', color: right ? BLUE : PALE, ink: right ? WHITE : INK, size: m.size || 44, header: m.header});
    if (m.check) { const w = Math.min(SW - 120, Math.max(...m.lines.map(s => textWidth(c, s, m.size || 44, 'Inter6'))) + 70); tick(c, right ? SX + SW - 40 - w - 40 : SX + 40 + w + 40, y + h / 2, 1.1, BLUE); }
    if (m.strike) { const w = Math.min(SW - 120, Math.max(...m.lines.map(s => textWidth(c, s, m.size || 44, 'Inter6'))) + 70); D.line(c, [[SX + 60, y + h / 2], [SX + 60 + (w - 40) * m.strike, y + h / 2 + 2]], {w: 5}); }
    c.restore(); y += h + 34;
  });
  if (typing) { rr(c, SX + 40, y + 10, 150, 76, 38, PALE); for (let k = 0; k < 3; k++) D.dot(c, SX + 80 + k * 36, y + 48 - Math.max(0, Math.sin(t * 9 - k * 0.8)) * 8, 9, 9, GREY); }
}
const M1 = {lines: ["DON'T OPEN", 'THE DOOR.'], header: 'Tomorrow, 9:14 PM', size: 54};
const M2 = {lines: ['Good. Now close', 'the window.'], header: 'Tomorrow, 9:15 PM'};
const M3 = {lines: ['Unplug the toaster.'], header: 'Tomorrow, 9:17 PM'};
const M4 = {lines: ["Delete Sam's number."]};
const M5 = {lines: ['Cancel Friday.']};
const M6 = {lines: ["Don't read the sign."], header: 'Tomorrow, 9:31 PM', size: 50};
const DONE = {lines: ['Done.'], from: 'right', check: true};

// ---------- set pieces ----------
const DOORX = 860;
function frontDoor(ctx, {rattle = 0, t = 0} = {}) {
  D.rect(ctx, DOORX, 860, 280, GROUND - 860, {fill: WHITE, w: 7});
  D.line(ctx, [[DOORX + 30, 900], [DOORX + 250, 900], [DOORX + 250, 1180], [DOORX + 30, 1180], [DOORX + 30, 900]], {w: 3, color: GREY});
  D.ellipse(ctx, DOORX + 140, 960, 11, 11, {fill: INK, w: 3}); // the peephole
  const j = rattle ? Math.sin(t * 70) * 7 * rattle : 0, a = rattle ? Math.sin(t * 55) * 0.4 * rattle : 0;
  ctx.save(); ctx.translate(DOORX + 46, 1240 + j); ctx.rotate(a); D.dot(ctx, 0, 0, 14, 14); D.line(ctx, [[0, 0], [44, 0]], {w: 10}); ctx.restore();
  if (rattle > 0.2) for (const k of [-1, 1]) D.line(ctx, [[DOORX + 20, 1240 + k * 40], [DOORX - 10, 1240 + k * 56]], {w: 3.5});
}
function flat(ctx) { bg(ctx); floor(ctx, -600, 2400); windowFrame(ctx, 110, 640, 280, 330); D.line(ctx, [[40, 1250], [260, 1250]], {w: 6}); D.line(ctx, [[60, 1250], [60, GROUND]], {w: 5}); D.line(ctx, [[240, 1250], [240, GROUND]], {w: 5}); D.ellipse(ctx, 150, 1230, 50, 16, {w: 4, fill: WHITE}); }

// ---------- S1 0–1.6: a text from Me, sent tomorrow. Then: knock knock. ----------
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx);
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => chat(c, SX, SY, SW, SH, [M1], {pop: ease(lt / 0.2 + 0.4), t}), {buzz: lt < 0.5 ? 1 : 0, t});
  at(t, 0.02, 'ping', 0.8); at(t, 0.05, 'buzz', 0.5); at(t, 1.0, 'knock', 0.9); at(t, 1.24, 'knock', 0.9);
}, {cam: lt => ({z: lerp(1.42, 1.5, lt / 1.6), fx: 640, fy: lerp(860, 830, lt / 1.6)}), hand: 1.2, shake: lt => (lt > 1.0 && lt < 1.1) || (lt > 1.24 && lt < 1.34) ? 6 : 0});

// ---------- S2 1.6–2.9: premise card ----------
shot(1.6, 2.9, (ctx, lt) => { bg(ctx); at(1.6 + lt, 1.6, 'cut'); card(ctx, [['WHAT IF YOU GOT A TEXT', INK], ['FROM YOURSELF?', BLUE]], {lt, size: 86}); });

// ---------- S3 2.9–9.0: knocking, the handle rattles, he backs away. Then it stops. ----------
shot(2.9, 9.0, (ctx, lt, t) => {
  flat(ctx);
  const rattle = lt > 2.6 && lt < 3.9 ? 1 : 0;
  frontDoor(ctx, {rattle, t});
  const T = twos(lt), back = ease((lt - 1.4) / 2.6), x = lerp(640, 420, back), backing = lt > 1.4 && lt < 4.0;
  const p = backing ? {...walk(-T * 1.4), lean: -0.1, lh: [-30, -150], rh: [70, -330], elbow: [1, 1]} :
    lt < 1.4 ? kf([[0, {...STAND, rh: [70, -330], elbow: [1, 1]}], [0.3, {...STAND, hip: [0, -232], rh: [70, -330], elbow: [1, 1]}], [0.6, {...STAND, lean: -0.08, rh: [70, -330], elbow: [1, 1]}]], T)
    : kf([[4.0, {...STAND, lean: -0.1, rh: [70, -330], elbow: [1, 1]}], [4.6, {...STAND, lean: -0.04, lh: [-30, -250], rh: [70, -330], elbow: [1, 1]}], [6.1, {...STAND, lean: -0.02, hip: [0, -222], lh: [-30, -250], rh: [70, -330], elbow: [1, 1]}]], T);
  guy(ctx, x, GROUND, S, p, {mouth: lt > 4.2 ? 'flat' : 'O', eyes: blink(lt, 5.3) ? 'closed' : 'wide', gx: 0.9, gy: lt > 4.8 && lt < 5.6 ? 0.7 : -0.1, sweat: lt > 2.6}, {after: (c, j) => phoneSmall(c, j.rh[0], j.rh[1] - 28, 0, 1, true, '#BFD8FF')});
  for (const k of [3.0, 3.3, 3.6, 4.4, 4.7, 5.0]) at(t, k, 'knock', 0.9);
  for (let k = 0; k < 8; k++) at(t, 5.5 + k * 0.16, 'click', 0.5);
  at(t, 7.0, 'breath', 0.5);
}, {cam: lt => ({z: lerp(1.15, 1.32, ease(lt / 6)), fx: lerp(700, 640, ease(lt / 6)), fy: lerp(1200, 1220, ease(lt / 6))}), hand: 1.3,
  shake: lt => [0.1, 0.4, 0.7, 1.5, 1.8, 2.1].some(k => lt > k && lt < k + 0.08) ? 5 : 0});

// ---------- S4 9.0–10.8: phone ----------
shot(9.0, 10.8, (ctx, lt, t) => {
  bg(ctx); phoneCloseup(ctx, (c, SX, SY, SW, SH) => chat(c, SX, SY, SW, SH, [M1, M2], {pop: ease((lt - 0.3) / 0.2), t}), {buzz: lt > 0.3 && lt < 0.7 ? 1 : 0, t});
  at(t, 9.3, 'ping', 0.8);
}, {cam: lt => ({z: lerp(1.38, 1.44, lt / 1.8), fx: 640, fy: 860}), hand: 1});
// ---------- S4b 10.8–13.0: he closes the window — and something passes outside ----------
shot(10.8, 13.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  const WX = 360, WY = 620, WW = 380, WH = 460, down = ease((lt - 0.3) / 0.5);
  // outside: the shape, clipped to the glass
  ctx.save(); ctx.beginPath(); ctx.rect(WX, WY, WW, WH); ctx.clip(); ctx.fillStyle = SOFT; ctx.fillRect(WX, WY, WW, WH);
  if (lt > 1.0) silhouette(ctx, lerp(WX - 220, WX + WW + 260, (lt - 1.0) / 0.8), WY + WH + 420, 1.3, walk(lt * 3), 'rgba(17,17,17,0.85)');
  ctx.restore();
  D.rect(ctx, WX, WY, WW, WH, {w: 7}); D.line(ctx, [[WX - 20, WY + WH], [WX + WW + 20, WY + WH]], {w: 8});
  const sy = lerp(WY + 20, WY + WH / 2, down); D.rect(ctx, WX + 10, sy - 20, WW - 20, WH / 2 + 10, {w: 5}); D.line(ctx, [[WX + 10, WY + WH / 2], [WX + WW - 10, WY + WH / 2]], {w: 3, color: GREY});
  const T = twos(lt);
  const p = kf([[0, {...STAND, lean: 0.05, lh: [70, -560], rh: [100, -575], elbow: [1, 1]}], [0.3, {...STAND, lean: 0.05, lh: [70, -560], rh: [100, -575], elbow: [1, 1]}],
    [0.8, {...STAND, lean: 0.05, lh: [80, -430], rh: [110, -440], elbow: [1, 1]}], [1.1, {...STAND, lean: 0.05, lh: [80, -430], rh: [110, -440], elbow: [1, 1]}], [1.4, {...STAND, lean: -0.15, hip: [0, -228], lh: [40, -380], rh: [60, -300], elbow: [1, 1]}]], T);
  guy(ctx, 860, GROUND, S, p, {mouth: lt > 1.3 ? 'O' : 'flat', eyes: lt > 1.3 ? 'wide' : undefined, gx: 0.9, gy: -0.2, sweat: lt > 1.4}, {flip: true});
  at(t, 11.4, 'thud', 0.5); at(t, 11.9, 'whoosh', 0.8);
}, {cam: lt => ({z: lerp(1.3, 1.38, lt / 2.2), fx: 660, fy: 1100}), hand: 1});

// ---------- S5 13.0–20.0: montage. He does everything it says. ----------
shot(13.0, 14.3, (ctx, lt, t) => {
  bg(ctx); phoneCloseup(ctx, (c, SX, SY, SW, SH) => chat(c, SX, SY, SW, SH, [M2, {...DONE}, M3], {pop: ease((lt - 0.15) / 0.2), t}), {buzz: lt < 0.4 ? 0.6 : 0, t});
  at(t, 13.15, 'ping', 0.7);
}, {cam: () => ({z: 1.38, fx: 640, fy: 880}), hand: 1});
shot(14.3, 15.4, (ctx, lt, t) => { // the toaster
  bg(ctx); floor(ctx, -600, 2400); table(ctx, 260, {w: 460});
  rr(ctx, 330, 1100, 220, 150, 40, WHITE, INK, 6); D.line(ctx, [[380, 1120], [460, 1120]], {w: 6}); D.line(ctx, [[400, 1140], [480, 1140]], {w: 6});
  D.rect(ctx, 760, 1120, 60, 80, {fill: WHITE, w: 5}); D.dot(ctx, 780, 1150, 4, 6); D.dot(ctx, 800, 1150, 4, 6);
  const T = twos(lt), pull = ease((lt - 0.35) / 0.25);
  const j = guy(ctx, 990, GROUND, S, {...STAND, lean: 0.06, rh: [mix(140, 190, pull), mix(-330, -350, pull)], lh: [60, -150], elbow: [1, 1]}, {mouth: 'flat', gx: 0.8, gy: 0.4, eyes: blink(lt, 0.8) ? 'closed' : undefined}, {flip: true});
  const hx = 990 - j.rh[0] * S, hy = GROUND + j.rh[1] * S;
  D.line(ctx, D.curve([550, 1200], [hx - 10, hy], -60 + pull * 20, 10), {w: 4}); D.rect(ctx, hx - 30, hy - 14, 30, 28, {fill: INK, w: 3});
  if (pull > 0.9) tick(ctx, 640, 900, 2.2, BLUE, 10);
  at(t, 14.68, 'pop', 0.7); at(t, 14.75, 'click', 0.6);
}, {cam: () => ({z: 1.45, fx: 700, fy: 1150}), hand: 1});
shot(15.4, 17.6, (ctx, lt, t) => { // Sam's number: he hesitates, then deletes
  bg(ctx);
  const tap = lt > 1.45, k = ease((lt - 1.5) / 0.25);
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => {
    txt(c, '9:18', SX + 72, SY + 40, 30, INK, 'Inter6', 'left');
    D.line(c, [[SX + 64, SY + 112], [SX + 44, SY + 132], [SX + 64, SY + 152]], {w: 6, color: BLUE, amp: 0.2});
    D.ellipse(c, SX + SW / 2, SY + 330, 110, 110, {fill: LIGHT, w: 0}); txt(c, 'S', SX + SW / 2, SY + 335, 110, WHITE, 'InterTight');
    txt(c, 'Sam', SX + SW / 2, SY + 520, 72, INK, 'InterTight'); txt(c, 'mobile  +1 415 555 0148', SX + SW / 2, SY + 600, 30, GREY, 'Inter4');
    rr(c, SX + 60, SY + 900, SW - 120, 110, 30, tap ? LIGHT : SOFT); txt(c, 'Delete Contact', SX + SW / 2, SY + 956, 44, INK, 'Inter6');
    if (k > 0) { c.save(); c.globalAlpha = k; rr(c, SX + 60, SY + 680, SW - 120, 140, 30, PALE); txt(c, 'Deleted', SX + SW / 2 - 30, SY + 750, 48, INK, 'Inter6'); tick(c, SX + SW / 2 + 110, SY + 748, 1.4, BLUE); c.restore(); }
  }, {t, thumb: [lerp(900, 640, ease(lt / 0.5)) + (lt > 0.5 && lt < 1.4 ? Math.sin(lt * 9) * 26 : 0), lerp(1500, 1350, ease(lt / 0.5)) + (lt > 1.35 && lt < 1.6 ? 18 : 0) - (lt > 0.6 && lt < 1.3 ? 190 : 0) - 40]});
  at(t, 16.9, 'click', 0.8); at(t, 17.0, 'swipe', 0.4);
}, {cam: () => ({z: 1.32, fx: 640, fy: 980}), hand: 1.2});
shot(17.6, 18.8, (ctx, lt, t) => {
  bg(ctx); phoneCloseup(ctx, (c, SX, SY, SW, SH) => chat(c, SX, SY, SW, SH, [M3, DONE, M4, DONE, M5], {pop: ease((lt - 0.1) / 0.2), t}), {buzz: lt < 0.4 ? 0.6 : 0, t});
  at(t, 17.7, 'ping', 0.7);
}, {cam: () => ({z: 1.38, fx: 640, fy: 880}), hand: 1});
shot(18.8, 20.0, (ctx, lt, t) => { // Friday, cancelled
  bg(ctx);
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => {
    txt(c, '9:20', SX + 72, SY + 40, 30, INK, 'Inter6', 'left');
    txt(c, 'FRIDAY', SX + 60, SY + 200, 64, BLUE, 'InterTight', 'left');
    for (let k = 0; k < 6; k++) { const y = SY + 300 + k * 140; D.line(c, [[SX + 40, y], [SX + SW - 40, y]], {w: 2, color: LIGHT}); txt(c, `${5 + k} PM`, SX + 50, y + 26, 26, GREY, 'Inter4', 'left'); }
    const st = ease((lt - 0.3) / 0.3);
    rr(c, SX + 170, SY + 720, SW - 210, 180, 20, PALE); txt(c, 'Dinner with Sam', SX + 200, SY + 790, 40, INK, 'Inter6', 'left'); txt(c, '8:00 PM', SX + 200, SY + 845, 30, GREY, 'Inter4', 'left');
    if (st > 0) D.line(c, [[SX + 190, SY + 792], [SX + 190 + 340 * st, SY + 794]], {w: 6});
    if (st > 0.9) { txt(c, 'Cancelled', SX + 200, SY + 980, 44, INK, 'Inter6', 'left'); tick(c, SX + 440, SY + 978, 1.3, BLUE); }
  }, {t, thumb: [760, lt > 0.2 && lt < 0.4 ? 1180 : 1260]});
  at(t, 19.05, 'click', 0.7); at(t, 19.3, 'swipe', 0.4);
}, {cam: lt => ({z: lerp(1.32, 1.36, lt), fx: 640, fy: 960}), hand: 1});

// ---------- S6 20.0–25.0: knocking again, softer. He goes to the peephole. ----------
shot(20.0, 25.0, (ctx, lt, t) => {
  flat(ctx); frontDoor(ctx, {t});
  const T = twos(lt), go = ease((lt - 1.2) / 2.0), x = lerp(420, 715, go), walking = lt > 1.2 && lt < 3.2;
  const p = walking ? {...walk(T * 1.1), lh: [-20, -120], rh: [70, -330], elbow: [1, 1], lean: 0.08}
    : lt < 1.2 ? {...STAND, rh: [70, -330], elbow: [1, 1], headLean: -0.05} : kf([[3.2, {...STAND, rh: [70, -330], elbow: [1, 1]}], [4.0, {...STAND, lean: 0.22, headLean: 0.05, rh: [70, -300], lh: [120, -420], elbow: [1, 1]}]], T);
  guy(ctx, x, GROUND, S, p, {mouth: 'flat', eyes: lt > 4.0 ? 'oneOpen' : blink(lt, 0.7) ? 'closed' : 'wide', gx: 0.9, gy: lt > 3.8 ? -0.3 : 0, sweat: lt > 2}, {after: (c, j) => phoneSmall(c, j.rh[0], j.rh[1] - 28, 0, 1, false)});
  for (const k of [20.3, 20.65, 21.9, 22.25]) at(t, k, 'knock', 0.35);
  for (let k = 0; k < 4; k++) at(t, 22.6 + k * 0.75, 'heart', 0.8);
}, {cam: lt => ({z: lerp(1.2, 1.55, ease((lt - 1) / 4)), fx: lerp(640, 800, ease((lt - 1) / 4)), fy: lerp(1200, 1050, ease((lt - 1) / 4))}), hand: 1.2});

// ---------- S7 25.0–30.0: through the peephole. It's him — exhausted — with a sign. ----------
function heavyEyes(c, j) { // drooping lids and bags, drawn over the default eyes
  c.save(); c.translate(j.head[0], j.head[1]); c.rotate(j.tilt || 0);
  for (const x of [-19, 19]) { c.fillStyle = WHITE; c.fillRect(x - 11, -22, 22, 14); D.line(c, [[x - 12, -8], [x + 11, -7]], {w: 5, amp: 0.2}); D.line(c, D.curve([x - 10, 12], [x + 10, 12], 5, 6), {w: 2.5, color: GREY}); }
  c.restore();
}
shot(25.0, 30.0, (ctx, lt, t) => {
  bg(ctx, INK);
  const CX = 640, CY = 1060, R = 500 + lt * 6;
  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 6.283); ctx.clip();
  ctx.fillStyle = WHITE; ctx.fillRect(0, 0, 1280, 2276);
  // the hallway, slightly fish-eyed: a far door, a ceiling light that flickers
  ctx.save(); ctx.translate(CX, CY); ctx.scale(1.06, 1.06); ctx.translate(-CX, -CY);
  D.line(ctx, [[180, 1640], [1100, 1640]], {w: 5}); D.line(ctx, [[180, 560], [1100, 560]], {w: 4}); D.line(ctx, [[180, 560], [330, 760], [330, 1440], [180, 1640]], {w: 4}); D.line(ctx, [[1100, 560], [950, 760], [950, 1440], [1100, 1640]], {w: 4});
  D.line(ctx, [[330, 760], [950, 760]], {w: 3, color: GREY}); D.line(ctx, [[330, 1440], [950, 1440]], {w: 3, color: GREY});
  D.rect(ctx, 990, 900, 70, 470, {w: 4, color: GREY});
  const fl = (lt > 1.6 && lt < 1.7) || (lt > 3.4 && lt < 3.46) ? 0.25 : 1;
  D.line(ctx, [[640, 560], [640, 610]], {w: 3}); D.ellipse(ctx, 640, 622, 46, 14, {fill: fl < 1 ? GREY : '#FFF3C4', w: 3});
  const T = twos(lt), sag = Math.sin(T * 1.3) * 6, lift = ease((lt - 1.0) / 0.5) * 30;
  const pose = {...STAND, hip: [0, -218 + sag * 0.3], lean: 0.05, headLean: 0.14 + Math.sin(T * 0.8) * 0.04, headTilt: 0.12, lh: [-80, -300 - lift], rh: [80, -300 - lift], elbow: [-1, 1], knee: [-1, -1]};
  guy(ctx, 640, 1560, 1.45, pose, {mouth: lt > 3.6 && lt < 4.2 ? 'wavy' : 'flat', gx: 0, gy: -0.1, sweat: true, eyes: blink(lt, 2.4) ? 'closed' : undefined}, {after: (c, j) => {
    if (!blink(lt, 2.4)) heavyEyes(c, j);
    c.save(); c.translate((j.lh[0] + j.rh[0]) / 2, (j.lh[1] + j.rh[1]) / 2 + 40); c.rotate(-0.03 + Math.sin(T * 1.1) * 0.015);
    D.rect(c, -265, -100, 530, 210, {fill: WHITE, w: 5}); D.line(c, [[235, -100], [265, -70]], {w: 3, color: GREY});
    D.text(c, "THOSE TEXTS", 0, -40, {size: 54, font: 'Hand', color: INK});
    D.text(c, "AREN'T FROM ME.", 0, 40, {size: 54, font: 'Hand', color: INK});
    c.restore(); }});
  ctx.restore();
  // lens vignette
  const g = ctx.createRadialGradient(CX, CY, R * 0.75, CX, CY, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 2276);
  ctx.restore();
  at(t, 25.05, 'click', 0.3);
}, {cam: () => ({z: 1, fx: 640, fy: 1138}), hand: 2.2});

// ---------- S8 30.0–34.0: buzz. "Don't read the sign." Then it starts typing again. Hard cut. ----------
shot(30.0, 34.0, (ctx, lt, t) => {
  bg(ctx);
  const arrived = lt > 0.7;
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => chat(c, SX, SY, SW, SH, arrived ? [M5, DONE, M6] : [M5, DONE], {typing: (!arrived && lt > 0.05) || lt > 3.1 ? 1 : 0, pop: ease((lt - 0.7) / 0.15), t}),
    {buzz: arrived && lt < 1.3 ? 1 : 0, t, thumb: [900 + (lt > 1.3 ? Math.sin(lt * 23) * 3 : 0), 1300]});
  at(t, 30.7, 'buzz', 0.9); at(t, 30.72, 'hit', 0.9);
}, {cam: lt => ({z: lerp(1.38, 1.6, ease((lt - 0.7) / 3.3)), fx: 640, fy: lerp(880, 900, ease((lt - 0.7) / 3.3))}), hand: 1.2});

bed('room', 2.9, 9.0, 0.7); music('eerie', 2.9, 20.0, 0.9); bed('silence', 7.6, 8.9);
bed('room', 9.0, 20.0, 0.5); bed('room', 20.0, 25.0, 0.6); bed('silence', 25.0, 30.0); bed('silence', 31.6, 34.0);
await run({dir: DIR, duration: 34.0});
