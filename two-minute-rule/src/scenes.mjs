// Story art for "The 2-minute rule". Each scene frame is a 1100x1400 PNG (world 846x1077 at 1.3x), so frames of
// one scene stack exactly on the same layer box and can be swapped for hand-drawn local motion.
import fs from 'node:fs';
import path from 'node:path';
import {GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import {sheet, figure, pose, reseed, line, poly, rect, ellipse, dot, text, curve, R,
  INK, RED, YELLOW, STICKY, GREEN, NAVY, PAPER, GRAY, WOOD, BLUE} from './draw.mjs';

GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', 'Chalk');
const OUT = path.resolve(process.argv[2] || 'art'); fs.mkdirSync(OUT, {recursive: true});
const S = 1.3, W = 846, H = 1077, G = 1000; // world size and ground line
const PALE = '#E8EDF3';
const made = [];
function frame(name, sceneSeed, draw, {w = W * S, h = H * S, scale = S} = {}) {
  const {ctx, save} = sheet(Math.round(w), Math.round(h)); ctx.scale(scale, scale);
  reseed(sceneSeed); draw(ctx, () => reseed(sceneSeed * 7 + name.length * 13 + name.charCodeAt(name.length - 1)));
  save(path.join(OUT, name + '.png')); made.push(name);
}
const ground = (ctx, x0 = 40, x1 = W - 40) => line(ctx, [[x0, G + 6], [x1, G + 4]], {w: 4, color: GRAY});
const shoes = (ctx, j, dir = [1, 1]) => { for (const [f, d] of [[j.lf, dir[0]], [j.rf, dir[1]]]) { ellipse(ctx, f[0] + d * 13, f[1] - 5, 24, 11, {fill: RED, w: 4.5}); line(ctx, [[f[0] - d * 6, f[1] + 5], [f[0] + d * 34, f[1] + 4]], {w: 4.5, amp: 0.3}); } };

// ---------- props ----------
function couch(ctx) {
  rect(ctx, 300, 560, 470, 150, {fill: PALE, w: 6});           // backrest
  rect(ctx, 270, 690, 530, 120, {fill: PALE, w: 6});           // seat
  rect(ctx, 250, 640, 70, 190, {fill: PALE, w: 6}); rect(ctx, 750, 640, 70, 190, {fill: PALE, w: 6}); // arms
  line(ctx, [[300, 830], [296, 880]], {w: 6}); line(ctx, [[770, 830], [774, 880]], {w: 6});
  line(ctx, [[220, 884], [830, 882]], {w: 4, color: GRAY});
}
function phone(ctx, x, y, a = -0.2) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rect(ctx, -22, -38, 44, 76, {fill: NAVY, w: 5}); rect(ctx, -15, -28, 30, 52, {fill: '#9FD3EA', w: 0}); ctx.restore(); }
function stopwatch(ctx, cx, cy, r, hand = 0, {label = '2:00'} = {}) {
  rect(ctx, cx - 22, cy - r - 46, 44, 30, {fill: RED, w: 5});
  line(ctx, [[cx, cy - r - 16], [cx, cy - r + 2]], {w: 8});
  ellipse(ctx, cx, cy, r, r, {fill: PAPER, w: 7});
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 0.84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (2 / 60) * 7.5, false); ctx.closePath(); // 2 of 60 min, exaggerated wedge
  ctx.fillStyle = 'rgba(246,201,69,.45)'; ctx.fill();
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; line(ctx, [[cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8], [cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9]], {w: 5, amp: 0.2}); }
  text(ctx, label, cx, cy + r * 0.42, {size: r * 0.32, color: RED});
  const a = -Math.PI / 2 + hand; line(ctx, [[cx, cy], [cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7]], {w: 7, color: INK, amp: 0.3});
  dot(ctx, cx, cy, 9, 9);
}
function bin(ctx, x, y) {
  poly(ctx, [[x - 70, y - 150], [x + 70, y - 150], [x + 52, y], [x - 52, y]], {fill: PALE, w: 6});
  for (const t of [-30, 0, 30]) line(ctx, [[x + t, y - 130], [x + t * 0.8, y - 18]], {w: 4, color: GRAY});
  line(ctx, [[x - 80, y - 152], [x + 80, y - 152]], {w: 7});
}
function stairs(ctx, x0, y0, n, sw, sh, hi = -1) {
  for (let i = 0; i < n; i++) rect(ctx, x0 + i * sw, y0 - (i + 1) * sh, W - 30 - (x0 + i * sw), sh, {fill: i === hi ? YELLOW : PAPER, w: 5});
}
function bigBook(ctx, x, y, w, h, title = 'THE BOOK') {
  poly(ctx, [[x, y], [x + w, y], [x + w + 40, y + 40], [x + w + 40, y + h + 40], [x + 40, y + h + 40], [x, y + h]], {fill: '#F3EBDD', w: 6});
  for (let i = 0; i < 9; i++) line(ctx, [[x + w + 6 + i * 3.5, y + 12 + i * 3.5], [x + w + 6 + i * 3.5, y + h + 8 + i * 3.5]], {w: 2.5, color: GRAY, amp: 0.3});
  rect(ctx, x, y, w, h, {fill: NAVY, w: 6});
  rect(ctx, x + 30, y + 60, w - 60, 90, {fill: PAPER, w: 4});
  text(ctx, title, x + w / 2, y + 105, {size: 40});
  text(ctx, '600 pages', x + w / 2, y + h - 60, {size: 30, color: PAPER, weight: 400});
}
function openBook(ctx, cx, cy, flip = 0) {
  poly(ctx, [[cx - 120, cy - 10], [cx, cy + 6], [cx + 120, cy - 10], [cx + 120, cy + 70], [cx, cy + 86], [cx - 120, cy + 70]], {fill: '#F3EBDD', w: 5});
  line(ctx, [[cx, cy + 6], [cx, cy + 86]], {w: 4});
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(ctx, [[cx + s * 20, cy + 24 + i * 16], [cx + s * 96, cy + 18 + i * 16]], {w: 2.5, color: GRAY, amp: 0.3});
  if (flip) { poly(ctx, [[cx, cy + 6], [cx + 60 * flip, cy - 70], [cx + 95 * flip, cy - 40], [cx + 10, cy + 40]], {fill: PAPER, w: 4}); }
}
function road(ctx) {
  poly(ctx, [[40, G + 60], [W - 40, G + 60], [470, 420], [380, 420]], {fill: '#EDE7DD', w: 5});
  for (let i = 0; i < 6; i++) { const t = i / 6, y = G + 20 - t * 560, wd = 50 * (1 - t) + 6; line(ctx, [[423, y], [425, y - wd]], {w: 8 * (1 - t) + 2, color: PAPER, amp: 0.2}); }
  line(ctx, [[640, 520], [642, 290]], {w: 5}); poly(ctx, [[642, 290], [740, 315], [642, 345]], {fill: RED, w: 4});
  text(ctx, '5 KM', 690, 400, {size: 34, color: INK});
}
function sink(ctx, piled) {
  rect(ctx, 30, 700, W - 60, 60, {fill: WOOD, w: 6});                                   // counter top
  rect(ctx, 50, 760, W - 100, 240, {fill: PALE, w: 6});                                 // cabinet
  line(ctx, [[W / 2, 770], [W / 2, 990]], {w: 4, color: GRAY});
  ellipse(ctx, 520, 712, 170, 26, {fill: '#CFDCE6', w: 5});                             // basin
  line(ctx, [[640, 700], [640, 560], [560, 560], [560, 600]], {w: 9});                   // faucet
  if (piled) for (let i = 0; i < 9; i++) { const x = 380 + (i % 3) * 90 + (i * 37 % 20), y = 690 - Math.floor(i / 3) * 52; ellipse(ctx, x, y, 62, 18, {fill: i % 4 === 0 ? '#F7D9A8' : PAPER, w: 4.5, rot: (i % 2 ? 0.12 : -0.1)}); }
  if (piled) { line(ctx, [[300, 560], [292, 690]], {w: 5}); ellipse(ctx, 292, 545, 26, 30, {fill: '#D8E8F0', w: 4.5}); ellipse(ctx, 230, 660, 30, 36, {fill: PAPER, w: 4.5}); }
}

