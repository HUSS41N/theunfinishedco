// THE LAST BUS world (owner: world): the old state-transport bus inside (oldBus: side | aisle | mirror | door), the
// ghat road outside it (the parallax window strip, the perspective road, the static night backdrop), the bus from
// outside (busExterior), the tunnel, and the light the road throws into the bus (lampLight: window-shaped sodium pools).
// Sets return {back, mid, front, live, info}; live layers are drawn per frame from the fx.mjs ctx (t, T, d, v, lv, cam,
// view). See docs/WORLD.md "The Last Bus".
//
// One bus, one palette (BUS): a worn two-tone state-transport interior (deep teal lower panels and seat frames, ivory
// upper wall and ceiling, aluminium trim with rivets, rust-red rexine seats with faded printed covers and white headrest
// towels, sliding aluminium shutters half down, painted Hindi/English signage), lit by yellowed tubes. Outside: a cold
// blue ghat road at night (EXT): mountain ridges, forested hills with a few village lights, tree lines, electric poles
// with sagging wires, bushes and rocks, fog banks between the layers, sodium lamps. The interior grades with `bus`
// (warm, a little sick) and the night outside stays cold (info.gradeAs: {night: 'bus'}).
import {layer, g, path, circle, ellipse, rect, poly, lin, el, stroke, rod, id, tr, text, rrect, mixHex, darken, lighten, tones, withStyle} from './svg.mjs';
import {SCENE, NIGHT, M} from './props.mjs';
import {softBlob, softBlobIn, lampAt, lampDead, LAMP_SPACING, travel, flickerLevel, fogLayer} from './fx.mjs';
import {devanagari, devanagariWidth} from './devanagari.mjs';

