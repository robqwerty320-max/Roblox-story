// Obby-over-lava world in flat 2D: sky, clouds (p 0.12), far floating obby silhouettes (p 0.3), mid colourful obby
// pieces (p 0.6), the main layer (spawn platform, floating blocks, checkpoint flag in the lava, the lava itself) and a
// foreground ember layer (p 1.35). Every layer is drawn in its own world space; story.ts layerTransform() gives parallax.
import React from "react";
import { INK } from "./chars";
import { hash, POS, PLAT_TOP } from "./story";

const NS = { vectorEffect: "non-scaling-stroke" as const };

const Blk: React.FC<{ x: number; y: number; w: number; h: number; c: string; s: string; sw?: number; top?: string; check?: string }> = ({ x, y, w, h, c, s, sw = 6, top, check }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={6} fill={c} />
    {check && Array.from({ length: Math.ceil(w / 80) * Math.ceil(h / 80) }).map((_, i) => {
      const cols = Math.ceil(w / 80), cx = i % cols, cy = Math.floor(i / cols);
      return (cx + cy) % 2 ? <rect key={i} x={x + cx * 80} y={y + cy * 80} width={Math.min(80, w - cx * 80)} height={Math.min(80, h - cy * 80)} fill={check} /> : null;
    })}
    <rect x={x + w * 0.74} y={y} width={w * 0.26} height={h} fill={s} opacity={0.75} />
    {top && <rect x={x} y={y} width={w} height={Math.min(28, h * 0.3)} rx={6} fill={top} />}
    <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={INK} strokeWidth={sw} {...NS} />
  </g>
);

export const Sky: React.FC<{ f: number }> = () => (
  <g>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3f8cff" /><stop offset="0.5" stopColor="#8fc4ff" /><stop offset="0.8" stopColor="#ffc98f" /><stop offset="1" stopColor="#ff9a52" />
      </linearGradient>
    </defs>
    <rect x={-200} y={-200} width={1480} height={2320} fill="url(#sky)" />
  </g>
);

export const Clouds: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 12 }).map((_, i) => {
      const x = -2600 + i * 520 + hash(i) * 120 + f * 0.6, y = -1300 + hash(i + 9) * 420;
      const s = 0.8 + 0.4 * hash(i + 3);
      return (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-150 30 Q-160 -30 -90 -35 Q-70 -95 0 -80 Q60 -120 100 -55 Q170 -55 160 30 Z" fill="#ffffff" stroke="#9fb7e8" strokeWidth={4} {...NS} />
          <path d="M-150 30 Q-40 50 160 30 L160 10 Q40 30 -150 12 Z" fill="#d9e6ff" />
        </g>
      );
    })}
  </g>
);

export const FarObby: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-4000} y={60} width={8000} height={3000} fill="#ff9d4a" />
    <rect x={-4000} y={40} width={8000} height={30} fill="#ffc06a" />
    {Array.from({ length: 16 }).map((_, i) => {
      const x = -3000 + i * 400 + hash(i + 20) * 90, top = -300 - (hash(i + 31) * 0.5 + 0.5) * 520, w = 110 + (hash(i + 4) * 0.5 + 0.5) * 140;
      const bob = Math.sin(f / 30 + i) * 6;
      return (
        <g key={i} opacity={0.9}>
          <rect x={x + w / 2 - 14} y={top + 50 + bob} width={28} height={-top} fill="#8a7cc8" stroke="#5d4f9a" strokeWidth={3} {...NS} />
          <rect x={x} y={top + bob} width={w} height={54} rx={4} fill={i % 3 === 0 ? "#b49ee8" : i % 3 === 1 ? "#9fb0ef" : "#c7a3df"} stroke="#5d4f9a" strokeWidth={3} {...NS} />
        </g>
      );
    })}
  </g>
);

