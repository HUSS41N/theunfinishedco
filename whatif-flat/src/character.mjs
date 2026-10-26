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
import {filmFace, backOfHead, cartoonEyeGeo, tearsLayer, markLayer, stubbleLayer, wrinklesLayer, featX as featXf, turnState} from './face.mjs';
import {TOPS, isTunic, defineWardrobe, wetTone, torsoDetails, backDrapes, frontDrapes, drapeLayer, legGarment, sleeveKind, sleeveParts, armOver, hairFrontX, hairBackX, bunBack, accessoryX} from './wardrobe.mjs';
export {DIM, POSES};

import {D2R, R2D, clamp, smooth, r2, add, sub, mul, len, dot, unit, wrap180, dirOf, fromAngle, M, chain, mtx, sampleBlob, quadPts, ellPoly, rectPoly, polyArea, clipPoly, polyD, cut, offsetLine, tube, cover} from './geom.mjs';

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
  const old = def.age === 'old', wet = !!def.wet;
  if (old) for (const [k, v] of Object.entries({height: 0.95, shoulders: 0.95, waist: 1.04})) if (bdef[k] === undefined) b[k] *= v;
  const iris = resolve(face.iris || '#4A2C1C', {brown: '#4A2C1C', dark: '#2A1A12', hazel: '#7A5A2A', grey: '#6A7480', blue: '#3A6A9A', green: '#4A7A4A'});
  const C0 = {
    id, style: def.style, raw: def, palette: def.palette, build: b, age: def.age || null, wet, mark: def.mark || null,
    film: face.style === 'film', iris: {base: mixHex(iris, '#000000', 0.25), mid: iris}, lashColor: '#24160F',
    // idle life: an old body moves slower and smaller, blinks slower (scene.mjs reads this)
    life: old ? {rate: 0.6, amp: 0.75, blink: 5.2} : (def.life || null),
    skin: tone(resolve(def.skin || pal.skin || 'peach', SKIN)),
    hair: {style: def.hair?.style || 'short', ...tone(resolve(def.hair?.color || pal.hair || 'brown', HAIR))},
    top: {style: topStyle, ...tone(resolve(def.top?.color || pal.top || 'green', CLOTH)), detail: resolve(def.top?.detail || pal.detail, CLOTH)},
    // a dress with no bottom given means bare legs (it used to put jeans under every dress)
    bottom: {style: def.bottom?.style || (topStyle === 'dress' ? 'none' : 'jeans'), ...tone(resolve(def.bottom?.color || pal.bottom || 'denim', CLOTH))},
    shoes: {style: def.shoes?.style || 'sneaker', ...tone(resolve(def.shoes?.color || pal.shoes || 'charcoal', CLOTH)), sole: def.shoes?.sole || '#F4F2EE'},
    face, lips, acc, accent: tone(resolve(pal.accent || 'red', CLOTH)),
    mouthDark: '#4A1D22', tongue: '#E8566A', teeth: '#FFFFFF', eyeWhite: '#FFFFFF', pupil: '#1C1A1E',
  };
  // Indian wear and uniforms imply their bottoms; a saree / gown with no bottom shows legs only where the drape ends
  if (TOPS[topStyle] && !def.bottom?.style) C0.bottom.style = TOPS[topStyle].bottom;
  if (C0.film) C0.eyeWhite = '#F7F3EE';
  C0.browColor = C0.hair.style === 'bald' ? C0.skin.deep : ['grey', 'white', 'platinum'].includes(def.hair?.color) ? mixHex(C0.hair.base, '#4A4038', 0.45) : C0.hair.deep;
  C0.wd = defineWardrobe(def, C0);
  if (wet) { C0.top = {...C0.top, ...wetTone(C0.top)}; C0.bottom = {...C0.bottom, ...wetTone(C0.bottom)}; if (C0.wd.blouse) C0.wd.blouse = wetTone(C0.wd.blouse); }
  return C0;
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
function torsoLayer(C, bend, armBall, back = false) {
  const B = C.build, T = DIM.torso * B.height, W = DIM.topW * B.width * B.shoulders, Wb = DIM.botW * B.width * B.hips, wa = B.waist;
  const st = C.top.style, top = st === 'saree' ? {...C.top, ...C.wd.blouse} : C.top, bot = C.bottom, sk = C.skin, tunic = isTunic(st);
  const angAt = y => (bend || 0) * clamp(-y / T, 0, 1.2);
  const wp = ([x, y]) => { const a = angAt(y) * D2R, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
  const at = (p, ...kids) => { const q = wp(p); return g({transform: tr(q[0], q[1], angAt(p[1]))}, ...kids); };
  const outlinePts = [[-W * 0.42, -T + 8], [0, -T - 6], [W * 0.42, -T + 8], [W * 0.5, -T + 40], [Wb * 0.52 * wa, -T * 0.38], [Wb * 0.5, 0], [0, 14], [-Wb * 0.5, 0], [-Wb * 0.52 * wa, -T * 0.38], [-W * 0.5, -T + 40]];
  // the outline as a polygon in the unbent frame; every shade is outline ∩ a convex region, densified, then bent
  const OP = sampleBlob(outlinePts, true, 0.5, 12);
  const dense = pts => { const out = []; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(len(sub(q, p)) / 14)); for (let j = 0; j < n; j++) out.push([p[0] + (q[0] - p[0]) * j / n, p[1] + (q[1] - p[1]) * j / n]); }); return out; };
  const wcut = (clip, fill) => { const pp = clipPoly(OP, clip); return pp.length < 3 ? '' : path(polyD(dense(pp).map(wp)), fill); };
  const dress = st === 'dress', bare = bot.style === 'none', fd = !back;   // fd: front details (hidden in a back view)
  const parts = [path(polyD(dense(OP).map(wp)), top.base),
    wcut(rectPoly(W * 0.16, -T - 20, W, T + 60), top.shade),
    wcut(ellPoly(0, -T + 4, W * 0.24, 26), mixHex(top.base, top.shade, 0.7)),
    st === 'hoodie' && fd ? at([0, -T * 0.27], path(rrect(-W * 0.3, -T * 0.15, W * 0.6, T * 0.3, [10, 10, 18, 18]), top.shade)) : '',
    st === 'jacket' && fd ? [wcut(rectPoly(-W * 0.11, -T - 10, W * 0.22, T + 30), top.detail || '#F2F0EC'), wcut(rectPoly(-W * 0.02, -T - 10, W * 0.04, T + 30), top.deep)] : '',
    st === 'shirt' && fd ? [0.18, 0.4, 0.62, 0.84].map(k => at([0, -T + T * k], circle(0, 0, 5, top.deep))) : '',
    st === 'blouse' && fd ? [0.3, 0.48, 0.66].map(k => at([0, -T + T * k], circle(0, 0, 4.5, top.detail || top.light))) : '',
    st === 'stripes' ? [0.2, 0.38, 0.56, 0.74].map(k => wcut(rectPoly(-W, -T + T * k, W * 2, 18), top.detail || top.light)) : '',
    // waistband / bottom garment at the hips (covers the tops of the legs)
    !dress && !bare && !tunic ? [wcut(rectPoly(-Wb * 0.6, -32, Wb * 1.2, 60), bot.base), wcut(rectPoly(Wb * 0.16, -32, Wb, 60), bot.shade)] : '',
  ];
  if (fd && (st === 'tee' || st === 'stripes' || dress)) parts.push(at([0, -T + 2], path(`M-26 0 Q0 28 26 0Z`, sk.shade)));
  if (fd && st === 'tank') parts.push(at([0, -T + 4], path(`M-34 0 Q0 48 34 0Z`, sk.base)));
  if (fd && st === 'shirt') parts.push(at([0, -T + 2], path(`M-30 0 L0 32 L-6 0Z`, top.light), path(`M30 0 L0 32 L6 0Z`, top.light)));
  if (fd && st === 'hoodie') parts.push(at([0, -T], stroke([[-14, 18], [-16, 74]], top.light, 5), stroke([[14, 18], [16, 74]], top.light, 5)));
  if (fd && st === 'jacket') parts.push(at([0, -T], path(`M${r2(-W * 0.11)} 0 L${r2(-W * 0.24)} 70 L${r2(-W * 0.1)} 60Z`, top.deep), path(`M${r2(W * 0.11)} 0 L${r2(W * 0.24)} 70 L${r2(W * 0.1)} 60Z`, top.deep)));
  if (fd && st === 'blouse') { const col = top.detail || '#F7F4EE';   // a round "Peter Pan" collar over a skin scoop
    parts.push(at([0, -T + 2], path(`M-24 0 Q0 22 24 0Z`, sk.shade), path(blob([[0, 2], [-16, -3], [-40, 4], [-38, 22], [-14, 24]]), col), path(blob([[0, 2], [16, -3], [40, 4], [38, 22], [14, 24]]), col), circle(0, 10, 4, mixHex(col, '#000000', 0.25)))); }
  if (dress) { const L = DIM.thigh * B.height * B.limbs * 0.95, d = blob([[-Wb * 0.5, -10], [Wb * 0.5, -10], [Wb * 0.9, L], [0, L + 10], [-Wb * 0.9, L]]);
    parts.push(path(d, top.base), cut(sampleBlob([[-Wb * 0.5, -10], [Wb * 0.5, -10], [Wb * 0.9, L], [0, L + 10], [-Wb * 0.9, L]]), rectPoly(Wb * 0.15, -20, Wb, L + 40), top.shade), top.detail ? path(rrect(-Wb * 0.56, -24, Wb * 1.12, 16, 6), top.detail) : ''); }
  if (bot.style === 'skirt' && !dress) { const L = DIM.thigh * B.height * B.limbs * 0.7, d = blob([[-Wb * 0.55, -20], [Wb * 0.55, -20], [Wb * 0.85, L], [-Wb * 0.85, L]]);
    parts.push(path(d, bot.base), cut(sampleBlob([[-Wb * 0.55, -20], [Wb * 0.55, -20], [Wb * 0.85, L], [-Wb * 0.85, L]]), rectPoly(Wb * 0.15, -30, Wb, L + 40), bot.shade)); }
  if (TOPS[st] || C.wd.vest || C.wd.shawl || C.wd.print || C.wet) parts.push(...torsoDetails(C, {T, W, Wb, wcut, at, wp, OP, dense, back}));
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
function accessories(C, W, H, f, eyeGeo = null, fx = null, hide = false) {
  const out = [], turn = clamp(f.turn || 0, -1, 1), ox = turn * W * 0.14, hs = C.hair.style;
  for (const a of C.acc) {
    const kind = accKind(a), col = typeof a === 'object' && a.color ? resolve(a.color, CLOTH) : null;
    if (hide && ['glasses', 'sunglasses', 'mustache', 'beard', 'mask', 'earrings'].includes(kind)) continue;
    const x = accessoryX(C, a, W, H, f, (x0, k = 1) => (fx ? fx(x0, k) : x0 + ox * k), eyeGeo);
    if (x !== null) { if (x) out.push(x); continue; }
    if (kind === 'glasses' || kind === 'sunglasses') { const c = col || '#1F1F24'; for (const s of [-1, 1]) { const cx = s * W * 0.2 * (1 - Math.abs(turn) * 0.25) + ox; out.push(path(rrect(cx - W * 0.14, -H * 0.1, W * 0.28, W * 0.22, 14), kind === 'sunglasses' ? c : 'rgba(255,255,255,0.18)', {stroke: c, 'stroke-width': 8})); } out.push(stroke([[-W * 0.06 + ox, -H * 0.04], [W * 0.06 + ox, -H * 0.04]], c, 7)); }
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
function headLayer(C, f, t = 0) {
  const W = DIM.headW * C.build.head, H = DIM.headH * C.build.head, ts = turnState(f.turn || 0), turn = ts.tf;
  const fpts = [[0, -H * 0.5], [W * 0.42, -H * 0.4], [W * 0.5, -H * 0.04], [W * 0.44, H * 0.3], [W * 0.18, H * 0.49], [-W * 0.18, H * 0.49], [-W * 0.44, H * 0.3], [-W * 0.5, -H * 0.04], [-W * 0.42, -H * 0.4]];
  const shape = blob(fpts), FP = sampleBlob(fpts, true, 0.5, 12);
  const sk = C.skin, film = C.film, hide = ts.back > 0.85;   // seen from behind: no features at all
  const fx = (x0, k) => (film ? featXf(x0, W, ts, k) : x0 + turn * W * 0.14 * k);
  const ears = film
    ? [-1, 1].map(sd => { const far = Math.max(0, sd * turn), x = sd * W * 0.49 * (1 - 0.45 * far) + turn * W * 0.05; return g({}, circle(x, H * 0.04, W * 0.11, sk.base), circle(x + sd * W * 0.01, H * 0.05, W * 0.055, sk.shade)); })
    : [-1, 1].map(sd => g({}, circle(sd * W * 0.49 + turn * W * 0.06, H * 0.04, W * 0.11, sk.base), circle(sd * W * 0.5 + turn * W * 0.06, H * 0.05, W * 0.055, sk.shade)));
  const FF = film && !hide ? filmFace(C, W, H, f, t) : null;
  const geo = FF ? FF.geo : cartoonEyeGeo(W, H, f);
  const fo = {...f, _ts: ts};
  const parts = [
    layer('ears', {}, ears),
    layer('face', {}, path(shape, sk.base)),
    layer('face-shade', {}, cut(FP, ellPoly(W * 0.62 - turn * W * 0.2, H * 0.1, W * 0.32, H * 0.7, 48), mixHex(sk.base, sk.shade, 0.85)), cut(FP, ellPoly(0, H * 0.62, W * 0.5, H * 0.16, 40), mixHex(sk.base, sk.shade, 0.7))),
    C.face.blush && !hide ? layer('cheeks', {}, [-1, 1].map(sd => ellipse(film ? fx(sd * W * 0.28, 1) : sd * W * 0.28 + turn * W * 0.14, H * 0.16, W * 0.08, W * 0.05, mixHex(sk.base, '#F2627A', 0.3)))) : '',
    (C.face.stubble || f.stubble) && !hide ? stubbleLayer(C, W, H, ts, f.stubble ?? 1) : '',
    (C.age === 'old' || C.face.wrinkles) && !hide && C.face.wrinkles !== false ? wrinklesLayer(C, W, H, ts, geo) : '',
    hide ? '' : FF ? FF.eyes : eyes(C, W, H, f),
    hide ? '' : tearsLayer(C, W, H, f, geo, t),
    hide ? '' : FF ? '' : brows(C, W, H, f),
    hide ? '' : FF ? FF.nose : layer('nose', {}, C.face.nose === 'none' ? '' : path(blob([[turn * W * 0.2 - W * 0.05, H * 0.06], [turn * W * 0.2 + W * 0.04, H * 0.04], [turn * W * 0.2 + W * 0.07, H * 0.14], [turn * W * 0.2 - W * 0.05, H * 0.16]]), sk.shade)),
    hide ? '' : markLayer(C, W, H, f.mark ?? C.mark, ts),
    C.face.bindi && !hide && Math.abs(turn) < 0.9 ? layer('bindi', {}, circle(fx(0, 1.05), -H * 0.115, W * 0.022, resolve(C.face.bindi === true ? 'red' : C.face.bindi, CLOTH))) : '',
    hide ? '' : FF && FF.mouth !== null ? FF.mouth : layer('mouth', {}, mouth(C, W, H, f)),
    layer('hair-front', {}, hairFrontX(C, W, H) ?? hairFront(C, W, H)),
    FF ? FF.brows : '',   // film brows sit over a fringe (they must read in close-up)
    backOfHead(C, W, H, ts, C.hair),
    ts.back > 0 ? bunBack(C, W, H, ts.back) : '',
    accessories(C, W, H, fo, FF ? geo : null, fx, hide),
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
  const {scale = 1, facing = 1, hold = {}, t = 0} = opts;
  const lk = opts.look || {}, view = lk.view || 'front', backView = view === 'back';
  const shadow = opts.shadow !== false && !lk.reflection;
  const P = pose || {}, face = {...P.face}, B = C.build;
  let body = P.body || {}, hd = P.head || {};
  if (backView && face.turn === undefined) face.turn = 2;
  if (C.age === 'old') { body = {...body, bend: (body.bend || 0) + 7}; hd = {...hd, dy: (hd.dy || 0) + 7, tilt: (hd.tilt || 0) + 2}; }   // the stoop: rounded back, head forward
  const still = lk.still || C.raw?.still;   // a still figure blinks rarely and slowly (driven here so it needs no idle life)
  if (still && face.blink === undefined) { const per = 7 + (C.id.length % 3) * 1.7, ph = ((t + per * 0.37) % per + per) % per, dur = 0.55; face.blink = ph < dur ? Math.sin(Math.PI * ph / dur) ** 1.5 : 0; }
  const fs = 0.6 + 0.4 * Math.min(1, B.height * B.limbs);   // shoe size
  const legLen = (DIM.thigh + DIM.shin) * B.height * B.limbs, pelvis = [body.dx || 0, -legLen - DIM.footH * 0.5 * fs + (body.dy || 0)];
  const lean = body.lean || 0, sy = body.scaleY || 1, bend = body.bend || 0;
  const Up = chain(M.t(pelvis[0], pelvis[1]), M.r(lean), M.s(1, sy)), UpInv = M.inv(Up);
  const reachPt = r => [pelvis[0] + r[0], r[1]];   // reach: origin on the ground under the pelvis, +x = facing, y up negative

  // ----- clothes that decide limb colours
  const tst = C.top.style, bst = C.bottom.style;
  const pants = bst === 'jeans' || bst === 'pants', shorts = bst === 'shorts';
  const sk = sleeveKind(C), sleeveFull = sk === 'full', sleeveShort = sk === 'short';
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
    const col = pants ? C.bottom : C.skin, garment = legGarment(C, j, endIn, legW, side), parts = garment || [...tube([j.root, j.mid, endIn], legW, col.base, col.shade, side)];
    if (shorts) parts.push(cover(j.root, add(j.root, mul(sub(j.mid, j.root), 0.62)), legW * 1.3, C.bottom, side));
    if (C.shoes.style === 'boot') parts.push(cover(add(j.mid, mul(sub(j.end, j.mid), 0.45)), endIn, legW * 1.14, C.shoes, side, {roundStart: false, hem: false}));
    parts.push(g({transform: `translate(${r2(j.end[0])} ${r2(j.end[1])}) rotate(${r2(footRot)}) scale(${side} 1)`}, shoeShape(C, fs)));
    const foot = [j.end[0] + side * 12 * fs * Math.cos(fr) - 20 * fs * Math.sin(fr), j.end[1] + side * 12 * fs * Math.sin(fr) + 20 * fs * Math.cos(fr)];
    return {svg: layer('leg-' + k, {}, parts), j, side, hip, foot};
  });
  // hip "ball" caps in the trouser colour: a splayed or raised leg turns inside a round hip, no gap at the crotch
  const hw = DIM.hip * B.width * B.hips, hr = (shorts ? legW * 1.3 : legW) * 0.56;
  const trousers = pants || shorts || ['salwar', 'pyjama', 'churidar'].includes(bst);
  const hipBalls = trousers ? layer('hips', {}, legs.map(l => circle(l.hip[0], l.hip[1], hr, C.bottom.base)), path(rrect(pelvis[0] - hw, pelvis[1] - 24, hw * 2, 24 + hr * 0.5, 8), C.bottom.base)) : '';

  // ----- torso + arms (upper-body frame: translate(pelvis) rotate(lean) scale(1, scaleY))
  const sleeveC = C.wd.shawl || (tst === 'saree' ? C.wd.blouse : C.top), bare = sk === 'none' && !C.wd.shawl;
  const ballCol = bare ? C.skin.base : sleeveC.base;
  const tor = torsoLayer(C, bend, {r: C.wd.shawl ? armW * 0.9 : sleeveShort ? armW * (tst === 'blouse' ? 1.42 : 1.3) * 0.5 : sk === 'elbow' ? armW * 0.64 : armW * 0.62, col: ballCol, shade: bare ? C.skin.base : sleeveC.shade}, backView);
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
      else parts.push(...sleeveParts(C, j, side, armW, sk));
    }
    if (C.wd.shawl || tst === 'saree' || tst === 'sherwani' || C.acc.length) parts.push(...armOver(C, j, side, armW, sk, handDeg));
    parts.push(g({}, handShape(j.end, handDeg, side, C.skin, DIM.hand * B.limbs), item ? PROPS_HELD(item, j.end, handDeg, side, t, {facing}) : ''));
    return {svg: layer('arm-' + k, {}, parts), z: A.z || 'front', k, j, side, handDeg};
  });

  // ----- neck pivot + head: tilt rotates about the neck base (top of the torso); the neck stretches a little with tilt
  const head = headLayer(C, face, t), H = head.H, W = head.W;
  const tilt = (hd.tilt || 0) + tor.angAt(-T), lift = -Math.min(0, hd.dy || 0) * 0.5;
  const nl = DIM.neck * (1 + Math.min(Math.abs(hd.tilt || 0), 40) / 40 * 0.16) + lift;
  const neckM = chain(M.t(tor.neckBase[0], tor.neckBase[1]), M.r(tilt));
  const headM = M.mul(neckM, M.t(hd.dx || 0, -(nl + H * 0.44) + (hd.dy || 0) + lift));
  const nw = DIM.neckW, hx = hd.dx || 0, topY = -(nl + 14) + Math.max(0, hd.dy || 0);
  const neck = layer('neck', {transform: mtx(neckM)}, path(`M${-nw / 2} 16 L${r2(hx - nw / 2)} ${r2(topY)} L${r2(hx + nw / 2)} ${r2(topY)} L${nw / 2} 16Z`, C.skin.base),
    path(`M0 16 L${r2(hx)} ${r2(topY)} L${r2(hx + nw / 2)} ${r2(topY)} L${nw / 2} 16Z`, mixHex(C.skin.base, C.skin.shade, 0.8)));
  let back = hairBackX(C, W, H, face, lean + tilt) ?? hairBack(C, W, H, face, lean + tilt);   // hanging hair counter-rotates by the head's screen rotation
  const bw = bowOf(C);
  if (bw && C.hair.style === 'pigtails') back += [-1, 1].map(s => bowShape(s * W * 0.5, -H * 0.17, bw.s * W * 0.11, bw.c, s * 20)).join('');
  const hairBackG = back ? layer('hair-back', {transform: mtx(headM)}, back) : '';
  const headG = layer('head', {transform: mtx(headM)}, head.svg);

  const upper = g({transform: tr(pelvis[0], pelvis[1], lean, 1, sy)},
    // seen from behind, the arms (and what the hands hold in front) are behind the body
    hairBackG, backView ? '' : backDrapes(C, T, tor.W, tor.Wb, tor.wp, false), arms.filter(a => a.z === 'back' || backView).map(a => a.svg), neck, tor.svg,
    backView ? backDrapes(C, T, tor.W, tor.Wb, tor.wp, true) : frontDrapes(C, T, tor.W, tor.wp, false), headG, arms.filter(a => a.z !== 'back' && !backView).map(a => a.svg));
  // legs are drawn in the character frame (not leaning) BEFORE the upper body so the waistband covers the hips
  const legsSvg = layer('legs', {}, legs.map(l => l.svg), hipBalls, drapeLayer(C, legs, Up, legW, backView));
  const sh0 = shadow ? layer('shadow', {}, ellipse(pelvis[0] * 0.5, 4, 150 * B.width + Math.abs(body.dy || 0) * 0.2, 26, '#000000', {opacity: 0.22})) : '';
  const ns = `k${String(C.id).replace(/[^\w-]/g, '')}${(++buildSeq).toString(36)}-`;
  // ----- looks: ghost / fade / reflection pre-blend every colour (no group opacity inside the character)
  const LM = lookMaps(lk);
  const svg = scopeIds(layer(`character:${C.id}`, {transform: `scale(${facing * scale} ${scale})`}, LM ? recolor(sh0, LM.legs) : sh0, LM ? recolor(legsSvg, LM.legs) : legsSvg, LM ? recolor(upper, LM.upper) : upper), ns);

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
  return {svg, pelvis, height: legLen + T + DIM.neck + H, anchors, joints, opacity: LM ? LM.opacity : 1};
}

