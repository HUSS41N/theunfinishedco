"""What If kit — sound. Mixes build/events.json (written by the scene) into build/mix.wav.
Everything is synthesized here (no samples, no licences). Usage:
    ~/dev/masked-and-undefined/tools/.venv/bin/python -I ~/dev/stickman-videos/whatif-kit/sfx.py <video dir>
Event kinds: see FX below. Beds: room street crowd wind hum rain. Music moods: tender eerie playful tense resolve.
A {"kind":"silence","a":..,"b":..} event (via the scene's bed('silence', a, b)) forces true silence in that window."""
import json, sys, pathlib
import numpy as np, soundfile as sf

ROOT = pathlib.Path(sys.argv[1]); SR = 44100; rng = np.random.default_rng(13)
meta = json.load(open(ROOT / 'build/events.json')); DUR = meta['duration']; N = int(DUR * SR); EV = meta['events']
t_ = lambda d: np.arange(int(d * SR)) / SR
def band(x, lo, hi): X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def noise(d, lo=20, hi=16000): return band(rng.standard_normal(max(1, int(d * SR))), lo, hi)
def env(n, a=.005, r=.1): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def norm(x, p=1.): m = np.max(np.abs(x)) or 1; return x / m * p
def tone(f, d): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(np.asarray(f, float), t_(d).shape)) / SR)
def arc(n, p=1): return np.sin(np.linspace(0, np.pi, n)) ** p
def n_(d): return int(d * SR)

