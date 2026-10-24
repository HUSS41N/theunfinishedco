// What If brand site: the shared asset system for both pages, driven by the real v3 engine (v2/engine → whatif-flat/src).
// One module, one `style` parameter: "stick" (v1 page) or "flat" (v2 page). Every section is optional: a page mounts the
// sections whose container ids it has. The engine runs here unchanged; only render.mjs and cover.mjs are Node-only.
import {compile, frameSVG} from '../v2/engine/scene.mjs';
import {defineCharacter, buildCharacter, POSES} from '../v2/engine/character.mjs';
import {SCENE, HELD, sceneProp, WORLD} from '../v2/engine/props.mjs';
import {SETS} from '../v2/engine/backgrounds.mjs';
import {SKIN, HAIR, CLOTH, PALETTES, BUILDS, tone} from '../v2/engine/style.mjs';
import {soft as stickSoft} from '../v2/engine/stick.mjs';
import {sampleTrack, blendWeight} from '../v2/engine/motion.mjs';
import {resetIds, withStyle} from '../v2/engine/svg.mjs';
import {SAFE, RAIL_NOTCH, BANDS, CENTER_X, MIN_TEXT_PX, TARGET_TEXT_PX, READ, readingTime, countWords} from '../v2/engine/layout.mjs';

export const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const toast = msg => { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('is-on'), 1600); };
export async function copy(text, label) { try { await navigator.clipboard.writeText(text); toast(label || 'Copied'); } catch { toast('Select the text to copy it'); } }
const deep = o => JSON.parse(JSON.stringify(o));

