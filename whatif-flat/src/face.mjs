// The "film" face: an opt-in face for close-ups (cast `face: {style: "film"}`), plus drama extras that work on any face:
// tears, glisten, a cut mark, a bindi, stubble, age wrinkles, a wet sheen, a lip/chin quiver and a head that turns all the way
// round (|turn| 1..2 slides the features off and the back of the head on).
// Everything is flat shapes in pre-blended colours; shading is polygon ∩ convex region (no clip paths, see geom.mjs).
// Coordinates: the head frame, centre (0,0), y down; W/H = head width/height (204/220 at head scale 1).
import {layer, g, path, circle, ellipse, stroke} from './svg.mjs';
import {mixHex} from './style.mjs';
import {clamp, r2, sampleBlob, ellPoly, rectPoly, clipPoly, polyD, cut, quadPts} from './geom.mjs';
import {noise} from './motion.mjs';

const lerp = (a, b, u) => a + (b - a) * u;
/** the face outline points (shared with character.mjs headLayer) */
export const facePts = (W, H) => [[0, -H * 0.5], [W * 0.42, -H * 0.4], [W * 0.5, -H * 0.04], [W * 0.44, H * 0.3], [W * 0.18, H * 0.49], [-W * 0.18, H * 0.49], [-W * 0.44, H * 0.3], [-W * 0.5, -H * 0.04], [-W * 0.42, -H * 0.4]];

/** how the features sit for a turn in -2..2: tf (−1..1, the 3/4 amount), back (0..1, how far round past profile), sign */
export function turnState(turn = 0) {
  const t = clamp(turn, -2, 2), tf = clamp(t, -1, 1), back = clamp(Math.abs(t) - 1, 0, 1);
  return {t, tf, back, sign: Math.sign(t) || 1};
}
/** x of a feature that sits at x0 on a front face (film geometry: a stronger 3/4 than the cartoon face) */
export const featX = (x0, W, ts, k = 1) => {
  const x = x0 * (1 - Math.abs(ts.tf) * 0.22) + ts.tf * W * 0.17 * k + ts.sign * ts.back * W * 0.45 * k;
  if (ts.back <= 0) return x;
  const lim = W * (0.4 - 0.08 * ts.back);   // past profile the features bunch at the near edge but never leave the face
  return ts.sign > 0 ? Math.min(x, lim) : Math.max(x, -lim);
};

// ---------- eyes ----------
// Upper lid line: heights at the inner and outer corner in units of ry (negative = above the centre). Lower lid: one height.
const LIDS = {
  open: [-0.86, -0.8], wide: [-1.3, -1.3], shock: [-1.4, -1.4], fear: [-1.4, -1.3], glassy: [-0.8, -0.72], half: [-0.22, -0.18],
  tired: [-0.05, 0], bored: [-0.05, 0], sad: [-0.84, -0.22], grief: [-0.88, -0.3], cry: [-0.38, 0.02], down: [0.12, 0.16],
  angry: [-0.15, -0.85], soft: [-0.5, -0.42], squint: [-0.3, -0.3],
};
const LOWER = {cry: 0.42, soft: 0.66, squint: 0.4, happy: 0.3, angry: 0.75};
const EYE_SIZE = {wide: [1.1, 1.14], shock: [1.12, 1.2], fear: [1.08, 1.14]};
const IRIS = {shock: 0.4, fear: 0.44, wide: 0.5, glassy: 0.66};

