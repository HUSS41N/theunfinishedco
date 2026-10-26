// Wardrobe for the flat rig: Indian everyday and uniform clothing, long garments that follow the legs, overlays (vest, shawl,
// dupatta, saree pallu), sleeve kinds, a wrist watch, the wet look, and the new hair styles and headwear.
// Called from character.mjs; every shape is flat with a same-hue shade (pre-blended colours, no clip paths).
import {layer, g, path, circle, ellipse, rect, stroke, blob, rrect, tr} from './svg.mjs';
import {mixHex, tone, resolve, CLOTH, DIM} from './style.mjs';
import {clamp, r2, add, sub, mul, len, unit, M, sampleBlob, quadPts, ellPoly, rectPoly, clipPoly, polyD, cut, cover, tube} from './geom.mjs';

/**
 * Top styles added here: sleeve kind, drape (how far down the legs the garment hangs, 0..1 of the leg) and the bottom it
 * implies when the cast entry gives none.
 */
export const TOPS = {
  kurta:    {sleeve: 'full',   drape: 0.44, flare: 1.15, bottom: 'pyjama'},
  kameez:   {sleeve: 'threeq', drape: 0.56, flare: 1.3, bottom: 'salwar'},
  sherwani: {sleeve: 'full',   drape: 0.6,  flare: 1.2, bottom: 'churidar'},
  saree:    {sleeve: 'elbow',  drape: 0.97, flare: 1.05, bottom: 'none'},
  gown:     {sleeve: 'short',  drape: 0.5,  flare: 1.25, bottom: 'none'},
  uniform:  {sleeve: 'full',   bottom: 'pants'},
  army:     {sleeve: 'rolled', bottom: 'pants'},
  school:   {sleeve: 'short',  bottom: 'shorts'},
};
export const BOTTOMS = ['salwar', 'pyjama', 'churidar'];
export const isTunic = st => !!TOPS[st]?.drape;

/** cast-entry wardrobe fields → resolved colours (called by defineCharacter) */
export function defineWardrobe(def, C) {
  const tc = (v, d) => tone(resolve(v || d, CLOTH));
  const W = {};
  if (def.top?.border) W.border = tc(def.top.border);
  if (C.top.style === 'saree') W.blouse = tc(def.top?.blouse || def.top?.detail, mixHex(C.top.base, '#2A1420', 0.35));
  if (def.top?.print) W.print = def.top.print;
  if (def.top?.sleeves) W.sleeves = def.top.sleeves;
  W.pallu = (def.top?.pallu || 'L') === 'R' ? 1 : -1;
  for (const k of ['vest', 'shawl', 'dupatta']) if (def[k]) { const v = typeof def[k] === 'object' ? def[k] : {color: def[k] === true ? undefined : def[k]};
    W[k] = {...tc(v.color, {vest: 'brown', shawl: 'cream', dupatta: 'rose'}[k]), border: v.border ? tc(v.border) : null, style: v.style}; }
  return W;
}
/** the wet look: cloth darker and a little more saturated (applied to a tone) */
export const wetTone = t => tone(mixHex(t.base, '#0E1420', 0.3));

