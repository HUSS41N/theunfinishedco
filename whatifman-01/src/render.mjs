// WhatIfMan #1 — "What If Your Phone Predicted Your Death?"
// Draws every frame at 24 fps (poses on twos, line boil at 12 fps), pipes RGBA to ffmpeg, and writes the
// sound-event list that sfx.py mixes. Usage:
//   node src/render.mjs                 -> build/video.mp4 + build/events.json + build/captions.srt
//   node src/render.mjs --stills 1,19.1 -> build/stills/*.png at those times (review without a full render)
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createCanvas, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import * as D from './draw.mjs';
const {INK, RED, YELLOW, STICKY, GREEN, NAVY, PAPER, GRAY, WOOD, BLUE, R} = D;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BUILD = path.join(ROOT, 'build'); fs.mkdirSync(BUILD, {recursive: true});
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', 'Chalk');
GlobalFonts.registerFromPath('/Users/hussain/.claude/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'UI');
const TM = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));
const Z = TM.zero, TN = TM.t_notify, PH = Object.fromEntries(TM.phrases.map(p => [p.key, p]));
const FPS = 24, DUR = 60, W = 1080, H = 1920, DW = 1280, DH = 2276, K = W / DW;
const TU = 56.3;            // second prediction lands ("Prediction updated…")
const GROUND = 1560;        // pavement / floor line in world units

// ---------------- helpers ----------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
function mix(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {...a}; for (const k in b) o[k] = k in a ? mix(a[k], b[k], t) : b[k]; return o; }
  return t < 0.5 ? a : b;
}
// keys: [[t, value], ...] (t ascending). Smoothstep between keys; strings switch at the halfway point.
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys.at(-1)[1];
}
const step = (keys, t) => { let v = keys[0][1]; for (const [k, x] of keys) if (t >= k) v = x; return v; };
const twos = t => Math.floor(t * 12) / 12;                 // poses advance on twos, like hand animation
const remaining = t => Math.max(0, Math.ceil(Z - t - 1e-9));
const remaining2 = t => Math.max(0, Math.ceil(TU + 60 - t - 1e-9));
const mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const noise = (t, f, s = 0) => Math.sin(t * f * 6.283 + s) * 0.6 + Math.sin(t * f * 2.71 * 6.283 + s * 1.7) * 0.4;

// ---------------- events for the sound mix ----------------
const events = [], seen = new Set();
const ev = (t, kind, gain = 1, extra = {}) => { const k = kind + '@' + t.toFixed(2); if (!seen.has(k)) { seen.add(k); events.push({t: +t.toFixed(3), kind, gain, ...extra}); } };

// ---------------- character ----------------
function shoes(ctx, j) { for (const f of [j.lf, j.rf]) { D.ellipse(ctx, f[0] + 13, f[1] - 5, 24, 11, {fill: RED, w: 4.5}); D.line(ctx, [[f[0] - 6, f[1] + 5], [f[0] + 34, f[1] + 4]], {w: 4.5, amp: 0.3}); } }
function guy(ctx, x, y, s, p, face, {flip = false, alpha = 1, noShoes = false, after} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.globalAlpha = alpha;
  D.setLW(s > 1.3 ? 1.3 / s : 1);
  const j = D.pose(p); D.figure(ctx, j, face); if (!noShoes) shoes(ctx, j); if (after) after(ctx, j);
  D.setLW(1); ctx.restore(); return j;
}
const STAND = {hip: [0, -223], lean: 0, lf: [-55, 0], rf: [60, 0], lh: [-80, -110], rh: [85, -110], elbow: [1, -1], knee: [-1, -1]};
// Run cycle facing right; local origin = point on the ground under the hip.
function run(phase, {arms = 1, lean = 0.28, flail = 0} = {}) {
  const a = phase * 6.283, b = a + Math.PI, bob = Math.abs(Math.sin(a)) * 14;
  const foot = x => [95 * Math.cos(x), -Math.max(0, 75 * Math.sin(x))];
  const hand = (x, side) => [30 - 75 * Math.cos(x) * arms + flail * 40 * Math.sin(x * 2 + side), -150 - 40 * Math.sin(x) * arms - flail * 70 * (0.5 + 0.5 * Math.sin(x * 3 + side))];
  return {hip: [0, -205 - bob], lean, headLean: -0.05, lf: foot(a), rf: foot(b), lh: hand(b, 1), rh: hand(a, 2), elbow: [1, 1], knee: [-1, -1]};
}
function footsteps(t0, t1, cadence, t, gain = 0.6) { // emit a footstep each half-cycle while running
  if (t < t0 || t > t1) return; const n = Math.floor((t - t0) * cadence * 2); ev(t0 + n / (cadence * 2), 'step', gain);
}

// ---------------- environments ----------------
function paperBg(ctx, color = '#FDFDFC', grid = true) {
  ctx.fillStyle = color; ctx.fillRect(-4000, -4000, 12000, 12000);
  if (!grid) return; ctx.beginPath(); ctx.strokeStyle = 'rgba(76,90,105,.045)'; ctx.lineWidth = 1.2;
  for (let x = -2000; x < 9000; x += 64) { ctx.moveTo(x, -2000); ctx.lineTo(x, 5000); }
  for (let y = -2000; y < 5000; y += 64) { ctx.moveTo(-2000, y); ctx.lineTo(9000, y); } ctx.stroke();
}
function bedroom(ctx, t) {
  paperBg(ctx);
  ctx.fillStyle = '#F2EEE7'; ctx.fillRect(-2000, GROUND, 6000, 2000); D.line(ctx, [[-200, GROUND], [1500, GROUND + 2]], {w: 5, color: GRAY});
  // window, night outside
  D.rect(ctx, 780, 520, 380, 420, {fill: '#26324A', w: 7});
  D.dot(ctx, 1040, 620, 42, 42, '#F6E7B0'); D.dot(ctx, 1056, 610, 36, 36, '#26324A');
  for (const [x, y] of [[860, 600], [930, 760], [1100, 840]]) D.dot(ctx, x, y, 4, 4, '#F6E7B0');
  D.line(ctx, [[970, 520], [970, 940]], {w: 6}); D.line(ctx, [[780, 730], [1160, 730]], {w: 6});
  D.poly(ctx, [[760, 500], [840, 500], [820, 980], [740, 990]], {fill: '#E7B9A6', w: 5}); D.poly(ctx, [[1100, 500], [1180, 500], [1200, 990], [1120, 980]], {fill: '#E7B9A6', w: 5});
  // poster
  D.rect(ctx, 320, 560, 230, 300, {fill: STICKY, w: 5}); D.text(ctx, 'NO', 435, 640, {size: 60, color: RED}); D.text(ctx, 'STRESS', 435, 720, {size: 46});
  // nightstand + lamp with warm glow
  const g = ctx.createRadialGradient(170, 1150, 20, 170, 1150, 520); g.addColorStop(0, 'rgba(246,201,69,.30)'); g.addColorStop(1, 'rgba(246,201,69,0)');
  ctx.fillStyle = g; ctx.fillRect(-400, 600, 1200, 1200);
  D.rect(ctx, 60, 1300, 220, 260, {fill: WOOD, w: 6}); D.line(ctx, [[80, 1420], [260, 1420]], {w: 4});
  D.line(ctx, [[170, 1300], [170, 1190]], {w: 7}); D.poly(ctx, [[100, 1190], [240, 1190], [205, 1090], [135, 1090]], {fill: YELLOW, w: 6});
  // bed
  D.rect(ctx, 300, 1050, 70, 510, {fill: WOOD, w: 6});                     // headboard
  D.rect(ctx, 330, 1380, 900, 90, {fill: WOOD, w: 6});                     // frame
  D.line(ctx, [[360, 1470], [360, GROUND]], {w: 7}); D.line(ctx, [[1200, 1470], [1200, GROUND]], {w: 7});
  D.rect(ctx, 360, 1270, 850, 115, {fill: PAPER, w: 6});                   // mattress
  D.ellipse(ctx, 470, 1255, 105, 42, {fill: PAPER, w: 6});                 // pillow
}
function blanket(ctx) { D.poly(ctx, [[760, 1262], [1215, 1258], [1222, 1395], [740, 1400]], {fill: '#DCE6F2', w: 6}); D.line(ctx, [[820, 1300], [1150, 1296]], {w: 3, color: GRAY}); }
function chips(ctx, x, y, a = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  D.poly(ctx, [[-48, -62], [48, -66], [54, 60], [-54, 64]], {fill: RED, w: 5}); D.rect(ctx, -34, -22, 68, 40, {fill: YELLOW, w: 3.5});
  D.text(ctx, 'CHIPS', 0, -2, {size: 20}); ctx.restore();
}
function handPhone(ctx, x, y, a = 0, s = 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); D.rect(ctx, -26, -46, 52, 92, {fill: NAVY, w: 5}); D.rect(ctx, -18, -36, 36, 66, {fill: '#9FD3EA', w: 0}); ctx.restore(); }

