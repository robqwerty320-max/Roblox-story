# "Trust Me Bro" soundtrack: the Fish Audio voice + synthesized SFX (no music, no instrument sounds - owner's call,
# 2026-11-06), mixed to ~-14 LUFS at the exact video length. SFX are synthesized here (numpy/scipy); dsp.py is copied
# from the skill's audio templates. Cue times come from the picture: `node scripts/tmb-cues.mjs out/tmb/cues.json`
# (story CUES remapped onto the voice), voice takes: out/tmb/voice/v1.wav (phrases 0-9), v2.wav (phrases 10-17).
# usage: python stories/trust-me-bro/audio/tmb_audio.py out/tmb   -> out/tmb/mix.wav (+ voice_track.wav, sfx.wav stems)
import json
import os
import sys
import numpy as np
from scipy import ndimage
from dsp import (SR, TAU, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 integrated, true_peak, momentary_max, write_wav, read_wav, phase, smooth_noise, colored, ramp, modal)

FPS = 30
OUT = sys.argv[1] if len(sys.argv) > 1 else "out/tmb"
CJ = json.load(open(os.path.join(OUT, "cues.json")))
DUR = CJ["duration"]
N = ns(DUR)
C = CJ["cues"]  # seconds, video time

R = rng(7)


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def addl(*xs):
    """sum mono arrays of different lengths (zero-padded)"""
    n = max(len(x) for x in xs)
    return sum(np.pad(x, (0, n - len(x))) for x in xs)


# ================================================================ SFX
def boing(dur=0.7, f0=180.0, depth=0.35, rate=11.0):
    t = tt(dur)
    f = f0 * (1 + depth * np.exp(-t / 0.25) * np.sin(TAU * rate * t)) * (1 + 0.6 * np.exp(-t / 0.05))
    y = np.sin(phase(f)) + 0.35 * np.sin(2 * phase(f))
    return fades(y * np.exp(-t / 0.28) * (1 - np.exp(-t / 0.004)), 0.001, 0.05)


def flash_pop(r):
    t = tt(0.35)
    click = hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004)
    whine = np.sin(phase(2600 + 2400 * (1 - np.exp(-t / 0.08)))) * np.exp(-t / 0.12) * 0.25
    thump = lp(r.standard_normal(len(t)), 500) * np.exp(-t / 0.015) * 0.6
    return fades(click + whine + thump, 0.0005, 0.05)


def bell(f, dur=1.4, bright=1.0, r=None):
    return modal(dur, [(f, 1.0, 0.9), (f * 2.0, 0.5 * bright, 0.5), (f * 3.01, 0.35 * bright, 0.25), (f * 4.2, 0.2 * bright, 0.12), (f * 5.43, 0.12 * bright, 0.08)], r or rng(1))


def ding(r):
    y = addl(bell(2093, 1.5, 1.0, r), 0.6 * bell(3136, 1.2, 0.8, r))
    t = tt(1.5)
    y += 0.25 * np.sin(TAU * 6272 * t) * np.exp(-t / 0.15)
    return fades(y, 0.0005, 0.1)


def ui_pop(r, up=True):
    t = tt(0.18)
    f = (500 + 900 * (t / 0.18)) if up else (1200 - 700 * (t / 0.18))
    return fades(np.sin(phase(f)) * np.exp(-t / 0.06) + 0.3 * hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.003), 0.0005, 0.03)


def hypno_tone(dur):
    t = tt(dur)
    f = 330 * (1 + 0.04 * np.sin(TAU * 0.9 * t))
    y = np.sin(phase(f)) + 0.8 * np.sin(phase(f * 1.006 + 0.0)) + 0.4 * np.sin(phase(f * 1.5)) * (0.5 + 0.5 * np.sin(TAU * 0.45 * t))
    y *= 0.6 + 0.4 * np.sin(TAU * 3.0 * t)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.3)
    return pan(y * env, 0) * np.stack([0.85 + 0.15 * np.sin(TAU * 0.45 * t), 0.85 - 0.15 * np.sin(TAU * 0.45 * t)])


def squeeze(r):
    t = tt(0.45)
    f = 600 + 1400 * (t / 0.45) ** 1.5
    return fades(np.sin(phase(f)) * (1 - np.exp(-t / 0.02)) * np.exp(-t / 0.3) * 0.6, 0.002, 0.05)


def click(r, k=1.0):
    t = tt(0.06)
    return hp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.004) * k + np.sin(TAU * 1100 * t) * np.exp(-t / 0.01) * 0.5 * k


