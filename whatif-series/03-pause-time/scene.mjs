// What If #03 — What if pausing time cost you your time?   (38 s, silent)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, label, bubble, txt, rr, table, chair, cup, kf, step, ease, lerp, clamp, twos, hash, walk,
  at, ev, bed, music, STAND, SEATED, INK, WHITE, GREY, ACCENTS, GROUND} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const Y = ACCENTS.yellow;                        // the one accent: the pause button
const FROZEN = '#B8B8B8', WASH = '#EFEFEF';
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lerpHex = (a, b, k) => '#' + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], clamp(k))).toString(16).padStart(2, '0')).join('');
const inkF = f => lerpHex(INK, FROZEN, f), bgF = f => lerpHex(WHITE, WASH, f);
const blink = (t, off = 0) => ((t + off) % 3.4) < 2 / 24;
const breathe = (p, t, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(t * 2.3) * a]});
const FRIEND = {kind: 'cap', color: WHITE};      // secondary character: plain cap, no colour (yellow is only the button)

// ---------------- age ----------------
const AGES = [[0, 30], [9.6, 31], [10.3, 31], [12.0, 33], [12.5, 33], [14.3, 38], [14.9, 38], [16.8, 46], [17.3, 46], [19.3, 58], [19.7, 58], [21.6, 72], [22.2, 72], [23.6, 79]];
function ageAt(t) { let v = 30; for (let i = 0; i < AGES.length; i++) { const [a, x] = AGES[i]; if (t < a) { const [pa, px] = AGES[i - 1] || [0, 30]; return Math.floor(lerp(px, x, (t - pa) / (a - pa))); } v = x; } return v; }
// a tick on every year change
for (let k = 0; k < AGES.length - 1; k++) { const [a, x] = AGES[k], [b, y] = AGES[k + 1]; if (y > x) for (let n = 1; n <= y - x; n++) AGES.ticks = (AGES.ticks || []).concat(a + (b - a) * n / (y - x)); }
const old = t => clamp((ageAt(t) - 30) / 49);
const agePose = (p, a) => ({...p, lean: (p.lean || 0) + 0.3 * a, headLean: (p.headLean || 0) + 0.22 * a, hip: [p.hip[0], p.hip[1] + 26 * a], knee: [-1, -1]});
const ageOverlay = (ctx, lt, t) => { const n = ageAt(t), since = t - Math.max(-9, ...AGES.ticks.filter(x => x <= t)); const s = 1 + 0.12 * clamp(1 - since / 0.2);
  ctx.save(); ctx.translate(96, 300); ctx.scale(s, s); ctx.translate(-96, -300); label(ctx, `AGE ${n}`, {lt: 1}); ctx.restore(); };

// wrinkles + cane, drawn in his local space
function oldMarks(a, cane = false, extra) {
  return (c, j) => {
    if (a > 0.3) { const n = a > 0.75 ? 3 : 2; for (let k = 0; k < n; k++) { const y = j.head[1] - 30 - k * 10, w = 16 - k * 2; D.line(c, D.curve([j.head[0] - w, y], [j.head[0] + w, y], -3, 5), {w: 3.5, amp: 0.4}); } }
    if (cane) { const [x, y] = j.rh; D.line(c, [[x + 2, y - 4], [x + 22, 0]], {w: 6}); D.line(c, [[x + 2, y - 4], [x - 4, y - 24], [x - 22, y - 24], [x - 26, y - 10]], {w: 6, amp: 0.5}); }
    if (extra) extra(c, j);
  };
}
// the small remote in his hand: yellow button with ⏸ or ▶
function remote(c, x, y, icon = 'pause', a = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  rr(c, -17, -40, 34, 74, 9, WHITE, INK, 4);
  c.beginPath(); c.arc(0, -16, 12, 0, 6.283); c.fillStyle = Y; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  c.fillStyle = INK; if (icon === 'pause') { c.fillRect(-6, -22, 4, 12); c.fillRect(2, -22, 4, 12); } else { c.beginPath(); c.moveTo(-4, -23); c.lineTo(7, -16); c.lineTo(-4, -9); c.closePath(); c.fill(); }
  D.line(c, [[-8, 10], [8, 10]], {w: 3}); D.line(c, [[-8, 20], [8, 20]], {w: 3});
  c.restore();
}
const inHand = (icon, a = -0.2) => (c, j) => remote(c, j.rh[0] + 4, j.rh[1] - 18, icon, a);

