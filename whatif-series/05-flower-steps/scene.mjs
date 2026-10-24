// What If #05 — What if every step you took grew a flower?   (36 s, silent) · accent pink (flowers)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, label, kf, ease, lerp, clamp, twos, walk, at, bed, music, hash,
  STAND, INK, WHITE, GREY, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const PINK = ACCENTS.pink, S = 1.3;

// ---------- local helpers ----------
// kit walk() lifts the foot while it travels backward (a moonwalk); a negative phase gives a forward walk.
// With fwalk, the left foot lands (front, +55) at integer phase, the right at phase + 0.5; each lifts half a cycle later.
const fwalk = (ph, o) => walk(ph, o);
const STRIDE = 220;                                   // local units travelled per walk cycle (2 steps)
const backOut = k => { k = clamp(k); if (k <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
const blink = (t, off = 0) => ((t + off) % 3.3) < 0.085 ? 'closed' : undefined;
const breathe = (p, lt, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(twos(lt) * 2.6) * a]});

/** side-view flower (plain canvas, no pen wobble so the figure's lines don't boil as flowers appear) */
function flower(ctx, x, y, g = 1, {h = 86, s = 1, sway = 0} = {}) {
  const k = backOut(g); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway * 0.2 + 4, -h * 0.5, sway, -h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -h * 0.38); ctx.quadraticCurveTo(16, -h * 0.5, 22, -h * 0.42); ctx.stroke();
  ctx.fillStyle = PINK; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; ctx.beginPath(); ctx.arc(sway + Math.cos(a) * 14, -h + Math.sin(a) * 14, 11, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(sway, -h, 6, 0, 6.283); ctx.fill();
  ctx.restore();
}
/** top-down flower: 5 petal dots and a tiny centre */
function topFlower(ctx, x, y, g = 1, s = 1, rot = 0) {
  const k = backOut(g); if (k <= 0) return; const r = 6.5 * s * k, d = 7.5 * s * k;
  ctx.fillStyle = PINK; for (let i = 0; i < 5; i++) { const a = rot + i * 1.2566; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(x, y, 3.2 * s * k, 0, 6.283); ctx.fill();
}
/** tiny top-down stickman walking along angle `ang` (radians). cap: her pink cap seen from above. */
function topMan(ctx, x, y, ang, ph, s = 1, {cap = false} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.lineCap = 'round';
  const sw = Math.sin(ph * 6.283);
  ctx.strokeStyle = INK; ctx.fillStyle = WHITE; ctx.lineWidth = 4.5;
  for (const [sd, k] of [[-1, 1], [1, -1]]) { ctx.beginPath(); ctx.ellipse(10 * sw * k, sd * 11, 9, 6, 0, 0, 6.283); ctx.fill(); ctx.stroke(); } // feet
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke();                  // shoulders
  for (const [sd, k] of [[-1, -1], [1, 1]]) { const hx = 20 * sw * k; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, sd * 30); ctx.lineTo(hx * 0.6, sd * 36); ctx.lineTo(hx, sd * 40); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, sd * 40, 6, 0, 6.283); ctx.fill(); ctx.lineWidth = 3.5; ctx.stroke(); }
  ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.283); ctx.fill(); ctx.stroke();
  if (cap) { ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(-2, 0, 17, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(18, 0, 10, 15, 0, -1.57, 1.57); ctx.fill(); }
  ctx.restore();
}
/** a path through control points (Catmull-Rom), with arc-length lookup */
function makePath(cp, n = 20) {
  const pts = [];
  for (let i = 0; i < cp.length - 1; i++) {
    const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); }
  }
  pts.push(cp.at(-1));
  return fromPts(pts);
}
function fromPts(pts) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum.at(-1);
  const P = d => { d = clamp(d, 0, len); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], u = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1); return {x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), a: Math.atan2(b[1] - a[1], b[0] - a[0])}; };
  return {pts, len, P};
}
/** flowers left along a path up to distance `upto`; the newest ones are still popping. lanes = side offsets */
function trail(ctx, path, upto, {from = 0, gap = 26, lanes = [-12, 12], s = 1, popLen = 60, seed = 1} = {}) {
  for (const [li, off] of lanes.entries()) for (let d = from + (li * gap) / lanes.length; d <= upto; d += gap) {
    const p = path.P(d), h = hash(d * 0.37 + li * 11 + seed), o = off + (h - 0.5) * 10;
    topFlower(ctx, p.x - Math.sin(p.a) * o, p.y + Math.cos(p.a) * o, (upto - d) / popLen, s * (0.85 + h * 0.3), h * 6);
  }
}

