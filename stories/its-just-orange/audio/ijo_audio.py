# "It's Just Orange" soundtrack: SFX only, NO music and no musical instruments (owner's rule). Everything is synthesized
# here with numpy/scipy (dsp.py is shared from ../../trust-me-bro/audio/): wind, lava bubbling, whooshes, cloth flap,
# impact, sizzle, poof, crumble, record scratch, pop, footsteps, cartoon spring boing, crowd gasp, splash, final blop,
# plus gibberish voice blips on every syllable of every line. Timing is read from the picture's own table
# (src/videos/its-just-orange/timing.json), mixed to ~-14 LUFS at the exact video length.
# usage: python stories/its-just-orange/audio/ijo_audio.py out/ijo   -> out/ijo/mix.wav
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "trust-me-bro", "audio"))
import numpy as np  # noqa: E402
from scipy import ndimage  # noqa: E402
from dsp import (SR, TAU, ns, tt, rng, dbg, lp, hp, bp, pan, place, fades, widen, colored, smooth_noise, phase,  # noqa: E402
                 resbank, shape, integrated, true_peak, momentary_max, write_wav, curve)

OUT = sys.argv[1] if len(sys.argv) > 1 else "out/ijo"
T = json.load(open(os.path.join(HERE, "..", "..", "..", "src", "videos", "its-just-orange", "timing.json")))
FPS = T["fps"]
DUR = T["frames"] / FPS
N = ns(DUR)
R = rng(11)


def sec(f):
    return f / FPS


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


# ================================================================ beds
def wind(dur, r):
    n = ns(dur)
    x = colored(n, r, 1.0)
    g = 0.55 + 0.45 * smooth_noise(n, r, 0.35)
    y = bp(x, 180, 1400, 2) * g + 0.3 * bp(colored(n, r, 1.0), 900, 3000, 2) * np.clip(smooth_noise(n, r, 0.6), 0, 1)
    return widen(y, rng(3), 13, 0.7)


def blub(r, f0=None, dur=0.09):
    f0 = f0 or 90 + 140 * r.random()
    t = tt(dur)
    f = f0 * (1 + 1.6 * (t / dur) ** 0.7)
    y = np.sin(phase(f)) * np.exp(-t / (dur * 0.35)) * (1 - np.exp(-t / 0.004))
    return fades(y, 0.001, 0.01)


def lava_bed(dur, r):
    n = ns(dur)
    rumble = lp(colored(n, r, 2.0), 140, 2) * 1.6
    crack = np.zeros(n)
    for _ in range(int(dur * 18)):
        i = r.integers(0, n - 400)
        crack[i] += r.standard_normal() * 0.5
    crack = bp(crack, 1500, 6000, 2)
    y = rumble + 0.6 * crack
    st2 = pan(y, 0)
    t = 0.05
    while t < dur - 0.3:
        b = blub(r) * (0.35 + 0.5 * r.random())
        place(st2, pan(b, r.uniform(-0.6, 0.6)), t)
        t += r.exponential(0.22)
    return st2


# ================================================================ events
def whoosh(dur=0.45, r=None, lo=300, hi=3200):
    r = r or rng(3)
    t = tt(dur)
    nz = r.standard_normal(len(t))
    k = np.clip(t / dur, 0, 1)
    env = np.sin(np.pi * k ** 0.8) ** 2
    fc = lo + (hi - lo) * np.sin(np.pi * k)
    y = np.zeros_like(nz)
    for f0 in (350, 800, 1600, 3000):
        y += bp(nz, f0 * 0.7, f0 * 1.4, 2) * np.exp(-((fc - f0) / (0.6 * f0)) ** 2)
    return y * env


def cloth(dur, r):
    t = tt(dur)
    nz = bp(r.standard_normal(len(t)), 250, 2500, 2)
    flut = 0.5 + 0.5 * np.sign(np.sin(TAU * (16 + 6 * smooth_noise(len(t), r, 3)) * t))
    flut = lp(flut, 120)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.15)
    return nz * flut * env


def thud(r, f=60, dur=0.6):
    t = tt(dur)
    y = np.sin(phase(f * (1 + 1.5 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18)
    y += 0.7 * lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.025)
    return fades(y, 0.0005, 0.05)


def sizzle(r, dur=1.8):
    t = tt(dur)
    nz = hp(r.standard_normal(len(t)), 2500, 2)
    crack = np.zeros(len(t))
    for _ in range(int(dur * 120)):
        crack[r.integers(0, len(t) - 10)] += r.standard_normal() * 3
    crack = hp(crack, 1500, 2)
    env = (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.7)
    flick = 0.7 + 0.3 * smooth_noise(len(t), r, 25)
    return (nz * flick + 0.5 * crack) * env


def poof(r):
    t = tt(0.8)
    nz = r.standard_normal(len(t))
    y = lp(nz, 1300, 2) * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.004))
    y += 0.6 * lp(nz, 260, 2) * np.exp(-t / 0.2)
    return fades(y, 0.001, 0.1)


