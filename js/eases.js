/* FreeMotion — parameterised easing families (v5.47).
 *
 * Ezra, with six Alight Motion screenshots: "there's three types of graphs — cubic bezier easing,
 * bounce, and steps, and each section has its own presets… For bounce the three different presets
 * actually change the points you can grab and adjust, if you see the circles, those are the touch
 * points you can grab on to make it change."
 *
 * That is the whole reason this file exists. Until now an easing was either a cubic bezier (four
 * numbers, two draggable handles) or one of two FIXED functions — `bounce` and `elastic` had no
 * parameters at all, so there was nothing to grab. A bounce you cannot tune is a preset, not a graph.
 *
 * The model: a keyframe may carry `ez = { fam, preset, p }`, where `p` is that preset's own parameter
 * bag. evalProp resolves `ez` ahead of `bez`/`e`, so nothing already saved changes meaning — a project
 * full of `e: 'bounce'` keyframes keeps resolving through the old FM.EASES entry exactly as before.
 *
 * Every preset declares three things, and the split is what keeps the editor honest:
 *   fn(t, p)   the maths, 0..1 in, eased out (may overshoot past either end)
 *   points     the grab handles: where each one SITS for a given p, and what a drag does to p
 *   defaults   the parameter bag a fresh keyframe of this preset starts with
 * The editor knows nothing about any individual preset — it draws `points` and calls `drag`. Adding a
 * preset is adding an entry here, not a branch in the UI.
 *
 * INVARIANTS every fn must hold, asserted by the suite:
 *   f(0) === 0 and f(1) === 1 exactly, for every preset at every corner of its parameter range —
 *   an easing that does not land on its keyframes makes the layer jump at both ends.
 *   Finite everywhere. A NaN here propagates into transform.x and the layer vanishes.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, f) => a + (b - a) * f;

  // Deterministic value noise. Math.random would give the Random preset a different shape on every
  // frame, which would look like a bug and would not survive export.
  function hash01(seed, i) {
    let x = (seed * 374761393 + i * 668265263) | 0;
    x = (x ^ (x >>> 13)) * 1274126177 | 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
  }

  /* ---------------- the maths ---------------- */

  // Damped oscillation settling on 1. cos starts at +1, so the curve dives, overshoots, and rings
  // down — which is the shape in Ezra's first screenshot, peaks crossing the settle line.
  function fBounce(t, p) {
    const n = clamp(p.n, 1, 8), d = clamp(p.d, 0.15, 3);
    return 1 - Math.pow(1 - t, d * 4) * Math.cos(n * Math.PI * t);
  }

  // Classic elastic with the amplitude opened up as a parameter. Scaling the sine breaks BOTH ends:
  // f(0) is off by the whole amplitude, and f(1) keeps a small residual because 2^-10 is not zero —
  // at a=2 that was 1.002 instead of 1, i.e. the layer settling just past its own keyframe. Both are
  // subtracted back out along complementary ramps, which pins the ends exactly without flattening
  // anything in between.
  function fElastic(t, p) {
    // `per` is the ringing period in the SAME units the classic easeOutElastic uses (its constant is
    // 3). A first pass clamped it to 0.12..0.9, which is the CSS-ish range and made c ten times too
    // big — the curve rang ~33 times inside one segment and read as a smear rather than an elastic.
    const a = clamp(p.a, 0.05, 2), per = clamp(p.p, 1, 8);
    const c = (2 * Math.PI) / per;
    const raw = u => Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * c) * a + 1;
    return raw(t) - raw(0) * (1 - t) - (raw(1) - 1) * t;
  }

  // A ramp with a sine riding on it. An INTEGER cycle count is what keeps f(1) exactly 1 — a
  // fractional one would leave the curve short of its own keyframe.
  function fCyclic(t, p) {
    const c = Math.max(1, Math.round(p.c)), a = clamp(p.a, 0, 1.2);
    return t + a * Math.sin(2 * Math.PI * c * t);
  }

  // Seeded value noise on a ramp, with both ends pinned to zero so the keyframes stay exact.
  function fRandom(t, p) {
    const a = clamp(p.a, 0, 1.2), j = Math.max(2, Math.round(p.j)), seed = p.seed | 0;
    const x = t * j, i = Math.min(j - 1, Math.floor(x)), f = x - i;
    const nAt = k => (k <= 0 || k >= j) ? 0 : hash01(seed, k) * 2 - 1;   // ends forced to 0
    const s = f * f * (3 - 2 * f);                                        // smoothstep, so it reads as noise not as a zigzag
    return t + a * lerp(nAt(i), nAt(i + 1), s);
  }

  // A clean staircase. n treads; the last one lands exactly on 1.
  function fSteps(t, p) {
    const n = Math.max(2, Math.round(p.n));
    return clamp(Math.floor(t * n) / (n - 1), 0, 1);
  }

  // The same staircase with each tread overshooting as it lands, which is AM's "Elastic Steps".
  function fElasticSteps(t, p) {
    const n = Math.max(2, Math.round(p.n)), w = clamp(p.w, 0, 1);
    const x = t * n, i = Math.floor(x), f = x - i;
    const base = clamp(i / (n - 1), 0, 1);
    if (t <= 0) return 0;
    const wob = w * Math.pow(2, -7 * f) * Math.sin(f * Math.PI * 3) / (n - 1);
    return base + wob;
  }

  /* ---------------- families, presets and their grab points ----------------
   * A point's `at` returns graph coordinates (x is 0..1 along the segment, y is in eased-value space
   * where 0 is the start keyframe and 1 the end). `drag` takes the same coordinates back and returns
   * a NEW parameter bag. Points that live on a rail return the rail in `rail` so the editor can draw
   * the dashed line the handle slides along — that is what tells you a handle only moves one way. */

  const BOUNCE = {
    key: 'bounce', label: 'Bounce', defaults: { n: 3, d: 0.5 },
    fn: fBounce,
    points: [
      // The first trough: how far down it dips is the damping, how early it happens is the count.
      { key: 'trough',
        at: p => { const x = 1 / Math.max(1, clamp(p.n, 1, 8)); return { x: x, y: fBounce(x, p) }; },
        drag: (p, x, y) => ({ n: clamp(Math.round(1 / Math.max(0.08, x)), 1, 8), d: clamp(0.15 + (1 - clamp(y, -0.5, 1)) * 1.6, 0.15, 3) }) },
    ],
  };

  const ELASTIC = {
    key: 'elastic', label: 'Elastic', defaults: { a: 1, p: 3 },
    fn: fElastic,
    points: [
      // Amplitude rides a rail across the top — it only has one axis of meaning.
      { key: 'amp', rail: 'h',
        at: p => ({ x: clamp(p.a / 2, 0.04, 1), y: 1.18 }),
        drag: (p, x) => Object.assign({}, p, { a: clamp(x * 2, 0.05, 2) }) },
      // Period hangs off the curve on a stalk: drag it sideways to stretch the ringing.
      { key: 'period', stalk: true,
        at: p => ({ x: 0.5, y: fElastic(0.5, p) - 0.28 }),
        drag: (p, x) => Object.assign({}, p, { p: clamp(1 + x * 7, 1, 8) }) },
    ],
  };

  const CYCLIC = {
    key: 'cyclic', label: 'Cyclic', defaults: { c: 3, a: 0.35 },
    fn: fCyclic,
    points: [
      { key: 'amp', stalk: true,
        at: p => ({ x: 0.08, y: 1.15 }),
        drag: (p, x, y) => Object.assign({}, p, { a: clamp(y - 0.15, 0, 1.2) }) },
      { key: 'cycles', rail: 'h',
        at: p => ({ x: clamp(Math.max(1, Math.round(p.c)) / 8, 0.06, 1), y: -0.15 }),
        drag: (p, x) => Object.assign({}, p, { c: clamp(Math.round(x * 8), 1, 8) }) },
    ],
  };

  const RANDOM = {
    key: 'random', label: 'Random', defaults: { a: 0.3, j: 12, seed: 7 },
    fn: fRandom,
    points: [
      // Amplitude on a VERTICAL rail at the left — the one in Ezra's fourth screenshot.
      { key: 'amp', rail: 'v',
        at: p => ({ x: 0.04, y: clamp(p.a, 0, 1.2) }),
        drag: (p, x, y) => Object.assign({}, p, { a: clamp(y, 0, 1.2) }) },
      { key: 'jag',
        at: p => ({ x: 0.5, y: fRandom(0.5, p) }),
        drag: (p, x) => Object.assign({}, p, { j: clamp(Math.round(2 + x * 30), 2, 32) }) },
    ],
  };

  const STEPS = {
    key: 'steps', label: 'Steps', defaults: { n: 4 },
    fn: fSteps,
    points: [
      // One handle on the bottom rail sets how many treads there are.
      { key: 'count', rail: 'h',
        at: p => ({ x: clamp(Math.max(2, Math.round(p.n)) / 12, 0.08, 1), y: 0 }),
        drag: (p, x) => ({ n: clamp(Math.round(x * 12), 2, 12) }) },
    ],
  };

  const ELASTIC_STEPS = {
    key: 'elasticSteps', label: 'Elastic Steps', defaults: { n: 4, w: 0.5 },
    fn: fElasticSteps,
    points: [
      { key: 'count', rail: 'h',
        at: p => ({ x: clamp(Math.max(2, Math.round(p.n)) / 12, 0.08, 1), y: 0 }),
        drag: (p, x) => Object.assign({}, p, { n: clamp(Math.round(x * 12), 2, 12) }) },
      { key: 'wobble', stalk: true,
        at: p => ({ x: 0.06, y: 1.1 }),
        drag: (p, x, y) => Object.assign({}, p, { w: clamp(y - 0.1, 0, 1) }) },
    ],
  };

  // The BEZIER family keeps the existing four-number representation and its two handles, which the
  // graph editor already draws — it is listed here so the family rail can offer it, not so it can be
  // re-implemented. `bez: true` tells the editor to use its own handle path for these.
  FM.EASE_FAMILIES = [
    { key: 'bezier', label: 'Bezier', bez: true, presets: [
      { key: 'linear', label: 'Linear' },
      { key: 'easeIn', label: 'Ease In' },
      { key: 'easeOut', label: 'Ease Out' },
      { key: 'easeInOut', label: 'Ease In-Out' },
      { key: 'overshoot', label: 'Overshoot' },
      { key: 'anticipate', label: 'Anticipate' },
    ] },
    { key: 'bounce', label: 'Bounce', presets: [BOUNCE, ELASTIC, CYCLIC, RANDOM] },
    { key: 'steps', label: 'Steps', presets: [STEPS, ELASTIC_STEPS] },
  ];

  FM.easeFamily = function (key) { return FM.EASE_FAMILIES.filter(function (f) { return f.key === key; })[0] || null; };
  FM.easePreset = function (fam, preset) {
    const F = FM.easeFamily(fam);
    if (!F || F.bez) return null;
    return F.presets.filter(function (p) { return p.key === preset; })[0] || null;
  };

  /* Resolve a keyframe's `ez` to an eased fraction. Returns null when `ez` is absent or names
   * something this build does not have, so evalProp falls straight through to its existing chain
   * rather than producing a broken curve — an older project, or a hostile import, must not be able to
   * NaN a transform from here. */
  FM.easeApply = function (ez, f) {
    if (!ez || typeof ez !== 'object') return null;
    const P = FM.easePreset(ez.fam, ez.preset);
    if (!P) return null;
    const p = Object.assign({}, P.defaults, ez.p || {});
    let y = P.fn(f, p);
    return Number.isFinite(y) ? y : null;
  };
})(window.FM);
