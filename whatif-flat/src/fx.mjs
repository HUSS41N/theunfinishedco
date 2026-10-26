// Light, grade and atmosphere (owner: world). Everything here is deterministic in (shot, t): no per-frame randomness, and
// every oscillation stays under 6 Hz (the video is 24 fps), so nothing aliases into jitter.
//
// Shot fields (docs/SCENE-FORMAT.md, "Light and atmosphere"):
//   grade:  "night" | {preset, amount, keys:[{t, amount}], …overrides}       colour grade on the rasterised world (pixels)
//   lights: [{type: flicker|sweep|headlights|glow|vignette|flash, …}]          light events
//   atmos:  [{type: fog|rain|dust, …}]                                         atmosphere
//   speed:  m/s or [{t, v}]                                                    how fast the bus/road moves (window exteriors, sweeps, fog drift)
//
// The frame is split in two when a shot has a grade (render.mjs):
//   graded  = the world (sets, actors, props, atmosphere, tube dimming) + graded screen fx (rain in the air, front fog)
//   post    = light that is ADDED after the grade (world-space glows, sweeps, tube halos, dust) + screen fx (headlights,
//             vignette) + bubbles, captions and overlays (so captions stay white and the candle stays candle-yellow)
// Without a grade the same layers are drawn in one document in the same order, so nothing changes for old scenes.
//
// Runs in the browser too (no Node imports).
import {el, g, rect, path, circle, ellipse, poly, rad, lin, id, tr, mixHex, darken, lighten, GUARD} from './svg.mjs';
import {clamp, lerp, hash, noise, sampleTrack} from './motion.mjs';

const MPX = 470;   // px per metre at actor scale 1 (props.mjs M; kept local to avoid an import cycle)
const NI = {ink: false};
const sstep = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
/** a soft box pulse: 0 outside [a, b], 1 inside, `r` s ramps */
const box = (t, a, b, r = 0.02) => Math.min(sstep((t - a + r) / (2 * r)), sstep((b - t + r) / (2 * r)));
const asList = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const num = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
/** a field that may be a number or keys [{t, v}] (spline) */
function keyed(v, t, d = 0) {
  if (Array.isArray(v)) { if (!v.length) return d; const pts = v.map(k => ({t: k.t ?? 0, v: k.v ?? k.amount ?? k.value ?? d, ease: k.ease})).sort((a, b) => a.t - b.t); return t <= pts[0].t ? pts[0].v : sampleTrack(pts, t); }
  return num(v, d);
}
const within = (o, t) => t >= (o.from ?? -1e9) && t < (o.to ?? 1e9);
/** a fade weight for an event with from/to and an optional `fade` (s) */
const eventW = (o, t, f = 0.25) => { const a = o.from ?? -1e9, b = o.to ?? 1e9, fd = o.fade ?? f; return a < -1e8 && b > 1e8 ? 1 : box(t, a, b, Math.max(0.001, fd / 2)); };

// ======================================================================================================================
// TRAVEL: how far the bus has gone (metres) at shot time t. Continuous across shots that share a speed: d(0) = start × v0.
// ======================================================================================================================
export function travel(shot, lt) {
  const sp = shot.speed ?? 0;
  const v0 = keyed(sp, 0, 0), base = shot.travel ?? (shot.start || 0) * v0;
  if (!Array.isArray(sp)) return {d: base + v0 * lt, v: v0};
  let d = base; const dt = 1 / 96;   // integrate the keyed speed (deterministic, cheap)
  for (let u = 0; u < lt; u += dt) d += keyed(sp, u + Math.min(dt, lt - u) / 2, 0) * Math.min(dt, lt - u);
  return {d, v: keyed(sp, lt, 0)};
}

