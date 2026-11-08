// Worlds in the flat story-short look. Room: floor line y = 0, wall above. Game: lava surface y = 0, spawn
// platform top y = -170 (x -1150..-60), block A top -300 (x 560..800), block B top -420 (x 1060..1260),
// finish pad top -40 (x 1560..1860, flag at 1790).
import React from "react";
import { OL, Blk } from "./chars";
import { hash } from "../its-just-orange/story";

// ================================================================================================ ROOM
export const ROOM = { door: [-1060, -780], win: [-560, -160], couch: [-60, 660], board: [760, 1150] };

const Cloud: React.FC<{ x: number; y: number; s: number; tint?: string }> = ({ x, y, s, tint = "#d7ecff" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[[-90, -10, 80], [-20, -50, 100], [60, -20, 80], [-50, 20, 160]].map(([cx, cy, w], i) => (
      <g key={i}>
        <rect x={cx - w / 2} y={cy - w / 2} width={w} height={w} rx={10} fill="#fff" stroke="#9cc2e6" strokeWidth={5} />
        <rect x={cx + w * 0.2} y={cy - w / 2} width={w * 0.3} height={w} rx={8} fill={tint} />
      </g>
    ))}
  </g>
);

export const Room: React.FC<{ f: number; night: number; tally: number; tablet?: { x: number; y: number } | null }> = ({ f, night, tally, tablet }) => {
  const n = night > 0.5;
  const wall = n ? "#4b4f8f" : "#ffcf8a", wall2 = n ? "#434785" : "#ffc274";
  const floor = n ? "#5a3f5e" : "#d98f4e", floor2 = n ? "#4c3452" : "#c27a3c";
  return (
    <g>
      {/* wall + stripes */}
      <rect x={-2400} y={-2200} width={4800} height={2200} fill={wall} />
      {Array.from({ length: 30 }).map((_, i) => <rect key={i} x={-2400 + i * 160} y={-2200} width={70} height={2200} fill={wall2} />)}
      <rect x={-2400} y={-90} width={4800} height={90} fill={n ? "#6d6fae" : "#fff4e2"} stroke={OL} strokeWidth={9} />
      {/* floor planks */}
      <rect x={-2400} y={0} width={4800} height={1600} fill={floor} stroke={OL} strokeWidth={9} />
      {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={-2400} y1={70 + i * 90} x2={2400} y2={70 + i * 90} stroke={floor2} strokeWidth={8} />)}
      {Array.from({ length: 40 }).map((_, i) => <line key={"v" + i} x1={-2400 + i * 260 + (i % 2) * 120} y1={(i % 6) * 90} x2={-2400 + i * 260 + (i % 2) * 120} y2={(i % 6) * 90 + 90} stroke={floor2} strokeWidth={8} />)}
      <ellipse cx={180} cy={190} rx={820} ry={120} fill={n ? "#3f5a9a" : "#58b6ff"} stroke={OL} strokeWidth={9} />
      <ellipse cx={180} cy={190} rx={700} ry={86} fill="none" stroke={n ? "#5b78b8" : "#9ad4ff"} strokeWidth={14} />
      {/* door (open, dark hallway) */}
      <rect x={ROOM.door[0] - 24} y={-1060} width={ROOM.door[1] - ROOM.door[0] + 48} height={1060} rx={10} fill={n ? "#8b8fc9" : "#fffaf0"} stroke={OL} strokeWidth={9} />
      <rect x={ROOM.door[0]} y={-1036} width={ROOM.door[1] - ROOM.door[0]} height={1036} fill={n ? "#141632" : "#7a4f33"} stroke={OL} strokeWidth={8} />
      <path d={`M${ROOM.door[0]} -1036 L${ROOM.door[0] - 80} -1000 L${ROOM.door[0] - 80} 30 L${ROOM.door[0]} 0 Z`} fill={n ? "#6a5a8a" : "#c98a52"} stroke={OL} strokeWidth={8} strokeLinejoin="round" />
      {/* window */}
      <g>
        <rect x={ROOM.win[0] - 30} y={-1250} width={ROOM.win[1] - ROOM.win[0] + 60} height={560} rx={14} fill={n ? "#8b8fc9" : "#fffaf0"} stroke={OL} strokeWidth={9} />
        <rect x={ROOM.win[0]} y={-1220} width={ROOM.win[1] - ROOM.win[0]} height={500} fill={n ? "#141a45" : "#7fd0ff"} stroke={OL} strokeWidth={8} />
        {n ? (
          <g>
            <circle cx={ROOM.win[0] + 290} cy={-1090} r={58} fill="#fff4c2" stroke={OL} strokeWidth={7} />
            <circle cx={ROOM.win[0] + 315} cy={-1105} r={50} fill="#141a45" />
            {Array.from({ length: 9 }).map((_, i) => <circle key={i} cx={ROOM.win[0] + 40 + hash(i) * 0 + (i * 47) % 380} cy={-1180 + ((i * 83) % 420)} r={5 + (i % 3) * 2} fill="#fff" opacity={0.6 + 0.4 * Math.sin(f / 9 + i)} />)}
          </g>
        ) : (
          <g>
            <Cloud x={ROOM.win[0] + 140 + ((f * 0.4) % 80)} y={-1040} s={0.55} />
            <rect x={ROOM.win[0]} y={-820} width={ROOM.win[1] - ROOM.win[0]} height={100} fill="#6fd36a" />
          </g>
        )}
        <line x1={(ROOM.win[0] + ROOM.win[1]) / 2} y1={-1220} x2={(ROOM.win[0] + ROOM.win[1]) / 2} y2={-720} stroke={n ? "#8b8fc9" : "#fffaf0"} strokeWidth={22} />
        <line x1={ROOM.win[0]} y1={-970} x2={ROOM.win[1]} y2={-970} stroke={n ? "#8b8fc9" : "#fffaf0"} strokeWidth={22} />
        {/* curtains */}
        {[-1, 1].map((sd) => {
          const x0 = sd < 0 ? ROOM.win[0] - 70 : ROOM.win[1] + 70;
          return <path key={sd} d={`M${x0 - 60 * sd} -1290 H${x0 + 70 * sd} Q${x0 + 40 * sd} -980 ${x0 + 60 * sd} -640 H${x0 - 60 * sd} Z`} fill={n ? "#7a3d6a" : "#ff5d6c"} stroke={OL} strokeWidth={9} strokeLinejoin="round" />;
        })}
        <rect x={ROOM.win[0] - 160} y={-1310} width={ROOM.win[1] - ROOM.win[0] + 320} height={34} rx={17} fill={n ? "#7a6a9a" : "#c98a52"} stroke={OL} strokeWidth={8} />
      </g>
      {/* whiteboard with tally marks */}
      <Board tally={tally} night={n} />
      {/* floor lamp */}
      <g>
        <rect x={-292} y={-760} width={18} height={760} fill="#6b6f86" stroke={OL} strokeWidth={7} />
        <ellipse cx={-283} cy={-4} rx={70} ry={16} fill="#6b6f86" stroke={OL} strokeWidth={7} />
        <path d="M-380 -760 L-186 -760 L-226 -900 L-340 -900 Z" fill={n ? "#c9a64a" : "#ffd23f"} stroke={OL} strokeWidth={9} strokeLinejoin="round" />
      </g>
      {/* picture frame */}
      <g transform="translate(380 -1120)">
        <rect x={-120} y={-90} width={240} height={180} rx={10} fill="#ffe9b0" stroke={OL} strokeWidth={9} />
        <rect x={-96} y={-66} width={192} height={132} fill={n ? "#3a5a8a" : "#8fe0ff"} />
        <rect x={-96} y={20} width={192} height={46} fill={n ? "#2d6a3a" : "#5fd35a"} />
        <rect x={-30} y={-30} width={60} height={50} fill={n ? "#c9a64a" : "#ffd23f"} stroke={OL} strokeWidth={5} />
      </g>
    </g>
  );
};

