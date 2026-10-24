#!/usr/bin/env node
// World harness (owner: world). Renders every set preset in both styles with an 800 px stand-in actor for scale,
// checks for uncovered frame edges at zoom 0.4, and writes contact sheets.
//   node tools/world-harness.mjs                  → build/world/{sheet-<style>-<n>.png, props-<style>.png, edges.txt}
//   node tools/world-harness.mjs --only room,cafe → just those presets
//   node tools/world-harness.mjs --frame room stick 0.4 540 960   → one full-size frame
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {SETS, buildSet} from '../src/backgrounds.mjs';
import {SCENE, sceneProp} from '../src/props.mjs';
import {el, g, rect, circle, text, resetIds} from '../src/svg.mjs';

const require = createRequire(import.meta.url);
const {Resvg} = require('@resvg/resvg-js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'build', 'world'); fs.mkdirSync(OUT, {recursive: true});
const FONTS = fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.ttf')).map(f => path.join(ROOT, 'fonts', f));
const W = 1080, H = 1920, MAGENTA = '#FF00FF';
const arg = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const png = (svg, w) => new Resvg(svg, {fitTo: {mode: 'width', value: w}, font: {fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter Display'}}).render();

/** the stand-in actor: 800 px from feet to head top (1.7 m), with a 2 m ruler beside it */
function standIn(x, floorY) {
  const head = 120;
  return g({}, rect(x - 95, floorY - 800 + head * 2 - 10, 190, 800 - head * 2 + 10, '#3B3F8C', {rx: 60, stroke: '#111', 'stroke-width': 6}),
    circle(x, floorY - 800 + head, head, '#FFFFFF', {stroke: '#111', 'stroke-width': 7}),
    rect(x + 150, floorY - 940, 16, 940, '#FFD23F', {stroke: '#111', 'stroke-width': 3}), ...[0, 1, 2, 3, 4].map(i => rect(x + 140, floorY - i * 235 - 3, 36, 6, '#111')),
    text('2 m', x + 190, floorY - 925, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 36, fill: '#111'}));
}
function frame(preset, style, zoom, cx, cy, {actor = true, bg = MAGENTA} = {}) {
  resetIds();
  const spec = {preset, style}, set = buildSet(spec, W, H), floorY = {street: 1560, nightCity: 1560}[preset] || 1500;
  const world = g({transform: `translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-cx} ${-cy})`}, set.back, set.mid, actor ? [standIn(540, floorY), standIn(1500, floorY)] : '', set.front);
  return el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`}, rect(0, 0, W, H, bg), world);
}
function magentaShare(img) { const p = img.pixels; let n = 0; for (let i = 0; i < p.length; i += 16) if (p[i] > 240 && p[i + 1] < 20 && p[i + 2] > 240) n++; return n / (p.length / 16); }

if (process.argv.includes('--frame')) {
  const i = process.argv.indexOf('--frame'), [preset, style, z, cx, cy] = process.argv.slice(i + 1);
  const f = path.join(OUT, `frame-${preset}-${style}-${z}-${cx}-${cy}.png`); fs.writeFileSync(f, png(frame(preset, style, +z, +cx, +cy), W).asPng()); console.log(f); process.exit(0);
}

const presets = (arg('--only') || Object.keys(SETS).join(',')).split(',');
const styles = ['flat', 'stick'], VIEWS = [[1, 540, 1100, 'zoom 1'], [0.4, 540, 960, 'zoom 0.4'], [0.4, -1500, 0, '0.4 · x−1500 y0'], [0.4, 2600, 1920, '0.4 · x2600 y1920']];
const EDGE = [[-1500, 0], [-1500, 1920], [2600, 0], [2600, 1920], [540, 0], [540, 1920]];
const report = [];
for (const style of styles) {
  const cw = 270, ch = 480, per = 8;
  for (let page = 0; page * per < presets.length; page++) {
    const list = presets.slice(page * per, page * per + per), cells = [];
    list.forEach((p, r) => VIEWS.forEach(([z, cx, cy, label], c) => {
      const img = png(frame(p, style, z, cx, cy), cw);
      cells.push(el('image', {href: 'data:image/png;base64,' + img.asPng().toString('base64'), x: c * cw, y: r * (ch + 34) + 34, width: cw, height: ch}),
        text(`${p} · ${label}`, c * cw + 6, r * (ch + 34) + 26, {'font-family': 'Inter Display', 'font-weight': 700, 'font-size': 20, fill: '#222'}));
    }));
    const sw = VIEWS.length * cw, sh = list.length * (ch + 34);
    const f = path.join(OUT, `sheet-${style}-${page + 1}.png`);
    fs.writeFileSync(f, png(el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: sw, height: sh}, rect(0, 0, sw, sh, '#DDD'), cells), sw).asPng()); console.log('sheet →', f);
  }
  for (const p of presets) for (const [cx, cy] of EDGE) { const share = magentaShare(png(frame(p, style, 0.4, cx, cy, {actor: false}), 270)); if (share > 0) report.push(`${style} ${p} @0.4 (${cx},${cy}): ${(share * 100).toFixed(2)}% uncovered`); }
  // props at real scale beside the stand-in
  const names = Object.keys(SCENE).filter(k => !['svg', 'tag', 'thought', 'phoneUI', 'bubble', 'board', 'checklist', 'flowerTrail', 'stars', 'rope', 'brickWall', 'popcornSpill'].includes(k));
  const big = new Set(['tree', 'building', 'lampPost', 'busStop', 'car', 'fountain', 'waterTank']);
  const small = names.filter(n => !big.has(n)), rows = [], RW = 9000;
  { let cur = [], wsum = 0; const wOf = n => ({sofa: 1000, bed: 1000, hospitalBed: 1000, counter: 1500, wallCabinet: 1500, whiteboard: 1500, stringLights: 1700, rug: 1300, desk: 760, table: 600, bench: 900}[n] || 520) + 140;
    for (const n of small) { if (wsum + wOf(n) > RW - 400 && cur.length) { rows.push([cur, 1800]); cur = []; wsum = 0; } cur.push(n); wsum += wOf(n); } rows.push([cur, 1800]); rows.push([['tree', 'lampPost', 'busStop', 'car'], 3300]); rows.push([['building', 'fountain', 'waterTank'], 6400]); }
  const parts = []; let y = 0;
  for (const [row, rh] of rows) { y += rh; let x = 300;
    parts.push(rect(0, y - rh, RW, rh, style === 'stick' ? '#F3E7D3' : '#E9E2D6'), rect(0, y, RW, 260, style === 'stick' ? '#E6CDA8' : '#B98E62'), standIn(120, y));
    for (const n of row) { const w = {tree: 2200, building: 2600, busStop: 1700, car: 2200, fountain: 1600, waterTank: 800, lampPost: 600, sofa: 1000, bed: 1000, hospitalBed: 1000, counter: 1500, wallCabinet: 1500, whiteboard: 1500, stringLights: 1700, rug: 1300, desk: 760, table: 600, bench: 900}[n] || 520;
      const yy = ['clock', 'frame'].includes(n) ? y - 900 : ['lantern', 'pendant'].includes(n) ? y - 1500 : n === 'wallCabinet' ? y - 900 : n === 'stringLights' ? y - 1300 : n === 'rug' ? y + 80 : n === 'whiteboard' ? y - 420 : n === 'building' ? y : y;
      parts.push(sceneProp({type: n, x: x + w / 2, y: yy, style, ...(n === 'stringLights' ? {x2: 1500} : {}), ...(n === 'building' ? {floors: 4} : {})}, 0), text(n, x + w / 2, y + 150, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 80, fill: '#222'}));
      x += w + 140; }
    y += 300; }
  const f = path.join(OUT, `props-${style}.png`);
  fs.writeFileSync(f, png(el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: RW, height: y, viewBox: `0 0 ${RW} ${y}`}, rect(0, 0, RW, y, '#DDD'), parts), 2400).asPng()); console.log('props →', f);
}
fs.writeFileSync(path.join(OUT, 'edges.txt'), report.length ? report.join('\n') + '\n' : 'all presets cover the frame at zoom 0.4 for every probed camera\n');
console.log(report.length ? 'EDGES\n' + report.join('\n') : 'edges: OK');
