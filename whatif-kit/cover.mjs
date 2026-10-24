// Cover frame: node cover.mjs <video dir> <time> "LINE ONE" ["ACCENT LINE"] [accent hex] [max text width px] [first line y px]
// Renders the scene still at <time>, then sets the cover text (≤ 3 words in total, per /yt-package) at the top.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCanvas, loadImage, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
const KIT = path.dirname(new URL(import.meta.url).pathname);
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/Inter-SemiBold.ttf'), 'WIHead');
GlobalFonts.registerFromPath(path.join(KIT, 'fonts/InstrumentSerif-Italic.ttf'), 'WIAccentSerif');
const [dirArg, t, l1, l2, accent = '#E5322D', maxW = '960', y0 = '250'] = process.argv.slice(2); const dir = path.resolve(dirArg);
execFileSync('node', [path.join(dir, 'scene.mjs'), '--stills', t], {cwd: dir});
const img = await loadImage(path.join(dir, 'build/stills', `t${Number(t).toFixed(2)}.png`));
const c = createCanvas(1080, 1920), x = c.getContext('2d');
x.drawImage(img, 0, 0); x.textAlign = 'center'; x.textBaseline = 'middle';
// house style: line 1 in Inter 600 tight (sentence case), the accent line in Instrument Serif italic at 1.12×
const sc = s => s.toLowerCase().replace(/^(\W*)(\w)/, (m, p, c) => p + c.toUpperCase());
const lines = [[sc(l1), '#111111', 'head'], ...(l2 ? [[l2.toLowerCase(), accent, 'serif']] : [])];
const setF = (role, size) => { x.font = role === 'serif' ? `italic 400 ${size * 1.12}px WIAccentSerif` : `600 ${size}px WIHead`; x.letterSpacing = `${(role === 'serif' ? -0.01 : -0.03) * size}px`; };
const fit = (s, role, max) => { let size = 170; do { setF(role, size); size -= 4; } while (x.measureText(s).width > max && size > 60); return size + 4; };
const size = Math.min(...lines.map(([s, , r]) => fit(s, r, Number(maxW))));
lines.forEach(([s, col, r], i) => { setF(r, size); x.lineWidth = size * 0.16; x.strokeStyle = '#FFFFFF'; const yy = Number(y0) + i * size * 1.1; x.strokeText(s, 540, yy); x.fillStyle = col; x.fillText(s, 540, yy); });
fs.writeFileSync(path.join(dir, 'cover.png'), c.toBuffer('image/png'));
console.log('cover', path.join(dir, 'cover.png'));
