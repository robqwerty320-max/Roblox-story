"""SFX + voice mix for "What If Every Lie Made You BIGGER?".

NO music and NO musical instruments (owner's rule): everything is synthesized noise / impacts / foley with numpy+scipy
(dsp.py shared from ../../trust-me-bro/audio/). Event frames come from src/videos/lie-bigger/story.ts (KID_SIZE,
DAD_SIZE, COMIC, FLASH, SHOTS scene changes), so the sound always follows the picture.

python stories/lie-bigger/audio/sfx_mix.py out/lie      (needs out/lie/voice.wav from voice.py)
-> out/lie/sfx.wav (stem) + out/lie/mix.wav (voice + SFX, 48 kHz stereo, exact length, ~-14 LUFS)
"""
import os, re, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "trust-me-bro", "audio"))
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, pan, place, fades, widen, colored, smooth_noise, phase, resbank, integrated  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else "out/lie"
STORY = open(os.path.join(HERE, "..", "..", "..", "src", "videos", "lie-bigger", "story.ts"), encoding="utf-8").read()
FPS, FRAMES = 30, 1680
DUR = FRAMES / FPS
R = rng(23)


def sec(f):
    return f / FPS


def pairs(name):
    blk = STORY[STORY.index(f"export const {name}"):]
    blk = blk[: blk.index(";")]
    return [(int(a), float(b)) for a, b in re.findall(r"\[(\d+),\s*([\d.]+)\]", blk)]


KID = pairs("KID_SIZE")
DAD = pairs("DAD_SIZE")
COMIC = [(int(f), t) for f, t in re.findall(r'\{ f: (\d+), text: "([^"]+)"', STORY)]
SCENES = re.findall(r'\{ a: (\d+), b: (\d+), s: "(\w+)"', STORY)


# ================================================================ sounds (no tones from instruments: noise, thumps, foley)
def poof(r, big=1.0):
    t = tt(0.9)
    nz = r.standard_normal(len(t))
    body = lp(nz, 900 + 500 * big, 2) * np.exp(-t / (0.12 + 0.06 * big)) * (1 - np.exp(-t / 0.005))
    air = bp(nz, 1500, 6000, 2) * np.exp(-t / 0.08) * 0.5
    low = np.sin(phase(55 + 40 * np.exp(-t / 0.05))) * np.exp(-t / 0.2) * 0.6 * big
    return fades(body + air + low, 0.001, 0.12)


def stretch(r, dur=0.5):
    """fabric/rubber stretch when growing: band-noise creak rising"""
    t = tt(dur)
    nz = r.standard_normal(len(t))
    fc = 300 + 900 * (t / dur)
    y = np.zeros_like(nz)
    for f0 in (300, 600, 1000):
        y += bp(nz, f0 * 0.8, f0 * 1.25, 2) * np.exp(-((fc - f0) / (0.5 * f0)) ** 2)
    grit = 0.5 + 0.5 * np.sign(np.sin(TAU * (38 + 30 * t / dur) * t))
    return fades(y * lp(grit, 200) * np.sin(np.pi * t / dur), 0.005, 0.05)


def pfft(r):
    """deflate: air hiss falling in pitch"""
    t = tt(0.75)
    nz = r.standard_normal(len(t))
    fc = 3000 * np.exp(-t / 0.35) + 300
    y = np.zeros_like(nz)
    for f0 in (400, 900, 1800, 3200):
        y += bp(nz, f0 * 0.75, f0 * 1.3, 2) * np.exp(-((fc - f0) / (0.6 * f0)) ** 2)
    flut = 0.75 + 0.25 * np.sin(TAU * 28 * t)
    return fades(y * flut * np.minimum(1, t / 0.02) * np.exp(-t / 0.45), 0.002, 0.08)


def thud(r, f=60, dur=0.6):
    t = tt(dur)
    y = np.sin(phase(f * (1 + 1.5 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18)
    y += 0.7 * lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.025)
    return fades(y, 0.0005, 0.05)


def bonk(r):
    """head on plaster ceiling: dull thump + plaster crack + dust trickle"""
    out = thud(r, 75, 0.7) * 1.2
    crack = np.zeros(ns(0.7))
    for i in range(18):
        i0 = ns(0.01 + i * 0.012 + 0.02 * r.random())
        g = tt(0.02)
        place_m(crack, bp(r.standard_normal(len(g)), 1500, 7000, 2) * np.exp(-g / 0.004) * (1 - i / 20), sec(0) + i0 / SR)
    dust = hp(r.standard_normal(ns(0.7)), 3000) * np.exp(-tt(0.7) / 0.3) * 0.12
    return out + 0.7 * crack + dust


def crash(r):
    """roof breaking: big wood crunch + tile clatter"""
    out = thud(r, 50, 1.0) * 1.3
    for i in range(30):
        g = tt(0.05)
        grain = bp(r.standard_normal(len(g)), 500 + 3000 * r.random(), 7000, 2) * np.exp(-g / 0.01)
        place_m(out, grain * (1 - i / 34) * 0.8, 0.02 + i * 0.025 + 0.02 * r.random())
    return out


def place_m(buf, x, t):
    i = ns(t)
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i:i + m] += x[:m]


