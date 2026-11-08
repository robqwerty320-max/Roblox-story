// Per-frame poses. Drawings on twos (new pose every 2 frames); jumps/impacts on ones.
import { Pose, Face } from "./chars";
import { seg, lerp, clamp, backOut, easeOut, spring, hash, J, SPAWN, dadAvAt, holderAt } from "./story";

const tw = (f: number) => f - (f % 2);
/** natural blinks: 4-frame closes at pseudo-random 0.6-2.2 s intervals */
const blink = (f: number, seed: number) => {
  let t = (seed * 37) % 23;
  for (let i = 0; t < f + 10 && i < 200; i++) { if (f >= t && f < t + 4) return true; t += 18 + Math.floor((hash(i + seed * 11) * 0.5 + 0.5) * 48); }
  return false;
};
const eyesB = (f: number, seed: number, e: Face["eyes"]): Face["eyes"] => (blink(f, seed) ? "closed" : e);
const walk = (f: number, speed = 0.42) => { const s = Math.sin(f * speed); return { legL: 22 * s, legR: -22 * s, armL: 10 - 18 * s, armR: 10 + 18 * s, bodyDy: -Math.abs(Math.cos(f * speed)) * 8 }; };
/** lip flap for a short spoken word window */
const flap = (f: number, a: number, b: number, rest: Face["mouth"]): Face["mouth"] => (f >= a && f < b ? (Math.floor((f - a) / 4) % 2 ? "open" : "wide") : rest);

// ================================================================================================ room people
export const kidPose = (fr: number): (Pose & { behind?: boolean }) | null => {
  const f = tw(fr);
  if (f < 150) {
    if (f < 106) return { x: -300, y: 0, hold: true, bodyDy: Math.sin(f / 6) * 4, headTilt: Math.sin(f / 9) * 3, face: { eyes: eyesB(f, 1, f > 60 ? "happy" : "open"), mouth: "grin", brows: "up", look: 0.6 } };
    return { x: -300, y: 0, armL: 8, armR: 8, face: { eyes: eyesB(f, 1, "open"), mouth: "open", brows: "up", look: 0.8 } };
  }
  if (f >= 480 && f < 660) {
    const k = clamp(Math.sin((f - 480) / 14) * 1.4);
    return { x: 590, y: lerp(40, -70, Math.max(0, k)), behind: true, armL: 6, armR: 6, shadow: false, face: { eyes: eyesB(f, 2, "shock"), mouth: "o", brows: "worried", look: -0.9 } };
  }
  if (f >= 660 && f < 870) return { x: -925, y: 0, rot: 4, armL: 6, armR: 30, face: { eyes: eyesB(f, 3, f < 760 ? "open" : "shock"), mouth: f < 760 ? "flat" : "o", brows: "worried", look: 0.9 } };
  if (f >= 1050 && f < 1110) return { x: -400, y: 0, armL: 120 + Math.sin(f / 3) * 8, armR: 120 - Math.sin(f / 3) * 8, face: { eyes: "shock", mouth: "wide", brows: "up", look: 0.7 } };
  const cool: Face = { eyes: eyesB(f, 9, "tired"), brows: "flat", mouth: "smirk", look: 0 };
  if (f >= 1110 && f < 1168) return { x: lerp(-400, -20, easeOut(seg(f, 1110, 1168))), y: 0, ...walk(f), face: cool };
  if (f >= 1168 && f < 1176) return { x: -20, y: 0, armR: lerp(8, 82, backOut(seg(fr, 1168, 1175), 2)), face: cool };
  if (f >= 1176 && f < 1300) return { x: -20, y: 0, hold: true, tabletGlow: f >= 1252 && f < 1280 ? 1 : 0.4, bodyDy: f >= 1236 && f < 1242 ? 4 : 0, face: { ...cool, look: -0.5, lookY: -0.2, mouth: f >= 1256 ? "smile" : "smirk" } };
  if (f >= 1300 && f < 1312) return { x: -20, y: 0, armR: lerp(82, 8, seg(fr, 1306, 1312)), face: cool };
  if (f >= 1312 && f < 1400) return { x: lerp(-20, -1400, seg(f, 1316, 1396)), y: 0, ...walk(f), face: { ...cool, mouth: "smile" } };
  if (f >= 1560 && f < 1680) {
    const k = backOut(seg(fr, 1560, 1570), 2);
    return { x: -930 + 60 * k, y: 0, rot: -6 * k, armL: 6, armR: 150, headTilt: -8, face: { eyes: "tired", brows: "smug", mouth: flap(f, 1600, 1624, "smirk"), look: 0.6 } };
  }
  return null;
};

