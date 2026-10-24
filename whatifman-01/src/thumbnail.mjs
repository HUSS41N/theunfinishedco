// Thumbnail: terrified WhatIfMan, the phone, the countdown. Writes 1080x1920 (Shorts cover) and 1280x720 (feed/IG grid crop).
import fs from 'node:fs';
import {createCanvas, GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
import * as D from './draw.mjs';
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', 'Chalk');
GlobalFonts.registerFromPath('/Users/hussain/.claude/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'UI');
function scene(ctx, w, h, portrait) {
  const g = ctx.createRadialGradient(w * .5, h * .45, 50, w * .5, h * .5, Math.max(w, h) * .75); g.addColorStop(0, '#5B5F66'); g.addColorStop(1, '#16171A'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const phone = (x, y, s, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.beginPath(); ctx.roundRect(-160, -300, 320, 600, 44); ctx.fillStyle = '#111'; ctx.fill(); ctx.beginPath(); ctx.roundRect(-146, -286, 292, 572, 36); ctx.fillStyle = '#1E2433'; ctx.fill();
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 380); glow.addColorStop(0, 'rgba(236,67,56,.45)'); glow.addColorStop(1, 'rgba(236,67,56,0)'); ctx.fillStyle = glow; ctx.fillRect(-400, -400, 800, 800);
    ctx.font = '900 150px UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FF4B40'; ctx.fillText('0:03', 0, 10);
    ctx.font = '700 22px UI'; ctx.fillStyle = '#C9C9C9'; ctx.fillText('TIME REMAINING', 0, 100); ctx.restore(); };
  const face = (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); D.setLW(2.6 / s);
    D.line(ctx, [[0, D.R], [-4, D.R + 400]], {w: 6}); D.head(ctx, [0, 0], -0.08, {gx: 0.6, gy: 0.2, mouth: 'shout', brows: 'worried', eyes: 'wide', sweat: 1}); D.setLW(1); ctx.restore(); };
  const title = (lines, x, y, size) => { ctx.font = `700 ${size}px Chalk`; ctx.textBaseline = 'top';
    lines.forEach(([s, c], i) => { ctx.lineWidth = size * .16; ctx.strokeStyle = '#000'; ctx.strokeText(s, x, y + i * size * 1.08); ctx.fillStyle = c; ctx.fillText(s, x, y + i * size * 1.08); }); };
  D.reseed(5);
  if (portrait) { face(400, 1150, 5.2); phone(800, 1180, 1.05, 0.12); title([['YOUR PHONE', '#FFFFFF'], ['PREDICTS', '#FFFFFF'], ['YOUR DEATH', '#FF4B40']], 70, 260, 120); }
  else { face(330, 470, 3.6); phone(1090, 430, .85, 0.1); title([['IT KNOWS', '#FFFFFF'], ['WHEN.', '#FF4B40']], 520, 60, 104); }
}
for (const [w, h, name] of [[1080, 1920, 'thumbnail-9x16.png'], [1280, 720, 'thumbnail-16x9.png']]) {
  const c = createCanvas(w, h), ctx = c.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; scene(ctx, w, h, h > w); fs.writeFileSync(name, c.toBuffer('image/png'));
}
