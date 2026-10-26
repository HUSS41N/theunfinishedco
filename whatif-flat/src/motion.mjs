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

// ---------- story actions (THE LAST BUS cast work): cry, jolt, stumble, sway, slam, run ----------
// Each is ACTIONS[act](d, c) with c = {tau, from, to, blend, pose, fx, id, rig, facing}. They add to the keyed pose (so keys
// still set the base pose) and may set face fields on fx.face. Every motion is smooth and under 5 Hz; one-shots ease in
// and settle with a damped (non-oscillating or ≤ 1.5 Hz) curve, so nothing pops.
const smoothstep = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
/** a smooth one-hump pulse: 0 at x ≤ 0, peaks at 1 when x = k, then decays (gamma shape) */
const hump = (x, k) => (x <= 0 ? 0 : (x / k) * Math.exp(1 - x / k));
/** FK wrist position in reach coordinates (origin on the ground under the pelvis, +x = facing), flat-rig geometry */
export function handFK(pose, rig, side) {
  const A = pose['arm' + (side < 0 ? 'L' : 'R')] || {a: 8, b: 4}, body = pose.body || {};
  const sh = [side * rig.shoulderW, -rig.torso + 30], el1 = fromAngle(sh, rig.U1 * (A.la ?? 1), A.a, side), wr = fromAngle(el1, rig.U2 * (A.lb ?? 1), A.a + A.b, side);
  const r = (body.lean || 0) * PI / 180, x = wr[0], y = wr[1] * (body.scaleY || 1);
  return [x * Math.cos(r) - y * Math.sin(r), rig.pelvisY + (body.dy || 0) + x * Math.sin(r) + y * Math.cos(r)];
}
const within = (c, d) => c.tau >= (d.from ?? d.t ?? -1e9) && c.tau < (d.to ?? 1e9);
const setFace = (c, d, f) => { if (d.face === false) return; for (const k in f) if (c.fx.face[k] === undefined) c.fx.face[k] = d[k] ?? f[k]; };

