// "It's Just Orange" — timeline: lines (from timing.json), camera shots, shakes, easing helpers.
// World coordinates (SVG, y down): lava surface y = 0, spawn platform top y = -170, x grows to the right
// (checkpoint flag at x = 1700). Camera = world point at screen centre + zoom (screen px per world unit) + roll (deg).
import T from "./timing.json";

export const FPS = T.fps;
export const FRAMES = T.frames;
export const W = 1080;
export const H = 1920;

export type Line = (typeof T.lines)[number];
export const LINES: Line[] = T.lines;
export const CUES = T.cues;

// ---------------------------------------------------------------- easing
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
/** overshoot ease (back-out): passes 1, peaks ~1+s*0.1, settles */
export const backOut = (t: number, s = 2.2) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
/** damped spring 0 -> 1 with overshoot */
export const spring = (t: number, k = 3.2, d = 5) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(k * Math.PI * t));
/** deterministic hash noise in [-1, 1] */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
/** smooth value noise in [-1, 1] */
export const vnoise = (x: number, seed = 0) => {
  const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr);
  return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u);
};
/** drawings on twos: hold every pose 2 frames, except hit ranges which run on ones */
const ONES: [number, number][] = [[100, 112], [128, 140], [252, 262], [312, 320], [420, 432], [470, 478], [510, 514]];
export const onOnes = (f: number) => ONES.some(([a, b]) => f >= a && f < b);
export const twos = (f: number) => (onOnes(f) ? f : f - (f % 2));

// ---------------------------------------------------------------- lip flaps
export type Mouth = "rest" | "open" | "mid" | "wide" | "closed";
export const lineAt = (f: number, who: string) => LINES.find((l) => l.who === who && f >= l.start && f < l.end + 4);
export const mouthAt = (fRaw: number, who: string): Mouth | null => {
  const f = fRaw - (fRaw % 2); // lip flaps on twos
  const l = lineAt(f, who);
  if (!l) return null;
  for (let i = l.syl.length - 1; i >= 0; i--) {
    const s = l.syl[i];
    if (f < s) continue;
    const next = i + 1 < l.syl.length ? l.syl[i + 1] : s + 8;
    const loud = l.loud.includes(i);
    const last = i === l.syl.length - 1;
    if (last && loud && f < l.end - 6) return f - s < 2 ? "mid" : "wide"; // held shout
    const d = f - s;
    if (d < 2) return loud ? "wide" : "open";
    if (d < 4 && next - s > 4) return loud ? "open" : "mid";
    return "closed";
  }
  return "closed";
};
/** number of syllables spoken so far (for word-by-word bubble text) */
export const sylCount = (f: number, l: Line) => l.syl.filter((s) => f >= s).length;

// ---------------------------------------------------------------- camera
export type Cam = { x: number; y: number; z: number; r: number };
type Shot = { a: number; b: number; from: Cam; to: Cam; ease?: (t: number) => number; whip?: boolean; follow?: boolean };
const C = (x: number, y: number, z: number, r = 0): Cam => ({ x, y, z, r });

// Character anchors (feet x): Pro -760, Dev -475, Noob -190 on the spawn platform; Noob lands in lava at x = 300.
export const POS = { pro: -760, dev: -475, noob: -190, land: 300, flag: 1700, sink: 70 };
export const PLAT_TOP = -170;

/** Noob's jump arc 102 -> 132 (feet) */
export const jumpAt = (f: number) => {
  const t = clamp((f - 102) / 30);
  return { x: lerp(POS.noob, POS.land, t), y: lerp(PLAT_TOP, 90, t) - 560 * 4 * t * (1 - t), t };
};

