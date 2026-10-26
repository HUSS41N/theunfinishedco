// Screen text, speech bubbles and the text linter. Owner: text. Browser-safe (no Node imports).
// Rules, fields and the researched numbers: docs/TEXT.md. Safe rect, bands, sizes, reading time: src/layout.mjs.
//
// ── How scene.mjs wires this in (motion owner) ──────────────────────────────────────────────────────────────────────
//   import {screenText, bubbleLayer, talking, camToScreen} from './text.mjs';
//   // in frameSVG, after building `cam` ({x, y, zoom, rot} incl. shake) and the actors:
//   const toScreen = camToScreen(cam, W, H);            // world [x,y] → screen [x,y]; the same maths as the 'world' layer
//   const speakers = [{id, facing, anchors}];            // one per actor on screen; anchors in WORLD coords:
//                                                        //   headTop, headCenter, mouth (the builder's anchors + actor x,y,rot)
//   const bubbles = bubbleLayer(shot, lt, C, speakers, toScreen);   // layer 8: above the whole world
//   const texts   = screenText(shot, lt, C, speakers, toScreen);     // layer 9 (speakers optional: nudges text off heads)
//   … layer('screen', {}, bubbles, texts, overlays)
//   // mouths: before building an actor, `if (talking(shot, lt, a.id)) face.mouth = <flap>` (or add a talk action)
//   // render.mjs --check: for (const w of lintText(C, {headsAt})) console.log(`${w.level} ${w.t.toFixed(2)}s ${w.msg}`)
//   //   headsAt(tAbs) → [{x,y,w,h}] screen head boxes is optional (see headBoxes); it enables the "covers a face" check.
// meta.platformSafe:false turns off the TikTok rail notch for authors who post elsewhere.
// bubbleLayer also accepts `toScreen` via C.toScreen, or a camera via C.cam; with neither it assumes world == screen.
// Theme: (C.style || C.scene.meta.style) === 'stick' → ink text with a white outline; otherwise white with a dark outline.
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import {el, layer, g, path, rect, circle, esc, rrect, id as uid} from './svg.mjs';
import {FRAME, SAFE, RAIL_NOTCH, CENTER_X, BANDS, TEXT_FLOOR_Y, MIN_TEXT_PX, TARGET_TEXT_PX, MAX_LINES, READ, readingTime, regionOf, fitInSafe, outsideSafe, overlap, countWords} from './layout.mjs';

// ---------- colours (kept local so text does not depend on style.mjs internals) ----------
const INK = '#1E1E22', WHITE = '#FFFFFF', DARK = '#121215', YELLOW = '#FFD23F', RED = '#E8442E';
function lum(c) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim()); if (!m) return /white|yellow|cream/i.test(c) ? 0.9 : 0.2;
  const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1];
  const [r, gg, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * gg + 0.0722 * b;
}
const isStick = C => (C?.style || C?.scene?.meta?.style) === 'stick';

// ---------- fonts and metrics (advance widths per 1000 em, read from fonts/*.ttf by tools/gen-metrics.mjs) ----------
const GLYPHS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~…’“”—–•×€£₹°";
const ADV = {"display":[184,270,531,646,685,1018,680,286,359,359,593,678,266,459,266,396,682,413,630,638,690,620,646,579,642,646,266,267,678,678,678,604,1035,764,650,729,711,632,605,740,727,281,585,729,575,925,738,746,648,746,666,685,656,705,750,1037,741,730,652,359,396,359,484,493,341,583,625,583,625,583,426,625,618,279,280,587,279,922,618,607,625,625,416,559,418,618,590,875,563,590,561,486,390,486,678,797,257,513,499,1000,500,367,678,685,634,581,447],"displayBold":[200,258,500,635,668,976,663,278,345,345,563,666,254,452,254,379,665,401,614,628,673,610,631,564,627,631,254,256,666,666,666,585,1021,738,647,728,706,619,593,738,722,270,573,706,565,909,731,747,639,747,658,668,645,705,727,1016,718,709,643,345,379,345,473,484,317,567,611,568,611,572,397,611,601,262,263,568,262,902,601,593,611,611,394,539,392,601,571,846,549,571,541,461,367,461,666,764,241,471,460,1000,500,399,666,672,622,563,441],"serif":[170,275,374,629,424,591,525,235,346,346,449,531,219,426,219,258,461,248,404,373,394,387,411,365,437,414,299,301,531,531,531,358,665,457,479,475,536,454,411,514,545,250,251,499,414,665,542,540,469,541,525,424,461,537,458,653,545,478,427,326,256,326,431,372,355,474,431,351,474,348,273,401,476,288,266,447,240,745,521,414,450,425,368,302,272,508,412,609,450,418,385,320,252,320,531,539,166,316,316,715,505,300,531,491,527,600,434],"sans":[252,321,523,644,650,1004,663,326,373,373,540,673,319,465,319,379,660,423,623,636,666,612,640,576,640,640,319,329,673,673,673,543,999,728,659,737,722,605,588,749,746,277,580,703,565,922,759,769,645,773,652,650,660,736,728,1020,720,713,652,373,379,373,481,469,351,574,624,583,624,591,389,625,612,262,262,569,262,900,612,609,624,624,397,549,353,612,587,839,569,588,566,455,359,455,673,956,294,507,501,1000,500,503,673,679,629,562,458]};
const GI = Object.fromEntries([...GLYPHS].map((ch, i) => [ch, i]));
/** family, weight, style, default tracking (em), metrics table, cap height (em), line height (em) */
const FONTS = {
  display: {family: 'Inter Display', weight: 900, style: 'normal', track: -0.02, m: 'display', cap: 0.73, lh: 1.06},
  serif:   {family: 'Instrument Serif', weight: 400, style: 'italic', track: -0.01, m: 'serif', cap: 0.66, lh: 1.08},
  mono:    {family: 'JetBrains Mono', weight: 600, style: 'normal', track: 0.06, m: 'mono', cap: 0.73, lh: 1.2},
  sans:    {family: 'Inter', weight: 600, style: 'normal', track: -0.03, m: 'sans', cap: 0.73, lh: 1.14},
};
const fontOf = (name, weight) => { const f = FONTS[name] || FONTS.display; return f === FONTS.display && weight && weight < 900 ? {...f, weight, m: 'displayBold'} : weight ? {...f, weight} : f; };
/** width in px of `str` in font f at `size` with letter-spacing `trk` (px) */
export function measure(str, f, size, trk = 0) {
  let w = 0; for (const ch of String(str)) w += f.m === 'mono' ? 600 : (ADV[f.m][GI[ch]] ?? 600);
  return w * size / 1000 + trk * [...String(str)].length;
}

