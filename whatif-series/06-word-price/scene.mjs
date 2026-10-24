// What If #06 — What if every word cost money?   (37 s, silent) · accent green (money)
import path from 'node:path';
import {D, shot, run, guy, bg, floor, card, label, table, chair, cup, phoneCloseup, rr, txt, kf, step, ease, lerp, clamp, twos, walk, runCycle,
  at, bed, music, hash, STAND, SEATED, INK, WHITE, GREY, LIGHT, ACCENTS, GROUND, BASE_LW} from '../../whatif-kit/kit.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const GREEN = ACCENTS.green, S = 1.3;

// ---------- local helpers ----------
// kit walk()/runCycle() lift the foot while it travels backward (a moonwalk); negative phase walks forward
const fwalk = (ph, o) => walk(ph, o), frun = (ph, o) => runCycle(ph, o);
const backOut = k => { k = clamp(k); if (k <= 0) return 0; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
const blink = (t, off = 0) => ((t + off) % 3.1) < 0.085 ? 'closed' : undefined;
const breathe = (p, lt, a = 3) => ({...p, hip: [p.hip[0], p.hip[1] + Math.sin(twos(lt) * 2.6) * a]});
const money = n => '$' + Math.round(n).toLocaleString('en-US');
/** world position of a local joint */
const W = (x, y, j, s = S, flip = false) => [x + (flip ? -1 : 1) * j[0] * s, y + j[1] * s];

/** wallet tag floating over a head: a rounded tag with the amount in green */
function wallet(ctx, x, y, amount, {s = 1, cap = false, shake = 0, t = 0, flash = 0} = {}) {
  const str = typeof amount === 'string' ? amount : money(amount), size = 50;
  ctx.save(); ctx.translate(x + (shake ? Math.sin(t * 90) * shake : 0), y); ctx.scale(s, s);
  ctx.font = `700 ${size}px InterTight`; const w = Math.max(110, ctx.measureText(str).width + 50), h = 76;
  D.line(ctx, [[0, h / 2], [0, h / 2 + 26]], {w: 3.5, color: GREY, amp: 0.3});
  rr(ctx, -w / 2, -h / 2, w, h, 20, flash > 0 ? `rgba(46,158,91,${0.18 * flash})` : WHITE, INK, 4.5);
  D.dot(ctx, -w / 2 + 16, 0, 5, 5, GREY);
  txt(ctx, str, 6, 3, size, GREEN);
  if (cap) txt(ctx, 'WALLET', 0, -h / 2 - 28, 34, INK, 'Inter6');
  ctx.restore();
}
/** a word / price tag that pops out of a mouth and floats up */
function wordTag(ctx, x, y, str, k, {size = 54, ink = GREEN} = {}) {
  const s = backOut(k * 4); if (s <= 0) return; const a = clamp(2.2 - k * 1.2);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y - k * 60); ctx.scale(s, s);
  ctx.font = `700 ${size}px InterTight`; const w = ctx.measureText(str).width + 44, h = size * 1.45;
  rr(ctx, -w / 2, -h / 2, w, h, 16, WHITE, ink, 5); txt(ctx, str, 0, 3, size, ink);
  ctx.restore();
}
/** the price board on the wall */
function priceBoard(ctx, x, y, {circle = 0} = {}) {
  const w = 520, h = 470;
  D.rect(ctx, x, y, w, h, {fill: WHITE, w: 7}); D.rect(ctx, x + 18, y + 18, w - 36, h - 36, {w: 3, color: GREY});
  [['HELLO', '$1'], ['THANKS', '$5'], ['SORRY', '$50'], ['I LOVE YOU', '$1,280']].forEach(([a, b], i) => {
    const ry = y + 80 + i * 104; txt(ctx, a, x + 50, ry, 46, INK, 'InterTight', 'left'); txt(ctx, b, x + w - 50, ry, 46, GREEN, 'InterTight', 'right');
    if (i < 3) D.line(ctx, [[x + 50, ry + 52], [x + w - 50, ry + 52]], {w: 2.5, color: LIGHT, amp: 0.3});
  });
}
const thumbsUp = (c, j) => { const h = j.rh; D.line(c, [[h[0], h[1] - 6], [h[0] + 2, h[1] - 34]], {w: 6}); };
const pointing = (c, j) => { const h = j.rh; D.line(c, [[h[0] + 6, h[1]], [h[0] + 34, h[1] - 2]], {w: 5}); };
function street(ctx, x0 = -800, x1 = 4600) {
  bg(ctx);
  for (let x = x0, i = 0; x < x1; x += 560, i++) { const h = 520 + hash(i * 1.7) * 360, w = 300 + hash(i * 2.3) * 120;
    D.rect(ctx, x, GROUND - h, w, h, {w: 4, color: '#C9C9C9'});
    for (let wy = GROUND - h + 60; wy < GROUND - 140; wy += 110) for (let wx = x + 40; wx < x + w - 60; wx += 90) D.rect(ctx, wx, wy, 44, 56, {w: 3, color: '#D6D6D6'}); }
  floor(ctx, x0, x1);
}