// ---------- SVG helpers ----------
let uid = 0;
/** many inline SVGs share one id namespace: prefix every id and url(#…) so clip paths never collide */
const uniq = svg => { const p = `s${++uid}-`; return svg.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`).replace(/href="#([^"]+)"/g, `href="#${p}$1"`); };
const wrap = (inner, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
/** one character, cropped to its full body or its head */
function charSVG(def, pose = 'stand', face = {}, hold = {}, crop = 'full') {
  resetIds();
  const C = defineCharacter(def), P = typeof pose === 'string' ? deep(POSES[pose]) : pose;
  P.face = {...(P.face || {}), ...face};
  const ch = buildCharacter(C, P, {hold, shadow: crop === 'full'}), h = ch.height;
  if (crop === 'head') { const [hx, hy] = ch.anchors?.headCenter || [0, -h + 110]; return uniq(wrap(ch.svg, `${hx - 175} ${hy - 175} 350 350`)); }
  if (pose === 'lie') return uniq(wrap(`<g transform="translate(${h / 2} -90) rotate(-90)">${ch.svg}</g>`, `-${h / 2 + 60} ${-h / 2 - 90} ${h + 120} ${h + 120}`));
  return uniq(wrap(ch.svg, `-300 ${-h - 70} 600 ${h + 120}`));
}

// ---------- one animation loop for every live player on screen ----------
const players = new Set(), seen = new WeakSet();
const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))), {rootMargin: '80px'});
/** a live player: draws C at (wall-clock % loop) while visible. p.paused / p.seek(t) for scrubbed players */
export function player(el, C, {onTime, loop = C.duration, at = 0.6} = {}) {
  const p = {el, C, loop, onTime, paused: false, t: at, base: performance.now() / 1000 - at};
  p.draw = t => { p.t = t; el.innerHTML = uniq(frameSVG(p.C, t)); p.onTime?.(t); };
  p.seek = t => { p.base = performance.now() / 1000 - t; p.draw(t); };
  p.swap = C2 => { p.C = C2; p.loop = C2.duration; p.draw(Math.min(p.t, C2.duration - 0.01)); };
  players.add(p); io.observe(el); p.draw(at); return p;
}
let lastFrame = 0;
function tick(now) {
  if (!reduce && now - lastFrame > 1000 / 24) {
    lastFrame = now;
    for (const p of players) if (!p.paused && seen.has(p.el)) p.draw((now / 1000 - p.base) % p.loop);
  }
  requestAnimationFrame(tick);
}

// ---------- vocabulary per style ----------
const EXPR = {neutral: {}, smile: {mouth: 'smile'}, grin: {mouth: 'grin', eyes: 'happy'}, shock: {mouth: 'scream', eyes: 'wide', brows: 'up'},
  worried: {mouth: 'sad', brows: 'worried', look: [-0.6, 0.2]}, angry: {mouth: 'teeth', brows: 'angry', eyes: 'angry'}, bored: {mouth: 'flat', eyes: 'tired'},
  sideways: {mouth: 'smirk', turn: 0.7, look: [1, 0]}, wow: {mouth: 'O', eyes: 'wide', brows: 'raised'}, sleepy: {mouth: 'flat', eyes: 'closed'}};
const CLOTHS = Object.keys(CLOTH), BUILD_NAMES = Object.keys(BUILDS);
const HOLD_FOR = {phone: {R: 'phone'}, sitPhone: {R: 'phone'}, sitEat: {L: 'popcorn'}, hold: {R: 'coffee'}};
const FACE_FOR = {scared: EXPR.shock, sitScream: EXPR.shock, facepalm: {}, jump: EXPR.grin, dance: EXPR.grin, cheer: EXPR.grin, stretch: {}};

/** builder fields: [id, label, options, default] (options: array of values or [value, label] pairs); 'check' = checkbox */
const FIELDS = {
  flat: [
    ['palette', 'Palette', ['none', 'auto', ...Object.keys(PALETTES)], 'none'],
    ['build', 'Build', BUILD_NAMES, 'woman'],
    ['skin', 'Skin', ['', ...Object.keys(SKIN)], 'tan'],
    ['hair', 'Hair', ['short', 'buzz', 'quiff', 'bob', 'long', 'bun', 'curly', 'curlyLong', 'ponytail', 'pigtails', 'spiky', 'bald'], 'ponytail'],
    ['hairc', 'Hair colour', ['', ...Object.keys(HAIR)], 'auburn'],
    ['top', 'Top', ['tee', 'stripes', 'tank', 'shirt', 'hoodie', 'jacket', 'blouse', 'dress'], 'blouse'],
    ['topc', 'Top colour', ['', ...CLOTHS], 'coral'],
    ['bot', 'Bottom', [['none', 'none (with a dress)'], 'jeans', 'pants', 'shorts', 'skirt'], 'skirt'],
    ['botc', 'Bottom colour', ['', ...CLOTHS], 'navy'],
    ['shoe', 'Shoes', ['sneaker', 'flat', 'boot'], 'flat'],
    ['shoec', 'Shoe colour', ['', ...CLOTHS], 'white'],
    ['acc', 'Accessory', ['none', 'glasses', 'sunglasses', 'earrings', 'cap', 'headphones', 'beard', 'mustache', 'mask'], 'earrings'],
    ['bow', 'Bow', [['off', 'no bow'], ['on', 'on (palette accent)'], ...CLOTHS], 'hotpink'],
    ['pose', 'Pose', Object.keys(POSES), 'wave'],
    ['expr', 'Expression', Object.keys(EXPR), 'grin'],
    ['lashes', 'Lashes', 'check', true], ['lipstick', 'Lipstick', 'check', true], ['blush', 'Blush', 'check', false],
  ],
  stick: [
    ['top', 'Top', ['tee', 'stripes', 'tank', 'hoodie', 'shirt', 'jacket', 'dress', 'robe', 'apron', 'none'], 'dress'],
    ['topc', 'Top colour', CLOTHS, 'coral'],
    ['bot', 'Bottom', ['none', 'jeans', 'pants', 'shorts', 'skirt'], 'none'],
    ['botc', 'Bottom colour', CLOTHS, 'denim'],
    ['shoec', 'Shoes', [['ink', 'ink feet'], ...CLOTHS], 'white'],
    ['hair', 'Hair', [['none', 'none (classic)'], 'spiky', 'quiff', 'curly', 'long', 'bob', 'bun', 'ponytail', 'pigtails'], 'ponytail'],
    ['bow', 'Bow', [['auto', 'auto (women)'], ['off', 'no bow'], ...CLOTHS], 'red'],
    ['acc', 'Accessory', ['none', 'beanie', ['peak', 'peaked cap'], 'glasses', 'sunglasses', 'headphones', 'mustache', 'beard', 'mask'], 'none'],
    ['accc', 'Hat colour', CLOTHS, 'mustard'],
    ['build', 'Build', BUILD_NAMES, 'woman'],
    ['pose', 'Pose', Object.keys(POSES), 'wave'],
    ['expr', 'Expression', Object.keys(EXPR), 'grin'],
    ['blush', 'Blush', 'check', true], ['lashes', 'Lashes', 'check', false],
  ],
};
/** cast JSON from the builder's current values */
function castDef(style, v) {
  if (style === 'stick') {
    const d = {style: 'stick'};
    if (v.build !== 'man') d.build = v.build;
    d.top = {style: v.top, ...(v.top !== 'none' ? {color: v.topc} : {})};
    if (v.bot !== 'none') d.bottom = {style: v.bot, color: v.botc};
    if (v.shoec !== 'ink') d.shoes = {color: v.shoec};
    if (v.hair !== 'none') d.hair = {style: v.hair};
    if (v.bow === 'off') d.bow = false; else if (v.bow !== 'auto') d.bow = v.bow;
    if (v.acc === 'beanie') d.accessories = [{type: 'cap', color: v.accc}];
    else if (v.acc === 'peak') d.accessories = [{type: 'cap', style: 'peak', color: v.accc}];
    else if (v.acc !== 'none') d.accessories = [v.acc];
    const face = {...(v.blush ? {blush: true} : {}), ...(v.lashes ? {lashes: true} : {})};
    if (Object.keys(face).length) d.face = face;
    return d;
  }
  const d = {};
  if (v.palette !== 'none') d.palette = v.palette;
  if (v.build !== 'man') d.build = v.build;
  if (v.skin) d.skin = v.skin;
  d.hair = {style: v.hair, ...(v.hairc ? {color: v.hairc} : {})};
  d.top = {style: v.top, ...(v.topc ? {color: v.topc} : {})};
  if (v.bot !== 'none') d.bottom = {style: v.bot, ...(v.botc ? {color: v.botc} : {})};
  d.shoes = {style: v.shoe, ...(v.shoec ? {color: v.shoec} : {})};
  const face = {...(v.lashes ? {lashes: true} : {}), ...(v.lipstick ? {lipstick: true} : {}), ...(v.blush ? {blush: true} : {})};
  if (Object.keys(face).length) d.face = face;
  if (v.bow === 'on') d.bow = true; else if (v.bow !== 'off') d.bow = v.bow;
  if (v.acc !== 'none') d.accessories = [v.acc];
  return d;
}

// ---------- sections ----------
function mountBuilder(style) {
  const host = $('#builder-fields'); if (!host) return;
  const fields = FIELDS[style];
  const opt = (o, val) => { const [value, label] = Array.isArray(o) ? o : [o, o === '' ? '· from palette' : o]; return `<option value="${esc(value)}"${value === val ? ' selected' : ''}>${esc(label)}</option>`; };
  host.innerHTML = fields.map(([id, label, opts, val]) => opts === 'check'
    ? `<label class="check"><input type="checkbox" id="b-${id}"${val ? ' checked' : ''}> ${label}</label>`
    : `<label>${label} <select id="b-${id}">${opts.map(o => opt(o, val)).join('')}</select></label>`).join('');
  const values = () => Object.fromEntries(fields.map(([id, , opts]) => { const el = $(`#b-${id}`); return [id, opts === 'check' ? el.checked : el.value]; }));
  const render = () => {
    const v = values(), def = castDef(style, v), hold = HOLD_FOR[v.pose] || {}, face = EXPR[v.expr];
    $('#builder-stage').innerHTML = charSVG(def, v.pose, face, hold);
    $('#b-json').textContent = JSON.stringify({hero: def}, null, 2) + `\n// actor: {"id": "hero", "pose": "${v.pose}", "face": ${JSON.stringify(face)}}`;
  };
  $('#builder-form').addEventListener('input', e => {
    // choosing a palette hands every colour to it; choosing a colour by hand keeps the palette for the rest
    if (e.target.id === 'b-palette' && e.target.value !== 'none') for (const k of ['skin', 'hairc', 'topc', 'botc', 'shoec']) $(`#b-${k}`).value = '';
    render();
  });
  $('#b-random').addEventListener('click', () => {
    for (const [id, , opts] of fields) {
      if (id === 'pose') continue;
      const el = $(`#b-${id}`);
      if (opts === 'check') el.checked = Math.random() < 0.4;
      else { const o = el.options; el.selectedIndex = Math.floor(Math.random() * o.length); }
    }
    if (style === 'flat' && Math.random() < 0.5) { $('#b-palette').value = 'auto'; for (const k of ['skin', 'hairc', 'topc', 'botc', 'shoec']) $(`#b-${k}`).value = ''; }
    render();
  });
  $('#b-copy').addEventListener('click', () => copy(JSON.stringify({hero: castDef(style, values())}, null, 2), 'Cast JSON copied'));
  render();
}