def chime_ok(r):
    out = np.zeros(ns(1.2))
    for i, f in enumerate((659.3, 1046.5)):
        y = bell(f, 1.0, 0.6, r)
        out[ns(i * 0.09): ns(i * 0.09) + len(y)] += y[: len(out) - ns(i * 0.09)]
    return out


def whoosh(dur=0.5, r=None, lo=300, hi=3000):
    r = r or rng(3)
    t = tt(dur)
    nz = r.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    fc = lo + (hi - lo) * np.sin(np.pi * np.clip(t / dur, 0, 1))
    y = np.zeros_like(nz)
    # time-varying band via a few fixed bands blended
    for f0 in (400, 900, 1800, 3200):
        w = np.exp(-((fc - f0) / (0.6 * f0)) ** 2)
        y += bp(nz, f0 * 0.7, f0 * 1.4, 2) * w
    return y * env


def poof(r):
    t = tt(0.9)
    nz = r.standard_normal(len(t))
    y = lp(nz, 1400, 2) * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.003))
    y += 0.5 * lp(nz, 300, 2) * np.exp(-t / 0.2)
    zip_ = np.sin(phase(900 + 2600 * (t / 0.9))) * np.exp(-t / 0.06) * 0.35
    return fades(y + zip_, 0.001, 0.1)


def slide_whistle(f0, f1, dur, r=None):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    f *= 1 + 0.01 * np.sin(TAU * 6 * t)
    y = np.sin(phase(f)) + 0.08 * np.sin(2 * phase(f))
    y += 0.03 * bp((r or rng(2)).standard_normal(len(t)), 1000, 5000)
    env = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.06)
    return y * env


def thud(r, f=70):
    t = tt(0.6)
    y = np.sin(phase(f * (1 + 1.2 * np.exp(-t / 0.03)))) * np.exp(-t / 0.15) + 0.6 * lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.02)
    wood = modal(0.3, [(310, 0.5, 0.06), (520, 0.3, 0.04), (870, 0.2, 0.03)], r)
    y[: len(wood)] += wood
    return fades(y, 0.0005, 0.05)


def error_bloop(r):
    out = np.zeros(ns(0.6))
    for i, f in enumerate((520, 390)):
        t = tt(0.24)
        y = np.sign(np.sin(TAU * f * t)) * 0.4 + np.sin(TAU * f * t)
        y = lp(y, 2500) * np.exp(-t / 0.15)
        out[ns(i * 0.22): ns(i * 0.22) + len(t)] += fades(y, 0.002, 0.03)
    return out


def drips(dur, r, rate=14):
    """tear rain: many small water drips"""
    n = ns(dur)
    y = np.zeros(n)
    k = 0.0
    while k < dur:
        f = r.uniform(900, 2400)
        t = tt(0.05)
        d = np.sin(phase(f * (1 + 0.8 * t / 0.05))) * np.exp(-t / 0.012) * r.uniform(0.3, 1.0)
        i = ns(k)
        y[i: i + len(t)] += d[: max(0, n - i)]
        k += r.exponential(1 / rate)
    y += 0.25 * bp(r.standard_normal(n), 400, 3000) * (0.6 + 0.4 * smooth_noise(n, r, 1.0))
    return y * np.minimum(1, np.arange(n) / ns(0.8))


def tiptoe(r):
    t = tt(0.09)
    return fades(np.sin(TAU * 1500 * t) * np.exp(-t / 0.012) * 0.6 + hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.004) * 0.4, 0.0005, 0.02)


def twinkle(r):
    """cartoon sparkle: rising glitter pings over a short airy shimmer"""
    out = np.zeros(ns(1.0))
    for i in range(9):
        f = 3000 + i * 450 + r.uniform(-120, 120)
        t = tt(0.25)
        y = np.sin(TAU * f * t) * np.exp(-t / 0.05) * (0.6 + 0.4 * r.random())
        a = ns(i * 0.04)
        out[a: a + len(t)] += y[: len(out) - a]
    t = tt(1.0)
    out += 0.15 * hp(r.standard_normal(len(t)), 6000) * np.sin(np.pi * np.minimum(t / 0.5, 1)) * np.exp(-t / 0.4)
    return out


