# The two audio reds on the landing tree (#482 7.1 / 8.1, refers to #966)

Status (13 Oct, aud-red helper): **STOPPED FOR A SHIP** before any node run. Nothing in js/ or tests/ has changed. This
file is where the work stands; the next slot resumes from "Next" below.

## The two reds (Chrome, HeadlessChrome 154; both also red on hunt/fx-b7 69f57acc and hunt/fx-b8 d50f8732)

1. `482 7.1 Compressor - Auto makeup Off keeps a quiet sound at its own level …` —
   *"with Threshold keyframed -10 -> -45 dB and Auto makeup Off a quiet sine sits at -0.45 dB, then 0.00"*.
2. `482 8.1 Limiter - Mix blends a dry copy held back by the look-ahead …` —
   *"CONTROL: at Mix 1 a -40 dBFS click leaves the Limiter first at frame 288 and is 1.281e-3 at 288 (export)"*.

## What was found so far (reading, not yet run)

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
  - 7.1: window A is 0.1–0.25 s (release 0.25 s), i.e. the tail of the duck; window B (1.4–1.9 s) reads 0.00, so the
    cancelling gain itself follows the threshold. comp2.json's k6r4 row is under the static makeup by ~1.9 / 0.6 / 0.1 dB
    at 0.10 / 0.15 / 0.20 s — an average of about the -0.45 dB measured.
  - comp2.json also shows Chrome's makeup follows an AUTOMATED threshold at once (k-rate, per render quantum, no
    smoothing): from 0.25 s on every row is within ~0.1 dB of the static makeup at that moment's threshold.
  - If this holds, both tests measure inside an engine start-up transient that every Compressor / Limiter has always
    had (not batch 7/8 code): the fix is the tests' windows (click later than the duck, window A after ~0.3 s), with the
    reason written in them — to be decided once the faithful mock reproduces Chrome's two numbers.
- **A real Chrome-only bug the tests do not reach (to verify): Clip at ceiling + Mix < 1 on the Limiter combs.** Chrome's
  WaveShaper oversampler is a linear-phase FIR: 2x = 128 frames late, 4x = 192 (comp2.json ir2x / ir4x, constant across
  positions). The Limiter's clip is `'4x'` and its Mix dry copy waits only the 288-frame look-ahead, so with the clip on
  the dry copy is 192 frames (4 ms) early: a click comes out twice and a blend notches every 250 Hz. The code comment at
  mixOutput says "a few frames" — it is 4 ms. Same question for every other oversampled shaper that sits beside a dry
  copy (Telephone's 2x bite under the added Mix, Distortion's own Mix with its 4x shaper and its keyframed curve bank).

## The faithful mock (scratchpad, not the repo; NOT YET RUN)

`scratchpad/agents/aud-red/wa.js` — fx-b9's wa.js plus:
- DynamicsCompressorNode: a float32 port of Chromium's DynamicsCompressor + DynamicsCompressorKernel (k-rate params per
  quantum, knee search, makeup (1/curve(1))^0.6, 6 ms pre-delay capped at 1023 frames, detector, attack / adaptive
  release in 32-frame divisions, the start-up state). Stereo out.
- WaveShaper '2x' / '4x': Chromium's UpSampler (128-tap Blackman sinc) and DownSampler (256-tap half band) around the curve.
- Whole render quanta (Chrome's), `__WA_PLAIN` to get fx-b9's behaviour back.
`selfcheck.js` prints the mock against comp.json / comp2.json (static makeup rows, the automated-threshold rows, the
click through a compressor and through tanh shapers, the full 2x / 4x identity impulse responses, latency by position).
`h.js` is fx-b9's h9.js (runs the suite's own test bodies in node on wa.js).

## Next (the following slot)

1. `run.sh selfcheck.js` — every static row within 0.01 dB, the ramp rows within ~0.1 dB after 0.2 s, IR taps ~1e-6.
2. Red-first: both tests on 97eace27 through `h.js` must fail with Chrome's messages (-0.45 dB / 1.281e-3).
3. Decide per red: test window vs code (above), and fix the clip + Mix comb in code (the Limiter's dry lag must add the
   oversampler's 192 frames while the clip is on; live and export alike, defaults byte-identical).
4. Re-run every `482 3.` / `482 7.` / `482 8.` test and fx-b8's mock sweep on the faithful mock; report new reds.
5. Busters (audio-fx 18 -> 19, audio-fx-live 15 -> 16 if touched), fp.js subset (1856346714373782), treecheck, drops.
6. Both tests still need a browser re-run in the next slot.
