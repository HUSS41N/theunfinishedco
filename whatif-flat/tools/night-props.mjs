#!/usr/bin/env node
// Last Bus props sheet (owner: world): every night prop on a dark ground, scaled up to read. → build/world/night-props.png
import fs from 'node:fs';
import path from 'node:path';
import {SCENE, sceneProp} from '../src/props.mjs';
import {el, g, rect, text, resetIds} from '../src/svg.mjs';
import {rasterize} from '../src/render.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(ROOT, 'build', 'world'); fs.mkdirSync(OUT, {recursive: true});
const t = +(process.argv[2] || 0.5);
const items = [
  ['teaStall', {}, 0.32, 230], ['plasticChair', {}, 0.6, 250], ['plasticChair', {upside: true}, 0.6, 140], ['cakeBox', {bend: 0}, 2.2, 230], ['cakeBox', {bend: 0.85}, 2.2, 230], ['cakeBox', {flame: false, smoke: true, bend: 0.85}, 2.2, 230],
  ['cakeBox', {open: false}, 2.2, 230], ['destinationBoard', {text: 'CITY CENTRE', route: '13'}, 0.42, 140], ['destinationBoard', {text: 'EP 02', prev: 'CITY CENTRE', change: 0.3, route: '13'}, 0.42, 140], ['birthdayBanner', {w: 300, sag: 40}, 1, 80], ['garland', {}, 0.65, 40], ['schoolBag', {}, 0.55, 260],
  ['soldierCap', {}, 1.2, 200], ['soldierCap', {kind: 'peaked'}, 1.2, 200], ['wristband', {}, 1.2, 150], ['phoneUI', {mode: 'lock', cracked: true}, 0.26, 280], ['phoneUI', {mode: 'voicemail', progress: 0.4, playing: true}, 0.26, 280], ['phoneUI', {mode: 'call'}, 0.26, 280],
  ['phoneFlat', {cracked: true}, 2.4, 150], ['busSide', {}, 0.05, 220], ['busFront', {}, 0.18, 280],
];
const cw = 300, ch = 300, cols = 6, cells = [];
items.forEach(([type, o, s, y], i) => { resetIds(); const x = (i % cols) * cw, yy = Math.floor(i / cols) * ch;
  cells.push(g({transform: `translate(${x} ${yy})`}, rect(4, 4, cw - 8, ch - 8, '#2B3340'), g({transform: `translate(${cw / 2} ${y})`}, sceneProp({type, ...o, scale: s, x: 0, y: 0, t}, t)), text(type + (o.upside ? ' upside' : o.mode ? ' ' + o.mode : o.change ? ' change' : o.bend ? ' bent' : ''), 12, ch - 16, {'font-family': 'Inter Display', 'font-size': 18, fill: '#DDD'}))); });
const W = cols * cw, H = Math.ceil(items.length / cols) * ch, svg = el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: W, height: H}, rect(0, 0, W, H, '#111'), cells);
const f = path.join(OUT, 'night-props.png'); fs.writeFileSync(f, rasterize(svg, W).asPng()); console.log(f);