// ---------- S1 0–1.6: the price board; he opens his mouth, a $1 tag pops, he snaps it shut ----------
shot(0, 1.6, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 1800); priceBoard(ctx, 170, 600);
  const T = twos(lt);
  const p = kf([[0, breathe(STAND, lt)], [0.5, {...STAND, hip: [0, -226]}], [0.72, {...STAND, rh: [12, -446], elbow: [1, 1], handOverFace: true, headLean: -0.05}], [1.6, {...STAND, rh: [12, -446], elbow: [1, 1], handOverFace: true, headLean: -0.08}]], T);
  if (T >= 0.62) p.handOverFace = true;
  const face = T < 0.42 ? {gx: -0.7, gy: -0.2, mouth: 'flat'} : T < 0.66 ? {gx: 0.2, mouth: 'O'} : {gx: 0, gy: -0.3, mouth: 'flat', eyes: 'wide', lines: 1};
  const j = guy(ctx, 900, GROUND, S, p, face, {flip: true});
  const hd = W(900, GROUND, j.head, S, true);
  if (lt < 0.66) wordTag(ctx, hd[0] - 110, hd[1] - 10, '$1', (lt - 0.42) / 0.9); else if (lt < 0.8) { ctx.save(); ctx.globalAlpha = 1 - (lt - 0.66) / 0.14; wordTag(ctx, hd[0] - 110 + (lt - 0.66) * 500, hd[1] + 20, '$1', 0.3); ctx.restore(); }
  wallet(ctx, hd[0], hd[1] - 160, 3, {cap: true});
  at(t, 0.44, 'coin', 0.8); at(t, 0.7, 'click', 0.6);
}, {cam: lt => ({z: lerp(1.3, 1.36, lt / 1.6), fx: 610, fy: 1150}), hand: 0.8});

// ---------- S2 1.6–2.9: premise card ----------
shot(1.6, 2.9, (ctx, lt, t) => { bg(ctx); at(t, 1.6, 'cut'); card(ctx, [['WHAT IF', INK], ['EVERY WORD', INK], ['COST MONEY?', GREEN]], {lt, size: 112}); });

