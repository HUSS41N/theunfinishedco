import fs from 'node:fs'; import path from 'node:path';
import {createCanvas, loadImage} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
const [dir, out, ...names] = process.argv.slice(2); const files = names.length ? names : fs.readdirSync(dir).filter(f => f.startsWith('s')).map(f => f.replace('.png', '')).sort();
const cols = 6, cw = 330, ch = 420, c = createCanvas(cols * cw, Math.ceil(files.length / cols) * ch), x = c.getContext('2d');
x.fillStyle = '#FDFDFC'; x.fillRect(0, 0, c.width, c.height); x.font = '22px sans-serif'; x.fillStyle = '#c00';
for (const [i, f] of files.entries()) { const img = await loadImage(path.join(dir, f + '.png')); const s = Math.min((cw - 10) / img.width, (ch - 30) / img.height);
  x.strokeStyle = '#ddd'; x.strokeRect((i % cols) * cw + 2, Math.floor(i / cols) * ch + 2, cw - 4, ch - 4);
  x.drawImage(img, (i % cols) * cw + 5, Math.floor(i / cols) * ch + 26, img.width * s, img.height * s); x.fillText(f, (i % cols) * cw + 8, Math.floor(i / cols) * ch + 20); }
fs.writeFileSync(out, c.toBuffer('image/png'));
