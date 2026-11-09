// "What If Every Lie Made You BIGGER?" — ~56 s vertical 2D story short in the flat story-short look.
// Script: stories/lie-bigger/SCRIPT.md. Timeline/camera/captions/sizes: story.ts. Poses: poses.ts. Silent.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/LilitaOne";
import { OL, Person, Pose, Kind } from "../dad-obby/chars";
import { Room, Couch, Plant, GameSky, GameClouds } from "../dad-obby/world";
import { Street, HouseBack, HouseFront, Roof, CloudBank } from "./town";
import { kidRoom, dadRoom, kidOut, dadOut, NEIGHBORS, neighborPose } from "./poses";
import { FRAMES, W, H, CEIL, camAt, sceneAt, layerTransform, wordAt, COMIC, FLASH, KID_SIZE, DAD_SIZE, kidSize, dadSize, KID_HEAD, hash, seg, backOut, clamp } from "./story";

const { fontFamily } = loadFont();
export const LIE_FRAMES = FRAMES;

const scaled = (p: Pose, s: number): Pose => ({ ...p, sx: (p.sx ?? 1) * s, sy: (p.sy ?? 1) * s });

// ------------------------------------------------------------------------------------------------ FX (world space)
/** POOF: a ring of cloud puffs + sparkles around a growing/shrinking character */
const Poof: React.FC<{ f: number; x: number; y: number; start: number; r: number; green?: boolean }> = ({ f, x, y, start, r, green }) => {
  const d = f - start;
  if (d < 0 || d > 30) return null;
  const k = d / 30;
  return (
    <g>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + hash(i) * 0.3;
        const rr = r * (0.55 + 0.6 * Math.sqrt(k));
        const pr = r * 0.2 * Math.sin(Math.min(1, k * 1.8) * Math.PI * 0.6) * (1 - k * 0.5);
        return <circle key={i} cx={x + Math.cos(a) * rr} cy={y + Math.sin(a) * rr * 0.9} r={Math.max(1, pr)} fill={green ? "#d7f7c9" : "#ffffff"} stroke={OL} strokeWidth={Math.max(4, r * 0.012)} opacity={1 - k * k} />;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4, rr = r * (0.4 + 0.9 * k), z = r * 0.05 * (1 - k);
        const cx = x + Math.cos(a) * rr, cy = y + Math.sin(a) * rr;
        return <path key={"s" + i} d={`M${cx} ${cy - z * 2} L${cx + z * 0.5} ${cy - z * 0.5} L${cx + z * 2} ${cy} L${cx + z * 0.5} ${cy + z * 0.5} L${cx} ${cy + z * 2} L${cx - z * 0.5} ${cy + z * 0.5} L${cx - z * 2} ${cy} L${cx - z * 0.5} ${cy - z * 0.5} Z`} fill="#ffe14d" stroke={OL} strokeWidth={Math.max(3, r * 0.008)} />;
      })}
    </g>
  );
};

/** the "lie update" sparkle that hits you at the start */
const Zap: React.FC<{ f: number; x: number; y: number }> = ({ f, x, y }) => {
  if (f < 92 || f > 125) return null;
  const k = seg(f, 92, 104);
  const sx = x + 700 * (1 - k), sy = y - 900 * (1 - k);
  return (
    <g>
      {f < 104 && <path d={`M${sx} ${sy} L${sx + 120} ${sy - 160}`} stroke="#ffe14d" strokeWidth={24} strokeLinecap="round" opacity={0.7} />}
      {f < 104 && <circle cx={sx} cy={sy} r={40} fill="#fff6a0" stroke={OL} strokeWidth={8} />}
      {f >= 104 && <circle cx={x} cy={y} r={60 + (f - 104) * 18} fill="none" stroke="#ffe14d" strokeWidth={Math.max(1, 20 - (f - 104))} />}
    </g>
  );
};