export const dadPose = (fr: number): (Pose & { seated?: boolean; crack?: boolean }) | null => {
  const f = tw(fr);
  const hold = holderAt(fr) === "dad";
  if (f < 150) {
    if (f < 96) return { x: 250, y: 0, cross: true, bodyDy: Math.sin(f / 8) * 3, headTilt: -4, face: { eyes: eyesB(f, 5, "open"), brows: "smug", mouth: f > 70 ? "grin" : "smirk", look: -0.7 } };
    if (f < 106) { const k = backOut(seg(fr, 96, 104), 2); return { x: 250, y: 0, armL: lerp(5, 78, k), armR: 8, face: { eyes: "open", brows: "smug", mouth: "smirk", look: -0.8 } }; }
    return { x: 250, y: 0, hold: true, headTilt: 5, face: { eyes: eyesB(f, 5, "open"), brows: "smug", mouth: f > 112 && f < 128 ? flap(f, 112, 128, "smirk") : "smirk", look: -0.2, lookY: 0.6 } };
  }
  if (f >= 450 && f < 480) return null;
  if (f >= 480 && f < 660) {
    const loud = f >= 540 && f < 600;
    return {
      x: 250, y: 0, hold: true, rot: Math.sin(fr * 1.9) * (loud ? 4 : 2), headDx: Math.sin(fr * 2.3) * (loud ? 8 : 3), bodyDy: loud ? -6 : 0,
      face: { eyes: "angry", brows: "angry", mouth: loud ? (Math.floor(f / 4) % 2 ? "scream" : "wide") : "teeth", red: loud ? 0.75 : 0.45, veins: true, sweat: f > 600, look: 0, lookY: loud ? 0 : 0.5 },
    };
  }
  if ((f >= 660 && f < 870) || f >= 1400) {
    const late = f >= 1500;
    const twitch = f >= 1625 && Math.floor(f / 4) % 3 === 0;
    return {
      x: 300, y: -170, seated: true, hold: true, tabletGlow: 1, shadow: false, bodyDy: Math.sin(fr * 1.3) * 2,
      face: { eyes: twitch ? "squint" : eyesB(f, 6, "tired"), brows: "angry", mouth: f > 1560 && f < 1625 ? "frown" : "flat", sweat: true, veins: late, look: f >= 1560 && f < 1625 ? -0.9 : 0, lookY: f >= 1560 && f < 1625 ? 0 : 0.6 },
    };
  }
  if (f >= 1050 && f < 1176) {
    const hop = Math.abs(Math.sin((f - 1050) / 6)) * 50;
    return { x: 250, y: -hop, hold: true, sy: 1 + 0.04 * Math.sin(f / 3), face: { eyes: "happy", brows: "up", mouth: "grin", look: -0.3 } };
  }
  if (f >= 1176 && f < 1400) {
    if (!hold) return { x: 250, y: 0, armL: f < 1290 ? 30 : 60, armR: 8, face: { eyes: f < 1290 ? eyesB(f, 7, "open") : "shock", brows: "up", mouth: f < 1290 ? "open" : "o", look: -0.9 } };
    const coal = seg(fr, 1330, 1346);
    return { x: 250, y: 0, hold: true, coal, crack: f >= 1370, face: { eyes: coal > 0.5 ? (blink(f, 8) ? "closed" : "open") : "shock", brows: "none", mouth: "flat", look: 0 } };
  }
  return null;
};

