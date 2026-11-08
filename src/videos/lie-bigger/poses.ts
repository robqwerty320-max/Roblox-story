// Per-frame poses (drawings on twos). Size is applied in LieBigger.tsx (kidSize / dadSize), poses stay unscaled.
import { Pose, Face } from "../dad-obby/chars";
import { seg, lerp, backOut, hash } from "./story";

const tw = (f: number) => f - (f % 2);
const blink = (f: number, seed: number) => {
  let t = (seed * 37) % 23;
  for (let i = 0; t < f + 10 && i < 200; i++) { if (f >= t && f < t + 4) return true; t += 18 + Math.floor((hash(i + seed * 11) * 0.5 + 0.5) * 48); }
  return false;
};
const eb = (f: number, seed: number, e: Face["eyes"]): Face["eyes"] => (blink(f, seed) ? "closed" : e);
const flap = (f: number, a: number, b: number, rest: Face["mouth"], loud = false): Face["mouth"] => (f >= a && f < b ? (Math.floor((f - a) / 4) % 2 ? "open" : loud ? "wide" : "grin") : rest);
const in_ = (f: number, a: number, b: number) => f >= a && f < b;

// ================================================================================================ room (B1-B4, B8)
export const kidRoom = (fr: number): Pose => {
  const f = tw(fr);
  const base = { x: -250, y: 0, bodyDy: Math.sin(f / 8) * 3 };
  if (f < 150) return { ...base, hold: true, face: { eyes: eb(f, 1, f > 100 ? "wide" : "happy"), brows: "up", mouth: f > 100 ? "o" : "grin", look: f > 100 ? 0 : 0.5 } };
  if (f < 250) return { ...base, hold: true, face: { eyes: eb(f, 1, "open"), brows: "flat", mouth: "smile", look: 0.8 } };
  if (f < 292) return { ...base, hold: true, face: { eyes: "open", brows: "up", mouth: flap(f, 262, 290, "grin"), look: -0.9, lookY: -0.3, sweat: true } };
  if (f < 340) return { ...base, armL: 60, armR: 60, face: { eyes: "shock", brows: "up", mouth: "o", look: 0, lookY: 0.7 } };
  if (f < 405) return { ...base, armL: 6, armR: 6, face: { eyes: eb(f, 2, "open"), brows: "flat", mouth: "smile", look: 0.8 } };
  if (f < 442) return { ...base, armL: 6, armR: 30, face: { eyes: "open", brows: "up", mouth: flap(f, 408, 438, "grin"), look: -0.9, sweat: true } };
  if (f < 510) return { ...base, armL: 40, armR: 40, face: { eyes: "shock", brows: "worried", mouth: "teeth", look: 0, lookY: 0.6 } };
  if (f < 575) return { ...base, armL: 8, armR: 8, face: { eyes: eb(f, 3, "open"), brows: "worried", mouth: "smile", look: 0.7, sweat: true } };
  if (f < 607) return { ...base, armL: 8, armR: 8, face: { eyes: "open", brows: "up", mouth: flap(f, 578, 602, "grin"), look: -0.9, sweat: true } };
  if (f < 690) return { ...base, bodyDy: 8, headTilt: 12, armL: 70, armR: 70, face: { eyes: f < 640 ? "squint" : "shock", brows: "worried", mouth: f < 640 ? "wide" : "o", look: 0.4, lookY: -0.5 } };
  // B8
  if (f < 1530) return { ...base, face: { eyes: eb(f, 4, "happy"), brows: "up", mouth: "smile", look: 0.7 } };
  if (f < 1605) return { ...base, face: { eyes: eb(f, 4, "open"), brows: "flat", mouth: "flat", look: 0.9 } };
  return { ...base, armL: 6, armR: 6, face: { eyes: "tired", brows: "smug", mouth: "smirk", look: 0.7 } };
};

export const dadRoom = (fr: number): Pose => {
  const f = tw(fr);
  const base = { x: 300, y: 0, bodyDy: Math.sin(f / 9 + 1) * 2 };
  if (f < 150) return { ...base, cross: true, face: { eyes: eb(f, 5, "open"), brows: "flat", mouth: "smile", look: -0.6 } };
  if (f < 250) return { ...base, armR: f > 200 ? 62 : 8, point: f > 200, face: { eyes: eb(f, 5, "open"), brows: "up", mouth: flap(f, 204, 248, "flat"), look: -0.8 } };
  if (f < 292) return { ...base, cross: true, face: { eyes: "open", brows: "angry", mouth: "flat", look: -0.8 } };
  if (f < 345) return { ...base, armL: 40, armR: 40, face: { eyes: "shock", brows: "up", mouth: "o", look: -0.8, lookY: -0.2 } };
  if (f < 405) return { ...base, cross: true, face: { eyes: eb(f, 6, "open"), brows: "flat", mouth: flap(f, 348, 398, "flat"), look: -0.8, lookY: -0.3 } };
  if (f < 510) return { ...base, armL: 30, armR: 30, face: { eyes: f < 442 ? "open" : "shock", brows: "up", mouth: f < 442 ? "flat" : "o", look: -0.8, lookY: -0.5 } };
  if (f < 607) return { ...base, armL: 10, armR: 10, face: { eyes: eb(f, 6, "open"), brows: "worried", mouth: flap(f, 512, 570, "flat"), look: -0.7, lookY: -0.8 } };
  if (f < 690) return { ...base, armL: 120, armR: 120, face: { eyes: "shock", brows: "up", mouth: "wide", look: -0.6, lookY: -1 } };
  // B8 — Dad lies about the obby
  if (f < 1455) return { ...base, face: { eyes: eb(f, 7, "happy"), brows: "up", mouth: "smile", look: -0.7 } };
  if (f < 1528) return { ...base, armR: 150, thumb: true, face: { eyes: eb(f, 7, "open"), brows: "up", mouth: flap(f, 1460, 1524, "smile"), look: -0.6 } };
  if (f < 1605) return { ...base, cross: f < 1560, face: { eyes: "open", brows: "up", mouth: flap(f, 1560, 1600, "grin"), look: 0.9, lookY: -0.3, sweat: f > 1570 } };
  return { ...base, bodyDy: 10, headTilt: -12, armL: 80, armR: 80, face: { eyes: f < 1640 ? "squint" : "shock", brows: "worried", mouth: f < 1640 ? "wide" : "o", look: -0.4, lookY: -0.4 } };
};

