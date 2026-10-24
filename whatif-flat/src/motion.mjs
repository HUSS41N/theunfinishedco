// v3 motion library: easing, spline keyframes, smooth noise, two-bone IK and the planted-foot walk.
// Browser-safe (no Node imports). Everything is deterministic in (seed, t); every oscillation stays under 5 Hz so nothing
// aliases into jitter at 24 fps.
const PI = Math.PI;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// ---------- easing ----------
const outBack = (s = 1.2) => x => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;   // s = 1.2 ≈ 4 % overshoot
const inOutCubic = x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const EASE = {
  linear: x => x,
  inQuad: x => x * x, outQuad: x => 1 - (1 - x) * (1 - x), inOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  inCubic: x => x * x * x, outCubic: x => 1 - (1 - x) ** 3, inOutCubic,
  inSine: x => 1 - Math.cos(x * PI / 2), outSine: x => Math.sin(x * PI / 2), inOutSine: x => (1 - Math.cos(PI * x)) / 2,
  outBack: outBack(1.2),
  // a small wind-up backwards, then ease out into the target with zero end velocity
  anticipate: x => inOutCubic(x) - 0.4 * Math.sin(PI * x) ** 2 * (1 - x) ** 2,
  hold: x => (x < 1 ? 0 : 1),
  inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
  // legacy names (v2 scenes): kept with their old curves
  in: x => x * x, out: x => 1 - (1 - x) * (1 - x), inOut: x => x * x * (3 - 2 * x),
  back: outBack(1.70158), step: x => (x < 1 ? 0 : 1),
};
EASE.smooth = EASE.inOutSine;   // used only where a scalar ease is needed; tracks use the spline for 'smooth'
export const ease = (name, x) => (EASE[name] || EASE.inOutSine)(clamp(x));

// ---------- deterministic hash + smooth noise ----------
export const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
/** smooth noise in about [-1, 1]: a sum of three sines, the fastest at `hz` (capped at 4.8 Hz) */
export function noise(seed, t, hz = 1) {
  const f = Math.min(hz, 4.8), h1 = hash(seed + ':a'), h2 = hash(seed + ':b'), h3 = hash(seed + ':c');
  return (Math.sin(2 * PI * (f * (0.37 + 0.1 * h1) * t + h1)) * 0.55 + Math.sin(2 * PI * (f * (0.61 + 0.12 * h2) * t + h2)) * 0.35
    + Math.sin(2 * PI * (f * t + h3)) * 0.2) / 1.1;
}
/** an attack/decay envelope over [from, to]: rises over `attack` s, decays (ease-out) to 0 at `to` */
export function envelope(t, from, to, attack = 0.08) {
  if (t < from || t >= to) return 0;
  const a = Math.min(attack, (to - from) * 0.3), up = a > 0 ? EASE.inOutSine(clamp((t - from) / a)) : 1;
  const down = 1 - EASE.inQuad(clamp((t - from - a) / Math.max(1e-6, to - from - a)));
  return up * down;
}
/** blend weight of an action over [from, to] with `blend` seconds of ease at each end */
export function blendWeight(t, from, to, blend = 0.2) {
  if (t < from || t > to) return 0;
  const b = Math.min(blend, (to - from) / 2); if (b <= 0) return 1;
  return EASE.inOutSine(clamp((t - from) / b)) * EASE.inOutSine(clamp((to - t) / b));
}

