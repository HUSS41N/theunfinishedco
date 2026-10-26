// THE LAST BUS · the crash memory (twist 2). One set preset, `carCrash`, with four views that share one night:
//   view 'ots'      inside the car, over Aarav's shoulder (he sits right: Indian right-hand drive): windscreen, wipers,
//                   rain on the glass, the wet road streaming at us, the phone glowing in its dash mount. `flood` brings
//                   the oncoming truck's headlights in until the windscreen burns white.
//   view 'mount'    insert: the phone in its mount, "MUM calling…", his thumb comes in and declines it.
//   view 'face'     CU through the windscreen: Aarav at the wheel. `flood` lights him white; `impact` cracks the glass
//                   and shards come at the lens in slow motion.
//   view 'asphalt'  aftermath: ground level, wet asphalt, rain rings, a headlight and a tail light smeared on the wet
//                   road, the phone sliding to a stop: cracked (the SAME crack as on the bus, phoneUI crack [0.7, 0.18]),
//                   still lit "MUM calling…".
// The frame is authored in screen pixels for camera {x: 960, y: 540, zoom: 1}; everything is overdrawn well past the
// edges so shake and a tilted camera never show an edge. All motion is driven by shot time (ctx.t) and the timing
// options below, so the set stays in sync with the shot's sfx. Deterministic: no per-frame randomness.
//
// options (all times are shot-local seconds):
//   ots:     call: [from, to] the phone screen is lit with the call; flood: [from, to] headlights from far to the glass;
//            wipe: wiper period (s), wipeAt: phase offset (s)
//   mount:   call: [from, to]; decline: t (the thumb lands on the red button); reach: t (the thumb starts moving)
//   face:    flood: [from, to] (white light rising on him); impact: t (the glass breaks); slow: s (shard flight)
//   asphalt: stop: t (the phone comes to rest); from: [x, y] where it slides in from; at: [x, y] where it stops
import {g, path, circle, ellipse, rect, poly, stroke, el, lin, rad, id, tr, text, rrect, mixHex} from './svg.mjs';
import {SCENE, NIGHT} from './props.mjs';
import {softBlob} from './fx.mjs';

const X0 = -3400, X1 = 4600, Y0 = -3400, Y1 = 5600, NI = {ink: false};
const fo = k => ({ink: false, 'fill-opacity': +Math.max(0, Math.min(1, k)).toFixed(3)});
const so = (c, w, k, extra = {}) => ({ink: false, stroke: c, 'stroke-width': w, 'stroke-opacity': +Math.max(0, Math.min(1, k)).toFixed(3), 'stroke-linecap': 'round', ...extra});
// FNV-1a plus a murmur finaliser: plain FNV gives correlated values for keys that differ in the last character
// (beads lined up in rows), the finaliser decorrelates them
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = x => { const u = clamp(x); return u * u * (3 - 2 * u); };
const outCubic = x => 1 - (1 - clamp(x)) ** 3;
const span = (t, [a, b]) => clamp((t - a) / Math.max(1e-6, b - a));
const vgrad = (x, y, w, h, stops) => { const gid = id('cg'); return el('defs', {}, lin(gid, 0, y, 0, y + h, stops)) + rect(x, y, w, h, `url(#${gid})`, NI); };
const radial = (cx, cy, r, stops, box = null) => { const gid = id('cr'); const [x, y, w, h] = box || [cx - r, cy - r, 2 * r, 2 * r]; return el('defs', {}, rad(gid, cx, cy, r, stops)) + rect(x, y, w, h, `url(#${gid})`, NI); };
const P2 = p => p.map(v => +v.toFixed(1)).join(' ');
const polyD = pts => 'M' + pts.map(P2).join(' L') + 'Z';

const SKIN = '#B87444', SKIN_SH = '#93592F', SKIN_HI = '#D49465', NAIL = '#E8C2A4', SHIRT = '#6DB6E8', SHIRT_SH = '#4E8FBE';
const SODIUM = NIGHT.sodium, GREEN = '#7FE0A0', TAIL = '#FF3A2E', HEAD = '#FFF4DC';

// ---------- the phone (phoneUI from props.mjs, so the crack is pixel-identical to the bus phone) ----------
const PHONE_W = 560, PHONE_H = 1000, CRACK = [0.7, 0.18];
/** the phone at origin = bottom centre; state: 'call' | 'declined' | 'dark'; dim 0..1 darkens the screen */
function phone({state = 'call', cracked = false, t = 0, dim = 0} = {}) {
  const sub = state === 'declined' ? 'call declined' : 'calling…';
  const base = SCENE.phoneUI({mode: 'call', who: 'MUM', sub, cracked, crack: CRACK, t: state === 'call' ? t : 0});
  const shade = dim > 0.001 ? path(rrect(-PHONE_W / 2, -PHONE_H, PHONE_W, PHONE_H, 54), '#030405', fo(dim)) : '';
  return g({}, base, shade);
}

