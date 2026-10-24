// What If #09 — What if you met yourself at age 8?   (38 s, silent)
import path from 'node:path';
import {GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import {D, shot, run, guy, textWidth, bg, floor, table, chair, door, windowFrame, card, rr, txt, kf, step, ease, lerp, clamp, twos, mix, walk,
  at, bed, music, STAND, SEATED, INK, WHITE, GREY, LIGHT, SOFT, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf', 'Hand'); // local system font, for the kid's handwriting
const RED = ACCENTS.red, S = 1.3, KS = 0.68 * S, CARD = '#A8865A', PENCIL = '#3A3A3A';
const CAP = {kind: 'cap', color: RED};
const hand = (ctx, s, x, y, size, rot = 0, color = PENCIL) => D.text(ctx, s, x, y, {size, font: 'Hand', weight: 700, color, rot});
const kid = (ctx, x, p, face, o = {}) => guy(ctx, x, GROUND, KS, p, face, {...o, accent: CAP});
const blink = (t, ...ts) => ts.some(b => t > b && t < b + 0.09);

// ---------- props ----------
/** the crayon drawing: a rocket with a little astronaut, labelled ME. centred at (0,0), 240 × 180 */
function drawing(ctx, w = 240, h = 180) {
  D.rect(ctx, -w / 2, -h / 2, w, h, {fill: WHITE, w: 4});
  D.line(ctx, [[-20, 60], [-20, -20], [0, -62], [20, -20], [20, 60]], {w: 3.5, color: PENCIL, amp: 2.5});
  D.line(ctx, [[-20, 40], [-44, 66], [-20, 60]], {w: 3.5, color: PENCIL, amp: 2}); D.line(ctx, [[20, 40], [44, 66], [20, 60]], {w: 3.5, color: PENCIL, amp: 2});
  D.ellipse(ctx, 0, 4, 12, 12, {w: 3, color: PENCIL, amp: 1.5}); D.dot(ctx, -4, 2, 2, 2, PENCIL); D.dot(ctx, 4, 2, 2, 2, PENCIL);
  for (const k of [-10, 0, 10]) D.line(ctx, [[k, 64], [k * 1.4, 84]], {w: 3, color: PENCIL, amp: 2});
  hand(ctx, 'ME', 72, -30, 54, -0.1); D.line(ctx, [[54, -6], [16, 2]], {w: 3, color: PENCIL, amp: 1.5}); D.line(ctx, [[16, 2], [28, -6]], {w: 3, color: PENCIL}); D.line(ctx, [[16, 2], [27, 10]], {w: 3, color: PENCIL});
  for (const [x, y] of [[-90, -60], [-70, 40], [96, 50], [-100, -10]]) { D.line(ctx, [[x - 7, y], [x + 7, y]], {w: 2.5, color: PENCIL}); D.line(ctx, [[x, y - 7], [x, y + 7]], {w: 2.5, color: PENCIL}); }
}
function note(ctx, lines, w = 300, h = 200, size = 66) {
  D.rect(ctx, -w / 2, -h / 2, w, h, {fill: WHITE, w: 4});
  lines.forEach((s, i) => hand(ctx, s, 0, (i - (lines.length - 1) / 2) * size * 1.1 + 4, size, -0.03, INK));
}
function laptop(ctx, x, y, open = 1) { // small, on a table: base at (x, y)
  D.line(ctx, [[x - 110, y], [x + 110, y]], {w: 7});
  D.line(ctx, [[x - 100, y - 4], [x - 120, y - 150], [x + 80, y - 150], [x + 100, y - 4]], {w: 5, fill: WHITE});
  for (let k = 0; k < 4; k++) D.line(ctx, [[x - 88 + k * 2, y - 120 + k * 26], [x + 50, y - 120 + k * 26]], {w: 3, color: GREY});
}
function takeaway(ctx, x, y, s = 1, r = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
  D.line(ctx, [[-50, 0], [-62, -90], [62, -90], [50, 0], [-50, 0]], {w: 4.5, fill: WHITE}); D.line(ctx, [[-62, -90], [-40, -110], [40, -110], [62, -90]], {w: 4});
  D.line(ctx, [[-30, -110], [0, -150], [30, -110]], {w: 3, color: GREY}); ctx.restore();
}
function sheets(ctx, x, y) { // a pile of spreadsheets
  for (let k = 0; k < 3; k++) { const ox = k * 10 - 10, oy = -k * 7; D.rect(ctx, x - 80 + ox, y - 14 + oy, 160, 14, {fill: WHITE, w: 3}); }
  ctx.save(); ctx.translate(x + 120, y - 2); ctx.rotate(-0.25); D.rect(ctx, -60, -80, 120, 80, {fill: WHITE, w: 3.5});
  for (let i = 1; i < 4; i++) D.line(ctx, [[-60, -80 + i * 20], [60, -80 + i * 20]], {w: 2, color: GREY, amp: 0.3});
  for (let i = 1; i < 3; i++) D.line(ctx, [[-60 + i * 40, -80], [-60 + i * 40, 0]], {w: 2, color: GREY, amp: 0.3}); ctx.restore();
}
/** the cardboard rocket, base centred at (x, y). parts: fins 0..2, nose 0..1 (1 = in place), win 0..1 */
function rocket(ctx, x, y, {s = 1, fins = 2, nose = 1, noseOff = [0, 0], win = 1, stripes = 0} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const c = {color: CARD};
  if (fins > 0) D.line(ctx, [[-60, -120], [-120, 0], [-60, -10]], {w: 5, ...c, fill: WHITE});
  if (fins > 1) D.line(ctx, [[60, -120], [120, 0], [60, -10]], {w: 5, ...c, fill: WHITE});
  D.rect(ctx, -60, -380, 120, 380, {fill: WHITE, w: 5, ...c});
  for (const yy of [-300, -200, -100]) D.line(ctx, [[-60, yy], [60, yy + 4]], {w: 2.5, color: CARD, amp: 0.6});
  if (win > 0) { ctx.save(); ctx.globalAlpha *= win; D.ellipse(ctx, 0, -260, 32, 32, {w: 4.5, fill: WHITE}); D.dot(ctx, -8, -262, 4, 5); D.dot(ctx, 8, -262, 4, 5); ctx.restore(); }
  if (stripes > 0) { ctx.save(); ctx.globalAlpha *= stripes; D.line(ctx, [[-60, -150], [60, -146]], {w: 6, color: PENCIL}); hand(ctx, 'ME', 0, -60, 46, 0, PENCIL); ctx.restore(); }
  if (nose > 0) { ctx.save(); ctx.translate(noseOff[0], noseOff[1]); D.line(ctx, [[-66, -380], [0, -500], [66, -380], [-66, -380]], {w: 5, ...c, fill: WHITE}); ctx.restore(); }
  ctx.restore();
}
function box(ctx, x, y, {open = 0, dust = 0, t = 0} = {}) { // a cardboard box, base centred at (x, y), 260 × 170
  D.rect(ctx, x - 130, y - 170, 260, 170, {fill: WHITE, w: 5, color: CARD});
  const f = open * 1.9;
  D.line(ctx, [[x - 130, y - 170], [x - 130 - Math.sin(f) * 90, y - 170 - Math.cos(f) * 90]], {w: 5, color: CARD});
  D.line(ctx, [[x + 130, y - 170], [x + 130 + Math.sin(f) * 90, y - 170 - Math.cos(f) * 90]], {w: 5, color: CARD});
  if (open < 0.1) D.line(ctx, [[x - 130, y - 172], [x + 130, y - 172]], {w: 5, color: CARD});
  if (dust > 0) for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 60 + dust * 140 + (k % 3) * 20; D.dot(ctx, x + Math.cos(a) * r, y - 170 + Math.sin(a) * r * 0.5 - dust * 60, 4, 4, `rgba(138,138,138,${0.8 * (1 - dust)})`); }
}
function room(ctx, {night = false} = {}) {
  bg(ctx); floor(ctx, -600, 2400);
  windowFrame(ctx, 760, 620, 300, 360, night ? INK : WHITE);
  if (night) { D.ellipse(ctx, 980, 700, 34, 34, {fill: WHITE, w: 3}); for (const [x, y] of [[810, 680], [870, 900], [1010, 920], [900, 760]]) D.dot(ctx, x, y, 4, 4, WHITE); }
}

// ---------- S1 0–1.6: he opens the door. A small him in a red cap holds up a crayon rocket labelled ME. ----------
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  const T = twos(lt), op = lerp(0.55, 0.85, ease(lt / 0.5));
  door(ctx, 760, op);
  const bob = Math.sin(T * 6) * 4;
  kid(ctx, 945, {...STAND, hip: [0, -223 + bob], lh: [90, -330], rh: [110, -320], elbow: [1, 1]}, {mouth: lt > 0.6 ? 'grin' : 'smile', gx: 0.5, gy: -0.6}, {flip: true, after: (c, j) => {
    c.save(); c.translate((j.lh[0] + j.rh[0]) / 2 + 10, (j.lh[1] + j.rh[1]) / 2 - 20); c.scale(-1, 1); drawing(c); c.restore(); }});
  guy(ctx, 560, GROUND, S, kf([[0, {...STAND, rh: [190, -260], elbow: [1, 1]}], [0.5, {...STAND, rh: [150, -200], elbow: [1, 1], lean: -0.04}], [1.6, {...STAND, lean: -0.08, headLean: 0.08, rh: [80, -120]}]], T),
    {mouth: lt < 0.3 ? 'flat' : 'O', eyes: lt > 0.3 ? 'wide' : undefined, gx: 0.8, gy: 0.6});
  at(t, 0, 'dooropen', 0.8);
}, {cam: lt => ({z: lerp(1.42, 1.52, lt / 1.6), fx: 740, fy: 1220}), hand: 1});