// ---------- torso details (torso frame: neck at y = −T, pelvis at y = 0; `wcut` clips to the torso outline, `at` follows the bend) ----------
export function torsoDetails(C, X) {
  const {T, W, Wb, wcut, at, back} = X, st = C.top.style, top = C.top, sk = C.skin, wd = C.wd, out = [];
  const det = top.detail || top.light, gold = wd.border?.base || CLOTH.gold;
  if (wd.print && !back) out.push(...printParts(C, X));
  if (st === 'saree' && back) { const sar = C.top, bord = wd.border || tone(CLOTH.gold); out.push(wcut(rectPoly(-W, -T * 0.22, W * 2, T * 0.5), sar.base), wcut(rectPoly(W * 0.16, -T * 0.22, W, T * 0.5), sar.shade), wcut(rectPoly(-W, -T * 0.22, W * 2, 9), bord.base)); }
  if (!back) switch (st) {
    case 'kurta':
      out.push(at([0, -T + 2], path(rrect(-26, -10, 52, 16, 7), top.shade), path(rrect(-7, 6, 14, T * 0.3, 4), mixHex(top.base, top.shade, 0.5)), ...[0.1, 0.19, 0.28].map(k => circle(0, T * k + 6, 4.2, det))));
      break;
    case 'sherwani':
      out.push(at([0, -T + 2], path(rrect(-28, -12, 56, 18, 8), gold)), wcut(rectPoly(-3, -T, 6, T + 20), top.deep), wcut(rectPoly(-12, -T, 5, T + 20), gold), wcut(rectPoly(7, -T, 5, T + 20), gold),
        ...[0.12, 0.27, 0.42, 0.57, 0.72, 0.87].map(k => at([0, -T + T * k], circle(0, 0, 5, gold), circle(-1.2, -1.2, 1.8, mixHex(gold, '#FFFFFF', 0.5)))),
        ...[-1, 1].map(s => at([s * W * 0.22, -T * 0.62], path(blob([[0, -16], [12, -4], [0, 16], [-12, -4]]), mixHex(top.base, gold, 0.55)))));
      break;
    case 'uniform': {
      const pk = s => at([s * W * 0.21, -T * 0.64], path(rrect(-22, -16, 44, 46, 6), top.shade), path(rrect(-25, -21, 50, 15, 5), top.deep), circle(0, -9, 3.5, top.light));
      out.push(pk(-1), pk(1), ...[0.12, 0.3, 0.48, 0.66, 0.84].map(k => at([0, -T + T * k], circle(0, 0, 4.5, top.deep))), wcut(rectPoly(-2.5, -T, 5, T), top.shade),
        at([W * 0.21, -T * 0.82], path(rrect(-20, -6, 40, 12, 3), '#E9E5D9'), rect(-14, -2, 20, 3, '#6A665C')),
        wcut(rectPoly(-W, -36, W * 2, 20), '#4A3222'), at([0, -26], path(rrect(-12, -10, 24, 20, 3), '#C9A645'), path(rrect(-6, -5, 12, 10, 2), '#4A3222')),
        at([0, -T + 2], path(`M-30 -2 L0 30 L-8 -2Z`, top.light), path(`M30 -2 L0 30 L8 -2Z`, top.light)));
      break; }
    case 'army': {
      const blots = [[-0.3, 0.2, 0.16, 0.08, 'deep'], [0.18, 0.3, 0.2, 0.07, 'light'], [-0.1, 0.48, 0.14, 0.09, 'brown'], [0.3, 0.6, 0.16, 0.08, 'deep'], [-0.32, 0.7, 0.15, 0.07, 'light'], [0.05, 0.82, 0.2, 0.06, 'deep'], [0.34, 0.1, 0.1, 0.06, 'brown']];
      const camo = {deep: top.deep, light: mixHex(top.base, '#D8D0A0', 0.25), brown: mixHex(top.base, '#5A3E22', 0.45)};
      for (const [x, y, rx, ry, c] of blots) out.push(wcut(ellPoly(x * W, -T + y * T, rx * W, ry * T, 20), camo[c]));
      const pk = s => at([s * W * 0.21, -T * 0.64], path(rrect(-22, -14, 44, 42, 5), top.shade), path(rrect(-24, -19, 48, 14, 4), top.deep));
      out.push(pk(-1), pk(1), at([-W * 0.21, -T * 0.82], path(rrect(-22, -5, 44, 11, 2), mixHex(top.base, '#000000', 0.35))),
        wcut(rectPoly(-W, -38, W * 2, 22), mixHex(top.base, '#1C1A10', 0.55)), at([0, -27], path(rrect(-11, -10, 22, 20, 3), '#8E8A70')),
        at([0, -T + 2], path(`M-30 -2 L0 26 L-8 -2Z`, top.shade), path(`M30 -2 L0 26 L8 -2Z`, top.shade)));
      break; }
    case 'school':
      out.push(at([0, -T + 2], path(`M-30 -2 L-2 26 L-12 -2Z`, top.light), path(`M30 -2 L2 26 L12 -2Z`, top.light)),
        at([0, -T + 6], path(rrect(-8, -2, 16, 14, 4), det), path(`M-7 10 L7 10 L11 ${T * 0.42} L0 ${T * 0.48} L-11 ${T * 0.42}Z`, det),
          ...[0.12, 0.24, 0.36].map(k => path(`M-9 ${T * k} L9 ${T * k - 8} L9.6 ${T * k - 2} L-9.6 ${T * k + 6}Z`, mixHex(det, '#FFFFFF', 0.45)))),
        at([-W * 0.21, -T * 0.66], path(rrect(-20, -16, 40, 40, 5), top.shade), path(blob([[0, -10], [9, -6], [7, 6], [0, 11], [-7, 6], [-9, -6]]), det)));
      break;
    case 'gown':
      out.push(at([0, -T + 2], path(`M-30 0 L0 40 L30 0Z`, sk.shade), stroke([[-10, 30], [-22, 44]], top.deep, 4), stroke([[10, 30], [24, 42]], top.deep, 4)));
      break;
    case 'kameez':
      out.push(at([0, -T + 2], path(`M-30 0 Q0 46 30 0Z`, sk.shade), path(`M-30 0 Q0 46 30 0 L36 -2 Q0 60 -36 -2Z`, det), ...[-22, -11, 0, 11, 22].map((x, i) => circle(x, 22 + Math.cos(x / 14) * 14 - 2, 2.6, i % 2 ? gold : mixHex(det, '#FFFFFF', 0.5)))));
      break;
    case 'saree': {   // blouse torso; the pallu crosses the chest to the shoulder; the saree wraps the waist
      const s = wd.pallu, sar = C.top, bord = wd.border || tone(CLOTH.gold);
      out.push(wcut(rectPoly(-W, -T * 0.22, W * 2, T * 0.5), sar.base), wcut(rectPoly(-W, -T * 0.22, W * 2, 9), bord.base));
      const quad = [[s * W * 0.05, -T - 12], [s * W * 0.62, -T + 26], [-s * Wb * 0.6, -T * 0.02], [-s * Wb * 0.6, -T * 0.48]];
      const band = (a, b, k0, k1) => [[a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0], [a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1]];
      const [e0, e1] = band(quad[0], quad[1], 0, 0.14), [f0, f1] = band(quad[3], quad[2], 0, 0.14), [g0, g1] = band(quad[0], quad[1], 0.86, 1), [h0, h1] = band(quad[3], quad[2], 0.86, 1);
      out.push(wcut(quad, sar.base), wcut([[g0[0] * 0.45 + e1[0] * 0.55, g0[1] * 0.45 + e1[1] * 0.55], g0, h0, [h0[0] * 0.45 + f1[0] * 0.55, h0[1] * 0.45 + f1[1] * 0.55]], sar.shade),
        wcut([e0, e1, f1, f0], bord.base), wcut([g0, g1, h1, h0], bord.base));
      break; }
    default: break;
  }
  if (wd.vest && !back) out.push(...vestParts(C, X));
  if (wd.shawl) out.push(...shawlTorso(C, X));
  if (C.wet && !back) for (const [x, y0, y1, w] of [[-0.3, 0.3, 0.75, 7], [-0.12, 0.45, 0.95, 6], [0.08, 0.2, 0.6, 8], [0.26, 0.38, 0.9, 6], [0.36, 0.15, 0.5, 5]]) {
    const xx = x * W, a = -T + y0 * T, b = -T + y1 * T;   // drip streaks: thin darker runs, a bead at the bottom
    out.push(wcut([[xx - w / 2, a], [xx + w / 2, a], [xx + w * 0.7, b], [xx - w * 0.2, b + 4]], C.top.deep), at([xx + w * 0.2, b + 2], circle(0, 0, w * 0.7, C.top.deep)));
  }
  return out;
}
function printParts(C, X) {
  const {T, W, wcut} = X, p = C.wd.print, det = C.top.detail || C.top.light, out = [];
  const conf = ['#F5C33B', '#FFFFFF', '#FF6FA8', '#6DB6E8', '#7CCFA8'];
  for (let r = 0; r < 7; r++) for (let c = -4; c <= 4; c++) {
    const x = (c + (r % 2) * 0.5) * W * 0.12, y = -T + 18 + r * T * 0.135;
    if (p === 'dots') out.push(wcut(ellPoly(x, y, 5, 5, 12), det));
    else if (p === 'confetti') { const k = (r * 7 + c * 3 + 20) % 5, a = ((r * 37 + c * 61) % 180) * Math.PI / 180, ca = Math.cos(a) * 7, sa = Math.sin(a) * 7;
      out.push(wcut([[x - ca - sa * 0.4, y - sa + ca * 0.4], [x + ca - sa * 0.4, y + sa + ca * 0.4], [x + ca + sa * 0.4, y + sa - ca * 0.4], [x - ca + sa * 0.4, y - sa - ca * 0.4]], conf[k])); }
    else if (p === 'checks' && r % 2 === 0) out.push(wcut(rectPoly(-W, y, W * 2, 6), mixHex(C.top.base, det, 0.6)));
  }
  if (p === 'checks') for (let c = -4; c <= 4; c++) out.push(wcut(rectPoly(c * W * 0.13, -T, 6, T + 20), mixHex(C.top.base, det, 0.6)));
  return out;
}
function vestParts(C, X) {
  const {T, W, OP, wp, at, wcut} = X, v = C.wd.vest, out = [];
  out.push(path(polyD(X.dense(clipPoly(OP, rectPoly(-W, -T - 30, W * 2, T + 26))).map(wp)), v.base), wcut(rectPoly(W * 0.16, -T - 20, W, T + 16), v.shade));
  out.push(at([0, -T + 2], path(rrect(-27, -12, 54, 18, 8), v.shade)), wcut(rectPoly(-2, -T, 4, T - 4), v.deep),
    ...[0.12, 0.3, 0.48, 0.66].map(k => at([0, -T + T * k], circle(0, 0, 4.5, v.light))),
    at([-W * 0.24, -T * 0.72], rect(-16, 0, 32, 4, v.deep)), at([-W * 0.22, -T * 0.25], rect(-18, 0, 36, 4, v.deep)), at([W * 0.22, -T * 0.25], rect(-18, 0, 36, 4, v.deep)));
  if (v.border) out.push(wcut(rectPoly(-W, -12, W * 2, 6), v.border.base));
  return out;
}
function shawlTorso(C, X) {
  const {T, W, wcut, back} = X, s = C.wd.shawl, bd = s.border?.base || s.shade, out = [];
  if (back) { out.push(wcut(rectPoly(-W, -T - 30, W * 2, T * 0.78), s.base), wcut(rectPoly(W * 0.16, -T - 30, W, T * 0.78), s.shade), wcut(rectPoly(-W, -T * 0.25 - 8, W * 2, 8), bd)); return out; }
  for (const sd of [-1, 1]) {
    const inner = [[sd * W * 0.03, -T - 30], [sd * W * 0.17, -T * 0.22]], panel = sd < 0 ? [[-W, -T - 30], inner[0], inner[1], [-W, -T * 0.22]] : [inner[0], [W, -T - 30], [W, -T * 0.22], inner[1]];
    out.push(wcut(panel, sd > 0 ? s.shade : s.base));
    const edge = sd < 0 ? [[inner[0][0] - 9, inner[0][1]], inner[0], inner[1], [inner[1][0] - 9, inner[1][1]]] : [inner[0], [inner[0][0] + 9, inner[0][1]], [inner[1][0] + 9, inner[1][1]], inner[1]];
    out.push(wcut(edge, bd), wcut(sd < 0 ? [[-W, -T * 0.22 - 9], [inner[1][0], -T * 0.22 - 9], inner[1], [-W, -T * 0.22]] : [[inner[1][0], -T * 0.22 - 9], [W, -T * 0.22 - 9], [W, -T * 0.22], inner[1]], bd));
  }
  return out;
}

