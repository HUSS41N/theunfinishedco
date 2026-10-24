// Dev tool (Node only): reads advance widths for printable ASCII + a few symbols from fonts/*.ttf and prints a JS table
// for src/text.mjs (which must run in the browser too, so it cannot read fonts itself). Re-run if fonts change.
import fs from 'node:fs';
const FILES = {display: 'InterDisplay-Black.ttf', displayBold: 'InterDisplay-ExtraBold.ttf', serif: 'InstrumentSerif-Italic.ttf', mono: 'JetBrainsMono-SemiBold.ttf', sans: 'Inter-SemiBold.ttf'};
const CHARS = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('') + '…’“”—–•×€£₹°';
function metrics(file) {
  const b = fs.readFileSync(new URL('../fonts/' + file, import.meta.url)), u16 = o => b.readUInt16BE(o), i16 = o => b.readInt16BE(o), u32 = o => b.readUInt32BE(o);
  const n = u16(4), T = {}; for (let i = 0; i < n; i++) { const o = 12 + i * 16; T[b.toString('ascii', o, o + 4)] = u32(o + 8); }
  const upm = u16(T.head + 18), nh = u16(T.hhea + 34);
  const adv = g => u16(T.hmtx + 4 * Math.min(g, nh - 1));
  // cmap: find format 4 (BMP) subtable
  const cn = u16(T.cmap + 2); let sub = null;
  for (let i = 0; i < cn; i++) { const o = T.cmap + 4 + i * 8, off = T.cmap + u32(o + 4); if (u16(off) === 4) { sub = off; break; } }
  const seg = u16(sub + 6) / 2, ends = sub + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
  const glyph = c => { for (let i = 0; i < seg; i++) { const e = u16(ends + i * 2); if (c > e) continue; const s = u16(starts + i * 2); if (c < s) return 0; const d = i16(deltas + i * 2), r = u16(ranges + i * 2);
    if (!r) return (c + d) & 0xffff; const gi = u16(ranges + i * 2 + r + (c - s) * 2); return gi ? (gi + d) & 0xffff : 0; } return 0; };
  return [...CHARS].map(ch => Math.round(adv(glyph(ch.codePointAt(0))) / upm * 1000));
}
const out = {}; for (const [k, f] of Object.entries(FILES)) out[k] = metrics(f);
console.log('const GLYPHS = ' + JSON.stringify(CHARS) + ';');
console.log('const ADV = ' + JSON.stringify(out) + ';');
