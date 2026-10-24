// Masked & Undefined — "What If You Disappeared From the Internet for 30 Days?" (34.5 s, no voice-over)
// Every frame is drawn here at 24 fps and piped to ffmpeg; sound events are logged for sfx.py.
//   node src/render.mjs                  -> build/video.mp4 + build/events.json
//   node src/render.mjs --stills 0.3,2.5 -> build/stills/*.png
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createCanvas, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import * as D from './draw.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BUILD = path.join(ROOT, 'build'); fs.mkdirSync(BUILD, {recursive: true});
const FONTS = '/Users/hussain/dev/masked-and-undefined/content/youtube/01-rag-10-million/assets/fonts/';
GlobalFonts.registerFromPath(FONTS + 'InterTight-700.woff2', 'InterTight');
GlobalFonts.registerFromPath(FONTS + 'Inter-600.woff2', 'Inter6');
GlobalFonts.registerFromPath(FONTS + 'Inter-400.woff2', 'Inter4');
// Masked & Undefined brand tokens
const PAPER = '#FEFEFA', NAVY = '#020A1D', BLUE = '#0573FE', TINT = '#E6F0FF', MUTED = '#5B6275', LINEC = '#D9D9D0', WARM = '#FBE3C2';
D.setStyle({ink: NAVY, amp: 0.45, hair: false});
const BASE_LW = 0.72;

const FPS = 24, DUR = 34.5, W = 1080, H = 1920, DW = 1280, DH = 2276, K = W / DW, GROUND = 1560;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
function mix(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {...a}; for (const k in b) o[k] = k in a ? mix(a[k], b[k], t) : b[k]; return o; }
  return t < 0.5 ? a : b;
}
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys.at(-1)[1];
}
const step = (keys, t) => { let v = keys[0][1]; for (const [k, x] of keys) if (t >= k) v = x; return v; };
const noise = (t, f, s = 0) => Math.sin(t * f * 6.283 + s) * 0.6 + Math.sin(t * f * 2.71 * 6.283 + s * 1.7) * 0.4;
const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

const events = [], seen = new Set();
const ev = (t, kind, gain = 1) => { const k = kind + '@' + t.toFixed(2); if (!seen.has(k)) { seen.add(k); events.push({t: +t.toFixed(3), kind, gain}); } };

// ---------------- characters ----------------
// The main character: plain minimalist stickman, nothing worn. Sam (the friend): same build plus a blue scarf.
function guy(ctx, x, y, s, p, face, {flip = false, alpha = 1, scarf = false, after} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.globalAlpha = alpha;
  D.setLW(BASE_LW * (s > 1.3 ? 1.3 / s : 1));
  const j = D.pose(p); D.figure(ctx, j, {brows: 'none', ...face});
  if (scarf) { const n = j.neck; D.poly(ctx, [[n[0] - 30, n[1] - 4], [n[0] + 30, n[1] - 8], [n[0] + 28, n[1] + 14], [n[0] - 28, n[1] + 18]], {fill: BLUE, w: 4}); D.poly(ctx, [[n[0] + 8, n[1] + 10], [n[0] + 30, n[1] + 10], [n[0] + 34, n[1] + 90], [n[0] + 14, n[1] + 92]], {fill: BLUE, w: 4}); }
  if (after) after(ctx, j);
  D.setLW(1); ctx.restore(); return j;
}
const STAND = {hip: [0, -223], lean: 0, lf: [-50, 0], rf: [55, 0], lh: [-70, -105], rh: [75, -105], elbow: [1, -1], knee: [-1, -1]};
const SEATED = {hip: [0, -192], lean: -0.05, lf: [95, 0], rf: [120, 0], knee: [-1, -1], lh: [80, -200], rh: [100, -200], elbow: [1, 1], footDir: [1, 1]};
function walk(phase, o = {}) {
  const a = phase * 6.283, b = a + Math.PI, bob = Math.abs(Math.sin(a)) * 6;
  const foot = x => [55 * Math.cos(x), -Math.max(0, 30 * Math.sin(x))];
  return {hip: [0, -218 - bob], lean: o.lean ?? 0.04, headLean: o.headLean ?? 0, lf: foot(a), rf: foot(b),
    lh: o.lh ?? [-10 - 35 * Math.cos(b), -110], rh: o.rh ?? [-10 - 35 * Math.cos(a), -110], elbow: [1, 1], knee: [-1, -1]};
}
function phoneSmall(ctx, x, y, a = 0, s = 1, lit = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  rr(ctx, -24, -44, 48, 88, 10, NAVY); rr(ctx, -19, -38, 38, 76, 7, lit ? '#BFD8FF' : '#26303F'); ctx.restore();
}