/** extra parts drawn behind the arms (in the upper-body frame, origin at the pelvis): pallu and dupatta tails */
export function backDrapes(C, T, W, Wb, wp, back) {
  const wd = C.wd, out = [];
  if (C.top.style === 'saree') { const s = wd.pallu, bord = wd.border || tone(CLOTH.gold);
    const y0 = back && wd.shawl ? -T * 0.24 : null;   // under a shawl the pallu shows only below the shawl's hem
    const P = (back ? [[s * W * 0.02, y0 ?? -T + 2], [s * W * 0.56, y0 ?? -T + 20], [s * W * 0.5, T * 0.4], [-s * W * 0.12, T * 0.46]] : [[s * W * 0.3, -T + 6], [s * W * 0.6, -T + 24], [s * W * 0.72, T * 0.5], [s * W * 0.42, T * 0.56]]).map(wp);
    out.push(path(polyD(P), back ? mixHex(C.top.base, C.top.shade, 0.45) : C.top.shade), path(polyD([P[3], P[2], [P[2][0], P[2][1] - 12], [P[3][0], P[3][1] - 12]]), bord.base)); }
  if (wd.dupatta) for (const s of [-1, 1]) { const P = [[s * W * 0.3, -T + 4], [s * W * 0.56, -T + 22], [s * W * 0.64, T * 0.3], [s * W * 0.38, T * 0.36]].map(wp);
    out.push(path(polyD(P), back ? wd.dupatta.base : wd.dupatta.shade)); if (wd.dupatta.border) out.push(path(polyD([P[3], P[2], [P[2][0], P[2][1] - 10], [P[3][0], P[3][1] - 10]]), wd.dupatta.border.base)); }
  return out;
}
/** the dupatta's U across the chest (over the torso, under the front arms) */
export function frontDrapes(C, T, W, wp, back) {
  const d = C.wd.dupatta; if (!d || back) return '';
  const top = [[-W * 0.36, -T + 16], [-W * 0.18, -T * 0.72], [0, -T * 0.66], [W * 0.18, -T * 0.72], [W * 0.36, -T + 16]];
  const bot = [[W * 0.5, -T + 36], [W * 0.26, -T * 0.55], [0, -T * 0.48], [-W * 0.26, -T * 0.55], [-W * 0.5, -T + 36]];
  const P = sampleBlob([...top, ...bot], true, 0.4, 6).map(wp);
  const parts = [path(polyD(P), d.base), path(polyD(sampleBlob([[W * 0.06, -T * 0.62], [W * 0.36, -T + 16], [W * 0.5, -T + 36], [W * 0.26, -T * 0.55], [0, -T * 0.48]], true, 0.4, 6).map(wp)), d.shade)];
  if (d.border) parts.push(stroke(sampleBlob(bot, false, 0.4, 6).map(wp), d.border.base, 7));
  return layer('dupatta', {}, parts);
}