// ---------- scenes ----------
const sit = (o = {}) => ({hip: [520, 720], lean: -0.18, lf: [690, 880], rf: [650, 880], knee: [-1, -1], footDir: [1, 1], ...o});

// S1 / S2a: on the couch, scrolling, while the task looms (the note is its own layer)
frame('s1a', 11, (ctx, fig) => { couch(ctx); fig();
  const j = pose(sit({lh: [628, 560], rh: [640, 590], elbow: [1, 1], headLean: 0.12}));
  figure(ctx, j, {gx: 0.7, gy: 0.4, mouth: 'smile', brows: 'flat', eyes: 'closed'}); phone(ctx, 652, 548); });
frame('s1b', 11, (ctx, fig) => { couch(ctx); fig();
  const j = pose(sit({lh: [628, 572], rh: [640, 600], elbow: [1, 1], headLean: -0.05}));
  figure(ctx, j, {gx: -0.9, gy: -0.2, mouth: 'wavy', brows: 'worried', sweat: 1}); phone(ctx, 652, 560); });
frame('s2a', 11, (ctx, fig) => { couch(ctx); fig();
  const j = pose(sit({lh: [600, 470], rh: [660, 610], elbow: [1, 1], headLean: -0.15, lean: -0.08}));
  figure(ctx, j, {gx: -0.8, gy: 0.1, mouth: 'O', brows: 'up', eyes: 'wide', lines: -1}); phone(ctx, 670, 600); });