const X0 = -3400, X1 = 4600, Y0 = -3400, Y1 = 5600;
const NI = {ink: false};
// FNV-1a with a murmur finaliser: plain FNV barely moves when only the last character changes ("t1", "t2", …), which
// flattened every lattice noise into a straight line
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const NB = NIGHT, T = c => tones(c);
const clamp01 = x => Math.max(0, Math.min(1, x));
const sstep = x => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const mod = (a, n) => ((a % n) + n) % n;
const rectD = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const polyD = pts => 'M' + pts.map(p => `${+p[0].toFixed(1)} ${+p[1].toFixed(1)}`).join(' L') + 'Z';
const evenodd = (d, f, a = {}) => path(d, f, {'fill-rule': 'evenodd', ...NI, ...a});
const vgrad = (x, y, w, h, stops, a = {}) => { const gid = id('vg'); return el('defs', {}, lin(gid, 0, y, 0, y + h, stops)) + rect(x, y, w, h, `url(#${gid})`, {...NI, ...a}); };
const fo = k => ({ink: false, 'fill-opacity': +clamp01(k).toFixed(3)});
const dotsD = (pts, r) => pts.map(([x, y]) => `M${F(x - r)} ${F(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
const rectsD = rs => rs.map(([x, y, w, h]) => `M${F(x)} ${F(y)}h${F(w)}v${F(h)}h${F(-w)}Z`).join('');
const wrapIdx = (lo, hi, sp) => [Math.floor(lo / sp) - 1, Math.ceil(hi / sp) + 1];
const F = (x, n = 1) => +x.toFixed(n);
const LATIN = (size, fill, extra = {}) => ({'font-family': 'Inter Display', 'font-weight': 800, 'font-size': size, fill, 'text-anchor': 'middle', ...extra});
// smooth 1D value noise (deterministic): mountains, canopies
const vn = (s, u) => { const i = Math.floor(u), f = u - i, a = hash(s + i), b = hash(s + (i + 1)); return a + (b - a) * f * f * (3 - 2 * f); };
const fbm = (s, u) => 0.55 * vn(s, u) + 0.3 * vn(s + 'b', u * 2.13 + 3.7) + 0.15 * vn(s + 'c', u * 4.37 + 1.1);
const mount = (s, u) => { const r = 1 - Math.abs(2 * vn(s + 'r', u * 0.93 + 0.4) - 1); return 0.5 * fbm(s, u) + 0.5 * r * r; };

/** the bus interior palette (lit colours; graded later) */
export const BUS = {
  ceil: '#DCD2B2', ceilDk: '#B3A786', ivory: '#DCCC9E', ivoryLt: '#E9DDB6', ivoryDk: '#B5A579',
  teal: '#2B6B62', tealDk: '#1C4B45', tealLt: '#3F8479', pin: '#1D5852',
  alu: '#A8ADA2', aluDk: '#737A70', aluLt: '#D2D6CB', rivet: '#8C8466', rust: '#8E4A22',
  seat: '#953F2E', seatDk: '#682A20', seatLt: '#AE5640', seatB: '#2E5D63',
  covers: [['#C69A4C', '#7A4E22'], ['#4C877D', '#1F4A44'], ['#B4693F', '#6E3418']],
  cloth: '#ECE4CC', clothEdge: '#B4402D',
  shutter: '#8E978B', shutterDk: '#5F675E', shutterLt: '#B7BFB1',
  floor: '#4A3C2F', floorDk: '#32291F', strip: '#71746B',
  tube: '#F3EDBA', tubeOff: '#6A6E62', halo: '#EFE2A0', pole: '#C2C5BA', strap: '#4A3324', cord: '#7A5634',
  sign: '#A2342A', signTeal: '#1C524C',
};
/** the night outside (cold blue) */
export const EXT = {sky: '#0E1C38', skyLow: '#5A7CB0', haze: '#93AED4', far: '#3F5C88', far2: '#2C4570', hill: '#1E3150', tree: '#142239', mid: '#0E1829', near: '#0A111D', rim: '#9AB2D2',
  village: '#FFC36A', moon: '#C9D7EB', road: '#1E2228', kerbW: '#B9BCB6', kerbB: '#1A1C1E'};

// =====================================================================================================================
// THE GHAT ROAD seen through a side window: an orthographic parallax strip. Everything is in world px and may spill
// outside [y0, y1]: callers draw it UNDER an opaque wall whose window holes show it. Layers at depth dp scroll at
// v·k·dp px/s. Every silhouette is sampled on its own scrolling lattice (it translates rigidly, it never boils);
// fast layers are stretched by a half-frame shutter (smear) so nothing strobes at 24 fps.
// o: {y0, y1, horizon, k (px per m at the near layer), viewX, dir (−1: scenery moves left→right), kind 'road'|'tunnel',
//     passes:[{at, depth, what:'teaStall'}], seed, lamps:true, eye (m above the road)}
// =====================================================================================================================
export function roadside(ctx, o) {
  const {y0, y1, horizon: hz = (o.y0 + o.y1) / 2, k = 190, viewX = 960, dir = -1, kind = 'road', seed = 'rs', eye = 2.2} = o;
  const sK = k / 190, gnd = dp => hz + eye * k * dp;   // the ground line of a layer at depth dp
  const [vx0, , vx1] = ctx.view, xa = vx0 - 300, xb = vx1 + 300, d = ctx.d, v = Math.abs(ctx.v), out = [];
  const cs = dp => (ctx.cam.x - viewX) * (1 - dp) * 0.85;   // a little parallax with the camera
  const X = (p, dp) => viewX + dir * (p - d) * k * dp + cs(dp);
  const pRange = dp => { const a = d + (xa - viewX - cs(dp)) / (dir * k * dp), b = d + (xb - viewX - cs(dp)) / (dir * k * dp); return [Math.min(a, b), Math.max(a, b)]; };
  const smear = dp => Math.min(140, v * k * dp / 48);   // ≈ a half-frame shutter, in px
  if (kind === 'tunnel') {   // a concrete wall a metre away: panel joints and sodium lamps rush past
    const dp = 1.6, wall = '#3A332C';
    out.push(rect(xa, y0 - 400, xb - xa, y1 - y0 + 800, wall, NI), vgrad(xa, y0 - 400, xb - xa, y1 - y0 + 800, [[0, '#000', 0.5], [0.5, '#000', 0], [1, '#000', 0.6]]));
    const [pa, pb] = pRange(dp);
    for (let i = Math.floor(pa / 2.5) - 1; i <= Math.ceil(pb / 2.5) + 1; i++) { const x = X(i * 2.5, dp); out.push(rect(x - 3 - smear(dp) / 2, y0 - 400, 6 + smear(dp), y1 - y0 + 800, '#2A251F', NI)); }
    for (let i = Math.floor(pa / 6) - 1; i <= Math.ceil(pb / 6) + 1; i++) { const x = X(i * 6, dp), ly = y0 + (y1 - y0) * 0.28, sm = smear(dp);
      out.push(softBlob(x, ly, 260 + sm, 180, NB.sodium, 0.5), rect(x - 40 - sm / 2, ly - 12, 80 + sm, 24, '#FFE2B0', {ink: false, rx: 10})); }
    return out.join('');
  }
  // a layer's lattice: u = layer px (scrolls with d); x(u) on screen-world
  const ux = dp => u => viewX + cs(dp) + dir * (u - d * k * dp), xu = dp => x => d * k * dp + dir * (x - viewX - cs(dp));
  const range = (dp, step) => { const a = xu(dp)(xa), b = xu(dp)(xb); return [Math.floor(Math.min(a, b) / step) - 1, Math.ceil(Math.max(a, b) / step) + 1]; };
  const ridge = (dp, step, yOf, fill, bottom = y1 + 12) => { const toX = ux(dp), [ja, jb] = range(dp, step), pts = [];
    for (let j = ja; j <= jb; j++) { const u = j * step; pts.push([toX(u), yOf(u)]); }
    pts.sort((p, q) => p[0] - q[0]);
    return path(`M${F(pts[0][0])} ${F(bottom)} L` + pts.map(p => `${F(p[0])} ${F(p[1])}`).join(' L') + ` L${F(pts.at(-1)[0])} ${F(bottom)}Z`, fill, NI); };
  // sky with a moon haze behind the fog (the moon is at infinity: it does not scroll)
  // (everything stops a few px past the window band [y0, y1]: the wall hides the rest, and big fills cost raster time)
  out.push(vgrad(xa, Math.min(y0, hz - 600) - 12, xb - xa, hz - Math.min(y0, hz - 600) + 12, [[0, EXT.sky], [0.55, mixHex(EXT.sky, EXT.skyLow, 0.45)], [0.85, EXT.skyLow], [1, EXT.haze]]), rect(xa, hz, xb - xa, Math.max(0, y1 - hz) + 12, EXT.hill, NI));
  out.push(softBlob(viewX - dir * 520 * sK + cs(0), y0 + 70 * sK, 520 * sK, 300 * sK, EXT.moon, 0.16));
  // far ranges (Sahyadri ridges, pale with moonlit haze), a haze band, a nearer darker range
  const r1 = u => hz + 6 - sK * (40 + 210 * mount(seed + 'r1', u / 460) ** 1.6), r2 = u => hz + 10 - sK * (18 + 130 * mount(seed + 'r2', u / 300) ** 1.4);
  out.push(ridge(0.012, 26, u => r1(u) - 2.5 * sK, mixHex(EXT.rim, EXT.far, 0.5)), ridge(0.012, 26, r1, EXT.far));
  out.push(vgrad(xa, hz - 110 * sK, xb - xa, 150 * sK, [[0, NB.fog, 0], [0.7, NB.fog, 0.22], [1, NB.fog, 0.08]]));
  out.push(ridge(0.03, 20, u => r2(u) - 2.5 * sK, mixHex(EXT.rim, EXT.far2, 0.55)), ridge(0.03, 20, r2, EXT.far2));
  // forested hills with a few village lights on the slopes
  const hdp = 0.08, hillY = u => hz + 22 * sK - sK * (16 + 62 * fbm(seed + 'h', u / 240) + 5 * Math.abs(Math.sin(u / 10.5)));
  out.push(ridge(hdp, 9, hillY, EXT.hill));
  { const toX = ux(hdp), [ja, jb] = range(hdp, 260);
    for (let j = ja; j <= jb; j++) { const s = seed + 'vl' + j; if (hash(s) > 0.3) continue; const n = 2 + Math.floor(hash(s + 'n') * 4), u0 = j * 260 + hash(s + 'u') * 160;
      for (let q = 0; q < n; q++) { const u = u0 + (hash(s + q) - 0.5) * 50, y = hillY(u) + (14 + 30 * hash(s + 'y' + q)) * sK, x = toX(u); if (y > y1 + 20) continue;
        out.push(circle(x, y, (2.2 + 1.4 * hash(s + 'r' + q)) * sK, EXT.village, NI)); }
      out.push(softBlob(toX(u0), hillY(u0) + 30 * sK, 46 * sK, 24 * sK, EXT.village, 0.16)); } }
  // fog from the shot's atmos (where: outside), interleaved by depth so nearer things stay readable
  const fogs = (ctx.shot.atmos ? [].concat(ctx.shot.atmos) : []).filter(a => a && a.type === 'fog' && (a.where || 'outside') === 'outside');
  const holes = o.holes ? o.holes(xa, xb) : null;
  const fogAt = (dp, j, kk = 1) => fogs.map((f, n) => fogLayer(ctx, {...f, where: 'outside', k: (f.k ?? 1) * kk, rects: holes}, dp, `x${j}${n}`, [ctx.view[0], y0 - 200, ctx.view[2], y1 + 200])).join('');
  // (the haze bands above stand in for atmos fog on the far layers: three fog passes cost too much raster time)
  // the tree line (dense forest: conifer teeth over rounded crowns)
  const tdp = 0.18, tb = gnd(tdp);
  // (crown cells are 44 px: at 9–12 m/s a crown moves ≤ 0.4 of its width per frame, so the row never wagon-wheels)
  out.push(ridge(tdp, 5, u => { const c = Math.floor(u / 44), f = u / 44 - c, tooth = 1 - Math.abs(2 * f - 1), con = hash(seed + 'tc' + c) < 0.45 ? 1 : 0;
    return tb - sK * (28 + 24 * fbm(seed + 't', u / 90) + con * 34 * tooth ** 2.4 + (1 - con) * 12 * Math.sqrt(Math.max(0, Math.sin(Math.PI * f)))); }, EXT.tree));
  out.push(vgrad(xa, tb - 40 * sK, xb - xa, 80 * sK, [[0, NB.fog, 0], [0.6, NB.fog, 0.16], [1, NB.fog, 0.05]]));
  out.push(fogAt(0.3, 'b'));
  // mid layer: individual trees, bushes, electric poles with sagging wires
  const mdp = 0.38, mb = gnd(mdp), kk = k * mdp, smM = smear(mdp), mc = EXT.mid;
  if (mb < y1 + 12) out.push(rect(xa, mb - 2, xb - xa, y1 - mb + 14, mc, NI));
  { const [pa, pb] = pRange(mdp);
    for (let i = Math.floor(pa / 7) - 1; i <= Math.ceil(pb / 7) + 1; i++) { const s = seed + 'm' + i, r = hash(s + 'k'), x = X(i * 7 + hash(s) * 4, mdp), w = smM / 2;
      if (r < 0.24) { const h = (3.6 + 2.6 * hash(s + 'h')) * kk, rw = (1.4 + 0.8 * hash(s + 'w')) * kk;   // a round-crowned tree (mango / banyan)
        out.push(rect(x - 0.14 * kk - w, mb - h * 0.55, 0.28 * kk + 2 * w, h * 0.55, mc, NI), ellipse(x, mb - h * 0.74, rw * 0.8 + w, h * 0.24, mc, NI), ellipse(x - rw * 0.5, mb - h * 0.6, rw * 0.6 + w, h * 0.17, mc, NI), ellipse(x + rw * 0.52, mb - h * 0.63, rw * 0.55 + w, h * 0.18, mc, NI)); }
      else if (r < 0.4) { const h = (4.4 + 3 * hash(s + 'h')) * kk, rw = (1.0 + 0.5 * hash(s + 'w')) * kk;   // a conifer / silver oak
        out.push(rect(x - 0.1 * kk - w, mb - h * 0.3, 0.2 * kk + 2 * w, h * 0.3, mc, NI), ...[0, 1, 2].map(q => poly([[x - rw * (1 - q * 0.22) - w, mb - h * (0.18 + q * 0.24)], [x + rw * (1 - q * 0.22) + w, mb - h * (0.18 + q * 0.24)], [x + w * 0.3, mb - h * (0.5 + q * 0.25)], [x - w * 0.3, mb - h * (0.5 + q * 0.25)]], mc, NI))); }
      else if (r < 0.74) { const h = (1.0 + 0.9 * hash(s + 'h')) * kk;   // bushes
        out.push(ellipse(x, mb - h * 0.45, 1.3 * kk + w, h * 0.6, mc, NI), ellipse(x + 1.2 * kk, mb - h * 0.3, 0.9 * kk + w, h * 0.45, mc, NI)); } }
    // electric poles every 32 m: crossarm, insulators, three wires sagging to the next pole
    const sp = 32, ph = 11, top = mb - 8.2 * kk;
    for (let i = Math.floor((pa - ph) / sp) - 1; i <= Math.ceil((pb - ph) / sp) + 1; i++) { const x = X(i * sp + ph, mdp), x2 = X((i + 1) * sp + ph, mdp);
      out.push(rect(x - 0.09 * kk - smM / 2, top, 0.18 * kk + smM, mb - top, mc, NI), rect(x - 0.9 * kk - smM / 2, top + 0.25 * kk, 1.8 * kk + smM, 0.13 * kk, mc, NI));
      for (const [ox, oy] of [[-0.75, 0.2], [0, -0.05], [0.75, 0.2]]) { const ax = x + ox * kk, bx = x2 + ox * kk, ay = top + oy * kk;
        out.push(path(`M${F(ax)} ${F(ay)} Q${F((ax + bx) / 2)} ${F(ay + 1.6 * kk)} ${F(bx)} ${F(ay)}`, 'none', {stroke: mc, 'stroke-width': Math.max(1.5, 0.03 * kk), ink: false})); } } }
  // passes (the tea stall), drawn at their depth with their own clock so a second pass is the same stall, same flicker
  for (const ps of o.passes || []) { const dp = ps.depth ?? 0.72, at = ps.at ?? 0, p = ps.p ?? travel(ctx.shot, at).d + (ps.dx ?? 0);
    const x = X(p, dp); if (x < xa - 1400 * k * dp / M || x > xb + 1400 * k * dp / M) continue;
    const sc = k * dp / M, base = gnd(dp);
    if (base < y1 + 12) out.push(rect(x - 1800 * sc, base - 4, 3600 * sc, y1 - base + 16, EXT.mid, NI));   // its own patch of ground
    out.push(g({transform: tr(x, base, 0, sc)}, SCENE[ps.what || 'teaStall']({t: ctx.t - at, seed: ps.seed || 'stall', lit: ps.lit ?? 1})));
    out.push(softBlob(x - 150 * sc, base - 796 * sc, 900 * sc, 700 * sc, NB.bulb, 0.18 * bulbLevel(ps.seed || 'stall', ctx.t - at))); }
  out.push(fogAt(0.5, 'c'));
  // near layer: the verge (bushes, rocks, tall grass), a black-and-white parapet, milestones, a close tree now and then
  const ndp = 0.86, nb2 = gnd(ndp), nk = k * ndp, smN = smear(ndp);
  { const [pa, pb] = pRange(ndp);
    for (let i = Math.floor(pa / 4) - 1; i <= Math.ceil(pb / 4) + 1; i++) { const s = seed + 'n' + i, r = hash(s), x = X(i * 4 + hash(s + 'x') * 2, ndp), w = smN / 2;
      if (r < 0.42) { const h = (0.5 + 0.8 * hash(s + 'h')) * nk; out.push(ellipse(x, nb2 - h * 0.42, 1.2 * nk + w, h * 0.58, EXT.near, NI), ellipse(x + 0.9 * nk, nb2 - h * 0.25, 0.8 * nk + w, h * 0.4, EXT.near, NI)); }
      else if (r < 0.6) out.push(ellipse(x, nb2 - 0.18 * nk, 0.55 * nk + w, 0.3 * nk, '#141A20', NI)); }
    if (nb2 - 0.45 * nk < y1 + 40) for (let i = Math.floor(pa / 2) - 1; i <= Math.ceil(pb / 2) + 1; i++) { const x = X(i * 2, ndp), w = 0.5 * nk;   // parapet stones (only low views see them)
      out.push(rect(x - w / 2 - smN / 2, nb2 - 0.45 * nk, w + smN, 0.45 * nk, mod(i, 2) ? EXT.kerbW : EXT.kerbB, NI)); }
    for (let i = Math.floor(pa / 100) - 1; i <= Math.ceil(pb / 100) + 1; i++) { const x = X(i * 100 + 37, ndp);   // a milestone (white, yellow cap)
      out.push(path(rrect(x - 0.22 * nk - smN / 2, nb2 - 0.7 * nk, 0.44 * nk + smN, 0.7 * nk, [0.2 * nk, 0.2 * nk, 0, 0]), '#C9C7BC', NI), path(rrect(x - 0.22 * nk - smN / 2, nb2 - 0.7 * nk, 0.44 * nk + smN, 0.24 * nk, [0.2 * nk, 0.2 * nk, 0, 0]), '#D9A93A', NI)); }
  }
  // street lamps (every LAMP_SPACING m; some dead): the light passes in the bus come from these
  const ldp = 1, lb = gnd(ldp), sm = smear(ldp);
  if (o.lamps !== false) { const [na, nb] = pRange(ldp), ia = Math.floor(na / LAMP_SPACING) - 1, ib = Math.ceil(nb / LAMP_SPACING) + 1;
    for (let i = ia; i <= ib; i++) { const x = X(lampAt(i), ldp), top = lb - 6.2 * k, dead = lampDead(i);
      if (x < xa - 900 || x > xb + 900) continue;
      if (!dead) out.push(softBlob(x + dir * 0.6 * k, top + 0.3 * k, 3.2 * k + sm, 3.6 * k, NB.sodium, 0.5), softBlob(x, (y0 + y1) / 2, 1.6 * k + sm, (y1 - y0) * 0.9, NB.sodium, 0.13));
      out.push(rect(x - 0.09 * k - sm / 2, top, 0.18 * k + sm, lb - top, NB.pole, NI), rect(dir < 0 ? x - 0.09 * k - sm / 2 - 0.9 * k : x - 0.09 * k - sm / 2, top, 0.9 * k + sm, 0.12 * k, NB.pole, NI));
      if (!dead) out.push(ellipse(x + dir * 0.75 * k, top + 0.16 * k, 0.32 * k + sm / 2, 0.08 * k, '#FFE2B0', NI)); } }
  out.push(fogAt(1.25, 'd', 0.3));
  return out.join('');
}
/** the stall bulb's level (props.mjs bulbFlicker, re-derived here to keep imports one-way) */
function bulbLevel(seed, t, rate = 0.8) {
  let lv = 1; const slot = Math.floor(t * rate);
  for (const k of [slot - 1, slot]) { const h = hash(seed + ':' + k); if (h > 0.55) continue; const a = (k + hash(seed + 'a' + k) * 0.8) / rate, d = 0.05 + 0.12 * hash(seed + 'd' + k), dp = 0.5 + 0.5 * hash(seed + 'p' + k);
    const w = Math.min(clamp01((t - a + 0.02) / 0.04), clamp01((a + d - t + 0.02) / 0.04)); lv = Math.min(lv, 1 - dp * w);
    if (h < 0.18) { const a2 = a + d + 0.1, w2 = Math.min(clamp01((t - a2 + 0.02) / 0.04), clamp01((a2 + 0.05 - t + 0.02) / 0.04)); lv = Math.min(lv, 1 - dp * 0.8 * w2); } }
  return lv;
}

// =====================================================================================================================
// LIGHT PASSES: when the bus passes a street lamp its light falls through the windows as soft window-shaped sodium
// pools that slide across the passengers, seats and floor (opposite to the lamp, slower than it) and fade as the lamp
// goes by. Same lamps as the exterior (lampAt / lampDead), so a pool comes exactly when a lamp passes the window.
// Steady cadence from `speed` (LAMP_SPACING / v), soft-edged (three nested layers), low intensity, never strobing;
// none when stopped; in the tunnel the tunnel's own regular lamps (every 6 m) instead. Drawn in the post (added light) layer.
// o (a `sweep` light, optional): {intensity, color, every (s between passes)}
// =====================================================================================================================
const POOL = {road: {color: NB.sodium, k: 0.16}, tunnel: {color: '#FF9A3C', k: 0.22}}, POOL_K = 0.6;   // POOL_K: a sweep light's intensity (tuned for the old bands) → pool strength
/** a soft-edged light pool on a quad [tl, tr, br, bl]: a shared horizontal soft-edge gradient (sides), top and bottom
 *  feathered by four nested insets. pool(ctxKey, color) returns the defs once and a drawer. */
function poolDrawer(color) {
  const gid = id('pool'), defs = el('defs', {}, el('linearGradient', {id: gid, x1: 0, y1: 0, x2: 1, y2: 0}, [[0, 0], [0.22, 1], [0.78, 1], [1, 0]].map(([o, a]) => el('stop', {offset: o, 'stop-color': color, 'stop-opacity': a}))));
  let used = false;
  const quad = (pts, a) => { if (a < 0.004) return ''; used = true; const [tl, tr, br, bl] = pts, lerp2 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
    return [0, 0.1, 0.2, 0.3].map(k => { const u = k, A = lerp2(tl, bl, u), B = lerp2(tr, br, u), C = lerp2(br, tr, u), D = lerp2(bl, tl, u); return poly([A, B, C, D], `url(#${gid})`, fo(a * 0.3)); }).join(''); };
  return {quad, defs: () => (used ? defs : '')};
}
const speedGate = v => sstep((Math.abs(v) - 0.3) / 1.6);
/** the lamps that light the bus now: positions along the road (m), which are dead, and their spacing */
function passLamps(ctx, o, kind) {
  const v = Math.max(1, Math.abs(ctx.v)), tunnel = kind === 'tunnel';
  const spacing = o.every ? o.every * v : tunnel ? 6 : null;
  return {pos: i => spacing ? i * spacing : lampAt(i), dead: i => !spacing && lampDead(i), spacing: spacing || LAMP_SPACING};
}
function poolsSide(ctx, o, G) {
  const kind = G.ext.kind === 'tunnel' ? 'tunnel' : 'road', base = POOL[kind], I0 = (o.intensity !== undefined ? o.intensity * POOL_K : base.k) * (o.fade ?? 1) * speedGate(ctx.v);
  if (I0 < 0.004) return '';
  const col = o.color || base.color, {k, viewX, dir} = G.ext, dp = kind === 'tunnel' ? 1.6 : 1, d = ctx.d, L = passLamps(ctx, o, kind);
  const X = p => viewX + dir * (p - d) * k * dp + (ctx.cam.x - viewX) * (1 - dp) * 0.85;
  const [vx0, , vx1] = ctx.view, sig = Math.min(G.bay, 540) * 1.15, out = [], pd = poolDrawer(col);
  const e1 = d + (vx0 - 2 * sig - viewX) / (dir * k * dp), e2 = d + (vx1 + 2 * sig - viewX) / (dir * k * dp), pa = Math.min(e1, e2), pb = Math.max(e1, e2);
  for (let i = Math.floor(pa / L.spacing) - 1; i <= Math.ceil(pb / L.spacing) + 1; i++) { if (L.dead(i)) continue; const xl = X(L.pos(i));
    const ja = G.bay > 1e5 ? 0 : Math.floor((xl - 2.4 * sig - G.cx) / G.bay), jb = G.bay > 1e5 ? 0 : Math.ceil((xl + 2.4 * sig - G.cx) / G.bay);
    for (let j = ja; j <= jb; j++) {
      const xw = G.cx + j * G.bay, off = xw - xl, I = I0 * Math.exp(-((off / sig) ** 2)); if (I < 0.006) continue;
      const yt = G.wy0 + G.shutter(j) * (G.wy1 - G.wy0), D = G.drop, h = G.wy1 - yt, st = off * 0.2, sb = off * 0.34;
      for (const [a, b] of [[-G.gw / 2, -8], [8, G.gw / 2]])   // two panes (the meeting rail casts a gap)
        out.push(pd.quad([[xw + a + st, yt + D], [xw + b + st, yt + D], [xw + b + sb, yt + D + h * 1.15], [xw + a + sb, yt + D + h * 1.15]], I)); } }
  return pd.defs() + out.join('');
}
function poolsAisle(ctx, o, G) {
  const kind = G.kind === 'tunnel' ? 'tunnel' : 'road', base = POOL[kind], I0 = (o.intensity !== undefined ? o.intensity * POOL_K : base.k) * (o.fade ?? 1) * speedGate(ctx.v);
  if (I0 < 0.004) return '';
  const col = o.color || base.color, P = G.P, sgn = G.toward === 'rear' ? -1 : 1, d = ctx.d, L = passLamps(ctx, o, kind), out = [], hw = G.hw, pd = poolDrawer(col);
  for (let i = Math.floor((d - 30) / L.spacing) - 1; i <= Math.ceil((d + 40) / L.spacing) + 1; i++) { if (L.dead(i)) continue;
    const zl = (L.pos(i) - d) * sgn, side = kind === 'tunnel' ? (i % 2 ? -1 : 1) : (hash('ls' + i) < 0.5 ? -1 : 1), XL = side * (kind === 'tunnel' ? 3.6 : 4.8), YL = kind === 'tunnel' ? 3.4 : 5.6;
    for (const w of G.windows) { if (w.side !== side) continue; const zm = (w.z0 + w.z1) / 2, I = I0 * Math.exp(-(((zm - zl) / 2.6) ** 2)); if (I < 0.006 || zm < 0.5) continue;
      const fl = (Y, z) => { const lam = YL / (YL - Y), Xf = XL + (side * hw - XL) * lam, zf = zl + (z - zl) * lam; return P(Math.max(-hw, Math.min(hw, Xf)), 0.002, Math.max(0.4, zf)); };
      const yb = w.sill, yt = w.top - w.shut * (w.top - w.sill);
      out.push(pd.quad([fl(yt, w.z0), fl(yt, w.z1), fl(yb, w.z1), fl(yb, w.z0)], I)); } }
  return pd.defs() + out.join('');
}
function poolsMirror(ctx, o, G) {
  const I0 = (o.intensity ?? 0.12) * (o.fade ?? 1) * speedGate(ctx.v); if (I0 < 0.004) return '';
  const d = ctx.d, L = passLamps(ctx, o, 'road'), out = [];
  for (let i = Math.floor(d / L.spacing) - 1; i <= Math.ceil((d + 40) / L.spacing) + 1; i++) { if (L.dead(i)) continue; const z = L.pos(i) - d; if (z < -1 || z > 28) continue;
    const side = hash('ls' + i) < 0.5 ? -1 : 1, u = clamp01((z + 1) / 29), I = I0 * Math.sin(Math.PI * u) ** 1.5;
    const x = G.cx + side * (260 + 1500 / (z + 2.5)), y = G.top + 60 + 3400 / (z + 6);   // the patch climbs the cab and slides out as the lamp comes overhead
    out.push(softBlob(x, y, 520, 260, o.color || NB.sodium, I), softBlob(x * 0.6 + G.cx * 0.4, y - 120, 900, 180, o.color || NB.sodium, I * 0.5)); }
  return out.join('');
}

// =====================================================================================================================
// THE OLD BUS, inside
// =====================================================================================================================
const SEAT_W = 270;   // one seat (0.57 m incl. gap) on the side-facing benches
const SHUT = [0.12, 0.46, 0.22, 0.58, 0.1, 0.36, 0.5];   // shutters: how far each window's shutter is down (0..1)
const shutterOf = (i, seed = '') => (i === 0 ? 0.12 : SHUT[mod(i * 3 + Math.floor(hash(seed + 'sh') * 7), SHUT.length)]);
function busTube(x, y, w, lv) { const c = mixHex(BUS.tubeOff, BUS.tube, clamp01(lv));
  return g({}, path(rrect(x - w / 2 - 22, y - 18, w + 44, 36, 10), BUS.aluDk, NI), rect(x - w / 2 - 22, y - 18, w + 44, 7, BUS.alu, NI), rect(x - w / 2, y - 9, w, 18, c, {rx: 9, ink: false}),
    rect(x - w / 2 - 14, y - 12, 14, 24, '#3E423C', NI), rect(x + w / 2, y - 12, 14, 24, '#3E423C', NI), lv > 0.2 ? rect(x - w / 2 + 10, y - 6, w - 20, 5, '#FFFDF0', fo(0.6 * lv)) : ''); }
/** painted signage: Hindi over English, centred at x; fitted to `w` */
function sign(x, y, w, s) {
  const out = [], hiW = devanagariWidth(s.hi, 100), size = Math.min(s.en ? 34 : 30, (w - (s.icon ? 60 : 0)) / hiW * 100), ox = s.icon ? 28 : 0, c = s.c;
  out.push(devanagari(s.hi, x + ox, y + (s.en ? 2 : 14), {size, fill: c}));
  if (s.en) out.push(text(s.en, x + ox, y + 30, LATIN(19, c, {'letter-spacing': 2})));
  if (s.icon === 'nosmoke') { const ix = x + ox - devanagariWidth(s.hi, size) / 2 - 36, iy = y + 2;
    out.push(rect(ix - 16, iy - 4, 30, 8, '#5A4A3A', NI), rect(ix + 10, iy - 4, 6, 8, '#C9542E', NI), circle(ix, iy, 21, 'none', {stroke: c, 'stroke-width': 5, ink: false}), stroke([[ix - 15, iy + 15], [ix + 15, iy - 15]], c, 5)); }
  return g({}, ...out);
}
const SIGNS = [
  {hi: 'महिलाएँ', en: 'LADIES', c: BUS.sign},
  {hi: 'धूम्रपान निषेध', en: 'NO SMOKING', c: BUS.sign, icon: 'nosmoke'},
  {hi: 'वरिष्ठ नागरिक', en: 'SENIOR CITIZEN', c: BUS.signTeal},
  {hi: 'बिना टिकट यात्रा दंडनीय अपराध है', c: BUS.signTeal},
  {hi: 'अपने सामान की रक्षा स्वयं करें', c: '#5B3B20'},
];
/** a caged wall fan (side view): body + cage, blades as a soft blur with three ghosts (rotation < 3 Hz visible) */
function fanSide(x, y, ctx, s = 1) {
  const a = ((ctx ? ctx.T : 0) * 330) % 360, r = 64 * s;
  return g({}, rect(x - 8 * s, y - 92 * s, 16 * s, 70 * s, BUS.aluDk, NI), ellipse(x, y - 26 * s, 30 * s, 22 * s, '#4C5A51', NI),
    g({transform: `translate(${F(x)} ${F(y + 22 * s)}) scale(1 0.62)`}, circle(0, 0, r, '#B9C2B4', fo(0.2)),
      ...[0, 120, 240].map(b => g({transform: `rotate(${F(a + b)})`}, ellipse(r * 0.5, 0, r * 0.46, r * 0.16, '#7E8A80', fo(0.45)))),
      circle(0, 0, r, 'none', {stroke: '#2B302C', 'stroke-width': 4 * s, ink: false}), circle(0, 0, r * 0.62, 'none', {stroke: '#2B302C', 'stroke-width': 2.5 * s, ink: false}),
      ...[0, 45, 90, 135].map(b => g({transform: `rotate(${b})`}, rect(-r, -1.2 * s, 2 * r, 2.4 * s, '#2B302C', NI))), circle(0, 0, 12 * s, '#3C4640', NI)));
}

/** side view: the window wall with side-facing benches; the exterior scrolls in the windows */
function oldBusSide(o) {
  const {floorY = 1500, cx = 960, front = 'left', outside = 'road', seed = 'ob', passes = []} = o;
  const ceilY = floorY - 1034, coveY = floorY - 990, wy0 = floorY - 900, wy1 = floorY - 470, sill = wy1, seatTop = floorY - 230;
  const bay = 540, gw = 430, dir = front === 'left' ? -1 : 1, pw = bay - gw;
  const ext = {y0: wy0, y1: wy1, horizon: wy1 - 234, k: 190, viewX: cx, dir, kind: outside, eye: 2.0};
  const [ia, ib] = wrapIdx(X0 - cx, X1 - cx, bay), back = [], tubes = [], fans = [];
  const shutter = i => shutterOf(i, seed), near = x => Math.abs(x - cx) < 2500;   // fine detail only where a side-view camera can see it up close
  // ceiling (ivory, seen from below: perspective ribs)
  back.push(vgrad(X0, Y0, X1 - X0, ceilY - Y0 + 2, [[0, darken(BUS.ceil, 0.62)], [0.72, darken(BUS.ceil, 0.26)], [1, mixHex(BUS.ceil, BUS.ceilDk, 0.4)]]));
  for (let i = ia; i <= ib; i++) { const x = cx + i * bay - bay / 2; back.push(poly([[x - 7, ceilY], [x + 7, ceilY], [x + 7 + (x - cx) * 0.9, Y0], [x - 7 + (x - cx) * 0.9, Y0]], darken(BUS.ceil, 0.3), NI)); }
  back.push(vgrad(X0, ceilY - 60, X1 - X0, 60, [[0, '#000', 0], [1, '#000', 0.16]]));
  // cove (tubes live) and the signage band: ivory with the teal livery pinstripes, painted Hindi/English notices
  back.push(rect(X0, ceilY, X1 - X0, coveY - ceilY, BUS.ivoryDk, NI), vgrad(X0, ceilY, X1 - X0, coveY - ceilY, [[0, '#000', 0.22], [1, '#000', 0]]),
    rect(X0, coveY, X1 - X0, wy0 - coveY, BUS.ivory, NI), rect(X0, coveY, X1 - X0, 6, BUS.aluDk, NI), rect(X0, coveY + 9, X1 - X0, 5, BUS.pin, NI), rect(X0, wy0 - 15, X1 - X0, 7, BUS.pin, NI));
  for (let i = ia; i <= ib; i++) { const x = cx + i * bay, s2 = seed + 'sg' + i, sg = SIGNS[mod(i + 1, SIGNS.length)];
    if (hash(s2) < 0.8 && near(x)) back.push(sign(x, coveY + 46, 400, {...sg, c: mixHex(sg.c, BUS.ivory, 0.12 + 0.12 * hash(s2 + 'f'))}));
    if (mod(i, 2) === 0) tubes.push({x: x + bay / 2, y: ceilY + 30, w: 400, h: 18, color: BUS.halo, k: 1.1}); else fans.push(x + bay / 2); }
  // grime under the signage band (soot and handprints)
  for (let i = 0; i < 26; i++) { const s2 = seed + 'gr' + i, x = X0 + hash(s2) * (X1 - X0); back.push(ellipse(x, wy0 - 30 + hash(s2 + 'y') * 20, 30 + 50 * hash(s2 + 'r'), 10, '#6E6448', fo(0.18))); }
  // window band: aluminium frames on the glass, sliding shutters half down, pillars with rivets and seat numbers
  const pillars = [], glass = [], pRiv = [];
  for (let i = ia; i <= ib; i++) { const xw = cx + i * bay, g0 = xw - gw / 2, a = shutter(i), sh = a * (wy1 - wy0), px = xw + gw / 2;
    glass.push(rect(g0, wy0, gw, wy1 - wy0, NB.glass, fo(0.1)),
      vgrad(g0, wy0, gw, wy1 - wy0, [[0, NB.glassFog, 0], [0.62, NB.glassFog, 0.04], [1, NB.glassFog, 0.2]]),
      poly([[g0 + 40, wy0], [g0 + 120, wy0], [g0 + 20, wy1], [g0, wy1], [g0, wy1 - 40]], '#FFFFFF', fo(0.045)),
      // the two sliding panes: the right one rides in front (a double frame at the meeting rail)
      rect(xw - 10, wy0, 12, wy1 - wy0, BUS.aluDk, NI), rect(xw + 2, wy0, 10, wy1 - wy0, BUS.alu, NI), rect(xw + 4, wy0, 3, wy1 - wy0, BUS.aluLt, NI),
      rect(g0, wy1 - 150, gw, 9, BUS.alu, NI), rect(g0, wy1 - 150, gw, 3, BUS.aluLt, NI),
      path(rrect(g0 - 4, wy0 - 4, gw + 8, wy1 - wy0 + 8, 16) + rrect(g0 + 8, wy0 + 8, gw - 16, wy1 - wy0 - 16, 10), BUS.alu, {'fill-rule': 'evenodd', ink: false}),
      path(rrect(g0 + 8, wy0 + 8, gw - 16, wy1 - wy0 - 16, 10) + rrect(g0 + 12, wy0 + 12, gw - 24, wy1 - wy0 - 24, 8), '#1E2326', {'fill-rule': 'evenodd', ink: false}));
    if (a > 0.02) {   // the shutter: louvered aluminium, a bottom rail with two finger pulls, dents
      const sy1 = wy0 + sh;
      glass.push(rect(g0 + 8, wy0 + 8, gw - 16, sh - 8, BUS.shutter, NI), vgrad(g0 + 8, sy1, gw - 16, 26, [[0, '#000', 0.35], [1, '#000', 0]]));
      const lv = []; for (let y = wy0 + 26; y < sy1 - 22; y += 17) lv.push(y);
      glass.push(path(rectsD(lv.map(y => [g0 + 8, y, gw - 16, 3])), BUS.shutterDk, NI), path(rectsD(lv.map(y => [g0 + 8, y + 3, gw - 16, 2])), BUS.shutterLt, NI));
      glass.push(rect(g0 + 8, sy1 - 20, gw - 16, 20, BUS.aluDk, NI), rect(g0 + 8, sy1 - 20, gw - 16, 4, BUS.aluLt, NI), ...[-0.25, 0.25].map(u => path(rrect(xw + u * gw - 22, sy1 - 15, 44, 10, 5), '#3A3F3A', NI)));
      if (hash(seed + 'dent' + i) < 0.6) glass.push(ellipse(g0 + 60 + hash(seed + 'dx' + i) * (gw - 120), wy0 + sh * (0.3 + 0.4 * hash(seed + 'dy' + i)), 24, 9, BUS.shutterDk, fo(0.5))); }
    // the pillar to the right of this window
    pillars.push(rect(px, wy0, pw, wy1 - wy0, BUS.ivory, NI), rect(px, wy0, 10, wy1 - wy0, BUS.ivoryLt, NI), rect(px + pw - 16, wy0, 16, wy1 - wy0, BUS.ivoryDk, NI),
      vgrad(px, wy1 - 120, pw, 120, [[0, '#5A4E30', 0], [1, '#5A4E30', 0.35]]));
    for (let y = wy0 + 22; y < wy1 - 10; y += 34) pRiv.push([px + 18, y], [px + pw - 24, y]);
    const num = String(mod(2 * i + 17, 40) + 1);
    pillars.push(rect(px + 22, wy0 + 40, pw - 44, 30, '#EFE6C8', NI), text(num, px + pw / 2, wy0 + 64, LATIN(24, '#2A2A26', {'font-weight': 900}))); }
  pillars.push(path(dotsD(pRiv, 3.6), BUS.rivet, NI));
  back.push(layer('bg:bus-glass', {}, glass), layer('bg:bus-pillars', {}, pillars));
  // sill (aluminium, rivets, rust runs) and the teal lower panel (seams, rivets, scuffs, a kick plate)
  const low = [rect(X0, sill, X1 - X0, floorY - sill, BUS.teal, NI), rect(X0, sill - 6, X1 - X0, 24, BUS.alu, NI), rect(X0, sill - 6, X1 - X0, 5, BUS.aluLt, NI), rect(X0, sill + 18, X1 - X0, 6, BUS.tealDk, NI)];
  { const rv = []; for (let x = Math.floor(X0 / 45) * 45; x < X1; x += 45) rv.push([x, sill + 7]); low.push(path(dotsD(rv, 3.4), BUS.rivet, NI)); }
  for (const y of [sill + 150, floorY - 120]) { low.push(rect(X0, y, X1 - X0, 5, BUS.tealDk, NI)); const rv = []; for (let x = Math.floor(X0 / 60) * 60 + 30; x < X1; x += 60) rv.push([x, y + 12]); low.push(path(dotsD(rv, 3), mixHex(BUS.teal, BUS.rivet, 0.5), NI)); }
  { const gid = id('rust'); low.push(el('defs', {}, el('linearGradient', {id: gid, x1: 0, y1: 0, x2: 0, y2: 1}, el('stop', {offset: 0, 'stop-color': BUS.rust, 'stop-opacity': 0.7}), el('stop', {offset: 1, 'stop-color': BUS.rust, 'stop-opacity': 0}))));
    for (let i = 0; i < 46; i++) { const s2 = seed + 'ru' + i, x = X0 + hash(s2) * (X1 - X0), l = 30 + 90 * hash(s2 + 'l'); low.push(rect(x - 3, sill + 18, 6 + 6 * hash(s2 + 'w'), l, `url(#${gid})`, NI)); } }
  for (let i = 0; i < 30; i++) { const s2 = seed + 'sc' + i; low.push(ellipse(X0 + hash(s2) * (X1 - X0), sill + 60 + hash(s2 + 'y') * 160, 30 + 60 * hash(s2 + 'r'), 8 + 10 * hash(s2 + 'h'), BUS.tealLt, fo(0.35))); }
  back.push(layer('bg:bus-wall-low', {}, low));
  // seats: rust rexine backs, faded printed covers, white headrest towels; split cushions; teal-painted frames
  const seats = [], [sa, sb] = wrapIdx(X0 - cx, X1 - cx, SEAT_W);
  for (let i = sa; i <= sb; i++) { const x = cx + SEAT_W / 2 + i * SEAT_W, s2 = seed + 'st' + i, c = T(mod(i, 7) === 3 ? BUS.seatB : BUS.seat), top = sill + 28, bh = seatTop - top + 8;
    seats.push(path(rrect(x - 112, top, 224, bh, [34, 34, 6, 6]), c.base, NI), path(rrect(x + 52, top + 6, 56, bh - 10, [24, 30, 4, 4]), c.shade, NI),
      rect(x - 98, top + bh * 0.62, 196, 5, c.deep, {rx: 2, ink: false}), rect(x - 98, top + 10, 150, 6, c.light, {rx: 3, ink: false}));
    const kind = near(x) ? hash(s2) : 0.3;
    if (kind < 0.62 && near(x)) { const [cc, ci] = BUS.covers[mod(i, 3)], ch = 132;   // a printed cover slipped over the back (faded diamonds, a border band, elastic hem)
      const cf = mixHex(cc, BUS.ivoryDk, 0.18);
      seats.push(path(rrect(x - 106, top + 4, 212, ch, [30, 30, 6, 6]), cf, NI), path(rrect(x + 50, top + 8, 56, ch - 8, [22, 28, 4, 4]), darken(cf, 0.14), NI),
        rect(x - 106, top + ch - 26, 212, 16, mixHex(ci, cf, 0.25), NI));
      let dd = ''; for (let r = 0; r < 3; r++) for (let q = -3; q <= 3; q++) { const dx = x + q * 28 + (r % 2) * 14, dy = top + 30 + r * 30; if (dx > x + 96) continue; dd += `M${dx} ${dy - 9}l9 9l-9 9l-9 -9Z`; }
      seats.push(path(dd, mixHex(ci, cf, 0.35), NI), path(Array.from({length: 9}, (_, q) => `M${x - 108 + q * 24} ${top + ch - 2}a12 5 0 1 0 24 0a12 5 0 1 0 -24 0`).join(''), darken(cf, 0.2), NI)); }
    if (kind > 0.45) {   // a headrest towel hung over the top, red embroidered border, fringe
      const tw = 116, tx = x - tw / 2 + (hash(s2 + 'o') - 0.5) * 20;
      seats.push(path(`M${tx} ${top - 4} L${tx + tw} ${top - 4} L${tx + tw - 2} ${top + 66} Q${tx + tw / 2} ${top + 72} ${tx + 2} ${top + 66}Z`, BUS.cloth, NI), rect(tx + 4, top + 50, tw - 8, 5, BUS.clothEdge, NI), rect(tx + 4, top + 58, tw - 8, 2, BUS.clothEdge, NI),
        path(rectsD(Array.from({length: 12}, (_, q) => [tx + 6 + q * 9.4, top + 66, 2, 9])), darken(BUS.cloth, 0.12), NI), rect(tx, top - 4, tw, 10, darken(BUS.cloth, 0.08), NI),
        path(`M${tx + tw * 0.62} ${top + 6} q6 30 -2 60 l14 0 q4 -30 -4 -60Z`, darken(BUS.cloth, 0.1), NI), rect(tx + tw - 14, top + 6, 12, 58, darken(BUS.cloth, 0.06), NI)); }
    if (hash(s2 + 't') < 0.22 && near(x)) seats.push(path(`M${x - 34} ${top + 160} l26 6 l-8 14 l30 4`, 'none', {stroke: c.deep, 'stroke-width': 4}), rect(x - 30, top + 150, 44, 16, '#A9A08A', {...fo(0.8), transform: `rotate(-8 ${x} ${top + 158})`}));   // a tear, taped
    // the cushion, split per seat, piping along the front
    seats.push(path(rrect(x - 130, seatTop - 10, 260, 50, [14, 14, 8, 8]), c.light, NI), rect(x - 126, seatTop + 26, 252, 4, c.deep, NI), rect(x - 130, seatTop - 10, 260, 8, lighten(c.light, 0.15), {rx: 4, ink: false}));
  }
  // the bench frame (teal-painted steel), its shadow, the floor (worn planks with aluminium strips)
  seats.push(rect(X0, seatTop + 40, X1 - X0, floorY - seatTop - 40, BUS.tealDk, NI), rect(X0, seatTop + 40, X1 - X0, 10, BUS.teal, NI), rect(X0, seatTop + 50, X1 - X0, 30, '#000', fo(0.22)));
  for (let i = sa; i <= sb + 1; i++) { const x = cx + i * SEAT_W; seats.push(rect(x - 8, seatTop + 50, 16, floorY - seatTop - 70, BUS.teal, NI)); }
  for (let i = 0; i < 24; i++) { const s2 = seed + 'fr' + i; seats.push(ellipse(X0 + hash(s2) * (X1 - X0), floorY - 40 - hash(s2 + 'y') * 120, 24 + 40 * hash(s2 + 'r'), 8, BUS.rust, fo(0.4))); }
  seats.push(rect(X0, floorY - 26, X1 - X0, 26, BUS.aluDk, NI));
  back.push(layer('bg:bus-seats', {}, seats));
  const fl = [rect(X0, floorY, X1 - X0, Y1 - floorY, BUS.floor, NI)];
  for (let kq = 1; kq < 16; kq++) { const y = floorY + 30 * kq * kq * 0.5 + 34 * kq; if (y > Y1) break; fl.push(rect(X0, y, X1 - X0, 3 + kq * 0.8, kq % 4 === 0 ? BUS.strip : BUS.floorDk, NI)); }
  fl.push(vgrad(X0, floorY, X1 - X0, 900, [[0, '#000', 0.4], [1, '#000', 0]]));
  back.push(layer('bg:bus-floor', {}, fl));
  // bell cord + grab rail with leather straps (mid: over the ceiling), standing poles
  const rail = [rod([[X0, ceilY - 120], [X1, ceilY - 120]], BUS.pole, 18), rod([[X0, ceilY - 124], [X1, ceilY - 124]], '#FFFFFF', 3, NI)];
  for (let x = Math.floor((X0 - cx) / 300) * 300 + cx + 150; x < X1; x += 300) rail.push(stroke([[x, ceilY - 120], [x, ceilY - 52]], BUS.strap, 9), path(`M${x - 24} ${ceilY - 52} L${x + 24} ${ceilY - 52} L${x + 18} ${ceilY - 6} L${x - 18} ${ceilY - 6}Z`, 'none', {stroke: BUS.strap, 'stroke-width': 9, 'stroke-linejoin': 'round'}));
  for (let i = ia; i <= ib; i++) { const x = cx + i * bay - bay / 2; rail.push(path(`M${x} ${ceilY - 30} Q${x + bay / 2} ${ceilY - 6} ${x + bay} ${ceilY - 30}`, 'none', {stroke: BUS.cord, 'stroke-width': 4, ink: false}), rect(x - 4, ceilY - 40, 8, 14, BUS.aluDk, NI)); }
  rail.push(path(`M${cx - 4 * bay + 40} ${ceilY - 28} q-8 30 0 44`, 'none', {stroke: BUS.cord, 'stroke-width': 4}), path(`M${cx - 4 * bay + 18} ${ceilY + 22} q22 -40 44 0Z`, '#C9A23A', NI));   // the bell
  const poles = [-3, 3].map(i => cx + i * bay).map(x => g({}, rod([[x, Y0], [x, floorY + 260]], BUS.pole, 30), rod([[x - 8, Y0], [x - 8, floorY + 260]], '#FFFFFF', 5, NI), ellipse(x, floorY + 262, 40, 10, '#15181A', NI)));
  const G = {cx, bay, gw, wy0, wy1, drop: 300, ext, shutter};
  const info = {kind: 'interior', view: 'side', ownFog: true, floorY, ceilY, horizon: ext.horizon, tubes, ext, seatY: seatTop, seats: Array.from({length: 7}, (_, i) => cx + (i - 3) * SEAT_W),
    gradeAs: {night: 'bus'}, lampLight: (ctx, lo = {}) => poolsSide(ctx, lo, G)};
  return {back, mid: [layer('mid:rail', {}, rail), layer('mid:poles', {}, poles)], front: [],
    info, live: {
      under: ctx => roadside(ctx, {...ext, passes, seed: seed + 'x', holes: (a, b) => { const r = []; for (let i = Math.floor((a - cx) / bay) - 1; i <= Math.ceil((b - cx) / bay) + 1; i++) r.push([cx - gw / 2 + i * bay, wy0, gw, wy1 - wy0]); return r; }}),
      back: ctx => layer('bg:tubes', {}, tubes.map((tb, i) => busTube(tb.x, tb.y, tb.w, ctx.lv.tube(i))), fans.filter(x => x > ctx.view[0] - 200 && x < ctx.view[2] + 200).map(x => fanSide(x, ceilY - 90, ctx))),
    }};
}

// ---------- aisle view: one-point perspective down the bus (toward the driver, or toward the rear) ----------
/** the aisle camera: metres (X right, Y up from the bus floor, Z away) → world px. An actor at depth Z on the floor stands
 *  at P(X, 0, Z) with scale 2.2 / Z (so Z = 2.2 m is scale 1 at floorY). */
export function aisleProjection({floorY = 1500, cx = 960, f = 1034, eye = 1.45} = {}) {
  const vy = floorY - f * eye / 2.2; const P = (X, Y, Z) => [cx + f * X / Z, vy + f * (eye - Y) / Z];
  P.vy = vy; P.f = f; P.eye = eye; P.cx = cx; P.scale = Z => 2.2 / Z; return P;
}
/** the ghat road in perspective (seen down the aisle / through the windscreen): ranges at the horizon, trees and bushes
 *  on both verges, a parapet on the valley side, electric poles and wires, lamps, fog */
function roadAhead(ctx, P, o) {
  const {toward = 'front', oncoming = [], kind = 'road', seed = 'ra'} = o, sgn = toward === 'rear' ? -1 : 1, d = ctx.d, out = [], [vx0, vy0, vx1, vy1] = ctx.view;
  const roadY = o.roadY ?? -0.95, hz = P.vy, f = P.f, fogC = (c, z) => mixHex(c, mixHex(NB.fog, EXT.skyLow, 0.45), Math.min(0.82, z / 90));
  out.push(vgrad(vx0, vy0, vx1 - vx0, hz - vy0 + 40, [[0, EXT.sky], [0.72, mixHex(EXT.sky, EXT.skyLow, 0.7)], [1, mixHex(EXT.skyLow, NB.fog, 0.35)]]), rect(vx0, hz, vx1 - vx0, vy1 - hz, EXT.hill, NI));
  if (kind === 'tunnel') {   // a tunnel: dark walls, the sodium lamp line converging
    out.push(rect(vx0, vy0, vx1 - vx0, vy1 - vy0, '#1B1712', NI));
    for (let p = Math.floor(d / 6) * 6 - 12; p < d + 160; p += 6) { const z = (p - d) * sgn; if (z < 0.6) continue; for (const X of [-3.2, 3.2]) { const [x, y] = P(X, 3.2, z), r = 260 / z * 3 + 4; out.push(softBlob(x, y, r * 3, r * 2, NB.sodium, Math.min(0.7, 3 / z)), ellipse(x, y, r * 0.6, r * 0.25, '#FFE2B0', NI)); } }
    return out.join('');
  }
  // the ranges at infinity (they do not move with travel; a touch of camera parallax)
  const sc = f / 1034, cs = (ctx.cam.x - P.cx) * 0.9;
  const range = (sd, h, col, step) => { const pts = []; for (let x = Math.floor((vx0 - cs) / step) * step - step; x <= vx1 - cs + step; x += step) pts.push([x + cs, hz + 8 * sc - sc * (h[0] + h[1] * mount(seed + sd, x / (h[2] * sc)))]);
    return path(`M${F(pts[0][0])} ${F(hz + 200)} L` + pts.map(p => `${F(p[0])} ${F(p[1])}`).join(' L') + ` L${F(pts.at(-1)[0])} ${F(hz + 200)}Z`, col, NI); };
  out.push(softBlob(P.cx + 700 * sc + cs, hz - 260 * sc, 600 * sc, 300 * sc, EXT.moon, 0.14), range('a', [24, 130, 420], mixHex(EXT.far, EXT.skyLow, 0.3), 24 * sc),
    vgrad(vx0, hz - 90 * sc, vx1 - vx0, 110 * sc, [[0, NB.fog, 0], [0.8, NB.fog, 0.2], [1, NB.fog, 0.1]]), range('b', [8, 70, 260], EXT.far2, 16 * sc));
  // the road ahead/behind: edges and centre dashes in perspective, moving with d
  const road = [P(-3.4, roadY, 400), P(3.4, roadY, 400), P(3.4, roadY, 1), P(-3.4, roadY, 1)];
  out.push(poly([P(-14, roadY, 400), P(14, roadY, 400), P(14, roadY, 0.6), P(-14, roadY, 0.6)], EXT.mid, NI), poly(road, EXT.road, NI));
  for (let p = Math.floor(d / 6) * 6 - 12; p < d + 120; p += 6) { const z0 = (p - d) * sgn, z1 = (p + 3 - d) * sgn; const za = Math.min(z0, z1), zb = Math.max(z0, z1);
    if (zb < 0.8) continue; const a = Math.max(0.8, za); out.push(poly([P(-0.06, roadY, a), P(0.06, roadY, a), P(0.06, roadY, zb), P(-0.06, roadY, zb)], fogC('#C9C4B0', a), NI)); }
  // things along the verges, far → near: trees, bushes, poles + wires, parapet stones, lamps
  const items = [], zMax = 150;
  for (let p = Math.floor((d - 12) / 5) * 5; p < d + zMax; p += 5) { const z = (p - d) * sgn; if (z < 1.0 || z > zMax) continue;
    for (const sd of [-1, 1]) { const s = seed + sd + ':' + Math.round(p / 5), r = hash(s); if (r > 0.62) continue;
      const X = sd * (5.5 + 7 * hash(s + 'x')), tall = r < 0.36, H = tall ? 6 + 5 * hash(s + 'h') : 1.1 + 1.0 * hash(s + 'h'), W = tall ? 1.6 + 1.2 * hash(s + 'w') : 1.2 + 0.6 * hash(s + 'w');
      items.push({z, draw: () => { const c = fogC(EXT.mid, z), [bx, by] = P(X, roadY, z), [, ty] = P(X, roadY + H, z), w = W * f / z, near = sstep((z - 1.6) / 2.4);
        if (near <= 0.01) return '';
        const cc = mixHex(EXT.sky, c, near);
        return tall ? rect(bx - 0.18 * f / z, (by + ty) / 2, 0.36 * f / z, (by - ty) / 2, cc, NI) + ellipse(bx, ty + (by - ty) * 0.3, w, (by - ty) * 0.32, cc, NI) + ellipse(bx - sd * w * 0.5, ty + (by - ty) * 0.42, w * 0.7, (by - ty) * 0.22, cc, NI)
          : ellipse(bx, by - (by - ty) * 0.45, w, (by - ty) * 0.55, cc, NI); }}); } }
  // electric poles on the hill side, wires converging
  const pSp = 32, pPh = 11, pX = -6.4, pH = 8.2;
  for (let i = Math.floor((d - 40 - pPh) / pSp); i * pSp + pPh < d + zMax; i++) { const z = (i * pSp + pPh - d) * sgn, z2 = ((i + 1) * pSp + pPh - d) * sgn; if (z < 1.2 || z > zMax) continue;
    items.push({z, draw: () => { const c = fogC(EXT.mid, z), [bx, by] = P(pX, roadY, z), [, ty] = P(pX, roadY + pH, z), w = Math.max(1.5, 0.2 * f / z), out2 = [rect(bx - w / 2, ty, w, by - ty, c, NI), rect(bx - 0.9 * f / z, ty + 0.25 * f / z, 1.8 * f / z, Math.max(1, 0.12 * f / z), c, NI)];
      if (z2 > 1.2) for (const ox of [-0.75, 0, 0.75]) { const a = P(pX + ox, roadY + pH - 0.2, z), b = P(pX + ox, roadY + pH - 0.2, z2), m = P(pX + ox, roadY + pH - 1.4, (z + z2) / 2); out2.push(path(`M${F(a[0])} ${F(a[1])} Q${F(m[0])} ${F(m[1])} ${F(b[0])} ${F(b[1])}`, 'none', {stroke: c, 'stroke-width': Math.max(1.2, 0.03 * f / z), ink: false})); }
      return out2.join(''); }}); }
  // parapet stones on the valley side (black / white)
  for (let p = Math.floor(d / 2) * 2 - 2; p < d + 60; p += 2) { const z = (p - d) * sgn; if (z < 1.2 || z > 60) continue; const i = Math.round(p / 2);
    items.push({z, draw: () => { const a = P(3.9, roadY, z), b = P(3.9, roadY + 0.45, z), w = 0.25 * f / z; return rect(a[0] - w, b[1], 2 * w, a[1] - b[1], fogC(mod(i, 2) ? EXT.kerbW : '#26292C', z), NI); }}); }
  // lamps on both verges, every LAMP_SPACING m
  for (let i = Math.floor((d - 60) / LAMP_SPACING); i < (d + 200) / LAMP_SPACING; i++) { const z = (lampAt(i) - d) * sgn; if (z < 0.5 || z > 180) continue; const X = hash('ls' + i) < 0.5 ? -4.8 : 4.8;
    items.push({z, draw: () => { const [px, py] = P(X, roadY, z), [hx, hy] = P(X, 5.6, z), fade = Math.min(1, 40 / z) * Math.min(1, (z - 0.5) / 1.5);
      return rect(px - 60 / z, hy, 120 / z, py - hy, fogC(NB.pole, z), NI) + (!lampDead(i) ? softBlob(hx, hy, 2600 / z + 30, 2200 / z + 24, NB.sodium, 0.55 * fade) + ellipse(hx, hy, 140 / z + 2, 50 / z + 1, '#FFE2B0', NI) : ''); }}); }
  items.sort((a, b) => b.z - a.z);
  let fogged = false;
  for (const it of items) { if (!fogged && it.z < 60) { fogged = true; out.push(vgrad(vx0, hz - 140 * sc, vx1 - vx0, 220 * sc, [[0, NB.fog, 0], [0.55, NB.fog, 0.3], [1, NB.fog, 0.1]])); } out.push(it.draw()); }
  out.push(vgrad(vx0, hz - 60 * sc, vx1 - vx0, 120 * sc, [[0, NB.fog, 0], [0.5, NB.fog, 0.2], [1, NB.fog, 0]]));
  // oncoming headlights: [{from, to}] shot time; they grow out of the fog toward the camera
  for (const oc of oncoming) { if (ctx.t < oc.from || ctx.t > oc.to) continue; const u = (ctx.t - oc.from) / (oc.to - oc.from), z = 160 * (1 - u) ** 1.6 + 2;
    for (const X of [-1.6, -0.2]) { const [x, y] = P(X, roadY + 0.8, z); out.push(softBlob(x, y, 4000 / z + 40, 2600 / z + 30, '#FFF0D0', Math.min(0.95, 0.25 + 6 / z)), ellipse(x, y, 300 / z + 4, 160 / z + 3, '#FFFFFF', NI)); } }
  return out.join('');
}
/** a shutter on an aisle-view wall window: louvers as thin quads */
function shutterAisle(Q, X, z0, z1, top, sill, a, dkf) {
  if (a < 0.03) return ''; const y1 = top - a * (top - sill), out = [Q([[X, y1, z0], [X, y1, z1], [X, top, z1], [X, top, z0]], dkf(BUS.shutter))];
  for (let y = top - 0.06; y > y1 + 0.05; y -= 0.07) out.push(Q([[X, y, z0], [X, y, z1], [X, y + 0.012, z1], [X, y + 0.012, z0]], dkf(BUS.shutterDk)));
  out.push(Q([[X, y1, z0], [X, y1, z1], [X, y1 + 0.05, z1], [X, y1 + 0.05, z0]], dkf(BUS.aluDk)));
  return out.join('');
}
/** a ceiling fan seen from the aisle (foreshortened); blades rotate slowly in the live layer */
function fanAisle(P, z, top, ctx) {
  const [x, y] = P(0, top - 0.2, z), [, yt] = P(0, top, z), r = 0.3 * P.f / z, a = ((ctx ? ctx.T : 0) * 300) % 360, sq = 0.3;
  return g({}, rect(x - 0.015 * P.f / z, yt, 0.03 * P.f / z, y - yt, '#3A403B', NI), ellipse(x, y - 0.03 * P.f / z, 0.08 * P.f / z, 0.045 * P.f / z, '#4C5A51', NI),
    g({transform: `translate(${F(x)} ${F(y)}) scale(1 ${sq})`}, circle(0, 0, r, '#B9C2B4', fo(0.18)), ...[0, 120, 240].map(b => g({transform: `rotate(${F(a + b)})`}, ellipse(r * 0.5, 0, r * 0.48, r * 0.12, '#6E7A70', fo(0.5)))),
      circle(0, 0, r, 'none', {stroke: '#2B302C', 'stroke-width': Math.max(1.5, r * 0.04), ink: false}), circle(0, 0, r * 0.15, '#3C4640', NI)));
}
/** a framed devotional picture with a marigold garland and a small red bulb (the driver's shrine); origin = frame centre */
function shrine(x, y, s, ctx) {
  const w = 150 * s, h = 190 * s, out = [];
  out.push(rect(x - w / 2 - 10 * s, y - h / 2 - 10 * s, w + 20 * s, h + 20 * s, '#B8862E', NI), rect(x - w / 2 - 4 * s, y - h / 2 - 4 * s, w + 8 * s, h + 8 * s, '#7A4E1C', NI), rect(x - w / 2, y - h / 2, w, h, '#B5402A', NI),
    vgrad(x - w / 2, y - h / 2, w, h, [[0, '#E9A23B', 0.9], [1, '#7A1E14', 0.6]]), circle(x, y - h * 0.1, w * 0.36, '#F2C14E', NI), circle(x, y - h * 0.1, w * 0.3, '#E58A2A', NI),
    devanagari('ॐ', x, y + h * 0.02, {size: 70 * s, fill: '#7A1E14'}),
    ...[-1, -0.5, 0, 0.5, 1].map(q => path(`M${x + q * w * 0.28} ${y + h * 0.4} q${-w * 0.08} ${-h * 0.12} ${q * w * 0.06} ${-h * 0.2} q${w * 0.1} ${h * 0.1} ${-q * w * 0.06 + w * 0.02} ${h * 0.2}Z`, q === 0 ? '#F6D27A' : '#E9799A', NI)));
  // the garland: a U of marigold beads across the frame
  const n = 22; for (let i = 0; i <= n; i++) { const u = i / n, gx = x - w * 0.56 + u * w * 1.12, gy = y - h * 0.46 + Math.sin(u * Math.PI) * h * 0.62; out.push(circle(gx, gy, 9.5 * s, i % 3 === 1 ? '#F7C531' : i % 5 === 2 ? '#E2453C' : '#F39A1E', NI), circle(gx - 3 * s, gy - 3 * s, 3.5 * s, '#FFD978', NI)); }
  const lv = ctx ? 0.85 + 0.15 * Math.sin(ctx.T * 2.3) : 1;   // the zero-watt bulb (breathes slowly, no strobe)
  out.push(circle(x, y - h / 2 - 34 * s, 13 * s, mixHex('#7A2A1A', '#FF5A3A', lv), NI), softBlob(x, y - h / 2 - 34 * s, 120 * s, 100 * s, '#FF6A3A', 0.3 * lv));
  return g({}, ...out);
}
/** nimbu-mirchi: a lemon and green chillies on a thread; sw = sideways swing (px) */
function nimbuMirchi(x, y0, sw, s = 1) {
  const tip = [x + sw * 2.2, y0 + 220 * s];
  return g({}, stroke([[x, y0], tip], '#1A1A1A', 3 * s), ellipse(tip[0], tip[1] - 120 * s, 26 * s, 32 * s, '#E8C83A', NI), ellipse(tip[0] - 8 * s, tip[1] - 128 * s, 8 * s, 10 * s, '#F6E27A', NI),
    ...[-16, -6, 4, 14].map((dx, i) => path(`M${tip[0] + dx * 0.3 * s} ${tip[1] - 84 * s} q${dx * s} ${40 * s} ${dx * 0.6 * s} ${(80 + i * 6) * s}`, 'none', {stroke: '#2F7A36', 'stroke-width': 9 * s, 'stroke-linecap': 'round'})), ellipse(tip[0], tip[1] - 160 * s, 18 * s, 12 * s, '#2A6A2A', NI));
}
function oldBusAisle(o) {
  const {floorY = 1500, cx = 960, toward = 'front', driver = true, seed = 'ba', dipSeat = 2, outside = 'road', oncoming = []} = o;
  const P = aisleProjection({floorY, cx}), hw = 1.25, top = 2.15, zN = 0.35, zW = o.length ?? (toward === 'rear' ? 6.6 : 9.6), zE = zW - 0.7, bayL = 1.15;
  const dk = (c, z) => mixHex(c, '#0A0D12', Math.min(0.42, Math.max(0, (z - 2) / 18)));
  const Q = (pts, f, a = NI) => poly(pts.map(p => P(...p)), f, a), back = [], mid = [], tubes = [], windows = [];
  const sill = 1.0, wTop = 1.88;
  // far end: windshield (front) or rear window (rear) with the wall around it
  const endHole = toward === 'front' ? [[-1.15, 0.98, zW], [1.15, 0.98, zW], [1.15, 2.0, zW], [-1.15, 2.0, zW]] : [[-1.15, 1.12, zW], [1.15, 1.12, zW], [1.15, 1.95, zW], [-1.15, 1.95, zW]];
  back.push(evenodd(polyD([P(-hw, -0.2, zW), P(hw, -0.2, zW), P(hw, top, zW), P(-hw, top, zW)]) + polyD(endHole.map(p => P(...p))), dk(BUS.ivory, zW)));
  back.push(Q([[-hw, -0.2, zW], [hw, -0.2, zW], [hw, endHole[0][1], zW], [-hw, endHole[0][1], zW]], dk(BUS.teal, zW)));
  back.push(Q([[-0.03, endHole[0][1], zW], [0.03, endHole[0][1], zW], [0.03, endHole[2][1], zW], [-0.03, endHole[2][1], zW]], '#1A1D20'));
  back.push(Q(endHole, NB.glass, fo(0.12)));
  // ceiling, floor and the side walls, bay by bay from far to near (holes = the windows)
  const bays = []; for (let z = zW; z > zN; z -= bayL) bays.push([Math.max(zN, z - bayL), z]);
  bays.forEach(([za, zb], bi) => {
    const zm = (za + zb) / 2, D = c => dk(c, zm);
    back.push(Q([[-hw, top, za], [hw, top, za], [hw, top, zb], [-hw, top, zb]], D(BUS.ceil)));
    back.push(Q([[-hw * 0.94, top, zb - 0.04], [hw * 0.94, top, zb - 0.04], [hw * 0.94, top, zb], [-hw * 0.94, top, zb]], D(darken(BUS.ceil, 0.25))));
    // floor: worn planks, aluminium strips along the aisle
    back.push(Q([[-hw, 0, za], [hw, 0, za], [hw, 0, zb], [-hw, 0, zb]], D(BUS.floor)));
    for (const X of [-0.95, -0.62, 0.62, 0.95]) back.push(Q([[X - 0.006, 0.001, za], [X + 0.006, 0.001, za], [X + 0.006, 0.001, zb], [X - 0.006, 0.001, zb]], D(BUS.floorDk)));
    for (const X of [-0.32, 0.3]) back.push(Q([[X, 0.001, za], [X + 0.02, 0.001, za], [X + 0.02, 0.001, zb], [X, 0.001, zb]], D(BUS.strip)));
    for (const sd of [-1, 1]) { const X = sd * hw, g0 = za + 0.1, g1 = zb - 0.12, hasWin = zb <= zE + 0.05 || toward === 'rear', a = shutterOf(bi * 2 + (sd > 0 ? 1 : 0), seed);
      const wallD = polyD([P(X, sill, za), P(X, sill, zb), P(X, top, zb), P(X, top, za)]) + (hasWin && g1 > g0 ? polyD([P(X, sill, g0), P(X, sill, g1), P(X, wTop, g1), P(X, wTop, g0)]) : '');
      back.push(evenodd(wallD, D(BUS.ivory)));
      back.push(Q([[X, 0, za], [X, 0, zb], [X, sill, zb], [X, sill, za]], D(BUS.teal)), Q([[X, sill - 0.03, za], [X, sill - 0.03, zb], [X, sill + 0.02, zb], [X, sill + 0.02, za]], D(BUS.alu)),
        Q([[X, wTop + 0.05, za], [X, wTop + 0.05, zb], [X, wTop + 0.08, zb], [X, wTop + 0.08, za]], D(BUS.pin)), Q([[X, 2.0, za], [X, 2.0, zb], [X, 2.02, zb], [X, 2.02, za]], D(BUS.pin)));
      if (hasWin && g1 > g0) { back.push(Q([[X, sill, g0], [X, sill, g1], [X, wTop, g1], [X, wTop, g0]], NB.glass, fo(0.1)), Q([[X, sill + 0.35, g0], [X, sill + 0.35, g1], [X, sill + 0.37, g1], [X, sill + 0.37, g0]], D(BUS.alu)),
        shutterAisle(Q, X, g0, g1, wTop, sill, a, D), Q([[X, sill, g0 - 0.02], [X, sill, g0], [X, wTop, g0], [X, wTop, g0 - 0.02]], D(BUS.alu)), Q([[X, sill, g1], [X, sill, g1 + 0.02], [X, wTop, g1 + 0.02], [X, wTop, g1]], D(BUS.alu)));
        windows.push({side: sd, z0: g0, z1: g1, sill, top: wTop, shut: a}); }
      // rivets along the sill
      for (let z = za + 0.05; z < zb; z += 0.16) { const [rx, ry] = P(X, sill + 0.06, z); back.push(circle(rx, ry, Math.max(0.8, 0.008 * P.f / z), D(BUS.rivet), NI)); }
    }
  });
  // tubes along the cove on both sides (indices: left 0–3 far→near, right 4–7)
  const tz = [0.86, 0.63, 0.4, 0.17].map(u => [zW * u - 0.6, zW * u + 0.6]);
  [-1, 1].forEach((sd, si) => tz.forEach(([za, zb], i) => { const X = sd * (hw - 0.12), [x0, y0] = P(X, top - 0.07, za), [x1, y1] = P(X, top - 0.07, zb), m = P(X, top - 0.07, (za + zb) / 2);
    tubes.push({x: m[0], y: m[1], w: Math.hypot(x1 - x0, y1 - y0), h: 14 * 2.2 / ((za + zb) / 2), seg: [[x0, y0], [x1, y1]], z: (za + zb) / 2, i: si * 4 + i}); }));
  // benches along both walls (side-facing), far to near: rexine backs with covers / towels, cushions, teal frames
  const seatZ = []; for (let z = zW - (toward === 'rear' ? 1.3 : 2.0); z >= 1.3; z -= 0.6) seatZ.push(+z.toFixed(2));
  const benches = [];
  for (const z of seatZ) for (const sd of [-1, 1]) { if (toward === 'front' && sd > 0 && z > zW - 2.6) continue;
    const s2 = seed + z + sd, c = T(dk(hash(s2) < 0.15 ? BUS.seatB : BUS.seat, z)), X = sd * (hw - 0.04), Xf = sd * 0.8, z0 = z - 0.27, z1 = z + 0.27, D = col => dk(col, z);
    benches.push(Q([[X, 0.48, z0], [X, 0.48, z1], [X, 1.0, z1], [X, 1.0, z0]], c.base), Q([[X, 0.48, z1 - 0.06], [X, 0.48, z1], [X, 1.0, z1], [X, 1.0, z1 - 0.06]], c.shade));
    const kind = hash(s2 + 'k');
    if (kind < 0.6) { const [cc, ci] = BUS.covers[mod(Math.round(z * 10) + (sd > 0 ? 1 : 0), 3)]; benches.push(Q([[X - sd * 0.005, 0.7, z0 + 0.02], [X - sd * 0.005, 0.7, z1 - 0.02], [X - sd * 0.005, 0.99, z1 - 0.02], [X - sd * 0.005, 0.99, z0 + 0.02]], D(mixHex(cc, BUS.ivoryDk, 0.18))),
      Q([[X - sd * 0.006, 0.72, z0 + 0.02], [X - sd * 0.006, 0.72, z1 - 0.02], [X - sd * 0.006, 0.75, z1 - 0.02], [X - sd * 0.006, 0.75, z0 + 0.02]], D(ci))); }
    if (kind > 0.45) benches.push(Q([[X - sd * 0.01, 0.88, z - 0.1], [X - sd * 0.01, 0.88, z + 0.1], [X - sd * 0.01, 1.01, z + 0.1], [X - sd * 0.01, 1.01, z - 0.1]], D(mixHex(BUS.cloth, BUS.seat, 0.22))),
      Q([[X - sd * 0.011, 0.9, z - 0.1], [X - sd * 0.011, 0.9, z + 0.1], [X - sd * 0.011, 0.91, z + 0.1], [X - sd * 0.011, 0.91, z - 0.1]], D(BUS.clothEdge)));
    benches.push(Q([[X, 0.45, z0 + 0.01], [Xf, 0.45, z0 + 0.01], [Xf, 0.45, z1 - 0.01], [X, 0.45, z1 - 0.01]], c.light),   // cushion top
      Q([[Xf, 0.4, z0 + 0.01], [Xf, 0.45, z0 + 0.01], [Xf, 0.45, z1 - 0.01], [Xf, 0.4, z1 - 0.01]], lighten(c.light, 0.1)),   // piping
      Q([[Xf, 0.08, z0], [Xf, 0.4, z0], [Xf, 0.4, z1], [Xf, 0.08, z1]], D(BUS.tealDk)), Q([[Xf, 0.36, z0], [Xf, 0.4, z0], [Xf, 0.4, z1], [Xf, 0.36, z1]], D(BUS.teal)),   // the frame front
      Q([[Xf, 0.0, z0 - 0.005], [Xf, 0.4, z0 - 0.005], [Xf, 0.4, z0 + 0.03], [Xf, 0.0, z0 + 0.03]], D(BUS.teal))); }   // a leg between seats
  // the cab (front): partition, conductor's ticket rack, header board with the route, the shrine and nimbu-mirchi; or the back row
  const cab = [], zc = zW - 1.3;
  if (toward === 'front') {
    cab.push(Q([[-hw, 0, zc], [hw, 0, zc], [hw, 0.95, zc], [-hw, 0.95, zc]], dk(BUS.teal, zc)), Q([[-hw, 0.9, zc], [hw, 0.9, zc], [hw, 0.95, zc], [-hw, 0.95, zc]], dk(BUS.alu, zc)),
      Q([[-1.15, 0.78, zW - 0.1], [1.15, 0.78, zW - 0.1], [1.15, 0.98, zW - 0.05], [-1.15, 0.98, zW - 0.05]], '#1C1F22'));
    cab.push(Q([[0.15, 0.95, zc], [hw, 0.95, zc], [hw, 1.75, zc], [0.15, 1.75, zc]], NB.glass, fo(0.18)), Q([[0.12, 0, zc], [0.18, 0, zc], [0.18, 1.8, zc], [0.12, 1.8, zc]], dk(BUS.alu, zc)));
    // the conductor's ticket rack on the partition (left): a wooden box of coloured ticket pads
    { const [rx, ry] = P(-0.78, 1.32, zc - 0.02), k = P.f / (zc - 0.02); cab.push(rect(rx - 0.2 * k, ry - 0.16 * k, 0.4 * k, 0.32 * k, '#6E4A2A', NI), rect(rx - 0.18 * k, ry - 0.14 * k, 0.36 * k, 0.28 * k, '#3A2818', NI),
      ...['#E8D36A', '#7FB5D8', '#E58C8C', '#9BD18A', '#F2F0E6', '#E8A65A'].map((c, i) => rect(rx - 0.17 * k + i * 0.058 * k, ry - 0.12 * k, 0.05 * k, 0.24 * k, c, NI))); }
    // steering wheel rim, the driver's seat back, and the driver from behind (khaki shoulders, cap)
    cab.push(ellipse(...P(0.45, 1.05, zW - 0.5), 1034 * 0.22 / (zW - 0.5), 1034 * 0.07 / (zW - 0.5), '#141618', NI));
    if (driver) { const [sx, sy] = P(0.62, 1.32, zW - 0.7), k = 1034 / (zW - 0.7);
      cab.push(path(rrect(sx - 0.2 * k, sy - 0.02 * k, 0.4 * k, 0.5 * k, 0.06 * k), '#1E2224', NI),
        path(`M${sx - 0.24 * k} ${sy + 0.1 * k} Q${sx - 0.22 * k} ${sy - 0.12 * k} ${sx} ${sy - 0.14 * k} Q${sx + 0.22 * k} ${sy - 0.12 * k} ${sx + 0.24 * k} ${sy + 0.1 * k}Z`, mixHex(NB.khaki, '#0A0D12', 0.35), NI),
        rect(sx - 0.05 * k, sy - 0.2 * k, 0.1 * k, 0.08 * k, '#5A3E2E', NI), ellipse(sx, sy - 0.27 * k, 0.1 * k, 0.12 * k, '#16120F', NI),
        path(`M${sx - 0.12 * k} ${sy - 0.3 * k} Q${sx} ${sy - 0.46 * k} ${sx + 0.12 * k} ${sy - 0.3 * k}Z`, mixHex(NB.khaki, '#0A0D12', 0.25), NI), rect(sx - 0.12 * k, sy - 0.32 * k, 0.24 * k, 0.04 * k, '#2A241A', NI)); }
    const [mx, my] = P(-0.02, 1.93, zW - 0.2), mk = 1034 / (zW - 0.2);   // the rear-view mirror, small, top centre
    cab.push(rect(mx - 0.22 * mk, my, 0.44 * mk, 0.12 * mk, '#121416', {rx: 3}), rect(mx - 0.2 * mk, my + 0.015 * mk, 0.4 * mk, 0.09 * mk, '#3A4A5A', NI), rect(mx - 0.02 * mk, my - 0.12 * mk, 0.04 * mk, 0.12 * mk, '#121416', NI));
    // the header board across the bus over the cab: shrine (left, live), route plate (right), शुभ यात्रा
    const hb = zc - 0.05, k = P.f / hb, [hx0, hy0] = P(-hw, 2.14, hb), [hx1, hy1] = P(hw, 1.8, hb);
    cab.push(rect(hx0, hy0, hx1 - hx0, hy1 - hy0, dk(BUS.ivory, hb), NI), rect(hx0, hy1 - 0.025 * k, hx1 - hx0, 0.025 * k, dk(BUS.pin, hb), NI), rect(hx0, hy0, hx1 - hx0, 0.02 * k, dk(BUS.aluDk, hb), NI));
    cab.push(devanagari('शुभ यात्रा', (hx0 + hx1) / 2 - 0.1 * k, hy0 + 0.22 * k, {size: 0.17 * k, fill: dk(BUS.sign, hb)}));
    { const [rx] = P(0.82, 2.0, hb); cab.push(rect(rx - 0.32 * k, hy0 + 0.05 * k, 0.64 * k, 0.24 * k, '#141618', NI), rect(rx - 0.31 * k, hy0 + 0.06 * k, 0.17 * k, 0.22 * k, '#2A1C10', NI),
      text('13', rx - 0.225 * k, hy0 + 0.22 * k, {'font-family': 'JetBrains Mono', 'font-weight': 600, 'font-size': 0.12 * k, fill: '#FFB23F', 'text-anchor': 'middle'}),
      devanagari('सिटी सेंटर', rx + 0.085 * k, hy0 + 0.165 * k, {size: 0.085 * k, fill: '#FFB23F'}), text('CITY CENTRE', rx + 0.085 * k, hy0 + 0.255 * k, {'font-family': 'JetBrains Mono', 'font-weight': 600, 'font-size': 0.05 * k, fill: '#FFB23F', 'text-anchor': 'middle'})); }
  } else {
    const z = zW - 0.55, xs = [-0.96, -0.48, 0, 0.48, 0.96];
    cab.push(Q([[-hw, 0, zW - 0.9], [hw, 0, zW - 0.9], [hw, 0.45, zW - 0.9], [-hw, 0.45, zW - 0.9]], dk(BUS.tealDk, zW - 0.9)));
    xs.forEach((X, i) => { const c = T(dk(i === 2 ? BUS.seatB : BUS.seat, z)); if (i !== dipSeat) cab.push(Q([[X - 0.22, 0.5, zW - 0.15], [X + 0.22, 0.5, zW - 0.15], [X + 0.22, 1.05, zW - 0.15], [X - 0.22, 1.05, zW - 0.15]], c.base), Q([[X - 0.23, 0.45, zW - 0.85], [X + 0.23, 0.45, zW - 0.85], [X + 0.23, 0.45, zW - 0.2], [X - 0.23, 0.45, zW - 0.2]], c.light)); });
    cab.push(Q([[-0.9, 1.97, zW], [0.9, 1.97, zW], [0.9, 2.1, zW], [-0.9, 2.1, zW]], dk(BUS.ivoryDk, zW)));
    { const [ex, ey] = P(0, 2.035, zW), k = P.f / zW; cab.push(devanagari('आपातकालीन द्वार', ex, ey + 0.04 * k, {size: 0.1 * k, fill: dk(BUS.sign, zW)})); }
  }
  // grab rails along the ceiling with leather straps, a bell cord, standing poles (mid)
  for (const sd of [-1, 1]) { const [a1, b1] = P(sd * 0.55, 1.98, zN + 0.2), [a2, b2] = P(sd * 0.55, 1.98, zE); mid.push(rod([[a1, b1], [a2, b2]], BUS.pole, 4, NI));
    for (let z = 1.6; z < zE; z += 0.9) { const [x, y] = P(sd * 0.55, 1.98, z), [, y2] = P(sd * 0.55, 1.74, z), k = 1034 / z; mid.push(stroke([[x, y], [x, y2]], BUS.strap, Math.max(1.5, 0.022 * k)), path(`M${x - 0.045 * k} ${y2} L${x + 0.045 * k} ${y2} L${x + 0.035 * k} ${y2 + 0.08 * k} L${x - 0.035 * k} ${y2 + 0.08 * k}Z`, 'none', {stroke: BUS.strap, 'stroke-width': Math.max(1.5, 0.02 * k)})); } }
  { const pts = []; for (let z = zN + 0.3; z <= zE; z += 0.25) { const sag = 0.05 * Math.sin(Math.PI * ((z - zN) % 1.5) / 1.5); pts.push(P(-0.95, top - 0.06 - sag, z)); } mid.push(stroke(pts, BUS.cord, 2.5)); }
  for (const z of [3.35, 6.95]) for (const sd of [-1, 1]) { const [x, y0] = P(sd * 0.74, 0, z), [, y1] = P(sd * 0.74, top, z), k = 1034 / z; mid.push(rod([[x, y1], [x, y0]], dk(BUS.pole, z), 0.035 * k)); }
  const ext = {kind: outside}, G = {P, toward, kind: outside, hw, windows};
  const info = {kind: 'aisle', view: 'aisle', toward, floorY, horizon: P.vy, proj: P, halfW: hw, ceilH: top, tubes: tubes.map(t => ({x: t.x, y: t.y, w: t.w * 0.9, h: t.h, k: 0.8, color: BUS.halo})), ext, ownFog: false,
    seats: seatZ.map(z => ({z, left: [P(-0.92, 0, z)[0], P(0, 0, z)[1]], right: [P(0.92, 0, z)[0], P(0, 0, z)[1]], scale: +(2.2 / z).toFixed(3)})), gradeAs: {night: 'bus'},
    lampLight: (ctx, lo = {}) => poolsAisle(ctx, lo, G)};
  const dipK = Array.isArray(o.dip) ? o.dip : [{t: 0, v: o.dip ?? 0}];
  const fanZ = toward === 'front' ? [2.9, 6.2] : [2.6, 5.0];
  return {back: [layer('bg:aisle', {}, back), layer('bg:benches', {}, benches), layer('bg:cab', {}, cab)], mid: [layer('mid:aisle', {}, mid)], front: [], info,
    live: {
      under: ctx => roadAhead(ctx, P, {toward, oncoming, kind: outside, seed: seed + 'r'}),
      back: ctx => { const out = tubes.map(tb => { const lv = ctx.lv.tube(tb.i), c = mixHex(BUS.tubeOff, BUS.tube, lv); return stroke(tb.seg, c, Math.max(3, tb.h)); });
        if (toward === 'rear') { const X = [-0.96, -0.48, 0, 0.48, 0.96][dipSeat] ?? 0, v = Math.max(0, Math.min(1, keyedV(dipK, ctx.t))), c = T(dk(dipSeat === 2 ? BUS.seatB : BUS.seat, zW - 0.55)), dy = 0.07 * v;
          out.push(Q([[X - 0.22, 0.5, zW - 0.15], [X + 0.22, 0.5, zW - 0.15], [X + 0.22, 1.05, zW - 0.15], [X - 0.22, 1.05, zW - 0.15]], c.base), poly([P(X - 0.23, 0.45, zW - 0.85), P(X, 0.45 - dy, zW - 0.55), P(X + 0.23, 0.45, zW - 0.85), P(X + 0.23, 0.45, zW - 0.2), P(X - 0.23, 0.45, zW - 0.2)], v > 0.02 ? c.shade : c.light, NI)); }
        out.push(...fanZ.map(z => fanAisle(P, z, top, ctx)));
        if (toward === 'front') { const hb = zW - 1.35, k = P.f / hb, [sx, sy] = P(-0.72, 1.97, hb), sw = 4 * Math.sin(ctx.T * 2 * Math.PI * 0.5) * Math.min(1, Math.abs(ctx.v) / 8 + 0.3), [nx, ny] = P(0.25, 1.8, hb);
          out.push(shrine(sx, sy, 0.0011 * k, ctx), nimbuMirchi(nx, ny, sw, 0.0011 * k)); }
        return layer('bg:tubes', {}, out); },
    }};
}
const keyedV = (keys, t) => { const ks = keys.map(k => ({t: k.t ?? 0, v: k.v ?? k.dip ?? 0})).sort((a, b) => a.t - b.t); if (t <= ks[0].t) return ks[0].v; for (let i = 1; i < ks.length; i++) if (t <= ks[i].t) { const u = (t - ks[i - 1].t) / (ks[i].t - ks[i - 1].t), e = u * u * (3 - 2 * u); return ks[i - 1].v + (ks[i].v - ks[i - 1].v) * e; } return ks.at(-1).v; };
/** Sutherland–Hodgman: clip a polygon to an axis-aligned rect (pre-fitted geometry instead of a clip group) */
function clipPoly(pts, [x0, y0, x1, y1]) {
  const edges = [[p => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]], [p => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]], [p => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]];
  let out = pts;
  for (const [inside, cut] of edges) { const inp = out; out = []; if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length]; if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b)); } }
  return out;
}
const cpoly = (pts, box, f, a = NI) => { const c = clipPoly(pts, box); return c.length >= 3 ? poly(c, f, a) : ''; };