// ---------- the map (top-down world): home, office, his loop, park, river, hill ----------
const HOME = [380, 700], OFFICE = [380, 1590];
const LOOP = (() => { const pts = [], r = 46, y0 = 790, y1 = 1500, cx = 380; // a stadium: home -> office -> home
  for (let y = y0; y <= y1; y += 10) pts.push([cx + r, y]);
  for (let a = 0; a <= Math.PI; a += 0.1) pts.push([cx + r * Math.cos(a), y1 + r * Math.sin(a)]);
  for (let y = y1; y >= y0; y -= 10) pts.push([cx - r, y]);
  for (let a = Math.PI; a <= 2 * Math.PI + 0.01; a += 0.1) pts.push([cx + r * Math.cos(a), y0 + r * Math.sin(a)]);
  return fromPts(pts); })();
const RIVER = makePath([[1230, 120], [1110, 600], [1170, 1000], [1040, 1500], [1120, 2200]]);
const HILL = [660, 1180];
const HER = makePath([[1360, 420], [1150, 470], [980, 420], [860, 540], [910, 700], [1060, 760], [1170, 880], [1250, 1020], [1170, 1130],
  [1060, 1060], [960, 980], [860, 1010], [1000, 1180], [1120, 1380], [1180, 1580], [1020, 1720], [870, 1620], [900, 1440], [960, 1310]]);
const HIS_NEW = makePath([[426, 1300], [480, 1330], [560, 1290], [610, 1220], [650, 1185]]);
const HER_EXT = makePath([[960, 1310], [880, 1260], [790, 1240], [700, 1200], [670, 1185]]);
const JOINT = makePath([[660, 1180], [690, 1060], [780, 930], [880, 800], [930, 640], [1010, 480], [1080, 300], [1120, 100]]);

function drawMap(ctx, {loopUpto = LOOP.len * 6, loopPop = 0, herUpto = 0, hill = true} = {}) {
  // river: two wavy banks and ripple ticks
  for (const off of [-40, 40]) { const pts = []; for (let d = 0; d <= RIVER.len; d += 30) { const p = RIVER.P(d); pts.push([p.x - Math.sin(p.a) * off, p.y + Math.cos(p.a) * off]); } D.line(ctx, pts, {w: 4, color: GREY}); }
  for (let d = 60; d < RIVER.len; d += 140) { const p = RIVER.P(d); D.line(ctx, [[p.x - 14, p.y], [p.x - 4, p.y - 5], [p.x + 6, p.y], [p.x + 16, p.y - 5]], {w: 3, color: GREY, amp: 0.3}); }
  // park: trees from above
  for (const [x, y, r] of [[880, 360, 52], [1000, 300, 40], [760, 430, 44], [1030, 560, 48], [800, 640, 38], [940, 520, 30]]) { D.ellipse(ctx, x, y, r, r * 0.95, {fill: WHITE, w: 4.5}); D.ellipse(ctx, x + r * 0.15, y - r * 0.1, r * 0.45, r * 0.42, {w: 3, color: GREY}); }
  // hill: contour rings
  if (hill) for (const [rx, ry] of [[180, 112], [122, 76], [62, 40]]) D.ellipse(ctx, HILL[0], HILL[1], rx, ry, {w: 3.5, color: GREY});
  // his worn loop: five lanes, dense
  const lp = LOOP.len;
  for (const [li, off] of [-26, -13, 0, 13, 26].entries()) for (let d = li * 3; d < Math.min(lp, loopUpto); d += 15) {
    const p = LOOP.P(d), h = hash(d * 0.71 + li * 5.3), o = off + (h - 0.5) * 8;
    const age = loopUpto > lp ? 9 : (loopUpto - d) / 60;
    topFlower(ctx, p.x - Math.sin(p.a) * o, p.y + Math.cos(p.a) * o, age, 0.8 + h * 0.3, h * 6);
  }
  // home (roof seen from above) and office (flat roof, vents)
  D.rect(ctx, HOME[0] - 80, HOME[1] - 80, 160, 140, {fill: WHITE, w: 5}); D.line(ctx, [[HOME[0] - 80, HOME[1] - 80], [HOME[0], HOME[1] - 10], [HOME[0] + 80, HOME[1] - 80]], {w: 4}); D.line(ctx, [[HOME[0], HOME[1] - 10], [HOME[0], HOME[1] + 60]], {w: 4});
  D.rect(ctx, OFFICE[0] - 120, OFFICE[1] - 40, 240, 180, {fill: WHITE, w: 5}); D.rect(ctx, OFFICE[0] - 90, OFFICE[1] - 12, 180, 124, {w: 3.5, color: GREY});
  for (const dx of [-50, 0, 50]) D.rect(ctx, OFFICE[0] + dx - 14, OFFICE[1] + 30, 28, 28, {w: 3, color: GREY});
  if (herUpto > 0) trail(ctx, HER, herUpto, {gap: 30, lanes: [-11, 11], seed: 7});
}