// a frozen falling coffee cup with drops hanging in the air
function frozenCup(ctx, x, y, f, k = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.9); ctx.translate(-x, -y); cup(ctx, x, y + 28, 0, false); ctx.restore();
  const ink = inkF(f);
  for (const [dx, dy, r] of [[-40, 30, 9], [-70, 60, 7], [-95, 100, 6], [-58, 110, 8], [-120, 150, 5], [-30, 80, 5]]) D.ellipse(ctx, x + dx, y + dy, r, r * 1.3, {fill: WHITE, w: 3.5, color: ink});
}

// S1 0–1.6: café, everything frozen grey; a cup hangs mid-fall; he walks round and plucks it from the air
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx, WASH); floor(ctx, -400, 1700);
  const T = twos(lt);
  guy(ctx, 1100, GROUND, 1.25, {...SEATED, lean: -0.15, lh: [140, -330], rh: [150, -380], elbow: [1, 1]}, {gx: 0.7, gy: -0.6, mouth: 'O', eyes: 'wide'}, {flip: true, color: FROZEN, accent: FRIEND});
  D.setStyle({ink: FROZEN}); chair(ctx, 1100, {flip: true}); table(ctx, 660, {w: 340}); D.setStyle({ink: INK});
  const grab = ease((lt - 0.85) / 0.35), x = lerp(340, 580, ease(lt / 0.85));
  if (grab < 1) frozenCup(ctx, 830, 1060, 1);
  const pose = lt < 0.85 ? walk(T * 1.6) : kf([[0.85, STAND], [1.15, {...STAND, lean: 0.06, rh: [175, -420], elbow: [1, 1]}], [1.6, {...STAND, rh: [150, -330], elbow: [1, 1]}]], T);
  guy(ctx, x, GROUND, 1.25, pose, {gx: 0.8, gy: -0.4, mouth: lt > 1.2 ? 'smile' : 'flat'},
    {after: grab >= 1 ? (c, j) => cup(c, j.rh[0] + 4, j.rh[1] + 16, t, false) : null});
  if (lt < 0.85) for (const k of [0, 1]) at(t, 0.2 + k * 0.4, 'step', 0.4);
  at(t, 0.02, 'freeze', 0.35); at(t, 1.18, 'clink', 0.5);
}, {cam: lt => ({z: lerp(1.28, 1.34, lt / 1.6), fx: 720, fy: 1190}), hand: 0.8});

// S2 1.6–3.0: premise card
shot(1.6, 3.0, (ctx, lt) => { bg(ctx); at(1.6 + lt, 1.6, 'cut'); card(ctx, [['WHAT IF PAUSING TIME', INK], ['COST YOU YOUR TIME?', '#C98A00']], {lt, size: 96}); });

// S3 3.0–6.0: close on his hand — the remote; he presses ⏸ and grey spreads out from the button
shot(3.0, 6.0, (ctx, lt, t) => {
  const press = 1.5, f = ease((lt - press) / 0.8);
  bg(ctx);
  // grey spreads as a circle from the button
  if (lt > press) { ctx.beginPath(); ctx.arc(640, 938, ease((lt - press) / 0.8) * 1800, 0, 6.283); ctx.fillStyle = WASH; ctx.fill(); }
  // the office behind, faint, and frozen at the press
  const wob = lt < press ? Math.sin(t * 3) * 14 : 0;
  ctx.save(); ctx.globalAlpha = 0.5; D.setStyle({ink: inkF(f)}); D.line(ctx, [[-300, 1500], [1600, 1500]], {w: 5});
  guy(ctx, 150 + wob, 1500, 1.0, walk(lt < press ? twos(lt) * 1.4 : twos(press) * 1.4), {gx: 0.5}, {color: inkF(f)});
  guy(ctx, 1150, 1500, 1.0, {...STAND, rh: [90, -330 + (lt < press ? Math.sin(t * 8) * 30 : 0)], elbow: [1, 1]}, {gx: -0.5, mouth: 'O'}, {flip: true, color: inkF(f)});
  D.setStyle({ink: INK}); ctx.restore();
  // arm + hand holding the remote (scaled up around the button)
  ctx.save(); ctx.translate(640, 1000); ctx.scale(1.55, 1.55); ctx.translate(-640, -1000);
  const T = twos(lt), lift = kf([[0, 0], [1.0, 0], [1.3, 1], [1.5, -0.25], [1.75, 0]], T);
  D.line(ctx, [[1400, 2300], [900, 1500], [760, 1260]], {w: 10});
  rr(ctx, 520, 820, 240, 560, 46, WHITE, INK, 7);
  ctx.beginPath(); ctx.arc(640, 960, 86 - (lt > press && lt < press + 0.25 ? 6 : 0), 0, 6.283); ctx.fillStyle = Y; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(608, 920, 22, 80); ctx.fillRect(650, 920, 22, 80);
  for (const y of [1120, 1190, 1260]) { D.ellipse(ctx, 590, y, 22, 18, {w: 5}); D.ellipse(ctx, 690, y, 22, 18, {w: 5}); }
  // fingers wrapped round the left edge, thumb over the button
  for (const y of [1080, 1170, 1260]) D.ellipse(ctx, 520, y, 40, 30, {fill: WHITE, w: 6});
  D.ellipse(ctx, 800, 1260, 70, 110, {fill: WHITE, w: 6, rot: 0.3});
  const [tx, ty] = kf([[0, [790, 1130]], [0.9, [775, 1105]], [1.25, [705, 930]], [1.5, [688, 985]], [1.9, [688, 985]], [2.4, [770, 1100]]], T);
  D.ellipse(ctx, tx, ty, 44, 70, {fill: WHITE, w: 6, rot: -0.6});
  ctx.restore();
  at(t, 3.0 + press, 'freeze', 0.9); at(t, 3.0 + press, 'click', 0.8);
}, {cam: lt => ({z: lerp(1.0, 1.08, lt / 3), fx: 640, fy: 1080}), hand: 0.8, overlay: ageOverlay});

