// The trading lobby as one three.js scene: sky + clouds (bridge look), a tiled plaza with a fountain, Kenney market
// stalls, trees and painted houses around it (bridge build helpers), a red carpet, the floating trade window, the
// flood, the pet mountain with its throne, three blocky avatars and the effect cards. update(id, f, cam) poses
// everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, prop, house } from "../bridge/build";
import { ctex, cloudHD, grassHD, stoneHD, jit } from "../bridge/paint";
import { LIGHTS, LOOK } from "../bridge/lights";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Blocky, GARY, SCAM, TIMMY, Pose, pet, PetKind, box, col, texMat, crayonTex } from "./blocky";
import { Face } from "./faces";
import { FX, drawPanel, PanelState, ACCEPT_UV, pictureTex } from "./ui";
import {
  FPS, SHOTS, ShotDef, camAt, V3, CUES, FOUNT, GARY0, SCAM0, PANEL1, SCAM7, TIMMY7, PANEL2, PILE, PILE_H,
  clamp01, smooth, glide, easeOut, lerp, lerp3, scamWalkX, timmyWalk,
} from "./story";

const PLAZA_C: V3 = [3, 0, -5];
const SUN = { az: 140, el: 50 };
const PANEL_W = 2.1, PANEL_H = 1.575;

// ---------------- effect cards ----------------
type Card = { map: THREE.Texture; p: V3; w: number; h?: number; rot?: number; op?: number };
class CardPool {
  private list: THREE.Mesh[] = [];
  constructor(private root: THREE.Object3D) {}
  show(cards: Card[], q: THREE.Quaternion) {
    cards.forEach((c, i) => {
      let m = this.list[i];
      if (!m) {
        m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false }));
        m.layers.set(NOINK); m.renderOrder = 10; this.list.push(m); this.root.add(m);
      }
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.map !== c.map) { mat.map = c.map; mat.needsUpdate = true; }
      mat.opacity = c.op ?? 1;
      m.visible = true; m.position.set(...c.p); m.quaternion.copy(q); m.rotateZ(c.rot ?? 0);
      const img = c.map.image as { width: number; height: number };
      m.scale.set(c.w, c.h ?? (c.w * img.height) / img.width, 1);
    });
    for (let i = cards.length; i < this.list.length; i++) this.list[i].visible = false;
  }
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** 4-frame blinks every 0.6-2.3 s (seeded per character) */
const blinkAt = (fs: number, seed: number) => {
  const f = Math.floor(fs);
  let t0 = Math.floor(hash(seed) * 30);
  for (let k = 0; t0 <= f + 4 && k < 200; k++) {
    const d = f - t0;
    if (d >= 0 && d < 4) return [0.5, 1, 1, 0.5][d];
    t0 += 18 + Math.floor(hash(seed * 7 + k) * 50);
  }
  return 0;
};
const walk = (f: number, rate = 0.42, amp = 0.55) => {
  const ph = f * rate;
  return { legL: Math.sin(ph) * amp, legR: -Math.sin(ph) * amp, armL: -Math.sin(ph) * amp * 0.8, armR: Math.sin(ph) * amp * 0.8, bob: Math.abs(Math.cos(ph)) * 0.06 };
};
const pop = (f: number, f0: number, n = 8) => { const u = clamp01((f - f0) / n); return u <= 0 ? 0 : u >= 1 ? 1 : 1 + 0.25 * Math.sin(u * Math.PI) * (1 - u) + (easeOut(u) - 1); };

