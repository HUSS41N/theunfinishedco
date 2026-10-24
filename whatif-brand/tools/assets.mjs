import fs from 'node:fs';
import {createCanvas, loadImage} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import {Path2D} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import {D, guy, STAND, INK, ACCENTS, GROUND, K} from '/Users/hussain/dev/stickman-videos/whatif-kit/kit.mjs';
import {markSVG, drawMark} from './mark.mjs';
import {GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
const OUT = process.argv[2] || 'out/';
fs.writeFileSync(OUT + 'whatif-mark.svg', markSVG());
fs.writeFileSync(OUT + 'whatif-mark-ink.svg', markSVG({hook: '#111111'}));
const font = (x, px) => { x.font = `600 ${px}px InterTight`; };
/** the wordmark: "the" and "co" in Inter 600 (−0.03em), "unfinished" in Instrument Serif italic (1.12×), like hussnakhtr.com
 *  headlines. Shrinks to fit maxW. */
const WORD = [['the', 'sans'], ['unfinished', 'serif'], ['co', 'sans']];
function wordmark(x, X, Y, px, align = 'left', color = INK, maxW = Infinity) {
  const set = (role, p) => { if (role === 'serif') { x.font = `italic 400 ${p * 1.12}px WIAccentSerif`; x.letterSpacing = `${-0.01 * p}px`; } else { x.font = `600 ${p}px InterTight`; x.letterSpacing = `${-0.03 * p}px`; } };
  const widths = p => WORD.map(([t, r]) => { set(r, p); return x.measureText(t).width + (r === 'serif' ? p * 0.04 : 0); });
  let w = widths(px); const total = w.reduce((a, b) => a + b, 0);
  if (total > maxW) { px *= maxW / total; w = widths(px); }
  const sum = w.reduce((a, b) => a + b, 0), x0 = align === 'center' ? X - sum / 2 : X;
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = color;
  let cx = x0; WORD.forEach(([t, r], i) => { set(r, px); x.fillText(t, cx + (r === 'serif' ? px * 0.02 : 0), Y); cx += w[i]; });
  x.letterSpacing = '0px';
}
function canvas(w, h, bg = '#FFFFFF') { const c = createCanvas(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.lineCap = 'round'; x.lineJoin = 'round'; return [c, x]; }
const save = (c, n) => fs.writeFileSync(OUT + n, c.toBuffer('image/png'));
// wordmark + lockup
{ const [c, x] = canvas(1400, 360, 'rgba(0,0,0,0)'); x.clearRect(0, 0, 1400, 360);
  drawMark(x, 10, 20, 320, {}, Path2D); wordmark(x, 345, 262, 230, 'left', INK, 1030); save(c, 'whatif-lockup.png'); }
{ const [c, x] = canvas(1100, 300, 'rgba(0,0,0,0)'); x.clearRect(0, 0, 1100, 300); wordmark(x, 20, 210, 230, 'left', INK, 1060); save(c, 'whatif-wordmark.png'); }
// profile picture (crops to a circle on both platforms)
{ const [c, x] = canvas(800, 800); drawMark(x, 130, 110, 540, {}, Path2D); save(c, 'whatif-avatar.png'); }
// a lineup of stickmen drawn by the video kit, for banners
function lineup(x, cx, groundY, s, n, gap, accentAt) {
  x.save(); x.translate(0, 0);
  const faces = ['smile', 'O', 'flat', 'grin', 'wavy', 'smile', 'flat', 'O', 'grin'];
  for (let i = 0; i < n; i++) {
    const px = cx + (i - (n - 1) / 2) * gap, look = i < (n - 1) / 2 ? 0.8 : -0.8;
    const pose = i === accentAt ? {...STAND, rh: [80, -560], elbow: [1, 1]} : {...STAND, lh: [-60 - (i % 3) * 10, -110], rh: [60, -110 - (i % 2) * 20]};
    guy(x, px, groundY, s, pose, {gx: i === accentAt ? 0 : look, gy: i === accentAt ? -0.8 : 0, mouth: faces[i % faces.length], eyes: i === accentAt ? 'wide' : undefined}, {flip: i > (n - 1) / 2});
  }
  x.restore();
}
// YouTube channel banner 2560×1440 — everything that matters inside the 1546×423 safe area
{ const [c, x] = canvas(2560, 1440); x.scale(1, 1);
  D.reseed(7); x.save(); x.scale(1, 1);
  D.line(x, [[0, 1180], [2560, 1182]], {w: 6});
  lineup(x, 270, 1180, 0.9, 3, 170, -1); lineup(x, 2290, 1180, 0.9, 3, 170, 1); // figures live outside the 1546-wide safe area
  x.restore();
  drawMark(x, 640, 548, 340, {}, Path2D); wordmark(x, 995, 760, 210, 'left', INK, 1040);
  x.font = '600 52px Inter6'; x.letterSpacing = '-1px'; x.fillStyle = '#5C5C5C'; x.fillText('One stickman. One strange possibility.', 1000, 850);
  save(c, 'youtube-banner.png'); }
// Instagram/Shorts series poster 1080×1920 (pinned post / highlight cover source)
{ const [c, x] = canvas(1080, 1920); x.scale(K, K); D.reseed(11);
  D.line(x, [[-100, GROUND], [1400, GROUND + 1]], {w: 5});
  guy(x, 640, GROUND, 1.45, {...STAND, rh: [80, -560], elbow: [1, 1]}, {gy: -0.9, mouth: 'O', eyes: 'wide'});
  x.resetTransform(); drawMark(x, 400, 140, 280, {}, Path2D);
  wordmark(x, 540, 545, 150, 'center', INK, 940);
  save(c, 'series-poster.png'); }
// covers → web-size copies for the episode cards
for (const d of (process.argv.includes('--covers') ? fs.readdirSync('/Users/hussain/dev/stickman-videos/whatif-series').filter(n => /^\d\d-/.test(n)) : [])) {
  const img = await loadImage(`/Users/hussain/dev/stickman-videos/whatif-series/${d}/cover.png`); const [c, x] = canvas(540, 960); x.drawImage(img, 0, 0, 540, 960); save(c, `cover-${d}.png`);
}
console.log(fs.readdirSync(OUT).join('\n'));