function filmEyes(C, W, H, f, ts) {
  const mode = f.eyes || 'open', lashes = !!C.face.lashes, out = [];
  let [lx, ly] = f.look || [0, 0]; const lm = Math.hypot(lx, ly); if (lm > 1) { lx /= lm; ly /= lm; }
  if (mode === 'down') ly = Math.max(ly, 0.85);
  const [sx, sy] = EYE_SIZE[mode] || [1, 1], rx0 = W * 0.1 * sx, ry = W * 0.108 * sy, cy = -H * 0.02 + (f.eyeDy || 0);
  const blink = f.blink >= 1 ? 1 : clamp(f.blink || 0);
  const ink = C.lashColor, irisC = C.iris, glisten = clamp(Math.max(f.glisten || 0, mode === 'glassy' || mode === 'grief' ? 0.85 : 0, (f.tears || 0) * 1.4));
  const geo = [];
  for (const side of [-1, 1]) {
    const far = side * ts.tf > 0, rx = rx0 * (far ? 1 - Math.abs(ts.tf) * 0.3 : 1 + Math.abs(ts.tf) * 0.05) * (1 - (far ? 0.6 : 0.2) * ts.back);
    const cx = featX(side * W * 0.2, W, ts), inner = cx - side * rx, outer = cx + side * rx;
    if (far && ts.back > 0.3) continue;   // past profile the far eye is behind the head
    geo.push({cx, cy, rx, ry, side});
    if (mode === 'closed' || mode === 'squeeze' || blink >= 1) {   // a closed lid: a soft downward arc (squeeze: tighter, with creases)
      const sq = mode === 'squeeze', y0 = cy + ry * (sq ? 0.1 : 0.15);
      out.push(stroke(quadPts([inner, y0 - ry * (sq ? 0.15 : 0)], [cx, y0 + ry * (sq ? 0.25 : 0.42)], [outer, y0 + (sq ? ry * 0.12 : 0)], 10).concat([[outer, y0 + (sq ? ry * 0.12 : 0)]]), ink, W * 0.026));
      if (sq) out.push(stroke(quadPts([inner + side * rx * 0.2, cy + ry * 0.75], [cx, cy + ry * 0.95], [outer - side * rx * 0.1, cy + ry * 0.7], 8).concat([[outer - side * rx * 0.1, cy + ry * 0.7]]), mixHex(C.skin.base, C.skin.shade, 0.8), W * 0.016),
        stroke([[outer + side * rx * 0.05, cy - ry * 0.2], [outer + side * rx * 0.35, cy - ry * 0.35]], mixHex(C.skin.base, C.skin.shade, 0.8), W * 0.014));
      if (lashes) out.push(stroke([[outer, y0], [outer + side * rx * 0.3, y0 - ry * 0.2]], ink, W * 0.02));
      continue;
    }
    if (mode === 'happy') { out.push(stroke(quadPts([inner, cy + ry * 0.25], [cx, cy - ry * 0.7], [outer, cy + ry * 0.25], 10).concat([[outer, cy + ry * 0.25]]), ink, W * 0.03)); continue; }
    // the eye white: an almond (convex), a touch higher at the outer corner
    const E = [];
    for (let i = 0; i <= 16; i++) { const s = i / 16, x = lerp(inner, outer, s), base = lerp(cy + ry * 0.06, cy - ry * 0.04, s); E.push([x, base - ry * Math.sin(Math.PI * s) ** 0.85]); }
    for (let i = 15; i >= 1; i--) { const s = i / 16, x = lerp(inner, outer, s), base = lerp(cy + ry * 0.06, cy - ry * 0.04, s); E.push([x, base + ry * 0.92 * Math.sin(Math.PI * s) ** 1.1]); }
    out.push(path(polyD(E), C.eyeWhite));
    // lids (blink lowers the upper lid to closed)
    let [hi, ho] = LIDS[mode] || LIDS.open; hi = lerp(hi, 1.05, blink); ho = lerp(ho, 1.05, blink);
    const lo = LOWER[mode] ?? 1.3, lidAt = s => cy + ry * lerp(hi, ho, s);   // s = 0 inner … 1 outer
    const xs = s => lerp(inner, outer, s);
    // iris + pupil (look moves them; a lidded eye never hides the whole iris)
    const ri = rx0 * (IRIS[mode] ?? 0.6) * (far ? 1 - Math.abs(ts.tf) * 0.15 : 1), pr = ri * (mode === 'shock' || mode === 'fear' ? 0.42 : 0.52);
    const px = cx + lx * Math.max(0, rx - ri * 0.9) * 0.9 + ts.tf * rx * 0.12, py = clamp(cy + ly * ry * 0.5, Math.min(cy + ry * 0.45, Math.max(lidAt(0.5) + ri * 0.55, cy - ry)), cy + ry * 0.5);
    const I = ellPoly(px, py, ri, ri, 36);
    out.push(cut(I, E, irisC.base), cut(ellPoly(px, py, ri * 0.82, ri * 0.82, 32), E, irisC.mid), cut(ellPoly(px, py, pr, pr, 28), E, C.pupil),
      cut(ellPoly(px + ri * 0.36, py - ri * 0.38, ri * 0.27, ri * 0.27, 18), E, '#FFFFFF'), cut(ellPoly(px - ri * 0.38, py + ri * 0.36, ri * 0.11, ri * 0.11, 12), E, mixHex(irisC.mid, '#FFFFFF', 0.75)));
    if (glisten > 0.02) {   // wet eyes: a water line along the lower lid and a second, bigger catch-light
      const wl = [], k = glisten;
      for (let i = 2; i <= 14; i++) { const s = i / 16; wl.push([xs(s), lerp(cy + ry * 0.06, cy - ry * 0.04, s) + ry * 0.92 * Math.sin(Math.PI * s) ** 1.1 - ry * (0.1 + 0.08 * k)]); }
      out.push(stroke(wl, mixHex('#DCEFF8', C.eyeWhite, 0.3), W * 0.012 + W * 0.012 * k, {'stroke-opacity': 0.85}));
      out.push(cut(ellPoly(px - ri * 0.2, py - ri * 0.55, ri * 0.42 * k, ri * 0.16 * k, 18), E, '#FFFFFF'));
    }
    // upper lid (skin) + its edge line, lower lid
    const lidPoly = [[inner - side * 4, lidAt(0)], [outer + side * 4, lidAt(1)], [outer + side * 4, cy - ry * 2], [inner - side * 4, cy - ry * 2]];
    // lids are cut from the eye shape grown by 1.5 px, in the skin colour: no hairline of eye-white can show round them
    const Eg = E.map(([x, y]) => [cx + (x - cx) * (1 + 1.5 / rx), cy + (y - cy) * (1 + 1.5 / ry)]);
    out.push(cut(Eg, lidPoly, C.skin.base));
    if (lo < 1.2) out.push(cut(Eg, [[inner - side * 4, cy + ry * lo], [outer + side * 4, cy + ry * lo], [outer + side * 4, cy + ry * 2], [inner - side * 4, cy + ry * 2]], C.skin.base));
    // the lash line: the top of the visible eye, thicker toward the outer corner
    const top = [];
    for (let i = 0; i <= 16; i++) { const s = i / 16, eyeTop = lerp(cy + ry * 0.06, cy - ry * 0.04, s) - ry * Math.sin(Math.PI * s) ** 0.85; top.push([xs(s), Math.max(eyeTop, lidAt(s))]); }
    const lw = W * (lashes ? 0.024 : 0.019);
    out.push(stroke(top.slice(0, 10), ink, lw * 0.75), stroke(top.slice(8), ink, lw));
    if (lashes) out.push(stroke([top[15], [outer + side * rx * 0.24, top[16][1] - ry * 0.24]], ink, lw * 0.6));
    // the lid crease above the eye (follows the lid: an opened eye shows it higher)
    const creaseY = s => Math.min(lidAt(s), cy - ry * 0.95) - ry * 0.32;
    if (mode !== 'shock' && mode !== 'fear' && mode !== 'wide') out.push(stroke([0.42, 0.66, 0.9].map(s => [xs(s), creaseY(s) - Math.sin(Math.PI * s) * ry * 0.1]), mixHex(C.skin.base, C.skin.shade, 0.4), W * 0.01));
    // lower lid hint
    out.push(stroke([0.25, 0.5, 0.8].map(s => [xs(s), lerp(cy + ry * 0.06, cy - ry * 0.04, s) + ry * 0.92 * Math.sin(Math.PI * s) ** 1.1 + ry * 0.2]), mixHex(C.skin.base, C.skin.shade, 0.32), W * 0.012));
  }
  return {svg: layer('eyes', {}, out), geo};
}