// ---------- S3 2.9–8.0: a silent city — people point and give thumbs-up; a stranger with $0 can't speak ----------
shot(2.9, 8.0, (ctx, lt, t) => {
  street(ctx); const T = twos(lt);
  // A points at B; B answers with a thumbs-up — nobody speaks
  const pA = kf([[0, breathe(STAND, lt)], [0.4, STAND], [0.8, {...STAND, rh: [175, -390], elbow: [1, 1]}], [2.2, {...STAND, rh: [175, -390], elbow: [1, 1]}], [2.6, STAND]], T);
  const jA = guy(ctx, 160, GROUND, 1.15, pA, {gx: 0.7, mouth: 'smile', eyes: blink(t)}, {accent: {kind: 'scarf', color: GREEN}, after: T > 0.7 && T < 2.3 ? pointing : undefined});
  const pB = kf([[0, breathe(STAND, lt)], [1.1, STAND], [1.5, {...STAND, rh: [110, -330], elbow: [1, 1]}], [2.8, {...STAND, rh: [110, -330], elbow: [1, 1]}], [3.2, STAND]], T);
  const jB = guy(ctx, 450, GROUND, 1.15, pB, {gx: -0.7, mouth: T > 1.4 ? 'grin' : 'smile', eyes: T > 1.4 && T < 2.8 ? 'happy' : undefined}, {flip: true, accent: {kind: 'cap', color: GREEN}, after: T > 1.4 && T < 2.9 ? thumbsUp : undefined});
  // the stranger with $0: opens his mouth, strains, nothing comes out
  const pC = kf([[0, breathe(STAND, lt)], [2.4, STAND], [2.7, {...STAND, hip: [0, -228], headLean: -0.12}], [3.3, {...STAND, headLean: -0.18, lh: [-30, -380], rh: [40, -380], elbow: [1, 1]}],
    [4.3, {...STAND, headLean: -0.18, lh: [-30, -380], rh: [40, -380], elbow: [1, 1]}], [4.7, {...STAND, headLean: 0.15, lh: [-70, -100], rh: [70, -100]}]], T);
  const tryIt = T > 2.6 && T < 4.4;
  const jC = guy(ctx, 820, GROUND, 1.15, pC, tryIt ? {gx: 0.5, gy: -0.2, mouth: T < 3.3 ? 'O' : 'shout', eyes: T > 3.3 ? 'squint' : 'wide', sweat: T > 3.3} : T >= 4.4 ? {gx: 0.2, gy: 0.6, mouth: 'frown'} : {gx: -0.4, mouth: 'flat', eyes: blink(t, 1.3)},
    {accent: {kind: 'cap', color: GREEN}});
  // our man, watching
  const jM = guy(ctx, 1130, GROUND, 1.15, breathe(STAND, lt), {gx: T < 2.4 ? -0.8 : -0.9, gy: 0.1, mouth: T > 3.3 ? 'O' : 'flat', eyes: T > 3.3 ? 'wide' : blink(t, 2)}, {flip: true});
  for (const [x, j, amt, f, extra] of [[160, jA, 12, false], [450, jB, 40, true], [820, jC, 0, false, true], [1130, jM, 3, true]]) {
    const hd = W(x, GROUND, j.head, 1.15, f);
    wallet(ctx, hd[0], hd[1] - 150, amt, {s: 0.9, shake: extra && tryIt ? 5 : 0, t, flash: extra && tryIt ? 1 : 0});
  }
  at(t, 3.75, 'pop', 0.3); at(t, 4.35, 'pop', 0.3); at(t, 6.2, 'buzz', 0.35);
}, {cam: lt => ({z: lerp(1.0, 1.32, ease((lt - 2.0) / 1.6)), fx: lerp(640, 850, ease((lt - 2.0) / 1.6)), fy: lerp(1150, 1170, ease((lt - 2.0) / 1.6))}), hand: 1});

// ---------- S4 8.0–15.0: he stays silent. DAY 1 -> DAY 60, wallet $3 -> $214 -> $1,280 ----------
// 8.0–11.2: eating alone
shot(8.0, 11.2, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 1800); const T = twos(lt);
  chair(ctx, 460); table(ctx, 560, {w: 420});
  const spoon = Math.max(0, Math.sin(T * 3.4));
  const p = {...SEATED, hip: [0, -192 + Math.sin(T * 2.6) * 2], lean: 0.08, lh: [110, -190], rh: [lerp(150, 70, spoon), lerp(-245, -420, spoon)], elbow: [1, 1]};
  const j = guy(ctx, 460, GROUND, S, p, {gx: lt > 2.2 ? -0.6 : 0.4, gy: lt > 2.2 ? 0 : 0.6, mouth: spoon > 0.8 ? 'O' : 'flat', eyes: blink(t)},
    {after: (c, jj) => D.line(c, [[jj.rh[0], jj.rh[1]], [jj.rh[0] + 44, jj.rh[1] + 12]], {w: 4})});
  D.ellipse(ctx, 720, 1236, 70, 14, {fill: WHITE, w: 4.5}); D.line(ctx, [[660, 1240], [690, 1252], [750, 1252], [780, 1240]], {w: 4});  // bowl
  cup(ctx, 880, 1248, t, false);
  const hd = W(460, GROUND, j.head);
  const amt = lerp(3, 214, ease((lt - 0.4) / 2.6));
  wallet(ctx, hd[0], hd[1] - 160, amt);
  for (let k = 0; k < 9; k++) at(t, 8.5 + k * 0.28, 'coin', 0.22);
}, {cam: lt => ({z: lerp(1.32, 1.4, lt / 3.2), fx: 680, fy: 1150}), hand: 1,
  overlay: (ctx, lt) => label(ctx, lt < 1.6 ? 'DAY 1' : 'DAY 20', {lt: lt < 1.6 ? lt : lt - 1.6})});