// ---------- S2 1.6–2.9: premise card ----------
shot(1.6, 2.9, (ctx, lt) => { bg(ctx); at(1.6 + lt, 1.6, 'cut'); card(ctx, [['WHAT IF YOU MET', INK], ['YOURSELF AT AGE 8?', RED]], {lt, size: 100}); });

// ---------- S3 2.9–9.0: the kid walks in and looks around. Then holds the drawing up: this is who we were going to be. ----------
const ADULT = 1090;
function apartment(ctx) {
  bg(ctx); floor(ctx, -600, 2400); windowFrame(ctx, 200, 640, 260, 300);
  table(ctx, 60); laptop(ctx, 220, 1250); sheets(ctx, 370, 1250); takeaway(ctx, 520, 1250, 0.8);
  takeaway(ctx, 640, GROUND, 0.9, 0.05); takeaway(ctx, 720, GROUND, 0.75, -0.3); takeaway(ctx, 690, GROUND - 76, 0.7, 0.2);
}
shot(2.9, 9.0, (ctx, lt, t) => {
  apartment(ctx);
  const T = twos(lt), walkEnd = 2.2, x = lt < walkEnd ? lerp(1330, 770, lt / walkEnd) : 770;
  const turned = lt > 4.0;
  let p, face;
  if (lt < walkEnd) { p = walk(T * 1.8); face = {mouth: 'smile', gx: 0.6, gy: -0.2}; }
  else p = kf([[walkEnd, {...STAND, lh: [70, -300], rh: [90, -290], elbow: [1, 1]}], [4.2, {...STAND, lh: [70, -300], rh: [90, -290], elbow: [1, 1]}],
    [4.7, {...STAND, lh: [-10, -560], rh: [40, -575], elbow: [-1, 1]}], [5.0, {...STAND, hip: [0, -232], lh: [-10, -575], rh: [40, -590], elbow: [-1, 1]}], [5.3, {...STAND, lh: [-10, -560], rh: [40, -575], elbow: [-1, 1]}], [6.1, {...STAND, lh: [-10, -565], rh: [40, -580], elbow: [-1, 1]}]], T);
  if (lt >= walkEnd) face = {mouth: lt < 3.3 ? 'O' : lt < 4.0 ? 'flat' : 'grin', gx: lt < 3.0 ? 0.9 : lt < 3.7 ? 0.5 : turned ? 0.7 : 0.9, gy: lt < 3.0 ? 0.1 : lt < 3.7 ? 0.8 : -0.3, eyes: blink(lt, 3.75) ? 'closed' : turned ? 'happy' : 'wide'};
  // he is walking left (flip) until he turns to the adult
  const holdDrawing = (c, j) => { c.save(); if (lt > 4.5) c.translate((j.lh[0] + j.rh[0]) / 2, (j.lh[1] + j.rh[1]) / 2 - 75); else c.translate((j.lh[0] + j.rh[0]) / 2 + 8, (j.lh[1] + j.rh[1]) / 2 - 10);
    c.scale(turned ? 1 : -1, 1); if (lt < 4.5) c.scale(0.8, 0.8); drawing(c); c.restore(); };
  if (lt < walkEnd) kid(ctx, x, {...p, lh: [60, -310], rh: [80, -300], elbow: [1, 1]}, face, {flip: true, after: holdDrawing});
  else kid(ctx, x, p, face, {flip: !turned, after: holdDrawing});
  // the adult: hand on his neck, follows the kid's eyes around his own flat
  const ap = kf([[0, {...STAND}], [1.2, {...STAND}], [1.7, {...STAND, lh: [20, -250], rh: [40, -240], elbow: [1, 1], headLean: 0.06}], [3.6, {...STAND, lh: [20, -250], rh: [40, -240], elbow: [1, 1], headLean: 0.06}], [4.2, {...STAND, lean: 0.05}], [5.2, {...STAND, lean: 0.1, headLean: 0.08}]], T);
  guy(ctx, ADULT, GROUND, S, ap, {mouth: lt > 4.6 ? 'smile' : 'flat', gx: lt < 2.2 ? 0.7 : lt < 3.8 ? 0.9 : 0.8, gy: lt < 2.2 ? 0.2 : lt < 3.8 ? 0.6 : lt > 4.6 ? -0.1 : 0.4, eyes: blink(lt, 1.0, 5.6) ? 'closed' : undefined}, {flip: true});
  if (lt < walkEnd) for (let k = 0; k < 5; k++) at(t, 2.95 + k * 0.42, 'step', 0.35);
  at(t, 7.5, 'paper', 0.5); at(t, 7.9, 'chuckle', 0.35);
}, {cam: lt => ({z: lerp(1.12, 1.3, ease((lt - 3.5) / 2.5)), fx: lerp(640, 900, ease((lt - 3.5) / 2.5)), fy: lerp(1150, 1200, ease((lt - 3.5) / 2.5))}), hand: 1});