export const ACTIONS = {
  /** crying: sobs (irregular breath catches), a trembling lip and chin, a head that cannot hold still, tears that well then run.
   *  d: {from, to, amp, sob (sobs per second), tears: n | [from, to], well (s), eyes, brows, mouth, face: false} */
  cry(d, c) {
    const from = d.from ?? 0, to = d.to ?? from + 4, w = blendWeight(c.tau, from, to, d.blend ?? 0.6), amp = d.amp ?? 1, lt = c.tau - from;
    if (d.tears !== undefined && c.tau >= from) {   // tears persist after the action (they do not un-cry)
      const [t0, t1] = Array.isArray(d.tears) ? d.tears : [0, d.tears];
      c.fx.face.tears = lerp(t0, t1, smoothstep(lt / (d.well ?? Math.min(3, (to - from) * 0.6))));
    }
    if (!w) return;
    const rate = d.sob ?? 0.45; let p = 0;
    for (let k = Math.max(0, Math.floor(lt * rate) - 2); k <= lt * rate + 1; k++) { const ts = (k + 0.15 + 0.5 * hash(c.id + 'sob' + k)) / rate; p += hump(lt - ts, 0.13) * (0.6 + 0.4 * hash(c.id + 'sa' + k)); }
    const P = c.pose;
    P.body.scaleY = (P.body.scaleY ?? 1) * (1 + 0.016 * p * w * amp);
    P.body.bend = (P.body.bend || 0) + (2 + 2 * p) * w * amp;
    P.head.dy = (P.head.dy || 0) + (4 + 3 * p) * w * amp;
    P.head.tilt = (P.head.tilt || 0) + (1.4 * noise(c.id + 'ct', c.tau, 0.7) + 0.5 * noise(c.id + 'cq', c.tau, 4.2)) * w * amp;
    for (const k of ['armL', 'armR']) if (P[k] && !P[k].reach) P[k].a -= 2.5 * p * w * amp;   // the shoulders draw in on a sob
    c.fx.face.quiver = Math.max(c.fx.face.quiver || 0, w * amp * (0.55 + 0.45 * Math.min(1, p)));
    if (within(c, d)) setFace(c, d, {eyes: 'glassy', brows: 'grief', mouth: 'quiver'});
  },
  /** jolt awake: a two-frame snap upright (head up, shoulders back, hands flinch), then a slow settle. d: {t, amp, hold, face: false} */
  jolt(d, c) {
    const t0 = d.t ?? d.from ?? 0, x = c.tau - t0; if (x < -0.01 || x > 3) return;
    const amp = d.amp ?? 1, j = (x < 0.09 ? EASE.outCubic(clamp(x / 0.09)) : Math.exp(-(x - 0.09) / 0.45)) * amp, P = c.pose;
    P.body.dy = (P.body.dy || 0) - 10 * j; P.body.bend = (P.body.bend || 0) - 5 * j; P.body.scaleY = (P.body.scaleY ?? 1) * (1 + 0.02 * j);
    P.head.dy = (P.head.dy || 0) - 9 * j; P.head.tilt = (P.head.tilt || 0) - 5 * j * Math.sign(P.head.tilt || 1);
    for (const k of ['armL', 'armR']) if (P[k] && !P[k].reach) { P[k].a += 12 * j; P[k].b -= 22 * j; }
    if (x >= 0 && x < (d.hold ?? 1.1)) setFace(c, d, {eyes: 'shock', brows: 'shock', mouth: 'part'});
  },
  /** stumble when the bus brakes: lurch toward `dir` (+1 = the way the actor faces), a catching step, arms fling, recover.
   *  d: {t, dist (px, persists), dir, amp, face: false} */
  stumble(d, c) {
    const t0 = d.t ?? d.from ?? 0, x = c.tau - t0; if (x < 0) return;
    const amp = d.amp ?? 1, s = d.dir ?? 1, P = c.pose;
    c.fx.dx += (d.dist ?? 60) * s * c.facing * EASE.outCubic(clamp(x / 0.6));
    if (x > 2.5) return;
    const p = (hump(x, 0.2) - 0.35 * hump(x - 0.45, 0.22)) * amp;
    P.body.lean = (P.body.lean || 0) + 13 * p * s; P.body.bend = (P.body.bend || 0) + 6 * p * s;
    P.head.tilt = (P.head.tilt || 0) - 6 * hump(x - 0.06, 0.22) * s * amp;   // the head lags behind the lurch
    // both arms fling the way the body falls (front rig: +a swings the right arm toward +x, the left arm toward −x)
    for (const k of ['armL', 'armR']) if (P[k] && !P[k].reach) { const sd = k === 'armR' ? 1 : -1, h = hump(x - 0.04, 0.24) * amp; P[k].a += (sd * s > 0 ? 62 : -34) * h; P[k].b += (sd * s > 0 ? 18 : -40) * hump(x - 0.08, 0.24) * amp; }
    const lead = s > 0 ? 'legR' : 'legL', step = Math.sin(PI * clamp((x - 0.04) / 0.42)) * amp;   // the catching step lifts and lands
    if (P[lead]) { P[lead].a += 14 * step; P[lead].b -= 26 * step * (lead === 'legR' ? 1 : -1); }   // (the knee bends forward: b < 0 on the right leg, > 0 on the left)
    if (x < 0.9) setFace(c, d, {eyes: 'wide', brows: 'up', mouth: 'part'});
  },
  /** standing on a moving bus: a slow lean that drifts with the road, the head keeping level. A reached hand (grab bar) stays put.
   *  d: {from, to, amp (deg), rate (Hz)} */
  sway(d, c) {
    const w = blendWeight(c.tau, d.from ?? -1e9, d.to ?? 1e9, d.blend ?? 0.6); if (!w) return;
    const amp = d.amp ?? 3, rate = Math.min(d.rate ?? 0.35, 1.5), P = c.pose, n = noise(c.id + 'sway', c.tau, rate);
    P.body.lean = (P.body.lean || 0) + amp * n * w;
    P.head.tilt = (P.head.tilt || 0) - amp * 0.7 * noise(c.id + 'sway', c.tau - 0.18, rate) * w;   // the head lags and counters
    for (const k of ['armL', 'armR']) if (P[k] && !P[k].reach) P[k].a += amp * 0.9 * noise(c.id + 'sway', c.tau - 0.25, rate) * w * (k === 'armL' ? -1 : 1);
  },
  /** slam a hand on a partition: wind up, strike fast into `target` (reach coords), hold, release. d: {t, arm, target, windup, to, release} */
  slam(d, c) {
    const tI = d.t ?? d.from ?? 0, wu = d.windup ?? 0.32, start = tI - wu, end = d.to ?? tI + 0.8, rel = d.release ?? 0.45;
    if (c.tau < start || c.tau > end + rel || !d.target) return;
    const F = d.arm || 'R', side = F === 'L' ? -1 : 1, k = 'arm' + F, P = c.pose, home = handFK(P, c.rig, side), tg = d.target;
    const wind = [lerp(home[0], tg[0], 0.15) - 10, Math.min(home[1], tg[1]) - 70];
    let p, imp = 0;
    if (c.tau < tI) { const u = (c.tau - start) / wu; p = u < 0.62 ? [lerp(home[0], wind[0], EASE.inOutSine(u / 0.62)), lerp(home[1], wind[1], EASE.inOutSine(u / 0.62))] : [lerp(wind[0], tg[0], EASE.inQuad((u - 0.62) / 0.38)), lerp(wind[1], tg[1], EASE.inQuad((u - 0.62) / 0.38))]; }
    else if (c.tau < end) { const x = c.tau - tI; imp = hump(x, 0.08); p = [tg[0] - 5 * imp, tg[1]]; }
    else { const u = EASE.inOutSine((c.tau - end) / rel); p = [lerp(tg[0], home[0], u), lerp(tg[1], home[1], u)]; }
    P[k] = {...P[k], reach: p};
    P.body.lean = (P.body.lean || 0) + 4 * hump(c.tau - tI + 0.1, 0.12);
    P.head.tilt = (P.head.tilt || 0) + 3 * imp;
  },
  /** a running cycle (front 3/4 rig): pumping bent arms, high knees, a bob twice per stride, travel `dx` world px.
   *  d: {from, to, dx, rate (strides/s, ≤ 2.2), lean} */
  run(d, c) {
    const from = d.from ?? 0, to = d.to ?? from + 1.5, T = Math.max(0.1, to - from), x = clamp((c.tau - from) / T);
    const ramp = Math.min(0.2, T / 4), tt = clamp(c.tau - from, 0, T);
    // eased travel: accelerate over `ramp`, cruise, decelerate (distance-continuous)
    const v = 1 / (T - ramp), dist = tt < ramp ? v * tt * tt / (2 * ramp) : tt > T - ramp ? 1 - v * (T - tt) ** 2 / (2 * ramp) : v * (tt - ramp / 2);
    c.fx.dx += (d.dx || 0) * clamp(dist);
    if (c.tau < from || c.tau > to) return;
    const w = blendWeight(c.tau, from, to, d.blend ?? 0.15), f = Math.min(d.rate ?? 1.7, 2.2), ph = 2 * PI * f * (c.tau - from);
    const s = Math.sin(ph), co = Math.cos(ph), P = c.pose, R = {
      body: {...P.body, dy: (P.body.dy || 0) - 8 - 10 * Math.abs(co), lean: (P.body.lean || 0) + (d.lean ?? 9), bend: (P.body.bend || 0) + 4},
      head: {...P.head, tilt: (P.head.tilt || 0) - 3},
      legL: {...P.legL, a: 4 - s * 26, b: 14 + 58 * Math.max(0, co), la: 1, lb: 1, reach: undefined}, legR: {...P.legR, a: 4 - s * 26, b: (14 + 58 * Math.max(0, -co)) * -1, la: 1, lb: 1, reach: undefined},
      armL: {...P.armL, a: 16 + s * 30, b: -84, reach: undefined}, armR: {...P.armR, a: 16 + s * 30, b: -84, reach: undefined}};
    for (const k of ['body', 'head', 'legL', 'legR', 'armL', 'armR']) c.pose[k] = mix(P[k], R[k], w);
  },
};
/** the slow, rare blink of a still (uncanny) figure: every 7–10 s, half a second long */
export function stillBlink(seed, t) { const per = 7 + hash(seed + 'sb') * 3, ph = ((t + per * hash(seed + 'sp')) % per + per) % per, dur = 0.55; return ph < dur ? Math.sin(PI * ph / dur) ** 1.5 : 0; }
