// tokens.json → css/tokens.css (custom properties + @font-face) and js/tokens.js (ES module). Prints contrast vs stage.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8'));
const lum = hex => { const m = hex.match(/^#([0-9a-f]{6})$/i); if (!m) return null; const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const out = ['/* What If — generated from tokens.json by tools/build-tokens.mjs. Do not edit by hand. */'];
const fam = {display: 'InterTight', ui: 'Inter6', text: 'Inter4', accent: 'WIAccentSerif', mono: 'WIMono'};
for (const [k, f] of Object.entries(T.font)) if (f.file) out.push(`@font-face { font-family: "${fam[k]}"; src: url("../${f.file}") format("truetype"); font-weight: ${f.weight}; font-style: ${f.style || 'normal'}; font-display: swap; }`);
out.push('@font-face { font-family: "Inter Display"; src: url("../assets/fonts/InterDisplay-Black.ttf") format("truetype"); font-weight: 900; font-display: swap; }');
out.push('@font-face { font-family: "Inter Display"; src: url("../assets/fonts/InterDisplay-ExtraBold.ttf") format("truetype"); font-weight: 800; font-display: swap; }');
out.push('@font-face { font-family: "Inter Display"; src: url("../assets/fonts/InterDisplay-Bold.ttf") format("truetype"); font-weight: 700; font-display: swap; }');
// the engine's SVG text names these four families (whatif-flat/src/text.mjs FONTS): Inter Display 700-900, Instrument Serif italic, JetBrains Mono 600, Inter 400/600
out.push('@font-face { font-family: "Instrument Serif"; src: url("../assets/fonts/InstrumentSerif-Italic.ttf") format("truetype"); font-style: italic; font-display: swap; }');
out.push('@font-face { font-family: "JetBrains Mono"; src: url("../assets/fonts/JetBrainsMono-SemiBold.ttf") format("truetype"); font-weight: 600; font-display: swap; }');
out.push('@font-face { font-family: "Inter"; src: url("../assets/fonts/Inter-SemiBold.ttf") format("truetype"); font-weight: 600; font-display: swap; }');
out.push('@font-face { font-family: "Inter"; src: url("../assets/fonts/Inter-Regular.ttf") format("truetype"); font-weight: 400; font-display: swap; }');
out.push(':root {');
for (const [k, t] of Object.entries(T.color)) out.push(`  --wi-${k}: ${t.value};`);
for (const [k, t] of Object.entries(T.accent)) out.push(`  --wi-accent-${k}: ${t.value};`);
for (const [k, t] of Object.entries(T.font)) out.push(`  --wi-font-${k}: ${t.value};`);
for (const [k, t] of Object.entries(T.space)) out.push(`  --wi-space-${k}: ${t.value};`);
for (const [k, t] of Object.entries(T.radius)) out.push(`  --wi-radius-${k}: ${t.value};`);
for (const [k, t] of Object.entries(T.motion)) if (/ms$|^cubic/.test(t.value)) out.push(`  --wi-${k === 'ease' || k === 'ease-pop' ? k : 'dur-' + k}: ${t.value};`);
for (const [k, t] of Object.entries(T.type)) if (k.startsWith('web-')) out.push(`  --wi-${k}: ${t.size}px;`);
out.push('}');
fs.writeFileSync(path.join(ROOT, 'css/tokens.css'), out.join('\n') + '\n');
fs.writeFileSync(path.join(ROOT, 'js/tokens.js'), '// generated from tokens.json by tools/build-tokens.mjs\nexport default ' + JSON.stringify(T, null, 1) + ';\n');
console.log('css/tokens.css + js/tokens.js written');
for (const [k, t] of [...Object.entries(T.color), ...Object.entries(T.accent).map(([k, v]) => ['accent-' + k, v])]) { const r = lum(t.value) === null ? null : ratio(t.value, T.color.stage.value); if (r) console.log(k.padEnd(18), r.toFixed(2) + ':1'); }