def crumble(r):
    out = np.zeros(ns(0.6))
    for i in range(14):
        t0 = 0.02 + i * 0.03 + r.random() * 0.02
        g = tt(0.03)
        grain = bp(r.standard_normal(len(g)), 1200 + 2500 * r.random(), 6000, 2) * np.exp(-g / 0.006) * (1 - i / 16)
        place_m(out, grain, t0)
    place_m(out, 0.5 * thud(r, 110, 0.25), 0.0)
    return out


def place_m(buf, x, t):
    i = ns(t)
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i:i + m] += x[:m]


def scratch(r):
    # vinyl-style scratch: a band of noise whose centre follows a fast forward-back "hand" motion
    dur = 0.55
    n = ns(dur)
    t = np.arange(n) / SR
    speed = np.interp(t, [0, 0.08, 0.16, 0.2, 0.3, 0.42, 0.55], [0.2, 1.8, 0.1, 1.5, 0.15, 0.9, 0.0])
    src = colored(n, r, 0.5)
    src = src + 0.6 * np.sign(np.sin(TAU * 140 * np.cumsum(speed) / SR)) * 0.4

    def g(times, freqs):
        fc = np.interp(times, t, 400 + 2200 * speed)
        return np.exp(-((freqs[:, None] - fc[None, :]) / (0.35 * fc[None, :])) ** 2) * np.interp(times, t, np.minimum(1, speed * 1.5))[None, :]
    y = shape(src, g)[:n]
    return fades(y, 0.002, 0.05)


def pop(r):
    t = tt(0.16)
    y = np.sin(phase(900 * np.exp(-t / 0.03) + 250)) * np.exp(-t / 0.035)
    y += 0.5 * hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.003)
    return fades(y, 0.0003, 0.02)


def step(r):
    t = tt(0.12)
    y = np.sin(phase(95 * (1 + np.exp(-t / 0.01)))) * np.exp(-t / 0.03) + 0.5 * bp(r.standard_normal(len(t)), 600, 3500) * np.exp(-t / 0.012)
    return fades(y, 0.0003, 0.02)


def boing(dur=0.75, f0=170.0, depth=0.4, rate=12.0):
    t = tt(dur)
    f = f0 * (1 + depth * np.exp(-t / 0.25) * np.sin(TAU * rate * t)) * (1 + 0.6 * np.exp(-t / 0.05))
    y = np.sin(phase(f)) + 0.35 * np.sin(2 * phase(f))
    return fades(y * np.exp(-t / 0.28) * (1 - np.exp(-t / 0.004)), 0.001, 0.05)


def gasp(r):
    # crowd gasp: ~16 breathy inhaled "hah"s with a little voicing, scattered in time and across the stereo field
    out = np.zeros((2, ns(1.1)))
    for v in range(16):
        dur = 0.35 + 0.25 * r.random()
        t = tt(dur)
        nz = r.standard_normal(len(t))
        f0 = 170 + 160 * r.random()
        voiced = np.sign(np.sin(phase(f0 * (1 + 0.15 * t / dur)))) * 0.25
        f1, f2 = 700 + 200 * r.random(), 1150 + 300 * r.random()
        y = resbank(nz + voiced, [(f1, 6, 1.0), (f2, 8, 0.7), (2600, 6, 0.3)])
        env = np.minimum(1, t / 0.05) * np.exp(-np.maximum(0, t - 0.08) / 0.18)
        place(out, pan(y * env * (0.6 + 0.4 * r.random()), r.uniform(-0.8, 0.8)), 0.08 * r.random())
    return out


def splash(r, k=1.0):
    t = tt(0.7)
    y = lp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.003))
    y += 0.8 * np.sin(phase(70 * (1 + np.exp(-t / 0.02)))) * np.exp(-t / 0.15)
    out = y.copy()
    for i in range(4):
        b = blub(r, 120 + 120 * r.random(), 0.08)
        place_m(out, 0.5 * b, 0.05 + 0.08 * i)
    return fades(out * k, 0.0005, 0.05)


def blop(r):
    t = tt(0.35)
    f = 150 + 420 * (1 - np.exp(-t / 0.05))
    y = np.sin(phase(f)) * np.exp(-t / 0.08) * (1 - np.exp(-t / 0.003))
    y += 0.3 * lp(r.standard_normal(len(t)), 600) * np.exp(-t / 0.03)
    return fades(y, 0.0005, 0.05)


# ================================================================ gibberish voice blips
VOICE = {"noob": (250, 0.0), "pro": (150, -0.25), "dev": (430, 0.15)}
VOWELS = [(800, 1200), (500, 1700), (350, 2200), (450, 900), (650, 1600), (300, 800)]