// S4 6.0–10.0: office, frozen coworkers; he finishes a whole stack alone, stretches, presses ▶
shot(6.0, 10.0, (ctx, lt, t) => {
  const play = 3.5, f = 1 - ease((lt - play) / 0.3), T = twos(lt);
  bg(ctx, bgF(f)); floor(ctx);
  // coworkers, frozen mid-gesture
  const resume = Math.max(0, lt - play);
  guy(ctx, 1170 - resume * 120, GROUND, 1.2, walk(0.3 + resume * 1.4), {gx: -0.4, mouth: 'smile'}, {flip: true, color: inkF(f), after: (c, j) => cup(c, j.rh[0] + 8, j.rh[1] + 10, t, false)});
  // a sheet of paper frozen mid-air
  const py = 980 + resume * 600; ctx.save(); ctx.translate(1000, Math.min(py, 1540)); ctx.rotate(0.4 + resume * 2); D.rect(ctx, -40, -26, 80, 52, {fill: WHITE, w: 4, color: inkF(f)}); ctx.restore();
  table(ctx, 620, {w: 400}); chair(ctx, 540);
  // two stacks: TODO shrinks, DONE grows
  const done = clamp(lt / 2.4), nA = Math.round(9 * (1 - done)), nB = Math.round(9 * done);
  for (let i = 0; i < nA; i++) D.rect(ctx, 700, 1240 - i * 12, 110, 12, {fill: WHITE, w: 3});
  for (let i = 0; i < nB; i++) D.rect(ctx, 880, 1240 - i * 12, 110, 12, {fill: WHITE, w: 3});
  let pose, icon = 'pause';
  if (lt < 2.4) { const c = (T % 0.5) / 0.5; pose = {...SEATED, lean: 0.12, rh: [lerp(250, 380, c < 0.5 ? c * 2 : 2 - c * 2), -280], lh: [180, -260]}; }
  else pose = kf([[2.4, {...SEATED}], [2.7, {...SEATED, lh: [-30, -540], rh: [40, -540], elbow: [-1, 1], headLean: -0.15}], [3.1, {...SEATED, lh: [-30, -540], rh: [40, -540], elbow: [-1, 1], headLean: -0.15}],
    [3.35, {...SEATED, rh: [150, -330], elbow: [1, 1]}]], T);
  guy(ctx, 540, GROUND, 1.25, breathe(pose, t, 2), {gx: lt < 2.4 ? 0.7 : 0.4, gy: lt < 2.4 ? 0.6 : 0, mouth: lt > 2.6 && lt < 3.1 ? 'O' : 'smile', eyes: lt > 2.6 && lt < 3.1 ? 'closed' : undefined},
    {after: lt > 3.2 ? inHand(lt > play - 0.05 ? 'play' : 'pause') : null});
  for (let k = 0; k < 5; k++) at(t, 6.2 + k * 0.48, 'paper', 0.5);
  at(t, 6.0 + play, 'unfreeze', 0.8); at(t, 6.0 + play, 'click', 0.6); at(t, 8.6, 'breath', 0.6);
}, {cam: lt => ({z: lerp(1.2, 1.28, lt / 4), fx: 820, fy: 1210}), hand: 1, overlay: ageOverlay});

