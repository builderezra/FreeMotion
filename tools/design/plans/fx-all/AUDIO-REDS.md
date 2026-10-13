# The two audio reds on the landing tree (#482 7.1 / 8.1, refers to #966)

Status (13 Oct, aud-red helper, second slot — CODE ONLY, NOTHING RUN): **step D is fixed in code with two red-first tests;
step C is prepared, not applied; the proof is a script (`prove.sh`) that has never been run.** No node, no browser, not
even `node --check` touched any of this — the API builder was shipping. Every number below that says "measured" is
Chrome's, from the first slot; everything the fix and the tests expect is reasoned from those numbers.

## The two reds (Chrome, HeadlessChrome 154; both also red on hunt/fx-b7 69f57acc and hunt/fx-b8 d50f8732)

1. `482 7.1 Compressor - Auto makeup Off keeps a quiet sound at its own level …` —
   *"with Threshold keyframed -10 -> -45 dB and Auto makeup Off a quiet sine sits at -0.45 dB, then 0.00"*.
2. `482 8.1 Limiter - Mix blends a dry copy held back by the look-ahead …` —
   *"CONTROL: at Mix 1 a -40 dBFS click leaves the Limiter first at frame 288 and is 1.281e-3 at 288 (export)"*.

## What was found (first slot, reading; not yet run)

- **No node harness ever ran these two tests.** fx-b7 / fx-b8's mock.js only builds and schedules graphs (no samples);
  fx-land's batch-7/8 runner (`rt78.js`) reports both as `b3Render is not defined` / `_sanitizeLayers` errors; fx-b9's
  rendering `wa.js` THROWS on a DynamicsCompressorNode and runs 2x / 4x WaveShapers as 'none'. So "passed in the mock" was
  never a measurement for either.
- **Leading hypothesis for BOTH reds: Chrome's DynamicsCompressorKernel starts every render ducked.** Its reset state is
  `detector_average_ = 0`, `compressor_gain_ = 1`: the first divisions see a desired gain of 0, attack hard towards it,
  then release back over the release time. comp2.json shows it directly — with a -60 dBFS sine the output at 50 ms is
  5.4 dB (k0r20) / 5.5 dB (k30r12) under the steady makeup, and it only settles by ~0.2–0.25 s (release 0.25 s).
  - 8.1: the click is at sample 0 and comes out at frame 288 — inside the duck. A hand run of the kernel's maths
    (attack 1 ms, release 50 ms) gives a total gain of ~0.12 at frame 288, i.e. ~1.25e-3 for the 0.01 click; Chrome
    measured 1.281e-3. The Mix code is not involved: the failing line is the Mix 1 CONTROL (today's Limiter).
    comp.json's `clickComp` (the same node settings, the click at 0.1 s) came through at the full makeup (0.010678).
  - 7.1: window A is 0.1–0.25 s (release 0.25 s), i.e. the tail of the duck; window B (1.4–1.9 s) reads 0.00, so the
    cancelling gain itself follows the threshold. comp2.json's k6r4 row is under the static makeup by ~1.9 / 0.6 / 0.1 dB
    at 0.10 / 0.15 / 0.20 s — an average of about the -0.45 dB measured.
  - comp2.json also shows Chrome's makeup follows an AUTOMATED threshold at once (k-rate, per render quantum, no
    smoothing): from 0.25 s on every row is within ~0.1 dB of the static makeup at that moment's threshold.
  - If this holds, both tests measure inside an engine start-up transient that every Compressor / Limiter has always
    had (not batch 7/8 code): the fix is the tests' windows (step C below) — decided once the faithful mock reproduces
    Chrome's two numbers (prove.sh stage B).

## Step D — the real Chrome-only bug, FIXED IN CODE (this slot)

**The bug.** Chrome's WaveShaper oversampler is a linear-phase FIR: 2x = 128 frames late, 4x = 192 (comp2.json ir2x / ir4x,
constant at five positions; comp.json's tanh clicks peak at the same frames). Three effects blended such a path with a dry
copy that did not wait for it, so at any Mix under 1 a click came out twice and a steady sound was combed:

| effect | oversampled part | dry copy waited | early by | notches every (48 kHz) | shipped? |
|---|---|---|---|---|---|
| Limiter, Clip at ceiling on | the clip, 4x | the 288-frame look-ahead only | 192 frames (4 ms) | 250 Hz | no — Mix and the clip are batch 7/8, on this tree only |
| Telephone | the bite, 2x (and its keyframed-Grit bank, 2x) | nothing | 128 frames (2.7 ms) | 375 Hz | **yes** — main a77db174 has its Mix and 2x bite, dry straight out |
| Distortion | the curve, 4x (and its keyframed-Drive bank, 4x) | nothing | 192 frames (4 ms) | 250 Hz | **yes** — main has its Mix and 4x shaper, dry straight out |

Bit Crush and Lo-Fi are `'none'` (no latency); no other effect has an oversampled shaper.

**The fix (js/audio-fx.js, audio-fx.js ?v= 18 -> 19; audio-fx-live.js untouched — the preview builds the very same chain
through FM.buildAudioFxChain, so export and preview are fixed together):**
- `OVERSAMPLE_FRAMES = { none: 0, '2x': 128, '4x': 192 }` and `oversampleSecs(ctx, over)` next to `lookaheadSecs`, with
  the measurement and the Chromium/WebKit reason written there (Firefox not measured). `dryLine(make, secs)`: a 0.1 s line
  (192 frames fit at any rate down to 3 kHz). `LIM_CLIP_OVER = '4x'`: the clip's build and its Mix's dry copy read one value.
- **Limiter:** a new def field `dryLagWhile: { key: 'clip', on: v => v > 0, over: LIM_CLIP_OVER }`. mixOutput builds the
  dry copy as `look-ahead lag → [extra 192-frame line → gOn] + [gOff] → dry` — a bypass pair switched by the same key, with
  the same `pairTargets` steps and 20 ms live fade as the Limiter's own clip pair (the set/ramp of that key reaches both).
  So the dry copy lines up in either state and a live flip of the tick box fades both copies together (at Mix 0.5 a flip
  is then a crossfade between two aligned blends, exactly what it is at Mix 1). **Clip off: gOn 0, gOff 1, x·1 + y·0 —
  the dry copy is the very samples it was; Mix 1: dry × 0 — unchanged either way.** The comment that said the oversampling
  "adds a few frames" now says 192 frames / 4 ms, measured, and what is done about it.
- **Telephone / Distortion:** the dry copy goes through `dryLine(s.delay, oversampleSecs(ctx, over))` (128 / 192 frames),
  with `over` one local constant shared by the shaper and its keyframed bank (Distortion's bank call now passes `12, over`
  — the defaults it used, so the same 12 4x shapers). Nothing else on either wet path is a fixed delay (biquads, gains).
  **Mix 1 (the default and every saved effect that never moved Mix) is wet × 1 + dry × 0: unchanged.** A saved Telephone
  or Distortion with Mix under 1 WILL sound different — the comb it had is gone. That is the fix, not a side effect.
- No registry param changed (def-level fields only), so SCHEMA_FP must not move (prove.sh stage H checks 1856346714373782).

**The tests (appended before the final `})();` of tests/tests.js, with two top-level helpers `b8PeakAt` / `b8Stray`):**
- `482 8.1 Limiter - with Clip at ceiling on, Mix blends a dry copy that waits for the clip too, so a click comes out once`
  — a -40 dBFS click at 0.4 s (past the start-up duck), Mix 0.5, clip on: one peak at +480 (288 + 192) within 0.0002 of
  0.01, nothing more than 8 frames away over 0.0005. **Why it fails on 8004fa16:** the dry half lands at +288 (0.005, the
  stray line) and +480 holds only the wet half (0.5 × 0.0099196 = 0.00496, the level line). CONTROLS: at Mix 1 the clipped
  click peaks at +480 (the latency the code rests on — it fails loudly in an engine where it is not); clip off at Mix 0.5
  comes out once at +288 at 0.01. Export and preview.
