// v2 character: a parametric flat-vector person built as NAMED SVG LAYERS on a forward-kinematics rig (with two-bone IK).
//
// Layer stack (bottom → top), like an Illustrator file rigged in After Effects (Duik):
//   shadow · legs[leg-L, leg-R, hips] · upper[hair-back, arm-*(z:back), neck, torso(+bottom, shoulders), head[ears, face,
//   face-shade, cheeks, eyes, brows, nose, mouth, hair-front, accessory], arm-*(z:front) + held props]
// Rig (parent → child): pelvis → torso(lean, bend) → neck pivot → head(tilt) ; torso → shoulder → elbow → wrist(c) → prop ;
// pelvis → hip → knee → ankle(c) → shoe.
// Every limb rotates at its joint; angles are degrees, 0 = hanging straight down, positive = swinging OUTWARD (away from the
// body's centre line), elbows/knees add to their parent, wrists/ankles add to those. `reach: [x, y]` replaces a/b with IK.
// Local units: 1 = 1 px at scale 1; y = 0 is the ground, up is negative.
import {layer, g, path, circle, ellipse, rect, stroke, blob, rrect, tr} from './svg.mjs';
import {SKIN, HAIR, CLOTH, tone, mixHex, resolve, DIM, POSES, BUILDS, pickPalette} from './style.mjs';
import {PROPS_HELD} from './props.mjs';
// Circular import: stick.mjs may import from here and this file imports buildStick. buildStick is only called inside
// buildCharacter (never while the modules load), and the shared constants (DIM, POSES) live in style.mjs, so the cycle is
// safe in Node ESM and in the browser whichever module loads first.
import {buildStick} from './stick.mjs';
export {DIM, POSES};

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
const r2 = v => +v.toFixed(2);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = a => Math.hypot(a[0], a[1]), dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const unit = a => { const L = len(a) || 1; return [a[0] / L, a[1] / L]; };
const wrap180 = d => ((d + 180) % 360 + 360) % 360 - 180;
/** direction of a limb at `deg` (0 = down, + = outward on `side`) */
const dirOf = (deg, side) => [Math.sin(deg * D2R) * side, Math.cos(deg * D2R)];
const fromAngle = (p, L, deg, side) => add(p, mul(dirOf(deg, side), L));
// 2-D affine matrices [a b c d e f], composed like an SVG transform list
const M = {
  id: [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
  t: (x, y) => [1, 0, 0, 1, x, y], r: deg => { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [c, s, -s, c, 0, 0]; }, s: (x, y = x) => [x, 0, 0, y, 0, 0],
  apply: (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]],
  inv: m => { const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det; return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]; },
};
const chain = (...ms) => ms.reduce((acc, m) => M.mul(acc, m), M.id);
const mtx = m => `matrix(${m.map(r2).join(' ')})`;

// ---------- pre-clipped geometry ----------
// resvg turns every clipPath into a full-frame mask, which was about half the cost of drawing an actor. So shading is
// computed instead: sample the part's outline into a polygon and intersect it with the (convex) shade region.
function sampleBlob(pts, closed = true, t = 0.5, n = 10) {   // the same Catmull-Rom curve svg.blob() draws, as points
  const P = closed ? [pts.at(-1), ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts.at(-1)], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3], c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    for (let j = 0; j < n; j++) { const u = j / n, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]); }
  }
  return out;
}
const quadPts = (p0, c, p1, n = 8) => Array.from({length: n}, (_, j) => { const u = j / n, v = 1 - u; return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]]; });
const ellPoly = (cx, cy, rx, ry, n = 36) => Array.from({length: n}, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const polyArea = p => p.reduce((acc, q, i) => { const r = p[(i + 1) % p.length]; return acc + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
/** Sutherland–Hodgman: `subject` (any simple polygon) ∩ `clip` (convex polygon, either winding) */
function clipPoly(subject, clip) {
  const o = Math.sign(polyArea(clip)) || 1; let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length], side = q => o * ((B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]));
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], dp = side(P), dq = side(Q);
      if (dp >= 0) out.push(P);
      if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k]); }
    }
  }
  return out;
}
const polyD = pts => (pts.length < 3 ? '' : 'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L') + 'Z');
/** the part of `subject` inside convex `clip`, filled (empty string when they do not overlap) */
const cut = (subject, clip, fill, map) => { let p = clipPoly(subject, clip); if (p.length < 3) return ''; if (map) p = p.map(map); return path(polyD(p), fill); };

/** fill in a character definition with defaults (JSON → full spec). Palette colours fill only what the entry leaves out. */
export function defineCharacter(def = {}) {
  const id = def.id || 'person', pal = pickPalette(def.palette, id) || {};
  const bdef = typeof def.build === 'string' ? {preset: def.build} : (def.build || {});
  const b = {height: 1, head: 1, width: 1, limbs: 1, thick: 1, waist: 1, shoulders: 1, hips: 1, ...(BUILDS[bdef.preset] || {}), ...bdef};
  const topStyle = def.top?.style || 'tee';
  const face = {eyes: 'round', nose: 'button', blush: false, ...def.face};
  const lips = face.lipstick ? (face.lipstick === true ? (pal.lips || '#D2384F') : resolve(face.lipstick, CLOTH)) : null;
  const acc = [...(def.accessories || [])];
  if (def.bow && !acc.some(a => (a?.type || a) === 'bow')) acc.push(typeof def.bow === 'object' ? {type: 'bow', ...def.bow} : {type: 'bow', color: def.bow === true ? undefined : def.bow});
  return {
    id, style: def.style, raw: def, palette: def.palette, build: b,
    skin: tone(resolve(def.skin || pal.skin || 'peach', SKIN)),
    hair: {style: def.hair?.style || 'short', ...tone(resolve(def.hair?.color || pal.hair || 'brown', HAIR))},
    top: {style: topStyle, ...tone(resolve(def.top?.color || pal.top || 'green', CLOTH)), detail: resolve(def.top?.detail || pal.detail, CLOTH)},
    // a dress with no bottom given means bare legs (it used to put jeans under every dress)
    bottom: {style: def.bottom?.style || (topStyle === 'dress' ? 'none' : 'jeans'), ...tone(resolve(def.bottom?.color || pal.bottom || 'denim', CLOTH))},
    shoes: {style: def.shoes?.style || 'sneaker', ...tone(resolve(def.shoes?.color || pal.shoes || 'charcoal', CLOTH)), sole: def.shoes?.sole || '#F4F2EE'},
    face, lips, acc, accent: tone(resolve(pal.accent || 'red', CLOTH)),
    mouthDark: '#4A1D22', tongue: '#E8566A', teeth: '#FFFFFF', eyeWhite: '#FFFFFF', pupil: '#1C1A1E',
  };
}

// ---------- poses ----------
/**
 * walk cycle in front 3/4 view (facing +x): the legs ALTERNATE, one forward while the other goes back, the arms counter-swing,
 * the body bobs twice per cycle, and the passing leg lifts its knee. phase in cycles.
 * `a` is mirrored by side (positive = outward), so a screen swing σ is a = base − σ on BOTH sides: left screen = −a, right = +a.
 */
export function walkPose(phase, {stride = 1} = {}) {
  const s = Math.sin(phase * Math.PI * 2), c = Math.cos(phase * Math.PI * 2), sw = 10 * stride, as = 16 * stride;   // a smaller screen swing: the feet meet at mid-stride, never cross
  // left leg screen angle = s·sw − 4 (forward when s > 0); right leg = 4 − s·sw (back when s > 0); arms the other way
  const liftL = Math.max(0, c) * 30 * stride, liftR = Math.max(0, -c) * 30 * stride;   // the leg passing under the body bends
  return {body: {dy: -Math.abs(c) * 8, lean: 2},
    armL: {a: 10 + s * as, b: 10 + Math.max(0, -s) * 14}, armR: {a: 10 + s * as, b: 10 + Math.max(0, s) * 14},
    legL: {a: 4 - s * sw, b: liftL}, legR: {a: 4 - s * sw, b: -liftR}};
}

