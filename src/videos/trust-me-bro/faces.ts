// Exaggerated cartoon face library, painted on the 512x512 front face of a box head (Canvas2D, redrawn per frame).
// All faces are our own drawings: bead eyes, hypno spirals, dollar eyes, tear-squeezed eyes, pinpoint pupils, sliding
// sunglasses, twitching eye, empty stare, innocent giant eyes. The head colour fills the canvas first.
export const INK = "#241726";
export type FaceKind =
  | "bead" | "proud" | "hypno" | "worried" | "jaw" | "cry" | "empty"
  | "grin" | "talk" | "dollar" | "twitch" | "scamEmpty"
  | "innocent";
export type Face = {
  kind: FaceKind;
  t?: number;      // seconds (animation phase)
  blink?: number;  // 0 open .. 1 shut
  open?: number;   // talking mouth 0..1
  glasses?: number; // ScamLord: 0 = glasses on the eyes, 1 = slid to the tip of the nose / off
  look?: number;   // pupils sideways -1..1
};

const S = 512;
const TAU = Math.PI * 2;

const fill = (g: CanvasRenderingContext2D, c: string) => { g.fillStyle = c; g.fill(); };
const line = (g: CanvasRenderingContext2D, w: number, c = INK) => { g.lineWidth = w; g.strokeStyle = c; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
const ell = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };

const EX = [168, 344], EY = 220;

const lid = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, k: number, skin: string) => {
  if (k <= 0.02) return;
  g.save(); ell(g, x, y, rx + 3, ry + 3); g.clip();
  g.fillStyle = skin; g.fillRect(x - rx - 6, y - ry - 6, 2 * rx + 12, (2 * ry + 12) * k);
  g.beginPath(); g.moveTo(x - rx - 6, y - ry - 6 + (2 * ry + 12) * k); g.lineTo(x + rx + 6, y - ry - 6 + (2 * ry + 12) * k); line(g, 10);
  g.restore();
};
const whiteEye = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, pr: number, look = 0, skin = "#fff", blink = 0, shine = true) => {
  ell(g, x, y, rx, ry); fill(g, "#ffffff"); line(g, 11);
  const px = x + look * rx * 0.35, py = y + ry * 0.08;
  ell(g, px, py, pr, pr * 1.05); fill(g, INK);
  if (shine && pr > 14) { ell(g, px - pr * 0.35, py - pr * 0.38, pr * 0.32, pr * 0.32); fill(g, "#ffffff"); ell(g, px + pr * 0.35, py + pr * 0.35, pr * 0.14, pr * 0.14); fill(g, "#ffffff"); }
  lid(g, x, y, rx, ry, blink, skin);
};
const brow = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w = 14) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); line(g, w); };
const spiral = (g: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number, dir: number) => {
  ell(g, x, y, r, r); fill(g, "#ffffff"); line(g, 10);
  g.save(); ell(g, x, y, r - 4, r - 4); g.clip();
  g.beginPath();
  for (let i = 0; i <= 160; i++) {
    const u = i / 160, a = dir * (u * 4.2 * TAU) + ph, rr = u * r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.lineWidth = 12; g.strokeStyle = "#7b2cbf"; g.lineCap = "round"; g.stroke();
  g.restore();
};
const smileMouth = (g: CanvasRenderingContext2D, w: number, y: number, depth: number, open = false) => {
  g.beginPath(); g.moveTo(S / 2 - w, y); g.quadraticCurveTo(S / 2, y + depth * 2, S / 2 + w, y);
  if (open) { g.quadraticCurveTo(S / 2, y + depth * 0.6, S / 2 - w, y); g.closePath(); fill(g, "#5a1a2a"); }
  line(g, 13);
};
const teeth = (g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, gold: number) => {
  const n = 6, w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    g.beginPath(); g.rect(x0 + i * w, y0, w, y1 - y0);
    fill(g, i === gold ? "#ffc93c" : "#fffdf4"); line(g, 5);
  }
};
const glassesAt = (g: CanvasRenderingContext2D, y: number, tilt = 0) => {
  g.save(); g.translate(S / 2, y); g.rotate(tilt);
  for (const s of [-1, 1]) {
    g.beginPath(); g.roundRect(s * 92 - 78, -46, 156, 92, [18, 18, 44, 44]); fill(g, "#111018"); line(g, 9);
    g.beginPath(); g.moveTo(s * 92 - 50, -26); g.lineTo(s * 92 - 22, -36); g.lineWidth = 9; g.strokeStyle = "rgba(255,255,255,0.75)"; g.stroke();
    g.beginPath(); g.moveTo(s * 92 - 54, -6); g.lineTo(s * 92 - 40, -12); g.lineWidth = 6; g.stroke();
  }
  g.beginPath(); g.moveTo(-16, -18); g.quadraticCurveTo(0, -30, 16, -18); line(g, 12, "#111018");
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 170, -30); g.lineTo(s * 256, -40); line(g, 12, "#111018"); }
  g.restore();
};
const dollarEye = (g: CanvasRenderingContext2D, x: number, y: number, t: number) => {
  const s = 1 + 0.08 * Math.sin(t * 18);
  ell(g, x, y, 74 * s, 70 * s); fill(g, "#ffffff"); line(g, 11);
  g.save(); g.translate(x, y + 4); g.scale(s, s);
  g.font = "900 128px Inter, 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = INK; g.strokeText("$", 0, 4); g.fillStyle = "#1fae4b"; g.fillText("$", 0, 4);
  g.restore();
};