// ---------------- montage of pauses (2.4 s each), each starts with ⏸ ----------------
function vignette(a, draw, cam) {
  shot(a, a + 2.4, (ctx, lt, t) => { bg(ctx, WASH); floor(ctx); draw(ctx, lt, t, twos(lt), old(t)); at(t, a + 0.02, 'freeze', 0.55); at(t, a + 2.2, 'unfreeze', 0.35); }, {cam, hand: 1, overlay: ageOverlay});
}
// a) naps while the boss talks
vignette(10.0, (ctx, lt, t, T, a) => {
  table(ctx, 560, {w: 380}); chair(ctx, 480);
  guy(ctx, 1080, GROUND, 1.25, {...STAND, lean: 0.06, rh: [170, -400], elbow: [1, 1]}, {gx: 0.8, mouth: 'shout'}, {flip: true, color: FROZEN, accent: {kind: 'cap', color: WHITE}});
  const zz = Math.sin(t * 2.4) * 4;
  guy(ctx, 480, GROUND, 1.25, agePose({...SEATED, lean: 0.55, headLean: 0.45, lh: [200, -270], rh: [230, -270], hip: [0, -192 + zz * 0.3]}, a), {eyes: 'closed', mouth: 'flat', gy: 0.4}, {after: oldMarks(a)});
  for (let k = 0; k < 3; k++) { const p = ((lt * 0.7 + k / 3) % 1); txt(ctx, 'z', 620 + p * 70 + k * 10, 1030 - p * 180, 40 + p * 30, INK, 'InterTight'); }
}, lt => ({z: 1.22, fx: 760, fy: 1200}));
// b) skips an awkward hello: the waver is frozen, he tiptoes past
vignette(12.4, (ctx, lt, t, T, a) => {
  guy(ctx, 820, GROUND, 1.25, {...STAND, lean: 0.05, rh: [120, -560], elbow: [1, 1]}, {gx: -0.8, mouth: 'grin'}, {flip: true, color: FROZEN});
  const x = lerp(380, 1180, lt / 2.4), w = walk(T * 2.0, {lean: 0.12});
  guy(ctx, x, GROUND, 1.25, agePose({...w, lh: [-20, -260], rh: [40, -270], elbow: [1, 1], hip: [0, w.hip[1] - 10]}, a), {gx: -0.6, mouth: 'wavy', eyes: 'squint'}, {after: oldMarks(a)});
  for (let k = 0; k < 4; k++) at(t, 12.6 + k * 0.5, 'tap', 0.4);
}, lt => ({z: 1.18, fx: lerp(700, 860, lt / 2.4), fy: 1210}));
// c) waits out the rain, under frozen drops
vignette(14.8, (ctx, lt, t, T, a) => {
  const x = 640;
  for (let i = 0; i < 90; i++) { const rx = hash(i) * 1500 - 100, ry = 500 + hash(i + 50) * 1000; if (Math.abs(rx - x) < 90 && ry > 820) continue; D.line(ctx, [[rx, ry], [rx - 4, ry + 34]], {w: 4, color: FROZEN, amp: 0.2}); }
  const look = kf([[0, 0], [0.8, 1], [1.8, 1], [2.2, 0.3]], T);
  guy(ctx, x, GROUND, 1.25, agePose(breathe({...STAND, headLean: -0.35 * look, lh: [-60, -110], rh: [60, -110]}, t, 2), a), {gy: -0.9 * look, gx: Math.sin(t * 1.5) * 0.5, mouth: 'flat', eyes: blink(t) ? 'closed' : undefined}, {after: oldMarks(a)});
}, lt => ({z: lerp(1.25, 1.3, lt / 2.4), fx: 640, fy: 1160}));
// d) lingers at a frozen sunset
vignette(17.2, (ctx, lt, t, T, a) => {
  D.line(ctx, [[-400, 1300], [1700, 1300]], {w: 5, color: FROZEN});
  ctx.save(); ctx.beginPath(); ctx.rect(-400, 0, 2400, 1300); ctx.clip(); D.ellipse(ctx, 900, 1300, 170, 170, {w: 6, color: FROZEN}); ctx.restore();
  for (let k = 0; k < 7; k++) { const an = Math.PI + (k + 0.5) / 7 * Math.PI; D.line(ctx, [[900 + Math.cos(an) * 200, 1300 + Math.sin(an) * 200], [900 + Math.cos(an) * 250, 1300 + Math.sin(an) * 250]], {w: 5, color: FROZEN}); }
  // a bench
  D.line(ctx, [[260, 1368], [560, 1368]], {w: 7}); D.line(ctx, [[280, 1368], [280, GROUND]], {w: 6}); D.line(ctx, [[540, 1368], [540, GROUND]], {w: 6});
  guy(ctx, 400, GROUND, 1.25, agePose(breathe({...SEATED, lh: [60, -215], rh: [90, -215]}, t, 2), a), {gx: 0.8, gy: -0.3, mouth: 'smile', eyes: blink(t, 1) ? 'closed' : undefined}, {after: oldMarks(a)});
}, lt => ({z: lerp(1.18, 1.25, lt / 2.4), fx: 640, fy: 1220}));
// e) his back curves; a cane appears
vignette(19.6, (ctx, lt, t, T, a) => {
  D.setStyle({ink: FROZEN}); for (const x of [150, 1150]) { D.line(ctx, [[x, GROUND], [x, GROUND - 700]], {w: 6}); D.ellipse(ctx, x, GROUND - 760, 90, 80, {w: 5}); } D.setStyle({ink: INK});
  const x = lerp(470, 800, lt / 2.4), w = walk(T * 1.0, {lean: 0.05});
  guy(ctx, x, GROUND, 1.25, agePose({...w, rh: [120, -230], elbow: [1, 1]}, a), {gx: 0.5, gy: 0.4, mouth: 'flat', eyes: 'squint'}, {after: oldMarks(a, true)});
  for (let k = 0; k < 4; k++) at(t, 19.9 + k * 0.55, 'tap', 0.5);
}, lt => ({z: 1.28, fx: lerp(600, 720, lt / 2.4), fy: 1210}));

