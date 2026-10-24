#!/usr/bin/env node
// Cover: a frame of the scene + up to 3 words of cover text (Inter Display Black).
//   node src/cover.mjs scene.json <time> "LINE ONE" ["ACCENT LINE"] [accent hex] [out.png] [--style flat|stick]
// flat: white title, hard shadow, dark top fade. stick: ink title with a white outline, light top fade (v1 sets are light).
// The title sits in y 300–700 and within 900 px of width: inside the Instagram profile grid's 3:4 crop (y 240–1680).
import fs from 'node:fs';
import path from 'node:path';
import {compile, frameSVG} from './scene.mjs';
import {rasterize} from './render.mjs';
const argv = process.argv.slice(2), si = argv.indexOf('--style'), style = si >= 0 ? argv.splice(si, 2)[1] : undefined;
const [file, t, l1, l2, accentArg, out] = argv;
const C = compile(JSON.parse(fs.readFileSync(file, 'utf8')), {style});
const stick = (style || C.scene.meta?.style) === 'stick', accent = accentArg || (stick ? '#E8442E' : '#FFD23F');
for (const s of C.shots) s.text = [];   // drop the video's own titles; speech/thought bubbles stay (07's premise lives in them)
const frame = frameSVG(C, Number(t));
const lines = [[l1, stick ? '#1E1E22' : '#FFFFFF'], ...(l2 ? [[l2, accent]] : [])], size = Math.min(190, 900 / Math.max(...lines.map(([s]) => s.length * 0.62)));
const font = `text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="${size}" letter-spacing="${-size * 0.025}"`;
const textSvg = lines.map(([s, c], i) => { const y = 300 + size * 0.8 + i * size * 1.02;
  return stick
    ? `<text x="540" y="${y}" ${font} fill="${c}" stroke="#FFFFFF" stroke-width="${size * 0.14}" stroke-linejoin="round" paint-order="stroke">${s}</text>`
    : `<text x="540" y="${y + size * 0.07}" ${font} fill="rgba(0,0,0,0.45)" transform="translate(${size * 0.05} 0)">${s}</text><text x="540" y="${y}" ${font} fill="${c}">${s}</text>`; }).join('');
const [fade, fadeOp] = stick ? ['#FFFFFF', 0.55] : ['#000', 0.45];
const svg = frame.replace(/<\/svg>$/, `<defs><linearGradient id="cvfade" x1="0" y1="0" x2="0" y2="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${fade}" stop-opacity="${fadeOp}"/><stop offset="1" stop-color="${fade}" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="760" fill="url(#cvfade)"/>${textSvg}</svg>`);
const dest = out || path.join(path.dirname(file), stick ? 'cover-stick.png' : 'cover.png');
fs.writeFileSync(dest, rasterize(svg, 1080).asPng()); console.log('cover →', dest);
