#!/usr/bin/env node
// What If v2 renderer. JSON scene in; SVG frames → resvg → ffmpeg out.
//   node src/render.mjs scene.json                 → <out>/<name>.mp4 (+ synthesized sound via whatif-kit/sfx.py)
//   node src/render.mjs scene.json --stills 0.5,3   → <out>/stills/t0.50.png …
//   node src/render.mjs scene.json --svg 2.0        → <out>/frame-2.00.svg (the layered SVG document)
//   node src/render.mjs scene.json --layers 2.0     → <out>/layers/2.00/{set,props,actors}.svg + every named layer listed
//   node src/render.mjs scene.json --sheet          → <out>/sheet.png (one frame per second)
//   node src/render.mjs --cast cast.json [--out d]  → character sheet: every cast member × expressions × poses
//   node src/render.mjs --list                      → every pose, prop, set, action, skin/hair/cloth colour (for writing JSON)
//   node src/render.mjs scene.json --check          → validate: builds one frame per shot, reports problems + text lint, renders nothing
//   node src/render.mjs scene.json --strip a,b      → <out>/strip-a.png: 12 consecutive frames from t=a (motion QA), for each a
// Options: --out <dir> (default: <scene dir>/build/<scene name>), --silent (skip sound), --style flat|stick (overrides meta.style)
// Motion blur: shots with `blur: true`, meta.motionBlur, and push/whip transitions render 3 subframes over a 0.5-frame shutter.
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {compile, frameSVG, soundEvents, ready, textModule, motionBlurAt, shotRange, TRANSITIONS, transitionState} from './scene.mjs';
import {defineCharacter, buildCharacter, POSES} from './character.mjs';
import {guardSVG} from './svg.mjs';
import {SCENE, HELD} from './props.mjs';
import {SETS} from './backgrounds.mjs';
import {SKIN, HAIR, CLOTH} from './style.mjs';
import {el, layer, rect, text, tr} from './svg.mjs';

const require = createRequire(import.meta.url);
const {Resvg} = require('@resvg/resvg-js');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FONTS = fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.ttf')).map(f => path.join(ROOT, 'fonts', f));
const KIT = path.resolve(ROOT, '../whatif-kit');
const PY = path.join(process.env.HOME, 'dev/masked-and-undefined/tools/.venv/bin/python');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes(k);

