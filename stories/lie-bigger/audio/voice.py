"""Kokoro voice-over for "What If Every Lie Made You BIGGER?" (Kokoro-82M ONNX, Apache-2.0, local).

python stories/lie-bigger/audio/voice.py <kokoro_model_dir> [out_dir]
- reads the narration lines (NARR) from src/videos/lie-bigger/story.ts,
- voices each line with an upbeat American voice (default am_puck, speed 1.12; KOKORO_VOICE / KOKORO_SPEED override),
  speeding a line up (max 1.45) when it would run into the next line,
- places every line at its start frame -> <out_dir>/voice.wav (48 kHz mono, exact video length),
- gets real word times with faster-whisper and writes src/videos/lie-bigger/voice.json (captions follow it).
"""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "..")
STORY = os.path.join(ROOT, "src", "videos", "lie-bigger", "story.ts")
FPS, FRAMES, SR = 30, 1680, 48000
VOICE = os.environ.get("KOKORO_VOICE", "am_puck")
SPEED = float(os.environ.get("KOKORO_SPEED", 1.12))


def narr():
    src = open(STORY, encoding="utf-8").read()
    block = src[src.index("export const NARR"):src.index("];", src.index("export const NARR"))]
    return [(int(a), int(b), t) for a, b, t in re.findall(r'\[(\d+),\s*(\d+),\s*"([^"]*)"\]', block)]


def speakable(t):
    """caption text -> what Kokoro should say. Kokoro takes its intonation from punctuation, so punch lines (any
    ALL-CAPS word) end in "!" instead of "."; ALL-CAPS words are said as normal words (not spelled out).
    Returns the parts between "..." — they are voiced separately and joined with a real dramatic pause."""
    hot = re.search(r"\b[A-Z]{2,}\b", t) is not None
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).capitalize(), t)
    t = t.replace("Uh-oh.", "Uh oh!").replace("Uh-oh", "Uh oh!")
    if hot and t.endswith("."):
        t = t[:-1] + "!"
    parts = [x.strip(" ,") for x in t.split("...") if x.strip(" ,.")]
    # a short "See?" before a sentence gets swallowed: give it its own breath
    out = []
    for x in parts:
        if x.startswith("See? "):
            out += ["See?", x[5:]]
        else:
            out.append(x)
    return out


DRAMA = 0.22  # seconds of pause where the caption has "..."


def polish(x, sr):
    """broadcast-style voice chain: rumble cut, less mud, presence + air, gentle compression, normalize"""
    sys.path.insert(0, os.path.join(HERE, "..", "..", "trust-me-bro", "audio"))
    from dsp import hp, peq, shelf
    y = hp(x, 75, 2)
    y = peq(y, 250, -2.5, 1.0)
    y = peq(y, 3200, 3.5, 0.9)
    y = shelf(y, 9000, 2.5, "high")
    # compressor: 3:1 above -20 dBFS, 4 ms attack / 90 ms release, then +4 dB makeup
    env = np.zeros_like(y)
    a_at, a_rel = np.exp(-1 / (0.004 * sr)), np.exp(-1 / (0.09 * sr))
    e = 0.0
    ay = np.abs(y)
    for i in range(len(y)):
        c = a_at if ay[i] > e else a_rel
        e = c * e + (1 - c) * ay[i]
        env[i] = e
    lvl = 20 * np.log10(env + 1e-9)
    gain_db = np.where(lvl > -20, (-20 - lvl) * (1 - 1 / 3), 0.0) + 4
    y = y * 10 ** (gain_db / 20)
    return (y * 0.89 / (np.max(np.abs(y)) + 1e-9)).astype(np.float32)


def trim(a, sr, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.06 * sr)]


def main():
    model_dir = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "out", "lie")
    os.makedirs(out, exist_ok=True)
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))
    voice = k.get_voice_style(VOICE) if "+" not in VOICE else sum(k.get_voice_style(v) for v in VOICE.split("+")) / len(VOICE.split("+"))
    lines = narr()
    total = np.zeros(int(FRAMES / FPS * SR) + SR, np.float32)
    placed = []
    for i, (a, b, text) in enumerate(lines):
        slot = ((lines[i + 1][0] if i + 1 < len(lines) else FRAMES) - a) / FPS - 0.12
        speed = SPEED
        while True:
            chunks = []
            for part in speakable(text):
                a_, sr = k.create(part, voice=voice, speed=speed, lang="en-us")
                chunks += [trim(a_.astype(np.float32), sr), np.zeros(int(DRAMA * sr), np.float32)]
            audio = np.concatenate(chunks[:-1])
            dur = len(audio) / sr
            if dur <= slot or speed >= 1.45:
                break
            speed = min(1.45, speed * dur / slot + 0.02)
        audio = resample_poly(audio, SR, sr).astype(np.float32)
        t0 = a / FPS
        i0 = int(t0 * SR)
        total[i0:i0 + len(audio)] += audio[: len(total) - i0]
        placed.append({"i": i, "text": text, "t0": t0, "dur": len(audio) / SR, "speed": round(speed, 3)})
        print(f"{i:2d} f{a:5d} {len(audio)/SR:4.2f}s / slot {slot:4.2f}s  x{speed:.2f}  {text}", flush=True)
    total = total[: int(FRAMES / FPS * SR)]
    if os.environ.get("RAW_VOICE"):
        total *= 0.89 / (np.max(np.abs(total)) + 1e-9)
    else:
        total = polish(total, SR)
    sf.write(os.path.join(out, "voice.wav"), total, SR, subtype="PCM_16")

    # word timings with faster-whisper (per line, so a word can never drift into another line)
    from faster_whisper import WhisperModel
    wm = WhisperModel("small.en", device="cpu", compute_type="int8")
    words = []
    for p, (a, b, text) in zip(placed, lines):
        seg = total[int(p["t0"] * SR): int((p["t0"] + p["dur"]) * SR)]
        seg16 = resample_poly(seg, 16000, SR).astype(np.float32)
        res, _ = wm.transcribe(seg16, language="en", word_timestamps=True, beam_size=5)
        heard = [w for s in res for w in s.words]
        ours = text.split(" ")
        # map our caption words onto the heard words by order; fall back to even spacing
        if len(heard) >= len(ours):
            times = [(heard[j].start, heard[j].end) for j in range(len(ours))]
            times[-1] = (times[-1][0], heard[-1].end)
        else:
            n = len(ours)
            times = [(p["dur"] * j / n, p["dur"] * (j + 1) / n) for j in range(n)]
        for w, (s, e) in zip(ours, times):
            bare = re.sub(r"[^A-Za-z]", "", w)
            words.append({"w": w, "a": round((p["t0"] + s) * FPS), "b": round((p["t0"] + e) * FPS), "hot": len(bare) > 1 and bare.upper() == bare})
    for j in range(len(words) - 1):  # each word holds until the next one starts (max +10 frames of hang)
        words[j]["b"] = min(max(words[j]["b"], words[j]["a"] + 3) + 10, words[j + 1]["a"])
    words[-1]["b"] += 8
    json.dump({"voice": VOICE, "speed": SPEED, "lines": placed, "words": words},
              open(os.path.join(ROOT, "src", "videos", "lie-bigger", "voice.json"), "w"), indent=1)
    print("words:", len(words), "->", os.path.join(out, "voice.wav"))


if __name__ == "__main__":
    main()