// ---------- easing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = {out: x => 1 - (1 - x) ** 3, inOut: x => x * x * (3 - 2 * x), back: (x, c = 1.3) => 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2};
const n2 = v => +(+v).toFixed(2);
const about = (cx, cy, s) => (s === 1 ? '' : `translate(${n2(cx)} ${n2(cy)}) scale(${n2(s)}) translate(${n2(-cx)} ${n2(-cy)})`);
const notchOn = C => C?.scene?.meta?.platformSafe !== false && !((C?.W || 0) > (C?.H || 0));

// ---------- screen text layout ----------
/** entrance length: 6 frames, so even a hook at t = 0 is readable by frame 6 (research rule 10) */
const IN_DUR = 6 / 24, EXIT_DUR = 0.2, WORD_IN = 0.24, TYPE_CPS = 17;
/** split "THE *PRICE* OF IT" into word tokens; *marked* words are highlight candidates */
const tokens = line => { let on = false; return String(line).split(/\s+/).filter(Boolean).map(w => { const open = w.startsWith('*'), close = w.endsWith('*') && (w.length > 1 || on); const hl = on || open; if (open && !(close && w.length > 1)) on = true; if (close && !(open && w.length > 1 && !on)) on = false; if (open && close && w.length > 1) on = false; return {w: w.replace(/\*/g, ''), hl}; }); };   // *1 DAY* highlights both words
function wrapTokens(toks, f, size, trk, maxW) {
  const out = []; let cur = [];
  for (const t of toks) { const test = [...cur, t].map(x => x.w).join(' '); if (cur.length && measure(test, f, size, trk) > maxW) { out.push(cur); cur = [t]; } else cur.push(t); }
  if (cur.length) out.push(cur); return out;
}
const roleOf = x => x.role || (x.font === 'mono' ? 'label' : x.font === 'sans' || x.font === 'serif' ? 'body' : 'headline');
const lineStr = toks => toks.map(t => t.w).join(' ');

/**
 * Lay out one text item (no time dependence): size after auto-shrink/wrap, lines, word boxes, and the block's box
 * clamped into SAFE (and out of the rail notch). Returns everything screenText and lintText need.
 */
export function layoutText(x, C) {
  const f = fontOf(x.font || 'display', x.weight), role = roleOf(x), notch = notchOn(C) && x.safe !== false;
  const req = x.size || TARGET_TEXT_PX[role] || 108, minPx = MIN_TEXT_PX[role] || MIN_TEXT_PX.headline;
  const plate = x.plate ? {pad: 0.32, r: 0.34, ...(typeof x.plate === 'object' ? x.plate : {})} : null;
  const outlineW = s => (x.outline === false ? 0 : x.outlineWidth ?? Math.round(clamp(s * (plate ? 0.07 : 0.14), 5, 26)));
  const padOf = s => outlineW(s) / 2 + (plate ? plate.pad * s : 0) + 4;
  const ax = x.x ?? CENTER_X, ay = x.y ?? 420;
  const low = notch && ay + 0.2 * req > RAIL_NOTCH.y;                      // sits in the rail band: only 660 px wide
  const avail = x.safe === false ? FRAME.w : low ? RAIL_NOTCH.x - SAFE.x : SAFE.w;
  const maxW = s => avail - 2 * padOf(s);
  const trkOf = s => x.tracking ?? f.track * s;
  // fit: keep the author's lines at the requested size if they fit; else the largest size ≥ the role minimum at which the
  // lines, word-wrapped, fit in ≤ 3 lines; else wrap at the minimum and shrink whatever is still too wide
  const given = String(x.text ?? '').split('\n').map(tokens);
  const widest = (ls, s) => Math.max(...ls.map(l => measure(lineStr(l), f, s, trkOf(s))));
  let lines = given, size = req, wrapped = false;
  if (widest(given, req) > maxW(req)) {
    const shrunk = req * maxW(req) / widest(given, req);
    if (x.wrap === false || shrunk >= minPx || given.every(l => l.length < 2)) size = shrunk;
    else {
      let found = null;
      for (let s = req; s >= Math.min(minPx, req); s -= 2) {
        const ls = given.flatMap(l => wrapTokens(l, f, s, trkOf(s), maxW(s)));
        if (ls.length <= MAX_LINES.block && widest(ls, s) <= maxW(s)) { found = {s, ls}; break; }
      }
      if (!found) { const s = Math.min(minPx, req), ls = given.flatMap(l => wrapTokens(l, f, s, trkOf(s), maxW(s))); found = {s: Math.min(s, s * maxW(s) / widest(ls, s)), ls}; }
      size = found.s; lines = found.ls; wrapped = lines.length !== given.length;
    }
    size = Math.floor(size * 0.995);   // a hair of margin for kerning we do not model
  }
  const trk = trkOf(size), lh = size * (x.lineHeight ?? f.lh), anchor = x.anchor || 'middle';
  const sp = measure(' ', f, size, trk);
  const L = lines.map((toks, i) => ({toks, w: measure(lineStr(toks), f, size, trk), i, base: i * lh}));
  const W = Math.max(...L.map(l => l.w)), ow = outlineW(size), pad = padOf(size);
  const left0 = anchor === 'middle' ? ax - W / 2 : anchor === 'end' ? ax - W : ax;
  const raw = {x: left0 - pad, y: ay - f.cap * size - pad, w: W + 2 * pad, h: f.cap * size + (L.length - 1) * lh + 0.2 * size + 2 * pad};
  const fit = x.safe === false ? {...raw, dx: 0, dy: 0, fits: true} : fitInSafe(raw, {notch});
  const Lx = {x, f, role, size, req, minPx, lh, trk, sp, anchor, X: ax, Y: ay, lines: L, W, ow, pad, plate, raw, notch,
    box: {x: raw.x, y: raw.y, w: raw.w, h: raw.h}, moved: [fit.dx, fit.dy], wrapped};
  shiftLayout(Lx, fit.dx, fit.dy);
  Lx.words = L.flatMap(l => l.words);
  // highlight: `highlight: 'word'|true` → *marked* words, else the last word; a string → that word; a number → that word index
  if (x.highlight === undefined && Lx.words.some(w => w.hl)) x = {...x, highlight: 'word'};   // *marked* words highlight themselves
  if (x.highlight !== undefined && x.highlight !== false) {
    const h = x.highlight, key = s => String(s).replace(/[^\p{L}\p{N}$%]/gu, '').toLowerCase(); let hit = [];
    if (typeof h === 'number') hit = [Lx.words[h]].filter(Boolean);
    else if (typeof h === 'string' && h !== 'word') hit = Lx.words.filter(w => key(w.w) === key(h));
    else { hit = Lx.words.filter(w => w.hl); if (!hit.length) hit = Lx.words.slice(-1); }
    for (const w of hit) w.accent = true;
  }
  Lx.words.forEach((w, i) => { w.idx = i; });
  return Lx;
}
/** move a laid-out block by (dx, dy): anchor point, box and every word */
function shiftLayout(Lx, dx, dy) {
  Lx.X += dx; Lx.Y += dy; Lx.box.x += dx; Lx.box.y += dy;
  for (const l of Lx.lines) {
    let cx = Lx.anchor === 'middle' ? Lx.X - l.w / 2 : Lx.anchor === 'end' ? Lx.X - l.w : Lx.X; l.left = cx;
    const old = l.words; l.words = l.toks.map((t, j) => { const wd = measure(t.w, Lx.f, Lx.size, Lx.trk), o = {...(old?.[j] || {}), ...t, x: cx, wd, y: Lx.Y + l.base}; cx += wd + Lx.sp; return o; });
  }
  if (Lx.words) Lx.words = Lx.lines.flatMap(l => l.words);
}
/**
 * lay out every text of a shot; a block that shares screen time with an earlier block and would overlap it is nudged
 * off it (earlier items win). Static over the item's whole life, so nothing jumps when a neighbour leaves.
 */