const OPTS = width => ({fitTo: {mode: 'width', value: width}, font: {fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter Display'}, shapeRendering: 2, textRendering: 1});
// resvg panics (geom.rs:27) when a translucent element/group lands entirely off-canvas (zoomed cameras). Fallbacks:
// 1) move opacity on single shapes into fill-/stroke-opacity (identical look, no offscreen layer)
// 2) drop group opacity for that frame (logged). Frames that render normally are untouched.
const PRIM = /<(path|rect|circle|ellipse|text)\b([^>]*?)\sopacity="([\d.]+)"/g;
let fallbacks = 0;
// sfx kinds the mixer knows (parsed from whatif-kit/sfx.py so --check fails before a long render, not after it)
const SFX_KINDS = new Set([...fs.readFileSync(path.join(KIT, 'sfx.py'), 'utf8').matchAll(/k == '(\w+)'/g)].map(m => m[1]));
export function rasterize(svg, width) {
  try { return new Resvg(svg, OPTS(width)).render(); } catch (e) { if (!/panic/i.test(String(e))) throw e; }
  const s1 = svg.replace(PRIM, (m, tag, attrs, op) => `<${tag}${attrs} fill-opacity="${op}" stroke-opacity="${op}"`);
  try { return new Resvg(s1, OPTS(width)).render(); } catch (e) { if (!/panic/i.test(String(e))) throw e; }
  try { return new Resvg(guardSVG(s1), OPTS(width)).render(); } catch (e) { if (!/panic/i.test(String(e))) throw e; }   // clip/opacity groups fully off canvas: anchor them on-canvas
  if (++fallbacks <= 3) console.warn(`\n[render] resvg panic on a frame: rendering it with group opacity removed (${fallbacks})`);
  return new Resvg(s1.replace(/<g\b([^>]*?)\sopacity="[\d.]+"/g, '<g$1'), OPTS(width)).render();
}
const png = (svg, w) => rasterize(svg, w).asPng();

// ---------- PNG encoding for blended (motion-blurred) frames ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
export function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 6})), chunk('IEND', Buffer.alloc(0))]);
}
// ---------- shot transitions, composited in pixels ----------
const hexRGB = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || '') ; const v = m ? parseInt(m[1], 16) : 0; return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
/** separable box blur along one axis, 3 passes ≈ gaussian with σ ≈ r·0.58·√3 */
function dirBlur(px, w, h, sigma, horizontal) {
  const r = Math.max(1, Math.round(sigma * 0.95)), tmp = new Float32Array(horizontal ? w * 4 : h * 4), n = horizontal ? w : h, lines = horizontal ? h : w;
  for (let pass = 0; pass < 3; pass++) for (let L = 0; L < lines; L++) {
    const idx = i => (horizontal ? (L * w + i) : (i * w + L)) * 4;
    for (let c = 0; c < 4; c++) { let acc = 0; for (let i = -r; i <= r; i++) acc += px[idx(Math.min(n - 1, Math.max(0, i))) + c];
      for (let i = 0; i < n; i++) { tmp[i * 4 + c] = acc / (2 * r + 1); acc += px[idx(Math.min(n - 1, i + r + 1)) + c] - px[idx(Math.max(0, i - r)) + c]; } }
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) px[idx(i) + c] = tmp[i * 4 + c];
  }
}
/** sample `src` scaled by s about the centre (bilinear) */
function scaled(src, w, h, s) {
  if (Math.abs(s - 1) < 1e-4) return src; const out = Buffer.alloc(src.length), cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(w - 1.001, Math.max(0, (x + 0.5 - cx) / s + cx - 0.5)), sy = Math.min(h - 1.001, Math.max(0, (y + 0.5 - cy) / s + cy - 0.5));
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, o = (y * w + x) * 4, i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
    for (let c = 0; c < 4; c++) out[o + c] = (src[i00 + c] * (1 - fx) + src[i10 + c] * fx) * (1 - fy) + (src[i01 + c] * (1 - fx) + src[i11 + c] * fx) * fy;
  }
  return out;
}
function transitionPixels(C, t, width, st) {
  const P = rasterize(frameSVG(C, t, {part: 'prev'}), width), Q = rasterize(frameSVG(C, t, {part: 'cur'}), width);
  const w = P.width, h = P.height, k = w / C.W, prev = P.pixels, cur = Q.pixels, out = Buffer.alloc(prev.length);
  const col = hexRGB(st.color);
  if (st.type === 'fade') { const src = st.show === 'prev' ? prev : cur, a = st.fade; for (let i = 0; i < out.length; i += 4) { for (let c = 0; c < 3; c++) out[i + c] = src[i + c] * (1 - a) + col[c] * a; out[i + 3] = 255; } }
  else if (st.type === 'crossfade' || st.type === 'zoom') {
    const A = scaled(prev, w, h, st.s1), B = scaled(cur, w, h, st.s2), a = st.alpha; for (let i = 0; i < out.length; i++) out[i] = A[i] * (1 - a) + B[i] * a;
  } else if (st.type === 'iris') {
    const cx = st.cx * k, cy = st.cy * k, R = st.R * k;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), a = Math.min(1, Math.max(0, R - d + 0.5)), o = (y * w + x) * 4; for (let c = 0; c < 4; c++) out[o + c] = prev[o + c] * (1 - a) + cur[o + c] * a; }
  } else {   // push / whip: both shots slide
    const po = st.prevOff.map(v => Math.round(v * k)), co = st.curOff.map(v => Math.round(v * k));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, cxs = x - co[0], cys = y - co[1];
      let src = null, si = 0;
      if (cxs >= 0 && cxs < w && cys >= 0 && cys < h) { src = cur; si = (cys * w + cxs) * 4; }
      else { const pxs = x - po[0], pys = y - po[1]; if (pxs >= 0 && pxs < w && pys >= 0 && pys < h) { src = prev; si = (pys * w + pxs) * 4; } }
      if (src) { out[o] = src[si]; out[o + 1] = src[si + 1]; out[o + 2] = src[si + 2]; } out[o + 3] = 255;
    }
    if (st.blur * k > 0.6) { const f = new Float32Array(out); dirBlur(f, w, h, st.blur * k, st.dir[0] !== 0); for (let i = 0; i < out.length; i++) out[i] = f[i]; }
  }
  return {pixels: out, width: w, height: h};
}
/** one frame (no motion blur): a single rasterize, or the pixel composite of an active transition */
function stillFrame(C, t, width) {
  const st = transitionState(C, t);
  if (st && st.type !== 'cut') return transitionPixels(C, t, width, st);
  const img = rasterize(frameSVG(C, t), width); return {pixels: img.pixels, width: img.width, height: img.height};
}
/** one video frame as RGBA: motion blur averages N subframes across a 0.5-frame shutter, clamped inside the shot */
export function renderFrame(C, t, width = C.W) {
  const n = motionBlurAt(C, t);
  if (n <= 1) return stillFrame(C, t, width);
  const [a, b] = shotRange(C, t); let acc = null, w = 0, h = 0;
  for (let k = 0; k < n; k++) {
    const ts = Math.min(b - 1e-4, Math.max(a, t + (k / (n - 1) - 0.5) * 0.5 / C.fps));
    const img = stillFrame(C, ts, width); w = img.width; h = img.height;
    if (!acc) acc = new Uint32Array(img.pixels.length); const px = img.pixels; for (let i = 0; i < px.length; i++) acc[i] += px[i];
  }
  const out = Buffer.alloc(acc.length); for (let i = 0; i < acc.length; i++) out[i] = Math.round(acc[i] / n);
  return {pixels: out, width: w, height: h};
}
const framePng = (C, t, width = C.W) => { const f = renderFrame(C, t, width); return encodePng(f.pixels, f.width, f.height); };

