// What If kit — shared renderer for the "What If" channel (silent minimalist stickman Shorts/Reels).
// A video is one scene file that imports this kit, registers shots, and calls run(). See README.md.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createCanvas, loadImage, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import * as D from './draw.mjs';
export {D, createCanvas, loadImage};

const KIT = path.dirname(new URL(import.meta.url).pathname);
// Typography (from hussnakhtr.com): Inter 600 tight for headlines, Instrument Serif italic for the accent phrase,
// JetBrains Mono for labels. 'InterTight' is kept as an alias so every existing txt(..., 'InterTight') call picks up Inter 600.
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/Inter-SemiBold.ttf'), 'InterTight');
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/Inter-SemiBold.ttf'), 'Inter6');
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/Inter-Regular.ttf'), 'Inter4');
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/InstrumentSerif-Italic.ttf'), 'WIAccentSerif');
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/JetBrainsMono-SemiBold.ttf'), 'WIMono');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', 'Chalk'); // D.text default (handwritten notes)

// ---------------- look ----------------
export const WHITE = '#FFFFFF', INK = '#111111', GREY = '#8A8A8A', LIGHT = '#E6E6E6', SOFT = '#F4F4F4';
export const ACCENTS = {red: '#E5322D', blue: '#1F6FEB', green: '#2E9E5B', yellow: '#F2B705', pink: '#E8508A', orange: '#F07C22'};
D.setStyle({ink: INK, amp: 0.45, hair: false});
export const BASE_LW = 0.72;
export const FPS = 24, W = 1080, H = 1920, DW = 1280, DH = 2276, K = W / DW, GROUND = 1560;

// ---------------- math / timing ----------------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;
export function mix(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {...a}; for (const k in b) o[k] = k in a ? mix(a[k], b[k], t) : b[k]; return o; }
  return t < 0.5 ? a : b;
}
/** keyframes [[t, value], ...]: smoothstep between numbers/arrays/objects; strings switch halfway */
export function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return keys.at(-1)[1];
}
/** hold-keys: value of the last key whose time has passed */
export const step = (keys, t) => { let v = keys[0][1]; for (const [k, x] of keys) if (t >= k) v = x; return v; };
export const twos = t => Math.floor(t * 12) / 12;   // hand-animated timing for poses
export const noise = (t, f, s = 0) => Math.sin(t * f * 6.283 + s) * 0.6 + Math.sin(t * f * 2.71 * 6.283 + s * 1.7) * 0.4;
export const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---------------- sound events (mixed later by sfx.py) ----------------
const events = [], seen = new Set();
/** one-shot sound at time t (dedup'd per kind+time) — kinds listed in sfx.py */
export const ev = (t, kind, gain = 1) => { const k = kind + '@' + t.toFixed(2); if (!seen.has(k)) { seen.add(k); events.push({t: +t.toFixed(3), kind, gain}); } };
/** fire once when time t crosses `at` (use inside a draw fn) */
export const at = (t, when, kind, gain = 1) => { if (t >= when && t < when + 1 / FPS + 1e-6) ev(when, kind, gain); };
/** continuous beds/music: name in sfx.py (room, street, wind, crowd, hum, rain) or music: {kind:'music', mood} */
export const bed = (name, a, b, gain = 1) => events.push({kind: 'bed', name, a, b, gain});
export const music = (mood, a, b, gain = 1) => events.push({kind: 'music', mood, a, b, gain});