export const SHOTS: Shot[] = [
  // B1 0-60: fast push-in from the wide to Pro's face (dutch tilt), cut to Noob blinking
  { a: 0, b: 36, from: C(-420, -420, 0.52, 0), to: C(-740, -600, 2.25, -5), ease: (t) => easeInOut(Math.pow(t, 0.8)) },
  { a: 36, b: 60, from: C(-230, -590, 2.0, 4), to: C(-215, -600, 2.25, 5.5), ease: easeOut },
  // B2 60-132: Noob medium shrug, then whip pan following the jump
  { a: 60, b: 96, from: C(-260, -470, 1.35, -2), to: C(-200, -500, 1.6, 1), ease: easeOut },
  { a: 96, b: 104, from: C(-140, -430, 1.15, 0), to: C(-110, -440, 1.22, -1), ease: easeIn },
  { a: 104, b: 122, from: C(-110, -440, 1.22, -1), to: C(300, -330, 1.0, 3), ease: easeInOut, whip: true, follow: true },
  { a: 122, b: 132, from: C(300, -330, 1.0, 3), to: C(300, -300, 1.08, 2), ease: easeOut },
  // B3 132-192: impact, decaying shake, snap zoom on the charcoal face
  { a: 132, b: 158, from: C(300, -290, 1.12, 0), to: C(300, -300, 1.25, -2), ease: easeOut },
  { a: 158, b: 192, from: C(300, -330, 1.25, -2), to: C(300, -350, 3.15, 2), ease: (t) => (t < 0.15 ? expoOut(t / 0.15) * 0.97 : 0.97 + 0.03 * (t - 0.15) / 0.85) },
  // B4 192-252: comedy hold — slow creep-in (still moving)
  { a: 192, b: 252, from: C(285, -360, 1.9, 1), to: C(295, -350, 2.3, 2.5), ease: (t) => t },
  // B5 252-312: punch zoom on Pro's inflated head, then mouth fills the frame
  { a: 252, b: 282, from: C(-760, -560, 1.0, 0), to: C(-760, -700, 1.55, -4), ease: (t) => expoOut(Math.min(1, t * 2.2)) * 0.9 + 0.1 * t },
  { a: 282, b: 312, from: C(-760, -650, 2.45, 7), to: C(-760, -650, 2.85, 9), ease: easeOut },
  // B6 312-420: respawn pop, sprint in place, whip pan to the checkpoint in the lava and back
  { a: 312, b: 330, from: C(-430, -470, 1.05, 0), to: C(-400, -470, 1.15, -1), ease: easeOut },
  { a: 330, b: 360, from: C(-210, -470, 1.45, 3), to: C(-200, -480, 1.62, 4), ease: easeOut },
  { a: 360, b: 372, from: C(-200, -480, 1.62, 4), to: C(1700, -330, 1.3, -2), ease: easeInOut, whip: true },
  { a: 372, b: 396, from: C(1700, -330, 1.3, -2), to: C(1700, -350, 1.5, -3), ease: easeOut },
  { a: 396, b: 404, from: C(1700, -350, 1.5, -3), to: C(-330, -470, 1.15, 2), ease: easeInOut, whip: true },
  { a: 404, b: 420, from: C(-330, -470, 1.15, 2), to: C(-320, -470, 1.25, 3), ease: easeOut },
  // B7 420-510: Dev pops up, crash zoom on Dev, quick 3-shot with heads snapping
  { a: 420, b: 436, from: C(-475, -470, 0.98, 0), to: C(-475, -460, 1.04, 0), ease: easeOut },
  { a: 436, b: 470, from: C(-475, -460, 1.04, 0), to: C(-475, -440, 2.6, -3), ease: (t) => (t < 0.18 ? expoOut(t / 0.18) * 0.95 : 0.95 + 0.05 * (t - 0.18) / 0.82) },
  { a: 470, b: 510, from: C(-475, -470, 1.02, 2), to: C(-470, -480, 1.12, 0), ease: easeOut },
  // B8 510-600: slow pull-out to the wide, ending on the thumb going under
  { a: 510, b: 600, from: C(-280, -480, 1.25, 0), to: C(-230, -360, 0.62, 0), ease: (t) => easeInOut(t) },
];

