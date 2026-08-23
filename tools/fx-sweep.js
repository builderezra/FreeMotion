/* fx-sweep.js — paste into the app's console (or run via the preview) to rank effects by whether their
   sliders actually DO anything across their travel. Written for queue 482, Ezra's "go through every
   single effect and improve their quality".

   ⚠️ THREE WAYS THIS MEASUREMENT LIES, ALL THREE HIT ON THE FIRST RUN. The first version reported 70
   dead sliders out of 345. Every one was the instrument:
     1. AN OPAQUE TEST FRAME. Drop Shadow, Inner Glow, Stroke Colour and Smooth Edges need an EDGE —
        given a fully opaque plate they have nothing to act on and read as dead. This is the queue-460
        mistake exactly ("flat opaque magenta made shadows have nowhere to fall"). The frame below has
        a real subject on transparency with a soft rim.
     2. COMPARING THE TWO ENDS OF A CYCLIC PARAM. `angle 0 → 360` is the same angle, so every rotation
        control measured as doing nothing. Sample ALONG the slider and sum the steps instead.
     3. IGNORING ALPHA. Blink, Pulse Opacity and Fade only ever move the alpha channel, so an RGB-only
        difference calls them all inert.
   And after fixing those, a fourth: an ANIMATION param (phase, speed, rate, tracking) does nothing at a
   single instant by definition. Anything flagged dead must be re-checked across several `t` values
   before it is believed — `verifyOverTime` below does that, and it cleared 6 of the 16 survivors.

   The honest output of a run is a CANDIDATE list, not a finding. Each one still needs its kernel read. */
(function () {
  const R = FM.fxRegistry, P = FM._pixelFx, W = 128, H = 96;
  function frame() {
    const a = new Uint8ClampedArray(W * H * 4), cx = W / 2, cy = H / 2, rx = W * 0.34, ry = H * 0.38;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
      const u = x / W, v = y / H;
      let r = Math.round(255 * u), g = Math.round(255 * v), b = Math.round(200 * (1 - u * v) + 40);
      if (((x >> 4) + (y >> 4)) & 1) { r = Math.min(255, r + 40); g = Math.max(0, g - 30); }
      if (x > W * 0.7 && y < H * 0.28) { r = 250; g = 245; b = 235; }          // a highlight to clip
      if (x < W * 0.18 && y > H * 0.78) { r = 8; g = 10; b = 14; }             // a shadow to crush
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
      a[i + 3] = d <= 1 ? (d > 0.82 ? 170 : 255) : 0;                          // subject + soft rim (fault 1)
    }
    return a;
  }
  const mad = (A, B) => { let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); return s / A.length; };  // alpha included (fault 3)
  const run = (type, q, t) => { const d = frame(); try { P[type](d, W, H, q, t, 1); } catch (e) { return null; } return d; };
  const N = 5, out = [];
  R.all().forEach(fx => {
    if (!P[fx.type]) return;
    const ps = R.paramsOf(fx.type) || [];
    const defs = {}; ps.forEach(p => { if (p.default !== undefined) defs[p.key] = p.default; });
    ps.filter(p => typeof p.min === 'number' && typeof p.max === 'number' && p.max > p.min).forEach(p => {
      const shots = [];
      for (let k = 0; k < N; k++) {
        const r = run(fx.type, Object.assign({}, defs, { [p.key]: p.min + (p.max - p.min) * k / (N - 1) }), 0.37);
        if (!r) return; shots.push(r);
      }
      const steps = []; for (let k = 1; k < N; k++) steps.push(mad(shots[k - 1], shots[k]));   // along, not end-to-end (fault 2)
      const total = steps.reduce((a, b) => a + b, 0);
      out.push({ label: fx.label, type: fx.type, key: p.key, total: +total.toFixed(2),
                 steps: steps.map(s => +s.toFixed(2)),
                 lower: +(steps[0] + steps[1]).toFixed(2), upper: +(steps[2] + steps[3]).toFixed(2) });
    });
  });
  const dead = out.filter(o => o.total < 0.5);
  const oneSided = out.filter(o => o.total >= 0.5 && Math.min(o.lower, o.upper) < o.total * 0.03);
  console.log('swept', out.length, 'sliders ·', dead.length, 'candidates for dead ·', oneSided.length, 'one-sided');
  console.log('NOW VERIFY each candidate over time before believing it — see the header.');
  return { all: out, dead, oneSided };
})();
