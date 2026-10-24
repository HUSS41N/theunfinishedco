// World sets (owner: world). Generated, layered SVG sets at REAL SCALE (actor at scale 1 ≈ 800 px ≈ 1.7 m; 1 m ≈ 470 px).
// Each preset returns {back, mid, front}:
//   back  — behind everything (sky / walls / far → near layers / floor / light pools / furniture against the wall)
//   mid   — drawn over actors marked "behind" (counters, seat rows, poles, hedges: things you can stand behind)
//   front — over the actors (vignette in the flat style; nothing that covers the default framing)
// Every preset renders in both styles: spec.style 'stick' (v1 look: ink outlines, soft warm palette) or 'flat' (v2).
// Sets fill the frame with no visible edges for camera zoom ≥ 0.4, camera x −1500..2600, y 0..1920 (so world
// x −2850..3950, y −2400..4320 must be covered: we draw X0..X1 × Y0..Y1 below).
// Interiors are one-point-perspective boxes: back wall at floorY, side walls beyond the corners, a perspective floor and
// ceiling, skirting, cornice. The vanishing point sits at eye height (≈ 1.55 m above the floor) over x = vx (540).
import {layer, g, path, circle, ellipse, rect, poly, rad, lin, el, stroke, line, rod, clipped, id, tr, text, rrect,
  withStyle, withIds, isStick, inkW, mixHex, darken, lighten, desat, INK} from './svg.mjs';
import {SCENE, P, col, soften, M, facade, cluster, propFn} from './props.mjs';

const X0 = -3400, X1 = 4600, Y0 = -3400, Y1 = 5600;
const NI = {ink: false}, THIN = {ink: 'thin'};
const fill = c => rect(X0, Y0, X1 - X0, Y1 - Y0, c, NI);
const prop = (type, x, y, o = {}, s = 1) => g({transform: tr(x, y, 0, (o.flip ? -1 : 1) * s, s)}, propFn(type)(o));
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
/** a soft world-space vignette (flat style only; stick sets stay light and airy) */
function vignette(W, H, k = 0.45) { if (isStick()) return ''; const gid = id('vig'); return layer('vignette', {}, el('defs', {}, rad(gid, W / 2, H * 0.5, H * 1.25, [[0.5, '#000', 0], [1, '#000', k]])), rect(X0, Y0, X1 - X0, Y1 - Y0, `url(#${gid})`, NI)); }
function glow(cx, cy, r, color, k) { const gid = id('glow'); return [el('defs', {}, rad(gid, cx, cy, r, [[0, color, k], [1, color, 0]])), rect(cx - r, cy - r, r * 2, r * 2, `url(#${gid})`, NI)]; }
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- one-point interior box ----------
function interior(o) {
  const {floorY = 1500, ceilH = 1320, vx = 540, L = -1500, R = 2600, floorKind = 'boards', wainscot = 0, ceilGrid = false} = o;
  const vy = o.vy ?? floorY - 1.55 * M, ceilY = floorY - ceilH, stick = isStick();
  const wall = o.wall, floor = o.floor, trim = o.trim || P('trim'), skirt = o.skirt || (stick ? darken(floor, 0.06) : P('skirting'));
  const side = stick ? mixHex(wall, '#C7AF8F', 0.2) : darken(wall, 0.09), ceil = o.ceiling || (stick ? lighten(wall, 0.4) : lighten(wall, 0.35));
  const at = (yRef, c) => x => vy + (yRef - vy) * (x - vx) / (c - vx);
  const edge = c => (c === L ? X0 : X1);
  const band = (c, yTop, yBot, f, a = NI) => poly([[c, yTop], [c, yBot], [edge(c), at(yBot, c)(edge(c))], [edge(c), at(yTop, c)(edge(c))]], f, a);
  const both = (yTop, yBot, fBack, fSide, a = NI) => [band(L, yTop, yBot, fSide, a), band(R, yTop, yBot, fSide, a), rect(L, yTop, R - L, yBot - yTop, fBack, a)];
  const floorPoly = [[X0, at(floorY, L)(X0)], [L, floorY], [R, floorY], [X1, at(floorY, R)(X1)], [X1, Y1], [X0, Y1]];
  const ceilPoly = [[X0, at(ceilY, L)(X0)], [L, ceilY], [R, ceilY], [X1, at(ceilY, R)(X1)], [X1, Y0], [X0, Y0]];
  const out = [fill(ceil)];
  // ceiling grid (offices, classrooms): radial + depth lines on the ceiling plane
  if (ceilGrid) { const lc = stick ? darken(ceil, 0.12) : darken(ceil, 0.08), ls = [];
    for (let x = L; x <= R; x += 470) ls.push(stroke([[x, ceilY], [vx + (x - vx) * (Y0 - vy) / (ceilY - vy), Y0]], lc, 4));
    const cx = (c, y) => vx + (c - vx) * (y - vy) / (ceilY - vy);   // geometry is pre-fitted to the ceiling plane (no clip groups: resvg-safe, cheap)
    for (let k = 1; k < 8; k++) { const y = vy - (vy - ceilY) / (1 - 0.17 * k); if (y < Y0) break; ls.push(stroke([[cx(L, y), y], [cx(R, y), y]], lc, 4)); }
    const yk = k => vy - (vy - ceilY) / (1 - 0.17 * k), px = (x, y) => vx + (x - vx) * (y - vy) / (ceilY - vy);   // light panels in whole grid cells
    for (let k = 0; k < 5; k++) for (let x = L; x < R; x += 470) { if (((x - L) / 470 + k) % 3) continue; const [ya, yb] = [yk(k) - (yk(k) - yk(k + 1)) * 0.2, yk(k + 1) + (yk(k) - yk(k + 1)) * 0.2], [xa, xb] = [x + 110, x + 360];
      ls.push(poly([[px(xa, ya), ya], [px(xb, ya), ya], [px(xb, yb), yb], [px(xa, yb), yb]], P('bulb'), THIN)); }
    out.push(...ls); }
  out.push(band(L, ceilY, floorY, side), band(R, ceilY, floorY, side), rect(L, ceilY, R - L, ceilH, wall, NI));
  if (wainscot) { const low = o.wallLow || (stick ? P('wallLow') : darken(wall, 0.06));
    out.push(...both(floorY - wainscot, floorY, low, stick ? mixHex(low, '#C7AF8F', 0.2) : darken(low, 0.09)), ...both(floorY - wainscot - 22, floorY - wainscot, trim, darken(trim, 0.08), THIN)); }
  out.push(...both(ceilY, ceilY + 40, trim, darken(trim, 0.08), THIN));
  // floor + pattern
  const fl = [poly(floorPoly, floor, NI)];
  const lc = o.floorLine || (stick ? P('floorLine') : darken(floor, 0.12)), lw = stick ? 4 : 3, pat = [];
  const step = {boards: 120, tiles: 235, lino: 470, carpet: 0, concrete: 470}[floorKind] ?? 120;
  if (step) for (let x = L - ((L - vx) % step); x <= R; x += step) pat.push(stroke([[x, floorY], [vx + (x - vx) * (Y1 - vy) / (floorY - vy), Y1]], lc, lw));
  const fx = (c, y) => vx + (c - vx) * (y - vy) / (floorY - vy);   // floor geometry is pre-fitted to the floor plane (no clip groups)
  if (floorKind === 'tiles' || floorKind === 'lino' || floorKind === 'concrete') for (let k = 1; k < 9; k++) { const y = vy + (floorY - vy) / (1 - 0.12 * k * (floorKind === 'tiles' ? 1 : 1.6)); if (y > Y1 || y < floorY) break; pat.push(stroke([[fx(L, y), y], [fx(R, y), y]], lc, lw)); }
  if (floorKind === 'boards') for (let k = 1; k < 7; k++) { const y = vy + (floorY - vy) / (1 - 0.11 * k); if (y > Y1) break; for (let x = L; x <= R; x += step) if (hash('bj' + k + x) < 0.35) { const a = vx + (x - vx) * (y - vy) / (floorY - vy), b = vx + (x + step - vx) * (y - vy) / (floorY - vy); pat.push(stroke([[a, y], [b, y]], lc, lw)); } }
  if (!stick) { const gid = id('fl'); pat.push(el('defs', {}, lin(gid, 0, floorY, 0, floorY + 2200, [[0, '#000', 0], [1, '#000', 0.22]])), poly(floorPoly, `url(#${gid})`, NI)); }
  fl.push(...pat);
  // skirting and the room's ink edges
  fl.push(...both(floorY - 50, floorY, skirt, darken(skirt, 0.06), THIN));
  if (stick) fl.push(line([[L, ceilY], [L, floorY]], inkW(0.8)), line([[R, ceilY], [R, floorY]], inkW(0.8)), line([[X0, at(floorY, L)(X0)], [L, floorY], [R, floorY], [X1, at(floorY, R)(X1)]], inkW(0.8)), line([[X0, at(ceilY, L)(X0)], [L, ceilY], [R, ceilY], [X1, at(ceilY, R)(X1)]], inkW(0.8)));
  else fl.push(stroke([[L, ceilY], [L, floorY]], darken(side, 0.08), 6), stroke([[R, ceilY], [R, floorY]], darken(side, 0.08), 6));
  return {vy, ceilY, floorY, L, R, ceil: layer('bg:room', {}, out), floor: layer('bg:floor', {}, fl),
    pool: (x, w, k = 0.16, len = 560) => poly([[x - w / 2, floorY + 4], [x + w / 2, floorY + 4], [x + w / 2 + len * 0.55, floorY + len], [x - w / 2 + len * 0.55, floorY + len]], mixHex(floor, '#FFF8E8', k), NI)};
}