// ======================================================================================================================
// FLICKER: fluorescent tubes. level 1 = fully lit, 0 = off. Irregular dips, never above ~6 Hz sustained.
// ======================================================================================================================
const EVC = new Map();
function flickerEvents(seed, from, to, rate, depth) {
  const key = [seed, from, to, rate, depth].join('|'); if (EVC.has(key)) return EVC.get(key);
  const ev = []; let t = from + 0.12 + hash(seed + 'o') * 0.6 / rate, i = 0;
  while (t < to && i < 2000) {
    const dur = 0.045 + 0.14 * hash(seed + 'd' + i) ** 1.5, dp = depth * (0.5 + 0.5 * hash(seed + 'p' + i));
    ev.push([t, t + dur, dp]);
    if (hash(seed + 'x' + i) < 0.32) {   // a double blink (the tube catching again)
      const t2 = t + dur + 0.085 + 0.1 * hash(seed + 'g' + i), d2 = 0.04 + 0.06 * hash(seed + 'e' + i);
      ev.push([t2, t2 + d2, dp * (0.6 + 0.4 * hash(seed + 'q' + i))]); t = t2 + d2;
    } else t += dur;
    t += Math.max(0.22, -Math.log(1 - 0.98 * hash(seed + 'r' + i)) / rate); i++;
  }
  EVC.set(key, ev); return ev;
}
/** level of one flicker light at t (shot time) */
export function flickerLevel(f, t, seedBase = 'fl') {
  const from = f.from ?? 0, to = f.to ?? 1e4, seed = `${seedBase}:${f.seed ?? ''}`, ramp = 0.018;
  const pattern = f.pattern || 'random', depth = clamp(f.depth ?? 0.85), rate = clamp(f.rate ?? 1.3, 0.1, 4);
  if (pattern === 'off') return 1 - depth * box(t, from, to, f.fade ?? 0.03);
  if (pattern === 'stutterOn' || pattern === 'stutterOff') {   // lights catching (or dying): off → blip, blip, blip → on
    const S = [[0, 0.07], [0.16, 0.06], [0.34, 0.05], [0.44, 0.12]], on = pattern === 'stutterOn';
    let lit = 0; for (const [a, d] of S) lit = Math.max(lit, box(t, from + a, from + a + d, ramp));
    const after = sstep((t - from - 0.62) / 0.06);
    const v = on ? Math.max(lit * 0.9, after) : (t < from ? 1 : Math.max(lit * 0.9 * (1 - after), 0));
    const base = on ? (t < from ? 1 - depth : 1 - depth * (1 - v)) : 1 - depth * (1 - v);
    return clamp(base);
  }
  if (t < from - 0.1 || t > to + 0.3) return 1;
  let dip = 0;
  for (const [a, b, d] of flickerEvents(seed, from, to, rate, depth)) { if (a > t + 0.1) break; if (b < t - 0.1) continue; dip = Math.max(dip, d * box(t, a, b, ramp)); }
  const lv = 1 - dip;
  return pattern === 'dying' ? clamp(1 - depth + depth * Math.min(1, dip / Math.max(0.01, depth * 0.5))) : lv;   // dying: mostly off, brief blips of light
}
/** every light level for a shot at t: all = the room (every flicker without `tube`), tube(i) = one tube */
export function lightLevels(shot, t) {
  const fl = asList(shot.lights).filter(l => l && l.type === 'flicker');
  let all = 1; const per = new Map();
  fl.forEach((f, i) => { const v = flickerLevel(f, t, `s${shot._i ?? 0}:${i}`);
    if (f.tube === undefined || f.tube === null) all = Math.min(all, v); else for (const k of asList(f.tube)) per.set(k, Math.min(per.get(k) ?? 1, v)); });
  return {all, tube: i => Math.min(all, per.get(i) ?? 1), dimOne: fl.filter(f => f.tube !== undefined && f.tube !== null).length > 0};
}