/** cookie crumbs around your mouth / on your shirt */
const Crumbs: React.FC<{ x: number; s: number }> = ({ x, s }) => {
  const hy = -KID_HEAD * s;
  const pts = [[-34, 50], [30, 58], [-12, 70], [44, 40], [-46, 66], [10, 140], [-30, 170], [36, 190], [-6, 215]];
  return <g>{pts.map(([dx, dy], i) => <circle key={i} cx={x + dx * s} cy={hy + dy * s} r={(i % 3 === 0 ? 7 : 5) * s} fill="#b07a3a" stroke={OL} strokeWidth={2.5 * s} />)}</g>;
};

const Ceiling: React.FC<{ crackL: boolean; crackR: boolean }> = ({ crackL, crackR }) => (
  <g>
    <rect x={-3000} y={CEIL - 3000} width={6000} height={3000} fill="#fff4e2" />
    <rect x={-3000} y={CEIL - 50} width={6000} height={50} fill="#ffe2b8" stroke={OL} strokeWidth={9} />
    {crackL && <path d={`M-420 ${CEIL - 50} l60 -70 l-40 -60 l70 -80 M-120 ${CEIL - 50} l-30 -90 l50 -50 M-260 ${CEIL - 50} l10 -140`} fill="none" stroke={OL} strokeWidth={9} strokeLinejoin="round" />}
    {crackR && <path d={`M160 ${CEIL - 50} l60 -70 l-40 -60 l70 -80 M460 ${CEIL - 50} l-30 -90 l50 -50 M320 ${CEIL - 50} l10 -140`} fill="none" stroke={OL} strokeWidth={9} strokeLinejoin="round" />}
  </g>
);

// ------------------------------------------------------------------------------------------------ overlays (screen)
const Caption: React.FC<{ f: number }> = ({ f }) => {
  const w = wordAt(f);
  if (!w) return null;
  const sc = 0.6 + 0.4 * backOut(seg(f, w.a, w.a + 5), 2.4);
  const size = w.w.length > 10 ? 118 : 138;
  return (
    <g transform={`translate(${W / 2} 1460) scale(${sc}) rotate(${w.hot ? -3 : 0})`}>
      <text x={0} y={0} textAnchor="middle" fontFamily={fontFamily} fontSize={size} fill={w.hot ? "#ffd23f" : "#ffffff"} stroke="#120c08" strokeWidth={26} strokeLinejoin="round" paintOrder="stroke" style={{ letterSpacing: 2 }}>{w.w}</text>
    </g>
  );
};

const SizeChip: React.FC<{ s: number; f: number }> = ({ s, f }) => {
  const big = s > 1.05;
  const pulse = KID_SIZE.concat(DAD_SIZE).some(([t]) => f >= t && f < t + 8) ? 1.15 : 1;
  const txt = `SIZE x${s.toFixed(1)}`;
  const wdt = 130 + txt.length * 38;
  return (
    <g transform={`translate(${W / 2} 210) scale(${pulse})`}>
      <rect x={-wdt / 2} y={-52} width={wdt} height={104} rx={52} fill={s > 2.5 ? "#e0283a" : big ? "#ff8a1f" : "#1d1a26"} stroke="#fff" strokeWidth={8} />
      <g transform={`translate(${-wdt / 2 + 60} 0)`}><path d="M0 -30 L22 -4 H9 V28 H-9 V-4 H-22 Z" fill="#fff" /></g>
      <text x={32} y={22} textAnchor="middle" fontFamily={fontFamily} fontSize={64} fill="#fff" style={{ letterSpacing: 2 }}>{txt}</text>
    </g>
  );
};