def blip(r, f0, dur, loud=False):
    t = tt(dur)
    if loud:
        f0 *= 1.45
    f = f0 * (1 + 0.18 * np.sin(np.pi * t / dur) * (1 if r.random() > 0.4 else -0.6)) * (1 + 0.01 * r.standard_normal(len(t)).cumsum() / np.sqrt(len(t)))
    ph = phase(f)
    src = 2 * ((ph / TAU) % 1.0) - 1  # glottal-ish sawtooth
    src += 0.04 * r.standard_normal(len(t))
    f1, f2 = VOWELS[r.integers(len(VOWELS))]
    y = resbank(src, [(f1, 5, 1.0), (f2, 9, 0.6), (2800, 8, 0.2)])
    y = norm(y)
    if loud:
        y = np.tanh(2.6 * y)
    env = np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.03)
    return y * env


# ================================================================ build
def build():
    mix = np.zeros((2, N))
    r = R

    def put(x, f, db, p=0.0):
        x = pan(x, p) if x.ndim == 1 else x
        place(mix, x * dbg(db), sec(f))

    # beds with a near-silent comedy hold in beat 4 (196 -> 250)
    cues = {c["k"]: c for c in T["cues"]}
    s_in, s_out = sec(cues["silence_in"]["f"]), sec(cues["silence_out"]["f"])
    bedgain = curve(N, [(0, 1), (s_in, 1), (s_in + 0.25, dbg(-30)), (s_out - 0.1, dbg(-30)), (s_out, 1), (DUR, 1)])
    # lava louder in the lava beats (3 and 8)
    lavag = curve(N, [(0, 0.7), (sec(130), 0.7), (sec(134), 1.3), (sec(190), 1.0), (sec(510), 0.9), (sec(560), 1.4), (DUR, 1.4)])
    mix += wind(DUR, r)[:, :N] * dbg(-25) * bedgain
    mix += lava_bed(DUR, r)[:, :N] * dbg(-20) * bedgain * lavag

    for c in T["cues"]:
        f, k = c["f"], c["k"]
        if k == "whoosh":
            put(whoosh(0.45, r), f - 4, -6, 0.2)
        elif k == "whoosh_small":
            put(whoosh(0.25, r, 500, 4000), f - 2, -12, -0.1)
        elif k == "cloth":
            put(cloth(sec(c["len"]), r), f, -16, 0.1)
        elif k == "impact":
            put(thud(r, 55, 0.8), f, -2)
        elif k == "sizzle":
            put(widen(sizzle(r), rng(5), 9, 0.6), f, -8)
        elif k == "poof":
            put(poof(r), f, -8)
        elif k == "crumble":
            put(crumble(r), f, -14, 0.3)
        elif k == "scratch":
            put(scratch(r), f - 3, -5)
        elif k == "pop":
            put(pop(r), f, -6)
        elif k == "steps":
            for i, s in enumerate(range(f, f + c["len"], 3)):
                put(step(r) * (0.8 + 0.4 * r.random()), s, -12, -0.25 if i % 2 else 0.25)
        elif k == "boing":
            put(boing(), f, -8)
        elif k == "gasp":
            put(gasp(r), f, -10)
        elif k == "splash":
            put(splash(r, 0.8), f + 10, -9)
        elif k == "blop":
            put(blop(r), f, -4)

    # gibberish blips on every syllable
    for line in T["lines"]:
        f0, p = VOICE[line["who"]]
        syl = line["syl"]
        for i, s in enumerate(syl):
            nxt = syl[i + 1] if i + 1 < len(syl) else s + 7
            loud = i in line["loud"]
            last_hold = loud and i == len(syl) - 1
            dur = min(0.32, sec(nxt - s) * 0.85) if not last_hold else sec(line["end"] - 6 - s)
            dur = max(0.07, dur)
            put(blip(r, f0 * (1 + 0.06 * r.standard_normal()), dur, loud), s, -8 if loud else -10, p)
    return mix


def limiter(x, ceil_db=-1.2, release=0.08):
    ceil = dbg(ceil_db)
    a = np.max(np.abs(x), axis=0)
    peak = ndimage.maximum_filter1d(a, size=2 * ns(0.003) + 1)
    g = np.minimum(1.0, ceil / (peak + 1e-12))
    g = ndimage.minimum_filter1d(g, size=ns(0.004))
    k = np.exp(-1 / (release * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * k
        out[i] = cur
    return x * out[None, :]


def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    mix = hp(build(), 35, 2)
    for _ in range(4):
        mix *= dbg(-14.0 - integrated(mix))
        mix = limiter(mix, -1.5)
    mix = fades(mix[:, :N], 0.005, 0.2)
    write_wav(os.path.join(outdir, "mix.wav"), mix)
    print(f"mix: {mix.shape[1] / SR:.3f} s, integrated {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP, max momentary {momentary_max(mix):.1f}")


if __name__ == "__main__":
    main(OUT)
