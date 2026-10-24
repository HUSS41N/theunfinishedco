// Turn phrases.json (real Kokoro phrase timings) into the Autopilot B1 manifest.
import fs from 'node:fs';
const ph = JSON.parse(fs.readFileSync('phrases.json', 'utf8'));
const LEAD = 0.3, TAIL = 0.8, END = +(LEAD + ph.at(-1).end + TAIL).toFixed(3);
const at = i => +(LEAD + ph[i].start).toFixed(3), cut = i => +(at(i) - 0.12).toFixed(3);
const ART = {x: 90, y: 500, w: 1100};
const art = (name, o = {}) => ({type: 'image', path: `art/${name}.png`, ...ART, ...o});
const T = (s, o = {}) => ({type: 'text', text: s, x: 90, y: 190, w: 1100, size: 104, bold: true, ...o});
const L2 = (s, o = {}) => T(s, {y: 320, ...o});
// cycle frames every `step` seconds over [0, dur)
const cycle = (names, dur, step) => { const out = []; for (let t = 0, i = 0; t < dur; t += step, i++) out.push(art(names[i % names.length], {from: +t.toFixed(3), to: +Math.min(dur, t + step).toFixed(3)})); return out; };
const X = (s) => [
  {type: 'line', x: 0, y: 0, points: [[260, 780], [1020, 1640]], color: '#EC4338', lineWidth: 18, keys: [{t: s, progress: 0}, {t: s + 0.25, progress: 1}]},
  {type: 'line', x: 0, y: 0, points: [[1020, 780], [260, 1640]], color: '#EC4338', lineWidth: 18, keys: [{t: s + 0.25, progress: 0}, {t: s + 0.5, progress: 1}]}];
const shots = [], sfx = [];
const shot = (a, b, layers) => shots.push({start: a, end: b, layers});
const rel = (i, s) => +(at(i) - s).toFixed(3);

// A: the task you keep putting off — the note slides in and looms
let s = 0, e = cut(1);
shot(s, e, [art('s1a', {to: rel(0, s) + 0.85}), art('s1b', {from: rel(0, s) + 0.85}),
  {type: 'image', path: 'art/note.png', x: 110, y: 580, w: 300, keys: [{t: 0.2, x: -320, alpha: 0, angle: -0.2}, {t: 0.65, x: 110, alpha: 1, angle: -0.05}, {t: 1.3, w: 470, y: 520}]},
  T('THAT ONE TASK…')]);
sfx.push({time: 0.55, kind: 'paper', gain: 0.03});
// B: it's not too big — the note shrinks, the character is surprised
s = e; e = cut(2);
shot(s, e, [art('s2a'), {type: 'image', path: 'art/note.png', x: 110, y: 520, w: 470, keys: [{t: 0.15, w: 470, y: 520, x: 110}, {t: 0.7, w: 170, y: 940, x: 260}]}, T('NOT TOO BIG.')]);
sfx.push({time: s + 0.6, kind: 'pop', gain: 0.03});
// C: starting is hard — straining against the START boulder
s = e; e = cut(3);
shot(s, e, [...cycle(['s2b1', 's2b2'], e - s, 0.3), T('STARTING'), L2('IS HARD.', {color: '#EC4338'})]);
sfx.push({time: s + 0.2, kind: 'tap', gain: 0.03});
// D: the two-minute rule — ticking stopwatch
s = e; e = cut(4);
shot(s, e, [...cycle(['s3a', 's3b', 's3c', 's3d'], e - s, 0.4), T('THE 2-MINUTE'), L2('RULE.', {color: '#EC4338'}),
  {type: 'underline', x: 90, y: 450, w: 330, color: '#F6C945', lineWidth: 12, keys: [{t: 0.3, progress: 0}, {t: 0.8, progress: 1}]}]);