// ---------- the long garment over the legs (character frame) ----------
const hull = pts => {   // monotone chain convex hull
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const p of P) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const along = (j, f) => { const L1 = len(sub(j.mid, j.root)), L2 = len(sub(j.end, j.mid)), d = f * (L1 + L2); return d <= L1 ? add(j.root, mul(sub(j.mid, j.root), d / L1)) : add(j.mid, mul(sub(j.end, j.mid), Math.min(1, (d - L1) / L2))); };
const ring = (c, r, n = 10) => Array.from({length: n}, (_, i) => [c[0] + Math.cos(i / n * 6.283) * r, c[1] + Math.sin(i / n * 6.283) * r]);
export function drapeLayer(C, legs, Up, legW, back) {
  const spec = TOPS[C.top.style]; if (!spec?.drape) return '';
  const B = C.build, Wb = DIM.botW * B.width * B.hips, Wt = DIM.topW * B.width * B.shoulders, top = C.top.style === 'saree' ? C.top : C.top;
  const f = spec.drape, waist = [-1, 1].map(s => M.apply(Up, [s * Wb * 0.5, -26]));
  const pts = [...waist.flatMap(w => ring(w, 6)), ...legs.flatMap(l => [...ring(l.j.root, legW * 0.62), ...ring(along(l.j, f * 0.5), legW * (0.62 + (spec.flare - 1) * 0.5)), ...ring(along(l.j, f), legW * 0.62 * spec.flare)])];
  if (f > 0.5) for (const l of legs) pts.push(...ring(l.j.mid, legW * 0.66 * spec.flare));
  const Hl = hull(pts), cx = M.apply(Up, [0, 0])[0], out = [path(polyD(Hl), top.base), cut(Hl, rectPoly(cx + Wt * 0.16, -4000, 4000, 8000), top.shade)];
  const hem = legs.map(l => along(l.j, f)), hy = Math.max(hem[0][1], hem[1][1]), bd = C.wd.border;
  const st = C.top.style;
  if (st === 'saree') {
    if (bd) out.push(cut(Hl, [[-4000, hem[0][1] - 26], [4000, hem[1][1] - 26], [4000, hy + 400], [-4000, hy + 400]], bd.base));
    if (!back) { const w0 = M.apply(Up, [C.wd.pallu * -10, -10]);   // front pleats fanning to the hem
      for (const k of [-1, 0, 1, 2]) { const b = [cx + k * legW * 0.32 - legW * 0.1, hy - 6]; out.push(stroke([[w0[0] + k * 5, w0[1] + 20], b], top.shade, 4)); } }
  } else if (st === 'sherwani') {
    const gold = bd?.base || CLOTH.gold;
    out.push(cut(Hl, [[-4000, hem[0][1] - 16], [4000, hem[1][1] - 16], [4000, hy + 400], [-4000, hy + 400]], gold));
    if (!back) out.push(cut(Hl, rectPoly(cx - 3, -4000, 6, 8000), top.deep), cut(Hl, rectPoly(cx - 12, -4000, 5, 8000), gold), cut(Hl, rectPoly(cx + 7, -4000, 5, 8000), gold));
  } else if (st === 'kameez' || st === 'kurta') {
    const det = C.top.detail || C.top.light;
    if (st === 'kameez') out.push(cut(Hl, [[-4000, hem[0][1] - 14], [4000, hem[1][1] - 14], [4000, hy + 400], [-4000, hy + 400]], det));
    for (const l of legs) { const h = along(l.j, f), s = l.side, o = [h[0] + s * legW * 0.62 * spec.flare * 0.9, h[1] - 4];   // side slits
      out.push(stroke([o, [o[0] - s * 4, o[1] - legW * 1.1]], C.top.deep, 4)); }
  } else if (st === 'gown') { const det = C.top.detail || C.top.light; if (!back) for (let i = 0; i < 12; i++) { const p = [cx + ((i % 4) - 1.5 + (Math.floor(i / 4) % 2) * 0.5) * legW * 0.6, waist[0][1] + 34 + Math.floor(i / 4) * 44]; out.push(cut(Hl, ellPoly(p[0], p[1], 5, 5, 10), det)); } }
  return layer('drape', {}, out);
}

