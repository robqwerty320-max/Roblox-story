// Blocky characters of our own design (box head / box torso / block limbs), flat colour + one cel-shadow tone + bold
// black outline. Drawn in local coordinates with the origin between the feet (y up = negative). Faces are swapped per
// beat via the Face spec; mouths come from the lip-flap table (story.ts mouthAt).
import React from "react";

export const INK = "#141019";
const SW = 7; // outline width in screen px (non-scaling)
const NS = { vectorEffect: "non-scaling-stroke" as const };

export type Eyes = "blank" | "shock" | "tired" | "yell" | "smug" | "closed" | "happy" | "squint";
export type MouthShape = "rest" | "closed" | "mid" | "open" | "wide" | "scream" | "smile" | "smug" | "flat" | "frown" | "grin";
export type Brows = "none" | "up" | "angry" | "flat" | "worried";
export type Face = { eyes: Eyes; mouth: MouthShape; brows?: Brows; look?: number; lookY?: number; veins?: boolean; blush?: boolean; sweat?: boolean };

export type Pose = {
  x: number; y: number; sx?: number; sy?: number; rot?: number; // feet position, squash/stretch about the feet, lean
  bodyDy?: number; // torso/head shift (shrug up = negative, crouch = positive)
  armL?: number; armR?: number; // outward raise in degrees (0 = hanging, 90 = horizontal, 180 = straight up; negative = across the body)
  armRLen?: number; // foreshortening of the right arm (facepalm)
  legL?: number; legR?: number;
  headDx?: number; headDy?: number; headTilt?: number; headScale?: number;
  face: Face;
  charcoal?: boolean; crumble?: number; // 0..1 head chunk gone
  legSmear?: number; // sprint-in-place circular smear phase (frames); undefined = normal legs
  point?: boolean; thumb?: boolean; armsFront?: boolean; // right hand point / thumbs-up / right arm drawn over the head
  alpha?: number; ghost?: boolean; // smear ghosts: no outline, flat
};

type Pal = { head: [string, string]; torso: [string, string]; arm: [string, string]; leg: [string, string]; shoe?: [string, string] };
type Dims = { head: [number, number]; torso: [number, number]; arm: [number, number]; leg: [number, number] };
export type CharKind = "noob" | "pro" | "dev";

const DIMS: Record<CharKind, Dims> = {
  noob: { head: [150, 140], torso: [170, 180], arm: [74, 182], leg: [84, 190] },
  pro: { head: [146, 138], torso: [172, 180], arm: [74, 182], leg: [84, 190] },
  dev: { head: [236, 214], torso: [108, 84], arm: [44, 84], leg: [52, 66] },
};
const PAL: Record<CharKind, Pal> = {
  noob: { head: ["#ff8a1f", "#d4610b"], torso: ["#7f3fd6", "#5a28a6"], arm: ["#ff8a1f", "#d4610b"], leg: ["#20b8aa", "#13867c"] },
  pro: { head: ["#f2c8a0", "#d29f74"], torso: ["#2a2c33", "#16171c"], arm: ["#2a2c33", "#16171c"], leg: ["#434a58", "#2c313c"], shoe: ["#f4f4f4", "#c9c9d2"] },
  dev: { head: ["#ffe1bd", "#e8b98a"], torso: ["#2f9bff", "#1b6dc4"], arm: ["#ffe1bd", "#e8b98a"], leg: ["#4b4f5c", "#30333d"] },
};
const COAL: [string, string] = ["#2b2523", "#161211"];

/** block with one cel-shadow band on the right side and a bold outline */
const Box: React.FC<{ x: number; y: number; w: number; h: number; c: [string, string]; rx?: number; ghost?: boolean; shade?: number }> = ({ x, y, w, h, c, rx = 8, ghost, shade = 0.3 }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={c[0]} />
    {!ghost && <path d={`M${x + w * (1 - shade)} ${y + 2} H${x + w - rx * 0.5} Q${x + w - 2} ${y + 2} ${x + w - 2} ${y + rx} V${y + h - rx} Q${x + w - 2} ${y + h - 2} ${x + w - rx * 0.5} ${y + h - 2} H${x + w * (1 - shade)} Z`} fill={c[1]} />}
    {!ghost && <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={INK} strokeWidth={SW} {...NS} />}
  </g>
);

