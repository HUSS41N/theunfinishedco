import {useFrame} from './layout.mjs';
// v3 scene engine: JSON scene → one layered SVG document per frame.
// Frame stack (contract §5): set.back → actors marked behind → set.mid → props(back) → actors (by z, then y) → props(front)
// → set.front → bubbles → screen text → overlays and shot transitions.
// Motion (src/motion.mjs): spline keyframes, overlapping action, blended actions, planted-foot walk, idle life, smooth camera.
import {el, layer, g, rect, path, circle, text as svgText, tr, resetIds, id as svgId} from './svg.mjs';
import {defineCharacter, buildCharacter, POSES, DIM} from './character.mjs';
import {sceneProp} from './props.mjs';
import {buildSet} from './backgrounds.mjs';
import {TEXT} from './style.mjs';
import {EASE, clamp, lerp, mix, hash, noise, envelope, blendWeight, sampleTrack, solveIK, fromAngle, planWalk, walkState, ACTIONS, stillBlink} from './motion.mjs';

export {EASE};
// screen text, speech bubbles and the text linter live in text.mjs (owner: text). Bubbles are placed in screen space
// through toScreen (world → screen, the same maths as the 'world' layer, shake included).
import * as TXM from './text.mjs';
// light, grade and atmosphere (owner: world): shot fields grade / lights / atmos / speed, and the sets' live layers
import * as FX from './fx.mjs';
const TX = TXM;
export const ready = () => Promise.resolve();
export const textModule = () => TX;

const deep = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
const LIMBS = ['armL', 'armR', 'legL', 'legR'];
/** fill a pose with explicit neutral values so every numeric field interpolates (no snapping when a key adds a field) */
function normPose(p) {
  p.body = {dx: 0, dy: 0, lean: 0, scaleY: 1, ...p.body};
  p.head = {tilt: 0, dx: 0, dy: 0, ...p.head};
  for (const k of LIMBS) p[k] = {a: k.startsWith('arm') ? 8 : 3, b: k.startsWith('arm') ? 4 : 0, la: 1, lb: 1, ...p[k]};
  return p;
}
export function resolvePose(p) {
  if (!p) return normPose(deep(POSES.stand));
  if (typeof p === 'string') { if (!POSES[p]) throw new Error(`unknown pose "${p}"`); return normPose(deep(POSES[p])); }
  const base = p.base ? resolvePose(p.base) : normPose(deep(POSES.stand)); return normPose(mix(base, p, 1));
}

// ---------- keyframe tracks ----------
/** keys [{t, field, ease?, dur?}] → spline points; `dur` inserts a hold so the move into that key takes `dur` seconds */
function buildPts(keys, field, init, map = v => v) {
  const pts = [];
  for (const k of keys) {
    if (!(field in k)) continue;
    const v = map(k[field]);
    if (!pts.length) { if (k.dur && init !== undefined) pts.push({t: k.t - k.dur, v: map(init)}); }
    else if (k.dur && k.t - k.dur > pts.at(-1).t + 1e-6) pts.push({t: k.t - k.dur, v: pts.at(-1).v});
    pts.push({t: k.t, v, ease: k.ease});
  }
  return pts;
}
const sortKeys = keys => keys.map((k, i) => [k, i]).sort((p, q) => p[0].t - q[0].t || p[1] - q[1]).map(p => p[0]);
/** keyframes [{t, ...fields}] → value at time t (shot-relative). Fields absent in a key hold their previous value. */
export function track(keys, t, field, init) {
  const pts = buildPts(keys, field, init);
  if (!pts.length) return init;
  if (t < pts[0].t) return init !== undefined ? init : pts[0].v;
  return sampleTrack(pts, t);
}

// ---------- rig geometry (for IK and reach blending) ----------
function rigOf(C) {
  if (C._rig) return C._rig;
  const B = C.build || {height: 1, limbs: 1, width: 1};
  let r = {L1: DIM.thigh * B.height * B.limbs, L2: DIM.shin * B.height * B.limbs, hipW: DIM.hip * B.width, ankleY: -DIM.footH * 0.5,
    U1: DIM.upper * B.height * B.limbs, U2: DIM.fore * B.height * B.limbs, shoulderW: DIM.shoulder * B.width, torso: DIM.torso * B.height, out: 14};
  if (C.style === 'stick') {   // calibrate on the stick builder: straight legs, read the pelvis (and the foot anchor if any)
    try {
      const ch = buildCharacter(C, normPose({...deep(POSES.stand), legL: {a: 0, b: 0}, legR: {a: 0, b: 0}}), {shadow: false});
      const py = ch.pelvis?.[1], fy = ch.anchors?.footR?.[1];
      if (Number.isFinite(py)) { const L = (Number.isFinite(fy) ? fy : 0) - py; if (L > 50) { const k = L / (r.L1 + r.L2); r = {...r, L1: r.L1 * k, L2: r.L2 * k, ankleY: Number.isFinite(fy) ? fy : 0, hipW: Math.abs(ch.anchors?.footR?.[0] ?? r.hipW * k)}; } }
    } catch { /* placeholder builders: keep the flat geometry */ }
  }
  r.L = r.L1 + r.L2; r.pelvisY = r.ankleY - r.L;
  return (C._rig = r);
}

// ---------- actions ----------
const ACT_BLEND = {wave: 0.45, reach: 0.45, look: 0.25};
const PLANS = new WeakMap();
function walkOf(a, d, Ch, scale) { const rig = rigOf(Ch), sig = `${rig.L}:${scale}`, c = PLANS.get(d);
  if (c && c.sig === sig) return c.plan; const plan = planWalk(d, rig, scale); PLANS.set(d, {sig, plan}); return plan; }