// ---------- S1 0–1.6: from above, a perfect circle of flowers; a tiny man walking it ----------
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx); const C = [640, 1138], R = 360, th = -1.2 + t * 0.62;
  for (const [li, off] of [-16, 0, 16].entries()) for (let i = 0; i < 90; i++) {
    const a = i / 90 * 6.283 + li * 0.023, h = hash(i * 3.1 + li), behind = ((th - a) % 6.283 + 6.283) % 6.283;
    const g = behind < 0.5 ? 0.35 + behind * 1.3 : 2; // the flowers he just passed are still popping
    topFlower(ctx, C[0] + Math.cos(a) * (R + off + (h - 0.5) * 8), C[1] + Math.sin(a) * (R + off + (h - 0.5) * 8), g, 0.9 + h * 0.3, h * 6);
  }
  topMan(ctx, C[0] + Math.cos(th) * R, C[1] + Math.sin(th) * R, th + Math.PI / 2, twos(t) * 1.9, 1.35);
  for (const k of [0.15, 0.55, 0.95, 1.35]) at(t, k, 'flower', 0.35);
}, {cam: lt => ({z: lerp(1.42, 1.3, ease(lt / 1.6)), fx: 640, fy: 1138}), hand: 0.6});

// ---------- S2 1.6–2.9: premise card ----------
shot(1.6, 2.9, (ctx, lt, t) => { bg(ctx); at(t, 1.6, 'cut'); card(ctx, [['WHAT IF EVERY STEP', INK], ['GREW A FLOWER?', PINK]], {lt, size: 96}); });

// side-view street: grey buildings in the back so the walk reads as travel
function street(ctx, x0 = -800, x1 = 4200) {
  bg(ctx);
  for (let x = x0, i = 0; x < x1; x += 560, i++) { const h = 520 + hash(i * 1.7) * 360, w = 300 + hash(i * 2.3) * 120;
    D.rect(ctx, x, GROUND - h, w, h, {w: 4, color: '#C9C9C9'});
    for (let wy = GROUND - h + 60; wy < GROUND - 140; wy += 110) for (let wx = x + 40; wx < x + w - 60; wx += 90) D.rect(ctx, wx, wy, 44, 56, {w: 3, color: '#D6D6D6'}); }
  floor(ctx, x0, x1);
}
/** the flowers his steps have left: walking from x0 at f cycles/s, `ph` = current phase */
function stepFlowers(ctx, x0, f, ph, {s = S, k0 = 0, ground = () => GROUND, h = 86} = {}) {
  const v = STRIDE * s;
  for (let k = k0; k / 2 + 0.5 <= ph + 1e-6; k++) {
    const xk = x0 + v * (k / 2) + 55 * s, g = (ph - (k / 2 + 0.5)) / 0.35, hh = hash(k * 1.3);
    flower(ctx, xk + (hh - 0.5) * 20, ground(xk) + 4, g, {h: h * (0.85 + hh * 0.35), sway: (hh - 0.5) * 16});
  }
}