// ---------- mirror view: the rear-view mirror over the windshield. The glass is a slot: actors with
// `crop: info.slot` (default [470, 170, 980, 330, 40]) render inside it; the reflection behind them is the bus interior
// seen from the front (reflect: 'interior') or the road behind the bus (reflect: 'road') ----------
function oldBusMirror(o) {
  const {cx = 960, cy = 335, reflect = 'interior', seed = 'bm', charm = true, oncoming = []} = o;
  const mw = 980, mh = 330, mx = cx - mw / 2, my = cy - mh / 2, box = [mx, my, mx + mw, my + mh], slot = [mx, my, mw, mh, 40];
  const PW = aisleProjection({floorY: 720 + 681, cx});   // the road through the windshield: horizon at y ≈ 720
  // the reflection: a small perspective of the bus interior looking back, mirrored, fitted into the glass
  const R = (X, Y, Z) => { const f = 300, vy = cy + 20; return [cx - f * X / Z, vy + f * (1.5 - Y) / Z]; };
  const reflStatic = [rect(mx, my, mw, mh, '#24303A', NI)];
  if (reflect === 'interior') {
    const q = (pts, f) => cpoly(pts.map(p => R(...p)), box, f);
    reflStatic.push(q([[-1.25, 2.15, 0.6], [1.25, 2.15, 0.6], [1.25, 2.15, 9], [-1.25, 2.15, 9]], '#9A9478'), q([[-1.25, 0, 0.6], [1.25, 0, 0.6], [1.25, 0, 9], [-1.25, 0, 9]], '#221C17'));
    for (const sd of [-1, 1]) { reflStatic.push(q([[sd * 1.25, 1.0, 0.6], [sd * 1.25, 1.0, 9], [sd * 1.25, 2.15, 9], [sd * 1.25, 2.15, 0.6]], '#8A8064'), q([[sd * 1.25, 0, 0.6], [sd * 1.25, 0, 9], [sd * 1.25, 1.0, 9], [sd * 1.25, 1.0, 0.6]], '#1F4A44'),
      q([[sd * 1.25, 1.0, 0.8], [sd * 1.25, 1.0, 9], [sd * 1.25, 1.9, 9], [sd * 1.25, 1.9, 0.8]], '#121A24'));
      for (let z = 1.2; z < 8.8; z += 0.6) reflStatic.push(q([[sd * 1.2, 0.5, z], [sd * 1.2, 0.5, z + 0.5], [sd * 1.2, 0.98, z + 0.5], [sd * 1.2, 0.98, z]], z % 1.8 < 0.6 ? '#2F5A60' : '#6E2E26')); }
    reflStatic.push(q([[-1.25, 0, 9], [1.25, 0, 9], [1.25, 2.15, 9], [-1.25, 2.15, 9]], '#6E684E'), q([[-1.1, 1.1, 9], [1.1, 1.1, 9], [1.1, 1.9, 9], [-1.1, 1.9, 9]], '#0F1620'));
  }
  const reflLive = ctx => {
    const out = [];
    if (reflect === 'interior') { for (const sd of [-1, 1]) for (const [za, zb, i] of [[1.0, 2.6, 0], [3.4, 5.0, 1], [5.8, 7.4, 2]]) { const lv = ctx.lv.tube(i + (sd > 0 ? 4 : 0)), a = R(sd * 1.1, 2.08, za), b = R(sd * 1.1, 2.08, zb);
      const c = clipPoly([[a[0], a[1] - 3], [b[0], b[1] - 3], [b[0], b[1] + 3], [a[0], a[1] + 3]], box); if (c.length > 2) out.push(poly(c, mixHex(BUS.tubeOff, BUS.tube, lv), NI)); } }
    else {   // the road behind: it pours away from the bus into the fog
      const P2 = (X, Y, Z) => [cx - 300 * X / Z, cy + 30 + 300 * (2.6 - Y) / Z], d = ctx.d;
      out.push(vgrad(mx, my, mw, mh * 0.45, [[0, NB.sky], [1, mixHex(NB.skyLow, NB.fog, 0.5)]]), cpoly([P2(-3.5, 0, 1), P2(3.5, 0, 1), P2(3.5, 0, 300), P2(-3.5, 0, 300)], box, NB.road));
      for (let p = Math.floor(d / 6) * 6 - 6; p < d + 90; p += 6) { const za = Math.max(1, d - p), zb = d - p + 3; if (zb < 1) continue; out.push(cpoly([P2(-0.06, 0, za), P2(0.06, 0, za), P2(0.06, 0, zb), P2(-0.06, 0, zb)], box, '#C9C4B0')); }
      for (let i = Math.floor((d - 120) / LAMP_SPACING); i <= Math.ceil(d / LAMP_SPACING); i++) { const z = d - lampAt(i); if (z < 1 || z > 120 || lampDead(i)) continue; const [hx, hy] = P2(hash('ls' + i) < 0.5 ? -4.8 : 4.8, 5.6, z), r = 900 / z + 10;
        if (hx > mx - r && hx < mx + mw + r) out.push(softBlobIn([[mx, my, mw, mh]], hx, hy, r, r * 0.8, NB.sodium, Math.min(0.6, 12 / z))); }
      out.push(rect(mx, cy + 10, mw, mh / 2, NB.fog, fo(0.12)));
    }
    return out.join('');
  };
  // the cab around it: header (ivory, teal pinstripe), sun visors, A-pillars, the windshield hole (the road shows through), dashboard
  const ws = [cx - 1500, 470, cx + 1500, 1200];
  const header = [evenodd(rectD(X0, Y0, X1 - X0, Y1 - Y0) + polyD([[ws[0] + 160, ws[1]], [ws[2] - 160, ws[1]], [ws[2], ws[3]], [ws[0], ws[3]]]), BUS.tealDk),
    rect(X0, Y0, X1 - X0, ws[1] - Y0 - 30, mixHex(BUS.ivoryDk, '#1A1A16', 0.35), NI), rect(X0, ws[1] - 70, X1 - X0, 8, BUS.pin, NI), rect(X0, ws[1] - 40, X1 - X0, 40, BUS.alu, NI), rect(X0, ws[1] - 40, X1 - X0, 6, BUS.aluLt, NI),
    path(rrect(cx - 1450, ws[1] - 30, 700, 150, 18), '#3F4A43', NI), path(rrect(cx + 750, ws[1] - 30, 700, 150, 18), '#3F4A43', NI),
    rect(X0, ws[3], X1 - X0, Y1 - ws[3], '#17191B', NI), rect(X0, ws[3], X1 - X0, 24, '#2A3036', NI),
    rect(ws[0], ws[1], ws[2] - ws[0], ws[3] - ws[1], NB.glass, fo(0.12)), vgrad(ws[0], ws[3] - 300, ws[2] - ws[0], 300, [[0, NB.glassFog, 0], [1, NB.glassFog, 0.25]])];
  for (let x = Math.floor(X0 / 50) * 50; x < X1; x += 50) header.push(circle(x, ws[1] - 20, 3.5, BUS.rivet, NI));
  // signage on the header: शुभ यात्रा, the route plate, a notice (right); the shrine is live (left)
  header.push(devanagari('शुभ यात्रा', cx + 670, 205, {size: 44, fill: BUS.sign}),
    rect(cx + 535, 236, 270, 96, '#EFE6C8', NI), rect(cx + 535, 236, 80, 96, BUS.sign, NI), text('13', cx + 575, 306, LATIN(56, '#F6EBD0', {'font-weight': 900})),
    devanagari('सिटी सेंटर', cx + 710, 282, {size: 32, fill: BUS.signTeal}), text('CITY CENTRE', cx + 710, 318, LATIN(18, BUS.signTeal, {'letter-spacing': 1.5})),
    devanagari('चालक से बात न करें', cx + 670, 398, {size: 27, fill: BUS.signTeal}));
  // the mirror: stalk, the backing, the glass slot (reflection drawn live), bezel + sheen in front
  const mirrorBack = [rect(cx - 22, Y0, 44, my - Y0 + 10, '#121416', NI), path(rrect(mx - 26, my - 26, mw + 52, mh + 52, 58), '#0E1012', NI)];
  const front = [path(rrect(mx - 26, my - 26, mw + 52, mh + 52, 58) + rrect(mx, my, mw, mh, 40), '#0E1012', {'fill-rule': 'evenodd', ink: false}),
    poly([[mx + 80, my], [mx + 300, my], [mx + 120, my + mh], [mx - 0, my + mh], [mx, my + mh * 0.7]], '#FFFFFF', fo(0.05)), poly([[mx + 360, my], [mx + 420, my], [mx + 260, my + mh], [mx + 200, my + mh]], '#FFFFFF', fo(0.04)),
    rect(mx, my, mw, mh, '#9FB6C8', fo(0.06))];
  const charmLive = ctx => { if (!charm) return ''; const sw = 6 * (Math.sin(ctx.t * 2 * Math.PI * 0.55) + 0.5 * Math.sin(ctx.t * 2 * Math.PI * 1.3 + 1)) * (0.4 + Math.min(1, Math.abs(ctx.v) / 8));
    return nimbuMirchi(cx + 330, my + mh + 26, sw); };
  const G = {cx, top: ws[1]};
  const info = {kind: 'interior', view: 'mirror', slot, floorY: 720 + 681, horizon: PW.vy, tubes: [], ext: {kind: 'road'}, gradeAs: {night: 'bus'}, lampLight: (ctx, lo = {}) => poolsMirror(ctx, lo, G)};
  return {back: [layer('bg:windshield-cab', {}, header), layer('bg:mirror', {}, mirrorBack, reflStatic)], mid: [], front: [layer('front:mirror', {}, front)], info,
    live: {under: ctx => roadAhead(ctx, PW, {toward: 'front', oncoming, seed: seed + 'r'}), back: ctx => reflLive(ctx) + charmLive(ctx) + shrine(cx - 640, 318, 0.82, ctx)}};
}

