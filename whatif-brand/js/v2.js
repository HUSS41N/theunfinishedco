// What If v2 page: the shared engine asset system (js/engine-ui.js) in the flat style, plus the v2-only JSON sample.
import {mountEngineUI, $} from './engine-ui.js';

const {heroScene} = await mountEngineUI({
  style: 'flat',
  hero: 'v2/examples/cinema-stranger.json',
  layersAt: 1.5,
  // the faces/poses model and the walker for sets and loops
  model: {skin: 'tan', build: 'woman', hair: {style: 'curlyLong', color: 'dark'}, top: {style: 'blouse', color: 'teal'}, bottom: {style: 'skirt', color: 'mustard'}, shoes: {style: 'flat', color: 'white'}, face: {lashes: true, lipstick: true}, accessories: ['earrings']},
  walker: {skin: 'peach', hair: {style: 'quiff', color: 'brown'}, top: {style: 'hoodie', color: 'coral'}, bottom: {style: 'jeans', color: 'navy'}, shoes: {color: 'white'}},
});

$('#json-sample').textContent = JSON.stringify({meta: heroScene.meta, cast: {dad: heroScene.cast.dad, stranger: heroScene.cast.stranger}, shots: [heroScene.shots[0]]}, null, 2);