frame('note', 12, ctx => {
  ctx.save(); ctx.rotate(-0.04);
  rect(ctx, 20, 20, 360, 360, {fill: STICKY, w: 6}); poly(ctx, [[300, 380], [380, 300], [380, 380]], {fill: '#F2D57A', w: 4});
  text(ctx, 'TO DO:', 200, 90, {size: 54}); text(ctx, 'TAXES!', 200, 175, {size: 70, color: RED});
  for (const y of [250, 300]) line(ctx, [[70, y], [330, y - 4]], {w: 4, color: GRAY});
  ctx.restore(); }, {w: 400, h: 400, scale: 1});

// S2b: pushing the START boulder — two alternating strain frames
for (const [k, d] of [['s2b1', 0], ['s2b2', 1]]) frame(k, 21, (ctx, fig) => { ground(ctx);
  const bx = 560 + d * 6; ellipse(ctx, bx, 770, 230, 225, {fill: '#DAD5CC', w: 7, amp: 2.5});
  line(ctx, [[bx + 90, 600], [bx + 120, 660], [bx + 96, 700]], {w: 4, color: GRAY}); line(ctx, [[bx - 150, 880], [bx - 110, 910]], {w: 4, color: GRAY});
  text(ctx, 'START', bx, 760, {size: 82, color: INK});
  fig(); const j = pose({hip: [120 + d * 4, 800], lean: 0.6 + d * 0.04, headLean: -0.25, lf: [18, G], rf: [175 + d * 10, G], knee: [-1, -1],
    lh: [338 + d * 6, 640], rh: [342 + d * 6, 720], elbow: [1, 1]});
  figure(ctx, j, {gx: 0.7, mouth: 'strain', brows: 'angry', eyes: 'squint', sweat: 1}); });

// S3: the rule — stopwatch, character points at it, ticking hand frames
for (let i = 0; i < 4; i++) frame('s3' + 'abcd'[i], 31, (ctx, fig) => { ground(ctx);
  stopwatch(ctx, 560, 560, 230, i * 0.26);
  fig(); const j = pose({hip: [170, 776], lean: -0.05, lf: [110, G], rf: [235, G], rh: [345, 470 + (i % 2) * 8], lh: [100, 640], elbow: [1, -1], knee: [-1, -1], footDir: [1, 1]});
  figure(ctx, j, {gx: 0.8, gy: -0.3, mouth: 'grin', brows: 'up', lines: i % 2 ? 0 : -1}); });