export function layoutShot(shot, C) {
  const items = shot.text || [], out = [];
  const together = (a, b) => (a.from ?? 0) < (b.to ?? 1e9) && (b.from ?? 0) < (a.to ?? 1e9);
  items.forEach((x, i) => { const Lx = layoutText(x, C);
    const obst = out.filter((o, j) => together(items[j], x)).map(o => ({box: o.box}));
    if (x.avoid !== false && obst.length) { const b0 = {...Lx.box}; avoidHeads(Lx, obst); Lx.nudged = [Lx.box.x - b0.x, Lx.box.y - b0.y]; }
    out.push(Lx); });
  return out;
}
/** push a block vertically off any head box it covers (continuous in head position, so no jumps), then re-clamp */
function avoidHeads(Lx, heads) {
  for (let pass = 0; pass < 2; pass++) for (const h of heads) {
    if (!overlap(Lx.box, h.box)) continue;
    const up = Lx.box.y + Lx.box.h - h.box.y + 12, down = h.box.y + h.box.h - Lx.box.y + 12;
    const prefUp = Lx.box.y + Lx.box.h / 2 < h.box.y + h.box.h / 2;
    const tryMove = d => { const f = fitInSafe({...Lx.box, y: Lx.box.y + d}, {notch: Lx.notch}); return {d: f.y - Lx.box.y, dx: f.x - Lx.box.x, ok: !overlap({...Lx.box, x: f.x, y: f.y}, h.box)}; };
    const a = tryMove(prefUp ? -up : down), b = tryMove(prefUp ? down : -up), m = a.ok || !b.ok ? a : b;
    shiftLayout(Lx, m.dx, m.d);
  }
}

/** the colours for an item: fill, outline (contrast-picked), accent, shadow, plate */
function paintOf(x, C) {
  const stick = isStick(C), fill = x.color || (stick ? INK : WHITE), light = lum(fill) > 0.35;
  const outline = x.outline === false ? 'none' : typeof x.outline === 'string' ? x.outline : light ? DARK : WHITE;
  const accent = x.accent || (stick ? RED : YELLOW);
  const plateFill = typeof x.plate === 'object' && x.plate.color ? x.plate.color : light ? DARK : WHITE;
  const shadow = x.shadow === false ? null : x.shadowColor || (light ? '#000000' : '#3A2A1A');
  return {fill, outline, accent, plateFill, shadow, shadowOp: light ? 0.5 : 0.28};
}

const fmtNum = (v, tpl) => { const dec = (tpl.split('.')[1] || '').length, s = Math.abs(v).toFixed(dec); const [i, d] = s.split('.');
  const ii = tpl.includes(',') ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : i; return (v < 0 ? '-' : '') + ii + (d ? '.' + d : ''); };
/** "$1,280 saved" at progress p (0..1) from countFrom → "$640 saved" */
function countString(str, p, from = 0) { return str.replace(/\d[\d,]*(\.\d+)?/g, m => { const to = parseFloat(m.replace(/,/g, '')); return fmtNum(from + (to - from) * p, m); }); }

const animOf = x => x.anim || (x.pop === false ? 'none' : 'pop');
const staggerOf = (x, n) => x.stagger ?? clamp(0.9 / Math.max(1, n), 0.06, 0.14);
const countDurOf = x => x.countDur ?? clamp(((x.to ?? (x.from ?? 0) + 2) - (x.from ?? 0)) * 0.4, 0.6, 1.4);
/** whole-block entrance at u seconds after `from`: {s, op, dx, dy} */
function entrance(x, u) {
  const anim = animOf(x), iu = clamp(u / IN_DUR);
  if (anim === 'pop' || anim === 'count') return {s: 0.7 + 0.3 * E.back(iu), op: clamp(iu * 3), dx: 0, dy: 0};
  if (anim === 'slide') { const d = 90 * (1 - E.out(iu)), dir = x.dir || 'up'; return {s: 1, op: clamp(iu * 2.5), dx: dir === 'left' ? -d : dir === 'right' ? d : 0, dy: dir === 'down' ? -d : dir === 'up' ? d : 0}; }
  return {s: 1, op: 1, dx: 0, dy: 0};
}
/** per-word pop for anim 'words' */
const wordIn = wu => ({s: 0.5 + 0.5 * E.back(clamp(wu)), op: clamp(wu * 3)});
const settled = e => e.op >= 0.9 && Math.abs(e.s - 1) <= 0.02 && Math.hypot(e.dx || 0, e.dy || 0) <= 3;
/**
 * seconds after `from` when the text becomes READABLE (research rule 7/8): ≥ 90% opaque and within 2% of its final
 * scale/position. Typewriter at ≤ 17 cps counts while typing (the eye follows it); faster reveals count only when done.
 * `count` is readable when the number lands.
 */
