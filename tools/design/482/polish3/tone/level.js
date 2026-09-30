/* #482 batch 3 tone review, finding 2 — how loud does a small Fine tune play, against the clip itself?
 * Export path (schedule), 48 kHz, through FM.buildAudioFxChain. For each signal and each Fine tune: the average level
 * change (dB, output RMS over dry RMS, 0.3–1.5 s) and the wobble (half the spread, 5th to 95th percentile, of the level in
 * 10 ms windows — the shifter's two grains cross every 50 ms, so a level that pumps shows up here).
 * window.__lvl482 may name { cents: [...], semis: [...], sigs: [...] } to narrow it. */
const SR = 48000, N = Math.round(1.6 * SR);
const opt = window.__lvl482 || {};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SIGS = {
  // a voice-like tone: 140 Hz with a 5 Hz vibrato of ±2 %, harmonics falling at 1/k up to 4 kHz
  voice: () => { let ph = 0; const out = new Float32Array(N); for (let i = 0; i < N; i++) { const f = 140 * (1 + 0.02 * Math.sin(2 * Math.PI * 5 * i / SR)); ph += f / SR; let s = 0; for (let k = 1; k * 140 < 4000; k++) s += Math.sin(2 * Math.PI * k * ph) / k; out[i] = 0.25 * s; } return out; },
  sine150: () => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = 0.5 * Math.sin(2 * Math.PI * 150 * i / SR); return o; },
  sine440: () => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / SR); return o; },
  sine2k: () => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = 0.5 * Math.sin(2 * Math.PI * 2000 * i / SR); return o; },
  chord: () => { const o = new Float32Array(N); [220, 277.18, 329.63].forEach(f => { for (let i = 0; i < N; i++) for (let k = 1; k <= 6; k++) o[i] += 0.12 * Math.sin(2 * Math.PI * f * k * i / SR) / k; }); return o; },
  noise: () => { const r = rng(5), o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = (r() * 2 - 1) * 0.5; return o; },
  // pink noise (Paul Kellet's filter): equal energy per octave, the way most real hiss, wind and room tone falls off
  pink: () => { const r = rng(9), o = new Float32Array(N); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < N; i++) { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980; o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08; b6 = w * 0.115926; } return o; },
};
async function run(d, params) {
  const oac = new OfflineAudioContext(1, N, SR), b = oac.createBuffer(1, N, SR); b.getChannelData(0).set(d);
  const src = oac.createBufferSource(); src.buffer = b;
  const chain = FM.buildAudioFxChain(oac, { audioFx: [{ type: 'pitch', enabled: true, params: Object.assign({ semitones: 0, cents: 0, mix: 1 }, params) }] }, 0);
  chain.schedule(0, N / SR);
  src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
  const r = await oac.startRendering(); try { chain.dispose(); } catch (e) {}
  return r.getChannelData(0);
}
const rms = (d, a, b) => { let t = 0; for (let i = a; i < b; i++) t += d[i] * d[i]; return Math.sqrt(t / (b - a)); };
function measure(dry, wet) {
  const a = Math.round(0.3 * SR), b = Math.round(1.5 * SR);
  const mean = 20 * Math.log10(rms(wet, a, b) / rms(dry, a, b));
  const W = Math.round(0.01 * SR), g = [];
  for (let s = a; s + W <= b; s += W) g.push(20 * Math.log10(rms(wet, s, s + W) / rms(dry, s, s + W)));
  g.sort((x, y) => x - y);
  const p = q => g[Math.min(g.length - 1, Math.max(0, Math.round(q * (g.length - 1))))];
  return [+mean.toFixed(2), +((p(0.95) - p(0.05)) / 2).toFixed(2)];
}
const cents = opt.cents || [1, 3, 8, 15, 30, 50, 75, 99, -10, -50];
const semis = opt.semis || [0, 1];
const sigs = opt.sigs || Object.keys(SIGS);
const out = {};
for (const s of sigs) {
  const dry = SIGS[s]();
  out[s] = {};
  for (const st of semis) out[s]['st' + st] = measure(dry, await run(dry, { semitones: st }));
  for (const c of cents) out[s]['c' + c] = measure(dry, await run(dry, { cents: c }));
}
return out;