async function main() {
  if (has('--list')) return console.log(JSON.stringify({poses: Object.keys(POSES), heldProps: Object.keys(HELD), sceneProps: Object.keys(SCENE), sets: Object.keys(SETS),
    actions: ['blink', 'breathe', 'talk', 'chew', 'bob', 'laugh', 'tremble', 'wave', 'walk', 'look', 'jump', 'turn', 'reach'], transitions: TRANSITIONS, eases: ['smooth', 'linear', 'inQuad', 'outQuad', 'inOutQuad', 'inCubic', 'outCubic', 'inOutCubic', 'inSine', 'outSine', 'inOutSine', 'outBack', 'anticipate', 'hold', 'in', 'out', 'inOut', 'back', 'step'], skin: Object.keys(SKIN), hair: Object.keys(HAIR), cloth: Object.keys(CLOTH),
    hairStyles: ['short', 'buzz', 'quiff', 'bob', 'long', 'bun', 'curly', 'spiky', 'bald'], tops: ['tee', 'stripes', 'tank', 'shirt', 'hoodie', 'jacket', 'dress'], bottoms: ['jeans', 'pants', 'shorts', 'skirt'],
    accessories: ['glasses', 'sunglasses', 'beard', 'mustache', 'cap', 'headphones', 'mask'], eyes: ['open', 'wide', 'closed', 'happy', 'tired', 'bored', 'angry'], mouths: ['smile', 'grin', 'open', 'scream', 'O', 'flat', 'sad', 'smirk', 'teeth', 'chew'],
    brows: ['flat', 'up', 'raised', 'worried', 'angry', 'sad'], sfx: 'see whatif-kit/README.md (tick step pop ping whoosh hit sting boing crumble …)', music: ['tender', 'resolve', 'eerie', 'playful', 'tense'], beds: ['room', 'street', 'crowd', 'wind', 'hum', 'rain', 'silence']}, null, 1));
  if (has('--cast')) return castSheet(arg('--cast'), arg('--out', path.join(ROOT, 'build')), arg('--style'));
  const file = process.argv[2]; if (!file || file.startsWith('--')) { console.error('usage: node src/render.mjs scene.json [--stills t,..|--svg t|--layers t|--sheet] [--out dir]'); process.exit(1); }
  const scene = JSON.parse(fs.readFileSync(file, 'utf8')), name = path.basename(file, '.json');
  const OUT = path.resolve(arg('--out', path.join(path.dirname(path.resolve(file)), 'build', name))); fs.mkdirSync(OUT, {recursive: true});
  await ready();
  const C = compile(scene, {style: arg('--style')});
  if (has('--check')) { const problems = [], warnings = [];
    const ACTS = new Set(['blink', 'breathe', 'talk', 'chew', 'bob', 'laugh', 'tremble', 'wave', 'walk', 'look', 'jump', 'turn', 'reach']);
    C.shots.forEach((sh, i) => { if (sh._in && !TRANSITIONS.includes(sh._in.type)) problems.push(`shot ${i}: unknown transition "${sh._in.type}" (${TRANSITIONS.join(' ')})`);
      if (sh._in && i === 0) warnings.push(`shot 0: "in" transition ignored on the first shot`);
      for (const e of sh.sfx || []) if (!SFX_KINDS.has(e.kind)) problems.push(`shot ${i}: unknown sfx kind "${e.kind}" (one-shots only; beds go in meta beds[]). Known: ${[...SFX_KINDS].join(' ')}`);
      for (const a of sh.actors || []) for (const d of a.do || []) { if (!ACTS.has(d.act)) problems.push(`shot ${i} actor ${a.id}: unknown action "${d.act}"`);
        if (d.act === 'walk' && !(d.to > (d.from ?? 0))) problems.push(`shot ${i} actor ${a.id}: walk needs from < to`);
        if (d.act === 'reach' && !Array.isArray(d.target)) problems.push(`shot ${i} actor ${a.id}: reach needs target [x, y] (character-local px)`); }
      for (const s2 of sh.shake || []) if ((s2.amp ?? 6) > 10 || (s2.freq ?? 3) > 4) warnings.push(`shot ${i}: shake amp ${s2.amp ?? 6} / freq ${s2.freq ?? 3} is clamped to amp ≤ 10, freq ≤ 4 Hz`); });
    const TX = textModule(); if (TX?.lintText) { try { for (const w of TX.lintText(C)) warnings.push(`${w.level} ${Number(w.t ?? 0).toFixed(2)}s ${w.msg}`); } catch (e) { warnings.push(`lintText failed: ${e.message}`); } }
    C.shots.forEach((sh, i) => { if (!(sh.end > sh.start)) problems.push(`shot ${i}: end must be after start`); if (i && Math.abs(sh.start - C.shots[i - 1].end) > 1e-6) problems.push(`shot ${i}: starts at ${sh.start}, previous ends at ${C.shots[i - 1].end} (gap/overlap)`);
      for (const t of [sh.start, (sh.start + sh.end) / 2, sh.end - 0.01]) { try { frameSVG(C, t); } catch (e) { problems.push(`shot ${i} @${t.toFixed(2)}s: ${e.message}`); } } });
    if (C.shots[0].start !== 0) problems.push('first shot must start at 0');
    if (warnings.length) console.log('WARNINGS\n- ' + warnings.join('\n- '));
    console.log(problems.length ? 'PROBLEMS\n- ' + problems.join('\n- ') : `OK · ${C.shots.length} shots · ${C.duration}s · style ${C.style} · cast: ${Object.keys(C.cast).join(', ')}`); process.exit(problems.length ? 1 : 0); }
  if (has('--stills')) { fs.mkdirSync(path.join(OUT, 'stills'), {recursive: true}); for (const t of arg('--stills').split(',').map(Number)) fs.writeFileSync(path.join(OUT, 'stills', `t${t.toFixed(2)}.png`), framePng(C, t)); return console.log('stills →', path.join(OUT, 'stills')); }
  if (has('--strip')) {   // 12 consecutive frames side by side, for spotting pops, snaps and jitter
    const cw = 270, chh = Math.round(cw * C.H / C.W), n = 12, cols = 6;
    for (const t0 of arg('--strip').split(',').map(Number)) { const f0 = Math.round(t0 * C.fps), cells = [];
      for (let i = 0; i < n; i++) { const t = (f0 + i) / C.fps; cells.push(el('g', {transform: `translate(${(i % cols) * cw} ${Math.floor(i / cols) * (chh + 30)})`}, el('image', {href: 'data:image/png;base64,' + framePng(C, t, cw).toString('base64'), y: 26, width: cw - 4, height: chh}), text(`f${f0 + i} ${t.toFixed(3)}s`, 6, 20, {'font-family': 'Inter Display', 'font-size': 18, fill: '#C33'}))); }
      const Wd = cols * cw, Hd = Math.ceil(n / cols) * (chh + 30), f = path.join(OUT, `strip-${t0.toFixed(2)}.png`);
      fs.writeFileSync(f, png(el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: Wd, height: Hd}, rect(0, 0, Wd, Hd, '#DDD'), cells), Wd)); console.log('strip →', f); }
    return;
  }
  if (has('--svg')) { const t = Number(arg('--svg')); const f = path.join(OUT, `frame-${t.toFixed(2)}.svg`); fs.writeFileSync(f, frameSVG(C, t)); return console.log('svg →', f); }
  if (has('--layers')) {
    const t = Number(arg('--layers')), dir = path.join(OUT, 'layers', t.toFixed(2)); fs.mkdirSync(dir, {recursive: true});
    for (const only of ['set', 'props', 'actors']) fs.writeFileSync(path.join(dir, `${only}.svg`), frameSVG(C, t, {only}));
    const full = frameSVG(C, t); fs.writeFileSync(path.join(dir, 'composite.svg'), full);
    const names = [...full.matchAll(/data-layer="([^"]+)"/g)].map(m => m[1]);
    fs.writeFileSync(path.join(dir, 'layers.txt'), names.join('\n') + '\n');
    return console.log(`layers → ${dir} (${names.length} named layers)`);
  }
  if (has('--sheet')) {
    const n = Math.ceil(C.duration), cols = 6, cw = 240, ch = Math.round(cw * C.H / C.W), sheet = [];
    for (let i = 0; i < n; i++) sheet.push(el('g', {transform: `translate(${(i % cols) * cw} ${Math.floor(i / cols) * (ch + 30)})`}, el('image', {href: 'data:image/png;base64,' + framePng(C, i + 0.5, cw).toString('base64'), y: 26, width: cw - 4, height: ch}), text(`${(i + 0.5).toFixed(1)}s`, 6, 20, {'font-family': 'Inter Display', 'font-size': 18, fill: '#C33'})));
    const svg = el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: cols * cw, height: Math.ceil(n / cols) * (ch + 30)}, rect(0, 0, cols * cw, Math.ceil(n / cols) * (ch + 30), '#DDD'), sheet);
    fs.writeFileSync(path.join(OUT, 'sheet.png'), png(svg, cols * cw)); return console.log('sheet →', path.join(OUT, 'sheet.png'));
  }
  // video
  const video = path.join(OUT, 'video.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${C.W}x${C.H}`, '-framerate', String(C.fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', video], {stdio: ['pipe', 'inherit', 'inherit']});
  const total = Math.round(C.duration * C.fps), t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const img = renderFrame(C, f / C.fps);
    if (!ff.stdin.write(Buffer.from(img.pixels))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 48 === 0) process.stdout.write(`\rframe ${f}/${total}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(`\rframes ${total} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const final = path.join(OUT, `${name}.mp4`);
  if (has('--silent')) { fs.renameSync(video, final); return console.log('video →', final); }
  fs.mkdirSync(path.join(OUT, 'build'), {recursive: true});
  fs.writeFileSync(path.join(OUT, 'build', 'events.json'), JSON.stringify(soundEvents(C), null, 1));
  execFileSync(PY, ['-I', path.join(KIT, 'sfx.py'), OUT], {stdio: 'inherit'});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', path.join(OUT, 'build', 'mix.wav'), '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
  console.log('video →', final);
}