// ---------- door view: the open front door, looking out. outside: 'road' (moving) | a set spec {preset, …, scale, x, y}.
// The bus wall is in `mid`, so actors marked `behind: true` are outside (seen only through the door / window). ----------
let SETS_ = {};
function oldBusDoor(o) {
  const {floorY = 1500, cx = 960, outside = 'road', seed = 'bd', front = 'right'} = o;
  const dw = 470, dTop = floorY - 960, street = floorY + 470, d0 = cx - dw / 2, d1 = cx + dw / 2;
  const win = [d0 - 760, floorY - 900, 520, 430], ceilY = floorY - 1034;
  const wallD = rectD(X0, ceilY, X1 - X0, Y1 - ceilY) + rectD(d0, dTop, dw, street - dTop) + rectD(...win);
  const mid = [evenodd(wallD, BUS.ivory),
    rect(X0, floorY - 470, d0 - X0, 470, BUS.teal, NI), rect(d1, floorY - 470, X1 - d1, 470, BUS.teal, NI), rect(X0, floorY - 476, d0 - X0, 18, BUS.alu, NI), rect(d1, floorY - 476, X1 - d1, 18, BUS.alu, NI),
    rect(X0, ceilY, X1 - X0, 120, BUS.ivoryDk, NI), rect(X0, ceilY + 120, X1 - X0, 6, BUS.pin, NI), rect(X0, Y0, X1 - X0, ceilY - Y0, darken(BUS.ceil, 0.25), NI),
    rect(win[0], win[1], win[2], win[3], NB.glass, fo(0.1)), rect(win[0] + win[2] / 2 - 7, win[1], 14, win[3], BUS.aluDk, NI), rod([[win[0] - 10, win[1] + win[3] - 150], [win[0] + win[2] + 10, win[1] + win[3] - 150]], BUS.alu, 11),
    rect(win[0], win[1], win[2], win[3] * 0.4, BUS.shutter, NI), ...Array.from({length: 9}, (_, i) => rect(win[0], win[1] + 14 + i * 17, win[2], 3, BUS.shutterDk, NI)), rect(win[0], win[1] + win[3] * 0.4 - 18, win[2], 18, BUS.aluDk, NI),
    // the door frame, the folded leaves, the stairwell steps going down to the road, grab poles
    rect(d0 - 30, dTop - 30, dw + 60, 30, '#2C3236', NI), rect(d0 - 30, dTop, 30, street - dTop, '#2C3236', NI), rect(d1, dTop, 30, street - dTop, '#2C3236', NI),
    ...[[d0 - 140, d0 - 30], [d1 + 30, d1 + 140]].map(([a, b]) => g({}, rect(a, dTop + 10, b - a, floorY - dTop - 20, BUS.tealDk, NI), rect(a + 14, dTop + 40, b - a - 28, 420, NB.glass, fo(0.5)), rect(a + 14, dTop + 40, b - a - 28, 420, '#9DB0C2', fo(0.08)))),
    rect(d0, floorY - 10, dw, 30, '#C9A23A', NI), rect(d0, floorY + 20, dw, 200, '#23282C', NI), rect(d0, floorY + 220, dw, 26, '#C9A23A', NI), rect(d0, floorY + 246, dw, 230, '#1A1E21', NI),
    rect(d0, floorY + 230, dw, 8, '#000000', fo(0.3)),
    rod([[d0 - 50, dTop + 60], [d0 - 50, floorY + 300]], BUS.pole, 22), rod([[d1 + 50, dTop + 60], [d1 + 50, floorY + 300]], BUS.pole, 22),
    rect(X0, floorY + 470, X1 - X0, Y1, BUS.floor, NI), rect(X0, floorY - 10, d0 - X0, Y1, BUS.floor, NI), rect(d1, floorY - 10, X1 - d1, Y1, BUS.floor, NI),
    sign(d1 + 330, ceilY + 64, 360, SIGNS[1])];
  // outside
  let back = [], liveBack = null, info = {kind: 'interior', view: 'door', floorY, door: [d0, dTop, dw, street - dTop], street, tubes: [{x: cx, y: ceilY + 60, w: 500, h: 18, color: BUS.halo}], gradeAs: {night: 'bus'}};
  if (outside && typeof outside === 'object') {
    const os = outside, sc = os.scale ?? 0.5, ox = os.x ?? 960, oy = os.y ?? street, oFloor = os.floorY ?? 1500;
    const set = withStyle('flat', () => SETS_[os.preset]({W: 1920, H: 1080, ...os, scale: undefined}));
    const T0 = `translate(${cx} ${oy}) scale(${sc}) translate(${-ox} ${-oFloor})`;
    back = [g({transform: T0}, set.back, set.mid || [])];
    if (set.live && (set.live.under || set.live.back || set.live.mid)) liveBack = ctx => g({transform: T0}, ['under', 'back', 'mid'].map(k => set.live[k] ? set.live[k]({...ctx, view: [X0, Y0, X1, Y1]}) : ''));
    info.outside = {scale: sc, x: ox, y: oy, floorY: oFloor, note: 'an outside point (X, Y) appears at (cx + (X − x)·scale, y + (Y − floorY)·scale)'};
  } else {
    const ext = {y0: dTop, y1: street, horizon: floorY - 760, k: 300, viewX: cx, dir: front === 'right' ? -1 : 1, eye: 2.6};
    info.ext = ext; info.ownFog = true;
    liveBack = ctx => roadside(ctx, {...ext, seed, passes: o.passes || []});
    const G = {cx, bay: 1e6, gw: dw, wy0: dTop, wy1: floorY, drop: 120, ext, shutter: () => 0};
    info.lampLight = (ctx, lo = {}) => poolsSide(ctx, lo, G);
  }
  return {back, mid: [layer('mid:bus-door', {}, mid)], front: [], info,
    live: {...(liveBack ? {back: liveBack} : {}), mid: ctx => busTube(cx, ceilY + 60, 500, ctx.lv.tube(0))}};
}

