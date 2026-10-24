// Hand-drawn B1-style drawing kit: wobbly pen lines, a slender stick figure built from joints, simple props.
import {createCanvas} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import fs from 'node:fs';

export const INK = '#1d1d1b', RED = '#EC4338', YELLOW = '#F6C945', STICKY = '#FBE7A1', GREEN = '#3FA466',
  NAVY = '#2B3A55', BLUE = '#7EC8E3', PAPER = '#FFFFFF', GRAY = '#9A9A94', WOOD = '#E9C89A';

let seed = 1, LWK = 1, AMPK = 1, INKC = INK, HAIR = true;
export function setLW(k) { LWK = k; }
export function setStyle({ink, amp, hair, lw} = {}) { if (ink) INKC = ink; if (amp !== undefined) AMPK = amp; if (hair !== undefined) HAIR = hair; if (lw !== undefined) LWK = lw; }
export const ink = () => INKC;
export function reseed(s) { seed = s; }
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function sheet(w, h) {
  const c = createCanvas(w, h), ctx = c.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  return {c, ctx, save: file => fs.writeFileSync(file, c.toBuffer('image/png'))};
}

// Densify a polyline and push each point sideways by smooth low-frequency noise: the "pen wobble".
function wobble(pts, amp) {
  const out = [], ph = [rnd() * 6.28, rnd() * 6.28], f = [0.035 + rnd() * 0.02, 0.09 + rnd() * 0.04];
  let dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(len / 6));
    const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
    for (let k = 0; k < n; k++) {
      const t = k / n, d = dist + len * t, o = amp * (0.7 * Math.sin(d * f[0] + ph[0]) + 0.3 * Math.sin(d * f[1] + ph[1]));
      out.push([ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o]);
    }
    dist += len;
  }
  out.push(pts.at(-1));
  return out;
}
function trace(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  ctx.lineTo(...pts.at(-1));
}
// Quadratic bend through a, b with the midpoint pushed sideways by `bend`.
export function curve(a, b, bend = 0, n = 10) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const cx = mx - (b[1] - a[1]) / len * bend, cy = my + (b[0] - a[0]) / len * bend;
  return Array.from({length: n + 1}, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; });
}
export function line(ctx, pts, {w = 6, color, amp = 1.6, fill} = {}) {
  color = color || INKC; const p = wobble(pts, amp * AMPK);
  if (fill) { trace(ctx, p); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  trace(ctx, p); ctx.strokeStyle = color; ctx.lineWidth = w * LWK; ctx.stroke();
}
export function poly(ctx, pts, opts = {}) { line(ctx, [...pts, pts[0], pts[1]], opts); }
export function rect(ctx, x, y, w, h, opts = {}) {
  if (opts.fill) { ctx.fillStyle = opts.fill; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); }
  line(ctx, [[x - 3, y], [x + w + 2, y + 1], [x + w, y + h + 2], [x - 1, y + h], [x + 1, y - 4]], {...opts, fill: undefined});
}
export function ellipse(ctx, cx, cy, rx, ry, {rot = 0, fill, w = 5, color, amp = 0.8, open = 0.12} = {}) {
  const a0 = rnd() * 6.28, n = 48, pts = [];
  for (let i = 0; i <= n * (1 + open); i++) {
    const a = a0 + i / n * 6.283, r = 1 + 0.025 * Math.sin(a * 3 + a0);
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  if (fill) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 6.283); ctx.fillStyle = fill; ctx.fill(); }
  if (w) line(ctx, pts, {w, color, amp});
}
export function dot(ctx, x, y, rx, ry, color, rot = 0) { color = color || INKC; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 6.283); ctx.fillStyle = color; ctx.fill(); }
export function text(ctx, s, x, y, {size = 40, color = INK, font = 'Chalk', weight = 700, align = 'center', rot = 0} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); ctx.restore();
}