// 11.2–15.0: alone at a party — the others talk and pay; he holds a cup and says nothing
shot(11.2, 15.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 1800); const T = twos(lt);
  // party bunting
  D.line(ctx, [[-100, 520], [300, 600], [700, 540], [1100, 610], [1500, 530]], {w: 3.5, color: GREY});
  for (let i = 0; i < 12; i++) { const x = -60 + i * 130, y = 540 + Math.sin(i * 1.3) * 30 + 30; D.poly(ctx, [[x - 22, y], [x + 22, y], [x, y + 44]], {w: 3.5, color: GREY}); }
  const people = [[330, false, 'scarf', 0.0], [560, true, 'cap', 0.7], [760, true, 'scarf', 1.4]];
  for (const [i, [x, f, kind, off]] of people.entries()) {
    const talk = Math.sin((T + off) * 5) > 0.2, laugh = (T + off) % 2.2 < 0.5;
    const p = {...STAND, hip: [0, -223 + Math.sin((T + off) * 3) * 4], lean: laugh ? -0.06 : 0.02, rh: [80 + Math.sin(T * 4 + i) * 30, -200 + Math.cos(T * 3 + i) * 40], elbow: [1, 1]};
    const j = guy(ctx, x, GROUND, 1.15, p, {gx: f ? -0.6 : 0.6, mouth: laugh ? 'grin' : talk ? 'O' : 'smile', eyes: laugh ? 'happy' : undefined}, {flip: f, accent: {kind, color: GREEN}});
    const hd = W(x, GROUND, j.head, 1.15, f);
    for (const [k, w] of [[0.3 + off * 0.8, '$1'], [1.6 + off * 0.8, '$5'], [2.9 + off * 0.5, '$1']]) wordTag(ctx, hd[0] + (f ? -70 : 70), hd[1] - 30, w, (lt - k) / 0.9, {size: 42});
  }
  const j = guy(ctx, 1120, GROUND, S, {...breathe(STAND, lt), rh: [70, -250], elbow: [1, 1]}, {gx: lt < 2.0 ? -0.8 : 0.1, gy: lt < 2.0 ? 0 : 0.5, mouth: 'flat', eyes: blink(t, 0.4)},
    {flip: true, after: (c, jj) => cup(c, jj.rh[0] + 10, jj.rh[1] + 40, t, false)});
  const hd = W(1120, GROUND, j.head, S, true);
  wallet(ctx, hd[0], hd[1] - 160, lerp(214, 1280, ease((lt - 0.3) / 2.4)), {flash: lt > 2.7 && lt < 3.2 ? 1 : 0});
  for (let k = 0; k < 9; k++) at(t, 11.5 + k * 0.27, 'coin', 0.22); at(t, 14.0, 'ping', 0.4);
  for (const k of [11.7, 12.8, 14.1]) at(t, k, 'pop', 0.18);
}, {cam: lt => ({z: lerp(1.02, 1.1, lt / 3.8), fx: lerp(700, 760, lt / 3.8), fy: 1160}), hand: 1,
  overlay: (ctx, lt) => label(ctx, lt < 1.5 ? 'DAY 40' : 'DAY 60', {lt: lt < 1.5 ? lt : lt - 1.5})});

