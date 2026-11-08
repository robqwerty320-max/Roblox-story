// Blocky avatar people in the flat "story-short" look: rounded-square heads, thick dark-brown outline, flat fill +
// one soft shadow band, pink cheeks, glossy black oval eyes. Origin = between the feet, y up is negative.
// All strokes scale with the camera (vector-art zoom), like the reference look.
import React from "react";

export const OL = "#2b1a12";
const LW = 9;

export type Eyes = "open" | "wide" | "closed" | "happy" | "tired" | "squint" | "shock" | "angry" | "cool";
export type Mouth = "smile" | "grin" | "open" | "wide" | "flat" | "smirk" | "frown" | "scream" | "o" | "teeth";
export type Brows = "none" | "up" | "angry" | "worried" | "flat" | "smug";
export type Face = { eyes: Eyes; mouth: Mouth; brows?: Brows; look?: number; lookY?: number; sweat?: boolean; veins?: boolean; noBlush?: boolean; red?: number };
export type Kind = "kid" | "dad" | "mom" | "dadAv" | "momAv" | "noob" | "noob2";

export type Pose = {
  x: number; y: number; sx?: number; sy?: number; rot?: number;
  bodyDy?: number; armL?: number; armR?: number; legL?: number; legR?: number;
  headDx?: number; headDy?: number; headTilt?: number; headScale?: number;
  face: Face;
  hold?: boolean; // tablet in both hands, in front of the chest
  cross?: boolean; // arms crossed
  coal?: number; // 0..1 charcoal amount
  point?: boolean; thumb?: boolean;
  ghost?: boolean; alpha?: number;
  shadow?: boolean; // contact shadow (default on)
  tabletGlow?: number;
};

type C2 = [string, string];
type Look = { head: [number, number]; torso: [number, number]; arm: [number, number]; leg: [number, number]; skin: C2; shirt: C2; sleeve: C2; hand: C2; pants: C2; shoe: C2 };
const SKIN: C2 = ["#ffd7b0", "#f2b98c"];
const LOOKS: Record<Kind, Look> = {
  kid: { head: [184, 168], torso: [150, 128], arm: [60, 132], leg: [70, 124], skin: SKIN, shirt: ["#27c4b4", "#1a9a8e"], sleeve: ["#27c4b4", "#1a9a8e"], hand: SKIN, pants: ["#3f6fe0", "#2c52b3"], shoe: ["#f5f5f5", "#cfd3dc"] },
  dad: { head: [194, 178], torso: [190, 176], arm: [72, 176], leg: [86, 170], skin: SKIN, shirt: ["#b0304a", "#87223a"], sleeve: ["#b0304a", "#87223a"], hand: SKIN, pants: ["#d9b77c", "#b8945a"], shoe: ["#5a3b25", "#3f2817"] },
  mom: { head: [186, 172], torso: [170, 168], arm: [64, 170], leg: [78, 168], skin: SKIN, shirt: ["#5fd6a4", "#3fb083"], sleeve: ["#5fd6a4", "#3fb083"], hand: SKIN, pants: ["#33406b", "#232d50"], shoe: ["#ffffff", "#d6d9e2"] },
  dadAv: { head: [194, 178], torso: [190, 176], arm: [72, 176], leg: [86, 170], skin: ["#ffd23f", "#e6b417"], shirt: ["#2f86ff", "#1f62c9"], sleeve: ["#ffd23f", "#e6b417"], hand: ["#ffd23f", "#e6b417"], pants: ["#46c75a", "#2f9a42"], shoe: ["#46c75a", "#2f9a42"] },
  noob: { head: [184, 170], torso: [180, 170], arm: [68, 170], leg: [82, 166], skin: ["#ffd23f", "#e6b417"], shirt: ["#2f86ff", "#1f62c9"], sleeve: ["#ffd23f", "#e6b417"], hand: ["#ffd23f", "#e6b417"], pants: ["#46c75a", "#2f9a42"], shoe: ["#46c75a", "#2f9a42"] },
  noob2: { head: [184, 170], torso: [180, 170], arm: [68, 170], leg: [82, 166], skin: ["#c98a5a", "#a86c40"], shirt: ["#ff8a3d", "#d9662a"], sleeve: ["#ff8a3d", "#d9662a"], hand: ["#c98a5a", "#a86c40"], pants: ["#3f6fe0", "#2c52b3"], shoe: ["#ffffff", "#d6d9e2"] },
  momAv: { head: [186, 172], torso: [170, 168], arm: [64, 170], leg: [78, 168], skin: SKIN, shirt: ["#ff5fa2", "#d93e80"], sleeve: ["#ff5fa2", "#d93e80"], hand: SKIN, pants: ["#2b2f45", "#1c1f30"], shoe: ["#ffffff", "#d6d9e2"] },
};
export const look = (k: Kind) => LOOKS[k];
const COAL: C2 = ["#3a3330", "#26201d"];
const mix = (a: string, b: string, t: number) => {
  if (t <= 0) return a; if (t >= 1) return b;
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const mc = (c: C2, coal: number): C2 => [mix(c[0], COAL[0], coal), mix(c[1], COAL[1], coal)];

/** rounded block with a soft right-hand shadow band */
export const Blk: React.FC<{ x: number; y: number; w: number; h: number; c: C2; r?: number; lw?: number; ghost?: boolean; band?: number }> = ({ x, y, w, h, c, r = 18, lw = LW, ghost, band = 0.24 }) => {
  const rr = Math.min(r, w / 2, h / 2);
  const bx = x + w * (1 - band);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rr} fill={c[0]} />
      {!ghost && <path d={`M${bx} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h - rr} Q${x + w} ${y + h} ${x + w - rr} ${y + h} H${bx} Z`} fill={c[1]} />}
      {!ghost && <rect x={x} y={y} width={w} height={h} rx={rr} fill="none" stroke={OL} strokeWidth={lw} />}
    </g>
  );
};