export function revealTime(x, Lx) {
  const anim = animOf(x), n = Lx?.words?.length || 1;
  if (anim === 'type') { const cps = x.cps || TYPE_CPS, dur = [...String(x.text).replace(/[*]/g, '')].length / cps; return cps <= READ.cps ? 0 : dur; }
  let last = 0;
  const steps = 48; for (let i = 0; i <= steps; i++) { const u = i / steps * 0.6; if (!settled(entrance(x, u))) last = u + 0.6 / steps; }
  if (anim === 'words') { let w = 0; for (let i = 0; i <= steps; i++) { const u = i / steps * 0.6, e = wordIn(u / WORD_IN); if (!settled({...e, dx: 0, dy: 0})) w = u + 0.6 / steps; } last = Math.max(last, staggerOf(x, n) * (n - 1) + w); }
  if (anim === 'count') last = Math.max(last, countDurOf(x));
  return last;
}

/** one text item at shot time lt → svg (or '') */
function renderText(x, lt, C, heads, pre) {
  const from = x.from ?? 0, to = x.to ?? 1e9; if (lt < from || lt >= to) return '';
  const Lx = pre ? {...pre, box: {...pre.box}, lines: pre.lines.map(l => ({...l}))} : layoutText(x, C), P = paintOf(x, C), {f, size, trk, anchor} = Lx, anim = animOf(x), u = lt - from;
  if (heads?.length && x.avoid !== false) avoidHeads(Lx, heads);
  const exit = x.exit ?? 'fade', exitDur = x.exitDur ?? EXIT_DUR, eu = exit === 'none' || to > 1e8 ? 0 : clamp((lt - (to - exitDur)) / exitDur);
  const base = {'font-family': f.family, 'font-weight': f.weight, 'font-style': f.style, 'font-size': n2(size), 'letter-spacing': n2(trk)};
  const ink = (str, xx, yy, fill, extra = {}) => el('text', {x: n2(xx), y: n2(yy), ...base, fill, stroke: P.outline, 'stroke-width': P.outline === 'none' ? undefined : Lx.ow,
    'stroke-linejoin': 'round', 'paint-order': 'stroke fill', ...extra}, esc(str));
  const cx = Lx.box.x + Lx.box.w / 2, cy = Lx.box.y + Lx.box.h / 2, kids = [];
  if (Lx.plate) { const b = Lx.box, r = Math.min(b.h / 2, Lx.plate.r * size * 2); kids.push(path(rrect(b.x + 4, b.y + 4, b.w - 8, b.h - 8, r), P.plateFill, {'fill-opacity': Lx.plate.opacity ?? 0.9})); }
  const st = staggerOf(x, Lx.words.length);
  // highlight underline swipes (behind the words)
  for (const w of Lx.words.filter(w => w.accent && x.underline !== false)) {
    const p = E.out(clamp((u - (anim === 'words' ? w.idx * st + 0.12 : IN_DUR)) / 0.3)); if (p <= 0) continue;
    const bh = Math.max(8, size * 0.11), y = w.y + size * 0.15;
    kids.push(path(rrect(w.x - size * 0.04, y, Math.max(bh, (w.wd + size * 0.08) * p), bh, bh / 2), P.accent, P.outline === 'none' ? {} : {stroke: P.outline, 'stroke-width': Math.max(4, Lx.ow * 0.6), 'paint-order': 'stroke fill'}));
  }
  const accentAll = Lx.words.some(w => w.accent);
  if (anim === 'type') {
    let left = Math.floor(u * (x.cps || TYPE_CPS));
    for (const l of Lx.lines) { if (left <= 0) break; const s = lineStr(l.toks), part = s.slice(0, left); left -= s.length + 1;
      kids.push(ink(part, l.left, Lx.Y + l.base, P.fill));
      if (left < 0 && Math.floor(u * 4) % 2 === 0) kids.push(rect(l.left + measure(part, f, size, trk) + size * 0.06, Lx.Y + l.base - f.cap * size, size * 0.08, f.cap * size, P.fill)); }
  } else if (anim === 'count') {
    const p = E.out(clamp(u / countDurOf(x)));
    for (const l of Lx.lines) kids.push(ink(countString(lineStr(l.toks), p, x.countFrom ?? 0), l.left, Lx.Y + l.base, accentAll ? P.accent : P.fill));
  } else if (anim === 'words' || accentAll) {
    for (const w of Lx.words) { let s = 1, op = 1;
      if (anim === 'words') { const wu = (u - w.idx * st) / WORD_IN; if (wu <= 0) continue; ({s, op} = wordIn(wu)); }
      const wx = w.x + w.wd / 2, wy = w.y - f.cap * size / 2;
      kids.push(g({transform: about(wx, wy, s) || undefined, opacity: op < 1 ? n2(op) : undefined}, ink(w.w, wx, w.y, w.accent ? P.accent : P.fill, {'text-anchor': 'middle'})));
    }
  } else for (const l of Lx.lines) kids.push(ink(lineStr(l.toks), Lx.X, Lx.Y + l.base, P.fill, {'text-anchor': anchor}));
  // entrance + exit on the whole block
  let {s, op, dx, dy} = entrance(x, u);
  if (eu > 0) { const e = E.inOut(eu); op *= 1 - e; if (exit === 'slide') dy -= 60 * e; else if (exit === 'pop') s *= 1 - 0.25 * e; else if (exit === 'down') dy += 60 * e; }
  if (op <= 0.001) return '';
  const defs = []; let filter;
  if (P.shadow) { const fid = uid('tsh'); filter = `url(#${fid})`;
    defs.push(el('filter', {id: fid, x: '-15%', y: '-25%', width: '130%', height: '150%'}, el('feDropShadow', {dx: 0, dy: n2(size * 0.05), stdDeviation: n2(Math.max(4, size * 0.07)), 'flood-color': P.shadow, 'flood-opacity': P.shadowOp}))); }
  const transform = [dx || dy ? `translate(${n2(dx)} ${n2(dy)})` : '', about(cx, cy, s)].filter(Boolean).join(' ') || undefined;
  return layer('text:' + String(x.id || x.text).slice(0, 24).replace(/[^\w ]/g, ''), {transform, opacity: op < 1 ? n2(op) : undefined},
    defs.length ? el('defs', {}, defs) : '', g({filter}, kids));
}

/**
 * every screen-text item of `shot` at shot time `lt` → svg. Fields: docs/TEXT.md.
 * Optional speakers/toScreen (the same values bubbleLayer gets): text is nudged vertically off any head it would cover.
 */