export class World {
  root = new THREE.Group();
  private gary = new Blocky(GARY); private scam = new Blocky(SCAM); private timmy = new Blocky(TIMMY);
  private cards: CardPool;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#b8d0ec", 30, 320);
  private clouds: THREE.Mesh[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private carpet = new THREE.Group();
  private panel = new THREE.Group(); private panelCv: HTMLCanvasElement; private panelTex: THREE.CanvasTexture; private panelKey = "";
  private picture = new THREE.Group();
  private bigArm = new THREE.Group();
  private dragon: THREE.Group; private crayonDragon: THREE.Group;
  private flood: THREE.Mesh;
  private pile = new THREE.Group(); private pilePets: { o: THREE.Object3D; y: number; ph: number }[] = [];
  private crownT = new THREE.Group(); private crownG = new THREE.Group();

  constructor(kit: Kit) {
    const R = this.root;
    this.cards = new CardPool(R);
    // ---- sky (5 stops by elevation, tone-map inverted) + clouds ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    const K = LOOK.day, su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d)); su.e.value.set(e[1], e[2], e[3], e[4]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.4, d = 520 + (i % 3) * 70, w = 120 + (i % 4) * 35;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 90 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);

    // ---- ground: grass, tiled plaza, fountain ----
    const b = new Batch();
    const grassM = lam("tmb_grass", () => ({ map: grassHD() }));
    const g0 = new THREE.PlaneGeometry(1600, 1600); g0.rotateX(-Math.PI / 2);
    const uv = g0.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 400, uv.getY(i) * 400);
    b.add(g0, grassM, new THREE.Matrix4().makeTranslation(0, -0.01, 0));
    const tiles = ctex("tmb_tiles", 1024, 1024, (g, r) => {
      g.fillStyle = "#8c7f73"; g.fillRect(0, 0, 1024, 1024);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const c = (x + y) % 2 ? "#e9dcc4" : "#d9c6a8";
        g.fillStyle = jit(r, c, 0.04, 3, 0.1); g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120);
        g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x * 128 + 8, y * 128 + 8, 112, 10);
      }
    });
    const plazaM = lam("tmb_plaza", () => ({ map: tiles }));
    const pc = new THREE.CircleGeometry(26, 96); pc.rotateX(-Math.PI / 2);
    const puv = pc.attributes.uv as THREE.BufferAttribute, ppos = pc.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < puv.count; i++) puv.setXY(i, ppos.getX(i) / 8, ppos.getZ(i) / 8);
    b.add(pc, plazaM, new THREE.Matrix4().makeTranslation(PLAZA_C[0], 0.005, PLAZA_C[2]));
    const curb = new THREE.RingGeometry(26, 26.6, 96); curb.rotateX(-Math.PI / 2);
    b.add(curb, col("#b9a58a"), new THREE.Matrix4().makeTranslation(PLAZA_C[0], 0.012, PLAZA_C[2]));
    // fountain: octagonal stone basin, water, pillar, upper bowl
    const stoneM = lam("tmb_stone", () => ({ map: stoneHD("tmbStone", ["#e2d6c4", "#d6c8b4", "#eadfcf", "#cdbfab"], "#a39584") }));
    const waterM = twoTone(new THREE.MeshLambertMaterial({ color: "#4fb6e8" }), 0.3);
    const cyl = (r0: number, r1: number, h: number, y: number, m: THREE.Material, n = 8) => { const c = new THREE.CylinderGeometry(r1, r0, h, n); b.add(c, m, new THREE.Matrix4().makeTranslation(FOUNT[0], y + h / 2, FOUNT[2])); };
    cyl(2.5, 2.5, 0.6, 0, stoneM); cyl(2.25, 2.25, 0.02, 0.5, waterM, 24);
    cyl(0.45, 0.35, 1.7, 0.5, stoneM); cyl(0.5, 1.15, 0.3, 2.1, stoneM); cyl(0.95, 0.95, 0.02, 2.36, waterM, 24); cyl(0.12, 0.22, 0.55, 2.35, stoneM);
    // ---- market stalls, lanterns, trees, flowers ----
    const ring = (n: number, rad: number, a0: number, fn: (x: number, z: number, yaw: number, i: number) => void) => {
      for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; fn(PLAZA_C[0] + Math.cos(a) * rad, PLAZA_C[2] + Math.sin(a) * rad, -a - Math.PI / 2, i); }
    };
    ring(12, 15.5, 0.13, (x, z, yaw, i) => { if (Math.hypot(x - PILE[0], z - PILE[2]) > 6 && z < 4) prop(b, kit, i % 2 ? "stall-red" : "stall-green", x, 0, z, 2.6, yaw); });
    ring(16, 12, 0.4, (x, z, yaw, i) => { if (Math.hypot(x - PILE[0], z - PILE[2]) > 6 && z < 2.5) prop(b, kit, "lantern", x, 0, z, 2.3, yaw); });
    ring(14, 21, 0.25, (x, z, yaw, i) => { if (Math.hypot(x - PILE[0], z - PILE[2]) > 6) prop(b, kit, i % 3 ? "banner-red" : "banner-green", x, 0, z, 3.2, yaw); });
    ring(22, 29, 0.05, (x, z, yaw, i) => prop(b, kit, ["tree_oak", "tree_fat", "tree_default", "tree_detailed"][i % 4], x, 0, z, 5 + (i % 3), yaw));
    ring(30, 26.8, 0.2, (x, z, yaw, i) => prop(b, kit, ["plant_bushLarge", "flower_redA", "plant_bush", "flower_yellowA", "flower_purpleA"][i % 5], x, 0, z, 0.9, yaw));
    // ---- town ring (painted bridge-style houses) ----
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2, rad = 38 + (i % 3) * 3;
      const x = PLAZA_C[0] + Math.cos(a) * rad, z = PLAZA_C[2] + Math.sin(a) * rad;
      house(b, x, z, -a - Math.PI / 2, 7 + (i % 3), 7, [7, 8.4, 9.8][i % 3], i, 0);
    }
    for (let i = 0; i < 14; i++) { // far hills
      const a = (i / 14) * Math.PI * 2, rad = 160 + (i % 3) * 40, s = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      b.add(s, lam("tmb_hill", () => ({ color: "#6fae55" })), new THREE.Matrix4().compose(V(Math.cos(a) * rad, -2, Math.sin(a) * rad), new THREE.Quaternion(), V(60 + (i % 4) * 20, 22 + (i % 3) * 10, 50)));
    }
    b.build(R);

    // ---- red carpet (shot 2) ----
    this.carpet.add(box(10, 0.03, 1.5, col("#c4172c"), 2.6, 0.02, 0), box(10, 0.035, 0.08, col("#f2c230"), 2.6, 0.02, 0.72), box(10, 0.035, 0.08, col("#f2c230"), 2.6, 0.02, -0.72));
    for (const x of [-1, 1.5, 4, 6.5]) for (const z of [-1.05, 1.05]) {
      this.carpet.add(box(0.1, 1.0, 0.1, col("#d9a92b"), x, 0.5, z), box(0.2, 0.06, 0.2, col("#d9a92b"), x, 0.03, z));
      if (x < 6.5) { const rope = box(2.5, 0.07, 0.07, col("#8b1020"), x + 1.25, 0.82, z); this.carpet.add(rope); }
    }
    R.add(this.carpet);

    // ---- trade window: thin box, painted front (unlit) ----
    this.panelCv = document.createElement("canvas"); this.panelCv.width = 1024; this.panelCv.height = 768;
    this.panelTex = new THREE.CanvasTexture(this.panelCv); this.panelTex.colorSpace = THREE.SRGBColorSpace; this.panelTex.anisotropy = 8;
    const pf = new THREE.MeshBasicMaterial({ map: this.panelTex, color: new THREE.Color(1.02, 1.02, 1.02) }), pb = col("#16203d");
    const pm = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W, PANEL_H, 0.06), [pb, pb, pb, pb, pf, pb]);
    this.panel.add(pm); R.add(this.panel);

    // ---- props ----
    const picM = new THREE.MeshBasicMaterial({ map: pictureTex(), color: new THREE.Color(0.98, 0.96, 0.92) }), frM = col("#a8672b");
    this.picture.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.04), [frM, frM, frM, frM, picM, frM]));
    this.picture.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
    R.add(this.picture);
    // the big arm for the ACCEPT insert: Gary's orange box arm with one finger
    const armBox = box(0.34, 0.34, 1.4, col(GARY.arms), 0, 0, -0.85);
    this.bigArm.add(armBox, box(0.09, 0.09, 0.2, col(GARY.arms), 0.06, 0.06, -0.08), box(0.3, 0.14, 0.18, col(GARY.arms), 0, -0.04, -0.2));
    R.add(this.bigArm);
    this.dragon = pet("dragon", "#7d3fd6", { accent: "#f2c230" }); R.add(this.dragon);
    this.crayonDragon = pet("dragon", "#4caf50", { map: texMat("crayon", crayonTex()), accent: "#ffd400" }); R.add(this.crayonDragon);
    // ---- flood (shot 8) ----
    const fm = twoTone(new THREE.MeshLambertMaterial({ color: "#2f86d6", map: ctex("tmb_flood", 512, 512, (g, r) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = "rgba(255,255,255,1)"; g.lineCap = "round";
      for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, l = 20 + r() * 50; g.strokeStyle = "rgba(170,215,240,0.9)"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 8, x + l, y); g.stroke(); }
    }) }), 0.4);
    if (fm.map) { fm.map.repeat.set(20, 20); }
    const fg = new THREE.PlaneGeometry(80, 80); fg.rotateX(-Math.PI / 2);
    this.flood = new THREE.Mesh(fg, fm); this.flood.receiveShadow = true; R.add(this.flood);
    // ---- pet mountain with the throne (shot 15) ----
    const velvet = col("#7a2a8c"), gold = col("#e8b923");
    const tiers = [3.4, 2.6, 1.8, 1.05];
    tiers.forEach((rad, k) => { this.pile.add(box(rad * 2, 0.75, rad * 2, k % 2 ? gold : velvet, 0, 0.375 + k * 0.75, 0)); });
    const kinds: PetKind[] = ["cat", "dog", "bunny", "unicorn", "frog", "pig", "bear", "duck", "dragon"];
    const cols = ["#ff8c42", "#f4f1ea", "#ff6fae", "#9ad0ff", "#6cc04a", "#ffb3c1", "#a0673a", "#ffd23f", "#e2453c", "#3a86ff", "#b15cff", "#2fc4b2"];
    let n = 0;
    tiers.forEach((rad, k) => {
      const cnt = [16, 12, 8, 0][k];
      for (let i = 0; i < cnt; i++) {
        const a = (i / cnt) * Math.PI * 2 + k * 0.4, rr = rad - 0.32, kind = kinds[(n * 5 + k) % kinds.length];
        const p = pet(kind, cols[(n * 7) % cols.length], { accent: cols[(n * 3 + 5) % cols.length], s: kind === "dragon" ? 0.62 : 0.85 });
        const sx = Math.max(-1, Math.min(1, Math.cos(a) * 1.25)), sz = Math.max(-1, Math.min(1, Math.sin(a) * 1.25));
        p.position.set(sx * rr, (k + 1) * 0.75, sz * rr); p.rotation.y = Math.atan2(sx, sz) + (hash(n) - 0.5) * 0.6;
        this.pile.add(p); this.pilePets.push({ o: p, y: (k + 1) * 0.75, ph: hash(n + 9) * 6 }); n++;
      }
    });
    // throne on top
    const tz = 0, ty = PILE_H;
    this.pile.add(box(1.0, 0.45, 0.85, gold, 0, ty + 0.225, tz), box(0.92, 0.1, 0.78, col("#c4172c"), 0, ty + 0.5, tz + 0.02),
      box(1.0, 1.5, 0.16, gold, 0, ty + 0.75, tz - 0.42), box(0.16, 0.35, 0.8, gold, -0.5, ty + 0.62, tz), box(0.16, 0.35, 0.8, gold, 0.5, ty + 0.62, tz),
      box(0.2, 0.2, 0.2, col("#c4172c"), 0, ty + 1.6, tz - 0.42));
    this.pile.position.set(...PILE); this.pile.rotation.y = -0.35;
    R.add(this.pile);
    const crown = (g: THREE.Group, s: number) => {
      const m = col("#ffcf2e");
      g.add(box(0.62 * s, 0.14 * s, 0.62 * s, m, 0, 0.07 * s, 0));
      for (const [x, z] of [[-0.25, 0.25], [0, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25], [0, -0.25], [-0.25, 0], [0.25, 0]]) g.add(box(0.1 * s, 0.16 * s, 0.1 * s, m, x * s, 0.22 * s, z * s));
      g.add(box(0.1 * s, 0.1 * s, 0.03 * s, col("#e2453c"), 0, 0.08 * s, 0.32 * s));
    };
    crown(this.crownT, 1); this.timmy.extras.add(this.crownT); this.crownT.position.y = TIMMY.hs;
    crown(this.crownG, 0.7); R.add(this.crownG);
    // Timmy's propeller cap (hidden under the crown at the end); ScamLord's backwards cap + gold chain
    const cap = new THREE.Group();
    cap.add(box(0.78, 0.1, 0.78, col("#e8483f"), 0, TIMMY.hs + 0.05, 0), box(0.06, 0.12, 0.06, col("#ffd23f"), 0, TIMMY.hs + 0.16, 0));
    const prop1 = box(0.5, 0.03, 0.08, col("#3a86ff"), 0, TIMMY.hs + 0.23, 0); prop1.name = "prop"; cap.add(prop1); cap.name = "cap";
    this.timmy.extras.add(cap);
    this.scam.extras.add(box(0.64, 0.14, 0.64, col("#e2453c"), 0, SCAM.hs + 0.07, 0), box(0.5, 0.05, 0.28, col("#e2453c"), 0, SCAM.hs + 0.05, -0.42));
    const chain = col("#f2c230");
    for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI, x = Math.cos(a) * 0.26, y = SCAM.ll + SCAM.th - 0.08 - Math.sin(a) * 0.32; this.scam.body.add(box(0.07, 0.07, 0.05, chain, x, y, SCAM.td / 2 + 0.02)); }
    this.scam.body.add(box(0.17, 0.17, 0.05, chain, 0, SCAM.ll + SCAM.th - 0.46, SCAM.td / 2 + 0.03));
    R.add(this.gary.root, this.scam.root, this.timmy.root);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(s: ShotDef) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(s.id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN.az), el = THREE.MathUtils.degToRad(SUN.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }

  private setPanel(st: PanelState) {
    const k = JSON.stringify(st);
    if (k !== this.panelKey) { drawPanel(this.panelCv.getContext("2d")!, st); this.panelTex.needsUpdate = true; this.panelKey = k; }
  }
  /** world position of the ACCEPT button of panel 1 */
  static acceptAt(): V3 { return [PANEL1[0] - PANEL_W / 2 + ACCEPT_UV[0] * PANEL_W, PANEL1[1] + PANEL_H / 2 - ACCEPT_UV[1] * PANEL_H, PANEL1[2] + 0.035]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS.day;
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(s);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.2 + 6, 8, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 300; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(0.42, 0.41, 0.52); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = 1.1;
    CHAR.uCharTint.value.set(...L.charTint);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = 40; this.fog.far = 340;
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);

    // ---- default visibility ----
    const cards: Card[] = [];
    this.carpet.visible = id === 2;
    this.panel.visible = false; this.picture.visible = false; this.bigArm.visible = false;
    this.dragon.visible = false; this.crayonDragon.visible = false; this.flood.visible = false;
    this.pile.visible = id === 15; this.crownG.visible = false; this.crownT.visible = id === 15;
    const capT = this.timmy.extras.getObjectByName("cap")!; capT.visible = id !== 15;
    const propT = capT.getObjectByName("prop")!; propT.rotation.y = t * 9;
    const hide: Pose = { pos: [0, -50, 0], yaw: 0, face: { kind: "bead" }, visible: false };
    let gP: Pose = hide, sP: Pose = hide, tP: Pose = hide;
    const gb = blinkAt(f, 1), sb = blinkAt(f, 2), tb = blinkAt(f, 3);
    const garyIdle = (extra: Partial<Pose> = {}): Pose => ({ pos: GARY0, yaw: 0.2, armL: 0.05, armR: 0.05, face: { kind: "bead", blink: gb }, ...extra });

    // fountain spray: drops arcing from the top spout into the basin (all shots that can see it)
    if (id !== 15 && id !== 5) for (let i = 0; i < 24; i++) {
      const u = (t * 0.9 + i / 24 * 3) % 1, a = (i % 8) / 8 * Math.PI * 2;
      const r = 0.2 + 1.4 * u, y = 2.95 + 1.0 * u - 2.4 * u * u;
      if (y > 0.5) cards.push({ map: FX.drop(), p: [FOUNT[0] + Math.cos(a) * r, y, FOUNT[2] + Math.sin(a) * r], w: 0.12, op: 0.85 });
    }

    switch (id) {
      case 1: {
        const sq = f > CUES.boing ? 0.14 * Math.sin((f - CUES.boing) * 0.85) * Math.exp(-(f - CUES.boing) / 9) : 0;
        gP = { pos: [0, 0, 0], yaw: 0.12, armR: 0.25, armRz: 2.75, armL: 0.1, sq, face: { kind: "proud", blink: gb } };
        this.picture.visible = true; this.picture.position.set(0.74, 2.1 - sq * 0.5, 0.25); this.picture.rotation.set(0, -0.12, 0.08);
        if (f < 30) cards.push({ map: FX.spark(), p: [0.95, 2.3, 0.4], w: 0.22 * clamp01(1 - Math.abs(f - 14) / 14), rot: f * 0.1 });
        break;
      }
      case 2: {
        const x = scamWalkX(f), walking = f < 167;
        const w = walking ? walk(f, 0.45, 0.6) : { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0 };
        const turn = smooth((f - 160) / 10);
        sP = { pos: [x, 0, 0], yaw: lerp(-Math.PI / 2, 0.15, turn), ...w, armR: walking ? w.armR : lerp(0, 1.5, smooth((f - 170) / 6)), lean: walking ? 0.06 : 0,
          face: { kind: "grin", blink: sb } };
        for (const fl of CUES.flashes) {
          const d = f - fl;
          if (d >= 0 && d < 5) { const k = fl * 1.37; cards.push({ map: FX.flash(), p: [x + (hash(k) - 0.5) * 4.5, 1.2 + hash(k + 1) * 1.6, -2.4 - hash(k + 2) * 1.6], w: 1.3 * (1 - d / 6), op: 1 - d / 5 }); }
        }
        const dd = f - CUES.ding;
        if (dd >= 0 && dd < 14) {
          const sp = clamp01(1 - Math.abs(dd - 4) / 10);
          const yaw = 0.15, tx = x + 0.12 * Math.cos(yaw) + 0.32 * Math.sin(yaw), tz = 0.32 * Math.cos(yaw) - 0.12 * Math.sin(yaw);
          cards.push({ map: FX.spark(), p: [tx, SCAM.ll + SCAM.th + 0.2, tz + 0.05], w: 0.45 * sp, rot: dd * 0.15 });
        }
        break;
      }
      case 3: {
        const talk = f >= CUES.trustTalk[0] && f < CUES.trustTalk[1];
        const hyp = f >= CUES.hypno[0];
        const sway = hyp ? Math.sin((f - CUES.hypno[0]) / 30 * Math.PI * 0.9) : 0;
        gP = garyIdle({ yaw: 0.25, tilt: 0.12 * sway, face: hyp ? { kind: "hypno", t } : { kind: "bead", blink: gb, open: 0.3 } });
        sP = { pos: SCAM0, yaw: -0.45, lean: 0.08, armL: 1.9, armLz: 0.2, armR: 0.1,
          face: talk ? { kind: "talk", open: Math.abs(Math.sin((f - CUES.trustTalk[0]) * 0.55)) } : { kind: "grin", blink: sb } };
        this.panel.visible = true; this.panel.scale.setScalar(Math.max(0.001, pop(f, 215, 9)));
        this.panel.position.set(PANEL1[0], PANEL1[1] + 0.04 * Math.sin(t * 2), PANEL1[2]);
        this.setPanel({ give: "dragon", get: "picture", pressed: 0, title: "TRADE · ScamLord_99" });
        break;
      }
      case 4: {
        gP = garyIdle({ yaw: 0.05, face: { kind: "worried", t, blink: 0 } });
        const g = smooth((f - CUES.sweatGrow) / 22), slide = clamp01((f - 372) / 40) * 0.12;
        cards.push({ map: FX.sweat(), p: [GARY0[0] + 0.62, 2.12 - slide, 0.05], w: 0.07 + 0.52 * g, rot: -0.2 });
        if (f > 360) cards.push({ map: FX.drop(), p: [GARY0[0] - 0.36, 2.2 - ((f - 360) % 20) * 0.02, 0.3], w: 0.09 });
        break;
      }
      case 5: {
        this.panel.visible = true; this.panel.scale.setScalar(1); this.panel.position.set(...PANEL1);
        const pressed = f >= CUES.press ? 1 : 0;
        this.setPanel({ give: "dragon", get: "picture", pressed, title: "TRADE · ScamLord_99" });
        const A = World.acceptAt(), u = glide((f - 392) / (CUES.press - 392)), back = f > CUES.press + 4 ? smooth((f - CUES.press - 4) / 14) * 0.25 : 0;
        const start: V3 = [A[0] + 0.55, A[1] - 1.0, A[2] + 1.1], tip = lerp3(start, A, u);
        this.bigArm.visible = true; this.bigArm.position.set(tip[0], tip[1], tip[2] + 0.05 + back);
        this.bigArm.lookAt(start[0] - (A[0] - start[0]), start[1] - (A[1] - start[1]), start[2] - (A[2] - start[2]));
        this.bigArm.rotateY(Math.PI);
        if (f >= CUES.press) {
          const d = f - CUES.press;
          if (d < 6) cards.push({ map: FX.ring(), p: [A[0], A[1], A[2] + 0.02], w: 0.3 + d * 0.12, op: 1 - d / 6 });
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cards.push({ map: FX.spark(), p: [A[0] + Math.cos(a) * (0.2 + d * 0.03), A[1] + Math.sin(a) * (0.2 + d * 0.03), A[2] + 0.05], w: 0.16 * Math.max(0, 1 - d / 20), rot: d * 0.2 }); }
        }
        break;
      }
      case 6: {
        const gone = f >= CUES.poof;
        gP = garyIdle({ yaw: 0.2, armR: 0.5, face: { kind: "bead", blink: gb, open: 0.15 } });
        this.picture.visible = true; this.picture.position.set(GARY0[0] + 0.62, 1.15, 0.45); this.picture.rotation.set(-0.2, 0.15, 0);
        sP = gone ? hide : { pos: SCAM0, yaw: -0.25, armR: 0.2, armRz: 2.7, face: { kind: "grin", blink: sb } };
        if (!gone) {
          this.dragon.visible = true; this.dragon.position.set(SCAM0[0] + 0.05, 2.42 + 0.05 * Math.sin(t * 6), SCAM0[2] + 0.1); this.dragon.rotation.set(0, -0.6, 0); this.dragon.scale.setScalar(0.5);
          this.flap(this.dragon, t);
        } else {
          const d = f - CUES.poof;
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2, r = 0.3 + 0.9 * easeOut(d / 16);
            cards.push({ map: FX.puff(i % 3), p: [SCAM0[0] + Math.cos(a) * r * 0.8, 1.2 + Math.sin(a) * r * 0.7, SCAM0[2] + 0.2], w: (0.9 + 0.3 * hash(i)) * (1 - clamp01((d - 10) / 16)), rot: i + d * 0.03 });
          }
          if (d < 14) cards.push({ map: FX.speed(), p: [SCAM0[0] + 1.6 + d * 0.15, 1.4, SCAM0[2] + 0.3], w: 2.2, op: 1 - d / 14 });
        }
        break;
      }
      case 7: {
        const j = f < CUES.jawDrop ? 0 : Math.min(1, ((f - CUES.jawDrop) / 6) ** 2);
        const jb = f > CUES.jawDrop + 6 ? 1 - 0.06 * Math.sin((f - CUES.jawDrop - 6) * 1.2) * Math.exp(-(f - CUES.jawDrop - 6) / 6) : j;
        gP = garyIdle({ yaw: 0.06, armR: 0.25, jaw: jb, face: f >= 480 ? { kind: "jaw" } : { kind: "bead", blink: 0, open: 0.4 } });
        this.picture.visible = true; this.picture.position.set(GARY0[0] + 0.62, 1.0, 0.25); this.picture.rotation.set(-0.1, 0.1, -0.5);
        const pw = pop(f, CUES.wifi, 7);
        if (pw > 0) cards.push({ map: FX.wifi(), p: [GARY0[0] + 0.05, 2.75 + 0.03 * Math.sin(t * 8), 0.1], w: 0.6 * pw });
        if (f >= 480 && f < 500) cards.push({ map: FX.bang(), p: [GARY0[0], 2.0, -0.2], w: 1.6 * pop(f, 480, 4), op: 0.6 });
        break;
      }
      case 8: {
        const sob = Math.sin(f * 0.9);
        gP = garyIdle({ yaw: 0.0, armL: 0.3, armR: 0.3, armLz: 0.15, armRz: 0.15, sq: 0.03 * sob, tilt: 0.04 * Math.sin(f * 0.3), face: { kind: "cry", t } });
        const lvl = 0.8 * smooth((f - 566) / 105);
        this.flood.visible = lvl > 0.005; this.flood.position.set(GARY0[0], lvl - 0.02 + 0.015 * Math.sin(t * 3), 0);
        const eyeY = GARY.ll + GARY.th + 0.01 + GARY.hs * 0.55, ez = GARY.td / 2 + GARY.hs * 0.2;
        if (f > 558) for (const sx of [-1, 1]) for (let i = 0; i < 40; i++) {
          const u = (t * 1.25 + i / 40) % 1, ex = GARY0[0] + sx * 0.16;
          const p: V3 = [ex + sx * (0.12 + 2.2 * u), eyeY + 0.08 + 1.6 * u - 2.6 * u * u, ez + 0.6 * u];
          if (p[1] > lvl) cards.push({ map: FX.drop(), p, w: 0.17 + 0.07 * hash(i), rot: sx * (0.6 + u * 1.5) });
          else if (p[1] > lvl - 0.25) cards.push({ map: FX.ring(), p: [p[0], lvl + 0.02, p[2]], w: 0.25, op: 0.7 });
        }
        break;
      }
      case 9: {
        sP = { pos: SCAM7, yaw: -0.15, armL: 2.2, armLz: 0.35, armR: 0.2, lean: -0.04, face: { kind: "grin", blink: sb } };
        this.dragon.visible = true; this.dragon.scale.setScalar(0.62);
        this.dragon.position.set(SCAM7[0] - 0.85, 2.15 + 0.08 * Math.sin(t * 5), SCAM7[2] + 0.2); this.dragon.rotation.set(0, 0.5, 0); this.flap(this.dragon, t);
        for (let i = 0; i < 4; i++) { const k = (f + i * 9) % 36; cards.push({ map: FX.spark(), p: [SCAM7[0] - 0.85 + (hash(i) - 0.5) * 1.1, 2.3 + (hash(i + 3) - 0.3) * 0.9, SCAM7[2] + 0.5], w: 0.18 * Math.sin((k / 36) * Math.PI), rot: k * 0.1 }); }
        break;
      }
      case 10: {
        const p = timmyWalk(f), walking = f < 782, dir = Math.atan2(TIMMY7[0] - (-3.6), TIMMY7[2] - (-3.2));
        const w = walking ? walk(f, 0.7, 0.5) : { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0 };
        tP = { pos: p, yaw: walking ? dir : lerp(dir, 0.25, smooth((f - 782) / 8)), ...w, bob: w.bob * 0.6, face: { kind: "innocent", blink: tb, look: f > 790 && f < 805 ? 0.5 : 0 } };
        sP = { pos: SCAM7, yaw: -0.55, armL: 0.1, armR: 0.1, face: { kind: "grin", blink: sb } };
        this.dragon.visible = true; this.dragon.scale.setScalar(0.62);
        this.dragon.position.set(SCAM7[0] + 0.85, 2.0 + 0.08 * Math.sin(t * 5), SCAM7[2] - 0.3); this.dragon.rotation.set(0, -0.3, 0); this.flap(this.dragon, t);
        const dt = f - CUES.twinkle;
        if (dt >= 0 && dt < 14) cards.push({ map: FX.spark(), p: [TIMMY7[0] + 0.32, TIMMY.ll + TIMMY.th + TIMMY.hs * 0.75, TIMMY7[2] + 0.45], w: 0.3 * Math.sin((dt / 14) * Math.PI), rot: dt * 0.1 });
        break;
      }
      case 11: {
        tP = { pos: TIMMY7, yaw: 0.35, armL: 0.2, armR: 0.2, face: { kind: "innocent", blink: tb } };
        sP = { pos: SCAM7, yaw: -0.4, lean: 0.05, armL: 0.6, face: { kind: "grin", blink: sb } };
        this.panel.visible = true; this.panel.scale.setScalar(Math.max(0.001, pop(f, CUES.panel2, 9)));
        this.panel.position.set(PANEL2[0], PANEL2[1] + 0.04 * Math.sin(t * 2), PANEL2[2]);
        this.setPanel({ give: "dragon2", get: "golden", pressed: 0, title: "TRADE · Tiny_Timmy" });
        break;
      }
      case 12: {
        const kc = f >= CUES.kaching;
        sP = { pos: SCAM7, yaw: -0.05, armL: kc ? 0.9 : 0.1, armR: kc ? 0.9 : 0.1, armLz: 0.3, armRz: 0.3, bob: kc ? 0.04 * Math.abs(Math.sin((f - CUES.kaching) * 0.4)) : 0,
          face: f >= CUES.kaching - 3 ? { kind: "dollar", t } : { kind: "grin", blink: sb } };
        if (kc) {
          const d = (f - CUES.kaching) / FPS;
          for (let i = 0; i < 14; i++) {
            const sx = i % 2 ? 1 : -1, v = 0.8 + hash(i) * 1.4, up = 1.6 + hash(i + 7) * 1.6;
            const p: V3 = [SCAM7[0] + sx * (0.3 + 0.6 * v * d), 1.85 + up * d - 3.8 * d * d, SCAM7[2] + 0.4 + 0.2 * d];
            if (d < 1.4) cards.push({ map: FX.coin(), p, w: 0.17, rot: d * 8 + i });
          }
        }
        break;
      }
      case 13: {
        const C: V3 = [-0.35, 1.55, -4.0];
        this.crayonDragon.visible = true; this.crayonDragon.scale.setScalar(0.62);
        this.crayonDragon.position.set(C[0], C[1] - 0.3 + 0.03 * Math.sin(t * 4), C[2]); this.crayonDragon.rotation.set(0, 0.75, 0); this.flap(this.crayonDragon, t * 0.6);
        // the crayon scribbling across on each squeak
        const sq = CUES.squeaks.find((q) => f >= q - 2 && f < q + 12);
        if (sq !== undefined) {
          const u = (f - sq + 2) / 14, x = C[0] - 0.35 + 0.7 * (Math.floor(u * 4) % 2 ? 1 - (u * 4) % 1 : (u * 4) % 1);
          cards.push({ map: FX.crayon(), p: [x, C[1] + 0.05 - u * 0.25, C[2] + 0.45], w: 0.11, rot: -0.6 });
          cards.push({ map: FX.spark(), p: [x - 0.12, C[1] - 0.1 - u * 0.25, C[2] + 0.48], w: 0.12, rot: f * 0.3 });
        }
        break;
      }
      case 14: {
        const gl = smooth((f - CUES.slide) / 14);
        sP = { pos: SCAM7, yaw: -0.05, armL: 0.1, armR: 0.1,
          face: f >= CUES.twitch[0] ? { kind: "twitch", t, glasses: 1 } : { kind: "grin", glasses: gl } };
        break;
      }
      case 15: {
        const P = this.pile, cosY = Math.cos(P.rotation.y), sinY = Math.sin(P.rotation.y);
        const W = (x: number, y: number, z: number): V3 => [PILE[0] + x * cosY + z * sinY, PILE[1] + y, PILE[2] - x * sinY + z * cosY];
        tP = { pos: W(0, PILE_H + 0.5 - TIMMY.ll, 0.05), yaw: P.rotation.y, legL: 1.45, legR: 1.45, armL: 0.5, armR: 0.5, armLz: 0.25, armRz: 0.25, face: { kind: "innocent", blink: tb } };
        const rub = Math.sin(f * 0.7);
        gP = { pos: W(0.95, PILE_H - 0.75, -0.25), yaw: P.rotation.y - 0.5, armL: 1.3, armR: 1.3 + 0.25 * rub, armLz: -0.15, armRz: -0.2, face: { kind: "empty", blink: gb } };
        const cg = W(0.62, PILE_H - 0.75 + 1.25, 0.25);
        this.crownG.visible = true; this.crownG.position.set(...cg); this.crownG.rotation.set(0.2, P.rotation.y, 0);
        cards.push({ map: FX.cloth(), p: [cg[0] + 0.12 * rub, cg[1] + 0.12, cg[2] + 0.12], w: 0.22, rot: rub * 0.4 });
        if ((f % 40) < 10) cards.push({ map: FX.spark(), p: [cg[0] - 0.15, cg[1] + 0.25, cg[2] + 0.1], w: 0.16 * Math.sin(((f % 40) / 10) * Math.PI) });
        sP = { pos: W(-2.6, 0, 3.9), yaw: P.rotation.y + 0.2, armL: 0.6, armR: 0.6, face: { kind: "scamEmpty" } };
        this.crayonDragon.visible = true; this.crayonDragon.scale.setScalar(0.45);
        const cd = W(-2.6, 0.95, 4.35); this.crayonDragon.position.set(...cd); this.crayonDragon.rotation.set(0, P.rotation.y, 0);
        for (const pp of this.pilePets) pp.o.position.y = pp.y + Math.max(0, Math.sin(t * 5 + pp.ph)) * 0.04;
        if (f >= CUES.confetti) {
          const d = (f - CUES.confetti) / FPS;
          for (let i = 0; i < 60; i++) {
            const x0 = (hash(i) - 0.5) * 9, z0 = (hash(i + 50) - 0.5) * 6, y = 9 - d * (1.6 + hash(i + 9) * 1.4) - hash(i + 3) * 2;
            const p = W(x0 + Math.sin(d * 3 + i) * 0.3, y, z0);
            cards.push({ map: FX.confetti(i), p, w: 0.18, rot: d * (3 + hash(i) * 5) + i });
          }
        }
        break;
      }
    }
    this.gary.pose(gP); this.scam.pose(sP); this.timmy.pose(tP);
    this.cards.show(cards, cam.quaternion);
    return focus;
  }

  private flap(d: THREE.Group, t: number) {
    const a = 0.45 + 0.35 * Math.sin(t * 9);
    const l = d.getObjectByName("wingL"), r = d.getObjectByName("wingR");
    if (l) l.rotation.z = a; if (r) r.rotation.z = -a;
  }
}