// ---------- rain on a pane of glass: beads that build up and are wiped ----------
/** beads in a rect; age(x, y) → seconds since the glass at that point was last wiped (Infinity = never) */
function beads(seed, [x0, y0, x1, y1], n, t, {age = () => 99, size = 1, light = '#DCE8F4', k = 1, slide = 1, dark = 0.35} = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = seed + i, bx = x0 + hash(s + 'x') * (x1 - x0); let by = y0 + hash(s + 'y') * (y1 - y0);
    const big = hash(s + 'b') < 0.12, r = (big ? 7 + 6 * hash(s + 'r') : 2.2 + 3.5 * hash(s + 'r')) * size;
    if (big) by += ((t * (30 + 50 * hash(s + 'v')) * slide) % 140);   // the heavy ones run
    const a = clamp((age(bx, by) - hash(s + 'd') * 0.5) / 0.35);       // drops land again after a wipe
    if (a <= 0.02) continue;
    out.push(ellipse(bx, by, r, r * 1.1, '#0A0E14', fo(dark * a * k)), circle(bx - r * 0.3, by - r * 0.35, Math.max(0.8, r * 0.35), light, fo(0.75 * a * k)));
    if (big) out.push(stroke([[bx, by - r], [bx + 1, by - r - 26 * size]], light, Math.max(1, r * 0.5), {ink: false, 'stroke-opacity': +(0.18 * a * k).toFixed(3)}));
  }
  return out.join('');
}
/** falling rain streaks (outside), within a rect, slanted; v = px/s */
function streaks(seed, [x0, y0, x1, y1], n, t, {v = 2300, len = 70, slant = 0.18, color = '#9FB2C8', k = 0.5, w = 2} = {}) {
  const out = [], H = y1 - y0 + len;
  for (let i = 0; i < n; i++) { const s = seed + i, x = x0 + hash(s + 'x') * (x1 - x0), ph = hash(s + 'p') * H, y = y0 - len + ((ph + t * v * (0.8 + 0.4 * hash(s + 'v'))) % H);
    const dx = slant * len; out.push(stroke([[x, y], [x - dx, y + len]], color, w, {ink: false, 'stroke-opacity': +(k * (0.5 + 0.5 * hash(s + 'k'))).toFixed(3)})); }
  return out.join('');
}

// ---------- glass: radial cracks and shards flying at the lens ----------
function cracks(cx, cy, R, seed, grow, {w = 3, rings = [50, 120, 220]} = {}) {
  const out = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + hash(seed + i) * 0.4, L = (0.45 + 0.55 * hash(seed + 'l' + i)) * R * grow, pts = [[cx, cy]];
    for (let j = 1; j <= 7; j++) { const r = L * j / 7, a2 = a + (hash(seed + i + ':' + j) - 0.5) * 0.3; pts.push([cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]); }
    out.push(stroke(pts.map(([x, y]) => [x + 2, y + 2]), '#000000', w * 0.8, {ink: false, 'stroke-opacity': 0.35, 'stroke-linejoin': 'round'}), stroke(pts, '#F2F8FF', w, {ink: false, 'stroke-opacity': 0.9, 'stroke-linejoin': 'round'})); }
  for (const r0 of rings) { if (R * grow < r0 * 1.2) continue; const pts = []; for (let i = 0; i <= 26; i++) { const a = i / 26 * Math.PI * 2, rr = r0 * (0.8 + 0.4 * hash(seed + 'ring' + r0 + i)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    out.push(stroke(pts, '#F2F8FF', w * 0.7, {ink: false, 'stroke-opacity': 0.7, 'stroke-linejoin': 'round'})); }
  out.push(softBlob(cx, cy, 160 * grow + 10, 160 * grow + 10, '#FFFFFF', 0.55));
  return out.join('');
}
/** shards burst from (ix, iy) toward the camera; p = flight progress 0..1 (already eased for slow motion) */
function shards(ix, iy, seed, p, {n = 34, C = [960, 540], k = 1} = {}) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = seed + 'sh' + i, a = hash(s) * Math.PI * 2, r0 = 10 + 420 * hash(s + 'r') ** 1.4, depth = 0.3 + 2.8 * hash(s + 'z') ** 1.2;
    const m = 1 + depth * p * 2.2, lat = (160 + 520 * hash(s + 'v')) * p;
    const bx = ix + Math.cos(a) * r0, by = iy + Math.sin(a) * r0;
    const x = C[0] + (bx - C[0]) * m + Math.cos(a) * lat * m * 0.6, y = C[1] + (by - C[1]) * m + Math.sin(a) * lat * m * 0.6 + 120 * p * p * hash(s + 'g');
    const sz = (26 + 84 * hash(s + 'S') ** 1.6) * m, rot = (hash(s + 'o') - 0.5) * 140 + (hash(s + 'w') - 0.5) * 260 * p;
    if (m < 7.5) list.push({x, y, sz, rot, s, depth, m});
  }
  list.sort((u, v) => u.m - v.m);   // far first, near (big) last
  const out = [];
  for (const sh of list) {
    const {x, y, sz, rot, s} = sh, nv = 3 + (hash(s + 'n') < 0.45 ? 1 : 0), pts = [];
    for (let j = 0; j < nv; j++) { const aa = j / nv * Math.PI * 2 + (hash(s + 'a' + j) - 0.5) * 1.1, rr = sz * (0.45 + 0.75 * hash(s + 'q' + j)); pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr * 0.7]); }
    const near = clamp((sh.m - 2) / 5), op = k * (0.62 + 0.2 * (1 - near)) * (1 - sstep((sh.m - 6) / 1.5));
    out.push(g({transform: tr(x, y, rot)},
      poly(pts, '#BFD9EE', fo(op)),                                                   // the pane
      poly([pts[0], pts[1], [0, 0]], '#FFFFFF', fo(op * 0.95)),                         // the lit facet
      poly([pts[pts.length - 1], pts[0], [pts[0][0] * 0.4, pts[0][1] * 0.4]], '#55708A', fo(op * 0.7)),   // the shade facet
      stroke([pts[0], pts[1]], '#FFFFFF', Math.max(1.5, sz * 0.05), {ink: false, 'stroke-opacity': Math.min(1, op + 0.2)}),
      hash(s + 'gl') < 0.35 ? g({}, path(`M${P2(pts[0])} m-${sz * 0.25} 0 l${sz * 0.25} -2 l${sz * 0.25} 2 l-${sz * 0.25} 2Z M${P2(pts[0])} m0 -${sz * 0.25} l2 ${sz * 0.25} l-2 ${sz * 0.25} l-2 -${sz * 0.25}Z`, '#FFFFFF', fo(0.9))) : ''));
  }
  // glass dust: specks riding the same burst
  for (let i = 0; i < 70; i++) { const s = seed + 'd' + i, a = hash(s) * Math.PI * 2, m = 1 + (0.5 + 2 * hash(s + 'z')) * p * 2.2, r = (30 + 700 * hash(s + 'r')) * p * m * 0.6;
    out.push(circle(ix + Math.cos(a) * r, iy + Math.sin(a) * r, 1.5 + 2.5 * hash(s + 's') * m * 0.5, '#FFFFFF', fo(k * 0.7 * (1 - 0.5 * p)))); }
  return out.join('');
}

