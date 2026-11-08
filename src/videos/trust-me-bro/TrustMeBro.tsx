// "Trust Me Bro": a ~40 s vertical meme short. Blocky avatar-style characters (our own designs) in the bridge
// template's 3D toon world. Post chain reused from the bridge short: ink -> lens blur pre + main -> bloom -> NEUTRAL
// tone map -> grade (MSAA 4). Narration is shown as word-by-word captions timed to NARRATION (story.ts) until a
// voice track exists.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { loadKit } from "../bridge/world";
import { InkPass, noInkFallback } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { Kit } from "../bridge/build";
import { World } from "./world";
import { VIDEO_FRAMES, FPS, shotAt, dofAt, NARRATION, PHRASE_END, CUES, storyFrame, videoTime } from "./story";

export const TMB_FRAMES = VIDEO_FRAMES;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("tmb kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const fwd = new THREE.Vector3();
const Inner: React.FC<{ kit: Kit }> = ({ kit }) => {
  const f = storyFrame(useCurrentFrame()); // the picture runs in story time, remapped onto the voice
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: (() => { const g = new GradeEffect(GRADES.day, GRADE_STRENGTH.day); return g; })(),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const s = shotAt(f);
  const target = world.update(s.id, f, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, target.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = dofAt(s.id, f);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

// ---------------- captions ----------------
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const t = f / FPS;
  const cur = NARRATION.filter((w) => w.t <= t + 0.001);
  if (!cur.length) return null;
  const last = cur[cur.length - 1];
  if (t > PHRASE_END[last.phrase]) return null;
  // show the words of the current phrase, in chunks of up to 4 words
  const words = NARRATION.filter((w) => w.phrase === last.phrase);
  const idx = words.indexOf(last), c0 = Math.floor(idx / 4) * 4;
  const chunk = words.slice(c0, c0 + 4);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", top: 1430 }}>
      <div style={{ width: 960, textAlign: "center", lineHeight: 1.08 }}>
        {chunk.map((w, i) => {
          const shown = w.t <= t + 0.001;
          const age = (t - w.t) * FPS;
          const sc = shown ? (age < 2 ? 1.12 : age < 4 ? 1.05 : 1) : 1;
          return (
            <span key={i} style={{
              display: "inline-block", margin: "0 22px", fontFamily: "Inter, 'DejaVu Sans', sans-serif", fontWeight: 900, fontSize: 92,
              color: w.key ? "#ffe23a" : "#ffffff", WebkitTextStroke: "14px #0b0a0c", paintOrder: "stroke fill", letterSpacing: 1,
              textShadow: "0 7px 0 rgba(0,0,0,0.55)", opacity: shown ? 1 : 0, transform: `scale(${sc})`, transformOrigin: "50% 60%",
            }}>{w.w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TrustMeBro: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  // white pops on the ACCEPT press and the poof; a short white flash on the drum hit
  const flashAt = (c: number, a: number) => { const f0 = Math.round(videoTime(c) * FPS); return f >= f0 && f < f0 + 4 ? [a, a * 0.6, a * 0.3, a * 0.12][f - f0] : 0; };
  const flash = Math.max(flashAt(CUES.press, 0.55), flashAt(CUES.poof, 0.45), flashAt(CUES.drum, 0.5));
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <AbsoluteFill>
        <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
          gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
          camera={{ fov: 40, near: 0.1, far: 1500 }}>
          <Inner kit={kit} />
        </ThreeCanvas>
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <Captions f={f} />
    </AbsoluteFill>
  );
};