/** pose for a walk at time t: planted-foot IK legs, bob, counter-bob head, swinging arms */
function walkPose(P, st, rig, scale, facing, pose, keepArms) {
  const toLocal = rel => rel * P.dir * facing / scale, sLoc = P.s / scale, fwd = P.dir * facing > 0 ? 1 : -1;
  const reachH = sp => { const h = sp / scale / 2 + rig.out; return Math.sqrt(Math.max(0, rig.L * rig.L - rig.out * rig.out)) - Math.sqrt(Math.max(0, rig.L * rig.L - h * h)); };
  const bob = (st.phase < 0.5 ? reachH(st.spreadA) : reachH(st.spreadB)) * (1 + Math.cos(2 * Math.PI * st.phase)) / 2;
  const out = deep(pose), body = out.body;
  body.dy = (pose.body.dy || 0) + 3 + bob;
  body.lean = (pose.body.lean || 0) + (fwd > 0 ? 3 : -2) * st.speed;
  out.head.dy = (pose.head.dy || 0) - bob * 0.3;
  out.head.tilt = (pose.head.tilt || 0) + bob * 0.06 * fwd;
  const lift = Math.min(P.liftH, sLoc * 0.4 + 6);
  for (const F of ['L', 'R']) {
    const side = F === 'L' ? -1 : 1, foot = st.feet[F];
    const hip = [side * rig.hipW + (body.dx || 0), rig.pelvisY + body.dy];
    const target = [side * (rig.hipW + rig.out) + toLocal(foot.rel), rig.ankleY - foot.lift * lift];
    const ik = solveIK(hip, target, rig.L1, rig.L2, side, side);
    out['leg' + F] = {...out['leg' + F], a: ik.a, b: ik.b, la: 1, lb: 1};
    if (!keepArms) {   // the arm swings with the opposite foot
      // front-view rig: a small scissor (forward arm toward +x) so the hands never meet in front of the body; the forward arm bends more
      const opp = st.feet[F === 'L' ? 'R' : 'L'], f = clamp(toLocal(opp.rel) / (sLoc * 0.5 + 1e-6), -1, 1) * Math.min(1, sLoc / 90);
      out['arm' + F] = {...out['arm' + F], a: 12 + side * f * 9 * P.strideMul, b: 8 + Math.max(0, f) * 14 * (side > 0 ? 1 : -0.3), reach: undefined};
    }
  }
  return out;
}

/** FK hand position (character-local) for reach blending, flat-rig geometry */
function handPos(pose, rig, side) {
  const A = pose['arm' + (side < 0 ? 'L' : 'R')], body = pose.body;
  const sh = [side * rig.shoulderW, -rig.torso + 30], el1 = fromAngle(sh, rig.U1 * (A.la ?? 1), A.a, side), wr = fromAngle(el1, rig.U2 * (A.lb ?? 1), A.a + A.b, side);
  const r = (body.lean || 0) * Math.PI / 180, x = wr[0], y = wr[1] * (body.scaleY || 1);
  return [(body.dx || 0) + x * Math.cos(r) - y * Math.sin(r), rig.pelvisY + (body.dy || 0) + x * Math.sin(r) + y * Math.cos(r)];
}
function reachIK(pose, rig, side, target) {
  const body = pose.body, r = -(body.lean || 0) * Math.PI / 180;
  const px = target[0] - (body.dx || 0), py = target[1] - rig.pelvisY - (body.dy || 0);   // into the upper-body frame
  const lx = px * Math.cos(r) - py * Math.sin(r), ly = (px * Math.sin(r) + py * Math.cos(r)) / (body.scaleY || 1);
  return solveIK([side * rig.shoulderW, -rig.torso + 30], [lx, ly], rig.U1, rig.U2, side, -1);   // elbow down and out
}

/**
 * Pose + offsets for an actor at time τ: keys (spline) then `do` actions with blend in/out. Pure in τ, so the overlap pass
 * can sample it at small time offsets.
 */