export function screenText(shot, lt, C, speakers, toScreen) {
  const ts = toScreen || C?.toScreen || (C?.cam ? camToScreen(C.cam, C.W, C.H) : p => p);
  const heads = (speakers || []).filter(sp => sp.anchors?.headTop && !sp.ghost).map(sp => headOf(sp, ts));
  const L = layoutShot(shot, C);
  return (shot.text || []).map((x, i) => renderText(x, lt, C, heads, L[i])).join('');
}

// ---------- speech bubbles ----------
/** world → screen for scene.mjs's camera: translate(W/2,H/2) rotate(rot) scale(zoom) translate(-x,-y) */
export function camToScreen(cam = {}, W = FRAME.w, H = FRAME.h) {
  const z = cam.zoom ?? 1, r = (cam.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), X = cam.x ?? W / 2, Y = cam.y ?? H / 2;
  const fn = ([x, y]) => { const ux = (x - X) * z, uy = (y - Y) * z; return [W / 2 + ux * c - uy * s, H / 2 + ux * s + uy * c]; };
  fn.zoom = z; return fn;
}

const KIND = {
  speech:  {font: 'display', weight: 800, size: 60},
  think:   {font: 'display', weight: 800, size: 56},
  shout:   {font: 'display', weight: 900, size: 66, upper: true},
  whisper: {font: 'sans', weight: 600, size: 54},
};
const BUBBLE_IN = 5 / 24, BUBBLE_OUT = 0.18;

/** bubble geometry for a say at scale k: wrapped lines (≤ 2 when possible), size, box w/h */
function bubbleBox(say, k = 1) {
  const K = KIND[say.kind] || KIND.speech, f = fontOf(K.font, K.weight), think = say.kind === 'think', shout = say.kind === 'shout';
  const padK = {x: think ? 0.95 : shout ? 1.0 : 0.62, y: think ? 0.75 : shout ? 0.85 : 0.46};
  const txt = K.upper ? String(say.text).toUpperCase() : String(say.text);
  let size = Math.max(MIN_TEXT_PX.bubble, Math.round((say.size || K.size) * k)), lines, trk;
  const wrapAt = (sz, maxW) => txt.split('\n').flatMap(l => wrapTokens(tokens(l), f, sz, f.track * sz, maxW)).map(lineStr);
  for (;;) {
    trk = f.track * size;
    const widest = SAFE.w - 2 * padK.x * size;
    lines = wrapAt(size, Math.min(widest, (say.w || 560) * Math.max(0.85, k)));
    if (lines.length > MAX_LINES.bubble) lines = wrapAt(size, widest);                   // widen before shrinking
    if (lines.length <= MAX_LINES.bubble || size <= MIN_TEXT_PX.bubble) break;
    size = Math.max(MIN_TEXT_PX.bubble, size - 4);
  }
  const tw = Math.max(...lines.map(l => measure(l, f, size, trk))), lh = size * 1.14;
  const padX = size * padK.x, padY = size * padK.y;
  const w = Math.min(SAFE.w, Math.max(size * 2.6, tw + 2 * padX)), h = lines.length * lh - (lh - size * f.cap) + 2 * padY;
  return {f, size, trk, lines, lh, w, h, padY, kind: say.kind || 'speech'};
}

/** the outline shape of a bubble body (box at bx,by,w,h) as a path d */
function bodyPath(B, bx, by) {
  const {w, h, kind} = B;
  if (kind === 'think') {   // cloud: lumps round an ellipse
    const cx = bx + w / 2, cy = by + h / 2, n = 11; let d = '';
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * w * 0.47, y = cy + Math.sin(a) * h * 0.44;
      if (!i) { d = `M${n2(x)} ${n2(y)}`; continue; } const am = (i - 0.5) / n * Math.PI * 2, bulge = 1.28;
      d += ` Q${n2(cx + Math.cos(am) * w * 0.47 * bulge)} ${n2(cy + Math.sin(am) * h * 0.44 * bulge)} ${n2(x)} ${n2(y)}`; }
    return d + 'Z';
  }
  if (kind === 'shout') {   // burst
    const cx = bx + w / 2, cy = by + h / 2, n = 22; let d = '';
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 0.5 : 0.5 + 0.09 + ((i * 37) % 5) * 0.012;
      d += `${i ? ' L' : 'M'}${n2(cx + Math.cos(a) * w * r)} ${n2(cy + Math.sin(a) * h * (r + (i % 2 ? 0 : 0.06)))}`; }
    return d + 'Z';
  }
  return rrect(bx, by, w, h, Math.min(h / 2, B.size * 0.9));
}

/** where the tail leaves the body and where its tip lands (stops at the head's edge so it never covers the face) */
function tailGeom(box, mouth, head) {
  const {x, y, w, h} = box, r = Math.min(h / 2, 40);
  let base;
  if (mouth[1] > y + h) base = [clamp(mouth[0], x + r + 20, x + w - r - 20), y + h - 4];
  else if (mouth[1] < y) base = [clamp(mouth[0], x + r + 20, x + w - r - 20), y + 4];
  else base = [mouth[0] < x ? x + 4 : x + w - 4, clamp(mouth[1], y + r, y + h - r)];
  const vx = mouth[0] - base[0], vy = mouth[1] - base[1], d = Math.hypot(vx, vy) || 1, dir = [vx / d, vy / d];
  // stop where the segment meets the head circle (radius ×1.05), else 70% of the way
  let L = d * 0.7; const ox = base[0] - head.c[0], oy = base[1] - head.c[1], R = head.r * 1.05, b = ox * dir[0] + oy * dir[1], cc = ox * ox + oy * oy - R * R, disc = b * b - cc;
  if (cc > 0 && disc > 0) L = Math.max(18, -b - Math.sqrt(disc) - 4);
  L = Math.max(L, 26);
  return {base, tip: [base[0] + dir[0] * L, base[1] + dir[1] * L], dir, L};
}

export function headBoxes(speakers, toScreen = p => p) { return speakers.filter(sp => sp.anchors?.headTop).map(sp => headOf(sp, toScreen).box); }
function headOf(sp, toScreen) {
  const A = sp.anchors || {}, top = toScreen(A.headTop || [0, 0]), hc = toScreen(A.headCenter || A.headTop || [0, 0]);
  const r = Math.max(20, Math.hypot(hc[0] - top[0], hc[1] - top[1]));
  const mouth = A.mouth ? toScreen(A.mouth) : [hc[0], hc[1] + r * 0.45];
  return {id: sp.id, ghost: !!sp.ghost, top, c: hc, r, mouth, box: {x: hc[0] - r * 0.95, y: top[1] - 6, w: r * 1.9, h: hc[1] + r * 0.92 - top[1] + 6}};   // the drawn head (hair top → chin), not a padded circle
}