const MID_COL = [["#ff4d6d", "#c22a49"], ["#3ad17a", "#1f9a55"], ["#ffd23f", "#d6a60f"], ["#3fa7ff", "#1c74c9"], ["#c46bff", "#8e3fcc"]];
export const MidObby: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-4000} y={40} width={8000} height={3000} fill="#ff7a2a" />
    {Array.from({ length: 22 }).map((_, i) => {
      const x = -2600 + i * 300 + hash(i + 50) * 80, top = -160 - (hash(i + 61) * 0.5 + 0.5) * 520, w = 120 + (hash(i + 70) * 0.5 + 0.5) * 120;
      const c = MID_COL[i % MID_COL.length];
      const bob = Math.sin(f / 22 + i * 1.7) * 10;
      const spin = i % 4 === 2;
      return (
        <g key={i} transform={`translate(${x + w / 2} ${top + 30 + bob})`}>
          {spin ? (
            <g transform={`rotate(${(f * 2.2 + i * 40) % 360})`}><Blk x={-w * 0.7} y={-14} w={w * 1.4} h={28} c="#ff4d6d" s="#c22a49" sw={4} /></g>
          ) : (
            <>
              {i % 2 === 0 && <rect x={-8} y={30} width={16} height={-top} fill="#6c6f86" stroke={INK} strokeWidth={3} {...NS} />}
              <Blk x={-w / 2} y={-30} w={w} h={60} c={c[0]} s={c[1]} sw={4} />
            </>
          )}
        </g>
      );
    })}
  </g>
);

/** glow above the lava, drawn behind the main layer */
export const LavaGlow: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="lglow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff8a2a" stopOpacity="0" /><stop offset="1" stopColor="#ff6a1a" stopOpacity="0.45" />
      </linearGradient>
    </defs>
    <rect x={-4000} y={-520} width={9000} height={540} fill="url(#lglow)" />
  </g>
);

