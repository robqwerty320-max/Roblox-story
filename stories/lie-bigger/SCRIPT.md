# What If Every Lie Made You BIGGER? 🤥 — vertical short (~56 s)

- Composition `LieBigger`, 1080x1920, 30 fps, 1680 frames. Code: `src/videos/lie-bigger/` (reuses the characters
  and the living room from `src/videos/dad-obby/`).
- Same flat story-short look as "What If DAD Tried to Beat Your Obby?": thick brown outline, blocky people, one-word
  captions (white / yellow punch words), comic sound-words, a chip at the top (here: the SIZE meter).
- Sound: Kokoro voice-over (`am_puck`, upbeat American, speed 1.12) + synthesized SFX; **no music, no musical
  instruments**. `python stories/lie-bigger/audio/voice.py <kokoro_model_dir> out/lie` (voice.wav + real word times
  → `src/videos/lie-bigger/voice.json`, captions follow it) → `python stories/lie-bigger/audio/sfx_mix.py out/lie`
  (poof / stretch / pfft / bonk / roof crash / gasp / whoosh / room tone / breeze; voice as is, SFX −6 dB, ~−14 LUFS)
  → copy `out/lie/mix.wav` to `public/lie-bigger/mix.wav` (the composition plays it).
- Cast: **You** (kid), **Dad**, neighbour noobs. No Mom.

## Beats (frames @30 fps)
| # | Frames | Narration | Picture |
|---|---|---|---|
| 1 | 0–150 | "What if every lie... made you BIGGER?" | Living room, you with the tablet, a sparkle hits you. Chip "SIZE x1.0". |
| 2 | 150–340 | "Dad asked: Homework done? You said: YES." | Dad asks; you lie with a sweaty grin — POOF, you grow to x1.3. |
| 3 | 340–510 | "Who ate the last cookie? THE DOG. Your shirt got tight." | Crumbs on your face — POOF x1.8. |
| 4 | 510–690 | "Are you getting... bigger? NOPE. Your head hit the ceiling." | POOF x3.2 — BONK, ceiling cracks. |
| 5 | 690–900 | "Soon you didn't fit in the house. I'm totally FINE! The neighbors stared." | Outside: your head and shoulders stick out of the broken roof; POOF x5.5; noob neighbours gasp. |
| 6 | 900–1110 | "Dad yelled: Just tell the truth! I ALWAYS tell the truth! Now you were above the clouds." | Dad yells from the sidewalk; POOF x9 — you tower above the clouds. |
| 7 | 1110–1380 | "So you finally said it. I ate the cookie. No homework. I'm sorry, Dad." | Each truth: PFFT, you shrink back down to normal. |
| 8 | 1380–1680 | "Dad smiled. See? Honesty is EASY. By the way... I LOVE your obby. ...Uh-oh." | Back in the room; Dad lies about your obby — POOF, Dad grows and BONKs the ceiling. |