function mountFacesPoses(style, model) {
  model = {...model, style};   // the cast entry's style picks the rig (stick.mjs or character.mjs)
  if ($('#expr-strip')) $('#expr-strip').innerHTML = Object.entries(EXPR).map(([k, f]) => `<figure><div class="svgstage">${charSVG(model, 'stand', f, {}, 'head')}</div><figcaption>${k}</figcaption></figure>`).join('');
  if ($('#pose-strip')) $('#pose-strip').innerHTML = Object.keys(POSES).map(p => `<figure><div class="svgstage">${charSVG(model, p, FACE_FOR[p] || {}, HOLD_FOR[p] || {})}</div><figcaption>${p}</figcaption></figure>`).join('');
}

/** every set preset, at real scale: an actor at scale 1 (1.7 m) and a wide camera */
function mountSets(style, cast) {
  const host = $('#sets-grid'); if (!host) return;
  const names = Object.keys(SETS);
  host.innerHTML = names.map(s => `<figure><div class="svgstage" data-set="${s}"></div><figcaption>${s}</figcaption></figure>`).join('');
  const lazy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; lazy.unobserve(e.target);
    const set = e.target.dataset.set, floorY = set === 'street' || set === 'nightCity' ? 1560 : 1500, behind = set === 'cinema';
    const C = compile({meta: {duration: 1, style}, cast: {a: cast}, shots: [{start: 0, end: 1, set: {preset: set, ...(set === 'solid' ? {color: style === 'stick' ? '#F3E7D3' : '#E9E2D6'} : {}), ...(set === 'classroom' ? {label: 'WHAT IF?'} : {})},
      camera: [{t: 0, x: 540, y: floorY - 600, zoom: 0.5}],
      actors: [{id: 'a', x: set === 'classroom' ? -150 : 340, y: floorY, scale: 1, behind, pose: 'wave', face: {mouth: 'smile'}, idle: false}]}]});
    e.target.innerHTML = uniq(frameSVG(C, 0.5));
  }), {rootMargin: '400px'});
  $$('[data-set]').forEach(el => lazy.observe(el));
}

