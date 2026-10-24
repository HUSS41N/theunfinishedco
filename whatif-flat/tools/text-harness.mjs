#!/usr/bin/env node
// Text-module harness (owner: text). Renders frames with src/text.mjs layers composited over the engine's frame, before
// scene.mjs wires them in. Usage: node tools/text-harness.mjs  → build/text/*.png and a lint printout.
import fs from 'node:fs';
import path from 'node:path';
import {compile, frameSVG, resolvePose} from '../src/scene.mjs';
import {buildCharacter} from '../src/character.mjs';
import {rasterize} from '../src/render.mjs';
import {screenText, bubbleLayer, lintText, camToScreen, headBoxes} from '../src/text.mjs';
import {SAFE, BANDS, RAIL_NOTCH, CENTER_X} from '../src/layout.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(ROOT, 'build', 'text');
fs.mkdirSync(OUT, {recursive: true});

/** speakers for the actors of a shot at shot time lt (static actors; anchors from the builder, or estimated) */
function speakersOf(C, shot) {
  return (shot.actors || []).map(a => {
    const scale = a.scale ?? 1, facing = a.facing ?? 1, x = a.x ?? 540, y = a.y ?? 1500;
    const ch = buildCharacter(C.cast[a.id], resolvePose(a.pose || 'stand'), {scale, facing});
    const A = ch.anchors || {headTop: [0, -830 * scale], headCenter: [0, -720 * scale], mouth: [facing * 14 * scale, -665 * scale]};
    const w = p => [x + p[0], y + p[1]];
    return {id: a.id, facing, anchors: {headTop: w(A.headTop), headCenter: w(A.headCenter), mouth: w(A.mouth)}};
  });
}
function debugOverlay(heads) {
  const s = SAFE, b = Object.values(BANDS);
  return `<g data-layer="debug" fill="none" stroke-width="4">
    <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" stroke="#00E5FF" stroke-dasharray="18 10"/>
    <path d="M${RAIL_NOTCH.x} ${RAIL_NOTCH.y} V${s.y + s.h}" stroke="#FF3DCB" stroke-dasharray="10 8"/>
    <path d="M${RAIL_NOTCH.x} ${RAIL_NOTCH.y} H${s.x + s.w}" stroke="#FF3DCB" stroke-dasharray="10 8"/>
    ${b.map(z => `<path d="M${s.x} ${z.y + z.h} H${s.x + s.w}" stroke="#00E5FF" stroke-width="2"/>`).join('')}
    <path d="M${CENTER_X} ${s.y} V${s.y + s.h}" stroke="#00E5FF" stroke-width="2" stroke-dasharray="4 8"/>
    ${heads.map(h => `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" stroke="#FFB000" stroke-width="3"/>`).join('')}
    <text x="${s.x + 8}" y="${s.y + 30}" font-family="JetBrains Mono" font-size="24" fill="#00E5FF">SAFE 120–888 × 288–1248</text>
    <text x="${RAIL_NOTCH.x + 6}" y="${RAIL_NOTCH.y + 30}" font-family="JetBrains Mono" font-size="20" fill="#FF3DCB">rail</text></g>`;
}
/** the full frame: engine frame without its inline text, then bubbles + screen text (+ optional debug) */
export function frame(scene, t, {debug = false} = {}) {
  const bare = {...scene, shots: scene.shots.map(s => ({...s, text: []}))};
  const C = compile(scene), C0 = compile(bare);
  const shot = C.shots.find(s => t >= s.start && t < s.end) || C.shots.at(-1), lt = t - shot.start;
  const k = (shot.camera || [{}])[0], toScreen = camToScreen({x: k.x ?? 540, y: k.y ?? 960, zoom: k.zoom ?? 1, rot: k.rot ?? 0}, C.W, C.H);
  const speakers = speakersOf(C, shot);
  const mine = bubbleLayer(shot, lt, C, speakers, toScreen) + screenText(shot, lt, C, speakers, toScreen) + (debug ? debugOverlay(headBoxes(speakers, toScreen)) : '');
  const svg = frameSVG(C0, t), at = svg.lastIndexOf('<g data-layer="screen"');
  return at > -1 ? svg.slice(0, at) + mine + svg.slice(at) : svg.replace(/<\/svg>$/, mine + '</svg>');
}
const png = (svg, w = 1080) => rasterize(svg, w).asPng();
/** stack crops (y0..y1) of frames t0, t0+1/24, … into one strip image */
function strip(scene, t0, n, y0, y1, file, scale = 0.5) {
  const h = (y1 - y0) * scale, w = 1080 * scale, rows = [];
  for (let i = 0; i < n; i++) { const t = t0 + i / 24, img = png(frame(scene, t), 1080).toString('base64');
    rows.push(`<svg x="0" y="${i * (h + 6)}" width="${w}" height="${h}" viewBox="0 ${y0} 1080 ${y1 - y0}"><image href="data:image/png;base64,${img}" width="1080" height="1920"/></svg>`,
      `<text x="8" y="${i * (h + 6) + 26}" font-family="JetBrains Mono" font-size="22" fill="#FF3DCB">f${Math.round(t * 24)} ${t.toFixed(3)}s</text>`); }
  const H = n * (h + 6);
  fs.writeFileSync(path.join(OUT, file), png(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}"><rect width="${w}" height="${H}" fill="#222"/>${rows.join('')}</svg>`, w));
}

