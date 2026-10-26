// World props (owner: world). Flat vector objects drawn at REAL SCALE for an actor at scale 1
// (≈ 800 px ≈ 1.7 m tall, so 1 m ≈ 470 px — docs/V3-CONTRACT.md §4, docs/WORLD.md has the table).
// Every prop renders in both styles from one drawing: in the stick style (svg.mjs withStyle) solid shapes get an ink
// outline and palette lookups (P / col) switch to the soft warm stick palette. Shading shapes pass {ink:false}.
// HELD props attach to a hand (drawn at the wrist, rotated with the forearm). SCENE props stand in the set.
// Origins: scene props stand on their origin (bottom centre) unless noted (clock, frame: centre; lantern, pendant: hang point).
import {layer, g, path, circle, ellipse, rect, poly, stroke, rod, line, blob, rrect, tr, text, el,
  withStyle, isStick, getStyleMode, inkW, GUARD, mixHex, darken, lighten, desat, tones, isHex, INK, lin, id} from './svg.mjs';
import {devanagari} from './devanagari.mjs';

export const M = 470;   // px per metre at actor scale 1

// ---------- palettes ----------
export const WORLD = {
  flat: {
    ink: INK, night: '#2A2B2E', wall: '#E9E2D6', wallLow: '#DCD2C2', ceiling: '#F3EEE6', floor: '#B98E62', floorLine: '#A47C55', skirting: '#F6F2EA', trim: '#F6F2EA',
    wood: '#9C6B44', woodLight: '#C49A6C', woodDark: '#6E4A30', metal: '#3A3A40', metalLight: '#8C8C94', chrome: '#C9CDD2',
    glass: '#9FCBE6', glassNight: '#23304F', sky: '#8FCBEA', skyTop: '#5A8FD0', cloud: '#FFFFFF', sun: '#FFF2B3', moon: '#F7E7C9',
    grass: '#69A84F', grassDark: '#558F3F', leaf: '#4F9A4A', leafDark: '#3E7E3B', leafLight: '#79B65E', trunk: '#7A5232', pot: '#C9663A',
    fabric: '#2D8C8C', sheet: '#DCE6F0', pillow: '#FFFFFF', paper: '#FFFDF4', screen: '#BFE3F7', screenDark: '#26262B', bezel: '#26262B',
    shade: '#F5C33B', bulb: '#FFE9A8', accent: '#E2453C', accent2: '#F5C33B', accent3: '#3E6FB8',
    brick: '#B5462E', plaster: '#D9CBB5', road: '#55575E', pavement: '#B9B4AE', curb: '#8C8780', paint: '#F2F0EC', stone: '#9AA6B2', water: '#7FC4E8',
    seat: '#B83A35', counter: '#ECE8E1', cabinet: '#7E9C8E', fridge: '#E3E6E9', chalk: '#26322A', board: '#F7F7F4', curtain: '#C9663A', rug: '#C27A62',
    books: ['#D8433A', '#3E6FB8', '#F5C33B', '#2D8C8C', '#7A56B8', '#5E8F3A', '#E8E2D6'],
  },
  stick: {   // the reference look: warm cream walls, pale wood, muted sage, dusty red — light, so black stick figures pop
    ink: INK, night: '#5E5A66', wall: '#F3E7D3', wallLow: '#EADABF', ceiling: '#F8F1E5', floor: '#E6CDA8', floorLine: '#C7A57F', skirting: '#DCC29E', trim: '#FBF6EC',
    wood: '#D2AA7E', woodLight: '#E4C7A0', woodDark: '#AE845D', metal: '#8F8A84', metalLight: '#C2BDB5', chrome: '#DEDAD3',
    glass: '#DDEDF0', glassNight: '#68719A', sky: '#DCEBEE', skyTop: '#C9E1E9', cloud: '#FFFFFF', sun: '#FBE7A6', moon: '#FBF1D8',
    grass: '#BDCF9C', grassDark: '#A6BD86', leaf: '#86AE6E', leafDark: '#6F9A5A', leafLight: '#A3C487', trunk: '#AE8866', pot: '#C98060',
    fabric: '#B9B0A3', sheet: '#F2EDE4', pillow: '#FFFFFF', paper: '#FFFCF4', screen: '#DFEBF0', screenDark: '#5A5551', bezel: '#4E4945',
    shade: '#F2DCAE', bulb: '#FFF2CC', accent: '#D24B3C', accent2: '#E7B65A', accent3: '#7E9CB8',
    brick: '#CF957A', plaster: '#EEDFC7', road: '#B3ADA6', pavement: '#E2DACE', curb: '#CBC1B4', paint: '#FFFFFF', stone: '#CDC7BE', water: '#C3E0E8',
    seat: '#C46A5E', counter: '#F4EEE4', cabinet: '#B7C6AF', fridge: '#F2F1EC', chalk: '#647A69', board: '#FDFBF6', curtain: '#DDA286', rug: '#D9897A',
    books: ['#D07A68', '#8FA9C2', '#E8C878', '#9DB89A', '#B9A0C4', '#E2D6C2', '#C9A27E'],
  },
};
/** palette lookup in the active style */
export const P = k => (WORLD[getStyleMode()] || WORLD.flat)[k] ?? WORLD.flat[k] ?? k;
const NAMED = {green: '#5E8F3A', olive: '#6E7F3C', red: '#D8433A', coral: '#F06A5C', pink: '#F2829A', yellow: '#F5C33B', mustard: '#D9A23A',
  blue: '#3E6FB8', navy: '#2C3E66', denim: '#33507F', teal: '#2D8C8C', purple: '#7A56B8', grey: '#8C8C94', charcoal: '#3A3A40',
  white: '#F2F0EC', black: '#232327', brown: '#7A5232', tan: '#C49A6C'};
/** stick look: pull a colour toward warm paper and take some saturation out (accents use a lighter touch) */
export const soften = (c, k = 0.32) => isHex(c) ? mixHex(desat(c, k * 0.9), '#F4EBDC', k) : c;
/** resolve a user colour (name or hex) or fall back to palette key `k`; user colours are softened in the stick style */
export function col(v, k, accent = false) { if (!v) return P(k); const c = NAMED[v] || WORLD[getStyleMode()]?.[v] || v; return isStick() && !WORLD.stick[v] ? soften(c, accent ? 0.15 : 0.32) : c; }
const T = c => tones(c);
const NI = {ink: false};             // no outline (shading, highlights)
/** stick style: re-draw a shape's outline on top (after shading shapes that cover its edge) */
export const inkOver = (d, k = 1) => isStick() ? path(d, 'none', {stroke: P('ink'), 'stroke-width': inkW(k), 'stroke-linejoin': 'round'}) : '';
const THIN = {ink: 'thin'};
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
/** a union of circles/ellipses with ONE outer ink outline in the stick style (foliage, clouds, bushes) */
export function cluster(parts, fill, shadeParts = [], shadeFill = null) {
  const shapes = (f, a) => parts.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry ?? rx, f, a));
  const casing = isStick() ? parts.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry ?? rx, P('ink'), {ink: false, stroke: P('ink'), 'stroke-width': inkW(2), 'stroke-linejoin': 'round'})) : [];
  return g({}, ...casing, ...shapes(fill, NI), ...shadeParts.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry ?? rx, shadeFill || darken(fill, 0.12), NI)));
}

// ---------- held props (small; drawn at the grip point) ----------
const POP = '#FFF6D8', POPS = '#F2D88A';
const popcornBits = (cx, cy, w, n = 9) => Array.from({length: n}, (_, i) => { const a = i * 2.39, r = (i % 3) * 0.18 + 0.2; return circle(cx + Math.cos(a) * w * r, cy + Math.sin(a) * w * 0.12 - (i % 4) * 6, w * 0.16, i % 3 ? POP : POPS, THIN); });
const font = (size, weight = 800, extra = {}) => ({'font-family': 'Inter Display', 'font-weight': weight, 'font-size': size, 'text-anchor': 'middle', ...extra});
const wrapLines = (s, max = 18) => { const out = [], words = String(s).split(' '); let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; };

export const HELD = {
  popcorn: (s = 1) => { const w = 110 * s, h = 120 * s, red = '#E2453C', y = '#F7D24A', b = 0.76;   // no clip groups (resvg-safe, cheap): stripes are pre-cut slices of the tub
    const tub = `M${-w / 2} ${-h} L${w / 2} ${-h} L${w * 0.38} 0 L${-w * 0.38} 0Z`, slice = (x1, x2, f, a = NI) => poly([[x1, -h], [x2, -h], [x2 * b, 0], [x1 * b, 0]], f, a);
    return g({}, ...popcornBits(0, -h - 6, w), path(tub, y), ...[-0.42, -0.14, 0.14, 0.42].map(k => slice(Math.max(-w / 2, w * k - w * 0.07), Math.min(w / 2, w * k + w * 0.07), red)), slice(w * 0.2, w / 2, '#000', {ink: false, 'fill-opacity': 0.12}), isStick() ? path(tub, 'none', {stroke: P('ink'), 'stroke-width': inkW(), 'stroke-linejoin': 'round'}) : '',
      circle(0, -h * 0.5, w * 0.18, '#FFFFFF', THIN), circle(0, -h * 0.5, w * 0.1, y, NI)); },
  soda: (s = 1) => { const w = 64 * s, h = 120 * s, c = '#2E62B8'; const cup = `M${-w / 2} ${-h} L${w / 2} ${-h} L${w * 0.4} 0 L${-w * 0.4} 0Z`;
    return g({}, rod([[w * 0.1, -h - 6], [w * 0.22, -h - 58 * s]], '#F2F0EC', 8 * s, THIN), rect(-w * 0.56, -h - 12 * s, w * 1.12, 16 * s, '#F2F0EC', {rx: 6}), path(cup, c),
      poly([[w * 0.12, -h], [w / 2, -h], [w * 0.4, 0], [w * 0.1, 0]], '#1E4A93', NI), circle(0, -h * 0.5, w * 0.3, '#FFFFFF', NI), path(`M${-w * 0.3} ${-h * 0.5} Q0 ${-h * 0.3} ${w * 0.3} ${-h * 0.5}`, '#E2453C', NI), isStick() ? path(cup, 'none', {stroke: P('ink'), 'stroke-width': inkW(), 'stroke-linejoin': 'round'}) : ''); },
  // a phone ≈ 15 cm tall
  phone: (s = 1) => g({}, path(rrect(-21 * s, -78 * s, 42 * s, 82 * s, 8 * s), '#1F1F24'), path(rrect(-17 * s, -73 * s, 34 * s, 70 * s, 5 * s), '#BFE3F7', NI), rect(-17 * s, -73 * s, 15 * s, 70 * s, '#DDF0FA', NI)),
  coffee: (s = 1) => g({}, path(`M${-30 * s} ${-70 * s} L${30 * s} ${-70 * s} L${24 * s} 0 L${-24 * s} 0Z`, '#F2F0EC'), rect(-32 * s, -80 * s, 64 * s, 14 * s, '#7A5232', {rx: 5}), rect(-28 * s, -48 * s, 56 * s, 22 * s, '#C49A6C', NI)),
  book: (s = 1) => g({}, path(rrect(-46 * s, -96 * s, 92 * s, 100 * s, 6 * s), '#D8433A'), rect(-46 * s, -96 * s, 12 * s, 100 * s, '#A8302A', NI), rect(-26 * s, -76 * s, 56 * s, 10 * s, '#F7E7C9', NI)),
  glasses3d: (s = 1) => g({}, path(rrect(-60 * s, -26 * s, 120 * s, 30 * s, 8 * s), '#F2F0EC'), rect(-52 * s, -20 * s, 46 * s, 18 * s, '#E2453C', {rx: 5, ink: false}), rect(6 * s, -20 * s, 46 * s, 18 * s, '#3FA4E8', {rx: 5, ink: false})),
  bottle: (s = 1) => g({}, path(rrect(-22 * s, -110 * s, 44 * s, 110 * s, 12 * s), '#8ECBEB'), rect(-10 * s, -126 * s, 20 * s, 18 * s, '#2E62B8', {rx: 4}), rect(-22 * s, -70 * s, 44 * s, 30 * s, '#2E62B8', NI), rect(6 * s, -104 * s, 8 * s, 90 * s, '#D2ECF8', NI)),
  sign: (s = 1, label = '?') => g({}, rod([[0, 0], [0, -150 * s]], '#7A5232', 12 * s, THIN), path(rrect(-90 * s, -250 * s, 180 * s, 110 * s, 12 * s), '#F7E7C9'), rect(40 * s, -250 * s, 50 * s, 110 * s, '#E6D2AC', {ink: false, rx: 10}), text(label, 0, -182 * s, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 900, 'font-size': 48 * s, fill: '#1E1E22'})),
  flag: (s = 1) => g({}, rod([[0, 0], [0, -180 * s]], '#7A5232', 8 * s, THIN), path(`M0 ${-180 * s} L${110 * s} ${-150 * s} L0 ${-118 * s}Z`, '#F5C33B'), circle(40 * s, -150 * s, 12 * s, '#F2F0EC', NI)),
  balloon: (s = 1) => g({}, stroke([[0, 0], [10 * s, -160 * s]], isStick() ? P('ink') : '#F2F0EC', 3 * s), ellipse(10 * s, -230 * s, 58 * s, 70 * s, '#E2453C'), ellipse(-8 * s, -250 * s, 14 * s, 22 * s, '#F09A92', NI)),
  money: (s = 1) => g({}, path(rrect(-60 * s, -40 * s, 120 * s, 64 * s, 6 * s), '#5FA65A'), rect(-60 * s, -40 * s, 120 * s, 12 * s, '#4A8A47', NI), circle(0, -8 * s, 16 * s, '#DDF0D3', NI), text('$', 0, 2 * s, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 900, 'font-size': 26 * s, fill: '#4A8A47'})),
  remote: (s = 1) => g({}, path(rrect(-26 * s, -120 * s, 52 * s, 124 * s, 14 * s), '#2B2B30'), circle(0, -88 * s, 15 * s, '#F5C33B', NI), rect(-6 * s, -95 * s, 4 * s, 14 * s, '#2B2B30', NI), rect(2 * s, -95 * s, 4 * s, 14 * s, '#2B2B30', NI), ...[-50, -28].map(y => g({}, circle(-10 * s, y * s, 6 * s, '#55555C', NI), circle(10 * s, y * s, 6 * s, '#55555C', NI)))),
  cane: (s = 1) => g({}, rod([[0, -10], [0, 260 * s]], '#7A5232', 12 * s, THIN), path(`M0 ${-10} Q0 ${-50 * s} ${-36 * s} ${-46 * s}`, 'none', {stroke: '#7A5232', 'stroke-width': 12 * s, 'stroke-linecap': 'round'})),
  drawing: (s = 1, label = 'ME') => g({}, path(rrect(-80 * s, -150 * s, 160 * s, 150 * s, 6 * s), '#FFFDF4'), path(`M0 ${-128 * s} L${22 * s} ${-80 * s} L${16 * s} ${-36 * s} L${-16 * s} ${-36 * s} L${-22 * s} ${-80 * s}Z`, 'none', {stroke: '#E2453C', 'stroke-width': 5 * s, 'stroke-linejoin': 'round'}), circle(0, -82 * s, 8 * s, 'none', {stroke: '#3F6FD8', 'stroke-width': 4 * s}), stroke([[-12 * s, -34 * s], [-20 * s, -14 * s]], '#F5C33B', 5 * s), stroke([[12 * s, -34 * s], [20 * s, -14 * s]], '#F5C33B', 5 * s), text(label, 48 * s, -112 * s, font(26 * s, 800, {fill: '#3F6FD8'}))),
  note: (s = 1, label = '') => { const ls = wrapLines(label, 12); return g({}, path(rrect(-90 * s, -40 * s - ls.length * 44 * s, 180 * s, ls.length * 44 * s + 50 * s, 6 * s), '#FFFDF4'), ...ls.map((l, i) => text(l, 0, -18 * s - (ls.length - 1 - i) * 44 * s, font(34 * s, 700, {fill: '#1E1E22', 'font-family': 'Comic Neue, Inter Display'})))); },
  plate: (s = 1) => g({}, ellipse(0, -10 * s, 70 * s, 18 * s, '#F2F0EC'), ellipse(0, -14 * s, 46 * s, 10 * s, '#E0DDD6', NI)),
  sponge: (s = 1) => path(rrect(-28 * s, -22 * s, 56 * s, 34 * s, 8 * s), '#F5C33B'),
  rose: (s = 1) => g({}, rod([[0, 0], [0, -120 * s]], '#4F9A4A', 6 * s, THIN), circle(0, -130 * s, 22 * s, '#E2453C'), circle(6 * s, -136 * s, 10 * s, '#B82F2A', NI)),
  cake: (s = 1) => g({}, path(rrect(-60 * s, -70 * s, 120 * s, 70 * s, 10 * s), '#F2A8C0'), rect(-60 * s, -40 * s, 120 * s, 12 * s, '#FFFFFF', NI), stroke([[0, -70 * s], [0, -100 * s]], '#3F6FD8', 6 * s), ellipse(0, -110 * s, 6 * s, 10 * s, '#F5C33B', NI)),
  key: (s = 1) => g({}, circle(0, -60 * s, 22 * s, 'none', {stroke: '#F5C33B', 'stroke-width': 10 * s}), stroke([[0, -38 * s], [0, 20 * s]], '#F5C33B', 10 * s), stroke([[0, 6 * s], [14 * s, 6 * s]], '#F5C33B', 8 * s)),
  envelope: (s = 1) => g({}, path(rrect(-60 * s, -84 * s, 120 * s, 84 * s, 6 * s), '#D8433A'), path(`M${-60 * s} ${-84 * s} L0 ${-40 * s} L${60 * s} ${-84 * s}`, 'none', {stroke: '#A8302A', 'stroke-width': 4 * s, 'stroke-linejoin': 'round'}), circle(0, -40 * s, 10 * s, '#F5C33B', NI)),
  mug: (s = 1) => g({}, path(`M${44 * s} ${-70 * s} q${30 * s} 4 ${26 * s} ${30 * s} q-4 ${20 * s} ${-26 * s} ${20 * s}`, 'none', {stroke: isStick() ? P('ink') : '#E9E5DE', 'stroke-width': 10 * s, 'stroke-linecap': 'round'}), path(rrect(-44 * s, -90 * s, 88 * s, 90 * s, [6 * s, 6 * s, 16 * s, 16 * s]), '#F2F0EC'), rect(-44 * s, -60 * s, 88 * s, 18 * s, '#E2453C', NI)),
};
/** draw a held prop at a wrist: the prop's origin is its grip point; it follows the forearm angle.
 *  Style: item.style, else opts.style, else the active style (stick.mjs may wrap its build in withStyle('stick', …)). */
