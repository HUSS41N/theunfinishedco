// What If page shell: theme toggle, mobile drawer, and the sidebar's current-section highlight.
// The theme itself is stamped on <html data-theme> before paint by the inline script in each page's <head>.
const KEY = 'wi-theme';
const root = document.documentElement;

const themeBtn = document.querySelector('[data-theme-toggle]');
const syncThemeBtn = () => {
  const dark = root.dataset.theme === 'dark';
  themeBtn?.setAttribute('aria-pressed', String(dark));
  themeBtn?.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
};
themeBtn?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, root.dataset.theme); } catch { /* private mode: the toggle still works for this visit */ }
  syncThemeBtn();
});
syncThemeBtn();

// mobile drawer
const body = document.body, menuBtn = document.querySelector('[data-menu]');
const setOpen = open => { body.classList.toggle('side-open', open); menuBtn?.setAttribute('aria-expanded', String(open)); };
menuBtn?.addEventListener('click', () => setOpen(!body.classList.contains('side-open')));
document.querySelector('.scrim')?.addEventListener('click', () => setOpen(false));
document.querySelectorAll('.side__nav a, .side__foot a').forEach(a => a.addEventListener('click', () => setOpen(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

// current section: the last section whose top has passed 35% of the viewport
const links = [...document.querySelectorAll('.side__nav a[href^="#"]')];
const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
let ticking = false;
const mark = () => {
  ticking = false;
  const y = innerHeight * 0.35;
  // by page position, not link order: the sidebar groups sections, so its order can differ from the page's
  let cur = null, best = -Infinity;
  for (const t of targets) { const top = t.getBoundingClientRect().top; if (top <= y && top > best) { best = top; cur = t; } }
  // at the very bottom the last section can be too short to reach the line: it is the current one
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) cur = targets.reduce((a, t) => (t.getBoundingClientRect().top > a.getBoundingClientRect().top ? t : a), targets[0]);
  if (!cur) cur = targets.reduce((a, t) => (t.getBoundingClientRect().top < a.getBoundingClientRect().top ? t : a), targets[0]);
  for (const a of links) {
    const on = a.getAttribute('href') === '#' + cur?.id;
    a.classList.toggle('is-current', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  }
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, {passive: true});
addEventListener('resize', mark);
mark();
