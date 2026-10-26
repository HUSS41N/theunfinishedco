// Geometry shared by the flat rig, the face and the wardrobe: vectors, affine matrices, pre-clipped polygons (no clip
// paths: resvg turns each into a full-frame mask), offset lines and the two-tone tube/cover strokes. Pure and browser-safe.
import {g, path, circle, stroke} from './svg.mjs';

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
export const r2 = v => +v.toFixed(2);
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
export const len = a => Math.hypot(a[0], a[1]), dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const unit = a => { const L = len(a) || 1; return [a[0] / L, a[1] / L]; };
export const wrap180 = d => ((d + 180) % 360 + 360) % 360 - 180;
/** direction of a limb at `deg` (0 = down, + = outward on `side`) */
export const dirOf = (deg, side) => [Math.sin(deg * D2R) * side, Math.cos(deg * D2R)];
export const fromAngle = (p, L, deg, side) => add(p, mul(dirOf(deg, side), L));
// 2-D affine matrices [a b c d e f], composed like an SVG transform list
export const M = {
  id: [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
  t: (x, y) => [1, 0, 0, 1, x, y], r: deg => { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [c, s, -s, c, 0, 0]; }, s: (x, y = x) => [x, 0, 0, y, 0, 0],
  apply: (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]],
  inv: m => { const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det; return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])]; },
};
export const chain = (...ms) => ms.reduce((acc, m) => M.mul(acc, m), M.id);
export const mtx = m => `matrix(${m.map(r2).join(' ')})`;

// ---------- pre-clipped geometry ----------
// resvg turns every clipPath into a full-frame mask, which was about half the cost of drawing an actor. So shading is
// computed instead: sample the part's outline into a polygon and intersect it with the (convex) shade region.
export function sampleBlob(pts, closed = true, t = 0.5, n = 10) {   // the same Catmull-Rom curve svg.blob() draws, as points
  const P = closed ? [pts.at(-1), ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts.at(-1)], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3], c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    for (let j = 0; j < n; j++) { const u = j / n, v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]); }
  }
  return out;
}
export const quadPts = (p0, c, p1, n = 8) => Array.from({length: n}, (_, j) => { const u = j / n, v = 1 - u; return [v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]]; });
export const ellPoly = (cx, cy, rx, ry, n = 36) => Array.from({length: n}, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const polyArea = p => p.reduce((acc, q, i) => { const r = p[(i + 1) % p.length]; return acc + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
/** Sutherland–Hodgman: `subject` (any simple polygon) ∩ `clip` (convex polygon, either winding) */
export function clipPoly(subject, clip) {
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
export const polyD = pts => (pts.length < 3 ? '' : 'M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L') + 'Z');
/** the part of `subject` inside convex `clip`, filled (empty string when they do not overlap) */
export const cut = (subject, clip, fill, map) => { let p = clipPoly(subject, clip); if (p.length < 3) return ''; if (map) p = p.map(map); return path(polyD(p), fill); };

/** offset a polyline along its normal [-dy, dx]·k: mitred on the inside of a bend, a round arc on the outside (no kink) */
export function offsetLine(pts, k) {
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
export const tube = (pts, w, base, shadeCol, side, k = 0.24, ws = 0.42) => [stroke(pts, base, w), stroke(offsetLine(pts, w * k * side), shadeCol, w * ws)];
/** a garment segment that starts round at `a` and ends with a cut hem at `b` (short sleeve, shorts leg, boot shaft) */
export function cover(a, b, w, col, side, {roundStart = true, hem = true} = {}) {
  const d = unit(sub(b, a)), n = [-d[1] * w * 0.27 * side, d[0] * w * 0.27 * side], h = sub(b, mul(d, Math.min(7, len(sub(b, a)) * 0.3)));
  return g({}, roundStart ? circle(a[0], a[1], w / 2, col.base) : '', stroke([a, b], col.base, w, {'stroke-linecap': 'butt'}),
    stroke([add(a, n), add(b, n)], col.shade, w * 0.4, {'stroke-linecap': 'butt'}), roundStart ? circle(a[0] + n[0], a[1] + n[1], w * 0.2, col.shade) : '',
    hem ? stroke([h, b], col.shade, w, {'stroke-linecap': 'butt'}) : '');
}
