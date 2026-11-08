// "It's Just Orange": ~20 s vertical 2D meme short (SVG inside Remotion, no WebGL). Script:
// stories/its-just-orange/SCRIPT.md; timing (lines, syllables, SFX cues) lives in timing.json; camera in story.ts;
// poses in poses.ts; characters in chars.tsx; world layers in world.tsx.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Char, Pose, INK, chunkPath, dims, headCenter } from "./chars";
import { noobPose, proPose, devPose } from "./poses";
import { Clouds, Embers, FarObby, Lava, LavaGlow, MainBack, MidObby, Platform, Sky } from "./world";
import { FRAMES, W, H, LINES, Line, camAt, layerTransform, toScreen, seg, backOut, hash, sylCount, POS, twos, clamp } from "./story";

export const IJO_FRAMES = FRAMES;
const FONT = "Inter, 'Arial Black', 'DejaVu Sans', sans-serif";
const NS = { vectorEffect: "non-scaling-stroke" as const };

// ---------------------------------------------------------------- FX in world space
const Puff: React.FC<{ x: number; y: number; r: number; o: number; c?: string }> = ({ x, y, r, o, c = "#d9d4df" }) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={r} fill={c} stroke={INK} strokeWidth={5} {...NS} />
    <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#fff" opacity={0.6} />
  </g>
);

const Smoke: React.FC<{ f: number; x: number; y: number; start: number; n?: number; dur?: number; spread?: number }> = ({ f, x, y, start, n = 7, dur = 50, spread = 160 }) => {
  if (f < start || f > start + dur + 20) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const d = f - start - i * 3;
        if (d < 0) return null;
        const k = d / dur;
        if (k > 1) return null;
        const ang = (i / n) * Math.PI * 2 + hash(i) * 0.5;
        return <Puff key={i} x={x + Math.cos(ang) * spread * (0.4 + k)} y={y - 120 * k - Math.abs(Math.sin(ang)) * 60 * k} r={30 + 50 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.6)} o={1 - k * k} c={i % 2 ? "#5b5560" : "#8f8896"} />;
      })}
    </g>
  );
};

const Splash: React.FC<{ f: number; x: number; start: number; big?: number }> = ({ f, x, start, big = 1 }) => {
  const d = f - start;
  if (d < 0 || d > 24) return null;
  return (
    <g>
      {Array.from({ length: 12 }).map((_, i) => {
        const vx = (hash(i + 400) * 13) * big, vy = -(14 + (hash(i + 410) * 0.5 + 0.5) * 16) * big;
        const px = x + vx * d, py = vy * d + 0.9 * d * d;
        if (py > 20) return null;
        const r = (16 + (i % 3) * 7) * big;
        return <circle key={i} cx={px} cy={py} r={r} fill={i % 2 ? "#ffcf48" : "#ff7a16"} stroke={INK} strokeWidth={4} {...NS} />;
      })}
      <ellipse cx={x} cy={0} rx={(60 + d * 14) * big} ry={(14 + d * 2) * big} fill="none" stroke="#ffe08a" strokeWidth={7} opacity={1 - d / 24} {...NS} />
    </g>
  );
};

const Stars: React.FC<{ f: number; x: number; y: number; start: number }> = ({ f, x, y, start }) => {
  const d = f - start;
  if (d < 0 || d > 14) return null;
  const k = d / 14;
  return (
    <g>
      <circle cx={x} cy={y} r={60 + 260 * backOut(Math.min(1, k * 1.5), 1.5)} fill="none" stroke="#fff" strokeWidth={14 * (1 - k)} {...NS} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2, r = 120 + 240 * k, s = 26 * (1 - k);
        const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
        return <path key={i} d={`M${cx} ${cy - s * 2} L${cx + s * 0.5} ${cy - s * 0.5} L${cx + s * 2} ${cy} L${cx + s * 0.5} ${cy + s * 0.5} L${cx} ${cy + s * 2} L${cx - s * 0.5} ${cy + s * 0.5} L${cx - s * 2} ${cy} L${cx - s * 0.5} ${cy - s * 0.5} Z`} fill="#ffe14d" stroke={INK} strokeWidth={4} {...NS} />;
      })}
    </g>
  );
};