export function PROPS_HELD(item, p, deg, side, t, opts = {}) {
  const spec = typeof item === 'string' ? {type: item} : item, f = HELD[spec.type];
  if (!f) return '';
  const tilt = spec.tilt ?? 0;
  return withStyle(spec.style || opts.style, () => layer('held:' + spec.type, {transform: tr(p[0], p[1] + 10, tilt + (spec.follow ? -deg * side * 0.5 : 0), spec.scale || 1)}, opts.facing < 0 ? g({transform: 'scale(-1 1)'}, f(1, spec.label)) : f(1, spec.label)), {w: 4.5});   // un-mirror the prop's art (sign text) when the body is flipped
}

// ---------- scene props ----------
const wood = v => T(col(v, 'wood'));
/** a window: origin = bottom centre of the glass (the sill). 1.2 m × 1.4 m by default. view: sky|city|trees|night */
function windowProp({w = 560, h = 660, night = false, sky, view = 'sky', curtains = false, frame, panes = 2} = {}) {
  const fr = col(frame, 'trim'), gl = night ? P('glassNight') : col(sky, 'glass'), out = [];
  const inner = [];
  if (night) inner.push(circle(w * 0.24, -h * 0.72, 40, P('moon'), NI), ...[[-0.3, -0.5], [-0.1, -0.8], [0.05, -0.35], [-0.38, -0.85]].map(([a, b]) => circle(w * a, h * b, 4, P('moon'), NI)));
  else inner.push(cluster([[-w * 0.2, -h * 0.66, 70, 26], [-w * 0.1, -h * 0.7, 50, 34], [w * 0.2, -h * 0.42, 60, 22]], P('cloud')));
  if (view === 'city' || view === 'trees') {
    const hz = -h * 0.28;
    // everything inside the glass is pre-fitted to it (no clip group: resvg-safe and cheap)
    if (view === 'city') for (let i = 0; i < 6; i++) { const x0 = -w / 2 + i * w / 6, bh = 120 + (hash('wv' + i) * 200 | 0); inner.push(rect(x0 + 4, hz - bh, w / 6 - 8, -(hz - bh), night ? mixHex(gl, '#000000', 0.25) : mixHex(gl, P('metalLight'), 0.45), NI)); }
    else { const tc = night ? mixHex(gl, '#000000', 0.2) : mixHex(gl, P('leaf'), 0.55); inner.push(rect(-w / 2, hz, w, -hz, tc, NI), ...[[-0.34, 0.16, 0.12], [-0.08, 0.17, 0.16], [0.17, 0.15, 0.11], [0.36, 0.14, 0.14]].map(([cx, rx, ry]) => ellipse(w * cx, hz, w * rx, h * ry, tc, NI))); }
  }
  const glass = rect(-w / 2, -h, w, h, '#000');
  out.push(rect(-w / 2 - 26, -h - 26, w + 52, h + 26, fr, {rx: 4}), rect(-w / 2, -h, w, h, gl, NI), g({}, ...inner,
    path(`M${-w * 0.42} ${-h} L${-w * 0.2} ${-h} L${-w * 0.5} ${-h * 0.55} L${-w * 0.5} ${-h * 0.8}Z`, lighten(gl, 0.35), NI)));
  out.push(rect(-w / 2, -h, w, h, 'none', isStick() ? {stroke: P('ink'), 'stroke-width': inkW(0.8)} : {}));
  for (let i = 1; i < panes; i++) out.push(rect(-w / 2 + w * i / panes - 9, -h, 18, h, fr, THIN));
  out.push(rect(-w / 2, -h * 0.66 - 9, w, 18, fr, THIN), rect(-w / 2 - 50, -6, w + 100, 30, fr, {rx: 4}));
  if (curtains) { const cc = T(col(curtains === true ? null : curtains, 'curtain'));
    out.push(rod([[-w / 2 - 170, -h - 70], [w / 2 + 170, -h - 70]], P('woodDark'), 12, THIN));
    for (const sd of [-1, 1]) { const x0 = sd * (w / 2 + 40); out.push(path(blob([[x0 - 90, -h - 70], [x0 + 90, -h - 70], [x0 + 70 + sd * 20, -h * 0.4], [x0 + 100, 60], [x0 - 100, 60], [x0 - 60 + sd * 20, -h * 0.4]]), cc.base), stroke([[x0, -h - 50], [x0 + sd * 10, 40]], cc.shade, 10, NI)); } }
  return g({}, ...out);
}
/** a building facade: origin = bottom centre. Storeys are 3 m (1410 px). */
export function facade({w = 2400, floors = 4, h, color, lit = 0, shop = true, awning, kind = 'plaster', seed = 'b', night = false, roof = true} = {}) {
  const base = col(color, kind === 'brick' ? 'brick' : 'plaster'), c = T(base), S = 1410, H = h || floors * S + 120, n = Math.max(1, Math.round(w / 1150)), out = [];
  const glassDay = mixHex(P('glass'), base, 0.25), glassOff = night ? darken(base, 0.45) : darken(glassDay, 0.12);
  out.push(rect(-w / 2, -H, w, H, c.base));
  if (kind === 'brick') for (let y = -H + 60, r = 0; y < -60; y += 70, r++) out.push(stroke([[-w / 2, y], [w / 2, y]], c.shade, 4, NI));
  out.push(rect(w / 2 - w * 0.12, -H, w * 0.12, H, darken(base, 0.08), NI));                                           // side shade
  const nf = Math.floor((H - 100) / S);
  for (let f = shop ? 1 : 0; f < nf; f++) {
    const yb = -f * S - 80;
    out.push(rect(-w / 2, yb - 40, w, 40, lighten(base, 0.18), THIN));                                                  // storey band
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n, ww = 520, wh = 720, lt = hash(seed + f + ':' + i) < lit;
      out.push(rect(x - ww / 2 - 22, yb - 300 - wh - 22, ww + 44, wh + 44, lighten(base, 0.35), THIN),
        rect(x - ww / 2, yb - 300 - wh, ww, wh, lt ? '#F7D774' : (night ? glassOff : glassDay), THIN),
        rect(x - 7, yb - 300 - wh, 14, wh, lighten(base, 0.35), NI), rect(x - ww / 2, yb - 300 - wh * 0.62, ww, 14, lighten(base, 0.35), NI),
        rect(x - ww / 2 - 50, yb - 300, ww + 100, 30, lighten(base, 0.3), THIN)); }
  }
  if (shop) {   // ground floor: shopfront glass, a door, an awning, a sign band
    const sc = col(awning, 'accent', true), dx = -w / 2 + w * 0.22;
    out.push(rect(-w / 2, -1300, w, 220, darken(base, 0.18), THIN));
    out.push(rect(-w / 2 + w * 0.36, -1020, w * 0.56, 880, night ? (lit > 0 ? '#F2CF7A' : glassOff) : glassDay, THIN), rect(-w / 2 + w * 0.36, -160, w * 0.56, 160, darken(base, 0.12), THIN),
      ...Array.from({length: 3}, (_, i) => rect(-w / 2 + w * 0.36 + (i + 1) * w * 0.14 - 8, -1020, 16, 860, darken(base, 0.2), NI)));
    out.push(rect(dx - 230, -1040, 460, 1040, darken(base, 0.3), THIN), rect(dx - 210, -1020, 420, 1020, night ? '#3A3F4F' : mixHex(glassDay, '#55575E', 0.35), THIN), circle(dx + 160, -500, 14, '#F5C33B', NI));
    const aw = w * 0.62, ax = -w / 2 + w * 0.36 - 40, stripes = 8;
    out.push(path(`M${ax} -1180 L${ax + aw} -1180 L${ax + aw + 60} -1000 L${ax - 60} -1000Z`, sc), ...Array.from({length: stripes}, (_, i) => i % 2 ? poly([[ax + i * aw / stripes, -1180], [ax + (i + 1) * aw / stripes, -1180], [ax - 60 + (i + 1) * (aw + 120) / stripes, -1000], [ax - 60 + i * (aw + 120) / stripes, -1000]], lighten(sc, 0.75), NI) : ''),
      ...Array.from({length: stripes}, (_, i) => circle(ax - 60 + (i + 0.5) * (aw + 120) / stripes, -1000, (aw + 120) / stripes / 2, i % 2 ? lighten(sc, 0.75) : sc, THIN)));
  }
  out.push(inkOver(`M${-w / 2} ${-H} H${w / 2} V0 H${-w / 2}Z`));
  if (roof) out.push(rect(-w / 2 - 30, -H - 40, w + 60, 70, lighten(base, 0.12)));
  return g({}, ...out);
}

