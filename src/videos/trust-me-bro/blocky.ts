// Blocky game-avatar-STYLE characters of our own design (box head, box torso, box limbs) and box-built pets.
// Real 3D boxes with the world's two-tone shading, so the world ink pass outlines them; the face is a canvas texture
// on the head's front face (unlit, redrawn every frame from faces.ts), so expressions swap per beat.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { drawFace, Face } from "./faces";

const matCache = new Map<string, THREE.Material>();
export const col = (hex: string) => {
  let m = matCache.get(hex);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: hex })); matCache.set(hex, m); }
  return m;
};
export const texMat = (key: string, map: THREE.Texture) => {
  let m = matCache.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map })); matCache.set(key, m); }
  return m;
};
export const box = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true;
  return b;
};

export type Spec = {
  head: string; torso: string; arms: string; legs: string; shoes?: string;
  hs: number; tw: number; th: number; td: number; ll: number; lw: number; al: number; aw: number;
};
export const GARY: Spec = { head: "#f39a35", torso: "#7a46c8", arms: "#f39a35", legs: "#33507a", shoes: "#2a2a35", hs: 0.6, tw: 0.84, th: 0.8, td: 0.42, ll: 0.8, lw: 0.4, al: 0.8, aw: 0.38 };
export const SCAM: Spec = { head: "#d9a273", torso: "#1d1d26", arms: "#1d1d26", legs: "#9aa0ae", shoes: "#f2f2f2", hs: 0.6, tw: 0.86, th: 0.82, td: 0.44, ll: 0.82, lw: 0.41, al: 0.82, aw: 0.38 };
export const TIMMY: Spec = { head: "#ffcf9c", torso: "#4fb3ff", arms: "#ffcf9c", legs: "#46a84b", shoes: "#e8483f", hs: 0.74, tw: 0.5, th: 0.42, td: 0.3, ll: 0.36, lw: 0.24, al: 0.42, aw: 0.22 };

export type Pose = {
  pos: [number, number, number]; yaw: number;
  armL?: number; armR?: number;      // forward swing (rad, + = forward/up)
  armLz?: number; armRz?: number;    // sideways raise (rad, + = outward)
  legL?: number; legR?: number;
  bob?: number;                      // extra lift (m)
  lean?: number; tilt?: number;      // body lean forward / head tilt sideways
  sq?: number;                       // squash (+) / stretch (-)
  jaw?: number;                      // 0..1 jaw drop to the floor
  face: Face; visible?: boolean;
};