// =====================================================================================================================
// NIGHT EXTERIORS
// =====================================================================================================================
/** the static night backdrop: sky with a moon haze, ghat ranges, forested hills with village lights, fog banks, a tree
 *  line; or (roofs: a skyline function) a town of roofs. Ground below hz. */
export function nightBackdrop({hz, seed = 'nb', sky = EXT.sky, low = EXT.skyLow, fog = NB.fog, ground = '#10141A', trees = true, roofs = false, mountains = trees}) {
  const out = [vgrad(X0, Y0, X1 - X0, hz - Y0, [[0, darken(sky, 0.3)], [0.6, sky], [1, mixHex(low, fog, 0.3)]]), rect(X0, hz, X1 - X0, Y1 - hz, ground, NI)];
  const sil = (step, yOf, col) => { const pts = []; for (let x = X0 - step; x <= X1 + step; x += step) pts.push([x, yOf(x)]); return path(`M${X0 - step} ${hz + 400} L` + pts.map(p => `${F(p[0])} ${F(p[1])}`).join(' L') + ` L${X1 + step} ${hz + 400}Z`, col, NI); };
  if (mountains) {
    out.push(softBlob(X0 + (X1 - X0) * 0.62, hz - 900, 900, 520, EXT.moon, 0.14),
      sil(30, x => hz + 10 - (80 + 420 * mount(seed + 'r1', x / 1300) ** 1.5), mixHex(EXT.far, EXT.sky, 0.3)),
      vgrad(X0, hz - 380, X1 - X0, 460, [[0, fog, 0], [0.7, fog, 0.26], [1, fog, 0.1]]),
      sil(24, x => hz + 20 - (50 + 330 * mount(seed + 'r2', x / 900)), EXT.far2));
    const hill = x => hz + 40 - (40 + 200 * fbm(seed + 'h', x / 700) + 14 * Math.abs(Math.sin(x / 30)));
    out.push(sil(18, hill, EXT.hill));
    for (let j = Math.floor(X0 / 700); j <= X1 / 700; j++) { const s = seed + 'vl' + j; if (hash(s) > 0.35) continue; const x0 = j * 700 + hash(s + 'x') * 400;
      for (let q = 0; q < 2 + Math.floor(hash(s + 'n') * 4); q++) { const x = x0 + (hash(s + q) - 0.5) * 120; out.push(circle(x, hill(x) + 30 + 70 * hash(s + 'y' + q), 3 + 2 * hash(s + 'r' + q), EXT.village, NI)); }
      out.push(softBlob(x0, hill(x0) + 70, 120, 60, EXT.village, 0.16)); }
    out.push(vgrad(X0, hz - 200, X1 - X0, 300, [[0, fog, 0], [0.6, fog, 0.22], [1, fog, 0.08]]));
  }
  const far = mixHex(low, '#090C12', 0.5), mid = mixHex(fog, '#0B0E14', 0.7);
  if (typeof roofs === 'function') out.push(...roofs({y: hz + 10, hMin: 120, hMax: 520, wMin: 260, wMax: 640, color: far, seed: seed + 'r', win: '#9C7E4A', winK: 0.06, roofs: true}));
  if (trees) out.push(sil(14, x => { const c = Math.floor(x / 60), f = x / 60 - c, tooth = 1 - Math.abs(2 * f - 1), con = hash(seed + 'tc' + c) < 0.5 ? 1 : 0;
    return hz + 10 - (120 + 120 * fbm(seed + 't', x / 400) + con * 110 * tooth * tooth + (1 - con) * 40 * Math.sqrt(Math.max(0, Math.sin(Math.PI * f)))); }, EXT.tree));
  out.push(vgrad(X0, hz - 420, X1 - X0, 560, [[0, fog, 0], [0.62, fog, 0.3], [1, fog, 0.1]]));
  if (trees) for (let x = X0 + 90; x < X1; x += 520) { const h = 500 + 400 * hash(seed + 'm' + x); out.push(rect(x - 14, hz - h * 0.3, 28, h * 0.3 + 20, mid, NI), ellipse(x, hz - h * 0.55, 220 + 120 * hash(seed + 'k' + x), h * 0.35, mid, NI)); }
  return out;
}
/** a street lamp on a pole that flickers (live): level from a seeded flicker. Returns {pole (static), head: ctx => svg} */
export function flickerLamp(x, base, {h = 2100, seed = 'lamp', rate = 1.1, depth = 0.8, color = NB.sodium, arm = 1, dead = false, k = 1} = {}) {
  const pole = g({}, rect(x - 14 * k, base - h, 28 * k, h, NB.pole, NI), rect(x - 26 * k, base - 160 * k, 52 * k, 160 * k, NB.pole, NI), path(`M${x} ${base - h} Q${x} ${base - h - 90 * k} ${x + arm * 120 * k} ${base - h - 90 * k} L${x + arm * 230 * k} ${base - h - 90 * k}`, 'none', {stroke: NB.pole, 'stroke-width': 22 * k, 'stroke-linecap': 'round'}),
    path(`M${x + arm * 170 * k} ${base - h - 110 * k} L${x + arm * 320 * k} ${base - h - 110 * k} L${x + arm * 290 * k} ${base - h - 50 * k} L${x + arm * 200 * k} ${base - h - 50 * k}Z`, NB.pole, NI));
  const hx = x + arm * 245 * k, hy = base - h - 46 * k;
  const head = ctx => { const lv = dead ? 0.05 : flickerLevel({type: 'flicker', from: 0, to: 1e4, rate, depth, seed}, ctx.T ?? ctx.t, 'lamp');
    return g({}, ellipse(hx, hy, 50 * k, 14 * k, mixHex('#3A342A', '#FFE2B0', lv), NI), lv > 0.05 ? softBlob(hx, hy + 30 * k, 520 * k, 420 * k, color, 0.42 * lv) : '',
      lv > 0.05 ? poly([[hx - 40 * k, hy + 10 * k], [hx + 40 * k, hy + 10 * k], [hx + 380 * k, base + 40 * k], [hx - 380 * k, base + 40 * k]], color, fo(0.07 * lv)) : '', lv > 0.05 ? softBlob(hx, base + 30 * k, 520 * k, 90 * k, color, 0.3 * lv) : ''); };
  return {pole, head, at: [hx, hy]};
}

