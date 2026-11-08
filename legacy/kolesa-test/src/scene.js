import * as THREE from 'three';
import * as TL from './timeline.js';
const { C, T, RIGHT, at, clamp, smooth, easeOutBack, track } = TL;

const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const SUB = +(params.get('sub') || 8);          // motion-blur subframes
const SHUTTER = 0.5 / TL.FPS;                   // 180° shutter

// ---------------- deterministic noise ----------------
function hash(x, y, z) { let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(c(0,0,0), c(1,0,0), u), L(c(0,1,0), c(1,1,0), u), v), L(L(c(0,0,1), c(1,0,1), u), L(c(0,1,1), c(1,1,1), u), v), w);
}
const fbm = (x, y, z = 0) => { let a = 0, f = 1, s = 0.5; for (let i = 0; i < 4; i++) { a += s * vnoise(x * f, y * f, z * f); f *= 2.03; s *= 0.5; } return a; };
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------- renderer ----------------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf2b98f, 0.0042);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 900);

// lights
const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
const sun = new THREE.DirectionalLight(0xffe0b8, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x9cc6ff, 0xc0602a, 0.9));
scene.add(new THREE.AmbientLight(0xffd7b0, 0.25));

// ---------------- sky ----------------
{
  const g = new THREE.SphereGeometry(600, 48, 24);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vd; uniform vec3 sunDir;
      void main(){ float h = clamp(vd.y,0.,1.);
        vec3 zen = vec3(0.04,0.22,0.78), hor = vec3(0.95,0.75,0.6);
        vec3 c = mix(hor, zen, pow(h, 0.35));
        float s = max(dot(vd, sunDir), 0.); c += vec3(1.,.8,.55)*pow(s, 40.)*0.8 + vec3(1.,.6,.35)*pow(s,6.)*0.15;
        // soft painted clouds
        float cl = sin(vd.x*9.+sin(vd.z*7.)*1.5)*sin(vd.z*11.+vd.x*3.)*0.5+0.5; cl = smoothstep(0.62,0.95,cl)*smoothstep(0.08,0.3,h)*(1.-smoothstep(0.5,0.9,h));
        c = mix(c, vec3(1.,0.95,0.9), cl*0.55);
        gl_FragColor = vec4(c,1.); }`,
  });
  const sky = new THREE.Mesh(g, m); sky.frustumCulled = false; sky.renderOrder = -1;
  scene.add(sky);
  scene.userData.sky = sky;
}

{ // environment for metals: sky + warm ground
  const envScene = new THREE.Scene();
  const sk = scene.userData.sky.clone(); sk.scale.setScalar(0.1); envScene.add(sk);
  const gd = new THREE.Mesh(new THREE.CircleGeometry(50, 32), new THREE.MeshBasicMaterial({ color: 0xc8643a })); gd.rotation.x = -Math.PI / 2; gd.position.y = -2; envScene.add(gd);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.6;
}
// ---------------- canyon walls ----------------
const PAL = [0xa8301a, 0xe8622a, 0xffd0a0, 0xd2481f, 0xf08a4a, 0x7a2214, 0xffb070, 0xc23d22].map(c => new THREE.Color(c));
function stripeColor(y, s, side) {
  const band = y * 0.42 + fbm(s * 0.05, y * 0.08, side) * 3.2 + Math.sin(s * 0.03) * 0.8;
  const i = Math.floor(band), f = band - i;
  const a = PAL[((i % PAL.length) + PAL.length) % PAL.length], b = PAL[(((i + 1) % PAL.length) + PAL.length) % PAL.length];
  const c = a.clone().lerp(b, smooth(0.82, 1.0, f));
  const n = 0.82 + 0.3 * fbm(s * 0.4, y * 0.6, side + 7);
  return c.multiplyScalar(n);
}
function wallOffset(side, s) { return side < 0 ? -14 : 6 + 10 * smooth(42, 56, s); }
function buildWall(side) {
  const s0 = -40, s1 = 180, NS = 520, NY = 70, HMAX = 46;
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= NS; i++) {
    const s = s0 + (s1 - s0) * i / NS;
    for (let j = 0; j <= NY; j++) {
      const y = -1 + HMAX * Math.pow(j / NY, 1.15);
      // stepped mesa terraces + erosion
      const tier = Math.floor(y / 6.5), ty = y / 6.5 - tier;
      let recede = tier * 0.7 + smooth(0.85, 1.0, ty) * 0.9;
      recede += (fbm(s * 0.07, y * 0.05, side * 3) - 0.5) * 3.0 + (fbm(s * 0.45, y * 0.35, side) - 0.5) * 0.7;
      recede += Math.max(0, 2.5 - y) * 0.9; // talus toe
      const lat = wallOffset(side, s) + side * Math.max(0, recede);
      const p = at(s, lat, y);
      pos.push(p[0], p[1], p[2]);
      const c = stripeColor(y, s, side);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NY; j++) {
    const a = i * (NY + 1) + j, b = a + NY + 1;
    if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
}
buildWall(-1); buildWall(1);

// ---------------- ground ----------------
{
  const g = new THREE.PlaneGeometry(420, 420, 260, 260); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = [];
  const cA = new THREE.Color(0xd98a52), cB = new THREE.Color(0xb8643a), cC = new THREE.Color(0xe8a870);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const n = fbm(x * 0.15, z * 0.15, 3);
    p.setY(i, (n - 0.5) * 0.35);
    const c = cA.clone().lerp(cB, smooth(0.45, 0.7, n)).lerp(cC, smooth(0.6, 0.85, fbm(x * 0.6, z * 0.6, 9)) * 0.5);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.translate(-40, -0.02, -80); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.receiveShadow = true; scene.add(m);
}

// ---------------- sweep along track ----------------
function sweep(profile, s0, s1, ds, mat) { // profile: [[lat,y],...] closed loop-ish strip
  const pos = [], idx = []; const n = profile.length; let rows = 0;
  for (let s = s0; s <= s1 + 1e-6; s += ds) {
    for (const [lat, y] of profile) { const p = at(s, lat, y); pos.push(...p); }
    rows++;
  }
  for (let r = 0; r < rows - 1; r++) for (let k = 0; k < n - 1; k++) {
    const a = r * n + k, b = a + n; idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
const BALLAST_TOP = 0.25, SLEEPER_TOP = 0.36, RAIL_TOP = 0.55, GAUGE = 0.75;
sweep([[-2.6, 0.0], [-1.65, BALLAST_TOP], [1.65, BALLAST_TOP], [2.6, 0.0]], -40, 180, 0.5,
  new THREE.MeshStandardMaterial({ color: 0x8a6c58, roughness: 1 }));
const railMat = new THREE.MeshStandardMaterial({ color: 0x6e5a50, metalness: 0.6, roughness: 0.45 });
const railHeadMat = new THREE.MeshStandardMaterial({ color: 0xd8d4d0, metalness: 0.9, roughness: 0.22 });
for (const sx of [-1, 1]) {
  const L = sx * GAUGE;
  sweep([[L - 0.1, SLEEPER_TOP], [L - 0.1, SLEEPER_TOP + 0.03], [L - 0.02, SLEEPER_TOP + 0.05], [L - 0.02, RAIL_TOP - 0.06],
         [L - 0.05, RAIL_TOP - 0.05], [L - 0.05, RAIL_TOP - 0.015]], -40, 180, 0.25, railMat);
  sweep([[L + 0.05, RAIL_TOP - 0.015], [L + 0.05, RAIL_TOP - 0.05], [L + 0.02, RAIL_TOP - 0.06], [L + 0.02, SLEEPER_TOP + 0.05],
         [L + 0.1, SLEEPER_TOP + 0.03], [L + 0.1, SLEEPER_TOP]], -40, 180, 0.25, railMat);
  sweep([[L - 0.05, RAIL_TOP - 0.015], [L - 0.045, RAIL_TOP], [L + 0.045, RAIL_TOP], [L + 0.05, RAIL_TOP - 0.015]], -40, 180, 0.25, railHeadMat);
}
// sleepers + plates
{
  const g = new THREE.BoxGeometry(2.25, 0.13, 0.26);
  const m = new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: 0.95 });
  const list = []; for (let s = -40; s < 180; s += 0.62) list.push(s);
  const inst = new THREE.InstancedMesh(g, m, list.length);
  const o = new THREE.Object3D(); const col = new THREE.Color();
  list.forEach((s, i) => {
    const p = at(s, 0, SLEEPER_TOP - 0.065), t = T(s);
    o.position.set(p[0], p[1], p[2]); o.rotation.set(0, Math.atan2(t[0], t[2]) + (rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.02); o.updateMatrix();
    inst.setMatrixAt(i, o.matrix); inst.setColorAt(i, col.setHSL(0.06, 0.35, 0.22 + rnd() * 0.12));
  });
  inst.castShadow = inst.receiveShadow = true; scene.add(inst);
}
// ballast stones + scattered rocks
function scatter(count, geo, mat, place) {
  const inst = new THREE.InstancedMesh(geo, mat, count); const o = new THREE.Object3D(); const col = new THREE.Color();
  for (let i = 0; i < count; i++) { place(o, col); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); inst.setColorAt(i, col); }
  inst.castShadow = true; inst.receiveShadow = true; scene.add(inst); return inst;
}
scatter(16000, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), (o, col) => {
  const s = -30 + rnd() * 140, lat = (rnd() * 2 - 1) * 1.9;
  const p = at(s, lat, BALLAST_TOP - Math.max(0, Math.abs(lat) - 1.65) * 0.25 + 0.02);
  const k = 0.05 + rnd() * 0.07;
  o.position.set(p[0], p[1], p[2]); o.scale.set(k * (0.8 + rnd() * 0.5), k * 0.7, k); o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
  col.setHSL(0.05 + rnd() * 0.04, 0.15 + rnd() * 0.2, 0.14 + rnd() * 0.16);
});
scatter(900, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), (o, col) => {
  const s = -30 + rnd() * 200; const side = rnd() < 0.5 ? -1 : 1;
  const lo = 2.8, hi = Math.abs(wallOffset(side, s)) + 1;
  const lat = side * (lo + Math.pow(rnd(), 0.6) * (hi - lo));
  const big = Math.abs(lat) > hi - 4 ? 1.8 : 1;
  const k = (0.12 + Math.pow(rnd(), 3) * 0.9) * big;
  const p = at(s, lat, k * 0.3); o.position.set(p[0], p[1], p[2]); o.scale.set(k, k * 0.7, k * 1.1); o.rotation.set(rnd(), rnd() * 6, rnd());
  col.setHSL(0.03 + rnd() * 0.03, 0.55, 0.26 + rnd() * 0.14);
});

// telegraph poles + wires
{
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b28, roughness: 0.9 });
  const poleG = new THREE.CylinderGeometry(0.07, 0.09, 6.5, 8), barG = new THREE.BoxGeometry(1.4, 0.09, 0.09);
  const tops = [];
  for (let s = -30; s < 170; s += 14) {
    const lat = -3.6; const p = at(s, lat, 3.25), t = T(s);
    const pole = new THREE.Mesh(poleG, wood); pole.position.set(...p); pole.castShadow = true; scene.add(pole);
    const bar = new THREE.Mesh(barG, wood); bar.position.set(p[0], 6.1, p[2]); bar.rotation.y = Math.atan2(t[0], t[2]) + Math.PI / 2; bar.castShadow = true; scene.add(bar);
    tops.push(s);
  }
  const wireM = new THREE.MeshBasicMaterial({ color: 0x2a1d18 });
  for (const off of [-0.55, 0.55]) for (let i = 0; i < tops.length - 1; i++) {
    const pts = []; for (let k = 0; k <= 12; k++) {
      const u = k / 12, s = tops[i] + (tops[i + 1] - tops[i]) * u;
      const p = at(s, -3.6 + off, 6.15 - Math.sin(u * Math.PI) * 0.45); pts.push(new THREE.Vector3(...p));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4), wireM));
  }
}
// cacti
function cactus(s, lat, h) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, h, 4, 10), m); trunk.position.y = h / 2 + 0.2; g.add(trunk);
  for (const [sx, y, l] of [[1, h * 0.45, h * 0.35], [-1, h * 0.6, h * 0.28]]) {
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.35, 4, 8), m); a.rotation.z = sx * Math.PI / 2; a.position.set(sx * 0.35, y, 0); g.add(a);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, l, 4, 8), m); b.position.set(sx * 0.55, y + l / 2, 0); g.add(b);
  }
  g.traverse(o => { o.castShadow = o.receiveShadow = true; });
  const p = at(s, lat, 0); g.position.set(...p); g.rotation.y = s; scene.add(g);
}
cactus(30, 4.6, 1.8); cactus(47, -7.5, 2.6); cactus(12, -9, 2.2); cactus(70, 9, 2.4); cactus(86, 6.5, 1.6); cactus(-5, 4.2, 1.4);

// dust motes
const dust = (() => {
  const n = 1400, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const s = -10 + rnd() * 110; const q = at(s, (rnd() * 2 - 1) * 9, rnd() * 6); p.set(q, i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xffe2b8, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
})();

// ---------------- wheelset ----------------
const wheelset = new THREE.Group(); scene.add(wheelset);
const WR = 0.47; // rolling radius at contact
const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.75, roughness: 0.38 });
const treadMat = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 0.95, roughness: 0.2 });
const accent = new THREE.MeshStandardMaterial({ color: 0xd8432a, roughness: 0.5 });
const spin = new THREE.Group(); wheelset.add(spin);
const ghostCones = [];
for (const sx of [-1, 1]) {
  // profile (radius, y) with y = outward from flange face
  const prof = [[0.1, -0.02], [0.57, -0.02], [0.58, 0.02], [0.53, 0.05], [0.505, 0.075]].map(([r, y]) => new THREE.Vector2(r, y));
  const tread = [[0.505, 0.075], [0.43, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const back = [[0.43, 0.25], [0.37, 0.25], [0.37, 0.19], [0.14, 0.17], [0.14, 0.3], [0.0, 0.3]].map(([r, y]) => new THREE.Vector2(r, y));
  const mk = (pts, mat) => { const g = new THREE.LatheGeometry(pts, 64); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
  const w = new THREE.Group();
  w.add(mk(prof, steel), mk(tread, treadMat), mk(back, steel));
  // spokes/web marks so rotation reads
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.22), accent); const a = k / 6 * Math.PI * 2; b.position.set(Math.cos(a) * 0.26, 0.18, Math.sin(a) * 0.26); b.rotation.y = -a; w.add(b); }
  // lathe axis is Y: rotate so axis is X, outward = sx
  w.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
  w.position.x = sx * (GAUGE - 0.1);
  spin.add(w);
  // ghost cone continuing the tread slope to its apex
  const slope = (0.505 - 0.43) / (0.25 - 0.075); // radius loss per metre
  const len = 0.43 / slope;
  const cg = new THREE.ConeGeometry(0.43, len, 64, 1, true); cg.translate(0, len / 2, 0);
  const cm = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const cone = new THREE.Mesh(cg, cm);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(0.43, len, 24, 1, true).translate(0, len / 2, 0), 1), new THREE.LineBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.9 }));
  const holder = new THREE.Group(); holder.add(cone, edges);
  holder.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
  holder.position.x = sx * (GAUGE - 0.1 + 0.25);
  wheelset.add(holder); ghostCones.push(holder);
}
{ const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.9, 24), steel); axle.rotation.z = Math.PI / 2; axle.castShadow = true; spin.add(axle);
  const box = new THREE.MeshStandardMaterial({ color: 0xe8b43a, roughness: 0.55 });
}
// lateral-shift arrow
const arrow = (() => {
  const s = new THREE.Shape(); s.moveTo(0, -0.09); s.lineTo(0.42, -0.09); s.lineTo(0.42, -0.22); s.lineTo(0.75, 0); s.lineTo(0.42, 0.22); s.lineTo(0.42, 0.09); s.lineTo(0, 0.09); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  g.translate(-0.3, 0, -0.04);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xff9a1a, emissiveIntensity: 0.6, roughness: 0.4 }));
  m.castShadow = true; scene.add(m); return m;
})();

// ---------------- character «Гоша» ----------------
const ink = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
const charRoot = new THREE.Group(); scene.add(charRoot);
const body = new THREE.Group(); charRoot.add(body); charRoot.scale.setScalar(0.82);
const outline = (geo, s = 1.045) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })); m.scale.setScalar(s); return m; };
const head = new THREE.Group(); head.position.set(0, 2.08, 0); body.add(head);
{
  const hg = new THREE.SphereGeometry(0.56, 48, 32);
  const hm = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.55 })); hm.castShadow = true;
  head.add(hm, outline(hg));
}
const eyes = [];
for (const sx of [-1, 1]) {
  const e = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), ink); e.scale.set(0.065, 0.1, 0.04); e.position.set(sx * 0.17, 0.06, 0.53); head.add(e); eyes.push(e);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(sx * 0.17 + 0.02, 0.1, 0.565); head.add(hl); eyes.push(hl);
  const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 2, 6), ink); br.rotation.z = Math.PI / 2 + sx * 0.25; br.position.set(sx * 0.18, 0.24, 0.52); head.add(br);
  const ck = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xff8a7a, transparent: true, opacity: 0.55 })); ck.position.set(sx * 0.3, -0.1, 0.475); ck.lookAt(sx * 0.6, -0.2, 1.4); head.add(ck);
}
const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), ink); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.12, 0.535); head.add(mouth);
{ // panama hat
  const hatM = new THREE.MeshStandardMaterial({ color: 0x2f7d5b, roughness: 0.7 });
  const band = new THREE.MeshStandardMaterial({ color: 0xffc43a, roughness: 0.5 });
  const hat = new THREE.Group(); hat.position.set(0.04, 0.44, -0.02); hat.rotation.set(-0.08, 0, -0.12); head.add(hat);
  const brimG = new THREE.CylinderGeometry(0.66, 0.68, 0.045, 40); const brim = new THREE.Mesh(brimG, hatM); hat.add(brim, outline(brimG, 1.03));
  const crownG = new THREE.CylinderGeometry(0.33, 0.4, 0.32, 32); const crown = new THREE.Mesh(crownG, hatM); crown.position.y = 0.17; hat.add(crown);
  const crO = outline(crownG, 1.05); crO.position.y = 0.17; hat.add(crO);
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.41, 0.08, 32), band); bd.position.y = 0.06; hat.add(bd);
  hat.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
{ // torso: overalls + shirt + scarf
  const tg = new THREE.CapsuleGeometry(0.25, 0.32, 6, 20);
  const torso = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xe0a138, roughness: 0.7 })); torso.position.y = 1.18; torso.castShadow = true;
  const tO = outline(tg, 1.06); tO.position.y = 1.18; body.add(torso, tO);
  for (const sx of [-1, 1]) { const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), ink); btn.position.set(sx * 0.12, 1.33, 0.235); body.add(btn); }
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: 0xc2862a })); pocket.position.set(0, 1.12, 0.25); body.add(pocket);
}
const scarfTail = new THREE.Group();
{
  const sm = new THREE.MeshStandardMaterial({ color: 0xe8552d, roughness: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 10, 24), sm); ring.rotation.x = Math.PI / 2; ring.position.y = 1.54; ring.castShadow = true; body.add(ring);
  scarfTail.position.set(0.12, 1.52, 0.16); body.add(scarfTail);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.04), sm); tail.position.y = -0.18; tail.castShadow = true; scarfTail.add(tail);
}
const limbG = new THREE.CylinderGeometry(0.03, 0.03, 1, 8); limbG.translate(0, 0.5, 0);
const mkLimb = () => { const m = new THREE.Mesh(limbG, ink); m.castShadow = true; body.add(m); return m; };
const limbs = { lUp: mkLimb(), lLo: mkLimb(), rUp: mkLimb(), rLo: mkLimb(), lLeg: mkLimb(), rLeg: mkLimb() };
const hands = [-1, 1].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.6 })); h.castShadow = true; body.add(h); const o = outline(h.geometry, 1.25); h.add(o); return h; });
const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.07, 2, 6), new THREE.MeshStandardMaterial({ color: 0xf6f2ea })); hands[1].add(thumb); thumb.position.set(0, 0.08, 0);
const shoes = [-1, 1].map(sx => { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), ink); s.scale.set(0.11, 0.07, 0.17); s.position.set(sx * 0.15, 0.06, 0.05); s.castShadow = true; body.add(s); return s; });
const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function seg(m, a, b) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); _v.subVectors(B, A); m.position.copy(A); m.scale.set(1, _v.length(), 1); m.quaternion.setFromUnitVectors(_up, _v.normalize()); }
function arm(sideKey, sx, sh, el, hd) { seg(limbs[sideKey + 'Up'], sh, el); seg(limbs[sideKey + 'Lo'], el, hd); hands[sx > 0 ? 1 : 0].position.set(...hd); }

function poseChar(t, camPos) {
  const sc = TL.sceneOf(t);
  const base = sc === 3 ? TL.CHAR3 : TL.CHAR1;
  charRoot.position.set(base[0], 0, base[2]);
  // face camera (clamped around the track-facing yaw)
  const dx = camPos.x - base[0], dz = camPos.z - base[2];
  charRoot.rotation.y = Math.atan2(dx, dz) * 0.85 + (sc === 3 ? 0.25 : -0.15);
  charRoot.updateMatrixWorld(true);
  const bob = Math.sin(t * Math.PI * 2 * 1.0) * 0.025;            // on the 120bpm half-beat feel
  body.position.y = bob;
  head.rotation.set(Math.sin(t * 2.1) * 0.05, Math.sin(t * 1.3) * 0.12, Math.sin(t * 2.0 + 1) * 0.06);
  // blink
  const bl = [1.4, 4.2, 7.1, 9.5].some(b => Math.abs(t - b) < 0.06) ? 0.15 : 1;
  eyes.forEach((e, i) => { if (i % 2 === 0) e.scale.y = 0.1 * bl; else e.visible = bl > 0.5; });
  scarfTail.rotation.set(0.25 + Math.sin(t * 5.3) * 0.18, 0, Math.sin(t * 3.7) * 0.22);
  // legs
  seg(limbs.lLeg, [-0.1, 0.86, 0], [-0.15, 0.08, 0.02]);
  seg(limbs.rLeg, [0.1, 0.86, 0], [0.15, 0.08, 0.02]);
  thumb.visible = false;
  mouth.scale.set(1, 1, 1);
  const L = [-0.24, 1.36, 0], Rs = [0.24, 1.36, 0];
  if (sc === 1) { // wave with right hand; left on hip
    const w = Math.sin(t * 9) * 0.16;
    const lift = smooth(0.2, 0.7, t);
    arm('r', 1, Rs, [0.52, 1.36 + 0.35 * lift, 0.06], [0.58 + w * lift, 1.36 + 0.75 * lift - 0.35 * (1 - lift), 0.1]);
    arm('l', -1, L, [-0.48, 1.12, 0.02], [-0.3, 0.96, 0.12]);
    mouth.scale.set(1.25, 1.4, 1);
  } else if (sc === 2) { // points at the wheelset (world -> local direction)
    const ws = TL.wheelS(t), wp = at(ws, 0, 1.0);
    const inv = new THREE.Matrix4().copy(charRoot.matrixWorld).invert();
    const loc = new THREE.Vector3(...wp).applyMatrix4(inv); loc.y = 1.4; const dir = loc.sub(new THREE.Vector3(...L)).normalize();
    const ext = smooth(3.7, 4.2, t);
    const el = [L[0] + dir.x * 0.33, L[1] + dir.y * 0.33 - 0.12 * (1 - ext), L[2] + dir.z * 0.33];
    const hd = [L[0] + dir.x * (0.35 + 0.35 * ext), L[1] + dir.y * 0.6 - 0.4 * (1 - ext), L[2] + dir.z * (0.35 + 0.35 * ext)];
    arm('l', -1, L, el, hd);
    arm('r', 1, Rs, [0.45, 1.12, 0.05], [0.32, 0.95, 0.15]);
    mouth.scale.set(0.8, 1.6 + 0.4 * Math.sin(t * 12), 1);
  } else { // thumbs up on the final beat
    const up = easeOutBack((t - 8.9) / 0.35, 2.2);
    arm('r', 1, Rs, [0.5, 1.2 + 0.1 * up, 0.18], [0.36, 1.25 + 0.35 * up, 0.42]);
    thumb.visible = up > 0.2; thumb.scale.setScalar(clamp(up));
    arm('l', -1, L, [-0.48, 1.12, 0.02], [-0.3, 0.96, 0.12]);
    mouth.scale.set(1.3, 1.3 + 0.3 * clamp(up), 1);
  }
}

// ---------------- post: DOF + accumulation + grade ----------------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
rt.depthTexture = new THREE.DepthTexture(W, H); rt.depthTexture.type = THREE.FloatType;
const accum = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadGeo = new THREE.PlaneGeometry(2, 2);
const dofMat = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: new THREE.Vector2(W, H) },
    near: { value: 0.1 }, far: { value: 900 }, focus: { value: 10 }, aperture: { value: 40 }, weight: { value: 1 } },
  transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv; uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far, focus, aperture, weight;
    float vz(vec2 uv){ float d = texture2D(tDep, uv).x; return -perspectiveDepthToViewZ(d, near, far); }
    float coc(float z){ return clamp(aperture * abs(1./focus - 1./z), 0., 18.); }
    void main(){
      float zc = vz(vUv); float cc = coc(zc);
      vec3 acc = texture2D(tCol, vUv).rgb; float wsum = 1.;
      const int N = 56;
      for(int i=0;i<N;i++){
        float fi = float(i);
        float r = sqrt((fi+0.5)/float(N)) * 18.;
        float a = fi * 2.39996;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
        float zs = vz(uv); float cs = coc(zs);
        float c = zs > zc ? min(cs, cc) : cs;   // background taps can't bleed over sharp foreground
        float w = smoothstep(r - 1.5, r + 0.5, c);
        acc += texture2D(tCol, uv).rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum * weight, weight);
    }`,
});
const dofQuad = new THREE.Mesh(quadGeo, dofMat); const dofScene = new THREE.Scene(); dofScene.add(dofQuad);
const outMat = new THREE.ShaderMaterial({
  uniforms: { tAcc: { value: accum.texture }, flash: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tAcc; uniform float flash;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
    void main(){
      vec3 c = texture2D(tAcc, vUv).rgb * 0.85;
      c = aces(c);
      c = pow(c, vec3(1./2.2));
      c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.12);       // saturation
      vec2 q = vUv - 0.5; c *= 1. - dot(q*vec2(1.0,0.75), q*vec2(1.0,0.75)) * 0.55;  // vignette
      c += flash;
      gl_FragColor = vec4(c, 1.);
    }`,
});
const outScene = new THREE.Scene(); outScene.add(new THREE.Mesh(quadGeo, outMat));

// ---------------- state at time t ----------------
const camPos = new THREE.Vector3();
function setState(t) {
  const sc = TL.sceneOf(t), cam = TL.CAM[sc];
  let p, g;
  if (sc === 3) { const c3 = TL.cam3(t); p = c3.pos; g = c3.tgt; } else { p = track(cam.pos, t); g = track(cam.tgt, t); }
  camera.position.set(...p); camPos.copy(camera.position);
  camera.up.set(0, 1, 0); camera.lookAt(g[0], g[1], g[2]);
  camera.rotateZ(track(cam.roll, t)[0]);
  camera.fov = track(cam.fov, t)[0]; camera.updateProjectionMatrix();
  // wheelset
  const s = TL.wheelS(t), sh = TL.wheelShift(t), tg = T(s);
  const wp = at(s, sh, RAIL_TOP + WR);
  wheelset.position.set(...wp);
  wheelset.rotation.set(0, Math.atan2(tg[0], tg[2]) + Math.PI, 0);  // local -Z = travel dir
  spin.rotation.x = -s / WR;
  const coneIn = sc === 2 ? smooth(4.95, 5.45, t) : 0;
  ghostCones.forEach(c => { c.visible = coneIn > 0.001; c.scale.set(1, coneIn, 1); });
  // arrow
  const aIn = sc === 3 ? easeOutBack((t - 7.45) / 0.4) : 0;
  arrow.visible = aIn > 0.01;
  { const ap = at(s, sh + 0.15 + 0.18 * smooth(7.5, 8.55, t), RAIL_TOP + 1.75); arrow.position.set(...ap);
    const r = RIGHT(s); arrow.rotation.set(0, Math.atan2(-r[2], r[0]), 0); arrow.scale.setScalar(Math.max(0.001, aIn) * 1.1);
    arrow.rotateX(-0.5); }
  // focus
  let fp;
  if (sc === 1) fp = new THREE.Vector3(TL.CHAR1[0], 1.6, TL.CHAR1[2]);
  else if (sc === 2) fp = wheelset.position.clone();
  else fp = wheelset.position.clone().lerp(new THREE.Vector3(TL.CHAR3[0], 1.5, TL.CHAR3[2]), smooth(8.2, 9.0, t) * 0.5);
  dofMat.uniforms.focus.value = Math.max(0.5, fp.distanceTo(camera.position));
  dofMat.uniforms.aperture.value = cam.aperture;
  // character
  charRoot.updateMatrixWorld(true);
  poseChar(t, camPos);
  // dust drift
  dust.position.set(Math.sin(t * 0.3) * 0.4, Math.sin(t * 0.7) * 0.15, t * 0.25);
  // shadow box follows the action
  sun.target.position.copy(fp); sun.position.copy(fp).addScaledVector(SUN_DIR, 80);
  const ext = sc === 1 ? 46 : 22, sc2 = sun.shadow.camera;
  sc2.left = -ext; sc2.right = ext; sc2.top = ext; sc2.bottom = -ext; sc2.near = 1; sc2.far = 200; sc2.updateProjectionMatrix();
  scene.userData.sky.position.copy(camera.position);
}

// ---------------- captions ----------------
const capEl = document.getElementById('cap');
const words = TL.WORDS.map(w => {
  const el = document.createElement('div'); el.className = 'word' + (w.hot ? ' hot' : '');
  [...w.w].forEach(ch => { const sp = document.createElement('span'); sp.textContent = ch === ' ' ? ' ' : ch; el.appendChild(sp); });
  capEl.appendChild(el); return { ...w, el, spans: [...el.children] };
});
function setCaptions(t) {
  words.forEach((w, i) => {
    const next = words[i + 1]; const end = next ? next.t : 99;
    const on = t >= w.t && t < end;
    w.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    const a = t - w.t;
    const pop = easeOutBack(a / 0.22, w.hot ? 3.0 : 2.2);
    const squash = 1 + 0.22 * Math.exp(-a * 14) * Math.cos(a * 40);
    const tilt = (i % 2 ? 1 : -1) * 4 * Math.exp(-a * 9);
    const lift = (1 - clamp(a / 0.25)) * 40;
    w.el.style.transform = `translateY(${lift}px) rotate(${tilt}deg) scale(${0.55 + 0.45 * pop}) scaleX(${squash}) scaleY(${2 - squash})`;
    // letters cascade for the hot words
    w.spans.forEach((sp, k) => {
      const ak = a - k * 0.03; const b = w.hot ? easeOutBack(ak / 0.25, 3) : 1;
      sp.style.transform = w.hot ? `translateY(${(1 - b) * 60 + Math.sin(t * 6 + k * 0.7) * 4 * clamp(a - 0.4)}px)` : '';
      sp.style.opacity = w.hot ? clamp(ak / 0.08) : 1;
    });
  });
}

// ---------------- render ----------------
function renderAt(t) {
  renderer.setRenderTarget(accum); renderer.setClearColor(0x000000, 0); renderer.clear();
  const n = SUB;
  for (let i = 0; i < n; i++) {
    let ts = t + (n > 1 ? (i / (n - 1) - 0.5) * SHUTTER : 0);
    // never blur across a cut
    if (t < TL.CUT1) ts = Math.min(ts, TL.CUT1 - 1e-4); else if (t < TL.CUT2) ts = Math.max(Math.min(ts, TL.CUT2 - 1e-4), TL.CUT1); else ts = Math.max(ts, TL.CUT2);
    setState(ts);
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    dofMat.uniforms.weight.value = 1 / n;
    renderer.setRenderTarget(accum); renderer.autoClear = false; renderer.render(dofScene, quadCam); renderer.autoClear = true;
  }
  // tiny exposure "kick" on the cuts
  outMat.uniforms.flash.value = 0.10 * Math.exp(-Math.max(0, t - TL.CUT1) * 18) * (t >= TL.CUT1 ? 1 : 0)
                              + 0.08 * Math.exp(-Math.max(0, t - TL.CUT2) * 18) * (t >= TL.CUT2 ? 1 : 0);
  renderer.setRenderTarget(null); renderer.render(outScene, quadCam);
  setCaptions(t);
}
window.renderAt = (t) => { renderAt(t); return new Promise(r => requestAnimationFrame(() => r(true))); };
window.sceneReady = true;
if (!params.has('render')) { // live preview loop
  const t0 = performance.now();
  const loop = () => { renderAt(((performance.now() - t0) / 1000) % TL.DURATION); requestAnimationFrame(loop); };
  loop();
}