/** character sheet: each cast member in a row of expressions, then a row of poses */
function castSheet(file, outDir, style) {
  const cast = JSON.parse(fs.readFileSync(file, 'utf8')); fs.mkdirSync(outDir, {recursive: true});
  const exprs = [['neutral', {}], ['smile', {mouth: 'smile'}], ['grin', {mouth: 'grin', eyes: 'happy'}], ['shock', {mouth: 'scream', eyes: 'wide', brows: 'up'}], ['worried', {mouth: 'sad', brows: 'worried', look: [-0.6, 0.2]}], ['angry', {mouth: 'teeth', brows: 'angry', eyes: 'angry'}], ['bored', {mouth: 'flat', eyes: 'tired'}], ['side', {mouth: 'smirk', turn: 0.7, look: [1, 0]}]];
  const poses = ['stand', 'wave', 'point', 'shrug', 'think', 'scared', 'phone', 'sit', 'sitEat'];
  const cell = 300, rows = [];
  let y = 0;
  for (const [id, def] of Object.entries(cast)) {
    const C = defineCharacter({id, ...def, ...(style ? {style} : {})});
    rows.push(text(id, 20, y + 46, {'font-family': 'Inter Display', 'font-weight': 900, 'font-size': 40, fill: '#FFFFFF'}));
    exprs.forEach(([nm, f], i) => { const ch = buildCharacter(C, {...POSES.stand, face: f}, {shadow: false}); const cid = `cl${id}${i}`;
      rows.push(el('clipPath', {id: cid}, rect(i * cell + 6, y + 64, cell - 12, 300)), el('g', {'clip-path': `url(#${cid})`}, rect(i * cell + 6, y + 64, cell - 12, 300, '#34353A'), el('g', {transform: `translate(${i * cell + cell / 2} ${y + 90 + ch.height * 0.92}) scale(0.92)`}, ch.svg)),
        text(nm, i * cell + cell / 2, y + 390, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 700, 'font-size': 24, fill: '#BBB'})); });
    y += 420;
    poses.forEach((p, i) => { const ch = buildCharacter(C, {...POSES[p]}, {hold: p === 'phone' ? {R: 'phone'} : p === 'sitEat' ? {R: 'popcorn'} : {}});
      rows.push(el('g', {transform: `translate(${i * cell * 0.9 + 140} ${y + 900}) scale(0.88)`}, ch.svg), text(p, i * cell * 0.9 + 140, y + 940, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 700, 'font-size': 24, fill: '#BBB'})); });
    y += 980;
  }
  const W = cell * 8, svg = el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: W, height: y, viewBox: `0 0 ${W} ${y}`}, rect(0, 0, W, y, '#2A2B2E'), rows);
  const f = path.join(outDir, 'cast-sheet.png'); fs.writeFileSync(f, png(svg, 1600)); fs.writeFileSync(path.join(outDir, 'cast-sheet.svg'), svg); console.log('cast sheet →', f);
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main().catch(e => { console.error(e); process.exit(1); });  // only when run directly