// ================================================================================================ outside (B5-B7)
export const kidOut = (fr: number): Pose => {
  const f = tw(fr);
  const base = { x: 0, y: 0 };
  if (f < 780) return { ...base, armL: 70 + Math.sin(f / 6) * 8, armR: 70 - Math.sin(f / 6) * 8, face: { eyes: eb(f, 8, "wide"), brows: "worried", mouth: "o", look: Math.sin(f / 20) * 0.8, lookY: 0.4 } };
  if (f < 832) return { ...base, armL: 30, armR: 150, thumb: true, face: { eyes: "open", brows: "up", mouth: flap(f, 784, 828, "grin", true), look: -0.6, sweat: true } };
  if (f < 965) return { ...base, armL: 60, armR: 60, face: { eyes: eb(f, 8, "shock"), brows: "up", mouth: "o", look: f < 900 ? -0.5 : 0.6, lookY: 0.8 } };
  if (f < 1032) return { ...base, armL: 20, armR: -30, face: { eyes: "open", brows: "angry", mouth: flap(f, 970, 1028, "grin", true), look: -0.8, sweat: true } };
  if (f < 1110) return { ...base, armL: 75 + Math.sin(f / 4) * 10, armR: 75 - Math.sin(f / 4) * 10, face: { eyes: "shock", brows: "up", mouth: "wide", look: Math.sin(f / 10) * 0.9, lookY: 0.6 } };
  if (f < 1342) {
    const talk = flap(f, 1190, 1233, flap(f, 1252, 1288, flap(f, 1302, 1338, "frown")));
    return { ...base, armL: 8, armR: 8, headTilt: 6, face: { eyes: eb(f, 9, "tired"), brows: "worried", mouth: talk === "grin" ? "open" : talk, look: 0.3, lookY: 0.7 } };
  }
  const k = backOut(seg(fr, 1342, 1352), 2);
  return { ...base, y: -20 * Math.sin(k * Math.PI), armL: 8, armR: lerp(8, 150, k), face: { eyes: eb(f, 9, "happy"), brows: "up", mouth: "smile", look: 0.6 } };
};

export const dadOut = (fr: number): Pose => {
  const f = tw(fr);
  const base = { x: 800, y: 0 };
  if (in_(f, 900, 965)) return { ...base, armL: 140 + Math.sin(f / 3) * 6, armR: 140 - Math.sin(f / 3) * 6, bodyDy: -6, face: { eyes: "angry", brows: "angry", mouth: flap(f, 905, 962, "wide", true), look: -0.6, lookY: -1, red: 0.4 } };
  if (f >= 1342) return { ...base, armL: 50, armR: 50, face: { eyes: eb(f, 10, "happy"), brows: "up", mouth: "smile", look: -0.8 } };
  return { ...base, armL: 30, armR: 30, face: { eyes: eb(f, 10, "shock"), brows: "up", mouth: f < 832 ? "o" : "wide", look: -0.7, lookY: -1 } };
};

export const NEIGHBORS: { k: "noob" | "noob2"; x: number; s: number; seed: number }[] = [
  { k: "noob", x: -1180, s: 1, seed: 11 }, { k: "noob2", x: -1480, s: 0.9, seed: 12 }, { k: "noob", x: 1300, s: 0.95, seed: 13 }, { k: "noob2", x: 1580, s: 1, seed: 14 },
];
export const neighborPose = (fr: number, n: (typeof NEIGHBORS)[number]): Pose => {
  const f = tw(fr);
  const up = f >= 1032 && f < 1342;
  const jump = f >= 850 && f < 862 ? -40 * Math.sin(((f - 850) / 12) * Math.PI) : 0;
  return {
    x: n.x, y: jump, sx: n.s, sy: n.s, armL: up ? 150 : f >= 850 ? 60 : 10, armR: up ? 150 : f >= 850 ? 60 : 10,
    face: f >= 1342 ? { eyes: eb(f, n.seed, "happy"), brows: "up", mouth: "smile", look: n.x < 0 ? 0.8 : -0.8 } : { eyes: eb(f, n.seed, "shock"), brows: "up", mouth: f >= 850 ? "wide" : "o", look: n.x < 0 ? 0.6 : -0.6, lookY: -1 },
  };
};
