// "What If DAD Tried to Beat Your Obby?" — timeline: scenes + camera, narration (captions), chips, comic words,
// avatar jump arcs. 30 fps, 1680 frames. Narration timing is a placeholder until the voice-over arrives:
// retime NARR to the real word times and everything (captions) follows.
import { clamp, lerp, seg, easeInOut, easeOut, easeIn, expoOut, backOut, spring, hash, vnoise } from "../its-just-orange/story";
export { clamp, lerp, seg, easeInOut, easeOut, easeIn, expoOut, backOut, spring, hash, vnoise };

export const FPS = 30;
export const FRAMES = 1680;
export const W = 1080;
export const H = 1920;

export type Scene = "room" | "night" | "game";
export type Cam = { x: number; y: number; z: number; r: number };
type Shot = { a: number; b: number; s: Scene; from: Cam; to: Cam; ease?: (t: number) => number; follow?: (f: number) => { x: number; y: number }; fz?: number };
const C = (x: number, y: number, z: number, r = 0): Cam => ({ x, y, z, r });

// ------------------------------------------------------------------------------------------------ avatar paths
export const arc = (f: number, a: number, b: number, x0: number, y0: number, x1: number, y1: number, h: number) => {
  const t = clamp((f - a) / (b - a));
  return { x: lerp(x0, x1, t), y: lerp(y0, y1, t) - h * 4 * t * (1 - t), t };
};
export const SPAWN = { x: -190, y: -170 };
export const J = {
  fail: [198, 232] as const, // B2 jump short into the lava
  walk: [352, 395] as const, fall: [395, 425] as const, // B3
  r1: [890, 906] as const, r2: [910, 924] as const, r3: [928, 946] as const, // B6 speedrun
};
/** where Dad's avatar's feet are (game scenes) */
export const dadAvAt = (f: number) => {
  if (f < J.fail[0]) return { x: SPAWN.x, y: SPAWN.y };
  if (f < 345) return arc(f, J.fail[0], J.fail[1], SPAWN.x, SPAWN.y, 300, 80, 380);
  if (f < J.walk[1]) return { x: lerp(SPAWN.x, -40, easeInOut(seg(f, J.walk[0], J.walk[1]))), y: SPAWN.y };
  if (f < 870) { const t = seg(f, J.fall[0], J.fall[1]); return { x: lerp(-40, 90, t), y: SPAWN.y + 250 * t * t }; }
  if (f < J.r1[1]) return arc(f, J.r1[0], J.r1[1], SPAWN.x, SPAWN.y, 680, -300, 260);
  if (f < J.r2[0]) return { x: 680, y: -300 };
  if (f < J.r2[1]) return arc(f, J.r2[0], J.r2[1], 680, -300, 1160, -420, 220);
  if (f < J.r3[0]) return { x: 1160, y: -420 };
  return arc(f, J.r3[0], J.r3[1], 1160, -420, 1680, -40, 200);
};