// ======================================================================================================================
// GRADE: a per-pixel colour transform on the rasterised world (RGBA, premultiplied, opaque).
//   out = lift + (1 − lift) · gamma(contrast(gain · exposure · sat(rgb)) + split-tone)
//   warm light (candle, bulbs, sodium) is protected: `protect` keeps saturated warm pixels close to their own colour.
// ======================================================================================================================
export const GRADES = {
  night:  {exposure: 0.7, sat: 0.72, gain: [0.80, 0.95, 1.12], lift: [0.012, 0.02, 0.036], gamma: 1.22, contrast: 1.18, pivot: 0.3, shadow: [-0.01, 0.01, 0.03], high: [0, 0.01, 0.02], protect: 0.75},
  // inside the bus: the same night, but the yellowed tubes read warm and a little sick (teal shadows, sallow highlights)
  bus:    {exposure: 0.74, sat: 0.82, gain: [1.0, 0.98, 0.86], lift: [0.016, 0.022, 0.03], gamma: 1.18, contrast: 1.14, pivot: 0.3, shadow: [-0.012, 0.012, 0.022], high: [0.03, 0.028, -0.025], protect: 0.75},
  tunnel: {exposure: 0.6, sat: 0.7, gain: [1.18, 0.86, 0.58], lift: [0.02, 0.014, 0.01], gamma: 1.3, contrast: 1.12, pivot: 0.28, shadow: [0.01, 0, -0.01], high: [0.05, 0.02, -0.03], protect: 0.6},
  dawn:   {exposure: 0.95, sat: 0.8, gain: [1.06, 0.97, 0.94], lift: [0.05, 0.035, 0.075], gamma: 1.04, contrast: 0.96, pivot: 0.45, shadow: [0.02, 0, 0.05], high: [0.05, 0.025, -0.03], protect: 0.4},
  memory: {exposure: 1.02, sat: 0.42, gain: [1.08, 1.0, 0.84], lift: [0.07, 0.055, 0.04], gamma: 0.96, contrast: 0.86, pivot: 0.5, shadow: [0.02, 0.01, -0.01], high: [0.03, 0.02, -0.02], protect: 0.2, bloom: 0.35},
  crash:  {exposure: 1.12, sat: 1.15, gain: [1.22, 0.86, 0.84], lift: [0, 0, 0], gamma: 1.1, contrast: 1.65, pivot: 0.42, shadow: [0.02, -0.01, -0.01], high: [0.06, 0.04, 0.04], protect: 0, bloom: 0.55},
  day:    {exposure: 1, sat: 1, gain: [1, 1, 1], lift: [0, 0, 0], gamma: 1, contrast: 1, pivot: 0.5, shadow: [0, 0, 0], high: [0, 0, 0], protect: 0},
};
/** the grade for a shot at shot time t → params (with amount) or null */
/** the vignette amount a graded shot applies in its pixel pass (0 = none) */
export function vignetteAt(shot) { const v = asList(shot?.lights).filter(l => l?.type === 'vignette').map(l => clamp(l.amount ?? 0.45)); return v.length ? Math.max(...v) : 0; }
export function gradeAt(shot, t) {
  if (!shot || !shot.grade) return null;
  const G0 = typeof shot.grade === 'string' ? {preset: shot.grade} : shot.grade;
  // a set may ask for its own variant of a grade (oldBus: info.gradeAs {night: 'bus'}: warm inside, the night outside stays cold)
  const as = shot._set?.info?.gradeAs?.[G0.preset || 'night'], G = as && GRADES[as] ? {...G0, preset: as} : G0;
  const base = GRADES[G.preset || 'night']; if (!base) return null;
  const amount = clamp(G.keys ? keyed(G.keys.map(k => ({t: k.t, v: k.amount ?? k.v})), t, G.amount ?? 1) : (G.amount ?? 1));
  if (amount <= 0.001) return null;
  return {...base, ...Object.fromEntries(Object.entries(G).filter(([k]) => k in base)), amount, preset: G.preset || 'night'};
}
const GC = new Map();
/** cached tables for one grade (rounded amount, so a keyed amount re-uses tables) */
function gradeTables(P) {
  const a = Math.round(P.amount * 50) / 50, key = JSON.stringify({...P, amount: a}); if (GC.has(key)) return GC.get(key);
  const mixv = (v, id1) => lerp(id1, v, a), gain = P.gain.map(v => mixv(v, 1) * mixv(P.exposure, 1)), lift = P.lift.map(v => v * a);
  const sat = mixv(P.sat, 1), con = mixv(P.contrast, 1), gam = mixv(P.gamma, 1), piv = P.pivot;
  // 1D tables, index = value × 1023 (input 0..~1.6 clamped): contrast about the pivot then gamma, per channel
  const N = 1024, curve = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = i / (N - 1) * 1.6; let y = (x - piv) * con + piv; y = Math.max(0, y); y = Math.pow(Math.min(1.6, y), gam); curve[i] = y; }
  const T = {a, gain, lift, sat, curve, N, shadow: P.shadow.map(v => v * a), high: P.high.map(v => v * a), protect: P.protect * a, bloom: (P.bloom || 0) * a};
  if (GC.size > 24) GC.delete(GC.keys().next().value);
  GC.set(key, T); return T;
}
/** the graded colour of one pixel (0..255 in) → packed 0xRRGGBB */
function gradeOne(T, r8, g8, b8) {
  const {gain, lift, sat, curve, N, shadow, high, protect} = T, k = (N - 1) / 1.6;
  const r = r8 / 255, gg = g8 / 255, b = b8 / 255, Y = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
  let R = (Y + (r - Y) * sat) * gain[0], G = (Y + (gg - Y) * sat) * gain[1], B = (Y + (b - Y) * sat) * gain[2];
  R = R < 0 ? 0 : R > 1.6 ? 1.6 : R; G = G < 0 ? 0 : G > 1.6 ? 1.6 : G; B = B < 0 ? 0 : B > 1.6 ? 1.6 : B;
  R = curve[(R * k) | 0]; G = curve[(G * k) | 0]; B = curve[(B * k) | 0];
  const sh = (1 - Y) * (1 - Y), hi = Y * Y;
  R += shadow[0] * sh + high[0] * hi; G += shadow[1] * sh + high[1] * hi; B += shadow[2] * sh + high[2] * hi;
  R = lift[0] + R * (1 - lift[0]); G = lift[1] + G * (1 - lift[1]); B = lift[2] + B * (1 - lift[2]);
  if (protect > 0) {   // emissive pixels (lamps, bulbs, flames, lit windows) keep their own colour; warm ones more than cold
    const mx = r > gg ? (r > b ? r : b) : (gg > b ? gg : b);
    let hot = (mx - 0.62) * 3.4; hot = hot < 0 ? 0 : hot > 1 ? 1 : hot;
    let wv = (r - b) * 2.5 + 0.35; wv = wv < 0 ? 0 : wv > 1 ? 1 : wv;
    const q = protect * hot * wv;
    if (q > 0) { R += (r * 0.96 - R) * q; G += (gg * 0.9 - G) * q; B += (b * 0.85 - B) * q; }
  }
  const c = v => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0);
  return (c(R) << 16) | (c(G) << 8) | c(B);
}
const VIG = new Map();
/** a cached screen vignette mask (multiplier per pixel) */
function vignetteMask(w, h, amt) {
  const key = `${w}x${h}:${amt.toFixed(3)}`; if (VIG.has(key)) return VIG.get(key);
  const m = new Float32Array(w * h), cx = w / 2, cy = h / 2, R = Math.hypot(w, h) * 0.56;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R, u = d < 0.42 ? 0 : d < 0.75 ? (d - 0.42) / 0.33 * 0.55 : 0.55 + (Math.min(1, d) - 0.75) / 0.25 * 0.45; m[y * w + x] = 1 - amt * u; }
  if (VIG.size > 6) VIG.delete(VIG.keys().next().value); VIG.set(key, m); return m;
}
/** grade an opaque RGBA buffer in place. Flat art repeats colours, so results are memoised per grade (a 2^20 hash).
 *  opts.vignette (0..1): a screen vignette multiplied in the same pass (replaces the SVG one on graded shots). */