/** camera shakes: flip sign every frame, decay over n frames */
const SHAKES: { f: number; amp: number; n: number; rot?: number }[] = [
  { f: 132, amp: 60, n: 7, rot: 3 }, { f: 158, amp: 18, n: 5 }, { f: 254, amp: 45, n: 7, rot: 2 }, { f: 272, amp: 38, n: 7, rot: 2 },
  { f: 282, amp: 30, n: 7, rot: 1.5 }, { f: 314, amp: 16, n: 5 }, { f: 357, amp: 14, n: 5 }, { f: 388, amp: 14, n: 5 },
  { f: 424, amp: 20, n: 7 }, { f: 436, amp: 22, n: 6 }, { f: 472, amp: 26, n: 7, rot: 1.5 }, { f: 524, amp: 10, n: 5 },
];

export const shotIndex = (f: number) => Math.max(0, SHOTS.findIndex((s) => f >= s.a && f < s.b));
export const camAt = (f: number): Cam & { blur: number } => {
  const s = SHOTS[shotIndex(f)] ?? SHOTS[SHOTS.length - 1];
  const t = (s.ease ?? ((x) => x))(clamp((f - s.a) / (s.b - s.a)));
  const c: Cam = { x: lerp(s.from.x, s.to.x, t), y: lerp(s.from.y, s.to.y, t), z: lerp(s.from.z, s.to.z, t), r: lerp(s.from.r, s.to.r, t) };
  if (s.follow) {
    // track Noob's jump arc (lagging 2 frames), blend in/out at the shot ends
    const j = jumpAt(f - 1), w = Math.sin(Math.PI * clamp((f - s.a) / (s.b - s.a))) ** 0.5;
    c.x = lerp(c.x, j.x + 60, w); c.y = lerp(c.y, j.y - 420, w);
  }
  // subtle handheld drift so nothing is ever locked off
  c.x += vnoise(f / 23, 1) * 6 / c.z; c.y += vnoise(f / 19, 2) * 6 / c.z; c.r += vnoise(f / 31, 3) * 0.4;
  let blur = 0;
  if (s.whip) {
    if (s.follow) { const j0 = jumpAt(f - 2), j1 = jumpAt(f - 1); blur = Math.hypot(j1.x - j0.x, j1.y - j0.y) * c.z * 0.8; }
    else {
    const t2 = (s.ease ?? ((x) => x))(clamp((f + 1 - s.a) / (s.b - s.a)));
    blur = Math.abs(lerp(s.from.x, s.to.x, t2) - lerp(s.from.x, s.to.x, t)) * c.z;
    }
  }
  for (const k of SHAKES) {
    const d = f - k.f;
    if (d < 0 || d >= k.n) continue;
    const a = k.amp * Math.pow(1 - d / k.n, 1.6) * (d % 2 ? -1 : 1);
    c.x += a / c.z; c.y += (a * 0.6 * (d % 3 === 1 ? -1 : 1)) / c.z; c.r += (k.rot ?? 0.8) * (a / k.amp);
  }
  return { ...c, blur };
};

/** world -> screen for a layer with parallax p (1 = main layer) */
export const layerTransform = (c: Cam, p: number) => {
  const z = 1 + (c.z - 1) * p;
  return `translate(${W / 2} ${H / 2}) rotate(${c.r * Math.min(1, p)}) scale(${z}) translate(${-c.x * p} ${-c.y * p})`;
};
export const toScreen = (c: Cam, x: number, y: number) => {
  const dx = (x - c.x) * c.z, dy = (y - c.y) * c.z, a = (c.r * Math.PI) / 180;
  return { x: W / 2 + dx * Math.cos(a) - dy * Math.sin(a), y: H / 2 + dx * Math.sin(a) + dy * Math.cos(a) };
};