// ---------- brows: a tapered shape through inner / mid / outer points ----------
const BROWS = {   // dy at inner, mid, outer (px at head scale 1; negative = up); dx pulls the inner end toward the nose
  flat: [0, -3, 0], up: [-12, -16, -10], raised: [-9, -12, -6], worried: [-12, -6, 2], sad: [-9, -4, 4], angry: [9, 0, -6, 4],
  grief: [-17, -8, 6], fear: [-19, -16, -8], shock: [-17, -23, -16], soft: [-6, -4, 1], furrow: [7, 1, -3, 4], determined: [4, -1, -3, 2],
};
function filmBrows(C, W, H, f, ts) {
  const [di, dm, dout, dx = 0] = BROWS[f.brows || 'flat'] || BROWS.flat, y = -H * 0.175, fem = !!C.face.lashes;
  const col = C.browColor, out = [];
  for (const side of [-1, 1]) {
    const far = side * ts.tf > 0, hw = W * 0.095 * (far ? 1 - Math.abs(ts.tf) * 0.3 : 1);
    if (far && ts.back > 0.3) continue;
    const cx = featX(side * W * 0.205, W, ts), inner = [cx - side * (hw - dx), y + di], mid = [cx + side * hw * 0.1, y + dm - 3], outer = [cx + side * hw * 1.05, y + dout + 2];
    const P = [...quadPts(inner, [mid[0] * 1.5 - (inner[0] + outer[0]) / 4, mid[1] * 1.5 - (inner[1] + outer[1]) / 4], outer, 10), outer];
    const t0 = W * (fem ? 0.042 : 0.056), t1 = W * (fem ? 0.014 : 0.022), up = [], dn = [];
    P.forEach((p, i) => { const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dxy = [q[0] - o[0], q[1] - o[1]], L = Math.hypot(...dxy) || 1, n = [-dxy[1] / L, dxy[0] / L], th = lerp(t0, t1, i / (P.length - 1)) / 2;
      const s = side; up.push([p[0] + n[0] * th * s, p[1] + n[1] * th * s]); dn.push([p[0] - n[0] * th * s, p[1] - n[1] * th * s]); });
    out.push(path(polyD([...up, ...dn.reverse()]), col, {'stroke-linejoin': 'round'}), circle(inner[0], inner[1], t0 / 2, col));
  }
  return layer('brows', {}, out);
}

