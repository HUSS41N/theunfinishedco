"""Procedural sound design for WhatIfMan #1: every effect is synthesized here (no samples), placed at the times the
renderer logged in build/events.json, ducked under the narration, and mixed with audio/voice.wav -> build/mix.wav."""
import json, sys, pathlib
import numpy as np, soundfile as sf

ROOT = pathlib.Path(sys.argv[1]); SR = 44100; N = int(60 * SR)
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR

def band(x, lo, hi):  # brick-wall band-pass in the frequency domain (fine for noise beds and effects)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def noise(d, lo=20, hi=16000): return band(rng.standard_normal(int(d * SR)), lo, hi)
def env(n, a=0.005, r=0.1):  # attack / exponential release
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4)); return e
def norm(x, peak=1.0): m = np.max(np.abs(x)) or 1; return x / m * peak
def tone(f, d, shape=np.sin): t = t_(d); return shape(2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR)

def fx(kind):
    if kind == 'tick':   x = noise(0.03, 2500, 9000) * env(int(.03 * SR), .0005, .006) + 0.5 * tone(1800, .03) * env(int(.03 * SR), .0005, .004); return norm(x, .5)
    if kind == 'step':   x = noise(.09, 60, 900) * env(int(.09 * SR), .002, .025) + .6 * tone(85, .09) * env(int(.09 * SR), .002, .03); return norm(x, .35)
    if kind == 'crunch': return norm(sum(np.roll(np.pad(noise(.05, 1500, 8000) * env(int(.05 * SR), .001, .012), (0, int(.25 * SR))), int(k * .05 * SR)) for k in range(4)), .45)
    if kind == 'buzz':   t = t_(.5); x = np.sign(np.sin(2 * np.pi * 160 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * t))); return norm(band(x, 80, 900) * env(len(t), .01, .4), .35)
    if kind == 'ping':   a = tone(1318.5, .16) * env(int(.16 * SR), .002, .07); b = tone(1760, .32) * env(int(.32 * SR), .002, .14); return norm(np.concatenate([a, b]), .5)
    if kind == 'swipe':  d = .22; return norm(band(rng.standard_normal(int(d * SR)), 900, 6000) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2, .25)
    if kind == 'tap':    return norm(noise(.04, 1000, 6000) * env(int(.04 * SR), .0005, .008), .3)
    if kind == 'chuckle': d = .16; return norm(band(rng.standard_normal(int(d * SR)), 300, 2500) * np.sin(np.linspace(0, np.pi, int(d * SR))), .12)
    if kind == 'door':   x = noise(.35, 100, 1200) * env(int(.35 * SR), .01, .12) + .4 * tone(np.linspace(300, 180, int(.35 * SR)), .35) * env(int(.35 * SR), .02, .1); return norm(x, .35)
    if kind == 'whoosh': d = .55; x = band(rng.standard_normal(int(d * SR)), 300, 4000) * np.linspace(.1, 1, int(d * SR)) ** 2; return norm(x, .3)
    if kind == 'smash':
        d = 1.2; n = int(d * SR); x = noise(d, 40, 5000) * env(n, .001, .09) + 1.2 * tone(55, d) * env(n, .001, .18)
        for k in range(9):  # ceramic shards
            o = int(rng.uniform(.01, .35) * SR); f = rng.uniform(2200, 5200); s = tone(f, .25) * env(int(.25 * SR), .0005, .04) * rng.uniform(.2, .5); x[o:o + len(s)] += s[:n - o]
        return norm(x, 1.0)
    if kind == 'skid':   d = 1.0; n = int(d * SR); sq = tone(900 + 60 * np.sin(2 * np.pi * 9 * t_(d)), d) * .35 + band(rng.standard_normal(n), 1500, 4000); eng = band(tone(np.linspace(140, 70, n), d, lambda p: 2 * (p / (2 * np.pi) % 1) - 1), 40, 600) * .8; return norm((sq + eng) * np.sin(np.linspace(0, np.pi, n)) ** .5, .8)
    if kind == 'horn':   d = .45; n = int(d * SR); saw = lambda f: 2 * (np.cumsum(np.full(n, f)) / SR % 1) - 1; return norm(band(saw(392) + saw(494), 200, 3000) * env(n, .01, .5) * (t_(d) < .42), .45)
    if kind == 'bang':   x = noise(.4, 60, 3000) * env(int(.4 * SR), .001, .06) + tone(110, .4) * env(int(.4 * SR), .001, .08); return norm(x, .7)
    if kind == 'yelp':   return np.zeros(10)
    if kind == 'thud':   x = tone(70, .35) * env(int(.35 * SR), .002, .08) + noise(.35, 60, 1500) * env(int(.35 * SR), .001, .04); return norm(x, .7)
    if kind == 'glitch':
        d = .7; n = int(d * SR); x = np.sign(np.sin(2 * np.pi * np.repeat(rng.uniform(80, 1400, 14), n // 14 + 1)[:n] * t_(d))) * .6 + rng.standard_normal(n) * .4
        return norm(band(x, 100, 7000) * (rng.random(n // 400 + 1).repeat(400)[:n] > .25) * env(n, .001, .5), .5)
    if kind == 'slam':
        d = 1.6; n = int(d * SR); x = tone(48, d) * env(n, .001, .25) * 1.2 + noise(d, 40, 2000) * env(n, .001, .05)
        for f, g in [(310, .4), (467, .3), (823, .2), (1290, .12)]: x += tone(f, d) * env(n, .001, .6) * g
        return norm(x, 1.0)
    if kind == 'bolt':   x = noise(.18, 1500, 8000) * env(int(.18 * SR), .0005, .02); s = tone(2100, .18) * env(int(.18 * SR), .0005, .05) * .5; return norm(x + s, .6)
    if kind == 'slide':  d = .9; return norm(band(rng.standard_normal(int(d * SR)), 150, 2500) * np.sin(np.linspace(0, np.pi, int(d * SR))), .2)
    if kind == 'zero':   return norm(tone(41, 1.2) * env(int(1.2 * SR), .005, .35), .35)
    if kind == 'sting':
        d = 3.2; n = int(d * SR); x = tone(36.7, d) * env(n, .003, 1.2) + .35 * (tone(233.1, d) + tone(246.9, d)) * env(n, .2, 1.4)
        return norm(x, .55)
    raise ValueError(kind)

def bed(name, a, b, rate=1.0):
    d = b - a; n = int(d * SR); t = t_(d)
    fade = np.minimum(1, np.minimum(t / .4, (d - t) / .4)).clip(0, 1)
    if name == 'room':   x = band(rng.standard_normal(n), 20, 300) * .5 + .15 * tone(120, d); g = .035
    elif name == 'street':
        x = band(rng.standard_normal(n), 30, 900)
        for c in rng.uniform(0, d, 5): x += band(rng.standard_normal(n), 100, 1200) * np.exp(-((t - c) / .9) ** 2) * 1.5  # distant cars passing
        g = .06
    elif name == 'hum':  x = .6 * tone(100, d) + .3 * tone(200, d) + band(rng.standard_normal(n), 40, 400) * .5; g = .03
    elif name == 'drone': x = (tone(55, d) + tone(58.3, d) + .5 * tone(110, d)) * (0.6 + 0.4 * np.sin(2 * np.pi * .15 * t)) * np.linspace(.4, 1, n); g = .06
    elif name == 'breath':
        ph = (t * rate) % 1; e = np.where(ph < .45, np.sin(ph / .45 * np.pi), .7 * np.sin((ph - .45) / .55 * np.pi)) ** 2
        x = band(rng.standard_normal(n), 350, 1900) * e; g = .12
    elif name == 'heart':
        x = np.zeros(n)
        for k in np.arange(0, d, 1 / 1.25):
            for off, amp in [(0, 1), (.22, .7)]:
                i = int((k + off) * SR); s = tone(52, .18) * env(int(.18 * SR), .004, .05) * amp; x[i:i + len(s)] += s[:max(0, n - i)]
        g = .22
    else: raise ValueError(name)
    return norm(x) * g * fade

voice, vsr = sf.read(ROOT / 'audio/voice.wav', dtype='float32')
voice = np.interp(np.arange(N) / SR, np.arange(len(voice)) / vsr, voice).astype(np.float32)
ev = json.load(open(ROOT / 'build/events.json'))
beds = np.zeros(N); hits = np.zeros(N)
for e in ev:
    if e['kind'] == 'bed':
        x = bed(e['name'], e['a'], e['b'], e.get('rate', 1)) * e['gain']; i = int(e['a'] * SR); beds[i:i + len(x)] += x[:N - i]
    else:
        x = fx(e['kind']) * e['gain']; i = int(e['t'] * SR); hits[i:i + len(x)] += x[:max(0, N - i)]
# duck the beds (not the hits) under the narration
venv = np.convolve(np.abs(voice), np.ones(int(.12 * SR)) / int(.12 * SR), mode='same'); venv = np.clip(venv / (venv.max() or 1) * 4, 0, 1)
mix = voice * 0.9 + beds * (1 - .55 * venv) + hits * 0.75
mix[int(59.45 * SR):] *= np.linspace(1, 0, N - int(59.45 * SR)) ** 4   # cut to black: the last sound dies with the picture
mix = np.tanh(mix * 1.1) / np.tanh(1.1)                                 # gentle limiter
sf.write(ROOT / 'build/mix.wav', mix.astype(np.float32), SR)
print('mix', round(len(mix) / SR, 3), 's  peak', round(float(np.abs(mix).max()), 3), ' events', len(ev))