// ---------- S3 2.9–8.0: DAY 1 — a flower sprouts behind every step; he's delighted ----------
{
  const F = 1.25, X0 = 140, v = STRIDE * S * F;
  shot(2.9, 8.0, (ctx, lt, t) => {
    street(ctx); const T = twos(lt), ph = T * F, x = X0 + v * T;
    stepFlowers(ctx, X0, F, ph);
    const yay = lt > 3.1 && lt < 4.1, look = lt > 1.0 && lt < 3.0;
    const arms = yay ? {lh: [-110, -560], rh: [120, -565]} : {};
    const p = fwalk(ph, {lean: yay ? -0.02 : 0.05, headLean: look ? -0.12 : 0, ...arms});
    if (yay) p.elbow = [1, 1];
    const face = lt < 1.0 ? {gx: 0.5, mouth: 'flat'} : lt < 1.9 ? {gx: -0.9, gy: 0.7, mouth: 'O', eyes: 'wide'} : lt < 3.0 ? {gx: -0.8, gy: 0.5, mouth: 'grin', eyes: 'happy'}
      : yay ? {gx: 0.3, gy: -0.3, mouth: 'grin', eyes: 'happy'} : {gx: lt > 4.6 ? -0.7 : 0.5, gy: lt > 4.6 ? 0.5 : 0, mouth: 'smile', eyes: blink(t)};
    guy(ctx, x, GROUND, S, p, face);
    for (let k = 1; k <= 12; k++) { at(t, 2.9 + (k / 2 + 0.5) / F, 'flower', 0.45); at(t, 2.9 + (k / 2) / F, 'step', 0.18); }
    at(t, 2.9, 'flower', 0.4); at(t, 6.0, 'boing', 0.25);
  }, {cam: lt => { const x = X0 + v * lt; return {z: lerp(1.28, 1.38, ease(lt / 5.1)), fx: x + 40, fy: 1250}; }, hand: 1.2,
    overlay: (ctx, lt) => label(ctx, 'DAY 1', {lt})});
}

// ---------- S4a 8.0–10.4: the same walk, every day — DAY 90, DAY 365; the ground is all flowers ----------
function carpet(ctx, a, b, {seed = 0, h = 80, ground = () => GROUND} = {}) {
  for (let x = a, i = 0; x < b; x += 30, i++) { const hh = hash(i * 1.91 + seed);
    flower(ctx, x + (hh - 0.5) * 22, ground(x) + 4, 2, {h: h * (0.7 + hh * 0.5), sway: (hh - 0.5) * 22, s: 0.85 + hh * 0.25}); }
}
{
  const F = 1.25, X0 = 100, v = STRIDE * S * F;
  shot(8.0, 10.4, (ctx, lt, t) => {
    street(ctx); const T = twos(lt), ph = T * F, x = X0 + v * T;
    carpet(ctx, -900, 3600, {seed: 3});
    guy(ctx, x, GROUND, S, fwalk(ph, {lean: 0.07, headLean: 0.06}), {gx: 0.4, gy: 0.3, mouth: 'flat', eyes: lt > 1.2 ? 'squint' : blink(t, 1)});
    for (let k = 1; k <= 6; k++) at(t, 8.0 + (k / 2) / F, 'step', 0.3);
  }, {cam: lt => { const x = X0 + v * lt; return {z: lerp(1.3, 1.36, lt / 2.4), fx: x + 40, fy: 1250}; }, hand: 1,
    overlay: (ctx, lt, t) => { label(ctx, lt < 1.2 ? 'DAY 90' : 'DAY 365', {lt: lt < 1.2 ? lt : lt - 1.2}); at(t, 8.0, 'tick', 0.5); at(t, 9.2, 'tick', 0.6); }});
}

// ---------- S4b 10.4–13.0: from above — one thick worn loop, home -> office -> home ----------
shot(10.4, 13.0, (ctx, lt, t) => {
  bg(ctx); drawMap(ctx, {});
  const d = (t * 520) % LOOP.len, p = LOOP.P(d);
  topMan(ctx, p.x, p.y, p.a, twos(t) * 2.2, 1.15);
  at(t, 10.4, 'whoosh', 0.35); for (const k of [10.9, 11.6, 12.3]) at(t, k, 'step', 0.2);
}, {cam: lt => ({z: lerp(1.45, 1.05, ease(lt / 2.4)), fx: lerp(400, 560, ease(lt / 2.4)), fy: lerp(1150, 1160, ease(lt / 2.4))}), hand: 0.6,
  overlay: ctx => label(ctx, 'DAY 365')});