// ---------- outdoor helpers ----------
function sky({top, bottom, horizon, clouds = true, sun = null, seed = 's'}) {
  const out = [], stick = isStick();
  if (stick || top === bottom) out.push(fill(bottom));
  else { const gid = id('sky'); out.push(el('defs', {}, lin(gid, 0, Y0 + 1200, 0, horizon, [[0, top], [1, bottom]])), rect(X0, Y0, X1 - X0, Y1 - Y0, `url(#${gid})`, NI)); }
  if (sun) out.push(...(stick ? [] : glow(sun[0], sun[1], sun[2] * 4, P('sun'), 0.5)), circle(sun[0], sun[1], sun[2], P('sun'), THIN));
  if (clouds) for (let i = 0; i < 9; i++) { const x = X0 + 400 + i * 920 + hash(seed + i) * 300, y = -1900 + hash(seed + 'y' + i) * 1900 + (i % 3) * 200, w = 500 + hash(seed + 'w' + i) * 500;
    out.push(g({transform: tr(x, y)}, SCENE.cloud({w, color: stick ? P('cloud') : mixHex(bottom, '#FFFFFF', 0.85)}))); }
  return out;
}
/** a row of distant building silhouettes: base at y, heights in px, colour pre-blended into the sky (resvg-safe) */
function skyline({y, hMin = 400, hMax = 1400, wMin = 260, wMax = 620, color, win = null, winK = 0.4, seed = 'k', gap = 30, roofs = true, box = null}) {
  const out = [], [bx0, by0, bx1, by1] = box || [X0 - 1e4, Y0 - 1e4, X1 + 1e4, Y1 + 1e4];   // box: fit everything inside it (a window view without a clip group)
  const R = (x, yy, w, h, f, a) => { const xa = Math.max(x, bx0), xb = Math.min(x + w, bx1), ya = Math.max(yy, by0), yb = Math.min(yy + h, by1); return xb > xa && yb > ya ? rect(xa, ya, xb - xa, yb - ya, f, a) : ''; };
  let x = box ? bx0 - 100 : X0;
  while (x < Math.min(X1, bx1)) { const w = lerp(wMin, wMax, hash(seed + x)), h = lerp(hMin, hMax, hash(seed + 'h' + x)), c = mixHex(color, '#000000', hash(seed + 'c' + x) * 0.08);
    out.push(R(x, y - h, w, h + 4000, c, THIN));
    if (roofs && hash(seed + 'r' + x) < 0.3) out.push(R(x + w * 0.3, y - h - 60, w * 0.25, 62, c, THIN));
    if (win) for (let wy = y - h + 50; wy < y - 40; wy += 80) for (let wx = x + 30; wx < x + w - 40; wx += 60) if (hash(seed + wx + ':' + wy) < winK && wx > bx0 && wx + 26 < bx1 && wy > by0 && wy + 36 < by1) out.push(rect(wx, wy, 26, 36, win, NI));
    x += w + gap * hash(seed + 'g' + x); }
  return out;
}
/** perspective paving / road lines on an outdoor ground plane, clipped to y ≥ y0 */
function groundLines({vx = 540, vy, y0, y1 = Y1, step = 470, color, w = 4, rows = true, k = 0.14}) {
  const ls = [];
  for (let x = vx - step * 30; x <= vx + step * 30; x += step) ls.push(stroke([[vx + (x - vx) * (y0 - vy) / (y0 - vy), y0], [vx + (x - vx) * (y1 - vy) / (y0 - vy), y1]], color, w));
  if (rows) for (let i = 1; i < 12; i++) { const y = vy + (y0 - vy) / (1 - k * i); if (y > y1 || y < y0) break; ls.push(stroke([[X0, y], [X1, y]], color, w)); }
  return g({}, ...ls);
}

// ---------- palettes per set (flat / stick) ----------
const pick = (flat, stick) => (isStick() ? stick : flat);