def fx(k):
    if k == 'tick':      return norm(noise(.03, 2500, 9000) * env(n_(.03), .0005, .006) + .5 * tone(1800, .03) * env(n_(.03), .0005, .004), .45)
    if k == 'clock':     return norm(noise(.03, 2000, 8000) * env(n_(.03), .0005, .005), .2)
    if k == 'step':      return norm(noise(.08, 60, 900) * env(n_(.08), .002, .02) + .5 * tone(85, .08) * env(n_(.08), .002, .025), .25)
    if k == 'tap':       return norm(noise(.03, 1000, 6000) * env(n_(.03), .0005, .006), .25)
    if k == 'pop':       return norm(tone(np.linspace(500, 1100, n_(.09)), .09) * env(n_(.09), .002, .03), .35)
    if k == 'ping':      return norm(np.concatenate([tone(1318.5, .14) * env(n_(.14), .002, .06), tone(1760, .3) * env(n_(.3), .002, .13)]), .45)
    if k == 'notif':     return norm(tone(rng.choice([1318.5, 1568, 1760, 2093]), .12) * env(n_(.12), .002, .05), .35)
    if k == 'buzz':      t = t_(.5); x = np.sign(np.sin(2 * np.pi * 160 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * t))); return norm(band(x, 80, 900) * env(len(t), .01, .4), .35)
    if k == 'swipe':     return norm(band(rng.standard_normal(n_(.15)), 900, 6000) * arc(n_(.15), 2), .18)
    if k == 'whoosh':    return norm(band(rng.standard_normal(n_(.5)), 300, 4000) * np.linspace(.1, 1, n_(.5)) ** 2, .3)
    if k == 'knock':     return norm(tone(110, .2) * env(n_(.2), .001, .04) + noise(.2, 80, 1500) * env(n_(.2), .0005, .02), .85)
    if k == 'dooropen':  d = .6; return norm(tone(np.linspace(420, 300, n_(d)) + 20 * np.sin(2 * np.pi * 30 * t_(d)), d) * arc(n_(d)) * .3 + noise(d, 100, 800) * .2, .25)
    if k == 'doorclose': return norm(tone(80, .4) * env(n_(.4), .001, .07) + noise(.4, 60, 1500) * env(n_(.4), .0005, .03), .8)
    if k == 'thud':      return norm(tone(70, .35) * env(n_(.35), .002, .08) + noise(.35, 60, 1500) * env(n_(.35), .001, .04), .7)
    if k == 'brick':     return norm(tone(140, .3) * env(n_(.3), .001, .05) + noise(.3, 200, 3500) * env(n_(.3), .0005, .035) + noise(.3, 2000, 7000) * env(n_(.3), .02, .05) * .3, .8)
    if k == 'crumble':
        x = np.zeros(n_(1.2))
        for o in rng.uniform(0, .8, 7):
            i = int(o * SR); s = fx('brick') * rng.uniform(.3, .8); m = min(len(s), len(x) - i); x[i:i + m] += s[:m]
        return norm(x, .8)
    if k == 'coin':      return norm((tone(2637, .35) + .6 * tone(3520, .35)) * env(n_(.35), .001, .09), .3)
    if k == 'cash':      return norm(np.concatenate([fx('coin'), np.zeros(800), (tone(1046, .5) + tone(1568, .5)) * env(n_(.5), .002, .2)]), .5)
    if k == 'freeze':    d = .7; return norm(band(rng.standard_normal(n_(d)), 200, 6000) * np.linspace(1, 0, n_(d)) ** 3 + tone(np.linspace(900, 120, n_(d)), d) * np.linspace(1, 0, n_(d)) * .6, .5)
    if k == 'unfreeze':  return norm(fx('freeze')[::-1], .5)
    if k == 'glitch':
        d = .55; n = n_(d); x = np.sign(np.sin(2 * np.pi * np.repeat(rng.uniform(90, 2400, 18), n // 18 + 1)[:n] * t_(d))) * .7 + rng.standard_normal(n) * .5
        return norm(band(x, 80, 9000) * (rng.random(n // 300 + 1).repeat(300)[:n] > .3) * env(n, .001, .35), .7)
    if k == 'rumble':    d = 1.6; return norm(band(rng.standard_normal(n_(d)), 20, 160) * arc(n_(d)), .6)
    if k == 'boing':     d = .4; return norm(tone(220 + 90 * np.sin(2 * np.pi * 9 * t_(d)) * np.exp(-t_(d) * 5), d) * env(n_(d), .002, .2), .35)
    if k == 'splash':    return norm(noise(.6, 400, 8000) * env(n_(.6), .003, .15), .5)
    if k == 'sting':     d = 3.0; n = n_(d); return norm(tone(36.7, d) * env(n, .003, 1.1) + .35 * (tone(233.1, d) + tone(246.9, d)) * env(n, .2, 1.3), .55)
    if k == 'hit':       return norm(tone(45, .6) * env(n_(.6), .002, .14) + noise(.6, 30, 400) * env(n_(.6), .001, .05), .6)
    if k == 'chime':     return norm(sum(tone(f, 1.2) * g for f, g in [(1046.5, 1), (1568, .5), (2093, .25)]) * env(n_(1.2), .003, .35), .35)
    if k == 'heart':
        x = np.zeros(n_(.6))
        for o, a in [(0, 1), (.22, .7)]:
            i = int(o * SR); s = tone(52, .18) * env(n_(.18), .004, .05) * a; x[i:i + len(s)] += s
        return norm(x, .5)
    if k == 'breath':    d = 1.0; tt = t_(d); return norm(band(rng.standard_normal(n_(d)), 350, 1900) * np.sin(np.pi * tt / d) ** 2, .12)
    if k == 'chuckle':   return norm(band(rng.standard_normal(n_(.16)), 300, 2500) * arc(n_(.16)), .12)
    if k == 'scribble':  d = .5; return norm(band(rng.standard_normal(n_(d)), 1500, 7000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * t_(d)))), .15)
    if k == 'paper':     return norm(noise(.22, 1500, 8000) * env(n_(.22), .005, .06), .3)
    if k == 'clink':     return norm(sum(tone(f, .5) * g for f, g in [(2400, 1), (3700, .5), (5100, .3)]) * env(n_(.5), .0005, .12), .25)
    if k == 'birds':
        x = np.zeros(n_(1.2))
        for o in [.05, .25, .7]: s = tone(3000 + 900 * np.sin(2 * np.pi * 14 * t_(.14)), .14) * arc(n_(.14)); i = int(o * SR); x[i:i + len(s)] += s
        return norm(x, .12)
    if k == 'ring':      return norm((tone(440, .4) + tone(480, .4)) * env(n_(.4), .01, .3), .18)
    if k == 'click':     return norm(noise(.02, 2000, 9000) * env(n_(.02), .0002, .004), .3)
    if k == 'alarm':     d = .9; return norm(np.sign(np.sin(2 * np.pi * np.where((t_(d) * 6) % 1 < .5, 880, 660) * t_(d))) * .5 * arc(n_(d), .3), .3)
    if k == 'skid':      d = 1.0; n = n_(d); return norm((tone(900 + 60 * np.sin(2 * np.pi * 9 * t_(d)), d) * .35 + band(rng.standard_normal(n), 1500, 4000)) * arc(n, .5), .7)
    if k == 'car':       d = 1.4; return norm(band(rng.standard_normal(n_(d)), 80, 900) * arc(n_(d), 2), .5)
    if k == 'cut':       return norm(tone(45, .5) * env(n_(.5), .002, .12), .35)
    if k == 'flower':    return norm(tone(np.linspace(1200, 1800, n_(.12)), .12) * env(n_(.12), .002, .04), .15)
    raise ValueError(f'unknown sfx kind: {k}')

def bed(name, d):
    n = n_(d); t = t_(d)
    if name == 'room':   x = band(rng.standard_normal(n), 20, 400) * .5; g = .02
    elif name == 'street':
        x = band(rng.standard_normal(n), 30, 900)
        for c in rng.uniform(0, d, max(1, int(d / 4))): x += band(rng.standard_normal(n), 100, 1200) * np.exp(-((t - c) / .9) ** 2) * 1.5
        g = .05
    elif name == 'crowd':  x = band(rng.standard_normal(n), 200, 2500) * (0.7 + 0.3 * np.sin(2 * np.pi * .7 * t)); g = .04
    elif name == 'wind':   x = band(rng.standard_normal(n), 80, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * .13 * t + 1)); g = .05
    elif name == 'hum':    x = .6 * tone(100, d) + .3 * tone(200, d) + band(rng.standard_normal(n), 40, 400) * .5; g = .025
    elif name == 'rain':   x = band(rng.standard_normal(n), 1500, 9000); g = .035
    else: raise ValueError(name)
    return norm(x) * g * np.minimum(1, np.minimum(t / .35, (d - t) / .35)).clip(0)

NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate('C C# D D# E F F# G G# A A# B'.split())}
def hz(s): return NOTE[s[:-1]] * 2 ** (int(s[-1]) - 4)
def pluck(f, d=1.6, g=1.): n = n_(d); x = sum(tone(f * h, d) * a for h, a in [(1, 1), (2, .35), (3, .12), (4, .05)]); return x * env(n, .004, .5) * g
def pad(fs, d, g=1.): n = n_(d); t = t_(d); x = sum(tone(f, d) + .5 * tone(f * 1.003, d) for f in fs) / len(fs); return x * np.minimum(1, np.minimum(t / .8, (d - t) / .9)).clip(0) * g
MOODS = {  # chords (note names) cycled every `bar` s, melody notes as (beat, note)
    'tender':  dict(bar=2.4, chords=[['C3', 'E3', 'G3', 'B3'], ['A2', 'C3', 'E3', 'G3'], ['F2', 'A2', 'C3', 'E3'], ['G2', 'B2', 'D3']], mel=['E4', 'G4', 'C5', 'A4', 'E5', 'C5', 'D5', 'B4'], every=1.2, pg=.28, mg=.55),
    'resolve': dict(bar=3.2, chords=[['F2', 'A2', 'C3', 'E3'], ['C3', 'G3', 'D4', 'E4']], mel=['A4', 'C5', 'E5', 'D5', 'C5'], every=1.1, pg=.32, mg=.55),
    'eerie':   dict(bar=4.0, chords=[['A2', 'E3', 'A#3'], ['F2', 'C3', 'F#3']], mel=['E5', 'F5', 'B4', 'C5'], every=2.3, pg=.3, mg=.35),
    'playful': dict(bar=1.6, chords=[['C3', 'G3', 'E4'], ['F3', 'C4', 'A4'], ['G3', 'D4', 'B4'], ['C3', 'G3', 'E4']], mel=['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 'D5'], every=.4, pg=.18, mg=.4),
    'tense':   dict(bar=2.0, chords=[['D2', 'A2', 'D3'], ['D#2', 'A#2', 'D#3']], mel=['D4', 'D4', 'D#4', 'D4'], every=.25, pg=.3, mg=.22),
}
def music(mood, d):
    m = MOODS[mood]; x = np.zeros(n_(d) + SR * 3)
    def put(sig, at):
        i = int(at * SR)
        if i >= len(x): return
        k = min(len(sig), len(x) - i); x[i:i + k] += sig[:k]
    k = 0
    while k * m['bar'] < d: put(pad([hz(s) for s in m['chords'][k % len(m['chords'])]], m['bar'] + .6, m['pg']), k * m['bar']); k += 1
    j = 0
    while .3 + j * m['every'] < d - .3: put(pluck(hz(m['mel'][j % len(m['mel'])]), 1.6 if mood != 'tense' else .3, m['mg']), .3 + j * m['every']); j += 1
    t = t_(d); return x[:n_(d)] * np.minimum(1, np.minimum(t / 1.0, (d - t) / .8)).clip(0)

hits, beds, mus = np.zeros(N), np.zeros(N), np.zeros(N); silences = []
def place(buf, x, at): i = int(at * SR); k = max(0, min(len(x), N - i)); buf[i:i + k] += x[:k]
for e in EV:
    if e['kind'] == 'bed':
        if e['name'] == 'silence': silences.append((e['a'], e['b'])); continue
        place(beds, bed(e['name'], e['b'] - e['a']) * e['gain'], e['a'])
    elif e['kind'] == 'music': place(mus, music(e['mood'], e['b'] - e['a']) * e['gain'], e['a'])
    else: place(hits, fx(e['kind']) * e['gain'], e['t'])
mix = hits + beds + (norm(mus, .3) if np.any(mus) else mus)
for a, b in silences:
    i, j = int(a * SR), min(N, int(b * SR)); r = min(int(.02 * SR), j - i)
    mix[i:i + r] *= np.linspace(1, 0, r); mix[i + r:j] = 0
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
sf.write(ROOT / 'build/mix.wav', mix.astype(np.float32), SR)
print('mix', DUR, 's  peak', round(float(np.abs(mix).max()), 3))