export function applyGrade(px, w, h, P, opts = {}) {
  if (!P) return px;
  const T = gradeTables(P);
  if (!T.memoK) { T.memoK = new Int32Array(1 << 20).fill(-1); T.memoV = new Int32Array(1 << 20); }
  const K = T.memoK, V = T.memoV, n = px.length, vm = opts.vignette ? vignetteMask(w, h, opts.vignette) : null;
  for (let i = 0, p = 0; i < n; i += 4, p++) {
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2], hk = ((key * 2654435761) >>> 12) & 0xFFFFF;
    let v; if (K[hk] === key) v = V[hk]; else { v = gradeOne(T, px[i], px[i + 1], px[i + 2]); K[hk] = key; V[hk] = v; }
    if (vm) { const m = vm[p]; px[i] = ((v >> 16) & 255) * m; px[i + 1] = ((v >> 8) & 255) * m; px[i + 2] = (v & 255) * m; }
    else { px[i] = (v >> 16) & 255; px[i + 1] = (v >> 8) & 255; px[i + 2] = v & 255; }
  }
  if (T.bloom > 0) bloom(px, w, h, T.bloom);
  return px;
}
/** cheap bloom: 1/8-res bright pass, box-blurred 3×, added back (screen blend) */
function bloom(px, w, h, k) {
  const s = 8, bw = Math.ceil(w / s), bh = Math.ceil(h / s), B = new Float32Array(bw * bh * 3);
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4, Y = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255, m = Math.max(0, Y - 0.55) / 0.45;
    if (m <= 0) continue; const o = ((y / s | 0) * bw + (x / s | 0)) * 3; B[o] += px[i] * m; B[o + 1] += px[i + 1] * m; B[o + 2] += px[i + 2] * m; }
  const norm = 4 / (s * s);
  for (let i = 0; i < B.length; i++) B[i] *= norm;
  const tmp = new Float32Array(B.length), r = 3;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) for (let c = 0; c < 3; c++) { let acc = 0, n = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx < 0 || xx >= bw) continue; acc += B[(y * bw + xx) * 3 + c]; n++; } tmp[(y * bw + x) * 3 + c] = acc / n; }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) for (let c = 0; c < 3; c++) { let acc = 0, n = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy < 0 || yy >= bh) continue; acc += tmp[(yy * bw + x) * 3 + c]; n++; } B[(y * bw + x) * 3 + c] = acc / n; }
  }
  for (let y = 0; y < h; y++) { const fy = Math.min(bh - 1.001, Math.max(0, y / s - 0.5)), y0 = fy | 0, ty = fy - y0;
    for (let x = 0; x < w; x++) { const fx = Math.min(bw - 1.001, Math.max(0, x / s - 0.5)), x0 = fx | 0, tx = fx - x0, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) { const a00 = B[(y0 * bw + x0) * 3 + c], a10 = B[(y0 * bw + x0 + 1) * 3 + c], a01 = B[((y0 + 1) * bw + x0) * 3 + c], a11 = B[((y0 + 1) * bw + x0 + 1) * 3 + c];
        const v = ((a00 * (1 - tx) + a10 * tx) * (1 - ty) + (a01 * (1 - tx) + a11 * tx) * ty) * k * 2.2, p = px[i + c]; px[i + c] = Math.min(255, p + v * (1 - p / 255)); } } }
}
/** premultiplied `top` over opaque `dst`, in place */
export function compositeOver(dst, top) {
  for (let i = 0; i < dst.length; i += 4) { const a = top[i + 3]; if (!a) continue; if (a === 255) { dst[i] = top[i]; dst[i + 1] = top[i + 1]; dst[i + 2] = top[i + 2]; continue; }
    const k = 1 - a / 255; dst[i] = top[i] + dst[i] * k; dst[i + 1] = top[i + 1] + dst[i + 1] * k; dst[i + 2] = top[i + 2] + dst[i + 2] * k; }
  return dst;
}

// ======================================================================================================================
// FRAME CONTEXT: what sets' live layers and the fx layers see at one frame
// ======================================================================================================================
/** ctx for one shot frame: t (shot time), T (film time), d/v (travel, m and m/s), lv (light levels), cam, view (world
 *  rect on screen, padded), info (the set's info: windows, tubes, exterior mapping), W, H */
export function fxFrame(C, shot, lt, cam) {
  const tv = travel(shot, lt), z = Math.max(0.05, cam.zoom), hw = C.W / 2 / z, hh = C.H / 2 / z, pad = 1.25;
  return {t: lt, T: (shot.start || 0) + lt, d: tv.d, v: tv.v, lv: lightLevels(shot, lt), cam, W: C.W, H: C.H, shot, info: shot._set?.info || {}, graded: !!(C.pixelGrade && gradeAt(shot, lt)),
    view: [cam.x - hw * pad, cam.y - hh * pad, cam.x + hw * pad, cam.y + hh * pad], style: C.style};
}
/** an ellipse/rect filled with a soft elliptical radial gradient (objectBoundingBox: cheap, no transforms) */
export function softBlob(cx, cy, rx, ry, color, k, stops = null) {
  const gid = id('sb'), st = stops || [[0, k], [0.45, k * 0.55], [1, 0]];
  return el('defs', {}, el('radialGradient', {id: gid}, st.map(([o, a]) => el('stop', {offset: o, 'stop-color': color, 'stop-opacity': +a.toFixed(4)})))) + ellipse(cx, cy, rx, ry, `url(#${gid})`, NI);
}
/** the same soft elliptical blob, drawn only inside `rects` ([[x,y,w,h]]: window holes): a userSpace radial gradient
 *  stretched to the ellipse, filled into each visible rect. Cuts the fill area to what can actually be seen. */