export const SCENE = {
  // a cinema seat seen from the front: tall back, cushion, armrests (back top ≈ 1.05 m, seat ≈ 0.45 m)
  seat: ({color} = {}) => { const c = T(col(color, 'seat')), back = rrect(-135, -495, 270, 330, [70, 70, 20, 20]), arm = isStick() ? P('woodDark') : '#2B2B30';
    // shading is pre-shaped (no clip): a seat row repeats this ~100 times, and clip groups are costly in resvg
    return g({}, path(back, c.base), path('M50 -495 L65 -495 Q135 -495 135 -425 L135 -185 Q135 -165 115 -165 L50 -165Z', c.shade, NI), ellipse(-30, -455, 70, 26, c.light, NI), inkOver(back),
      path(rrect(-140, -230, 280, 120, 30), c.shade), path(rrect(-140, -230, 280, 50, 24), c.base),
      ...[-1, 1].map(sd => g({}, path(rrect(sd * 142 - 26, -310, 52, 280, 18), arm), rect(sd * 142 - 26, -310, 52, 34, lighten(arm, 0.12), {rx: 14, ink: false}))),
      rect(-95, -110, 190, 110, darken(arm, 0.1))); },
  // a three-seat sofa: 2 m wide, seat 0.45 m, back 0.85 m
  sofa: ({color} = {}) => { const c = T(col(color, 'fabric'));
    return g({}, ...[-430, 400].map(x => rect(x, -60, 30, 60, P('woodDark'))), path(rrect(-450, -410, 900, 300, 50), c.shade),
      ...[-1, 0, 1].map(i => path(rrect(i * 280 - 135, -390, 270, 200, 40), c.base)),
      path(rrect(-460, -230, 920, 170, 26), c.shade), ...[-1, 0, 1].map(i => path(rrect(i * 280 - 140, -250, 280, 80, 22), c.light)),
      ...[-1, 1].map(sd => path(rrect(sd * 440 - 70, -310, 140, 260, 50), c.base))); },
  // a table: top at 0.75 m
  table: ({color, w = 560} = {}) => { const c = wood(color); return g({}, rect(-w / 2 + 30, -330, 32, 330, c.shade), rect(w / 2 - 62, -330, 32, 330, c.shade), rect(-w / 2 + 20, -330, w - 40, 36, c.deep, NI), rect(-w / 2, -362, w, 34, c.base, {rx: 6})); },
  // an office desk: 1.5 m wide, top at 0.75 m, drawer pedestal on the left
  desk: ({color, w = 700} = {}) => { const c = T(col(color, isStick() ? 'woodLight' : 'chrome'));
    return g({}, rect(w / 2 - 50, -330, 30, 330, c.shade), rect(-w / 2 + 20, -330, 240, 330, c.shade), ...[0, 1, 2].map(i => g({}, rect(-w / 2 + 34, -316 + i * 104, 212, 92, c.light, THIN), rect(-w / 2 + 110, -276 + i * 104, 60, 12, c.deep, {rx: 6, ink: false}))),
      rect(-w / 2 + 260, -330, w - 310, 120, c.deep, NI), rect(-w / 2, -362, w, 34, c.base, {rx: 6})); },
  // a dining / desk chair (seat 0.45 m, back 0.95 m), seen front-on
  chair: ({color} = {}) => { const c = wood(color); return g({}, rect(-110, -450, 26, 450, c.shade), rect(84, -450, 26, 450, c.shade), path(rrect(-115, -470, 230, 150, 18), c.base), rect(-90, -440, 180, 22, c.light, NI), rect(-100, -200, 22, 200, c.base), rect(78, -200, 22, 200, c.base), path(rrect(-125, -232, 250, 36, 10), c.base)); },
  stool: ({color} = {}) => { const c = wood(color); return g({}, rod([[-70, 0], [-50, -330]], c.shade, 20), rod([[70, 0], [50, -330]], c.shade, 20), rect(-60, -150, 120, 16, c.shade), path(rrect(-95, -360, 190, 40, 16), c.base)); },
  // a laptop (33 cm): origin on the surface it sits on
  laptop: () => g({}, path(rrect(-80, -128, 160, 114, 8), isStick() ? P('bezel') : '#3A3A40'), rect(-70, -118, 140, 94, P('screen'), NI), rect(-70, -118, 50, 94, lighten(P('screen'), 0.3), NI), path('M-96 -14 L96 -14 L86 0 L-86 0Z', isStick() ? P('metalLight') : '#55555C')),
  // a floor lamp (1.6 m); table: true gives a 0.5 m table lamp
  lamp: ({color, table = false} = {}) => { const k = table ? 0.32 : 1, s = col(color, 'shade', true), H = 750 * k;
    return g({}, ellipse(0, -8, 80 * Math.max(k, 0.7), 14, P('metal')), rod([[0, -10], [0, -H + 150 * k]], P('metal'), 12 * Math.max(k, 0.8), THIN), path(`M${-120 * k - 20} ${-H + 160 * k} L${120 * k + 20} ${-H + 160 * k} L${75 * k + 10} ${-H} L${-75 * k - 10} ${-H}Z`, s), path(`M${40 * k} ${-H + 160 * k} L${120 * k + 20} ${-H + 160 * k} L${75 * k + 10} ${-H} L${20 * k} ${-H}Z`, darken(s, 0.1), NI)); },
  // a floor plant (≈ 1.2 m)
  plant: ({color, s = 1} = {}) => { const lf = col(color, 'leaf', true), dk = darken(lf, 0.18), leaves = [[-110, -400, -30, 60, 170], [100, -420, 28, 60, 170], [0, -520, 0, 64, 200], [-170, -300, -58, 52, 140], [170, -310, 55, 52, 140], [-50, -470, -12, 50, 160], [55, -460, 14, 50, 160]];
    return g({transform: s !== 1 ? `scale(${s})` : undefined}, ...leaves.map(([x, y, r, rx, ry], i) => ellipse(x, y, rx, ry, i % 2 ? dk : lf, {transform: `rotate(${r} ${x} ${y})`})),
      path('M-120 -200 L120 -200 L95 0 L-95 0Z', P('pot')), rect(-128, -210, 256, 40, darken(P('pot'), 0.12), {rx: 6})); },
  // a door: 0.9 m × 2.1 m in a cased frame. open: 0..1 (the leaf swings in; the dark gap grows)
  door: ({color, open = 0, w = 420, h = 990, frame} = {}) => { const c = wood(color), lw = w * (1 - open * 0.82), fr = col(frame, 'trim');
    return g({}, rect(-w / 2 - 34, -h - 34, w + 68, h + 34, fr), rect(-w / 2, -h, w, h, isStick() ? '#6E625A' : '#2A2A2E', NI), rect(-w / 2, -h, w, 60, isStick() ? '#5A4F48' : '#202024', NI),
      rect(-w / 2, -h, lw, h, c.base), ...(lw > 140 ? [rect(-w / 2 + lw * 0.16, -h + 70, lw * 0.68, h * 0.38, c.light, THIN), rect(-w / 2 + lw * 0.16, -h * 0.5 + 10, lw * 0.68, h * 0.4, c.light, THIN)] : []),
      rect(-w / 2 + lw - 26, -h, 26, h, c.shade, NI), inkOver(`M${-w / 2} ${-h} h${lw} v${h} h${-lw}Z`), circle(-w / 2 + lw - 56, -h * 0.47, 15, '#E3B04B')); },
  window: windowProp,
  // a TV (55" ≈ 1.2 m) on a foot: origin on the surface it stands on
  tv: ({on = false} = {}) => g({}, path('M-90 0 L90 0 L60 -40 L-60 -40Z', P('bezel')), path(rrect(-285, -380, 570, 340, 12), P('bezel')), rect(-266, -362, 532, 304, on ? P('screen') : (isStick() ? '#6F7A86' : '#3E4A63'), NI), path('M-266 -362 L-110 -362 L-266 -170Z', on ? lighten(P('screen'), 0.3) : (isStick() ? '#7F8A95' : '#4A5672'), NI)),
  // a tree ≈ 5.5 m tall, canopy ≈ 4 m wide
  tree: ({color, h = 2600, kind = 'round'} = {}) => { const lf = col(color, 'leaf', true), k = h / 2600, tk = P('trunk');
    if (kind === 'pine') return g({}, rect(-50 * k, -500 * k, 100 * k, 500 * k, tk), ...[0, 1, 2, 3].map(i => path(`M0 ${(-2600 + i * 420) * k} L${(380 + i * 150) * k} ${(-1700 + i * 380) * k} L${(-380 - i * 150) * k} ${(-1700 + i * 380) * k}Z`, i % 2 ? darken(lf, 0.1) : lf)));
    const trunk = `M${-95 * k} 0 C${-70 * k} ${-500 * k} ${-60 * k} ${-1000 * k} ${-45 * k} ${-1500 * k} L${45 * k} ${-1500 * k} C${60 * k} ${-1000 * k} ${70 * k} ${-500 * k} ${95 * k} 0Z`;
    return g({}, path(trunk, tk), path(`M${10 * k} 0 C${30 * k} ${-500 * k} ${30 * k} ${-1000 * k} ${20 * k} ${-1500 * k} L${45 * k} ${-1500 * k} C${60 * k} ${-1000 * k} ${70 * k} ${-500 * k} ${95 * k} 0Z`, darken(tk, 0.15), NI),
      rod([[-30 * k, -1250 * k], [-330 * k, -1560 * k]], tk, 40 * k), rod([[25 * k, -1150 * k], [360 * k, -1500 * k]], tk, 40 * k),
      cluster([[0, -1950 * k, 640 * k], [-520 * k, -1650 * k, 440 * k], [520 * k, -1620 * k, 470 * k], [-300 * k, -2250 * k, 420 * k, 380 * k], [320 * k, -2200 * k, 440 * k, 400 * k], [0, -1500 * k, 420 * k, 260 * k]], lf,
        [[260 * k, -1650 * k, 330 * k], [-420 * k, -1560 * k, 250 * k, 200 * k], [380 * k, -2080 * k, 260 * k]], darken(lf, 0.12)),
      ...[[-250, -2150, 90, 60], [-450, -1750, 70, 46], [100, -2350, 80, 52]].map(([x, y, rx, ry]) => ellipse(x * k, y * k, rx * k, ry * k, lighten(lf, 0.18), NI))); },
  // a building: floors × 3 m storeys (w, h in px; h overrides floors)
  building: ({color, w = 2400, h, floors = 4, lit = 0.3, shop = true, kind = 'plaster', night = false, seed} = {}) => facade({w, h, floors, color, lit, shop, kind, night, seed: seed || 'bp' + w}),
  // a car: 4.5 m long, 1.5 m tall
  car: ({color} = {}) => { const c = T(col(color, 'accent', true)), gl = P('glass'), body = blob([[-1020, -180], [-1000, -400], [-560, -470], [-330, -740], [360, -750], [600, -480], [1010, -420], [1050, -200]]);
    return g({}, path(body, c.base), rect(-1000, -300, 2030, 120, c.shade, {rx: 30, ink: false}), inkOver(body), path('M-270 -700 L-20 -700 L-20 -480 L-480 -480Z', gl, THIN), path('M40 -700 L320 -700 L520 -480 L40 -480Z', gl, THIN),
      rect(-1040, -230, 140, 60, P('chrome'), {rx: 20}), rect(940, -260, 120, 60, P('chrome'), {rx: 20}), ellipse(980, -380, 40, 26, '#FFF2B3', THIN),
      ...[-620, 640].map(x => g({}, circle(x, -160, 165, '#26262B'), circle(x, -160, 80, P('chrome'), THIN), circle(x, -160, 26, '#55555C', NI)))); },
  // a wall clock (30 cm): origin = centre
  clock: ({t = 0} = {}) => g({}, circle(0, 0, 78, isStick() ? P('trim') : '#F2F0EC', {ink: 'bold'}), ...(isStick() ? [] : [circle(0, 0, 78, 'none', {stroke: '#3A3A40', 'stroke-width': 12})]), ...Array.from({length: 12}, (_, i) => { const a = i * Math.PI / 6; return line([[Math.sin(a) * 58, -Math.cos(a) * 58], [Math.sin(a) * 66, -Math.cos(a) * 66]], 5, '#3A3A40'); }),
    line([[0, 0], [0, -50]], 9, '#3A3A40'), line([[0, 0], [36, 16]], 9, '#3A3A40'), circle(0, 0, 8, '#E2453C', NI)),
  bubble: ({text: label = '...', w = 360, h = 150, tail = 'left', color = '#FFFFFF', ink = '#1E1E22', size = 52} = {}) => { const tl = tail === 'left' ? `M${-w * 0.25} -6 L${-w * 0.38} 48 L${-w * 0.05} -6Z` : `M${w * 0.25} -6 L${w * 0.38} 48 L${w * 0.05} -6Z`;
    return g({}, isStick() ? path(tl, color) : '', path(rrect(-w / 2, -h, w, h, 36), color), path(tl, color, NI), text(label, 0, -h / 2 + size * 0.35, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 800, 'font-size': size, fill: ink})); },
  popcornSpill: () => withStyle('flat', () => g({}, ...Array.from({length: 14}, (_, i) => circle(((i * 97) % 600) - 300, -((i * 31) % 18), 9, i % 3 ? POP : POPS)))),
  // a pair of shoes (28 cm each)
  shoes: ({color} = {}) => g({}, path(rrect(-140, -52, 128, 52, [24, 32, 10, 10]), col(color, 'accent', true)), rect(-140, -16, 128, 16, '#F4F2EE', {rx: 6}), path(rrect(10, -48, 128, 48, [24, 32, 10, 10]), '#2B2B30'), rect(10, -14, 128, 14, '#F4F2EE', {rx: 6})),
};

// ---------- story props (graphic devices: their size is a design choice, not real scale) ----------
Object.assign(SCENE, {
  /** raw SVG markup in prop coordinates (origin = x,y). The escape hatch for anything one-off. */
  svg: ({markup = ''}) => markup,
  /** a pill tag (numbers over heads, prices, counters). Pops on change when keyed. */
  tag: ({text: label = '0%', color = '#1F6FEB', ink = '#FFFFFF', size = 64, pad = 26}) => { const w = Math.max(size * 1.3, String(label).length * size * 0.62 + pad * 2), h = size * 1.35; return g({}, path(`M-14 -4 L0 22 L14 -4Z`, color), path(rrect(-w / 2, -h, w, h, h / 2), color), path(`M-12 -6 L0 16 L12 -6Z`, color, NI), text(label, 0, -h * 0.28, font(size, 900, {fill: ink}))); },
  /** cloud-shaped thought bubble with trailing dots toward (dx, dy) */
  thought: ({text: label = '...', w = 420, h = 180, color = '#FFFFFF', ink = '#1E1E22', size = 46, dx = -60, dy = 150, max = 18}) => { const ls = wrapLines(label, max), parts = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; parts.push([Math.cos(a) * w * 0.42, -h / 2 + Math.sin(a) * h * 0.36, h * 0.3]); }
    parts.push([0, -h / 2, w * 0.44, h * 0.42]);
    return g({}, cluster(parts, color, [], color), circle(dx * 0.5, dy * 0.4, 18, color, THIN), circle(dx * 0.85, dy * 0.75, 11, color, THIN), ...ls.map((l, i) => text(l, 0, -h / 2 + size * 0.35 + (i - (ls.length - 1) / 2) * size * 1.1, font(size, 800, {fill: ink})))); },
  /** big phone close-up: header, messages [{text, from:'them'|'me'}], notification banner, typing dots */
  phoneUI: ({header = 'Mom', messages = [], typing = false, banner = null, accent = '#3F6FD8', w = 560, h = 1000, t = 0}) => {
    const outline = isStick() ? path(rrect(-w / 2 - 20, -h - 20, w + 40, h + 40, 70), '#1F1F24', {ink: 'bold'}) : '';
    return g({}, outline, withStyle('flat', () => { const out = [path(rrect(-w / 2 - 20, -h - 20, w + 40, h + 40, 70), '#1F1F24'), path(rrect(-w / 2, -h, w, h, 54), '#F7F7F9'), rect(-w / 2, -h, w, 150, '#FFFFFF'), circle(0, -h + 62, 30, accent), text(header[0] || '?', 0, -h + 74, font(32, 800, {fill: '#FFFFFF'})), text(header, 0, -h + 128, font(28, 700, {fill: '#1E1E22'})), path(rrect(-60, -h + 12, 120, 30, 15), '#1F1F24')];
      let y = -h + 200;
      for (const m of messages) { const ls = wrapLines(m.text, 20), bw = Math.min(w - 120, Math.max(...ls.map(l => l.length)) * 22 + 60), bh = ls.length * 44 + 30, me = m.from === 'me', x = me ? w / 2 - 40 - bw : -w / 2 + 40;
        out.push(path(rrect(x, y, bw, bh, 26), me ? accent : '#E6E7EC'), ...ls.map((l, i) => text(l, x + 30, y + 46 + i * 44, font(34, 600, {'text-anchor': 'start', fill: me ? '#FFFFFF' : '#1E1E22'})))); y += bh + 22; }
      if (typing) out.push(path(rrect(-w / 2 + 40, y, 120, 60, 30), '#E6E7EC'), ...[0, 1, 2].map(i => circle(-w / 2 + 72 + i * 28, y + 30 - Math.max(0, Math.sin(t * 8 - i)) * 8, 8, '#9A9AA2')));
      if (banner) out.push(path(rrect(-w / 2 + 20, -h + 30, w - 40, 130, 28), '#FFFFFF', {opacity: 0.97}), circle(-w / 2 + 80, -h + 95, 26, accent), ...wrapLines(banner, 22).slice(0, 2).map((l, i) => text(l, -w / 2 + 125, -h + 88 + i * 38, font(30, 700, {'text-anchor': 'start', fill: '#1E1E22'}))));
      return out; }));
  },
  /** brick wall that grows: rows = how many rows are built (fractional = the next brick falling into place) */
  brickWall: ({rows = 4, cols = 6, bw = 110, bh = 54, color = '#B5462E'}) => { const out = [], full = Math.floor(rows), frac = rows - full; const c = tones(col(color, 'brick')), x0 = -cols * bw / 2, stick = isStick();
    for (let r = 0; r < Math.ceil(rows); r++) { const odd = r % 2, bricks = odd   // odd rows are running bond: a half brick at each end, so both edges stay flush
        ? [[x0, bw / 2], ...Array.from({length: cols - 1}, (_, i) => [x0 + bw / 2 + i * bw, bw]), [x0 + cols * bw - bw / 2, bw / 2]]
        : Array.from({length: cols}, (_, i) => [x0 + i * bw, bw]);
      bricks.forEach(([x, w], i) => { if (r >= full && i >= Math.floor(frac * bricks.length)) return; const n = r * (cols + 1) + i, y = -(r + 1) * bh;
        out.push(rect(x, y, w, bh, stick ? '#E9DFD0' : '#8E8A84', NI), rect(x + 3, y + 3, w - 6, bh - 6, (n * 7) % 5 ? c.base : c.shade, {rx: 4, ink: 'thin'}), rect(x + 6, y + 6, w - 12, 9, c.light, {rx: 3, ink: false})); }); }
    return g({}, ...out); },
  flower: ({color = '#E8508A', s = 1}) => withStyle('flat', () => g({}, stroke([[0, 0], [0, -40 * s]], '#4F9A4A', 5 * s), ...[0, 72, 144, 216, 288].map(a => circle(Math.cos(a * Math.PI / 180) * 12 * s, -46 * s + Math.sin(a * Math.PI / 180) * 12 * s, 9 * s, color)), circle(0, -46 * s, 7 * s, '#F5C33B'))),
  /** a path of flowers along points; progress 0..1 reveals it in order (top-down maps) */
  flowerTrail: ({points = [], color = '#E8508A', progress = 1, spacing = 34, s = 0.7}) => withStyle('flat', () => { const pts = []; for (let i = 0; i < points.length - 1; i++) { const [a, b] = [points[i], points[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d < L; d += spacing) pts.push([a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L]); }
    const n = Math.floor(pts.length * Math.max(0, Math.min(1, progress))); return g({}, ...pts.slice(0, n).map(([x, y], i) => g({transform: `translate(${x} ${y})`}, ...[0, 72, 144, 216, 288].map(a => circle(Math.cos(a * Math.PI / 180) * 10 * s, Math.sin(a * Math.PI / 180) * 10 * s, 8 * s, i % 5 ? color : lighten(color))), circle(0, 0, 6 * s, '#F5C33B')))); }),
  /** price/menu board: rows [[label, value]] */
  board: ({rows = [['HELLO', '$1']], title = '', w = 620, color = '#26322A', ink = '#F2F0EC', accent = '#7BD88F'}) => { const h = rows.length * 86 + (title ? 120 : 50); return g({}, path(rrect(-w / 2 - 16, -h - 16, w + 32, h + 32, 20), '#7A5232'), path(rrect(-w / 2, -h, w, h, 12), color, NI), title ? text(title, 0, -h + 70, font(48, 900, {fill: ink})) : '',
    ...rows.map(([l, v], i) => g({}, text(l, -w / 2 + 40, -h + (title ? 150 : 80) + i * 86, font(44, 800, {'text-anchor': 'start', fill: ink})), text(v, w / 2 - 40, -h + (title ? 150 : 80) + i * 86, font(44, 900, {'text-anchor': 'end', fill: accent}))))); },
  checklist: ({items = [['ROCKET', false]], title = ''}) => { const h = items.length * 64 + 90; return g({}, path(rrect(-200, -h, 400, h, 10), '#FFFDF4'), title ? text(title, 0, -h + 50, font(34, 800, {fill: '#1E1E22'})) : '', ...items.map(([l, ok], i) => g({}, rect(-170, -h + 80 + i * 64, 40, 40, 'none', {stroke: '#1E1E22', 'stroke-width': 4, rx: 6}), ok ? stroke([[-162, -h + 100 + i * 64], [-150, -h + 112 + i * 64], [-128, -h + 84 + i * 64]], '#2E9E5B', 7) : stroke([[-164, -h + 86 + i * 64], [-136, -h + 114 + i * 64]], '#E2453C', 6), ok ? '' : stroke([[-136, -h + 86 + i * 64], [-164, -h + 114 + i * 64]], '#E2453C', 6), text(l, -110, -h + 112 + i * 64, font(34, 700, {'text-anchor': 'start', fill: '#1E1E22'}))))); },
  rope: ({x2 = 200, y2 = 0, color = '#C49A6C'}) => { const d = `M0 0 Q${x2 / 2} ${Math.max(y2, 0) + 60} ${x2} ${y2}`; return (isStick() ? path(d, 'none', {stroke: P('ink'), 'stroke-width': 8 + inkW(2), 'stroke-linecap': 'round'}) : '') + path(d, 'none', {stroke: col(color, 'woodLight'), 'stroke-width': 8, 'stroke-linecap': 'round'}); },
  stars: ({n = 40, w = 1080, h = 900}) => withStyle('flat', () => g({}, ...Array.from({length: n}, (_, i) => circle((i * 211) % w, (i * 97) % h, 2 + (i % 3), '#F7E7C9', {opacity: 0.4 + (i % 5) * 0.1})))),
  rocket: ({color = '#C49A6C', built = 1}) => { const c = tones(col(color, 'woodLight')), k = 1.5, vis = (b, lo) => (built > b ? c : {base: lighten(c.base, 0.6), shade: lighten(c.shade, 0.6)});   // a cardboard rocket ≈ 1.3 m (unbuilt parts are pale ghosts, no group opacity)
    return g({transform: `scale(${k})`}, path('M-70 0 L-70 -260 L70 -260 L70 0Z', vis(0.2).base), path('M-70 -260 L0 -380 L70 -260Z', vis(0.7).shade), circle(0, -170, 32, built > 0.4 ? '#9FD3EA' : '#E3F1F7'), path('M-70 -60 L-120 0 L-70 0Z', vis(0.5).shade), path('M70 -60 L120 0 L70 0Z', vis(0.5).shade), text('ME', 0, -90, font(40, 900, {fill: '#3F6FD8'}))); },
});