export class Blocky {
  root = new THREE.Group();
  body = new THREE.Group();
  head = new THREE.Group();
  armL = new THREE.Group(); armR = new THREE.Group(); legL = new THREE.Group(); legR = new THREE.Group();
  hand = new THREE.Group(); // attach point at the end of the right arm
  handL = new THREE.Group();
  extras = new THREE.Group(); // hats etc. (on the head)
  private cv: HTMLCanvasElement; private g: CanvasRenderingContext2D; private tex: THREE.CanvasTexture;
  private jawG = new THREE.Group(); private gullet: THREE.Mesh;
  private faceKey = "";
  constructor(public s: Spec) {
    this.cv = document.createElement("canvas"); this.cv.width = this.cv.height = 512;
    this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const faceM = new THREE.MeshBasicMaterial({ map: this.tex, color: new THREE.Color(1.0, 0.98, 0.95) });
    const H = col(s.head);
    const R = this.root; R.add(this.body);
    // legs (pivot at the hip)
    for (const [g, x] of [[this.legL, -s.tw / 4], [this.legR, s.tw / 4]] as const) {
      g.position.set(x * 1.0, s.ll, 0);
      g.add(box(s.lw * 0.98, s.ll, s.td * 0.95, col(s.legs), 0, -s.ll / 2, 0));
      if (s.shoes) g.add(box(s.lw * 1.02, s.ll * 0.16, s.td * 1.05, col(s.shoes), 0, -s.ll + s.ll * 0.08, 0.01));
      this.body.add(g);
    }
    this.body.add(box(s.tw, s.th, s.td, col(s.torso), 0, s.ll + s.th / 2, 0));
    // arms (pivot at the shoulder)
    for (const [g, sx] of [[this.armL, -1], [this.armR, 1]] as const) {
      g.position.set(sx * (s.tw / 2 + s.aw / 2 + 0.01), s.ll + s.th - s.aw * 0.45, 0);
      g.add(box(s.aw, s.al, s.aw, col(s.arms), 0, -s.al / 2 + s.aw * 0.45, 0));
      this.body.add(g);
    }
    this.hand.position.set(0, -s.al + s.aw * 0.35, 0); this.armR.add(this.hand);
    this.handL.position.set(0, -s.al + s.aw * 0.35, 0); this.armL.add(this.handL);
    // head: box with the face on +z
    this.head.position.set(0, s.ll + s.th + 0.01, 0);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(s.hs, s.hs, s.hs), [H, H, H, H, faceM, H]);
    hb.position.y = s.hs / 2; hb.castShadow = true; hb.receiveShadow = true;
    this.head.add(hb, this.extras);
    this.body.add(this.head);
    // jaw (hidden unless dropped): lower jaw with teeth + gullet tube
    const jawFace = new THREE.CanvasTexture((() => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 160; const g = c.getContext("2d")!;
      g.fillStyle = s.head; g.fillRect(0, 0, 512, 160);
      g.fillStyle = "#3a0f1c"; g.fillRect(48, 0, 416, 40);
      for (let i = 0; i < 6; i++) { g.fillStyle = "#fffdf4"; g.fillRect(70 + i * 62, 40 - 30, 56, 30); g.strokeStyle = "#241726"; g.lineWidth = 5; g.strokeRect(70 + i * 62, 10, 56, 30); }
      g.fillStyle = "#e2556d"; g.beginPath(); g.ellipse(256, 6, 120, 30, 0, 0, Math.PI); g.fill();
      return c;
    })());
    jawFace.colorSpace = THREE.SRGBColorSpace;
    const jm = new THREE.MeshBasicMaterial({ map: jawFace, color: new THREE.Color(1.0, 0.98, 0.95) });
    const jb = new THREE.Mesh(new THREE.BoxGeometry(s.hs * 0.98, s.hs * 0.3, s.hs * 0.9), [H, H, H, H, jm, H]);
    jb.castShadow = true;
    this.jawG.add(jb);
    this.gullet = new THREE.Mesh(new THREE.BoxGeometry(s.hs * 0.62, 1, s.hs * 0.5), col("#3a0f1c"));
    this.root.add(this.jawG, this.gullet);
    this.jawG.visible = this.gullet.visible = false;
  }

  pose(p: Pose) {
    const s = this.s;
    this.root.visible = p.visible !== false;
    if (!this.root.visible) return;
    this.root.position.set(p.pos[0], p.pos[1] + (p.bob ?? 0), p.pos[2]);
    this.root.rotation.set(0, p.yaw, 0);
    const sq = p.sq ?? 0;
    this.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    this.body.rotation.set(p.lean ?? 0, 0, 0);
    this.armL.rotation.set(-(p.armL ?? 0), 0, -(p.armLz ?? 0));
    this.armR.rotation.set(-(p.armR ?? 0), 0, p.armRz ?? 0);
    this.legL.rotation.set(-(p.legL ?? 0), 0, 0);
    this.legR.rotation.set(-(p.legR ?? 0), 0, 0);
    this.head.rotation.set(0, 0, p.tilt ?? 0);
    // face redraw only when it changes
    const key = JSON.stringify(p.face);
    if (key !== this.faceKey) { drawFace(this.g, s.head, p.face); this.tex.needsUpdate = true; this.faceKey = key; }
    const j = p.jaw ?? 0;
    this.jawG.visible = this.gullet.visible = j > 0.01;
    if (j > 0.01) {
      const top = s.ll + s.th + 0.01 + s.hs * 0.12, bottom = top - j * (top - s.hs * 0.15);
      this.jawG.position.set(0, bottom, s.td / 2 + s.hs * 0.5);
      const len = Math.max(0.02, top - bottom);
      this.gullet.position.set(0, bottom + len / 2, s.td / 2 + s.hs * 0.42); this.gullet.scale.set(1, len, 1);
    }
  }
}