// ---------- nose ----------
function filmNose(C, W, H, ts) {
  if (C.face.nose === 'none') return '';
  const nx = featX(0, W, ts, 1.25), s = C.skin, k = Math.abs(ts.tf), sd = ts.tf >= 0 ? 1 : -1;
  // the shaded side of the nose and its tip; the shade swaps sides with the turn and grows in 3/4
  const sh = mixHex(s.base, s.shade, 0.85);
  const side = [[nx + W * 0.012, -H * 0.03], [nx + W * (0.03 + 0.02 * k) * sd, H * 0.06], [nx + W * (0.06 + 0.02 * k) * sd, H * 0.13], [nx + W * 0.02 * sd, H * 0.165], [nx - W * 0.035 * sd, H * 0.15], [nx + W * 0.0 * sd, H * 0.125], [nx + W * 0.025 * sd, H * 0.07]];
  const prof = clamp((k - 0.75) / 0.25 + ts.back * 2), ex = sd * W * 0.5;
  const bump = prof > 0 ? path(polyD(sampleBlob([[ex - sd * W * 0.03, -H * 0.04], [ex + sd * W * 0.05 * prof, H * 0.1], [ex + sd * W * 0.04 * prof, H * 0.15], [ex - sd * W * 0.03, H * 0.16]], true, 0.5, 6)), s.base) : '';
  return layer('nose', {}, bump, path(polyD(sampleBlob(side, true, 0.5, 6)), sh), ellipse(nx - W * 0.04 * sd, H * 0.158, W * 0.022, W * 0.012, mixHex(s.base, s.shade, 0.7)));
}