def kaching(r):
    out = np.zeros(ns(1.6))
    t = tt(0.25)
    mech = hp(r.standard_normal(len(t)), 1500) * (np.exp(-t / 0.01) + 0.6 * np.exp(-np.maximum(t - 0.08, 0) / 0.01) * (t > 0.08))
    out[: len(t)] += mech * 0.8
    b = addl(bell(2637, 1.3, 1.0, r), 0.7 * bell(3951, 1.0, 0.8, r))
    out[ns(0.1): ns(0.1) + len(b)] += b[: len(out) - ns(0.1)]
    for i in range(14):  # coins
        c = modal(0.25, [(r.uniform(3500, 6500), 1.0, 0.05), (r.uniform(7000, 9500), 0.5, 0.03)], r) * r.uniform(0.2, 0.6)
        a = ns(0.15 + i * r.uniform(0.03, 0.07))
        out[a: a + len(c)] += c[: max(0, len(out) - a)]
    return out


def crayon_squeak(r, dur=0.42):
    """stick-slip squeak: a pulse train at a wobbling rate through bright resonances"""
    t = tt(dur)
    f = 1150 * (1 + 0.18 * np.sin(TAU * 7 * t) + 0.08 * smooth_noise(len(t), r, 20))
    ph = phase(f)
    y = (np.mod(ph, TAU) < 0.5).astype(float) - 0.08
    y = peq(peq(hp(y, 700), 2300, 10, 4), 4700, 6, 5)
    env = np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05) * (0.7 + 0.3 * np.sin(TAU * 9 * t))
    return lp(y, 9000) * env * 0.5


def tick(r):
    t = tt(0.12)
    return fades(np.sin(phase(900 * (1 + 2 * np.exp(-t / 0.01)))) * np.exp(-t / 0.03), 0.0005, 0.02)


def party_horn(r, dur=0.8):
    t = tt(dur)
    f = 420 * (1 + 0.25 * np.minimum(1, t / 0.08)) * (1 + 0.01 * np.sin(TAU * 18 * t))
    ph = phase(f)
    y = 2 * (np.mod(ph, TAU) / TAU) - 1
    y = peq(lp(y, 3500), 1200, 9, 2) + 0.2 * bp(r.standard_normal(len(t)), 1500, 6000)
    return y * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.1) * 0.4


def tom(f, r, dur=0.6):
    t = tt(dur)
    y = np.sin(phase(f * (1 + 0.5 * np.exp(-t / 0.02)))) * np.exp(-t / 0.18) + 0.4 * lp(r.standard_normal(len(t)), 1200) * np.exp(-t / 0.012)
    return fades(y, 0.0005, 0.05)


def fountain_bed(dur, r):
    n = ns(dur)
    y = np.stack([bp(colored(n, r, 1.0), 300, 6000, 1), bp(colored(n, r, 1.0), 300, 6000, 1)])
    return y * (0.8 + 0.2 * smooth_noise(n, r, 0.7))[None, :]


def popper(r):
    """party popper: a sharp pop + paper rustle"""
    t = tt(0.9)
    nz = r.standard_normal(len(t))
    y = hp(nz, 800) * np.exp(-t / 0.006) * 1.2 + lp(nz, 300) * np.exp(-t / 0.03)
    y += 0.3 * bp(r.standard_normal(len(t)), 2000, 9000) * np.exp(-t / 0.35) * (0.5 + 0.5 * np.abs(smooth_noise(len(t), r, 25)))
    return fades(y, 0.0003, 0.1)


