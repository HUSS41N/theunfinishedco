// v2 flat style tokens. Every colour comes in pairs or triples: base, shade (same hue, darker), light (same hue, lighter).
// Shading is never a gradient on a character: it is a second flat shape in the shade colour, clipped inside the part.
// This module has NO imports, so anything may import it first. character.mjs and stick.mjs import each other; the shared
// constants (DIM, POSES) live here so neither module can hit the other's temporal dead zone while the cycle loads.
export const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
export const shade = (c, k = 0.22) => mixHex(c, '#1a0f14', k);   // darker, slightly warm
export const light = (c, k = 0.22) => mixHex(c, '#ffffff', k);
export const tone = c => ({base: c, shade: shade(c), deep: shade(c, 0.4), light: light(c)});

export const SKIN = {   // stylised (the reference uses a saturated orange) through realistic
  orange: '#E8692F', peach: '#F2B48C', fair: '#F6CDB0', tan: '#D99360', brown: '#A8673B', deep: '#6E3F24', olive: '#C89A6A',
  porcelain: '#FBE0CF', rose: '#F0B7A0', sand: '#E9BE8E', golden: '#E3A56E', honey: '#C98552', caramel: '#B87444',
  chestnut: '#8E5432', espresso: '#5A3320', coral: '#F07A50',
};
export const HAIR = {brown: '#7A4A2A', blonde: '#F2B33D', black: '#24201F', ginger: '#D2602A', grey: '#B9B4AE', white: '#ECE8E2', pink: '#E86A9A', blue: '#3F6FD8',
  dark: '#3A2A22', chestnut: '#8A4B2A', auburn: '#A23E2A', honey: '#D9973E', platinum: '#F1E2B8', red: '#C8382E', purple: '#7B4FC0', teal: '#2B9A94',
  mint: '#7FD6B4', lilac: '#B89BE0'};
export const CLOTH = {
  green: '#5E8F3A', olive: '#6E7F3C', red: '#D8433A', coral: '#F06A5C', pink: '#F2829A', yellow: '#F5C33B', mustard: '#D9A23A',
  blue: '#3E6FB8', navy: '#2C3E66', denim: '#33507F', teal: '#2D8C8C', purple: '#7A56B8', grey: '#8C8C94', charcoal: '#3A3A40',
  white: '#F2F0EC', black: '#232327', brown: '#7A5232', tan: '#C49A6C',
  sky: '#6DB6E8', mint: '#7CCFA8', lime: '#9BCB3C', orange: '#F08A2E', rust: '#B5532E', burgundy: '#8E2F45', magenta: '#D2468C',
  lilac: '#B39DDB', lavender: '#9C8BD6', peach: '#F6A98A', cream: '#F3E6C8', khaki: '#B7A57A', forest: '#2F6B3E', royal: '#3557C8',
  plum: '#6B3A6E', sand: '#D8C29A', gold: '#F2C14E', silver: '#C9CDD3', slate: '#5B6676', rose: '#E58FA6', cyan: '#2BC4D8', hotpink: '#FF4FA3',
};

/**
 * Character palettes: coordinated skin / hair / outfit sets. A cast entry with `"palette": "<name>"` takes every colour it does
 * not set itself from the palette; `"palette": "auto"` picks one deterministically from the cast id, so a crowd doesn't clash.
 * `accent` colours the small things (bow, cap, hair tie, earrings) unless they set their own; `lips` is the lipstick colour.
 */