// ------------------------------------------------------------------------------------------------ shots
export const SHOTS: Shot[] = [
  // B1 room: you + Dad
  { a: 0, b: 62, s: "room", from: C(60, -560, 0.6, 0), to: C(-120, -520, 0.86, -2), ease: easeOut },
  { a: 62, b: 100, s: "room", from: C(-280, -430, 1.55, 3), to: C(-280, -440, 1.75, 4), ease: easeOut },
  { a: 100, b: 150, s: "room", from: C(230, -560, 1.7, -3), to: C(250, -580, 2.25, -4), ease: easeOut },
  // B2 game: attempt one
  { a: 150, b: 198, s: "game", from: C(-210, -470, 1.3, 0), to: C(-200, -480, 1.6, -2), ease: easeOut },
  { a: 198, b: 232, s: "game", from: C(-150, -450, 1.25, 0), to: C(260, -360, 1.05, 3), ease: easeInOut, follow: (f) => dadAvAt(f - 1), fz: 1.05 },
  { a: 232, b: 262, s: "game", from: C(300, -300, 1.1, 0), to: C(300, -310, 1.25, -2), ease: easeOut },
  { a: 262, b: 345, s: "game", from: C(300, -330, 1.6, -2), to: C(300, -345, 2.3, 2), ease: (t) => (t < 0.12 ? expoOut(t / 0.12) * 0.9 : 0.9 + 0.1 * (t - 0.12) / 0.88) },
  // B3 attempt twelve: respawn, walk off the edge, tally insert
  { a: 345, b: 395, s: "game", from: C(-160, -470, 1.45, 0), to: C(-100, -470, 1.55, 2), ease: easeOut },
  { a: 395, b: 450, s: "game", from: C(-20, -360, 1.15, 2), to: C(20, -320, 1.3, -1), ease: easeOut },
  { a: 450, b: 480, s: "room", from: C(955, -970, 2.2, -3), to: C(955, -970, 2.5, -4), ease: easeOut },
  // B4 attempt forty-seven: rage
  { a: 480, b: 540, s: "room", from: C(460, -640, 0.95, 0), to: C(440, -620, 1.08, 2), ease: easeOut },
  { a: 540, b: 600, s: "room", from: C(250, -575, 2.5, -4), to: C(250, -580, 2.85, -5), ease: easeOut },
  { a: 600, b: 660, s: "room", from: C(520, -470, 1.6, 3), to: C(530, -480, 1.8, 4), ease: easeOut },
  // B5 night
  { a: 660, b: 745, s: "night", from: C(0, -640, 0.58, 0), to: C(60, -640, 0.74, 0), ease: easeInOut },
  { a: 745, b: 800, s: "night", from: C(-900, -450, 1.7, 3), to: C(-900, -455, 1.9, 4), ease: easeOut },
  { a: 800, b: 870, s: "night", from: C(210, -700, 2.1, -2), to: C(210, -720, 2.7, -3), ease: easeOut },
  // B6 speedrun + record
  { a: 870, b: 890, s: "game", from: C(-200, -480, 1.6, 0), to: C(-200, -490, 1.75, -2), ease: easeOut },
  { a: 890, b: 950, s: "game", from: C(-100, -450, 1.05, 0), to: C(1650, -330, 1.05, 0), ease: (t) => t, follow: (f) => { const p = dadAvAt(f - 2); return { x: p.x + 120, y: p.y - 260 }; }, fz: 0.95 },
  { a: 950, b: 1050, s: "game", from: C(1690, -380, 1.35, 2), to: C(1690, -400, 1.65, 3), ease: easeOut },
  { a: 1050, b: 1110, s: "room", from: C(0, -600, 0.8, 0), to: C(20, -610, 0.9, -2), ease: easeOut },
  // B7 you beat it
  { a: 1110, b: 1200, s: "room", from: C(-160, -600, 0.8, 0), to: C(60, -580, 0.95, 0), ease: easeInOut },
  { a: 1200, b: 1250, s: "room", from: C(-20, -330, 1.6, 2), to: C(-20, -340, 1.85, 3), ease: easeOut },
  { a: 1250, b: 1290, s: "room", from: C(-20, -300, 2.0, -2), to: C(-20, -310, 2.2, -3), ease: easeOut },
  { a: 1290, b: 1345, s: "room", from: C(60, -600, 0.85, 0), to: C(60, -610, 0.95, 0), ease: easeOut },
  { a: 1345, b: 1400, s: "room", from: C(260, -580, 2.2, 2), to: C(260, -585, 2.6, 3), ease: easeOut },
  // B8 night again + you: "Easy."
  { a: 1400, b: 1500, s: "night", from: C(80, -640, 0.7, 0), to: C(170, -680, 1.05, 0), ease: easeInOut },
  { a: 1500, b: 1560, s: "night", from: C(210, -710, 2.2, -2), to: C(210, -715, 2.5, -3), ease: easeOut },
  { a: 1560, b: 1625, s: "night", from: C(-880, -380, 1.85, 3), to: C(-880, -385, 2.1, 4), ease: easeOut },
  { a: 1625, b: 1680, s: "night", from: C(220, -715, 2.6, -2), to: C(225, -740, 3.6, -4), ease: easeIn },
];

