import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { TrustMeBro, TMB_FRAMES } from "./videos/trust-me-bro/TrustMeBro";
import { ItsJustOrange, IJO_FRAMES } from "./videos/its-just-orange/ItsJustOrange";
import { DadObby, DADOBBY_FRAMES } from "./videos/dad-obby/DadObby";
import { LieBigger, LIE_FRAMES } from "./videos/lie-bigger/LieBigger";

// Register new shorts next to BridgeShort (see .claude/skills/cartoon-3d-short/SKILL.md, step 4).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TrustMeBro" component={TrustMeBro} durationInFrames={TMB_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ItsJustOrange" component={ItsJustOrange} durationInFrames={IJO_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DadObby" component={DadObby} durationInFrames={DADOBBY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LieBigger" component={LieBigger} durationInFrames={LIE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
