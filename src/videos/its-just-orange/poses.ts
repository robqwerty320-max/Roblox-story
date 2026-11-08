// Per-frame poses (drawings on twos, hits on ones — see story.ts twos()). Anticipation -> action -> overshoot on big
// moves, squash & stretch on jump / landing / pops. Faces swapped per beat.
import { Pose, MouthShape } from "./chars";
import { POS, PLAT_TOP, twos, seg, lerp, backOut, easeOut, spring, mouthAt, hash, jumpAt } from "./story";

const blinkAt = (f: number, list: number[]) => list.some((b) => f >= b && f < b + 3);
const talk = (f: number, who: string, idle: MouthShape): MouthShape => (mouthAt(f, who) as MouthShape | null) ?? idle;


export const noobPose = (fr: number): Pose & { ghosts?: Pose[] } => {
  const f = twos(fr);
  const base: Pose = { x: POS.noob, y: PLAT_TOP, bodyDy: Math.sin(f / 7) * 3, face: { eyes: "blank", mouth: "rest", look: -0.6 } };
  if (f < 60) {
    return { ...base, headTilt: 3, face: { eyes: blinkAt(f, [44, 54]) ? "closed" : "blank", mouth: "rest", look: f < 36 ? -0.7 : -0.4, lookY: f > 40 ? 0.3 : 0 } };
  }
  if (f < 96) {
    // shrug: anticipation dip -> shoulders up with overshoot -> settle; then a look at the lava
    const a = seg(f, 62, 66), s = seg(f, 66, 74), back = seg(f, 90, 96);
    const up = (backOut(s, 2.5) * (1 - back)) * (1 - 0.3 * a * (1 - s));
    return {
      ...base, bodyDy: lerp(6 * a, -16, up), armL: 4 + 52 * up, armR: 4 + 52 * up, headTilt: 9 * up, headDy: -6 * up,
      face: { eyes: blinkAt(f, [80]) ? "closed" : "blank", brows: "up", mouth: talk(f, "noob", f > 90 ? "grin" : "rest"), look: f > 90 ? 0.8 : 0.1 },
    };
  }
  if (f < 102) {
    // anticipation crouch
    const c = easeOut(seg(f, 96, 101));
    return { ...base, sy: 1 - 0.27 * c, sx: 1 + 0.17 * c, bodyDy: 10 * c, armL: 4 + 30 * c, armR: 4 + 30 * c, face: { eyes: "blank", brows: "up", mouth: "grin", look: 0.8 } };
  }
  if (f < 132) {
    const j = jumpAt(fr), j2 = jumpAt(fr + 1);
    const vx = j2.x - j.x, vy = j2.y - j.y;
    const ang = (Math.atan2(vx, -vy) * 180) / Math.PI;
    const face = { eyes: "happy" as const, mouth: "grin" as const, look: 0.6 };
    if (fr < 104) return { x: j.x, y: j.y, sy: 1.45, sx: 0.72, rot: ang * 0.3, armL: 170, armR: 170, face };
    if (fr < 110 || (fr >= 127 && fr < 132)) {
      // smear frames on ones: the body becomes a streak along the arc, with ghosts trailing
      const ghosts: Pose[] = [1, 2, 3].map((k) => { const g = jumpAt(fr - k * 0.7); return { x: g.x, y: g.y, sy: 1.6, sx: 0.55, rot: ang, armL: 175, armR: 175, face, ghost: true, alpha: 0.42 - k * 0.1 }; });
      return { x: j.x, y: j.y, sy: 1.75, sx: 0.5, rot: ang, armL: 175, armR: 175, face, ghosts };
    }
    const t = seg(f, 110, 127);
    return { x: j.x, y: j.y, rot: lerp(ang * 0.4, 12, t), sy: lerp(1.15, 1.25, t), sx: lerp(0.9, 0.85, t), armL: 150 + 20 * Math.sin(f), armR: 150 - 20 * Math.sin(f), legL: 18, legR: 18, face };
  }
  if (fr < 134) {
    // impact frame drawing: flattened splat silhouette
    return { x: POS.land, y: 70, sy: 0.55, sx: 1.5, armL: 120, armR: 120, legL: 30, legR: 30, face: { eyes: "shock", mouth: "wide" } };
  }
  if (f < 312) {
    // charcoal: only eyes and mouth move
    const k = seg(fr, 134, 146);
    const sq = fr < 146 ? lerp(0.62, 1, spring(k, 2.5, 4)) : 1;
    const blink = blinkAt(f, [170, 184, 206, 238]);
    return {
      x: POS.land, y: 90, sy: sq, sx: 2 - sq, armL: 6, armR: 6, charcoal: true, crumble: f >= 232 ? 1 : 0,
      face: { eyes: blink ? "closed" : "blank", mouth: talk(f, "noob", f < 150 ? "open" : "flat"), look: f > 236 && f < 246 ? 0.5 : 0, lookY: f > 236 && f < 246 ? -0.6 : 0 },
    };
  }
  if (f < 330) {
    const k = seg(fr, 312, 320);
    const s = backOut(k, 3.2);
    return { ...base, sx: s * (1 + 0.12 * Math.sin(k * 9)), sy: s * (1 - 0.12 * Math.sin(k * 9)), armL: 18, armR: 18, face: { eyes: "blank", brows: "angry", mouth: f < 322 ? "wide" : "flat", look: -0.6 } };
  }
  if (f < 360) {
    // sprint in place: legs become a circular smear, arms pump
    const ph = fr * 1.25;
    return {
      ...base, rot: 7, bodyDy: -6 + Math.sin(fr * 1.6) * 6, legSmear: ph, armL: 35 + 45 * Math.sin(f * 0.9), armR: 35 - 45 * Math.sin(f * 0.9),
      face: { eyes: "blank", brows: "angry", mouth: talk(f, "noob", "flat"), look: -0.5 },
    };
  }
  if (f < 470) {
    // pointing at the checkpoint: wind-up, then arm snaps out with overshoot
    const p = seg(f, 360, 366);
    const arm = p < 1 ? lerp(10, 98, backOut(p, 2.5)) : 92 + Math.sin(f / 5) * 3;
    const angry = f < 420;
    const down = seg(f, 420, 428);
    return {
      ...base, rot: -4 * (1 - down), armR: lerp(arm, 6, down), point: down < 0.5, armL: lerp(20, 4, down),
      face: { eyes: "blank", brows: angry ? "angry" : "flat", mouth: talk(f, "noob", angry ? "flat" : "rest"), look: f < 404 ? 0.9 : -0.6 },
    };
  }
  if (f < 510) {
    // heads snap toward Dev (on ones), small startle hop
    const k = seg(fr, 470, 478);
    return {
      ...base, y: PLAT_TOP - 34 * Math.sin(k * Math.PI), headDx: -14 * backOut(k), headTilt: -10 * backOut(k), armL: 40 * Math.sin(k * Math.PI) + 8, armR: 40 * Math.sin(k * Math.PI) + 8,
      face: { eyes: "shock", brows: "up", mouth: f < 478 ? "wide" : "open", look: -1 },
    };
  }
  // B8: hop off into the lava, thumbs-up, slow sink
  if (fr < 512) return { ...base, sy: 0.84, sx: 1.12, face: { eyes: "happy", mouth: "smile", look: 0.5 } };
  const h = seg(fr, 512, 524);
  const x = lerp(POS.noob, POS.sink, h);
  const sink = Math.pow(seg(f, 530, 593), 1.5) * 700;
  const y = fr < 524 ? lerp(PLAT_TOP, 40, h) - 150 * 4 * h * (1 - h) : 40 + sink;
  const th = backOut(seg(f, 526, 534), 2.5);
  return {
    x, y, sy: fr < 524 ? 1.12 : fr < 530 ? lerp(0.85, 1, seg(fr, 524, 530)) : 1, sx: fr < 524 ? 0.92 : 1,
    armR: lerp(10, 172, th), thumb: th > 0.3, armL: 8, rot: Math.sin(f / 9) * 2,
    face: { eyes: "happy", mouth: "smile", look: 0, blush: true },
  };
};

