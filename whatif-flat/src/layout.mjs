// Screen layout rules for 1080×1920 Shorts / Reels / TikTok: the safe rect, the rail notch, bands, minimum type sizes,
// reading time and gaps. Owner: text. Browser-safe (no Node imports).
// Every number comes from ../../RESEARCH-safe-zones-text.md ("Engine rules"); docs/TEXT.md lists them with sources.
export const FRAME = {w: 1080, h: 1920, fps: 24};

/** combined safe rect for YouTube Shorts + Instagram Reels + TikTok: x 120–888, y 288–1248 (G3/G4, M1, T2) */
export const SAFE = {x: 120, y: 288, w: 768, h: 960};
/** TikTok's button rail: any text box whose bottom passes y 840 must end by x 780 (T2). meta.platformSafe:false relaxes it */
export const RAIL_NOTCH = {x: 780, y: 840};
export const SAFE_LOW = {x: 120, y: 840, w: 660, h: 408};
/** horizontal centre of SAFE: centre text here (a box centred on 540 must stay within x 192–888) */
export const CENTER_X = 504;

/** named bands inside SAFE (y ranges) */
export const BANDS = {
  hook:    {y: 288,  h: 352},   // 288..640   titles, the hook, "YOU VS…" headers (full 768 px width, clear of the notch)
  stage:   {y: 640,  h: 360},   // 640..1000  characters; bubbles beside heads
  caption: {y: 1000, h: 248},   // 1000..1248 lower captions (the lowest text the platforms leave visible)
};
/** below y 1248 is platform UI on every app: art only, never text */
export const TEXT_FLOOR_Y = SAFE.y + SAFE.h;

/** minimum font px per role (research "Sizes"): headline/hook 84, body & bubbles 52, labels 36 */
export const MIN_TEXT_PX = {headline: 84, body: 52, bubble: 52, label: 36};
/** target sizes (for defaults) */
export const TARGET_TEXT_PX = {headline: 108, body: 64, bubble: 60, label: 44};
/** most lines per block (BBC 9:16) and per bubble; ~characters per line = width / (0.58 × px) */
export const MAX_LINES = {block: 3, bubble: 2};

/** reading-time constants (BBC 160 wpm, Netflix 17 cps / 7 s max / gap rules) */
export const READ = {floor: 1.2, perWord: 0.375, cps: 17, newVisual: 0.5, bigNumber: 0.5, max: 7,
  frame: 1 / 24, swapGap: 2 / 24, minGap: 0.5, pause: 1.0, maxEntry: 7 / 24, hookBy: 6 / 24, hookRead: 2.5, hookWords: 6};

const clean = s => String(s ?? '').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim();
export const countWords = s => clean(s).split(' ').filter(w => /[\p{L}\p{N}]/u.test(w)).length;
/**
 * seconds a text must stay READABLE (≥ 90% opaque, within 2% of final scale):
 * min(7, max(1.2, 0.375 × words, chars / 17) + 0.5 with a new visual event + 0.5 for a 3+ digit number)
 */
export function readingTime(text, {newVisual = false} = {}) {
  const s = clean(text);
  let r = Math.max(READ.floor, READ.perWord * countWords(s), s.length / READ.cps);
  if (newVisual) r += READ.newVisual;
  if (/\d[\d,.]{2,}/.test(s) && s.replace(/[^\d]/g, '').length >= 3) r += READ.bigNumber;
  return Math.min(READ.max, r);
}

/** which band a y (screen px) falls in: 'top-ui' | 'hook' | 'stage' | 'caption' | 'bottom-ui' */
export function regionOf(y) {
  if (y < SAFE.y) return 'top-ui';
  if (y >= TEXT_FLOOR_Y) return 'bottom-ui';
  for (const [k, b] of Object.entries(BANDS)) if (y >= b.y && y < b.y + b.h) return k;
  return 'stage';
}

/**
 * Clamp a box {x, y, w, h} (top-left + size, screen px) inside SAFE, honouring the rail notch unless notch === false.
 * Returns {x, y, w, h, dx, dy, fits}. A box too big for the rect is centred on that axis and fits = false.
 */
export function fitInSafe(box, {safe = SAFE, notch = true} = {}) {
  const ax = (p, s, lo, len) => (s > len ? lo + (len - s) / 2 : Math.min(lo + len - s, Math.max(lo, p)));
  let x = ax(box.x, box.w, safe.x, safe.w), y = ax(box.y, box.h, safe.y, safe.h);
  if (notch && y + box.h > RAIL_NOTCH.y && x + box.w > RAIL_NOTCH.x) {
    if (box.w <= RAIL_NOTCH.x - safe.x) x = Math.max(safe.x, RAIL_NOTCH.x - box.w);   // slide left out of the rail
    else y = Math.max(safe.y, RAIL_NOTCH.y - box.h);                                   // too wide: lift above y 840
  }
  const fits = box.w <= safe.w && box.h <= safe.h && !(notch && y + box.h > RAIL_NOTCH.y && x + box.w > RAIL_NOTCH.x);
  return {...box, x, y, dx: x - box.x, dy: y - box.y, fits};
}
/** true when the box breaks a safe-zone rule (outside SAFE or in the notch) */
export function outsideSafe(b, {notch = true} = {}) {
  return b.x < SAFE.x - 0.5 || b.y < SAFE.y - 0.5 || b.x + b.w > SAFE.x + SAFE.w + 0.5 || b.y + b.h > TEXT_FLOOR_Y + 0.5 ||
    (notch && b.y + b.h > RAIL_NOTCH.y && b.x + b.w > RAIL_NOTCH.x + 0.5);
}

/** overlap area of two boxes {x, y, w, h} */
export function overlap(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