function posedAt(ctx, tau) {
  const {a, Ch, posePts, scale, facing, M} = ctx;
  let pose = deep(tau < posePts[0].t ? posePts[0].v : sampleTrack(posePts, tau));
  const fx = {dx: 0, dy: 0, face: {}, walkW: 0};
  const rig = rigOf(Ch);
  for (const d of a.do || []) {
    const from = d.from ?? (d.t ?? -1e9), to = d.to ?? 1e9, lt = tau - (from > -1e8 ? from : 0);
    const blend = d.blend ?? (ACT_BLEND[d.act] ?? M.blend);
    switch (d.act) {
      case 'walk': {
        const P = walkOf(a, d, Ch, scale);
        if (tau >= P.to) { fx.dx += P.D * P.dir * (P.inPlace ? 0 : 1); break; }
        if (tau < P.from) break;
        const st = walkState(P, tau), w = blendWeight(tau, P.from, P.to, blend);
        if (!P.inPlace) fx.dx += st.d * P.dir;
        pose = mix(pose, walkPose(P, st, rig, scale, facing, pose, d.keepArms), w);
        fx.walkW = Math.max(fx.walkW, w);
        break;
      }
      case 'wave': { const w = blendWeight(tau, from, to, blend); if (!w) break; const k = 'arm' + (d.arm || 'R');
        pose[k] = mix(pose[k], {...pose[k], a: d.a ?? 146, b: (d.b ?? 18) + Math.sin(lt * Math.PI * 2 * Math.min(d.rate || 2.4, 4.5)) * (d.amp ?? 24), reach: undefined}, w); break; }
      case 'reach': { const w = blendWeight(tau, from, to, blend); if (!w || !d.target) break; const F = d.arm || 'R', side = F === 'L' ? -1 : 1, k = 'arm' + F;
        const start = handPos(pose, rig, side), target = [lerp(start[0], d.target[0], w), lerp(start[1], d.target[1], w)];
        const ik = reachIK(pose, rig, side, target);
        pose[k] = {...pose[k], a: ik.a, b: ik.b, reach: target}; break; }
      case 'bob': { const w = blendWeight(tau, from, to, blend); fx.dy += w * Math.sin(lt * Math.PI * 2 * Math.min(d.rate || 1.5, 4.5)) * (d.amp || 6); break; }
      case 'laugh': { const w = blendWeight(tau, from, to, blend); if (!w) break; const f = Math.min((d.rate || 7) / 2, 4.5);
        fx.dy += -w * (d.amp || 10) * (1 - Math.cos(2 * Math.PI * f * lt)) / 2; pose.body.lean += w * 2 * Math.sin(2 * Math.PI * f * lt);
        if (tau >= from && tau < to) { fx.face.mouth = 'grin'; fx.face.eyes = d.eyes || 'happy'; } break; }
      case 'tremble': { const w = blendWeight(tau, from, to, blend), amp = d.amp || 3;
        fx.dx += w * amp * noise(a.id + 'tx', tau, 4.6); fx.dy += w * amp * 0.5 * noise(a.id + 'ty', tau, 4.2); break; }
      case 'jump': { if (tau < from - 0.3) break; const dur = d.dur || 0.5, u = clamp(lt / dur); fx.dy -= Math.sin(u * Math.PI) * (d.height || 120);
        const crouch = d.crouch ?? 18;   // a little squash just before take-off and on landing (anticipation / follow-through)
        pose.body.dy += crouch * (Math.exp(-(((lt + 0.08) / 0.07) ** 2)) + Math.exp(-(((lt - dur - 0.06) / 0.08) ** 2))); break; }
      case 'breathe': if (!M.idleOn(a)) pose.body.scaleY *= 1 + Math.sin(tau * 2 * Math.PI * 0.3 + hash(a.id) * 6) * 0.008; break;
      default: if (ACTIONS[d.act]) ACTIONS[d.act](d, {tau, from, to, blend, pose, fx, id: a.id, rig, facing}); break;   // story actions (motion.mjs); face-only actions (blink, talk, chew, look) and turn are handled at the frame time
    }
  }
  return {pose, fx};
}

/** facing sign and turn squash at time t: facing keys and `turn` actions flip through a quick horizontal squash */
const SQ = 0.5;   // narrowest squash of a turn (a full mirror passes through it, it never collapses to a sliver)
function facingAt(ctx, t) {
  const {k, a} = ctx, sgn = tau => (track(k, tau, 'facing', 1) >= 0 ? 1 : -1);
  let sign = sgn(t), sx = 1;
  const hw = 0.12;
  if (sgn(t - hw) !== sgn(t + hw)) {   // near a key flip: find the crossing and squash through it
    let lo = t - hw, hi = t + hw; const s0 = sgn(lo);
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (sgn(m) === s0) lo = m; else hi = m; }
    sx = Math.min(sx, SQ + (1 - SQ) * EASE.inOutSine(clamp(Math.abs(t - (lo + hi) / 2) / hw)));
  }
  for (const d of a.do || []) {
    if (d.act !== 'turn') continue;
    const from = d.from ?? d.t ?? 0, dur = d.dur ?? 0.3, c = from + dur / 2;
    if (t >= c) sign = -sign;
    if (Math.abs(t - c) < dur / 2) sx = Math.min(sx, SQ + (1 - SQ) * EASE.inOutSine(Math.abs(t - c) / (dur / 2)));
  }
  const bump = (1 - sx) / (1 - SQ);   // 0 normally, 1 at the flip
  return {sign, sx, sy: 1 - bump * 0.025, bump};
}

function blinkAt(seed, t, every) {
  const period = every || 3.1 + hash(seed) * 1.4, ph = (((t + hash(seed + 'b') * period) % period) + period) % period, dur = 0.16;
  return ph < dur ? Math.sin(Math.PI * ph / dur) : 0;
}

