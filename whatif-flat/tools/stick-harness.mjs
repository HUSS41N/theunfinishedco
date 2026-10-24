#!/usr/bin/env node
// Stick-style verification harness: renders buildStick directly (no scene needed).
//   node tools/stick-harness.mjs [cast|poses|walk|faces|all] [--out build/stick]
// cast  → cast.png  : 16 characters (8 women/girls with bows, 8 men/boys) beside the two reference images
// poses → poses.png : every POSES entry plus extremes (arms crossed, IK reach, run, jump, kneel)
// walk  → walk.png  : 12 consecutive frames (24 fps) of walkPose, plus walk-onion.png (all 12 overlaid)
// faces → faces.png : every eyes × mouth × brows option at 2× zoom
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {defineCharacter, POSES, walkPose} from '../src/character.mjs';
import {buildStick} from '../src/stick.mjs';
import {resetIds} from '../src/svg.mjs';

const require = createRequire(import.meta.url);
const {Resvg} = require('@resvg/resvg-js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FONTS = fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.ttf')).map(f => path.join(ROOT, 'fonts', f));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'build', 'stick'))); fs.mkdirSync(OUT, {recursive: true});
const REFS = ['/private/tmp/claude-501/-Users-hussain-dev-echo-bench/270fbf9b-0ae1-4787-8625-551bab31b069/images/2.png',
  '/private/tmp/claude-501/-Users-hussain-dev-echo-bench/270fbf9b-0ae1-4787-8625-551bab31b069/images/3.png'];
