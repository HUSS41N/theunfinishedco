// World props (owner: world). Flat vector objects drawn at REAL SCALE for an actor at scale 1
// (≈ 800 px ≈ 1.7 m tall, so 1 m ≈ 470 px — docs/V3-CONTRACT.md §4, docs/WORLD.md has the table).
// Every prop renders in both styles from one drawing: in the stick style (svg.mjs withStyle) solid shapes get an ink
// outline and palette lookups (P / col) switch to the soft warm stick palette. Shading shapes pass {ink:false}.
// HELD props attach to a hand (drawn at the wrist, rotated with the forearm). SCENE props stand in the set.
// Origins: scene props stand on their origin (bottom centre) unless noted (clock, frame: centre; lantern, pendant: hang point).
import {layer, g, path, circle, ellipse, rect, poly, stroke, rod, line, blob, rrect, tr, text, el,
  withStyle, isStick, getStyleMode, inkW, GUARD, mixHex, darken, lighten, desat, tones, isHex, INK} from './svg.mjs';

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