const SAMPLE = {bubble: {text: 'HEY!'}, thought: {text: 'PIZZA?'}, tag: {text: '72%'}, phoneUI: {header: 'Mom', messages: [{text: 'Are you ok?', from: 'them'}, {text: "I'm fine", from: 'me'}], typing: true},
  brickWall: {rows: 4, cols: 4}, flowerTrail: {points: [[-200, 0], [0, -160], [200, 0]], progress: 1}, board: {title: 'PRICES', rows: [['HELLO', '$1'], ['SORRY', '$50']]}, checklist: {items: [['ROCKET', false], ['FUN', true]]},
  rope: {x2: 260, y2: -60}, stars: {n: 18, w: 400, h: 300}, svg: {markup: '<circle cx="0" cy="-60" r="60" fill="#E8692F"/><path d="M0 -120 A60 60 0 0 1 0 0Z" fill="#C4521F"/>'},
  sign: {label: 'HI :)'}, note: {label: 'ARE WE HAPPY?'}, building: {w: 900}, rocket: {built: 1}, whiteboard: {label: 'PLAN'}};
function mountProps(style) {
  const host = $('#props-grid'); if (!host) return;
  const all = [...Object.keys(SCENE).map(k => ['scene', k]), ...Object.keys(HELD).filter(k => !SCENE[k]).map(k => ['held', k])];
  host.innerHTML = all.map(([kind, k]) => `<figure><div class="svgstage" data-prop="${k}" data-kind="${kind}"></div><figcaption>${k}${kind === 'held' ? ' · held' : ''}</figcaption></figure>`).join('');
  for (const el of $$('[data-prop]')) {
    const k = el.dataset.prop; resetIds();
    let markup = '';
    try { markup = el.dataset.kind === 'scene' ? sceneProp({type: k, x: 0, y: 0, style, ...(SAMPLE[k] || {})}, 1.2) : withStyle(style, () => HELD[k](1.6, SAMPLE[k]?.label)); } catch (err) { console.warn('prop', k, err.message); }
    if (!markup) { el.closest('figure').remove(); continue; }
    el.innerHTML = uniq(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 600 600"><g>${markup}</g></svg>`);
    const svg = el.querySelector('svg'), b = svg.querySelector('g').getBBox(), pad = Math.max(b.width, b.height) * 0.1 + 12;
    if (b.width && b.height) { const s = Math.max(b.width, b.height) + pad * 2; svg.setAttribute('viewBox', `${b.x + b.width / 2 - s / 2} ${b.y + b.height / 2 - s / 2} ${s} ${s}`); }
  }
}

/** palette: stick = the soft world palette + softened clothes; flat = base/shade/light trios + the 12 character palettes */
function mountPalette(style) {
  const sw = (name, hex, sub = '') => `<button type="button" class="chip" data-copy="${esc(name)}"><span class="chip__c" style="background:${hex}"></span><span class="chip__n">${esc(name)}<small>${hex}${sub}</small></span></button>`;
  if ($('#pal-world')) {
    const W = WORLD[style] || WORLD.flat;
    $('#pal-world').innerHTML = Object.entries(W).filter(([, v]) => typeof v === 'string').map(([k, v]) => sw(k, v)).join('');
    if ($('#pal-books')) $('#pal-books').innerHTML = W.books.map((c, i) => sw(`books[${i}]`, c)).join('');
  }
  if ($('#pal-clothes')) $('#pal-clothes').innerHTML = CLOTHS.map(k => { const s = stickSoft(k); return `<button type="button" class="chip" data-copy="${k}"><span class="chip__c chip__c--pair"><span style="background:${CLOTH[k]}"></span><span style="background:${s}"></span></span><span class="chip__n">${k}<small>${s}</small></span></button>`; }).join('');
  const trio = (name, base) => { const t = tone(base); return `<button type="button" class="trio" data-copy="${name}"><span class="trio__bars"><span style="background:${t.shade}"></span><span style="background:${t.base}"></span><span style="background:${t.light}"></span></span><span class="trio__name">${name}<small>${base}</small></span></button>`; };
  if ($('#trio-skin')) $('#trio-skin').innerHTML = Object.entries(SKIN).map(([k, c]) => trio(k, c)).join('');
  if ($('#trio-hair')) $('#trio-hair').innerHTML = Object.entries(HAIR).map(([k, c]) => trio(k, c)).join('');
  if ($('#trio-cloth')) $('#trio-cloth').innerHTML = Object.entries(CLOTH).map(([k, c]) => trio(k, c)).join('');
  if ($('#palettes')) {
    const col = (v, table) => table[v] || v;
    $('#palettes').innerHTML = Object.entries(PALETTES).map(([k, p]) => {
      const her = {id: k, palette: k, build: 'woman', hair: {style: 'ponytail'}, top: {style: 'blouse'}, bottom: {style: 'skirt'}, shoes: {style: 'flat'}, bow: true, face: {lashes: true, lipstick: true}};
      const him = {id: k + 'm', palette: k, hair: {style: 'quiff'}, top: {style: 'hoodie'}, bottom: {style: 'jeans'}};
      const dots = [['skin', col(p.skin, SKIN)], ['hair', col(p.hair, HAIR)], ['top', col(p.top, CLOTH)], ['detail', col(p.detail, CLOTH)], ['bottom', col(p.bottom, CLOTH)], ['shoes', col(p.shoes, CLOTH)], ['accent', col(p.accent, CLOTH)], ['lips', p.lips]];
      return `<button type="button" class="palcard" data-copy="${k}"><span class="palcard__pair"><span class="svgstage">${charSVG(her, 'handsHips', {mouth: 'smile'})}</span><span class="svgstage">${charSVG(him, 'relaxed', {mouth: 'smile'})}</span></span>
        <span class="palcard__dots">${dots.map(([n, c]) => `<i title="${n}: ${c}" style="background:${c}"></i>`).join('')}</span><span class="palcard__name">"palette": "${k}"</span></button>`;
    }).join('');
  }
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => copy(`"${b.dataset.copy}"`, `Copied "${b.dataset.copy}"`)));
}