// ---------- the thumb (the same hand as the bus insert in s2, scaled to this phone) ----------
const thumbArt = () => g({},
  path('M-90 260 C-130 120 -110 30 -60 -10 C-20 -40 30 -50 62 -30 C86 -14 84 16 60 30 C30 48 0 70 -6 140 L-10 260Z', SKIN),
  path('M-60 -10 C-20 -40 30 -50 62 -30 C86 -14 84 16 60 30 C66 8 50 -14 20 -18 C-8 -22 -40 -10 -60 -10Z', SKIN_HI, NI),
  path('M24 -34 C46 -38 66 -26 64 -6 C50 -6 34 -16 24 -34Z', NAIL, fo(0.85)),
  path('M-90 260 C-120 150 -112 70 -82 20 C-92 90 -86 170 -56 260Z', SKIN_SH, NI),
  // the side of the fist and the rolled sky cuff (his shirt)
  path('M-10 140 C40 120 120 140 170 190 L200 330 L-40 330Z', SKIN_SH, NI),
  path('M60 250 L260 200 L320 420 L80 470Z', SHIRT), path('M60 250 L260 200 L270 236 L72 290Z', SHIRT_SH, NI));

// =====================================================================================================================
// view 'ots': over his shoulder, through the windscreen
// =====================================================================================================================
const WS = [[250, 150], [1690, 128], [1880, 650], [40, 668]];         // the windscreen opening (inner edge)
const VP = [800, 400], FOC = 1000, EYE = 1.25;
const Pj = (X, Y, Z) => [VP[0] + FOC * X / Z, VP[1] + FOC * (EYE - Y) / Z];
const WIPERS = [{p: [430, 672], L: 640}, {p: [1110, 668], L: 640}];
/** wiper angle (deg from pointing right, sweeping up to the left) at t */
const wiperA = (t, P, ph) => 56 - 56 * Math.cos(2 * Math.PI * (t + ph) / P);
/** seconds since a wiper blade last passed angle α (deg) at time t */
function sinceWipe(t, P, ph, alpha) {
  if (alpha < 0 || alpha > 112) return 99;
  const f0 = Math.acos(clamp(1 - alpha / 56, -1, 1)), phi = 2 * Math.PI * (t + ph) / P, k = Math.floor(phi / (2 * Math.PI));
  let best = 99; for (const kk of [k - 1, k, k + 1]) for (const f of [f0, 2 * Math.PI - f0]) { const pf = 2 * Math.PI * kk + f; if (pf <= phi) best = Math.min(best, (phi - pf) / (2 * Math.PI) * P); }
  return best;
}
function ots(o) {
  const {call = [0, 99], flood = null, wipe = 1.25, wipeAt = 0.2, seed = 'ots'} = o;
  const [hx, hy] = VP;
  const back = [rect(X0, Y0, X1 - X0, Y1 - Y0, '#06080D', NI),
    vgrad(X0, -400, X1 - X0, hy + 420, [[0, '#05070C'], [0.75, '#121A28'], [1, '#2A2C34']]),
    softBlob(hx - 120, hy - 10, 900, 140, SODIUM, 0.22), softBlob(hx + 500, hy, 600, 110, '#9FB8E0', 0.12),                     // the city glow in the rain
    rect(X0, hy, X1 - X0, Y1 - hy, '#0D1015', NI),
    poly([Pj(-2.2, 0, 1.4), Pj(5.6, 0, 1.4), Pj(5.6, 0, 400), Pj(-2.2, 0, 400)], '#181C23', NI),                                 // the carriageway (two lanes)
    poly([Pj(-2.2, 0, 1.4), Pj(-2.05, 0, 1.4), Pj(-2.05, 0, 400), Pj(-2.2, 0, 400)], '#8E8A7C', fo(0.5)),                       // the left edge line
    // the wet road: a sheen band toward the far glow
    poly([Pj(-1.2, 0, 4), Pj(2.2, 0, 4), Pj(0.6, 0, 300), Pj(-0.2, 0, 300)], '#3A3E46', fo(0.35)),
    // dark trees / walls on the left verge, far roofs on the right
    ...Array.from({length: 14}, (_, i) => { const z = 6 + i * 9, [x, y] = Pj(-5.2, 0, z), h = (4 + 3 * hash(seed + 't' + i)) * FOC / z; return ellipse(x, y - h * 0.6, h * 0.55, h * 0.6, '#0A0D12', NI); })];
  const live = {
    back: ctx => {
      const t = ctx.t, d = ctx.d, out = [];
      // street lamps on the left verge streaming past, their light smeared on the wet road
      for (let p = Math.floor(d / 28) * 28 - 28; p < d + 260; p += 28) { const z = p - d + 6; if (z < 1.6) continue;
        const [bx, by] = Pj(-3.6, 0, z), [tx, ty] = Pj(-3.6, 6.2, z), [lx, ly] = Pj(-2.5, 6.0, z), w = Math.max(1.5, 0.18 * FOC / z), f = Math.min(1, 30 / z);
        out.push(rect(bx - w / 2, ty, w, by - ty, '#07090C', NI), stroke([[tx, ty], [lx, ly]], '#07090C', w * 0.7),
          softBlob(lx, ly, 2.4 * FOC / z, 1.8 * FOC / z, SODIUM, 0.55 * f), ellipse(lx, ly + 0.05 * FOC / z, 0.35 * FOC / z, 0.1 * FOC / z, '#FFE6B8', NI));
        const [rx, ry] = Pj(-2.0, 0, z); out.push(softBlob(rx + 0.2 * FOC / z, ry + 0.6 * FOC / z, 0.5 * FOC / z, 1.6 * FOC / z, SODIUM, 0.28 * f)); }
      // the lane dashes rushing at us (centre line at X = 1.7)
      for (let p = Math.floor(d / 9) * 9 - 9; p < d + 200; p += 9) { const z = p - d + 2; if (z < 1.45) continue;
        out.push(poly([Pj(1.62, 0, z), Pj(1.78, 0, z), Pj(1.78, 0, z + 3.5), Pj(1.62, 0, z + 3.5)], '#D8D2BE', fo(Math.min(0.85, 40 / z)))); }
      // the oncoming truck: far lamps at first, then the glare fills the glass
      if (flood) {
        const u = span(t, flood), e = u ** 2.1, z = lerp(70, 1.3, e), X = lerp(2.9, 0.55, e), s = FOC / z;
        const [cx, cy] = Pj(X, 1.1, z), [gx, gy] = Pj(X, 0, z);
        if (u > 0) {
          out.push(path(rrect(cx - 1.25 * s, cy - 2.4 * s, 2.5 * s, 3.4 * s, 0.12 * s), '#0B0C10', NI),                             // the cab, a black block
            ...[-1, -0.35, 0.35, 1].map(k => circle(cx + k * 1.0 * s, cy - 2.3 * s, 0.05 * s + 1.2, '#FFB34A', NI)));                  // its marker lamps
          for (const sd of [-1, 1]) { const lx = cx + sd * 0.95 * s;
            out.push(softBlob(lx, cy, 2.2 * s + 70, 1.5 * s + 50, HEAD, 0.95), circle(lx, cy, 0.24 * s + 4, '#FFFFFF', NI),
              softBlob(lx, gy + 0.6 * s, 0.6 * s + 20, 3.5 * s + 40, HEAD, 0.5)); }                                                   // the smear on the wet road
          out.push(softBlob(cx, cy, 5 * s + 500, 0.16 * s + 16, '#FFFFFF', 0.5 + 0.5 * e));                                         // anamorphic streak
          const wash = sstep((u - 0.45) / 0.55);
          if (wash > 0) out.push(rect(X0, Y0, X1 - X0, Y1 - Y0, '#FFF6E4', fo(wash * 0.97)));
        }
      }
      // rain falling outside (lit by the lamps), then the beads on the glass and the wipers
      out.push(streaks(seed + 'r', [0, 100, 1920, 700], 70, t, {v: 2600, len: 60, slant: -0.12, color: '#A9B8CC', k: 0.35, w: 2}));
      const age = (x, y) => Math.min(...WIPERS.map(W => { const dx = x - W.p[0], dy = W.p[1] - y, r = Math.hypot(dx, dy); if (r > W.L) return 99; return sinceWipe(t, wipe, wipeAt, Math.atan2(dy, dx) * 180 / Math.PI); }));
      const glare = flood ? sstep((span(t, flood) - 0.2) / 0.6) : 0;
      out.push(beads(seed + 'b', [40, 130, 1880, 660], 230, t, {age, light: glare > 0.1 ? '#FFFFFF' : '#E4ECF6', k: 1 + glare * 0.6}));
      for (const W of WIPERS) { const a = wiperA(t, wipe, wipeAt) * Math.PI / 180, ex = W.p[0] + Math.cos(a) * W.L, ey = W.p[1] - Math.sin(a) * W.L;
        out.push(stroke([W.p, [W.p[0] + Math.cos(a) * W.L * 0.5, W.p[1] - Math.sin(a) * W.L * 0.5]], '#050608', 12), stroke([[W.p[0] + Math.cos(a) * W.L * 0.2, W.p[1] - Math.sin(a) * W.L * 0.2], [ex, ey]], '#030405', 16)); }
      return out.join('');
    },
    mid: ctx => {   // light that lands inside the car: the phone's green, the dash, and the flood
      const t = ctx.t, out = [], on = clamp(Math.min((t - call[0]) / 0.06, (call[1] - t) / 0.08)), pulse = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 0.8);
      const [px, py] = MOUNT;
      out.push(g({transform: tr(px, py, -4, 0.2)}, phone({state: 'call', t, dim: 1 - on})));
      if (on > 0) out.push(softBlob(px, py - 100, 420, 240, GREEN, 0.3 * on * pulse), softBlob(px + 60, py + 50, 520, 120, GREEN, 0.18 * on));
      if (flood) { const u = span(t, flood), e = sstep((u - 0.3) / 0.7);
        if (e > 0) out.push(softBlob(960, 380, 1500, 700, '#FFF6E4', 0.55 * e), rect(X0, Y0, X1 - X0, Y1 - Y0, '#FFF6E4', fo(0.35 * e * e))); }
      return out.join('');
    },
  };
  // the car around the glass: headliner, A-pillars, the dash with its vents, the rear-view mirror, the phone mount
  const shell = `M${X0} ${Y0} H${X1} V${Y1} H${X0}Z ` + polyD(WS);
  const mid = [path(shell, '#0A0B0F', {'fill-rule': 'evenodd', ink: false}),
    poly([[250, 150], [40, 668], [-60, 668], [150, 140]], '#14161C', NI), poly([[1690, 128], [1880, 650], [1990, 650], [1790, 118]], '#14161C', NI),   // pillar faces
    vgrad(X0, 640, X1 - X0, 140, [[0, '#1C1F26'], [0.25, '#121418'], [1, '#08090C']]),                                                            // the dash top
    stroke([[40, 668], [1880, 650]], '#2E323B', 5),
    path('M1180 760 C1240 700 1560 690 1660 760 L1700 1100 L1150 1100Z', '#0C0D11', NI), path('M1200 752 C1260 712 1540 704 1640 752', 'none', {ink: false, stroke: '#2A2D35', 'stroke-width': 6}),   // the instrument hood
    softBlob(1420, 790, 260, 60, '#7FB8FF', 0.16),                                                                                                 // the cluster's blue
    ...[[520, 790], [620, 790]].map(([x, y]) => g({}, path(rrect(x - 40, y - 22, 80, 44, 10), '#06070A', NI), stroke([[x - 30, y - 8], [x + 30, y - 8]], '#1B1E25', 3), stroke([[x - 30, y + 6], [x + 30, y + 6]], '#1B1E25', 3))),
    // the rear-view mirror on its stem
    stroke([[930, 128], [930, 196]], '#0A0B0F', 18), path(rrect(800, 190, 270, 82, 26), '#0A0B0F', NI), path(rrect(812, 200, 246, 62, 20), '#1A2230', NI), path('M830 206 L900 206 L870 256 L818 256Z', '#FFFFFF', fo(0.05)),
    // the mount: a vent clip, an arm and the cradle the phone sits in
    stroke([[MOUNT[0], MOUNT[1] + 20], [MOUNT[0] + 10, 790]], '#07080B', 16), path(rrect(MOUNT[0] - 66, MOUNT[1] - 6, 132, 26, 8), '#07080B', NI),
    path(rrect(MOUNT[0] - 64, MOUNT[1] - 140, 14, 90, 6), '#07080B', NI), path(rrect(MOUNT[0] + 50, MOUNT[1] - 140, 14, 90, 6), '#07080B', NI)];
  return {back, mid, front: [], live, info: {kind: 'interior', view: 'carOts', floorY: 1500, note: 'Aarav: view back, driveSeat, x ≈ 1420, y 1500, scale ≈ 1.9'}};
}
const MOUNT = [690, 640];