sfx.push({time: s + 0.25, kind: 'chime', gain: 0.03});
// E: under two minutes? do it now — toss the scrap into the bin
s = e; e = cut(6); { const now = rel(5, s), th = 0.95;
shot(s, e, [art('s4a', {to: th}), art('s4b', {from: th, to: now - 0.05}), art('s4c', {from: now - 0.05}),
  {type: 'image', path: 'art/ball.png', x: 640, y: 1150, w: 80, from: th, keys: [{t: th, x: 640, y: 1150}, {t: th + 0.35, x: 820, y: 960}, {t: th + 0.75, x: 935, y: 1530}], to: th + 0.8},
  T('UNDER 2 MIN?', {to: now - 0.1}), T('DO IT NOW.', {from: now - 0.1, color: '#3FA466'}),
  {type: 'line', x: 820, y: 230, points: [[0, 40], [35, 80], [110, -20]], color: '#3FA466', lineWidth: 14, from: now, keys: [{t: now, progress: 0}, {t: now + 0.35, progress: 1}]}]);
sfx.push({time: s + th, kind: 'paper', gain: 0.025}, {time: s + th + 0.75, kind: 'tap', gain: 0.035}, {time: s + now + 0.1, kind: 'pop', gain: 0.03}); }
// F: bigger? just the first two minutes — staircase, first step highlighted
s = e; e = cut(8); { const st = rel(7, s);
shot(s, e, [art('s5a', {to: st}), art('s5b', {from: st, to: st + 0.75}), art('s5c', {from: st + 0.75}),
  T('BIGGER?', {to: st - 0.1}), T('JUST THE', {from: st - 0.1}), L2('FIRST 2 MIN.', {from: st - 0.1, color: '#EC4338'})]);
sfx.push({time: s + st + 0.75, kind: 'tap', gain: 0.03}); }
// G–L: three "not this / just this" pairs
const pair = (i, big, small, bigText, smallText, alt, step, sound) => {
  let a = cut(i), b = cut(i + 1);
  shot(a, b, [art(big), ...X(0.35), T(bigText)]); sfx.push({time: a + 0.4, kind: 'tap', gain: 0.03});
  a = b; b = cut(i + 2);
  shot(a, b, [...cycle(alt, b - a, step), T(smallText, {color: '#3FA466'})]); sfx.push({time: a + 0.3, kind: sound, gain: 0.025});
};
pair(8, 's6a', null, 'NOT THE BOOK.', 'ONE PAGE.', ['s6b', 's6c'], 0.5, 'paper');
pair(10, 's7a', null, 'NOT THE RUN.', 'JUST THE SHOES.', ['s7b', 's7c'], 0.35, 'tap');
pair(12, 's8a', null, 'NOT THE KITCHEN.', 'ONE PLATE.', ['s8b', 's8c'], 0.3, 'pop');
// M: once you start, you keep going — running
s = cut(14); e = cut(16); { const k = rel(15, s);
shot(s, e, [...cycle(['s9a', 's9b'], e - s, 0.16), T('ONCE YOU START…', {to: k - 0.1}), T('YOU KEEP', {from: k - 0.1}), L2('GOING.', {from: k - 0.1, color: '#EC4338'})]);
for (const t of [0.2, 0.52, 0.84]) sfx.push({time: s + t, kind: 'tap', gain: 0.02}); }
// N: two minutes. start now.
s = e; e = END; { const k = rel(17, s);
shot(s, e, [art('s10a', {to: k}), art('s10b', {from: k}), T('2 MINUTES.'), L2('START NOW.', {from: k - 0.05, color: '#EC4338'}),
  {type: 'underline', x: 90, y: 450, w: 560, color: '#EC4338', lineWidth: 12, from: k, keys: [{t: k, progress: 0}, {t: k + 0.45, progress: 1}]}]);
sfx.push({time: s + k + 0.05, kind: 'chime', gain: 0.03}); }

for (const sh of shots) { const span = +(sh.end - sh.start).toFixed(3); for (const l of sh.layers) { if (l.to !== undefined) l.to = Math.min(+l.to.toFixed(3), span); if (l.to === span) delete l.to; } }
const project = {version: 1, style: 'B1', width: 1080, height: 1920, fps: 30,
  font: '/System/Library/Fonts/Supplemental/ChalkboardSE.ttc', captionSize: 48,
  voice: {path: 'narration.wav', lead: LEAD, tail: TAIL},
  captions: ph.map(p => ({start: +(LEAD + p.start).toFixed(3), end: +(LEAD + p.end + 0.08).toFixed(3), text: p.text})),
  shots, sfx: sfx.map(x => ({...x, time: +x.time.toFixed(3)}))};
fs.writeFileSync('project.json', JSON.stringify(project, null, 1));
console.log(shots.length, 'shots,', END, 's');