/** head chunk falling off the charcoal Noob (B4) */
const Chunk: React.FC<{ f: number }> = ({ f }) => {
  if (f < 232 || f > 262) return null;
  const d = f - 232;
  const [hw, hh] = dims("noob").head;
  const hc = headCenter("noob", { x: POS.land, y: 90, face: { eyes: "blank", mouth: "flat" } });
  const x = hc.x + 8 * d, y = hc.y + 0.55 * d * d + 2 * d;
  if (y > 40) return null;
  return (
    <g>
      <g transform={`translate(${x} ${y}) rotate(${d * 9})`}>
        <path d={chunkPath(hw, hh)} fill="#2b2523" stroke={INK} strokeWidth={6} {...NS} />
      </g>
      {[0, 1, 2, 3].map((i) => <rect key={i} x={hc.x + 50 + i * 12 + d * (2 + i)} y={hc.y - 60 + 0.6 * d * d + i * 5} width={9} height={9} fill="#2b2523" />)}
    </g>
  );
};

// ---------------------------------------------------------------- screen-space overlays
const SpeedLines: React.FC<{ f: number; strength: number; cx?: number; cy?: number }> = ({ f, strength, cx = W / 2, cy = H / 2 }) => {
  if (strength <= 0) return null;
  const t = f - (f % 2);
  return (
    <g opacity={strength}>
      {Array.from({ length: 44 }).map((_, i) => {
        const a = (i / 44) * Math.PI * 2 + hash(i + t * 3) * 0.06;
        const r0 = 520 + (hash(i * 3 + t) * 0.5 + 0.5) * 260, r1 = 1500;
        const wd = 6 + (hash(i + t) * 0.5 + 0.5) * 18;
        const p0x = cx + Math.cos(a) * r0, p0y = cy + Math.sin(a) * r0;
        const px = -Math.sin(a) * wd, py = Math.cos(a) * wd;
        return <path key={i} d={`M${p0x} ${p0y} L${cx + Math.cos(a) * r1 + px} ${cy + Math.sin(a) * r1 + py} L${cx + Math.cos(a) * r1 - px} ${cy + Math.sin(a) * r1 - py} Z`} fill={i % 3 ? "#ffffff" : INK} />;
      })}
    </g>
  );
};

const Streaks: React.FC<{ f: number; blur: number }> = ({ f, blur }) => {
  if (blur < 20) return null;
  const k = clamp(blur / 160);
  return (
    <g opacity={0.75 * k}>
      {Array.from({ length: 26 }).map((_, i) => {
        const y = (hash(i + f * 7) * 0.5 + 0.5) * H, x = (hash(i * 5 + f) * 0.5 + 0.5) * W - 300;
        const len = 300 + 900 * k * (hash(i + 77) * 0.5 + 0.5);
        return <rect key={i} x={x} y={y} width={len} height={4 + (i % 4) * 4} rx={4} fill={i % 3 ? "#ffffff" : "#ffe9c4"} />;
      })}
    </g>
  );
};

// ---------------------------------------------------------------- speech bubbles
type BubbleCfg = { x: number; y: number; size: number; shout?: boolean };
const BUBBLE: Record<string, BubbleCfg> = {
  dont: { x: 540, y: 330, size: 70 },
  why: { x: 520, y: 340, size: 72 },
  warm: { x: 560, y: 360, size: 78 },
  lava: { x: 540, y: 300, size: 104, shout: true },
  checkpoint: { x: 540, y: 330, size: 70 },
  feature: { x: 540, y: 390, size: 76 },
};
const charW = (s: string, size: number) => s.length * size * 0.6 + (s.match(/[MWmw]/g)?.length ?? 0) * size * 0.2;

