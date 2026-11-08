// "What If Every Lie Made You BIGGER?" — timeline: scenes + camera, size events, narration (captions), chips,
// comic words. 30 fps, 1680 frames. Narration timing is a placeholder until the voice-over arrives.
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, expoOut, backOut, hash, vnoise } from "../its-just-orange/story";
export { clamp, lerp, seg, easeInOut, easeOut, easeIn, expoOut, backOut, hash, vnoise };

export const FRAMES = 1680;
export const W = 1080;
export const H = 1920;
export const CEIL = -1330; // room ceiling line

export type Scene = "room" | "out";
export type Cam = { x: number; y: number; z: number; r: number };
type Shot = { a: number; b: number; s: Scene; from: Cam; to: Cam; ease?: (t: number) => number; follow?: (f: number) => { x: number; y: number; z: number } };
const C = (x: number, y: number, z: number, r = 0): Cam => ({ x, y, z, r });

// ------------------------------------------------------------------------------------------------ size
/** [frame, new scale]: every lie = POOF (grow), every truth = PFFT (shrink); 9-frame overshoot pop */
export const KID_SIZE: [number, number][] = [[292, 1.3], [442, 1.8], [607, 3.2], [688, 4.2], [832, 5.5], [1032, 9], [1237, 5.6], [1292, 3.0], [1342, 1.0]];
export const DAD_SIZE: [number, number][] = [[1605, 2.9]];
const sizeAt = (f: number, ev: [number, number][]) => {
  let s = 1;
  for (const [t, v] of ev) {
    if (f < t) break;
    const k = t === 688 ? 1 : seg(f, t, t + 9);
    s = lerp(s, v, v > s ? backOut(k, 2.6) : easeOut(k));
  }
  return s;
};
export const kidSize = (f: number) => sizeAt(f, KID_SIZE);
export const dadSize = (f: number) => sizeAt(f, DAD_SIZE);
/** kid's head-centre height above the feet at scale 1 (see chars.tsx kid look) */
export const KID_HEAD = 328;
export const KID_OUT_X = 0; // outside: standing inside the house