// ---------------------------------------------------------------- faces (head-local coords, centre 0,0)
const Eye: React.FC<{ cx: number; cy: number; kind: Eyes; w: number; h: number; look: number; lookY: number; side: number; coal?: boolean }> = ({ cx, cy, kind, w, h, look, lookY, side, coal }) => {
  const s = w / 150;
  const lid = coal ? COAL[0] : undefined;
  switch (kind) {
    case "closed":
      return <path d={`M${cx - 18 * s} ${cy} Q${cx} ${cy + 7 * s} ${cx + 18 * s} ${cy}`} fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" {...NS} />;
    case "happy":
    case "smug":
      return <path d={`M${cx - 19 * s} ${cy + 6 * s} Q${cx} ${cy - 16 * s} ${cx + 19 * s} ${cy + 6 * s}`} fill="none" stroke={INK} strokeWidth={SW * 1.15} strokeLinecap="round" {...NS} />;
    case "squint":
      return <path d={`M${cx - 18 * s} ${cy - 6 * s * side} L${cx + 18 * s} ${cy + 4 * s * side}`} fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" {...NS} />;
    default: {
      const big = kind === "shock" ? 1.25 : kind === "blank" ? 1.1 : kind === "yell" ? 0.95 : 0.85;
      const rx = 21 * s * big, ry = (kind === "tired" ? 17 : 25) * s * big;
      const pr = (kind === "shock" ? 3.2 : kind === "yell" ? 4.5 : 6.5) * s;
      const px = cx + look * rx * 0.45, py = cy + (kind === "tired" ? ry * 0.3 : 0) + lookY * ry * 0.4;
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
          <circle cx={px} cy={py} r={pr} fill={INK} />
          {kind === "shock" && <circle cx={px} cy={py} r={pr * 2.4} fill="none" stroke={INK} strokeWidth={2} {...NS} opacity={0.5} />}
          {kind === "tired" && <path d={`M${cx - rx - 2} ${cy - ry - 2} H${cx + rx + 2} V${cy - ry * 0.05} Q${cx} ${cy + ry * 0.12} ${cx - rx - 2} ${cy - ry * 0.05} Z`} fill={lid ?? "#d9ab80"} />}
          {kind === "yell" && <path d={`M${cx - rx - 3} ${cy - ry - 3} L${cx + rx + 3} ${cy - ry - 3} L${cx + rx * side * 1} ${cy - ry * 0.1} Z`} fill={lid ?? "#f2c8a0"} />}
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={SW * 0.8} {...NS} />
          {kind === "tired" && <path d={`M${cx - rx} ${cy - ry * 0.05} Q${cx} ${cy + ry * 0.12} ${cx + rx} ${cy - ry * 0.05}`} fill="none" stroke={INK} strokeWidth={SW * 0.8} {...NS} />}
          {kind === "tired" && <path d={`M${cx - rx * 0.7} ${cy + ry + 7 * s} Q${cx} ${cy + ry + 12 * s} ${cx + rx * 0.7} ${cy + ry + 7 * s}`} fill="none" stroke={INK} strokeWidth={3} opacity={0.55} {...NS} />}
        </g>
      );
    }
  }
};