// ------------------------------------------------------------------------------------------------ face
const EyeG: React.FC<{ cx: number; cy: number; e: Eyes; s: number; lx: number; ly: number; side: number; coal: number }> = ({ cx, cy, e, s, lx, ly, side, coal }) => {
  const ink = coal > 0.5 ? "#fff6e8" : OL;
  if (e === "closed") return <path d={`M${cx - 16 * s} ${cy + 2 * s} Q${cx} ${cy + 12 * s} ${cx + 16 * s} ${cy + 2 * s}`} fill="none" stroke={ink} strokeWidth={8 * s} strokeLinecap="round" />;
  if (e === "happy") return <path d={`M${cx - 17 * s} ${cy + 8 * s} Q${cx} ${cy - 16 * s} ${cx + 17 * s} ${cy + 8 * s}`} fill="none" stroke={ink} strokeWidth={9 * s} strokeLinecap="round" />;
  if (e === "squint") return <path d={`M${cx - 17 * s} ${cy - 4 * s * side} L${cx + 17 * s} ${cy + 4 * s * side}`} fill="none" stroke={ink} strokeWidth={9 * s} strokeLinecap="round" />;
  if (e === "cool") return null; // sunglasses drawn by the accessory layer
  if (e === "shock" || (coal > 0.5 && e !== "angry" && e !== "tired")) {
    const rx = (e === "shock" ? 24 : 19) * s, ry = (e === "shock" ? 30 : 24) * s;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={OL} strokeWidth={6 * s} />
        <circle cx={cx + lx * rx * 0.35} cy={cy + ly * ry * 0.3} r={(e === "shock" ? 6 : 8) * s} fill={OL} />
      </g>
    );
  }
  // glossy black oval
  const rx = (e === "wide" ? 15 : 12.5) * s, ry = (e === "wide" ? 25 : 21) * s;
  const px = cx + lx * 6 * s, py = cy + ly * 5 * s;
  return (
    <g>
      <ellipse cx={px} cy={py} rx={rx} ry={ry} fill={coal > 0.5 ? "#fff6e8" : "#1c120d"} />
      <circle cx={px - rx * 0.32} cy={py - ry * 0.42} r={rx * 0.36} fill="#fff" />
      {e === "tired" && <path d={`M${cx - 20 * s} ${cy - 26 * s} H${cx + 20 * s} V${cy - 2 * s} Q${cx} ${cy + 3 * s} ${cx - 20 * s} ${cy - 2 * s} Z`} fill={coal > 0.5 ? COAL[0] : SKIN[0]} />}
      {e === "tired" && <path d={`M${cx - 16 * s} ${cy - 2 * s} Q${cx} ${cy + 3 * s} ${cx + 16 * s} ${cy - 2 * s}`} fill="none" stroke={ink} strokeWidth={6 * s} strokeLinecap="round" />}
      {e === "angry" && <path d={`M${cx - 22 * s} ${cy - 28 * s} L${cx + 22 * s} ${cy - 28 * s} L${cx + 22 * s * side} ${cy - 6 * s} Z`} fill={coal > 0.5 ? COAL[0] : SKIN[0]} />}
    </g>
  );
};

