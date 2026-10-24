"""Sound + music for 'What If You Disappeared…' (no voice). Everything synthesized; times from build/events.json."""
import json, sys, pathlib
import numpy as np, soundfile as sf
ROOT = pathlib.Path(sys.argv[1]); SR = 44100; DUR = 34.5; N = int(DUR * SR); rng = np.random.default_rng(11)
t_ = lambda d: np.arange(int(d * SR)) / SR
def band(x, lo, hi): X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def noise(d, lo=20, hi=16000): return band(rng.standard_normal(int(d * SR)), lo, hi)
def env(n, a=.005, r=.1): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def norm(x, p=1.): m = np.max(np.abs(x)) or 1; return x / m * p
def tone(f, d): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(np.asarray(f, float), t_(d).shape)) / SR)
def pluck(f, d=1.6, g=1.):  # soft felt-piano-ish note
    n = int(d * SR); x = sum(tone(f * h, d) * a for h, a in [(1, 1), (2, .35), (3, .12), (4, .05)]); return x * env(n, .004, .55) * g
def pad(fs, d, g=1.):
    n = int(d * SR); t = t_(d); x = sum(tone(f, d) + .5 * tone(f * 1.003, d) for f in fs) / len(fs)
    return x * np.minimum(1, np.minimum(t / .8, (d - t) / .9)).clip(0) * g