export const proPose = (fr: number): Pose => {
  const f = twos(fr);
  const base: Pose = { x: POS.pro, y: PLAT_TOP, bodyDy: Math.sin(f / 9 + 1) * 2, face: { eyes: "tired", brows: "flat", mouth: "flat", look: 0.6 } };
  if (f < 60) {
    // points down at the lava: wind-up, point with overshoot
    const p = seg(f, 2, 8);
    const arm = p < 1 ? lerp(4, 52, backOut(p, 2.4)) : 46 + Math.sin(f / 4) * 2;
    return { ...base, armR: arm, point: true, headTilt: -4, face: { ...base.face, mouth: talk(f, "pro", "flat"), lookY: 0.4, look: 0.7 } };
  }
  if (f < 252) return base;
  if (f < 312) {
    // THAT'S LAVA! — head inflates 2x (on ones), veins, the mouth takes over the frame
    const k = seg(fr, 252, 262);
    const hs = 1 + 1.05 * backOut(k, 2.8);
    const m = mouthAt(f, "pro");
    const mouth: MouthShape = m === "wide" ? "scream" : m === "open" ? "wide" : m === "mid" ? "open" : f < 256 ? "flat" : "open";
    const jit = hash(f) * 4;
    return {
      ...base, headScale: hs, headDx: jit, headDy: hash(f + 7) * 4, bodyDy: -12, armL: 115 + hash(f + 3) * 10, armR: 115 + hash(f + 5) * 10,
      face: { eyes: "yell", brows: "angry", mouth, veins: true, look: 0 },
    };
  }
  if (f < 470) {
    return { ...base, armL: -8, armR: -8, face: { eyes: f > 404 ? "tired" : "tired", brows: f > 404 ? "worried" : "flat", mouth: "flat", look: 0.8, sweat: f > 404 } };
  }
  if (f < 512) {
    const k = seg(fr, 470, 478);
    return { ...base, headDx: 14 * backOut(k), headTilt: 10 * backOut(k), y: PLAT_TOP - 24 * Math.sin(k * Math.PI), face: { eyes: "shock", brows: "up", mouth: f < 478 ? "open" : "mid", look: 1 } };
  }
  // facepalm
  const k = seg(f, 512, 520);
  const shake = f > 524 ? Math.sin((f - 524) / 4.5) * 7 : 0;
  return {
    ...base, armR: lerp(4, -128, backOut(k, 1.6)), armRLen: lerp(1, 0.72, k), armsFront: k > 0.4, headTilt: 8 * k, headDx: shake, bodyDy: 6 * k,
    face: { eyes: "closed", brows: "worried", mouth: "frown", look: 0.2 },
  };
};