/** motion loops: one `do` action each, on the same character */
function mountMotionLoops(style, cast) {
  const host = $('#motion-grid'); if (!host) return;
  const bg = style === 'stick' ? '#F6EEE2' : '#2A2B2F';
  const LOOPS = [
    ['walk', 2.6, 'relaxed', [{act: 'walk', from: 0.1, to: 2.3, dx: 360}], 360, 'planted feet over dx 360'],
    ['wave', 2.4, 'relaxed', [{act: 'wave', arm: 'R', from: 0.2, to: 2.2}], 540, 'blends in and out'],
    ['turn', 2.4, 'relaxed', [{act: 'turn', from: 0.5, dur: 0.3}, {act: 'turn', from: 1.7, dur: 0.3}], 540, 'a squash, not a flip'],
    ['reach', 2.4, 'relaxed', [{act: 'reach', arm: 'R', from: 0.3, to: 2.0, target: [210, -760]}], 540, 'two-bone IK to a point'],
    ['jump', 1.8, 'stand', [{act: 'jump', from: 0.3, dur: 0.6, height: 150}], 540, 'crouch, hop, land'],
    ['laugh', 2.4, 'relaxed', [{act: 'laugh', from: 0.2, to: 2.2}], 540, 'bounce + grin + happy eyes'],
    ['talk', 2.4, 'relaxed', [{act: 'talk', from: 0.2, to: 2.2}], 540, 'mouth flaps'],
    ['tremble', 2.4, 'scared', [{act: 'tremble', from: 0.1, to: 2.3, amp: 4}], 540, 'smooth noise under 5 Hz'],
  ];
  host.innerHTML = LOOPS.map(([k, , , , , note]) => `<figure><div class="svgstage" data-motion="${k}"></div><figcaption><b>${k}</b><span>${note}</span></figcaption></figure>`).join('');
  for (const [k, dur, pose, acts, x0] of LOOPS) {
    const face = k === 'tremble' ? {mouth: 'scream', eyes: 'wide', brows: 'up'} : k === 'talk' ? {mouth: 'smile'} : {mouth: 'grin'};
    const C = compile({meta: {duration: dur, style}, cast: {a: cast}, shots: [{start: 0, end: dur, set: {preset: 'solid', color: bg, vig: 0}, camera: [{t: 0, x: 540, y: 1130, zoom: 1.35}],
      actors: [{id: 'a', x: k === 'walk' ? x0 : 540, y: 1500, pose, face, do: [{act: 'blink'}, ...acts]}]}]});
    player($(`[data-motion="${k}"]`), C, {loop: dur});
  }
}

/** the layer explorer: one frame of the hero scene as its named layer tree */
function mountLayers(C, t) {
  const stage = $('#layer-stage'); if (!stage) return;
  stage.innerHTML = uniq(frameSVG(C, t));
  const tree = $('#layer-tree'), rows = [];
  const walk = (node, depth) => { for (const el of node.children) { const name = el.getAttribute?.('data-layer'); if (name) { rows.push({el, name, depth}); walk(el, depth + 1); } else walk(el, depth); } };
  walk(stage.querySelector('svg'), 0);
  tree.innerHTML = rows.map((r, i) => { const kind = r.name.split(':')[0]; return `<li data-i="${i}" data-kind="${kind}"><label><input type="checkbox" checked data-i="${i}"><span class="depth">${'  '.repeat(r.depth)}</span>${esc(r.name)}</label></li>`; }).join('');
  tree.addEventListener('change', e => { const r = rows[e.target.dataset.i]; if (r) r.el.style.display = e.target.checked ? '' : 'none'; });
  tree.addEventListener('mouseover', e => { const li = e.target.closest('li'); rows.forEach(r => r.el.removeAttribute('data-hl')); if (li) rows[li.dataset.i].el.setAttribute('data-hl', '1'); });
  tree.addEventListener('mouseleave', () => rows.forEach(r => r.el.removeAttribute('data-hl')));
  $('#tree-all').addEventListener('click', () => { rows.forEach(r => { r.el.style.display = ''; }); tree.querySelectorAll('input').forEach(c => { c.checked = true; }); });
  $('#tree-chars').addEventListener('click', () => rows.forEach((r, i) => { const on = !/^bg:|^set|^vignette|^prop:|^text|^screen$|^bubbles?$/.test(r.name); if (r.depth <= 1) { r.el.style.display = on ? '' : 'none'; tree.querySelector(`input[data-i="${i}"]`).checked = on; } }));
  if ($('#layer-count')) $('#layer-count').textContent = `${rows.length} named layers at t = ${t.toFixed(1)} s`;
}

