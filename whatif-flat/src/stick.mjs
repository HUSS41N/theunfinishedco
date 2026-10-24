// v1 STICK style: the channel's classic stickman, rebuilt as clean deterministic vector layers on the same rig as the
// flat character (same pose schema, same angle convention, same return shape). See docs/STICK.md.
//
// Look (from the two reference frames): a big white round head with a black outline, two black oval dot eyes and a small
// curved smile; thin black stick limbs with round caps that bend smoothly at the elbow and knee; coloured clothes worn over
// the stick body (tee, robe, dress, apron …) with a black outline; women and girls get a little bow.
//
// Nothing here is random: every path is a pure function of (C, pose, t), so there is no line boil between frames.
//
// Layer stack (bottom → top):
//   shadow · legs[leg-L, leg-R] · upper(lean)[arm-*(z:back) · torso[spine, top, top-detail] · bottom(skirt) · neck ·
//   head[hair-back, face, cheeks, eyes, lashes, brows, mouth, hair, accessory, bow] · arm-*(z:front)]
// Angles: degrees, 0 = hanging straight down, positive = outward (away from the centre line); elbow/knee add to the parent.
// Local units: 1 = 1 px at scale 1; y = 0 is the ground, up is negative; +x is the way the character faces.
// No import from character.mjs: it imports this file, so the stick rig carries its own (tiny) FK/IK maths.
import {layer, g, path, circle, ellipse, rect, clipped} from './svg.mjs';
import {CLOTH, light, resolve} from './style.mjs';
import {PROPS_HELD} from './props.mjs';

export const INK = '#1E1E22';
const PAPER = '#FFFFFF';
const BLUSH = '#F6B3BE';
const TONGUE = '#E9707E';

/** stick-rig dimensions at scale 1 (about 800 px from the soles to the top of the head) */
export const SDIM = {
  thigh: 166, shin: 160, footY: 12,           // the ankle sits footY above the ground
  torso: 214, hip: 13, shY: 26, shIn: 11,      // shoulders sit shY below the torso top, shIn inside the top's edge
  upper: 124, fore: 120,
  neck: 16, R: 112,                            // head radius (the head is ~28% of the height: between the two references)
  limb: 10, line: 8, face: 7,                  // stroke widths: limbs, outlines, face marks
  topW: 110, hemW: 104,                        // tee width at the shoulders and at the hem
  sleeve: 46, leg: 40,                         // sleeve / trouser tube widths (outer, including the outline)
  hand: 12, footL: 25, footH: 11,
};