/** choose a box for a say next to head H: above, above shifted, beside (away from the frame centre first), then smaller */
function place(say, H, heads, placed, notch) {
  const away = say.side === 'left' ? -1 : say.side === 'right' ? 1 : H.c[0] < CENTER_X ? -1 : 1;
  let best = null;
  for (const k of [1, 0.9, 0.8]) {
    const B = bubbleBox(say, k), gap = Math.max(44, B.size * 0.85);
    const aboveY = H.top[1] - gap - B.h, sideY = H.c[1] - H.r - B.h * 0.55, belowY = Math.max(...heads.map(h => h.box.y + h.box.h)) + gap * 0.6;
    const cands = [
      ['above', H.c[0] - B.w / 2, aboveY], ['above-away', H.c[0] - B.w / 2 + away * B.w * 0.32, aboveY], ['above-toward', H.c[0] - B.w / 2 - away * B.w * 0.32, aboveY],
      ['side-away', away > 0 ? H.box.x + H.box.w + gap * 0.5 : H.box.x - gap * 0.5 - B.w, sideY], ['side-toward', away > 0 ? H.box.x - gap * 0.5 - B.w : H.box.x + H.box.w + gap * 0.5, sideY],
      // no room above or beside (tight close-ups): under the heads, over the bodies, tail pointing up to the mouth
      ['below-away', H.c[0] - B.w / 2 + away * B.w * 0.3, belowY], ['below-toward', H.c[0] - B.w / 2 - away * B.w * 0.3, belowY], ['below', H.c[0] - B.w / 2, belowY],
      // two bubbles under the same heads: stack under the bubbles already placed instead of overlapping them
      ...(placed.length ? [['stack', H.c[0] - B.w / 2, Math.max(belowY, ...placed.map(b => b.y + b.h)) + gap * 0.35], ['stack-away', H.c[0] - B.w / 2 + away * B.w * 0.3, Math.max(belowY, ...placed.map(b => b.y + b.h)) + gap * 0.35]] : [])];
    if (say.side === 'left' || say.side === 'right') cands.splice(0, 3, cands[1], cands[0], cands[2]);
    for (const [name, x, y] of cands) {
      const fit = fitInSafe({x, y, w: B.w, h: B.h}, {notch}), box = {x: fit.x, y: fit.y, w: B.w, h: B.h};
      const hit = heads.reduce((s, h) => s + overlap(box, h.box), 0) + placed.reduce((s, b) => s + 5 * overlap(box, {x: b.x - 16, y: b.y - 16, w: b.w + 32, h: b.h + 32}), 0);
      const score = hit * 10 + Math.hypot(fit.dx, fit.dy) * 0.5 + (fit.fits ? 0 : 1e5) + (1 - k) * 400;
      const headHit = heads.reduce((s, h) => s + overlap(box, h.box), 0), placedHit = hit - headHit;
      if (fit.fits && !placedHit && headHit <= B.w * B.h * 0.06) return {B, box, name, k, hit};   // a sliver of a passing head is tolerated: the bubble keeps its slot instead of hopping
      if (!best || score < best.score) best = {B, box, name, k, score, hit};
    }
  }
  return best;
}

function drawBubble(say, pl, H, lt, C) {
  const {B, box} = pl, stick = isStick(C), u = lt - say.from, eu = clamp((lt - (say.to - BUBBLE_OUT)) / BUBBLE_OUT);
  const T2 = tailGeom(box, H.mouth, H), fill = say.color || WHITE, ink = say.ink || INK;
  const line = say.kind === 'whisper' ? '#6B6B73' : stick || say.kind === 'shout' ? INK : '#CFCBC3';
  const lw = stick || say.kind === 'shout' ? 5 : 3;
  const body = bodyPath(B, box.x, box.y);
  const perp = [-T2.dir[1], T2.dir[0]], bw = Math.min(B.size * 0.42, box.w * 0.12, 30);
  const b1 = [T2.base[0] + perp[0] * bw, T2.base[1] + perp[1] * bw], b2 = [T2.base[0] - perp[0] * bw, T2.base[1] - perp[1] * bw];
  const bend = [T2.base[0] + T2.dir[0] * T2.L * 0.55 + perp[0] * bw * 0.6, T2.base[1] + T2.dir[1] * T2.L * 0.55 + perp[1] * bw * 0.6];
  const tail = say.kind === 'think' ? null : `M${n2(b1[0])} ${n2(b1[1])} Q${n2(bend[0])} ${n2(bend[1])} ${n2(T2.tip[0])} ${n2(T2.tip[1])} L${n2(b2[0])} ${n2(b2[1])}Z`;
  const dots = say.kind === 'think' ? [0.3, 0.62, 0.92].map((p, i) => [T2.base[0] + T2.dir[0] * T2.L * p, T2.base[1] + T2.dir[1] * T2.L * p, B.size * (0.3 - i * 0.08)]) : [];
  const strokeA = {stroke: line, 'stroke-width': lw * 2, 'stroke-linejoin': 'round', ...(say.kind === 'whisper' ? {'stroke-dasharray': '14 10'} : {})};
  const shapes = [
    path(body, fill, strokeA), tail ? path(tail, fill, strokeA) : '', ...dots.map(([x, y, r]) => circle(x, y, r, fill, strokeA)),
    path(body, fill), tail ? path(tail, fill) : '',   // fill pass hides the inner half of the strokes → one clean outline
  ];
  const cx = box.x + box.w / 2, textH = (B.lines.length - 1) * B.lh + B.size * B.f.cap, y0 = box.y + (box.h - textH) / 2 + B.size * B.f.cap;
  const words = B.lines.map((l, i) => el('text', {x: n2(cx), y: n2(y0 + i * B.lh), 'text-anchor': 'middle', 'font-family': B.f.family, 'font-weight': B.f.weight, 'font-size': B.size, 'letter-spacing': n2(B.trk), fill: ink}, esc(l)));
  // motion: grow out of the tail tip with a little overshoot; shrink + fade out
  const iu = clamp(u / BUBBLE_IN); let s = 0.3 + 0.7 * E.back(iu, 1.6), op = clamp(iu * 3);
  if (eu > 0) { s *= 1 - 0.15 * E.inOut(eu); op *= 1 - E.inOut(eu); }
  let rot = 0; if (say.kind === 'shout' && u < 0.45) rot = Math.sin(u * Math.PI * 2 * 5) * 2.2 * (1 - u / 0.45);   // 5 Hz, under the 6 Hz rule
  const o = T2.tip, fid = uid('bsh');
  const shadow = el('filter', {id: fid, x: '-10%', y: '-15%', width: '120%', height: '140%'}, el('feDropShadow', {dx: 0, dy: 6, stdDeviation: 8, 'flood-color': '#000000', 'flood-opacity': stick ? 0.18 : 0.35}));
  return layer(`bubble:${say._actor}`, {transform: `translate(${n2(o[0])} ${n2(o[1])}) rotate(${n2(rot)}) scale(${n2(s)}) translate(${n2(-o[0])} ${n2(-o[1])})`, opacity: op < 1 ? n2(op) : undefined},
    el('defs', {}, shadow), g({filter: `url(#${fid})`}, shapes), words);
}