const MouthG: React.FC<{ m: Mouth; cx: number; cy: number; s: number; coal: number }> = ({ m, cx, cy, s, coal }) => {
  const ink = coal > 0.5 ? "#fff6e8" : OL;
  const dark = "#7c1f22", tongue = "#ff7b8a";
  const line = (d: string) => <path d={d} fill="none" stroke={ink} strokeWidth={8 * s} strokeLinecap="round" strokeLinejoin="round" />;
  const dshape = (w: number, h: number, teeth: boolean) => {
    const d = `M${cx - w} ${cy - h * 0.25} Q${cx} ${cy - h * 0.38} ${cx + w} ${cy - h * 0.25} Q${cx + w * 0.92} ${cy + h} ${cx} ${cy + h} Q${cx - w * 0.92} ${cy + h} ${cx - w} ${cy - h * 0.25} Z`;
    return (
      <g>
        <path d={d} fill={dark} />
        <ellipse cx={cx} cy={cy + h * 0.72} rx={w * 0.55} ry={h * 0.3} fill={tongue} />
        {teeth && <path d={`M${cx - w * 0.86} ${cy - h * 0.26} Q${cx} ${cy - h * 0.38} ${cx + w * 0.86} ${cy - h * 0.26} L${cx + w * 0.8} ${cy + h * 0.06} Q${cx} ${cy - h * 0.04} ${cx - w * 0.8} ${cy + h * 0.06} Z`} fill="#fff" />}
        <path d={d} fill="none" stroke={OL} strokeWidth={7 * s} strokeLinejoin="round" />
      </g>
    );
  };
  switch (m) {
    case "smile": return line(`M${cx - 26 * s} ${cy - 4 * s} Q${cx} ${cy + 20 * s} ${cx + 26 * s} ${cy - 4 * s}`);
    case "smirk": return line(`M${cx - 24 * s} ${cy + 4 * s} Q${cx + 2 * s} ${cy + 12 * s} ${cx + 26 * s} ${cy - 10 * s}`);
    case "flat": return line(`M${cx - 20 * s} ${cy + 4 * s} L${cx + 20 * s} ${cy + 4 * s}`);
    case "frown": return line(`M${cx - 22 * s} ${cy + 10 * s} Q${cx} ${cy - 8 * s} ${cx + 22 * s} ${cy + 10 * s}`);
    case "grin": return dshape(32 * s, 34 * s, true);
    case "open": return dshape(22 * s, 26 * s, false);
    case "wide": return dshape(30 * s, 40 * s, true);
    case "scream": return dshape(42 * s, 56 * s, true);
    case "o": return (<g><ellipse cx={cx} cy={cy + 6 * s} rx={13 * s} ry={17 * s} fill={dark} stroke={OL} strokeWidth={7 * s} /></g>);
    case "teeth": {
      const w = 34 * s, h = 22 * s;
      return (
        <g>
          <rect x={cx - w} y={cy - h / 2} width={w * 2} height={h} rx={8 * s} fill="#fff" stroke={OL} strokeWidth={7 * s} />
          {[-0.5, 0, 0.5].map((k) => <line key={k} x1={cx + k * w} y1={cy - h / 2} x2={cx + k * w} y2={cy + h / 2} stroke={OL} strokeWidth={4 * s} />)}
          <line x1={cx - w} y1={cy} x2={cx + w} y2={cy} stroke={OL} strokeWidth={4 * s} />
        </g>
      );
    }
  }
};