// ---------- S5 15.0–19.0: phone — Mom · Hospital. Come now. ----------
shot(15.0, 19.0, (ctx, lt, t) => {
  bg(ctx);
  phoneCloseup(ctx, (c, SX, SY, SW, SH) => {
    txt(c, 'Mom', SX + SW / 2, SY + 130, 60, INK);
    D.line(c, [[SX + 40, SY + 190], [SX + SW - 40, SY + 190]], {w: 3, color: LIGHT});
    if (lt > 0.35) { const k = backOut((lt - 0.35) / 0.3); c.save(); c.translate(SX + 40, SY + 300); c.scale(k, k); c.translate(-(SX + 40), -(SY + 300));
      c.font = '600 60px Inter6'; const lines = ['Hospital.', 'Come now.'], w = Math.max(...lines.map(s => c.measureText(s).width)) + 80, h = lines.length * 78 + 44;
      rr(c, SX + 40, SY + 260, w, h, 36, '#EFEFEF'); lines.forEach((s, i) => txt(c, s, SX + 80, SY + 260 + 22 + 39 + i * 78, 60, INK, 'Inter6', 'left')); c.restore(); }
  }, {buzz: lt < 1.2 ? 1 : lt > 2.4 && lt < 2.9 ? 0.6 : 0, t, thumb: [PHONE_THUMB_X(lt), 1300]});
  at(t, 15.05, 'buzz', 0.7); at(t, 15.4, 'notif', 0.6); at(t, 17.4, 'buzz', 0.5); at(t, 18.4, 'heart', 0.6);
}, {cam: lt => ({z: lerp(1.0, 1.1, ease(lt / 4)), fx: 640, fy: 1000}), hand: 1.6});
function PHONE_THUMB_X(lt) { return 910 + Math.sin(twos(lt) * 6) * 4; }

// ---------- S6 19.0–23.0: he runs ----------
{
  const F = 1.55, v = 380 * S * F, X0 = -200;
  shot(19.0, 23.0, (ctx, lt, t) => {
    street(ctx, -800, 4600);
    // hospital at the end of the street: a plain cross on the facade
    const HX = 3100; D.rect(ctx, HX, GROUND - 900, 700, 900, {fill: WHITE, w: 6}); D.rect(ctx, HX + 300, GROUND - 260, 120, 260, {w: 5});
    D.rect(ctx, HX + 290, GROUND - 760, 120, 40, {fill: INK, w: 3}); D.rect(ctx, HX + 330, GROUND - 800, 40, 120, {fill: INK, w: 3});
    const T = twos(lt), x = X0 + v * T;
    const j = guy(ctx, x, GROUND, S, frun(T * F, {lean: 0.3}), {gx: 0.8, mouth: 'strain', eyes: 'wide', sweat: true});
    const hd = W(x, GROUND, j.head);
    wallet(ctx, hd[0] - 30, hd[1] - 160, 1280, {s: 0.95});
    for (let k = 0; k < 12; k++) at(t, 19.05 + k / (2 * F), 'step', 0.5);
  }, {cam: lt => { const x = X0 + v * lt; return {z: 1.22, fx: x + 200, fy: 1180}; }, hand: 2, shake: () => 1.5});
}