// ---------- S4 9.0–10.6: the adult shows him what he does now ----------
shot(9.0, 10.6, (ctx, lt, t) => {
  bg(ctx);
  // a big laptop, straight on
  rr(ctx, 160, 640, 960, 620, 30, INK); rr(ctx, 190, 670, 900, 560, 12, WHITE);
  D.line(ctx, [[80, 1290], [1200, 1290], [1150, 1350], [130, 1350], [80, 1290]], {w: 6, fill: WHITE});
  const opened = lt > 0.55;
  rr(ctx, 190, 670, 900, 70, 12, SOFT); txt(ctx, 'Inbox', 230, 706, 34, INK, 'Inter6', 'left');
  if (!opened) for (let k = 0; k < 6; k++) { const y = 790 + k * 72; rr(ctx, 220, y, 840, 54, 10, k === 0 ? LIGHT : WHITE, LIGHT, 2); txt(ctx, ['Q3 Report — approved', 'Re: budget v12', 'Meeting moved to 7:30', 'Re: Re: Re: deck', 'Timesheet reminder', 'Weekly KPIs'][k], 250, y + 28, 30, k === 0 ? INK : GREY, 'Inter6', 'left'); }
  else {
    const a = ease((lt - 0.55) / 0.15);
    ctx.save(); ctx.globalAlpha = a;
    // ✓ is not in Inter Tight, so the tick is drawn by hand right after the words
    const tw = textWidth(ctx, 'Q3 REPORT APPROVED', 62), x0 = 640 - (tw + 70) / 2;
    txt(ctx, 'Q3 REPORT APPROVED', x0, 850, 62, INK, 'InterTight', 'left');
    D.line(ctx, [[x0 + tw + 22, 850], [x0 + tw + 40, 872], [x0 + tw + 74, 820]], {w: 9, amp: 0.3});
    for (let k = 0; k < 5; k++) rr(ctx, 260, 950 + k * 50, k === 4 ? 400 : 760, 18, 9, LIGHT);
    ctx.restore();
  }
  // his hand on the trackpad, from the lower right
  const tap = lt > 0.42 && lt < 0.56 ? 10 : 0;
  D.line(ctx, [[1300, 1700], [880, 1340 + tap]], {w: 8}); D.ellipse(ctx, 860, 1330 + tap, 34, 26, {fill: WHITE, w: 6, rot: -0.6});
  at(t, 9.5, 'click', 0.7); at(t, 9.6, 'notif', 0.3);
}, {cam: lt => ({z: lerp(1.2, 1.28, lt / 1.6), fx: 640, fy: 1000}), hand: 0.8});
// ---------- S4b 10.6–12.0: the kid's face drops ----------
shot(10.6, 12.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  const T = twos(lt), drop = ease((lt - 0.5) / 0.4);
  kid(ctx, 640, {...STAND, headLean: drop * 0.12, lh: [mix(-10, 60, drop), mix(-565, -300, drop)], rh: [mix(40, 80, drop), mix(-580, -290, drop)], elbow: [1, 1]},
    {mouth: lt < 0.5 ? 'grin' : drop < 0.6 ? 'flat' : 'frown', eyes: lt < 0.5 ? 'happy' : undefined, gx: -0.2, gy: lerp(-0.3, 0.6, drop)}, {after: (c, j) => {
      c.save(); c.translate((j.lh[0] + j.rh[0]) / 2, (j.lh[1] + j.rh[1]) / 2 - lerp(75, 10, drop)); c.rotate(drop * 0.25); drawing(c); c.restore(); }});
  at(t, 11.1, 'cut', 0.25);
}, {cam: lt => ({z: lerp(2.6, 2.8, lt / 1.4), fx: 660, fy: 1160}), hand: 0.6});

