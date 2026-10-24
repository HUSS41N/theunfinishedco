// Lints every example and series2 scene with src/text.mjs and renders each shot's text once (smoke test). Owner: text.
import fs from 'node:fs';
import {compile} from '../src/scene.mjs';
import {lintText, screenText, bubbleLayer} from '../src/text.mjs';
const files = [...fs.readdirSync('examples').filter(f => f.endsWith('.json') && !f.startsWith('cast')).map(f => 'examples/' + f),
  ...fs.readdirSync('series2').map(d => `series2/${d}/scene.json`).filter(f => fs.existsSync(f))];
let n = 0;
for (const f of files) { const C = compile(JSON.parse(fs.readFileSync(f, 'utf8'))), w = lintText(C); n += w.length;
  for (const s of C.shots) for (const t of [0.05, (s.end - s.start) / 2]) { screenText(s, t, C); bubbleLayer(s, t, C, []); }
  console.log(`${f}: ${w.filter(x => x.level === 'warn').length} warn, ${w.filter(x => x.level === 'info').length} info`);
  if (process.argv.includes('-v')) for (const x of w) console.log(`   ${x.level} ${x.t.toFixed(2)}s ${x.msg}`); }
console.log(`${files.length} scenes, ${n} findings`);