// ---------------- pets (box creatures) ----------------
export type PetKind = "dragon" | "cat" | "dog" | "bunny" | "unicorn" | "frog" | "pig" | "bear" | "duck";
const eyeM = () => col("#141018");
export const pet = (kind: PetKind, c: string, opts: { map?: THREE.Material; accent?: string; s?: number } = {}) => {
  const g = new THREE.Group(), M = opts.map ?? col(c), A = opts.accent ? col(opts.accent) : M;
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = M, rx = 0, rz = 0) => {
    const b = box(w, h, d, m, x, y, z); b.rotation.set(rx, 0, rz); g.add(b); return b;
  };
  const eyes = (x: number, y: number, z: number, r = 0.07) => { add(r, r * 1.3, 0.03, -x, y, z, eyeM()); add(r, r * 1.3, 0.03, x, y, z, eyeM()); add(r * 0.35, r * 0.35, 0.02, -x - r * 0.18, y + r * 0.3, z + 0.02, col("#ffffff")); add(r * 0.35, r * 0.35, 0.02, x - r * 0.18, y + r * 0.3, z + 0.02, col("#ffffff")); };
  const legs4 = (w: number, h: number, sx: number, sz: number) => { for (const x of [-sx, sx]) for (const z of [-sz, sz]) add(w, h, w, x, h / 2, z); };
  switch (kind) {
    case "dragon": {
      legs4(0.16, 0.26, 0.2, 0.22);
      add(0.56, 0.42, 0.78, 0, 0.47, 0);                              // body
      add(0.4, 0.38, 0.4, 0, 0.86, 0.38);                             // head
      add(0.28, 0.18, 0.24, 0, 0.78, 0.66);                           // snout
      add(0.06, 0.04, 0.03, -0.07, 0.83, 0.79, eyeM()); add(0.06, 0.04, 0.03, 0.07, 0.83, 0.79, eyeM()); // nostrils
      eyes(0.11, 0.95, 0.585, 0.08);
      add(0.07, 0.2, 0.07, -0.13, 1.12, 0.32, A, -0.4); add(0.07, 0.2, 0.07, 0.13, 1.12, 0.32, A, -0.4); // horns
      for (let i = 0; i < 4; i++) add(0.08, 0.12, 0.1, 0, 0.72, 0.25 - i * 0.2, A);   // back spikes
      add(0.2, 0.18, 0.5, 0, 0.42, -0.6, M, 0.35); add(0.12, 0.12, 0.34, 0, 0.3, -0.96, M, 0.5); // tail
      const w1 = add(0.7, 0.05, 0.42, -0.6, 0.78, 0.0, A, 0, 0.45); const w2 = add(0.7, 0.05, 0.42, 0.6, 0.78, 0.0, A, 0, -0.45);
      w1.name = "wingL"; w2.name = "wingR";
      break;
    }
    case "cat": case "dog": case "bear": case "pig": {
      legs4(0.13, 0.24, 0.16, 0.18);
      add(0.46, 0.34, 0.6, 0, 0.4, 0);
      add(0.42, 0.38, 0.36, 0, 0.74, 0.3);
      eyes(0.1, 0.78, 0.485, 0.075);
      if (kind === "cat") { add(0.1, 0.14, 0.06, -0.13, 0.98, 0.3, A); add(0.1, 0.14, 0.06, 0.13, 0.98, 0.3, A); add(0.07, 0.36, 0.07, 0, 0.62, -0.38, M, -0.5); }
      if (kind === "dog") { add(0.1, 0.22, 0.08, -0.24, 0.76, 0.3, A); add(0.1, 0.22, 0.08, 0.24, 0.76, 0.3, A); add(0.2, 0.14, 0.12, 0, 0.66, 0.52, A); add(0.06, 0.2, 0.06, 0, 0.6, -0.36, M, -0.7); }
      if (kind === "bear") { add(0.12, 0.12, 0.06, -0.15, 0.96, 0.3, A); add(0.12, 0.12, 0.06, 0.15, 0.96, 0.3, A); add(0.18, 0.12, 0.1, 0, 0.66, 0.52, A); }
      if (kind === "pig") { add(0.18, 0.12, 0.08, 0, 0.7, 0.5, A); add(0.1, 0.08, 0.05, -0.13, 0.96, 0.3, A); add(0.1, 0.08, 0.05, 0.13, 0.96, 0.3, A); }
      break;
    }
    case "bunny": {
      add(0.4, 0.36, 0.42, 0, 0.18 + 0.02, 0);
      add(0.36, 0.32, 0.32, 0, 0.52, 0.12);
      eyes(0.09, 0.56, 0.285, 0.07);
      add(0.08, 0.34, 0.05, -0.08, 0.84, 0.1, A); add(0.08, 0.34, 0.05, 0.08, 0.84, 0.1, A);
      add(0.12, 0.12, 0.1, 0, 0.22, -0.24, col("#ffffff"));
      break;
    }
    case "unicorn": {
      legs4(0.12, 0.34, 0.15, 0.22);
      add(0.42, 0.34, 0.7, 0, 0.5, 0);
      add(0.28, 0.5, 0.28, 0, 0.84, 0.32, M, 0.3);
      add(0.28, 0.24, 0.4, 0, 1.06, 0.48);
      eyes(0.1, 1.12, 0.685, 0.06);
      add(0.06, 0.3, 0.06, 0, 1.3, 0.56, col("#ffd34d"), 0.4);
      add(0.08, 0.5, 0.2, 0, 0.92, 0.18, A, 0.3);
      add(0.08, 0.36, 0.1, 0, 0.5, -0.42, A, -0.4);
      break;
    }
    case "frog": {
      add(0.5, 0.3, 0.46, 0, 0.17, 0);
      add(0.16, 0.16, 0.16, -0.15, 0.38, 0.12); add(0.16, 0.16, 0.16, 0.15, 0.38, 0.12);
      eyes(0.15, 0.39, 0.205, 0.08);
      add(0.3, 0.03, 0.03, 0, 0.12, 0.235, col("#7a1a2a"));
      break;
    }
    case "duck": {
      add(0.36, 0.34, 0.44, 0, 0.27, 0);
      add(0.28, 0.28, 0.26, 0, 0.58, 0.12);
      add(0.18, 0.06, 0.16, 0, 0.53, 0.32, col("#f59a2a"));
      eyes(0.08, 0.63, 0.255, 0.06);
      add(0.08, 0.1, 0.12, 0, 0.1, 0.0, col("#f59a2a"));
      break;
    }
  }
  if (opts.s) g.scale.setScalar(opts.s);
  return g;
};

/** crayon job: a green dragon scribbled over with yellow crayon (zigzag strokes, gaps, outside the lines) */
export const crayonTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#4caf50"; g.fillRect(0, 0, 256, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.lineCap = "round"; g.lineJoin = "round";
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = k === 2 ? "rgba(255,236,80,0.9)" : "rgba(255,214,0,0.92)"; g.lineWidth = 11 - k * 2;
    g.beginPath(); let x = -10, y = 10 + r() * 30; g.moveTo(x, y);
    while (y < 270) { x = x < 128 ? 250 + r() * 20 : -10 - r() * 20; y += 9 + r() * 10; g.lineTo(x, y + (r() - 0.5) * 12); }
    g.stroke();
  }
  for (let i = 0; i < 16; i++) { g.fillStyle = "rgba(76,175,80,0.9)"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 14, 4 + r() * 6, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
