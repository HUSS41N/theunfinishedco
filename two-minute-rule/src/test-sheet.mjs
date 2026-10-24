import {sheet, figure, pose, reseed} from './draw.mjs';
import {GlobalFonts} from '/Users/hussain/.claude/skills/directing-stickman-videos/node_modules/@napi-rs/canvas/index.js';
console.log('chalk', GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', 'Chalk'));
const {ctx, save} = sheet(1800, 700); ctx.fillStyle = '#FDFDFC'; ctx.fillRect(0, 0, 1800, 700);
const faces = [{mouth: 'grin', brows: 'up', gx: .4, lines: 1}, {mouth: 'strain', brows: 'angry', eyes: 'squint', sweat: 1, gx: .6}, {mouth: 'O', brows: 'up', eyes: 'wide'}, {mouth: 'wavy', brows: 'worried', gx: -.5, sweat: 1}, {mouth: 'smile', brows: 'flat', gx: .3}, {mouth: 'shout', brows: 'worried', eyes: 'wide'}];
faces.forEach((f, i) => { reseed(10 + i); const x = 150 + i * 290;
  figure(ctx, pose({hip: [x, 430], lean: [0, .3, -.05, -.1, .05, 0][i], lh: [x - 80, 330], rh: [x + 90, 240 - i * 10], lf: [x - 55, 650], rf: [x + 60, 650], elbow: [1, -1]}), f); });
save('/private/tmp/claude-501/-Users-hussain-dev-echo-bench/270fbf9b-0ae1-4787-8625-551bab31b069/scratchpad/test-sheet.png');