const Mouth: React.FC<{ kind: MouthShape; cx: number; cy: number; w: number; coal?: boolean }> = ({ kind, cx, cy, w, coal }) => {
  const s = w / 150;
  const dark = "#4a0d16", tongue = "#ff5d73";
  const o = (rx: number, ry: number, teeth = false) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx * s} ry={ry * s} fill={dark} />
      <ellipse cx={cx + 2 * s} cy={cy + ry * s * 0.55} rx={rx * s * 0.6} ry={ry * s * 0.38} fill={tongue} />
      {teeth && <rect x={cx - rx * s * 0.62} y={cy - ry * s * 0.98} width={rx * s * 1.24} height={ry * s * 0.26} rx={3 * s} fill="#fff" />}
      <ellipse cx={cx} cy={cy} rx={rx * s} ry={ry * s} fill="none" stroke={INK} strokeWidth={SW * 0.85} {...NS} />
    </g>
  );
  const line = (d: string) => <path d={d} fill="none" stroke={coal ? "#e9ddd0" : INK} strokeWidth={SW} strokeLinecap="round" {...NS} />;
  switch (kind) {
    case "rest": return o(11, 8);
    case "mid": return o(15, 13);
    case "open": return o(20, 20, true);
    case "wide": return o(30, 30, true);
    case "scream": {
      const rx = 52 * s, ry = 44 * s, y0 = cy - 10 * s;
      return (
        <g>
          <path d={`M${cx - rx} ${y0 - ry * 0.35} Q${cx} ${y0 - ry * 0.75} ${cx + rx} ${y0 - ry * 0.35} Q${cx + rx * 1.05} ${y0 + ry} ${cx} ${y0 + ry * 1.05} Q${cx - rx * 1.05} ${y0 + ry} ${cx - rx} ${y0 - ry * 0.35} Z`} fill={dark} />
          <ellipse cx={cx} cy={y0 + ry * 0.62} rx={rx * 0.55} ry={ry * 0.3} fill={tongue} />
          <path d={`M${cx - rx * 0.78} ${y0 - ry * 0.45} Q${cx} ${y0 - ry * 0.72} ${cx + rx * 0.78} ${y0 - ry * 0.45} L${cx + rx * 0.7} ${y0 - ry * 0.25} Q${cx} ${y0 - ry * 0.45} ${cx - rx * 0.7} ${y0 - ry * 0.25} Z`} fill="#fff" />
          <ellipse cx={cx} cy={y0 - ry * 0.05} rx={rx * 0.16} ry={ry * 0.22} fill="#2a0409" />
          <path d={`M${cx - rx} ${y0 - ry * 0.35} Q${cx} ${y0 - ry * 0.75} ${cx + rx} ${y0 - ry * 0.35} Q${cx + rx * 1.05} ${y0 + ry} ${cx} ${y0 + ry * 1.05} Q${cx - rx * 1.05} ${y0 + ry} ${cx - rx} ${y0 - ry * 0.35} Z`} fill="none" stroke={INK} strokeWidth={SW} {...NS} />
        </g>
      );
    }
    case "closed": return line(`M${cx - 16 * s} ${cy} Q${cx} ${cy + 4 * s} ${cx + 16 * s} ${cy}`);
    case "flat": return line(`M${cx - 18 * s} ${cy + 2 * s} L${cx + 18 * s} ${cy}`);
    case "frown": return line(`M${cx - 18 * s} ${cy + 6 * s} Q${cx} ${cy - 8 * s} ${cx + 18 * s} ${cy + 6 * s}`);
    case "smile": return line(`M${cx - 22 * s} ${cy - 4 * s} Q${cx} ${cy + 16 * s} ${cx + 22 * s} ${cy - 4 * s}`);
    case "smug": return line(`M${cx - 24 * s} ${cy + 2 * s} Q${cx - 2 * s} ${cy + 10 * s} ${cx + 22 * s} ${cy - 8 * s}`);
    case "grin": return (
      <g>
        <path d={`M${cx - 28 * s} ${cy - 6 * s} Q${cx} ${cy + 26 * s} ${cx + 28 * s} ${cy - 6 * s} Z`} fill="#fff" />
        <path d={`M${cx - 28 * s} ${cy - 6 * s} Q${cx} ${cy + 26 * s} ${cx + 28 * s} ${cy - 6 * s} Z`} fill="none" stroke={INK} strokeWidth={SW * 0.85} {...NS} />
      </g>
    );
  }
};

const BrowsG: React.FC<{ kind: Brows; ex: number; ey: number; w: number; coal?: boolean }> = ({ kind, ex, ey, w, coal }) => {
  if (kind === "none") return null;
  const s = w / 150, c = coal ? "#e9ddd0" : INK;
  const one = (cx: number, side: number) => {
    const y = ey - 36 * s;
    let d = "";
    if (kind === "up") d = `M${cx - 18 * s} ${y + 2 * s} Q${cx} ${y - 14 * s} ${cx + 18 * s} ${y + 2 * s}`;
    if (kind === "flat") d = `M${cx - 18 * s} ${y + 6 * s} L${cx + 18 * s} ${y + 6 * s}`;
    if (kind === "angry") d = `M${cx - 20 * s * side} ${y - 2 * s} L${cx + 18 * s * side} ${y + 14 * s}`;
    if (kind === "worried") d = `M${cx - 18 * s * side} ${y + 10 * s} L${cx + 18 * s * side} ${y - 6 * s}`;
    return <path d={d} fill="none" stroke={c} strokeWidth={SW * (kind === "angry" ? 1.6 : 1.2)} strokeLinecap="round" {...NS} />;
  };
  return <g>{one(-ex, 1)}{one(ex, -1)}</g>;
};