export function softBlobIn(rects, cx, cy, rx, ry, color, k, stops = null) {
  const hit = rects.filter(([x, y, w, h]) => x < cx + rx && x + w > cx - rx && y < cy + ry && y + h > cy - ry); if (!hit.length) return '';
  const gid = id('sbi'), st = stops || [[0, k], [0.45, k * 0.55], [1, 0]];
  return el('defs', {}, el('radialGradient', {id: gid, cx: 0, cy: 0, r: 1, gradientUnits: 'userSpaceOnUse', gradientTransform: `translate(${+cx.toFixed(1)} ${+cy.toFixed(1)}) scale(${+rx.toFixed(1)} ${+ry.toFixed(1)})`}, st.map(([o, a]) => el('stop', {offset: o, 'stop-color': color, 'stop-opacity': +a.toFixed(4)}))))
    + hit.map(([x, y, w, h]) => { const xa = Math.max(x, cx - rx), xb = Math.min(x + w, cx + rx), ya = Math.max(y, cy - ry), yb = Math.min(y + h, cy + ry); return rect(+xa.toFixed(1), +ya.toFixed(1), +(xb - xa).toFixed(1), +(yb - ya).toFixed(1), `url(#${gid})`, NI); }).join('');
}
/** a horizontal soft band (linear gradient across x with soft ends) */
function softBand(x0, y0, x1, y1, color, k, vertical = false) {
  const gid = id('bd'), mid = vertical ? [x0, (y0 + y1) / 2] : [(x0 + x1) / 2, y0];
  return el('defs', {}, el('linearGradient', {id: gid, x1: vertical ? 0 : 0, y1: vertical ? 0 : 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0}, [[0, 0], [0.5, k], [1, 0]].map(([o, a]) => el('stop', {offset: o, 'stop-color': color, 'stop-opacity': +a.toFixed(4)})))) + rect(x0, y0, x1 - x0, y1 - y0, `url(#${gid})`, NI) + (mid ? '' : '');
}
const SODIUM = '#FFA94D', TUBE = '#E8F4FF', CANDLE = '#FFC65A';
export const LIGHT = {SODIUM, TUBE, CANDLE};
/** lamp spacing on the road, metres (the exterior and the sweeps share it, so a band passes when a lamp passes) */
export const LAMP_SPACING = 34;
/** road position (m) of lamp i (deterministic jitter) */
export const lampAt = i => i * LAMP_SPACING + (hash('lamp' + i) - 0.5) * 3;
/** is lamp i dead (fog roads: every few lamps are out) */
export const lampDead = i => hash('lampdead' + i) < 0.12;