// ---------- Motion: the live motion demo, spline / blend charts, transitions ----------
async function mountMotion(style) {
  const host = $('#motion-player'); if (!host) return;
  const raw = await (await fetch('v2/examples/motion-demo.json')).json();
  const make = overlap => { const s = deep(raw); s.meta.style = style; s.meta.motion = {...(s.meta.motion || {}), overlap: overlap ? 1 : 0}; return compile(s); };
  const scrub = $('#motion-scrub'), btn = $('#motion-play');
  scrub.max = raw.meta.duration;
  const p = player(host, make(true), {onTime: t => { $('#motion-time').textContent = `${t.toFixed(2)} s`; if (!scrub.matches(':active')) scrub.value = t; }, at: 1.7});
  btn.addEventListener('click', () => { p.paused = !p.paused; if (!p.paused) p.seek(p.t); btn.textContent = p.paused ? 'Play' : 'Pause'; btn.setAttribute('aria-pressed', String(p.paused)); });
  scrub.addEventListener('input', () => { p.paused = true; btn.textContent = 'Play'; p.draw(Number(scrub.value)); });
  $('#motion-overlap').addEventListener('change', e => p.swap(make(e.target.checked)));
  $$('[data-seek]').forEach(b => b.addEventListener('click', () => { p.paused = false; btn.textContent = 'Pause'; p.seek(Number(b.dataset.seek)); }));

  // spline keys vs linear, drawn with the engine's own sampleTrack
  if ($('#chart-spline')) {
    const keys = [[0, 0], [1, 0.75], [2, 0.6], [3, 1]], W = 320, H = 150, X = t => 14 + t / 3 * (W - 28), Y = v => H - 18 - v * (H - 40);
    const pts = keys.map(([t, v]) => ({t, v})), lin = keys.map(([t, v]) => ({t, v, ease: 'linear'}));
    const line = arr => 'M' + Array.from({length: 121}, (_, i) => { const t = i / 40; return `${X(t).toFixed(1)} ${Y(sampleTrack(arr, t)).toFixed(1)}`; }).join(' L');
    $('#chart-spline').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Spline keys compared with linear keys"><path d="${line(lin)}" class="c-faint"/><path d="${line(pts)}" class="c-main"/>${keys.map(([t, v]) => `<circle cx="${X(t)}" cy="${Y(v)}" r="5" class="c-key"/>`).join('')}</svg>`;
  }
  if ($('#chart-blend')) {
    const W = 320, H = 150, X = t => 14 + t / 3 * (W - 28), Y = v => H - 18 - v * (H - 40);
    const curve = b => 'M' + Array.from({length: 121}, (_, i) => { const t = i / 40; return `${X(t).toFixed(1)} ${Y(blendWeight(t, 0.6, 2.4, b)).toFixed(1)}`; }).join(' L');
    $('#chart-blend').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Action blend weight over time"><path d="${curve(0.02)}" class="c-faint"/><path d="${curve(0.45)}" class="c-main"/><text x="${X(0.6)}" y="${H - 4}" class="c-lbl">from</text><text x="${X(2.4)}" y="${H - 4}" class="c-lbl">to</text></svg>`;
  }
  // transitions: two shots, the second enters with the chosen `in.type`
  if ($('#trans-player')) {
    const sel = $('#trans-type'), cast = {a: raw.cast.ana, b: raw.cast.ben};
    const sets = style === 'stick' ? ['kitchen', 'park'] : ['spotlight', 'nightCity'];
    const make2 = type => compile({meta: {duration: 3.2, style}, cast, shots: [
      {start: 0, end: 1.4, set: {preset: sets[0]}, camera: [{t: 0, x: 540, y: 1120, zoom: 1.2}], actors: [{id: 'a', x: 540, y: 1500, pose: 'wave', face: {mouth: 'grin'}}]},
      {start: 1.4, end: 3.2, in: {type, dir: 'left'}, set: {preset: sets[1]}, camera: [{t: 0, x: 540, y: 1160, zoom: 1.2}], actors: [{id: 'b', x: 540, y: sets[1] === 'nightCity' ? 1560 : 1500, pose: 'cheer', face: {mouth: 'grin', eyes: 'happy'}}]}]});
    const tp = player($('#trans-player'), make2(sel.value), {loop: 3.2, at: 1.5});
    sel.addEventListener('change', () => { tp.C = make2(sel.value); tp.seek(0.9); });
  }
}