export const Board: React.FC<{ tally: number; night: boolean }> = ({ tally, night }) => {
  const [x0, x1] = ROOM.board;
  const y0 = -1180, y1 = -760;
  const marks: React.ReactNode[] = [];
  const gW = 84, rowH = 78, perRow = 4;
  for (let i = 0; i < tally; i++) {
    const g = Math.floor(i / 5), k = i % 5;
    const row = Math.floor(g / perRow), col = g % perRow;
    const bx = x0 + 34 + col * gW, by = y0 + 30 + row * rowH;
    const c = row >= 5 ? (night ? "#e8e0ff" : "#3a2a6a") : "#d0283a";
    if (k < 4) marks.push(<line key={i} x1={bx + k * 15} y1={by} x2={bx + k * 15 + (i % 3) - 1} y2={by + 56} stroke={c} strokeWidth={8} strokeLinecap="round" />);
    else marks.push(<line key={i} x1={bx - 8} y1={by + 46} x2={bx + 56} y2={by + 8} stroke={c} strokeWidth={8} strokeLinecap="round" />);
  }
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={12} fill={night ? "#b9bde6" : "#ffffff"} stroke={OL} strokeWidth={9} />
      <rect x={x0 + 10} y={y1 - 26} width={x1 - x0 - 20} height={16} rx={6} fill="#9aa0b8" stroke={OL} strokeWidth={6} />
      {marks}
    </g>
  );
};