const r2d = 180 / Math.PI, rad = d => d / r2d;
const n2 = v => +v.toFixed(2);
const P = p => `${n2(p[0])} ${n2(p[1])}`;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k], len = a => Math.hypot(a[0], a[1]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot = (p, deg, o = [0, 0]) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };
const fromAngle = (p, L, deg, side) => [p[0] + Math.sin(rad(deg)) * L * side, p[1] + Math.cos(rad(deg)) * L];
const angleOf = (v, side) => Math.atan2(v[0] * side, v[1]) * r2d;   // inverse of fromAngle's direction
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- colour ----------
const NEUTRAL = new Set(['white', 'grey', 'charcoal', 'black', 'navy', 'denim', 'tan', 'brown']);
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const isNeutralHex = h => { const [r, g2, b] = hexRGB(h), mx = Math.max(r, g2, b), mn = Math.min(r, g2, b); return mx - mn < 40; };
/** a CLOTH colour (name or hex), softened slightly (a touch of white): the stick style keeps "a little colour" */
export const soft = (c, fallback) => { const v = resolve(c, CLOTH) || fallback; return /^#[0-9a-f]{6}$/i.test(v || '') ? light(v, 0.12) : v; };
const BOW_DEFAULT = '#E5566A';

// ---------- geometry helpers ----------
/** a polygon with rounded corners (each corner becomes a quadratic through the vertex); a point may carry its own radius as p[2] */
function roundPoly(pts, r) {
  const N = pts.length, segs = [];
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], rr = p1[2] ?? r;
    const a = sub(p0, p1), b = sub(p2, p1), la = len(a) || 1, lb = len(b) || 1, k = Math.min(rr, la * 0.45, lb * 0.45);
    segs.push([add(p1, mul(a, k / la)), p1, add(p1, mul(b, k / lb))]);
  }
  let d = `M${P(segs[0][2])}`;
  for (let i = 1; i <= N; i++) { const s = segs[i % N]; d += ` L${P(s[0])} Q${P(s[1])} ${P(s[2])}`; }
  return d + 'Z';
}
/** a two-bone limb as a smooth curve: straight bones, the joint rounded with a quadratic (supple elbows and knees) */
function limbCurve(a, j, b) {
  const u = sub(a, j), v = sub(b, j), lu = len(u) || 1, lv = len(v) || 1;
  const fold = (1 + (u[0] * v[0] + u[1] * v[1]) / (lu * lv)) / 2;   // 0 straight … 1 folded back on itself
  const r = Math.min(lu, lv) * (0.16 + 0.22 * fold);
  const A = add(j, mul(u, r / lu)), B = add(j, mul(v, r / lv));
  return {d: `M${P(a)} L${P(A)} Q${P(j)} ${P(B)} L${P(b)}`, A, B, j, a, b};
}
/** sample a limb curve into a polyline cut to the arc-length range [u0, u1] */
function samplePolyline(c, u0 = 0, u1 = 1) {
  const pts = [c.a];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(add(add(mul(c.A, (1 - t) * (1 - t)), mul(c.j, 2 * t * (1 - t))), mul(c.B, t * t))); }
  pts.push(c.b);
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + len(sub(pts[i], pts[i - 1])));
  const tot = L.at(-1) || 1, at = u => { const s = u * tot; let i = 1; while (i < L.length - 1 && L[i] < s) i++; return lerp(pts[i - 1], pts[i], clamp((s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), 0, 1)); };
  const out = [at(u0)]; for (let i = 0; i < pts.length; i++) if (L[i] / tot > u0 && L[i] / tot < u1) out.push(pts[i]); out.push(at(u1));
  return {pts: out, total: tot};
}
const polyD = pts => 'M' + pts.map(P).join(' L');
const inkLine = (d, w, a = {}) => path(d, 'none', {stroke: INK, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a});
const filled = (d, fill, w = SDIM.line, a = {}) => path(d, fill, {stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round', ...a});
/**
 * an outlined cloth tube along a limb (sleeve, trouser leg): a wide ink stroke, then a narrower colour stroke on top.
 * The start is rounded (shoulder, hip); the end is cut square and the colour stops short so the ink shows as a hem.
 */
function tubeParts(c, u0, u1, w, fill, {hem = true, o = SDIM.line * 0.8} = {}) {
  const {pts, total} = samplePolyline(c, u0, u1), inner = samplePolyline(c, u0, hem ? Math.max(u0 + 0.01, u1 - o / total) : u1).pts;
  const a = {fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round'};
  return {ink: g({}, circle(pts[0][0], pts[0][1], w / 2, INK), path(polyD(pts), 'none', {...a, stroke: INK, 'stroke-width': w})),
    fill: g({}, circle(pts[0][0], pts[0][1], w / 2 - o, fill), path(polyD(inner), 'none', {...a, stroke: fill, 'stroke-width': w - 2 * o}))};
}
function tube(c, u0, u1, w, fill, opts) { const t = tubeParts(c, u0, u1, w, fill, opts); return g({}, t.ink, t.fill); }

// ---------- IK ----------
/** two-bone IK in a limb's own frame → {a, b} in the rig convention. prefer(elbowPoint) scores the two possible bends. */
function solveIK(root, target, L1, L2, side, prefer) {
  const d = sub(target, root), D = clamp(len(d), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const dir = angleOf(d, side), alpha = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)) * r2d;
  const tip = fromAngle(root, D, dir, side);
  const cand = [dir + alpha, dir - alpha].map(a => { const el = fromAngle(root, L1, a, side); return {a, b: angleOf(sub(tip, el), side) - a, el}; });
  return prefer(cand[0].el) >= prefer(cand[1].el) ? cand[0] : cand[1];
}

// ---------- cast def → stick spec ----------
const WOMAN_HAIR = new Set(['long', 'bob', 'bun', 'ponytail', 'pigtails']);
/** read the stick-relevant fields from the cast definition (C.raw), falling back to the resolved flat spec */
export function stickSpec(C) {
  const raw = C.raw || {}, haveRaw = !!C.raw;
  const topStyle = raw.top?.style || (haveRaw ? 'tee' : C.top?.style) || 'tee';
  const topName = raw.top?.color || (haveRaw ? 'yellow' : null);   // default: the reference's yellow tee
  const top = {style: topStyle, color: soft(topName || C.top?.base, '#F5C33B'), detail: raw.top?.detail ? soft(raw.top.detail) : null};
  const botStyle = raw.bottom ? (raw.bottom.style || 'pants') : (haveRaw ? 'none' : (C.bottom?.style || 'none'));
  const bottom = {style: botStyle, color: soft(raw.bottom?.color || C.bottom?.base || 'charcoal')};
  const hairStyle = raw.hair?.style || (haveRaw ? 'none' : C.hair?.style) || 'none';
  const woman = WOMAN_HAIR.has(hairStyle) || raw.woman === true;
  let bow = null;
  if (raw.bow !== false && (woman || raw.bow)) {
    const named = typeof raw.bow === 'string' ? raw.bow : null;
    const neutralTop = !topName || NEUTRAL.has(topName) || (topName.startsWith('#') && isNeutralHex(topName));
    bow = named ? soft(named) : neutralTop || topStyle === 'apron' ? BOW_DEFAULT : top.color;
  }
  const shoes = raw.shoes?.color ? soft(raw.shoes.color) : null;
  const acc = (raw.accessories || C.acc || []).map(a => (typeof a === 'string' ? {type: a} : a));
  const face = {...(C.face || {}), ...(raw.face || {})};
  return {top, bottom, hair: hairStyle, woman, bow, shoes, acc, face, build: {height: 1, head: 1, width: 1, limbs: 1, ...(C.build || raw.build)}};
}

// ---------- torso clothes ----------
const LONG_SLEEVE = new Set(['hoodie', 'shirt', 'jacket', 'robe']), NO_SLEEVE = new Set(['tank', 'none']);
function torsoLayer(S, T, Wt, bendPt, legLen, sleeves = []) {
  const st = S.top.style, col = S.top.color, B = S.build, parts = [];
  const neckP = bendPt([0, -T]);
  parts.push(layer('spine', {}, inkLine(`M0 0 Q${P(bendPt([0, -T * 0.5]))} ${P(neckP)}`, SDIM.limb)));
  if (st === 'none') return layer('torso', {}, parts);
  const W = Wt / 2, long = st === 'robe' || st === 'dress', Hh = SDIM.hemW * B.width / 2 * (long ? 1.04 : 1);
  const hemY = st === 'robe' ? legLen * 0.72 : st === 'dress' ? legLen * 0.42 : 22;
  const flare = st === 'robe' ? 1.32 : st === 'dress' ? 1.75 : 1, waistY = st === 'dress' ? -T * 0.3 : -T * 0.25, waistK = st === 'dress' ? 0.82 : 1;
  const shirtCol = st === 'apron' ? (S.top.detail || PAPER) : col;
  const nl = bendPt([-W * 0.3, -T - 2]), nr = bendPt([W * 0.3, -T - 2]);
  const neckDip = st === 'tank' ? 34 : st === 'robe' ? 10 : 20;
  const pts = [nl, bendPt([-W, -T + 14]), bendPt([-W * 0.96, -T + 84]), [-Hh * waistK, waistY, 60], [-Hh * flare, hemY, 14],
    [Hh * flare, hemY, 14], [Hh * waistK, waistY, 60], bendPt([W * 0.96, -T + 84]), bendPt([W, -T + 14]), nr];
  const body = roundPoly(pts, 18);
  const neckCut = `M${P(nl)} Q${P(bendPt([0, -T + neckDip]))} ${P(nr)}`;
  const det = [], lw = SDIM.line * 0.8;
  if (st === 'stripes') { const sc = S.top.detail || PAPER; for (const k of [0.36, 0.56, 0.76]) det.push(rect(-W * 1.4, -T + T * k, W * 2.8, T * 0.085, sc)); }
  // fill, clipped stripes, then the outline on top (so the stripes never cover the ink)
  // the top and its upper sleeves are ONE outlined shape: all the ink first (the body's outline is a double-width stroke,
  // half of which the fill covers), then all the fills, so seams inside the silhouette disappear
  parts.push(layer('top', {}, path(body, 'none', {stroke: INK, 'stroke-width': SDIM.line * 2, 'stroke-linejoin': 'round'}), sleeves.map(t => t.ink),
    path(body, shirtCol), sleeves.map(t => t.fill), det.length ? clipped(path(body, '#000'), ...det) : '',
    path(`${neckCut} L${P(bendPt([W * 0.3, -T - 40]))} L${P(bendPt([-W * 0.3, -T - 40]))}Z`, PAPER), inkLine(neckCut, SDIM.line)));
  const d2 = [];
  if (st === 'hoodie') d2.push(inkLine(`M${P(bendPt([-W * 0.55, -T + 4]))} Q${P(bendPt([0, -T + 56]))} ${P(bendPt([W * 0.55, -T + 4]))}`, lw),
    path(`M${-W * 0.5} ${-T * 0.38} Q0 ${-T * 0.42} ${W * 0.5} ${-T * 0.38} L${W * 0.42} ${-T * 0.08} H${-W * 0.42}Z`, 'none', {stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round'}));
  if (st === 'shirt') d2.push(inkLine(`M${P(nl)} L${P(bendPt([0, -T + 30]))} L${P(nr)}`, lw), inkLine(`M${P(bendPt([0, -T + 30]))} L0 18`, lw * 0.7),
    ...[0.34, 0.56, 0.78].map(k => circle(...bendPt([0, -T + T * k]), 4.5, INK)));
  if (st === 'jacket') { const dc = S.top.detail || PAPER;
    d2.push(filled(`M${P(nl)} Q${P(bendPt([0, -T + 20]))} ${P(nr)} L${W * 0.18} 18 H${-W * 0.18}Z`, dc, lw),
      inkLine(`M${P(nl)} L${P(bendPt([-W * 0.4, -T + 70]))} L${-W * 0.18} ${-T + 100}`, lw), inkLine(`M${P(nr)} L${P(bendPt([W * 0.4, -T + 70]))} L${W * 0.18} ${-T + 100}`, lw)); }
  if (st === 'robe') d2.push(inkLine(`M${P(bendPt([-W * 0.28, -T + 4]))} Q${P(bendPt([-W * 0.05, -T + 52]))} ${P(bendPt([W * 0.34, -T + 66]))}`, lw),
    inkLine(`M${-Hh * 1.0} ${-T * 0.27} Q0 ${-T * 0.22} ${Hh * 1.0} ${-T * 0.27}`, lw));
  if (st === 'dress') d2.push(inkLine(`M${-Hh * 0.82} ${-T * 0.3} Q0 ${-T * 0.25} ${Hh * 0.82} ${-T * 0.3}`, lw));
  if (st === 'apron') { const bib = roundPoly([[-W * 0.5, -T + 66], [W * 0.5, -T + 66], [W * 0.56, -T * 0.3], [Hh * 0.95, legLen * 0.36], [-Hh * 0.95, legLen * 0.36], [-W * 0.56, -T * 0.3]], 10);
    d2.push(inkLine(`M${-W * 0.44} ${-T + 68} L${P(lerp(nl, bendPt([-W, -T + 14]), 0.15))}`, lw), inkLine(`M${W * 0.44} ${-T + 68} L${P(lerp(nr, bendPt([W, -T + 14]), 0.15))}`, lw),
      filled(bib, col, lw), inkLine(`M${-W * 0.56} ${-T * 0.3} Q0 ${-T * 0.26} ${W * 0.56} ${-T * 0.3}`, lw * 0.7)); }
  if (d2.length) parts.push(layer('top-detail', {}, d2));
  return layer('torso', {}, parts);
}

// ---------- head ----------
const faceTurn = f => clamp(f.turn || 0, -1, 1);
const eyeSpread = (R, turn) => R * 0.25 * (1 - Math.abs(turn) * 0.22);
function eyesLayer(S, R, f) {
  const turn = faceTurn(f), look = f.look || [0, 0], mode = f.eyes || 'open', blink = f.blink || 0;
  const sp = eyeSpread(R, turn), cx0 = turn * R * 0.36, ey = R * 0.06 + look[1] * R * 0.05;
  const rx = R * 0.062, ry = R * 0.092, lw = SDIM.face, out = [], lash = [];
  for (const side of [-1, 1]) {
    const x = cx0 + side * sp + look[0] * R * 0.07, y = ey, far = turn * side < 0 ? 1 - Math.abs(turn) * 0.2 : 1;
    const shut = mode === 'closed' || blink >= 1;
    if (shut) out.push(inkLine(`M${x - rx * 1.6} ${y} Q${x} ${y + ry * 0.9} ${x + rx * 1.6} ${y}`, lw));
    else if (mode === 'happy') out.push(inkLine(`M${x - rx * 1.6} ${y + ry * 0.35} Q${x} ${y - ry * 1.1} ${x + rx * 1.6} ${y + ry * 0.35}`, lw));
    else if (mode === 'wide') out.push(ellipse(x, y, rx * 2.1 * far, ry * 1.7, PAPER, {stroke: INK, 'stroke-width': lw * 0.75}),
      ellipse(x + look[0] * rx * 0.5, y + look[1] * ry * 0.4, rx * 1.15 * far, ry * 1.05, INK));
    else {
      out.push(ellipse(x, y, rx * far, ry * (blink > 0 ? 1 - blink * 0.85 : 1), INK));
      if (mode === 'tired' || mode === 'bored') out.push(rect(x - rx * 1.6, y - ry * 1.4, rx * 3.2, ry * 1.2, PAPER), inkLine(`M${x - rx * 1.7} ${y - ry * 0.2} L${x + rx * 1.7} ${y - ry * 0.2}`, lw * 0.8));
      if (mode === 'angry') out.push(inkLine(`M${x + side * rx * 2.0} ${y - ry * 2.3} L${x - side * rx * 1.2} ${y - ry * 1.15}`, lw));
      if (mode === 'squint') out.push(rect(x - rx * 1.6, y - ry * 1.4, rx * 3.2, ry * 0.95, PAPER), rect(x - rx * 1.6, y + ry * 0.45, rx * 3.2, ry, PAPER));
    }
    if (S.face.lashes && mode !== 'wide') {
      const top = shut ? y + ry * 0.35 : mode === 'happy' ? y - ry * 0.5 : y - ry * 0.75, ox = shut || mode === 'happy' ? rx * 1.3 : rx * 0.5;
      for (const [dx, dy, ang] of [[0, 0, 28], [0.7, 0.35, 52], [1.2, 0.85, 76]]) {
        const p0 = [x + side * (ox + rx * dx), top + ry * dy], p1 = add(p0, [side * Math.sin(rad(ang)) * R * 0.075, -Math.cos(rad(ang)) * R * 0.075]);
        lash.push(inkLine(`M${P(p0)} L${P(p1)}`, lw * 0.6));
      }
    }
  }
  return layer('eyes', {}, out) + (lash.length ? layer('lashes', {}, lash) : '');
}
function browsLayer(R, f, hat) {
  const mode = f.brows;
  if (!mode || mode === 'flat' || mode === 'none') return '';   // the reference faces have no brows: only expressive brows are drawn
  const turn = faceTurn(f), sp = eyeSpread(R, turn), cx0 = turn * R * 0.36, y = -R * 0.13;
  const tilt = {up: 0, raised: 0, worried: 16, sad: 12, angry: -20}[mode] ?? 0, dy = Math.max(hat ? -R * 0.03 : -1e9, {up: -R * 0.07, raised: -R * 0.05, worried: -R * 0.02}[mode] ?? 0);   // under a hat the brows stay below the cuff
  return layer('brows', {}, [-1, 1].map(side => {
    const x = cx0 + side * sp, w = R * 0.1, o = [x, y + dy];
    const p0 = rot([x - side * w, y + dy], tilt * side, o), p1 = rot([x + side * w, y + dy], tilt * side, o);
    return mode === 'up' ? inkLine(`M${P(p0)} Q${x} ${y + dy - R * 0.05} ${P(p1)}`, SDIM.face * 0.85) : inkLine(`M${P(p0)} L${P(p1)}`, SDIM.face * 0.85);
  }));
}
function mouthLayer(R, f, t) {
  const turn = faceTurn(f), m = f.mouth || 'smile', x = turn * R * 0.4 + (f.look?.[0] || 0) * R * 0.04, y = R * 0.36, w = R * 0.15 * (1 - Math.abs(turn) * 0.15);
  const lw = SDIM.face, wo = w; void wo;
  switch (m) {
    case 'flat': return inkLine(`M${x - w * 0.8} ${y + 2} L${x + w * 0.8} ${y + 2}`, lw);
    case 'sad': case 'frown': return inkLine(`M${x - w} ${y + w * 0.45} Q${x} ${y - w * 0.4} ${x + w} ${y + w * 0.45}`, lw);
    case 'smirk': return inkLine(`M${x - w * 0.9} ${y + w * 0.18} Q${x + w * 0.2} ${y + w * 0.45} ${x + w * 1.05} ${y - w * 0.3}`, lw);
    case 'O': return ellipse(x, y + w * 0.3, w * 0.5, w * 0.66, INK);
    case 'open': { const w = wo * 1.3, d = `M${x - w * 0.85} ${y - w * 0.05} Q${x} ${y - w * 0.2} ${x + w * 0.85} ${y - w * 0.05} Q${x + w * 0.7} ${y + w * 1.05} ${x} ${y + w * 1.05} Q${x - w * 0.7} ${y + w * 1.05} ${x - w * 0.85} ${y - w * 0.05}Z`;
      return g({}, path(d, INK), ellipse(x + w * 0.1, y + w * 0.72, w * 0.42, w * 0.2, TONGUE)); }
    case 'grin': { const w = wo * 1.3, d = `M${x - w * 1.15} ${y - w * 0.15} Q${x} ${y - w * 0.02} ${x + w * 1.15} ${y - w * 0.15} Q${x + w * 0.9} ${y + w * 1.0} ${x} ${y + w * 1.0} Q${x - w * 0.9} ${y + w * 1.0} ${x - w * 1.15} ${y - w * 0.15}Z`;
      return g({}, path(d, INK), path(`M${x - w * 0.95} ${y - w * 0.04} Q${x} ${y + w * 0.12} ${x + w * 0.95} ${y - w * 0.04} L${x + w * 0.8} ${y + w * 0.22} Q${x} ${y + w * 0.36} ${x - w * 0.8} ${y + w * 0.22}Z`, PAPER),
        ellipse(x + w * 0.15, y + w * 0.74, w * 0.42, w * 0.18, TONGUE)); }
    case 'scream': { const w = wo * 1.3; return g({}, ellipse(x, y + w * 0.55, w * 0.85, w * 1.2, INK), ellipse(x, y + w * 1.25, w * 0.5, w * 0.36, TONGUE)); }
    case 'teeth': { const w = wo * 1.25, d = `M${x - w * 1.1} ${y - w * 0.1} Q${x} ${y - w * 0.25} ${x + w * 1.1} ${y - w * 0.1} Q${x + w * 1.0} ${y + w * 0.75} ${x} ${y + w * 0.75} Q${x - w * 1.0} ${y + w * 0.75} ${x - w * 1.1} ${y - w * 0.1}Z`;
      return g({}, path(d, PAPER, {stroke: INK, 'stroke-width': lw * 0.85, 'stroke-linejoin': 'round'}), inkLine(`M${x - w * 1.0} ${y + w * 0.3} Q${x} ${y + w * 0.4} ${x + w * 1.0} ${y + w * 0.3}`, lw * 0.5),
        ...[-0.45, 0, 0.45].map(k => inkLine(`M${x + w * k} ${y - w * 0.12} L${x + w * k} ${y + w * 0.7}`, lw * 0.4))); }
    case 'chew': { const k = 0.75 + 0.25 * Math.sin((t || 0) * 2 * Math.PI * 2);   // 2 Hz, well under the 6 Hz alias limit
      return path(`M${x - w * 0.7} ${y + w * 0.1} Q${x} ${y - w * 0.15} ${x + w * 0.7} ${y + w * 0.1} Q${x} ${y + w * 0.75 * k} ${x - w * 0.7} ${y + w * 0.1}Z`, INK); }
    default: return inkLine(`M${x - w} ${y} Q${x} ${y + w * 0.85} ${x + w} ${y}`, lw);   // smile: a small curved line
  }
}
/** the little bow: two loops and a knot (and two tiny tails), outlined in ink */
function bowShape(cx, cy, s, angle, color) {
  const loop = sx => `M0 0 C${sx * 0.3 * s} ${-0.55 * s} ${sx * 1.0 * s} ${-0.62 * s} ${sx * 1.0 * s} ${-0.02 * s} C${sx * 1.0 * s} ${0.6 * s} ${sx * 0.3 * s} ${0.5 * s} 0 0Z`;
  const tail = sx => `M${sx * 0.08 * s} ${0.1 * s} L${sx * 0.42 * s} ${0.78 * s} L${sx * 0.62 * s} ${0.6 * s}`;
  const lw = SDIM.face * 0.8;
  return g({transform: `translate(${n2(cx)} ${n2(cy)}) rotate(${n2(angle)})`},
    ...[-1, 1].map(sx => inkLine(tail(sx), lw)), ...[-1, 1].map(sx => path(loop(sx), color, {stroke: INK, 'stroke-width': lw, 'stroke-linejoin': 'round'})),
    ...[-1, 1].map(sx => inkLine(`M${sx * 0.28 * s} ${-0.18 * s} Q${sx * 0.5 * s} ${-0.02 * s} ${sx * 0.3 * s} ${0.16 * s}`, lw * 0.6)),
    ellipse(0, 0, 0.22 * s, 0.26 * s, color, {stroke: INK, 'stroke-width': lw}));
}
function hairLayer(S, R) {
  const st = S.hair, lw = SDIM.face, out = [], back = [];
  const top = a => [Math.sin(rad(a)) * R, -Math.cos(rad(a)) * R];
  if (st === 'spiky') for (const a of [-34, -12, 10, 32]) { const p = top(a), q = add(p, [Math.sin(rad(a * 1.4)) * R * 0.26, -R * 0.26]); out.push(inkLine(`M${P(p)} L${P(q)}`, lw)); }
  if (st === 'quiff') { const p = top(-8), p2 = top(10);
    out.push(inkLine(`M${P(p)} C${P(add(p, [-R * 0.05, -R * 0.38]))} ${P(add(p, [R * 0.42, -R * 0.4]))} ${P(add(p, [R * 0.34, -R * 0.12]))}`, lw),
      inkLine(`M${P(p2)} Q${P(add(p2, [R * 0.12, -R * 0.2]))} ${P(add(p2, [R * 0.32, -R * 0.1]))}`, lw)); }
  if (st === 'curly') for (const a of [-40, -20, 0, 20, 40]) { const p = top(a);
    out.push(path(`M${P(rot(add(p, [-R * 0.09, 0]), a, p))} A${R * 0.09} ${R * 0.09} 0 1 1 ${P(rot(add(p, [R * 0.09, 0]), a, p))}`, PAPER, {stroke: INK, 'stroke-width': lw * 0.85})); }
  if (st === 'long') for (const s of [-1, 1]) for (const k of [0, 1]) {   // strands that leave the crown, hug the head and fall to the shoulders
    const p = top(s * (34 + k * 22)), e = [s * R * (1.04 + k * 0.1), R * (1.12 - k * 0.14)];
    back.push(inkLine(`M${P(p)} C${P([s * R * (0.98 + k * 0.1), -R * (0.92 - k * 0.2)])} ${P([s * R * (1.2 + k * 0.06), -R * 0.42])} ${P([s * R * (1.16 + k * 0.07), 0])} S${P([s * R * (1.04 + k * 0.1), R * 0.7])} ${P(e)}`, lw * 0.85)); }
  if (st === 'ponytail') { const root = top(-62);
    for (const k of [-1, 0, 1]) back.push(inkLine(`M${P(root)} C${P(add(root, [-R * 0.42, -R * 0.05 + k * 6]))} ${P(add(root, [-R * 0.5, R * 0.5]))} ${P(add(root, [-R * (0.32 - k * 0.07), R * (0.95 + k * 0.05)]))}`, lw * 0.85)); }
  if (st === 'pigtails') for (const s of [-1, 1]) { const root = [s * R * 0.92, -R * 0.36];
    for (const k of [-1, 1]) back.push(inkLine(`M${P(root)} Q${P(add(root, [s * R * 0.3, R * 0.02 + k * 8]))} ${P(add(root, [s * R * 0.36, R * (0.38 + k * 0.06)]))}`, lw * 0.85)); }
  if (st === 'bun') back.push(circle(...top(-8), R * 0.24, PAPER, {stroke: INK, 'stroke-width': SDIM.line}));
  if (st === 'bob') for (const s of [-1, 1]) back.push(inkLine(`M${s * R * 0.9} ${-R * 0.42} Q${s * R * 1.14} ${R * 0.0} ${s * R * 0.98} ${R * 0.38}`, lw * 0.85));
  return {front: out.length ? layer('hair', {}, out) : '', back: back.length ? layer('hair-back', {}, back) : ''};
}
function accessoryLayer(S, R, f) {
  const out = [], turn = faceTurn(f), ox = turn * R * 0.36, lw = SDIM.line, sp = eyeSpread(R, turn), ey = R * 0.06;
  let hat = false;
  for (const a of S.acc) {
    const kind = a.type, col = a.color ? soft(a.color) : null;
    if (kind === 'cap' || kind === 'beanie' || kind === 'hat') {
      hat = true; const c = col || soft('red'), peak = kind === 'hat' || a.style === 'peak' || a.style === 'baseball';
      if (peak) {
        const dome = `M${-R * 0.98} ${-R * 0.3} C${-R * 0.98} ${-R * 1.12} ${R * 0.98} ${-R * 1.12} ${R * 0.98} ${-R * 0.3}Z`;
        out.push(filled(dome, c, lw), filled(`M${R * 0.5} ${-R * 0.32} Q${R * 1.05} ${-R * 0.44} ${R * 1.42} ${-R * 0.22} Q${R * 1.0} ${-R * 0.14} ${R * 0.5} ${-R * 0.22}Z`, c, lw), circle(0, -R * 1.0, R * 0.07, c, {stroke: INK, 'stroke-width': lw * 0.8}));
      } else {   // beanie, as in the reference: a soft dome pulled down to the brows with a folded cuff
        const dome = `M${-R * 1.0} ${-R * 0.36} C${-R * 1.04} ${-R * 1.24} ${R * 1.04} ${-R * 1.24} ${R * 1.0} ${-R * 0.36}Z`;
        const cuff = roundPoly([[-R * 1.07, -R * 0.54], [R * 1.07, -R * 0.54], [R * 1.05, -R * 0.24], [-R * 1.05, -R * 0.24]], R * 0.08);
        out.push(filled(dome, c, lw), filled(cuff, c, lw), ...[-0.6, -0.3, 0, 0.3, 0.6].map(k => inkLine(`M${R * k} ${-R * 0.48} L${R * k} ${-R * 0.31}`, lw * 0.45)));
      }
    }
    if (kind === 'glasses' || kind === 'sunglasses') { const sun = kind === 'sunglasses';
      for (const s of [-1, 1]) out.push(ellipse(ox + s * sp, ey, R * 0.15, R * 0.13, sun ? INK : 'none', {stroke: INK, 'stroke-width': lw * 0.75}));
      out.push(inkLine(`M${ox - sp + R * 0.15} ${ey - R * 0.02} Q${ox} ${ey - R * 0.08} ${ox + sp - R * 0.15} ${ey - R * 0.02}`, lw * 0.7)); }
    if (kind === 'headphones') { const c = col || soft('charcoal');
      out.push(inkLine(`M${-R * 0.98} ${-R * 0.08} C${-R * 1.06} ${-R * 1.3} ${R * 1.06} ${-R * 1.3} ${R * 0.98} ${-R * 0.08}`, lw * 1.6),
        ...[-1, 1].map(s => filled(roundPoly([[s * R * 0.84, -R * 0.3], [s * R * 1.14, -R * 0.3], [s * R * 1.14, R * 0.22], [s * R * 0.84, R * 0.22]], R * 0.12), c, lw))); }
    if (kind === 'mustache') { const y = R * 0.27, x = ox;
      out.push(path(`M${x} ${y - R * 0.02} C${x - R * 0.08} ${y - R * 0.1} ${x - R * 0.24} ${y - R * 0.08} ${x - R * 0.26} ${y + R * 0.05} C${x - R * 0.16} ${y + R * 0.02} ${x - R * 0.06} ${y + R * 0.05} ${x} ${y + R * 0.02} C${x + R * 0.06} ${y + R * 0.05} ${x + R * 0.16} ${y + R * 0.02} ${x + R * 0.26} ${y + R * 0.05} C${x + R * 0.24} ${y - R * 0.08} ${x + R * 0.08} ${y - R * 0.1} ${x} ${y - R * 0.02}Z`, INK)); }
    if (kind === 'beard') {   // a small outlined chin beard in soft brown: its outer edge IS the jaw outline, its inner
      // edge is scalloped below the mouth, so the mouth stays visible and the face stays white
      const c = col || '#A88B70', a0 = rad(26), a1 = rad(154), rx = R * 1.03;
      const p0 = [Math.cos(a0) * rx, Math.sin(a0) * R], p1 = [Math.cos(a1) * rx, Math.sin(a1) * R];
      const inner = [[-R * 0.64, R * 0.52], [-R * 0.32, R * 0.68], [ox * 0.6, R * 0.74], [R * 0.32, R * 0.68], [R * 0.64, R * 0.52], p0];
      let d = `M${P(p0)} A${n2(rx)} ${n2(R)} 0 0 1 ${P(p1)}`;
      for (let i = 0; i < inner.length; i++) { const a = i ? inner[i - 1] : p1, b = inner[i], m = lerp(a, b, 0.5);
        d += ` Q${P(add(m, mul([-(b[1] - a[1]), b[0] - a[0]], 0.16)))} ${P(b)}`; }
      out.push(path(d + 'Z', c, {stroke: INK, 'stroke-width': lw * 0.7, 'stroke-linejoin': 'round'}),
        path(`M${P(p0)} A${n2(rx)} ${n2(R)} 0 0 1 ${P(p1)}`, 'none', {stroke: INK, 'stroke-width': SDIM.line, 'stroke-linecap': 'round'})); }   // redraw the jaw line on top
    if (kind === 'mask') { const c = col || '#EDE8DF', d = `M${-R * 0.72} ${-R * 0.42} Q0 ${-R * 0.62} ${R * 0.72} ${-R * 0.42} Q${R * 0.86} ${R * 0.2} ${R * 0.4} ${R * 0.62} Q0 ${R * 0.84} ${-R * 0.4} ${R * 0.62} Q${-R * 0.86} ${R * 0.2} ${-R * 0.72} ${-R * 0.42}Z`;
      out.push(path(d, c, {stroke: INK, 'stroke-width': lw * 0.8}), ...[-1, 1].map(s => ellipse(ox + s * sp, ey, R * 0.1, R * 0.07, INK)), inkLine(`M${-R * 0.14} ${R * 0.4} L${R * 0.14} ${R * 0.4}`, lw * 0.5)); }
  }
  return {svg: out.length ? layer('accessory', {}, out) : '', hat};
}
function headLayer(S, f, R, t) {
  const hair = hairLayer(S, R), acc = accessoryLayer(S, R, f);
  const parts = [hair.back, layer('face', {}, ellipse(0, 0, R * 1.03, R, PAPER, {stroke: INK, 'stroke-width': SDIM.line}))];
  if (S.face.blush || f.blush) parts.push(layer('cheeks', {}, [-1, 1].map(s => ellipse(faceTurn(f) * R * 0.36 + s * R * 0.5, R * 0.3, R * 0.12, R * 0.07, BLUSH))));
  parts.push(eyesLayer(S, R, f), browsLayer(R, f, acc.hat), layer('mouth', {}, mouthLayer(R, f, t)), acc.hat ? '' : hair.front, acc.svg);
  if (S.bow) {   // top-back of the head (the side away from the facing direction); at the root of a ponytail
    const a = S.hair === 'ponytail' ? -62 : -38, lift = acc.hat ? R * 0.14 : 0, p = [Math.sin(rad(a)) * R * 0.98, -Math.cos(rad(a)) * R * 0.98 - lift];
    parts.push(layer('bow', {}, bowShape(p[0], p[1], R * 0.3, a + (S.hair === 'ponytail' ? 90 : 0), S.bow)));
  }
  return g({}, parts);
}

// ---------- feet and hands ----------
function footShape(p, ang, color) {
  const L = SDIM.footL, H = SDIM.footH;
  return g({transform: `translate(${n2(p[0])} ${n2(p[1])}) rotate(${n2(-(ang || 0))})`},
    ellipse(L * 0.55, SDIM.footY - H * 0.95, L, H, color || INK, color ? {stroke: INK, 'stroke-width': SDIM.line * 0.75} : {}));
}
const handShape = p => circle(p[0], p[1], SDIM.hand, PAPER, {stroke: INK, 'stroke-width': SDIM.line * 0.8});

/**
 * Build one stick character in a pose. Same signature and return shape as buildCharacter (docs/V3-CONTRACT.md §3):
 * {svg, pelvis, height, anchors:{headTop, headCenter, mouth, handL, handR, footL, footR}} (anchors: actor-layer coords,
 * scale and facing applied). pose: {body, head, armL, armR, legL, legR, face}; hold: {L?, R?} held props.
 */
export function buildStick(C, pose, {scale = 1, facing = 1, hold = {}, shadow = true, t = 0} = {}) {
  const S = stickSpec(C), B = S.build, Pz = pose || {}, body = Pz.body || {}, hd = Pz.head || {};
  const f = {...S.face, ...(Pz.face || {})}; if (f.turn === undefined && hd.turn !== undefined) f.turn = hd.turn;
  const kH = B.height ?? 1, kL = B.limbs ?? 1, kW = B.width ?? 1, kHead = B.head ?? 1;
  const thigh = SDIM.thigh * kH * kL, shin = SDIM.shin * kH * kL, legLen = thigh + shin;
  const pelvis = [body.dx || 0, -legLen - SDIM.footY + (body.dy || 0)];
  const T = SDIM.torso * kH, R = SDIM.R * kHead, lean = body.lean || 0, sy = body.scaleY || 1, bend = body.bend || 0;
  const Wt = SDIM.topW * kW * (kW > 1.1 ? 1.1 : 1);
  // upper-body frame: translate(pelvis) rotate(lean) scale(1, scaleY); `bend` curls the chest about the lower torso
  const bendPt = p => { if (!bend || p[1] > -T * 0.4) return p; const k = clamp((-p[1] - T * 0.4) / (T * 0.6), 0, 1); return rot(p, bend * k, [0, -T * 0.4]); };
  const toChar = p => add(pelvis, rot([p[0], p[1] * sy], lean));
  const fromChar = q => { const p = rot(sub(q, pelvis), -lean); return [p[0], p[1] / sy]; };
  const out = p => [n2(p[0] * facing * scale), n2(p[1] * scale)];

  // legs (character frame, not leaning)
  const legs = ['L', 'R'].map(k => {
    const side = k === 'L' ? -1 : 1, L = {a: 3, b: 0, ...(Pz['leg' + k] || {})};
    const hip = [pelvis[0] + side * SDIM.hip * kW, pelvis[1]], l1 = thigh * (L.la ?? 1), l2 = shin * (L.lb ?? 1);
    let a = L.a, b = L.b;
    if (L.reach) ({a, b} = solveIK(hip, [pelvis[0] + L.reach[0], L.reach[1]], l1, l2, side, el => el[0]));   // knee forward
    const knee = fromAngle(hip, l1, a, side), ankle = fromAngle(knee, l2, a + b, side), c = limbCurve(hip, knee, ankle);
    const parts = [inkLine(c.d, SDIM.limb * kL)], bs = S.bottom.style, tw = SDIM.leg * Math.min(1.15, kW);
    if (bs === 'jeans' || bs === 'pants' || bs === 'trousers') parts.push(tube(c, 0, 0.93, tw, S.bottom.color));
    if (bs === 'shorts') parts.push(tube(c, 0, 0.42, tw * 1.08, S.bottom.color));
    parts.push(footShape(ankle, L.c || 0, S.shoes));
    return {svg: layer('leg-' + k, {}, parts), ankle};   // the foot anchor is the ankle (like the flat rig); the sole is footY below it
  });
  const skirtW = SDIM.hemW * kW;
  const skirt = S.bottom.style === 'skirt' ? layer('bottom', {}, filled(roundPoly([[-skirtW * 0.5, -12], [skirtW * 0.5, -12], [skirtW * 0.92, legLen * 0.36, 10], [-skirtW * 0.92, legLen * 0.36, 10]], 8), S.bottom.color)) : '';

  // arms (upper-body frame)
  const sleeveLong = LONG_SLEEVE.has(S.top.style), sleeveNone = NO_SLEEVE.has(S.top.style);
  const shortSleeveCol = S.top.style === 'apron' ? (S.top.detail || PAPER) : S.top.color;
  const upperLen = SDIM.upper * kH * kL, foreLen = SDIM.fore * kH * kL;
  const arms = ['L', 'R'].map(k => {
    const side = k === 'L' ? -1 : 1, A = {a: 8, b: 4, ...(Pz['arm' + k] || {})}, sh = bendPt([side * (Wt / 2 - SDIM.shIn), -T + SDIM.shY]);
    const l1 = upperLen * (A.la ?? 1), l2 = foreLen * (A.lb ?? 1);
    let a = A.a, b = A.b;
    if (A.reach) ({a, b} = solveIK(sh, fromChar([pelvis[0] + A.reach[0], A.reach[1]]), l1, l2, side, el => el[1] + el[0] * side * 0.3));   // elbow down and out
    const el = fromAngle(sh, l1, a, side), wr = fromAngle(el, l2, a + b, side), c = limbCurve(sh, el, wr), parts = [], z = A.z || 'front';
    // the upper sleeve joins the top's silhouette (front arms) or is drawn whole behind it (z: back); a long sleeve's
    // forearm part stays in the arm layer with its own outline so a forearm across the chest still reads
    const su = sleeveLong ? 0.5 : S.top.style === 'dress' ? 0.3 : 0.36, uStick = sleeveNone ? 0 : sleeveLong ? 0.86 : su - 0.05;
    const upperSleeve = sleeveNone ? null : tubeParts(c, 0, su, SDIM.sleeve, sleeveLong ? S.top.color : shortSleeveCol, {hem: !sleeveLong});
    if (z === 'back' && upperSleeve) parts.push(upperSleeve.ink, upperSleeve.fill);
    if (sleeveLong) parts.push(tube(c, 0.44, 0.9, SDIM.sleeve, S.top.color));
    parts.push(inkLine(uStick ? polyD(samplePolyline(c, uStick, 1).pts) : c.d, SDIM.limb * kL));
    parts.push(handShape(wr), hold[k] ? PROPS_HELD(hold[k], wr, a + b + (A.c || 0), side, t, {style: 'stick', facing}) : '');
    return {svg: layer('arm-' + k, {}, parts), z, wr, sleeve: z === 'back' ? null : upperSleeve};
  });

  // torso, neck, head (the neck pivot is the torso top; head tilt rotates about it)
  const torso = torsoLayer(S, T, Wt, bendPt, legLen, arms.map(a => a.sleeve).filter(Boolean));
  const neckBase = bendPt([0, -T]), pivot = [neckBase[0] + (hd.dx || 0), neckBase[1] + (hd.dy || 0)], tilt = hd.tilt || 0;
  const headC = [0, -SDIM.neck - R + 4];   // head centre in the head frame (origin at the pivot)
  const neck = layer('neck', {}, inkLine(`M${P(neckBase)} L${P(add(pivot, rot([0, -SDIM.neck], tilt)))}`, SDIM.limb));
  const raisedY = pivot[1] + headC[1] - R * 0.2;   // a hand above the head's middle goes BEHIND the big head (wave, cheer)
  const head = layer('head', {transform: `translate(${n2(pivot[0])} ${n2(pivot[1])})${tilt ? ` rotate(${n2(tilt)})` : ''} translate(0 ${n2(headC[1])})`}, headLayer(S, f, R, t));
  const upper = g({transform: `translate(${n2(pelvis[0])} ${n2(pelvis[1])})${lean ? ` rotate(${n2(lean)})` : ''}${sy !== 1 ? ` scale(1 ${n2(sy)})` : ''}`},
    arms.filter(a => a.z === 'back').map(a => a.svg), torso, skirt, neck,
    arms.filter(a => a.z !== 'back' && a.wr[1] < raisedY).map(a => a.svg), head, arms.filter(a => a.z !== 'back' && a.wr[1] >= raisedY).map(a => a.svg));
  const shadowSvg = shadow ? layer('shadow', {}, ellipse(pelvis[0] * 0.5, 2, 130 * kW + 30, 18, '#000000', {opacity: 0.06}), ellipse(pelvis[0] * 0.5, 2, 90 * kW + 20, 11, '#000000', {opacity: 0.08})) : '';
  const svg = layer(`character:${C.id || 'person'}`, {transform: `scale(${n2(facing * scale)} ${n2(scale)})`}, shadowSvg, layer('legs', {}, legs.map(l => l.svg)), upper);

  const headPt = p => toChar(add(pivot, rot(add(headC, p), tilt)));
  const turn = faceTurn(f);
  const anchors = {
    headTop: out(headPt([0, -R])), headCenter: out(headPt([0, 0])), mouth: out(headPt([turn * R * 0.4, R * 0.4])),
    handL: out(toChar(arms[0].wr)), handR: out(toChar(arms[1].wr)), footL: out(legs[0].ankle), footR: out(legs[1].ankle),
  };
  return {svg, pelvis, height: legLen + SDIM.footY + T + SDIM.neck + 2 * R - 4, anchors};
}