export const FaceG: React.FC<{ face: Face; w: number; h: number; coal?: boolean }> = ({ face, w, h, coal }) => {
  const look = face.look ?? 0, lookY = face.lookY ?? 0;
  const ox = look * w * 0.1, oy = lookY * h * 0.05;
  const ex = w * 0.2, ey = -h * 0.06 + oy;
  const s = w / 150;
  return (
    <g>
      {face.blush && <><ellipse cx={-w * 0.3 + ox} cy={h * 0.14} rx={14 * s} ry={8 * s} fill="#ff7d9a" opacity={0.6} /><ellipse cx={w * 0.3 + ox} cy={h * 0.14} rx={14 * s} ry={8 * s} fill="#ff7d9a" opacity={0.6} /></>}
      <Eye cx={-ex + ox} cy={ey} kind={face.eyes} w={w} h={h} look={look} lookY={lookY} side={1} coal={coal} />
      <Eye cx={ex + ox} cy={ey} kind={face.eyes} w={w} h={h} look={look} lookY={lookY} side={-1} coal={coal} />
      <g transform={`translate(${ox} 0)`}><BrowsG kind={face.brows ?? "none"} ex={ex} ey={ey} w={w} coal={coal} /></g>
      <Mouth kind={face.mouth} cx={ox * 1.1} cy={h * 0.27 + oy} w={w} coal={coal} />
      {face.veins && (
        <g transform={`translate(${w * 0.27} ${-h * 0.36})`} stroke="#d0122a" strokeWidth={SW * 1.1} fill="none" strokeLinecap="round" {...NS}>
          <path d={`M${-12 * s} ${-3 * s} Q${-3 * s} ${-3 * s} ${-3 * s} ${-12 * s}`} /><path d={`M${3 * s} ${-12 * s} Q${3 * s} ${-3 * s} ${12 * s} ${-3 * s}`} />
          <path d={`M${12 * s} ${3 * s} Q${3 * s} ${3 * s} ${3 * s} ${12 * s}`} /><path d={`M${-3 * s} ${12 * s} Q${-3 * s} ${3 * s} ${-12 * s} ${3 * s}`} />
        </g>
      )}
      {face.sweat && <path d={`M${w * 0.42} ${-h * 0.2} q${8 * s} ${14 * s} 0 ${20 * s} q${-8 * s} ${-6 * s} 0 ${-20 * s} Z`} fill="#8fd8ff" stroke={INK} strokeWidth={3} {...NS} />}
    </g>
  );
};

/** head outline as a path; crumble cuts a jagged notch out of the top-right corner */
const headPath = (w: number, h: number, crumble = 0) => {
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2, r = 12;
  if (crumble <= 0) return `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
  return `M${x0 + r} ${y0} H${x1 - w * 0.42} L${x1 - w * 0.34} ${y0 + h * 0.1} L${x1 - w * 0.2} ${y0 + h * 0.08} L${x1 - w * 0.12} ${y0 + h * 0.24} L${x1} ${y0 + h * 0.3} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
};
/** the chunk that falls off (same jagged edge), in head-local coords */
export const chunkPath = (w: number, h: number) => {
  const x1 = w / 2, y0 = -h / 2;
  return `M${x1 - w * 0.42} ${y0} H${x1 - 10} Q${x1} ${y0} ${x1} ${y0 + 10} V${y0 + h * 0.3} L${x1 - w * 0.12} ${y0 + h * 0.24} L${x1 - w * 0.2} ${y0 + h * 0.08} L${x1 - w * 0.34} ${y0 + h * 0.1} Z`;
};

export const headCenter = (kind: CharKind, p: Pose) => {
  const d = DIMS[kind];
  const sy = p.sy ?? 1, sc = p.headScale ?? 1;
  const torsoTop = -d.leg[1] - d.torso[1] + (p.bodyDy ?? 0);
  return { x: p.x + (p.headDx ?? 0) * (p.sx ?? 1), y: p.y + (torsoTop - (d.head[1] * sc) / 2 + (p.headDy ?? 0)) * sy, r: (d.head[0] * sc * (p.sx ?? 1)) / 2 };
};