export const SETS = {
  // the reference v2 look: charcoal ground, a soft pool of light. Stick: a pale studio void with a soft light pool.
  spotlight: ({W, H, color, floorY = 1500}) => {
    const stick = isStick(), base = stick ? mixHex(color || '#ECE6DC', '#F4EEE6', color ? 0.72 : 0) : (color || P('night'));
    const floor = stick ? darken(base, 0.06) : darken(base, 0.25), vy = floorY - 1.55 * M;
    if (stick) {   // a pale studio void (reference 2.png): faint wall tiles, a tiled floor, soft concentric light
      const tl = darken(base, 0.04), wallTiles = [];
      for (let x = X0; x < X1; x += 470) wallTiles.push(stroke([[x, Y0], [x, floorY]], tl, 4));
      for (let y = floorY - 470; y > Y0; y -= 470) wallTiles.push(stroke([[X0, y], [X1, y]], tl, 4));
      return {back: [layer('bg:wall', {}, fill(base), ...[[1500, 0.1], [1100, 0.2], [750, 0.32]].map(([r, k]) => ellipse(W / 2, floorY - 650, r, r * 1.1, lighten(base, k), NI)), ...wallTiles),
        layer('bg:floor', {}, rect(X0, floorY, X1 - X0, Y1 - floorY, floor, NI), groundLines({vy, y0: floorY, step: 470, color: darken(floor, 0.06), w: 4}), line([[X0, floorY], [X1, floorY]], inkW(0.6)),
          ellipse(W / 2, floorY + 120, 1300, 260, lighten(floor, 0.25), NI), ellipse(W / 2, floorY + 90, 800, 150, lighten(floor, 0.45), NI))], mid: [], front: []};
    }
    return {back: [layer('bg:wall', {}, fill(base)),
      layer('bg:light-pool', {}, glow(W / 2, H * 0.42, H * 0.6, lighten(base, 0.18), 0.9)),
      layer('bg:floor', {}, rect(X0, floorY, X1 - X0, Y1 - floorY, floor, NI), ellipse(W / 2, floorY + 60, 760, 110, darken(floor, 0.3), NI), ...glow(W / 2, floorY + 60, 900, lighten(floor, 0.12), 0.5))],
      mid: [], front: [vignette(W, H, 0.5)]};
  },
  // cinema: dark auditorium, projector glow, rows of seat backs behind, one row of seats the actors sit in (mid layer)
  cinema: ({W, H, floorY = 1500, rowY = 1340, seats = 4, seatX = null, spacing = 300}) => {
    const stick = isStick(), wall = pick('#26272B', '#B89C94'), seat = P('seat');
    const backRows = [];
    for (let r = 5; r >= 0; r--) { const s = 0.8 * Math.pow(0.86, r), yb = rowY + 160 - 230 - r * 190 - r * r * 8, c = mixHex(seat, wall, 0.3 + r * 0.09);   // stadium seating: each row a step higher and further away
      backRows.push(rect(X0, yb - 20, X1 - X0, Y1, mixHex(wall, stick ? '#8E6F68' : '#000000', 0.3 - r * 0.03), NI), rect(X0, yb - 20, X1 - X0, 14, stick ? darken(wall, 0.2) : '#3A3B40', NI));
      const st = spacing * s; for (let i = Math.floor((X0 - 400) / st); i < Math.ceil((X1 + 200) / st); i++) backRows.push(g({transform: tr(i * st + (r % 2) * st * 0.5 + 40, yb, 0, s)}, SCENE.seat({color: c}))); }
    const xs = seatX || Array.from({length: seats}, (_, i) => W / 2 + (i - (seats - 1) / 2) * spacing);
    const rowXs = []; for (let x = xs[0] - spacing * 14; x < xs.at(-1) + spacing * 14; x += spacing) if (!xs.some(v => Math.abs(v - x) < spacing * 0.6)) rowXs.push(x);
    return {
      back: [layer('bg:wall', {}, fill(wall), ...(stick ? [rect(X0, Y0, X1 - X0, 1600 - Y0, lighten(wall, 0.25), NI)] : glow(W / 2, -300, H * 0.85, '#6B7FA8', 0.5)),
          ...Array.from({length: 12}, (_, i) => path(rrect(-3300 + i * 700, -1500, 560, 1200, 30), stick ? darken(wall, 0.05) : '#2C2D32', THIN)),
          ...Array.from({length: 12}, (_, i) => g({}, path('M-60 0 L60 0 L40 -70 L-40 -70Z', stick ? P('woodLight') : '#4A4038', THIN), ellipse(0, 0, 50, 14, P('bulb'), NI)).replace('<g>', `<g transform="translate(${-3020 + i * 700} -180)">`)),
          rect(1650, -560, 300, 120, '#3FA45A', {rx: 10}), text('EXIT', 1800, -478, {'text-anchor': 'middle', 'font-family': 'Inter Display', 'font-weight': 900, 'font-size': 64, fill: '#FFFFFF'})),
        layer('bg:back-rows', {}, backRows),
        layer('bg:floor', {}, rect(X0, floorY, X1 - X0, Y1 - floorY, pick('#1E1F22', '#9C7F78'), NI), stick ? line([[X0, floorY], [X1, floorY]], inkW(0.6)) : '',
          ...Array.from({length: 14}, (_, i) => circle(-3000 + i * 560, floorY + 40, 9, '#FFD98A', NI)))],
      mid: [layer('bg:seat-row', {}, [...rowXs, ...xs].sort((a, b) => a - b).map(x => g({transform: `translate(${x} ${rowY + 160})`}, SCENE.seat({}))))],   // actors with "behind": true sit behind this row
      front: [vignette(W, H, 0.5)],
    };
  },
  // a lived-in room: window, picture, shelf, plant, a door off to the left
  room: ({W, H, wall, floor, floorY = 1500, window: win = true, night = false}) => {
    const stick = isStick(), wl = col(wall, 'wall'), fl = col(floor, 'floor');
    const R = interior({floorY, wall: wl, floor: fl, L: -2500, R: 2900});
    const back = [R.ceil,
      layer('bg:wall-dressing', {}, prop('door', -1000, floorY), prop('frame', 140, floorY - 860, {w: 300, h: 380, art: 'portrait'}), prop('frame', -380, floorY - 900, {w: 260, h: 200, art: 'abstract'}),
        prop('shelf', 1820, floorY - 1050), prop('clock', 1500, floorY - 1150), prop('bookshelf', 2250, floorY), prop('frame', -1800, floorY - 900, {w: 420, h: 300}, 1)),
      win ? layer('bg:window', {}, prop('window', W * 0.72, floorY - 430, {night, curtains: stick ? true : false, view: 'trees'})) : '',
      R.floor, win && !night ? layer('bg:light-pool', {}, R.pool(W * 0.72, 560)) : '',
      layer('bg:furniture', {}, prop('plant', 1300, floorY - 4), prop('lamp', -560, floorY - 4, {}), prop('rug', 540, floorY + 150, {w: 1100, h: 120}), prop('plant', -2150, floorY - 4, {}, 0.9))];
    if (night) back.push(layer('bg:night', {}, ...(stick ? [] : glow(-560, floorY - 700, 900, '#FFD98A', 0.25))));
    return {back, mid: [], front: night ? [vignette(W, H, 0.25)] : []};
  },
  // a street of real buildings (3 m storeys): facades tower out of frame, shopfronts at street level
  street: ({W, H, sky: skyC, floorY = 1560, night = false, seed = 'st'}) => {
    const stick = isStick(), sk = col(skyC, night ? 'glassNight' : 'sky'), base = floorY - 40, vy = floorY - 1.55 * M;
    const cols = pick(['#C98B6B', '#D9C7A6', '#8FA3A8', '#B5654E', '#E3D3B8', '#9AA88A'], ['#E3B9A2', '#EFE2C8', '#C3D0CF', '#D9A08A', '#F2E8D4', '#C5D0B3']);
    const near = []; let x = X0 - 400, i = 0;
    while (x < X1) { const w = [2300, 1900, 2700, 2100, 2500][i % 5], floors = [3, 5, 2, 4, 6][i % 5], gap = [0, 520, 0, 0, 420][i % 5];
      near.push(g({transform: tr(x + w / 2, base)}, facade({w, floors, color: cols[i % cols.length], kind: i % 3 === 1 ? 'brick' : 'plaster', lit: night ? 0.45 : 0, night, awning: [P('accent'), P('accent3'), '#5E8F3A', P('accent2')][i % 4], seed: seed + i})));
      x += w + gap; i++; }
    const farC = stick ? mixHex(sk, '#A9A3B5', 0.35) : mixHex(sk, '#4A5878', 0.45);
    return {back: [layer('bg:sky', {}, sky({top: P('skyTop'), bottom: sk, horizon: base, clouds: !night, sun: night ? null : [3300, -1600, 160], seed})),
        night ? layer('bg:moon', {}, circle(3000, -1500, 150, P('moon'), THIN)) : '',
        layer('bg:far', {}, skyline({y: base - 200, hMin: 1600, hMax: 3800, wMin: 500, wMax: 1100, color: farC, seed: seed + 'f', win: night ? '#F7D774' : null, winK: 0.25})),
        layer('bg:alley', {}, rect(X0, base - 260, X1 - X0, 300, darken(P('pavement'), 0.18), NI)),
        layer('bg:near', {}, near),
        layer('bg:ground', {}, rect(X0, base, X1 - X0, Y1 - base, P('pavement'), NI), groundLines({vy, y0: base, y1: floorY + 330, step: 470, color: darken(P('pavement'), 0.1), w: stick ? 4 : 3}),
          rect(X0, floorY + 330, X1 - X0, 50, P('curb'), THIN), rect(X0, floorY + 380, X1 - X0, Y1, P('road'), NI),
          ...Array.from({length: 9}, (_, k) => rect(X0 + 300 + k * 1000, floorY + 1250, 520, 40, P('paint'), NI)), rect(X0, floorY + 2700, X1 - X0, 60, P('paint'), NI)),
        layer('bg:street-props', {}, prop('bin', 1650, base + 10), prop('hydrant', -600, base + 20), prop('tree', -2200, base + 10, {h: 2900}))],
      mid: [layer('mid:lamps', {}, prop('lampPost', -1150, floorY + 120, {lit: night}), prop('lampPost', 2150, floorY + 120, {lit: night}), prop('lampPost', 4300, floorY + 120, {lit: night}))],
      front: night ? [vignette(W, H, 0.35)] : []};
  },
  // a park: sky, hills on the horizon, a tree line, big real trees (≈ 5.5 m), a path, a bench, flowers
  park: ({W, H, sky: skyC, floorY = 1500, seed = 'pk'}) => {
    const stick = isStick(), sk = col(skyC, 'sky'), hz = floorY - 560, vy = hz, gr = P('grass');
    const hill1 = stick ? mixHex(gr, sk, 0.45) : mixHex(gr, sk, 0.5), hill2 = stick ? mixHex(gr, sk, 0.25) : mixHex(gr, sk, 0.3);
    const farTrees = []; for (let x = X0; x < X1; x += 260) { const s = 0.18 + hash(seed + x) * 0.08; farTrees.push(g({transform: tr(x + hash(seed + 'o' + x) * 120, hz + 30, 0, s)}, SCENE.tree({color: mixHex(P('leaf'), sk, 0.4)}))); }
    const midTrees = [-2500, -1300, 900, 2300, 3600].map((x, i) => g({transform: tr(x, hz + 220, 0, 0.42 + (i % 2) * 0.06)}, SCENE.tree({color: mixHex(P('leaf'), sk, 0.18)})));
    const pathC = stick ? '#EADBC0' : '#E3CFA4';
    return {back: [layer('bg:sky', {}, sky({top: P('skyTop'), bottom: sk, horizon: hz, sun: [2900, -1500, 170], seed})),
        layer('bg:hills', {}, ellipse(-1600, hz + 260, 2900, 700, hill1, THIN), ellipse(2600, hz + 300, 3200, 760, hill1, THIN), ellipse(500, hz + 380, 3000, 640, hill2, THIN)),
        layer('bg:tree-line', {}, farTrees),
        layer('bg:ground', {}, rect(X0, hz + 120, X1 - X0, Y1 - hz, gr, NI), stick ? line([[X0, hz + 120], [X1, hz + 120]], inkW(0.6)) : '', rect(X0, hz + 120, X1 - X0, 160, mixHex(gr, sk, 0.12), NI),
          path(`M${380} ${hz + 140} C${300} ${floorY - 300} ${-300} ${floorY + 100} ${-900} ${Y1} L${1900} ${Y1} C${1300} ${floorY + 200} ${760} ${floorY - 300} ${700} ${hz + 140}Z`, pathC, THIN)),
        layer('bg:mid-trees', {}, midTrees),
        layer('bg:park-props', {}, prop('bush', -700, floorY - 120, {w: 900, h: 420}), prop('bush', 2900, floorY - 140, {w: 1000, h: 460}), prop('bench', 1750, floorY - 60), prop('lampPost', -1500, floorY - 80, {lit: false}),
          ...[[-300, 40], [-180, 60], [1250, 30], [1380, 70], [2500, 50], [-1100, 60]].map(([x, dy], i) => prop('flower', x, floorY + dy, {color: [P('accent'), P('accent2'), '#E8508A'][i % 3], s: 2.4}))),
        layer('bg:trees', {}, prop('tree', -2000, floorY - 20, {h: 2700}), prop('tree', -300, floorY - 60, {h: 2600}), prop('tree', 2200, floorY - 40, {h: 2900}), prop('tree', 3900, floorY - 30, {h: 2500}))],
      mid: [layer('mid:hedge', {}, prop('bush', -1300, floorY + 160, {w: 1100, h: 520}), prop('bush', 2700, floorY + 180, {w: 1200, h: 540}))],
      front: []};
  },
  // an open-plan office: floor-to-ceiling windows onto the city, ceiling panels, carpet
  office: ({W, H, wall, floorY = 1500, seed = 'of'}) => {
    const stick = isStick(), wl = col(wall, stick ? 'wall' : null) || '#DCE3EA', dark = !stick && wall && parseInt(wl.slice(1, 3), 16) < 0x80;
    const fl = pick(dark ? '#2E3646' : '#8E9AA6', '#D9D2C6');
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'carpet', ceilGrid: true, L: -2600, R: 3900});
    const glass = dark ? '#1E2A44' : P('glass'), city = [];
    const wx0 = -1100, wx1 = 2300, wy0 = floorY - 1150, wy1 = floorY - 120;
    city.push(rect(wx0, wy0, wx1 - wx0, wy1 - wy0, glass, NI), ...skyline({y: wy1 + 40, box: [wx0, wy0, wx1, wy1], hMin: 250, hMax: 900, wMin: 160, wMax: 360, color: mixHex(glass, dark ? '#000000' : '#5C6C8A', 0.35), seed, win: dark ? '#F7D774' : lighten(glass, 0.3), winK: dark ? 0.3 : 0.5}));
    const mull = []; for (let x = wx0; x <= wx1; x += 680) mull.push(rect(x - 14, wy0, 28, wy1 - wy0, P('trim'), THIN));
    return {back: [R.ceil,
        layer('bg:windows', {}, g({}, ...city, path(`M${wx0 + 200} ${wy0} L${wx0 + 600} ${wy0} L${wx0} ${wy0 + 700} L${wx0} ${wy0 + 300}Z`, lighten(glass, 0.25), NI)), rect(wx0, wy0, wx1 - wx0, wy1 - wy0, 'none', stick ? {stroke: INK, 'stroke-width': inkW()} : {}), ...mull, rect(wx0 - 30, wy0 - 30, wx1 - wx0 + 60, 40, P('trim'), THIN), rect(wx0 - 30, wy1, wx1 - wx0 + 60, 50, P('trim'), THIN)),
        layer('bg:wall-dressing', {}, prop('whiteboard', 3100, floorY - 430, {w: 1200}), prop('door', -2000, floorY), prop('frame', -1450, floorY - 950, {w: 300, h: 220, art: 'abstract'})),
        R.floor, layer('bg:light-pool', {}, R.pool(600, 3200, 0.1, 500)),
        layer('bg:furniture', {}, prop('plant', -1350, floorY - 4), prop('plant', 2500, floorY - 4, {}, 1.1), prop('bin', 2850, floorY - 4), prop('desk', 3200, floorY + 200, {}), prop('laptop', 3100, floorY + 200 - 362))],
      mid: [], front: []};
  },
  // a night skyline across the water, seen from a promenade with a rail
  nightCity: ({W, H, floorY = 1560, seed = 'nc'}) => {
    const stick = isStick(), skyC = pick('#1B2238', '#6E7499'), water = pick('#18203A', '#7E86A6'), vy = floorY - 1.55 * M, wy = floorY - 640;
    const stars = withStyle('flat', () => Array.from({length: 90}, (_, i) => circle(X0 + (i * 977) % (X1 - X0), Y0 + (i * 613) % 3400, 3 + (i % 3), stick ? '#F4ECDC' : '#F7E7C9', NI)));
    const far = skyline({y: wy, hMin: 500, hMax: 1500, color: mixHex(skyC, '#000000', stick ? 0.12 : 0.15), win: pick('#C9A85A', '#F2D98E'), winK: 0.18, seed: seed + 'a'});
    const near = skyline({y: wy, hMin: 300, hMax: 900, wMin: 360, wMax: 760, color: mixHex(skyC, '#000000', stick ? 0.22 : 0.3), win: '#F7D774', winK: 0.32, seed: seed + 'b'});
    const refl = Array.from({length: 40}, (_, i) => rect(X0 + i * 205 + hash(seed + i) * 80, wy + 40 + (i % 5) * 60, 60 + (i % 4) * 30, 10, pick('#5A5F7A', '#AFB3C8'), NI));
    return {back: [layer('bg:sky', {}, fill(skyC), ...(stick ? [] : glow(2600, -1300, 1400, '#3B4A7A', 0.6)), ...stars, circle(2600, -1300, 170, P('moon'), THIN), circle(2660, -1350, 150, skyC, NI)),
        layer('bg:skyline', {}, far, near), layer('bg:water', {}, rect(X0, wy, X1 - X0, 500, water, NI), ...refl),
        layer('bg:promenade', {}, rect(X0, wy + 420, X1 - X0, Y1, pick('#2A2F3F', '#9A93A4'), NI), groundLines({vy, y0: floorY - 120, step: 470, color: pick('#353B4E', '#8A8395'), w: 4}),
          ...Array.from({length: 16}, (_, i) => rod([[X0 + i * 520, floorY - 120], [X0 + i * 520, floorY - 640]], pick('#4A5068', '#5E5868'), 18)), rod([[X0, floorY - 640], [X1, floorY - 640]], pick('#4A5068', '#5E5868'), 22), rod([[X0, floorY - 400], [X1, floorY - 400]], pick('#4A5068', '#5E5868'), 12)),
        layer('bg:lamps', {}, prop('lampPost', -1100, floorY - 60, {lit: true}), prop('lampPost', 2300, floorY - 60, {lit: true}), ...(stick ? [ellipse(-885, floorY + 40, 500, 70, '#B7AEB8', NI), ellipse(2515, floorY + 40, 500, 70, '#B7AEB8', NI)] : [...glow(-885, floorY - 1900, 700, '#FFE9A8', 0.18), ...glow(2515, floorY - 1900, 700, '#FFE9A8', 0.18)]))],
      mid: [], front: [vignette(W, H, 0.4)]};
  },
  solid: ({W, H, color = '#F2F0EC', vig = 0.15}) => ({back: [layer('bg:solid', {}, fill(color))], mid: [], front: vig ? [vignette(W, H, vig)] : []}),

  // ---------- v3 presets ----------
  // a home kitchen: worktops with a sink and a hob, wall cabinets, a tiled splashback, fridge, window over the sink.
  // table: true puts a dining table in the mid layer at tableX (actors marked behind stand behind it, as in the reference)
  kitchen: ({W, H, wall, floor, floorY = 1500, table = false, tableX = 540, seed = 'kt'}) => {
    const stick = isStick(), wl = col(wall, 'wall'), fl = col(floor, stick ? 'floor' : null) || '#C9B79C', top = floorY - 450;
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'tiles', L: -2000, R: 3100});
    const tile = stick ? '#FBF6EC' : '#F4F1EA', tl = [];
    for (let y = top - 600; y < top; y += 100) tl.push(stroke([[-2000, y], [3100, y]], darken(tile, 0.1), 4));
    for (let x = -2000; x < 3100; x += 100) tl.push(stroke([[x, top - 600], [x, top]], darken(tile, 0.1), 4));
    return {back: [R.ceil,
        layer('bg:splashback', {}, rect(-2000, top - 600, 5100, 600, tile, NI), ...tl),
        layer('bg:window', {}, prop('window', 900, top - 140, {w: 620, h: 560, view: 'trees', curtains: false})),
        layer('bg:wall-dressing', {}, prop('wallCabinet', -650, floorY - 1000, {w: 1400}), prop('wallCabinet', 2050, floorY - 1000, {w: 900}), prop('clock', 900, floorY - 1250), prop('shelf', -1500, floorY - 1050)),
        R.floor, layer('bg:light-pool', {}, R.pool(900, 620, 0.12)),
        layer('bg:counters', {}, prop('counter', 200, floorY - 2, {w: 3000, sink: 700, stove: -700}), prop('counter', -1650, floorY - 2, {w: 700}), prop('fridge', 2050, floorY - 2), prop('counter', 2700, floorY - 2, {w: 800}),
          prop('stove', -700, floorY - 2, {pot: true}), prop('coffeeMachine', 1500, top - 2, {}, 0.8), prop('plant', 1150, top, {}, 0.45), prop('mug', 1700, top - 2, {}, 1), prop('plate', 200, top - 2, {}, 1.3)),
        stick ? layer('bg:lantern', {}, prop('lantern', 1500, R.ceilY + 40, {drop: 300})) : layer('bg:pendant', {}, prop('pendant', -700, R.ceilY + 40, {drop: 380}))],
      mid: table ? [layer('mid:table', {}, prop('table', tableX, floorY + 260, {w: 1100}), prop('plate', tableX - 250, floorY + 260 - 362, {}, 1.4), prop('mug', tableX + 200, floorY + 260 - 362, {}, 1.6))] : [],
      front: []};
  },
  // a bedroom: bed against the wall (right), nightstand, wardrobe, curtained window, rug
  bedroom: ({W, H, wall, floor, floorY = 1500, night = false, bedX = 1500}) => {
    const stick = isStick(), wl = col(wall, stick ? null : null) || pick('#DDE3EA', '#EDE3D6'), fl = col(floor, 'floor');
    const R = interior({floorY, wall: wl, floor: fl, wainscot: stick ? 420 : 0, wallLow: stick ? '#E3D3BD' : null, L: -2300, R: 3100});
    return {back: [R.ceil,
        layer('bg:window', {}, prop('window', 540, floorY - 450, {w: 640, h: 700, night, curtains: true, view: 'city'})),
        layer('bg:wall-dressing', {}, prop('frame', bedX - 100, floorY - 900, {w: 520, h: 300}), prop('frame', -1500, floorY - 1000, {w: 240, h: 300, art: 'abstract'}), prop('door', 2600, floorY, {}), prop('shelf', -1700, floorY - 1280, {w: 560})),
        R.floor, !night ? layer('bg:light-pool', {}, R.pool(540, 640)) : '',
        layer('bg:furniture', {}, prop('rug', 540, floorY + 170, {w: 1300, h: 140}), prop('wardrobe', -800, floorY - 2), prop('bed', bedX, floorY - 2), prop('nightstand', bedX - 650, floorY - 2), prop('plant', -1900, floorY - 2, {}, 0.9), prop('nightstand', bedX + 640, floorY - 2, {lamp: false})),
        night ? layer('bg:night', {}, ...(stick ? [] : glow(bedX - 610, floorY - 520, 700, '#FFD98A', 0.3))) : ''],
      mid: [], front: night ? [vignette(W, H, 0.3)] : []};
  },
  // a café: shop window onto the street (left), counter with an espresso machine (mid, right), menu board, pendants
  cafe: ({W, H, wall, floor, floorY = 1500, counterX = 2050, menu = [['LATTE', '$4'], ['TEA', '$3'], ['CAKE', '$5']]}) => {
    const stick = isStick(), wl = col(wall, stick ? null : null) || pick('#E4D3BC', '#F1E2CB'), fl = col(floor, stick ? null : null) || pick('#8C6A4E', '#DCC1A0');
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'tiles', wainscot: 520, wallLow: pick('#7E9C8E', '#B7C6AF'), L: -2700, R: 3100});
    const sw0 = -1800, sw1 = -150, sy0 = floorY - 1150, sy1 = floorY - 420, gl = P('glass');
    const street = [rect(sw0, sy0, sw1 - sw0, sy1 - sy0, gl, NI), ...skyline({y: sy1 + 10, box: [sw0, sy0, sw1, sy1], hMin: 300, hMax: 700, wMin: 300, wMax: 600, color: mixHex(gl, P('brick'), 0.45), seed: 'cf'}), rect(sw0, sy1 - 90, sw1 - sw0, 100, mixHex(gl, P('pavement'), 0.6), NI)];
    return {back: [R.ceil,
        layer('bg:shop-window', {}, g({}, ...street), rect(sw0, sy0, sw1 - sw0, sy1 - sy0, 'none', stick ? {stroke: INK, 'stroke-width': inkW()} : {}), rect((sw0 + sw1) / 2 - 14, sy0, 28, sy1 - sy0, P('woodDark'), THIN), rect(sw0 - 30, sy0 - 40, sw1 - sw0 + 60, 50, P('woodDark'), THIN), rect(sw0 - 40, sy1, sw1 - sw0 + 80, 40, P('woodDark'), THIN)),
        layer('bg:wall-dressing', {}, g({transform: tr(counterX, floorY - 900)}, SCENE.board({rows: menu, title: 'MENU', w: 700, color: P('chalk'), ink: '#F2F0EC', accent: stick ? '#F2D98E' : '#7BD88F'})), prop('frame', 560, floorY - 950, {w: 340, h: 260, art: 'abstract'}), prop('shelf', 1100, floorY - 1050, {w: 520}), prop('poster', -2300, floorY - 640)),
        R.floor, layer('bg:light-pool', {}, R.pool(-975, 1650, 0.14)),
        layer('bg:furniture', {}, prop('cafeTable', -1000, floorY - 4), prop('chair', -1320, floorY - 4), prop('chair', -680, floorY - 4), prop('cafeTable', 1000, floorY - 4), prop('mug', 930, floorY - 360, {}, 0.9), prop('plant', -2350, floorY - 4)),
        layer('bg:pendants', {}, ...[-1000, 1000, 1750, 2350].map((x, i) => prop('pendant', x, R.ceilY + 40, {drop: 520, color: stick && i === 1 ? P('accent') : null})))],
      mid: [layer('mid:counter', {}, prop('counter', counterX + 150, floorY + 220, {w: 1500, color: pick('#6E4A30', '#C9A27E'), top: pick('#E9E5DE', '#F4EEE4')}), prop('coffeeMachine', counterX + 350, floorY + 220 - 450), prop('cake', counterX - 250, floorY + 220 - 450, {}, 1.4))],
      front: []};
  },
  // a hospital room: pale walls, lino floor, a hospital bed with a monitor and drip, a privacy curtain
  hospital: ({W, H, wall, floor, floorY = 1500, bedX = 1450, beat = 0}) => {
    const stick = isStick(), wl = col(wall, null) || pick('#DCE8E6', '#E6EFEC'), fl = col(floor, null) || pick('#B9C6CC', '#E2E2DA');
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'lino', wainscot: 120, wallLow: pick('#B6C9C6', '#CFDCD7'), ceilGrid: true, L: -2300, R: 3700});
    const cur = pick('#8FB4C2', '#B9D0D6'), folds = []; for (let x = -2200; x < -500; x += 160) folds.push(path(`M${x} ${R.ceilY + 80} L${x + 160} ${R.ceilY + 80} L${x + 170} ${floorY - 80} L${x - 10} ${floorY - 80}Z`, (x / 160) % 2 ? cur : darken(cur, 0.08), THIN));
    return {back: [R.ceil,
        layer('bg:window', {}, prop('window', 540, floorY - 470, {w: 700, h: 620, view: 'trees'})),
        layer('bg:wall-dressing', {}, prop('clock', 1100, floorY - 1150), rect(bedX - 700, floorY - 1000, 1400, 70, P('metalLight'), THIN), ...[-500, -300, 300, 500].map(dx => circle(bedX + dx, floorY - 965, 14, P('accent'), NI)), prop('poster', 2350, floorY - 700, {w: 260, h: 360}), prop('door', 3300, floorY)),
        layer('bg:curtain', {}, rod([[-2300, R.ceilY + 70], [-400, R.ceilY + 70]], P('metalLight'), 14), ...folds),
        R.floor, layer('bg:light-pool', {}, R.pool(540, 700)),
        layer('bg:ward', {}, prop('bed', bedX, floorY - 4, {kind: 'hospital'}), prop('monitor', bedX + 720, floorY - 4, {beat}), prop('ivStand', bedX - 650, floorY - 4), prop('chair', 300, floorY - 4), prop('bin', 2350, floorY - 4))],
      mid: [], front: []};
  },
  // inside a bus: a long side wall of windows (the street outside), seats along the wall, grab poles (mid), straps
  bus: ({W, H, floorY = 1500, night = false, seed = 'bus'}) => {
    const stick = isStick(), wl = pick('#D8DEE4', '#E9ECEA'), fl = pick('#6E7480', '#C9C6BF');
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'boards', ceilH: 1030, L: -5200, R: 6400, floorLine: darken(fl, 0.1)});
    const wy0 = floorY - 920, wy1 = floorY - 470, gl = night ? P('glassNight') : P('glass');
    const outside = [rect(X0, wy0, X1 - X0, wy1 - wy0, gl, NI), ...skyline({y: wy1 + 30, box: [X0, wy0, X1, wy1], hMin: 120, hMax: 420, wMin: 220, wMax: 520, color: mixHex(gl, night ? '#000000' : '#8A8F9C', 0.35), seed, win: night ? '#F7D774' : null, winK: 0.3})];
    const panes = [], seats = [], poles = [], straps = [];
    for (let x = X0; x < X1; x += 900) panes.push(rect(x - 40, wy0, 80, wy1 - wy0, wl, THIN));
    for (let x = X0 + 300; x < X1; x += 900) seats.push(prop('busSeat', x, floorY - 4, {flip: true}), prop('busSeat', x + 420, floorY - 4, {flip: true}));
    for (const x of [-1300, 1950, 4300]) poles.push(rod([[x, R.ceilY], [x, floorY + 300]], P('accent2'), 30), ellipse(x, floorY + 300, 40, 10, darken(fl, 0.2), NI));
    for (let x = X0; x < X1; x += 260) straps.push(line([[x, R.ceilY + 150], [x, R.ceilY + 300]], 5, P('metal')), path(`M${x - 34} ${R.ceilY + 300} L${x + 34} ${R.ceilY + 300} L${x + 26} ${R.ceilY + 370} L${x - 26} ${R.ceilY + 370}Z`, 'none', {stroke: stick ? INK : '#55555C', 'stroke-width': 10, 'stroke-linejoin': 'round'}));
    return {back: [R.ceil,
        layer('bg:windows', {}, g({}, ...outside), rect(X0, wy0, X1 - X0, wy1 - wy0, 'none', stick ? {stroke: INK, 'stroke-width': inkW()} : {}), ...panes,
          rect(X0, wy1, X1 - X0, 40, darken(wl, 0.1), THIN), rect(X0, R.ceilY + 40, X1 - X0, 60, P('bulb'), THIN), rod([[X0, R.ceilY + 150], [X1, R.ceilY + 150]], P('metalLight'), 16)),
        layer('bg:straps', {}, straps),
        layer('bg:panel', {}, rect(X0, floorY - 330, X1 - X0, 280, darken(wl, 0.05), NI), rect(X0, floorY - 330, X1 - X0, 20, darken(wl, 0.12), NI)),
        R.floor, layer('bg:aisle', {}, rect(X0, floorY + 400, X1 - X0, 24, P('accent2'), THIN)),
        layer('bg:seats', {}, seats)],
      mid: [layer('mid:poles', {}, poles)], front: night ? [vignette(W, H, 0.3)] : []};
  },
  // a rooftop at night: parapet wall, skyline, water tank, string lights (the accent), a stair hut with a lit door
  rooftop: ({W, H, floorY = 1500, seed = 'rt'}) => {
    const stick = isStick(), skyC = pick('#1E2540', '#6F7699'), vy = floorY - 1.55 * M, py = floorY - 40, ph = 560;
    const stars = withStyle('flat', () => Array.from({length: 90}, (_, i) => circle(X0 + (i * 977) % (X1 - X0), Y0 + (i * 613) % 3600, 3 + (i % 3), '#F4ECDC', NI)));
    const parC = pick('#5A4A48', '#B98F7E'), roofC = pick('#3A3D48', '#A9A2A8');
    return {back: [layer('bg:sky', {}, fill(skyC), ...(stick ? [] : glow(2700, -1400, 1500, '#3B4A7A', 0.6)), ...stars, circle(2700, -1400, 180, P('moon'), THIN), circle(2770, -1450, 160, skyC, NI)),
        layer('bg:skyline', {}, skyline({y: py - 200, hMin: 900, hMax: 2600, wMin: 400, wMax: 900, color: mixHex(skyC, '#000000', 0.12), win: pick('#C9A85A', '#F2D98E'), winK: 0.2, seed: seed + 'a'}),
          skyline({y: py, hMin: 600, hMax: 1800, wMin: 600, wMax: 1300, color: mixHex(skyC, '#000000', 0.25), win: '#F7D774', winK: 0.3, seed: seed + 'b'})),
        layer('bg:parapet', {}, rect(X0, py - ph, X1 - X0, ph + 40, parC, NI), rect(X0, py - ph - 40, X1 - X0, 60, lighten(parC, 0.18), THIN), ...Array.from({length: 20}, (_, i) => stroke([[X0 + i * 420, py - ph + 20], [X0 + i * 420, py]], darken(parC, 0.12), 6))),
        layer('bg:roof', {}, rect(X0, py, X1 - X0, Y1 - py, roofC, NI), stick ? line([[X0, py], [X1, py]], inkW(0.7)) : '', groundLines({vy, y0: py, step: 600, color: darken(roofC, 0.12), w: 4})),
        layer('bg:roof-props', {}, g({transform: tr(-1300, py)}, rect(-500, -1500, 1000, 1500, pick('#4A4C58', '#C6BFB8')), rect(-500, -1540, 1000, 60, pick('#5A5C68', '#D6CFC8'), THIN), rect(-220, -1000, 440, 1000, '#F2CF7A', THIN), rect(-200, -980, 160, 980, pick('#6E4A30', '#AE845D'), THIN), ellipse(0, 40, 340, 40, pick('#5A5240', '#C4B79E'), NI)),
          prop('waterTank', 2500, py), prop('plant', 1500, py, {}, 0.8), prop('plant', -500, py, {}, 0.7), prop('stool', 1850, py)),
        layer('bg:lights', {}, rod([[-750, py], [-750, py - 1500]], P('metal'), 20), rod([[1950, py], [1950, py - 1500]], P('metal'), 20), prop('stringLights', -750, py - 1500, {x2: 2700, sag: 260, n: 16}), prop('stringLights', -3400, py - 1450, {x2: 2650, y2: -50, sag: 220, n: 14}), prop('stringLights', 1950, py - 1500, {x2: 2700, y2: 60, sag: 240, n: 14}))],
      mid: [], front: [vignette(W, H, 0.35)]};
  },
  // a classroom: chalkboard (centre), clock, windows (right), posters, a teacher's desk; school desks at the sides (mid)
  classroom: ({W, H, wall, floor, floorY = 1500, label = '', desks = true}) => {
    const stick = isStick(), wl = col(wall, null) || pick('#E3E5D3', '#F0ECD8'), fl = col(floor, null) || pick('#B79A72', '#E2CDA9');
    const R = interior({floorY, wall: wl, floor: fl, floorKind: 'tiles', wainscot: 420, wallLow: pick('#A8B79A', '#C9D4B8'), ceilGrid: true, L: -3100, R: 3900});
    return {back: [R.ceil,
        layer('bg:board', {}, prop('whiteboard', 540, floorY - 430, {w: 2400, h: 680, chalk: true, label}), prop('clock', 540, floorY - 1210)),
        layer('bg:windows', {}, prop('window', 2500, floorY - 430, {w: 600, h: 720, view: 'trees', panes: 3}), prop('window', 3400, floorY - 430, {w: 600, h: 720, view: 'trees', panes: 3})),
        layer('bg:wall-dressing', {}, rect(-1950, floorY - 1150, 1000, 640, P('woodLight'), THIN), prop('poster', -1700, floorY - 560, {w: 300, h: 420}), prop('poster', -1220, floorY - 600, {w: 300, h: 380, color: P('accent')}), prop('door', -2600, floorY), prop('bookshelf', 1700, floorY)),
        R.floor, layer('bg:light-pool', {}, R.pool(2500, 600), R.pool(3400, 600)),
        layer('bg:furniture', {}, prop('desk', 1300 - 200, floorY - 4, {w: 760, color: stick ? null : '#9C6B44'}), prop('plant', 2050, floorY - 4, {}, 0.8))],
      mid: desks ? [layer('mid:desks', {}, ...[-1400, -600, 2400, 3200].map(x => g({}, prop('chair', x + 60, floorY + 300), prop('schoolDesk', x, floorY + 380))))] : [],
      front: []};
  },
  // a living room: a sofa against the wall (centre), lamp, TV console, window with curtains, rug
  livingRoom: ({W, H, wall, floor, floorY = 1500, night = false, sofaX = 540, sofa: sofaC, lantern}) => {
    const stick = isStick(), wl = col(wall, 'wall'), fl = col(floor, 'floor');
    const R = interior({floorY, wall: wl, floor: fl, L: -2600, R: 3400});
    const lan = lantern ?? stick;
    return {back: [R.ceil,
        layer('bg:window', {}, prop('window', -1300, floorY - 430, {w: 700, h: 760, night, curtains: true, view: 'city'})),
        layer('bg:wall-dressing', {}, prop('frame', sofaX - 230, floorY - 920, {w: 340, h: 260}), prop('frame', sofaX + 210, floorY - 940, {w: 220, h: 300, art: 'abstract'}), prop('shelf', 1900, floorY - 1100), prop('clock', 1250, floorY - 1150), prop('door', 3000, floorY)),
        R.floor, !night ? layer('bg:light-pool', {}, R.pool(-1300, 700)) : '',
        layer('bg:furniture', {}, prop('rug', sofaX, floorY + 170, {w: 1500, h: 140}), prop('sofa', sofaX, floorY - 2, {color: sofaC}), prop('lamp', sofaX - 700, floorY - 2), prop('plant', sofaX + 680, floorY - 2, {}, 0.9),
          prop('table', 1950, floorY - 2, {w: 900, color: stick ? null : '#6E4A30'}), prop('tv', 1950, floorY - 364), prop('plant', -2200, floorY - 2)),
        lan ? layer('bg:lantern', {}, prop('lantern', sofaX + 900, R.ceilY + 40, {drop: 260})) : '',
        night ? layer('bg:night', {}, ...(stick ? [] : glow(sofaX - 700, floorY - 700, 900, '#FFD98A', 0.28))) : ''],
      mid: [], front: night ? [vignette(W, H, 0.25)] : []};
  },
};
/** build a set preset in the spec's style. spec.style: 'stick' | 'flat' (scene.mjs copies meta.style into it) */
export function buildSet(spec, W, H) { const f = SETS[spec.preset || 'spotlight']; if (!f) throw new Error(`unknown set "${spec.preset}"`);
  const s = withIds('set', () => withStyle(spec.style || 'flat', () => f({W, H, ...spec}))); return {back: s.back || [], mid: s.mid || [], front: s.front || []}; }