// the café table from shot 1 — old him, the young friend frozen mid-sentence
function cafe(ctx, t, f, friendPose, friendFace, mePose, meFace, meAfter) {
  bg(ctx, bgF(f)); floor(ctx);
  guy(ctx, 1010, GROUND, 1.25, friendPose, friendFace, {flip: true, color: inkF(f), accent: FRIEND});
  D.setStyle({ink: inkF(f)}); chair(ctx, 1010, {flip: true}); D.setStyle({ink: INK});
  table(ctx, 600, {w: 320}); chair(ctx, 500);
  cup(ctx, 860, 1246, t, f < 0.5);
  return guy(ctx, 500, GROUND, 1.25, mePose, meFace, {after: meAfter});
}
const FR_TALK = {...SEATED, lean: -0.05, lh: [150, -330], rh: [120, -260], elbow: [1, 1]};
// S6 22.0–28.0: AGE 79; he looks at his friend, still mid-word; presses ▶
shot(22.0, 28.0, (ctx, lt, t) => {
  const play = 4.4, f = 1 - ease((lt - play) / 0.3), T = twos(lt), a = old(t);
  const press = kf([[0, 0], [3.4, 0], [3.9, 1], [4.4, 1.15], [4.6, 1]], T);
  cafe(ctx, t, f, {...FR_TALK, lh: lt > play ? [150 + Math.sin((lt - play) * 8) * 20, -330] : [150, -330]}, {gx: 0.7, mouth: 'shout'},
    agePose(breathe({...SEATED, lh: [110, -250], rh: [lerp(110, 150, press), lerp(-250, -330, press)], elbow: [1, 1]}, t, 2), a),
    {gx: 0.8, gy: lerp(0, 0.5, press), mouth: 'frown', eyes: blink(t) ? 'closed' : undefined}, oldMarks(a, false, press > 0.3 ? inHand(lt > play ? 'play' : 'pause', -0.5) : null));
  // the cane leans on his chair
  D.line(ctx, [[380, GROUND], [410, 1330]], {w: 6}); D.line(ctx, [[410, 1330], [420, 1310], [442, 1312], [446, 1330]], {w: 6});
  at(t, 22.0 + play, 'unfreeze', 0.8); at(t, 22.0 + play, 'click', 0.6);
}, {cam: lt => ({z: lerp(1.2, 1.32, ease(lt / 6)), fx: 750, fy: 1200}), hand: 0.8, overlay: ageOverlay});