const BrowG: React.FC<{ b: Brows; ex: number; ey: number; s: number; c: string }> = ({ b, ex, ey, s, c }) => {
  if (b === "none") return null;
  const one = (cx: number, side: number) => {
    const y = ey - 40 * s;
    let d = "";
    if (b === "up") d = `M${cx - 16 * s} ${y + 2 * s} Q${cx} ${y - 12 * s} ${cx + 16 * s} ${y + 2 * s}`;
    if (b === "flat") d = `M${cx - 16 * s} ${y + 6 * s} L${cx + 16 * s} ${y + 6 * s}`;
    if (b === "angry") d = `M${cx - 18 * s * side} ${y - 2 * s} L${cx + 16 * s * side} ${y + 14 * s}`;
    if (b === "worried") d = `M${cx - 16 * s * side} ${y + 10 * s} L${cx + 16 * s * side} ${y - 4 * s}`;
    if (b === "smug") d = side > 0 ? `M${cx - 16 * s} ${y - 6 * s} Q${cx} ${y - 16 * s} ${cx + 16 * s} ${y - 4 * s}` : `M${cx - 16 * s} ${y + 8 * s} L${cx + 16 * s} ${y + 8 * s}`;
    return <path d={d} fill="none" stroke={c} strokeWidth={11 * s} strokeLinecap="round" />;
  };
  return <g>{one(-ex, 1)}{one(ex, -1)}</g>;
};

// ------------------------------------------------------------------------------------------------ hair / accessories
const hairCol: Partial<Record<Kind, C2>> = { kid: ["#8b5a2b", "#6b4220"], dad: ["#4a2e1c", "#33200f"], mom: ["#f2c14e", "#d49b2a"], momAv: ["#f2c14e", "#d49b2a"] };

const HairBack: React.FC<{ k: Kind; w: number; h: number; coal: number; f: number }> = ({ k, w, h, coal, f }) => {
  if (k !== "mom" && k !== "momAv") return null;
  const c = mc(hairCol[k]!, coal);
  const sw = Math.sin(f / 7) * 8;
  return (
    <g>
      <path d={`M${w * 0.32} ${-h * 0.42} Q${w * 0.78 + sw} ${-h * 0.4} ${w * 0.7 + sw} ${h * 0.05} Q${w * 0.66 + sw} ${h * 0.42} ${w * 0.5 + sw * 1.4} ${h * 0.5} Q${w * 0.46} ${h * 0.12} ${w * 0.4} ${-h * 0.1} Z`} fill={c[0]} stroke={OL} strokeWidth={LW} strokeLinejoin="round" />
      <circle cx={w * 0.42} cy={-h * 0.36} r={w * 0.08} fill="#ff6fa8" stroke={OL} strokeWidth={LW * 0.8} />
    </g>
  );
};