// ---------- the bus from outside on a foggy ghat road ----------
function busExterior(o) {
  const {floorY = 1500, cx = 960, angle = 'side', bus = true, busX = cx, tunnel = false, tunnelX = cx + 2600, front = 'left', board = 'CITY CENTRE', route = '13', seed = 'be', headlights = true} = o;
  if (angle === 'front') return busExteriorFront(o);
  const hz = floorY - 620, dir = front === 'left' ? 1 : -1;   // scenery streams away from the bus front
  const back = [...nightBackdrop({hz, seed}), rect(X0, floorY - 200, X1 - X0, 470, EXT.road, NI), rect(X0, floorY - 214, X1 - X0, 14, '#3A4048', NI), rect(X0, floorY + 270, X1 - X0, Y1, '#0E1115', NI),
    vgrad(X0, floorY - 200, X1 - X0, 470, [[0, '#000', 0.3], [1, '#000', 0]])];
  const mid = [];
  if (bus) mid.push(g({transform: tr(busX, floorY, 0, front === 'left' ? 1 : -1, 1)}, SCENE.busSide({board, route, headlights, seed})));
  const front_ = [];
  if (tunnel === 'mouth') {   // the portal face: the bus disappears behind it as it drives in
    const tx = tunnelX, side = front === 'left' ? -1 : 1;
    front_.push(path(`M${tx} ${Y1} L${tx} ${floorY - 1750} Q${tx + side * 200} ${floorY - 2300} ${tx + side * 900} ${floorY - 2500} L${side < 0 ? X0 : X1} ${floorY - 2700} L${side < 0 ? X0 : X1} ${Y1}Z`, '#2A2622', NI),
      rect(Math.min(tx, tx + side * 300), floorY - 1800, 300, 1800 + 300, '#3A342E', NI), rect(Math.min(tx, tx + side * 300), floorY - 1860, 300, 60, '#4A433B', NI),
      path(`M${tx + side * 300} ${floorY - 2200} Q${tx + side * 1200} ${floorY - 2500} ${(side < 0 ? X0 : X1)} ${floorY - 2900}`, 'none', {stroke: '#1A2A1E', 'stroke-width': 160}),
      ...Array.from({length: 6}, (_, i) => rect(tx + side * (330 + i * 260), floorY - 1500 + (i % 2) * 300, 60, 600, '#24201C', NI)));
  }
  const info = {kind: 'exterior', view: 'busExterior', floorY, horizon: hz, ext: {k: 300, viewX: cx, dir}};
  return {back, mid, front: front_, info, live: {back: ctx => roadStream(ctx, {floorY, hz, dir, seed})}};
}
/** trees, bushes, poles and lamps streaming past behind a side-on vehicle (orthographic, parallax by depth, half-frame smear) */
function roadStream(ctx, {floorY, hz, dir, seed}) {
  const [vx0, , vx1] = ctx.view, d = ctx.d, v = Math.abs(ctx.v), out = [];
  for (const [dp, sp, kind] of [[0.22, 9, 'tree'], [0.35, 12, 'tree'], [0.55, 6, 'bush'], [0.7, LAMP_SPACING, 'lamp']]) {
    const k = 470 * dp, base = hz + (floorY - 200 - hz) * dp, sm = Math.min(160, v * k / 48);
    const ia = Math.floor((d + (vx0 - 960) / (k * dir || 1)) / sp) - 3, ib = Math.ceil((d + (vx1 - 960) / (k * dir || 1)) / sp) + 3;
    for (let i = Math.min(ia, ib); i <= Math.max(ia, ib); i++) { const p = kind === 'lamp' ? lampAt(i) : i * sp + hash(seed + dp + i) * 5, x = 960 + dir * (p - d) * k;
      if (x < vx0 - 1500 || x > vx1 + 1500) continue;
      const c = mixHex(NB.fog, '#0B0E14', 0.55 + dp * 0.4), w = sm / 2;
      if (kind === 'tree') { if (hash(seed + 'p' + dp + i) > 0.7) continue; const h = (5 + 4 * hash(seed + 'h' + i)) * k; out.push(rect(x - 0.15 * k - w, base - h * 0.4, 0.3 * k + 2 * w, h * 0.4, c, NI), ellipse(x, base - h * 0.62, 2 * k + w, h * 0.38, c, NI)); }
      else if (kind === 'bush') { if (hash(seed + 'b' + i) > 0.5) continue; const h = (0.8 + 0.8 * hash(seed + 'bh' + i)) * k; out.push(ellipse(x, base - h * 0.4, 1.4 * k + w, h * 0.55, c, NI)); }
      else { const top = base - 6 * k; out.push(rect(x - 0.1 * k - w, top, 0.2 * k + 2 * w, base - top, NB.pole, NI), rect(dir < 0 ? x - 1.0 * k : x, top, 1.0 * k, 0.12 * k, NB.pole, NI));
        if (!lampDead(i)) out.push(softBlob(x + dir * 0.9 * k, top + 0.3 * k, 3 * k, 2.6 * k, NB.sodium, 0.5), ellipse(x + dir * 0.9 * k, top + 0.18 * k, 0.3 * k, 0.08 * k, '#FFE2B0', NI), softBlob(x + dir * 0.9 * k, base + 20, 3.4 * k, 0.5 * k, NB.sodium, 0.22)); } } }
  // lane dashes on the road (in front of the far verge), moving fast
  const k = 470, y = floorY + 60;
  for (let p = Math.floor((d - 30) / 6) * 6; p < d + 30; p += 6) { const x = 960 + dir * (p - d) * k; if (x < vx0 - 1500 || x > vx1 + 1500) continue; out.push(rect(x - 1.5 * k / 2, y, 1.5 * k + v * k / 48, 22, '#B9B4A0', NI)); }
  return out.join('');
}
/** front angle: the ghat road in one-point perspective (rock cut and trees on the hill side, parapet and the valley's
 *  treetops on the other); the bus (busFront) drives toward the camera: `busZ` = its start depth (m) or keys [{t, v}];
 *  by default a moving shot starts it far enough to arrive at 5 m when the shot ends (shot speed), a still shot stands
 *  it at 14 m. Its headlights light the road and the fog ahead (info.headlamps feeds the `headlights` light). */