// S4: a sub-2-minute task — toss the scrap into the bin
const s4 = (k, j, face) => frame(k, 41, (ctx, fig) => { ground(ctx); bin(ctx, 680, G); fig(); figure(ctx, pose(j), face); });
s4('s4a', {hip: [230, 776], lean: -0.12, lf: [150, G], rf: [300, G], rh: [80, 560], lh: [330, 700], elbow: [1, 1], headLean: 0.1}, {gx: 0.9, mouth: 'flat', brows: 'angry'});
s4('s4b', {hip: [250, 776], lean: 0.18, lf: [170, G], rf: [330, G], rh: [430, 520], lh: [130, 700], elbow: [-1, -1]}, {gx: 0.9, gy: -0.2, mouth: 'O', brows: 'up'});
s4('s4c', {hip: [250, 776], lean: 0.02, lf: [170, G], rf: [320, G], rh: [330, 400], lh: [140, 700], elbow: [1, -1]}, {gx: 0.5, mouth: 'grin', brows: 'up', lines: 1});
frame('ball', 42, ctx => { ellipse(ctx, 50, 50, 36, 32, {fill: PAPER, w: 5}); line(ctx, [[30, 40], [52, 56], [70, 38]], {w: 3, color: GRAY}); line(ctx, [[40, 70], [60, 62]], {w: 3, color: GRAY}); }, {w: 100, h: 100, scale: 1});

// S5: bigger task — a staircase; only the first step is today's
frame('s5a', 51, (ctx, fig) => { ground(ctx); stairs(ctx, 330, G, 6, 85, 95); poly(ctx, [[790, 430], [790, 300], [700, 330], [790, 360]], {fill: RED, w: 4}); text(ctx, 'BIG PROJECT', 690, 250, {size: 40});
  fig(); figure(ctx, pose({hip: [190, 776], lean: -0.1, headLean: -0.3, lf: [120, G], rf: [250, G], lh: [95, 690], rh: [270, 690], elbow: [1, -1]}), {gx: 0.7, gy: -0.9, mouth: 'O', brows: 'worried', eyes: 'wide', sweat: 1}); });
frame('s5b', 51, (ctx, fig) => { ground(ctx); stairs(ctx, 330, G, 6, 85, 95, 0); poly(ctx, [[790, 430], [790, 300], [700, 330], [790, 360]], {fill: RED, w: 4}); text(ctx, 'BIG PROJECT', 690, 250, {size: 40});
  text(ctx, '2 min', 420, 950, {size: 34, color: INK});
  fig(); figure(ctx, pose({hip: [300, 760], lean: 0.12, lf: [240, G], rf: [380, G - 95], knee: [-1, -1], lh: [210, 650], rh: [420, 640], elbow: [1, -1]}), {gx: 0.6, mouth: 'smile', brows: 'flat'}); });
frame('s5c', 51, (ctx, fig) => { ground(ctx); stairs(ctx, 330, G, 6, 85, 95, 0); poly(ctx, [[790, 430], [790, 300], [700, 330], [790, 360]], {fill: RED, w: 4}); text(ctx, 'BIG PROJECT', 690, 250, {size: 40});
  text(ctx, '2 min', 420, 950, {size: 34, color: INK});
  fig(); figure(ctx, pose({hip: [390, 680], lean: 0.02, lf: [350, G - 95], rf: [440, G - 95], lh: [290, 560], rh: [470, 470], elbow: [1, -1]}), {gx: 0.4, mouth: 'grin', brows: 'up', lines: 1}); });

// S6: the book vs one page
frame('s6a', 61, ctx => { bigBook(ctx, 170, 280, 440, 600); });
for (const [k, fl] of [['s6b', 0], ['s6c', 1]]) frame(k, 62, (ctx, fig) => { ground(ctx);
  rect(ctx, 170, 760, 330, 50, {fill: WOOD, w: 6}); line(ctx, [[200, 810], [200, G]], {w: 6}); line(ctx, [[470, 810], [470, G]], {w: 6}); // stool
  fig(); const j = pose({hip: [330, 755], lean: -0.05, headLean: 0.25, lf: [520, G], rf: [470, G], knee: [-1, -1], lh: [470, 650 + fl * 6], rh: [560, 640], elbow: [1, 1]});
  figure(ctx, j, {gx: 0.6, gy: 0.6, mouth: 'smile', brows: 'flat'}); openBook(ctx, 520, 600, fl);
  text(ctx, 'p.1', 470, 720, {size: 28, color: RED}); });