// =====================================================================================================================
// view 'mount': the phone insert
// =====================================================================================================================
function mount(o) {
  const {call = [0, 99], decline = 0.55, reach = 0.15, wipe = 0.45, seed = 'mt'} = o;
  const PS = 0.62, PX = 960, PY = 905;            // the phone (bottom centre) on screen
  const btn = [PX - PHONE_W * 0.26 * PS, PY - 150 * PS];
  const back = [rect(X0, Y0, X1 - X0, Y1 - Y0, '#05070B', NI), vgrad(X0, -200, X1 - X0, 1100, [[0, '#06080D'], [0.7, '#0E141F'], [1, '#141620']])];
  const live = {
    back: ctx => {
      const t = ctx.t, out = [];
      // the windscreen out of focus: lamp bokeh drifting past, rain beads catching it
      for (let i = 0; i < 11; i++) { const s = seed + 'bk' + i, r = 40 + 100 * hash(s + 'r'), y = 120 + 520 * hash(s + 'y'), x = ((hash(s + 'x') * 2600 - t * (500 + 400 * hash(s + 'v'))) % 2600 + 2600) % 2600 - 340;
        const c = hash(s + 'c') < 0.7 ? SODIUM : hash(s + 'c') < 0.85 ? TAIL : '#CFE0FF'; out.push(circle(x, y, r, c, fo(0.08 + 0.1 * hash(s + 'k'))), circle(x, y, r * 0.86, c, fo(0.05))); }
      out.push(beads(seed + 'b', [-100, 40, 2020, 760], 90, t, {size: 2.4, light: '#F5D6A8', k: 0.55}));
      // a wiper passing, out of focus
      const w = (t - wipe) / 0.4; if (w > -0.2 && w < 1.2) { const a = (-30 + 130 * w) * Math.PI / 180, px = 300, py = 1300;
        for (let k = 0; k < 4; k++) { const ak = a - k * 0.05; out.push(stroke([[px, py], [px + Math.cos(ak) * 1900, py - Math.sin(ak) * 1900]], '#020304', 46, {ink: false, 'stroke-opacity': 0.5 - k * 0.1})); } }
      // the dash below
      out.push(vgrad(X0, 820, X1 - X0, 400, [[0, '#15171D'], [0.15, '#0B0C10'], [1, '#050607']]), stroke([[X0, 822], [X1, 822]], '#2A2E36', 4));
      return out.join('');
    },
    mid: ctx => {
      const t = ctx.t, out = [], on = clamp(Math.min((t - call[0]) / 0.05, (call[1] - t) / 0.12)), state = t < decline ? 'call' : 'declined';
      const dark = sstep((t - decline - 0.18) / 0.22), pulse = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 0.8);
      out.push(softBlob(PX, PY - 300, 700, 560, GREEN, 0.22 * on * (1 - dark) * pulse));
      // the cradle behind, the phone, the grips in front
      out.push(path(rrect(PX - 200, PY - 470, 400, 220, 30), '#07080B', NI), stroke([[PX, PY + 10], [PX + 20, PY + 260]], '#07080B', 46));
      out.push(g({transform: tr(PX, PY, 0, PS)}, phone({state, t, dim: Math.max(1 - on, dark * 0.96)})));
      out.push(path(rrect(PX - PHONE_W * PS / 2 - 34, PY - 560, 46, 240, 14), '#0B0C10', NI), path(rrect(PX + PHONE_W * PS / 2 - 12, PY - 560, 46, 240, 14), '#0B0C10', NI),
        path(rrect(PX - 220, PY - 6, 440, 50, 16), '#0B0C10', NI), stroke([[PX - 200, PY + 4], [PX + 200, PY + 4]], '#22252D', 4));
      if (state === 'declined') out.push(g({transform: tr(PX, PY, 0, PS)}, path(rrect(-PHONE_W * 0.26 - 56, -206, 112, 112, 56), '#FFFFFF', fo(0.5 * (1 - sstep((t - decline) / 0.15))))));   // the press flash
      return out.join('');
    },
    front: ctx => {   // his thumb: in from the bottom right, onto the red button, and away
      const t = ctx.t, a = outCubic((t - reach) / Math.max(0.1, decline - reach)), r = sstep((t - decline - 0.14) / 0.3);
      if (t < reach - 0.01 || r >= 1) return '';
      const tip = [lerp(1400, btn[0] + 18, a), lerp(1350, btn[1] + 6, a)], away = [lerp(0, 380, r), lerp(0, 420, r)];
      const press = t > decline - 0.02 && t < decline + 0.14 ? 0.96 : 1;
      return g({transform: tr(tip[0] + away[0] - 62, tip[1] + away[1] + 30, -28 + 10 * r, 1.25 * press)}, thumbArt());
    },
  };
  return {back, mid: [], front: [], live, info: {kind: 'interior', view: 'carMount', button: btn}};
}