// S7 28.0–33.0: the friend, still young, finishes the sentence; he looks at his shaking hands
shot(28.0, 33.0, (ctx, lt, t) => {
  const a = 1, T = twos(lt), sh = Math.sin(t * 38) * 4, look = ease((lt - 1.8) / 0.6);
  const meP = agePose({...SEATED, lh: [lerp(110, 120, look) + sh, lerp(-250, -330, look)], rh: [lerp(110, 160, look) - sh, lerp(-250, -320, look)], elbow: [1, 1], headLean: 0.15 * look}, a);
  cafe(ctx, t, 0, breathe({...FR_TALK, lh: [lerp(150, 120, ease(lt / 1.2)), lerp(-330, -280, ease(lt / 1.2))]}, t), {gx: 0.7, mouth: lt < 1.4 ? (T % 0.34 < 0.17 ? 'shout' : 'smile') : 'smile'},
    meP, {gx: lerp(0.8, 0.5, look), gy: lerp(0, 0.8, look), mouth: look > 0.5 ? 'flat' : 'O', eyes: lt < 1.2 ? 'wide' : blink(t) ? 'closed' : undefined}, oldMarks(a));
  D.line(ctx, [[380, GROUND], [410, 1330]], {w: 6}); D.line(ctx, [[410, 1330], [420, 1310], [442, 1312], [446, 1330]], {w: 6});
  if (lt < 2.6) bubble(ctx, 900, 790, ['…SO, ARE YOU', 'COMING TONIGHT?'], {size: 48, tx: 990, ty: 930});
  at(t, 28.1, 'pop', 0.3);
}, {cam: lt => ({z: lerp(1.3, 1.38, lt / 5), fx: lerp(750, 700, ease((lt - 1.8) / 2)), fy: 1170}), hand: 0.8});

// S8 33.0–38.0: push in; he nods slowly, sets the remote down and pushes it away
shot(33.0, 38.0, (ctx, lt, t) => {
  const a = 1, T = twos(lt);
  const nod = lt < 1.6 ? Math.sin(lt / 1.6 * Math.PI * 2) * 0.14 : 0;
  const slide = ease((lt - 2.6) / 0.9);
  const meP = agePose(kf([[0, {...SEATED, rh: [150, -330], lh: [110, -250], elbow: [1, 1]}], [1.6, {...SEATED, rh: [150, -330], lh: [110, -250], elbow: [1, 1]}],
    [2.2, {...SEATED, rh: [190, -258], lh: [110, -250], elbow: [1, 1]}], [2.6, {...SEATED, rh: [190, -258], lh: [110, -250], elbow: [1, 1]}],
    [3.5, {...SEATED, lean: 0.12, rh: [260, -258], lh: [110, -250], elbow: [1, 1]}], [4.2, {...SEATED, rh: [130, -250], lh: [110, -250], elbow: [1, 1]}]], T), a);
  cafe(ctx, t, 0, breathe({...FR_TALK, lh: [120, -280]}, t), {gx: 0.7, mouth: lt > 1.4 ? 'grin' : 'smile', eyes: lt > 1.4 ? 'happy' : undefined},
    {...meP, headLean: meP.headLean + nod}, {gx: 0.8, gy: 0.2, mouth: lt > 1.0 ? 'smile' : 'flat', eyes: blink(t, 2) ? 'closed' : undefined},
    oldMarks(a, false, lt < 2.2 ? inHand('play', -0.5) : null));
  if (lt >= 2.2) { const x = lerp(500 + 1.25 * 190 + 8, 860 - 70, slide), y = 1250 - 14; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2); remote(ctx, 0, 0, 'play', 0, 1.05); ctx.restore(); }
  D.line(ctx, [[380, GROUND], [410, 1330]], {w: 6}); D.line(ctx, [[410, 1330], [420, 1310], [442, 1312], [446, 1330]], {w: 6});
  at(t, 35.2, 'tap', 0.5); at(t, 35.6, 'swipe', 0.6);
}, {cam: lt => ({z: lerp(1.38, 1.5, ease(lt / 5)), fx: lerp(700, 730, lt / 5), fy: lerp(1170, 1150, lt / 5)}), hand: 0.7});

for (const x of AGES.ticks) ev(x, 'tick', 0.35);
bed('room', 0, 1.6, 2); bed('hum', 3.0, 10.0, 1.2);
music('tense', 10.0, 22.0, 0.55);
bed('room', 22.0, 28.0, 2.5);
bed('silence', 28.4, 29.6); music('tender', 29.6, 33.2, 1); music('resolve', 33.0, 38.0, 1);
await run({dir: DIR, duration: 38.0});
