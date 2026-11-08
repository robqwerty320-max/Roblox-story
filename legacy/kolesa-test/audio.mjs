// Synthesised music + SFX for the 10 s test. Writes audio.wav (48 kHz, stereo, 16-bit).
import fs from 'node:fs';
import * as TL from './src/timeline.js';

const SR = 48000, DUR = TL.DURATION, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const beat = 60 / TL.BPM;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function add(t0, buf, gain = 1, pan = 0) {
  const i0 = Math.round(t0 * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < buf.length; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; L[j] += buf[i] * gl; R[j] += buf[i] * gr; }
}
function biquad(type, f, q) { // RBJ
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(buf, coefFn) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) { const [b0, b1, b2, a1, a2] = coefFn(i); const x = buf[i]; const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y; } return out; }

// ---- instruments ----
function pluck(freq, dur, bright = 0.5) { // Karplus-Strong
  const n = Math.round(dur * SR), p = Math.round(SR / freq), d = new Float32Array(p); for (let i = 0; i < p; i++) d[i] = rnd();
  const out = new Float32Array(n); let k = 0, prev = 0;
  for (let i = 0; i < n; i++) { const v = d[k]; const nv = (v * (0.5 + bright * 0.5) + prev * (0.5 - bright * 0.5)) * 0.996; prev = v; d[k] = nv; out[i] = v; k = (k + 1) % p; }
  for (let i = 0; i < 200 && i < n; i++) out[i] *= i / 200;
  for (let i = 0; i < 400; i++) out[n - 1 - i] *= i / 400;
  return out;
}
function bass(midi, dur) { const f = mtof(midi), n = Math.round(dur * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.exp(-t * 5) * Math.min(1, t * 400) * Math.min(1, (dur - t) * 30); o[i] = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 12)) * e; } return o; }
function noiseHit(dur, decay, f, q, type = 'bp') { const n = Math.round(dur * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rnd() * Math.exp(-i / SR * decay); const c = biquad(type, f, q); return filt(o, () => c); }
function whistle(midi, dur, slideFrom = 0) { const n = Math.round(dur * SR), o = new Float32Array(n); let ph = 0;
  const br = noiseHit(dur, 3, 2200, 1.2);
  for (let i = 0; i < n; i++) { const t = i / SR; const sl = slideFrom ? slideFrom * Math.exp(-t * 30) : 0;
    const f = mtof(midi + sl) * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 4)); ph += 2 * Math.PI * f / SR;
    const e = Math.min(1, t * 30) * Math.min(1, (dur - t) * 12) * (0.85 + 0.15 * Math.sin(t * 9));
    o[i] = (Math.sin(ph) + 0.08 * Math.sin(2 * ph)) * e + br[i] * 0.05 * e; } return o; }
function bell(freq, dur) { const n = Math.round(dur * SR), o = new Float32Array(n), parts = [[1, 1, 2.2], [2.76, 0.5, 4], [5.4, 0.25, 7], [8.9, 0.12, 10]];
  for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (const [m, a, d] of parts) v += a * Math.sin(2 * Math.PI * freq * m * t) * Math.exp(-t * d); o[i] = v * Math.min(1, t * 2000); } return o; }
function strum(midis, dur, gain = 1) { const o = new Float32Array(Math.round(dur * SR)); midis.forEach((m, k) => { const p = pluck(mtof(m), dur - k * 0.012, 0.35); const off = Math.round(k * 0.012 * SR); for (let i = 0; i < p.length; i++) o[i + off] += p[i] * gain / midis.length * 1.6; }); return o; }

// ---- music: 120 BPM boom-chick, G – C – D – G, stop on 9.0 ----
const CH = { G: { root: 43, fifth: 50, tri: [55, 59, 62, 67] }, C: { root: 48, fifth: 43, tri: [55, 60, 64, 67] }, D: { root: 50, fifth: 45, tri: [57, 62, 66, 69] } };
const prog = ['G', 'G', 'C', 'C', 'D', 'D', 'G', 'G', 'C', 'D']; // chord per 2 beats -> 18 beats to 9.0
for (let b = 0; b < 18; b++) {
  const t = b * beat, ch = CH[prog[Math.floor(b / 2)]];
  if (b % 2 === 0) add(t, bass((b % 4 === 0 ? ch.root : ch.fifth) + 12, 0.48), 0.42);
  else add(t, strum(ch.tri, 0.3), 0.32, 0.25);
  if (b % 2 === 1) add(t, noiseHit(0.18, 28, 2500, 0.6), 0.22, -0.1);      // brush snare
  for (const h of [0, 0.5]) add(t + h * beat, noiseHit(0.06, 70, 7000, 1.5, 'hp'), h ? 0.10 : 0.06, 0.4); // shaker
}
// whistle melody (G major pentatonic), phrases follow the scenes
const mel = [
  [0.25, 67, 0.22], [0.5, 71, 0.22], [0.75, 74, 0.45, -3], [1.5, 72, 0.22], [1.75, 71, 0.22], [2.0, 69, 0.7, -2],
  [3.5, 74, 0.22], [3.75, 76, 0.22], [4.0, 78, 0.45, -2], [5.0, 79, 0.9, -5],
  [6.5, 74, 0.22], [6.75, 72, 0.22], [7.0, 71, 0.22], [7.25, 69, 0.22], [7.5, 67, 0.45], [8.0, 69, 0.22], [8.25, 71, 0.22], [8.5, 74, 0.45, -3],
];
for (const [t, m, d, sl] of mel) add(t, whistle(m, d, sl || 0), 0.16, -0.2);
// final: big G strum + low bass + bell "ding" on the landing word
add(9.0, strum([43, 50, 55, 59, 62, 67, 71], 1.0, 1.0), 0.6);
add(9.0, bass(31 + 12, 1.0), 0.6);
add(9.0, bell(mtof(79), 1.0), 0.18, 0.2);

