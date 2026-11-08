// "What If DAD Tried to Beat Your Obby?" — ~56 s vertical 2D story short, flat story-short look.
// Script: stories/dad-obby/SCRIPT.md. Timeline/camera/captions: story.ts. Poses: poses.ts. Silent (voice comes later).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/LilitaOne";
import { OL, Person, headPos, Pose } from "./chars";
import { Room, Couch, Blanket, Plant, GameSky, GameClouds, FarIslands, Course, Spawn, Lava } from "./world";
import { kidPose, dadPose, dadAvPose } from "./poses";
import { FRAMES, W, H, camAt, sceneAt, layerTransform, toScreen, wordAt, CHIPS, COMIC, FLASH, hash, seg, backOut, clamp, J, SPAWN } from "./story";

const { fontFamily } = loadFont();
export const DADOBBY_FRAMES = FRAMES;

// ------------------------------------------------------------------------------------------------ world FX
const Puffs: React.FC<{ f: number; x: number; y: number; start: number; n?: number; dur?: number; spread?: number; dark?: boolean }> = ({ f, x, y, start, n = 7, dur = 40, spread = 150, dark }) => {
  if (f < start || f > start + dur + 3 * n) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const d = f - start - i * 3;
        if (d < 0) return null;
        const k = d / dur;
        if (k > 1) return null;
        const a = (i / n) * Math.PI * 2 + hash(i) * 0.5;
        const r = 30 + 46 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.6);
        return <circle key={i} cx={x + Math.cos(a) * spread * (0.3 + k)} cy={y - 140 * k - Math.abs(Math.sin(a)) * 50 * k} r={r} fill={dark ? (i % 2 ? "#6d6670" : "#8f8896") : "#ffffff"} stroke={OL} strokeWidth={7} opacity={1 - k * k} />;
      })}
    </g>
  );
};

const Splash: React.FC<{ f: number; x: number; start: number; big?: number }> = ({ f, x, start, big = 1 }) => {
  const d = f - start;
  if (d < 0 || d > 26) return null;
  return (
    <g>
      {Array.from({ length: 14 }).map((_, i) => {
        const vx = hash(i + 400) * 14 * big, vy = -(15 + (hash(i + 410) * 0.5 + 0.5) * 17) * big;
        const px = x + vx * d, py = vy * d + 0.9 * d * d;
        if (py > 20) return null;
        return <circle key={i} cx={px} cy={py} r={(16 + (i % 3) * 8) * big} fill={i % 2 ? "#ffd25a" : "#ff7a1a"} stroke={OL} strokeWidth={6} />;
      })}
      <ellipse cx={x} cy={0} rx={(60 + d * 15) * big} ry={(14 + d * 2) * big} fill="none" stroke="#ffe08a" strokeWidth={9} opacity={1 - d / 26} />
    </g>
  );
};

const Burst: React.FC<{ f: number; x: number; y: number; start: number; s?: number }> = ({ f, x, y, start, s = 1 }) => {
  const d = f - start;
  if (d < 0 || d > 16) return null;
  const k = d / 16;
  return (
    <g>
      <circle cx={x} cy={y} r={(60 + 280 * backOut(Math.min(1, k * 1.5), 1.5)) * s} fill="none" stroke="#fff" strokeWidth={16 * (1 - k)} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2, r = (120 + 260 * k) * s, z = 28 * (1 - k) * s;
        const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
        return <path key={i} d={`M${cx} ${cy - z * 2} L${cx + z * 0.5} ${cy - z * 0.5} L${cx + z * 2} ${cy} L${cx + z * 0.5} ${cy + z * 0.5} L${cx} ${cy + z * 2} L${cx - z * 0.5} ${cy + z * 0.5} L${cx - z * 2} ${cy} L${cx - z * 0.5} ${cy - z * 0.5} Z`} fill="#ffe14d" stroke={OL} strokeWidth={5} />;
      })}
    </g>
  );
};

const CONF = ["#ff4f8b", "#ffd23f", "#4aa8ff", "#46c75a", "#a46bff", "#ff8a3d"];
const Confetti: React.FC<{ f: number; x: number; y: number; start: number; n?: number; power?: number }> = ({ f, x, y, start, n = 46, power = 1 }) => {
  const d = f - start;
  if (d < 0 || d > 110) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const a = -Math.PI / 2 + hash(i + 7) * 1.25;
        const v = (22 + (hash(i + 3) * 0.5 + 0.5) * 22) * power;
        const px = x + Math.cos(a) * v * d * 0.9 + Math.sin(d / 5 + i) * 10, py = y + Math.sin(a) * v * d + 0.75 * d * d * 0.9;
        return <rect key={i} x={px - 11} y={py - 7} width={22} height={14} rx={3} fill={CONF[i % CONF.length]} stroke={OL} strokeWidth={3} transform={`rotate(${d * (8 + (i % 5) * 3) + i * 40} ${px} ${py})`} opacity={d > 90 ? 1 - (d - 90) / 20 : 1} />;
      })}
    </g>
  );
};