const FACADES = ['#F3EEE6', '#E9EEF3', '#F6E9DF', '#EEF0E6'];
function street(ctx, x0, x1, t, opts = {}) {
  paperBg(ctx, '#FDFDFC', true);
  const bw = 430;
  for (let i = Math.floor((x0 - 600) / bw); i * bw < x1 + 600; i++) {
    const bx = i * bw, h = [1150, 980, 1240, 1060][((i % 4) + 4) % 4], top = GROUND - h;
    D.rect(ctx, bx + 10, top, bw - 20, h, {fill: FACADES[((i % 4) + 4) % 4], w: 6});
    for (let r = 0; r < Math.floor((h - 300) / 200); r++) for (let c = 0; c < 3; c++) {
      const wx = bx + 50 + c * 125, wy = top + 70 + r * 200;
      if (opts.balconyAt === i && r === 2) continue;
      D.rect(ctx, wx, wy, 80, 120, {fill: '#CFE3EF', w: 4.5}); D.line(ctx, [[wx + 40, wy], [wx + 40, wy + 120]], {w: 3});
    }
    D.rect(ctx, bx + 160, GROUND - 230, 110, 230, {fill: '#C99A6B', w: 5}); D.dot(ctx, bx + 250, GROUND - 115, 6, 6);
  }
  ctx.fillStyle = '#E8E5DF'; ctx.fillRect(x0 - 2000, GROUND, x1 - x0 + 4000, 110);
  D.line(ctx, [[x0 - 600, GROUND], [x1 + 600, GROUND + 2]], {w: 5});
  ctx.fillStyle = '#D3D3CE'; ctx.fillRect(x0 - 2000, GROUND + 110, x1 - x0 + 4000, 1000);
  D.line(ctx, [[x0 - 600, GROUND + 110], [x1 + 600, GROUND + 112]], {w: 6});
  for (let x = Math.floor(x0 / 260) * 260 - 520; x < x1 + 520; x += 260) D.line(ctx, [[x, GROUND + 330], [x + 130, GROUND + 330]], {w: 10, color: PAPER, amp: 0.4});
  for (let x = Math.floor(x0 / 900) * 900 - 900; x < x1 + 900; x += 900) { // lamp posts
    D.line(ctx, [[x + 600, GROUND + 40], [x + 600, GROUND - 640]], {w: 8}); D.line(ctx, [[x + 600, GROUND - 640], [x + 680, GROUND - 640]], {w: 7}); D.ellipse(ctx, x + 690, GROUND - 625, 26, 14, {fill: YELLOW, w: 4});
  }
}
// balcony on the building over the impact spot; `pots` shows how many are still up there
function balcony(ctx, x, y, pots, t) {
  D.rect(ctx, x, y - 240, 240, 240, {fill: '#5B6170', w: 5});
  const sway = Math.sin(t * 2.2) * 14; D.poly(ctx, [[x + 20, y - 230], [x + 120 + sway, y - 230], [x + 105 + sway * 1.4, y - 10], [x + 30, y - 12]], {fill: '#F0E4C8', w: 4});
  D.rect(ctx, x - 40, y, 320, 24, {fill: '#B8B8B2', w: 5});
  for (let k = 0; k < 7; k++) D.line(ctx, [[x - 30 + k * 50, y], [x - 30 + k * 50, y - 110]], {w: 4}); D.line(ctx, [[x - 40, y - 110], [x + 280, y - 112]], {w: 6});
  for (const [k, px] of [x - 10, x + 100, x + 210].entries()) if (k < pots) pot(ctx, px, y - 4, 0);
}
function pot(ctx, x, y, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  D.poly(ctx, [[-34, -60], [34, -60], [24, 0], [-24, 0]], {fill: '#D9774A', w: 5}); D.rect(ctx, -40, -72, 80, 16, {fill: '#C9673C', w: 4});
  for (const [lx, ly] of [[-26, -120], [0, -140], [26, -118]]) D.poly(ctx, [[0, -70], [lx - 12, ly + 20], [lx, ly], [lx + 12, ly + 22]], {fill: GREEN, w: 4});
  ctx.restore();
}
function smash(ctx, x, y, dt) { // dt = seconds since impact
  if (dt < 0) return; const s = Math.min(dt, 0.6);
  D.ellipse(ctx, x, y + 6, 110, 16, {fill: '#8B5E3C', w: 0});
  const shards = [[-1, -1.2, .4], [1, -1.4, -.6], [-1.6, -.6, 1], [1.5, -.7, .9], [.3, -1.8, -1.2], [-.4, -1.5, .7]];
  for (const [vx, vy, rot] of shards) {
    const px = x + vx * 260 * s, py = Math.min(y - 4, y + vy * 520 * s + 1400 * s * s);
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot * s * 6); D.poly(ctx, [[-16, -10], [18, -14], [8, 12]], {fill: '#D9774A', w: 3.5}); ctx.restore();
  }
  ctx.save(); ctx.translate(x + 60, y - 10); ctx.rotate(1.2); for (const [lx, ly] of [[-26, -60], [0, -80], [26, -58]]) D.poly(ctx, [[0, 0], [lx - 12, ly + 20], [lx, ly], [lx + 12, ly + 22]], {fill: GREEN, w: 4}); ctx.restore();
  if (dt < 0.9) { ctx.globalAlpha = clamp(1 - dt / 0.9) * 0.6; for (const [dx, r] of [[-90, 50], [0, 70], [90, 55]]) D.ellipse(ctx, x + dx * (1 + dt), y - 30 - dt * 60, r * (1 + dt), r * 0.7 * (1 + dt), {fill: '#E7DFD3', w: 0}); ctx.globalAlpha = 1; }
}
function car(ctx, x, y, t) {
  D.poly(ctx, [[-260, -60], [-200, -150], [80, -150], [170, -60], [270, -40], [270, 30], [-280, 30]], {fill: '#3D6FA8', w: 7});
  D.poly(ctx, [[-185, -135], [-60, -135], [-60, -70], [-235, -70]], {fill: '#CFE3EF', w: 4}); D.poly(ctx, [[-40, -135], [70, -135], [140, -70], [-40, -70]], {fill: '#CFE3EF', w: 4});
  D.ellipse(ctx, 250, -20, 16, 12, {fill: YELLOW, w: 3});
  for (const wx of [-170, 160]) { D.ellipse(ctx, wx, 32, 52, 52, {fill: '#333', w: 6}); D.ellipse(ctx, wx, 32, 20, 20, {fill: '#BBB', w: 3}); }
}
function shelterOutside(ctx, x, doorOpen) {
  D.rect(ctx, x, GROUND - 560, 620, 560, {fill: '#A9ABAA', w: 8});
  for (const yy of [GROUND - 420, GROUND - 280, GROUND - 140]) D.line(ctx, [[x + 10, yy], [x + 610, yy + 3]], {w: 3, color: '#8A8C8B'});
  D.rect(ctx, x + 60, GROUND - 640, 500, 90, {fill: '#8F9291', w: 6}); D.text(ctx, 'SHELTER', x + 310, GROUND - 595, {size: 64, color: PAPER});
  D.rect(ctx, x + 220, GROUND - 400, 200, 400, {fill: doorOpen ? '#1A1B1D' : '#6E7378', w: 7});
  for (let k = 0; k < 6; k++) D.poly(ctx, [[x + 200 + k * 40, GROUND - 440], [x + 220 + k * 40, GROUND - 440], [x + 200 + k * 40, GROUND - 410], [x + 180 + k * 40, GROUND - 410]], {fill: k % 2 ? INK : YELLOW, w: 0});
}
function shelterInside(ctx, t, door, bolt) {
  paperBg(ctx, '#55585D', false);
  ctx.fillStyle = '#3F4145'; ctx.fillRect(-2000, GROUND, 6000, 2000); D.line(ctx, [[-200, GROUND], [1500, GROUND + 2]], {w: 6, color: '#222'});
  for (const yy of [700, 1000, 1300]) D.line(ctx, [[-100, yy], [1400, yy + 4]], {w: 3, color: '#46494D'});
  for (const xx of [420, 980]) D.line(ctx, [[xx, 300], [xx + 6, GROUND]], {w: 3, color: '#46494D'});
  // door on the left: door = 0 closed .. 1 open (bright doorway)
  D.rect(ctx, 80, 900, 300, 660, {fill: '#1E1F21', w: 7});
  if (door > 0.02) { ctx.fillStyle = '#F2EEE6'; ctx.fillRect(86, 906, 288 * door, 648); }
  D.rect(ctx, 80 + 300 * door, 900, 300 * (1 - door) + 2, 660, {fill: '#6E7378', w: door < 0.98 ? 7 : 0});
  if (door < 0.05) { D.rect(ctx, 300, 1180, 120, 34, {fill: '#9A9EA2', w: 5}); D.rect(ctx, 300 + 70 * bolt, 1170, 60, 54, {fill: '#C9CCCF', w: 5}); }
  // single bulb, swinging
  const sw = Math.sin(t * 1.9) * 0.09, bx = 760 + Math.sin(sw) * 380, by = 160 + Math.cos(sw) * 380;
  const g = ctx.createRadialGradient(bx, by + 40, 10, bx, by + 400, 900); g.addColorStop(0, 'rgba(255,236,170,.55)'); g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g; ctx.fillRect(-500, -200, 2400, 2600);
  D.line(ctx, [[760, 160], [bx, by]], {w: 4, color: '#222'}); D.ellipse(ctx, bx, by + 18, 26, 30, {fill: '#FFF2B8', w: 4});
}