export const Couch: React.FC<{ night: boolean }> = ({ night }) => {
  const [a, b] = ROOM.couch;
  const c: [string, string] = night ? ["#5a4a8a", "#463a70"] : ["#7d5cf0", "#5f42c8"];
  return (
    <g>
      <Blk x={a + 40} y={-470} w={b - a - 80} h={300} c={c} r={40} />
      <Blk x={a + 70} y={-300} w={(b - a - 140) / 2} h={120} c={[night ? "#6b5aa0" : "#9b7fff", c[1]]} r={30} />
      <Blk x={a + 70 + (b - a - 140) / 2} y={-300} w={(b - a - 140) / 2} h={120} c={[night ? "#6b5aa0" : "#9b7fff", c[1]]} r={30} />
      <Blk x={a + 40} y={-190} w={b - a - 80} h={186} c={c} r={20} />
      <Blk x={a - 30} y={-370} w={110} h={330} c={c} r={40} />
      <Blk x={b - 80} y={-370} w={110} h={330} c={c} r={40} />
      {[a + 10, b - 50].map((x) => <rect key={x} x={x} y={-40} width={40} height={40} fill="#5a3b25" stroke={OL} strokeWidth={7} />)}
    </g>
  );
};

/** front couch arm drawn over a seated character's legs + blanket */
export const Blanket: React.FC<{ x: number; f: number; night: boolean }> = ({ x, f, night }) => (
  <g>
    <path d={`M${x - 190} -330 Q${x} ${-360 + Math.sin(f / 10) * 4} ${x + 200} -330 L${x + 230} -30 Q${x} -10 ${x - 220} -30 Z`} fill={night ? "#3f7a8a" : "#4fc3d9"} stroke={OL} strokeWidth={9} strokeLinejoin="round" />
    {[0, 1, 2].map((i) => <path key={i} d={`M${x - 200 + i * 6} ${-250 + i * 80} Q${x} ${-262 + i * 80} ${x + 215 - i * 4} ${-250 + i * 80}`} fill="none" stroke={night ? "#2f5f6c" : "#2fa3b9"} strokeWidth={10} />)}
  </g>
);

export const Plant: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    {[-50, -20, 10, 40].map((a, i) => <path key={i} d={`M0 -150 Q${a * 2} -330 ${a * 4} ${-420 + (i % 2) * 60} Q${a * 1.2} -300 0 -150 Z`} fill={i % 2 ? "#3fbf5a" : "#2f9a46"} stroke={OL} strokeWidth={9} strokeLinejoin="round" />)}
    <path d="M-120 -170 H120 L95 0 H-95 Z" fill="#ff8a3d" stroke={OL} strokeWidth={9} strokeLinejoin="round" />
    <rect x={-132} y={-196} width={264} height={44} rx={12} fill="#ff9e57" stroke={OL} strokeWidth={9} />
  </g>
);

// ================================================================================================ GAME
export const G = { spawnL: -1150, spawnR: -60, spawnTop: -170, A: [560, 800, -300], B: [1060, 1260, -420], fin: [1560, 1860, -40], flag: 1790 } as const;

/** studded obby block (top face studs) */
export const Stud: React.FC<{ x: number; y: number; w: number; h: number; c: [string, string]; side?: string; studs?: boolean }> = ({ x, y, w, h, c, side, studs = true }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={14} fill={side ?? c[1]} />
    <rect x={x} y={y} width={w} height={Math.min(70, h)} rx={14} fill={c[0]} />
    {studs && Array.from({ length: Math.floor((w - 20) / 56) }).map((_, i) => (
      <g key={i}>
        <ellipse cx={x + 38 + i * 56} cy={y + 30} rx={19} ry={12} fill={c[1]} opacity={0.6} />
        <ellipse cx={x + 38 + i * 56} cy={y + 26} rx={17} ry={10} fill="#ffffff" opacity={0.35} />
      </g>
    ))}
    <rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={OL} strokeWidth={9} />
  </g>
);