// ---------- atmosphere ----------
export function fogLayer(ctx, o, depth, j, region) {
  const [vx0, vy0, vx1, vy1] = ctx.view, [rx0, ry0, rx1, ry1] = region;
  const x0 = Math.max(vx0, rx0) - 300, x1 = Math.min(vx1, rx1) + 300; if (x1 <= x0 || ry1 <= ry0) return '';
  const col = o.color || '#9AABC2', dens = clamp(o.density ?? 0.5) * (o.k ?? 1), ext = ctx.info.ext || {}, kpx = ext.k || 190;
  const drift = (o.drift ?? 0.5) * MPX * 0.35 * depth * ctx.t + (o.where === 'outside' || o.travel ? ctx.d * kpx * depth * (ext.dir ?? 1) : 0);
  const span = 1500 * (0.7 + depth * 0.6), out = [], cy = (ry0 + ry1) / 2, hh = (ry1 - ry0) / 2;
  const px = (ctx.cam.x - (ext.viewX ?? ctx.W / 2)) * (1 - depth) * 0.6;   // parallax with the camera
  const iA = Math.floor((x0 - drift - px - span) / span), iB = Math.ceil((x1 - drift - px + span) / span);
  for (let i = iA; i <= iB; i++) for (let m = 0; m < 1; m++) {
    const s = `fog${j}:${i}:${m}`, x = i * span + hash(s) * span * 0.3 + drift + px, y = cy + (hash(s + 'y') - 0.5) * hh * 1.2;
    const rx = span * (0.62 + hash(s + 'w') * 0.3), ry = hh * (0.45 + hash(s + 'h') * 0.45) + 60, a = dens * (0.34 + 0.3 * hash(s + 'a')) * (0.85 + 0.15 * Math.sin(ctx.t * 0.4 + i));
    if (x + rx < x0 || x - rx > x1) continue;
    out.push(o.rects ? softBlobIn(o.rects, x, y, rx, ry, col, a) : softBlob(x, y, rx, ry, col, a));
  }
  return out.join('');
}
function fogAll(ctx, o, where) {
  const info = ctx.info, ext = info.ext;
  if (where === 'outside') { if (!ext) return ''; const r = [ctx.view[0], ext.y0 ?? 0, ctx.view[2], ext.y1 ?? 1000];
    return [0.4, 1.1].map((d, j) => fogLayer(ctx, {...o, where: 'outside'}, d, 'o' + j, r)).join(''); }
  const y = o.y ?? (info.horizon ?? (info.floorY ?? 1500) - 300), h = o.h ?? 900, r = [ctx.view[0], y - h / 2, ctx.view[2], y + h / 2];
  if (where === 'far') return [0.3, 0.6].map((d, j) => fogLayer(ctx, o, d, 'f' + j, r)).join('');
  return fogLayer(ctx, {...o, k: (o.k ?? 1) * 0.6}, 1.3, 'n', [r[0], r[1] + h * 0.3, r[2], r[3] + h * 0.4]);
}
function rainGlass(ctx, o) {
  const ext = ctx.info.ext; if (!ext) return '';
  const [vx0, , vx1] = ctx.view, y0 = ext.y0, y1 = ext.y1, dens = clamp(o.density ?? 0.5), out = [], col = o.color || '#C9DCEF';
  const ang = (o.angle ?? (ctx.v > 0.5 ? 28 : 8)) * (ext.dir ?? 1) * Math.PI / 180, sp = (o.speed ?? 900), L = 70 + 40 * dens;
  const cell = 64 / (0.4 + dens);   // streaks: diagonal, fast, outside the glass
  for (let x = Math.floor(vx0 / cell) * cell; x < vx1; x += cell) for (let k = 0; k < 2; k++) {
    const s = `rg${Math.round(x / cell)}:${k}`, ph = hash(s), yy = y0 + (((ctx.t * sp * (0.8 + 0.4 * hash(s + 'v')) + ph * (y1 - y0 + L)) % (y1 - y0 + L)) + (y1 - y0 + L)) % (y1 - y0 + L) - L;
    const xx = x + hash(s + 'x') * cell, dx = Math.sin(ang) * L, dy = Math.cos(ang) * L;
    out.push(path(`M${(xx).toFixed(1)} ${yy.toFixed(1)} L${(xx + dx).toFixed(1)} ${(yy + dy).toFixed(1)}`, 'none', {stroke: col, 'stroke-width': 2.2, 'stroke-opacity': 0.32, 'stroke-linecap': 'round'}));
  }
  const dcell = 46 / (0.35 + dens);   // droplets: beads that sit, then slide
  for (let x = Math.floor(vx0 / dcell) * dcell; x < vx1; x += dcell) for (let k = 0; k < 3; k++) {
    const s = `dr${Math.round(x / dcell)}:${k}`, r = 2.5 + 5 * hash(s + 'r') ** 2, slide = hash(s + 's') < 0.3;
    let yy = y0 + hash(s + 'y') * (y1 - y0); if (slide) yy = y0 + (((hash(s + 'p') * (y1 - y0) + ctx.t * (30 + 50 * hash(s + 'q'))) % (y1 - y0)) + (y1 - y0)) % (y1 - y0);
    const xx = x + hash(s + 'x') * dcell;
    out.push(circle(xx, yy, r, '#0E1622', {ink: false, 'fill-opacity': 0.35}), circle(xx - r * 0.3, yy - r * 0.35, r * 0.42, '#DDEBFA', {ink: false, 'fill-opacity': 0.55}));
    if (slide) out.push(path(`M${xx} ${yy - r} L${xx} ${Math.max(y0, yy - r - 40)}`, 'none', {stroke: '#B7CAE0', 'stroke-width': r * 0.5, 'stroke-opacity': 0.18}));
  }
  return out.join('');
}
function rainAir(ctx, o) {
  const W = ctx.W, H = ctx.H, dens = clamp(o.density ?? 0.5), out = [], n = Math.round(40 + 160 * dens), ang = (o.angle ?? 12) * Math.PI / 180, sp = o.speed ?? 1900, L = 50 + 50 * dens;
  for (let i = 0; i < n; i++) { const s = 'ra' + i, x0 = hash(s) * (W + 400) - 200, ph = hash(s + 'p') * (H + L), z = 0.5 + hash(s + 'z');
    const y = ((ctx.t * sp * z + ph) % (H + L)) - L, x = x0 - Math.tan(ang) * (y + L) * 0.5;
    out.push(path(`M${x.toFixed(1)} ${y.toFixed(1)} L${(x + Math.sin(ang) * L * z).toFixed(1)} ${(y + Math.cos(ang) * L * z).toFixed(1)}`, 'none', {stroke: o.color || '#BFD3EA', 'stroke-width': 1.5 + z, 'stroke-opacity': 0.18 + 0.2 * z * dens, 'stroke-linecap': 'round'})); }
  return g({'data-layer': 'fx:rain'}, out);
}
function dust(ctx, o) {
  const {x = 960, y = 700, w = 600, h = 700, n = 40, color = '#FFF1D0'} = o, out = [], k = eventW(o, ctx.t, 0.6) * (o.intensity ?? 1);
  if (k <= 0) return '';
  for (let i = 0; i < n; i++) { const s = 'du' + i, u = hash(s), v = hash(s + 'v');
    const px = x - w / 2 + ((u * w + noise(s + 'x', ctx.t, 0.15) * 60 + ctx.t * 6) % w + w) % w, py = y - h / 2 + ((v * h + noise(s + 'y', ctx.t, 0.12) * 50 - ctx.t * 4) % h + h) % h;
    const edge = Math.min(1, 1 - Math.abs((px - x) / (w / 2)) ** 2) * Math.min(1, 1 - Math.abs((py - y) / (h / 2)) ** 2);
    const tw = 0.55 + 0.45 * Math.sin(ctx.t * (0.6 + hash(s + 't')) * 2 * Math.PI * 0.5 + u * 6);
    out.push(circle(px, py, 2.2 + 3.2 * hash(s + 'r'), color, {ink: false, 'fill-opacity': +(0.55 * edge * tw * k).toFixed(3)})); }
  return out.join('');
}

// ---------- lights ----------
/** street-lamp light passing through the bus. Sets that know their windows (oldBus: info.lampLight) draw it as soft
 *  window-shaped sodium pools synced to the exterior's lamps (nightbus.mjs); every such interior gets it by default (no
 *  light needed: fxLayers adds it; a `sweep` light only overrides intensity / color / every). Anywhere else (a plain set):
 *  a soft, broad warm wash drifting across the frame at the lamp cadence (no hard-edged bands). */