// ---------- S5 12.0–19.0: the kid writes one question and holds it up. Long silence. ----------
const KIDX = 300, CH = 930;
shot(12.0, 19.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400); table(ctx, 380); chair(ctx, CH, {flip: true});
  const T = twos(lt), writing = lt < 1.9, held = lt > 2.3;
  const scr = writing ? Math.sin(T * 30) * 12 : 0;
  const kp = writing ? {...STAND, lean: 0.12, headLean: 0.1, lh: [100, -330], rh: [120 + scr, -350 + scr * 0.4], elbow: [1, 1]}
    : kf([[1.9, {...STAND, lean: 0.12, lh: [100, -330], rh: [120, -350], elbow: [1, 1]}], [2.4, {...STAND, lh: [110, -400], rh: [130, -395], elbow: [1, 1]}], [5.8, {...STAND, hip: [0, -220], lh: [110, -400], rh: [130, -395], elbow: [1, 1]}], [6.5, {...STAND, hip: [0, -224], lh: [105, -360], rh: [125, -355], elbow: [1, 1]}]], T);
  kid(ctx, KIDX, kp, {mouth: 'flat', gx: writing ? 0.6 : 0.8, gy: writing ? 0.8 : -0.4, eyes: blink(lt, 4.1, 6.3) ? 'closed' : undefined}, {after: (c, j) => {
    if (!held && !writing && lt < 2.0) return;
    if (writing) return;
    c.save(); c.translate((j.lh[0] + j.rh[0]) / 2 + 150, (j.lh[1] + j.rh[1]) / 2 - 20); c.scale(1.15, 1.15); note(c, ['ARE WE', 'HAPPY?']); c.restore(); }});
  // the note on the table while he writes; the pencil
  if (writing || lt < 2.0) { D.rect(ctx, 400, 1238, 170, 12, {fill: WHITE, w: 3}); const k = clamp(lt / 1.8); for (let i = 0; i < 3; i++) D.line(ctx, [[410 + i * 30, 1236], [410 + i * 30 + 26 * clamp(k * 3 - i), 1234]], {w: 3}); }
  // the adult, sitting. He reads it, blinks, looks down, and doesn't answer.
  const ap = kf([[0, {...SEATED, lh: [80, -200], rh: [100, -200]}], [3.8, {...SEATED}], [4.6, {...SEATED, headLean: 0.22, lean: 0.02}], [6.0, {...SEATED, headLean: 0.25, lean: 0.04, rh: [60, -420], elbow: [1, 1]}], [7.0, {...SEATED, headLean: 0.25, lean: 0.04, rh: [60, -420], elbow: [1, 1]}]], T);
  guy(ctx, CH, GROUND, S, ap, {mouth: lt < 3.0 ? 'flat' : lt < 4.6 ? 'O' : 'frown', gx: lt < 2.4 ? 0.5 : 0.9, gy: lt < 2.4 ? 0.5 : lt < 4.4 ? 0.0 : 0.9, eyes: blink(lt, 3.5) ? 'closed' : lt > 5.2 && lt < 5.5 ? 'closed' : undefined}, {flip: true});
  at(t, 12.15, 'scribble', 0.6); at(t, 12.75, 'scribble', 0.5); at(t, 13.35, 'scribble', 0.5); at(t, 14.3, 'paper', 0.5);
}, {cam: lt => ({z: lerp(1.25, 1.42, ease((lt - 2.3) / 4.7)), fx: lerp(620, 600, ease(lt / 7)), fy: lerp(1220, 1200, ease(lt / 7))}), hand: 0.8});