// ---- the figure -------------------------------------------------------------------------------
// j: {head:[x,y], tilt, neck, hip, le, lh, re, rh, lk, lf, rk, rf} ; face: {gx, gy, brows, mouth, sweat, tears, lines}
// "l*" limbs are drawn first (behind), "r*" in front. Feet point along `foot` (+1 right, -1 left).
export const R = 58;
export function figure(ctx, j, face = {}, {foot = 1, lw = 6} = {}) {
  const limb = (a, b, c, bend = 0) => line(ctx, [...curve(a, b, bend, 6), ...curve(b, c, bend, 6).slice(1)], {w: lw});
  const hand = (e, h) => { const a = Math.atan2(h[1] - e[1], h[0] - e[0]); ellipse(ctx, h[0] + Math.cos(a) * 6, h[1] + Math.sin(a) * 6, 11, 8.5, {rot: a, fill: PAPER, w: 4.5}); };
  const footFn = (k, f, dir) => ellipse(ctx, f[0] + dir * 13, f[1] - 4, 22, 8.5, {rot: dir * -0.06, fill: PAPER, w: 4.5});
  const fd = j.footDir || [foot, foot];
  // back limbs
  limb(j.hip, j.lk, j.lf, j.lkb || 0); footFn(j.lk, j.lf, fd[0]);
  limb(j.sh, j.le, j.lh, j.leb || 0); if (!j.lhHidden) hand(j.le, j.lh);
  // torso: one long slightly bowed line from the neck to the hip
  line(ctx, curve(j.neck, j.hip, j.torsoBend || 0, 12), {w: lw});
  limb(j.hip, j.rk, j.rf, j.rkb || 0); footFn(j.rk, j.rf, fd[1]);
  limb(j.sh, j.re, j.rh, j.reb || 0); if (!j.rhHidden) hand(j.re, j.rh);
  if (!j.handOverFace) head(ctx, j.head, j.tilt || 0, face);
  else { head(ctx, j.head, j.tilt || 0, face); limb(j.sh, j.re, j.rh, j.reb || 0); hand(j.re, j.rh); }
}
export function head(ctx, [cx, cy], tilt, f) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
  ellipse(ctx, 0, 0, R, R * 1.02, {fill: PAPER, w: 6});
  if (HAIR) { line(ctx, curve([-6, -R + 2], [-16, -R - 20], 6, 6), {w: 4.5}); line(ctx, curve([4, -R + 1], [8, -R - 22], -5, 6), {w: 4.5}); }
  const gx = (f.gx ?? 0) * 17, gy = (f.gy ?? 0) * 12, sp = 19 - Math.abs(f.gx ?? 0) * 4;
  const eyeY = -6 + gy, ex = [gx - sp, gx + sp];
  const squint = f.eyes === 'squint', wide = f.eyes === 'wide', closed = f.eyes === 'closed';
  for (const [i, x] of ex.entries()) {
    const m = i === 0 ? 1 : -1;
    if (closed || (f.eyes === 'oneOpen' && i === 0)) line(ctx, curve([x - 9, eyeY + 2], [x + 9, eyeY + 2], 5, 5), {w: 4.5});
    else if (f.eyes === 'happy') line(ctx, curve([x - 10, eyeY + 4], [x + 10, eyeY + 4], -8, 6), {w: 5});
    else if (squint) line(ctx, [[x - 9 * m, eyeY - 4], [x + 8 * m, eyeY + 2], [x - 8 * m, eyeY + 7]], {w: 4.5, amp: 0.4});
    else dot(ctx, x, eyeY, wide ? 8.5 : 6.5, wide ? 12.5 : 10);
    if (wide) dot(ctx, x + 2, eyeY - 4, 2.4, 2.4, PAPER);
  }
  const by = eyeY - 22, b = f.brows || 'flat';
  for (const [i, x] of ex.entries()) {
    const s = i === 0 ? -1 : 1; // -1 left brow, +1 right brow
    const inner = [x - s * 4, by], outer = [x + s * 11, by];
    if (b === 'up') line(ctx, curve([x - 10, by - 6], [x + 10, by - 6], -6, 5), {w: 4.5});
    else if (b === 'worried') line(ctx, [[outer[0], by + 4], [inner[0], by - 8]], {w: 5, amp: 0.4});
    else if (b === 'angry') line(ctx, [[outer[0], by - 6], [inner[0], by + 5]], {w: 5.5, amp: 0.4});
    else if (b === 'flat') line(ctx, [[x - 10, by], [x + 10, by - 1]], {w: 4.5, amp: 0.4});
  }
  const mx = gx * 0.75, my = 30 + gy * 0.5, m = f.mouth || 'smile';
  if (m === 'grin') {
    ctx.beginPath(); ctx.moveTo(mx - 25, my - 6); ctx.quadraticCurveTo(mx, my + 40, mx + 25, my - 6); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.moveTo(mx - 22, my - 4); ctx.lineTo(mx + 22, my - 4); ctx.quadraticCurveTo(mx, my + 7, mx - 22, my - 4); ctx.fillStyle = PAPER; ctx.fill();
    ctx.beginPath(); ctx.ellipse(mx + 3, my + 17, 9, 5, 0, 0, 6.28); ctx.fillStyle = '#E8796F'; ctx.fill();
  } else if (m === 'smile') line(ctx, curve([mx - 17, my - 2], [mx + 17, my - 2], 11, 8), {w: 5});
  else if (m === 'frown') line(ctx, curve([mx - 15, my + 6], [mx + 15, my + 6], -9, 8), {w: 5});
  else if (m === 'O') ellipse(ctx, mx, my + 2, 9, 12, {fill: INK, w: 3});
  else if (m === 'shout') { ellipse(ctx, mx, my + 4, 17, 15, {fill: INK, w: 3}); dot(ctx, mx, my + 12, 9, 5, '#E8796F'); }
  else if (m === 'strain') {
    ellipse(ctx, mx, my + 2, 24, 12, {fill: PAPER, w: 4.5});
    line(ctx, [[mx - 21, my + 2], [mx + 21, my + 2]], {w: 3, amp: 0.3});
    for (const t of [-12, -2, 8, 17]) line(ctx, [[mx + t, my - 8], [mx + t, my + 12]], {w: 2.5, amp: 0.2});
  } else if (m === 'wavy') line(ctx, [[mx - 16, my + 2], [mx - 8, my - 3], [mx, my + 3], [mx + 8, my - 3], [mx + 16, my + 2]], {w: 4.5, amp: 0.3});
  else if (m === 'flat') line(ctx, [[mx - 12, my + 1], [mx + 12, my]], {w: 5, amp: 0.3});
  if (f.sweat) for (const [sx, sy, s] of [[R + 14, -22, 1], [R + 30, 2, 0.75]]) {
    ctx.beginPath(); ctx.moveTo(sx, sy - 13 * s); ctx.quadraticCurveTo(sx + 9 * s, sy + 2 * s, sx, sy + 7 * s); ctx.quadraticCurveTo(sx - 9 * s, sy + 2 * s, sx, sy - 13 * s);
    ctx.fillStyle = '#CDEBF7'; ctx.fill(); ctx.strokeStyle = '#4FA6CC'; ctx.lineWidth = 3; ctx.stroke();
  }
  if (f.lines) for (const [a, l] of [[-0.9, 1], [-0.55, 1.2], [-0.2, 1]]) {
    const r0 = R + 18, r1 = R + 18 + 22 * l, s = f.lines; // little "pop" marks beside the head
    line(ctx, [[s * Math.cos(a) * r0, Math.sin(a) * r0], [s * Math.cos(a) * r1, Math.sin(a) * r1]], {w: 4, amp: 0.2});
  }
  ctx.restore();
}