function busExteriorFront(o) {
  const {floorY = 1500, cx = 960, bus = true, tunnel = false, board = 'CITY CENTRE', route = '13', seed = 'bf', headlights = true, busX = 1.45} = o;
  const P = aisleProjection({floorY, cx, eye: 1.6}), hz = P.vy, f = P.f, back = [...nightBackdrop({hz, seed, trees: false, mountains: true})], front = [];
  const fogC = (c, z) => mixHex(c, mixHex(NB.fog, EXT.skyLow, 0.5), Math.min(0.85, z / 110));
  // the hill side (left): a rock cut rising from the verge with trees on top; the valley side (right): treetops below the road
  { const tops = [], hOf = z => 7 + 5 * fbm(seed + 'c', z / 9);
    for (const [za, zb] of [[400, 60], [60, 18], [18, 1.2]]) { const cut = []; for (let z = za; z >= zb * 0.999; z *= 0.93) cut.push(P(-5.6, hOf(z), z)); cut.push(P(-5.6, hOf(zb), zb));
      back.push(poly([P(-5.6, 0, za), ...cut, P(-5.6, 0, zb), P(-40, 0, zb), P(-40, 0, za)], fogC('#1A2433', (za + zb) / 2), NI)); }
    for (let z = 400; z >= 1.2; z *= 0.93) tops.push([z, hOf(z)]);
    for (const [z, hgt] of tops) { if (z > 160 || z < 9 || hash(seed + 'tt' + Math.round(z * 10)) > 0.7) continue; const [x, y] = P(-6.4 - 2 * hash(seed + 'tx' + z), hgt, z), r = (0.9 + 0.6 * hash(seed + 'tr' + z)) * f / z, con = hash(seed + 'tk' + z) < 0.5;
      back.push(con ? poly([[x - r, y], [x + r, y], [x, y - r * 3.2]], fogC(EXT.tree, z), NI) : ellipse(x, y - r * 0.8, r, r * 1.2, fogC(EXT.tree, z), NI), rect(x - r * 0.12, y - r * 0.2, r * 0.24, r * 0.4, fogC(EXT.tree, z), NI)); }
    for (let z = 200; z >= 9; z *= 0.88) { const [x, y] = P(7 + 5 * hash(seed + 'vx' + Math.round(z)), -3.2, z), r = (1.0 + 0.8 * hash(seed + 'vr' + Math.round(z))) * f / z; back.push(ellipse(x, y - r * 0.9, r, r * 1.3, fogC(EXT.mid, z), NI)); } }
  // the road, verges, the parapet on the valley side, centre dashes, a milestone
  back.push(poly([P(-5.6, 0, 1.2), P(-4, 0, 1.2), P(-4, 0, 400), P(-5.6, 0, 400)], '#191E23', NI), poly([P(4, 0, 1.2), P(5, 0, 1.2), P(5, 0, 400), P(4, 0, 400)], '#191E23', NI),
    poly([P(-4, 0, 1.2), P(4, 0, 1.2), P(4, 0, 400), P(-4, 0, 400)], EXT.road, NI));
  for (let z = 2; z < 200; z += 6) back.push(poly([P(-0.07, 0, z), P(0.07, 0, z), P(0.07, 0, z + 3), P(-0.07, 0, z + 3)], fogC('#B9B4A0', z), NI));
  for (let z = 1.6; z < 90; z += 2) { const i = Math.round(z / 2), a = P(4.5, 0, z), b = P(4.5, 0.5, z), w = 0.26 * f / z; back.push(rect(a[0] - w, b[1], 2 * w, a[1] - b[1], fogC(i % 2 ? EXT.kerbW : '#2A2D30', z), NI)); }
  { const z = 11, a = P(-4.5, 0, z), b = P(-4.5, 0.75, z), w = 0.25 * f / z; back.push(path(rrect(a[0] - w, b[1], 2 * w, a[1] - b[1], [w, w, 0, 0]), fogC('#C9C7BC', z), NI), path(rrect(a[0] - w, b[1], 2 * w, (a[1] - b[1]) * 0.35, [w, w, 0, 0]), fogC('#D9A93A', z), NI)); }
  // bushes on both verges, electric poles with wires on the hill side, lamps (some dead)
  for (let z = 120; z >= 6; z *= 0.88) for (const sd of [-1, 1]) { if (hash(seed + 'bu' + sd + Math.round(z * 10)) > 0.55) continue; const [x, y] = P(sd * (4.4 + 1.2 * hash(seed + 'bx' + z)), 0, z), r = (0.6 + 0.6 * hash(seed + 'br' + z)) * f / z; back.push(ellipse(x, y - r * 0.5, r * 1.4, r, fogC(EXT.near, z), NI)); }
  const lamps = [];
  for (let z = 8, i = 0; z < 220; z += LAMP_SPACING, i++) { const X = i % 2 ? 6.0 : -6.0, [bx, by] = P(X, 0, z), [hx, hy] = P(X, 6, z), w = Math.max(2, 0.2 * f / z), fade = Math.min(1, 26 / z), dead = hash(seed + 'ld' + i) < 0.25;
    lamps.push(rect(bx - w / 2, hy, w, by - hy, fogC(NB.pole, z), NI)); if (!dead) lamps.push(softBlob(hx - Math.sign(X) * 0.8 * f / z, hy, 2.6 * f / z, 2.2 * f / z, NB.sodium, 0.5 * fade), softBlob(hx - Math.sign(X) * 0.8 * f / z, by, 3 * f / z, 0.6 * f / z, NB.sodium, 0.25 * fade)); }
  for (let z = 34; z < 200; z += 32) { const z2 = z + 32, [bx, by] = P(-7, 0, z), [, ty] = P(-7, 8.2, z), w = Math.max(1.5, 0.2 * f / z), c = fogC('#0E141B', z);
    lamps.push(rect(bx - w / 2, ty, w, by - ty, c, NI), rect(bx - 0.9 * f / z, ty, 1.8 * f / z, Math.max(1, 0.12 * f / z), c, NI));
    for (const ox of [-0.75, 0, 0.75]) { const a = P(-7 + ox, 8.0, z), b = P(-7 + ox, 8.0, z2), m = P(-7 + ox, 6.8, (z + z2) / 2); lamps.push(path(`M${F(a[0])} ${F(a[1])} Q${F(m[0])} ${F(m[1])} ${F(b[0])} ${F(b[1])}`, 'none', {stroke: c, 'stroke-width': Math.max(1, 0.03 * f / z), ink: false})); } }
  back.push(...lamps, vgrad(X0, hz - 300, X1 - X0, 420, [[0, NB.fog, 0], [0.6, NB.fog, 0.35], [1, NB.fog, 0.1]]));
  // the bus approaching: depth over time, its light on the road and in the fog
  const busZAt = ctx => { const z0 = o.busZ, sh = ctx.shot, dur = Math.max(0.1, (sh.end ?? 1) - (sh.start ?? 0));
    if (Array.isArray(z0)) return keyedV(z0.map(k => ({t: k.t, v: k.v ?? k.z})), ctx.t);
    const moving = Math.abs(travel(sh, 0).v) > 0.2, start = z0 ?? (moving ? 5 + (travel(sh, dur).d - travel(sh, 0).d) : 14);
    return Math.max(2.4, start - (travel(sh, ctx.t).d - travel(sh, 0).d)); };
  const lampsAt = ctx => { const z = busZAt(ctx), s = 2.2 / z, [bx, by] = P(busX, 0, z); return [-1, 1].map(sd => ({x: bx + sd * 440 * s, y: by - 440 * s, r: 62 * s, z})); };
  const busLive = ctx => { if (!bus) return ''; const z = busZAt(ctx), s = 2.2 / z, [bx, by] = P(busX, 0, z), out = [];
    if (headlights) for (const L of lampsAt(ctx)) {   // light thrown ahead: a pool on the wet road toward us, a glow in the fog
      const zn = Math.max(1.4, z - 9), near = P(busX + (L.x - bx) / (f / z) * 1.1, 0, zn), hwn = 1.2 * f / zn;
      out.push(poly([[L.x - 40 * s, by], [L.x + 40 * s, by], [near[0] + hwn, near[1]], [near[0] - hwn, near[1]]], '#FFE8B8', fo(0.1)),
        softBlob(L.x, by + (near[1] - by) * 0.3, 160 * s + 40, (near[1] - by) * 0.4 + 10, '#FFE8B8', 0.16), softBlob(L.x, L.y, 900 * s + 60, 520 * s + 40, '#FFE2B0', 0.16)); }
    out.push(g({transform: tr(bx, by, 0, s)}, SCENE.busFront({board, route, headlights})));
    return out.join(''); };
  if (tunnel === 'mouth') {   // we are just inside the tunnel: its concrete arch frames the night outside
    const aw = 860, ah = 600, yb = floorY + 400, open = (k, dx = 0) => { const L = cx - aw * k, R = cx + aw * k, sh = y => hz + (y - hz) * k;
      return `M${F(L + dx)} ${F(sh(yb))} L${F(L + dx)} ${F(sh(hz - 300))} Q${F(L + dx)} ${F(sh(hz - ah))} ${cx} ${F(sh(hz - ah - 50))} Q${F(R - dx)} ${F(sh(hz - ah))} ${F(R - dx)} ${F(sh(hz - 300))} L${F(R - dx)} ${F(sh(yb))}`; };
    front.push(path(`M${X0} ${Y0} H${X1} V${Y1} H${X0}Z ` + open(1) + 'Z', '#221D18', {'fill-rule': 'evenodd', ink: false}));
    for (const k of [1.32, 1.8, 2.6]) front.push(path(open(k), 'none', {stroke: '#2E2720', 'stroke-width': 10 * k, ink: false}));   // ring joints between the tunnel segments
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.06 + 0.88 * i / 10), ex = cx - Math.cos(a) * aw * 1.02, ey = hz - 150 - Math.sin(a) * (ah - 60);   // joints converging on the portal
      front.push(stroke([[ex, ey], [cx + (ex - cx) * 3.2, hz - 150 + (ey - hz + 150) * 3.2]], '#2A241E', 7)); }
    front.push(path(open(1), 'none', {stroke: '#4A4137', 'stroke-width': 26, ink: false}), path(open(1.01), 'none', {stroke: '#5E5446', 'stroke-width': 6, ink: false}),
      rect(X0, yb - 120, X1 - X0, Y1, '#17140F', NI), vgrad(X0, floorY + 120, X1 - X0, 300, [[0, '#000', 0], [1, '#000', 0.5]]),
      // a sodium lamp over us inside the tunnel, its pool on the wet floor
      rect(cx - 70, hz - ah - 260, 140, 26, '#FFE2B0', {rx: 10, ink: false}), softBlob(cx, hz - ah - 240, 900, 300, NB.sodium, 0.22), softBlob(cx, floorY + 260, 900, 160, NB.sodium, 0.12));
  }
  const info = {kind: 'exterior', view: 'busExteriorFront', floorY, horizon: hz, proj: P, note: 'busFront at depth Z: x = P(X,0,Z)[0], y = P(X,0,Z)[1], scale = 2.2 / Z',
    headlamps: ctx => (bus && headlights ? lampsAt(ctx) : [])};
  return {back, mid: [], front, info, live: {mid: busLive}};
}