export const GameSky: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <defs>
      <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3aa8ff" /><stop offset="0.6" stopColor="#8fdcff" /><stop offset="1" stopColor="#d8f6ff" />
      </linearGradient>
      <radialGradient id="sunr" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff6c0" /><stop offset="1" stopColor="#fff6c0" stopOpacity="0" /></radialGradient>
    </defs>
    <rect x={-300} y={-300} width={1680} height={2520} fill="url(#gsky)" />
    <g transform={`translate(860 300) rotate(${f * 0.4})`}>
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={-8} y={-230} width={16} height={70} rx={8} fill="#fff6c0" opacity={0.7} transform={`rotate(${i * 30})`} />)}
    </g>
    <circle cx={860} cy={300} r={170} fill="url(#sunr)" />
    <circle cx={860} cy={300} r={110} fill="#ffe04d" stroke="#f5b82a" strokeWidth={10} />
  </g>
);

export const GameClouds: React.FC<{ f: number }> = ({ f }) => (
  <g>{Array.from({ length: 10 }).map((_, i) => <Cloud key={i} x={-2400 + i * 640 + hash(i) * 120 + f * 0.8} y={-1300 + hash(i + 9) * 380} s={0.9 + 0.4 * hash(i + 3)} />)}</g>
);

export const FarIslands: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 14 }).map((_, i) => {
      const x = -2600 + i * 430 + hash(i + 20) * 100, y = -420 - (hash(i + 31) * 0.5 + 0.5) * 460 + Math.sin(f / 30 + i) * 6, w = 170 + (hash(i + 4) * 0.5 + 0.5) * 160;
      const c = ["#b8a6ff", "#9fd1ff", "#ffb3d9", "#a6f0c4"][i % 4];
      return (
        <g key={i} opacity={0.85}>
          <rect x={x} y={y} width={w} height={60} rx={12} fill={c} stroke="#7f8fc9" strokeWidth={5} />
          <path d={`M${x + 16} ${y + 60} L${x + w / 2} ${y + 150} L${x + w - 16} ${y + 60} Z`} fill={c} opacity={0.7} stroke="#7f8fc9" strokeWidth={5} strokeLinejoin="round" />
        </g>
      );
    })}
    <rect x={-4000} y={-40} width={8000} height={3000} fill="#ff8a3d" />
  </g>
);

