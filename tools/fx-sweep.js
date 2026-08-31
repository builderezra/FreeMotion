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
        ⚠️ AND SAMPLING ALONG IT IS NOT ENOUGH — THE STEP MUST NOT DIVIDE THE EFFECT'S OWN PERIOD.
        Sunburst draws `cos((angle + phase) * count)`, so at the default 16 rays the picture repeats
        every 360/16 = 22.5 degrees. Five even samples across -360..360 step by 180, which is exactly
        eight periods, so all five renders were the IDENTICAL PICTURE and `phase` measured 0.00 —
        stone dead, on a control that is perfect. Measured: the same slider walked at 0/5/11/17/23
        degrees moves 119.47, and a single 0 to 11 degree step moves 41.59. The fractions below are
        deliberately uneven for this reason; even divisions alias against any periodic parameter.
     3. IGNORING ALPHA. Blink, Pulse Opacity and Fade only ever move the alpha channel, so an RGB-only
        difference calls them all inert.
   And after fixing those, a fourth: an ANIMATION param (phase, speed, rate, tracking) does nothing at a
   single instant by definition. Anything flagged dead must be re-checked across several `t` values
   before it is believed — `verifyOverTime` below does that, and it cleared 6 of the 16 survivors.

   ⚠️ FIFTH AND SIXTH, BOTH FOUND ON 31 AUG, AND BOTH COST A FULL INVESTIGATION EACH BEFORE THEY WERE
   RECOGNISED AS THE INSTRUMENT RATHER THAN THE EFFECT:
     5. A CONDITIONAL PARAM SWEPT AT DEFAULTS. HSL Bands' `centre` and `width` apply only when `band`
        is set to Custom, and the catalog SAYS SO — `overriddenBy: 'band', liveWhen: 8`. Swept with
        band at its default of Blue they moved nothing and read as stone dead, twice over. The
        registry already knows; this now asks it, and sets the gate to its live value first.
     6. A PARAM THAT ONLY ACTS AT THE TONAL EXTREMES. Film Grain's `shadows` and `highlights` scale by
        `(1 - 4L(1-L))`, which is ~0 through the whole midtone range — so on a frame of mostly midtones
        they are ARITHMETICALLY almost inert and measured 0.07. On a black-to-white ramp the same two
        sliders measure 0.71 and 0.75, comfortably alive. The frame below now carries a full ramp band
        as well as the subject, so a shadow/highlight control has somewhere to act.

     9. A SPATIAL PARAM MEASURED ON A FRAME SMALLER THAN ITS RANGE. This is the one-sided list's whole
        story. Border Frame's inset runs to 200px and Pixel Sort's run length to 600 — on the 128x96
        frame above, anything past a quarter of the slider already covers the picture, so the top half
        measures 0 and reads as dead. PROVEN by a control rather than argued: Stroke Colour's `width`
        appeared in that list the day AFTER it was fixed and measured working to 60px. Its upper half
        scores 1.41 on a 112px frame and 24.78 on a 640px one; Border inset 0 then 17.32; Border radius
        0 then 14.12; Long Shadow length 0 then 11.99. A one-sided verdict is now re-measured on a
        frame big enough to hold the parameter before it is reported.

   The honest output of a run is a CANDIDATE list, not a finding. Each one still needs its kernel read.
   EVERY candidate chased so far has been the instrument — twelve on the dead list, four more on the
   one-sided list. Read the kernel BEFORE reporting, and check the frame can hold the parameter. */
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
      /* A FULL BLACK→WHITE RAMP ACROSS THE BOTTOM THIRD (fault 6). Without real extremes, every
         control weighted toward the shadows or the highlights is arithmetically near-inert and reads
         as dead — Film Grain's two measured 0.07 here and 0.71 on a ramp. */
      if (y > H * 0.66) { const g2 = Math.round(255 * (x / (W - 1))); r = g2; g = g2; b = g2; }
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
      /* THE RAMP BAND MUST BE OPAQUE, or fault 6's cure becomes a worse fault 1. Every kernel here
         starts with `if (d[i+3] === 0) continue;`, so a transparent band is a region nothing writes to
         — it does not merely fail to help, it DILUTES the mean-absolute-difference across the whole
         frame and drags live sliders down under the threshold. Measured: adding the ramp as
         transparent pixels pushed the dead list from 15 to 13 while INVENTING four new entries
         (Vibrance, Spot Colour, Chroma Key Pro x2) that a smaller denominator had simply demoted. */
      a[i + 3] = (y > H * 0.66) ? 255 : (d <= 1 ? (d > 0.82 ? 170 : 255) : 0);  // subject + soft rim (fault 1) + an opaque ramp (fault 6)
    }
    return a;
  }
  /* ⚠️ SEVENTH, AND IT IS THE GENERAL FORM OF THE FIFTH AND SIXTH: ONE FRAME CANNOT EXERCISE EVERY
     PARAMETER. A control that only acts on the tonal extremes needs blacks and whites; a control that
     picks a COLOUR — Vibrance's skin protection, Spot Colour's boost, Chroma Key's despill and edge
     desaturation — needs saturated hues to find. The main frame above is a compromise, and every
     compromise leaves some slider with nothing to act on, which reads as dead.
     So a candidate is re-measured on frames chosen to give it somewhere to work, and the BEST result
     wins. This is not making the test easier: a slider that moves nothing on ANY of three very
     different pictures, at five times, is dead by any honest definition. */
  function rampFrame() {                      // pure luminance ramp: for shadow/highlight weighting
    const a = new Uint8ClampedArray(W * H * 4);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
      const L = Math.round(255 * (x / (W - 1)));
      a[i] = L; a[i + 1] = L; a[i + 2] = L; a[i + 3] = 255;
    }
    return a;
  }
  function hueFrame() {                       // full saturated hue sweep: for colour-selective params
    const a = new Uint8ClampedArray(W * H * 4);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
      const h = (x / W) * 360, l = 0.30 + 0.45 * (y / H), c = (1 - Math.abs(2 * l - 1)) * 0.95;
      const hp = h / 60, xx = c * (1 - Math.abs(hp % 2 - 1));
      let r = 0, g = 0, b = 0;
      if (hp < 1) { r = c; g = xx; } else if (hp < 2) { r = xx; g = c; } else if (hp < 3) { g = c; b = xx; }
      else if (hp < 4) { g = xx; b = c; } else if (hp < 5) { r = xx; b = c; } else { r = c; b = xx; }
      const m = l - c / 2;
      a[i] = Math.round((r + m) * 255); a[i + 1] = Math.round((g + m) * 255); a[i + 2] = Math.round((b + m) * 255);
      a[i + 3] = 255;
    }
    return a;
  }
  const FRAMES = [frame, rampFrame, hueFrame];
  const mad = (A, B) => { let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); return s / A.length; };  // alpha included (fault 3)
  const run = (type, q, t, mk) => { const d = (mk || frame)(); try { P[type](d, W, H, q, t, 1); } catch (e) { return null; } return d; };
  /* UNEVEN ON PURPOSE (fault 2, second half). Even fractions land on multiples of a periodic
     parameter's period and render the same picture every time. These do not. */
  const FRAC = [0, 0.17, 0.41, 0.66, 0.93];
  const N = FRAC.length, out = [];
  R.all().forEach(fx => {
    if (!P[fx.type]) return;
    const ps = R.paramsOf(fx.type) || [];
    const defs = {}; ps.forEach(p => { if (p.default !== undefined) defs[p.key] = p.default; });
    ps.filter(p => typeof p.min === 'number' && typeof p.max === 'number' && p.max > p.min).forEach(p => {
      /* UNLOCK A CONDITIONAL PARAM BEFORE SWEEPING IT (fault 5). The registry already declares the
         gate, so ask it rather than sweeping a control its own effect is currently ignoring. */
      const base = Object.assign({}, defs);
      if (p.overriddenBy && p.liveWhen !== undefined) base[p.overriddenBy] = p.liveWhen;
      const shots = [];
      for (let k = 0; k < N; k++) {
        const r = run(fx.type, Object.assign({}, base, { [p.key]: p.min + (p.max - p.min) * FRAC[k] }), 0.37);
        if (!r) return; shots.push(r);
      }
      const steps = []; for (let k = 1; k < N; k++) steps.push(mad(shots[k - 1], shots[k]));   // along, not end-to-end (fault 2)
      const total = steps.reduce((a, b) => a + b, 0);
      out.push({ label: fx.label, type: fx.type, key: p.key, total: +total.toFixed(2),
                 steps: steps.map(s => +s.toFixed(2)),
                 lower: +(steps[0] + steps[1]).toFixed(2), upper: +(steps[2] + steps[3]).toFixed(2) });
    });
  });
  /* …AND THE OVER-TIME RE-CHECK IS PART OF THE TOOL NOW, not a note asking the reader to do it by
     hand (fault 4). The header has told people to do this since the first version; doing it here is
     the difference between a warning and a guarantee. It cleared Blink, Electric Edges and Lightning
     on the 31 Aug run — three more investigations that did not need to happen. */
  const TIMES = [0, 0.23, 0.61, 1.4, 2.7];
  out.forEach(o => {
    if (o.total >= 0.5) { o.overTime = o.total; return; }
    const fx = R.all().find(f => f.type === o.type), ps = R.paramsOf(o.type) || [];
    const pd = ps.find(x => x.key === o.key);
    const defs = {}; ps.forEach(x => { if (x.default !== undefined) defs[x.key] = x.default; });
    if (pd && pd.overriddenBy && pd.liveWhen !== undefined) defs[pd.overriddenBy] = pd.liveWhen;
    let best = o.total;
    TIMES.forEach(t => FRAMES.forEach(mk => {
      const shots = [];
      for (let k = 0; k < N; k++) { const r = run(o.type, Object.assign({}, defs, { [o.key]: pd.min + (pd.max - pd.min) * FRAC[k] }), t, mk); if (r) shots.push(r); }
      let tot = 0; for (let k = 1; k < shots.length; k++) tot += mad(shots[k - 1], shots[k]);
      if (tot > best) best = tot;
    }));
    o.overTime = +best.toFixed(2);
  });
  const dead = out.filter(o => (o.overTime !== undefined ? o.overTime : o.total) < 0.5);
  /* …and a one-sided verdict is re-measured on a BIG frame first (fault 9). A spatial parameter whose
     range is wider than the test frame saturates, and every survivor of the last run turned out to be
     exactly that. 640x480 holds the widest range in the catalog (Pixel Sort's 600px run). */
  function bigFrame(WB, HB) {
    const a = new Uint8ClampedArray(WB * HB * 4), cx = WB / 2, cy = HB / 2, rx = WB * 0.3, ry = HB * 0.3;
    for (let y = 0, i = 0; y < HB; y++) for (let x = 0; x < WB; x++, i += 4) {
      const u = x / WB, v = y / HB;
      a[i] = Math.round(255 * u); a[i + 1] = Math.round(230 * v); a[i + 2] = Math.round(200 * (1 - u * v) + 40);
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      a[i + 3] = (dx * dx + dy * dy <= 1) ? 255 : 0;
    }
    return a;
  }
  const oneSidedRaw = out.filter(o => o.total >= 0.5 && Math.min(o.lower, o.upper) < o.total * 0.03);
  const oneSided = oneSidedRaw.filter(o => {
    const WB = 640, HB = 480, ps2 = R.paramsOf(o.type) || [], pd = ps2.find(x => x.key === o.key);
    if (!pd) return true;
    const defs = {}; ps2.forEach(x => { if (x.default !== undefined) defs[x.key] = x.default; });
    if (pd.overriddenBy && pd.liveWhen !== undefined) defs[pd.overriddenBy] = pd.liveWhen;
    const sh = [];
    for (let k = 0; k < N; k++) {
      const d = bigFrame(WB, HB);
      try { P[o.type](d, WB, HB, Object.assign({}, defs, { [o.key]: pd.min + (pd.max - pd.min) * FRAC[k] }), 0.37, 1); } catch (e) { return true; }
      sh.push(d);
    }
    const lo = mad(sh[0], sh[1]) + mad(sh[1], sh[2]), hi = mad(sh[2], sh[3]) + mad(sh[3], sh[4]);
    o.bigLower = +lo.toFixed(2); o.bigUpper = +hi.toFixed(2);
    return Math.min(lo, hi) < (lo + hi) * 0.03;          // still one-sided with room to work
  });
  console.log('swept', out.length, 'sliders ·', dead.length, 'candidates for dead ·', oneSided.length, 'one-sided');
  console.log('NOW VERIFY each candidate over time before believing it — see the header.');
  return { all: out, dead, oneSided };
})();