const BG = '#F6F0E6';
const label = (s, x, y, size = 30) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter Display" font-weight="700" font-size="${size}" fill="#55524C">${s}</text>`;
function save(name, w, h, body, width = w) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${BG}"/>${body}</svg>`;
  fs.writeFileSync(path.join(OUT, name.replace('.png', '.svg')), svg);
  fs.writeFileSync(path.join(OUT, name), new Resvg(svg, {fitTo: {mode: 'width', value: width}, font: {fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter Display'}}).render().asPng());
  console.log(path.join(OUT, name));
}
const deep = o => JSON.parse(JSON.stringify(o));
const place = (ch, x, y) => `<g transform="translate(${x} ${y})">${ch.svg}</g>`;
const dot = ([x, y], c = '#2D8CFF') => `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`;

export const CAST = {
  // women and girls (bows)
  mia:     {hair: {style: 'long'}, top: {style: 'tee', color: 'coral'}, bottom: {style: 'jeans', color: 'denim'}},
  nana:    {hair: {style: 'bun'}, top: {style: 'robe', color: 'red'}, accessories: ['glasses'], build: {height: 0.95}},
  lily:    {hair: {style: 'pigtails'}, top: {style: 'dress', color: 'yellow'}, build: {height: 0.64, head: 0.95, width: 0.8}, face: {blush: true}, shoes: {color: 'red'}},
  chefA:   {hair: {style: 'ponytail'}, top: {style: 'apron', color: 'red'}, bottom: {style: 'pants', color: 'charcoal'}},
  zoe:     {hair: {style: 'bob'}, top: {style: 'hoodie', color: 'purple'}, bottom: {style: 'jeans', color: 'navy'}, accessories: ['headphones']},
  ana:     {hair: {style: 'bun'}, top: {style: 'shirt', color: 'blue'}, bottom: {style: 'skirt', color: 'navy'}, face: {lashes: true}, bow: 'pink'},
  ivy:     {hair: {style: 'ponytail'}, top: {style: 'stripes', color: 'teal'}, bottom: {style: 'shorts', color: 'denim'}, build: {height: 0.7, head: 0.95, width: 0.82}, face: {blush: true}},
  rose:    {hair: {style: 'long'}, top: {style: 'dress', color: 'green'}, face: {lashes: true}, bow: 'pink'},
  // men and boys
  beanie:  {top: {style: 'tee', color: 'yellow'}, accessories: ['cap']},
  elder:   {top: {style: 'robe', color: 'red'}, accessories: ['mustache'], build: {height: 1.04}},
  kid:     {top: {style: 'tee', color: 'yellow'}, bottom: {style: 'shorts', color: 'olive'}, build: {height: 0.64, head: 0.95, width: 0.8}, face: {blush: true}},
  chefB:   {top: {style: 'apron', color: 'red'}, bottom: {style: 'pants', color: 'charcoal'}},
  office:  {hair: {style: 'quiff'}, top: {style: 'shirt', color: 'white'}, bottom: {style: 'pants', color: 'navy'}, accessories: ['glasses']},
  jake:    {top: {style: 'jacket', color: 'charcoal', detail: 'white'}, bottom: {style: 'jeans', color: 'denim'}, accessories: ['beard']},
  jake2:   {top: {style: 'tee', color: 'green'}, accessories: ['beard', 'mustache']},
  big:     {hair: {style: 'curly'}, top: {style: 'hoodie', color: 'green'}, bottom: {style: 'pants', color: 'charcoal'}, build: {width: 1.35}},
  tall:    {hair: {style: 'spiky'}, top: {style: 'tank', color: 'blue'}, bottom: {style: 'shorts', color: 'charcoal'}, build: {height: 1.12}, accessories: [{type: 'cap', style: 'peak', color: 'teal'}]},
};
const C = id => defineCharacter({id, style: 'stick', ...CAST[id]});

function castSheet() {
  resetIds();
  const ids = Object.keys(CAST).filter(k => k !== 'jake2'), cw = 300, top = 520, rowH = 1000, sc = 0.9, W = cw * 8 + 80, H = top + rowH * 2 + 40;
  let body = '';
  // references along the top, at the same height
  const r1 = fs.readFileSync(REFS[0]).toString('base64'), r2 = fs.readFileSync(REFS[1]).toString('base64');
  body += `<image x="40" y="30" width="${353 * 1.3}" height="${201 * 1.3}" href="data:image/png;base64,${r1}"/>`;
  body += `<image x="${40 + 353 * 1.3 + 30}" y="30" width="${430 * 1.05}" height="${387 * 1.05}" href="data:image/png;base64,${r2}"/>`;
  body += label('references (top) · stick style cast (below) · row 1 women/girls with bows · row 2 men/boys', W * 0.72, 120, 34);
  ids.forEach((id, i) => {
    const row = Math.floor(i / 8), col = i % 8, x = 40 + cw * col + cw / 2, y = top + rowH * row + 860;
    const pose = deep(POSES[i % 3 === 0 ? 'stand' : i % 3 === 1 ? 'relaxed' : 'wave']);
    const ch = buildStick(C(id), pose, {scale: sc, facing: col % 2 ? -1 : 1, t: 0});
    body += place(ch, x, y) + label(id, x, y + 60);
  });
  save('cast.png', W, H, body, 2000);
}

function poseGrid() {
  resetIds();
  const extremes = {
    armsCrossed: {...POSES.stand, armL: {a: -18, b: -112}, armR: {a: -18, b: -104}},
    reachUp: {...POSES.stand, armR: {reach: [230, -880]}, armL: {a: 10, b: 6}},
    reachDown: {...POSES.stand, body: {dy: 40, lean: 18}, armR: {reach: [190, -120]}},
    run: {body: {dy: -10, lean: 14}, armL: {a: -40, b: -90}, armR: {a: 50, b: -100}, legL: {a: -30, b: 70}, legR: {a: 45, b: 20}},
    jump: {body: {dy: -170, lean: 0}, armL: {a: 150, b: 20}, armR: {a: 150, b: 20}, legL: {a: 34, b: -70}, legR: {a: 34, b: -70}, face: {mouth: 'grin', eyes: 'happy'}},
    kneelIK: {body: {dy: 120, lean: 4}, legL: {reach: [-40, 0]}, legR: {reach: [120, 0]}, armL: {a: 10, b: 6}, armR: {a: 20, b: -60}},
    bendOver: {body: {dy: 0, lean: 10, bend: 26}, armL: {a: 10, b: 6}, armR: {a: 10, b: 6}, legL: {a: 3}, legR: {a: 3}},
    headTurn: {...POSES.stand, head: {tilt: 10, turn: 0.7}, face: {turn: 0.7, look: [1, 0]}},
    squash: {...POSES.stand, body: {scaleY: 0.86, dy: 0}},
  };
  const all = {...POSES, ...extremes}, names = Object.keys(all), cols = 7, cw = 330, rowH = 1000, W = cols * cw + 40, H = Math.ceil(names.length / cols) * rowH + 40;
  let body = '';
  names.forEach((nm, i) => {
    const x = 20 + cw * (i % cols) + cw / 2, y = 20 + rowH * Math.floor(i / cols) + 880;
    const p = deep(all[nm]), id = i % 2 ? 'mia' : 'beanie';
    const ch = buildStick(C(id), p, {scale: 0.95, facing: 1, hold: nm === 'hold' ? {R: 'coffee'} : nm === 'phone' || nm === 'sitPhone' ? {R: 'phone'} : {}});
    body += `<line x1="${x - 150}" y1="${y}" x2="${x + 150}" y2="${y}" stroke="#C9BFAF" stroke-width="3"/>` + place(ch, x, y) + label(nm, x, y + 60);
    for (const k of ['headTop', 'headCenter', 'mouth', 'handL', 'handR', 'footL', 'footR']) body += dot([x + ch.anchors[k][0], y + ch.anchors[k][1]], k.startsWith('hand') ? '#2D8CFF' : k.startsWith('foot') ? '#25B05A' : '#FF8A00');
    if (nm === 'reachUp') body += dot([x + 230 * 0.95, y - 880 * 0.95], '#E0245E');
    if (nm === 'reachDown') body += dot([x + 190 * 0.95, y - 120 * 0.95], '#E0245E');
  });
  save('poses.png', W, H, body, 2200);
}

function walk() {
  resetIds();
  const n = 12, cw = 260, W = n * cw + 40, H = 1000;
  let body = '', onion = '';
  for (let i = 0; i < n; i++) {
    const t = i / 24, w = walkPose(t * 1.6), x = 20 + cw * i + cw / 2, y = 900;
    const ch = buildStick(C('mia'), w, {scale: 0.9, facing: 1, t});
    body += place(ch, x, y) + label(`f${i}`, x, y + 60);
    onion += `<g opacity="${0.25 + 0.75 * (i === n - 1)}">${place(buildStick(C('beanie'), w, {scale: 0.9, facing: 1, t, shadow: false}), 600, 900)}</g>`;
  }
  save('walk.png', W, H, body, 2400);
  save('walk-onion.png', 1200, 1000, onion, 1200);
}

function faces() {
  resetIds();
  const rows = [
    ['eyes', ['open', 'wide', 'closed', 'happy', 'tired', 'angry', 'squint'].map(e => ({eyes: e}))],
    ['mouth', ['smile', 'grin', 'open', 'O', 'flat', 'sad', 'scream', 'teeth', 'chew', 'smirk'].map(m => ({mouth: m}))],
    ['brows', ['up', 'raised', 'worried', 'sad', 'angry'].map(b => ({brows: b}))],
    ['look/turn', [{look: [-1, 0]}, {look: [1, 0]}, {look: [0, -1]}, {look: [0, 1]}, {turn: -0.7}, {turn: 0.7}, {blink: 0.5}, {blink: 1}]],
    ['women', ['mia', 'nana', 'lily', 'chefA', 'zoe', 'ana', 'ivy', 'rose'].map(id => ({id}))],
    ['men', ['beanie', 'elder', 'kid', 'chefB', 'office', 'jake', 'big', 'tall'].map(id => ({id}))],
  ];
  const cw = 330, rh = 420, W = cw * 10 + 260, H = rows.length * rh + 40;
  let body = '';
  rows.forEach(([nm, list], r) => {
    body += label(nm, 120, 40 + r * rh + 230, 34);
    list.forEach((face, i) => {
      const id = face.id || (r % 2 ? 'mia' : 'beanie'), fc = {...face}; delete fc.id;
      const ch = buildStick(C(id), {...deep(POSES.stand), face: fc}, {scale: 1.0, shadow: false, t: 0.1});
      // crop to the head: translate so the head centre sits in the cell, scaled 1.5 (×2 output width below)
      const hc = ch.anchors.headCenter, x = 260 + cw * i + cw / 2, y = 40 + r * rh + 200;
      body += `<clipPath id="fc${r}_${i}"><rect x="${x - cw / 2 + 6}" y="${y - rh / 2 + 6}" width="${cw - 12}" height="${rh - 60}"/></clipPath>`;
      body += `<g clip-path="url(#fc${r}_${i})"><g transform="translate(${x} ${y}) scale(1.25) translate(${-hc[0]} ${-hc[1]})">${ch.svg}</g></g>`;
      body += label(Object.values(face).map(v => (Array.isArray(v) ? v.join(',') : v)).join(' ') || '-', x, y + rh / 2 - 20, 26);
    });
  });
  save('faces.png', W, H, `<g>${body}</g>`, W);   // 1:1 at a head radius of 140 px, i.e. a 2× zoom of a typical in-frame head
}

function zoom(ids) {   // 2× heads: the face at twice its scale-1 size
  resetIds(); const cw = 560, W = cw * ids.length, H = 600; let body = '';
  ids.forEach((id, i) => { const ch = buildStick(C(id), {...deep(POSES.stand), face: {mouth: i % 2 ? 'grin' : 'smile'}}, {scale: 2, shadow: false}), hc = ch.anchors.headCenter, x = cw * i + cw / 2;
    body += `<clipPath id="z${i}"><rect x="${cw * i + 4}" y="0" width="${cw - 8}" height="${H - 50}"/></clipPath><g clip-path="url(#z${i})"><g transform="translate(${x} 280) translate(${-hc[0]} ${-hc[1]})">${ch.svg}</g></g>` + label(id, x, H - 15); });
  save('zoom-2x.png', W, H, body, W);
}
const what = process.argv[2] || 'all';
if (what === 'zoom') zoom((process.argv[3] || 'jake,elder,beanie').split(','));
if (what === 'cast' || what === 'all') castSheet();
if (what === 'poses' || what === 'all') poseGrid();
if (what === 'walk' || what === 'all') walk();
if (what === 'faces' || what === 'all') faces();