export const PALETTES = {
  sunny:  {skin: 'peach',     hair: 'blonde',   top: 'yellow',  detail: 'white',   bottom: 'denim',    shoes: 'white',    accent: 'coral',   lips: '#E0485A'},
  ocean:  {skin: 'tan',       hair: 'dark',     top: 'sky',     detail: 'navy',    bottom: 'navy',     shoes: 'white',    accent: 'teal',    lips: '#C9465E'},
  forest: {skin: 'olive',     hair: 'brown',    top: 'forest',  detail: 'cream',   bottom: 'khaki',    shoes: 'brown',    accent: 'mustard', lips: '#B8434F'},
  berry:  {skin: 'fair',      hair: 'auburn',   top: 'magenta', detail: 'pink',    bottom: 'plum',     shoes: 'charcoal', accent: 'hotpink', lips: '#C2185B'},
  mono:   {skin: 'porcelain', hair: 'black',    top: 'white',   detail: 'black',   bottom: 'black',    shoes: 'black',    accent: 'red',     lips: '#D03040'},
  pastel: {skin: 'rose',      hair: 'platinum', top: 'lilac',   detail: 'mint',    bottom: 'mint',     shoes: 'white',    accent: 'pink',    lips: '#E46A85'},
  autumn: {skin: 'golden',    hair: 'ginger',   top: 'rust',    detail: 'cream',   bottom: 'brown',    shoes: 'brown',    accent: 'mustard', lips: '#B5403A'},
  neon:   {skin: 'brown',     hair: 'black',    top: 'cyan',    detail: 'hotpink', bottom: 'charcoal', shoes: 'lime',     accent: 'hotpink', lips: '#FF3D7F'},
  royal:  {skin: 'chestnut',  hair: 'black',    top: 'royal',   detail: 'gold',    bottom: 'grey',     shoes: 'black',    accent: 'gold',    lips: '#B0304A'},
  coral:  {skin: 'caramel',   hair: 'dark',     top: 'coral',   detail: 'white',   bottom: 'teal',     shoes: 'white',    accent: 'yellow',  lips: '#D2384F'},
  earth:  {skin: 'espresso',  hair: 'black',    top: 'mustard', detail: 'brown',   bottom: 'olive',    shoes: 'tan',      accent: 'red',     lips: '#9E2F3A'},
  candy:  {skin: 'sand',      hair: 'pink',     top: 'pink',    detail: 'white',   bottom: 'sky',      shoes: 'white',    accent: 'purple',  lips: '#E0487A'},
};
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/** the palette object for a cast entry: a name, "auto" (deterministic by id), an inline object, or none */
export function pickPalette(p, id = '') {
  if (!p) return null;
  if (typeof p === 'object') return p;
  if (p === 'auto') { const k = Object.keys(PALETTES); return PALETTES[k[hash(id) % k.length]]; }
  return PALETTES[p] || null;
}

/**
 * Build presets: `"build": "woman"` or `{"preset": "girl", "height": 0.7}`. Fields: height (torso + legs), head, width
 * (shoulders + hips), limbs (limb length), thick (limb width), waist (torso taper, 1 = straight), shoulders, hips.
 */
export const BUILDS = {
  man:   {},
  woman: {height: 0.95, width: 0.86, thick: 0.86, waist: 0.8, shoulders: 0.92, hips: 1.06},
  slim:  {height: 0.95, width: 0.86, thick: 0.86, waist: 0.8, shoulders: 0.92, hips: 1.06},
  broad: {width: 1.14, thick: 1.1, waist: 1.04, shoulders: 1.06},
  tall:  {height: 1.1, width: 0.95},
  teen:  {height: 0.84, head: 0.98, width: 0.86, limbs: 0.94, thick: 0.9},
  kid:   {height: 0.66, head: 0.95, width: 0.78, limbs: 0.85},
  boy:   {height: 0.66, head: 0.95, width: 0.78, limbs: 0.85},
  girl:  {height: 0.64, head: 0.95, width: 0.74, limbs: 0.85, thick: 0.92, waist: 0.92, hips: 1.02},
  elder: {height: 0.96, width: 1.02, waist: 1.06},
};

export const ENV = {
  night: '#2A2B2E', nightGlow: '#3A3B3F', wall: '#E9E2D6', floor: '#B98E62', sky: '#8FCBEA', skyDeep: '#5A8FD0',
  seat: '#B83A35', grass: '#69A84F', street: '#55575E', building: '#5C6C8A',
};
export const TEXT = {white: '#FFFFFF', ink: '#1E1E22', yellow: '#FFD23F', red: '#E8442E'};
export const resolve = (v, table) => (v && table[v]) || v;   // "orange" or "#E8692F"