const HairFront: React.FC<{ k: Kind; w: number; h: number; coal: number }> = ({ k, w, h, coal }) => {
  const hw = w / 2, hh = h / 2;
  if (k === "kid") {
    const c = mc(hairCol.kid!, coal);
    const d = `M${-hw - 8} ${-hh * 0.05} V${-hh * 0.55} Q${-hw - 6} ${-hh - 14} ${-hw * 0.5} ${-hh - 18} Q${0} ${-hh - 34} ${hw * 0.55} ${-hh - 18} Q${hw + 8} ${-hh - 10} ${hw + 8} ${-hh * 0.5} V${-hh * 0.08}
      Q${hw - 4} ${-hh * 0.42} ${hw * 0.66} ${-hh * 0.48} Q${hw * 0.5} ${-hh * 0.3} ${hw * 0.3} ${-hh * 0.46} Q${hw * 0.08} ${-hh * 0.28} ${-hw * 0.14} ${-hh * 0.46} Q${-hw * 0.36} ${-hh * 0.28} ${-hw * 0.56} ${-hh * 0.46} Q${-hw * 0.78} ${-hh * 0.34} ${-hw * 0.86} ${-hh * 0.42} Q${-hw - 2} ${-hh * 0.3} ${-hw - 8} ${-hh * 0.05} Z`;
    return (
      <g>
        <path d={d} fill={c[0]} />
        <path d={`M${-hw * 0.4} ${-hh - 6} Q${0} ${-hh - 20} ${hw * 0.5} ${-hh - 6} Q${hw * 0.1} ${-hh * 0.82} ${-hw * 0.4} ${-hh - 6} Z`} fill={c[1]} opacity={0.8} />
        <path d={d} fill="none" stroke={OL} strokeWidth={LW} strokeLinejoin="round" />
      </g>
    );
  }
  if (k === "dad") {
    const c = mc(hairCol.dad!, coal);
    const d = `M${-hw - 6} ${-hh * 0.18} V${-hh * 0.7} Q${-hw - 4} ${-hh - 12} ${-hw * 0.4} ${-hh - 14} H${hw * 0.5} Q${hw + 6} ${-hh - 12} ${hw + 6} ${-hh * 0.6} V${-hh * 0.2} Q${hw * 0.8} ${-hh * 0.5} ${hw * 0.5} ${-hh * 0.58} Q${-hw * 0.05} ${-hh * 0.66} ${-hw * 0.2} ${-hh * 0.95} Q${-hw * 0.5} ${-hh * 0.58} ${-hw * 0.82} ${-hh * 0.54} Q${-hw - 2} ${-hh * 0.4} ${-hw - 6} ${-hh * 0.18} Z`;
    return <g><path d={d} fill={c[0]} /><path d={d} fill="none" stroke={OL} strokeWidth={LW} strokeLinejoin="round" /></g>;
  }
  if (k === "mom" || k === "momAv") {
    const c = mc(hairCol[k]!, coal);
    const d = `M${-hw - 8} ${hh * 0.05} V${-hh * 0.6} Q${-hw - 6} ${-hh - 16} ${-hw * 0.3} ${-hh - 18} H${hw * 0.4} Q${hw + 8} ${-hh - 14} ${hw + 8} ${-hh * 0.55} V${-hh * 0.1} Q${hw * 0.7} ${-hh * 0.5} ${hw * 0.2} ${-hh * 0.55} Q${-hw * 0.3} ${-hh * 0.2} ${-hw * 0.62} ${-hh * 0.42} Q${-hw * 0.8} ${-hh * 0.1} ${-hw - 8} ${hh * 0.05} Z`;
    return <g><path d={d} fill={c[0]} /><path d={`M${-hw * 0.3} ${-hh - 8} Q${hw * 0.1} ${-hh - 18} ${hw * 0.5} ${-hh - 6}`} stroke={c[1]} strokeWidth={10} fill="none" strokeLinecap="round" /><path d={d} fill="none" stroke={OL} strokeWidth={LW} strokeLinejoin="round" /></g>;
  }
  return null;
};

/** mustache + glasses (dad, dadAv), sunglasses (momAv) — follow the face look offset */
const FaceGear: React.FC<{ k: Kind; w: number; h: number; ox: number; oy: number; coal: number; eyes: Eyes }> = ({ k, w, h, ox, oy, coal, eyes }) => {
  const s = w / 190, ex = w * 0.2, ey = -h * 0.04 + oy;
  const out: React.ReactNode[] = [];
  if (k === "dad" || k === "dadAv") {
    const mcol = coal > 0.5 ? COAL[1] : "#4a2e1c";
    out.push(
      <path key="m" d={`M${ox} ${h * 0.15 + oy} Q${ox - 22 * s} ${h * 0.1 + oy} ${ox - 50 * s} ${h * 0.17 + oy} Q${ox - 62 * s} ${h * 0.25 + oy} ${ox - 40 * s} ${h * 0.25 + oy} Q${ox - 18 * s} ${h * 0.22 + oy} ${ox} ${h * 0.2 + oy} Q${ox + 18 * s} ${h * 0.22 + oy} ${ox + 40 * s} ${h * 0.25 + oy} Q${ox + 62 * s} ${h * 0.25 + oy} ${ox + 50 * s} ${h * 0.17 + oy} Q${ox + 22 * s} ${h * 0.1 + oy} ${ox} ${h * 0.15 + oy} Z`} fill={mcol} stroke={OL} strokeWidth={6 * s} strokeLinejoin="round" />,
    );
    const g = (cx: number) => <rect key={cx} x={cx - 30 * s} y={ey - 30 * s} width={60 * s} height={56 * s} rx={14 * s} fill="#cfefff" fillOpacity={0.22} stroke={OL} strokeWidth={7 * s} />;
    out.push(g(-ex + ox), g(ex + ox), <path key="b" d={`M${-ex + ox + 30 * s} ${ey - 8 * s} Q${ox} ${ey - 16 * s} ${ex + ox - 30 * s} ${ey - 8 * s}`} fill="none" stroke={OL} strokeWidth={7 * s} />);
  }
  if (k === "momAv" || eyes === "cool") {
    out.push(
      <path key="sg" d={`M${-ex + ox - 40 * s} ${ey - 22 * s} H${ex + ox + 40 * s} V${ey - 8 * s} Q${ex + ox + 38 * s} ${ey + 26 * s} ${ex + ox} ${ey + 22 * s} Q${ex + ox - 30 * s} ${ey + 20 * s} ${ox + 6 * s} ${ey - 6 * s} H${ox - 6 * s} Q${-ex + ox + 30 * s} ${ey + 20 * s} ${-ex + ox} ${ey + 22 * s} Q${-ex + ox - 38 * s} ${ey + 26 * s} ${-ex + ox - 40 * s} ${ey - 8 * s} Z`} fill="#1b1b24" stroke={OL} strokeWidth={6 * s} strokeLinejoin="round" />,
      <path key="sh" d={`M${-ex + ox - 22 * s} ${ey - 12 * s} L${-ex + ox - 4 * s} ${ey - 12 * s} L${-ex + ox - 16 * s} ${ey + 8 * s} Z`} fill="#fff" opacity={0.7} />,
    );
  }
  return <g>{out}</g>;
};