// ---------- S6 19.0–25.0: the closet. A dusty box. Inside: a half-finished cardboard rocket. ----------
shot(19.0, 25.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -600, 2400);
  // closet
  D.rect(ctx, 700, 660, 340, GROUND - 660, {w: 6}); ctx.fillStyle = SOFT; ctx.fillRect(704, 664, 332, GROUND - 668);
  D.line(ctx, [[700, 860], [1040, 860]], {w: 5}); D.rect(ctx, 1040, 660, 110, GROUND - 660, {fill: WHITE, w: 6});
  for (let k = 0; k < 4; k++) D.line(ctx, [[760 + k * 60, 900], [760 + k * 60, 1100]], {w: 3, color: GREY});
  const T = twos(lt);
  // box path: shelf → his hands → floor
  const onShelf = lt < 1.1, carried = lt >= 1.1 && lt < 2.6;
  const bx = onShelf ? 870 : carried ? lerp(870, 560, ease((lt - 1.1) / 1.5)) : 560, by = onShelf ? 860 : carried ? lerp(860, GROUND, ease((lt - 1.1) / 1.5)) : GROUND;
  const open = ease((lt - 3.2) / 0.6), lift = ease((lt - 4.2) / 1.0);
  const ap = kf([[0, {...STAND}], [0.4, {...STAND}], [0.9, {...STAND, lh: [170, -560], rh: [200, -575], elbow: [1, 1]}], [1.1, {...STAND, lh: [170, -560], rh: [200, -575], elbow: [1, 1]}],
    [2.6, {...STAND, hip: [-30, -150], lean: 0.5, knee: [1, 1], lf: [-60, 0], rf: [60, 0], lh: [130, -110], rh: [170, -120], elbow: [1, 1]}],
    [3.3, {...STAND, hip: [-30, -150], lean: 0.45, knee: [1, 1], lf: [-60, 0], rf: [60, 0], lh: [110, -180], rh: [190, -190], elbow: [1, 1]}],
    [4.2, {...STAND, hip: [-30, -150], lean: 0.4, knee: [1, 1], lf: [-60, 0], rf: [60, 0], lh: [140, -150], rh: [170, -160], elbow: [1, 1]}],
    [5.2, {...STAND, hip: [-30, -160], lean: 0.25, knee: [1, 1], lf: [-60, 0], rf: [60, 0], lh: [150, -300], rh: [170, -310], elbow: [1, 1]}]], T);
  const ax = 400;
  if (!onShelf && !carried) box(ctx, bx, by, {open, dust: clamp((lt - 2.6) / 1.2) * (lt < 3.8 ? 1 : 0), t});
  // the rocket rises out of the box in his hands
  if (lt > 4.2) rocket(ctx, 560, GROUND - 40 - lift * 150, {s: 0.55, fins: 1, nose: 0, win: 0});
  if (!onShelf && !carried) D.rect(ctx, bx - 130, by - 120, 260, 120, {fill: WHITE, w: 5, color: CARD}); // box front over the rocket
  guy(ctx, ax, GROUND, S, ap, {mouth: lt > 4.8 ? 'smile' : lt > 3.6 ? 'O' : 'flat', gx: 0.8, gy: lt < 1.2 ? -0.8 : 0.8, eyes: blink(lt, 2.0) ? 'closed' : lt > 3.6 && lt < 4.8 ? 'wide' : undefined}, {});
  if (onShelf || carried) { box(ctx, bx, by, {t}); if (carried) box(ctx, bx, by, {dust: clamp((lt - 1.1) / 1.5), t}); }
  // the kid watches from behind him, steps closer when the rocket appears
  const kx = lt < 4.6 ? 180 : lerp(180, 260, ease((lt - 4.6) / 0.8)), kw = lt > 4.6 && lt < 5.4;
  kid(ctx, kx, kw ? walk(T * 2) : {...STAND, hip: [0, -223 + Math.sin(T * 3) * 3]}, {mouth: lt > 4.6 ? 'grin' : 'flat', eyes: lt > 4.6 ? 'happy' : undefined, gx: 0.8, gy: lt < 1.2 ? -0.8 : 0.3});
  at(t, 19.4, 'dooropen', 0.4); at(t, 20.1, 'paper', 0.6); at(t, 21.6, 'thud', 0.5); at(t, 22.2, 'paper', 0.6); at(t, 22.5, 'paper', 0.5); at(t, 23.3, 'paper', 0.5);
}, {cam: lt => ({z: lerp(1.15, 1.32, ease(lt / 6)), fx: lerp(640, 520, ease(lt / 6)), fy: lerp(1150, 1230, ease(lt / 6))}), hand: 1});