// ---------- S7 23.0–30.0 / S8 30.0–37.0: hospital bed ----------
const BED_TOP = 1235, MOM = [370, 1150], MHAND = [610, 1196];
function monitor(ctx, t, x = 1030, y = 760) {
  D.line(ctx, [[x + 100, y + 160], [x + 100, GROUND]], {w: 6}); D.line(ctx, [[x + 40, GROUND], [x + 160, GROUND]], {w: 6});
  rr(ctx, x, y, 200, 160, 14, WHITE, INK, 6); rr(ctx, x + 14, y + 14, 172, 120, 8, '#F7F7F7');
  // a scrolling heartbeat trace
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, ph = ((u * 1.6 - t * 0.9) % 1 + 1) % 1;
    const yv = ph > 0.42 && ph < 0.46 ? -38 : ph > 0.46 && ph < 0.5 ? 26 : ph > 0.5 && ph < 0.53 ? -10 : 0; pts.push([x + 22 + u * 156, y + 80 + yv]); }
  ctx.strokeStyle = GREEN; ctx.lineWidth = 4; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
}
function bedFrame(ctx) {
  D.line(ctx, [[220, 1000], [220, GROUND - 40]], {w: 8}); D.line(ctx, [[220, 1000], [270, 1000]], {w: 6});
  D.rect(ctx, 220, BED_TOP, 790, 230, {fill: WHITE, w: 6}); D.line(ctx, [[240, BED_TOP + 70], [990, BED_TOP + 70]], {w: 3, color: LIGHT});
  for (const x of [280, 950]) { D.line(ctx, [[x, BED_TOP + 230], [x, GROUND - 22]], {w: 6}); D.ellipse(ctx, x, GROUND - 14, 16, 16, {fill: WHITE, w: 5}); }
}
function momInBed(ctx, face, {handUp = 0} = {}) {
  D.ellipse(ctx, 330, BED_TOP - 40, 120, 50, {fill: WHITE, w: 5}); // pillow
  D.setLW(BASE_LW); ctx.save(); ctx.translate(MOM[0], MOM[1]); ctx.scale(S, S); D.head(ctx, [0, 0], -0.25, face); ctx.restore(); D.setLW(1);
  // blanket over her body: a soft hump to the feet
  D.line(ctx, [[420, BED_TOP + 10], [430, BED_TOP - 60], [560, BED_TOP - 74], [760, BED_TOP - 58], [900, BED_TOP - 70], [960, BED_TOP - 40], [980, BED_TOP + 10]], {w: 6, fill: WHITE});
  // her arm on top of the blanket
  D.line(ctx, [[450, BED_TOP - 52], [530, BED_TOP - 40 - handUp * 4], [MHAND[0] - 10, MHAND[1] - handUp * 8]], {w: 6 * BASE_LW * S});
  D.ellipse(ctx, MHAND[0], MHAND[1] - handUp * 8, 14, 11, {fill: WHITE, w: 4.5});
}
/** him standing behind the bed (legs hidden), then his arm redrawn on top to hold her hand */
function himBehind(ctx, x, p, face, lt) {
  const j = guy(ctx, x, GROUND, S, p, face, {flip: true});
  bedFrame(ctx);
  return j;
}
function arm(ctx, x, j) {
  const sh = W(x, GROUND, j.sh, S, true), el = W(x, GROUND, j.re, S, true), h = W(x, GROUND, j.rh, S, true);
  D.line(ctx, [sh, el, h], {w: 6 * BASE_LW * S}); D.ellipse(ctx, h[0], h[1], 14, 11, {fill: WHITE, w: 4.5});
}
shot(23.0, 30.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 1800); const T = twos(lt);
  monitor(ctx, t);
  D.rect(ctx, 520, 520, 300, 260, {w: 5, color: '#C9C9C9'}); D.line(ctx, [[670, 520], [670, 780]], {w: 3, color: '#D6D6D6'}); // window
  const enter = clamp(T / 1.8), x = lerp(1250, 720, ease(enter)), walking = T < 1.8;
  const reach = ease((T - 3.6) / 0.9);
  const hold = {...STAND, lean: -0.22 * reach - 0.04, headLean: 0.2, rh: [lerp(70, 92, reach), lerp(-110, -278, reach)], elbow: [1, 1]};
  const p = walking ? fwalk(T * 1.3, {lean: 0.06}) : breathe(hold, lt, 2);
  const face = T < 2.6 ? {gx: 0.6, gy: 0.3, mouth: 'flat', eyes: blink(t)} : T < 3.6 ? {gx: 0.7, gy: 0.8, mouth: 'frown'} : {gx: 0.7, gy: 0.9, mouth: 'frown', eyes: T > 5.9 && T < 6.0 ? 'closed' : undefined};
  const j = himBehind(ctx, x, p, face, lt);
  const wake = clamp((T - 5.0) / 1.0);
  momInBed(ctx, wake <= 0 ? {mouth: 'flat', eyes: 'closed'} : wake < 1 ? {mouth: 'flat', eyes: 'oneOpen', gx: 0.5} : {gx: 0.8, gy: -0.6, mouth: 'flat'});
  if (!walking) arm(ctx, x, j);
  const hd = W(x, GROUND, j.head, S, true);
  wallet(ctx, hd[0], hd[1] - 160, 1280);
  for (let k = 0; k < 8; k++) at(t, 23.1 + k * 0.85, 'heart', 0.4);
  if (walking) for (let k = 0; k < 4; k++) at(t, 23.2 + k * 0.4, 'step', 0.25);
  at(t, 27.4, 'paper', 0.25);
}, {cam: lt => ({z: lerp(1.08, 1.4, ease((lt - 1.5) / 5)), fx: lerp(700, 560, ease((lt - 1.5) / 5)), fy: lerp(1150, 1080, ease((lt - 1.5) / 5))}), hand: 1});
// S8 30.0–37.0: he speaks — I · LOVE · YOU; the wallet drains $1,280 -> $0; Mom smiles
shot(30.0, 37.0, (ctx, lt, t) => {
  bg(ctx); floor(ctx, -400, 1800); const T = twos(lt);
  monitor(ctx, t);
  const x = 720, base = {...STAND, lean: -0.26, headLean: 0.2, rh: [92, -278], elbow: [1, 1]};
  const inhale = kf([[0, 0], [0.6, 1], [1.0, 0]], T);
  const p = {...base, hip: [0, -223 - inhale * 6], headLean: 0.2 - inhale * 0.12};
  const speaking = T > 1.0 && T < 2.8, wordMouth = speaking ? (Math.floor(T * 6) % 2 ? 'O' : 'smile') : T >= 2.8 ? 'smile' : 'flat';
  const j = himBehind(ctx, x, p, {gx: 0.7, gy: 0.8, mouth: wordMouth, eyes: T > 4.2 ? 'happy' : blink(t, 0.2)}, lt);
  const smile = T > 3.3;
  momInBed(ctx, smile ? {gx: 0.8, gy: -0.6, mouth: 'smile', eyes: T > 4.4 ? 'happy' : undefined} : {gx: 0.8, gy: -0.6, mouth: 'flat'}, {handUp: ease((T - 3.6) / 0.5)});
  arm(ctx, x, j);
  const hd = W(x, GROUND, j.head, S, true), mouth = [hd[0] - 30, hd[1] + 40];
  [['I', 1.0], ['LOVE', 1.6], ['YOU', 2.2]].forEach(([w, k], i) => wordTag(ctx, mouth[0] - 190, mouth[1] - 330 + i * 110 + Math.min(1, (lt - k) / 2.6) * 60, w, (lt - k) / 2.6, {size: 58}));
  const drain = ease((lt - 1.0) / 2.6);
  wallet(ctx, hd[0] + 60, hd[1] - 175, lerp(1280, 0, drain), {s: 1.25, flash: drain > 0 && drain < 1 ? 1 : 0, shake: drain > 0 && drain < 1 ? 2 : 0, t});
  at(t, 30.25, 'breath', 0.5);
  at(t, 31.0, 'pop', 0.5); at(t, 31.6, 'pop', 0.5); at(t, 32.2, 'pop', 0.5); at(t, 31.05, 'cash', 0.8);
  for (let k = 0; k < 10; k++) at(t, 31.2 + k * 0.24, 'coin', 0.3);
  for (let k = 0; k < 7; k++) at(t, 30.1 + k * 0.85, 'heart', 0.3);
}, {cam: lt => ({z: lerp(1.5, 1.62, ease(lt / 7)), fx: 560, fy: 1020}), hand: 0.8});

// ---------- sound ----------
bed('room', 0, 1.6, 0.5);
bed('street', 2.9, 8.0, 0.8);
bed('room', 8.0, 11.2, 0.5); bed('crowd', 11.2, 15.0, 0.55);
bed('silence', 15.0, 15.04);
music('tense', 19.0, 23.0, 0.9); bed('street', 19.0, 23.0, 0.5);
bed('hum', 23.0, 30.0, 0.35);
bed('silence', 30.0, 31.0);
music('tender', 32.4, 37.0, 0.9);
await run({dir: DIR, duration: 37.0});
