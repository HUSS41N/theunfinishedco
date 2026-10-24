"""Kokoro narration: one clip per caption phrase, joined at native speed. Writes narration.wav + phrases.json."""
import json, sys, pathlib
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro, EspeakConfig
K = pathlib.Path.home() / 'dev/masked-and-undefined/tools/kokoro'
out = pathlib.Path(sys.argv[1])
k = Kokoro(str(K / 'kokoro-v1.0.onnx'), str(K / 'voices-v1.0.bin'),
           espeak_config=EspeakConfig(lib_path='/opt/homebrew/lib/libespeak-ng.dylib', data_path='/opt/homebrew/share/espeak-ng-data'))
# (phrase, pause after) — short pause inside a sentence, longer between sentences
P = [("That task you keep putting off?", .35), ("It's not too big.", .3), ("Starting is just hard.", .45),
     ("So try the two-minute rule.", .45), ("If it takes less than two minutes,", .12), ("do it now.", .45),
     ("If it's bigger,", .12), ("just do the first two minutes.", .45),
     ("Don't read the book.", .15), ("Read one page.", .4), ("Don't go for a run.", .15), ("Put on your shoes.", .45), ("Don't clean the kitchen.", .15), ("Wash one plate.", .45),
     ("Once you start,", .12), ("you usually keep going.", .5), ("Two minutes.", .25), ("Start now.", 0)]
def trim(a, sr, keep=.03):
    i = np.where(np.abs(a) > .01)[0]; return a[max(0, i[0] - int(keep * sr)): i[-1] + int(keep * sr)]
chunks, rows, t, sr = [], [], 0.0, 24000
for text, pause in P:
    a, sr = k.create(text, voice='am_michael', speed=1.0, lang='en-us'); a = trim(a, sr)
    rows.append({'text': text, 'start': round(t, 3), 'end': round(t + len(a) / sr, 3)})
    chunks += [a, np.zeros(int(pause * sr), dtype=a.dtype)]; t += len(a) / sr + pause
sf.write(out / 'narration.wav', np.concatenate(chunks), sr)
(out / 'phrases.json').write_text(json.dumps(rows, indent=1))
for r in rows: print(f"{r['start']:6.2f}-{r['end']:6.2f}  {r['text']}")
print('total', round(t, 2))
