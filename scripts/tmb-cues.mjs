// Writes the Trust Me Bro sound-cue table in VIDEO seconds (story CUES remapped onto the voice) for the audio script.
// usage: node scripts/tmb-cues.mjs out/tmb/cues.json
import { buildSync } from "esbuild";
import fs from "node:fs";
const out = "out/tmb/_story.mjs";
buildSync({ entryPoints: ["src/videos/trust-me-bro/story.ts"], bundle: true, format: "esm", outfile: out, platform: "node" });
const S = await import(new URL("../" + out, import.meta.url));
const map = (v) => (Array.isArray(v) ? v.map(map) : S.videoTime(v));
const cues = Object.fromEntries(Object.entries(S.CUES).map(([k, v]) => [k, map(v)]));
cues.twitchTicks = [1044, 1051, 1057, 1062].map(S.videoTime);
cues.whoosh = [2, 105, 1108].map(S.videoTime);
const res = { duration: S.VIDEO_S, frames: S.VIDEO_FRAMES, v1At: S.V1_AT, v2At: S.V2_AT, cues, voice: S.VOICE };
fs.writeFileSync(process.argv[2] || "out/tmb/cues.json", JSON.stringify(res, null, 1));
console.log(JSON.stringify(cues));
