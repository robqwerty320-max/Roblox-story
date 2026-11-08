// Outside world: a street with our house in the middle (walls x -450..450, y -800..0), neighbour houses, trees,
// sidewalk at y 0, road in front, a cloud bank at y ~ -2700 (in the main layer, so the giant can stand above it).
import React from "react";
import { OL } from "../dad-obby/chars";
import { hash } from "./story";

const HW = 450, WALL = -800;

const CubeCloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[[-150, -10, 120], [-40, -70, 150], [90, -30, 130], [-60, 30, 260], [190, 20, 110]].map(([cx, cy, w], i) => (
      <g key={i}>
        <rect x={cx - w / 2} y={cy - w / 2} width={w} height={w} rx={16} fill="#fff" stroke="#9cc2e6" strokeWidth={7} />
        <rect x={cx + w * 0.2} y={cy - w / 2} width={w * 0.3} height={w} rx={12} fill="#d7ecff" />
      </g>
    ))}
  </g>
);

export const CloudBank: React.FC<{ f: number; y: number }> = ({ f, y }) => (
  <g>{Array.from({ length: 9 }).map((_, i) => <CubeCloud key={i} x={-3400 + i * 850 + hash(i + 70) * 160 + f * 1.2} y={y + hash(i + 80) * 160} s={1.6 + 0.5 * hash(i + 90)} />)}</g>
);

const House: React.FC<{ x: number; w: number; h: number; wall: string; wall2: string; roof: string }> = ({ x, w, h, wall, wall2, roof }) => (
  <g>
    <path d={`M${x - w / 2 - 70} ${-h} L${x} ${-h - w * 0.55} L${x + w / 2 + 70} ${-h} Z`} fill={roof} stroke={OL} strokeWidth={10} strokeLinejoin="round" />
    <rect x={x - w / 2} y={-h} width={w} height={h} fill={wall} stroke={OL} strokeWidth={10} />
    <rect x={x + w * 0.22} y={-h} width={w * 0.28} height={h} fill={wall2} opacity={0.5} />
    <rect x={x - w / 2} y={-h} width={w} height={h} fill="none" stroke={OL} strokeWidth={10} />
    {[-0.25, 0.25].map((k) => <rect key={k} x={x + k * w - 70} y={-h + 120} width={140} height={130} rx={8} fill="#8fdcff" stroke={OL} strokeWidth={8} />)}
    <rect x={x - 60} y={-240} width={120} height={240} rx={8} fill="#a8683a" stroke={OL} strokeWidth={8} />
  </g>
);

const Tree: React.FC<{ x: number; s?: number }> = ({ x, s = 1 }) => (
  <g transform={`translate(${x} 0) scale(${s})`}>
    <rect x={-30} y={-300} width={60} height={300} fill="#a8683a" stroke={OL} strokeWidth={9} />
    {[[-90, -380, 200], [60, -420, 220], [-20, -560, 230]].map(([cx, cy, w], i) => (
      <g key={i}><rect x={cx - w / 2} y={cy - w / 2} width={w} height={w} rx={30} fill="#46c75a" stroke={OL} strokeWidth={9} /><rect x={cx + w * 0.15} y={cy - w / 2} width={w * 0.35} height={w} rx={24} fill="#2f9a42" opacity={0.7} /></g>
    ))}
  </g>
);