// ---------- looks (ghost, fade into fog, mirror reflection) ----------
const hexMap = fn => { const cache = new Map(); return c => { const k = c.toLowerCase(); if (!cache.has(k)) cache.set(k, fn(k)); return cache.get(k); }; };
const grey = c => { const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), l = Math.round(v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11); return '#' + [l, l, l].map(x => x.toString(16).padStart(2, '0')).join(''); };
/** replace every #rrggbb colour in a markup string */
export const recolor = (svg, fn) => (svg ? svg.replace(/#[0-9a-fA-F]{6}\b/g, fn) : svg);
/**
 * look = {ghost 0..1, ghostTo, fade 0..1, fadeTo, reflection: true | {tint, amount}}. Returns per-part colour maps (the legs
 * fade first, like mist rising) and the opacity the actor layer should multiply in; null when nothing applies.
 */
export function lookMaps(lk = {}) {
  const gh = clamp(+lk.ghost || 0), fd = clamp(+lk.fade || 0), rf = lk.reflection;
  if (!gh && !fd && !rf) return null;
  const gTo = lk.ghostTo || '#C8D5E2', fTo = lk.fadeTo || '#8E9AA6', rt = (rf && rf.tint) || '#8FA6BD', ra = rf ? (rf.amount ?? 0.35) : 0;
  const make = fk => hexMap(c => {
    let x = c;
    if (ra) x = mixHex(mixHex(x, grey(x), 0.35), rt, ra);
    if (gh) x = mixHex(mixHex(x, grey(x), 0.75 * gh), gTo, 0.45 * gh);
    if (fd) x = mixHex(x, fTo, clamp(fd * fk));
    return x;
  });
  return {legs: make(1.35), upper: make(1), opacity: (1 - 0.18 * gh) * (1 - smooth((fd - 0.55) / 0.45))};
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