// ---------- real-scale story/street props ----------
Object.assign(SCENE, {
  // a bed: 2 m long, mattress top 0.55 m, headboard 1.0 m. kind: 'home' | 'hospital'
  bed: ({color, kind = 'home'} = {}) => { const sh = col(color, 'sheet');
    if (kind === 'hospital') return SCENE.hospitalBed({color});
    const c = wood(null);
    return g({}, rect(-470, -100, 26, 100, c.shade), rect(440, -100, 26, 100, c.shade), path(rrect(-500, -540, 70, 540, [30, 30, 0, 0]), c.base), path(rrect(430, -330, 50, 330, [20, 20, 0, 0]), c.base),
      rect(-440, -170, 880, 80, c.base), path(rrect(-440, -270, 870, 110, 26), lighten(sh, 0.4)), path(rrect(-430, -360, 230, 90, 40), P('pillow')),
      path(rrect(-170, -295, 610, 140, [40, 30, 20, 20]), sh), rect(-170, -295, 60, 140, darken(sh, 0.08), NI)); },
  hospitalBed: ({color} = {}) => { const sh = col(color, 'sheet'), m = P('metalLight'), mt = P('chrome');
    return g({}, ...[-380, 380].map(x => g({}, rect(x - 10, -230, 20, 170, m), circle(x, -40, 40, '#3A3A40'), circle(x, -40, 14, mt, NI))),
      rect(-460, -280, 920, 60, m), path('M-440 -300 L-120 -300 L-170 -470 L-440 -470Z', lighten(sh, 0.3)), path(rrect(-440, -390, 220, 80, 36), P('pillow'), {transform: 'rotate(-20 -330 -350)'}),
      path(rrect(-150, -360, 590, 90, [30, 30, 10, 10]), sh), rect(-470, -560, 36, 290, m, {rx: 12}), rect(440, -420, 36, 150, m, {rx: 12}),
      rod([[-100, -420], [300, -420]], mt, 14, THIN), rod([[-100, -420], [-100, -300]], mt, 10, THIN), rod([[300, -420], [300, -300]], mt, 10, THIN)); },
  // a patient monitor on a wheeled stand (screen at ≈ 1.5 m). beat: 'flat' for a flatline
  monitor: ({beat = 0, t = 0, color = '#5FD38D'}) => { const ph = (t * 1.2) % 1, pts = []; for (let i = 0; i <= 40; i++) { const x = -96 + i * 4.8, u = (i / 40 + ph) % 1; pts.push([x, -770 + (beat === 'flat' ? 0 : (u > 0.45 && u < 0.5 ? -44 : u > 0.5 && u < 0.55 ? 26 : 0))]); }
    return g({}, ...[-90, 0, 90].map(x => circle(x, -18, 18, '#3A3A40')), rod([[-100, -30], [100, -30]], P('metal'), 14), rod([[0, -30], [0, -660]], P('metalLight'), 22, THIN), path(rrect(-130, -880, 260, 210, 18), isStick() ? P('bezel') : '#26262B'), rect(-112, -862, 224, 160, '#16231C', NI), stroke(pts, color, 5), circle(96, -700, 6, '#E2453C', NI)); },
  // a street lamp ≈ 4.5 m
  lampPost: ({lit = true}) => { const m = isStick() ? '#6E6A66' : '#3A3A40';
    return g({}, path('M-34 0 L34 0 L22 -200 L-22 -200Z', m), rod([[0, -150], [0, -2050]], m, 26), path('M0 -2040 Q0 -2140 120 -2140 L210 -2140', 'none', {stroke: isStick() ? P('ink') : m, 'stroke-width': 26 + inkW(2), 'stroke-linecap': 'round'}), isStick() ? path('M0 -2040 Q0 -2140 120 -2140 L210 -2140', 'none', {stroke: m, 'stroke-width': 26, 'stroke-linecap': 'round'}) : '',
      path('M140 -2160 L290 -2160 L260 -2090 L170 -2090Z', m), lit ? ellipse(215, -2088, 46, 14, '#FFE9A8', THIN) : ''); },
  // a bus shelter (2.5 m) with a bench and the stop sign
  busStop: () => { const m = isStick() ? '#7D7873' : '#3A3A40', gl = mixHex(P('glass'), '#FFFFFF', 0.35);
    return g({}, rect(-620, -1150, 1240, 900, gl, THIN), rect(-560, -1100, 380, 560, lighten(P('accent3'), 0.2), THIN), rect(-520, -1050, 300, 200, P('accent2'), NI),
      rod([[-640, 0], [-640, -1200]], m, 26), rod([[640, 0], [640, -1200]], m, 26), path(rrect(-700, -1260, 1400, 70, 14), m),
      rect(-420, -215, 840, 36, P('woodLight')), rect(-380, -180, 20, 180, m), rect(360, -180, 20, 180, m),
      rod([[860, 0], [860, -1250]], m, 18), circle(860, -1300, 95, '#3E6FB8'), text('BUS', 860, -1286, font(54, 900, {fill: '#FFFFFF'}))); },
  // a two-tier fountain: basin 3 m wide
  fountain: () => { const st = P('stone'), w = P('water');
    return g({}, rect(-700, -250, 1400, 250, st), rect(-700, -250, 1400, 40, lighten(st, 0.2), NI), path(rrect(-740, -300, 1480, 60, 20), lighten(st, 0.1)), ellipse(0, -300, 640, 22, w, NI),
      rect(-60, -780, 120, 480, st), path('M-330 -780 L330 -780 L180 -680 L-180 -680Z', lighten(st, 0.08)), ellipse(0, -782, 300, 16, w, NI), rect(-24, -950, 48, 170, st),
      ...[-1, 1].flatMap(sd => [stroke([[sd * 20, -950], [sd * 180, -1000], [sd * 300, -800]], lighten(w, 0.3), 12, {fill: 'none'}), stroke([[sd * 300, -780], [sd * 470, -640], [sd * 560, -310]], lighten(w, 0.3), 12)])); },
  // a pram (≈ 1 m)
  pram: ({color = '#3E6FB8'}) => { const c = tones(col(color, 'accent3')), k = 1.9; return g({transform: `scale(${k})`}, path(blob([[-110, -60], [110, -60], [100, -160], [0, -250], [-110, -160]]), c.base), path(blob([[0, -250], [100, -160], [110, -60], [40, -60]]), c.shade, NI), rod([[110, -160], [170, -230]], '#3A3A40', 10, THIN), circle(-70, -20, 26, '#26262B'), circle(70, -20, 26, '#26262B')); },
  telescope: () => { const m = isStick() ? '#6E6A66' : '#3A3A40'; return g({}, rod([[0, -620], [-260, 0]], m, 16, THIN), rod([[0, -620], [260, 0]], m, 16, THIN), rod([[0, -620], [0, 0]], m, 16, THIN), path(rrect(-300, -720, 600, 140, 60), '#3E6FB8', {transform: 'rotate(-28 0 -650)'})); },
  // a standing / wall mirror (default 0.9 m × 2 m)
  mirror: ({w = 420, h = 940, glass = '#CFE6F2'}) => g({}, path(rrect(-w / 2 - 26, -h - 26, w + 52, h + 52, 30), P('wood')), path(rrect(-w / 2, -h, w, h, 18), isStick() ? soften(glass, 0.2) : glass), path(`M${-w / 2 + 30} ${-h + 40} L${-w / 2 + 130} ${-h + 40} L${-w / 2 + 30} ${-h + 200}Z`, '#FFFFFF', {opacity: 0.35}), path(`M${w / 2 - 40} ${-h * 0.5} L${w / 2 - 40} ${-h * 0.3} L${w / 2 - 120} ${-h * 0.18}Z`, '#FFFFFF', {opacity: 0.25})),
  // a park bench: 1.8 m wide, seat 0.45 m, back 0.85 m
  bench: ({color} = {}) => { const c = wood(color), m = isStick() ? '#6E6A66' : '#3A3A40';
    return g({}, ...[-360, 360].map(x => g({}, rect(x - 14, -420, 28, 420, m, {rx: 6}), rect(x - 60, -300, 120, 22, m, {rx: 8}))),
      rect(-430, -430, 860, 34, c.base, {rx: 8}), rect(-430, -370, 860, 34, c.shade, {rx: 8}), rect(-440, -232, 880, 30, c.base, {rx: 8}), rect(-440, -198, 880, 22, c.shade, {rx: 8})); },
});