const SHAKES: { f: number; amp: number; n: number; rot?: number }[] = [
  { f: 232, amp: 55, n: 8, rot: 3 }, { f: 262, amp: 18, n: 5 }, { f: 425, amp: 40, n: 7, rot: 2 }, { f: 540, amp: 40, n: 7, rot: 2 },
  { f: 560, amp: 24, n: 6 }, { f: 580, amp: 24, n: 6 }, { f: 906, amp: 14, n: 4 }, { f: 924, amp: 14, n: 4 }, { f: 946, amp: 34, n: 7, rot: 2 },
  { f: 1252, amp: 60, n: 9, rot: 3 }, { f: 1370, amp: 26, n: 6 }, { f: 1600, amp: 20, n: 6 },
];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const sceneAt = (f: number): Scene => shotAt(f).s;
export const camAt = (f: number): Cam => {
  const s = shotAt(f);
  const t = (s.ease ?? ((x) => x))(clamp((f - s.a) / (s.b - s.a)));
  const c: Cam = { x: lerp(s.from.x, s.to.x, t), y: lerp(s.from.y, s.to.y, t), z: lerp(s.from.z, s.to.z, t), r: lerp(s.from.r, s.to.r, t) };
  if (s.follow) {
    const p = s.follow(f), w = Math.min(1, Math.sin(Math.PI * clamp((f - s.a) / (s.b - s.a))) * 3);
    c.x = lerp(c.x, p.x, w); c.y = lerp(c.y, p.y - 200, w); if (s.fz) c.z = lerp(c.z, s.fz, w);
  }
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
export const toScreen = (c: Cam, x: number, y: number) => {
  const dx = (x - c.x) * c.z, dy = (y - c.y) * c.z, a = (c.r * Math.PI) / 180;
  return { x: W / 2 + dx * Math.cos(a) - dy * Math.sin(a), y: H / 2 + dx * Math.sin(a) + dy * Math.cos(a) };
};
/** white flash frames at the cut into a new place */
export const FLASH = [150, 870];

// ------------------------------------------------------------------------------------------------ narration → captions
// [start, end, text]; UPPERCASE words are the punch words (yellow). Placeholder timing until the voice arrives.
export const NARR: [number, number, string][] = [
  [6, 70, "You built the HARDEST obby ever."],
  [76, 146, "Dad laughed. EASY. Five minutes."],
  [160, 205, "Attempt one."],
  [212, 330, "He jumped... straight into the LAVA."],
  [352, 395, "Attempt twelve."],
  [398, 475, "He forgot which button was JUMP."],
  [486, 535, "Attempt forty-seven."],
  [545, 650, "Dad said the game was BROKEN."],
  [670, 740, "Three A.M."],
  [748, 800, "You heard tapping."],
  [805, 865, "Dad was secretly PRACTICING."],
  [878, 915, "Morning."],
  [925, 1000, "Nine seconds."],
  [1010, 1100, "A new WORLD RECORD!"],
  [1118, 1190, "Then YOU took the tablet."],
  [1205, 1250, "One jump."],
  [1258, 1300, "Three seconds."],
  [1310, 1395, "You didn't even LOOK."],
  [1410, 1490, "Dad hasn't slept since."],
  [1505, 1590, "And you just keep saying..."],
  [1600, 1670, "EASY."],
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
    const e = i === ws.length - 1 ? b : a + ((b - a) * acc) / tot;
    const bare = w.replace(/[^A-Za-z]/g, "");
    return { w, a: Math.round(s), b: Math.round(e), hot: bare.length > 1 && bare === bare.toUpperCase() };
  });
});
export const wordAt = (f: number) => WORDS.find((w) => f >= w.a && f < w.b + (WORDS.find((n) => n.a >= w.b) ? 0 : 8)) ?? null;

// ------------------------------------------------------------------------------------------------ top chips + comic words
export const CHIPS: { a: number; b: number; text: (f: number) => string; icon: "flag" | "clock"; hot?: boolean }[] = [
  { a: 150, b: 345, text: () => "ATTEMPT 1", icon: "flag" },
  { a: 345, b: 450, text: () => "ATTEMPT 12", icon: "flag" },
  { a: 480, b: 660, text: () => "ATTEMPT 47", icon: "flag", hot: true },
  { a: 870, b: 1050, text: (f) => `0:0${Math.min(9, Math.max(0, Math.floor(((f - 888) / (946 - 888)) * 9)))}`, icon: "clock" },
  { a: 1200, b: 1290, text: (f) => `0:0${Math.min(3, Math.max(0, Math.floor(((f - 1206) / (1252 - 1206)) * 3)))}`, icon: "clock" },
];
export const COMIC: { f: number; text: string; x: number; y: number; rot: number; size: number; c?: [string, string] }[] = [
  { f: 232, text: "SPLASH!", x: 560, y: 560, rot: -8, size: 150 },
  { f: 270, text: "SIZZLE...", x: 760, y: 470, rot: 7, size: 92, c: ["#ffffff", "#c7c7d6"] },
  { f: 346, text: "POP!", x: 300, y: 520, rot: -10, size: 140, c: ["#9ff0ff", "#4ac2ff"] },
  { f: 425, text: "SPLOOSH!", x: 560, y: 600, rot: 6, size: 135 },
  { f: 556, text: "GRRR!", x: 790, y: 470, rot: 9, size: 150, c: ["#ff7a7a", "#e02a3a"] },
  { f: 690, text: "TAP TAP", x: 640, y: 560, rot: -6, size: 110, c: ["#bfeaff", "#6cc8ff"] },
  { f: 820, text: "TAP TAP TAP", x: 540, y: 420, rot: 5, size: 100, c: ["#bfeaff", "#6cc8ff"] },
  { f: 946, text: "DING!", x: 560, y: 520, rot: -7, size: 160, c: ["#fff27a", "#ffc21a"] },
  { f: 1252, text: "DING!", x: 560, y: 470, rot: 8, size: 170, c: ["#fff27a", "#ffc21a"] },
  { f: 1370, text: "CRACK", x: 760, y: 560, rot: -9, size: 120, c: ["#e9e2da", "#a89c90"] },
];

// ------------------------------------------------------------------------------------------------ who holds the tablet
export type Holder = "kid" | "dad";
export const holderAt = (f: number): Holder => (f < 106 || (f >= 1176 && f < 1312) ? "kid" : "dad");

export const backOutE = backOut;
export const springE = spring;
export const hashN = hash;