/** the says of `shot` with their actor id, normalised (a say without `to` stays up for its reading time + motion) */
function saysOf(shot) {
  return (shot.actors || []).flatMap(a => (a.say || []).map((s, i) => ({kind: 'speech', side: 'auto', ...s, from: s.from ?? 0,
    to: s.to ?? (s.from ?? 0) + readingTime(s.text) + BUBBLE_IN + BUBBLE_OUT, _actor: a.id, _i: i})));
}

/**
 * Speech/thought bubbles of the actors' `say` lists at shot time lt, in screen space, above every character.
 * speakers: [{id, facing, anchors: {headTop, headCenter, mouth} in WORLD coords}]; toScreen: world → screen.
 */
export function bubbleLayer(shot, lt, C, speakers = [], toScreen) {
  const ts = toScreen || C?.toScreen || (C?.cam ? camToScreen(C.cam, C.W, C.H) : p => p);
  const live = saysOf(shot).filter(s => lt >= s.from && lt < s.to); if (!live.length) return '';
  const heads = speakers.filter(sp => sp.anchors?.headTop).map(sp => headOf(sp, ts)), placed = [], out = [];
  const texts = (shot.text || []).length ? layoutShot(shot, C).map((Lx, i) => ({box: Lx.box, x: shot.text[i]})) : [];
  for (const say of live.sort((a, b) => a.from - b.from || a._i - b._i)) {
    const H = heads.find(h => h.id === say._actor); if (!H) continue;
    // screen text that shares time with this say is an obstacle too (bubbles sit under the text layer)
    const obst = texts.filter(t => (t.x.from ?? 0) < say.to && say.from < (t.x.to ?? 1e9)).map(t => t.box);
    const pl = place(say, H, heads.filter(h => !h.ghost || h.id === H.id), [...placed, ...obst], notchOn(C)); placed.push(pl.box);   // silhouettes/faded actors are not faces to avoid
    out.unshift(drawBubble(say, pl, H, lt, C));   // later bubbles draw underneath: a stacked bubble's tail tucks behind the one above
  }
  return layer('bubbles', {}, out);
}

/** the active say (not a thought) for an actor at shot time lt, or null: drive mouth flaps with it */
export function talking(shot, lt, actorId) {
  return saysOf(shot).find(s => s._actor === actorId && s.kind !== 'think' && lt >= s.from && lt < s.to - BUBBLE_OUT) || null;
}

// ---------- linter ----------
const short = s => { const t = String(s).replace(/\n/g, ' ').replace(/\*/g, ''); return t.length > 28 ? t.slice(0, 26) + '…' : t; };
const fr = s => Math.round(s * 24);
/**
 * Text warnings for render.mjs --check: [{level: 'warn'|'info', t (absolute s), msg}], sorted by t.
 * opts.headsAt(tAbs) → [{x, y, w, h}] screen head boxes (optional; enables the "covers a face" check).
 */