// ---------- value interpolation ----------
/** linear mix of numbers / arrays / objects; strings switch when t reaches 1 */
export function mix(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b)) return b.length >= a.length ? b.slice(0, t >= 1 ? b.length : a.length).map((v, i) => mix(a[i], v, t)) : (t >= 1 ? b : a).map((v, i) => i < b.length ? mix(a[i], b[i], t) : v);
  if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {...a}; for (const k in b) { if (k in a) o[k] = mix(a[k], b[k], t); else if (t >= 1) o[k] = b[k]; } return o; }   // a field new in b (hold.R, a message) appears at its key, not at the start of the move
  return t < 1 ? (a ?? b) : b;
}
// monotone (Fritsch–Butland) tangent at the middle of three samples: never overshoots, zero at extrema
function tangent(vm, v0, v1, tm, t0, t1) {
  if (typeof vm !== 'number' || typeof v0 !== 'number' || typeof v1 !== 'number') return 0;
  const h0 = t0 - tm, h1 = t1 - t0; if (h0 <= 0 || h1 <= 0) return 0;
  const d0 = (v0 - vm) / h0, d1 = (v1 - v0) / h1;
  if (d0 * d1 <= 0) return 0;
  return 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
}
/** cubic Hermite through (t0,v0)-(t1,v1) with neighbours vm (at tm) and vp (at tp) for the tangents; recursive over arrays/objects */
function herm(vm, v0, v1, vp, tm, t0, t1, tp, u) {
  if (typeof v0 === 'number' && typeof v1 === 'number') {
    const h = t1 - t0, m0 = tm == null ? 0 : tangent(vm, v0, v1, tm, t0, t1), m1 = tp == null ? 0 : tangent(v0, v1, vp, t0, t1, tp);
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
  }
  if (Array.isArray(v0) && Array.isArray(v1)) { const n = Math.max(v0.length, v1.length), o = [];
    for (let i = 0; i < n; i++) { if (i >= v0.length && u < 1) break; if (i >= v1.length) { if (u < 1) o.push(v0[i]); continue; } o.push(herm(vm?.[i], v0[i] ?? v1[i], v1[i], vp?.[i], tm, t0, t1, tp, u)); } return o; }   // list items new in the next key (messages) appear at that key
  if (v0 && v1 && typeof v0 === 'object' && typeof v1 === 'object') {
    const o = {...v0};
    for (const k in v1) { if (k in v0) o[k] = herm(vm?.[k], v0[k], v1[k], vp?.[k], tm, t0, t1, tp, u); else if (u >= 1) o[k] = v1[k]; }   // new fields (hold.R) appear at their key
    return o;
  }
  return u < 1 ? (v0 ?? v1) : v1;   // strings switch when the key is reached
}

/**
 * Sample a keyframe track. pts = [{t, v, ease?}] sorted by t (holds already inserted).
 * Segments without an explicit ease (or with ease 'smooth') are a monotone cubic spline: ease in at the first key,
 * ease out at the last, continuous velocity through the middle keys. A segment whose end key names an ease uses it.
 */
export function sampleTrack(pts, t) {
  if (!pts.length) return undefined;
  if (t <= pts[0].t) return pts[0].v;
  const last = pts.length - 1; if (t >= pts[last].t) return pts[last].v;
  let i = 0; while (i < last && pts[i + 1].t <= t) i++;
  const A = pts[i], B = pts[i + 1], u = clamp((t - A.t) / Math.max(1e-9, B.t - A.t));
  const explicit = e => e && e !== 'smooth';
  if (explicit(B.ease)) return mix(A.v, B.v, (EASE[B.ease] || EASE.inOutSine)(u));
  // a neighbour segment with an explicit ease is a boundary: velocity 0 there (it starts or ends at rest)
  const Pm = i > 0 && !explicit(A.ease) ? pts[i - 1] : null, Pp = i + 2 <= last && !explicit(pts[i + 2].ease) ? pts[i + 2] : null;
  return herm(Pm?.v, A.v, B.v, Pp?.v, Pm?.t, A.t, B.t, Pp?.t, u);
}

// ---------- two-bone IK (rig convention: deg 0 = straight down, +side*sin(deg) = x, cos(deg) = y) ----------
const rad = d => d * PI / 180, deg = r => r * 180 / PI;
export const fromAngle = (p, len, d, side) => [p[0] + Math.sin(rad(d)) * len * side, p[1] + Math.cos(rad(d)) * len];
/**
 * Solve a two-bone limb from `root` to `target` (same frame). bendSign +1 bends the middle joint toward larger `a`.
 * Returns {a, b} in the rig's convention (b adds to a).
 */
export function solveIK(root, target, L1, L2, side, bendSign = 1) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy); const maxD = (L1 + L2) * 0.9995, minD = Math.abs(L1 - L2) + 1e-3;
  d = clamp(d, minD, maxD);
  const line = deg(Math.atan2(dx * side, dy));
  const alpha = deg(Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)));
  const a = line + alpha * bendSign;
  const L0 = Math.hypot(dx, dy) || 1e-9, mid = fromAngle(root, L1, a, side), end = [root[0] + dx / L0 * d, root[1] + dy / L0 * d];
  const shin = deg(Math.atan2((end[0] - mid[0]) * side, end[1] - mid[1]));
  let b = shin - a; while (b > 180) b -= 360; while (b < -180) b += 360;
  return {a, b};
}