// Build joints from a few intentions: hip position, lean, and per-limb end targets. Two-bone IK keeps limb lengths.
export const L = {torso: 185, upper: 92, fore: 88, thigh: 112, shin: 112};
function ik(a, t, l1, l2, side) {
  let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.995; if (d > max) { t = [a[0] + dx / d * max, a[1] + dy / d * max]; dx = t[0] - a[0]; dy = t[1] - a[1]; d = max; }
  const ang = Math.atan2(dy, dx), k = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const e = ang + side * k;
  return [[a[0] + Math.cos(e) * l1, a[1] + Math.sin(e) * l1], t];
}
// p: {hip, lean (rad, + leans right), headTilt, lh, rh, lf, rf, elbow:[l,r] (+1/-1 bend side), knee:[l,r]}
export function pose(p) {
  const lean = p.lean || 0, hip = p.hip;
  const neck = [hip[0] + Math.sin(lean) * L.torso, hip[1] - Math.cos(lean) * L.torso];
  const hl = lean + (p.headLean || 0), head = [neck[0] + Math.sin(hl) * (R + 1), neck[1] - Math.cos(hl) * (R + 1)];
  const sh = [neck[0] - Math.sin(lean) * -18, neck[1] + Math.cos(lean) * 18]; // shoulders a little below the neck
  const [le, lh] = ik(sh, p.lh, L.upper, L.fore, (p.elbow || [1, -1])[0]);
  const [re, rh] = ik(sh, p.rh, L.upper, L.fore, (p.elbow || [1, -1])[1]);
  const [lk, lf] = ik(hip, p.lf, L.thigh, L.shin, (p.knee || [-1, -1])[0]);
  const [rk, rf] = ik(hip, p.rf, L.thigh, L.shin, (p.knee || [-1, -1])[1]);
  return {head, tilt: p.headTilt || 0, neck, sh, hip, le, lh, re, rh, lk, lf, rk, rf, torsoBend: p.torsoBend || 0, footDir: p.footDir, lhHidden: p.lhHidden, rhHidden: p.rhHidden, handOverFace: p.handOverFace};
}
