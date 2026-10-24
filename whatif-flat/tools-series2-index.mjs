// Builds series2/index.json (the brand site's Series 2 galleries: v1 page = stick, v2 page = flat) from what is on disk.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT = path.dirname(new URL(import.meta.url).pathname), S2 = path.join(ROOT, 'series2');
const META = {
  '01-shadow': ['What If Your Shadow Got Tired of You?', 'red'], '02-lie-bricks': ['What If Every Lie Added a Brick?', 'brick'],
  '03-pause-time': ['He Paused Time. He Aged 50 Years.', 'yellow'], '04-like-meter': ['Everyone Has a Number. His Is 4%.', 'blue'],
  '05-flower-steps': ['365 Days. One Loop.', 'pink'], '06-word-price': ['"I Love You" Costs $1,280', 'green'],
  '07-public-thoughts': ['What If Your Thoughts Were Public?', 'blue'], '08-gravity-break': ['What If Gravity Took a 10-Second Break?', 'red'],
  '09-age-eight': ['What If You Met Yourself at Age 8?', 'red'], '10-future-text': ['What If You Got a Text From Yourself?', 'blue'],
};
// Each episode can exist in two styles: flat (v2: NN-slug.mp4 + cover.png) and stick (v1: NN-slug-stick.mp4 + cover-stick.png).
// A variant is listed only when both its mp4 and its cover exist; an episode is listed when at least one variant exists.
// Episodes re-render in parallel, so this is safe to re-run any time: it only reports what is on disk now.
const probe = mp4 => { try { return +(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim()).toFixed(1); } catch { return null; } };
const VARIANTS = {flat: slug => [`${slug}.mp4`, 'cover.png'], stick: slug => [`${slug}-stick.mp4`, 'cover-stick.png']};
const out = [];
for (const slug of Object.keys(META)) {
  const e = {number: slug.slice(0, 2), slug, title: META[slug][0], accent: META[slug][1]};
  for (const [style, files] of Object.entries(VARIANTS)) {
    const [mp4, cover] = files(slug);
    if (!fs.existsSync(path.join(S2, slug, mp4)) || !fs.existsSync(path.join(S2, slug, cover))) continue;
    const duration = probe(path.join(S2, slug, mp4));
    if (!duration) continue;   // still being written (ffprobe cannot read it yet)
    e[style] = {duration, cover: `v2/series2/${slug}/${cover}`, src: `v2/series2/${slug}/${mp4}`};
  }
  if (!e.flat && !e.stick) continue;
  if (e.flat) Object.assign(e, e.flat);   // back-compat: top-level duration/cover/src = the flat variant
  out.push(e);
}
fs.writeFileSync(path.join(S2, 'index.json'), JSON.stringify(out, null, 1));
const has = k => out.filter(e => e[k]).map(e => e.number).join(' ') || '-';
console.log(`series2/index.json: ${out.length} episodes · flat: ${has('flat')} · stick: ${has('stick')}`);