export const HeadG: React.FC<{ k: Kind; face: Face; coal: number; f: number; ghost?: boolean }> = ({ k, face, coal, f, ghost }) => {
  const L = LOOKS[k];
  const [w, h] = L.head;
  const s = w / 190;
  const lx = face.look ?? 0, ly = face.lookY ?? 0;
  const ox = lx * w * 0.08, oy = ly * h * 0.05;
  const skin = mc(face.red ? [mix(L.skin[0], "#ff6150", face.red), mix(L.skin[1], "#e0402f", face.red)] : L.skin, coal);
  const r = w * 0.26;
  const ex = w * 0.2, ey = -h * 0.04 + oy;
  return (
    <g>
      {!ghost && <HairBack k={k} w={w} h={h} coal={coal} f={f} />}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill={skin[0]} />
      {!ghost && <path d={`M${w * 0.24} ${-h / 2} H${w / 2 - r} Q${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + r} V${h / 2 - r} Q${w / 2} ${h / 2} ${w / 2 - r} ${h / 2} H${w * 0.24} Q${w * 0.34} 0 ${w * 0.24} ${-h / 2} Z`} fill={skin[1]} opacity={0.55} />}
      {!ghost && <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill="none" stroke={OL} strokeWidth={LW} />}
      {!ghost && (
        <g>
          {!face.noBlush && coal < 0.5 && <><ellipse cx={-w * 0.3 + ox} cy={h * 0.13 + oy} rx={18 * s} ry={10 * s} fill="#ff8fa3" opacity={0.55} /><ellipse cx={w * 0.3 + ox} cy={h * 0.13 + oy} rx={18 * s} ry={10 * s} fill="#ff8fa3" opacity={0.55} /></>}
          <EyeG cx={-ex + ox} cy={ey} e={face.eyes} s={s} lx={lx} ly={ly} side={1} coal={coal} />
          <EyeG cx={ex + ox} cy={ey} e={face.eyes} s={s} lx={lx} ly={ly} side={-1} coal={coal} />
          <g transform={`translate(${ox} 0)`}><BrowG b={face.brows ?? "none"} ex={ex} ey={ey} s={s} c={coal > 0.5 ? "#fff6e8" : k === "mom" || k === "momAv" ? "#b07a1e" : "#3b2414"} /></g>
          <MouthG m={face.mouth} cx={ox} cy={h * 0.27 + oy} s={s} coal={coal} />
          <FaceGear k={k} w={w} h={h} ox={ox} oy={oy} coal={coal} eyes={face.eyes} />
          <HairFront k={k} w={w} h={h} coal={coal} />
          {face.veins && (
            <g transform={`translate(${w * 0.36} ${-h * 0.4}) scale(${s * 1.5})`} fill="none" strokeLinecap="round">
              {[[OL, 17], ["#ff2a3d", 9]].map(([c, sw]) => (
                <g key={c as string} stroke={c as string} strokeWidth={sw as number}>
                  <path d="M-18 -5 Q-5 -5 -5 -18" /><path d="M5 -18 Q5 -5 18 -5" /><path d="M18 5 Q5 5 5 18" /><path d="M-5 18 Q-5 5 -18 5" />
                </g>
              ))}
            </g>
          )}
          {face.sweat && <path d={`M${-w * 0.46} ${-h * 0.22} q${12 * s} ${18 * s} 0 ${28 * s} q${-12 * s} ${-8 * s} 0 ${-28 * s} Z`} fill="#8fd8ff" stroke={OL} strokeWidth={5 * s} />}
        </g>
      )}
    </g>
  );
};