/**
 * Two-bone IK. root/target in the same frame (y down). Returns {a, b, mid, end, reached} with a/b in the rig's angle convention
 * for `side` (-1 left, +1 right). `hint` is the preferred direction of the middle joint (elbow: down and out; knee: forward).
 * An unreachable target straightens the limb toward it.
 */
export function solveIK(root, target, L1, L2, {side = 1, hint = [side, 1]} = {}) {
  const v = sub(target, root), d0 = len(v), d = clamp(d0, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const psiT = d0 > 1e-6 ? Math.atan2(v[0], v[1]) : 0;
  const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const end = add(root, mul([Math.sin(psiT), Math.cos(psiT)], d));
  const opts = [psiT + alpha, psiT - alpha].map(p1 => { const mid = add(root, mul([Math.sin(p1), Math.cos(p1)], L1)); return {p1, mid, score: dot(sub(mid, mul(add(root, end), 0.5)), hint)}; });
  const best = opts[0].score >= opts[1].score ? opts[0] : opts[1];
  const v2 = sub(end, best.mid), p2 = Math.atan2(v2[0], v2[1]);
  return {a: best.p1 * R2D * side, b: wrap180((p2 - best.p1) * R2D) * side, mid: best.mid, end, reached: d0 <= L1 + L2};
}

// ---------- limb geometry ----------
/** offset a polyline along its normal [-dy, dx]·k: mitred on the inside of a bend, a round arc on the outside (no kink) */
function offsetLine(pts, k) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = unit(sub(pts[i + 1], pts[i])); segs.push({d, n: [-d[1] * k, d[0] * k], L: len(sub(pts[i + 1], pts[i]))}); }
  const out = [add(pts[0], segs[0].n)];
  for (let i = 1; i < pts.length - 1; i++) {
    const s1 = segs[i - 1], s2 = segs[i], P = pts[i], cross = s1.d[0] * s2.d[1] - s1.d[1] * s2.d[0];
    if (Math.abs(cross) < 1e-4 && dot(s1.d, s2.d) > 0) { out.push(add(P, s1.n)); continue; }
    if (dot(s2.d, s1.n) > 0) {   // the limb turns toward the offset side: inside of the bend → mitre point
      const a = add(P, s1.n), b = add(P, s2.n), t = ((b[0] - a[0]) * s2.d[1] - (b[1] - a[1]) * s2.d[0]) / cross;
      out.push(Math.abs(t) < Math.min(s1.L, s2.L) * 0.9 ? add(a, mul(s1.d, t)) : add(P, mul(unit(add(s1.n, s2.n)), Math.abs(k))));
    } else {                      // outside of the bend → arc around the joint
      const a1 = Math.atan2(s1.n[1], s1.n[0]), a2 = Math.atan2(s2.n[1], s2.n[0]), da = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
      const steps = Math.max(1, Math.ceil(Math.abs(da) / 0.22)), r = Math.abs(k);
      for (let j = 0; j <= steps; j++) { const an = a1 + da * j / steps; out.push([P[0] + Math.cos(an) * r, P[1] + Math.sin(an) * r]); }
    }
  }
  out.push(add(pts.at(-1), segs.at(-1).n));
  return out;
}
/** a two-tone tube through `pts`: base stroke + a narrower shade stroke on the `side` edge, rounded joins */
const tube = (pts, w, base, shadeCol, side, k = 0.24, ws = 0.42) => [stroke(pts, base, w), stroke(offsetLine(pts, w * k * side), shadeCol, w * ws)];
/** a garment segment that starts round at `a` and ends with a cut hem at `b` (short sleeve, shorts leg, boot shaft) */
function cover(a, b, w, col, side, {roundStart = true, hem = true} = {}) {
  const d = unit(sub(b, a)), n = [-d[1] * w * 0.27 * side, d[0] * w * 0.27 * side], h = sub(b, mul(d, Math.min(7, len(sub(b, a)) * 0.3)));
  return g({}, roundStart ? circle(a[0], a[1], w / 2, col.base) : '', stroke([a, b], col.base, w, {'stroke-linecap': 'butt'}),
    stroke([add(a, n), add(b, n)], col.shade, w * 0.4, {'stroke-linecap': 'butt'}), roundStart ? circle(a[0] + n[0], a[1] + n[1], w * 0.2, col.shade) : '',
    hem ? stroke([h, b], col.shade, w, {'stroke-linecap': 'butt'}) : '');
}
/** joints of one limb: FK from a/b (+c), or IK when `reach` is given (target already in this limb's frame) */
function limbJoints(root, L1, L2, spec, side, frameRot, target, hint) {
  if (target) { const ik = solveIK(root, target, L1, L2, {side, hint}); return {root, mid: ik.mid, end: ik.end, a1: ik.a, a2: ik.a + ik.b, c: spec.c || 0}; }
  const a1 = (spec.a ?? 8) - side * frameRot, a2 = a1 + (spec.b ?? 0);
  const mid = fromAngle(root, L1, a1, side), end = fromAngle(mid, L2, a2, side);
  return {root, mid, end, a1, a2, c: spec.c || 0};
}

// ---------- parts ----------
function handShape(p, deg, side, skin, size) {
  const r = size;
  return g({transform: tr(p[0], p[1], -deg * side)},
    ellipse(0, r * 0.25, r * 1.0, r * 1.12, skin.base),
    ellipse(r * 0.38 * side, r * 0.42, r * 0.5, r * 0.62, mixHex(skin.base, skin.shade, 0.85)),
    ellipse(-r * 0.86 * side, -r * 0.05, r * 0.36, r * 0.55, skin.base, {transform: `rotate(${-30 * side} ${r2(-r * 0.86 * side)} ${r2(-r * 0.05)})`}));
}
/** shoe in its own frame: the ankle at (0,0), sole bottom at y = 20·fs (so a planted foot stands on y = 0), toe toward +x */
function shoeShape(C, fs) {
  const c = C.shoes, k = v => v * fs;
  if (c.style === 'flat') {
    const foot = rrect(k(-26), k(-14), k(78), k(30), [k(12), k(18), k(8), k(8)]), sh = rrect(k(-28), k(0), k(82), k(20), [k(6), k(12), k(8), k(8)]);
    return g({}, path(foot, C.skin.base), path(sh, c.base), path(rrect(k(-28), k(0), k(24), k(20), [k(6), 0, 0, k(8)]), c.shade), stroke([[k(-26), k(19)], [k(52), k(19)]], c.deep, k(3)), circle(k(30), k(4), k(5), c.light));
  }
  const body = rrect(k(-30), k(-22), k(84), k(36), [k(16), k(20), k(6), k(6)]);
  return g({}, path(body, c.base), path(rrect(k(-30), k(-22), k(26), k(36), [k(16), 0, 0, k(6)]), c.shade),
    path(rrect(k(-32), k(10), k(88), k(10), k(4)), c.style === 'boot' ? c.deep : c.sole),
    c.style === 'boot' ? '' : stroke([[k(4), k(-12)], [k(22), k(-12)]], c.light, k(4)));
}