// ---------- Text & safe zones ----------
function overlaySVG() {
  const S = SAFE, N = RAIL_NOTCH, bottom = S.y + S.h;
  return `<svg class="safe-overlay" viewBox="0 0 1080 1920" preserveAspectRatio="none" aria-hidden="true">
  <g class="ov-ui">
    <rect x="0" y="0" width="1080" height="${S.y}" class="ov-band"/><rect x="0" y="${bottom}" width="1080" height="${1920 - bottom}" class="ov-band"/>
    <rect x="0" y="${S.y}" width="${S.x}" height="${S.h}" class="ov-band"/><rect x="${S.x + S.w}" y="${S.y}" width="${1080 - S.x - S.w}" height="${S.h}" class="ov-band"/>
    <text x="540" y="${S.y / 2 + 14}" class="ov-t">PLATFORM UI · TOP ${S.y}</text><text x="540" y="${bottom + 120}" class="ov-t">PLATFORM UI · BOTTOM ${1920 - bottom}</text>
    <text x="540" y="${bottom + 180}" class="ov-t ov-t--s">art only below y ${bottom}</text>
  </g>
  <g class="ov-mock">${[0, 1, 2, 3, 4].map(i => `<circle cx="1000" cy="${1040 + i * 150}" r="44" class="ov-icon"/>`).join('')}
    <rect x="48" y="1640" width="430" height="34" rx="17" class="ov-icon"/><rect x="48" y="1700" width="640" height="28" rx="14" class="ov-icon"/><rect x="48" y="1752" width="520" height="28" rx="14" class="ov-icon"/></g>
  <g class="ov-notch"><rect x="${N.x}" y="${N.y}" width="${S.x + S.w - N.x}" height="${bottom - N.y}" class="ov-n"/><text x="${N.x + 54}" y="${N.y + 80}" class="ov-t ov-t--s ov-t--n" transform="rotate(90 ${N.x + 54} ${N.y + 80})">RAIL NOTCH</text></g>
  <g class="ov-bands">${Object.entries(BANDS).map(([k, b]) => `<line x1="${S.x}" x2="${S.x + S.w}" y1="${b.y}" y2="${b.y}" class="ov-b"/><text x="${S.x + 16}" y="${b.y + 46}" class="ov-t ov-t--b">${k.toUpperCase()} ${b.y}–${b.y + b.h}</text>`).join('')}
    <line x1="${CENTER_X}" x2="${CENTER_X}" y1="${S.y}" y2="${bottom}" class="ov-c"/><text x="${CENTER_X + 12}" y="${bottom - 16}" class="ov-t ov-t--s ov-t--l">x ${CENTER_X}</text></g>
  <g class="ov-safe"><rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" class="ov-s"/><text x="${S.x + S.w - 16}" y="${S.y + 46}" class="ov-t ov-t--s ov-t--r">SAFE ${S.x}–${S.x + S.w} × ${S.y}–${bottom}</text></g>
</svg>`;
}
function mountSafe(style, heroScene) {
  const stage = $('#safe-stage'); if (!stage) return;
  const frame = $('#safe-frame'); frame.insertAdjacentHTML('beforeend', overlaySVG());
  for (const k of ['ui', 'mock', 'notch', 'bands', 'safe']) { const cb = $(`#ov-${k}`); if (cb) { const ap = () => frame.classList.toggle(`hide-${k}`, !cb.checked); cb.addEventListener('change', ap); ap(); } }
  const ROLE = {headline: {font: 'display', size: TARGET_TEXT_PX.headline, y: 420}, body: {font: 'sans', size: TARGET_TEXT_PX.body, y: 1120}, label: {font: 'mono', size: TARGET_TEXT_PX.label, y: 700}};
  const base = deep(heroScene), shot0 = base.shots[0];
  const render = (line, role) => {
    const r = ROLE[role];
    const shot = {...deep(shot0), start: 0, end: 4, text: line.trim() ? [{text: line, role, font: r.font, size: r.size, y: r.y, from: 0, to: 4, anim: 'none', exit: 'none'}] : []};
    delete shot.in;
    shot.actors = (shot.actors || []).map(a => { const b = {...a}; delete b.say; return b; });
    const C = compile({...base, meta: {...base.meta, style, duration: 4}, shots: [shot]});
    stage.innerHTML = uniq(frameSVG(C, 3));
  };
  const inp = $('#rt-text'), role = $('#rt-role'), nv = $('#rt-new');
  const calc = () => {
    const s = inp.value, clean = s.replace(/[*_]/g, '').replace(/\s+/g, ' ').trim(), W = countWords(clean), Cn = clean.length, big = /\d[\d,.]{2,}/.test(clean) && clean.replace(/[^\d]/g, '').length >= 3;
    const terms = [['floor', READ.floor, `${READ.floor} s`], ['words', READ.perWord * W, `${W} × ${READ.perWord}`], ['chars', Cn / READ.cps, `${Cn} ÷ ${READ.cps}`]];
    const best = terms.reduce((a, b) => (b[1] > a[1] ? b : a));
    const t = readingTime(clean, {newVisual: nv.checked}), px = ROLE[role.value].size, perLine = Math.floor(SAFE.w / (0.58 * px));
    $('#rt-out').textContent = `${t.toFixed(2)} s`;
    $('#rt-frames').textContent = `${Math.ceil(t * 24)} frames at 24 fps`;
    $('#rt-terms').innerHTML = terms.map(([k, v, f]) => `<li${k === best[0] ? ' class="is-max"' : ''}><span>${k}</span><code>${f}</code><b>${v.toFixed(2)} s</b></li>`).join('') +
      `<li${nv.checked ? ' class="is-add"' : ''}><span>new visual</span><code>+${READ.newVisual}</code><b>${nv.checked ? '+0.50 s' : '·'}</b></li>` +
      `<li${big ? ' class="is-add"' : ''}><span>3+ digit number</span><code>+${READ.bigNumber}</code><b>${big ? '+0.50 s' : '·'}</b></li>` +
      `<li><span>cap</span><code>min(${READ.max}, …)</code><b>${t >= READ.max ? 'capped' : '·'}</b></li>`;
    $('#rt-lines').textContent = `${role.value} · ${px} px (min ${MIN_TEXT_PX[role.value]}) · about ${perLine} characters per line in the ${SAFE.w} px safe width · ${Cn} characters → ${Math.max(1, Math.ceil(Cn / perLine))} line${Math.ceil(Cn / perLine) > 1 ? 's' : ''}${W > READ.hookWords && role.value === 'headline' ? ` · too long for a hook (≤ ${READ.hookWords} words)` : ''}`;
    clearTimeout(calc.t); calc.t = setTimeout(() => render(s, role.value), 120);
  };
  [inp, role, nv].forEach(el => el.addEventListener('input', calc));
  calc();
}

