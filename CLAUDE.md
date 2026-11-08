# Cartoon Shorts

Vertical (1080x1920) cartoon story shorts: flat 2D characters in a 3D toon world, rendered with three.js inside Remotion.
Workflow and look rules: `.claude/skills/cartoon-3d-short/SKILL.md` (vendored from mromidev/claude-animated-shorts, MIT;
reference frames/sheets deliberately NOT included — they are another channel's footage, study-only).

## Layout
- `src/index.ts`, `src/Root.tsx` — Remotion entry; register every short as a `<Composition>` in Root.tsx.
- `src/videos/trust-me-bro/` — "Trust Me Bro" (composition `TrustMeBro`, 1467 f = 48.9 s; the picture is authored in 40.5 s
  "story time" and remapped onto the voice by `storyFrame()` / `VOICE` in story.ts): blocky avatar-style box characters
  (`blocky.ts`), canvas face library (`faces.ts`), trade window / fx cards (`ui.ts`), lobby world (`world.ts`), timeline,
  `NARRATION` caption words + `CUES` sound frames (`story.ts`). Imports the bridge post chain, shading, paint and Kenney helpers
  from `../bridge/` instead of copying them. Script: `stories/trust-me-bro/SCRIPT.md`; sound: `stories/trust-me-bro/audio/`.
- `src/videos/its-just-orange/` — "It's Just Orange" (composition `ItsJustOrange`, 600 f = 20 s): **2D, no three.js** — SVG
  drawn per frame inside Remotion. `timing.json` is the single source of truth for lines (syllable frames → lip flaps, bubble
  word reveal, voice blips) and SFX cues, read by both the picture and the audio script; `story.ts` = camera shots / shakes /
  parallax / twos helper, `poses.ts` = per-frame poses (on twos, hits on ones), `chars.tsx` = blocky characters + faces,
  `world.tsx` = sky / clouds / far + mid obby / platform / lava / embers. Script: `stories/its-just-orange/SCRIPT.md`;
  sound (SFX only, no music/instruments): `stories/its-just-orange/audio/ijo_audio.py`.
- `src/videos/bridge/` — the template short ("The Bridge That Fell for a Song", composition `BridgeShort`, 30 fps). Copy it to `src/videos/<name>/` for a new short.
- `public/bridge/kenney/` — 26 Kenney CC0 models (Nature Kit + Fantasy Town Kit) + `Textures/colormap.png`.
- `scripts/` — stills, QA, side-by-side and merge helpers from the skill; `scripts/browser.mjs` picks Chrome / GL mode per OS.
- `legacy/kolesa-test/` — our first 10 s test ("Колёса-конусы"), plain three.js + puppeteer, not Remotion.

## Commands
- Stills: `node scripts/bridge-stills.mjs out/bridge/x_ 100,700,1500 0.5` (`COMP=TrustMeBro` for the other short);
  contact sheet: `python scripts/sheet.py sheet.jpg 4 a.jpg b.jpg ...`
- Trust Me Bro (voice version, 48.9 s): put the Fish Audio takes as 48 kHz mono `out/tmb/voice/v1.wav` + `v2.wav`, then
  `node scripts/tmb-cues.mjs out/tmb/cues.json` (SFX times remapped onto the voice) →
  `python stories/trust-me-bro/audio/tmb_audio.py out/tmb` (voice + SFX only, no music; needs numpy + scipy) →
  `npx remotion render src/index.ts TrustMeBro out/tmb/video.mp4 --concurrency=4 --timeout=900000 --codec h264 --crf 16` →
  `ffmpeg -i out/tmb/video.mp4 -i out/tmb/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/tmb/final.mp4`
- It's Just Orange (2D, ~8 min in the cloud with plain `--concurrency=4`, no `render:parallel` needed):
  `python stories/its-just-orange/audio/ijo_audio.py out/ijo` (→ `out/ijo/mix.wav`, −14 LUFS) →
  `npx remotion render src/index.ts ItsJustOrange out/ijo/video.mp4 --concurrency=4 --timeout=900000 --codec h264 --crf 16` →
  `ffmpeg -i out/ijo/video.mp4 -i out/ijo/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/ijo/final.mp4`.
  Stills: `COMP=ItsJustOrange node scripts/bridge-stills.mjs out/ijo/s 30,100,300 0.5` (~2 s each).
- Full render: `npm run render` (→ `out/bridge/video.mp4`), 2K: add `--scale 1.3333`.
- Typecheck: `npm run typecheck`.

## Known pitfalls (found while setting up)
- **`@react-three/postprocessing` must stay at 3.0.4.** 3.2.x creates the EffectComposer asynchronously, Remotion snapshots
  after the first `advance()`, and every frame comes out as the empty background colour (`#cfe3f2`). Pinned exactly in package.json.
- First frame is slow (world build + HD Canvas2D painted textures): stills timeout is raised to 15 min in the scripts.
  On the owner's Intel UHD 605 one still at scale 0.5 takes 20–110 s.
- Linux / cloud has no GPU: `remotion.config.ts` and `scripts/browser.mjs` switch WebGL to SwiftShader (`swangle`).
  Override with `REMOTION_GL=angle|swangle|...` and `CHROME_PATH=...`.
- **Cloud (Linux, 4 vCPU / 15 GB, no GPU) — verified 2026-11-04:** `npm ci` → `npx remotion browser ensure` (found the
  preinstalled `/usr/bin/google-chrome`, Chrome for Testing) → default `swangle` works, no extra libs or flags needed.
  0.5-scale still ≈ 40–60 s (first one ~75 s incl. bundle).
  **Full render in the cloud: use `npm run render:parallel`** (`scripts/render-parallel.sh`), NOT `npm run render`:
  with `--concurrency N` all tabs share one Chrome GPU process and SwiftShader uses ~1 core there (~9 s/frame → ~5 h).
  The script runs N separate renders over 75-frame chunks (resumable: re-run keeps finished chunks) and concats them.
  BridgeShort full 1080x1920 on 4 vCPU: **3 h 26 min** (~22 s/frame per worker), 190 MB. Launch it detached
  (`setsid nohup npm run render:parallel > out/bridge/render.txt 2>&1 &`) — session background tasks are killed at 2 h.
- Kenney Fantasy Town GLBs load `Textures/colormap.png` relative to the model — keep it in `public/bridge/kenney/Textures/`.
- Remotion copies `public/` into the temp dir on every bundle: set `REMOTION_TMP` (the stills script honours it) and clean it after work.
- Renders (`out/`, `*.mp4`, `*.wav`, `stills*/`) are git-ignored — deliver them as files, don't commit them.
- Cloud render speed (4 vCPU, SwiftShader): stills ~18 s each at scale 0.5; full render ~4 s/frame at `--concurrency=4`.
  The default 30 s render timeout is too short for the first frame (world build) — pass `--timeout=900000`.
- The skill's "user rules" (English only, no captions, Opus max verifier) are the original author's; ask the owner what they want for their shorts (they speak Russian).