/** paint face f onto g (head colour skin) */
export const drawFace = (g: CanvasRenderingContext2D, skin: string, f: Face) => {
  const t = f.t ?? 0, bl = f.blink ?? 0, look = f.look ?? 0;
  g.clearRect(0, 0, S, S);
  g.fillStyle = skin; g.fillRect(0, 0, S, S);
  switch (f.kind) {
    case "bead": case "proud": {
      for (const x of EX) { ell(g, x + look * 10, EY + 6, 20, 20 * (1 - 0.9 * bl)); fill(g, INK); }
      if (f.kind === "proud") {
        brow(g, 120, 160, 205, 150, 13); brow(g, 307, 150, 392, 160, 13);
        smileMouth(g, 120, 330, 52, true);
        g.beginPath(); g.moveTo(S / 2 - 98, 344); g.quadraticCurveTo(S / 2, 384, S / 2 + 98, 344); line(g, 4, "#fffdf4");
      } else { ell(g, S / 2, 352, 34, 22 + 10 * (f.open ?? 0)); fill(g, "#5a1a2a"); line(g, 11); }
      break;
    }
    case "hypno": {
      spiral(g, EX[0], EY, 82, t * 9, 1); spiral(g, EX[1], EY, 82, t * 9 + 1, -1);
      g.beginPath(); g.moveTo(170, 360);
      for (let i = 0; i <= 12; i++) g.lineTo(170 + i * 14.5, 360 + Math.sin(i * 1.4 + t * 8) * 12 + 18);
      line(g, 12);
      ell(g, 330, 400, 18, 30); fill(g, "#8fd4ff"); line(g, 6); // drool
      break;
    }
    case "worried": {
      for (const x of EX) whiteEye(g, x, EY + 4, 52, 60, 12, 0.6 * Math.sin(t * 20), skin, bl, false);
      brow(g, 105, 150, 200, 122, 15); brow(g, 312, 122, 407, 150, 15);
      g.beginPath(); g.moveTo(160, 380);
      for (let i = 0; i <= 16; i++) g.lineTo(160 + i * 12, 380 + (i % 2 ? -14 : 14));
      line(g, 11);
      break;
    }
    case "jaw": {
      for (const x of EX) whiteEye(g, x, EY - 4, 78, 92, 7, 0, skin, 0, false);
      brow(g, 100, 92, 210, 70, 14); brow(g, 302, 70, 412, 92, 14);
      g.beginPath(); g.rect(110, 400, 292, 112); fill(g, "#3a0f1c");
      g.beginPath(); g.moveTo(110, 400); g.lineTo(402, 400); line(g, 10);
      teeth(g, 140, 372, 400, 438, -1);
      break;
    }
    case "cry": {
      for (const [x, s] of [[EX[0], 1], [EX[1], -1]] as const) {
        g.beginPath(); g.moveTo(x - 58, EY - 12 * s * 0 - 10); g.lineTo(x + 8 * s, EY + 6); g.lineTo(x - 58 * 0 + (s > 0 ? -52 : 52), EY + 34);
        g.beginPath(); g.moveTo(x - 60, EY - 14); g.quadraticCurveTo(x, EY + 30, x + 60, EY - 14); line(g, 16);
        ell(g, x, EY + 30, 50, 14); fill(g, "rgba(140,210,255,0.95)"); line(g, 6);
      }
      brow(g, 105, 140, 205, 118, 15); brow(g, 307, 118, 407, 140, 15);
      // trapezoid wailing mouth, wobbling
      const w = 3 * Math.sin(t * 30);
      g.beginPath(); g.moveTo(196 + w, 316); g.lineTo(316 - w, 316); g.lineTo(366, 448); g.lineTo(146, 448); g.closePath(); fill(g, "#4a1222"); line(g, 13);
      ell(g, S / 2, 436, 72, 22); fill(g, "#e2556d");
      g.beginPath(); g.moveTo(196 + w, 316); g.lineTo(316 - w, 316); g.lineTo(366, 448); g.lineTo(146, 448); g.closePath(); line(g, 13);
      teeth(g, 204, 308, 316, 340, -1);
      break;
    }
    case "empty": {
      for (const x of EX) { ell(g, x, EY + 6, 46, 30); fill(g, "#ffffff"); line(g, 9); ell(g, x, EY + 12, 6, 6); fill(g, INK); }
      for (const x of EX) { g.beginPath(); g.rect(x - 52, EY - 34, 104, 34); fill(g, skin); g.beginPath(); g.moveTo(x - 50, EY + 2); g.lineTo(x + 50, EY + 2); line(g, 12); }
      g.beginPath(); g.moveTo(200, 360); g.lineTo(312, 360); line(g, 12);
      break;
    }
    case "grin": case "talk": case "dollar": case "twitch": case "scamEmpty": {
      // ScamLord: thick brows, chin stubble dots, gold tooth
      const gl = f.glasses ?? 0;
      if (f.kind === "dollar") {
        for (const x of EX) dollarEye(g, x, EY + 10, t);
        glassesAt(g, 60, -0.05); // pushed up on the forehead
      } else if (f.kind === "twitch" || f.kind === "scamEmpty" || gl > 0.05) {
        // eyes visible above the sliding glasses
        const tw = f.kind === "twitch" ? (Math.sin(t * 47) > 0.2 ? 1 : 0) : 0;
        whiteEye(g, EX[0], EY - 6, 58, 54, 9, 0, skin, f.kind === "scamEmpty" ? 0.45 : 0.1, false);
        whiteEye(g, EX[1], EY - 6 - tw * 8, 58 + tw * 8, 54 - tw * 22, 9, 0, skin, f.kind === "scamEmpty" ? 0.45 : 0.15 + 0.5 * tw, false);
        if (f.kind === "twitch") { brow(g, 300, 128 - tw * 18, 400, 148 + tw * 6, 16); brow(g, 112, 148, 212, 140, 16); }
        else { brow(g, 112, 140, 212, 140, 16); brow(g, 300, 140, 400, 140, 16); }
        if (f.kind !== "scamEmpty") glassesAt(g, EY + 10 + gl * 110, 0.12 * gl);
      } else {
        glassesAt(g, EY + 4, 0);
        brow(g, 98, 140, 200, 150, 17); brow(g, 312, 150, 414, 140, 17);
      }
      // mouth
      if (f.kind === "talk") {
        const o = f.open ?? 0;
        g.beginPath(); g.moveTo(160, 352); g.quadraticCurveTo(S / 2, 372 + o * 70, 360, 352); g.quadraticCurveTo(S / 2, 330, 160, 352); fill(g, "#4a1222"); line(g, 12);
        teeth(g, 196, 316, 340, 362, 3);
      } else if (f.kind === "scamEmpty" || f.kind === "twitch") {
        g.beginPath(); g.moveTo(190, 372); g.quadraticCurveTo(255, f.kind === "twitch" ? 352 : 372, 322, 380); line(g, 12);
      } else {
        g.beginPath(); g.moveTo(130, 330); g.quadraticCurveTo(S / 2, 470, 382, 330); g.quadraticCurveTo(S / 2, 356, 130, 330); fill(g, "#4a1222"); line(g, 12);
        g.save(); g.beginPath(); g.moveTo(130, 330); g.quadraticCurveTo(S / 2, 470, 382, 330); g.quadraticCurveTo(S / 2, 356, 130, 330); g.clip();
        teeth(g, 150, 362, 330, 384, 4); g.restore();
        g.beginPath(); g.moveTo(130, 330); g.quadraticCurveTo(S / 2, 470, 382, 330); line(g, 12);
      }
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI, r = 150 + (i % 3) * 14; ell(g, S / 2 + Math.cos(a) * r * 1.1, 330 + Math.sin(a) * r * 0.85, 4, 4); fill(g, "rgba(60,40,40,0.45)"); }
      break;
    }
    case "innocent": {
      for (const x of EX) {
        ell(g, x, EY + 10, 92, 108); fill(g, "#ffffff"); line(g, 10);
        const px = x + look * 18;
        ell(g, px, EY + 22, 70, 82); fill(g, "#3a2a6a");
        ell(g, px, EY + 30, 44, 54); fill(g, INK);
        ell(g, px - 26, EY - 12, 24, 26); fill(g, "#ffffff");
        ell(g, px + 28, EY + 60, 11, 11); fill(g, "#ffffff");
        ell(g, px + 34, EY - 20, 8, 8); fill(g, "#ffffff");
        lid(g, x, EY + 10, 92, 108, bl, skin);
      }
      g.beginPath(); g.moveTo(222, 382); g.quadraticCurveTo(239, 400, 256, 384); g.quadraticCurveTo(273, 400, 290, 382); line(g, 10);
      ell(g, 112, 370, 30, 16); fill(g, "rgba(255,120,140,0.35)"); ell(g, 400, 370, 30, 16); fill(g, "rgba(255,120,140,0.35)");
      break;
    }
  }
};
