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
    # ALL-CAPS punch words would be spelled out letter by letter: say them as normal words
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).capitalize() if m.group(1) != "I" else m.group(1), t)
    return t.replace("...", ",").replace("Uh-oh", "Uh oh")


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
            audio, sr = k.create(speakable(text), voice=voice, speed=speed, lang="en-us")
            audio = trim(audio.astype(np.float32), sr)
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
    total *= 0.89 / (np.max(np.abs(total)) + 1e-9)
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