// =====================================================================================================================
// view 'face': CU through the windscreen. Aarav: driveSeat, x 960, y FACE_Y, scale FACE_S (head ≈ (960, 470))
// =====================================================================================================================
export const FACE = {x: 960, y: 1820, scale: 2.4};
function face(o) {
  const {flood = null, impact = null, slow = 1.0, seed = 'fc', hit = [780, 400]} = o;
  const back = [rect(X0, Y0, X1 - X0, Y1 - Y0, '#07080C', NI),
    path('M-400 -200 L700 -60 L620 420 L-400 480Z', '#10141C', NI), softBlob(140, 160, 520, 260, SODIUM, 0.12),                 // the rear side window, a far lamp
    path('M1250 -60 L2400 -200 L2400 520 L1330 430Z', '#0F131A', NI),
    path(rrect(700, 90, 520, 560, 150), '#14161B', NI), path(rrect(730, 110, 460, 140, 70), '#1B1E25', NI)];                    // the headrest behind his head
  const live = {
    front: ctx => {
      const t = ctx.t, out = [];
      // dash light from below (teal) and the flood (white, from the camera side)
      out.push(softBlob(960, 980, 900, 420, '#3FA8B8', 0.16));
      const fl = flood ? sstep(span(t, flood)) : 0, burn = impact != null && t >= impact ? 1 - sstep((t - impact) / 0.5) : 1;
      if (fl > 0) out.push(softBlob(980, 460, 1100, 900, '#FFF6E4', 0.62 * fl * burn), rect(X0, Y0, X1 - X0, Y1 - Y0, '#FFF6E4', fo(0.16 * fl * burn)));
      // the wheel: a rim crossing his chest, the column below
      out.push(ellipse(960, 1135, 600, 190, 'none', {ink: false, stroke: '#0A0B0E', 'stroke-width': 58}), ellipse(960, 1128, 600, 186, 'none', {ink: false, stroke: '#2A2D35', 'stroke-width': 10, 'stroke-opacity': 0.8, 'stroke-dasharray': '0 300 900 3000'}),
        path('M860 1180 L1060 1180 L1100 1500 L820 1500Z', '#0A0B0E', NI));
      // the glass: beads, a sheen, the parked wiper
      out.push(beads(seed + 'b', [-200, -100, 2120, 1180], 110, t, {size: 1.3, k: 0.7, slide: 0.6, dark: 0.18 * (1 - fl), light: fl > 0.2 ? '#FFFFFF' : '#E4ECF6'}),
        path('M300 -100 L560 -100 L-100 1200 L-360 1200Z', '#FFFFFF', fo(0.035)), path('M1500 -100 L1590 -100 L1100 1200 L1010 1200Z', '#FFFFFF', fo(0.03)));
      // the frame of the windscreen: roof, pillars, scuttle
      out.push(path(`M${X0} ${Y0} H${X1} V${Y1} H${X0}Z M-60 30 L1980 10 L2140 1240 L-220 1260Z`, '#050608', {'fill-rule': 'evenodd', ink: false}),
        stroke([[-60, 30], [1980, 10]], '#1A1D24', 8), stroke([[-220, 1060], [2140, 1050]], '#020304', 30));
      if (impact != null && t >= impact) {
        const u = t - impact, grow = outCubic(u / 0.07), p = 0.32 * outCubic(u / 0.09) + 0.68 * clamp(u / slow) ** 0.9;      // a burst, then slow motion
        out.push(cracks(hit[0], hit[1], 1500, seed + 'ck', grow, {w: 4, rings: [60, 150, 280, 430]}));
        out.push(shards(hit[0], hit[1], seed, p, {n: 40, k: 1 - 0.4 * sstep((u - slow) / 0.3)}));
      }
      return out.join('');
    },
  };
  return {back, mid: [], front: [], live, info: {kind: 'interior', view: 'carFace', actor: FACE}};
}