def fx(k):
    if k == 'glitch':
        d = .55; n = int(d * SR); x = np.sign(np.sin(2 * np.pi * np.repeat(rng.uniform(90, 2400, 18), n // 18 + 1)[:n] * t_(d))) * .7 + rng.standard_normal(n) * .5
        return norm(band(x, 80, 9000) * (rng.random(n // 300 + 1).repeat(300)[:n] > .3) * env(n, .001, .35), .8)
    if k == 'phonedrop': x = noise(.25, 800, 7000) * env(int(.25 * SR), .0005, .02); y = np.roll(np.pad(x * .5, (0, 4000)), int(.11 * SR))[:len(x)]; return norm(x + y + .5 * tone(190, .25) * env(int(.25 * SR), .001, .03), .6)
    if k == 'feed':  # busy whoosh + quick muted pings under the scroll
        d = .8; n = int(d * SR); x = band(rng.standard_normal(n), 400, 5000) * .4
        for o in np.arange(0, d - .1, .07): i = int(o * SR); s = tone(rng.choice([1320, 1568, 1760]), .08) * env(int(.08 * SR), .002, .03) * .5; x[i:i + len(s)] += s
        return norm(x * env(n, .01, .6), .45)
    if k == 'cut': return norm(tone(45, .5) * env(int(.5 * SR), .002, .12), .35)
    if k == 'poweroff': return norm(tone(np.linspace(880, 330, int(.25 * SR)), .25) * env(int(.25 * SR), .003, .12), .3)
    if k == 'poweron': return norm(np.concatenate([tone(523, .12) * env(int(.12 * SR), .003, .08), tone(784, .3) * env(int(.3 * SR), .003, .15)]), .3)
    if k == 'draweropen': d = .35; return norm(band(rng.standard_normal(int(d * SR)), 200, 2500) * np.sin(np.linspace(0, np.pi, int(d * SR))), .3)
    if k == 'drawerclose': x = tone(95, .3) * env(int(.3 * SR), .001, .06) + noise(.3, 100, 3000) * env(int(.3 * SR), .0005, .025); return norm(x, .75)
    if k == 'clock': return norm(noise(.03, 2000, 8000) * env(int(.03 * SR), .0005, .005), .18)
    if k == 'step': return norm(noise(.08, 60, 900) * env(int(.08 * SR), .002, .02) + .5 * tone(85, .08) * env(int(.08 * SR), .002, .025), .22)
    if k == 'clink': return norm(sum(tone(f, .5) * g for f, g in [(2400, 1), (3700, .5), (5100, .3)]) * env(int(.5 * SR), .0005, .12), .25)
    if k == 'birds':
        d = 1.2; x = np.zeros(int(d * SR))
        for o in [.05, .25, .7]: s = tone(3000 + 900 * np.sin(2 * np.pi * 14 * t_(.14)), .14) * np.sin(np.linspace(0, np.pi, int(.14 * SR))); i = int(o * SR); x[i:i + len(s)] += s
        return norm(x, .12)
    if k == 'knock': x = tone(110, .2) * env(int(.2 * SR), .001, .04) + noise(.2, 80, 1500) * env(int(.2 * SR), .0005, .02); return norm(x, .85)
    if k == 'dooropen': d = .6; return norm(tone(np.linspace(420, 300, int(d * SR)) + 20 * np.sin(2 * np.pi * 30 * t_(d)), d) * np.sin(np.linspace(0, np.pi, int(d * SR))) * .3 + noise(d, 100, 800) * .2, .25)
    if k == 'cups': return norm(sum(tone(f, .4) for f in [1900, 2950]) * env(int(.4 * SR), .0005, .1), .2)
    if k == 'notif': return norm(tone(rng.choice([1318.5, 1568, 1760, 2093]), .12) * env(int(.12 * SR), .002, .05), .35)
    if k == 'swipe': d = .15; return norm(band(rng.standard_normal(int(d * SR)), 900, 6000) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2, .15)
    if k == 'tap': return norm(noise(.03, 1000, 6000) * env(int(.03 * SR), .0005, .006), .25)
    if k == 'ring': return norm((tone(440, .4) + tone(480, .4)) * env(int(.4 * SR), .01, .3), .18)
    if k == 'pickup': return norm(noise(.05, 800, 5000) * env(int(.05 * SR), .0005, .01), .25)
    if k in ('stop', 'warm'): return np.zeros(10)
    raise ValueError(k)
C3, E3, G3, A3, B3, C4, D4, E4, F3, G4, A4, B4, C5, D5, E5 = 130.8, 164.8, 196, 220, 246.9, 261.6, 293.7, 329.6, 174.6, 392, 440, 493.9, 523.3, 587.3, 659.3
def music(name, a, b):
    d = b - a; n = int(d * SR); x = np.zeros(n + SR * 3)
    def put(sig, at):
        i = int(at * SR)
        if i >= len(x): return
        m = min(len(sig), len(x) - i); x[i:i + m] += sig[:m]
    if name == 'reconnect':   # sparse, unsure at first, warmer from Day 15 (≈4.8 s in)
        chords = [(C3, E3, G3, B3), (A3 / 2 * 2, C4, E4), (F3, A3, C4, E4), (G3, B3, D4)]
        for k, ch in enumerate(chords * 2):
            at = k * 2.4; put(pad(ch, 2.9, .22 if k < 2 else .32), at)
        notes = [(0.3, E4), (1.5, G4), (2.9, C5), (4.0, A4), (5.4, E5), (6.1, C5), (7.2, D5), (8.0, B4), (9.4, C5), (10.2, E5)]
        for at, f in notes: put(pluck(f, 1.8, .5 if at < 4 else .7), at)
        x[:n] *= np.minimum(1, np.minimum(t_(d) / 1.2, (d - t_(d)) / 0.7)).clip(0)
    if name == 'resolve':     # restrained: Fmaj7 -> C(add9), a few notes, lands and holds
        put(pad((F3, A3, C4, E4), 3.6, .3), 0.0); put(pad((C3, G3, D4, E4), 4.6, .34), 3.3)
        for at, f in [(0.6, A4), (1.7, C5), (3.4, E5), (4.4, D5), (5.6, C5)]: put(pluck(f, 2.4, .6), at)
        tt = t_(d); x[:n] *= np.minimum(1, np.minimum(tt / .9, (d - tt) / .5)).clip(0)
    return x[:n]
ev = json.load(open(ROOT / 'build/events.json'))
hits = np.zeros(N); beds = np.zeros(N); mus = np.zeros(N)
for e in ev:
    if e['kind'] == 'bed':
        d = e['b'] - e['a']; x = norm(band(rng.standard_normal(int(d * SR)), 20, 400)) * .02 * e['gain']; tt = t_(d); x *= np.minimum(1, np.minimum(tt / .3, (d - tt) / .3)).clip(0); i = int(e['a'] * SR); beds[i:i + len(x)] += x
    elif e['kind'] == 'music':
        x = music(e['name'], e['a'], e['b']) * e['gain']; i = int(e['a'] * SR); mus[i:i + len(x)] += x[:N - i]
    else:
        x = fx(e['kind']) * e['gain']; i = int(e['t'] * SR); hits[i:i + len(x)] += x[:max(0, N - i)]
mix = hits + beds + norm(mus, .32)
mix[int(24.45 * SR):int(24.47 * SR)] *= np.linspace(1, 0, int(.02 * SR))
mix[int(24.47 * SR):int(26.0 * SR)] = 0                                         # the drop: true silence while the message lands
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
sf.write(ROOT / 'build/mix.wav', mix.astype(np.float32), SR)
print('mix', DUR, 's peak', round(float(np.abs(mix).max()), 3))
