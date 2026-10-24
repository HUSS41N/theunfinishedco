// Minimal SVG builder: strings in, strings out. Every visual in the engine is a <g> layer made from these.
// Owner: world. Browser-safe, deterministic.
//
// Style context (v3): the world (sets + props) renders in two looks from one set of drawing code.
//   withStyle('stick', () => ...)  runs a builder in the v1 "stick" look: every solid-filled shape made with
//   path/rect/circle/ellipse/poly gets a round-joined ink outline (~6 px at scale 1), and palette lookups
//   (props.mjs `P()` / `col()`) switch to the soft, warm stick palette. withStyle('flat', …) is the v2 look (no outlines).
// Per-shape control through the extra attribute `ink` (never written to the SVG):
//   ink: false   no outline on this shape (shading, highlights, light pools)
//   ink: 'thin'  half-width outline;  ink: 'bold' 1.5×;  ink: <number>  that width
// Shapes with fill "none", a url(#gradient) fill, an explicit stroke, or opacity < 1 never get an outline.
const n = v => (typeof v === 'number' ? +v.toFixed(2) : v);
const attrs = a => Object.entries(a || {}).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => ` ${k}="${typeof v === 'number' ? n(v) : String(v).replace(/"/g, '&quot;')}"`).join('');
export const el = (tag, a, ...kids) => { const c = kids.flat(Infinity).filter(Boolean).join(''); return c ? `<${tag}${attrs(a)}>${c}</${tag}>` : `<${tag}${attrs(a)}/>`; };