// ---------- v3 set dressing (also usable as scene props) ----------
Object.assign(SCENE, {
  // kitchen base cabinets with a worktop at 0.92 m. sink / stove: x offsets (or false)
  counter: ({w = 1400, color, top, sink = false, stove = false} = {}) => { const c = T(col(color, 'cabinet')), tp = col(top, 'counter'), n = Math.max(1, Math.round(w / 300)), dw = (w - 40) / n, out = [];
    out.push(rect(-w / 2, -60, w, 60, darken(c.base, 0.3)), rect(-w / 2, -410, w, 360, c.base));
    for (let i = 0; i < n; i++) { const x = -w / 2 + 20 + i * dw; out.push(rect(x + 6, -390, dw - 12, 320, c.light, THIN), rect(x + dw / 2 - 30, -370, 60, 12, P('metal'), {rx: 6, ink: false})); }
    if (stove !== false) out.push(rect(stove - 160, -400, 320, 340, P('chrome')), rect(stove - 130, -330, 260, 190, '#3A3A40', THIN), rect(stove - 120, -380, 240, 16, P('metal'), {rx: 8, ink: false}));
    out.push(rect(-w / 2 - 20, -450, w + 40, 44, tp, {rx: 6}));
    if (sink !== false) out.push(rect(sink - 160, -456, 320, 16, darken(tp, 0.15), NI), rod([[sink + 40, -450], [sink + 40, -580], [sink - 40, -580], [sink - 40, -540]], P('chrome'), 14, THIN));
    if (stove !== false) out.push(...[-80, 80].map(dx => ellipse(stove + dx, -452, 60, 8, '#3A3A40', NI)));
    return g({}, ...out); },
  // wall cabinets: origin = bottom centre of the cabinets (hang them at 1.45 m: y = floorY − 680)
  wallCabinet: ({w = 1400, color} = {}) => { const c = T(col(color, 'cabinet')), n = Math.max(1, Math.round(w / 350)), dw = w / n;
    return g({}, rect(-w / 2, -360, w, 360, c.base), ...Array.from({length: n}, (_, i) => g({}, rect(-w / 2 + i * dw + 12, -346, dw - 24, 332, c.light, THIN), rect(-w / 2 + i * dw + dw / 2 - 30, -40, 60, 12, P('metal'), {rx: 6, ink: false}))), rect(-w / 2 - 14, -376, w + 28, 26, c.shade, {rx: 4})); },
  // a fridge: 0.7 m × 1.85 m
  fridge: ({color} = {}) => { const c = T(col(color, 'fridge')); return g({}, path(rrect(-170, -870, 340, 860, 24), c.base), rect(-170, -560, 340, 12, c.shade, NI), rect(110, -830, 16, 220, P('metalLight'), {rx: 8}), rect(110, -520, 16, 300, P('metalLight'), {rx: 8}), rect(-150, -850, 60, 820, c.light, NI), rect(-150, -12, 300, 12, '#3A3A40', NI)); },
  // a stand-alone cooker with an oven (0.6 m × 0.9 m) and a pot (accent)
  stove: ({color, pot = true} = {}) => g({}, SCENE.counter({w: 340, stove: 0, color: color || (isStick() ? '#E9E3D8' : '#D9DDE2')}), pot ? g({}, path(rrect(-120, -600, 240, 150, [10, 10, 30, 30]), P('accent')), rect(-140, -610, 280, 26, darken(P('accent'), 0.15), {rx: 10}), rect(-20, -640, 40, 30, darken(P('accent'), 0.15), {rx: 8})) : ''),
  // a wall shelf with jars and a small plant: origin = bottom centre of the plank
  shelf: ({w = 640, color, items = true} = {}) => { const c = wood(color), out = [];
    if (items) out.push(path(rrect(-w / 2 + 40, -150, 90, 150, 14), P('paper')), rect(-w / 2 + 40, -170, 90, 30, P('accent'), {rx: 8}), path(rrect(-w / 2 + 160, -120, 80, 120, 14), lighten(P('accent2'), 0.4)), rect(-w / 2 + 160, -138, 80, 26, P('woodDark'), {rx: 8}),
      ...[0, 1, 2, 3].map(i => rect(w / 2 - 290 + i * 34, -180 + (i % 2) * 20, 30, 180 - (i % 2) * 20, P('books')[i + 1])), path('M110 -90 L190 -90 L180 0 L120 0Z', P('pot')), cluster([[130, -140, 40, 60], [170, -150, 40, 60], [150, -180, 36, 60]], P('leaf')));
    return g({}, ...out, rect(-w / 2, 0, w, 30, c.base, {rx: 4}), path(`M${-w / 2 + 50} 30 L${-w / 2 + 50} 90 L${-w / 2 + 110} 30Z`, c.shade), path(`M${w / 2 - 50} 30 L${w / 2 - 50} 90 L${w / 2 - 110} 30Z`, c.shade)); },
  // a bookcase: 0.9 m × 1.9 m
  bookshelf: ({color, seed = 'bk'} = {}) => { const c = wood(color), out = [rect(-220, -900, 440, 900, c.base), rect(-196, -876, 392, 860, c.deep, NI)];
    for (let r = 0; r < 4; r++) { const yb = -40 - r * 215; let x = -190;
      while (x < 170) { const bw = 26 + hash(seed + r + x) * 26 | 0, bh = 130 + hash(seed + x + r * 7) * 50 | 0; if (x + bw > 190) break; out.push(rect(x, yb - bh, bw, bh, P('books')[(hash(seed + x * 3 + r) * 7) | 0], THIN)); x += bw + 2; }
      out.push(rect(-210, yb, 420, 24, c.base, THIN)); }
    return g({}, ...out); },
  // a picture frame: origin = centre. art: landscape|abstract|portrait|lantern
  frame: ({w = 360, h = 280, art = 'landscape', color} = {}) => { const fr = col(color, 'woodDark'), bg = art === 'abstract' ? P('paper') : P('sky'), ix = w / 2 - 22, iy = h / 2 - 22;   // the picture is pre-fitted to the mount (no clip)
    const pic = art === 'abstract' ? [circle(-w * 0.12, -h * 0.05, Math.min(h * 0.22, iy * 0.8), P('accent'), NI), rect(w * 0.02, -h * 0.25, w * 0.25, h * 0.45, P('accent3'), NI), rect(-w * 0.35, h * 0.12, w * 0.6, h * 0.1, P('accent2'), NI)]
      : art === 'portrait' ? [rect(-ix, -iy, ix * 2, iy * 2, lighten(P('accent2'), 0.5), NI), circle(0, -h * 0.08, h * 0.17, '#FFFFFF', THIN), path(`M${-w * 0.25} ${iy} Q0 ${-h * 0.1} ${w * 0.25} ${iy}Z`, P('accent3'), THIN)]
      : [poly([[-ix, h * 0.3], [-w * 0.1, -h * 0.25], [w * 0.15, h * 0.05], [w * 0.3, -h * 0.12], [ix, h * 0.3], [ix, iy], [-ix, iy]], P('leaf'), NI), circle(w * 0.24, -h * 0.22, h * 0.1, P('sun'), NI), rect(-ix, h * 0.25, ix * 2, iy - h * 0.25, P('grassDark'), NI)];
    return g({}, rect(-w / 2, -h / 2, w, h, fr, {rx: 4}), rect(-ix, -iy, ix * 2, iy * 2, bg, NI), ...pic, rect(-ix, -iy, ix * 2, iy * 2, 'none', isStick() ? {stroke: P('ink'), 'stroke-width': inkW(0.5)} : {})); },
  // a paper lantern: origin = the hanging point (the accent object of a warm stick set)
  lantern: ({color, drop = 160} = {}) => { const c = col(color, 'accent', true), gd = '#E7B65A';
    return g({}, line([[0, 0], [0, drop]], 5, P('woodDark')), rect(-46, drop, 92, 30, gd, {rx: 6}), ellipse(0, drop + 150, 130, 120, c), ...[-70, 0, 70].map(x => path(`M${x} ${drop + 34} Q${x * 1.7} ${drop + 150} ${x} ${drop + 266}`, 'none', {stroke: darken(c, 0.2), 'stroke-width': 5})),
      rect(-46, drop + 262, 92, 30, gd, {rx: 6}), line([[0, drop + 292], [0, drop + 340]], 5, gd), path(`M-16 ${drop + 336} L16 ${drop + 336} L22 ${drop + 440} L-22 ${drop + 440}Z`, P('accent'))); },
  // a ceiling pendant lamp: origin = the ceiling point
  pendant: ({color, drop = 520} = {}) => { const c = col(color, 'shade', true); return g({}, line([[0, 0], [0, drop]], 4, P('metal')), path(`M-150 ${drop + 120} Q-140 ${drop} 0 ${drop} Q140 ${drop} 150 ${drop + 120}Z`, c), ellipse(0, drop + 124, 40, 16, P('bulb'), NI)); },
  // a rug lying on the floor: origin = centre
  rug: ({w = 1200, h = 160, color} = {}) => { const c = col(color, 'rug'); return g({}, ellipse(0, 0, w / 2, h / 2, c), ellipse(0, 0, w / 2 - 50, h / 2 - 22, 'none', {stroke: lighten(c, 0.35), 'stroke-width': 10})); },
  nightstand: ({color, lamp = true} = {}) => { const c = wood(color); return g({}, rect(-130, -280, 260, 280, c.base), rect(-112, -262, 224, 110, c.light, THIN), rect(-112, -140, 224, 120, c.light, THIN), circle(0, -207, 10, P('woodDark'), NI), circle(0, -80, 10, P('woodDark'), NI), lamp ? g({transform: 'translate(40 -280)'}, SCENE.lamp({table: true})) : ''); },
  wardrobe: ({color} = {}) => { const c = wood(color); return g({}, rect(-250, -1000, 500, 980, c.base), rect(-236, -980, 230, 930, c.light, THIN), rect(6, -980, 230, 930, c.light, THIN), rect(-30, -560, 12, 120, P('metal'), {rx: 6}), rect(18, -560, 12, 120, P('metal'), {rx: 6}), rect(-240, -20, 30, 20, c.deep), rect(210, -20, 30, 20, c.deep)); },
  // a whiteboard (default) or chalkboard: origin = bottom centre of the board (hang at ≈ 0.9 m)
  whiteboard: ({w = 1400, h = 620, chalk = false, label = ''} = {}) => { const bg = chalk ? P('chalk') : P('board'), ink = chalk ? '#F2F0EC' : '#3E6FB8';
    return g({}, rect(-w / 2 - 20, -h - 20, w + 40, h + 40, chalk ? P('wood') : P('metalLight')), rect(-w / 2, -h, w, h, bg, NI), rect(-w / 2 + 40, -16, w * 0.4, 30, chalk ? P('woodDark') : P('metalLight'), THIN),
      label ? text(label, 0, -h / 2 + 30, font(90, 800, {fill: ink, 'font-family': 'Comic Neue, Inter Display'})) : g({}, stroke([[-w * 0.38, -h * 0.7], [-w * 0.12, -h * 0.7]], ink, 8), stroke([[-w * 0.38, -h * 0.55], [w * 0.05, -h * 0.55]], ink, 8), stroke([[w * 0.12, -h * 0.35], [w * 0.22, -h * 0.65], [w * 0.32, -h * 0.4]], P('accent'), 8), circle(w * 0.28, -h * 0.75, 30, 'none', {stroke: ink, 'stroke-width': 8}))); },
  // a school desk (0.7 m) with its chair behind it
  schoolDesk: ({color} = {}) => { const c = wood(color), m = P('metalLight'); return g({}, rod([[-240, 0], [-240, -320]], m, 16, THIN), rod([[240, 0], [240, -320]], m, 16, THIN), rect(-240, -200, 480, 16, m, THIN), rect(-290, -350, 580, 34, c.base, {rx: 6}), rect(-270, -316, 540, 60, c.shade, NI)); },
  coffeeMachine: ({color} = {}) => { const c = T(col(color, isStick() ? 'metalLight' : 'metal')); return g({}, rect(-140, -400, 280, 400, c.base, {rx: 16}), rect(-110, -240, 220, 140, '#26262B', THIN), rect(-40, -260, 80, 40, P('chrome')), rect(-30, -150, 60, 50, '#F2F0EC', THIN), circle(80, -340, 16, P('accent'), NI), circle(30, -340, 16, '#5FD38D', NI)); },
  // a round café table (0.75 m) for two
  cafeTable: ({color} = {}) => { const c = T(col(color, isStick() ? 'trim' : 'paint')), m = P('metal'); return g({}, path('M-130 0 L130 0 L100 -24 L-100 -24Z', m), rod([[0, -20], [0, -340]], m, 18, THIN), ellipse(0, -352, 300, 26, c.base), rect(-300, -352, 600, 22, c.shade, NI), ellipse(0, -356, 300, 22, c.base, NI)); },
  // an IV drip stand (2 m)
  ivStand: () => { const m = P('metalLight'); return g({}, ...[-80, 0, 80].map(x => circle(x, -14, 14, '#3A3A40')), rod([[-90, -24], [90, -24]], m, 10, THIN), rod([[0, -24], [0, -930]], m, 12, THIN), rod([[-60, -930], [60, -930]], m, 10, THIN), path(rrect(-100, -900, 90, 160, 30), lighten(P('water'), 0.4)), stroke([[-55, -740], [-60, -500], [-20, -300]], darken(P('water'), 0.1), 4)); },
  bush: ({color, w = 700, h = 380} = {}) => { const c = col(color, 'leaf', true); return cluster([[-w * 0.28, -h * 0.4, w * 0.26, h * 0.42], [0, -h * 0.6, w * 0.3, h * 0.42], [w * 0.28, -h * 0.42, w * 0.26, h * 0.4], [0, -h * 0.25, w * 0.48, h * 0.25]], c, [[w * 0.15, -h * 0.3, w * 0.25, h * 0.2]], darken(c, 0.1)); },
  cloud: ({w = 600, color} = {}) => cluster([[-w * 0.25, 0, w * 0.25, w * 0.13], [0, -w * 0.08, w * 0.22, w * 0.17], [w * 0.22, 0, w * 0.22, w * 0.12]], col(color, 'cloud')),
  hydrant: ({color} = {}) => { const c = T(col(color, 'accent', true)); return g({}, rect(-90, -40, 180, 40, c.shade, {rx: 8}), path(rrect(-60, -280, 120, 250, 20), c.base), rect(-100, -200, 200, 50, c.base, {rx: 20}), path('M-70 -280 Q0 -360 70 -280Z', c.shade), rect(-15, -340, 30, 30, c.shade, {rx: 6})); },
  bin: ({color} = {}) => { const c = T(col(color, isStick() ? 'cabinet' : 'metalLight')); return g({}, path('M-130 -400 L130 -400 L110 0 L-110 0Z', c.base), rect(-150, -430, 300, 40, c.shade, {rx: 12}), ...[-60, 0, 60].map(x => stroke([[x, -360], [x * 0.85, -40]], c.shade, 8))); },
  waterTank: () => { const m = P('metal'), c = isStick() ? '#C9A27E' : '#8E6E52'; return g({}, ...[-220, 220].map(x => rod([[x, 0], [x * 0.7, -400]], m, 18, THIN)), rod([[-200, -200], [200, -200]], m, 12, THIN), path(rrect(-300, -1050, 600, 660, 30), c), ...[-1, 0, 1].map(i => rect(-300, -900 + i * 200, 600, 16, darken(c, 0.25), NI)), path('M-320 -1050 L0 -1250 L320 -1050Z', darken(c, 0.15))); },
  // string lights hung between (0,0) and (x2, y2) with a sag
  stringLights: ({x2 = 1600, y2 = 0, sag = 160, n = 12, color} = {}) => { const pt = u => [x2 * u, y2 * u + Math.sin(u * Math.PI) * sag], pts = Array.from({length: 33}, (_, i) => pt(i / 32)), bulb = col(color, 'bulb', true);
    return g({}, stroke(pts, isStick() ? P('ink') : '#2B2B30', 4), ...Array.from({length: n}, (_, i) => { const [x, y] = pt((i + 0.5) / n); return g({}, rect(x - 7, y, 14, 14, '#2B2B30', NI), ellipse(x, y + 32, 15, 22, i % 4 === 1 ? P('accent') : bulb, THIN)); })); },
  // a bus seat pair, seen from the side (back 1.1 m): origin = floor under the seat
  busSeat: ({color} = {}) => { const c = T(col(color, isStick() ? 'accent3' : 'accent3')), m = P('metalLight'); return g({}, rod([[0, 0], [0, -210]], m, 22, THIN), path(rrect(-170, -260, 300, 60, 20), c.base), path(rrect(80, -560, 70, 360, [30, 30, 10, 10]), c.shade), rod([[115, -560], [115, -610]], m, 22, THIN)); },
  poster: ({w = 300, h = 420, color} = {}) => { const c = col(color, 'accent3', true); return g({}, rect(-w / 2, -h, w, h, P('paper')), rect(-w / 2 + 24, -h + 24, w - 48, h * 0.55, c, NI), circle(0, -h * 0.65, w * 0.14, P('accent2'), NI), rect(-w / 2 + 30, -h * 0.3, w * 0.6, 18, darken(P('paper'), 0.25), NI), rect(-w / 2 + 30, -h * 0.2, w * 0.4, 18, darken(P('paper'), 0.25), NI)); },
});

/** the drawing function for a prop type (scene props first, then held items standing in the set) */
export const propFn = type => SCENE[type] || (HELD[type] && (sp => HELD[type](sp.s || 1, sp.label)));
export function sceneProp(spec, t) {
  const f = propFn(spec.type); if (!f) return '';
  const op = spec.opacity; if (op !== undefined && op <= 0) return '';   // invisible: draw nothing
  const guard = op !== undefined && op < 1 ? GUARD : '';   // an opacity group off canvas panics resvg: GUARD keeps it on (it costs a full-canvas layer, so only while fading)
  return withStyle(spec.style, () => layer('prop:' + (spec.id || spec.type), {transform: tr(spec.x || 0, spec.y || 0, spec.rot || 0, (spec.flip ? -1 : 1) * (spec.scale ?? 1), spec.scale ?? 1), opacity: op}, guard, f(spec, t)));
}

// =====================================================================================================================
// THE LAST BUS (night world): story props. Real scale unless noted. Flat shapes + same-hue shade shapes, no clips.
// =====================================================================================================================
/** the night palette shared by the Last Bus sets and props (graded later by fx.mjs; these are the "lit" colours) */
export const NIGHT = {
  busWall: '#93A28F', busWallLow: '#5E7066', busTrim: '#B2AB92', busCeil: '#C3C9B8', vinyl: '#8E3A3C', vinylB: '#2F6E73', chrome: '#B9C1C4', rubber: '#2A2E31',
  tube: '#F2FAFF', tubeOff: '#7F8A90', glass: '#1B2A3A', glassFog: '#9DB0C2', sky: '#0E1726', skyLow: '#2A3A52', fog: '#8FA2B8', road: '#22262C', roadWet: '#2E3640',
  pole: '#1A1D22', sodium: '#FFB25C', candle: '#FFC65A', bulb: '#FFC963', tarp: '#2F5E9E', bamboo: '#8E6C40', tin: '#7C8C8E',
  busRed: '#B3392F', busCream: '#E6D9B5', khaki: '#B49A6A', olive: '#5C6236', marigold: '#F39A1E', marigold2: '#F7C531',
};
const NF = {'font-family': 'Inter Display', 'font-weight': 900, 'text-anchor': 'middle'};
const MONO = {'font-family': 'JetBrains Mono', 'font-weight': 600, 'text-anchor': 'middle'};
/** a soft radial glow (userSpace gradient, fill-opacity: resvg-safe off canvas) */
function propGlow(cx, cy, r, color, k) { const gid = id('pg');
  return el('defs', {}, el('radialGradient', {id: gid, cx, cy, r, gradientUnits: 'userSpaceOnUse'}, el('stop', {offset: 0, 'stop-color': color, 'stop-opacity': k}), el('stop', {offset: 0.4, 'stop-color': color, 'stop-opacity': k * 0.45}), el('stop', {offset: 1, 'stop-color': color, 'stop-opacity': 0}))) + rect(cx - r, cy - r, r * 2, r * 2, `url(#${gid})`, NI); }
const smoothNoise = (s, t, hz) => { const h1 = hash(s + 'a'), h2 = hash(s + 'b'), h3 = hash(s + 'c'), f = Math.min(hz, 4.8);
  return (Math.sin(2 * Math.PI * (f * 0.37 * t + h1)) * 0.5 + Math.sin(2 * Math.PI * (f * 0.61 * t + h2)) * 0.3 + Math.sin(2 * Math.PI * (f * t + h3)) * 0.2); };
/** a lit bulb level for a flickering bulb (deterministic in t; dips are brief, ≤ ~5 per second) */
export function bulbFlicker(seed, t, rate = 0.8) {
  const slot = Math.floor(t * rate), u = t * rate - slot; let lv = 1;
  for (const k of [slot - 1, slot]) { const h = hash(seed + ':' + k); if (h > 0.55) continue; const a = (k + hash(seed + 'a' + k) * 0.8) / rate, d = 0.05 + 0.12 * hash(seed + 'd' + k), dp = 0.5 + 0.5 * hash(seed + 'p' + k);
    const tt = t; const w = Math.min(Math.max(0, Math.min(1, (tt - a + 0.02) / 0.04)), Math.max(0, Math.min(1, (a + d - tt + 0.02) / 0.04))); lv = Math.min(lv, 1 - dp * w);
    if (h < 0.18) { const a2 = a + d + 0.1, d2 = 0.05; const w2 = Math.min(Math.max(0, Math.min(1, (tt - a2 + 0.02) / 0.04)), Math.max(0, Math.min(1, (a2 + d2 - tt + 0.02) / 0.04))); lv = Math.min(lv, 1 - dp * 0.8 * w2); } }
  void u; return lv;
}

// ---------- a red plastic (monobloc) chair: seat 0.45 m, back 0.85 m. upside: legs up (origin = the seat face on the table) ----------
function plasticChair({color, upside = false, part = 'all'} = {}) {
  const c = T(col(color, 'accent', true)), back = [], front = [];
  back.push(path(rrect(-108, -400, 216, 178, [40, 40, 12, 12]), c.base), ...[0, 1, 2].map(i => rect(-70, -370 + i * 40, 140, 16, c.deep, {rx: 8, ink: false})), rect(40, -400, 68, 178, c.shade, {rx: 12, ink: false}));
  front.push(...[[-112, -205, -138, 0], [112, -205, 138, 0]].map(([x1, y1, x2, y2]) => poly([[x1 - 18, y1], [x1 + 18, y1], [x2 + 14, y2], [x2 - 22, y2]], c.shade)),
    ...[[-78, -205, -92, -14], [78, -205, 92, -14]].map(([x1, y1, x2, y2]) => poly([[x1 - 14, y1], [x1 + 14, y1], [x2 + 12, y2], [x2 - 12, y2]], c.deep, NI)),
    path(rrect(-158, -300, 50, 26, 12), c.base), path(rrect(108, -300, 50, 26, 12), c.base), rect(-150, -285, 22, 70, c.shade, NI), rect(128, -285, 22, 70, c.shade, NI),
    path(rrect(-128, -238, 256, 40, 16), c.base), rect(-128, -212, 256, 14, c.shade, {rx: 7, ink: false}), rect(-100, -232, 120, 8, c.light, {rx: 4, ink: false}));
  const parts = part === 'back' ? back : part === 'front' ? front : [...back, ...front];
  return upside ? g({transform: 'translate(0 -212) scale(1 -1)'}, ...parts) : g({}, ...parts);
}