// ---------- S7 25.0–31.0: on the floor, they build it together. The kid laughs. ----------
const FLOOR_SIT = {hip: [0, -60], lean: 0.02, lf: [150, -2], rf: [185, -2], knee: [-1, -1], lh: [100, -250], rh: [130, -260], elbow: [1, 1], footDir: [1, 1]};
shot(25.0, 31.0, (ctx, lt, t) => {
  room(ctx);
  const T = twos(lt), RX = 640;
  const finIn = ease((lt - 0.4) / 1.0), winIn = ease((lt - 2.0) / 0.6);
  rocket(ctx, RX, GROUND, {fins: 1 + (finIn > 0.98 ? 1 : 0), nose: 0, win: winIn});
  if (finIn < 0.98) { const fx = lerp(820, RX + 60, finIn); D.line(ctx, [[fx, GROUND - 120 - (1 - finIn) * 150], [fx + 60, GROUND - (1 - finIn) * 150], [fx, GROUND - 10 - (1 - finIn) * 150]], {w: 5, color: CARD, fill: WHITE}); }
  const laugh = lt > 2.8 && lt < 4.6, bob = laugh ? Math.abs(Math.sin(T * 12)) * 8 : 0;
  // the adult holds the rocket steady, then tapes the fin on the far side
  guy(ctx, 380, GROUND, S, kf([[0, {...FLOOR_SIT, rh: [210, -330], lh: [190, -300]}], [2.5, {...FLOOR_SIT, rh: [210, -330], lh: [190, -300]}], [3.0, {...FLOOR_SIT, headLean: -0.1, rh: [120, -230], lh: [100, -220]}], [6, {...FLOOR_SIT, rh: [210, -380], lh: [190, -330]}]], T),
    {mouth: laugh ? 'grin' : 'smile', eyes: laugh ? 'happy' : blink(lt, 1.6) ? 'closed' : undefined, gx: lt > 2.6 ? 0.9 : 0.6, gy: lt > 2.6 && lt < 4.6 ? -0.2 : 0.2});
  // the kid fits the fin, draws the window, falls about laughing
  const kp = lt < 1.4 ? kf([[0, {...FLOOR_SIT, lh: [200, -170], rh: [230, -180]}], [1.4, {...FLOOR_SIT, lh: [230, -150], rh: [260, -160]}]], T)
    : lt < 2.7 ? {...FLOOR_SIT, lean: 0.12, rh: [260 + Math.sin(T * 25) * 14, -560 * 0.5 - 20 + Math.cos(T * 25) * 14], lh: [120, -160], elbow: [1, 1]}
    : laugh ? {...FLOOR_SIT, hip: [0, -60 - bob], lean: -0.2, headLean: -0.15, lh: [60, -180], rh: [80, -200]} : {...FLOOR_SIT, lh: [150, -240], rh: [190, -270]};
  kid(ctx, 900, kp, {mouth: laugh ? 'grin' : 'smile', eyes: laugh ? 'happy' : undefined, gx: 0.6, gy: lt < 2.7 ? 0.1 : -0.3}, {flip: true});
  at(t, 25.6, 'paper', 0.6); at(t, 26.4, 'tap', 0.5); at(t, 27.1, 'scribble', 0.5); at(t, 27.9, 'chuckle', 0.6); at(t, 28.25, 'chuckle', 0.55); at(t, 28.6, 'chuckle', 0.5); at(t, 29.6, 'paper', 0.4);
}, {cam: lt => ({z: lerp(1.25, 1.35, lt / 6), fx: lerp(640, 660, lt / 6), fy: 1300}), hand: 0.9});