const Comic: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {COMIC.map((c, i) => {
      const d = f - c.f;
      if (d < 0 || d > 30) return null;
      const k = backOut(seg(d, 0, 6), 3), out = seg(d, 24, 30);
      const [c0, c1] = c.c ?? ["#ffe14d", "#ff8a1f"];
      return (
        <g key={i} transform={`translate(${c.x + hash(i + f - (f % 2)) * 4} ${c.y}) rotate(${c.rot}) scale(${k * (1 - out * 0.4)})`} opacity={1 - out}>
          <defs><linearGradient id={`lg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0.2" stopColor={c0} /><stop offset="1" stopColor={c1} /></linearGradient></defs>
          <text x={0} y={0} textAnchor="middle" fontFamily={fontFamily} fontSize={c.size} fill={`url(#lg${i})`} stroke="#120c08" strokeWidth={c.size * 0.16} strokeLinejoin="round" paintOrder="stroke" style={{ letterSpacing: 4 }}>{c.text}</text>
        </g>
      );
    })}
  </g>
);

// ------------------------------------------------------------------------------------------------ composition
const sizeMid = (k: Kind, s: number) => (k === "kid" ? -210 * s : -260 * s);

export const LieBigger: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const scene = sceneAt(f);
  const t2 = f - (f % 2);
  const main = layerTransform(cam, 1);
  const ks = kidSize(f), ds = dadSize(f);
  const flash = FLASH.map((a) => f - a).find((d) => d >= 0 && d < 5);
  const kidEvents = KID_SIZE.filter(([t]) => t !== 688);
  let world: React.ReactNode;

  if (scene === "room") {
    const kid = scaled(kidRoom(f), ks), dad = scaled(dadRoom(f), ds);
    world = (
      <>
        <g transform={main}>
          <Room f={t2} night={0} tally={0} />
          <Couch night={false} />
          <Person k="dad" p={dad} f={t2} />
          <Person k="kid" p={kid} f={t2} />
          {f >= 340 && f < 690 && <Crumbs x={kid.x + (kid.headDx ?? 0)} s={ks} />}
          <Zap f={f} x={-250} y={-330} />
          <Ceiling crackL={f >= 613 && f < 690} crackR={f >= 1611} />
          {kidEvents.filter(([t]) => t < 690).map(([t]) => <Poof key={t} f={f} x={-250} y={sizeMid("kid", ks)} start={t} r={330 * ks} />)}
          <Poof f={f} x={300} y={sizeMid("dad", ds)} start={1605} r={360 * ds} />
        </g>
        <g transform={layerTransform(cam, 1.3)}><Plant x={1250} y={260} /></g>
      </>
    );
  } else {
    const kid = scaled(kidOut(f), ks);
    const front = f >= 1342;
    world = (
      <>
        <g transform={`translate(${W / 2} ${H / 2}) rotate(${cam.r * 0.3}) translate(${-W / 2} ${-H / 2})`}><GameSky f={f} /></g>
        <g transform={layerTransform(cam, 0.1)}><GameClouds f={t2} /></g>
        <g transform={main}>
          <CloudBank f={t2} y={-3300} />
          <Street f={t2} />
          <HouseBack />
          {!front && <Person k="kid" p={kid} f={t2} />}
          <Roof k={1} f={t2} />
          <HouseFront crack={1} />
          {front && <Person k="kid" p={kid} f={t2} />}
          {NEIGHBORS.map((n, i) => <Person key={i} k={n.k} p={neighborPose(f, n)} f={t2} />)}
          <Person k="dad" p={dadOut(f)} f={t2} />
          {ks > 7.5 && <g opacity={clamp((ks - 7.5) / 1.2)}><CloudBank f={t2 + 400} y={-2250} /></g>}
          {kidEvents.filter(([t]) => t > 690).map(([t, v]) => <Poof key={t} f={f} x={0} y={sizeMid("kid", ks)} start={t} r={330 * Math.max(ks, 1.2)} green={v < 9 && t > 1100} />)}
        </g>
      </>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#8fdcff" }}>
      {/* Kokoro voice + synthesized SFX (no music): stories/lie-bigger/audio/ -> public/lie-bigger/mix.wav */}
      <Audio src={staticFile("lie-bigger/mix.wav")} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {world}
        <Comic f={f} />
        <SizeChip s={f >= 1380 ? (f >= 1605 ? ds : 1) : ks} f={f} />
        <Caption f={f} />
        <defs><radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1a0a20" stopOpacity="0.28" /></radialGradient></defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#vig)" />
        {flash !== undefined && <rect x={0} y={0} width={W} height={H} fill="#fff" opacity={clamp(1 - flash / 5) * 0.85} />}
      </svg>
    </AbsoluteFill>
  );
};