// ------------------------------------------------------------------------------------------------ shots
const kidFace = (f: number) => { const s = kidSize(f); return { x: KID_OUT_X, y: -KID_HEAD * s + 40, z: Math.min(1.25, 3.4 / s) }; };
export const SHOTS: Shot[] = [
  // B1 room
  { a: 0, b: 80, s: "room", from: C(0, -620, 0.66, 0), to: C(-120, -560, 0.82, -2), ease: easeOut },
  { a: 80, b: 150, s: "room", from: C(-250, -360, 1.6, 2), to: C(-250, -370, 1.95, 3), ease: easeOut },
  // B2 homework
  { a: 150, b: 250, s: "room", from: C(300, -560, 1.55, -2), to: C(300, -570, 1.75, -3), ease: easeOut },
  { a: 250, b: 292, s: "room", from: C(-250, -350, 1.8, 3), to: C(-250, -355, 2.05, 4), ease: easeOut },
  { a: 292, b: 340, s: "room", from: C(-40, -560, 0.95, 0), to: C(-40, -570, 1.05, -2), ease: easeOut },
  // B3 cookie
  { a: 340, b: 405, s: "room", from: C(300, -570, 1.6, -2), to: C(300, -575, 1.8, -3), ease: easeOut },
  { a: 405, b: 442, s: "room", from: C(-250, -440, 1.55, 3), to: C(-250, -445, 1.75, 4), ease: easeOut },
  { a: 442, b: 510, s: "room", from: C(-60, -640, 0.85, 0), to: C(-60, -650, 0.95, 2), ease: easeOut },
  // B4 ceiling
  { a: 510, b: 575, s: "room", from: C(300, -560, 1.5, -2), to: C(300, -560, 1.65, -3), ease: easeOut },
  { a: 575, b: 607, s: "room", from: C(-250, -600, 1.2, 3), to: C(-250, -605, 1.35, 4), ease: easeOut },
  { a: 607, b: 690, s: "room", from: C(-20, -760, 0.62, 0), to: C(-20, -770, 0.68, -2), ease: easeOut },
  // B5 outside: roof
  { a: 690, b: 780, s: "out", from: C(0, -1050, 0.5, 0), to: C(0, -1150, 0.56, 0), ease: easeOut },
  { a: 780, b: 845, s: "out", from: C(0, -1300, 1, 0), to: C(0, -1300, 1, 0), follow: kidFace },
  { a: 845, b: 900, s: "out", from: C(0, -1150, 0.36, 0), to: C(0, -1250, 0.33, 2), ease: easeOut },
  // B6 dad yells / clouds
  { a: 900, b: 965, s: "out", from: C(800, -330, 1.55, -2), to: C(800, -340, 1.75, -3), ease: easeOut },
  { a: 965, b: 1032, s: "out", from: C(0, -1800, 1, 0), to: C(0, -1800, 1, 0), follow: kidFace },
  { a: 1032, b: 1110, s: "out", from: C(0, -1800, 0.3, 0), to: C(0, -2300, 0.24, 0), ease: easeOut },
  // B7 truth shrinks
  { a: 1110, b: 1185, s: "out", from: C(0, -2900, 0.6, 2), to: C(0, -2920, 0.66, 3), ease: easeOut },
  { a: 1185, b: 1300, s: "out", from: C(0, -2000, 1, 0), to: C(0, -2000, 1, 0), follow: kidFace },
  { a: 1300, b: 1380, s: "out", from: C(0, -800, 0.55, 0), to: C(0, -700, 0.62, 0), ease: easeOut },
  // B8 Dad lies
  { a: 1380, b: 1455, s: "room", from: C(0, -620, 0.7, 0), to: C(30, -600, 0.8, 0), ease: easeOut },
  { a: 1455, b: 1528, s: "room", from: C(300, -570, 1.65, -2), to: C(300, -575, 1.85, -3), ease: easeOut },
  { a: 1528, b: 1605, s: "room", from: C(300, -575, 2.0, 2), to: C(300, -580, 2.35, 3), ease: easeOut },
  { a: 1605, b: 1645, s: "room", from: C(20, -760, 0.62, 0), to: C(20, -770, 0.68, -2), ease: easeOut },
  { a: 1645, b: 1680, s: "room", from: C(-250, -350, 1.85, 3), to: C(-250, -355, 2.3, 4), ease: easeIn },
];

const SHAKES: { f: number; amp: number; n: number; rot?: number }[] = [
  { f: 292, amp: 30, n: 6 }, { f: 442, amp: 36, n: 7 }, { f: 607, amp: 44, n: 8, rot: 2 }, { f: 613, amp: 50, n: 8, rot: 3 },
  { f: 832, amp: 46, n: 8, rot: 2 }, { f: 1032, amp: 60, n: 10, rot: 3 }, { f: 1237, amp: 16, n: 5 }, { f: 1292, amp: 16, n: 5 }, { f: 1342, amp: 16, n: 5 },
  { f: 1605, amp: 44, n: 8, rot: 2 }, { f: 1611, amp: 50, n: 8, rot: 3 },
];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const sceneAt = (f: number): Scene => shotAt(f).s;
export const camAt = (f: number): Cam => {
  const s = shotAt(f);
  const t = (s.ease ?? ((x) => x))(clamp((f - s.a) / (s.b - s.a)));
  const c: Cam = { x: lerp(s.from.x, s.to.x, t), y: lerp(s.from.y, s.to.y, t), z: lerp(s.from.z, s.to.z, t), r: lerp(s.from.r, s.to.r, t) };
  if (s.follow) { const p = s.follow(f - 1); c.x = p.x; c.y = p.y; c.z = p.z * (1 + 0.08 * t); }
  c.x += (vnoise(f / 23, 1) * 4) / c.z; c.y += (vnoise(f / 19, 2) * 4) / c.z;
  for (const k of SHAKES) {
    const d = f - k.f;
    if (d < 0 || d >= k.n) continue;
    const a = k.amp * Math.pow(1 - d / k.n, 1.6) * (d % 2 ? -1 : 1);
    c.x += a / c.z; c.y += (a * 0.6 * (d % 3 === 1 ? -1 : 1)) / c.z; c.r += (k.rot ?? 0.8) * (a / k.amp);
  }
  return c;
};
export const layerTransform = (c: Cam, p: number) => {
  const z = 1 + (c.z - 1) * p;
  return `translate(${W / 2} ${H / 2}) rotate(${c.r * Math.min(1, p)}) scale(${z}) translate(${-c.x * p} ${-c.y * p})`;
};
export const FLASH = [690, 1380];

