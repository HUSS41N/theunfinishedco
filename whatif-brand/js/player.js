// A small video player for the film pages: every <video data-player> gets its own controls (play/pause, a
// draggable scrub bar with the buffered range, ±5 s, time, mute, fullscreen) and stays inside its frame.
// Keys when the player has focus: space/k play · ←/→ 5 s · j/l 10 s · m mute · f fullscreen · 0–9 jump to 0–90 %.
// Some local servers (python -m http.server) don't answer range requests, and then the browser can't seek at all:
// when that's detected the file is loaded once as a blob, which makes it seekable.
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor">5</text></svg>',
  fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor">5</text></svg>',
  vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
};
const all = new Set();

export function mount(v) {
  if (v.dataset.playerReady) return; v.dataset.playerReady = '1';
  v.removeAttribute('controls'); v.setAttribute('playsinline', ''); v.disablePictureInPicture = true;
  const box = document.createElement('div'); box.className = 'pl' + (v.dataset.player === 'short' ? ' pl--short' : ''); box.tabIndex = 0;
  box.setAttribute('role', 'group'); box.setAttribute('aria-label', v.getAttribute('aria-label') || 'Video player');
  v.replaceWith(box); box.append(v);
  box.insertAdjacentHTML('beforeend', `
    <button type="button" class="pl-big" aria-label="Play">${ICON.play}</button>
    <div class="pl-bar">
      <div class="pl-scrub" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="-1"><div class="pl-buf"></div><div class="pl-done"></div><div class="pl-knob"></div><div class="pl-tip"></div></div>
      <div class="pl-row">
        <button type="button" class="pl-btn" data-a="play" aria-label="Play">${ICON.play}</button>
        <button type="button" class="pl-btn" data-a="back" aria-label="Back 5 seconds">${ICON.back}</button>
        <button type="button" class="pl-btn" data-a="fwd" aria-label="Forward 5 seconds">${ICON.fwd}</button>
        <span class="pl-time"><span data-t="cur">0:00</span> / <span data-t="dur">0:00</span></span>
        <span class="pl-gap"></span>
        <button type="button" class="pl-btn" data-a="mute" aria-label="Mute">${ICON.vol}</button>
        <button type="button" class="pl-btn" data-a="full" aria-label="Fullscreen">${ICON.full}</button>
      </div>
    </div>`);
  all.add(v);
  const $ = s => box.querySelector(s), scrub = $('.pl-scrub'), done = $('.pl-done'), buf = $('.pl-buf'), knob = $('.pl-knob'), tip = $('.pl-tip');
  let dragging = false, wasPlaying = false;
  const play = () => { for (const o of all) if (o !== v && !o.paused) o.pause(); v.play().catch(() => {}); };
  const toggle = () => (v.paused ? play() : v.pause());
  const seekable = () => blobbed || v.src.startsWith('blob:') || (v.seekable.length && v.seekable.end(v.seekable.length - 1) >= v.duration - 0.5);
  const seek = t => {
    if (!isFinite(v.duration)) return; t = Math.max(0, Math.min(v.duration - 0.05, t));
    if (!seekable()) return toBlob(t);
    v.currentTime = t; paint();
  };
  const paint = () => {
    const d = v.duration || 0, f = d ? v.currentTime / d : 0;
    done.style.width = knob.style.left = `${f * 100}%`; scrub.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    $('[data-t="cur"]').textContent = fmt(v.currentTime); $('[data-t="dur"]').textContent = fmt(d);
    if (d && v.buffered.length) buf.style.width = `${(v.buffered.end(v.buffered.length - 1) / d) * 100}%`;
  };
  const state = () => {
    box.classList.toggle('is-playing', !v.paused);
    const b = box.querySelector('[data-a="play"]'); b.innerHTML = v.paused ? ICON.play : ICON.pause; b.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
    const m = box.querySelector('[data-a="mute"]'); m.innerHTML = v.muted ? ICON.mute : ICON.vol; m.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
  };
  ['play', 'pause', 'volumechange'].forEach(ev => v.addEventListener(ev, state));
  ['timeupdate', 'durationchange', 'progress', 'loadedmetadata', 'seeked'].forEach(ev => v.addEventListener(ev, paint));
  v.addEventListener('ended', () => { box.classList.remove('is-playing'); state(); });
  // a server that can't seek (no range requests): on the first seek, load the file once as a blob, then go there
  let blobbed = false;
  const toBlob = async t => {
    if (blobbed) return; blobbed = true; const was = !v.paused || dragging; box.classList.add('is-loading');
    try { const b = await (await fetch(v.currentSrc || v.src)).blob(); v.src = URL.createObjectURL(b); await new Promise(r => v.addEventListener('loadedmetadata', r, {once: true})); v.currentTime = t; paint(); if (was) play(); }
    catch (e) { blobbed = false; }
    box.classList.remove('is-loading');
  };
  v.addEventListener('emptied', () => { if (!v.src.startsWith('blob:')) blobbed = false; });   // a new src (language switch)
  box.addEventListener('click', ev => {
    const a = ev.target.closest('[data-a]')?.dataset.a;
    if (a === 'play') toggle(); else if (a === 'back') seek(v.currentTime - 5); else if (a === 'fwd') seek(v.currentTime + 5);
    else if (a === 'mute') v.muted = !v.muted;
    else if (a === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else (box.requestFullscreen || box.webkitRequestFullscreen)?.call(box); }
    else if (ev.target.closest('.pl-big') || ev.target === v) toggle();
  });
  v.addEventListener('dblclick', () => { if (document.fullscreenElement) document.exitFullscreen(); else box.requestFullscreen?.(); });
  // scrubbing: click or drag anywhere on the bar
  const at = ev => { const r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
  scrub.addEventListener('pointerdown', ev => { if (!v.duration) return; dragging = true; wasPlaying = !v.paused; v.pause(); scrub.setPointerCapture(ev.pointerId); box.classList.add('is-scrubbing'); seek(at(ev) * v.duration); });
  scrub.addEventListener('pointermove', ev => {
    const f = at(ev); tip.textContent = fmt(f * (v.duration || 0)); tip.style.left = `${f * 100}%`;
    if (dragging) seek(f * v.duration);
  });
  const end = () => { if (!dragging) return; dragging = false; box.classList.remove('is-scrubbing'); if (wasPlaying) play(); };
  scrub.addEventListener('pointerup', end); scrub.addEventListener('pointercancel', end);
  box.addEventListener('keydown', ev => {
    if (ev.target.closest('button') && (ev.key === ' ' || ev.key === 'Enter')) return;
    const k = ev.key.toLowerCase(), d = v.duration || 0;
    if (k === ' ' || k === 'k') toggle(); else if (k === 'arrowleft') seek(v.currentTime - 5); else if (k === 'arrowright') seek(v.currentTime + 5);
    else if (k === 'j') seek(v.currentTime - 10); else if (k === 'l') seek(v.currentTime + 10); else if (k === 'm') v.muted = !v.muted;
    else if (k === 'f') box.querySelector('[data-a="full"]').click(); else if (/^[0-9]$/.test(k)) seek(d * +k / 10); else return;
    ev.preventDefault();
  });
  // controls fade out while playing and the pointer is still
  let idle; const wake = () => { box.classList.remove('is-idle'); clearTimeout(idle); idle = setTimeout(() => { if (!v.paused && !dragging) box.classList.add('is-idle'); }, 2200); };
  box.addEventListener('pointermove', wake); box.addEventListener('focusin', wake); v.addEventListener('play', wake); v.addEventListener('pause', () => box.classList.remove('is-idle'));
  state(); paint();
  return box;
}

export const mountAll = (root = document) => root.querySelectorAll('video[data-player]').forEach(mount);
mountAll();
