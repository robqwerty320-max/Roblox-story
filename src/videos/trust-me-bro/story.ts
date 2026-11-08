// "Trust Me Bro" timeline: beats, narration (caption) words, sound cue frames, cameras, lens blur.
// Everything is a pure function of the frame f (30 fps). Narration runs at ~3.7 words/s so a TTS/voice track can
// later replace the captions: keep NARRATION in sync with any recorded voice (word start times in seconds).
// The audio scripts (audio/timeline.py) mirror CUES below: change both together.
export const FPS = 30;
export const TOTAL = 1215; // 40.5 s
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- beats / shots ----------------
// Each shot is one camera set-up (hard cut between shots). beat = row of SCRIPT.md.
export type ShotDef = { id: number; beat: number; a: number; b: number };
export const SHOTS: ShotDef[] = [
  { id: 1, beat: 1, a: 0, b: 105 },     // Gary proud with the picture: snap push-in
  { id: 2, beat: 2, a: 105, b: 215 },   // ScamLord's red-carpet entrance: orbit
  { id: 3, beat: 3, a: 215, b: 345 },   // trade window, hypno sway
  { id: 4, beat: 4, a: 345, b: 392 },   // giant sweat drop CU
  { id: 5, beat: 4, a: 392, b: 435 },   // finger on ACCEPT, slow-mo
  { id: 6, beat: 5, a: 435, b: 476 },   // ScamLord poofs
  { id: 7, beat: 5, a: 476, b: 555 },   // Gary: jaw to the floor
  { id: 8, beat: 6, a: 555, b: 675 },   // tear fountains flood the lobby, pull-out
  { id: 9, beat: 7, a: 675, b: 745 },   // ScamLord shows off the dragon at the fountain
  { id: 10, beat: 7, a: 745, b: 825 },  // Timmy walks up: push-in
  { id: 11, beat: 8, a: 825, b: 872 },  // trade window 2
  { id: 12, beat: 8, a: 872, b: 945 },  // ScamLord: dollar eyes, ka-ching
  { id: 13, beat: 9, a: 945, b: 1022 }, // crayon dragon close-up
  { id: 14, beat: 9, a: 1022, b: 1065 },// sunglasses slide, twitching eye
  { id: 15, beat: 10, a: 1065, b: TOTAL }, // throne of pets, pull up
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- narration (captions now, voice later) ----------------
// Phrases: start time (s), text; *word* = key word (yellow). Words follow at 1/3.7 s, punctuation adds a pause.
// A word may carry an explicit start time with "@t" (seconds) to sit on a picture beat.
const PHRASES: [number, string][] = [
  [0.25, "Gary traded his *rarest* *pet…* for a *picture* of a pet."],
  [3.8, "It started with a guy named *ScamLord_99.*"],
  [7.4, "*\"Trust* *me* *bro,\"* he said."],
  [9.2, "\"This *picture* is *worth* *more.\""],
  [12.0, "Gary clicked@12.4 *accept.*@13.75"],
  [14.75, "ScamLord *vanished.*"],
  [16.6, "Faster than Gary's *Wi-Fi.*"],
  [18.8, "Gary *cried* for *three* *days.*"],
  [20.65, "In *real* *time.*"],
  [22.7, "You see, scammers have one *weakness:*"],
  [25.1, "someone even *sneakier.*"],
  [27.8, "Timmy offered ScamLord a"],
  [29.0, "*\"super* *rare\"* *golden* *dragon.*"],
  [31.75, "It was a *regular* dragon."],
  [33.3, "Painted *yellow.*"],
  [34.3, "With a *crayon.*"],
  [35.8, "Timmy is *six.*"],
  [37.2, "He now owns *every* *pet* on the *server.*"],
];
export type Word = { w: string; t: number; key: boolean; phrase: number };

// ---------------- voice (Fish Audio take, 2026-11-06) ----------------
// The recorded voice is longer than the first cut (47 s of speech vs 40.5 s), so the PICTURE is time-remapped onto the
// voice: each phrase's original start (PHRASES, "story time") is pinned to where that phrase is spoken in the voice
// track (VOICE, "video time"), linear in between. Story-time code (shots, cameras, CUES) is unchanged; TrustMeBro.tsx
// renders story frame storyFrame(f) at video frame f. Voice files: take 1 (phrases 0-9) placed at V1_AT s, take 2
// (phrases 10-18) at V2_AT s; chunk times below = measured speech segments + those offsets.
export const V1_AT = 0.14, V2_AT = 26.78;
/** per phrase: spoken chunks [start, end, words in chunk] in video seconds */
export const VOICE: [number, number, number][][] = [
  [[0.25, 2.27, 5], [2.76, 4.41, 6]],
  [[5.29, 8.69, 7]], [[9.29, 11.12, 5]], [[11.64, 13.68, 5]], [[14.32, 15.27, 2], [15.78, 16.68, 1]],
  [[17.29, 18.73, 2]], [[19.29, 21.05, 4]], [[21.65, 24.02, 5]], [[24.53, 25.71, 3]],
  [[26.9, 29.37, 6]], [[29.88, 31.98, 3]], [[32.72, 34.23, 4]], [[34.28, 36.94, 4]], [[37.54, 39.06, 5]],
  [[39.49, 40.53, 2]], [[40.63, 42.63, 3]], [[43.23, 44.56, 3]], [[45.0, 47.54, 8]],
];
export const VIDEO_S = 48.9;
export const VIDEO_FRAMES = Math.round(VIDEO_S * FPS);
/** story-time anchors [story s, video s]: phrase starts, "accept", the poof on "vanished", both ends */
const ANCH = ([[0, 0], ...PHRASES.map(([t], i) => [t, VOICE[i][0][0]] as [number, number]), [13.75, 15.78], [452 / FPS, 17.95], [TOTAL / FPS, VIDEO_S]] as [number, number][])
  .sort((a, b) => a[1] - b[1]);
/** video frame -> story frame (fractional) */
export const storyFrame = (f: number) => {
  const v = f / FPS;
  for (let i = 1; i < ANCH.length; i++) if (v <= ANCH[i][1]) {
    const [s0, v0] = ANCH[i - 1], [s1, v1] = ANCH[i];
    return Math.min(TOTAL - 1, (s0 + ((s1 - s0) * (v - v0)) / (v1 - v0)) * FPS);
  }
  return TOTAL - 1;
};
/** story frame -> video seconds (for the sound cues) */
export const videoTime = (sf: number) => {
  const s = sf / FPS;
  for (let i = 1; i < ANCH.length; i++) if (s <= ANCH[i][0]) {
    const [s0, v0] = ANCH[i - 1], [s1, v1] = ANCH[i];
    return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
  }
  return VIDEO_S;
};
/** caption words in VIDEO time: spread over each spoken chunk by word length */
export const NARRATION: Word[] = (() => {
  const out: Word[] = [];
  PHRASES.forEach(([, text], pi) => {
    const words = text.split(" ").map((raw) => raw.replace(/@[\d.]+$/, ""));
    let k = 0;
    for (const [a, b, n] of VOICE[pi]) {
      const ws = words.slice(k, k + n); k += n;
      const wt = ws.map((w) => w.replace(/[^A-Za-z0-9]/g, "").length + 2), tot = wt.reduce((x, y) => x + y, 0);
      let t = a;
      ws.forEach((w, i) => { out.push({ w: w.replace(/\*/g, ""), t, key: w.includes("*"), phrase: pi }); t += ((b - a) * wt[i]) / tot; });
    }
  });
  return out;
})();
export const PHRASE_END = PHRASES.map((_, i) => {
  const ch = VOICE[i], next = VOICE[i + 1]?.[0][0] ?? VIDEO_S;
  return Math.min(next - 0.05, ch[ch.length - 1][1] + 0.6);
});

// ---------------- sound cues (frames) - mirrored in audio/timeline.py ----------------
export const CUES = {
  boing: 6, flashes: [116, 127, 135, 146, 158, 170, 189, 200], ding: 183, panelPop: 218, trustTalk: [222, 262], hypno: [246, 345],
  choir: [345, 435], sweatGrow: 350, press: 412, poof: 452, jawDrop: 488, wifi: 524, cry: [557, 675], timmySteps: [748, 790],
  twinkle: 796, panel2: 828, kaching: 878, squeaks: [958, 978, 999, 1012], slide: 1026, twitch: [1040, 1065], drum: 1186, confetti: 1188,
};

// ---------------- places ----------------
export const FOUNT: V3 = [0, 0, -9];
export const GARY0: V3 = [-0.85, 0, 0];
export const SCAM0: V3 = [0.85, 0, 0.1];
export const PANEL1: V3 = [0, 3.0, 0.15];
export const SCAM7: V3 = [0.8, 0, -4.6];
export const TIMMY7: V3 = [-0.75, 0, -4.4];
export const PANEL2: V3 = [0.02, 3.12, -4.3];
export const PILE: V3 = [16, 0, -5]; // pet mountain (beat 10)
export const PILE_H = 3.0;

// ---------------- cameras ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({ pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** push-in factor since f0 (subject grows ~rate per frame); punch raises it for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 30) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 6, (n - i - 0.5) / 6));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** ScamLord's walk in shot 2 (x along the red carpet) */
export const scamWalkX = (f: number) => lerp(4.6, 0.6, glide((f - 105) / 62) * 0.35 + clamp01((f - 105) / 62) * 0.65);
export const timmyWalk = (f: number): V3 => lerp3([-3.6, 0, -3.2], TIMMY7, clamp01((f - 745) / 37));

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => dolly([0.5, 1.55, 6.2], [0, 1.45, 0], pushK(f, 0, 0.002)) },
    { f: 5, dur: 9, s: (f) => dolly([0.5, 1.85, 4.3], [0.3, 1.7, 0], pushK(f, 14, 0.0012), { fov: 38, roll: -0.03 }) },
  ],
  2: [
    { f: 105, s: (f) => {
      const x = scamWalkX(f), a = lerp(-0.75, 0.55, glide((f - 105) / 110)), R = lerp(4.8, 3.9, glide((f - 105) / 110));
      return { pos: [x + Math.sin(a) * R, 1.45, Math.cos(a) * R + 0.1], look: [x - 0.2, 1.62, 0], fov: 40, roll: lerp(0.05, -0.03, (f - 105) / 110) };
    } },
  ],
  3: [
    { f: 215, s: (f) => {
      const sw = Math.sin(((f - 215) / 30) * Math.PI * 0.9), k = smooth((f - 240) / 20);
      return dolly([0.35 * sw * k, 2.15, 7.4], [0, 2.05, 0.1], pushK(f, 215, 0.0018), { fov: 40, roll: 0.07 * sw * k });
    } },
  ],
  4: [{ f: 345, s: (f) => dolly([GARY0[0] + 0.45, 1.95, 3.3], [GARY0[0] + 0.3, 1.86, 0], pushK(f, 345, 0.002), { fov: 38, roll: 0.04 }) }],
  5: [{ f: 392, s: (f) => dolly([-0.75, 2.35, 3.0], [-0.3, 2.62, 0.18], pushK(f, 392, 0.004), { fov: 38, roll: -0.05 }) }],
  6: [{ f: 435, s: (f) => dolly([0.2, 1.9, 6.6], [0.1, 1.75, 0], pushK(f, 435, 0.0022), { fov: 40 }) }],
  7: [
    { f: 476, s: (f) => dolly([GARY0[0] + 0.15, 1.85, 2.4], [GARY0[0], 1.8, 0], pushK(f, 476, 0.002), { fov: 40 }) },
    { f: 488, dur: 14, s: (f) => dolly([GARY0[0] + 0.35, 1.25, 4.1], [GARY0[0], 1.1, 0], pushK(f, 502, 0.002), { fov: 40, roll: 0.05 }) },
  ],
  8: [
    { f: 555, s: (f) => dolly([GARY0[0] + 0.2, 1.95, 2.6], [GARY0[0], 1.85, 0], pushK(f, 555, 0.002)) },
    { f: 572, dur: 100, s: () => ({ pos: [GARY0[0] + 1.2, 4.0, 8.0], look: [GARY0[0], 1.45, 0], fov: 42, roll: 0 }) },
  ],
  9: [{ f: 675, s: (f) => dolly(add(SCAM7, [-0.5, 1.75, 5.4]), add(SCAM7, [-0.3, 1.75, 0]), pushK(f, 675, 0.0018), { fov: 40, roll: 0.03 }) }],
  10: [
    { f: 745, s: (f) => dolly([-0.8, 1.7, 3.5], [-1.0, 1.1, -4.0], pushK(f, 745, 0.0015), { fov: 42 }) },
    { f: 780, dur: 30, s: (f) => dolly(add(TIMMY7, [0.15, 1.25, 1.9]), add(TIMMY7, [0, 1.12, 0]), pushK(f, 812, 0.002), { fov: 40, roll: -0.03 }) },
  ],
  11: [{ f: 825, s: (f) => dolly([0.05, 1.9, 4.0], [0.02, 1.85, -4.4], pushK(f, 825, 0.0015), { fov: 40 }) }],
  12: [{ f: 872, s: (f) => dolly(add(SCAM7, [-0.15, 1.92, 2.0]), add(SCAM7, [0, 1.85, 0]), pushK(f, 872, 0.0022, 0.007, 12), { fov: 38, roll: 0.04 }) }],
  13: [{ f: 945, s: (f) => dolly([0.05, 1.75, -1.75], [-0.35, 1.38, -4.0], pushK(f, 945, 0.003), { fov: 38, roll: -0.04 }) }],
  14: [{ f: 1022, s: (f) => dolly(add(SCAM7, [-0.1, 1.9, 1.55]), add(SCAM7, [0, 1.88, 0]), pushK(f, 1022, 0.003, 0.007, 10), { fov: 36 }) }],
  15: [
    { f: 1065, s: (f) => dolly(add(PILE, [-0.4, PILE_H + 1.15, 3.3]), add(PILE, [0, PILE_H + 1.0, 0]), pushK(f, 1065, 0.002), { fov: 40 }) },
    { f: 1108, dur: 70, s: (f) => dolly(add(PILE, [-4.4, PILE_H + 4.2, 12.2]), add(PILE, [-0.4, PILE_H * 0.6, 0]), pushK(f, 1178, 0.0015), { fov: 44, roll: 0 }) },
  ],
};

// impact kicks: image offset flips sign every frame, decays over 7 f
const KICKS: [number, number][] = [[CUES.boing + 8, 0.6], [CUES.press, 0.9], [CUES.poof, 0.7], [CUES.jawDrop + 6, 1.4], [CUES.kaching, 0.6], [CUES.drum, 0.8],
  ...[1044, 1051, 1057, 1062].map((f) => [f, 0.25] as [number, number])];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) {
    const n = Math.floor(f - f0);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (4.5 / 960) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens blur per shot (cInf px at 1080x1920, focus = camera look unless given) ----------------
export const DOF: Record<number, number> = { 1: 13, 2: 11, 3: 7, 4: 14, 5: 12, 6: 9, 7: 10, 8: 6, 9: 11, 10: 12, 11: 8, 12: 13, 13: 14, 14: 14, 15: 6 };
export const dofAt = (id: number, f: number) => {
  if (id === 8) return lerp(12, 0, smooth((f - 575) / 80));
  if (id === 15) return lerp(10, 0, smooth((f - 1110) / 60));
  return DOF[id];
};