/** trouser legs for salwar / pyjama / churidar (null = use the default trouser leg) */
export function legGarment(C, j, endIn, legW, side) {
  const b = C.bottom, st = b.style;
  if (st === 'salwar') {
    const kn = add(j.root, mul(sub(j.mid, j.root), 0.9)), lo = add(j.mid, mul(sub(endIn, j.mid), 0.82));
    return [stroke([j.root, kn], b.base, legW * 1.5), stroke([kn, lo], b.base, legW * 1.28), stroke([j.root, kn].map(p => add(p, [side * legW * 0.42, 0])), b.shade, legW * 0.5),
      stroke([kn, lo].map(p => add(p, [side * legW * 0.35, 0])), b.shade, legW * 0.42), stroke([lo, endIn], b.deep, legW * 1.02, {'stroke-linecap': 'butt'}),
      stroke([add(kn, [-side * legW * 0.2, -legW * 0.4]), add(kn, [side * legW * 0.25, legW * 0.3])], b.shade, 3)];
  }
  if (st === 'pyjama') return [...tube([j.root, j.mid, endIn], legW * 1.2, b.base, b.shade, side)];
  if (st === 'churidar') {
    const parts = [...tube([j.root, j.mid, endIn], legW * 0.96, b.base, b.shade, side)], d = unit(sub(endIn, j.mid)), n = [-d[1], d[0]];
    for (let i = 1; i <= 4; i++) { const c = sub(endIn, mul(d, i * 9)); parts.push(stroke([add(c, mul(n, legW * 0.46)), add(add(c, mul(n, -legW * 0.46)), mul(d, 4))], b.shade, 3)); }
    return parts;
  }
  return null;
}

// ---------- arms ----------
/** sleeve kind for a top: full | threeq | elbow | short | rolled | none (a cast `top.sleeves` overrides) */
export function sleeveKind(C) {
  const st = C.top.style, o = C.wd.sleeves;
  if (o) return o;
  if (TOPS[st]) return TOPS[st].sleeve;
  if (['hoodie', 'shirt', 'jacket'].includes(st)) return 'full';
  if (['tee', 'stripes', 'dress', 'blouse'].includes(st)) return 'short';
  return 'none';
}
/** sleeve parts drawn over the skin tube for the kinds the old rig did not have */
export function sleeveParts(C, j, side, armW, kind) {
  const cl = C.top.style === 'saree' ? C.wd.blouse : C.top, out = [];
  if (kind === 'threeq') { const e = add(j.mid, mul(sub(j.end, j.mid), 0.62));
    out.push(...tube([j.root, j.mid, e], armW * 1.06, cl.base, cl.shade, side), stroke([add(j.mid, mul(sub(e, j.mid), 0.8)), e], C.top.detail || cl.shade, armW * 1.12, {'stroke-linecap': 'butt'})); }
  if (kind === 'elbow') out.push(cover(j.root, add(j.root, mul(sub(j.mid, j.root), 0.92)), armW * 1.24, cl, side));
  if (kind === 'rolled') { const e = add(j.root, mul(sub(j.mid, j.root), 0.86));
    out.push(...tube([j.root, e], armW * 1.08, cl.base, cl.shade, side), stroke([add(j.root, mul(sub(j.mid, j.root), 0.74)), add(j.root, mul(sub(j.mid, j.root), 0.95))], cl.deep, armW * 1.26)); }
  return out;
}
/** parts over a sleeve: shawl / pallu on the upper arm, cuff trims, a wrist watch */
export function armOver(C, j, side, armW, kind, handDeg) {
  const wd = C.wd, out = [], k = side < 0 ? 'L' : 'R';
  if (wd.shawl) { const e = add(j.root, mul(sub(j.mid, j.root), 0.68)); out.push(cover(j.root, e, armW * 1.8, wd.shawl, side));
    if (wd.shawl.border) out.push(stroke([sub(e, mul(unit(sub(e, j.root)), 5)), e], wd.shawl.border.base, armW * 1.8, {'stroke-linecap': 'butt'})); }
  if (C.top.style === 'saree' && wd.pallu === side && !wd.shawl) { const e = add(j.root, mul(sub(j.mid, j.root), 0.42)), bd = wd.border || tone(CLOTH.gold);
    out.push(cover(j.root, e, armW * 1.55, C.top, side), stroke([sub(e, mul(unit(sub(e, j.root)), 5)), e], bd.base, armW * 1.55, {'stroke-linecap': 'butt'})); }
  if (C.top.style === 'sherwani') out.push(stroke([add(j.mid, mul(sub(j.end, j.mid), 0.8)), add(j.mid, mul(sub(j.end, j.mid), 0.9))], wd.border?.base || CLOTH.gold, armW * 1.14, {'stroke-linecap': 'butt'}));
  const watch = C.acc.find(a => (a?.type || a) === 'watch' && ((a.side || 'L') === k));
  if (watch && kind !== 'full') {
    const d = unit(sub(j.end, j.mid)), p = sub(j.end, mul(d, armW * 0.7)), col = tone(resolve(watch.color || '#5A3A26', CLOTH)), face = watch.face || '#D9DEE3';
    out.push(stroke([sub(p, mul(d, 7)), add(p, mul(d, 7))], col.base, armW * 1.1, {'stroke-linecap': 'butt'}), circle(p[0], p[1], armW * 0.36, '#9AA0A6'), circle(p[0], p[1], armW * 0.27, face),
      stroke([p, add(p, [0, -armW * 0.16])], '#2A2A2E', 2.2), stroke([p, add(p, [armW * 0.12, 0])], '#2A2A2E', 2.2));
  }
  return out;
}