/** one actor at shot time lt → {svg, z, y, behind, speaker} */
function actorAt(C, shot, a, lt) {
  const W = C.W, M = C.motion;
  const Ch = C.cast[a.id]; if (!Ch) throw new Error(`actor "${a.id}" is not in cast`);
  const k = sortKeys([{t: 0, x: a.x ?? W / 2, y: a.y ?? 1500, scale: a.scale ?? 1, facing: a.facing ?? 1, pose: a.pose || 'stand', face: a.face || {}, hold: a.hold || {}, opacity: a.opacity ?? 1, rot: a.rot ?? 0}, ...(a.keys || [])]);
  const posePts = a._posePts || (a._posePts = buildPts(k, 'pose', 'stand', resolvePose));
  const scale = track(k, lt, 'scale', 1), fc = {k, a};
  const turn = facingAt(fc, lt);
  const ctx = {a, Ch, posePts, scale, facing: turn.sign, M};
  // overlapping action: the torso and legs lead, the head, upper arm, forearm and wrist follow a little later
  const P0 = posedAt(ctx, lt), pose = P0.pose, fx = P0.fx;
  const ov = M.overlap;
  if (ov > 0) {
    pose.head = posedAt(ctx, lt - 0.04 * ov).pose.head;
    const Pa = posedAt(ctx, lt - 0.03 * ov).pose, Pb = posedAt(ctx, lt - 0.07 * ov).pose, Pc = posedAt(ctx, lt - 0.10 * ov).pose;
    for (const arm of ['armL', 'armR']) {
      const A = pose[arm]; if (!A) continue;
      const absA = Pa[arm].a, absB = Pb[arm].a + Pb[arm].b, absC = Pc[arm].a + Pc[arm].b + (Pc[arm].c || 0);
      A.a = absA; A.b = absB - absA; if (A.c !== undefined || Pc[arm].c) A.c = absC - absB;
      if (A.reach) A.reach = Pa[arm].reach || A.reach;
    }
  }
  // face: pose-level face, then the actor's face track, then face actions
  const face = {...(pose.face || {}), ...track(k, lt, 'face', {})};
  const within = d => lt >= (d.from ?? -1e9) && lt < (d.to ?? 1e9);
  let explicitBlink = false;
  for (const d of a.do || []) {
    if (d.act === 'blink') { explicitBlink = true; if (within(d)) face.blink = Math.max(face.blink || 0, blinkAt(a.id, lt, d.every)); }
    else if (d.act === 'talk' && within(d)) face.mouth = Math.floor((lt - (d.from ?? 0)) * (d.rate || 7)) % 3 === 0 ? (d.closed || 'smile') : (d.open || 'open');
    else if (d.act === 'chew' && within(d)) face.mouth = Math.floor((lt - (d.from ?? 0)) * (d.rate || 4)) % 2 ? 'chew' : 'flat';
    else if (d.act === 'look') { const w = blendWeight(lt, d.from ?? -1e9, d.to ?? 1e9, d.blend ?? ACT_BLEND.look);
      if (w > 0) { if (d.look) face.look = mix(face.look || [0, 0], d.look, w); if (d.turn !== undefined) face.turn = mix(face.turn || 0, d.turn, w); } }
  }
  Object.assign(face, fx.face);
  const say = TX.talking ? TX.talking(shot, lt, a.id) : null;   // a speech bubble is live: flap the mouth
  if (say && say.talk !== false && a.talk !== false && track(k, lt, 'tint', a.tint || null) !== 'frozen' && !(a.do || []).some(d => d.act === 'talk' && within(d))) face.mouth = Math.floor((lt - (say.from ?? 0)) * 7) % 3 === 0 ? 'smile' : 'open';
  if (turn.bump > 0) face.turn = lerp(face.turn || 0, -0.85, turn.bump);   // the face leads the turn toward the new side
  // idle life: breathing, a slow weight shift, a drifting head, blinks. All smooth noise under 0.5 Hz.
  // (an actor with `still: true` gets none of it: only a rare, slow blink. A cast `life` {rate, amp, blink} slows it, e.g. age "old")
  if (a.still) { if (!explicitBlink) face.blink = Math.max(face.blink || 0, stillBlink(a.id, lt)); }
  else if (M.idleOn(a)) {
    const still = 1 - fx.walkW, id = a.id, lf = Ch.life || {}, rs = lf.rate ?? 1, am = lf.amp ?? 1, ls = lt * rs;
    pose.body.scaleY = (pose.body.scaleY ?? 1) * (1 + 0.007 * am * Math.sin(2 * Math.PI * 0.27 * ls + hash(id) * 6.28));
    pose.body.lean = (pose.body.lean || 0) + 0.7 * am * noise(id + ':lean', ls, 0.22) * still;
    pose.head.tilt = (pose.head.tilt || 0) + 1.1 * am * noise(id + ':head', ls, 0.3);
    for (const arm of ['armL', 'armR']) if (pose[arm] && !pose[arm].reach) pose[arm].a += 1.2 * am * noise(id + arm, ls, 0.35) * still;
    if (!explicitBlink) face.blink = Math.max(face.blink || 0, blinkAt(id, lt, lf.blink));
  }
  for (const L of LIMBS) if (pose[L] && pose[L].reach === undefined) delete pose[L].reach;
  const x = track(k, lt, 'x', W / 2) + fx.dx, y = track(k, lt, 'y', 1500) + fx.dy, facing = turn.sign;
  // character looks (character.mjs): ghost / fade / view / reflection are keyable actor fields
  const look = {ghost: track(k, lt, 'ghost', a.ghost ?? 0), fade: track(k, lt, 'fade', a.fade ?? 0), view: track(k, lt, 'view', a.view ?? 'front'),
    reflection: a.reflection ?? null, ghostTo: a.ghostTo, fadeTo: a.fadeTo, still: !!a.still};
  const ch = buildCharacter(Ch, {...pose, face}, {scale, facing, hold: track(k, lt, 'hold', {}), t: lt, shadow: a.shadow !== false, look});
  const rot = track(k, lt, 'rot', 0), sil = track(k, lt, 'silhouette', a.silhouette || null), tint = track(k, lt, 'tint', a.tint || null);
  let body = ch.svg, defs = '';
  if (sil) { const fid = `sil-${a.id}`; defs = el('filter', {id: fid}, el('feFlood', {'flood-color': sil}), el('feComposite', {in2: 'SourceAlpha', operator: 'in'})); body = g({filter: `url(#${fid})`}, body); }
  else if (tint === 'frozen' || tint === 'grey') { const fid = `tint-${a.id}`; defs = el('filter', {id: fid}, el('feColorMatrix', {type: 'saturate', values: 0}), el('feComponentTransfer', {}, ['R', 'G', 'B'].map(c => el(`feFunc${c}`, {type: 'linear', slope: 0.45, intercept: 0.5})))); body = g({filter: `url(#${fid})`}, body); }
  // anchors → world space (actor transform: translate, rotate, turn squash)
  const local = ch.anchors || estimateAnchors(ch, scale, facing);
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  const anchors = Object.fromEntries(Object.entries(local).map(([n, p]) => { const px = p[0] * turn.sx, py = p[1] * turn.sy; return [n, [x + px * cr - py * sr, y + px * sr + py * cr]]; }));
  return {z: a.z || 0, y, behind: !!a.behind, speaker: {id: a.id, anchors, facing, ghost: !!sil || track(k, lt, 'opacity', 1) < 0.6},
    svg: cropped(a.crop, layer(`actor:${a.id}`, {transform: tr(x, y, rot, turn.sx, turn.sy), opacity: +(track(k, lt, 'opacity', 1) * (ch.opacity ?? 1)).toFixed(3)}, defs ? el('defs', {}, defs) : '', body), a.id)};
}
/** `crop: [x, y, w, h, r]` (world px): show the actor only inside that rounded rect (a mirror, a window pane) */
function cropped(c, svg, id) {
  if (!c) return svg;
  const [x, y, w, h, r = 0] = c, cid = `crop-${id}`;
  return el('clipPath', {id: cid, clipPathUnits: 'userSpaceOnUse'}, rect(x, y, w, h, '#000', {rx: r})) + g({'clip-path': `url(#${cid})`}, svg);
}
/** builders that return no anchors yet: estimate them from the height (actor layer space, scale and facing applied) */
function estimateAnchors(ch, scale, facing) {
  const h = (ch.height || 800) * scale, f = facing;
  return {headTop: [0, -h], headCenter: [0, -h * 0.87], mouth: [f * 12 * scale, -h * 0.8], handL: [-f * 90 * scale, -h * 0.42], handR: [f * 90 * scale, -h * 0.42], footL: [-f * 40 * scale, 0], footR: [f * 40 * scale, 0]};
}

