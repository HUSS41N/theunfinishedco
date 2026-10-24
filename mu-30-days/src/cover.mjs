import fs from 'node:fs';
import {createCanvas, loadImage, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
GlobalFonts.registerFromPath('/Users/hussain/dev/masked-and-undefined/content/youtube/01-rag-10-million/assets/fonts/InterTight-700.woff2', 'InterTight');
const img = await loadImage('build/stills/t0.28.png'), c = createCanvas(1080, 1920), x = c.getContext('2d');
x.fillStyle = '#FEFEFA'; x.fillRect(0, 0, 1080, 1920); x.drawImage(img, 0, 120); x.font = '700 150px InterTight'; x.textAlign = 'center'; x.fillStyle = '#020A1D';
x.fillText('30 DAYS.', 540, 330); x.fillStyle = '#0573FE'; x.fillText('GONE.', 540, 490);
fs.writeFileSync('cover-9x16.png', c.toBuffer('image/png'));