// ---------- S8 31.0–35.0: night. The kid is gone. He puts the nose cone on alone. ----------
shot(31.0, 35.0, (ctx, lt, t) => {
  room(ctx, {night: true});
  const T = twos(lt), RX = 640, up = ease((lt - 0.4) / 1.4);
  rocket(ctx, RX, GROUND, {fins: 2, nose: 1, win: 1, stripes: 1, noseOff: [lerp(-200, 0, up), lerp(240, 0, up)]});
  const ap = kf([[0, {...FLOOR_SIT, rh: [130, -170], lh: [100, -160]}], [0.4, {...FLOOR_SIT, rh: [130, -170], lh: [100, -160]}],
    [1.8, {...STAND, hip: [-20, -150], lean: 0.25, knee: [1, 1], lf: [100, 0], rf: [140, 0], rh: [230, -540], lh: [200, -520], elbow: [1, 1]}],
    [2.3, {...FLOOR_SIT, rh: [120, -200], lh: [100, -190]}], [4.0, {...FLOOR_SIT, rh: [120, -200], lh: [100, -190], headLean: -0.05}]], T);
  guy(ctx, 400, GROUND, S, ap, {mouth: lt > 2.4 ? 'smile' : 'flat', gx: lt > 3.2 ? -0.1 : 0.8, gy: lt < 1.9 ? -0.6 : lt > 3.2 ? -0.5 : 0.2, eyes: blink(lt, 2.7) ? 'closed' : undefined});
  // where the kid sat: nothing
  at(t, 32.4, 'tap', 0.5); at(t, 32.5, 'paper', 0.4);
}, {cam: lt => ({z: lerp(1.25, 1.3, lt / 4), fx: 620, fy: 1250}), hand: 0.7});
// ---------- S9 35.0–38.0: on the table, a note in crayon, and his red cap. Hold. Cut. ----------
shot(35.0, 38.0, (ctx, lt) => {
  bg(ctx); D.line(ctx, [[-200, 1250], [1500, 1250]], {w: 7});
  ctx.save(); ctx.translate(560, 1176); note(ctx, ['STILL TIME.'], 520, 140, 66); D.line(ctx, [[-240, 70], [-270, 74]], {w: 4}); D.line(ctx, [[240, 70], [270, 74]], {w: 4}); ctx.restore();
  ctx.save(); ctx.translate(900, 1240); ctx.rotate(0.04); D.line(ctx, [[-90, 0], [70, 0]], {w: 14}); D.line(ctx, [[70, -7], [96, 0], [70, 7]], {w: 4, fill: WHITE}); ctx.restore();
  // the cap, lying on the table
  ctx.save(); ctx.translate(1030, 1246); D.poly(ctx, [[-56, 0], [-40, -40], [0, -54], [40, -40], [56, 0]], {fill: RED, w: 4}); D.poly(ctx, [[30, -4], [110, 2], [104, 12], [28, 8]], {fill: RED, w: 4}); ctx.restore();
}, {cam: lt => ({z: lerp(1.32, 1.4, ease(lt / 3)), fx: lerp(700, 705, ease(lt / 3)), fy: 1170}), hand: 0.5});

bed('room', 2.9, 14.3, 0.8); bed('silence', 14.4, 19.0); music('tender', 19.0, 31.0, 0.8); bed('room', 19.0, 31.0, 0.5);
music('resolve', 31.0, 38.0, 0.9); bed('room', 31.0, 38.0, 0.4);
await run({dir: DIR, duration: 38.0});