// ---------- torso (with a bend warp: every point rotates about the pelvis by bend × its height fraction) ----------
function torsoLayer(C, bend, armBall) {
  const B = C.build, T = DIM.torso * B.height, W = DIM.topW * B.width * B.shoulders, Wb = DIM.botW * B.width * B.hips, wa = B.waist;
  const st = C.top.style, top = C.top, bot = C.bottom, sk = C.skin;
  const angAt = y => (bend || 0) * clamp(-y / T, 0, 1.2);
  const wp = ([x, y]) => { const a = angAt(y) * D2R, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const at = (p, ...kids) => { const q = wp(p); return g({transform: tr(q[0], q[1], angAt(p[1]))}, ...kids); };
  const outlinePts = [[-W * 0.42, -T + 8], [0, -T - 6], [W * 0.42, -T + 8], [W * 0.5, -T + 40], [Wb * 0.52 * wa, -T * 0.38], [Wb * 0.5, 0], [0, 14], [-Wb * 0.5, 0], [-Wb * 0.52 * wa, -T * 0.38], [-W * 0.5, -T + 40]];
  // the outline as a polygon in the unbent frame; every shade is outline ∩ a convex region, densified, then bent
  const OP = sampleBlob(outlinePts, true, 0.5, 12);
  const dense = pts => { const out = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(len(sub(q, p)) / 14)); for (let j = 0; j < n; j++) out.push([p[0] + (q[0] - p[0]) * j / n, p[1] + (q[1] - p[1]) * j / n]); }); return out; };
  const wcut = (clip, fill) => { const pp = clipPoly(OP, clip); return pp.length < 3 ? '' : path(polyD(dense(pp).map(wp)), fill); };
  const dress = st === 'dress', bare = bot.style === 'none';
  const parts = [path(polyD(dense(OP).map(wp)), top.base),
    wcut(rectPoly(W * 0.16, -T - 20, W, T + 60), top.shade),
    wcut(ellPoly(0, -T + 4, W * 0.24, 26), mixHex(top.base, top.shade, 0.7)),
    st === 'hoodie' ? at([0, -T * 0.27], path(rrect(-W * 0.3, -T * 0.15, W * 0.6, T * 0.3, [10, 10, 18, 18]), top.shade)) : '',
    st === 'jacket' ? [wcut(rectPoly(-W * 0.11, -T - 10, W * 0.22, T + 30), top.detail || '#F2F0EC'), wcut(rectPoly(-W * 0.02, -T - 10, W * 0.04, T + 30), top.deep)] : '',
    st === 'shirt' ? [0.18, 0.4, 0.62, 0.84].map(k => at([0, -T + T * k], circle(0, 0, 5, top.deep))) : '',
    st === 'blouse' ? [0.3, 0.48, 0.66].map(k => at([0, -T + T * k], circle(0, 0, 4.5, top.detail || top.light))) : '',
    st === 'stripes' ? [0.2, 0.38, 0.56, 0.74].map(k => wcut(rectPoly(-W, -T + T * k, W * 2, 18), top.detail || top.light)) : '',
    // waistband / bottom garment at the hips (covers the tops of the legs)
    !dress && !bare ? [wcut(rectPoly(-Wb * 0.6, -32, Wb * 1.2, 60), bot.base), wcut(rectPoly(Wb * 0.16, -32, Wb, 60), bot.shade)] : '',
  ];
  if (st === 'tee' || st === 'stripes' || dress) parts.push(at([0, -T + 2], path(`M-26 0 Q0 28 26 0Z`, sk.shade)));
  if (st === 'tank') parts.push(at([0, -T + 4], path(`M-34 0 Q0 48 34 0Z`, sk.base)));
  if (st === 'shirt') parts.push(at([0, -T + 2], path(`M-30 0 L0 32 L-6 0Z`, top.light), path(`M30 0 L0 32 L6 0Z`, top.light)));
  if (st === 'hoodie') parts.push(at([0, -T], stroke([[-14, 18], [-16, 74]], top.light, 5), stroke([[14, 18], [16, 74]], top.light, 5)));
  if (st === 'jacket') parts.push(at([0, -T], path(`M${r2(-W * 0.11)} 0 L${r2(-W * 0.24)} 70 L${r2(-W * 0.1)} 60Z`, top.deep), path(`M${r2(W * 0.11)} 0 L${r2(W * 0.24)} 70 L${r2(W * 0.1)} 60Z`, top.deep)));
  if (st === 'blouse') { const col = top.detail || '#F7F4EE';   // a round "Peter Pan" collar over a skin scoop
    parts.push(at([0, -T + 2], path(`M-24 0 Q0 22 24 0Z`, sk.shade), path(blob([[0, 2], [-16, -3], [-40, 4], [-38, 22], [-14, 24]]), col), path(blob([[0, 2], [16, -3], [40, 4], [38, 22], [14, 24]]), col), circle(0, 10, 4, mixHex(col, '#000000', 0.25)))); }
  if (dress) { const L = DIM.thigh * B.height * B.limbs * 0.95, d = blob([[-Wb * 0.5, -10], [Wb * 0.5, -10], [Wb * 0.9, L], [0, L + 10], [-Wb * 0.9, L]]);
    parts.push(path(d, top.base), cut(sampleBlob([[-Wb * 0.5, -10], [Wb * 0.5, -10], [Wb * 0.9, L], [0, L + 10], [-Wb * 0.9, L]]), rectPoly(Wb * 0.15, -20, Wb, L + 40), top.shade), top.detail ? path(rrect(-Wb * 0.56, -24, Wb * 1.12, 16, 6), top.detail) : ''); }
  if (bot.style === 'skirt' && !dress) { const L = DIM.thigh * B.height * B.limbs * 0.7, d = blob([[-Wb * 0.55, -20], [Wb * 0.55, -20], [Wb * 0.85, L], [-Wb * 0.85, L]]);
    parts.push(path(d, bot.base), cut(sampleBlob([[-Wb * 0.55, -20], [Wb * 0.55, -20], [Wb * 0.85, L], [-Wb * 0.85, L]]), rectPoly(Wb * 0.15, -30, Wb, L + 40), bot.shade)); }
  // shoulder "ball" caps in the sleeve colour: the arm turns inside a round joint, so a raised or crossed arm leaves no gap
  const shoulder = side => wp([side * DIM.shoulder * B.width * B.shoulders, -T + 30]);
  // (the ball takes the torso's colour where it sits, base on the lit left, shade on the right, so it only rounds the silhouette)
  for (const side of [-1, 1]) { const p = shoulder(side); parts.push(circle(p[0], p[1], armBall.r, side > 0 ? armBall.shade : armBall.col)); }
  return {svg: layer('torso', {}, parts), T, W, Wb, wp, angAt, shoulder, neckBase: wp([0, -T + 6])};
}