// ------------------------------------------------------------------------------------------------ props
export const Tablet: React.FC<{ w?: number; glow?: number; rot?: number }> = ({ w = 170, glow = 0, rot = 0 }) => {
  const h = w * 0.66;
  return (
    <g transform={`rotate(${rot})`}>
      {glow > 0 && <ellipse cx={0} cy={0} rx={w * 1.1} ry={h * 1.3} fill="#9fe3ff" opacity={0.25 * glow} />}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16} fill="#2c2d3d" stroke={OL} strokeWidth={8} />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx={6} fill="#7fd4ff" />
      <rect x={-w / 2 + 12} y={h / 2 - 34} width={w - 24} height={22} fill="#ff6a2a" />
      <rect x={-w * 0.32} y={-4} width={w * 0.18} height={14} rx={3} fill="#46c75a" stroke={OL} strokeWidth={3} />
      <rect x={w * 0.05} y={-18} width={w * 0.16} height={12} rx={3} fill="#ffd23f" stroke={OL} strokeWidth={3} />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx={6} fill="#ffffff" opacity={0.18 + 0.3 * glow} />
    </g>
  );
};

// ------------------------------------------------------------------------------------------------ body
const Limb: React.FC<{ px: number; py: number; ang: number; w: number; len: number; top: C2; bot: C2; split: number; ghost?: boolean; extra?: React.ReactNode }> = ({ px, py, ang, w, len, top, bot, split, ghost, extra }) => (
  <g transform={`translate(${px} ${py}) rotate(${ang})`}>
    <Blk x={-w / 2} y={-w * 0.4} w={w} h={len + w * 0.4} c={bot} r={w * 0.38} ghost={ghost} />
    {split > 0 && <g><rect x={-w / 2} y={-w * 0.4} width={w} height={(len + w * 0.4) * split} rx={w * 0.38} fill={top[0]} />{!ghost && <rect x={-w / 2} y={-w * 0.4} width={w} height={(len + w * 0.4) * split} rx={w * 0.38} fill="none" stroke={OL} strokeWidth={LW} />}</g>}
    {extra}
  </g>
);