// ---------- hair ----------
/** front hair for the new styles (null = not one of ours). wet flattens short styles into clumped strands. */
export function hairFrontX(C, W, H) {
  const h = C.hair, st = h.style;
  if (C.wet && ['short', 'messy', 'quiff', 'spiky', 'buzz'].includes(st)) {
    const cap = [[-W * 0.5, -H * 0.02], [-W * 0.47, -H * 0.36], [-W * 0.2, -H * 0.5], [W * 0.2, -H * 0.5], [W * 0.47, -H * 0.36], [W * 0.5, -H * 0.02], [W * 0.42, -H * 0.2], [W * 0.3, -H * 0.27], [W * 0.18, -H * 0.2], [W * 0.1, -H * 0.3], [-W * 0.02, -H * 0.21], [-W * 0.1, -H * 0.31], [-W * 0.22, -H * 0.22], [-W * 0.3, -H * 0.29], [-W * 0.44, -H * 0.18]];
    return g({}, path(polyD(sampleBlob(cap, true, 0.35, 6)), h.base), path(blob([[-W * 0.3, -H * 0.44], [W * 0.06, -H * 0.49], [W * 0.0, -H * 0.43], [-W * 0.28, -H * 0.39]]), mixHex(h.base, h.light, 0.55)),
      stroke([[W * 0.14, -H * 0.44], [W * 0.3, -H * 0.38]], mixHex(h.base, h.light, 0.55), 4));
  }
  if (st === 'messy') {
    const cap = [[-W * 0.5, -H * 0.06], [-W * 0.56, -H * 0.3], [-W * 0.46, -H * 0.42], [-W * 0.5, -H * 0.56], [-W * 0.3, -H * 0.56], [-W * 0.2, -H * 0.66], [-W * 0.02, -H * 0.58], [W * 0.14, -H * 0.68], [W * 0.26, -H * 0.56], [W * 0.46, -H * 0.6], [W * 0.44, -H * 0.42], [W * 0.56, -H * 0.3], [W * 0.5, -H * 0.06], [W * 0.38, -H * 0.26], [W * 0.2, -H * 0.24], [W * 0.1, -H * 0.31], [-W * 0.04, -H * 0.22], [-W * 0.16, -H * 0.3], [-W * 0.36, -H * 0.26]];
    return g({}, path(polyD(sampleBlob(cap, true, 0.3, 6)), h.base), path(blob([[-W * 0.28, -H * 0.5], [W * 0.0, -H * 0.56], [W * 0.04, -H * 0.48], [-W * 0.24, -H * 0.44]]), h.light),
      path(blob([[W * 0.06, -H * 0.3], [W * 0.16, -H * 0.27], [W * 0.15, -H * 0.17], [W * 0.1, -H * 0.24]]), h.base));
  }
  if (st === 'parted') {   // centre parting, combed down the sides over the tops of the ears
    const sideH = s => [[0, -H * 0.53], [s * W * 0.26, -H * 0.5], [s * W * 0.48, -H * 0.36], [s * W * 0.56, -H * 0.06], [s * W * 0.52, H * 0.12], [s * W * 0.42, -H * 0.02], [s * W * 0.34, -H * 0.24], [s * W * 0.14, -H * 0.36], [0, -H * 0.4]];
    return g({}, path(blob(sideH(-1)), h.base), path(blob(sideH(1)), h.base), stroke([[0, -H * 0.52], [0, -H * 0.4]], mixHex(C.skin.base, h.shade, 0.3), 4),
      path(blob([[-W * 0.08, -H * 0.5], [-W * 0.34, -H * 0.42], [-W * 0.38, -H * 0.36], [-W * 0.12, -H * 0.44]]), h.light), path(blob([[W * 0.08, -H * 0.5], [W * 0.3, -H * 0.43], [W * 0.32, -H * 0.38], [W * 0.1, -H * 0.45]]), h.light),
      path(polyD(clipPoly(sampleBlob(sideH(1), true, 0.5, 8), rectPoly(W * 0.3, -H, W, H * 2))), h.shade));
  }
  return null;
}
export function hairBackX(C, W, H, f, grav) {
  const h = C.hair;
  if (h.style === 'parted') { const s = (f.turn || 0) > 0.05 ? -1 : 1;   // a low bun at the nape, peeking out on the side away from the turn
    return g({}, path(blob([[-W * 0.5, -H * 0.1], [0, -H * 0.55], [W * 0.5, -H * 0.1], [W * 0.5, H * 0.2], [-W * 0.5, H * 0.2]]), h.shade), circle(s * W * 0.44, H * 0.2, W * 0.15, h.base), path(blob([[s * W * 0.36, H * 0.12], [s * W * 0.5, H * 0.1], [s * W * 0.52, H * 0.18], [s * W * 0.4, H * 0.18]]), h.light)); }
  if (h.style === 'messy') return '';
  return null;
}
/** the back-of-head bun, drawn over the hair when the head is seen from behind */
export function bunBack(C, W, H, back) { if (back < 0.6 || !['parted', 'bun'].includes(C.hair.style)) return ''; const h = C.hair, y = C.hair.style === 'bun' ? -H * 0.4 : H * 0.12;
  const B = ellPoly(0, y, W * 0.17, W * 0.15, 28); return g({}, path(polyD(B), h.base), cut(B, rectPoly(W * 0.04, y - W, W, W * 2), h.shade), stroke(quadPts([-W * 0.12, y - W * 0.02], [0, y - W * 0.12], [W * 0.1, y - W * 0.06], 8), mixHex(h.base, h.light, 0.6), 4), stroke(quadPts([-W * 0.1, y + W * 0.06], [0, y], [W * 0.12, y + W * 0.02], 8), h.shade, 3)); }