// ---------- compile ----------
/** prefix every id (and its url(#…)/href="#…" references) in an SVG string so two shots can share a frame */
export function prefixIds(svg, p) {
  return String(svg).replace(/\bid="([^"]+)"/g, `id="${p}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`).replace(/href="#([^"]+)"/g, `href="#${p}-$1"`);
}
export const TRANSITIONS = ['cut', 'fade', 'crossfade', 'push', 'whip', 'zoom', 'iris'];
const TDUR = {fade: 0.5, crossfade: 0.4, push: 0.45, whip: 0.3, zoom: 0.4, iris: 0.5};
const transitionOf = shot => { const t = typeof shot.in === 'string' ? {type: shot.in} : shot.in; if (!t || !t.type || t.type === 'cut') return null; return {dir: 'left', color: '#000000', ...t, dur: t.dur ?? TDUR[t.type] ?? 0.4}; };

export function compile(scene, opts = {}) {
  const W = scene.meta?.width || 1080, H = scene.meta?.height || 1920, fps = scene.meta?.fps || 24;
  useFrame(W, H);  // text safe area + type minimums for this frame shape (layout.mjs)
  const style = opts.style || scene.meta?.style || 'flat';
  const cast = Object.fromEntries(Object.entries(scene.cast || {}).map(([id, def]) => [id, defineCharacter({id, ...def, style: opts.style || def.style || style})]));
  resetIds();
  const shots = scene.shots.map((s, i) => { const set = buildSet({preset: 'spotlight', ...(s.set || {}), style: s.set?.style || style}, W, H);
    const pre = v => prefixIds([].concat(v || []).flat(Infinity).join(''), `s${i}`);
    return {...s, _i: i, _set: {back: pre(set.back), mid: pre(set.mid), front: pre(set.front), live: set.live || {}, info: set.info || {}}, _in: transitionOf(s)}; });
  const duration = scene.meta?.duration || Math.max(...shots.map(s => s.end));
  const mm = scene.meta?.motion || {};
  const motion = {overlap: mm.overlap ?? 1, blend: mm.blend ?? 0.2, idle: mm.idle ?? true, idleOn: a => a.idle !== false && (mm.idle ?? true) !== false};
  return {scene, W, H, fps, cast, shots, duration, style, motion, motionBlur: !!scene.meta?.motionBlur};
}

// ---------- camera ----------
function cameraAt(C, shot, lt) {
  const W = C.W, H = C.H;
  const camKeys = sortKeys(shot.camera || [{t: 0, x: W / 2, y: H / 2, zoom: 1}]);
  const cam = {x: track(camKeys, lt, 'x', W / 2), y: track(camKeys, lt, 'y', H / 2), zoom: track(camKeys, lt, 'zoom', 1), rot: track(camKeys, lt, 'rot', 0), sx: 0, sy: 0};
  if (shot.drift) cam.zoom *= 1 + Math.min(0.015, shot.drift === true ? 0.008 : +shot.drift || 0) * lt;   // slow push-in, ≤ 1.5 %/s
  (shot.shake || []).forEach((sh, i) => {
    const env = envelope(lt, sh.from ?? 0, sh.to ?? (sh.from ?? 0) + 0.5, sh.attack ?? 0.06); if (!env) return;
    const amp = Math.min(10, sh.amp ?? 6), f = Math.min(4, sh.freq ?? 3), seed = `shake${shot._i}:${i}`;
    cam.sx += amp * env * noise(seed + 'x', lt, f); cam.sy += amp * env * noise(seed + 'y', lt, f * 0.9); cam.rot += amp * 0.03 * env * noise(seed + 'r', lt, f * 0.7);
  });
  return cam;
}

// ---------- inline text (until text.mjs lands) ----------
function inlineText(shot, lt, W) {
  return (shot.text || []).filter(x => lt >= (x.from ?? 0) && lt < (x.to ?? 1e9)).map(x => {
    const u = clamp((lt - (x.from ?? 0)) / 0.18), s = x.pop === false ? 1 : 0.86 + 0.14 * EASE.back(u), size = x.size || 120;
    const FONTS = {display: ['Inter Display', 900, 'normal', -0.02], serif: ['Instrument Serif', 400, 'italic', -0.01], mono: ['JetBrains Mono', 600, 'normal', 0.06], sans: ['Inter', 600, 'normal', -0.03]};
    const [fam, fw, fst, ftr] = FONTS[x.font || 'display'] || FONTS.display;
    const common = {'text-anchor': x.anchor || 'middle', 'font-family': fam, 'font-weight': x.weight || fw, 'font-style': fst, 'font-size': size, 'letter-spacing': x.tracking ?? ftr * size};
    const lines = String(x.text).split('\n');
    return layer('text', {transform: tr(x.x ?? W / 2, x.y ?? 260, 0, s), opacity: x.pop === false ? 1 : clamp(u * 3)}, lines.map((ln, i) => g({},
      x.shadow === false ? '' : svgText(ln, 0, i * size * 1.05 + size * 0.07, {...common, fill: x.shadowColor || 'rgba(0,0,0,0.35)', transform: `translate(${size * 0.04} 0)`}),
      svgText(ln, 0, i * size * 1.05, {...common, fill: x.color || TEXT.white}))));
  });
}

/** one shot's layers at its local time: the world (camera applied) and the screen layer */
function shotLayers(C, shot, lt, only) {
  const W = C.W, H = C.H, want = name => !only || only === name;
  const cam = cameraAt(C, shot, lt);
  const actors = (shot.actors || []).map(a => actorAt(C, shot, a, lt)).sort((p, q) => p.z - q.z || p.y - q.y);
  const props = layerName => (shot.props || []).filter(p => (p.layer || 'back') === layerName).map(p => { const k = sortKeys([{t: 0, ...p}, ...(p.keys || [])]);
    const fields = new Set(['x', 'y', 'rot', 'scale', 'opacity', ...(p.keys || []).flatMap(kk => Object.keys(kk))]); fields.delete('t'); fields.delete('ease'); fields.delete('dur');
    const live = {...p}; for (const f of fields) live[f] = track(k, lt, f, p[f] ?? (f === 'scale' || f === 'opacity' ? 1 : 0));   // any field can be keyed: rows, progress, text, messages…
    return sceneProp({...live, style: p.style || C.style, t: lt}, lt); });
  const speakers = actors.map(a => a.speaker);
  const camScreen = TX.camToScreen(cam, W, H), toScreen = p => { const q = camScreen(p); return [q[0] + cam.sx, q[1] + cam.sy]; };
  toScreen.zoom = cam.zoom;
  const bubbles = only ? '' : TX.bubbleLayer(shot, lt, C, speakers, toScreen);
  // fx (world owner): the set's live layers (moving exteriors, flickering tubes) and the shot's lights/atmos. All '' for old scenes.
  const fctx = FX.fxFrame(C, shot, lt, cam), fx = want('set') ? FX.fxLayers(fctx) : {}, live = k => (want('set') && shot._set.live?.[k] ? shot._set.live[k](fctx) || '' : '');
  const camT = `translate(${W / 2 + cam.sx} ${H / 2 + cam.sy}) rotate(${cam.rot}) scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`;
  const world = layer('world', {transform: camT},
    live('under'), fx.under || '', want('set') ? shot._set.back : '', live('back'), fx.back || '', want('actors') ? actors.filter(a => a.behind).map(a => a.svg) : '', want('set') ? shot._set.mid || '' : '', live('mid'),
    want('props') ? props('back') : '', want('actors') ? actors.filter(a => !a.behind).map(a => a.svg) : '', want('props') ? props('front') : '', fx.over || '', want('set') ? shot._set.front : '', live('front')) + (fx.screen ? layer('fx:screen', {}, fx.screen) : '');
  // light added after the grade: world-space glows / sweeps / halos, then screen-space headlights and vignette
  const post = (fx.post ? layer('fx:light', {transform: camT}, fx.post) : '') + (fx.postScreen ? layer('fx:light-screen', {}, fx.postScreen) : '');
  const texts = only ? '' : TX.screenText ? TX.screenText(shot, lt, C, speakers, toScreen) : inlineText(shot, lt, W);
  const overlays = only ? '' : (shot.overlay || []).filter(o => lt >= o.from && (lt < o.to || (o.hold && o.type !== 'flash' && o.type !== 'fadeIn'))).map(o => { const u = Math.min(1, (lt - o.from) / (o.to - o.from));   // hold: keep the end state (e.g. a fadeOut stays black) until the shot ends
    if (o.type === 'peephole') { const r = o.r || 420, cx = o.cx || W / 2, cy = o.cy || H * 0.45; return path(`M0 0 H${W} V${H} H0Z M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0Z`, o.color || '#0E0E10', {'fill-rule': 'evenodd'}); }
    const op = o.type === 'flash' ? 1 - u : o.type === 'fadeIn' ? 1 - u : o.type === 'black' ? 1 : u; return rect(0, 0, W, H, o.color || (o.type === 'flash' ? '#FFFFFF' : '#000000'), {opacity: clamp(op)}); });
  return {world, post, screen: layer('screen', {}, bubbles, texts, overlays), speakers};
}

const shotIndexAt = (C, t) => { const i = C.shots.findIndex(s => t >= s.start && t < s.end); return i < 0 ? C.shots.length - 1 : i; };
/** the transition window active at t, if any: {tin, u, i} */
export function transitionAt(C, t) {
  const i = shotIndexAt(C, t), shot = C.shots[i], tin = shot._in;
  if (!tin || i === 0) return null; const lt = t - shot.start;
  return lt < tin.dur ? {tin, u: clamp(lt / tin.dur), i} : null;
}
/** subframes of motion blur to render at t (1 = none): shot `blur`, meta.motionBlur, or a push/whip transition */
export function motionBlurAt(C, t) {
  const i = shotIndexAt(C, t), shot = C.shots[i], tr0 = transitionAt(C, t);
  if (tr0 && (tr0.tin.type === 'whip' || tr0.tin.type === 'push')) return 1;   // slides get an analytic shutter blur (transitionState.blur): 3 subframes strobe at these speeds
  return shot.blur || C.motionBlur ? 3 : 1;
}
/** the shot a time belongs to (for clamping motion-blur subframes inside one shot) */
export const shotRange = (C, t) => { const s = C.shots[shotIndexAt(C, t)]; return [s.start, s.end]; };

// ---------- transitions ----------
const whipEase = x => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);   // inOutQuart: a fast whip in the middle
/**
 * The transition's numbers at t, shared by the SVG compositor (browser) and render.mjs's pixel compositor (resvg panics on
 * clipped shots, so the renderer rasterizes each shot full-frame and composites the buffers).
 * → null | {type, u, dir:[dx,dy], color, prevOff:[x,y], curOff:[x,y], fade (colour amount), show ('prev'|'cur'), alpha (cur over prev),
 *          s1, s2 (zoom scales about the centre), R, cx, cy (iris), blur (px, along dir)}
 */
export function transitionState(C, t) {
  const trn = transitionAt(C, t); if (!trn) return null;
  const {tin, u} = trn, W = C.W, H = C.H, dirs = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}, [dx, dy] = dirs[tin.dir] || dirs.left;
  const st = {type: tin.type, u, dir: [dx, dy], color: tin.color || '#000000', prevOff: [0, 0], curOff: [0, 0], fade: 0, show: null, alpha: 1, s1: 1, s2: 1, R: 0, cx: tin.cx ?? W / 2, cy: tin.cy ?? H / 2, blur: 0};
  const slide = e => { st.prevOff = [dx * W * e, dy * H * e]; st.curOff = [-dx * W * (1 - e), -dy * H * (1 - e)]; };
  // shutter blur: the distance a slide travels during a 0.5-frame shutter, as a directional blur (σ ≈ length / 3)
  const shutter = ease => { const du = 0.25 / C.fps / tin.dur, v = Math.abs(ease(clamp(u + du)) - ease(clamp(u - du))) * (dx ? W : H); return v / 3; };
  switch (tin.type) {
    case 'fade': if (u < 0.5) { st.show = 'prev'; st.fade = EASE.inOutSine(u * 2); } else { st.show = 'cur'; st.fade = 1 - EASE.inOutSine(u * 2 - 1); } break;
    case 'crossfade': st.alpha = EASE.inOutSine(u); break;
    case 'push': slide(EASE.inOutCubic(u)); st.blur = Math.min(40, shutter(EASE.inOutCubic)); break;
    case 'whip': slide(whipEase(u)); st.blur = Math.min(90, shutter(whipEase) * 1.6 + 4 * Math.sin(Math.PI * u)); break;   // a whip smears more than a real shutter
    case 'zoom': st.s1 = 1 + 1.4 * EASE.inCubic(u); st.s2 = 1.35 - 0.35 * EASE.outCubic(u); st.alpha = EASE.inOutCubic(u); break;
    case 'iris': st.R = Math.hypot(W, H) / 2 * EASE.inOutCubic(u) + 1; break;
  }
  return st;
}
function composeTransition(C, tin, u, prev, cur) {
  const W = C.W, H = C.H, both = (p, c) => [p, c];
  const cid = svgId('tclip'), clipDef = el('clipPath', {id: cid}, rect(0, 0, W, H));
  const box = (content, a = {}) => g({'clip-path': `url(#${cid})`, ...a}, content);   // bounded to the canvas: translucent groups stay on canvas for resvg
  // a shot slid by (ox, oy): clipped to the part of the canvas it covers, in canvas coordinates (an untranslated clip);
  // skipped when less than a pixel of it shows (resvg panics on a clip region with no area)
  const slid = (content, ox, oy) => { const x0 = Math.max(0, ox), y0 = Math.max(0, oy), x1 = Math.min(W, W + ox), y1 = Math.min(H, H + oy);
    if (x1 - x0 < 1 || y1 - y0 < 1) return ''; const sid = svgId('slide');
    return [el('clipPath', {id: sid}, rect(x0, y0, x1 - x0, y1 - y0)), g({'clip-path': `url(#${sid})`}, g({transform: `translate(${ox} ${oy})`}, content))]; };
  const dirs = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}, [dx, dy] = dirs[tin.dir] || dirs.left;
  switch (tin.type) {
    case 'fade': { if (u < 0.5) return [clipDef, prev, rect(0, 0, W, H, tin.color, {opacity: EASE.inOutSine(u * 2)})]; return [clipDef, cur, rect(0, 0, W, H, tin.color, {opacity: 1 - EASE.inOutSine(u * 2 - 1)})]; }
    case 'crossfade': return [clipDef, prev, g({opacity: EASE.inOutSine(u)}, box(cur))];
    case 'push': { const e = EASE.inOutCubic(u); return [clipDef, slid(prev, dx * W * e, dy * H * e), slid(cur, -dx * W * (1 - e), -dy * H * (1 - e))]; }
    case 'whip': {
      const ew = x => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2), e = ew(u);   // inOutQuart: a fast whip in the middle
      const speed = Math.abs(ew(clamp(u + 0.01)) - ew(clamp(u - 0.01))) / 0.02 / 2;   // 0 .. ~1 (peak 2 of inOutQuart, halved)
      const blur = Math.min(60, speed * 55), fid = svgId('whip');
      const f = el('filter', {id: fid, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H}, el('feGaussianBlur', {stdDeviation: dx ? `${blur} 0` : `0 ${blur}`}));   // a canvas-sized region: a bbox region panics resvg
      const streaks = speed > 0.2 ? Array.from({length: 9}, (_, j) => { const hj = hash('streak' + j), w = dx ? W * (0.4 + 0.5 * hj) : 6 + 10 * hj, h = dx ? 6 + 10 * hj : H * (0.3 + 0.4 * hj);
        const x0 = dx ? W * hash('sx' + j) - w / 2 : W * (j + 0.5) / 9, y0 = dx ? H * (j + 0.5) / 9 : H * hash('sy' + j) - h / 2;
        return rect(x0, y0, w, h, '#FFFFFF', {rx: Math.min(w, h) / 2, opacity: Math.min(0.22, (speed - 0.2) * 0.35)}); }) : [];
      return [clipDef, el('defs', {}, f), g(blur > 0.5 ? {filter: `url(#${fid})`} : {}, slid(prev, dx * W * e, dy * H * e), slid(cur, -dx * W * (1 - e), -dy * H * (1 - e))), streaks];
    }
    case 'zoom': { const e = EASE.inOutCubic(u), s1 = 1 + 1.4 * EASE.inCubic(u), s2 = 1.35 - 0.35 * EASE.outCubic(u);
      const about = s => `translate(${W / 2} ${H / 2}) scale(${s}) translate(${-W / 2} ${-H / 2})`;
      return [clipDef, g({transform: about(s1)}, box(prev)), g({opacity: e}, box(g({transform: about(s2)}, box(cur))))]; }
    case 'iris': { const e = EASE.inOutCubic(u), R = Math.hypot(W, H) / 2 * e + 1, iid = svgId('iris');
      return [clipDef, prev, el('clipPath', {id: iid}, circle(tin.cx ?? W / 2, tin.cy ?? H / 2, R, '#000')), g({'clip-path': `url(#${iid})`}, cur)]; }
    default: return both(prev, cur)[1];
  }
}