// ---------- S5 13.0–19.0: someone else's path wanders everywhere — park, river, hill ----------
const herD = lt => HER.len * (0.04 + 0.96 * (lt / 6) ** 0.95);
shot(13.0, 19.0, (ctx, lt, t) => {
  bg(ctx); const hd = herD(twos(lt));
  drawMap(ctx, {herUpto: hd});
  const d = (t * 520) % LOOP.len, p = LOOP.P(d); topMan(ctx, p.x, p.y, p.a, twos(t) * 2.2, 1.0);
  const q = HER.P(hd); topMan(ctx, q.x, q.y, q.a, twos(t) * 2.4, 1.1, {cap: true});
  for (let k = 0; k < 12; k++) at(t, 13.25 + k * 0.48, 'flower', 0.22);
}, {cam: lt => { const q = HER.P(herD(lt)); return {z: lerp(1.0, 0.92, lt / 6), fx: lerp(720, q.x, 0.35), fy: lerp(1120, q.y, 0.3)}; }, hand: 0.6});

// ---------- S6 19.0–25.0: he stops at the edge of his loop; one step off it; a single flower in new ground ----------
{
  const X = 600, EDGE = 760;
  shot(19.0, 25.0, (ctx, lt, t) => {
    street(ctx); carpet(ctx, -900, EDGE, {seed: 5}); const T = twos(lt);
    const base = breathe(STAND, lt);
    const p = kf([[0, base], [3.0, base], [3.45, {...STAND, hip: [-10, -212], lean: -0.06, lh: [-90, -140], rh: [60, -110]}],
      [3.9, {...STAND, hip: [10, -226], lean: 0.02, rf: [110, -70], lh: [-130, -170], rh: [120, -170], elbow: [1, -1]}],
      [4.3, {...STAND, hip: [55, -214], lean: 0.08, rf: [175, 0], lh: [-110, -150], rh: [110, -140], elbow: [1, -1]}],
      [5.2, {...STAND, hip: [60, -214], lean: 0.12, headLean: 0.15, rf: [175, 0], lh: [-80, -115], rh: [120, -110]}]], T);
    const fx = X + (175 + 70) * S;
    flower(ctx, fx, GROUND + 4, (lt - 4.45) / 0.35, {h: 92});
    const face = lt < 1.3 ? {gx: 0.7, mouth: 'flat', eyes: blink(t)} : lt < 2.3 ? {gx: -0.85, gy: 0.3, mouth: 'flat'} : lt < 3.0 ? {gx: 0.6, gy: 0.7, mouth: 'wavy', eyes: lt > 2.6 && lt < 2.7 ? 'closed' : undefined}
      : lt < 4.45 ? {gx: 0.6, gy: 0.8, mouth: 'flat'} : lt < 5.0 ? {gx: 0.7, gy: 0.9, mouth: 'O', eyes: 'wide'} : {gx: 0.7, gy: 0.9, mouth: 'smile'};
    guy(ctx, X, GROUND, S, p, face);
    at(t, 19.0 + 4.3, 'step', 0.35); at(t, 19.0 + 4.45, 'flower', 0.9);
  }, {cam: lt => ({z: lerp(1.3, 1.62, ease((lt - 1.0) / 4.5)), fx: lerp(640, 830, ease((lt - 1.0) / 4.5)), fy: lerp(1240, 1300, ease((lt - 1.0) / 4.5))}), hand: 1});
}