// ------------------------------------------------------------------------------------------------ screen overlays
const SpeedLines: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  if (k <= 0) return null;
  const t = f - (f % 2);
  return (
    <g opacity={k}>
      {Array.from({ length: 40 }).map((_, i) => {
        const a = (i / 40) * Math.PI * 2 + hash(i + t * 3) * 0.06;
        const r0 = 560 + (hash(i * 3 + t) * 0.5 + 0.5) * 260, r1 = 1500, wd = 6 + (hash(i + t) * 0.5 + 0.5) * 16;
        const cx = W / 2, cy = H / 2;
        const px = -Math.sin(a) * wd, py = Math.cos(a) * wd;
        return <path key={i} d={`M${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0} L${cx + Math.cos(a) * r1 + px} ${cy + Math.sin(a) * r1 + py} L${cx + Math.cos(a) * r1 - px} ${cy + Math.sin(a) * r1 - py} Z`} fill="#ffffff" />;
      })}
    </g>
  );
};

const Caption: React.FC<{ f: number }> = ({ f }) => {
  const w = wordAt(f);
  if (!w) return null;
  const k = seg(f, w.a, w.a + 5);
  const sc = 0.6 + 0.4 * backOut(k, 2.4);
  const size = w.w.length > 10 ? 118 : 138;
  return (
    <g transform={`translate(${W / 2} 1460) scale(${sc}) rotate(${w.hot ? -3 : 0})`}>
      <text x={0} y={0} textAnchor="middle" fontFamily={fontFamily} fontSize={size} fill={w.hot ? "#ffd23f" : "#ffffff"} stroke="#120c08" strokeWidth={26} strokeLinejoin="round" paintOrder="stroke" style={{ letterSpacing: 2 }}>
        {w.w}
      </text>
      <text x={0} y={0} textAnchor="middle" fontFamily={fontFamily} fontSize={size} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={26} transform="translate(0 10)" style={{ letterSpacing: 2 }} opacity={0} />
    </g>
  );
};

const Chip: React.FC<{ f: number }> = ({ f }) => {
  const c = CHIPS.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  const k = backOut(seg(f, c.a, c.a + 6), 2.2);
  const txt = c.text(f);
  const wdt = 120 + txt.length * 40;
  return (
    <g transform={`translate(${W / 2} 210) scale(${k})`}>
      <rect x={-wdt / 2} y={-52} width={wdt} height={104} rx={52} fill={c.hot ? "#e0283a" : "#1d1a26"} stroke="#fff" strokeWidth={8} />
      <g transform={`translate(${-wdt / 2 + 62} 0)`}>
        {c.icon === "clock" ? (
          <g><circle r={26} fill="none" stroke="#fff" strokeWidth={7} /><path d={`M0 0 L0 -16 M0 0 L${Math.cos(f / 3) * 12} ${Math.sin(f / 3) * 12}`} stroke="#fff" strokeWidth={6} strokeLinecap="round" /></g>
        ) : (
          <g><rect x={-14} y={-30} width={7} height={60} fill="#fff" /><path d="M-7 -30 H26 L18 -17 L26 -4 H-7 Z" fill="#ffd23f" /></g>
        )}
      </g>
      <text x={34} y={22} textAnchor="middle" fontFamily={fontFamily} fontSize={66} fill="#fff" style={{ letterSpacing: 2 }}>{txt}</text>
    </g>
  );
};