// ---------------- characters ----------------
export const STAND = {hip: [0, -223], lean: 0, lf: [-50, 0], rf: [55, 0], lh: [-70, -105], rh: [75, -105], elbow: [1, -1], knee: [-1, -1]};
export const SEATED = {hip: [0, -192], lean: -0.05, lf: [95, 0], rf: [120, 0], knee: [-1, -1], lh: [80, -200], rh: [100, -200], elbow: [1, 1], footDir: [1, 1]};
export function walk(phase, o = {}) {
  const a = phase * 6.283, b = a + Math.PI, bob = Math.abs(Math.sin(a)) * 6;
  const foot = x => [55 * Math.cos(x), -Math.max(0, -30 * Math.sin(x))]; // lifted while it swings forward (cos rising)
  return {hip: [0, -218 - bob], lean: o.lean ?? 0.04, headLean: o.headLean ?? 0, lf: foot(a), rf: foot(b),
    lh: o.lh ?? [-10 - 35 * Math.cos(b), -110], rh: o.rh ?? [-10 - 35 * Math.cos(a), -110], elbow: [1, 1], knee: [-1, -1]};
}
export function runCycle(phase, {arms = 1, lean = 0.28, flail = 0} = {}) {
  const a = phase * 6.283, b = a + Math.PI, bob = Math.abs(Math.sin(a)) * 14;
  const foot = x => [95 * Math.cos(x), -Math.max(0, -75 * Math.sin(x))];
  const hand = (x, s) => [30 - 75 * Math.cos(x) * arms + flail * 40 * Math.sin(x * 2 + s), -150 - 40 * Math.sin(x) * arms - flail * 70 * (0.5 + 0.5 * Math.sin(x * 3 + s))];
  return {hip: [0, -205 - bob], lean, headLean: -0.05, lf: foot(a), rf: foot(b), lh: hand(b, 1), rh: hand(a, 2), elbow: [1, 1], knee: [-1, -1]};
}
/**
 * Draw a stickman. (x, y) = point on the ground under the hip, s = scale (1.25 is a normal full-body shot).
 * p = pose params (see STAND / SEATED / walk / run; joints are local, +x = the way he faces, y up is negative).
 * face = {gx, gy (gaze -1..1), mouth: smile|grin|frown|O|shout|strain|wavy|flat, eyes: wide|squint|closed|happy|oneOpen, sweat, lines}
 * opts: flip (face left), alpha, color (ink colour, e.g. a shadow), fill (head/hand fill), accent: {kind:'scarf'|'cap', color}, after(ctx, joints)
 */
export function guy(ctx, x, y, s, p, face = {}, {flip = false, alpha = 1, color, fill, accent, after} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.globalAlpha *= alpha;
  D.setLW(BASE_LW * (s > 1.3 ? 1.3 / s : 1)); if (color) D.setStyle({ink: color});
  const j = D.pose(p);
  if (fill) { D.setFill?.(fill); }
  D.figure(ctx, j, {brows: 'none', ...face});
  if (accent?.kind === 'scarf') { const n = j.neck, c = accent.color; D.poly(ctx, [[n[0] - 30, n[1] - 4], [n[0] + 30, n[1] - 8], [n[0] + 28, n[1] + 14], [n[0] - 28, n[1] + 18]], {fill: c, w: 4}); D.poly(ctx, [[n[0] + 8, n[1] + 10], [n[0] + 30, n[1] + 10], [n[0] + 34, n[1] + 90], [n[0] + 14, n[1] + 92]], {fill: c, w: 4}); }
  if (accent?.kind === 'cap') { const h = j.head; ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate(j.tilt || 0); D.poly(ctx, [[-56, -22], [-40, -52], [0, -64], [40, -52], [56, -22]], {fill: accent.color, w: 4}); D.poly(ctx, [[30, -26], [100, -24], [96, -12], [28, -14]], {fill: accent.color, w: 4}); ctx.restore(); }
  if (after) after(ctx, j);
  if (color) D.setStyle({ink: INK}); D.setLW(1); ctx.restore(); return j;
}
/** a filled silhouette version of a pose (shadows, ghosts). Draws in a single colour with thicker limbs. */
export function silhouette(ctx, x, y, s, p, color = 'rgba(17,17,17,0.82)', {flip = false, skewX = 0, squashY = 1} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, skewX, 1, 0, 0); ctx.scale(flip ? -s : s, s * squashY);
  const j = D.pose(p); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 15;
  const seg = (...pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.stroke(); };
  seg(j.neck, j.hip); seg(j.sh, j.le, j.lh); seg(j.sh, j.re, j.rh); seg(j.hip, j.lk, j.lf); seg(j.hip, j.rk, j.rf);
  ctx.beginPath(); ctx.ellipse(j.head[0], j.head[1], D.R + 4, D.R + 6, 0, 0, 6.283); ctx.fill();
  ctx.restore(); return j;
}

// ---------------- drawing helpers ----------------
export function rr(ctx, x, y, w, h, r, fill, stroke, lw = 4) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
/** font roles → canvas font string + tracking. 'InterTight' = headline (Inter 600, −0.03em) · 'Inter6' = UI 600 · 'Inter4' = body 400
 *  'Serif' = Instrument Serif italic (accent phrase) · 'Mono' = JetBrains Mono 600 (labels, +0.08em) */