// ---------- walk: planned footsteps, eased travel, distance-driven cadence ----------
/**
 * Plan a walk of `dx` world px over [from, to]. rig = {L (leg length, local px), ...}; scale = actor scale.
 * Footsteps are planned in world space so a planted foot never slides: the first and last steps are half steps
 * (feet start and end side by side), travel accelerates over the first step and decelerates over the last, and the
 * cadence comes from the distance and the stride (`rate` and `stride` override).
 */
export function planWalk(d, rig, scale) {
  const from = d.from ?? 0, to = d.to ?? from + 2, T = Math.max(0.2, to - from), dir = Math.sign(d.dx || 0) || 1;
  let D = Math.abs(d.dx || 0);
  const inPlace = D < 1;
  const strideMul = d.stride ?? 1;
  const S = rig.L * 0.3 * scale * strideMul;                     // natural step spacing in world px (front-view rig: compact)
  let s, n1;
  if (inPlace) {   // walking on the spot (a treadmill / camera-tracked walk): a virtual distance at the given cadence
    const rate = d.rate ?? 1.6; s = S * 0.6; D = Math.max(s, 2 * rate * T * s); n1 = Math.max(1, Math.round(D / s)); s = D / n1;
  } else if (d.rate) {   // explicit cadence (cycles/s = 2 steps/s): s from v = (D + s)/T and steps/s = v/s
    s = D / Math.max(1, 2 * d.rate * T - 1); n1 = Math.max(1, Math.round(D / s)); s = D / n1;
  } else { n1 = Math.max(1, Math.round(D / S)); s = D / n1; }
  const v = (D + s) / T, tr = Math.min(T / 2, s / v);           // cruise speed and ramp time (ramp distance = s/2)
  const q = [0]; for (let k = 1; k <= n1 + 1; k++) q.push(Math.min(D, k * s));   // plants; q[n1] = q[n1+1] = D
  const mid = [0]; for (let k = 1; k < q.length; k++) mid.push((q[k] + q[k - 1]) / 2);
  return {from, to, T, D, dir, s, n: q.length - 1, v, tr, q, mid, inPlace, strideMul, lead: d.lead === 'L' ? 'L' : 'R', liftH: (d.lift ?? 42) * strideMul};
}
/** travelled distance (0..D) at shot time t */
export function walkDistance(P, t) {
  const tau = clamp(t - P.from, 0, P.T), {v, tr, T, D} = P;
  const up = x => v * (x / 2 - tr / (2 * PI) * Math.sin(PI * x / tr));          // sine velocity ramp
  if (tau <= tr) return up(tau);
  if (tau >= T - tr) return D - up(T - tau);
  return up(tr) + v * (tau - tr);
}
/**
 * Walk state at shot time t: feet positions along the travel axis relative to the body (world px), their lift, the
 * current step's phase (0 = feet spread, 0.5 = passing), spreads at the step's start and end, and speed (0..1).
 */
export function walkState(P, t) {
  const d = walkDistance(P, t), feet = {};
  const other = P.lead === 'R' ? 'L' : 'R';
  for (const F of ['L', 'R']) {
    let pos = 0, lift = 0;
    for (let k = 1; k <= P.n; k++) {
      if ((k % 2 === 1 ? P.lead : other) !== F) continue;
      const a = P.mid[k - 1], b = P.mid[k], len = b - a, st = a + len * 0.06, en = b - len * 0.06;   // a little double support
      if (d >= en) { pos = P.q[k]; continue; }
      if (d > st) { const u = (d - st) / (en - st); pos = lerp(pos, P.q[k], EASE.inOutSine(u)); lift = Math.sin(PI * u) ** 1.2; }
      break;
    }
    feet[F] = {rel: pos - d, lift};
  }
  let k = 1; while (k < P.n && d > P.mid[k]) k++;
  const a = P.mid[k - 1], b = P.mid[k], phase = b > a ? clamp((d - a) / (b - a)) : 0;
  const spreadA = k >= 2 ? P.q[k - 1] - P.q[k - 2] : 0, spreadB = P.q[k] - P.q[k - 1];
  const tau = clamp(t - P.from, 0, P.T), speed = tau <= 0 || tau >= P.T ? 0 : clamp(Math.min(tau, P.T - tau) / Math.max(1e-6, P.tr));
  return {d, feet, phase, spreadA, spreadB, speed: EASE.inOutSine(speed)};
}