// ================================================================================================ game avatars
export const dadAvPose = (fr: number): Pose & { ghosts?: Pose[] } => {
  const f = fr;
  const p = dadAvAt(fr);
  const base = { x: p.x, y: p.y };
  // B2 attempt one
  if (f < 345) {
    if (f < 190) return { ...base, bodyDy: Math.sin(tw(f) / 7) * 3, armL: 12, armR: 12, face: { eyes: eyesB(tw(f), 10, "open"), brows: "angry", mouth: "smirk", look: 0.7 } };
    if (f < J.fail[0]) { const c = easeOut(seg(f, 190, 197)); return { ...base, sy: 1 - 0.25 * c, sx: 1 + 0.15 * c, armL: 12 + 30 * c, armR: 12 + 30 * c, face: { eyes: "open", brows: "angry", mouth: "teeth", look: 0.8 } }; }
    if (f < J.fail[1]) {
      const t = seg(f, J.fail[0], J.fail[1]);
      const scared = t > 0.55;
      return { ...base, sy: t < 0.15 ? 1.3 : 1.05, sx: t < 0.15 ? 0.8 : 0.97, rot: lerp(-6, 14, t), armL: scared ? 160 + Math.sin(f) * 15 : 150, armR: scared ? 160 - Math.sin(f) * 15 : 150, legL: 14, legR: -10, face: scared ? { eyes: "shock", brows: "up", mouth: "scream", look: 0, lookY: 0.8 } : { eyes: "happy", brows: "up", mouth: "grin", look: 0.6 } };
    }
    if (f < 236) return { x: 300, y: 70, sy: 0.6, sx: 1.4, armL: 120, armR: 120, face: { eyes: "shock", mouth: "wide" } };
    const sq = f < 250 ? lerp(0.7, 1, spring(seg(f, 236, 250), 2.5, 4)) : 1;
    return { x: 300, y: 80 + Math.sin(f / 9) * 4, sy: sq, sx: 2 - sq, armL: 6, armR: 6, coal: 1, shadow: false, face: { eyes: blink(tw(f), 11) ? "closed" : "open", brows: "none", mouth: "flat", look: f > 300 ? 0.4 : 0 } };
  }
  // B3 attempt twelve
  if (f < 870) {
    if (f < 352) { const s = backOut(seg(f, 345, 352), 3); return { x: SPAWN.x, y: SPAWN.y, sx: s, sy: s, face: { eyes: "open", mouth: "flat", brows: "flat" } }; }
    if (f < J.walk[1]) return { ...base, ...walk(tw(f), 0.38), face: { eyes: eyesB(tw(f), 12, "open"), brows: "flat", mouth: "smile", look: 0.8 } };
    if (f < J.fall[1]) return { ...base, armL: 30, armR: 30, legL: 8, legR: -8, rot: 4, face: { eyes: "open", brows: "flat", mouth: "smile", look: 0.4, lookY: 0.6 } };
    return { x: 90, y: 80 + Math.sin(f / 9) * 4, coal: 1, shadow: false, armL: 6, armR: 6, face: { eyes: blink(tw(f), 13) ? "closed" : "open", brows: "none", mouth: "flat", look: -0.3 } };
  }
  // B6 speedrun
  if (f < J.r1[0]) {
    const c = easeOut(seg(f, 882, 889));
    return { ...base, sy: 1 - 0.25 * c, sx: 1 + 0.15 * c, armL: 12 + 30 * c, armR: 12 + 30 * c, face: { eyes: "squint", brows: "angry", mouth: "smirk", look: 0.9 } };
  }
  const jumps = [J.r1, J.r2, J.r3];
  for (const [a, b] of jumps) {
    if (f >= a && f < b) {
      const t = seg(f, a, b);
      const ghosts: Pose[] = [1, 2, 3].map((k) => { const g = dadAvAt(f - k * 1.2); return { x: g.x, y: g.y, sy: 1.15, sx: 0.9, rot: 10, armL: 160, armR: 40, legL: 30, legR: -20, face: { eyes: "squint", mouth: "smirk" }, ghost: true, alpha: 0.4 - k * 0.1 }; });
      return { ...base, rot: lerp(-10, 20, t), sy: t < 0.2 ? 1.25 : 1, sx: t < 0.2 ? 0.85 : 1, armL: 160, armR: 40, legL: 30, legR: -20, face: { eyes: "squint", brows: "angry", mouth: "grin", look: 1 }, ghosts };
    }
    if (f >= b && f < b + 4) return { ...base, sy: 0.78, sx: 1.18, armL: 40, armR: 40, face: { eyes: "squint", brows: "angry", mouth: "grin", look: 1 } };
  }
  const hop = Math.abs(Math.sin((f - 950) / 5)) * 40 * (f > 950 ? 1 : 0);
  return { ...base, y: base.y - hop, armL: 160 + Math.sin(f / 2) * 10, armR: 160 - Math.sin(f / 2) * 10, face: { eyes: "happy", brows: "up", mouth: "grin", look: 0 } };
};