// ------------------------------------------------------------------------------------------------ narration → captions
export const NARR: [number, number, string][] = [
  [8, 140, "What if every lie... made you BIGGER?"],
  [158, 200, "Dad asked:"],
  [204, 250, "Homework done?"],
  [256, 290, "You said: YES."],
  [345, 400, "Who ate the last cookie?"],
  [405, 440, "THE DOG."],
  [455, 505, "Your shirt got tight."],
  [512, 572, "Are you getting... bigger?"],
  [576, 605, "NOPE."],
  [620, 686, "Your head hit the CEILING."],
  [700, 772, "Soon you didn't fit in the house."],
  [782, 830, "I'm totally FINE!"],
  [846, 896, "The neighbors stared."],
  [905, 962, "Dad yelled: Just tell the truth!"],
  [968, 1030, "I ALWAYS tell the truth!"],
  [1046, 1106, "Now you were above the CLOUDS."],
  [1115, 1180, "So you finally said it."],
  [1188, 1235, "I ate the cookie."],
  [1250, 1290, "No homework."],
  [1300, 1340, "I'm sorry, Dad."],
  [1390, 1450, "Dad smiled."],
  [1458, 1525, "See? Honesty is EASY."],
  [1530, 1600, "By the way... I LOVE your obby."],
  [1640, 1676, "...Uh-oh."],
];
export type Word = { w: string; a: number; b: number; hot: boolean };
export const WORDS: Word[] = NARR.flatMap(([a, b, text]) => {
  const ws = text.split(" ");
  const wt = ws.map((w) => 2 + w.replace(/[^A-Za-z]/g, "").length);
  const tot = wt.reduce((s, v) => s + v, 0);
  let acc = 0;
  return ws.map((w, i) => {
    const s = a + ((b - a) * acc) / tot;
    acc += wt[i];
    const e = i === ws.length - 1 ? b + 6 : a + ((b - a) * acc) / tot;
    const bare = w.replace(/[^A-Za-z]/g, "");
    return { w, a: Math.round(s), b: Math.round(e), hot: bare.length > 1 && bare === bare.toUpperCase() };
  });
});
export const wordAt = (f: number) => WORDS.find((w) => f >= w.a && f < w.b) ?? null;

// ------------------------------------------------------------------------------------------------ comic words (screen space)
export const COMIC: { f: number; text: string; x: number; y: number; rot: number; size: number; c?: [string, string] }[] = [
  { f: 292, text: "POOF!", x: 760, y: 520, rot: 8, size: 160, c: ["#ffffff", "#c9d6ff"] },
  { f: 442, text: "POOF!", x: 300, y: 500, rot: -8, size: 170, c: ["#ffffff", "#c9d6ff"] },
  { f: 613, text: "BONK!", x: 540, y: 420, rot: -6, size: 180 },
  { f: 832, text: "POOF!", x: 760, y: 470, rot: 8, size: 170, c: ["#ffffff", "#c9d6ff"] },
  { f: 850, text: "GASP!", x: 300, y: 1050, rot: -8, size: 120, c: ["#9ff0ff", "#4ac2ff"] },
  { f: 1032, text: "POOF!!", x: 560, y: 520, rot: -6, size: 190, c: ["#ffffff", "#c9d6ff"] },
  { f: 1237, text: "PFFT", x: 780, y: 520, rot: 10, size: 130, c: ["#d7f7c9", "#8fd877"] },
  { f: 1292, text: "PFFT", x: 300, y: 560, rot: -10, size: 130, c: ["#d7f7c9", "#8fd877"] },
  { f: 1342, text: "PFFT", x: 760, y: 600, rot: 8, size: 130, c: ["#d7f7c9", "#8fd877"] },
  { f: 1605, text: "POOF!", x: 760, y: 470, rot: 8, size: 170, c: ["#ffffff", "#c9d6ff"] },
  { f: 1611, text: "BONK!", x: 360, y: 380, rot: -8, size: 180 },
];