export const Person: React.FC<{ k: Kind; p: Pose; f: number }> = ({ k, p, f }) => {
  const L = LOOKS[k];
  const coal = p.coal ?? 0;
  const ghost = !!p.ghost;
  const [hw, hh] = L.head, [tw, th] = L.torso, [aw, ah] = L.arm, [lw, lh] = L.leg;
  const body = p.bodyDy ?? 0;
  const top = -lh - th + body;
  const hs = p.headScale ?? 1;
  const headY = top - (hh * hs) / 2 + 8 + (p.headDy ?? 0);
  const shirt = mc(L.shirt, coal), sleeve = mc(L.sleeve, coal), hand = mc(L.hand, coal), pants = mc(L.pants, coal), shoe = mc(L.shoe, coal);
  const sleeveSplit = k === "dadAv" || k === "noob" ? 0 : 0.5;
  const armPx = tw / 2 + aw * 0.3, armPy = top + aw * 0.45;
  const armLAng = p.cross ? -62 : p.hold ? -34 : (p.armL ?? 5);
  const armRAng = p.cross ? -58 : p.hold ? -34 : (p.armR ?? 5);
  const armLen = p.cross ? ah * 0.62 : p.hold ? ah * 0.8 : ah;
  const handExtra = (side: number) => (
    <>
      {p.point && side > 0 && <Blk x={-aw * 0.17} y={armLen - 10} w={aw * 0.34} h={aw * 0.9} c={hand} r={aw * 0.17} ghost={ghost} />}
      {p.thumb && side > 0 && <Blk x={-aw * 0.5} y={armLen - aw * 0.1} w={aw * 0.36} h={aw * 0.8} c={hand} r={aw * 0.17} ghost={ghost} />}
    </>
  );
  const arm = (side: -1 | 1, ang: number) => (
    <Limb px={side * armPx} py={armPy} ang={side < 0 ? ang : -ang} w={aw} len={armLen} top={sleeve} bot={hand} split={sleeveSplit} ghost={ghost} extra={handExtra(side)} />
  );
  const leg = (side: -1 | 1, ang: number) => (
    <g transform={`translate(${(side * lw) / 2 + side * 2} ${-lh}) rotate(${side < 0 ? ang : -ang})`}>
      <Blk x={-lw / 2} y={0} w={lw} h={lh} c={pants} r={14} ghost={ghost} />
      <Blk x={-lw / 2 - 2} y={lh - 30} w={lw + 4} h={30} c={shoe} r={12} ghost={ghost} />
    </g>
  );
  const front = !!(p.hold || p.cross);
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${p.rot ?? 0}) scale(${p.sx ?? 1} ${p.sy ?? 1})`} opacity={p.alpha ?? 1}>
      {p.shadow !== false && !ghost && <ellipse cx={0} cy={4} rx={tw * 0.75} ry={22} fill="#2b1a12" opacity={0.18} />}
      {leg(-1, p.legL ?? 0)}
      {leg(1, p.legR ?? 0)}
      {!front && arm(-1, armLAng)}
      {!front && arm(1, armRAng)}
      <Blk x={-tw / 2} y={top} w={tw} h={th} c={shirt} r={24} ghost={ghost} />
      {!ghost && coal < 0.5 && k === "kid" && <path transform={`translate(0 ${top + th * 0.46}) scale(1.6)`} d="M0 -22 L6 -7 L22 -7 L9 3 L14 19 L0 9 L-14 19 L-9 3 L-22 -7 L-6 -7 Z" fill="#ffd23f" stroke={OL} strokeWidth={4} strokeLinejoin="round" />}
      {!ghost && coal < 0.5 && k === "dad" && <g><path d={`M${-tw * 0.22} ${top + 2} L0 ${top + 44} L${tw * 0.22} ${top + 2}`} fill="#d9566c" stroke={OL} strokeWidth={7} strokeLinejoin="round" />{[0, 1].map((i) => <circle key={i} cx={0} cy={top + 62 + i * 30} r={6} fill="#fff" stroke={OL} strokeWidth={3} />)}</g>}
      {!ghost && coal < 0.5 && (k === "mom" || k === "momAv") && <path d={`M${-tw * 0.18} ${top + 2} Q0 ${top + 46} ${tw * 0.18} ${top + 2}`} fill={SKIN[0]} stroke={OL} strokeWidth={7} />}
      {!ghost && coal < 0.5 && k === "dadAv" && <path d={`M${-tw * 0.3} ${top + th * 0.3} H${tw * 0.3}`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={10} strokeLinecap="round" />}
      {p.hold && <g transform={`translate(0 ${top + th * 0.42})`}><Tablet w={tw * 0.95} glow={p.tabletGlow ?? 0} /></g>}
      {front && arm(-1, armLAng)}
      {front && arm(1, armRAng)}
      <g transform={`translate(${p.headDx ?? 0} ${headY}) rotate(${p.headTilt ?? 0}) scale(${hs})`}>
        <HeadG k={k} face={p.face} coal={coal} f={f} ghost={ghost} />
      </g>
    </g>
  );
};

/** head-centre in world space (for captions / focus) */
export const headPos = (k: Kind, p: Pose) => {
  const L = LOOKS[k];
  const top = -L.leg[1] - L.torso[1] + (p.bodyDy ?? 0);
  return { x: p.x + (p.headDx ?? 0), y: p.y + (top - L.head[1] / 2 + 8 + (p.headDy ?? 0)) * (p.sy ?? 1) };
};