const Bubble: React.FC<{ f: number; line: Line; head: { x: number; y: number; r: number } | null }> = ({ f, line, head }) => {
  const cfg = BUBBLE[line.id];
  const inK = seg(f, line.start, line.start + 6), outK = seg(f, line.end, line.end + 4);
  if (f < line.start || outK >= 1) return null;
  const sc = backOut(inK, 2.6) * (1 - outK);
  const lh = cfg.size * 1.12;
  const bw = Math.max(...line.text.map((t) => charW(t, cfg.size))) + 90;
  const bh = line.text.length * lh + 64;
  const n = sylCount(f, line);
  // tail toward the speaker's head (clamped)
  let tail: string | null = null;
  if (head) {
    const dx = head.x - cfg.x, dy = head.y - cfg.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const edge = Math.min(Math.abs(bw / 2 / (ux || 1e-6)), Math.abs(bh / 2 / (uy || 1e-6))) * 0.9;
    const len = clamp(dist - edge - head.r * 0.95, 50, 230);
    const tx = ux * (edge + len), ty = uy * (edge + len);
    const bx = ux * edge * 0.7, by = uy * edge * 0.7;
    tail = `M${bx - uy * 38} ${by + ux * 38} L${tx} ${ty} L${bx + uy * 38} ${by - ux * 38} Z`;
  }
  const body = cfg.shout
    ? (() => {
        const pts: string[] = [];
        const N = 22;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2, r = i % 2 ? 1 : 1.16 + 0.05 * hash(i + (f - (f % 2)));
          pts.push(`${Math.cos(a) * (bw / 2) * r * 1.05},${Math.sin(a) * (bh / 2) * r * 1.12}`);
        }
        return `M${pts.join(" L")} Z`;
      })()
    : `M${-bw / 2 + 50} ${-bh / 2} H${bw / 2 - 50} Q${bw / 2} ${-bh / 2} ${bw / 2} ${-bh / 2 + 50} V${bh / 2 - 50} Q${bw / 2} ${bh / 2} ${bw / 2 - 50} ${bh / 2} H${-bw / 2 + 50} Q${-bw / 2} ${bh / 2} ${-bw / 2} ${bh / 2 - 50} V${-bh / 2 + 50} Q${-bw / 2} ${-bh / 2} ${-bw / 2 + 50} ${-bh / 2} Z`;
  // words laid out by line
  let wi = 0;
  const jx = cfg.shout ? hash(f - (f % 2)) * 6 : 0;
  return (
    <g transform={`translate(${cfg.x + jx} ${cfg.y}) scale(${sc})`}>
      {tail && <path d={tail} fill="none" stroke={INK} strokeWidth={18} strokeLinejoin="round" />}
      <path d={body} fill="none" stroke={INK} strokeWidth={18} strokeLinejoin="round" />
      {tail && <path d={tail} fill={cfg.shout ? "#fff3a8" : "#fff"} />}
      <path d={body} fill={cfg.shout ? "#fff3a8" : "#fff"} />
      {line.text.map((row, ri) => {
        const words = row.split(" ");
        return (
          <text key={ri} x={0} y={-bh / 2 + 32 + lh * (ri + 0.78)} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={cfg.size} fill={INK}>
            {words.map((w, k) => {
              const meta = line.words[wi++];
              const shown = meta && n > meta.s;
              const loud = meta && line.loud.includes(meta.s);
              return <tspan key={k} fillOpacity={shown ? 1 : 0} fill={loud || cfg.shout ? "#e8262f" : INK}>{(k ? " " : "") + w}</tspan>;
            })}
          </text>
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------- composition
export const ItsJustOrange: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const noob = noobPose(f), pro = proPose(f), dev = devPose(f);
  const t2 = twos(f);
  const main = layerTransform(cam, 1);
  const whip = cam.blur > 20;
  const impact = f === 132 || f === 133;
  const speed = f >= 252 && f < 312 ? (f < 282 ? 0.9 : 1) : f >= 436 && f < 446 ? 0.8 : f >= 330 && f < 360 ? 0.35 : 0;
  const speaker = (who: string): { x: number; y: number; r: number } | null => {
    const p: Pose | null = who === "noob" ? noob : who === "pro" ? pro : dev;
    if (!p) return null;
    const hc = headCenter(who as "noob", p);
    const s = toScreen(cam, hc.x, hc.y);
    return { x: s.x, y: s.y, r: hc.r * cam.z };
  };
  const filter = impact ? (f === 132 ? "grayscale(1) contrast(30) brightness(1.4)" : "grayscale(1) contrast(30) brightness(1.4) invert(1)") : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#8fc4ff", filter }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="whip" x="-10%" y="-5%" width="120%" height="110%">
            <feGaussianBlur stdDeviation={`${Math.min(60, cam.blur * 0.28)} 0`} />
          </filter>
        </defs>
        <g filter={whip ? "url(#whip)" : undefined}>
          <g transform={`translate(${W / 2} ${H / 2}) rotate(${cam.r * 0.3}) translate(${-W / 2} ${-H / 2})`}><Sky f={f} /></g>
          <g transform={layerTransform(cam, 0.12)}><Clouds f={t2} /></g>
          <g transform={layerTransform(cam, 0.3)}><FarObby f={t2} /></g>
          <g transform={layerTransform(cam, 0.6)}><MidObby f={t2} /></g>
          <g transform={main}>
            <LavaGlow />
            <MainBack f={t2} />
            <Smoke f={t2} x={POS.dev} y={-150} start={421} n={6} dur={14} spread={150} />
            {dev && <Char kind="dev" p={dev} />}
            <Platform />
            <Smoke f={t2} x={POS.land} y={-300} start={134} n={8} dur={46} />
            <Smoke f={t2} x={POS.land} y={-560} start={180} n={3} dur={60} spread={40} />
            <Char kind="pro" p={pro} />
            {noob.ghosts?.map((g, i) => <Char key={i} kind="noob" p={g} />)}
            <Char kind="noob" p={noob} />
            <Chunk f={f} />
            <Lava f={f} />
            <Splash f={f} x={POS.land} start={132} big={1.3} />
            <Splash f={f} x={POS.sink} start={523} big={0.8} />
            <Splash f={f} x={POS.sink} start={592} big={0.6} />
            <Smoke f={t2} x={POS.land} y={-60} start={312} n={6} dur={30} spread={90} />
            <Stars f={f} x={POS.noob} y={-420} start={312} />
            {f >= 330 && f < 360 && [0, 1, 2].map((i) => <Puff key={i} x={POS.noob - 120 - ((t2 * 9 + i * 40) % 140)} y={-190 - i * 8} r={18 + ((t2 + i * 5) % 10) * 2} o={0.8} />)}
          </g>
          <g transform={layerTransform(cam, 1.35)}><Embers f={t2} /></g>
        </g>
        <Streaks f={f} blur={cam.blur} />
        <SpeedLines f={f} strength={speed} />
        {impact && (
          <g>
            {Array.from({ length: 14 }).map((_, i) => {
              const a = (i / 14) * Math.PI * 2 + 0.2;
              const c = toScreen(cam, POS.land, -100);
              return <path key={i} d={`M${c.x} ${c.y} L${c.x + Math.cos(a - 0.025) * 1800} ${c.y + Math.sin(a - 0.025) * 1800} L${c.x + Math.cos(a + 0.025) * 1800} ${c.y + Math.sin(a + 0.025) * 1800} Z`} fill="#000" opacity={0.8} />;
            })}
          </g>
        )}
        {LINES.map((l) => <Bubble key={l.id} f={f} line={l} head={speaker(l.who)} />)}
        {/* soft vignette */}
        <rect x={0} y={0} width={W} height={H} fill="url(#vig)" />
        <defs>
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.65" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1a0a20" stopOpacity="0.35" />
          </radialGradient>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};