// ---------- mouth ----------
/** mouth shapes as {line: [pts] | null, fill: [pts] | null}: the line is the lip line, the fill a dark open mouth */
function mouthShape(m, x, y, w) {
  const Q = (a, c, b, n = 10) => [...quadPts(a, c, b, n), b];
  switch (m) {
    case 'flat': return {line: Q([x - w * 0.5, y + 1], [x, y - 1], [x + w * 0.5, y + 1])};
    case 'smile': return {line: Q([x - w * 0.55, y - 5], [x, y + 11], [x + w * 0.55, y - 5]), lip: true};
    case 'sad': return {line: Q([x - w * 0.5, y + 8], [x, y - 7], [x + w * 0.5, y + 8])};
    case 'sadSmile': return {line: Q([x - w * 0.42, y - 1], [x - w * 0.05, y + 7], [x + w * 0.45, y - 3]), lip: true};
    case 'smirk': return {line: Q([x - w * 0.45, y + 2], [x + w * 0.1, y + 6], [x + w * 0.55, y - 6])};
    case 'tight': return {line: Q([x - w * 0.48, y + 5], [x, y - 3], [x + w * 0.48, y + 5]), chin: true};
    case 'part': return {top: Q([x - w * 0.4, y + 1], [x, y - 3], [x + w * 0.4, y + 1]), bot: Q([x + w * 0.4, y + 1], [x, y + 7], [x - w * 0.4, y + 1])};
    case 'whisper': return {top: Q([x - w * 0.36, y + 1], [x, y - 5], [x + w * 0.36, y + 1]), bot: Q([x + w * 0.36, y + 1], [x, y + 14], [x - w * 0.36, y + 1]), teeth: 0.3};
    case 'speak': return {top: Q([x - w * 0.46, y], [x, y - 6], [x + w * 0.46, y]), bot: Q([x + w * 0.46, y], [x, y + 22], [x - w * 0.46, y]), teeth: 0.32, tongue: true};
    case 'open': return {top: Q([x - w * 0.55, y - 2], [x, y - 10], [x + w * 0.55, y - 2]), bot: Q([x + w * 0.55, y - 2], [x, y + 38], [x - w * 0.55, y - 2]), teeth: 0.25, tongue: true};
    case 'grin': return {top: Q([x - w * 0.7, y - 6], [x, y], [x + w * 0.7, y - 6]), bot: Q([x + w * 0.7, y - 6], [x, y + 34], [x - w * 0.7, y - 6]), teeth: 0.42, tongue: true};
    case 'teeth': return {top: Q([x - w * 0.6, y - 6], [x, y - 8], [x + w * 0.6, y - 6]), bot: Q([x + w * 0.6, y - 6], [x, y + 14], [x - w * 0.6, y - 6]), teeth: 1};
    // speech with the corners turned DOWN (the open shapes above all curve up and read as smiling on a tense face)
    case 'say': return {top: Q([x - w * 0.4, y + 6], [x, y - 5], [x + w * 0.4, y + 6]), bot: Q([x + w * 0.4, y + 6], [x, y + 20], [x - w * 0.4, y + 6]), teeth: 0.3, tongue: true};
    case 'afraid': return {top: Q([x - w * 0.42, y + 10], [x, y - 6], [x + w * 0.42, y + 10]), bot: Q([x + w * 0.42, y + 10], [x, y + 26], [x - w * 0.42, y + 10]), teeth: 0.35};
    case 'shout': return {top: Q([x - w * 0.55, y + 12], [x, y - 10], [x + w * 0.55, y + 12]), bot: Q([x + w * 0.55, y + 12], [x, y + 46], [x - w * 0.55, y + 12]), teeth: 0.4, tongue: true};
    case 'O': return {ell: [x, y + 8, w * 0.26, w * 0.34]};
    case 'gasp': return {ell: [x, y + 6, w * 0.18, w * 0.27]};
    case 'scream': return {top: Q([x - w * 0.62, y - 4], [x, y - 14], [x + w * 0.62, y - 4]), bot: Q([x + w * 0.62, y - 4], [x, y + 64], [x - w * 0.62, y - 4]), teeth: 0.18, tongue: true};
    case 'quiver': return {top: Q([x - w * 0.46, y + 8], [x, y - 4], [x + w * 0.46, y + 8]), bot: Q([x + w * 0.46, y + 8], [x, y + 9], [x - w * 0.46, y + 8]), chin: true};
    case 'cry': return {top: Q([x - w * 0.62, y + 14], [x, y - 12], [x + w * 0.62, y + 14]), bot: Q([x + w * 0.62, y + 14], [x, y + 40], [x - w * 0.62, y + 14]), teeth: 0.2, tongue: true, chin: true};
    default: return {line: Q([x - w * 0.55, y - 5], [x, y + 11], [x + w * 0.55, y - 5]), lip: true};
  }
}
function filmMouth(C, W, H, f, ts, t) {
  const m = f.mouth || 'smile';
  if (m === 'chew') return null;
  if (ts.back > 0.55) return '';   // turned away: the mouth is behind the cheek   // the cartoon chew is fine
  const x = featX(0, W, ts, 1.1), y = H * 0.27, w = W * 0.19 * (1 - Math.abs(ts.tf) * 0.12), sh = mouthShape(m, x, y, w), q = clamp(f.quiver || 0);
  // the quiver: one smooth wobble along the lip (two low spatial modes), each under 4 Hz, so the lip trembles without crawling
  const wob = (pts, amp) => q > 0 && pts ? pts.map((p, i) => { const u = i / (pts.length - 1), e = Math.sin(Math.PI * u); return [p[0], p[1] + q * amp * e * (0.7 * noise('mq1', t, 3.6) + 0.3 * Math.sin(2 * Math.PI * u) * noise('mq2', t, 3.1))]; }) : pts;
  const lipC = C.lips || C.mouthDark, out = [], skin = C.skin, lw = W * (C.lips ? 0.04 : 0.03);
  if (sh.line) {
    const L = wob(sh.line, 2.2);
    out.push(stroke(L, lipC, lw));
    if (sh.lip || C.lips) out.push(path(polyD([...quadPts([x - w * 0.22, y + 12], [x, y + 21], [x + w * 0.22, y + 12], 8), [x + w * 0.22, y + 12]]), mixHex(skin.base, skin.shade, 0.35)));   // lower-lip volume
  } else if (sh.ell) {
    const [ex, ey, erx, ery] = sh.ell;
    out.push(ellipse(ex, ey, erx, ery, C.mouthDark), cut(ellPoly(ex, ey, erx, ery, 28), ellPoly(ex, ey + ery * 0.85, erx * 0.75, ery * 0.5, 20), C.tongue), ellipse(ex, ey, erx, ery, 'none', {stroke: lipC, 'stroke-width': lw * 0.7}));
  } else {
    const top = wob(sh.top, 1.2), bot = wob(sh.bot, 2.6), MP = [...top, ...bot];
    const ys = MP.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    out.push(path(polyD(MP), C.mouthDark));
    if (sh.teeth) { const tp = clipPoly(MP, rectPoly(x - w, y0 - 20, w * 2, 20 + (y1 - y0) * sh.teeth)); if (tp.length > 2) out.push(path(polyD(tp), C.teeth)); }
    if (sh.tongue) out.push(cut(MP, ellPoly(x + w * 0.08, y1 - 3, w * 0.38, (y1 - y0) * 0.32, 24), C.tongue));
    out.push(path(polyD(MP), 'none', {stroke: lipC, 'stroke-width': lw * 0.62, 'stroke-linejoin': 'round'}));
    out.push(path(polyD([...quadPts([x - w * 0.2, y1 + 5], [x, y1 + 13], [x + w * 0.2, y1 + 5], 8), [x + w * 0.2, y1 + 5]]), mixHex(skin.base, skin.shade, 0.3)));
  }
  if (sh.chin || q > 0.05) {   // the chin crumples (a trembling dimple) when holding back tears
    const pts = [...(sh.line || []), ...(sh.bot || [])], mb = pts.length ? Math.max(...pts.map(p => p[1])) : y + 10;
    const cyy = Math.max(H * 0.4, mb + H * 0.07) + q * 1.5 * noise('chin', t, 3.1), k = Math.max(q, sh.chin ? 0.6 : 0);
    out.push(stroke(quadPts([x - W * 0.07, cyy], [x, cyy + H * 0.025 * k], [x + W * 0.07, cyy], 8).concat([[x + W * 0.07, cyy]]), mixHex(skin.base, skin.shade, 0.55), W * 0.014));
    out.push(ellipse(x - W * 0.035, cyy + H * 0.02, W * 0.016 * k, W * 0.011 * k, mixHex(skin.base, skin.shade, 0.35)), ellipse(x + W * 0.04, cyy + H * 0.024, W * 0.014 * k, W * 0.01 * k, mixHex(skin.base, skin.shade, 0.35)));
  }
  return layer('mouth', {}, out);
}