const FONT = {InterTight: [600, 'normal', -0.03], Inter6: [600, 'normal', -0.01], Inter4: [400, 'normal', 0], Serif: [400, 'italic', -0.01], Mono: [600, 'normal', 0.08]};
const FAMILY = {Serif: 'WIAccentSerif', Mono: 'WIMono'};
export function setFont(ctx, font, size) { const [w, st, tr] = FONT[font] || FONT.Inter6; ctx.font = `${st} ${w} ${size}px ${FAMILY[font] || font}`; ctx.letterSpacing = `${(tr * size).toFixed(2)}px`; }
export function txt(ctx, s, x, y, size, color = INK, font = 'InterTight', align = 'center', base = 'middle') { setFont(ctx, font, size); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); ctx.textAlign = 'left'; ctx.letterSpacing = '0px'; }
export function textWidth(ctx, s, size, font = 'InterTight') { setFont(ctx, font, size); const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; return w; }
/** "WHAT IF YOUR SHADOW" → "What if your shadow"; keeps I / I'M / numbers; first line of a block gets the capital */
export function sentenceCase(lines) {
  return lines.map((s, i) => { let t = String(s).toLowerCase().replace(/\bi\b/g, 'I').replace(/\bi'(m|ve|ll|d)\b/g, (m, x) => `I'${x}`);
    return i === 0 ? t.replace(/^(\W*)(\w)/, (m, p, c) => p + c.toUpperCase()) : t; });
}
export function bg(ctx, c = WHITE) { ctx.fillStyle = c; ctx.fillRect(-6000, -6000, 16000, 16000); }
export function floor(ctx, x0 = -400, x1 = 1700, y = GROUND) { D.line(ctx, [[x0, y], [x1, y + 1]], {w: 5}); }
export function table(ctx, x, {w = 420, top = 1250, drawer = null} = {}) {
  D.line(ctx, [[x, top], [x + w, top]], {w: 7}); D.line(ctx, [[x + 30, top], [x + 30, GROUND]], {w: 6}); D.line(ctx, [[x + w - 30, top], [x + w - 30, GROUND]], {w: 6});
  if (drawer !== null) { const dx = drawer * 110; D.rect(ctx, x + 70 - dx, top + 8, 200, 76, {fill: WHITE, w: 5}); D.line(ctx, [[x + 150 - dx, top + 46], [x + 190 - dx, top + 46]], {w: 6}); }
}
export function chair(ctx, x, {flip = false} = {}) { const s = flip ? -1 : 1; D.line(ctx, [[x - 70, 1368], [x + 70, 1368]], {w: 6}); D.line(ctx, [[x - 60, 1368], [x - 60, GROUND]], {w: 5}); D.line(ctx, [[x + 60, 1368], [x + 60, GROUND]], {w: 5}); D.line(ctx, [[x - 70 * s, 1368], [x - 80 * s, 1060]], {w: 6}); }
export function door(ctx, x, open = 0, {y0 = 880, w = 260} = {}) {
  D.rect(ctx, x, y0, w, GROUND - y0, {w: 6});
  if (open > 0.02) { ctx.fillStyle = SOFT; ctx.fillRect(x + 3, y0 + 3, w - 6, GROUND - y0 - 6); }
  const dw = w * (1 - open * 0.82); D.rect(ctx, x, y0, dw, GROUND - y0, {fill: WHITE, w: 6}); D.dot(ctx, x + dw - 34, (y0 + GROUND) / 2, 9, 9);
}
export function windowFrame(ctx, x, y, w, h, fill = WHITE) { D.rect(ctx, x, y, w, h, {fill, w: 6}); D.line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], {w: 4}); D.line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], {w: 4}); }
export function cup(ctx, x, y, t = 0, steam = true) { D.poly(ctx, [[x - 26, y - 56], [x + 26, y - 56], [x + 20, y], [x - 20, y]], {fill: WHITE, w: 4.5}); D.ellipse(ctx, x + 32, y - 32, 12, 16, {w: 4}); if (steam) for (let k = 0; k < 2; k++) { const o = Math.sin(t * 3 + k) * 6; D.line(ctx, [[x - 8 + k * 16, y - 66], [x - 4 + k * 16 + o, y - 96], [x - 10 + k * 16 - o, y - 126]], {w: 3, color: GREY}); } }
export function phoneSmall(ctx, x, y, a = 0, s = 1, lit = false, accent = '#BFD8FF') { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); rr(ctx, -24, -44, 48, 88, 10, INK); rr(ctx, -19, -38, 38, 76, 7, lit ? accent : '#2A2A2A'); ctx.restore(); }
export function lampPost(ctx, x, {lit = true} = {}) { D.line(ctx, [[x, GROUND], [x, GROUND - 760]], {w: 7}); D.line(ctx, [[x, GROUND - 760], [x + 90, GROUND - 760]], {w: 6}); D.ellipse(ctx, x + 100, GROUND - 745, 26, 14, {fill: lit ? '#FFF3C4' : WHITE, w: 4}); }
/** speech bubble (diegetic text). tail points at (tx, ty). lines = ['...'] */
export function bubble(ctx, x, y, lines, {size = 46, tx, ty, think = false, color = INK, fill = WHITE, maxW} = {}) {
  ctx.font = `600 ${size}px Inter6`; const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + 70, h = lines.length * size * 1.25 + 46;
  if (tx !== undefined) { if (think) { D.ellipse(ctx, lerp(x, tx, 0.55), lerp(y + h / 2, ty, 0.55), 14, 12, {fill, w: 4}); D.ellipse(ctx, lerp(x, tx, 0.82), lerp(y + h / 2, ty, 0.82), 9, 8, {fill, w: 4}); }
    else D.poly(ctx, [[x - 24, y + h / 2 - 6], [tx, ty], [x + 24, y + h / 2 - 6]], {fill, w: 4}); }
  rr(ctx, x - w / 2, y - h / 2, w, h, think ? h / 2 : 30, fill, color, 4.5);
  lines.forEach((s, i) => txt(ctx, s, x, y - (lines.length - 1) * size * 0.625 + i * size * 1.25, size, color, 'Inter6'));
  return {w, h};
}
/** premise / title card: lines = [['WHAT IF YOUR SHADOW', INK], ['STOPPED COPYING YOU?', accent]]
 *  House style (hussnakhtr.com): sentence case; ink lines in Inter 600 tight; any accent-coloured line in Instrument Serif
 *  italic at 1.07× — "What if your shadow / *stopped copying you?*". Lines too wide for the safe width shrink to fit. */
export function card(ctx, lines, {y = 1138, size = 118, gap = 1.12, lt = 1, pop = 0.15, maxW = 1060} = {}) {
  const s = lerp(0.94, 1, ease(lt / pop)), cased = sentenceCase(lines.map(l => l[0]));
  const roles = lines.map(([, c]) => (c && c !== INK ? 'Serif' : 'InterTight'));
  const widest = Math.max(...cased.map((str, i) => textWidth(ctx, str, size * (roles[i] === 'Serif' ? 1.12 : 1), roles[i]))), k = Math.min(1.3, maxW / widest);  // grow to fill the safe width (max 1.3×), shrink if too wide
  ctx.save(); ctx.translate(640, y); ctx.scale(s, s);
  cased.forEach((str, i) => txt(ctx, str, 0, (i - (lines.length - 1) / 2) * size * gap * k, size * k * (roles[i] === 'Serif' ? 1.12 : 1), lines[i][1] || INK, roles[i]));
  ctx.restore();
}
/** a corner label (DAY 7, 08:00, AGE 41 …) with optional progress bar 0..1 */
export function label(ctx, s, {x = 96, y = 300, size = 96, color = INK, bar, accent = ACCENTS.blue, lt = 1} = {}) {
  const pop = ease(lt / 0.16); ctx.save(); ctx.globalAlpha *= pop; ctx.translate(x, y); ctx.scale(lerp(0.9, 1, pop), lerp(0.9, 1, pop));
  const ms = size * 0.62; txt(ctx, String(s).toUpperCase(), 0, 0, ms, color, 'Mono', 'left');   // labels: JetBrains Mono, tracked caps
  if (bar !== undefined) { rr(ctx, 4, ms * 0.9, 420, 10, 5, LIGHT); rr(ctx, 4, ms * 0.9, Math.max(10, 420 * bar), 10, 5, accent); }
  ctx.restore();
}
/** big phone close-up. drawScreen(ctx, SX, SY, SW, SH) paints the white screen. */
export const PHONE = {PX: 300, PY: 330, PW: 680, PH: 1320};
export function phoneCloseup(ctx, drawScreen, {thumb, buzz = 0, t = 0} = {}) {
  const {PX, PY, PW, PH} = PHONE, bx = buzz ? Math.sin(t * 210) * 7 * buzz : 0;
  ctx.save(); ctx.translate(bx, 0);
  D.line(ctx, [[1320, 2500], [1050, 1760]], {w: 7});
  rr(ctx, PX - 8, PY - 8, PW + 16, PH + 16, 90, INK); rr(ctx, PX, PY, PW, PH, 84, INK);
  const SX = PX + 24, SY = PY + 24, SW = PW - 48, SH = PH - 48;
  ctx.save(); ctx.beginPath(); ctx.roundRect(SX, SY, SW, SH, 64); ctx.clip(); ctx.fillStyle = WHITE; ctx.fillRect(SX, SY, SW, SH);
  drawScreen(ctx, SX, SY, SW, SH); rr(ctx, SX + SW / 2 - 70, SY + 18, 140, 36, 18, INK); ctx.restore();
  D.ellipse(ctx, PX + PW + 8, 1480, 74, 112, {fill: WHITE, w: 5});
  const th = thumb || [PX + PW - 70, 1300]; D.ellipse(ctx, th[0], th[1], 36, 60, {fill: WHITE, w: 5, rot: -0.5});
  for (const fy of [1000, 1110, 1220]) D.ellipse(ctx, PX - 6, fy, 34, 24, {fill: WHITE, w: 5});
  ctx.restore();
}
/** message bubble inside a phone screen */
export function textMsg(ctx, SX, SY, SW, y, lines, {from = 'left', color = SOFT, ink = INK, size = 40, header} = {}) {
  ctx.font = `600 ${size}px Inter6`; const w = Math.min(SW - 120, Math.max(...lines.map(s => ctx.measureText(s).width)) + 70), h = lines.length * size * 1.3 + 40;
  const x = from === 'left' ? SX + 40 : SX + SW - 40 - w;
  if (header) txt(ctx, header, x + 6, y - 30, 26, GREY, 'Inter4', 'left');
  rr(ctx, x, y, w, h, 34, color); lines.forEach((s, i) => txt(ctx, s, x + 35, y + 20 + size * 0.65 + i * size * 1.3, size, ink, 'Inter6', 'left'));
  return h;
}

// ---------------- render loop ----------------
const shots = [];
/** register a shot: draw(ctx, lt, t) in world coords. opts: cam(lt)->{z,fx,fy}, hand (px of handheld drift), shake(lt)->px,
 *  overlay(ctx, lt, t) drawn in screen space after the camera, pixel(ctx, lt, t) drawn in output-pixel space (no camera), seed */
export const shot = (a, b, draw, opts = {}) => shots.push({a, b, draw, ...opts});
export function drawFrame(ctx, t) {
  const si = shots.findIndex(s => t >= s.a && t < s.b), s = shots[si === -1 ? shots.length - 1 : si], lt = t - s.a;
  D.reseed(s.seed ?? 500 + si * 31);
  ctx.resetTransform(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 1;
  if (s.pixel) { ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H); s.pixel(ctx, lt, t); return; }
  ctx.scale(K, K); ctx.save();
  const c = s.cam ? s.cam(lt) : {z: 1, fx: DW / 2, fy: DH / 2}, hh = s.hand ?? 0.8, sh = s.shake ? s.shake(lt) : 0;
  const hx = noise(t, 0.3, si) * hh * 2 + (sh ? Math.sin(t * 80) * sh : 0), hy = noise(t, 0.24, si + 3) * hh * 2 + (sh ? Math.cos(t * 71) * sh : 0);
  ctx.translate(DW / 2 + hx, DH / 2 + hy); ctx.scale(c.z, c.z); ctx.translate(-c.fx, -c.fy);
  s.draw(ctx, lt, t); ctx.restore();
  if (s.overlay) s.overlay(ctx, lt, t);
  if (s.fade) { ctx.fillStyle = `rgba(255,255,255,${clamp(s.fade(lt))})`; ctx.fillRect(0, 0, DW, DH); }
  if (s.black) { ctx.fillStyle = `rgba(0,0,0,${clamp(s.black(lt))})`; ctx.fillRect(0, 0, DW, DH); }
}
/**
 * run({dir, duration}) — CLI:  node scene.mjs              -> build/video.mp4 + build/events.json
 *                             node scene.mjs --stills a,b   -> build/stills/tA.png …
 *                             node scene.mjs --sheet        -> build/sheet.png (1 frame per second contact sheet)
 */
export async function run({dir, duration}) {
  const BUILD = path.join(dir, 'build'); fs.mkdirSync(BUILD, {recursive: true});
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d'), argv = process.argv;
  if (argv.includes('--stills')) {
    fs.mkdirSync(path.join(BUILD, 'stills'), {recursive: true});
    for (const t of argv[argv.indexOf('--stills') + 1].split(',').map(Number)) { drawFrame(ctx, t); fs.writeFileSync(path.join(BUILD, 'stills', `t${t.toFixed(2)}.png`), canvas.toBuffer('image/png')); }
    return;
  }
  if (argv.includes('--sheet')) {
    const n = Math.ceil(duration), cols = 8, cw = 216, ch = 384, sh = createCanvas(cols * cw, Math.ceil(n / cols) * (ch + 28)), sx = sh.getContext('2d');
    sx.fillStyle = '#ddd'; sx.fillRect(0, 0, sh.width, sh.height); sx.font = '20px sans-serif';
    for (let i = 0; i < n; i++) { drawFrame(ctx, i + 0.5); const x = (i % cols) * cw, y = Math.floor(i / cols) * (ch + 28); sx.drawImage(canvas, x + 2, y + 26, cw - 4, ch - 4); sx.fillStyle = '#c00'; sx.fillText(`${(i + 0.5).toFixed(1)}s`, x + 6, y + 20); }
    fs.writeFileSync(path.join(BUILD, 'sheet.png'), sh.toBuffer('image/png')); return;
  }
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(BUILD, 'video.mp4')], {stdio: ['pipe', 'inherit', 'inherit']});
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    drawFrame(ctx, f / FPS); const raw = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  fs.writeFileSync(path.join(BUILD, 'events.json'), JSON.stringify({duration, events: events.sort((a, b) => (a.t ?? a.a) - (b.t ?? b.a))}, null, 1));
  console.log('frames', total, 'events', events.length);
}

// ---------------- pixel-dissolve helper (draw a pose into blocks, scatter upward) ----------------
export function makePixels(drawFn, B = 9) {
  const c = createCanvas(W, H), x = c.getContext('2d'); x.scale(K, K); x.lineCap = 'round'; x.lineJoin = 'round'; drawFn(x);
  const d = x.getImageData(0, 0, W, H).data, out = [];
  for (let py = 0; py < H; py += B) for (let px = 0; px < W; px += B) {
    let hit = false; for (let yy = py; yy < Math.min(H, py + B) && !hit; yy += 2) for (let xx = px; xx < Math.min(W, px + B); xx += 2) { const i = (yy * W + xx) * 4; if (d[i + 3] > 60 && d[i] < 120) { hit = true; break; } }
    if (hit) out.push({x: px, y: py, r: hash(px * 7 + py * 13)});
  }
  let a = H, b = 0; for (const p of out) { a = Math.min(a, p.y); b = Math.max(b, p.y); }
  for (const p of out) p.th = (p.y - a) / Math.max(1, b - a) * 0.75 + p.r * 0.25;
  return {blocks: out, B};
}
/** progress p 0..1.5; accent colour sprinkled on flying blocks */
export function drawPixels(ctx, pix, p, accent = ACCENTS.blue) {
  for (const b of pix.blocks) { const k = p - b.th; if (k > 0.55) continue; let x = b.x, y = b.y, a = 1;
    if (k > 0) { x += (b.r - 0.5) * 420 * k + Math.sin(b.r * 40) * 60 * k; y -= 520 * k * (0.5 + b.r); a = clamp(1 - k / 0.55); }
    ctx.globalAlpha = a; ctx.fillStyle = k > 0 && b.r > 0.82 ? accent : INK; ctx.fillRect(x, y, pix.B - (k > 0 ? 1 : 0), pix.B - (k > 0 ? 1 : 0)); }
  ctx.globalAlpha = 1;
}