// =====================================================================================================================
// view 'asphalt': the phone on the wet road
// =====================================================================================================================
const HZ = 250;   // the horizon on screen
const GE = 0.55;  // ground squash (we look down at ~33°)
function asphalt(o) {
  const {stop = 1.0, from = [-420, 980], at = [960, 770], rot0 = 150, rot1 = -14, seed = 'as', ring = 'MUM'} = o;
  const back = [rect(X0, Y0, X1 - X0, Y1 - Y0, '#07090D', NI),
    vgrad(X0, -600, X1 - X0, HZ + 640, [[0, '#04060A'], [0.8, '#0D121B'], [1, '#1A1E26']]),
    softBlob(330, HZ - 30, 460, 120, TAIL, 0.22), softBlob(1530, HZ - 40, 700, 160, HEAD, 0.18),
    rect(X0, HZ, X1 - X0, Y1 - HZ, '#0E1014', NI),
    vgrad(X0, HZ, X1 - X0, 500, [[0, '#1A1E25'], [1, '#0E1014']])];
  // aggregate in perspective (small far, big near) and puddles that hold the reflections
  for (let i = 0; i < 520; i++) { const s = seed + 'ag' + i, v = hash(s + 'y'), y = HZ + 10 + (1500 - HZ) * v ** 1.6, sc = 0.2 + 1.4 * (y - HZ) / (1080 - HZ);
    back.push(ellipse(-300 + hash(s) * 2520, y, (1.5 + 3 * hash(s + 'r')) * sc * 1.6, (1.5 + 3 * hash(s + 'r')) * sc * GE, hash(s + 'c') < 0.5 ? '#1B1F25' : '#06070A', NI)); }
  for (const [cx, cy, rx, ry] of [[1460, 520, 620, 120], [380, 470, 520, 90], [940, 860, 760, 170], [1700, 900, 420, 110]])
    back.push(path(`M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.2} ${cx - rx * 0.2} ${cy - ry} ${cx + rx * 0.3} ${cy - ry * 0.9} C${cx + rx * 1.1} ${cy - ry * 0.8} ${cx + rx} ${cy + ry * 0.7} ${cx + rx * 0.2} ${cy + ry} C${cx - rx * 0.5} ${cy + ry * 1.2} ${cx - rx} ${cy + ry * 0.6} ${cx - rx} ${cy}Z`, '#141A24', NI));
  // a broken lane marking crossing the frame, and glass bits glinting
  for (let i = 0; i < 7; i++) { const u0 = i / 7, x0 = lerp(-200, 2100, u0), y0 = lerp(1150, 330, u0), x1 = lerp(-200, 2100, u0 + 0.075), y1 = lerp(1150, 330, u0 + 0.075), w = lerp(22, 5, u0);
    back.push(stroke([[x0, y0], [x1, y1]], '#8E8A7C', w, {ink: false, 'stroke-opacity': 0.4, 'stroke-linecap': 'butt'})); }
  for (let i = 0; i < 46; i++) { const s = seed + 'gl' + i, x = 200 + 1500 * hash(s), y = 380 + 650 * hash(s + 'y') ** 0.8, sz = (4 + 10 * hash(s + 'z')) * (0.4 + (y - HZ) / 900);
    back.push(poly([[x, y - sz * GE], [x + sz, y], [x - sz * 0.4, y + sz * GE * 0.8]], '#9FB6C8', fo(0.55)), circle(x - sz * 0.2, y - sz * 0.2, Math.max(1, sz * 0.18), '#FFFFFF', fo(0.7))); }
  // the far lights: the truck's one surviving headlight (right) and our car's tail light (left), and their smears down the wet road
  back.push(softBlob(1540, HZ - 6, 420, 90, '#FFFFFF', 0.45), circle(1540, HZ - 6, 15, '#FFFFFF', NI), softBlob(1540, HZ - 6, 1200, 26, '#FFFFFF', 0.4),
    softBlob(330, HZ + 8, 150, 60, TAIL, 0.7), ellipse(330, HZ + 8, 22, 10, '#FF8A7E', NI),
    poly([[1520, HZ + 20], [1560, HZ + 20], [1700, 1100], [1300, 1100]], HEAD, fo(0.06)), softBlob(1530, 640, 150, 520, HEAD, 0.18), softBlob(1470, 900, 230, 300, HEAD, 0.12),
    softBlob(340, 560, 90, 330, TAIL, 0.2), softBlob(300, 860, 150, 260, TAIL, 0.1));
  const live = {
    back: ctx => {
      const t = ctx.t, out = [];
      // the reflections shimmer as the rain breaks them
      for (let i = 0; i < 18; i++) { const s = seed + 'sm' + i, y = 330 + i * 42, x = 1530 + (y - 330) * 0.06 + 26 * Math.sin(t * 2.3 + i), wv = 40 + i * 6;
        out.push(ellipse(x, y, wv * (0.6 + 0.4 * Math.sin(t * 3.1 + i * 1.7)), 5 + i * 0.4, HEAD, fo(0.1 + 0.06 * Math.sin(t * 2.7 + i)))); void s; }
      for (let i = 0; i < 12; i++) { const y = 330 + i * 52, x = 335 - (y - 330) * 0.08 + 18 * Math.sin(t * 2.1 + i * 1.3);
        out.push(ellipse(x, y, 24 + i * 5, 4 + i * 0.4, TAIL, fo(0.12 + 0.05 * Math.sin(t * 3.3 + i)))); }
      // rain rings on the puddles
      for (let i = 0; i < 40; i++) { const s = seed + 'rr' + i, per = 0.7 + 0.5 * hash(s + 'p'), ph = ((t + hash(s) * per) % per) / per, y = HZ + 60 + 760 * hash(s + 'y') ** 0.8, sc = 0.3 + (y - HZ) / 600;
        const x = -100 + 2120 * hash(s + 'x'), r = (6 + 46 * ph) * sc;
        out.push(ellipse(x, y, r, r * GE * 0.6, 'none', so('#8E9DB4', 2 * sc, 0.55 * (1 - ph))), ph < 0.25 ? circle(x, y - 6 * sc, 2.5 * sc, '#C9D6E6', fo(0.7 * (1 - ph * 4))) : ''); }
      // the phone: slides in spinning, slows, stops, still ringing
      const u = clamp(t / stop), e = 1 - (1 - u) ** 3, x = lerp(from[0], at[0], e), y = lerp(from[1], at[1], e), rot = lerp(rot0, rot1, e) + (u < 1 ? 0 : 0);
      const settle = u >= 1 ? 0 : 1 - e, S = 0.66, pulse = 0.7 + 0.3 * Math.sin(t * 2 * Math.PI * 0.8);
      out.push(softBlob(x + 20, y + 30, 520, 260, GREEN, 0.26 * pulse), softBlob(x, y + 150, 160, 420, GREEN, 0.12 * pulse));            // its glow on the wet road
      // the water it pushed: a short wake behind it while it slides
      if (settle > 0.02) for (let k = 1; k <= 5; k++) { const ek = clamp(e - k * 0.035), wx = lerp(from[0], at[0], ek), wy = lerp(from[1], at[1], ek);
        out.push(ellipse(wx, wy + 20, 150 + k * 18, 40 + k * 4, '#9FB2C8', fo(0.12 * settle * (1 - k / 6)))); }
      const body = g({transform: `translate(${(x).toFixed(1)} ${(y).toFixed(1)}) scale(${S} ${(S * GE).toFixed(3)}) rotate(${rot.toFixed(1)}) translate(0 ${PHONE_H / 2})`},
        path(rrect(-PHONE_W / 2 - 34, -PHONE_H - 34, PHONE_W + 68, PHONE_H + 68, 80), '#000000', fo(0.45)),                                     // its shadow
        phone({state: 'call', cracked: true, t}),
        path(rrect(-PHONE_W / 2, -PHONE_H, PHONE_W, PHONE_H, 54), '#FFFFFF', fo(0.05)));
      out.push(body);
      void ring;
      return out.join('');
    },
  };
  return {back, mid: [], front: [], live, info: {kind: 'exterior', view: 'carAsphalt', floorY: 1500, horizon: HZ}};
}

/** the crash memory set: view 'ots' | 'mount' | 'face' | 'asphalt' (see the header) */
export function carCrash(o = {}) {
  const v = o.view || 'ots';
  return v === 'mount' ? mount(o) : v === 'face' ? face(o) : v === 'asphalt' ? asphalt(o) : ots(o);
}