// ---------- S7 25.0–31.0: he walks somewhere new; flowers spread up a hill ----------
{
  const F = 1.1, X0 = 120, v = STRIDE * S * F, H0 = 640, SL = 0.27;
  const gy = x => GROUND - (x < H0 ? 0 : x < H0 + 300 ? SL * (x - H0) ** 2 / 600 : SL * (x - H0 - 150));
  const slope = x => x < H0 ? 0 : x < H0 + 300 ? SL * (x - H0) / 300 : SL;
  shot(25.0, 31.0, (ctx, lt, t) => {
    bg(ctx); const T = twos(lt), ph = T * F, x = X0 + v * T;
    const pts = []; for (let gx = -800; gx < 3400; gx += 40) pts.push([gx, gy(gx)]); D.line(ctx, pts, {w: 5});
    // a lone tree near the top
    const TX = 2350; D.line(ctx, [[TX, gy(TX)], [TX + 6, gy(TX) - 300]], {w: 7}); D.ellipse(ctx, TX + 6, gy(TX) - 400, 130, 115, {fill: WHITE, w: 5});
    carpet(ctx, -900, 60, {seed: 9});
    // each step's flower, plus two neighbours that spread from it
    for (let k = 1; k / 2 + 0.5 <= ph + 1e-6; k++) {
      const xk = X0 + v * (k / 2) + 55 * S, g = (ph - (k / 2 + 0.5)) / 0.35, hh = hash(k * 2.9);
      flower(ctx, xk + 34, gy(xk + 34) + 4, g - 1.4, {h: 60, s: 0.8, sway: 8});
      flower(ctx, xk - 30, gy(xk - 30) + 4, g - 2.2, {h: 66, s: 0.85, sway: -8});
      flower(ctx, xk, gy(xk) + 4, g, {h: 88 * (0.85 + hh * 0.3), sway: (hh - 0.5) * 16});
    }
    const p = fwalk(ph, {lean: 0.1 + slope(x) * 0.25}), sl = slope(x);
    p.lf = [p.lf[0], p.lf[1] - sl * p.lf[0]]; p.rf = [p.rf[0], p.rf[1] - sl * p.rf[0]];
    guy(ctx, x, gy(x), S, p, {gx: lt > 3.6 && lt < 4.6 ? -0.7 : 0.6, gy: lt > 3.6 && lt < 4.6 ? 0.5 : -0.25, mouth: lt > 1.0 ? 'grin' : 'smile', eyes: lt > 1.0 && lt < 2.2 ? 'happy' : blink(t, 0.7)});
    for (let k = 1; k <= 13; k++) { at(t, 25.0 + (k / 2 + 0.5) / F, 'flower', 0.3); at(t, 25.0 + (k / 2) / F, 'step', 0.15); }
    at(t, 26.2, 'birds', 0.35);
  }, {cam: lt => { const x = X0 + v * lt; return {z: lerp(1.32, 1.24, ease(lt / 6)), fx: x + 130, fy: gy(x + 130) - 290}; }, hand: 1.2});
}

// ---------- S8 31.0–36.0: from above, his new path crosses hers; the two trails continue as one ----------
shot(31.0, 36.0, (ctx, lt, t) => {
  bg(ctx); const T = twos(lt);
  drawMap(ctx, {herUpto: HER.len + 40});
  const arrive = 1.9, go = 2.7;
  const myD = Math.min(HIS_NEW.len, HIS_NEW.len * (0.35 + 0.65 * T / arrive)), herE = Math.min(HER_EXT.len, HER_EXT.len * (0.35 + 0.65 * T / arrive));
  trail(ctx, HIS_NEW, myD + 30, {gap: 26, lanes: [-11, 11], seed: 3});
  trail(ctx, HER_EXT, herE + 30, {gap: 30, lanes: [-11, 11], seed: 11});
  const jd = Math.max(0, (T - go) * 330);
  if (jd > 0) trail(ctx, JOINT, jd, {gap: 22, lanes: [-14, 0, 14], seed: 5});
  if (T < go) {
    const a = HIS_NEW.P(myD), b = HER_EXT.P(herE), met = T >= arrive;
    topMan(ctx, met ? 625 : a.x, met ? 1180 : a.y, met ? -0.1 : a.a, met ? 0 : T * 2.2, 1.15);
    topMan(ctx, met ? 700 : b.x, met ? 1172 : b.y, met ? Math.PI - 0.1 : b.a, met ? 0 : T * 2.2, 1.15, {cap: true});
  } else {
    const q = JOINT.P(jd), nx = -Math.sin(q.a), ny = Math.cos(q.a);
    topMan(ctx, q.x - nx * 36, q.y - ny * 36, q.a, T * 2.2, 1.15);
    topMan(ctx, q.x + nx * 36, q.y + ny * 36, q.a, T * 2.2 + 0.5, 1.15, {cap: true});
  }
  at(t, 31.0 + arrive, 'chime', 0.4); for (let k = 0; k < 7; k++) at(t, 31.0 + go + 0.15 + k * 0.32, 'flower', 0.25);
}, {cam: lt => ({z: lerp(1.75, 0.92, ease((lt - 1.4) / 3.4)), fx: lerp(660, 760, ease((lt - 1.4) / 3.4)), fy: lerp(1180, 1080, ease((lt - 1.4) / 3.4))}), hand: 0.6});

// ---------- sound ----------
bed('wind', 0, 1.6, 0.4);
bed('street', 2.9, 10.4, 0.45); music('playful', 2.9, 18.8, 0.75);
bed('silence', 19.0, 23.4); bed('wind', 23.5, 25.0, 0.35);
music('tender', 24.8, 31.0, 0.8); bed('wind', 25.0, 31.0, 0.3);
music('resolve', 30.9, 36.0, 0.85);
await run({dir: DIR, duration: 36.0});