const Arm: React.FC<{ side: -1 | 1; d: Dims; c: [string, string]; ang: number; len?: number; top: number; ghost?: boolean; point?: boolean; thumb?: boolean }> = ({ side, d, c, ang, len = 1, top, ghost, point, thumb }) => {
  const [aw, ah] = d.arm, tw = d.torso[0];
  const px = side * (tw / 2 + aw * 0.42), py = top + aw * 0.42;
  const rot = side < 0 ? ang : -ang;
  const L = ah * len;
  return (
    <g transform={`translate(${px} ${py}) rotate(${rot})`}>
      {point && <Box x={-aw * 0.18} y={L - 12} w={aw * 0.36} h={aw * 0.95} c={c} rx={6} ghost={ghost} />}
      {thumb && <Box x={side < 0 ? aw * 0.06 : -aw * 0.42} y={L - aw * 0.15} w={aw * 0.36} h={aw * 0.75} c={c} rx={6} ghost={ghost} />}
      <Box x={-aw / 2} y={-aw * 0.42} w={aw} h={L + aw * 0.42} c={c} rx={9} ghost={ghost} />
    </g>
  );
};

export const Char: React.FC<{ kind: CharKind; p: Pose }> = ({ kind, p }) => {
  const d = DIMS[kind];
  const coal = !!p.charcoal;
  const pal = PAL[kind];
  const col = (c: [string, string]) => (coal ? COAL : c);
  const ghost = !!p.ghost;
  const [hw, hh] = d.head, [tw, th] = d.torso, [lw, lh] = d.leg;
  const body = p.bodyDy ?? 0;
  const torsoTop = -lh - th + body;
  const hs = p.headScale ?? 1;
  const headY = torsoTop - (hh * hs) / 2 + (p.headDy ?? 0);
  const legs = p.legSmear !== undefined ? (
    <g transform={`translate(0 ${-lh * 0.55})`}>
      <ellipse cx={0} cy={0} rx={lw * 1.5} ry={lh * 0.58} fill={col(pal.leg)[0]} opacity={0.55} />
      {[0, 1, 2].map((i) => {
        const a0 = p.legSmear * 0.9 + i * 2.1;
        const p0 = { x: Math.cos(a0) * lw * 1.3, y: Math.sin(a0) * lh * 0.5 }, p1 = { x: Math.cos(a0 + 1.4) * lw * 1.3, y: Math.sin(a0 + 1.4) * lh * 0.5 };
        return <path key={i} d={`M${p0.x} ${p0.y} A${lw * 1.3} ${lh * 0.5} 0 0 1 ${p1.x} ${p1.y}`} fill="none" stroke={i === 1 ? col(pal.leg)[1] : col(pal.leg)[0]} strokeWidth={lw * 0.7} strokeLinecap="round" />;
      })}
      <ellipse cx={0} cy={0} rx={lw * 1.5} ry={lh * 0.58} fill="none" stroke={INK} strokeWidth={SW * 0.7} strokeDasharray="40 30" {...NS} />
    </g>
  ) : (
    <g>
      <g transform={`translate(${-lw / 2} ${-lh}) rotate(${p.legL ?? 0})`}>
        <Box x={-lw / 2} y={0} w={lw} h={lh} c={col(pal.leg)} rx={7} ghost={ghost} />
        {pal.shoe && !coal && <Box x={-lw / 2} y={lh - 26} w={lw} h={26} c={pal.shoe} rx={7} ghost={ghost} />}
      </g>
      <g transform={`translate(${lw / 2} ${-lh}) rotate(${-(p.legR ?? 0)})`}>
        <Box x={-lw / 2} y={0} w={lw} h={lh} c={col(pal.leg)} rx={7} ghost={ghost} />
        {pal.shoe && !coal && <Box x={-lw / 2} y={lh - 26} w={lw} h={26} c={pal.shoe} rx={7} ghost={ghost} />}
      </g>
    </g>
  );
  const head = (
    <g transform={`translate(${p.headDx ?? 0} ${headY}) rotate(${p.headTilt ?? 0}) scale(${hs})`}>
      {kind === "pro" && !coal && <rect x={-hw / 2 - 16} y={-hh / 2 - 14} width={hw + 32} height={hh + 30} rx={30} fill={pal.torso[0]} stroke={ghost ? "none" : INK} strokeWidth={SW} {...NS} />}
      <path d={headPath(hw, hh, p.crumble)} fill={col(pal.head)[0]} />
      {!ghost && <path d={`M${hw * 0.2} ${-hh / 2 + 3} H${hw / 2 - 12} Q${hw / 2 - 3} ${-hh / 2 + 3} ${hw / 2 - 3} ${-hh / 2 + 12} V${hh / 2 - 12} Q${hw / 2 - 3} ${hh / 2 - 3} ${hw / 2 - 12} ${hh / 2 - 3} H${hw * 0.2} Z`} fill={col(pal.head)[1]} opacity={p.crumble ? 0 : 1} />}
      {!ghost && <path d={headPath(hw, hh, p.crumble)} fill="none" stroke={INK} strokeWidth={SW} {...NS} />}
      {coal && !ghost && <g stroke="#ff6a1a" strokeWidth={3} fill="none" opacity={0.85} {...NS}><path d={`M${-hw * 0.4} ${hh * 0.32} l14 -10 l8 8 l12 -6`} /><path d={`M${hw * 0.25} ${hh * 0.4} l10 -8 l10 4`} /></g>}
      {kind === "pro" && !coal && !ghost && (
        <g>
          <path d={`M${-hw / 2 - 6} ${-hh / 2 + 22} H${hw / 2 + 6} V${-hh / 2 + 40} H${-hw / 2 - 6} Z`} fill="#e8262f" stroke={INK} strokeWidth={SW} {...NS} />
          <path d={`M${-hw / 2 + 10} ${-hh / 2 + 40} H${hw / 2 + 34} Q${hw / 2 + 40} ${-hh / 2 + 52} ${hw / 2 + 22} ${-hh / 2 + 56} H${-hw / 2 + 10} Z`} fill="#b3121b" stroke={INK} strokeWidth={SW} {...NS} />
        </g>
      )}
      {!ghost && <g transform={kind === "pro" ? `translate(0 ${hh * 0.08})` : ""}><FaceG face={p.face} w={hw} h={hh} coal={coal} /></g>}
    </g>
  );
  const top = torsoTop;
  const armL = <Arm side={-1} d={d} c={col(pal.arm)} ang={p.armL ?? 4} top={top} ghost={ghost} />;
  const armR = <Arm side={1} d={d} c={col(pal.arm)} ang={p.armR ?? 4} len={p.armRLen} top={top} ghost={ghost} point={p.point} thumb={p.thumb} />;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${p.rot ?? 0}) scale(${p.sx ?? 1} ${p.sy ?? 1})`} opacity={p.alpha ?? 1}>
      {legs}
      {armL}
      {!p.armsFront && armR}
      <Box x={-tw / 2} y={torsoTop} w={tw} h={th} c={col(pal.torso)} rx={10} ghost={ghost} />
      {kind === "pro" && !coal && !ghost && <path d={`M${-tw * 0.22} ${torsoTop + 4} L${-tw * 0.16} ${torsoTop + 56} M${tw * 0.22} ${torsoTop + 4} L${tw * 0.16} ${torsoTop + 56}`} stroke="#d9d9e3" strokeWidth={5} strokeLinecap="round" {...NS} />}
      {kind === "pro" && !coal && !ghost && <rect x={-tw * 0.32} y={torsoTop + th * 0.58} width={tw * 0.64} height={th * 0.26} rx={8} fill="none" stroke="#0c0c10" strokeWidth={4} {...NS} />}
      {kind === "dev" && !ghost && (
        <g transform={`translate(0 ${torsoTop + th * 0.5}) rotate(-6)`}>
          <rect x={-34} y={-17} width={68} height={34} rx={5} fill="#fff" stroke={INK} strokeWidth={4} {...NS} />
          <text x={0} y={10} textAnchor="middle" fontFamily="Inter, 'Arial Black', 'DejaVu Sans', sans-serif" fontWeight={900} fontSize={26} fill="#e8262f">DEV</text>
        </g>
      )}
      {head}
      {p.armsFront && armR}
    </g>
  );
};

export const dims = (k: CharKind) => DIMS[k];
