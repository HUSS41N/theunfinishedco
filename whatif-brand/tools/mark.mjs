// The What If mark: a question mark whose dot is the stickman's head. Shapes only (no text) so it renders anywhere.
export const HOOK = 'M58 64 C58 32 84 18 104 18 C130 18 148 36 148 60 C148 84 128 92 114 100 C105 105 100 112 100 124';
export function markSVG({ink = '#111111', hook = '#E5322D', head = '#FFFFFF', size = 200} = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
<path d="${HOOK}" fill="none" stroke="${hook}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="100" cy="158" r="26" fill="${head}" stroke="${ink}" stroke-width="6"/>
<ellipse cx="91" cy="155" rx="3.6" ry="5.4" fill="${ink}"/><ellipse cx="109" cy="155" rx="3.6" ry="5.4" fill="${ink}"/>
<path d="M92 168 Q100 173 108 168" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;
}
// draw the same mark on a canvas at (x, y) with box size s
export function drawMark(ctx, x, y, s, {ink = '#111111', hook = '#E5322D', head = '#FFFFFF'} = {}, Path2D) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 200, s / 200); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hook; ctx.lineWidth = 15; ctx.stroke(new Path2D(HOOK));
  ctx.beginPath(); ctx.arc(100, 158, 26, 0, Math.PI * 2); ctx.fillStyle = head; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = ink; for (const ex of [91, 109]) { ctx.beginPath(); ctx.ellipse(ex, 155, 3.6, 5.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(92, 168); ctx.quadraticCurveTo(100, 173, 108, 168); ctx.lineWidth = 3.4; ctx.stroke();
  ctx.restore();
}