def whoosh(r, dur=0.4, lo=300, hi=3200):
    t = tt(dur)
    nz = r.standard_normal(len(t))
    k = np.clip(t / dur, 0, 1)
    fc = lo + (hi - lo) * np.sin(np.pi * k)
    y = np.zeros_like(nz)
    for f0 in (350, 800, 1600, 3000):
        y += bp(nz, f0 * 0.7, f0 * 1.4, 2) * np.exp(-((fc - f0) / (0.6 * f0)) ** 2)
    return y * np.sin(np.pi * k ** 0.8) ** 2


def sparkle(r, dur=0.7):
    """magic zap without bells: a fizz of short high noise ticks"""
    out = np.zeros(ns(dur))
    for i in range(40):
        g = tt(0.012)
        place_m(out, hp(r.standard_normal(len(g)), 5000, 2) * np.exp(-g / 0.003) * (1 - i / 44), dur * r.random() * 0.8)
    return out + 0.3 * whoosh(r, dur, 1500, 6000)[: len(out)]


def gasp(r, n=16):
    out = np.zeros((2, ns(1.1)))
    for v in range(n):
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


def room_tone(dur, r):
    n = ns(dur)
    return widen(lp(colored(n, r, 1.5), 500, 2) * 0.25, rng(4), 11, 0.5)


def outdoor(dur, r):
    n = ns(dur)
    x = colored(n, r, 1.0)
    g = 0.55 + 0.45 * smooth_noise(n, r, 0.3)
    y = bp(x, 200, 1600, 2) * g
    return widen(y, rng(5), 13, 0.7)


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


# ================================================================ build
def build():
    st = np.zeros((2, ns(DUR) + SR))
    # beds by scene (room tone indoors, breeze outdoors), crossfaded at cuts
    for a, b, s in SCENES:
        a, b = int(a), int(b)
        d = sec(b - a) + 0.1
        bed = room_tone(d, R) * 0.05 if s == "room" else outdoor(d, R) * 0.09
        bed = bed if bed.ndim == 2 else pan(bed, 0)
        n = bed.shape[1]
        fade = np.minimum(1, np.minimum(np.arange(n) / ns(0.05), (n - np.arange(n)) / ns(0.05)))
        place(st, bed * fade, sec(a))
    # growth: whoosh-in, POOF, stretch creak; bigger sizes = heavier
    prev = 1.0
    for f, v in KID + DAD:
        if f == 688:  # off-screen size jump at the cut to outside -> roof crash instead
            place(st, pan(norm(crash(R)) * 0.75, 0), sec(f + 2))
            prev = v
            continue
        if v > prev:
            big = min(1.6, v / 3)
            place(st, pan(norm(whoosh(R, 0.3, 600, 2600)) * 0.25, 0), sec(f) - 0.28)
            place(st, pan(norm(poof(R, big)) * (0.6 + 0.2 * big), 0), sec(f))
            place(st, pan(norm(stretch(R, 0.45)) * 0.22, 0.1), sec(f) + 0.05)
        else:
            place(st, pan(norm(pfft(R)) * 0.5, -0.1), sec(f))
        prev = v
        if (f, v) == DAD[-1]:
            prev = 1.0
    # comic words that are impacts
    for f, txt in COMIC:
        if txt.startswith("BONK"):
            place(st, pan(norm(bonk(R)) * 0.85, 0), sec(f))
        if txt.startswith("GASP"):
            place(st, gasp(R) * 0.6 / (np.max(np.abs(gasp(rng(9)))) + 1e-9), sec(f) - 0.05)
    # the "lie update" zap at the start, whooshes on the flash cuts
    place(st, pan(norm(sparkle(R)) * 0.35, 0.3), sec(92))
    place(st, pan(norm(poof(R, 0.4)) * 0.25, 0), sec(104))
    for f in (690, 1380):
        place(st, pan(norm(whoosh(R, 0.45)) * 0.35, 0), sec(f) - 0.3)
    return st[:, : ns(DUR)]


def main():
    os.makedirs(OUT, exist_ok=True)
    sfx = build()
    sf.write(os.path.join(OUT, "sfx.wav"), sfx.T, SR, subtype="PCM_24")
    v, vsr = sf.read(os.path.join(OUT, "voice.wav"), dtype="float32")
    assert vsr == SR, vsr
    v = np.pad(v, (0, max(0, ns(DUR) - len(v))))[: ns(DUR)]
    # duck the SFX beds slightly under the voice (sidechain-ish envelope)
    env = np.convolve(np.abs(v), np.ones(ns(0.08)) / ns(0.08), mode="same")
    duck = 1 - 0.35 * np.clip(env / (np.max(env) * 0.25 + 1e-9), 0, 1)
    mix = np.stack([v, v]) * 1.0 + sfx * 10 ** (-6 / 20) * duck  # owner's standard: voice as is, SFX -6 dB
    # loudness to ~-14 LUFS, peak-safe
    try:
        lufs = integrated(mix)
        mix *= 10 ** ((-14 - lufs) / 20)
    except Exception:
        mix *= 0.9 / (np.max(np.abs(mix)) + 1e-9)
    pk = np.max(np.abs(mix))
    if pk > 0.95:
        mix = np.tanh(mix / pk * 1.2) * 0.95 / np.tanh(1.2)
    sf.write(os.path.join(OUT, "mix.wav"), mix.T, SR, subtype="PCM_16")
    print("mix:", os.path.join(OUT, "mix.wav"), f"{mix.shape[1] / SR:.2f}s peak {np.max(np.abs(mix)):.2f}")


if __name__ == "__main__":
    main()
