// Shared, pure timeline: used by the browser renderer and by the audio generator.
export const DURATION = 10;
export const FPS = 60;
export const BPM = 120;

// ---------- track centreline ----------
export const S1 = 60, R = 25, S2 = S1 + R * Math.PI / 2;
export function C(s) {
  if (s <= S1) return [0, 0, -s];
  if (s <= S2) {
    const th = (s - S1) / R;
    return [-R + R * Math.cos(th), 0, -S1 - R * Math.sin(th)];
  }
  return [-R - (s - S2), 0, -S1 - R];
}
export function T(s) { // unit tangent
  if (s <= S1) return [0, 0, -1];
  if (s <= S2) { const th = (s - S1) / R; return [-Math.sin(th), 0, -Math.cos(th)]; }
  return [-1, 0, 0];
}
export function RIGHT(s) { const t = T(s); return [-t[2], 0, t[0]]; }
export function at(s, lat, y = 0) { const c = C(s), r = RIGHT(s); return [c[0] + r[0] * lat, y, c[2] + r[2] * lat]; }

// ---------- helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
export const easeOutBack = (x, k = 1.7) => { x = clamp(x); return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };

// cubic Hermite through time-stamped keys, Catmull-Rom style tangents (non-uniform)
export function track(keys, t) {
  const n = keys.length;
  if (t <= keys[0].t) return keys[0].v.slice();
  if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0; while (keys[i + 1].t < t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const tan = j => {
    const a = keys[Math.max(0, j - 1)], b = keys[Math.min(n - 1, j + 1)];
    if (a === b) return k0.v.map(() => 0);
    return b.v.map((bv, d) => (bv - a.v[d]) / (b.t - a.t));
  };
  const m0 = keys[i].tan || tan(i), m1 = keys[i + 1].tan || tan(i + 1);
  const h = k1.t - k0.t, u = (t - k0.t) / h;
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return k0.v.map((p0, d) => h00 * p0 + h10 * h * m0[d] + h01 * k1.v[d] + h11 * h * m1[d]);
}

// ---------- scenes ----------
export const CUT1 = 3.5, CUT2 = 6.5;
export const sceneOf = t => (t < CUT1 ? 1 : t < CUT2 ? 2 : 3);

// character placement per scene
export const CHAR1 = at(36, 2.4);
export const CHAR3 = at(78.5, 2.3);

// wheelset arc-length position + lateral shift
export function wheelS(t) {
  if (t < CUT2) { // scene 2: rolls in and brakes (also defined in scene 1, off-screen)
    const u = clamp((t - CUT1) / 1.55);
    return 26 + 15 * easeOutCubic(u) + (t > CUT1 + 1.55 ? 0.04 * Math.sin((t - 5.05) * 14) * Math.exp(-(t - 5.05) * 5) : 0);
  }
  const u = clamp((t - CUT2) / 2.9);
  return 57 + 17.5 * (1 - Math.pow(1 - u, 2.4));
}
export function wheelShift(t) { return t < CUT2 ? 0 : 0.17 * smooth(7.5, 8.55, t); }

// camera: [x,y,z] pos, target, focus distance driven by pos/target
export const CAM = {
  1: {
    pos: [
      { t: 0.0, v: [-6, 25, 14] },
      { t: 1.25, v: [-2.6, 10.5, -9] },
      { t: 2.25, v: [0.6, 3.2, -27.2] },
      { t: 2.95, v: [1.15, 2.35, -30.6] },
      { t: 3.5, v: [1.0, 0.75, -34.6] },
    ],
    tgt: [
      { t: 0.0, v: [0, 3, -42] },
      { t: 1.25, v: [1.2, 1.6, -35] },
      { t: 2.25, v: [2.3, 1.6, -36] },
      { t: 2.95, v: [2.3, 1.55, -36] },
      { t: 3.5, v: [1.2, 0.7, -41] },
    ],
    fov: [{ t: 0, v: [52] }, { t: 2.4, v: [40] }, { t: 3.5, v: [58] }],
    roll: [{ t: 0, v: [-0.12] }, { t: 1.5, v: [0.05] }, { t: 2.6, v: [0.0] }, { t: 3.5, v: [-0.08] }],
    aperture: 34,
  },
  2: {
    pos: [
      { t: 3.5, v: [0.2, 0.7, -47.2] },
      { t: 4.7, v: [0.45, 0.82, -45.9] },
      { t: 5.4, v: [1.15, 1.05, -44.9] },
      { t: 6.5, v: [1.9, 1.3, -45.4] },
    ],
    tgt: [
      { t: 3.5, v: [0, 0.95, -30] },
      { t: 4.7, v: [0.1, 0.95, -39.5] },
      { t: 5.4, v: [0.75, 0.97, -41.0] },
      { t: 6.5, v: [1.2, 0.97, -41.0] },
    ],
    fov: [{ t: 3.5, v: [50] }, { t: 5.0, v: [42] }, { t: 6.5, v: [40] }],
    roll: [{ t: 3.5, v: [0.07] }, { t: 5.0, v: [0.0] }, { t: 6.5, v: [-0.03] }],
    aperture: 55,
  },
  3: {
    pos: [
      { t: 6.5, v: [1.6, 4.4, -49.5] },
      { t: 7.6, v: [3.9, 4.8, -61.5] },
      { t: 8.65, v: [-0.4, 3.4, -76.0] },
      { t: 10.0, v: [0.2, 3.1, -77.6] },
    ],
    tgt: [
      { t: 6.5, v: [0, 1, -58] },
      { t: 7.6, v: [-0.9, 1, -65] },
      { t: 8.65, v: [-3.5, 1.15, -75] },
      { t: 10.0, v: [-3.9, 1.2, -76.6] },
    ],
    fov: [{ t: 6.5, v: [55] }, { t: 8.6, v: [50] }, { t: 10, v: [49] }],
    roll: [{ t: 6.5, v: [-0.06] }, { t: 7.6, v: [0.08] }, { t: 8.7, v: [0.0] }, { t: 10, v: [0.0] }],
    aperture: 30,
  },
};

// ---------- captions (word by word) ----------
export const WORDS = [
  { t: 0.3, w: 'Колёса' },
  { t: 1.0, w: 'поезда —' },
  { t: 1.85, w: 'не' },
  { t: 2.3, w: 'цилиндры.' },
  { t: 3.9, w: 'Это' },
  { t: 5.0, w: 'конусы!', hot: true },
  { t: 6.65, w: 'В повороте' },
  { t: 7.35, w: 'пара' },
  { t: 7.7, w: 'сама' },
  { t: 8.05, w: 'сдвигается' },
  { t: 8.7, w: 'и' },
  { t: 9.0, w: 'вписывается.', hot: true },
];

// ---------- audio events (seconds) ----------
export function railClacks() {
  // wheel crosses rail joints every 6 m during scene 2 (two axles? one: double clack from both wheels ~ simultaneous; add echo)
  const out = [];
  let prev = wheelS(CUT1);
  for (let f = Math.round(CUT1 * 1000); f < CUT2 * 1000; f++) {
    const t = f / 1000, s = wheelS(t);
    for (const j of [30, 36]) if (prev < j && s >= j) out.push({ t, speed: (s - prev) * 1000 });
    prev = s;
  }
  // scene 3 rolling joints
  prev = wheelS(CUT2);
  for (let f = Math.round(CUT2 * 1000); f < 10000; f++) {
    const t = f / 1000, s = wheelS(t);
    for (const j of [60, 66, 72]) if (prev < j && s >= j) out.push({ t, speed: (s - prev) * 1000 });
    prev = s;
  }
  return out;
}

// scene 3: camera orbits around a moving focus (wheelset -> wheelset+character)
export const PHI3 = [{ t: 6.5, v: [-0.4] }, { t: 8.0, v: [0.12] }, { t: 9.2, v: [0.22] }, { t: 10, v: [0.26] }];
export const DIST3 = [{ t: 6.5, v: [5.2] }, { t: 8.0, v: [5.8] }, { t: 9.2, v: [9.0] }, { t: 10, v: [9.5] }];
export const HGT3 = [{ t: 6.5, v: [3.0] }, { t: 8.0, v: [3.9] }, { t: 9.2, v: [4.3] }, { t: 10, v: [4.4] }];
export function cam3(t) {
  const s = wheelS(t), w = at(s, wheelShift(t), 1.0);
  const k = smooth(8.1, 9.2, t) * 0.42;
  const F = [w[0] + (CHAR3[0] - w[0]) * k, 1.1 + 0.9 * k, w[2] + (CHAR3[2] - w[2]) * k];
  const sF = s + (78.5 - s) * k;
  const tg = T(sF), r = RIGHT(sF);
  const phi = track(PHI3, t)[0], d = track(DIST3, t)[0], h = track(HGT3, t)[0];
  const dir = [-tg[0] * Math.cos(phi) + r[0] * Math.sin(phi), 0, -tg[2] * Math.cos(phi) + r[2] * Math.sin(phi)];
  return { pos: [F[0] + dir[0] * d, h, F[2] + dir[2] * d], tgt: F };
}