// ---------- the roadside chai stall (2.6 m wide, tarp roof 2.4 m). lit: the bulb (0..1; or keyed/flicker via `t` + `flicker`) ----------
function teaStall({lit = 1, t = 0, flicker = true, seed = 'stall', glow: glowOn = true} = {}) {
  const L = flicker ? lit * bulbFlicker(seed, t) : lit, bulbC = mixHex('#4E4636', NIGHT.bulb, L), out = [];
  const bam = T(NIGHT.bamboo), tarp = T(NIGHT.tarp), wood = T('#7A5634'), tin = T(NIGHT.tin);
  out.push(rect(-600, -1060, 1200, 1060, '#1E2530', NI), rect(-600, -1060, 1200, 120, '#151A22', NI));   // the dark inside
  out.push(...[-560, 560].map(x => rod([[x - 8, 0], [x + 6, -1130]], bam.shade, 30)));                 // back poles
  // tarp roof: a sagging front edge, folds, a rope
  const edge = []; for (let i = 0; i <= 12; i++) { const x = -700 + i * 1400 / 12; edge.push([x, -1010 + Math.sin(i * Math.PI) * 0 + (i % 2 ? 26 : 0)]); }
  out.push(poly([[-760, -1230], [760, -1230], [700, -1010], ...edge.slice().reverse()], tarp.base), poly([[-760, -1230], [760, -1230], [740, -1170], [-740, -1170]], tarp.light, NI),
    ...[-420, -60, 300].map(x => poly([[x, -1225], [x + 60, -1225], [x + 30, -1012], [x - 10, -1012]], tarp.shade, NI)),
    stroke([[-760, -1180], [-700, -1100], [-640, -1060]], '#C9B58A', 5));
  out.push(path(rrect(-300, -1210, 600, 120, 8), '#E9DCC0'), rect(-300, -1210, 600, 26, '#C7342C', NI), text('CHAI', 0, -1112, {...NF, 'font-size': 76, fill: '#C7342C'}), rect(150, -1180, 140, 80, '#D9C9A6', NI));   // a hand-painted sign
  // the bulb on its wire
  out.push(stroke([[-150, -1010], [-152, -830]], '#151515', 4), rect(-166, -838, 28, 26, '#3A3A3A', {rx: 4}), circle(-152, -796, 26, bulbC, THIN), circle(-160, -804, 9, mixHex(bulbC, '#FFFFFF', 0.5 * L), NI));
  // counter (left): tin front with faded paint, plank top at 0.77 m, stove + kettle, jars, tumblers
  out.push(rect(-600, -362, 760, 362, tin.base), rect(-600, -362, 760, 30, wood.base), rect(-600, -332, 760, 18, wood.shade, NI), rect(-560, -300, 680, 180, mixHex(tin.base, '#C7342C', 0.35), NI),
    text('GARAM CHAI', -220, -190, {...NF, 'font-size': 58, fill: mixHex('#F2E3B8', tin.base, 0.3)}), ...[-520, -100, 120].map(x => rect(x, -318, 8, 300, tin.shade, NI)));
  out.push(rect(-520, -420, 200, 58, '#2C2C30'), ellipse(-420, -420, 80, 10, '#1A1A1E', NI));   // stove
  const k = T('#B9C0C6'); out.push(path('M-500 -430 L-340 -430 L-350 -560 Q-420 -600 -490 -560Z', k.base), path('M-420 -430 L-340 -430 L-350 -560 Q-385 -585 -420 -590Z', k.shade, NI),
    path('M-350 -520 L-280 -575 L-268 -565 L-340 -500Z', k.base), path('M-470 -585 Q-420 -660 -370 -585', 'none', {stroke: '#2A2A2E', 'stroke-width': 10, 'stroke-linecap': 'round'}), ellipse(-420, -594, 30, 8, k.light, NI),
    ellipse(-460, -500, 18, 26, k.light, NI));
  for (let i = 0; i < 3; i++) { const x = -230 + i * 105; out.push(path(rrect(x - 40, -480, 80, 118, 14), '#9DB8BE'), rect(x - 34, -440, 68, 72, ['#D99A3E', '#C9783A', '#E3B65A'][i], {ink: false, rx: 8}), rect(x - 44, -500, 88, 26, '#C7342C', {rx: 6}), rect(x - 30, -470, 12, 90, '#E8F1F2', {ink: false, rx: 4})); }
  for (let i = 0; i < 4; i++) out.push(path(`M${50 + i * 26} -362 L${70 + i * 26} -362 L${74 + i * 26} -${400 + (i % 2) * 10} L${46 + i * 26} -${400 + (i % 2) * 10}Z`, '#C9CED2', THIN));
  // the side table with the red chair upside down on it
  const tx = 360, ty = -330;
  out.push(g({transform: tr(tx, ty)}, plasticChair({upside: true, part: 'back'})));
  out.push(rect(tx - 190, ty, 380, 26, wood.base), rect(tx - 175, ty + 26, 22, -ty - 26, wood.shade), rect(tx + 153, ty + 26, 22, -ty - 26, wood.shade), rect(tx - 170, ty + 120, 340, 14, wood.deep, NI));
  out.push(g({transform: tr(tx, ty)}, plasticChair({upside: true, part: 'front'})));
  // front poles, a low bench, a bucket
  out.push(...[-680, 680].map(x => rod([[x, 30], [x + (x < 0 ? 18 : -18), -1060]], bam.base, 34)), ...[-680, 680].map(x => rod([[x + 8, 30], [x + (x < 0 ? 26 : -10), -1060]], bam.shade, 10, NI)));
  out.push(rect(-520, -210, 520, 26, wood.base, {rx: 4}).replace('<rect', '<rect transform="translate(-60 120)"'));
  out.push(g({transform: 'translate(-330 70)'}, rect(-240, -200, 480, 28, wood.base, {rx: 4}), rect(-220, -172, 20, 172, wood.shade), rect(200, -172, 20, 172, wood.shade)));
  out.push(path('M560 70 L700 70 L680 -80 L580 -80Z', '#5B6E80'), ellipse(630, -80, 52, 10, '#3E4B57', NI));
  if (L > 0.02 && glowOn) out.push(propGlow(-152, -796, 260, NIGHT.bulb, 0.5 * L), poly([[-200, -790], [-104, -790], [260, -362], [-560, -362]], NIGHT.bulb, {ink: false, 'fill-opacity': +(0.10 * L).toFixed(3)}));
  return g({}, ...out);
}

// ---------- the cake box (26 cm): a bakery box opened on her lap, a round frosted cake, one candle ----------
// open: the white box with its lid swung up behind (the kraft inside lit by the candle), the low front wall printed with
// the bakery's name, a round cake (strawberry frosting, glaze drips, a piped shell border top and bottom, sprinkles, two
// rosettes, "Happy Birthday" piped on top) and one striped candle: straight below, bent over toward the frosting by
// `bend` (0..1) with a wax drip, its flame always upright, breathing (smooth noise < 5 Hz) with a soft glow.
// Seen from a little above (circles are ellipses, ry ≈ 0.28 rx). Origin = the bottom centre of the box. closed: lid
// down, a red ribbon (also HELD).
function cakeBox({open = true, bend = 0, flame = true, smoke = false, t = 0, frosting = '#F2B4C4', seed = 'cake', glow: glowOn = true} = {}) {
  const out = [], W = 130, wh = open ? 26 : 58, box = T('#F2EEE4');
  if (!open) {
    out.push(poly([[-W / 2 - 4, -wh - 26], [W / 2 + 4, -wh - 26], [W / 2, -wh], [-W / 2, -wh]], box.light), rect(-W / 2, -wh, W, wh, box.base, {rx: 3}), rect(W / 2 - 26, -wh, 26, wh, box.shade, NI), rect(-W / 2, -wh, W, 5, box.light, NI),
      rect(-8, -wh - 26, 16, wh + 26, '#C7342C', NI), rect(-W / 2, -wh * 0.55, W, 12, '#C7342C', NI), path('M0 -84 q-22 -18 -26 -2 q4 10 26 2 q22 -18 26 -2 q-4 10 -26 2Z', '#C7342C'));
    return g({}, ...out);
  }
  const fr = T(frosting), top = lighten(frosting, 0.32), kraft = '#E2D3B4', kraftDk = '#C4B08A', cream = '#FFF6EC', creamDk = '#E9D9CC';
  const back = -wh - 30, cx0 = 0, cyB = -wh - 8, cyT = cyB - 34, rx = 50, ry = 14;
  // the flame's breathing (shared by the flame, its glow and the light on the lid and cake)
  const sy = 1 + 0.14 * smoothNoise(seed + 'fy', t, 3.4) + 0.06 * smoothNoise(seed + 'fz', t, 4.6), sx = 1 + 0.06 * smoothNoise(seed + 'fx', t, 2.6), sw = 1.6 * smoothNoise(seed + 'sw', t, 2.2), fl = flame ? 0.92 + 0.08 * sy : 0;
  out.push(ellipse(0, 2, W * 0.62, 9, '#000000', {ink: false, 'fill-opacity': 0.3}));   // its shadow on her lap
  // the lid, swung up and leaning back: kraft inside, a tuck flap folded over its top edge, the side dust flaps
  out.push(poly([[-W / 2 + 4, back], [W / 2 - 4, back], [W / 2 - 10, back - 60], [-W / 2 + 10, back - 60]], kraft, NI),
    poly([[W / 2 - 4, back], [W / 2 - 26, back], [W / 2 - 30, back - 60], [W / 2 - 10, back - 60]], kraftDk, NI),
    poly([[-W / 2 + 10, back - 60], [W / 2 - 10, back - 60], [W / 2 - 13, back - 70], [-W / 2 + 13, back - 70]], box.light, NI),
    poly([[-W / 2 + 5, back - 8], [-W / 2 - 3, back - 30], [-W / 2 + 9, back - 44]], box.light, NI), poly([[W / 2 - 5, back - 8], [W / 2 + 3, back - 30], [W / 2 - 9, back - 44]], box.shade, NI));
  for (let i = 0; i < 6; i++) out.push(rect(-W / 2 + 14, back - 8 - i * 9.5, W - 28 - (i % 2) * 14, 0.8, kraftDk, {ink: false, 'fill-opacity': 0.22}));   // corrugation grain
  if (flame && glowOn) out.push(propGlow(10, back - 34, 70, NIGHT.candle, 0.42 * fl));   // the candle lights the lid
  // the tray: inner back wall and sides (kraft), the floor
  out.push(poly([[-W / 2, -wh], [-W / 2 + 4, back], [W / 2 - 4, back], [W / 2, -wh]], mixHex(kraft, '#FFFFFF', 0.25), NI), poly([[-W / 2, -wh], [-W / 2 + 4, back], [-W / 2 + 12, back + 4], [-W / 2 + 8, -wh]], kraftDk, NI));
  // the cake: side (shaded), glaze drips, top, base shell border, top shell border, sprinkles, rosettes, piping
  out.push(ellipse(cx0, cyB + 2, rx + 3, ry, '#000000', {ink: false, 'fill-opacity': 0.25}));
  out.push(path(`M${-rx} ${cyT} L${-rx} ${cyB} A${rx} ${ry} 0 0 0 ${rx} ${cyB} L${rx} ${cyT}Z`, fr.base, NI),
    path(`M${rx * 0.38} ${cyT + ry * 0.92} L${rx * 0.38} ${cyB + ry * 0.92} A${rx} ${ry} 0 0 0 ${rx} ${cyB} L${rx} ${cyT}Z`, fr.shade, NI),
    path(`M${-rx} ${cyT} L${-rx} ${cyB} A${rx} ${ry} 0 0 0 ${-rx * 0.72} ${cyB + ry * 0.7} L${-rx * 0.72} ${cyT + ry * 0.7}Z`, lighten(frosting, 0.12), NI));
  for (let i = 0; i < 9; i++) { const u = -0.86 + i * 0.215, x = u * rx, y0 = cyT + Math.sqrt(1 - u * u) * ry - 1, L = 5 + 10 * hash(seed + 'dr' + i);   // glaze drips down the front
    out.push(path(`M${x - 3.4} ${y0} L${x - 3} ${y0 + L} Q${x} ${y0 + L + 4.4} ${x + 3} ${y0 + L} L${x + 3.4} ${y0}Z`, i > 5 ? mixHex(top, fr.shade, 0.35) : top, NI)); }
  out.push(ellipse(cx0, cyT, rx, ry, top, NI), ellipse(cx0 - 6, cyT - 2, rx * 0.72, ry * 0.6, lighten(top, 0.25), {ink: false, 'fill-opacity': 0.7}));
  const eD = (x, y, rx, ry, rot = 0) => { const c = Math.cos(rot * Math.PI / 180), s2 = Math.sin(rot * Math.PI / 180), f2 = v => +v.toFixed(2);
    return `M${f2(x - rx * c)} ${f2(y - rx * s2)}a${rx} ${ry} ${f2(rot)} 1 0 ${f2(2 * rx * c)} ${f2(2 * rx * s2)}a${rx} ${ry} ${f2(rot)} 1 0 ${f2(-2 * rx * c)} ${f2(-2 * rx * s2)}`; };
  const shells = (cy, rr, n, a0, a1, c, s = 1) => { let d1 = '', d2 = ''; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n, x = Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.28, rot = Math.cos(a) * 25;
    d1 += eD(x, y, 4.6 * s, 3.2 * s, rot); d2 += eD(x - 1.2 * s, y - 1 * s, 1.8 * s, 1.1 * s); }
    out.push(path(d1, c, NI), path(d2, '#FFFFFF', {ink: false, 'fill-opacity': 0.7})); };
  shells(cyB, rx + 1, 15, 0.08, Math.PI - 0.08, cream, 1.05);   // the base border (front half)
  shells(cyT, rx - 1, 14, Math.PI + 0.12, 2 * Math.PI - 0.12, creamDk);   // the top border (back half, behind)
  const SPR = ['#F7C531', '#5FC2B6', '#7DB8F0', '#F39A1E', '#FFFFFF', '#9BD18A'];
  for (let i = 0; i < 30; i++) { const a = hash(seed + 'sa' + i) * Math.PI * 2, r = 0.3 + 0.62 * Math.sqrt(hash(seed + 'sr' + i)), x = Math.cos(a) * rx * r, y = cyT + Math.sin(a) * ry * r;
    if (Math.abs(y - cyT - 4.5) < 3.5 && Math.abs(x + 6) < 30) continue; out.push(rect(x - 1.3, y - 0.5, 2.6, 1, SPR[i % SPR.length], {ink: false, rx: 0.6, transform: `rotate(${Math.round(hash(seed + 'sq' + i) * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`})); }
  for (const [x, y] of [[-32, cyT - 5], [-14, cyT - 9.5]]) { for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3; out.push(ellipse(x + Math.cos(a) * 3.2, y + Math.sin(a) * 1.4 - 1, 2.6, 1.9, q < 3 ? creamDk : cream, NI)); } out.push(ellipse(x, y - 1.6, 2.2, 1.5, '#FFFFFF', NI), circle(x + 0.6, y - 2.4, 1.3, '#D8344A', NI)); }
  out.push(text('Happy Birthday', -6, cyT + 5.5, {'font-family': 'Instrument Serif', 'font-style': 'italic', 'font-size': 9.5, fill: '#7B3A24', 'text-anchor': 'middle', transform: `translate(0 ${(cyT + 5.5) * 0.45}) scale(1 0.55)`}));
  shells(cyT, rx - 1, 16, 0.1, Math.PI - 0.1, cream);   // the top border (front half)
  // the candle: the lower part stands in the frosting, the upper part bends over by `bend`; spiral stripes; a wax drip
  const base = [16, cyT - 5], L1 = 15, L2 = 19, th = clampN(bend) * 70 * Math.PI / 180, mid = [base[0], base[1] - L1], tip = [mid[0] + Math.sin(th) * L2, mid[1] - Math.cos(th) * L2];
  const ctl = [mid[0] + Math.sin(th) * L2 * 0.3, mid[1] - Math.cos(th) * L2 * 0.55];
  const cp = `M${base[0]} ${base[1]} L${mid[0]} ${mid[1]} Q${ctl[0].toFixed(2)} ${ctl[1].toFixed(2)} ${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`;
  out.push(ellipse(base[0], base[1], 5, 1.8, darken(top, 0.18), NI), path(cp, 'none', {stroke: '#F6F4EE', 'stroke-width': 5.6, 'stroke-linecap': 'round', ink: false}), path(cp, 'none', {stroke: '#D8D4CC', 'stroke-width': 1.6, 'stroke-linecap': 'round', ink: false, transform: 'translate(1.6 0)'}));
  const qpt = u => { const a = 1 - u; return [a * a * mid[0] + 2 * a * u * ctl[0] + u * u * tip[0], a * a * mid[1] + 2 * a * u * ctl[1] + u * u * tip[1]]; };
  const along = []; for (let i = 1; i < 4; i++) along.push([base[0], base[1] - L1 * i / 4, 0]); for (let i = 0; i < 5; i++) { const u = i / 5, p = qpt(u), q = qpt(u + 0.05); along.push([p[0], p[1], Math.atan2(q[0] - p[0], -(q[1] - p[1]))]); }
  void along; out.push(path(cp, 'none', {stroke: '#E0466A', 'stroke-width': 5.6, 'stroke-dasharray': '2.2 3.4', ink: false}), path(cp, 'none', {stroke: '#FFFFFF', 'stroke-width': 1.2, 'stroke-opacity': 0.7, ink: false, transform: 'translate(-1.4 0)'}));
  out.push(path(`M${(mid[0] + 2.6).toFixed(1)} ${(mid[1] + 1).toFixed(1)} q1.6 4 0.6 7 q-1.2 1.6 -1.8 0Z`, '#F2F0EA', NI));   // a wax drip down the bend
  const wick = [tip[0] + Math.sin(th) * 2.5, tip[1] - Math.cos(th) * 2.5 - 1];
  out.push(path(`M${tip[0].toFixed(1)} ${tip[1].toFixed(1)} Q${(wick[0] + 0.6).toFixed(1)} ${(wick[1] + 1).toFixed(1)} ${wick[0].toFixed(1)} ${wick[1].toFixed(1)}`, 'none', {stroke: '#1E1A16', 'stroke-width': 1.3, ink: false}));
  if (bend > 0.3) out.push(ellipse(tip[0] + 2, cyT + 1, 3.2, 1.2, '#F4F2EA', NI), ellipse(tip[0] - 2, cyT + 3, 1.8, 0.8, '#F4F2EA', NI));   // wax dripped onto the frosting below the tip
  if (flame) {   // the flame always points up; it breathes and sways (smooth noise, < 5 Hz)
    const fh = 20 * sy, fw = 6.4 * sx, [x, y] = wick;
    if (glowOn) out.push(propGlow(x, y - fh * 0.45, 46, NIGHT.candle, 0.5 * fl), propGlow(x, cyT, 60, NIGHT.candle, 0.28 * fl));
    const teardrop = (h, w, dy = 0) => `M${x} ${y + 2 + dy} C${x - w * 1.6} ${y - h * 0.18 + dy} ${x - w * 0.45 + sw} ${y - h * 0.72 + dy} ${x + sw * 1.5} ${y - h + dy} C${x + w * 0.55 + sw} ${y - h * 0.72 + dy} ${x + w * 1.6} ${y - h * 0.18 + dy} ${x} ${y + 2 + dy}Z`;
    out.push(path(teardrop(fh * 1.12, fw * 1.25), '#FF9A2E', {ink: false, 'fill-opacity': 0.55}), path(teardrop(fh, fw), '#FFB93E', NI), path(teardrop(fh * 0.72, fw * 0.66, 0.5), '#FFE48A', NI),
      path(teardrop(fh * 0.4, fw * 0.36, 1), '#FFFBEA', NI), ellipse(x, y + 0.5, 2.2, 3.4, '#5B7BE0', {ink: false, 'fill-opacity': 0.85}), stroke([[x, y + 1.6], [x + 0.4, y - 2]], '#2A1A10', 1));
  } else if (smoke) {   // a thread of smoke: rises, curls, fades (sways < 1 Hz)
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([wick[0] + Math.sin(u * 5 + t * 1.6) * (3 + u * 14) + u * 8, wick[1] - u * 170]); }
    out.push(path('M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'), 'none', {stroke: '#C9CCD2', 'stroke-width': 3, 'stroke-opacity': 0.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}),
      path('M' + pts.slice(6).map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'), 'none', {stroke: '#C9CCD2', 'stroke-width': 7, 'stroke-opacity': 0.12, 'stroke-linecap': 'round'}));
  }
  // the low front wall of the box (white, printed), its rim, the side flaps folded out
  out.push(rect(-W / 2, -wh, W, wh, box.base, {rx: 2, ink: false}), rect(W / 2 - 22, -wh, 22, wh, box.shade, NI), rect(-W / 2, -wh, W, 3.4, '#FFFFFF', NI), rect(-W / 2, -wh + 3.4, W, 1.2, kraftDk, NI),
    rect(-W / 2, -wh + 6, W, 3, '#C7342C', NI), text('Sweet Home', -8, -wh + 18.5, {'font-family': 'Instrument Serif', 'font-style': 'italic', 'font-size': 12.5, fill: '#9C3A22', 'text-anchor': 'middle'}),
    text('BAKERS · SINCE 1978', -8, -wh + 24, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 3.6, fill: '#9C3A22', 'text-anchor': 'middle', 'letter-spacing': 0.6}),
    ellipse(-40, -8, 10, 3, '#B9AE96', {ink: false, 'fill-opacity': 0.35}));   // a thumb smudge
  if (flame && glowOn) out.push(propGlow(10, -wh, 60, NIGHT.candle, 0.2 * fl));
  return g({}, ...out);
}
const clampN = (x, a = 0, b = 1) => Math.min(b, Math.max(a, +x || 0));