function sweep(ctx, o) {
  const k = eventW(o, ctx.t, 0.4); if (k <= 0) return '';
  if (ctx.info.lampLight) return ctx.info.lampLight(ctx, {...o, fade: k});
  const I = (o.intensity ?? 0.12) * k, col = o.color || SODIUM, v = Math.max(1, Math.abs(ctx.v) || 9), every = o.every ?? LAMP_SPACING / v, W = ctx.W, H = ctx.H;
  const [x0, y0, x1, y1] = ctx.view, w = x1 - x0, ph = ((ctx.T ?? ctx.t) / every) % 1, out = [];
  for (const q of [ph - 1, ph]) { const u = q * 1.6 - 0.3, x = x1 - u * w, a = I * Math.sin(Math.PI * clamp(q)) ** 2; if (a > 0.003) out.push(softBlob(x, (y0 + y1) / 2, w * 0.45, (y1 - y0) * 0.75, col, a)); }
  void W; void H; return out.join('');
}
/** a warm point light: two soft radial layers, an optional candle flicker */
function glow(ctx, o) {
  const k = eventW(o, ctx.t, 0.3) * keyed(o.keys ? o.keys.map(q => ({t: q.t, v: q.intensity ?? q.v})) : o.intensity, ctx.t, o.intensity ?? 0.6);
  if (k <= 0) return '';
  const fl = o.flicker ?? 0, seed = 'gl' + (o.id || `${o.x},${o.y}`);
  const f = 1 + fl * (0.16 * noise(seed, ctx.t, 3.2) + 0.08 * noise(seed + 'b', ctx.t, 4.6));
  const r = (o.r ?? 260) * (1 + fl * 0.05 * noise(seed + 'r', ctx.t, 2.4)), col = o.color || CANDLE;
  const x = o.x ?? 960, y = o.y ?? 540, dx = fl * 3 * noise(seed + 'x', ctx.t, 2.8);
  return softBlob(x + dx, y, r * 2.2, r * 2.2 * (o.squash ?? 1), col, 0.22 * k * f, [[0, 0.22 * k * f], [0.35, 0.1 * k * f], [1, 0]]) + softBlob(x + dx, y, r * 0.55, r * 0.55 * (o.squash ?? 1), lighten(col, 0.4), 0.55 * k * f, [[0, Math.min(1, 0.6 * k * f)], [0.5, 0.25 * k * f], [1, 0]]);
}
/** tube halos for the set's fluorescent tubes (their lit level comes from flicker) */
function tubeHalos(ctx) {
  const tubes = ctx.info.tubes || []; if (!tubes.length) return '';
  return tubes.map((tb, i) => { const lv = ctx.lv.tube(i); if (lv < 0.05) return ''; const w = tb.w || 400, h = tb.h || 40;
    return softBlob(tb.x, tb.y, w * 0.85 + 90, h * 2.6 + 120, tb.color || TUBE, 0.26 * lv * (tb.k ?? 1)); }).join('');
}
/** approaching headlights. On a set that knows its vehicle's lamps (busExterior front: info.headlamps), the glare sits on
 *  those lamps and grows with them as the bus comes on (bloom, a core, a soft anamorphic streak), then the frame burns
 *  to warm white at `to` (holds `hold` s). Elsewhere: two screen-space lamps that grow and part from (x, y). */
function headlights(ctx, o) {
  const a = o.from ?? 0, b = o.to ?? a + 1.5; if (ctx.t < a || ctx.t > b + (o.hold ?? 0.15)) return '';
  const u = clamp((ctx.t - a) / (b - a)), W = ctx.W, H = ctx.H, col = o.color || '#FFF4D6', out = [];
  const lamps = ctx.info.headlamps ? ctx.info.headlamps(ctx) : null;
  if (lamps && lamps.length) {
    const z = ctx.cam.zoom, sx = p => W / 2 + (p[0] - ctx.cam.x) * z, sy = p => H / 2 + (p[1] - ctx.cam.y) * z, on = sstep((ctx.t - a) / 0.35);
    const xs = lamps.map(L => sx([L.x, L.y])), ys = lamps.map(L => sy([L.x, L.y])), r = Math.max(...lamps.map(L => L.r)) * z, cxm = (Math.min(...xs) + Math.max(...xs)) / 2, cym = ys.reduce((p, q) => p + q, 0) / ys.length;
    lamps.forEach((L, i) => { const x = xs[i], y = ys[i];
      out.push(softBlob(x, y, r * 9 + 40, r * 8 + 36, '#FFD9A0', 0.42 * on, [[0, 0.42 * on], [0.25, 0.18 * on], [1, 0]]), softBlob(x, y, r * 2.2 + 6, r * 2.2 + 6, col, on, [[0, on], [0.55, 0.8 * on], [1, 0]])); });
    out.push(softBlob(cxm, cym, Math.max(W * 0.12, (Math.max(...xs) - Math.min(...xs)) * 1.6 + r * 14), r * 1.6 + 8, '#FFFFFF', 0.4 * on, [[0, 0.32 * on], [0.5, 0.1 * on], [1, 0]]));   // anamorphic streak
  } else {
    const x = o.x ?? W / 2, y = o.y ?? H * 0.56, e = u ** 2.6, sep = lerp(o.sep0 ?? 18, o.sep ?? W * 0.62, e), r = lerp(6, Math.max(W, H) * 0.45, u ** 3.2);
    for (const sd of [-1, 1]) out.push(softBlob(x + sd * sep / 2, y, r * 3, r * 3, '#FFD9A0', 0.35 + 0.4 * u, [[0, 0.5 + 0.4 * u], [0.2, 0.25 + 0.3 * u], [1, 0]]), softBlob(x + sd * sep / 2, y, r * 0.8 + 3, r * 0.8 + 3, col, 1, [[0, 1], [0.6, 0.85], [1, 0]]));
    out.push(softBlob(x, y, W * (0.25 + 0.9 * e), 12 + 60 * e, '#FFFFFF', 0.5 * u + 0.2, [[0, 0.5 * u + 0.25], [0.5, 0.18 * u], [1, 0]]));   // anamorphic streak
  }
  const white = clamp((u - 0.8) / 0.2) ** 1.5 + (ctx.t > b ? 1 : 0);
  if (white > 0) out.push(rect(0, 0, W, H, '#FFF8EC', {ink: false, 'fill-opacity': +Math.min(1, white).toFixed(3)}));
  return g({'data-layer': 'fx:headlights'}, out);
}
function vignette(ctx, o) {
  const amt = clamp(o.amount ?? 0.45), W = ctx.W, H = ctx.H, gid = id('fxvig'), c = o.color || '#05070C';
  return el('defs', {}, el('radialGradient', {id: gid, cx: W / 2, cy: H / 2, r: Math.hypot(W, H) * 0.56, gradientUnits: 'userSpaceOnUse'}, [[0.42, 0], [0.75, amt * 0.55], [1, amt]].map(([of, a]) => el('stop', {offset: of, 'stop-color': c, 'stop-opacity': +a.toFixed(3)})))) + rect(0, 0, W, H, `url(#${gid})`, NI);
}