// S7: the run vs the shoes
frame('s7a', 71, ctx => { road(ctx); });
for (const [k, d] of [['s7b', 0], ['s7c', 1]]) frame(k, 72, (ctx, fig) => { ground(ctx);
  rect(ctx, 150, 790, 300, 60, {fill: WOOD, w: 6}); line(ctx, [[175, 850], [175, G]], {w: 6}); line(ctx, [[425, 850], [425, G]], {w: 6}); // bench
  fig(); const j = pose({hip: [300, 780], lean: 0.55, headLean: 0.35, lf: [470, G], rf: [560, G], knee: [-1, -1], lh: [545 + d * 16, 965], rh: [585 - d * 14, 955], elbow: [-1, -1], footDir: [1, 1]});
  figure(ctx, j, {gx: 0.7, gy: 0.8, mouth: d ? 'grin' : 'smile', brows: 'flat'}); shoes(ctx, j);
  ellipse(ctx, j.rf[0] + 8 + d * 6, j.rf[1] - 22, 9, 6, {w: 3.5, rot: d ? 0.6 : -0.4}); ellipse(ctx, j.rf[0] + 26 - d * 4, j.rf[1] - 20, 9, 6, {w: 3.5, rot: d ? -0.5 : 0.5}); }); // bow loops

// S8: the kitchen vs one plate
frame('s8a', 81, ctx => { sink(ctx, true); });
for (const [k, d] of [['s8b', 0], ['s8c', 1]]) frame(k, 82, (ctx, fig) => { sink(ctx, false);
  fig(); const j = pose({hip: [260, 690], lean: 0.08, lf: [200, 960], rf: [320, 960], lh: [470, 620], rh: [520 + d * 30, 585 - d * 20], elbow: [1, 1]});
  figure(ctx, j, {gx: 0.8, gy: 0.5, mouth: 'smile', brows: 'flat'});
  ellipse(ctx, 500, 640, 70, 70, {fill: PAPER, w: 5}); ellipse(ctx, 500, 640, 42, 42, {w: 3, color: GRAY});
  rect(ctx, 505 + d * 30, 560 - d * 20, 54, 36, {fill: YELLOW, w: 4});
  for (const [bx, by, r] of [[580, 520], [610, 480], [560, 470]].map((b, i) => [...b, 12 - i * 3])) ellipse(ctx, bx + d * 14, by - d * 26, r, r, {w: 3, color: BLUE}); });

// S9: once you start you keep going — two run frames
const run = [
  {hip: [400, 700], lean: 0.25, lf: [250, 900], rf: [540, 990], knee: [1, -1], lh: [520, 590], rh: [300, 730], elbow: [-1, 1], footDir: [1, 1]},
  {hip: [400, 690], lean: 0.25, lf: [520, 860], rf: [300, 990], knee: [-1, 1], lh: [290, 720], rh: [510, 590], elbow: [1, -1], footDir: [1, 1]},
];
run.forEach((p, i) => frame('s9' + 'ab'[i], 91, (ctx, fig) => { ground(ctx);
  for (const [y, l] of [[560, 120], [640, 170], [740, 110]]) line(ctx, [[90 + i * 18, y], [90 + i * 18 + l, y]], {w: 5, color: GRAY});
  fig(); const j = pose(p); figure(ctx, j, {gx: 0.8, mouth: 'grin', brows: 'up'}); shoes(ctx, j); }));

// S10: two minutes — start now (thumbs up)
for (let i = 0; i < 2; i++) frame('s10' + 'ab'[i], 101, (ctx, fig) => { ground(ctx);
  stopwatch(ctx, 590, 470, 200, 0.05 + i * 0.12);
  fig(); const j = pose({hip: [200, 776], lean: 0.02, lf: [130, G], rf: [270, G], lh: [110, 680], rh: [330, 560 - i * 10], elbow: [1, 1]});
  figure(ctx, j, {gx: 0.5, mouth: 'grin', brows: 'up', lines: i ? 1 : 0}); shoes(ctx, j);
  line(ctx, [[j.rh[0] - 2, j.rh[1] - 8], [j.rh[0] - 4, j.rh[1] - 36]], {w: 6}); }); // thumb

console.log(made.length, 'frames ->', OUT);