// ---------- inside a tunnel, looking ahead: sodium lamps rush past, the far end glows ----------
function tunnelSet(o) {
  const {floorY = 1500, cx = 960, exit = false} = o;
  const P = aisleProjection({floorY, cx, eye: 2.4}), hz = P.vy, R = 4.2, H = 5.4;
  const back = [rect(X0, Y0, X1 - X0, Y1 - Y0, '#17130F', NI)];
  for (let z = 180; z > 1; z *= 0.8) { const c = mixHex('#3A3229', '#0E0C0A', Math.min(1, z / 120)); back.push(poly([P(-R, 0, z), P(-R, H - 2.2, z), P(-R, H - 2.2, z * 0.8), P(-R, 0, z * 0.8)], c, NI), poly([P(R, 0, z), P(R, H - 2.2, z), P(R, H - 2.2, z * 0.8), P(R, 0, z * 0.8)], c, NI),
    poly([P(-R, H - 2.2, z), P(-R * 0.5, H, z), P(R * 0.5, H, z), P(R, H - 2.2, z), P(R, H - 2.2, z * 0.8), P(R * 0.5, H, z * 0.8), P(-R * 0.5, H, z * 0.8), P(-R, H - 2.2, z * 0.8)], mixHex(c, '#000', 0.2), NI),
    poly([P(-R, 0, z), P(R, 0, z), P(R, 0, z * 0.8), P(-R, 0, z * 0.8)], mixHex('#1E2024', '#000', Math.min(0.6, z / 200)), NI)); }
  if (exit) back.push(softBlob(cx, hz - 40, 260, 200, '#CFE0F0', 0.9), ellipse(cx, hz - 30, 70, 60, '#EAF4FF', NI));
  const info = {kind: 'exterior', view: 'tunnel', floorY, horizon: hz, proj: P};
  return {back, mid: [], front: [], info, live: {back: ctx => { const out = [], d = ctx.d;
    for (let p = Math.floor(d / 6) * 6 - 6; p < d + 160; p += 6) { const z = p - d; if (z < 0.8) continue;
      out.push(poly([P(-0.08, 0.001, z), P(0.08, 0.001, z), P(0.08, 0.001, z + 3), P(-0.08, 0.001, z + 3)], '#B9B4A0', NI));
      for (const X of [-R * 0.92, R * 0.92]) { const [x, y] = P(X, H - 2.4, z), r = P.f * 0.5 / z; out.push(softBlob(x, y, r * 4, r * 3, NB.sodium, Math.min(0.75, 5 / z)), ellipse(x, y, r * 0.9, r * 0.3, '#FFE6B8', NI)); } }
    return out.join(''); }}};
}

/** the sets this module adds (backgrounds.mjs merges them into SETS; `sets` is SETS itself, for the door's outside view) */
export function nightSets(sets) {
  SETS_ = sets;
  return {
    /** the old Indian state-transport bus at night. view: side (default) | aisle | mirror | door. See docs/WORLD.md. */
    oldBus: o => {
      const v = o.view || 'side';
      if (v === 'side') return oldBusSide(o);
      if (v === 'aisle') return oldBusAisle(o);
      if (v === 'mirror') return oldBusMirror(o);
      if (v === 'door') return oldBusDoor(o);
      throw new Error(`oldBus: unknown view "${v}" (side aisle mirror door)`);
    },
    /** the bus seen from outside on a foggy ghat road. angle: side | front; tunnel: 'mouth' */
    busExterior,
    /** inside a tunnel looking ahead: sodium lamps rush past (driven by shot speed). exit: true shows the far end */
    tunnel: tunnelSet,
  };
}