export const Course: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <defs>
      <linearGradient id="lglow2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8a2a" stopOpacity="0" /><stop offset="1" stopColor="#ff5a1f" stopOpacity="0.5" /></linearGradient>
    </defs>
    <rect x={-4000} y={-560} width={9000} height={580} fill="url(#lglow2)" />
    {/* pillars */}
    {[G.A, G.B].map(([a, b, t], i) => <rect key={i} x={(a + b) / 2 - 22} y={t + 60} width={44} height={-t} fill="#8a8fb0" stroke={OL} strokeWidth={8} />)}
    <Stud x={G.A[0]} y={G.A[2]} w={G.A[1] - G.A[0]} h={90} c={["#4aa8ff", "#2a78d0"]} />
    <Stud x={G.B[0]} y={G.B[2]} w={G.B[1] - G.B[0]} h={90} c={["#ffd23f", "#d9a514"]} />
    {/* kill bricks */}
    {[900, 1400].map((x, i) => (
      <g key={x}>
        <rect x={x - 18} y={-150} width={136} height={170} rx={20} fill="#ff3b3b" opacity={0.25 + 0.1 * Math.sin(f / 5 + i)} />
        <Stud x={x} y={-110 + Math.sin(f / 15 + i) * 5} w={100} h={110} c={["#ff4a4a", "#c42222"]} />
      </g>
    ))}
    {/* finish pad + flag */}
    <Stud x={G.fin[0]} y={G.fin[2]} w={G.fin[1] - G.fin[0]} h={120} c={["#46c75a", "#2f9a42"]} />
    <g>
      <rect x={G.flag - 10} y={-520} width={20} height={480} rx={8} fill="#f2f2f8" stroke={OL} strokeWidth={8} />
      <circle cx={G.flag} cy={-528} r={20} fill="#ffd23f" stroke={OL} strokeWidth={8} />
      <path d={`M${G.flag + 10} -506 Q${G.flag + 80} ${-526 + Math.sin(f / 4) * 12} ${G.flag + 170} ${-506 + Math.sin(f / 4 + 1) * 12} L${G.flag + 175} ${-386 + Math.sin(f / 4 + 2) * 12} Q${G.flag + 90} ${-406 + Math.sin(f / 4 + 1.5) * 12} ${G.flag + 10} -390 Z`} fill="#ff4f8b" stroke={OL} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M${G.flag + 60} ${-460 + Math.sin(f / 4 + 0.7) * 6} l18 18 l36 -40`} fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

export const Spawn: React.FC = () => (
  <g>
    <rect x={G.spawnL} y={G.spawnTop} width={G.spawnR - G.spawnL} height={900} rx={16} fill="#a8683a" />
    {Array.from({ length: 30 }).map((_, i) => <rect key={i} x={G.spawnL + 30 + (i % 6) * 170 + ((Math.floor(i / 6) % 2) * 80)} y={G.spawnTop + 120 + Math.floor(i / 6) * 120} width={60} height={30} rx={10} fill="#8d5530" />)}
    <Stud x={G.spawnL} y={G.spawnTop} w={G.spawnR - G.spawnL} h={80} c={["#6fdc5a", "#46b23a"]} side="#a8683a" />
    <rect x={G.spawnL} y={G.spawnTop} width={G.spawnR - G.spawnL} height={900} rx={16} fill="none" stroke={OL} strokeWidth={9} />
    {/* spawn pad */}
    <rect x={-300} y={G.spawnTop - 14} width={220} height={20} rx={8} fill="#c9d2ff" stroke={OL} strokeWidth={7} />
    <path d={`M-238 ${G.spawnTop - 6} l20 -16 l20 16 l20 -16 l20 16 l20 -16 l20 16`} fill="none" stroke="#7f8fd9" strokeWidth={5} />
  </g>
);

export const Lava: React.FC<{ f: number }> = ({ f }) => {
  const pts: string[] = [];
  for (let x = -3600; x <= 5200; x += 60) pts.push(`${x},${(8 * Math.sin(x * 0.01 + f * 0.12) + 5 * Math.sin(x * 0.027 - f * 0.17)).toFixed(1)}`);
  const tb = f - (f % 2);
  return (
    <g>
      <defs>
        <linearGradient id="lava2" x1="0" y1="0" x2="0" y2="800" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffb02e" /><stop offset="0.1" stopColor="#ff7a1a" /><stop offset="0.6" stopColor="#f0441c" /><stop offset="1" stopColor="#b8200f" />
        </linearGradient>
      </defs>
      <path d={`M-3600,3200 L${pts.join(" L")} L5200,3200 Z`} fill="url(#lava2)" stroke={OL} strokeWidth={9} />
      {Array.from({ length: 30 }).map((_, i) => {
        const x = -3300 + i * 280 + hash(i + 100) * 90 + ((tb * 0.7) % 280), y = 60 + (hash(i + 140) * 0.5 + 0.5) * 300, w = 50 + (hash(i + 160) * 0.5 + 0.5) * 70;
        return <ellipse key={i} cx={x} cy={y} rx={w} ry={w * 0.32} fill="#ffc94a" opacity={0.55} />;
      })}
      {Array.from({ length: 22 }).map((_, i) => {
        const period = 40 + (i % 5) * 8, ph = (tb + i * 13) % period, cyc = Math.floor((tb + i * 13) / period);
        const x = -2000 + (hash(i * 7 + cyc) * 0.5 + 0.5) * 4600, life = ph / period;
        if (life < 0.75) { const r = 10 + 24 * (life / 0.75); return <circle key={i} cx={x} cy={-r * 0.4} r={r} fill="#ffd25a" stroke={OL} strokeWidth={6} />; }
        const k = (life - 0.75) / 0.25;
        return <ellipse key={i} cx={x} cy={-4} rx={30 + 40 * k} ry={10 + 8 * k} fill="none" stroke="#ffe08a" strokeWidth={6} opacity={1 - k} />;
      })}
    </g>
  );
};
