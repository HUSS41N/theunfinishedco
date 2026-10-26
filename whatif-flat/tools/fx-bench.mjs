#!/usr/bin/env node
// Render-speed bench (owner: world). Times renderFrame over N consecutive frames of a scene, no encoding.
//   node tools/fx-bench.mjs scene.json [t0=0] [frames=48] [--style flat|stick]
import fs from 'node:fs';
import {compile} from '../src/scene.mjs';
import {renderFrame} from '../src/render.mjs';
const [file, t0 = '0', n = '48'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const C = compile(JSON.parse(fs.readFileSync(file, 'utf8')));
renderFrame(C, +t0);   // warm-up
const s = performance.now();
for (let i = 0; i < +n; i++) renderFrame(C, +t0 + i / C.fps);
const ms = (performance.now() - s) / +n;
console.log(`${file}: ${C.W}x${C.H} · ${ms.toFixed(1)} ms/frame · ${(1000 / ms).toFixed(1)} fps`);