export function lintText(C, opts = {}) {
  const out = [], items = [], shots = C.shots || C.scene?.shots || [], add = (level, t, msg) => out.push({level, t: +t.toFixed(3), msg});
  for (const sh of shots) {
    const len = sh.end - sh.start;
    const Ls = layoutShot(sh, C);
    for (const [xi, x] of (sh.text || []).entries()) {
      const Lx = Ls[xi], from = sh.start + (x.from ?? 0), to = sh.start + Math.min(x.to ?? len, len), label = `text "${short(x.text)}"`;
      const newVisual = x.newVisual ?? (x.from ?? 0) < 0.1, need = readingTime(x.text, {newVisual});
      const exitDur = x.exit === 'none' ? 0 : x.exitDur ?? EXIT_DUR, rv = revealTime(x, Lx);
      // the same text carried across a cut (same words, same place, no gap) is one card
      const prev = items.findLast(it => !it.bubble && it.x.text === x.text && Math.abs(it.to - from) < 0.05 && Math.abs(it.box.y - Lx.box.y) < 4 && Math.abs(it.box.x - Lx.box.x) < 4);
      if (prev) { prev.to = to; prev.exitDur = exitDur; continue; }
      if (outsideSafe(Lx.raw, {notch: Lx.notch}) && x.safe !== false) add('warn', from, `${label} is outside the safe area (x ${SAFE.x}–${SAFE.x + SAFE.w}, y ${SAFE.y}–${TEXT_FLOOR_Y}${Lx.notch ? `, ≤ x ${RAIL_NOTCH.x} below y ${RAIL_NOTCH.y}` : ''}); moved by (${Lx.moved.map(Math.round).join(', ')}) px`);
      if (Lx.nudged && (Lx.nudged[0] || Lx.nudged[1])) add('info', from, `${label} would overlap an earlier text; nudged by (${Lx.nudged.map(Math.round).join(', ')}) px`);
      if (Lx.size < Lx.minPx - 0.5) add('warn', from, `${label} renders at ${Math.round(Lx.size)}px, under the ${Lx.role} minimum ${Lx.minPx}px${Lx.size < Lx.req ? ' (auto-shrunk: shorten it or break the line)' : ''}`);
      else if (Lx.size < Lx.req - 1) add('info', from, `${label} auto-${Lx.wrapped ? 'wrapped and ' : ''}shrunk ${Lx.req}→${Math.round(Lx.size)}px to fit the safe width`);
      if (Lx.lines.length > MAX_LINES.block) add('warn', from, `${label} has ${Lx.lines.length} lines; ${MAX_LINES.block} at most`);
      const longest = Math.max(...Lx.lines.map(l => lineStr(l.toks).length)); if (longest > 25 && !(C.W > C.H)) add('info', from, `${label} has a ${longest}-character line; about 25 reads best on 9:16`);
      if (x.inDur && x.inDur > READ.maxEntry) add('warn', from, `${label} entry ${fr(x.inDur)} frames; keep ≤ 7`);
      if (opts.headsAt) { const hs = opts.headsAt(from + Math.min(rv + 0.1, (to - from) / 2)) || []; if (hs.some(h => overlap(Lx.box, h))) add('warn', from, `${label} covers a character's head`); }
      items.push({from, to, rv, exitDur, newVisual, box: Lx.box, region: regionOf(Lx.box.y + Lx.box.h / 2), label, x, Lx, words: countWords(x.text), need, tick: !!x.tick || x.lint === false, caption: !!x.caption});
    }
    for (const s of saysOf(sh)) {
      const from = sh.start + s.from, to = sh.start + Math.min(s.to, len), need = readingTime(s.text), label = `${s._actor} says "${short(s.text)}"`;
      const readable = to - from - BUBBLE_IN - BUBBLE_OUT;
      if (readable < need - 0.01) add('warn', from, `${label} is readable ${readable.toFixed(2)}s; needs ${need.toFixed(2)}s. Set to ≥ ${(s.from + need + BUBBLE_IN + BUBBLE_OUT).toFixed(2)}`);
      if (s.size && s.size < MIN_TEXT_PX.bubble) add('warn', from, `${label} size ${s.size}px is under the bubble minimum ${MIN_TEXT_PX.bubble}px (raised automatically)`);
      const B = bubbleBox(s); if (B.lines.length > MAX_LINES.bubble) add('warn', from, `${label} needs ${B.lines.length} lines at the minimum size; bubbles take ${MAX_LINES.bubble}. Shorten it or split it`);
      items.push({from, to, box: null, region: 'bubble:' + s._actor, label, bubble: true});
    }
  }
  // reading time, on whole cards (after merging continuations)
  // captions (`caption: true`) follow a voice: their timing is the speech, so the silent-text reading rules don't apply
  for (const it of items.filter(i => !i.bubble && !i.tick && !i.caption)) {
    const {x, from, to, exitDur, rv, need, label, newVisual} = it, readable = to - exitDur - (from + rv);
    if (animOf(x) === 'type') { const cps = x.cps || TYPE_CPS, typed = [...String(x.text)].length / cps;
      if (cps > READ.cps) add('info', from, `${label} types at ${cps} cps (> ${READ.cps}): the typing does not count as reading time`);
      else if (to - exitDur - (from + typed) < Math.max(0.5, need - typed) - 0.01) add('warn', from, `${label} must hold ≥ ${Math.max(0.5, need - typed).toFixed(2)}s after typing ends; holds ${(to - exitDur - from - typed).toFixed(2)}s`); }
    if (readable < need - 0.01) add('warn', from, `${label} is readable ${readable.toFixed(2)}s; needs ${need.toFixed(2)}s (${countWords(x.text)} words${newVisual ? ', +0.5 new visual' : ''}). Make it last ≥ ${(rv + need + exitDur).toFixed(2)}s`);
    if (need >= READ.max - 0.01) add('warn', from, `${label} needs more than ${READ.max}s to read: split it into two cards`);
  }
  // gaps in one slot: exactly 2 frames, or ≥ 0.5 s; 3–11 frames fail (Netflix); overlapping boxes collide
  const byRegion = {}; for (const it of items) (byRegion[it.region] ||= []).push(it);
  for (const list of Object.values(byRegion)) {
    list.sort((a, b) => a.from - b.from);
    for (let i = 1; i < list.length; i++) { const a = list[i - 1], b = list[i], gap = b.from - a.to, f = Math.round(gap * 24 * 100) / 100;
      if (gap >= -1e-6 && (a.tick || b.tick)) continue;   // tick: true (a ticking counter) opts out of the swap rule
      if (gap < -1e-6) { if (!a.box || overlap(a.box, b.box)) add('warn', b.from, `${b.label} overlaps ${a.label} on screen for ${(-gap).toFixed(2)}s`); }
      else if (f < 1.5) add('warn', b.from, `${b.label} replaces ${a.label} with a ${f.toFixed(1)}-frame gap; use exactly 2 frames (${READ.swapGap.toFixed(3)}s) or ≥ ${READ.minGap}s`);
      else if (f > 2.5 && f < READ.minGap * 24 - 0.5) add('warn', b.from, `${b.label} follows ${a.label} after ${fr(gap)} frames; 3–11 frames flicker: use exactly 2 frames or ≥ ${READ.minGap}s`); }
  }
  // an empty screen between two text cards: ≥ 1 s (BBC); short swaps (≤ 2 frames) are fine
  const cards = items.filter(i => !i.bubble && !i.caption).sort((a, b) => a.from - b.from); let end = -Infinity, prev = null;
  for (const c of cards) { const gap = c.from - end; if (prev && gap > READ.swapGap + 1e-3 && gap < READ.pause - 1e-6 && gap >= READ.minGap - 1e-6) add('info', c.from, `${c.label}: the screen is empty ${gap.toFixed(2)}s after ${prev.label}; an empty pause between cards reads best at ≥ ${READ.pause}s (or swap in 2 frames)`);
    if (c.to > end) { end = c.to; prev = c; } }
  // the hook: the first text of the video
  const hook = cards[0];
  if (hook && hook.from < 1.5) {
    if (hook.from + hook.rv > READ.hookBy + 1e-3) add('warn', hook.from, `hook ${hook.label} is readable at frame ${fr(hook.from + hook.rv)}; make it readable by frame ${fr(READ.hookBy)} (from ≤ ${(READ.hookBy - hook.rv).toFixed(2)}s, or anim "none")`);
    if (hook.words > READ.hookWords || readingTime(hook.x.text) > READ.hookRead) add('warn', hook.from, `hook ${hook.label} has ${hook.words} words; keep it ≤ ${READ.hookWords} (read ≤ ${READ.hookRead}s)`);
    if (hook.box.y < BANDS.hook.y - 0.5 || hook.box.y + hook.box.h > BANDS.hook.y + BANDS.hook.h + 0.5) add('warn', hook.from, `hook ${hook.label} spans y ${Math.round(hook.box.y)}–${Math.round(hook.box.y + hook.box.h)}; put it in the hook band y ${BANDS.hook.y}–${BANDS.hook.y + BANDS.hook.h}`);
  }
  return out.sort((a, b) => a.t - b.t);
}