export const Street: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {/* far hills */}
    <path d="M-6000 -200 Q-4000 -900 -2500 -300 Q-1200 -1000 200 -350 Q1800 -1100 3200 -300 Q4600 -900 6000 -250 V0 H-6000 Z" fill="#8fe0a0" stroke="#5fb877" strokeWidth={8} />
    <House x={-1700} w={760} h={720} wall="#9fd1ff" wall2="#6fa8e0" roof="#5a6cd6" />
    <House x={1700} w={760} h={720} wall="#ffb3d9" wall2="#e083b6" roof="#c94a7a" />
    <House x={-3100} w={700} h={680} wall="#ffe08a" wall2="#e8b84a" roof="#e0703a" />
    <House x={3100} w={700} h={680} wall="#c6f0b0" wall2="#94cc7a" roof="#4a9a5a" />
    <Tree x={-900} s={1.1} /><Tree x={950} s={1.2} /><Tree x={-2450} /><Tree x={2450} s={0.9} />
    {/* ground */}
    <rect x={-6000} y={0} width={12000} height={3000} fill="#6fdc5a" stroke={OL} strokeWidth={10} />
    {Array.from({ length: 70 }).map((_, i) => <ellipse key={i} cx={-6000 + i * 170 + 60} cy={34} rx={26} ry={12} fill="#9bf07f" />)}
    <rect x={-6000} y={70} width={12000} height={60} fill="#d9dbe6" stroke={OL} strokeWidth={8} />
    <rect x={-6000} y={130} width={12000} height={320} fill="#5d6176" stroke={OL} strokeWidth={8} />
    {Array.from({ length: 40 }).map((_, i) => <rect key={i} x={-6000 + i * 320 + ((f * 0) % 320)} y={280} width={170} height={22} rx={8} fill="#ffd23f" />)}
    <rect x={-6000} y={450} width={12000} height={2600} fill="#6fdc5a" />
  </g>
);

/** our house: back wall behind the kid */
export const HouseBack: React.FC = () => (
  <g>
    <rect x={-HW} y={WALL} width={HW * 2} height={-WALL} fill="#c99a6a" stroke={OL} strokeWidth={10} />
  </g>
);

/** blown-off roof: only jagged red stubs along the wall top + flying tiles */
export const Roof: React.FC<{ k: number; f: number }> = ({ f }) => {
  const stub = (x0: number, w: number, h: number) => <path d={`M${x0} ${WALL} L${x0 + w * 0.3} ${WALL - h} L${x0 + w * 0.55} ${WALL - h * 0.55} L${x0 + w * 0.8} ${WALL - h * 0.9} L${x0 + w} ${WALL} Z`} fill="#e0463a" stroke={OL} strokeWidth={10} strokeLinejoin="round" />;
  return (
    <g>
      {stub(-HW - 90, 260, 120)}
      {stub(HW + 90 - 260, 260, 110)}
      <rect x={-HW - 90} y={WALL - 14} width={HW * 2 + 180} height={28} rx={8} fill="#b8302a" stroke={OL} strokeWidth={8} />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={-300 + i * 64 + Math.sin(f / 7 + i) * 6} y={WALL - 40 - (i % 3) * 26} width={44} height={26} rx={4} fill="#e0463a" stroke={OL} strokeWidth={5} transform={`rotate(${i * 23} ${-280 + i * 64} ${WALL - 30})`} />)}
    </g>
  );
};

/** front wall drawn over the kid's legs */
export const HouseFront: React.FC<{ crack: number }> = ({ crack }) => (
  <g>
    <rect x={-HW} y={WALL} width={HW * 2} height={-WALL} fill="#ffcf8a" />
    <rect x={HW * 0.45} y={WALL} width={HW * 0.55} height={-WALL} fill="#f0b46a" />
    {Array.from({ length: 7 }).map((_, i) => <line key={i} x1={-HW} y1={WALL + 110 * (i + 1)} x2={HW} y2={WALL + 110 * (i + 1)} stroke="#e8b070" strokeWidth={8} />)}
    {[-260, 260].map((x) => (
      <g key={x}>
        <rect x={x - 90} y={-620} width={180} height={170} rx={10} fill="#8fdcff" stroke={OL} strokeWidth={9} />
        <line x1={x} y1={-620} x2={x} y2={-450} stroke={OL} strokeWidth={7} /><line x1={x - 90} y1={-535} x2={x + 90} y2={-535} stroke={OL} strokeWidth={7} />
      </g>
    ))}
    <rect x={-80} y={-300} width={160} height={300} rx={10} fill="#a8683a" stroke={OL} strokeWidth={9} />
    <circle cx={50} cy={-150} r={12} fill="#ffd23f" stroke={OL} strokeWidth={5} />
    {crack > 0 && <path d={`M${-HW} ${WALL + 40} l120 60 l-40 80 l140 50 M${HW} ${WALL + 30} l-140 70 l60 70 l-120 60`} fill="none" stroke={OL} strokeWidth={9} strokeLinejoin="round" />}
    <rect x={-HW} y={WALL} width={HW * 2} height={-WALL} fill="none" stroke={OL} strokeWidth={10} />
  </g>
);