// ---------- style context ----------
export const INK = '#2A2522';                 // warm near-black: the stick look's outline colour
const MODE0 = {style: 'flat', ink: INK, w: 6};
let MODE = MODE0;
/** set the world style for subsequent drawing: 'flat' (default) or 'stick'. opts: {ink, w} */
export function setStyleMode(style, opts = {}) { MODE = {...MODE0, style: style === 'stick' ? 'stick' : 'flat', ...opts}; return MODE.style; }
export const getStyleMode = () => MODE.style;
export const isStick = () => MODE.style === 'stick';
/** run fn with a style active (falsy style = keep the current one), then restore the previous one (nestable, exception-safe) */
export function withStyle(style, fn, opts) { const prev = MODE; if (style || opts) setStyleMode(style || prev.style, {...(style && style !== prev.style ? {} : {ink: prev.ink, w: prev.w}), ...opts}); try { return fn(); } finally { MODE = prev; } }
/** outline width of the active style (0 in flat) */
export const inkW = (k = 1) => (MODE.style === 'stick' ? MODE.w * k : 0);
function inked(fill, a) {
  if (a && a.opacity !== undefined && !a.stroke) { const {opacity, ...r} = a; a = {...r, 'fill-opacity': opacity}; }   // resvg panics on a translucent shape fully off canvas; fill-opacity is safe
  if (MODE.style !== 'stick') { if (a && 'ink' in a) { const {ink, ...rest} = a; return rest; } return a; }
  const {ink, ...rest} = a || {};
  if (ink === false || !fill || fill === 'none' || String(fill).startsWith('url(') || rest.stroke || (rest.opacity !== undefined && rest.opacity < 1) || rest['fill-opacity'] !== undefined) return rest;
  const w = typeof ink === 'number' ? ink : ink === 'thin' ? MODE.w * 0.5 : ink === 'bold' ? MODE.w * 1.5 : MODE.w;
  return {...rest, stroke: MODE.ink, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'};
}

/** a named layer: <g id="..." data-layer="..."> — names survive into exported SVG so every layer is inspectable */
export const layer = (name, a, ...kids) => el('g', {'data-layer': name, ...a}, ...kids);
export const g = (a, ...kids) => el('g', a, ...kids);
export const path = (d, fill, a = {}) => el('path', {d, fill, ...inked(fill, a)});
export const circle = (cx, cy, r, fill, a = {}) => el('circle', {cx, cy, r, fill, ...inked(fill, a)});
export const ellipse = (cx, cy, rx, ry, fill, a = {}) => el('ellipse', {cx, cy, rx, ry, fill, ...inked(fill, a)});
export const rect = (x, y, w, h, fill, a = {}) => el('rect', {x, y, width: w, height: h, fill, ...inked(fill, a)});
/** closed polygon through points */
export const poly = (pts, fill, a = {}) => path('M' + pts.map(p => `${n(p[0])} ${n(p[1])}`).join(' L') + 'Z', fill, a);
/** a round-capped stroke through points: the basic flat-style limb */
export const stroke = (pts, color, w, a = {}) => { const {ink, ...rest} = a; return el('path', {d: 'M' + pts.map(p => `${n(p[0])} ${n(p[1])}`).join(' L'), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...rest}); };
/** a stroke that, in the stick style, gets an ink casing (a wider ink stroke under it): poles, rails, wires */
export const rod = (pts, color, w, a = {}) => MODE.style === 'stick' && a.ink !== false ? stroke(pts, MODE.ink, w + MODE.w * (a.ink === 'thin' ? 1 : 2), a) + stroke(pts, color, w, a) : stroke(pts, color, w, a);
/** a plain line in the ink colour of the active style (flat: the given colour) */
export const line = (pts, w = 4, color = INK, a = {}) => stroke(pts, MODE.style === 'stick' && a.ink !== false ? MODE.ink : color, w, a);
export const text = (str, x, y, a = {}) => el('text', {x, y, ...a}, esc(str));
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const tr = (x = 0, y = 0, rot = 0, sx = 1, sy = sx) => `translate(${n(x)} ${n(y)})${rot ? ` rotate(${n(rot)})` : ''}${sx !== 1 || sy !== 1 ? ` scale(${n(sx)} ${n(sy)})` : ''}`;

// ---------- ids ----------
// scene.mjs calls resetIds() every frame, but sets are built once at compile time: buildSet draws its ids from a
// separate namespace (withIds), so set ids never collide with per-frame prop ids.
let uid = 0, NS = '';
export const id = p => `${NS}${p}${++uid}`;
export const resetIds = () => { uid = 0; };
let nsCount = 0;
/** run fn with ids drawn from a fresh namespace */
export function withIds(prefix, fn) { const [pNS, pU] = [NS, uid]; NS = `${prefix}${++nsCount}_`; uid = 0; try { return fn(); } finally { NS = pNS; uid = pU; } }

/** an invisible, enormous rect. resvg 2.7 panics (geom.rs:27) when a clip / mask / opacity group's content lies wholly off
 *  canvas (right of or below it); with this guard inside, the group's bounds always meet the canvas. Measured: ±1e7 survives
 *  a 0.01 scale 9000 px off canvas; fill="none" does NOT work, fill-opacity="0" does. Nothing is painted. */
export const GUARD = '<rect x="-10000000" y="-10000000" width="20000000" height="20000000" fill="#000" fill-opacity="0"/>';
/** clip `kids` to the fill geometry of `shape` (the "shading clipped inside a part" technique).
 *  NOT resvg-safe when the clipped content lands wholly off canvas (right of / below it): resvg panics. The world modules
 *  use no clip groups at all (geometry is pre-fitted). clippedSafe adds GUARD, but a guarded group costs a full-canvas layer
 *  (~0.1 s per group per 1080×1920 frame, measured), so use it sparingly; render.mjs can instead retry a panicking frame
 *  with GUARD injected (see guardSVG). */
export function clipped(shapeMarkup, ...kids) { const cid = id('c'); return el('clipPath', {id: cid}, shapeMarkup) + g({'clip-path': `url(#${cid})`}, ...kids); }
export function clippedSafe(shapeMarkup, ...kids) { const cid = id('c'); return el('clipPath', {id: cid}, shapeMarkup) + g({'clip-path': `url(#${cid})`}, GUARD, ...kids); }
/** fallback for a frame that made resvg panic: put GUARD inside every clip / mask / filter / opacity group (slower, never panics) */
export const guardSVG = svg => svg.replace(/<g\b[^>]*\b(clip-path|mask|filter|opacity)="[^"]*"[^>]*>/g, m => m + GUARD);
/** a group with opacity / filter / clip attributes that stays resvg-safe when it lands off canvas */
export const safeGroup = (a, ...kids) => g(a, GUARD, ...kids);
export const lin = (gid, x1, y1, x2, y2, stops) => el('linearGradient', {id: gid, x1, y1, x2, y2, gradientUnits: 'userSpaceOnUse'}, stops.map(([o, c, op]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': op})));
export const rad = (gid, cx, cy, r, stops) => el('radialGradient', {id: gid, cx, cy, r, gradientUnits: 'userSpaceOnUse'}, stops.map(([o, c, op]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': op})));
/** rounded "blob" path through points (Catmull-Rom → cubic) — hair, clothes and props use it */
export function blob(pts, closed = true, t = 0.5) {
  const P = closed ? [pts.at(-1), ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts.at(-1)];
  let d = `M${n(P[1][0])} ${n(P[1][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3], c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    d += ` C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
/** rounded rectangle path (individual corner radii allowed) */
export function rrect(x, y, w, h, r) { const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r];
  return `M${n(x + a)} ${n(y)} H${n(x + w - b)} Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + b)} V${n(y + h - c)} Q${n(x + w)} ${n(y + h)} ${n(x + w - c)} ${n(y + h)} H${n(x + d)} Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - d)} V${n(y + a)} Q${n(x)} ${n(y)} ${n(x + a)} ${n(y)}Z`; }

// ---------- colour maths (world-owned; pre-blend instead of using opacity — resvg-safe) ----------
const hx = h => { const s = String(h).replace('#', ''); const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s; return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) || 0); };
const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const isHex = c => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
/** mix two hex colours: t = 0 → a, 1 → b */
export const mixHex = (a, b, t) => { if (!isHex(a) || !isHex(b)) return a; const [x, y] = [hx(a), hx(b)]; return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
export const darken = (c, k = 0.22) => mixHex(c, '#1a0f14', k);
export const lighten = (c, k = 0.22) => mixHex(c, '#ffffff', k);
/** desaturate toward the colour's own grey (k = 0..1) */
export const desat = (c, k = 0.3) => { if (!isHex(c)) return c; const [r, g2, b] = hx(c), l = r * 0.3 + g2 * 0.59 + b * 0.11; return toHex([r, g2, b].map(v => v + (l - v) * k)); };
export const tones = c => ({base: c, shade: darken(c), deep: darken(c, 0.4), light: lighten(c)});