// ---------------- drawing helpers ----------------
function rr(ctx, x, y, w, h, r, fill, stroke, lw = 4) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function txt(ctx, s, x, y, size, color = NAVY, font = 'InterTight', align = 'center', base = 'middle') { ctx.font = `${font === 'InterTight' ? 700 : font === 'Inter6' ? 600 : 400} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
function bg(ctx, c = PAPER) { ctx.fillStyle = c; ctx.fillRect(-4000, -4000, 12000, 12000); }
function floor(ctx, x0 = -400, x1 = 1700) { D.line(ctx, [[x0, GROUND], [x1, GROUND + 1]], {w: 5}); }
function table(ctx, x, drawer = 0) { // x = left edge; drawer 0 closed .. 1 open
  D.line(ctx, [[x, 1250], [x + 420, 1250]], {w: 7}); D.line(ctx, [[x + 30, 1250], [x + 30, GROUND]], {w: 6}); D.line(ctx, [[x + 390, 1250], [x + 390, GROUND]], {w: 6});
  const dx = drawer * 110; if (drawer > 0.02) { D.line(ctx, [[x + 70, 1262], [x + 70 - dx, 1262]], {w: 3}); D.line(ctx, [[x + 70, 1330], [x + 70 - dx, 1330]], {w: 3}); }
  D.rect(ctx, x + 70 - dx, 1258, 200, 76, {fill: PAPER, w: 5}); D.line(ctx, [[x + 150 - dx, 1296], [x + 190 - dx, 1296]], {w: 6});
}
function chair(ctx, x) { D.line(ctx, [[x - 70, 1368], [x + 70, 1368]], {w: 6}); D.line(ctx, [[x - 60, 1368], [x - 60, GROUND]], {w: 5}); D.line(ctx, [[x + 60, 1368], [x + 60, GROUND]], {w: 5}); D.line(ctx, [[x - 70, 1368], [x - 80, 1060]], {w: 6}); }
function door(ctx, x, open = 0, y0 = 880) {
  D.rect(ctx, x, y0, 260, GROUND - y0, {w: 6});
  if (open > 0.02) { ctx.fillStyle = PAPER; ctx.fillRect(x + 3, y0 + 3, 254, GROUND - y0 - 6); }
  const w = 260 * (1 - open * 0.82); D.rect(ctx, x, y0, w, GROUND - y0, {fill: open > 0.02 ? '#F1F1EC' : PAPER, w: 6}); D.dot(ctx, x + w - 34, (y0 + GROUND) / 2, 9, 9);
}
function windowFrame(ctx, x, y, w, h) { D.rect(ctx, x, y, w, h, {fill: PAPER, w: 6}); D.line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], {w: 4}); D.line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], {w: 4}); }
function steam(ctx, x, y, t) { for (let k = 0; k < 2; k++) { const o = Math.sin(t * 3 + k) * 6; D.line(ctx, [[x - 8 + k * 16, y], [x - 4 + k * 16 + o, y - 30], [x - 10 + k * 16 - o, y - 60]], {w: 3, color: MUTED}); } }
function cup(ctx, x, y, t) { D.poly(ctx, [[x - 26, y - 56], [x + 26, y - 56], [x + 20, y], [x - 20, y]], {fill: PAPER, w: 4.5}); D.ellipse(ctx, x + 32, y - 32, 12, 16, {w: 4}); steam(ctx, x, y - 66, t); }

// ---------------- phone close-up (brand UI) ----------------
const PX = 300, PY = 330, PW = 680, PH = 1320;
function phoneFrame(ctx, drawScreen, {thumb, call} = {}) {
  D.line(ctx, [[1320, 2500], [1050, 1760]], {w: 7});
  rr(ctx, PX - 8, PY - 8, PW + 16, PH + 16, 90, NAVY); rr(ctx, PX, PY, PW, PH, 84, NAVY);
  const SX = PX + 24, SY = PY + 24, SW = PW - 48, SH = PH - 48;
  ctx.save(); ctx.beginPath(); ctx.roundRect(SX, SY, SW, SH, 64); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(SX, SY, SW, SH);
  drawScreen(ctx, SX, SY, SW, SH); rr(ctx, SX + SW / 2 - 70, SY + 18, 140, 36, 18, NAVY); ctx.restore();
  D.ellipse(ctx, PX + PW + 8, 1480, 74, 112, {fill: PAPER, w: 5});
  const th = thumb || [PX + PW - 70, 1300]; D.ellipse(ctx, th[0], th[1], 36, 60, {fill: PAPER, w: 5, rot: -0.5});
  for (const fy of [1000, 1110, 1220]) D.ellipse(ctx, PX - 6, fy, 34, 24, {fill: PAPER, w: 5});
}
const AV = (ctx, x, y, r, {empty = false, scarf = false} = {}) => {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = empty ? '#FFFFFF' : TINT; ctx.fill();
  if (empty) { ctx.setLineDash([6, 6]); ctx.strokeStyle = MUTED; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
  else { ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.stroke(); D.dot(ctx, x - r * .25, y - r * .1, r * .09, r * .12); D.dot(ctx, x + r * .25, y - r * .1, r * .09, r * .12); if (scarf) { ctx.fillStyle = BLUE; ctx.fillRect(x - r * .6, y + r * .55, r * 1.2, r * .3); } }
  ctx.restore();
};
const NOTIFS = [['Group chat · Weekend plans', '214 new messages'], ['Trending now', '#everyoneisposting'], ['Alex posted a story', 'Tap to watch'], ['12 people liked your post', 'from last month'],
  ['Daily recap', 'You missed 48 posts'], ['New follower', 'jordan.k started following you'], ['Group chat · Work', '96 new messages'], ['Trending now', 'This changes everything'],
  ['Mia mentioned you', 'in a comment'], ['Reminder', 'Your memories from this day'], ['Group chat · Family', '37 new messages'], ['Live now', 'Ben is streaming'], ['Trending now', '#30daychallenge'], ['You have 99+ updates', 'Catch up now']];
function notifRow(ctx, x, y, w, i) {
  const [a, b] = NOTIFS[i % NOTIFS.length];
  rr(ctx, x, y, w, 118, 26, '#F4F6FA'); rr(ctx, x + 22, y + 22, 74, 74, 18, [BLUE, NAVY, MUTED][i % 3]);
  txt(ctx, a, x + 116, y + 44, 30, NAVY, 'Inter6', 'left'); txt(ctx, b, x + 116, y + 84, 28, MUTED, 'Inter4', 'left'); txt(ctx, 'now', x + w - 24, y + 44, 24, MUTED, 'Inter4', 'right');
}
function feedCard(ctx, x, y, w, i, {mine = false} = {}) {
  rr(ctx, x, y, w, 520, 30, '#FFFFFF', LINEC, 3);
  AV(ctx, x + 60, y + 56, 30, {empty: mine}); txt(ctx, mine ? 'account inactive' : ['alex', 'mia', 'jordan.k', 'ben', 'sam', 'lee'][i % 6], x + 110, y + 56, 30, mine ? MUTED : NAVY, 'Inter6', 'left');
  rr(ctx, x + 24, y + 100, w - 48, 300, 20, mine ? '#FAFAFA' : [TINT, '#EEF0F3', '#F3EFE8'][i % 3]);
  if (!mine) { // tiny stick doodle "content"
    ctx.save(); ctx.translate(x + w / 2, y + 380); D.setLW(0.6); D.figure(ctx, D.pose({...STAND, rh: [60, -260 + (i % 2) * 40], lh: [-70, -110]}), {gx: 0.3, mouth: 'grin', brows: 'none'}); D.setLW(1); ctx.restore();
  }
  const liked = !mine && i % 2 === 0; ctx.fillStyle = liked ? BLUE : MUTED;
  txt(ctx, (liked ? '♥ ' : '♡ ') + (mine ? '0' : `${(i * 37 % 90 + 9) / 10}K`), x + 30, y + 455, 32, liked ? BLUE : MUTED, 'Inter6', 'left');
}

// ---------------- the pixel disintegration ----------------
let PIX = null;
function buildPixels() {
  const c = createCanvas(W, H), x = c.getContext('2d'); x.scale(K, K); x.lineCap = 'round'; x.lineJoin = 'round';
  D.reseed(3); guy(x, 640, 1500, 1.9, {...STAND, rh: [95, -150], lh: [-75, -105]}, {gx: 0, mouth: 'flat'});
  const d = x.getImageData(0, 0, W, H).data, B = 9, out = [];
  for (let py = 0; py < H; py += B) for (let px = 0; px < W; px += B) {
    let hit = false; // a block is "on" if any pixel inside it is inked
    for (let yy = py; yy < Math.min(H, py + B) && !hit; yy += 2) for (let xx = px; xx < Math.min(W, px + B); xx += 2) { const i = (yy * W + xx) * 4; if (d[i + 3] > 60 && d[i] < 120) { hit = true; break; } }
    if (hit) out.push({x: px, y: py, c: NAVY, r: hash(px * 7 + py * 13)});
  }
  let minY = H, maxY = 0; for (const b of out) { minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y); }
  for (const b of out) b.th = (b.y - minY) / (maxY - minY) * 0.75 + b.r * 0.25; // dissolve from the head down, a little random
  PIX = {blocks: out, B};
}
function pixelFrame(ctx, t) { // in output pixel space
  if (!PIX) buildPixels();
  const p = 0.12 + t / 0.75; // already breaking on frame one
  for (const b of PIX.blocks) {
    const k = p - b.th; if (k > 0.55) continue;
    let x = b.x, y = b.y, a = 1;
    if (k > 0) { x += (b.r - 0.5) * 420 * k + Math.sin(b.r * 40) * 60 * k; y -= 520 * k * (0.5 + b.r); a = clamp(1 - k / 0.55); }
    ctx.globalAlpha = a; ctx.fillStyle = k > 0 && b.r > 0.82 ? BLUE : b.c; ctx.fillRect(x, y, PIX.B - (k > 0 ? 1 : 0), PIX.B - (k > 0 ? 1 : 0));
  }
  ctx.globalAlpha = 1;
}

// ---------------- shots ----------------
const shots = []; const shot = (a, b, draw, o = {}) => shots.push({a, b, draw, ...o});
const DAYS = [[3.45, 7.7, 1], [7.7, 12.5, 7], [12.5, 18.5, 15], [18.5, 24.45, 30]];

// S01 0.00–0.85: he breaks into pixels (drawn in pixel space, see drawFrame)
shot(0, 0.85, (ctx, lt, t) => { bg(ctx, PAPER); }, {pixels: true});
// S02 0.85–1.35: the phone drops to an empty floor
shot(0.85, 1.35, (ctx, lt, t) => {
  bg(ctx); D.line(ctx, [[200, GROUND + 60], [1080, GROUND + 61]], {w: 4, color: LINEC});
  const land = 1.12, f = clamp((t - 0.62) / (land - 0.62)), y = t < land ? lerp(1150, GROUND + 18, f * f) : GROUND + 18 - Math.abs(Math.sin((t - land) * 14)) * 30 * Math.exp(-(t - land) * 9);
  if (t >= land && t < land + 0.05) ev(land, 'phonedrop', 1);
  phoneSmall(ctx, 760, y, t < land ? f * 2.2 : Math.PI / 2, 1.9, true);
}, {cam: () => ({z: 1.0, fx: 640, fy: 1300})});
// S03 1.35–2.15: the feed keeps moving
shot(1.35, 2.15, (ctx, lt, t) => {
  bg(ctx, '#F7F8FA'); const off = lt * 2600;
  for (let col = 0; col < 2; col++) for (let k = -1; k < 8; k++) {
    const y = k * 560 - (off * (col ? 1.15 : 1)) % 560 + (col ? 280 : 0), i = k + Math.floor(off / 560) + col * 5;
    feedCard(ctx, 70 + col * 590, y, 550, i, {mine: col === 0 && i === 3});
  }
  for (let k = 0; k < 5; k++) { const ph = (lt * 3 + k * 0.23) % 1; ctx.globalAlpha = 1 - ph; txt(ctx, '♥', 200 + k * 210, 1500 - ph * 500, 70, BLUE); ctx.globalAlpha = 1; }
  for (let k = 0; k < 3; k++) { const s = 0.4 + 0.2 * k; if (lt > s) rr(ctx, 860 - k * 30, 330 + k * 140, 300, 90, 45, BLUE); if (lt > s) txt(ctx, ['+99', '+1.2K', '+438'][k], 1010 - k * 30, 375 + k * 140, 44, '#FFFFFF'); }
  if (lt < 0.04) ev(1.35, 'feed', 1);
}, {});
// S04 2.15–3.45: smash cut, title card
shot(2.15, 3.45, (ctx, lt, t) => {
  bg(ctx); if (lt < 0.04) ev(2.15, 'cut', 1);
  txt(ctx, 'WHAT IF YOU', 640, 960, 128); txt(ctx, 'DISAPPEARED', 640, 1110, 128); txt(ctx, 'FOR 30 DAYS?', 640, 1260, 128, BLUE);
}, {cam: lt => ({z: lerp(1.0, 1.04, lt / 1.3), fx: 640, fy: 1110})});

// DAY 1
shot(3.45, 5.45, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const drawer = kf([[0, 0], [0.75, 0], [1.0, 1], [1.35, 1], [1.55, 0]], lt);
  table(ctx, 760, drawer);
  if (t > 3.82 && t < 3.86) ev(3.84, 'poweroff', 1); if (t > 4.2 && t < 4.24) ev(4.22, 'draweropen', 1); if (t > 4.98 && t < 5.02) ev(5.0, 'drawerclose', 1);
  const reach = kf([[0, 0], [0.75, 0], [1.05, 1], [1.3, 1], [1.5, 0]], lt);
  const p = mix({...STAND, lean: 0.05, headLean: 0.35, rh: [95, -170], lh: [60, -165], elbow: [1, 1]}, {...STAND, lean: 0.35, headLean: 0.4, rh: [205, -205], lh: [-40, -120], elbow: [1, 1]}, reach);
  guy(ctx, 620, GROUND, 1.25, p, {gx: 0.6, gy: 0.7, mouth: 'flat'}, {after: (c, j) => { if (lt < 1.2) phoneSmall(c, j.rh[0] + 8, j.rh[1] - 28, 0.2, 1, lt < 0.38); }});
}, {cam: () => ({z: 1.35, fx: 820, fy: 1250}), hand: 1.5, day: 1});
shot(5.45, 7.7, (ctx, lt, t) => {
  bg(ctx); floor(ctx); table(ctx, 760, 0); chair(ctx, 560);
  const look = ease((t - 6.75) / 0.12), tap = Math.floor(lt * 4) % 2;
  if (lt > 0.4) { const n = Math.floor((t - 5.85) * 1); ev(5.85 + n, 'clock', 0.6); }
  const p = mix({...SEATED, lean: -0.22, headLean: 0.05, lh: [30, -180], rh: [55, -175], elbow: [-1, -1]}, {...SEATED, lean: -0.12, headLean: 0.5, lh: [30, -180], rh: [120 + tap * 6, -205], elbow: [-1, 1]}, look);
  guy(ctx, 560, GROUND, 1.25, p, {gx: look > 0.5 ? 0.9 : 0.2, gy: look > 0.5 ? 0.6 : -0.2, mouth: 'flat'});
  if (lt > 1.4) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); D.line(ctx, [[990, 1300], [1030, 1300]], {w: 4, color: BLUE}); ctx.globalAlpha = 1; }
}, {cam: lt => ({z: lerp(1.3, 1.45, ease(lt / 2.2)), fx: lerp(720, 760, lt / 2.2), fy: 1250}), hand: 1.2, day: 1});

// DAY 7 — four short beats; body language opens up
shot(7.7, 8.9, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 3000); const x = 380 + lt * 150, reach = step([[0, 0], [0.55, 1], [0.9, 0]], lt);
  const p = walk(lt * 1.6, {lean: 0.12, headLean: 0.35, rh: reach ? [30, -90] : undefined});
  guy(ctx, x, GROUND, 1.2, p, {gx: 0.4, gy: 0.9, mouth: 'flat'});
  if (reach) { ctx.globalAlpha = 0.6; D.line(ctx, [[x + 70, 1350], [x + 110, 1330]], {w: 3, color: MUTED}); ctx.globalAlpha = 1; }
  for (let k = 0; k < 3; k++) { const tt = 7.7 + 0.33 * k + 0.15; ev(tt, 'step', 0.5); }
}, {cam: lt => ({z: 1.5, fx: 560 + lt * 140, fy: 1240}), day: 7});
shot(8.9, 10.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx); D.line(ctx, [[560, 1250], [1080, 1250]], {w: 7}); D.line(ctx, [[600, 1250], [600, GROUND]], {w: 6}); D.line(ctx, [[1040, 1250], [1040, GROUND]], {w: 6});
  D.ellipse(ctx, 760, 1238, 90, 14, {fill: PAPER, w: 4.5}); D.line(ctx, [[930, 1243], [990, 1243]], {w: 3, color: LINEC}); // plate; the empty spot where the phone used to sit
  chair(ctx, 420); const eat = kf([[0, 0], [0.45, 0], [0.7, 1], [0.95, 0.3], [1.1, 1]], lt), glance = lt < 0.45;
  if (t > 9.6 && t < 9.64) ev(9.62, 'clink', 0.7);
  guy(ctx, 420, GROUND, 1.25, {...SEATED, lean: 0.05, headLean: glance ? 0.45 : 0.25, lh: [150, -205], rh: mix([210, -205], [150, -330], eat), elbow: [1, 1]}, {gx: glance ? 0.9 : 0.4, gy: glance ? 0.8 : 0.4, mouth: eat > 0.8 ? 'O' : 'flat'});
}, {cam: () => ({z: 1.35, fx: 720, fy: 1240}), day: 7});
shot(10.0, 11.2, (ctx, lt, t) => {
  bg(ctx); floor(ctx); windowFrame(ctx, 620, 760, 420, 460);
  const lift = ease((lt - 0.3) / 0.6);
  for (const [bx, by] of [[760, 900], [900, 860]]) { const f = Math.sin(t * 9 + bx) * 8; D.line(ctx, [[bx - 16, by + f], [bx, by + 6], [bx + 16, by + f]], {w: 3.5}); }
  if (lt < 0.04) ev(10.0, 'birds', 0.7);
  guy(ctx, 470, GROUND, 1.25, {...STAND, lean: lerp(0.08, -0.02, lift), headLean: lerp(0.3, -0.12, lift), lh: [-60, -100], rh: [60, -100], elbow: [1, -1]}, {gx: 0.9, gy: lerp(0.6, -0.4, lift), mouth: lift > 0.7 ? 'smile' : 'flat'});
}, {cam: lt => ({z: lerp(1.3, 1.38, lt / 1.2), fx: 640, fy: 1170}), day: 7});
shot(11.2, 12.5, (ctx, lt, t) => {
  const sky = ctx.createLinearGradient(0, 500, 0, GROUND); sky.addColorStop(0, PAPER); sky.addColorStop(1, WARM); ctx.fillStyle = sky; ctx.fillRect(-2000, -2000, 6000, 6000);
  ctx.save(); ctx.beginPath(); ctx.rect(-2000, -2000, 6000, 2000 + GROUND); ctx.clip();
  D.ellipse(ctx, 900, GROUND - 40 + lt * 60, 150, 150, {fill: '#F7C98C', w: 4}); ctx.restore();
  ctx.fillStyle = PAPER; ctx.fillRect(-2000, GROUND, 6000, 3000); floor(ctx);
  guy(ctx, 420, GROUND, 1.25, {hip: [0, -40], lean: -0.32, headLean: -0.05, lf: [150, 0], rf: [175, -50], knee: [-1, -1], lh: [-110, 0], rh: [-80, 0], elbow: [-1, -1], footDir: [1, 1]}, {gx: 0.8, gy: -0.1, mouth: 'smile'});
}, {cam: lt => ({z: lerp(1.15, 1.22, lt / 1.3), fx: 660, fy: 1280}), day: 7});

// DAY 15 — the knock, Sam, two coffees, the first laugh
shot(12.5, 13.75, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const knock = [12.75, 12.95]; knock.forEach(k => { if (t > k && t < k + 0.04) ev(k, 'knock', 1); });
  const shake = knock.some(k => t > k && t < k + 0.1) ? 4 : 0; ctx.save(); ctx.translate(shake, 0); door(ctx, 140, 0); ctx.restore();
  table(ctx, 760, 0); chair(ctx, 640);
  const turn = ease((t - 12.85) / 0.15);
  guy(ctx, 640, GROUND, 1.25, {...SEATED, headLean: lerp(0.25, -0.05, turn), lh: [130, -205], rh: [160, -205], elbow: [1, 1]}, {gx: lerp(0.5, -0.9, turn), gy: lerp(0.5, 0, turn), mouth: turn > 0.5 ? 'O' : 'flat'}, {flip: false});
}, {cam: () => ({z: 1.15, fx: 600, fy: 1200}), day: 15});
shot(13.75, 15.1, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const open = ease((t - 13.85) / 0.35); if (lt < 0.04) ev(13.85, 'dooropen', 1);
  door(ctx, 420, open);
  if (open > 0.3) guy(ctx, 560, GROUND, 1.25, {...STAND, lh: [70, -150], rh: [kf([[0, 75], [0.9, 75], [1.15, 120]], lt), kf([[0, -150], [0.9, -150], [1.15, -230]], lt)], elbow: [1, 1]}, {gx: 0.7, mouth: 'smile'},
    {flip: true, scarf: true, after: (c, j) => { cup(c, j.lh[0] + 6, j.lh[1] + 30, t); cup(c, j.rh[0] + 6, j.rh[1] + 30, t); }});
  const jolt = ease((t - 14.15) / 0.12);
  guy(ctx, 330, GROUND, 1.25, {...STAND, lean: lerp(0, -0.12, jolt), headLean: lerp(0, -0.08, jolt), lh: [-60, -110], rh: [lerp(70, 40, jolt), lerp(-110, -160, jolt)], elbow: [1, -1]}, {gx: 0.8, mouth: jolt > 0.5 ? 'O' : 'flat', eyes: jolt > 0.5 ? 'wide' : undefined});
}, {cam: lt => ({z: 1.3, fx: 520, fy: 1220}), day: 15});
shot(15.1, 18.5, (ctx, lt, t) => {
  bg(ctx); floor(ctx); D.line(ctx, [[460, 1250], [820, 1250]], {w: 7}); D.line(ctx, [[490, 1250], [490, GROUND]], {w: 6}); D.line(ctx, [[790, 1250], [790, GROUND]], {w: 6});
  chair(ctx, 330); ctx.save(); ctx.translate(1900, 0); ctx.scale(-1, 1); chair(ctx, 950); ctx.restore();
  if (lt < 0.04) ev(15.35, 'cups', 0.8);
  const T2 = Math.floor(lt * 12) / 12, laugh = t > 16.3, bob = laugh ? Math.abs(Math.sin(T2 * 11)) * 12 * clamp(1 - (t - 17.8) / 0.6) : 0;
  const gest = Math.sin(T2 * 5) * 30;
  guy(ctx, 950, GROUND, 1.25, {...SEATED, lean: 0.05, lh: [120, -205], rh: [140 + gest * 0.6, -260 - Math.abs(gest)], elbow: [1, 1]}, {gx: 0.5, mouth: laugh ? 'grin' : 'smile', eyes: laugh ? 'happy' : undefined}, {flip: true, scarf: true, after: (c, j) => cup(c, 225, -205 * 1, t)});
  guy(ctx, 330, GROUND, 1.25, {...SEATED, hip: [0, -192 - bob * 0.3], lean: laugh ? -0.15 : 0.02, headLean: laugh ? -0.3 + bob * 0.01 : 0.05, lh: [150, -205], rh: laugh ? [60, -150] : [175, -205], elbow: [1, 1]},
    {gx: 0.5, mouth: laugh ? 'grin' : 'flat', eyes: laugh ? 'happy' : undefined}, {after: (c, j) => cup(c, 210, -205, t)});
}, {cam: lt => ({z: lerp(1.2, 1.42, ease(lt / 3.4)), fx: 640, fy: lerp(1260, 1240, lt / 3.4)}), hand: 1.2, day: 15});

// DAY 30 — back online
shot(18.5, 19.7, (ctx, lt, t) => {
  bg(ctx); floor(ctx); const drawer = kf([[0, 0], [0.25, 1], [0.8, 1], [1.0, 0]], lt); table(ctx, 760, drawer);
  if (lt < 0.04) ev(18.55, 'draweropen', 1); if (t > 19.18 && t < 19.22) ev(19.2, 'poweron', 1);
  const reach = kf([[0, 0], [0.3, 1], [0.55, 0]], lt);
  guy(ctx, 620, GROUND, 1.25, mix({...STAND, lean: 0.05, headLean: 0.3, rh: [95, -170], lh: [60, -165], elbow: [1, 1]}, {...STAND, lean: 0.35, headLean: 0.4, rh: [205, -205], lh: [-40, -120], elbow: [1, 1]}, reach), {gx: 0.6, gy: 0.7, mouth: 'flat'},
    {after: (c, j) => { if (lt > 0.3) { phoneSmall(c, j.rh[0] + 8, j.rh[1] - 28, 0.2, 1, t > 19.2); if (t > 19.2) { c.globalAlpha = 0.35; D.ellipse(c, j.rh[0] + 8, j.rh[1] - 28, 70, 90, {fill: TINT, w: 0}); c.globalAlpha = 1; } } }});
}, {cam: () => ({z: 1.35, fx: 820, fy: 1250}), day: 30});
shot(19.7, 22.1, (ctx, lt, t) => {
  bg(ctx, '#F1F2F4'); const n = Math.floor(Math.pow(lt / 2.4, 1.6) * 34) + 1; // rows arrive faster and faster
  for (let k = 0; k < n; k++) { const at = 19.7 + Math.pow(k / 34, 1 / 1.6) * 2.4; ev(at, 'notif', 0.55 + 0.45 * Math.random()); }
  phoneFrame(ctx, (c, SX, SY, SW, SH) => {
    txt(c, '9:41', SX + 70, SY + 40, 30, NAVY, 'Inter6', 'left');
    for (let k = 0; k < Math.min(n, 12); k++) { const i = n - 1 - k, slide = k === 0 ? 1 - ease(((lt - Math.pow(i / 34, 1 / 1.6) * 2.4)) / 0.08) : 0; notifRow(c, SX + 26, SY + 96 + k * 134 - slide * 120, SW - 52, i); }
    rr(c, SX + SW - 190, SY + 84, 150, 54, 27, BLUE); txt(c, `${Math.min(999, n * 29)}+`, SX + SW - 115, SY + 111, 30, '#FFFFFF');
  }, {thumb: [PX + PW - 60, 1460]});
}, {cam: lt => ({z: lerp(1.0, 1.06, lt / 2.4), fx: 640, fy: 1000}), shake: lt => 2 + lt * 2});
shot(22.1, 23.3, (ctx, lt, t) => {
  bg(ctx); const back = ease((lt - 0.35) / 0.5);
  const face = step([[0, {gx: 0, gy: 0.8, mouth: 'flat'}], [0.35, {gx: 0, gy: 0.6, mouth: 'O', eyes: 'wide'}], [0.8, {gx: -0.2, gy: 0.5, mouth: 'wavy', eyes: 'wide'}]], lt);
  ctx.save(); ctx.translate(640, 1040 + back * 40); ctx.rotate(-back * 0.08); ctx.scale(5, 5); D.setLW(0.36); D.line(ctx, [[0, D.R], [-4, D.R + 400]], {w: 6}); D.head(ctx, [0, 0], 0, {brows: 'none', ...face}); D.setLW(1); ctx.restore();
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 30); ctx.fillStyle = TINT; ctx.fillRect(0, 1700, 1280, 600); ctx.globalAlpha = 1; // phone glow from below
  for (let k = 0; k < 4; k++) if (Math.floor(t * 9 + k) % 3 === 0) ev(22.1 + k * 0.27, 'notif', 0.6);
}, {cam: () => ({z: 1.0, fx: 640, fy: 1040})});
shot(23.3, 24.45, (ctx, lt, t) => {
  bg(ctx, '#F1F2F4'); const off = lt * 3400;
  phoneFrame(ctx, (c, SX, SY, SW, SH) => { for (let k = -1; k < 4; k++) { const y = SY + 80 + k * 560 - off % 560; feedCard(c, SX + 24, y, SW - 48, k + Math.floor(off / 560)); } }, {thumb: [PX + PW - 120, 1300 - (lt * 8 % 1) * 250]});
  if (Math.floor(lt * 8) !== Math.floor((lt - 1 / 24) * 8)) ev(t, 'swipe', 0.5);
}, {cam: () => ({z: 1.0, fx: 640, fy: 1000})});

// THE TWIST — silence, one message
const MSG = 24.45;
shot(24.45, 26.7, (ctx, lt, t) => {
  bg(ctx, '#F1F2F4'); if (lt < 0.04) ev(MSG, 'stop', 1);
  phoneFrame(ctx, (c, SX, SY, SW, SH) => {
    c.globalAlpha = 0.18; feedCard(c, SX + 24, SY + 100, SW - 48, 4); feedCard(c, SX + 24, SY + 660, SW - 48, 5); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,.86)'; c.fillRect(SX, SY, SW, SH);
    const a = ease(lt / 0.25); c.globalAlpha = a;
    AV(c, SX + 110, SY + 420, 52, {scarf: true}); txt(c, 'Sam', SX + 190, SY + 405, 40, NAVY, 'InterTight', 'left'); txt(c, '28 days ago', SX + 190, SY + 450, 28, MUTED, 'Inter4', 'left');
    rr(c, SX + 60, SY + 510, SW - 120, 250, 40, TINT); rr(c, SX + 60, SY + 510, SW - 120, 250, 40, null, BLUE, 4);
    txt(c, 'Hey. You disappeared.', SX + 100, SY + 590, 42, NAVY, 'Inter6', 'left'); txt(c, 'Are you okay?', SX + 100, SY + 660, 42, NAVY, 'Inter6', 'left');
    c.globalAlpha = 1;
    if (lt > 1.2) { const r = ease((lt - 1.2) / 0.4); c.globalAlpha = 0.5; rr(c, SX + 90, SY + 690, (SW - 220) * r, 6, 3, BLUE); c.globalAlpha = 1; } // rereading underline
  }, {thumb: [PX + PW - 60, 1380]});
}, {cam: lt => ({z: lerp(1.0, 1.18, ease(lt / 2.2)), fx: 640, fy: lerp(1000, 960, lt / 2.2)})});
shot(26.7, 28.3, (ctx, lt, t) => {
  bg(ctx); floor(ctx); table(ctx, 760, 0);
  const relax = ease((lt - 0.7) / 0.5), read = Math.floor(lt * 3) % 2;
  guy(ctx, 600, GROUND, 1.25, {...STAND, hip: [0, -223 + relax * 6], lean: lerp(0.06, 0, relax), headLean: lerp(0.35, 0.25, relax), lh: [70, -170], rh: [90, -175], elbow: [1, 1], knee: [-1, -1]},
    {gx: relax > 0.5 ? 0.5 : (read ? 0.75 : 0.35), gy: 0.7, mouth: relax > 0.6 ? 'smile' : 'flat'}, {after: (c, j) => phoneSmall(c, j.rh[0] + 2, j.rh[1] - 30, 0.15, 1, true)});
  if (lt > 0.9) ev(27.6, 'warm', 1);
}, {cam: lt => ({z: lerp(1.6, 1.75, lt / 1.6), fx: 660, fy: 1150})});
shot(28.3, 29.6, (ctx, lt, t) => {
  bg(ctx); floor(ctx); table(ctx, 760, 0); const up = ease((lt - 0.25) / 0.4);
  if (t > 28.5 && t < 28.54) ev(28.52, 'tap', 0.8); if (lt > 0.7) { ev(28.95, 'ring', 0.5); ev(29.45, 'ring', 0.5); }
  guy(ctx, 600, GROUND, 1.25, {...STAND, headLean: lerp(0.25, -0.02, up), lh: [70, -170], rh: mix([90, -175], [42, -400], up), elbow: [1, 1]}, {gx: 0.5, gy: lerp(0.7, 0, up), mouth: 'smile'},
    {after: (c, j) => phoneSmall(c, j.rh[0] - 4, j.rh[1] - 20, lerp(0.15, -0.4, up), 1, true)});
}, {cam: () => ({z: 1.6, fx: 660, fy: 1120})});
shot(29.6, 31.0, (ctx, lt, t) => { // Sam picks up
  bg(ctx); floor(ctx); const up = ease((lt - 0.3) / 0.35); if (t > 29.9 && t < 29.94) ev(29.92, 'pickup', 0.8);
  guy(ctx, 700, GROUND, 1.25, {...STAND, headLean: lerp(0.2, 0, up), lh: [-60, -110], rh: mix([70, -150], [40, -400], up), elbow: [1, 1]}, {gx: 0.5, gy: lerp(0.6, 0, up), mouth: up > 0.5 ? 'grin' : 'O', eyes: up > 0.5 ? 'happy' : undefined},
    {flip: true, scarf: true, after: (c, j) => phoneSmall(c, j.rh[0] - 4 + (lt < 0.3 ? Math.sin(t * 160) * 4 : 0), j.rh[1] - 20, lerp(0.1, -0.4, up), 1, true)});
}, {cam: () => ({z: 1.55, fx: 680, fy: 1120})});
// FINAL — out the door into white, still on the phone
shot(31.0, 34.5, (ctx, lt, t) => {
  bg(ctx); const fade = clamp(1 - (lt - 0.6) / 1.4);
  ctx.globalAlpha = fade; door(ctx, 260, 1); floor(ctx, -400, 700); ctx.globalAlpha = 1;
  const x = 360 + lt * 120;
  guy(ctx, x, GROUND, 1.25, walk(lt * 1.15, {lean: 0.02, headLean: -0.05, rh: [40, -400], lh: [-20 - 25 * Math.sin(lt * 7.2), -110]}), {gx: 0.6, gy: -0.1, mouth: 'smile'},
    {after: (c, j) => phoneSmall(c, j.rh[0] - 4, j.rh[1] - 20, -0.4, 1, true)});
  const lines = [['MAYBE BEING', NAVY], ['REMEMBERED', BLUE], ["ISN'T THE SAME AS", NAVY], ['BEING SEEN.', NAVY]];
  lines.forEach(([s, c], i) => { const a = ease((lt - 0.5 - i * 0.28) / 0.35); if (a > 0) { ctx.globalAlpha = a; txt(ctx, s, 640, 420 + i * 108 + (1 - a) * 16, 92, c); ctx.globalAlpha = 1; } });
}, {cam: lt => ({z: lerp(1.0, 0.94, lt / 3.5), fx: 640, fy: 1140}), final: true});

// ---------------- overlays + frame loop ----------------
function dayLabel(ctx, t) {
  const d = DAYS.find(([a, b]) => t >= a && t < b); if (!d) return;
  const pop = ease((t - d[0]) / 0.16), s = lerp(0.9, 1, pop);
  ctx.save(); ctx.globalAlpha = pop; ctx.translate(96, 300); ctx.scale(s, s);
  txt(ctx, `DAY ${d[2]}`, 0, 0, 104, NAVY, 'InterTight', 'left');
  rr(ctx, 4, 78, 420, 10, 5, LINEC); rr(ctx, 4, 78, Math.max(10, 420 * d[2] / 30), 10, 5, BLUE);
  ctx.restore();
}
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
function drawFrame(t) {
  const si = shots.findIndex(s => t >= s.a && t < s.b), s = shots[si === -1 ? shots.length - 1 : si], lt = t - s.a;
  D.reseed(500 + si * 31);                       // stable linework within a shot: clean, not boiling
  ctx.resetTransform(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (s.pixels) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    if (lt < 0.3 && Math.floor(t * 24) % 2 === 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(-10, 0); pixelFrame(ctx, t); ctx.restore(); } // RGB-ish double image
    pixelFrame(ctx, t);
    if (lt < 0.18) ev(0, 'glitch', 1);
    // phone stays whole and starts to fall once the hand is gone
    ctx.scale(K, K); const f = clamp((t - 0.62) / 0.5); phoneSmall(ctx, 640 + 1.9 * 103, 1500 - 1.9 * 178 + 1400 * f * f * 0.25, f * 1.2, 1.9, true);
    return;
  }
  ctx.scale(K, K); ctx.save();
  const c = s.cam ? s.cam(lt) : {z: 1, fx: DW / 2, fy: DH / 2}, hh = s.hand || 0.8, sh = s.shake ? s.shake(lt) : 0;
  const hx = noise(t, 0.3, si) * hh * 2 + (sh ? Math.sin(t * 80) * sh : 0), hy = noise(t, 0.24, si + 3) * hh * 2 + (sh ? Math.cos(t * 71) * sh : 0);
  ctx.translate(DW / 2 + hx, DH / 2 + hy); ctx.scale(c.z, c.z); ctx.translate(-c.fx, -c.fy);
  s.draw(ctx, lt, t); ctx.restore();
  if (s.day) dayLabel(ctx, t);
}
function beds() {
  events.push({kind: 'bed', name: 'room', a: 3.45, b: 7.7, gain: 1}, {kind: 'bed', name: 'room', a: 12.5, b: 19.7, gain: 0.7},
    {kind: 'music', name: 'reconnect', a: 7.7, b: 19.4, gain: 1}, {kind: 'music', name: 'resolve', a: 26.9, b: 34.5, gain: 1});
}
const stills = process.argv.includes('--stills') ? process.argv[process.argv.indexOf('--stills') + 1].split(',').map(Number) : null;
if (stills) {
  fs.mkdirSync(path.join(BUILD, 'stills'), {recursive: true});
  for (const t of stills) { drawFrame(t); fs.writeFileSync(path.join(BUILD, 'stills', `t${t.toFixed(2)}.png`), canvas.toBuffer('image/png')); }
  console.log('stills', stills.length);
} else {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(BUILD, 'video.mp4')], {stdio: ['pipe', 'inherit', 'inherit']});
  const total = Math.round(DUR * FPS);
  for (let f = 0; f < total; f++) {
    drawFrame(f / FPS); const raw = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); beds();
  fs.writeFileSync(path.join(BUILD, 'events.json'), JSON.stringify(events.sort((a, b) => (a.t ?? a.a) - (b.t ?? b.a)), null, 1));
  console.log('frames', total, 'events', events.length);
}