// ---------- a bus destination board (LED, amber). text keyable; flip 0..1 squashes `prev` out and `text` in ----------
function destinationBoard({text: label = 'CITY CENTRE', prev = null, change = 1, route = '', w = 760, h = 150, color = '#FFB23F', t = 0} = {}) {
  const out = [], f = clampN(change), showPrev = prev != null && f < 0.5, s = prev == null ? 1 : Math.abs(Math.cos(f * Math.PI)), str = showPrev ? prev : label;
  const rw = route ? h * 1.15 : 0, cx = rw / 2, fs = Math.min(h * 0.56, (w - rw - 60) / Math.max(4, String(str).length) * 1.6);
  out.push(path(rrect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 36, 14), '#3A3D42'), rect(-w / 2, -h / 2, w, h, '#0B0C0E', NI));
  const glowT = (v, x, size) => g({}, text(v, x, size * 0.36, {...MONO, 'font-size': size, fill: color, 'fill-opacity': 0.35, 'stroke': color, 'stroke-width': size * 0.12, 'stroke-opacity': 0.25}), text(v, x, size * 0.36, {...MONO, 'font-size': size, fill: lighten(color, 0.25)}));
  out.push(g({transform: `translate(${cx} 0) scale(1 ${Math.max(0.02, s).toFixed(3)})`}, glowT(str, 0, fs)));
  if (route) out.push(rect(-w / 2 + 8, -h / 2 + 8, rw - 16, h - 16, '#14161A', NI), glowT(route, -w / 2 + rw / 2, h * 0.5), rect(-w / 2 + rw - 4, -h / 2 + 10, 4, h - 20, '#26292E', NI));
  // the LED dot grid over the panel (pre-blended rows: no pattern element, cheap)
  for (let y = -h / 2 + 6; y < h / 2; y += 9) out.push(rect(-w / 2, y, w, 2.4, '#0B0C0E', {ink: false, 'fill-opacity': 0.55}));
  if (prev != null && f > 0 && f < 1) out.push(rect(-w / 2, -1.5, w, 3, color, {ink: false, 'fill-opacity': 0.5 * Math.sin(f * Math.PI)}));
  out.push(path(`M${-w / 2} ${-h / 2} L${-w / 2 + w * 0.35} ${-h / 2} L${-w / 2 + w * 0.25} ${h / 2} L${-w / 2} ${h / 2}Z`, '#FFFFFF', {ink: false, 'fill-opacity': 0.04}));
  void t; return g({}, ...out);
}

// ---------- a string of birthday pennants with one letter each; origin = the left tie point, (w, dy) the right ----------
function birthdayBanner({text: label = 'HAPPY BIRTHDAY', w = 900, dy = 0, sag = 90, colors = ['#F7C531', '#F2829A', '#E2453C', '#5FC2B6', '#F39A1E']} = {}) {
  const ch = [...String(label)], n = ch.length, out = [], pt = u => [w * u, dy * u + Math.sin(u * Math.PI) * sag];
  out.push(stroke(Array.from({length: 25}, (_, i) => pt(i / 24)), '#3A3328', 4));
  const fw = Math.max(40, Math.min(120, w / n * 0.92)), fh = fw * 1.25;
  ch.forEach((c, i) => { if (c === ' ') return; const u = (i + 0.5) / n, [x, y] = pt(u), col0 = colors[i % colors.length], ang = Math.atan2(pt(u + 0.01)[1] - y, w * 0.01) * 180 / Math.PI;
    out.push(g({transform: tr(x, y + 2, ang)}, poly([[-fw / 2, 0], [fw / 2, 0], [0, fh]], col0), poly([[fw * 0.1, 0], [fw / 2, 0], [0, fh]], darken(col0, 0.12), NI), text(c, 0, fh * 0.42, {...NF, 'font-size': fw * 0.5, fill: '#2A2522'}))); });
  return g({}, ...out);
}

// ---------- the four silent passengers' objects (real scale; also HELD) ----------
/** a marigold wedding garland: origin = the top centre (the neck); w = across the shoulders, drop = how low it hangs */
function garland({w = 230, drop = 330, color} = {}) {
  const out = [], n = 34, c1 = col(color, null) || NIGHT.marigold;
  const pt = u => { const a = u * Math.PI; return [-Math.cos(a) * w / 2 * (1 - 0.15 * Math.sin(a)), Math.sin(a) * drop]; };
  for (let i = 0; i <= n; i++) { const [x, y] = pt(i / n), c = i % 3 === 1 ? NIGHT.marigold2 : i % 7 === 3 ? '#E2453C' : c1;
    out.push(circle(x, y, 17, darken(c, 0.18), NI), circle(x - 1, y - 2, 15, c, THIN), circle(x - 4, y - 5, 5, lighten(c, 0.35), NI)); }
  out.push(g({transform: `translate(0 ${drop + 8})`}, stroke([[0, 0], [0, 60]], NIGHT.marigold, 6), circle(0, 70, 18, '#C7342C'), circle(-4, 66, 7, '#E86A5A', NI), ...[-1, 1].map(s2 => path(`M0 78 l${s2 * 10} 28 l${-s2 * 6} 2Z`, '#3E8E4A', NI))));
  return g({}, ...out);
}
/** a school backpack with a cricket bat strapped to it: origin = bottom centre (0.42 m bag, 0.85 m bat) */
function schoolBag({color, bat = true} = {}) {
  const c = T(col(color, null) || '#2F5FA8'), out = [];
  if (bat) out.push(g({transform: 'rotate(18 40 -180)'}, path(rrect(10, -470, 62, 300, [10, 10, 26, 26]), '#E6C98E'), rect(52, -470, 20, 300, '#C9A86A', NI), rect(30, -455, 20, 280, '#F2DDB0', NI), rect(30, -600, 22, 136, '#2A2A2E', {rx: 8}), ...[0, 1, 2, 3].map(i => rect(30, -592 + i * 30, 22, 6, '#5A5A60', NI)), rect(26, -476, 30, 14, '#B8935A', NI)));
  out.push(path('M-60 -205 Q-60 -250 0 -250 Q60 -250 60 -205', 'none', {stroke: darken(c.base, 0.3), 'stroke-width': 12, 'stroke-linecap': 'round'}),
    path(rrect(-90, -220, 180, 220, [56, 56, 22, 22]), c.base), rect(30, -210, 60, 200, c.shade, {rx: 18, ink: false}), path(rrect(-66, -110, 132, 92, 20), c.light),
    stroke([[-60, -100], [60, -100]], darken(c.base, 0.35), 4), rect(-4, -96, 8, 20, '#D9D9D9', {rx: 3}), stroke([[-80, -170], [80, -170]], darken(c.base, 0.3), 3));
  return g({}, ...out);
}
/** an Indian Army soldier's beret (olive, brass badge) or a peaked cap: origin = the bottom centre of the band (0.28 m) */
function soldierCap({kind = 'beret', color} = {}) {
  const out = [];
  if (kind === 'peaked') { const c = T(col(color, null) || '#6B6A3C');
    out.push(path('M-120 -40 Q-130 -120 0 -130 Q130 -120 120 -40Z', c.base), path('M40 -125 Q130 -115 120 -40 L60 -40Z', c.shade, NI), rect(-112, -46, 224, 40, '#2B2A20', {rx: 8}), rect(-112, -46, 224, 10, '#C9A23A', {rx: 4, ink: false}),
      path('M-110 -8 Q0 30 110 -8 L96 8 Q0 44 -96 8Z', '#141414'), circle(0, -82, 20, '#D9B44A'), circle(0, -82, 11, '#9C7A22', NI)); }
  else { const c = T(col(color, null) || '#55603A');
    out.push(path('M-118 -6 Q-140 -90 -40 -118 Q80 -140 140 -70 Q160 -30 100 -14Z', c.base), path('M40 -125 Q140 -110 140 -70 Q150 -30 100 -14 L50 -20Z', c.shade, NI),
      path(rrect(-120, -26, 236, 28, 12), '#2E2A22'), circle(-62, -62, 22, '#D9B44A'), path('M-62 -78 l6 12 l13 1 l-10 8 l4 13 l-13 -8 l-13 8 l4 -13 l-10 -8 l13 -1Z', '#9C7A22', NI)); }
  return g({}, ...out);
}
/** a hospital ID wristband (graphic close-up scale: a loop ≈ 2× life so its label reads in an insert) */
function wristband({label = 'WARD 4 · BED 12', name = 'PATIENT', color = '#F4F6F8', accent = '#3E6FB8'} = {}) {
  const out = [], rx = 120, ry = 46;
  out.push(ellipse(0, 0, rx, ry, 'none', {stroke: darken(color, 0.22), 'stroke-width': 26}), ellipse(0, 0, rx, ry, 'none', {stroke: color, 'stroke-width': 20}));
  out.push(path(rrect(-70, 20, 140, 58, 8), color), rect(-70, 20, 140, 14, accent, {rx: 4, ink: false}), text(name, 0, 31, {...NF, 'font-size': 11, fill: '#FFFFFF', 'font-weight': 800}),
    text(label, 0, 54, {...MONO, 'font-size': 13, fill: '#26262B'}), ...Array.from({length: 22}, (_, i) => rect(-52 + i * 4.8, 60, hash('bc' + i) < 0.5 ? 2 : 3.4, 12, '#26262B', NI)), circle(100, 30, 8, '#C9CED2'));
  return g({}, ...out);
}