// ---------------- test scenes ----------------
const cast = {
  ana: {skin: 'brown', hair: {style: 'long', color: 'black'}, top: {style: 'shirt', color: 'purple'}, bottom: {style: 'skirt', color: 'mustard'}},
  ben: {skin: 'fair', hair: {style: 'spiky', color: 'ginger'}, top: {style: 'hoodie', color: 'red'}, bottom: {style: 'jeans', color: 'denim'}},
};
const meta = (style = 'flat', duration = 6) => ({title: 'text test', width: 1080, height: 1920, fps: 24, duration, style});
const cam = [{t: 0, x: 540, y: 960, zoom: 1}];
const S = {
  light: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'park'}, camera: cam,
    actors: [{id: 'ana', x: 380, y: 1500, pose: 'wave', facing: 1}, {id: 'ben', x: 720, y: 1500, pose: 'point', facing: -1}],
    text: [{text: 'WHAT IF PARKS\nCOULD *TALK*?', y: 420, size: 112, from: 0, to: 4, highlight: 'word'},
           {text: 'day 1 · 8:00 AM', font: 'mono', y: 1180, size: 48, from: 0, to: 4}]}]},
  dark: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'nightCity'}, camera: cam,
    actors: [{id: 'ben', x: 540, y: 1500, pose: 'shrug'}],
    text: [{text: 'NOBODY NOTICED', y: 420, size: 112, from: 0, to: 4},
           {text: 'for 3 whole days', font: 'serif', y: 560, size: 84, color: '#FFD23F', from: 0, to: 4},
           {text: 'a plate keeps it readable', font: 'sans', y: 1200, size: 56, plate: true, from: 0, to: 4}]}]},
  bubbles: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'room'}, camera: [{t: 0, x: 540, y: 1080, zoom: 1.25}],
    actors: [{id: 'ana', x: 470, y: 1500, pose: 'stand', facing: 1, say: [{from: 0, to: 4, text: 'Did you just hear the couch sigh?'}]},
             {id: 'ben', x: 640, y: 1500, pose: 'shrug', facing: -1, say: [{from: 0.4, to: 4.4, text: 'It does that every Monday.', kind: 'speech'}]}]}]},
  kinds: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'spotlight'}, camera: [{t: 0, x: 540, y: 1100, zoom: 1.1}],
    actors: [{id: 'ana', x: 330, y: 1500, pose: 'think', say: [{from: 0, to: 4, text: 'Is it alive?', kind: 'think'}]},
             {id: 'ben', x: 780, y: 1500, pose: 'scared', facing: -1, say: [{from: 0, to: 4, text: 'It moved!', kind: 'shout'}]}]}]},
  long: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'office'}, camera: cam,
    actors: [{id: 'ben', x: 540, y: 1500, pose: 'phone'}],
    text: [{text: 'WHAT IF YOUR BOSS COULD READ MINDS', y: 400, size: 120, from: 0, to: 5},
           {text: 'EVERY SINGLE MEETING, FOREVER', x: 540, y: 1220, size: 96, from: 0, to: 5},
           {text: 'label', font: 'mono', x: 1000, y: 1700, size: 30, from: 0, to: 5}]}]},
  words: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'spotlight'}, camera: cam, actors: [],
    text: [{text: 'WHAT IF *GRAVITY* STOPPED?', y: 460, size: 104, from: 0, to: 4, anim: 'words', highlight: 'word'}]}]},
  count: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'spotlight'}, camera: cam, actors: [],
    text: [{text: '$1,280', y: 520, size: 160, from: 0, to: 4, anim: 'count', highlight: 'word'}, {text: 'SAVED IN A YEAR', y: 640, size: 84, from: 0.3, to: 4}]}]},
  hl: {meta: meta(), cast, shots: [{start: 0, end: 6, set: {preset: 'room'}, camera: cam, actors: [],
    text: [{text: 'THE PRICE OF *ONE* WORD', y: 460, size: 100, from: 0, to: 4}, {text: 'type: it costs $12', font: 'mono', y: 600, size: 52, from: 0, to: 4, anim: 'type'}]}]},
  stick: {meta: meta('stick'), cast, shots: [{start: 0, end: 6, set: {preset: 'room'}, camera: [{t: 0, x: 540, y: 1100, zoom: 1.15}],
    actors: [{id: 'ana', x: 400, y: 1500, pose: 'wave', say: [{from: 0, to: 4, text: 'Hi! I live here now.'}]}, {id: 'ben', x: 720, y: 1500, pose: 'shrug', facing: -1}],
    text: [{text: 'WHAT IF YOUR\nROOM *TALKED*?', y: 420, size: 104, from: 0, to: 4}]}]},
};

const shots = [['caption-light', S.light, 1.2], ['caption-dark', S.dark, 1.2], ['bubbles-close', S.bubbles, 1.5], ['bubbles-kinds', S.kinds, 1.2], ['long-autoshrink-debug', S.long, 1.2, true],
  ['stick-theme', S.stick, 1.2], ['highlight-type', S.hl, 1.5], ['exit-fade', S.light, 3.9]];
for (const [name, sc, t, debug] of shots) fs.writeFileSync(path.join(OUT, name + '.png'), png(frame(sc, t, {debug})));
fs.writeFileSync(path.join(OUT, 'bubbles-close-debug.png'), png(frame(S.bubbles, 1.5, {debug: true})));
strip(S.words, 0, 10, 300, 600, 'strip-words.png');
strip(S.count, 0, 10, 330, 700, 'strip-count.png');
strip(S.hl, 0, 10, 330, 640, 'strip-highlight.png');
strip(S.count, 0.42, 10, 330, 700, 'strip-count-late.png');
for (const [name, sc] of Object.entries(S)) { const C = compile(sc); const w = lintText(C); if (w.length) console.log(`\n# ${name}\n` + w.map(x => `  ${x.level} ${x.t.toFixed(2)}s ${x.msg}`).join('\n')); }
console.log('\nimages →', OUT);
