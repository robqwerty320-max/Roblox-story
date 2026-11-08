# Roblox story shorts

Vertical (1080x1920, 30 fps) "What If … Roblox?" story shorts: flat 2D vector look, blocky characters,
one-word captions. Made with [Remotion](https://www.remotion.dev/) (React + SVG). Silent for now — the voice-over
is added later.

| Short | Composition | Code | Script | Video |
|---|---|---|---|---|
| What If Every Lie Made You BIGGER? 🤥 | `LieBigger` | `src/videos/lie-bigger/` | `stories/lie-bigger/SCRIPT.md` | `videos/what-if-lie-bigger.mp4` |
| What If DAD Tried to Beat Your Obby? 😤 | `DadObby` | `src/videos/dad-obby/` | `stories/dad-obby/SCRIPT.md` | `videos/what-if-dad-obby.mp4` |

## Cloud render
Rendering runs on GitHub's servers (`.github/workflows/render.yml`):
- automatically on every push to `main` that changes `src/` (renders `LieBigger`);
- by hand: **Actions → Render shorts → Run workflow** → pick `LieBigger`, `DadObby` or `all`.

The finished mp4 is committed to `videos/` and attached to the run as the `videos` artifact.

## Local
```bash
npm ci
npx remotion studio src/index.ts
npx remotion render src/index.ts LieBigger out/video.mp4 --codec h264 --crf 18 --muted
```

Captions follow `NARR` in each short's `story.ts`; when the voice-over arrives, retime `NARR` to the real word
timings and re-render. Characters, story and art are original. Not affiliated with or endorsed by Roblox Corporation.