// ---------- the shared rig dimensions and pose library (read by both rigs; see docs/CHARACTERS.md) ----------
// Angles in degrees; 0 = hanging straight down; positive swings OUTWARD from the body's centre line; b adds to a, c adds to a+b.
export const DIM = {
  thigh: 156, shin: 152, legW: 50, foot: 84, footH: 40,
  torso: 250, shoulder: 66, hip: 40, topW: 178, botW: 150,
  upper: 130, fore: 124, armW: 40, hand: 27,
  neck: 30, neckW: 46, headW: 204, headH: 220,
};
export const POSES = {
  stand:  {body: {dy: 0, lean: 0}, armL: {a: 8, b: 4}, armR: {a: 8, b: 4}, legL: {a: 3, b: 0}, legR: {a: 3, b: 0}},
  relaxed:{body: {dy: 0, lean: 0}, armL: {a: 14, b: 12}, armR: {a: 10, b: 20}, legL: {a: 6, b: -2}, legR: {a: 2, b: 2}},
  wave:   {body: {dy: 0, lean: -2}, armL: {a: 10, b: 6}, armR: {a: 148, b: 22}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}},
  cheer:  {body: {dy: 0, lean: 0}, armL: {a: 150, b: 18}, armR: {a: 150, b: 18}, legL: {a: 9, b: -2}, legR: {a: 9, b: -2}},
  point:  {body: {dy: 0, lean: 3}, armL: {a: 10, b: 6}, armR: {a: 92, b: 4}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}},
  shrug:  {body: {dy: 0, lean: 0}, armL: {a: 40, b: -95}, armR: {a: 40, b: -95}, legL: {a: 4, b: 0}, legR: {a: 4, b: 0}},
  think:  {body: {dy: 0, lean: 0}, armL: {a: 18, b: -120}, armR: {a: 12, b: -150, z: 'front'}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {tilt: -6}},
  scared: {body: {dy: 6, lean: -4}, armL: {a: 42, b: -110}, armR: {a: 42, b: -110}, legL: {a: 12, b: -4}, legR: {a: 12, b: -4}},
  hold:   {body: {dy: 0, lean: 0}, armL: {a: 10, b: 6}, armR: {a: 20, b: -88}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}},
  phone:  {body: {dy: 0, lean: 2}, armL: {a: 14, b: -112}, armR: {a: 18, b: -100}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {tilt: 8}, face: {look: [0, 0.8]}},
  // seated (front view): pelvis drops, thighs foreshortened toward camera, shins hang
  sit:    {body: {dy: 150, lean: 0}, armL: {a: 22, b: -30}, armR: {a: 22, b: -30}, legL: {a: 38, b: -42, la: 0.55, lb: 0.78}, legR: {a: 38, b: -42, la: 0.55, lb: 0.78}},
  sitEat: {body: {dy: 150, lean: 0}, armL: {a: 34, b: -62}, armR: {a: 24, b: -148}, legL: {a: 56, b: -46, la: 0.55, lb: 0.8}, legR: {a: 56, b: -46, la: 0.55, lb: 0.8}},
  sitSprawl: {body: {dy: 150, lean: 0}, armL: {a: 62, b: -40}, armR: {a: 30, b: -136}, legL: {a: 66, b: -30, la: 0.62, lb: 0.86}, legR: {a: 68, b: -26, la: 0.62, lb: 0.86}},
  sitPhone: {body: {dy: 150, lean: 0}, armL: {a: 16, b: -105}, armR: {a: 22, b: -96}, legL: {a: 30, b: -34, la: 0.55, lb: 0.78}, legR: {a: -18, b: 62, la: 0.55, lb: 0.86}, head: {tilt: 8}, face: {look: [0, 0.8]}},
  sitScream: {body: {dy: 120, lean: -6}, armL: {a: 120, b: 30}, armR: {a: 120, b: 30}, legL: {a: 70, b: -10, la: 0.62, lb: 0.9}, legR: {a: 70, b: -10, la: 0.62, lb: 0.9}},
  // v3 additions (wider ranges: a negative a crosses the body, a above 150 goes over the head; c bends the wrist / ankle)
  handsHips:   {body: {dy: 0, lean: 0}, armL: {a: 46, b: -112, c: 20}, armR: {a: 46, b: -112, c: 20}, legL: {a: 7, b: 0}, legR: {a: 7, b: 0}},
  armsCrossed: {body: {dy: 0, lean: 0}, armL: {a: 16, b: -104, c: -14}, armR: {a: 22, b: -114, c: -14}, legL: {a: 5, b: 0}, legR: {a: 5, b: 0}, head: {tilt: -3}},
  reachUp:     {body: {dy: -8, lean: 0, bend: -3}, armL: {a: 12, b: 4}, armR: {a: 172, b: 4, c: 6}, legL: {a: 4, b: 0}, legR: {a: 2, b: 0, c: 14}, head: {tilt: -10}, face: {look: [0.2, -1]}},
  behindHead:  {body: {dy: 0, lean: 0}, armL: {a: 160, b: 112, z: 'back'}, armR: {a: 160, b: 112, z: 'back'}, legL: {a: 6, b: 0}, legR: {a: 6, b: 0}, head: {tilt: -4}},
  facepalm:    {body: {dy: 4, lean: 4, bend: 6}, armL: {a: 10, b: 4}, armR: {a: 112, b: -252, c: 24}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {tilt: 12, dy: 4}, face: {eyes: 'closed', mouth: 'flat', brows: 'sad'}},
  clap:        {body: {dy: 0, lean: 0}, armL: {a: 10, b: -120, c: 10}, armR: {a: 10, b: -120, c: 10}, legL: {a: 5, b: 0}, legR: {a: 5, b: 0}},
  pointUp:     {body: {dy: 0, lean: -2}, armL: {a: 10, b: 6}, armR: {a: 128, b: 30, c: 10}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, face: {look: [0.4, -0.8]}},
  stretch:     {body: {dy: -6, lean: 0}, armL: {a: 166, b: 10}, armR: {a: 166, b: 10}, legL: {a: 2, b: 0}, legR: {a: 2, b: 0}, face: {eyes: 'closed', mouth: 'O'}},
  bowDown:     {body: {dy: 14, lean: 0, bend: 34}, armL: {a: -6, b: 4}, armR: {a: 18, b: 6}, legL: {a: 2, b: 0}, legR: {a: 2, b: 0}, head: {tilt: 8}},
  dance:       {body: {dy: -4, lean: -6, bend: -8}, armL: {a: 132, b: 34}, armR: {a: 56, b: -70, c: 20}, legL: {a: 22, b: -6}, legR: {a: -6, b: 40, c: 10}, head: {tilt: -8}},
  kneel:       {body: {dy: 88, lean: 0}, armL: {a: 14, b: -20}, armR: {a: 30, b: -70}, legL: {a: 4, b: 0, la: 1.3, lb: 0.1, c: 70}, legR: {a: 30, b: -34, la: 0.5, lb: 1}},
  crouch:      {body: {dy: 120, lean: 6, bend: 10}, armL: {a: 30, b: -60}, armR: {a: 30, b: -60}, legL: {a: 52, b: -96}, legR: {a: 52, b: -96}},
  run:         {body: {dy: -10, lean: 10, bend: 4}, armL: {a: 40, b: -70, z: 'back'}, armR: {a: -30, b: -100}, legL: {a: -34, b: 96, c: 20}, legR: {a: 40, b: -30}},
  jump:        {body: {dy: -40, lean: 0}, armL: {a: 140, b: 30}, armR: {a: 140, b: 30}, legL: {a: 22, b: -40, c: 10}, legR: {a: 22, b: -40, c: 10}, face: {mouth: 'grin'}},
  sitFloor:    {body: {dy: 270, lean: 0}, armL: {a: 30, b: -20}, armR: {a: 30, b: -20}, legL: {a: 80, b: -20, la: 0.7, lb: 0.8}, legR: {a: 80, b: -20, la: 0.7, lb: 0.8}},
  sitCross:    {body: {dy: 150, lean: 0}, armL: {a: 22, b: -30}, armR: {a: 22, b: -30}, legL: {a: 38, b: -42, la: 0.55, lb: 0.78}, legR: {a: -30, b: 60, la: 0.55, lb: 0.7}},
  lie:         {body: {dy: 0, lean: 0}, armL: {a: 24, b: 0}, armR: {a: 24, b: 0}, legL: {a: 4, b: 0}, legR: {a: 4, b: 0}, face: {eyes: 'closed', mouth: 'flat'}},
  // ---- THE LAST BUS (docs/CHARACTERS.md "Story poses"). "Side" poses face +x (use facing −1 for the other way). ----
  sitSide:     {body: {dy: 150, lean: 0}, armL: {a: -16, b: -58}, armR: {a: 22, b: 52}, legL: {a: -82, b: 84, la: 0.9}, legR: {a: 86, b: -86, la: 0.92}, face: {turn: 0.7}},
  sit3q:       {body: {dy: 150, lean: 0}, armL: {a: 6, b: -62}, armR: {a: 26, b: -40}, legL: {a: -24, b: 30, la: 0.62, lb: 0.9}, legR: {a: 58, b: -62, la: 0.74, lb: 0.95}, face: {turn: 0.4}},
  sitSleep:    {body: {dy: 156, lean: 3, bend: 4}, armL: {a: -10, b: -50}, armR: {a: 18, b: 40}, legL: {a: -78, b: 80, la: 0.9}, legR: {a: 82, b: -82, la: 0.92}, head: {tilt: 17, dy: 6}, face: {turn: 0.5, eyes: 'closed', mouth: 'part', brows: 'flat'}},
  grabFront:   {body: {dy: 146, lean: 2, bend: 8}, armL: {a: -62, b: -20, c: 10}, armR: {a: 66, b: 6, c: 10}, legL: {a: -80, b: 82, la: 0.9}, legR: {a: 84, b: -84, la: 0.92}, face: {turn: 0.75, eyes: 'wide', brows: 'up'}},
  pressGlass:  {body: {dy: 0, lean: 0, bend: 3}, armL: {a: 118, b: 58, c: 4}, armR: {a: 118, b: 58, c: 4}, legL: {a: 4, b: 0}, legR: {a: 4, b: 0}, head: {dy: 4}, face: {eyes: 'wide', brows: 'fear', mouth: 'part'}},
  holdBar:     {body: {dy: 0, lean: 0}, armL: {a: 10, b: 6}, armR: {a: 166, b: 10, c: -8}, legL: {a: 7, b: 0}, legR: {a: 7, b: 0}},
  holdChest:   {body: {dy: 0, lean: 0}, armL: {a: 20, b: -112, c: 6}, armR: {a: 20, b: -112, c: 6}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}},
  sitHoldLap:  {body: {dy: 150, lean: 0}, armL: {a: 14, b: -82, c: 6}, armR: {a: 14, b: -82, c: 6}, legL: {a: 34, b: -38, la: 0.55, lb: 0.78}, legR: {a: 34, b: -38, la: 0.55, lb: 0.78}},
  stoopPlace:  {body: {dy: 104, lean: 2, bend: 12}, armL: {a: 16, b: -28}, armR: {a: 22, b: -26, c: 10}, legL: {a: 30, b: -58, la: 0.62}, legR: {a: 36, b: -62, la: 0.62}, head: {dy: 6}, face: {turn: 0.5, look: [0.3, 0.9], eyes: 'down'}},
  stoopSide:   {body: {dy: 34, lean: 2, bend: 36}, armL: {a: 6, b: -6}, armR: {a: 22, b: -10, c: 8}, legL: {a: 10, b: -14, la: 0.8}, legR: {a: 14, b: -18, la: 0.8}, head: {tilt: 6}, face: {turn: 0.7, look: [0.6, 0.9]}},
  stopHand:    {body: {dy: 0, lean: -2}, armL: {a: 10, b: 4}, armR: {a: 76, b: -6, c: -64}, legL: {a: 4, b: 0}, legR: {a: 5, b: 0}},
  backAway:    {body: {dy: 4, lean: -5, bend: -3}, armL: {a: 30, b: -66, c: -10}, armR: {a: 32, b: -72, c: -10}, legL: {a: 6, b: 0}, legR: {a: 6, b: 0}, face: {eyes: 'wide', brows: 'fear'}},
  phoneEar:    {body: {dy: 0, lean: 0}, armL: {a: 10, b: 6}, armR: {a: 70, b: 140, c: 10, la: 0.8}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {tilt: 7}, face: {look: [-0.4, 0.2]}},
  sitPhoneEar: {body: {dy: 150, lean: 0}, armL: {a: 22, b: -30}, armR: {a: 70, b: 140, c: 10, la: 0.8}, legL: {a: 38, b: -42, la: 0.55, lb: 0.78}, legR: {a: 38, b: -42, la: 0.55, lb: 0.78}, head: {tilt: 7}, face: {look: [-0.4, 0.2]}},
  phoneClose:  {body: {dy: 0, lean: 0, bend: 3}, armL: {a: 12, b: -96}, armR: {a: 14, b: 174, c: -10, la: 0.55}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {dy: 6}, face: {look: [0.1, 0.8], eyes: 'down'}},
  phoneChest:  {body: {dy: 0, lean: 0, bend: 4}, armL: {a: 14, b: -128, c: 12}, armR: {a: 18, b: -122, c: 8}, legL: {a: 4, b: 0}, legR: {a: 3, b: 0}, head: {dy: 8, tilt: -4}, face: {eyes: 'closed', brows: 'grief', mouth: 'tight'}},
  sitPhoneChest: {body: {dy: 150, lean: 0, bend: 4}, armL: {a: 14, b: -128, c: 12}, armR: {a: 18, b: -122, c: 8}, legL: {a: 38, b: -42, la: 0.55, lb: 0.78}, legR: {a: 38, b: -42, la: 0.55, lb: 0.78}, head: {dy: 8, tilt: -4}, face: {eyes: 'closed', brows: 'grief', mouth: 'tight'}},
  lookHands:   {body: {dy: 0, lean: 0, bend: 5}, armL: {a: 18, b: -98, c: -30}, armR: {a: 18, b: -98, c: -30}, legL: {a: 4, b: 0}, legR: {a: 4, b: 0}, head: {dy: 8}, face: {eyes: 'down', look: [0, 1], brows: 'worried', mouth: 'part'}},
  standCry:    {body: {dy: 0, lean: 0, bend: 7}, armL: {a: 6, b: -18}, armR: {a: 6, b: -14}, legL: {a: 3, b: 0}, legR: {a: 3, b: 0}, head: {dy: 9}, face: {eyes: 'cry', brows: 'grief', mouth: 'quiver'}},
  slamWall:    {body: {dy: 0, lean: 4, bend: 4}, armL: {a: 12, b: 6}, armR: {a: 88, b: -4, c: -70}, legL: {a: 6, b: 0}, legR: {a: 8, b: 0}},
  driveSeat:   {body: {dy: 150, lean: 0}, armL: {a: 34, b: -46, c: 6}, armR: {a: 34, b: -46, c: 6}, legL: {a: 30, b: -36, la: 0.55, lb: 0.78}, legR: {a: 30, b: -36, la: 0.55, lb: 0.78}},
  turnSeat:    {body: {dy: 150, lean: 0, bend: -4}, armL: {a: 30, b: -44}, armR: {a: 52, b: -28, c: 8}, legL: {a: 30, b: -36, la: 0.55, lb: 0.78}, legR: {a: 30, b: -36, la: 0.55, lb: 0.78}},
  stillSit:    {body: {dy: 150, lean: 0}, armL: {a: 12, b: -62}, armR: {a: 12, b: -62}, legL: {a: 30, b: -34, la: 0.55, lb: 0.78}, legR: {a: 30, b: -34, la: 0.55, lb: 0.78}},
};
