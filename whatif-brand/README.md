# theunfinishedco — brand & video system site

Two pages, both driven live by the real **whatif-flat v3 engine** (one engine, two styles):

- `index.html` — **v1, the stick style** (light theme): the logo, tokens, type, web components, plus the full engine asset system in
  stick style, the Series 2 stick renders, and the archive (Series 1 and the banners, made with the retired canvas kit).
- `v2.html` — **v2, the flat vector style** (dark theme): the same asset system in flat style, plus palettes, the build notes,
  the JSON guide and the Series 2 flat renders.

Typography follows hussnakhtr.com: Inter 600 tight headlines with one phrase in Instrument Serif italic, and JetBrains Mono labels.

```bash
./serve.sh                        # → http://localhost:4173  (ES modules need http://, not file://)
node tools/build-tokens.mjs       # after editing tokens.json: regenerates css/tokens.css + js/tokens.js, prints contrast
node ../whatif-flat/tools-series2-index.mjs   # after renders finish: rebuilds v2/series2/index.json (both styles)
```

## Sections on both pages (js/engine-ui.js, one module with a `style` parameter)

| id | what |
|---|---|
| `#hero-player` | a live scene (v1: `scenes/stick-hero.json`; v2: `examples/cinema-stranger.json`) |
| `#builder` | character builder → Copy cast JSON. Stick: top/bottom styles and colours, hair (women get a bow), bow on/off/colour, beanie/cap/glasses…, build, pose, expression, blush/lashes. Flat: the 12 palettes + `auto`, builds incl. `woman`/`girl`, ponytail/pigtails/curlyLong, bow, earrings, lashes, lipstick |
| `#layers` | layer explorer of one hero frame (hover to find, untick to hide) |
| `#faces` | expressions + all 35 named poses |
| `#sets` | all 16 set presets at real scale (zoom 0.5, actor scale 1) + the real-scale note |
| `#props` | every scene prop and held prop, in the page's style |
| `#palette` | v1: `WORLD.stick` + clothes (cloth vs softened); v2: `PALETTES` cards + skin/hair/cloth trios |
| `#loops` | walk, wave, turn, reach, jump, laugh, talk, tremble (one `do` action each) |
| `#motion` | `examples/motion-demo.json` live (play/pause, scrub, chapters, overlap on/off) beside `media/motion-demo.mp4`; spline and blend charts drawn with the engine's own `sampleTrack`/`blendWeight`; a transitions player (`in.type`) |
| `#text` | phone frame with SAFE, the rail notch, the bands and the UI margins over a live frame; the typed line is laid out by `text.mjs`; reading-time calculator from `layout.mjs`; rules + sources from `../RESEARCH-safe-zones-text.md` |
| `#series2` | from `v2/series2/index.json`: v1 shows `stick` variants, v2 shows `flat`. Missing variants are skipped; a cover that 404s removes its card |

## Files

| Path | What |
|---|---|
| `js/engine-ui.js` | the shared asset system (`mountEngineUI({style, hero, model, walker, layersAt})`) |
| `js/main.js` | v1 page: swatches, type, token tables, Series 1, banners, then `mountEngineUI({style: 'stick'})` |
| `js/v2.js` | v2 page: `mountEngineUI({style: 'flat'})` + the JSON sample |
| `js/components.js` | web components: `<wi-mark>`, `<wi-tag>`, `<wi-episode-card>` |
| `css/engine.css` | layout for the engine sections, themed by `--eng-*` variables (light default) |
| `css/v2.css` | the dark v2 theme (redefines `--eng-*`) and v2-only sections |
| `css/site.css`, `css/tokens.css` | brand page styles; tokens.css is generated (incl. `@font-face` for Inter Display 700/800/900, Instrument Serif, JetBrains Mono, Inter: every family the engine's SVG names) |
| `scenes/stick-hero.json` | the v1 hero scene (`meta.style: "stick"`, livingRoom, speech bubbles); passes `render.mjs --check` |
| `tokens.json` | source of truth for brand colour, accents, fonts, type, space, radius (the stroke/stage/motion tables describe the archived canvas kit) |
| `media/motion-demo.mp4` | copy of `whatif-flat/examples/build/motion-demo/motion-demo.mp4` |
| `media/NN-*.mp4`, `assets/covers/` | Series 1 archive (copies from `../whatif-series`) |
| `assets/logo/`, `assets/banners/` | mark, lockup, wordmark, avatar; YouTube banner and series poster (made with the archived kit) |
| `v2/engine`, `v2/examples`, `v2/series2` | symlinks into `../whatif-flat` (`src`, `examples`, `series2`). The engine runs in the browser unchanged; only `render.mjs` and `cover.mjs` are Node-only |
| `js/draw.js`, `js/stage.js` | browser ports of the **retired** canvas kit; no page loads them any more. Kept only for `tools/assets.mjs` history |
| `tools/assets.mjs`, `tools/mark.mjs` | regenerate the logo and banners with the archived kit |

## Verify

Headless Chrome via playwright-core (`chrome-headless-shell` 1228): desktop 1440 and phone 390, full length, zero console
errors, no horizontal overflow, builders change on select. The shell has no H.264, so the MP4 request is aborted there; real
Chrome plays it.