const Flag: React.FC<{ f: number }> = ({ f }) => {
  const t = f - (f % 2);
  const wv = (k: number) => Math.sin(t / 3 + k) * 14;
  const x0 = POS.flag;
  return (
    <g>
      <Blk x={x0 - 90} y={-28} w={180} h={60} c="#8d8fa3" s="#5e6074" sw={6} top="#3ad17a" />
      <rect x={x0 - 9} y={-460} width={18} height={440} rx={6} fill="#e9e9f2" stroke={INK} strokeWidth={6} {...NS} />
      <circle cx={x0} cy={-466} r={18} fill="#ffd23f" stroke={INK} strokeWidth={6} {...NS} />
      <path d={`M${x0 + 9} -446 Q${x0 + 80} ${-466 + wv(0)} ${x0 + 160} ${-446 + wv(1)} L${x0 + 170} ${-330 + wv(2)} Q${x0 + 90} ${-350 + wv(1.5)} ${x0 + 9} -330 Z`} fill="#22c55e" stroke={INK} strokeWidth={6} {...NS} />
      <path d={`M${x0 + 52} ${-392 + wv(0.7) * 0.5} l22 22 l42 -48`} fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${x0 + 40} -300 h120`} stroke="none" />
    </g>
  );
};

export const MainBack: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {/* floating obby blocks over the lava */}
    {[
      [560, -300, 240, 80, "#3fa7ff", "#1c74c9"], [1060, -420, 200, 80, "#ffd23f", "#d6a60f"], [2150, -330, 260, 80, "#c46bff", "#8e3fcc"], [-1700, -360, 220, 80, "#3ad17a", "#1f9a55"], [2700, -480, 200, 80, "#ff4d6d", "#c22a49"],
    ].map(([x, y, w, h, c, s], i) => {
      const bob = Math.sin(f / 18 + i * 2) * 8;
      return (
        <g key={i}>
          <rect x={(x as number) + (w as number) / 2 - 14} y={(y as number) + 60 + bob} width={28} height={-(y as number) + 60} fill="#6c6f86" stroke={INK} strokeWidth={5} {...NS} />
          <Blk x={x as number} y={(y as number) + bob} w={w as number} h={h as number} c={c as string} s={s as string} />
        </g>
      );
    })}
    {/* kill-brick row sticking out of the lava */}
    {[880, 1350, 1980].map((x, i) => <Blk key={i} x={x} y={-40 + Math.sin(f / 15 + i) * 6} w={90} h={90} c="#ff3b3b" s="#b81d1d" />)}
    <Flag f={f} />
  </g>
);

export const Platform: React.FC = () => (
  <g>
    <Blk x={-1150} y={PLAT_TOP} w={1090} h={900} c="#5d6cff" s="#3a45c4" check="#6c7aff" top="#7be05a" sw={7} />
    <path d={`M-1150 ${PLAT_TOP + 26} H-60`} stroke={INK} strokeWidth={5} {...NS} />
    {/* spawn pad */}
    <rect x={-560} y={PLAT_TOP - 10} width={170} height={14} rx={4} fill="#ffd23f" stroke={INK} strokeWidth={5} {...NS} />
  </g>
);

/** lava surface + body, drawn in front of anything standing in it */
export const Lava: React.FC<{ f: number; boost?: number }> = ({ f }) => {
  const t = f;
  const pts: string[] = [];
  for (let x = -3600; x <= 5200; x += 60) pts.push(`${x},${(6 * Math.sin(x * 0.011 + t * 0.12) + 4 * Math.sin(x * 0.029 - t * 0.19)).toFixed(1)}`);
  const surf = `M-3600,3200 L${pts.join(" L")} L5200,3200 Z`;
  const tb = f - (f % 2);
  return (
    <g>
      <defs>
        <linearGradient id="lava" x1="0" y1="0" x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffbe2e" /><stop offset="0.08" stopColor="#ff7a16" /><stop offset="0.45" stopColor="#e2381a" /><stop offset="1" stopColor="#8a120e" />
        </linearGradient>
      </defs>
      <path d={surf} fill="url(#lava)" stroke={INK} strokeWidth={7} {...NS} />
      {/* crust patches drifting */}
      {Array.from({ length: 34 }).map((_, i) => {
        const x = -3300 + i * 250 + hash(i + 100) * 90 + ((tb * 0.8) % 250), y = 40 + (hash(i + 140) * 0.5 + 0.5) * 260;
        const w = 70 + (hash(i + 160) * 0.5 + 0.5) * 90;
        return <ellipse key={i} cx={x} cy={y} rx={w} ry={w * 0.22} fill={i % 3 ? "#ffa531" : "#c22a14"} opacity={i % 3 ? 0.75 : 0.5} />;
      })}
      {/* bubbles: grow, pop into a ring */}
      {Array.from({ length: 26 }).map((_, i) => {
        const period = 36 + (i % 5) * 7;
        const ph = (tb + i * 13) % period;
        const cyc = Math.floor((tb + i * 13) / period);
        const x = -2000 + (hash(i * 7 + cyc) * 0.5 + 0.5) * 4600;
        const life = ph / period;
        if (life < 0.75) {
          const r = 8 + 26 * (life / 0.75);
          return <circle key={i} cx={x} cy={-r * 0.45} r={r} fill="#ffcf48" stroke={INK} strokeWidth={4} {...NS} />;
        }
        const k = (life - 0.75) / 0.25;
        return <ellipse key={i} cx={x} cy={-4} rx={30 + 40 * k} ry={10 + 8 * k} fill="none" stroke="#ffe08a" strokeWidth={5} opacity={1 - k} {...NS} />;
      })}
    </g>
  );
};

export const Embers: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 40 }).map((_, i) => {
      const period = 70 + (i % 7) * 9;
      const ph = ((f + i * 31) % period) / period;
      const x = -1800 + (hash(i + 300) * 0.5 + 0.5) * 3800 + Math.sin(ph * 6 + i) * 30;
      const y = 200 - ph * 1500;
      const s = 6 + (i % 4) * 3;
      return <rect key={i} x={x} y={y} width={s} height={s} transform={`rotate(${f * 4 + i * 20} ${x + s / 2} ${y + s / 2})`} fill={i % 2 ? "#ffd23f" : "#ff7a2a"} opacity={0.85 * (1 - ph)} />;
    })}
  </g>
);