// ---- SFX ----
// cut 1 whoosh (camera dive 2.75 -> 3.5): noise through rising band-pass
{ const d = 0.85, n = Math.round(d * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = i / n; o[i] = rnd() * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 2); }
  const w = filt(o, i => biquad('bp', 300 + 3200 * Math.pow(i / n, 2), 1.4)); add(2.68, w, 0.55, 0.0); }
// whoosh into cut 2
{ const d = 0.5, n = Math.round(d * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = i / n; o[i] = rnd() * Math.pow(u, 2) * (u < 0.95 ? 1 : (1 - u) * 20); }
  add(6.02, filt(o, i => biquad('bp', 500 + 2500 * (i / n), 1.2)), 0.45, 0.2); }
// rail clacks: wheels crossing joints
function clack(gain) { const o = noiseHit(0.12, 60, 2600, 4); const thump = bass(36, 0.12); for (let i = 0; i < o.length; i++) o[i] = o[i] * 1.8 + thump[i] * 0.6; return o; }
add(TL.CUT1, clack(1), 0.5);
for (const c of TL.railClacks()) { const g = Math.min(1, c.speed / 12) * 0.45 + 0.1; add(c.t, clack(1), g, -0.15); add(c.t + 0.11, clack(1), g * 0.6, 0.15); }
// rolling rumble following wheel speed
{ const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = rnd(); const lp = filt(o, (() => { const c = biquad('lp', 160, 0.8); return () => c; })());
  for (let i = 0; i < N; i++) { const t = i / SR; if (t < TL.CUT1) { lp[i] = 0; continue; } const v = Math.abs(TL.wheelS(t + 0.01) - TL.wheelS(t)) * 100; lp[i] *= Math.min(1, v / 10) * 0.9; }
  add(0, lp, 1, 0); }
// cone reveal shimmer (5.0): rising sparkle
[0, 0.06, 0.12, 0.18, 0.24].forEach((d, k) => add(5.0 + d, bell(mtof(84 + [0, 4, 7, 12, 16][k]), 0.6), 0.07, -0.4 + k * 0.2));
// arrow pop (7.45) + sideways slide zip (7.5 -> 8.55)
{ const n = Math.round(0.15 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (900 * Math.exp(-t * 25) + 250) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 30); } add(7.45, o, 0.35, 0.3); }
{ const d = 1.05, n = Math.round(d * SR), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / n; const f = 220 + 500 * u * u * (3 - 2 * u); ph += 2 * Math.PI * f / SR; o[i] = (Math.sin(ph) + 0.4 * Math.sin(3 * ph)) * Math.sin(Math.PI * u) * 0.5 + rnd() * 0.15 * Math.sin(Math.PI * u); }
  add(7.5, filt(o, (() => { const c = biquad('lp', 2500, 0.7); return () => c; })()), 0.2, 0.5); }

// master high-pass 35 Hz
{ const c = biquad('hp', 35, 0.7); const fl = filt(L, () => c), fr = filt(R, () => c); L.set(fl); R.set(fr); }
// ---- master: gentle glue + limiter + fades ----
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak; const buf = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  const fo = Math.min(1, (N - i) / (SR * 0.35));
  const l = Math.tanh(L[i] * g * 1.15) * fo, r = Math.tanh(R[i] * g * 1.15) * fo;
  buf.writeInt16LE(Math.round(l * 32000), 44 + i * 4); buf.writeInt16LE(Math.round(r * 32000), 46 + i * 4);
}
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
fs.writeFileSync('audio.wav', buf);
console.log('peak before norm', peak.toFixed(2), 'clacks', TL.railClacks().map(c => c.t.toFixed(2)).join(','));
