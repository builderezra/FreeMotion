/* #482 batch 3 tone review, finding 5 — what pitch does +50 cents really come out at? The build's sheet read a buzzy 220 Hz
 * tone at 227.0 Hz by autocorrelation over 1.3 s, where 50 cents up is 226.45 Hz. This reads the same render three ways,
 * over windows of growing length: autocorrelation (the sheet's method), and the fundamental's spectral peak and centroid
 * (a DFT scanned in 0.01 Hz steps). The shifter reads the sound in 100 ms grains, and a window only a few grains long can
 * catch the grain rhythm; a long window cannot. window.__p50 = { cents: [...], secs: n } narrows it. */
const SR = 48000, o = window.__p50 || {}, SECS = o.secs || 8;
const saw = i => { const p = (i * 220 / SR) % 1; return 0.3 * (2 * p - 1); };
async function render(st, ct) {
  const n = Math.round(SECS * SR), oac = new OfflineAudioContext(1, n, SR), b = oac.createBuffer(1, n, SR), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = saw(i);
  const src = oac.createBufferSource(); src.buffer = b;
  const chain = FM.buildAudioFxChain(oac, { audioFx: [{ type: 'pitch', enabled: true, params: { semitones: st, cents: ct, mix: 1 } }] }, 0);
  chain.schedule(0, SECS);
  src.connect(chain.input); chain.output.connect(oac.destination); src.start(0);
  const r = await oac.startRendering(); try { chain.dispose(); } catch (e) {}
  return r.getChannelData(0);
}
function ac(d, want, a, len) {
  a = Math.round(a * SR); const lo = Math.floor(SR / (want * 1.1)), hi = Math.ceil(SR / (want / 1.1)), n = Math.min(Math.round(len * SR), d.length - a - hi - 2), r = {};
  let best = -1e9, bl = lo;
  for (let L = lo - 1; L <= hi + 1; L++) { let s = 0; for (let i = a; i < a + n; i += 2) s += d[i] * d[i + L]; r[L] = s; if (L >= lo && L <= hi && s > best) { best = s; bl = L; } }
  return SR / (bl + 0.5 * (r[bl - 1] - r[bl + 1]) / (r[bl - 1] - 2 * r[bl] + r[bl + 1]));
}
function spec(d, want, a, len) {
  a = Math.round(a * SR); const n = Math.min(Math.round(len * SR), d.length - a);
  let pk = 0, pf = 0, cw = 0, cf = 0;
  for (let f = want - 6; f <= want + 6; f += 0.01) {
    const w = 2 * Math.PI * f / SR; let re = 0, im = 0;
    for (let i = 0; i < n; i += 2) { const x = d[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n)); re += x * Math.cos(w * i); im -= x * Math.sin(w * i); }
    const m = re * re + im * im; if (m > pk) { pk = m; pf = f; } cw += m; cf += m * f;
  }
  return [pf, cf / cw];
}
/* THE PITCH EACH GRAIN PLAYS. Inside a grain the output IS the input resampled by exactly 2^(cents/1200) — the delay
   slides at 1 − ratio — and the grain's delay only jumps where its window is 0. So a short autocorrelation centred on
   each grain's loudest moment (line A peaks at 0.05 + 0.1k s, line B at 0.1k s) reads the shifted pitch without the
   20 Hz grain rhythm that a long window folds in; the median over the grains is the answer. */
function local(d, want, a, len) {
  const res = [];
  for (let t = 0.1; t + 0.05 < Math.min(d.length / SR, a + len); t += 0.05) {
    if (t < a) continue;
    const c = Math.round(t * SR), half = Math.round(0.0125 * SR), lo = Math.floor(SR / (want * 1.1)), hi = Math.ceil(SR / (want / 1.1)), r = {};
    let best = -1e9, bl = lo;
    for (let L = lo - 1; L <= hi + 1; L++) { let s = 0; for (let i = c - half; i < c + half; i++) s += d[i] * d[i + L]; r[L] = s; if (L >= lo && L <= hi && s > best) { best = s; bl = L; } }
    res.push(SR / (bl + 0.5 * (r[bl - 1] - r[bl + 1]) / (r[bl - 1] - 2 * r[bl] + r[bl + 1])));
  }
  res.sort((x, y) => x - y);
  return res[res.length >> 1];
}
const cents = o.cents || [50];
const out = {};
for (const c of cents) {
  const st = Math.floor(c / 100), ct = c - 100 * st, want = 220 * Math.pow(2, c / 1200), d = await render(st, ct);
  const row = { want: +want.toFixed(3) };
  for (const len of [1.3, 3, 7.5]) {
    const a = ac(d, want, 0.3, len), s = len >= 3 ? spec(d, want, 0.3, len) : null;
    row['ac' + len] = +a.toFixed(3);
    row['grain' + len] = +local(d, want, 0.3, len).toFixed(3);
    if (s) { row['peak' + len] = +s[0].toFixed(3); row['centroid' + len] = +s[1].toFixed(3); }
  }
  out['c' + c] = row;
}
return out;
