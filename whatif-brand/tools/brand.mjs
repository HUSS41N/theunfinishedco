// theunfinishedco brand assets: the mark (a stickman head whose outline is still being drawn), the avatar,
// the lockup and the YouTube channel banner. Vector first (SVG), rasterized with the whatif-flat engine's resvg setup.
//   node tools/brand.mjs            → assets/brand/*
import fs from 'node:fs';
import path from 'node:path';
import {rasterize} from '../../whatif-flat/src/render.mjs';
import {defineCharacter, buildCharacter} from '../../whatif-flat/src/character.mjs';
import {resolvePose} from '../../whatif-flat/src/scene.mjs';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '../assets/brand');
fs.mkdirSync(OUT, {recursive: true});
const INK = '#1E1E22', RED = '#E5322D', CREAM = '#F6F1E8', PAPER = '#FFFFFF', MUTED = '#6B6660';
const f = n => +n.toFixed(2);
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];

/** the mark in a 512 box: an ink head-circle drawn clockwise from 310° round to 260°; a red pencil at the open end is
 *  still drawing it; a faint dashed guide shows the rest; dot eyes and a smile inside. ink/paper colours swap for dark. */
function mark({ink = INK, paper = PAPER, guide = '#C9C2B8', accent = RED, face = true} = {}) {
  const cx = 256, cy = 268, r = 172, w = 34, a0 = 318, a1 = 262;          // stroke runs a0 → (clockwise) → a1 (= a0 + 304°)
  const [sx, sy] = pt(cx, cy, r, a0), [ex, ey] = pt(cx, cy, r, a1);
  const arc = `M${f(sx)} ${f(sy)} A${r} ${r} 0 1 1 ${f(ex)} ${f(ey)}`;     // large arc, clockwise (sweep 1)
  const [gx, gy] = pt(cx, cy, r, a1 + 9), [hx, hy] = pt(cx, cy, r, a0 - 7);
  const gap = `M${f(gx)} ${f(gy)} A${r} ${r} 0 0 1 ${f(hx)} ${f(hy)}`;     // the unfinished part
  // pencil: tip on the stroke end, pointing along the drawing direction (the clockwise tangent at a1 is a1 + 90°)
  const dir = a1 + 90, L = 150, W = 40;
  const pencil = `<g transform="translate(${f(ex)} ${f(ey)}) rotate(${f(dir + 180)})">
    <path d="M0 0 L${W * 0.9} ${-W / 2} L${W * 0.9} ${W / 2}Z" fill="#F2D7A6" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M0 0 L${W * 0.32} ${-W * 0.18} L${W * 0.32} ${W * 0.18}Z" fill="${ink}"/>
    <rect x="${W * 0.9}" y="${-W / 2}" width="${L - W * 0.9 - 26}" height="${W}" fill="${accent}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
    <line x1="${W * 0.9 + 6}" y1="0" x2="${L - 30}" y2="0" stroke="#B42722" stroke-width="5" stroke-linecap="round"/>
    <rect x="${L - 26}" y="${-W / 2}" width="26" height="${W}" rx="9" fill="#F4A3B0" stroke="${ink}" stroke-width="7"/>
  </g>`;
  const faceSvg = face ? `<ellipse cx="208" cy="250" rx="17" ry="24" fill="${ink}"/><ellipse cx="304" cy="250" rx="17" ry="24" fill="${ink}"/>
    <path d="M206 318 Q256 362 306 318" fill="none" stroke="${ink}" stroke-width="15" stroke-linecap="round"/>` : '';
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${paper}"/>
  <path d="${gap}" fill="none" stroke="${guide}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 26"/>
  <path d="${arc}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>
  ${faceSvg}${pencil}`;
}
const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;
/** wordmark: the + unfinished (Instrument Serif italic, accent) + co, as one text line with tspans */
export const word = (x, y, size, {ink = INK, accent = INK, anchor = 'start'} = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter Display" font-weight="800" font-size="${size}" letter-spacing="${-size * 0.035}" fill="${ink}">the<tspan font-family="Instrument Serif" font-style="italic" font-weight="400" font-size="${size * 1.14}" letter-spacing="${-size * 0.01}" fill="${accent}">unf&#8204;inished</tspan>co</text>`;

const write = (name, s, width) => { fs.writeFileSync(path.join(OUT, name + '.svg'), s); fs.writeFileSync(path.join(OUT, name + '.png'), rasterize(s, width).asPng()); };

// 1. the mark (transparent) + a dark-background version
write('theunfinishedco-mark', svg(512, 512, mark()), 1024);
write('theunfinishedco-mark-dark', svg(512, 512, mark({ink: '#F3F1EC', paper: '#232427', guide: '#55565C'})), 1024);
// 2. avatar: cream disc friendly to circle crops (YouTube/Instagram), mark centred inside the crop
write('theunfinishedco-avatar', svg(800, 800, `<circle cx="400" cy="400" r="400" fill="${CREAM}"/><g transform="translate(400 410) scale(1.18) translate(-256 -268)">${mark()}</g>`, CREAM), 800);
// 3. lockup (horizontal) on transparent and on cream
const lockup = (bg, ink, accent, paper) => svg(1600, 520, `<g transform="translate(20 4)">${mark({ink, paper})}</g>${word(560, 318, 140, {ink, accent})}
  <text x="566" y="404" font-family="JetBrains Mono" font-weight="600" font-size="34" letter-spacing="7" fill="${ink === INK ? MUTED : '#B4B1AA'}">STORIES STILL BEING DRAWN</text>`, bg);
write('theunfinishedco-lockup', lockup(null, INK, RED, PAPER), 1600);
write('theunfinishedco-lockup-dark', lockup('#232427', '#F3F1EC', '#FF6B4A', '#232427'), 1600);

// 4. YouTube channel banner 2560×1440. TV shows all of it; desktop crops to 2560×423 (y 508–931); phones and every
//    device see the 1546×423 safe area (x 507–2053, y 508–931). Everything that matters sits in the safe area; the
//    stick cast stands outside it at both sides, on a soft ground line, in the channel's v1 stick style.
const cast = {
  a: defineCharacter({id: 'a', style: 'stick', top: {style: 'tee', color: 'yellow'}, bottom: {style: 'jeans', color: 'denim'}, accessories: [{type: 'cap', color: 'red'}]}),
  b: defineCharacter({id: 'b', style: 'stick', hair: {style: 'ponytail'}, top: {style: 'dress', color: 'coral'}, bow: 'red'}),
  c: defineCharacter({id: 'c', style: 'stick', top: {style: 'hoodie', color: 'teal'}, bottom: {style: 'pants', color: 'charcoal'}, accessories: ['glasses']}),
  d: defineCharacter({id: 'd', style: 'stick', hair: {style: 'bun'}, top: {style: 'shirt', color: 'blue'}, bottom: {style: 'skirt', color: 'mustard'}, bow: 'pink'}),
  e: defineCharacter({id: 'e', style: 'stick', top: {style: 'apron', color: 'green', detail: 'white'}, bottom: {style: 'pants', color: 'navy'}}),
  k: defineCharacter({id: 'k', style: 'stick', build: {height: 0.7}, top: {style: 'stripes', color: 'blue', detail: 'white'}, bottom: {style: 'shorts', color: 'red'}}),
};
const actor = (id, pose, x, y, s, facing = 1, face = {}) => {
  const p = resolvePose(pose); p.face = {...(p.face || {}), ...face};
  return `<g transform="translate(${x} ${y})">${buildCharacter(cast[id], p, {scale: s, facing, shadow: false}).svg}</g>`;
};
const G = 1180;   // ground line (below the safe area: TV only, decoration)
const banner = svg(2560, 1440, `
  <defs><radialGradient id="glow" cx="1280" cy="720" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>
  <rect width="2560" height="1440" fill="${CREAM}"/><rect width="2560" height="1440" fill="url(#glow)"/>
  ${[[180, 260, 70], [420, 180, 46], [2140, 230, 64], [2380, 330, 44], [1180, 140, 36]].map(([x, y, r]) => `<g fill="#FFFFFF" stroke="${INK}" stroke-width="5"><ellipse cx="${x}" cy="${y}" rx="${r * 1.6}" ry="${r * 0.7}"/></g>`).join('')}
  <path d="M0 ${G} C640 ${G - 6} 1920 ${G + 6} 2560 ${G}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <rect x="0" y="${G + 3}" width="2560" height="${1440 - G}" fill="#EDE4D6"/>
  ${actor('a', 'wave', 120, G, 0.56, 1, {mouth: 'grin'})}
  ${actor('k', 'cheer', 300, G, 0.56, 1, {mouth: 'open', eyes: 'happy'})}
  ${actor('b', 'think', 2170, G, 0.56, -1, {look: [0.5, -0.6]})}
  ${actor('c', 'wave', 2330, G, 0.56, -1, {mouth: 'grin'})}
  ${actor('d', 'shrug', 2480, G, 0.56, -1, {mouth: 'smirk'})}
  <g transform="translate(540 468) scale(0.8)">${mark()}</g>
  ${word(1000, 742, 145, {accent: RED})}
  <text x="1006" y="826" font-family="JetBrains Mono" font-weight="600" font-size="32" letter-spacing="6" fill="${MUTED}">SILENT STORIES · STRANGE POSSIBILITIES</text>
`, null);
write('youtube-banner-2560x1440', banner, 2560);
// a safe-area check copy (not for upload): the 1546×423 all-device box and the desktop band
write('youtube-banner-safe-check', banner.replace('</svg>', `<rect x="507" y="508" width="1546" height="423" fill="none" stroke="#1F6FEB" stroke-width="6" stroke-dasharray="24 14"/><rect x="0" y="508" width="2560" height="423" fill="none" stroke="#2E9E5B" stroke-width="4" stroke-dasharray="8 10"/></svg>`), 1280);
console.log(fs.readdirSync(OUT).join('\n'));