/**
 * the SVG document for time t. `part: 'prev'|'cur'` renders only one side of an active transition, full frame (render.mjs
 * composites those in pixels); without it a transition is composed in SVG (correct in browsers).
 */
export function frameSVG(C, t, {only, part, split} = {}) {
  resetIds();
  const W = C.W, H = C.H, i = shotIndexAt(C, t), shot = C.shots[i], lt = t - shot.start;
  const svgDoc = (...kids) => el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`}, rect(0, 0, W, H, '#000'), ...kids);
  // split (render.mjs, graded shots): 'graded' = the world only; 'post' = light + screen on a transparent canvas ('' if empty)
  const one = L => { if (split === 'graded') return svgDoc(L.world); if (split === 'post') return L.post || !/^<g data-layer="screen"\/>$/.test(L.screen) ? el('svg', {xmlns: 'http://www.w3.org/2000/svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`}, L.post, L.screen) : ''; return svgDoc(L.world, L.post, L.screen); };
  const trn = transitionAt(C, t);
  if (part === 'prev' && trn) { const ps = C.shots[i - 1], pl = shotLayers(C, ps, t - ps.start, only); return one(pl); }
  const cur = shotLayers(C, shot, lt, only);
  if (!trn || part) return one(cur);
  const ps = C.shots[i - 1], pl = shotLayers(C, ps, t - ps.start, only);   // the previous shot keeps running past its end
  const prev = prefixIds(layer('shot:prev', {}, rect(0, 0, W, H, '#000'), pl.world, pl.post, pl.screen), 'p');
  const curG = layer('shot:cur', {}, rect(0, 0, W, H, '#000'), cur.world, cur.post, cur.screen);
  return svgDoc(layer('transition:' + trn.tin.type, {}, composeTransition(C, trn.tin, trn.u, prev, curG)));
}
/** the colour grade (fx.mjs params) for the shot shown at t (part 'prev' = the outgoing shot of a transition), or null */
export function gradeFor(C, t, part) { const shot = gradeShot(C, t, part); return FX.gradeAt(shot, t - shot.start); }
/** the shot whose pixels are being rendered at t (part 'prev' = the outgoing shot of a transition) */
export function gradeShot(C, t, part) { const i = shotIndexAt(C, t), trn = transitionAt(C, t); return C.shots[part === 'prev' && trn ? i - 1 : i]; }

/** sound events in the What If kit format */
export function soundEvents(C) {
  const ev = [];
  for (const s of C.shots) for (const e of s.sfx || []) ev.push({t: +(s.start + e.t).toFixed(3), kind: e.kind, gain: e.gain ?? 1});
  for (const m of C.scene.music || []) ev.push({kind: 'music', mood: m.mood, a: m.a, b: m.b, gain: m.gain ?? 1});
  for (const b of C.scene.beds || []) ev.push({kind: 'bed', name: b.name, a: b.a, b: b.b, gain: b.gain ?? 1});
  return {duration: C.duration, events: ev};
}
