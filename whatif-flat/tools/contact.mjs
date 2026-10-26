#!/usr/bin/env node
// Contact sheet from PNGs: node tools/contact.mjs out.png <cols> <cellWidth> a.png b.png … (labels = file names)
import fs from 'node:fs';
import path from 'node:path';
import {rasterize} from '../src/render.mjs';
import {el, rect, text} from '../src/svg.mjs';
const [out, cols, cw, ...files] = process.argv.slice(2), C = +cols, W = +cw;
const dims = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const [w0, h0] = dims(files[0]), ch = Math.round(W * h0 / w0), cells = [];
files.forEach((f, i) => { const x = (i % C) * W, y = Math.floor(i / C) * (ch + 28);
  cells.push(el('image', {href: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), x, y: y + 26, width: W - 4, height: ch}), text(path.basename(f, '.png'), x + 6, y + 20, {'font-family': 'Inter Display', 'font-size': 18, fill: '#C33'})); });
const Wd = C * W, Hd = Math.ceil(files.length / C) * (ch + 28);
fs.writeFileSync(out, rasterize(el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: Wd, height: Hd}, rect(0, 0, Wd, Hd, '#DDD'), cells), Wd).asPng()); console.log(out);
