"""WhatIfMan #1 narration. Kokoro, one clip per phrase, placed on the 60 s timeline.
Countdown is derived from the audio: Z (zero) = notification time + N0, and every spoken number = what the phone shows then.
Writes audio/voice-*.wav and timing.json (phrases, t_notify, zero)."""
import json, math, sys, pathlib
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro, EspeakConfig
OUT = pathlib.Path(sys.argv[1]); (OUT / 'audio').mkdir(parents=True, exist_ok=True)
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'am_michael'
K = pathlib.Path.home() / 'dev/masked-and-undefined/tools/kokoro'
k = Kokoro(str(K / 'kokoro-v1.0.onnx'), str(K / 'voices-v1.0.bin'),
           espeak_config=EspeakConfig(lib_path='/opt/homebrew/lib/libespeak-ng.dylib', data_path='/opt/homebrew/share/espeak-ng-data'))
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = {2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty'}
def words(n): return ONES[n] if n < 20 else TENS[n // 10] + ('' if n % 10 == 0 else '-' + ONES[n % 10])
def trim(a, sr, keep=.03):
    i = np.where(np.abs(a) > .01)[0]; return a[max(0, i[0] - int(keep * sr)): i[-1] + int(keep * sr)]
cache = {}
def say(text):
    if text not in cache: a, sr = k.create(text, voice=VOICE, speed=1.0, lang='en-us'); cache[text] = trim(a, sr)
    return cache[text]
SR = 24000
# (key, text, anchor seconds or None, gap after previous). {N} = remaining seconds at the moment the phrase starts.
SCRIPT = [
 ('s1a', "Bro, imagine you're just lying in bed,", 0.35, 0), ('s1b', "doing absolutely nothing…", None, .1), ('s1c', "and your phone sends you this.", None, .12),
 ('s2a', "Obviously, he thinks it's some dumb prank.", 7.1, 0), ('s2b', "He closes the app.", None, .25), ('s2c', "Opens it again.", None, .3),
 ('s2d', "Same message.", None, .25), ('s2e', "{N} seconds left.", None, .2),
 ('s3a', "So he runs outside.", 15.3, 0), ('s3b', "And literally one second later,", None, .25), ('s3c', "a flowerpot smashes into the ground", None, .05),
 ('s3d', "right where he was about to step.", None, .05), ('s3e', "Okay.", 22.4, 0), ('s3f', "Not funny anymore.", None, .35),
 ('s4a', "Now he's running around like a maniac,", 25.3, 0), ('s4b', "dodging literally everything.", None, .1), ('s4c', "Cars.", None, .3),
 ('s4d', "Buildings.", None, .45), ('s4e', "Other people.", None, .45), ('s4f', "Then he checks the phone again.", None, .5),
 ('s5a', "{N} seconds left.", 37.4, 0), ('s5b', "He hides in the safest place he can find.", None, .3), ('s5c', "Locks the door.", None, .35),
 ('s5d', "Sits down.", None, .4), ('s5e', "And just… waits.", None, .4),
 ('s6a', "Zero.", 'Z', 0), ('s6b', "Nothing happens.", '+1.2', 0), ('s6c', "He starts laughing.", '+0.7', 0), ('s6d', "Then his phone buzzes again.", '+0.8', 0),
]
nums = {}
for it in range(4):
    rows, t = [], 0.0; t_notify = zero = None
    for key, text, anchor, gap in SCRIPT:
        if anchor == 'Z': start = zero
        elif isinstance(anchor, str): start = t + float(anchor)
        elif anchor is not None: start = max(anchor, t + .2)
        else: start = t + gap
        txt = text.replace('{N}', words(nums.get(key, 30)).capitalize())
        a = say(txt); end = start + len(a) / SR
        rows.append({'key': key, 'text': txt, 'start': round(start, 3), 'end': round(end, 3)}); t = end
        if key == 's1c':
            t_notify = round(end + .15, 3); n0 = round(49.6 - t_notify); zero = round(t_notify + n0, 3)
    changed = False
    for r in rows:
        if '{N}' in dict((s[0], s[1]) for s in SCRIPT)[r['key']]:
            n = math.ceil(zero - r['start'] - 1e-6)
            if nums.get(r['key']) != n: nums[r['key']] = n; changed = True
    if not changed: break
for r in rows: print(f"{r['start']:6.2f}-{r['end']:6.2f}  {r['text']}")
print("notify", t_notify, "zero", zero); assert rows[-1]["end"] < 57.0
buf = np.zeros(int(60 * SR), dtype=np.float32)
for r in rows:
    a = say(r['text']); i = int(r['start'] * SR); buf[i:i + len(a)] += a
sf.write(OUT / 'audio/voice.wav', buf, SR)
json.dump({'voice': VOICE, 'phrases': rows, 't_notify': t_notify, 'zero': zero, 'n0': n0}, open(OUT / 'timing.json', 'w'), indent=1)
for r in rows: print(f"{r['start']:6.2f}-{r['end']:6.2f}  {r['text']}")
print('notify', t_notify, 'zero', zero, 'N0', n0)