- `482 8.1 Telephone and Distortion - Mix blends a dry copy that waits for the oversampled curve, so a click is not heard
  early` — Distortion at Drive 0 (Soft is then a straight line, so the wet IS the oversampler), Mix 0.5: once at +192, at
  0.01; the same with Drive keyframed and held at 0 (the bank). Telephone's band rings, so at Mix 0 (dry only) at Grit 0
  the click must leave first at +128 at 0.01. **Why it fails on 8004fa16:** both dry copies leave at +0 (Distortion 0.005
  at +0 and 0.00496 at +192; Telephone first at +0). CONTROLS: Distortion Mix 1 peaks at +192; a wide-open Telephone
  (Low cut 100, High cut 8000, Grit 0) peaks 128–131 frames on (its band's response peaks a frame after it starts —
  worked out by hand from the biquads: +129).

## Step C — PREPARED, NOT APPLIED (waits for prove.sh stage B: the mock must reproduce -0.45 dB and 1.281e-3 first)

If stage B shows the faithful mock giving Chrome's two numbers on 8004fa16, and stage C shows the windows below green on
the mock, change the two original tests like this (titles unchanged, so no DROPS):

**`482 7.1 Compressor - Auto makeup Off …`** — window A from 0.1–0.25 s to 0.3–0.4 s, both lines, and say why under the
existing "Keyframed:" comment:

```js
    // Keyframed: Threshold -10 -> -45 dB over the first second (knee 6, 4:1). The lift moves from 3.4 to 18.9 dB; Off holds 0 throughout.
    // Window A is 0.3-0.4 s, not 0.1-0.25: the engine's node starts every render ducked (Chromium's kernel starts with its
    // detector at 0 and its gain at 1, attacks towards the 0 that reads as, and releases over Release, 0.25 s here), so until
    // about 0.25 s ANY Compressor sits under its own makeup whatever follows it (measured in the suite's Chrome: 1.9 / 0.6 /
    // 0.1 dB under at 0.10 / 0.15 / 0.20 s, every knee and ratio). That is a start-up transient every Compressor has always
    // had, not the cancelling gain, which is what this window measures. Over 0.3-0.4 s the threshold runs -20.5 -> -24 dB.
    const offA = await win({ threshold: kfT, knee: 6, ratio: 4, automakeup: 0 }, 0.3, 0.4), offB = await win({ threshold: kfT, knee: 6, ratio: 4, automakeup: 0 }, 1.4, 1.9);
    const onA = await win({ threshold: kfT, knee: 6, ratio: 4 }, 0.3, 0.4), onB = await win({ threshold: kfT, knee: 6, ratio: 4 }, 1.4, 1.9);
```

The CONTROL `onB - onA > 8` still holds with margin: the lift over 0.3–0.4 s is about 8.1–9.7 dB (comp.json k6r4 at
-20 / -25 dB: 7.85 / 10.10), against 19.1 at -45 — a move of about 10 dB.

**`482 8.1 Limiter - Mix blends a dry copy held back by the look-ahead …`** — the click at 0.3 s instead of sample 0, a
0.35 s render, every frame counted from the click; in the comment above it add: *"The click is at 0.3 s, not at sample 0:
the engine's node starts every render ducked, and a click at sample 0 came out of Chrome's at 1.281e-3 (a gain of 0.128)
at frame 288, while one at 0.1 s already came through at its full level."* The body:

```js
    // At 0.3 s, past the node's start-up duck (see above); every frame below is counted from the click.
    const i0 = Math.round(0.3 * B3.SR), click = (t, i) => (i === i0 ? 0.01 : 0), bad = [];
    for (const live of [false, true]) {
      const path = live ? 'preview' : 'export';
      const a = await b3Render(b7Fx('limiter', {}), click, 0.35, { live: live }), h = await b3Render(b7Fx('limiter', { mix: 0.5 }), click, 0.35, { live: live });
      if (Math.abs(a[i0 + 288] - 0.01) > 0.0002 || b8First(a, 0, 1e-6) !== i0 + 288) throw new Error('CONTROL: at Mix 1 a -40 dBFS click leaves the Limiter first at frame ' + (b8First(a, 0, 1e-6) - i0) + ' and is ' + a[i0 + 288].toExponential(3) + ' at 288 (' + path + ')');
      if (b8First(h, 0, 1e-6) !== i0 + 288) bad.push('at Mix 0.5 the click first comes out at frame ' + (b8First(h, 0, 1e-6) - i0) + ', not 288 (' + path + ') - the dry copy is not held back');
      if (Math.abs(h[i0 + 288] - 0.01) > 0.0002) bad.push('at Mix 0.5 the click is ' + h[i0 + 288].toExponential(3) + ' at frame 288, not 0.01 (' + path + ')');
    }
```

Both are exactly what `scratchpad/agents/aud-red/stepc.js` applies to a COPY of the suite for stage C (it refuses unless
each old string is found exactly once). They are still test-window changes, i.e. they make a red go away by measuring
elsewhere: they are right only if the duck is the whole story, which is what stages A–C exist to show — and the browser
re-run of both (and of the two new tests) is still owed.

## The faithful mock and the proof (scratchpad/agents/aud-red; not the repo; NOTHING HERE HAS RUN)

- `wa.js` — fx-b9's wa.js plus a float32 port of Chromium's DynamicsCompressor + Kernel (k-rate params per quantum, knee
  search, makeup (1/curve(1))^0.6, pre-delay floor(0.006 × rate) capped at 1023, detector, attack / adaptive release in
  32-frame divisions, the start-up state) and Chromium's UpSampler / DownSampler around a '2x' / '4x' WaveShaper; whole
  render quanta; `__WA_PLAIN` (now `WA_PLAIN=1` through `h.js`) for fx-b9's behaviour.
- `selfcheck.js` (the mock against every number in comp.json / comp2.json), `h.js` (fx-b9's h9.js: the suite's own test
  bodies in node on wa.js; app root and tests file separate, so NEW tests run on OLD code).
- **`prove.sh`** — `wsl -d Ubuntu -u ezra -e bash <scratchpad>/agents/aud-red/prove.sh`, only when no ship is going (it
  stops if `/home/ezra/FreeMotion/.ship-in-progress` appears, checked before every stage). Writes `prove-result.txt` and
  `out/`. Stages: **0** `node --check` of tests/tests.js and every js changed since 8004fa16 (stops if anything fails to
  parse); **A** selfcheck, judged against limits; **B** the two original reds on 8004fa16 (extracted with `git archive`):
  do they fail with Chrome's -0.45 dB and 1.281e-3? **D** the two new tests: red on 8004fa16 for a non-CONTROL reason,
  green on the fix; **C** step C's windows (stepc.js, a copy) on both trees; **E** every `482 3.` / `482 7.` / `482 8.` test
  on both trees, plus the base on the plain mock — lists NEW reds (must be none), the known two, and tests that pass plain
  but fail faithful (REVEALED: candidate Chrome-only reds nobody has seen); **F** a render sweep (`sweep.js`: every effect ×
  fx-b8's variants + aimed Mix / Clip ones, export and preview, hashed) on both trees — only Telephone / Distortion at Mix
  under 1 and the Limiter with the clip on at Mix under 1 may change a sample; **G** fx-b8's 1360-run structural sweep on
  both trees; **H** fp.js subset (1856346714373782, match true); **I** treecheck.py 8004fa16 HEAD and drops.py.

## Next

1. Run `prove.sh` when the builder is not shipping; read `prove-result.txt`'s SUMMARY, then A before anything else.
2. If B reproduces Chrome and C is green: apply step C to the two tests (the text above), as its own commit.
3. Browser: all four tests (`?only=482%208.1%20Limiter`, `?only=482%208.1%20Telephone`, `?only=482%207.1%20Compressor`)
   at 900 and 380 — the fix and the new tests have never met Chrome.
4. If E lists anything REVEALED, each one is a candidate Chrome-only red: read it before landing.
