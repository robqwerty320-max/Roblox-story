// Flat painted things: the floating trade window (our own UI design), the "picture of a pet" doodle, icons,
// and the cartoon effect cards (tears, sweat, dust, sparkles, flashes, coins, confetti, Wi-Fi, crayon).
import * as THREE from "three";
import { INK } from "./faces";

const TAU = Math.PI * 2;
const FONT = "Inter, 'DejaVu Sans', sans-serif";
const cache = new Map<string, THREE.CanvasTexture>();
export const tex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let t = cache.get(key);
  if (!t) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    cache.set(key, t);
  }
  return t;
};
const stroke = (g: CanvasRenderingContext2D, w: number, c = INK) => { g.lineWidth = w; g.strokeStyle = c; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); };
const fillC = (g: CanvasRenderingContext2D, c: string) => { g.fillStyle = c; g.fill(); };
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, c: string, outline = 0, align: CanvasTextAlign = "center") => {
  g.font = `900 ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = "middle";
  if (outline) { g.lineWidth = outline; g.strokeStyle = INK; g.lineJoin = "round"; g.strokeText(s, x, y); }
  g.fillStyle = c; g.fillText(s, x, y);
};

// ---------------- icons ----------------
/** side view of a box dragon (icon) */
export const dragonIcon = (g: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, wing: string, crayon = false) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  const r = (x0: number, y0: number, w: number, h: number, c: string, rot = 0) => {
    g.save(); g.translate(x0, y0); g.rotate(rot); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); fillC(g, c); stroke(g, 6); g.restore();
  };
  r(-62, 40, 70, 22, body, 0.5);                       // tail
  r(-30, 70, 22, 44, body); r(30, 70, 22, 44, body);   // legs
  r(-40, -36, 80, 70, wing, -0.5);                     // wing
  r(0, 30, 120, 70, body);                             // body
  r(64, -14, 64, 60, body);                            // head
  r(100, 0, 40, 30, body);                             // snout
  r(52, -54, 12, 30, wing, -0.3);                      // horn
  g.beginPath(); g.rect(64, -26, 14, 18); fillC(g, INK);
  if (crayon) {
    g.save(); g.globalCompositeOperation = "source-atop"; g.restore();
  }
  g.restore();
};
/** framed doodle of a pet (the "picture of a pet") */
export const doodle = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  g.save(); g.translate(x, y);
  g.beginPath(); g.rect(-w / 2, -h / 2, w, h); fillC(g, "#c98a3c"); stroke(g, w * 0.025);
  g.beginPath(); g.rect(-w / 2 + w * 0.09, -h / 2 + h * 0.11, w * 0.82, h * 0.78); fillC(g, "#fbf6e6"); stroke(g, w * 0.015);
  // wobbly kid drawing: a round cat-ish thing with stick legs
  g.lineWidth = w * 0.022; g.strokeStyle = "#2b3a8f"; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.ellipse(0, h * 0.04, w * 0.2, h * 0.17, 0.1, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(w * 0.17, -h * 0.17, w * 0.11, h * 0.11, 0, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(w * 0.1, -h * 0.25); g.lineTo(w * 0.12, -h * 0.34); g.lineTo(w * 0.17, -h * 0.27); g.lineTo(w * 0.23, -h * 0.34); g.lineTo(w * 0.25, -h * 0.24); g.stroke();
  for (const lx of [-0.12, -0.04, 0.05, 0.12]) { g.beginPath(); g.moveTo(w * lx, h * 0.18); g.lineTo(w * (lx - 0.01), h * 0.32); g.stroke(); }
  g.beginPath(); g.moveTo(-w * 0.2, 0); g.quadraticCurveTo(-w * 0.32, -h * 0.1, -w * 0.28, -h * 0.25); g.stroke();
  g.fillStyle = "#2b3a8f"; g.beginPath(); g.arc(w * 0.15, -h * 0.18, w * 0.015, 0, TAU); g.arc(w * 0.21, -h * 0.18, w * 0.015, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(w * 0.14, -h * 0.12); g.quadraticCurveTo(w * 0.18, -h * 0.09, w * 0.22, -h * 0.12); g.stroke();
  g.strokeStyle = "#e0453a"; g.lineWidth = w * 0.014;
  g.beginPath(); g.moveTo(-w * 0.33, -h * 0.3); g.lineTo(-w * 0.27, -h * 0.36); g.lineTo(-w * 0.21, -h * 0.3); g.stroke(); // tiny sun / heart scribble
  g.restore();
};
export const pictureTex = () => tex("picture", 512, 400, (g) => doodle(g, 256, 200, 500, 390));

// ---------------- trade window ----------------
export type PanelState = { give: "dragon" | "dragon2"; get: "picture" | "golden"; pressed: number; title: string; timer?: number };
const sparkle = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c = "#fff7c2") => {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); fillC(g, c); stroke(g, 4);
};
const slot = (g: CanvasRenderingContext2D, x: number, y: number, label: string, item: string) => {
  g.beginPath(); g.roundRect(x - 210, y - 200, 420, 400, 28); fillC(g, "#2c3e6b"); stroke(g, 8, "#0d1428");
  text(g, label, x, y - 160, 40, "#ffffff", 9);
  g.beginPath(); g.roundRect(x - 165, y - 118, 330, 250, 22); fillC(g, item === "golden" ? "#5a4a12" : "#3a5288"); stroke(g, 6, "#0d1428");
  if (item === "dragon" || item === "dragon2") {
    dragonIcon(g, x - 8, y + 6, 1.15, item === "dragon" ? "#7d3fd6" : "#7d3fd6", "#f2c230");
    g.beginPath(); g.roundRect(x - 130, y + 140, 260, 46, 23); fillC(g, "#ff9f1c"); stroke(g, 5);
    text(g, "LEGENDARY", x, y + 164, 30, "#ffffff", 7);
  } else if (item === "picture") {
    doodle(g, x, y + 6, 210, 170);
    g.beginPath(); g.roundRect(x - 130, y + 140, 260, 46, 23); fillC(g, "#8a8a99"); stroke(g, 5);
    text(g, "TRUST ME", x, y + 164, 30, "#ffffff", 7);
  } else {
    const gr = g.createRadialGradient(x, y, 10, x, y, 170); gr.addColorStop(0, "rgba(255,230,120,0.9)"); gr.addColorStop(1, "rgba(255,200,40,0)");
    g.fillStyle = gr; g.fillRect(x - 165, y - 118, 330, 250);
    dragonIcon(g, x - 8, y + 6, 1.15, "#ffd21f", "#ffe76a");
    sparkle(g, x - 120, y - 80, 26); sparkle(g, x + 130, y - 60, 20); sparkle(g, x + 110, y + 90, 16);
    g.beginPath(); g.roundRect(x - 150, y + 140, 300, 46, 23); fillC(g, "#e63ec8"); stroke(g, 5);
    text(g, "SUPER RARE!!", x, y + 164, 30, "#ffffff", 7);
  }
};
/** 1024 x 768 trade window; pressed 0..1 = ACCEPT pressed */
export const drawPanel = (g: CanvasRenderingContext2D, p: PanelState) => {
  g.clearRect(0, 0, 1024, 768);
  g.beginPath(); g.roundRect(12, 12, 1000, 744, 44); fillC(g, "#16203d"); stroke(g, 14, "#0a0f1e");
  g.beginPath(); g.roundRect(12, 12, 1000, 100, [44, 44, 0, 0]); fillC(g, "#2f6fe0"); stroke(g, 10, "#0a0f1e");
  text(g, p.title, 512, 64, 60, "#ffffff", 12);
  slot(g, 268, 345, "YOU GIVE", p.give);
  slot(g, 756, 345, "YOU GET", p.get);
  text(g, "⇄", 512, 345, 90, "#ffd84a", 12);
  const pr = p.pressed;
  g.beginPath(); g.roundRect(120, 590 + pr * 8, 360, 120 - pr * 8, 30); fillC(g, pr > 0.5 ? "#13a04a" : "#2bd46a"); stroke(g, 10, "#0a0f1e");
  text(g, pr > 0.5 ? "✔ DONE" : "ACCEPT", 300, 652 + pr * 6, 56, "#ffffff", 11);
  g.beginPath(); g.roundRect(544, 590, 360, 120, 30); fillC(g, "#e2453c"); stroke(g, 10, "#0a0f1e");
  text(g, "DECLINE", 724, 652, 56, "#ffffff", 11);
};
/** ACCEPT button centre in panel UV (0..1, y down) */
export const ACCEPT_UV: [number, number] = [300 / 1024, 650 / 768];

// ---------------- effect cards ----------------
export const FX = {
  drop: () => tex("fx_drop", 128, 160, (g) => {
    g.beginPath(); g.moveTo(64, 8); g.bezierCurveTo(70, 50, 116, 80, 116, 108); g.arc(64, 108, 52, 0, Math.PI); g.bezierCurveTo(12, 80, 58, 50, 64, 8);
    fillC(g, "#7cc8ff"); stroke(g, 8, "#1b4f8a");
    g.beginPath(); g.ellipse(46, 108, 10, 18, 0.3, 0, TAU); fillC(g, "rgba(255,255,255,0.85)");
  }),
  sweat: () => tex("fx_sweat", 256, 320, (g) => {
    g.beginPath(); g.moveTo(128, 10); g.bezierCurveTo(140, 90, 236, 150, 236, 210); g.arc(128, 210, 108, 0, Math.PI); g.bezierCurveTo(20, 150, 116, 90, 128, 10);
    const gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, "#b8e6ff"); gr.addColorStop(1, "#4aa6f0");
    g.fillStyle = gr; g.fill(); stroke(g, 12, "#173f75");
    g.beginPath(); g.ellipse(88, 214, 20, 40, 0.25, 0, TAU); fillC(g, "rgba(255,255,255,0.9)");
  }),
  puff: (k: number) => tex("fx_puff" + k, 256, 256, (g) => {
    let s = 11 + k * 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = "#e9ddc6"; g.strokeStyle = "#8a7660"; g.lineWidth = 8;
    const lobes = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * TAU + r(), d: 50 + r() * 20, rr: 46 + r() * 22 }));
    g.beginPath(); for (const l of lobes) { const x = 128 + Math.cos(l.a) * l.d, y = 128 + Math.sin(l.a) * l.d; g.moveTo(x + l.rr, y); g.arc(x, y, l.rr, 0, TAU); } g.stroke();
    for (const l of lobes) { g.beginPath(); g.arc(128 + Math.cos(l.a) * l.d, 128 + Math.sin(l.a) * l.d, l.rr - 4, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(128, 128, 70, 0, TAU); g.fill();
    g.fillStyle = "#fff8ea"; for (const l of lobes.slice(0, 3)) { g.beginPath(); g.arc(128 + Math.cos(l.a) * l.d * 0.8 - 10, 128 + Math.sin(l.a) * l.d * 0.8 - 14, l.rr * 0.45, 0, TAU); g.fill(); }
  }),
  spark: () => tex("fx_spark", 256, 256, (g) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? 26 : 120; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); }
    g.closePath(); fillC(g, "#ffffff"); stroke(g, 6, "#ffcf3a");
  }),
  flash: () => tex("fx_flash", 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,240,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, rr = i % 2 ? 30 : 126; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } g.closePath(); fillC(g, "rgba(255,255,255,0.95)");
  }),
  coin: () => tex("fx_coin", 160, 160, (g) => {
    g.beginPath(); g.arc(80, 80, 66, 0, TAU); fillC(g, "#ffc93c"); stroke(g, 9, "#7a4a00");
    g.beginPath(); g.arc(80, 80, 46, 0, TAU); stroke(g, 5, "#c8860a");
    text(g, "$", 80, 84, 74, "#c8860a");
  }),
  confetti: (k: number) => tex("fx_conf" + k, 64, 32, (g) => { g.fillStyle = ["#ff4d6d", "#ffd23f", "#3bceac", "#3a86ff", "#b15cff", "#ff8c42"][k % 6]; g.fillRect(0, 0, 64, 32); g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(2, 2, 60, 28); }),
  wifi: () => tex("fx_wifi", 320, 300, (g) => {
    g.beginPath(); g.roundRect(10, 10, 300, 280, 40); fillC(g, "rgba(255,255,255,0.95)"); stroke(g, 10);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(150, 230, 50 + i * 50, -Math.PI * 0.78, -Math.PI * 0.22); stroke(g, 26, i === 0 ? "#2b2b33" : "#c9c9d2"); }
    g.beginPath(); g.arc(150, 232, 18, 0, TAU); fillC(g, "#2b2b33");
    g.beginPath(); g.arc(250, 70, 40, 0, TAU); fillC(g, "#e2453c"); stroke(g, 7);
    text(g, "!", 250, 74, 60, "#ffffff");
  }),
  crayon: () => tex("fx_crayon", 128, 512, (g) => {
    g.beginPath(); g.moveTo(64, 8); g.lineTo(104, 120); g.lineTo(24, 120); g.closePath(); fillC(g, "#ffd400"); stroke(g, 8);
    g.beginPath(); g.rect(24, 120, 80, 380); fillC(g, "#ffd400"); stroke(g, 8);
    g.beginPath(); g.rect(24, 200, 80, 220); fillC(g, "#e8a800"); stroke(g, 6);
    text(g, "YELLOW", 64, 310, 22, "#ffffff", 0);
  }),
  speed: () => tex("fx_speed", 512, 256, (g) => {
    for (let i = 0; i < 9; i++) { const y = 20 + i * 27, l = 200 + ((i * 97) % 260); g.beginPath(); g.moveTo(500, y); g.lineTo(500 - l, y); stroke(g, 8, "rgba(255,255,255,0.95)"); }
  }),
  ring: () => tex("fx_ring", 256, 256, (g) => { g.beginPath(); g.arc(128, 128, 110, 0, TAU); stroke(g, 10, "rgba(255,255,255,0.9)"); }),
  bang: () => tex("fx_bang", 256, 256, (g) => {
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = i % 2 ? 70 : 124; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } g.closePath(); fillC(g, "#ffe14d"); stroke(g, 8);
  }),
  cloth: () => tex("fx_cloth", 128, 128, (g) => { g.beginPath(); g.moveTo(20, 30); g.quadraticCurveTo(64, 0, 110, 28); g.lineTo(100, 110); g.quadraticCurveTo(60, 90, 24, 112); g.closePath(); fillC(g, "#f4f1ea"); stroke(g, 7); }),
};