export const devPose = (fr: number): Pose | null => {
  const f = twos(fr);
  if (fr < 420) return null;
  const k = seg(fr, 420, 430);
  const face = { eyes: "smug" as const, brows: "up" as const, mouth: talk(f, "dev", "smug"), blush: true, look: 0 };
  if (fr < 430) {
    const y = PLAT_TOP + 420 * (1 - backOut(k, 3.4));
    return { x: POS.dev, y, sy: 1.3 - 0.3 * k, sx: 0.82 + 0.18 * k, armL: 150, armR: 150, face };
  }
  if (fr < 436) { const q = seg(fr, 430, 436); return { x: POS.dev, y: PLAT_TOP, sy: lerp(0.72, 1, spring(q, 2, 3)), sx: lerp(1.25, 1, spring(q, 2, 3)), armL: 20, armR: 20, face }; }
  if (f < 512) return { x: POS.dev, y: PLAT_TOP, bodyDy: Math.sin(f / 6) * 2, armL: 12, armR: 12, headTilt: Math.sin(f / 10) * 4, face };
  // waves goodbye
  return { x: POS.dev, y: PLAT_TOP, armL: 10, armR: 150 + 25 * Math.sin(f * 0.45), headTilt: 6, face: { eyes: "happy", brows: "up", mouth: "smile", blush: true } };
};