def build_sfx():
    S = np.zeros((2, N))
    r = rng(11)

    def put(x, t, db, p=0.0):
        x = np.asarray(x, float)
        x = pan(x, p) if x.ndim == 1 else x
        place(S, x * dbg(db) / (np.max(np.abs(x)) + 1e-12), t)

    # lobby ambience: fountain water (quieter in the flood, crayon close-up and the throne)
    amb = fountain_bed(DUR, r) * 0.035
    gate = np.ones(N)
    for a, b in [(C["cry"][0] - 0.3, C["cry"][1]), (C["squeaks"][0] - 0.6, C["slide"] - 1.0), (C["whoosh"][2] - 2.0, DUR)]:
        gate[ns(a):ns(b)] = 0.3
    S += amb * lp(gate, 3)[None, :]
    put(whoosh(0.35, r, 500, 3500), C["whoosh"][0], -20)
    put(boing(0.75, 170), C["boing"], -9)
    for k, t in enumerate(C["flashes"]):
        put(flash_pop(r), t, -17 + (k % 3), (-0.5 if k % 2 else 0.5))
    put(whoosh(0.45, r), C["whoosh"][1], -22, 0.6)
    put(ding(r), C["ding"], -10, 0.15)
    put(ui_pop(r), C["panelPop"], -15)
    put(hypno_tone(C["hypno"][1] - C["hypno"][0]), C["hypno"][0], -19)
    put(squeeze(r), C["sweatGrow"], -18, 0.4)
    put(click(r), C["press"], -10)
    put(chime_ok(r), C["press"] + 0.03, -14)
    put(whoosh(0.4, r, 700, 5000), C["poof"] - 0.12, -12, 0.5)
    put(poof(r), C["poof"], -10, 0.3)
    put(slide_whistle(1500, 260, 0.2, r), C["jawDrop"], -16)
    put(thud(r), C["jawDrop"] + 0.2, -8)
    put(error_bloop(r), C["wifi"], -16)
    put(drips(C["cry"][1] - C["cry"][0], r), C["cry"][0], -21)
    st_ = C["timmySteps"]
    for i, t in enumerate(np.arange(st_[0], st_[1], 0.17)):
        put(tiptoe(r), t, -24 + (i % 2), -0.3)
    put(twinkle(r), C["twinkle"], -17, -0.2)
    put(ui_pop(r), C["panel2"], -15)
    put(kaching(r), C["kaching"], -10)
    for t in C["squeaks"]:
        put(crayon_squeak(r), t, -13, 0.1)
    put(slide_whistle(1700, 420, 0.5, r), C["slide"], -14)
    for t in C["twitchTicks"]:
        put(tick(r), t, -16, 0.2)
    put(whoosh(1.4, r, 300, 2200), C["whoosh"][2], -21)
    # ending: confetti pops + party horn (no drums)
    put(popper(r), C["confetti"], -9, -0.3)
    put(popper(r), C["confetti"] + 0.12, -12, 0.4)
    put(party_horn(r), C["confetti"] + 0.2, -16, -0.2)
    return S


def build_voice():
    V = np.zeros((2, N))
    for fn, at in (("v1.wav", CJ["v1At"]), ("v2.wav", CJ["v2At"])):
        x, sr = read_wav(os.path.join(OUT, "voice", fn))
        assert sr == SR, sr
        x = hp(x[0], 70, 2)
        place(V, pan(x, 0) / np.sqrt(2), at)
    # level each spoken chunk (the take swings from whisper to shout): normal -17 LUFS, whispers -21, ramps 60 ms
    WHISPER = {3, 10}
    g = np.ones(N)
    for pi, chunks in enumerate(CJ["voice"]):
        for a, b, _ in chunks:
            i, j = ns(a - 0.08), ns(b + 0.12)
            L = integrated(V[:, i:j])
            if np.isfinite(L):
                g[i:j] = dbg(np.clip((-20.0 if pi in WHISPER else -17.0) - L, -6, 20))
    g = ndimage.uniform_filter1d(g, ns(0.06))
    return V * g[None, :]


# ================================================================ MIX
def limiter(x, ceil_db=-1.2, release=0.08):
    ceil = dbg(ceil_db)
    a = np.max(np.abs(x), axis=0)
    peak = ndimage.maximum_filter1d(a, size=2 * ns(0.003) + 1)
    g = np.minimum(1.0, ceil / (peak + 1e-12))
    k = np.exp(-1 / (release * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * k
        out[i] = cur
    return x * out[None, :]


def main(outdir):
    sfx = build_sfx()
    voc = build_voice()
    # voice at -16 LUFS-ish reference, SFX ducked 5 dB under speech (envelope follower on the voice)
    voc *= dbg(-17.0 - integrated(voc))
    env = ndimage.maximum_filter1d(np.abs(voc[0]), size=ns(0.15))
    env = lp(env, 6)
    duck = 1 - (1 - dbg(-5)) * np.clip(env / (np.percentile(env[env > 1e-4], 50) + 1e-9), 0, 1)
    mix = voc + sfx * dbg(-3) * duck[None, :]
    mix = hp(mix, 40, 2)
    for _ in range(3):
        mix *= dbg(-14.0 - integrated(mix))
        mix = limiter(mix, -1.2)
    mix = limiter(mix, -1.2)[:, :N]
    fin = fades(mix, 0.005, 0.25)
    write_wav(os.path.join(outdir, "mix.wav"), fin)
    write_wav(os.path.join(outdir, "voice_track.wav"), voc / (np.max(np.abs(voc)) + 1e-9) * 0.8)
    write_wav(os.path.join(outdir, "sfx.wav"), sfx / (np.max(np.abs(sfx)) + 1e-9) * 0.8)
    print(f"mix: {fin.shape[1] / SR:.3f} s, integrated {integrated(fin):.2f} LUFS, true peak {true_peak(fin):.2f} dBTP, max momentary {momentary_max(fin):.1f}")


if __name__ == "__main__":
    main(OUT)