// ---------- Series 2 gallery (index.json lists a flat and/or a stick variant per episode) ----------
async function mountSeries2(style) {
  const grid = $('#series2-grid'); if (!grid) return;
  const note = $('#series2-note'), label = style === 'stick' ? 'stick' : 'flat';
  try {
    const list = await (await fetch('v2/series2/index.json', {cache: 'no-store'})).json();
    const eps = list.filter(e => e[label]), other = list.filter(e => e[label === 'stick' ? 'flat' : 'stick']).length;
    const setNote = () => {
      const n = grid.children.length;
      note.textContent = n
        ? `${n} of 10 episodes rendered in the ${label} style${n < 10 ? '; the rest appear here as they finish rendering' : ''}.`
        : `The ${label} renders of Series 2 are in progress; episodes appear here as they finish.${other ? ` ${other} are already out in the ${label === 'stick' ? 'flat' : 'stick'} style.` : ''}`;
      grid.hidden = !n;
    };
    for (const e of eps) {
      const v = e[label], card = document.createElement('wi-episode-card');
      Object.entries({number: e.number, title: e.title, duration: v.duration, accent: e.accent || 'red', cover: v.cover, src: v.src}).forEach(([k, val]) => card.setAttribute(k, val));
      grid.append(card);
      card.querySelector('img')?.addEventListener('error', () => { card.remove(); setNote(); });   // a cover mid-render: hide the card
    }
    setNote();
  } catch { note.textContent = 'Series 2 is rendering. Episodes appear here when v2/series2/index.json exists.'; grid.hidden = true; }
  const pl = $('#player'), video = $('#player-video');
  if (!pl.dataset.wired) {
    pl.dataset.wired = '1';
    document.addEventListener('wi-play', e => { video.src = e.detail.src; $('#player-title').textContent = `#${e.detail.number} · ${e.detail.title}`; pl.showModal(); video.play().catch(() => {}); });
    pl.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });
  }
}

/**
 * Mount every engine section the page has.
 * @param {object} o
 * @param {'stick'|'flat'} o.style  the engine style for every render on the page
 * @param {string} o.hero           scene JSON url for the hero player, layer explorer and the safe-zone frame
 * @param {object} o.model          cast entry used for the faces and poses strips
 * @param {object} o.walker         cast entry used for the sets and motion loops
 * @param {number} [o.layersAt]     time of the layer-explorer frame
 */
export async function mountEngineUI({style, hero, model, walker, layersAt = 4}) {
  await document.fonts.ready;
  const heroScene = await (await fetch(hero)).json();
  heroScene.meta.style = style;
  const HERO = compile(heroScene);
  if ($('#hero-player')) player($('#hero-player'), HERO, {onTime: t => { const el = $('#hero-time'); if (el) el.textContent = `${t.toFixed(1)} s`; }, at: 3.6});
  mountBuilder(style);
  mountLayers(HERO, layersAt);
  mountFacesPoses(style, model);
  mountSets(style, walker);
  mountProps(style);
  mountPalette(style);
  mountMotionLoops(style, walker);
  await mountMotion(style);
  mountSafe(style, heroScene);
  await mountSeries2(style);
  requestAnimationFrame(tick);
  return {heroScene, HERO};
}