/** all fx layers for one frame. Empty strings when the shot has no lights / atmos (old scenes are unchanged). */
export function fxLayers(ctx) {
  const shot = ctx.shot, L = {under: [], back: [], over: [], screen: [], post: [], postScreen: []};
  const lights = asList(shot.lights), atmos = asList(shot.atmos), interior = !!ctx.info.ext && ctx.info.kind !== 'exterior';
  for (const a of atmos) { if (!a || !within({from: (a.from ?? -1e9) - 1, to: (a.to ?? 1e9) + 1}, ctx.t)) continue;
    const k = eventW(a, ctx.t, 0.6); if (k <= 0) continue; const o = {...a, density: (a.density ?? 0.5) * k};
    if (a.type === 'fog') { const where = a.where || (interior ? 'outside' : 'scene');
      if (where === 'outside') { if (!ctx.info.ownFog) L.under.push(fogAll(ctx, o, 'outside')); }
      else { if (where !== 'front') L.back.push(fogAll(ctx, o, 'far')); if (where !== 'far') L.over.push(fogAll(ctx, o, 'near')); } }
    else if (a.type === 'rain') { const where = a.where || (interior ? 'glass' : 'air'); if (where === 'glass') L.under.push(rainGlass(ctx, o)); else L.screen.push(rainAir(ctx, o)); }
    else if (a.type === 'dust') L.post.push(dust(ctx, o)); }
  const anyTubes = (ctx.info.tubes || []).length > 0, hasFlicker = lights.some(l => l?.type === 'flicker');
  if (anyTubes && (hasFlicker || ctx.info.halos !== false)) L.post.push(tubeHalos(ctx));
  if (hasFlicker) { const dim = Math.max(...lights.filter(l => l?.type === 'flicker').map(l => l.dim ?? (l.tube !== undefined && l.tube !== null ? 0.18 : 0.62)));
    const lv = ctx.lv.dimOne && ctx.lv.all > 0.999 ? Math.min(...(ctx.info.tubes || [{}]).map((_, i) => ctx.lv.tube(i))) : ctx.lv.all, a = (1 - lv) * dim;
    if (a > 0.002) L.screen.push(rect(-10, -10, ctx.W + 20, ctx.H + 20, '#02040A', {ink: false, 'fill-opacity': +a.toFixed(3)})); }
  if (ctx.info.lampLight && !lights.some(l => l?.type === 'sweep')) L.post.push(ctx.info.lampLight(ctx, {}));   // every bus interior: the lamps pass
  for (const l of lights) { if (!l) continue;
    if (l.type === 'sweep') L.post.push(sweep(ctx, l));
    else if (l.type === 'glow') L.post.push(glow(ctx, l));
    else if (l.type === 'headlights') L.postScreen.push(headlights(ctx, l));
    else if (l.type === 'vignette' && !(ctx.graded)) L.postScreen.push(vignette(ctx, l)); }
  const j = a => a.filter(Boolean).join('');
  return {under: j(L.under), back: j(L.back), over: j(L.over), screen: j(L.screen), post: j(L.post), postScreen: j(L.postScreen)};
}

/** problems in a shot's fx fields (for --check) */
export function lintFx(shot, i) {
  const out = [], LT = ['flicker', 'sweep', 'headlights', 'glow', 'vignette'], AT = ['fog', 'rain', 'dust'];
  if (shot.grade) { const p = typeof shot.grade === 'string' ? shot.grade : shot.grade.preset || 'night'; if (!GRADES[p]) out.push(['problem', `shot ${i}: unknown grade "${p}" (${Object.keys(GRADES).join(' ')})`]); }
  for (const l of asList(shot.lights)) if (!LT.includes(l?.type)) out.push(['problem', `shot ${i}: unknown light "${l?.type}" (${LT.join(' ')})`]);
    else if (l.type === 'flicker' && (l.rate ?? 1.3) > 4) out.push(['warning', `shot ${i}: flicker rate ${l.rate} is clamped to 4 dips/s (strobing above ~6 Hz)`]);
  for (const a of asList(shot.atmos)) if (!AT.includes(a?.type)) out.push(['problem', `shot ${i}: unknown atmos "${a?.type}" (${AT.join(' ')})`]);
  return out;
}