// ---------- head ----------
const HAIR_TOP = {quiff: 0.26, spiky: 0.3, bun: 0.3, curly: 0.1, curlyLong: 0.1, 'curly-long': 0.1, ponytail: 0.06, pigtails: 0.05, bob: 0.08, long: 0.08};
/** hair drawn BEHIND the body (long hair, tails, bun). Tails hang with gravity: `grav` is the head's total screen rotation. */
function hairBack(C, W, H, f, grav) {
  const h = C.hair, st = h.style, turn = f.turn || 0, tie = C.accent;
  const hang = (p, ...kids) => g({transform: `translate(${r2(p[0])} ${r2(p[1])}) rotate(${r2(-grav * 0.85)})`}, ...kids);
  if (st === 'bob') return path(blob([[-W * 0.58, -H * 0.1], [-W * 0.5, -H * 0.5], [0, -H * 0.62], [W * 0.5, -H * 0.5], [W * 0.58, -H * 0.1], [W * 0.6, H * 0.42], [W * 0.3, H * 0.5], [-W * 0.3, H * 0.5], [-W * 0.6, H * 0.42]]), h.shade);
  if (st === 'long') return path(blob([[-W * 0.6, -H * 0.15], [-W * 0.52, -H * 0.52], [0, -H * 0.63], [W * 0.52, -H * 0.52], [W * 0.6, -H * 0.15], [W * 0.66, H * 0.9], [W * 0.2, H * 1.0], [-W * 0.2, H * 1.0], [-W * 0.66, H * 0.9]]), h.shade);
  if (st === 'bun') return g({}, circle(0, -H * 0.62, W * 0.2, h.base), path(blob([[-W * 0.02, -H * 0.76], [W * 0.12, -H * 0.72], [W * 0.14, -H * 0.6], [W * 0.04, -H * 0.64]]), h.light));
  if (st === 'curly') return [[-0.5, -0.2], [0.5, -0.2], [-0.42, -0.42], [0.42, -0.42]].map(([x, y]) => circle(W * x, H * y, W * 0.16, h.shade)).join('');
  if (st === 'curlyLong' || st === 'curly-long') {
    const pts = [[-0.5, -0.4], [-0.6, -0.12], [-0.64, 0.18], [-0.6, 0.48], [-0.5, 0.74], [-0.3, 0.86], [0.5, -0.4], [0.6, -0.12], [0.64, 0.18], [0.6, 0.48], [0.5, 0.74], [0.3, 0.86], [-0.25, -0.6], [0.25, -0.6], [0, -0.66]];
    return g({}, path(blob([[-W * 0.6, -H * 0.3], [0, -H * 0.66], [W * 0.6, -H * 0.3], [W * 0.62, H * 0.78], [0, H * 0.84], [-W * 0.62, H * 0.78]]), h.shade), ...pts.map(([x, y], i) => circle(W * x, H * y, W * (0.17 + (i % 3) * 0.015), i % 2 ? h.shade : h.deep)));
  }
  if (st === 'ponytail') {   // the tail shows on the side away from the turn
    const s = turn > 0.05 ? -1 : 1, root = [s * W * 0.42, -H * 0.34];
    const tp = [[-s * W * 0.06, -H * 0.03], [s * W * 0.1, -H * 0.07], [s * W * 0.3, H * 0.1], [s * W * 0.34, H * 0.42], [s * W * 0.22, H * 0.7], [s * W * 0.12, H * 0.46], [s * W * 0.02, H * 0.16]];
    return hang(root, path(blob(tp), h.base), cut(sampleBlob(tp), [[s * W * 0.2, -H * 0.1], [s * W * 0.6, -H * 0.1], [s * W * 0.5, H * 0.9], [s * W * 0.2, H * 0.7]], h.shade), ellipse(0, -H * 0.01, W * 0.07, W * 0.055, tie.base, {transform: `rotate(${-30 * s})`}));
  }
  if (st === 'pigtails') return [-1, 1].map(s => {
    const root = [s * W * 0.5, -H * 0.16], tp = [[0, -H * 0.07], [s * W * 0.16, -H * 0.02], [s * W * 0.26, H * 0.2], [s * W * 0.2, H * 0.46], [s * W * 0.08, H * 0.32], [-s * W * 0.03, H * 0.08]];
    return hang(root, path(blob(tp), h.base), cut(sampleBlob(tp), rectPoly(s > 0 ? W * 0.12 : -W * 0.4, -H * 0.1, W * 0.28, H * 0.7), h.shade), circle(0, 0, W * 0.06, tie.base));
  }).join('');
  return '';
}
function hairFront(C, W, H) {
  const h = C.hair, st = h.style;
  const cap = blob([[-W * 0.5, -H * 0.06], [-W * 0.46, -H * 0.38], [-W * 0.2, -H * 0.53], [W * 0.2, -H * 0.53], [W * 0.46, -H * 0.38], [W * 0.5, -H * 0.06], [W * 0.36, -H * 0.24], [0, -H * 0.3], [-W * 0.36, -H * 0.24]]);
  switch (st) {
    case 'bald': return ellipse(-W * 0.18, -H * 0.36, W * 0.1, H * 0.05, mixHex(C.skin.base, '#FFFFFF', 0.25));
    case 'buzz': return path(cap, mixHex(h.base, C.skin.base, 0.1));
    case 'quiff': return g({}, path(cap, h.base),
      path(blob([[-W * 0.42, -H * 0.36], [-W * 0.18, -H * 0.64], [W * 0.12, -H * 0.76], [W * 0.46, -H * 0.66], [W * 0.38, -H * 0.42], [W * 0.1, -H * 0.4]]), h.base),
      path(blob([[W * 0.0, -H * 0.62], [W * 0.3, -H * 0.7], [W * 0.38, -H * 0.56], [W * 0.14, -H * 0.5]]), h.light),
      rect(-W * 0.52, -H * 0.22, W * 0.07, H * 0.24, h.base, {rx: 6}), rect(W * 0.45, -H * 0.22, W * 0.07, H * 0.24, h.base, {rx: 6}));
    case 'bob': return g({}, path(blob([[-W * 0.52, H * 0.1], [-W * 0.52, -H * 0.36], [-W * 0.2, -H * 0.56], [W * 0.22, -H * 0.56], [W * 0.52, -H * 0.36], [W * 0.52, H * 0.1], [W * 0.4, -H * 0.18], [W * 0.05, -H * 0.24], [-W * 0.3, -H * 0.2], [-W * 0.42, -H * 0.02]]), h.base),
      path(blob([[-W * 0.18, -H * 0.5], [W * 0.18, -H * 0.52], [W * 0.1, -H * 0.4], [-W * 0.12, -H * 0.4]]), h.light));
    case 'long': return g({}, path(blob([[-W * 0.54, H * 0.2], [-W * 0.52, -H * 0.36], [-W * 0.2, -H * 0.56], [W * 0.24, -H * 0.56], [W * 0.54, -H * 0.36], [W * 0.56, H * 0.25], [W * 0.44, -H * 0.12], [W * 0.1, -H * 0.3], [-W * 0.22, -H * 0.3], [-W * 0.45, -H * 0.05]]), h.base),
      path(blob([[-W * 0.22, -H * 0.5], [W * 0.1, -H * 0.53], [W * 0.02, -H * 0.43], [-W * 0.2, -H * 0.42]]), h.light));
    case 'bun': return g({}, path(cap, h.base), path(blob([[-W * 0.2, -H * 0.48], [W * 0.14, -H * 0.5], [W * 0.06, -H * 0.42], [-W * 0.18, -H * 0.42]]), h.light));
    case 'ponytail': return g({}, path(blob([[-W * 0.5, -H * 0.04], [-W * 0.47, -H * 0.38], [-W * 0.2, -H * 0.55], [W * 0.22, -H * 0.55], [W * 0.47, -H * 0.38], [W * 0.5, -H * 0.04], [W * 0.42, -H * 0.2], [W * 0.12, -H * 0.3], [-W * 0.22, -H * 0.24], [-W * 0.4, -H * 0.18]]), h.base),
      path(blob([[-W * 0.24, -H * 0.5], [W * 0.12, -H * 0.53], [W * 0.04, -H * 0.43], [-W * 0.2, -H * 0.42]]), h.light));
    case 'pigtails': return g({}, path(cap, h.base), stroke([[0, -H * 0.53], [0, -H * 0.36]], h.shade, 5), path(blob([[-W * 0.3, -H * 0.48], [-W * 0.08, -H * 0.52], [-W * 0.1, -H * 0.42], [-W * 0.28, -H * 0.4]]), h.light));
    case 'curly': return g({}, ...[[-0.38, -0.36], [-0.18, -0.5], [0.04, -0.54], [0.25, -0.48], [0.42, -0.34], [-0.48, -0.16], [0.5, -0.14]].map(([x, y], i) => circle(W * x, H * y, W * (0.17 - (i % 2) * 0.02), i % 3 ? h.base : h.light)));
    case 'curlyLong': case 'curly-long': return g({}, ...[[-0.44, -0.3], [-0.28, -0.46], [-0.08, -0.53], [0.12, -0.53], [0.3, -0.46], [0.45, -0.3], [-0.52, -0.06], [0.53, -0.06], [-0.54, 0.18], [0.55, 0.18]].map(([x, y], i) => circle(W * x, H * y, W * (0.15 - (i % 2) * 0.02), i % 3 === 1 ? h.light : h.base)));
    case 'spiky': return path(`M${-W * 0.52} ${-H * 0.1} L${-W * 0.5} ${-H * 0.46} L${-W * 0.34} ${-H * 0.72} L${-W * 0.2} ${-H * 0.52} L${-W * 0.02} ${-H * 0.8} L${W * 0.12} ${-H * 0.54} L${W * 0.32} ${-H * 0.74} L${W * 0.36} ${-H * 0.48} L${W * 0.54} ${-H * 0.52} L${W * 0.5} ${-H * 0.1} L${W * 0.36} ${-H * 0.26} L${-W * 0.36} ${-H * 0.26}Z`, h.base);
    default: return path(cap, h.base); // 'short'
  }
}
function eyes(C, W, H, f) {
  const turn = clamp(f.turn || 0, -1, 1), mode = f.eyes || 'open', lashes = !!C.face.lashes;
  let [lx, ly] = f.look || [0, 0]; const lm = Math.hypot(lx, ly); if (lm > 1) { lx /= lm; ly /= lm; }   // a big `look` stays inside the eye
  const ex = W * 0.2, ey = -H * 0.02 + (f.eyeDy || 0), rx0 = W * (mode === 'wide' ? 0.125 : 0.105), ry = W * (mode === 'wide' ? 0.15 : 0.122);
  const out = [];
  for (const side of [-1, 1]) {
    const far = side * turn > 0, rx = rx0 * (far ? 1 - Math.abs(turn) * 0.22 : 1 + Math.abs(turn) * 0.04);   // the far eye narrows in 3/4 view
    const cx = side * ex * (1 - Math.abs(turn) * 0.25) + turn * W * 0.14, cy = ey;
    const flick = y => lashes ? [stroke([[cx + side * rx * 0.8, y - ry * 0.05], [cx + side * (rx + 9), y - ry * 0.45]], C.pupil, 4.5), stroke([[cx + side * rx * 0.45, y - ry * 0.3], [cx + side * (rx * 0.6 + 6), y - ry * 0.75]], C.pupil, 4)] : [];
    if (mode === 'closed' || f.blink >= 1) { out.push(stroke([[cx - rx, cy + 2], [cx, cy + ry * 0.45], [cx + rx, cy + 2]], C.pupil, 7), ...flick(cy + 6)); continue; }
    if (mode === 'happy') { out.push(stroke([[cx - rx, cy + ry * 0.3], [cx, cy - ry * 0.4], [cx + rx, cy + ry * 0.3]], C.pupil, 8), ...flick(cy + ry * 0.1)); continue; }
    const eye = ellipse(cx, cy, rx, ry, C.eyeWhite), E = ellPoly(cx, cy, rx, ry, 40), pr = rx0 * (mode === 'wide' ? 0.42 : 0.5);
    const lids = []; let lidY = cy - ry - 2;   // lids are drawn as eye ∩ lid shape (no clip paths)
    if (mode === 'tired' || mode === 'bored') { lidY = cy - ry - 2 + ry * 0.95; lids.push(rectPoly(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 0.95)); }
    if (mode === 'angry') { lidY = cy - ry * 0.55; lids.push([[cx - rx - 2, cy - ry - 2], [cx + rx + 2, cy - ry - 2], [cx - side * (rx + 2), cy - ry * 0.12]]); }
    const px = cx + lx * Math.max(0, rx - pr) * 0.96, py = Math.max(cy + ly * ry * 0.45, lidY + pr * 0.75);   // a lidded eye never hides its whole pupil
    if (f.blink > 0 && f.blink < 1) lids.push(rectPoly(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 * f.blink + 2));
    out.push(eye, cut(ellPoly(px, py, pr, pr, 28), E, C.pupil), cut(ellPoly(px + pr * 0.35, py - pr * 0.4, pr * 0.28, pr * 0.28, 16), E, '#FFFFFF'), ...lids.map(l => cut(E, l, C.skin.base)));
    if (lashes) {   // a lash line along the top of the visible eye + two flicks at the outer corner
      const lidded = mode === 'tired' || mode === 'bored';
      const top = lidded ? [[cx - rx, lidY], [cx + rx, lidY]] : Array.from({length: 9}, (_, i) => { const a = Math.PI + Math.PI * i / 8; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
      out.push(stroke(top, C.pupil, 5), ...flick(lidded ? lidY + ry * 0.2 : cy - ry * 0.55));
    }
  }
  return layer('eyes', {}, out);
}
function brows(C, W, H, f) {
  const mode = f.brows || 'flat', turn = f.turn || 0, col = C.hair.style === 'bald' ? C.skin.deep : C.hair.deep, y = -H * 0.17, fem = !!C.face.lashes;
  const tilt = {flat: 0, up: 0, worried: 14, angry: -16, sad: 12, raised: -4}[mode] ?? 0, dy = {up: -16, raised: -10, worried: -6, sad: -2}[mode] ?? 0;
  return layer('brows', {}, [-1, 1].map(side => { const cx = side * W * 0.2 + turn * W * 0.14;
    return g({transform: `rotate(${tilt * side} ${r2(cx)} ${r2(y + dy)})`}, fem ? stroke([[cx - W * 0.085, y + dy + 3], [cx + side * W * 0.02, y + dy - 4], [cx + W * 0.085, y + dy + 3]], col, 8) : stroke([[cx - W * 0.08, y + dy], [cx + W * 0.08, y + dy]], col, 11)); }));
}
function mouth(C, W, H, f) {
  const m = f.mouth || 'smile', turn = f.turn || 0, x = turn * W * 0.16, y = H * 0.26, w = W * 0.2;
  const dark = C.mouthDark, lip = C.lips, line = lip || dark, lw = lip ? 10 : 8, rim = d => lip ? path(d, 'none', {stroke: lip, 'stroke-width': 6, 'stroke-linejoin': 'round'}) : '';
  switch (m) {
    case 'flat': return stroke([[x - w * 0.55, y], [x + w * 0.55, y]], line, lw);
    case 'sad': return stroke([[x - w * 0.6, y + 10], [x, y - 4], [x + w * 0.6, y + 10]], line, lw);
    case 'smirk': return stroke([[x - w * 0.5, y + 4], [x + w * 0.2, y + 6], [x + w * 0.6, y - 6]], line, lw);
    case 'O': return g({}, ellipse(x, y + 6, w * 0.32, w * 0.42, dark), ellipse(x, y + 16, w * 0.2, w * 0.14, C.tongue), lip ? ellipse(x, y + 6, w * 0.32, w * 0.42, 'none', {stroke: lip, 'stroke-width': 6}) : '');
    case 'teeth': return g({}, path(rrect(x - w * 0.62, y - 10, w * 1.24, 30, 12), C.teeth), stroke([[x - w * 0.6, y + 5], [x + w * 0.6, y + 5]], dark, 3), path(rrect(x - w * 0.62, y - 10, w * 1.24, 30, 12), 'none', {stroke: line, 'stroke-width': lip ? 6 : 5}));
    case 'chew': { const d = `M${r2(x - w * 0.5)} ${y} Q${r2(x)} ${y + 18} ${r2(x + w * 0.5)} ${y}Z`; return g({}, path(d, dark), ellipse(x + w * 0.1, y + 8, w * 0.2, 5, C.tongue), rim(d)); }
    case 'grin': case 'open': case 'scream': {
      const big = m === 'scream' ? 1.25 : m === 'open' ? 1 : 0.9, top = y - 8, bot = y + (m === 'grin' ? 34 : 44) * big;
      const d = m === 'grin' ? `M${x - w * 0.75} ${top} Q${x} ${top + 6} ${x + w * 0.75} ${top} Q${x + w * 0.6} ${bot} ${x} ${bot} Q${x - w * 0.6} ${bot} ${x - w * 0.75} ${top}Z`
        : `M${x - w * 0.6 * big} ${top} Q${x} ${top - 10} ${x + w * 0.6 * big} ${top} Q${x + w * 0.66 * big} ${bot} ${x} ${bot} Q${x - w * 0.66 * big} ${bot} ${x - w * 0.6 * big} ${top}Z`;
      const MP = m === 'grin' ? [...quadPts([x - w * 0.75, top], [x, top + 6], [x + w * 0.75, top]), ...quadPts([x + w * 0.75, top], [x + w * 0.6, bot], [x, bot]), ...quadPts([x, bot], [x - w * 0.6, bot], [x - w * 0.75, top])]
        : [...quadPts([x - w * 0.6 * big, top], [x, top - 10], [x + w * 0.6 * big, top]), ...quadPts([x + w * 0.6 * big, top], [x + w * 0.66 * big, bot], [x, bot]), ...quadPts([x, bot], [x - w * 0.66 * big, bot], [x - w * 0.6 * big, top])];
      return g({}, path(d, dark), cut(MP, rectPoly(x - w, top - 20, w * 2, 28), C.teeth), cut(MP, ellPoly(x + w * 0.12, bot - 4, w * 0.45, 16 * big, 28), C.tongue), rim(d));
    }
    default: return stroke([[x - w * 0.55, y], [x, y + 14], [x + w * 0.55, y]], line, lw); // smile
  }
}
/** a little bow: two loops, a knot and two tails. (x, y) is the knot, s the size, rot degrees */
function bowShape(x, y, s, c, rot = 0) {
  const loop = sd => blob([[0, 0], [sd * s * 0.5, -s * 0.42], [sd * s * 1.05, -s * 0.36], [sd * s * 1.1, s * 0.3], [sd * s * 0.5, s * 0.36]]);
  return g({transform: tr(x, y, rot)}, path(blob([[-s * 0.12, 0], [-s * 0.42, s * 0.85], [-s * 0.16, s * 0.72], [0, s * 0.1]]), c.shade), path(blob([[s * 0.12, 0], [s * 0.42, s * 0.85], [s * 0.16, s * 0.72], [0, s * 0.1]]), c.shade),
    path(loop(-1), c.base), path(loop(1), c.base), path(blob([[s * 0.4, -s * 0.12], [s * 0.85, -s * 0.18], [s * 0.88, s * 0.14], [s * 0.42, s * 0.14]]), c.shade),
    ellipse(0, 0, s * 0.26, s * 0.3, c.shade), ellipse(-s * 0.05, -s * 0.06, s * 0.1, s * 0.1, c.light));
}
const accKind = a => (typeof a === 'string' ? a : a?.type);
function bowOf(C) { const a = C.acc.find(x => accKind(x) === 'bow'); return a ? {c: tone(typeof a === 'object' && a.color ? resolve(a.color, CLOTH) : C.accent.base), s: (typeof a === 'object' && a.size) || 1} : null; }
function accessories(C, W, H, f) {
  const out = [], turn = f.turn || 0, ox = turn * W * 0.14, hs = C.hair.style;
  for (const a of C.acc) {
    const kind = accKind(a), col = typeof a === 'object' && a.color ? resolve(a.color, CLOTH) : null;
    if (kind === 'glasses' || kind === 'sunglasses') { const c = col || '#1F1F24'; for (const s of [-1, 1]) { const cx = s * W * 0.2 + ox; out.push(path(rrect(cx - W * 0.14, -H * 0.1, W * 0.28, W * 0.22, 14), kind === 'sunglasses' ? c : 'rgba(255,255,255,0.18)', {stroke: c, 'stroke-width': 8})); } out.push(stroke([[-W * 0.06 + ox, -H * 0.04], [W * 0.06 + ox, -H * 0.04]], c, 7)); }
    if (kind === 'beard') { const c = col || C.hair.base; out.push(path(blob([[-W * 0.46, -H * 0.02], [-W * 0.4, H * 0.32], [0, H * 0.54], [W * 0.4, H * 0.32], [W * 0.46, -H * 0.02], [W * 0.26, H * 0.18], [0, H * 0.2], [-W * 0.26, H * 0.18]]), c)); }
    if (kind === 'mustache') { const c = col || C.hair.base; out.push(path(blob([[-W * 0.18 + ox, H * 0.2], [0 + ox, H * 0.15], [W * 0.18 + ox, H * 0.2], [W * 0.1 + ox, H * 0.25], [-W * 0.1 + ox, H * 0.25]]), c)); }
    if (kind === 'cap') { const c = tone(col || CLOTH.red); out.push(path(blob([[-W * 0.5, -H * 0.2], [-W * 0.44, -H * 0.48], [0, -H * 0.6], [W * 0.44, -H * 0.48], [W * 0.5, -H * 0.2]]), c.base), path(rrect(-W * 0.5, -H * 0.26, W * 1.26, H * 0.1, 12), c.shade), circle(0, -H * 0.6, 9, c.shade)); }
    if (kind === 'headphones') { const c = tone(col || CLOTH.charcoal); out.push(stroke([[-W * 0.52, -H * 0.02], [-W * 0.46, -H * 0.5], [0, -H * 0.62], [W * 0.46, -H * 0.5], [W * 0.52, -H * 0.02]], c.base, 16), path(rrect(-W * 0.62, -H * 0.12, W * 0.16, H * 0.28, 16), c.base), path(rrect(W * 0.46, -H * 0.12, W * 0.16, H * 0.28, 16), c.shade)); }
    if (kind === 'mask') { // a plain white theatre mask: covers the face, leaves eye holes
      const c = col || '#F1EEE8', mp = [[-W * 0.42, -H * 0.3], [0, -H * 0.42], [W * 0.42, -H * 0.3], [W * 0.44, H * 0.1], [W * 0.26, H * 0.4], [0, H * 0.48], [-W * 0.26, H * 0.4], [-W * 0.44, H * 0.1]];
      out.push(path(blob(mp), c), cut(sampleBlob(mp), rectPoly(W * 0.14, -H, W, H * 2), '#D8D3CB'),
        ...[-1, 1].map(s => ellipse(s * W * 0.18 + ox, -H * 0.02, W * 0.09, W * 0.07, '#1C1A1E')), stroke([[-W * 0.12, H * 0.27], [W * 0.12, H * 0.27]], '#B9B2A8', 6));
    }
    if (kind === 'earrings') { const c = tone(col || '#F2C14E'), hoop = a?.style === 'hoop';
      for (const s of [-1, 1]) { const x = s * W * 0.49 + turn * W * 0.06, y = H * 0.04 + W * 0.1;
        out.push(hoop ? circle(x, y + W * 0.05, W * 0.05, 'none', {stroke: c.base, 'stroke-width': 4.5}) : g({}, circle(x, y + W * 0.02, W * 0.032, c.base), circle(x - W * 0.01, y + W * 0.01, W * 0.011, c.light))); } }
    if (kind === 'bow') {   // placed by hairstyle (pigtails get one on each tie, drawn with the hair-back)
      const c = tone(col || C.accent.base), s = ((typeof a === 'object' && a.size) || 1) * W * 0.13, ps = turn > 0.05 ? -1 : 1;
      if (hs === 'bun') out.push(bowShape(W * 0.02, -H * 0.5, s, c, 0));
      else if (hs === 'ponytail') out.push(bowShape(ps * W * 0.36, -H * 0.42, s, c, ps * 30));
      else if (hs !== 'pigtails') out.push(bowShape(W * 0.3 + ox * 0.3, -H * 0.43, s, c, 24));
    }
  }
  return out.length ? layer('accessory', {}, out) : '';
}
function headLayer(C, f) {
  const W = DIM.headW * C.build.head, H = DIM.headH * C.build.head, turn = f.turn || 0;
  const fpts = [[0, -H * 0.5], [W * 0.42, -H * 0.4], [W * 0.5, -H * 0.04], [W * 0.44, H * 0.3], [W * 0.18, H * 0.49], [-W * 0.18, H * 0.49], [-W * 0.44, H * 0.3], [-W * 0.5, -H * 0.04], [-W * 0.42, -H * 0.4]];
  const shape = blob(fpts), FP = sampleBlob(fpts, true, 0.5, 12);
  const sk = C.skin;
  const parts = [
    layer('ears', {}, [-1, 1].map(sd => g({}, circle(sd * W * 0.49 + turn * W * 0.06, H * 0.04, W * 0.11, sk.base), circle(sd * W * 0.5 + turn * W * 0.06, H * 0.05, W * 0.055, sk.shade)))),
    layer('face', {}, path(shape, sk.base)),
    layer('face-shade', {}, cut(FP, ellPoly(W * 0.62 - turn * W * 0.2, H * 0.1, W * 0.32, H * 0.7, 48), mixHex(sk.base, sk.shade, 0.85)), cut(FP, ellPoly(0, H * 0.62, W * 0.5, H * 0.16, 40), mixHex(sk.base, sk.shade, 0.7))),
    C.face.blush ? layer('cheeks', {}, [-1, 1].map(sd => ellipse(sd * W * 0.28 + turn * W * 0.14, H * 0.16, W * 0.08, W * 0.05, mixHex(sk.base, '#F2627A', 0.3)))) : '',
    eyes(C, W, H, f), brows(C, W, H, f),
    layer('nose', {}, C.face.nose === 'none' ? '' : path(blob([[turn * W * 0.2 - W * 0.05, H * 0.06], [turn * W * 0.2 + W * 0.04, H * 0.04], [turn * W * 0.2 + W * 0.07, H * 0.14], [turn * W * 0.2 - W * 0.05, H * 0.16]]), sk.shade)),
    layer('mouth', {}, mouth(C, W, H, f)),
    layer('hair-front', {}, hairFront(C, W, H)),
    accessories(C, W, H, f),
  ];
  return {svg: g({}, parts), W, H};
}

/**
 * Build one character in a pose. Returns {svg, pelvis, height, anchors, joints}. pose = merged POSES[name] + overrides,
 * plus face fields: face: {eyes, look:[x,y], mouth, brows, turn, blink}. hold: {L?: propName|{type,...}, R?: ...}
 * anchors (headTop, headCenter, mouth, handL/R, footL/R) are in the actor layer's space: scale and facing applied.
 */
export function buildCharacter(C, pose, opts = {}) {
  if (C.style === 'stick') return buildStick(C, pose, opts);
  const {scale = 1, facing = 1, hold = {}, shadow = true, t = 0} = opts;
  const P = pose || {}, body = P.body || {}, face = {...P.face}, B = C.build, hd = P.head || {};
  const fs = 0.6 + 0.4 * Math.min(1, B.height * B.limbs);   // shoe size
  const legLen = (DIM.thigh + DIM.shin) * B.height * B.limbs, pelvis = [body.dx || 0, -legLen - DIM.footH * 0.5 * fs + (body.dy || 0)];
  const lean = body.lean || 0, sy = body.scaleY || 1, bend = body.bend || 0;
  const Up = chain(M.t(pelvis[0], pelvis[1]), M.r(lean), M.s(1, sy)), UpInv = M.inv(Up);
  const reachPt = r => [pelvis[0] + r[0], r[1]];   // reach: origin on the ground under the pelvis, +x = facing, y up negative

  // ----- clothes that decide limb colours
  const tst = C.top.style, bst = C.bottom.style;
  const pants = bst === 'jeans' || bst === 'pants', shorts = bst === 'shorts';
  const sleeveFull = ['hoodie', 'shirt', 'jacket'].includes(tst), sleeveShort = ['tee', 'stripes', 'dress', 'blouse'].includes(tst);
  const armW = DIM.armW * B.limbs * B.thick, legW = DIM.legW * B.limbs * B.thick;

  // ----- legs (character frame; they do not lean)
  const legs = ['L', 'R'].map(k => {
    const side = k === 'L' ? -1 : 1, L = P['leg' + k] || {a: 3, b: 0};
    const hip = [pelvis[0] + side * DIM.hip * B.width * B.hips, pelvis[1]];
    const L1 = DIM.thigh * B.height * B.limbs * (L.la ?? 1), L2 = DIM.shin * B.height * B.limbs * (L.lb ?? 1);
    const j = limbJoints(hip, L1, L2, L, side, 0, L.reach ? reachPt(L.reach) : null, [1, 0.15]);
    // the foot stays flat while planted and follows the shin once the ankle leaves the ground; c adds on top
    const lift = (-DIM.footH * 0.5 * fs) - j.end[1], follow = smooth((lift - 4) / 44);
    const footRot = -side * (follow * 0.8 * j.a2 + j.c), fr = footRot * D2R;
    const dShin = unit(sub(j.end, j.mid)), endIn = sub(j.end, mul(dShin, Math.min(8, len(sub(j.end, j.mid)) * 0.3)));
    const col = pants ? C.bottom : C.skin, parts = [...tube([j.root, j.mid, endIn], legW, col.base, col.shade, side)];
    if (shorts) parts.push(cover(j.root, add(j.root, mul(sub(j.mid, j.root), 0.62)), legW * 1.3, C.bottom, side));
    if (C.shoes.style === 'boot') parts.push(cover(add(j.mid, mul(sub(j.end, j.mid), 0.45)), endIn, legW * 1.14, C.shoes, side, {roundStart: false, hem: false}));
    parts.push(g({transform: `translate(${r2(j.end[0])} ${r2(j.end[1])}) rotate(${r2(footRot)}) scale(${side} 1)`}, shoeShape(C, fs)));
    const foot = [j.end[0] + side * 12 * fs * Math.cos(fr) - 20 * fs * Math.sin(fr), j.end[1] + side * 12 * fs * Math.sin(fr) + 20 * fs * Math.cos(fr)];
    return {svg: layer('leg-' + k, {}, parts), j, side, hip, foot};
  });
  // hip "ball" caps in the trouser colour: a splayed or raised leg turns inside a round hip, no gap at the crotch
  const hw = DIM.hip * B.width * B.hips, hr = (shorts ? legW * 1.3 : legW) * 0.56;
  const hipBalls = (pants || shorts) ? layer('hips', {}, legs.map(l => circle(l.hip[0], l.hip[1], hr, C.bottom.base)), path(rrect(pelvis[0] - hw, pelvis[1] - 24, hw * 2, 24 + hr * 0.5, 8), C.bottom.base)) : '';

  // ----- torso + arms (upper-body frame: translate(pelvis) rotate(lean) scale(1, scaleY))
  const ballCol = tst === 'tank' ? C.skin.base : C.top.base;
  const tor = torsoLayer(C, bend, {r: sleeveShort ? armW * (tst === 'blouse' ? 1.42 : 1.3) * 0.5 : armW * 0.62, col: ballCol, shade: tst === 'tank' ? C.skin.base : C.top.shade});
  const T = tor.T;
  const arms = ['L', 'R'].map(k => {
    const side = k === 'L' ? -1 : 1, A = P['arm' + k] || {a: 8, b: 4}, item = hold[k];
    const sh = tor.shoulder(side), frameRot = tor.angAt(-T + 30);
    const L1 = DIM.upper * B.height * B.limbs * (A.la ?? 1), L2 = DIM.fore * B.height * B.limbs * (A.lb ?? 1);
    const j = limbJoints(sh, L1, L2, A, side, frameRot, A.reach ? M.apply(UpInv, reachPt(A.reach)) : null, [side * 0.7, 1]);
    const handDeg = j.a2 + j.c, pts = [j.root, j.mid, j.end], parts = [];
    if (sleeveFull) {
      parts.push(...tube(pts, armW, C.top.base, C.top.shade, side));
      parts.push(stroke([add(j.mid, mul(sub(j.end, j.mid), 0.86)), j.end], C.top.shade, armW * 1.12, {'stroke-linecap': 'butt'}));   // cuff: a band square to the forearm
    } else {
      parts.push(...tube(pts, armW, C.skin.base, C.skin.shade, side));
      if (sleeveShort) parts.push(cover(j.root, add(j.root, mul(sub(j.mid, j.root), tst === 'blouse' ? 0.42 : 0.55)), armW * (tst === 'blouse' ? 1.42 : 1.3), C.top, side));
    }
    parts.push(g({}, handShape(j.end, handDeg, side, C.skin, DIM.hand * B.limbs), item ? PROPS_HELD(item, j.end, handDeg, side, t, {facing}) : ''));
    return {svg: layer('arm-' + k, {}, parts), z: A.z || 'front', k, j, side, handDeg};
  });

  // ----- neck pivot + head: tilt rotates about the neck base (top of the torso); the neck stretches a little with tilt
  const head = headLayer(C, face), H = head.H, W = head.W;
  const tilt = (hd.tilt || 0) + tor.angAt(-T), lift = -Math.min(0, hd.dy || 0) * 0.5;
  const nl = DIM.neck * (1 + Math.min(Math.abs(hd.tilt || 0), 40) / 40 * 0.16) + lift;
  const neckM = chain(M.t(tor.neckBase[0], tor.neckBase[1]), M.r(tilt));
  const headM = M.mul(neckM, M.t(hd.dx || 0, -(nl + H * 0.44) + (hd.dy || 0) + lift));
  const nw = DIM.neckW, hx = hd.dx || 0, topY = -(nl + 14) + Math.max(0, hd.dy || 0);
  const neck = layer('neck', {transform: mtx(neckM)}, path(`M${-nw / 2} 16 L${r2(hx - nw / 2)} ${r2(topY)} L${r2(hx + nw / 2)} ${r2(topY)} L${nw / 2} 16Z`, C.skin.base),
    path(`M0 16 L${r2(hx)} ${r2(topY)} L${r2(hx + nw / 2)} ${r2(topY)} L${nw / 2} 16Z`, mixHex(C.skin.base, C.skin.shade, 0.8)));
  let back = hairBack(C, W, H, face, lean + tilt);   // hanging hair counter-rotates by the head's screen rotation
  const bw = bowOf(C);
  if (bw && C.hair.style === 'pigtails') back += [-1, 1].map(s => bowShape(s * W * 0.5, -H * 0.17, bw.s * W * 0.11, bw.c, s * 20)).join('');
  const hairBackG = back ? layer('hair-back', {transform: mtx(headM)}, back) : '';
  const headG = layer('head', {transform: mtx(headM)}, head.svg);

  const upper = g({transform: tr(pelvis[0], pelvis[1], lean, 1, sy)},
    hairBackG, arms.filter(a => a.z === 'back').map(a => a.svg), neck, tor.svg, headG, arms.filter(a => a.z !== 'back').map(a => a.svg));
  // legs are drawn in the character frame (not leaning) BEFORE the upper body so the waistband covers the hips
  const legsSvg = layer('legs', {}, legs.map(l => l.svg), hipBalls);
  const sh0 = shadow ? layer('shadow', {}, ellipse(pelvis[0] * 0.5, 4, 150 * B.width + Math.abs(body.dy || 0) * 0.2, 26, '#000000', {opacity: 0.22})) : '';
  const ns = `k${String(C.id).replace(/[^\w-]/g, '')}${(++buildSeq).toString(36)}-`;
  const svg = scopeIds(layer(`character:${C.id}`, {transform: `scale(${facing * scale} ${scale})`}, sh0, legsSvg, upper), ns);

  // ----- anchors (actor-layer space: scale and facing applied)
  const out = p => [r2(p[0] * facing * scale), r2(p[1] * scale)];
  const U = p => M.apply(Up, p), HD = p => M.apply(Up, M.apply(headM, p));
  const hand = a => U(add(a.j.end, mul(dirOf(a.handDeg, a.side), DIM.hand * B.limbs * 0.3)));
  const anchors = {
    headTop: out(HD([0, -H * (0.5 + (HAIR_TOP[C.hair.style] || 0.02))])), headCenter: out(HD([0, 0])), mouth: out(HD([(face.turn || 0) * W * 0.16, H * 0.27])),
    handL: out(hand(arms[0])), handR: out(hand(arms[1])), footL: out(legs[0].foot), footR: out(legs[1].foot),
  };
  const joints = {pelvis: out(pelvis), neck: out(U(tor.neckBase)), shoulderL: out(U(arms[0].j.root)), shoulderR: out(U(arms[1].j.root)), elbowL: out(U(arms[0].j.mid)), elbowR: out(U(arms[1].j.mid)),
    hipL: out(legs[0].j.root), hipR: out(legs[1].j.root), kneeL: out(legs[0].j.mid), kneeR: out(legs[1].j.mid)};
  return {svg, pelvis, height: legLen + T + DIM.neck + H, anchors, joints};
}

// ---------- id scoping: every id inside one built character is unique in the frame ----------
// The set is built once per scene, and sets, props and characters all draw clip ids from the same svg.mjs counter, which
// frameSVG resets every frame. So an eye's "c5" could resolve to a cinema seat's clip shape and hide that pupil. Prefixing
// every id inside a character with a per-build namespace makes the character self-contained.
let buildSeq = 0;
function scopeIds(svg, ns) {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  if (!ids.size) return svg;
  return svg.replace(/(\sid=")([^"]+)"/g, (m, a, v) => (ids.has(v) ? `${a}${ns}${v}"` : m))
    .replace(/url\(#([^)]+)\)/g, (m, v) => (ids.has(v) ? `url(#${ns}${v})` : m))
    .replace(/href="#([^"]+)"/g, (m, v) => (ids.has(v) ? `href="#${ns}${v}"` : m));
}