// ---------- headwear and face accessories ----------
/** returns markup for the new accessory kinds (or null): peaked cap, turban (+ sehra), party hat, round glasses, thick moustache */
export function accessoryX(C, a, W, H, f, featX, eyeGeo) {
  const kind = a?.type || a, col = typeof a === 'object' && a.color ? resolve(a.color, CLOTH) : null, ts = f._ts;
  const ox = featX(0, 1);
  if (kind === 'cap' && a.style === 'peaked') {
    const c = tone(col || CLOTH.khaki), v = a.visor || '#1E1E22';
    return g({}, path(blob([[-W * 0.47, -H * 0.3], [-W * 0.58, -H * 0.58], [-W * 0.3, -H * 0.7], [W * 0.3, -H * 0.7], [W * 0.58, -H * 0.58], [W * 0.47, -H * 0.3]]), c.base),
      path(polyD(clipPoly(sampleBlob([[-W * 0.47, -H * 0.3], [-W * 0.58, -H * 0.58], [-W * 0.3, -H * 0.7], [W * 0.3, -H * 0.7], [W * 0.58, -H * 0.58], [W * 0.47, -H * 0.3]]), rectPoly(W * 0.18, -H, W, H))), c.shade),
      path(rrect(-W * 0.48, -H * 0.4, W * 0.96, H * 0.11, 6), c.deep), (ts?.back || 0) > 0.8 ? '' : g({transform: `translate(${r2(W * 0.46 * (ts?.sign || 1))} 0) scale(${r2(clamp((0.8 - (ts?.back || 0)) / 0.4, 0.02, 1))} 1) translate(${r2(-W * 0.46 * (ts?.sign || 1))} 0)`}, path(blob([[-W * 0.46 + ox * 0.5, -H * 0.3], [ox, -H * 0.27], [W * 0.46 + ox * 0.5, -H * 0.3], [W * 0.36 + ox, -H * 0.2], [ox, -H * 0.16], [-W * 0.36 + ox, -H * 0.2]]), v),
      path(blob([[-W * 0.2 + ox, -H * 0.22], [W * 0.1 + ox, -H * 0.24], [W * 0.0 + ox, -H * 0.2], [-W * 0.18 + ox, -H * 0.19]]), mixHex(v, '#FFFFFF', 0.25)),
      circle(ox * 0.6, -H * 0.5, W * 0.05, '#D8B24A'), circle(ox * 0.6 - 2, -H * 0.5 - 2, W * 0.018, '#F6E2A0')));
  }
  if (kind === 'turban') {
    const c = tone(col || CLOTH.rust), gold = tone(resolve(a.trim || 'gold', CLOTH));
    const dome = [[-W * 0.52, -H * 0.18], [-W * 0.58, -H * 0.5], [-W * 0.3, -H * 0.74], [W * 0.1, -H * 0.78], [W * 0.5, -H * 0.62], [W * 0.56, -H * 0.3], [W * 0.5, -H * 0.16], [0, -H * 0.24]];
    const DP = sampleBlob(dome), out = [path(polyD(DP), c.base)];
    for (let i = 0; i < 4; i++) { const y = -H * (0.26 + i * 0.13); out.push(cut(DP, [[-W, y - 10], [W, y - 34], [W, y - 22], [-W, y + 2]], i % 2 ? c.shade : c.deep)); }
    out.push(cut(DP, rectPoly(W * 0.22, -H, W, H), c.shade), path(blob([[W * 0.42, -H * 0.56], [W * 0.66, -H * 0.66], [W * 0.78, -H * 0.5], [W * 0.62, -H * 0.42]]), c.base));   // the fan (turra)
    out.push(path(blob([[ox - W * 0.06, -H * 0.36], [ox, -H * 0.46], [ox + W * 0.06, -H * 0.36], [ox, -H * 0.3]]), gold.base), circle(ox, -H * 0.38, W * 0.03, '#C8384A'),
      path(blob([[ox, -H * 0.44], [ox + W * 0.1, -H * 0.66], [ox + W * 0.2, -H * 0.9], [ox + W * 0.08, -H * 0.7], [ox + W * 0.02, -H * 0.5]]), '#F4EFE2'));   // kalgi: jewel + plume
    if (a.sehra) {   // strands of jasmine hanging over the face from the turban's edge
      const fl = '#F7F2E4', fs = '#DAD2BC', n = 11;
      for (let i = 0; i < n; i++) { const x = -W * 0.46 + i * W * 0.092, len2 = H * (0.62 + 0.1 * Math.cos(i * 0.7)), y0 = -H * 0.2 + Math.abs(x) * 0.12;
        out.push(stroke([[x, y0], [x, y0 + len2]], mixHex(gold.base, '#8A6A2A', 0.3), 2.5));
        for (let y = y0 + 8; y < y0 + len2; y += 15) out.push(circle(x, y, 6, fl), circle(x + 1.5, y + 2, 3, fs)); }
    }
    return g({}, out);
  }
  if (kind === 'partyHat') {
    const c = tone(col || CLOTH.hotpink), st = tone(resolve(a.stripe || 'yellow', CLOTH)), s = a.size || 1, tilt = a.tilt ?? 14;
    const C3 = [[-W * 0.2 * s, 0], [W * 0.2 * s, 0], [0, -H * 0.62 * s]], out = [path(polyD(C3), c.base), cut(C3, rectPoly(W * 0.04 * s, -H, W, H * 2), c.shade)];
    for (let i = 0; i < 3; i++) { const y = -H * (0.1 + i * 0.17) * s; out.push(cut(C3, [[-W, y + 6], [W, y - 6], [W, y - 18], [-W, y - 6]], st.base)); }
    out.push(circle(0, -H * 0.62 * s, W * 0.07 * s, st.base), circle(-W * 0.02 * s, -H * 0.64 * s, W * 0.025 * s, st.light));
    return g({transform: tr(W * 0.12, -H * 0.42, tilt)}, out);
  }
  if ((kind === 'glasses' || kind === 'sunglasses') && (a.style === 'round' || eyeGeo)) {
    const c = col || (a.style === 'round' ? '#6E5A3A' : '#1F1F24'), wf = a.style === 'round' ? W * 0.026 : W * 0.04, out = [];
    const G = eyeGeo || [];
    for (const e of G) { const r = a.style === 'round' ? Math.max(e.rx, e.ry) * 1.32 : 0;
      if (r) out.push(ellipse(e.cx, e.cy + e.ry * 0.05, e.rx * 1.35 + W * 0.02, e.ry * 1.25, kind === 'sunglasses' ? c : 'rgba(255,255,255,0.14)', {stroke: c, 'stroke-width': wf}));
      else out.push(path(rrect(e.cx - e.rx * 1.36, e.cy - e.ry * 1.05, e.rx * 2.72, e.ry * 1.95, 14), kind === 'sunglasses' ? c : 'rgba(255,255,255,0.14)', {stroke: c, 'stroke-width': wf})); }
    if (G.length === 2) { const [a1, b1] = G[0].cx < G[1].cx ? G : [G[1], G[0]], k = a.style === 'round' ? 1.35 : 1.36, y = a1.cy - a1.ry * 0.25;
      out.push(stroke([[a1.cx + a1.rx * k + W * 0.01, y], [(a1.cx + b1.cx) / 2, y - 4], [b1.cx - b1.rx * k - W * 0.01, y]], c, wf * 0.85));
      for (const e of [a1, b1]) { const s = e === a1 ? -1 : 1, far = s * (ts?.tf || 0) > 0.4; if (!far && !(ts?.back > 0.15)) out.push(stroke([[e.cx + s * (e.rx * k + W * 0.02), y], [s * W * 0.49 + (ts?.tf || 0) * W * 0.06, y + 2]], c, wf * 0.7)); } }
    return g({}, out);
  }
  if (kind === 'mustache' && (a.style === 'thick' || a.style === 'walrus')) {
    if (ts?.back > 0.6) return '';
    const c = tone(col || C.hair.base), x = featX(0, 1.1), y = H * 0.215;
    const P = [[x - W * 0.25, y + H * 0.07], [x - W * 0.2, y - H * 0.02], [x - W * 0.05, y - H * 0.04], [x, y - H * 0.02], [x + W * 0.05, y - H * 0.04], [x + W * 0.2, y - H * 0.02], [x + W * 0.25, y + H * 0.07], [x + W * 0.14, y + H * 0.05], [x, y + H * 0.04], [x - W * 0.14, y + H * 0.05]];
    const MP = sampleBlob(P, true, 0.5, 6);
    return g({}, path(polyD(MP), c.base), cut(MP, rectPoly(x + W * 0.04, y - H, W, H * 2), c.shade), stroke([[x - W * 0.12, y - H * 0.012], [x - W * 0.03, y - H * 0.025]], c.light, 3), stroke([[x + W * 0.04, y - H * 0.025], [x + W * 0.12, y - H * 0.012]], c.light, 3));
  }
  if (kind === 'watch' || kind === 'stubble') return '';   // drawn by the arm / the face
  return null;
}