// ---------- extras (any face) ----------
/** eye geometry of the cartoon face, for extras placed relative to the eyes */
export function cartoonEyeGeo(W, H, f) {
  const turn = clamp(f.turn || 0, -1, 1), mode = f.eyes || 'open', rx0 = W * (mode === 'wide' ? 0.125 : 0.105), ry = W * (mode === 'wide' ? 0.15 : 0.122);
  return [-1, 1].map(side => { const far = side * turn > 0; return {side, cx: side * W * 0.2 * (1 - Math.abs(turn) * 0.25) + turn * W * 0.14, cy: -H * 0.02 + (f.eyeDy || 0), rx: rx0 * (far ? 1 - Math.abs(turn) * 0.22 : 1 + Math.abs(turn) * 0.04), ry}; });
}
/** tears: 0..0.35 a water line wells along the lower lid; 0.35..1 a streak runs down the cheek and ends in a drop */
export function tearsLayer(C, W, H, f, geo, t) {
  const v = clamp(f.tears || 0); if (v <= 0.01) return '';
  const which = f.tearSide || 'both', out = [], water = mixHex('#A8D8F0', C.skin.base, 0.18), deep = mixHex('#6FA8CC', C.skin.base, 0.25), hi = '#F4FBFF';
  for (const e of geo) {
    if ((which === 'L' && e.side > 0) || (which === 'R' && e.side < 0)) continue;
    const well = clamp(v / 0.35), run = clamp((v - 0.35) / 0.65), lowY = s => lerp(e.cy + e.ry * 0.06, e.cy - e.ry * 0.04, s) + e.ry * 0.92 * Math.sin(Math.PI * s) ** 1.1;
    const xs = s => lerp(e.cx - e.side * e.rx, e.cx + e.side * e.rx, s);
    // the welling: a thin lens of water sitting on the lower lid, thickening as it fills
    const th = e.ry * (0.07 + 0.15 * well), up = [], dn = [];
    for (let i = 1; i <= 15; i++) { const s = i / 16, k = Math.sin(Math.PI * s) ** 0.7; up.push([xs(s), lowY(s) - th * k * 0.55]); dn.push([xs(s), lowY(s) + th * k * 0.75]); }
    out.push(path(polyD([...up, ...dn.reverse()]), water), stroke(up.slice(4, 10), hi, W * 0.008));
    if (run > 0) {   // the streak: tapered, with a fixed slight wave (it never crawls), widest at the drop
      const sx = xs(0.72), sy = lowY(0.72) + th * 0.4, L = H * 0.4 * run, n = 9;
      const pts = Array.from({length: n + 1}, (_, i) => { const u = i / n; return [sx + Math.sin(u * 2.6 + e.side) * W * 0.01 + e.side * u * W * 0.015, sy + u * L]; });
      const wAt = u => W * (0.007 + 0.009 * u);
      out.push(path(polyD([...pts.map((p, i) => [p[0] - wAt(i / n), p[1]]), ...pts.map((p, i) => [p[0] + wAt(i / n), p[1]]).reverse()]), water),
        stroke(pts.slice(1, -1).map(p => [p[0] - W * 0.004, p[1]]), hi, W * 0.005));
      const d = pts[n], r = W * (0.02 + 0.004 * Math.sin(t * 2.2 + e.side));   // the drop swells slowly
      out.push(path(polyD(sampleBlob([[d[0], d[1] - r * 1.7], [d[0] + r, d[1] + r * 0.25], [d[0], d[1] + r * 1.1], [d[0] - r, d[1] + r * 0.25]], true, 0.5, 6)), water),
        path(polyD(sampleBlob([[d[0] + r * 0.2, d[1] + r * 0.5], [d[0] + r * 0.9, d[1] + r * 0.3], [d[0], d[1] + r * 1.1], [d[0] - r * 0.6, d[1] + r * 0.6]], true, 0.5, 4)), deep), circle(d[0] - r * 0.35, d[1] - r * 0.05, r * 0.28, hi));
    }
  }
  return layer('tears', {}, out);
}
/** a cut at the temple: a short gash, dried blood and a faint bruise. mark = {type: "cut", side: "L"|"R", size} */
export function markLayer(C, W, H, mark, ts) {
  if (!mark) return '';
  const marks = [].concat(mark), out = [];
  for (const mk of marks) {
    const side = mk.side === 'L' ? -1 : 1, s = mk.size || 1, x = featX(side * W * 0.37, W, ts, 0.45), y = -H * 0.12 + (mk.dy || 0);
    if (side * ts.tf > 0.7) continue;   // turned away
    if ((mk.type || 'cut') === 'cut') {
      out.push(ellipse(x, y + H * 0.01, W * 0.075 * s, W * 0.055 * s, mixHex(C.skin.base, '#7A4A6E', 0.16)),
        stroke([[x - side * W * 0.03 * s, y - H * 0.03 * s], [x + side * W * 0.008 * s, y + H * 0.002], [x + side * W * 0.03 * s, y + H * 0.03 * s]], '#7E1E24', W * 0.018 * s),
        stroke([[x - side * W * 0.022 * s, y - H * 0.018 * s], [x + side * W * 0.02 * s, y + H * 0.018 * s]], '#B4383A', W * 0.006 * s),
        stroke([[x + side * W * 0.012, y + H * 0.02], [x + side * W * 0.02, y + H * 0.07 * s], [x + side * W * 0.014, y + H * 0.11 * s]], '#8E2B2B', W * 0.01 * s),
        circle(x + side * W * 0.014, y + H * 0.112 * s, W * 0.008 * s, '#8E2B2B'));
    } else if (mk.type === 'bruise') out.push(ellipse(x, y, W * 0.09 * s, W * 0.07 * s, mixHex(C.skin.base, '#5E3A6E', 0.25)));
  }
  return layer('mark', {}, out);
}
/** stubble on the jaw and upper lip, under the mouth */
export function stubbleLayer(C, W, H, ts, k = 1) {
  const FP = sampleBlob(facePts(W, H), true, 0.5, 12), col = mixHex(C.skin.base, C.hair.base, 0.06 * k), x = featX(0, W, ts, 1.1);
  return layer('stubble', {}, cut(FP, ellPoly(x * 0.7, H * 0.49, W * 0.42, H * 0.17, 40), col));
}
/** age lines: nose-to-mouth folds, under-eye bags, crow's feet, two forehead lines */
export function wrinklesLayer(C, W, H, ts, geo) {
  const col = mixHex(C.skin.base, C.skin.shade, 0.62), w = W * 0.012, x = featX(0, W, ts, 1.1), out = [];
  for (const side of [-1, 1]) {
    const far = side * ts.tf > 0.5; if (far) continue;
    out.push(stroke(quadPts([x + side * W * 0.1, H * 0.13], [x + side * W * 0.17, H * 0.19], [x + side * W * 0.15, H * 0.26], 8).concat([[x + side * W * 0.15, H * 0.26]]), mixHex(C.skin.base, C.skin.shade, 0.5), w));
  }
  for (const e of geo) {
    out.push(stroke(quadPts([e.cx - e.rx * 0.7, e.cy + e.ry * 1.35], [e.cx, e.cy + e.ry * 1.7], [e.cx + e.rx * 0.8, e.cy + e.ry * 1.3], 8), mixHex(C.skin.base, C.skin.shade, 0.4), w));
    const ox = e.cx + e.side * e.rx * 1.25;
    out.push(stroke([[ox, e.cy - e.ry * 0.1], [ox + e.side * W * 0.04, e.cy - e.ry * 0.3]], col, w * 0.8), stroke([[ox, e.cy + e.ry * 0.2], [ox + e.side * W * 0.04, e.cy + e.ry * 0.35]], col, w * 0.8));
  }
  out.push(stroke(quadPts([x - W * 0.16, -H * 0.255], [x, -H * 0.275], [x + W * 0.16, -H * 0.255], 10), col, w * 0.8));
  return layer('wrinkles', {}, out);
}