const Comic: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {COMIC.map((c, i) => {
      const d = f - c.f;
      if (d < 0 || d > 30) return null;
      const k = backOut(seg(d, 0, 6), 3);
      const out = seg(d, 24, 30);
      const jit = (hash(i + f - (f % 2)) * 4);
      const [c0, c1] = c.c ?? ["#ffe14d", "#ff8a1f"];
      return (
        <g key={i} transform={`translate(${c.x + jit} ${c.y}) rotate(${c.rot}) scale(${k * (1 - out * 0.4)})`} opacity={1 - out}>
          <defs><linearGradient id={`cg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0.2" stopColor={c0} /><stop offset="1" stopColor={c1} /></linearGradient></defs>
          <text x={0} y={0} textAnchor="middle" fontFamily={fontFamily} fontSize={c.size} fill={`url(#cg${i})`} stroke="#120c08" strokeWidth={c.size * 0.16} strokeLinejoin="round" paintOrder="stroke" style={{ letterSpacing: 4 }}>{c.text}</text>
        </g>
      );
    })}
  </g>
);

// ------------------------------------------------------------------------------------------------ composition
const P = (p: Pose | null, k: Parameters<typeof Person>[0]["k"], f: number) => (p ? <Person k={k} p={p} f={f} /> : null);

export const DadObby: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const scene = sceneAt(f);
  const t2 = f - (f % 2);
  const main = layerTransform(cam, 1);
  const flash = FLASH.map((a) => f - a).find((d) => d >= 0 && d < 5);
  let world: React.ReactNode;

  if (scene === "game") {
    const av = dadAvPose(f);
    const ghosts = av.ghosts;
    world = (
      <>
        <g transform={`translate(${W / 2} ${H / 2}) rotate(${cam.r * 0.3}) translate(${-W / 2} ${-H / 2})`}><GameSky f={f} /></g>
        <g transform={layerTransform(cam, 0.12)}><GameClouds f={t2} /></g>
        <g transform={layerTransform(cam, 0.35)}><FarIslands f={t2} /></g>
        <g transform={main}>
          <Course f={t2} />
          <Spawn />
          <Puffs f={t2} x={300} y={-160} start={236} n={8} dur={44} dark />
          <Puffs f={t2} x={90} y={-160} start={427} n={7} dur={40} dark />
          {ghosts?.map((g, i) => <Person key={i} k="dadAv" p={g} f={t2} />)}
          <Person k="dadAv" p={av} f={t2} />
          <Lava f={f} />
          <Splash f={f} x={300} start={232} big={1.3} />
          <Splash f={f} x={90} start={425} big={1.1} />
          <Puffs f={t2} x={SPAWN.x} y={-300} start={345} n={6} dur={16} spread={120} />
          <Burst f={f} x={1680} y={-300} start={946} />
          <Confetti f={f} x={1680} y={-200} start={946} />
        </g>
      </>
    );
  } else {
    const night = scene === "night";
    const kid = kidPose(f), dad = dadPose(f);
    const tabletGlowPos = dad && dad.seated ? toScreen(cam, dad.x, dad.y - 300) : null;
    world = (
      <>
        <g transform={main}>
          <Room f={t2} night={night ? 1 : 0} tally={f < 480 ? 12 : f < 660 ? 47 : f < 1400 ? 96 : 140} />
          {kid?.behind && <Person k="kid" p={kid} f={t2} />}
          <Couch night={night} />
          {dad?.seated && P(dad, "dad", t2)}
          {dad?.seated && <Blanket x={dad.x} f={t2} night={night} />}
          {kid && !kid.behind && P(kid, "kid", t2)}
          {dad && !dad.seated && P(dad, "dad", t2)}
          {dad?.crack && (() => { const h = headPos("dad", dad); return <path d={`M${h.x - 40} ${h.y - 92} l18 30 l-14 22 l26 26 l-10 30`} fill="none" stroke="#fff6e8" strokeWidth={8} strokeLinejoin="round" />; })()}
          <Puffs f={t2} x={250} y={-560} start={1336} n={7} dur={40} dark />
          <Burst f={f} x={-20} y={-200} start={1252} s={0.6} />
          <Confetti f={f} x={-20} y={-230} start={1252} n={56} power={0.8} />
        </g>
        <g transform={layerTransform(cam, 1.3)}><Plant x={1250} y={260} /></g>
        {night && (
          <g>
            <defs>
              <radialGradient id="nhole" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#000" /><stop offset="0.55" stopColor="#000" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" /></radialGradient>
              <mask id="nmask"><rect x={0} y={0} width={W} height={H} fill="#fff" />{tabletGlowPos && <circle cx={tabletGlowPos.x} cy={tabletGlowPos.y} r={520 * cam.z} fill="url(#nhole)" />}</mask>
              <radialGradient id="nglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#9fe3ff" stopOpacity="0.55" /><stop offset="1" stopColor="#9fe3ff" stopOpacity="0" /></radialGradient>
            </defs>
            <rect x={0} y={0} width={W} height={H} fill="#0a0f33" opacity={0.55} mask="url(#nmask)" />
            {tabletGlowPos && <circle cx={tabletGlowPos.x} cy={tabletGlowPos.y} r={(330 + Math.sin(f / 4) * 10) * cam.z} fill="url(#nglow)" />}
          </g>
        )}
      </>
    );
  }

  const speed = (f >= J.r1[0] && f < J.r3[1]) ? 0.85 : (f >= 540 && f < 560) ? 0.5 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#8fdcff" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {world}
        <SpeedLines f={f} k={speed} />
        <Comic f={f} />
        <Chip f={f} />
        <Caption f={f} />
        <defs>
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1a0a20" stopOpacity="0.28" /></radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#vig)" />
        {flash !== undefined && <rect x={0} y={0} width={W} height={H} fill="#fff" opacity={clamp(1 - flash / 5) * 0.85} />}
      </svg>
    </AbsoluteFill>
  );
};

