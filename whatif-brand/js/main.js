// What If v1 page: the brand (logo, tokens, type, web components, archives) plus the shared engine asset system
// (js/engine-ui.js) in the stick style. The v1 look is now a style of the whatif-flat engine; the canvas kit is retired.
import T from './tokens.js';
import {mountEngineUI, copy, $} from './engine-ui.js';

const lum = hex => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return 1; const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = hex => (1.05) / (lum(hex) + 0.05);
const textClass = r => r >= 4.5 ? 'Text' : r >= 3 ? '24px+' : 'Fill';


await document.fonts.ready;

// ---------- colour ----------
function swatch(name, cssVar, value, usage, extra = '') {
  const r = contrast(value), b = document.createElement('button'); b.className = 'swatch'; b.type = 'button';
  b.innerHTML = `<span class="swatch__chip" style="background:${value}">${/^#/.test(value) ? `<span class="badge">${textClass(r)} · ${r.toFixed(2)}</span>` : ''}</span>
    <span class="swatch__body"><span class="swatch__name">${name}</span><span class="swatch__val">${value}</span><span class="swatch__use">${usage}</span>${extra}</span>`;
  b.addEventListener('click', () => copy(`var(${cssVar})`)); return b;
}
for (const [k, v] of Object.entries(T.color)) $('#swatches-base').append(swatch(k, `--wi-${k}`, v.value, v.usage));
for (const [k, v] of Object.entries(T.accent)) $('#swatches-accent').append(swatch(k, `--wi-accent-${k}`, v.value, v.usage, v.episodes.length ? `<span class="episode-dots">${v.episodes.map(e => `<span>#${e}</span>`).join('')}</span>` : ''));

// ---------- type ----------
const fam = {display: 'var(--wi-font-display)', ui: 'var(--wi-font-ui)', text: 'var(--wi-font-text)', hand: 'var(--wi-font-hand)', accent: 'var(--wi-font-accent)', mono: 'var(--wi-font-mono)'};
const weights = {display: 600, ui: 600, text: 400, hand: 400, accent: 400, mono: 600};
const samples = {premise: 'What if every lie <em style="font-family:var(--wi-font-accent);font-weight:400;color:#B5462E">built a wall?</em>', cover: '14 <em style="font-family:var(--wi-font-accent);font-weight:400;color:#B5462E">bricks.</em>', label: 'DAY 365', countdown: '8:59:59', bubble: 'ARE YOU OKAY?', phone: 'Don’t open the door.', tag: '96%', caption: 'Tomorrow, 9:14 PM', hand: 'Are we happy?',
  'web-display': 'theunfinishedco', 'web-title': 'Series 1 · ten silent episodes', 'web-body': 'One stickman. One strange possibility. Every frame drawn in code.', 'web-meta': 'BRAND & VIDEO SYSTEM'};
for (const [k, s] of Object.entries(T.type).filter(([k]) => k.startsWith('web-'))) {
  const web = k.startsWith('web-'), px = web ? s.size : Math.min(72, Math.round(s.size * 0.42));
  const row = document.createElement('div'); row.className = 'type-row';
  row.innerHTML = `<div class="type-row__meta"><b>${k}</b>${web ? `${s.size}px` : `${s.size} units ≈ ${Math.round(s.size * 0.84)}px at 1080`} · ${s.font}<br>${s.usage}</div>
    <div class="type-row__sample" style="font-family:${fam[s.font]};font-weight:${weights[s.font]};font-size:${px}px;line-height:${s.line};${k === 'web-meta' || s.font === 'mono' ? 'letter-spacing:.1em;' : 'letter-spacing:-0.03em;'}${k === 'countdown' ? `color:${ACC.red};` : ''}${k === 'tag' ? `color:${ACC.blue};` : ''}">${samples[k]}</div>`;
  $('#type-list').append(row);
}

// video text roles: what the engine actually draws (whatif-flat/src/text.mjs + layout.mjs), at 1080 × 1920
for (const [k, fam, w, px, min, sample, extra] of [
  ['headline', "'Inter Display'", 900, 108, 84, 'WHAT IF <span style="color:#E8442E">TIME</span> RAN LATE?', 'letter-spacing:-0.02em;'],
  ['body / bubble', "'Inter'", 600, 64, 52, 'You\u2019re late. Again.', 'letter-spacing:-0.03em;'],
  ['label', "'JetBrains Mono'", 600, 44, 36, 'DAY 365 · 8:00 AM', 'letter-spacing:0.06em;'],
  ['accent', "'Instrument Serif'", 400, 108, 84, 'one strange possibility', 'font-style:italic;'],
]) {
  const row = document.createElement('div'); row.className = 'type-row';
  row.innerHTML = `<div class="type-row__meta"><b>video · ${k}</b>${px} px at 1080 (min ${min}) · ${fam.replace(/'/g, '')} ${w}<br>engine role, drawn by text.mjs</div>
    <div class="type-row__sample" style="font-family:${fam};font-weight:${w};font-size:${Math.round(px * 0.5)}px;line-height:1.1;${extra}">${sample}</div>`;
  $('#type-list').append(row);
}

// ---------- Series 1 (archive: rendered by the retired canvas kit) ----------
const EPISODES = [
  ['01', 'What If Your Shadow Stopped Copying You?', 36, 'red', '01-shadow'], ['02', 'What If Every Lie Built a Wall?', 35, 'brick', '02-lie-bricks'],
  ['03', 'He Paused Time. He Aged 50 Years.', 38, 'yellow', '03-pause-time'], ['04', 'Everyone Has a Number. His Is 4%.', 36, 'blue', '04-like-meter'],
  ['05', '365 Days. One Loop.', 36, 'pink', '05-flower-steps'], ['06', '“I Love You” Costs $1,280', 37, 'green', '06-word-price'],
  ['07', 'What If Your Thoughts Were Public?', 34, 'blue', '07-public-thoughts'], ['08', 'What If Gravity Took a 10-Second Break?', 33.4, 'red', '08-gravity-break'],
  ['09', 'What If You Met Yourself at Age 8?', 38, 'red', '09-age-eight'], ['10', 'What If You Got a Text From Yourself?', 34, 'blue', '10-future-text'],
];
for (const [n, title, dur, accent, slug] of EPISODES) {
  const e = document.createElement('wi-episode-card');
  Object.entries({number: n, title, duration: dur, accent, cover: `assets/covers/cover-${slug}.png`, src: `media/${slug}.mp4`}).forEach(([k, v]) => e.setAttribute(k, v));
  $('#episodes-grid').append(e);
}

// ---------- banners ----------
$('#toggle-safe').addEventListener('change', e => { $('#banner-safe').hidden = !e.target.checked; });


// ---------- the engine asset system, stick style (also wires the episode player) ----------
await mountEngineUI({
  style: 'stick',
  hero: 'scenes/stick-hero.json',
  layersAt: 4,
  model: {build: 'woman', hair: {style: 'bob'}, top: {style: 'stripes', color: 'teal', detail: 'white'}, bottom: {style: 'skirt', color: 'mustard'}, shoes: {color: 'coral'}, face: {blush: true}},
  walker: {top: {style: 'hoodie', color: 'coral'}, bottom: {style: 'jeans', color: 'denim'}, shoes: {color: 'white'}, accessories: [{type: 'cap', color: 'teal'}]},
});