/** the whole film face for one frame: eyes, brows, nose, mouth (+ the eye geometry for extras) */
export function filmFace(C, W, H, f, t = 0) {
  const ts = turnState(f.turn), E = filmEyes(C, W, H, f, ts);
  return {ts, geo: E.geo, eyes: E.svg, brows: filmBrows(C, W, H, f, ts), nose: filmNose(C, W, H, ts), mouth: filmMouth(C, W, H, f, ts, t)};
}
/**
 * The back of the head sweeping across the face as |turn| goes 1 → 2 (2 = seen from behind): the hair (or bare scalp) covers
 * the head from the side the face turns away from. The far ear stays behind; the near ear rides on top.
 */
export function backOfHead(C, W, H, ts, hairCol) {
  if (ts.back <= 0) return '';
  const FP = sampleBlob(facePts(W * 1.01, H * 1.01), true, 0.5, 12), b = ts.back, s = ts.sign;
  const ecx = -s * W * (1.32 - 1.2 * b), sweep = ellPoly(ecx, -H * 0.12, W * 0.78, H * 0.95, 40);   // a curved sweep from the far side
  const bald = C.hair.style === 'bald', hc = bald ? C.skin : hairCol, out = [];
  const longish = ['long', 'bun', 'parted', 'ponytail', 'bob', 'curlyLong', 'curly-long', 'pigtails'].includes(C.hair.style);
  const hairline = H * (0.16 + (longish ? 0.3 : 0.16) * b);   // behind the ear the hair stops; seen from behind it reaches the nape
  const nape = ellPoly(0, hairline - H * 0.75, W * 0.72, H * 0.75, 40);   // the hairline curves up behind the ears
  const region = clipPoly(clipPoly(FP, sweep), nape); if (region.length < 3) return '';
  out.push(path(polyD(region), hc.base), cut(region, rectPoly(W * 0.12, -H, W, H * 2), hc.shade));
  if (!bald && b > 0.6) out.push(cut(region, ellPoly(-W * 0.14, -H * 0.36, W * 0.16, H * 0.04, 16), mixHex(hc.base, hc.light, 0.5)));
  if (b > 0.7) { const below = clipPoly(FP, sweep).filter(Boolean); const sk = clipPoly(below, rectPoly(-W * 0.28, hairline - H * 0.2, W * 0.56, H)); if (sk.length > 2) out.splice(0, 0, path(polyD(sk), mixHex(C.skin.base, C.skin.shade, 0.45))); }   // the nape (under the hair)
  // the near ear rides round at the hair's edge
  const edge = ecx + s * W * 0.78, ex = edge - s * W * 0.05, ey = H * 0.04;
  if (b > 0.08 && b < 0.92 && Math.abs(ex) < W * 0.5) out.push(circle(ex, ey, W * 0.1, C.skin.base), circle(ex + s * W * 0.02, ey + 2, W * 0.05, C.skin.shade));
  return layer('back-of-head', {}, out);
}