// ---------- phone close-ups: lock screen (11:59, missed calls), voicemail player, incoming call; `cracked` overlays broken glass ----------
function phoneShell(w, h, inner, {cracked = false, crack = [0.62, 0.3], seed = 'crk'} = {}) {
  const out = [path(rrect(-w / 2 - 20, -h - 20, w + 40, h + 40, 70), '#141418'), path(rrect(-w / 2 - 12, -h - 12, w + 24, h + 24, 64), '#26262C', NI), ...inner, path(rrect(-60, -h + 12, 120, 30, 15), '#0B0B0E')];
  if (cracked) {   // impact point; jagged radial cracks; two broken rings; a few lighter shards
    const cx = -w / 2 + w * crack[0], cy = -h + h * crack[1], lines = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + hash(seed + i) * 0.5, len = (0.35 + 0.65 * hash(seed + 'l' + i)) * Math.max(w, h) * 0.75, pts = [[cx, cy]];
      for (let j = 1; j <= 6; j++) { const r = len * j / 6, a2 = a + (hash(seed + i + ':' + j) - 0.5) * 0.35; pts.push([cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]); }
      const P = pts.map(([x, y]) => [Math.max(-w / 2 + 4, Math.min(w / 2 - 4, x)), Math.max(-h + 4, Math.min(-4, y))]);
      lines.push(path('M' + P.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'), 'none', {stroke: '#FFFFFF', 'stroke-width': 2.4, 'stroke-opacity': 0.8, 'stroke-linejoin': 'round'}),
        path('M' + P.map(p => (p[0] + 2).toFixed(1) + ' ' + (p[1] + 2).toFixed(1)).join(' L'), 'none', {stroke: '#000000', 'stroke-width': 1.6, 'stroke-opacity': 0.35})); }
    for (const r of [34, 78]) { const pts = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2, rr = r * (0.8 + 0.4 * hash(seed + 'r' + r + i)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      lines.push(path('M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L'), 'none', {stroke: '#FFFFFF', 'stroke-width': 1.8, 'stroke-opacity': 0.6})); }
    for (let i = 0; i < 5; i++) { const a = hash(seed + 's' + i) * 6.28, r = 20 + 50 * hash(seed + 'q' + i); lines.push(poly([[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a + 0.5) * r * 0.8, cy + Math.sin(a + 0.5) * r * 0.8]], '#FFFFFF', {ink: false, 'fill-opacity': 0.14})); }
    lines.push(circle(cx, cy, 9, '#FFFFFF', {ink: false, 'fill-opacity': 0.5}));
    out.push(...lines);
  }
  return out;
}
function phoneLock({w, h, time = '11:59', ampm = 'PM', date = 'Saturday, 14 October', signal = 'NO SIGNAL', notifs, banner, accent}) {
  const gid = id('plk'), out = [el('defs', {}, lin(gid, 0, -h, 0, 0, [[0, '#1C2440'], [0.6, '#2B1E3A'], [1, '#10121C']])), path(rrect(-w / 2, -h, w, h, 54), `url(#${gid})`, NI),
    circle(w * 0.25, -h * 0.25, w * 0.4, '#3A2A55', {ink: false, 'fill-opacity': 0.5}), circle(-w * 0.3, -h * 0.4, w * 0.3, '#22355A', {ink: false, 'fill-opacity': 0.5})];
  out.push(text(signal, -w / 2 + 40, -h + 46, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 24, fill: '#E9E9EF', 'text-anchor': 'start'}),
    rect(w / 2 - 92, -h + 26, 52, 24, 'none', {stroke: '#E9E9EF', 'stroke-width': 3, rx: 6}), rect(w / 2 - 88, -h + 30, 10, 16, '#E2453C', {rx: 2, ink: false}), rect(w / 2 - 38, -h + 33, 5, 10, '#E9E9EF', NI));
  out.push(text(date, 0, -h + 160, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 30, fill: '#E9E9EF', 'text-anchor': 'middle'}),
    text(time, -12, -h + 330, {'font-family': 'Inter Display', 'font-weight': 700, 'font-size': 180, fill: '#F4F4F8', 'text-anchor': 'middle', 'letter-spacing': -4}),
    text(ampm, w / 2 - 50, -h + 330, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 34, fill: '#F4F4F8', 'text-anchor': 'end'}));
  const list = notifs || [{title: banner || 'MUM', body: '7 MISSED CALLS'}];
  list.forEach((nf, i) => { const y = -h + 420 + i * 150;
    out.push(path(rrect(-w / 2 + 28, y, w - 56, 128, 28), '#F2F2F6', {ink: false, 'fill-opacity': 0.92}), circle(-w / 2 + 88, y + 64, 30, accent || '#2FB15A'),
      path(`M${-w / 2 + 76} ${y + 52} q6 -6 12 0 l4 10 q-4 6 2 14 q8 8 14 4 l10 4 q6 6 0 12 q-26 8 -44 -18 q-10 -16 2 -26Z`, '#FFFFFF', NI),
      text(nf.title, -w / 2 + 136, y + 56, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 34, fill: '#16161A', 'text-anchor': 'start'}),
      text(nf.body, -w / 2 + 136, y + 98, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 28, fill: '#C7342C', 'text-anchor': 'start'}),
      text(nf.when || 'now', w / 2 - 50, y + 54, {'font-family': 'Inter', 'font-weight': 400, 'font-size': 22, fill: '#6A6A72', 'text-anchor': 'end'})); });
  out.push(circle(-w / 2 + 90, -110, 44, '#FFFFFF', {ink: false, 'fill-opacity': 0.16}), circle(w / 2 - 90, -110, 44, '#FFFFFF', {ink: false, 'fill-opacity': 0.16}), rect(-90, -36, 180, 8, '#FFFFFF', {rx: 4, ink: false, 'fill-opacity': 0.8}));
  return out;
}
function phoneVoicemail({w, h, who = 'MUM', when = 'Sat 11:47 PM', length = '0:42', progress = 0, playing = false, signal = 'NO SIGNAL', accent = '#2F7DF6', count = '7 missed calls · 1 voicemail'}) {
  const out = [path(rrect(-w / 2, -h, w, h, 54), '#F7F7F9', NI), text(signal, -w / 2 + 40, -h + 46, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 24, fill: '#1E1E22', 'text-anchor': 'start'}),
    text('Voicemail', -w / 2 + 40, -h + 140, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 56, fill: '#16161A', 'text-anchor': 'start'}),
    text(count, -w / 2 + 40, -h + 186, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 26, fill: '#C7342C', 'text-anchor': 'start'})];
  const y = -h + 230; out.push(path(rrect(-w / 2 + 24, y, w - 48, 360, 30), '#FFFFFF'), circle(-w / 2 + 92, y + 70, 40, '#C9CED6'), text(who[0], -w / 2 + 92, y + 84, {...NF, 'font-size': 38, fill: '#FFFFFF'}),
    text(who, -w / 2 + 152, y + 64, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 40, fill: '#16161A', 'text-anchor': 'start'}), text(when, -w / 2 + 152, y + 102, {'font-family': 'Inter', 'font-weight': 400, 'font-size': 24, fill: '#6A6A72', 'text-anchor': 'start'}));
  const p = clampN(progress), bx0 = -w / 2 + 60, bx1 = w / 2 - 60, bars = 34;
  for (let i = 0; i < bars; i++) { const x = bx0 + (i + 0.5) * (bx1 - bx0) / bars, hh = 14 + 60 * hash('vm' + i) * (0.4 + 0.6 * Math.sin(i / bars * Math.PI)); out.push(rect(x - 4, y + 190 - hh / 2, 8, hh, (i + 0.5) / bars <= p ? accent : '#CDD2DA', {rx: 4, ink: false})); }
  out.push(rect(bx0, y + 262, bx1 - bx0, 8, '#E3E6EB', {rx: 4, ink: false}), rect(bx0, y + 262, (bx1 - bx0) * p, 8, accent, {rx: 4, ink: false}), circle(bx0 + (bx1 - bx0) * p, y + 266, 14, accent),
    text(`0:${String(Math.round(p * 42)).padStart(2, '0')}`, bx0, y + 310, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 24, fill: '#6A6A72', 'text-anchor': 'start'}), text(length, bx1, y + 310, {'font-family': 'Inter', 'font-weight': 600, 'font-size': 24, fill: '#6A6A72', 'text-anchor': 'end'}));
  const py = y + 470; out.push(circle(0, py, 62, accent), playing ? g({}, rect(-22, py - 26, 14, 52, '#FFFFFF', {rx: 4, ink: false}), rect(8, py - 26, 14, 52, '#FFFFFF', {rx: 4, ink: false})) : path(`M-16 ${py - 30} L30 ${py} L-16 ${py + 30}Z`, '#FFFFFF', NI));
  out.push(rect(-90, -36, 180, 8, '#16161A', {rx: 4, ink: false}));
  return out;
}
function phoneCall({w, h, who = 'MUM', sub = 'calling…', t = 0}) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.8);
  const out = [path(rrect(-w / 2, -h, w, h, 54), '#0F1A14', NI), circle(0, -h * 0.66, 120 + 26 * pulse, '#2FB15A', {ink: false, 'fill-opacity': 0.16}), circle(0, -h * 0.66, 100, '#4A5560'),
    text(who[0], 0, -h * 0.66 + 36, {...NF, 'font-size': 100, fill: '#FFFFFF'}), text(who, 0, -h * 0.4, {'font-family': 'Inter Display', 'font-weight': 800, 'font-size': 84, fill: '#FFFFFF', 'text-anchor': 'middle'}),
    text(sub, 0, -h * 0.4 + 56, {'font-family': 'Inter', 'font-weight': 400, 'font-size': 34, fill: '#B9C4BD', 'text-anchor': 'middle'}),
    circle(-w * 0.26, -150, 56, '#E2453C'), circle(w * 0.26, -150, 56, '#2FB15A'), rect(-w * 0.26 - 26, -156, 52, 12, '#FFFFFF', {rx: 6, ink: false}), path(`M${w * 0.26 - 20} -166 q8 -8 16 0 l6 12 q-6 8 2 18 q10 10 18 4 l12 6 q8 8 0 14 q-34 10 -56 -22 q-12 -20 2 -32Z`, '#FFFFFF', NI)];
  return out;
}
const phoneUIBase = SCENE.phoneUI;
SCENE.phoneUI = (o = {}) => {
  const w = o.w || 560, h = o.h || 1000;
  if (!o.mode || o.mode === 'chat') { if (!o.cracked) return phoneUIBase(o); return g({}, phoneUIBase(o), ...phoneShell(w, h, [], o).slice(4)); }
  const inner = o.mode === 'lock' ? phoneLock({...o, w, h}) : o.mode === 'voicemail' ? phoneVoicemail({...o, w, h}) : phoneCall({...o, w, h});
  return withStyle('flat', () => g({}, ...phoneShell(w, h, inner, o)));
};

// ---------- a phone lying on a table / the ground (15 cm; seen from slightly above). screen: dark|lit|call ----------
function phoneFlat({screen = 'lit', label = '1 new voicemail', who = 'MUM', cracked = false, rot = 0} = {}) {
  const out = [], body = 'M-74 -6 L66 -10 L80 4 L-60 10Z';
  out.push(ellipse(0, 6, 86, 12, '#000000', {ink: false, 'fill-opacity': 0.25}), path(body, '#141418'), path('M-66 -4 L62 -8 L72 2 L-54 7Z', screen === 'dark' ? '#1E2128' : screen === 'call' ? '#163A24' : '#B9D8F2', NI));
  if (screen !== 'dark') out.push(path('M-50 -3 L30 -6 L36 -1 L-44 2Z', '#FFFFFF', {ink: false, 'fill-opacity': 0.7}), propGlow(0, 0, 90, screen === 'call' ? '#7FE0A0' : '#CFE6FF', 0.3));
  if (cracked) out.push(path('M10 -6 L-20 2 M10 -6 L40 3 M10 -6 L-6 7 M10 -6 L30 -9', 'none', {stroke: '#FFFFFF', 'stroke-width': 1.2, 'stroke-opacity': 0.8}));
  void label; void who; void rot;
  return g({}, ...out);
}

// ---------- the old city bus from outside (12 m × 3 m): side and front ----------
/** side view, front to the LEFT (flip for right). lit windows with passenger silhouettes; headlights on/off */
function busSide({color, lit = 1, headlights = true, board = 'CITY CENTRE', route = '13', seed = 'bus', passengers = 0.5, door = 0} = {}) {
  const red = T(col(color, null) || NIGHT.busRed), cream = T(NIGHT.busCream), out = [], L = 5640, Hh = 1410, x0 = -L / 2;
  const winC = mixHex('#2A3440', '#D9F0EA', lit), sil = mixHex('#1A2026', '#2C3A40', 1 - lit);
  out.push(ellipse(0, 10, L * 0.52, 60, '#000000', {ink: false, 'fill-opacity': 0.35}));
  out.push(path(`M${x0 + 60} -120 L${x0 + 20} ${-Hh + 140} Q${x0 + 30} ${-Hh} ${x0 + 200} ${-Hh} L${-x0 - 80} ${-Hh} Q${-x0} ${-Hh} ${-x0} ${-Hh + 90} L${-x0} -120Z`, red.base));
  out.push(rect(x0 + 40, -Hh + 230, L - 40, 520, cream.base, NI), rect(x0 + 40, -560, L - 40, 60, cream.base, NI), rect(x0 + 40, -500, L - 40, 30, red.shade, NI));
  // windows
  const wx0 = x0 + 700, n = 10, ww = 420, gap = (L - 760 - n * ww) / (n - 1);
  for (let i = 0; i < n; i++) { const x = wx0 + i * (ww + gap), y0 = -Hh + 280, y1 = -Hh + 680;
    out.push(rect(x - 12, y0 - 12, ww + 24, y1 - y0 + 24, darken(cream.base, 0.25), NI), rect(x, y0, ww, y1 - y0, winC, NI), rect(x, y0 + (y1 - y0) * 0.42, ww, 10, darken(cream.base, 0.3), NI));
    if (lit > 0) out.push(rect(x, y0, ww, 24, '#FFFFFF', {ink: false, 'fill-opacity': 0.25 * lit}));
    for (let k = 0; k < 2; k++) if (hash(seed + i + ':' + k) < passengers) { const px = x + 90 + k * 220 + (hash(seed + 'x' + i + k) - 0.5) * 60, py = y1 + 10;
      out.push(ellipse(px, py - 220, 50, 60, sil, NI), path(`M${px - 95} ${py} Q${px - 90} ${py - 150} ${px} ${py - 155} Q${px + 90} ${py - 150} ${px + 95} ${py}Z`, sil, NI)); } }
  // front: windshield, board, door, headlight
  out.push(path(`M${x0 + 60} ${-Hh + 300} L${x0 + 40} ${-Hh + 160} Q${x0 + 50} ${-Hh + 60} ${x0 + 220} ${-Hh + 60} L${x0 + 560} ${-Hh + 60} L${x0 + 560} ${-Hh + 700} L${x0 + 60} ${-Hh + 700}Z`, mixHex('#1E2A36', '#C5E6E0', lit * 0.6), NI));
  out.push(g({transform: tr(x0 + 330, -Hh + 30, 0, 0.62)}, destinationBoard({text: board, route, w: 700, h: 120})));
  out.push(rect(x0 + 590, -Hh + 220, 300, Hh - 330, darken(red.base, 0.35), NI), rect(x0 + 600 + door * 120, -Hh + 230, 140 - door * 60, Hh - 360, mixHex('#1E2A36', '#C5E6E0', lit * 0.5), NI), rect(x0 + 745, -Hh + 230, 140 - door * 60, Hh - 360, mixHex('#1E2A36', '#C5E6E0', lit * 0.5), NI));
  out.push(rect(x0 + 20, -300, 120, 90, '#3A3A40', {rx: 18}), circle(x0 + 70, -255, 34, headlights ? '#FFF4D6' : '#5A5A60', THIN));
  if (headlights) out.push(propGlow(x0 + 50, -255, 420, '#FFE8B8', 0.55), path(`M${x0 + 40} -275 L${x0 - 1900} -520 L${x0 - 1900} 80 L${x0 + 40} -235Z`, '#FFE8B8', {ink: false, 'fill-opacity': 0.12}));
  out.push(rect(-x0 - 100, -360, 70, 110, '#C7342C', {rx: 10}), rect(-x0 - 98, -350, 60, 40, '#FF5A4A', NI));
  out.push(rect(x0 + 40, -170, L - 60, 60, '#1E1E22', NI), ...[x0 + 1250, -x0 - 1500].map(x => g({}, circle(x, -60, 190, '#141416'), circle(x, -60, 92, '#6E7076', THIN), circle(x, -60, 34, '#3A3A40', NI), path(`M${x - 250} -120 A250 250 0 0 1 ${x + 250} -120Z`, darken(red.base, 0.45), NI))));
  for (let i = 0; i < 9; i++) { const x = x0 + 900 + hash(seed + 'rs' + i) * (L - 1400); out.push(rect(x, -470, 10 + hash(seed + 'rw' + i) * 14, 120 + hash(seed + 'rh' + i) * 180, darken(red.base, 0.3), {ink: false, 'fill-opacity': 0.5})); }
  out.push(rect(x0 + 40, -Hh + 10, L - 80, 26, lighten(red.base, 0.1), NI));
  out.push(devanagari('राज्य परिवहन', x0 + 2400, -512, {size: 52, fill: red.shade}));   // "state transport" on the cream belt
  return g({}, ...out);
}
/** front view (2.5 m wide): windshield, destination board, round headlights with glare, grille, bumper, mirrors */
function busFront({color, lit = 1, headlights = true, board = 'CITY CENTRE', route = '13', glare = 1} = {}) {
  const red = T(col(color, null) || NIGHT.busRed), out = [], w = 1180, Hh = 1410;
  out.push(ellipse(0, 10, w * 0.6, 50, '#000000', {ink: false, 'fill-opacity': 0.35}), path(`M${-w / 2} -60 L${-w / 2} ${-Hh + 120} Q${-w / 2} ${-Hh} ${-w / 2 + 120} ${-Hh} L${w / 2 - 120} ${-Hh} Q${w / 2} ${-Hh} ${w / 2} ${-Hh + 120} L${w / 2} -60Z`, red.base), rect(w / 2 - 140, -Hh + 60, 140, Hh - 140, red.shade, NI));
  out.push(g({transform: tr(0, -Hh + 120)}, destinationBoard({text: board, route, w: 860, h: 140})));
  out.push(path(`M${-w / 2 + 50} ${-Hh + 230} L${w / 2 - 50} ${-Hh + 230} L${w / 2 - 70} -640 L${-w / 2 + 70} -640Z`, mixHex('#1A2430', '#BFE0DA', lit * 0.5), NI), rect(-8, -Hh + 230, 16, Hh - 870, darken(red.base, 0.4), NI),
    stroke([[-200, -660], [-420, -900]], '#111', 8), stroke([[220, -660], [0, -900]], '#111', 8));
  out.push(rect(-w / 2, -636, w, 64, NIGHT.busCream, NI), rect(-w / 2, -572, w, 14, red.shade, NI), devanagari('राज्य परिवहन', 0, -588, {size: 44, fill: red.shade}));
  out.push(rect(-w / 2 + 40, -540, w - 80, 200, darken(red.base, 0.15), NI), ...Array.from({length: 5}, (_, i) => rect(-300, -522 + i * 34, 600, 14, '#2A2A2E', {rx: 6, ink: false})));
  for (const sd of [-1, 1]) { const x = sd * (w / 2 - 150);
    out.push(circle(x, -440, 82, '#2A2A30'), circle(x, -440, 62, headlights ? '#FFF6DE' : '#4E4E54', THIN));
    if (headlights) out.push(propGlow(x, -440, 520 * glare, '#FFE8B8', 0.6 * glare), propGlow(x, -440, 160, '#FFFFFF', 0.9));
    out.push(rod([[sd * (w / 2), -Hh + 380], [sd * (w / 2 + 160), -Hh + 300]], '#1A1A1E', 10), path(rrect(sd * (w / 2 + 160) - 40, -Hh + 300, 80, 200, 16), '#1A1A1E')); }
  out.push(path(rrect(-w / 2 - 30, -300, w + 60, 140, 24), '#3A3A40'), path(rrect(-170, -270, 340, 80, 8), '#F2F0E6'), text('MH 01 AB 1999', 0, -215, {...MONO, 'font-size': 42, fill: '#16161A'}),
    rect(-w / 2 + 20, -160, 180, 160, '#111114', {rx: 30}), rect(w / 2 - 200, -160, 180, 160, '#111114', {rx: 30}));
  return g({}, ...out);
}

Object.assign(SCENE, {teaStall, plasticChair, cakeBox, destinationBoard, birthdayBanner, garland, schoolBag, soldierCap, wristband, phoneFlat, busSide, busFront});
Object.assign(HELD, {
  garland: (s = 1) => g({transform: `scale(${s * 0.6})`}, garland({w: 90, drop: 260})),
  schoolBag: (s = 1) => g({transform: `translate(0 ${250 * s}) scale(${s * 0.85})`}, schoolBag({})),
  soldierCap: (s = 1) => g({transform: `translate(30 10) rotate(-20) scale(${s * 0.85})`}, soldierCap({})),
  wristband: (s = 1) => g({transform: `scale(${s * 0.5})`}, wristband({})),
  cakeBox: (s = 1) => g({transform: `translate(0 ${30 * s}) scale(${s * 1.1})`}, cakeBox({open: false})),
});