// ---------------- the phone close-up ----------------
function roundRect(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function ui(ctx, s, x, y, size, color, weight = 700, align = 'center') { ctx.font = `${weight} ${size}px UI`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
function notifCard(ctx, x, y, lines, {title = 'UNKNOWN APP'} = {}) {
  roundRect(ctx, x, y, 560, 120 + lines.length * 62, 34, 'rgba(250,250,248,.96)');
  roundRect(ctx, x + 28, y + 26, 54, 54, 14, '#111'); ui(ctx, '?', x + 55, y + 54, 40, '#fff');
  ui(ctx, title, x + 100, y + 54, 26, '#6B6B66', 700, 'left'); ui(ctx, 'now', x + 532, y + 54, 26, '#8B8B86', 400, 'right');
  lines.forEach((s, i) => ui(ctx, s, x + 30, y + 118 + i * 58, 40, '#151515', i === 0 ? 800 : 600, 'left'));
}
// state: 'notif' | 'home' | 'glitch' | 'zero' | 'update' ; o: {count, slide, swipe, tapAt, buzz}
function phoneCloseup(ctx, t, state, o = {}) {
  const PX = 330, PY = 360, PW = 620, PH = 1240, buzz = o.buzz ? Math.sin(t * 220) * 7 : 0;
  ctx.save(); ctx.translate(buzz, 0);
  D.line(ctx, [[1300, 2400], [1010, 1640]], {w: 9}); // forearm entering from the bottom right
  roundRect(ctx, PX - 6, PY - 6, PW + 12, PH + 12, 84, INK); roundRect(ctx, PX, PY, PW, PH, 78, '#1E2433');
  const SX = PX + 26, SY = PY + 26, SW = PW - 52, SH = PH - 52;
  ctx.save(); ctx.beginPath(); ctx.roundRect(SX, SY, SW, SH, 58); ctx.clip();
  const bg = ctx.createLinearGradient(0, SY, 0, SY + SH);
  if (state === 'glitch') { bg.addColorStop(0, '#2A0505'); bg.addColorStop(1, '#090909'); }
  else { bg.addColorStop(0, '#34405E'); bg.addColorStop(1, '#10141F'); }
  ctx.fillStyle = bg; ctx.fillRect(SX, SY, SW, SH);
  ui(ctx, '11:42', SX + 60, SY + 50, 30, '#E9ECF2', 700, 'left'); roundRect(ctx, SX + SW / 2 - 70, SY + 22, 140, 38, 19, '#000');
  const cx = SX + SW / 2;
  if (state === 'home') {
    const cols = ['#7EC8E3', '#F6C945', '#3FA466', '#EC4338', '#B9A4E3', '#F2A65A'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      const ix = SX + 52 + c * 128, iy = SY + 150 + r * 150, unknown = r === 2 && c === 1;
      roundRect(ctx, ix, iy, 96, 96, 24, unknown ? '#111' : cols[(r * 4 + c) % 6]);
      if (unknown) { ui(ctx, '?', ix + 48, iy + 50, 60, '#fff'); if (o.tapAt !== undefined && t > o.tapAt - 0.15 && t < o.tapAt + 0.2) D.ellipse(ctx, ix + 48, iy + 48, 70, 70, {w: 6, color: '#FFFFFF'}); }
    }
  } else if (state === 'glitch') {
    const j = Math.floor(t * 12) % 3, off = [[-6, 3], [5, -4], [-3, -5]][j];
    for (const [c, dx, dy] of [['rgba(255,40,40,.85)', off[0], off[1]], ['rgba(80,220,255,.6)', -off[0], -off[1]], ['#FFFFFF', 0, 0]]) {
      ui(ctx, 'YOU', cx + dx, SY + 330 + dy, 120, c, 900); ui(ctx, 'CANNOT', cx + dx, SY + 470 + dy, 120, c, 900); ui(ctx, 'ESCAPE.', cx + dx, SY + 610 + dy, 120, c, 900);
    }
    ui(ctx, mmss(o.count), cx, SY + 900, 150, RED, 900); ui(ctx, 'TIME REMAINING', cx, SY + 1010, 28, '#C9C9C9', 700);
  } else {
    if (state !== 'zero') {
      const lines = state === 'update' ? ['Prediction updated.', 'You have 60 seconds', 'remaining.'] : ['Your death is in', `${o.first ?? 43} seconds.`];
      const y = SY + 140 - (1 - (o.slide ?? 1)) * 420, sc = 1 - (o.swipe ?? 0) * 0.5;
      ctx.save(); ctx.translate(cx, y - (o.swipe ?? 0) * 700); ctx.scale(sc, sc); ctx.globalAlpha = 1 - (o.swipe ?? 0); notifCard(ctx, -280, 0, lines); ctx.restore();
    }
    if ((o.swipe ?? 0) < 0.3) {
      ui(ctx, mmss(o.count), cx, SY + 820, state === 'zero' ? 230 : 190, state === 'zero' ? '#FF4B40' : RED, 900);
      ui(ctx, 'TIME REMAINING', cx, SY + 950, 28, '#C9C9C9', 700);
    }
  }
  ctx.restore();
  // hand: palm behind the right edge and a big stick thumb on the glass
  D.ellipse(ctx, PX + PW + 6, 1460, 70, 110, {fill: PAPER, w: 7});
  const th = o.thumb || [PX + PW - 60, 1280];
  D.ellipse(ctx, th[0], th[1], 34, 58, {fill: PAPER, w: 7, rot: -0.5});
  for (const fy of [980, 1090, 1200]) D.ellipse(ctx, PX - 8, fy, 34, 24, {fill: PAPER, w: 6});
  ctx.restore();
}

// ---------------- face close-up ----------------
function faceCloseup(ctx, face, {tilt = 0, x = 640, y = 1000, s = 5.2, bg = 'street', shake = 0, t = 0} = {}) {
  if (bg === 'street') { paperBg(ctx, '#F3EEE6', false); ctx.fillStyle = '#E9EEF3'; ctx.fillRect(-200, -200, 700, 3000); D.rect(ctx, 820, 300, 260, 400, {fill: '#CFE3EF', w: 6}); }
  else if (bg === 'room') { paperBg(ctx, '#FDFDFC', true); D.rect(ctx, 860, 200, 380, 420, {fill: '#26324A', w: 7}); D.rect(ctx, -60, 260, 260, 320, {fill: STICKY, w: 6}); const g = ctx.createRadialGradient(0, 1100, 50, 0, 1100, 900); g.addColorStop(0, 'rgba(246,201,69,.3)'); g.addColorStop(1, 'rgba(246,201,69,0)'); ctx.fillStyle = g; ctx.fillRect(-500, 0, 2000, 2400); }
  else if (bg === 'shelter') { paperBg(ctx, '#4A4D52', false); const g = ctx.createRadialGradient(700, 300, 50, 700, 600, 1400); g.addColorStop(0, 'rgba(255,236,170,.35)'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.fillRect(-200, -200, 2000, 3000); }
  ctx.save(); ctx.translate(x + Math.sin(t * 70) * shake, y); ctx.scale(s, s); D.setLW(1.25 / s * 2.2);
  D.line(ctx, [[0, R], [-6, R + 500]], {w: 6}); // neck/torso leaving frame
  D.head(ctx, [0, 0], tilt, face); D.setLW(1); ctx.restore();
}

// ---------------- shot list ----------------
// Each shot: [start, end, draw(ctx, lt, t), opts]; opts.cam(lt) -> {z, fx, fy}; opts.hud; opts.vignette; opts.hand (handheld px)
const P = k => PH[k];
const shots = [];
const shot = (a, b, draw, opts = {}) => shots.push({a, b, draw, ...opts});

// 1A — lying in bed, scrolling, eating chips
const LIE = {hip: [0, 0], lean: -0.62, headLean: 0.25, lf: [222, 4], rf: [150, -100], knee: [-1, -1], lh: [20, -205], rh: [60, -215], elbow: [1, 1], footDir: [1, 1]};
const BEDX = 520, BEDY = 1262;
shot(0, 5.7, (ctx, lt, t) => {
  bedroom(ctx, t);
  const T2 = twos(lt), flick = Math.sin(T2 * 9) * 6;
  const eat = kf([[0, 0], [2.0, 0], [2.4, 1], [2.75, 2], [3.3, 2], [3.7, 0]], T2); // 0 phone, 1 bag, 2 mouth
  const lh = eat < 1 ? mix([20, -205], [95, -40], eat) : mix([95, -40], [-60, -195], eat - 1);
  if (eat > 1.8 && eat < 2.05) ev(t, 'crunch', 0.9);
  const footBounce = Math.sin(T2 * 7) * 10;
  const p = {...LIE, lh, rh: [60, -215 + flick], rf: [150, -100 + footBounce]};
  const j = guy(ctx, BEDX, BEDY, 1.15, p, {gx: 0.7, gy: 0.2, mouth: eat > 1.9 && eat < 2.3 ? 'O' : 'smile', brows: 'flat', eyes: Math.floor(T2 * 12) % 40 === 7 ? 'closed' : undefined});
  chips(ctx, BEDX + 125, 1232, -0.25);
  handPhone(ctx, BEDX + 80 * 1.15, BEDY - 245 * 1.15 + flick, -0.35, 1.15);
  blanket(ctx);
}, {cam: lt => ({z: lerp(1.3, 1.55, ease(lt / 5.7)), fx: lerp(700, 640, ease(lt / 5.7)), fy: 1120}), hand: 3});
// 1B — buzz: he flinches
shot(5.7, 6.25, (ctx, lt, t) => {
  bedroom(ctx, t);
  if (lt < 0.05) ev(5.72, 'buzz', 1);
  const up = ease((lt - 0.1) / 0.2), buzz = Math.sin(t * 200) * 6;
  guy(ctx, BEDX, BEDY, 1.15, {...LIE, lean: lerp(-0.62, -0.4, up), headLean: lerp(0.25, -0.05, up), lh: [20, -205 - 10 * up], rh: [60, -215 - 10 * up]}, {gx: 0.7, gy: 0, mouth: up > 0.5 ? 'O' : 'smile', brows: up > 0.5 ? 'up' : 'flat', eyes: up > 0.5 ? 'wide' : undefined, lines: up > 0.5 ? 1 : 0});
  chips(ctx, BEDX + 125, 1232, -0.25); handPhone(ctx, BEDX + 85 * 1.15 + buzz, BEDY - 255 * 1.15, -0.35, 1.15); blanket(ctx);
}, {cam: () => ({z: 1.9, fx: 600, fy: 1030}), hand: 2});
// 1C — the notification, then 2A..2D
shot(6.25, 8.4, (ctx, lt, t) => {
  if (lt < 0.03) ev(TN, 'ping', 1);
  paperBg(ctx, '#F1EDE6', false);
  phoneCloseup(ctx, t, 'notif', {slide: ease((t - TN) / 0.25), count: remaining(t), first: TM.n0});
}, {cam: lt => ({z: lerp(1.0, 1.08, lt / 2.1), fx: 640, fy: 1050}), hand: 4});
const SIT = {hip: [0, -60], lean: -0.05, lf: [200, -10], rf: [230, -6], knee: [-1, -1], footDir: [1, 1], lh: [-60, -60], rh: [90, -160], elbow: [1, -1]};
shot(8.4, 9.65, (ctx, lt, t) => {
  bedroom(ctx, t); const T2 = twos(lt), bob = Math.abs(Math.sin(T2 * 13)) * 14;
  guy(ctx, BEDX + 40, 1300, 1.15, {...SIT, hip: [0, -60 - bob * 0.3], headLean: -0.12 + bob * 0.006, lh: [40, -80 + bob * 0.5], rh: [120, -190]}, {gx: 0.5, mouth: 'grin', brows: 'up', eyes: 'happy', sweat: lt > 0.7 ? 1 : 0});
  handPhone(ctx, BEDX + 40 + 128 * 1.15, 1300 - 232 * 1.15, -0.25, 1.15); chips(ctx, 900, 1232, 0.2); blanket(ctx);
  if (Math.floor(T2 * 13 / Math.PI) !== Math.floor((T2 - 1 / 12) * 13 / Math.PI)) ev(t, 'chuckle', 0.35);
}, {cam: () => ({z: 1.6, fx: 680, fy: 1060}), hand: 3, hud: true});
shot(9.65, 11.1, (ctx, lt, t) => {
  paperBg(ctx, '#F1EDE6', false);
  const sw = ease((lt - 0.35) / 0.4); if (lt > 0.33 && lt < 0.38) ev(t, 'swipe', 0.8);
  const thumb = [lerp(890, 700, ease((lt - 0.1) / 0.3)), lerp(1500, 1000, sw)];
  phoneCloseup(ctx, t, sw >= 1 ? 'home' : 'notif', {swipe: sw, count: remaining(t), first: TM.n0, thumb});
}, {cam: () => ({z: 1.0, fx: 640, fy: 1050}), hand: 3});
shot(11.1, 12.5, (ctx, lt, t) => {
  paperBg(ctx, '#F1EDE6', false);
  const tap = 11.45, open = ease((t - tap - 0.05) / 0.25); if (lt < 0.03) ev(tap, 'tap', 1);
  if (t > tap + 0.1 && t < tap + 0.15) ev(tap + 0.12, 'ping', 0.8);
  const thumb = [lerp(900, 580, ease(lt / 0.3)), lerp(1500, 860, ease(lt / 0.3))];
  if (open < 1) phoneCloseup(ctx, t, 'home', {tapAt: tap, thumb: open > 0 ? [900, 1420] : thumb});
  else phoneCloseup(ctx, t, 'notif', {slide: 1, count: remaining(t), first: TM.n0, thumb: [900, 1420]});
}, {cam: lt => ({z: lerp(1.0, 1.06, lt / 1.4), fx: 640, fy: 1050}), hand: 3});
shot(12.5, 15.4, (ctx, lt, t) => {
  const T2 = twos(lt);
  const face = step([[0, {gx: 0.2, gy: 0.6, mouth: 'grin', brows: 'up', eyes: 'happy'}], [0.7, {gx: 0.2, gy: 0.7, mouth: 'flat', brows: 'flat'}],
    [1.4, {gx: 0, gy: 0.5, mouth: 'wavy', brows: 'worried'}], [2.1, {gx: 0, gy: 0.3, mouth: 'wavy', brows: 'worried', eyes: 'wide', sweat: 1}]], T2);
  faceCloseup(ctx, face, {bg: 'room', tilt: lerp(0.08, -0.04, ease(lt / 2)), t});
}, {cam: lt => ({z: lerp(1.0, 1.18, ease(lt / 2.9)), fx: 640, fy: 1020}), hand: 3, hud: true});

// 3A..3F — outside
const BALC = 2;                          // facade index with the balcony
const BX = BALC * 430 + 95, BY = 900;    // balcony rail position (world)
const IMPACT = 19.0, POTX = BX + 100, FALL0 = IMPACT - 0.55;
const potsUp = t => t < FALL0 ? 3 : 2;
function fallingPot(ctx, t) { if (t < FALL0 || t >= IMPACT) return; const f = (t - FALL0) / (IMPACT - FALL0); pot(ctx, POTX, lerp(BY - 4, GROUND, f * f), f * 2.2);
  ctx.globalAlpha = 0.5; for (let k = 1; k < 4; k++) D.line(ctx, [[POTX - 30 + k * 15, lerp(BY, GROUND, f * f) - 160 - k * 40], [POTX - 30 + k * 15, lerp(BY, GROUND, f * f) - 110 - k * 30]], {w: 4, color: GRAY}); ctx.globalAlpha = 1; }
const runnerX = t => kf([[15.4, 330], [17.1, 760], [17.9, 900], [18.3, 930]], t);
shot(15.4, 17.1, (ctx, lt, t) => {
  const x = runnerX(t); street(ctx, x - 900, x + 900, t, {balconyAt: BALC}); balcony(ctx, BX, BY, potsUp(t), t);
  if (lt < 0.05) ev(15.42, 'door', 0.8);
  guy(ctx, x, GROUND, 1.2, run(twos(lt) * 2.6, {lean: 0.22}), {gx: 0.6, mouth: 'flat', brows: 'worried'});
  footsteps(15.5, 17.1, 2.6, t);
}, {cam: lt => ({z: 1.3, fx: runnerX(15.4 + lt) + 120, fy: 1230}), hand: 4, hud: true});
shot(17.1, IMPACT, (ctx, lt, t) => {
  const x = runnerX(t); street(ctx, x - 900, x + 900, t, {balconyAt: BALC}); balcony(ctx, BX, BY, potsUp(t), t);
  const T2 = twos(lt), slow = ease(lt / 0.8), lift = ease((t - 18.25) / 0.3);
  if (t >= FALL0 && t < FALL0 + 0.05) ev(FALL0, 'whoosh', 0.8);
  const walk = run(T2 * lerp(2.4, 1.2, slow), {lean: lerp(0.22, 0.04, slow), arms: lerp(1, 0.4, slow)});
  const p = lift > 0 ? mix(walk, {...STAND, lf: [-40, 0], rf: [110, -55], rh: [70, -235], lh: [-70, -110], headLean: 0.15, elbow: [1, 1]}, lift) : walk;
  guy(ctx, x, GROUND, 1.2, p, {gx: 0.5, gy: lift > 0.5 ? 0.6 : 0, mouth: 'flat', brows: 'flat'}, {after: (c, j) => { if (lift > 0.5) handPhone(c, j.rh[0] + 8, j.rh[1] - 30, 0.3); }});
  fallingPot(ctx, t); if (lift <= 0) footsteps(17.1, 18.2, 2.0, t, 0.45);
}, {cam: () => ({z: 1.22, fx: 960, fy: 1230}), hand: 3, hud: true});
shot(IMPACT, 21.0, (ctx, lt, t) => {
  if (lt < 0.05) ev(IMPACT, 'smash', 1);
  street(ctx, 0, 2000, t, {balconyAt: BALC}); balcony(ctx, BX, BY, 2, t); smash(ctx, POTX, GROUND, t - IMPACT);
  const back = ease(lt / 0.18), T2 = twos(lt);
  const p = mix({...STAND, lf: [-40, 0], rf: [110, -55], rh: [70, -235], lh: [-70, -110], headLean: 0.15, elbow: [1, 1]},
    {hip: [-60, -205], lean: -0.32, headLean: -0.1, lf: [-140, 0], rf: [40, 0], lh: [-40, -330], rh: [120, -320], elbow: [1, -1], knee: [-1, -1]}, back);
  guy(ctx, 930, GROUND, 1.2, p, {gx: 0.7, gy: 0.4, mouth: 'O', brows: 'up', eyes: 'wide', lines: T2 < 0.6 ? 1 : 0, sweat: T2 > 0.6 ? 1 : 0},
    {after: (c, j) => handPhone(c, j.rh[0] + 6, j.rh[1] - 30, 0.4)});
}, {cam: lt => ({z: lerp(1.22, 1.5, ease((lt - 0.3) / 1.6)), fx: lerp(980, 1000, lt / 2), fy: lerp(1220, 1300, ease(lt / 2))}), shake: lt => lt < 0.3 ? 22 * (1 - lt / 0.3) : 0, hand: 3, hud: true});
shot(21.0, 22.7, (ctx, lt, t) => {
  street(ctx, 0, 2000, t, {balconyAt: BALC}); balcony(ctx, BX, BY, 2, t);
}, {cam: lt => ({z: 1.7, fx: BX + 120, fy: lerp(860, 820, lt / 1.7)}), hand: 2, hud: true, vignette: 0.35});
shot(22.7, 25.25, (ctx, lt, t) => {
  const T2 = twos(lt);
  const face = step([[0, {gx: 0.1, gy: -0.8, mouth: 'flat', brows: 'flat'}], [0.6, {gx: 0, gy: 0, mouth: 'flat', brows: 'angry'}],
    [1.3, {gx: 0, gy: 0, mouth: 'wavy', brows: 'worried', sweat: 1}], [2.0, {gx: -0.3, gy: 0.1, mouth: 'wavy', brows: 'worried', eyes: 'wide', sweat: 1}]], T2);
  faceCloseup(ctx, face, {bg: 'street', tilt: 0.02 * Math.sin(T2 * 3), t});
}, {cam: lt => ({z: lerp(1.0, 1.12, ease(lt / 2.5)), fx: 640, fy: 1000}), hand: 3, hud: true});

// 4A..4F — panic run
const RUN4 = t => kf([[25.25, 1500], [29.6, 3000]], t);
shot(25.25, 29.6, (ctx, lt, t) => {
  const x = RUN4(t); street(ctx, x - 900, x + 900, t);
  guy(ctx, x, GROUND, 1.2, run(twos(lt) * 3.1, {lean: 0.32, flail: 0.6}), {gx: 0.6, mouth: 'shout', brows: 'worried', eyes: 'wide', sweat: 1});
  footsteps(25.3, 29.6, 3.1, t, 0.7);
}, {cam: lt => ({z: 1.3, fx: RUN4(25.25 + lt) + 160, fy: 1300}), hand: 6, hud: true});
const CAR0 = 29.75;
shot(29.6, 30.9, (ctx, lt, t) => {
  street(ctx, 2400, 4000, t); for (let k = 0; k < 6; k++) D.rect(ctx, 3000 + k * 70, GROUND + 130, 40, 300, {fill: PAPER, w: 0});
  if (lt < 0.05) { ev(CAR0, 'skid', 1); ev(CAR0 + 0.15, 'horn', 0.7); }
  const back = ease((t - CAR0) / 0.15), T2 = twos(lt);
  const p = mix({...STAND, rf: [120, 40], lean: 0.1, lh: [-60, -150], rh: [100, -150]}, {hip: [-40, -210], lean: -0.35, lf: [-110, 0], rf: [60, 0], lh: [-20, -340], rh: [110, -330], elbow: [1, -1], knee: [-1, -1]}, back);
  guy(ctx, 3050, GROUND, 1.2, p, {gx: 0.8, mouth: 'shout', brows: 'up', eyes: 'wide', lines: 1});
  const cx = lerp(4300, 2300, ease((t - CAR0) / 0.9)), skid = clamp((t - CAR0) / 0.9);
  ctx.globalAlpha = 0.5; D.line(ctx, [[cx + 170, GROUND + 330], [4300, GROUND + 338]], {w: 10, color: '#555'}); ctx.globalAlpha = 1;
  if (skid > 0 && skid < 1) { ctx.globalAlpha = 0.55 * (1 - skid); for (let k = 0; k < 4; k++) D.ellipse(ctx, cx + 200 + k * 70, GROUND + 300 - k * 20, 50 + k * 20, 35 + k * 12, {fill: '#E5E5E5', w: 0}); ctx.globalAlpha = 1; }
  ctx.save(); ctx.translate(cx, GROUND + 300); ctx.rotate(-0.04 * (1 - skid)); car(ctx, 0, 0, t); ctx.restore();
}, {cam: () => ({z: 1.25, fx: 3200, fy: 1480}), shake: lt => (lt > 0.15 && lt < 0.5) ? 10 : 0, hand: 4, hud: true});
shot(30.9, 32.0, (ctx, lt, t) => {
  const x = lerp(4500, 4800, lt / 1.1); street(ctx, 4000, 5400, t);
  const open = ease((t - 31.1) / 0.12), sx = 4730, sy = GROUND - 860; if (lt < 0.05) ev(31.1, 'bang', 0.9);
  D.rect(ctx, sx, sy, 85, 130, {fill: '#1A1B1D', w: 5}); ctx.save(); ctx.translate(sx, sy); ctx.scale(lerp(1, -0.6, open), 1); D.rect(ctx, 0, 0, 85, 130, {fill: '#5E8C6A', w: 5}); ctx.restore();
  const duck = ease((t - 31.15) / 0.15);
  const p = mix(run(twos(lt) * 3.0, {lean: 0.3, flail: 0.5}), {hip: [0, -170], lean: 0.6, headLean: 0.3, lf: [-80, 0], rf: [80, 0], lh: [10, -330], rh: [60, -320], elbow: [1, 1], knee: [-1, -1]}, duck * (lt < 0.9 ? 1 : 0.4));
  guy(ctx, x, GROUND, 1.2, p, {gx: 0.4, gy: -0.6, mouth: 'shout', brows: 'up', eyes: 'wide', lines: duck > 0.5 ? -1 : 0});
  footsteps(30.95, 31.1, 3, t, 0.6); footsteps(31.6, 32.0, 3, t, 0.6);
}, {cam: lt => ({z: 1.25, fx: lerp(4600, 4820, lt / 1.1), fy: 1230}), hand: 5, hud: true});
shot(32.0, 33.2, (ctx, lt, t) => {
  street(ctx, 5200, 6600, t); const meet = ease((t - 32.3) / 0.2), T2 = twos(lt);
  const px = lerp(6150, 5980, lt / 1.2);
  guy(ctx, px, GROUND, 1.15, {...run(T2 * 1.2, {lean: 0.02, arms: 0.3}), rh: [60, -250], lh: [-40, -120]}, {gx: 0.6, mouth: meet > 0.5 ? 'O' : 'flat', brows: meet > 0.5 ? 'up' : 'flat'},
    {flip: true, alpha: 0.55, noShoes: true, after: (c, j) => { D.line(c, [[j.rh[0], j.rh[1]], [j.rh[0], j.rh[1] - 210]], {w: 5}); D.poly(c, [[j.rh[0] - 150, j.rh[1] - 200], [j.rh[0], j.rh[1] - 280], [j.rh[0] + 150, j.rh[1] - 200]], {fill: '#7C8BA6', w: 5}); }});
  const x = lerp(5600, 5680, ease(lt / 0.3)) - meet * 120;
  const p = mix(run(T2 * 3, {lean: 0.3, flail: 0.4}), {hip: [-30, -215], lean: -0.4, lf: [-120, -40], rf: [40, 0], lh: [-30, -350], rh: [90, -340], elbow: [1, -1], knee: [-1, -1]}, meet);
  guy(ctx, x, GROUND, 1.2, p, {gx: 0.8, mouth: 'shout', brows: 'up', eyes: 'wide', lines: meet > 0.5 ? 1 : 0});
  if (lt < 0.05) ev(32.35, 'yelp', 0.6);
}, {cam: () => ({z: 1.3, fx: 5850, fy: 1300}), hand: 5, hud: true});
shot(33.2, 34.6, (ctx, lt, t) => {
  street(ctx, 6200, 7600, t); const fall = ease(lt / 0.3), T2 = twos(lt), pant = Math.sin(T2 * 18) * 8, ph = ease((t - 34.2) / 0.3);
  if (lt < 0.05) ev(33.45, 'thud', 0.9);
  const p = mix(run(0.3, {lean: 0.5}), {hip: [0, -112 + pant * 0.4], lean: 1.25, headLean: -0.55 + ph * 0.25, lf: [-170, -6], rf: [-140, -4], lh: [185, 0], rh: ph > 0 ? [160, -70] : [215, 0], elbow: [-1, -1], knee: [-1, -1], footDir: [-1, -1]}, fall);
  guy(ctx, 6800, GROUND, 1.2, p, {gx: 0.6, gy: ph > 0 ? 0.8 : 0.2, mouth: 'shout', brows: 'worried', eyes: 'squint', sweat: 1}, {after: (c, j) => { if (ph > 0.3) handPhone(c, j.rh[0] + 4, j.rh[1] - 20, 0.6); }});
}, {cam: lt => ({z: lerp(1.15, 1.3, lt / 1.4), fx: 6830, fy: 1380}), shake: lt => lt > 0.25 && lt < 0.4 ? 12 : 0, hand: 3, hud: true});
shot(34.6, 37.3, (ctx, lt, t) => {
  if (lt < 0.05) ev(34.62, 'glitch', 1);
  paperBg(ctx, '#E8E5DF', false); phoneCloseup(ctx, t, 'glitch', {count: remaining(t)});
}, {cam: lt => ({z: lerp(1.0, 1.12, ease(lt / 2.7)), fx: 640, fy: 1040}), hand: 6, vignette: 0.45});

// 5A..5D — the shelter
const RUN5 = t => kf([[37.3, 4150], [39.3, 4760]], t);
shot(37.3, 40.0, (ctx, lt, t) => {
  street(ctx, 3600, 5600, t); shelterOutside(ctx, 4520, true);
  const x = RUN5(t);
  if (t < 39.4) guy(ctx, x, GROUND, 1.2, run(twos(lt) * 3, {lean: 0.32, flail: 0.3}), {gx: 0.7, mouth: 'shout', brows: 'worried', eyes: 'wide', sweat: 1}, {alpha: t > 39.2 ? 0.4 : 1});
  footsteps(37.3, 39.3, 3, t, 0.6);
}, {cam: lt => ({z: 1.1, fx: lerp(4350, 4800, ease(lt / 2.7)), fy: 1230}), hand: 4, hud: true, vignette: 0.2});
shot(40.0, 43.1, (ctx, lt, t) => {
  const door = 1 - ease((t - 40.5) / 0.6), bolt = ease((t - 41.95) / 0.25);
  if (t > 41.08 && t < 41.13) ev(41.1, 'slam', 1); if (t > 42.15 && t < 42.2) ev(42.18, 'bolt', 1);
  shelterInside(ctx, t, door, bolt);
  const T2 = twos(lt);
  const x = kf([[0, 300], [0.5, 470], [1.1, 520], [3.1, 520]], lt);
  const reach = ease((t - 41.8) / 0.25);
  const p = lt < 0.5 ? run(T2 * 3, {lean: 0.25, flail: 0.2}) : mix({...STAND, lean: -0.1, lh: [-60, -130], rh: [-70, -150], elbow: [1, 1]}, {...STAND, lean: -0.12, lh: [-90, -180], rh: [-110 + bolt * 60, -265], elbow: [1, 1], headLean: -0.2}, reach);
  guy(ctx, x, GROUND, 1.2, p, {gx: -0.8, mouth: 'wavy', brows: 'worried', eyes: 'wide', sweat: 1}, {flip: lt >= 0.5});
}, {cam: lt => ({z: lerp(1.3, 1.4, lt / 3.1), fx: 540, fy: 1230}), hand: 3, hud: true, vignette: 0.55});
shot(43.1, 45.6, (ctx, lt, t) => {
  shelterInside(ctx, t, 0, 1); const sit = ease(lt / 0.8), T2 = twos(lt), shiver = Math.sin(T2 * 40) * 3;
  if (lt < 0.05) ev(43.15, 'slide', 0.7);
  const p = mix({...STAND, lean: -0.05, lh: [-60, -120], rh: [70, -120]}, {hip: [0, -40], lean: 0.05, headLean: 0.35, lf: [110, 0], rf: [140, 0], knee: [-1, -1], lh: [140 + shiver, -170], rh: [175 + shiver, -165], elbow: [1, 1], footDir: [1, 1]}, sit);
  guy(ctx, 820, GROUND, 1.25, p, {gx: 0.3, gy: 0.8, mouth: 'wavy', brows: 'worried', sweat: 1}, {after: (c, j) => { if (sit > 0.6) handPhone(c, (j.lh[0] + j.rh[0]) / 2 + 10, j.lh[1] - 26, -0.2, 0.95); }});
}, {cam: lt => ({z: lerp(1.35, 1.75, ease(lt / 2.5)), fx: lerp(800, 900, lt / 2.5), fy: lerp(1200, 1300, lt / 2.5)}), hand: 2, hud: true, vignette: 0.6});
shot(45.6, 46.6, (ctx, lt, t) => { paperBg(ctx, '#3A3C40', false); phoneCloseup(ctx, t, 'notif', {slide: 1, count: remaining(t), first: TM.n0}); },
  {cam: () => ({z: 1.25, fx: 640, fy: 1240}), hand: 5, vignette: 0.6});
shot(46.6, 47.4, (ctx, lt, t) => { // trembling hands
  paperBg(ctx, '#3A3C40', false); const j = Math.sin(t * 61) * 6;
  ctx.save(); ctx.translate(640 + j, 1100); ctx.rotate(-0.2 + Math.sin(t * 37) * 0.02);
  D.rect(ctx, -170, -320, 340, 640, {fill: '#1E2433', w: 9}); D.rect(ctx, -140, -290, 280, 580, {fill: '#26324A', w: 0}); ui(ctx, mmss(remaining(t)), 0, 0, 120, RED, 900);
  D.ellipse(ctx, -200, 120, 80, 120, {fill: PAPER, w: 8}); D.ellipse(ctx, 200, 140, 80, 120, {fill: PAPER, w: 8});
  D.line(ctx, [[-230, 230], [-420, 900]], {w: 10}); D.line(ctx, [[230, 250], [420, 900]], {w: 10}); ctx.restore();
}, {cam: () => ({z: 1.0, fx: 640, fy: 1100}), vignette: 0.7});
shot(47.4, 48.2, (ctx, lt, t) => faceCloseup(ctx, {gx: 0, gy: 0, mouth: 'strain', brows: 'angry', eyes: 'squint', sweat: 1}, {bg: 'shelter', shake: 3, t, s: 6}),
  {cam: () => ({z: 1.0, fx: 640, fy: 980}), vignette: 0.75});
shot(48.2, 50.85, (ctx, lt, t) => {
  if (t > Z && t < Z + 0.05) ev(Z, 'zero', 1);
  paperBg(ctx, '#2E3034', false); phoneCloseup(ctx, t, t >= Z ? 'zero' : 'notif', {slide: 1, count: remaining(t), first: TM.n0});
}, {cam: lt => ({z: lerp(1.15, 1.3, ease(lt / 1.0)), fx: 640, fy: 1170}), hand: 2, vignette: 0.7});

// 6B..6G — the twist
shot(50.85, 52.75, (ctx, lt, t) => {
  shelterInside(ctx, t, 0, 1); const T2 = twos(lt);
  const face = step([[0, {gx: 0, gy: 0.6, mouth: 'strain', brows: 'angry', eyes: 'squint'}], [0.45, {gx: 0.5, gy: 0.1, mouth: 'flat', brows: 'up', eyes: 'oneOpen'}],
    [0.95, {gx: -0.6, gy: 0, mouth: 'flat', brows: 'up', eyes: 'oneOpen'}], [1.4, {gx: 0.3, gy: 0, mouth: 'O', brows: 'up', eyes: 'wide'}]], T2);
  guy(ctx, 820, GROUND, 1.25, {hip: [0, -40], lean: 0.05, headLean: lerp(0.35, 0.05, ease((lt - 0.4) / 0.5)), lf: [110, 0], rf: [140, 0], knee: [-1, -1], lh: [140, -170], rh: [175, -165], elbow: [1, 1], footDir: [1, 1]}, face,
    {after: (c, j) => handPhone(c, (j.lh[0] + j.rh[0]) / 2 + 10, j.lh[1] - 26, -0.2, 0.95)});
}, {cam: () => ({z: 1.95, fx: 920, fy: 1290}), hand: 2, vignette: 0.55});
shot(52.75, 54.75, (ctx, lt, t) => {
  shelterInside(ctx, t, 0, 1); const T2 = twos(lt), bob = Math.abs(Math.sin(T2 * 12)) * 12;
  if (Math.floor(T2 * 12 / Math.PI) !== Math.floor((T2 - 1 / 12) * 12 / Math.PI)) ev(t, 'chuckle', 0.5);
  guy(ctx, 820, GROUND, 1.25, {hip: [0, -40 - bob * 0.3], lean: -0.12, headLean: -0.35 + bob * 0.01, lf: [110, 0], rf: [150, 0], knee: [-1, -1], lh: [120, -190 + bob], rh: [-20, -250], elbow: [1, -1], footDir: [1, 1]},
    {gx: 0.2, gy: -0.4, mouth: 'grin', brows: 'up', eyes: 'happy', lines: 1}, {after: (c, j) => handPhone(c, j.lh[0] + 10, j.lh[1] - 26, -0.2, 0.95)});
}, {cam: lt => ({z: lerp(1.8, 1.9, lt / 2), fx: 900, fy: 1270}), hand: 3, vignette: 0.45});
shot(54.75, 56.25, (ctx, lt, t) => {
  shelterInside(ctx, t, 0, 1); const T2 = twos(lt), buzzOn = t > 55.55, look = ease((t - 55.75) / 0.25);
  if (t > 55.55 && t < 55.6) ev(55.57, 'buzz', 1);
  const bob = buzzOn ? 0 : Math.abs(Math.sin(T2 * 12)) * 10;
  guy(ctx, 820, GROUND, 1.25, {hip: [0, -40 - bob * 0.3], lean: lerp(-0.12, 0.05, look), headLean: lerp(-0.3, 0.4, look), lf: [110, 0], rf: [150, 0], knee: [-1, -1], lh: [140, lerp(-190, -170, look)], rh: [lerp(-20, 175, look), lerp(-250, -165, look)], elbow: [1, 1], footDir: [1, 1]},
    look > 0.5 ? {gx: 0.3, gy: 0.8, mouth: 'flat', brows: 'flat'} : {gx: 0.2, gy: -0.4, mouth: 'grin', brows: 'up', eyes: 'happy'},
    {after: (c, j) => handPhone(c, j.lh[0] + 10 + (buzzOn ? Math.sin(t * 200) * 5 : 0), j.lh[1] - 26, -0.2, 0.95)});
}, {cam: lt => ({z: lerp(1.9, 2.4, ease((lt - 0.8) / 0.7)), fx: lerp(900, 980, ease((lt - 0.8) / 0.7)), fy: lerp(1270, 1200, ease((lt - 0.8) / 0.7))}), hand: 2, vignette: 0.5});
shot(56.25, 58.65, (ctx, lt, t) => {
  if (t > TU && t < TU + 0.05) { ev(TU, 'ping', 1); ev(TU, 'sting', 0.8); }
  paperBg(ctx, '#2E3034', false);
  phoneCloseup(ctx, t, 'update', {slide: ease((t - TU) / 0.25), count: Math.min(60, remaining2(t)), buzz: t < TU + 0.3});
}, {cam: lt => ({z: lerp(1.0, 1.1, ease(lt / 2.4)), fx: 640, fy: 1020}), hand: 2, vignette: 0.6});
shot(58.65, 59.45, (ctx, lt, t) => {
  const f = step([[0, {gx: 0, gy: 0.3, mouth: 'smile', brows: 'flat'}], [0.25, {gx: 0, gy: 0.1, mouth: 'flat', brows: 'flat', eyes: 'wide'}], [0.5, {gx: 0, gy: 0, mouth: 'O', brows: 'worried', eyes: 'wide'}]], twos(lt));
  faceCloseup(ctx, f, {bg: 'shelter', t, s: 5.6});
}, {cam: lt => ({z: lerp(1.0, 1.1, lt / 0.8), fx: 640, fy: 990}), vignette: 0.7, hud2: true});
shot(59.45, 60.01, ctx => { ctx.fillStyle = '#000'; ctx.fillRect(-4000, -4000, 12000, 12000); }, {black: true});

// ---------------- overlays ----------------
function hud(ctx, n, t, label = true) {
  const x = 64, y = 250, urgent = n <= 10, pulse = urgent ? 0.5 + 0.5 * Math.sin(t * 12) : 0;
  roundRect(ctx, x, y, 300, 104, 52, urgent ? `rgba(${Math.round(150 + 80 * pulse)},20,20,.92)` : 'rgba(18,18,18,.86)');
  D.ellipse(ctx, x + 56, y + 48, 26, 24, {fill: PAPER, w: 3, color: PAPER}); D.dot(ctx, x + 47, y + 46, 6, 7, INK); D.dot(ctx, x + 65, y + 46, 6, 7, INK); D.rect(ctx, x + 44, y + 64, 24, 12, {fill: PAPER, w: 0});
  ui(ctx, mmss(n), x + 186, y + 54, 62, '#FFFFFF', 900);
}
function captionAt(t) { return TM.phrases.find(p => t >= p.start - 0.05 && t < p.end + 0.25); }
function caption(ctx, t, dark) {
  const c = captionAt(t); if (!c) return;
  ctx.font = '700 58px UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = c.text.split(' '), lines = [''];
  for (const w of words) { const s = (lines.at(-1) + ' ' + w).trim(); if (ctx.measureText(s).width > 940 && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = s; }
  lines.forEach((s, i) => { const y = 1650 + i * 70 - (lines.length - 1) * 35; ctx.lineWidth = 14; ctx.strokeStyle = dark ? '#000' : '#FFFFFF'; ctx.strokeText(s, 600, y); ctx.fillStyle = dark ? '#FFFFFF' : '#151515'; ctx.fillText(s, 600, y); });
  ctx.textAlign = 'left';
}

// ---------------- frame loop ----------------
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
function drawFrame(t) {
  const si = shots.findIndex(s => t >= s.a && t < s.b), s = shots[si === -1 ? shots.length - 1 : si], lt = t - s.a;
  D.reseed(1000 + si * 97 + Math.floor(t * 12));         // line boil on twos
  ctx.resetTransform(); ctx.scale(K, K); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save();
  const c = s.cam ? s.cam(lt) : {z: 1, fx: DW / 2, fy: DH / 2}, hh = s.hand || 0, sh = s.shake ? s.shake(lt) : 0;
  const hx = noise(t, 0.35, si) * hh * 2 + (sh ? Math.sin(t * 90) * sh : 0), hy = noise(t, 0.28, si + 3) * hh * 2 + (sh ? Math.cos(t * 77) * sh : 0);
  ctx.translate(DW / 2 + hx, DH / 2 + hy); ctx.scale(c.z, c.z); ctx.translate(-c.fx, -c.fy);
  s.draw(ctx, lt, t);
  ctx.restore();
  if (s.vignette) { const g = ctx.createRadialGradient(DW / 2, DH * 0.48, DH * 0.25, DW / 2, DH * 0.5, DH * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${s.vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, DW, DH); }
  if (s.hud && t < Z) hud(ctx, remaining(t), t);
  if (s.hud2) hud(ctx, remaining2(t), t);
  if (!s.black) caption(ctx, t, (s.vignette || 0) >= 0.45);
}
// sound beds and the countdown ticks are derived from the same clock the pictures use
function bedEvents() {
  for (let n = 36; n >= 1; n--) { const tt = Z - n; if (tt > 13.7) ev(tt, 'tick', n <= 5 ? 1 : lerp(0.35, 0.8, (36 - n) / 31)); }
  for (let n = 59; n >= 56; n--) ev(TU + 60 - n, 'tick', 0.6);
  events.push({kind: 'bed', name: 'room', a: 0, b: 15.4, gain: 1}, {kind: 'bed', name: 'street', a: 15.4, b: 40.0, gain: 1},
    {kind: 'bed', name: 'hum', a: 40.0, b: 47.6, gain: 1}, {kind: 'bed', name: 'drone', a: 25.2, b: 47.6, gain: 1},
    {kind: 'bed', name: 'breath', a: 33.3, b: 35.2, gain: 1, rate: 2.6}, {kind: 'bed', name: 'breath', a: 43.2, b: 49.1, gain: 1, rate: 1.25},
    {kind: 'bed', name: 'heart', a: 44.6, b: 49.15, gain: 1}, {kind: 'bed', name: 'hum', a: 50.9, b: 56.2, gain: 0.6});
}

const stills = process.argv.includes('--stills') ? process.argv[process.argv.indexOf('--stills') + 1].split(',').map(Number) : null;
if (stills) {
  fs.mkdirSync(path.join(BUILD, 'stills'), {recursive: true});
  for (const t of stills) { drawFrame(t); fs.writeFileSync(path.join(BUILD, 'stills', `t${t.toFixed(2)}.png`), canvas.toBuffer('image/png')); }
  console.log('stills', stills.length);
} else {
  const out = path.join(BUILD, 'video.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const total = DUR * FPS;
  for (let f = 0; f < total; f++) {
    drawFrame(f / FPS);
    const raw = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 240 === 0) console.log('frame', f, '/', total);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  bedEvents();
  fs.writeFileSync(path.join(BUILD, 'events.json'), JSON.stringify(events.sort((a, b) => (a.t ?? a.a) - (b.t ?? b.a)), null, 1));
  const stamp = s => { const ms = Math.round(s * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  fs.writeFileSync(path.join(BUILD, 'captions.srt'), TM.phrases.map((p, i) => `${i + 1}\n${stamp(p.start)} --> ${stamp(p.end + 0.25)}\n${p.text}\n`).join('\n'));
  console.log('video', out, 'events', events.length);
}
